import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, ViewChild, ElementRef, HostListener, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultStorageService, AirVaultItem } from '../services/airvault-storage.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultColorService } from '../services/airvault-color.service';
import { AirVaultMotionService } from '../services/airvault-motion.service';
import { AirVaultClipboardService } from '../services/airvault-clipboard.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultSyncService } from '../services/airvault-sync.service';
import { AirVaultFilePreviewComponent } from './airvault-file-preview.component';
import { Subscription } from 'rxjs';

export interface PreviewToolbarAction {
  id: string;
  icon: string;
  label: string;
  tooltip: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-airvault-preview-modal',
  standalone: true,
  imports: [CommonModule, IconComponent, AirVaultFilePreviewComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="modal-backdrop" (click)="close.emit()" (keydown.escape)="close.emit()">
      <div class="preview-modal-box" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="preview-modal-header">
          <!-- Top Left Actions: Contextual File-Type Aware Toolbar -->
          <div class="preview-header-left">
            <!-- 1. Image Actions -->
            @if (resolvedCategory() === 'image') {
              <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 3.0" data-tooltip="Zoom in (+)" aria-label="Zoom in">
                <app-icon name="zoom-in" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.4" data-tooltip="Zoom out (-)" aria-label="Zoom out">
                <app-icon name="zoom-out" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="resetZoom()" [disabled]="zoomLevel() === 1.0" data-tooltip="Reset Zoom (100%)" aria-label="Reset zoom">
                <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
              </button>
              <span class="zoom-indicator">{{ (zoomLevel() * 100).toFixed(0) }}%</span>
            }

            <!-- 2. PDF Actions -->
            @else if (resolvedCategory() === 'pdf') {
              <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 3.0" data-tooltip="Zoom in (+)" aria-label="Zoom in">
                <app-icon name="zoom-in" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.4" data-tooltip="Zoom out (-)" aria-label="Zoom out">
                <app-icon name="zoom-out" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="resetZoom()" [disabled]="zoomLevel() === 1.0" data-tooltip="Reset Zoom" aria-label="Reset zoom">
                <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="onOpenExternal()" data-tooltip="Open in Browser PDF Viewer" aria-label="Open PDF in new tab">
                <app-icon name="external-link" class="icon-xs"></app-icon>
              </button>
            }

            <!-- 3. Video Actions -->
            @else if (resolvedCategory() === 'video') {
              <button class="av-btn-icon" (click)="toggleMediaPlay()" [attr.data-tooltip]="isPlaying() ? 'Pause' : 'Play'" [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'">
                <app-icon [name]="isPlaying() ? 'pause' : 'play'" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="toggleMute()" [attr.data-tooltip]="isMuted() ? 'Unmute' : 'Mute'" [attr.aria-label]="isMuted() ? 'Unmute' : 'Mute'">
                <app-icon [name]="isMuted() ? 'volume-x' : 'volume-2'" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="toggleFullscreen()" data-tooltip="Fullscreen" aria-label="Toggle fullscreen">
                <app-icon name="maximize-2" class="icon-xs"></app-icon>
              </button>
            }

            <!-- 4. Audio Actions -->
            @else if (resolvedCategory() === 'audio') {
              <button class="av-btn-icon" (click)="toggleMediaPlay()" [attr.data-tooltip]="isPlaying() ? 'Pause' : 'Play'" [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'">
                <app-icon [name]="isPlaying() ? 'pause' : 'play'" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="toggleMute()" [attr.data-tooltip]="isMuted() ? 'Unmute' : 'Mute'" [attr.aria-label]="isMuted() ? 'Unmute' : 'Mute'">
                <app-icon [name]="isMuted() ? 'volume-x' : 'volume-2'" class="icon-xs"></app-icon>
              </button>
            }

            <!-- 5. Spreadsheets (CSV/TSV) Actions -->
            @else if (resolvedCategory() === 'spreadsheet' && isCsvFormat()) {
              <button class="av-btn-icon" (click)="onCopyText()" aria-label="Copy CSV">
                <app-icon name="copy" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 2.0"  aria-label="Increase text size">
                <app-icon name="zoom-in" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.8"  aria-label="Decrease text size">
                <app-icon name="zoom-out" class="icon-xs"></app-icon>
              </button>
            }

            <!-- 6. Code & Text Actions -->
            @else if (resolvedCategory() === 'code' || resolvedCategory() === 'json' || resolvedCategory() === 'text' || isTextDoc()) {
              <button class="av-btn-icon" (click)="toggleWrap()" [class.active]="isWrapped()" [attr.data-tooltip]="isWrapped() ? 'Disable Word Wrap' : 'Enable Word Wrap'" aria-label="Toggle line wrapping">
                <app-icon name="wrap-text" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" [class.active]="isCopied()" (click)="onCopyText()" data-tooltip="Copy Content" aria-label="Copy text to clipboard">
                <app-icon [name]="isCopied() ? 'check' : 'copy'" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 2.0" data-tooltip="Increase font size" aria-label="Increase text size">
                <app-icon name="zoom-in" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.8" data-tooltip="Decrease font size" aria-label="Decrease text size">
                <app-icon name="zoom-out" class="icon-xs"></app-icon>
              </button>
            }

            <!-- Universal Action: Always Available for All Formats -->
            <button class="av-btn-icon download-btn" (click)="onDownload()" data-tooltip="Download File" aria-label="Download file">
              <app-icon name="download" class="icon-xs"></app-icon>
            </button>
          </div>

          <!-- Top Center: Category badge & Filename -->
          <div class="preview-header-center">
            @if (hasBatchGallery()) {
              <div class="gallery-nav-box">
                <button class="gallery-nav-btn" (click)="onPrevBatchItem()" [disabled]="currentBatchIndex() <= 0" title="Previous item (Left Arrow)">
                  <app-icon name="chevron-left" class="icon-xs"></app-icon>
                </button>
                <span class="gallery-counter">{{ currentBatchIndex() + 1 }} / {{ batchTotal() }}</span>
                <button class="gallery-nav-btn" (click)="onNextBatchItem()" [disabled]="currentBatchIndex() >= batchTotal() - 1" title="Next item (Right Arrow)">
                  <app-icon name="chevron-right" class="icon-xs"></app-icon>
                </button>
              </div>
            }
            <span class="preview-cat-badge">
              <app-icon [name]="getCategoryIcon(resolvedCategory())" class="icon-xs"></app-icon>
              <span>{{ getCategoryLabel(resolvedCategory()) | uppercase }}</span>
            </span>
            @if (currentDisplayItem().content.filename) {
              <span class="preview-filename">@for (part of getHighlightParts(currentDisplayItem().content.filename!, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
            }
          </div>

          <div class="preview-header-actions">
            <!-- Resource Ownership Pill (styled with author accent color only for the username/dot) -->
            <div class="preview-owner-pill" [attr.data-tooltip]="'Resource Owner: ' + getOwnerDisplay()">
              <span class="preview-owner-dot" [style.background]="getOwnerAccentColor()"></span>
              <span class="preview-owner-username" [style.color]="getOwnerAccentColor()">{{ getOwnerDisplay() }}</span>
            </div>

            <!-- Resource Timelimit / Retention Pill -->
            @if (currentDisplayItem().isPinned) {
              <div class="preview-retention-pill permanent-pill" data-tooltip="Pinned item · Stored permanently in AirHold">
                <app-icon name="pin" class="icon-xs text-cyan"></app-icon>
                <span>Permanent</span>
              </div>
            } @else {
              <div class="preview-retention-pill" [class.expiring-soon]="expiryInfo().isExpiringSoon"
                [attr.data-tooltip]="expiryInfo().isExpiringSoon ? '⚠️ Resource is close to expiration (' + expiryInfo().label + '). Pin to keep permanently.' : 'Auto-expires according to retention policy (' + expiryInfo().label + ')'">
                <app-icon [name]="expiryInfo().isExpiringSoon ? 'alert-triangle' : 'clock'" class="icon-xs" [class.text-amber]="expiryInfo().isExpiringSoon"></app-icon>
                <span>{{ retentionDisplayLabel() }}</span>
              </div>
            }

            <!-- Close -->
            <button class="av-btn-icon" (click)="close.emit()" aria-label="Close preview" data-tooltip="Close (Esc)">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          </div>
        </div>

        <!-- Content Stage (Unified File Preview Engine) -->
        <div class="preview-modal-stage" #stageContainer>
          @if (isBurnedMessageVisible()) {
            <div class="modal-burned-overlay">
              <app-icon name="flame" class="icon-lg text-amber burned-icon"></app-icon>
              <h3 class="burned-title">This item has been viewed and removed</h3>
              <p class="burned-sub">Burn-after-read policy executed · Purged permanently across all paired devices</p>
            </div>
          }
          @if (hasBatchGallery()) {
            <button
              class="stage-nav-arrow stage-nav-prev"
              (click)="onPrevBatchItem()"
              [disabled]="currentBatchIndex() <= 0"
              aria-label="Previous file"
              title="Previous file (Left Arrow)">
              <app-icon name="chevron-left" class="icon-sm"></app-icon>
            </button>
            <button
              class="stage-nav-arrow stage-nav-next"
              (click)="onNextBatchItem()"
              [disabled]="currentBatchIndex() >= batchTotal() - 1"
              aria-label="Next file"
              title="Next file (Right Arrow)">
              <app-icon name="chevron-right" class="icon-sm"></app-icon>
            </button>
          }
          <app-airvault-file-preview #previewRef 
            [item]="currentDisplayItem()" 
            [zoomLevel]="zoomLevel()" 
            [isWrapped]="isWrapped()"
            (playingChange)="onPlayingChange($event)"
            (mutedChange)="onMutedChange($event)">
          </app-airvault-file-preview>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      animation: fadeIn 0.16s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .preview-modal-box {
      width: 100%;
      max-width: 960px;
      max-height: 88vh;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong);
      border-radius: var(--av-radius-lg);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: scaleIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    /* Header */
    .preview-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid var(--av-border);
      background: var(--av-surface-secondary);
      flex-shrink: 0;
      position: relative;
      min-height: 52px;
      box-sizing: border-box;
    }

    .preview-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 2;
    }

    .preview-header-center {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      max-width: calc(100% - 280px);
      z-index: 1;
    }

    .preview-filename {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--av-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320px;
    }

    .preview-cat-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: var(--av-text-primary);
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      padding: 3px 8px;
      border-radius: var(--av-radius-pill);
      flex-shrink: 0;
    }

    .preview-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 2;
    }

    /* Tooltip downward placement for modal header elements to prevent clipping */
    .preview-modal-header [data-tooltip] {
      position: relative;
    }
    .preview-modal-header [data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: auto;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) translateY(-4px);
      padding: 4px 8px;
      background: var(--av-tooltip-bg, #101828);
      color: var(--av-tooltip-text, #fff);
      font-size: 11px;
      font-weight: 500;
      font-family: var(--av-font-ui);
      line-height: 1.3;
      white-space: nowrap;
      border-radius: 5px;
      border: 1px solid rgba(255,255,255,0.1);
      opacity: 0;
      pointer-events: none;
      z-index: 99999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      transition: opacity 0.12s ease, transform 0.12s ease;
    }

    .preview-modal-header [data-tooltip]:hover::after {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .preview-header-actions [data-tooltip]::after {
      left: auto;
      right: 0;
      transform: translateY(-4px);
    }
    .preview-header-actions [data-tooltip]:hover::after {
      transform: translateY(0);
      opacity: 1;
    }

    /* Stage */
    .preview-modal-stage {
      flex: 1 1 auto;
      overflow-y: auto;
      background: var(--av-surface-primary);
      display: flex;
      flex-direction: column;
      min-height: 360px;
      max-height: calc(88vh - 65px);
      box-sizing: border-box;
      width: 100%;
    }

    app-airvault-file-preview {
      display: flex;
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
    }

    /* Image viewer */
    .big-img-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: var(--av-bg-canvas, #09090b);
      min-height: 380px;
    }
    .big-preview-img {
      max-width: 100%;
      max-height: 72vh;
      object-fit: contain;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }

    /* Video viewer */
    .big-video-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: var(--av-bg-canvas, #09090b);
    }
    .big-preview-video {
      max-width: 100%;
      max-height: 72vh;
      border-radius: 6px;
      outline: none;
    }

    /* URL viewer */
    .big-url-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
    }
    .big-url-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      max-width: 600px;
      text-align: center;
    }
    .url-big-icon { color: #3B82F6; }
    .big-url-text {
      font-size: 16px;
      font-weight: 500;
      color: #3B82F6;
      word-break: break-all;
      line-height: 1.5;
      text-decoration: underline;
    }
    .url-open-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Code & JSON viewer */
    .big-code-container {
      padding: 20px 24px;
      background: var(--av-surface-secondary);
      flex: 1;
    }
    .big-code-pre {
      margin: 0;
      font-family: var(--av-font-mono);
      font-size: 13px;
      line-height: 1.65;
      color: var(--av-text-primary);
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Text viewer */
    .big-text-container {
      padding: 24px 28px;
      flex: 1;
    }
    .big-text-pre {
      margin: 0;
      font-family: var(--av-font-ui);
      font-size: 14px;
      line-height: 1.7;
      color: var(--av-text-primary);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .zoom-indicator {
      font-size: 11px;
      font-family: var(--av-font-mono);
      font-weight: 600;
      color: var(--av-text-muted);
      min-width: 36px;
      text-align: center;
    }
    .preview-filename {
      font-size: 12px;
      font-weight: 600;
      color: var(--av-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 260px;
    }
    .preview-owner-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: var(--av-radius-pill, 9999px);
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1;
      height: 28px;
      box-sizing: border-box;
      max-width: 170px;
      cursor: default;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .preview-owner-pill:hover {
      border-color: var(--av-border-strong, rgba(255, 255, 255, 0.2));
      background: var(--av-surface-secondary);
    }
    .preview-owner-dot {
      width: 6.5px;
      height: 6.5px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 6px currentColor;
    }
    .preview-owner-username {
      font-family: var(--av-font-ui);
      font-weight: 600;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview-retention-pill {
      display: inline-flex;
      align-items: center;
      gap: 5.5px;
      padding: 3px 10px;
      border-radius: var(--av-radius-pill, 9999px);
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      font-size: 11px;
      font-weight: 500;
      color: var(--av-text-secondary);
      line-height: 1;
      height: 28px;
      box-sizing: border-box;
      white-space: nowrap;
      cursor: default;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .preview-retention-pill:hover {
      border-color: var(--av-border-strong, rgba(255, 255, 255, 0.2));
      background: var(--av-surface-secondary);
    }
    .preview-retention-pill.permanent-pill,
    .preview-retention-pill.lifetime-pill {
      color: var(--av-text-primary);
    }
    .preview-retention-pill.expiring-soon {
      color: #F59E0B;
      border-color: rgba(245, 158, 11, 0.35);
      background: rgba(245, 158, 11, 0.08);
    }
    .gallery-nav-box {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--av-radius-sm, 6px);
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong);
      margin-right: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .gallery-nav-btn {
      width: 22px;
      height: 22px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 4px;
      color: var(--av-text-primary);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .gallery-nav-btn:hover:not(:disabled) {
      background: var(--av-accent);
      border-color: var(--av-accent);
      color: #FFFFFF;
      transform: scale(1.05);
    }
    .gallery-nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .gallery-counter {
      font-size: 11px;
      font-weight: 700;
      font-family: var(--av-font-mono);
      color: var(--av-text-primary);
      padding: 0 6px;
      letter-spacing: 0.5px;
    }
    .stage-nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong);
      color: var(--av-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 30;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
      transition: all 0.16s ease;
      opacity: 0.88;
    }
    .stage-nav-arrow:hover:not(:disabled) {
      opacity: 1;
      transform: translateY(-50%) scale(1.1);
      background: var(--av-surface-primary);
      border-color: var(--av-accent);
      color: var(--av-accent);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .stage-nav-arrow:disabled {
      opacity: 0.15;
      cursor: not-allowed;
      pointer-events: none;
    }
    .stage-nav-prev {
      left: 18px;
    }
    .stage-nav-next {
      right: 18px;
    }

    .modal-burned-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--av-surface-primary);
      z-index: 50;
      gap: 12px;
      padding: 24px;
      text-align: center;
      animation: fadeIn 0.2s ease-out;
    }
    .burned-icon {
      font-size: 32px;
      color: #F59E0B;
      animation: pulse 1.5s infinite;
    }
    .burned-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--av-text-primary);
      margin: 0;
    }
    .burned-sub {
      font-size: 12.5px;
      color: var(--av-text-secondary);
      max-width: 360px;
      margin: 0;
      line-height: 1.4;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultPreviewModalComponent implements OnInit, OnDestroy {
  @ViewChild('previewRef') previewRef?: AirVaultFilePreviewComponent;
  @ViewChild('stageContainer') stageContainer?: ElementRef<HTMLElement>;

  motion = inject(AirVaultMotionService);
  clipboardService = inject(AirVaultClipboardService);
  deviceService = inject(AirVaultDeviceService);
  storageService = inject(AirVaultStorageService);
  colorService = inject(AirVaultColorService);
  syncService = inject(AirVaultSyncService);
  uiStore = inject(AirVaultUIStore);
  item = input.required<AirVaultItem>();
  close = output<void>();

  isBurnedMessageVisible = signal<boolean>(false);
  private burnSub?: Subscription;

  constructor() {
    effect(() => {
      const it = this.currentDisplayItem();
      if (it && it.burnAfterRead && !it.isBurned) {
        this.syncService.emitItemViewed(it.id, it.content?.category);
      }
    });
  }

  ngOnInit(): void {
    const it = this.currentDisplayItem();
    if (it && it.burnAfterRead && !it.isBurned) {
      this.syncService.emitItemViewed(it.id, it.content?.category);
    }

    this.burnSub = this.syncService.onItemBurned.subscribe(event => {
      const current = this.currentDisplayItem();
      const parent = this.item();
      if (event.itemId === current.id || event.itemId === parent.id) {
        this.handleBurnEvent();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.burnSub) {
      this.burnSub.unsubscribe();
    }
  }

  private handleBurnEvent(): void {
    if (this.isBurnedMessageVisible()) return;

    const el = this.stageContainer?.nativeElement;
    if (el) {
      this.motion.animateModalBurnDissolve(el, () => {
        this.isBurnedMessageVisible.set(true);
        setTimeout(() => {
          this.close.emit();
        }, 800);
      });
    } else {
      this.isBurnedMessageVisible.set(true);
      setTimeout(() => {
        this.close.emit();
      }, 800);
    }
  }

  searchHighlightQuery = computed(() => this.uiStore.searchHighlightQuery());

  getHighlightParts(text: string, query: string): { text: string; isMatch: boolean }[] {
    if (!text) return [];
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`(\\b${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b)`, 'gi');
    } else {
      pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
    }

    const parts = text.split(pattern);
    return parts.filter(p => p.length > 0).map(part => ({
      text: part,
      isMatch: part.toLowerCase() === q.toLowerCase()
    }));
  }

  activeBatchIndex = signal<number>(0);

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.hasBatchGallery()) return;
    if (e.key === 'ArrowLeft') {
      this.onPrevBatchItem();
    } else if (e.key === 'ArrowRight') {
      this.onNextBatchItem();
    }
  }

  hasBatchGallery = computed(() => {
    const it = this.item();
    return (it.isBatchParent && it.batchFiles && it.batchFiles.length > 1);
  });

  batchTotal = computed(() => {
    const it = this.item();
    return it.batchFiles?.length || 0;
  });

  currentBatchIndex = computed(() => {
    return Math.min(this.activeBatchIndex(), Math.max(0, this.batchTotal() - 1));
  });

  currentDisplayItem = computed(() => {
    const it = this.item();
    if (it.isBatchParent && it.batchFiles && it.batchFiles.length > 0) {
      const idx = this.currentBatchIndex();
      return it.batchFiles[idx] || it;
    }
    return it;
  });

  onPrevBatchItem() {
    if (this.currentBatchIndex() > 0) {
      this.activeBatchIndex.update(idx => idx - 1);
      this.resetZoom();
    }
  }

  onNextBatchItem() {
    if (this.currentBatchIndex() < this.batchTotal() - 1) {
      this.activeBatchIndex.update(idx => idx + 1);
      this.resetZoom();
    }
  }

  getOwnerDisplay(): string {
    const it = this.currentDisplayItem();
    const cur = this.deviceService.currentDevice();
    const isSelf = !it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id || it.senderDeviceName === 'MacBook' || it.senderDeviceName === cur.name;
    if (isSelf) {
      return cur.username ? `@${cur.username}` : (cur.name?.startsWith('@') ? cur.name : `@${cur.name || 'User'}`);
    }
    if (it.originOwnerId && it.originOwnerId !== 'MacBook' && !it.originOwnerId.startsWith('dev-')) {
      return it.originOwnerId.startsWith('@') ? it.originOwnerId : `@${it.originOwnerId}`;
    }
    if (it.senderDeviceName && it.senderDeviceName !== 'MacBook') {
      return it.senderDeviceName.startsWith('@') ? it.senderDeviceName : `@${it.senderDeviceName}`;
    }
    return cur.username ? `@${cur.username}` : '@User';
  }

  getOwnerAccentColor(): string {
    const it = this.currentDisplayItem();
    if (it.authorColor) return it.authorColor;
    if (it.author_color) return it.author_color;
    if (it.senderDeviceAccent) return it.senderDeviceAccent;

    const cur = this.deviceService.currentDevice();
    const isSelf = !it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id || it.senderDeviceName === 'MacBook' || it.senderDeviceName === cur.name;
    if (isSelf && cur.accentColor) {
      return cur.accentColor;
    }

    const matchedDevice = this.deviceService.pairedDevices().find(d => 
      d.id === it.originDeviceId || 
      d.id === it.senderDeviceId || 
      (it.originOwnerId && (d.username === it.originOwnerId || `@${d.username}` === it.originOwnerId || d.name === it.originOwnerId)) ||
      (it.senderDeviceName && (d.name === it.senderDeviceName || d.username === it.senderDeviceName))
    );
    if (matchedDevice?.accentColor) {
      return matchedDevice.accentColor;
    }

    const owner = it.originOwnerId || it.senderDeviceName || this.getOwnerDisplay();
    return this.colorService.getColorForIdentity(owner, isSelf ? cur.accentColor : undefined);
  }

  expiryInfo = computed(() => {
    return this.storageService.getItemExpiryInfo(this.currentDisplayItem());
  });

  retentionDisplayLabel = computed(() => {
    const info = this.expiryInfo();
    if (info.isLifetime) return 'Lifetime';
    if (info.isPinned) return 'Permanent';
    if (info.isExpiringSoon) return info.label;
    const remainingDays = Math.ceil(info.remainingMs / (24 * 60 * 60 * 1000));
    if (remainingDays >= 6) return '7 Days';
    if (remainingDays > 1) return `${remainingDays} Days`;
    return info.label;
  });

  zoomLevel = signal<number>(1.0);
  isWrapped = signal<boolean>(true);
  isPlaying = signal<boolean>(false);
  isMuted = signal<boolean>(false);
  isCopied = signal<boolean>(false);

  isLifetimeRetention = computed(() => {
    const it = this.currentDisplayItem();
    return (it.content?.byteSize || 0) > (5 * 1024 * 1024) || it.isLifetimeRetention === true;
  });

  resolvedCategory = computed(() => {
    const it = this.currentDisplayItem();
    const filename = (it.content.filename || '').toLowerCase();
    const raw = it.content.previewUrl || it.content.raw || '';
    const explicitCat = it.content.category;

    if (explicitCat === 'image' || raw.startsWith('data:image/') || /\.(jpe?g|png|webp|gif|svg|heic|bmp|ico)$/i.test(filename)) {
      return 'image';
    }
    if (explicitCat === 'video' || raw.startsWith('data:video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename)) {
      return 'video';
    }
    if (explicitCat === 'audio' || raw.startsWith('data:audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(filename)) {
      return 'audio';
    }
    if (explicitCat === 'pdf' || raw.startsWith('data:application/pdf') || filename.endsWith('.pdf')) {
      return 'pdf';
    }
    if (explicitCat === 'spreadsheet' || /\.(csv|tsv|xlsx|xls)$/i.test(filename)) {
      return 'spreadsheet';
    }
    if (explicitCat === 'archive' || /\.(zip|rar|7z|tar|gz|bz2)$/i.test(filename) || raw.startsWith('data:application/zip')) {
      return 'archive';
    }
    if (explicitCat === 'font' || /\.(ttf|otf|woff|woff2)$/i.test(filename)) {
      return 'font';
    }
    if (explicitCat === 'code' || explicitCat === 'json' || /\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml|sql|sh|yaml|yml|rs|go|php)$/i.test(filename)) {
      return explicitCat === 'json' ? 'json' : 'code';
    }
    if (explicitCat === 'url' || /^https?:\/\//i.test(raw)) {
      return 'url';
    }
    return explicitCat || 'file';
  });

  isCsvFormat(): boolean {
    const filename = (this.item().content.filename || '').toLowerCase();
    return filename.endsWith('.csv') || filename.endsWith('.tsv') || (!filename && this.item().content.category === 'spreadsheet');
  }

  isTextDoc(): boolean {
    const filename = (this.item().content.filename || '').toLowerCase();
    const cat = this.resolvedCategory();
    const raw = this.item().content.raw || '';
    if (cat === 'spreadsheet' || this.isCsvFormat() || /\.(docx?|xlsx?|pptx?|pdf|zip|rar|7z|tar|gz|psd|ai|fig|sketch|xd|epub|mobi|ttf|otf|woff2?|mp3|wav|mp4|mov)$/i.test(filename)) {
      return false;
    }
    if (cat === 'file' && (raw.startsWith('data:') || raw.startsWith('[Encrypted') || raw.length === 0)) {
      return false;
    }
    return /\.(txt|rtf|md|log|cfg|ini|env|json|js|ts|html|css|py|sh)$/i.test(filename) || (!raw.startsWith('data:') && !raw.startsWith('[Encrypted'));
  }

  zoomIn() {
    this.zoomLevel.update(z => Math.min(3.0, +(z + 0.25).toFixed(2)));
  }

  zoomOut() {
    this.zoomLevel.update(z => Math.max(0.4, +(z - 0.25).toFixed(2)));
  }

  resetZoom() {
    this.zoomLevel.set(1.0);
  }

  toggleWrap() {
    this.isWrapped.update(w => !w);
  }

  toggleMediaPlay() {
    this.previewRef?.togglePlay();
  }

  toggleMute() {
    this.previewRef?.toggleMute();
  }

  toggleFullscreen() {
    this.previewRef?.toggleFullscreen();
  }

  onPlayingChange(playing: boolean) {
    this.isPlaying.set(playing);
  }

  onMutedChange(muted: boolean) {
    this.isMuted.set(muted);
  }

  onOpenExternal() {
    const raw = this.item().content.previewUrl || this.item().content.raw;
    if (raw.startsWith('http') || raw.startsWith('blob:')) {
      window.open(raw, '_blank');
    } else if (raw.startsWith('data:')) {
      try {
        const parts = raw.split(',');
        const bstr = atob(parts[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
        const blob = new Blob([u8arr], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch {
        window.open(raw, '_blank');
      }
    }
  }

  async onCopyText(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      await navigator.clipboard.writeText(this.item().content.raw);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    } catch {}
  }

  async onCopy(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      const success = await this.clipboardService.copyResource(this.item().content);
      if (success) {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      }
    } catch {}
  }

  onDownload() {
    const raw = this.item().content.previewUrl || this.item().content.raw;
    const cat = this.item().content.category;
    let filename = this.item().content.filename;

    if (!filename) {
      if (cat === 'image') filename = `airvault_image_${Date.now()}.png`;
      else if (cat === 'video') filename = `airvault_video_${Date.now()}.mp4`;
      else if (cat === 'json') filename = `airvault_data_${Date.now()}.json`;
      else if (cat === 'code') filename = `airvault_code_${Date.now()}.txt`;
      else filename = `airvault_file_${Date.now()}.bin`;
    }

    let downloadUrl = '';
    if (raw.startsWith('data:')) {
      try {
        const parts = raw.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (filename.endsWith('.zip') ? 'application/zip' : 'application/octet-stream');
        const bstr = atob(parts[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: mime });
        downloadUrl = URL.createObjectURL(blob);
      } catch {
        downloadUrl = raw;
      }
    } else if (raw.startsWith('blob:') || raw.startsWith('http')) {
      downloadUrl = raw;
    } else {
      const isBinaryExt = /\.(zip|png|jpe?g|gif|webp|pdf|mp4|mov|tar|gz|7z|bin|dmg)$/i.test(filename);
      const mimeType = cat === 'json' ? 'application/json' : (isBinaryExt ? 'application/octet-stream' : 'text/plain');
      const blob = new Blob([raw], { type: mimeType });
      downloadUrl = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (downloadUrl.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
    }
  }

  getCategoryIcon(cat: string): string {
    const m: Record<string, string> = {
      code: 'code',
      url: 'link',
      image: 'file',
      video: 'film',
      audio: 'music',
      pdf: 'file-text',
      spreadsheet: 'table',
      archive: 'folder-archive',
      font: 'type',
      file: 'file-text',
      json: 'braces',
      text: 'align-left'
    };
    return m[cat] ?? 'file-text';
  }

  getCategoryLabel(cat: string): string {
    const m: Record<string, string> = {
      code: 'Code',
      url: 'Link',
      image: 'Image',
      video: 'Video',
      audio: 'Audio',
      pdf: 'PDF',
      spreadsheet: 'Sheet',
      archive: 'Archive',
      font: 'Font',
      file: 'File',
      json: 'JSON',
      text: 'Text'
    };
    return m[cat] ?? 'File';
  }

  formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
}
