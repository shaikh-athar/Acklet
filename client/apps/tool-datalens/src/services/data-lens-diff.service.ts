import { Injectable } from '@angular/core';

export type DiffChangeType = 'unchanged' | 'added' | 'removed' | 'modified';

export interface LineDecorationSegment {
  text: string;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  isIndentGuide?: boolean;
}

export interface DiffWordToken {
  text: string;
  type: 'unchanged' | 'added' | 'removed';
}

export interface DiffLineItem {
  leftLineNum?: number;
  rightLineNum?: number;
  type: DiffChangeType;
  leftText?: string;
  rightText?: string;
  leftTokens?: DiffWordToken[];
  rightTokens?: DiffWordToken[];
}

export interface DiffFoldRegion {
  startIndex: number;
  count: number;
  lines: DiffLineItem[];
}

export interface StructuralDiffNode {
  path: string;
  type: 'added' | 'removed' | 'changed' | 'moved' | 'unchanged';
  leftValue?: any;
  rightValue?: any;
  fromPath?: string;
}

export interface SideBySideCell {
  lineNum?: number;
  text?: string;
  tokens?: DiffWordToken[];
  type: DiffChangeType | 'placeholder';
}

export interface AlignedSideBySideRow {
  left: SideBySideCell;
  right: SideBySideCell;
}

export interface DiffOptions {
  ignoreKeyOrder: boolean;
  ignoreArrayOrder: boolean;
  arrayMatchKey: string;
  ignoreWhitespace: boolean;
  typeCoercion: boolean;
  caseInsensitive: boolean;
  excludePaths: string;
  maskSensitive: boolean;
  customSensitivePatterns: string;
  numericTolerance: number;
  detectMoves: boolean;
}


export interface DiffHunk {
  id: number;
  type: 'added' | 'removed' | 'modified';
  leftStartLine?: number;
  leftEndLine?: number;
  rightStartLine?: number;
  rightEndLine?: number;
  lines: DiffLineItem[];
}

export interface DiffComputationResult {
  lines: DiffLineItem[];
  displayItems: (DiffLineItem | DiffFoldRegion)[];
  alignedRows: (AlignedSideBySideRow | DiffFoldRegion)[];
  hunks: DiffHunk[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  totalChanges: number;
  identical: boolean;
  changeIndices: number[];
}

@Injectable({
  providedIn: 'root'
})
export class DataLensDiffService {

  getDefaultOptions(): DiffOptions {
    return {
      ignoreKeyOrder: true,
      ignoreArrayOrder: false,
      arrayMatchKey: 'id',
      ignoreWhitespace: false,
      typeCoercion: false,
      caseInsensitive: false,
      excludePaths: '',
      maskSensitive: false,
      customSensitivePatterns: '',
      numericTolerance: 0,
      detectMoves: true
    };
  }

