import { Injectable, signal, computed, inject, EventEmitter } from '@angular/core';
import { WorkerBridgeService } from '../../../app/core/services/worker-bridge.service';
import { AirVaultPreferencesService } from './airvault-preferences.service';
import { detectActionShortcut, computeDedupKeySync } from './airvault-action-detector';
import { AirVaultSyncDebugLogger } from './airvault-sync-debug.service';
import { isHtmlContent, isStrictCodeMarkup, looksLikeMarkdown, stripMarkdownToPlainText, renderMarkdownToSafeHtml } from './airvault-markdown.util';

export type ContentCategory = 'code' | 'url' | 'image' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'archive' | 'font' | 'file' | 'text' | 'json' | 'markdown' | 'batch';
export type CollapseState = 'expanded' | 'collapsed' | 'pending';

export interface LineBlameSegment {
  authorIdentityId: string;
  authorColor: string;
  authorName: string;
  lastEditedAt: number;
  charStart?: number;
  charEnd?: number;
  weight?: number; // ratio of contribution (0..1)
}

export interface LineBlameEntry {
  lineId: string;           // Stable UUID assigned once at line creation — survives reordering
  authorIdentityId: string; // primary/last author identity key
  authorColor: string;      // Snapshot of color at write time (deterministic)
  authorName: string;       // Display label for tooltip
  lastEditedAt: number;     // Unix ms — used for relative-time tooltip
  seqNo: number;            // Logical clock / timestamp — tiebreaker for concurrent edits
  segments?: LineBlameSegment[]; // Multi-author segments when multiple peers contribute to the same line
}

export type DetectedContentType = 'url' | 'phone' | 'address';

export interface ActionShortcutMetadata {
  url?: string;
  protocol?: string;
  hostname?: string;
  pathname?: string;
  number?: string;
  formattedE164?: string;
  formattedNational?: string;
  country?: string;
  countryCallingCode?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  [key: string]: any;
}

export interface ContentActionShortcut {
  detectedType: DetectedContentType;
  metadata: ActionShortcutMetadata;
  missingInfoHint?: string;
}

export interface ClassifiedContent {
  category: ContentCategory;
  raw: string;
  language?: string;
  isSensitive: boolean;
  sensitiveType?: string;
  maskedSnippet?: string;
  previewUrl?: string;
  filename?: string;
  byteSize: number;
  /** For auto-collapse feature: current display state of the block */
  collapseState?: CollapseState;
  /** Timestamp when auto-collapse was scheduled (to debounce re-triggers) */
  collapseScheduledAt?: number;
  /** For JSON: count of top-level keys */
  jsonKeyCount?: number;
  /** GitHub blame-style per-line author attribution map */
  lineBlameMap?: LineBlameEntry[];
  /** Clipboard-to-action shortcuts metadata */
  actionShortcut?: ContentActionShortcut;
  detectedType?: DetectedContentType;
  metadata?: ActionShortcutMetadata;
  missingInfoHint?: string;
  /** Semantic deduplication key */
  dedupKey?: string;
}

export interface ResourceCapabilities {
  canCopy: boolean;
  canDownload: boolean;
  canPreview: boolean;
  previewType: 'text' | 'code' | 'json' | 'markdown' | 'url' | 'table' | 'image' | 'file-metadata' | 'none';
  primaryAction: 'copy' | 'download' | 'none';
}

export const MAX_PAYLOAD_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB Max single file
export const MAX_SINGLE_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB Max single file
export const CLIPBOARD_STORAGE_CAP_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB total vault cap
export const LARGE_INPUT_THRESHOLD_BYTES = 100 * 1024; // 100 KB Threshold for graceful degradation
/** Content is eligible for auto-collapse into tiles above 1,500 words only */
export const COLLAPSE_WORD_THRESHOLD = 1500;

@Injectable({
  providedIn: 'root'
})
export class AirVaultClipboardService {
  private workerBridge = inject(WorkerBridgeService);
  private prefService = inject(AirVaultPreferencesService);

