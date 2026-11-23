import EventEmitter from "node:events";
import crypto from "node:crypto";
import { isMongoConnected } from "../db/mongodb.js";
import { Job } from "../models/Job.js";

/**
 * Resilient Hybrid Analysis Queue
 * 
 * Decouples heavy AST and dependency graph analysis from the Express event loop.
 * - Works 100% in-memory with zero external dependencies (no Redis required).
 * - Pluggable Redis / Worker concurrency management.
 * - Multi-stage progress tracking with Server-Sent Events (SSE) & WebSocket support.
 * - Transparent retry on transient errors.
 * - MongoDB persistence when database is available.
 */
export class AnalysisQueue extends EventEmitter {
  constructor({ maxConcurrency = 2, runner = null } = {}) {
    super();
    this.maxConcurrency = maxConcurrency;
    this.runner = runner;
    this.jobs = new Map();
    this.queue = [];
    this.activeCount = 0;
    this.maxJobHistory = 500;
  }

  setRunner(runner) {
    this.runner = runner;
  }

  setMaxConcurrency(limit) {
    this.maxConcurrency = Math.max(1, parseInt(limit, 10) || 2);
  }

  getMetrics() {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === "QUEUED") queued++;
      else if (job.status === "PROCESSING") processing++;
      else if (job.status === "COMPLETED") completed++;
      else if (job.status === "FAILED") failed++;
    }

    return {
      activeWorkers: this.activeCount,
      queuedJobs: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      metrics: {
        queued,
        processing,
        completed,
        failed,
        total: this.jobs.size,
      },
    };
  }

  /**
   * Enqueues an analysis job for background execution.
   */
  enqueueJob(params = {}, userId = null) {
    const jobId = `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    const job = {
      jobId,
      analysisId: null,
      user: userId,
      status: "QUEUED",
      progress: 0,
      stage: "Enqueued in worker pool",
      params: {
        repoPath: params.repoPath || null,
        changedFiles: params.changedFiles || [],
        baseRef: params.baseRef || null,
        maxDepth: params.maxDepth || 10,
      },
      result: null,
      error: null,
      attempts: 0,
      maxAttempts: 2,
      queuedAt: nowIso,
      startedAt: null,
      completedAt: null,
    };

    // Store in-memory LRU
    if (this.jobs.size >= this.maxJobHistory) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }
    this.jobs.set(jobId, job);
    this.queue.push(jobId);

    // Save to Mongo if available (non-blocking)
    if (isMongoConnected()) {
      Job.create({
        jobId,
        user: userId,
        status: "QUEUED",
        progress: 0,
        stage: job.stage,
        params: job.params,
        queuedAt: new Date(),
      }).catch((err) => {
        console.warn(`[AnalysisQueue] Failed to persist queued job ${jobId} to MongoDB:`, err.message);
      });
    }

    this.emit("queued", { jobId, status: "QUEUED" });

    // Schedule worker check on next tick so HTTP response can return immediately
    setImmediate(() => {
      this._processNext();
    });

    return job;
  }

  /**
   * Updates job progress and emits a progress event.
   */
  updateJobProgress(jobId, { progress, stage }) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (typeof progress === "number") {
      job.progress = Math.min(100, Math.max(0, Math.round(progress)));
    }
    if (typeof stage === "string") {
      job.stage = stage;
    }

    this.emit("progress", {
      jobId,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
    });

    if (isMongoConnected()) {
      Job.updateOne(
        { jobId },
        {
          $set: {
            progress: job.progress,
            stage: job.stage,
          },
        }
      ).catch(() => {});
    }
  }

  /**
   * Internal scheduler: dispatches queued jobs up to maxConcurrency.
   */
  _processNext() {
    if (this.activeCount >= this.maxConcurrency) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    const nextJobId = this.queue.shift();
    const job = this.jobs.get(nextJobId);

    if (!job || job.status !== "QUEUED") {
      return this._processNext();
    }

    this.activeCount++;
    job.status = "PROCESSING";
    job.startedAt = new Date().toISOString();
    job.stage = "Worker acquired, initiating AST scanner...";
    job.progress = 5;

    this.emit("started", {
      jobId: job.jobId,
      status: "PROCESSING",
      stage: job.stage,
      progress: job.progress,
    });

    if (isMongoConnected()) {
      Job.updateOne(
        { jobId: job.jobId },
        {
          $set: {
            status: "PROCESSING",
            startedAt: new Date(),
            stage: job.stage,
            progress: job.progress,
          },
        }
      ).catch(() => {});
    }

    this._executeJob(job);
  }

  /**
   * Executes a job using the registered analysis runner.
   */
  async _executeJob(job) {
    let succeeded = false;

    while (job.attempts < job.maxAttempts && !succeeded) {
      job.attempts++;

      try {
        if (!this.runner) {
          throw new Error("No analysis runner registered on AnalysisQueue.");
        }

        const progressCallback = (update) => {
          this.updateJobProgress(job.jobId, update);
        };

        const analysisRecord = await this.runner(
          {
            ...job.params,
            onProgress: progressCallback,
          },
          job.user,
          progressCallback
        );

        // Successfully finished
        job.status = "COMPLETED";
        job.analysisId = analysisRecord.analysisId;
        job.progress = 100;
        job.stage = "Analysis complete";
        job.completedAt = new Date().toISOString();
        job.result = {
          analysisId: analysisRecord.analysisId,
          targetDir: analysisRecord.targetDir,
          status: "completed",
          summary: analysisRecord.summary,
          coverage: analysisRecord.coverage,
          testImpact: analysisRecord.testImpact,
          riskScore: analysisRecord.riskScore,
          detailedRisk: analysisRecord.detailedRisk,
        };

        succeeded = true;

        this.emit("completed", {
          jobId: job.jobId,
          analysisId: job.analysisId,
          status: "COMPLETED",
          result: job.result,
        });

        if (isMongoConnected()) {
          Job.updateOne(
            { jobId: job.jobId },
            {
              $set: {
                status: "COMPLETED",
                analysisId: job.analysisId,
                progress: 100,
                stage: job.stage,
                result: job.result,
                completedAt: new Date(),
              },
            }
          ).catch(() => {});
        }
      } catch (error) {
        const isPermanent =
          error.message?.includes("does not exist") ||
          error.code === "ENOENT" ||
          job.attempts >= job.maxAttempts;

        if (!isPermanent) {
          console.warn(`[AnalysisQueue] Job ${job.jobId} failed on attempt ${job.attempts}. Retrying in 100ms...`);
          job.stage = `Transient failure, retrying (attempt ${job.attempts + 1}/${job.maxAttempts})...`;
          this.emit("retrying", { jobId: job.jobId, stage: job.stage, error: error.message });
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else {
          job.status = "FAILED";
          job.completedAt = new Date().toISOString();
          job.error = {
            message: error.message || "Analysis failed unexpectedly.",
            code: error.code || "ANALYSIS_FAILED",
          };
          job.stage = `Analysis failed: ${error.message}`;

          this.emit("failed", {
            jobId: job.jobId,
            status: "FAILED",
            error: job.error,
          });

          if (isMongoConnected()) {
            Job.updateOne(
              { jobId: job.jobId },
              {
                $set: {
                  status: "FAILED",
                  error: job.error,
                  stage: job.stage,
                  completedAt: new Date(),
                },
              }
            ).catch(() => {});
          }
          break;
        }
      }
    }

    this.activeCount = Math.max(0, this.activeCount - 1);
    // Run next job in queue if any
    this._processNext();
  }

  /**
   * Retrieves a job by ID from memory, or fallback to MongoDB.
   */
  async getJob(jobId) {
    if (!jobId) return null;
    const memoryJob = this.jobs.get(jobId);
    if (memoryJob) return memoryJob;

    if (isMongoConnected()) {
      try {
        const mongoJob = await Job.findOne({ jobId }).lean();
        if (mongoJob) {
          // Hydrate memory cache
          this.jobs.set(jobId, mongoJob);
          return mongoJob;
        }
      } catch (err) {
        console.warn(`[AnalysisQueue] Error reading job ${jobId} from MongoDB:`, err.message);
      }
    }

    return null;
  }

  /**
   * Lists jobs with optional filtering.
   */
  async listJobs({ limit = 50, status = null, userId = null } = {}) {
    const results = [];
    for (const job of this.jobs.values()) {
      if (status && job.status !== status) continue;
      if (userId && String(job.user) !== String(userId)) continue;
      results.push(job);
    }

    results.sort((a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime());
    return results.slice(0, limit);
  }

  /**
   * Resets queue state (chiefly for tests).
   */
  clear() {
    this.jobs.clear();
    this.queue = [];
    this.activeCount = 0;
  }
}

// Global Singleton Instance
export const analysisQueue = new AnalysisQueue();
