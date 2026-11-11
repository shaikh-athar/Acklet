// apps/tool-image-compressor/src/components/image-card/image-card.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';

@Component({
  selector: 'app-image-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="image-card"
      [class.is-selected]="item().selected"
      [class.has-error]="item().status === 'corrupted' || item().status === 'invalid'"
      [class.has-custom-settings]="item().individualSettings.hasCustomSettings"
    >
      <!-- Selection Checkbox -->
      <label class="checkbox-container" (click)="$event.stopPropagation()">
        <input
          type="checkbox"
          [checked]="item().selected"
          (change)="selectToggled.emit(item().id)"
          class="native-checkbox"
          [attr.aria-label]="'Select ' + item().originalName"
        />
        <span class="custom-checkbox">
          @if (item().selected) {
            <ts-icon name="check" [size]="12" class="check-icon" />
          }
        </span>
      </label>

      <!-- Thumbnail Preview -->
      <div
        class="thumbnail-wrapper"
        (click)="previewRequested.emit(item().id)"
        role="button"
        tabindex="0"
        (keydown.enter)="previewRequested.emit(item().id)"
        (keydown.space)="previewRequested.emit(item().id); $event.preventDefault()"
        [title]="'Click to preview ' + item().originalName"
        aria-label="Preview image"
      >
        @if (item().status === 'corrupted' || !item().capabilities.previewSupported) {
          <div class="thumb-fallback">
            <ts-icon [name]="item().status === 'corrupted' ? 'alert-triangle' : 'image'" [size]="24" />
          </div>
        } @else {
          <img
            [src]="item().previewUrl"
            [alt]="item().originalName"
            class="thumb-img"
            loading="lazy"
          />
        }
        <div class="thumb-hover-overlay">
          <ts-icon name="eye" [size]="16" class="hover-eye" />
        </div>
      </div>

      <!-- File Details -->
      <div class="details-col">
        <div class="title-row">
          <span class="file-name" [title]="item().originalName">{{ item().nameWithoutExt }}</span>
          <span class="format-badge font-mono">{{ item().originalExtension | uppercase }}</span>
        </div>

        <div class="meta-row font-mono">
          <span class="meta-size">{{ formattedSize() }}</span>
          <span class="meta-dot">•</span>
          <span class="meta-dims">{{ formattedDimensions() }}</span>
        </div>

        <!-- Overrides / Configuration Status Pill -->
        <div class="status-row">
          @if (item().individualSettings.hasCustomSettings) {
            <span class="custom-settings-badge" title="Individual overrides applied">
              <ts-icon name="sliders-horizontal" [size]="10" />
              <span>Custom: {{ item().effectiveSettings.quality }}% • {{ item().effectiveSettings.outputFormat | uppercase }}</span>
            </span>
          } @else {
            <span class="global-settings-badge" title="Inheriting global settings">
              Global: {{ item().effectiveSettings.quality }}% • {{ item().effectiveSettings.outputFormat | uppercase }}
            </span>
          }

          @if (item().status === 'corrupted') {
            <span class="error-badge">
              <ts-icon name="alert-circle" [size]="10" />
              Corrupted
            </span>
          }
        </div>
      </div>

      <!-- Actions Cluster -->
      <div class="actions-cluster" (click)="$event.stopPropagation()">
        <!-- Individual Settings Button -->
        <button
          type="button"
          class="action-icon-btn settings-btn"
          [class.is-active]="item().individualSettings.hasCustomSettings"
          (click)="settingsRequested.emit(item().id)"
          [title]="item().individualSettings.hasCustomSettings ? 'Edit individual settings (Custom active)' : 'Configure individual settings'"
          aria-label="Individual compression settings"
        >
          <ts-icon name="sliders-horizontal" [size]="15" />
        </button>

        <!-- Preview Button -->
        <button
          type="button"
          class="action-icon-btn preview-btn"
          (click)="previewRequested.emit(item().id)"
          title="Preview image"
          aria-label="Preview image"
        >
          <ts-icon name="eye" [size]="15" />
        </button>

        <!-- Remove Button -->
        <button
          type="button"
          class="action-icon-btn remove-btn"
          (click)="removeRequested.emit(item().id)"
          title="Remove image"
          aria-label="Remove image"
        >
          <ts-icon name="trash-2" [size]="15" />
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .image-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-inner, 16px);
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease-out, ease-out);
      position: relative;
    }

    .image-card:hover {
      border-color: var(--border-default, rgba(255, 255, 255, 0.16));
      background: var(--ts-surface-hover, rgba(255, 255, 255, 0.03));
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .image-card.is-selected {
      border-color: var(--accent, #3B82F6);
      background: rgba(59, 130, 246, 0.06);
    }

    .image-card.has-error {
      border-color: var(--error, #EF4444);
    }

    /* Checkbox */
    .checkbox-container {
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    }

    .native-checkbox {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .custom-checkbox {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid var(--border-default, #4B5563);
      background: var(--ts-surface-base, #111318);
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .image-card.is-selected .custom-checkbox {
      background: var(--accent, #2563EB);
      border-color: var(--accent, #2563EB);
      color: #FFFFFF;
    }

    .check-icon {
      color: #FFFFFF;
    }

    /* Thumbnail */
    .thumbnail-wrapper {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: var(--ts-radius-md, 12px);
      overflow: hidden;
      background: repeating-conic-gradient(#1f222a 0% 25%, #181a20 0% 50%) 50% / 12px 12px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      cursor: pointer;
      flex-shrink: 0;
    }

    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .thumb-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      color: var(--text-3, #6B7280);
    }

    .thumb-hover-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity var(--ts-dur-fast, 150ms) var(--ts-ease);
      color: #FFFFFF;
    }

    .thumbnail-wrapper:hover .thumb-hover-overlay {
      opacity: 1;
    }

    /* Details */
    .details-col {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1 1 0%;
      min-width: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .file-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .format-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #D1D5DB);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      flex-shrink: 0;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--text-3, #9CA3AF);
    }

    .meta-dot {
      opacity: 0.5;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      font-size: 11px;
    }

    .global-settings-badge {
      color: var(--text-3, #6B7280);
      font-size: 11px;
    }

    .custom-settings-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--accent, #60A5FA);
      background: rgba(59, 130, 246, 0.1);
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 500;
    }

    .error-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--error, #EF4444);
      font-weight: 500;
    }

    /* Actions Cluster */
    .actions-cluster {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .action-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ts-radius-sm, 8px);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .action-icon-btn:hover {
      background: var(--ts-surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #FFFFFF);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .action-icon-btn.settings-btn.is-active {
      color: var(--accent, #3B82F6);
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.3);
    }

    .action-icon-btn.remove-btn:hover {
      color: var(--error, #EF4444);
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.25);
    }

    @media (max-width: 640px) {
      .image-card {
        padding: 8px 10px;
        gap: 10px;
      }
      .thumbnail-wrapper {
        width: 44px;
        height: 44px;
      }
      .action-icon-btn {
        width: 28px;
        height: 28px;
      }
    }
  `]
})
export class ImageCardComponent {
  readonly item = input.required<ImageItem>();

  readonly selectToggled = output<string>();
  readonly previewRequested = output<string>();
  readonly settingsRequested = output<string>();
  readonly removeRequested = output<string>();

  readonly formattedSize = computed(() => {
    const bytes = this.item().originalSize;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  });

  readonly formattedDimensions = computed(() => {
    const w = this.item().width;
    const h = this.item().height;
    if (w > 0 && h > 0) {
      return `${w} × ${h} px`;
    }
    return 'Vector / Dynamic';
  });
}

