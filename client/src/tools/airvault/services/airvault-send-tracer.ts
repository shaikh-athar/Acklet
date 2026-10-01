/**
 * AirVault Send Pipeline — Forensic Instrumentation  (Complete Implementation)
 *
 * INVESTIGATION PHASE ONLY — NO FIXES, NO ARCHITECTURAL CHANGES.
 *
 * Covers all 18 sections of the Send Failure & UI Freeze investigation protocol.
 *
 * Enable:  window.__AIRVAULT_SEND_TRACE__ = true
 * Export:  window.__AIRVAULT_SEND_EXPORT__()
 * Summary: window.__AIRVAULT_SEND_SUMMARY__()
 */

// ── §1 ACTIVATION GUARD & CANONICAL LOG ─────────────────────────────────────

export function isSendTracerEnabled(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__AIRVAULT_SEND_TRACE__;
}

/** §1: Canonical structured log — performance.now() monotonic timestamps, never logs user data */
export function sendLog(
  operationId: string,
  stage: string,
  data: Record<string, unknown> = {}
): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] ${stage}`, { t: +performance.now().toFixed(3), ...sanitiseLogData(data) });
}

function sanitiseLogData(data: Record<string, unknown>): Record<string, unknown> {
  const FORBIDDEN = ['raw', 'content', 'plaintext', 'ciphertext', 'password', 'authheader', 'enckey'];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = FORBIDDEN.some(f => k.toLowerCase().includes(f)) ? '[REDACTED]' : v;
  }
  return out;
}

// ── §2 PERFORMANCE MARKS / MEASURES ──────────────────────────────────────────

export function markStart(operationId: string, stage: string): void {
  if (!isSendTracerEnabled()) return;
  try { performance.mark(`send:${operationId}:${stage}:start`); } catch { /* noop */ }
}

export function markEnd(operationId: string, stage: string): void {
  if (!isSendTracerEnabled()) return;
  try {
    performance.mark(`send:${operationId}:${stage}:end`);
    performance.measure(`send:${operationId}:${stage}`, `send:${operationId}:${stage}:start`, `send:${operationId}:${stage}:end`);
  } catch { /* noop */ }
}

export function getMeasureMs(operationId: string, stage: string): number {
  try {
    const entries = performance.getEntriesByName(`send:${operationId}:${stage}`);
    return entries.length > 0 ? entries[entries.length - 1].duration : -1;
  } catch { return -1; }
}

// ── §3 COMPOSER STATE SNAPSHOT ────────────────────────────────────────────────

export interface AttachmentMeta {
  id: string; name: string; type: string; sizeBytes: number;
  hasPreviewUrl: boolean; resourceState?: string;
}

export interface ComposerSnapshot {
  operationId: string; checkpoint: string; t: number;
  textPresent: boolean; textLength: number;
  attachmentCount: number; attachments: AttachmentMeta[];
  connectedDeviceCount: number;
}

export function snapshotComposer(
  operationId: string, checkpoint: string, textLength: number,
  attachments: Array<{ id: string; file: { name: string; type: string; size: number }; previewUrl?: string; processingState?: string }>,
  connectedDeviceCount: number
): ComposerSnapshot {
  const snap: ComposerSnapshot = {
    operationId, checkpoint, t: +performance.now().toFixed(3),
    textPresent: textLength > 0, textLength,
    attachmentCount: attachments.length,
    attachments: attachments.map(a => ({
      id: a.id, name: a.file.name, type: a.file.type || 'unknown',
      sizeBytes: a.file.size, hasPreviewUrl: !!a.previewUrl, resourceState: a.processingState ?? 'unknown',
    })),
    connectedDeviceCount,
  };
  if (isSendTracerEnabled()) console.debug(`[SEND][${operationId}] COMPOSER_SNAPSHOT@${checkpoint}`, snap);
  return snap;
}

// ── §4 FILE PIPELINE STAGE LOGGING ───────────────────────────────────────────

export function logFileStart(operationId: string, fileId: string, size: number, type: string, thread: 'main' | 'worker'): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] FILE_START`, { fileId, size, type, thread, t: +performance.now().toFixed(3) });
}

export function logFileValidated(operationId: string, fileId: string, durationMs: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] FILE_VALIDATED`, { fileId, durationMs: +durationMs.toFixed(2) });
}

export function logUploadInitStart(operationId: string, fileId: string, sizeBytes: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] UPLOAD_INIT_START`, { fileId, sizeBytes, t: +performance.now().toFixed(3) });
}

