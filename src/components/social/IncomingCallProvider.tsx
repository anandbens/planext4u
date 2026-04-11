import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CallScreen from "./CallScreen";

interface IncomingCall {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: "audio" | "video";
  offer: RTCSessionDescriptionInit;
}

export default function IncomingCallProvider() {
  const { customerUser } = useAuth();
  const currentUserId = customerUser?.supabase_uid || customerUser?.id || "";
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    remoteUserId: string;
    callType: "audio" | "video";
    isCaller: boolean;
    offer?: RTCSessionDescriptionInit;
  } | null>(null);

  // Fetch caller profile
  const { data: callerProfile } = useQuery({
    queryKey: ["call-profile", incomingCall?.caller_id || activeCall?.remoteUserId],
    queryFn: async () => {
      const uid = incomingCall?.caller_id || activeCall?.remoteUserId;
      if (!uid) return null;
      const { data } = await supabase
        .from("social_profiles")
        .select("display_name, username, avatar_url")
        .eq("user_id", uid)
        .maybeSingle();
      return data;
    },
    enabled: !!(incomingCall?.caller_id || activeCall?.remoteUserId),
  });

  // Listen for incoming calls via Realtime
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `callee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const call = payload.new as any;
          if (call.status === "ringing" && call.offer) {
            setIncomingCall({
              id: call.id,
              caller_id: call.caller_id,
              callee_id: call.callee_id,
              call_type: call.call_type,
              offer: call.offer,
            });

            // Auto-dismiss after 30 seconds
            setTimeout(() => {
              setIncomingCall((prev) => {
                if (prev?.id === call.id) return null;
                return prev;
              });
            }, 30000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    setActiveCall({
      callId: incomingCall.id,
      remoteUserId: incomingCall.caller_id,
      callType: incomingCall.call_type,
      isCaller: false,
      offer: incomingCall.offer,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const rejectCall = useCallback(async () => {
    if (!incomingCall) return;
    await supabase
      .from("calls" as any)
      .update({ status: "rejected", ended_at: new Date().toISOString() })
      .eq("id", incomingCall.id);
    setIncomingCall(null);
  }, [incomingCall]);

  const closeActiveCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const displayName = callerProfile?.display_name || callerProfile?.username || "Someone";

  return (
    <>
      {/* Incoming call notification banner */}
      <AnimatePresence>
        {incomingCall && !activeCall && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[200] p-4 safe-area-top"
          >
            <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full bg-primary/20 overflow-hidden shrink-0 border-2 border-primary/30">
                  {callerProfile?.avatar_url ? (
                    <img src={callerProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{displayName}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {incomingCall.call_type === "video" ? (
                      <><Video className="h-3.5 w-3.5" /> Incoming Video Call</>
                    ) : (
                      <><Phone className="h-3.5 w-3.5" /> Incoming Audio Call</>
                    )}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={rejectCall}
                    className="h-12 w-12 rounded-full bg-destructive flex items-center justify-center shadow-md active:scale-95 transition-transform"
                  >
                    <PhoneOff className="h-5 w-5 text-white" />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center shadow-md animate-pulse active:scale-95 transition-transform"
                  >
                    <Phone className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen call screen */}
      <AnimatePresence>
        {activeCall && (
          <CallScreen
            callId={activeCall.callId}
            localUserId={currentUserId}
            remoteUserId={activeCall.remoteUserId}
            callType={activeCall.callType}
            isCaller={activeCall.isCaller}
            remoteProfile={callerProfile}
            offer={activeCall.offer}
            onClose={closeActiveCall}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Export a hook to initiate outgoing calls
export function useInitiateCall() {
  const { customerUser } = useAuth();
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    remoteUserId: string;
    callType: "audio" | "video";
  } | null>(null);

  const initiateCall = useCallback(
    async (remoteUserId: string, callType: "audio" | "video") => {
      const currentUserId = customerUser?.supabase_uid || customerUser?.id;
      if (!currentUserId) return null;

      // Create call record
      const callId = crypto.randomUUID();
      const { error } = await supabase.from("calls" as any).insert({
        id: callId,
        caller_id: currentUserId,
        callee_id: remoteUserId,
        call_type: callType,
        status: "ringing",
      });

      if (error) {
        console.error("Failed to create call:", error);
        return null;
      }

      setActiveCall({ callId, remoteUserId, callType });
      return callId;
    },
    [customerUser]
  );

  const closeCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  return { activeCall, initiateCall, closeCall };
}
