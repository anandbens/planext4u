import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Camera, MoreHorizontal, Phone, Video, Info, Send, Image, Mic, Smile } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const MOCK_CONVERSATIONS = [
  { id: "c1", username: "vijay_kumar", displayName: "Vijay Kumar", lastMessage: "Hey! Check out this product 🔥", time: "2m", unread: 2, isOnline: true },
  { id: "c2", username: "priya_designs", displayName: "Priya Designs", lastMessage: "Thanks for the collab invite!", time: "15m", unread: 0, isOnline: true },
  { id: "c3", username: "rahul_food", displayName: "Rahul Food", lastMessage: "Sent a reel", time: "1h", unread: 1, isOnline: false },
  { id: "c4", username: "anita_travel", displayName: "Anita Travel", lastMessage: "See you there!", time: "3h", unread: 0, isOnline: false },
  { id: "c5", username: "karthik_tech", displayName: "Karthik Tech", lastMessage: "You: That's awesome 👍", time: "1d", unread: 0, isOnline: true },
  { id: "c6", username: "sneha_art", displayName: "Sneha Art", lastMessage: "Liked a message", time: "2d", unread: 0, isOnline: false },
];

const MOCK_NOTES = [
  { id: "n1", username: "vijay_kumar", content: "Feeling creative today ✨" },
  { id: "n2", username: "priya_designs", content: "Working on something big 🚀" },
];

const MOCK_MESSAGES = [
  { id: "m1", sender: "other", text: "Hey! How are you doing?", time: "10:30 AM", type: "text" },
  { id: "m2", sender: "self", text: "I'm great! Just working on some designs", time: "10:32 AM", type: "text" },
  { id: "m3", sender: "other", text: "Nice! I saw your latest post, it's amazing 🔥", time: "10:33 AM", type: "text" },
  { id: "m4", sender: "self", text: "Thanks! I spent a lot of time on it", time: "10:35 AM", type: "text" },
  { id: "m5", sender: "other", text: "Want to collab on something?", time: "10:36 AM", type: "text" },
  { id: "m6", sender: "self", text: "Absolutely! Let's discuss", time: "10:38 AM", type: "text" },
];

export default function SocialDMPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [search, setSearch] = useState("");
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [filter, setFilter] = useState<'primary' | 'requests'>('primary');

  const filteredConversations = MOCK_CONVERSATIONS.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  const activeConv = MOCK_CONVERSATIONS.find(c => c.id === activeChat);

  const sendMessage = () => {
    if (!messageText.trim()) return;
    setMessages(prev => [...prev, {
      id: `m${Date.now()}`, sender: "self", text: messageText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: "text"
    }]);
    setMessageText("");
  };

  // Chat view
  if (activeChat && activeConv) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat header */}
        <header className="sticky top-0 z-40 bg-card border-b border-border/30 px-3 py-2.5">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveChat(null)}><ArrowLeft className="h-6 w-6" /></button>
              <div className="relative">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {activeConv.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {activeConv.isOnline && (
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-card" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{activeConv.displayName}</p>
                <p className="text-[10px] text-muted-foreground">{activeConv.isOnline ? "Active now" : "Active 2h ago"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toast.info("Voice call coming soon")}><Phone className="h-5 w-5" /></button>
              <button onClick={() => toast.info("Video call coming soon")}><Video className="h-5 w-5" /></button>
              <button onClick={() => toast.info("Chat info")}><Info className="h-5 w-5" /></button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 max-w-xl mx-auto w-full">
          <div className="flex flex-col gap-2">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'self' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  msg.sender === 'self'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted rounded-bl-sm'
                }`}>
                  <p>{msg.text}</p>
                  <p className={`text-[10px] mt-0.5 ${msg.sender === 'self' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message input */}
        <div className="sticky bottom-0 bg-card border-t border-border/30 px-3 py-2 safe-area-bottom">
          <div className="flex items-center gap-2 max-w-xl mx-auto">
            <button onClick={() => toast.info("Camera")}><Camera className="h-6 w-6 text-primary" /></button>
            <div className="flex-1 relative">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Message..."
                className="rounded-full pr-20 h-10"
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button onClick={() => toast.info("Stickers")}><Smile className="h-5 w-5 text-muted-foreground" /></button>
                <button onClick={() => toast.info("Gallery")}><Image className="h-5 w-5 text-muted-foreground" /></button>
                <button onClick={() => toast.info("Voice note")}><Mic className="h-5 w-5 text-muted-foreground" /></button>
              </div>
            </div>
            {messageText.trim() ? (
              <button onClick={sendMessage}><Send className="h-6 w-6 text-primary" /></button>
            ) : (
              <button onClick={() => toast.info("Voice note")}><Mic className="h-6 w-6 text-primary" /></button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inbox view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/social")}><ArrowLeft className="h-6 w-6" /></button>
            <span className="text-lg font-bold">{customerUser?.name || "Messages"}</span>
          </div>
          <button onClick={() => toast.info("New message")}><Plus className="h-6 w-6" /></button>
        </div>
      </header>

      <div className="max-w-xl mx-auto">
        {/* Search */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="pl-9 rounded-xl bg-muted border-none h-9"
            />
          </div>
        </div>

        {/* Notes row */}
        <div className="flex gap-3 px-4 py-2 overflow-x-auto scrollbar-hide">
          <button className="flex flex-col items-center gap-1 shrink-0" onClick={() => toast.info("Set your note")}>
            <div className="h-16 w-16 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{customerUser?.name?.charAt(0) || 'Y'}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Your note</span>
          </button>
          {MOCK_NOTES.map(note => (
            <button key={note.id} className="flex flex-col items-center gap-1 shrink-0">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-bold">{note.username.charAt(0).toUpperCase()}</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-card rounded-lg px-2 py-0.5 border border-border shadow-sm">
                  <span className="text-[9px] text-foreground truncate max-w-[60px] block">{note.content.slice(0, 12)}...</span>
                </div>
              </div>
              <span className="text-[10px] mt-2">{note.username.split('_')[0]}</span>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/20 px-4">
          <button
            onClick={() => setFilter('primary')}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 ${filter === 'primary' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
          >
            Primary
          </button>
          <button
            onClick={() => setFilter('requests')}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 ${filter === 'requests' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
          >
            Requests
          </button>
        </div>

        {/* Conversations */}
        <div className="pb-20">
          {filter === 'requests' ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-muted-foreground text-sm text-center">No message requests</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveChat(conv.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {conv.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm ${conv.unread > 0 ? 'font-bold' : 'font-medium'}`}>{conv.displayName}</p>
                  <p className={`text-xs truncate ${conv.unread > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {conv.lastMessage} · {conv.time}
                  </p>
                </div>
                {conv.unread > 0 && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] text-primary-foreground font-bold">{conv.unread}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
