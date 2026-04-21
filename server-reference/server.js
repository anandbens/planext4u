/**
 * P4U WebRTC Signaling Server
 * ----------------------------
 * Stateless Socket.io relay between two peers. Never touches media —
 * peers exchange SDP offer/answer + ICE candidates here, then media
 * flows directly P2P (or via TURN if you configure one client-side).
 *
 * Deploy: any host supporting long-lived WebSockets (Render/Railway/Fly/VPS).
 * Env:
 *   PORT             — defaults to 4000
 *   ALLOWED_ORIGINS  — comma-separated origins for CORS; default "*"
 */
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const PORT = process.env.PORT || 4000;
const ALLOWED = (process.env.ALLOWED_ORIGINS || "*")
  .split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: ALLOWED.length === 1 && ALLOWED[0] === "*" ? "*" : ALLOWED }));
app.get("/health", (_req, res) => res.json({ ok: true, online: users.size }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED.length === 1 && ALLOWED[0] === "*" ? "*" : ALLOWED },
  // Optional: for >10k concurrent users, mount Redis adapter:
  // adapter: createAdapter(redisPub, redisSub),
});

/** userId → { socketId, displayName, avatarUrl } */
const users = new Map();
/** socketId → userId (reverse lookup for cleanup) */
const sockets = new Map();
/** callId → { caller, callee } — track active calls so we can clean up */
const activeCalls = new Map();

function broadcastPresence() {
  const roster = [...users.entries()].map(([userId, u]) => ({
    userId, displayName: u.displayName, avatarUrl: u.avatarUrl,
  }));
  io.emit("presence", roster);
}

function findSocket(userId) {
  const u = users.get(userId);
  return u ? io.sockets.sockets.get(u.socketId) : null;
}

io.on("connection", (socket) => {
  socket.on("join", ({ userId, displayName, avatarUrl }) => {
    if (!userId) return;
    // Drop any stale registration for the same userId
    const existing = users.get(userId);
    if (existing && existing.socketId !== socket.id) {
      sockets.delete(existing.socketId);
    }
    users.set(userId, { socketId: socket.id, displayName, avatarUrl });
    sockets.set(socket.id, userId);
    socket.data.userId = userId;
    broadcastPresence();
  });

  socket.on("call-user", ({ to, callType, offer }) => {
    const callerId = socket.data.userId;
    const target = findSocket(to);
    if (!callerId || !offer) return;
    if (!target) {
      socket.emit("call-failed", { reason: "User is offline" });
      return;
    }
    const callId = randomUUID();
    activeCalls.set(callId, { caller: callerId, callee: to });
    const fromProfile = users.get(callerId);
    target.emit("incoming-call", {
      callId, from: callerId, fromProfile, callType, offer,
    });
    socket.emit("call-initiated", { callId, to });
  });

  socket.on("accept-call", ({ callId, to, answer }) => {
    const target = findSocket(to);
    if (target) target.emit("call-accepted", { callId, from: socket.data.userId, answer });
  });

  socket.on("reject-call", ({ callId, to }) => {
    const target = findSocket(to);
    if (target) target.emit("call-rejected", { callId, from: socket.data.userId });
    activeCalls.delete(callId);
  });

  socket.on("ice-candidate", ({ callId, to, candidate }) => {
    const target = findSocket(to);
    if (target) target.emit("ice-candidate", { callId, from: socket.data.userId, candidate });
  });

  socket.on("end-call", ({ callId, to }) => {
    const target = findSocket(to);
    if (target) target.emit("call-ended", { callId, from: socket.data.userId });
    activeCalls.delete(callId);
  });

  socket.on("disconnect", () => {
    const userId = sockets.get(socket.id);
    if (userId) {
      users.delete(userId);
      sockets.delete(socket.id);
      // Notify any in-flight call partners
      for (const [callId, c] of activeCalls.entries()) {
        if (c.caller === userId || c.callee === userId) {
          const otherId = c.caller === userId ? c.callee : c.caller;
          const other = findSocket(otherId);
          if (other) other.emit("call-ended", { callId, reason: "peer-disconnected" });
          activeCalls.delete(callId);
        }
      }
      broadcastPresence();
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ Signaling server listening on :${PORT}`);
  console.log(`   CORS: ${ALLOWED.join(", ") || "*"}`);
});
