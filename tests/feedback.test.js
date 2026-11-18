import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../api/app.js";
import { feedbackRepository } from "../api/db/feedback-repository.js";

test("ChangeLens Feedback & 5-Star Rating API Suite", async (t) => {
  feedbackRepository.clearMemoryStore();

  const app = createApp();
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(async () => {
    feedbackRepository.clearMemoryStore();
    await new Promise((resolve) => server.close(resolve));
  });

  await t.test("POST /api/v1/feedback accepts a bug report with context", async () => {
    const res = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bug_report",
        title: "3D zoom sensitivity",
        message: "Zooming out on trackpad feels slightly too fast in 3D view.",
        rating: 4,
        context: {
          pageUrl: "/app?analysisId=abc123",
          viewMode: "3D",
          deviceType: "desktop",
        },
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.feedback.type, "bug_report");
    assert.equal(body.data.feedback.rating, 4);
    assert.equal(body.data.feedback.context.viewMode, "3D");
    assert.equal(body.data.updated, false);
  });

  await t.test("POST /api/v1/feedback accepts feature request and general feedback", async () => {
    const featureRes = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "feature_request",
        title: "GitLab support",
        message: "Would love GitLab MR blast radius analysis in the future.",
      }),
    });
    assert.equal(featureRes.status, 201);
    const featureBody = await featureRes.json();
    assert.equal(featureBody.data.feedback.type, "feature_request");
    assert.equal(featureBody.data.feedback.rating, null);

    const generalRes = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "general_feedback",
        message: "Super clean UI and fast AST parsing!",
        rating: 5,
      }),
    });
    assert.equal(generalRes.status, 201);
    const generalBody = await generalRes.json();
    assert.equal(generalBody.data.feedback.rating, 5);
  });

  await t.test("POST /api/v1/feedback accepts 5-star app rating and analysis rating", async () => {
    const appRatingRes = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "app_rating",
        rating: 5,
        message: "Best blast radius tool I have tried.",
      }),
    });
    assert.equal(appRatingRes.status, 201);

    const analysisRatingRes = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "analysis_rating",
        analysisId: "analysis_test_999",
        rating: 4,
        message: "Accurate direct & transitive findings.",
      }),
    });
    assert.equal(analysisRatingRes.status, 201);
    const analysisBody = await analysisRatingRes.json();
    assert.equal(analysisBody.data.feedback.analysisId, "analysis_test_999");
  });

  await t.test("POST /api/v1/feedback validates invalid inputs cleanly", async () => {
    // Invalid type
    const badType = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "unknown_type", message: "hello" }),
    });
    assert.equal(badType.status, 400);
    assert.equal((await badType.json()).error.code, "INVALID_FEEDBACK_TYPE");

    // Rating out of bounds
    const badRating = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "app_rating", rating: 6 }),
    });
    assert.equal(badRating.status, 400);
    assert.equal((await badRating.json()).error.code, "INVALID_RATING");

    // Missing rating on app_rating
    const missingRating = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "app_rating" }),
    });
    assert.equal(missingRating.status, 400);
    assert.equal((await missingRating.json()).error.code, "RATING_REQUIRED");

    // Empty message on bug_report
    const missingMsg = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bug_report", message: "  " }),
    });
    assert.equal(missingMsg.status, 400);
    assert.equal((await missingMsg.json()).error.code, "MESSAGE_REQUIRED");

    // Missing analysisId on analysis_rating
    const missingAnalysis = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "analysis_rating", rating: 5 }),
    });
    assert.equal(missingAnalysis.status, 400);
    assert.equal((await missingAnalysis.json()).error.code, "ANALYSIS_ID_REQUIRED");
  });

  await t.test("GET /api/v1/feedback/stats and analysis summary return accurate aggregates", async () => {
    const statsRes = await fetch(`${baseUrl}/api/v1/feedback/stats`);
    assert.equal(statsRes.status, 200);
    const statsBody = await statsRes.json();
    assert.equal(statsBody.success, true);
    assert.equal(statsBody.data.totalFeedback, 5);
    assert.equal(statsBody.data.totalRatings, 4); // ratings: 4, 5, 5, 4 -> avg 4.5
    assert.equal(statsBody.data.averageRating, 4.5);
    assert.equal(statsBody.data.starDistribution[4], 2);
    assert.equal(statsBody.data.starDistribution[5], 2);
    assert.equal(statsBody.data.byType.bug_report, 1);
    assert.equal(statsBody.data.byType.analysis_rating, 1);

    const analysisRes = await fetch(
      `${baseUrl}/api/v1/feedback/analysis/analysis_test_999`
    );
    assert.equal(analysisRes.status, 200);
    const analysisBody = await analysisRes.json();
    assert.equal(analysisBody.data.totalRatings, 1);
    assert.equal(analysisBody.data.averageRating, 4);
  });

  await t.test("GET /api/v1/feedback/mine requires authentication", async () => {
    const res = await fetch(`${baseUrl}/api/v1/feedback/mine`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "UNAUTHORIZED");
  });

  await t.test("POST /api/v1/feedback accepts screenshot & short video attachments and validates limits", async () => {
    const tinyPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const tinyMp4 = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28y";

    const okRes = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bug_report",
        title: "Graph overlap with video",
        message: "Attached a screenshot and short video clip reproducing the bug.",
        rating: 3,
        attachments: [
          { fileName: "bug.png", dataUrl: tinyPng },
          { fileName: "repro.mp4", dataUrl: tinyMp4 },
        ],
      }),
    });

    assert.equal(okRes.status, 201);
    const okBody = await okRes.json();
    assert.equal(okBody.data.feedback.attachments.length, 2);
    assert.equal(okBody.data.feedback.attachments[0].mediaType, "image");
    assert.equal(okBody.data.feedback.attachments[1].mediaType, "video");

    // Reject unsupported file type
    const badMime = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bug_report",
        message: "Trying an unsupported file type.",
        attachments: [{ fileName: "script.exe", dataUrl: "data:application/octet-stream;base64,AAAA" }],
      }),
    });
    assert.equal(badMime.status, 400);
    assert.equal((await badMime.json()).error.code, "UNSUPPORTED_MEDIA_TYPE");

    // Reject > 3 attachments
    const tooMany = await fetch(`${baseUrl}/api/v1/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "bug_report",
        message: "Too many attachments test.",
        attachments: [
          { fileName: "1.png", dataUrl: tinyPng },
          { fileName: "2.png", dataUrl: tinyPng },
          { fileName: "3.png", dataUrl: tinyPng },
          { fileName: "4.png", dataUrl: tinyPng },
        ],
      }),
    });
    assert.equal(tooMany.status, 400);
    assert.equal((await tooMany.json()).error.code, "TOO_MANY_ATTACHMENTS");
  });

  await t.test("GET /api/v1/feedback/public returns privacy-safe community feed & Flipkart-style stats", async () => {
    const res = await fetch(`${baseUrl}/api/v1/feedback/public`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.feedback.length, 6);
    assert.equal(body.data.stats.totalRatings, 5);
    assert.equal(body.data.stats.totalReviews, 6);
    assert.ok(body.data.stats.starPercentages);
    // Ensure private fields are stripped
    assert.equal(body.data.feedback[0].userEmail, undefined);
    assert.equal(body.data.feedback[0].userId, undefined);
    assert.ok(body.data.feedback[0].authorName);
    assert.equal(body.data.feedback[0].attachments.length, 2);

    // Filter by type & star rating
    const bugOnly = await fetch(`${baseUrl}/api/v1/feedback/public?type=bug_report&rating=3`);
    assert.equal(bugOnly.status, 200);
    const bugBody = await bugOnly.json();
    assert.equal(bugBody.data.feedback.length, 1);
    assert.equal(bugBody.data.feedback[0].rating, 3);
  });
});
