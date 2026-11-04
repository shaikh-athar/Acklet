import {
  Component,
  input,
  output,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  OnDestroy,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TsIconComponent, AdaptiveDropdownComponent } from '@acklet/tool-shell';
import {
  BarcodeFormat,
  BarcodeVerificationResult
} from '../../models/barcode.models';
import { BARCODE_REGISTRY } from '../../config/barcode-registry';
import { ShareService, SHARE_PRIVACY_NOTICE } from '../../services/share.service';
import { TempCodeRecord } from '../../models/temp-code.models';

@Component({
  selector: 'app-barcode-preview-panel',
  standalone: true,
  imports: [CommonModule, TsIconComponent, AdaptiveDropdownComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barcode-preview-container">
      <div class="preview-card">
        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- Card Header: Title + History & Settings Actions              -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <div class="preview-card-header">
          <div class="header-left">
            <ts-icon name="barcode" class="header-icon" />
            <div class="header-title-group">
              <span class="preview-title">{{ displayTitle() }}</span>
              <span class="preview-subtitle">Live preview</span>
            </div>

            <!-- Status Pill: None while empty, Incomplete while invalid, Ready only after non-empty render, Error only for engine failure -->
            @if (renderError()) {
              <div class="status-pill-wrap">
                <span class="status-pill error-pill">
                  <span class="error-dot"></span> Error
                </span>
              </div>
            } @else if (isTemporary()) {
              <div class="status-pill-wrap">
                @if (temporaryRecord()) {
                  <span class="status-pill">
                    <span class="live-dot"></span> Active
                  </span>
                  @if (temporaryCountdown()) {
                    <span class="countdown-chip">
                      <ts-icon name="clock" [size]="12" />
                      <span>{{ temporaryCountdown() }}</span>
                    </span>
                  }
                } @else if (hasValidRender() && !isGenerating()) {
                  <span class="status-pill">
                    <span class="live-dot"></span> Ready
                  </span>
                }
              </div>
            } @else if (hasValidRender() && !isGenerating()) {
              <div class="status-pill-wrap">
                <span class="status-pill">
                  <span class="live-dot"></span> Ready
                </span>
              </div>
            } @else if (isInvalidState()) {
              <div class="status-pill-wrap">
                <span class="status-pill incomplete-pill">
                  <span class="incomplete-dot"></span> Incomplete
                </span>
              </div>
            }
          </div>

          <!-- Top-Right Actions -->
          <div class="header-actions">
            <!-- History / Saved Barcodes Button with Counter Badge (hidden in temporary mode) -->
            @if (!isTemporary()) {
              <button
                type="button"
                class="header-icon-btn"
                (click)="openHistory.emit()"
                title="Saved barcodes"
                aria-label="Saved barcodes"
              >
                <ts-icon name="history" [size]="18" />
                @if (historyCount() > 0) {
                  <span class="btn-badge">{{ historyCount() }}</span>
                }
              </button>
            }

            <!-- Settings Button -->
            <button
              type="button"
              class="header-icon-btn"
              (click)="openSettings.emit()"
              title="Settings"
              aria-label="Settings"
            >
              <ts-icon name="settings" [size]="18" />
            </button>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- Preview Stage: Light "Paper" Card with Quiet Zone           -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <div class="stage-wrapper">
          <div class="stage-inner">
            @if (renderError()) {
              <!-- Render Error State Message -->
              <div class="render-error-card" role="alert">
                <ts-icon name="circle-alert" [size]="20" class="error-state-icon" />
                <p class="render-error-message">The barcode could not be drawn. Change the value or format and try again.</p>
              </div>
            } @else if (hasValidRender()) {
              <!-- Save Separate Action on top of the barcode -->
              @if (canSaveSeparate()) {
                <div class="barcode-top-action-wrap slide-fade-in">
                  <button
                    type="button"
                    class="save-separate-btn"
                    (click)="saveSeparate.emit()"
                    title="Save modified input as a separate new barcode"
                  >
                    <ts-icon name="plus" [size]="13" />
                    <span>Save separate</span>
                  </button>
                </div>
              }

              <!-- Active Barcode on Light "Paper" Card -->
              <div
                class="paper-card"
                [class.has-scan-animation]="shouldAnimate()"
              >
                <!-- Rendered SVG Barcode via Blob Image -->
                <div class="svg-render-container">
                  <img
                    [src]="barcodeImageUrl()"
                    [alt]="barcodeName() || 'Barcode preview'"
                    class="barcode-preview-img"
                  />
                </div>

                <!-- Laser Scan Line Reveal (plays once on first generation only) -->
                @if (shouldAnimate()) {
                  <div class="laser-scan-line-wrap" aria-hidden="true">
                    <div class="laser-beam"></div>
                  </div>
                }
              </div>

              <!-- Informative "Encodes: ..." chip when encoded value differs from raw input -->
              @if (encodedValueNotice()) {
                <div class="encoded-value-badge" role="status">
                  <ts-icon name="info" [size]="13" />
                  <span>{{ encodedValueNotice() }}</span>
                </div>
              }

              <!-- Silent Verification Warning (shown only if scanner decode mismatched) -->
              @if (verification()?.mismatch && !verification()?.skipped) {
                <div class="quiet-verify-warning" role="status">
                  <ts-icon name="circle-alert" [size]="13" />
                  <span>Scan verification differs from input value.</span>
                </div>
              }
            } @else if (validationError()) {
              <!-- Invalid State when value entered or touched -->
              <div class="empty-state-dashed" role="alert">
                <div class="empty-illustration">
                  <ts-icon name="circle-alert" [size]="32" class="not-ready-icon" />
                </div>
                <p class="empty-caption">Barcode not ready</p>
                <span class="empty-subcaption">{{ validationError() }}</span>
              </div>
            } @else {
              <!-- Dashed Empty State -->
              <div class="empty-state-dashed" aria-hidden="true">
                <div class="empty-illustration">
                  <svg viewBox="0 0 160 80" class="placeholder-barcode-svg" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="10" width="4" height="60" rx="1" fill="currentColor" opacity="0.4" />
                    <rect x="18" y="10" width="8" height="60" rx="1" fill="currentColor" opacity="0.3" />
                    <rect x="30" y="10" width="3" height="60" rx="1" fill="currentColor" opacity="0.4" />
                    <rect x="37" y="10" width="6" height="60" rx="1" fill="currentColor" opacity="0.3" />
                    <rect x="47" y="10" width="10" height="60" rx="1" fill="currentColor" opacity="0.5" />
                    <rect x="61" y="10" width="4" height="60" rx="1" fill="currentColor" opacity="0.3" />
                    <rect x="69" y="10" width="7" height="60" rx="1" fill="currentColor" opacity="0.4" />
                    <rect x="80" y="10" width="5" height="60" rx="1" fill="currentColor" opacity="0.5" />
                    <rect x="89" y="10" width="8" height="60" rx="1" fill="currentColor" opacity="0.3" />
                    <rect x="101" y="10" width="4" height="60" rx="1" fill="currentColor" opacity="0.4" />
                    <rect x="109" y="10" width="6" height="60" rx="1" fill="currentColor" opacity="0.3" />
                    <rect x="119" y="10" width="9" height="60" rx="1" fill="currentColor" opacity="0.5" />
                    <rect x="132" y="10" width="4" height="60" rx="1" fill="currentColor" opacity="0.4" />
                    <rect x="140" y="10" width="7" height="60" rx="1" fill="currentColor" opacity="0.3" />
                  </svg>
                </div>
                <p class="empty-caption">Barcode preview</p>
                <span class="empty-subcaption">Enter a value to see the barcode.</span>
              </div>
            }
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════════ -->
        <!-- Action Row: Download primary + More dropdown                 -->
        <!-- ════════════════════════════════════════════════════════════ -->
        <div class="preview-action-bar">
          @if (isTemporary() && !temporaryRecord()) {
            <div class="temporary-create-cluster">
              <button
                type="button"
                class="primary-create-temp-btn"
                [disabled]="!canCreateTemporary() || isCreatingTemporary()"
                (click)="createTemporary.emit()"
                aria-label="Create temporary barcode"
              >
                <ts-icon [name]="isCreatingTemporary() ? 'loader' : 'clock'" [class.spin-animation]="isCreatingTemporary()" class="btn-icon" />
                <span>{{ isCreatingTemporary() ? 'Creating...' : 'Create temporary barcode' }}</span>
              </button>
            </div>
          } @else {
            <div class="action-buttons-cluster">
              <!-- Single Primary Action: Download PNG -->
              <button
                type="button"
                class="primary-download-btn"
                [disabled]="(!isValid() && !isTemporary()) || isGenerating()"
                (click)="onDownload('png')"
                aria-label="Download"
              >
                <ts-icon name="download" class="btn-icon" />
                <span>Download</span>
              </button>

              <!-- More Adaptive Dropdown (Popover on desktop, bottom sheet on phone) -->
              <ts-adaptive-dropdown
                [isOpen]="isMoreOpen()"
                (isOpenChange)="isMoreOpen.set($event)"
                title="More actions"
                menuWidth="240px"
                placement="top"
                align="right"
              >
                <button
                  type="button"
                  trigger
                  class="more-action-trigger"
                  [disabled]="(!isValid() && !isTemporary()) || isGenerating()"
                  aria-label="More"
                  (click)="toggleMore($event)"
                >
                  <span>More</span>
                  <ts-icon name="chevron-down" [size]="14" [class.rotated]="isMoreOpen()" />
                </button>

                <div class="more-menu-list" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    class="more-menu-item"
                    (click)="onDownload('svg'); isMoreOpen.set(false)"
                  >
                    <ts-icon name="file-code" [size]="16" />
                    <span>Download SVG</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    class="more-menu-item"
                    (click)="onDownload('pdf'); isMoreOpen.set(false)"
                  >
                    <ts-icon name="file-down" [size]="16" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    class="more-menu-item"
                    (click)="copyImage(); isMoreOpen.set(false)"
                  >
                    <ts-icon [name]="copiedImage() ? 'check' : 'copy'" [size]="16" />
                    <span>{{ copiedImage() ? 'Image copied' : 'Copy image' }}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    class="more-menu-item"
                    (click)="onPrint(); isMoreOpen.set(false)"
                  >
                    <ts-icon name="printer" [size]="16" />
                    <span>Print</span>
                  </button>

                  @if (!isTemporary()) {
                    <button
                      type="button"
                      role="menuitem"
                      class="more-menu-item"
                      (click)="onSave(); isMoreOpen.set(false)"
                    >
                      <ts-icon [name]="savedBarcode() ? 'check' : 'bookmark'" [size]="16" />
                      <span>{{ savedBarcode() ? 'Saved to history' : 'Save' }}</span>
                    </button>

                    <div class="menu-divider"></div>

                    <div class="share-action-wrap">
                      <button
                        type="button"
                        role="menuitem"
                        class="more-menu-item"
                        [disabled]="!isShareable()"
                        (click)="onShare(); isMoreOpen.set(false)"
                      >
                        <ts-icon [name]="copiedLink() ? 'check' : 'share-2'" [size]="16" />
                        <span>{{ copiedLink() ? 'Link copied' : 'Share' }}</span>
                      </button>
                      <span class="share-privacy-line">{{ sharePrivacyNotice }}</span>
                    </div>
                  }
                </div>
              </ts-adaptive-dropdown>

              @if (isTemporary() && temporaryRecord()) {
                <button
                  type="button"
                  class="view-dashboard-btn"
                  (click)="viewInDashboard.emit()"
                  title="View in dashboard"
                >
                  <ts-icon name="layout-dashboard" [size]="15" />
                  <span>View in dashboard</span>
                </button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .barcode-preview-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .preview-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      border-radius: var(--shell-card-radius, 16px);
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      overflow: visible;
      position: relative;
    }

    :host-context([data-theme="light"]) .preview-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }

    /* Card Header */
    .preview-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .preview-card-header {
      border-bottom-color: rgba(0, 0, 0, 0.06);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      color: var(--tool-accent, #3B82F6);
      flex-shrink: 0;
    }

    .header-title-group {
      display: flex;
      flex-direction: column;
    }

    .preview-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      line-height: 1.2;
    }

    :host-context([data-theme="light"]) .preview-title {
      color: #0F172A;
    }

    .preview-subtitle {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.2;
    }

    .status-pill-wrap {
      margin-left: 6px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 7px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.12);
      color: #10B981;
      font-size: 10.5px;
      font-weight: 600;
    }

    .live-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #10B981;
    }

    .status-pill.error-pill {
      background: rgba(239, 68, 68, 0.12);
      color: #EF4444;
    }

    .error-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #EF4444;
    }

    .status-pill.incomplete-pill {
      background: rgba(245, 158, 11, 0.12);
      color: #F59E0B;
    }

    .incomplete-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #F59E0B;
    }

    .status-pill.sample-pill {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    :host-context([data-theme="light"]) .status-pill.sample-pill {
      background: #F1F5F9;
      color: #64748B;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .sample-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--text-muted, #94a3b8);
    }

    .countdown-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 10px;
      background: rgba(59, 130, 246, 0.12);
      color: var(--tool-accent, #3B82F6);
      font-size: 10.5px;
      font-weight: 600;
      margin-left: 4px;
    }

    .sample-notice-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      margin-top: 10px;
      border-radius: 8px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      font-size: 12px;
      line-height: 1.4;
      max-width: 90%;
      text-align: center;
      justify-content: center;
    }

    :host-context([data-theme="light"]) .sample-notice-banner {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .temporary-create-cluster {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .primary-create-temp-btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 20px;
      border-radius: 10px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      transition: background var(--ts-dur-fast, 150ms) ease,
                  transform var(--ts-dur-press, 100ms) ease;
    }

    .primary-create-temp-btn:hover:not(:disabled) {
      background: var(--tool-accent-hover, #2563EB);
    }

    .primary-create-temp-btn:active:not(:disabled) {
      transform: scale(0.99);
    }

    .primary-create-temp-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .service-unreachable-text {
      font-size: 12px;
      color: #EF4444;
      text-align: center;
      line-height: 1.3;
    }

    .view-dashboard-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 44px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .view-dashboard-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .view-dashboard-btn:hover {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .view-dashboard-btn:hover {
      background: #F1F5F9;
    }

    .spin-animation {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-icon-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .header-icon-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #64748B;
    }

    .header-icon-btn:hover {
      color: var(--text, #fcfcfc);
      background: var(--bg-surface, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .header-icon-btn:hover {
      color: #0F172A;
      background: #E2E8F0;
    }

    .btn-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      font-size: 9.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Stage Area */
    .stage-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      min-height: 280px;
      overflow: auto;
    }

    .stage-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      position: relative;
    }

    .barcode-top-action-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      z-index: 10;
    }

    .save-separate-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: #EFF6FF;
      border: 1px solid #3B82F6;
      color: #1D4ED8;
      box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
      transition: all var(--ts-dur-fast, 150ms) cubic-bezier(0.2, 0, 0, 1);
    }

    .save-separate-btn:hover {
      background: #2563EB !important;
      border-color: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35) !important;
      transform: translateY(-1px);
    }

    .save-separate-btn:hover ts-icon,
    .save-separate-btn:hover span {
      color: #FFFFFF !important;
    }

    .save-separate-btn:active {
      transform: translateY(0);
    }

    :host-context([data-theme="dark"]) .save-separate-btn {
      background: rgba(59, 130, 246, 0.16);
      border-color: rgba(59, 130, 246, 0.45);
      color: #60A5FA;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme="dark"]) .save-separate-btn:hover {
      background: #3B82F6 !important;
      border-color: #60A5FA !important;
      color: #FFFFFF !important;
    }

    /* Paper Card with Quiet Zone */
    .paper-card {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 24px 32px;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      border: 1px solid rgba(0, 0, 0, 0.06);
      max-width: 100%;
      overflow: hidden;
    }

    .svg-render-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 120px;
      max-width: 100%;
      overflow: visible;
      opacity: 1;
    }

    .barcode-preview-img {
      max-width: 100%;
      max-height: 240px;
      height: auto;
      display: block;
      object-fit: contain;
      opacity: 1;
      animation-fill-mode: forwards;
    }

    /* Render Error State Card */
    .render-error-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 24px;
      border-radius: 12px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid rgba(239, 68, 68, 0.3);
      max-width: 360px;
      text-align: center;
    }

    :host-context([data-theme="light"]) .render-error-card {
      background: #FEF2F2;
      border-color: rgba(239, 68, 68, 0.25);
    }

    .error-state-icon {
      color: #EF4444;
    }

    .render-error-message {
      font-size: 13px;
      font-weight: 500;
      color: var(--text, #fcfcfc);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .render-error-message {
      color: #991B1B;
    }

    /* Laser Scan Animation */
    .paper-card.has-scan-animation {
      border-color: var(--tool-accent, #3B82F6);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
      transition: border-color var(--ts-dur-fast, 150ms) ease, box-shadow var(--ts-dur-fast, 150ms) ease;
    }

    .paper-card.has-scan-animation .barcode-preview-img {
      animation: previewPulse 0.4s ease-out;
    }

    @keyframes previewPulse {
      0% { opacity: 0.88; transform: scale(0.995); }
      100% { opacity: 1; transform: scale(1); }
    }

    .laser-scan-line-wrap {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .laser-beam {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--tool-accent, #3B82F6);
      box-shadow: 0 0 10px 2px var(--tool-accent, #3B82F6);
      animation: laserSweep 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes laserSweep {
      0% {
        top: 0;
        opacity: 0;
      }
      20% {
        opacity: 1;
      }
      80% {
        opacity: 1;
      }
      100% {
        top: 100%;
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .laser-scan-line-wrap,
      .laser-beam {
        display: none !important;
        animation: none !important;
      }
      .barcode-preview-img {
        animation: none !important;
        opacity: 1 !important;
      }
    }

    /* Quiet Verification Warning */
    .quiet-verify-warning {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding: 6px 12px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #F59E0B;
      font-size: 11.5px;
    }

    /* Encoded Value Badge */
    .encoded-value-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 5px 12px;
      border-radius: 6px;
      background: var(--bg-surface, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-muted, #94a3b8);
      font-size: 11.5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    :host-context([data-theme="light"]) .encoded-value-badge {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
      color: #475569;
    }

    /* Empty State */
    .empty-state-dashed {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      text-align: center;
      border: 2px dashed var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      max-width: 320px;
      color: var(--text-muted, #94a3b8);
    }

    :host-context([data-theme="light"]) .empty-state-dashed {
      border-color: rgba(0, 0, 0, 0.1);
    }

    .placeholder-barcode-svg {
      width: 140px;
      height: 70px;
      margin-bottom: 12px;
    }

    .empty-caption {
      font-size: 14px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      margin: 0 0 4px;
    }

    .not-ready-icon {
      color: #EF4444;
      margin-bottom: 10px;
    }

    :host-context([data-theme="light"]) .empty-caption {
      color: #0F172A;
    }

    .empty-subcaption {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.4;
    }

    /* Bottom Action Bar */
    .preview-action-bar {
      padding: 14px 18px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      background: var(--bg-elevated, rgba(255, 255, 255, 0.02));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .preview-action-bar {
      border-top-color: rgba(0, 0, 0, 0.06);
      background: #F8FAFC;
    }

    .action-buttons-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    /* Single Primary Action Button: Download */
    .primary-download-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 20px;
      border-radius: 10px;
      background: var(--tool-accent, #3B82F6);
      color: #FFFFFF;
      border: none;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      transition: background var(--ts-dur-fast, 150ms) ease,
                  transform var(--ts-dur-press, 100ms) ease;
    }

    .primary-download-btn:hover:not(:disabled) {
      background: var(--tool-accent-hover, #2563EB);
    }

    .primary-download-btn:active:not(:disabled) {
      transform: scale(0.99);
    }

    .primary-download-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* More Action Trigger */
    .more-action-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 10px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .more-action-trigger {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.12);
      color: #0F172A;
    }

    .more-action-trigger:hover:not(:disabled) {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .more-action-trigger:hover:not(:disabled) {
      background: #F1F5F9;
    }

    .more-action-trigger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .more-action-trigger .rotated {
      transform: rotate(180deg);
    }

    /* More Menu Items */
    .more-menu-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 4px;
    }

    .more-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 12px;
      min-height: 38px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      font-size: 13px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background var(--ts-dur-fast, 150ms) ease;
    }

    :host-context([data-theme="light"]) .more-menu-item {
      color: #0F172A;
    }

    .more-menu-item:hover:not(:disabled) {
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .more-menu-item:hover:not(:disabled) {
      background: #F1F5F9;
    }

    .more-menu-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .menu-divider {
      height: 1px;
      margin: 4px 6px;
      background: var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .menu-divider {
      background: rgba(0, 0, 0, 0.06);
    }

    .share-action-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .share-privacy-line {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      padding: 2px 12px 6px;
      line-height: 1.3;
    }

    /* Focus rings & accessibility */
    .header-icon-btn:focus-visible,
    .save-separate-btn:focus-visible,
    .primary-download-btn:focus-visible,
    .more-action-trigger:focus-visible,
    .more-menu-item:focus-visible {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    @media (max-width: 639px) {
      .preview-card-header {
        padding: 12px 14px;
        flex-wrap: wrap;
        gap: 8px;
      }

      .header-left {
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }

      .preview-title {
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .header-actions {
        flex-shrink: 0;
      }

      .header-icon-btn {
        width: 40px;
        height: 40px;
      }

      .stage-wrapper {
        padding: 16px 12px;
        min-height: 220px;
      }

      .paper-card {
        padding: 16px 20px;
      }

      .preview-action-bar {
        padding: 12px 14px;
      }

      .action-buttons-cluster {
        gap: 6px;
      }

      .primary-download-btn {
        min-height: 44px;
        padding: 10px 14px;
      }

      .more-action-trigger {
        min-height: 44px;
        padding: 10px 12px;
      }
    }
  `]
})
export class BarcodePreviewPanelComponent implements OnDestroy {
  private shareService = inject(ShareService);
  private sanitizer = inject(DomSanitizer);

  readonly barcodeName = input<string>('My Barcode');
  readonly format = input.required<BarcodeFormat>();
  readonly isValid = input.required<boolean>();
  readonly isGenerating = input<boolean>(false);
  readonly shouldAnimate = input<boolean>(false);
  readonly svgContent = input<string>('');
  readonly renderError = input<string | null>(null);
  readonly validationError = input<string | null>(null);
  readonly hasValue = input<boolean>(false);
  readonly verification = input<BarcodeVerificationResult | null>(null);
  readonly historyCount = input<number>(0);
  readonly rawValue = input<string>('');
  readonly encodedValue = input<string>('');
  readonly canSaveSeparate = input<boolean>(false);
  readonly isTemporary = input<boolean>(false);
  readonly temporaryRecord = input<TempCodeRecord | null>(null);
  readonly temporaryCountdown = input<string | null>(null);
  readonly isCreatingTemporary = input<boolean>(false);
  readonly isServiceUnreachable = input<boolean>(false);
  readonly canCreateTemporary = input<boolean>(true);

  readonly download = output<'png' | 'svg' | 'pdf'>();
  readonly copyImageClick = output<void>();
  readonly shareClick = output<void>();
  readonly saveClick = output<void>();
  readonly openHistory = output<void>();
  readonly openSettings = output<void>();
  readonly saveSeparate = output<void>();
  readonly createTemporary = output<void>();
  readonly viewInDashboard = output<void>();
  readonly print = output<void>();

  readonly isMoreOpen = signal<boolean>(false);
  readonly copiedImage = signal<boolean>(false);
  readonly copiedLink = signal<boolean>(false);
  readonly savedBarcode = signal<boolean>(false);

  readonly sharePrivacyNotice = SHARE_PRIVACY_NOTICE;

  private currentBlobUrl: string | null = null;
  readonly barcodeImageUrl = signal<SafeUrl | null>(null);

  readonly formatLabel = computed<string>(() => {
    return BARCODE_REGISTRY[this.format()]?.label || this.format();
  });

  readonly displayTitle = computed<string>(() => {
    const custom = (this.barcodeName() || '').trim();
    if (custom && custom !== 'My Barcode') {
      return custom;
    }
    return this.formatLabel();
  });

  readonly hasValidRender = computed<boolean>(() => {
    if (this.isTemporary()) {
      return !this.renderError() && !!this.svgContent() && !!this.barcodeImageUrl();
    }
    return !this.renderError() && !!this.svgContent() && !!this.barcodeImageUrl() && this.isValid();
  });

  readonly isInvalidState = computed<boolean>(() => {
    return !this.isValid() && (this.hasValue() || !!this.validationError());
  });

  readonly isShareable = computed<boolean>(() => {
    return this.shareService.isShareable(this.format());
  });

  readonly encodedValueNotice = computed<string | null>(() => {
    const raw = (this.rawValue() || '').trim().replace(/[-\s]/g, '');
    const enc = (this.encodedValue() || '').trim();
    if (!enc || !this.hasValidRender()) return null;
    if (enc !== raw && enc !== this.rawValue().trim()) {
      return `Encodes: ${enc}`;
    }
    return null;
  });

  constructor() {
    try {
      effect(() => {
        const svg = this.svgContent();
        const valid = this.isValid();
        const isTemp = this.isTemporary();
        untracked(() => {
          this.updateBlobUrl(svg, valid || isTemp);
        });
      });
    } catch {
      // Fallback for isolated test environments lacking an active effect scheduler
    }
  }

  private updateBlobUrl(svg: string, isValid: boolean): void {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    if (!isValid || !svg) {
      this.barcodeImageUrl.set(null);
      return;
    }

    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const rawUrl = URL.createObjectURL(blob);
      this.currentBlobUrl = rawUrl;
      this.barcodeImageUrl.set(this.sanitizer.bypassSecurityTrustUrl(rawUrl));
    } catch {
      this.barcodeImageUrl.set(null);
    }
  }

  ngOnDestroy(): void {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
  }

  toggleMore(event: MouseEvent): void {
    event.stopPropagation();
    this.isMoreOpen.update(v => !v);
  }

  onDownload(format: 'png' | 'svg' | 'pdf'): void {
    this.download.emit(format);
  }

  onPrint(): void {
    this.print.emit();
  }

  copyImage(): void {
    this.copyImageClick.emit();
    this.copiedImage.set(true);
    setTimeout(() => this.copiedImage.set(false), 2000);
  }

  onSave(): void {
    this.saveClick.emit();
    this.savedBarcode.set(true);
    setTimeout(() => this.savedBarcode.set(false), 2000);
  }

  onShare(): void {
    this.shareClick.emit();
    this.copiedLink.set(true);
    setTimeout(() => this.copiedLink.set(false), 2000);
  }
}
