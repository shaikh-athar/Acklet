import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, ViewChild, ElementRef, HostListener, OnInit, OnDestroy, effect, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultStorageService, AirVaultItem } from '../services/airvault-storage.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultColorService } from '../services/airvault-color.service';
import { AirVaultMotionService } from '../services/airvault-motion.service';
import { AirVaultClipboardService } from '../services/airvault-clipboard.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultSyncService } from '../services/airvault-sync.service';
import { AirVaultFilePreviewComponent } from './airvault-file-preview.component';
import { renderMarkdownToSafeHtml, renderPlainTextToSafeHtml, looksLikeMarkdown } from '../services/airvault-markdown.util';
import { AirVaultQuickActionsService } from '../services/airvault-quick-actions.service';
import { getPreviewCapabilities, PreviewCapabilities } from '../services/preview-capability.config';
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
  imports: [CommonModule, FormsModule, IconComponent, AirVaultFilePreviewComponent, forwardRef(() => AirVaultPreviewModalComponent)],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="modal-backdrop" [class.is-closing]="isClosing()" (click)="requestClose()" (keydown.escape)="requestClose()">
      <div class="preview-modal-box" [class.is-closing]="isClosing()" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="preview-modal-header">
          <!-- Top Left Actions: Contextual File-Type / Text Aware Toolbar + Search + Share -->
          <div class="preview-header-left">
            <!-- Search Toggle Button (for searchable resources) -->
            @if (isSearchableResource()) {
              <button class="av-btn-icon" [class.active]="showSearch()" (click)="toggleSearch()" [attr.data-tooltip]="showSearch() ? 'Close Search (Esc)' : 'Find in Document (Cmd/Ctrl+F)'" aria-label="Find in preview">
                <app-icon name="search" class="icon-xs"></app-icon>
              </button>
            }

            <!-- Case A: Base Mixed Item (Text + Attached Resources) — Show dedicated Text/Code/Note operations -->
            @if (hasMixedBatchText()) {
              <button class="av-btn-icon" (click)="toggleWrap()" [class.active]="isWrapped()" [attr.data-tooltip]="isWrapped() ? 'Disable Word Wrap' : 'Enable Word Wrap'" aria-label="Toggle line wrapping">
                <app-icon name="wrap-text" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" [class.active]="isCopied()" (click)="onCopyText()" data-tooltip="Copy Text Content" aria-label="Copy text to clipboard">
                <app-icon [name]="isCopied() ? 'check' : 'copy'" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 2.0" data-tooltip="Increase font size" aria-label="Increase text size">
                <app-icon name="zoom-in" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.8" data-tooltip="Decrease font size" aria-label="Decrease text size">
                <app-icon name="zoom-out" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon" (click)="resetZoom()" [disabled]="zoomLevel() === 1.0" data-tooltip="Reset font size" aria-label="Reset font size">
                <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
              </button>
              <button class="av-btn-icon download-btn" (click)="onDownloadText()" data-tooltip="Download Notes (.txt)" aria-label="Download text notes">
                <app-icon name="download" class="icon-xs"></app-icon>
              </button>
            }

            <!-- Case B: Standalone Pure Resource Items (Image, PDF, Video, Audio, Spreadsheet, Code) -->
            @else {
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

              <!-- 3. Audio Actions -->
              @else if (resolvedCategory() === 'audio') {
                <button class="av-btn-icon" (click)="toggleMediaPlay()" [attr.data-tooltip]="isPlaying() ? 'Pause' : 'Play'" [attr.aria-label]="isPlaying() ? 'Pause' : 'Play'">
                  <app-icon [name]="isPlaying() ? 'pause' : 'play'" class="icon-xs"></app-icon>
                </button>
                <button class="av-btn-icon" (click)="toggleMute()" [attr.data-tooltip]="isMuted() ? 'Unmute' : 'Mute'" [attr.aria-label]="isMuted() ? 'Unmute' : 'Mute'">
                  <app-icon [name]="isMuted() ? 'volume-x' : 'volume-2'" class="icon-xs"></app-icon>
                </button>
              }

              <!-- 4. Spreadsheets (CSV/TSV) Actions -->
              @else if (resolvedCategory() === 'spreadsheet' && isCsvFormat()) {
                @if (capabilities().canCopy) {
                  <button class="av-btn-icon" [class.active]="isCopied()" (click)="onCopyText()" data-tooltip="Copy CSV Content" aria-label="Copy CSV">
                    <app-icon [name]="isCopied() ? 'check' : 'copy'" class="icon-xs"></app-icon>
                  </button>
                }
                <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 2.0" data-tooltip="Increase font size" aria-label="Increase text size">
                  <app-icon name="zoom-in" class="icon-xs"></app-icon>
                </button>
                <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.8" data-tooltip="Decrease font size" aria-label="Decrease text size">
                  <app-icon name="zoom-out" class="icon-xs"></app-icon>
                </button>
                <button class="av-btn-icon" (click)="resetZoom()" [disabled]="zoomLevel() === 1.0" data-tooltip="Reset font size (100%)" aria-label="Reset font size">
                  <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
                </button>
              }

              <!-- 6. Code & Text Actions -->
              @else if (resolvedCategory() === 'code' || resolvedCategory() === 'json' || resolvedCategory() === 'text' || isTextDoc()) {
                <button class="av-btn-icon" (click)="toggleWrap()" [class.active]="isWrapped()" [attr.data-tooltip]="isWrapped() ? 'Disable Word Wrap' : 'Enable Word Wrap'" aria-label="Toggle line wrapping">
                  <app-icon name="wrap-text" class="icon-xs"></app-icon>
                </button>
                @if (capabilities().canCopy) {
                  <button class="av-btn-icon" [class.active]="isCopied()" (click)="onCopyText()" data-tooltip="Copy Content" aria-label="Copy text to clipboard">
                    <app-icon [name]="isCopied() ? 'check' : 'copy'" class="icon-xs"></app-icon>
                  </button>
                }
                <button class="av-btn-icon" (click)="zoomIn()" [disabled]="zoomLevel() >= 2.0" data-tooltip="Increase font size" aria-label="Increase text size">
                  <app-icon name="zoom-in" class="icon-xs"></app-icon>
                </button>
                <button class="av-btn-icon" (click)="zoomOut()" [disabled]="zoomLevel() <= 0.8" data-tooltip="Decrease font size" aria-label="Decrease text size">
                  <app-icon name="zoom-out" class="icon-xs"></app-icon>
                </button>
                <button class="av-btn-icon" (click)="resetZoom()" [disabled]="zoomLevel() === 1.0" data-tooltip="Reset font size (100%)" aria-label="Reset font size">
                  <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
                </button>
              }

              <!-- Universal Action: Download Resource (Guarded by Capability Policy) -->
              @if (capabilities().canDownload) {
                <button class="av-btn-icon download-btn" (click)="onDownload()" data-tooltip="Download File" aria-label="Download file">
                  <app-icon name="download" class="icon-xs"></app-icon>
                </button>
              }
            }
          </div>

          <!-- Top Center: Category badge & Filename OR In-Preview Search Bar -->
          <div class="preview-header-center">
            @if (showSearch()) {
              <!-- In-Preview Keyword Search Bar (reuses searchHighlightQuery & activeMatchIndex) -->
              <div class="preview-search-group" (click)="$event.stopPropagation()">
                <span class="search-icon-prefix">
                  <app-icon name="search" class="icon-xs search-icon"></app-icon>
                </span>
                <input
                  #searchInputRef
                  type="text"
                  class="navbar-search-input preview-search-input"
                  placeholder="Search in preview..."
                  [ngModel]="searchHighlightQuery()"
                  (ngModelChange)="onSearchInput($event)"
                  (keydown)="onSearchKeydown($event)"
                />

                @if (searchHighlightQuery().trim()) {
                  <div class="navbar-search-nav-controls">
                    <span class="navbar-search-match-pill" [class.has-matches]="totalMatches() > 0">
                      {{ totalMatches() > 0 ? ((activeMatchIndex() + 1) + ' of ' + totalMatches()) : '0 matches' }}
                    </span>

                    <button
                      type="button"
                      class="navbar-search-nav-btn"
                      [disabled]="totalMatches() === 0"
                      (click)="prevMatch($event)"
                      data-tooltip="Previous match (Shift+Enter)"
                      aria-label="Previous match">
                      <app-icon name="chevron-up" class="icon-xxs"></app-icon>
                    </button>

                    <button
                      type="button"
                      class="navbar-search-nav-btn"
                      [disabled]="totalMatches() === 0"
                      (click)="nextMatch($event)"
                      data-tooltip="Next match (Enter)"
                      aria-label="Next match">
                      <app-icon name="chevron-down" class="icon-xxs"></app-icon>
                    </button>

                    <button type="button" class="navbar-search-clear-btn" (click)="onSearchInput('')" data-tooltip="Clear search" aria-label="Clear search">
                      <app-icon name="x" class="icon-xxs"></app-icon>
                    </button>
                  </div>
                }

                <button type="button" class="av-btn-icon preview-search-close-btn" (click)="toggleSearch()" data-tooltip="Close search (Esc)" aria-label="Close search">
                  <app-icon name="x" class="icon-xs"></app-icon>
                </button>
              </div>
            } @else {
              @if (hasBatchGallery() && !hasMixedBatchText()) {
                <div class="gallery-nav-box">
                  <button class="gallery-nav-btn" (click)="onPrevBatchItem()" [disabled]="currentBatchIndex() <= 0" data-tooltip="Previous item (Left Arrow)" aria-label="Previous item">
                    <app-icon name="chevron-left" class="icon-xs"></app-icon>
                  </button>
                  <span class="gallery-counter">{{ currentBatchIndex() + 1 }} / {{ batchTotal() }}</span>
                  <button class="gallery-nav-btn" (click)="onNextBatchItem()" [disabled]="currentBatchIndex() >= batchTotal() - 1" data-tooltip="Next item (Right Arrow)" aria-label="Next item">
                    <app-icon name="chevron-right" class="icon-xs"></app-icon>
                  </button>
                </div>
              }
              <span class="preview-cat-badge">
                <app-icon [name]="hasMixedBatchText() ? 'align-left' : getCategoryIcon(resolvedCategory())" class="icon-xs"></app-icon>
                <span>{{ (hasMixedBatchText() ? 'Notes & Attachments' : getCategoryLabel(resolvedCategory())) | uppercase }}</span>
              </span>
              @if (!hasMixedBatchText() && currentDisplayItem().content.filename) {
                <span class="preview-filename">@for (part of getHighlightParts(currentDisplayItem().content.filename!, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
              }
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
            <button class="av-btn-icon" (click)="requestClose()" aria-label="Close preview" data-tooltip="Close (Esc)">
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
          @if (hasBatchGallery() && (!hasMixedBatchText() || isResourceViewerOpen())) {
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
          <div class="modal-content-flow" 
               [class.mixed-flow]="hasMixedBatchText()"
               [class.slide-nav-next]="slideDirection() === 'next'"
               [class.slide-nav-prev]="slideDirection() === 'prev'">
            @if (hasMixedBatchText()) {
              <!-- Mixed Item: Resource Capsule(s) Bar & Interactive Pills + Standalone Toggleable Viewer -->
              <div class="mixed-preview-container">
                <!-- Attached Resource Capsules Grid / Tiles -->
                <div class="mixed-capsules-section">
                  <div class="mixed-capsules-header">
                    <span class="capsules-section-title">
                      <app-icon name="paperclip" class="icon-xs text-muted"></app-icon>
                      <span>Attached Resources ({{ item().batchFiles?.length || 1 }})</span>
                    </span>
                    @if (isResourceViewerOpen()) {
                      <button class="capsules-collapse-viewer-btn" (click)="toggleResourceViewer()" data-tooltip="Hide Media Preview" data-tooltip-pos="left">
                        <app-icon name="chevron-up" class="icon-xs"></app-icon>
                        <span>Hide Preview</span>
                      </button>
                    }
                  </div>

                  <div class="mixed-capsules-grid">
                    @for (subFile of item().batchFiles || [item()]; track subFile.id; let idx = $index) {
                      <div class="mixed-resource-capsule-card" 
                           (click)="openDedicatedResourceModal(subFile)">
                        <div class="capsule-thumb-box" [ngClass]="getBatchFileBgClass(subFile)">
                          @if (subFile.content?.previewUrl || (subFile.content?.category === 'image' && subFile.content?.raw)) {
                            <img [src]="subFile.content?.previewUrl || (subFile.content?.category === 'image' ? subFile.content?.raw : '')" class="capsule-thumb-img" alt="" />
                          } @else {
                            <app-icon [name]="getCategoryIcon(subFile.content?.category || 'file')" class="icon-xs" [ngClass]="getBatchFileIconClass(subFile)"></app-icon>
                          }
                        </div>
                        <div class="capsule-meta-info">
                          <span class="capsule-filename" [title]="subFile.content?.filename">{{ subFile.content?.filename || 'Attachment' }}</span>
                          <span class="capsule-size">{{ formatBytes(subFile.content?.byteSize || 0) }}</span>
                        </div>
                        <div class="capsule-action-badge" data-tooltip="Open full preview">
                          <app-icon name="maximize-2" class="icon-xs"></app-icon>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Complete Rich Text Content Document View -->
                <div class="mixed-preview-text-section">
                  <div class="mixed-text-section-header">
                    <app-icon name="align-left" class="icon-xs text-muted"></app-icon>
                    <span>Content & Notes</span>
                  </div>
                  <div class="av-rich-document-preview" [class.nowrap-pre]="!isWrapped()" [style.font-size.px]="14 * zoomLevel()" [innerHTML]="safeFormattedMixedText()"></div>
                </div>
              </div>
            } @else {
              <!-- Pure Resource / File Standalone Viewer -->
              <app-airvault-file-preview #previewRef 
                [item]="currentDisplayItem()" 
                [zoomLevel]="zoomLevel()" 
                [isWrapped]="isWrapped()"
                (playingChange)="onPlayingChange($event)"
                (mutedChange)="onMutedChange($event)">
              </app-airvault-file-preview>
            }
          </div>
        </div>
      </div>

      <!-- Dedicated Standalone Child Resource Preview Modal (Opens on top when clicking an attachment capsule) -->
      @if (selectedResourceItem()) {
        <app-airvault-preview-modal
          [item]="selectedResourceItem()!"
          (close)="closeDedicatedResourceModal()">
        </app-airvault-preview-modal>
      }
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
      animation: avBackdropIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .modal-backdrop.is-closing {
      animation: avBackdropOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      pointer-events: none;
    }

    @keyframes avBackdropIn {
      0% {
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
      }
      100% {
        opacity: 1;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
    }

    @keyframes avBackdropOut {
      0% {
        opacity: 1;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      100% {
        opacity: 0;
        backdrop-filter: blur(0px);
        -webkit-backdrop-filter: blur(0px);
      }
    }

    .preview-modal-box {
      width: 100%;
      max-width: 960px;
      max-height: 88vh;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong);
      border-radius: var(--av-radius-lg);
      box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-sizing: border-box;
      animation: avModalOpen 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      transform-origin: center center;
      will-change: transform, opacity;
    }

    .preview-modal-box.is-closing {
      animation: avModalClose 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      pointer-events: none;
    }

    @keyframes avModalOpen {
      0% {
        opacity: 0;
        transform: scale(0.92) translateY(16px);
        filter: blur(4px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
        filter: blur(0px);
      }
    }

    @keyframes avModalClose {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
        filter: blur(0px);
      }
      100% {
        opacity: 0;
        transform: scale(0.94) translateY(12px);
        filter: blur(4px);
      }
    }

    /* 0.5s Next / Previous Carousel Item Slide & Fade Animations */
    .modal-content-flow.slide-nav-next {
      animation: avSlideNext 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    .modal-content-flow.slide-nav-prev {
      animation: avSlidePrev 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      will-change: transform, opacity;
    }

    @keyframes avSlideNext {
      0% {
        opacity: 0;
        transform: translateX(42px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes avSlidePrev {
      0% {
        opacity: 0;
        transform: translateX(-42px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
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
      z-index: 50;
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

    .preview-search-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 8px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border-strong, #363D47);
      border-radius: var(--av-radius-sm, 6px);
      box-sizing: border-box;
      position: relative;
      width: 320px;
      max-width: 100%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      animation: avSearchGroupPop 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes avSearchGroupPop {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1); }
    }

    .preview-search-input {
      flex: 1;
      min-width: 60px;
      border: none;
      background: transparent;
      outline: none;
      font-size: 12px;
      font-family: var(--av-font-ui);
      color: var(--av-text-primary);
    }

    .preview-search-close-btn {
      width: 20px;
      height: 20px;
      border: none;
      padding: 0;
      color: var(--av-text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.12s, background 0.12s;
    }

    .preview-search-close-btn:hover {
      color: var(--av-text-primary);
      background: var(--av-surface-secondary);
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

    /* First button in left toolbar — anchor tooltip to left edge to prevent overflow */
    .preview-header-left .av-btn-icon:first-child::after {
      left: 0;
      transform: translateX(0) translateY(-4px);
    }
    .preview-header-left .av-btn-icon:first-child:hover::after {
      transform: translateX(0) translateY(0);
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
      position: relative;
    }

    .modal-content-flow {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
      min-height: 0;
    }
    .modal-content-flow.mixed-flow {
      height: auto;
      min-height: 100%;
    }

    .mixed-preview-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
    }

    .mixed-capsules-section {
      padding: 16px 24px;
      background: var(--av-surface-secondary);
      border-bottom: 1px solid var(--av-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
    }

    .mixed-capsules-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .capsules-section-title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--av-text-secondary);
    }

    .capsules-collapse-viewer-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-muted);
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-sm, 6px);
      cursor: pointer;
      transition: all 0.14s ease;
      position: relative;
    }

    .capsules-collapse-viewer-btn:hover {
      background: var(--av-surface-tertiary, rgba(255, 255, 255, 0.08));
      color: var(--av-text-primary);
    }

    .capsules-collapse-viewer-btn[data-tooltip]::after {
      bottom: auto;
      top: calc(100% + 6px);
      left: auto;
      right: 0;
      transform: translateY(-4px);
      z-index: 99999;
    }

    .capsules-collapse-viewer-btn[data-tooltip]:hover::after {
      transform: translateY(0);
      opacity: 1;
    }

    .mixed-capsules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
      width: 100%;
    }

    .mixed-resource-capsule-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-md, 8px);
      cursor: pointer;
      transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      position: relative;
    }

    .mixed-resource-capsule-card:hover {
      border-color: var(--av-accent, #2196F3);
      background: var(--av-surface-secondary);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.12);
    }

    .mixed-resource-capsule-card.active-capsule {
      border-color: var(--av-accent, #2196F3);
      background: var(--av-accent-soft, rgba(33, 150, 243, 0.08));
      box-shadow: 0 0 0 1px var(--av-accent, #2196F3);
    }

    .capsule-thumb-box {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      border: 1px solid var(--av-border-subtle);
    }

    .capsule-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .capsule-meta-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1 1 auto;
    }

    .capsule-filename {
      font-size: 12px;
      font-weight: 600;
      color: var(--av-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .capsule-size {
      font-size: 10.5px;
      color: var(--av-text-muted);
      font-family: var(--av-font-mono);
    }

    .capsule-action-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border-radius: 6px;
      color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.2);
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .mixed-resource-capsule-card:hover .capsule-action-badge {
      background: var(--av-accent, #2196F3);
      color: #FFFFFF;
    }

    .mixed-expanded-viewer-card {
      border-bottom: 1px solid var(--av-border);
      background: var(--av-surface-primary);
      position: relative;
      animation: expandAnim 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes expandAnim {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .cat-bg-amber { background: #FEF3C7 !important; color: #D97706 !important; }
    .cat-bg-blue { background: #DBEAFE !important; color: #2563EB !important; }
    .cat-bg-purple { background: #EDE9FE !important; color: #7C3AED !important; }
    .cat-bg-cyan { background: #CFFAFE !important; color: #0891B2 !important; }
    .cat-bg-red { background: #FEE2E2 !important; color: #DC2626 !important; }
    .cat-bg-emerald { background: #D1FAE5 !important; color: #059669 !important; }
    .cat-bg-indigo { background: #E0E7FF !important; color: #4F46E5 !important; }

    :host-context([data-theme="dark"]) .cat-bg-amber { background: rgba(245, 158, 11, 0.16) !important; color: #FBBF24 !important; }
    :host-context([data-theme="dark"]) .cat-bg-blue { background: rgba(59, 130, 246, 0.16) !important; color: #60A5FA !important; }
    :host-context([data-theme="dark"]) .cat-bg-purple { background: rgba(139, 92, 246, 0.16) !important; color: #A78BFA !important; }
    :host-context([data-theme="dark"]) .cat-bg-cyan { background: rgba(6, 182, 212, 0.16) !important; color: #22D3EE !important; }
    :host-context([data-theme="dark"]) .cat-bg-red { background: rgba(239, 68, 68, 0.16) !important; color: #F87171 !important; }
    :host-context([data-theme="dark"]) .cat-bg-emerald { background: rgba(16, 185, 129, 0.16) !important; color: #34D399 !important; }
    :host-context([data-theme="dark"]) .cat-bg-indigo { background: rgba(99, 102, 241, 0.16) !important; color: #818CF8 !important; }

    .text-amber { color: #F59E0B !important; }
    .text-red { color: #EF4444 !important; }
    .text-purple { color: #8B5CF6 !important; }
    .text-emerald { color: #10B981 !important; }
    .text-cyan { color: #06B6D4 !important; }
    .text-indigo { color: #6366F1 !important; }
    .text-blue { color: #3B82F6 !important; }

    .mixed-preview-text-section {
      border-top: none;
      background: var(--av-surface-primary);
      padding: 24px 32px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mixed-text-section-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--av-text-muted);
      padding-bottom: 8px;
      border-bottom: 1px solid var(--av-border-subtle);
    }

    app-airvault-file-preview {
      display: flex;
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
      min-height: 300px;
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

  sanitizer = inject(DomSanitizer);
  motion = inject(AirVaultMotionService);
  clipboardService = inject(AirVaultClipboardService);
  deviceService = inject(AirVaultDeviceService);
  storageService = inject(AirVaultStorageService);
  colorService = inject(AirVaultColorService);
  syncService = inject(AirVaultSyncService);
  uiStore = inject(AirVaultUIStore);
  quickActions = inject(AirVaultQuickActionsService);
  item = input.required<AirVaultItem>();
  close = output<void>();

  capabilities = computed(() => {
    return this.clipboardService.getResourceCapabilities(this.currentDisplayItem());
  });

  previewCapabilities = computed<PreviewCapabilities>(() => {
    return getPreviewCapabilities(this.currentDisplayItem());
  });

  isBurnedMessageVisible = signal<boolean>(false);
  isClosing = signal<boolean>(false);
  slideDirection = signal<'prev' | 'next' | null>(null);
  private slideTimer?: any;
  private burnSub?: Subscription;

  requestClose(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
    }, 480);
  }

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
    if (this.slideTimer) {
      clearTimeout(this.slideTimer);
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

  showSearch = signal<boolean>(false);
  activeMatchIndex = signal<number>(0);
  @ViewChild('searchInputRef') searchInputRef?: ElementRef<HTMLInputElement>;

  searchHighlightQuery = computed(() => this.uiStore.searchHighlightQuery());

  isSearchableResource = computed(() => {
    if (this.hasMixedBatchText()) {
      const raw = this.item().content?.raw || '';
      return !!raw && raw.trim().length > 0;
    }
    const item = this.currentDisplayItem();
    const cat = this.resolvedCategory();
    const raw = item.content?.raw || '';
    const filename = (item.content?.filename || '').toLowerCase();

    // Pure binary media without text are NOT searchable
    if (cat === 'image' || cat === 'video' || cat === 'audio') {
      return false;
    }

    // Binary spreadsheets (.xlsx, .xls) without parsed/raw text are NOT searchable
    if (cat === 'spreadsheet' && !this.isCsvFormat() && (!raw || raw.startsWith('data:') || raw.startsWith('[Encrypted'))) {
      return false;
    }

    // CSV / TSV spreadsheets with content are searchable
    if (this.isCsvFormat()) {
      return !!raw && !raw.startsWith('data:') && !raw.startsWith('[Encrypted') && raw.trim().length > 0;
    }

    // PDF files: only searchable if text is available
    if (cat === 'pdf') {
      return !!raw && !raw.startsWith('data:') && !raw.startsWith('blob:') && !raw.startsWith('http') && raw.trim().length > 0;
    }

    // Word docs / Presentations: searchable if text is available
    if (/\.(docx?|pptx?|odt|odp)$/i.test(filename)) {
      return !!raw && !raw.startsWith('data:') && !raw.startsWith('[Encrypted') && raw.trim().length > 0;
    }

    // Binary archives / design files / fonts without text
    if (/\.(zip|rar|7z|tar|gz|ttf|otf|woff2?|psd|ai|fig|sketch|xd)$/i.test(filename) && (!raw || raw.startsWith('data:'))) {
      return false;
    }

    // Plain text, code, json, markdown, url, xml, yaml, log, config, text docs
    if (cat === 'code' || cat === 'json' || cat === 'text' || cat === 'markdown' || cat === 'url' || this.isTextDoc()) {
      return !!raw && !raw.startsWith('data:') && !raw.startsWith('[Encrypted') && raw.trim().length > 0;
    }

    // General fallback: if non-empty, non-binary text exists
    return !!raw && !raw.startsWith('data:') && !raw.startsWith('[Encrypted') && raw.trim().length > 0;
  });

  allSearchMatches = computed(() => {
    const q = this.searchHighlightQuery().trim();
    if (!q || !this.isSearchableResource()) return [];
    const matches: { text: string; offset: number }[] = [];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(q)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(q), 'gi');
    }

    // 1. If mixed batch, check raw text
    if (this.hasMixedBatchText()) {
      const text = this.item().content?.raw || '';
      if (text) {
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(text)) !== null) {
          matches.push({ text: m[0], offset: m.index });
        }
      }
      return matches;
    }

    // 2. Pure resource text/code/csv/tsv/url/json/markdown/etc.
    const disp = this.currentDisplayItem();
    const raw = disp.content?.raw || '';

    if (this.isCsvFormat() && raw) {
      // Search all underlying cells/lines of the CSV
      const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
      for (const line of lines) {
        pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = pattern.exec(line)) !== null) {
          matches.push({ text: m[0], offset: m.index });
        }
      }
      return matches;
    }

    if (raw) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(raw)) !== null) {
        matches.push({ text: m[0], offset: m.index });
      }
    }
    return matches;
  });

  totalMatches = computed(() => {
    return this.allSearchMatches().length;
  });

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  toggleSearch() {
    this.showSearch.update(v => {
      const next = !v;
      if (next) {
        setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 50);
      } else {
        this.uiStore.setSearchHighlightQuery('');
      }
      return next;
    });
  }

  onSearchInput(val: string) {
    this.uiStore.setSearchHighlightQuery(val);
    this.activeMatchIndex.set(0);
    this.uiStore.setActiveMatchIndex(0);
    if (val.trim()) {
      setTimeout(() => this.scrollToActiveMatch(), 60);
    }
  }

  onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        this.prevMatch(e);
      } else {
        this.nextMatch(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.toggleSearch();
    }
  }

  nextMatch(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    const total = this.totalMatches();
    if (total === 0) return;
    const next = (this.activeMatchIndex() + 1) % total;
    this.activeMatchIndex.set(next);
    this.uiStore.setActiveMatchIndex(next);
    this.scrollToActiveMatch();
  }

  prevMatch(e?: Event) {
    e?.preventDefault();
    e?.stopPropagation();
    const total = this.totalMatches();
    if (total === 0) return;
    const prev = (this.activeMatchIndex() - 1 + total) % total;
    this.activeMatchIndex.set(prev);
    this.uiStore.setActiveMatchIndex(prev);
    this.scrollToActiveMatch();
  }

  private scrollToActiveMatch() {
    setTimeout(() => {
      const container = this.stageContainer?.nativeElement;
      if (!container) return;
      const matchEls = container.querySelectorAll('mark.av-search-match');
      const idx = this.activeMatchIndex();

      matchEls.forEach((el, i) => {
        if (i === idx) {
          el.classList.add('current-match');
        } else {
          el.classList.remove('current-match');
        }
      });

      if (matchEls.length > 0 && idx >= 0 && idx < matchEls.length) {
        const targetEl = matchEls[idx] as HTMLElement;
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 40);
  }

  getHighlightParts(text: string, query: string): { text: string; isMatch: boolean; isCurrent: boolean }[] {
    if (!text) return [];
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false, isCurrent: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`(\\b${this.escapeRegex(q)}\\b)`, 'gi');
    } else {
      pattern = new RegExp(`(${this.escapeRegex(q)})`, 'gi');
    }

    const parts = text.split(pattern);
    const activeIdx = this.activeMatchIndex();
    let matchCounter = 0;

    return parts.filter(p => p.length > 0).map(part => {
      const isMatch = part.toLowerCase() === q.toLowerCase();
      let isCurrent = false;
      if (isMatch) {
        isCurrent = matchCounter === activeIdx;
        matchCounter++;
      }
      return {
        text: part,
        isMatch,
        isCurrent
      };
    });
  }

  activeBatchIndex = signal<number>(0);

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
      if (this.isSearchableResource()) {
        e.preventDefault();
        e.stopPropagation();
        this.showSearch.set(true);
        setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 50);
        return;
      }
    }

    // ── Preview Zoom Shortcuts (⌘/Ctrl + +, ⌘/Ctrl + -, ⌘/Ctrl + 0) ──
    if (e.metaKey || e.ctrlKey) {
      if (e.key === '+' || e.key === '=' || e.key === 'Add') {
        e.preventDefault();
        e.stopPropagation();
        this.zoomIn();
        return;
      }
      if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
        e.preventDefault();
        e.stopPropagation();
        this.zoomOut();
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        e.stopPropagation();
        this.resetZoom();
        return;
      }
    }

    if (e.key === 'Escape') {
      if (this.showSearch()) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleSearch();
        return;
      }
      if (this.selectedResourceItem()) {
        e.preventDefault();
        e.stopPropagation();
        this.closeDedicatedResourceModal();
        return;
      }
    }
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

  isResourceViewerOpen = signal<boolean>(false);
  selectedResourceItem = signal<AirVaultItem | null>(null);

  hasMixedBatchText = computed<boolean>(() => {
    const it = this.item();
    if (!it.isBatchParent) return false;
    const raw = it.content?.raw?.trim();
    if (!raw) return false;
    return !/^Batch of \d+ files/i.test(raw);
  });

  safeFormattedMixedText = computed<SafeHtml>(() => {
    const raw = this.item().content?.raw || '';
    if (!raw) return '';
    const cat = this.item().content?.category;
    const q = this.searchHighlightQuery();
    const activeIdx = this.activeMatchIndex();
    let safeHtml: string;
    if (cat === 'markdown') {
      safeHtml = renderMarkdownToSafeHtml(raw, false, q, activeIdx);
    } else {
      safeHtml = renderPlainTextToSafeHtml(raw, q, activeIdx);
    }
    return this.sanitizer.bypassSecurityTrustHtml(safeHtml);
  });

  openDedicatedResourceModal(subFile: AirVaultItem) {
    this.selectedResourceItem.set(subFile);
  }

  closeDedicatedResourceModal() {
    this.selectedResourceItem.set(null);
  }

  onDownloadText() {
    const text = this.item().content?.raw || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airvault_notes_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  onSelectCapsuleResource(index: number) {
    if (this.isResourceViewerOpen() && this.currentBatchIndex() === index) {
      // Clicking already open capsule toggles it closed
      this.isResourceViewerOpen.set(false);
    } else {
      this.activeBatchIndex.set(index);
      this.isResourceViewerOpen.set(true);
      this.resetZoom();
    }
  }

  toggleResourceViewer() {
    this.isResourceViewerOpen.update(v => !v);
  }

  getBatchFileBgClass(subFile?: AirVaultItem | null): string {
    const cat = subFile?.content?.category;
    switch (cat) {
      case 'image': return 'cat-bg-amber';
      case 'video': return 'cat-bg-red';
      case 'audio': return 'cat-bg-purple';
      case 'pdf': return 'cat-bg-red';
      case 'spreadsheet': return 'cat-bg-emerald';
      case 'archive': return 'cat-bg-cyan';
      case 'markdown': return 'cat-bg-cyan';
      case 'code': return 'cat-bg-indigo';
      default: return 'cat-bg-blue';
    }
  }

  getBatchFileIconClass(subFile?: AirVaultItem | null): string {
    const cat = subFile?.content?.category;
    switch (cat) {
      case 'image': return 'text-amber';
      case 'video': return 'text-red';
      case 'audio': return 'text-purple';
      case 'pdf': return 'text-red';
      case 'spreadsheet': return 'text-emerald';
      case 'archive': return 'text-cyan';
      case 'markdown': return 'text-cyan';
      case 'code': return 'text-indigo';
      default: return 'text-blue';
    }
  }

  onPrevBatchItem() {
    if (this.currentBatchIndex() > 0) {
      if (this.slideTimer) clearTimeout(this.slideTimer);
      this.slideDirection.set(null);
      // Small tick to re-trigger CSS keyframe animation cleanly
      requestAnimationFrame(() => {
        this.slideDirection.set('prev');
        this.activeBatchIndex.update(idx => idx - 1);
        this.resetZoom();
        this.slideTimer = setTimeout(() => {
          this.slideDirection.set(null);
        }, 500);
      });
    }
  }

  onNextBatchItem() {
    if (this.currentBatchIndex() < this.batchTotal() - 1) {
      if (this.slideTimer) clearTimeout(this.slideTimer);
      this.slideDirection.set(null);
      // Small tick to re-trigger CSS keyframe animation cleanly
      requestAnimationFrame(() => {
        this.slideDirection.set('next');
        this.activeBatchIndex.update(idx => idx + 1);
        this.resetZoom();
        this.slideTimer = setTimeout(() => {
          this.slideDirection.set(null);
        }, 500);
      });
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

  onPlayingChange(playing: boolean) {
    this.isPlaying.set(playing);
  }

  onMutedChange(muted: boolean) {
    this.isMuted.set(muted);
  }

  onOpenExternal() {
    const disp = this.currentDisplayItem();
    const raw = disp.content.previewUrl || disp.content.raw;
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
      const disp = this.currentDisplayItem();
      const success = await this.clipboardService.copyResource(disp.content);
      if (success) {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      }
    } catch {}
  }

  async onCopy(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      const disp = this.currentDisplayItem();
      const success = await this.clipboardService.copyResource(disp.content);
      if (success) {
        this.isCopied.set(true);
        setTimeout(() => this.isCopied.set(false), 2000);
      }
    } catch {}
  }

  async onDownload() {
    const disp = this.currentDisplayItem();
    const cat = disp.content.category;
    let filename = disp.content.filename;

    if (!filename) {
      if (cat === 'image') filename = `airvault_image_${Date.now()}.png`;
      else if (cat === 'video') filename = `airvault_video_${Date.now()}.mp4`;
      else if (cat === 'json') filename = `airvault_data_${Date.now()}.json`;
      else if (cat === 'code') filename = `airvault_code_${Date.now()}.txt`;
      else filename = `airvault_file_${Date.now()}.bin`;
    }

    // 1. Try to fetch full original payload first (from LRU cache, IndexedDB, or server stream)
    let downloadBlob: Blob | null = null;
    const cached = this.storageService.resourceCache.get(disp.id);
    if (cached?.blob) {
      downloadBlob = cached.blob;
    } else {
      try {
        const res = await this.storageService.fetchResourcePayload(disp);
        if (res?.blob) {
          downloadBlob = res.blob;
        }
      } catch {}
    }

    let downloadUrl = '';
    if (downloadBlob) {
      downloadUrl = URL.createObjectURL(downloadBlob);
    } else {
      const raw = disp.content.raw || disp.content.previewUrl || '';
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
      markdown: 'file-text',
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
      markdown: 'Markdown',
      text: 'Text'
    };
    return m[cat] ?? 'Text';
  }

  formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
}
