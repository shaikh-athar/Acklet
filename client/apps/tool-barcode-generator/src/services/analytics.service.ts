// apps/tool-barcode-generator/src/services/analytics.service.ts
import { Injectable, signal } from '@angular/core';

export interface IAnalyticsService {
  isConsentGiven: ReturnType<typeof signal<boolean>>;
  trackFormatSelected(formatId: string): void;
  trackExport(formatId: string, exportType: 'png' | 'svg' | 'pdf'): void;
  recordFormatSelection(formatId: string): void;
  recordExport(formatId: string, exportType: 'png' | 'svg' | 'pdf'): void;
  setConsent(consent: boolean): void;
}

const CONSENT_KEY = 'acklet:barcode:analytics-consent';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService implements IAnalyticsService {
  readonly isConsentGiven = signal<boolean>(false);

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(CONSENT_KEY);
        this.isConsentGiven.set(val === 'true');
      } catch {
        // Storage unavailable
      }
    }
  }

  setConsent(consent: boolean): void {
    this.isConsentGiven.set(consent);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(CONSENT_KEY, String(consent));
      } catch {
        // Storage unavailable
      }
    }
  }

  trackFormatSelected(formatId: string): void {
    if (!this.isConsentGiven()) return;
    // Anonymously count format usage: never record text or values
    try {
      const statsKey = 'acklet:barcode:format-stats';
      const raw = localStorage.getItem(statsKey);
      const stats: Record<string, number> = raw ? JSON.parse(raw) : {};
      stats[formatId] = (stats[formatId] || 0) + 1;
      localStorage.setItem(statsKey, JSON.stringify(stats));
    } catch {
      // Storage unavailable
    }
  }

  recordFormatSelection(formatId: string): void {
    this.trackFormatSelected(formatId);
  }

  recordExport(formatId: string, exportType: 'png' | 'svg' | 'pdf'): void {
    this.trackExport(formatId, exportType);
  }

  trackExport(formatId: string, exportType: 'png' | 'svg' | 'pdf'): void {
    if (!this.isConsentGiven()) return;
    // Anonymously count export types: never record text or values
    try {
      const statsKey = 'acklet:barcode:export-stats';
      const raw = localStorage.getItem(statsKey);
      const stats: Record<string, number> = raw ? JSON.parse(raw) : {};
      const key = `${formatId}:${exportType}`;
      stats[key] = (stats[key] || 0) + 1;
      localStorage.setItem(statsKey, JSON.stringify(stats));
    } catch {
      // Storage unavailable
    }
  }
}
