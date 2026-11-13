// apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts
import { Component, ChangeDetectionStrategy, output, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { RotatingHeadingComponent } from '../rotating-heading/rotating-heading.component';
import { DeveloperPresetKey } from '../../models/compressor.models';
import { COMPRESSOR_CONFIG } from '../../config/compressor.config';
import { HERO_LINES } from '../../config/hero-lines.config';

export interface PopularPresetChip {
  key: DeveloperPresetKey;
  label: string;
}

@Component({
  selector: 'app-upload-landing',
  standalone: true,
  imports: [CommonModule, TsIconComponent, RotatingHeadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-hero-area">
      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg,.heic,.heif"
        class="hidden-file-input"
        (change)="onFileSelected($event)"
        aria-hidden="true"
        tabindex="-1"
      />

      <!-- 1. Single Rotating Hero Headline -->
      <app-rotating-heading
        [lines]="heroLines"
        [interval]="5000"
        class="hero-rotating-heading"
      ></app-rotating-heading>

      <!-- 2. Primary Choose Button & Tagline -->
      <div class="hero-action-group">
        <button
          type="button"
          class="hero-select-btn"
          (click)="openFilePicker()"
          aria-label="Choose images to compress"
        >
          <ts-icon name="plus" [size]="16" class="btn-icon" />
          <span>Choose images</span>
        </button>
        <p class="hero-subtitle">Works with PNG, JPG, WebP, AVIF, HEIC and other.</p>
      </div>

      <!-- 3. Simplified Popular Presets Section -->
      <div class="popular-section" role="region" aria-label="Popular compressions">
        <span class="popular-section-label">Popular compressions for </span>
        <div class="popular-grid">
          @for (chip of popularChips; track chip.key) {
            <button
              type="button"
              class="popular-chip-btn"
              (click)="onSelectChip(chip.key)"
              [title]="'Apply ' + chip.label + ' preset and choose images'"
              [attr.aria-label]="chip.label + ' compression preset'"
            >
              <span class="popular-chip-name">{{ chip.label }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .landing-hero-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: calc(100vh - 180px);
      text-align: center;
      box-sizing: border-box;
      padding: 32px 16px 48px;
    }

    .hidden-file-input {
      display: none;
    }

    /* 1. Hero Headline */
    .hero-rotating-heading {
      margin-bottom: 24px;
    }

    /* 2. Primary Select Button & Tagline */
    .hero-action-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      margin-bottom: 32px;
    }

    .hero-select-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 46px;
      padding: 0 28px;
      border-radius: 9999px;
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .hero-select-btn:hover {
      background: #1D4ED8;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .hero-select-btn:active {
      transform: translateY(0);
    }

    .hero-select-btn:focus-visible {
      outline: 2px solid var(--accent, #2563EB);
      outline-offset: 3px;
    }

    .btn-icon {
      flex-shrink: 0;
    }

    .hero-subtitle {
      font-size: 13.5px;
      color: #64748B;
      margin: 0;
      letter-spacing: -0.01em;
      max-width: 600px;
      line-height: 1.4;
    }

    :host-context([data-theme="dark"]) .hero-subtitle,
    [data-theme="dark"] :host .hero-subtitle,
    [data-theme="dark"] .hero-subtitle {
      color: #94A3B8;
    }

    /* 3. Simplified Popular Presets Section */
    .popular-section {
      width: 100%;
      max-width: 580px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .popular-section-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748B;
      user-select: none;
    }

    :host-context([data-theme="dark"]) .popular-section-label,
    [data-theme="dark"] :host .popular-section-label,
    [data-theme="dark"] .popular-section-label {
      color: #A1A1AA;
    }

    .popular-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      width: 100%;
      padding: 4px;
      box-sizing: border-box;
    }

    .popular-chip-btn {
      height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border-radius: 9999px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #1E293B;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
      user-select: none;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .popular-chip-btn,
    [data-theme="dark"] :host .popular-chip-btn,
    [data-theme="dark"] .popular-chip-btn {
      background: var(--ts-surface-raised, #18181B);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: #F8FAFC;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .popular-chip-btn:hover {
      border-color: var(--accent, #2563EB);
      color: var(--accent, #2563EB);
      background: rgba(37, 99, 235, 0.04);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .popular-chip-btn:hover,
    [data-theme="dark"] .popular-chip-btn:hover {
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #3B82F6);
      background: rgba(59, 130, 246, 0.12);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }

    .popular-chip-btn:focus-visible {
      outline: 2px solid var(--accent, #2563EB);
      outline-offset: 2px;
    }

    :host-context([data-theme="dark"]) .popular-chip-btn:focus-visible,
    [data-theme="dark"] .popular-chip-btn:focus-visible {
      outline-color: var(--accent, #3B82F6);
    }

    .popular-chip-name {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: inherit;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      .landing-hero-area {
        padding: 24px 12px 36px;
      }
      .popular-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .popular-chip-btn {
        height: 38px;
        padding: 0 12px;
      }
      .popular-chip-name {
        font-size: 12px;
      }
      .hero-select-btn {
        width: 100%;
        max-width: 280px;
      }
    }
  `]
})
export class UploadLandingComponent {
  readonly config = COMPRESSOR_CONFIG;
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly filesSelected = output<FileList | File[]>();
  readonly examplePresetSelected = output<DeveloperPresetKey>();

  readonly heroLines = HERO_LINES;

  readonly popularChips: PopularPresetChip[] = [
    { key: 'website', label: 'Website' },
    { key: 'blog', label: 'Blog post' },
    { key: 'ecommerce', label: 'Online store' },
    { key: 'social', label: 'Social post' },
    { key: 'thumbnails', label: 'Thumbnail' },
    { key: 'retina', label: 'Retina display' }
  ];

  openFilePicker(): void {
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.filesSelected.emit(target.files);
    }
  }

  onSelectChip(presetKey: DeveloperPresetKey): void {
    this.examplePresetSelected.emit(presetKey);
    this.openFilePicker();
  }
}
