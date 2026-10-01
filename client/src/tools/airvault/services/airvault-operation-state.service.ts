import { Injectable, signal, computed } from '@angular/core';

export type OperationScope = 'composer' | 'stream' | 'global' | `item:${string}` | string;
export type OperationType = 'paste' | 'detect' | 'encrypt' | 'upload' | 'send' | 'sync-receive' | 'download';
export type OperationStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AirVaultOperation {
  id: string;
  scope: OperationScope;
  type: OperationType;
  startedAt: number;
  progress: number; // 0-100 or -1 for indeterminate
  status: OperationStatus;
  stageDescription?: string;
  error?: string;
  queueIndex?: number;
  queueTotal?: number;
  metadata?: Record<string, any>;
}

const DEFAULT_TIMEOUT_MS = 30_000; // 30s hard timeout safeguard

@Injectable({
  providedIn: 'root'
})
export class AirVaultOperationStateService {
  private operations = signal<Map<string, AirVaultOperation>>(new Map());
  private timeouts = new Map<string, any>();

  /**
   * All currently registered operations
   */
  readonly allOperations = computed(() => Array.from(this.operations().values()));

  /**
   * Only currently active (running or queued) operations
   */
  readonly activeOperations = computed(() =>
    this.allOperations().filter(op => op.status === 'running' || op.status === 'queued')
  );

  /**
   * Check if a given scope is currently busy with an active operation.
   * Scopes can be exact ("composer", "stream", "item:123") or hierarchical.
   */
  isBusy(scope: OperationScope): boolean {
    return this.activeOperations().some(op => {
      if (op.scope === scope) return true;
      if (scope === 'global') return true;
      return false;
    });
  }

  /**
   * Reactive signal checker for scope busy state
   */
  isScopeBusy(scope: OperationScope) {
    return computed(() => {
      return this.activeOperations().some(op => {
        if (op.scope === scope) return true;
        if (scope === 'global') return true;
        return false;
      });
    });
  }

  /**
   * Get an operation by its unique ID
   */
  getOperation(id: string): AirVaultOperation | undefined {
    return this.operations().get(id);
  }

  /**
   * Get progress for a specific operation (0-100, or -1 for indeterminate)
   */
  progressFor(id: string): number {
    const op = this.operations().get(id);
    return op ? op.progress : 0;
  }

  /**
   * Registers a new in-flight operation. Automatically starts the 30s safeguard timer.
   */
  registerOperation(
    id: string,
    scope: OperationScope,
    type: OperationType,
    initialProgress: number = -1,
    stageDescription?: string,
    metadata?: Record<string, any>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): AirVaultOperation {
    // Clear any previous timeout if reusing id
    this.clearTimeoutTimer(id);

    const op: AirVaultOperation = {
      id,
      scope,
      type,
      startedAt: Date.now(),
      progress: initialProgress,
      status: 'running',
      stageDescription,
      metadata
    };

    this.operations.update(map => {
      const next = new Map(map);
      next.set(id, op);
      return next;
    });

    // 7. GLOBAL SAFEGUARD: Arm 30s timeout
    if (timeoutMs > 0) {
      const timer = setTimeout(() => {
        this.handleTimeout(id);
      }, timeoutMs);
      this.timeouts.set(id, timer);
    }

    return op;
  }

  /**
   * Updates an in-flight operation's progress and current stage description.
   */
  updateProgress(id: string, progress: number, stageDescription?: string, queueInfo?: { index: number; total: number }) {
    this.operations.update(map => {
      const existing = map.get(id);
      if (!existing || existing.status === 'completed' || existing.status === 'failed') return map;

      const next = new Map(map);
      next.set(id, {
        ...existing,
        progress: Math.min(100, Math.max(0, progress)),
        stageDescription: stageDescription !== undefined ? stageDescription : existing.stageDescription,
        queueIndex: queueInfo?.index !== undefined ? queueInfo.index : existing.queueIndex,
        queueTotal: queueInfo?.total !== undefined ? queueInfo.total : existing.queueTotal
      });
      return next;
    });
  }

  /**
   * Marks an operation as successfully completed and cleans up timers.
   */
  completeOperation(id: string) {
    this.clearTimeoutTimer(id);
    this.operations.update(map => {
      const existing = map.get(id);
      if (!existing) return map;

      const next = new Map(map);
      next.set(id, {
        ...existing,
        progress: 100,
        status: 'completed'
      });
      return next;
    });

    // Clean up finished operation after a short grace period
    setTimeout(() => {
      this.operations.update(map => {
        if (!map.has(id)) return map;
        const next = new Map(map);
        next.delete(id);
        return next;
      });
    }, 2500);
  }

  /**
   * Marks an operation as failed with an error message.
   */
  failOperation(id: string, error?: string) {
    this.clearTimeoutTimer(id);
    console.warn(`[AirVault Operation State] ⚠️ Operation "${id}" failed: ${error || 'Unknown error'}`);

    this.operations.update(map => {
      const existing = map.get(id);
      if (!existing) return map;

      const next = new Map(map);
      next.set(id, {
        ...existing,
        status: 'failed',
        error: error || 'Operation timed out or failed'
      });
      return next;
    });
  }

  /**
   * Cancels an in-flight operation
   */
  cancelOperation(id: string) {
    this.clearTimeoutTimer(id);
    this.operations.update(map => {
      const existing = map.get(id);
      if (!existing) return map;

      const next = new Map(map);
      next.set(id, {
        ...existing,
        status: 'cancelled'
      });
      return next;
    });

    setTimeout(() => {
      this.operations.update(map => {
        if (!map.has(id)) return map;
        const next = new Map(map);
        next.delete(id);
        return next;
      });
    }, 1000);
  }

  /**
   * Timeout watchdog handler for stuck operations
   */
  private handleTimeout(id: string) {
    const op = this.operations().get(id);
    if (op && (op.status === 'running' || op.status === 'queued')) {
      console.warn(`[AirVault Operation State] ⏱️ Global safeguard: Operation ${id} (${op.type} on scope "${op.scope}") timed out after 30s. Transitioning to failed state.`);
      this.failOperation(id, `Operation timed out after 30s (exceeded safeguard threshold)`);
    }
  }

  private clearTimeoutTimer(id: string) {
    const timer = this.timeouts.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(id);
    }
  }
}
