/**
 * ChangeLens - Gemini LLM Service Client
 * 
 * Secure backend service for Google Gemini API integration.
 * Designed as a standalone, reusable client for future LLM features (e.g. ChangeLens Chatbot)
 * without requiring client-side API key handling or frontend exposure.
 */

const DEFAULT_MODEL = "gemini-1.5-flash";

/**
 * Checks whether a Gemini API key is configured on the backend environment.
 * @returns {boolean}
 */
export function isGeminiAvailable() {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

/**
 * Calls Google Gemini REST API securely from the backend.
 * 
 * @param {object} params
 * @param {string} [params.apiKey] - Optional explicit key, defaults to process.env.GEMINI_API_KEY
 * @param {string} params.prompt - Input prompt or question
 * @param {string} [params.systemInstruction] - Optional system context or role prompt
 * @param {string} [params.model="gemini-1.5-flash"] - Gemini model identifier
 * @param {number} [params.temperature=0.2] - Sampling temperature
 * @param {number} [params.maxOutputTokens=1024] - Token limit
 * @returns {Promise<string>} Generated text response from Gemini
 */
export async function callGeminiAPI({
  apiKey = process.env.GEMINI_API_KEY,
  prompt,
  contents,
  systemInstruction,
  model = DEFAULT_MODEL,
  temperature = 0.2,
  maxOutputTokens = 1024,
}) {
  const sanitizedKey = typeof apiKey === "string" ? apiKey.trim() : "";

  if (!sanitizedKey) {
    throw new Error(
      "Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable on the server."
    );
  }

  let formattedContents;

  if (Array.isArray(contents) && contents.length > 0) {
    formattedContents = contents.map((c) => ({
      role: c.role === "assistant" || c.role === "model" ? "model" : "user",
      parts: Array.isArray(c.parts)
        ? c.parts
        : [{ text: String(c.content || c.text || "").trim() }],
    }));
  } else if (prompt && typeof prompt === "string" && prompt.trim().length > 0) {
    formattedContents = [
      {
        role: "user",
        parts: [{ text: prompt.trim() }],
      },
    ];
  } else {
    throw new TypeError("Either a non-empty 'prompt' string or 'contents' array is required.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${sanitizedKey}`;

  const payload = {
    contents: formattedContents,
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  if (systemInstruction && typeof systemInstruction === "string") {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction.trim() }],
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    let msg = `Gemini API error [${response.status}]`;
    try {
      const jsonErr = JSON.parse(errText);
      if (jsonErr.error?.message) {
        msg = `${msg}: ${jsonErr.error.message}`;
      }
    } catch {
      msg = `${msg}: ${errText}`;
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("No response text returned from Gemini API.");
  }

  return textOutput;
}
