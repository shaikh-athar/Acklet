// client/apps/tool-qr-generator/src/utils/store-link-normalizer.spec.ts
import { describe, it, expect } from 'vitest';
import { normalizeIosAppInput, normalizeAndroidAppInput } from './store-link-normalizer';

describe('StoreLinkNormalizer', () => {
  describe('normalizeIosAppInput', () => {
    it('normalizes bare numeric ID to canonical App Store URL', () => {
      const res = normalizeIosAppInput('324684580');
      expect(res.isValid).toBe(true);
      expect(res.canonicalUrl).toBe('https://apps.apple.com/app/id324684580');
      expect(res.identifier).toBe('id324684580');
    });

    it('normalizes ID prefixed with id to canonical App Store URL', () => {
      const res = normalizeIosAppInput('id1234567890');
      expect(res.isValid).toBe(true);
      expect(res.canonicalUrl).toBe('https://apps.apple.com/app/id1234567890');
    });

    it('accepts valid full App Store URL and extracts app ID', () => {
      const url = 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580';
      const res = normalizeIosAppInput(url);
      expect(res.isValid).toBe(true);
      expect(res.canonicalUrl).toBe(url);
      expect(res.identifier).toBe('id324684580');
    });

    it('blocks non-store links like google.com/maps with a friendly error', () => {
      const res = normalizeIosAppInput('https://www.google.com/maps');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('is not an Apple App Store link');
    });
  });

  describe('normalizeAndroidAppInput', () => {
    it('normalizes bare package name to canonical Google Play URL', () => {
      const res = normalizeAndroidAppInput('com.spotify.music');
      expect(res.isValid).toBe(true);
      expect(res.canonicalUrl).toBe('https://play.google.com/store/apps/details?id=com.spotify.music');
      expect(res.identifier).toBe('com.spotify.music');
    });

    it('normalizes multi-segment package names like org.mozilla.firefox', () => {
      const res = normalizeAndroidAppInput('org.mozilla.firefox');
      expect(res.isValid).toBe(true);
      expect(res.canonicalUrl).toBe('https://play.google.com/store/apps/details?id=org.mozilla.firefox');
    });

    it('accepts valid Google Play Store URL and extracts package ID', () => {
      const url = 'https://play.google.com/store/apps/details?id=com.instagram.android&hl=en';
      const res = normalizeAndroidAppInput(url);
      expect(res.isValid).toBe(true);
      expect(res.canonicalUrl).toBe(url);
      expect(res.identifier).toBe('com.instagram.android');
    });

    it('blocks non-store links like google.com/maps with a friendly error', () => {
      const res = normalizeAndroidAppInput('https://www.google.com/maps');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('is not a Google Play Store link');
    });
  });
});
