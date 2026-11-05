// apps/tool-temp-email/src/components/wipe-data-modal/wipe-data-modal.component.ts
import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-wipe-data-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="modal-backdrop animate-fade-in" (click)="close.emit()" role="dialog" aria-modal="true" aria-labelledby="wipe-title">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="warning-icon-badge">
              <ts-icon name="trash" [size]="18" />
            </span>
            <h3 id="wipe-title" class="modal-title">Wipe All Temporary Email Data?</h3>
          </div>
          <button type="button" class="modal-close-btn" (click)="close.emit()" aria-label="Close modal">
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <div class="modal-body">
          <p class="wipe-statement">
            This will immediately remove all temporary inboxes, received emails, authentication tokens, and saved preferences from this browser.
          </p>

          <div class="warning-callout">
            <ts-icon name="alert-triangle" [size]="16" class="callout-icon" />
            <span>This action is permanent and cannot be undone.</span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" (click)="close.emit()">
            Keep My Data
          </button>
          <button type="button" class="btn-confirm-wipe" (click)="confirm.emit()">
            <ts-icon name="trash" [size]="14" />
            <span>Wipe Everything</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-dialog {
      width: 100%;
      max-width: 480px;
      background: var(--ts-surface-raised, #18191C);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.15);
    }

    @keyframes popIn {
      from { opacity: 0; transform: scale(0.96) translateY(4px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    .modal-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .warning-icon-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.12);
      color: #EF4444;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .warning-icon-badge,
    [data-theme="light"] .warning-icon-badge {
      background: #FEF2F2;
      color: #DC2626;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    .modal-close-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
    }

    .modal-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .modal-close-btn:hover,
    [data-theme="light"] .modal-close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .wipe-statement {
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-muted, #94A3B8);
      margin: 0;
    }

    :host-context([data-theme="light"]) .wipe-statement,
    [data-theme="light"] .wipe-statement {
      color: #334155;
    }

    .warning-callout {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #F87171;
      font-size: 13px;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .warning-callout,
    [data-theme="light"] .warning-callout {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    .callout-icon {
      flex-shrink: 0;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-raised, #18191C);
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      background: #F8FAFC;
      border-top-color: #F1F5F9;
    }

    .btn-cancel {
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
      color: var(--text, #FFFFFF);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .btn-cancel,
    [data-theme="light"] .btn-cancel {
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    :host-context([data-theme="light"]) .btn-cancel:hover,
    [data-theme="light"] .btn-cancel:hover {
      background: #E2E8F0;
    }

    .btn-confirm-wipe {
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      background: #DC2626;
      border: 1px solid #B91C1C;
      color: #FFFFFF !important;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-confirm-wipe:hover {
      background: #B91C1C;
      transform: translateY(-1px);
    }
  `]
})
export class WipeDataModalComponent {
  readonly close = output<void>();
  readonly confirm = output<void>();
}

