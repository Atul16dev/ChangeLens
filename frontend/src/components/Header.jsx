import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Play,
  GitPullRequest,
  Folder,
  Sliders,
  ShieldCheck,
  Activity,
  RefreshCw,
  Zap,
  X,
  LogOut,
  User,
  History,
} from 'lucide-react';

export function Header({
  onAnalyze,
  loading,
  backendStatus,
  onRefresh,
  isSimulating,
  simulatedFile,
  onExitSimulation,
  onOpenHistory,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-3.5 backdrop-blur-md sticky top-0 z-50">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-rose-500 p-0.5 shadow-lg shadow-cyan-500/10">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ChangeLens
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v1.0 AST Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
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

        {/* Input Controls Form & Auth */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* User Authentication Profile & Actions */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800/80">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700/80 transition-colors shadow-sm"
                  title="View Saved Reports & History"
                >
                  <History className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">History</span>
                </button>
                <div
                  className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                  title={`${user.name} (${user.email})`}
                >
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'CL'}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-semibold text-slate-200 leading-none">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono leading-none mt-1 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
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
