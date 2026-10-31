import { describe, it, expect } from 'vitest';
import { SHORTENER_MESSAGE_CATALOG, getShortenerMessage } from './shortener-messages';

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
  });

  it('should fallback to friendly server error on unknown or null codes', () => {
    expect(getShortenerMessage(null)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
    expect(getShortenerMessage(undefined)).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
    expect(getShortenerMessage('UNKNOWN_CODE_XYZ')).toBe(SHORTENER_MESSAGE_CATALOG.SERVER_ERROR);
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
