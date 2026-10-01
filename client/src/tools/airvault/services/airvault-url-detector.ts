export interface DetectedUrlSpan {
  url: string;
  displayUrl: string;
  startIndex: number;
  endIndex: number;
  isValidScheme: boolean;
}

/**
 * Robust URL detection regex matching http(s):// and www.-prefixed domains,
 * with boundary checks to prevent matching version strings (e.g. v1.2.3),
 * file paths (e.g. /usr/bin or ./config.json), and numeric values.
 */
const URL_REGEX = /(?:(?:https?:\/\/)|(?:www\.))[\w\-]+(?:\.[\w\-]+)+(?:[\w.,@?^=%&:/~+#*\-]*[\w@?^=%&/~+#\-])?/gi;

/**
 * Validates that the URL scheme is strictly http or https (blocks javascript:, data:, file:, etc.)
 */
export function isValidHttpUrl(candidate: string): boolean {
  if (!candidate || typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed) || /^file:/i.test(trimmed)) {
    return false;
  }
  return /^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed);
}

/**
 * Normalizes URL for opening in a browser tab (strips enclosing < > if present)
 */
export function normalizeUrlForNavigation(candidate: string): string {
  if (!candidate || typeof candidate !== 'string') return '';
  let trimmed = candidate.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Visually shortens long URLs with middle ellipsis while preserving the full URL (strips enclosing < >)
 */
export function formatDisplayUrl(url: string, maxLength: number = 38): string {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('<') && cleanUrl.endsWith('>')) {
    cleanUrl = cleanUrl.slice(1, -1).trim();
  }
  if (cleanUrl.length <= maxLength) return cleanUrl;
  const half = Math.floor((maxLength - 3) / 2);
  return `${cleanUrl.slice(0, half)}...${cleanUrl.slice(cleanUrl.length - half)}`;
}

/**
 * Asynchronously detects all URLs in text, yielding via macro-task/micro-task
 * to prevent blocking the UI thread on large payloads.
 */
export async function detectUrlsAsync(text: string): Promise<DetectedUrlSpan[]> {
  if (!text || typeof text !== 'string' || text.length < 4) {
    return [];
  }

  // Yield to main thread for non-blocking execution
  await new Promise(r => setTimeout(r, 0));

  const results: DetectedUrlSpan[] = [];
  const matches = text.matchAll(URL_REGEX);

  for (const match of matches) {
    const rawMatch = match[0];
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + rawMatch.length;

    // Filter false positives (e.g., version numbers 1.2.3, file system paths)
    if (/^\d+\.\d+\.\d+$/.test(rawMatch) || rawMatch.startsWith('/') || rawMatch.endsWith('.')) {
      continue;
    }

    const isValid = isValidHttpUrl(rawMatch);

    results.push({
      url: rawMatch,
      displayUrl: formatDisplayUrl(rawMatch),
      startIndex,
      endIndex,
      isValidScheme: isValid
    });
  }

  return results;
}
