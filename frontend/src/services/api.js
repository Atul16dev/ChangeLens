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
    const res = await fetch(url, {
      credentials: 'include',
      ...options,
    });
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

export async function getAnalysisHistory({ search = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const res = await fetchWithRetry(`${API_BASE}/analyses/history?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch analysis history');
  }
  return data.data;
}

export async function deleteAnalysis(analysisId) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to delete analysis');
  }
  return data;
}

export async function togglePinAnalysis(analysisId, isPinned = undefined) {
  const res = await fetchWithRetry(`${API_BASE}/analyses/${analysisId}/pin`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(isPinned !== undefined ? { isPinned } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to update pin status');
  }
  return data.data;
}

/**
 * GitHub Connector API methods
 */
export async function inspectGitHubPR({ prUrl, token }) {
  const res = await fetchWithRetry(`${API_BASE}/github/inspect-pr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prUrl, token }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to inspect GitHub Pull Request');
  }
  return data.data;
}

export async function analyzeGitHubPR({ prUrl, token, repoPath, maxDepth = 10 }) {
  const res = await fetchWithRetry(`${API_BASE}/github/analyze-pr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prUrl, token, repoPath, maxDepth }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to analyze GitHub Pull Request');
  }
  return data.data;
}

export async function postCommentToGitHubPR({ owner, repo, pullNumber, token, analysisId, customMarkdown }) {
  const res = await fetchWithRetry(`${API_BASE}/github/post-comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ owner, repo, pullNumber, token, analysisId, customMarkdown }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to post comment to GitHub PR');
  }
  return data.data;
}

export async function getGitHubWorkflowTemplate({ failOnCritical = true, failOnHigh = false, nodeVersion = '22' } = {}) {
  const params = new URLSearchParams();
  if (failOnCritical !== undefined) params.append('failOnCritical', failOnCritical);
  if (failOnHigh !== undefined) params.append('failOnHigh', failOnHigh);
  if (nodeVersion) params.append('nodeVersion', nodeVersion);

  const res = await fetchWithRetry(`${API_BASE}/github/workflow-template?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch GitHub Actions workflow template');
  }
  return data.data;
}

export async function connectGitHubRepository({ repoUrl, token }) {
  const res = await fetchWithRetry(`${API_BASE}/github/connect-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repoUrl, token }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to connect GitHub repository');
  }
  return data.data;
}

export async function syncGitHubRepositoryCommits({
  repoUrl,
  token,
  mode = 'cumulative',
  baseSha,
  headSha,
  commitSha,
  repoPath,
  maxDepth = 10,
}) {
  const res = await fetchWithRetry(`${API_BASE}/github/sync-commits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repoUrl,
      token,
      mode,
      baseSha,
      headSha,
      commitSha,
      repoPath,
      maxDepth,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to sync repository commits');
  }
  return data.data;
}

export async function getGitHubRepositoryCommits({ repoUrl, token, branch, perPage = 10 }) {
  const params = new URLSearchParams({ repoUrl, perPage: String(perPage) });
  if (token) params.append('token', token);
  if (branch) params.append('branch', branch);

  const res = await fetchWithRetry(`${API_BASE}/github/repo-commits?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to fetch repository commits');
  }
  return data.data;
}

/**
 * Bridge Agent Client APIs (Local Workspace Tunnel)
 */
export async function checkBridgeStatus(sessionCode) {
  if (!sessionCode) return { connected: false };
  const res = await fetchWithRetry(`${API_BASE}/bridge/status/${encodeURIComponent(sessionCode)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to check bridge status');
  }
  return data;
}

export async function getBridgeChanges(sessionCode) {
  if (!sessionCode) return { success: false, changes: [] };
  const res = await fetchWithRetry(`${API_BASE}/bridge/changes/${encodeURIComponent(sessionCode)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch bridge changes');
  }
  return data;
}

export async function runBridgeScan(sessionCode, { changedFiles, maxDepth = 10, mode } = {}) {
  if (!sessionCode) throw new Error('Session code is required for local bridge scan');
  const res = await fetchWithRetry(`${API_BASE}/bridge/scan/${encodeURIComponent(sessionCode)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changedFiles, maxDepth, mode }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Local bridge scan failed');
  }
  return data;
}





