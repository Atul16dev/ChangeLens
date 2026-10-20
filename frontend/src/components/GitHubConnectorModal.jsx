import React, { useState, useEffect } from 'react';
import {
  X,
  GitPullRequest,
  FileCode2,
  ExternalLink,
  RefreshCw,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Send,
  Download,
  KeyRound,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  inspectGitHubPR,
  analyzeGitHubPR,
  postCommentToGitHubPR,
  getGitHubWorkflowTemplate,
} from '../services/api.js';

function GitHubIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

const DEMO_PRESETS = [
  {
    name: 'mern-sample #42',
    url: 'https://github.com/facebook/react/pull/28000',
    label: 'React Core PR',
  },
  {
    name: 'next.js #50000',
    url: 'https://github.com/vercel/next.js/pull/50000',
    label: 'Next.js App Router PR',
  },
  {
    name: 'express #4500',
    url: 'https://github.com/expressjs/express/pull/4500',
    label: 'Express Router PR',
  },
];

export function GitHubConnectorModal({
  isOpen,
  onClose,
  onAnalysisComplete,
  currentAnalysisId = null,
}) {
  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' | 'ci' | 'comment'
  const [prUrl, setPrUrl] = useState('');
  const [token, setToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inspected PR state
  const [inspectedPR, setInspectedPR] = useState(null);
  const [prFiles, setPrFiles] = useState([]);

  // Workflow template state
  const [workflowYaml, setWorkflowYaml] = useState('');
  const [failOnCritical, setFailOnCritical] = useState(true);
  const [failOnHigh, setFailOnHigh] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);

  // Post comment state
  const [postingComment, setPostingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(null);
  const [commentError, setCommentError] = useState(null);

  // Fetch workflow template when tab or toggles change
  useEffect(() => {
    if (activeTab === 'ci') {
      getGitHubWorkflowTemplate({ failOnCritical, failOnHigh })
        .then((res) => setWorkflowYaml(res.yaml))
        .catch((err) => console.warn('Failed to load workflow template:', err));
    }
  }, [activeTab, failOnCritical, failOnHigh]);

  if (!isOpen) return null;

  const handleInspect = async (e) => {
    e?.preventDefault();
    if (!prUrl.trim()) {
      setError('Please enter a GitHub Pull Request URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setInspectedPR(null);
    setPrFiles([]);

    try {
      const data = await inspectGitHubPR({
        prUrl: prUrl.trim(),
        token: token.trim() || undefined,
      });

      setInspectedPR(data.pr);
      setPrFiles(data.files || []);
    } catch (err) {
      setError(err.message || 'Failed to inspect GitHub PR. Check URL or provide a token.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!prUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeGitHubPR({
        prUrl: prUrl.trim(),
        token: token.trim() || undefined,
      });

      if (onAnalysisComplete) {
        onAnalysisComplete(result.analysisId);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Analysis on GitHub PR failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyWorkflow = () => {
    if (!workflowYaml) return;
    navigator.clipboard.writeText(workflowYaml);
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 2000);
  };

  const handleDownloadWorkflow = () => {
    if (!workflowYaml) return;
    const blob = new Blob([workflowYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'changelens.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePostComment = async () => {
    if (!inspectedPR) {
      setCommentError('Please inspect a GitHub PR first in the Analyze tab.');
      return;
    }
    if (!token.trim()) {
      setCommentError('GitHub Personal Access Token is required to post comments.');
      return;
    }
    if (!currentAnalysisId) {
      setCommentError('No active analysis report to post. Run analysis first.');
      return;
    }

    setPostingComment(true);
    setCommentError(null);
    setCommentSuccess(null);

    try {
      const result = await postCommentToGitHubPR({
        owner: inspectedPR.owner,
        repo: inspectedPR.repo,
        pullNumber: inspectedPR.number,
        token: token.trim(),
        analysisId: currentAnalysisId,
      });

      setCommentSuccess(`Comment ${result.action} successfully on PR #${inspectedPR.number}!`);
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment to GitHub PR.');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100">
              <GitHubIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>GitHub Pull Request Connector</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Inspect PR diffs, calculate AST blast radius, and automate CI checks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800/80 bg-slate-950/30 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('analyze')}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-semibold border-b-2 transition-all ${
              activeTab === 'analyze'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>Analyze GitHub PR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ci')}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-semibold border-b-2 transition-all ${
              activeTab === 'ci'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>GitHub Actions CI Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comment')}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-semibold border-b-2 transition-all ${
              activeTab === 'comment'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Report to PR</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Analyze PR */}
          {activeTab === 'analyze' && (
            <div className="space-y-4">
              {/* Form Input */}
              <form onSubmit={handleInspect} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    GitHub Pull Request URL
                  </label>
                  <div className="relative">
                    <GitPullRequest className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={prUrl}
                      onChange={(e) => setPrUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo/pull/123"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-24 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono text-xs shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={loading || !prUrl.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg transition-all disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Inspect'}
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[11px] text-slate-500">Sample PRs:</span>
                  {DEMO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setPrUrl(p.url);
                        setError(null);
                      }}
                      className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-mono text-[11px] transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {/* Token Option Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(!showTokenInput)}
                    className="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showTokenInput ? 'Hide GitHub Token' : '+ Add Personal Access Token (for private repos or high rate limits)'}</span>
                  </button>

                  {showTokenInput && (
                    <div className="mt-2">
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx (Optional, stored in memory only)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              </form>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* Inspected PR Details Card */}
              {inspectedPR && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {inspectedPR.owner}/{inspectedPR.repo} #{inspectedPR.number}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {inspectedPR.state}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {inspectedPR.title}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <span>by <strong>{inspectedPR.author.login}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-cyan-400">{inspectedPR.base.ref} ← {inspectedPR.head.ref}</span>
                      </p>
                    </div>

                    <a
                      href={inspectedPR.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition-colors"
                      title="Open PR on GitHub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Files Changed</span>
                      <strong className="text-sm text-cyan-400 font-mono">{inspectedPR.changedFilesCount}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Additions</span>
                      <strong className="text-sm text-emerald-400 font-mono">+{inspectedPR.additions}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Deletions</span>
                      <strong className="text-sm text-rose-400 font-mono">-{inspectedPR.deletions}</strong>
                    </div>
                  </div>

                  {/* Modified Files List Preview */}
                  {prFiles.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>Modified Files for Blast Radius Traversal</span>
                        <span className="text-[10px] text-slate-500 font-mono">{prFiles.length} detected</span>
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-xs pr-1">
                        {prFiles.map((file) => (
                          <div
                            key={file.path}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${
                                  file.status === 'added'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : file.status === 'removed'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {file.statusCode}
                              </span>
                              <span className="text-slate-200 truncate">{file.path}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              <span className="text-emerald-400">+{file.additions}</span>{' '}
                              <span className="text-rose-400">-{file.deletions}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button: Run AST Analysis */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Tracing Dependency Blast Radius...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-white" />
                          <span>Run ChangeLens Blast Radius on PR #{inspectedPR.number}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CI Setup */}
          {activeTab === 'ci' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Automate ChangeLens in GitHub Actions CI</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Block dangerous PR merges and automatically post ChangeLens blast radius reports to every pull request.
                </p>
              </div>

              {/* Configuration Toggles */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <span className="text-slate-400 font-semibold block uppercase text-[10px] tracking-wider">
                  Workflow Guard Policies
                </span>
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={failOnCritical}
                    onChange={(e) => setFailOnCritical(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Fail CI build if <strong>CRITICAL</strong> risk or broken export is detected (Recommended)</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={failOnHigh}
                    onChange={(e) => setFailOnHigh(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span>Fail CI build if <strong>HIGH</strong> risk threshold (Blast Radius &gt; 75) is exceeded</span>
                </label>
              </div>

              {/* YAML Code Box */}
              <div className="relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>.github/workflows/changelens.yml</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyWorkflow}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-sans"
                    >
                      {copiedWorkflow ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWorkflow ? 'Copied' : 'Copy YAML'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadWorkflow}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-sans"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed">
                  {workflowYaml || 'Loading workflow template...'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Post Comment */}
          {activeTab === 'comment' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <span>Publish Blast Radius Report to GitHub PR</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Posts or updates an official ChangeLens review comment on GitHub PR discussions.
                </p>
              </div>

              {commentSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{commentSuccess}</span>
                </div>
              )}

              {commentError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{commentError}</span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Pull Request</label>
                  <input
                    type="text"
                    disabled
                    value={inspectedPR ? `${inspectedPR.owner}/${inspectedPR.repo} #${inspectedPR.number} (${inspectedPR.title})` : 'No PR inspected yet (Use the Analyze tab)'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono text-xs opacity-80"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx (Requires repo / pull-requests write scope)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePostComment}
                    disabled={postingComment || !inspectedPR || !token.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition-all disabled:opacity-50"
                  >
                    {postingComment ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Posting comment to GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Post ChangeLens Report Comment to PR</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
