import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from '../../../app/core/services/auth.service';
import { AirVaultLogger } from './airvault-sync-debug.service';

export type WsConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface AirVaultWsMessage {
  type: 'CONNECT_ACK' | 'PING' | 'PONG' | 'SIGNAL' | 'PRESENCE' | 'ERROR' | string;
  senderDeviceId?: string;
  targetDeviceId?: string;
  payload?: any;
  timestamp?: number;
  messageId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultWsTransportService implements OnDestroy {
  private authService = inject(AuthService);

  // Reactive state signals
  readonly connectionState = signal<WsConnectionState>('DISCONNECTED');
  readonly lastError = signal<string | null>(null);
  readonly lastConnectedTime = signal<number | null>(null);
  readonly latencyMs = signal<number | null>(null);

  // Incoming message stream
  private messageSubject = new Subject<AirVaultWsMessage>();
  readonly onMessage$: Observable<AirVaultWsMessage> = this.messageSubject.asObservable();

  // Connected event stream
  private connectedSubject = new Subject<void>();
  readonly onConnected$: Observable<void> = this.connectedSubject.asObservable();

  // Internal connection management
  private ws: WebSocket | null = null;
  private activeDeviceId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectTimer: any = null;
  private pingIntervalTimer: any = null;
  private pongTimeoutTimer: any = null;
  private pingSentAt = 0;
  private lastMessageReceivedAt = 0;
  private isManualDisconnect = false;

  private readonly handleLivenessCheck = () => {
    if (typeof document === 'undefined' || this.isManualDisconnect) return;

    if (document.visibilityState === 'visible') {
      const isDead = !this.ws || 
        this.ws.readyState !== WebSocket.OPEN || 
        this.connectionState() === 'DISCONNECTED' || 
        this.connectionState() === 'RECONNECTING';

      if (isDead) {
        AirVaultLogger.debug('[AirVault WS] 🔄 Tab resumed with stale/closed socket. Reconnecting immediately...');
        this.reconnectAttempts = 0;
        this.connect(undefined, true);
      } else {
        // Socket appears open - verify with an immediate keepalive ping probe
        const now = Date.now();
        if (now - this.lastMessageReceivedAt > 15000) {
          AirVaultLogger.debug('[AirVault WS] ⚡ Tab resumed. Sending keepalive probe...');
          this.ping();
        }
      }
    }
  };

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleLivenessCheck);
      window.addEventListener('pageshow', this.handleLivenessCheck);
      window.addEventListener('focus', this.handleLivenessCheck);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleLivenessCheck);
      window.removeEventListener('pageshow', this.handleLivenessCheck);
      window.removeEventListener('focus', this.handleLivenessCheck);
    }
    this.disconnect();
    this.messageSubject.complete();
    this.connectedSubject.complete();
  }

  private getLocalDeviceId(): string {
    if (this.activeDeviceId) return this.activeDeviceId;
    try {
      const stored = localStorage.getItem('acklet_airvault_device_id');
      if (stored && stored.trim()) {
        this.activeDeviceId = stored.trim();
        return this.activeDeviceId;
      }
    } catch {}
    return '';
  }

  /**
   * Establishes persistent WebSocket connection to /ws/airvault.
   * Guarantees exactly one active WebSocket connection per device session.
   */
  connect(explicitDeviceId?: string, forceReconnect: boolean = false): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    const deviceId = explicitDeviceId || this.getLocalDeviceId();
    if (!deviceId) {
      this.lastError.set('No active device ID found');
      return;
    }

    // If forceReconnect requested or device ID changed, close previous connection first
    if ((forceReconnect || (this.activeDeviceId && this.activeDeviceId !== deviceId)) && this.ws) {
      this.stopPingInterval();
      try {
        this.ws.close(1000, 'Reconnecting');
      } catch {}
      this.ws = null;
    }

    // Guard: Prevent duplicate connections if already open or actively connecting with same device
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.activeDeviceId = deviceId;
    this.isManualDisconnect = false;
    this.clearReconnectTimer();

    const wsUrl = this.resolveWsUrl(deviceId);
    const isReconnecting = this.reconnectAttempts > 0;
    this.connectionState.set(isReconnecting ? 'RECONNECTING' : 'CONNECTING');

    if (isReconnecting) {
      AirVaultLogger.debug(`[AirVault WS] Reconnecting: attempt #${this.reconnectAttempts}`);
    } else {
      AirVaultLogger.debug(`[AirVault WS] Connecting to ${wsUrl}`);
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connectionState.set('CONNECTED');
        this.reconnectAttempts = 0;
        this.lastConnectedTime.set(Date.now());
        this.lastMessageReceivedAt = Date.now();
        this.lastError.set(null);
        AirVaultLogger.debug(`[AirVault WS] Connected: deviceId='${deviceId}'`);
        this.startPingInterval();
        this.connectedSubject.next();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.clearPongTimeout();
        this.lastMessageReceivedAt = Date.now();

        try {
          const rawData = typeof event.data === 'string' ? event.data : '';
          if (!rawData) return;
          const msg = JSON.parse(rawData) as AirVaultWsMessage;

          if (msg.type === 'PONG') {
            if (this.pingSentAt > 0) {
              const rtt = Date.now() - this.pingSentAt;
              this.latencyMs.set(rtt);
            }
            return;
          }

          this.messageSubject.next(msg);
        } catch {}
      };

      this.ws.onerror = (err) => {
        const errorMsg = 'WebSocket transport error';
        this.lastError.set(errorMsg);
        AirVaultLogger.debug('[AirVault WS] Connection failure', err);
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.stopPingInterval();
        this.ws = null;

        if (this.isManualDisconnect) {
          this.connectionState.set('DISCONNECTED');
          AirVaultLogger.debug(`[AirVault WS] Disconnected (code: ${event.code}, manual: true)`);
        } else {
          this.connectionState.set('RECONNECTING');
          AirVaultLogger.debug(`[AirVault WS] Disconnected (code: ${event.code}). Scheduling reconnect...`);
          this.scheduleReconnect();
        }
      };
    } catch (e: any) {
      this.lastError.set(e?.message || 'WebSocket instantiation failed');
      AirVaultLogger.debug('[AirVault WS] Connection failure', e);
      this.scheduleReconnect();
    }
  }

  /**
   * Gracefully closes active WebSocket connection and cancels reconnect timers.
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.stopPingInterval();

    if (this.ws) {
      try {
        this.ws.close(1000, 'AirVault disconnect');
      } catch {}
      this.ws = null;
    }

    this.connectionState.set('DISCONNECTED');
    AirVaultLogger.debug('[AirVault WS] Disconnected');
  }

  /**
   * Dispatches a WebSocket message envelope if socket is open.
   */
  send(message: AirVaultWsMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      if (!message.senderDeviceId) {
        message.senderDeviceId = this.getLocalDeviceId();
      }
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      AirVaultLogger.debug('[AirVault WS] Connection failure on send', err);
      return false;
    }
  }

  /**
   * Sends a keepalive PING frame to measure transport latency, prevent idle timeouts,
   * and starts a 10-second pong timeout to detect hung/half-open connections.
   */
  ping(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.clearPongTimeout();
    this.pingSentAt = Date.now();
    const sent = this.send({
      type: 'PING',
      senderDeviceId: this.getLocalDeviceId(),
      timestamp: this.pingSentAt
    });

    if (sent) {
      this.pongTimeoutTimer = setTimeout(() => {
        AirVaultLogger.warn('[AirVault WS] ⚠️ Keepalive pong timeout (10s) exceeded - connection hung. Forcing reconnect...');
        this.stopPingInterval();
        if (this.ws) {
          try {
            this.ws.close(4000, 'Keepalive pong timeout');
          } catch {}
          this.ws = null;
        }
        this.connectionState.set('RECONNECTING');
        this.scheduleReconnect();
      }, 10000);
    }
  }

  private clearPongTimeout(): void {
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // 20 second keepalive interval
    this.pingIntervalTimer = setInterval(() => {
      if (this.connectionState() === 'CONNECTED') {
        this.ping();
      }
    }, 20000);
  }

  private stopPingInterval(): void {
    this.clearPongTimeout();
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isManualDisconnect || this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionState.set('DISCONNECTED');
      this.lastError.set('Max reconnection attempts exceeded');
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s max + jitter
    const baseDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resolveWsUrl(deviceId: string): string {
    const isLocal4200 = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '4200';
    const wsHost = isLocal4200 ? 'localhost:8080' : window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let url = `${protocol}//${wsHost}/ws/airvault?deviceId=${encodeURIComponent(deviceId)}`;
    const token = this.authService.getAccessToken();
    if (token) {
      url += `&token=${encodeURIComponent(token)}`;
    }
    return url;
  }
}

// Named alias export matching specifications
export { AirVaultWsTransportService as AirVaultWebSocketTransport };
