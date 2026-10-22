import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  GitPullRequest,
  Terminal,
  ShieldCheck,
  Folder,
  Layers,
  Sparkles,
} from 'lucide-react';

export function ConnectionGuideModal({
  isOpen,
  onClose,
  guideType = 'repo', // 'repo' | 'pr' | 'ci' | 'comment' | 'local'
  onFocusInput,
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [copiedText, setCopiedText] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset step when guideType changes
  useEffect(() => {
    setActiveStep(0);
  }, [guideType, isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Content for each guide type
  const guides = {
    repo: {
      title: 'Steps to Connect GitHub Repository',
      subtitle: 'Complete step-by-step walkthrough to connect your repository and monitor code pushes in real time.',
      badge: 'Repository Connection Guide',
      steps: [
        {
          title: 'Open GitHub in Your Browser',
          instruction: 'Go to github.com and ensure you are logged in to the account that owns or has access to your repository.',
          example: 'https://github.com',
          isLink: true,
          tip: 'For private repositories, make sure your account has read permissions.',
        },
        {
          title: 'Navigate to Your Target Repository',
          instruction: 'Go to your profile or organization and click on the repository you want to analyze with ChangeLens.',
          example: 'github.com/your-username/your-project',
          tip: 'ChangeLens supports JavaScript, TypeScript, Python, and Go repositories.',
        },
        {
          title: 'Copy the Repository URL',
          instruction: 'Copy the repository URL directly from your browser address bar or from the green "<> Code" button.',
          example: 'https://github.com/owner/repository',
          tip: 'You can also use the shorthand format: owner/repository (e.g. facebook/react).',
        },
        {
          title: 'Paste the URL Into ChangeLens',
          instruction: 'Return to ChangeLens and paste your repository link into the "Repository URL" input field.',
          example: 'https://github.com/your-name/my-app',
          tip: 'If your repository is private, click "+ Personal Access Token" to supply a GitHub PAT with repo scope.',
        },
        {
          title: 'Click "Connect & Inspect Repository"',
          instruction: 'Click the primary button. ChangeLens will securely query the GitHub API to fetch branch info, recent commits, and repo architecture.',
          tip: 'No heavy repository cloning is performed; metadata and file diffs are fetched dynamically.',
        },
        {
          title: 'Review Blast Radius & Sync Pushes',
          instruction: 'Your repository is now connected! Use "Sync ALL Pushes" whenever you push from VS Code to calculate cumulative blast radius across all recent commits.',
          tip: 'Any breaking exports or affected consumers will be highlighted automatically on the visual graph.',
        },
      ],
      actionLabel: 'Got It — Connect My Repository',
    },
    pr: {
      title: 'How to Analyze a GitHub Pull Request',
      subtitle: 'Learn how to inspect code diffs and evaluate blast radiuses on active pull requests.',
      badge: 'Pull Request Review Guide',
      steps: [
        {
          title: 'Locate the Pull Request on GitHub',
          instruction: 'Open your repository on GitHub and click on the "Pull requests" tab.',
          tip: 'Select any open or draft pull request that contains code modifications.',
        },
        {
          title: 'Copy the Pull Request URL',
          instruction: 'Copy the full URL of the PR from your browser address bar.',
          example: 'https://github.com/owner/repo/pull/123',
          tip: 'ChangeLens also supports shorthand syntax like owner/repo#123.',
        },
        {
          title: 'Paste Into the PR URL Field',
          instruction: 'Paste the copied URL into the ChangeLens Pull Request input.',
          tip: 'Click "Inspect PR Files" to preview the author, branch, and list of modified files before running the full analysis.',
        },
        {
          title: 'Calculate Blast Radius Impact',
          instruction: 'Click "Analyze Pull Request Impact". ChangeLens will compute reverse AST dependency traversals and map every impacted consumer.',
          tip: 'You can simulate "What-If" scenarios on any node in the resulting interactive graph.',
        },
      ],
      actionLabel: 'Ready to Analyze PR',
    },
    ci: {
      title: 'GitHub Actions CI Setup Guide',
      subtitle: 'Automate blast radius checks on every pull request using ChangeLens CI.',
      badge: 'Continuous Integration Guide',
      steps: [
        {
          title: 'Generate the Workflow YAML',
          instruction: 'Configure your failure policy (e.g. fail on critical breaking changes) and copy the generated workflow configuration.',
          tip: 'The workflow uses standard ubuntu-latest runners and Node.js 22.',
        },
        {
          title: 'Create the Workflow File in Your Repo',
          instruction: 'In your repository root, create the directory and file: .github/workflows/changelens.yml',
          example: '.github/workflows/changelens.yml',
          tip: 'Commit and push this file to your default branch.',
        },
        {
          title: 'Verify GITHUB_TOKEN Permissions',
          instruction: 'The workflow requires "pull-requests: write" permission so it can automatically post blast radius review comments.',
          tip: 'This is included by default in the generated YAML configuration.',
        },
        {
          title: 'Enjoy 24/7 Automated Code Reviews',
          instruction: 'Whenever any developer opens a PR, ChangeLens CI will inspect the git diff, compute risk tiers, and post a markdown review comment.',
          tip: 'Merges with critical breaking changes will be blocked automatically if configured.',
        },
      ],
      actionLabel: 'Configure GitHub Actions',
    },
    comment: {
      title: 'How to Post Blast Radius Reports to PRs',
      subtitle: 'Post beautifully formatted, bot-driven review comments with risk badges directly on GitHub.',
      badge: 'PR Bot Commenting Guide',
      steps: [
        {
          title: 'Generate a GitHub Personal Access Token',
          instruction: 'Go to GitHub Settings > Developer settings > Personal access tokens and generate a token with "repo" scope.',
          tip: 'Fine-grained tokens with Pull Requests (Read & Write) are also supported.',
        },
        {
          title: 'Inspect the Target Pull Request',
          instruction: 'Ensure the target PR is inspected in ChangeLens so the owner, repo, and PR number are validated.',
          tip: 'ChangeLens requires an active analysis report ID to format the comment.',
        },
        {
          title: 'Click "Post / Update Comment on GitHub"',
          instruction: 'ChangeLens will compose GitHub-flavored Markdown including risk level, impacted files table, and suggested test commands.',
          tip: 'If a comment was previously posted, ChangeLens updates it in-place instead of creating duplicate spam.',
        },
      ],
      actionLabel: 'Got It — Return to Comments',
    },
    local: {
      title: 'Local Workspace Scan Guide',
      subtitle: 'Analyze uncommitted code changes in VS Code completely offline.',
      badge: 'Localhost & Offline Guide',
      steps: [
        {
          title: 'Find Your Project Folder Path',
          instruction: 'Open your terminal or file explorer and copy the full path to your local project root.',
          example: 'D:\\Newdxtop\\my-node-app or /Users/username/projects/app',
          tip: 'You can also leave the field blank if ChangeLens is running inside the project root.',
        },
        {
          title: 'Edit Code in VS Code',
          instruction: 'Make any code edits or modifications in your editor. You do not need to commit or push them.',
          tip: 'ChangeLens inspects local git working tree (git status --porcelain) directly from your hard drive.',
        },
        {
          title: 'Click "Open Local Workspace"',
          instruction: 'ChangeLens parses your source files using Tree-Sitter WASM parsers offline and renders your visual blast radius.',
          tip: 'Zero external network calls or credentials required.',
        },
      ],
      actionLabel: 'Open Local Workspace',
    },
  };

  const currentGuide = guides[guideType] || guides.repo;
  const currentStepData = currentGuide.steps[activeStep];
  const totalSteps = currentGuide.steps.length;

  const handleFinish = () => {
    onClose();
    if (onFocusInput) {
      setTimeout(() => onFocusInput(guideType), 100);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 shadow-inner">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                  {currentGuide.badge}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Step {activeStep + 1} of {totalSteps}
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                {currentGuide.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-950 h-1.5 flex">
          {currentGuide.steps.map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-full transition-all duration-300 ${
                idx <= activeStep
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Modal Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Step Detail Card */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-5 shadow-inner">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                {activeStep + 1}
              </div>

              <div className="space-y-2 flex-1">
                <h4 className="text-base font-bold text-white">
                  {currentStepData.title}
                </h4>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentStepData.instruction}
                </p>

                {/* Optional Example / Code Pill */}
                {currentStepData.example && (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 mt-3 shadow-inner">
                    <span className="truncate">{currentStepData.example}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentStepData.example)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] ml-2 shrink-0 cursor-pointer"
                      title="Copy example"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Helpful Tip */}
                {currentStepData.tip && (
                  <div className="flex items-start gap-2 bg-cyan-950/30 border border-cyan-800/30 rounded-lg p-2.5 text-[11px] text-cyan-300 mt-3">
                    <span className="font-semibold shrink-0">💡 Tip:</span>
                    <span>{currentStepData.tip}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick List Overview of all steps */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
              All Steps at a Glance
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentGuide.steps.map((step, idx) => {
                const isCurrent = idx === activeStep;
                const isPassed = idx < activeStep;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-950/70 border-cyan-500/60 text-white font-semibold shadow-sm'
                        : isPassed
                        ? 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
                        : 'bg-slate-950/20 border-slate-850 text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0 ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950'
                          : isPassed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            {activeStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.min(totalSteps - 1, prev + 1))}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>{currentGuide.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
