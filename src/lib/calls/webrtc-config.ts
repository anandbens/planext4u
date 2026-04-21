/**
 * WebRTC ICE configuration — STRICT STUN-ONLY, NO TURN FALLBACK.
 *
 * Policy (intentional, do NOT change without product approval):
 *   • Only public STUN servers are used for NAT traversal.
 *   • TURN relays are NEVER configured, even if env vars are present.
 *   • iceTransportPolicy is "all" so host/srflx candidates are tried, but
 *     because no TURN server exists in the iceServers list, calls behind
 *     symmetric NAT will simply fail rather than relay through a server.
 *
 * Rationale: TURN traffic is server-bandwidth expensive. Product decision is
 * to keep calls strictly peer-to-peer; users on symmetric NAT (rare on mobile
 * carriers, common on some corporate networks) will see the call fail and
 * should switch networks. We do not silently fall back to a relay.
 */
export function getRtcConfig(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] },
  ];
  // INTENTIONALLY no TURN servers. Do not add VITE_TURN_* handling here.
  return { iceServers, iceTransportPolicy: "all" };
}

/** Adaptive video constraints — small footprint for slow networks. */
export function getMediaConstraints(callType: "audio" | "video"): MediaStreamConstraints {
  if (callType === "audio") return { audio: true, video: false };
  return {
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: {
      facingMode: "user",
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 },
    },
  };
}

export const SIGNALING_URL =
  (import.meta.env.VITE_SIGNALING_URL as string) || "http://localhost:4000";
