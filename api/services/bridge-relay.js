import { WebSocketServer, WebSocket } from "ws";
import { URL } from "node:url";

/**
 * In-memory registry of active bridge sessions.
 * Key: sessionCode (uppercase, e.g. "CL-7842")
 * Value: {
 *   sessionCode: string,
 *   agentWs: WebSocket | null,
 *   clientSockets: Set<WebSocket>,
 *   workspace: object | null,
 *   connectedAt: number,
 *   lastHeartbeat: number,
 *   pendingRequests: Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout }>
 * }
 */
const activeSessions = new Map();

let bridgeRelayInstance = null;

export function getBridgeRelay() {
  return bridgeRelayInstance;
}

export function getActiveSession(sessionCode) {
  if (!sessionCode) return null;
  return activeSessions.get(sessionCode.toUpperCase()) || null;
}

export function getBridgeSessionStatus(sessionCode) {
  const session = getActiveSession(sessionCode);
  if (!session || !session.agentWs || session.agentWs.readyState !== WebSocket.OPEN) {
    return {
      connected: false,
      sessionCode: sessionCode?.toUpperCase(),
      workspace: session?.workspace || null,
    };
  }
  return {
    connected: true,
    sessionCode: session.sessionCode,
    workspace: session.workspace,
    connectedAt: session.connectedAt,
    clientsCount: session.clientSockets.size,
  };
}

/**
 * Requests uncommitted Git changes from the connected local CLI agent via WebSocket tunnel.
 */
export async function requestBridgeChanges(sessionCode, timeoutMs = 12000) {
  const session = getActiveSession(sessionCode);
  if (!session || !session.agentWs || session.agentWs.readyState !== WebSocket.OPEN) {
    throw new Error(`AGENT_NOT_CONNECTED: No active CLI agent connected for session ${sessionCode}`);
  }

  const requestId = `req_changes_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      session.pendingRequests.delete(requestId);
      reject(new Error("REQUEST_TIMEOUT: Local CLI agent did not respond within timeout"));
    }, timeoutMs);

    session.pendingRequests.set(requestId, { resolve, reject, timer });

    session.agentWs.send(
      JSON.stringify({
        type: "REQUEST_CHANGES",
        requestId,
      })
    );
  });
}

/**
 * Requests Blast Radius calculation from the connected local CLI agent via WebSocket tunnel.
 * The CLI agent analyzes local ASTs and returns the dependency graph and findings.
 */
export async function requestBridgeScan(sessionCode, { changedFiles, maxDepth = 10 } = {}, timeoutMs = 45000) {
  const session = getActiveSession(sessionCode);
  if (!session || !session.agentWs || session.agentWs.readyState !== WebSocket.OPEN) {
    throw new Error(`AGENT_NOT_CONNECTED: No active CLI agent connected for session ${sessionCode}`);
  }

  const requestId = `req_scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      session.pendingRequests.delete(requestId);
      reject(new Error("REQUEST_TIMEOUT: Local CLI agent calculation timed out"));
    }, timeoutMs);

    session.pendingRequests.set(requestId, { resolve, reject, timer });

    session.agentWs.send(
      JSON.stringify({
        type: "REQUEST_SCAN",
        requestId,
        changedFiles: Array.isArray(changedFiles)
          ? changedFiles
          : typeof changedFiles === "string"
          ? changedFiles.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        maxDepth: Number(maxDepth) || 10,
      })
    );
  });
}

/**
 * Initializes the WebSocket Relay Server on top of the existing HTTP server.
 * Mounts at path: /api/v1/bridge/tunnel
 */
