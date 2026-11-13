// apps/tool-device-studio/src/services/microphone.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  MediaDeviceItem,
  MicrophoneMetrics,
  MicQualityAssessment,
  MicClarityRating,
  MicNoiseFloorRating,
  RecordingMetadata
} from '../models/device.models';

const DEFAULT_QUALITY: MicQualityAssessment = {
  score: 0,
  grade: 'C',
  title: 'Microphone Inactive',
  summary: 'Start microphone to evaluate live input level, frequency spectrum, voice clarity, and noise floor.',
  clarityRating: 'moderate',
  clarityPercent: 0,
  noiseFloorDb: -60,
  noiseFloorRating: 'quiet',
  clippingCount: 0,
  meetingRecommendation: 'acceptable'
};

const DEFAULT_RECORDING: RecordingMetadata = {
  status: 'idle',
  durationSeconds: 0,
  maxDurationSeconds: 15,
  blobUrl: undefined,
  blobSize: 0,
  mimeType: 'audio/webm'
};

const DEFAULT_METRICS: MicrophoneMetrics = {
  activeDeviceId: '',
  activeDeviceLabel: 'Default Microphone',
  isStreaming: false,
  streamState: 'stopped',
  isMuted: false,
  volumeRms: 0,
  peakDb: -60,
  peakHoldDb: -60,
  isClipping: false,
  isSilent: true,
  silenceDurationMs: 0,
  sampleRate: 48000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  permissionStatus: 'prompt',
  qualityAssessment: DEFAULT_QUALITY,
  recording: DEFAULT_RECORDING,
  levelHistory: new Array(32).fill(0),
  isRecordingLoopback: false,
  isPlayingLoopback: false,
  hasRecordedSample: false,
  loopbackAudioUrl: undefined
};

