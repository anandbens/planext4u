import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Video, Info, Send, Smile, Paperclip, Mic, Check, CheckCheck, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

const EMOJI_QUICK = ['😀', '❤️', '😂', '👍', '🔥', '😍', '🎉', '💯'];

export default function SocioDMChatPage() {
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const currentUserId = customerUser?.id || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientProfile, setRecipientProfile] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversationId = currentUserId && recipientId
    ? `dm_${[currentUserId, recipientId].sort().join('_')}`
    : '';

  // Load recipient profile
  useEffect(() => {
    if (!recipientId) return;
    supabase.from('social_profiles').select('*').eq('user_id', recipientId).single()
      .then(({ data }) => {
        if (data) setRecipientProfile(data);
        else setRecipientProfile({ display_name: 'User', username: 'user', avatar_url: '' });
      });
  }, [recipientId]);

  // Load messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from('social_conversations')
        .select('*')
        .or(`participants.cs.["${currentUserId}"]`)
        .limit(1);

      // Load from mock for now - real messages would come from socio_messages table
      setMessages([
        { id: '1', sender_id: recipientId || '', receiver_id: currentUserId, content: 'Hey! How are you? 😊', message_type: 'text', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: '2', sender_id: currentUserId, receiver_id: recipientId || '', content: 'I\'m good! Just browsing P4U', message_type: 'text', is_read: true, created_at: new Date(Date.now() - 3500000).toISOString() },
        { id: '3', sender_id: recipientId || '', receiver_id: currentUserId, content: 'Check out the new collection!', message_type: 'text', is_read: true, created_at: new Date(Date.now() - 3400000).toISOString() },
      ]);
    };
    loadMessages();
  }, [conversationId, currentUserId, recipientId]);

  // Subscribe to realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on('broadcast', { event: 'new_message' }, (payload) => {
        const msg = payload.payload as Message;
        setMessages(prev => [...prev, msg]);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== currentUserId) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentUserId || !recipientId) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      sender_id: currentUserId,
      receiver_id: recipientId,
      content: newMessage.trim(),
      message_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    setShowEmoji(false);

    // Broadcast via realtime
    await supabase.channel(`dm-${conversationId}`).send({
      type: 'broadcast',
      event: 'new_message',
      payload: msg,
    });
  }, [newMessage, currentUserId, recipientId, conversationId]);

  const handleTyping = () => {
    supabase.channel(`dm-${conversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUserId },
    });
  };

  const isMine = (msg: Message) => msg.sender_id === currentUserId;

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
            <p className="text-[10px] text-muted-foreground">{isTyping ? 'typing...' : 'Active now'}</p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((msg, i) => {
          const mine = isMine(msg);
          const showAvatar = !mine && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
          return (
            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
              {!mine && showAvatar && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <span className="text-[10px] font-bold">{recipientProfile?.display_name?.charAt(0) || 'U'}</span>
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
            onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
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
