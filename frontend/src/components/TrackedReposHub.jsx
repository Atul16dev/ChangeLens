import React, { useState } from 'react';
import {
  Bookmark,
  Pin,
  PinOff,
  Trash2,
  GitBranch,
  GitPullRequest,
  Star,
  Lock,
  Globe,
  Zap,
  Plus,
  ExternalLink,
  RefreshCw,
  ArrowRight,
  KeyRound,
  X,
  Code2,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { getTrackedRepositoryPulls } from '../services/api.js';

function getRiskBadgeClasses(level) {
  switch (level) {
    case 'CRITICAL':
      return 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40';
    case 'HIGH':
      return 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';
    case 'MEDIUM':
      return 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/40';
    case 'LOW':
    default:
      return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40';
  }
}

function formatStars(count) {
  if (!count) return '0';
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function TrackedReposHub({
  repos = [],
  loadingRepos = false,
  onTrackRepo,
  onTogglePin,
  onRemoveRepo,
  onConnectRepo,
  onAnalyzePR,
  onLoadSavedAnalysis,
  analysisLoading = false,
}) {
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoToken, setNewRepoToken] = useState('');
  const [showAddToken, setShowAddToken] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  // Pull Requests Modal state for 1-click PR analysis
  const [prModalRepo, setPrModalRepo] = useState(null);
  const [prList, setPrList] = useState([]);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [prError, setPrError] = useState(null);
  const [prModalToken, setPrModalToken] = useState('');

  const handleAddSubmit = async (e, presetUrl = null) => {
    e?.preventDefault();
    const targetUrl = (presetUrl || newRepoUrl).trim();
    if (!targetUrl) {
      setAddError('Enter a repository URL or owner/repo shorthand (e.g. facebook/react).');
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      await onTrackRepo({
        repoUrl: targetUrl,
        token: newRepoToken.trim() || undefined,
      });
      if (!presetUrl) {
        setNewRepoUrl('');
        setNewRepoToken('');
        setShowAddToken(false);
      }
    } catch (err) {
      setAddError(err.message || 'Could not track repository.');
      if (err.message?.toLowerCase().includes('token') || err.message?.toLowerCase().includes('rate limit')) {
        setShowAddToken(true);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleOpenPulls = async (repo, customToken = null) => {
    setPrModalRepo(repo);
    setLoadingPrs(true);
    setPrError(null);
    try {
      const data = await getTrackedRepositoryPulls(repo.id, {
        token: (customToken !== null ? customToken : prModalToken).trim() || undefined,
      });
      setPrList(data.pulls || []);
    } catch (err) {
      setPrError(err.message || 'Failed to load open pull requests.');
      setPrList([]);
    } finally {
      setLoadingPrs(false);
    }
  };

  return (
    <div className="w-full text-left mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80">
      {/* Section Header & Quick Track Form */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold border border-indigo-300 dark:border-indigo-500/30 uppercase tracking-wider">
              Tracked Repositories Hub
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {repos.length} {repos.length === 1 ? 'workspace' : 'workspaces'} saved
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Your Saved GitHub Repositories</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Save your active repositories once — sync latest commits or inspect open Pull Requests in 1 click without pasting URLs.
          </p>
        </div>

        {/* Inline Quick-Track Form */}
        <form onSubmit={(e) => handleAddSubmit(e)} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={newRepoUrl}
              onChange={(e) => {
                setNewRepoUrl(e.target.value);
                if (addError) setAddError(null);
              }}
              placeholder="owner/repo or GitHub URL..."
              className="w-full bg-white dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddToken((prev) => !prev)}
            className={`px-2.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
              showAddToken
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Optional Personal Access Token for private repos"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="sm:hidden">Token</span>
          </button>

          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{adding ? 'Saving...' : 'Track Repo'}</span>
          </button>
        </form>
      </div>

      {/* Optional Token Field for Adding Private Repos */}
      {showAddToken && (
        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-2.5">
          <KeyRound className="w-4 h-4 text-indigo-500 shrink-0 hidden sm:block" />
          <input
            type="password"
            value={newRepoToken}
            onChange={(e) => setNewRepoToken(e.target.value)}
            placeholder="Optional GitHub PAT (ghp_... or github_pat_...) for private repos / higher rate limit"
            className="w-full flex-1 bg-white dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowAddToken(false)}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 cursor-pointer"
          >
            Hide
          </button>
        </div>
      )}

      {/* Add Error Banner */}
      {addError && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{addError}</span>
          </div>
          <button type="button" onClick={() => setAddError(null)} className="text-rose-500 hover:text-rose-700 dark:hover:text-white font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Repository Cards Grid */}
      {loadingRepos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : repos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className={`p-4 rounded-2xl bg-white dark:bg-[#11192b] border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                repo.isPinned
                  ? 'border-indigo-300 dark:border-indigo-500/50 ring-1 ring-indigo-500/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Top: Repo Identity & Pin/Delete Controls */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {repo.isPrivate ? (
                        <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Private Repository" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" title="Public Repository" />
                      )}
                      <a
                        href={repo.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold font-mono text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-cyan-300 truncate flex items-center gap-1 group"
                        title={repo.fullName}
                      >
                        <span className="truncate">{repo.fullName}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTogglePin && onTogglePin(repo.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        repo.isPinned
                          ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={repo.isPinned ? 'Unpin repository' : 'Pin repository to top'}
                    >
                      {repo.isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveRepo && onRemoveRepo(repo.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove from Tracked Hub"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2rem] mb-3 leading-relaxed">
                  {repo.description || 'Connected GitHub repository ready for AST blast radius analysis.'}
                </p>

                {/* Metadata Badges: Language, Stars, Branch */}
                <div className="flex items-center flex-wrap gap-2 text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-3">
                  {repo.language && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                      <Code2 className="w-3 h-3 text-indigo-500" />
                      {repo.language}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                    {formatStars(repo.stars)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">
                    <GitBranch className="w-3 h-3 text-cyan-500" />
                    {repo.defaultBranch || 'main'}
                  </span>
                </div>

                {/* Last Risk Telemetry Strip */}
                {(repo.lastRiskLevel || repo.lastAnalysisId) && (
                  <div className="mb-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-slate-500" />
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase ${getRiskBadgeClasses(
                          repo.lastRiskLevel
                        )}`}
                      >
                        {typeof repo.lastRiskScore === 'number'
                          ? `${repo.lastRiskScore}/100 • ${repo.lastRiskLevel || 'SCANNED'}`
                          : repo.lastRiskLevel || 'SCANNED'}
                      </span>
                    </div>

                    {repo.lastAnalysisId && onLoadSavedAnalysis && (
                      <button
                        type="button"
                        onClick={() => onLoadSavedAnalysis(repo.lastAnalysisId)}
                        className="text-[10px] font-bold text-indigo-700 dark:text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Last Report</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer: 1-Click Sync & 1-Click Open PRs */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  disabled={analysisLoading}
                  onClick={() => onConnectRepo && onConnectRepo({ repoUrl: repo.repoUrl })}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title="Sync latest commits and calculate blast radius in 1 click"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  <span>1-Click Sync</span>
                </button>

                <button
                  type="button"
                  disabled={analysisLoading}
                  onClick={() => handleOpenPulls(repo)}
                  className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-700/60 text-indigo-800 dark:text-indigo-200 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="View open Pull Requests & trigger 1-click PR analysis"
                >
                  <GitPullRequest className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Open PRs</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State with Quick 1-Click Track Suggestions */
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700/80 text-center">
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-3">
            No repositories saved in your Hub yet. Track your active repositories for 1-click commit sync and PR impact checks!
          </p>
          <div className="flex items-center justify-center flex-wrap gap-2">
            <span className="text-[11px] text-slate-500 font-semibold">Quick Track:</span>
            {['facebook/react', 'expressjs/express', 'vercel/next.js'].map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={adding}
                onClick={() => handleAddSubmit(null, sample)}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-indigo-500" />
                <span>{sample}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Open Pull Requests Modal for 1-Click PR Analysis */}
      {prModalRepo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Open Pull Requests — {prModalRepo.fullName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click Analyze on any PR to run ChangeLens AST Blast Radius instantly.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPrModalRepo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Optional Token Bar inside PR Modal */}
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="password"
                value={prModalToken}
                onChange={(e) => setPrModalToken(e.target.value)}
                placeholder="Optional PAT (if private repo or rate-limited)..."
                className="flex-1 bg-white dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleOpenPulls(prModalRepo, prModalToken)}
                disabled={loadingPrs}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingPrs ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* PR List Body */}
            <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
              {loadingPrs ? (
                <div className="py-10 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>Fetching live open Pull Requests from GitHub...</span>
                </div>
              ) : prError ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Could not load Pull Requests</div>
                    <p className="mt-1 opacity-90">{prError}</p>
                  </div>
                </div>
              ) : prList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  No open Pull Requests found on <span className="font-mono font-bold">{prModalRepo.fullName}</span> right now.
                </div>
              ) : (
                prList.map((pr) => (
                  <div
                    key={pr.number}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          #{pr.number}
                        </span>
                        {pr.draft && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase">
                            Draft
                          </span>
                        )}
                        <a
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-slate-900 dark:text-white hover:underline truncate"
                        >
                          {pr.title}
                        </a>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center flex-wrap gap-2">
                        <span>by @{pr.author?.login || 'unknown'}</span>
                        <span>•</span>
                        <span className="truncate max-w-[200px]">
                          {pr.headRef} → {pr.baseRef}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={analysisLoading}
                      onClick={() => {
                        const targetUrl = pr.htmlUrl;
                        const tok = prModalToken.trim() || undefined;
                        setPrModalRepo(null);
                        if (onAnalyzePR) onAnalyzePR({ prUrl: targetUrl, token: tok });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                      <span>Analyze PR</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
