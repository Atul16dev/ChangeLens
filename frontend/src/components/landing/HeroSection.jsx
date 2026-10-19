import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  ArrowRight,
  Layers,
  FileCode2,
  Cpu,
  Activity,
} from 'lucide-react';

const DEMO_PRESETS = [
  {
    id: 'user-model',
    name: 'server/models/user.js',
    lang: 'JavaScript',
    change: 'Modified schema definition',
    affectedCount: 7,
    directCount: 3,
    maxDepth: 3,
    risk: 'HIGH',
    riskScore: 78,
    brokenSymbols: 0,
    impactedNodes: [
      { name: 'user.js', role: 'Changed Root', depth: 0, status: 'changed' },
      { name: 'user-controller.js', role: 'Direct Consumer', depth: 1, status: 'direct' },
      { name: 'user-routes.js', role: 'API Route Layer', depth: 2, status: 'transitive' },
      { name: 'app.js', role: 'Server Entrypoint', depth: 3, status: 'transitive' },
    ],
    aiInsight: 'Schema modification alters exported model interface. 3 controllers and 1 route middleware require regression testing.',
  },
  {
    id: 'auth-service',
    name: 'auth/session_store.py',
    lang: 'Python',
    change: 'Refactored token revocation',
    affectedCount: 5,
    directCount: 2,
    maxDepth: 2,
    risk: 'CRITICAL',
    riskScore: 92,
    brokenSymbols: 1,
    impactedNodes: [
      { name: 'session_store.py', role: 'Changed Root', depth: 0, status: 'changed' },
      { name: 'oauth_middleware.py', role: 'Token Verifier', depth: 1, status: 'direct' },
      { name: 'api_gateway.py', role: 'Security Boundary', depth: 2, status: 'transitive' },
    ],
    aiInsight: 'Critical: broken signature in revoke_token(). Downstream consumers in api_gateway will fail at runtime.',
  },
  {
    id: 'db-connection',
    name: 'db/pool.go',
    lang: 'Go',
    change: 'Tuned connection pool timeouts',
    affectedCount: 3,
    directCount: 1,
    maxDepth: 1,
    risk: 'LOW',
    riskScore: 24,
    brokenSymbols: 0,
    impactedNodes: [
      { name: 'pool.go', role: 'Changed Root', depth: 0, status: 'changed' },
      { name: 'repository.go', role: 'Query Executor', depth: 1, status: 'direct' },
    ],
    aiInsight: 'Low risk: internal connection buffer adjustments. No exported symbols or interface contracts modified.',
  },
];

export function HeroSection() {
  const { isAuthenticated } = useAuth();
  const [activeDemo, setActiveDemo] = useState(DEMO_PRESETS[0]);

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background radial gradient mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-indigo-600/10 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-600/5 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-inner backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">
              Deterministic AST Blast Radius Engine
            </span>
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              v1.0 Live
            </span>
          </div>
        </div>

        {/* Hero Title & Supporting Text */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Know What Your Code Changes{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent">
              Will Break.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ChangeLens analyzes code changes, traces dependencies, and helps developers understand the potential impact before merging.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/app"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base px-7 py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 active:scale-95 transition-all group"
                >
                  <span>Launch ChangeLens Workspace</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base px-6 py-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                >
                  <span>Explore Features</span>
                  <Layers className="w-4 h-4 text-slate-400" />
                </a>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 via-indigo-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base px-7 py-3.5 rounded-xl shadow-lg shadow-cyan-500/25 active:scale-95 transition-all group"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-base px-6 py-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
                >
                  <span>Launch Workspace (Sign In)</span>
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-medium px-4 py-3.5 transition-colors"
                >
                  <span>Explore Features</span>
                  <Layers className="w-4 h-4" />
                </a>
              </>
            )}
          </div>

          {/* Supported Languages Badges */}
          <div className="pt-6 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> JavaScript / TypeScript
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Python 3 AST
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Go Modules
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Git Diff
            </span>
          </div>
        </div>

        {/* Interactive Product Preview Mockup */}
        <div className="mt-14 max-w-5xl mx-auto" id="hero-preview">
          <div className="relative rounded-2xl bg-gradient-to-b from-slate-800/60 to-slate-900/90 p-1 sm:p-2 border border-slate-800 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            {/* Window Titlebar */}
            <div className="px-4 py-3 bg-slate-950/80 rounded-t-xl border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">
                  ChangeLens Visual Blast Radius Engine • Interactive Demo
                </span>
              </div>

              {/* Demo Scenario Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setActiveDemo(preset)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      activeDemo.id === preset.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {preset.lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Inner Dashboard Preview Body */}
            <div className="p-4 sm:p-6 bg-slate-950/90 rounded-b-xl space-y-6">
              {/* Header Status Bar inside demo */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-400">Target File:</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                      {activeDemo.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        activeDemo.risk === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : activeDemo.risk === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {activeDemo.risk} RISK ({activeDemo.riskScore}/100)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{activeDemo.change}</p>
                </div>

                {/* Metric Counters */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center px-3 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Affected Files</span>
                    <strong className="text-base font-extrabold text-cyan-400">{activeDemo.affectedCount}</strong>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Direct Consumers</span>
                    <strong className="text-base font-extrabold text-slate-200">{activeDemo.directCount}</strong>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Depth</span>
                    <strong className="text-base font-extrabold text-indigo-400">{activeDemo.maxDepth} Hops</strong>
                  </div>
                </div>
              </div>

              {/* Visual Graph Demonstration Flow */}
              <div className="p-4 sm:p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Dependency Blast Radius Propagation
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ELK.js Deterministic Layered Layout
                  </span>
                </div>

                {/* Graph Node Chain */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                  {activeDemo.impactedNodes.map((node, idx) => (
                    <div
                      key={node.name}
                      className={`p-3.5 rounded-xl border transition-all ${
                        node.status === 'changed'
                          ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                          : node.status === 'direct'
                          ? 'bg-orange-950/20 border-orange-500/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-400 border border-slate-800">
                          Depth {node.depth}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            node.status === 'changed'
                              ? 'text-amber-400'
                              : node.status === 'direct'
                              ? 'text-orange-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {node.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCode2 className={`w-4 h-4 shrink-0 ${node.status === 'changed' ? 'text-amber-400' : 'text-cyan-400'}`} />
                        <span className="text-xs font-mono font-semibold text-slate-200 truncate">
                          {node.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI Reviewer Notification Box */}
                <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex items-start gap-3 text-xs">
                  <Cpu className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-300">Automated Gemini AI Assessment: </span>
                    <span className="text-slate-300">{activeDemo.aiInsight}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Illustrative Banner */}
              <div className="text-center text-[11px] text-slate-500 font-mono">
                * Illustrative real-time preview based on ChangeLens AST dependency resolution benchmarks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