  readonly autoCaptureEnabled = computed(() => this.prefService.prefs().autoCaptureOnFocus);
  lastCapturedHash = signal<string>('');
  lastCopiedText = signal<string>('');
  onClipboardTextCopied = new EventEmitter<string>();

  /**
   * Offload expensive classification to Web Worker for large payloads
   */
  async classifyAsync(rawText: string, filename?: string): Promise<ClassifiedContent> {
    if (typeof Worker !== 'undefined' && rawText.length > 5000) {
      try {
        const workerUrl = new URL('./airvault.worker.ts', import.meta.url);
        const result = await this.workerBridge.runTask<any, ClassifiedContent>(
          workerUrl,
          'CLASSIFY_PAYLOAD',
          { rawText, filename, maxByteSize: MAX_PAYLOAD_SIZE_BYTES }
        );
        if (result && !result.dedupKey) {
          result.dedupKey = computeDedupKeySync(result.category, result.raw);
        }
        return result;
      } catch (err) {
        // Fallback to instant local classification
      }
    }
    return this.classify(rawText, filename);
  }

  classify(rawText: string, filename?: string): ClassifiedContent {
    const res = this.classifyInternal(rawText, filename);
    if (!res.dedupKey) {
      res.dedupKey = computeDedupKeySync(res.category, res.raw);
    }
    return res;
  }

  private classifyInternal(rawText: string, filename?: string): ClassifiedContent {
    const text = rawText.trim();
    const byteSize = new Blob([rawText]).size;
    const fname = (filename || '').toLowerCase();

    // 1. Check for Image / Data URI
    if (text.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg|bmp|heic|ico)$/i.test(fname)) {
      return {
        category: 'image',
        raw: text,
        previewUrl: (text.startsWith('data:image/') || text.startsWith('blob:') || text.startsWith('http')) ? text : (text.length > 50 ? `data:image/png;base64,${text.replace(/^data:.*?,/, '')}` : undefined),
        filename,
        isSensitive: false,
        byteSize: byteSize > 0 ? byteSize : 0
      };
    }

    // 2. Check for Video / Video URI
    if (text.startsWith('data:video/') || /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(fname)) {
      return {
        category: 'video',
        raw: text,
        filename,
        isSensitive: false,
        byteSize
      };
    }

