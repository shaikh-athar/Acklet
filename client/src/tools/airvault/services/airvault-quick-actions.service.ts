import { Injectable, inject } from '@angular/core';
import { AirVaultClipboardService } from './airvault-clipboard.service';
import { AirVaultUIStore } from './airvault-ui.store';
import { AirVaultStorageService, AirVaultItem } from './airvault-storage.service';

@Injectable({
  providedIn: 'root'
})
export class AirVaultQuickActionsService {
  private clipboard = inject(AirVaultClipboardService);
  private uiStore = inject(AirVaultUIStore);
  private storageService = inject(AirVaultStorageService);

  /**
   * 1. URL: Open in new browser tab securely
   */
  openLink(url?: string): void {
    if (!url) return;
    const normalized = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://')
      ? url
      : `https://${url}`;
    window.open(normalized, '_blank', 'noopener,noreferrer');
    this.uiStore.triggerToast('Opened link in new tab');
  }

  /**
   * 2. Phone: Native tel: call protocol
   */
  callPhone(phone?: string): void {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    window.open(`tel:${cleanNumber}`, '_self');
    this.uiStore.triggerToast(`Calling ${cleanNumber}`);
  }

  /**
   * 3. Phone: Native sms: protocol
   */
  messagePhone(phone?: string): void {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    window.open(`sms:${cleanNumber}`, '_self');
    this.uiStore.triggerToast(`Composing message to ${cleanNumber}`);
  }

  /**
   * 4. Phone: Generate and download a standard vCard (.vcf)
   */
  addToContacts(phone?: string, name?: string, country?: string): void {
    if (!phone) return;
    const contactName = name || `Contact ${phone}`;
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contactName}`,
      `TEL;TYPE=CELL,VOICE:${phone}`,
      country ? `NOTE:Detected Region: ${country}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contactName.replace(/[^a-zA-Z0-9_-]/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.uiStore.triggerToast('Downloaded vCard contact file');
  }

  /**
   * 5. Address: Open in Google Maps Search
   */
  openInMaps(address?: string): void {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank', 'noopener,noreferrer');
    this.uiStore.triggerToast('Opened address in Google Maps');
  }

  /**
   * 6. Address: Open Turn-by-Turn Directions in Maps
   */
  openDirections(address?: string): void {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank', 'noopener,noreferrer');
    this.uiStore.triggerToast('Opened directions in Google Maps');
  }

