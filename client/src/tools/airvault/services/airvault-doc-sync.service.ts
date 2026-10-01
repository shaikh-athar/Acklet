import { Injectable, inject, signal, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AirVaultDeviceService } from './airvault-device.service';
import { AirVaultUIStore } from './airvault-ui.store';
import { getAirVaultApiUrl } from './airvault-api.util';
import { catchError, of, firstValueFrom } from 'rxjs';
import { AirVaultLogger } from './airvault-sync-debug.service';

export interface DocOperation {
  opId: string;
  docId: string;
  sequenceNumber?: number;
  type: 'ADD' | 'EDIT' | 'DELETE';
  lineId: string;
  authorId: string;
  authorName?: string;
  content?: string;
  timestamp: number;
  deletedAtSequence?: number;
}

export interface DocLineState {
  lineId: string;
  content: string;
  authorId: string;
  authorName?: string;
  lastSequence: number;
  deleted: boolean;
  deletedAtSequence?: number;
  lastEditedAt: number;
}

export interface DocState {
  docId: string;
  latestSequenceNumber: number;
  lines: DocLineState[];
  timestamp: number;
}

export type SyncingStatus = 'idle' | 'syncing' | 'offline' | 'reconnecting';

@Injectable({
  providedIn: 'root'
})
export class AirVaultDocSyncService {
  private http = inject(HttpClient);
  private deviceService = inject(AirVaultDeviceService);
  private uiStore = inject(AirVaultUIStore);
  private ngZone = inject(NgZone);

  private readonly docSyncBaseUrl = getAirVaultApiUrl('/api/v1/airvault/sync/doc');

  // Active document ID (can be pairing group ID or default doc)
  public activeDocId = signal<string>('airvault-shared-doc');

  // Current server sequence number applied to local state
  public currentSequenceNumber = signal<number>(0);

  // Ordered document lines
  public docLines = signal<DocLineState[]>([]);

  // Subtle sync state indicator for UX
  public syncingState = signal<SyncingStatus>('idle');

  // Out-of-order operations buffer keyed by sequenceNumber
  private gapBuffer = new Map<number, DocOperation>();

  // Queue of local operations created while offline
  private offlineQueue: DocOperation[] = [];

  // Deduplication set for processed opIds
  private processedOpIds = new Set<string>();

  private syncStateTimeout: any = null;
  private gapRecoveryTimeout: any = null;

