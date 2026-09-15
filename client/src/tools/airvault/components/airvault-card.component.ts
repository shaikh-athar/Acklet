import { Component, ChangeDetectionStrategy, signal, computed, input, output, inject, effect, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultItem, AirVaultStorageService } from '../services/airvault-storage.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultMotionService } from '../services/airvault-motion.service';
import { AirVaultClipboardService, LineBlameEntry, ContentActionShortcut } from '../services/airvault-clipboard.service';
import { AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultColorService } from '../services/airvault-color.service';
import { AirVaultBlameService } from '../services/airvault-blame.service';
import { AirVaultSyncService } from '../services/airvault-sync.service';
import { detectUrlsAsync, isValidHttpUrl, normalizeUrlForNavigation, formatDisplayUrl, DetectedUrlSpan } from '../services/airvault-url-detector';
import { AirVaultActionPopoverComponent } from './airvault-action-popover.component';
import { Subscription } from 'rxjs';

interface TextSegment {
  isUrl: boolean;
  text: string;
  urlSpan?: DetectedUrlSpan;
}

@Component({
  selector: 'app-airvault-card',
  standalone: true,
  imports: [CommonModule, IconComponent, AirVaultActionPopoverComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="av-card"
      [attr.data-card-id]="item().id"
      [id]="'card-' + item().id"
      [class.av-card-pinned]="item().isPinned"
      [class.av-card-batch]="item().isBatchParent"
      [class.av-card-batch-expanded]="isBatchExpanded()"
      [class.is-self]="isCurrentDevice()"
      [style.--device-accent]="getAuthorColor()"
      [attr.data-category]="item().content.category"
      draggable="true"
      (mouseenter)="onCardMouseEnter()"
      (mouseleave)="onCardMouseLeave()"
      (dragstart)="onTileDragStart($event)"
      (dragover)="onTileDragOver($event)"
      (drop)="onTileDrop($event)">
      <!-- Action Shortcuts Hover Popover -->
      @if (shouldShowActionPopover()) {
        <app-airvault-action-popover
          [shortcut]="effectiveActionShortcut()"
          [rawContent]="item().content.raw"
          (actionExecuted)="onActionShortcutExecuted($event)">
        </app-airvault-action-popover>
      }

      <!-- Header: Sender Badge (top-left) + Timestamp & Actions (top-right) -->
      <div class="card-header">
        <div class="card-header-left">
          <span class="sender-badge" [attr.data-tooltip]="'Content from ' + getDisplayOwner()">
            <span class="sender-accent-dot" [style.background]="getAuthorColor()"></span>
            <span class="sender-name">{{ getDisplayOwner() }}</span>
          </span>
          @if ((item().copyCount || 1) > 1) {
            <span class="copy-count-badge" [attr.data-tooltip]="'Copied ' + item().copyCount + ' times'">
              <app-icon name="repeat" class="icon-3xs"></app-icon>
              <span>{{ item().copyCount }}x</span>
            </span>
          }
        </div>
        
        <div class="card-header-right">
          <span class="card-timestamp">{{ relativeTime(item().timestamp) }}</span>

          <!-- Actions (visible on card hover) -->
          <div class="card-actions hover-reveal">
            <button class="card-action-btn" (click)="onResend($event)" data-tooltip="Resend to connected devices" aria-label="Resend item">
              <app-icon name="repeat" class="icon-xs"></app-icon>
            </button>
            @if (item().content?.isSensitive) {
              <button class="card-action-btn" (click)="onToggleReveal($event)" [attr.data-tooltip]="item().isRevealed ? 'Hide credential' : 'Reveal credential'" aria-label="Reveal credential">
                <app-icon [name]="item().isRevealed ? 'eye-off' : 'eye'" class="icon-xs"></app-icon>
              </button>
            }
            <button class="card-action-btn" [class.card-action-pinned]="item().isPinned"
              (click)="onTogglePin($event)" [attr.data-tooltip]="item().isPinned ? 'Unpin item' : 'Pin item'">
              <app-icon name="pin" class="icon-xs"></app-icon>
            </button>
            <button class="card-action-btn card-action-danger" (click)="onDelete($event)" aria-label="Delete item" data-tooltip="Delete item">
              <app-icon name="trash-2" class="icon-xs"></app-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="card-body" (click)="onCardClick($event)">
        <!-- Multi-File Batch Parent View -->
        @if (item().isBatchParent) {
          <div class="batch-surface">
            <!-- Aggregate Batch Upload Progress Bar (while uploading) -->
            @if (item().processingState === 'processing') {
              <div class="batch-uploading-box">
                <div class="batch-upload-status-line">
                  <span class="batch-stage-text">
                    <app-icon name="loader" class="icon-xs spin-anim text-blue-500"></app-icon>
                    <span>Uploading ({{ item().progressPercent || 0 }}%) · {{ item().batchCompletedCount || 0 }}/{{ item().batchTotalCount || 0 }} files</span>
                  </span>
                </div>
                <div class="chunk-progress-track">
                  <div class="chunk-progress-fill" [style.width.%]="item().progressPercent || 0"></div>
                </div>
              </div>
            }

            <!-- Collapsed Stacked-Card Batch Thumbnail Preview (3-Layer Depth Effect matching Reference) -->
            @if (!isBatchExpanded()) {
              <div class="batch-stacked-container" (click)="openPreview.emit(item())">
                <div class="batch-card-stack">
                  <!-- Back Sheet 2 (Bottom layer, rotated -3.5deg) -->
                  <div class="stack-sheet stack-sheet-back-2"></div>
                  <!-- Back Sheet 1 (Middle layer, rotated +3deg) -->
                  <div class="stack-sheet stack-sheet-back-1"></div>
                  <div class="stack-sheet stack-sheet-front">
                    @if (firstBatchFile()?.content?.previewUrl || (firstBatchFile()?.content?.category === 'image' && firstBatchFile()?.content?.raw) || item().content?.previewUrl) {
                      <img [src]="firstBatchFile()?.content?.previewUrl || (firstBatchFile()?.content?.category === 'image' ? firstBatchFile()?.content?.raw : '') || item().content?.previewUrl" class="stacked-front-img" alt="Batch preview" />
                    } @else {
                      <div class="stacked-front-fallback" [ngClass]="getBatchFileBgClass(firstBatchFile())">
                        <app-icon [name]="getCategoryIcon(firstBatchFile()?.content?.category || 'file')" class="icon-lg" [ngClass]="getBatchFileIconClass(firstBatchFile())"></app-icon>
                        <span class="stacked-front-filename">{{ firstBatchFile()?.content?.filename || 'Batch file' }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <!-- Expanded View: Individual Files Grid / List with per-file actions & retry -->
              <div class="batch-expanded-list">
                @for (subFile of item().batchFiles || []; track subFile.id) {
                  <div class="batch-subfile-row" (click)="$event.stopPropagation()">
                    <div class="subfile-icon-box" [ngClass]="getBatchFileBgClass(subFile)">
                      @if (subFile.content.previewUrl) {
                        <img [src]="subFile.content.previewUrl" class="subfile-thumb-img" alt="" />
                      } @else {
                        <app-icon [name]="getCategoryIcon(subFile.content.category)" class="icon-xs" [ngClass]="getBatchFileIconClass(subFile)"></app-icon>
                      }
                    </div>
                    <div class="subfile-info" (click)="openPreview.emit(subFile)">
                      <span class="subfile-name" [title]="subFile.content.filename">{{ subFile.content.filename }}</span>
                      <span class="subfile-meta">{{ formatBytes(subFile.content.byteSize) }}</span>
                    </div>

                    <!-- Per-file Status / Actions -->
                    <div class="subfile-actions">
                      @if (subFile.processingState === 'failed') {
                        <button class="subfile-btn retry" (click)="onRetryBatchFile(subFile, $event)" data-tooltip="Retry upload" aria-label="Retry upload">
                          <app-icon name="rotate-cw" class="icon-xs text-amber"></app-icon>
                        </button>
                      }
                      <button class="subfile-btn" (click)="onDownloadSingleSubFile(subFile, $event)" data-tooltip="Download" aria-label="Download">
                        <app-icon name="download" class="icon-xs"></app-icon>
                      </button>
                      <button class="subfile-btn danger" (click)="onDeleteSubFile(subFile, $event)" data-tooltip="Delete file" aria-label="Delete file">
                        <app-icon name="trash-2" class="icon-xs"></app-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Processing / Upload Progress State (Single File) -->
        @else if (item().processingState && item().processingState !== 'done') {
          <div class="processing-surface">
            <div class="processing-header">
              <span class="processing-stage">
                @if (item().processingState === 'queued') {
                  <app-icon name="clock" class="icon-xs"></app-icon>
                  <span>Queued in line…</span>
                } @else if (item().processingState === 'processing') {
                  <app-icon name="loader" class="icon-xs spin-anim text-blue-500"></app-icon>
                  <span>{{ (item().progressPercent || 0) < 100 ? 'Encrypting & streaming' : 'Finalizing assembly' }} ({{ item().progressPercent || 0 }}%)</span>
                } @else if (item().processingState === 'failed') {
                  <app-icon name="alert-triangle" class="icon-xs danger-icon"></app-icon>
                  <span class="danger-text">{{ item().errorMessage || 'Processing failed' }}</span>
                }
              </span>

              @if (item().processingState !== 'failed') {
                <button class="cancel-upload-btn" (click)="onCancelUpload($event)" data-tooltip="Cancel upload">
                  <app-icon name="x" class="icon-xs"></app-icon>
                </button>
              } @else {
                <button class="cancel-upload-btn retry-btn" (click)="onRetryUpload($event)" data-tooltip="Retry upload">
                  <app-icon name="rotate-cw" class="icon-xs"></app-icon>
                </button>
              }
            </div>

            <!-- Chunk Progress Bar -->
            @if (item().processingState === 'processing' || item().processingState === 'queued') {
              <div class="chunk-progress-track">
                <div class="chunk-progress-fill" [style.width.%]="item().progressPercent || 0"></div>
              </div>
            }

            <div class="processing-file-meta">
              <span class="filename">{{ item().content.filename || 'File upload' }}</span>
              <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
            </div>
          </div>
        } @else if (item().content.isSensitive && !item().isRevealed) {
          <div class="sensitive-row" (click)="onToggleReveal($event)">
            <app-icon name="lock" class="icon-xs"></app-icon>
            <span>{{ item().content.sensitiveType || 'PROTECTED CREDENTIAL' }}</span>
            <code class="mask-code">{{ item().content.maskedSnippet }}</code>
          </div>
        } @else {
          @switch (item().content.category) {
            @case ('image') {
              <div class="preview-surface img-surface">
                @if (isPayloadLoading()) {
                  <div class="tile-loading-overlay">
                    <app-icon name="loader" class="icon-sm spin-anim text-blue-500"></app-icon>
                    <span class="loading-label">Loading resource…</span>
                  </div>
                }
                @if (imageLoadFailed() || !effectiveImageSrc()) {
                  <div class="file-surface">
                    <div class="file-type-icon doc-icon"><app-icon name="image" class="icon-sm text-amber"></app-icon></div>
                    <div class="file-info">
                      <span class="filename">{{ item().content?.filename || 'Image Attachment' }}</span>
                      <span class="filesize">{{ formatBytes(item().content?.byteSize || 0) }}</span>
                    </div>
                  </div>
                } @else {
                  <img [src]="effectiveImageSrc()" (error)="onImageError()" alt="Image attachment" class="preview-img" loading="lazy" />
                }
              </div>
            }
            @case ('video') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon video-icon"><app-icon name="film" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'Video Attachment', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('audio') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon audio-icon"><app-icon name="music" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'Audio Track', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('pdf') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon pdf-icon"><app-icon name="file-text" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'PDF Document', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('spreadsheet') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon excel-icon"><app-icon name="table" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'Spreadsheet', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('archive') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon archive-icon"><app-icon name="folder-archive" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'Archive Package', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('font') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon font-icon"><app-icon name="type" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'Typeface Font', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('file') {
              <div class="preview-surface file-surface">
                <div class="file-type-icon doc-icon"><app-icon name="file-text" class="icon-sm"></app-icon></div>
                <div class="file-info">
                  <span class="filename">@for (part of getHighlightParts(item().content.filename || 'File attachment', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                  <span class="filesize">{{ formatBytes(item().content.byteSize) }}</span>
                </div>
              </div>
            }
            @case ('url') {
              <div class="preview-surface url-surface">
                <div class="url-favicon-row">
                  <img class="url-favicon" [src]="getFaviconUrl(item().content.raw)" alt="" (error)="onFaviconError($event)" loading="lazy" />
                  <a [href]="normalizeUrl(item().content.raw)" target="_blank" rel="noopener noreferrer" class="url-link" (click)="$event.stopPropagation()">@for (part of getHighlightParts(formatUrl(item().content.raw), searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</a>
                  <div class="url-quick-actions" (click)="$event.stopPropagation()">
                    <button class="url-action-btn" (click)="onCopyDetectedUrl(item().content.raw, $event)" title="Copy link">
                      <app-icon name="copy" class="icon-xs"></app-icon>
                    </button>
                    <button class="url-action-btn" (click)="onOpenDetectedUrl(item().content.raw, $event)" title="Open in new tab">
                      <app-icon name="external-link" class="icon-xs"></app-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
            @case ('json') {
              <div class="preview-surface code-surface">
                @if (textSegments().length === 0 || !item().content?.raw?.trim()) {
                  <div class="empty-preview-placeholder">
                    <app-icon name="braces" class="icon-xs text-muted"></app-icon>
                    <span>Empty JSON payload</span>
                  </div>
                } @else {
                  <pre class="code-pre"><code>@for (seg of textSegments(); track $index) {@if (seg.isUrl) {<span class="url-detected-span" (mouseenter)="setActiveHoverUrl(seg.text)" (mouseleave)="clearActiveHoverUrl()"><a [href]="normalizeUrl(seg.text)" target="_blank" rel="noopener noreferrer" class="url-anchor-text" (click)="$event.stopPropagation()">@for (part of getHighlightParts(seg.text, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</a>@if (activeHoverUrl() === seg.text) {<span class="url-hover-popover" (click)="$event.stopPropagation()"><span class="url-popover-resolved">{{ seg.text }}</span><button class="popover-btn" (click)="onCopyDetectedUrl(seg.text, $event)">Copy</button><button class="popover-btn" (click)="onOpenDetectedUrl(seg.text, $event)">Open</button></span>}</span>} @else {@for (part of getHighlightParts(seg.text, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}}}</code></pre>
                  @if (isLongPreview()) {
                    <div class="show-more-pill" (click)="openPreview.emit(item())">
                      <app-icon name="maximize-2" class="icon-xs"></app-icon>
                      <span>Show More</span>
                    </div>
                  }
                }
              </div>
            }
            @case ('code') {
              <div class="preview-surface code-surface">
                @if (textSegments().length === 0 || !item().content?.raw?.trim()) {
                  <div class="empty-preview-placeholder">
                    <app-icon name="code" class="icon-xs text-muted"></app-icon>
                    <span>Empty code snippet</span>
                  </div>
                } @else {
                  <pre class="code-pre"><code>@for (seg of textSegments(); track $index) {@if (seg.isUrl) {<span class="url-detected-span" (mouseenter)="setActiveHoverUrl(seg.text)" (mouseleave)="clearActiveHoverUrl()"><a [href]="normalizeUrl(seg.text)" target="_blank" rel="noopener noreferrer" class="url-anchor-text" (click)="$event.stopPropagation()">@for (part of getHighlightParts(seg.text, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</a>@if (activeHoverUrl() === seg.text) {<span class="url-hover-popover" (click)="$event.stopPropagation()"><span class="url-popover-resolved">{{ seg.text }}</span><button class="popover-btn" (click)="onCopyDetectedUrl(seg.text, $event)">Copy</button><button class="popover-btn" (click)="onOpenDetectedUrl(seg.text, $event)">Open</button></span>}</span>} @else {@for (part of getHighlightParts(seg.text, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}}}</code></pre>
                  @if (isLongPreview()) {
                    <div class="show-more-pill" (click)="openPreview.emit(item())">
                      <app-icon name="maximize-2" class="icon-xs"></app-icon>
                      <span>Show More</span>
                    </div>
                  }
                }
              </div>
            }
            @default {
              <div class="preview-surface">
                @if (textSegments().length === 0 || !item().content?.raw?.trim()) {
                  <div class="empty-preview-placeholder">
                    <app-icon name="file-text" class="icon-xs text-muted"></app-icon>
                    <span>Empty text content</span>
                  </div>
                } @else {
                  <p class="text-preview">@for (seg of textSegments(); track $index) {@if (seg.isUrl) {<span class="url-detected-span" (mouseenter)="setActiveHoverUrl(seg.text)" (mouseleave)="clearActiveHoverUrl()"><a [href]="normalizeUrl(seg.text)" target="_blank" rel="noopener noreferrer" class="url-anchor-text" (click)="$event.stopPropagation()">@for (part of getHighlightParts(seg.text, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</a>@if (activeHoverUrl() === seg.text) {<span class="url-hover-popover" (click)="$event.stopPropagation()"><span class="url-popover-resolved">{{ seg.text }}</span><button class="popover-btn" (click)="onCopyDetectedUrl(seg.text, $event)">Copy</button><button class="popover-btn" (click)="onOpenDetectedUrl(seg.text, $event)">Open</button></span>}</span>} @else {@for (part of getHighlightParts(seg.text, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}} }}}</p>
                  @if (isLongPreview()) {
                    <div class="show-more-pill" (click)="openPreview.emit(item())">
                      <app-icon name="maximize-2" class="icon-xs"></app-icon>
                      <span>Show More</span>
                    </div>
                  }
                }
              </div>
            }
          }
        }
      </div>

      <!-- Footer -->
      <div class="card-footer">
        <div class="card-footer-meta">
          <span class="byte-chip">
            <app-icon name="hard-drive" class="icon-xs"></app-icon>
            {{ formatBytes(item().isBatchParent ? (item().batchTotalBytes || item().content.byteSize) : item().content.byteSize) }}
          </span>
          @if (item().isPinned) {
            <span class="byte-chip permanent-chip" data-tooltip="Pinned item · Stored permanently">
              <app-icon name="pin" class="icon-xs text-cyan"></app-icon>
            </span>
          } @else if (!isTextOrCodeEntry() && (item().burnAfterRead || expiryInfo().isBurnAfterRead)) {
            <span class="byte-chip burn-chip" data-tooltip="👁️ View Once · Permanently deleted across all devices after 1st view">
              <app-icon name="eye" class="icon-xs text-amber"></app-icon>
              <span>View once</span>
            </span>
          } @else {
            <span class="byte-chip expiry-chip" [class.expiring-soon]="expiryInfo().isExpiringSoon"
              [attr.data-tooltip]="expiryInfo().isExpiringSoon ? '⚠️ Resource is close to expiration. Pin to keep permanently.' : 'Auto-expires'">
              <app-icon [name]="expiryInfo().isExpiringSoon ? 'alert-triangle' : 'clock'" class="icon-xs" [class.text-amber]="expiryInfo().isExpiringSoon"></app-icon>
              {{ expiryInfo().label }}
            </span>
          }
          @if (item().deliveryStatus === 'delivered') {
            <span class="byte-chip delivered-chip hover-reveal">
              <app-icon name="check-check" class="icon-xs"></app-icon>
            </span>
          }
        </div>
        <div class="card-footer-actions">
          <!-- Multi-File Batch Actions -->
          @if (item().isBatchParent) {
            <button class="batch-footer-btn" (click)="toggleBatchExpand($event)" [attr.aria-label]="isBatchExpanded() ? 'Collapse batch' : 'Expand batch'">
              <app-icon [name]="isBatchExpanded() ? 'chevron-up' : 'chevron-down'" class="icon-xs"></app-icon>
              <span>{{ isBatchExpanded() ? 'Collapse' : 'Files (' + (item().batchFiles?.length || item().batchTotalCount || 0) + ')' }}</span>
            </button>
            <button class="copy-btn-icon batch-download-all-btn" (click)="onDownloadAllBatch($event)" data-tooltip="Download All" data-tooltip-pos="left" aria-label="Download All Files (ZIP)">
              <app-icon name="folder-down" class="icon-xs"></app-icon>
            </button>
          } @else {
            <!-- Single Item Download & Copy Actions -->
            @if (item().content.category === 'image' || item().content.category === 'file' || item().content.category === 'video' || item().content.raw) {
              <button class="copy-btn-icon" (click)="onDownload($event)" aria-label="Download resource">
                <app-icon name="download" class="icon-xs"></app-icon>
              </button>
            }
            <button class="copy-btn-icon" [class.copy-btn-done]="copied()" (click)="onCopy($event)" aria-label="Copy to clipboard">
              <app-icon [name]="copied() ? 'check' : 'copy'" class="icon-xs"></app-icon>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .av-card {
      height: auto;
      min-height: 84px;
      max-height: 400px;
      width: 100%;
      min-width: 0;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
      box-sizing: border-box;
      position: relative;
      animation: avSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .av-card:hover {
      border-color: var(--device-accent, var(--av-accent, #2196F3)) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--device-accent, var(--av-accent, #2196F3));
      transform: translateY(-1px);
    }
    .av-card.is-self {
      border-color: var(--av-border);
    }
    .av-card.is-self:hover {
      border-color: var(--device-accent, #2196F3) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--device-accent, #2196F3);
    }
    .av-card.av-card-pinned {
      border-color: var(--device-accent, #2196F3) !important;
      box-shadow: 0 0 0 1px var(--device-accent, #2196F3);
    }
    .av-card.av-card-collapsed .card-header { border-bottom: none; }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px 4px 10px;
      gap: 6px;
      min-height: 24px;
      box-sizing: border-box;
      white-space: nowrap;
    }
    .card-header-left {
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      overflow: hidden;
    }
    .sender-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      overflow: hidden;
    }
    .sender-accent-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .sender-name {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--av-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-family: var(--av-font-ui);
    }
    .copy-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 9px;
      font-weight: 700;
      color: var(--av-accent, #2196F3);
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.25);
      padding: 1px 5px;
      border-radius: 4px;
      letter-spacing: 0.02em;
      flex-shrink: 0;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .copy-count-badge app-icon { color: var(--av-accent, #2196F3); flex-shrink: 0; }
    :host-context([data-theme="dark"]) .copy-count-badge {
      background: rgba(33, 150, 243, 0.16);
      border-color: rgba(33, 150, 243, 0.35);
      color: #60A5FA;
    }

    .card-header-right {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: auto;
      flex-shrink: 0;
    }
    .card-timestamp {
      font-size: 11px;
      color: var(--av-text-muted);
      white-space: nowrap;
      font-family: var(--av-font-ui);
    }

    /* Hover-revealed action controls */
    .hover-reveal {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }
    .av-card:hover .hover-reveal {
      opacity: 1;
      pointer-events: auto;
    }

    .card-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    .card-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: var(--av-text-muted);
      cursor: pointer;
      box-sizing: border-box;
      transition: background 0.12s ease, color 0.12s ease;
    }
    .card-action-btn:hover { background: var(--av-surface-secondary); color: var(--av-text-primary); }
    .card-action-btn.card-action-pinned { color: #2196F3; }
    .card-action-btn.card-action-danger:hover { background: var(--av-danger-soft); color: var(--av-danger); }

    /* Body */
    .card-body {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      cursor: pointer;
    }
    .preview-surface {
      background: var(--av-surface-secondary);
      border-bottom: 1px solid var(--av-border-subtle);
      padding: 10px 12px;
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      box-sizing: border-box;
      transition: background 0.12s ease;
    }
    .card-body:hover .preview-surface {
      background: var(--av-surface-tertiary, var(--av-surface-secondary));
    }
    .img-surface {
      padding: 0;
      background: var(--av-surface-secondary);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 120px;
      width: 100%;
      position: relative;
    }
    .tile-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      z-index: 10;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 500;
    }
    .spin-anim {
      animation: av-spin 1s linear infinite;
    }
    @keyframes av-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .preview-img {
      width: 100%;
      height: 100%;
      min-height: 120px;
      max-height: 100%;
      object-fit: cover;
      display: block;
    }

    .file-surface { display: flex; align-items: center; gap: 10px; padding: 12px; }
    .file-type-icon { width: 34px; height: 34px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .doc-icon { background: rgba(107,114,128,0.15); color: #6B7280; }
    .video-icon { background: rgba(239,68,68,0.12); color: #EF4444; }
    .audio-icon { background: rgba(139,92,246,0.15); color: #8B5CF6; }
    .pdf-icon { background: rgba(239,68,68,0.15); color: #EF4444; }
    .excel-icon { background: rgba(16,185,129,0.15); color: #10B981; }
    .archive-icon { background: rgba(6,182,212,0.15); color: #06B6D4; }
    .font-icon { background: rgba(99,102,241,0.15); color: #6366F1; }
    .file-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .filename { font-size: 12px; font-weight: 600; color: var(--av-text-primary); word-break: break-all; }
    .filesize { font-size: 10px; color: var(--av-text-muted); }

    .url-surface { padding: 10px 12px; }
    .url-favicon-row { display: flex; align-items: center; gap: 8px; }
    .url-favicon { width: 15px; height: 15px; border-radius: 3px; flex-shrink: 0; }
    .url-link { color: #3B82F6; text-decoration: none; font-size: 12px; flex: 1; word-break: break-all; line-height: 1.5; }
    .url-link:hover { text-decoration: underline; }
    .url-ext-icon { color: var(--av-text-faint); flex-shrink: 0; }

    /* Per-User Color-Coded Gutter Bar */
    .author-gutter-bar {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 4px;
      z-index: 5;
      border-top-left-radius: var(--av-radius-md);
      border-bottom-left-radius: var(--av-radius-md);
      cursor: help;
      transition: width 0.14s ease, opacity 0.14s ease;
    }
    .av-card:hover .author-gutter-bar {
      width: 5.5px;
    }

    /* URL Detection & Interactive Popover */
    .code-content-wrap {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .url-quick-actions {
      display: flex;
      align-items: center;
      gap: 3px;
      margin-left: 6px;
    }
    .url-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 4px;
      color: var(--av-text-muted);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .url-action-btn:hover {
      background: var(--av-surface-primary);
      color: var(--av-accent, #2196F3);
      border-color: var(--av-accent, #2196F3);
    }
    .url-detected-span {
      position: relative;
      display: inline-block;
    }
    .url-anchor-text {
      color: #3B82F6;
      text-decoration: underline;
      text-decoration-style: dotted;
      cursor: pointer;
      font-weight: 500;
      transition: color 0.12s ease, text-decoration-style 0.12s ease;
    }
    .url-anchor-text:hover {
      color: #2563EB;
      text-decoration-style: solid;
    }
    .url-hover-popover {
      position: absolute;
      bottom: calc(100% + 4px);
      left: 0;
      z-index: 50;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 6px;
      background: var(--av-surface-primary, #ffffff);
      border: 1px solid var(--av-border-strong, rgba(0, 0, 0, 0.15));
      border-radius: 6px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
      white-space: nowrap;
      animation: popoverFadeIn 0.12s ease-out;
      pointer-events: auto;
    }
    @keyframes popoverFadeIn {
      from { opacity: 0; transform: translateY(3px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .url-popover-resolved {
      font-size: 10px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--av-text-muted);
      font-family: var(--av-font-mono, monospace);
    }
    .popover-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      height: 19px;
      padding: 0 6px;
      font-size: 10px;
      font-weight: 600;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 3px;
      color: var(--av-text-primary);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .popover-btn:hover {
      background: var(--av-accent, #2196F3);
      color: #ffffff;
      border-color: var(--av-accent, #2196F3);
    }

    .code-surface { position: relative; }
    .code-pre {
      margin: 0;
      font-family: var(--av-clipboard-font-family, var(--av-font-mono));
      font-size: var(--av-clipboard-font-size, 12px);
      color: var(--av-text-primary);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.55;
    }

    .text-preview {
      margin: 0;
      font-size: var(--av-clipboard-font-size, 12px);
      font-family: var(--av-clipboard-font-family, var(--av-font-ui));
      color: var(--av-text-primary);
      line-height: 1.55;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .show-more-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 6px;
      padding: 3px 8px;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--av-accent);
      background: var(--av-accent-soft, rgba(33, 150, 243, 0.12));
      border: 1px solid var(--av-accent, rgba(33, 150, 243, 0.3));
      border-radius: 4px;
      cursor: pointer;
      width: fit-content;
      transition: all 0.12s ease;
    }
    .show-more-pill:hover {
      background: var(--av-accent);
      color: #fff;
    }

    .empty-preview-placeholder {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 4px;
      font-size: 11.5px;
      font-style: italic;
      color: var(--av-text-faint);
    }
    .empty-preview-placeholder app-icon {
      color: var(--av-text-faint);
      opacity: 0.7;
    }

    /* Processing / Progress State */
    .processing-surface {
      display: flex;
      flex-direction: column;
      padding: 12px 14px;
      gap: 10px;
      background: var(--av-surface-secondary);
      flex: 1;
      justify-content: center;
    }
    .processing-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .processing-stage {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--av-text-primary);
    }
    .spin-anim { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes avSlideUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    .danger-icon { color: var(--av-danger); }
    .danger-text { color: var(--av-danger); font-size: 11px; }
    .cancel-upload-btn {
      width: 22px;
      height: 22px;
      border: 1px solid var(--av-border);
      border-radius: 4px;
      background: var(--av-surface-primary);
      color: var(--av-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.12s ease;
    }
    .cancel-upload-btn:hover {
      background: var(--av-danger-soft);
      border-color: var(--av-danger);
      color: var(--av-danger);
    }
    .byte-chip.permanent-chip {
      background: rgba(33, 150, 243, 0.12);
      border-color: rgba(33, 150, 243, 0.3);
      color: var(--av-accent);
      font-weight: 700;
      border-radius: 30px;
      padding : 4px;
    }
    .byte-chip.lifetime-chip {
      background: rgba(6, 182, 212, 0.12);
      border-color: rgba(6, 182, 212, 0.3);
      color: #06B6D4;
      font-weight: 700;
      border-radius: 30px;
      padding : 4px;
    }
    .chunk-progress-track {
      width: 100%;
      height: 6px;
      background: var(--av-surface-secondary, rgba(0, 0, 0, 0.08));
      border: 1px solid var(--av-border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 4px;
      overflow: hidden;
      margin: 4px 0;
    }
    .chunk-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3B82F6 0%, #06B6D4 100%);
      border-radius: 4px;
      transition: width 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
    }
    .processing-file-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .sensitive-row { display: flex; align-items: center; gap: 6px; padding: 10px 12px; background: var(--av-surface-secondary); color: var(--av-text-muted); font-size: 11.5px; font-weight: 600; cursor: pointer; border-bottom: 1px solid var(--av-border-subtle); }
    .sensitive-row app-icon { color: var(--av-text-muted); }
    .mask-code { font-family: var(--av-font-mono); font-size: 10px; margin-left: auto; opacity: 0.7; }

    /* Multi-File Batch Styling */
    .av-card-batch {
      border-top: 2px solid #6366F1 !important;
      height: 200px;
    }
    .av-card-batch-expanded {
      height: 200px !important;
      min-height: 200px !important;
      max-height: 200px !important;
    }
    .batch-pill {
      color: #6366F1 !important;
    }
    .batch-surface {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 4px;
      overflow: hidden;
    }
    .batch-uploading-box {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 6px 8px;
      background: rgba(99, 102, 241, 0.06);
      border-radius: 4px;
      border: 1px solid rgba(99, 102, 241, 0.15);
    }
    .batch-upload-status-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .batch-stage-text {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: #4F46E5;
    }
    /* Collapsed Stacked-Card Batch Thumbnail (3-Layer Depth Effect) */
    .batch-stacked-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 18px 10px 18px;
      box-sizing: border-box;
      background: var(--av-surface-secondary);
      border-bottom: 1px solid var(--av-border-subtle);
      overflow: hidden;
      cursor: pointer;
    }
    .batch-card-stack {
      position: relative;
      width: 100%;
      max-width: 240px;
      height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateY(3px);
    }
    .stack-sheet {
      position: absolute;
      inset: 0;
      border-radius: 6px;
      border: 1px solid var(--av-border-strong, rgba(0, 0, 0, 0.12));
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease;
    }
    .stack-sheet-back-2 {
      background: var(--av-surface-primary, #ffffff);
      transform: rotate(-3.5deg) translate(-3px, 1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      z-index: 1;
      opacity: 0.95;
    }
    .stack-sheet-back-1 {
      background: var(--av-surface-primary, #ffffff);
      transform: rotate(3deg) translate(3px, 4px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      z-index: 2;
      opacity: 0.98;
    }
    .stack-sheet-front {
      background: var(--av-surface-primary, #ffffff);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      z-index: 3;
      transform: rotate(0deg) translateY(2px);
    }
    .av-card:hover .stack-sheet-back-2 {
      transform: rotate(-6.5deg) translate(-7px, -1px);
    }
    .av-card:hover .stack-sheet-back-1 {
      transform: rotate(5.5deg) translate(8px, 6px);
    }
    .av-card:hover .stack-sheet-front {
      transform: translateY(0px);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
    }
    .stacked-front-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #ffffff;
      display: block;
    }
    .stacked-front-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px;
      box-sizing: border-box;
    }
    .stacked-front-filename {
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 85%;
    }
    .batch-expanded-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
      height: 100%;
      padding: 6px 8px;
      margin: 0 2px;
      box-sizing: border-box;
    }
    .batch-subfile-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border-subtle);
      border-radius: 4px;
      transition: all 0.12s ease;
      flex-shrink: 0;
    }
    .batch-subfile-row:hover {
      border-color: var(--av-border-strong);
      background: var(--av-surface-primary);
    }
    .subfile-icon-box {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .subfile-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .subfile-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      cursor: pointer;
    }
    .subfile-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--av-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .subfile-meta {
      font-size: 9.5px;
      color: var(--av-text-muted);
    }
    .subfile-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .subfile-btn {
      width: 20px;
      height: 20px;
      padding: 0;
      border: 1px solid var(--av-border);
      border-radius: 3px;
      background: var(--av-surface-primary);
      color: var(--av-text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.12s ease;
    }
    .subfile-btn:hover {
      background: var(--av-surface-secondary);
      color: var(--av-text-primary);
    }
    .subfile-btn.danger:hover {
      background: var(--av-danger-soft);
      border-color: var(--av-danger);
      color: var(--av-danger);
    }
    .batch-footer-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 22px;
      padding: 0 7px;
      font-size: 10.5px;
      font-weight: 600;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: 4px;
      color: #4F46E5;
      cursor: pointer;
      margin-right: 4px;
      transition: all 0.12s ease;
    }
    .batch-footer-btn:hover {
      background: rgba(99, 102, 241, 0.15);
    }
    .batch-download-all-btn {
      background: rgba(99, 102, 241, 0.1) !important;
      border-color: rgba(99, 102, 241, 0.3) !important;
      color: #4F46E5 !important;
    }
    .batch-download-all-btn:hover {
      background: #4F46E5 !important;
      color: #FFFFFF !important;
    }

    .cat-bg-amber { background: #FEF3C7 !important; color: #D97706 !important; }
    .cat-bg-blue { background: #DBEAFE !important; color: #2563EB !important; }
    .cat-bg-purple { background: #EDE9FE !important; color: #7C3AED !important; }
    .cat-bg-cyan { background: #CFFAFE !important; color: #0891B2 !important; }
    .cat-bg-red { background: #FEE2E2 !important; color: #DC2626 !important; }
    .cat-bg-emerald { background: #D1FAE5 !important; color: #059669 !important; }
    .cat-bg-indigo { background: #E0E7FF !important; color: #4F46E5 !important; }

    /* Dark-mode overrides for category chip colours */
    :host-context([data-theme="dark"]) .cat-bg-amber { background: rgba(245, 158, 11, 0.16) !important; color: #FBBF24 !important; }
    :host-context([data-theme="dark"]) .cat-bg-blue { background: rgba(59, 130, 246, 0.16) !important; color: #60A5FA !important; }
    :host-context([data-theme="dark"]) .cat-bg-purple { background: rgba(139, 92, 246, 0.16) !important; color: #A78BFA !important; }
    :host-context([data-theme="dark"]) .cat-bg-cyan { background: rgba(6, 182, 212, 0.16) !important; color: #22D3EE !important; }
    :host-context([data-theme="dark"]) .cat-bg-red { background: rgba(239, 68, 68, 0.16) !important; color: #F87171 !important; }
    :host-context([data-theme="dark"]) .cat-bg-emerald { background: rgba(16, 185, 129, 0.16) !important; color: #34D399 !important; }
    :host-context([data-theme="dark"]) .cat-bg-indigo { background: rgba(99, 102, 241, 0.16) !important; color: #818CF8 !important; }


    /* Footer */
    .card-footer { display: flex; align-items: center; justify-content: space-between; padding: 5px 10px; gap: 4px; min-height: 26px; }
    .card-footer-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .byte-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; color: var(--av-text-faint); font-family: var(--av-font-mono); }
    .delivered-chip { color: #10B981; }
    .delivered-chip app-icon { color: #10B981; }
    .permanent-chip { color: #06B6D4; }
    .permanent-chip app-icon { color: #06B6D4; }
    .burn-chip {
      color: #F59E0B;
      font-weight: 600;
      background: rgba(245, 158, 11, 0.12);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid rgba(245, 158, 11, 0.35);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .burn-chip app-icon { color: #F59E0B; }
    .expiry-chip { color: var(--av-text-faint); }
    .expiry-chip.expiring-soon {
      color: #D97706;
      font-weight: 600;
      background: rgba(245, 158, 11, 0.12);
      padding: 1px 5px;
      border-radius: 3px;
      border: 1px solid rgba(245, 158, 11, 0.35);
      animation: warnPulse 2s infinite ease-in-out;
    }
    @keyframes warnPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .text-amber { color: #F59E0B !important; }
    .text-cyan { color: #06B6D4 !important; }
    .card-footer-actions { display: flex; align-items: center; margin-left: auto; }
    .copy-btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      width: 22px;
      height: 22px;
      padding: 0;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: 4px;
      color: var(--av-text-muted);
      cursor: pointer;
      box-sizing: border-box;
      transition: all 0.12s ease;
    }
    .copy-btn-icon:hover { background: var(--av-border); color: var(--av-text-primary); }
    .copy-btn-icon.copy-btn-done { background: #10B981; border-color: #10B981; color: #fff; }
    .copy-btn-icon app-icon { color: inherit; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultCardComponent implements OnInit, OnDestroy {
  elementRef = inject(ElementRef);
  motion = inject(AirVaultMotionService);
  storageService = inject(AirVaultStorageService);
  clipboardService = inject(AirVaultClipboardService);
  deviceService = inject(AirVaultDeviceService);
  colorService = inject(AirVaultColorService);
  blameService = inject(AirVaultBlameService);
  syncService = inject(AirVaultSyncService);
  uiStore = inject(AirVaultUIStore);

  item = input.required<AirVaultItem>();
  accentColor = input<string>('');
  bubbleAccentColor = input<string>('');

  effectiveAccentColor = computed(() => {
    return this.accentColor() || this.bubbleAccentColor() || this.getAuthorColor();
  });

  togglePin = output<string>();
  toggleReveal = output<string>();
  deleteItem = output<string>();
  resendItem = output<AirVaultItem>();
  triggerToast = output<string>();
  openPreview = output<AirVaultItem>();
  cancelUpload = output<string>();
  retryUpload = output<string>();

  activeHoverUrl = signal<string | null>(null);
  textSegments = signal<TextSegment[]>([]);
  searchHighlightQuery = computed(() => this.uiStore.searchHighlightQuery());
  isCardHovered = signal<boolean>(false);

  private burnSub?: Subscription;

  ngOnInit(): void {
    this.burnSub = this.syncService.onItemBurned.subscribe(event => {
      if (event.itemId === this.item().id) {
        this.performBurnDissolve();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.burnSub) {
      this.burnSub.unsubscribe();
    }
  }

  private performBurnDissolve(): void {
    const cardEl = this.elementRef.nativeElement.querySelector('.av-card') || this.elementRef.nativeElement;
    this.motion.animateBurnDissolve(cardEl, () => {
      this.deleteItem.emit(this.item().id);
    });
  }

  effectiveActionShortcut = computed<ContentActionShortcut | undefined>(() => {
    const it = this.item();
    if (!it || it.isBatchParent) return undefined;
    if (it.content?.actionShortcut) {
      return it.content.actionShortcut;
    }
    if (it.content?.detectedType) {
      return {
        detectedType: it.content.detectedType,
        metadata: it.content.metadata || {},
        missingInfoHint: it.content.missingInfoHint
      };
    }
    return undefined;
  });

  shouldShowActionPopover = computed<boolean>(() => {
    return this.isCardHovered() && !!this.effectiveActionShortcut();
  });

  onCardMouseEnter(): void {
    this.isCardHovered.set(true);
  }

  onCardMouseLeave(): void {
    this.isCardHovered.set(false);
  }

  onActionShortcutExecuted(actionId: string): void {
    // Keep popover reactive without blocking card state
  }

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

  shouldShowEntryGutter(): boolean {
    return this.isTextOrCodeEntry();
  }

  constructor() {
    effect(() => {
      // Re-evaluate imageLoadFailed whenever the image source updates
      const imgSrc = this.effectiveImageSrc();
      if (imgSrc) {
        this.imageLoadFailed.set(false);
      } else {
        const cat = this.item()?.content?.category;
        if (cat === 'image' && !this.isPayloadLoading() && !this.imageLoadFailed()) {
          // Proactively resolve thumbnail/payload for images so tile renders immediately
          this.ensurePayloadLoaded();
        }
      }
    });

    effect(() => {
      const text = this.previewText();
      const cat = this.item().content?.category;
      if (cat === 'image' || cat === 'video' || cat === 'audio' || cat === 'file') {
        this.textSegments.set([{ isUrl: false, text }]);
        return;
      }
      this.parseTextSegmentsAsync(text);
    });
  }

  getAuthorColor(): string {
    const it = this.item();
    const cur = this.deviceService.currentDevice();
    const isSelf = !it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id || it.senderDeviceName === 'MacBook' || it.senderDeviceName === cur.name;
    const paired = this.deviceService.pairedDevices();
    const matchedDev = !isSelf ? paired.find(d => (d.id && (d.id === it.senderDeviceId || d.id === it.originDeviceId)) || (d.username && (d.username === it.originOwnerId || d.name === it.senderDeviceName))) : undefined;
    const candidate = it.senderDeviceAccent || it.authorColor || it.author_color || (isSelf ? cur.accentColor : matchedDev?.accentColor);
    const owner = it.originOwnerId || it.senderDeviceName || this.getDisplayOwner();
    return this.colorService.getColorForIdentity(owner, candidate, isSelf);
  }

  private async parseTextSegmentsAsync(rawText: string) {
    if (!rawText) {
      this.textSegments.set([]);
      return;
    }

    try {
      const detectedUrls = await detectUrlsAsync(rawText);
      if (detectedUrls.length === 0) {
        this.textSegments.set([{ isUrl: false, text: rawText }]);
        return;
      }

      const segments: TextSegment[] = [];
      let cursor = 0;

      for (const span of detectedUrls) {
        if (span.startIndex > cursor) {
          segments.push({
            isUrl: false,
            text: rawText.slice(cursor, span.startIndex)
          });
        }
        segments.push({
          isUrl: true,
          text: span.url,
          urlSpan: span
        });
        cursor = span.endIndex;
      }

      if (cursor < rawText.length) {
        segments.push({
          isUrl: false,
          text: rawText.slice(cursor)
        });
      }

      this.textSegments.set(segments);
    } catch {
      this.textSegments.set([{ isUrl: false, text: rawText }]);
    }
  }

  setActiveHoverUrl(url: string) {
    this.activeHoverUrl.set(url);
  }

  clearActiveHoverUrl() {
    this.activeHoverUrl.set(null);
  }

  async onCopyDetectedUrl(url: string, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.triggerToast.emit('URL copied to clipboard');
      this.clearActiveHoverUrl();
    } catch {
      this.triggerToast.emit('Failed to copy URL');
    }
  }

  onOpenDetectedUrl(url: string, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    if (!url) return;
    if (!isValidHttpUrl(url)) {
      this.triggerToast.emit('Blocked non-HTTP link for security');
      return;
    }
    const target = normalizeUrlForNavigation(url);
    window.open(target, '_blank', 'noopener,noreferrer');
    this.clearActiveHoverUrl();
  }

  normalizeUrl(url: string): string {
    return normalizeUrlForNavigation(url);
  }

  formatUrl(url: string): string {
    return formatDisplayUrl(url);
  }

  isCurrentDevice(): boolean {
    const it = this.item();
    if (!it) return false;
    const cur = this.deviceService.currentDevice();
    return !it.originDeviceId || it.originDeviceId === cur.id || it.senderDeviceId === cur.id || it.senderDeviceName === 'MacBook' || it.senderDeviceName === cur.name;
  }

  getDisplayOwner(): string {
    const it = this.item();
    if (!it) return '@User';
    const cur = this.deviceService.currentDevice();
    const isSelf = this.isCurrentDevice();
    if (isSelf) {
      const u = cur.username ? `@${cur.username.replace(/^@/, '')}` : (cur.name?.startsWith('@') ? cur.name : `@${cur.name || 'chr'}`);
      return `${u} (this device)`;
    }
    if (it.originOwnerId && it.originOwnerId !== 'MacBook' && !it.originOwnerId.startsWith('dev-')) {
      return it.originOwnerId.startsWith('@') ? it.originOwnerId : `@${it.originOwnerId}`;
    }
    if (it.senderDeviceName && it.senderDeviceName !== 'MacBook') {
      return it.senderDeviceName.startsWith('@') ? it.senderDeviceName : `@${it.senderDeviceName}`;
    }
    const paired = this.deviceService.pairedDevices().find(d => d.id === it.senderDeviceId || d.id === it.originDeviceId);
    if (paired) {
      return paired.username ? `@${paired.username.replace(/^@/, '')}` : (paired.name?.startsWith('@') ? paired.name : `@${paired.name}`);
    }
    return cur.username ? `@${cur.username}` : '@device';
  }

  isTextOrCodeEntry(): boolean {
    const it = this.item();
    if (it.isBatchParent) return false;
    const cat = it.content?.category;
    return cat === 'text' || cat === 'code' || cat === 'json' || cat === 'url';
  }

  copied = signal(false);
  imageLoadFailed = signal(false);
  isPayloadLoading = signal(false);
  payloadObjectUrl = signal<string | null>(null);

  effectiveImageSrc = computed<string>(() => {
    // 1. Prefer resolved Object URL from lazy on-demand fetch
    const objUrl = this.payloadObjectUrl();
    if (objUrl) return objUrl;

    // 2. Fall back to lightweight thumbnail previewUrl
    const it = this.item();
    const preview = it?.content?.previewUrl;
    if (preview && typeof preview === 'string' && preview.trim()) {
      return preview.trim();
    }
    const raw = it?.content?.raw;
    if (raw && typeof raw === 'string' && raw.trim()) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return trimmed;
      }
      if (trimmed.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trimmed.slice(0, 100))) {
        return `data:image/png;base64,${trimmed}`;
      }
      return trimmed;
    }
    return '';
  });

  /**
   * Lazily loads full payload on-demand without blocking the main UI thread.
   */
  async ensurePayloadLoaded(): Promise<Blob | null> {
    const it = this.item();
    const cached = this.storageService.resourceCache.get(it.id);
    if (cached) {
      this.payloadObjectUrl.set(cached.objectUrl);
      return cached.blob;
    }

    this.isPayloadLoading.set(true);
    try {
      const result = await this.storageService.fetchResourcePayload(it);
      if (result.objectUrl) {
        this.payloadObjectUrl.set(result.objectUrl);
      }
      return result.blob;
    } catch (err) {
      console.warn(`[AirVault Card] Failed to lazy-load payload for ${it.id}:`, err);
      return null;
    } finally {
      this.isPayloadLoading.set(false);
    }
  }

  onImageError(): void {
    this.imageLoadFailed.set(true);
  }

  expiryInfo = computed(() => this.storageService.getItemExpiryInfo(this.item()));

  /**
   * Virtualized text preview: truncates extremely large payloads (e.g. 50MB bytecode/text)
   * to avoid flooding the DOM while preserving the full payload in memory/storage.
   */
  isLongPreview = computed(() => {
    const raw = this.item().content?.raw || '';
    return raw.length > 280;
  });

  previewText = computed(() => {
    const raw = this.item().content?.raw || '';
    if (raw.length > 280) {
      return raw.slice(0, 280) + '…';
    }
    return raw;
  });

  onCancelUpload(e: Event) {
    e.stopPropagation();
    this.cancelUpload.emit(this.item().id);
  }

  onRetryUpload(e: Event) {
    e.stopPropagation();
    this.retryUpload.emit(this.item().id);
  }

  onCardClick(e: Event) {
    // If clicking an interactive button inside the card, ignore
    if ((e.target as HTMLElement).closest('.card-action-btn, .cancel-upload-btn, .url-link, .copy-btn-icon')) {
      return;
    }
    this.openPreview.emit(this.item());
  }

  onTileDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/x-airvault-item-id', this.item().id);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  onTileDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  onTileDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer?.getData('application/x-airvault-item-id');
    if (sourceId && sourceId !== this.item().id) {
      this.storageService.reorderItems(sourceId, this.item().id);
    }
  }

  async onCopy(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      const it = this.item();
      const cat = it.content.category;
      const isHeavy = cat !== 'text' && cat !== 'code' && cat !== 'json' && cat !== 'url';

      // For binary or lazy resources, ensure payload is resolved from cache/disk
      if (isHeavy && (!it.content.raw || it.content.raw.length === 0)) {
        const blob = await this.ensurePayloadLoaded();
        if (blob) {
          const success = await this.clipboardService.copyResource({ ...it.content, raw: this.payloadObjectUrl() || it.content.previewUrl || '' });
          if (success) {
            this.copied.set(true);
            this.triggerToast.emit(cat === 'image' ? 'Image copied to clipboard' : 'Copied to clipboard');
            setTimeout(() => this.copied.set(false), 2000);
            return;
          }
        }
      }

      const success = await this.clipboardService.copyResource(this.item().content);
      if (success) {
        this.copied.set(true);
        const isImg = this.item().content.category === 'image';
        this.triggerToast.emit(isImg ? 'Image copied to clipboard' : 'Copied to clipboard');
        setTimeout(() => this.copied.set(false), 2000);
      }
    } catch { }
  }

  async onDownload(e?: Event) {
    if (e) {
      e.stopPropagation();
      this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    }
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
    const it = this.item();
    const raw = it.content.previewUrl || it.content.raw;

    // Check if we need to stream full payload on demand
    if (!raw || raw.length === 0 || (!raw.startsWith('data:') && !raw.startsWith('blob:') && !raw.startsWith('http'))) {
      const blob = await this.ensurePayloadLoaded();
      if (blob) {
        downloadUrl = this.payloadObjectUrl() || URL.createObjectURL(blob);
      }
    }

    if (!downloadUrl) {
      if (raw && raw.startsWith('data:')) {
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
      } else if (raw && (raw.startsWith('blob:') || raw.startsWith('http'))) {
        downloadUrl = raw;
      } else if (raw) {
        const isBinaryExt = /\.(zip|png|jpe?g|gif|webp|pdf|mp4|mov|tar|gz|7z|bin|dmg)$/i.test(filename);
        const mimeType = cat === 'json' ? 'application/json' : (isBinaryExt ? 'application/octet-stream' : 'text/plain');
        const blob = new Blob([raw], { type: mimeType });
        downloadUrl = URL.createObjectURL(blob);
      }
    }

    if (!downloadUrl) {
      this.triggerToast.emit('Resource unavailable for download');
      return;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.triggerToast.emit(`Downloading ${filename}`);
  }

  onResend(e?: Event) {
    if (e) {
      e.stopPropagation();
      this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    }
    this.resendItem.emit(this.item());
  }

  onTogglePin(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    this.togglePin.emit(this.item().id);
  }

  onToggleReveal(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    this.toggleReveal.emit(this.item().id);
  }

  onDelete(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    this.deleteItem.emit(this.item().id);
  }

  getFaviconUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=16&domain=${hostname}`;
    } catch { return ''; }
  }

  onFaviconError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  getCategoryIcon(cat?: string): string {
    const c = (cat || 'text').toLowerCase();
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
    return m[c] ?? 'file-text';
  }

  getCategoryLabel(cat?: string): string {
    const c = (cat || 'text').toLowerCase();
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
    return m[c] ?? 'Text';
  }

  categoryAccent(cat?: string): string {
    const c = (cat || 'text').toLowerCase();
    const m: Record<string, string> = {
      url: '#3B82F6',
      json: '#10B981',
      code: '#8B5CF6',
      image: '#F59E0B',
      video: '#EF4444',
      audio: '#8B5CF6',
      pdf: '#EF4444',
      spreadsheet: '#10B981',
      archive: '#06B6D4',
      font: '#6366F1',
      file: '#6B7280',
      text: 'var(--av-text-muted)'
    };
    return m[c] ?? 'var(--av-text-muted)';
  }

  firstBatchFile = computed(() => {
    const files = this.item().batchFiles;
    return (files && files.length > 0) ? files[0] : null;
  });

  isBatchExpanded = computed(() => {
    return this.item().content?.collapseState === 'expanded';
  });

  toggleBatchExpand(e: Event) {
    e.stopPropagation();
    const current = this.isBatchExpanded();
    const nextState = current ? 'collapsed' : 'expanded';
    this.storageService.setCollapseState(this.item().id, nextState);
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
      case 'code': return 'text-indigo';
      default: return 'text-blue';
    }
  }

  async onDownloadAllBatch(e: Event) {
    e.stopPropagation();
    const it = this.item();
    this.triggerToast.emit(`📦 Preparing ZIP download of ${it.batchFiles?.length || 0} files...`);

    // Try server-side ZIP stream first if backend is reachable
    const batchId = it.batchId || it.id;
    try {
      const resp = await fetch(`/api/v1/airvault/clipboards/default/batches/${batchId}/download-all`);
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch_${batchId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        this.triggerToast.emit(`✓ Downloaded batch_${batchId}.zip`);
        return;
      }
    } catch { }

    // Fallback: 100% client-side JSZip packaging
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const sub of (it.batchFiles || [])) {
        const filename = sub.content.filename || `file_${sub.id}`;
        const raw = sub.content.previewUrl || sub.content.raw;
        if (raw.startsWith('data:')) {
          const base64Data = raw.split(',')[1];
          zip.file(filename, base64Data, { base64: true });
        } else {
          zip.file(filename, raw);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${batchId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.triggerToast.emit(`✓ Downloaded batch_${batchId}.zip`);
    } catch (err) {
      console.error('[AirVault] Client-side batch zip failed:', err);
      this.triggerToast.emit('⛔ Failed to package batch zip');
    }
  }

  onDownloadSingleSubFile(subFile: AirVaultItem, e: Event) {
    e.stopPropagation();
    const raw = subFile.content.previewUrl || subFile.content.raw;
    const filename = subFile.content.filename || `file_${subFile.id}`;

    let downloadUrl = raw;
    if (raw.startsWith('data:')) {
      try {
        const parts = raw.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
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
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.triggerToast.emit(`Downloading ${filename}`);
  }

  onDeleteSubFile(subFile: AirVaultItem, e: Event) {
    e.stopPropagation();
    const parentId = this.item().id;
    this.storageService.deleteBatchFile(parentId, subFile.id);
    this.triggerToast.emit(`Removed "${subFile.content.filename}" from batch`);
  }

  onRetryBatchFile(subFile: AirVaultItem, e: Event) {
    e.stopPropagation();
    this.retryUpload.emit(subFile.id);
  }

  formatBytes(b: number): string {
    if (!b || b === 0) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  relativeTime(ts?: number): string {
    if (!ts || isNaN(ts) || ts <= 0) return 'now';
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'now';
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}d`;
  }
}
