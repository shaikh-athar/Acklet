import { describe, it, expect } from 'vitest';
import { DataLensDiffService, StructuralDiffNode, DiffLineItem, DiffHunk, LineDecorationSegment } from './data-lens-diff.service';

describe('DataLensDiffService', () => {
  const service = new DataLensDiffService();

  describe('computeWordDiff', () => {
    it('diffs "DemoApp" vs "DemoAppX" without injecting synthetic placeholder text', () => {
      const left = 'name: "DemoApp"';
      const right = 'name: "DemoAppX"';

      const result = service.computeWordDiff(left, right);

      // Verify no synthetic tokens like "Nothing", "empty", "null", "undefined" exist
      const allLeftTexts = result.leftTokens.map(t => t.text);
      const allRightTexts = result.rightTokens.map(t => t.text);

      expect(allLeftTexts).not.toContain('Nothing');
      expect(allRightTexts).not.toContain('Nothing');
      expect(allLeftTexts).not.toContain('empty');
      expect(allRightTexts).not.toContain('empty');

      // Right tokens should contain the original words + added token "X"
      const addedTokens = result.rightTokens.filter(t => t.type === 'added');
      expect(addedTokens.length).toBeGreaterThanOrEqual(1);
      expect(addedTokens.some(t => t.text.includes('X'))).toBe(true);

      // Concatenated right text must equal the original right string exactly
      const reconstructedRight = result.rightTokens.map(t => t.text).join('');
      expect(reconstructedRight).toBe(right);
    });

    it('diffs word token replacement "DemoAppX" vs "DemoApp"', () => {
      const left = 'name: "DemoAppX"';
      const right = 'name: "DemoApp"';

      const result = service.computeWordDiff(left, right);

      // Left pane should have the removed token "DemoAppX"
      const removedTokens = result.leftTokens.filter(t => t.type === 'removed');
      expect(removedTokens.length).toBe(1);
      expect(removedTokens[0].text).toBe('DemoAppX');

      // Right pane should have the added token "DemoApp"
      const addedTokens = result.rightTokens.filter(t => t.type === 'added');
      expect(addedTokens.length).toBe(1);
      expect(addedTokens[0].text).toBe('DemoApp');

      const reconstructedLeft = result.leftTokens.map(t => t.text).join('');
      expect(reconstructedLeft).toBe(left);

      const reconstructedRight = result.rightTokens.map(t => t.text).join('');
      expect(reconstructedRight).toBe(right);
    });

    it('handles empty left or right inputs cleanly', () => {
      const resultEmptyLeft = service.computeWordDiff('', 'new text');
      expect(resultEmptyLeft.leftTokens.length).toBe(0);
      expect(resultEmptyLeft.rightTokens.map(t => t.text).join('')).toBe('new text');
      expect(resultEmptyLeft.rightTokens.every(t => t.type === 'added')).toBe(true);

      const resultEmptyRight = service.computeWordDiff('old text', '');
      expect(resultEmptyRight.rightTokens.length).toBe(0);
      expect(resultEmptyRight.leftTokens.map(t => t.text).join('')).toBe('old text');
      expect(resultEmptyRight.leftTokens.every(t => t.type === 'removed')).toBe(true);
    });

    it('handles exact match identical strings', () => {
      const text = '  "status": 200,';
      const result = service.computeWordDiff(text, text);
      expect(result.leftTokens.every(t => t.type === 'unchanged')).toBe(true);
      expect(result.rightTokens.every(t => t.type === 'unchanged')).toBe(true);
      expect(result.leftTokens.map(t => t.text).join('')).toBe(text);
      expect(result.rightTokens.map(t => t.text).join('')).toBe(text);
    });
  });

  describe('computeLineDiff', () => {
    it('correctly pairs modified lines and computes word diffs without extra strings', () => {
      const original = '{\n  "name": "DemoApp",\n  "version": "1.0.0"\n}';
      const modified = '{\n  "name": "DemoAppX",\n  "version": "1.0.0"\n}';

      const result = service.computeLineDiff(original, modified, false);

      expect(result.identical).toBe(false);
      expect(result.modifiedCount).toBe(1);
      expect(result.addedCount).toBe(0);
      expect(result.removedCount).toBe(0);

      const modifiedLine = result.lines.find(l => l.type === 'modified');
      expect(modifiedLine).toBeDefined();
      expect(modifiedLine?.leftText).toBe('  "name": "DemoApp",');
      expect(modifiedLine?.rightText).toBe('  "name": "DemoAppX",');

      // Check tokens
      expect(modifiedLine?.leftTokens?.some(t => t.text === 'Nothing')).toBeFalsy();
      expect(modifiedLine?.rightTokens?.some(t => t.text === 'Nothing')).toBeFalsy();
    });

    it('detects identical payloads', () => {
      const payload = '{\n  "status": "ok"\n}';
      const result = service.computeLineDiff(payload, payload, false);
      expect(result.identical).toBe(true);
      expect(result.totalChanges).toBe(0);
    });

    it('handles multiple additions and deletions across lines', () => {
      const left = 'line1\nline2\nline3';
      const right = 'line1\nline2-modified\nline3\nline4-added';
      const result = service.computeLineDiff(left, right, false);
      expect(result.identical).toBe(false);
      expect(result.totalChanges).toBe(2);
      expect(result.modifiedCount).toBe(1);
      expect(result.addedCount).toBe(1);
    });
  });

  describe('Structural AST Diff', () => {
    it('computes structural AST diff ignoring key ordering when configured', () => {
      const leftObj = { b: 2, a: 1 };
      const rightObj = { a: 1, b: 2 };
      const nodes = service.computeStructuralDiff(leftObj, rightObj, { ignoreKeyOrder: true });
      expect(nodes.every(n => n.type === 'unchanged')).toBe(true);
    });

    it('detects added, removed, and changed keys in structural diff', () => {
      const leftObj = { id: 1, name: 'Alice', role: 'guest' };
      const rightObj = { id: 1, name: 'Bob', role: 'admin', age: 30 };
      const nodes = service.computeStructuralDiff(leftObj, rightObj);

      const changed = nodes.filter(n => n.type === 'changed');
      const added = nodes.filter(n => n.type === 'added');
      expect(changed.some(n => n.path === '$.name')).toBe(true);
      expect(changed.some(n => n.path === '$.role')).toBe(true);
      expect(added.some(n => n.path === '$.age')).toBe(true);
    });

    it('masks sensitive fields when maskSensitive is true', () => {
      const leftObj = { username: 'john', password: 'secret123' };
      const rightObj = { username: 'john', password: 'secret456' };
      const nodes = service.computeStructuralDiff(leftObj, rightObj, { maskSensitive: true });
      const passNode = nodes.find(n => n.path.includes('password'));
      expect(passNode).toBeDefined();
      expect(passNode?.leftValue).toBe('***');
      expect(passNode?.rightValue).toBe('***');
    });
  });


  describe('Bug 1: Real-world slice-and-decorate rendering & exact text reconstruction', () => {
    const testCases = [
      {
        name: 'Case 1: version modification',
        left: '  version: "1.2.0"',
        right: '  version: "1.2.0"10'
      },
      {
        name: 'Case 2: password comment trailing text',
        left: '  password: "securepassword123" # In production, pull this from environment variables',
        right: '  password: "securepassword123" # In production, pull this from environment variables es'
      },
      {
        name: 'Case 3: theme value change with stray word check',
        left: '  "theme": "dark"',
        right: '  "theme": "dark" nothting'
      },
      {
        name: 'Case 4: endpoint URL change',
        left: '  endpoint: "https://auth.internal.local"',
        right: '  endpoint: "https://payments.internal.local"'
      },
      {
        name: 'Case 5: retry_count number change',
        left: '  retry_count: 3',
        right: '  retry_count: 5'
      },
      {
        name: 'Case 6: unchanged theme and notifications lines in full document diff',
        left: '    "theme": "dark",',
        right: '    "theme": "dark",'
      },
      {
        name: 'Case 7: unchanged notifications line in full document diff',
        left: '    "notifications": true,',
        right: '    "notifications": true,'
      },
      {
        name: 'Case 8: modified theme value change (dark vs light)',
        left: '    "theme": "dark",',
        right: '    "theme": "light",'
      }
    ];

    testCases.forEach(({ name, left, right }) => {
      it(`[${name}] strictly reconstructs exact left and right source strings without extra or glued text`, () => {
        const wordDiff = service.computeWordDiff(left, right);

        // 1. Left tokens must reconstruct exact left string
        const leftReconstructed = wordDiff.leftTokens.map(t => t.text).join('');
        expect(leftReconstructed).toBe(left);

        // 2. Right tokens must reconstruct exact right string
        const rightReconstructed = wordDiff.rightTokens.map(t => t.text).join('');
        expect(rightReconstructed).toBe(right);

        // 3. No token may introduce synthetic words like "Nothing", "empty", "null", "undefined"
        expect(wordDiff.leftTokens.some(t => t.text === 'Nothing' || t.text === 'nothting')).toBe(false);
        expect(wordDiff.leftTokens.every(t => t.type === 'unchanged' || t.type === 'removed')).toBe(true);
        expect(wordDiff.rightTokens.every(t => t.type === 'unchanged' || t.type === 'added')).toBe(true);

        // 4. sliceLineIntoSegments must reconstruct exact text including indent guides
        const leftSegments = service.sliceLineIntoSegments(left, 'modified', wordDiff.leftTokens, 2);
        const rightSegments = service.sliceLineIntoSegments(right, 'modified', wordDiff.rightTokens, 2);

        expect(leftSegments.map(s => s.text).join('')).toBe(left);
        expect(rightSegments.map(s => s.text).join('')).toBe(right);
      });
    });
  });

  describe('Audit & Fix Requirements Verification', () => {
    it('Requirement 2: preserves unchanged array elements (e.g. Productivity) when items are inserted or deleted', () => {
      const leftObj = {
        categories: ['Admin', 'Productivity', 'Utility']
      };
      const rightObj = {
        categories: ['Admin', 'Finance', 'Productivity', 'Utility']
      };

      const nodes = service.computeStructuralDiff(leftObj, rightObj);

      // 'Productivity' and 'Utility' must NOT be marked as changed
      const changedNodes = nodes.filter((n: StructuralDiffNode) => n.type === 'changed');
      expect(changedNodes.length).toBe(0);

      // Only 'Finance' is added
      const addedNodes = nodes.filter((n: StructuralDiffNode) => n.type === 'added');
      expect(addedNodes.length).toBe(1);
      expect(addedNodes[0].rightValue).toBe('Finance');

      // 'Admin', 'Productivity', 'Utility' are unchanged
      const unchangedNodes = nodes.filter((n: StructuralDiffNode) => n.type === 'unchanged');
      expect(unchangedNodes.some((n: StructuralDiffNode) => n.leftValue === 'Admin')).toBe(true);
      expect(unchangedNodes.some((n: StructuralDiffNode) => n.leftValue === 'Productivity')).toBe(true);
      expect(unchangedNodes.some((n: StructuralDiffNode) => n.leftValue === 'Utility')).toBe(true);
    });

    it('Requirement 3: classifies semantic replacements (e.g. 42 -> "42", true -> "true") as modifications/changed, not delete + add', () => {
      const leftObj = {
        count: 42,
        isEnabled: true,
        tags: [100, 200]
      };
      const rightObj = {
        count: '42',
        isEnabled: 'true',
        tags: ['100', 200]
      };

      const nodes = service.computeStructuralDiff(leftObj, rightObj);

      const countNode = nodes.find((n: StructuralDiffNode) => n.path === '$.count');
      expect(countNode).toBeDefined();
      expect(countNode?.type).toBe('changed');
      expect(countNode?.leftValue).toBe(42);
      expect(countNode?.rightValue).toBe('42');

      const enabledNode = nodes.find((n: StructuralDiffNode) => n.path === '$.isEnabled');
      expect(enabledNode).toBeDefined();
      expect(enabledNode?.type).toBe('changed');
      expect(enabledNode?.leftValue).toBe(true);
      expect(enabledNode?.rightValue).toBe('true');

      // tags[0]: 100 -> "100" is changed
      const tagChanged = nodes.find((n: StructuralDiffNode) => n.path === '$.tags[0]');
      expect(tagChanged).toBeDefined();
      expect(tagChanged?.type).toBe('changed');

      // tags[1]: 200 is unchanged
      const tagUnchanged = nodes.find((n: StructuralDiffNode) => n.path === '$.tags[1]');
      expect(tagUnchanged).toBeDefined();
      expect(tagUnchanged?.type).toBe('unchanged');
    });

    it('Requirement 4: Structural AST Diff ignores non-semantic changes (whitespace, indentation, key order)', () => {
      const leftJson = '{\n  "z": 100,\n  "a": "hello",\n  "b": [1, 2, 3]\n}';
      const rightJson = '{\n    "b": [1, 2, 3],\n    "a": "hello",\n    "z": 100\n}';

      const leftObj = JSON.parse(leftJson);
      const rightObj = JSON.parse(rightJson);

      const nodes = service.computeStructuralDiff(leftObj, rightObj, { ignoreKeyOrder: true });

      const changedOrAddedOrRemoved = nodes.filter((n: StructuralDiffNode) => n.type !== 'unchanged');
      expect(changedOrAddedOrRemoved.length).toBe(0);
    });

    it('Requirement 5: keeps Textual Diff and Structural AST Diff behaviors separate', () => {
      const leftFormatted = '{\n  "name": "App"\n}';
      const rightMinified = '{"name":"App"}';

      // Textual Diff reflects line format differences
      const textualDiff = service.computeLineDiff(leftFormatted, rightMinified, false);
      expect(textualDiff.identical).toBe(false);
      expect(textualDiff.totalChanges).toBeGreaterThan(0);

      // Structural AST Diff compares parsed JSON semantics
      const leftParsed = JSON.parse(leftFormatted);
      const rightParsed = JSON.parse(rightMinified);
      const structuralNodes = service.computeStructuralDiff(leftParsed, rightParsed);
      const structuralChanges = structuralNodes.filter((n: StructuralDiffNode) => n.type !== 'unchanged');
      expect(structuralChanges.length).toBe(0);
    });
  });

  describe('Git-Style Line-Level Textual Diff & Full-Line Highlighting', () => {
    it('highlights full line as modified for value changes (e.g. version 1.0 -> 2.0)', () => {
      const left = '{\n  "version": "1.0"\n}';
      const right = '{\n  "version": "2.0"\n}';

      const diff = service.computeLineDiff(left, right, false);
      expect(diff.identical).toBe(false);
      expect(diff.modifiedCount).toBe(1);
      expect(diff.addedCount).toBe(0);
      expect(diff.removedCount).toBe(0);

      const modLine = diff.lines.find((l: DiffLineItem) => l.type === 'modified');
      expect(modLine).toBeDefined();
      expect(modLine?.leftText).toBe('  "version": "1.0"');
      expect(modLine?.rightText).toBe('  "version": "2.0"');

      // Segments on left and right must have full line code content as 'modified', not word fragments
      const leftSegs = service.sliceLineIntoSegments(modLine!.leftText!, 'modified');
      const rightSegs = service.sliceLineIntoSegments(modLine!.rightText!, 'modified');

      const leftCodeSeg = leftSegs.find((s: LineDecorationSegment) => !s.isIndentGuide);
      expect(leftCodeSeg?.type).toBe('modified');
      expect(leftCodeSeg?.text).toBe('"version": "1.0"');

      const rightCodeSeg = rightSegs.find((s: LineDecorationSegment) => !s.isIndentGuide);
      expect(rightCodeSeg?.type).toBe('modified');
      expect(rightCodeSeg?.text).toBe('"version": "2.0"');
    });

    it('highlights full line as modified for type changes (e.g. id: 42 -> id: "42")', () => {
      const left = '  "id": 42';
      const right = '  "id": "42"';

      const diff = service.computeLineDiff(left, right, false);
      expect(diff.modifiedCount).toBe(1);

      const leftSegs = service.sliceLineIntoSegments(left, 'modified');
      const rightSegs = service.sliceLineIntoSegments(right, 'modified');

      expect(leftSegs.find((s: LineDecorationSegment) => !s.isIndentGuide)?.type).toBe('modified');
      expect(leftSegs.find((s: LineDecorationSegment) => !s.isIndentGuide)?.text).toBe('"id": 42');

      expect(rightSegs.find((s: LineDecorationSegment) => !s.isIndentGuide)?.type).toBe('modified');
      expect(rightSegs.find((s: LineDecorationSegment) => !s.isIndentGuide)?.text).toBe('"id": "42"');
    });

    it('handles multi-line replacement blocks with full-line highlights', () => {
      const left = '{\n  "host": "localhost",\n  "port": 8080\n}';
      const right = '{\n  "host": "production.server",\n  "port": 443\n}';

      const diff = service.computeLineDiff(left, right, false);
      expect(diff.modifiedCount).toBe(2);
      expect(diff.lines.filter((l: DiffLineItem) => l.type === 'unchanged').length).toBe(2); // { and }
    });

    it('correctly handles line additions that shift subsequent line numbers', () => {
      const left = '{\n  "name": "App",\n  "status": "active"\n}';
      const right = '{\n  "name": "App",\n  "version": "1.0",\n  "author": "Acklet",\n  "status": "active"\n}';

      const diff = service.computeLineDiff(left, right, false);
      expect(diff.addedCount).toBe(2);
      expect(diff.removedCount).toBe(0);
      expect(diff.modifiedCount).toBe(0);

      const addedLines = diff.lines.filter((l: DiffLineItem) => l.type === 'added');
      expect(addedLines[0].rightText).toBe('  "version": "1.0",');
      expect(addedLines[1].rightText).toBe('  "author": "Acklet",');
    });
  });

  describe('Sensitive Data Masking & Two-Level Token Highlighting', () => {
    it('masks sensitive password, token, secret, and apiKey fields in raw text with ••••••', () => {
      const rawText = `
        password: "securepassword123" # In production, pull this from environment variables
        "apiKey": "sk-live-998877665544"
        "client_secret": "my-secret-key"
        "token": "eyJhbGciOiJIUzI1Ni..."
        name: "DemoApp"
      `;

      const masked = service.maskSensitiveText(rawText);

      expect(masked).toContain('password: "••••••" # In production, pull this from environment variables');
      expect(masked).toContain('"apiKey": "••••••"');
      expect(masked).toContain('"client_secret": "••••••"');
      expect(masked).toContain('"token": "••••••"');
      expect(masked).toContain('name: "DemoApp"');
      expect(masked).not.toContain('securepassword123');
      expect(masked).not.toContain('sk-live-998877665544');
    });

    it('identifies exact changed tokens within modified lines', () => {
      const leftLine = '  "environment": "development"';
      const rightLine = '  "environment": "staging"';

      const wordDiff = service.computeWordDiff(leftLine, rightLine);

      // Left tokens should identify "development" as removed
      const leftChanged = wordDiff.leftTokens.find((t: any) => t.type === 'removed');
      expect(leftChanged?.text).toBe('development');

      // Right tokens should identify "staging" as added
      const rightChanged = wordDiff.rightTokens.find((t: any) => t.type === 'added');
      expect(rightChanged?.text).toBe('staging');

      // Two-level sliceLineIntoSegments:
      const leftSegments = service.sliceLineIntoSegments(leftLine, 'modified', wordDiff.leftTokens, 2, true);
      const rightSegments = service.sliceLineIntoSegments(rightLine, 'modified', wordDiff.rightTokens, 2, true);

      expect(leftSegments.find((s: LineDecorationSegment) => s.type === 'removed')?.text).toBe('development');
      expect(rightSegments.find((s: LineDecorationSegment) => s.type === 'added')?.text).toBe('staging');
      expect(leftSegments.map((s: LineDecorationSegment) => s.text).join('')).toBe(leftLine);
      expect(rightSegments.map((s: LineDecorationSegment) => s.text).join('')).toBe(rightLine);
    });

    it('computes actionable hunks for modified, added, and removed blocks', () => {
      const original = '{\n  "name": "App",\n  "id": 42,\n  "role": "admin"\n}';
      const modified = '{\n  "name": "App",\n  "id": 43\n}';

      const result = service.computeLineDiff(original, modified, false);

      expect(result.hunks).toBeDefined();
      expect(result.hunks.length).toBeGreaterThanOrEqual(1);

      // Verify the value modification hunk ("id": 42 -> "id": 43)
      const modHunk = result.hunks.find((h: DiffHunk) => h.type === 'modified');
      expect(modHunk).toBeDefined();
      expect(modHunk?.leftStartLine).toBe(3);
      expect(modHunk?.rightStartLine).toBe(3);

      // Verify the deletion hunk ("role": "admin" removed)
      const delHunk = result.hunks.find((h: DiffHunk) => h.type === 'removed');
      expect(delHunk).toBeDefined();
      expect(delHunk?.leftStartLine).toBe(4);
    });
  });
});