  /**
   * Generic Copy Helper reusing AirVaultClipboardService writeText logic
   */
  async copyText(text?: string, successMessage: string = 'Copied to clipboard'): Promise<boolean> {
    if (!text) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.uiStore.triggerToast(successMessage);
      return true;
    } catch (err) {
      console.warn('[AirVault Quick Actions] Copy failed:', err);
      this.uiStore.triggerToast('Failed to copy');
      return false;
    }
  }

  /**
   * Helper to detect the authentic MIME type from filename, category, and blobType.
   * Ensures that documents (PDF, DOCX, XLSX, etc.) and media files are accurately identified.
   */
  getMimeType(filename?: string, category?: string, blobType?: string): string {
    if (blobType && blobType !== 'application/octet-stream' && blobType !== 'application/x-download' && blobType !== '') {
      return blobType;
    }

    const fname = (filename || '').trim().toLowerCase();
    const extMatch = fname.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    const EXT_TO_MIME: Record<string, string> = {
      // Images
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      heic: 'image/heic',
      heif: 'image/heif',
      avif: 'image/avif',
      tiff: 'image/tiff',
      tif: 'image/tiff',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      odp: 'application/vnd.oasis.opendocument.presentation',
      rtf: 'application/rtf',
      epub: 'application/epub+zip',

      // Text / Data / Code
      txt: 'text/plain',
      csv: 'text/csv',
      tsv: 'text/tab-separated-values',
      json: 'application/json',
      jsonld: 'application/ld+json',
      xml: 'application/xml',
      yaml: 'application/yaml',
      yml: 'application/yaml',
      md: 'text/markdown',
      markdown: 'text/markdown',
      html: 'text/html',
      htm: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      mjs: 'text/javascript',
      ts: 'text/typescript',
      tsx: 'text/typescript-jsx',
      jsx: 'text/jsx',
      py: 'text/x-python',
      java: 'text/x-java-source',
      c: 'text/x-c',
      cpp: 'text/x-c++',
      cs: 'text/plain',
      go: 'text/x-go',
      rs: 'text/x-rust',
      rb: 'text/x-ruby',
      php: 'text/x-php',
      sh: 'application/x-sh',
      sql: 'application/sql',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      wma: 'audio/x-ms-wma',

      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',
      m4v: 'video/x-m4v',

      // Archives
      zip: 'application/zip',
      rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
      bz2: 'application/x-bzip2',

      // Fonts
      woff: 'font/woff',
      woff2: 'font/woff2',
      ttf: 'font/ttf',
      otf: 'font/otf'
    };

    if (ext && EXT_TO_MIME[ext]) {
      return EXT_TO_MIME[ext];
    }

    const cat = (category || '').toLowerCase();
    switch (cat) {
      case 'image': return 'image/png';
      case 'video': return 'video/mp4';
      case 'audio': return 'audio/mpeg';
      case 'pdf': return 'application/pdf';
      case 'spreadsheet': return fname.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'archive': return 'application/zip';
      case 'json': return 'application/json';
      case 'markdown': return 'text/markdown';
      case 'code': return 'text/plain';
      case 'text': return 'text/plain';
      default: return blobType || 'application/octet-stream';
    }
  }

  /**
   * Lazily resolve a Blob for a given AirVaultItem.
   * Priority: LRU cache → data-URL in raw → blob-URL in raw → storage fetch → inline raw fallback.
   */
  async resolveBlob(item: AirVaultItem): Promise<Blob | null> {
    // 1. LRU resource cache (already loaded payload)
    const cached = this.storageService.resourceCache.get(item.id);
    if (cached?.blob) return cached.blob;

    const raw = item.content?.previewUrl || item.content?.raw || '';

    // 2. Inline data-URL
    if (raw.startsWith('data:')) {
      try {
        const parts = raw.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : this.getMimeType(item.content?.filename, item.content?.category);
        const bstr = atob(parts[1]);
        const bytes = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
        return new Blob([bytes], { type: mime });
      } catch {
        return null;
      }
    }

    // 3. Existing blob: or http URL — fetch it
    if (raw.startsWith('blob:') || raw.startsWith('http')) {
      try {
        const resp = await fetch(raw);
        if (resp.ok) return await resp.blob();
      } catch {
        return null;
      }
    }

    // 4. Server-side / IndexedDB lazy fetch
    try {
      const result = await this.storageService.fetchResourcePayload(item);
      if (result?.blob) return result.blob;
    } catch {
      // ignore
    }

    // 5. Fallback for inline text payload ONLY (never for binary categories)
    const cat = item.content?.category;
    const isTextCategory = ['text', 'code', 'json', 'markdown', 'url'].includes(cat || '');
    if (isTextCategory && item.content?.raw && typeof item.content.raw === 'string' && item.content.raw.length > 0 && !item.content.raw.startsWith('[Encrypted')) {
      const mime = this.getMimeType(item.content.filename, item.content.category);
      return new Blob([item.content.raw], { type: mime });
    }

    return null;
  }

  /**
   * Resolve an AirVaultItem into a native File object with its authentic MIME type.
   */
  async resolveFile(item: AirVaultItem): Promise<File | null> {
    const blob = await this.resolveBlob(item);
    if (!blob || blob.size === 0) return null;

    const cat = item.content?.category || 'file';
    let filename = item.content?.filename;
    if (!filename) {
      const ext = cat === 'image' ? '.png' : cat === 'pdf' ? '.pdf' : cat === 'markdown' ? '.md' : cat === 'json' ? '.json' : cat === 'code' ? '.txt' : '.dat';
      filename = `airvault_${cat}_${Date.now()}${ext}`;
    }

    const mimeType = this.getMimeType(filename, cat, blob.type);
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Trigger a browser download for a Blob.
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
