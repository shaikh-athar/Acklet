// apps/tool-device-studio/src/services/device-studio-state.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { DeviceStudioTab, MeetingReadinessResult } from '../models/device.models';

export function routeToModule(pathname: string): DeviceStudioTab {
  const clean = pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (
    clean === 'devicestudio' || 
    clean === 'device-studio' || 
    clean === 'tools/devicestudio' || 
    clean === 'tools/device-studio' || 
    clean === 'landing' ||
    clean === ''
  ) {
    return 'landing';
  }

  const parts = clean.split('/');
  const last = parts[parts.length - 1];

  switch (last) {
    case 'webcam':
    case 'webcam-test':
    case 'camera':
      return 'webcam';
    case 'microphone':
    case 'mic-test':
    case 'microphone-test':
    case 'mic':
      return 'microphone';
    case 'speaker':
    case 'speaker-test':
    case 'audio-test':
    case 'audio':
      return 'speaker';
    case 'speed':
    case 'speed-test':
      return 'speed';
    case 'ip':
    case 'ip-lookup':
    case 'ip-checker':
      return 'ip';
    case 'screen':
    case 'screen-test':
    case 'screenshare-test':
      return 'screen';
    case 'history':
    case 'reports':
    case 'diagnostic-history':
      return 'history';
    default:
      return 'landing';
  }
}

export function moduleToRoute(tab: DeviceStudioTab): string {
  switch (tab) {
    case 'webcam': return 'webcam';
    case 'microphone': return 'microphone';
    case 'speaker': return 'speaker';
    case 'speed': return 'speed';
    case 'ip': return 'ip';
    case 'screen': return 'screen';
    case 'history': return 'history';
    case 'landing':
    default:
      return '';
  }
}

@Injectable({
  providedIn: 'root'
})
export class DeviceStudioStateService {
  private readonly _activeTab = signal<DeviceStudioTab>('landing');
  private readonly _toastMessage = signal<string | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Test completion flags to drive the live Device Health Score
  public readonly webcamTested = signal<boolean>(false);
  public readonly micTested = signal<boolean>(false);
  public readonly speakerTested = signal<boolean>(false);
  public readonly speedTested = signal<boolean>(false);
  public readonly ipTested = signal<boolean>(false);
  public readonly screenTested = signal<boolean>(false);

  // Meeting Readiness State
  public readonly meetingReadiness = signal<MeetingReadinessResult>({
    camera: 'pending',
    mic: 'pending',
    speaker: 'pending',
    network: 'pending',
    screenShare: 'pending',
    overallScore: 0,
    summaryText: 'Click "Start Meeting Readiness Audit" to run a complete diagnostic.',
    appsReadiness: {
      zoom: false,
      meet: false,
      teams: false,
      webex: false
    }
  });

  public readonly activeTab = this._activeTab.asReadonly();
  public readonly toastMessage = this._toastMessage.asReadonly();

  // Dynamic Device Health Score (0 - 100)
  public readonly deviceHealthScore = computed(() => {
    let score = 20; // Base score for modern browser support
    if (this.webcamTested()) score += 15;
    if (this.micTested()) score += 15;
    if (this.speakerTested()) score += 15;
    if (this.speedTested()) score += 15;
    if (this.ipTested()) score += 10;
    if (this.screenTested()) score += 10;
    return Math.min(100, score);
  });

  public setActiveTab(tab: DeviceStudioTab): void {
    this._activeTab.set(tab);
  }

  public setActiveModule(tab: DeviceStudioTab): void {
    this.setActiveTab(tab);
  }

  public showToast(message: string, durationMs = 3000): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this._toastMessage.set(message);
    this.toastTimer = setTimeout(() => {
      this._toastMessage.set(null);
      this.toastTimer = null;
    }, durationMs);
  }

  public markModuleTested(module: 'webcam' | 'microphone' | 'speaker' | 'speed' | 'ip' | 'screen'): void {
    switch (module) {
      case 'webcam': this.webcamTested.set(true); break;
      case 'microphone': this.micTested.set(true); break;
      case 'speaker': this.speakerTested.set(true); break;
      case 'speed': this.speedTested.set(true); break;
      case 'ip': this.ipTested.set(true); break;
      case 'screen': this.screenTested.set(true); break;
    }
  }
}

