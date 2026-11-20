// packages/tool-shell/src/components/tool-suite/file-card.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  ElementRef,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

export interface FileCardData {
  id: string;
  name: string;
  format: string;
  originalBytes?: number;
  outputBytes?: number;
  formattedOriginalSize?: string;
  formattedOutputSize?: string;
  previewUrl?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress?: number;
  errorMessage?: string;
  customBadge?: string;
  dimensions?: string;
}

@Component({
  selector: 'app-file-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="tool-file-card"
      [class.is-completed]="item().status === 'completed'"
      [class.has-error]="item().status === 'error'"
    >
      <!-- 1. Top Thumbnail Frame (Fixed 180px Height) -->
      <div
        class="card-thumb-frame"
        (click)="previewRequested.emit(item().id)"
        [title]="'Preview ' + item().name"
      >
        @if (item().previewUrl) {
          <img
            [src]="item().previewUrl"
            [alt]="item().name"
            class="card-thumb-img"
            loading="lazy"
          />
        } @else {
          <div class="card-thumb-fallback">
            <ts-icon [name]="item().status === 'error' ? 'alert-triangle' : 'file-text'" [size]="32" />
          </div>
        }

        <!-- Top-Left Format Badge -->
        <div class="card-format-badge-wrap" (click)="$event.stopPropagation()">
          <span class="card-format-badge">{{ item().format | uppercase }}</span>
          @if (item().customBadge) {
            <span class="card-custom-badge">{{ item().customBadge }}</span>
          }
        </div>

        <!-- Top-Right Remove Button -->
        <button
          type="button"
          class="card-remove-btn"
          (click)="$event.stopPropagation(); removeRequested.emit(item().id)"
          [disabled]="item().status === 'processing'"
          title="Remove file"
          aria-label="Remove file"
        >
          <ts-icon name="x" [size]="13" />
        </button>

        <!-- Processing Progress Overlay -->
        @if (item().status === 'processing') {
          <div class="card-processing-overlay">
            <span class="processing-spinner"></span>
            <span class="processing-pct font-mono">{{ item().progress || 0 }}%</span>
          </div>
        }
      </div>

      <!-- 2. Bottom Card Body: Name, Metadata & Actions -->
      <div class="card-body">
        <!-- File Name Row with Inline Rename -->
        <div class="card-name-row">
          @if (isEditingName()) {
            <input
              #renameInput
              type="text"
              class="card-rename-input"
              [value]="editNameValue()"
              (input)="editNameValue.set($any($event.target).value)"
              (blur)="commitRename()"
              (keydown.enter)="commitRename()"
              (keydown.escape)="cancelRename()"
              (click)="$event.stopPropagation()"
              aria-label="Rename file"
            />
          } @else {
            <span
              class="card-file-name"
              (click)="startRename()"
              title="Click to rename file"
            >
              {{ item().name }}
            </span>
            <button
              type="button"
              class="card-rename-icon-btn"
              (click)="startRename()"
              title="Rename file"
              aria-label="Rename file"
            >
              <ts-icon name="edit-2" [size]="11" />
            </button>
          }
        </div>

        <!-- Metadata Row (Raw Bytes in font-mono) -->
        <div class="card-metadata-row">
          @if (item().status === 'error') {
            <span class="card-error-text">{{ item().errorMessage || 'Failed' }}</span>
          } @else if (item().status === 'completed' && item().formattedOutputSize) {
            <span class="meta-size font-mono">{{ item().formattedOriginalSize }}</span>
            <span class="meta-arrow">&rarr;</span>
            <span class="meta-new-size font-mono">{{ item().formattedOutputSize }}</span>
          } @else {
            <span class="meta-size font-mono">{{ item().formattedOriginalSize || '' }}</span>
            @if (item().dimensions) {
              <span class="meta-sep">&bull;</span>
              <span class="meta-dim font-mono">{{ item().dimensions }}</span>
            }
          }
        </div>

        <!-- 3. One Unified Action Row Shape in Every Tool -->
        <div class="card-action-row">
          @if (item().status === 'error') {
            <button
              type="button"
              class="card-action-btn btn-retry"
              (click)="retryRequested.emit(item().id)"
            >
              <ts-icon name="rotate-ccw" [size]="12" />
              <span>Retry</span>
            </button>
          } @else if (item().status === 'completed') {
            <button
              type="button"
              class="card-action-btn btn-primary"
              (click)="saveRequested.emit(item().id)"
            >
              <ts-icon name="download" [size]="12" />
              <span>Save</span>
            </button>
            <button
              type="button"
              class="card-action-btn btn-secondary"
              (click)="customActionRequested.emit(item().id)"
            >
              <ts-icon name="sliders" [size]="12" />
              <span>Options</span>
            </button>
          } @else {
            <button
              type="button"
              class="card-action-btn btn-secondary"
              (click)="customActionRequested.emit(item().id)"
            >
              <ts-icon name="sliders" [size]="12" />
              <span>Options</span>
            </button>
          }
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      animation: toolCardFadeIn 300ms cubic-bezier(0.2, 0.6, 0.2, 1) forwards;
    }

    @keyframes toolCardFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .tool-file-card {
      width: 100%;
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: var(--tool-radius-card, 16px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
      overflow: hidden;
      box-sizing: border-box;
      font-family: var(--tool-font-family, inherit);
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    :host-context([data-theme="dark"]) .tool-file-card,
    [data-theme="dark"] .tool-file-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .tool-file-card:hover {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    }

    /* ── 1. Thumbnail Frame (180px fixed) ── */
    .card-thumb-frame {
      position: relative;
      width: 100%;
      height: var(--tool-thumb-height, 180px); /* Strictly 180px fixed height */
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
      user-select: none;
    }

    :host-context([data-theme="dark"]) .card-thumb-frame,
    [data-theme="dark"] .card-thumb-frame {
      background: #111318;
    }

    .card-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 200ms ease;
    }

    .card-thumb-frame:hover .card-thumb-img {
      transform: scale(1.03);
    }

    .card-thumb-fallback {
      color: var(--text-muted, #94A3B8);
    }

    .card-format-badge-wrap {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .card-format-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(4px);
      color: #FFFFFF;
      letter-spacing: 0.04em;
    }

    .card-custom-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
    }

    .card-remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(15, 23, 42, 0.65);
      border: none;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .card-remove-btn:hover {
      background: #EF4444;
    }

    .card-processing-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #FFFFFF;
    }

    .processing-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: procSpin 0.6s linear infinite;
    }

    @keyframes procSpin {
      to { transform: rotate(360deg); }
    }

    .processing-pct {
      font-size: 12px;
      font-weight: 600;
    }

    /* ── 2. Card Body ── */
    .card-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-sizing: border-box;
    }

    .card-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .card-file-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #0F172A);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .card-file-name,
    [data-theme="dark"] .card-file-name {
      color: #F8FAFC;
    }

    .card-rename-icon-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      padding: 2px;
      display: flex;
      align-items: center;
    }

    .card-rename-input {
      width: 100%;
      height: 24px;
      padding: 0 4px;
      border-radius: 4px;
      border: 1px solid var(--tool-accent, #2563EB);
      background: var(--ts-surface-raised, #FFFFFF);
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 12px;
      font-weight: 600;
      outline: none;
    }

    .card-metadata-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .card-metadata-row,
    [data-theme="dark"] .card-metadata-row {
      color: #94A3B8;
    }

    .font-mono {
      font-family: var(--tool-font-mono, monospace);
    }

    .meta-new-size {
      color: #10B981;
      font-weight: 600;
    }

    .card-error-text {
      color: #EF4444;
      font-weight: 600;
    }

    /* ── 3. Unified Action Row ── */
    .card-action-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle, #F1F5F9);
    }

    :host-context([data-theme="dark"]) .card-action-row,
    [data-theme="dark"] .card-action-row {
      border-top-color: rgba(255, 255, 255, 0.08);
    }

    .card-action-btn {
      flex: 1;
      height: 30px;
      border-radius: 6px;
      font-family: var(--tool-font-family, inherit); /* Strictly UI font */
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-primary {
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      border: none;
    }

    .btn-secondary {
      background: var(--ts-surface-inset, rgba(15, 23, 42, 0.04));
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
    }

    :host-context([data-theme="dark"]) .btn-secondary,
    [data-theme="dark"] .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
      color: #F8FAFC;
    }

    .btn-retry {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #DC2626;
    }
  `]
})
export class FileCardComponent {
  readonly item = input.required<FileCardData>();

  readonly removeRequested = output<string>();
  readonly previewRequested = output<string>();
  readonly renameCommitted = output<{ id: string; newName: string }>();
  readonly saveRequested = output<string>();
  readonly retryRequested = output<string>();
  readonly customActionRequested = output<string>();

  readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  readonly isEditingName = signal(false);
  readonly editNameValue = signal('');

  startRename(): void {
    this.editNameValue.set(this.item().name);
    this.isEditingName.set(true);
    setTimeout(() => {
      this.renameInput()?.nativeElement?.focus();
    }, 50);
  }

  commitRename(): void {
    if (!this.isEditingName()) return;
    const val = this.editNameValue().trim();
    if (val && val !== this.item().name) {
      this.renameCommitted.emit({ id: this.item().id, newName: val });
    }
    this.isEditingName.set(false);
  }

  cancelRename(): void {
    this.isEditingName.set(false);
  }
}
