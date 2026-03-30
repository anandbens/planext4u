import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, MessageCircle, Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function PropertyMessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customerUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = customerUser?.customer_id || customerUser?.id || "";
  const [activeChat, setActiveChat] = useState<string | null>(searchParams.get("chat"));
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get all conversations grouped by the other party
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["propertyConversations", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("property_messages" as any).select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      const msgs = (data || []) as any[];
      // Group by other party + property
      const grouped: Record<string, { messages: any[]; otherName: string; propertyId: string; lastMessage: any; unread: number }> = {};
      msgs.forEach((m: any) => {
        const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        const key = `${otherId}_${m.property_id}`;
        if (!grouped[key]) {
          grouped[key] = { messages: [], otherName: m.sender_id === userId ? "Owner" : (m.sender_name || "User"), propertyId: m.property_id, lastMessage: m, unread: 0 };
        }
        grouped[key].messages.push(m);
        if (!m.is_read && m.receiver_id === userId) grouped[key].unread++;
      });
      return Object.entries(grouped).map(([key, val]) => ({ id: key, ...val }));
    },
    enabled: !!userId,
  });

  // Get messages for active chat
  const chatParts = activeChat?.split("_") || [];
  const chatOtherId = chatParts[0] || "";
  const chatPropertyId = chatParts.slice(1).join("_") || "";

  const { data: chatMessages } = useQuery({
    queryKey: ["chatMessages", activeChat],
    queryFn: async () => {
      if (!activeChat || !userId) return [];
      const { data } = await supabase.from("property_messages" as any).select("*")
        .eq("property_id", chatPropertyId)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${chatOtherId}),and(sender_id.eq.${chatOtherId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });
      // Mark as read
      if (data?.length) {
        await supabase.from("property_messages" as any).update({ is_read: true } as any)
          .eq("property_id", chatPropertyId).eq("sender_id", chatOtherId).eq("receiver_id", userId);
      }
      return (data || []) as any[];
    },
    enabled: !!activeChat && !!userId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("property-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "property_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["propertyConversations"] });
        queryClient.invalidateQueries({ queryKey: ["chatMessages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!message.trim() || !activeChat) return;
    const { error } = await supabase.from("property_messages" as any).insert({
      property_id: chatPropertyId,
      sender_id: userId,
      receiver_id: chatOtherId,
      sender_name: customerUser?.name || "User",
      message: message.trim(),
    } as any);
    if (error) { toast.error("Failed to send"); return; }
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["chatMessages"] });
    queryClient.invalidateQueries({ queryKey: ["propertyConversations"] });
  };

  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Login Required</h2>
          <Button className="mt-4" onClick={() => navigate("/app/login")}>Login</Button>
        </div>
      </CustomerLayout>
    );
  }

  // Chat view
  if (activeChat) {
    const conv = conversations?.find(c => c.id === activeChat);
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-4rem)]">
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
            <button onClick={() => setActiveChat(null)}><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{conv?.otherName || "Chat"}</p>
              <p className="text-[10px] text-muted-foreground">Property: {chatPropertyId.substring(0, 8)}...</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/app/find-home/${chatPropertyId}`)}>View Property</Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  m.sender_id === userId 
                    ? "bg-primary text-primary-foreground rounded-br-md" 
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}>
                  <p>{m.message}</p>
                  <p className={`text-[9px] mt-1 ${m.sender_id === userId ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border p-3 flex gap-2">
            <Input 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Type a message..." 
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleSend()} 
            />
            <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Conversations list
  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-24 md:pb-6">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Messages</h1>
        </div>

        <div className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 m-4 rounded-lg" />)
          ) : !conversations?.length ? (
            <div className="text-center py-16">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No messages yet</p>
              <p className="text-xs text-muted-foreground mt-1">Contact property owners to start a conversation</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button key={conv.id} className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex items-center gap-3"
                onClick={() => setActiveChat(conv.id)}>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{conv.otherName}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(conv.lastMessage.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.message}</p>
                </div>
                {conv.unread > 0 && (
                  <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full shrink-0">
                    {conv.unread}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
