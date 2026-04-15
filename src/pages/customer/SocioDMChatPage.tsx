import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Video, Send, Smile, Paperclip, Mic, Check, CheckCheck, Image as ImageIcon, Lock, X, Camera, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useInitiateCall } from "@/components/social/IncomingCallProvider";
import CallScreen from "@/components/social/CallScreen";
import { useQuery } from "@tanstack/react-query";
import { compressToWebP } from "@/lib/webp-compress";

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

// Compress audio blob using OfflineAudioContext (re-encode to lower bitrate WebM/Opus)
async function compressAudioBlob(blob: Blob): Promise<Blob> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    
    // Downsample to 16kHz mono for maximum compression
    const sampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * sampleRate), sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);
    const rendered = await offlineCtx.startRendering();
    audioCtx.close();

    // Encode to WAV (smaller than original high-bitrate WebM for short clips)
    const numChannels = 1;
    const length = rendered.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    const channelData = rendered.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  } catch {
    // Fallback: return original
    return blob;
  }
}

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
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const { activeCall, initiateCall, closeCall } = useInitiateCall();

  const { data: callRemoteProfile } = useQuery({
    queryKey: ["call-remote-profile", recipientId],
    queryFn: async () => {
      if (!recipientId) return null;
      const { data } = await supabase.from("social_profiles").select("display_name, username, avatar_url").eq("user_id", recipientId).maybeSingle();
      return data;
    },
    enabled: !!recipientId,
  });

  const handleCall = useCallback(async (type: "audio" | "video") => {
    if (!recipientId || !currentUserId) { toast.error("Please login to make calls"); return; }
    const callId = await initiateCall(recipientId, type);
    if (!callId) toast.error("Failed to start call");
  }, [recipientId, currentUserId, initiateCall]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (!recipientId) return;
    supabase.from('social_profiles' as any).select('*').eq('user_id', recipientId).single()
      .then(({ data }) => {
        if (data) setRecipientProfile(data);
        else setRecipientProfile({ display_name: 'User', username: 'user', avatar_url: '' });
      });
  }, [recipientId]);

  useEffect(() => {
    if (!currentUserId || !recipientId) return;
    const findOrCreateConversation = async () => {
      setLoading(true);
      try {
        const { data: convos } = await (supabase
          .from('social_conversations' as any)
          .select('*')
          .eq('is_group', false)
          .contains('participants', JSON.stringify([currentUserId, recipientId])) as any);

        if (convos && convos.length > 0) {
          setConversationId(convos[0].id);
        } else {
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

  useEffect(() => {
    if (!conversationId) return;
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('social_messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) { console.error('Failed to load messages:', error); return; }
      setMessages((data || []).map((m: any) => ({
        id: m.id, conversation_id: m.conversation_id, sender_id: m.sender_id,
        content: m.content || '', message_type: m.message_type || 'text',
        media_url: m.media_url, is_read: m.is_read || false, created_at: m.created_at,
      })));
      if (data && data.length > 0) {
        const unreadIds = data.filter((m: any) => !m.is_read && m.sender_id !== currentUserId).map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('social_messages' as any).update({ is_read: true }).in('id', unreadIds);
        }
      }
    };
    loadMessages();
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as any;
          setMessages(prev => {
            if (prev.some(msg => msg.id === m.id)) return prev;
            return [...prev, { id: m.id, conversation_id: m.conversation_id, sender_id: m.sender_id, content: m.content || '', message_type: m.message_type || 'text', media_url: m.media_url, is_read: m.is_read || false, created_at: m.created_at }];
          });
          if (m.sender_id !== currentUserId) {
            supabase.from('social_messages' as any).update({ is_read: true }).eq('id', m.id);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // --- Send text ---
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentUserId || !recipientId || !conversationId) return;
    const msgId = crypto.randomUUID();
    const content = newMessage.trim();
    setNewMessage('');
    setShowEmoji(false);

    const optimisticMsg: Message = { id: msgId, conversation_id: conversationId, sender_id: currentUserId, content, message_type: 'text', is_read: false, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from('social_messages' as any).insert({ id: msgId, conversation_id: conversationId, sender_id: currentUserId, content, message_type: 'text', is_read: false });
    if (error) { toast.error('Failed to send message'); setMessages(prev => prev.filter(m => m.id !== msgId)); return; }
    await supabase.from('social_conversations' as any).update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
  }, [newMessage, currentUserId, recipientId, conversationId]);

  // --- Send image ---
  const handleImageSelected = useCallback(async (file: File) => {
    if (!currentUserId || !conversationId) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image too large (max 10MB)'); return; }

    setUploading(true);
    setShowAttachMenu(false);
    try {
      const { blob, contentType } = await compressToWebP(file);
      const msgId = crypto.randomUUID();
      const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
      const path = `${currentUserId}/dm/${conversationId}/${msgId}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('social-media').upload(path, blob, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60 * 24 * 365);
      const mediaUrl = urlData?.signedUrl || '';

      const optimisticMsg: Message = { id: msgId, conversation_id: conversationId, sender_id: currentUserId, content: '📷 Photo', message_type: 'image', media_url: mediaUrl, is_read: false, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, optimisticMsg]);

      const { error } = await supabase.from('social_messages' as any).insert({ id: msgId, conversation_id: conversationId, sender_id: currentUserId, content: '📷 Photo', message_type: 'image', media_url: mediaUrl, is_read: false });
      if (error) { toast.error('Failed to send image'); setMessages(prev => prev.filter(m => m.id !== msgId)); return; }
      await supabase.from('social_conversations' as any).update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    } catch (err: any) {
      console.error('Image upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, [currentUserId, conversationId]);

  // --- Voice note recording ---
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  }, []);

  const stopRecording = useCallback(async (send: boolean) => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecording(false);
    setRecordingDuration(0);

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach(t => t.stop());
        if (!send || !currentUserId || !conversationId) { resolve(); return; }

        setUploading(true);
        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
          const compressed = await compressAudioBlob(rawBlob);
          const msgId = crypto.randomUUID();
          const ext = compressed.type === 'audio/wav' ? 'wav' : 'webm';
          const path = `${currentUserId}/dm/${conversationId}/${msgId}.${ext}`;

          const { error: uploadError } = await supabase.storage.from('social-media').upload(path, compressed, { contentType: compressed.type, upsert: true });
          if (uploadError) throw uploadError;

          const { data: urlData } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60 * 24 * 365);
          const mediaUrl = urlData?.signedUrl || '';
          const durationText = `${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, '0')}`;

          const optimisticMsg: Message = { id: msgId, conversation_id: conversationId, sender_id: currentUserId, content: `🎤 Voice note (${durationText})`, message_type: 'audio', media_url: mediaUrl, is_read: false, created_at: new Date().toISOString() };
          setMessages(prev => [...prev, optimisticMsg]);

          const { error } = await supabase.from('social_messages' as any).insert({ id: msgId, conversation_id: conversationId, sender_id: currentUserId, content: `🎤 Voice note (${durationText})`, message_type: 'audio', media_url: mediaUrl, is_read: false });
          if (error) { toast.error('Failed to send voice note'); setMessages(prev => prev.filter(m => m.id !== msgId)); }
          else { await supabase.from('social_conversations' as any).update({ last_message_at: new Date().toISOString() }).eq('id', conversationId); }
        } catch (err: any) {
          console.error('Voice upload error:', err);
          toast.error('Failed to upload voice note');
        } finally {
          setUploading(false);
        }
        resolve();
      };
      recorder.stop();
    });
  }, [currentUserId, conversationId, recordingDuration]);

  // --- Audio playback ---
  const toggleAudioPlayback = useCallback((url: string) => {
    if (playingAudio === url) {
      audioPlayerRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    if (audioPlayerRef.current) audioPlayerRef.current.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    audioPlayerRef.current = audio;
    setPlayingAudio(url);
  }, [playingAudio]);

  const isMine = (msg: Message) => msg.sender_id === currentUserId;

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

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
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card shrink-0 safe-area-top">
        <button onClick={() => navigate('/app/social/messages')}><ArrowLeft className="h-5 w-5" /></button>
        <button onClick={() => recipientId && navigate(`/app/social/profile/${recipientId}`)} className="flex items-center gap-3 flex-1 min-w-0">
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
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" onClick={() => handleCall("audio")}>
            <Phone className="h-5 w-5" />
          </button>
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" onClick={() => handleCall("video")}>
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
          const handleDeleteMsg = async () => {
            if (!confirm("Delete this message? A backup will be kept for safety.")) return;
            await supabase.from('message_backups' as any).insert({
              original_message_id: msg.id, conversation_id: msg.conversation_id, sender_id: msg.sender_id,
              content: msg.content, message_type: msg.message_type, media_url: msg.media_url || null,
              original_created_at: msg.created_at, deleted_by: currentUserId,
            });
            const { error } = await supabase.from('social_messages' as any).delete().eq('id', msg.id);
            if (error) { toast.error("Failed to delete message"); return; }
            setMessages(prev => prev.filter(m => m.id !== msg.id));
            toast.success("Message deleted");
          };

          return (
            <div key={msg.id} className={`group flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
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
                <div className={`relative px-3.5 py-2.5 rounded-2xl text-sm ${mine ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted rounded-bl-md'}`}>
                  {/* Image message */}
                  {msg.message_type === 'image' && msg.media_url && (
                    <img src={msg.media_url} alt="Shared image" className="rounded-lg max-w-full max-h-60 object-cover mb-1 cursor-pointer" onClick={() => window.open(msg.media_url, '_blank')} />
                  )}
                  {/* Audio message */}
                  {msg.message_type === 'audio' && msg.media_url ? (
                    <button onClick={() => toggleAudioPlayback(msg.media_url!)} className="flex items-center gap-2 min-w-[140px]">
                      {playingAudio === msg.media_url ? <Pause className="h-5 w-5 shrink-0" /> : <Play className="h-5 w-5 shrink-0" />}
                      <div className="flex-1">
                        <div className="flex gap-0.5 items-end h-4">
                          {Array.from({ length: 20 }).map((_, wi) => (
                            <div key={wi} className={`w-1 rounded-full ${mine ? 'bg-primary-foreground/60' : 'bg-foreground/40'}`} style={{ height: `${4 + Math.random() * 12}px` }} />
                          ))}
                        </div>
                        <p className="text-[10px] mt-0.5 opacity-70">{msg.content.replace('🎤 ', '')}</p>
                      </div>
                    </button>
                  ) : msg.message_type !== 'image' && (
                    <p>{msg.content}</p>
                  )}
                  {mine && (
                    <button onClick={handleDeleteMsg}
                      className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded-full bg-destructive/80 flex items-center justify-center"
                      title="Delete message">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[9px] text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</span>
                  {mine && (msg.is_read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3 text-muted-foreground" />)}
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

      {/* Attach menu */}
      <AnimatePresence>
        {showAttachMenu && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border/30 bg-card">
            <div className="flex gap-4 p-3 justify-center">
              <button className="flex flex-col items-center gap-1" onClick={() => { fileInputRef.current?.click(); }}>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><ImageIcon className="h-6 w-6 text-primary" /></div>
                <span className="text-[10px] text-muted-foreground">Gallery</span>
              </button>
              <button className="flex flex-col items-center gap-1" onClick={() => { cameraInputRef.current?.click(); }}>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><Camera className="h-6 w-6 text-primary" /></div>
                <span className="text-[10px] text-muted-foreground">Camera</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelected(f); e.target.value = ''; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageSelected(f); e.target.value = ''; }} />

      {/* Recording bar */}
      {recording ? (
        <div className="border-t border-border/30 bg-destructive/5 px-3 py-2.5 flex items-center gap-3 safe-area-bottom shrink-0">
          <button onClick={() => stopRecording(false)} className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <X className="h-4 w-4 text-destructive" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">{formatRecTime(recordingDuration)}</span>
            <span className="text-xs text-muted-foreground">Recording...</span>
          </div>
          <button onClick={() => stopRecording(true)} className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Send className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
      ) : (
        /* Input bar */
        <div className="border-t border-border/30 bg-card px-3 py-2.5 flex items-center gap-2 safe-area-bottom shrink-0">
          <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0" onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false); }} disabled={uploading}>
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <Input ref={inputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={uploading ? "Uploading..." : "Message..."} className="h-10 pr-10 rounded-full" disabled={uploading} />
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false); }}>
              <Smile className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          {newMessage.trim() ? (
            <button onClick={sendMessage} className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Send className="h-4 w-4 text-primary-foreground" />
            </button>
          ) : (
            <button className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0" onClick={startRecording} disabled={uploading}>
              <Mic className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* Uploading overlay */}
      {uploading && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs">Uploading...</span>
        </div>
      )}

      {/* Active Call Screen */}
      <AnimatePresence>
        {activeCall && (
          <CallScreen callId={activeCall.callId} localUserId={currentUserId} remoteUserId={activeCall.remoteUserId} callType={activeCall.callType} isCaller={true} remoteProfile={callRemoteProfile} onClose={closeCall} />
        )}
      </AnimatePresence>
    </div>
  );
}
