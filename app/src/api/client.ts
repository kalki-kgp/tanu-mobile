import type {
  BridgeMessage,
  MobileOutbound,
  ConnectionConfig,
} from "./types";

type MessageHandler = (msg: BridgeMessage) => void;
type StatusHandler = (connected: boolean) => void;

export class TanuBridgeClient {
  private ws: WebSocket | null = null;
  private config: ConnectionConfig;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private sessionId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  get baseUrl(): string {
    return `http://${this.config.host}:${this.config.port}`;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get currentSessionId(): string | null {
    return this.sessionId;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      const data = await res.json();
      return data.status === "ok";
    } catch {
      return false;
    }
  }

  async createSession(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.token}`,
      },
      body: JSON.stringify({ cwd: this.config.cwd }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create session: ${res.status}`);
    }

    const data = await res.json();
    this.sessionId = data.session_id;
    return data.session_id;
  }

  async connect(sessionId?: string): Promise<void> {
    if (sessionId) this.sessionId = sessionId;

    if (!this.sessionId) {
      await this.createSession();
    }

    this.shouldReconnect = true;

    const wsUrl = `ws://${this.config.host}:${this.config.port}/ws/${this.sessionId}?token=${this.config.token}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[tanu] ws connected");
        this.notifyStatus(true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: BridgeMessage = JSON.parse(event.data as string);
          this.notifyMessage(msg);
        } catch (err) {
          console.warn("[tanu] bad ws message:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[tanu] ws disconnected");
        this.notifyStatus(false);
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error("[tanu] ws error:", err);
        if (!this.isConnected) {
          reject(new Error("WebSocket connection failed"));
        }
      };
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  sendMessage(content: string): void {
    this.send({ type: "user_message", content });
  }

  sendPermissionResponse(requestId: string, behavior: "allow" | "deny"): void {
    this.send({ type: "permission_response", request_id: requestId, behavior });
  }

  sendInterrupt(): void {
    this.send({ type: "interrupt" });
  }

  private send(msg: MobileOutbound): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("[tanu] cannot send, ws not open");
    }
  }

  private notifyMessage(msg: BridgeMessage): void {
    for (const handler of this.messageHandlers) {
      handler(msg);
    }
  }

  private notifyStatus(connected: boolean): void {
    for (const handler of this.statusHandlers) {
      handler(connected);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    console.log("[tanu] reconnecting in 3s...");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((err) => {
        console.error("[tanu] reconnect failed:", err);
      });
    }, 3000);
  }
}
