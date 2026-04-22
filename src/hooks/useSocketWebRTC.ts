import { useCallback, useEffect, useRef, useState } from "react";
import { SignalingClient, OnlineUser, IncomingCallPayload, CallType } from "@/lib/calls/signaling-client";
import { getRtcConfig, getMediaConstraints, SIGNALING_URL } from "@/lib/calls/webrtc-config";
import { ensureMicrophonePermission } from "@/lib/mic-permission";

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface ActiveCall {
  callId: string;
  remoteUserId: string;
  remoteProfile?: { displayName?: string; avatarUrl?: string };
  callType: CallType;
  isCaller: boolean;
}

interface UseSocketWebRTCOptions {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * One hook that runs the full Socket.io + WebRTC dance for 1-to-1 calls.
 *
 * Surfaces:
 *   • presence list (`onlineUsers`)
 *   • a ringing-incoming-call card (`incomingCall` + `acceptIncoming` / `rejectIncoming`)
 *   • an active call (`activeCall`, `status`, refs for video, mute/camera toggles)
 *   • `initiateCall(remoteUserId, callType)` to start one
 *
 * No media or signaling logic leaks into the UI layer.
 */
export function useSocketWebRTC({ userId, displayName, avatarUrl }: UseSocketWebRTCOptions) {
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const activeCallRef = useRef<ActiveCall | null>(null);
  // Suppresses errors that arrive after a call was already torn down so the
  // user never sees a stale "microphone denied" toast post-hangup.
  const endedRef = useRef(false);

  // Keep a ref in sync so socket handlers can read the latest call without re-binding.
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  // ---------- WebRTC plumbing ----------
  const cleanupPeer = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
    pcRef.current?.close();
    pcRef.current = null;
    pendingIceRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const endActiveCall = useCallback((notifyPeer = true) => {
    endedRef.current = true;
    setError(null); // suppress any in-flight permission/media error
    const call = activeCallRef.current;
    if (notifyPeer && call && signalingRef.current) {
      signalingRef.current.emit("end-call", { callId: call.callId, to: call.remoteUserId });
    }
    cleanupPeer();
    setStatus("ended");
    setActiveCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setTimeout(() => setStatus("idle"), 800);
  }, [cleanupPeer]);

  const createPeer = useCallback((callId: string, remoteUserId: string) => {
    const pc = new RTCPeerConnection(getRtcConfig());

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingRef.current?.emit("ice-candidate", {
          callId, to: remoteUserId, candidate: e.candidate.toJSON(),
        });
      }
    };
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((t) => remoteStreamRef.current.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      if (s === "connected" || s === "completed") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") {
        if (activeCallRef.current?.callId === callId) endActiveCall(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [endActiveCall]);

  const acquireLocalMedia = useCallback(async (callType: CallType) => {
    const perm = await ensureMicrophonePermission();
    if (!perm.granted) {
      const msg = perm.reason || "Microphone permission required";
      if (!endedRef.current) setError(msg);
      throw new Error(msg);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(callType));
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err: any) {
      const name: string = err?.name || "";
      let friendly = "Could not start the call. Please try again.";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        friendly = callType === "video"
          ? "Camera or microphone permission denied. Enable both in Settings → Apps → Planext4u → Permissions."
          : "Microphone permission denied. Enable it in Settings → Apps → Planext4u → Permissions.";
      } else if (name === "NotFoundError") {
        friendly = "No microphone or camera was found on this device.";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        friendly = "Your microphone or camera is being used by another app.";
      }
      if (!endedRef.current) setError(friendly);
      throw new Error(friendly);
    }
  }, []);

