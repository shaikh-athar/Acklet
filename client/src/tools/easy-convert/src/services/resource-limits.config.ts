export interface EasyConvertResourceLimits {
  maxInputSizeBytes: number;    // Default: 100 MB
  maxOutputSizeBytes: number;   // Default: 150 MB
  maxPageCount: number;         // Default: 500 pages
  maxProcessingDurationMs: number; // Default: 30,000 ms (30 seconds)
  maxConcurrentJobs: number;     // Default: 2 parallel workers
}

export const DEFAULT_RESOURCE_LIMITS: EasyConvertResourceLimits = {
  maxInputSizeBytes: 100 * 1024 * 1024,   // 100 MB
  maxOutputSizeBytes: 150 * 1024 * 1024,  // 150 MB
  maxPageCount: 500,
  maxProcessingDurationMs: 30000,          // 30 seconds
  maxConcurrentJobs: 2
};
