import React, { useState } from 'react';
import {
  Folder,
  GitPullRequest,
  GitBranch,
  Zap,
  Play,
  KeyRound,
  ShieldCheck,
  ArrowRight,
  Code2,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.jsx';

const REPO_PRESETS = [
  { name: 'React', url: 'https://github.com/facebook/react', label: 'facebook/react' },
  { name: 'Express', url: 'https://github.com/expressjs/express', label: 'expressjs/express' },
  { name: 'Next.js', url: 'https://github.com/vercel/next.js', label: 'vercel/next.js' },
];

export function ProjectHub({
  onConnectGitHubRepo,
  onOpenLocalWorkspace,
  onLaunchDemo,
  loading = false,
}) {
  const [githubUrl, setGithubUrl] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState(null);

  const handleGitHubSubmit = (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub repository URL.');
      return;
    }
    setError(null);
    onConnectGitHubRepo({
      repoUrl: githubUrl.trim(),
      token: token.trim() || undefined,
    });
  };

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    setError(null);
    onOpenLocalWorkspace({
      repoPath: localPath.trim() || undefined,
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-radial from-slate-900 via-slate-950 to-slate-950 overflow-y-auto">
      <div className="max-w-4xl w-full flex flex-col items-center text-center my-auto">
        {/* Brand Hero Heading */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AST Blast Radius & Repository Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-3">
          How would you like to analyze your code?
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mb-8">
          Connect your GitHub repository to track code pushes automatically, scan your local workspace, or explore our built-in interactive playground.
        </p>

        {error && (
          <div className="w-full max-w-md bg-rose-950/80 border border-rose-500/50 text-rose-300 px-4 py-2 rounded-lg text-xs mb-6 text-left flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 3 Core Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {/* CARD 1: Connect GitHub Repository */}
          <div className="bg-slate-900/80 border border-cyan-800/40 hover:border-cyan-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg hover:shadow-cyan-500/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg border-b border-l border-cyan-500/20">
              RECOMMENDED
            </div>

            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950 flex items-center justify-center border border-cyan-800/60 mb-4 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 fill-cyan-400" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>

              <h2 className="text-base font-bold text-white mb-1.5">
                Connect GitHub Repository
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect your repository to sync pushes automatically, detect cumulative blast radiuses across commits, and audit architectural hotspots.
              </p>

              <form onSubmit={handleGitHubSubmit} className="space-y-3">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                />

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showToken ? 'Hide Token' : '+ Personal Access Token'}</span>
                  </button>
                  <span className="text-slate-500 text-[10px]">Optional for public repos</span>
                </div>

                {showToken && (
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="github_pat_..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                )}

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  {REPO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setGithubUrl(p.url)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  <span>Connect & Inspect Repository</span>
                </button>
              </form>
            </div>
          </div>

          {/* CARD 2: Scan Local Project Folder */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg hover:shadow-slate-800/30 group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 mb-4 group-hover:scale-105 transition-transform">
                <Folder className="w-5 h-5 text-amber-400" />
              </div>

              <h2 className="text-base font-bold text-white mb-1.5">
                Scan Local Workspace
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Working on your machine in VS Code? Enter your local folder path to scan uncommitted git changes completely offline.
              </p>

              <form onSubmit={handleLocalSubmit} className="space-y-3">
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="e.g. D:/my-project (leave blank for sample)"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                />

                <p className="text-[11px] text-slate-500">
                  ⚡ Auto-detects all uncommitted files modified in VS Code.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs py-2.5 rounded-lg border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Local Workspace</span>
                </button>
              </form>
            </div>
          </div>

          {/* CARD 3: Try Interactive Demo Playground */}
          <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-lg group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 mb-4 group-hover:scale-105 transition-transform">
                <Code2 className="w-5 h-5 text-indigo-400" />
              </div>

              <h2 className="text-base font-bold text-white mb-1.5">
                Interactive Playground
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Explore our full-featured demo MERN stack project. Test What-If scenarios, symbol breaking changes, and visual DAG layouts without any setup.
              </p>

              <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5 mb-5 font-mono">
                <div className="flex items-center gap-1 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>mern-sample fixture (28 modules)</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Includes Models, Express Controllers, Routes, and Frontend styles.
                </div>
              </div>

              <button
                type="button"
                onClick={onLaunchDemo}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Demo Playground</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
