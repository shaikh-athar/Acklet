import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, inject, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { AirVaultItem } from '../services/airvault-storage.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
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
      <!-- 1. IMAGES (JPG, PNG, WEBP, GIF, SVG, HEIC) -->
      @if (resolvedCategory() === 'image') {
        <div class="preview-stage-container image-stage">
          <img [src]="item().content.previewUrl || item().content.raw" 
               [alt]="item().content.filename || 'Image preview'" 
               class="stage-img" 
               [style.transform]="'scale(' + zoomLevel() + ')'" 
               (error)="onMediaError()" />
        </div>
      }

      <!-- 2. VIDEOS (MP4, WEBM, MOV, MKV) -->
      @else if (resolvedCategory() === 'video') {
        <div class="preview-stage-container video-stage">
          <video #videoElementRef 
                 [src]="item().content.previewUrl || item().content.raw" 
                 controls autoplay 
                 class="stage-video" 
                 [style.transform]="'scale(' + zoomLevel() + ')'"
                 (play)="playingChange.emit(true)"
                 (pause)="playingChange.emit(false)"
                 (volumechange)="onVolumeChange()"
                 (error)="onMediaError()">
            Your browser does not support the video tag.
          </video>
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
              <span class="audio-meta">{{ formatBytes(item().content.byteSize) }} · Audio file</span>
            </div>
            <audio #audioElementRef 
                   [src]="item().content.previewUrl || item().content.raw" 
                   controls 
                   class="native-audio-player"
                   (play)="playingChange.emit(true)"
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
            <div class="spreadsheet-table-wrapper" [style.font-size.px]="13 * zoomLevel()">
              <table class="spreadsheet-grid">
                <thead>
                  <tr>
                    <th class="row-num-th">#</th>
                    @for (col of csvHeaders(); track $index) {
                      <th>{{ col }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of csvRows(); track $index) {
                    <tr>
                      <td class="row-num-td">{{ $index + 1 }}</td>
                      @for (cell of row; track $index) {
                        <td>@for (part of getHighlightParts(cell, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
              @if (totalCsvRows() > maxPreviewRows) {
                <div class="spreadsheet-footer-notice">
                  Showing first {{ maxPreviewRows }} rows of {{ totalCsvRows() }} total rows. Download to view complete spreadsheet.
                </div>
              }
            </div>
          } @else {
            <div class="generic-meta-card" [style.transform]="'scale(' + zoomLevel() + ')'">
              <div class="meta-icon-box excel-accent"><app-icon name="table" class="icon-lg"></app-icon></div>
              <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Spreadsheet', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
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
                    <span class="entry-name">@for (part of getHighlightParts(entry.name, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
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
              <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Compressed Archive', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
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
              <span class="specimen-name">@for (part of getHighlightParts(item().content.filename || 'Typography Specimen', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
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

      <!-- 8. CODE & JSON -->
      @else if (resolvedCategory() === 'code' || resolvedCategory() === 'json') {
        <div class="preview-stage-container code-stage">
          <pre class="stage-code-pre" [class.nowrap-pre]="!isWrapped()" [style.font-size.px]="13 * zoomLevel()"><code>@for (part of getHighlightParts(textPreview(), searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</code></pre>
        </div>
      }

      <!-- 9. URL -->
      @else if (resolvedCategory() === 'url') {
        <div class="preview-stage-container url-stage center-flex" [style.transform]="'scale(' + zoomLevel() + ')'">
          <div class="url-card">
            <app-icon name="link" class="icon-lg url-icon"></app-icon>
            <a [href]="item().content.raw" target="_blank" rel="noopener noreferrer" class="url-text">@for (part of getHighlightParts(item().content.raw, searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</a>
            <a [href]="item().content.raw" target="_blank" rel="noopener noreferrer" class="av-btn-primary url-btn">
              <span>Open in New Tab</span>
              <app-icon name="external-link" class="icon-xs"></app-icon>
            </a>
          </div>
        </div>
      }

      <!-- 10. GENERIC METADATA / UNSUPPORTED / DESIGN / EBOOK / DOCS -->
      @else {
        <div class="preview-stage-container generic-stage" [class.center-flex]="!isTextDoc()">
          @if (isTextDoc()) {
            <pre class="stage-text-pre" [class.nowrap-pre]="!isWrapped()" [style.font-size.px]="14 * zoomLevel()">@for (part of getHighlightParts(textPreview(), searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</pre>
          } @else {
            <div class="generic-meta-card" [style.transform]="'scale(' + zoomLevel() + ')'">
              <div class="meta-icon-box" [style.color]="getCategoryColor()"><app-icon [name]="getCategoryIcon()" class="icon-lg"></app-icon></div>
              <span class="meta-file-title">@for (part of getHighlightParts(item().content.filename || 'Attached File', searchHighlightQuery()); track $index) {@if (part.isMatch) {<mark class="av-search-match">{{ part.text }}</mark>} @else {{{ part.text }}}}</span>
              <span class="meta-file-details">{{ formatBytes(item().content.byteSize) }} · {{ getCategoryLabel() }}</span>
              <p class="meta-desc">Encrypted zero-knowledge file. Ready to download with full binary fidelity.</p>
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

    /* Videos */
    .video-stage { background: var(--av-bg-canvas, #09090b); }
    .stage-video { max-width: 100%; max-height: 72vh; border-radius: 6px; outline: none; }

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
    .meta-file-title { font-size: 16px; font-weight: 600; color: var(--av-text-primary); word-break: break-all; }
    .meta-file-details { font-size: 12.5px; color: var(--av-text-muted); }
    .meta-desc { font-size: 12px; color: var(--av-text-faint); margin-top: 4px; line-height: 1.4; }

    /* URL */
    .url-stage { background: var(--av-surface-primary); }
    .url-card { display: flex; flex-direction: column; align-items: center; gap: 16px; max-width: 580px; text-align: center; margin: 0 auto; }
    .url-icon { color: #3B82F6; }
    .url-text { font-size: 16px; font-weight: 500; color: #3B82F6; word-break: break-all; text-decoration: underline; }
    .url-btn { display: inline-flex; align-items: center; gap: 6px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultFilePreviewComponent {
  private sanitizer = inject(DomSanitizer);
  uiStore = inject(AirVaultUIStore);

  @ViewChild('videoElementRef') videoElementRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('audioElementRef') audioElementRef?: ElementRef<HTMLAudioElement>;

  item = input.required<AirVaultItem>();
  zoomLevel = input<number>(1.0);
  isWrapped = input<boolean>(true);

  playingChange = output<boolean>();
  mutedChange = output<boolean>();

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

  maxPreviewRows = 100;
  csvHeaders = signal<string[]>([]);
  csvRows = signal<string[][]>([]);
  totalCsvRows = signal<number>(0);

  zipEntries = signal<ArchiveFileEntry[]>([]);
  fontFamilyName = signal<string>('inherit');
  pdfBlobUrl = signal<string>('');

  safePdfUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.pdfBlobUrl();
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  togglePlay() {
    const v = this.videoElementRef?.nativeElement;
    const a = this.audioElementRef?.nativeElement;
    if (v) {
      if (v.paused) v.play();
      else v.pause();
    } else if (a) {
      if (a.paused) a.play();
      else a.pause();
    }
  }

  toggleMute() {
    const v = this.videoElementRef?.nativeElement;
    const a = this.audioElementRef?.nativeElement;
    if (v) {
      v.muted = !v.muted;
      this.mutedChange.emit(v.muted);
    } else if (a) {
      a.muted = !a.muted;
      this.mutedChange.emit(a.muted);
    }
  }

  toggleFullscreen() {
    const v = this.videoElementRef?.nativeElement;
    if (v) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        v.requestFullscreen().catch(() => {});
      }
    }
  }

  onVolumeChange() {
    const v = this.videoElementRef?.nativeElement;
    const a = this.audioElementRef?.nativeElement;
    const muted = v ? v.muted : (a ? a.muted : false);
    this.mutedChange.emit(muted);
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
    if (raw.length > 50000) {
      return raw.slice(0, 50000) + `\n\n… [Showing first 50,000 of ${raw.length.toLocaleString()} characters]`;
    }
    return raw;
  });

  constructor() {
    effect(() => {
      const it = this.item();
      const cat = this.resolvedCategory();
      const raw = it.content.previewUrl || it.content.raw || '';
      const filename = (it.content.filename || '').toLowerCase();

      // Parse CSV if spreadsheet
      if (cat === 'spreadsheet' && this.isCsvFormat()) {
        this.parseCsv(raw);
      }

      // Parse ZIP archive table of contents if ZIP
      if (cat === 'archive' && this.isZipArchive()) {
        this.parseZip(raw);
      }

      // Safe Font Face specimen
      if (cat === 'font' && raw.startsWith('data:')) {
        this.loadDynamicFont(raw, filename);
      }

      // PDF Blob URL
      if (cat === 'pdf') {
        this.loadPdfBlob(raw);
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

  private parseCsv(content: string) {
    if (!content) return;
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    this.totalCsvRows.set(lines.length);
    if (lines.length > 0) {
      const headerLine = lines[0];
      const headers = this.parseCsvLine(headerLine);
      this.csvHeaders.set(headers);

      const rows: string[][] = [];
      const previewLimit = Math.min(lines.length, this.maxPreviewRows + 1);
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

  onMediaError() {
    // Fallback if browser codec unsupported
  }

  getCategoryIcon(): string {
    const filename = (this.item().content.filename || '').toLowerCase();
    if (/\.(doc|docx|pages)$/i.test(filename)) return 'file-text';
    if (/\.(ppt|pptx|key)$/i.test(filename)) return 'presentation';
    if (/\.(psd|ai|fig|sketch|xd)$/i.test(filename)) return 'palette';
    if (/\.(epub|mobi)$/i.test(filename)) return 'book-open';
    if (/\.(ttf|otf|woff|woff2)$/i.test(filename)) return 'type';
    return 'file';
  }

  getCategoryColor(): string {
    const filename = (this.item().content.filename || '').toLowerCase();
    if (/\.(doc|docx)$/i.test(filename)) return '#2563EB';
    if (/\.(ppt|pptx)$/i.test(filename)) return '#EA580C';
    if (/\.(psd|ai|fig|sketch|xd)$/i.test(filename)) return '#EC4899';
    if (/\.(epub|mobi)$/i.test(filename)) return '#8B5CF6';
    if (/\.(ttf|otf|woff|woff2)$/i.test(filename)) return '#6366F1';
    return 'var(--av-text-muted)';
  }

  getCategoryLabel(): string {
    const filename = (this.item().content.filename || '').toLowerCase();
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
    const url = this.pdfBlobUrl();
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }
}
