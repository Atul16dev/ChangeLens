import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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
  Filter,
  ArrowRightLeft,
  RotateCcw,
  Sparkles,
  Network,
  HelpCircle,
} from 'lucide-react';

function GraphViewerInternal({ graphData, onSelectNode, selectedNodeId }) {
  const nodeTypes = useMemo(() => ({ fileNode: FileNode }), []);
  const edgeTypes = useMemo(() => ({ impactEdge: ImpactEdge }), []);
  const { fitView } = useReactFlow();

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'blast_only'
  const [semanticMode, setSemanticMode] = useState('impact'); // 'impact' | 'dependency'
  const [isLayoutComputing, setIsLayoutComputing] = useState(false);

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
    <div className="w-full h-full relative bg-slate-950 overflow-hidden select-none">
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
        <Background color="#1e293b" gap={28} size={1.5} />

        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-slate-900/95 !border-slate-800 !rounded-xl !shadow-2xl !fill-slate-300 [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-800 !bottom-4 !left-4"
        />

        <MiniMap
          position="top-right"
          nodeColor={(n) => {
            if (n.data?.isChanged) return '#f59e0b';
            if (n.data?.severity === 'CRITICAL') return '#ef4444';
            if (n.data?.severity === 'HIGH') return '#f97316';
            if (n.data?.severity === 'MEDIUM') return '#eab308';
            return '#1e293b';
          }}
          maskColor="rgba(11, 15, 25, 0.85)"
          pannable={true}
          zoomable={true}
          className="!bg-slate-900 !border-slate-800 !rounded-xl !shadow-2xl !top-4 !right-4 !w-44 !h-32"
        />

        {/* TOP-LEFT TOOLBAR: CONTROLS, MODES & FILTERS */}
        <Panel position="top-left" className="m-4">
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
            {/* View Scope Toggle */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
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
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
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

            {/* Reset & Re-Layout Button */}
            <button
              onClick={handleResetLayout}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Recalculate deterministic ELK layout and center view"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLayoutComputing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </Panel>

        {/* BOTTOM-LEFT: REFINED COLOR & TIER LEGEND (SHIFTED RIGHT OF ZOOM CONTROLS) */}
        <Panel position="bottom-left" className="!mb-4 !ml-16 sm:!ml-[72px]">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2 shadow-2xl flex flex-wrap items-center gap-3.5 text-xs text-slate-300">
            <span className="font-bold text-slate-400 flex items-center gap-1 border-r border-slate-800 pr-3 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Impact Legend
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
              <span>Root Changed</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></span>
              <span>Critical Breaking</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span>Direct (Lv 1)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span>Transitive (Lv 2+)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="text-slate-500">Clean File</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
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
