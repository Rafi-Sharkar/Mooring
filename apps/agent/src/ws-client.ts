import WebSocket from 'ws';

export type MessageHandler = (message: any) => void;

interface WsClientOptions {
  url: string;
  token: string;
  agentName: string;
  onOpen: () => void;
  onMessage: MessageHandler;
  onClose: () => void;
}

/**
 * WebSocket client with automatic reconnection (exponential backoff).
 */
export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000; // Start at 1s
  private maxReconnectDelay = 60000; // Max 60s
  private isIntentionallyClosed = false;
  private options: WsClientOptions;

  constructor(options: WsClientOptions) {
    this.options = options;
  }

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    this.isIntentionallyClosed = false;
    this.attemptConnection();
  }

  /**
   * Gracefully close the connection.
   */
  close(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the server.
   */
  send(message: object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[WS] Failed to send message:', err);
      return false;
    }
  }

  /**
   * Check if currently connected.
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private attemptConnection(): void {
    console.log(`[WS] Connecting to ${this.options.url}...`);

    try {
      this.ws = new WebSocket(this.options.url);
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log('[WS] Connected successfully');
      this.reconnectDelay = 1000; // Reset backoff on successful connection

      // Send auth message immediately
      this.send({
        type: 'auth',
        token: this.options.token,
        agentName: this.options.agentName,
      });

      this.options.onOpen();
    });

    this.ws.on('message', (data: Buffer | string) => {
      try {
        const message = JSON.parse(data.toString());
        this.options.onMessage(message);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[WS] Disconnected (code: ${code}, reason: ${reason.toString()})`);
      this.ws = null;
      this.options.onClose();

      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[WS] Error:', err.message);
      // The 'close' event will fire after this, triggering reconnect
    });
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return;

    console.log(
      `[WS] Reconnecting in ${this.reconnectDelay / 1000}s...`,
    );

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.attemptConnection();
      }
    }, this.reconnectDelay);

    // Exponential backoff with jitter
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2 + Math.random() * 1000,
      this.maxReconnectDelay,
    );
  }
}
