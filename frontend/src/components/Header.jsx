import React, { useState, useEffect } from 'react';
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
import { ThemeToggle } from './ThemeToggle.jsx';

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
  isDemoMode = false,
  isProjectHubOpen = false,
  activeHubTab = 'repo',
  activeTargetContext,
}) {
  const [repoPath, setRepoPath] = useState('');
  const [changedFile, setChangedFile] = useState('');
  const [maxDepth, setMaxDepth] = useState(10);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Sync inputs whenever activeTargetContext updates from a previous analysis
  useEffect(() => {
    if (activeTargetContext) {
      if (activeTargetContext.repoPath) {
        setRepoPath(activeTargetContext.repoPath);
      }
      if (Array.isArray(activeTargetContext.changedFiles)) {
        setChangedFile(activeTargetContext.changedFiles.join(', '));
      }
    }
  }, [activeTargetContext]);

  const handleToggleAdjust = () => {
    if (!isAdjusting) {
      if (activeTargetContext?.repoPath) {
        setRepoPath(activeTargetContext.repoPath);
      }
      if (Array.isArray(activeTargetContext?.changedFiles)) {
        setChangedFile(activeTargetContext.changedFiles.join(', '));
      }
    }
    setIsAdjusting((prev) => !prev);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    // Supports comma-separated multiple files or auto-detection if left blank
    const changedFiles = changedFile.trim()
      ? changedFile.split(',').map((f) => f.trim()).filter(Boolean)
      : [];
    onAnalyze({
      repoPath: repoPath.trim() || undefined,
      changedFiles,
      maxDepth: Number(maxDepth),
    });
  };

  return (
    <header className="bg-white dark:bg-[#0e1422]/95 border-b border-slate-200 dark:border-slate-700/80 backdrop-blur-md sticky top-0 z-40 shrink-0 shadow-sm dark:shadow-none">
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
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              ChangeLens
            </span>
          </Link>

          <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-100 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 shrink-0">
            v1.0 AST Engine
          </span>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

          {/* Engine Status & What-If Banner */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0 ${
                backendStatus === 'online' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendStatus === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                }`}
              />
              <span>{backendStatus === 'online' ? 'Engine Ready' : 'Connecting...'}</span>
            </span>

            {isSimulating && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-900 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-500/40 px-2 py-0.5 rounded-full shadow-sm shrink-0">
                <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400 animate-pulse" />
                <span className="truncate max-w-[140px]">
                  What-If: {simulatedFile?.split('/').pop()}
                </span>
                {onExitSimulation && (
                  <button
                    type="button"
                    onClick={onExitSimulation}
                    className="hover:text-slate-950 dark:hover:text-white transition-colors"
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
          {/* Project Hub / Back to Workshop Button */}
          {onOpenProjectHub && (
            <button
              type="button"
              onClick={onOpenProjectHub}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer ${
                activeHubTab === 'local'
                  ? 'bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                  : activeHubTab === 'pr'
                  ? 'bg-indigo-100 dark:bg-indigo-950/70 hover:bg-indigo-200 dark:hover:bg-indigo-900/80 text-indigo-900 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/60'
                  : 'bg-cyan-100 dark:bg-cyan-950/70 hover:bg-cyan-200 dark:hover:bg-cyan-900/80 text-cyan-900 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/60'
              }`}
              title={
                !isProjectHubOpen
                  ? `Return to ${activeHubTab === 'local' ? 'Local Workshop' : activeHubTab === 'pr' ? 'GitHub PR' : 'Project Hub'}`
                  : 'Open Project Hub'
              }
            >
              <FolderPlus
                className={`w-3.5 h-3.5 ${
                  activeHubTab === 'local'
                    ? 'text-amber-600 dark:text-amber-400'
                    : activeHubTab === 'pr'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-cyan-600 dark:text-cyan-400'
                }`}
              />
              <span>
                {!isProjectHubOpen
                  ? activeHubTab === 'local'
                    ? 'Local Workshop'
                    : activeHubTab === 'pr'
                    ? 'GitHub PR'
                    : 'Connect Repo'
                  : 'Project Hub'}
              </span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <ThemeToggle size="sm" />

          {/* History Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#182338] dark:hover:bg-[#1f2d48] text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-600/80 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Open Analysis History & Saved Reports"
          >
            <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700/80 shrink-0" />

          {/* User Profile Avatar with Dropdown */}
          <div className="shrink-0">
            <UserProfileMenu />
          </div>
        </div>
      </div>

      {/* ROW 2: Active Analysis Breadcrumb & Actions (Only visible in Graph View, NOT in Project Hub) */}
      {!isProjectHubOpen && (
        <div className="border-t border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0c1220]/90 backdrop-blur-md px-5 py-2 flex items-center justify-between gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Left: Active Analysis Context Breadcrumb & Actions */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider shrink-0">
              Active Context:
            </span>

            {isAdjusting ? (
              /* Inline Quick-Adjust Form right beside Active Context */
              <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Folder / Workspace Path Input */}
                <div className="relative flex items-center">
                  <Folder className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={repoPath}
                    onChange={(e) => setRepoPath(e.target.value)}
                    placeholder="Workspace / Folder path..."
                    className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-[#0e1627] border border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 focus:border-cyan-500 rounded-md text-slate-900 dark:text-slate-200 placeholder:text-slate-400 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/50 w-44 sm:w-56 md:w-64 transition-all shadow-inner"
                    title="Enter workspace or folder path (e.g. D:/MyProject or leave empty for active workspace)"
                  />
                </div>

                {/* Changed Files Input */}
                <div className="relative flex items-center">
                  <GitPullRequest className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={changedFile}
                    onChange={(e) => setChangedFile(e.target.value)}
                    placeholder="Changed files (e.g. auth.js, user.js) or blank for git"
                    className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-[#0e1627] border border-slate-300 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-600 focus:border-amber-500 rounded-md text-slate-900 dark:text-slate-200 placeholder:text-slate-400 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/50 w-48 sm:w-60 md:w-72 transition-all shadow-inner"
                    title="Comma-separated files or leave empty to auto-detect git changes"
                  />
                </div>

                {/* Depth Selector */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0e1627] border border-slate-300 dark:border-slate-700/80 rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 shrink-0">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium uppercase">Depth:</span>
                  <select
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="bg-transparent text-slate-900 dark:text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
                  >
                    <option value={3} className="bg-white dark:bg-[#0e1627] text-slate-900 dark:text-slate-200">3</option>
                    <option value={5} className="bg-white dark:bg-[#0e1627] text-slate-900 dark:text-slate-200">5</option>
                    <option value={10} className="bg-white dark:bg-[#0e1627] text-slate-900 dark:text-slate-200">10 (Default)</option>
                    <option value={15} className="bg-white dark:bg-[#0e1627] text-slate-900 dark:text-slate-200">15</option>
                    <option value={20} className="bg-white dark:bg-[#0e1627] text-slate-900 dark:text-slate-200">20 (Deep)</option>
                  </select>
                </div>

                {/* Direct Calculate Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md shadow-cyan-900/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  title="Directly calculate blast radius from this page"
                >
                  <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Calculating...' : 'Calculate'}</span>
                </button>

                {/* Close Inline Edit Mode */}
                <button
                  type="button"
                  onClick={handleToggleAdjust}
                  className="p-1 rounded-md text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close inline editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <>
                {/* Target Folder / Repository Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-[#0e1627] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-mono text-xs shrink-0 shadow-sm">
                  <Folder className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[200px]" title={activeTargetContext?.repoPath || 'Active Workspace'}>
                    {activeTargetContext?.repoPath
                      ? activeTargetContext.repoPath.split(/[/\\]/).filter(Boolean).pop()
                      : 'Local Workspace'}
                  </span>
                </div>

                {/* Changed Files Pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-[#0e1627] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 font-mono text-xs shrink-0 shadow-sm">
                  <GitPullRequest className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span
                    className="truncate max-w-[260px]"
                    title={
                      Array.isArray(activeTargetContext?.changedFiles) && activeTargetContext.changedFiles.length > 0
                        ? activeTargetContext.changedFiles.join(', ')
                        : 'Auto-Detect Git Diff'
                    }
                  >
                    {Array.isArray(activeTargetContext?.changedFiles) && activeTargetContext.changedFiles.length > 0
                      ? activeTargetContext.changedFiles.join(', ')
                      : 'Auto-Detect Git Diff'}
                  </span>
                </div>

                {/* Re-run Button */}
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950/90 dark:hover:bg-cyan-900 text-cyan-900 dark:text-cyan-200 hover:text-cyan-950 dark:hover:text-white border border-cyan-300 dark:border-cyan-700/70 transition-all font-medium text-xs shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                    title="Re-run blast radius analysis"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Re-analyzing...' : 'Re-run'}</span>
                  </button>
                )}

                {/* Adjust Files & Depth Button */}
                <button
                  type="button"
                  onClick={handleToggleAdjust}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#182338] dark:hover:bg-[#1f2d48] text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-600/80 transition-all font-medium text-xs cursor-pointer shrink-0 shadow-sm"
                  title="Directly adjust files, folder, and depth right here"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Adjust Files & Depth</span>
                </button>
              </>
            )}
          </div>

          {/* Right: Environment Mode Badge */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {isDemoMode ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Demo Playground (mern-sample)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#0e1627] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/80">
                <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                <span>AST Blast Radius Engine</span>
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
