// apps/tool-image-compressor/src/components/preview-modal/preview-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as image) {
      <div
        class="modal-backdrop"
        (click)="close.emit()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Preview ' + image.originalName"
      >
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-info">
              <span class="format-pill font-mono">{{ image.originalExtension | uppercase }}</span>
              <h3 class="modal-title" [title]="image.originalName">{{ image.originalName }}</h3>
            </div>

            <div class="header-actions">
              <span class="index-indicator font-mono">
                {{ currentIndex() + 1 }} / {{ totalImages() }}
              </span>
              <button
                type="button"
                class="icon-close-btn"
                (click)="close.emit()"
                aria-label="Close image preview"
              >
                <ts-icon name="x" [size]="18" />
              </button>
            </div>
          </div>

          <!-- Image Display Stage with Navigation Arrows -->
          <div class="stage-container">
            <!-- Prev Button -->
            @if (totalImages() > 1) {
              <button
                type="button"
                class="nav-arrow-btn prev-btn"
                (click)="prev.emit()"
                aria-label="Previous image"
                title="Previous image (Left arrow)"
              >
                <ts-icon name="chevron-left" [size]="20" />
              </button>
            }

            <div class="image-viewport">
              @if (image.status === 'corrupted' || !image.capabilities.previewSupported) {
                <div class="preview-error-state">
                  <ts-icon name="alert-triangle" [size]="48" class="error-icon" />
                  <h4>Preview Unavailable</h4>
                  <p>{{ image.error || 'This format cannot be previewed directly in the browser.' }}</p>
                </div>
              } @else {
                <img
                  [src]="image.previewUrl"
                  [alt]="image.originalName"
                  class="preview-image"
                />
              }
            </div>

            <!-- Next Button -->
            @if (totalImages() > 1) {
              <button
                type="button"
                class="nav-arrow-btn next-btn"
                (click)="next.emit()"
                aria-label="Next image"
                title="Next image (Right arrow)"
              >
                <ts-icon name="chevron-right" [size]="20" />
              </button>
            }
          </div>

          <!-- Modal Footer / Meta Bar -->
          <div class="modal-footer">
            <div class="meta-item">
              <span class="meta-label">Dimensions:</span>
              <span class="meta-value font-mono">{{ formattedDimensions() }}</span>
            </div>
            <div class="meta-divider">•</div>
            <div class="meta-item">
              <span class="meta-label">Original Size:</span>
              <span class="meta-value font-mono">{{ formattedSize() }}</span>
            </div>
            <div class="meta-divider">•</div>
            <div class="meta-item">
              <span class="meta-label">Format:</span>
              <span class="meta-value font-mono">{{ image.detectedFormat | uppercase }}</span>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 180ms ease-out;
    }

    .modal-dialog {
      display: flex;
      flex-direction: column;
      max-width: 960px;
      width: 100%;
      max-height: 90vh;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-default, #2E3342);
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-base, #111318);
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .format-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent, #60A5FA);
      border: 1px solid rgba(59, 130, 246, 0.3);
      flex-shrink: 0;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .index-indicator {
      font-size: 12px;
      color: var(--text-3, #9CA3AF);
    }

    .icon-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ts-radius-sm, 8px);
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .icon-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
    }

    .stage-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      min-height: 280px;
      max-height: 68vh;
      overflow: hidden;
      background: repeating-conic-gradient(#15171d 0% 25%, #101217 0% 50%) 50% / 16px 16px;
    }

    .image-viewport {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      max-height: 64vh;
    }

    .preview-image {
      max-width: 100%;
      max-height: 64vh;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    .nav-arrow-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(17, 19, 24, 0.85);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      cursor: pointer;
      z-index: 10;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .nav-arrow-btn:hover {
      background: var(--accent, #2563EB);
      border-color: var(--accent, #2563EB);
      transform: translateY(-50%) scale(1.08);
    }

    .prev-btn {
      left: 16px;
    }

    .next-btn {
      right: 16px;
    }

    .preview-error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      color: var(--text-2, #9CA3AF);
      padding: 32px;
    }

    .error-icon {
      color: var(--warning, #F59E0B);
    }

    .preview-error-state h4 {
      color: var(--text, #F9FAFB);
      margin: 0;
      font-size: 16px;
    }

    .preview-error-state p {
      margin: 0;
      font-size: 13px;
      max-width: 320px;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 12px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-base, #111318);
      font-size: 12px;
      color: var(--text-2, #9CA3AF);
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .meta-label {
      color: var(--text-3, #6B7280);
    }

    .meta-value {
      color: var(--text, #F9FAFB);
      font-weight: 600;
    }

    .meta-divider {
      opacity: 0.3;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 640px) {
      .modal-dialog {
        max-height: 96vh;
      }
      .nav-arrow-btn {
        width: 36px;
        height: 36px;
      }
      .prev-btn { left: 8px; }
      .next-btn { right: 8px; }
      .modal-footer {
        flex-direction: column;
        gap: 4px;
      }
      .meta-divider { display: none; }
    }
  `]
})
export class PreviewModalComponent {
  readonly item = input<ImageItem | null>(null);
  readonly currentIndex = input<number>(0);
  readonly totalImages = input<number>(1);

  readonly close = output<void>();
  readonly next = output<void>();
  readonly prev = output<void>();

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.item()) return;
    if (event.key === 'Escape') {
      this.close.emit();
    } else if (event.key === 'ArrowRight') {
      this.next.emit();
    } else if (event.key === 'ArrowLeft') {
      this.prev.emit();
    }
  }

  readonly formattedSize = computed(() => {
    const item = this.item();
    if (!item) return '0 B';
    const bytes = item.originalSize;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  });

  readonly formattedDimensions = computed(() => {
    const item = this.item();
    if (!item) return '-';
    if (item.width > 0 && item.height > 0) {
      return `${item.width} × ${item.height} px`;
    }
    return 'Vector / Dynamic';
  });
}