    // 3. Check for Audio / Audio URI
    if (text.startsWith('data:audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i.test(fname)) {
      return {
        category: 'audio',
        raw: text,
        filename,
        isSensitive: false,
        byteSize
      };
    }

    // 4. Check for PDF Document
    if (text.startsWith('data:application/pdf') || fname.endsWith('.pdf')) {
      return {
        category: 'pdf',
        raw: text,
        filename: filename || 'document.pdf',
        isSensitive: false,
        byteSize
      };
    }

    // 5. Check for Spreadsheets (MIME, data URIs, or CSV structure)
    const isSpreadsheetMime = text.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml') ||
      text.startsWith('data:application/vnd.ms-excel') ||
      text.startsWith('data:text/csv');
    if (isSpreadsheetMime || /\.(csv|tsv|xlsx|xls)$/i.test(fname) || this.looksLikeCsv(text)) {
      return {
        category: 'spreadsheet',
        raw: text,
        filename: filename || (isSpreadsheetMime ? 'spreadsheet.xlsx' : (fname.endsWith('.csv') ? fname : 'data.csv')),
        isSensitive: false,
        byteSize
      };
    }

    // 6. Check for Compressed Archives
    if (text.startsWith('data:application/zip') || text.startsWith('data:application/x-zip') || text.startsWith('data:application/x-tar') || text.startsWith('data:application/gzip') || /\.(zip|rar|7z|tar|gz|bz2)$/i.test(fname)) {
      return {
        category: 'archive',
        raw: text,
        filename: filename || 'package.zip',
        isSensitive: false,
        byteSize
      };
    }

    // 7. Check for Fonts
    if (text.startsWith('data:font/') || text.startsWith('data:application/font-woff') || text.startsWith('data:application/x-font') || /\.(ttf|otf|woff|woff2)$/i.test(fname)) {
      return {
        category: 'font',
        raw: text,
        filename: filename || 'font.woff2',
        isSensitive: false,
        byteSize
      };
    }

    // 7b. Check for generic Base64/Data URI file
    if (text.startsWith('data:application/') || text.startsWith('data:text/')) {
      const mimeMatch = text.match(/^data:([^;,]+)/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      return {
        category: 'file',
        raw: text,
        filename: filename || `attachment.${mime.split('/')[1] || 'bin'}`,
        isSensitive: false,
        byteSize
      };
    }

    // 8. Sensitive Credential / Token Check
    const sensitive = this.detectSensitiveData(text);

    // 9. URL Detection (LINK)
    if (/^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i.test(text)) {
      const fullUrl = text.startsWith('www.') ? `https://${text}` : text;
      const actionShortcut = detectActionShortcut(fullUrl);
      return {
        category: 'url',
        raw: fullUrl,
        isSensitive: sensitive.isSensitive,
        sensitiveType: sensitive.sensitiveType,
        maskedSnippet: sensitive.maskedSnippet,
        byteSize,
        actionShortcut,
        detectedType: 'url',
        metadata: actionShortcut?.metadata
      };
    }

    // 10. Explicit Code / Markdown Extensions
    if (/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml|sql|sh|yaml|yml|rs|go|php|dart|vue|svelte|rb|swift|kt|md|markdown)$/i.test(fname)) {
      if (/\.(md|markdown)$/i.test(fname)) {
        return {
          category: 'markdown',
          raw: text,
          language: 'MARKDOWN',
          filename,
          isSensitive: sensitive.isSensitive,
          sensitiveType: sensitive.sensitiveType,
          maskedSnippet: sensitive.maskedSnippet,
          byteSize,
          collapseState: 'pending'
        };
      }
      const isJson = fname.endsWith('.json');
      return {
        category: isJson ? 'json' : 'code',
        raw: text,
        language: fname.split('.').pop()?.toUpperCase() || 'Code',
        filename,
        isSensitive: sensitive.isSensitive,
        sensitiveType: sensitive.sensitiveType,
        maskedSnippet: sensitive.maskedSnippet,
        byteSize,
        collapseState: 'pending'
      };
    }

    // 11. Explicit File / Document Attachment
    if (filename) {
      return {
        category: 'file',
        raw: text,
        filename,
        isSensitive: sensitive.isSensitive,
        sensitiveType: sensitive.sensitiveType,
        maskedSnippet: sensitive.maskedSnippet,
        byteSize
      };
    }

    // 12. JSON Detection (strict JSON.parse before generic code heuristics)
    const jsonResult = this.detectJson(text);
    if (jsonResult) {
      return {
        category: 'json',
        raw: text,
        language: 'json',
        isSensitive: sensitive.isSensitive,
        sensitiveType: sensitive.sensitiveType,
        maskedSnippet: sensitive.maskedSnippet,
        jsonKeyCount: jsonResult.keyCount,
        byteSize,
        collapseState: 'pending'
      };
    }

    // 13. Rich Formatted Text (HTML with semantic tags: h1-h6, p, ul, ol, table, etc.)
    if (isHtmlContent(text) && !isStrictCodeMarkup(text)) {
      const actionShortcut = detectActionShortcut(text);
      return {
        category: 'text',
        raw: text,
        isSensitive: sensitive.isSensitive,
        sensitiveType: sensitive.sensitiveType,
        maskedSnippet: sensitive.maskedSnippet,
        byteSize,
        collapseState: 'pending',
        actionShortcut,
        detectedType: actionShortcut?.detectedType,
        metadata: actionShortcut?.metadata,
        missingInfoHint: actionShortcut?.missingInfoHint
      };
    }

    // 15. Code Detection (heuristics for brackets, keywords, indentation, symbols, strict code markup)
    const isCode = this.looksLikeCode(text);
    if (isCode) {
      return {
        category: 'code',
        raw: text,
        language: this.detectCodeLanguage(text) || 'Code',
        isSensitive: sensitive.isSensitive,
        sensitiveType: sensitive.sensitiveType,
        maskedSnippet: sensitive.maskedSnippet,
        byteSize,
        collapseState: 'pending'
      };
    }

    // 16. Plain Text
    const actionShortcut = detectActionShortcut(text);
    return {
      category: 'text',
      raw: text,
      isSensitive: sensitive.isSensitive,
      sensitiveType: sensitive.sensitiveType,
      maskedSnippet: sensitive.maskedSnippet,
      byteSize,
      collapseState: 'pending',
      actionShortcut,
      detectedType: actionShortcut?.detectedType,
      metadata: actionShortcut?.metadata,
      missingInfoHint: actionShortcut?.missingInfoHint
    };
  }

