import { analysisQueue } from "../queue/analysis-queue.js";

/**
 * Controller for Asynchronous Job Processing & Queue Management
 */

/**
 * GET /api/v1/jobs/:jobId
 * Retrieves current job status, progress percentage, and results.
 */
export async function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await analysisQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: "JOB_NOT_FOUND",
          message: `Analysis job with ID "${jobId}" was not found.`,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        jobId: job.jobId,
        analysisId: job.analysisId,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        queuedAt: job.queuedAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.error,
        pollUrl: `/api/v1/jobs/${job.jobId}`,
        eventsUrl: `/api/v1/jobs/${job.jobId}/events`,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/jobs/:jobId/events
 * Real-time Server-Sent Events (SSE) stream for live job progress.
 */
export async function streamJobEvents(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await analysisQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          code: "JOB_NOT_FOUND",
          message: `Analysis job with ID "${jobId}" was not found.`,
        },
      });
    }

    // Set headers for Server-Sent Events
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    // Send initial snapshot
    res.write(`event: job_state\ndata: ${JSON.stringify(job)}\n\n`);

    // If job has already completed or failed, close the connection immediately
    if (job.status === "COMPLETED") {
      res.write(`event: completed\ndata: ${JSON.stringify(job)}\n\n`);
      return res.end();
    }
    if (job.status === "FAILED") {
      res.write(`event: failed\ndata: ${JSON.stringify(job)}\n\n`);
      return res.end();
    }

    // Event listeners
    const onProgress = (payload) => {
      if (payload.jobId === jobId) {
        res.write(`event: progress\ndata: ${JSON.stringify(payload)}\n\n`);
      }
    };

    const onCompleted = (payload) => {
      if (payload.jobId === jobId) {
        res.write(`event: completed\ndata: ${JSON.stringify(payload)}\n\n`);
        cleanup();
        res.end();
      }
    };

    const onFailed = (payload) => {
      if (payload.jobId === jobId) {
        res.write(`event: failed\ndata: ${JSON.stringify(payload)}\n\n`);
        cleanup();
        res.end();
      }
    };

    const cleanup = () => {
      analysisQueue.off("progress", onProgress);
      analysisQueue.off("completed", onCompleted);
      analysisQueue.off("failed", onFailed);
    };

    analysisQueue.on("progress", onProgress);
    analysisQueue.on("completed", onCompleted);
    analysisQueue.on("failed", onFailed);

    req.on("close", cleanup);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/jobs/analyze
 * Enqueues an analysis job and returns 202 Accepted.
 */
export async function createAnalysisJob(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const job = analysisQueue.enqueueJob(req.body || {}, userId);

    res.status(202).json({
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        stage: job.stage,
        pollUrl: `/api/v1/jobs/${job.jobId}`,
        eventsUrl: `/api/v1/jobs/${job.jobId}/events`,
        message: "Analysis job queued successfully",
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/jobs
 * Lists recent jobs and queue metrics.
 */
export async function listJobs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const status = req.query.status || null;
    const userId = req.user?.id || null;

    const jobs = await analysisQueue.listJobs({ limit, status, userId });
    const metrics = analysisQueue.getMetrics();

    res.status(200).json({
      success: true,
      data: {
        metrics,
        jobs,
      },
    });
  } catch (error) {
    next(error);
  }
}
