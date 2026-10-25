import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  GitPullRequest,
  GitBranch,
  Zap,
  Play,
  KeyRound,
  ShieldCheck,
  Code2,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Clock,
  ArrowRight,
  BookOpen,
  Copy,
  Check,
  Download,
  Send,
  FileCode2,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle,
  Activity,
  Workflow,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BrandLogo } from './BrandLogo.jsx';
import { ConnectionGuideModal } from './ConnectionGuideModal.jsx';
import { LocalWorkshopSection } from './LocalWorkshopSection.jsx';
import {
  inspectGitHubPR,
  getGitHubWorkflowTemplate,
  postCommentToGitHubPR,
} from '../services/api.js';

const REPO_PRESETS = [
  { name: 'React', url: 'https://github.com/facebook/react' },
  { name: 'Express', url: 'https://github.com/expressjs/express' },
  { name: 'Next.js', url: 'https://github.com/vercel/next.js' },
];

const PR_PRESETS = [
  { name: 'React PR #28000', url: 'https://github.com/facebook/react/pull/28000' },
  { name: 'Next.js PR #50000', url: 'https://github.com/vercel/next.js/pull/50000' },
  { name: 'Express PR #4500', url: 'https://github.com/expressjs/express/pull/4500' },
];

export function ProjectHub({
  onConnectGitHubRepo,
  onAnalyzeGitHubPR,
  onOpenLocalWorkspace,
  onLaunchDemo,
  recentAnalyses = [],
  onLoadSavedAnalysis,
  loading = false,
  apiError = null,
  onClearApiError,
}) {
  const { user } = useAuth();
  const displayName = user?.name ? user.name.split(' ')[0] : 'Developer';

  // Active top-level mode: 'repo' | 'pr' | 'local' | 'demo'
  const [activeMode, setActiveMode] = useState('repo');

  // Interactive Blur Walkthrough Modal State
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [currentGuideType, setCurrentGuideType] = useState('repo');

  // Input refs for auto-focusing
  const repoInputRef = useRef(null);
  const repoTokenRef = useRef(null);
  const prInputRef = useRef(null);
  const prTokenRef = useRef(null);
  const localInputRef = useRef(null);

  // Form states - GitHub Repository
  const [githubUrl, setGithubUrl] = useState('');
  const [repoToken, setRepoToken] = useState('');
  const [showRepoToken, setShowRepoToken] = useState(false);

  // Form states - GitHub Pull Request
  const [prSubTab, setPrSubTab] = useState('analyze'); // 'analyze' | 'ci' | 'comment'
  const [prUrl, setPrUrl] = useState('');
  const [prToken, setPrToken] = useState('');
  const [showPrToken, setShowPrToken] = useState(false);
  const [inspectingPR, setInspectingPR] = useState(false);
  const [inspectedPR, setInspectedPR] = useState(null);
  const [prFiles, setPrFiles] = useState([]);

  // Form states - GitHub Actions CI
  const [workflowYaml, setWorkflowYaml] = useState('');
  const [failOnCritical, setFailOnCritical] = useState(true);
  const [failOnHigh, setFailOnHigh] = useState(false);
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);

  // Form states - Post to PR Comment
  const [commentOwner, setCommentOwner] = useState('');
  const [commentRepo, setCommentRepo] = useState('');
  const [commentPRNumber, setCommentPRNumber] = useState('');
  const [commentToken, setCommentToken] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(null);
  const [commentError, setCommentError] = useState(null);

  // Form states - Local Workspace
  const [localPath, setLocalPath] = useState('');
  const [localFiles, setLocalFiles] = useState('');

  // General error banner
  const [error, setError] = useState(null);

  const effectiveError = error || apiError;
  const isRateLimitError =
    effectiveError &&
    (effectiveError.toLowerCase().includes('rate limit') ||
      effectiveError.toLowerCase().includes('access forbidden') ||
      effectiveError.toLowerCase().includes('token'));

  // Auto-expand token field if rate limit or access forbidden error occurred
  useEffect(() => {
    if (isRateLimitError) {
      setShowRepoToken(true);
      setShowPrToken(true);
    }
  }, [isRateLimitError]);

  const focusTokenField = () => {
    if (activeMode === 'repo') {
      setShowRepoToken(true);
      setTimeout(() => repoTokenRef.current?.focus(), 80);
    } else if (activeMode === 'pr') {
      setShowPrToken(true);
      setTimeout(() => prTokenRef.current?.focus(), 80);
    }
  };

  // Load workflow YAML when PR CI tab or toggles change
  useEffect(() => {
    if (activeMode === 'pr' && prSubTab === 'ci') {
      getGitHubWorkflowTemplate({ failOnCritical, failOnHigh })
        .then((res) => setWorkflowYaml(res.yaml))
        .catch((err) => console.warn('Failed to fetch workflow template:', err));
    }
  }, [activeMode, prSubTab, failOnCritical, failOnHigh]);

  // Open guide modal helper
  const openGuide = (type) => {
    setCurrentGuideType(type);
    setIsGuideModalOpen(true);
  };

  const handleGuideFocus = () => {
    if (currentGuideType === 'repo') repoInputRef.current?.focus();
    else if (currentGuideType === 'pr') prInputRef.current?.focus();
    else if (currentGuideType === 'local') localInputRef.current?.focus();
  };

  // Submit GitHub Repo
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

  // Inspect PR files
  const handleInspectPR = async (e) => {
    e?.preventDefault();
    if (!prUrl.trim()) {
      setError('Please enter a GitHub Pull Request URL.');
      return;
    }
    setInspectingPR(true);
    setError(null);
    setInspectedPR(null);
    setPrFiles([]);
    try {
      const data = await inspectGitHubPR({
        prUrl: prUrl.trim(),
        token: prToken.trim() || undefined,
      });
      setInspectedPR(data.pr);
      setPrFiles(data.files || []);

      // Auto-populate comment form fields if inspected
      if (data.pr?.owner) setCommentOwner(data.pr.owner);
      if (data.pr?.repo) setCommentRepo(data.pr.repo);
      if (data.pr?.number) setCommentPRNumber(String(data.pr.number));
    } catch (err) {
      setError(err.message || 'Failed to inspect GitHub PR.');
    } finally {
      setInspectingPR(false);
    }
  };

  // Submit GitHub PR Analysis
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

  // Submit Local Workspace
  const handleLocalSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const changedFiles = localFiles.trim()
      ? localFiles.split(',').map((f) => f.trim()).filter(Boolean)
      : undefined;
    onOpenLocalWorkspace({
      repoPath: localPath.trim() || undefined,
      changedFiles,
    });
  };

  // Copy workflow YAML
  const handleCopyWorkflow = () => {
    navigator.clipboard.writeText(workflowYaml);
    setCopiedWorkflow(true);
    setTimeout(() => setCopiedWorkflow(false), 2000);
  };

  // Download workflow YAML
  const handleDownloadWorkflow = () => {
    const blob = new Blob([workflowYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'changelens.yml';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Post PR comment
  const handlePostPRComment = async (e) => {
    e.preventDefault();
    if (!commentOwner.trim() || !commentRepo.trim() || !commentPRNumber.trim()) {
      setCommentError('Please fill in repository owner, name, and pull request number.');
      return;
    }
    if (!commentToken.trim()) {
      setCommentError('A Personal Access Token with repo scope is required to post PR comments.');
      return;
    }

    setPostingComment(true);
    setCommentError(null);
    setCommentSuccess(null);
    try {
      const res = await postCommentToGitHubPR({
        owner: commentOwner.trim(),
        repo: commentRepo.trim(),
        pullNumber: Number(commentPRNumber.trim()),
        token: commentToken.trim(),
      });
      setCommentSuccess(`Review comment posted to PR #${res.comment?.pullNumber || commentPRNumber}!`);
    } catch (err) {
      setCommentError(err.message || 'Failed to post comment to GitHub PR.');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-slate-950 overflow-y-auto px-4 sm:px-6 lg:px-12 py-8 flex flex-col items-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col">
        {/* TOP BRAND EYEBROW - Left-aligned and sleek */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400 text-xs font-mono font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deterministic Blast Radius & AST Engine</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engine Ready • AST Parsers Active</span>
          </div>
        </div>

        {/* HERO BANNER: Split Layout with Engaging Title on Left & Visual DAG Architecture Graphic on Right */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8 bg-gradient-to-br from-slate-900/90 via-slate-900/40 to-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Left Column: Greeting & Mission */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-2 leading-tight">
              Hi, {displayName} <span className="inline-block animate-wave">👋</span>
            </h1>

            <p className="text-base sm:text-lg font-medium text-slate-200 mb-2">
              How would you like to connect your project to ChangeLens?
            </p>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed mb-6">
              Connect your GitHub repository to track commits as you push, analyze pull request diffs, or scan your local VS Code workspace offline. ChangeLens maps every AST dependency and identifies breaking changes before they hit production.
            </p>

            {/* Quick telemetry chips */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                Zero Heavy Clones
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                Cumulative Push Diff
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Broken Symbol Detection
              </span>
            </div>
          </div>

          {/* Right Column: Visual DAG Blast Radius Architecture Graphic */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full bg-slate-950/90 border border-cyan-900/40 rounded-2xl p-4 shadow-xl relative overflow-hidden font-mono text-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Live AST Blast Radius Preview
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  HIGH RISK (3 TIERS)
                </span>
              </div>

              {/* Visual Node Flow */}
              <div className="space-y-2">
                {/* Node 1: Root Change */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-rose-500/40 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    <div>
                      <div className="text-slate-100 font-bold">server/models/user.js</div>
                      <div className="text-[10px] text-rose-400">Modified: `findUserById` signature changed</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800">
                    +18 / -4 lines
                  </span>
                </div>

                {/* Connecting Arrow */}
                <div className="flex justify-center -my-1 text-slate-600">
                  <span className="text-xs">↓ calls export</span>
                </div>

                {/* Node 2: Direct Consumer */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <div>
                      <div className="text-slate-100 font-bold">server/controllers/userController.js</div>
                      <div className="text-[10px] text-amber-400">Impacted: `getUserProfile` caller</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                    Tier 1 Consumer
                  </span>
                </div>

                {/* Connecting Arrow */}
                <div className="flex justify-center -my-1 text-slate-600">
                  <span className="text-xs">↓ invokes route</span>
                </div>

                {/* Node 3: Endpoint */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <div>
                      <div className="text-slate-100 font-bold">server/routes/userRoutes.js</div>
                      <div className="text-[10px] text-cyan-400">Exposed API: `GET /api/v1/users/:id`</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                    Tier 2 Route
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>Deterministic Dependency Traversal</span>
                <span className="text-cyan-400 font-semibold">100% Symbol Accuracy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {effectiveError && (
          <div
            className={`w-full rounded-2xl p-4 text-xs mb-6 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-xl gap-3 transition-all ${
              isRateLimitError
                ? 'bg-amber-950/90 border border-amber-500/60 text-amber-200'
                : 'bg-rose-950/90 border border-rose-500/50 text-rose-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  isRateLimitError ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {isRateLimitError ? <KeyRound className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span>{isRateLimitError ? 'GitHub API Rate Limit Exceeded' : 'Analysis Request Error'}</span>
                  {isRateLimitError && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      60 req/hr unauthenticated limit hit
                    </span>
                  )}
                </div>
                <p className="mt-1 text-slate-300 leading-relaxed text-[11px]">
                  {isRateLimitError
                    ? "GitHub restricts anonymous API requests to 60 per hour per IP. Providing a free GitHub Personal Access Token (PAT) unlocks 5,000 requests/hr and instantly resolves this error."
                    : effectiveError}
                </p>
                {isRateLimitError && (
                  <div className="mt-2 text-[10px] text-amber-300/80 font-mono flex items-center gap-1.5 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Permanent fix: Add <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-amber-500/30">GITHUB_TOKEN=your_token</code> in your project's <code className="text-white bg-slate-900 px-1 py-0.5 rounded">.env</code> file.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {isRateLimitError && (
                <>
                  <button
                    type="button"
                    onClick={focusTokenField}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Token Below</span>
                  </button>

                  <a
                    href="https://github.com/settings/tokens/new?description=ChangeLens&scopes=repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <span>Generate Free Token (30s)</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (onClearApiError) onClearApiError();
                }}
                className="text-slate-400 hover:text-white font-bold p-1 cursor-pointer ml-1"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* INTEGRATION MODE SELECTOR: Horizontal Segmented Tab Ribbon */}
        <div className="w-full bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 shadow-lg">
          {/* TAB 1: GitHub Repository */}
          <button
            type="button"
            onClick={() => setActiveMode('repo')}
            className={`p-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
              activeMode === 'repo'
                ? 'bg-gradient-to-r from-cyan-950/90 to-slate-900 border border-cyan-500/60 text-white shadow-md shadow-cyan-500/10'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activeMode === 'repo'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>GitHub Repository</span>
                {activeMode === 'repo' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">Continuous Push Tracker</div>
            </div>
          </button>

          {/* TAB 2: GitHub Pull Request */}
          <button
            type="button"
            onClick={() => setActiveMode('pr')}
            className={`p-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
              activeMode === 'pr'
                ? 'bg-gradient-to-r from-indigo-950/90 to-slate-900 border border-indigo-500/60 text-white shadow-md shadow-indigo-500/10'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activeMode === 'pr'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>GitHub Pull Request</span>
                {activeMode === 'pr' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">Diffs, CI/CD & Review Bot</div>
            </div>
          </button>

          {/* TAB 3: Local Workspace */}
          <button
            type="button"
            onClick={() => setActiveMode('local')}
            className={`p-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
              activeMode === 'local'
                ? 'bg-gradient-to-r from-amber-950/90 to-slate-900 border border-amber-500/60 text-white shadow-md shadow-amber-500/10'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activeMode === 'local'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Folder className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Local Workspace</span>
                {activeMode === 'local' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">CLI Bridge & VS Code</div>
            </div>
          </button>

          {/* TAB 4: Demo Playground */}
          <button
            type="button"
            onClick={() => setActiveMode('demo')}
            className={`p-3.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
              activeMode === 'demo'
                ? 'bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-500/60 text-white shadow-md shadow-emerald-500/10'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activeMode === 'demo'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                <span>Demo Playground</span>
                {activeMode === 'demo' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">1-Click MERN Sandbox</div>
            </div>
          </button>
        </div>

        {/* ACTIVE INTEGRATION WORKSPACE CONTAINER */}
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl relative">
          {/* ========================================================================= */}
          {/* MODE 1: GITHUB REPOSITORY (Continuous Push Sync)                          */}
          {/* ========================================================================= */}
          {activeMode === 'repo' && (
            <div className="animate-in fade-in duration-200">
              {/* Header and prominent Step-by-Step popup guide trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                      CONTINUOUS GIT PUSH TRACKER
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Connect GitHub Repository
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Connect your repository to track commits pushed from VS Code. ChangeLens performs cumulative blast radius comparisons across all commits pushed while you worked.
                  </p>
                </div>

                {/* THE EXPLICIT WALKTHROUGH BUTTON REQUESTED BY USER */}
                <button
                  type="button"
                  onClick={() => openGuide('repo')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 border border-cyan-800/60 hover:border-cyan-500 text-cyan-300 font-semibold text-xs transition-all shadow-sm shrink-0 cursor-pointer group"
                >
                  <BookOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span>Steps to Connect GitHub Repository</span>
                </button>
              </div>

              {/* Form Input Area */}
              <form onSubmit={handleGitHubRepoSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GitHub Repository URL or Shorthand
                  </label>
                  <div className="relative">
                    <input
                      ref={repoInputRef}
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo or owner/repo"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono shadow-inner transition-colors"
                    />
                  </div>
                </div>

                {/* Token Toggle */}
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRepoToken(!showRepoToken)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {showRepoToken
                        ? 'Hide Access Token'
                        : '+ Add Personal Access Token (Recommended — avoids 60 req/hr rate limit)'}
                    </span>
                  </button>
                  <a
                    href="https://github.com/settings/tokens/new?description=ChangeLens&scopes=repo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400/80 hover:text-cyan-300 text-[11px] flex items-center gap-1 hover:underline"
                  >
                    <span>Generate Free Token</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {showRepoToken && (
                  <div className="animate-in fade-in duration-150">
                    <input
                      ref={repoTokenRef}
                      type="password"
                      value={repoToken}
                      onChange={(e) => setRepoToken(e.target.value)}
                      placeholder="github_pat_... or ghp_..."
                      className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-mono shadow-inner transition-colors ${
                        isRateLimitError ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-800 focus:border-cyan-500'
                      }`}
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 flex-wrap gap-1">
                      <span>Only requires <code className="text-cyan-400 font-mono">repo</code> read scope. Increases rate limit from 60 to 5,000 req/hr.</span>
                      <span className="text-emerald-400 font-mono text-[10px]">100% Private & In-Memory</span>
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                  {REPO_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setGithubUrl(p.url)}
                      className="text-[11px] bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-mono border border-slate-700/60 transition-colors cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {/* Submit Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-600 via-indigo-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>Connect & Inspect Repository</span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Connects directly without downloading huge archives.
                  </span>
                </div>
              </form>

              {/* 3 Pillar Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-800/80 text-left">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 text-cyan-400 flex items-center justify-center mb-2.5 border border-cyan-800/50">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">
                    Cumulative Push Diff
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Even if you pushed 5 times before checking ChangeLens, our engine calculates the cumulative blast radius across all new commits.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-400 flex items-center justify-center mb-2.5 border border-indigo-800/50">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">
                    Broken Symbol Auditing
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Instantly flags function signature mismatches, deleted exports, and broken call sites across all your files.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center mb-2.5 border border-emerald-800/50">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 mb-1">
                    Zero Heavy Downloads
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Operates securely via GitHub REST APIs. No cloning multi-gigabyte repositories to your local disk.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: GITHUB PULL REQUEST (Full Suite: Analyze, CI Actions & PR Bot)     */}
          {/* ========================================================================= */}
          {activeMode === 'pr' && (
            <div className="animate-in fade-in duration-200">
              {/* Header and PR sub-tab navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold border border-indigo-500/20">
                      PULL REQUEST INTELLIGENCE SUITE
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    GitHub Pull Request Review & CI/CD
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Inspect PR diffs, compute blast radius trees, configure automated GitHub Actions CI, or post markdown review comments directly to GitHub.
                  </p>
                </div>

                {/* Guide button changes with sub-tab */}
                <button
                  type="button"
                  onClick={() => {
                    if (prSubTab === 'analyze') openGuide('pr');
                    else if (prSubTab === 'ci') openGuide('ci');
                    else openGuide('comment');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-800/60 hover:border-indigo-500 text-indigo-300 font-semibold text-xs transition-all shadow-sm shrink-0 cursor-pointer group"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>
                    {prSubTab === 'analyze' && 'Steps to Analyze a Pull Request'}
                    {prSubTab === 'ci' && 'GitHub Actions Setup Guide'}
                    {prSubTab === 'comment' && 'How to Post PR Reports'}
                  </span>
                </button>
              </div>

              {/* Sub-tab Ribbon */}
              <div className="flex items-center gap-2 mt-6 p-1 bg-slate-950/80 rounded-xl border border-slate-800 w-fit">
                <button
                  type="button"
                  onClick={() => setPrSubTab('analyze')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    prSubTab === 'analyze'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>1. Analyze GitHub PR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrSubTab('ci')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    prSubTab === 'ci'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Workflow className="w-3.5 h-3.5" />
                  <span>2. GitHub Actions CI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrSubTab('comment')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    prSubTab === 'comment'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>3. Post Report to PR</span>
                </button>
              </div>

              {/* SUB-TAB 1: ANALYZE PR */}
              {prSubTab === 'analyze' && (
                <div className="mt-6 space-y-4 animate-in fade-in duration-150">
                  <form onSubmit={handleGitHubPRSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        GitHub Pull Request URL
                      </label>
                      <input
                        ref={prInputRef}
                        type="text"
                        value={prUrl}
                        onChange={(e) => setPrUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo/pull/123"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono shadow-inner transition-colors"
                      />
                    </div>

                    {/* Token Toggle */}
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPrToken(!showPrToken)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>
                          {showPrToken
                            ? 'Hide Token'
                            : '+ Personal Access Token (Recommended — avoids 60 req/hr rate limit)'}
                        </span>
                      </button>
                      <a
                        href="https://github.com/settings/tokens/new?description=ChangeLens&scopes=repo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400/80 hover:text-indigo-300 text-[11px] flex items-center gap-1 hover:underline"
                      >
                        <span>Generate Free Token</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {showPrToken && (
                      <div className="animate-in fade-in duration-150">
                        <input
                          ref={prTokenRef}
                          type="password"
                          value={prToken}
                          onChange={(e) => setPrToken(e.target.value)}
                          placeholder="github_pat_... or ghp_..."
                          className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none font-mono shadow-inner transition-colors ${
                            isRateLimitError ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-800 focus:border-indigo-500'
                          }`}
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 flex-wrap gap-1">
                          <span>Unlocks private repos and increases GitHub API limit to 5,000 req/hr.</span>
                          <span className="text-indigo-400 font-mono text-[10px]">Required to post PR review comments</span>
                        </div>
                      </div>
                    )}

                    {/* Sample PR Presets */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Sample PRs:</span>
                      {PR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setPrUrl(p.url)}
                          className="text-[11px] bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-mono border border-slate-700/60 transition-colors cursor-pointer"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <button
                        type="button"
                        onClick={handleInspectPR}
                        disabled={inspectingPR || loading}
                        className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {inspectingPR ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <Search className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>{inspectingPR ? 'Inspecting Files...' : 'Inspect PR Files'}</span>
                      </button>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        <GitPullRequest className="w-4 h-4 text-indigo-200" />
                        <span>Analyze PR Blast Radius Impact</span>
                      </button>
                    </div>
                  </form>

                  {/* Inspected PR Preview Card */}
                  {inspectedPR && (
                    <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/40 text-xs animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                          {inspectedPR.author?.avatarUrl && (
                            <img
                              src={inspectedPR.author.avatarUrl}
                              alt={inspectedPR.author.login}
                              className="w-6 h-6 rounded-full border border-slate-700"
                            />
                          )}
                          <div>
                            <span className="font-bold text-slate-100">{inspectedPR.title}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">
                              #{inspectedPR.number} by @{inspectedPR.author?.login}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-400">+{inspectedPR.additions}</span>
                          <span className="text-rose-400">-{inspectedPR.deletions}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {inspectedPR.changedFilesCount} files
                          </span>
                        </div>
                      </div>

                      {/* Changed files list */}
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-slate-400 mb-2">
                          Modified Files in Pull Request ({prFiles.length}):
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1">
                          {prFiles.map((file) => (
                            <div
                              key={file.filename}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-850"
                            >
                              <span className="text-slate-300 truncate max-w-md">{file.filename}</span>
                              <div className="flex items-center gap-2 shrink-0 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-semibold ${
                                    file.status === 'modified'
                                      ? 'text-amber-400 bg-amber-500/10'
                                      : file.status === 'added'
                                      ? 'text-emerald-400 bg-emerald-500/10'
                                      : 'text-rose-400 bg-rose-500/10'
                                  }`}
                                >
                                  {file.status}
                                </span>
                                <span className="text-emerald-400">+{file.additions}</span>
                                <span className="text-rose-400">-{file.deletions}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-TAB 2: GITHUB ACTIONS CI */}
              {prSubTab === 'ci' && (
                <div className="mt-6 space-y-4 animate-in fade-in duration-150">
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">
                          Automated Pull Request CI Workflow
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Runs ChangeLens blast radius verification on every open PR and posts comments automatically.
                        </p>
                      </div>

                      {/* Policy Toggles */}
                      <div className="flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={failOnCritical}
                            onChange={(e) => setFailOnCritical(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Fail on Critical Risk</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={failOnHigh}
                            onChange={(e) => setFailOnHigh(e.target.checked)}
                            className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Fail on High Risk</span>
                        </label>
                      </div>
                    </div>

                    {/* Syntax block */}
                    <div className="relative">
                      <pre className="w-full max-h-60 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-cyan-300/90 leading-relaxed">
                        {workflowYaml || '# Generating workflow...'}
                      </pre>
                      <div className="absolute top-2 right-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyWorkflow}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedWorkflow ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy YAML</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadWorkflow}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>
                        Save this file in your repository at{' '}
                        <code className="text-indigo-300 font-mono">.github/workflows/changelens.yml</code>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: POST REPORT TO PR */}
              {prSubTab === 'comment' && (
                <div className="mt-6 space-y-4 animate-in fade-in duration-150">
                  <form onSubmit={handlePostPRComment} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Repo Owner
                        </label>
                        <input
                          type="text"
                          value={commentOwner}
                          onChange={(e) => setCommentOwner(e.target.value)}
                          placeholder="e.g. facebook"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Repo Name
                        </label>
                        <input
                          type="text"
                          value={commentRepo}
                          onChange={(e) => setCommentRepo(e.target.value)}
                          placeholder="e.g. react"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          PR Number
                        </label>
                        <input
                          type="text"
                          value={commentPRNumber}
                          onChange={(e) => setCommentPRNumber(e.target.value)}
                          placeholder="e.g. 28000"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        GitHub Personal Access Token (requires repo write permission)
                      </label>
                      <input
                        type="password"
                        value={commentToken}
                        onChange={(e) => setCommentToken(e.target.value)}
                        placeholder="github_pat_..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Preview box */}
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Markdown Bot Report Preview:
                      </span>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                        <div className="font-bold text-indigo-400">### 🔍 ChangeLens Blast Radius Report</div>
                        <div className="text-rose-400">&gt; **Risk Level: HIGH** (Impacts 4 downstream consumers)</div>
                        <div className="text-slate-400">| File | Change | Blast Radius Tier |</div>
                        <div className="text-slate-500">| `server/models/user.js` | modified | Root Node |</div>
                        <div className="text-slate-500">| `server/controllers/userController.js` | consumer | Tier 1 |</div>
                      </div>
                    </div>

                    {/* Comment Alerts */}
                    {commentSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{commentSuccess}</span>
                      </div>
                    )}

                    {commentError && (
                      <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{commentError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={postingComment}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {postingComment ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{postingComment ? 'Posting to GitHub...' : 'Post / Update Comment on GitHub'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 3: LOCAL WORKSPACE (CLI Tunnel Bridge & VS Code)                     */}
          {/* ========================================================================= */}
          {activeMode === 'local' && (
            <LocalWorkshopSection
              onComplete={(scanResult) => {
                onOpenLocalWorkspace({ scanResult });
              }}
              onFocusGuide={() => openGuide('local')}
            />
          )}

          {/* ========================================================================= */}
          {/* MODE 4: DEMO PLAYGROUND (1-Click Instant MERN Sandbox)                     */}
          {/* ========================================================================= */}
          {activeMode === 'demo' && (
            <div className="animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      ZERO-SETUP PLAYGROUND
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Interactive MERN Stack Sandbox
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Explore ChangeLens immediately with our built-in 28-module full-stack application fixture. Experience "What-If" simulations, reverse dependency trees, and risk scores.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onLaunchDemo}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Launch Demo Playground (1-Click)</span>
                </button>
              </div>

              {/* Interactive Architecture Breakdown */}
              <div className="mt-6">
                <span className="block text-xs font-semibold text-slate-300 mb-3">
                  Included Architectural Components:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-rose-300">Models</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono">
                        Root Target
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mb-1">server/models/user.js</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Mongoose schema defining authentication credentials, roles, and timestamps.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-300">Controllers</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                        Tier 1
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mb-1">server/controllers/userController.js</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Express handler functions resolving user queries and verifying JWT sessions.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-cyan-300">Routes</span>
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
                        Tier 2
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mb-1">server/routes/userRoutes.js</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      REST endpoints mapped to authentication middleware and controller handlers.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-300">Frontend Client</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                        Client
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mb-1">client/styles/user.css</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Client-side UI styling and responsive layouts referencing user components.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RECENT CONNECTED PROJECTS SECTION */}
        {recentAnalyses.length > 0 && (
          <div className="w-full text-left mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recent Analyses & Connected Repositories</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Click any previous project to reopen its visual graph
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {recentAnalyses.slice(0, 6).map((item) => (
                <button
                  key={item.analysisId}
                  type="button"
                  onClick={() => onLoadSavedAnalysis && onLoadSavedAnalysis(item.analysisId)}
                  className="p-3.5 bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl text-left transition-all group flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-cyan-500/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                      {item.title || item.analysisId}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        item.summary?.riskLevel === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.summary?.riskLevel === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {item.summary?.riskLevel || 'COMPLETED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate max-w-[200px]">
                      {item.changedFiles?.length > 0 ? item.changedFiles[0] : item.targetDir || 'Repository'}
                    </span>
                    <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform font-sans font-semibold text-[10px]">
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

      {/* FULL-SCREEN BLURRED WALKTHROUGH POPUP MODAL */}
      <ConnectionGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        guideType={currentGuideType}
        onFocusInput={handleGuideFocus}
      />
    </div>
  );
}
