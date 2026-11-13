// apps/tool-image-compressor/src/services/compressor-telemetry.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface TelemetryEvent {
  eventName: string;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
}

export type DiagnosticErrorCode =
  | 'CODEC_INIT_FAILED'
  | 'DECODING_ERROR'
  | 'ENCODING_ERROR'
  | 'WORKER_FAILURE'
  | 'OUT_OF_MEMORY'
  | 'UNSUPPORTED_FORMAT'
  | 'OPTIMIZATION_TARGET_FAILED'
  | 'DOWNLOAD_EMPTY_BLOB'
  | 'ZIP_GENERATION_FAILED'
  | 'METADATA_PARSE_FAILED';

export type DiagnosticCategory =
  | 'codec'
  | 'decoder'
  | 'encoder'
  | 'worker'
  | 'memory'
  | 'format'
  | 'optimization'
  | 'download'
  | 'metadata';

export interface DiagnosticErrorReport {
  id: string;
  code: DiagnosticErrorCode;
  category: DiagnosticCategory;
  message: string;
  actionableAdvice: string;
  recoverable: boolean;
  timestamp: number;
  context?: Record<string, string | number | boolean>;
}

export interface OperationalMetricsSummary {
  successfulCount: number;
  failedCount: number;
  totalSavedBytes: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalDurationMs: number;
  averageDurationMs: number;
  workerFailures: number;
  zipFailures: number;
  compatibilityIssues: number;
  formatUsage: Record<string, number>;
}

const STATS_STORAGE_KEY = 'acklet:compressor:session-stats';

const DIAGNOSTIC_ADVICE: Record<
  DiagnosticErrorCode,
  { advice: string; category: DiagnosticCategory; recoverable: boolean }
> = {
  CODEC_INIT_FAILED: {
    advice: 'Browser canvas encoder initialization failed. Verify browser hardware acceleration settings.',
    category: 'codec',
    recoverable: false
  },
  DECODING_ERROR: {
    advice: 'Image data could not be parsed by browser decoder. The file may be truncated or corrupted.',
    category: 'decoder',
    recoverable: false
  },
  ENCODING_ERROR: {
    advice: 'Encoder encountered an issue while generating output. Retrying with WebP or JPEG format is recommended.',
    category: 'encoder',
    recoverable: true
  },
  WORKER_FAILURE: {
    advice: 'Background processing thread encountered an error. Failed over to main browser thread.',
    category: 'worker',
    recoverable: true
  },
  OUT_OF_MEMORY: {
    advice: 'Image dimensions or batch size exceeded browser memory limit. Resize the image or compress in smaller batches.',
    category: 'memory',
    recoverable: true
  },
  UNSUPPORTED_FORMAT: {
    advice: 'The file format is not supported by your browser. Use Acklet Image Converter to convert first.',
    category: 'format',
    recoverable: false
  },
  OPTIMIZATION_TARGET_FAILED: {
    advice: 'Target file size could not be reached within acceptable quality bounds. Try a larger target or lower resolution.',
    category: 'optimization',
    recoverable: true
  },
  DOWNLOAD_EMPTY_BLOB: {
    advice: 'Generated download blob was empty. Please re-compress the asset before downloading.',
    category: 'download',
    recoverable: true
  },
  ZIP_GENERATION_FAILED: {
    advice: 'Failed to package compressed assets into ZIP archive. Download files individually or retry.',
    category: 'download',
    recoverable: true
  },
  METADATA_PARSE_FAILED: {
    advice: 'EXIF segment was corrupted or in an unrecognized format. Metadata stripping applied as fallback.',
    category: 'metadata',
    recoverable: true
  }
};

@Injectable({
  providedIn: 'root'
})
export class CompressorTelemetryService {
  readonly isEnabled = signal<boolean>(true);
  private readonly _recentDiagnostics = signal<DiagnosticErrorReport[]>([]);
  private readonly _metrics = signal<OperationalMetricsSummary>({
    successfulCount: 0,
    failedCount: 0,
    totalSavedBytes: 0,
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    workerFailures: 0,
    zipFailures: 0,
    compatibilityIssues: 0,
    formatUsage: {}
  });

