// apps/tool-color-studio/src/components/color-studio.component.ts
import { Component, inject, input, output, effect, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { ColorStudioStateService } from '../services/color-studio-state.service';
import { ColorStudioTab } from '../models/color.models';
import { ColorStudioLandingComponent } from './landing/color-studio-landing.component';
import { TopBannerAdComponent, BottomBannerAdComponent, AdConfigService } from './ads';
import { ColorPickerModuleComponent } from './picker/color-picker-module.component';
import { ImageExtractorModuleComponent } from './extractor/image-extractor-module.component';
import { GradientModuleComponent } from './gradient/gradient-module.component';
import { ContrastModuleComponent } from './contrast/contrast-module.component';
import { PaletteModuleComponent } from './palette/palette-module.component';
import { SimulatorModuleComponent } from './simulator/simulator-module.component';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-color-studio',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ColorStudioLandingComponent,
    TopBannerAdComponent,
    BottomBannerAdComponent,
    ColorPickerModuleComponent,
    ImageExtractorModuleComponent,
    GradientModuleComponent,
    ContrastModuleComponent,
    PaletteModuleComponent,
    SimulatorModuleComponent,
    TsIconComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="color-studio-root">

      <!-- Top Horizontal Banner Ad (Rendered only when ads are enabled in future) -->
      @if (adConfig.enableAds()) {
        <app-top-banner-ad />
      }

      <!-- Centralized Main Workspace Container (Standardized Centered Layout) -->
      <main class="centralized-workspace-container" role="main">
        <router-outlet #outlet="outlet" />

        <!-- Non-routed fallback for unit tests and direct embeds -->
        @if (!outlet.isActivated) {
          @switch (state.activeTab()) {
            @case ('landing') {
              <app-color-studio-landing />
            }
            @case ('picker') {
              <app-color-picker-module />
            }
            @case ('extractor') {
              <app-image-extractor-module />
            }
            @case ('gradient') {
              <app-gradient-module />
            }
            @case ('contrast') {
              <app-contrast-module />
            }
            @case ('palette') {
              <app-palette-module />
            }
            @case ('simulator') {
              <app-simulator-module />
            }
            @default {
              <app-color-studio-landing />
            }
          }
        }
      </main>

      <!-- Bottom Horizontal Banner Ad (Rendered only when ads are enabled in future) -->
      @if (adConfig.enableAds()) {
        <app-bottom-banner-ad />
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

    .color-studio-root {
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

    @media (max-width: 1024px) {
      .centralized-workspace-container {
        width: min(100% - 40px, 1280px);
        padding: 20px 0 40px;
      }
    }

    @media (max-width: 768px) {
      .centralized-workspace-container {
        width: min(100% - 32px, 100%);
        padding: 16px 0 32px;
      }
    }

    @media (max-width: 639px) {
      .centralized-workspace-container {
        width: calc(100% - 32px);
        padding: 12px 0 24px;
      }

      .studio-toast {
        left: 16px;
        right: 16px;
        bottom: 16px;
        justify-content: center;
      }
    }

    /* Toast Notification */
    .studio-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--bg-surface, #18181B);
      border: 1px solid var(--border-default, #27272A);
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      z-index: 9999;
    }

    :host-context([data-theme="light"]) .studio-toast {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }

    .toast-icon {
      color: var(--tool-accent, #2563EB);
    }

    .toast-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .toast-text {
      color: #0F172A;
    }

    @keyframes slideUp {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .animate-slide-up {
      animation: slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class ColorStudioComponent {
  public state = inject(ColorStudioStateService);
  public adConfig = inject(AdConfigService);
  private router = inject(Router, { optional: true });

  public externalActiveTab = input<string | undefined>();
  public activeTabChange = output<ColorStudioTab>();

  public isLanding = computed(() => {
    return this.state.activeTab() === 'landing';
  });

  constructor() {
    effect(() => {
      const ext = this.externalActiveTab();
      if (ext && this.isKnownTab(ext) && ext !== this.state.activeTab()) {
        this.state.setActiveTab(ext as ColorStudioTab);
      }
    });

    effect(() => {
      const current = this.state.activeTab();
      this.activeTabChange.emit(current);
    });
  }

  private isKnownTab(tab: string): boolean {
    return ['landing', 'picker', 'extractor', 'gradient', 'contrast', 'palette', 'simulator'].includes(tab);
  }
}
