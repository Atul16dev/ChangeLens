import React, { useState, useRef, useEffect } from 'react';
import {
  GitCommit,
  GitBranch,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';

export function RepoSyncBar({
  repoInfo,
  commits = [],
  lastSyncedSha = null,
  currentSha = null,
  loading = false,
  onSyncAllPushes,
  onSyncLatestPush,
  onSelectSpecificCommit,
  onDisconnect,
}) {
  const [showCommitDropdown, setShowCommitDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCommitDropdown(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowCommitDropdown(false);
      }
    }

    if (showCommitDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCommitDropdown]);

  if (!repoInfo) return null;

  // Calculate how many commits are ahead since last check
  let unSyncedCount = 0;
  if (lastSyncedSha && currentSha && lastSyncedSha !== currentSha) {
    const lastIndex = commits.findIndex((c) => c.sha === lastSyncedSha);
    unSyncedCount = lastIndex > 0 ? lastIndex : commits.length;
  }

  const latestCommit = commits.length > 0 ? commits[0] : null;

  return (
    <div className="relative z-30 bg-[#0d1527]/95 border-b border-cyan-900/40 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md shrink-0 shadow-sm transition-all">
      {/* Left: Connected Repository Identity & Branch */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold font-mono shadow-inner">
          <svg className="w-3.5 h-3.5 fill-cyan-400 shrink-0" viewBox="0 0 24 24">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span className="truncate">{repoInfo.fullName || `${repoInfo.owner}/${repoInfo.repo}`}</span>
        </span>

        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 font-mono">
          <GitBranch className="w-3 h-3 text-cyan-400" />
          {repoInfo.defaultBranch || 'main'}
        </span>

        {/* Sync Status Badge */}
        {unSyncedCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>{unSyncedCount} new pushes since last check</span>
          </span>
        ) : (
          <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Up to date ({lastSyncedSha ? lastSyncedSha.slice(0, 7) : 'Synced'})</span>
          </span>
        )}
      </div>

      {/* Right: Dual Sync Action Buttons + Commit Dropdown */}
      <div className="flex items-center gap-2 shrink-0">
        {/* OPTION 1: Sync ALL Pushes (Cumulative diff since last check) */}
        <button
          type="button"
          onClick={onSyncAllPushes}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          title="Compute combined blast radius for all commits since your previous check"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 fill-white text-yellow-300" />
          )}
          <span>
            Sync ALL Pushes {unSyncedCount > 0 ? `(${unSyncedCount} Commits)` : ''}
          </span>
        </button>

        {/* OPTION 2: Sync ONLY Latest Push (Single commit) */}
        <button
          type="button"
          onClick={onSyncLatestPush}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          title="Compute blast radius for only the single latest commit"
        >
          <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Sync Latest Only</span>
          <span className="sm:hidden">Latest</span>
        </button>

        {/* Commit History Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowCommitDropdown((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              showCommitDropdown
                ? 'bg-slate-750 text-white border-cyan-500/60 ring-1 ring-cyan-500/30'
                : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/80'
            }`}
            title="Inspect a specific commit from history"
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                showCommitDropdown ? 'rotate-180 text-cyan-400' : ''
              }`}
            />
          </button>

          {showCommitDropdown && (
            <div
              className="absolute right-0 mt-2 w-80 bg-[#0f172a] border border-slate-700/90 rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95"
              style={{
                boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              }}
            >
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800 mb-1.5 text-[11px] font-semibold text-slate-400">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Recent Commits ({commits.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCommitDropdown(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close dropdown"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5">
                {commits.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500 font-medium">
                    No commit history available
                  </div>
                ) : (
                  commits.map((c) => {
                    const isLastSynced = c.sha === lastSyncedSha;
                    const authorName = c.author?.name || c.author || 'Author';
                    return (
                      <button
                        key={c.sha}
                        type="button"
                        onClick={() => {
                          setShowCommitDropdown(false);
                          onSelectSpecificCommit(c.sha);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-all flex flex-col gap-1 group cursor-pointer border ${
                          isLastSynced
                            ? 'bg-cyan-950/40 border-cyan-800/60 hover:bg-cyan-900/50'
                            : 'border-transparent hover:bg-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-cyan-400 text-[11px] font-bold flex items-center gap-1.5">
                            <GitCommit className="w-3 h-3 text-cyan-400 shrink-0" />
                            {c.shortSha || c.sha?.slice(0, 7)}
                          </span>
                          {isLastSynced && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold font-mono">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-200 line-clamp-1 group-hover:text-cyan-200 font-medium">
                          {c.message}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          by {authorName}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Disconnect Repo Button */}
        {onDisconnect && (
          <button
            type="button"
            onClick={onDisconnect}
            className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Disconnect repository and return to Project Hub"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
