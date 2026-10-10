import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ClipboardItem } from './clipboard-api.service';

export interface ClipboardSyncEvent {
  eventType: 'ITEM_ADDED' | 'ITEM_DELETED' | 'RECEIPT_UPDATED' | 'SHARE_REVOKED';
  shareCode: string;
  item?: ClipboardItem;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClipboardSyncService {
  private socket: WebSocket | null = null;
  private currentCode: string | null = null;
  private reconnectTimeout: any = null;
  private readonly events$ = new Subject<ClipboardSyncEvent>();

  get events(): Observable<ClipboardSyncEvent> {
    return this.events$.asObservable();
  }

  connect(shareCode: string): void {
    if (this.currentCode === shareCode && this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    this.disconnect();
    this.currentCode = shareCode;

    if (typeof window === 'undefined') return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/clipboard/raw`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        // Connected to socket
      };

      this.socket.onmessage = (event) => {
        try {
          const data: ClipboardSyncEvent = JSON.parse(event.data);
          if (data && data.shareCode === this.currentCode) {
            this.events$.next(data);
          }
        } catch (e) {
          // Non-JSON frame or ping
        }
      };

      this.socket.onerror = () => {
        // Socket error - will fall back to polling if needed
      };

      this.socket.onclose = () => {
        // Auto-reconnect with 3s backoff
        if (this.currentCode === shareCode) {
          this.reconnectTimeout = setTimeout(() => {
            if (this.currentCode === shareCode) {
              this.connect(shareCode);
            }
          }, 3000);
        }
      };
    } catch (e) {
      console.warn('[ClipboardSync] WebSocket connection unavailable, relying on reactive polling fallback');
    }
  }

  notifyLocalChange(event: ClipboardSyncEvent): void {
    this.events$.next(event);
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch (ignored) {}
      this.socket = null;
    }
    this.currentCode = null;
  }
}
