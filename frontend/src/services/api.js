/**
 * ChangeLens API Client
 * Connects to the Express static analysis backend.
 */

const API_BASE = '/api/v1';

export async function checkBackendHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function runImpactAnalysis({ repoPath, changedFiles, baseRef, maxDepth = 10 } = {}) {
  const payload = {};
  if (repoPath) payload.repoPath = repoPath;
  if (changedFiles && changedFiles.length > 0) payload.changedFiles = changedFiles;
  if (baseRef) payload.baseRef = baseRef;
  if (maxDepth) payload.maxDepth = maxDepth;

  const res = await fetch(`${API_BASE}/analyze`, {
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
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/graph`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch graph data`);
  }
  return data.data;
}

export async function getAnalysisImpact(analysisId) {
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/impact`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch impact data`);
  }
  return data.data;
}

export async function listRecentAnalyses() {
  const res = await fetch(`${API_BASE}/analyses`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch recent analyses`);
  }
  return data.data;
}

export async function getAnalysisExplanation(analysisId, { apiKey, model, provider } = {}) {
  const params = new URLSearchParams();
  if (apiKey) params.append('apiKey', apiKey);
  if (model) params.append('model', model);
  if (provider) params.append('provider', provider);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/analyses/${analysisId}/explain${query}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to fetch AI explanation`);
  }
  return data.data;
}
