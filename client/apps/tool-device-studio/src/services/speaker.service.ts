// apps/tool-device-studio/src/services/speaker.service.ts
import { Injectable, signal, computed } from '@angular/core';
import {
  MediaDeviceItem,
  SpeakerMetrics,
  SpeakerTestMode,
  SpeakerConfirmationStatus,
  SpeakerDiagnosticSummary
} from '../models/device.models';

const DEFAULT_CONFIRMATIONS: SpeakerConfirmationStatus = {
  leftConfirmed: null,
  rightConfirmed: null,
  stereoConfirmed: null,
  frequenciesConfirmed: null
};

const DEFAULT_DIAGNOSTIC: SpeakerDiagnosticSummary = {
  verdict: 'untested',
  verdictTitle: 'Awaiting Channel Verification',
  verdictDescription: 'Run the left, right, and stereo channel tests to verify audio output balance and separation.',
  stereoSeparationScore: 0,
  latencyMs: undefined,
  sampleRate: 48000,
  outputSinkSupported: typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype
};

const DEFAULT_METRICS: SpeakerMetrics = {
  isPlaying: false,
  currentMode: 'none',
  currentFrequency: 440,
  masterVolume: 60,
  panValue: 0,
  isMuted: false,
  activeOutputDeviceId: '',
  activeOutputDeviceLabel: 'Default Audio Output',
  sweepProgress: 0,
  sweepRunning: false,
  alternatingChannel: undefined,
  confirmations: DEFAULT_CONFIRMATIONS,
  diagnosticSummary: DEFAULT_DIAGNOSTIC
};

