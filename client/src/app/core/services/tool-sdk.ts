/**
 * @acklet/tool-sdk - Universal SDK for tool sandbox communication
 * Defines the standard Host <-> Tool postMessage contract, heartbeat, and lifecycle protocols.
 */

export type AckletMessageType =
  | 'READY'
  | 'HEARTBEAT_PING'
  | 'HEARTBEAT_PONG'
  | 'RESIZE'
  | 'STATE_UPDATE'
  | 'ERROR'
  | 'SUSPEND'
  | 'RESUME'
  | 'REQUEST_CLIPBOARD'
  | 'SHARE_CLIPBOARD'
  | 'NOTIFICATION'
  | 'SIMULATE_FREEZE';

export interface AckletMessage<T = any> {
  type: AckletMessageType;
  toolId: string;
  payload?: T;
  timestamp: number;
  messageId: string;
}

export class AckletToolSDK {
  private toolId: string;
  private targetOrigin: string;
  private messageListeners = new Map<AckletMessageType, Array<(payload: any) => void>>();
  private isSuspended = false;

  constructor(toolId: string, targetOrigin = '*') {
    this.toolId = toolId;
    this.targetOrigin = targetOrigin;
    this.setupHostListener();
  }

  /**
   * Signal the Acklet host shell that the tool has completed mounting and is interactive.
   */
  ready(payload?: any) {
    this.send('READY', payload);
  }

  /**
   * Send a typed message to the Acklet host shell.
   */
  send<T>(type: AckletMessageType, payload?: T) {
    if (typeof window === 'undefined' || window.parent === window) return;

    const message: AckletMessage<T> = {
      type,
      toolId: this.toolId,
      payload,
      timestamp: Date.now(),
      messageId: 'msg_' + Math.random().toString(36).substring(2, 10)
    };

    window.parent.postMessage(message, this.targetOrigin);
  }

  /**
   * Register a listener for messages sent by the Host shell.
   */
  on(type: AckletMessageType, callback: (payload: any) => void): () => void {
    const list = this.messageListeners.get(type) || [];
    list.push(callback);
    this.messageListeners.set(type, list);

    return () => {
      const current = this.messageListeners.get(type) || [];
      this.messageListeners.set(type, current.filter(cb => cb !== callback));
    };
  }

  /**
   * Report an internal error boundary failure to the host shell.
   */
  reportError(error: Error | string) {
    const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown tool runtime error';
    this.send('ERROR', { message: errorMessage, stack: typeof error === 'object' ? error.stack : undefined });
  }

  /**
   * Notify host of viewport / dimensional adjustments.
   */
  resize(height: number, width?: number) {
    this.send('RESIZE', { height, width });
  }

  /**
   * Test utility to simulate a deliberate freeze/hang for verification of host heartbeat detection.
   */
  simulateFreeze() {
    console.warn(`[AckletToolSDK] Simulating deliberate UI freeze on tool: ${this.toolId}`);
    const start = Date.now();
    // Synchronous CPU blocking loop
    while (Date.now() - start < 60000) {}
  }

  private setupHostListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event: MessageEvent) => {
      const data = event.data as AckletMessage;
      if (!data || !data.type) return;

      // Handle automatic Heartbeat response
      if (data.type === 'HEARTBEAT_PING') {
        this.send('HEARTBEAT_PONG', { latency: Date.now() - data.timestamp });
        return;
      }

      // Handle Suspend / Resume lifecycle
      if (data.type === 'SUSPEND') {
        this.isSuspended = true;
      } else if (data.type === 'RESUME') {
        this.isSuspended = false;
      }

      const listeners = this.messageListeners.get(data.type);
      if (listeners && listeners.length > 0) {
        for (const cb of listeners) {
          try {
            cb(data.payload);
          } catch (err) {
            console.error(`[AckletToolSDK] Error executing handler for ${data.type}:`, err);
          }
        }
      }
    });
  }
}
