import { Router } from "express";
import {
  getBridgeSessionStatus,
  requestBridgeChanges,
  requestBridgeScan,
  getActiveSession,
} from "../services/bridge-relay.js";
import { analysesStore } from "../store.js";
import { generateImpactExplanation } from "../../analyzer/ai-explainer.js";

export const bridgeRoutes = Router();

/**
 * GET /api/v1/bridge/status/:session
 * Checks if a local CLI agent is actively connected for the given session pairing code.
 */
bridgeRoutes.get("/status/:session", (req, res) => {
  const sessionCode = req.params.session?.trim().toUpperCase();
  if (!sessionCode) {
    return res.status(400).json({ success: false, error: "Session code is required" });
  }

  const status = getBridgeSessionStatus(sessionCode);
  return res.json({
    success: true,
    ...status,
  });
});

/**
 * GET /api/v1/bridge/changes/:session
 * Requests uncommitted Git working tree changes from the local developer laptop via tunnel.
 */
bridgeRoutes.get("/changes/:session", async (req, res) => {
  const sessionCode = req.params.session?.trim().toUpperCase();
  if (!sessionCode) {
    return res.status(400).json({ success: false, error: "Session code is required" });
  }

  try {
    const changes = await requestBridgeChanges(sessionCode);
    return res.json({
      success: true,
      sessionCode,
      changes,
    });
  } catch (err) {
    const status = err.message.startsWith("AGENT_NOT_CONNECTED") ? 404 : 504;
    return res.status(status).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/v1/bridge/scan/:session
 * Triggers AST parsing and Blast Radius calculation on the user's local machine via WebSocket tunnel.
 * Raw source code never leaves the developer's laptop!
 */
bridgeRoutes.post("/scan/:session", async (req, res) => {
  const sessionCode = req.params.session?.trim().toUpperCase();
  if (!sessionCode) {
    return res.status(400).json({ success: false, error: "Session code is required" });
  }

  const { changedFiles, maxDepth, mode } = req.body || {};

  try {
    const result = await requestBridgeScan(sessionCode, { changedFiles, maxDepth, mode });
    const session = getActiveSession(sessionCode);
    const targetDir = session?.workspace?.path || result.targetDir || "Local Workspace";
    const analysisId = result.analysisId || `analysis_local_${Date.now()}`;
    const folderName = targetDir.split(/[\\/]/).filter(Boolean).pop() || "Local Project";
    const changes = result.changes || [];
    const changedFilesList = (changes.length > 0
      ? changes.map((c) => (typeof c === "string" ? c : c.path))
      : Array.isArray(changedFiles)
      ? changedFiles
      : []
    ).filter(Boolean);

    let explanation = result.explanation || null;
    if (!explanation && result.impactAnalysis) {
      try {
        explanation = generateImpactExplanation({
          impactAnalysis: result.impactAnalysis,
          changes,
        });
      } catch {}
    }

    const analysisRecord = {
      analysisId,
      targetDir,
      title: `Local: ${folderName}`,
      changes,
      changedFiles: changedFilesList,
      graph: result.graph || { nodes: [], edges: [] },
      summary: result.summary || {
        riskLevel: result.riskLevel || "LOW",
        totalChanges: changedFilesList.length,
      },
      impactAnalysis: result.impactAnalysis || {
        brokenImports: [],
        staleRenames: [],
        blastRadius: {},
        allFindings: [],
      },
      explanation,
      source: "local-bridge",
      sessionCode,
      status: "completed",
      createdAt: new Date(),
    };

    const userId = req.user?.id || req.session?.user?.id || null;
    await analysesStore.save(analysisId, analysisRecord, userId);

    return res.json({
      success: true,
      sessionCode,
      analysisId,
      ...result,
      title: analysisRecord.title,
    });
  } catch (err) {
    const status = err.message.startsWith("AGENT_NOT_CONNECTED") ? 404 : 504;
    return res.status(status).json({
      success: false,
      error: err.message,
    });
  }
});
