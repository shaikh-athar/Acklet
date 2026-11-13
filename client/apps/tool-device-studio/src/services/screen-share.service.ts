// apps/tool-device-studio/src/services/screen-share.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  ScreenDiagnosticSummary,
  ScreenFitMode,
  ScreenQualityAssessment,
  ScreenQualityTier,
  ScreenShareMetrics
} from '../models/device.models';

const DEFAULT_ASSESSMENT: ScreenQualityAssessment = {
  tier: 'none',
  tierLabel: 'Untested',
  measuredFps: 0,
  targetFps: 0,
  fpsStability: 'low',
  textClarity: 'acceptable',
  audioStatusText: 'No stream active',
  summaryText: 'Click "Start Screen Share" to test your browser display capture.'
};

const DEFAULT_SUMMARY: ScreenDiagnosticSummary = {
  durationSeconds: 0,
  maxResolution: '--',
  averageFps: 0,
  surfaceUsed: 'unknown',
  hadAudio: false,
  verdict: 'untested'
};

const DEFAULT_METRICS: ScreenShareMetrics = {
  isSharing: false,
  surfaceType: 'unknown',
  resolution: {
    width: 0,
    height: 0,
    aspectRatio: '--'
  },
  frameRate: 0,
  measuredFps: 0,
  hasAudio: false,
  cursorMode: 'always',
  isMuted: false,
  fitMode: 'contain',
  permissionStatus: 'prompt',
  capturedFrames: [],
  qualityAssessment: DEFAULT_ASSESSMENT,
  diagnosticSummary: DEFAULT_SUMMARY
};

@Injectable({
  providedIn: 'root'
})
export class ScreenShareService {
  private mediaStream: MediaStream | null = null;
  private fpsCallbackHandle: number | null = null;
  private frameTimestamps: number[] = [];
  private sessionStartTime: number = 0;
  private measuredFpsSamples: number[] = [];

  public readonly metrics = signal<ScreenShareMetrics>(DEFAULT_METRICS);

  public readonly isSupported = computed(() => {
    return (
      typeof navigator !== 'undefined' &&
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getDisplayMedia &&
      (typeof window.isSecureContext === 'undefined' || window.isSecureContext)
    );
  });

