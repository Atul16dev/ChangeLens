import React, { useState } from 'react';
import {
  FolderGit2,
  FileSearch,
  Cpu,
  GitFork,
  Radiation,
  CheckCircle,
  Terminal,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal.jsx';

const STEPS = [
  {
    step: '01',
    icon: FolderGit2,
    title: 'Select Repository or Branch',
    description:
      'Point ChangeLens to your codebase or let the engine auto-detect current working tree changes, commit diffs, or staged modifications.',
    detail: 'git diff --name-status main...feature',
  },
  {
    step: '02',
    icon: FileSearch,
    title: 'Detect Changed Files & Symbols',
    description:
      'The engine maps diff line ranges to specific AST function, class, and export declarations to pinpoint exact modified symbols.',
    detail: 'AST Symbol Boundaries: export function authenticateUser()',
  },
  {
    step: '03',
    icon: Cpu,
    title: 'Multi-Language AST Parsing',
    description:
      'Offline Tree-Sitter WASM parsers process source files in parallel, extracting static and dynamic module specifiers across JS, TS, Python, and Go.',
    detail: 'Tree-Sitter WASM: JS, TS, Python, Go Grammars',
  },
  {
    step: '04',
    icon: GitFork,
    title: 'Trace Dependency Directed Graph',
    description:
      'Resolves relative specifiers, bare packages, and local imports into a deterministic Directed Acyclic Graph (DAG) with edge semantics.',
    detail: 'Resolved: 42 files, 89 import edges, 0 cycles',
  },
  {
    step: '05',
    icon: Radiation,
    title: 'Calculate Downstream Blast Radius',
    description:
      'A reverse breadth-first search (BFS) propagates downstream from each changed root, identifying all direct and transitive affected consumers.',
    detail: 'Reverse BFS Traversal: Depth 0 -> 1 -> 2 -> 3',
  },
  {
    step: '06',
    icon: CheckCircle,
    title: 'Review Insights & Suggested Checks',
    description:
      'Inspect the interactive visual graph, review automated Gemini risk summaries, run targeted test suites, and merge with total confidence.',
    detail: 'Targeted Test Run: npm test tests/auth.test.js',
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-14 sm:py-20 md:py-32 relative bg-slate-950/80 border-t border-slate-900 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-950/20 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <ScrollReveal animation="fade-up" duration={750} className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <GitFork className="w-3.5 h-3.5" />
            Execution Pipeline
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            How ChangeLens Analyzes Impact.
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
            A 6-step deterministic pipeline that turns raw git diffs into actionable architectural blast radius intelligence.
          </p>
        </ScrollReveal>

        {/* ================= DESKTOP & TABLET VIEW: 6-Card Interactive Grid (md: and above) ================= */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((stepItem, idx) => {
            const Icon = stepItem.icon;
            const isSelected = activeStep === idx;
            return (
              <ScrollReveal
                key={stepItem.step}
                animation="fade-up"
                delay={idx * 80}
                duration={650}
                className={`p-6 sm:p-7 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-xl shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
                onClick={() => setActiveStep(idx)}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black font-mono tracking-wider text-slate-600 group-hover:text-cyan-400 transition-colors">
                      {stepItem.step}
                    </span>
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 scale-105'
                          : 'bg-slate-800/60 text-slate-400 border border-slate-700/60 group-hover:scale-105'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 mb-2.5">
                    {stepItem.title}
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    {stepItem.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2 font-mono text-[11px] text-cyan-400/90 truncate">
                  <Terminal className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{stepItem.detail}</span>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* ================= MOBILE ADAPTIVE VIEW (< md screens): Sleek Compact Connected Stepper ================= */}
        <div className="md:hidden">
          <ScrollReveal animation="fade-up" duration={600} className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="space-y-4">
              {STEPS.map((stepItem, idx) => {
                const Icon = stepItem.icon;
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={stepItem.step} className="flex gap-3 relative">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className="absolute top-7 left-3.5 bottom-0 w-px bg-slate-800" />
                    )}

                    {/* Step indicator node */}
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-mono text-xs font-bold z-10">
                      {stepItem.step}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-100">
                          {stepItem.title}
                        </h4>
                        <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {stepItem.description}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-cyan-400/90 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800/80 w-fit">
                        <Terminal className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[240px]">{stepItem.detail}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