@Injectable({
  providedIn: 'root'
})
export class MicrophoneService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private timeDataArray: Uint8Array<ArrayBuffer> | null = null;
  private freqDataArray: Uint8Array<ArrayBuffer> | null = null;

  private currentPeakHold = -60;
  private clippingCount = 0;
  private silenceTimer = 0;
  private estimatedNoiseFloorDb = -54;
  private lastHistorySampleTime = 0;
  private lastAnalysisTime = 0;
  private rollingHistory: number[] = new Array(32).fill(0);

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimerId: number | null = null;
  private playbackAudio: HTMLAudioElement | null = null;
  private deviceChangeListenerBound: (() => void) | null = null;

  public readonly metrics = signal<MicrophoneMetrics>(DEFAULT_METRICS);
  public readonly availableDevices = signal<MediaDeviceItem[]>([]);
  public readonly isSupported = computed(() => {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  });

  constructor() {
    if (typeof window !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      this.deviceChangeListenerBound = () => {
        this.loadDevices().catch(() => {});
      };
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListenerBound);
    }
  }

  public async loadDevices(): Promise<MediaDeviceItem[]> {
    if (!this.isSupported()) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices: MediaDeviceItem[] = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
          kind: 'audioinput',
          groupId: d.groupId
        }));
      this.availableDevices.set(audioDevices);
      return audioDevices;
    } catch {
      return [];
    }
  }

  public async startStream(deviceId?: string): Promise<MediaStream> {
    if (!this.isSupported()) {
      this.metrics.update(m => ({
        ...m,
        permissionStatus: 'unsupported',
        errorMessage: 'MediaDevices audio API is not supported in this browser environment.'
      }));
      throw new Error('Microphone not supported');
    }

    this.stopStream();

    const audioConstraints: MediaTrackConstraints = deviceId
      ? { deviceId: { exact: deviceId } }
      : {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true }
        };

    const constraints: MediaStreamConstraints = {
      video: false,
      audio: audioConstraints
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();

      // AudioContext setup
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.audioContext = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      this.analyserNode = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      this.sourceNode = source;

      this.timeDataArray = new Uint8Array(analyser.frequencyBinCount);
      this.freqDataArray = new Uint8Array(analyser.frequencyBinCount);

      const activeId = settings.deviceId || deviceId || '';

      this.metrics.update(m => ({
        ...m,
        isStreaming: true,
        streamState: 'active',
        permissionStatus: 'granted',
        activeDeviceId: activeId,
        activeDeviceLabel: track.label || m.activeDeviceLabel || 'Active Microphone',
        sampleRate: settings.sampleRate || ctx.sampleRate,
        channelCount: settings.channelCount || 1,
        echoCancellation: Boolean(settings.echoCancellation ?? true),
        noiseSuppression: Boolean(settings.noiseSuppression ?? true),
        autoGainControl: Boolean(settings.autoGainControl ?? true),
        isMuted: !track.enabled,
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

      this.startMetersLoop();

      // Hardware disconnection & interruption listeners
      track.onended = () => {
        this.metrics.update(m => ({
          ...m,
          isStreaming: false,
          streamState: 'stopped',
          errorMessage: 'Microphone hardware was disconnected or stream was closed.'
        }));
        this.stopStream();
      };

      track.onmute = () => {
        this.metrics.update(m => ({
          ...m,
          streamState: 'paused',
          isMuted: true
        }));
      };

      track.onunmute = () => {
        this.metrics.update(m => ({
          ...m,
          streamState: 'active',
          isMuted: false
        }));
      };

      return stream;
    } catch (err: unknown) {
      const error = err as Error;
      let permissionStatus: MicrophoneMetrics['permissionStatus'] = 'denied';
      let errorMessage = 'Failed to access microphone.';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        permissionStatus = 'denied';
        errorMessage = 'Microphone access was blocked. Please permit microphone access in your browser address bar.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone device found on this system.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microphone is currently in use exclusively by another application (e.g. Zoom, Google Meet).';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'Requested audio constraints are not supported by your hardware.';
      } else if (error.name === 'SecurityError') {
        permissionStatus = 'unsupported';
        errorMessage = 'Microphone access requires a secure origin (HTTPS or localhost).';
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
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    if (this.analyserNode) {
      try { this.analyserNode.disconnect(); } catch {}
      this.analyserNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.stopRecordingInternal();
    this.stopPlaybackInternal();

    this.currentPeakHold = -60;
    this.clippingCount = 0;
    this.silenceTimer = 0;

    this.metrics.update(m => ({
      ...m,
      isStreaming: false,
      streamState: 'stopped',
      volumeRms: 0,
      peakDb: -60,
      peakHoldDb: -60,
      isClipping: false,
      isSilent: true,
      silenceDurationMs: 0
    }));
  }

  public toggleMute(): void {
    if (!this.mediaStream) return;
    const track = this.mediaStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.metrics.update(m => ({ ...m, isMuted: !track.enabled }));
    }
  }

  public getTimeDomainData(): Uint8Array | null {
    if (!this.analyserNode || !this.timeDataArray) return null;
    this.analyserNode.getByteTimeDomainData(this.timeDataArray);
    return this.timeDataArray;
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode || !this.freqDataArray) return null;
    this.analyserNode.getByteFrequencyData(this.freqDataArray);
    return this.freqDataArray;
  }

  // ==========================================
  // Recording & Playback Lifecycle
  // ==========================================

  public startRecording(maxDurationSeconds = 15): Promise<void> {
    const stream = this.mediaStream;
    if (!stream) {
      return Promise.reject(new Error('Microphone stream is not active.'));
    }

    this.stopRecordingInternal();
    this.stopPlaybackInternal();

    return new Promise((resolve, reject) => {
      try {
        this.recordedChunks = [];
        const preferredTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus'
        ];
        let selectedMime = '';
        for (const t of preferredTypes) {
          if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
            selectedMime = t;
            break;
          }
        }

        const options = selectedMime ? { mimeType: selectedMime } : undefined;
        const recorder = new MediaRecorder(stream, options);
        this.mediaRecorder = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          this.clearRecordingTimer();
          const finalMime = recorder.mimeType || selectedMime || 'audio/webm';
          const blob = new Blob(this.recordedChunks, { type: finalMime });
          
          const prevUrl = this.metrics().recording.blobUrl;
          if (prevUrl) {
            URL.revokeObjectURL(prevUrl);
          }

          const blobUrl = URL.createObjectURL(blob);
          const currentDuration = this.metrics().recording.durationSeconds;

          this.metrics.update(m => ({
            ...m,
            isRecordingLoopback: false,
            hasRecordedSample: true,
            loopbackAudioUrl: blobUrl,
            recording: {
              status: 'recorded',
              durationSeconds: currentDuration,
              maxDurationSeconds,
              blobUrl,
              blobSize: blob.size,
              mimeType: finalMime,
              timestamp: new Date().toLocaleTimeString()
            }
          }));
        };

        recorder.onerror = () => {
          this.clearRecordingTimer();
          this.metrics.update(m => ({
            ...m,
            isRecordingLoopback: false,
            recording: { ...m.recording, status: 'idle' }
          }));
          reject(new Error('MediaRecorder encountered an error.'));
        };

        recorder.start(250); // Emit data every 250ms

        this.metrics.update(m => ({
          ...m,
          isRecordingLoopback: true,
          recording: {
            ...m.recording,
            status: 'recording',
            durationSeconds: 0,
            maxDurationSeconds,
            blobUrl: undefined,
            blobSize: 0
          }
        }));

        // Timer to track duration and auto-stop
        let elapsed = 0;
        this.recordingTimerId = window.setInterval(() => {
          elapsed++;
          this.metrics.update(m => ({
            ...m,
            recording: { ...m.recording, durationSeconds: elapsed }
          }));

          if (elapsed >= maxDurationSeconds) {
            this.stopRecording().catch(() => {});
          }
        }, 1000);

        resolve();
      } catch (err) {
        this.clearRecordingTimer();
        this.metrics.update(m => ({
          ...m,
          isRecordingLoopback: false,
          recording: { ...m.recording, status: 'idle' }
        }));
        reject(err);
      }
    });
  }

  public stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        const recorder = this.mediaRecorder;
        const origStop = recorder.onstop;
        recorder.onstop = (ev) => {
          if (origStop) origStop.call(recorder, ev);
          resolve(this.metrics().recording.blobUrl || '');
        };
        recorder.stop();
      } else {
        this.clearRecordingTimer();
        resolve(this.metrics().recording.blobUrl || '');
      }
    });
  }

  public playRecording(): void {
    const url = this.metrics().recording.blobUrl || this.metrics().loopbackAudioUrl;
    if (!url) return;

    this.stopPlaybackInternal();

    const audio = new Audio(url);
    this.playbackAudio = audio;

    this.metrics.update(m => ({
      ...m,
      isPlayingLoopback: true,
      recording: { ...m.recording, status: 'playing' }
    }));

    audio.onended = () => {
      this.metrics.update(m => ({
        ...m,
        isPlayingLoopback: false,
        recording: { ...m.recording, status: 'recorded' }
      }));
      this.playbackAudio = null;
    };

    audio.onerror = () => {
      this.metrics.update(m => ({
        ...m,
        isPlayingLoopback: false,
        recording: { ...m.recording, status: 'recorded' }
      }));
      this.playbackAudio = null;
    };

    audio.play().catch(() => {
      this.metrics.update(m => ({
        ...m,
        isPlayingLoopback: false,
        recording: { ...m.recording, status: 'recorded' }
      }));
      this.playbackAudio = null;
    });
  }

  public pauseRecordingPlayback(): void {
    this.stopPlaybackInternal();
  }

  public retakeRecording(): void {
    this.stopRecordingInternal();
    this.stopPlaybackInternal();

    const prevUrl = this.metrics().recording.blobUrl;
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
    }

    this.metrics.update(m => ({
      ...m,
      isRecordingLoopback: false,
      isPlayingLoopback: false,
      hasRecordedSample: false,
      loopbackAudioUrl: undefined,
      recording: DEFAULT_RECORDING
    }));
  }

  public downloadRecording(customFilename?: string): void {
    const rec = this.metrics().recording;
    if (!rec.blobUrl) return;

    const ext = rec.mimeType.includes('mp4') ? 'mp4' : rec.mimeType.includes('ogg') ? 'ogg' : 'webm';
    const filename = customFilename || `acklet-mic-recording-${Date.now()}.${ext}`;

    const a = document.createElement('a');
    a.href = rec.blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Backwards compatibility alias for loopback test
  public startLoopbackRecording(durationSeconds = 5): Promise<string> {
    return this.startRecording(durationSeconds).then(() => {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.metrics().isRecordingLoopback) {
            clearInterval(check);
            resolve(this.metrics().recording.blobUrl || '');
          }
        }, 200);
      });
    });
  }

  public playLoopback(): void {
    this.playRecording();
  }

  public stopLoopbackPlayback(): void {
    this.pauseRecordingPlayback();
  }

  private stopRecordingInternal(): void {
    this.clearRecordingTimer();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch {}
      this.mediaRecorder = null;
    }
  }

  private stopPlaybackInternal(): void {
    if (this.playbackAudio) {
      this.playbackAudio.pause();
      this.playbackAudio = null;
    }
    this.metrics.update(m => ({
      ...m,
      isPlayingLoopback: false,
      recording: {
        ...m.recording,
        status: m.recording.blobUrl ? 'recorded' : 'idle'
      }
    }));
  }

  private clearRecordingTimer(): void {
    if (this.recordingTimerId !== null) {
      clearInterval(this.recordingTimerId);
      this.recordingTimerId = null;
    }
  }

  // ==========================================
  // Live Analysis & Telemetry Loop
  // ==========================================

  private startMetersLoop(): void {
    const update = () => {
      if (!this.analyserNode || !this.timeDataArray) return;

      this.analyserNode.getByteTimeDomainData(this.timeDataArray);
      let sumSquares = 0;
      let peak = 0;
      const len = this.timeDataArray.length;

      for (let i = 0; i < len; i++) {
        const norm = (this.timeDataArray[i] - 128) / 128; // -1.0 to 1.0
        const absVal = Math.abs(norm);
        if (absVal > peak) peak = absVal;
        sumSquares += norm * norm;
      }

      const rms = Math.sqrt(sumSquares / len);
      // Logarithmic perceived volume 0 - 100
      const volumeRms = Math.min(100, Math.round(rms * 140));
      // Peak dBFS calculation: 20 * log10(peak)
      const peakDb = peak > 0 ? Math.max(-60, Math.round(20 * Math.log10(peak))) : -60;
      const isClipping = peak >= 0.98;
      if (isClipping) {
        this.clippingCount++;
      }

      // Decaying Peak Hold
      if (peakDb >= this.currentPeakHold) {
        this.currentPeakHold = peakDb;
      } else {
        this.currentPeakHold = Math.max(-60, this.currentPeakHold - 0.4);
      }

      const now = performance.now();

      // Silence Detection
      const isSubAudible = volumeRms < 2 || peakDb <= -50;
      if (isSubAudible) {
        if (this.silenceTimer === 0) {
          this.silenceTimer = now;
        }
      } else {
        this.silenceTimer = 0;
      }
      const silenceDurationMs = this.silenceTimer > 0 ? Math.round(now - this.silenceTimer) : 0;
      const isSilent = silenceDurationMs >= 1500;

      // Rolling History Buffer (every ~100ms)
      if (now - this.lastHistorySampleTime >= 100) {
        this.lastHistorySampleTime = now;
        this.rollingHistory = [...this.rollingHistory.slice(1), volumeRms];
      }

      // Advanced Acoustic Analysis (every ~350ms)
      if (now - this.lastAnalysisTime >= 350 && this.freqDataArray) {
        this.lastAnalysisTime = now;
        this.performAcousticAnalysis(volumeRms, peakDb, isSilent);
      } else {
        this.metrics.update(m => ({
          ...m,
          volumeRms,
          peakDb,
          peakHoldDb: Math.round(this.currentPeakHold),
          isClipping,
          isSilent,
          silenceDurationMs,
          levelHistory: this.rollingHistory
        }));
      }

      this.animFrameId = requestAnimationFrame(update);
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  private performAcousticAnalysis(volumeRms: number, peakDb: number, isSilent: boolean): void {
    if (!this.analyserNode || !this.freqDataArray) return;
    this.analyserNode.getByteFrequencyData(this.freqDataArray);

    const sampleRate = this.audioContext?.sampleRate || 48000;
    const binHz = sampleRate / this.analyserNode.fftSize;

    // Speech formant range: 300 Hz - 3400 Hz
    const vocalMinBin = Math.floor(300 / binHz);
    const vocalMaxBin = Math.min(this.freqDataArray.length - 1, Math.ceil(3400 / binHz));
    // Low rumble: < 120 Hz
    const rumbleMaxBin = Math.floor(120 / binHz);
    // High hiss: > 8000 Hz
    const hissMinBin = Math.floor(8000 / binHz);

    let totalEnergy = 0;
    let vocalEnergy = 0;
    let noiseEnergy = 0;

    for (let i = 0; i < this.freqDataArray.length; i++) {
      const val = this.freqDataArray[i];
      totalEnergy += val;
      if (i >= vocalMinBin && i <= vocalMaxBin) {
        vocalEnergy += val;
      }
      if (i <= rumbleMaxBin || i >= hissMinBin) {
        noiseEnergy += val;
      }
    }

    // Vocal ratio
    const vocalRatio = totalEnergy > 0 ? vocalEnergy / totalEnergy : 0.5;
    const clarityPercent = Math.min(100, Math.max(10, Math.round(vocalRatio * 155)));
    const clarityRating: MicClarityRating = clarityPercent >= 70 ? 'clear' : clarityPercent >= 45 ? 'moderate' : 'muffled';

    // Ambient noise floor estimation during silent pauses
    if (isSilent && peakDb > -60) {
      this.estimatedNoiseFloorDb = Math.round((this.estimatedNoiseFloorDb * 0.85) + (peakDb * 0.15));
    }

    const noiseFloorRating: MicNoiseFloorRating =
      this.estimatedNoiseFloorDb <= -52 ? 'silent' :
      this.estimatedNoiseFloorDb <= -42 ? 'quiet' :
      this.estimatedNoiseFloorDb <= -32 ? 'moderate' : 'noisy';

    // Composite Heuristic Quality Assessment
    const quality = this.computeQualityAssessment(clarityPercent, this.estimatedNoiseFloorDb, this.clippingCount);

    this.metrics.update(m => ({
      ...m,
      volumeRms,
      peakDb,
      peakHoldDb: Math.round(this.currentPeakHold),
      isClipping: peakDb >= -0.5,
      isSilent,
      levelHistory: this.rollingHistory,
      qualityAssessment: quality
    }));
  }

  private computeQualityAssessment(
    clarityPercent: number,
    noiseFloorDb: number,
    clippingCount: number
  ): MicQualityAssessment {
    // 1. Clarity score (0 - 35 pts)
    let clarityPts = 15;
    if (clarityPercent >= 75) clarityPts = 35;
    else if (clarityPercent >= 55) clarityPts = 28;
    else if (clarityPercent >= 35) clarityPts = 20;

    // 2. Noise floor score (0 - 35 pts)
    let noisePts = 15;
    if (noiseFloorDb <= -52) noisePts = 35;
    else if (noiseFloorDb <= -44) noisePts = 28;
    else if (noiseFloorDb <= -36) noisePts = 20;

    // 3. Clipping penalty (0 - 30 pts)
    let clipPts = 30;
    if (clippingCount > 8) clipPts = 10;
    else if (clippingCount > 2) clipPts = 20;

    const totalScore = Math.min(100, Math.max(10, clarityPts + noisePts + clipPts));

    let grade: MicQualityAssessment['grade'] = 'C';
    let title = 'Standard Calling Grade';
    let recommendation: MicQualityAssessment['meetingRecommendation'] = 'acceptable';

    if (totalScore >= 90) {
      grade = 'A+';
      title = 'Studio Broadcast Quality';
      recommendation = 'optimal';
    } else if (totalScore >= 80) {
      grade = 'A';
      title = 'High Definition Voice';
      recommendation = 'optimal';
    } else if (totalScore >= 65) {
      grade = 'B';
      title = 'Clear Meeting Grade';
      recommendation = 'recommended';
    } else if (totalScore >= 50) {
      grade = 'C';
      title = 'Standard Voice Grade';
      recommendation = 'acceptable';
    } else {
      grade = 'D';
      title = 'Noisy or Distorted Feed';
      recommendation = 'needs-improvement';
    }

    const summary = `${grade} Grade (${totalScore}/100) • ${clarityPercent}% vocal clarity with ${noiseFloorDb} dBFS noise floor.`;

    return {
      score: totalScore,
      grade,
      title,
      summary,
      clarityPercent,
      clarityRating: clarityPercent >= 70 ? 'clear' : clarityPercent >= 45 ? 'moderate' : 'muffled',
      noiseFloorDb,
      noiseFloorRating: noiseFloorDb <= -52 ? 'silent' : noiseFloorDb <= -42 ? 'quiet' : noiseFloorDb <= -32 ? 'moderate' : 'noisy',
      clippingCount,
      meetingRecommendation: recommendation
    };
  }
}
