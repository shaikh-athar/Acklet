import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { ContentActionShortcut, DetectedContentType, ActionShortcutMetadata } from './airvault-clipboard.service';

/**
 * Off-thread and in-app detection of high-value structured entities:
 * URLs, Phone Numbers, and Physical Addresses.
 */
export function detectActionShortcut(text: string): ContentActionShortcut | undefined {
  if (!text || text.length > 10000) return undefined;
  const trimmed = text.trim();

  // 1. URL Detection
  const urlShortcut = detectUrlShortcut(trimmed);
  if (urlShortcut) return urlShortcut;

  // 2. Phone Number Detection via libphonenumber-js
  const phoneShortcut = detectPhoneShortcut(trimmed);
  if (phoneShortcut) return phoneShortcut;

  return undefined;
}

export function detectUrlShortcut(text: string): ContentActionShortcut | undefined {
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

export function detectPhoneShortcut(text: string): ContentActionShortcut | undefined {
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


/**
 * Mask sensitive credentials and tokens for safe cross-device preview broadcasting (truncates to ~80 chars).
 */
export function maskSensitivePreview(text: string, maxLen: number = 80): string {
  if (!text) return '';
  let clean = text;

  // 1. AWS Access Key
  clean = clean.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA●●●●●●●●●●●●●●●●');

  // 2. OpenAI Secret Key
  clean = clean.replace(/sk-[a-zA-Z0-9]{32,}/g, 'sk-●●●●●●●●●●●●●●●●');

  // 3. GitHub Token
  clean = clean.replace(/gh[pousr]_[0-9a-zA-Z]{36}/g, 'ghp_●●●●●●●●●●●●●●●●');

  // 4. Private Key
  clean = clean.replace(/-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----[^-]*-----END (?:RSA|OPENSSH|EC) PRIVATE KEY-----/gs, '-----BEGIN PRIVATE KEY----- ●●● [PROTECTED]');

  // 5. JWT Token
  clean = clean.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, (m) => m.slice(0, 8) + '●●●●●●●●●●' + m.slice(-6));

  // 6. Credit Card
  clean = clean.replace(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g, '●●●●-●●●●-●●●●-XXXX');

  const trimmed = clean.trim();
  if (trimmed.length > maxLen) {
    return trimmed.slice(0, maxLen) + '…';
  }
  return trimmed;
}

/**
 * Normalizes a URL for semantic deduplication:
 * - Lowercase scheme + host
 * - Strip default ports (:80, :443)
 * - Strip a single trailing slash from path
 * - Strip tracking parameters (utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, gclid)
 * - Preserve path casing (paths are case-sensitive)
 */
export function normalizeUrlForDedup(rawUrl: string): string {
  if (!rawUrl) return '';
  let str = rawUrl.trim();
  if (!/^https?:\/\//i.test(str) && !/^ftp:\/\//i.test(str)) {
    str = 'https://' + str;
  }

  try {
    const parsed = new URL(str);
    const protocol = parsed.protocol.toLowerCase();
    let hostname = parsed.hostname.toLowerCase();
    let port = parsed.port;

    // Strip default ports
    if ((protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443')) {
      port = '';
    }

    const host = port ? `${hostname}:${port}` : hostname;
    let pathname = parsed.pathname;

    // Strip a single trailing slash from path (including root '/')
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Strip tracking parameters
    const trackingParams = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid'
    ]);

    const searchParams = new URLSearchParams(parsed.search);
    const keysToDelete: string[] = [];
    searchParams.forEach((_, key) => {
      if (trackingParams.has(key.toLowerCase())) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(k => searchParams.delete(k));

    const queryString = searchParams.toString();
    const queryPart = queryString ? `?${queryString}` : '';
    const hashPart = parsed.hash || '';

    return `${protocol}//${host}${pathname}${queryPart}${hashPart}`;
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Normalizes plain text / code for semantic deduplication:
 * - Normalizes line endings to \n
 * - Trims leading and trailing whitespace
 * - Collapses repeated blank lines (3+ consecutive newlines -> \n\n)
 */
export function normalizeTextForDedup(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Computes a fast deterministic SHA-256 hash or hash string for text.
 */
export async function sha256Hex(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  const buf: BufferSource = typeof data === 'string'
    ? (new TextEncoder().encode(data) as any)
    : (data as any);

  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buf);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }

  // Fallback FNV-1a / Murmur-like fast 64-bit hex hash
  const u8 = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer);
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < u8.length; i++) {
    h1 = Math.imul(h1 ^ u8[i], 0x01000193);
    h2 = Math.imul(h2 ^ u8[i], 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Computes a semantic comparison key per content type:
 * - URL: Normalized URL string (e.g. "url:https://example.com/path")
 * - Text/Code/JSON: "text:<sha256>" of normalized text
 * - File: "file:<sha256>" of raw file bytes
 */
export async function computeDedupKey(
  category: string,
  rawContent: string,
  fileBytes?: Uint8Array | ArrayBuffer
): Promise<string> {
  if (category === 'url' || (/^https?:\/\//i.test(rawContent) && !rawContent.includes('\n'))) {
    const normalized = normalizeUrlForDedup(rawContent);
    return `url:${normalized}`;
  }

  if (fileBytes && (category === 'file' || category === 'image' || category === 'video' || category === 'audio' || category === 'pdf' || category === 'archive' || category === 'spreadsheet' || category === 'font')) {
    const hash = await sha256Hex(fileBytes);
    return `file:${hash}`;
  }

  // For data URI binary attachments (e.g. data:image/png;base64,...)
  if (rawContent.startsWith('data:') && rawContent.includes(';base64,')) {
    const base64Data = rawContent.split(';base64,')[1] || '';
    const hash = await sha256Hex(base64Data);
    return `file:${hash}`;
  }

  // Default: normalized text/code/json hash
  const normalizedText = normalizeTextForDedup(rawContent);
  const hash = await sha256Hex(normalizedText);
  return `text:${hash}`;
}

/**
 * Fast synchronous hash generator for text/payloads when Web Crypto async is not suitable
 */
export function sha256HexSync(data: string | Uint8Array | ArrayBuffer): string {
  const buf = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : data;
  const u8 = new Uint8Array(buf instanceof ArrayBuffer ? buf : buf.buffer);
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < u8.length; i++) {
    h1 = Math.imul(h1 ^ u8[i], 0x01000193);
    h2 = Math.imul(h2 ^ u8[i], 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Synchronous dedup key computation for immediate local classification
 */
export function computeDedupKeySync(
  category: string,
  rawContent: string
): string {
  if (category === 'url' || (/^https?:\/\//i.test(rawContent) && !rawContent.includes('\n'))) {
    const normalized = normalizeUrlForDedup(rawContent);
    return `url:${normalized}`;
  }

  if (rawContent.startsWith('data:') && rawContent.includes(';base64,')) {
    const base64Data = rawContent.split(';base64,')[1] || '';
    const hash = sha256HexSync(base64Data);
    return `file:${hash}`;
  }

  const normalizedText = normalizeTextForDedup(rawContent);
  const hash = sha256HexSync(normalizedText);
  return `text:${hash}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composer-level multi-match scanning (inline highlight layer)
// ─────────────────────────────────────────────────────────────────────────────

export interface ComposerMatch {
  start: number;
  end: number;
  matchedText: string;
  shortcut: ContentActionShortcut;
}

/**
 * Scans an arbitrary multi-line text body and returns all detected entity
 * spans (URL, phone, address) with their character
 * offsets. This is used for live inline-highlight rendering in the staging
 * composer WITHOUT duplicating any regex logic — it re-uses the same
 * individual detectors that power the single-item tagging path.
 */
export function scanAllMatches(text: string): ComposerMatch[] {
  if (!text || text.length > 50000) return [];
  const results: ComposerMatch[] = [];

  // 1. URLs — find every http(s)/ftp/www span
  const urlPattern = /\b(https?:\/\/[^\s/$.?#][^\s]*|ftp:\/\/[^\s]+|www\.[a-zA-Z0-9\-.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(text)) !== null) {
    const raw = m[1];
    const start = m.index;
    const end = start + raw.length;
    const shortcut = detectUrlShortcut(raw.trim());
    if (shortcut) {
      results.push({ start, end, matchedText: raw, shortcut });
    }
  }

  // Helper: skip if a character range overlaps any existing result
  const overlaps = (s: number, e: number) =>
    results.some(r => s < r.end && e > r.start);

  // 2. Phone numbers — scan E.164-style (+CC digits) and Indian mobile numbers
  //    Use conservative patterns to reduce false positives in rich text.
  const phonePatterns = [
    /(\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{1,4}[\s\-.]?\d{1,9})/g,   // E.164 with separators
    /\b(0?[6-9]\d{9})\b/g                                                    // Indian 10-digit mobile
  ];
  for (const pat of phonePatterns) {
    pat.lastIndex = 0;
    while ((m = pat.exec(text)) !== null) {
      const raw = m[1];
      const start = m.index + (m[0].length - raw.length);
      const end = start + raw.length;
      try {
        const shortcut = detectPhoneShortcut(raw.trim());
        if (shortcut) {
          results.push({ start, end, matchedText: raw, shortcut });
        }
      } catch { /* libphonenumber parse error — skip */ }
    }
  }

// Sort by start offset for deterministic rendering order
  results.sort((a, b) => a.start - b.start);
  return results;
}

/**
 * Detects if a new resource is a duplicate of one already present for a paired user.
 * Matches by semantic dedupKey or content comparison across paired users' resources.
 * Returns { isDuplicate: boolean, matchedUsername: string }.
 */
export function checkDuplicateResource(
  newResource: any,
  pairedUsersResources: any[]
): { isDuplicate: boolean; matchedUsername: string } {
  if (!newResource || !pairedUsersResources || !Array.isArray(pairedUsersResources) || pairedUsersResources.length === 0) {
    return { isDuplicate: false, matchedUsername: '' };
  }

  const incomingContent = newResource.content || newResource;
  if (!incomingContent) {
    return { isDuplicate: false, matchedUsername: '' };
  }

  const incomingCategory = incomingContent.category || (incomingContent.raw ? 'text' : '');
  const incomingRaw = typeof incomingContent.raw === 'string' ? incomingContent.raw.trim() : '';
  const incomingFilename = incomingContent.filename || '';
  const incomingKey = newResource.dedupKey || incomingContent.dedupKey || (incomingCategory && incomingRaw ? computeDedupKeySync(incomingCategory, incomingRaw) : '');

  const newId = newResource.id || newResource.packetId;

  for (const existing of pairedUsersResources) {
    if (!existing || !existing.content) continue;
    // Skip comparing against self item if IDs match
    if (newId && (existing.id === newId || existing.packetId === newId)) continue;

    const matchedUsername = existing.senderDeviceName || existing.originOwnerId || (existing.username ? `@${existing.username.replace(/^@/, '')}` : (existing.originDeviceName || 'Paired User'));

    // 1. Primary: semantic dedupKey match
    const existingKey = existing.dedupKey || existing.content?.dedupKey || (existing.content?.category && existing.content?.raw ? computeDedupKeySync(existing.content.category, existing.content.raw) : '');
    if (incomingKey && existingKey && incomingKey === existingKey) {
      return { isDuplicate: true, matchedUsername };
    }

    // 2. Exact raw content match for text/code/json/url
    const existingCategory = existing.content.category;
    const existingRaw = typeof existing.content.raw === 'string' ? existing.content.raw.trim() : '';

    if (incomingCategory && existingCategory && incomingCategory === existingCategory) {
      if (['text', 'code', 'json', 'url'].includes(incomingCategory) && incomingRaw && existingRaw && incomingRaw === existingRaw) {
        return { isDuplicate: true, matchedUsername };
      }
      // 3. Image / previewUrl / filename match
      if (incomingCategory === 'image') {
        const inPreview = incomingContent.previewUrl || incomingRaw;
        const exPreview = existing.content.previewUrl || existingRaw;
        if (inPreview && exPreview && inPreview === exPreview) {
          return { isDuplicate: true, matchedUsername };
        }
      }
      // 4. File / binary match (filename and byte size or raw payload)
      if (['file', 'video', 'archive', 'spreadsheet', 'pdf', 'audio'].includes(incomingCategory)) {
        if (incomingRaw && existingRaw && incomingRaw.length > 20 && incomingRaw === existingRaw) {
          return { isDuplicate: true, matchedUsername };
        }
        if (incomingFilename && existing.content.filename && incomingFilename === existing.content.filename && incomingContent.byteSize && existing.content.byteSize && incomingContent.byteSize === existing.content.byteSize) {
          return { isDuplicate: true, matchedUsername };
        }
      }
    }
  }

  return { isDuplicate: false, matchedUsername: '' };
}
