import { describe, it, expect } from 'vitest';
import {
  SHORTENER_MESSAGE_CATALOG,
  getShortenerMessage,
  sanitizeErrorMessage,
  isTechnicalErrorText
} from './shortener-messages';

describe('Shortener Messages Catalog & Error Handling', () => {
  it('should map known catalog codes to friendly text', () => {
    expect(getShortenerMessage('LINK_INVALID')).toBe(SHORTENER_MESSAGE_CATALOG.LINK_INVALID);
    expect(getShortenerMessage('LINK_BLOCKED')).toBe(SHORTENER_MESSAGE_CATALOG.LINK_BLOCKED);
    expect(getShortenerMessage('LINK_TOO_LONG')).toBe(SHORTENER_MESSAGE_CATALOG.LINK_TOO_LONG);
    expect(getShortenerMessage('NAME_INVALID')).toBe(SHORTENER_MESSAGE_CATALOG.NAME_INVALID);
    expect(getShortenerMessage('NAME_TAKEN')).toBe(SHORTENER_MESSAGE_CATALOG.NAME_TAKEN);
    expect(getShortenerMessage('PASSWORD_TOO_SHORT')).toBe(SHORTENER_MESSAGE_CATALOG.PASSWORD_TOO_SHORT);
    expect(getShortenerMessage('RATE_LIMITED')).toBe(SHORTENER_MESSAGE_CATALOG.RATE_LIMITED);
    expect(getShortenerMessage('SERVER_ERROR')).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
    expect(getShortenerMessage('OFFLINE_OR_NETWORK')).toBe(SHORTENER_MESSAGE_CATALOG.OFFLINE_OR_NETWORK);
    expect(getShortenerMessage('EXPIRY_INVALID')).toBe(SHORTENER_MESSAGE_CATALOG.EXPIRY_INVALID);
  });

  it('should fallback to friendly server error on unknown or null codes', () => {
    expect(getShortenerMessage(null)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
    expect(getShortenerMessage(undefined)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
    expect(getShortenerMessage('UNKNOWN_CODE_XYZ')).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
  });

  it('should sanitize raw Http failure responses into calm friendly text', () => {
    const rawHttp500 = 'Http failure response for http://urlshortener.localhost:4200/api/v1/short-links: 500 Internal Server Error';
    expect(isTechnicalErrorText(rawHttp500)).toBe(true);
    expect(sanitizeErrorMessage(rawHttp500)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);

    const httpErrorObj = {
      status: 500,
      message: rawHttp500,
      error: '<html><body>Internal Server Error</body></html>'
    };
    expect(sanitizeErrorMessage(httpErrorObj)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
  });

  it('should sanitize network/offline and client status codes safely', () => {
    expect(sanitizeErrorMessage({ status: 0 })).toBe(SHORTENER_MESSAGE_CATALOG.OFFLINE_OR_NETWORK);
    expect(sanitizeErrorMessage({ status: 404 })).toBe(SHORTENER_MESSAGE_CATALOG.LINK_UNAVAILABLE);
    expect(sanitizeErrorMessage({ status: 409 })).toBe(SHORTENER_MESSAGE_CATALOG.NAME_TAKEN);
    expect(sanitizeErrorMessage({ status: 429 })).toBe(SHORTENER_MESSAGE_CATALOG.RATE_LIMITED);
    expect(sanitizeErrorMessage({ status: 403 })).toBe(SHORTENER_MESSAGE_CATALOG.NO_PERMISSION);
  });

  it('should block leaked stack traces, SQL, and exception messages', () => {
    const sqlError = 'org.postgresql.util.PSQLException: ERROR: duplicate key value violates unique constraint';
    expect(isTechnicalErrorText(sqlError)).toBe(true);
    expect(sanitizeErrorMessage(sqlError)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);

    const nullPointer = 'NullPointerException: Cannot read field "code" because entity is null';
    expect(isTechnicalErrorText(nullPointer)).toBe(true);
    expect(sanitizeErrorMessage(nullPointer)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
  });

  it('should not contain banned technical words in user-facing message catalog', () => {
    const bannedPatterns = [
      /\bexception\b/i,
      /\bnull\b/i,
      /\bundefined\b/i,
      /\b404\b/,
      /\b500\b/,
      /\bsql\b/i,
      /\bdatabase\b/i,
      /\bquery\b/i,
      /\bstack\s*trace\b/i,
      /\btraceid\b/i,
      /\bpayload\b/i,
      /\bendpoint\b/i,
      /\bcors\b/i
    ];

    const entries = Object.entries(SHORTENER_MESSAGE_CATALOG);
    for (const [key, msg] of entries) {
      for (const pattern of bannedPatterns) {
        expect(
          pattern.test(msg),
          `Message key "${key}" contains banned word matching ${pattern}: "${msg}"`
        ).toBe(false);
      }
    }
  });

  it('should not contain exclamation marks in user-facing catalog', () => {
    for (const [key, msg] of Object.entries(SHORTENER_MESSAGE_CATALOG)) {
      expect(
        msg.includes('!'),
        `Message key "${key}" must not contain exclamation marks: "${msg}"`
      ).toBe(false);
    }
  });

  it('should keep messages concise (<= 120 characters)', () => {
    for (const [key, msg] of Object.entries(SHORTENER_MESSAGE_CATALOG)) {
      expect(
        msg.length,
        `Message key "${key}" exceeds 120 characters (${msg.length}): "${msg}"`
      ).toBeLessThanOrEqual(120);
    }
  });
});
