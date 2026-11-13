// apps/tool-device-studio/src/components/device-studio.component.ts
import { Component, inject, input, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { DeviceStudioStateService } from '../services/device-studio-state.service';
import { DeviceStudioTab } from '../models/device.models';
import { DeviceStudioLandingComponent } from './landing/device-studio-landing.component';
import { DeviceTopBannerAdComponent, DeviceBottomBannerAdComponent, AdConfigService } from './ads';
import { WebcamModuleComponent } from './webcam/webcam-module.component';
import { MicrophoneModuleComponent } from './microphone/microphone-module.component';
import { SpeakerModuleComponent } from './speaker/speaker-module.component';
import { SpeedTestModuleComponent } from './speed/speed-test-module.component';
import { IpCheckerModuleComponent } from './ip/ip-checker-module.component';
import { ScreenShareModuleComponent } from './screen/screen-share-module.component';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-device-studio',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    DeviceStudioLandingComponent,
    DeviceTopBannerAdComponent,
    DeviceBottomBannerAdComponent,
    WebcamModuleComponent,
    MicrophoneModuleComponent,
    SpeakerModuleComponent,
    SpeedTestModuleComponent,
    IpCheckerModuleComponent,
    ScreenShareModuleComponent,
    TsIconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="device-studio-root">
      
      <!-- Top Horizontal Banner Ad (reserved placement) -->
      @if (adConfig.enableAds()) {
        <app-device-top-banner-ad />
      }

      <!-- Main Workspace Container -->
      <main class="centralized-workspace-container" role="main">
        <router-outlet #outlet="outlet" />

        <!-- Non-routed fallback for unit tests and direct embeds -->
        @if (!outlet.isActivated) {
          @switch (state.activeTab()) {
            @case ('landing') {
              <app-device-studio-landing />
            }
            @case ('webcam') {
              <app-webcam-module />
            }
            @case ('microphone') {
              <app-microphone-module />
            }
            @case ('speaker') {
              <app-speaker-module />
            }
            @case ('speed') {
              <app-speed-test-module />
            }
            @case ('ip') {
              <app-ip-checker-module />
            }
            @case ('screen') {
              <app-screen-share-module />
            }
            @default {
              <app-device-studio-landing />
            }
          }
        }
      </main>

      <!-- Bottom Horizontal Banner Ad (reserved placement) -->
      @if (adConfig.enableAds()) {
        <app-device-bottom-banner-ad />
      }

      <!-- Toast Feedback Notifications -->
      @if (state.toastMessage()) {
        <div class="studio-toast animate-slide-up" role="status" aria-live="polite">
          <ts-icon name="check" [size]="14" class="toast-icon" />
          <span class="toast-text">{{ state.toastMessage() }}</span>
        </div>
      }

    </div>
  `,
  styleUrls: ['../styles/device-studio-tokens.css'],
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) {
      color: #0F172A;
    }

    .device-studio-root {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      width: 100%;
    }

    /* Centralized Standard Workspace Container */
    .centralized-workspace-container {
      width: min(100% - 48px, 1280px);
      margin-inline: auto;
      padding: 24px 0 48px;
      box-sizing: border-box;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    @media (max-width: 640px) {
      .centralized-workspace-container {
        width: min(100% - 24px, 1280px);
        padding: 16px 0 32px;
      }
    }

    /* Studio Floating Toast */
    .studio-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--tool-accent, #3B82F6);
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      z-index: 9999;
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .studio-toast {
      background: #FFFFFF;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .toast-icon {
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .toast-icon {
      color: #2563EB;
    }

    .animate-slide-up {
      animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class DeviceStudioComponent {
  public readonly state = inject(DeviceStudioStateService);
  public readonly adConfig = inject(AdConfigService);

  public readonly externalActiveTab = input<string>();
  public readonly activeTabChange = output<string>();

  constructor() {
    effect(() => {
      const ext = this.externalActiveTab();
      if (ext && ext !== this.state.activeTab()) {
        this.state.setActiveTab(ext as DeviceStudioTab);
      }
    });

    effect(() => {
      const current = this.state.activeTab();
      this.activeTabChange.emit(current);
    });
  }
}

