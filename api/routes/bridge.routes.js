import { Router } from "express";
import {
  getBridgeSessionStatus,
  requestBridgeChanges,
  requestBridgeScan,
} from "../services/bridge-relay.js";

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

  const { changedFiles, maxDepth } = req.body || {};

  try {
    const result = await requestBridgeScan(sessionCode, { changedFiles, maxDepth });
    return res.json({
      success: true,
      sessionCode,
      ...result,
    });
  } catch (err) {
    const status = err.message.startsWith("AGENT_NOT_CONNECTED") ? 404 : 504;
    return res.status(status).json({
      success: false,
      error: err.message,
    });
  }
});
