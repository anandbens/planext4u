# Socket.io WebRTC Signaling Server

Stateless Node.js + Socket.io server that relays WebRTC signaling messages
(offer / answer / ICE candidates) between two peers. **No media ever touches
this server** — calls remain pure peer-to-peer.

## Quick start (local)

```bash
cd server-reference
npm install
npm run dev   # starts on http://localhost:4000
```

Then in your Lovable project's `.env` (or hosting env vars):

```
VITE_SIGNALING_URL=http://localhost:4000
```

Restart the dev server / rebuild the app.

## Deploy

This is a single-process Node app — deploy anywhere that supports
long-lived WebSocket connections:

| Host       | Steps                                                          |
|------------|----------------------------------------------------------------|
| **Render** | New → Web Service → connect repo → root: `server-reference/`. Build: `npm install`. Start: `npm start`. Free tier works. |
| **Railway**| New project → Deploy from repo → root dir `server-reference/`. |
| **Fly.io** | `fly launch` from inside `server-reference/`.                  |
| **VPS**    | `pm2 start server.js --name signaling`.                        |

After deploy, set the public URL in Lovable Cloud:
```
VITE_SIGNALING_URL=https://your-signaling.onrender.com
```

CORS is wide-open by default. Lock it down via `ALLOWED_ORIGINS` env var:
```
ALLOWED_ORIGINS=https://planext4u.lovable.app,https://www.planext4u.com
```

## Events (client ↔ server)

| Direction      | Event           | Payload                                                  |
|----------------|-----------------|----------------------------------------------------------|
| client → server| `join`          | `{ userId, displayName?, avatarUrl? }`                   |
| server → client| `presence`      | `User[]` — full online roster                            |
| client → server| `call-user`     | `{ to, callType: "audio"\|"video", offer }`              |
| server → client| `incoming-call` | `{ from, fromProfile, callType, offer, callId }`         |
| client → server| `accept-call`   | `{ callId, to, answer }`                                 |
| server → client| `call-accepted` | `{ callId, from, answer }`                               |
| client → server| `reject-call`   | `{ callId, to }`                                         |
| server → client| `call-rejected` | `{ callId, from }`                                       |
| client → server| `ice-candidate` | `{ callId, to, candidate }`                              |
| server → client| `ice-candidate` | `{ callId, from, candidate }`                            |
| client → server| `end-call`      | `{ callId, to }`                                         |
| server → client| `call-ended`    | `{ callId, from, reason? }`                              |
| server → client| `call-failed`   | `{ callId, reason }` — e.g. callee offline               |

## Scaling

For >10k concurrent users, add the Redis adapter:
```bash
npm install @socket.io/redis-adapter ioredis
```
Then mount it in `server.js` (commented example included).
