// apps/tool-temp-email/src/components/qr-modal/qr-modal.component.ts
import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-qr-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" role="dialog" aria-modal="true" aria-labelledby="qr-modal-title">
      <div class="modal-card animate-scale-in" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon-cluster">
            <span class="modal-icon-badge">
              <ts-icon name="qr-code" [size]="18" />
            </span>
            <div>
              <h3 id="qr-modal-title" class="modal-title">Scan on Another Device</h3>
              <p class="modal-subtitle">Point your phone camera to transfer this email address</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" (click)="close.emit()" aria-label="Close modal">
            <ts-icon name="x" [size]="16" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <div class="qr-canvas-container">
            @if (qrDataUrl()) {
              <img [src]="qrDataUrl()" alt="QR Code for temporary email" class="qr-image" />
            } @else {
              <div class="qr-loading-placeholder">
                <span class="spinner-circle-sm" aria-hidden="true"></span>
                <span>Generating QR...</span>
              </div>
            }
          </div>

          <div class="email-pill">
            <span class="email-text font-mono">{{ address() }}</span>
            <button
              type="button"
              class="copy-mini-btn"
              (click)="copyAddress()"
              [title]="copied() ? 'Copied!' : 'Copy to clipboard'"
            >
              <ts-icon [name]="copied() ? 'check' : 'copy'" [size]="14" />
              <span>{{ copied() ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>

          <p class="qr-instructions">
            Scanning opens a <code>mailto:</code> link or text prompt on your mobile phone to use this address instantly.
          </p>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="close-done-btn" (click)="close.emit()">
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      width: 100%;
      max-width: 420px;
      background: var(--ts-surface-raised, #141416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      text-align: center;
    }

    :host-context([data-theme="light"]) .modal-card,
    [data-theme="light"] .modal-card {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px 14px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      text-align: left;
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    .header-icon-cluster {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-icon-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 12%, transparent));
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .modal-icon-badge,
    [data-theme="light"] .modal-icon-badge {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 10%, transparent);
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

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      margin: 2px 0 0;
    }

    :host-context([data-theme="light"]) .modal-subtitle,
    [data-theme="light"] .modal-subtitle {
      color: #64748B;
    }

    .modal-close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .modal-close-btn,
    [data-theme="light"] .modal-close-btn {
      color: #64748B;
    }

    .modal-close-btn:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .modal-close-btn:hover,
    [data-theme="light"] .modal-close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .modal-body {
      padding: 24px 20px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .qr-canvas-container {
      width: 220px;
      height: 220px;
      padding: 12px;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-image {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 8px;
    }

    .qr-loading-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      color: #64748B;
      font-size: 13px;
    }

    .email-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      padding: 8px 12px;
      border-radius: 10px;
      max-width: 100%;
    }

    :host-context([data-theme="light"]) .email-pill,
    [data-theme="light"] .email-pill {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
    }

    .email-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #FFFFFF);
      word-break: break-all;
    }

    :host-context([data-theme="light"]) .email-text,
    [data-theme="light"] .email-text {
      color: #0F172A;
    }

    .copy-mini-btn {
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 12%, transparent));
      border: 1px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 25%, transparent));
      color: var(--accent-strong, #60A5FA);
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .copy-mini-btn,
    [data-theme="light"] .copy-mini-btn {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 10%, transparent);
      border-color: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 30%, transparent);
      color: #1D4ED8;
      font-weight: 700;
    }

    .copy-mini-btn:hover {
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
    }

    .qr-instructions {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      line-height: 1.4;
      margin: 0;
    }

    :host-context([data-theme="light"]) .qr-instructions,
    [data-theme="light"] .qr-instructions {
      color: #475569;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      justify-content: flex-end;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }

    .close-done-btn {
      height: 36px;
      padding: 0 20px;
      border-radius: 8px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: var(--text, #FFFFFF);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .close-done-btn,
    [data-theme="light"] .close-done-btn {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0F172A;
    }

    .close-done-btn:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .close-done-btn:hover,
    [data-theme="light"] .close-done-btn:hover {
      background: #F1F5F9;
      color: #000000;
    }

    .spinner-circle-sm {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: #2563EB;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class QrModalComponent implements OnInit {
  readonly address = input.required<string>();
  readonly close = output<void>();

  readonly qrDataUrl = signal<string | null>(null);
  readonly copied = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    try {
      const qrcode = await import('qrcode');
      const url = await qrcode.toDataURL(this.address(), {
        width: 240,
        margin: 1,
        color: {
          dark: '#100C1A',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      this.qrDataUrl.set(url);
    } catch (e) {
      console.warn('Could not generate QR code:', e);
    }
  }

  async copyAddress(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.address());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  }
}
