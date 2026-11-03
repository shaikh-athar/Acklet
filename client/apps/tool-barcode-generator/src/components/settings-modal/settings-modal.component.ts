// apps/tool-barcode-generator/src/components/settings-modal/settings-modal.component.ts
import {
  Component,
  input,
  output,
  signal,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-barcode-settings-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
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
        aria-labelledby="settings-dialog-title"
      >
        <!-- Dialog Header -->
        <div class="dialog-header">
          <div class="header-left">
            <ts-icon name="settings" class="header-icon" />
            <h2 id="settings-dialog-title" class="dialog-title">Barcode Settings</h2>
          </div>

          <button
            type="button"
            class="close-btn"
            (click)="onClose()"
            aria-label="Close settings"
          >
            <ts-icon name="x" [size]="18" />
          </button>
        </div>

        <!-- Dialog Body -->
        <div class="dialog-body">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Client-Side Privacy Guarantee</span>
              <span class="setting-desc">All barcode encoding, rendering, and vector exports run locally in browser memory. No data is sent across the network.</span>
            </div>
            <div class="badge-active">Active</div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Silent Verification</span>
              <span class="setting-desc">Automatically decodes generated barcodes in the background using the browser's native BarcodeDetector API to ensure scanner readability.</span>
            </div>
            <div class="badge-active">Enabled</div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">Default Export Resolution</span>
              <span class="setting-desc">PNG rasterization renders at 300 DPI by default to conform to GS1 and commercial printing standards.</span>
            </div>
            <span class="setting-value">300 DPI</span>
          </div>

          <div class="divider"></div>

          <!-- Reset All Preferences -->
          <div class="danger-zone">
            <div class="danger-info">
              <span class="danger-title">Reset Tool Preferences</span>
              <span class="danger-desc">Restore all sizing, color, font, and symbology preferences to defaults.</span>
            </div>
            <button
              type="button"
              class="reset-btn"
              (click)="resetAll.emit(); close.emit()"
            >
              Reset to Defaults
            </button>
          </div>
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
      max-width: 480px;
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
      padding: 16px 20px;
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
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .dialog-title {
      color: #1E293B;
    }

    .close-btn {
      display: flex;
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
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .close-btn:hover {
      background: #F1F5F9;
      color: #1E293B;
    }

    .dialog-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .setting-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }

    .setting-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .setting-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .setting-title {
      color: #1E293B;
    }

    .setting-desc {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.4;
    }

    .badge-active {
      font-size: 11px;
      font-weight: 600;
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .setting-value {
      font-size: 12px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
    }

    .divider {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    :host-context([data-theme="light"]) .divider {
      background: rgba(0, 0, 0, 0.06);
    }

    .danger-zone {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .danger-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .danger-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #EF4444;
    }

    .danger-desc {
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.4;
    }

    .reset-btn {
      padding: 8px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #EF4444;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--ts-dur-fast, 150ms) ease;
    }

    .reset-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  `]
})
export class BarcodeSettingsModalComponent {
  readonly isOpen = input.required<boolean>();

  readonly close = output<void>();
  readonly resetAll = output<void>();

  readonly isClosing = signal<boolean>(false);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.isClosing.set(false);
      this.close.emit();
    }, 200);
  }

  onResetAll(): void {
    this.resetAll.emit();
    this.onClose();
  }
}
