import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface UseWebRTCOptions {
  callId: string | null;
  localUserId: string;
  remoteUserId: string;
  callType: "audio" | "video";
  isCaller: boolean;
  onEnded?: () => void;
}

export function useWebRTC({
  callId,
  localUserId,
  remoteUserId,
  callType,
  isCaller,
  onEnded,
}: UseWebRTCOptions) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (iceChannelRef.current) supabase.removeChannel(iceChannelRef.current);
    channelRef.current = null;
    iceChannelRef.current = null;
  }, []);

  // Get media stream
  const getMedia = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video" ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      setError("Camera/microphone access denied. Please grant permissions.");
      throw err;
    }
  }, [callType]);

  // Create peer connection
  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = async (e) => {
      if (e.candidate && callId) {
        await supabase.from("call_ice_candidates" as any).insert({
          call_id: callId,
          sender_id: localUserId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setStatus("connected");
      }
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [callId, localUserId]);

  // Start call as caller
  const startCall = useCallback(async () => {
    if (!callId) return;
    setError(null);
    setStatus("calling");

    try {
      const stream = await getMedia();
      const pc = createPC();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Save offer to DB
      await supabase
        .from("calls" as any)
        .update({ offer: { type: offer.type, sdp: offer.sdp } })
        .eq("id", callId);

      // Set timeout for no answer (30 seconds)
      timeoutRef.current = setTimeout(async () => {
        if (status === "calling") {
          await supabase.from("calls" as any).update({ status: "missed", ended_at: new Date().toISOString() }).eq("id", callId);
          setStatus("ended");
          cleanup();
          onEnded?.();
        }
      }, 30000);
    } catch (err: any) {
      setError(err.message || "Failed to start call");
      setStatus("ended");
    }
  }, [callId, getMedia, createPC, cleanup, onEnded]);

  // Answer call as callee
  const answerCall = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!callId) return;
    setError(null);

    try {
      const stream = await getMedia();
      const pc = createPC();

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Save answer to DB
      await supabase
        .from("calls" as any)
        .update({
          answer: { type: answer.type, sdp: answer.sdp },
          status: "answered",
          started_at: new Date().toISOString(),
        })
        .eq("id", callId);

      setStatus("connected");
    } catch (err: any) {
      setError(err.message || "Failed to answer call");
      setStatus("ended");
    }
  }, [callId, getMedia, createPC]);

  // End call
  const endCall = useCallback(async () => {
    if (callId) {
      await supabase
        .from("calls" as any)
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", callId);
    }
    setStatus("ended");
    cleanup();
    onEnded?.();
  }, [callId, cleanup, onEnded]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (callId) {
      await supabase
        .from("calls" as any)
        .update({ status: "rejected", ended_at: new Date().toISOString() })
        .eq("id", callId);
    }
    setStatus("ended");
    cleanup();
    onEnded?.();
  }, [callId, cleanup, onEnded]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((v) => !v);
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((v) => !v);
  }, []);

  // Listen for call updates (answer, status changes)
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call-${callId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        async (payload) => {
          const updated = payload.new as any;

          // Caller receives answer
          if (isCaller && updated.answer && pcRef.current && !pcRef.current.remoteDescription) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(updated.answer));
              setStatus("connected");
            } catch (err) {
              console.error("Error setting remote description:", err);
            }
          }

          // Call ended/rejected by other party
          if (updated.status === "ended" || updated.status === "rejected" || updated.status === "missed") {
            setStatus("ended");
            cleanup();
            onEnded?.();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Listen for ICE candidates from the other party
    const iceChannel = supabase
      .channel(`ice-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_ice_candidates",
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          if (row.sender_id !== localUserId && pcRef.current) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(row.candidate));
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
        }
      )
      .subscribe();

    iceChannelRef.current = iceChannel;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(iceChannel);
    };
  }, [callId, isCaller, localUserId, cleanup, onEnded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    status,
    isMuted,
    isCameraOff,
    error,
    localVideoRef,
    remoteVideoRef,
    remoteStream: remoteStreamRef.current,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleCamera,
    setError,
  };
}