export function logUploadInitEnd(operationId: string, fileId: string, durationMs: number, status: number, hasSessionId?: boolean): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] UPLOAD_INIT_END`, { fileId, durationMs: +durationMs.toFixed(2), httpStatus: status, hasSessionId: !!hasSessionId });
  if (status >= 400) console.warn(`[AIRVAULT][UPLOAD_INIT_FAIL] HTTP ${status} for file ${fileId}`);
}

export function logWorkerPost(operationId: string, fileId: string, fileSizeBytes: number, fileType: string): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] WORKER_POST`, {
    fileId, fileSizeBytes, fileType, t: +performance.now().toFixed(3),
    noteForReview: 'File sent inside payload object — structured clone applies; large files may block postMessage',
  });
}

export function logWorkerMessage(operationId: string, fileId: string, msgType: string, durationSincePostMs: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] WORKER_MESSAGE`, {
    fileId, msgType, durationSincePostMs: +durationSincePostMs.toFixed(2),
    slowQueueWarning: durationSincePostMs > 200 ? `⚠️ ${durationSincePostMs.toFixed(0)}ms main-thread queue delay between postMessage and handler` : 'ok',
  });
}

export function logResourceCreated(operationId: string, fileId: string, durationMs: number, category: string, sizeBytes: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] RESOURCE_CREATED`, { fileId, durationMs: +durationMs.toFixed(2), category, sizeBytes });
}

export function logResourcePersisted(operationId: string, fileId: string, durationMs: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] RESOURCE_PERSISTED`, { fileId, durationMs: +durationMs.toFixed(2) });
}

export function logResourceReady(operationId: string, fileId: string, totalDurationMs: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] RESOURCE_READY`, { fileId, totalDurationMs: +totalDurationMs.toFixed(2) });
  if (totalDurationMs > 3000) console.warn(`[AIRVAULT][SLOW_RESOURCE] File ${fileId} took ${totalDurationMs.toFixed(0)}ms`);
}

// ── §5 UI / PAYLOAD DIVERGENCE CHECK ─────────────────────────────────────────

export function checkDivergence(
  operationId: string,
  composerAttachmentIds: string[],
  payloadResourceIds: string[]
): boolean {
  if (!isSendTracerEnabled()) return false;
  const mismatch = composerAttachmentIds.length !== payloadResourceIds.length ||
    composerAttachmentIds.some(id => !payloadResourceIds.includes(id));
  const report = {
    operationId,
    composerAttachmentCount: composerAttachmentIds.length,
    payloadResourceCount: payloadResourceIds.length,
    composerIds: composerAttachmentIds,
    payloadIds: payloadResourceIds,
    divergenceDetected: mismatch,
    t: +performance.now().toFixed(3),
  };
  console.debug('[SEND][DIVERGENCE_CHECK]', report);
  if (mismatch) {
    // §5: DO NOT silently correct — log and continue
    console.assert(false, '[AIRVAULT] ⚠️ COMPOSER/PAYLOAD ATTACHMENT MISMATCH', report);
  }
  return mismatch;
}

// ── §6 MAIN-THREAD BLOCKING CANDIDATE MEASUREMENT ────────────────────────────

/** §6: Wrap any synchronous blocking candidate to measure its duration on the main thread. */
export function measureSync<T>(operationId: string, label: string, fn: () => T): T {
  if (!isSendTracerEnabled()) return fn();
  const t0 = performance.now();
  const result = fn();
  const dur = performance.now() - t0;
  console.debug(`[SEND][${operationId}] SYNC_OP`, {
    label, durationMs: +dur.toFixed(3),
    blocksMainThread: dur > 16,
    warning: dur > 16 ? `⚠️ ${label} took ${dur.toFixed(1)}ms synchronously on main thread (>1 frame)` : 'ok',
  });
  return result;
}

