import React from 'react';
import {
  AlertOctagon,
  Network,
  GitPullRequest,
  CheckSquare,
  Clock,
  Flame,
  Search,
  FileQuestion,
} from 'lucide-react';

const PROBLEMS = [
  {
    icon: Flame,
    color: 'from-rose-500/20 to-orange-500/20 text-rose-400 border-rose-500/30',
    title: 'Unexpected Dependency Breakages',
    description:
      'Modifying a utility function or data model triggers silent runtime exceptions in downstream endpoints 4 hops away that no single developer had mapped in their head.',
  },
  {
    icon: Network,
    color: 'from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30',
    title: 'Hidden Relationships Between Files',
    description:
      'Dynamic imports, re-exports, and cross-module bindings escape standard grep searches, leaving developers unaware of consumers across package and folder boundaries.',
  },
  {
    icon: GitPullRequest,
    color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
    title: 'Unclear Impact of Code Changes',
    description:
      'Standard PR diffs only show the modified lines of code. They provide zero intelligence about which external modules, controllers, or clients actually depend on those lines.',
  },
  {
    icon: CheckSquare,
    color: 'from-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
    title: 'Missing Test Coverage & Guesswork',
    description:
      'Engineers guess which test suites need execution or run the entire monorepo suite for hours. Critical integration paths remain untested before reaching production.',
  },
  {
    icon: Clock,
    color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    title: 'Exhausting Code Reviews',
    description:
      'Reviewers spend hours manually tracing call hierarchies and verifying imports, causing review fatigue, bottlenecking release velocity, and letting regressions slip through.',
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="py-20 md:py-28 relative bg-slate-950/60 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            The Problem
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            The Hidden Chaos of Changing Mature Code.
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            Every codebase grows into an interconnected web. Without deterministic dependency tracing, even small commits risk catastrophic production regressions.
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROBLEMS.map((prob, index) => {
            const Icon = prob.icon;
            return (
              <div
                key={prob.title}
                className={`p-6 sm:p-7 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-300 relative group overflow-hidden ${
                  index === 4 ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800/20 rounded-full blur-2xl group-hover:bg-cyan-500/5 transition-colors pointer-events-none" />

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${prob.color} border flex items-center justify-center mb-5`}>
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-slate-100 mb-2.5">
                  {prob.title}
                </h3>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {prob.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
