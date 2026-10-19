import React, { useState } from 'react';
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
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  FileCheck,
  Check,
  BookmarkCheck,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal.jsx';

export function FeaturesGrid() {
  const [activeAstTab, setActiveAstTab] = useState('js');

  return (
    <section id="features" className="py-20 md:py-32 relative bg-slate-950 overflow-hidden">
      {/* Background subtle radial glow with continuous breathing animation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-indigo-600/10 blur-[160px] pointer-events-none rounded-full animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header with Scroll Reveal */}
        <ScrollReveal animation="fade-up" duration={750} className="text-center max-w-3xl mx-auto space-y-4 mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Complete Code Impact Intelligence.
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            From low-level WebAssembly AST token extraction to interactive dependency graph rendering and automated AI PR risk scoring.
          </p>
        </ScrollReveal>

        {/* 12-Column Asymmetric Bento Grid: 10 Items, 100% Geometry, Zero Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* ================= ROW 1 (12 COLS: 7 + 5) ================= */}

          {/* Feature 1: Multi-Language WASM AST (Hero Card: lg:col-span-7, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={50}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-7 p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-indigo-950/30 border border-indigo-500/30 hover:border-indigo-500/50 shadow-xl shadow-indigo-950/20 transition-all duration-300 relative group flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      WASM Grammars
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1">
                      Multi-Language AST Parsing
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveAstTab('js')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeAstTab === 'js'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TS / JS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAstTab('py')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeAstTab === 'py'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAstTab('go')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeAstTab === 'go'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Go
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Deterministic Tree-Sitter WebAssembly parsers extract concrete syntax trees in-memory with zero cloud network overhead and sub-millisecond tokenization.
              </p>
            </div>

            {/* Visual Micro-Terminal: Parsed AST Node Representation */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs">
                {activeAstTab === 'js' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/60 pb-1.5">
                      <span>Parser: tree-sitter-typescript.wasm</span>
                      <span className="text-emerald-400">✓ 1,280 tokens extracted (0.8ms)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-slate-400">
                      <span className="text-purple-400">export function</span>{' '}
                      <span className="text-cyan-300">verifySession</span>(token: <span className="text-amber-300">string</span>)
                    </div>
                    <div className="text-[11px] text-indigo-400">
                      ↳ AST: <span className="text-slate-300">FunctionDeclaration</span> → Ident: <span className="text-emerald-300">verifySession</span>
                    </div>
                  </div>
                )}

                {activeAstTab === 'py' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/60 pb-1.5">
                      <span>Parser: tree-sitter-python.wasm</span>
                      <span className="text-emerald-400">✓ 940 tokens extracted (0.6ms)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-slate-400">
                      <span className="text-purple-400">def</span>{' '}
                      <span className="text-cyan-300">execute_query</span>(pool, sql_statement)
                    </div>
                    <div className="text-[11px] text-indigo-400">
                      ↳ AST: <span className="text-slate-300">function_definition</span> → Symbols: <span className="text-emerald-300">execute_query</span>
                    </div>
                  </div>
                )}

                {activeAstTab === 'go' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800/60 pb-1.5">
                      <span>Parser: tree-sitter-go.wasm</span>
                      <span className="text-emerald-400">✓ 810 tokens extracted (0.5ms)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-slate-400">
                      <span className="text-purple-400">func</span>{' '}
                      <span className="text-cyan-300">AcquireConnection</span>() (*sql.DB, error)
                    </div>
                    <div className="text-[11px] text-indigo-400">
                      ↳ AST: <span className="text-slate-300">function_declaration</span> → Exported: <span className="text-emerald-300">AcquireConnection</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 2: Symbol-Level Granularity (lg:col-span-5, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={150}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-5 p-7 sm:p-8 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Binary className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-blue-400 border border-blue-500/20">
                  Symbol Precision
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Symbol-Level Dependency Analysis
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Replaces coarse file-level guessing by mapping exact function, class, and variable declarations to their downstream call sites.
              </p>
            </div>

            {/* Visual Micro-Card: Symbol Isolation */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-slate-300">deleteUser()</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-semibold">Modified (3 Callers)</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                    <span>findUserById()</span>
                  </div>
                  <span className="text-[10px] text-emerald-400">Zero Impact Ignored</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* ================= ROW 2 (12 COLS: 4 + 4 + 4) ================= */}

          {/* Feature 3: Interactive Graph (lg:col-span-4, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={80}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-4 p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-emerald-400 border border-emerald-500/20">
                  ELK.js Canvas
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Interactive Dependency Graph
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Layered React Flow canvas with crossing minimization, dynamic zoom/pan, depth filtering, and animated impact path highlights.
              </p>
            </div>

            {/* Visual Micro-Card: DAG Mini Flow */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between gap-1.5 font-mono text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">Origin</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">Depth 1</span>
                <span className="text-slate-600">→</span>
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50">Depth 2</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 4: Deterministic Blast Radius (lg:col-span-4, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={180}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-4 p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Radiation className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 border border-amber-500/20">
                  Reverse BFS
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Deterministic Blast Radius
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Reverse breadth-first traversal traces ripple effects through infinite transitive hops, calculating accurate risk scores.
              </p>
            </div>

            {/* Visual Micro-Card: Severity Meter */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-400">Blast Radius Index</span>
                <span className="text-amber-400 font-bold">78 / 100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 rounded-full w-[78%]" />
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 5: Broken Symbol Detection (lg:col-span-4, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={280}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-4 p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-rose-400 border border-rose-500/20">
                  Breaking Guard
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Broken Symbol Detection
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Instantly detects missing export names, altered signatures, and broken imports before faulty PRs merge to main.
              </p>
            </div>

            {/* Visual Micro-Card: Broken Symbol Tag */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 font-mono text-[11px] text-rose-300 flex items-center justify-between">
                <span>⚠️ Missing: hashPassword()</span>
                <span className="text-[10px] bg-rose-900/60 px-1.5 py-0.5 rounded">CRITICAL</span>
              </div>
            </div>
          </ScrollReveal>

          {/* ================= ROW 3 (12 COLS: 4 + 4 + 4) ================= */}

          {/* Feature 6: What-If Simulator (lg:col-span-4, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={100}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-4 p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-purple-400 border border-purple-500/20">
                  Sandbox
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                What-If Blast Radius Simulator
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Simulate touching any file or symbol directly from the visual canvas to inspect downstream ripples without altering code.
              </p>
            </div>

            {/* Visual Micro-Card: What-If Simulation */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/50 font-mono text-[11px] text-purple-300 flex items-center justify-between">
                <span>Simulate: routes/user.js</span>
                <span className="text-cyan-400 font-semibold">-4 files ripple</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 7: Git Diff Analysis (lg:col-span-4, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={200}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-4 p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <GitCompare className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-cyan-400 border border-cyan-500/20">
                  Git Native
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Git Diff & Working Tree Scanner
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Automatically scans staged index changes, working tree diffs, or commit ranges to pinpoint modified line boundaries.
              </p>
            </div>

            {/* Visual Micro-Card: Git Status Pill */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span>git diff --cached</span>
                <span className="text-cyan-400 font-semibold">3 Staged Files</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 8: CI/CD Runner (lg:col-span-4, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={300}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-4 p-7 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/80 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                  <Terminal className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-teal-400 border border-teal-500/20">
                  GitHub Actions
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                CI/CD Automation Runner
              </h3>

              <p className="text-sm text-slate-400 leading-relaxed">
                Headless CLI runner (<code className="text-slate-300 font-mono">changelens-ci</code>) integrates into CI/CD pipelines to block merges exceeding your risk threshold.
              </p>
            </div>

            {/* Visual Micro-Card: CLI Command */}
            <div className="mt-6 pt-4 border-t border-slate-800/60">
              <div className="font-mono text-[11px] text-teal-300 bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>$ npx changelens-ci --check</span>
                <span className="text-emerald-400">Exit: 0</span>
              </div>
            </div>
          </ScrollReveal>

          {/* ================= ROW 4 (12 COLS: 6 + 6) ================= */}

          {/* Feature 9: AI PR Explanations (lg:col-span-6, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={120}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-6 p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/20 border border-purple-500/30 hover:border-purple-500/50 shadow-xl shadow-purple-950/20 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Gemini 2.5 Flash
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      AI-Powered PR Review Explanations
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-800/60 hidden sm:inline-block">
                  Automated Markdown
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Automated generative AI analyzes the computed blast radius, synthesizing human-readable risk summaries, suggested unit tests, and security checklist reviews.
              </p>
            </div>

            {/* Visual Micro-Card: Gemini AI Markdown Preview */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-xs space-y-1 text-slate-300">
                <div className="text-[11px] text-purple-400 flex items-center justify-between border-b border-slate-800/60 pb-1">
                  <span>Gemini Risk Assessment</span>
                  <span className="text-emerald-400">Confidence: 94%</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  "Target <code className="text-slate-200">models/user.js</code> impacts authentication flows. Run <code className="text-cyan-300">npm test tests/auth.test.js</code> before merging."
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 10: Cloud History & 30-Day TTL (lg:col-span-6, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={240}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-6 p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/50 shadow-xl shadow-emerald-950/20 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      MongoDB Atlas Cloud
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Persistent Analysis History & Audit Trail
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-violet-300 bg-violet-950/80 px-2.5 py-0.5 rounded-full border border-violet-800/60 flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3 text-violet-400" />
                    30d TTL & Pin
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Every analysis run is securely stored to the cloud. Unpinned reports auto-delete after 30 days to keep your workspace lean, while pinned reports remain permanent.
              </p>
            </div>

            {/* Visual Micro-Card: History Snapshot */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 truncate">mern-sample (user.js)</span>
                  <span className="text-emerald-400 font-bold shrink-0">📌 Saved</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 truncate">python-store (pool.py)</span>
                  <span className="text-cyan-400 font-bold shrink-0">⏳ 28d left</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