  /**
   * Compute line-level diff using Longest Common Subsequence (LCS / Myers algorithm)
   */
  computeLineDiff(
    leftStr: string,
    rightStr: string,
    foldUnchanged = true,
    minFoldSize = 6
  ): DiffComputationResult {
    const leftLines = (leftStr || '').split('\n');
    const rightLines = (rightStr || '').split('\n');

    const lcsMatrix = this.buildLCSMatrix(leftLines, rightLines);
    const rawItems: DiffLineItem[] = [];

    let i = leftLines.length;
    let j = rightLines.length;

    const backtrackStack: DiffLineItem[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
        backtrackStack.push({
          leftLineNum: i,
          rightLineNum: j,
          type: 'unchanged',
          leftText: leftLines[i - 1],
          rightText: rightLines[j - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
        backtrackStack.push({
          rightLineNum: j,
          type: 'added',
          rightText: rightLines[j - 1]
        });
        j--;
      } else if (i > 0 && (j === 0 || lcsMatrix[i][j - 1] < lcsMatrix[i - 1][j])) {
        backtrackStack.push({
          leftLineNum: i,
          type: 'removed',
          leftText: leftLines[i - 1]
        });
        i--;
      }
    }

    rawItems.push(...backtrackStack.reverse());

    const items = this.pairModifiedLines(rawItems);

    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;

    items.forEach(item => {
      if (item.type === 'added') addedCount++;
      if (item.type === 'removed') removedCount++;
      if (item.type === 'modified') modifiedCount++;
    });

    const totalChanges = addedCount + removedCount + modifiedCount;
    const identical = totalChanges === 0;

    const { displayItems, changeIndices } = this.buildDisplayItems(items, foldUnchanged, minFoldSize);
    const alignedRows = this.buildAlignedSideBySideRows(displayItems);
    const hunks = this.computeHunks(items);

    return {
      lines: items,
      displayItems,
      alignedRows,
      hunks,
      addedCount,
      removedCount,
      modifiedCount,
      totalChanges,
      identical,
      changeIndices
    };
  }

  /**
   * Compute character/word level tokens for a modified line pair
   */
  /**
   * Mask sensitive keys in raw JSON/YAML text before diff computation and display.
   */
  /**
   * Mask sensitive keys in raw JSON/YAML text before diff computation and display.
   */
  maskSensitiveText(text: string, customPatterns = ''): string {
    if (!text) return text;

    // Base sensitive keywords
    const defaultKeys = 'password|passwd|secret|token|api[_-]?key|access[_-]?token|auth(?:orization)?|private[_-]?key|client[_-]?secret|credentials?|ssn|credit[_-]?card';
    let combinedPattern = defaultKeys;

    if (customPatterns && customPatterns.trim()) {
      const customs = customPatterns.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      if (customs.length > 0) {
        const escaped = customs.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        combinedPattern = `${defaultKeys}|${escaped}`;
      }
    }

    // 1. Mask quoted string values (e.g. "password": "secret" or password: "secret")
    const sensitiveStringRegex = new RegExp(`("(?:${combinedPattern})"\\s*:\\s*)(["'])([^"'\n\r]+?)\\2`, 'gi');
    let masked = text.replace(sensitiveStringRegex, (_m, prefix, quote) => `${prefix}${quote}••••••${quote}`);

    // Also support unquoted YAML-style keys with quoted values (e.g. password: "secret")
    const yamlStringRegex = new RegExp(`(^|\\n)([ \\t]*(?:${combinedPattern})\\s*:\\s*)(["'])([^"'\n\r]+?)\\3`, 'gi');
    masked = masked.replace(yamlStringRegex, (_m, newline, prefix, quote) => `${newline}${prefix}${quote}••••••${quote}`);

    // 2. Mask unquoted values (e.g. password: secret123)
    const sensitiveUnquotedRegex = new RegExp(`("(?:${combinedPattern})"\\s*:\\s*)([^"',\\s{}\\[\\]]+)`, 'gi');
    masked = masked.replace(sensitiveUnquotedRegex, (_m, prefix, val) => {
      if (val === 'null' || val === 'undefined' || val === '••••••' || val.startsWith('"') || val.startsWith("'")) return `${prefix}${val}`;
      return `${prefix}••••••`;
    });

    const yamlUnquotedRegex = new RegExp(`(^|\\n)([ \\t]*(?:${combinedPattern})\\s*:\\s*)([^"',\\s{}\\[\\]]+)`, 'gi');
    masked = masked.replace(yamlUnquotedRegex, (_m, newline, prefix, val) => {
      if (val === 'null' || val === 'undefined' || val === '••••••' || val.startsWith('"') || val.startsWith("'")) return `${newline}${prefix}${val}`;
      return `${newline}${prefix}••••••`;
    });

    return masked;
  }

  /**
   * Count occurrences of masked secrets in text.
   */
  countMaskedSecrets(text: string, customPatterns = ''): number {
    if (!text) return 0;
    const defaultKeys = 'password|passwd|secret|token|api[_-]?key|access[_-]?token|auth(?:orization)?|private[_-]?key|client[_-]?secret|credentials?|ssn|credit[_-]?card';
    let combinedPattern = defaultKeys;

    if (customPatterns && customPatterns.trim()) {
      const customs = customPatterns.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      if (customs.length > 0) {
        const escaped = customs.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        combinedPattern = `${defaultKeys}|${escaped}`;
      }
    }

    const regex = new RegExp(`("?(?:${combinedPattern})"\\s*:\\s*)(["']?)(.*?)\\2`, 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Mask sensitive keys recursively in parsed objects.
   */
  maskSensitiveObject(obj: any, customPatterns = ''): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveObject(item, customPatterns));
    }

    const defaultKeys = 'password|passwd|secret|token|api[_-]?key|access[_-]?token|auth(?:orization)?|private[_-]?key|client[_-]?secret|credentials?|ssn|credit[_-]?card';
    let combinedPattern = defaultKeys;
    if (customPatterns && customPatterns.trim()) {
      const customs = customPatterns.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      if (customs.length > 0) {
        const escaped = customs.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        combinedPattern = `${defaultKeys}|${escaped}`;
      }
    }

    const sensitivePattern = new RegExp(`^(${combinedPattern})$`, 'i');
    const result: any = {};
    for (const key of Object.keys(obj)) {
      if (sensitivePattern.test(key)) {
        result[key] = '••••••';
      } else {
        result[key] = this.maskSensitiveObject(obj[key], customPatterns);
      }
    }
    return result;
  }

  /**
   * Tokenize text into words, whitespace, and punctuation symbols.
   */
  tokenizeText(text: string): string[] {
    if (!text) return [];
    const tokens = text.match(/[a-zA-Z0-9_]+|\s+|[^\s\w]/g);
    return tokens && tokens.length > 0 ? tokens : [text];
  }

  /**
   * Compute word/token-level LCS between two lines for hierarchical inline highlight.
   */
  computeWordDiff(leftText: string, rightText: string): { leftTokens: DiffWordToken[]; rightTokens: DiffWordToken[] } {
    if (!leftText && !rightText) {
      return { leftTokens: [], rightTokens: [] };
    }
    if (!leftText) {
      return {
        leftTokens: [],
        rightTokens: [{ text: rightText, type: 'added' }]
      };
    }
    if (!rightText) {
      return {
        leftTokens: [{ text: leftText, type: 'removed' }],
        rightTokens: []
      };
    }
    if (leftText === rightText) {
      return {
        leftTokens: [{ text: leftText, type: 'unchanged' }],
        rightTokens: [{ text: rightText, type: 'unchanged' }]
      };
    }

    const leftTokens = this.tokenizeText(leftText);
    const rightTokens = this.tokenizeText(rightText);

    const m = leftTokens.length;
    const n = rightTokens.length;
    const lcs = this.buildLCSMatrix(leftTokens, rightTokens);

    let i = m;
    let j = n;

    const leftTokensStack: DiffWordToken[] = [];
    const rightTokensStack: DiffWordToken[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && leftTokens[i - 1] === rightTokens[j - 1]) {
        leftTokensStack.push({ text: leftTokens[i - 1], type: 'unchanged' });
        rightTokensStack.push({ text: rightTokens[j - 1], type: 'unchanged' });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
        rightTokensStack.push({ text: rightTokens[j - 1], type: 'added' });
        j--;
      } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
        leftTokensStack.push({ text: leftTokens[i - 1], type: 'removed' });
        i--;
      }
    }

