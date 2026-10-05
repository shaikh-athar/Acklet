import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getAirVaultApiUrl } from './airvault-api.util';
import { catchError, of } from 'rxjs';

export interface AirVaultLimits {
  maxFileBytes: number;
  maxClipboardBytes: number;
  maxAccountBytes: number;
  maxClipboardsPerUser: number;
  trashRetentionDays: number;
  defaultClipboardRetentionDays: number;
  perGuestLinkDailyWriteBytes: number;
  perGuestLinkDailyItemCount: number;
}

export const DEFAULT_AIRVAULT_LIMITS: AirVaultLimits = {
  maxFileBytes: 1024 * 1024 * 1024, // 1 GB
  maxClipboardBytes: 5 * 1024 * 1024 * 1024, // 5 GB
  maxAccountBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  maxClipboardsPerUser: 5,
  trashRetentionDays: 7,
  defaultClipboardRetentionDays: 7,
  perGuestLinkDailyWriteBytes: 250 * 1024 * 1024,
  perGuestLinkDailyItemCount: 50
};

@Injectable({
  providedIn: 'root'
})
export class AirVaultLimitsService {
  private http = inject(HttpClient);

  readonly limits = signal<AirVaultLimits>(DEFAULT_AIRVAULT_LIMITS);
  readonly isLoaded = signal<boolean>(false);

  readonly maxFileFormatted = computed(() => this.formatBytes(this.limits().maxFileBytes));
  readonly maxClipboardFormatted = computed(() => this.formatBytes(this.limits().maxClipboardBytes));
  readonly maxAccountFormatted = computed(() => this.formatBytes(this.limits().maxAccountBytes));
  readonly trashDays = computed(() => this.limits().trashRetentionDays);

  constructor() {
    this.fetchLimits();
  }

  fetchLimits() {
    const url = getAirVaultApiUrl('/api/v1/airvault/config/limits');
    this.http.get<{ success: boolean; data: AirVaultLimits }>(url).pipe(
      catchError(() => of({ success: false, data: DEFAULT_AIRVAULT_LIMITS }))
    ).subscribe(res => {
      if (res && res.data) {
        this.limits.set(res.data);
        this.isLoaded.set(true);
      }
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${Math.round(bytes / (1024 * 1024))} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }
}
