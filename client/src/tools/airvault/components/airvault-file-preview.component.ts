import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultItem, AirVaultStorageService } from '../services/airvault-storage.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { getAirVaultApiUrl } from '../services/airvault-api.util';
import { AirVaultLogger } from '../services/airvault-sync-debug.service';
import { renderMarkdownToSafeHtml, renderPlainTextToSafeHtml, looksLikeMarkdown, isHtmlContent } from '../services/airvault-markdown.util';
import JSZip from 'jszip';

export interface ArchiveFileEntry {
  name: string;
  size: number;
  dir: boolean;
}

@Component({
  selector: 'app-airvault-file-preview',
  standalone: true,
  imports: [CommonModule, IconComponent],
  styleUrls: ['../airvault.shared.css'],
  template: `
    <div class="file-preview-root">
      <!-- 0. IN-PROGRESS UPLOAD / PROCESSING STATE (Guards video/image/file from premature render) -->
      @if (item().processingState === 'processing' || item().processingState === 'queued') {
        <div class="preview-stage-container upload-in-progress-stage center-flex">
          <div class="upload-in-progress-card">
            <div class="upload-progress-circle-box">
              <svg class="preview-circular-svg" viewBox="0 0 36 36">
                <path class="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path class="circle-fill"
                  [attr.stroke-dasharray]="(item().progressPercent || 0) + ', 100'"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span class="preview-progress-percent">{{ item().progressPercent || 0 }}%</span>
            </div>
            <span class="in-progress-title">Resource is still uploading</span>
            <span class="in-progress-filename">{{ item().content.filename || 'Attachment' }}</span>
            <span class="in-progress-sub">
              {{ (item().progressPercent || 0) < 100 ? 'Encrypting & streaming chunks…' : 'Finalizing & verifying resource…' }} · {{ item().progressPercent || 0 }}% complete
            </span>
            <p class="in-progress-hint">Please wait while the resource is securely uploaded and verified before previewing or playback.</p>
          </div>
        </div>
      }

      <!-- 0b. DECOMPRESSION & RETRIEVAL LOADING STATE (>400ms operations) -->
      @else if (isPreparingFile()) {
        <div class="preview-stage-container upload-in-progress-stage center-flex">
          <div class="upload-in-progress-card">
            <div class="preparing-spinner-halo">
              <div class="preparing-spinner"></div>
            </div>
            <span class="in-progress-title">Preparing your file…</span>
            <span class="in-progress-filename">{{ item().content.filename || 'Resource' }}</span>
            <span class="in-progress-sub">Decompressing & streaming verified original bytes</span>
          </div>
        </div>
      }

      <!-- 1. IMAGES (JPG, PNG, WEBP, GIF, SVG, HEIC) -->
      @else if (resolvedCategory() === 'image') {
        <div class="preview-stage-container image-stage center-flex">
          @if (mediaLoadError() || (!resolvedObjectUrl() && !item().content.raw && !item().content.previewUrl)) {
            <div class="media-not-found-card" [style.transform]="'scale(' + zoomLevel() + ')'">
              <div class="not-found-icon-halo">
                <app-icon name="image-off" class="icon-lg text-amber"></app-icon>
              </div>
              <h4 class="not-found-title">Image Not Available</h4>
              <span class="not-found-filename">{{ item().content.filename || 'Resource' }}</span>
              <p class="not-found-desc">
                The image source could not be loaded or was removed from local storage.
                You can attempt to re-download or request it again from the originating device.
              </p>
              <div class="not-found-actions">
                <button type="button" class="not-found-btn" (click)="retryLoad()">
                  <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
                  <span>Retry Loading</span>
                </button>
              </div>
            </div>
          } @else {
            <img [src]="resolvedObjectUrl() || item().content.raw || item().content.previewUrl" 
                 [alt]="item().content.filename || 'Image preview'" 
                 class="stage-img" 
                 [style.transform]="'scale(' + zoomLevel() + ')'" 
                 (error)="onMediaError()" />
          }
        </div>
      }

      <!-- 2. VIDEOS (Metadata representation, no streaming/playback) -->
      @else if (resolvedCategory() === 'video') {
        <div class="preview-stage-container video-stage center-flex">
          <div class="generic-meta-card" [style.transform]="'scale(' + zoomLevel() + ')'">
            <div class="meta-icon-box video-accent"><app-icon name="film" class="icon-lg"></app-icon></div>
            <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Video Resource', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
            <span class="meta-file-details">{{ formatBytes(item().content.byteSize) }} · Video Resource</span>
            <p class="meta-desc">Video resource stored securely. Ready for download or transfer across devices.</p>
          </div>
        </div>
      }

      <!-- 3. AUDIO (MP3, WAV, M4A, AAC, OGG) -->
      @else if (resolvedCategory() === 'audio') {
        <div class="preview-stage-container audio-stage" [style.transform]="'scale(' + zoomLevel() + ')'">
          <div class="audio-player-card">
            <div class="audio-icon-box">
              <app-icon name="music" class="icon-lg"></app-icon>
            </div>
            <div class="audio-info">
              <span class="audio-filename">{{ item().content.filename || 'Audio Track' }}</span>
              <span class="audio-meta">{{ formatBytes(item().content.byteSize) }} · Audio stream (progressive)</span>
            </div>
            <audio #audioElementRef 
                   [src]="resolvedMediaStreamUrl() || resolvedObjectUrl() || item().content.raw || item().content.previewUrl" 
                   preload="metadata"
                   controls 
                   class="native-audio-player"
                   (loadedmetadata)="onMediaLoadedMetadata($event, 'audio')"
                   (progress)="onMediaProgress($event, 'audio')"
                   (play)="onMediaPlay('audio')"
                   (pause)="playingChange.emit(false)"
                   (volumechange)="onVolumeChange()"></audio>
          </div>
        </div>
      }

      <!-- 4. PDF (PDF) -->
      @else if (resolvedCategory() === 'pdf') {
        <div class="preview-stage-container pdf-stage">
          @if (safePdfUrl()) {
            <iframe [src]="safePdfUrl()" class="stage-pdf-frame" title="PDF Preview"></iframe>
          } @else {
            <div class="pdf-fallback-card">
              <div class="meta-icon-box" style="color: #EF4444;"><app-icon name="file-text" class="icon-lg"></app-icon></div>
              <span class="fallback-title">{{ item().content.filename || 'Document.pdf' }}</span>
              <span class="fallback-sub">Processing PDF preview…</span>
            </div>
          }
        </div>
      }

      <!-- 5. SPREADSHEETS (CSV, TSV, XLSX, XLS) -->
      @else if (resolvedCategory() === 'spreadsheet') {
        <div class="preview-stage-container spreadsheet-stage" [class.center-flex]="!isCsvFormat()">
          @if (isCsvFormat()) {
            <div class="spreadsheet-table-wrapper" [style.font-size.px]="13 * zoomLevel()" (scroll)="onCsvScroll($event)">
              <table class="spreadsheet-grid">
                <thead>
                  <tr>
                    <th class="row-num-th">#</th>
                    @for (col of csvHeaders(); track $index) {
                      <th>@for (part of getHighlightParts(col, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of csvRows(); track $index) {
                    <tr>
                      <td class="row-num-td">{{ $index + 1 }}</td>
                      @for (cell of row; track $index) {
                        <td>@for (part of getHighlightParts(cell, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
              @if (totalCsvRows() > csvRows().length) {
                <div class="spreadsheet-footer-notice">
                  <span>Showing {{ csvRows().length }} of {{ totalCsvRows() }} rows (auto-loads as you scroll).</span>
                  <div class="progressive-actions-row">
                    <button type="button" class="progressive-load-btn" (click)="loadMoreCsvRows()" data-tooltip="Load next 100 rows into table" aria-label="Load next 100 rows">Load next 100</button>
                    <button type="button" class="progressive-load-btn secondary" (click)="loadAllCsvRows()" data-tooltip="Load all remaining rows" aria-label="Load all rows">Load all ({{ totalCsvRows() }})</button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="generic-meta-card" [style.transform]="'scale(' + zoomLevel() + ')'">
              <div class="meta-icon-box excel-accent"><app-icon name="table" class="icon-lg"></app-icon></div>
              <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Spreadsheet', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
              <span class="meta-file-details">{{ formatBytes(item().content.byteSize) }} · Microsoft Excel Spreadsheet</span>
              <p class="meta-desc">Binary spreadsheet files can be viewed by downloading to Excel, Numbers, or Google Sheets.</p>
            </div>
          }
        </div>
      }

      <!-- 6. ARCHIVES (ZIP, RAR, 7Z, TAR, GZ) -->
      @else if (resolvedCategory() === 'archive') {
        <div class="preview-stage-container archive-stage" [class.center-flex]="!isZipArchive() || zipEntries().length === 0">
          @if (isZipArchive() && zipEntries().length > 0) {
            <div class="archive-manifest-wrapper" [style.font-size.px]="13 * zoomLevel()">
              <div class="archive-manifest-header">
                <app-icon name="folder-archive" class="icon-sm text-cyan"></app-icon>
                <span>Archive Contents ({{ zipEntries().length }} items)</span>
              </div>
              <div class="archive-entries-list">
                @for (entry of zipEntries(); track entry.name) {
                  <div class="archive-entry-row">
                    <app-icon [name]="entry.dir ? 'folder' : 'file'" class="icon-xs entry-icon"></app-icon>
                    <span class="entry-name">@for (part of getHighlightParts(entry.name, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
                    @if (!entry.dir) {
                      <span class="entry-size">{{ formatBytes(entry.size) }}</span>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="generic-meta-card" [style.transform]="'scale(' + zoomLevel() + ')'">
              <div class="meta-icon-box archive-accent"><app-icon name="archive" class="icon-lg"></app-icon></div>
              <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Compressed Archive', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
              <span class="meta-file-details">{{ formatBytes(item().content.byteSize) }} · Compressed Archive</span>
              <p class="meta-desc">Encrypted archive package. Click Download to extract on your machine.</p>
            </div>
          }
        </div>
      }

      <!-- 7. FONTS (TTF, OTF, WOFF, WOFF2) -->
      @else if (resolvedCategory() === 'font') {
        <div class="preview-stage-container font-stage center-flex" [style.transform]="'scale(' + zoomLevel() + ')'">
          <div class="font-specimen-card" [style.font-family]="fontFamilyName()">
            <div class="specimen-header">
              <span class="specimen-name">@for (part of getHighlightParts(item().content.filename || 'Typography Specimen', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
              <span class="specimen-meta">{{ formatBytes(item().content.byteSize) }} · Typeface</span>
            </div>
            <div class="specimen-alphabet">
              <div class="alphabet-line">ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
              <div class="alphabet-line lowercase">abcdefghijklmnopqrstuvwxyz</div>
              <div class="alphabet-line numbers">0123456789 (!@#$%^&*.,?)</div>
            </div>
            <div class="specimen-paragraph">
              The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
            </div>
          </div>
        </div>
      }

      <!-- 8. MARKDOWN (.md files or clipboard Markdown content) -->
      @else if (resolvedCategory() === 'markdown') {
        <div class="preview-stage-container generic-stage" (scroll)="onTextScroll($event)">
          <div class="av-rich-document-preview" [class.nowrap-pre]="!isWrapped()" [style.font-size.px]="14 * zoomLevel()" [innerHTML]="safeFormattedTextPreview()"></div>
          @if (hasMoreText()) {
            <div class="progressive-chunk-bar">
              <span class="progressive-chunk-info">Showing first {{ (renderedTextLength() / 1000).toFixed(0) }} KB of {{ (totalTextLength() / 1000).toFixed(0) }} KB (auto-loads as you scroll)</span>
              <div class="progressive-actions-row">
                <button type="button" class="progressive-load-btn" (click)="loadMoreText()">Load more</button>
                <button type="button" class="progressive-load-btn secondary" (click)="loadAllText()">Load all</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- 9. CODE & JSON -->
      @else if (resolvedCategory() === 'code' || resolvedCategory() === 'json') {
        <div class="preview-stage-container code-stage" (scroll)="onTextScroll($event)">
          <pre class="stage-code-pre" [class.nowrap-pre]="!isWrapped()" [style.font-size.px]="13 * zoomLevel()"><code>@for (part of getHighlightParts(textPreview(), searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</code></pre>
          @if (hasMoreText()) {
            <div class="progressive-chunk-bar">
              <span class="progressive-chunk-info">Showing first {{ (renderedTextLength() / 1000).toFixed(0) }} KB of {{ (totalTextLength() / 1000).toFixed(0) }} KB (auto-loads as you scroll)</span>
              <div class="progressive-actions-row">
                <button type="button" class="progressive-load-btn" (click)="loadMoreText()">Load more</button>
                <button type="button" class="progressive-load-btn secondary" (click)="loadAllText()">Load all</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- 9. URL -->
      @else if (resolvedCategory() === 'url') {
        <div class="preview-stage-container url-stage center-flex" [style.transform]="'scale(' + zoomLevel() + ')'">
          <div class="url-card">
            <app-icon name="link" class="icon-lg url-icon"></app-icon>
            <a [href]="item().content.raw" target="_blank" rel="noopener noreferrer" class="url-text">@for (part of getHighlightParts(item().content.raw, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</a>
            <a [href]="item().content.raw" target="_blank" rel="noopener noreferrer" class="av-btn-primary url-btn">
              <span>Open in New Tab</span>
              <app-icon name="external-link" class="icon-xs"></app-icon>
            </a>
          </div>
        </div>
      }

      <!-- 10. GENERIC METADATA / RICH TEXT / UNSUPPORTED / DESIGN / EBOOK / DOCS -->
      @else {
        <div class="preview-stage-container generic-stage" [class.center-flex]="!isTextDoc()" (scroll)="isTextDoc() ? onTextScroll($event) : null">
          @if (isTextDoc()) {
            <div class="av-rich-document-preview" [class.nowrap-pre]="!isWrapped()" [style.font-size.px]="14 * zoomLevel()" [innerHTML]="safeFormattedTextPreview()"></div>
            @if (hasMoreText()) {
              <div class="progressive-chunk-bar">
                <span class="progressive-chunk-info">Showing first {{ (renderedTextLength() / 1000).toFixed(0) }} KB of {{ (totalTextLength() / 1000).toFixed(0) }} KB (auto-loads as you scroll)</span>
                <div class="progressive-actions-row">
                  <button type="button" class="progressive-load-btn" (click)="loadMoreText()">Load more</button>
                  <button type="button" class="progressive-load-btn secondary" (click)="loadAllText()">Load all</button>
                </div>
              </div>
            }
          } @else {
            <div class="generic-meta-card" [style.transform]="'scale(' + zoomLevel() + ')'">
              <div class="meta-icon-box" [style.color]="getCategoryColor()"><app-icon [name]="getCategoryIcon()" class="icon-lg"></app-icon></div>
              <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Attached File', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match" [class.current-match]="part.isCurrent">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
              <span class="meta-file-details">{{ formatBytes(item().content.byteSize) }} · {{ getCategoryLabel() }}</span>
              <p class="meta-desc">Encrypted file transfer. Ready to download with full binary fidelity.</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .file-preview-root {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
      min-height: 320px;
      box-sizing: border-box;
      overflow: hidden;
    }

    .preview-stage-container {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
      padding: 24px;
      box-sizing: border-box;
      overflow: auto;
      transition: transform 0.15s ease;
    }

    /* Images */
    .image-stage { background: var(--av-bg-canvas, #09090b); }
    .stage-img { max-width: 100%; max-height: 72vh; object-fit: contain; border-radius: 6px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }

    /* Videos (Metadata representation) */
    .video-stage { background: var(--av-surface-primary); }

    /* Audio */
    .audio-stage { background: var(--av-surface-primary); }
    .audio-player-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 40px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      box-shadow: var(--av-shadow-md);
      max-width: 460px;
      width: 100%;
    }
    .audio-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.15);
      color: #8B5CF6;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .audio-info { text-align: center; }
    .audio-filename { font-size: 15px; font-weight: 600; color: var(--av-text-primary); display: block; word-break: break-all; }
    .audio-meta { font-size: 12px; color: var(--av-text-muted); margin-top: 4px; display: block; }
    .native-audio-player { width: 100%; outline: none; margin-top: 8px; }

    /* PDF */
    .pdf-stage { padding: 0; background: #525659; overflow: hidden; }
    .stage-pdf-frame { width: 100%; height: 75vh; border: none; background: #fff; }
    .pdf-fallback-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 100%; color: #fff; text-align: center; padding: 32px; }

    /* Centering layout */
    .center-flex {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 auto;
    }

    /* Progressive Chunking and Scroll Indicators */
    .progressive-chunk-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 16px;
      padding: 10px 14px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-md);
      font-size: 12px;
      color: var(--av-text-muted);
    }
    .progressive-chunk-info {
      flex: 1;
      font-size: 11.5px;
    }
    .progressive-actions-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .progressive-load-btn {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: var(--av-radius-sm);
      background: var(--av-accent, #2196F3);
      color: #ffffff;
      border: 1px solid var(--av-accent, #2196F3);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .progressive-load-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .progressive-load-btn.secondary {
      background: var(--av-surface-primary);
      color: var(--av-text-primary);
      border-color: var(--av-border);
    }
    .progressive-load-btn.secondary:hover {
      border-color: var(--av-accent, #2196F3);
      color: var(--av-accent, #2196F3);
    }

    /* Spreadsheets */
    .spreadsheet-stage { padding: 0; background: var(--av-surface-primary); align-items: flex-start; justify-content: flex-start; }
    .spreadsheet-table-wrapper { width: 100%; height: 100%; max-height: 72vh; overflow: auto; }
    .spreadsheet-grid { width: 100%; border-collapse: collapse; font-family: var(--av-font-mono); }
    .spreadsheet-grid th, .spreadsheet-grid td {
      border: 1px solid var(--av-border);
      padding: 6px 12px;
      text-align: left;
      white-space: nowrap;
      color: var(--av-text-primary);
    }
    .spreadsheet-grid th { background: var(--av-surface-secondary); font-weight: 600; position: sticky; top: 0; z-index: 2; }
    .row-num-th, .row-num-td { width: 40px; text-align: center; color: var(--av-text-muted); background: var(--av-surface-secondary); font-size: 11px; }
    .spreadsheet-footer-notice { padding: 8px 16px; background: var(--av-surface-secondary); border-top: 1px solid var(--av-border); font-size: 11.5px; color: var(--av-text-muted); text-align: center; }

    /* Archives */
    .archive-stage { padding: 16px; align-items: flex-start; justify-content: flex-start; }
    .archive-manifest-wrapper { width: 100%; background: var(--av-surface-secondary); border: 1px solid var(--av-border); border-radius: var(--av-radius-md); overflow: hidden; }
    .archive-manifest-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--av-surface-tertiary, var(--av-surface-secondary)); border-bottom: 1px solid var(--av-border); font-weight: 600; font-size: 12.5px; color: var(--av-text-primary); }
    .archive-entries-list { max-height: 60vh; overflow-y: auto; }
    .archive-entry-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 14px; border-bottom: 1px solid var(--av-border-subtle); font-family: var(--av-font-mono); font-size: 12px; }
    .archive-entry-row:last-child { border-bottom: none; }
    .entry-icon { color: var(--av-text-muted); margin-right: 8px; flex-shrink: 0; }
    .entry-name { color: var(--av-text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entry-size { color: var(--av-text-muted); font-size: 11px; margin-left: 12px; }

    /* Fonts */
    .font-stage { background: var(--av-surface-primary); }
    .font-specimen-card { background: var(--av-surface-secondary); border: 1px solid var(--av-border); border-radius: var(--av-radius-lg); padding: 32px; max-width: 680px; width: 100%; margin: 0 auto; }
    .specimen-header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--av-border); padding-bottom: 12px; margin-bottom: 20px; }
    .specimen-name { font-size: 16px; font-weight: 700; color: var(--av-text-primary); }
    .specimen-meta { font-size: 12px; color: var(--av-text-muted); }
    .specimen-alphabet { font-size: 22px; line-height: 1.5; color: var(--av-text-primary); margin-bottom: 20px; word-break: break-all; }
    .specimen-paragraph { font-size: 14px; line-height: 1.6; color: var(--av-text-secondary); }

    /* Code & Text */
    .code-stage {
      padding: 18px;
      align-items: flex-start;
      justify-content: flex-start;
      background: var(--av-surface-secondary);
    }
    .generic-stage {
      padding: 24px;
      background: var(--av-surface-primary);
    }
    .stage-code-pre, .stage-text-pre { width: 100%; margin: 0; font-family: var(--av-font-mono); color: var(--av-text-primary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; overflow: auto; }
    .nowrap-pre { white-space: pre !important; word-break: normal !important; }

    /* Generic Meta Card */
    .generic-meta-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      text-align: center;
      max-width: 480px;
      width: 100%;
      margin: 0 auto;
    }
    .meta-icon-box { width: 68px; height: 68px; border-radius: 16px; background: var(--av-surface-primary); border: 1px solid var(--av-border); display: flex; align-items: center; justify-content: center; }
    .excel-accent { color: #10B981; background: rgba(16, 185, 129, 0.1); }
    .archive-accent { color: #06B6D4; background: rgba(6, 182, 212, 0.1); }
    .video-accent { color: #F43F5E; background: rgba(244, 63, 94, 0.1); }
    .meta-file-title { font-size: 16px; font-weight: 600; color: var(--av-text-primary); word-break: break-all; }
    .meta-file-details { font-size: 12.5px; color: var(--av-text-muted); }
    .meta-desc { font-size: 12px; color: var(--av-text-faint); margin-top: 4px; line-height: 1.4; }

    /* URL */
    .url-stage { background: var(--av-surface-primary); }
    .url-card { display: flex; flex-direction: column; align-items: center; gap: 16px; max-width: 580px; text-align: center; margin: 0 auto; }
    .url-icon { color: #2196F3; }
    :host-context([data-theme="light"]) .url-icon { color: #1565C0; }
    .url-text {
      font-size: 16px;
      font-weight: 500;
      color: #2196F3;
      word-break: break-all;
      text-decoration: underline;
      cursor: pointer;
      transition: color 0.12s ease;
    }
    .url-text:hover {
      color: #60A5FA;
      text-decoration: underline;
    }
    :host-context([data-theme="light"]) .url-text {
      color: #1565C0;
    }
    :host-context([data-theme="light"]) .url-text:hover {
      color: #0D47A1;
    }
    .url-btn { display: inline-flex; align-items: center; gap: 6px; }

    /* In-Progress Upload Stage */
    .upload-in-progress-stage {
      background: var(--av-surface-primary);
    }
    .upload-in-progress-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border);
      border-radius: var(--av-radius-lg);
      text-align: center;
      max-width: 480px;
      width: 100%;
      margin: 0 auto;
      box-shadow: var(--av-shadow-md);
    }

    /* Media Not Found Fallback Card */
    .media-not-found-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 36px 28px;
      background: var(--av-surface-secondary);
      border: 1px solid var(--av-border-strong, rgba(255, 255, 255, 0.12));
      border-radius: var(--av-radius-lg, 14px);
      text-align: center;
      max-width: 440px;
      width: 100%;
      margin: 0 auto;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.35);
      animation: notFoundPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes notFoundPopIn {
      0% { opacity: 0; transform: scale(0.94); }
      100% { opacity: 1; transform: scale(1); }
    }

    .not-found-icon-halo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
      box-shadow: 0 0 24px rgba(245, 158, 11, 0.15);
      color: #F59E0B;
    }
    .not-found-icon-halo app-icon {
      color: #F59E0B !important;
      width: 28px !important;
      height: 28px !important;
    }

    .not-found-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--av-text-primary);
      margin: 0;
    }

    .not-found-filename {
      font-size: 12px;
      font-weight: 600;
      color: var(--av-accent, #2196F3);
      font-family: var(--av-font-mono, monospace);
      word-break: break-all;
      background: var(--av-surface-primary);
      border: 1px solid var(--av-border);
      padding: 3px 10px;
      border-radius: var(--av-radius-pill, 9999px);
      max-width: 320px;
    }

    .not-found-desc {
      font-size: 12px;
      color: var(--av-text-muted);
      line-height: 1.5;
      margin: 0;
      max-width: 360px;
    }

    .not-found-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }

    .not-found-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--av-radius-sm, 6px);
      font-size: 12px;
      font-weight: 600;
      background: var(--av-surface-primary);
      color: var(--av-text-primary);
      border: 1px solid var(--av-border);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .not-found-btn:hover {
      background: var(--av-accent, #2196F3);
      border-color: var(--av-accent, #2196F3);
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }
    .preparing-spinner-halo {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .preparing-spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(33, 150, 243, 0.2);
      border-top-color: var(--av-accent, #2196F3);
      border-radius: 50%;
      animation: prepSpin 0.75s linear infinite;
    }
    @keyframes prepSpin {
      to { transform: rotate(360deg); }
    }
    .upload-progress-circle-box {
      position: relative;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .preview-circular-svg {
      width: 64px;
      height: 64px;
      transform: rotate(-90deg);
    }
    .preview-circular-svg .circle-bg {
      fill: none;
      stroke: var(--av-border, rgba(255, 255, 255, 0.15));
      stroke-width: 3.5;
    }
    .preview-circular-svg .circle-fill {
      fill: none;
      stroke: var(--av-accent, #2196F3);
      stroke-width: 3.5;
      stroke-linecap: round;
      transition: stroke-dasharray 0.2s ease;
    }
    .preview-progress-percent {
      position: absolute;
      font-size: 14px;
      font-weight: 700;
      color: var(--av-text-primary);
      font-family: var(--av-font-mono, monospace);
    }
    .in-progress-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--av-text-primary);
    }
    .in-progress-filename {
      font-size: 13px;
      font-weight: 600;
      color: var(--av-accent, #2196F3);
      font-family: var(--av-font-mono, monospace);
      word-break: break-all;
    }
    .in-progress-sub {
      font-size: 12px;
      color: var(--av-text-muted);
    }
    .in-progress-hint {
      font-size: 11.5px;
      color: var(--av-text-faint);
      margin-top: 4px;
      line-height: 1.5;
      max-width: 380px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultFilePreviewComponent {
  private sanitizer = inject(DomSanitizer);
  private storageService = inject(AirVaultStorageService);
  uiStore = inject(AirVaultUIStore);

  @ViewChild('audioElementRef') audioElementRef?: ElementRef<HTMLAudioElement>;

  item = input.required<AirVaultItem>();
  zoomLevel = input<number>(1.0);
  isWrapped = input<boolean>(true);

  playingChange = output<boolean>();
  mutedChange = output<boolean>();

  resolvedObjectUrl = signal<string | null>(null);
  isLoadingPayload = signal<boolean>(false);
  isPreparingFile = signal<boolean>(false);
  mediaLoadError = signal<boolean>(false);
  private activePayloadObjectUrl: string | null = null;
  private preparingTimer: any = null;

  searchHighlightQuery = computed(() => this.uiStore.searchHighlightQuery());

  activeMatchIndex = computed(() => this.uiStore.activeMatchIndex());

  getHighlightParts(text: string, query: string): { text: string; isMatch: boolean; isCurrent: boolean }[] {
    if (!text) return [];
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false, isCurrent: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`(\\b${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b)`, 'gi');
    } else {
      pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
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

  maxPreviewRows = 100;
  displayedCsvLimit = signal<number>(100);
  private rawCsvLines: string[] = [];
  csvHeaders = signal<string[]>([]);
  csvRows = signal<string[][]>([]);
  totalCsvRows = signal<number>(0);

  renderedTextLength = signal<number>(50000);

  zipEntries = signal<ArchiveFileEntry[]>([]);
  fontFamilyName = signal<string>('inherit');
  pdfBlobUrl = signal<string>('');

  resolvedMediaStreamUrl = computed<string | null>(() => {
    const it = this.item();
    const cat = this.resolvedCategory();
    if (cat === 'audio' || cat === 'pdf') {
      if (it.id && !it.id.startsWith('local_')) {
        return getAirVaultApiUrl(`/api/v1/airvault/clipboards/default/files/${it.id}/raw`);
      }
    }
    return null;
  });

  safePdfUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.pdfBlobUrl();
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  togglePlay() {
    const a = this.audioElementRef?.nativeElement;
    if (a) {
      if (a.paused) a.play();
      else a.pause();
    }
  }

  toggleMute() {
    const a = this.audioElementRef?.nativeElement;
    if (a) {
      a.muted = !a.muted;
      this.mutedChange.emit(a.muted);
    }
  }

  onVolumeChange() {
    const a = this.audioElementRef?.nativeElement;
    const muted = a ? a.muted : false;
    this.mutedChange.emit(muted);
  }

  onMediaPlay(type: 'audio') {
    this.playingChange.emit(true);
    const streamUrl = this.resolvedMediaStreamUrl() || this.resolvedObjectUrl();
    AirVaultLogger.info(`[AirVault Stream] 🎬 Progressive playback started for ${type}: "${this.item().content.filename || 'media'}" | Stream: ${streamUrl}`);
  }

  onMediaLoadedMetadata(event: Event, type: 'audio') {
    const el = event.target as HTMLMediaElement;
    if (el) {
      AirVaultLogger.info(`[AirVault Stream] ⚡ [METADATA_LOADED] ${type}: "${this.item().content.filename || 'media'}" | Duration: ${el.duration?.toFixed(1)}s | State: ready`);
    }
  }

  onMediaProgress(event: Event, type: 'audio') {
    const el = event.target as HTMLMediaElement;
    if (el && el.buffered.length > 0) {
      const end = el.buffered.end(el.buffered.length - 1);
      const total = el.duration || 0;
      const pct = total > 0 ? ((end / total) * 100).toFixed(0) : '0';
      AirVaultLogger.debug(`[AirVault Stream] 📦 [CHUNK_BUFFERED] ${type} range: 0s - ${end.toFixed(1)}s (${pct}%)`);
    }
  }

  resolvedCategory = computed(() => {
    const it = this.item();
    const filename = (it.content.filename || '').toLowerCase();
    const raw = it.content.previewUrl || it.content.raw || '';
    const explicitCat = it.content.category;

    // Image
    if (explicitCat === 'image' || raw.startsWith('data:image/') || /\.(jpe?g|png|webp|gif|svg|heic|bmp|ico)$/i.test(filename)) {
      return 'image';
    }
    // Video
    if (explicitCat === 'video' || raw.startsWith('data:video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename)) {
      return 'video';
    }
    // Audio
    if (explicitCat === 'audio' || raw.startsWith('data:audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(filename)) {
      return 'audio';
    }
    // PDF
    if (explicitCat === 'pdf' || raw.startsWith('data:application/pdf') || filename.endsWith('.pdf')) {
      return 'pdf';
    }
    // Spreadsheet
    if (explicitCat === 'spreadsheet' || /\.(csv|tsv|xlsx|xls)$/i.test(filename)) {
      return 'spreadsheet';
    }
    // Archive
    if (explicitCat === 'archive' || /\.(zip|rar|7z|tar|gz|bz2)$/i.test(filename) || raw.startsWith('data:application/zip')) {
      return 'archive';
    }
    // Font
    if (explicitCat === 'font' || /\.(ttf|otf|woff|woff2)$/i.test(filename)) {
      return 'font';
    }
    // Markdown (.md or explicit markdown category)
    if (explicitCat === 'markdown' || /\.(md|markdown)$/i.test(filename)) {
      return 'markdown';
    }
    // Code / JSON
    if (explicitCat === 'code' || explicitCat === 'json' || /\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml|sql|sh|yaml|yml|rs|go|php)$/i.test(filename)) {
      return explicitCat === 'json' ? 'json' : 'code';
    }
    // URL
    if (explicitCat === 'url' || /^https?:\/\//i.test(raw)) {
      return 'url';
    }
    return explicitCat || 'file';
  });

  textPreview = computed(() => {
    const raw = this.item().content.raw || '';
    const limit = this.renderedTextLength();
    if (raw.length > limit) {
      return raw.slice(0, limit);
    }
    return raw;
  });

  hasMoreText = computed(() => {
    const raw = this.item().content.raw || '';
    return raw.length > this.renderedTextLength();
  });

  totalTextLength = computed(() => (this.item().content.raw || '').length);

  loadMoreText() {
    this.renderedTextLength.update(l => l + 50000);
  }

  loadAllText() {
    this.renderedTextLength.set(this.totalTextLength());
  }

  onTextScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 150) {
      if (this.hasMoreText()) {
        this.loadMoreText();
      }
    }
  }

  safeFormattedTextPreview = computed<SafeHtml>(() => {
    const raw = this.textPreview();
    if (!raw) return '';
    const cat = this.resolvedCategory();
    const q = this.searchHighlightQuery();
    const activeIdx = this.activeMatchIndex();
    let safeHtml: string;
    if (cat === 'markdown' || cat === 'text' || isHtmlContent(raw) || looksLikeMarkdown(raw) || this.isTextDoc()) {
      safeHtml = renderMarkdownToSafeHtml(raw, false, q, activeIdx);
    } else {
      safeHtml = renderPlainTextToSafeHtml(raw, q, activeIdx);
    }
    return this.sanitizer.bypassSecurityTrustHtml(safeHtml);
  });

  constructor() {
    effect(() => {
      const it = this.item();
      const cat = this.resolvedCategory();
      const filename = (it.content.filename || '').toLowerCase();
      const directRaw = it.content.raw || '';

      // Reset media load error on item change
      this.mediaLoadError.set(false);

      // Check LRU cache first synchronously for instantaneous full-resolution display
      const cached = this.storageService.resourceCache.get(it.id);
      if (cached?.objectUrl) {
        this.resolvedObjectUrl.set(cached.objectUrl);
        if (cat === 'spreadsheet' && this.isCsvFormat()) {
          cached.blob.text().then(t => this.parseCsv(t)).catch(() => this.parseCsv(directRaw));
        } else if (cat === 'archive' && this.isZipArchive()) {
          cached.blob.arrayBuffer().then(buf => this.parseZipBuffer(buf)).catch(() => this.parseZip(directRaw));
        } else if (cat === 'font') {
          this.loadDynamicFont(cached.objectUrl, filename);
        } else if (cat === 'pdf') {
          this.pdfBlobUrl.set(cached.objectUrl);
        }
      } else if (directRaw.startsWith('blob:') || (directRaw.startsWith('data:') && !directRaw.startsWith('data:image/jpeg;base64'))) {
        // Direct raw is already a high-fidelity data/blob URL
        this.resolvedObjectUrl.set(directRaw);
        if (cat === 'spreadsheet' && this.isCsvFormat()) {
          this.parseCsv(directRaw);
        } else if (cat === 'archive' && this.isZipArchive()) {
          this.parseZip(directRaw);
        } else if (cat === 'font') {
          this.loadDynamicFont(directRaw, filename);
        } else if (cat === 'pdf') {
          this.loadPdfBlob(directRaw);
        }
      } else {
        // For audio, if we have a resolved media streaming endpoint URL,
        // we allow the browser's native <audio> element to stream progressively with Range requests.
        // We do NOT eagerly fetch the entire 100MB+ binary file into memory as a Blob!
        if (cat === 'audio' && this.resolvedMediaStreamUrl()) {
          this.isLoadingPayload.set(false);
          this.isPreparingFile.set(false);
          return;
        }

        // Asynchronously fetch full original binary from IndexedDB or backend stream for non-streamed items (images, PDFs, spreadsheets, archives, fonts)
        this.isLoadingPayload.set(true);
        if (this.preparingTimer) clearTimeout(this.preparingTimer);
        // Only show "Preparing your file…" if retrieval/decompression takes longer than 400ms
        this.preparingTimer = setTimeout(() => {
          if (this.isLoadingPayload()) {
            this.isPreparingFile.set(true);
          }
        }, 400);

        this.storageService.fetchResourcePayload(it).then(res => {
          this.isLoadingPayload.set(false);
          this.isPreparingFile.set(false);
          if (this.preparingTimer) clearTimeout(this.preparingTimer);

          if (res?.objectUrl && res?.blob) {
            this.activePayloadObjectUrl = res.objectUrl;
            this.resolvedObjectUrl.set(res.objectUrl);
            if (cat === 'spreadsheet' && this.isCsvFormat()) {
              res.blob.text().then(t => this.parseCsv(t)).catch(() => this.parseCsv(directRaw));
            } else if (cat === 'archive' && this.isZipArchive()) {
              res.blob.arrayBuffer().then(buf => this.parseZipBuffer(buf)).catch(() => this.parseZip(directRaw));
            } else if (cat === 'font') {
              this.loadDynamicFont(res.objectUrl, filename);
            } else if (cat === 'pdf') {
              this.pdfBlobUrl.set(res.objectUrl);
            }
          } else {
            // Fallback to existing raw / previewUrl
            const fallback = it.content.previewUrl || it.content.raw || '';
            if (!fallback) {
              this.mediaLoadError.set(true);
            }
            this.resolvedObjectUrl.set(fallback || null);
            if (cat === 'spreadsheet' && this.isCsvFormat()) this.parseCsv(fallback);
            if (cat === 'archive' && this.isZipArchive()) this.parseZip(fallback);
            if (cat === 'font' && fallback.startsWith('data:')) this.loadDynamicFont(fallback, filename);
            if (cat === 'pdf') this.loadPdfBlob(fallback);
          }
        }).catch(() => {
          this.isLoadingPayload.set(false);
          this.isPreparingFile.set(false);
          if (this.preparingTimer) clearTimeout(this.preparingTimer);

          const fallback = it.content.previewUrl || it.content.raw || '';
          if (!fallback) {
            this.mediaLoadError.set(true);
          }
          this.resolvedObjectUrl.set(fallback || null);
        });
      }
    });
  }

  isCsvFormat(): boolean {
    const filename = (this.item().content.filename || '').toLowerCase();
    return filename.endsWith('.csv') || filename.endsWith('.tsv') || (!filename && this.item().content.category === 'spreadsheet');
  }

  isZipArchive(): boolean {
    const filename = (this.item().content.filename || '').toLowerCase();
    const raw = this.item().content.previewUrl || this.item().content.raw || '';
    return filename.endsWith('.zip') || raw.startsWith('data:application/zip');
  }

  isTextDoc(): boolean {
    const filename = (this.item().content.filename || '').toLowerCase();
    const cat = this.resolvedCategory();
    const raw = this.item().content.raw || '';
    if (/\.(docx?|xlsx?|pptx?|pdf|zip|rar|7z|tar|gz|psd|ai|fig|sketch|xd|epub|mobi|ttf|otf|woff2?|mp3|wav|mp4|mov)$/i.test(filename)) {
      return false;
    }
    if (cat === 'file' && (raw.startsWith('data:') || raw.startsWith('[Encrypted') || raw.length === 0)) {
      return false;
    }
    return /\.(txt|rtf|md|log|cfg|ini|env|csv|json|js|ts|html|css|py|sh)$/i.test(filename) || (!raw.startsWith('data:') && !raw.startsWith('[Encrypted'));
  }

  loadMoreCsvRows() {
    const limit = this.displayedCsvLimit();
    const nextLimit = Math.min(this.rawCsvLines.length, limit + 100);
    this.displayedCsvLimit.set(nextLimit);
    const rows: string[][] = [];
    for (let i = 1; i < nextLimit; i++) {
      rows.push(this.parseCsvLine(this.rawCsvLines[i]));
    }
    this.csvRows.set(rows);
  }

  loadAllCsvRows() {
    this.displayedCsvLimit.set(this.rawCsvLines.length);
    const rows: string[][] = [];
    for (let i = 1; i < this.rawCsvLines.length; i++) {
      rows.push(this.parseCsvLine(this.rawCsvLines[i]));
    }
    this.csvRows.set(rows);
  }

  onCsvScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
      if (this.displayedCsvLimit() < this.rawCsvLines.length) {
        this.loadMoreCsvRows();
      }
    }
  }

  private parseCsv(content: string) {
    if (!content) return;
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    this.rawCsvLines = lines;
    this.totalCsvRows.set(lines.length > 0 ? lines.length - 1 : 0);
    if (lines.length > 0) {
      const headerLine = lines[0];
      const headers = this.parseCsvLine(headerLine);
      this.csvHeaders.set(headers);

      const previewLimit = Math.min(lines.length, this.displayedCsvLimit());
      const rows: string[][] = [];
      for (let i = 1; i < previewLimit; i++) {
        rows.push(this.parseCsvLine(lines[i]));
      }
      this.csvRows.set(rows);
    }
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    const delimiter = line.includes('\t') ? '\t' : ',';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  private async parseZip(raw: string) {
    if (!raw.startsWith('data:')) return;
    try {
      const parts = raw.split(',');
      const bstr = atob(parts[1]);
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      const zip = await JSZip.loadAsync(u8arr);
      const entries: ArchiveFileEntry[] = [];
      zip.forEach((relativePath, file) => {
        entries.push({
          name: relativePath,
          size: (file as any)._data?.uncompressedSize || 0,
          dir: file.dir
        });
      });
      this.zipEntries.set(entries);
    } catch {
      this.zipEntries.set([]);
    }
  }

  private loadDynamicFont(dataUri: string, filename: string) {
    try {
      const fontName = `AirVaultPreviewFont_${Date.now()}`;
      const fontFace = new FontFace(fontName, `url(${dataUri})`);
      fontFace.load().then(loadedFace => {
        (document.fonts as any).add(loadedFace);
        this.fontFamilyName.set(`"${fontName}", sans-serif`);
      }).catch(() => {
        this.fontFamilyName.set('sans-serif');
      });
    } catch {
      this.fontFamilyName.set('sans-serif');
    }
  }

  private loadPdfBlob(raw: string) {
    if (raw.startsWith('data:')) {
      try {
        const parts = raw.split(',');
        const bstr = atob(parts[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const blob = new Blob([u8arr], { type: 'application/pdf' });
        this.pdfBlobUrl.set(URL.createObjectURL(blob));
      } catch {
        this.pdfBlobUrl.set(raw);
      }
    } else if (raw.startsWith('blob:') || raw.startsWith('http')) {
      this.pdfBlobUrl.set(raw);
    } else {
      try {
        const blob = new Blob([raw], { type: 'application/pdf' });
        this.pdfBlobUrl.set(URL.createObjectURL(blob));
      } catch {
        this.pdfBlobUrl.set(raw);
      }
    }
  }

  private async parseZipBuffer(buffer: ArrayBuffer) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const entries: ArchiveFileEntry[] = [];
      zip.forEach((relativePath, file) => {
        entries.push({
          name: relativePath,
          size: (file as any)._data?.uncompressedSize || 0,
          dir: file.dir
        });
      });
      this.zipEntries.set(entries);
    } catch {
      this.zipEntries.set([]);
    }
  }

  onMediaError(event?: Event) {
    const it = this.item();
    const streamUrl = this.resolvedMediaStreamUrl();
    const objectUrl = this.resolvedObjectUrl();
    const audioEl = this.audioElementRef?.nativeElement;
    const mediaErr = audioEl?.error;

    // Ignore user seek / abort errors (code 1 = MEDIA_ERR_ABORTED)
    if (mediaErr && mediaErr.code === 1) {
      console.debug('[AirVault Preview] ℹ️ Media request aborted (user seeked or switched stream)');
      return;
    }

    console.error('[AirVault Preview] ❌ Media load error occurred for item:', {
      id: it.id,
      filename: it.content.filename,
      category: it.content.category,
      resolvedCategory: this.resolvedCategory(),
      streamUrl: streamUrl,
      objectUrl: objectUrl,
      rawPrefix: it.content.raw ? it.content.raw.substring(0, 50) + '...' : null,
      previewUrl: it.content.previewUrl,
      mediaErrorCode: mediaErr ? mediaErr.code : null, // 1: MEDIA_ERR_ABORTED, 2: MEDIA_ERR_NETWORK, 3: MEDIA_ERR_DECODE, 4: MEDIA_ERR_SRC_NOT_SUPPORTED
      mediaErrorMessage: mediaErr ? mediaErr.message : null,
      domEvent: event
    });
    this.mediaLoadError.set(true);
  }

  retryLoad() {
    const it = this.item();
    console.log('[AirVault Preview] 🔄 Retrying load for item:', it.id, it.content.filename);
    this.mediaLoadError.set(false);
    this.isLoadingPayload.set(true);
    if (this.preparingTimer) clearTimeout(this.preparingTimer);
    this.preparingTimer = setTimeout(() => {
      if (this.isLoadingPayload()) {
        this.isPreparingFile.set(true);
      }
    }, 400);

    this.storageService.fetchResourcePayload(it).then(res => {
      this.isLoadingPayload.set(false);
      this.isPreparingFile.set(false);
      if (this.preparingTimer) clearTimeout(this.preparingTimer);

      if (res?.objectUrl && res?.blob) {
        this.activePayloadObjectUrl = res.objectUrl;
        this.resolvedObjectUrl.set(res.objectUrl);
      } else {
        const fallback = it.content.previewUrl || it.content.raw || '';
        if (!fallback) {
          this.mediaLoadError.set(true);
        } else {
          this.resolvedObjectUrl.set(fallback);
        }
      }
    }).catch(() => {
      this.isLoadingPayload.set(false);
      this.isPreparingFile.set(false);
      if (this.preparingTimer) clearTimeout(this.preparingTimer);
      this.mediaLoadError.set(true);
    });
  }

  getCategoryIcon(): string {
    const filename = (this.item().content.filename || '').toLowerCase();
    if (/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename)) return 'film';
    if (/\.(doc|docx|pages)$/i.test(filename)) return 'file-text';
    if (/\.(ppt|pptx|key)$/i.test(filename)) return 'presentation';
    if (/\.(psd|ai|fig|sketch|xd)$/i.test(filename)) return 'palette';
    if (/\.(epub|mobi)$/i.test(filename)) return 'book-open';
    if (/\.(ttf|otf|woff|woff2)$/i.test(filename)) return 'type';
    return 'file';
  }

  getCategoryColor(): string {
    const filename = (this.item().content.filename || '').toLowerCase();
    if (/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename)) return '#F43F5E';
    if (/\.(doc|docx)$/i.test(filename)) return '#2563EB';
    if (/\.(ppt|pptx)$/i.test(filename)) return '#EA580C';
    if (/\.(psd|ai|fig|sketch|xd)$/i.test(filename)) return '#EC4899';
    if (/\.(epub|mobi)$/i.test(filename)) return '#8B5CF6';
    if (/\.(ttf|otf|woff|woff2)$/i.test(filename)) return '#6366F1';
    return 'var(--av-text-muted)';
  }

  getCategoryLabel(): string {
    const filename = (this.item().content.filename || '').toLowerCase();
    if (/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(filename)) return 'Video Resource';
    if (/\.(doc|docx)$/i.test(filename)) return 'Word Document';
    if (/\.(ppt|pptx)$/i.test(filename)) return 'Presentation';
    if (/\.(psd|ai|fig|sketch|xd)$/i.test(filename)) return 'Design Document';
    if (/\.(epub|mobi)$/i.test(filename)) return 'E-Book Package';
    if (/\.(ttf|otf|woff|woff2)$/i.test(filename)) return 'Typeface Font';
    return 'Binary Document';
  }

  formatBytes(b: number): string {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  ngOnDestroy() {
    // Note: Do NOT revoke activePayloadObjectUrl here as it may be managed and shared across
    // modal sessions by AirVaultResourceCacheService. Revocation is handled strictly on cache eviction or resource deletion.
    if (this.preparingTimer) {
      clearTimeout(this.preparingTimer);
      this.preparingTimer = null;
    }
  }
}