    const rawLeft = leftTokensStack.reverse();
    const rawRight = rightTokensStack.reverse();

    return {
      leftTokens: this.groupAdjacentTokens(rawLeft),
      rightTokens: this.groupAdjacentTokens(rawRight)
    };
  }

  private groupAdjacentTokens(tokens: DiffWordToken[]): DiffWordToken[] {
    if (tokens.length === 0) return [];
    const grouped: DiffWordToken[] = [];
    let current = { text: tokens[0].text, type: tokens[0].type };

    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].type === current.type) {
        current.text += tokens[i].text;
      } else {
        if (current.text) grouped.push(current);
        current = { text: tokens[i].text, type: tokens[i].type };
      }
    }
    if (current.text) grouped.push(current);
    return grouped;
  }

  /**
   * Slice a line into rendered segments including leading indent guides and two-level diff highlights.
   * Guarantees that segments.map(s => s.text).join('') === lineText exactly.
   */
  sliceLineIntoSegments(
    lineText: string,
    diffType: 'unchanged' | 'added' | 'removed' | 'modified',
    tokens?: DiffWordToken[],
    indentSize = 2,
    enableTokenHighlight = true
  ): LineDecorationSegment[] {
    if (!lineText) return [];

    const leadingWhitespaceMatch = lineText.match(/^(\s+)/);
    const leadingWs = leadingWhitespaceMatch ? leadingWhitespaceMatch[1] : '';
    const leadingWsLen = leadingWs.length;
    const codeContent = lineText.slice(leadingWsLen);

    const segments: LineDecorationSegment[] = [];

    // 1. Emit Indent Guides for leading whitespace
    if (leadingWsLen > 0) {
      let wsRem = leadingWs;
      while (wsRem.length >= indentSize) {
        segments.push({
          text: wsRem.slice(0, indentSize),
          type: 'unchanged',
          isIndentGuide: true
        });
        wsRem = wsRem.slice(indentSize);
      }
      if (wsRem.length > 0) {
        segments.push({
          text: wsRem,
          type: 'unchanged',
          isIndentGuide: false
        });
      }
    }

    // 2. If no code content, we're done
    if (codeContent.length === 0) {
      return segments;
    }

    // 3. If line is modified and token highlighting is enabled, slice from lineText
    if (diffType === 'modified' && enableTokenHighlight && tokens && tokens.length > 0) {
      const tokenJoined = tokens.map(t => t.text).join('');
      if (tokenJoined === lineText) {
        let charOffset = 0;
        tokens.forEach(tok => {
          const tokStart = charOffset;
          const tokEnd = charOffset + tok.text.length;
          charOffset = tokEnd;

          if (tokEnd <= leadingWsLen) {
            return;
          } else if (tokStart < leadingWsLen) {
            const slice = lineText.slice(leadingWsLen, tokEnd);
            if (slice) {
              segments.push({ text: slice, type: tok.type, isIndentGuide: false });
            }
          } else {
            const slice = lineText.slice(tokStart, tokEnd);
            if (slice) {
              segments.push({ text: slice, type: tok.type, isIndentGuide: false });
            }
          }
        });
      } else {
        segments.push({
          text: codeContent,
          type: diffType,
          isIndentGuide: false
        });
      }
    } else {
      segments.push({
        text: codeContent,
        type: diffType,
        isIndentGuide: false
      });
    }

    // Canary assertion: verify output segments reconstruct the exact lineText passed in
    const reconstructed = segments.map(s => s.text).join('');
    if (reconstructed !== lineText) {
      console.error(
        `[CANARY MISMATCH in sliceLineIntoSegments]\n` +
        `Expected lineText: ${JSON.stringify(lineText)}\n` +
        `Actual segments:   ${JSON.stringify(reconstructed)}\n` +
        `DiffType: ${diffType}, Tokens: ${JSON.stringify(tokens)}`
      );
    }

    return segments;
  }

  /**
   * Structural AST / Object Diff Mode with Specialized Operations
   */
  computeStructuralDiff(leftObj: any, rightObj: any, options: Partial<DiffOptions> = {}): StructuralDiffNode[] {
    const opts = { ...this.getDefaultOptions(), ...options };
    const nodes: StructuralDiffNode[] = [];
    this.diffWalk(leftObj, rightObj, '$', nodes, opts);

    let filtered = nodes;
    if (opts.excludePaths) {
      const patterns = opts.excludePaths.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      filtered = filtered.filter(node => !patterns.some(pat => {
        const cleanPat = pat.replace(/\*\*/g, '.*').replace(/\*/g, '[^.]+');
        try {
          return new RegExp(cleanPat).test(node.path) || node.path.includes(pat);
        } catch {
          return node.path.includes(pat);
        }
      }));
    }

    if (opts.maskSensitive) {
      filtered = filtered.map(node => {
        if (this.isSensitiveKey(node.path, opts.customSensitivePatterns)) {
          return {
            ...node,
            leftValue: node.leftValue !== undefined ? '***' : undefined,
            rightValue: node.rightValue !== undefined ? '***' : undefined
          };
        }
        return node;
      });
    }

    if (opts.detectMoves) {
      filtered = this.detectMovedNodes(filtered);
    }

    return filtered;
  }


  /**
   * Generate Summary CSV Exporter
   */
  exportSummaryCsv(nodes: StructuralDiffNode[]): string {
    const header = 'Path,ChangeType,OldValue,NewValue';
    const rows = nodes
      .filter(n => n.type !== 'unchanged')
      .map(n => {
        const path = `"${n.path.replace(/"/g, '""')}"`;
        const type = `"${n.type}"`;
        const oldVal = `"${JSON.stringify(n.leftValue ?? '').replace(/"/g, '""')}"`;
        const newVal = `"${JSON.stringify(n.rightValue ?? '').replace(/"/g, '""')}"`;
        return `${path},${type},${oldVal},${newVal}`;
      });
    return [header, ...rows].join('\n');
  }

  /**
   * Generate Standard Unified Patch Exporter (.patch / git diff output)
   */
  generateUnifiedPatch(leftStr: string, rightStr: string, leftFilename = 'original.json', rightFilename = 'modified.json'): string {
    const diff = this.computeLineDiff(leftStr, rightStr, false);
    if (diff.identical) return `--- a/${leftFilename}\n+++ b/${rightFilename}\n@@ -0,0 +0,0 @@\n# No differences found\n`;

    const patchLines: string[] = [
      `--- a/${leftFilename}`,
      `+++ b/${rightFilename}`,
      `@@ -1,${(leftStr.split('\n') || []).length} +1,${(rightStr.split('\n') || []).length} @@`
    ];

    diff.lines.forEach(item => {
      if (item.type === 'unchanged') {
        patchLines.push(` ${item.leftText || ''}`);
      } else if (item.type === 'removed') {
        patchLines.push(`-${item.leftText || ''}`);
      } else if (item.type === 'added') {
        patchLines.push(`+${item.rightText || ''}`);
      } else if (item.type === 'modified') {
        patchLines.push(`-${item.leftText || ''}`);
        patchLines.push(`+${item.rightText || ''}`);
      }
    });

    return patchLines.join('\n');
  }

  // ── Private Helpers ──

  private isSensitiveKey(path: string, customPatterns = ''): boolean {
    const key = path.toLowerCase();
    if (key.includes('password') || key.includes('token') || key.includes('secret') || key.includes('apikey') || key.includes('auth')) {
      return true;
    }
    if (customPatterns && customPatterns.trim()) {
      const customs = customPatterns.split(/[\n,]+/).map(p => p.trim().toLowerCase()).filter(Boolean);
      return customs.some(pat => key.includes(pat));
    }
    return false;
  }

  private detectMovedNodes(nodes: StructuralDiffNode[]): StructuralDiffNode[] {
    const removedNodes = nodes.filter(n => n.type === 'removed');
    const addedNodes = nodes.filter(n => n.type === 'added');

    if (removedNodes.length === 0 || addedNodes.length === 0) {
      return nodes;
    }

    const result: StructuralDiffNode[] = [];
    const matchedAddedPaths = new Set<string>();
    const matchedRemovedPaths = new Set<string>();

    removedNodes.forEach(rem => {
      const match = addedNodes.find(add =>
        !matchedAddedPaths.has(add.path) &&
        add.path !== rem.path &&
        this.areValuesEqual(rem.leftValue, add.rightValue, { ...this.getDefaultOptions(), ignoreKeyOrder: true })
      );

      if (match) {
        matchedRemovedPaths.add(rem.path);
        matchedAddedPaths.add(match.path);
        result.push({
          path: match.path,
          fromPath: rem.path,
          type: 'moved',
          leftValue: rem.leftValue,
          rightValue: match.rightValue
        });
      }
    });

    nodes.forEach(n => {
      if (matchedRemovedPaths.has(n.path) || matchedAddedPaths.has(n.path)) return;
      result.push(n);
    });

    return result;
  }

  private areValuesEqual(a: any, b: any, opts: DiffOptions): boolean {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return a === b;

    if (opts.caseInsensitive && typeof a === 'string' && typeof b === 'string') {
      if (a.toLowerCase() === b.toLowerCase()) return true;
    }

    if (opts.typeCoercion) {
      if (opts.caseInsensitive) {
        if (String(a).toLowerCase() === String(b).toLowerCase()) return true;
      } else {
        if (String(a) === String(b)) return true;
      }
    }

    if (opts.numericTolerance > 0 && typeof a === 'number' && typeof b === 'number') {
      if (Math.abs(a - b) <= opts.numericTolerance) return true;
    }

    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') {
      if (opts.caseInsensitive && typeof a === 'string' && typeof b === 'string') {
        return a.toLowerCase() === b.toLowerCase();
      }
      return a === b;
    }

    const aIsArr = Array.isArray(a);
    const bIsArr = Array.isArray(b);
    if (aIsArr !== bIsArr) return false;

    if (aIsArr && bIsArr) {
      if (a.length !== b.length) return false;
      if (opts.ignoreArrayOrder) {
        const matched = new Set<number>();
        for (let i = 0; i < a.length; i++) {
          let found = false;
          for (let j = 0; j < b.length; j++) {
            if (!matched.has(j) && this.areValuesEqual(a[i], b[j], opts)) {
              matched.add(j);
              found = true;
              break;
            }
          }
          if (!found) return false;
        }
        return true;
      } else {
        for (let i = 0; i < a.length; i++) {
          if (!this.areValuesEqual(a[i], b[i], opts)) return false;
        }
        return true;
      }
    }

    // Both are non-null Objects
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!this.areValuesEqual(a[key], b[key], opts)) return false;
    }

    return true;
  }

  private diffArray(
    left: any[],
    right: any[],
    path: string,
    nodes: StructuralDiffNode[],
    opts: DiffOptions
  ): void {
    if (this.areValuesEqual(left, right, opts)) {
      nodes.push({ path, type: 'unchanged', leftValue: left, rightValue: right });
      return;
    }

    if (opts.ignoreArrayOrder) {
      const matchedRight = new Set<number>();
      const leftUnmatched: { item: any; index: number }[] = [];

      left.forEach((leftItem, i) => {
        let matchIdx = -1;
        if (opts.arrayMatchKey && typeof leftItem === 'object' && leftItem !== null && leftItem[opts.arrayMatchKey] !== undefined) {
          matchIdx = right.findIndex((r, j) => !matchedRight.has(j) && typeof r === 'object' && r !== null && r[opts.arrayMatchKey] === leftItem[opts.arrayMatchKey]);
        }
        if (matchIdx === -1) {
          matchIdx = right.findIndex((r, j) => !matchedRight.has(j) && this.areValuesEqual(leftItem, r, opts));
        }

        if (matchIdx !== -1) {
          matchedRight.add(matchIdx);
          const childPath = `${path}[${matchIdx}]`;
          this.diffWalk(leftItem, right[matchIdx], childPath, nodes, opts);
        } else {
          leftUnmatched.push({ item: leftItem, index: i });
        }
      });

      leftUnmatched.forEach(u => {
        nodes.push({ path: `${path}[${u.index}]`, type: 'removed', leftValue: u.item });
      });

      right.forEach((rightItem, j) => {
        if (!matchedRight.has(j)) {
          nodes.push({ path: `${path}[${j}]`, type: 'added', rightValue: rightItem });
        }
      });
      return;
    }

    // Ordered array diff using Longest Common Subsequence (LCS)
    const m = left.length;
    const n = right.length;

    const isMatch = (a: any, b: any): boolean => {
      if (opts.arrayMatchKey && typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        if (a[opts.arrayMatchKey] !== undefined && b[opts.arrayMatchKey] !== undefined) {
          return a[opts.arrayMatchKey] === b[opts.arrayMatchKey];
        }
      }
      return this.areValuesEqual(a, b, opts);
    };

    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (isMatch(left[i - 1], right[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    interface ArrayDiffStep {
      type: 'match' | 'removed' | 'added' | 'changed';
      leftIdx?: number;
      rightIdx?: number;
    }

    const steps: ArrayDiffStep[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && isMatch(left[i - 1], right[j - 1])) {
        steps.push({ type: 'match', leftIdx: i - 1, rightIdx: j - 1 });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        steps.push({ type: 'added', rightIdx: j - 1 });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        steps.push({ type: 'removed', leftIdx: i - 1 });
        i--;
      }
    }

    steps.reverse();

    // Consolidate adjacent removed + added at identical/corresponding slots as 'changed' (replacement)
    const consolidatedSteps: ArrayDiffStep[] = [];
    let s = 0;
    while (s < steps.length) {
      const curr = steps[s];
      const next = steps[s + 1];
      if (curr.type === 'removed' && next && next.type === 'added') {
        consolidatedSteps.push({ type: 'changed', leftIdx: curr.leftIdx, rightIdx: next.rightIdx });
        s += 2;
      } else {
        consolidatedSteps.push(curr);
        s++;
      }
    }

    consolidatedSteps.forEach(step => {
      if (step.type === 'match' && step.leftIdx !== undefined && step.rightIdx !== undefined) {
        const childPath = `${path}[${step.rightIdx}]`;
        this.diffWalk(left[step.leftIdx], right[step.rightIdx], childPath, nodes, opts);
      } else if (step.type === 'changed' && step.leftIdx !== undefined && step.rightIdx !== undefined) {
        const childPath = `${path}[${step.rightIdx}]`;
        const leftVal = left[step.leftIdx];
        const rightVal = right[step.rightIdx];
        if (typeof leftVal === 'object' && leftVal !== null && typeof rightVal === 'object' && rightVal !== null && !Array.isArray(leftVal) && !Array.isArray(rightVal)) {
          this.diffWalk(leftVal, rightVal, childPath, nodes, opts);
        } else {
          nodes.push({ path: childPath, type: 'changed', leftValue: leftVal, rightValue: rightVal });
        }
      } else if (step.type === 'removed' && step.leftIdx !== undefined) {
        nodes.push({ path: `${path}[${step.leftIdx}]`, type: 'removed', leftValue: left[step.leftIdx] });
      } else if (step.type === 'added' && step.rightIdx !== undefined) {
        nodes.push({ path: `${path}[${step.rightIdx}]`, type: 'added', rightValue: right[step.rightIdx] });
      }
    });
  }

  private diffWalk(left: any, right: any, path: string, nodes: StructuralDiffNode[], opts: DiffOptions): void {
    if (this.areValuesEqual(left, right, opts)) {
      nodes.push({ path, type: 'unchanged', leftValue: left, rightValue: right });
      return;
    }

    const leftIsArr = Array.isArray(left);
    const rightIsArr = Array.isArray(right);

    if (leftIsArr && rightIsArr) {
      this.diffArray(left, right, path, nodes, opts);
      return;
    }

    const leftIsObj = left !== null && typeof left === 'object' && !leftIsArr;
    const rightIsObj = right !== null && typeof right === 'object' && !rightIsArr;

    if (leftIsObj && rightIsObj) {
      const leftKeysArr = Object.keys(left);
      const rightKeysArr = Object.keys(right);

      const leftKeys = new Set(opts.ignoreKeyOrder ? leftKeysArr.sort() : leftKeysArr);
      const rightKeys = new Set(opts.ignoreKeyOrder ? rightKeysArr.sort() : rightKeysArr);
      const allKeys = new Set([...leftKeys, ...rightKeys]);

      allKeys.forEach(k => {
        const childPath = path === '$' ? `$.${k}` : `${path}.${k}`;
        if (leftKeys.has(k) && !rightKeys.has(k)) {
          nodes.push({ path: childPath, type: 'removed', leftValue: (left as any)[k] });
        } else if (!leftKeys.has(k) && rightKeys.has(k)) {
          nodes.push({ path: childPath, type: 'added', rightValue: (right as any)[k] });
        } else {
          this.diffWalk((left as any)[k], (right as any)[k], childPath, nodes, opts);
        }
      });
      return;
    }

    nodes.push({ path, type: 'changed', leftValue: left, rightValue: right });
  }

  private buildLCSMatrix(left: string[], right: string[]): number[][] {
    const m = left.length;
    const n = right.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (left[i - 1] === right[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp;
  }

  private pairModifiedLines(rawItems: DiffLineItem[]): DiffLineItem[] {
    const result: DiffLineItem[] = [];
    let k = 0;

    while (k < rawItems.length) {
      if (rawItems[k].type === 'unchanged') {
        result.push(rawItems[k]);
        k++;
        continue;
      }

      // Collect contiguous block of removed and added lines
      const removedBlock: DiffLineItem[] = [];
      const addedBlock: DiffLineItem[] = [];

      while (k < rawItems.length && rawItems[k].type !== 'unchanged') {
        if (rawItems[k].type === 'removed') {
          removedBlock.push(rawItems[k]);
        } else if (rawItems[k].type === 'added') {
          addedBlock.push(rawItems[k]);
        }
        k++;
      }

      // Pair corresponding lines in this replacement block as 'modified'
      const pairCount = Math.min(removedBlock.length, addedBlock.length);
      for (let p = 0; p < pairCount; p++) {
        const leftTxt = removedBlock[p].leftText || '';
        const rightTxt = addedBlock[p].rightText || '';
        const wordDiff = this.computeWordDiff(leftTxt, rightTxt);

        result.push({
          leftLineNum: removedBlock[p].leftLineNum,
          rightLineNum: addedBlock[p].rightLineNum,
          type: 'modified',
          leftText: leftTxt,
          rightText: rightTxt,
          leftTokens: wordDiff.leftTokens,
          rightTokens: wordDiff.rightTokens
        });
      }

      // Remaining unmatched removed lines in the block
      for (let r = pairCount; r < removedBlock.length; r++) {
        result.push(removedBlock[r]);
      }

      // Remaining unmatched added lines in the block
      for (let a = pairCount; a < addedBlock.length; a++) {
        result.push(addedBlock[a]);
      }
    }

    return result;
  }

  private buildDisplayItems(
    items: DiffLineItem[],
    foldUnchanged: boolean,
    minFoldSize: number
  ): { displayItems: (DiffLineItem | DiffFoldRegion)[]; changeIndices: number[] } {
    const displayItems: (DiffLineItem | DiffFoldRegion)[] = [];
    const changeIndices: number[] = [];

    if (!foldUnchanged) {
      items.forEach((item, idx) => {
        displayItems.push(item);
        if (item.type !== 'unchanged') {
          changeIndices.push(idx);
        }
      });
      return { displayItems, changeIndices };
    }

    let i = 0;
    while (i < items.length) {
      if (items[i].type === 'unchanged') {
        let j = i;
        while (j < items.length && items[j].type === 'unchanged') {
          j++;
        }
        const runLen = j - i;
        if (runLen >= minFoldSize) {
          const startCtx = i > 0 ? 1 : 0;
          const endCtx = j < items.length ? 1 : 0;

          for (let c = 0; c < startCtx; c++) {
            displayItems.push(items[i + c]);
          }

          const foldStart = i + startCtx;
          const foldEnd = j - endCtx;
          const foldLines = items.slice(foldStart, foldEnd);

          if (foldLines.length > 0) {
            displayItems.push({
              startIndex: foldStart,
              count: foldLines.length,
              lines: foldLines
            });
          }

          for (let c = foldEnd; c < j; c++) {
            displayItems.push(items[c]);
          }

          i = j;
        } else {
          for (let c = i; c < j; c++) {
            displayItems.push(items[c]);
          }
          i = j;
        }
      } else {
        const itemIndex = displayItems.length;
        changeIndices.push(itemIndex);
        displayItems.push(items[i]);
        i++;
      }
    }

    return { displayItems, changeIndices };
  }

  private buildAlignedSideBySideRows(items: (DiffLineItem | DiffFoldRegion)[]): (AlignedSideBySideRow | DiffFoldRegion)[] {
    const rows: (AlignedSideBySideRow | DiffFoldRegion)[] = [];

    items.forEach(item => {
      if ('count' in item && 'lines' in item) {
        rows.push(item as DiffFoldRegion);
        return;
      }
      const lineItem = item as DiffLineItem;
      if (lineItem.type === 'unchanged') {
        rows.push({
          left: { lineNum: lineItem.leftLineNum, text: lineItem.leftText, type: 'unchanged' },
          right: { lineNum: lineItem.rightLineNum, text: lineItem.rightText, type: 'unchanged' }
        });
      } else if (lineItem.type === 'modified') {
        rows.push({
          left: { lineNum: lineItem.leftLineNum, text: lineItem.leftText, tokens: lineItem.leftTokens, type: 'modified' },
          right: { lineNum: lineItem.rightLineNum, text: lineItem.rightText, tokens: lineItem.rightTokens, type: 'modified' }
        });
      } else if (lineItem.type === 'removed') {
        rows.push({
          left: { lineNum: lineItem.leftLineNum, text: lineItem.leftText, type: 'removed' },
          right: { type: 'placeholder' }
        });
      } else if (lineItem.type === 'added') {
        rows.push({
          left: { type: 'placeholder' },
          right: { lineNum: lineItem.rightLineNum, text: lineItem.rightText, type: 'added' }
        });
      }
    });

    return rows;
  }

  /**
   * Group contiguous changed/modified/added/removed lines into actionable hunks
   */
  computeHunks(items: DiffLineItem[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    let hunkId = 0;
    let i = 0;

    while (i < items.length) {
      if (items[i].type === 'unchanged') {
        i++;
        continue;
      }

      const hunkType = items[i].type as 'added' | 'removed' | 'modified';
      const hunkLines: DiffLineItem[] = [];

      while (i < items.length && items[i].type === hunkType) {
        hunkLines.push(items[i]);
        i++;
      }

      const leftLines = hunkLines.filter(l => l.leftLineNum !== undefined);
      const rightLines = hunkLines.filter(l => l.rightLineNum !== undefined);

      const leftStartLine = leftLines.length > 0 ? leftLines[0].leftLineNum : undefined;
      const leftEndLine = leftLines.length > 0 ? leftLines[leftLines.length - 1].leftLineNum : undefined;
      const rightStartLine = rightLines.length > 0 ? rightLines[0].rightLineNum : undefined;
      const rightEndLine = rightLines.length > 0 ? rightLines[rightLines.length - 1].rightLineNum : undefined;

      hunks.push({
        id: hunkId++,
        type: hunkType,
        leftStartLine,
        leftEndLine,
        rightStartLine,
        rightEndLine,
        lines: hunkLines
      });
    }

    return hunks;
  }
}
