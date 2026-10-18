/**
 * Graph Layout Engine for ChangeLens
 * 
 * Uses ELK.js (Eclipse Layout Kernel) layered algorithm to compute robust,
 * deterministic, crossing-minimized layouts for dependency and blast-radius graphs.
 * 
 * Features:
 * - Deterministic Layered DAG layout (Brandes-Koepf node placement, Layer Sweep crossing minimization)
 * - Semantic Mode Support:
 *   - 'impact': Root Changed files on Left (Layer 0) -> propagating to Impacted Dependents on Right
 *   - 'dependency': Importer files on Left -> pointing to Imported Providers on Right
 * - Adaptive spacing based on exact node dimensions (270px x 76px)
 * - Safe handling of disconnected components, multiple roots, and dense clusters
 * - Bounding box and graph statistics calculation
 */

import ELK from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export const DEFAULT_NODE_WIDTH = 270;
export const DEFAULT_NODE_HEIGHT = 76;

/**
 * Default ELK layout options tailored for ChangeLens dependency graphs.
 */
export const DEFAULT_ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "RIGHT",
  "elk.edgeRouting": "SPLINES",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.spacing.nodeNode": "36",
  "elk.layered.spacing.nodeNodeBetweenLayers": "90",
  "elk.spacing.edgeNode": "25",
  "elk.spacing.edgeEdge": "18",
  "elk.layered.spacing.edgeNodeBetweenLayers": "25",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "20",
  "elk.separateConnectedComponents": "true",
  "elk.spacing.componentComponent": "60",
  "elk.layered.compaction.postCompaction.strategy": "EDGE_LENGTH",
};

/**
 * Computes deterministic ELK layout for React Flow nodes and edges.
 * 
 * @param {object} params
 * @param {Array<object>} params.nodes - React Flow nodes array
 * @param {Array<object>} params.edges - React Flow edges array
 * @param {"impact" | "dependency"} [params.mode="impact"] - Semantic display mode
 * @param {object} [params.customOptions={}] - Optional ELK configuration overrides
 * @returns {Promise<{ nodes: Array<object>, edges: Array<object>, bounds: object }>}
 */
export async function computeGraphLayout({
  nodes = [],
  edges = [],
  mode = "impact",
  customOptions = {},
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1. Prepare edges for ELK layout based on semantic mode
  // In raw code: consumer (importer) imports provider (imported)
  // In 'impact' mode: change ripples from provider (root) -> consumer (dependent)
  // In 'dependency' mode: consumer -> provider
  const elkEdges = [];
  const processedEdges = [];

  for (const edge of edges) {
    // Only include edge if both source and target nodes are in the layout
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      continue;
    }

    const importer = edge.data?.importer || edge.source;
    const imported = edge.data?.imported || edge.target;
    const isImpacted = Boolean(edge.data?.isImpacted || edge.animated);

    let layoutSource = edge.source;
    let layoutTarget = edge.target;

    if (mode === "impact") {
      // In impact mode, flow starts from the provider (imported) towards consumer (importer)
      layoutSource = imported;
      layoutTarget = importer;
    } else {
      // In dependency mode, flow is importer -> imported
      layoutSource = importer;
      layoutTarget = imported;
    }

    elkEdges.push({
      id: edge.id,
      sources: [layoutSource],
      targets: [layoutTarget],
    });

    processedEdges.push({
      ...edge,
      source: layoutSource,
      target: layoutTarget,
      sourceHandle: "right",
      targetHandle: "left",
      data: {
        ...edge.data,
        importer,
        imported,
        specifier: edge.data?.specifier || edge.label || "",
        mode,
        isImpacted,
        semanticLabel:
          mode === "impact"
            ? isImpacted
              ? "propagates to"
              : "links to"
            : `imports "${edge.data?.specifier || edge.label || ""}"`,
      },
    });
  }

  // 2. Build ELK graph descriptor
  const elkGraph = {
    id: "changelens-root",
    layoutOptions: {
      ...DEFAULT_ELK_OPTIONS,
      ...customOptions,
    },
    children: nodes.map((node) => {
      const isChanged = Boolean(node.data?.isChanged);
      const isImpacted = Boolean(node.data?.isImpacted);
      const depth = node.data?.depth ?? 0;

      // In impact mode, set partition / layer priority to align roots and depths
      const nodeOptions = {};
      if (mode === "impact") {
        if (isChanged) {
          nodeOptions["elk.partitioning.partition"] = "0";
        } else if (isImpacted) {
          nodeOptions["elk.partitioning.partition"] = String(Math.max(1, depth));
        } else {
          nodeOptions["elk.partitioning.partition"] = "99";
        }
      }

      return {
        id: node.id,
        width: node.width || DEFAULT_NODE_WIDTH,
        height: node.height || DEFAULT_NODE_HEIGHT,
        layoutOptions: nodeOptions,
      };
    }),
    edges: elkEdges,
  };

  // 3. Execute ELK layout calculation
  const layoutResult = await elk.layout(elkGraph);

  // 4. Map calculated coordinates back to React Flow nodes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const layoutedNodes = nodes.map((originalNode) => {
    const elkNode = layoutResult.children?.find((c) => c.id === originalNode.id);
    const x = Math.round(elkNode?.x ?? originalNode.position?.x ?? 0);
    const y = Math.round(elkNode?.y ?? originalNode.position?.y ?? 0);
    const width = originalNode.width || DEFAULT_NODE_WIDTH;
    const height = originalNode.height || DEFAULT_NODE_HEIGHT;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x + width);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y + height);

    return {
      ...originalNode,
      position: { x, y },
      sourcePosition: "right",
      targetPosition: "left",
      width,
      height,
    };
  });

  const bounds = {
    minX: Number.isFinite(minX) ? minX : 0,
    maxX: Number.isFinite(maxX) ? maxX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
    maxY: Number.isFinite(maxY) ? maxY : 0,
    width: Number.isFinite(maxX - minX) ? Math.max(0, maxX - minX) : 0,
    height: Number.isFinite(maxY - minY) ? Math.max(0, maxY - minY) : 0,
  };

  return {
    nodes: layoutedNodes,
    edges: processedEdges,
    bounds,
  };
}
