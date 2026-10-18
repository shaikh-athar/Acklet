import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ClipboardItem } from './clipboard-api.service';
import { environment } from '../environments/environment';

export interface ClipboardSyncEvent {
  eventType: 'ITEM_ADDED' | 'ITEM_DELETED' | 'RECEIPT_UPDATED' | 'SHARE_REVOKED';
  shareCode: string;
  version?: number;
  item?: ClipboardItem;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClipboardSyncService {
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private currentCode: string | null = null;
  private readonly events$ = new Subject<ClipboardSyncEvent>();

  constructor() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('acklet_clipboard_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.shareCode === this.currentCode) {
            this.events$.next(event.data);
          }
        };
      } catch (e) {
        // BroadcastChannel not supported in current environment
      }
    }
  }

  get events(): Observable<ClipboardSyncEvent> {
    return this.events$.asObservable();
  }

  connect(shareCode: string): void {
    const clean = shareCode.trim().toLowerCase();
    this.currentCode = clean;

    // Connect to Server-Sent Events for cross-device real-time sync
    if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      this.disconnectEventSource();
      try {
        const sseUrl = `${environment.apiBaseUrl}/clipboard/shares/${clean}/events`;
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.addEventListener('ITEM_ADDED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.shareCode === this.currentCode) {
              this.events$.next(data);
            }
          } catch (_) {}
        });

        this.eventSource.addEventListener('ITEM_DELETED', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data && data.shareCode === this.currentCode) {
              this.events$.next(data);
            }
          } catch (_) {}
        });

        this.eventSource.onerror = () => {
          // EventSource automatically handles retry backoff
        };
      } catch (err) {
        console.warn('SSE connection unavailable; relying on BroadcastChannel & reactive polling', err);
      }
    }
  }

  notifyLocalChange(event: ClipboardSyncEvent): void {
    this.events$.next(event);
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(event);
      } catch (ignored) {}
    }
  }

  private disconnectEventSource(): void {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (_) {}
      this.eventSource = null;
    }
  }

  disconnect(): void {
    this.disconnectEventSource();
    this.currentCode = null;
  }
}
