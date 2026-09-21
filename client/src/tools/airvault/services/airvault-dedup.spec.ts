import { normalizeUrlForDedup, normalizeTextForDedup, computeDedupKey, computeDedupKeySync, checkDuplicateResource } from './airvault-action-detector';

describe('AirVault Semantic Deduplication', () => {
  describe('URL Normalization', () => {
    it('Scenario 1: should normalize same URL with and without trailing slash', async () => {
      const urlA = 'https://example.com/blog/article/';
      const urlB = 'https://example.com/blog/article';
      const keyA = await computeDedupKey('url', urlA);
      const keyB = await computeDedupKey('url', urlB);
      expect(keyA).toBe(keyB);
      expect(keyA).toBe('url:https://example.com/blog/article');
    });

    it('Scenario 1b: should normalize root domain with and without trailing slash', async () => {
      const urlA = 'https://example.com/';
      const urlB = 'https://example.com';
      const keyA = await computeDedupKey('url', urlA);
      const keyB = await computeDedupKey('url', urlB);
      expect(keyA).toBe(keyB);
      expect(keyA).toBe('url:https://example.com');
    });

    it('Scenario 2: should strip tracking parameters (utm_*, fbclid, gclid)', async () => {
      const base = 'https://example.com/product?id=123';
      const tracked = 'https://example.com/product?id=123&utm_source=twitter&utm_medium=social&utm_campaign=launch&fbclid=IwAR123&gclid=CjwKCA';
      const keyBase = await computeDedupKey('url', base);
      const keyTracked = await computeDedupKey('url', tracked);
      expect(keyTracked).toBe(keyBase);
    });

    it('Scenario 3: should handle http vs https URLs without collapsing across protocols unless normalized', async () => {
      const httpUrl = 'http://example.com/page';
      const httpsUrl = 'https://example.com/page';
      const keyHttp = await computeDedupKey('url', httpUrl);
      const keyHttps = await computeDedupKey('url', httpsUrl);
      expect(keyHttp).not.toBe(keyHttps);
      expect(keyHttp).toBe('url:http://example.com/page');
      expect(keyHttps).toBe('url:https://example.com/page');
    });

    it('Scenario 4: should normalize domain casing but preserve path casing', async () => {
      const urlUpperDomain = 'https://Example.COM/PathCaseSensitive?query=Val';
      const urlLowerDomain = 'https://example.com/PathCaseSensitive?query=Val';
      const keyUpper = await computeDedupKey('url', urlUpperDomain);
      const keyLower = await computeDedupKey('url', urlLowerDomain);
      expect(keyUpper).toBe(keyLower);
      expect(keyUpper).toBe('url:https://example.com/PathCaseSensitive?query=Val');
    });

    it('Scenario 4b: should not collapse different path casings', async () => {
      const urlPathA = 'https://example.com/Api/V1/Resource';
      const urlPathB = 'https://example.com/api/v1/resource';
      const keyA = await computeDedupKey('url', urlPathA);
      const keyB = await computeDedupKey('url', urlPathB);
      expect(keyA).not.toBe(keyB);
    });
  });

  describe('Text / Code Normalization', () => {
    it('Scenario 5: should collapse text with only whitespace/line-ending differences', async () => {
      const textCRLF = 'function test() {\r\n    console.log("hello");\r\n\r\n\r\n}\r\n';
      const textLF = '  function test() {\n    console.log("hello");\n\n}\n  ';
      const keyA = await computeDedupKey('code', textCRLF);
      const keyB = await computeDedupKey('code', textLF);
      expect(keyA).toBe(keyB);
    });

    it('should distinguish meaningfully different code/text', async () => {
      const textA = 'const x = 10;';
      const textB = 'const x = 20;';
      const keyA = await computeDedupKey('code', textA);
      const keyB = await computeDedupKey('code', textB);
      expect(keyA).not.toBe(keyB);
    });
  });

  describe('File Byte Hashing', () => {
    it('Scenario 6: should collapse same file bytes under two different filenames', async () => {
      const fileBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const keyFileA = await computeDedupKey('file', 'dataA', fileBytes);
      const keyFileB = await computeDedupKey('file', 'dataB', fileBytes);
      expect(keyFileA).toBe(keyFileB);
      expect(keyFileA.startsWith('file:')).toBe(true);
    });

    it('Scenario 7: should NOT collapse different files with the same filename', async () => {
      const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
      const bytes2 = new Uint8Array([5, 4, 3, 2, 1]);
      const key1 = await computeDedupKey('file', 'document.pdf', bytes1);
      const key2 = await computeDedupKey('file', 'document.pdf', bytes2);
      expect(key1).not.toBe(key2);
    });
  });

  describe('checkDuplicateResource for Paired Users', () => {
    it('should detect duplicate when new resource matches paired user resource content', () => {
      const newResource = {
        id: 'res-new',
        content: {
          category: 'text',
          raw: 'Shared secret token or text payload'
        }
      };
      const pairedUsersResources = [
        {
          id: 'res-existing',
          senderDeviceName: '@charlie',
          content: {
            category: 'text',
            raw: 'Shared secret token or text payload'
          }
        }
      ];

      const result = checkDuplicateResource(newResource, pairedUsersResources);
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedUsername).toBe('@charlie');
    });

    it('should detect duplicate via semantic dedup key (e.g. whitespace differences in code)', () => {
      const newResource = {
        id: 'res-new-code',
        content: {
          category: 'code',
          raw: 'function hello() {\r\n  return 42;\r\n}\r\n'
        }
      };
      const pairedUsersResources = [
        {
          id: 'res-paired-code',
          senderDeviceName: '@alice',
          content: {
            category: 'code',
            raw: '  function hello() {\n  return 42;\n}\n  '
          }
        }
      ];

      const result = checkDuplicateResource(newResource, pairedUsersResources);
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedUsername).toBe('@alice');
    });

    it('should return isDuplicate: false when no matching resource is found', () => {
      const newResource = {
        id: 'res-unique',
        content: {
          category: 'text',
          raw: 'Completely unique text payload'
        }
      };
      const pairedUsersResources = [
        {
          id: 'res-paired-1',
          senderDeviceName: '@bob',
          content: {
            category: 'text',
            raw: 'Different text content'
          }
        }
      ];

      const result = checkDuplicateResource(newResource, pairedUsersResources);
      expect(result.isDuplicate).toBe(false);
      expect(result.matchedUsername).toBe('');
    });
  });
});