/** §6: Log any signal.set() carrying large arrays/objects — potential GC pressure source. */
export function logSignalWrite(operationId: string, signalName: string, itemCount: number, approximateBytes?: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] SIGNAL_WRITE`, {
    signalName, itemCount, approximateBytes: approximateBytes ?? '?',
    warning: itemCount > 50 ? `⚠️ Signal "${signalName}" updated with ${itemCount} items — may trigger large CD cycle` : 'ok',
  });
}

// ── §7 WORKER BOUNDARY HOP TIMING ────────────────────────────────────────────

const _workerPostTimestamps = new Map<string, number>(); // fileId → t at postMessage

export function recordWorkerPostTime(fileId: string): void { _workerPostTimestamps.set(fileId, performance.now()); }
export function getWorkerPostElapsedMs(fileId: string): number {
  const t0 = _workerPostTimestamps.get(fileId);
  return t0 !== undefined ? performance.now() - t0 : -1;
}
export function clearWorkerPostTime(fileId: string): void { _workerPostTimestamps.delete(fileId); }

// ── §8 CRYPTO STAGE BREAKDOWN (usable in Worker context too) ─────────────────

export function logCryptoPrepareStart(operationId: string, chunkIndex: number, chunkBytes: number): void {
  console.debug(`[SEND][${operationId}] CRYPTO_PREPARE_START`, { chunkIndex, chunkBytes, t: +performance.now().toFixed(3) });
}
export function logCryptoPrepareEnd(operationId: string, chunkIndex: number, durationMs: number): void {
  console.debug(`[SEND][${operationId}] CRYPTO_PREPARE_END`, { chunkIndex, durationMs: +durationMs.toFixed(3) });
}
export function logCryptoEncryptStart(operationId: string, chunkIndex: number): void {
  console.debug(`[SEND][${operationId}] CRYPTO_ENCRYPT_START`, { chunkIndex, t: +performance.now().toFixed(3) });
}
export function logCryptoEncryptEnd(operationId: string, chunkIndex: number, durationMs: number, cipherBytes: number): void {
  console.debug(`[SEND][${operationId}] CRYPTO_ENCRYPT_END`, {
    chunkIndex, durationMs: +durationMs.toFixed(3), cipherBytes,
    note: '§8: crypto.subtle runs on separate thread — slow await ≠ main-thread block; freeze here → check surrounding sync prep work',
  });
}
export function logCryptoResultHandle(operationId: string, chunkIndex: number, durationMs: number): void {
  console.debug(`[SEND][${operationId}] CRYPTO_RESULT_HANDLE`, { chunkIndex, durationMs: +durationMs.toFixed(3) });
}

// ── §9 INDEXEDDB FULL OPERATION ACCOUNTING ───────────────────────────────────

export function logIndexedDbOp(
  operationId: string,
  operation: 'getAll' | 'put' | 'bulkPut' | 'clear' | 'transaction' | 'add' | 'delete',
  store: string, durationMs: number, recordCount: number, approximateBytes?: number
): void {
  if (!isSendTracerEnabled()) return;
  const isFullReread = operation === 'getAll' && recordCount > 10;
  console.debug(`[SEND][${operationId}] IDB_OP`, {
    operation, store, durationMs: +durationMs.toFixed(2), recordCount,
    approximateBytes: approximateBytes ?? '?',
    suspectedInvisibleReread: isFullReread
      ? `⚠️ §9: getAll() returned ${recordCount} records — check if Send triggers full-history re-read + re-render`
      : false,
  });
  if (durationMs > 100) console.warn(`[AIRVAULT][IDB_SLOW] "${operation}" on "${store}" took ${durationMs.toFixed(1)}ms (${recordCount} records)`);
}

// ── §10 NETWORK / API LOGGING ─────────────────────────────────────────────────

export function logRequestStart(operationId: string, endpoint: string, approxBytes?: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] REQUEST_START`, { endpoint, approxPayloadBytes: approxBytes, t: +performance.now().toFixed(3) });
}
export function logRequestEnd(operationId: string, endpoint: string, durationMs: number, status: number, responseBody?: string): void {
  if (!isSendTracerEnabled()) return;
  const errMsg = status >= 400 && responseBody
    ? (() => { try { return JSON.parse(responseBody).message || responseBody.slice(0, 200); } catch { return responseBody.slice(0, 200); } })()
    : undefined;
  console.debug(`[SEND][${operationId}] REQUEST_END`, { endpoint, durationMs: +durationMs.toFixed(1), httpStatus: status, errorMessage: errMsg });
  if (status >= 400) console.warn(`[AIRVAULT][REQUEST_FAIL] ${endpoint} → HTTP ${status}${errMsg ? ': ' + errMsg : ''}`);
}
export function logRequestFailed(operationId: string, endpoint: string, reason: string, durationMs?: number): void {
  if (!isSendTracerEnabled()) return;
  console.error(`[SEND][${operationId}] REQUEST_FAILED`, { endpoint, reason, durationMs });
}
export function logRequestAborted(operationId: string, endpoint: string, reason: string): void {
  if (!isSendTracerEnabled()) return;
  console.warn(`[SEND][${operationId}] REQUEST_ABORTED`, { endpoint, reason });
}

