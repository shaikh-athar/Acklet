/**
 * AirVault Clipboard Sync Debug Logger
 * Dedicated centralized logger for tracing clipboard synchronization pipeline end-to-end.
 *
 * All logs follow the standardized correlation flow:
 * [HH:mm:ss.SSS] [SYNC:<correlationId>] <Stage> | <key1>=<value1> | <key2>=<value2>
 *
 * NEVER log clipboard text itself, passwords, PINs, or decrypted payloads.
 */

export const ENABLE_AIRVAULT_SYNC_DEBUG = false;

export class AirVaultLogger {
  static isDebugEnabled(): boolean {
    if (typeof window !== 'undefined' && (window as any).__AIRVAULT_DEBUG__ !== undefined) {
      return !!(window as any).__AIRVAULT_DEBUG__;
    }
    return ENABLE_AIRVAULT_SYNC_DEBUG;
  }

  static info(msg: string, ...args: any[]): void {
    console.log(msg, ...args);
  }

  static debug(msg: string, ...args: any[]): void {
    if (this.isDebugEnabled()) {
      console.log(msg, ...args);
    }
  }

  static warn(msg: string, ...args: any[]): void {
    console.warn(msg, ...args);
  }

  static error(msg: string, ...args: any[]): void {
    console.error(msg, ...args);
  }
}

export class AirVaultSyncDebugLogger {
  private static logs: string[] = [];
  private static timers = new Map<string, number>();

  static createCorrelationId(): string {
    return Math.random().toString(36).substring(2, 8);
  }

  static startTimer(correlationId: string): void {
    this.timers.set(correlationId, Date.now());
  }

  static getElapsedMs(correlationId: string): number {
    const start = this.timers.get(correlationId);
    return start ? Date.now() - start : 0;
  }

  static formatTimestamp(d = new Date()): string {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  static log(correlationId: string, stage: string, metadata?: Record<string, any>): void {
    const timeStr = this.formatTimestamp();
    const cid = correlationId || 'SYSTEM';
    const prefix = `[${timeStr}] [SYNC:${cid}] ${stage}`;
    let metaStr = '';
    if (metadata && Object.keys(metadata).length > 0) {
      const parts = Object.entries(metadata)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
      if (parts.length > 0) {
        metaStr = ` | ${parts.join(' | ')}`;
      }
    }
    const fullLogLine = `${prefix}${metaStr}`;
    this.logs.push(fullLogLine);
    if (this.logs.length > 2000) {
      this.logs.shift();
    }

    if (typeof window !== 'undefined') {
      (window as any).__airvaultSyncDebugLogs = this.logs;
    }

    if (AirVaultLogger.isDebugEnabled()) {
      console.log(fullLogLine);
    }
  }

  static logPollerStart(intervalMs: number): void {
    this.log('SYSTEM', 'Poller started', { intervalMs });
  }

  static logClipboardDetected(correlationId: string, length: number): void {
    this.log(correlationId, 'Clipboard detected', { length });
  }

  static logHashChanged(correlationId: string): void {
    this.log(correlationId, 'Hash changed');
  }

  static logDuplicateCheck(correlationId: string, isDuplicate: boolean, reason?: string, hash?: string): void {
    this.log(correlationId, 'Duplicate check', { result: isDuplicate, reason, hash });
  }

  static logBeamContentCalled(correlationId: string, contentType = 'text'): void {
    this.log(correlationId, `beamContent(${contentType}) called`);
  }

  static logPacketCreated(correlationId: string, packetId: string, type = 'SYNC_PACKET', category?: string): void {
    this.log(correlationId, 'Packet created', { type, packetId, category });
  }

  static logSending(correlationId: string, target: string): void {
    this.log(correlationId, 'Sending', { target });
  }

  static logSendSkipped(correlationId: string, reason: string, target?: string, extra?: Record<string, any>): void {
    this.log(correlationId, 'Sending skipped', { reason, target, ...extra });
  }

  static logSignalPost(correlationId: string, target: string, status: number | string, elapsedMs?: number, isError = false): void {
    const stage = isError ? 'WS Signal Dispatch FAILED' : 'WS Signal Dispatch';
    this.log(correlationId, stage, { target, status, ...(elapsedMs !== undefined ? { elapsedMs } : {}) });
  }

  static logOutboxQueued(correlationId: string, packetId: string, target: string, reason: string): void {
    this.log(correlationId, 'Outbox queued', { packetId, target, reason });
  }

  static logOutboxFlush(target: string, count: number): void {
    this.log('SYSTEM', 'Outbox flush', { target, count });
  }

  static logDestinationReceived(correlationId: string, source: string, packetId?: string): void {
    this.log(correlationId, 'Destination packet received', { source, packetId });
  }

  static logDestinationSkipped(correlationId: string, source: string, reason: string, packetId?: string): void {
    this.log(correlationId, 'Destination packet skipped', { source, reason, packetId });
  }

  static logPacketDecrypted(correlationId: string, category: string, isError = false, errorMsg?: string): void {
    if (isError) {
      this.log(correlationId, 'Packet decryption failed', { error: errorMsg });
    } else {
      this.log(correlationId, 'Packet decrypted', { category });
    }
  }

  static logItemPersisted(correlationId: string, itemId?: string): void {
    this.log(correlationId, 'Item persisted', { itemId });
  }

  static logUIUpdated(correlationId: string): void {
    this.log(correlationId, 'UI/store updated');
  }

  static logNotificationTriggered(correlationId: string, category?: string, autoCopied?: boolean): void {
    this.log(correlationId, 'Notification triggered', { category, autoCopied });
  }

  static getLogs(): string[] {
    return [...this.logs];
  }

  static getFormattedLog(): string {
    return this.logs.join('\n');
  }

  static clear(): void {
    this.logs = [];
    this.timers.clear();
  }
}
