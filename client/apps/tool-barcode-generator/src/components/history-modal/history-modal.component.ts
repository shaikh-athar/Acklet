// apps/tool-barcode-generator/src/components/history-modal/history-modal.component.ts
import {
  Component,
  input,
  output,
  signal,
  inject,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TsIconComponent } from '@acklet/tool-shell';
import { BarcodeHistoryItem } from '../../models/barcode.models';

@Component({
  selector: 'app-barcode-history-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="modal-backdrop"
        [class.is-closing]="isClosing()"
        (click)="onClose()"
        aria-hidden="true"
      ></div>

      <div
        class="modal-dialog"
        [class.is-closing]="isClosing()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-dialog-title"
      >
        <!-- Dialog Header -->
        <div class="dialog-header">
          <div class="header-left">
            <ts-icon name="history" class="header-icon" />
            <h2 id="history-dialog-title" class="dialog-title">History</h2>
            <span class="count-badge" title="Saved barcodes">{{ items().length }}</span>
            @if (totalGenerated() > 0) {
              <span class="total-badge" title="Total barcodes generated to date">
                {{ totalGenerated() }} generated
              </span>
            }
          </div>

          <div class="header-right">
            <button
              type="button"
              class="close-btn"
              (click)="onClose()"
              aria-label="Close dialog"
            >
              <ts-icon name="x" [size]="18" />
            </button>
          </div>
        </div>

        <!-- 30-Day Retention Notice Banner -->
        <div class="retention-notice-banner">
          <ts-icon name="info" [size]="14" class="retention-icon" />
          <span>Barcodes are stored locally on this device and cleared automatically after 30 days.</span>
        </div>

        <!-- Privacy & Clear Controls Bar -->
        <div class="history-controls-bar">
          <label class="privacy-toggle-label">
            <input
              type="checkbox"
              class="ts-checkbox"
              [ngModel]="dontSaveHistory()"
              (ngModelChange)="toggleDontSaveHistory.emit($event)"
            />
            <span>Don't save history</span>
          </label>

          @if (items().length > 0) {
            <button
              type="button"
              class="clear-all-btn"
              (click)="clearAll.emit()"
            >
              Clear history
            </button>
          }
        </div>

        <!-- History Items List -->
        <div class="dialog-body custom-scrollbar">
          @if (items().length > 0) {
            <div class="history-list">
              @for (item of items(); track item.id) {
                <div class="history-card">
                  <!-- Left: Mini SVG preview -->
                  <div
                    class="history-preview-box"
                    (click)="onRestore(item)"
                    title="Load"
                  >
                    <img
                      [src]="getThumbnailUrl(item.svg)"
                      alt="Barcode preview"
                      class="mini-svg-img"
                    />
                  </div>

                  <!-- Center: Name (with inline edit), Value, Format, Timestamp -->
                  <div class="history-meta" (click)="onRestore(item)">
                    @if (editingItemId() === item.id) {
                      <div class="inline-edit-box" (click)="$event.stopPropagation()">
                        <input
                          type="text"
                          class="inline-edit-input"
                          [ngModel]="editingName()"
                          (ngModelChange)="editingName.set($event)"
                          (keydown.enter)="saveRename(item.id, $event)"
                          (keydown.escape)="cancelRename($event)"
                          maxlength="60"
                          placeholder="Barcode name"
                        />
                        <button
                          type="button"
                          class="inline-edit-action-btn confirm"
                          (click)="saveRename(item.id, $event)"
                          title="Save name"
                          aria-label="Save name"
                        >
                          <ts-icon name="check" [size]="13" />
                        </button>
                        <button
                          type="button"
                          class="inline-edit-action-btn cancel"
                          (click)="cancelRename($event)"
                          title="Cancel"
                          aria-label="Cancel"
                        >
                          <ts-icon name="x" [size]="13" />
                        </button>
                      </div>
                    } @else {
                      <div class="title-row">
                        <span class="barcode-name">{{ item.name }}</span>
                        <button
                          type="button"
                          class="inline-edit-trigger"
                          (click)="startRename(item, $event)"
                          title="Edit name"
                          aria-label="Edit name"
                        >
                          <ts-icon name="edit-2" [size]="12" />
                        </button>
                        <span class="format-badge">{{ item.formatLabel }}</span>
                      </div>
                    }
                    <span class="barcode-value">{{ item.displayValue }}</span>
                    <span class="barcode-date">{{ formatDate(item.timestamp) }}</span>
                  </div>

                  <!-- Right: Actions (Load, Delete) -->
                  <div class="history-actions">
                    <button
                      type="button"
                      class="action-icon-btn"
                      (click)="onRestore(item)"
                      title="Load"
                      aria-label="Load"
                    >
                      <ts-icon name="arrow-up-right" [size]="16" />
                    </button>
                    <button
                      type="button"
                      class="action-icon-btn danger"
                      (click)="deleteItem.emit(item.id)"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <ts-icon name="trash-2" [size]="16" />
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-history">
              <ts-icon name="history" class="empty-icon" />
              <p class="empty-title">No history</p>
              <span class="empty-subtitle">Generated barcodes are saved locally on this device.</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(6px);
      z-index: 999;
      animation: modalBackdropFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .modal-backdrop.is-closing {
      animation: modalBackdropFadeOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .modal-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 520px;
      max-height: 85vh;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: var(--shell-card-radius, 16px);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      z-index: 1000;
      overflow: hidden;
      animation: modalDialogPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .modal-dialog.is-closing {
      animation: modalDialogPopOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes modalBackdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalBackdropFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes modalDialogPopIn {
      from {
        opacity: 0;
        transform: translate(-50%, -46%) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    @keyframes modalDialogPopOut {
      from {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -46%) scale(0.96);
      }
    }

    :host-context([data-theme="light"]) .modal-dialog {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .dialog-header {
      border-bottom-color: rgba(0, 0, 0, 0.06);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      color: var(--tool-accent, #3B82F6);
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .dialog-title {
      color: #0F172A;
    }

    .count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 10px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #3B82F6);
    }

    .total-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 7px;
      border-radius: 10px;
      background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .total-badge {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .retention-notice-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.03));
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .retention-notice-banner {
      background: #F8FAFC;
      border-bottom-color: rgba(0, 0, 0, 0.06);
      color: #64748B;
    }

    .retention-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }

    .close-btn:hover {
      color: var(--text, #fcfcfc);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }

    /* History Controls Bar */
    .history-controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 18px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .history-controls-bar {
      background: #F8FAFC;
      border-bottom-color: rgba(0, 0, 0, 0.06);
    }

    .privacy-toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }

    .ts-checkbox {
      accent-color: var(--tool-accent, #3B82F6);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    .clear-all-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      cursor: pointer;
      text-decoration: underline;
    }

    .clear-all-btn:hover {
      color: #EF4444;
    }

    .dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 18px;
      max-height: 55vh;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .history-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      transition: border-color var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .history-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .history-card:hover {
      border-color: var(--tool-accent, #3B82F6);
    }

    .history-preview-box {
      width: 72px;
      height: 48px;
      border-radius: 6px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      cursor: pointer;
      flex-shrink: 0;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }

    .mini-svg-img {
      max-width: 100%;
      max-height: 40px;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .history-meta {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      cursor: pointer;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .barcode-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .barcode-name {
      color: #0F172A;
    }

    .format-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
    }

    .inline-edit-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      opacity: 0.6;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .history-card:hover .inline-edit-trigger {
      opacity: 1;
    }

    .inline-edit-trigger:hover {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .inline-edit-trigger:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .inline-edit-box {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
      margin-bottom: 2px;
    }

    .inline-edit-input {
      flex: 1;
      min-width: 0;
      height: 24px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--tool-accent, #3B82F6);
      color: var(--text, #fcfcfc);
      outline: none;
    }

    :host-context([data-theme="light"]) .inline-edit-input {
      background: #FFFFFF;
      color: #0F172A;
    }

    .inline-edit-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .inline-edit-action-btn.confirm {
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
    }

    .inline-edit-action-btn.confirm:hover {
      background: var(--tool-accent-hover, #2563EB);
    }

    .inline-edit-action-btn.cancel {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .inline-edit-action-btn.cancel {
      background: #E2E8F0;
      color: #64748B;
    }

    .inline-edit-action-btn.cancel:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
    }

    .barcode-value {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .barcode-date {
      font-size: 10.5px;
      color: var(--text-muted, #94a3b8);
      opacity: 0.8;
    }

    .history-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }

    .action-icon-btn:hover {
      color: var(--text, #fcfcfc);
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }

    .action-icon-btn.danger:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .empty-history {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      text-align: center;
      color: var(--text-muted, #94a3b8);
    }

    .empty-icon {
      opacity: 0.4;
      margin-bottom: 10px;
    }

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      margin: 0 0 4px;
    }

    :host-context([data-theme="light"]) .empty-title {
      color: #0F172A;
    }

    .empty-subtitle {
      font-size: 12px;
      max-width: 260px;
      line-height: 1.4;
    }
  `]
})
export class BarcodeHistoryModalComponent {
  private sanitizer = inject(DomSanitizer);

  readonly isOpen = input.required<boolean>();
  readonly items = input.required<BarcodeHistoryItem[]>();
  readonly dontSaveHistory = input<boolean>(false);
  readonly totalGenerated = input<number>(0);

  readonly close = output<void>();
  readonly restore = output<BarcodeHistoryItem>();
  readonly deleteItem = output<string>();
  readonly clearAll = output<void>();
  readonly toggleDontSaveHistory = output<boolean>();
  readonly renameItem = output<{ id: string; newName: string }>();

  readonly isClosing = signal<boolean>(false);
  readonly editingItemId = signal<string | null>(null);
  readonly editingName = signal<string>('');

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.editingItemId()) {
      this.cancelRename();
      return;
    }
    if (this.isOpen()) {
      this.onClose();
    }
  }

  startRename(item: BarcodeHistoryItem, event: Event): void {
    event.stopPropagation();
    this.editingItemId.set(item.id);
    this.editingName.set(item.name);
  }

  cancelRename(event?: Event): void {
    if (event) event.stopPropagation();
    this.editingItemId.set(null);
    this.editingName.set('');
  }

  saveRename(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    const trimmed = this.editingName().trim().slice(0, 60);
    if (trimmed) {
      this.renameItem.emit({ id, newName: trimmed });
    }
    this.cancelRename();
  }

  onClose(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.isClosing.set(false);
      this.close.emit();
    }, 200);
  }

  onRestore(item: BarcodeHistoryItem): void {
    this.restore.emit(item);
    this.onClose();
  }

  getThumbnailUrl(svg: string): SafeUrl {
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return this.sanitizer.bypassSecurityTrustUrl(dataUrl);
  }

  formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
