import { AdvancedConversionOptions, ConversionRegistryService } from './conversion-registry.service';
import { DEFAULT_RESOURCE_LIMITS } from './resource-limits.config';
import { MemoryCleanupService } from './memory-cleanup.service';

export interface ConversionProgress {
  percent: number;
  stageMessage: string;
  bytesProcessed?: number;
  totalBytes?: number;
}

export interface ConversionResult {
  blob: Blob;
  fileName: string;
  mimeType: string;
  outputSize: number;
  previewUrl?: string;
  isValidated: boolean;
}

export type FileSizeClass = 'small' | 'medium' | 'large' | 'very_large';

// ─── Magic-byte signatures for output validation ──────────────────────────────
const MAGIC_BYTES: Record<string, number[]> = {
  jpg: [0xFF, 0xD8, 0xFF],
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46],  // RIFF (checked separately with WEBP at offset 8)
  zip: [0x50, 0x4B, 0x03, 0x04],
  pdf: [0x25, 0x50, 0x44, 0x46],   // %PDF
};

export class ClientConverterEngine {

  static getFileSizeClass(sizeInBytes: number): FileSizeClass {
    const mb = sizeInBytes / (1024 * 1024);
    if (mb < 5)   return 'small';
    if (mb < 50)  return 'medium';
    if (mb < 100) return 'large';
    return 'very_large';
  }

