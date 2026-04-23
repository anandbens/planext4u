import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

/**
 * Broadcast channels are a planned feature. We removed the hard-coded demo
 * channels and messages so the surface only shows real data — for now that
 * means an empty state until the backend tables are wired up.
 */
export default function SocialBroadcastPage() {
  const navigate = useNavigate();
  const [channels] = useState<Array<{ id: string; name: string }>>([]);

  // Stub effect — when broadcast_channels table is introduced, fetch here.
  useEffect(() => { /* no-op */ }, []);

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Broadcast Channels</h1>
          <button onClick={() => toast.info("Channel creation will launch soon")} aria-label="Create channel">
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {channels.length === 0 ? (
        <div className="py-20 px-6 text-center">
          <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold">No channels yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Broadcast channels are coming soon. Once enabled you'll be able to follow channels from creators and brands you love.
          </p>
        </div>
      ) : null}
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
