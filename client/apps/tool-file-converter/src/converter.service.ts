// apps/tool-file-converter/src/converter.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, throwError } from 'rxjs';
import { switchMap, takeWhile, retry, catchError } from 'rxjs/operators';
import { ConversionResult, SupportedFormatItem } from './converter.models';

@Injectable({
  providedIn: 'root'
})
export class ConverterApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/converter';

  /**
   * Uploads and initiates document conversion.
   */
  convert(file: File, targetFormat: string, forceAsync?: boolean): Observable<ConversionResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);
    if (forceAsync !== undefined) {
      formData.append('async', String(forceAsync));
    }

    return this.http.post<ConversionResult>(`${this.baseUrl}/convert`, formData);
  }

  /**
   * Fetches status of an ongoing conversion job.
   */
  getStatus(jobId: string): Observable<ConversionResult> {
    return this.http.get<ConversionResult>(`${this.baseUrl}/status/${encodeURIComponent(jobId)}`);
  }

  /**
   * Returns direct download URL for a completed conversion job.
   */
  getDownloadUrl(jobId: string): string {
    return `${this.baseUrl}/download/${encodeURIComponent(jobId)}`;
  }

  /**
   * Fetches supported input and target formats from backend engine.
   */
  getFormats(): Observable<{ formats: SupportedFormatItem[]; engineAvailable: boolean }> {
    return this.http.get<{ formats: SupportedFormatItem[]; engineAvailable: boolean }>(`${this.baseUrl}/formats`);
  }

  /**
   * Periodically polls conversion job status until completed, failed, or timed out.
   */
  pollJob(jobId: string, pollIntervalMs = 1200, maxAttempts = 60): Observable<ConversionResult> {
    let attempts = 0;
    return timer(0, pollIntervalMs).pipe(
      switchMap(() => this.getStatus(jobId)),
      takeWhile(result => {
        attempts++;
        if (attempts >= maxAttempts && (result.status === 'PENDING' || result.status === 'PROCESSING')) {
          throw new Error('Conversion polling exceeded maximum attempts timeout.');
        }
        return result.status === 'PENDING' || result.status === 'PROCESSING';
      }, true), // inclusive: emit the final completed or failed result
      catchError(err => throwError(() => err))
    );
  }

  /**
   * Formats file size in human-readable bytes string.
   */
  formatBytes(bytes?: number, decimals = 1): string {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

