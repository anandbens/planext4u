import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSocketWebRTC } from "@/hooks/useSocketWebRTC";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SIGNALING_URL } from "@/lib/calls/webrtc-config";

/**
 * Standalone realtime calling page powered by a Node.js Socket.io signaling server.
 * Lives at /app/calls. Does NOT touch the existing Supabase-Realtime call flow used
 * inside Socio DMs — both run side-by-side until you decide to converge.
 */
export default function CallsPage() {
  const { customerUser } = useAuth();
  const userId = customerUser?.supabase_uid || customerUser?.id || "";

  const {
    connected, onlineUsers, incomingCall, activeCall, status,
    isMuted, isCameraOff, error, setError,
    localVideoRef, remoteVideoRef,
    initiateCall, acceptIncoming, rejectIncoming,
    toggleMute, toggleCamera, hangUp,
  } = useSocketWebRTC({
    userId,
    displayName: customerUser?.name,
    avatarUrl: (customerUser as any)?.profile_photo,
  });

  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (status !== "connected") { setDuration(0); return; }
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => { if (error) toast.error(error); }, [error]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!userId) {
    return (
      <CustomerLayout>
        <div className="p-8 text-center text-muted-foreground">Please log in to use calling.</div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Calls</h1>
            <p className="text-sm text-muted-foreground">1-to-1 voice & video over WebRTC</p>
          </div>
          <div
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}
            title={connected ? "Connected to signaling server" : `Cannot reach ${SIGNALING_URL}`}
          >
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? "Online" : "Offline"}
          </div>
        </header>

        {!connected && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-6 text-sm">
            <p className="font-medium text-destructive">Signaling server unreachable</p>
            <p className="text-muted-foreground mt-1">
              Set <code className="bg-background px-1.5 py-0.5 rounded text-xs">VITE_SIGNALING_URL</code> in your env to your Node server (see <code>server-reference/README.md</code>). Currently trying: <code className="text-xs">{SIGNALING_URL}</code>
            </p>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Online users {onlineUsers.length > 0 && <span className="text-foreground">({onlineUsers.length})</span>}
          </h2>
          {onlineUsers.length === 0 ? (
            <div className="rounded-xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
              No one else is online right now.
            </div>
          ) : (
            <ul className="space-y-2">
              {onlineUsers.map((u) => (
                <li key={u.userId} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
                  <div className="h-11 w-11 rounded-full bg-primary/15 overflow-hidden shrink-0">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-semibold">
                        {(u.displayName || u.userId).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.displayName || u.userId}</p>
                    <p className="text-xs text-green-600">● Online</p>
                  </div>
                  <button
                    onClick={() => initiateCall(u.userId, "audio", { displayName: u.displayName, avatarUrl: u.avatarUrl })}
                    disabled={!!activeCall}
                    className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
                    aria-label="Voice call"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => initiateCall(u.userId, "video", { displayName: u.displayName, avatarUrl: u.avatarUrl })}
                    disabled={!!activeCall}
                    className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
                    aria-label="Video call"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Incoming-call banner */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="fixed top-0 left-0 right-0 z-[200] p-4 safe-area-top"
          >
            <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/20 overflow-hidden shrink-0 border-2 border-primary/30">
                {incomingCall.fromProfile?.avatarUrl ? (
                  <img src={incomingCall.fromProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">
                    {(incomingCall.fromProfile?.displayName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{incomingCall.fromProfile?.displayName || "Someone"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {incomingCall.callType === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  Incoming {incomingCall.callType} call
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={rejectIncoming} className="h-12 w-12 rounded-full bg-destructive flex items-center justify-center shadow-md active:scale-95">
                  <PhoneOff className="h-5 w-5 text-white" />
                </button>
                <button onClick={acceptIncoming} className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-md animate-pulse active:scale-95">
                  <Phone className="h-5 w-5 text-primary-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active call screen */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col safe-area-top safe-area-bottom"
          >
            {activeCall.callType === "video" && (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-muted" />
                <div className="absolute top-4 right-4 w-28 h-40 md:w-36 md:h-48 rounded-2xl overflow-hidden shadow-xl border-2 border-border z-10">
                  <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover bg-muted ${isCameraOff ? "hidden" : ""}`} />
                  {isCameraOff && (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <VideoOff className="h-7 w-7 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className={`relative z-20 flex flex-col items-center justify-between flex-1 ${activeCall.callType === "video" && status === "connected" ? "" : "bg-gradient-to-b from-background to-muted"}`}>
              <div className="flex flex-col items-center pt-20 gap-4">
                <div className={`h-28 w-28 rounded-full overflow-hidden border-4 border-primary/30 shadow-2xl ${status === "calling" ? "animate-pulse" : ""}`}>
                  {activeCall.remoteProfile?.avatarUrl ? (
                    <img src={activeCall.remoteProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-4xl font-bold text-primary">
                      {(activeCall.remoteProfile?.displayName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{activeCall.remoteProfile?.displayName || "Calling…"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {status === "calling" && "Calling…"}
                    {status === "connected" && fmt(duration)}
                    {status === "ended" && "Call ended"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{activeCall.callType} call</p>
                </div>
                {activeCall.callType === "audio" && (
                  <>
                    <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
                    <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                  </>
                )}
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mx-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Dismiss
                  </Button>
                </div>
              )}

              <div className="pb-12 w-full px-8 flex justify-center gap-6">
                <button
                  onClick={toggleMute}
                  className={`h-14 w-14 rounded-full flex items-center justify-center shadow-md transition-colors ${isMuted ? "bg-destructive/20 text-destructive" : "bg-muted"}`}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
                {activeCall.callType === "video" && (
                  <button
                    onClick={toggleCamera}
                    className={`h-14 w-14 rounded-full flex items-center justify-center shadow-md transition-colors ${isCameraOff ? "bg-destructive/20 text-destructive" : "bg-muted"}`}
                    aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
                  >
                    {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                  </button>
                )}
                <button
                  onClick={hangUp}
                  className="h-14 w-14 rounded-full bg-destructive flex items-center justify-center shadow-lg active:scale-95"
                  aria-label="End call"
                >
                  <PhoneOff className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CustomerLayout>
  );
}
