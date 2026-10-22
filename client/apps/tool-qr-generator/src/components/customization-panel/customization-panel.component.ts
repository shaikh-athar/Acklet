// client/apps/tool-qr-generator/src/components/customization-panel/customization-panel.component.ts
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ErrorCorrectionLevel,
  QrDotType,
  QrCornerSquareType,
  QrCornerDotType,
  DesignPreset,
  QrFrameOptions,
  DEFAULT_FRAME_OPTIONS
} from '../../models/qr-generator.models';
import { ColorCustomizerComponent } from '../color-customizer/color-customizer.component';
import { SizeSliderComponent } from '../size-slider/size-slider.component';
import { ErrorCorrectionSelectorComponent } from '../error-correction-selector/error-correction-selector.component';
import { DesignCustomizerComponent } from '../design-customizer/design-customizer.component';
import { TsIconComponent, HlmBadge } from '@acklet/tool-shell';

@Component({
  selector: 'app-qr-customization-panel',
  standalone: true,
  imports: [
    CommonModule,
    ColorCustomizerComponent,
    SizeSliderComponent,
    ErrorCorrectionSelectorComponent,
    DesignCustomizerComponent,
    TsIconComponent,
    HlmBadge
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-card qr-customization-card">
      <!-- Section Header -->
      <div class="qr-card-header">
        <div class="header-title-group">
          <ts-icon name="sliders" class="header-icon" />
          <h2 class="qr-card-title">Customization & Export Settings</h2>
        </div>
        <span hlmBadge variant="outline" class="qr-custom-badge">
          SVG / PNG / JPEG
        </span>
      </div>

      <!-- Segment Tabs (General vs Design) -->
      <div class="customizer-tabs" role="tablist" aria-label="Customization Categories">
        <button
          type="button"
          role="tab"
          class="customizer-tab"
          [class.active]="activeTab() === 'general'"
          [attr.aria-selected]="activeTab() === 'general'"
          (click)="activeTab.set('general')"
        >
          <ts-icon name="palette" class="tab-icon" />
          <span>Colors & Sizing</span>
        </button>
        <button
          type="button"
          role="tab"
          class="customizer-tab"
          [class.active]="activeTab() === 'design'"
          [attr.aria-selected]="activeTab() === 'design'"
          (click)="activeTab.set('design')"
        >
          <ts-icon name="sparkles" class="tab-icon" />
          <span>Shapes & Branding</span>
          @if (hasCustomDesign()) {
            <span class="active-dot"></span>
          }
        </button>
      </div>

      <!-- TAB 1: General (Colors, Size, Error Correction) -->
      @if (activeTab() === 'general') {
        <div class="tab-content">
          <app-color-customizer
            [foregroundColor]="foregroundColor()"
            [backgroundColor]="backgroundColor()"
            (foregroundColorChange)="foregroundColorChange.emit($event)"
            (backgroundColorChange)="backgroundColorChange.emit($event)"
          />

          <hr class="section-divider" />

          <app-size-slider
            [size]="size()"
            (sizeChange)="sizeChange.emit($event)"
          />

          <hr class="section-divider" />

          <app-error-correction-selector
            [errorCorrection]="errorCorrection()"
            (errorCorrectionChange)="errorCorrectionChange.emit($event)"
          />
        </div>
      }

      <!-- TAB 2: Design (Shapes, Corner Dot/Square, Logo) -->
      @if (activeTab() === 'design') {
        <div class="tab-content">
          <app-qr-design-customizer
            [dotType]="dotType()"
            [cornerSquareType]="cornerSquareType()"
            [cornerDotType]="cornerDotType()"
            [foregroundColor]="foregroundColor()"
            [cornerSquareColor]="cornerSquareColor()"
            [cornerDotColor]="cornerDotColor()"
            [logo]="logo()"
            [logoSize]="logoSize()"
            [logoMargin]="logoMargin()"
            [frame]="frame()"
            (dotTypeChange)="dotTypeChange.emit($event)"
            (cornerSquareTypeChange)="cornerSquareTypeChange.emit($event)"
            (cornerDotTypeChange)="cornerDotTypeChange.emit($event)"
            (cornerSquareColorChange)="cornerSquareColorChange.emit($event)"
            (cornerDotColorChange)="cornerDotColorChange.emit($event)"
            (logoChange)="logoChange.emit($event)"
            (logoSizeChange)="logoSizeChange.emit($event)"
            (logoMarginChange)="logoMarginChange.emit($event)"
            (frameChange)="frameChange.emit($event)"
            (presetApply)="presetApply.emit($event)"
          />
        </div>
      }
    </div>
  `,
  styles: [`
    .qr-card {
      background: var(--ts-surface, var(--surface, #1e2027));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .qr-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      padding-bottom: 0.875rem;
    }

    .header-title-group {
      display: flex;
      align-items: center;
      gap: 0.625rem;
    }

    .header-icon {
      color: var(--accent, #3b82f6);
      width: 1.25rem;
      height: 1.25rem;
    }

    .qr-card-title {
      font-size: 1.125rem;
      font-weight: 650;
      color: var(--text, #fcfcfc);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .qr-custom-badge {
      font-size: 0.75rem;
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--text-2, rgba(255, 255, 255, 0.75));
    }

    /* Sub Tabs */
    .customizer-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.375rem;
      background: var(--surface-2, rgba(0, 0, 0, 0.2));
      padding: 0.3125rem;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .customizer-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      font-size: 0.8125rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      position: relative;
    }

    .customizer-tab:hover:not(.active) {
      color: var(--text, #fcfcfc);
    }

    .customizer-tab.active {
      background: var(--surface, #1e2027);
      color: var(--accent-strong, #60a5fa);
      font-weight: 600;
      border: 1px solid var(--accent-border, rgba(59, 130, 246, 0.3));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }

    .tab-icon {
      width: 0.95rem;
      height: 0.95rem;
    }

    .active-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent, #3b82f6);
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.125rem;
    }

    .section-divider {
      border: none;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      margin: 0.125rem 0;
    }
  `]
})
export class CustomizationPanelComponent {
  readonly foregroundColor = input<string>('#000000');
  readonly backgroundColor = input<string>('#FFFFFF');
  readonly size = input<number>(300);
  readonly errorCorrection = input<ErrorCorrectionLevel>('M');

  // Design Inputs
  readonly dotType = input<QrDotType>('square');
  readonly cornerSquareType = input<QrCornerSquareType>('square');
  readonly cornerDotType = input<QrCornerDotType>('square');
  readonly cornerSquareColor = input<string | null>(null);
  readonly cornerDotColor = input<string | null>(null);
  readonly logo = input<string | null>(null);
  readonly logoSize = input<number>(0.35);
  readonly logoMargin = input<number>(4);
  readonly frame = input<QrFrameOptions>(DEFAULT_FRAME_OPTIONS);

  // General Outputs
  readonly foregroundColorChange = output<string>();
  readonly backgroundColorChange = output<string>();
  readonly sizeChange = output<number>();
  readonly errorCorrectionChange = output<ErrorCorrectionLevel>();

  // Design Outputs
  readonly dotTypeChange = output<QrDotType>();
  readonly cornerSquareTypeChange = output<QrCornerSquareType>();
  readonly cornerDotTypeChange = output<QrCornerDotType>();
  readonly cornerSquareColorChange = output<string | null>();
  readonly cornerDotColorChange = output<string | null>();
  readonly logoChange = output<string | null>();
  readonly logoSizeChange = output<number>();
  readonly logoMarginChange = output<number>();
  readonly frameChange = output<QrFrameOptions>();
  readonly presetApply = output<DesignPreset>();

  readonly activeTab = signal<'general' | 'design'>('general');

  hasCustomDesign(): boolean {
    return (
      this.dotType() !== 'square' ||
      this.cornerSquareType() !== 'square' ||
      this.cornerDotType() !== 'square' ||
      !!this.cornerSquareColor() ||
      !!this.cornerDotColor() ||
      !!this.logo() ||
      this.frame().style !== 'none'
    );
  }
}