// ── §11 BROADCAST / P2P FAN-OUT TIMING ───────────────────────────────────────

export function logBroadcastStart(operationId: string, deviceCount: number, deviceIds: string[]): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] BROADCAST_START`, {
    deviceCount, deviceIds, t: +performance.now().toFixed(3),
    note: '§11: Check whether each device is fired-and-forgotten or awaited (Promise.all blocks on slowest)',
  });
}
export function logBroadcastDeviceStart(operationId: string, deviceId: string): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] BROADCAST_DEVICE_START`, { deviceId, t: +performance.now().toFixed(3) });
}
export function logBroadcastDeviceEnd(operationId: string, deviceId: string, durationMs: number, success: boolean): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] BROADCAST_DEVICE_DONE`, {
    deviceId, durationMs: +durationMs.toFixed(1), success,
    slowWarning: durationMs > 2000 ? '⚠️ >2s — possible offline peer timeout causing broadcast hang' : 'ok',
  });
}
export function logBroadcastComplete(operationId: string, totalMs: number, successCount: number, failCount: number): void {
  if (!isSendTracerEnabled()) return;
  console.debug(`[SEND][${operationId}] BROADCAST_COMPLETE`, {
    totalMs: +totalMs.toFixed(1), successCount, failCount,
    hangHint: failCount > 0 ? '§11: if totalMs >> expected, broadcast waited for failed device — check Promise.all vs allSettled' : undefined,
  });
}

// ── §12 DUPLICATE EXECUTION COUNTERS ─────────────────────────────────────────

const _counters = new Map<string, number>();

export function countStage(stage: string): number {
  const n = (_counters.get(stage) ?? 0) + 1;
  _counters.set(stage, n);
  if (isSendTracerEnabled()) {
    console.count(`[AIRVAULT] ${stage}`);
    if (n > 1) console.warn(`[AIRVAULT][DUPLICATE_EXEC] ⚠️ "${stage}" fired ${n} times — duplicate bindings/listener?`);
  }
  return n;
}
export function resetCounters(): void { _counters.clear(); }
export function getExecutionCounts(): Record<string, number> { return Object.fromEntries(_counters); }

// ── §13 EFFECT / SUBSCRIPTION LOOP AUDIT ─────────────────────────────────────

interface EffectRecord { name: string; callCount: number; lastCalledT: number }
const _effectRegistry = new Map<string, EffectRecord>();

export function auditEffect(name: string): void {
  if (!isSendTracerEnabled()) return;
  const rec = _effectRegistry.get(name) ?? { name, callCount: 0, lastCalledT: 0 };
  rec.callCount++;
  rec.lastCalledT = performance.now();
  _effectRegistry.set(name, rec);
  if (rec.callCount > 3) {
    console.warn(`[AIRVAULT][EFFECT_LOOP] ⚠️ "${name}" fired ${rec.callCount} times — possible send→state→effect→send feedback loop`);
  }
}
export function resetEffectRegistry(): void { _effectRegistry.clear(); }
export function getEffectCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of _effectRegistry) out[k] = v.callCount;
  return out;
}

// ── §14 LONG-TASK OBSERVER + MEMORY SNAPSHOTS ─────────────────────────────────

const _longTaskLog: Array<{ duration: number; startTime: number; attribution: any[] }> = [];
let _longTaskObserverInstalled = false;

export function installLongTaskObserver(): void {
  if (_longTaskObserverInstalled) return;
  _longTaskObserverInstalled = true;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const attr = (entry as any).attribution?.map((a: any) => ({
          name: a.name, containerType: a.containerType, containerSrc: a.containerSrc, containerId: a.containerId,
        })) ?? [];
        _longTaskLog.push({ duration: entry.duration, startTime: entry.startTime, attribution: attr });
        if (isSendTracerEnabled()) {
          console.warn('[AIRVAULT][LONG_TASK]', { duration: +entry.duration.toFixed(1), startTime: +entry.startTime.toFixed(1), attribution: attr });
          snapshotMemory('AFTER_LONG_TASK');
        }
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch { /* not supported */ }
}

export interface MemorySnapshot { label: string; t: number; usedMB: number; totalMB: number; limitMB: number }
const _memorySnapshots: MemorySnapshot[] = [];

export function snapshotMemory(label: string): MemorySnapshot | null {
  if (!isSendTracerEnabled()) return null;
  const m = (performance as any).memory;
  if (!m) return null;
  const snap: MemorySnapshot = {
    label, t: +performance.now().toFixed(3),
    usedMB: +(m.usedJSHeapSize / 1048576).toFixed(2),
    totalMB: +(m.totalJSHeapSize / 1048576).toFixed(2),
    limitMB: +(m.jsHeapSizeLimit / 1048576).toFixed(2),
  };
  _memorySnapshots.push(snap);
  console.debug('[AIRVAULT][MEMORY]', snap);
  return snap;
}

// ── §15 STAGE WATCHDOG (log-only, never aborts) ──────────────────────────────

interface ActiveOp { operationId: string; stage: string; startMs: number; timerId: ReturnType<typeof setTimeout> }
const _activeOps = new Map<string, ActiveOp>();

const STAGE_TIMEOUTS: Record<string, number> = {
  PREPARING: 5_000, UPLOAD_INIT: 8_000, WORKER: 15_000,
  API: 15_000, INDEXEDDB: 5_000, CRYPTO: 5_000, BROADCAST: 10_000, STATE_UPDATE: 3_000,
};

export function watchdogStart(operationId: string, stage: string): void {
  if (!isSendTracerEnabled()) return;
  watchdogClear(operationId);
  const timeoutMs = STAGE_TIMEOUTS[stage] ?? 10_000;
  const startMs = performance.now();
  const timerId = setTimeout(() => {
    const elapsed = performance.now() - startMs;
    console.warn(`[SEND][${operationId}][TIMEOUT] Stage="${stage}" elapsedMs=${elapsed.toFixed(0)} — pipeline stalled`, { operationId, stage, elapsedMs: +elapsed.toFixed(0) });
    _activeOps.delete(operationId);
  }, timeoutMs);
  _activeOps.set(operationId, { operationId, stage, startMs, timerId });
}
export function watchdogClear(operationId: string): void {
  const op = _activeOps.get(operationId);
  if (op) { clearTimeout(op.timerId); _activeOps.delete(operationId); }
}

// ── §16 STRUCTURED TEST-RUN RECORDER ─────────────────────────────────────────

export interface StageRecord { durationMs: number; status: 'ok' | 'error' | 'timeout' | 'skipped'; detail?: string }

export interface TestRunRecord {
  operationId: string; scenario?: string;
  resourceCount: number; resourceSize?: number; connectedDevices: number;
  sendStartT: number; sendEndT?: number; totalDurationMs?: number;
  /** §16 required stages */
  stages: {
    validation?: StageRecord; resourceCollection?: StageRecord;
    worker?: StageRecord; upload?: StageRecord; indexedDb?: StageRecord;
    crypto?: StageRecord; api?: StageRecord; broadcast?: StageRecord;
    stateUpdate?: StageRecord; angularRender?: StageRecord; textBeam?: StageRecord;
    [key: string]: StageRecord | undefined;
  };
  composerSnapshotBefore?: ComposerSnapshot;
  composerSnapshotAfter?: ComposerSnapshot;
  memoryBefore?: MemorySnapshot | null;
  memoryAfter?: MemorySnapshot | null;
  divergenceDetected: boolean;
  duplicateExecutionDetected: boolean;
  longTasksDuringRun: Array<{ duration: number; startTime: number }>;
  effectLoopCounts: Record<string, number>;
  executionCounts: Record<string, number>;
}

const _runs: TestRunRecord[] = [];
let _runStartLongTaskCount = 0;

export function createRun(
  operationId: string, resourceCount: number, connectedDevices: number,
  resourceSize?: number, scenario?: string
): TestRunRecord {
  _runStartLongTaskCount = _longTaskLog.length;
  const run: TestRunRecord = {
    operationId, scenario, resourceCount, resourceSize, connectedDevices,
    sendStartT: +performance.now().toFixed(3),
    stages: {}, divergenceDetected: false, duplicateExecutionDetected: false,
    longTasksDuringRun: [], effectLoopCounts: {}, executionCounts: {},
  };
  _runs.push(run);
  return run;
}

export function recordStage(run: TestRunRecord, stage: string, durationMs: number, status: StageRecord['status'], detail?: string): void {
  run.stages[stage] = { durationMs: +durationMs.toFixed(2), status, detail };
}

export function finaliseRun(run: TestRunRecord): void {
  run.sendEndT = +performance.now().toFixed(3);
  run.totalDurationMs = +(run.sendEndT - run.sendStartT).toFixed(2);
  run.longTasksDuringRun = _longTaskLog.slice(_runStartLongTaskCount).map(lt => ({ duration: +lt.duration.toFixed(1), startTime: +lt.startTime.toFixed(1) }));
  run.effectLoopCounts = getEffectCounts();
  run.executionCounts = getExecutionCounts();
  run.memoryAfter = snapshotMemory('AFTER_RUN');
  if (isSendTracerEnabled()) console.info('[AIRVAULT][SEND_RUN_COMPLETE] §16 record:', JSON.parse(JSON.stringify(run)));
}

export function exportRuns(): TestRunRecord[] { return _runs.map(r => JSON.parse(JSON.stringify(r))); }

// ── §17 GLOBAL EXPORT HELPER ──────────────────────────────────────────────────

export function installGlobalExporter(): void {
  if (typeof window === 'undefined') return;

  (window as any).__AIRVAULT_SEND_EXPORT__ = () => {
    const data = {
      runs: exportRuns(),
      performanceMeasures: performance.getEntriesByType('measure')
        .filter(e => e.name.startsWith('send:'))
        .map(e => ({ name: e.name, durationMs: +e.duration.toFixed(2), startTimeMs: +e.startTime.toFixed(2) })),
      executionCounts: getExecutionCounts(),
      effectLoopCounts: getEffectCounts(),
      memorySnapshots: _memorySnapshots,
      longTasks: _longTaskLog.map(lt => ({ duration: +lt.duration.toFixed(1), startTime: +lt.startTime.toFixed(1), attribution: lt.attribution })),
      // §18 confidence table scaffold — filled in after reviewing evidence
      confidenceTable: {
        'Premature composer state clearing':       'PENDING — compare STAGED_ATTACHMENTS_CLEARED.t vs WORKER_DONE.t',
        'Large base64 worker→main transfer':        'PENDING — check WORKER_DONE.rawContentBytes; flag if >500KB',
        'Missing send-state lock/timeout':          'PENDING — check TIMEOUT entries in console',
        'UI/payload attachment divergence':         'PENDING — check DIVERGENCE_CHECK.divergenceDetected',
        'Duplicate send execution':                 'PENDING — check executionCounts.SEND_HANDLER > 1',
        'Synchronous full-history IDB re-read':     'PENDING — check IDB_OP.suspectedInvisibleReread',
        'Broadcast blocking on offline device':     'PENDING — check BROADCAST_DEVICE_DONE.slowWarning',
        'Effect/subscription feedback loop':        'PENDING — check effectLoopCounts for any value > 3',
      },
    };
    console.info('[AIRVAULT] §17 Full Trace Export:\n', JSON.stringify(data, null, 2));
    return data;
  };

  (window as any).__AIRVAULT_SEND_SUMMARY__ = () => {
    const runs = exportRuns();
    if (!runs.length) { console.info('[AIRVAULT] No runs recorded. Enable: window.__AIRVAULT_SEND_TRACE__ = true'); return; }
    const last = runs[runs.length - 1];
    console.group(`[AIRVAULT] Last Run — Op ${last.operationId.slice(0, 8)}…`);
    console.table(last.stages);
    console.info('Total duration:', last.totalDurationMs, 'ms');
    console.info('Divergence:', last.divergenceDetected);
    console.info('Duplicate exec:', last.duplicateExecutionDetected);
    console.info('Long tasks during run:', last.longTasksDuringRun.length);
    console.info('Effect loop counts:', last.effectLoopCounts);
    console.groupEnd();
    return last;
  };

  if (isSendTracerEnabled()) {
    console.info(
      '%c[AirVault Send Tracer] ACTIVE\n' +
      'Export: window.__AIRVAULT_SEND_EXPORT__()\n' +
      'Summary: window.__AIRVAULT_SEND_SUMMARY__()',
      'color:#22c55e;font-weight:bold'
    );
  }
}
