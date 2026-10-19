import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  FileCode,
  ShieldAlert,
  Layers,
  CheckCircle2,
  ChevronRight,
  Filter,
  X,
  Code,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  GitPullRequest,
  ShieldCheck,
  FileText,
  Zap,
  Download,
  Printer,
  FileDown,
} from 'lucide-react';
import { downloadText, downloadJson, printOrSavePDF } from '../utils/export.js';

export function ImpactSidebar({
  impactData,
  explanationData,
  selectedNodeId,
  onSelectNode,
  isSimulating,
  simulatedFile,
  onSimulateNode,
  onExitSimulation,
}) {
  const [activeMainTab, setActiveMainTab] = useState('findings'); // 'findings' | 'ai_review'
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'critical' | 'direct' | 'transitive'
  const [copied, setCopied] = useState(false);

  const rawSummary = impactData?.summary || {};
  const summary = {
    totalChangedFiles: rawSummary.totalChanges ?? rawSummary.totalChangedFiles ?? 0,
    totalImpactedFiles: rawSummary.impactedFilesCount ?? rawSummary.totalImpactedFiles ?? 0,
    brokenImportsCount: rawSummary.brokenImportsCount ?? 0,
    brokenSymbolsCount: rawSummary.brokenSymbolsCount ?? 0,
    directImpactCount: rawSummary.directDependentsCount ?? rawSummary.directImpactCount ?? 0,
    transitiveImpactCount: rawSummary.transitiveDependentsCount ?? rawSummary.transitiveImpactCount ?? 0,
  };

  const allFindings = impactData?.allFindings || [];

  // Filter findings based on selected node or active tab
  const filteredFindings = allFindings.filter((finding) => {
    const file = finding.affectedFile || finding.consumerFile;

    if (selectedNodeId && file !== selectedNodeId) {
      return false;
    }

    if (activeFilterTab === 'critical') return finding.severity === 'CRITICAL';
    if (activeFilterTab === 'direct') return finding.depth === 1;
    if (activeFilterTab === 'transitive') return finding.depth > 1;
    return true;
  });

  const handleCopyMarkdown = async () => {
    if (!explanationData?.prCommentMarkdown) return;
    try {
      await navigator.clipboard.writeText(explanationData.prCommentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!explanationData?.prCommentMarkdown) return;
    downloadText(
      explanationData.prCommentMarkdown,
      `changelens-pr-report-${Date.now()}.md`,
      'text/markdown'
    );
  };

  const handleDownloadJson = () => {
    if (!impactData) return;
    const exportPayload = {
      timestamp: new Date().toISOString(),
      summary,
      riskLevel: explanationData?.riskLevel || 'LOW',
      findings: impactData.allFindings || [],
      explanation: explanationData,
    };
    downloadJson(exportPayload, `changelens-analysis-${Date.now()}.json`);
  };

  const handlePrintPDF = () => {
    printOrSavePDF({
      title: 'ChangeLens Architecture Impact Report',
      markdown: explanationData?.prCommentMarkdown || 'No report generated.',
      summary,
      riskLevel: explanationData?.riskLevel || 'LOW',
    });
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-950/80 text-rose-300 border-rose-500/50',
          dot: 'bg-rose-500 animate-pulse',
          label: 'CRITICAL RISK',
          subtext: 'Broken imports will cause build failure',
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-950/80 text-orange-300 border-orange-500/50',
          dot: 'bg-orange-500',
          label: 'HIGH RISK',
          subtext: 'Direct downstream consumers impacted',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-950/80 text-yellow-300 border-yellow-500/50',
          dot: 'bg-yellow-500',
          label: 'MEDIUM RISK',
          subtext: 'Transitive dependencies impacted',
        };
      default:
        return {
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50',
          dot: 'bg-emerald-500',
          label: 'LOW RISK',
          subtext: 'Isolated changes with clean blast radius',
        };
    }
  };

  const riskConfig = getRiskBadge(explanationData?.riskLevel || 'LOW');

  return (
    <aside className="w-96 lg:w-[430px] h-full bg-slate-900/95 border-l border-slate-800 flex flex-col backdrop-blur-md shrink-0 select-none">
      {/* WHAT-IF SIMULATION MODE BANNER */}
      {isSimulating && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 border-b border-purple-500/50 p-3 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="truncate">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Simulation Mode Active</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              </div>
              <div className="font-mono text-xs text-purple-200 truncate font-semibold" title={simulatedFile}>
                {simulatedFile}
              </div>
            </div>
          </div>
          <button
            onClick={onExitSimulation}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-800/80 hover:bg-purple-700 text-purple-100 border border-purple-500/40 transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
            title="Exit simulation and return to real Git changes"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      )}

      {/* Top Main Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-2 gap-2">
        <button
          onClick={() => setActiveMainTab('findings')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMainTab === 'findings'
              ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>AST Findings</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
            {allFindings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('ai_review')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeMainTab === 'ai_review'
              ? 'bg-gradient-to-r from-indigo-950 to-purple-950 text-purple-200 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-purple-300 hover:bg-purple-950/20'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>AI PR Review</span>
          {explanationData?.riskLevel && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] border ${riskConfig.bg}`}>
              {explanationData.riskLevel}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: AST FINDINGS VIEW */}
      {activeMainTab === 'findings' && (
        <>
          {/* Metrics Banner */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                Blast Radius Impact
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {summary.totalImpactedFiles} Files Impacted
              </span>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => setActiveFilterTab(activeFilterTab === 'critical' ? 'all' : 'critical')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  activeFilterTab === 'critical'
                    ? 'bg-rose-950/60 border-rose-500 shadow-rose-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Broken Imports</span>
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                  {summary.brokenImportsCount}
                </div>
              </div>

              <div
                onClick={() => setActiveFilterTab(activeFilterTab === 'direct' ? 'all' : 'direct')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  activeFilterTab === 'direct'
                    ? 'bg-orange-950/60 border-orange-500 shadow-orange-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-orange-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Direct (Lv 1)</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div className="text-xl font-bold font-mono text-orange-400 mt-1">
                  {summary.directImpactCount}
                </div>
              </div>

              <div
                onClick={() => setActiveFilterTab(activeFilterTab === 'transitive' ? 'all' : 'transitive')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  activeFilterTab === 'transitive'
                    ? 'bg-yellow-950/60 border-yellow-500 shadow-yellow-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-yellow-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Transitive (Lv 2+)</span>
                  <Layers className="w-3.5 h-3.5 text-yellow-400" />
                </div>
                <div className="text-xl font-bold font-mono text-yellow-400 mt-1">
                  {summary.transitiveImpactCount}
                </div>
              </div>

              <div
                onClick={() => setActiveFilterTab('all')}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  activeFilterTab === 'all' && !selectedNodeId
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-cyan-500/20'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Changed Roots</span>
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                  {summary.totalChangedFiles}
                </div>
              </div>
            </div>

            {/* Selected Node Filter Banner */}
            {selectedNodeId && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs text-cyan-300">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Filtered: <strong className="font-mono">{selectedNodeId}</strong></span>
                  </div>
                  <button
                    onClick={() => onSelectNode(null)}
                    className="hover:bg-cyan-900/60 p-1 rounded transition-colors ml-2"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* What-If Simulation Trigger Card */}
                {onSimulateNode && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-slate-900 border border-purple-500/40 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                            <span>What-If Simulator</span>
                            {selectedNodeId === simulatedFile && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Project blast radius before code edits
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {selectedNodeId === simulatedFile ? (
                          <button
                            onClick={onExitSimulation}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/40 transition-all active:scale-95 flex items-center gap-1"
                            title="Exit simulation"
                          >
                            <X className="w-3 h-3" />
                            <span>Reset</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => onSimulateNode(selectedNodeId, 'modified')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm transition-all active:scale-95 flex items-center gap-1 border border-purple-400/40"
                              title={`Simulate modifying ${selectedNodeId}`}
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              <span>Simulate</span>
                            </button>
                            <button
                              onClick={() => onSimulateNode(selectedNodeId, 'deleted')}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-all active:scale-95 flex items-center gap-1"
                              title={`Simulate deleting ${selectedNodeId}`}
                            >
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{filteredFindings.length}</strong> findings
              </span>
              <button
                onClick={handleDownloadJson}
                className="p-1 rounded text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                title="Download AST findings as JSON (.json)"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeFilterTab === 'all' ? 'bg-slate-800 text-white font-semibold' : 'hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilterTab('critical')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeFilterTab === 'critical' ? 'bg-rose-950 text-rose-300 font-semibold' : 'hover:text-rose-300'
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setActiveFilterTab('direct')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeFilterTab === 'direct' ? 'bg-orange-950 text-orange-300 font-semibold' : 'hover:text-orange-300'
                }`}
              >
                Lv 1
              </button>
            </div>
          </div>

          {/* Findings Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-3.5">
            {filteredFindings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">No Findings Detected</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Either this file has no dependents, or it matches no active filter criteria.
                </p>
              </div>
            ) : (
              filteredFindings.map((finding, idx) => {
                const isCritical = finding.severity === 'CRITICAL';
                const isHigh = finding.severity === 'HIGH';
                const file = finding.affectedFile || finding.consumerFile;
                const isSelected = selectedNodeId === file;
                const isBrokenImport = finding.type === 'broken_import';

                // Robust extraction supporting AST location objects and legacy line/column
                const line = finding.evidence?.location?.startLine ?? finding.evidence?.line ?? null;
                const column = finding.evidence?.location?.startColumn ?? finding.evidence?.column ?? null;
                const snippet = finding.evidence?.rawSource || finding.evidence?.snippet || (finding.evidence?.specifier ? `import ... from "${finding.evidence.specifier}";` : null);
                const explanation = finding.explanation || finding.reason || 'Impacted by dependency change.';

                return (
                  <div
                    key={idx}
                    onClick={() => onSelectNode(file)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-cyan-400 bg-slate-800/90 border-cyan-500/50 shadow-lg'
                        : isCritical
                        ? 'bg-rose-950/20 border-rose-900/60 hover:border-rose-700/80'
                        : isHigh
                        ? 'bg-orange-950/20 border-orange-900/60 hover:border-orange-700/80'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isHigh
                              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                          }`}
                        >
                          {isCritical ? <AlertOctagon className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {finding.severity}
                        </span>

                        {line !== null && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 flex items-center gap-1">
                            <Code className="w-2.5 h-2.5 text-cyan-400" />
                            Line {line}{column !== null ? `:${column}` : ''}
                          </span>
                        )}

                        {finding.missingSymbol && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600/80 flex items-center gap-1">
                            <AlertOctagon className="w-2.5 h-2.5 text-rose-400" />
                            Missing: {finding.missingSymbol}
                          </span>
                        )}

                        {finding.symbolImpact?.impactedSymbols?.length > 0 && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-indigo-400" />
                            Symbols: {finding.symbolImpact.impactedSymbols.join(', ')}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">
                        {finding.depth ? `Depth Lv ${finding.depth}` : (finding.missingSymbol ? 'Broken Symbol' : isBrokenImport ? 'Broken Import' : 'Direct')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="font-mono text-xs font-semibold text-slate-200 truncate" title={file}>
                        {file}
                      </div>
                      {onSimulateNode && file !== simulatedFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSimulateNode(file, 'modified');
                          }}
                          className="shrink-0 px-2 py-0.5 rounded text-[10px] bg-purple-950/80 hover:bg-purple-850 text-purple-300 border border-purple-500/40 flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                          title={`Simulate blast radius if ${file} is modified`}
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>Simulate</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                      {explanation}
                    </p>

                    {finding.path && finding.path.length > 1 && (
                      <div className="mb-2 p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-500">Route:</span>
                        {finding.path.map((segment, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <span className={sIdx === finding.path.length - 1 ? 'text-amber-300 font-semibold' : 'text-slate-300'}>
                              {segment.split('/').pop()}
                            </span>
                            {sIdx < finding.path.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {finding.evidence && (line !== null || snippet) && (
                      <div className="mt-2.5 rounded-lg bg-slate-950/90 p-2.5 border border-slate-800 font-mono text-[11px] shadow-inner">
                        <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                            <Code className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{line !== null ? `Line ${line}${column !== null ? `:${column}` : ''}` : 'Location'}</span>
                          </div>
                          {finding.evidence.specifier && (
                            <span className="text-slate-400 text-[10px] font-mono truncate max-w-[200px]" title={finding.evidence.specifier}>
                              specifier: <span className="text-amber-300/90 font-medium">"{finding.evidence.specifier}"</span>
                            </span>
                          )}
                        </div>
                        {snippet && (
                          <div className="rounded bg-slate-900/90 p-2 border border-slate-800/90 text-cyan-300 font-mono text-[11px] whitespace-pre-wrap break-all leading-tight">
                            {snippet}
                          </div>
                        )}
                      </div>
                    )}

                    {finding.recommendation && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-start gap-1.5 text-xs text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-300 leading-tight">
                          {finding.recommendation}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* TAB 2: AI PR REVIEW & COMMENT GENERATOR */}
      {activeMainTab === 'ai_review' && (
        <div className="flex-1 overflow-y-auto p-4 pb-12 space-y-4">
          {/* Risk Level Alert Banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${riskConfig.bg}`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full shrink-0 ${riskConfig.dot}`}></span>
              <div>
                <h3 className="text-sm font-bold tracking-tight">{riskConfig.label}</h3>
                <p className="text-[11px] opacity-90">{riskConfig.subtext}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/40 border border-white/10">
              {summary.impactedFilesCount} Files Impacted
            </span>
          </div>

          {/* Executive Overview Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Executive Impact Assessment
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {explanationData?.executiveSummary || explanationData?.aiNarrative || 'No analysis available.'}
            </p>
          </div>

          {/* Actionable Reviewer Checklist */}
          {explanationData?.actionItems && explanationData.actionItems.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Required Actions Before Merging
              </h4>
              <ul className="space-y-2">
                {explanationData.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-normal">
                    <span className="w-4 h-4 rounded border border-slate-700 bg-slate-900 shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* GitHub PR Comment Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                GitHub PR Markdown Comment
              </h4>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Copied! 🎉</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy PR Comment</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-2.5">
              Paste this markdown report directly into GitHub PR review comments or CI bot scripts.
            </p>

            <pre className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap select-all">
              {explanationData?.prCommentMarkdown || 'Generating markdown...'}
            </pre>

            {/* Quick Export Actions */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-400">Export Report:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95"
                  title="Download report as Markdown file (.md)"
                >
                  <FileDown className="w-3 h-3 text-cyan-400" />
                  <span>Markdown</span>
                </button>

                <button
                  onClick={handleDownloadJson}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95"
                  title="Download full analysis data as JSON (.json)"
                >
                  <Download className="w-3 h-3 text-purple-400" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={handlePrintPDF}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95"
                  title="Print or save report as PDF"
                >
                  <Printer className="w-3 h-3 text-emerald-400" />
                  <span>PDF / Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
