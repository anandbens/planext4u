import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Video, Users, MessageCircle, ShoppingBag, Send, Heart, MoreHorizontal, Mic, MicOff, Camera, CameraOff, X, Radio } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_LIVE_COMMENTS = [
  { id: "lc1", username: "vijay_kumar", text: "This is amazing! 🔥", badge: "₹50" },
  { id: "lc2", username: "priya_designs", text: "Love this content!" },
  { id: "lc3", username: "rahul_food", text: "Can you show the product?" },
  { id: "lc4", username: "sneha_art", text: "❤️❤️❤️" },
  { id: "lc5", username: "karthik_tech", text: "Just joined!" },
];

const MOCK_PRODUCTS = [
  { id: "pr1", name: "Premium Headphones", price: "₹2,499", image: "" },
  { id: "pr2", name: "Smart Watch Pro", price: "₹4,999", image: "" },
  { id: "pr3", name: "Wireless Earbuds", price: "₹1,299", image: "" },
];

export default function SocialLivePage() {
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [comment, setComment] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [viewerCount] = useState(847);

  const startLive = () => {
    if (!title.trim()) { toast.error("Add a title for your Live"); return; }
    setIsLive(true);
    toast.success("You're now live!");
  };

  if (!isLive) {
    const setupContent = (
      <div className="pb-20 md:pb-8">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="text-lg font-bold">Go Live</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-6 space-y-6">
          <div className="aspect-[9/16] max-h-[400px] bg-muted rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <Video className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Camera preview</p>
            </div>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a title for your Live..." className="text-center" />
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Audience</p>
            <div className="flex gap-2">
              {["Public", "Close Friends", "Practice"].map(a => (
                <button key={a} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 transition-colors">{a}</button>
              ))}
            </div>
          </div>
          <Button className="w-full h-12 text-base font-bold rounded-full" onClick={startLive}>
            <Radio className="h-5 w-5 mr-2" /> Go Live
          </Button>
        </div>
      </div>
    );
    return <SocialLayout hideRightSidebar>{setupContent}</SocialLayout>;
  }

  const liveContent = (
    <div className="relative bg-black md:rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 120px)', minHeight: '500px' }}>
      {/* Live video area */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 animate-pulse">LIVE</Badge>
          <div className="flex items-center gap-1 bg-black/40 rounded-full px-2 py-1">
            <Eye className="h-3 w-3 text-white" />
            <span className="text-white text-xs font-semibold">{viewerCount}</span>
          </div>
        </div>
        <button onClick={() => { setIsLive(false); toast.info("Live ended"); navigate(-1); }}
          className="bg-black/40 rounded-full p-1.5"><X className="h-5 w-5 text-white" /></button>
      </div>

      {/* Product tray */}
      {showProducts && (
        <div className="absolute top-14 left-0 right-0 z-10 px-4">
          <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-xs font-semibold">Products</span>
              <button onClick={() => setShowProducts(false)}><X className="h-4 w-4 text-white/60" /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {MOCK_PRODUCTS.map(p => (
                <div key={p.id} className="shrink-0 bg-white/10 rounded-lg p-2 w-28">
                  <div className="h-16 bg-white/20 rounded mb-1.5" />
                  <p className="text-white text-[10px] font-semibold truncate">{p.name}</p>
                  <p className="text-white/80 text-[10px]">{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comments stream */}
      <div className="absolute bottom-28 left-0 right-16 z-10 px-4 space-y-2">
        {MOCK_LIVE_COMMENTS.map(c => (
          <div key={c.id} className="flex items-start gap-2">
            <Avatar className="h-7 w-7"><AvatarFallback className="bg-white/20 text-white text-[10px]">{c.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
            <div>
              <span className="text-white text-xs font-semibold">{c.username}</span>
              {c.badge && <Badge className="ml-1 bg-amber-500 text-white text-[8px] px-1">{c.badge}</Badge>}
              <p className="text-white/90 text-xs">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Right action bar */}
      <div className="absolute bottom-28 right-3 z-10 flex flex-col gap-4">
        <button onClick={() => setIsMuted(!isMuted)} className="bg-black/40 rounded-full p-2.5">
          {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
        </button>
        <button onClick={() => setIsCamOff(!isCamOff)} className="bg-black/40 rounded-full p-2.5">
          {isCamOff ? <CameraOff className="h-5 w-5 text-white" /> : <Camera className="h-5 w-5 text-white" />}
        </button>
        <button onClick={() => setShowProducts(!showProducts)} className="bg-black/40 rounded-full p-2.5">
          <ShoppingBag className="h-5 w-5 text-white" />
        </button>
        <button className="bg-black/40 rounded-full p-2.5" onClick={() => toast.info("More options")}>
          <MoreHorizontal className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Comment input */}
      <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-2">
        <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment..."
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm h-10 rounded-full" />
        <button onClick={() => toast.success("❤️")}><Heart className="h-6 w-6 text-white" /></button>
        <button onClick={() => { if (comment.trim()) { toast.success("Comment sent"); setComment(""); } }}><Send className="h-6 w-6 text-white" /></button>
      </div>

      {/* Center camera icon */}
      {isCamOff && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CameraOff className="h-20 w-20 text-white/30" />
        </div>
      )}
    </div>
  );

  return <SocialLayout hideRightSidebar>{liveContent}</SocialLayout>;
}

function Eye(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}
