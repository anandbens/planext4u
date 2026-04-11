import { useState, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTC, CallStatus } from "@/hooks/useWebRTC";
import { motion, AnimatePresence } from "framer-motion";

interface CallScreenProps {
  callId: string;
  localUserId: string;
  remoteUserId: string;
  callType: "audio" | "video";
  isCaller: boolean;
  remoteProfile: { display_name?: string; avatar_url?: string; username?: string } | null;
  offer?: RTCSessionDescriptionInit | null;
  onClose: () => void;
}

export default function CallScreen({
  callId,
  localUserId,
  remoteUserId,
  callType,
  isCaller,
  remoteProfile,
  offer,
  onClose,
}: CallScreenProps) {
  const [callDuration, setCallDuration] = useState(0);

  const {
    status,
    isMuted,
    isCameraOff,
    error,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    rejectCall,
    toggleMute,
    toggleCamera,
    setError,
  } = useWebRTC({
    callId,
    localUserId,
    remoteUserId,
    callType,
    isCaller,
    onEnded: onClose,
  });

  // Start call when component mounts (for caller)
  useEffect(() => {
    if (isCaller) {
      startCall();
    }
  }, [isCaller]);

  // Call duration timer
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const displayName = remoteProfile?.display_name || remoteProfile?.username || "User";
  const avatarUrl = remoteProfile?.avatar_url;

  const getStatusText = () => {
    switch (status) {
      case "calling": return "Calling...";
      case "ringing": return "Ringing...";
      case "connected": return formatDuration(callDuration);
      case "ended": return "Call Ended";
      default: return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col"
    >
      {/* Video streams */}
      {callType === "video" && (
        <>
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover bg-muted"
          />
          {/* Local video (small overlay) */}
          <div className="absolute top-4 right-4 w-28 h-40 md:w-36 md:h-48 rounded-2xl overflow-hidden shadow-xl border-2 border-border z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover bg-muted ${isCameraOff ? "hidden" : ""}`}
            />
            {isCameraOff && (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Audio call / video call overlay content */}
      <div className={`relative z-20 flex flex-col items-center justify-between flex-1 ${callType === "video" && status === "connected" ? "" : "bg-gradient-to-b from-background to-muted"}`}>
        {/* Top section - User info */}
        <div className="flex flex-col items-center pt-20 gap-4">
          {/* Avatar */}
          <div className={`h-28 w-28 rounded-full overflow-hidden border-4 border-primary/30 shadow-2xl ${status === "calling" ? "animate-pulse" : ""}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{displayName}</h2>
            <p className="text-sm text-muted-foreground mt-1">{getStatusText()}</p>
            {callType === "video" && <p className="text-xs text-muted-foreground mt-0.5">Video Call</p>}
            {callType === "audio" && <p className="text-xs text-muted-foreground mt-0.5">Audio Call</p>}
          </div>

          {/* Audio ref (hidden for audio calls) */}
          {callType === "audio" && (
            <>
              <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mx-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1"
              onClick={() => {
                setError(null);
                if (isCaller) startCall();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="pb-12 w-full px-8">
          {/* Incoming call - not yet answered */}
          {!isCaller && status === "idle" && offer && (
            <div className="flex justify-center gap-12">
              <button
                onClick={rejectCall}
                className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="h-7 w-7 text-white" />
              </button>
              <button
                onClick={() => answerCall(offer)}
                className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg animate-pulse active:scale-95 transition-transform"
              >
                <Phone className="h-7 w-7 text-white" />
              </button>
            </div>
          )}

          {/* Active call controls */}
          {(status === "calling" || status === "connected" || (isCaller && status !== "ended")) && (
            <div className="flex justify-center gap-6">
              <button
                onClick={toggleMute}
                className={`h-14 w-14 rounded-full flex items-center justify-center shadow-md transition-colors ${isMuted ? "bg-destructive/20 text-destructive" : "bg-muted"}`}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>

              {callType === "video" && (
                <button
                  onClick={toggleCamera}
                  className={`h-14 w-14 rounded-full flex items-center justify-center shadow-md transition-colors ${isCameraOff ? "bg-destructive/20 text-destructive" : "bg-muted"}`}
                >
                  {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </button>
              )}

              <button
                onClick={endCall}
                className="h-14 w-14 rounded-full bg-destructive flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <PhoneOff className="h-6 w-6 text-white" />
              </button>
            </div>
          )}

          {/* Call ended */}
          {status === "ended" && (
            <div className="flex justify-center">
              <Button onClick={onClose} variant="outline" className="gap-2">
                <X className="h-4 w-4" /> Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
