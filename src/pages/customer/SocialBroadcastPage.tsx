import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Send, Radio, Image, Mic, MoreHorizontal, Users, Settings, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_CHANNELS = [
  { id: "ch1", name: "P4U Updates", memberCount: 12400, lastMessage: "New feature launch! Check it out 🚀", time: "2h", isOwner: true, unread: 0 },
  { id: "ch2", name: "Photography Club", memberCount: 3200, lastMessage: "Weekend photo walk at Marina Beach", time: "5h", isOwner: false, unread: 3 },
  { id: "ch3", name: "Food Lovers CBE", memberCount: 8900, lastMessage: "Best biryani spots in Coimbatore 🍗", time: "1d", isOwner: false, unread: 0 },
];

const MOCK_CHANNEL_MESSAGES = [
  { id: "cm1", type: "text", text: "Hey everyone! 👋 Welcome to the channel.", time: "10:00 AM", isPinned: true },
  { id: "cm2", type: "text", text: "We're launching a new feature today that you're going to love!", time: "10:15 AM" },
  { id: "cm3", type: "poll", question: "What should we build next?", options: [{ text: "Stories filters", votes: 342 }, { text: "Live shopping", votes: 567 }, { text: "AR effects", votes: 234 }], time: "10:30 AM" },
  { id: "cm4", type: "text", text: "Stay tuned for the announcement at 3 PM IST! 🎉", time: "11:00 AM" },
  { id: "cm5", type: "product", productName: "Smart Watch Pro", price: "₹4,999", time: "11:30 AM" },
];

export default function SocialBroadcastPage() {
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const channel = MOCK_CHANNELS.find(c => c.id === activeChannel);

  if (activeChannel && channel) {
    const channelView = (
      <div className="pb-20 md:pb-8 flex flex-col h-[calc(100vh-120px)]">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setActiveChannel(null)}><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold truncate">{channel.name}</span>
                <Radio className="h-3.5 w-3.5 text-primary shrink-0" />
              </div>
              <p className="text-[10px] text-muted-foreground">{channel.memberCount.toLocaleString()} members</p>
            </div>
            <button onClick={() => toast.info("Channel settings")}><Settings className="h-5 w-5 text-muted-foreground" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MOCK_CHANNEL_MESSAGES.map(msg => (
            <div key={msg.id} className={`${msg.isPinned ? 'bg-primary/5 border border-primary/20 rounded-xl p-3' : ''}`}>
              {msg.isPinned && <span className="text-[10px] text-primary font-semibold mb-1 block">📌 Pinned</span>}
              {msg.type === 'text' && <p className="text-sm">{msg.text}</p>}
              {msg.type === 'poll' && (
                <div className="bg-card rounded-xl border border-border/30 p-3">
                  <p className="text-sm font-semibold mb-2">{msg.question}</p>
                  {msg.options?.map((opt, i) => {
                    const total = msg.options!.reduce((a, b) => a + b.votes, 0);
                    const pct = Math.round((opt.votes / total) * 100);
                    return (
                      <button key={i} className="w-full mb-1.5">
                        <div className="relative bg-muted rounded-lg overflow-hidden">
                          <div className="absolute inset-y-0 left-0 bg-primary/20" style={{ width: `${pct}%` }} />
                          <div className="relative flex items-center justify-between px-3 py-2">
                            <span className="text-xs font-medium">{opt.text}</span>
                            <span className="text-xs font-semibold">{pct}%</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground mt-1">{msg.options!.reduce((a, b) => a + b.votes, 0)} votes</p>
                </div>
              )}
              {msg.type === 'product' && (
                <div className="bg-card rounded-xl border border-border/30 p-3 flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-lg" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{msg.productName}</p>
                    <p className="text-xs text-primary font-bold">{msg.price}</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7">View</Button>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">{msg.time}</p>
            </div>
          ))}
        </div>

        {channel.isOwner && (
          <div className="border-t border-border/30 px-4 py-3 flex items-center gap-2">
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Broadcast a message..."
              className="flex-1 h-10 bg-muted/50 border-0" onKeyDown={(e) => { if (e.key === 'Enter' && newMessage.trim()) { toast.success("Message sent"); setNewMessage(""); } }} />
            <button className="p-2"><Image className="h-5 w-5 text-muted-foreground" /></button>
            <button className="p-2"><Mic className="h-5 w-5 text-muted-foreground" /></button>
            <button onClick={() => { if (newMessage.trim()) { toast.success("Message sent"); setNewMessage(""); } }}>
              <Send className="h-5 w-5 text-primary" />
            </button>
          </div>
        )}
      </div>
    );
    return <SocialLayout hideRightSidebar>{channelView}</SocialLayout>;
  }

  const listContent = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Broadcast Channels</h1>
          <button onClick={() => toast.info("Create channel coming soon")}><Plus className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="divide-y divide-border/10">
        {MOCK_CHANNELS.map(ch => (
          <button key={ch.id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors" onClick={() => setActiveChannel(ch.id)}>
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/20 text-sm font-bold">{ch.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold truncate">{ch.name}</span>
                <Radio className="h-3 w-3 text-primary shrink-0" />
                {ch.isOwner && <Badge variant="secondary" className="text-[8px] px-1">Owner</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{ch.lastMessage}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">{ch.time}</p>
              {ch.unread > 0 && (
                <span className="inline-flex h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold items-center justify-center mt-1">{ch.unread}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {MOCK_CHANNELS.length === 0 && (
        <div className="py-16 text-center">
          <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold">No channels yet</p>
          <p className="text-xs text-muted-foreground mt-1">Join or create a broadcast channel</p>
        </div>
      )}
    </div>
  );

  return <SocialLayout hideRightSidebar>{listContent}</SocialLayout>;
}