  public async startSharing(): Promise<MediaStream> {
    if (!this.isSupported()) {
      this.metrics.update(m => ({
        ...m,
        permissionStatus: 'unsupported',
        errorMessage: 'Screen sharing is not supported in this browser or non-secure context.'
      }));
      throw new Error('Screen sharing not supported');
    }

    this.stopSharing();

    try {
      // Prompt user to select screen, window, or tab
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 60 }
        },
        audio: true
      });

      this.mediaStream = stream;
      this.sessionStartTime = performance.now();
      this.measuredFpsSamples = [];
      this.frameTimestamps = [];

      const videoTrack = stream.getVideoTracks()[0];
      const audioTracks = stream.getAudioTracks();
      const settings = videoTrack.getSettings() as MediaTrackSettings & {
        displaySurface?: 'monitor' | 'window' | 'browser';
      };

      const width = settings.width || 0;
      const height = settings.height || 0;
      const aspectRatio = this.computeAspectRatio(width, height);
      const surfaceType = settings.displaySurface || 'monitor';
      const frameRate = Math.round(settings.frameRate || 30);
      const hasAudio = audioTracks.length > 0;
      const audioTrackLabel = hasAudio ? audioTracks[0].label || 'System / Tab Audio Track' : undefined;

      const assessment = this.evaluateQuality(width, height, frameRate, frameRate, surfaceType, hasAudio);

      this.metrics.update(m => ({
        ...m,
        isSharing: true,
        permissionStatus: 'granted',
        surfaceType,
        resolution: {
          width,
          height,
          aspectRatio
        },
        frameRate,
        measuredFps: frameRate,
        hasAudio,
        audioTrackLabel,
        isMuted: false,
        qualityAssessment: assessment,
        errorMessage: undefined
      }));

      // Listen for when the user clicks browser's native "Stop sharing" bar
      videoTrack.onended = () => {
        this.stopSharing();
      };

      // Detect stream mute / interruption (e.g. screen lock, minimized window)
      videoTrack.onmute = () => {
        this.metrics.update(m => ({ ...m, isMuted: true }));
      };

      videoTrack.onunmute = () => {
        this.metrics.update(m => ({ ...m, isMuted: false }));
      };

      return stream;
    } catch (err: unknown) {
      const error = err as Error;
      let permissionStatus: ScreenShareMetrics['permissionStatus'] = 'denied';
      let errorMessage = 'Failed to initiate screen share.';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        permissionStatus = 'denied';
        errorMessage = 'Screen sharing was cancelled or denied by the browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No video sources found to capture.';
      } else if (error.name === 'NotSupportedError') {
        permissionStatus = 'unsupported';
        errorMessage = 'Screen capture is not supported on this platform or mobile viewport.';
      }

      this.metrics.update(m => ({
        ...m,
        isSharing: false,
        permissionStatus,
        errorMessage
      }));
      throw error;
    }
  }

  public attachFpsMonitoring(videoEl: HTMLVideoElement): void {
    if (!videoEl || typeof window === 'undefined') return;

    this.cancelFpsMonitoring(videoEl);

    // Watch for dynamic resolution updates (e.g. window resized by user)
    videoEl.onresize = () => {
      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        const width = videoEl.videoWidth;
        const height = videoEl.videoHeight;
        const aspectRatio = this.computeAspectRatio(width, height);
        this.metrics.update(m => ({
          ...m,
          resolution: { width, height, aspectRatio },
          qualityAssessment: this.evaluateQuality(
            width,
            height,
            m.frameRate,
            m.measuredFps,
            m.surfaceType,
            m.hasAudio
          )
        }));
      }
    };

    const hasRvfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    const onFrame = (now: number) => {
      this.frameTimestamps.push(now);
      // Keep only timestamps from the last 1000ms
      while (this.frameTimestamps.length > 0 && now - this.frameTimestamps[0] > 1000) {
        this.frameTimestamps.shift();
      }

      const count = this.frameTimestamps.length;
      if (count > 0 && now - this.frameTimestamps[0] >= 500) {
        const durationSec = (now - this.frameTimestamps[0]) / 1000;
        const liveFps = Math.min(60, Math.round(count / durationSec));
        this.measuredFpsSamples.push(liveFps);

        if (Math.abs(this.metrics().measuredFps - liveFps) >= 1) {
          const m = this.metrics();
          this.metrics.update(cur => ({
            ...cur,
            measuredFps: liveFps,
            qualityAssessment: this.evaluateQuality(
              cur.resolution.width,
              cur.resolution.height,
              cur.frameRate,
              liveFps,
              cur.surfaceType,
              cur.hasAudio
            )
          }));
        }
      }

      if (this.metrics().isSharing) {
        if (hasRvfc && (videoEl as any).requestVideoFrameCallback) {
          this.fpsCallbackHandle = (videoEl as any).requestVideoFrameCallback((_: unknown, metadata: { presentationTime: number }) => {
            onFrame(metadata.presentationTime || performance.now());
          });
        } else {
          this.fpsCallbackHandle = requestAnimationFrame(onFrame);
        }
      }
    };

    if (hasRvfc && (videoEl as any).requestVideoFrameCallback) {
      this.fpsCallbackHandle = (videoEl as any).requestVideoFrameCallback((_: unknown, metadata: { presentationTime: number }) => {
        onFrame(metadata.presentationTime || performance.now());
      });
    } else {
      this.fpsCallbackHandle = requestAnimationFrame(onFrame);
    }
  }

  private cancelFpsMonitoring(videoEl?: HTMLVideoElement): void {
    if (this.fpsCallbackHandle !== null) {
      if (videoEl && 'cancelVideoFrameCallback' in HTMLVideoElement.prototype && (videoEl as any).cancelVideoFrameCallback) {
        (videoEl as any).cancelVideoFrameCallback(this.fpsCallbackHandle);
      } else if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.fpsCallbackHandle);
      }
      this.fpsCallbackHandle = null;
    }
  }

  public stopSharing(videoEl?: HTMLVideoElement): void {
    this.cancelFpsMonitoring(videoEl);

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    const cur = this.metrics();
    if (cur.isSharing) {
      const elapsedSeconds = this.sessionStartTime > 0 
        ? Math.max(1, Math.round((performance.now() - this.sessionStartTime) / 1000))
        : 0;

      const avgFps = this.measuredFpsSamples.length > 0
        ? Math.round(this.measuredFpsSamples.reduce((a, b) => a + b, 0) / this.measuredFpsSamples.length)
        : cur.measuredFps || cur.frameRate;

      const maxRes = cur.resolution.width > 0 
        ? `${cur.resolution.width} × ${cur.resolution.height}`
        : '--';

      let verdict: ScreenDiagnosticSummary['verdict'] = 'fair';
      if (cur.resolution.height >= 1080 && avgFps >= 25) {
        verdict = 'excellent';
      } else if (cur.resolution.height >= 720) {
        verdict = 'good';
      }

      const diagnosticSummary: ScreenDiagnosticSummary = {
        testedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        durationSeconds: elapsedSeconds,
        maxResolution: maxRes,
        averageFps: avgFps,
        surfaceUsed: cur.surfaceType,
        hadAudio: cur.hasAudio,
        verdict
      };

      this.metrics.update(m => ({
        ...m,
        isSharing: false,
        diagnosticSummary
      }));
    } else {
      this.metrics.update(m => ({
        ...m,
        isSharing: false
      }));
    }
  }

  public toggleFitMode(): ScreenFitMode {
    const next = this.metrics().fitMode === 'contain' ? 'cover' : 'contain';
    this.metrics.update(m => ({ ...m, fitMode: next }));
    return next;
  }

  public captureSnapshot(videoElement: HTMLVideoElement): string | null {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      const updated = [dataUrl, ...this.metrics().capturedFrames].slice(0, 8);
      this.metrics.update(m => ({
        ...m,
        capturedFrames: updated
      }));

      return dataUrl;
    } catch {
      return null;
    }
  }

  public deleteSnapshot(index: number): void {
    this.metrics.update(m => ({
      ...m,
      capturedFrames: m.capturedFrames.filter((_, i) => i !== index)
    }));
  }

  public clearAllSnapshots(): void {
    this.metrics.update(m => ({ ...m, capturedFrames: [] }));
  }

  public async copySnapshotToClipboard(index: number): Promise<boolean> {
    const frames = this.metrics().capturedFrames;
    if (index < 0 || index >= frames.length) return false;
    const dataUrl = frames[index];

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      }
    } catch {
      // Fallback or permission blocked
    }
    return false;
  }

  public computeAspectRatio(width: number, height: number): string {
    if (!width || !height) return '--';
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const div = gcd(width, height);
    const rw = width / div;
    const rh = height / div;
    if (rw === 8 && rh === 5) return '16:10';
    return `${rw}:${rh}`;
  }

  public evaluateQuality(
    width: number,
    height: number,
    targetFps: number,
    measuredFps: number,
    surfaceType: string,
    hasAudio: boolean
  ): ScreenQualityAssessment {
    let tier: ScreenQualityTier = 'none';
    let tierLabel = 'Standard Def';
    let textClarity: ScreenQualityAssessment['textClarity'] = 'acceptable';

    if (height >= 2160 || width >= 3840) {
      tier = '4k';
      tierLabel = '4K Ultra HD';
      textClarity = 'exceptional';
    } else if (height >= 1440 || width >= 2560) {
      tier = '1440p';
      tierLabel = '1440p Quad HD';
      textClarity = 'exceptional';
    } else if (height >= 1080 || width >= 1920) {
      tier = '1080p';
      tierLabel = '1080p Full HD';
      textClarity = 'crisp';
    } else if (height >= 720 || width >= 1280) {
      tier = '720p';
      tierLabel = '720p HD';
      textClarity = 'acceptable';
    } else if (height > 0) {
      tier = 'sd';
      tierLabel = 'Standard Definition';
      textClarity = 'soft';
    }

    let fpsStability: ScreenQualityAssessment['fpsStability'] = 'stable-30';
    if (measuredFps >= 50) {
      fpsStability = 'smooth-60';
    } else if (measuredFps >= 24) {
      fpsStability = 'stable-30';
    } else if (measuredFps >= 12) {
      fpsStability = 'variable';
    } else {
      fpsStability = 'low';
    }

    const audioStatusText = hasAudio
      ? 'System / Tab Audio Track Included'
      : 'Video-Only Stream (No Audio)';

    let summaryText = '';
    if (tier === '4k' || tier === '1440p' || tier === '1080p') {
      summaryText = `High fidelity ${tierLabel} stream at ${measuredFps} FPS. Text, terminal code, and fine details render with crisp clarity.`;
    } else if (tier === '720p') {
      summaryText = `Reliable 720p HD broadcast. Suitable for general presentation slides, documents, and video conferencing.`;
    } else {
      summaryText = `Lower resolution capture detected (${width}×${height}). Small fonts and code syntax may appear soft.`;
    }

    return {
      tier,
      tierLabel,
      measuredFps,
      targetFps,
      fpsStability,
      textClarity,
      audioStatusText,
      summaryText
    };
  }
}