  constructor() {
    // Listen to browser online/offline events for automatic offline replay
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkOnline());
      window.addEventListener('offline', () => this.handleNetworkOffline());
    }
  }

  /**
   * Initializes or connects to a shared document workspace.
   */
  async initDocument(docId: string) {
    this.activeDocId.set(docId);
    this.gapBuffer.clear();
    await this.requestFullResync(docId);
  }

  /**
   * Dispatches a local line change (ADD / EDIT / DELETE) to the server sequencer.
   * If offline, queues operation locally for replay on reconnect.
   */
  async submitLocalOperation(
    lineId: string,
    content: string | null,
    type: 'ADD' | 'EDIT' | 'DELETE' = 'EDIT',
    docId: string = this.activeDocId()
  ): Promise<DocOperation | null> {
    const curDev = this.deviceService.currentDevice();
    const op: DocOperation = {
      opId: crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      docId,
      type,
      lineId,
      authorId: curDev.id,
      authorName: curDev.username || curDev.name || 'Local Device',
      content: type === 'DELETE' ? undefined : (content || ''),
      timestamp: Date.now()
    };

    this.processedOpIds.add(op.opId);

    // If offline, queue locally
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      AirVaultLogger.debug(`[AirVault DocSync] 📴 Offline: queuing opId=${op.opId} for lineId=${lineId}`);
      this.offlineQueue.push(op);
      this.syncingState.set('offline');
      return op;
    }

    try {
      this.triggerSyncingIndicator();
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: DocOperation }>(`${this.docSyncBaseUrl}/op`, op).pipe(
          catchError(err => {
            AirVaultLogger.debug(`[AirVault DocSync] ⚠️ Failed to POST operation, queuing offline:`, err);
            this.offlineQueue.push(op);
            this.syncingState.set('offline');
            return of(null);
          })
        )
      );

      if (response && response.data) {
        this.applySequencedOperation(response.data);
        return response.data;
      }
    } catch (ex) {
      this.offlineQueue.push(op);
      this.syncingState.set('offline');
    }

    return op;
  }

  /**
   * Applies an incoming operation strictly in sequence number order.
   * Buffers operations if a sequence gap is detected.
   */
  applySequencedOperation(op: DocOperation) {
    if (!op || !op.sequenceNumber) return;
    if (this.processedOpIds.has(op.opId) && op.sequenceNumber <= this.currentSequenceNumber()) {
      return; // Already applied
    }

    const currentSeq = this.currentSequenceNumber();
    const expectedSeq = currentSeq + 1;

    // 1. Duplicate / Already seen past operation
    if (op.sequenceNumber <= currentSeq) {
      return;
    }

    // 2. Sequence Gap Detected (e.g. Expected 10, received 12)
    if (op.sequenceNumber > expectedSeq) {
      AirVaultLogger.warn(`[AirVault DocSync] ⚠️ Sequence gap detected: expected=${expectedSeq}, received=${op.sequenceNumber}. Buffering...`);
      this.gapBuffer.set(op.sequenceNumber, op);

      // Set a recovery timer: If gap is not filled within 1.2s, trigger full state resync
      if (!this.gapRecoveryTimeout) {
        this.gapRecoveryTimeout = setTimeout(() => {
          this.gapRecoveryTimeout = null;
          AirVaultLogger.info(`[AirVault DocSync] 🔄 Resolving unrecovered sequence gap via full resync`);
          this.requestFullResync(op.docId || this.activeDocId());
        }, 1200);
      }
      return;
    }

    // 3. Expected sequential operation -> Apply immediately
    this.executeApplyOperation(op);
    this.currentSequenceNumber.set(op.sequenceNumber);
    this.processedOpIds.add(op.opId);
    this.triggerSyncingIndicator();

    // 4. Drain any subsequent contiguous operations from gap buffer
    let nextSeq = op.sequenceNumber + 1;
    while (this.gapBuffer.has(nextSeq)) {
      const nextOp = this.gapBuffer.get(nextSeq)!;
      this.gapBuffer.delete(nextSeq);
      this.executeApplyOperation(nextOp);
      this.currentSequenceNumber.set(nextSeq);
      this.processedOpIds.add(nextOp.opId);
      nextSeq++;
    }

    if (this.gapBuffer.size === 0 && this.gapRecoveryTimeout) {
      clearTimeout(this.gapRecoveryTimeout);
      this.gapRecoveryTimeout = null;
    }
  }

  /**
   * Internal line-level state mutation applying tombstone & last-sequence conflict rules.
   */
  private executeApplyOperation(op: DocOperation) {
    const lines = [...this.docLines()];
    const index = lines.findIndex(l => l.lineId === op.lineId);
    const seq = op.sequenceNumber || (this.currentSequenceNumber() + 1);
    const type = op.type ? op.type.toUpperCase() : 'EDIT';

    if (type === 'DELETE') {
      if (index >= 0) {
        lines[index] = {
          ...lines[index],
          deleted: true,
          deletedAtSequence: seq,
          lastSequence: seq,
          lastEditedAt: op.timestamp
        };
      } else {
        lines.push({
          lineId: op.lineId,
          content: '',
          authorId: op.authorId,
          authorName: op.authorName,
          lastSequence: seq,
          deleted: true,
          deletedAtSequence: seq,
          lastEditedAt: op.timestamp
        });
      }
    } else {
      // ADD or EDIT
      if (index >= 0) {
        const existing = lines[index];
        if (existing.deleted) {
          // Check if EDIT sequence > DELETE sequence
          if (existing.deletedAtSequence != null && seq > existing.deletedAtSequence) {
            lines[index] = {
              ...existing,
              deleted: false,
              deletedAtSequence: undefined,
              content: op.content || '',
              authorId: op.authorId,
              authorName: op.authorName,
              lastSequence: seq,
              lastEditedAt: op.timestamp
            };
          }
        } else {
          // Active line: last-sequence-wins
          lines[index] = {
            ...existing,
            content: op.content || '',
            authorId: op.authorId,
            authorName: op.authorName,
            lastSequence: seq,
            lastEditedAt: op.timestamp
          };
        }
      } else {
        lines.push({
          lineId: op.lineId,
          content: op.content || '',
          authorId: op.authorId,
          authorName: op.authorName,
          lastSequence: seq,
          deleted: false,
          lastEditedAt: op.timestamp
        });
      }
    }

    this.docLines.set(lines);
  }

  /**
   * Requests full document state from the server for initial load or sequence gap recovery.
   */
  async requestFullResync(docId: string = this.activeDocId()): Promise<void> {
    this.syncingState.set('reconnecting');
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: DocState }>(`${this.docSyncBaseUrl}/${docId}/state`).pipe(
          catchError(err => {
            AirVaultLogger.warn(`[AirVault DocSync] ⚠️ Full state resync failed:`, err);
            return of(null);
          })
        )
      );

      if (res && res.data) {
        const state = res.data;
        this.docLines.set(state.lines || []);
        this.currentSequenceNumber.set(state.latestSequenceNumber || 0);
        this.gapBuffer.clear();
        AirVaultLogger.info(`[AirVault DocSync] 🌟 Full state resync complete: seq=${state.latestSequenceNumber}, lines=${state.lines?.length || 0}`);
        this.triggerSyncingIndicator();

        // Replay any offline edits against current state
        if (this.offlineQueue.length > 0) {
          await this.flushOfflineQueue();
        }
      }
    } finally {
      if (this.syncingState() === 'reconnecting') {
        this.syncingState.set('idle');
      }
    }
  }

  /**
   * Replays locally queued offline edits on reconnect.
   */
  async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;
    AirVaultLogger.debug(`[AirVault DocSync] 🚀 Replaying ${this.offlineQueue.length} offline operations against sequencer`);
    const queueToReplay = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const op of queueToReplay) {
      try {
        const res = await firstValueFrom(
          this.http.post<{ success: boolean; data: DocOperation }>(`${this.docSyncBaseUrl}/op`, op).pipe(
            catchError(err => of(null))
          )
        );
        if (res && res.data) {
          this.applySequencedOperation(res.data);
        }
      } catch (ex) {
        AirVaultLogger.warn(`[AirVault DocSync] ⚠️ Error replaying offline op:`, ex);
      }
    }
    this.syncingState.set('idle');
  }

  private handleNetworkOnline() {
    AirVaultLogger.info(`[AirVault DocSync] 🌐 Network online: requesting full resync & draining offline queue`);
    this.requestFullResync();
  }

  private handleNetworkOffline() {
    AirVaultLogger.info(`[AirVault DocSync] 📴 Network offline: switching to offline queue mode`);
    this.syncingState.set('offline');
  }

  private triggerSyncingIndicator() {
    this.syncingState.set('syncing');
    if (this.syncStateTimeout) {
      clearTimeout(this.syncStateTimeout);
    }
    this.syncStateTimeout = setTimeout(() => {
      this.syncStateTimeout = null;
      if (this.syncingState() === 'syncing') {
        this.syncingState.set('idle');
      }
    }, 700);
  }

  /**
   * Convenience helper to return current non-deleted text representation.
   */
  getActiveDocumentText(): string {
    return this.docLines()
      .filter(l => !l.deleted)
      .map(l => l.content)
      .join('\n');
  }
}
