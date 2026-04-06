import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Video, Send, Smile, Paperclip, Mic, Check, CheckCheck, Image as ImageIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

const EMOJI_QUICK = ['😀', '❤️', '😂', '👍', '🔥', '😍', '🎉', '💯'];

export default function SocioDMChatPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [currentUserId, setCurrentUserId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get auth user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
  }, []);

  // Load recipient profile
  useEffect(() => {
    if (!recipientId) return;
    supabase.from('social_profiles' as any).select('*').eq('user_id', recipientId).single()
      .then(({ data }) => {
        if (data) setRecipientProfile(data);
        else setRecipientProfile({ display_name: 'User', username: 'user', avatar_url: '' });
      });
  }, [recipientId]);

  // Find or create conversation
  useEffect(() => {
    if (!currentUserId || !recipientId) return;
    const findOrCreateConversation = async () => {
      setLoading(true);
      try {
        // Look for existing conversation containing both participants
        const { data: convos } = await supabase
          .from('social_conversations' as any)
          .select('*')
          .eq('is_group', false)
          .contains('participants', JSON.stringify([currentUserId, recipientId]));

        if (convos && convos.length > 0) {
          setConversationId(convos[0].id);
        } else {
          // Create new conversation
          const newId = crypto.randomUUID();
          const { error } = await supabase.from('social_conversations' as any).insert({
            id: newId,
            is_group: false,
            participants: [currentUserId, recipientId],
            last_message_at: new Date().toISOString(),
          });
          if (error) {
            console.error('Failed to create conversation:', error);
            toast.error('Could not start conversation');
            return;
          }
          setConversationId(newId);
        }
      } catch (err) {
        console.error('Conversation error:', err);
      } finally {
        setLoading(false);
      }
    };
    findOrCreateConversation();
  }, [currentUserId, recipientId]);

  // Load messages when conversation is found
  useEffect(() => {
    if (!conversationId) return;
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('social_messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('Failed to load messages:', error);
        return;
      }
      setMessages((data || []).map((m: any) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.content || '',
        message_type: m.message_type || 'text',
        media_url: m.media_url,
        is_read: m.is_read || false,
        created_at: m.created_at,
      })));

      // Mark unread messages as read
      if (data && data.length > 0) {
        const unreadIds = data.filter((m: any) => !m.is_read && m.sender_id !== currentUserId).map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('social_messages' as any).update({ is_read: true }).in('id', unreadIds);
        }
      }
    };
    loadMessages();
  }, [conversationId, currentUserId]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as any;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === m.id)) return prev;
            return [...prev, {
              id: m.id,
              conversation_id: m.conversation_id,
              sender_id: m.sender_id,
              content: m.content || '',
              message_type: m.message_type || 'text',
              media_url: m.media_url,
              is_read: m.is_read || false,
              created_at: m.created_at,
            }];
          });
          // Mark as read if from other user
          if (m.sender_id !== currentUserId) {
            supabase.from('social_messages' as any).update({ is_read: true }).eq('id', m.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentUserId || !recipientId || !conversationId) return;

    const msgId = crypto.randomUUID();
    const content = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);

    // Optimistic update
    const optimisticMsg: Message = {
      id: msgId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    // Insert into DB
    const { error } = await supabase.from('social_messages' as any).insert({
      id: msgId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content,
      message_type: 'text',
      is_read: false,
    });

    if (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      // Remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== msgId));
      return;
    }

    // Update conversation last_message_at
    await supabase.from('social_conversations' as any)
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);
  }, [newMessage, currentUserId, recipientId, conversationId]);

  const isMine = (msg: Message) => msg.sender_id === currentUserId;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card shrink-0">
        <button onClick={() => navigate('/app/social/messages')}><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => recipientId && navigate(`/app/social/@${recipientProfile?.username || recipientId}`)} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {recipientProfile?.avatar_url ? (
              <img src={recipientProfile.avatar_url} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold">{recipientProfile?.display_name?.charAt(0) || 'U'}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{recipientProfile?.display_name || 'User'}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" />
              {isTyping ? 'typing...' : 'End-to-end encrypted'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" onClick={() => toast.info("Voice call coming soon")}>
            <Phone className="h-5 w-5" />
          </button>
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" onClick={() => toast.info("Video call coming soon")}>
            <Video className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Encryption notice */}
      <div className="text-center py-2 px-4">
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <Lock className="h-2.5 w-2.5" />
          Messages are private between you and {recipientProfile?.display_name || 'this user'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const mine = isMine(msg);
          const showAvatar = !mine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!mine && showAvatar && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  {recipientProfile?.avatar_url ? (
                    <img src={recipientProfile.avatar_url} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold">{recipientProfile?.display_name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              )}
              {!mine && !showAvatar && <div className="w-7 shrink-0" />}
              <div className={`max-w-[75%] ${mine ? 'order-first' : ''}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[9px] text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</span>
                  {mine && (
                    msg.is_read
                      ? <CheckCheck className="h-3 w-3 text-primary" />
                      : <Check className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold">{recipientProfile?.display_name?.charAt(0)}</span>
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2.5">
              <motion.div className="flex gap-1" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
              </motion.div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji bar */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border/30 bg-card">
            <div className="flex gap-2 p-3 flex-wrap">
              {EMOJI_QUICK.map(e => (
                <button key={e} className="text-2xl hover:scale-125 transition-transform" onClick={() => setNewMessage(prev => prev + e)}>{e}</button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="border-t border-border/30 bg-card px-3 py-2.5 flex items-center gap-2 safe-area-bottom shrink-0">
        <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0" onClick={() => toast.info("Attachments coming soon")}>
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Message..."
            className="h-10 pr-10 rounded-full"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowEmoji(!showEmoji)}>
            <Smile className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        {newMessage.trim() ? (
          <button onClick={sendMessage} className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        ) : (
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0" onClick={() => toast.info("Voice notes coming soon")}>
            <Mic className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
