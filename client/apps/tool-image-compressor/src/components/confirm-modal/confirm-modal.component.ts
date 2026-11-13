// apps/tool-image-compressor/src/components/confirm-modal/confirm-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop animate-fade-in"
      (click)="cancelled.emit()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
    >
      <div class="modal-dialog animate-scale-up" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon-wrap" [class.is-danger]="isDanger()">
            <ts-icon [name]="isDanger() ? 'alert-triangle' : 'help-circle'" [size]="20" />
          </div>
          <div class="header-text-group">
            <h3 class="modal-title">{{ title() }}</h3>
            <span class="modal-subtitle">Confirmation required</span>
          </div>
          <button
            type="button"
            class="close-btn"
            (click)="cancelled.emit()"
            title="Cancel"
            aria-label="Close dialog"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <p class="modal-message">{{ message() }}</p>
        </div>

        <!-- Actions -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-cancel"
            (click)="cancelled.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn-confirm"
            [class.btn-danger]="isDanger()"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1050;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-dialog {
      width: 100%;
      max-width: 440px;
      background: var(--ts-surface-card, #1E2028);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: var(--ts-radius-card, 16px);
      box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: rgba(59, 130, 246, 0.12);
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .header-icon-wrap.is-danger {
      background: rgba(239, 68, 68, 0.12);
      color: var(--error, #EF4444);
    }

    .header-text-group {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-3, #6B7280);
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #F9FAFB);
    }

    .modal-body {
      padding: 20px;
    }

    .modal-message {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-2, #D1D5DB);
      margin: 0;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.02));
    }

    .btn-cancel {
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--ts-surface-subtle, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: var(--text, #F9FAFB);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .btn-confirm {
      height: 36px;
      padding: 0 18px;
      border-radius: 8px;
      background: var(--accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-confirm:hover {
      background: #2563EB;
    }

    .btn-confirm.btn-danger {
      background: var(--error, #EF4444);
    }

    .btn-confirm.btn-danger:hover {
      background: #DC2626;
    }

    /* ── Light Theme Dual-Theme Overrides ── */
    :host-context([data-theme="light"]) .modal-backdrop,
    [data-theme="light"] .modal-backdrop {
      background: rgba(15, 23, 42, 0.45);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.14);
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .modal-subtitle,
    [data-theme="light"] .modal-subtitle {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .modal-message,
    [data-theme="light"] .modal-message {
      color: #334155;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }

    :host-context([data-theme="light"]) .btn-cancel,
    [data-theme="light"] .btn-cancel {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .btn-cancel:hover,
    [data-theme="light"] .btn-cancel:hover {
      background: #F1F5F9;
    }

    :host-context([data-theme="light"]) .close-btn,
    [data-theme="light"] .close-btn {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .close-btn:hover,
    [data-theme="light"] .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-fade-in {
      animation: fadeIn 150ms var(--ts-ease-out, ease-out);
    }

    .animate-scale-up {
      animation: scaleUp 180ms var(--ts-ease-out, ease-out);
    }
  `]
})
export class ConfirmModalComponent {
  readonly title = input<string>('Confirm Action');
  readonly message = input<string>('Are you sure you want to proceed?');
  readonly confirmLabel = input<string>('Confirm');
  readonly isDanger = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.cancelled.emit();
  }
}

