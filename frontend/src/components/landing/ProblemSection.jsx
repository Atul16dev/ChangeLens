import React from 'react';
import {
  AlertOctagon,
  Network,
  GitPullRequest,
  CheckSquare,
  Clock,
  Flame,
  ArrowRight,
  ShieldAlert,
  Search,
  FileCode,
  Zap,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal.jsx';

export function ProblemSection() {
  return (
    <section id="problem" className="py-20 md:py-28 relative bg-slate-950/70 border-t border-slate-900 overflow-hidden">
      {/* Background ambient radial glow with continuous breathing animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-rose-950/15 blur-[150px] rounded-full pointer-events-none animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header with Scroll Reveal */}
        <ScrollReveal animation="fade-up" duration={750} className="text-center max-w-3xl mx-auto space-y-4 mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>The Reality of Code Modification</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            The Hidden Chaos of Changing Mature Code.
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            Every codebase evolves into an intricate, multi-layered graph. Without deterministic dependency intelligence, even innocent commits risk silent production catastrophes.
          </p>
        </ScrollReveal>

        {/* Asymmetric Bento Problem Grid: 5 Items, Zero Empty Slots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: ANCHOR HERO CARD (Spans 2 columns on lg and md for a balanced Bento Box) */}
          <ScrollReveal
            animation="fade-up"
            delay={50}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-2 p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-rose-950/20 border border-rose-500/30 hover:border-rose-500/50 shadow-xl shadow-rose-950/20 transition-all duration-300 relative group overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-rose-600/15 transition-colors" />

            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
                    <Flame className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      High Impact Risk
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      Unexpected Dependency Breakages
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-rose-400 bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-800/60">
                  4-Hop Silent Regressions
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                A localized update to a helper model or auth schema silently triggers fatal exceptions in distant payment webhooks four levels deep—relationships that no single engineer had mapped mentally.
              </p>
            </div>

            {/* Visual Micro-Diagram: The Broken Cascading Path */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
                <span>Cascading Dependency Blast Propagation:</span>
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Uncaught at compile-time
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-cyan-400 font-bold">1. TARGET</span>
                  <span className="text-slate-200 truncate mt-1">user.js</span>
                  <span className="text-[10px] text-slate-500 mt-1">Schema changed</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-indigo-400 font-bold">2. DIRECT</span>
                  <span className="text-slate-200 truncate mt-1">auth.service.js</span>
                  <span className="text-[10px] text-slate-500 mt-1">Imports user</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-amber-400 font-bold">3. TRANSITIVE</span>
                  <span className="text-slate-200 truncate mt-1">session_store.js</span>
                  <span className="text-[10px] text-slate-500 mt-1">Re-exports state</span>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 flex flex-col justify-between shadow-sm">
                  <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    4. OUTAGE
                  </span>
                  <span className="text-rose-200 truncate mt-1 font-bold">checkout.js</span>
                  <span className="text-[10px] text-rose-300 mt-1">Runtime Crash (500)</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Hidden Relationships (Square Bento Card) */}
          <ScrollReveal
            animation="fade-up"
            delay={150}
            duration={700}
            className="col-span-1 p-7 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/90 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Network className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-amber-500/20">
                  Dynamic Imports
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-2.5">
                Hidden Relationships Between Files
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Dynamic module specifiers, barrel re-exports, and cross-package bindings escape regular grep searches, leaving developers blind to true consumer footprints.
              </p>
            </div>

            {/* Visual Micro-Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-400 flex items-center justify-between">
                <span className="text-slate-500">grep "userModel"</span>
                <span className="text-rose-400">0 matches found</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 3: Unclear Impact of Changes (Square Bento Card) */}
          <ScrollReveal
            animation="fade-up"
            delay={250}
            duration={700}
            className="col-span-1 p-7 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/90 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <GitPullRequest className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-cyan-500/20">
                  Diff Blindspots
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-2.5">
                Unclear Impact of Code Changes
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Standard pull request diffs only reveal lines added or deleted. They offer zero semantic intelligence about which external routes and endpoints consume those symbols.
              </p>
            </div>

            {/* Visual Micro-Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Git Diff: +3 / -1 lines</span>
                <span className="text-cyan-400 font-semibold">14 Files Impacted</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 4: Missing Test Coverage (Square Bento Card) */}
          <ScrollReveal
            animation="fade-up"
            delay={350}
            duration={700}
            className="col-span-1 p-7 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/90 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-400 border border-indigo-500/20">
                  Targeted Tests
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-2.5">
                Missing Test Coverage & Guesswork
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Engineers either waste 40+ minutes running every test in the monorepo, or skip tests entirely, allowing regressions to reach production unnoticed.
              </p>
            </div>

            {/* Visual Micro-Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-400 flex items-center justify-between">
                <span className="text-slate-500">Monorepo: 45 mins</span>
                <span className="text-emerald-400 font-semibold">Targeted: 1.2s</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 5: Exhausting Code Reviews (Square Bento Card) */}
          <ScrollReveal
            animation="fade-up"
            delay={450}
            duration={700}
            className="col-span-1 p-7 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/90 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-500/20">
                  5x Velocity
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 mb-2.5">
                Exhausting & Slow Code Reviews
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Reviewers spend agonizing hours manually verifying call hierarchies, causing review bottlenecks, delayed merge cycles, and eventual fatigue errors.
              </p>
            </div>

            {/* Visual Micro-Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">Manual review latency</span>
                <span className="text-rose-400 font-semibold">+3.8 days delay</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
