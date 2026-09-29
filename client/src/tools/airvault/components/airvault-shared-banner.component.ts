import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultSharedClipboardService } from '../services/airvault-shared-clipboard.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';

@Component({
  selector: 'app-airvault-shared-banner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (sharedService.isViewingSharedLink()) {
      
      @if (sharedService.sharedError() === 'expired') {
        <!-- Expired Link State -->
        <div class="shared-banner-wrapper">
          <div class="shared-expired-card">
            <div class="expired-icon-box">
              <app-icon name="clock" class="icon-sm text-amber"></app-icon>
            </div>
            <div class="expired-text-col">
              <h3 class="expired-title">This Shared Clipboard Link Has Expired</h3>
              <p class="expired-desc">
                This link is no longer accessible because its retention period has ended. Ask the board owner to generate a fresh link or open your own AirVault.
              </p>
            </div>
            <button class="btn-return-my-vault" (click)="returnToMyVault()">
              <app-icon name="arrow-left" class="icon-xs"></app-icon>
              <span>Open My Personal AirVault</span>
            </button>
          </div>
        </div>
      } @else if (sharedService.sharedError() === 'not_found') {
        <!-- Not Found State -->
        <div class="shared-banner-wrapper">
          <div class="shared-expired-card">
            <div class="expired-icon-box">
              <app-icon name="alert-circle" class="icon-sm text-red"></app-icon>
            </div>
            <div class="expired-text-col">
              <h3 class="expired-title">Clipboard Board Not Found</h3>
              <p class="expired-desc">
                We couldn't find a clipboard matching this link ID. It may have been removed or the link is incorrect.
              </p>
            </div>
            <button class="btn-return-my-vault" (click)="returnToMyVault()">
              <app-icon name="arrow-left" class="icon-xs"></app-icon>
              <span>Open My Personal AirVault</span>
            </button>
          </div>
        </div>
      } @else if (sharedService.sharedClipboard(); as shared) {
        <!-- Standard Aligned Floating Pill Banner -->
        <div class="shared-banner-dock">
          <div class="shared-banner-pill">
            
            <!-- Left: Icon & Board Info -->
            <div class="banner-pill-left">
              <div class="shared-icon-bubble">
                <app-icon name="globe" class="icon-xs text-accent"></app-icon>
              </div>
              <div class="shared-info-group">
                <div class="shared-title-line">
                  <span class="shared-label">Shared Clipboard</span>
                  <span class="shared-slug">#{{ shared.id }}</span>
                </div>
                <span class="shared-by-text">
                  Shared by <strong class="owner-highlight">&#64;{{ shared.ownerUsername || 'VaultOwner' }}</strong>
                </span>
              </div>
            </div>

            <!-- Center: Status Pills -->
            <div class="banner-pill-center">
              @if (shared.accessMode === 'read-write') {
                <span class="status-capsule mode-rw" title="You have permission to edit and add clipboard items">
                  <app-icon name="notebook-pen" class="icon-xxs"></app-icon>
                  <span>Read & Write</span>
                </span>
              } @else {
                <span class="status-capsule mode-ro" title="View, copy, and download only">
                  <app-icon name="lock" class="icon-xxs"></app-icon>
                  <span>Read-Only</span>
                </span>
              }

              <span class="status-capsule mode-active" title="Clipboard is live and synced">
                <span class="live-dot"></span>
                <span>Active</span>
              </span>
            </div>

            <!-- Right: Action Bubble Group with Hover Expansion -->
            <div class="banner-pill-right">
              
              <!-- Copy Link Bubble Action -->
              <button 
                type="button"
                class="bubble-btn copy-bubble" 
                (click)="copyLink()" 
                [title]="copied() ? 'Link copied to clipboard!' : 'Copy shared link'">
                <div class="bubble-icon-wrap">
                  <app-icon [name]="copied() ? 'check' : 'copy'" class="icon-xs" [class.text-emerald]="copied()"></app-icon>
                </div>
                <span class="bubble-label">{{ copied() ? 'Copied' : 'Copy Link' }}</span>
              </button>

              <!-- Pair Device Bubble Action -->
              <button 
                type="button"
                class="bubble-btn pair-bubble" 
                (click)="openPairWithOwner()" 
                [title]="'Pair with @' + (shared.ownerUsername || 'Owner') + ' for permanent two-way sync'">
                <div class="bubble-icon-wrap">
                  <app-icon name="smartphone" class="icon-xs text-emerald"></app-icon>
                </div>
                <span class="bubble-label">Pair with &#64;{{ shared.ownerUsername || 'Owner' }}</span>
              </button>

              <!-- My Vault Exit Bubble Action -->
              <button 
                type="button"
                class="bubble-btn exit-bubble" 
                (click)="returnToMyVault()" 
                title="Exit shared view and return to my personal clipboard">
                <div class="bubble-icon-wrap">
                  <app-icon name="log-out" class="icon-xs"></app-icon>
                </div>
                <span class="bubble-label">My Vault</span>
              </button>

            </div>

          </div>
        </div>
      }
    }
  `,
  styles: [`
    @import '../airvault.shared.css';

    :host {
      display: block;
      width: 100%;
      position: relative;
      z-index: 25;
    }

    /* ── Floating Banner Dock Container (Anchored in bottom composer area) ── */
    .shared-banner-dock {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 6px 12px 10px;
      box-sizing: border-box;
      pointer-events: auto;
      animation: av-dock-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes av-dock-slide-in {
      from { transform: translateY(12px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ── Main Sleek Pill (App Standard Card / Capsule) ── */
    .shared-banner-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      max-width: 820px;
      min-height: 46px;
      padding: 6px 16px 6px 8px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-pill, 9999px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28), var(--av-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-sizing: border-box;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    :host-context([data-theme="light"]) .shared-banner-pill {
      background: #ffffff;
      border-color: rgba(33, 150, 243, 0.35);
      box-shadow: 0 8px 28px rgba(16, 24, 40, 0.12), 0 1px 2px rgba(16, 24, 40, 0.04);
    }

    :host-context([data-theme="dark"]) .shared-banner-pill {
      background: #111419;
      border-color: rgba(33, 150, 243, 0.3);
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.55);
    }

    /* ── Left Info ── */
    .banner-pill-left {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
      flex-shrink: 0;
    }

    .shared-icon-bubble {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.24);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .shared-banner-pill:hover .shared-icon-bubble {
      transform: scale(1.05);
    }

    .shared-info-group {
      display: flex;
      flex-direction: column;
      gap: 1px;
      line-height: 1.2;
    }

    .shared-title-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .shared-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--av-accent, #2196F3);
      font-family: var(--av-font-ui);
    }

    :host-context([data-theme="dark"]) .shared-label {
      color: #60A5FA;
    }

    .shared-slug {
      font-family: var(--av-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-muted, #64748b);
      background: var(--av-surface-secondary, #F1F3F6);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid var(--av-border, #E4E7EC);
    }

    .shared-by-text {
      font-size: 11px;
      color: var(--av-text-muted, #64748b);
      white-space: nowrap;
    }

    .owner-highlight {
      color: var(--av-accent, #2196F3);
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .owner-highlight {
      color: #38BDF8;
    }

    /* ── Center Status Capsules ── */
    .banner-pill-center {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .status-capsule {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 24px;
      padding: 0 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      font-family: var(--av-font-ui);
      letter-spacing: 0.01em;
      box-sizing: border-box;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .mode-ro {
      background: rgba(33, 150, 243, 0.08);
      border: 1px solid rgba(33, 150, 243, 0.25);
      color: #1E40AF;
    }

    :host-context([data-theme="dark"]) .mode-ro {
      background: rgba(33, 150, 243, 0.12);
      border-color: rgba(33, 150, 243, 0.3);
      color: #93C5FD;
    }

    .mode-rw {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #065F46;
    }

    :host-context([data-theme="dark"]) .mode-rw {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
      color: #6EE7B7;
    }

    .mode-active {
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      color: var(--av-text-muted);
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
      animation: pulseDot 2s infinite ease-in-out;
    }

    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }

    /* ── Right Bubble Actions (Image 3 Style with Bubble Hover Ride) ── */
    .banner-pill-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .bubble-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border-radius: var(--av-radius-pill, 9999px);
      font-size: 11.5px;
      font-weight: 600;
      font-family: var(--av-font-ui);
      cursor: pointer;
      border: 1px solid var(--av-border);
      background: var(--av-surface-secondary);
      color: var(--av-text-primary);
      box-sizing: border-box;
      white-space: nowrap;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bubble-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bubble-label {
      line-height: 1;
      transition: color 0.18s ease;
    }

    /* Bubble Hover Dynamics */
    .bubble-btn:hover {
      transform: translateY(-1px) scale(1.02);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    }

    .bubble-btn:hover .bubble-icon-wrap {
      transform: scale(1.12);
    }

    .bubble-btn:active {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    /* Copy Button Variant */
    .copy-bubble:hover {
      border-color: rgba(33, 150, 243, 0.4);
      background: rgba(33, 150, 243, 0.08);
      color: var(--av-accent, #2196F3);
    }

    /* Pair Button Variant (Signature Emerald / Accent Pill) */
    .pair-bubble {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.28);
      color: #047857;
    }

    :host-context([data-theme="dark"]) .pair-bubble {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.32);
      color: #34D399;
    }

    .pair-bubble:hover {
      background: rgba(16, 185, 129, 0.16);
      border-color: #10B981;
      color: #065F46;
      box-shadow: 0 3px 12px rgba(16, 185, 129, 0.2);
    }

    :host-context([data-theme="dark"]) .pair-bubble:hover {
      background: rgba(16, 185, 129, 0.22);
      color: #6EE7B7;
      box-shadow: 0 3px 12px rgba(16, 185, 129, 0.3);
    }

    /* Exit / Return Button Variant */
    .exit-bubble {
      color: var(--av-text-muted);
    }

    .exit-bubble:hover {
      color: var(--av-danger, #E5484D);
      border-color: rgba(229, 72, 77, 0.35);
      background: var(--av-danger-soft, rgba(229, 72, 77, 0.08));
    }

    /* ── Expired / Error Banner Wrapper ── */
    .shared-banner-wrapper {
      padding: 16px 20px;
      display: flex;
      justify-content: center;
      width: 100%;
      box-sizing: border-box;
    }

    .shared-expired-card {
      max-width: 480px;
      width: 100%;
      padding: 24px 20px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg, 12px);
      box-shadow: var(--av-shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.12));
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      animation: scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .expired-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .expired-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-primary);
      margin: 0;
    }

    .expired-desc {
      font-size: 12px;
      color: var(--av-text-muted);
      line-height: 1.45;
      margin: 0;
    }

    .btn-return-my-vault {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 16px;
      background: var(--av-accent, #2196F3);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      border: none;
      border-radius: var(--av-radius-sm, 6px);
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(33, 150, 243, 0.25);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-return-my-vault:hover {
      background: var(--av-accent-hover, #1976D2);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(33, 150, 243, 0.35);
    }

    /* Helper Colors */
    .text-accent { color: var(--av-accent, #2196F3); }
    .text-emerald { color: #10B981; }
    .text-amber { color: #F59E0B; }
    .text-red { color: var(--av-danger, #E5484D); }

    /* Animations */
    @keyframes bannerSlideIn {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.96) translateY(6px); opacity: 0; }
      to { transform: scale(1) translateY(0); opacity: 1; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .shared-banner-pill {
        flex-wrap: wrap;
        border-radius: var(--av-radius-md, 8px);
        padding: 8px 10px;
        gap: 8px;
      }
      .banner-pill-center {
        display: none;
      }
      .banner-pill-right {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultSharedBannerComponent {
  sharedService = inject(AirVaultSharedClipboardService);
  uiStore = inject(AirVaultUIStore);

  copied = signal<boolean>(false);

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.sharedService.getShareableUrl());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    } catch {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    }
  }

  openPairWithOwner() {
    this.uiStore.showPairingModal.set(true);
  }

  returnToMyVault() {
    this.sharedService.exitSharedView();
  }
}