@Injectable({
  providedIn: 'root'
})
export class SpeakerService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private activeOscillator: OscillatorNode | null = null;
  private activeSecondaryOsc: OscillatorNode | null = null;
  private activeNoiseNode: AudioBufferSourceNode | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private alternatingTimer: ReturnType<typeof setInterval> | null = null;
  private deviceChangeListenerBound: (() => void) | null = null;

  public readonly metrics = signal<SpeakerMetrics>(DEFAULT_METRICS);
  public readonly availableDevices = signal<MediaDeviceItem[]>([]);
  public readonly isSupported = computed(() => {
    return typeof window !== 'undefined' && (!!window.AudioContext || !!(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
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
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputDevices: MediaDeviceItem[] = devices
        .filter(d => d.kind === 'audiooutput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker / Headphone ${index + 1}`,
          kind: 'audiooutput',
          groupId: d.groupId
        }));
      this.availableDevices.set(outputDevices);

      // Resolve active label if matching device exists
      const activeId = this.metrics().activeOutputDeviceId;
      if (activeId) {
        const found = outputDevices.find(d => d.deviceId === activeId);
        if (found?.label) {
          this.metrics.update(m => ({ ...m, activeOutputDeviceLabel: found.label }));
        }
      } else if (outputDevices.length > 0 && outputDevices[0].label) {
        this.metrics.update(m => ({ ...m, activeOutputDeviceLabel: outputDevices[0].label }));
      }

      return outputDevices;
    } catch {
      return [];
    }
  }

  public async setOutputDevice(deviceId: string): Promise<boolean> {
    this.metrics.update(m => ({ ...m, activeOutputDeviceId: deviceId }));
    const devices = this.availableDevices();
    const found = devices.find(d => d.deviceId === deviceId);
    if (found?.label) {
      this.metrics.update(m => ({ ...m, activeOutputDeviceLabel: found.label }));
    }

    if (this.audioContext && 'setSinkId' in this.audioContext) {
      try {
        await (this.audioContext as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtxClass();

      // Master Gain Node (governed by volume slider and mute toggle)
      const masterGain = this.audioContext.createGain();
      masterGain.gain.setValueAtTime(this.getEffectiveGain(), this.audioContext.currentTime);
      masterGain.connect(this.audioContext.destination);
      this.masterGain = masterGain;

      // Voice Gain Node (for smooth envelope fades without clicks)
      const voiceGain = this.audioContext.createGain();
      voiceGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      this.voiceGain = voiceGain;

      // Stereo Panner Node
      if (this.audioContext.createStereoPanner) {
        const panner = this.audioContext.createStereoPanner();
        panner.pan.setValueAtTime(this.metrics().panValue, this.audioContext.currentTime);
        voiceGain.connect(panner);
        panner.connect(masterGain);
        this.pannerNode = panner;
      } else {
        voiceGain.connect(masterGain);
      }

      // Read output latency and sample rate
      const sampleRate = this.audioContext.sampleRate || 48000;
      const ctxAny = this.audioContext as unknown as { outputLatency?: number; baseLatency?: number };
      const latencySeconds = ctxAny.outputLatency || ctxAny.baseLatency || 0.012;
      const latencyMs = Math.round(latencySeconds * 1000);

      this.metrics.update(m => ({
        ...m,
        diagnosticSummary: {
          ...m.diagnosticSummary,
          sampleRate,
          latencyMs,
          outputSinkSupported: 'setSinkId' in AudioContext.prototype
        }
      }));
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  // ==========================================
  // Stereo Channel Testing
  // ==========================================

  public async playChannelTone(channel: 'left' | 'right' | 'stereo'): Promise<void> {
    await this.stop();
    const ctx = await this.ensureAudioContext();

    const osc = ctx.createOscillator();
    osc.type = 'sine';

    let freq = 440; // A4
    let pan = 0;
    let mode: SpeakerTestMode = 'stereo';

    if (channel === 'left') {
      freq = 440; // A4 Left
      pan = -1.0;
      mode = 'left';
    } else if (channel === 'right') {
      freq = 880; // A5 Right
      pan = 1.0;
      mode = 'right';
    } else {
      // Stereo harmony: 440 Hz (A4) + 554.37 Hz (C#5 major third)
      freq = 440;
      pan = 0;
      mode = 'stereo';

      const secOsc = ctx.createOscillator();
      secOsc.type = 'sine';
      secOsc.frequency.setValueAtTime(554.37, ctx.currentTime);
      if (this.voiceGain) {
        secOsc.connect(this.voiceGain);
      }
      secOsc.start();
      this.activeSecondaryOsc = secOsc;
    }

    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(pan, ctx.currentTime);
    }
    if (this.voiceGain) {
      osc.connect(this.voiceGain);
    }

    // Smooth envelope attack to prevent loud speaker pop
    if (this.voiceGain) {
      this.voiceGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.voiceGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.04);
    }

    osc.start();
    this.activeOscillator = osc;

    this.metrics.update(m => ({
      ...m,
      isPlaying: true,
      currentMode: mode,
      currentFrequency: freq,
      panValue: pan,
      alternatingChannel: undefined
    }));
  }

  public async playAlternatingChannels(totalCycles = 6): Promise<void> {
    await this.stop();
    const ctx = await this.ensureAudioContext();

    let isLeft = true;
    let cyclesDone = 0;

    const runStep = () => {
      if (!this.activeOscillator || !this.pannerNode) return;
      const targetPan = isLeft ? -1.0 : 1.0;
      const targetFreq = isLeft ? 440 : 880;
      const activeSide: 'left' | 'right' = isLeft ? 'left' : 'right';

      this.pannerNode.pan.setValueAtTime(targetPan, ctx.currentTime);
      this.activeOscillator.frequency.setValueAtTime(targetFreq, ctx.currentTime);

      this.metrics.update(m => ({
        ...m,
        alternatingChannel: activeSide,
        currentFrequency: targetFreq,
        panValue: targetPan
      }));

      isLeft = !isLeft;
      cyclesDone++;
      if (cyclesDone >= totalCycles * 2) {
        this.stop();
      }
    };

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(-1.0, ctx.currentTime);
    }
    if (this.voiceGain) {
      osc.connect(this.voiceGain);
    }

    osc.start();
    this.activeOscillator = osc;

    this.metrics.update(m => ({
      ...m,
      isPlaying: true,
      currentMode: 'alternate',
      currentFrequency: 440,
      panValue: -1.0,
      alternatingChannel: 'left'
    }));

    this.alternatingTimer = setInterval(runStep, 1000);
  }

  public setPan(pan: number): void {
    const clamped = Math.max(-1.0, Math.min(1.0, pan));
    this.metrics.update(m => ({ ...m, panValue: clamped }));
    if (this.pannerNode && this.audioContext) {
      this.pannerNode.pan.setValueAtTime(clamped, this.audioContext.currentTime);
    }
  }

  // ==========================================
  // Frequency & Sweep Testing
  // ==========================================

  public async playToneAtFrequency(freq: number, mode: SpeakerTestMode = 'mid'): Promise<void> {
    await this.stop();
    const ctx = await this.ensureAudioContext();

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(this.metrics().panValue, ctx.currentTime);
    }
    if (this.voiceGain) {
      // Gentle fade-in
      this.voiceGain.gain.setValueAtTime(0.001, ctx.currentTime);
      this.voiceGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.05);
      osc.connect(this.voiceGain);
    }

    osc.start();
    this.activeOscillator = osc;

    this.metrics.update(m => ({
      ...m,
      isPlaying: true,
      currentMode: mode,
      currentFrequency: freq,
      alternatingChannel: undefined
    }));
  }

  public async startFrequencySweep(durationSeconds = 12): Promise<void> {
    await this.stop();
    const ctx = await this.ensureAudioContext();

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const now = ctx.currentTime;
    const end = now + durationSeconds;

    // Logarithmic exponential sweep 20 Hz -> 20,000 Hz
    osc.frequency.setValueAtTime(20, now);
    osc.frequency.exponentialRampToValueAtTime(20000, end);

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(0, now);
    }
    if (this.voiceGain) {
      osc.connect(this.voiceGain);
    }

    osc.start();
    this.activeOscillator = osc;

    const startTime = performance.now();
    this.sweepTimer = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(100, Math.round((elapsed / durationSeconds) * 100));
      const curFreq = Math.round(20 * Math.pow(1000, elapsed / durationSeconds));

      this.metrics.update(m => ({
        ...m,
        sweepProgress: progress,
        currentFrequency: Math.min(20000, curFreq)
      }));

      if (elapsed >= durationSeconds) {
        this.stop();
      }
    }, 50);

    this.metrics.update(m => ({
      ...m,
      isPlaying: true,
      currentMode: 'sweep',
      sweepRunning: true,
      sweepProgress: 0,
      currentFrequency: 20,
      alternatingChannel: undefined
    }));
  }

  public async playNoise(type: 'white' | 'pink' | 'brown'): Promise<void> {
    await this.stop();
    const ctx = await this.ensureAudioContext();

    const bufferSize = ctx.sampleRate * 2; // 2-second looping audio buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(this.metrics().panValue, ctx.currentTime);
    }
    if (this.voiceGain) {
      noiseSource.connect(this.voiceGain);
    }

    noiseSource.start();
    this.activeNoiseNode = noiseSource;

    const mode: SpeakerTestMode = type === 'white' ? 'white-noise' : type === 'pink' ? 'pink-noise' : 'brown-noise';
    this.metrics.update(m => ({
      ...m,
      isPlaying: true,
      currentMode: mode,
      alternatingChannel: undefined
    }));
  }

  // ==========================================
  // Playback Control & Lifecycle
  // ==========================================

  public stop(): Promise<void> {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this.alternatingTimer) {
      clearInterval(this.alternatingTimer);
      this.alternatingTimer = null;
    }

    // Smooth envelope decay before disconnect to avoid click
    if (this.voiceGain && this.audioContext && this.audioContext.state === 'running') {
      try {
        this.voiceGain.gain.setValueAtTime(this.voiceGain.gain.value, this.audioContext.currentTime);
        this.voiceGain.gain.linearRampToValueAtTime(0.001, this.audioContext.currentTime + 0.03);
      } catch {}
    }

    setTimeout(() => {
      if (this.activeOscillator) {
        try {
          this.activeOscillator.stop();
          this.activeOscillator.disconnect();
        } catch {}
        this.activeOscillator = null;
      }

      if (this.activeSecondaryOsc) {
        try {
          this.activeSecondaryOsc.stop();
          this.activeSecondaryOsc.disconnect();
        } catch {}
        this.activeSecondaryOsc = null;
      }

      if (this.activeNoiseNode) {
        try {
          this.activeNoiseNode.stop();
          this.activeNoiseNode.disconnect();
        } catch {}
        this.activeNoiseNode = null;
      }
    }, 35);

    this.metrics.update(m => ({
      ...m,
      isPlaying: false,
      currentMode: 'none',
      sweepRunning: false,
      sweepProgress: 0,
      alternatingChannel: undefined
    }));

    return Promise.resolve();
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(100, volume));
    this.metrics.update(m => ({ ...m, masterVolume: clamped }));
    this.updateGain();
  }

  public toggleMute(): void {
    this.metrics.update(m => ({ ...m, isMuted: !m.isMuted }));
    this.updateGain();
  }

  private updateGain(): void {
    if (this.masterGain && this.audioContext) {
      const targetGain = this.getEffectiveGain();
      this.masterGain.gain.setValueAtTime(targetGain, this.audioContext.currentTime);
    }
  }

  private getEffectiveGain(): number {
    const { isMuted, masterVolume } = this.metrics();
    if (isMuted) return 0;
    // Logarithmic taper: conservative maximum output to protect hearing
    return (masterVolume / 100) * 0.30;
  }

  // ==========================================
  // User Confirmations & Diagnostic Summary
  // ==========================================

  public confirmResult(testKey: keyof SpeakerConfirmationStatus, isSuccess: boolean): void {
    this.metrics.update(m => {
      const updatedConfirmations: SpeakerConfirmationStatus = {
        ...m.confirmations,
        [testKey]: isSuccess
      };

      const { leftConfirmed, rightConfirmed, stereoConfirmed, frequenciesConfirmed } = updatedConfirmations;
      let verdict: SpeakerDiagnosticSummary['verdict'] = 'untested';
      let verdictTitle = 'Awaiting Channel Verification';
      let verdictDescription = 'Run the left, right, and stereo channel tests to verify audio output balance and separation.';
      let score = 0;

      const anyFailed = leftConfirmed === false || rightConfirmed === false || stereoConfirmed === false;
      const allPassed = leftConfirmed === true && rightConfirmed === true && stereoConfirmed === true;
      const freqPassed = frequenciesConfirmed === true;

      if (allPassed) {
        verdict = 'verified';
        score = freqPassed ? 100 : 90;
        verdictTitle = 'Stereo Separation Verified';
        verdictDescription = 'Left and right audio channels are correctly separated and balanced. Headphone/speaker setup is fully conference-ready.';
      } else if (anyFailed) {
        verdict = 'issue';
        score = 40;
        verdictTitle = 'Audio Channel Imbalance Detected';
        verdictDescription = 'One or more audio channels were not heard properly. Check physical cable connections, volume wheels, or system pan settings.';
      } else if (leftConfirmed !== null || rightConfirmed !== null || stereoConfirmed !== null) {
        verdict = 'partial';
        score = 60;
        verdictTitle = 'Channel Verification in Progress';
        verdictDescription = 'Complete all channel tests and confirm playback to generate an overall diagnostic verdict.';
      }

      return {
        ...m,
        confirmations: updatedConfirmations,
        diagnosticSummary: {
          ...m.diagnosticSummary,
          verdict,
          verdictTitle,
          verdictDescription,
          stereoSeparationScore: score
        }
      };
    });
  }

  public resetConfirmations(): void {
    this.metrics.update(m => ({
      ...m,
      confirmations: DEFAULT_CONFIRMATIONS,
      diagnosticSummary: DEFAULT_DIAGNOSTIC
    }));
  }
}
