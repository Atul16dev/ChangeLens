import React, { useState } from 'react';
import {
  Folder,
  GitPullRequest,
  GitBranch,
  Zap,
  Play,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Code2,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';

const REPO_PRESETS = [
  { name: 'React', url: 'https://github.com/facebook/react' },
  { name: 'Express', url: 'https://github.com/expressjs/express' },
  { name: 'Next.js', url: 'https://github.com/vercel/next.js' },
];

const PR_PRESETS = [
  { name: 'React PR #28000', url: 'https://github.com/facebook/react/pull/28000' },
  { name: 'Next.js PR #50000', url: 'https://github.com/vercel/next.js/pull/50000' },
];

export function ProjectHub({
  onConnectGitHubRepo,
  onAnalyzeGitHubPR,
  onOpenLocalWorkspace,
  onLaunchDemo,
  recentAnalyses = [],
  onLoadSavedAnalysis,
  loading = false,
}) {
  const { user } = useAuth();
  const displayName = user?.name ? user.name.split(' ')[0] : 'Developer';

  // Card input states
  const [githubUrl, setGithubUrl] = useState('');
  const [repoToken, setRepoToken] = useState('');
  const [showRepoToken, setShowRepoToken] = useState(false);

  const [prUrl, setPrUrl] = useState('');
  const [prToken, setPrToken] = useState('');
  const [showPrToken, setShowPrToken] = useState(false);

  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState(null);

  // Accordion details toggle states (1 arrow per card!)
  const [expandedCard, setExpandedCard] = useState(null);

  const toggleCardDetails = (cardId) => {
    setExpandedCard((prev) => (prev === cardId ? null : cardId));
  };

  const handleGitHubRepoSubmit = (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub repository URL (e.g. owner/repo).');
      return;
    }
    setError(null);
    onConnectGitHubRepo({
      repoUrl: githubUrl.trim(),
      token: repoToken.trim() || undefined,
    });
  };

  const handleGitHubPRSubmit = (e) => {
    e.preventDefault();
    if (!prUrl.trim()) {
      setError('Please enter a GitHub Pull Request URL.');
      return;
    }
    setError(null);
    onAnalyzeGitHubPR({
      prUrl: prUrl.trim(),
      token: prToken.trim() || undefined,
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
    <div className="flex-1 w-full bg-slate-950 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Top Hero Banner & Personal Greeting */}
        <div className="w-full text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deterministic Blast Radius & AST Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mb-2">
            Hi, {displayName} 👋
          </h1>

          <p className="text-base sm:text-lg font-medium text-slate-300 mb-1">
            How would you like to connect your code to ChangeLens?
          </p>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
            Choose a connection method below to start tracking code changes, calculating blast radiuses, and discovering breaking dependencies in real time.
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="w-full max-w-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 px-4 py-2.5 rounded-xl text-xs mb-6 text-left flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 Connection Method Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full text-left mb-10">
          {/* CARD 1: Connect GitHub Repository (Continuous Sync) */}
          <div className="bg-slate-900/90 border border-cyan-800/40 hover:border-cyan-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xl hover:shadow-cyan-500/10 group relative">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500/20 to-transparent text-cyan-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-cyan-500/30">
              CONTINUOUS SYNC
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/90 flex items-center justify-center border border-cyan-800/60 shadow-inner group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5 fill-cyan-400" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                </div>

                {/* Information Dropdown Toggle Button with Arrow */}
                <button
                  type="button"
                  onClick={() => toggleCardDetails('repo')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 px-2.5 py-1 rounded-full border border-cyan-800/50 transition-colors cursor-pointer"
                  title="Click to view details & step-by-step instructions"
                >
                  <span>How it works</span>
                  {expandedCard === 'repo' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-cyan-300" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                </button>
              </div>

              <h2 className="text-base font-bold text-white mb-1">
                Connect GitHub Repository
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Connect your repository to auto-detect pushes, compare multi-commit ranges cumulatively, and track blast radius as you code in VS Code.
              </p>

              {/* Expandable Step-by-Step Info Accordion */}
              {expandedCard === 'repo' && (
                <div className="mb-4 p-3.5 bg-slate-950/80 rounded-xl border border-cyan-900/50 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
                  <div className="font-semibold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>How Repository Sync Works:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Connects directly using GitHub REST APIs without cloning heavy files.</li>
                    <li>
                      <strong className="text-slate-200">Cumulative Diff:</strong> Detects all commits pushed since your last check so no hidden bug escapes.
                    </li>
                    <li>Audits architectural hotspots and pre-existing broken function calls.</li>
                  </ul>

                  <div className="pt-1.5 border-t border-slate-800/80">
                    <span className="font-semibold text-slate-200 text-[11px]">
                      Step-by-Step Connection:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400 mt-1">
                      <li>Paste your repo URL (e.g. <code className="text-cyan-300">owner/repo</code>).</li>
                      <li>If private, enter your Personal Access Token.</li>
                      <li>Click "Connect & Inspect" to load the live push tracker.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleGitHubRepoSubmit} className="space-y-3">
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo or owner/repo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                />

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowRepoToken(!showRepoToken)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showRepoToken ? 'Hide Token' : '+ Personal Access Token'}</span>
                  </button>
                  <span className="text-slate-500 text-[10px]">Optional for public repos</span>
                </div>

                {showRepoToken && (
                  <input
                    type="password"
                    value={repoToken}
                    onChange={(e) => setRepoToken(e.target.value)}
                    placeholder="github_pat_..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                )}

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
                  {REPO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setGithubUrl(p.url)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-0.5 rounded font-mono transition-colors cursor-pointer"
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

          {/* CARD 2: GitHub Pull Request (PR Blast Radius & Bot Comment) */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xl hover:shadow-indigo-500/10 group relative">
            <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-indigo-500/30">
              PR & CI/CD REVIEW
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 flex items-center justify-center border border-indigo-800/60 shadow-inner group-hover:scale-105 transition-transform">
                  <GitPullRequest className="w-5 h-5 text-indigo-400" />
                </div>

                {/* Information Dropdown Toggle Button with Arrow */}
                <button
                  type="button"
                  onClick={() => toggleCardDetails('pr')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 px-2.5 py-1 rounded-full border border-indigo-800/50 transition-colors cursor-pointer"
                  title="Click to view details & step-by-step instructions"
                >
                  <span>How it works</span>
                  {expandedCard === 'pr' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-300" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-300" />
                  )}
                </button>
              </div>

              <h2 className="text-base font-bold text-white mb-1">
                GitHub Pull Request (PR)
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Inspect modified PR files, compute blast radius graph, check breaking symbols, and post automated markdown reports directly to GitHub PR.
              </p>

              {/* Expandable Step-by-Step Info Accordion */}
              {expandedCard === 'pr' && (
                <div className="mb-4 p-3.5 bg-slate-950/80 rounded-xl border border-indigo-900/50 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
                  <div className="font-semibold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>How Pull Request Review Works:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Fetches git diff files and additions/deletions from GitHub API.</li>
                    <li>Maps modified lines to AST symbols and evaluates consumer impact.</li>
                    <li>Includes one-click posting of review comments to GitHub PR.</li>
                  </ul>

                  <div className="pt-1.5 border-t border-slate-800/80">
                    <span className="font-semibold text-slate-200 text-[11px]">
                      Step-by-Step Connection:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400 mt-1">
                      <li>Copy your Pull Request link from GitHub.</li>
                      <li>Paste into the box below (e.g. <code className="text-indigo-300">.../pull/42</code>).</li>
                      <li>Click "Analyze PR Impact" to generate visual blast radius.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleGitHubPRSubmit} className="space-y-3">
                <input
                  type="text"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono shadow-inner"
                />

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowPrToken(!showPrToken)}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showPrToken ? 'Hide Token' : '+ Personal Access Token'}</span>
                  </button>
                  <span className="text-slate-500 text-[10px]">Required to post PR comment</span>
                </div>

                {showPrToken && (
                  <input
                    type="password"
                    value={prToken}
                    onChange={(e) => setPrToken(e.target.value)}
                    placeholder="github_pat_..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                )}

                {/* Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500 font-medium">Sample PRs:</span>
                  {PR_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setPrUrl(p.url)}
                      className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 px-2 py-0.5 rounded font-mono transition-colors cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GitPullRequest className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Analyze Pull Request Impact</span>
                </button>
              </form>
            </div>
          </div>

          {/* CARD 3: Scan Local Project Folder (Offline / VS Code) */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xl hover:shadow-amber-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/60 flex items-center justify-center border border-amber-800/60 shadow-inner group-hover:scale-105 transition-transform">
                  <Folder className="w-5 h-5 text-amber-400" />
                </div>

                {/* Information Dropdown Toggle Button with Arrow */}
                <button
                  type="button"
                  onClick={() => toggleCardDetails('local')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 px-2.5 py-1 rounded-full border border-amber-800/50 transition-colors cursor-pointer"
                  title="Click to view details & step-by-step instructions"
                >
                  <span>How it works</span>
                  {expandedCard === 'local' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                  )}
                </button>
              </div>

              <h2 className="text-base font-bold text-white mb-1">
                Scan Local Workspace Folder
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Working on your machine in VS Code without pushing to GitHub? Enter your local folder path to scan uncommitted git changes completely offline.
              </p>

              {/* Expandable Step-by-Step Info Accordion */}
              {expandedCard === 'local' && (
                <div className="mb-4 p-3.5 bg-slate-950/80 rounded-xl border border-amber-900/50 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>How Local Workspace Scan Works:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>100% Offline execution directly using local Tree-Sitter WASM parsers.</li>
                    <li>Inspects local git working tree (<code className="text-amber-300">git status</code>) to auto-detect modified files.</li>
                    <li>Zero cloud dependencies or external credentials needed.</li>
                  </ul>

                  <div className="pt-1.5 border-t border-slate-800/80">
                    <span className="font-semibold text-slate-200 text-[11px]">
                      Step-by-Step Connection:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-400 mt-1">
                      <li>Copy your project path from VS Code or Explorer (e.g. <code className="text-amber-300">D:\my-project</code>).</li>
                      <li>Paste it into the field below.</li>
                      <li>Click "Open Local Workspace" to start analyzing.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleLocalSubmit} className="space-y-3">
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="e.g. D:/my-project (or leave blank to auto-detect)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono shadow-inner"
                />

                <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Auto-detects uncommitted changes across all files modified in VS Code.</span>
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs py-2.5 rounded-lg border border-slate-700/80 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Local Workspace</span>
                </button>
              </form>
            </div>
          </div>

          {/* CARD 4: Interactive Demo Playground (1-Click Sandbox) */}
          <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-xl hover:shadow-emerald-500/10 group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 flex items-center justify-center border border-emerald-800/60 shadow-inner group-hover:scale-105 transition-transform">
                  <Code2 className="w-5 h-5 text-emerald-400" />
                </div>

                {/* Information Dropdown Toggle Button with Arrow */}
                <button
                  type="button"
                  onClick={() => toggleCardDetails('demo')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 px-2.5 py-1 rounded-full border border-emerald-800/50 transition-colors cursor-pointer"
                  title="Click to view details & step-by-step instructions"
                >
                  <span>How it works</span>
                  {expandedCard === 'demo' ? (
                    <ChevronUp className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-300" />
                  )}
                </button>
              </div>

              <h2 className="text-base font-bold text-white mb-1">
                Interactive Demo Playground
              </h2>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Explore ChangeLens instantly with our built-in MERN stack sample (Models, Express Controllers, API Routes, and CSS styles) with zero setup.
              </p>

              {/* Expandable Step-by-Step Info Accordion */}
              {expandedCard === 'demo' && (
                <div className="mb-4 p-3.5 bg-slate-950/80 rounded-xl border border-emerald-900/50 text-xs text-slate-300 space-y-2 animate-in fade-in duration-200">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>How Playground Works:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Pre-loaded with 28 interconnected modules representing a realistic full-stack app.</li>
                    <li>Allows testing "What-If" simulations, broken symbols, and DAG graph layouts.</li>
                    <li>No local folders or GitHub credentials required.</li>
                  </ul>
                </div>
              )}

              <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 space-y-1.5 mb-5 font-mono shadow-inner">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">mern-sample fixture (28 modules)</span>
                </div>
                <div className="text-slate-500 text-[10px]">
                  Includes User schema, Auth controllers, and Client styles.
                </div>
              </div>

              <button
                type="button"
                onClick={onLaunchDemo}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Demo Playground (1-Click)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Connected Projects Section */}
        {recentAnalyses.length > 0 && (
          <div className="w-full text-left mt-2 border-t border-slate-800/80 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent Analyses & Connected Repositories</span>
              </h3>
              <span className="text-[10px] text-slate-500">
                Click any previous project to reopen its graph
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentAnalyses.slice(0, 6).map((item) => (
                <button
                  key={item.analysisId}
                  type="button"
                  onClick={() => onLoadSavedAnalysis && onLoadSavedAnalysis(item.analysisId)}
                  className="p-3 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-xl text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                      {item.title || item.analysisId}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                        item.summary?.riskLevel === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300'
                          : item.summary?.riskLevel === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {item.summary?.riskLevel || 'COMPLETED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[180px]">
                      {item.changedFiles?.length > 0 ? item.changedFiles[0] : item.targetDir || 'Repository'}
                    </span>
                    <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Resume</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
