import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { foodApi } from "@/lib/food-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Props {
  orderId: string;
  userId: string;
  role: 'customer' | 'rider' | 'restaurant' | 'admin';
  height?: number;
}

const QUICK_REPLIES_BY_ROLE: Record<string, string[]> = {
  customer: ["Where are you?", "Please ring the bell", "Leave at door", "I'll come down", "Thank you!"],
  rider: ["I'm on the way", "Reached restaurant", "At your gate", "Stuck in traffic", "Please share OTP"],
  restaurant: ["Order is being prepared", "Almost ready", "Out for pickup soon"],
  admin: [],
};

export function OrderChatPanel({ orderId, userId, role, height = 320 }: Props) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) return;
    foodApi.listChatMessages(orderId).then(setMessages);
    foodApi.markChatRead(orderId, userId).catch(() => {});

    const ch = supabase.channel(`food-chat-${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_order_chats', filter: `order_id=eq.${orderId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          if ((payload.new as any).sender_id !== userId) foodApi.markChatRead(orderId, userId).catch(() => {});
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (msg: string, quick = false) => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await foodApi.sendChatMessage(orderId, userId, role, msg.trim(), quick);
      setText("");
    } catch (e: any) {
      toast.error(e.message || "Couldn't send");
    } finally { setSending(false); }
  };

  const quickReplies = QUICK_REPLIES_BY_ROLE[role] || [];

  return (
    <div className="flex flex-col gap-2">
      <div ref={scrollRef} style={{ height }} className="overflow-y-auto rounded-lg bg-muted/30 p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hi to your rider 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                mine ? 'bg-primary text-primary-foreground' : 'bg-background border border-border/50'
              }`}>
                <p>{m.message}</p>
                <p className={`text-[10px] mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {quickReplies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickReplies.map(q => (
            <Button key={q} variant="outline" size="sm" className="text-xs whitespace-nowrap"
              onClick={() => send(q, true)} disabled={sending}>
              {q}
            </Button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..."
          onKeyDown={(e) => { if (e.key === 'Enter') send(text); }} disabled={sending} />
        <Button onClick={() => send(text)} disabled={sending || !text.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
