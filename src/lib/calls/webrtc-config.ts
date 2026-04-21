/**
 * WebRTC ICE configuration. STUN-only by default; TURN can be added at runtime
 * by setting VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_PASS env vars.
 */
export function getRtcConfig(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUser = import.meta.env.VITE_TURN_USER as string | undefined;
  const turnPass = import.meta.env.VITE_TURN_PASS as string | undefined;
  if (turnUrl && turnUser && turnPass) {
    iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
  }
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
