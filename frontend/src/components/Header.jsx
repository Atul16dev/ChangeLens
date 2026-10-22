import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  GitPullRequest,
  Folder,
  FolderPlus,
  Sliders,
  RefreshCw,
  Zap,
  X,
  History,
} from 'lucide-react';
import { UserProfileMenu } from './UserProfileMenu.jsx';
import { BrandLogo } from './BrandLogo.jsx';

function GitHubIcon({ className = 'w-3.5 h-3.5' }) {
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

const PRESETS = [
  { label: 'Model (user.js)', file: 'server/models/user.js' },
  { label: 'Controller (user-controller.js)', file: 'server/controllers/user-controller.js' },
  { label: 'Route (user-routes.js)', file: 'server/routes/user-routes.js' },
  { label: 'CSS (styles.css)', file: 'client/src/styles.css' },
];

export function Header({
  onAnalyze,
  loading,
  backendStatus,
  onRefresh,
  isSimulating,
  simulatedFile,
  onExitSimulation,
  onOpenHistory,
  onOpenGitHub,
  onOpenProjectHub,
}) {
  const [repoPath, setRepoPath] = useState('');
  const [changedFile, setChangedFile] = useState('server/models/user.js');
  const [maxDepth, setMaxDepth] = useState(10);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const changedFiles = changedFile.trim() ? [changedFile.trim()] : [];
    onAnalyze({
      repoPath: repoPath.trim() || undefined,
      changedFiles,
      maxDepth: Number(maxDepth),
    });
  };

  const applyPreset = (presetFile) => {
    setChangedFile(presetFile);
    onAnalyze({
      repoPath: repoPath.trim() || undefined,
      changedFiles: [presetFile],
      maxDepth: Number(maxDepth),
    });
  };

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 shrink-0">
      {/* ROW 1: Branding, Status & Top Action Tools (GitHub PR, History, Profile) */}
      <div className="px-5 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
            title="ChangeLens Home"
          >
            <BrandLogo size="sm" />
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ChangeLens
            </span>
          </Link>

          <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            v1.0 AST Engine
          </span>

          <div className="h-4 w-px bg-slate-800 hidden md:block shrink-0" />

          {/* Engine Status & What-If Banner */}
          <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0 ${
                backendStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendStatus === 'online' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <span>{backendStatus === 'online' ? 'Engine Ready' : 'Connecting...'}</span>
            </span>

            {isSimulating && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 bg-purple-950/70 border border-purple-500/40 px-2 py-0.5 rounded-full shadow-sm shrink-0">
                <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="truncate max-w-[140px]">
                  What-If: {simulatedFile?.split('/').pop()}
                </span>
                {onExitSimulation && (
                  <button
                    type="button"
                    onClick={onExitSimulation}
                    className="hover:text-white transition-colors"
                    title="Exit simulation"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions (Connect Repo, GitHub PR, History, Profile) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Project Hub / Connect Repo Button */}
          {onOpenProjectHub && (
            <button
              type="button"
              onClick={onOpenProjectHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-800/60 hover:border-cyan-500/60 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Open Project Hub to connect GitHub repo or local folder"
            >
              <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Connect Repo</span>
            </button>
          )}

          {/* GitHub PR Connector Button */}
          <button
            type="button"
            onClick={onOpenGitHub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Connect GitHub Pull Request & Actions CI"
          >
            <GitHubIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>GitHub PR</span>
          </button>

          {/* History Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm active:scale-95"
            title="Open Analysis History & Saved Reports"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>History</span>
          </button>

          <div className="h-5 w-px bg-slate-800 shrink-0" />

          {/* User Profile Avatar with Dropdown */}
          <div className="shrink-0">
            <UserProfileMenu />
          </div>
        </div>
      </div>

      {/* ROW 2: Analysis Toolbar (Inputs on Left + Quick Scenarios on Right utilizing full width!) */}
      <div className="border-t border-slate-800/80 bg-slate-950/40 px-5 py-2 flex items-center justify-between gap-4 overflow-x-auto">
        {/* Left: Input Form (Single Line, Never Wraps!) */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 shrink-0">
          {/* Target Repo Input */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 focus-within:border-cyan-500 transition-colors shadow-inner">
            <Folder className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0" />
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Repo path (default: mern-sample)"
              className="bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-44 lg:w-56 font-mono"
              title="Absolute or relative path to target repository"
            />
          </div>

          {/* Changed File Input */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 focus-within:border-cyan-500 transition-colors shadow-inner">
            <GitPullRequest className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
            <input
              type="text"
              value={changedFile}
              onChange={(e) => setChangedFile(e.target.value)}
              placeholder="e.g. server/models/user.js"
              className="bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-40 lg:w-52 font-mono"
              title="File path relative to repository root"
            />
          </div>

          {/* Depth Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Sliders className="w-3 h-3 text-slate-400 mr-1.5 shrink-0" />
            <span className="text-[11px] text-slate-400 mr-1">Depth:</span>
            <select
              value={maxDepth}
              onChange={(e) => setMaxDepth(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none font-mono cursor-pointer"
            >
              <option value="5" className="bg-slate-900">5</option>
              <option value="10" className="bg-slate-900">10</option>
              <option value="20" className="bg-slate-900">20</option>
            </select>
          </div>

          {/* Calculate Blast Radius Button - NEVER DROPS DOWN! */}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Calculate Blast Radius</span>
              </>
            )}
          </button>
        </form>

        {/* Right: Quick Scenarios (Fills the empty space on the right side!) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
            Quick Scenarios:
          </span>
          {PRESETS.map((p) => {
            const isActive = changedFile === p.file;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.file)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm font-semibold'
                    : 'bg-slate-800/70 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
                title={`Analyze ${p.file}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