export function initBridgeRelay(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/api/v1/bridge/tunnel",
  });

  // Heartbeat interval to keep connections alive across proxies and firewalls
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, session] of activeSessions.entries()) {
      if (session.agentWs) {
        if (session.agentWs.readyState === WebSocket.OPEN) {
          try {
            session.agentWs.send(JSON.stringify({ type: "PING", timestamp: now }));
          } catch {
            // Socket write failed
          }
        } else if (session.agentWs.readyState === WebSocket.CLOSED) {
          session.agentWs = null;
        }
      }

      // Clean up orphaned sessions with no agent and no clients after 15 minutes
      if (!session.agentWs && session.clientSockets.size === 0 && now - session.lastHeartbeat > 15 * 60 * 1000) {
        activeSessions.delete(code);
      }
    }
  }, 20000);

  wss.on("connection", (ws, req) => {
    const parsedUrl = new URL(req.url, "http://localhost");
    const sessionCode = (parsedUrl.searchParams.get("session") || "").trim().toUpperCase();
    const role = (parsedUrl.searchParams.get("role") || "client").trim().toLowerCase(); // "agent" | "client"

    if (!sessionCode) {
      ws.send(JSON.stringify({ type: "ERROR", message: "Missing session parameter in query string" }));
      ws.close(1008, "Session code required");
      return;
    }

    // Retrieve or initialize session state
    let session = activeSessions.get(sessionCode);
    if (!session) {
      session = {
        sessionCode,
        agentWs: null,
        clientSockets: new Set(),
        workspace: null,
        connectedAt: Date.now(),
        lastHeartbeat: Date.now(),
        pendingRequests: new Map(),
      };
      activeSessions.set(sessionCode, session);
    }

    session.lastHeartbeat = Date.now();

    // ─── ROLE: LOCAL CLI AGENT ───────────────────────────────────────
    if (role === "agent") {
      // If another agent socket was already open, close it cleanly
      if (session.agentWs && session.agentWs !== ws && session.agentWs.readyState === WebSocket.OPEN) {
        try {
          session.agentWs.close(1000, "Replaced by new agent connection");
        } catch {}
      }

      session.agentWs = ws;
      session.connectedAt = Date.now();

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          session.lastHeartbeat = Date.now();

          // 1. Agent Registration & Workspace Metadata
          if (msg.type === "REGISTER_AGENT") {
            session.workspace = msg.workspace || null;
            ws.send(
              JSON.stringify({
                type: "AGENT_REGISTERED",
                sessionCode,
                status: "connected",
                workspace: session.workspace,
              })
            );

            // Notify all waiting browser clients that agent is online
            const broadcastMsg = JSON.stringify({
              type: "AGENT_CONNECTED",
              sessionCode,
              workspace: session.workspace,
            });
            for (const client of session.clientSockets) {
              if (client.readyState === WebSocket.OPEN) client.send(broadcastMsg);
            }
            return;
          }

          // 2. Pong heartbeat response
          if (msg.type === "PONG") {
            session.lastHeartbeat = Date.now();
            return;
          }

          // 3. Scan Calculation Result
          if (msg.type === "SCAN_RESULT") {
            const pending = session.pendingRequests.get(msg.requestId);
            if (pending) {
              clearTimeout(pending.timer);
              session.pendingRequests.delete(msg.requestId);
              if (msg.success) {
                pending.resolve(msg.data);
              } else {
                pending.reject(new Error(msg.error || "Blast radius calculation failed on local agent"));
              }
            }

            // Also broadcast result to any connected web client
            const scanBroadcast = JSON.stringify({
              type: "SCAN_COMPLETE",
              sessionCode,
              requestId: msg.requestId,
              success: msg.success,
              data: msg.data,
              error: msg.error,
            });
            for (const client of session.clientSockets) {
              if (client.readyState === WebSocket.OPEN) client.send(scanBroadcast);
            }
            return;
          }

          // 4. Git Changes Result
          if (msg.type === "CHANGES_RESULT") {
            const pending = session.pendingRequests.get(msg.requestId);
            if (pending) {
              clearTimeout(pending.timer);
              session.pendingRequests.delete(msg.requestId);
              if (msg.success) {
                pending.resolve(msg.data || msg.changes);
              } else {
                pending.reject(new Error(msg.error || "Failed to retrieve git changes from local agent"));
              }
            }
            return;
          }
        } catch (err) {
          console.error("Bridge Agent message parse error:", err.message);
        }
      });

      ws.on("close", () => {
        if (session.agentWs === ws) {
          session.agentWs = null;

          // Reject any pending in-flight requests
          for (const [reqId, pending] of session.pendingRequests.entries()) {
            clearTimeout(pending.timer);
            pending.reject(new Error("AGENT_DISCONNECTED: Agent socket closed unexpectedly"));
            session.pendingRequests.delete(reqId);
          }

          // Notify browser clients
          const disconnectMsg = JSON.stringify({
            type: "AGENT_DISCONNECTED",
            sessionCode,
          });
          for (const client of session.clientSockets) {
            if (client.readyState === WebSocket.OPEN) client.send(disconnectMsg);
          }
        }
      });

      return;
    }

    // ─── ROLE: WEB BROWSER CLIENT ────────────────────────────────────
    session.clientSockets.add(ws);

    // Immediately send current status to the connecting client
    const isAgentOnline = Boolean(session.agentWs && session.agentWs.readyState === WebSocket.OPEN);
    ws.send(
      JSON.stringify({
        type: "SESSION_STATUS",
        sessionCode,
        agentConnected: isAgentOnline,
        workspace: session.workspace,
      })
    );

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Client initiates scan request over WebSocket
        if (msg.type === "REQUEST_SCAN") {
          requestBridgeScan(sessionCode, msg, 45000)
            .then((result) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "SCAN_RESPONSE", requestId: msg.requestId, success: true, data: result }));
              }
            })
            .catch((err) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "SCAN_RESPONSE", requestId: msg.requestId, success: false, error: err.message }));
              }
            });
        }
      } catch (err) {
        console.error("Bridge Client message parse error:", err.message);
      }
    });

    ws.on("close", () => {
      session.clientSockets.delete(ws);
    });
  });

  bridgeRelayInstance = {
    wss,
    getActiveSessionsCount: () => activeSessions.size,
    getSession: (code) => getActiveSession(code),
    close: () => {
      clearInterval(heartbeatInterval);
      for (const session of activeSessions.values()) {
        if (session.agentWs) {
          try {
            session.agentWs.close();
          } catch {}
        }
        for (const client of session.clientSockets) {
          try {
            client.close();
          } catch {}
        }
        for (const pending of session.pendingRequests.values()) {
          clearTimeout(pending.timer);
        }
      }
      activeSessions.clear();
      return new Promise((resolve) => wss.close(resolve));
    },
  };

  return bridgeRelayInstance;
}
