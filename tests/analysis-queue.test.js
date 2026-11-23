import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { AnalysisQueue } from "../api/queue/analysis-queue.js";

test("Asynchronous Analysis Queue & Job Processing Suite (Phase 2)", async (suite) => {
  const app = createApp();
  let server;
  let baseUrl;

  // Ephemeral test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  suite.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  await suite.test("AnalysisQueue: enqueues and transitions jobs from QUEUED -> PROCESSING -> COMPLETED", async () => {
    const queue = new AnalysisQueue({ maxConcurrency: 2 });
    const progressLog = [];

    queue.setRunner(async (params, userId, onProgress) => {
      onProgress({ progress: 50, stage: "Testing progress stage..." });
      return {
        analysisId: "test_analysis_123",
        targetDir: "/test/repo",
        summary: { impactedFilesCount: 2 },
        coverage: { supported: 10 },
        testImpact: { affectedTestsCount: 1 },
        riskScore: 25,
        detailedRisk: { tier: "LOW" },
      };
    });

    queue.on("progress", (p) => progressLog.push(p));

    const job = queue.enqueueJob({ repoPath: "/test/repo" });
    assert.equal(job.status, "QUEUED");
    assert.ok(job.jobId.startsWith("job_"));

    // Wait for worker execution
    await new Promise((resolve) => {
      queue.once("completed", (res) => {
        resolve(res);
      });
    });

    const finishedJob = await queue.getJob(job.jobId);
    assert.equal(finishedJob.status, "COMPLETED");
    assert.equal(finishedJob.progress, 100);
    assert.equal(finishedJob.analysisId, "test_analysis_123");
    assert.ok(progressLog.some((p) => p.progress === 50));
    assert.ok(finishedJob.result);
  });

  await suite.test("AnalysisQueue: strictly limits concurrent jobs and queues excess tasks", async () => {
    const queue = new AnalysisQueue({ maxConcurrency: 1 });
    let activeRunning = 0;
    let peakConcurrency = 0;

    queue.setRunner(async (params, userId, onProgress) => {
      activeRunning++;
      peakConcurrency = Math.max(peakConcurrency, activeRunning);
      await new Promise((r) => setTimeout(r, 60));
      activeRunning--;
      return {
        analysisId: `analysis_${Date.now()}`,
        summary: {},
      };
    });

    const job1 = queue.enqueueJob({ id: 1 });
    const job2 = queue.enqueueJob({ id: 2 });

    const metrics = queue.getMetrics();
    assert.equal(metrics.maxConcurrency, 1);

    // Wait for both jobs to finish
    await new Promise((resolve) => {
      let count = 0;
      queue.on("completed", () => {
        count++;
        if (count === 2) resolve();
      });
    });

    assert.equal(peakConcurrency, 1);
    const j1 = await queue.getJob(job1.jobId);
    const j2 = await queue.getJob(job2.jobId);
    assert.equal(j1.status, "COMPLETED");
    assert.equal(j2.status, "COMPLETED");
  });

  await suite.test("AnalysisQueue: marks permanent error as FAILED with error message", async () => {
    const queue = new AnalysisQueue({ maxConcurrency: 2 });
    queue.setRunner(async () => {
      throw new Error("Target repository directory does not exist: '/invalid/path'");
    });

    const job = queue.enqueueJob({ repoPath: "/invalid/path" });

    await new Promise((resolve) => {
      queue.once("failed", resolve);
    });

    const finishedJob = await queue.getJob(job.jobId);
    assert.equal(finishedJob.status, "FAILED");
    assert.ok(finishedJob.error.message.includes("does not exist"));
  });

  await suite.test("POST /api/v1/analyze?async=true returns 202 Accepted and jobId", async () => {
    const res = await fetch(`${baseUrl}/api/v1/analyze?async=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changedFiles: ["server/models/user.js"],
      }),
    });

    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.jobId);
    assert.equal(body.data.status, "QUEUED");
    assert.ok(body.data.pollUrl);
    assert.ok(body.data.eventsUrl);

    // Poll until completed
    const jobId = body.data.jobId;
    let completed = false;
    let attempts = 0;

    while (!completed && attempts < 30) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
      const pollRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`);
      assert.equal(pollRes.status, 200);
      const pollBody = await pollRes.json();

      if (pollBody.data.status === "COMPLETED") {
        completed = true;
        assert.ok(pollBody.data.analysisId);
        assert.ok(pollBody.data.result);
        assert.equal(pollBody.data.progress, 100);
      }
    }

    assert.ok(completed, "Async job should complete within polling window");
  });

  await suite.test("POST /api/v1/jobs/analyze accepts async job creation directly", async () => {
    const res = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changedFiles: ["server/controllers/user-controller.js"],
      }),
    });

    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.jobId);
  });

  await suite.test("GET /api/v1/jobs lists recent jobs and queue metrics", async () => {
    const res = await fetch(`${baseUrl}/api/v1/jobs`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.metrics);
    assert.ok(Array.isArray(body.data.jobs));
    assert.ok(body.data.jobs.length > 0);
  });

  await suite.test("GET /api/v1/jobs/:jobId returns 404 for unknown job", async () => {
    const res = await fetch(`${baseUrl}/api/v1/jobs/unknown_job_9999`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, "JOB_NOT_FOUND");
  });

  await suite.test("GET /api/v1/jobs/:jobId/events streams SSE progress events", async () => {
    // Create an async job
    const createRes = await fetch(`${baseUrl}/api/v1/jobs/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        changedFiles: ["server/models/user.js"],
      }),
    });
    const createBody = await createRes.json();
    const jobId = createBody.data.jobId;

    // Connect to SSE stream
    const sseRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/events`);
    assert.equal(sseRes.status, 200);
    assert.ok(sseRes.headers.get("content-type")?.includes("text/event-stream"));

    const reader = sseRes.body.getReader();
    const decoder = new TextDecoder();
    let receivedData = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedData += decoder.decode(value, { stream: true });
      if (receivedData.includes("event: completed") || receivedData.includes("event: failed")) {
        break;
      }
    }

    assert.ok(receivedData.includes("data:"));
  });
});
