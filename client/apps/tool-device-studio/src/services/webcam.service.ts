// apps/tool-device-studio/src/services/webcam.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  MediaDeviceItem,
  WebcamMetrics,
  CameraCapabilitiesInfo,
  CameraQualityAssessment,
  ResolutionComparisonItem
} from '../models/device.models';

const DEFAULT_QUALITY: CameraQualityAssessment = {
  score: 0,
  grade: 'C',
  title: 'Camera Inactive',
  summary: 'Start camera to evaluate live stream resolution, frame stability, and lighting.',
  clarityScore: 0,
  clarityRating: 'moderate',
  colorTemperature: 'neutral',
  colorTempKelvinApprox: 5500,
  meetingRecommendation: 'acceptable'
};

const DEFAULT_RESOLUTION_LADDER: ResolutionComparisonItem[] = [
  { id: '4k', label: '4K UHD', category: 'Broadcast Studio', width: 3840, height: 2160, aspectRatio: '16:9', isCurrent: false, isAchieved: false, description: 'Highest visual fidelity for pro video production and streaming.', targetCallApps: 'OBS / Studio' },
  { id: '2k', label: '2K QHD', category: 'Ultra Clear Pro', width: 2560, height: 1440, aspectRatio: '16:9', isCurrent: false, isAchieved: false, description: 'Superior clarity for premium external webcams.', targetCallApps: 'Zoom HD / Teams' },
  { id: '1080p', label: '1080p Full HD', category: 'High Definition', width: 1920, height: 1080, aspectRatio: '16:9', isCurrent: false, isAchieved: false, description: 'Gold standard for professional conferences & remote work.', targetCallApps: 'Zoom / Meet / Teams' },
  { id: '720p', label: '720p HD', category: 'Standard HD', width: 1280, height: 720, aspectRatio: '16:9', isCurrent: false, isAchieved: false, description: 'Standard baseline for business video conferencing.', targetCallApps: 'Google Meet / Zoom' },
  { id: '480p', label: '480p SD', category: 'Standard Def', width: 640, height: 480, aspectRatio: '4:3', isCurrent: false, isAchieved: false, description: 'Legacy resolution; acceptable for low-bandwidth calls.', targetCallApps: 'Basic Calling' }
];

const DEFAULT_METRICS: WebcamMetrics = {
  activeDeviceId: '',
  activeDeviceLabel: 'Default Camera',
  isStreaming: false,
  isMirrored: true,
  streamState: 'stopped',
  resolution: {
    width: 0,
    height: 0,
    label: 'Not Connected',
    aspectRatio: '--'
  },
  frameRate: 0,
  brightness: 0,
  exposureRating: 'good',
  facingMode: 'user',
  permissionStatus: 'prompt',
  snapshots: [],
  capabilities: undefined,
  qualityAssessment: DEFAULT_QUALITY,
  resolutionLadder: DEFAULT_RESOLUTION_LADDER
};

@Injectable({
  providedIn: 'root'
})
export class WebcamService {
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private lastAnalysisTime = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  private analysisCanvas: HTMLCanvasElement | null = null;
  private analysisCtx: CanvasRenderingContext2D | null = null;
  private deviceChangeListenerBound: (() => void) | null = null;

  public readonly metrics = signal<WebcamMetrics>(DEFAULT_METRICS);
  public readonly availableDevices = signal<MediaDeviceItem[]>([]);
  public readonly isSupported = computed(() => {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  });

