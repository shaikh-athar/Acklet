/**
 * Central message catalog for the Acklet URL Shortener.
 * Maps error and feedback codes to plain, friendly, non-technical text.
 */
export const SHORTENER_MESSAGE_CATALOG = {
  LINK_INVALID: 'Enter a valid link that starts with http:// or https://.',
  LINK_BLOCKED: "This link can't be shortened.",
  LINK_TOO_LONG: 'That link is too long. Try a shorter one.',
  NAME_INVALID: 'Use 3 to 30 letters, numbers, hyphens or underscores.',
  NAME_TAKEN: 'That name is already taken. Try another.',
  PASSWORD_TOO_SHORT: 'Use at least 6 characters.',
  PASSWORD_WRONG: "That password isn't correct. Try again.",
  RATE_LIMITED: "You're creating links too quickly. Please wait a moment and try again.",
  LINK_UNAVAILABLE: "This link isn't available.",
  LINK_EXPIRED: 'This link has expired.',
  LINK_NOT_ACTIVE_YET: "This link isn't active yet. Please check back later.",
  VISIT_LIMIT_REACHED: 'This link has reached its visit limit.',
  NO_PERMISSION: 'You can only manage links created on this device or restored from a backup.',
  BACKUP_FILE_INVALID: "That file couldn't be read. Choose a backup file downloaded from this tool.",
  SERVER_ERROR: "We couldn't complete that. Please try again in a few minutes.",
  OFFLINE_OR_NETWORK: 'You appear to be offline. Check your connection and try again.',
  ACCESS_EXPIRED: 'Your access has expired. Enter the password again.',
  REPORT_RECEIVED: 'Report received. Thank you.',
  SAVE_FAILED: "Your changes weren't saved. Please try again.",
  COPY_FAILED: "Couldn't copy. Select the link and copy it manually.",
  LINK_COPIED: 'Link copied',
  CSV_EXPORTED: 'CSV exported',
  BACKUP_EXPORTED: 'Recovery file exported',
  EXPIRY_INVALID: 'Please choose an expiration date and time in the future.',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again in a few moments.'
} as const;

export type ShortenerMessageKey = keyof typeof SHORTENER_MESSAGE_CATALOG;

export function getShortenerMessage(code: string | null | undefined, fallback: string = SHORTENER_MESSAGE_CATALOG.SERVER_ERROR): string {
  if (!code) return fallback;
  return (SHORTENER_MESSAGE_CATALOG as Record<string, string>)[code] || fallback;
}

/**
 * Detects whether a string looks like a raw technical error, HTTP response text,
 * stack trace, Java exception, or system diagnostic string that should never be shown to users.
 */
export function isTechnicalErrorText(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('http failure') ||
    lower.includes('internal server error') ||
    lower.includes('bad gateway') ||
    lower.includes('gateway timeout') ||
    lower.includes('service unavailable') ||
    lower.includes('status code') ||
    lower.includes('err_') ||
    lower.includes('failed to fetch') ||
    lower.includes('cannot read propert') ||
    lower.includes('nullpointer') ||
    lower.includes('sql') ||
    lower.includes('constraint') ||
    lower.includes('exception') ||
    lower.includes('trace') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.includes('stacktrace') ||
    /status:?\s*\d{3}/i.test(text) ||
    /error:?\s*\d{3}/i.test(text) ||
    /:\s*5\d{2}/.test(text) ||
    /:\s*4\d{2}/.test(text)
  );
}

/**
 * Sanitizes any error (HttpErrorResponse, Error instance, string, or unknown object)
 * into a polite, human-readable, negotiable message.
 * Guaranteed to NEVER leak raw HTTP failure responses, URLs, status codes, or stack traces.
 */
export function sanitizeErrorMessage(
  err: unknown,
  fallback: string = SHORTENER_MESSAGE_CATALOG.SERVER_ERROR
): string {
  if (!err) return fallback;

  // 1. Direct catalog code match
  if (typeof err === 'string') {
    if (err in SHORTENER_MESSAGE_CATALOG) {
      return (SHORTENER_MESSAGE_CATALOG as Record<string, string>)[err];
    }
    if (isTechnicalErrorText(err)) {
      return fallback;
    }
    return err;
  }

  // 2. Object with errorCode
  const obj = err as Record<string, any>;
  const errorCode = obj['errorCode'];
  if (errorCode && typeof errorCode === 'string') {
    if (errorCode in SHORTENER_MESSAGE_CATALOG) {
      return (SHORTENER_MESSAGE_CATALOG as Record<string, string>)[errorCode];
    }
  }

  // 3. Status-based HTTP mapping
  const status = typeof obj['status'] === 'number' ? obj['status'] : undefined;
  if (status !== undefined) {
    if (status === 0) {
      return SHORTENER_MESSAGE_CATALOG.OFFLINE_OR_NETWORK;
    }
    if (status === 404 || status === 410) {
      return SHORTENER_MESSAGE_CATALOG.LINK_UNAVAILABLE;
    }
    if (status === 401 || status === 403) {
      return SHORTENER_MESSAGE_CATALOG.NO_PERMISSION;
    }
    if (status === 409) {
      return SHORTENER_MESSAGE_CATALOG.NAME_TAKEN;
    }
    if (status === 429) {
      return SHORTENER_MESSAGE_CATALOG.RATE_LIMITED;
    }
    if (status >= 500) {
      return SHORTENER_MESSAGE_CATALOG.SERVER_ERROR;
    }
    if (status === 400) {
      const serverMsg = (obj['error'] && typeof obj['error'] === 'object' && obj['error']['message']) || obj['message'];
      if (serverMsg && typeof serverMsg === 'string' && !isTechnicalErrorText(serverMsg)) {
        return serverMsg;
      }
      return SHORTENER_MESSAGE_CATALOG.LINK_INVALID;
    }
  }

  // 4. Nested error message inspection
  const rawMsg = (obj['error'] && typeof obj['error'] === 'object' && obj['error']['message']) || obj['message'];
  if (rawMsg && typeof rawMsg === 'string') {
    if (rawMsg in SHORTENER_MESSAGE_CATALOG) {
      return (SHORTENER_MESSAGE_CATALOG as Record<string, string>)[rawMsg];
    }
    if (!isTechnicalErrorText(rawMsg)) {
      return rawMsg;
    }
  }

  return fallback;
}
