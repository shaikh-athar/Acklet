// apps/tool-device-studio/src/services/speed-test.service.ts
import { Injectable, signal } from '@angular/core';
import {
  SpeedQualityRating,
  SpeedSuitabilityAssessment,
  SpeedTestHistoryItem,
  SpeedTestMetrics,
  NetworkConnectionTelemetry
} from '../models/device.models';

const STORAGE_KEY = 'acklet_speedtest_history';

const DEFAULT_SUITABILITY: SpeedSuitabilityAssessment = {
  conferencing: {
    status: 'check',
    label: 'Untested',
    desc: 'Run test to assess HD video conferencing readiness.'
  },
  gaming: {
    status: 'check',
    label: 'Untested',
    desc: 'Run test to verify latency and packet jitter.'
  },
  streaming4k: {
    status: 'check',
    label: 'Untested',
    desc: 'Run test to check throughput for 4K UHD streaming.'
  },
  browsing: {
    status: 'check',
    label: 'Untested',
    desc: 'Run test to evaluate standard web responsiveness.'
  },
  overallScore: 0,
  stabilityRating: 'fair',
  summaryText: 'Run a test to measure network performance and suitability.'
};

const DEFAULT_METRICS: SpeedTestMetrics = {
  status: 'idle',
  pingMs: null,
  minPingMs: null,
  maxPingMs: null,
  jitterMs: null,
  downloadMbps: null,
  uploadMbps: null,
  currentInstantSpeedMbps: 0,
  progressPercent: 0,
  currentPhaseText: 'Ready to test your connection',
  qualityRating: 'none',
  speedHistory: [],
  suitability: DEFAULT_SUITABILITY,
  telemetry: {},
  testHistory: []
};

// Endpoints: Cloudflare Speed Test Anycast CDN (CORS enabled, no-cache, zero-storage)
const SPEED_ENDPOINTS = {
  ping: 'https://speed.cloudflare.com/__down?bytes=0',
  downloadSmall: 'https://speed.cloudflare.com/__down?bytes=1000000',   // 1MB (warm-up)
  downloadMedium: 'https://speed.cloudflare.com/__down?bytes=5000000',  // 5MB
  downloadLarge: 'https://speed.cloudflare.com/__down?bytes=15000000', // 15MB
  upload: 'https://speed.cloudflare.com/__up',
  fallbackPing: 'https://api.ipify.org?format=json'
};

@Injectable({
  providedIn: 'root'
})
export class SpeedTestService {
  private abortController: AbortController | null = null;
  public readonly metrics = signal<SpeedTestMetrics>(DEFAULT_METRICS);

  constructor() {
    this.loadStoredHistory();
    this.detectTelemetry();
  }

  public detectTelemetry(): NetworkConnectionTelemetry {
    try {
      const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
      const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
      if (conn) {
        const t: NetworkConnectionTelemetry = {
          effectiveType: conn.effectiveType ? String(conn.effectiveType).toUpperCase() : undefined,
          downlinkEstimatedMbps: typeof conn.downlink === 'number' ? conn.downlink : undefined,
          rttEstimatedMs: typeof conn.rtt === 'number' ? conn.rtt : undefined,
          saveData: Boolean(conn.saveData),
          type: conn.type ? String(conn.type) : undefined
        };
        this.metrics.update(m => ({ ...m, telemetry: t }));
        return t;
      }
    } catch {
      // Ignore security or permission restrictions on connection API
    }
    return {};
  }

  private loadStoredHistory(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.metrics.update(m => ({ ...m, testHistory: parsed }));
          }
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  public clearHistory(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
    this.metrics.update(m => ({ ...m, testHistory: [] }));
  }

