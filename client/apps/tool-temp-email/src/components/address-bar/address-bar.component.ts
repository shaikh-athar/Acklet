// apps/tool-temp-email/src/components/address-bar/address-bar.component.ts
import { Component, input, output, signal, ElementRef, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { MailAccount } from '../../models/temp-email.models';

@Component({
  selector: 'app-address-bar',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="address-bar-root" role="region" aria-label="Temporary Email Address Management">
      
      <!-- Main Address Hero Card -->
      <div class="address-hero-card">
        <!-- Left: Address Display & Inboxes Dropdown -->
        <div class="address-cluster">
          <div class="cluster-meta-row">
            <span class="cluster-label">Your Disposable Address:</span>

            <!-- Expiry Countdown Pill with Extend/New actions -->
            <div class="expiry-indicator-pill" [class.is-expired]="isExpired()">
              <ts-icon name="clock" [size]="12" class="expiry-clock-icon" />
              <span class="expiry-text">{{ isExpired() ? 'Inbox Expired' : ('Expires in ' + timeUntilExpiry()) }}</span>
              @if (!isExpired()) {
                <button
                  type="button"
                  class="expiry-action-chip btn-accent-chip"
                  (click)="extendExpiry.emit()"
                  title="Extend inbox expiry by 24 hours"
                  aria-label="Extend inbox expiry"
                >
                  Extend
                </button>
              } @else {
                <button
                  type="button"
                  class="expiry-action-chip is-new btn-accent-chip"
                  (click)="generateNew.emit()"
                  title="Generate a new temporary address"
                  aria-label="New temporary address"
                >
                  New
                </button>
              }
            </div>

            <!-- Notification & Sound Toggles -->
            <div class="alert-toggles-cluster">
              <button
                type="button"
                class="alert-toggle-btn"
                [class.is-active]="soundEnabled()"
                (click)="toggleSound.emit()"
                [title]="soundEnabled() ? 'Mute notification sound' : 'Enable notification sound'"
                aria-label="Toggle notification sound"
              >
                <ts-icon [name]="soundEnabled() ? 'volume-2' : 'volume-x'" [size]="13" />
              </button>

              <button
                type="button"
                class="alert-toggle-btn"
                [class.is-active]="browserAlertsEnabled()"
                (click)="toggleAlerts.emit()"
                [title]="browserAlertsEnabled() ? 'Browser alerts on (click to disable)' : 'Enable browser alerts for new emails'"
                aria-label="Toggle browser alerts"
              >
                <ts-icon [name]="browserAlertsEnabled() ? 'bell' : 'bell-off'" [size]="13" />
              </button>
            </div>
          </div>
          
          <div class="address-pill-box-container">
            <div 
              class="address-pill-box"
              [class.is-copied]="copied()"
              [class.has-dropdown-open]="isDropdownOpen()"
            >
              <span class="email-icon">
                <ts-icon name="mail" [size]="18" />
              </span>

              <div 
                class="email-address-wrapper is-clickable"
                (click)="toggleDropdown($event)"
                title="{{ inboxes().length > 1 ? 'Click to switch active inbox (' + inboxes().length + ' active)' : 'Manage inboxes' }}"
              >
                <span class="email-address font-mono">
                  @if (isGenerating()) {
                    <span class="address-loading-pulse">Generating temporary address...</span>
                  } @else {
                    {{ activeAccount()?.address || 'No active address' }}
                  }
                </span>

                <!-- Dropdown Open/Close Trigger Icon -->
                <button
                  type="button"
                  class="inbox-dropdown-toggle-btn btn-accent-chip"
                  [class.is-open]="isDropdownOpen()"
                  (click)="toggleDropdown($event)"
                  [attr.aria-expanded]="isDropdownOpen()"
                  title="{{ isDropdownOpen() ? 'Close mailbox menu' : 'Switch or manage active inboxes (' + inboxes().length + ' active)' }}"
                  aria-label="Toggle mailbox dropdown"
                >
                  @if (inboxes().length > 1) {
                    <span class="inbox-count-badge">{{ inboxes().length }}</span>
                  }
                  <ts-icon [name]="isDropdownOpen() ? 'chevron-up' : 'chevron-down'" [size]="13" />
                </button>
              </div>

              <!-- Copy Address Action -->
              <button
                type="button"
                class="copy-indicator-badge btn-accent-chip"
                [class.is-copied]="copied()"
                (click)="copyAddress($event)"
                title="Click to copy address"
                tabindex="0"
                [attr.aria-label]="'Copy email address ' + (activeAccount()?.address || '')"
              >
                <ts-icon [name]="copied() ? 'check' : 'copy'" [size]="15" />
                <span class="indicator-text hide-on-mobile-copy-text">{{ copied() ? 'Copied!' : 'Copy' }}</span>
              </button>
            </div>

            <!-- Inboxes Dropdown Panel Anchored Directly Beneath Active Address -->
            @if (isDropdownOpen()) {
              <div class="inboxes-dropdown-panel" role="menu" (click)="$event.stopPropagation()">
                <div class="dropdown-header">
                  <div class="dropdown-header-title">
                    <ts-icon name="mail" [size]="14" />
                    <span>Active Inboxes ({{ inboxes().length }}/5)</span>
                  </div>
                  <button
                    type="button"
                    class="dropdown-close-btn"
                    (click)="closeDropdown()"
                    title="Close dropdown"
                    aria-label="Close dropdown"
                  >
                    <ts-icon name="x" [size]="13" />
                  </button>
                </div>

                <div class="dropdown-items-list" role="listbox">
                  @for (acc of inboxes(); track acc.id; let i = $index) {
                    <div
                      class="dropdown-item-row"
                      [class.is-active]="acc.id === activeAccount()?.id"
                      role="option"
                      [attr.aria-selected]="acc.id === activeAccount()?.id"
                      (click)="onSelectInbox(acc.id)"
                    >
                      <div class="item-left">
                        <span class="item-status-icon">
                          @if (acc.id === activeAccount()?.id) {
                            <ts-icon name="check" [size]="14" />
                          } @else {
                            <span class="inactive-bullet"></span>
                          }
                        </span>
                        <div class="item-details">
                          <div class="item-label-line">
                            <span class="item-title">{{ acc.label || ('Inbox ' + (i + 1)) }}</span>
                            @if (acc.id === activeAccount()?.id) {
                              <span class="item-badge-active">Active</span>
                            }
                          </div>
                          <span class="item-full-addr font-mono">{{ acc.address }}</span>
                        </div>
                      </div>

                      @if (inboxes().length > 1) {
                        <button
                          type="button"
                          class="item-delete-btn"
                          (click)="onDeleteInboxFromDropdown(acc.id, $event)"
                          title="Delete this inbox"
                          aria-label="Delete this inbox"
                        >
                          <ts-icon name="trash" [size]="13" />
                        </button>
                      }
                    </div>
                  }
                </div>

                <div class="dropdown-footer">
                  <button
                    type="button"
                    class="dropdown-action-btn"
                    (click)="onNewFromDropdown()"
                    [disabled]="inboxes().length >= 5"
                    title="Generate another new temporary inbox"
                  >
                    <ts-icon name="plus" [size]="13" />
                    <span>New Random</span>
                  </button>

                  <button
                    type="button"
                    class="dropdown-action-btn"
                    (click)="onCustomFromDropdown()"
                    [disabled]="inboxes().length >= 5"
                    title="Create custom address with chosen username"
                  >
                    <ts-icon name="pencil" [size]="13" />
                    <span>Custom Address</span>
                  </button>
                </div>

                <div class="dropdown-wipe-section">
                  <button
                    type="button"
                    class="dropdown-wipe-btn"
                    (click)="onOpenWipeModal()"
                    title="Clear all inboxes, emails, and data from this browser"
                  >
                    <ts-icon name="trash" [size]="12" />
                    <span>Wipe Everything (Privacy Reset)</span>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right: Action Buttons Group (Never hidden on hover!) -->
        <div class="actions-cluster">
          <!-- Refresh Button -->
          <button
            type="button"
            class="action-btn refresh-btn"
            (click)="refresh.emit()"
            [disabled]="isRefreshing()"
            title="Check for new emails"
            aria-label="Refresh inbox"
          >
            <ts-icon name="refresh" [size]="15" [class.spinning]="isRefreshing()" />
            <span class="btn-text hide-mobile-btn-text">Refresh</span>
          </button>

          <!-- Change / Custom Address -->
          <button
            type="button"
            class="action-btn custom-btn"
            (click)="openCustomModal.emit()"
            [disabled]="isGenerating()"
            title="Create a custom address with your choice of username"
            aria-label="Create custom address"
          >
            <ts-icon name="pencil" [size]="15" />
            <span class="btn-text hide-mobile-btn-text">Custom</span>
          </button>

          <!-- New Random Address -->
          <button
            type="button"
            class="action-btn new-btn"
            (click)="generateNew.emit()"
            [disabled]="isGenerating()"
            title="Generate another new temporary email"
            aria-label="Generate new address"
          >
            <ts-icon name="plus" [size]="15" />
            <span class="btn-text hide-mobile-btn-text">New</span>
          </button>

          <!-- QR Code Button -->
          <button
            type="button"
            class="action-btn qr-btn"
            (click)="openQrModal.emit()"
            [disabled]="!activeAccount()"
            title="Scan QR Code to open this address on your phone"
            aria-label="Show QR code"
          >
            <ts-icon name="qr-code" [size]="15" />
            <span class="btn-text hide-mobile-btn-text">QR Code</span>
          </button>

          <!-- Delete Inbox Button -->
          <button
            type="button"
            class="action-btn delete-btn"
            (click)="deleteInbox.emit()"
            [disabled]="!activeAccount()"
            title="Permanently delete this inbox and its messages"
            aria-label="Delete this inbox"
          >
            <ts-icon name="trash" [size]="15" />
            <span class="btn-text hide-mobile-btn-text">Delete</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .address-bar-root {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    /* Main Hero Card */
    .address-hero-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      margin-top: 4px;
      background: var(--ts-surface-raised, #141416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-inner, 16px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .address-hero-card,
    [data-theme="light"] .address-hero-card {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
    }

    .address-cluster {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1 1 auto;
      min-width: min(100%, 320px);
    }

    .cluster-meta-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 2px;
    }

    .cluster-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted, #94A3B8);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    :host-context([data-theme="light"]) .cluster-label,
    [data-theme="light"] .cluster-label {
      color: #334155;
    }

    /* Expiry countdown indicator pill */
    .expiry-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 9999px;
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border: 1px solid var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
      font-size: 11px;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .expiry-indicator-pill,
    [data-theme="light"] .expiry-indicator-pill {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    .expiry-indicator-pill.is-expired {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.3);
      color: #F87171;
    }

    :host-context([data-theme="light"]) .expiry-indicator-pill.is-expired,
    [data-theme="light"] .expiry-indicator-pill.is-expired {
      background: #FEE2E2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    .expiry-clock-icon {
      flex-shrink: 0;
      opacity: 0.85;
    }

    .expiry-action-chip {
      background: var(--tool-accent, var(--accent)) !important;
      border: 1px solid transparent !important;
      color: var(--tool-accent-ink, #FFFFFF) !important;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      line-height: 1.2;
    }

    .expiry-action-chip:hover {
      background: var(--tool-accent-hover, var(--accent-hover)) !important;
      color: var(--tool-accent-ink, #FFFFFF) !important;
      transform: translateY(-0.5px);
    }

    :host-context([data-theme="light"]) .expiry-action-chip,
    [data-theme="light"] .expiry-action-chip {
      background: var(--tool-accent, var(--accent)) !important;
      border-color: var(--tool-accent-hover, var(--accent-hover)) !important;
      color: var(--tool-accent-ink, #FFFFFF) !important;
    }

    :host-context([data-theme="light"]) .expiry-action-chip:hover,
    [data-theme="light"] .expiry-action-chip:hover {
      background: var(--tool-accent-hover, var(--accent-hover)) !important;
      border-color: var(--tool-accent-hover, var(--accent-hover)) !important;
      color: var(--tool-accent-ink, #FFFFFF) !important;
      box-shadow: 0 2px 6px var(--tool-accent-glow, var(--accent-glow));
    }

    .expiry-action-chip.is-new {
      background: #EF4444 !important;
      border-color: #DC2626 !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .expiry-action-chip.is-new,
    [data-theme="light"] .expiry-action-chip.is-new {
      background: #DC2626 !important;
      border-color: #B91C1C !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .expiry-action-chip.is-new:hover,
    [data-theme="light"] .expiry-action-chip.is-new:hover {
      background: #B91C1C !important;
      border-color: #991B1B !important;
      color: #FFFFFF !important;
    }

    /* Notification & Sound toggles */
    .alert-toggles-cluster {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
    }

    .alert-toggle-btn {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: all 0.15s;
    }

    :host-context([data-theme="light"]) .alert-toggle-btn,
    [data-theme="light"] .alert-toggle-btn {
      border-color: #CBD5E1;
      color: #64748B;
      background: #F8FAFC;
    }

    .alert-toggle-btn:hover {
      color: var(--text, #FFFFFF);
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border-focus, rgba(255, 255, 255, 0.25));
    }

    :host-context([data-theme="light"]) .alert-toggle-btn:hover,
    [data-theme="light"] .alert-toggle-btn:hover {
      color: #0F172A;
      background: #EDF2F7;
      border-color: #94A3B8;
    }

    .alert-toggle-btn.is-active {
      color: var(--accent-strong, #60A5FA);
      border-color: var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 35%, transparent));
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 15%, transparent));
    }

    :host-context([data-theme="light"]) .alert-toggle-btn.is-active,
    [data-theme="light"] .alert-toggle-btn.is-active {
      color: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent-border, color-mix(in srgb, var(--tool-accent, #2563EB) 28%, transparent));
      background: var(--tool-accent-soft, color-mix(in srgb, var(--tool-accent, #2563EB) 10%, transparent));
    }

    .address-pill-box-container {
      position: relative;
      width: fit-content;
      max-width: 100%;
    }

    .address-pill-box {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 7px 12px;
      border-radius: 12px;
      background: var(--ts-surface-inset, #1A1B1E);
      border: 1.5px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 25%, transparent));
      user-select: none;
      transition: all 0.2s ease;
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .address-pill-box,
    [data-theme="light"] .address-pill-box {
      background: #F8FAFC;
      border-color: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 35%, transparent);
    }

    .address-pill-box:hover,
    .address-pill-box.has-dropdown-open {
      border-color: var(--accent, #3B82F6);
      box-shadow: 0 0 16px var(--accent-glow, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 25%, transparent));
    }

    :host-context([data-theme="light"]) .address-pill-box:hover,
    :host-context([data-theme="light"]) .address-pill-box.has-dropdown-open,
    [data-theme="light"] .address-pill-box:hover,
    [data-theme="light"] .address-pill-box.has-dropdown-open {
      border-color: #2563EB;
      background: #FFFFFF;
      box-shadow: 0 0 12px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 18%, transparent);
    }

    .address-pill-box.is-copied {
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 20%, transparent));
      border-color: var(--accent, #3B82F6);
    }

    .email-icon {
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .email-icon,
    [data-theme="light"] .email-icon {
      color: #2563EB;
    }

    .email-address-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .email-address-wrapper.is-clickable {
      cursor: pointer;
    }

    .email-address {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #FCFCFC);
      letter-spacing: 0.3px;
      white-space: nowrap !important;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      max-width: 480px;
      word-break: keep-all !important;
    }

    :host-context([data-theme="light"]) .email-address,
    [data-theme="light"] .email-address {
      color: #0F172A;
    }

    .address-loading-pulse {
      animation: pulse 1.5s infinite;
      color: var(--text-muted, #94A3B8);
      font-size: 13px;
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .address-loading-pulse,
    [data-theme="light"] .address-loading-pulse {
      color: #1D4ED8;
      font-weight: 600;
    }

    /* Dropdown Toggle Button on Pill */
    .inbox-dropdown-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 20%, transparent)) !important;
      border: 1.5px solid var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 40%, transparent)) !important;
      color: #BFDBFE !important;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
      opacity: 1 !important;
    }

    .inbox-dropdown-toggle-btn ts-icon,
    .inbox-dropdown-toggle-btn .inbox-count-badge {
      color: inherit !important;
      opacity: 1 !important;
      display: inline-flex;
      align-items: center;
    }

    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn,
    [data-theme="light"] .inbox-dropdown-toggle-btn {
      background: #EFF6FF !important;
      border-color: #93C5FD !important;
      color: #1D4ED8 !important;
    }

    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn ts-icon,
    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn .inbox-count-badge,
    [data-theme="light"] .inbox-dropdown-toggle-btn ts-icon,
    [data-theme="light"] .inbox-dropdown-toggle-btn .inbox-count-badge {
      color: #1D4ED8 !important;
    }

    .inbox-dropdown-toggle-btn:hover,
    .inbox-dropdown-toggle-btn.is-open {
      background: #3B82F6 !important;
      color: #FFFFFF !important;
      border-color: #3B82F6 !important;
      box-shadow: 0 0 10px color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 35%, transparent) !important;
    }

    .inbox-dropdown-toggle-btn:hover ts-icon,
    .inbox-dropdown-toggle-btn:hover .inbox-count-badge,
    .inbox-dropdown-toggle-btn.is-open ts-icon,
    .inbox-dropdown-toggle-btn.is-open .inbox-count-badge {
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn:hover,
    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn.is-open,
    [data-theme="light"] .inbox-dropdown-toggle-btn:hover,
    [data-theme="light"] .inbox-dropdown-toggle-btn.is-open {
      background: #2563EB !important;
      color: #FFFFFF !important;
      border-color: #1D4ED8 !important;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 30%, transparent) !important;
    }

    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn:hover ts-icon,
    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn:hover .inbox-count-badge,
    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn.is-open ts-icon,
    :host-context([data-theme="light"]) .inbox-dropdown-toggle-btn.is-open .inbox-count-badge,
    [data-theme="light"] .inbox-dropdown-toggle-btn:hover ts-icon,
    [data-theme="light"] .inbox-dropdown-toggle-btn:hover .inbox-count-badge,
    [data-theme="light"] .inbox-dropdown-toggle-btn.is-open ts-icon,
    [data-theme="light"] .inbox-dropdown-toggle-btn.is-open .inbox-count-badge {
      color: #FFFFFF !important;
    }

    .inbox-count-badge {
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
    }

    /* Copy Button */
    .copy-indicator-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 8px;
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 18%, transparent)) !important;
      color: #BFDBFE !important;
      border: 1.5px solid color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 35%, transparent) !important;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
      opacity: 1 !important;
    }

    .copy-indicator-badge ts-icon,
    .copy-indicator-badge .indicator-text {
      color: inherit !important;
      opacity: 1 !important;
      display: inline-flex;
      align-items: center;
    }

    :host-context([data-theme="light"]) .copy-indicator-badge,
    [data-theme="light"] .copy-indicator-badge {
      background: #EFF6FF !important;
      color: #1D4ED8 !important;
      border-color: #93C5FD !important;
    }

    :host-context([data-theme="light"]) .copy-indicator-badge ts-icon,
    :host-context([data-theme="light"]) .copy-indicator-badge .indicator-text,
    [data-theme="light"] .copy-indicator-badge ts-icon,
    [data-theme="light"] .copy-indicator-badge .indicator-text {
      color: #1D4ED8 !important;
    }

    .copy-indicator-badge:hover {
      background: #3B82F6 !important;
      color: #FFFFFF !important;
      border-color: #3B82F6 !important;
      box-shadow: 0 0 10px color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 35%, transparent) !important;
    }

    .copy-indicator-badge:hover ts-icon,
    .copy-indicator-badge:hover .indicator-text {
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .copy-indicator-badge:hover,
    [data-theme="light"] .copy-indicator-badge:hover {
      background: #2563EB !important;
      color: #FFFFFF !important;
      border-color: #1D4ED8 !important;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 30%, transparent) !important;
    }

    :host-context([data-theme="light"]) .copy-indicator-badge:hover ts-icon,
    :host-context([data-theme="light"]) .copy-indicator-badge:hover .indicator-text,
    [data-theme="light"] .copy-indicator-badge:hover ts-icon,
    [data-theme="light"] .copy-indicator-badge:hover .indicator-text {
      color: #FFFFFF !important;
    }

    .copy-indicator-badge.is-copied {
      background: #059669 !important;
      border-color: #047857 !important;
      color: #FFFFFF !important;
    }

    .copy-indicator-badge.is-copied ts-icon,
    .copy-indicator-badge.is-copied .indicator-text {
      color: #FFFFFF !important;
    }

    /* Anchored Dropdown Menu */
    .inboxes-dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      z-index: 1000;
      width: 360px;
      max-width: calc(100vw - 32px);
      background: var(--ts-surface-raised, #18191C);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      animation: dropdownFadeIn 0.15s ease-out;
    }

    :host-context([data-theme="light"]) .inboxes-dropdown-panel,
    [data-theme="light"] .inboxes-dropdown-panel {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14), 0 0 0 1px #CBD5E1;
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px 4px 8px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .dropdown-header,
    [data-theme="light"] .dropdown-header {
      border-bottom-color: #F1F5F9;
    }

    .dropdown-header-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted, #94A3B8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    :host-context([data-theme="light"]) .dropdown-header-title,
    [data-theme="light"] .dropdown-header-title {
      color: #475569;
    }

    .dropdown-close-btn {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: all 0.15s;
    }

    .dropdown-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .dropdown-close-btn:hover,
    [data-theme="light"] .dropdown-close-btn:hover {
      background: #E2E8F0;
      color: #0F172A;
    }

    .dropdown-items-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 240px;
      overflow-y: auto;
    }

    .dropdown-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .dropdown-item-row:hover {
      background: var(--ts-row-hover, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .dropdown-item-row:hover,
    [data-theme="light"] .dropdown-item-row:hover {
      background: #F8FAFC;
    }

    .dropdown-item-row.is-active {
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 15%, transparent));
      border-color: var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 35%, transparent));
    }

    :host-context([data-theme="light"]) .dropdown-item-row.is-active,
    [data-theme="light"] .dropdown-item-row.is-active {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      border-color: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 30%, transparent);
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .item-status-icon {
      color: var(--accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .item-status-icon,
    [data-theme="light"] .item-status-icon {
      color: #2563EB;
    }

    .inactive-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--border-subtle, rgba(255, 255, 255, 0.2));
    }

    :host-context([data-theme="light"]) .inactive-bullet,
    [data-theme="light"] .inactive-bullet {
      background: #CBD5E1;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      flex: 1;
    }

    .item-label-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .item-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .item-title,
    [data-theme="light"] .item-title {
      color: #0F172A;
    }

    .item-badge-active {
      font-size: 10px;
      font-weight: 700;
      padding: 0 5px;
      border-radius: 4px;
      background: var(--accent, #3B82F6);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .item-badge-active,
    [data-theme="light"] .item-badge-active {
      background: #2563EB;
      color: #FFFFFF;
    }

    .item-full-addr {
      font-size: 12px;
      color: var(--text-muted, #94A3B8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .item-full-addr,
    [data-theme="light"] .item-full-addr {
      color: #475569;
    }

    .item-delete-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: #F87171;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }

    .item-delete-btn:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.3);
      color: #EF4444;
    }

    :host-context([data-theme="light"]) .item-delete-btn:hover,
    [data-theme="light"] .item-delete-btn:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #DC2626;
    }

    .dropdown-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .dropdown-footer,
    [data-theme="light"] .dropdown-footer {
      border-top-color: #F1F5F9;
    }

    .dropdown-action-btn {
      flex: 1;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      background: var(--ts-surface-inset, #1A1B1E);
      color: var(--text, #FFFFFF);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .dropdown-action-btn,
    [data-theme="light"] .dropdown-action-btn {
      background: #F8FAFC;
      border-color: #CBD5E1;
      color: #1E293B;
    }

    .dropdown-action-btn:hover:not(:disabled) {
      background: var(--accent-soft, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 15%, transparent));
      border-color: var(--accent-border, color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 40%, transparent));
      color: var(--accent-strong, #60A5FA);
    }

    :host-context([data-theme="light"]) .dropdown-action-btn:hover:not(:disabled),
    [data-theme="light"] .dropdown-action-btn:hover:not(:disabled) {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 8%, transparent);
      border-color: #2563EB;
      color: #1D4ED8;
    }

    .dropdown-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Wipe Everything Section in Dropdown */
    .dropdown-wipe-section {
      padding-top: 6px;
      margin-top: 2px;
      border-top: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    :host-context([data-theme="light"]) .dropdown-wipe-section,
    [data-theme="light"] .dropdown-wipe-section {
      border-top-color: #E2E8F0;
    }

    .dropdown-wipe-btn {
      width: 100%;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 6px;
      border: 1px solid rgba(239, 68, 68, 0.2);
      background: rgba(239, 68, 68, 0.06);
      color: #F87171;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .dropdown-wipe-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #EF4444;
    }

    :host-context([data-theme="light"]) .dropdown-wipe-btn,
    [data-theme="light"] .dropdown-wipe-btn {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #DC2626;
    }

    :host-context([data-theme="light"]) .dropdown-wipe-btn:hover,
    [data-theme="light"] .dropdown-wipe-btn:hover {
      background: #FEE2E2;
      border-color: #EF4444;
      color: #B91C1C;
    }

    /* Actions Group */
    .actions-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* ALL BUTTONS ARE PERMANENTLY VISIBLE, NEVER HIDDEN ON HOVER */
    .action-btn {
      height: 38px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      background: var(--ts-surface-inset, #1A1B1E);
      color: var(--text, #FCFCFC);
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
    }

    :host-context([data-theme="light"]) .action-btn,
    [data-theme="light"] .action-btn {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #0F172A;
    }

    .action-btn:hover:not(:disabled):not(.delete-btn) {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    :host-context([data-theme="light"]) .action-btn:hover:not(:disabled):not(.delete-btn),
    [data-theme="light"] .action-btn:hover:not(:disabled):not(.delete-btn) {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .refresh-btn {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    :host-context([data-theme="light"]) .action-btn.refresh-btn,
    [data-theme="light"] .action-btn.refresh-btn {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent-border, var(--accent-border)) !important;
      color: var(--tool-accent, var(--accent)) !important;
      font-weight: 700;
    }

    .refresh-btn:hover:not(:disabled) {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent, var(--accent)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    :host-context([data-theme="light"]) .action-btn.refresh-btn:hover:not(:disabled),
    [data-theme="light"] .action-btn.refresh-btn:hover:not(:disabled) {
      background: var(--tool-accent-soft, var(--accent-soft)) !important;
      border-color: var(--tool-accent, var(--accent)) !important;
      color: var(--tool-accent, var(--accent)) !important;
    }

    .countdown-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #3B82F6)) 25%, transparent);
      color: #93C5FD;
    }

    :host-context([data-theme="light"]) .countdown-badge,
    [data-theme="light"] .countdown-badge {
      background: color-mix(in srgb, var(--tool-accent, var(--accent, #2563EB)) 15%, transparent);
      color: #1D4ED8;
    }

    .delete-btn {
      color: #F87171;
      border-color: rgba(239, 68, 68, 0.25);
    }

    :host-context([data-theme="light"]) .action-btn.delete-btn,
    [data-theme="light"] .action-btn.delete-btn {
      background: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #DC2626;
      font-weight: 700;
    }

    .delete-btn:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #EF4444;
    }

    :host-context([data-theme="light"]) .action-btn.delete-btn:hover:not(:disabled),
    [data-theme="light"] .action-btn.delete-btn:hover:not(:disabled) {
      background: #FEE2E2;
      border-color: #EF4444;
      color: #B91C1C;
    }

    .spinning {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .address-hero-card {
        padding: 10px 12px;
        gap: 10px;
      }

      .address-cluster {
        min-width: 100%;
        width: 100%;
      }

      .address-pill-box-container {
        width: 100%;
      }

      .address-pill-box {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 7px 10px;
        box-sizing: border-box;
      }

      .email-icon {
        flex-shrink: 0;
      }

      .email-address-wrapper {
        min-width: 0;
        flex: 1;
        gap: 6px;
      }

      .email-address {
        font-size: clamp(12px, 3.4vw, 14px) !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        flex: 1 1 auto;
        min-width: 0;
        max-width: unset;
        word-break: keep-all !important;
      }

      .copy-indicator-badge {
        padding: 4px 6px;
        flex-shrink: 0;
      }

      .hide-on-mobile-copy-text {
        display: none !important;
      }

      .inboxes-dropdown-panel {
        width: 100%;
        max-width: 100%;
        left: 0;
        right: 0;
      }

      /* Single row for all 5 action buttons on mobile - NEVER WRAPS */
      .actions-cluster {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
        gap: 4px !important;
        flex-wrap: nowrap !important;
      }

      .action-btn {
        width: 100% !important;
        min-width: 0 !important;
        height: 38px !important;
        padding: 0 2px !important;
        justify-content: center !important;
        gap: 2px !important;
        font-size: 11px !important;
        box-sizing: border-box !important;
      }

      .hide-mobile-btn-text {
        display: none !important;
      }

      .countdown-badge {
        font-size: 10px;
        padding: 1px 4px;
        margin-left: 1px;
      }
    }
  `]
})
export class AddressBarComponent {
  private readonly elRef = inject(ElementRef);

  readonly activeAccount = input<MailAccount | null>(null);
  readonly inboxes = input<MailAccount[]>([]);
  readonly countdown = input<number>(0);
  readonly isGenerating = input<boolean>(false);
  readonly isRefreshing = input<boolean>(false);
  readonly timeUntilExpiry = input<string>('24h');
  readonly isExpired = input<boolean>(false);
  readonly soundEnabled = input<boolean>(true);
  readonly browserAlertsEnabled = input<boolean>(false);

  readonly refresh = output<void>();
  readonly generateNew = output<void>();
  readonly openCustomModal = output<void>();
  readonly openQrModal = output<void>();
  readonly deleteInbox = output<void>();
  readonly deleteSpecificInbox = output<string>();
  readonly switchInbox = output<string>();
  readonly extendExpiry = output<void>();
  readonly toggleSound = output<void>();
  readonly toggleAlerts = output<void>();
  readonly openWipeModal = output<void>();

  readonly copied = signal<boolean>(false);
  readonly isDropdownOpen = signal<boolean>(false);

  toggleDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isDropdownOpen.update(open => !open);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  onSelectInbox(id: string): void {
    this.switchInbox.emit(id);
    this.closeDropdown();
  }

  onDeleteInboxFromDropdown(id: string, event: Event): void {
    event.stopPropagation();
    this.deleteSpecificInbox.emit(id);
  }

  onNewFromDropdown(): void {
    this.generateNew.emit();
    this.closeDropdown();
  }

  onCustomFromDropdown(): void {
    this.openCustomModal.emit();
    this.closeDropdown();
  }

  onOpenWipeModal(): void {
    this.openWipeModal.emit();
    this.closeDropdown();
  }

  async copyAddress(event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const addr = this.activeAccount()?.address;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isDropdownOpen()) return;
    const clickedInside = this.elRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.isDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isDropdownOpen()) {
      this.isDropdownOpen.set(false);
    }
  }
}