  /** Attempt strict JSON.parse to detect valid JSON objects/arrays */
  private detectJson(text: string): { keyCount: number } | null {
    const trimmed = text.trim();
    if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      const keyCount = typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0;
      return { keyCount };
    } catch {
      return null;
    }
  }

  private looksLikeCsv(text: string): boolean {
    if (!text || text.length < 5) return false;
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return false;
    
    // Check if lines have uniform delimiter count (commas, semicolons, tabs)
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    if (commaCount >= 1 && lines.slice(0, 5).every(l => Math.abs((l.match(/,/g) || []).length - commaCount) <= 1)) {
      return true;
    }
    const tabCount = (firstLine.match(/\t/g) || []).length;
    if (tabCount >= 1 && lines.slice(0, 5).every(l => (l.match(/\t/g) || []).length === tabCount)) {
      return true;
    }
    return false;
  }

  private looksLikeCode(text: string): boolean {
    if (!text || text.length < 5) return false;

    // Check code constructs: imports, functions, classes, declarations, braces, strict markup, SQL
    if (isStrictCodeMarkup(text)) return true; // XML/HTML document/SVG/JSX
    if (/^(import|export|const|let|var|function|class|def|public|private|interface|type|struct|fn|package|func)\s+/m.test(text)) return true;
    if (/SELECT\s+.*\s+FROM\s+/i.test(text) || /INSERT\s+INTO\s+/i.test(text)) return true;
    if (/[{};]\s*$/m.test(text) && (text.includes('(') || text.includes('='))) return true;
    if (text.includes('=>') || text.includes('::') || text.includes('->')) return true;

    return false;
  }

  registerSyncedText(text: string) {
    if (!text || !text.trim()) return;
    const hash = this.simpleHash(text.trim());
    this.lastCapturedHash.set(hash);
  }

  async captureFromClipboard(syncCorrelationId?: string): Promise<ClassifiedContent | null> {
    const syncId = syncCorrelationId || AirVaultSyncDebugLogger.createCorrelationId();
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      AirVaultSyncDebugLogger.log(syncId, 'Clipboard capture skipped', { reason: 'clipboard_api_unavailable' });
      return null;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        AirVaultSyncDebugLogger.log(syncId, 'Clipboard check', { result: 'empty' });
        return null;
      }

      AirVaultSyncDebugLogger.logClipboardDetected(syncId, text.length);

      // Duplicate prevention
      const hash = this.simpleHash(text.trim());
      const prevHash = this.lastCapturedHash();
      if (hash === prevHash) {
        AirVaultSyncDebugLogger.logDuplicateCheck(syncId, true, 'hash_unchanged', hash);
        return null; // Already captured / synced
      }

      AirVaultSyncDebugLogger.logHashChanged(syncId);
      AirVaultSyncDebugLogger.logDuplicateCheck(syncId, false);

      this.lastCapturedHash.set(hash);
      const classified = this.classify(text);
      return classified;
    } catch (err: any) {
      AirVaultSyncDebugLogger.log(syncId, 'Clipboard capture failed', { error: err?.message || 'access_denied_or_unfocused' });
      return null;
    }
  }

  async captureFromFile(file: File): Promise<ClassifiedContent | null> {
    if (!file) return null;

    if (file.size > MAX_SINGLE_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds 500 MB single file limit`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        const classified = this.classify(result, file.name);
        resolve(classified);
      };

      reader.onerror = () => reject(reader.error);

      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  toggleAutoCapture(): boolean {
    const nextState = !this.autoCaptureEnabled();
    this.prefService.updatePref('autoCaptureOnFocus', nextState);
    return nextState;
  }

  /**
   * Type-aware resource copying:
   * Writes native binary Blobs (e.g. image/png) to the system clipboard
   * so users paste actual images rather than raw base64 bytecode strings,
   * without blocking the UI thread.
   */
  async copyResource(content: ClassifiedContent): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;

    const raw = content.previewUrl || content.raw || '';
    const cat = content.category;

    // 1. If Image: write native image/png binary blob directly to clipboard
    if (cat === 'image' || raw.startsWith('data:image/') || raw.startsWith('blob:')) {
      try {
        let pngBlob: Blob | null = null;

        if (raw.startsWith('data:image/')) {
          try {
            const parts = raw.split(',');
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : 'image/png';
            const bstr = atob(parts[1]);
            const n = bstr.length;
            const u8arr = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
              u8arr[i] = bstr.charCodeAt(i);
            }
            pngBlob = new Blob([u8arr], { type: mime === 'image/png' ? 'image/png' : mime });
          } catch {}
        } else if (raw.startsWith('blob:') || raw.startsWith('http')) {
          try {
            const res = await fetch(raw);
            pngBlob = await res.blob();
          } catch {}
        }

        if (pngBlob && typeof ClipboardItem !== 'undefined') {
          // If already image/png
          if (pngBlob.type === 'image/png') {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': pngBlob })
            ]);
            return true;
          } else {
            // Convert to PNG blob via OffscreenCanvas / ImageBitmap (off-thread or fast)
            try {
              const bmp = await createImageBitmap(pngBlob);
              const oc = new OffscreenCanvas(bmp.width, bmp.height);
              const ctx = oc.getContext('2d');
              if (ctx) {
                ctx.drawImage(bmp, 0, 0);
                const converted = await oc.convertToBlob({ type: 'image/png' });
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': converted })
                ]);
                return true;
              }
            } catch {
              // Write whatever mime was available if allowed
              await navigator.clipboard.write([
                new ClipboardItem({ [pngBlob.type]: pngBlob })
              ]);
              return true;
            }
          }
        }
      } catch (imgErr) {
        console.warn('[AirVault Clipboard] Native image copy error:', imgErr);
      }
    }

    // 2. If Binary File / Archive (ZIP, PDF, etc.)
    if (cat === 'file' || cat === 'video') {
      if (raw.startsWith('data:') || raw.startsWith('[Encrypted')) {
        // Do not dump megabytes of raw base64 bytecode into clipboard; copy clean file descriptor
        const textToCopy = content.filename || 'Attached File';
        await navigator.clipboard.writeText(textToCopy);
        return true;
      }
    }

    // 3. Default: write clean text / code / json / url / markdown
    try {
      const rawText = content.raw || '';
      const isMd = cat === 'markdown';
      const isHtml = isHtmlContent(rawText) && !isStrictCodeMarkup(rawText);

      // If text is an explicit Markdown file or Rich HTML, write both text/html and clean preview text/plain
      if ((isMd || isHtml) && typeof ClipboardItem !== 'undefined') {
        try {
          const plainPreviewText = stripMarkdownToPlainText(rawText);
          const htmlContent = isHtml ? rawText : renderMarkdownToSafeHtml(rawText, false);

          const plainBlob = new Blob([plainPreviewText], { type: 'text/plain' });
          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });

          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': plainBlob,
              'text/html': htmlBlob
            })
          ]);

          if (rawText) {
            this.registerSyncedText(plainPreviewText);
            this.lastCopiedText.set(plainPreviewText);
            this.onClipboardTextCopied.emit(plainPreviewText);
          }
          return true;
        } catch {
          // Fallback if multi-mime ClipboardItem is not permitted
        }
      }

      // Plain-text write fallback (if user pasted Markdown, copy clean stripped preview text)
      const textToWrite = isMd ? stripMarkdownToPlainText(rawText) : rawText;
      await navigator.clipboard.writeText(textToWrite);
      if (textToWrite) {
        this.registerSyncedText(textToWrite);
        this.lastCopiedText.set(textToWrite);
        this.onClipboardTextCopied.emit(textToWrite);
      }
      return true;
    } catch {
      if (content.raw) {
        this.lastCopiedText.set(content.raw);
        this.onClipboardTextCopied.emit(content.raw);
      }
      return false;
    }
  }

  isPayloadSizeValid(byteSize: number): boolean {
    return byteSize <= MAX_PAYLOAD_SIZE_BYTES;
  }

  private detectSensitiveData(text: string): { isSensitive: boolean; sensitiveType?: string; maskedSnippet?: string } {
    // AWS Access Key
    if (/AKIA[0-9A-Z]{16}/.test(text)) {
      return {
        isSensitive: true,
        sensitiveType: 'AWS Access Key',
        maskedSnippet: 'AKIA' + '●'.repeat(16)
      };
    }

    // OpenAI Secret Key
    if (/sk-[a-zA-Z0-9]{32,}/.test(text)) {
      return {
        isSensitive: true,
        sensitiveType: 'OpenAI API Key',
        maskedSnippet: 'sk-' + '●'.repeat(24)
      };
    }

    // GitHub Token
    if (/gh[pousr]_[0-9a-zA-Z]{36}/.test(text)) {
      return {
        isSensitive: true,
        sensitiveType: 'GitHub Token',
        maskedSnippet: 'ghp_' + '●'.repeat(24)
      };
    }

    // JWT Bearer Token
    if (/^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(text)) {
      return {
        isSensitive: true,
        sensitiveType: 'JWT Access Token',
        maskedSnippet: text.substring(0, 8) + '●'.repeat(30) + text.substring(text.length - 6)
      };
    }

    // Credit Card (Luhn pattern 13-16 digits)
    if (/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/.test(text.replace(/[\s-]/g, ''))) {
      return {
        isSensitive: true,
        sensitiveType: 'Payment Card Number',
        maskedSnippet: '●●●●-●●●●-●●●●-' + text.slice(-4)
      };
    }

    // Password / Private Key indicators
    if (/-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----/.test(text)) {
      return {
        isSensitive: true,
        sensitiveType: 'Private Key',
        maskedSnippet: '-----BEGIN PRIVATE KEY----- ●●●●●●●● [PROTECTED]'
      };
    }

    return { isSensitive: false };
  }

  private detectCodeLanguage(text: string): string | null {
    if (text.startsWith('{') && text.endsWith('}')) {
      try { JSON.parse(text); return 'json'; } catch {}
    }
    if (text.startsWith('[') && text.endsWith(']')) {
      try { JSON.parse(text); return 'json'; } catch {}
    }
    if (isStrictCodeMarkup(text)) return 'xml/html';
    if (/(function|const|let|var|import|export|class|=>)\s+[a-zA-Z0-9_]+/i.test(text)) return 'javascript';
    if (/(def\s+[a-zA-Z_]|import\s+[a-zA-Z_]|print\()/i.test(text)) return 'python';
    if (/(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+/i.test(text)) return 'sql';
    if (/(#include|int\s+main|std::)/i.test(text)) return 'cpp';
    if (/(package\s+[a-z]+;|public\s+class)/i.test(text)) return 'java';
    if (/(fn\s+main|let\s+mut|impl\s+)/i.test(text)) return 'rust';
    return null;
  }

  public simpleHash(str: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return `${str.length}_${(h2 >>> 0).toString(16)}${(h1 >>> 0).toString(16)}`;
  }

  /**
   * Single source of truth policy for resource capabilities (Copy, Download, Preview).
   * Used across Clipboard tiles, Preview modal, Review screens, and Quick Actions.
   */
  public getResourceCapabilities(item?: {
    content?: {
      category?: ContentCategory | string;
      filename?: string;
      raw?: string;
      previewUrl?: string;
      byteSize?: number;
    };
    isBatchParent?: boolean;
    batchFiles?: any[];
  } | null): ResourceCapabilities {
    if (!item || !item.content) {
      return {
        canCopy: false,
        canDownload: false,
        canPreview: false,
        previewType: 'none',
        primaryAction: 'none'
      };
    }

    // 1. Batch Parent Handling (Multi-file bundle or Mixed Note + Attachments)
    if (item.isBatchParent) {
      const raw = item.content.raw?.trim() || '';
      const hasMixedText = !!raw && !/^Batch of \d+ files/i.test(raw);
      return {
        canCopy: hasMixedText,
        canDownload: false, // Batch download all handled via batch zip action
        canPreview: true,
        previewType: hasMixedText ? 'text' : 'none',
        primaryAction: hasMixedText ? 'copy' : 'none'
      };
    }

    const cat = item.content.category || 'text';
    const filename = (item.content.filename || '').toLowerCase();
    const raw = item.content.raw || '';
    const hasFilename = !!item.content.filename && item.content.filename.trim().length > 0;
    const isBlobOrData = raw.startsWith('blob:') || raw.startsWith('data:');
    const isEncryptedPlaceholder = raw.startsWith('[Encrypted');

    // Categorization normalization
    const isCsvOrTsv = cat === 'spreadsheet' && (filename.endsWith('.csv') || filename.endsWith('.tsv') || (!filename && !isBlobOrData && !isEncryptedPlaceholder));
    const isSpreadsheetBinary = cat === 'spreadsheet' && !isCsvOrTsv;

    switch (cat) {
      case 'text':
      case 'code':
      case 'json':
      case 'markdown': {
        const isFileBacked = hasFilename || (item.content.byteSize && item.content.byteSize > 1024 * 1024);
        return {
          canCopy: true,
          canDownload: !!isFileBacked,
          canPreview: true,
          previewType: cat === 'code' ? 'code' : cat === 'json' ? 'json' : cat === 'markdown' ? 'markdown' : 'text',
          primaryAction: 'copy'
        };
      }

      case 'url': {
        return {
          canCopy: true,
          canDownload: false,
          canPreview: true,
          previewType: 'url',
          primaryAction: 'copy'
        };
      }

      case 'spreadsheet': {
        if (isCsvOrTsv) {
          return {
            canCopy: true,
            canDownload: true,
            canPreview: true,
            previewType: 'table',
            primaryAction: 'copy'
          };
        }
        // Binary spreadsheet (.xlsx, .xls)
        return {
          canCopy: false,
          canDownload: true,
          canPreview: false,
          previewType: 'file-metadata',
          primaryAction: 'download'
        };
      }

      case 'image': {
        return {
          canCopy: true,
          canDownload: true,
          canPreview: true,
          previewType: 'image',
          primaryAction: 'download'
        };
      }

      case 'video': {
        // Thumbnail-only policy, no video playback preview engine
        return {
          canCopy: false,
          canDownload: true,
          canPreview: false,
          previewType: 'file-metadata',
          primaryAction: 'download'
        };
      }

      case 'audio': {
        return {
          canCopy: false,
          canDownload: true,
          canPreview: true, // Audio player supported
          previewType: 'file-metadata',
          primaryAction: 'download'
        };
      }

      case 'pdf': {
        return {
          canCopy: false,
          canDownload: true,
          canPreview: true, // PDF viewer iframe supported
          previewType: 'file-metadata',
          primaryAction: 'download'
        };
      }

      case 'archive':
      case 'font': {
        return {
          canCopy: false,
          canDownload: true,
          canPreview: true, // Archive list or font specimen supported
          previewType: 'file-metadata',
          primaryAction: 'download'
        };
      }

      case 'file':
      default: {
        // Check if this generic file has a known text extension and non-binary raw text
        const isTextDoc = /\.(txt|rtf|md|log|cfg|ini|env|json|js|ts|html|css|py|sh|csv|tsv|xml|yaml|yml|sql)$/i.test(filename) ||
          (!hasFilename && !isBlobOrData && !isEncryptedPlaceholder && raw.length > 0);

        if (isTextDoc) {
          return {
            canCopy: true,
            canDownload: hasFilename,
            canPreview: true,
            previewType: 'text',
            primaryAction: 'copy'
          };
        }

        return {
          canCopy: false,
          canDownload: true,
          canPreview: false,
          previewType: 'file-metadata',
          primaryAction: 'download'
        };
      }
    }
  }
}
