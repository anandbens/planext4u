import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TicketMessage {
  id: string;
  sender_id: string;
  sender_role: "customer" | "admin";
  sender_name: string | null;
  message: string;
  created_at: string;
}

interface Props {
  /** ID of the parent record (ticket id text or complaint uuid) */
  parentId: string;
  /** Which thread table to use */
  table: "support_ticket_messages" | "complaint_messages";
  /** FK column name on the message table */
  parentColumn: "ticket_id" | "complaint_id";
  /** Logged-in sender id (customer id or admin user id) */
  senderId: string;
  /** Display name for the sender */
  senderName: string;
  /** Whether the current viewer is admin (controls bubble alignment) */
  viewerRole: "customer" | "admin";
  /** When admin posts, which sender_role to write */
  postAsRole: "customer" | "admin";
  /** Optional placeholder height */
  className?: string;
}

export function TicketChatThread({
  parentId, table, parentColumn, senderId, senderName, viewerRole, postAsRole, className,
}: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from(table).select("*").eq(parentColumn, parentId)
      .order("created_at", { ascending: true });
    if (!error) setMessages(data || []);
    setLoading(false);
    queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [parentId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${table}-${parentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${parentColumn}=eq.${parentId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as TicketMessage];
          });
          queueMicrotask(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [parentId, table, parentColumn]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    const { error } = await (supabase as any).from(table).insert({
      [parentColumn]: parentId,
      sender_id: senderId,
      sender_role: postAsRole,
      sender_name: senderName,
      message: text,
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send: " + error.message);
      return;
    }
    setDraft("");
  };

  return (
    <div className={cn("flex flex-col border rounded-lg bg-muted/20 overflow-hidden", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[180px] max-h-[320px]">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No replies yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === viewerRole;
            return (
              <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm",
                  isMine ? "bg-primary text-primary-foreground" : "bg-card border"
                )}>
                  <p className="text-[10px] opacity-70 mb-0.5">
                    {m.sender_role === "admin" ? "Support" : (m.sender_name || "Customer")} · {new Date(m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t p-2 flex gap-2 items-end bg-background">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a reply… (Ctrl+Enter to send)"
          rows={2}
          className="resize-none text-sm flex-1"
          maxLength={2000}
          disabled={sending}
        />
        <Button size="sm" onClick={handleSend} disabled={sending || !draft.trim()} className="gap-1">
          <Send className="h-4 w-4" /> Send
        </Button>
      </div>
    </div>
  );
}
