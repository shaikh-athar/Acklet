// packages/tool-shell/src/components/tool-suite/tool-hero.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';
import { PopularChipConfig } from '../../models/tool-config.models';
import { ToolChipComponent } from './tool-chip.component';

@Component({
  selector: 'app-tool-hero',
  standalone: true,
  imports: [CommonModule, TsIconComponent, ToolChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="tool-hero-container"
      (mouseenter)="onHeroMouseEnter()"
      (mouseleave)="onHeroMouseLeave()"
      (focusin)="onHeroFocusIn()"
      (focusout)="onHeroFocusOut()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <!-- Hidden Native File Input -->
      <input
        #fileInput
        type="file"
        multiple
        [accept]="acceptedFormats()"
        class="hidden-file-input"
        (change)="onFilesPicked($event)"
        aria-hidden="true"
        tabindex="-1"
      />

      <!-- 1. Hero Stacked Grid Rotating Headline (h1) -->
      <h1 class="hero-headline-wrap" aria-live="polite">
        <div class="tool-headline-stacked-grid">
          @for (line of headlines(); track line; let idx = $index) {
            <span
              class="tool-headline-line"
              [class.is-active]="activeHeadlineIndex() === idx"
              [class.is-exiting]="exitingHeadlineIndex() === idx"
            >
              {{ line }}
            </span>
          }
        </div>
      </h1>

      <!-- 2. Hero Drop Area Boundary with Button and Helper -->
      <div
        class="hero-drop-stage"
        [class.is-drag-over]="isDragOver()"
        (click)="openFilePicker()"
      >
        <button
          type="button"
          class="hero-primary-select-btn"
          (click)="$event.stopPropagation(); openFilePicker()"
          [attr.aria-label]="'Select files for ' + toolName()"
        >
          <ts-icon name="plus" [size]="16" class="btn-icon" />
          <span>Select files</span>
        </button>

        <p class="hero-subtitle-line">or drop your files directly here</p>
        <p class="hero-formats-helper">Works with {{ formatsHelper() }}.</p>
      </div>

      <!-- 3. Popular Section with Canonical Label & Staggered Chips -->
      @if (popularChips().length > 0) {
        <div class="hero-popular-section">
          <span class="hero-popular-label">POPULAR {{ popularNoun() | uppercase }}</span>
          <div class="tool-chips-grid" role="group" [attr.aria-label]="'Popular ' + popularNoun()">
            @for (chip of popularChips(); track chip.label; let idx = $index) {
              <div class="tool-chip-item" [style.--chip-index]="idx">
                <app-tool-chip
                  [label]="chip.label"
                  (clicked)="popularChipSelected.emit(chip)"
                />
              </div>
            }
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tool-hero-container {
      max-width: 720px;
      width: 100%;
      margin: 0 auto;
      padding: var(--tool-space-32, 32px) var(--tool-space-16, 16px) var(--tool-space-48, 48px);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-sizing: border-box;
      font-family: var(--tool-font-family, inherit);
    }

    .hidden-file-input {
      display: none;
    }

    /* ── 1. Hero Headline (h1) ── */
    .hero-headline-wrap {
      margin: 0 0 var(--tool-space-24, 24px) 0;
      width: 100%;
      min-height: calc(var(--tool-type-display-lh, 56px) * 2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tool-headline-stacked-grid {
      display: grid;
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
      align-items: center;
      justify-items: center;
      width: 100%;
    }

    .tool-headline-line {
      grid-area: 1 / 1 / 2 / 2;
      width: 100%;
      font-size: var(--tool-type-display-size, 48px);
      line-height: var(--tool-type-display-lh, 56px);
      font-weight: var(--tool-type-display-weight, 700);
      letter-spacing: var(--tool-type-display-tracking, -0.02em);
      color: var(--text, #0F172A);
      opacity: 0;
      visibility: hidden;
      filter: blur(6px);
      transform: translateY(6px);
      transition: opacity 700ms cubic-bezier(0.2, 0.6, 0.2, 1),
                  filter 700ms cubic-bezier(0.2, 0.6, 0.2, 1),
                  transform 700ms cubic-bezier(0.2, 0.6, 0.2, 1),
                  visibility 700ms cubic-bezier(0.2, 0.6, 0.2, 1);
      pointer-events: none;
    }

    :host-context([data-theme="dark"]) .tool-headline-line,
    [data-theme="dark"] .tool-headline-line {
      color: #F8FAFC;
    }

    .tool-headline-line.is-active {
      opacity: 1;
      visibility: visible;
      filter: blur(0);
      transform: translateY(0);
      pointer-events: auto;
    }

    .tool-headline-line.is-exiting {
      opacity: 0;
      visibility: hidden;
      filter: blur(6px);
      transform: translateY(-6px);
    }

    /* ── 2. Hero Drop Stage ── */
    .hero-drop-stage {
      width: 100%;
      max-width: 520px;
      padding: var(--tool-space-32, 32px) var(--tool-space-24, 24px);
      border: 2px dashed var(--border-subtle, #CBD5E1);
      border-radius: var(--tool-radius-panel, 20px);
      background: var(--ts-surface-raised, rgba(255, 255, 255, 0.6));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      box-sizing: border-box;
      transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .hero-drop-stage,
    [data-theme="dark"] .hero-drop-stage {
      background: rgba(24, 24, 27, 0.4);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .hero-drop-stage:hover,
    .hero-drop-stage.is-drag-over {
      border-color: var(--tool-accent, #2563EB);
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.05));
      transform: translateY(-2px);
    }

    .hero-primary-select-btn {
      height: var(--tool-cta-height, 48px);
      padding: 0 32px;
      border-radius: var(--tool-radius-pill, 999px);
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-family: var(--tool-font-family, inherit);
      font-size: 15px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .hero-primary-select-btn:hover {
      filter: brightness(1.08);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .hero-primary-select-btn:active {
      transform: translateY(0);
    }

    .hero-subtitle-line {
      font-size: 13.5px;
      color: var(--text-muted, #64748B);
      margin: 0;
    }

    .hero-formats-helper {
      font-size: 12.5px;
      color: var(--text-muted, #94A3B8);
      margin: 0;
    }

    /* ── 3. Popular Section ── */
    .hero-popular-section {
      margin-top: var(--tool-space-32, 32px);
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .hero-popular-label {
      font-size: var(--tool-type-label-size, 12px);
      line-height: var(--tool-type-label-lh, 16px);
      font-weight: var(--tool-type-label-weight, 600);
      letter-spacing: var(--tool-type-label-tracking, 0.06em);
      text-transform: uppercase;
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .hero-popular-label,
    [data-theme="dark"] .hero-popular-label {
      color: #A1A1AA;
    }

    .tool-chips-grid {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 8px;
      max-width: 600px;
    }

    .tool-chip-item {
      opacity: 0;
      animation: toolChipFadeIn 500ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards;
      animation-delay: calc(var(--chip-index, 0) * 40ms);
    }

    @keyframes toolChipFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 600px) {
      .hero-headline-wrap {
        min-height: calc(var(--tool-type-display-mobile-lh, 40px) * 2);
      }
      .tool-headline-line {
        font-size: var(--tool-type-display-mobile-size, 32px);
        line-height: var(--tool-type-display-mobile-lh, 40px);
      }
      .hero-primary-select-btn {
        width: 100%;
        justify-content: center;
      }
      .tool-chips-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        width: 100%;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .tool-headline-line {
        transition: none !important;
        filter: none !important;
        transform: none !important;
      }
      .tool-headline-line:not(:first-child) {
        display: none !important;
      }
      .tool-headline-line:first-child {
        opacity: 1 !important;
        visibility: visible !important;
        filter: none !important;
        transform: none !important;
      }
      .tool-chip-item {
        animation: none !important;
        opacity: 1 !important;
      }
    }
  `]
})
export class ToolHeroComponent implements OnInit, OnDestroy {
  readonly toolName = input.required<string>();
  readonly headlines = input.required<string[]>();
  readonly acceptedFormats = input<string>('*');
  readonly formatsHelper = input<string>('PNG, JPG, WebP, AVIF and more');
  readonly popularChips = input<PopularChipConfig[]>([]);
  readonly popularNoun = input<string>('CONVERSIONS');
  readonly hasFiles = input<boolean>(false);

  readonly filesSelected = output<FileList | File[]>();
  readonly popularChipSelected = output<PopularChipConfig>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly activeHeadlineIndex = signal(0);
  readonly exitingHeadlineIndex = signal<number | null>(null);
  readonly isPaused = signal(false);
  readonly isDragOver = signal(false);

  private rotationTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startRotationTimer();
  }

  ngOnDestroy(): void {
    this.clearRotationTimer();
  }

  private startRotationTimer(): void {
    this.clearRotationTimer();
    if (typeof window === 'undefined') return;

    this.rotationTimer = setInterval(() => {
      if (this.isPaused() || this.hasFiles() || this.headlines().length <= 1) {
        return;
      }
      const prev = this.activeHeadlineIndex();
      const next = (prev + 1) % this.headlines().length;
      this.exitingHeadlineIndex.set(prev);
      this.activeHeadlineIndex.set(next);

      setTimeout(() => {
        if (this.exitingHeadlineIndex() === prev) {
          this.exitingHeadlineIndex.set(null);
        }
      }, 700);
    }, 4500);
  }

  private clearRotationTimer(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  onHeroMouseEnter(): void {
    this.isPaused.set(true);
  }

  onHeroMouseLeave(): void {
    this.isPaused.set(false);
  }

  onHeroFocusIn(): void {
    this.isPaused.set(true);
  }

  onHeroFocusOut(): void {
    this.isPaused.set(false);
  }

  openFilePicker(): void {
    const inputEl = this.fileInput()?.nativeElement;
    if (inputEl) {
      inputEl.value = '';
      inputEl.click();
    }
  }

  onFilesPicked(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.filesSelected.emit(target.files);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.filesSelected.emit(event.dataTransfer.files);
    }
  }
}
