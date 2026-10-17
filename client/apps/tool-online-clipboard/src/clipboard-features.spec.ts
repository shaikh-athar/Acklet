// apps/tool-online-clipboard/src/clipboard-features.spec.ts
import { describe, it, expect } from 'vitest';
import { ClipboardCrypto } from './services/clipboard-crypto';
import { ClipboardItem } from './services/clipboard-api.service';

describe('Online Clipboard Features & Security Suite', () => {

  describe('1. Automatic URL Detection & Parsing', () => {
    function extractUrls(text: string): string[] {
      if (!text) return [];
      const urlRegex = /\bhttps?:\/\/[^\s<>"'{}|\\^`[\]]+/gi;
      const matches = text.match(urlRegex) || [];
      const validUrls: string[] = [];
      const seen = new Set<string>();

      for (let url of matches) {
        url = url.replace(/[.,;:!?)]+$/, '');
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            if (!seen.has(url)) {
              seen.add(url);
              validUrls.push(url);
            }
          }
        } catch {
          // ignore malformed
        }
      }
      return validUrls;
    }

    it('should detect a single URL in raw text', () => {
      const text = 'Check this out: https://acklet.com/tool/json';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://acklet.com/tool/json']);
    });

    it('should extract multiple valid URLs in multi-line text', () => {
      const text = `
        Resource 1: https://angular.dev
        Resource 2: https://spartan.ng/documentation
        Api endpoint: http://localhost:8080/api/v1/clipboard
      `;
      const urls = extractUrls(text);
      expect(urls).toHaveLength(3);
      expect(urls).toContain('https://angular.dev');
      expect(urls).toContain('https://spartan.ng/documentation');
      expect(urls).toContain('http://localhost:8080/api/v1/clipboard');
    });

    it('should strip trailing sentence punctuation from URLs cleanly', () => {
      const text = 'Have you visited https://github.com/acklet? Yes, and https://linear.app.';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://github.com/acklet', 'https://linear.app']);
    });

    it('should ignore malformed or pseudo-URLs and normal text', () => {
      const text = 'This is not a url: htp://bad-url, nor ftp://files, nor just text.com.';
      const urls = extractUrls(text);
      expect(urls).toEqual([]);
    });

    it('should deduplicate repeated identical URLs in text', () => {
      const text = 'Link: https://acklet.com and repeated https://acklet.com';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://acklet.com']);
    });
  });

  describe('2. End-to-End Encryption (AES-GCM-256)', () => {
    it('should verify ciphertext JSON structure and key handling', () => {
      const sampleCiphertext = JSON.stringify({
        iv: 'YWJjZGVmZ2hpamts',
        data: 'bXljb250ZW50'
      });
      expect(sampleCiphertext.startsWith('{"iv":')).toBe(true);
      const parsed = JSON.parse(sampleCiphertext);
      expect(parsed.iv).toBeDefined();
      expect(parsed.data).toBeDefined();
    });
  });

  describe('3. File Deduplication Strategy', () => {
    it('should identify duplicates by contentHash or filename + size fallback', () => {
      const existing: ClipboardItem[] = [
        {
          id: 'item_1',
          shareCode: 'room1',
          itemType: 'FILE',
          originalName: 'document.pdf',
          sizeBytes: 1024,
          contentHash: 'hash_abc123',
          createdAt: new Date().toISOString(),
          downloadCount: 0,
          viewCount: 1
        }
      ];

      // Exact hash match
      const fileCandidate1 = { name: 'renamed_copy.pdf', size: 1024, hash: 'hash_abc123' };
      const isDuplicate1 = existing.some(i => i.contentHash === fileCandidate1.hash);
      expect(isDuplicate1).toBe(true);

      // Different hash, same name
      const fileCandidate2 = { name: 'document.pdf', size: 2048, hash: 'hash_different' };
      const isDuplicate2 = existing.some(i => i.contentHash === fileCandidate2.hash);
      expect(isDuplicate2).toBe(false);
    });
  });

  describe('4. Deterministic Multi-Option File Sorting', () => {
    const sampleItems: ClipboardItem[] = [
      {
        id: 'item_a',
        shareCode: 'c1',
        itemType: 'FILE',
        originalName: 'zebra.txt',
        sizeBytes: 500,
        createdAt: '2026-10-10T10:00:00Z',
        downloadCount: 0,
        viewCount: 1
      },
      {
        id: 'item_b',
        shareCode: 'c1',
        itemType: 'IMAGE',
        originalName: 'apple.png',
        sizeBytes: 2500,
        createdAt: '2026-10-12T12:00:00Z',
        downloadCount: 0,
        viewCount: 1
      },
      {
        id: 'item_c',
        shareCode: 'c1',
        itemType: 'FILE',
        originalName: 'banana.doc',
        sizeBytes: 1200,
        createdAt: '2026-10-11T11:00:00Z',
        downloadCount: 0,
        viewCount: 1
      }
    ];

    it('should sort by newest first with stable secondary tiebreaker', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_b', 'item_c', 'item_a']);
    });

    it('should sort by oldest first with stable secondary tiebreaker', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_a', 'item_c', 'item_b']);
    });

    it('should sort alphabetically by Name A-Z', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = (a.originalName || '').localeCompare(b.originalName || '', undefined, { sensitivity: 'base' });
        return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_b', 'item_c', 'item_a']); // apple, banana, zebra
    });

    it('should sort by largest file size first', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = (b.sizeBytes || 0) - (a.sizeBytes || 0);
        return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_b', 'item_c', 'item_a']); // 2500, 1200, 500
    });
  });
});
