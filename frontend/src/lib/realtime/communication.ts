"use client";

type Handler = (payload: any) => void;
class CommunicationSocketClient {
  private socket: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: number | null = null;
  private manualClose = false;
  connected = false;
  private url() {
    const source = process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
    const base = source.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
    return `${base.replace(/^http:/, "ws:").replace(/^https:/, "wss:")}/communication-ws`;
  }
  connect() {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
    this.manualClose = false;
    const socket = new WebSocket(this.url()); this.socket = socket;
    socket.addEventListener("open", () => { const token = localStorage.getItem("accessToken"); if (!token) return socket.close(); socket.send(JSON.stringify({ type: "auth", token })); });
    socket.addEventListener("message", (event) => { try { const msg = JSON.parse(String(event.data)) as { event?: string; payload?: unknown }; if (!msg.event) return; if (msg.event === "communication:connected") this.connected = true; this.handlers.get(msg.event)?.forEach((h) => h(msg.payload)); } catch {} });
    socket.addEventListener("close", (event) => {
      this.connected = false;
      this.handlers.get("disconnect")?.forEach((h) => h(undefined));
      if (event.code === 4401) { this.handlers.get("communication:auth-expired")?.forEach((h) => h(undefined)); return; }
      if (!this.manualClose) this.reconnectTimer = window.setTimeout(() => this.connect(), 1500);
    });
  }
  disconnect() { this.manualClose = true; if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer); this.connected = false; this.socket?.close(); this.socket = null; }
  emit(type: string, payload: Record<string, unknown> = {}) { if (this.socket?.readyState === WebSocket.OPEN && this.connected) this.socket.send(JSON.stringify({ type, ...payload })); }
  on(event: string, handler: Handler) { const set = this.handlers.get(event) ?? new Set<Handler>(); set.add(handler); this.handlers.set(event, set); }
  off(event: string, handler: Handler) { this.handlers.get(event)?.delete(handler); }
}
let singleton: CommunicationSocketClient | null = null;
export function getCommunicationSocket() { singleton ??= new CommunicationSocketClient(); return singleton; }
