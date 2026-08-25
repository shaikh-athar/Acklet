export interface DiagnosticLogEvent {
  jobId: string;
  correlationId: string;
  operation: string;
  sourceFormat: string;
  targetFormat?: string;
  inputSize: number;
  outputSize?: number;
  durationMs?: number;
  engine: 'client' | 'server';
  status: string;
  failureCategory?: string;
}

export class ObservabilityService {
  /**
   * Generates a unique correlation ID for tracing conversion requests across client & server.
   */
  static generateCorrelationId(): string {
    return `corr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Logs structured diagnostic telemetry without logging sensitive file contents or private metadata.
   */
  static logEvent(event: DiagnosticLogEvent): void {
    const timestamp = new Date().toISOString();
    console.log(`[EasyConvert Telemetry] [${timestamp}] [CorrID: ${event.correlationId}] [JobID: ${event.jobId}] ${event.operation} | Engine: ${event.engine} | Status: ${event.status} | Duration: ${event.durationMs || 0}ms`);
  }
}
