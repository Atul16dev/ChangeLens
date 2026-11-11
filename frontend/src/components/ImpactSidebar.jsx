import React, { useState, useRef, useEffect } from 'react';
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
  Trash2,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { downloadText, downloadJson, printOrSavePDF } from '../utils/export.js';

const DEFAULT_SIDEBAR_WIDTH = 420;
const MIN_SIDEBAR_WIDTH = 340;
const STORAGE_KEY = 'changelens_sidebar_width';

export function ImpactSidebar({
  impactData,
  explanationData,
  selectedNodeId,
  onSelectNode,
  isSimulating,
  simulatedFile,
  simulatedChangeType = 'modified',
  onSimulateNode,
  onExitSimulation,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const [activeMainTab, setActiveMainTab] = useState('findings'); // 'findings' | 'ai_review'
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'critical' | 'direct' | 'transitive'
  const [copied, setCopied] = useState(false);
  const [findingSearchQuery, setFindingSearchQuery] = useState('');
  const [viewLayout, setViewLayout] = useState('auto'); // 'auto' | 'grid' | 'list'

  // Resizable sidebar state with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  // Calculate grid columns for findings cards based on panel width
  const effectiveGridCols = (() => {
    if (viewLayout === 'list') return 1;
    if (sidebarWidth >= 1050) return 3;
    if (sidebarWidth >= 620) return 2;
    if (viewLayout === 'grid' && sidebarWidth >= 500) return 2;
    return 1;
  })();

  const asideRef = useRef(null);
  const widthRef = useRef(sidebarWidth);
  widthRef.current = sidebarWidth;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Butter-smooth dragging handle for left divider
  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const startX = e.clientX;
    const startWidth = widthRef.current;
    let pendingWidth = startWidth;
    let rafId = null;

    const onMouseMove = (moveEvent) => {
      // Sidebar is on the right side of the screen.
      // Dragging to the LEFT (moveEvent.clientX < startX) increases the width!
      const deltaX = startX - moveEvent.clientX;
      const screenWidth = window.innerWidth;
      const minGraphSpace = 360;
      const maxWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(screenWidth - minGraphSpace, 1150));
      const proposedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxWidth, startWidth + deltaX));

      pendingWidth = proposedWidth;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (asideRef.current) {
          asideRef.current.style.width = `${pendingWidth}px`;
        }
      });
    };

    const onMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsDragging(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      setSidebarWidth(pendingWidth);
      try {
        localStorage.setItem(STORAGE_KEY, pendingWidth.toString());
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const isExpanded = sidebarWidth > 580;

  const toggleExpandWidth = () => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const targetExpandedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(screenWidth - 380, 780));
    const nextWidth = isExpanded ? DEFAULT_SIDEBAR_WIDTH : targetExpandedWidth;

    setSidebarWidth(nextWidth);
    if (asideRef.current) {
      asideRef.current.style.width = `${nextWidth}px`;
    }
    try {
      localStorage.setItem(STORAGE_KEY, nextWidth.toString());
    } catch {}
  };

  const handleDoubleClickReset = () => {
    toggleExpandWidth();
  };

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

  // Filter findings based on selected node, search query, or active tab
  const filteredFindings = allFindings.filter((finding) => {
    const file = finding.affectedFile || finding.consumerFile;
    const rootFile = finding.changedFile || finding.deletedFile;

    if (selectedNodeId) {
      const isSimulatedRoot = isSimulating && selectedNodeId === simulatedFile;
      const isFindingRoot = Boolean(rootFile && rootFile === selectedNodeId);
      const isAffectedFile = file === selectedNodeId;

      // If the selected node is the root file being simulated or changed,
      // show all findings resulting from this root file!
      if (!isSimulatedRoot && !isFindingRoot && !isAffectedFile) {
        return false;
      }
    }

    if (activeFilterTab === 'critical') return finding.severity === 'CRITICAL';
    if (activeFilterTab === 'direct') return finding.depth === 1;
    if (activeFilterTab === 'transitive') return finding.depth > 1;

    // Search query filter (instant search across file, symbol, location, or reason)
    if (findingSearchQuery.trim()) {
      const q = findingSearchQuery.trim().toLowerCase();
      const fName = (file || '').toLowerCase();
      const rName = (rootFile || '').toLowerCase();
      const reason = (finding.explanation || finding.reason || '').toLowerCase();
      const missing = (finding.missingSymbol || '').toLowerCase();
      const spec = (finding.evidence?.specifier || '').toLowerCase();
      if (
        !fName.includes(q) &&
        !rName.includes(q) &&
        !reason.includes(q) &&
        !missing.includes(q) &&
        !spec.includes(q)
      ) {
        return false;
      }
    }

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
    <>
      {/* Full-viewport Drag Overlay when resizing sidebar to prevent mouse capture loss */}
      {isDragging && (
        <div className="fixed inset-0 z-[60] cursor-col-resize select-none pointer-events-auto" />
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        ref={asideRef}
        style={{
          width: isDesktop ? `${sidebarWidth}px` : undefined,
        }}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] lg:static lg:z-auto h-full bg-white dark:bg-[#0e1422] border-l border-slate-200 dark:border-slate-700/80 flex flex-col backdrop-blur-xl shrink-0 select-none shadow-2xl relative ${
          isDragging ? 'transition-none select-none' : 'transition-[width,transform] duration-200 ease-out'
        } ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Left Edge Resizable Drag Handle (Desktop Only) */}
        {isDesktop && (
          <div
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleDoubleClickReset}
            className={`hidden lg:flex absolute top-0 -left-2 bottom-0 w-4 cursor-col-resize z-40 group items-center justify-center select-none ${
              isDragging ? 'bg-cyan-500/20' : 'hover:bg-cyan-500/10'
            }`}
            title="Drag left to widen panel • Double-click to toggle wide view"
          >
            {/* Visual border highlight line */}
            <div
              className={`w-[2px] h-full transition-colors ${
                isDragging
                  ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.9)]'
                  : 'bg-transparent group-hover:bg-cyan-500/80'
              }`}
            />

            {/* Centered Floating Grip Pill */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -left-1.5 px-0.5 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all ${
                isDragging
                  ? 'opacity-100 ring-2 ring-cyan-500 scale-110'
                  : 'opacity-0 group-hover:opacity-100 group-hover:scale-105'
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-cyan-500" />
              <span className="w-1 h-1 rounded-full bg-cyan-500" />
              <span className="w-1 h-1 rounded-full bg-cyan-500" />
            </div>

            {/* Live Width Badge during dragging */}
            {isDragging && (
              <div className="absolute top-4 -left-16 px-2 py-0.5 rounded-md bg-slate-900 text-cyan-400 border border-cyan-500/50 shadow-xl text-[10px] font-mono pointer-events-none animate-fade-in">
                {sidebarWidth}px
              </div>
            )}
          </div>
        )}

        {/* WHAT-IF SIMULATION MODE BANNER */}
        {isSimulating && (
          <div
            className={`border-b p-3 flex items-center justify-between shadow-xl transition-all ${
              simulatedChangeType === 'deleted'
                ? 'bg-rose-100 dark:bg-gradient-to-r dark:from-rose-950 dark:via-[#2f1322] dark:to-[#12162a] border-rose-300 dark:border-rose-500/60'
                : 'bg-purple-100 dark:bg-gradient-to-r dark:from-purple-950 dark:via-[#1e1538] dark:to-[#12162a] border-purple-300 dark:border-purple-500/50'
            }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className={`p-1.5 rounded-lg border shrink-0 ${
                  simulatedChangeType === 'deleted'
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400 dark:border-rose-500/40'
                    : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400 dark:border-purple-500/40'
                }`}
              >
                {simulatedChangeType === 'deleted' ? (
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-pulse" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-pulse" />
                )}
              </div>
              <div className="truncate">
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    simulatedChangeType === 'deleted' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  <span>
                    {simulatedChangeType === 'deleted'
                      ? 'Simulating File Deletion (What-If)'
                      : 'Simulating Modification (What-If)'}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full animate-ping ${
                      simulatedChangeType === 'deleted' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div
                  className={`font-mono text-xs truncate font-semibold ${
                    simulatedChangeType === 'deleted' ? 'text-rose-900 dark:text-rose-200' : 'text-purple-900 dark:text-purple-200'
                  }`}
                  title={simulatedFile}
                >
                  {simulatedFile}
                </div>
              </div>
            </div>
            <button
              onClick={onExitSimulation}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95 ${
                simulatedChangeType === 'deleted'
                  ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 dark:bg-rose-900/80 dark:hover:bg-rose-800 dark:text-rose-100 border-rose-300 dark:border-rose-500/50'
                  : 'bg-purple-100 hover:bg-purple-200 text-purple-900 dark:bg-purple-800/80 dark:hover:bg-purple-700 dark:text-purple-100 border-purple-300 dark:border-purple-500/40'
              }`}
              title="Exit simulation and return to real Git changes"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        )}

        {/* Top Main Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-[#090d18] p-2 gap-1.5">
          <button
            onClick={() => setActiveMainTab('findings')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMainTab === 'findings'
                ? 'bg-white text-slate-900 border border-slate-300 dark:bg-[#182338] dark:text-white dark:border-slate-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#131b2a]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>AST Findings</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
              {allFindings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('ai_review')}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeMainTab === 'ai_review'
                ? 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-gradient-to-r dark:from-indigo-950 dark:to-purple-950 dark:text-purple-200 dark:border-purple-500/40 shadow-sm'
                : 'text-slate-600 hover:text-purple-800 hover:bg-purple-50 dark:text-slate-300 dark:hover:text-purple-300 dark:hover:bg-purple-950/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI PR Review</span>
            {explanationData?.riskLevel && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] border font-bold ${riskConfig.bg}`}>
                {explanationData.riskLevel}
              </span>
            )}
          </button>

          {/* Desktop Width Quick Expand / Collapse Button */}
          {isDesktop && (
            <button
              type="button"
              onClick={toggleExpandWidth}
              className={`p-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                isExpanded
                  ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/80 hover:bg-cyan-100 dark:hover:bg-cyan-900/50'
                  : 'bg-white dark:bg-[#151f33] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={
                isExpanded
                  ? 'Collapse to Standard View (420px)'
                  : 'Panel Bada Karein / Wide View (120+ findings aasaani se padhne ke liye)'
              }
            >
              {isExpanded ? (
                <>
                  <ChevronsRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden xl:inline text-[11px]">Normal</span>
                </>
              ) : (
                <>
                  <ChevronsLeft className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden xl:inline text-[11px]">Expand</span>
                </>
              )}
            </button>
          )}

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      {/* TAB 1: AST FINDINGS VIEW */}
      {activeMainTab === 'findings' && (
        <>
          {/* Metrics Banner */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0d1322]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Blast Radius Impact
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white dark:bg-[#162035] text-cyan-800 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 font-semibold shadow-sm">
                {summary.totalImpactedFiles} Files Impacted
              </span>
            </div>

            {/* 4 Stat Cards – Responsive grid (4 cols when wide, 2 cols when narrow) */}
            <div className={`grid gap-2 ${sidebarWidth >= 600 ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <div
                onClick={() => setActiveFilterTab(activeFilterTab === 'critical' ? 'all' : 'critical')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  activeFilterTab === 'critical'
                    ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 dark:border-rose-500 shadow-md shadow-rose-500/20'
                    : 'bg-white dark:bg-[#141d2f] border-slate-200 dark:border-slate-700/80 hover:border-rose-400 dark:hover:border-rose-500/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Broken Imports</span>
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                </div>
                <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                  {summary.brokenImportsCount}
                </div>
              </div>

              <div
                onClick={() => setActiveFilterTab(activeFilterTab === 'direct' ? 'all' : 'direct')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  activeFilterTab === 'direct'
                    ? 'bg-orange-100 dark:bg-orange-950/80 border-orange-400 dark:border-orange-500 shadow-md shadow-orange-500/20'
                    : 'bg-white dark:bg-[#141d2f] border-slate-200 dark:border-slate-700/80 hover:border-orange-400 dark:hover:border-orange-500/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Direct (Lv 1)</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                </div>
                <div className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400 mt-1">
                  {summary.directImpactCount}
                </div>
              </div>

              <div
                onClick={() => setActiveFilterTab(activeFilterTab === 'transitive' ? 'all' : 'transitive')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  activeFilterTab === 'transitive'
                    ? 'bg-yellow-100 dark:bg-yellow-950/80 border-yellow-400 dark:border-yellow-500 shadow-md shadow-yellow-500/20'
                    : 'bg-white dark:bg-[#141d2f] border-slate-200 dark:border-slate-700/80 hover:border-yellow-400 dark:hover:border-yellow-500/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Transitive (Lv 2+)</span>
                  <Layers className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400" />
                </div>
                <div className="text-xl font-bold font-mono text-yellow-600 dark:text-yellow-400 mt-1">
                  {summary.transitiveImpactCount}
                </div>
              </div>

              <div
                onClick={() => setActiveFilterTab('all')}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  activeFilterTab === 'all' && !selectedNodeId
                    ? 'bg-cyan-100 dark:bg-cyan-950/80 border-cyan-400 dark:border-cyan-500 shadow-md shadow-cyan-500/20'
                    : 'bg-white dark:bg-[#141d2f] border-slate-200 dark:border-slate-700/80 hover:border-cyan-400 dark:hover:border-cyan-500/60 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Changed Roots</span>
                  <FileCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="text-xl font-bold font-mono text-cyan-700 dark:text-cyan-400 mt-1">
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
                    <span className="truncate">
                      {isSimulating && selectedNodeId === simulatedFile ? (
                        <span>
                          Simulated Root: <strong className="font-mono text-white">{selectedNodeId}</strong>
                        </span>
                      ) : (
                        <span>
                          Filtered: <strong className="font-mono text-white">{selectedNodeId}</strong>
                        </span>
                      )}
                    </span>
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
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded-full border ${
                                  simulatedChangeType === 'deleted'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {simulatedChangeType === 'deleted' ? 'Deleted Mode' : 'Modified Mode'}
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
                          <>
                            <button
                              onClick={() => onSimulateNode(selectedNodeId, 'modified')}
                              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1 border ${
                                simulatedChangeType === 'modified'
                                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm shadow-purple-500/30 ring-1 ring-purple-400/50'
                                  : 'bg-purple-950/60 hover:bg-purple-900 text-purple-300 border-purple-600/40'
                              }`}
                              title={`Simulate modifying ${selectedNodeId}`}
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              <span>Modify</span>
                            </button>
                            <button
                              onClick={() => onSimulateNode(selectedNodeId, 'deleted')}
                              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1 border ${
                                simulatedChangeType === 'deleted'
                                  ? 'bg-rose-700 text-white border-rose-400 shadow-sm shadow-rose-500/30 ring-1 ring-rose-400/50'
                                  : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-600/40'
                              }`}
                              title={`Simulate deleting ${selectedNodeId}`}
                            >
                              <Trash2 className="w-3 h-3 text-rose-300" />
                              <span>Delete</span>
                            </button>
                            <button
                              onClick={onExitSimulation}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600/50 transition-all active:scale-95 flex items-center gap-1"
                              title="Exit simulation"
                            >
                              <X className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          </>
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
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-500/50 hover:border-rose-400 transition-all active:scale-95 flex items-center gap-1"
                              title={`Simulate deleting ${selectedNodeId}`}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
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

          {/* Quick Search for 120+ Findings */}
          <div className="px-3.5 py-1.5 bg-slate-100/80 dark:bg-[#0a0e1a] border-b border-slate-200 dark:border-slate-700/80 flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={findingSearchQuery}
                onChange={(e) => setFindingSearchQuery(e.target.value)}
                placeholder="Search findings (file, symbol, reason)..."
                className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-white dark:bg-[#121929] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
              />
              {findingSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFindingSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {findingSearchQuery && (
              <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 shrink-0">
                {filteredFindings.length} matches
              </span>
            )}
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#0c1220] border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900 dark:text-white font-semibold">{filteredFindings.length}</strong> findings
              </span>
              <button
                onClick={handleDownloadJson}
                className="p-1 rounded text-slate-500 hover:text-purple-600 dark:text-slate-300 dark:hover:text-purple-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Download AST findings as JSON (.json)"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Grid / List Layout Switcher when sidebar is wide */}
              {sidebarWidth >= 600 && (
                <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg mr-1 border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setViewLayout('grid')}
                    className={`p-1 rounded text-[11px] transition-all cursor-pointer ${
                      effectiveGridCols > 1
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Grid View (Multi-column: Kam scroll me zyada node boxes dekhein)"
                  >
                    <LayoutGrid className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout('list')}
                    className={`p-1 rounded text-[11px] transition-all cursor-pointer ${
                      effectiveGridCols === 1
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Single Column List View"
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>
              )}

              <button
                onClick={() => setActiveFilterTab('all')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeFilterTab === 'all' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilterTab('critical')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeFilterTab === 'critical' ? 'bg-rose-700 text-white font-semibold' : 'text-slate-600 hover:text-rose-700 dark:text-slate-400 dark:hover:text-rose-300'
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setActiveFilterTab('direct')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  activeFilterTab === 'direct' ? 'bg-orange-700 text-white font-semibold' : 'text-slate-600 hover:text-orange-700 dark:text-slate-400 dark:hover:text-orange-300'
                }`}
              >
                Lv 1
              </button>
            </div>
          </div>

          {/* Findings Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 pb-12">
            {filteredFindings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400/80 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Findings Detected</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Either this file has no dependents, or it matches no active filter criteria.
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-3 transition-all duration-200 items-start ${
                  effectiveGridCols === 3
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                    : effectiveGridCols === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {filteredFindings.map((finding, idx) => {
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
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all shadow-sm flex flex-col justify-between h-full ${
                        isSelected
                          ? 'ring-2 ring-cyan-500 bg-cyan-50 dark:bg-[#16253d] border-cyan-400 dark:border-cyan-400/90 shadow-cyan-500/10'
                          : isCritical
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70 hover:border-rose-400 dark:hover:border-rose-600/90'
                          : isHigh
                          ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/70 hover:border-orange-400 dark:hover:border-orange-600/90'
                          : 'bg-white dark:bg-[#131d2e] border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600/90'
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

                        {isBrokenImport && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/60 flex items-center gap-1">
                            <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                            Broken Import
                          </span>
                        )}

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
                      <div className="font-mono text-xs font-semibold text-slate-100 truncate" title={file}>
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
                      <div className="mb-2 p-2 rounded bg-slate-50 dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-700/80 text-[11px] font-mono text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Route:</span>
                        {finding.path.map((segment, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <span className={sIdx === finding.path.length - 1 ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                              {segment.split('/').pop()}
                            </span>
                            {sIdx < finding.path.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />}
                          </React.Fragment>
                        ))}
                      </div>
                    )}

                    {finding.evidence && (line !== null || snippet) && (
                      <div className="mt-2.5 rounded-lg bg-slate-50 dark:bg-[#0a0f1d] p-2.5 border border-slate-200 dark:border-slate-700/80 font-mono text-[11px] shadow-inner">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 font-semibold">
                            <Code className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            <span>{line !== null ? `Line ${line}${column !== null ? `:${column}` : ''}` : 'Location'}</span>
                          </div>
                          {finding.evidence.specifier && (
                            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono truncate max-w-[200px]" title={finding.evidence.specifier}>
                              specifier: <span className="text-amber-700 dark:text-amber-300/90 font-medium">"{finding.evidence.specifier}"</span>
                            </span>
                          )}
                        </div>
                        {snippet && (
                          <div className="rounded bg-white dark:bg-[#0e1627] p-2 border border-slate-200 dark:border-slate-700/80 text-cyan-800 dark:text-cyan-300 font-mono text-[11px] whitespace-pre-wrap break-all leading-tight shadow-sm">
                            {snippet}
                          </div>
                        )}
                      </div>
                    )}

                    {finding.recommendation && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-800 dark:text-slate-200 leading-tight">
                          {finding.recommendation}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
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
              {summary.totalImpactedFiles} Files Impacted
            </span>
          </div>

          {/* Executive Overview Box */}
          <div className="bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Executive Impact Assessment
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              {explanationData?.executiveSummary || explanationData?.aiNarrative || 'No analysis available.'}
            </p>
          </div>

          {/* Actionable Reviewer Checklist */}
          {explanationData?.actionItems && explanationData.actionItems.length > 0 && (
            <div className="bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Required Actions Before Merging
              </h4>
              <ul className="space-y-2">
                {explanationData.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 leading-normal">
                    <span className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-[#0a0f1d] shrink-0 mt-0.5 flex items-center justify-center text-[10px] text-cyan-700 dark:text-cyan-400 font-bold">
                      {i + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* GitHub PR Comment Section */}
          <div className="bg-white dark:bg-[#131d2e] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <GitPullRequest className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
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

            <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2.5">
              Paste this markdown report directly into GitHub PR review comments or CI bot scripts.
            </p>

            <pre className="p-3 bg-slate-50 dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-700/80 rounded-lg text-[10px] font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap select-all shadow-inner">
              {explanationData?.prCommentMarkdown || 'Generating markdown...'}
            </pre>

            {/* Quick Export Actions */}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Export Report:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#182338] dark:hover:bg-[#1f2d48] text-slate-700 hover:text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-600/80 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                  title="Download report as Markdown file (.md)"
                >
                  <FileDown className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <span>Markdown</span>
                </button>

                <button
                  onClick={handleDownloadJson}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#182338] dark:hover:bg-[#1f2d48] text-slate-700 hover:text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-600/80 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                  title="Download full analysis data as JSON (.json)"
                >
                  <Download className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>JSON</span>
                </button>

                <button
                  onClick={handlePrintPDF}
                  className="px-2.5 py-1 rounded-lg bg-[#182338] hover:bg-[#1f2d48] text-slate-200 border border-slate-600/80 text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm"
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
  </>
);
}
