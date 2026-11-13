// apps/tool-device-studio/src/services/diagnostic-history.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  DiagnosticComparisonMetric,
  DiagnosticComparisonResult,
  DiagnosticHistoryRecord,
  DiagnosticModuleType,
  DiagnosticResultStatus
} from '../models/device.models';

const STORAGE_KEY = 'acklet_device_studio_history';
const PREFERENCES_KEY = 'acklet_device_studio_history_prefs';
const MAX_RECORDS = 50;

@Injectable({
  providedIn: 'root'
})
export class DiagnosticHistoryService {
  private readonly _records = signal<DiagnosticHistoryRecord[]>([]);
  private readonly _isHistoryEnabled = signal<boolean>(true);

  public readonly selectedModuleFilter = signal<DiagnosticModuleType | 'all'>('all');
  public readonly selectedStatusFilter = signal<DiagnosticResultStatus | 'all'>('all');
  public readonly searchQuery = signal<string>('');
  public readonly sortOrder = signal<'newest' | 'oldest' | 'status'>('newest');

  public readonly records = this._records.asReadonly();
  public readonly isHistoryEnabled = this._isHistoryEnabled.asReadonly();

  public readonly filteredRecords = computed(() => {
    let list = [...this._records()];
    const mod = this.selectedModuleFilter();
    const st = this.selectedStatusFilter();
    const q = this.searchQuery().trim().toLowerCase();
    const sort = this.sortOrder();

    // Module filter
    if (mod !== 'all') {
      list = list.filter(r => r.moduleType === mod);
    }

    // Status filter
    if (st !== 'all') {
      list = list.filter(r => r.status === st);
    }

    // Search query
    if (q) {
      list = list.filter(r => 
        r.testTitle.toLowerCase().includes(q) ||
        r.primaryMetric.toLowerCase().includes(q) ||
        (r.secondaryMetric && r.secondaryMetric.toLowerCase().includes(q)) ||
        r.timestampFormatted.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sort === 'oldest') {
        return new Date(a.testedAt).getTime() - new Date(b.testedAt).getTime();
      }
      if (sort === 'status') {
        const order: Record<DiagnosticResultStatus, number> = { fail: 0, warn: 1, pass: 2, info: 3 };
        return order[a.status] - order[b.status];
      }
      // newest default
      return new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime();
    });

    return list;
  });

  public readonly stats = computed(() => {
    const list = this._records();
    const passCount = list.filter(r => r.status === 'pass').length;
    const warnCount = list.filter(r => r.status === 'warn').length;
    const failCount = list.filter(r => r.status === 'fail').length;
    const uniqueModules = new Set(list.map(r => r.moduleType)).size;

    return {
      totalCount: list.length,
      passCount,
      warnCount,
      failCount,
      uniqueModules,
      latestRecord: list.length > 0 ? list[0] : null
    };
  });

  constructor() {
    this.loadPreferences();
    this.loadHistory();
    this.seedInitialHistoryIfEmpty();
  }

  private loadPreferences(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(PREFERENCES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.enabled === 'boolean') {
            this._isHistoryEnabled.set(parsed.enabled);
          }
        }
      }
    } catch {}
  }

  public setHistoryEnabled(enabled: boolean): void {
    this._isHistoryEnabled.set(enabled);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ enabled }));
      }
    } catch {}
  }

  public loadHistory(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this._records.set(parsed);
          }
        }
      }
    } catch {}
  }

  public saveRecord(
    data: Omit<DiagnosticHistoryRecord, 'id' | 'testedAt' | 'timestampFormatted'>
  ): DiagnosticHistoryRecord | null {
    if (!this._isHistoryEnabled()) {
      return null;
    }

    const now = new Date();
    const id = `diag_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: DiagnosticHistoryRecord = {
      ...data,
      id,
      testedAt: now.toISOString(),
      timestampFormatted: now.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const updated = [record, ...this._records()].slice(0, MAX_RECORDS);
    this._records.set(updated);
    this.persistHistory(updated);
    return record;
  }

  public deleteRecord(id: string): void {
    const updated = this._records().filter(r => r.id !== id);
    this._records.set(updated);
    this.persistHistory(updated);
  }

  public clearHistory(): void {
    this._records.set([]);
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  private persistHistory(records: DiagnosticHistoryRecord[]): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch {}
  }

  public compareRecords(baseId: string, targetId: string): DiagnosticComparisonResult | null {
    const base = this._records().find(r => r.id === baseId);
    const target = this._records().find(r => r.id === targetId);

    if (!base || !target) return null;

    if (base.moduleType !== target.moduleType) {
      return {
        moduleType: base.moduleType,
        baseRecord: base,
        targetRecord: target,
        metrics: [],
        overallVerdict: 'consistent',
        summaryText: `Cannot compare incompatible diagnostic modules (${base.moduleType.toUpperCase()} vs ${target.moduleType.toUpperCase()}). Please select two tests of the same module type.`
      };
    }

    const metrics: DiagnosticComparisonMetric[] = [];
    let improvedCount = 0;
    let regressedCount = 0;

    switch (base.moduleType) {
      case 'speed': {
        const bDown = Number(base.details['downloadMbps'] ?? 0);
        const tDown = Number(target.details['downloadMbps'] ?? 0);
        if (bDown && tDown) {
          const delta = Number((tDown - bDown).toFixed(1));
          const pct = Math.round((delta / bDown) * 100);
          const dir = delta > 0 ? 'improved' : (delta < 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Download Speed',
            baseValue: `${bDown} Mbps`,
            targetValue: `${tDown} Mbps`,
            delta,
            deltaPercent: pct,
            direction: dir,
            unit: 'Mbps'
          });
        }

        const bUp = Number(base.details['uploadMbps'] ?? 0);
        const tUp = Number(target.details['uploadMbps'] ?? 0);
        if (bUp && tUp) {
          const delta = Number((tUp - bUp).toFixed(1));
          const pct = Math.round((delta / bUp) * 100);
          const dir = delta > 0 ? 'improved' : (delta < 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Upload Speed',
            baseValue: `${bUp} Mbps`,
            targetValue: `${tUp} Mbps`,
            delta,
            deltaPercent: pct,
            direction: dir,
            unit: 'Mbps'
          });
        }

        const bPing = Number(base.details['pingMs'] ?? 0);
        const tPing = Number(target.details['pingMs'] ?? 0);
        if (bPing && tPing) {
          const delta = tPing - bPing;
          const pct = Math.round((delta / bPing) * 100);
          // For ping: lower is better!
          const dir = delta < 0 ? 'improved' : (delta > 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Latency (Ping)',
            baseValue: `${bPing} ms`,
            targetValue: `${tPing} ms`,
            delta,
            deltaPercent: Math.abs(pct),
            direction: dir,
            unit: 'ms'
          });
        }

        const bJitter = Number(base.details['jitterMs'] ?? 0);
        const tJitter = Number(target.details['jitterMs'] ?? 0);
        if (bJitter !== undefined && tJitter !== undefined) {
          const delta = tJitter - bJitter;
          const dir = delta < 0 ? 'improved' : (delta > 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Connection Jitter',
            baseValue: `${bJitter} ms`,
            targetValue: `${tJitter} ms`,
            delta,
            direction: dir,
            unit: 'ms'
          });
        }
        break;
      }

      case 'webcam': {
        const bW = Number(base.details['width'] ?? 0);
        const bH = Number(base.details['height'] ?? 0);
        const tW = Number(target.details['width'] ?? 0);
        const tH = Number(target.details['height'] ?? 0);
        const bPixels = bW * bH;
        const tPixels = tW * tH;

        if (bPixels && tPixels) {
          const deltaPixels = tPixels - bPixels;
          const pct = Math.round((deltaPixels / bPixels) * 100);
          const dir = deltaPixels > 0 ? 'improved' : (deltaPixels < 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Resolution',
            baseValue: `${bW} × ${bH}`,
            targetValue: `${tW} × ${tH}`,
            deltaPercent: pct,
            direction: dir
          });
        }

        const bFps = Number(base.details['frameRate'] ?? 0);
        const tFps = Number(target.details['frameRate'] ?? 0);
        if (bFps && tFps) {
          const deltaFps = tFps - bFps;
          const dir = deltaFps > 0 ? 'improved' : (deltaFps < 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Capture Frame Rate',
            baseValue: `${bFps} FPS`,
            targetValue: `${tFps} FPS`,
            delta: deltaFps,
            direction: dir,
            unit: 'FPS'
          });
        }
        break;
      }

      case 'microphone': {
        const bPeak = Number(base.details['peakDb'] ?? -60);
        const tPeak = Number(target.details['peakDb'] ?? -60);
        const delta = Number((tPeak - bPeak).toFixed(1));
        metrics.push({
          label: 'Peak Input Level',
          baseValue: `${bPeak} dBFS`,
          targetValue: `${tPeak} dBFS`,
          delta,
          direction: 'neutral',
          unit: 'dBFS'
        });

        const bScore = Number(base.details['qualityScore'] ?? 0);
        const tScore = Number(target.details['qualityScore'] ?? 0);
        if (bScore || tScore) {
          const sDelta = tScore - bScore;
          const dir = sDelta > 0 ? 'improved' : (sDelta < 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Audio Quality Score',
            baseValue: `${bScore} / 100`,
            targetValue: `${tScore} / 100`,
            delta: sDelta,
            direction: dir
          });
        }
        break;
      }

      case 'speaker': {
        const bScore = Number(base.details['stereoSeparationScore'] ?? 0);
        const tScore = Number(target.details['stereoSeparationScore'] ?? 0);
        const delta = tScore - bScore;
        const dir = delta > 0 ? 'improved' : (delta < 0 ? 'regressed' : 'neutral');
        if (dir === 'improved') improvedCount++;
        if (dir === 'regressed') regressedCount++;
        metrics.push({
          label: 'Stereo Separation Score',
          baseValue: `${bScore}%`,
          targetValue: `${tScore}%`,
          delta,
          direction: dir,
          unit: '%'
        });
        break;
      }

      case 'screen': {
        const bFps = Number(base.details['measuredFps'] ?? base.details['frameRate'] ?? 0);
        const tFps = Number(target.details['measuredFps'] ?? target.details['frameRate'] ?? 0);
        if (bFps && tFps) {
          const delta = tFps - bFps;
          const dir = delta > 0 ? 'improved' : (delta < 0 ? 'regressed' : 'neutral');
          if (dir === 'improved') improvedCount++;
          if (dir === 'regressed') regressedCount++;
          metrics.push({
            label: 'Transmission FPS',
            baseValue: `${bFps} FPS`,
            targetValue: `${tFps} FPS`,
            delta,
            direction: dir,
            unit: 'FPS'
          });
        }
        break;
      }

      case 'readiness':
      case 'health': {
        const bScore = Number(base.details['overallScore'] ?? 0);
        const tScore = Number(target.details['overallScore'] ?? 0);
        const delta = tScore - bScore;
        const dir = delta > 0 ? 'improved' : (delta < 0 ? 'regressed' : 'neutral');
        if (dir === 'improved') improvedCount++;
        if (dir === 'regressed') regressedCount++;
        metrics.push({
          label: 'Overall Score',
          baseValue: `${bScore} / 100`,
          targetValue: `${tScore} / 100`,
          delta,
          direction: dir
        });
        break;
      }

      default: {
        metrics.push({
          label: 'Status',
          baseValue: base.status.toUpperCase(),
          targetValue: target.status.toUpperCase(),
          direction: 'neutral'
        });
      }
    }

    let overallVerdict: DiagnosticComparisonResult['overallVerdict'] = 'consistent';
    if (improvedCount > regressedCount) {
      overallVerdict = 'improved';
    } else if (regressedCount > improvedCount) {
      overallVerdict = 'regressed';
    }

    let summaryText = '';
    if (overallVerdict === 'improved') {
      summaryText = `Performance improved between ${base.timestampFormatted} and ${target.timestampFormatted}. Key parameters showed positive gains.`;
    } else if (overallVerdict === 'regressed') {
      summaryText = `Performance regressed between ${base.timestampFormatted} and ${target.timestampFormatted}. Increased latency or lower throughput was detected.`;
    } else {
      summaryText = `Performance remained consistent and stable between both test runs.`;
    }

    return {
      moduleType: base.moduleType,
      baseRecord: base,
      targetRecord: target,
      metrics,
      overallVerdict,
      summaryText
    };
  }

  public seedInitialHistoryIfEmpty(): void {
    if (this._records().length > 0) return;

    const initialSeeds: DiagnosticHistoryRecord[] = [
      {
        id: 'seed_speed_1',
        sessionId: 'sess_init',
        moduleType: 'speed',
        testTitle: 'Internet Speed Test',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        timestampFormatted: 'Earlier today',
        primaryMetric: 'Down: 94.2 Mbps • Up: 38.6 Mbps',
        secondaryMetric: 'Ping: 18 ms • Jitter: 2 ms',
        details: {
          downloadMbps: 94.2,
          uploadMbps: 38.6,
          pingMs: 18,
          jitterMs: 2,
          qualityRating: 'ultra'
        }
      },
      {
        id: 'seed_speed_2',
        sessionId: 'sess_init',
        moduleType: 'speed',
        testTitle: 'Internet Speed Test (Baseline)',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 26).toISOString(),
        timestampFormatted: 'Yesterday',
        primaryMetric: 'Down: 68.5 Mbps • Up: 22.0 Mbps',
        secondaryMetric: 'Ping: 34 ms • Jitter: 6 ms',
        details: {
          downloadMbps: 68.5,
          uploadMbps: 22.0,
          pingMs: 34,
          jitterMs: 6,
          qualityRating: 'fast'
        }
      },
      {
        id: 'seed_ip_1',
        sessionId: 'sess_init',
        moduleType: 'ip',
        testTitle: 'Public IP & Network Privacy Audit',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        timestampFormatted: 'Earlier today',
        primaryMetric: 'IPv4 Active (Dual-Stack Verified)',
        secondaryMetric: 'WebRTC Leak Protected • Score: 90/100',
        details: {
          privacyScore: 90,
          dualStackStatus: 'dual-stack',
          isWebRtcLeakProtected: true
        }
      },
      {
        id: 'seed_cam_1',
        sessionId: 'sess_init',
        moduleType: 'webcam',
        testTitle: 'Webcam Diagnostic & Resolution',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        timestampFormatted: 'Earlier today',
        primaryMetric: '1080p Full HD (30 FPS)',
        secondaryMetric: 'Clarity: Sharp • Grade: A',
        details: {
          width: 1920,
          height: 1080,
          frameRate: 30,
          grade: 'A',
          clarity: 'sharp'
        }
      },
      {
        id: 'seed_mic_1',
        sessionId: 'sess_init',
        moduleType: 'microphone',
        testTitle: 'Microphone Acoustics & Clarity',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        timestampFormatted: 'Earlier today',
        primaryMetric: 'Peak: -14.2 dBFS • RMS: 42%',
        secondaryMetric: 'Zero Clipping • Noise Floor: Quiet',
        details: {
          peakDb: -14.2,
          volumeRms: 42,
          qualityScore: 92,
          grade: 'A'
        }
      },
      {
        id: 'seed_spk_1',
        sessionId: 'sess_init',
        moduleType: 'speaker',
        testTitle: 'Speaker & Headphone Stereo Test',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        timestampFormatted: 'Earlier today',
        primaryMetric: 'Stereo Separation: 100%',
        secondaryMetric: 'Both Channels Confirmed Balanced',
        details: {
          stereoSeparationScore: 100,
          verdict: 'verified'
        }
      },
      {
        id: 'seed_readiness_1',
        sessionId: 'sess_init',
        moduleType: 'readiness',
        testTitle: 'Meeting Readiness Audit',
        status: 'pass',
        testedAt: new Date(Date.now() - 3600000 * 7).toISOString(),
        timestampFormatted: 'Earlier today',
        primaryMetric: 'Readiness Score: 95/100',
        secondaryMetric: 'Zoom, Google Meet, Teams: Ready',
        details: {
          overallScore: 95
        }
      }
    ];

    this._records.set(initialSeeds);
    this.persistHistory(initialSeeds);
  }
}

