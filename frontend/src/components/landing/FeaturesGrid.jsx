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
  GitPullRequest,
  GitBranch,
  FolderGit2,
  Bot,
  Play,
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal.jsx';

export function FeaturesGrid() {
  const [activeAstTab, setActiveAstTab] = useState('js');

  return (
    <section id="features" className="py-14 sm:py-20 md:py-32 relative bg-[#0b0f19] overflow-hidden">
      {/* Background subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-indigo-600/10 blur-[160px] pointer-events-none rounded-full animate-pulse-glow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <ScrollReveal animation="fade-up" duration={750} className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Complete Code Impact Intelligence.
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
            From low-level WebAssembly AST token extraction to interactive dependency graph rendering, broken symbol detection, and an in-workspace AI copilot.
          </p>
        </ScrollReveal>

        {/* ================= DESKTOP & TABLET VIEW: Bento Grid (md: and above) ================= */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Feature 1: Multi-Language WASM AST (Hero Card: lg:col-span-7, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={80}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-7 p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-[#101726] via-[#101726] to-[#151f33] border border-slate-700/80 hover:border-indigo-500/50 shadow-xl shadow-indigo-950/20 transition-all duration-300 relative group flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-105 transition-transform">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      WASM Tree-Sitter
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1 tracking-tight">
                      Multi-Language AST Parsing Engine
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-[#0a0f1d] p-1 rounded-xl border border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setActiveAstTab('js')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeAstTab === 'js'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    TS / JS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAstTab('py')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeAstTab === 'py'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAstTab('go')}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeAstTab === 'go'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Go
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                Deterministic Tree-Sitter WebAssembly parsers extract concrete syntax trees in-memory with zero cloud network latency and sub-millisecond AST tokenization.
              </p>
            </div>

            {/* Visual Micro-Terminal */}
            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <div className="p-4 rounded-xl bg-[#0a0f1d] border border-slate-700/80 font-mono text-xs shadow-inner">
                {activeAstTab === 'js' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                      <span className="font-semibold text-slate-300">Parser: tree-sitter-typescript.wasm</span>
                      <span className="text-emerald-400 font-semibold">✓ 1,280 tokens extracted (0.8ms)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-slate-300">
                      <span className="text-purple-400 font-semibold">export function</span>{' '}
                      <span className="text-cyan-300 font-semibold">verifySession</span>(token: <span className="text-amber-300">string</span>)
                    </div>
                    <div className="text-[11px] text-indigo-300">
                      ↳ AST: <span className="text-slate-200">FunctionDeclaration</span> → Ident: <span className="text-emerald-300 font-semibold">verifySession</span> (exported)
                    </div>
                  </div>
                )}

                {activeAstTab === 'py' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                      <span className="font-semibold text-slate-300">Parser: tree-sitter-python.wasm</span>
                      <span className="text-emerald-400 font-semibold">✓ 940 tokens extracted (0.6ms)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-slate-300">
                      <span className="text-purple-400 font-semibold">def</span>{' '}
                      <span className="text-cyan-300 font-semibold">execute_query</span>(pool, sql_statement)
                    </div>
                    <div className="text-[11px] text-indigo-300">
                      ↳ AST: <span className="text-slate-200">function_definition</span> → Symbols: <span className="text-emerald-300 font-semibold">execute_query</span>
                    </div>
                  </div>
                )}

                {activeAstTab === 'go' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                      <span className="font-semibold text-slate-300">Parser: tree-sitter-go.wasm</span>
                      <span className="text-emerald-400 font-semibold">✓ 810 tokens extracted (0.5ms)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-slate-300">
                      <span className="text-purple-400 font-semibold">func</span>{' '}
                      <span className="text-cyan-300 font-semibold">AcquireConnection</span>() (*sql.DB, error)
                    </div>
                    <div className="text-[11px] text-indigo-300">
                      ↳ AST: <span className="text-slate-200">function_declaration</span> → Exported: <span className="text-emerald-300 font-semibold">AcquireConnection</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 2: Symbol-Level Granularity & Broken Symbol Detection (lg:col-span-5, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={140}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-5 p-7 sm:p-8 rounded-2xl bg-gradient-to-br from-[#101726] via-[#101726] to-[#1e1424] border border-slate-700/80 hover:border-rose-500/40 transition-all duration-300 relative group flex flex-col justify-between shadow-xl shadow-rose-950/10"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Binary className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#0a0f1d] text-blue-300 border border-blue-500/30 font-semibold">
                  Symbol Precision
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                Broken Symbol Detection
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                Replaces coarse file-level guessing by mapping exact function, class, and variable declarations to downstream call sites. Automatically flags deleted exports or signature shifts as <strong className="text-rose-400 font-bold">CRITICAL</strong>.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-700/80">
              <div className="space-y-2.5 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#0a0f1d] border border-rose-500/40 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                    <span className="text-rose-200 font-semibold">deleteUser() missing</span>
                  </div>
                  <span className="text-[10px] bg-rose-950/90 text-rose-300 border border-rose-600/80 px-2 py-0.5 rounded font-bold">
                    CRITICAL (Line 42)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f1d] border border-slate-700/80 flex items-center justify-between text-slate-300 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="text-slate-300">findUserById()</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                    Untouched Symbol Ignored
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 3: Interactive Graph (lg:col-span-4, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={80}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-4 p-7 rounded-2xl bg-[#101726] border border-slate-700/80 hover:border-slate-600 transition-all duration-300 relative group flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Share2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#0a0f1d] text-emerald-400 border border-emerald-500/30 font-semibold">
                  React Flow Canvas
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Interactive Dependency Graph
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                Visual canvas with Tier-coded nodes, dynamic zoom/pan, Minimap, layout controls, depth slider, and live symbol highlighting.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="flex items-center justify-between gap-1.5 font-mono text-[11px] bg-[#0a0f1d] p-2.5 rounded-xl border border-slate-700/80">
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/50 font-medium">Changed Root</span>
                <span className="text-slate-500">→</span>
                <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-600/50 font-medium">Tier 1 Direct</span>
                <span className="text-slate-500">→</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-600/50 font-medium">Tier 2 Route</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 4: Deterministic Blast Radius (lg:col-span-4, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={180}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-4 p-7 rounded-2xl bg-[#101726] border border-slate-700/80 hover:border-slate-600 transition-all duration-300 relative group flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Radiation className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#0a0f1d] text-amber-400 border border-amber-500/30 font-semibold">
                  Reverse BFS
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Deterministic Blast Radius
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                Reverse breadth-first traversal traces ripple effects through infinite transitive hops, calculating accurate numerical risk scores and impact tiers.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-slate-300">Blast Radius Index</span>
                <span className="text-amber-400 font-bold">78 / 100 (HIGH RISK)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0a0f1d] overflow-hidden border border-slate-700/80">
                <div className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 rounded-full w-[78%]" />
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 5: What-If Simulator (lg:col-span-4, md:col-span-2) */}
          <ScrollReveal
            animation="fade-up"
            delay={280}
            duration={700}
            className="col-span-1 md:col-span-2 lg:col-span-4 p-7 rounded-2xl bg-[#101726] border border-slate-700/80 hover:border-slate-600 transition-all duration-300 relative group flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#0a0f1d] text-purple-400 border border-purple-500/30 font-semibold">
                  Sandbox
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                What-If Blast Radius Simulator
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                Click any node in the graph to simulate: "What if I modify or delete this file?" Inspect projected ripples before writing or touching code.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="p-2.5 rounded-lg bg-[#0a0f1d] border border-purple-800/60 font-mono text-[11px] text-purple-300 flex items-center justify-between">
                <span>Simulate modify: routes/user.js</span>
                <span className="text-cyan-400 font-semibold">+4 files projected</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 6: In-Workspace AI Copilot (lg:col-span-6, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={100}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-6 p-7 sm:p-8 rounded-2xl bg-[#101726] border border-cyan-500/30 hover:border-cyan-500/60 shadow-xl shadow-cyan-950/20 transition-all duration-300 relative group flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Bot className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      In-Workspace Copilot
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Context-Aware AI Assistant
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800/60">
                  Draggable & Resizable Window
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Docked floating copilot directly inside the graph workspace. Ask natural language questions like "Kon kisko import kar raha hai?", "Why is this classified as high risk?", or "What specific test commands to run?".
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="p-3 rounded-xl bg-[#0a0f1d] border border-slate-700/80 font-mono text-xs space-y-1.5 text-slate-300 shadow-inner">
                <div className="text-[11px] text-cyan-400 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span>ChangeLens Copilot • Active Graph Context</span>
                  <span className="text-emerald-400 font-semibold">Online</span>
                </div>
                <p className="text-[11px] text-slate-300 pt-1">
                  "Target <code className="text-white bg-slate-800 px-1 rounded">models/user.js</code> directly impacts 3 controllers and route <code className="text-cyan-300">/api/v1/users</code>. Run <code className="text-amber-300">npm test tests/auth.test.js</code> before merging."
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 7: GitHub Actions CI/CD Quality Gate & Automated PR Bot (lg:col-span-6, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={200}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-6 p-7 sm:p-8 rounded-2xl bg-[#101726] border border-teal-500/30 hover:border-teal-500/60 shadow-xl shadow-teal-950/20 transition-all duration-300 relative group flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      GitHub Actions CI
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      Automated CI Quality Gate & PR Comments
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-800/60">
                  .github/workflows/changelens.yml
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Generate production GitHub Actions CI workflows with 1-click. Block merges on <strong className="text-white">CRITICAL broken exports</strong> or configurable risk thresholds, and automatically post rich Markdown blast radius reviews directly into PR discussions.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="font-mono text-[11px] text-teal-300 bg-[#0a0f1d] p-3 rounded-lg border border-slate-700/80 flex items-center justify-between shadow-inner">
                <span>Guard Policy: failOnCritical: true, failOnHigh: false</span>
                <span className="text-emerald-400 font-bold">✓ CI Merge Gate Active</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 8: AI PR Review & Multi-Format Exporter (lg:col-span-6, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={120}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-6 p-7 sm:p-8 rounded-2xl bg-[#101726] border border-purple-500/30 hover:border-purple-500/50 shadow-xl shadow-purple-950/20 transition-all duration-300 relative group flex flex-col justify-between"
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
                      AI PR Review & Multi-Format Exporter
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono text-purple-400 bg-purple-950/80 px-2.5 py-1 rounded-full border border-purple-800/60 hidden sm:inline-block">
                  Markdown • JSON • PDF
                </span>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Generates executive impact assessments, required pre-merge action checklists, and full PR comment reports ready for 1-click clipboard copy or direct download in Markdown, JSON, and PDF formats.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="p-3 rounded-xl bg-[#0a0f1d] border border-slate-700/80 font-mono text-xs space-y-1 text-slate-300 shadow-inner">
                <div className="text-[11px] text-purple-300 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span>Executive Impact Assessment</span>
                  <span className="text-emerald-400 font-semibold">1-Click Copy Ready</span>
                </div>
                <p className="text-[11px] text-slate-300 pt-1">
                  Includes bulleted action items, impacted API routes, and copyable GitHub Markdown tables.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Feature 9: Cloud History & 30-Day TTL (lg:col-span-6, md:col-span-1) */}
          <ScrollReveal
            animation="fade-up"
            delay={240}
            duration={700}
            className="col-span-1 md:col-span-1 lg:col-span-6 p-7 sm:p-8 rounded-2xl bg-[#101726] border border-emerald-500/30 hover:border-emerald-500/50 shadow-xl shadow-emerald-950/20 transition-all duration-300 relative group flex flex-col justify-between"
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
                      Persistent History & 30-Day Auto-Cleanup
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-violet-300 bg-violet-950/80 px-2.5 py-0.5 rounded-full border border-violet-800/60 flex items-center gap-1 font-semibold">
                    <BookmarkCheck className="w-3 h-3 text-violet-400" />
                    30d TTL & Pinning
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Every analysis run is saved to MongoDB with searchable repo filters. Unpinned reports auto-delete after 30 days to keep history lean, while pinned reports remain permanent forever.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/80">
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2.5 rounded-lg bg-[#0a0f1d] border border-slate-700/80 flex items-center justify-between shadow-inner">
                  <span className="text-slate-300 truncate font-medium">mern-sample (user.js)</span>
                  <span className="text-violet-300 font-bold shrink-0">📌 Saved Forever</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0a0f1d] border border-slate-700/80 flex items-center justify-between shadow-inner">
                  <span className="text-slate-300 truncate font-medium">python-store (pool.py)</span>
                  <span className="text-amber-300 font-semibold shrink-0">⏳ 28d TTL</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ================= MOBILE ADAPTIVE VIEW (< md screens): Compact Cards ================= */}
        <div className="md:hidden space-y-4">
          {/* Mobile Hero Card 1: WASM AST Parser */}
          <ScrollReveal animation="fade-up" duration={600} className="p-4 sm:p-5 rounded-xl bg-[#101726] border border-indigo-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    WASM Grammars
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Multi-Language AST Parsing
                  </h3>
                </div>
              </div>

              {/* Language Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#090e1a] p-0.5 rounded-lg border border-slate-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveAstTab('js')}
                  className={`px-2 py-0.5 rounded font-mono ${activeAstTab === 'js' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  JS/TS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAstTab('py')}
                  className={`px-2 py-0.5 rounded font-mono ${activeAstTab === 'py' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Py
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAstTab('go')}
                  className={`px-2 py-0.5 rounded font-mono ${activeAstTab === 'go' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Go
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Deterministic Tree-Sitter WebAssembly parsers extract concrete syntax trees offline in sub-milliseconds.
            </p>

            <div className="p-2.5 rounded-lg bg-[#0a0f1d] border border-slate-700/80 font-mono text-[11px] text-slate-300">
              {activeAstTab === 'js' && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 pb-1 border-b border-slate-800">
                    <span>tree-sitter-typescript.wasm</span>
                    <span>✓ 1,280 tokens (0.8ms)</span>
                  </div>
                  <div className="pt-1.5 text-slate-300">
                    <span className="text-purple-400 font-semibold">export function</span> <span className="text-cyan-300 font-semibold">verifySession</span>()
                  </div>
                </div>
              )}
              {activeAstTab === 'py' && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 pb-1 border-b border-slate-800">
                    <span>tree-sitter-python.wasm</span>
                    <span>✓ 940 tokens (0.6ms)</span>
                  </div>
                  <div className="pt-1.5 text-slate-300">
                    <span className="text-purple-400 font-semibold">def</span> <span className="text-cyan-300 font-semibold">execute_query</span>(pool)
                  </div>
                </div>
              )}
              {activeAstTab === 'go' && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 pb-1 border-b border-slate-800">
                    <span>tree-sitter-go.wasm</span>
                    <span>✓ 810 tokens (0.5ms)</span>
                  </div>
                  <div className="pt-1.5 text-slate-300">
                    <span className="text-purple-400 font-semibold">func</span> <span className="text-cyan-300 font-semibold">AcquireConnection</span>()
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Mobile Hero Card 2: Deterministic Blast Radius */}
          <ScrollReveal animation="fade-up" delay={50} duration={600} className="p-4 sm:p-5 rounded-xl bg-[#101726] border border-amber-500/40 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Radiation className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Reverse BFS
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Deterministic Blast Radius
                  </h3>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Score: 78/100
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Traces transitive downstream ripple effects through infinite hops to compute regression risk and affected tiers.
            </p>

            <div className="w-full h-2 rounded-full bg-[#0a0f1d] overflow-hidden border border-slate-700/80">
              <div className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500 rounded-full w-[78%]" />
            </div>
          </ScrollReveal>

          {/* Compact Capabilities Bullet Matrix */}
          <ScrollReveal animation="fade-up" delay={150} duration={600} className="p-4 sm:p-5 rounded-xl bg-[#101726] border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Additional Engine Capabilities
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">All Active</span>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 text-xs">
              <li className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0a0f1d] border border-slate-700/70">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <strong className="text-slate-100 font-semibold block text-[11px]">Broken Symbol Detection</strong>
                  <p className="text-slate-300 text-[10px]">Flags altered signatures, missing exports, and broken imports down to line numbers.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0a0f1d] border border-slate-700/70">
                <Bot className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <strong className="text-slate-100 font-semibold block text-[11px]">In-Workspace AI Copilot</strong>
                  <p className="text-slate-300 text-[10px]">Chat directly with the AST graph: ask "who imports who?" and test suggestions.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0a0f1d] border border-slate-700/70">
                <Terminal className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <strong className="text-slate-100 font-semibold block text-[11px]">GitHub Actions CI Quality Gate</strong>
                  <p className="text-slate-300 text-[10px]">Automate merge blocking on breaking changes and post PR review comments.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0a0f1d] border border-slate-700/70">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <strong className="text-slate-100 font-semibold block text-[11px]">What-If Blast Radius Simulator</strong>
                  <p className="text-slate-300 text-[10px]">Simulate modifying or deleting files right on the visual canvas before editing code.</p>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0a0f1d] border border-slate-700/70">
                <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <strong className="text-slate-100 font-semibold block text-[11px]">Cloud History with 30-Day TTL & Pinning</strong>
                  <p className="text-slate-300 text-[10px]">MongoDB Atlas persistence with 30-day auto-expiry and 1-click permanent bookmarking.</p>
                </div>
              </li>
            </ul>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