  readonly recentDiagnostics = computed(() => this._recentDiagnostics());
  readonly metrics = computed(() => this._metrics());

  constructor() {
    this.trackToolOpened();
  }

  /**
   * Tracks initial tool open event.
   */
  trackToolOpened(): void {
    this.recordEvent('tool_opened', {
      timestamp: Date.now()
    });
  }

  /**
   * Tracks batch upload completion without logging filenames or image contents.
   */
  trackUploadCompleted(imageCount: number, totalBytes: number): void {
    this.recordEvent('upload_completed', {
      imageCount,
      totalBytes,
      roundedMb: Math.round((totalBytes / (1024 * 1024)) * 10) / 10
    });
  }

  /**
   * Tracks compression completion aggregates and updates operational metrics.
   */
  trackCompressionCompleted(params: {
    count: number;
    savedBytes: number;
    savedPercentage: number;
    durationMs: number;
    preset?: string;
  }): void {
    this.recordEvent('compression_completed', {
      count: params.count,
      savedBytes: params.savedBytes,
      savedPercentage: Math.round(params.savedPercentage),
      durationMs: Math.round(params.durationMs),
      preset: params.preset || 'balanced'
    });

    this._metrics.update(m => {
      const nextSuccess = m.successfulCount + params.count;
      const nextDuration = m.totalDurationMs + params.durationMs;
      return {
        ...m,
        successfulCount: nextSuccess,
        totalSavedBytes: m.totalSavedBytes + params.savedBytes,
        totalDurationMs: nextDuration,
        averageDurationMs: nextSuccess > 0 ? Math.round(nextDuration / nextSuccess) : 0
      };
    });
  }

  /**
   * Tracks individual successful item compression.
   */
  trackProcessingSuccess(
    durationMs: number,
    originalBytes: number,
    compressedBytes: number,
    format: string
  ): void {
    const saved = Math.max(0, originalBytes - compressedBytes);
    this.trackCompressionCompleted({
      count: 1,
      savedBytes: saved,
      savedPercentage: originalBytes > 0 ? ((saved / originalBytes) * 100) : 0,
      durationMs
    });

    this._metrics.update(m => {
      const usage = { ...m.formatUsage };
      usage[format] = (usage[format] || 0) + 1;
      return {
        ...m,
        totalOriginalBytes: m.totalOriginalBytes + originalBytes,
        totalCompressedBytes: m.totalCompressedBytes + compressedBytes,
        formatUsage: usage
      };
    });
  }

  /**
   * Tracks isolated compression failure.
   */
  trackCompressionFailed(errorCode: string): void {
    this.recordEvent('compression_failed', {
      errorCode
    });

    this._metrics.update(m => ({
      ...m,
      failedCount: m.failedCount + 1
    }));
  }

  /**
   * Records a structured diagnostic error with actionable advice and categorization.
   */
  recordDiagnosticError(
    code: DiagnosticErrorCode,
    message: string,
    context?: Record<string, string | number | boolean>
  ): DiagnosticErrorReport {
    const meta = DIAGNOSTIC_ADVICE[code] || {
      advice: 'An unexpected processing issue occurred. Please retry the operation.',
      category: 'system' as DiagnosticCategory,
      recoverable: true
    };

    const report: DiagnosticErrorReport = {
      id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      category: meta.category,
      message,
      actionableAdvice: meta.advice,
      recoverable: meta.recoverable,
      timestamp: Date.now(),
      context
    };

    this._recentDiagnostics.update(list => [report, ...list].slice(0, 50));
    this.trackCompressionFailed(code);
    return report;
  }

