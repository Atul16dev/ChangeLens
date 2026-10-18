/**
 * Frontend Graph Layout Engine
 * Uses ELK.js to compute deterministic, crossing-minimized layouts in the browser.
 */

import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

export const DEFAULT_NODE_WIDTH = 270;
export const DEFAULT_NODE_HEIGHT = 76;

export const ELK_LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'SPLINES',
  'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.spacing.nodeNode': '36',
  'elk.layered.spacing.nodeNodeBetweenLayers': '95',
  'elk.spacing.edgeNode': '25',
  'elk.spacing.edgeEdge': '18',
  'elk.layered.spacing.edgeNodeBetweenLayers': '25',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '20',
  'elk.separateConnectedComponents': 'true',
  'elk.spacing.componentComponent': '60',
  'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
};

/**
 * Computes layered layout for a set of visible nodes and edges.
 * 
 * @param {object} params
 * @param {Array} params.nodes - Nodes to layout
 * @param {Array} params.edges - Edges connecting visible nodes
 * @param {"impact" | "dependency"} [params.mode="impact"] - Semantic display mode
 * @returns {Promise<{ nodes: Array, edges: Array, bounds: object }>}
 */
export async function computeClientGraphLayout({
  nodes = [],
  edges = [],
  mode = 'impact',
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

  const elkEdges = [];
  const processedEdges = [];

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      continue;
    }

    const importer = edge.data?.importer || edge.source;
    const imported = edge.data?.imported || edge.target;
    const isImpacted = Boolean(edge.data?.isImpacted || edge.animated);
    const isDirectImpact = Boolean(edge.data?.isDirectImpact);

    let layoutSource = edge.source;
    let layoutTarget = edge.target;

    if (mode === 'impact') {
      layoutSource = imported;
      layoutTarget = importer;
    } else {
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
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'impactEdge',
      data: {
        ...edge.data,
        importer,
        imported,
        specifier: edge.data?.specifier || edge.label || '',
        mode,
        isImpacted,
        isDirectImpact,
        severity: edge.data?.severity || (isDirectImpact ? 'HIGH' : isImpacted ? 'MEDIUM' : 'NONE'),
      },
    });
  }

  const elkGraph = {
    id: 'changelens-frontend-root',
    layoutOptions: {
      ...ELK_LAYOUT_OPTIONS,
      ...customOptions,
    },
    children: nodes.map((node) => {
      const isChanged = Boolean(node.data?.isChanged);
      const isImpacted = Boolean(node.data?.isImpacted);
      const depth = node.data?.depth ?? 0;

      const nodeOptions = {};
      if (mode === 'impact') {
        if (isChanged) {
          nodeOptions['elk.partitioning.partition'] = '0';
        } else if (isImpacted) {
          nodeOptions['elk.partitioning.partition'] = String(Math.max(1, depth));
        } else {
          nodeOptions['elk.partitioning.partition'] = '99';
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

  const layoutResult = await elk.layout(elkGraph);

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
      sourcePosition: 'right',
      targetPosition: 'left',
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
