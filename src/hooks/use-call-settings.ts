import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads admin toggles for 1-to-1 voice/video calls from platform_variables.
 * Calls are peer-to-peer over WebRTC — these flags only gate the UI buttons.
 */
export function useCallSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ["call-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_variables")
        .select("key, value")
        .in("key", ["voice_call_enabled", "video_call_enabled"]);
      const map = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
      return {
        voiceEnabled: (map.voice_call_enabled ?? "true").toLowerCase() !== "false",
        videoEnabled: (map.video_call_enabled ?? "true").toLowerCase() !== "false",
      };
    },
    staleTime: 60_000,
  });
  return {
    voiceEnabled: data?.voiceEnabled ?? true,
    videoEnabled: data?.videoEnabled ?? true,
    isLoading,
  };
}