  /**
   * Tracks background worker failure.
   */
  trackWorkerFailure(workerType: string, errorMsg: string): void {
    this.recordEvent('worker_failure', {
      workerType,
      errorMsg: errorMsg.slice(0, 100)
    });

    this._metrics.update(m => ({
      ...m,
      workerFailures: m.workerFailures + 1
    }));

    this.recordDiagnosticError('WORKER_FAILURE', `Worker failure in ${workerType}: ${errorMsg}`);
  }

  /**
   * Tracks ZIP archive packaging failure.
   */
  trackZipFailure(reason: string): void {
    this.recordEvent('zip_failure', {
      reason: reason.slice(0, 100)
    });

    this._metrics.update(m => ({
      ...m,
      zipFailures: m.zipFailures + 1
    }));

    this.recordDiagnosticError('ZIP_GENERATION_FAILED', reason);
  }

  /**
   * Tracks browser compatibility issue.
   */
  trackBrowserCompatibilityIssue(feature: string, details?: string): void {
    this.recordEvent('compatibility_issue', {
      feature,
      details: details ? details.slice(0, 100) : 'Feature unsupported'
    });

    this._metrics.update(m => ({
      ...m,
      compatibilityIssues: m.compatibilityIssues + 1
    }));

    this.recordDiagnosticError(
      'UNSUPPORTED_FORMAT',
      `Browser lacks capability for: ${feature}`,
      { feature }
    );
  }

  /**
   * Tracks download action (single file, zip archive, or responsive variant).
   */
  trackDownloadCompleted(type: 'single' | 'zip' | 'variant', format?: string): void {
    this.recordEvent('download_completed', {
      downloadType: type,
      format: format || 'unknown'
    });
  }

  /**
   * Tracks format selection.
   */
  trackFormatSelected(format: string): void {
    this.recordEvent('format_selected', {
      format
    });

    this._metrics.update(m => {
      const usage = { ...m.formatUsage };
      usage[format] = (usage[format] || 0) + 1;
      return {
        ...m,
        formatUsage: usage
      };
    });
  }

  /**
   * Tracks preset selection.
   */
  trackPresetSelected(preset: string): void {
    this.recordEvent('preset_selected', {
      preset
    });
  }

  /**
   * Tracks user feedback submission without collecting comment text PII.
   */
  trackFeedbackSubmitted(rating: string, category: string, commentLength: number): void {
    this.recordEvent('feedback_submitted', {
      rating,
      category,
      commentLength
    });
  }

  /**
   * Tracks non-destructive transform operation applied without file names or PII.
   */
  trackTransformApplied(transformType: 'crop' | 'rotate' | 'flip', aspectPreset?: string): void {
    const props: Record<string, string | number | boolean> = {
      transformType
    };
    if (aspectPreset) {
      props['aspectPreset'] = aspectPreset;
    }
    this.recordEvent('transform_applied', props);
  }

  getOperationalMetrics(): OperationalMetricsSummary {
    return this.metrics();
  }

  getRecentDiagnostics(): DiagnosticErrorReport[] {
    return this.recentDiagnostics();
  }

  clearDiagnostics(): void {
    this._recentDiagnostics.set([]);
  }

  /**
   * Dispatches a privacy-sanitized custom DOM event and records anonymous local counter.
   */
  private recordEvent(eventName: string, properties?: Record<string, string | number | boolean>): void {
    if (!this.isEnabled()) return;

    const eventData: TelemetryEvent = {
      eventName,
      timestamp: Date.now(),
      properties
    };

    if (typeof window !== 'undefined') {
      try {
        if (typeof window.dispatchEvent === 'function') {
          const EventCtor = (globalThis as any).CustomEvent || CustomEvent;
          window.dispatchEvent(
            new EventCtor('acklet:telemetry', {
              detail: eventData
            })
          );
        }

        if (typeof localStorage !== 'undefined' && localStorage) {
          const raw = localStorage.getItem(STATS_STORAGE_KEY);
          const stats: Record<string, number> = raw ? JSON.parse(raw) : {};
          stats[eventName] = (stats[eventName] || 0) + 1;
          localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
        }
      } catch {
        // Fallback gracefully without interrupting user
      }
    }
  }
}
