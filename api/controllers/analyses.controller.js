import path from "node:path";
import { scanRepository } from "../../analyzer/repository-scanner.js";
import { resolveRepositoryDependencies } from "../../analyzer/dependency-resolver.js";
import { buildDependencyGraph } from "../../analyzer/dependency-graph.js";
import { classifyImpactPolicies } from "../../analyzer/change-classifier.js";
import { generateImpactExplanation } from "../../analyzer/ai-explainer.js";
import { computeGraphLayout } from "../../analyzer/graph-layout.js";
import { isGitRepository, getWorkingTreeChanges, getCommitDiff } from "../../analyzer/local-git.js";
import { analysesStore } from "../store.js";

/**
 * Formats in-memory graph nodes and edges using ELK.js layered layout.
 * Provides deterministic positions, crossing minimization, and rich semantic edge metadata.
 */
async function formatReactFlowGraph(graph, impactAnalysis, changedFilesSet) {
  const impactedFilesMap = new Map();
  for (const f of impactAnalysis.allFindings) {
    if (f.affectedFile) {
      impactedFilesMap.set(f.affectedFile, {
        severity: f.severity,
        depth: f.depth,
      });
    }
  }

  // 1. Build initial React Flow nodes
  const rawNodes = graph.nodes.map((nodePath) => {
    const fileName = path.basename(nodePath);
    const isChanged = changedFilesSet.has(nodePath);
    const impactInfo = impactedFilesMap.get(nodePath);
    const isImpacted = Boolean(impactInfo);

    return {
      id: nodePath,
      type: "fileNode",
      data: {
        label: fileName,
        fullPath: nodePath,
        isChanged,
        isImpacted,
        severity: impactInfo?.severity || (isChanged ? "CHANGED" : "NONE"),
        depth: impactInfo?.depth || 0,
      },
      position: { x: 50, y: 50 },
    };
  });

  // 2. Build initial React Flow edges with rich semantic metadata
  const rawEdges = graph.edges.map((edge, idx) => {
    const sourceImpact = impactedFilesMap.get(edge.source);
    const targetImpact = impactedFilesMap.get(edge.target);
    const isSourceChanged = changedFilesSet.has(edge.source);
    const isTargetChanged = changedFilesSet.has(edge.target);

    const isEdgeImpacted = Boolean(sourceImpact || isSourceChanged || targetImpact || isTargetChanged);
    const isDirectImpact = isTargetChanged || isSourceChanged;

    return {
      id: `edge_${idx}_${edge.source}->${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.specifier,
      animated: isEdgeImpacted,
      data: {
        importer: edge.source,
        imported: edge.target,
        specifier: edge.specifier,
        isImpacted: isEdgeImpacted,
        isDirectImpact,
        impactLevel: isDirectImpact ? "direct" : isEdgeImpacted ? "transitive" : "none",
        severity: isTargetChanged ? (impactedFilesMap.get(edge.source)?.severity || "HIGH") : "NONE",
      },
      style: {
        stroke: isDirectImpact ? "#f97316" : isEdgeImpacted ? "#f59e0b" : "#475569",
        strokeWidth: isEdgeImpacted ? 2 : 1,
        opacity: isEdgeImpacted ? 1 : 0.35,
      },
    };
  });

  // 3. Compute deterministic ELK layered layout
  const layoutResult = await computeGraphLayout({
    nodes: rawNodes,
    edges: rawEdges,
    mode: "impact",
  });

  return {
    nodes: layoutResult.nodes,
    edges: layoutResult.edges,
    bounds: layoutResult.bounds,
  };
}

/**
 * POST /api/v1/analyze
 * Initiates repository and change impact analysis.
 */
export async function runAnalysis(req, res, next) {
  try {
    const {
      repoPath,
      changedFiles: userChangedFiles,
      baseRef,
      maxDepth = 10,
    } = req.body || {};

    // Default to sample mern repository if no path is passed
    const targetDir = repoPath
      ? path.resolve(repoPath)
      : path.resolve(process.cwd(), "tests/fixtures/mern-sample");

    let changes = [];
    const changedFilesSet = new Set();

    // 1. Determine changed files
    if (Array.isArray(userChangedFiles) && userChangedFiles.length > 0) {
      changes = userChangedFiles.map((p) => ({
        path: p.split("\\").join("/").replace(/^\.\//, ""),
        status: "modified",
        statusCode: "M",
      }));
      for (const p of userChangedFiles) {
        changedFilesSet.add(p.split("\\").join("/").replace(/^\.\//, ""));
      }
    } else {
      // Try detecting Git changes
      const isGit = await isGitRepository(targetDir);
      if (isGit) {
        const gitResult = baseRef
          ? await getCommitDiff({ directoryPath: targetDir, baseRef })
          : await getWorkingTreeChanges(targetDir);

        changes = gitResult.changes;
        for (const c of changes) {
          changedFilesSet.add(c.path);
        }
      }
    }

    // 2. Scan repository ASTs
    const scanReport = await scanRepository(targetDir);

    // 3. Resolve module dependencies
    const dependencies = resolveRepositoryDependencies(scanReport);

    // 4. Build directed dependency graph
    const allFiles = scanReport.files.map((f) => f.path.split(path.sep).join("/"));
    const graph = buildDependencyGraph(dependencies, allFiles);

    // 5. Apply change status impact policies (Reverse BFS)
    const impactAnalysis = classifyImpactPolicies({
      changes,
      graph,
      maxDepth,
    });

    // 6. Generate React Flow visual graph
    const reactFlowGraph = await formatReactFlowGraph(graph, impactAnalysis, changedFilesSet);

    // 7. Store analysis run
    const analysisId = `analysis_${Date.now()}`;
    const analysisRecord = {
      analysisId,
      targetDir,
      status: "completed",
      coverage: scanReport.coverage,
      summary: impactAnalysis.summary,
      changes,
      graph: reactFlowGraph,
      rawGraphData: {
        totalNodes: graph.nodes.length,
        totalEdges: graph.edges.length,
      },
      impactAnalysis,
    };

    analysesStore.save(analysisId, analysisRecord);

    res.status(201).json({
      success: true,
      data: {
        analysisId,
        targetDir,
        status: "completed",
        summary: impactAnalysis.summary,
        coverage: scanReport.coverage,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/analyses/:id
 * Fetches the metadata and summary of an analysis run.
 */
export function getAnalysis(req, res) {
  const { id } = req.params;
  const analysis = analysesStore.get(id);

  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: {
        code: "ANALYSIS_NOT_FOUND",
        message: `Analysis with ID "${id}" was not found.`,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      analysisId: analysis.analysisId,
      targetDir: analysis.targetDir,
      createdAt: analysis.createdAt,
      status: analysis.status,
      summary: analysis.summary,
      coverage: analysis.coverage,
      rawGraphData: analysis.rawGraphData,
    },
  });
}

/**
 * GET /api/v1/analyses/:id/graph
 * Returns React Flow compatible nodes and edges for visualization.
 */
export function getAnalysisGraph(req, res) {
  const { id } = req.params;
  const analysis = analysesStore.get(id);

  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: {
        code: "ANALYSIS_NOT_FOUND",
        message: `Analysis with ID "${id}" was not found.`,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: analysis.graph,
  });
}

/**
 * GET /api/v1/analyses/:id/impact
 * Returns prioritized impact findings and recommendations.
 */
export function getAnalysisImpact(req, res) {
  const { id } = req.params;
  const analysis = analysesStore.get(id);

  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: {
        code: "ANALYSIS_NOT_FOUND",
        message: `Analysis with ID "${id}" was not found.`,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      summary: analysis.summary,
      brokenImports: analysis.impactAnalysis.brokenImports,
      staleRenames: analysis.impactAnalysis.staleRenames,
      blastRadius: analysis.impactAnalysis.blastRadius,
      allFindings: analysis.impactAnalysis.allFindings,
    },
  });
}

/**
 * GET /api/v1/analyses
 * Lists recent analysis runs.
 */
export function listAnalyses(_req, res) {
  res.status(200).json({
    success: true,
    data: analysesStore.list(),
  });
}

/**
 * GET /api/v1/analyses/:id/explain
 * Returns AI impact explanation, risk level, and GitHub PR comment markdown.
 */
export async function getAnalysisExplanation(req, res, next) {
  try {
    const { id } = req.params;
    const analysis = analysesStore.get(id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: {
          code: "ANALYSIS_NOT_FOUND",
          message: `Analysis with ID "${id}" was not found.`,
        },
      });
    }

    const { apiKey, model, provider } = req.query || {};

    const explanation = await generateImpactExplanation({
      impactAnalysis: analysis.impactAnalysis,
      changes: analysis.changes,
      options: { apiKey, model, provider },
    });

    res.status(200).json({
      success: true,
      data: explanation,
    });
  } catch (error) {
    next(error);
  }
}
