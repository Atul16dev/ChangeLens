import React, { useState } from 'react';
import {
  Share2,
  Binary,
  Sparkles,
  Zap,
  Activity,
  FileCode2,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

export function InteractivePreviewSection() {
  const [activeTab, setActiveTab] = useState('graph');
  const [selectedNode, setSelectedNode] = useState('user.js');
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = () => {
    const text = `### 🔍 ChangeLens Impact Summary
- **Target File**: \`server/models/user.js\`
- **Blast Radius**: 7 affected files (3 direct, 4 transitive)
- **Risk Score**: 78 / 100 (HIGH RISK)
- **Broken Symbols**: 0 broken references

#### ⚠️ Direct Dependents Requiring Review:
1. \`server/controllers/user-controller.js\`
2. \`server/services/auth.service.js\`
3. \`tests/user.test.js\`

#### 🧪 Suggested Verification:
\`\`\`bash
npm test tests/auth.test.js
\`\`\``;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="preview" className="py-20 md:py-32 relative bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            Interactive Product Preview
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Developer-First UI Crafted for Clarity.
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            Switch between the visual blast radius graph, symbol isolation analyzer, automated Gemini PR summary, and the live What-If simulator.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center p-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                activeTab === 'graph'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Visual Blast Radius</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('symbols')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                activeTab === 'symbols'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Binary className="w-4 h-4" />
              <span>Symbol Isolation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                activeTab === 'ai'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI PR Explainer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('whatif')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                activeTab === 'whatif'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>What-If Simulator</span>
            </button>
          </div>
        </div>

        {/* Tab Content Display Window */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
          {/* macOS Title Bar */}
          <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-slate-300">
                changelens-viewer / {activeTab === 'graph' ? 'dag-layout.elk' : activeTab === 'symbols' ? 'symbol-table.ast' : activeTab === 'ai' ? 'pr-risk-review.md' : 'what-if-simulation.json'}
              </span>
            </div>
            <span className="text-[11px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Interactive Preview
            </span>
          </div>

          {/* TAB 1: Visual Blast Radius */}
          {activeTab === 'graph' && (
            <div className="p-6 sm:p-8 bg-slate-950/70 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80 text-xs">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Target: server/models/user.js</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      MODIFIED
                    </span>
                  </h4>
                  <p className="text-slate-400 mt-1">
                    Reverse BFS graph calculated across 18 repository files. Click any node to inspect details.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    Selected Node: <strong className="text-cyan-400 font-mono">{selectedNode}</strong>
                  </span>
                </div>
              </div>

              {/* Visual Graph DAG simulation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'user.js', label: 'user.js', depth: 'Depth 0', type: 'Changed Root', risk: 'ROOT', desc: 'Mongoose User schema modified' },
                  { id: 'user-controller.js', label: 'user-controller.js', depth: 'Depth 1', type: 'Direct Dependent', risk: 'HIGH', desc: 'Imports User directly' },
                  { id: 'user-routes.js', label: 'user-routes.js', depth: 'Depth 2', type: 'Transitive', risk: 'MEDIUM', desc: 'Mounts userController' },
                  { id: 'server.js', label: 'server.js', depth: 'Depth 3', type: 'Application Root', risk: 'LOW', desc: 'Bootstraps routes' },
                ].map((node) => {
                  const isNodeActive = selectedNode === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isNodeActive
                          ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/50 ring-2 ring-cyan-500/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {node.depth}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-cyan-400">
                          {node.risk}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileCode2 className={`w-4 h-4 ${isNodeActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <h5 className="text-xs font-mono font-bold text-slate-100 truncate">
                          {node.label}
                        </h5>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {node.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Edge Connection Bar */}
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>Layered Layout Engine: <strong>ELK.js</strong> crossing minimization active</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>Edges: 3 Direct, 4 Transitive</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Symbol Isolation */}
          {activeTab === 'symbols' && (
            <div className="p-6 sm:p-8 bg-slate-950/70 space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Symbol Table & Missing Export Verification</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AST SYMBOL PRECISION
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  ChangeLens inspects individual exported function contracts rather than whole-file imports.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider font-mono">
                    Exported Public Symbols (server/models/user.js)
                  </span>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-cyan-300">UserSchema</span>
                      <span className="text-[10px] text-slate-500">Mongoose.Schema</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-cyan-300">toSafeObject()</span>
                      <span className="text-[10px] text-slate-500">Schema.methods</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <span className="text-cyan-300">User</span>
                      <span className="text-[10px] text-slate-500">Mongoose.model</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    Broken Symbol Diagnostics
                  </span>
                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-xs space-y-2 text-slate-300">
                    <p className="font-semibold text-emerald-300">0 Broken Symbol References Flagged</p>
                    <p className="text-slate-400">
                      All consumers importing <code className="text-slate-200">User</code>, <code className="text-slate-200">UserSchema</code>, and methods have valid syntax bindings matching AST declarations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI PR Explainer */}
          {activeTab === 'ai' && (
            <div className="p-6 sm:p-8 bg-slate-950/70 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Gemini Context-Aware Pull Request Review</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Auto-generated impact breakdown ready to post into GitHub PR discussions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy PR Markdown'}</span>
                </button>
              </div>

              {/* Markdown Box */}
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs space-y-3 text-slate-300">
                <div className="text-cyan-400 font-bold">### 🔍 ChangeLens Blast Radius Report</div>
                <div className="text-slate-400">
                  - <strong>Target File:</strong> <code>server/models/user.js</code> (Modified)<br />
                  - <strong>Calculated Impact:</strong> 7 affected files across 3 dependency depth levels<br />
                  - <strong>Risk Score:</strong> <span className="text-amber-400 font-bold">78 / 100 (HIGH RISK)</span><br />
                  - <strong>Broken Symbols:</strong> 0 detected
                </div>
                <div className="text-slate-300 pt-2 border-t border-slate-800">
                  <span className="font-bold text-slate-100">Recommended Test Suites:</span>
                  <pre className="mt-1.5 p-2.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                    npm test tests/auth.test.js tests/history.test.js
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: What-If Simulator */}
          {activeTab === 'whatif' && (
            <div className="p-6 sm:p-8 bg-slate-950/70 space-y-6">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Interactive What-If Blast Radius Simulator</span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Hypothetically simulate touching any file without changing code to preview downstream ripple effects.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-300">Simulation Target: server/routes/user-routes.js</span>
                  <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-700/50">
                    Simulated Change
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Simulating a modification to this route layer limits downstream impact to 2 files (<code className="text-slate-200">server.js</code> and <code className="text-slate-200">api/app.js</code>), reducing risk score from 78 to 32.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