  constructor() {
    if (typeof window !== 'undefined') {
      this.analysisCanvas = document.createElement('canvas');
      this.analysisCanvas.width = 64;
      this.analysisCanvas.height = 48;
      this.analysisCtx = this.analysisCanvas.getContext('2d', { willReadFrequently: true });

      if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
        this.deviceChangeListenerBound = () => {
          this.loadDevices().catch(() => {});
        };
        navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListenerBound);
      }
    }
  }

  public async loadDevices(): Promise<MediaDeviceItem[]> {
    if (!this.isSupported()) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices: MediaDeviceItem[] = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
          kind: 'videoinput',
          groupId: d.groupId
        }));
      this.availableDevices.set(videoDevices);
      return videoDevices;
    } catch {
      return [];
    }
  }

  public async startStream(deviceId?: string, facingMode?: 'user' | 'environment'): Promise<MediaStream> {
    if (!this.isSupported()) {
      this.metrics.update(m => ({
        ...m,
        permissionStatus: 'unsupported',
        errorMessage: 'MediaDevices API is not supported in this browser environment.'
      }));
      throw new Error('Webcam not supported');
    }

    this.stopStream();

    const targetFacing = facingMode || this.metrics().facingMode || 'user';
    const videoConstraints: MediaTrackConstraints = deviceId
      ? { deviceId: { exact: deviceId } }
      : {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30 }
        };

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: videoConstraints
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      const width = settings.width || 0;
      const height = settings.height || 0;
      const resolutionLabel = this.classifyResolution(width, height);
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const div = width && height ? gcd(width, height) : 1;
      const aspectRatio = width && height ? `${width / div}:${height / div}` : '--';

      // Read capabilities if supported
      let capabilities: CameraCapabilitiesInfo | undefined = undefined;
      if (typeof track.getCapabilities === 'function') {
        try {
          const rawCaps = track.getCapabilities() as {
            zoom?: { min: number; max: number; step?: number };
            focusMode?: string[];
            exposureMode?: string[];
            whiteBalanceMode?: string[];
            frameRate?: { min: number; max: number };
            aspectRatio?: { min: number; max: number };
            torch?: boolean;
          };
          capabilities = {
            zoom: rawCaps.zoom ? { min: rawCaps.zoom.min, max: rawCaps.zoom.max, step: rawCaps.zoom.step } : undefined,
            focusMode: rawCaps.focusMode,
            exposureMode: rawCaps.exposureMode,
            whiteBalanceMode: rawCaps.whiteBalanceMode,
            frameRate: rawCaps.frameRate ? { min: rawCaps.frameRate.min, max: rawCaps.frameRate.max } : undefined,
            aspectRatio: rawCaps.aspectRatio ? { min: rawCaps.aspectRatio.min, max: rawCaps.aspectRatio.max } : undefined,
            torch: rawCaps.torch !== undefined ? Boolean(rawCaps.torch) : undefined
          };
        } catch {}
      }

      const activeId = settings.deviceId || deviceId || '';
      const updatedLadder = this.computeResolutionLadder(width, height);

      this.metrics.update(m => ({
        ...m,
        isStreaming: true,
        streamState: 'active',
        permissionStatus: 'granted',
        activeDeviceId: activeId,
        activeDeviceLabel: track.label || m.activeDeviceLabel || 'Active Camera',
        facingMode: settings.facingMode || targetFacing,
        frameRate: Math.round(settings.frameRate || 30),
        resolution: {
          width,
          height,
          label: resolutionLabel,
          aspectRatio
        },
        capabilities,
        resolutionLadder: updatedLadder,
        errorMessage: undefined
      }));

      // Refresh devices to get full hardware labels now that permission is granted
      const refreshedDevices = await this.loadDevices();
      if (activeId) {
        const found = refreshedDevices.find(d => d.deviceId === activeId);
        if (found?.label) {
          this.metrics.update(m => ({ ...m, activeDeviceLabel: found.label }));
        }
      }

      // Hardware disconnection & interruption listeners
      track.onended = () => {
        this.metrics.update(m => ({
          ...m,
          isStreaming: false,
          streamState: 'stopped',
          errorMessage: 'Camera hardware disconnected or stream was closed.'
        }));
        this.stopStream();
      };

      track.onmute = () => {
        this.metrics.update(m => ({
          ...m,
          streamState: 'paused'
        }));
      };

      track.onunmute = () => {
        this.metrics.update(m => ({
          ...m,
          streamState: 'active'
        }));
      };

      return stream;
    } catch (err: unknown) {
      const error = err as Error;
      let permissionStatus: WebcamMetrics['permissionStatus'] = 'denied';
      let errorMessage = 'Failed to access camera.';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        permissionStatus = 'denied';
        errorMessage = 'Camera access was blocked by your browser. Please allow camera permissions in your address bar.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera device found on this system. Please check your physical webcam connection.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is currently locked or in use by another application (e.g. Zoom, Google Meet, Teams).';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'The requested resolution or device constraint is not supported by your camera hardware.';
      } else if (error.name === 'SecurityError') {
        permissionStatus = 'unsupported';
        errorMessage = 'Camera access requires a secure origin (HTTPS or localhost).';
      }

      this.metrics.update(m => ({
        ...m,
        isStreaming: false,
        streamState: 'stopped',
        permissionStatus,
        errorMessage
      }));
      throw error;
    }
  }

  public stopStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.metrics.update(m => ({
      ...m,
      isStreaming: false,
      streamState: 'stopped'
    }));
  }

  public toggleMirror(): void {
    this.metrics.update(m => ({ ...m, isMirrored: !m.isMirrored }));
  }

  public async toggleFacingMode(): Promise<void> {
    const nextFacing = this.metrics().facingMode === 'environment' ? 'user' : 'environment';
    if (this.metrics().isStreaming) {
      await this.startStream(undefined, nextFacing);
    } else {
      this.metrics.update(m => ({ ...m, facingMode: nextFacing }));
    }
  }

  public captureSnapshot(videoElement: HTMLVideoElement): string | null {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (this.metrics().isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    this.metrics.update(m => ({
      ...m,
      snapshots: [dataUrl, ...m.snapshots.slice(0, 11)]
    }));

    return dataUrl;
  }

  public async copySnapshotToClipboard(index: number): Promise<boolean> {
    const snapshots = this.metrics().snapshots;
    if (index < 0 || index >= snapshots.length) return false;
    const dataUrl = snapshots[index];

    if (typeof window === 'undefined' || !navigator.clipboard?.write) {
      return false;
    }

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      return true;
    } catch {
      return false;
    }
  }

  public deleteSnapshot(index: number): void {
    this.metrics.update(m => ({
      ...m,
      snapshots: m.snapshots.filter((_, i) => i !== index)
    }));
  }

  public clearAllSnapshots(): void {
    this.metrics.update(m => ({
      ...m,
      snapshots: []
    }));
  }

  public analyzeFrame(videoElement: HTMLVideoElement): void {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.paused || videoElement.ended) {
      return;
    }

    const now = performance.now();
    this.frameCount++;
    if (now - this.fpsTimer >= 1000) {
      const liveFps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
      this.metrics.update(m => ({ ...m, frameRate: liveFps || m.frameRate }));
    }

    // Sample pixels for exposure, clarity, and color temp every ~400ms
    if (this.analysisCanvas && this.analysisCtx && now - this.lastAnalysisTime >= 400) {
      this.lastAnalysisTime = now;
      this.analysisCtx.drawImage(videoElement, 0, 0, this.analysisCanvas.width, this.analysisCanvas.height);
      const imgData = this.analysisCtx.getImageData(0, 0, this.analysisCanvas.width, this.analysisCanvas.height);
      const data = imgData.data;
      const totalPixels = data.length / 4;

      let totalLum = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      const luminances: number[] = [];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        totalR += r;
        totalG += g;
        totalB += b;

        // ITU-R BT.709 perceived luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        totalLum += lum;
        luminances.push(lum);
      }

      const avgLum = Math.round((totalLum / totalPixels / 255) * 100);
      const avgR = totalR / totalPixels;
      const avgB = totalB / totalPixels;

      // Variance & Standard Deviation for Clarity / Edge Contrast heuristic
      const meanLum = totalLum / totalPixels;
      let varianceSum = 0;
      for (const lum of luminances) {
        varianceSum += (lum - meanLum) * (lum - meanLum);
      }
      const stdDev = Math.sqrt(varianceSum / totalPixels);
      // Normalized clarity score (0 - 100)
      const clarityScore = Math.min(100, Math.max(10, Math.round((stdDev / 54) * 100)));
      const clarityRating = clarityScore >= 65 ? 'sharp' : clarityScore >= 35 ? 'moderate' : 'soft';

      // Color temperature heuristic: Red-to-Blue channel ratio
      const rbRatio = avgR / (avgB + 0.001);
      let colorTemperature: CameraQualityAssessment['colorTemperature'] = 'neutral';
      let colorTempKelvin = 5500;
      if (rbRatio > 1.25) {
        colorTemperature = 'warm';
        colorTempKelvin = 3800;
      } else if (rbRatio < 0.85) {
        colorTemperature = 'cool';
        colorTempKelvin = 7200;
      }

      // Exposure rating
      let exposureRating: WebcamMetrics['exposureRating'] = 'good';
      if (avgLum < 28) {
        exposureRating = 'underexposed';
      } else if (avgLum > 76) {
        exposureRating = 'overexposed';
      }

      // Composite Heuristic Quality Assessment
      const current = this.metrics();
      const assessment = this.computeQualityAssessment(
        current.resolution.width,
        current.frameRate || 30,
        avgLum,
        clarityScore,
        colorTemperature,
        colorTempKelvin
      );

      this.metrics.update(m => ({
        ...m,
        brightness: avgLum,
        exposureRating,
        qualityAssessment: assessment
      }));
    }
  }

  private computeQualityAssessment(
    width: number,
    fps: number,
    brightness: number,
    clarityScore: number,
    colorTemp: CameraQualityAssessment['colorTemperature'],
    colorTempKelvin: number
  ): CameraQualityAssessment {
    // 1. Resolution score (0 - 40 pts)
    let resPts = 10;
    if (width >= 3840) resPts = 40;
    else if (width >= 2560) resPts = 36;
    else if (width >= 1920) resPts = 32;
    else if (width >= 1280) resPts = 24;
    else if (width >= 640) resPts = 16;

    // 2. FPS score (0 - 30 pts)
    let fpsPts = 8;
    if (fps >= 28) fpsPts = 30;
    else if (fps >= 22) fpsPts = 24;
    else if (fps >= 15) fpsPts = 16;

    // 3. Lighting exposure (0 - 20 pts)
    let expPts = 10;
    if (brightness >= 30 && brightness <= 74) {
      expPts = 20;
    } else if (brightness >= 22 && brightness <= 82) {
      expPts = 14;
    }

    // 4. Clarity & Focus (0 - 10 pts)
    let clarityPts = 4;
    if (clarityScore >= 60) clarityPts = 10;
    else if (clarityScore >= 35) clarityPts = 7;

    const totalScore = Math.min(100, Math.max(10, resPts + fpsPts + expPts + clarityPts));

    let grade: CameraQualityAssessment['grade'] = 'C';
    let title = 'Standard Grade';
    let recommendation: CameraQualityAssessment['meetingRecommendation'] = 'acceptable';

    if (totalScore >= 90) {
      grade = 'A+';
      title = 'Studio Master Grade';
      recommendation = 'optimal';
    } else if (totalScore >= 80) {
      grade = 'A';
      title = 'High Definition Pro';
      recommendation = 'optimal';
    } else if (totalScore >= 65) {
      grade = 'B';
      title = 'Clear Meeting Grade';
      recommendation = 'recommended';
    } else if (totalScore >= 50) {
      grade = 'C';
      title = 'Acceptable Call Grade';
      recommendation = 'acceptable';
    } else {
      grade = 'D';
      title = 'Suboptimal Feed';
      recommendation = 'needs-improvement';
    }

    const summary = `${grade} Grade (${totalScore}/100) • ${width ? `${width}p` : 'Video'} at ${fps} FPS with ${brightness}% lighting.`;

    return {
      score: totalScore,
      grade,
      title,
      summary,
      clarityScore,
      clarityRating: clarityScore >= 65 ? 'sharp' : clarityScore >= 35 ? 'moderate' : 'soft',
      colorTemperature: colorTemp,
      colorTempKelvinApprox: colorTempKelvin,
      meetingRecommendation: recommendation
    };
  }

  private computeResolutionLadder(width: number, height: number): ResolutionComparisonItem[] {
    const activePixels = width * height;
    return DEFAULT_RESOLUTION_LADDER.map(tier => {
      const tierPixels = tier.width * tier.height;
      const isCurrent = Math.abs(width - tier.width) < 80 && Math.abs(height - tier.height) < 80;
      const isAchieved = activePixels >= tierPixels * 0.88;
      return {
        ...tier,
        isCurrent,
        isAchieved
      };
    });
  }

  private classifyResolution(width: number, height: number): string {
    const maxDim = Math.max(width, height);
    if (maxDim >= 3840) return '4K UHD (3840×2160)';
    if (maxDim >= 2560) return '2K QHD (2560×1440)';
    if (maxDim >= 1920) return '1080p Full HD (1920×1080)';
    if (maxDim >= 1280) return '720p HD (1280×720)';
    if (maxDim >= 640) return 'VGA (640×480)';
    return `${width}×${height}`;
  }
}
