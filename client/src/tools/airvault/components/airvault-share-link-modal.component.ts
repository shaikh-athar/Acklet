import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultSharedClipboardService } from '../services/airvault-shared-clipboard.service';
import { AirVaultDeviceStore } from '../services/airvault-device.store';
import { AirVaultUIStore } from '../services/airvault-ui.store';

@Component({
  selector: 'app-airvault-share-link-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="share-modal-backdrop" [class.is-closing]="isClosing()" (click)="onDismiss()" (keydown.escape)="onDismiss()">
      <div class="share-modal-container" [class.is-closing]="isClosing()" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="share-modal-header">
          <div class="share-header-title-group">
            <div class="share-icon-badge">
              <app-icon name="share-2" class="icon-sm text-cyan"></app-icon>
            </div>
            <div>
              <h2 class="share-modal-title">Share Clipboard Link</h2>
              <p class="share-modal-subtitle">Instant link access · No login or pairing required</p>
            </div>
          </div>
          <button class="share-close-btn" (click)="onDismiss()" aria-label="Close">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>

        <!-- Distinct Concept Explainer Banner -->
        <div class="share-explainer-banner">
          <div class="explainer-icon-col">
            <app-icon name="info" class="icon-xs text-cyan"></app-icon>
          </div>
          <div class="explainer-text-col">
            <strong>Link Access vs Device Pairing</strong>
            <p>
              Anyone with this link can view this specific board. To enable <strong>automatic multi-device sync</strong> across your own devices, use <em>Pair Device</em> instead.
            </p>
          </div>
        </div>

        <!-- Shareable Link Copy Box -->
        <div class="share-link-section">
          <label class="share-field-label">SHAREABLE CLIPBOARD URL</label>
          <div class="share-link-input-row">
            <div class="share-link-display-box">
              <app-icon name="globe" class="icon-xs link-prefix-icon"></app-icon>
              <span class="share-url-text">{{ shareableUrl() }}</span>
            </div>
            <button
              class="share-copy-btn"
              [class.copied]="copied()"
              (click)="copyLink()"
              [attr.data-tooltip]="copied() ? 'Copied!' : 'Copy to clipboard'">
              @if (copied()) {
                <app-icon name="check" class="icon-xs text-green"></app-icon>
                <span>Copied</span>
              } @else {
                <app-icon name="copy" class="icon-xs"></app-icon>
                <span>Copy Link</span>
              }
            </button>
          </div>
        </div>

        <!-- Access Permissions Selector -->
        <div class="share-permissions-section">
          <label class="share-field-label">ACCESS PERMISSIONS</label>
          <div class="permission-options-grid">
            
            <!-- Option 1: Read-Only (Default) -->
            <button
              type="button"
              class="permission-card"
              [class.is-active]="sharedService.myAccessMode() === 'read-only'"
              (click)="setAccessMode('read-only')">
              <div class="permission-radio-indicator">
                <div class="radio-inner-dot"></div>
              </div>
              <div class="permission-text-col">
                <div class="permission-title-row">
                  <app-icon name="lock" class="icon-xxs text-cyan"></app-icon>
                  <span class="permission-title">Read-Only</span>
                  <span class="permission-tag-pill default-pill">Default</span>
                </div>
                <p class="permission-desc">Anyone with the link can view & copy items, but cannot add or modify content.</p>
              </div>
            </button>

            <!-- Option 2: Read & Write -->
            <button
              type="button"
              class="permission-card"
              [class.is-active]="sharedService.myAccessMode() === 'read-write'"
              (click)="setAccessMode('read-write')">
              <div class="permission-radio-indicator">
                <div class="radio-inner-dot"></div>
              </div>
              <div class="permission-text-col">
                <div class="permission-title-row">
                  <app-icon name="notebook-pen" class="icon-xxs text-green"></app-icon>
                  <span class="permission-title">Read & Write (Collaborative)</span>
                </div>
                <p class="permission-desc">Anyone with the link can add text and files. Contributed items are attributed to Guest.</p>
              </div>
            </button>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 9998;
    }

    .share-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 12, 0.76);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: modalFadeIn 0.60s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .share-modal-backdrop.is-closing {
      animation: modalFadeOut 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .share-modal-container {
      background: var(--av-surface-primary, #ffffff);
      border: 1px solid var(--av-border, #e2e8f0);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(33, 150, 243, 0.14);
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 22px;
      box-sizing: border-box;
      animation: modalScaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .share-modal-container.is-closing {
      animation: modalScaleOut 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    :host-context([data-theme="dark"]) .share-modal-container {
      background: #0d1117;
      border-color: #21262d;
      box-shadow: 0 28px 72px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(33, 150, 243, 0.22);
    }

    .share-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .share-header-title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .share-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.26);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.12);
    }

    .share-modal-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--av-text-primary, #0f172a);
      margin: 0;
      letter-spacing: -0.01em;
    }

    .share-modal-subtitle {
      font-size: 12px;
      color: var(--av-text-muted, #64748b);
      margin: 2px 0 0;
    }

    .share-close-btn {
      background: transparent;
      border: none;
      color: var(--av-text-muted, #64748b);
      cursor: pointer;
      padding: 6px;
      border-radius: 7px;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .share-close-btn:hover {
      background: var(--av-surface-secondary, #f1f5f9);
      color: var(--av-text-primary, #0f172a);
    }

    /* Explainer banner */
    .share-explainer-banner {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(33, 150, 243, 0.03) 100%);
      border: 1px solid rgba(33, 150, 243, 0.22);
      font-size: 12px;
      line-height: 1.45;
    }

    .explainer-icon-col {
      margin-top: 1px;
      flex-shrink: 0;
    }

    .explainer-text-col strong {
      color: #2563eb;
      font-weight: 700;
      display: block;
      margin-bottom: 3px;
    }

    :host-context([data-theme="dark"]) .explainer-text-col strong {
      color: #93c5fd;
    }

    .explainer-text-col p {
      margin: 0;
      color: var(--av-text-muted, #64748b);
    }

    .explainer-text-col em {
      color: var(--av-text-primary, #0f172a);
      font-style: normal;
      font-weight: 700;
    }

    :host-context([data-theme="dark"]) .explainer-text-col em {
      color: #f0f3f6;
    }

    /* Link row */
    .share-field-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: var(--av-text-muted, #64748b);
      margin-bottom: 6px;
      display: block;
      text-transform: uppercase;
    }

    .share-link-input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .share-link-display-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--av-surface-secondary, #f8fafc);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 9px;
      padding: 9px 12px;
      overflow: hidden;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .share-link-display-box {
      background: #161b22;
      border-color: #30363d;
    }

    .link-prefix-icon {
      color: #2563eb;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .link-prefix-icon {
      color: #38bdf8;
    }

    .share-url-text {
      font-family: var(--av-font-mono, monospace);
      font-size: 12.5px;
      font-weight: 600;
      color: var(--av-text-primary, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: all;
    }

    .share-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      background: #2563eb;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      flex-shrink: 0;
    }

    .share-copy-btn:hover {
      background: #1d4ed8;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.38);
    }

    .share-copy-btn:active {
      transform: translateY(0);
    }

    .share-copy-btn.copied {
      background: rgba(16, 185, 129, 0.18);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.4);
      box-shadow: none;
    }

    /* Permission selector */
    .permission-options-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .permission-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 13px;
      background: var(--av-surface-secondary, #f8fafc);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 10px;
      cursor: pointer;
      text-align: left;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
    }

    :host-context([data-theme="dark"]) .permission-card {
      background: #161b22;
      border-color: #30363d;
    }

    .permission-card:hover {
      border-color: rgba(33, 150, 243, 0.45);
      background: var(--av-surface-elevated, #ffffff);
      transform: translateY(-1px);
    }

    :host-context([data-theme="dark"]) .permission-card:hover {
      background: #21262d;
    }

    .permission-card.is-active {
      border-color: #2563eb;
      background: rgba(37, 99, 235, 0.07);
      box-shadow: 0 0 0 1px #2563eb, 0 4px 14px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .permission-card.is-active {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      box-shadow: 0 0 0 1px #38bdf8, 0 4px 16px rgba(56, 189, 248, 0.16);
    }

    .permission-radio-indicator {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1.5px solid var(--av-border, #94a3b8);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .permission-card.is-active .permission-radio-indicator {
      border-color: #2563eb;
    }

    :host-context([data-theme="dark"]) .permission-card.is-active .permission-radio-indicator {
      border-color: #38bdf8;
    }

    .radio-inner-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: transparent;
      transition: all 0.15s ease;
    }

    .permission-card.is-active .radio-inner-dot {
      background: #2563eb;
    }

    :host-context([data-theme="dark"]) .permission-card.is-active .radio-inner-dot {
      background: #38bdf8;
    }

    .permission-text-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .icon-xxs { width: 12px; height: 12px; }
    .icon-xs { width: 13px; height: 13px; }
    .icon-sm { width: 15px; height: 15px; }
    .icon-md { width: 18px; height: 18px; }

    .permission-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      line-height: 1;
    }

    .permission-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--av-text-primary, #0f172a);
    }

    .permission-tag-pill {
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 7px;
      border-radius: 4px;
    }

    .default-pill {
      background: rgba(33, 150, 243, 0.12);
      color: #2563eb;
      border: 1px solid rgba(33, 150, 243, 0.28);
    }

    :host-context([data-theme="dark"]) .default-pill {
      color: #93c5fd;
    }

    .permission-desc {
      font-size: 12px;
      color: var(--av-text-muted, #64748b);
      margin: 0;
      line-height: 1.45;
    }

    /* Meta row */
    .share-footer-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 4px 0;
      border-top: 1px solid var(--av-border, #e2e8f0);
      font-size: 11.5px;
      color: var(--av-text-muted, #64748b);
      flex-wrap: wrap;
    }

    :host-context([data-theme="dark"]) .share-footer-meta-row {
      border-top-color: #21262d;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Modal footer */
    .share-modal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }

    .share-done-btn {
      padding: 8px 24px;
      background: var(--av-surface-secondary, #f1f5f9);
      border: 1px solid var(--av-border, #cbd5e1);
      border-radius: 8px;
      color: var(--av-text-primary, #0f172a);
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="dark"]) .share-done-btn {
      background: #161b22;
      border-color: #30363d;
      color: #f0f3f6;
    }

    .share-done-btn:hover {
      background: var(--av-surface-elevated, #ffffff);
      border-color: #2563eb;
      transform: translateY(-1px);
    }

    :host-context([data-theme="dark"]) .share-done-btn:hover {
      background: #21262d;
      border-color: #38bdf8;
    }

    .text-cyan { color: #0284c7; }
    :host-context([data-theme="dark"]) .text-cyan { color: #38bdf8; }
    .text-green { color: #059669; }
    :host-context([data-theme="dark"]) .text-green { color: #10b981; }
    .text-emerald { color: #059669; }
    :host-context([data-theme="dark"]) .text-emerald { color: #34d399; }
    .text-muted { color: #64748b; }
    :host-context([data-theme="dark"]) .text-muted { color: #8b949e; }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes modalScaleIn {
      from { opacity: 0; transform: scale(0.95) translateY(12px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes modalScaleOut {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.95) translateY(10px); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultShareLinkModalComponent {
  sharedService = inject(AirVaultSharedClipboardService);
  deviceStore = inject(AirVaultDeviceStore);
  uiStore = inject(AirVaultUIStore);

  close = output<void>();

  isClosing = signal<boolean>(false);

  onDismiss(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 260);
  }

  copied = signal<boolean>(false);

  shareableUrl = computed(() => this.sharedService.getShareableUrl());

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.shareableUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    } catch {
      // Fallback
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    }
  }

  setAccessMode(mode: 'read-only' | 'read-write') {
    this.sharedService.setAccessMode(mode);
  }
}
