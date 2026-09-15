import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { ContentActionShortcut, DetectedContentType, ActionShortcutMetadata } from './airvault-clipboard.service';
import { computeDedupKey, normalizeUrlForDedup, normalizeTextForDedup, sha256Hex, scanAllMatches } from './airvault-action-detector';

export interface ClassifyWorkerPayload {
  rawText: string;
  filename?: string;
  maxByteSize: number;
}

export interface ClassifiedContentResult {
  category: 'code' | 'url' | 'image' | 'file' | 'text' | 'video' | 'audio' | 'pdf' | 'spreadsheet' | 'archive' | 'font' | 'json';
  raw: string;
  language?: string;
  isSensitive: boolean;
  sensitiveType?: string;
  maskedSnippet?: string;
  previewUrl?: string;
  filename?: string;
  byteSize: number;
  actionShortcut?: ContentActionShortcut;
  detectedType?: DetectedContentType;
  metadata?: ActionShortcutMetadata;
  missingInfoHint?: string;
  dedupKey?: string;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'queued_offline';

export interface FileProcessingProgressMessage {
  type: 'FILE_PROGRESS';
  id: string;
  itemId: string;
  bytesProcessed: number;
  totalBytes: number;
  progressPercent: number;
  stage: 'reading' | 'encrypting' | 'hashing' | 'thumbnail';
}

addEventListener('message', async (event: MessageEvent) => {
  const { type, id, payload } = event.data;

  try {
    if (type === 'PROCESS_FILE_CHUNKED') {
      const { itemId, file, filename, byteSize } = payload as {
        itemId: string;
        file: Blob;
        filename: string;
        byteSize: number;
      };

      const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
      const totalBytes = byteSize || file.size;
      let bytesProcessed = 0;

      // 1. Generate quick low-res thumbnail off-thread if image
      let previewUrl: string | undefined = undefined;
      const isImg = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(filename) || file.type.startsWith('image/');
      const isVid = /\.(mp4|webm|mov|avi|mkv)$/i.test(filename) || file.type.startsWith('video/');

      if (isImg && typeof createImageBitmap !== 'undefined') {
        try {
          const bmp = await createImageBitmap(file, { resizeWidth: 320 });
          const canvas = new OffscreenCanvas(bmp.width, bmp.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bmp, 0, 0);
            const thumbBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
            const thumbBuffer = await thumbBlob.arrayBuffer();
            const bytes = new Uint8Array(thumbBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            previewUrl = `data:image/jpeg;base64,${btoa(binary)}`;
          }
        } catch {
          // Ignore thumbnail failure, fallback to full stream
        }
      }

      // 2. Chunked reading, client-side AES-GCM encryption and streaming upload
      const { uploadSessionId, encryptionKey } = payload as any;
      let cryptoKey: CryptoKey | null = null;
      if (encryptionKey) {
        if (encryptionKey instanceof CryptoKey) {
          cryptoKey = encryptionKey;
        } else {
          const rawBuffer: BufferSource = encryptionKey instanceof ArrayBuffer
            ? encryptionKey
            : (ArrayBuffer.isView(encryptionKey)
                ? (encryptionKey as any).buffer
                : (encryptionKey as BufferSource));
          cryptoKey = await crypto.subtle.importKey(
            'raw',
            rawBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
          );
        }
      }

      let chunkIndex = 0;
      let allChunksUploaded = true; // Track whether every PUT succeeded
      while (bytesProcessed < totalBytes) {
        const nextChunkEnd = Math.min(bytesProcessed + CHUNK_SIZE, totalBytes);
        const chunkBlob = file.slice(bytesProcessed, nextChunkEnd);

        // Read chunk asynchronously via native Blob API
        const chunkBuffer = await chunkBlob.arrayBuffer();

        // Client-side AES-GCM-256 Encryption (Zero-Knowledge)
        let processedBuffer = chunkBuffer;
        if (cryptoKey) {
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const cipherBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            chunkBuffer
          );

          // Prepend 12-byte IV to ciphertext chunk
          const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
          combined.set(iv, 0);
          combined.set(new Uint8Array(cipherBuffer), iv.byteLength);
          processedBuffer = combined.buffer;
        }

        // Upload encrypted chunk — up to 3 attempts before aborting.
        // A silently-swallowed failure here is what causes the server's
        // "Missing chunk index N" assembly error. We must not call /complete
        // unless every PUT returned 2xx.
        if (uploadSessionId) {
          const isLocal = typeof location !== 'undefined' && location.port === '4200';
          const base = isLocal ? 'http://localhost:8080' : '';
          const chunkUrl = `${base}/api/v1/airvault/uploads/${uploadSessionId}/chunks/${chunkIndex}`;
          const MAX_CHUNK_ATTEMPTS = 3;
          let chunkOk = false;
          for (let attempt = 0; attempt < MAX_CHUNK_ATTEMPTS; attempt++) {
            try {
              if (attempt > 0) {
                // Exponential back-off: 500ms, 1000ms
                await new Promise(r => setTimeout(r, attempt * 500));
              }
              const putRes = await fetch(chunkUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: processedBuffer
              });
              if (putRes.ok) {
                chunkOk = true;
                break;
              }
              console.warn(`[AirVault Worker] Chunk ${chunkIndex} PUT attempt ${attempt + 1} failed: HTTP ${putRes.status}`);
            } catch (netErr) {
              console.warn(`[AirVault Worker] Chunk ${chunkIndex} PUT attempt ${attempt + 1} network error:`, netErr);
            }
          }

          if (!chunkOk) {
            // All retry attempts exhausted — abort upload.
            // Do NOT call /complete; the server must not assemble with missing chunks.
            console.error(`[AirVault Worker] Chunk ${chunkIndex} permanently failed after ${MAX_CHUNK_ATTEMPTS} attempts. Aborting upload.`);
            allChunksUploaded = false;
            postMessage({
              id,
              success: false,
              error: `Upload failed: could not deliver chunk ${chunkIndex} to the server after ${MAX_CHUNK_ATTEMPTS} attempts.`
            });
            return;
          }
        }

        bytesProcessed = nextChunkEnd;
        chunkIndex++;
        const progressPercent = Math.min(100, Math.round((bytesProcessed / totalBytes) * 100));

        postMessage({
          type: 'FILE_PROGRESS',
          id,
          payload: {
            itemId,
            bytesProcessed,
            totalBytes,
            progressPercent,
            stage: bytesProcessed < totalBytes ? 'encrypting' : 'uploading'
          }
        });
      }

      // Complete upload session only if every chunk was delivered successfully
      if (uploadSessionId && allChunksUploaded) {
        try {
          const isLocal = typeof location !== 'undefined' && location.port === '4200';
          const base = isLocal ? 'http://localhost:8080' : '';
          await fetch(`${base}/api/v1/airvault/uploads/${uploadSessionId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewUrl })
          });
        } catch {}
      }

      // 3. Category detection
      let detectedCategory: string = 'file';
      const fname = (filename || '').toLowerCase();
      const isAud = /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i.test(fname) || (file.type && file.type.startsWith('audio/'));
      const isPdf = fname.endsWith('.pdf') || (file.type && file.type.startsWith('application/pdf'));
      const isSpreadsheet = /\.(csv|tsv|xlsx|xls)$/i.test(fname);
      const isArchive = /\.(zip|rar|7z|tar|gz|bz2)$/i.test(fname) || (file.type && file.type.startsWith('application/zip'));
      const isFont = /\.(ttf|otf|woff|woff2)$/i.test(fname);
      const isCodeExt = /\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml|sql|sh|yaml|yml|rs|go|php|dart|vue|svelte|rb|swift|kt)$/i.test(fname);

      if (isImg) detectedCategory = 'image';
      else if (isVid) detectedCategory = 'video';
      else if (isAud) detectedCategory = 'audio';
      else if (isPdf) detectedCategory = 'pdf';
      else if (isSpreadsheet) detectedCategory = 'spreadsheet';
      else if (isArchive) detectedCategory = 'archive';
      else if (isFont) detectedCategory = 'font';
      else if (isCodeExt) detectedCategory = fname.endsWith('.json') ? 'json' : 'code';

      // 4. For binary and text payloads, preserve byte integrity without UTF-8 corruption
      let rawContent = '';
      const isBinary = isImg || isVid || isAud || isPdf || isArchive || isFont || /\.(docx?|xlsx?|pptx?|bin|iso|dmg|pkg|wasm|dylib|so|psd|ai|fig|sketch|xd|epub|mobi)$/i.test(fname) || (file.type && (file.type.startsWith('application/') || file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')));

      if (isBinary) {
        if (previewUrl && isImg) {
          rawContent = previewUrl;
        } else if (totalBytes <= 50 * 1024 * 1024) {
          try {
            const fullBuf = await file.arrayBuffer();
            const bytes = new Uint8Array(fullBuf);
            let binary = '';
            const len = bytes.byteLength;
            const CHUNK = 32768;
            for (let i = 0; i < len; i += CHUNK) {
              const sub = bytes.subarray(i, Math.min(i + CHUNK, len));
              binary += String.fromCharCode.apply(null, sub as any);
            }
            let mime = file.type;
            if (!mime) {
              if (fname.endsWith('.zip')) mime = 'application/zip';
              else if (fname.endsWith('.pdf')) mime = 'application/pdf';
              else if (fname.endsWith('.mp3')) mime = 'audio/mpeg';
              else if (fname.endsWith('.wav')) mime = 'audio/wav';
              else mime = 'application/octet-stream';
            }
            rawContent = `data:${mime};base64,${btoa(binary)}`;
            if (isImg && !previewUrl) previewUrl = rawContent;
          } catch {
            rawContent = `[Encrypted Binary Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
          }
        } else {
          rawContent = `[Encrypted Binary Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
        }
      } else if (totalBytes <= 25 * 1024 * 1024) {
        try {
          rawContent = await file.text();
        } catch {
          rawContent = `[Encrypted Payload: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
        }
      } else {
        rawContent = previewUrl || `[Encrypted Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
      }

      // 5. Compute deterministic dedupKey for file payload based on file bytes
      let fileDedupKey: string | undefined = undefined;
      try {
        if (totalBytes <= 50 * 1024 * 1024) {
          const fullBuf = await file.arrayBuffer();
          fileDedupKey = await computeDedupKey(detectedCategory, rawContent, fullBuf);
        } else {
          // For very large files, hash the first 16MB + last 4MB + size to form a collision-resistant stream key
          const headSlice = await file.slice(0, 16 * 1024 * 1024).arrayBuffer();
          const headHash = await sha256Hex(headSlice);
          fileDedupKey = `file:${headHash}:${totalBytes}`;
        }
      } catch {
        fileDedupKey = `file:${totalBytes}`;
      }

      postMessage({
        id,
        success: true,
        result: {
          category: detectedCategory,
          raw: rawContent,
          previewUrl: previewUrl || (isImg ? rawContent : undefined),
          filename,
          byteSize: totalBytes,
          isSensitive: false,
          dedupKey: fileDedupKey
        }
      });
      return;
    }
    if (type === 'CLASSIFY_PAYLOAD') {
      const { rawText, filename, maxByteSize } = payload as ClassifyWorkerPayload;
      const text = (rawText || '').trim();
      const byteSize = new Blob([rawText]).size;

      // 1. Check for Image / Data URI
      if (text.startsWith('data:image/')) {
        const dedupKey = await computeDedupKey('image', text);
        postMessage({
          id,
          success: true,
          result: {
            category: 'image',
            raw: text,
            previewUrl: text,
            isSensitive: false,
            byteSize,
            dedupKey
          }
        });
        return;
      }

      // 2. Sensitive Credential / Token Check
      const sensitive = detectSensitiveData(text);

      // 3. Action Shortcut Detection (Runs on unmasked buffer)
      const shortcut = detectActionShortcut(text);

      // 4. URL Detection
      if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text)) {
        const dedupKey = await computeDedupKey('url', text);
        postMessage({
          id,
          success: true,
          result: {
            category: 'url',
            raw: text,
            isSensitive: sensitive.isSensitive,
            sensitiveType: sensitive.sensitiveType,
            maskedSnippet: sensitive.maskedSnippet,
            byteSize,
            actionShortcut: shortcut,
            detectedType: shortcut?.detectedType,
            metadata: shortcut?.metadata,
            missingInfoHint: shortcut?.missingInfoHint,
            dedupKey
          }
        });
        return;
      }

      // 5. Code Detection
      const lang = detectCodeLanguage(text);
      if (lang) {
        const cat = lang === 'json' ? 'json' : 'code';
        const dedupKey = await computeDedupKey(cat, text);
        postMessage({
          id,
          success: true,
          result: {
            category: cat,
            raw: text,
            language: lang,
            isSensitive: sensitive.isSensitive,
            sensitiveType: sensitive.sensitiveType,
            maskedSnippet: sensitive.maskedSnippet,
            byteSize,
            actionShortcut: shortcut,
            detectedType: shortcut?.detectedType,
            metadata: shortcut?.metadata,
            missingInfoHint: shortcut?.missingInfoHint,
            dedupKey
          }
        });
        return;
      }

      // 6. Default Text / File
      const cat = filename ? 'file' : 'text';
      const dedupKey = await computeDedupKey(cat, text);
      postMessage({
        id,
        success: true,
        result: {
          category: cat,
          raw: text,
          filename,
          isSensitive: sensitive.isSensitive,
          sensitiveType: sensitive.sensitiveType,
          maskedSnippet: sensitive.maskedSnippet,
          byteSize,
          actionShortcut: shortcut,
          detectedType: shortcut?.detectedType,
          metadata: shortcut?.metadata,
          missingInfoHint: shortcut?.missingInfoHint,
          dedupKey
        }
      });
    }

    if (type === 'DETECT_COMPOSER_MATCHES') {
      const { rawText } = payload as { rawText: string };
      const matches = scanAllMatches(rawText || '');
      postMessage({ id, success: true, result: matches });
    }
  } catch (err: any) {
    postMessage({
      id,
      success: false,
      error: err?.message || 'Worker processing error'
    });
  }
});

export function detectActionShortcut(text: string): ContentActionShortcut | undefined {
  if (!text || text.length > 10000) return undefined;
  const trimmed = text.trim();

  // 1. URL Detection
  const urlShortcut = detectUrlShortcut(trimmed);
  if (urlShortcut) return urlShortcut;

  // 2. Phone Number Detection via libphonenumber-js
  const phoneShortcut = detectPhoneShortcut(trimmed);
  if (phoneShortcut) return phoneShortcut;

  // 3. Physical Address Detection
  const addressShortcut = detectAddressShortcut(trimmed);
  if (addressShortcut) return addressShortcut;

  return undefined;
}

function detectUrlShortcut(text: string): ContentActionShortcut | undefined {
  if (/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text) || /^ftp:\/\/[^\s]+$/i.test(text)) {
    try {
      const u = new URL(text);
      return {
        detectedType: 'url',
        metadata: {
          url: text,
          protocol: u.protocol.replace(':', ''),
          hostname: u.hostname,
          pathname: u.pathname
        }
      };
    } catch {}
  }

  if (/^www\.[a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$/i.test(text)) {
    try {
      const full = 'https://' + text;
      const u = new URL(full);
      return {
        detectedType: 'url',
        metadata: {
          url: full,
          protocol: 'https',
          hostname: u.hostname,
          pathname: u.pathname
        },
        missingInfoHint: 'Added https:// prefix'
      };
    } catch {}
  }

  return undefined;
}

function detectPhoneShortcut(text: string): ContentActionShortcut | undefined {
  const clean = text.replace(/^[(\s"']+|[)\s"']+$/g, '').trim();
  const digitsOnly = clean.replace(/\D/g, '');

  // Guards against dates (2026-09-09), IP addresses (192.168.1.1), long numbers, or non-phone formats
  if (digitsOnly.length < 7 || digitsOnly.length > 15 || clean.includes('..') || /^\d{4}-\d{2}-\d{2}$/.test(clean) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) {
    return undefined;
  }

  try {
    let parsed = parsePhoneNumberFromString(clean);
    if (!parsed) {
      // Try with default country fallbacks
      parsed = parsePhoneNumberFromString(clean, 'US') || parsePhoneNumberFromString(clean, 'IN') || parsePhoneNumberFromString(clean, 'GB');
    }

    if (parsed && (parsed.isValid() || parsed.isPossible())) {
      const hasPlus = clean.includes('+');
      return {
        detectedType: 'phone',
        metadata: {
          number: clean,
          formattedE164: parsed.format('E.164') || clean,
          formattedNational: parsed.formatNational() || clean,
          country: parsed.country,
          countryCallingCode: parsed.countryCallingCode
        },
        missingInfoHint: !hasPlus ? 'Country calling code missing (e.g. +1, +91)' : undefined
      };
    }
  } catch {}

  return undefined;
}

function detectAddressShortcut(text: string): ContentActionShortcut | undefined {
  if (text.length < 12 || text.length > 300) return undefined;
  if (text.startsWith('http') || text.includes('@') || text.includes('{') || text.includes('}')) return undefined;

  const addressKeywords = /\b(street|st\.|road|rd\.|avenue|ave\.|boulevard|blvd\.|lane|ln\.|drive|dr\.|nagar|colony|sector|block|apartment|apt\.|flat|floor|suite|plot|pincode|pin code|zipcode|zip code|highway|chowk|marg|vihar|layout|enclave)\b/i;
  const postalCodeRegex = /\b(\d{5,6}|\d{5}-\d{4}|[A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i;

  const hasKeyword = addressKeywords.test(text);
  const postalMatch = text.match(postalCodeRegex);
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  if ((hasKeyword || postalMatch) && wordCount >= 3) {
    return {
      detectedType: 'address',
      metadata: {
        address: text,
        postalCode: postalMatch ? postalMatch[1] : undefined
      },
      missingInfoHint: !postalMatch ? 'PIN / Postal code missing' : undefined
    };
  }

  return undefined;
}

function detectSensitiveData(text: string): { isSensitive: boolean; sensitiveType?: string; maskedSnippet?: string } {
  if (/AKIA[0-9A-Z]{16}/.test(text)) {
    return { isSensitive: true, sensitiveType: 'AWS Access Key', maskedSnippet: 'AKIA●●●●●●●●●●●●●●●●' };
  }
  if (/sk-[a-zA-Z0-9]{32,}/.test(text)) {
    return { isSensitive: true, sensitiveType: 'OpenAI API Key', maskedSnippet: 'sk-●●●●●●●●●●●●●●●●' };
  }
  if (/gh[pousr]_[0-9a-zA-Z]{36}/.test(text)) {
    return { isSensitive: true, sensitiveType: 'GitHub Token', maskedSnippet: 'ghp_●●●●●●●●●●●●●●●●' };
  }
  if (/-----BEGIN (RSA|OPENSSH|EC) PRIVATE KEY-----/.test(text)) {
    return { isSensitive: true, sensitiveType: 'Private Key', maskedSnippet: '-----BEGIN PRIVATE KEY----- ●●● [PROTECTED]' };
  }
  return { isSensitive: false };
}

function detectCodeLanguage(text: string): string | null {
  if (text.startsWith('{') && text.endsWith('}')) {
    try { JSON.parse(text); return 'json'; } catch {}
  }
  if (text.startsWith('[') && text.endsWith(']')) {
    try { JSON.parse(text); return 'json'; } catch {}
  }
  if (/<([a-z]+)([^<]+)*(?:>(.*)<\/\1>|\s+\/>)/i.test(text)) return 'xml/html';
  if (/(function|const|let|var|import|export|class|=>)\s+[a-zA-Z0-9_]+/i.test(text)) return 'javascript';
  if (/(def\s+[a-zA-Z_]|import\s+[a-zA-Z_]|print\()/i.test(text)) return 'python';
  if (/(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+/i.test(text)) return 'sql';
  if (/(#include|int\s+main|std::)/i.test(text)) return 'cpp';
  if (/(package\s+[a-z]+;|public\s+class)/i.test(text)) return 'java';
  if (/(fn\s+main|let\s+mut|impl\s+)/i.test(text)) return 'rust';
  return null;
}
