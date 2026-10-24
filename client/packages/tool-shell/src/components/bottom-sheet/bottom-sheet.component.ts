// client/packages/tool-shell/src/components/bottom-sheet/bottom-sheet.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsIconComponent],
  template: `
    @if (isOpen()) {
      <div
        class="ts-sheet-backdrop"
        [class.active]="isOpen()"
        (click)="onBackdropClick()"
        aria-hidden="true"
      ></div>

      <div
        class="ts-sheet-container"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title() || ariaLabel()"
        [style.max-height]="maxHeight()"
        [style.transform]="sheetTransform()"
        [class.dragging]="isDragging()"
      >
        <!-- Drag Handle Indicator -->
        @if (showDragHandle()) {
          <div
            class="ts-sheet-handle-zone"
            (touchstart)="onTouchStart($event)"
            (touchmove)="onTouchMove($event)"
            (touchend)="onTouchEnd()"
            (touchcancel)="onTouchEnd()"
            aria-label="Drag down to close sheet"
          >
            <div class="ts-sheet-handle-bar"></div>
          </div>
        }

        <!-- Header -->
        <header
          class="ts-sheet-header"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
          (touchcancel)="onTouchEnd()"
        >
          @if (title()) {
            <h3 class="ts-sheet-title">{{ title() }}</h3>
          } @else {
            <div class="ts-sheet-spacer"></div>
          }
          <button
            type="button"
            class="ts-sheet-close-btn"
            (click)="onClose()"
            aria-label="Close bottom sheet"
          >
            <ts-icon name="x" [size]="18" />
          </button>
        </header>

        <!-- Scrollable Content -->
        <div class="ts-sheet-body custom-scrollbar">
          <ng-content />
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .ts-sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      animation: sheetFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .ts-sheet-container {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 101;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface, #1e1e24);
      color: var(--text, #fcfcfc);
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.45);
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
      overflow: hidden;
      box-sizing: border-box;
      animation: sheetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .ts-sheet-container.dragging {
      transition: none;
    }

    /* Light Theme Contrast */
    :host-context([data-theme="light"]) .ts-sheet-container,
    [data-theme="light"] .ts-sheet-container {
      background: var(--bg-surface, #ffffff);
      color: var(--text, #0f172a);
      border-top-color: var(--border, #e2e8f0);
      box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
    }

    .ts-sheet-handle-zone {
      width: 100%;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      touch-action: none;
      flex-shrink: 0;
    }

    .ts-sheet-handle-bar {
      width: 44px;
      height: 4px;
      border-radius: 9999px;
      background: var(--text-muted, #71717a);
      opacity: 0.6;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .ts-sheet-handle-zone:active .ts-sheet-handle-bar {
      opacity: 1;
      transform: scaleX(1.15);
    }

    .ts-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 16px 12px 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
      touch-action: pan-y;
    }

    .ts-sheet-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      letter-spacing: -0.01em;
    }

    .ts-sheet-spacer {
      flex: 1 1 0%;
    }

    .ts-sheet-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      min-width: 36px;
      min-height: 36px;
      border-radius: 50%;
      background: var(--bg-elevated, #282830);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #a1a1aa);
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .ts-sheet-close-btn:hover,
    .ts-sheet-close-btn:active {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface, #1e1e24);
    }

    .ts-sheet-body {
      padding: 16px;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      flex: 1 1 auto;
      max-height: calc(85vh - 90px);
    }

    @keyframes sheetFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes sheetSlideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* Mobile Performance: Disable GPU-heavy blur on phone */
    @media (max-width: 640px) {
      .ts-sheet-backdrop {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background: rgba(0, 0, 0, 0.75) !important;
      }
    }

    /* Respect reduced-motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .ts-sheet-backdrop {
        animation: none !important;
      }
      .ts-sheet-container {
        animation: none !important;
        transition: none !important;
      }
      .ts-sheet-close-btn,
      .ts-sheet-handle-bar {
        transition: none !important;
      }
    }
  `]
})
export class BottomSheetComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('');
  readonly ariaLabel = input<string>('Bottom Sheet');
  readonly maxHeight = input<string>('85vh');
  readonly showDragHandle = input<boolean>(true);
  readonly dismissOnBackdrop = input<boolean>(true);

  readonly close = output<void>();

  readonly isDragging = signal<boolean>(false);
  readonly dragOffset = signal<number>(0);

  private touchStartY = 0;

  readonly sheetTransform = computed(() => {
    const offset = this.dragOffset();
    if (offset > 0) {
      return `translateY(${offset}px)`;
    }
    return null;
  });

  @HostListener('window:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.isOpen()) {
      event.preventDefault();
      this.onClose();
    }
  }

  onBackdropClick(): void {
    if (this.dismissOnBackdrop()) {
      this.onClose();
    }
  }

  onClose(): void {
    this.dragOffset.set(0);
    this.isDragging.set(false);
    this.close.emit();
  }

  onTouchStart(e: TouchEvent): void {
    if (!e.touches.length) return;
    this.touchStartY = e.touches[0].clientY;
    this.isDragging.set(true);
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isDragging() || !e.touches.length) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - this.touchStartY;
    if (delta > 0) {
      this.dragOffset.set(delta);
    } else {
      // Rubbery resistance when dragged upwards
      this.dragOffset.set(delta * 0.15);
    }
  }

  onTouchEnd(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (this.dragOffset() > 75) {
      this.onClose();
    } else {
      this.dragOffset.set(0);
    }
  }
}
