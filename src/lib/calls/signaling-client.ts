/**
 * Thin wrapper around socket.io-client with auto-reconnect & a typed
 * event surface. UI/WebRTC layers should never import socket.io directly.
 */
import { io, Socket } from "socket.io-client";

export interface OnlineUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

export type CallType = "audio" | "video";

export interface IncomingCallPayload {
  callId: string;
  from: string;
  fromProfile?: { displayName?: string; avatarUrl?: string };
  callType: CallType;
  offer: RTCSessionDescriptionInit;
}

export type SignalingEvents = {
  presence: (users: OnlineUser[]) => void;
  "incoming-call": (p: IncomingCallPayload) => void;
  "call-accepted": (p: { callId: string; from: string; answer: RTCSessionDescriptionInit }) => void;
  "call-rejected": (p: { callId: string; from: string }) => void;
  "call-ended": (p: { callId: string; from?: string; reason?: string }) => void;
  "call-initiated": (p: { callId: string; to: string }) => void;
  "call-failed": (p: { reason: string }) => void;
  "ice-candidate": (p: { callId: string; from: string; candidate: RTCIceCandidateInit }) => void;
  connect: () => void;
  disconnect: () => void;
};

export class SignalingClient {
  private socket: Socket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(profile: { userId: string; displayName?: string; avatarUrl?: string }) {
    if (this.socket?.connected) return this.socket;
    this.socket = io(this.url, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket.on("connect", () => this.socket?.emit("join", profile));
    return this.socket;
  }

  on<E extends keyof SignalingEvents>(event: E, handler: SignalingEvents[E]) {
    this.socket?.on(event as string, handler as any);
  }

  off<E extends keyof SignalingEvents>(event: E, handler?: SignalingEvents[E]) {
    if (handler) this.socket?.off(event as string, handler as any);
    else this.socket?.off(event as string);
  }

  emit(event: string, payload: unknown) {
    this.socket?.emit(event, payload);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected() { return this.socket?.connected ?? false; }
}
