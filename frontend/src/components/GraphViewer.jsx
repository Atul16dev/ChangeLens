import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import { FileNode } from './FileNode.jsx';
import { ImpactEdge } from './ImpactEdge.jsx';
import { computeClientGraphLayout } from '../utils/layout.js';
import {
  Eye,
  Flame,
  Layers,
  Maximize2,
  Minimize2,
  Filter,
  ArrowRightLeft,
  Sparkles,
  Network,
  HelpCircle,
  Zap,
  X,
  Camera,
  Download,
  Check,
  Trash2,
} from 'lucide-react';
import { exportGraphToPng, exportGraphToSvg } from '../utils/export.js';

function GraphViewerInternal({
  graphData,
  onSelectNode,
  selectedNodeId,
  isSimulating,
  simulatedFile,
  simulatedChangeType = 'modified',
  onExitSimulation,
  children,
}) {
  const containerRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null); // 'png' | 'svg'

  const handleExportPng = async () => {
    if (!containerRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportGraphToPng(containerRef.current, `changelens-graph-${Date.now()}.png`);
      setExportSuccess('png');
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to export graph as PNG:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = async () => {
    if (!containerRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportGraphToSvg(containerRef.current, `changelens-graph-${Date.now()}.svg`);
      setExportSuccess('svg');
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (err) {
      console.error('Failed to export graph as SVG:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const nodeTypes = useMemo(() => ({ fileNode: FileNode }), []);
  const edgeTypes = useMemo(() => ({ impactEdge: ImpactEdge }), []);
  const { fitView, getViewport, setViewport } = useReactFlow();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'blast_only'
  const [semanticMode, setSemanticMode] = useState('impact'); // 'impact' | 'dependency'
  const [isLayoutComputing, setIsLayoutComputing] = useState(false);

  const lastDimensionsRef = useRef({ width: 0, height: 0 });
  const lastViewportRef = useRef({ x: 0, y: 0, zoom: 1 });

  // Record dimensions and viewport state before fullscreen transitions
  const recordCurrentViewport = useCallback(() => {
    if (containerRef.current) {
      lastDimensionsRef.current = {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      };
      lastViewportRef.current = getViewport();
    }
  }, [getViewport]);

  const toggleFullscreen = useCallback(async () => {
    try {
      recordCurrentViewport();
      const isCurrentlyFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isCurrentlyFull) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
        } else {
          // Fallback to CSS fullscreen
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed, falling back to CSS fullscreen:', err);
      setIsFullscreen((prev) => !prev);
    }
  }, [recordCurrentViewport]);

  // Listen for fullscreen changes (including pressing Escape key or browser exit)
  // Preserves exact node focus, pan position, and zoom level without resetting to fitView
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFull);

      setTimeout(() => {
        if (!containerRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        const { width: oldWidth, height: oldHeight } = lastDimensionsRef.current;
        const oldViewport = lastViewportRef.current;

        // Shift viewport offset by center delta so whatever node was in view remains centered at current zoom
        if (oldWidth > 0 && oldHeight > 0 && oldViewport) {
          const deltaX = (newWidth - oldWidth) / 2;
          const deltaY = (newHeight - oldHeight) / 2;
          setViewport(
            {
              x: oldViewport.x + deltaX,
              y: oldViewport.y + deltaY,
              zoom: oldViewport.zoom,
            },
            { duration: 250 }
          );
        }

        lastDimensionsRef.current = { width: newWidth, height: newHeight };
        lastViewportRef.current = getViewport();
      }, 100);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        recordCurrentViewport();
        setIsFullscreen(false);

        setTimeout(() => {
          if (!containerRef.current) return;
          const newWidth = containerRef.current.clientWidth;
          const newHeight = containerRef.current.clientHeight;
          const { width: oldWidth, height: oldHeight } = lastDimensionsRef.current;
          const oldViewport = lastViewportRef.current;

          if (oldWidth > 0 && oldHeight > 0 && oldViewport) {
            const deltaX = (newWidth - oldWidth) / 2;
            const deltaY = (newHeight - oldHeight) / 2;
            setViewport(
              {
                x: oldViewport.x + deltaX,
                y: oldViewport.y + deltaY,
                zoom: oldViewport.zoom,
              },
              { duration: 250 }
            );
          }

          lastDimensionsRef.current = { width: newWidth, height: newHeight };
          lastViewportRef.current = getViewport();
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, getViewport, setViewport, recordCurrentViewport]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // Compute active stats
  const totalNodesCount = graphData?.nodes?.length || 0;
  const impactedNodesCount = useMemo(() => {
    return (graphData?.nodes || []).filter((n) => n.data?.isChanged || n.data?.isImpacted).length;
  }, [graphData]);

  // Compute neighborhood (connected nodes & edges) for hover or selection
  const activeFocusId = selectedNodeId || hoveredNodeId;
  const neighborhood = useMemo(() => {
    if (!activeFocusId || !edges) return null;

    const connectedNodes = new Set([activeFocusId]);
    const connectedEdges = new Set();

    for (const edge of edges) {
      if (edge.source === activeFocusId) {
        connectedNodes.add(edge.target);
        connectedEdges.add(edge.id);
      } else if (edge.target === activeFocusId) {
        connectedNodes.add(edge.source);
        connectedEdges.add(edge.id);
      }
    }

    return { connectedNodes, connectedEdges };
  }, [activeFocusId, edges]);

  // Recalculate ELK layout whenever graphData, filterMode, or semanticMode changes
  const runLayout = useCallback(
    async (targetFilterMode = filterMode, targetSemanticMode = semanticMode) => {
      if (!graphData || !graphData.nodes) return;

      setIsLayoutComputing(true);
      try {
        // 1. Filter nodes
        const rawVisibleNodes = (graphData.nodes || []).filter((node) => {
          if (targetFilterMode === 'blast_only') {
            return Boolean(node.data?.isChanged || node.data?.isImpacted);
          }
          return true;
        });

        const visibleNodeIds = new Set(rawVisibleNodes.map((n) => n.id));

        // 2. Filter edges to only connect visible nodes
        const rawVisibleEdges = (graphData.edges || []).filter(
          (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
        );

        // 3. Compute deterministic ELK layered layout
        const layoutResult = await computeClientGraphLayout({
          nodes: rawVisibleNodes,
          edges: rawVisibleEdges,
          mode: targetSemanticMode,
        });

        // 4. Update nodes & edges with layout coordinates
        setNodes(layoutResult.nodes);
        setEdges(layoutResult.edges);

        // 5. Smoothly fit view to visible bounds
        setTimeout(() => {
          fitView({ padding: 0.18, duration: 450 });
        }, 50);
      } catch (err) {
        console.error('Failed to compute ELK layout:', err);
      } finally {
        setIsLayoutComputing(false);
      }
    },
    [graphData, filterMode, semanticMode, setNodes, setEdges, fitView]
  );

  // Initial layout on data arrival
  useEffect(() => {
    runLayout(filterMode, semanticMode);
  }, [graphData]); // Only re-run when new graphData arrives

  // Handlers for filter / mode changes
  const handleFilterToggle = (newFilter) => {
    setFilterMode(newFilter);
    runLayout(newFilter, semanticMode);
  };

  const handleSemanticModeToggle = () => {
    const nextMode = semanticMode === 'impact' ? 'dependency' : 'impact';
    setSemanticMode(nextMode);
    runLayout(filterMode, nextMode);
  };

  const handleResetLayout = () => {
    runLayout(filterMode, semanticMode);
  };

  // Node Click: Toggle selection
  const handleNodeClick = useCallback(
    (_, node) => {
      if (onSelectNode) {
        onSelectNode(node.id === selectedNodeId ? null : node.id);
      }
    },
    [onSelectNode, selectedNodeId]
  );

  // Pane Click: Clear selection
  const handlePaneClick = useCallback(() => {
    if (onSelectNode) {
      onSelectNode(null);
    }
    setHoveredNodeId(null);
  }, [onSelectNode]);

  // Apply neighborhood highlighting / dimming to active nodes
  const displayNodes = useMemo(() => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedNodeId;
      const isHighlighted = neighborhood ? neighborhood.connectedNodes.has(node.id) : false;
      const isDimmed = neighborhood ? !neighborhood.connectedNodes.has(node.id) : false;

      return {
        ...node,
        selected: isSelected,
        data: {
          ...node.data,
          isHighlighted,
          isDimmed,
        },
      };
    });
  }, [nodes, selectedNodeId, neighborhood]);

  // Apply neighborhood highlighting / dimming to active edges
  const displayEdges = useMemo(() => {
    return edges.map((edge) => {
      const isHighlighted = neighborhood ? neighborhood.connectedEdges.has(edge.id) : false;
      const isDimmed = neighborhood ? !neighborhood.connectedEdges.has(edge.id) : false;

      return {
        ...edge,
        data: {
          ...edge.data,
          isHighlighted,
          isDimmed,
        },
      };
    });
  }, [edges, neighborhood]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden select-none transition-all ${
        isFullscreen && !document.fullscreenElement ? 'fixed inset-0 z-50 w-screen h-screen' : ''
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 35%, #152136 0%, #0d1527 60%, #080d19 100%)',
      }}
    >
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onPaneClick={handlePaneClick}
        // VIRTUALIZATION & PERFORMANCE
        onlyRenderVisibleElements={true}
        panOnDrag={[0, 1, 2]}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        minZoom={0.05}
        maxZoom={3.0}
        nodesDraggable={true}
        edgesFocusable={false}
        defaultEdgeOptions={{ type: 'impactEdge' }}
      >
        <Background variant="dots" color="rgba(148, 163, 184, 0.22)" gap={24} size={1.2} />

        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-[#0f172a]/95 !border-slate-700/80 !rounded-xl !shadow-2xl !fill-slate-200 [&>button]:!bg-[#0f172a] [&>button]:!border-slate-700/80 [&>button]:!text-slate-200 hover:[&>button]:!bg-slate-800 !bottom-4 !left-4"
        >
          <ControlButton
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Cover Whole Screen (YouTube Style)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </ControlButton>
        </Controls>

        <MiniMap
          position="top-right"
          nodeColor={(n) => {
            if (n.data?.isChanged) return '#fbbf24';
            if (n.data?.severity === 'CRITICAL') return '#f43f5e';
            if (n.data?.severity === 'HIGH') return '#fb923c';
            if (n.data?.severity === 'MEDIUM') return '#facc15';
            return '#334155';
          }}
          maskColor="rgba(8, 13, 25, 0.8)"
          pannable={true}
          zoomable={true}
          className="!bg-[#0f172a] !border-slate-700/80 !rounded-xl !shadow-2xl !top-4 !right-4 !w-44 !h-32 hidden md:block"
        />

        {/* TOP-LEFT TOOLBAR: CONTROLS, MODES & FILTERS */}
        <Panel position="top-left" className="m-4">
          <div className="flex flex-wrap items-center gap-2 bg-[#0f172a]/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
            {/* View Scope Toggle */}
            <div className="flex items-center bg-[#090e1a] p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => handleFilterToggle('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  filterMode === 'all'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display complete repository dependency graph"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Full Repository ({totalNodesCount})</span>
              </button>

              <button
                onClick={() => handleFilterToggle('blast_only')}
                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  filterMode === 'blast_only'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
                title="Focus exclusively on changed file roots and impacted dependents"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Blast Radius Only ({impactedNodesCount})</span>
              </button>
            </div>

            {/* Semantic Flow Toggle */}
            <button
              onClick={handleSemanticModeToggle}
              className="px-2.5 py-1 rounded-lg bg-[#090e1a] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
              title={
                semanticMode === 'impact'
                  ? 'Showing Change Impact Flow (Root Changes ➔ Downstream Consumers)'
                  : 'Showing Code Dependency Flow (Downstream Consumers ➔ Imported Providers)'
              }
            >
              <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
              <span>
                {semanticMode === 'impact' ? 'Mode: Impact Flow (Root ➔ Consumers)' : 'Mode: Code Imports (Consumers ➔ Root)'}
              </span>
            </button>

            {/* Graph Snapshot Export (PNG & SVG) */}
            <div className="flex items-center bg-[#090e1a] p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                  exportSuccess === 'png'
                    ? 'bg-emerald-950 text-emerald-300'
                    : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-900'
                }`}
                title="Save high-resolution PNG snapshot of graph"
              >
                {exportSuccess === 'png' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{exportSuccess === 'png' ? 'Saved!' : 'PNG'}</span>
              </button>

              <button
                onClick={handleExportSvg}
                disabled={isExporting}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border-l border-slate-800 ${
                  exportSuccess === 'svg'
                    ? 'bg-emerald-950 text-emerald-300'
                    : 'text-slate-300 hover:text-purple-300 hover:bg-slate-900'
                }`}
                title="Save vector SVG of graph"
              >
                {exportSuccess === 'svg' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                )}
                <span>{exportSuccess === 'svg' ? 'Saved!' : 'SVG'}</span>
              </button>
            </div>

            {/* What-If Simulation Mode Indicator */}
            {isSimulating && (
              <div
                className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg ${
                  simulatedChangeType === 'deleted'
                    ? 'bg-gradient-to-r from-rose-950 via-[#2f1322] to-slate-950 border-rose-500/60 text-rose-200'
                    : 'bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 border-purple-500/50 text-purple-200'
                }`}
              >
                {simulatedChangeType === 'deleted' ? (
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    simulatedChangeType === 'deleted' ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {simulatedChangeType === 'deleted' ? 'Simulate (Delete):' : 'Simulation:'}
                </span>
                <span className="font-mono text-[11px] text-white truncate max-w-[140px]" title={simulatedFile}>
                  {simulatedFile?.split('/').pop()}
                </span>
                {onExitSimulation && (
                  <button
                    onClick={onExitSimulation}
                    className="ml-1 p-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Exit simulation"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </Panel>

        {/* BOTTOM-LEFT: REFINED COLOR & TIER LEGEND (SHIFTED RIGHT OF ZOOM CONTROLS) */}
        <Panel position="bottom-left" className="!mb-4 !ml-16 sm:!ml-[72px] hidden sm:block">
          <div className="bg-[#0f172a]/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl flex flex-wrap items-center gap-3.5 text-xs text-slate-300">
            <span className="font-bold text-slate-400 flex items-center gap-1 border-r border-slate-800 pr-3 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Impact Legend
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
              <span>Root Changed</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span>
              <span>Critical Breaking</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
              <span>Direct (Lv 1)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
              <span>Transitive (Lv 2+)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500/50"></span>
              <span className="text-slate-300">Clean File</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Embedded overlays like ChatAssistant that persist in fullscreen mode */}
      {children}
    </div>
  );
}

export function GraphViewer(props) {
  return (
    <ReactFlowProvider>
      <GraphViewerInternal {...props} />
    </ReactFlowProvider>
  );
}
