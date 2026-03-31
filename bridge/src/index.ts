import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes } from "crypto";
import { SessionManager } from "./session.js";
import type { MobileInbound, MobileOutbound } from "./types.js";

const PORT = parseInt(process.env.TANU_PORT || "4567", 10);
const HOST = process.env.TANU_HOST || "0.0.0.0";
const AUTH_TOKEN = process.env.TANU_AUTH_TOKEN || `tanu-${randomBytes(16).toString("base64url")}`;
const DEFAULT_CWD = process.env.TANU_CWD || process.cwd();

const sessions = new SessionManager();

// --- HTTP Server ---

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function authenticate(req: IncomingMessage): boolean {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${AUTH_TOKEN}`) return true;

  // Also check query param for mobile WebSocket compat
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  return url.searchParams.get("token") === AUTH_TOKEN;
}

function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const path = url.pathname;

  // CORS for mobile
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check (no auth needed)
  if (path === "/health" && req.method === "GET") {
    return json(res, 200, { status: "ok", version: "1.0.0" });
  }

  // Everything else needs auth
  if (!authenticate(req)) {
    return json(res, 401, { error: "Unauthorized" });
  }

  // Create session
  if (path === "/sessions" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { cwd } = body ? JSON.parse(body) : {};
        const { sessionId } = sessions.createSession(cwd || DEFAULT_CWD);
        return json(res, 201, {
          session_id: sessionId,
          ws_url: `ws://${req.headers.host}/ws/${sessionId}?token=${AUTH_TOKEN}`,
        });
      } catch (err: any) {
        return json(res, 500, { error: err.message });
      }
    });
    return;
  }

  // List sessions
  if (path === "/sessions" && req.method === "GET") {
    return json(res, 200, { sessions: sessions.listSessions() });
  }

  // Delete session
  const deleteMatch = path.match(/^\/sessions\/([^/]+)$/);
  if (deleteMatch && req.method === "DELETE") {
    sessions.destroySession(deleteMatch[1]);
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: "Not found" });
}

const server = createServer(handleRequest);

// --- WebSocket Server ---

const wss = new WebSocketServer({ server, path: undefined });

// Handle upgrade manually so we can route /ws/:sessionId
server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/ws\/([^/]+)$/);

  if (!match) {
    socket.destroy();
    return;
  }

  if (!authenticate(req)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const sessionId = match[1];
  const session = sessions.getSession(sessionId);

  if (!session) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, sessionId);
  });
});

wss.on("connection", (ws: WebSocket, _req: IncomingMessage, sessionId: string) => {
  console.log(`[ws] client connected to session ${sessionId.slice(0, 8)}`);

  const send = (msg: MobileOutbound) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  // Send initial connected status
  send({ type: "status", status: "connected" });

  // Forward CLI messages to mobile
  const onMessage = (msg: MobileOutbound) => send(msg);
  const onStatus = (msg: MobileOutbound) => send(msg);

  sessions.on(`message:${sessionId}`, onMessage);
  sessions.on(`status:${sessionId}`, onStatus);

  // Handle mobile -> CLI messages
  ws.on("message", (raw) => {
    try {
      const msg: MobileInbound = JSON.parse(raw.toString());

      switch (msg.type) {
        case "user_message":
          sessions.sendMessage(sessionId, msg.content);
          send({ type: "status", status: "thinking" });
          break;

        case "permission_response":
          sessions.sendPermissionResponse(sessionId, msg.request_id, msg.behavior);
          break;

        case "interrupt":
          sessions.sendInterrupt(sessionId);
          break;

        default:
          console.log(`[ws] unknown mobile message type:`, (msg as any).type);
      }
    } catch (err) {
      console.error("[ws] bad message from mobile:", err);
    }
  });

  ws.on("close", () => {
    console.log(`[ws] client disconnected from session ${sessionId.slice(0, 8)}`);
    sessions.removeListener(`message:${sessionId}`, onMessage);
    sessions.removeListener(`status:${sessionId}`, onStatus);
  });
});

// --- Start ---

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("========================================");
  console.log("  Tanu Bridge Server");
  console.log("========================================");
  console.log(`  URL:   http://${HOST}:${PORT}`);
  console.log(`  Token: ${AUTH_TOKEN}`);
  console.log(`  CWD:   ${DEFAULT_CWD}`);
  console.log("========================================");
  console.log("");
  console.log("Connect your mobile app using:");
  console.log(`  http://<your-ip>:${PORT}?token=${AUTH_TOKEN}`);
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  for (const s of sessions.listSessions()) {
    sessions.destroySession(s.id);
  }
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  for (const s of sessions.listSessions()) {
    sessions.destroySession(s.id);
  }
  server.close();
  process.exit(0);
});
