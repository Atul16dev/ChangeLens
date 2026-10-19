import React from 'react';
import {
  GitCompare,
  Code2,
  Binary,
  Share2,
  Radiation,
  Sparkles,
  AlertTriangle,
  Zap,
  Terminal,
  Database,
  CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: GitCompare,
    badge: 'Git Native',
    title: 'Git Diff & Working Tree Analysis',
    description:
      'Automatically analyzes staged changes, uncommitted working tree modifications, or git branch comparisons against main to isolate the exact modified surface.',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  {
    icon: Code2,
    badge: 'WASM AST Grammars',
    title: 'Multi-Language AST Parsing',
    description:
      'Deterministic Tree-Sitter WebAssembly parsers extract syntax trees across JavaScript, TypeScript, Python, and Go entirely offline with zero external network overhead.',
    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
  {
    icon: Binary,
    badge: 'Granular Precision',
    title: 'Symbol-Level Dependency Analysis',
    description:
      'Goes deeper than coarse file-level imports. Maps individual exported functions, classes, types, and variables to their downstream consumers.',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  },
  {
    icon: Share2,
    badge: 'ELK.js Layered',
    title: 'Interactive Dependency Graph',
    description:
      'Visualize downstream blast radius on a clean, layered React Flow canvas with deterministic crossing minimization, depth levels, and animated impact paths.',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    icon: Radiation,
    badge: 'Reverse BFS Engine',
    title: 'Deterministic Blast Radius Analysis',
    description:
      'Reverse breadth-first traversal traces ripple effects through infinite hops of transitive dependents, computing accurate risk scores and depth metrics.',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  {
    icon: Sparkles,
    badge: 'Gemini Integration',
    title: 'AI-Powered Code Explanations',
    description:
      'Automated Gemini intelligence analyzes the blast radius and generates comprehensive PR review summaries, risk assessments, and targeted testing recommendations.',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  {
    icon: AlertTriangle,
    badge: 'Zero Regressions',
    title: 'Broken Symbol Detection',
    description:
      'Instantly flags missing exported names, altered function signatures, and broken imports before code can merge into production.',
    color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
  {
    icon: Zap,
    badge: 'Interactive Testing',
    title: 'What-If Blast Radius Simulator',
    description:
      'Simulate modifications to any file or symbol in real time directly from the visual graph to preview downstream impact before making changes.',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  },
  {
    icon: Terminal,
    badge: 'GitHub Actions',
    title: 'CI/CD Automation Runner',
    description:
      'Headless CLI runner (changelens-ci) integrates seamlessly into pull request pipelines to comment blast radius findings and block high-risk merges.',
    color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
  },
  {
    icon: Database,
    badge: 'MongoDB Atlas',
    title: 'Cloud Analysis History & Persistence',
    description:
      'Every analysis run is saved to MongoDB Atlas. Search, filter by repo, review past metrics, and reload complete graphs back into the workspace in one click.',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-32 relative bg-slate-950">
      {/* Background subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Complete Code Impact Intelligence.
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            From low-level AST token extraction to interactive graph visualization and automated AI PR risk scoring.
          </p>
        </div>

        {/* Features 10-Item Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between ${
                  idx === 9 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${feature.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 mb-2.5 group-hover:text-cyan-300 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Fully Operational Engine</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
