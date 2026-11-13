// apps/tool-image-compressor/src/services/compressor-telemetry.service.spec.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CompressorTelemetryService } from './compressor-telemetry.service';

describe('CompressorTelemetryService', () => {
  let service: CompressorTelemetryService;
  let dispatchEventSpy: any;

  beforeEach(() => {
    dispatchEventSpy = vi.fn();
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = {
        dispatchEvent: dispatchEventSpy,
        localStorage: {
          getItem: vi.fn(),
          setItem: vi.fn()
        }
      };
    } else {
      vi.spyOn(window, 'dispatchEvent').mockImplementation(dispatchEventSpy);
    }

    if (typeof (globalThis as any).localStorage === 'undefined') {
      (globalThis as any).localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn()
      };
    }

    if (typeof (globalThis as any).CustomEvent === 'undefined') {
      (globalThis as any).CustomEvent = class CustomEvent {
        detail: any;
        constructor(public type: string, params?: any) {
          this.detail = params?.detail;
        }
      };
    }

    service = new CompressorTelemetryService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records tool_opened on initialization', () => {
    expect(service.isEnabled()).toBe(true);
    expect(dispatchEventSpy).toHaveBeenCalled();
  });

  it('dispatches custom acklet:telemetry event on trackUploadCompleted without PII', () => {
    dispatchEventSpy.mockClear();
    service.trackUploadCompleted(5, 5000000);

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event.detail.eventName).toBe('upload_completed');
    expect(event.detail.properties.imageCount).toBe(5);
    expect(event.detail.properties.totalBytes).toBe(5000000);
    expect(event.detail.properties.filenames).toBeUndefined(); // Guarantee zero filename leakage
  });

  it('dispatches compression_completed with aggregate metrics', () => {
    dispatchEventSpy.mockClear();
    service.trackCompressionCompleted({
      count: 3,
      savedBytes: 150000,
      savedPercentage: 65,
      durationMs: 340,
      preset: 'balanced'
    });

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const event = dispatchEventSpy.mock.calls[0][0];
    expect(event.detail.eventName).toBe('compression_completed');
    expect(event.detail.properties.savedPercentage).toBe(65);
    expect(event.detail.properties.preset).toBe('balanced');
  });

  it('records format and preset selection', () => {
    dispatchEventSpy.mockClear();
    service.trackFormatSelected('webp');
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy.mock.calls[0][0].detail.eventName).toBe('format_selected');
    expect(dispatchEventSpy.mock.calls[0][0].detail.properties.format).toBe('webp');

    dispatchEventSpy.mockClear();
    service.trackPresetSelected('smallest');
    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy.mock.calls[0][0].detail.eventName).toBe('preset_selected');
    expect(dispatchEventSpy.mock.calls[0][0].detail.properties.preset).toBe('smallest');
  });

  it('aggregates operational metrics for processing success and failure', () => {
    service.trackProcessingSuccess(120, 100000, 40000, 'webp');
    service.trackProcessingSuccess(80, 50000, 25000, 'webp');
    service.trackCompressionFailed('ENCODING_ERROR');

    const metrics = service.getOperationalMetrics();
    expect(metrics.successfulCount).toBe(2);
    expect(metrics.failedCount).toBe(1);
    expect(metrics.totalSavedBytes).toBe(85000); // 60000 + 25000
    expect(metrics.totalDurationMs).toBe(200);
    expect(metrics.averageDurationMs).toBe(100);
    expect(metrics.formatUsage['webp']).toBe(2);
  });

  it('creates structured diagnostic error reports with actionable advice', () => {
    const report = service.recordDiagnosticError('OUT_OF_MEMORY', 'Canvas allocation failed', { width: 10000 });
    expect(report.code).toBe('OUT_OF_MEMORY');
    expect(report.category).toBe('memory');
    expect(report.recoverable).toBe(true);
    expect(report.actionableAdvice).toContain('memory limit');

    const recent = service.getRecentDiagnostics();
    expect(recent.length).toBeGreaterThanOrEqual(1);
    expect(recent[0].code).toBe('OUT_OF_MEMORY');
  });

  it('tracks worker and zip failures with operational increments', () => {
    service.trackWorkerFailure('decoder-worker', 'Out of memory in worker thread');
    service.trackZipFailure('Disk full or memory exhaustion');

    const metrics = service.getOperationalMetrics();
    expect(metrics.workerFailures).toBe(1);
    expect(metrics.zipFailures).toBe(1);
  });
});
