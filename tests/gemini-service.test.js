import assert from "node:assert/strict";
import test from "node:test";
import { isGeminiAvailable, callGeminiAPI } from "../services/gemini.js";

test("isGeminiAvailable accurately detects environment configuration", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  delete process.env.GEMINI_API_KEY;
  assert.equal(isGeminiAvailable(), false);

  process.env.GEMINI_API_KEY = "   ";
  assert.equal(isGeminiAvailable(), false);

  process.env.GEMINI_API_KEY = "test-gemini-key";
  assert.equal(isGeminiAvailable(), true);

  if (originalKey !== undefined) {
    process.env.GEMINI_API_KEY = originalKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }
});

test("callGeminiAPI validates required parameters and API key presence", async () => {
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  // Should throw when no key exists
  await assert.rejects(
    async () => {
      await callGeminiAPI({ prompt: "Hello" });
    },
    {
      message: /GEMINI_API_KEY environment variable/,
    }
  );

  // Should throw when prompt is empty
  await assert.rejects(
    async () => {
      await callGeminiAPI({ apiKey: "test-key", prompt: "" });
    },
    {
      name: "TypeError",
      message: /non-empty 'prompt' string or 'contents' array/,
    }
  );

  if (originalKey !== undefined) {
    process.env.GEMINI_API_KEY = originalKey;
  }
});

test("callGeminiAPI formats requests and parses responses correctly", async () => {
  const originalFetch = globalThis.fetch;

  let capturedUrl = null;
  let capturedBody = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedBody = JSON.parse(options.body);

    return {
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Mock Gemini response for future ChangeLens Chatbot." }],
            },
          },
        ],
      }),
    };
  };

  try {
    const result = await callGeminiAPI({
      apiKey: "test-api-key",
      prompt: "Explain impact of user model changes",
      systemInstruction: "You are an assistant for ChangeLens.",
      model: "gemini-1.5-flash",
    });

    assert.equal(result, "Mock Gemini response for future ChangeLens Chatbot.");
    assert.ok(capturedUrl.includes("gemini-1.5-flash:generateContent?key=test-api-key"));
    assert.equal(capturedBody.contents[0].parts[0].text, "Explain impact of user model changes");
    assert.equal(capturedBody.systemInstruction.parts[0].text, "You are an assistant for ChangeLens.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
