// client/apps/tool-docs/src/app/components/doc-block-renderer/doc-block-renderer.component.ts

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { DocBlock, MediaLayout, BlockTextFormat } from '../../models/doc.model';

@Component({
  selector: 'app-doc-block-renderer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="docs-blocks-container" [class.docs-blocks-container--interactive]="interactive">
      @for (block of blocks; track block.id; let idx = $index) {
        <div
          class="docs-block-wrapper"
          [attr.data-block-id]="block.id"
          [attr.data-block-type]="block.type"
          [class.docs-block-wrapper--clickable]="interactive"
          (click)="onBlockClick(block.id, $event)"
        >
          <!-- ── HEADING 1 ─────────────────────────────────────────────── -->
          @if (block.type === 'heading1') {
            <h2 class="docs-block__heading1">{{ block.text }}</h2>
          }

          <!-- ── HEADING 2 ─────────────────────────────────────────────── -->
          @else if (block.type === 'heading2') {
            <h3 class="docs-block__heading2">{{ block.text }}</h3>
          }

          <!-- ── HEADING 3 ─────────────────────────────────────────────── -->
          @else if (block.type === 'heading3') {
            <h4 class="docs-block__heading3">{{ block.text }}</h4>
          }

          <!-- ── PARAGRAPH ─────────────────────────────────────────────── -->
          @else if (block.type === 'paragraph') {
            <p class="docs-block__paragraph" [innerHTML]="formatInline(block.text || '', block.formats)"></p>
          }

          <!-- ── QUOTE ─────────────────────────────────────────────────── -->
          @else if (block.type === 'quote') {
            <blockquote class="docs-block__quote">
              <p [innerHTML]="formatInline(block.text || '', block.formats)"></p>
            </blockquote>
          }

          <!-- ── CHECKLIST ─────────────────────────────────────────────── -->
          @else if (block.type === 'checklist') {
            <ul class="docs-block__checklist">
              @for (item of block.checklistItems || []; track item.id || $index) {
                <li class="docs-block__checklist-item" [class.docs-block__checklist-item--checked]="item.checked">
                  <span class="docs-block__checklist-box" aria-hidden="true">{{ item.checked ? '☑' : '☐' }}</span>
                  <span class="docs-block__checklist-label" [innerHTML]="formatInline(item.text)"></span>
                </li>
              }
            </ul>
          }

          <!-- ── TABLE ─────────────────────────────────────────────────── -->
          @else if (block.type === 'table') {
            <div class="docs-block__table-wrapper">
              <table class="docs-block__table">
                @if (block.tableData?.headerRow && block.tableData?.rows && block.tableData!.rows.length > 0) {
                  <thead>
                    <tr>
                      @for (cell of block.tableData!.rows[0]; track $index) {
                        <th [attr.data-align]="block.tableData?.alignments?.[$index] || 'left'" [innerHTML]="formatInline(cell)"></th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of block.tableData!.rows.slice(1); track $index) {
                      <tr>
                        @for (cell of row; track $index) {
                          <td [attr.data-align]="block.tableData?.alignments?.[$index] || 'left'" [innerHTML]="formatInline(cell)"></td>
                        }
                      </tr>
                    }
                  </tbody>
                } @else {
                  <tbody>
                    @for (row of block.tableData?.rows || []; track $index) {
                      <tr>
                        @for (cell of row; track $index) {
                          <td [attr.data-align]="block.tableData?.alignments?.[$index] || 'left'" [innerHTML]="formatInline(cell)"></td>
                        }
                      </tr>
                    }
                  </tbody>
                }
              </table>
            </div>
          }

          <!-- ── TOGGLE / COLLAPSIBLE ─────────────────────────────────── -->
          @else if (block.type === 'toggle') {
            <details class="docs-block__toggle" [open]="block.toggleOpen">
              <summary class="docs-block__toggle-summary">{{ block.toggleTitle || 'Toggle section' }}</summary>
              <div class="docs-block__toggle-content" [innerHTML]="formatInline(block.text || '')"></div>
            </details>
          }

          <!-- ── FILE ATTACHMENT ───────────────────────────────────────── -->
          @else if (block.type === 'file') {
            <div class="docs-block__file-card">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div class="docs-block__file-info">
                <span class="docs-block__file-name">{{ block.fileName || 'Attachment' }}</span>
                @if (block.fileSize) {
                  <span class="docs-block__file-size">{{ formatFileSize(block.fileSize) }}</span>
                }
              </div>
              @if (block.fileUrl) {
                <a [href]="block.fileUrl" download class="docs-block__file-download" aria-label="Download attachment">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </a>
              }
            </div>
          }

          <!-- ── BULLET LIST ───────────────────────────────────────────── -->
          @else if (block.type === 'bullet_list') {
            <ul class="docs-block__bullet-list">
              @for (item of block.items || []; track $index) {
                <li
                  [attr.data-level]="block.itemLevels?.[$index] || 0"
                  [class.docs-block__list-item--indent-1]="(block.itemLevels?.[$index] || 0) === 1"
                  [class.docs-block__list-item--indent-2]="(block.itemLevels?.[$index] || 0) === 2"
                  [class.docs-block__list-item--indent-3]="(block.itemLevels?.[$index] || 0) === 3"
                  [class.docs-block__list-item--indent-4]="(block.itemLevels?.[$index] || 0) === 4"
                  [class.docs-block__list-item--indent-5]="(block.itemLevels?.[$index] || 0) === 5"
                  [innerHTML]="formatInline(item)"
                ></li>
              }
            </ul>
          }

          <!-- ── NUMBERED LIST ─────────────────────────────────────────── -->
          @else if (block.type === 'numbered_list') {
            <ol class="docs-block__numbered-list">
              @for (item of block.items || []; track $index) {
                <li
                  [attr.data-level]="block.itemLevels?.[$index] || 0"
                  [class.docs-block__list-item--indent-1]="(block.itemLevels?.[$index] || 0) === 1"
                  [class.docs-block__list-item--indent-2]="(block.itemLevels?.[$index] || 0) === 2"
                  [class.docs-block__list-item--indent-3]="(block.itemLevels?.[$index] || 0) === 3"
                  [class.docs-block__list-item--indent-4]="(block.itemLevels?.[$index] || 0) === 4"
                  [class.docs-block__list-item--indent-5]="(block.itemLevels?.[$index] || 0) === 5"
                  [innerHTML]="formatInline(item)"
                ></li>
              }
            </ol>
          }

          <!-- ── CODE BLOCK ────────────────────────────────────────────── -->
          @else if (block.type === 'code') {
            <div class="docs-block__code-box">
              <div class="docs-block__code-header">
                <span class="docs-block__code-lang">{{ block.codeLanguage || 'text' }}</span>
                <button
                  type="button"
                  class="docs-block__code-copy"
                  (click)="copyCode(block.text || '', block.id, $event)"
                  [title]="copiedBlockId() === block.id ? 'Copied to clipboard' : 'Copy code to clipboard'"
                >
                  @if (copiedBlockId() === block.id) {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Copied!</span>
                  } @else {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy</span>
                  }
                </button>
              </div>
              <pre class="docs-block__code-content"><code>{{ block.text }}</code></pre>
            </div>
          }

          <!-- ── DIVIDER ───────────────────────────────────────────────── -->
          @else if (block.type === 'divider') {
            <div class="docs-block__divider-wrap">
              <hr class="docs-block__divider" />
            </div>
          }

          <!-- ── CALLOUT ───────────────────────────────────────────────── -->
          @else if (block.type === 'callout') {
            <div
              class="docs-block__callout"
              [class.docs-block__callout--tip]="block.calloutType === 'tip'"
              [class.docs-block__callout--warning]="block.calloutType === 'warning'"
            >
              <div class="docs-block__callout-icon">
                @if (block.calloutType === 'warning') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                } @else if (block.calloutType === 'tip') {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                }
              </div>
              <div class="docs-block__callout-text" [innerHTML]="formatInline(block.text || '')"></div>
            </div>
          }

          <!-- ── IMAGE ─────────────────────────────────────────────────── -->
          @else if (block.type === 'image') {
            <figure
              class="docs-block__media docs-block__media--image"
              [class.docs-block__media--inset]="!block.layout || block.layout === 'inset'"
              [class.docs-block__media--wide]="block.layout === 'wide'"
              [class.docs-block__media--full]="block.layout === 'full'"
              [class.docs-block__media--twoup]="block.layout === 'two_up'"
              [class.docs-block__media--threeup]="block.layout === 'three_up'"
              [class.docs-block__media--gallery]="block.layout === 'gallery'"
              [class.docs-block__media--align-left]="block.align === 'left'"
              [class.docs-block__media--align-center]="!block.align || block.align === 'center'"
              [class.docs-block__media--align-right]="block.align === 'right'"
            >
              @if (block.layout === 'two_up' || block.layout === 'three_up' || block.layout === 'gallery') {
                <div
                  class="docs-block__gallery-grid"
                  [class.docs-block__gallery-grid--twoup]="block.layout === 'two_up'"
                  [class.docs-block__gallery-grid--threeup]="block.layout === 'three_up'"
                  [class.docs-block__gallery-grid--gallery]="block.layout === 'gallery'"
                >
                  @for (img of (block.images && block.images.length ? block.images : [{ url: block.url || '', alt: block.alt || '', caption: block.caption }]); track $index) {
                    <div class="docs-block__gallery-item">
                      <img
                        [src]="img.url"
                        [alt]="img.alt || 'Story illustration'"
                        loading="lazy"
                        class="docs-block__image-elem"
                        [class.docs-block__image-elem--rot-90]="block.rotation === 90"
                        [class.docs-block__image-elem--rot-180]="block.rotation === 180"
                        [class.docs-block__image-elem--rot-270]="block.rotation === 270"
                      />
                    </div>
                  }
                </div>
              } @else {
                <img
                  [src]="block.url"
                  [alt]="block.alt || 'Story illustration'"
                  loading="lazy"
                  class="docs-block__image-elem"
                  [class.docs-block__image-elem--rot-90]="block.rotation === 90"
                  [class.docs-block__image-elem--rot-180]="block.rotation === 180"
                  [class.docs-block__image-elem--rot-270]="block.rotation === 270"
                />
              }

              @if (block.caption) {
                <figcaption class="docs-block__caption">{{ block.caption }}</figcaption>
              }
            </figure>
          }

          <!-- ── VIDEO ─────────────────────────────────────────────────── -->
          @else if (block.type === 'video') {
            <figure
              class="docs-block__media docs-block__media--video"
              [class.docs-block__media--inset]="!block.layout || block.layout === 'inset'"
              [class.docs-block__media--wide]="block.layout === 'wide'"
              [class.docs-block__media--full]="block.layout === 'full'"
              [class.docs-block__media--align-left]="block.align === 'left'"
              [class.docs-block__media--align-center]="!block.align || block.align === 'center'"
              [class.docs-block__media--align-right]="block.align === 'right'"
            >
              @if (block.embedType === 'youtube' || block.embedType === 'vimeo') {
                <div class="docs-block__video-embed-box">
                  <iframe
                    [src]="getEmbedUrl(block)"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    loading="lazy"
                    frameborder="0"
                    allowfullscreen
                    class="docs-block__video-iframe"
                  ></iframe>
                </div>
              } @else {
                <video
                  [src]="block.url"
                  [poster]="block.posterUrl || null"
                  controls
                  preload="metadata"
                  playsinline
                  class="docs-block__video-elem"
                ></video>
              }

              @if (block.caption) {
                <figcaption class="docs-block__caption">{{ block.caption }}</figcaption>
              }
            </figure>
          }
        </div>
      }
    </article>
  `
})
export class DocBlockRendererComponent {
  @Input() blocks: DocBlock[] = [];
  @Input() interactive: boolean = false;
  @Output() blockClick = new EventEmitter<{ blockId: string; offset?: number }>();

  readonly copiedBlockId = signal<string | null>(null);

  constructor(private sanitizer: DomSanitizer) {}

  onBlockClick(blockId: string, event: MouseEvent): void {
    if (!this.interactive) return;
    this.blockClick.emit({ blockId });
  }

  copyCode(code: string, blockId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copiedBlockId.set(blockId);
      setTimeout(() => {
        if (this.copiedBlockId() === blockId) {
          this.copiedBlockId.set(null);
        }
      }, 2000);
    }).catch(() => {});
  }

  formatInline(text: string, formats?: BlockTextFormat[]): SafeHtml {
    if (!text) return '';

    // If explicit clean formats exist on block, render with tags without raw markers
    if (formats && formats.length > 0) {
      // Sort formats by start descending so insertions don't invalidate prior indices
      const sorted = [...formats].sort((a, b) => b.start - a.start);
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      for (const fmt of sorted) {
        if (fmt.start >= 0 && fmt.end <= text.length && fmt.start < fmt.end) {
          const before = html.slice(0, fmt.start);
          const inner = html.slice(fmt.start, fmt.end);
          const after = html.slice(fmt.end);
          let wrapped = inner;
          switch (fmt.type) {
            case 'bold': wrapped = `<strong>${inner}</strong>`; break;
            case 'italic': wrapped = `<em>${inner}</em>`; break;
            case 'code': wrapped = `<code class="docs-inline-code">${inner}</code>`; break;
            case 'underline': wrapped = `<u>${inner}</u>`; break;
            case 'strikethrough': wrapped = `<s>${inner}</s>`; break;
            case 'highlight': wrapped = `<mark class="docs-highlight">${inner}</mark>`; break;
            case 'link': wrapped = `<a href="${fmt.url || '#'}" target="_blank" rel="noopener noreferrer" class="docs-story-link">${inner}</a>`; break;
          }
          html = before + wrapped + after;
        }
      }
      return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    // HTML escape first
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 1. Inline Code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="docs-inline-code">$1</code>');

    // 2. Bold: **bold**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 3. Italic: *italic* or _italic_
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');

    // 4. Strikethrough: ~~strikethrough~~
    escaped = escaped.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // 5. Highlight: ==highlight==
    escaped = escaped.replace(/==([^=]+)==/g, '<mark class="docs-highlight">$1</mark>');

    // 6. Safe links: [text](https://... or mailto:...)
    escaped = escaped.replace(
      /\[([^\]]+)\]\((https:\/\/[^)\s]+|mailto:[^)\s]+)\)/gi,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="docs-story-link">$1</a>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getEmbedUrl(block: DocBlock): SafeResourceUrl {
    let url = '';
    if (block.embedType === 'youtube') {
      const id = block.embedId || this.extractYoutubeId(block.url || '');
      url = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    } else if (block.embedType === 'vimeo') {
      const id = block.embedId || this.extractVimeoId(block.url || '');
      url = `https://player.vimeo.com/video/${id}?dnt=1`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private extractYoutubeId(url: string): string {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : url;
  }

  private extractVimeoId(url: string): string {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : url;
  }
}
