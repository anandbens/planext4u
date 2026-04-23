import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

/**
 * Live streaming surface. The previous version rendered hard-coded demo
 * comments, products and viewer counts. Until the live infrastructure is
 * connected, we keep only the setup UI driven entirely by the user's input.
 */
export default function SocialLivePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");

  const startLive = () => {
    if (!title.trim()) { toast.error("Add a title for your Live"); return; }
    toast.info("Live streaming will be available soon");
  };

  const setupContent = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Go Live</h1>
        </div>
      </header>
      <div className="max-w-md mx-auto p-6 space-y-6">
        <div className="aspect-[9/16] max-h-[400px] bg-muted rounded-2xl flex items-center justify-center">
          <div className="text-center px-6">
            <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm font-semibold">Camera preview</p>
            <p className="text-xs text-muted-foreground mt-1">
              Live broadcasting is rolling out soon. Set up your title now and we'll notify you when it's ready.
            </p>
          </div>
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a title for your Live..."
          className="text-center"
        />
        <Button className="w-full h-12 text-base font-bold rounded-full" onClick={startLive}>
          <Radio className="h-5 w-5 mr-2" /> Notify me when Live launches
        </Button>
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{setupContent}</SocialLayout>;
}