  // ---------- Outgoing call ----------
  const initiateCall = useCallback(async (
    remoteUserId: string,
    callType: CallType,
    remoteProfile?: { displayName?: string; avatarUrl?: string },
  ) => {
    if (!signalingRef.current?.isConnected) {
      setError("Not connected to signaling server");
      return;
    }
    setError(null);
    setStatus("calling");
    try {
      const stream = await acquireLocalMedia(callType);
      // Temporarily bind a peer with a placeholder callId; replaced when server returns one
      const tempCall: ActiveCall = { callId: "pending", remoteUserId, remoteProfile, callType, isCaller: true };
      setActiveCall(tempCall);
      activeCallRef.current = tempCall;

      const pc = createPeer("pending", remoteUserId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === "video" });
      await pc.setLocalDescription(offer);
      signalingRef.current.emit("call-user", { to: remoteUserId, callType, offer });
    } catch (e: any) {
      setError(e?.message || "Failed to start call");
      cleanupPeer();
      setStatus("idle");
      setActiveCall(null);
    }
  }, [acquireLocalMedia, createPeer, cleanupPeer]);

  // ---------- Incoming call answer/reject ----------
  const acceptIncoming = useCallback(async () => {
    const call = incomingCall;
    if (!call || !signalingRef.current) return;
    setIncomingCall(null);
    setError(null);
    setStatus("connected"); // optimistic — switches to true connected on ICE event
    try {
      const stream = await acquireLocalMedia(call.callType);
      const pc = createPeer(call.callId, call.from);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      // Drain queued ICE that arrived before we set remote description
      for (const c of pendingIceRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
      }
      pendingIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingRef.current.emit("accept-call", { callId: call.callId, to: call.from, answer });
      setActiveCall({
        callId: call.callId,
        remoteUserId: call.from,
        remoteProfile: call.fromProfile,
        callType: call.callType,
        isCaller: false,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to answer");
      cleanupPeer();
      setStatus("idle");
    }
  }, [incomingCall, acquireLocalMedia, createPeer, cleanupPeer]);

  const rejectIncoming = useCallback(() => {
    if (!incomingCall || !signalingRef.current) return;
    signalingRef.current.emit("reject-call", { callId: incomingCall.callId, to: incomingCall.from });
    setIncomingCall(null);
  }, [incomingCall]);

  // ---------- Mute / camera toggles ----------
  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    tracks.forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((v) => !v);
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    tracks.forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((v) => !v);
  }, []);

  const hangUp = useCallback(() => endActiveCall(true), [endActiveCall]);

  // ---------- Socket lifecycle ----------
  useEffect(() => {
    if (!userId) return;
    const client = new SignalingClient(SIGNALING_URL);
    signalingRef.current = client;
    const sock = client.connect({ userId, displayName, avatarUrl });

    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));

    client.on("presence", (users) => {
      // Hide self
      setOnlineUsers(users.filter((u) => u.userId !== userId));
    });

    client.on("incoming-call", (payload) => {
      // Reject if already in a call
      if (activeCallRef.current) {
        client.emit("reject-call", { callId: payload.callId, to: payload.from });
        return;
      }
      setIncomingCall(payload);
      setStatus("ringing");
    });

    client.on("call-initiated", ({ callId }) => {
      setActiveCall((prev) => {
        if (!prev) return prev;
        const next = { ...prev, callId };
        activeCallRef.current = next;
        return next;
      });
    });

    client.on("call-accepted", async ({ callId, answer }) => {
      const pc = pcRef.current;
      if (pc && !pc.remoteDescription) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          // Drain queued ICE
          for (const c of pendingIceRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
          }
          pendingIceRef.current = [];
          setStatus("connected");
          setActiveCall((prev) => prev ? { ...prev, callId } : prev);
        } catch (e: any) {
          setError(e?.message || "Failed to complete call setup");
          endActiveCall(false);
        }
      }
    });

    client.on("call-rejected", () => {
      setError("Call was declined");
      endActiveCall(false);
    });

    client.on("call-ended", () => endActiveCall(false));

    client.on("call-failed", ({ reason }) => {
      setError(reason);
      endActiveCall(false);
    });

    client.on("ice-candidate", async ({ candidate }) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (!pc.remoteDescription) {
        // Buffer until remote description is set
        pendingIceRef.current.push(candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch (e) { console.warn("ICE add failed", e); }
    });

    return () => {
      cleanupPeer();
      client.disconnect();
      signalingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    connected,
    onlineUsers,
    incomingCall,
    activeCall,
    status,
    isMuted,
    isCameraOff,
    error,
    setError,
    localVideoRef,
    remoteVideoRef,
    initiateCall,
    acceptIncoming,
    rejectIncoming,
    toggleMute,
    toggleCamera,
    hangUp,
  };
}
