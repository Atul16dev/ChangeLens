import React, { useState } from 'react';
import {
  Play,
  GitPullRequest,
  Folder,
  Sliders,
  Activity,
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
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur-md sticky top-0 z-40">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand, Status & Compact History Button */}
        <div className="flex items-center gap-3">
          <BrandLogo size="md" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ChangeLens
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v1.0 AST Engine
              </span>

              {/* Compact, fixed-position History Button */}
              <button
                type="button"
                onClick={onOpenHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-200 border border-cyan-700/50 hover:border-cyan-400/60 transition-all shadow-sm active:scale-95 ml-1"
                title="Open Analysis History & Saved Reports"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>History</span>
              </button>

              {/* GitHub PR Connector Button */}
              <button
                type="button"
                onClick={onOpenGitHub}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 transition-all shadow-sm active:scale-95"
                title="Connect GitHub Pull Request & Actions CI"
              >
                <GitHubIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>GitHub PR</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>Deterministic Blast Radius & Impact Analyzer</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
              <span className={`inline-flex items-center gap-1 text-[11px] ${backendStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                {backendStatus === 'online' ? 'Engine Ready' : 'Connecting...'}
              </span>
              {isSimulating && (
                <>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 bg-purple-950/70 border border-purple-500/40 px-2 py-0.5 rounded-full shadow-sm">
                    <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                    <span>What-If: {simulatedFile?.split('/').pop()}</span>
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
                </>
              )}
            </p>
          </div>
        </div>

        {/* Input Controls Form & User Profile */}
        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap">
          <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2.5">
            {/* Repo Path Input */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-cyan-500 transition-colors shadow-inner">
              <Folder className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
              <input
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="Custom repo path (default: mern-sample)"
                className="bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-52 sm:w-64 font-mono text-xs"
                title="Absolute or relative path to target repository"
              />
            </div>

            {/* Changed File Input */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 focus-within:border-cyan-500 transition-colors shadow-inner">
              <GitPullRequest className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
              <input
                type="text"
                value={changedFile}
                onChange={(e) => setChangedFile(e.target.value)}
                placeholder="e.g. server/models/user.js"
                className="bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-48 sm:w-56 font-mono text-xs"
                title="File path relative to repository root"
              />
            </div>

            {/* Max Depth */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <span className="text-xs text-slate-400 mr-1">Depth:</span>
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

            {/* Run Analysis Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm px-4 py-1.5 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Calculate Blast Radius</span>
                </>
              )}
            </button>
          </form>

          {/* User Profile Avatar with Dropdown */}
          <div className="hidden sm:block h-7 w-px bg-slate-800 shrink-0" />
          <div className="shrink-0">
            <UserProfileMenu />
          </div>
        </div>
      </div>

      {/* Preset Pills */}
      <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400 overflow-x-auto pb-1">
        <span className="text-slate-500 font-medium shrink-0">Quick Scenarios:</span>
        <button
          onClick={() => applyPreset('server/models/user.js')}
          className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-mono transition-colors shrink-0"
        >
          Model (user.js)
        </button>
        <button
          onClick={() => applyPreset('server/controllers/user-controller.js')}
          className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-mono transition-colors shrink-0"
        >
          Controller (user-controller.js)
        </button>
        <button
          onClick={() => applyPreset('server/routes/user-routes.js')}
          className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-mono transition-colors shrink-0"
        >
          Route (user-routes.js)
        </button>
        <button
          onClick={() => applyPreset('client/src/styles.css')}
          className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-mono transition-colors shrink-0"
        >
          Frontend CSS (styles.css)
        </button>
      </div>
    </header>
  );
}
