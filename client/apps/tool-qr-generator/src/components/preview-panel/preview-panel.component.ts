import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  QRMetadata,
  ErrorCorrectionLevel,
  ExportFormat,
  QRHistoryItem,
  QRVerificationResult
} from '../../models/qr-generator.models';
import { QRVerifierService } from '../../services/qr-verifier.service';
import { QRGeneratorService } from '../../services/qr-generator.service';
import { QrAssembleEffectComponent } from '../qr-assemble-effect/qr-assemble-effect.component';
import { AdvancedModalComponent } from '../advanced-modal/advanced-modal.component';

@Component({
  selector: 'app-qr-preview-panel',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    QrAssembleEffectComponent,
    AdvancedModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-preview-container">
      <div class="preview-card">
        <!-- Card Header: Title + Action Buttons Cluster -->
        <div class="preview-card-header">
          <div class="preview-header-left">
            <ts-icon name="qr-code" class="header-icon" />
            <div class="preview-title-block">
              <span class="preview-title">{{ qrName() || 'Live Preview' }}</span>
              @if (qrName()) {
                <span class="preview-subtitle">Live Preview</span>
              }
            </div>
            @if (qrDataUrl() && !isGenerating() && !isCreatingHostedLink()) {
              <div class="header-status-badges fade-in-badges">
                @if (isSmartLink()) {
                  <span
                    class="smart-link-chip"
                    title="Long content is stored securely and the QR opens it. Short QR, easy to scan."
                  >
                    <ts-icon name="link" class="chip-icon" />
                    <span>Smart link</span>
                  </span>
                }
                <span class="preview-status-pill">
                  <span class="live-dot"></span> Ready
                </span>
              </div>
            }
          </div>

          <!-- Top-right icon buttons cluster -->
          <div class="preview-header-actions">
            <!-- History button with count badge -->
            <button
              type="button"
              class="header-icon-btn"
              [class.active]="isHistoryOpen()"
              (click)="isHistoryOpen.set(!isHistoryOpen())"
              title="Recent QR codes"
              aria-label="Recent QR codes"
            >
              <ts-icon name="history" [size]="18" />
              @if (historyItems().length > 0) {
                <span class="btn-badge">{{ historyItems().length }}</span>
              }
            </button>


            <!-- Advanced Settings button (settings icon) -->
            <button
              type="button"
              class="header-icon-btn"
              [class.active]="isAdvancedOpen()"
              (click)="isAdvancedOpen.set(true)"
              title="Advanced settings"
              aria-label="Advanced settings"
            >
              <ts-icon name="settings" [size]="18" />
            </button>
          </div>
        </div>

        <!-- Preview Stage Area (Fills Available Height with Zero Page Scroll) -->
        <div class="qr-stage-wrapper">
          <div class="qr-stage">
            <div class="qr-preview-stage-content">
              @if (fallbackNotice() && qrDataUrl()) {
                <div class="fallback-notice-banner slide-fade-up">
                  <ts-icon name="info" [size]="14" class="notice-icon" />
                  <span>{{ fallbackNotice() }}</span>
                  <button type="button" class="fallback-retry-btn" (click)="retryClick.emit()">Retry</button>
                </div>
              }

              @if (error() && !isCreatingHostedLink() && !isGenerating()) {
                <div class="qr-tile-wrapper is-error" role="alert">
                  <div class="qr-state-box qr-error-state">
                    <ts-icon name="alert-triangle" class="state-icon error-icon" />
                    <h3 class="state-title">Generation Error</h3>
                    <p class="state-desc">{{ error() }}</p>
                    <button type="button" class="retry-btn" (click)="retryClick.emit()">
                      <ts-icon name="refresh-cw" [size]="14" />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Unified QR Tile: same footprint across Empty, Creating/Loading, and Ready -->
                <div
                  class="qr-tile-wrapper"
                  [class.is-empty]="!qrDataUrl() && !isCreatingHostedLink() && !isGenerating()"
                  [class.is-loading]="(isCreatingHostedLink() || isGenerating()) && !qrDataUrl()"
                  [class.is-ready]="!!qrDataUrl()"
                  [attr.data-size-tier]="sizeTier()"
                >
                  @if ((isCreatingHostedLink() || isGenerating()) && !qrDataUrl()) {
                    <!-- Module-grid skeleton with sweeping laser scan line -->
                    <div class="qr-skeleton-inner" aria-busy="true">
                      <svg viewBox="0 0 200 200" class="skeleton-qr-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <!-- 3 Finder Patterns -->
                        <rect x="10" y="10" width="52" height="52" rx="8" fill="none" class="finder-outer" stroke-width="6"/>
                        <rect x="24" y="24" width="24" height="24" rx="4" class="finder-inner"/>

                        <rect x="138" y="10" width="52" height="52" rx="8" fill="none" class="finder-outer" stroke-width="6"/>
                        <rect x="152" y="24" width="24" height="24" rx="4" class="finder-inner"/>

                        <rect x="10" y="138" width="52" height="52" rx="8" fill="none" class="finder-outer" stroke-width="6"/>
                        <rect x="24" y="152" width="24" height="24" rx="4" class="finder-inner"/>

                        <!-- Timing patterns -->
                        <g class="skeleton-timing-modules">
                          <rect x="68" y="24" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="24" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="24" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="24" width="8" height="8" rx="1.5"/>

                          <rect x="24" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="24" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="24" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="24" y="116" width="8" height="8" rx="1.5"/>
                        </g>

                        <!-- Dense Shimmering Module Grid -->
                        <g class="skeleton-grid-modules">
                          <rect x="68" y="10" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="10" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="10" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="10" width="8" height="8" rx="1.5"/>
                          <rect x="76" y="38" width="8" height="8" rx="1.5"/>
                          <rect x="92" y="38" width="8" height="8" rx="1.5"/>
                          <rect x="108" y="38" width="8" height="8" rx="1.5"/>
                          <rect x="124" y="38" width="8" height="8" rx="1.5"/>
                          <rect x="68" y="52" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="52" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="52" width="8" height="8" rx="1.5"/>

                          <rect x="10" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="38" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="52" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="68" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="132" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="148" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="164" y="68" width="8" height="8" rx="1.5"/>
                          <rect x="180" y="68" width="8" height="8" rx="1.5"/>

                          <rect x="10" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="52" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="68" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="132" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="164" y="84" width="8" height="8" rx="1.5"/>
                          <rect x="180" y="84" width="8" height="8" rx="1.5"/>

                          <rect x="10" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="38" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="68" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="148" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="164" y="100" width="8" height="8" rx="1.5"/>
                          <rect x="180" y="100" width="8" height="8" rx="1.5"/>

                          <rect x="10" y="116" width="8" height="8" rx="1.5"/>
                          <rect x="52" y="116" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="116" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="116" width="8" height="8" rx="1.5"/>
                          <rect x="132" y="116" width="8" height="8" rx="1.5"/>
                          <rect x="148" y="116" width="8" height="8" rx="1.5"/>
                          <rect x="180" y="116" width="8" height="8" rx="1.5"/>

                          <rect x="68" y="138" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="138" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="138" width="8" height="8" rx="1.5"/>
                          <rect x="132" y="138" width="8" height="8" rx="1.5"/>
                          <rect x="148" y="138" width="8" height="8" rx="1.5"/>
                          <rect x="164" y="138" width="8" height="8" rx="1.5"/>
                          <rect x="180" y="138" width="8" height="8" rx="1.5"/>

                          <rect x="76" y="154" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="154" width="8" height="8" rx="1.5"/>
                          <rect x="124" y="154" width="8" height="8" rx="1.5"/>
                          <rect x="148" y="154" width="8" height="8" rx="1.5"/>
                          <rect x="172" y="154" width="8" height="8" rx="1.5"/>

                          <rect x="68" y="170" width="8" height="8" rx="1.5"/>
                          <rect x="84" y="170" width="8" height="8" rx="1.5"/>
                          <rect x="108" y="170" width="8" height="8" rx="1.5"/>
                          <rect x="132" y="170" width="8" height="8" rx="1.5"/>
                          <rect x="156" y="170" width="8" height="8" rx="1.5"/>
                          <rect x="180" y="170" width="8" height="8" rx="1.5"/>

                          <rect x="76" y="184" width="8" height="8" rx="1.5"/>
                          <rect x="100" y="184" width="8" height="8" rx="1.5"/>
                          <rect x="116" y="184" width="8" height="8" rx="1.5"/>
                          <rect x="148" y="184" width="8" height="8" rx="1.5"/>
                          <rect x="172" y="184" width="8" height="8" rx="1.5"/>
                        </g>
                      </svg>
                      <div class="qr-scan-line-track" aria-hidden="true">
                        <div class="qr-scan-line"></div>
                      </div>
                    </div>
                  } @else if (qrDataUrl()) {
                    <!-- Ready QR Code reveals in place -->
                    <app-qr-assemble-effect
                      [qrDataUrl]="qrDataUrl()"
                      [isGenerating]="isGenerating()"
                      [shouldAnimate]="shouldAnimateQR()"
                      class="qr-assemble-wrapper"
                    />
                  } @else {
                    <!-- Empty-first Placeholder Vector QR State -->
                    <div class="placeholder-qr-card-inner" aria-hidden="true">
                      <svg viewBox="0 0 200 200" class="placeholder-qr-svg" xmlns="http://www.w3.org/2000/svg">
                        <!-- 3 Finder Patterns -->
                        <rect x="10" y="10" width="52" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="6"/>
                        <rect x="24" y="24" width="24" height="24" rx="4" fill="currentColor"/>

                        <rect x="138" y="10" width="52" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="6"/>
                        <rect x="152" y="24" width="24" height="24" rx="4" fill="currentColor"/>

                        <rect x="10" y="138" width="52" height="52" rx="8" fill="none" stroke="currentColor" stroke-width="6"/>
                        <rect x="24" y="152" width="24" height="24" rx="4" fill="currentColor"/>

                        <!-- Matrix Dot Grid -->
                        <g fill="currentColor" opacity="0.85">
                          <rect x="75" y="15" width="10" height="10" rx="2"/>
                          <rect x="95" y="15" width="10" height="10" rx="2"/>
                          <rect x="115" y="15" width="10" height="10" rx="2"/>
                          <rect x="75" y="35" width="10" height="10" rx="2"/>
                          <rect x="105" y="35" width="10" height="10" rx="2"/>
                          <rect x="85" y="55" width="10" height="10" rx="2"/>
                          <rect x="115" y="55" width="10" height="10" rx="2"/>

                          <rect x="15" y="75" width="10" height="10" rx="2"/>
                          <rect x="35" y="75" width="10" height="10" rx="2"/>
                          <rect x="55" y="75" width="10" height="10" rx="2"/>
                          <rect x="75" y="75" width="10" height="10" rx="2"/>
                          <rect x="95" y="75" width="10" height="10" rx="2"/>
                          <rect x="115" y="75" width="10" height="10" rx="2"/>
                          <rect x="135" y="75" width="10" height="10" rx="2"/>
                          <rect x="155" y="75" width="10" height="10" rx="2"/>
                          <rect x="175" y="75" width="10" height="10" rx="2"/>

                          <rect x="15" y="95" width="10" height="10" rx="2"/>
                          <rect x="45" y="95" width="10" height="10" rx="2"/>
                          <rect x="75" y="95" width="10" height="10" rx="2"/>
                          <rect x="105" y="95" width="10" height="10" rx="2"/>
                          <rect x="135" y="95" width="10" height="10" rx="2"/>
                          <rect x="165" y="95" width="10" height="10" rx="2"/>

                          <rect x="75" y="115" width="10" height="10" rx="2"/>
                          <rect x="95" y="115" width="10" height="10" rx="2"/>
                          <rect x="125" y="115" width="10" height="10" rx="2"/>
                          <rect x="155" y="115" width="10" height="10" rx="2"/>

                          <rect x="75" y="145" width="10" height="10" rx="2"/>
                          <rect x="105" y="145" width="10" height="10" rx="2"/>
                          <rect x="135" y="145" width="10" height="10" rx="2"/>
                          <rect x="165" y="145" width="10" height="10" rx="2"/>
                          <rect x="85" y="165" width="10" height="10" rx="2"/>
                          <rect x="115" y="165" width="10" height="10" rx="2"/>
                          <rect x="145" y="165" width="10" height="10" rx="2"/>
                          <rect x="175" y="165" width="10" height="10" rx="2"/>
                        </g>
                      </svg>
                      <div class="placeholder-sweep-beam"></div>
                    </div>
                  }
                </div>

                <!-- Status text below tile: reserved height to prevent vertical jitter -->
                <div class="qr-status-caption-zone">
                  @if (isCreatingHostedLink()) {
                    <span class="skeleton-text animate-fade-in">Creating link...</span>
                  } @else if (isGenerating()) {
                    <span class="skeleton-text animate-fade-in">Generating QR code...</span>
                  } @else if (!qrDataUrl()) {
                    <p class="placeholder-caption">Your QR code will appear here</p>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Bottom Action Bar (Always Visible) -->
        <div class="preview-action-bar">
          <div class="action-buttons-cluster">
            <!-- Split Download Button -->
            <div class="split-btn-group">
              <button
                type="button"
                class="split-primary-btn"
                [disabled]="!qrDataUrl() || isGenerating()"
                (click)="onDownload('png')"
                [title]="!qrDataUrl() ? 'Enter content to download' : 'Download high-resolution PNG'"
                aria-label="Download high-resolution PNG"
              >
                <ts-icon name="download" class="btn-icon" />
                <span>Download PNG</span>
              </button>
              <button
                type="button"
                class="split-arrow-btn"
                (click)="toggleFormatMenu($event)"
                [attr.aria-expanded]="isFormatMenuOpen()"
                title="Export in other formats (SVG, JPEG, Copy)"
                aria-label="Export in other formats"
              >
                <ts-icon name="chevron-down" class="btn-chevron" />
              </button>

              <!-- Split Dropdown Menu -->
              @if (isFormatMenuOpen()) {
                <div class="split-menu slide-fade-up" role="menu" (click)="$event.stopPropagation()">
                  <button type="button" role="menuitem" class="split-menu-item" (click)="onDownload('svg'); isFormatMenuOpen.set(false)">
                    <ts-icon name="file-code" />
                    <div class="menu-item-info">
                      <span class="menu-item-name">SVG Vector</span>
                      <span class="menu-item-desc">Infinite scaling, perfect for print</span>
                    </div>
                  </button>
                  <button type="button" role="menuitem" class="split-menu-item" (click)="onDownload('jpeg'); isFormatMenuOpen.set(false)">
                    <ts-icon name="image" />
                    <div class="menu-item-info">
                      <span class="menu-item-name">JPEG Image</span>
                      <span class="menu-item-desc">Standard compressed raster</span>
                    </div>
                  </button>
                  <button type="button" role="menuitem" class="split-menu-item" (click)="copyImageToClipboard(); isFormatMenuOpen.set(false)">
                    <ts-icon [name]="copiedImage() ? 'check' : 'clipboard'" />
                    <div class="menu-item-info">
                      <span class="menu-item-name">{{ copiedImage() ? 'Copied to Clipboard!' : 'Copy Image' }}</span>
                      <span class="menu-item-desc">Direct paste into Figma, docs, chats</span>
                    </div>
                  </button>
                  <button type="button" role="menuitem" class="split-menu-item" (click)="onShare(); isFormatMenuOpen.set(false)">
                    <ts-icon name="share-2" />
                    <div class="menu-item-info">
                      <span class="menu-item-name">Share QR Code</span>
                      <span class="menu-item-desc">Share via system apps or copy</span>
                    </div>
                  </button>
                  <div class="print-recommendation-note">
                    <ts-icon name="info" class="print-icon" />
                    <span>Recommended print size: &ge; 3.5 &times; 3.5 cm (1.4 &times; 1.4 in) for guaranteed camera readability.</span>
                  </div>
                </div>
              }
            </div>

            <!-- Quick SVG Vector Export -->
            <button
              type="button"
              class="quick-svg-btn"
              [disabled]="!qrDataUrl() || isGenerating()"
              (click)="onDownload('svg')"
              [title]="!qrDataUrl() ? 'Enter content to download' : 'Download vector SVG'"
              aria-label="Download vector SVG"
            >
              <ts-icon name="file-code" class="btn-icon" />
              <span>SVG</span>
            </button>

            <!-- Quick Share Button -->
            <button
              type="button"
              class="quick-share-btn"
              [disabled]="!qrDataUrl() || isGenerating()"
              (click)="onShare()"
              [title]="!qrDataUrl() ? 'Enter content to share' : (copiedShare() ? 'Link / image copied!' : 'Share QR code')"
              aria-label="Share QR code"
            >
              <ts-icon [name]="copiedShare() ? 'check' : 'share-2'" class="btn-icon" />
              <span>{{ copiedShare() ? 'Copied' : 'Share' }}</span>
            </button>
          </div>

          <!-- Clean Footer Note -->
          <div class="preview-footer-note">

          </div>
        </div>

        <!-- Advanced Technical Settings Sectioned Modal -->
        <app-qr-advanced-modal
          [isOpen]="isAdvancedOpen()"
          [errorCorrection]="errorCorrection()"
          [isAutoEc]="isAutoEc()"
          [autoEcReason]="autoEcReason()"
          [size]="size()"
          [margin]="margin()"
          [isSmartLink]="isSmartLink()"
          [metadata]="metadata()"
          [formattedPayload]="formattedPayload()"
          (close)="isAdvancedOpen.set(false)"
          (errorCorrectionChange)="errorCorrectionChange.emit($event)"
          (isAutoEcChange)="isAutoEcChange.emit($event)"
          (sizeChange)="sizeChange.emit($event)"
          (marginChange)="marginChange.emit($event)"
          (resetDefaults)="resetDefaults.emit()"
          (openDynamicLinks)="openDynamicLinks.emit()"
        />

        <!-- History Popover/Drawer Overlay -->
        @if (isHistoryOpen()) {
          <div class="history-overlay-panel slide-fade-up" role="dialog" aria-label="Recent QR Codes">
            <div class="history-panel-header">
              <div class="history-title-box">
                <ts-icon name="history" class="history-title-icon" />
                <h3 class="history-panel-title">Recent QR Codes ({{ historyItems().length }})</h3>
              </div>
              <div class="history-header-btns">
                @if (historyItems().length > 0) {
                  <button type="button" class="history-clear-btn" (click)="clearHistory.emit()" title="Clear history">
                    Clear
                  </button>
                }
                <button type="button" class="history-close-btn" (click)="isHistoryOpen.set(false)" aria-label="Close history">
                  <ts-icon name="x" />
                </button>
              </div>
            </div>

            <div class="history-panel-body custom-scrollbar">
              @if (historyItems().length === 0) {
                <div class="history-empty-box">
                  <ts-icon name="history" class="history-empty-icon" />
                  <p class="history-empty-text">No recent QR codes in this session.</p>
                </div>
              } @else {
                <div class="history-list" role="list">
                  @for (item of historyItems(); track item.id) {
                    <div
                      class="history-item-row"
                      role="button"
                      tabindex="0"
                      (click)="restoreItem.emit(item); isHistoryOpen.set(false)"
                      (keydown.enter)="restoreItem.emit(item); isHistoryOpen.set(false)"
                      title="Click to restore this QR code"
                    >
                      <div class="history-thumb-box">
                        <img [src]="item.dataUrl" alt="Thumbnail" class="history-thumb-img" />
                      </div>
                      <div class="history-item-meta-info">
                        <div class="history-item-top">
                          @if (item.name) {
                            <span class="history-item-name" [title]="item.name">{{ item.name }}</span>
                          }
                          <span class="history-badge">{{ item.type }}</span>
                          <span class="history-timestamp">{{ formatTime(item.createdAt) }}</span>
                        </div>
                        <span class="history-content-snip">{{ item.content }}</span>
                      </div>
                      <ts-icon name="arrow-up-right" class="history-restore-icon" />
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }

    .qr-preview-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }

    .preview-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      background: var(--surface-1, #111A2E);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-card, 20px);
      padding: 12px 14px;
      gap: 8px;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    .preview-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      padding-bottom: 2px;
    }

    .preview-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-icon {
      color: var(--tool-accent, var(--accent, #3b82f6));
      width: 18px;
      height: 18px;
    }

    .preview-title-block {
      display: flex;
      flex-direction: column;
      justify-content: center;
      line-height: 1.15;
    }

    .preview-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .preview-subtitle {
      font-size: 10.5px;
      font-weight: 500;
      color: var(--text-muted, #94a3b8);
      letter-spacing: 0.2px;
    }

    .preview-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #60a5fa);
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.25));
    }

    .smart-link-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #3b82f6);
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.3));
      cursor: help;
      user-select: none;
      transition: all 0.15s ease;
    }

    .smart-link-chip .chip-icon {
      width: 12px;
      height: 12px;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 6px var(--tool-accent-glow, rgba(59, 130, 246, 0.4));
    }

    .preview-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .header-icon-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.7)));
      cursor: pointer;
      transition: all 150ms ease;
    }

    .header-icon-btn:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
    }

    .header-icon-btn.active {
      background: var(--surface-2, rgba(255, 255, 255, 0.1));
      color: var(--tool-accent, #60a5fa);
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.3));
    }

    .btn-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 15px;
      height: 15px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--tool-accent, #3b82f6);
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      border: 1.5px solid var(--surface-card, #ffffff);
    }

    /* Overflow 3-dots Menu */
    .overflow-menu-container {
      position: relative;
    }

    .overflow-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 195px;
      background: var(--surface-1, #1e2027);
      border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.15));
      border-radius: 10px;
      padding: 5px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .overflow-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 500;
      text-align: left;
      transition: background 150ms ease;
    }

    .overflow-item:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
    }

    .overflow-item-icon {
      width: 15px;
      height: 15px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
      flex-shrink: 0;
    }

    .overflow-badge {
      margin-left: auto;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 999px;
      background: var(--tool-accent, #3b82f6);
      color: #ffffff;
    }

    .overflow-divider {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 3px 0;
    }

    /* Stage Area: Fits Available Height with ZERO Cropping */
    .qr-stage-wrapper {
      flex: 1 1 0%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .qr-stage {
      flex: 1 1 0%;
      min-height: 0;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-2, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-inner, 14px);
      padding: 10px;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

    .qr-preview-stage-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      max-height: 100%;
      max-width: 100%;
      height: 100%;
      box-sizing: border-box;
      min-height: 0;
    }

    .qr-tile-wrapper {
      max-height: calc(100% - 28px);
      max-width: 100%;
      aspect-ratio: 1 / 1;
      height: 100%;
      width: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      transition: opacity 180ms ease, padding 180ms ease;
    }

    .qr-tile-wrapper.is-empty {
      background: var(--surface-1, rgba(255, 255, 255, 0.04));
      border: 1.5px dashed var(--border-strong, rgba(255, 255, 255, 0.18));
      box-shadow: none;
    }
    :host-context([data-theme="light"]) .qr-tile-wrapper.is-empty,
    [data-theme="light"] .qr-tile-wrapper.is-empty {
      background: rgba(0, 0, 0, 0.02);
      border-color: rgba(0, 0, 0, 0.14);
    }

    .qr-tile-wrapper.is-loading,
    .qr-tile-wrapper.is-ready {
      background: #ffffff;
      border: none;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
    }

    .qr-tile-wrapper.is-error {
      background: var(--surface-1, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.18));
      box-shadow: none;
    }

    .qr-tile-wrapper.is-generating {
      opacity: 0.92;
    }

    .qr-tile-wrapper[data-size-tier="sm"] {
      padding: 12px;
    }
    .qr-tile-wrapper[data-size-tier="md"] {
      padding: 8px;
    }
    .qr-tile-wrapper[data-size-tier="lg"] {
      padding: 6px;
    }
    .qr-tile-wrapper[data-size-tier="xl"] {
      padding: 4px;
    }

    .preview-dimension-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--surface-1, rgba(0, 0, 0, 0.4));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.75)));
      flex-shrink: 0;
      user-select: none;
    }

    :host-context([data-theme="light"]) .preview-dimension-badge,
    [data-theme="light"] .preview-dimension-badge {
      background: #ffffff;
      border-color: rgba(0, 0, 0, 0.1);
      color: #334155;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .dimension-icon {
      width: 11px;
      height: 11px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .qr-tile-img {
      width: 100%;
      height: 100%;
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
      image-rendering: pixelated;
      display: block;
    }

    @keyframes qrScaleFade {
      0% {
        opacity: 0.7;
        transform: scale(0.97);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .qr-tile-img.reveal {
      animation: qrScaleFade 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    /* Sweep Scan-Line Laser Effect (Transform & Opacity only) */
    .qr-scan-line-track {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      border-radius: inherit;
      z-index: 5;
    }

    .qr-scan-line {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      will-change: transform, opacity;
      animation: qrScanSweep 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .qr-scan-line::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, var(--tool-accent, #3b82f6) 20%, #93c5fd 50%, var(--tool-accent, #3b82f6) 80%, transparent 100%);
      box-shadow: 0 0 10px 1.5px var(--tool-accent, rgba(59, 130, 246, 0.6));
    }

    .qr-scan-line::before {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 0;
      right: 0;
      height: 28px;
      background: linear-gradient(to top, var(--tool-accent-soft, rgba(59, 130, 246, 0.2)), transparent);
    }

    @keyframes qrScanSweep {
      0% {
        transform: translateY(-100%);
        opacity: 0;
      }
      15% {
        opacity: 1;
      }
      85% {
        opacity: 1;
      }
      100% {
        transform: translateY(0%);
        opacity: 0;
      }
    }

    /* Module-grid Skeleton for loading state */
    .qr-skeleton-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      animation: crossfadeScaleIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .skeleton-qr-svg {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
    }

    .skeleton-qr-svg .finder-outer {
      stroke: var(--tool-accent, #3b82f6);
      opacity: 0.85;
    }

    .skeleton-qr-svg .finder-inner {
      fill: var(--tool-accent, #3b82f6);
      opacity: 0.85;
    }

    .skeleton-timing-modules rect {
      fill: #94a3b8;
      opacity: 0.65;
    }

    .skeleton-grid-modules rect {
      fill: #94a3b8;
      animation: moduleShimmer 1.8s ease-in-out infinite alternate;
    }

    @keyframes moduleShimmer {
      0% {
        opacity: 0.2;
      }
      50% {
        opacity: 0.6;
      }
      100% {
        opacity: 0.25;
      }
    }

    .qr-assemble-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-tile-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
      will-change: transform, opacity;
    }

    .placeholder-qr-card-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      animation: crossfadeScaleIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    @keyframes crossfadeScaleIn {
      0% {
        opacity: 0;
        transform: scale(0.96);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes revealInPlace {
      0% {
        opacity: 0;
        transform: scale(0.97);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .fade-in-badges {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      animation: badgesFadeIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: opacity, transform;
    }

    @keyframes badgesFadeIn {
      0% {
        opacity: 0;
        transform: translateY(-2px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .qr-status-caption-zone {
      height: 20px;
      min-height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .animate-fade-in {
      animation: fadeInText 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes fadeInText {
      0% {
        opacity: 0;
        transform: translateY(2px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .qr-skeleton-inner,
      .qr-assemble-wrapper,
      .qr-tile-img.reveal-in-place,
      .placeholder-qr-card-inner,
      .fade-in-badges,
      .animate-fade-in,
      .qr-scan-line,
      .skeleton-grid-modules rect {
        animation: none !important;
        transform: none !important;
        opacity: 1 !important;
      }
    }

    /* States inside stage */
    .qr-state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      max-width: 260px;
      gap: 6px;
    }

    .empty-icon-bubble {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--surface-3, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }

    .state-icon {
      width: 22px;
      height: 22px;
    }

    .empty-icon {
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.4)));
    }

    .error-icon {
      color: #ef4444;
    }

    .state-title {
      margin: 0;
      font-size: 14px;
      font-weight: 650;
      color: var(--text, #fcfcfc);
    }

    .state-desc {
      margin: 0;
      font-size: 12px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.6)));
      line-height: 1.4;
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      background: var(--tool-accent, #2563eb);
      color: #ffffff;
      border: 1px solid var(--tool-accent, #2563eb);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .retry-btn:hover {
      opacity: 0.92;
      transform: translateY(-1px);
    }

    .fallback-notice-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding: 7px 12px;
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
      line-height: 1.35;
      max-width: 320px;
      text-align: left;
    }

    .fallback-notice-banner .notice-icon {
      color: var(--tool-accent, #3b82f6);
      flex-shrink: 0;
    }

    .fallback-retry-btn {
      margin-left: auto;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      background: var(--surface-3, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      cursor: pointer;
      flex-shrink: 0;
    }

    .fallback-retry-btn:hover {
      background: var(--tool-accent, #3b82f6);
      color: #ffffff;
    }

    .dev-warning-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 8px;
      padding: 3px 9px;
      border-radius: 6px;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.35);
      color: #eab308;
      font-size: 11px;
      font-weight: 600;
    }

    .empty-sample-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 600;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #60a5fa);
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.3));
      cursor: pointer;
      transition: transform 150ms ease, opacity 150ms ease, background 150ms ease;
    }

    .empty-sample-btn:hover {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.22));
      border-color: var(--tool-accent, #3b82f6);
      transform: translateY(-1px);
    }

    .empty-sample-btn:active {
      transform: translateY(0);
    }

    .empty-sample-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 2px;
    }

    .sample-btn-icon {
      width: 14px;
      height: 14px;
    }

    /* Vector Placeholder QR empty-first state */
    .qr-placeholder-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 10px;
    }

    .placeholder-qr-card {
      width: 170px;
      height: 170px;
      border-radius: 14px;
      background: var(--surface-1, rgba(255, 255, 255, 0.03));
      border: 1.5px dashed var(--border-strong, rgba(255, 255, 255, 0.16));
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      color: var(--text-muted, rgba(255, 255, 255, 0.3));
      transition: border-color 200ms ease, transform 200ms ease;
    }

    .placeholder-qr-svg {
      width: 130px;
      height: 130px;
      opacity: 0.35;
      color: var(--text-muted, #8b949e);
      animation: placeholderPulse 3.5s ease-in-out infinite alternate;
    }

    @keyframes placeholderPulse {
      0% {
        opacity: 0.25;
        transform: scale(0.98);
      }
      100% {
        opacity: 0.42;
        transform: scale(1.01);
      }
    }

    .placeholder-sweep-beam {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, transparent 35%, var(--tool-accent-soft, rgba(59, 130, 246, 0.08)) 50%, transparent 65%);
      animation: placeholderBeam 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      pointer-events: none;
    }

    @keyframes placeholderBeam {
      0% {
        transform: translateX(-100%) translateY(-100%);
      }
      100% {
        transform: translateX(100%) translateY(100%);
      }
    }

    .placeholder-caption {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.55)));
    }

    .placeholder-sample-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #60a5fa);
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.3));
      cursor: pointer;
      transition: transform 150ms ease, opacity 150ms ease, background 150ms ease;
    }

    .placeholder-sample-btn:hover {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.2));
      border-color: var(--tool-accent, #3b82f6);
      transform: translateY(-1px);
    }

    .placeholder-sample-btn:active {
      transform: translateY(0);
    }

    .placeholder-sample-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 2px;
    }

    .spinner-icon {
      width: 28px;
      height: 28px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .skeleton-text {
      font-size: 13px;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.7)));
      font-weight: 500;
    }

    /* Bottom Action Bar */
    .preview-action-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
      padding-top: 2px;
    }

    .action-buttons-cluster {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    /* Split Button Group */
    .split-btn-group {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1 1 0%;
      min-width: 0;
    }

    .split-primary-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex: 1 1 0%;
      height: 38px;
      padding: 0 14px;
      border-radius: 14px 0 0 14px;
      border: 1px solid var(--tool-accent, #3b82f6);
      border-right: none;
      background: var(--tool-accent, #3b82f6) !important;
      color: #ffffff !important;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
      transition: all 150ms ease;
      white-space: nowrap;
    }

    .split-primary-btn:hover:not(:disabled) {
      background: var(--tool-accent, #3b82f6) !important;
      color: #ffffff !important;
      filter: brightness(1.08);
      box-shadow: 0 2px 10px var(--tool-accent-glow, rgba(59, 130, 246, 0.35));
    }

    .split-primary-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .split-arrow-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 38px;
      border-radius: 0 14px 14px 0;
      border: 1px solid var(--tool-accent, #3b82f6);
      border-left: 1px solid rgba(255, 255, 255, 0.25);
      background: var(--tool-accent, #3b82f6) !important;
      color: #ffffff !important;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .split-arrow-btn:hover:not(:disabled) {
      background: var(--tool-accent, #3b82f6) !important;
      color: #ffffff !important;
      filter: brightness(1.08);
    }

    .split-arrow-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    .btn-chevron {
      width: 14px;
      height: 14px;
    }

    /* Split Dropdown Menu */
    .split-menu {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      right: 0;
      min-width: 220px;
      background: var(--surface-card, var(--surface-1, #1e2027));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .split-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--text, #18181b);
      cursor: pointer;
      text-align: left;
      transition: background 150ms ease, color 150ms ease;
      font-size: 12px;
    }

    :host-context([data-theme="dark"]) .split-menu-item {
      color: var(--text, #fcfcfc);
    }

    .split-menu-item:hover {
      background: var(--surface-hover, rgba(15, 23, 42, 0.06)) !important;
      color: var(--tool-accent, var(--accent, #3b82f6)) !important;
    }

    .menu-item-info {
      display: flex;
      flex-direction: column;
    }

    .menu-item-name {
      font-weight: 600;
      font-size: 12px;
    }

    .menu-item-desc {
      font-size: 10.5px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
    }

    .print-recommendation-note {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      padding: 8px 10px;
      margin-top: 4px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      font-size: 10px;
      line-height: 1.35;
      color: var(--text-tertiary, var(--text-2, rgba(255, 255, 255, 0.65)));
      background: var(--surface-2, rgba(255, 255, 255, 0.02));
      border-radius: 0 0 6px 6px;
    }

    .print-icon {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
      margin-top: 1px;
      color: var(--accent-primary, #0284c7);
    }

    /* Quick SVG Vector Export & Share Buttons */
    .quick-svg-btn,
    .quick-share-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      height: 38px;
      padding: 0 12px;
      border-radius: 14px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
      white-space: nowrap;
    }

    .quick-svg-btn:hover:not(:disabled),
    .quick-share-btn:hover:not(:disabled) {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    .quick-svg-btn:disabled,
    .quick-share-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    /* Test Scan Button */
    .test-scan-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 38px;
      padding: 0 14px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
      white-space: nowrap;
    }

    .test-scan-btn:hover:not(:disabled) {
      background: var(--surface-3, rgba(255, 255, 255, 0.1));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.3));
    }

    .test-scan-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .test-icon {
      width: 15px;
      height: 15px;
    }

    /* Footer Note Row */
    .preview-footer-note {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      padding: 0 2px;
    }

    .privacy-note {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .shield-icon {
      width: 12px;
      height: 12px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .kbd-key {
      font-family: var(--ts-font-mono, monospace);
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 4px;
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
    }

    /* History Popover Panel Overlay */
    .history-overlay-panel {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--surface-1, #111A2E);
      z-index: 60;
      border-radius: var(--ts-radius-card, 20px);
      display: flex;
      flex-direction: column;
      padding: 12px 14px;
      gap: 10px;
      overflow: hidden;
      box-sizing: border-box;
    }

    .history-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding-bottom: 8px;
    }

    .history-title-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .history-title-icon {
      width: 16px;
      height: 16px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .history-panel-title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--text, #fcfcfc);
    }

    .history-header-btns {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .history-clear-btn {
      background: transparent;
      border: none;
      color: #ef4444;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .history-clear-btn:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .history-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.7)));
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
    }

    .history-close-btn:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
    }

    .history-panel-body {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    .history-empty-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 30px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.4)));
    }

    .history-empty-icon {
      width: 32px;
      height: 32px;
      opacity: 0.5;
    }

    .history-empty-text {
      margin: 0;
      font-size: 12.5px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .history-item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      cursor: pointer;
      transition: all 150ms ease;
    }

    .history-item-row:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.3));
    }

    .history-thumb-box {
      width: 38px;
      height: 38px;
      border-radius: 6px;
      background: #ffffff;
      padding: 2px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .history-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .history-item-meta-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1 1 0%;
      min-width: 0;
    }

    .history-item-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .history-item-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      max-width: 110px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .history-badge {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 4px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--tool-accent, #60a5fa);
    }

    .history-timestamp {
      font-size: 10px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.4)));
    }

    .history-content-snip {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .history-restore-icon {
      width: 14px;
      height: 14px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.4)));
      flex-shrink: 0;
    }

    /* Advanced Technical Settings Modal Dialog */
    .advanced-modal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 120;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }

    .advanced-modal-card {
      width: 100%;
      max-width: 440px;
      max-height: 85%;
      background: var(--surface-1, #1a1c23);
      border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-title-icon {
      width: 16px;
      height: 16px;
      color: var(--tool-accent, #60a5fa);
    }

    .modal-title {
      margin: 0;
      font-size: 14px;
      font-weight: 650;
      color: var(--text, #fcfcfc);
    }

    .modal-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
      cursor: pointer;
      transition: all 150ms ease;
    }

    .modal-close-btn:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
    }

    .modal-body {
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .technical-raw-payload {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .payload-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .payload-label {
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    .payload-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      font-size: 11px;
      border-radius: 5px;
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      cursor: pointer;
      transition: background 150ms ease;
    }

    .payload-copy-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.14));
      color: var(--text, #ffffff);
    }

    .copy-icon {
      width: 12px;
      height: 12px;
    }

    .payload-code-block {
      margin: 0;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--surface-2, rgba(0, 0, 0, 0.3));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text, #fcfcfc);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 120px;
    }

    /* Scrollbars & Keyframes */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: var(--border, rgba(255, 255, 255, 0.15)) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 4px;
    }

    @keyframes slideFadeUp {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-fade-up {
      animation: slideFadeUp 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .header-icon-btn:focus-visible,
    .split-primary-btn:focus-visible,
    .split-arrow-btn:focus-visible,
    .split-menu-item:focus-visible,
    .test-scan-btn:focus-visible,
    .payload-header-btn:focus-visible,
    .payload-action-icon-btn:focus-visible {
      outline: 2px solid var(--tool-accent, var(--accent, #3b82f6));
      outline-offset: 2px;
    }

    @media (max-width: 1023px) {
      .preview-card {
        height: auto;
        min-height: unset;
        max-height: none;
      }
      .qr-stage-wrapper {
        min-height: 220px;
        max-height: 260px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up,
      .qr-scan-line,
      .qr-tile-img.reveal,
      .empty-sample-btn,
      * {
        animation: none !important;
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transform: none !important;
      }
    }
  `]
})
export class PreviewPanelComponent {
  readonly qrName = input<string>('');
  readonly qrDataUrl = input<string | null>(null);
  readonly shouldAnimateQR = input<boolean>(false);
  readonly isGenerating = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly formattedPayload = input<string>('');
  readonly encodedPayload = input<string | null>(null);
  readonly content = input<string>('');
  readonly metadata = input<QRMetadata | null>(null);
  readonly size = input<number>(512);
  readonly errorCorrection = input<ErrorCorrectionLevel>('M');
  readonly margin = input<number>(4);
  readonly isAutoEc = input<boolean>(true);
  readonly autoEcReason = input<string | undefined>(undefined);
  readonly historyItems = input<QRHistoryItem[]>([]);
  readonly dynamicCount = input<number>(0);
  readonly isSmartLink = input<boolean>(false);
  readonly isCreatingHostedLink = input<boolean>(false);
  readonly fallbackNotice = input<string | null>(null);
  readonly isDevAddressWarning = input<boolean>(false);
  readonly retryClick = output<void>();

  readonly sizeTier = computed<'sm' | 'md' | 'lg' | 'xl'>(() => {
    const s = this.size();
    if (s <= 256) return 'sm';
    if (s <= 512) return 'md';
    if (s <= 1024) return 'lg';
    return 'xl';
  });

  readonly downloadClick = output<ExportFormat>();
  readonly restoreItem = output<QRHistoryItem>();
  readonly clearHistory = output<void>();
  readonly openDynamicManager = output<void>();
  readonly loadSampleClick = output<void>();
  readonly autoFixClick = output<void>();
  readonly sizeChange = output<number>();
  readonly errorCorrectionChange = output<ErrorCorrectionLevel>();
  readonly marginChange = output<number>();
  readonly isAutoEcChange = output<boolean>();
  readonly resetDefaults = output<void>();
  readonly openDynamicLinks = output<void>();

  readonly isPayloadExpanded = signal<boolean>(false);
  readonly isFormatMenuOpen = signal<boolean>(false);
  readonly isHistoryOpen = signal<boolean>(false);
  readonly isOverflowMenuOpen = signal<boolean>(false);
  readonly isAdvancedOpen = signal<boolean>(false);
  readonly copiedImage = signal<boolean>(false);
  readonly copiedShare = signal<boolean>(false);
  readonly copiedPayload = signal<boolean>(false);
  readonly copiedContent = signal<boolean>(false);

  private verifier = inject(QRVerifierService);
  private qrService = inject(QRGeneratorService, { optional: true });
  readonly verification = signal<QRVerificationResult | null>(null);
  readonly isVerifying = signal<boolean>(false);

  constructor() {
    try {
      effect(() => {
        const url = this.qrDataUrl();
        const payload = this.encodedPayload() || this.formattedPayload();
        if (url && payload && !this.isGenerating() && !this.isCreatingHostedLink()) {
          this.runSilentVerification(url, payload);
        } else {
          this.verification.set(null);
        }
      });
    } catch {
      // Tolerate unit-test environments where an effect scheduler is not attached
    }
  }

  private async runSilentVerification(url: string, payload: string): Promise<void> {
    this.isVerifying.set(true);
    try {
      const res = await this.verifier.verifyScannability(url, payload);
      this.verification.set(res);
    } catch {
      // Silent verification failure is non-fatal
    } finally {
      this.isVerifying.set(false);
    }
  }

  toggleOverflowMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isOverflowMenuOpen.set(!this.isOverflowMenuOpen());
  }

  toggleFormatMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isFormatMenuOpen.set(!this.isFormatMenuOpen());
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isOverflowMenuOpen()) this.isOverflowMenuOpen.set(false);
    if (this.isFormatMenuOpen()) this.isFormatMenuOpen.set(false);
  }

  async testScannability(): Promise<void> {
    const url = this.qrDataUrl();
    if (!url || this.isVerifying()) return;
    this.isVerifying.set(true);
    const payload = this.encodedPayload() || this.formattedPayload();
    try {
      const res = await this.verifier.verifyScannability(url, payload);
      this.verification.set(res);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed.';
      this.verification.set({
        isScannable: false,
        expectedPayload: payload,
        match: false,
        message: errorMsg
      });
    } finally {
      this.isVerifying.set(false);
    }
  }

  getConfidenceCause(result: QRVerificationResult): string {
    if (result.reason) return result.reason;
    if (!result.isScannable) return 'Matrix density or low contrast obscures locators';
    if (result.confidence === 'low') return 'Dense payload or reduced module contrast';
    return 'Moderate contrast or complex shapes';
  }

  getConfidenceTip(result: QRVerificationResult): string {
    if (result.tip) return result.tip;
    return 'Click "Fix automatically" for high-contrast optimization';
  }

  onDownload(format: ExportFormat = 'png'): void {
    if (!this.qrDataUrl() || this.isGenerating()) return;
    this.downloadClick.emit(format);
  }

  async copyImageToClipboard(): Promise<void> {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl) return;

    try {
      const blob = this.qrService
        ? await this.qrService.svgToPngBlob(dataUrl, 2)
        : await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      this.copiedImage.set(true);
      setTimeout(() => this.copiedImage.set(false), 2000);
    } catch (err) {
      console.warn('[PreviewPanel] Failed to copy PNG image to clipboard:', err);
    }
  }

  async copyPayloadToClipboard(): Promise<void> {
    const payload = this.formattedPayload();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      this.copiedPayload.set(true);
      setTimeout(() => this.copiedPayload.set(false), 2000);
    } catch {}
  }

  async copyContentToClipboard(): Promise<void> {
    const raw = this.content();
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      this.copiedContent.set(true);
      setTimeout(() => this.copiedContent.set(false), 2000);
    } catch {}
  }

  async onShare(): Promise<void> {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl || this.isGenerating()) return;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const blob = this.qrService
          ? await this.qrService.svgToPngBlob(dataUrl, 2)
          : await (await fetch(dataUrl)).blob();
        const file = new File([blob], `qr-code-${Date.now()}.png`, { type: 'image/png' });

        const canShareFiles = typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
        if (canShareFiles) {
          await navigator.share({
            files: [file]
          });
          return;
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.warn('[PreviewPanel] Web Share failed, falling back to PNG download:', err);
      }
    }

    // Fallback: download PNG file with proper color, frame, and QR
    this.onDownload('png');
    this.copiedShare.set(true);
    setTimeout(() => this.copiedShare.set(false), 2000);
  }

  formatTime(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  }
}