  static async convert(
    file: File,
    targetFormat: string,
    onProgress: (progress: ConversionProgress) => void,
    options?: AdvancedConversionOptions,
    signal?: AbortSignal
  ): Promise<ConversionResult> {

    if (file.size > DEFAULT_RESOURCE_LIMITS.maxInputSizeBytes) {
      throw new Error(
        `File exceeds maximum supported size of ${DEFAULT_RESOURCE_LIMITS.maxInputSizeBytes / (1024 * 1024)} MB.`
      );
    }

    const sourceExt = file.name.split('.').pop()?.toLowerCase() ?? '';
    const cap = ConversionRegistryService.getCapability(sourceExt, targetFormat);

    if (!cap) {
      throw new Error(`Conversion from .${sourceExt} to .${targetFormat} is not supported.`);
    }

    // Server-engine: delegate fully to backend
    if (cap.engine === 'server') {
      return this.convertOnServer(file, targetFormat, onProgress, signal);
    }

    // ── Client-engine path ─────────────────────────────────────────────────────
    const sizeClass = this.getFileSizeClass(file.size);
    onProgress({
      percent: 5,
      stageMessage: `Preparing ${this.formatBytes(file.size)} file (${sizeClass.toUpperCase()} tier)`
    });

    if (signal?.aborted) throw new Error('Conversion cancelled by user');

    // Shared AbortController so both timeout AND user cancel flow through one signal
    const timeoutController = new AbortController();
    const combinedSignal = signal
      ? this.combineSignals(signal, timeoutController.signal)
      : timeoutController.signal;

    const timeoutId = setTimeout(
      () => timeoutController.abort(new Error(
        `Conversion timed out after ${DEFAULT_RESOURCE_LIMITS.maxProcessingDurationMs / 1000} seconds.`
      )),
      DEFAULT_RESOURCE_LIMITS.maxProcessingDurationMs
    );

    try {
      const result = await this.runClientConversion(file, sourceExt, targetFormat, onProgress, options, combinedSignal);
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ─── Dispatch to the correct client engine ────────────────────────────────────
  private static async runClientConversion(
    file: File,
    sourceExt: string,
    targetFormat: string,
    onProgress: (p: ConversionProgress) => void,
    options?: AdvancedConversionOptions,
    signal?: AbortSignal
  ): Promise<ConversionResult> {
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const target = targetFormat.toLowerCase();

    // Image → Image (Canvas API)
    if (['jpg', 'jpeg', 'png', 'webp'].includes(sourceExt) && ['jpg', 'jpeg', 'png', 'webp'].includes(target)) {
      const rawResult = await this.convertImage(file, baseName, target, onProgress, options, signal);
      return this.finalise(rawResult, 'image');
    }

    // Text/Markup documents (pure string transformation)
    if (['txt', 'md', 'csv'].includes(sourceExt) && ['txt', 'md', 'html', 'json'].includes(target)) {
      const rawResult = await this.convertTextDocument(file, baseName, sourceExt, target, onProgress, signal);
      return this.finalise(rawResult, 'text');
    }

    // Any other pair that reached here with engine='client' is a misconfiguration
    throw new Error(
      `No client-side engine available for .${sourceExt} → .${target}. ` +
      `This conversion should have been routed to the server.`
    );
  }

  // ─── finalise: validate + create preview URL ──────────────────────────────────
  private static async finalise(
    raw: { blob: Blob; fileName: string; mimeType: string },
    category: 'image' | 'text'
  ): Promise<ConversionResult> {
    if (!raw.blob || raw.blob.size === 0) {
      throw new Error('Output validation failed: Conversion produced an empty (0 byte) file.');
    }
    if (raw.blob.size > DEFAULT_RESOURCE_LIMITS.maxOutputSizeBytes) {
      throw new Error('Output validation failed: Converted output exceeds maximum allowed size.');
    }

    // Magic-byte validation for binary formats
    const ext = raw.fileName.split('.').pop()?.toLowerCase() ?? '';
    await this.validateOutputMagicBytes(raw.blob, ext);

    const rawPreviewUrl = URL.createObjectURL(raw.blob);
    const previewUrl = MemoryCleanupService.registerUrl(rawPreviewUrl);

    return {
      ...raw,
      outputSize: raw.blob.size,
      previewUrl,
      isValidated: true
    };
  }

  // ─── Magic-byte output validation ─────────────────────────────────────────────
  private static async validateOutputMagicBytes(blob: Blob, ext: string): Promise<void> {
    const expected = MAGIC_BYTES[ext];
    if (!expected) return; // Text formats don't have fixed magic bytes

    const headerBuffer = await blob.slice(0, 12).arrayBuffer();
    const header = new Uint8Array(headerBuffer);

    const matches = expected.every((byte, i) => header[i] === byte);

    // WebP requires 'WEBP' at bytes 8-11 in addition to RIFF at 0-3
    if (ext === 'webp' && matches) {
      const webpId = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
      const webpMatches = webpId.every((byte, i) => header[8 + i] === byte);
      if (!webpMatches) {
        throw new Error('Output validation failed: File does not have a valid WebP signature.');
      }
    } else if (!matches) {
      throw new Error(
        `Output validation failed: Converted file does not have a valid ${ext.toUpperCase()} signature. ` +
        `The conversion may have produced a corrupt file.`
      );
    }
  }

  // ─── Server-side polling flow ─────────────────────────────────────────────────
  private static async convertOnServer(
    file: File,
    targetFormat: string,
    onProgress: (progress: ConversionProgress) => void,
    signal?: AbortSignal
  ): Promise<ConversionResult> {
    onProgress({ percent: 15, stageMessage: 'Uploading to conversion worker...' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    const response = await fetch('/api/v1/tools/easy-convert/jobs', {
      method: 'POST',
      body: formData,
      signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Server error (HTTP ${response.status}): ${body || 'No details'}`);
    }

    const job = await response.json();
    const jobId = job.jobId;

    // Poll for completion (max 60 attempts × 1 s = 60 s)
    let attempts = 0;
    while (attempts < 60) {
      if (signal?.aborted) {
        await fetch(`/api/v1/tools/easy-convert/jobs/${jobId}/cancel`, { method: 'POST' }).catch(() => {});
        throw new Error('Conversion cancelled by user');
      }

      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`/api/v1/tools/easy-convert/jobs/${jobId}/status`, { signal });
      if (!statusRes.ok) continue;

      const currentJob = await statusRes.json();
      onProgress({
        percent: Math.max(20, currentJob.progressPercent ?? 50),
        stageMessage: currentJob.stageMessage ?? 'Processing on server worker...'
      });

      if (currentJob.status === 'COMPLETED') break;
      if (currentJob.status === 'FAILED') {
        throw new Error(currentJob.errorMessage ?? 'Server conversion worker reported failure');
      }
      if (currentJob.status === 'CANCELLED') {
        throw new Error('Conversion was cancelled');
      }
    }

    if (attempts >= 60) {
      throw new Error('Conversion timed out waiting for server worker response.');
    }

    onProgress({ percent: 95, stageMessage: 'Fetching converted output...' });
    const downloadRes = await fetch(`/api/v1/tools/easy-convert/jobs/${jobId}/download`, { signal });
    if (!downloadRes.ok) throw new Error('Failed to download converted output from server');

    const blob = await downloadRes.blob();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const fileName = `${baseName}.${targetFormat.toLowerCase()}`;
    const rawPreviewUrl = URL.createObjectURL(blob);
    const previewUrl = MemoryCleanupService.registerUrl(rawPreviewUrl);

    onProgress({ percent: 100, stageMessage: 'Server conversion verified' });

    return {
      blob,
      fileName,
      mimeType: blob.type || 'application/octet-stream',
      outputSize: blob.size,
      previewUrl,
      isValidated: true
    };
  }

  // ─── Image conversion (Canvas API) ───────────────────────────────────────────
  private static convertImage(
    file: File,
    baseName: string,
    targetFormat: string,
    onProgress: (progress: ConversionProgress) => void,
    options?: AdvancedConversionOptions,
    signal?: AbortSignal
  ): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      onProgress({ percent: 25, stageMessage: 'Decoding image bitmap...' });

      if (signal?.aborted) { reject(new Error('Conversion cancelled by user')); return; }

      const img = new Image();
      const rawObjectUrl = URL.createObjectURL(file);

      const cleanup = () => URL.revokeObjectURL(rawObjectUrl);
      const abortHandler = () => { cleanup(); reject(new Error('Conversion cancelled by user')); };
      if (signal) signal.addEventListener('abort', abortHandler, { once: true });

      img.onload = () => {
        if (signal?.aborted) { cleanup(); return; }
        onProgress({ percent: 55, stageMessage: `Rendering canvas (${img.width}×${img.height})...` });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) { cleanup(); reject(new Error('Failed to acquire 2D rendering context')); return; }

        // White background for JPEG (no alpha channel)
        if (['jpg', 'jpeg'].includes(targetFormat)) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);
        onProgress({ percent: 80, stageMessage: 'Encoding output Blob...' });

        const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        const mimeType = mimeMap[targetFormat] ?? 'image/jpeg';
        const quality = options?.quality ?? 0.92;

        canvas.toBlob(blob => {
          cleanup();
          if (signal?.aborted) return;
          if (blob) {
            resolve({ blob, fileName: `${baseName}.${targetFormat}`, mimeType });
          } else {
            reject(new Error('Canvas toBlob() returned null — conversion failed'));
          }
        }, mimeType, quality);
      };

      img.onerror = () => { cleanup(); reject(new Error('Failed to decode image file')); };
      img.src = rawObjectUrl;
    });
  }

  // ─── Text / Markup document conversions ───────────────────────────────────────
  private static async convertTextDocument(
    file: File,
    baseName: string,
    sourceExt: string,
    targetFormat: string,
    onProgress: (progress: ConversionProgress) => void,
    signal?: AbortSignal
  ): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
    onProgress({ percent: 35, stageMessage: 'Reading text payload...' });
    if (signal?.aborted) throw new Error('Conversion cancelled by user');

    const textContent = await file.text();
    onProgress({ percent: 75, stageMessage: 'Transforming text stream...' });
    if (signal?.aborted) throw new Error('Conversion cancelled by user');

    let mimeType = 'text/plain';
    let ext = 'txt';
    let output = textContent;

    if (targetFormat === 'html') {
      mimeType = 'text/html';
      ext = 'html';
      const escaped = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      output = `<!DOCTYPE html>\n<html lang="en">\n<head><meta charset="UTF-8"><title>${baseName}</title></head>\n<body><pre>${escaped}</pre>\n</body>\n</html>`;
    } else if (targetFormat === 'md' && sourceExt === 'txt') {
      mimeType = 'text/markdown';
      ext = 'md';
      output = `# ${baseName}\n\n\`\`\`\n${textContent}\n\`\`\``;
    } else if (targetFormat === 'txt' && sourceExt === 'md') {
      // Strip markdown syntax for plain text
      mimeType = 'text/plain';
      ext = 'txt';
      output = textContent
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/^[-*+]\s+/gm, '• ')
        .replace(/^\d+\.\s+/gm, '');
    } else if (targetFormat === 'json' && sourceExt === 'csv') {
      // CSV → JSON (simple first-row-as-headers approach)
      const result = this.csvToJson(textContent);
      mimeType = 'application/json';
      ext = 'json';
      output = JSON.stringify(result, null, 2);
    }

    const blob = new Blob([output], { type: mimeType });
    return { blob, fileName: `${baseName}.${ext}`, mimeType };
  }

  /** Minimal CSV → JSON: first row = headers */
  private static csvToJson(csv: string): Record<string, string>[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
  }

  /** Combine two AbortSignals so either one aborts the combined signal */
  private static combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (a.aborted || b.aborted) { controller.abort(); }
    else {
      a.addEventListener('abort', abort, { once: true });
      b.addEventListener('abort', abort, { once: true });
    }
    return controller.signal;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
