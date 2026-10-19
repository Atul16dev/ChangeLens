/**
 * ChangeLens API Client
 * Connects to the Express static analysis backend.
 */

const API_BASE = '/api/v1';

/**
 * Resilient fetch wrapper with automatic retry on momentary connection drops.
 */
async function fetchWithRetry(url, options = {}, retries = 2, delay = 400) {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

export async function checkBackendHealth() {
  const res = await fetchWithRetry(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function runImpactAnalysis({ repoPath, changedFiles, baseRef, maxDepth = 10 } = {}) {
  const payload = {};
  if (repoPath) payload.repoPath = repoPath;
  if (changedFiles && changedFiles.length > 0) payload.changedFiles = changedFiles;
  if (baseRef) payload.baseRef = baseRef;
  if (maxDepth) payload.maxDepth = maxDepth;

  const res = await fetchWithRetry(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Analysis request failed with status ${res.status}`);
  }
  return data.data;
}

export async function getAnalysisGraph(analysisId) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}/graph`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch graph data`);
  }
  return data.data;
}

export async function getAnalysisImpact(analysisId) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}/impact`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch impact data`);
  }
  return data.data;
}

export async function listRecentAnalyses() {
  const res = await fetchWithRetry(`${API_BASE}/analyses`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch recent analyses`);
  }
  return data.data;
}

export async function getAnalysisExplanation(analysisId) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}/explain`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch AI explanation`);
  }
  return data.data;
}

export async function sendAnalysisChatMessage(analysisId, { message, history = [], selectedNodeId = null } = {}) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history, selectedNodeId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Chat request failed with status ${res.status}`);
  }
  return data.data;
}

export async function simulateImpact(analysisId, { simulatedFile, changeType = 'modified' } = {}) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ simulatedFile, changeType }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Simulation failed with status ${res.status}`);
  }
  return data.data;
}

