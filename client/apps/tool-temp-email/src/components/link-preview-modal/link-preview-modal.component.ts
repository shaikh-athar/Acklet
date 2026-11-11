// apps/tool-temp-email/src/components/link-preview-modal/link-preview-modal.component.ts
import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { LinkPreviewData } from '../../models/temp-email.models';

@Component({
  selector: 'app-link-preview-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="modal-backdrop animate-fade-in" (click)="close.emit()" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <div class="modal-dialog" (click)="$event.stopPropagation()">
        
        <div class="modal-header">
          <div class="modal-title-row">
            <ts-icon name="shield" [size]="18" class="shield-icon" />
            <h3 id="preview-title" class="modal-title">Link Destination Inspector</h3>
          </div>
          <button type="button" class="modal-close-btn" (click)="close.emit()" aria-label="Close modal">
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <div class="modal-body">
          @if (data().isSuspicious) {
            <div class="suspicious-alert-box animate-fade-in" role="alert">
              <ts-icon name="alert-triangle" [size]="18" class="alert-icon" />
              <div class="alert-text">
                <span class="alert-heading">Potential Link Mismatch</span>
                <span class="alert-desc">
                  The visible link text claims to be <strong>{{ data().visibleText }}</strong>, but the actual destination points to a different domain (<strong>{{ data().displayHost }}</strong>). Proceed with caution.
                </span>
              </div>
            </div>
          }

          <div class="info-field-group">
            <label class="field-label">Target Domain:</label>
            <div class="domain-display font-mono">
              <ts-icon name="globe" [size]="14" />
              <span>{{ data().displayHost }}</span>
            </div>
          </div>

          <div class="info-field-group">
            <label class="field-label">Full Destination URL:</label>
            <div class="url-display-box font-mono">
              {{ data().fullUrl }}
            </div>
          </div>

          <p class="privacy-note">
            Acklet checks link destinations to protect against phishing and unwanted redirects before you leave this page.
          </p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" (click)="close.emit()">
            Cancel
          </button>
          <button type="button" class="btn-copy-link" (click)="copyLink()">
            <ts-icon [name]="copied() ? 'check' : 'copy'" [size]="14" />
            <span>{{ copied() ? 'Copied' : 'Copy Link' }}</span>
          </button>
          <a
            [href]="data().fullUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-proceed"
            (click)="close.emit()"
          >
            <ts-icon name="external-link" [size]="14" />
            <span>Open Link</span>
          </a>
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
      max-width: 520px;
      background: var(--ts-surface-raised, #18191C);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: dialogPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.15);
    }

    @keyframes dialogPop {
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

    .shield-icon {
      color: var(--accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .shield-icon,
    [data-theme="light"] .shield-icon {
      color: #2563EB;
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
      transition: all 0.15s;
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
      gap: 16px;
    }

    .suspicious-alert-box {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #FBBF24;
    }

    :host-context([data-theme="light"]) .suspicious-alert-box,
    [data-theme="light"] .suspicious-alert-box {
      background: #FFFBEB;
      border-color: #FCD34D;
      color: #B45309;
    }

    .alert-icon {
      flex-shrink: 0;
      color: #F59E0B;
    }

    .alert-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .alert-heading {
      font-size: 13px;
      font-weight: 700;
    }

    .alert-desc {
      font-size: 12px;
      line-height: 1.4;
      opacity: 0.9;
    }

    .info-field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted, #94A3B8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    :host-context([data-theme="light"]) .field-label,
    [data-theme="light"] .field-label {
      color: #475569;
    }

    .domain-display {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--ts-surface-inset, #131416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--accent-strong, #93C5FD);
      font-size: 14px;
      font-weight: 700;
    }

    :host-context([data-theme="light"]) .domain-display,
    [data-theme="light"] .domain-display {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #1D4ED8;
    }

    .url-display-box {
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--ts-surface-inset, #131416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text, #E2E8F0);
      font-size: 12px;
      line-height: 1.5;
      word-break: break-all;
      max-height: 120px;
      overflow-y: auto;
    }

    :host-context([data-theme="light"]) .url-display-box,
    [data-theme="light"] .url-display-box {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .privacy-note {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .privacy-note,
    [data-theme="light"] .privacy-note {
      color: #64748B;
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
      transition: all 0.15s;
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

    .btn-copy-link {
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
      color: var(--text, #FFFFFF);
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .btn-copy-link,
    [data-theme="light"] .btn-copy-link {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .btn-copy-link:hover {
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 15%, transparent));
      border-color: var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 40%, transparent));
      color: var(--accent-strong, #60A5FA);
    }

    :host-context([data-theme="light"]) .btn-copy-link:hover,
    [data-theme="light"] .btn-copy-link:hover {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #1D4ED8;
    }

    .btn-proceed {
      height: 36px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--accent, #3B82F6);
      border: 1px solid var(--accent, #3B82F6);
      color: #FFFFFF !important;
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .btn-proceed,
    [data-theme="light"] .btn-proceed {
      background: #2563EB;
      border-color: #1D4ED8;
    }

    .btn-proceed:hover {
      background: #2563EB;
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .btn-proceed:hover,
    [data-theme="light"] .btn-proceed:hover {
      background: #1E40AF;
    }
  `]
})
export class LinkPreviewModalComponent {
  readonly data = input.required<LinkPreviewData>();
  readonly close = output<void>();

  readonly copied = signal<boolean>(false);

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.data().fullUrl);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (e) {
      console.warn('Failed to copy link:', e);
    }
  }
}
