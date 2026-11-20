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

export function resetDeviceStudioScroll(): void {
  if (typeof window === 'undefined') return;

  if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
    try {
      history.scrollRestoration = 'manual';
    } catch {
      // ignore
    }
  }

  // Blur any active element outside the body so focus retention doesn't pull scroll down
  if (typeof document !== 'undefined' && document.activeElement && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    try {
      document.activeElement.blur();
    } catch {
      // ignore
    }
  }

  const perform = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }

    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
      document.scrollingElement.scrollLeft = 0;
    }
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    const containers = document.querySelectorAll<HTMLElement>(
      '.ts-main-scroll-container, .centralized-workspace-container, .device-studio-root, #main-content, main.tool-center-column, .tool-viewport, [role="main"]'
    );
    containers.forEach(c => {
      c.style.setProperty('scroll-behavior', 'auto', 'important');
      c.scrollTop = 0;
      c.scrollLeft = 0;
      try {
        c.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      } catch {
        // fallback
      }
    });
  };

  perform();
  requestAnimationFrame(() => {
    perform();
    requestAnimationFrame(perform);
  });
  setTimeout(perform, 25);
  setTimeout(perform, 80);
  setTimeout(perform, 200);
  setTimeout(perform, 400);

  // Clean up inline scroll-behavior override after the entire reset cycle finishes
  setTimeout(() => {
    const containers = document.querySelectorAll<HTMLElement>(
      '.ts-main-scroll-container, .centralized-workspace-container, .device-studio-root, #main-content, main.tool-center-column, .tool-viewport, [role="main"]'
    );
    containers.forEach(c => {
      c.style.removeProperty('scroll-behavior');
    });
  }, 500);
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
    camera: 'untested',
    cameraDetail: 'Not tested',
    mic: 'untested',
    micDetail: 'Not tested',
    speaker: 'untested',
    speakerDetail: 'Not tested',
    network: 'untested',
    networkDetail: 'Not tested',
    screenShare: 'untested',
    screenShareDetail: 'Not tested',
    overallScore: 0,
    summaryText: 'Click "Run Quick Check" to run a complete diagnostic.',
    appsReadiness: {
      zoom: false,
      meet: false,
      teams: false,
      webex: false
    }
  });

  public readonly activeTab = this._activeTab.asReadonly();
  public readonly toastMessage = this._toastMessage.asReadonly();

  // Overall status based on component states
  public readonly overallStatus = computed<string>(() => {
    const mr = this.meetingReadiness();
    const states = [mr.camera, mr.mic, mr.speaker, mr.network, mr.screenShare];
    if (states.some(s => s === 'fail')) {
      return 'Needs attention';
    }
    if (states.some(s => s === 'warn')) {
      return 'Some issues';
    }
    return 'All clear';
  });

  // Dynamic Device Health Score (PASS = 100, WARNING = 50, FAIL = 0, untested excluded)
  public readonly deviceHealthScore = computed(() => {
    const mr = this.meetingReadiness();
    const states = [mr.camera, mr.mic, mr.speaker, mr.network, mr.screenShare];

    let total = 0;
    let count = 0;
    let hasWarn = false;
    let hasFail = false;

    for (const s of states) {
      if (s === 'pass') {
        total += 100;
        count++;
      } else if (s === 'warn') {
        total += 50;
        count++;
        hasWarn = true;
      } else if (s === 'fail') {
        total += 0;
        count++;
        hasFail = true;
      }
      // 'untested', 'pending', 'detected' are excluded
    }

    if (count === 0) {
      return 100;
    }

    let score = Math.round(total / count);
    if ((hasWarn || hasFail) && score >= 100) {
      score = 90;
    }
    return score;
  });

  public setActiveTab(tab: DeviceStudioTab): void {
    this._activeTab.set(tab);
    resetDeviceStudioScroll();
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
      case 'webcam':
        this.webcamTested.set(true);
        this.meetingReadiness.update(mr => {
          if (mr.camera !== 'fail' && mr.camera !== 'warn') {
            return { ...mr, camera: 'pass', cameraDetail: 'Verified live stream' };
          }
          return mr;
        });
        break;
      case 'microphone':
        this.micTested.set(true);
        this.meetingReadiness.update(mr => {
          if (mr.mic !== 'fail' && mr.mic !== 'warn') {
            return { ...mr, mic: 'pass', micDetail: 'Verified microphone input' };
          }
          return mr;
        });
        break;
      case 'speaker':
        this.speakerTested.set(true);
        this.meetingReadiness.update(mr => {
          if (mr.speaker !== 'fail' && mr.speaker !== 'warn') {
            return { ...mr, speaker: 'pass', speakerDetail: 'Audio verified' };
          }
          return mr;
        });
        break;
      case 'speed':
        this.speedTested.set(true);
        break;
      case 'ip':
        this.ipTested.set(true);
        break;
      case 'screen':
        this.screenTested.set(true);
        this.meetingReadiness.update(mr => {
          if (mr.screenShare !== 'fail' && mr.screenShare !== 'warn') {
            return { ...mr, screenShare: 'pass', screenShareDetail: 'Screen share verified' };
          }
          return mr;
        });
        break;
    }
  }
}