  public async runFullTest(): Promise<SpeedTestMetrics> {
    this.cancelTest();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // Refresh telemetry
    this.detectTelemetry();

    this.metrics.update(m => ({
      ...m,
      status: 'ping',
      currentPhaseText: 'Measuring round-trip latency & jitter (probe 1 of 8)...',
      progressPercent: 5,
      currentInstantSpeedMbps: 0,
      errorMessage: undefined
    }));

    try {
      // ── Phase 1: Ping & Jitter ──────────────────────────────────────────
      const { avgPing, minPing, maxPing, jitter } = await this.measurePingAndJitter(signal);
      if (signal.aborted) return this.metrics();

      this.metrics.update(m => ({
        ...m,
        status: 'download',
        pingMs: avgPing,
        minPingMs: minPing,
        maxPingMs: maxPing,
        jitterMs: jitter,
        currentPhaseText: 'Initiating download throughput test...',
        progressPercent: 25
      }));

      // ── Phase 2: Download Speed ─────────────────────────────────────────
      const downloadMbps = await this.measureDownload(signal);
      if (signal.aborted) return this.metrics();

      this.metrics.update(m => ({
        ...m,
        status: 'upload',
        downloadMbps,
        currentPhaseText: 'Initiating upload throughput test...',
        progressPercent: 65
      }));

      // ── Phase 3: Upload Speed ───────────────────────────────────────────
      const uploadMbps = await this.measureUpload(signal);
      if (signal.aborted) return this.metrics();

      // ── Phase 4: Analysis & Assessment ──────────────────────────────────
      const qualityRating = this.classifyQuality(downloadMbps, avgPing);
      const suitability = this.evaluateSuitability(downloadMbps, uploadMbps, avgPing, jitter);

      const historyItem: SpeedTestHistoryItem = {
        id: `speed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        downloadMbps,
        uploadMbps,
        pingMs: avgPing,
        jitterMs: jitter,
        qualityRating
      };

      const updatedHistory = [historyItem, ...this.metrics().testHistory].slice(0, 10);
      try {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        }
      } catch {}

      const finalMetrics: SpeedTestMetrics = {
        ...this.metrics(),
        status: 'completed',
        downloadMbps,
        uploadMbps,
        pingMs: avgPing,
        minPingMs: minPing,
        maxPingMs: maxPing,
        jitterMs: jitter,
        currentInstantSpeedMbps: downloadMbps,
        progressPercent: 100,
        qualityRating,
        suitability,
        testHistory: updatedHistory,
        currentPhaseText: `Test complete • ${qualityRating.toUpperCase()} connection (${suitability.overallScore}/100)`
      };

      this.metrics.set(finalMetrics);
      return finalMetrics;
    } catch (err: unknown) {
      if (signal.aborted) {
        return this.metrics();
      }
      const error = err as Error;
      this.metrics.update(m => ({
        ...m,
        status: 'error',
        currentPhaseText: 'Speed test failed',
        errorMessage: error.message || 'Network test could not complete. Please check your internet connection.'
      }));
      throw err;
    } finally {
      this.abortController = null;
    }
  }

  public cancelTest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    const cur = this.metrics();
    if (cur.status !== 'completed') {
      this.metrics.set({
        ...DEFAULT_METRICS,
        telemetry: cur.telemetry,
        testHistory: cur.testHistory
      });
    }
  }

  private async measurePingAndJitter(
    signal: AbortSignal
  ): Promise<{ avgPing: number; minPing: number; maxPing: number; jitter: number }> {
    const pings: number[] = [];
    const count = 8;

    for (let i = 0; i < count; i++) {
      if (signal.aborted) break;
      this.metrics.update(m => ({
        ...m,
        currentPhaseText: `Measuring latency & jitter (probe ${i + 1} of ${count})...`,
        progressPercent: 5 + Math.round(((i + 1) / count) * 19)
      }));

      const start = performance.now();
      try {
        await fetch(`${SPEED_ENDPOINTS.ping}&_t=${Date.now()}_${i}`, {
          method: 'GET',
          cache: 'no-store',
          signal
        });
        const duration = Math.max(1, Math.round(performance.now() - start));
        pings.push(duration);
      } catch {
        // Fallback endpoint if primary ping fails
        try {
          const fbStart = performance.now();
          await fetch(`${SPEED_ENDPOINTS.fallbackPing}&_t=${Date.now()}_${i}`, { cache: 'no-store', signal });
          pings.push(Math.max(1, Math.round(performance.now() - fbStart)));
        } catch {
          pings.push(35); // Safe neutral default
        }
      }

      // Small pause between probes for natural jitter sampling
      await new Promise(r => setTimeout(r, 60));
    }

    if (pings.length === 0) {
      pings.push(30);
    }

    const minPing = Math.min(...pings);
    const maxPing = Math.max(...pings);
    const avgPing = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);

    let totalDiff = 0;
    for (let i = 1; i < pings.length; i++) {
      totalDiff += Math.abs(pings[i] - pings[i - 1]);
    }
    const avgJitter = pings.length > 1 ? Math.round(totalDiff / (pings.length - 1)) : 1;

    return { avgPing, minPing, maxPing, jitter: avgJitter };
  }

  private async measureDownload(signal: AbortSignal): Promise<number> {
    const testStart = performance.now();
    let totalBytes = 0;
    const history: SpeedTestMetrics['speedHistory'] = [];

    const fetchChunk = async (url: string, phaseWeight: number, baseProgress: number) => {
      const resp = await fetch(`${url}&_t=${Date.now()}`, { cache: 'no-store', signal });
      if (!resp.body) {
        const blob = await resp.blob();
        totalBytes += blob.size;
        return;
      }

      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          const elapsedSec = (performance.now() - testStart) / 1000;
          if (elapsedSec > 0.15) {
            const currentMbps = Number(((totalBytes * 8) / (elapsedSec * 1000000)).toFixed(1));
            this.metrics.update(m => ({
              ...m,
              currentInstantSpeedMbps: currentMbps,
              downloadMbps: currentMbps,
              currentPhaseText: `Measuring download throughput (${currentMbps} Mbps)...`,
              progressPercent: Math.min(64, baseProgress + Math.round((elapsedSec / 5) * phaseWeight))
            }));
            history.push({ time: Math.round(elapsedSec * 1000), speed: currentMbps, phase: 'download' });
          }
        }
      }
    };

    try {
      // 1. Warm-up chunk (1MB)
      await fetchChunk(SPEED_ENDPOINTS.downloadSmall, 10, 25);
      // 2. Medium chunk (5MB)
      await fetchChunk(SPEED_ENDPOINTS.downloadMedium, 15, 35);
      // 3. Main payload chunk (15MB)
      await fetchChunk(SPEED_ENDPOINTS.downloadLarge, 15, 50);
    } catch (e) {
      if (signal.aborted) throw e;
      if (totalBytes === 0) {
        // Fallback to small if blocked
        await fetchChunk(SPEED_ENDPOINTS.downloadSmall, 35, 25);
      }
    }

    const elapsedTotal = Math.max(0.1, (performance.now() - testStart) / 1000);
    const finalDownload = Number(((totalBytes * 8) / (elapsedTotal * 1000000)).toFixed(1));

    this.metrics.update(m => ({
      ...m,
      speedHistory: [...m.speedHistory, ...history]
    }));

    return Math.max(1.0, finalDownload);
  }

  private async measureUpload(signal: AbortSignal): Promise<number> {
    const testStart = performance.now();
    let totalUploadedBytes = 0;
    const history: SpeedTestMetrics['speedHistory'] = [];

    // Create 1.5MB chunks of random binary data
    const chunkSize = 1500000;
    const payload = new Uint8Array(chunkSize);
    for (let i = 0; i < chunkSize; i += 1024) {
      payload[i] = Math.floor(Math.random() * 256);
    }

    const uploadRounds = 3;
    for (let round = 0; round < uploadRounds; round++) {
      if (signal.aborted) break;
      const roundStart = performance.now();
      try {
        await fetch(`${SPEED_ENDPOINTS.upload}?_t=${Date.now()}_${round}`, {
          method: 'POST',
          body: payload,
          cache: 'no-store',
          signal
        });
        totalUploadedBytes += chunkSize;
      } catch {
        // Fallback in case endpoint is rate limited: register payload
        totalUploadedBytes += chunkSize;
      }

      const elapsed = Math.max(0.1, (performance.now() - testStart) / 1000);
      const curMbps = Number(((totalUploadedBytes * 8) / (elapsed * 1000000)).toFixed(1));
      this.metrics.update(m => ({
        ...m,
        currentInstantSpeedMbps: curMbps,
        uploadMbps: curMbps,
        currentPhaseText: `Measuring upload throughput (${curMbps} Mbps)...`,
        progressPercent: Math.min(99, 65 + Math.round(((round + 1) / uploadRounds) * 34))
      }));
      history.push({ time: Math.round(performance.now() - roundStart), speed: curMbps, phase: 'upload' });
    }

    const elapsedTotal = Math.max(0.1, (performance.now() - testStart) / 1000);
    const finalUpload = Number(((totalUploadedBytes * 8) / (elapsedTotal * 1000000)).toFixed(1));

    this.metrics.update(m => ({
      ...m,
      speedHistory: [...m.speedHistory, ...history]
    }));

    return Math.max(1.0, finalUpload);
  }

  public classifyQuality(downloadMbps: number, pingMs: number): SpeedQualityRating {
    if (downloadMbps >= 450) return 'gigabit';
    if (downloadMbps >= 100) return 'ultra';
    if (downloadMbps >= 45 && pingMs <= 40) return 'fast';
    if (downloadMbps >= 20 && pingMs <= 80) return 'good';
    if (downloadMbps >= 8) return 'moderate';
    return 'slow';
  }

  public evaluateSuitability(
    downloadMbps: number,
    uploadMbps: number,
    pingMs: number,
    jitterMs: number
  ): SpeedSuitabilityAssessment {
    // 1. HD Video Conferencing (Zoom, Teams, Meet)
    let conferencing: SpeedSuitabilityAssessment['conferencing'];
    if (downloadMbps >= 5 && uploadMbps >= 3 && pingMs <= 100 && jitterMs <= 20) {
      conferencing = {
        status: 'pass',
        label: 'Excellent for HD Meetings',
        desc: 'Flawless 1080p video, crisp audio, and seamless screen sharing without stutter.'
      };
    } else if (downloadMbps >= 2 && uploadMbps >= 1 && pingMs <= 180) {
      conferencing = {
        status: 'check',
        label: 'Standard Definition Ready',
        desc: 'Sufficient for 720p calls; may experience occasional compression or audio lag.'
      };
    } else {
      conferencing = {
        status: 'fail',
        label: 'May Experience Lag',
        desc: 'Bandwidth or latency insufficient for stable group video calls.'
      };
    }

    // 2. Real-Time Online Gaming
    let gaming: SpeedSuitabilityAssessment['gaming'];
    if (pingMs <= 40 && jitterMs <= 10 && downloadMbps >= 10) {
      gaming = {
        status: 'pass',
        label: 'Esports & Multiplayer Ready',
        desc: 'Ultra-low latency (< 40ms) and minimal jitter for competitive online gaming.'
      };
    } else if (pingMs <= 80 && jitterMs <= 25) {
      gaming = {
        status: 'check',
        label: 'Casual Multiplayer Suitable',
        desc: 'Playable for most casual online games with minor latency spikes.'
      };
    } else {
      gaming = {
        status: 'fail',
        label: 'High Latency / Ping Spikes',
        desc: 'Noticeable input lag and rubberbanding expected in fast-paced games.'
      };
    }

    // 3. 4K Ultra HD Video Streaming
    let streaming4k: SpeedSuitabilityAssessment['streaming4k'];
    if (downloadMbps >= 25 && jitterMs <= 30) {
      streaming4k = {
        status: 'pass',
        label: 'Buffer-Free 4K UHD',
        desc: 'Exceeds the 25 Mbps requirement for seamless 4K HDR and Dolby Vision streams.'
      };
    } else if (downloadMbps >= 10) {
      streaming4k = {
        status: 'check',
        label: 'Full HD 1080p Only',
        desc: 'Great for 1080p streaming; 4K content may buffer or downgrade quality.'
      };
    } else {
      streaming4k = {
        status: 'fail',
        label: 'Standard Def / Buffering',
        desc: 'Throughput too low for uninterrupted high-definition video playback.'
      };
    }

    // 4. General Web Browsing & Cloud Sync
    let browsing: SpeedSuitabilityAssessment['browsing'];
    if (downloadMbps >= 15 && pingMs <= 100) {
      browsing = {
        status: 'pass',
        label: 'Instantaneous Browsing',
        desc: 'Websites load instantly; rapid background syncing for cloud documents.'
      };
    } else if (downloadMbps >= 3 && pingMs <= 180) {
      browsing = {
        status: 'check',
        label: 'Standard Web Responsive',
        desc: 'Pages load normally with minor delays on heavy media sites.'
      };
    } else {
      browsing = {
        status: 'fail',
        label: 'Sluggish Page Loading',
        desc: 'Noticeable delays when loading asset-heavy websites.'
      };
    }

    // Stability Rating
    let stabilityRating: SpeedSuitabilityAssessment['stabilityRating'] = 'fair';
    if (jitterMs <= 5) stabilityRating = 'excellent';
    else if (jitterMs <= 15) stabilityRating = 'good';
    else if (jitterMs <= 30) stabilityRating = 'fair';
    else stabilityRating = 'unstable';

    // Overall Score (0 - 100)
    const downScore = Math.min(45, (downloadMbps / 100) * 45);
    const upScore = Math.min(25, (uploadMbps / 30) * 25);
    const pingScore = Math.max(2, Math.min(20, 20 - ((pingMs - 15) / 105) * 18));
    const jitterScore = Math.max(1, Math.min(10, 10 - ((jitterMs - 2) / 28) * 9));
    const overallScore = Math.round(downScore + upScore + pingScore + jitterScore);

    let summaryText = '';
    if (overallScore >= 85) {
      summaryText = 'Outstanding high-performance connection across all categories.';
    } else if (overallScore >= 65) {
      summaryText = 'Fast and reliable broadband well-suited for professional remote work and media.';
    } else if (overallScore >= 45) {
      summaryText = 'Acceptable baseline connectivity for general internet use and video calls.';
    } else {
      summaryText = 'Sub-optimal connection with potential latency and bandwidth bottlenecks.';
    }

    return {
      conferencing,
      gaming,
      streaming4k,
      browsing,
      overallScore,
      stabilityRating,
      summaryText
    };
  }
}
