// OpenClaw WebSocket client for dashboard
// Connects directly to OpenClaw Gateway WebSocket (same as Control UI)

const GATEWAY_WS_URL = 'ws://127.0.0.1:18789'; // Use Tailscale HTTPS in production
const GATEWAY_TOKEN = 'opie-token-123';

export class OpenClawWSClient {
  private ws: WebSocket | null = null;
  private sessionKey: string = 'agent:main:main';
  private onMessage: (text: string, done: boolean) => void;
  private buffer: string = '';

  constructor(onMessage: (text: string, done: boolean) => void) {
    this.onMessage = onMessage;
  }

  connect() {
    if (typeof window === 'undefined') return; // Server-side, skip

    this.ws = new WebSocket(GATEWAY_WS_URL);

    this.ws.onopen = () => {
      console.log('[OpenClawWS] Connected');
      // Send connect frame
      this.send({
        type: 'req',
        id: this.uid(),
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'openclaw-control-ui',
            displayName: 'Opie2ndbrain',
            version: '1.0.0',
            platform: 'web',
            mode: 'ui',
            instanceId: this.uid(),
          },
          auth: { token: GATEWAY_TOKEN },
        },
      });
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        this.handleMessage(msg);
      } catch {}
    };

    this.ws.onclose = () => {
      console.log('[OpenClawWS] Disconnected');
      // Auto-reconnect
      setTimeout(() => this.connect(), 3000);
    };
  }

  sendChat(message: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.buffer = '';

    this.send({
      type: 'req',
      id: this.uid(),
      method: 'chat.send',
      params: {
        sessionKey: this.sessionKey,
        message,
        idempotencyKey: this.uid(),
      },
    });
  }

  private handleMessage(msg: any) {
    // Agent events = streaming text
    if (msg.type === 'event' && msg.event === 'agent' && msg.payload?.stream === 'assistant') {
      const delta = msg.payload.data?.delta || '';
      this.buffer += delta;
      this.onMessage(this.buffer, false);
    }

    // Chat final = done
    if (msg.type === 'event' && msg.event === 'chat' && msg.payload?.state === 'final') {
      this.onMessage(this.buffer, true);
    }
  }

  private send(obj: any) {
    this.ws?.send(JSON.stringify(obj));
  }

  private uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
