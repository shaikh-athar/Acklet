import { Injectable } from '@angular/core';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export interface JsonLensOptions {
  indent: number | string;
  sortKeys: boolean;
  minify: boolean;
}

export interface JsonStats {
  keyCount: number;
  arrayCount: number;
  objectCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
  maxDepth: number;
  byteSize: number;
  lineCount: number;
  minifiedSize: number;
  whitespaceOverhead: number;
}

export interface RepairIssue {
  type: string;
  description: string;
}

export interface JsonLensResult {
  success: boolean;
  formattedJson?: string;
  parsedData?: any;
  stats?: JsonStats;
  duplicateKeys?: string[];
  error?: string;
  errorLine?: number;
  errorColumn?: number;
  errorSnippet?: string;
  errorExplanation?: string;
  repairIssues?: RepairIssue[];
  repairedJson?: string;
  isLargeFile?: boolean;
  fileSizeMb?: string;
  extractedFromFormat?: string;
  rawOriginalInput?: string;
  formatId?: string;
  conversionLossy?: boolean;
  conversionDiagnostics?: string[];
}

export interface ExtractionResult {
  success: boolean;
  extractedJson?: string;
  parsedData?: any;
  formatName?: string;
}

export interface DiffNode {
  path: string;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  leftValue?: any;
  rightValue?: any;
}

export interface DiffResult {
  nodes: DiffNode[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
  identical: boolean;
}

export interface JsonPathResult {
  results: any[];
  paths: string[];
  error?: string;
}

export interface GraphNodeRow {
  key: string;
  value: any;
  valueType: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
  childNodeId?: string;
  childCount?: number;
  jsonPath: string;
}

export interface GraphNode {
  id: string;
  title: string;
  jsonPath: string;
  parentId?: string;
  rows: GraphNodeRow[];
  depth: number;
  colIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  fromRowKey: string;
  toNodeId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pathD: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

@Injectable({
  providedIn: 'root'
})
export class DataLensService {

  format(input: string, options: JsonLensOptions, activeFormat: string = 'json'): Promise<JsonLensResult> {
    return new Promise((resolve) => {
      if (!input || input.trim() === '') {
        return resolve({
          success: false,
          error: 'Payload cannot be empty',
          errorLine: 1,
          errorColumn: 1
        });
      }

      const byteSize = new Blob([input]).size;
      const fileSizeMb = (byteSize / (1024 * 1024)).toFixed(1);
      const isLarge = byteSize > 2 * 1024 * 1024; // > 2MB
      const indentVal = options.indent === '\t' ? '\t' : (typeof options.indent === 'number' ? options.indent : 2);

      setTimeout(() => {
        const duplicates = activeFormat === 'json' ? this.detectDuplicateKeys(input) : [];

        // ── 1. Active Format: YAML ──
        if (activeFormat === 'yaml') {
          try {
            let parsed = parseYaml(input);
            if (options.sortKeys && typeof parsed === 'object' && parsed !== null) {
              parsed = this.sortKeys(parsed);
            }

            const indentNum = typeof options.indent === 'number' ? options.indent : 2;
            const formattedJson = stringifyYaml(parsed, { indent: indentNum });
            const lines = formattedJson.split('\n');
            const outputByteSize = new Blob([formattedJson]).size;
            const stats = this.analyzeJson(parsed, lines.length, outputByteSize);

            return resolve({
              success: true,
              formattedJson,
              parsedData: parsed,
              stats,
              duplicateKeys: [],
              isLargeFile: isLarge,
              fileSizeMb,
              formatId: 'yaml'
            });
          } catch (e: any) {
            return resolve({
              success: false,
              error: e.message || 'YAML Syntax Error',
              errorLine: 1,
              errorColumn: 1,
              formatId: 'yaml'
            });
          }
        }

        // ── 2. Active Format: XML ──
        if (activeFormat === 'xml') {
          const xmlResult = this.parseXml(input);
          if (xmlResult.success) {
            const formattedJson = options.minify ? this.minifyXml(input) : this.formatXml(input, indentVal);
            const parsedData = this.xmlToJson(input);
            const lines = formattedJson.split('\n');
            const outputByteSize = new Blob([formattedJson]).size;
            const stats = this.analyzeJson(parsedData || {}, lines.length, outputByteSize);

            return resolve({
              success: true,
              formattedJson,
              parsedData: parsedData || {},
              stats,
              duplicateKeys: [],
              isLargeFile: isLarge,
              fileSizeMb,
              formatId: 'xml'
            });
          } else {
            return resolve({
              success: false,
              error: xmlResult.error || 'XML Syntax Error',
              errorLine: xmlResult.line || 1,
              errorColumn: xmlResult.column || 1,
              formatId: 'xml'
            });
          }
        }

        // ── 3. Active Format: TOML ──
        if (activeFormat === 'toml') {
          const tomlRes = this.parseToml(input);
          if (tomlRes.success && tomlRes.data) {
            let parsed = tomlRes.data;
            if (options.sortKeys && typeof parsed === 'object' && parsed !== null) {
              parsed = this.sortKeys(parsed);
            }

            const formattedJson = this.jsonToToml(parsed);
            const lines = formattedJson.split('\n');
            const outputByteSize = new Blob([formattedJson]).size;
            const stats = this.analyzeJson(parsed, lines.length, outputByteSize);

            return resolve({
              success: true,
              formattedJson,
              parsedData: parsed,
              stats,
              duplicateKeys: [],
              isLargeFile: isLarge,
              fileSizeMb,
              formatId: 'toml'
            });
          } else {
            return resolve({
              success: false,
              error: tomlRes.error || 'TOML Syntax Error',
              errorLine: tomlRes.line || 1,
              errorColumn: 1,
              formatId: 'toml'
            });
          }
        }

        // ── 4. Active Format: cURL (Extract Request Body) ──
        if (activeFormat === 'curl') {
          const curlRes = this.extractFromCurl(input);
          if (curlRes.success && curlRes.parsedData) {
            let parsed = curlRes.parsedData;
            if (options.sortKeys) {
              parsed = this.sortKeys(parsed);
            }
            const formattedJson = JSON.stringify(parsed, null, indentVal);
            const lines = formattedJson.split('\n');
            const outputByteSize = new Blob([formattedJson]).size;
            const stats = this.analyzeJson(parsed, lines.length, outputByteSize);

            return resolve({
              success: true,
              formattedJson,
              parsedData: parsed,
              stats,
              duplicateKeys: [],
              isLargeFile: isLarge,
              fileSizeMb,
              extractedFromFormat: 'cURL Request Body',
              formatId: 'curl'
            });
          } else {
            return resolve({
              success: false,
              error: 'No JSON payload (-d/--data) found in cURL command',
              errorLine: 1,
              errorColumn: 1,
              formatId: 'curl'
            });
          }
        }

        // ── 3. Active Format: JSON (Standard & JSONC with Comments) ──
        try {
          let parsed: any;
          try {
            parsed = JSON.parse(input);
          } catch {
            const cleanedInput = this.stripJsonComments(input);
            parsed = JSON.parse(cleanedInput);
          }

          if (options.sortKeys) {
            parsed = this.sortKeys(parsed);
          }

          let formattedJson: string;
          if (options.minify) {
            formattedJson = JSON.stringify(parsed);
          } else {
            formattedJson = JSON.stringify(parsed, null, indentVal);
          }

          const lines = formattedJson.split('\n');
          const outputByteSize = new Blob([formattedJson]).size;
          const stats = this.analyzeJson(parsed, lines.length, outputByteSize);

          resolve({
            success: true,
            formattedJson,
            parsedData: parsed,
            stats,
            duplicateKeys: duplicates,
            isLargeFile: isLarge,
            fileSizeMb,
            formatId: 'json'
          });

        } catch (e: any) {
          // Attempt Multi-Format Payload Extraction (cURL, HTTP transcript, HAR, JS fetch, Embedded)
          const extracted = this.extractPayload(input);
          if (extracted.success && extracted.parsedData) {
            let parsed = extracted.parsedData;
            if (options.sortKeys) {
              parsed = this.sortKeys(parsed);
            }

            let formattedJson: string;
            if (options.minify) {
              formattedJson = JSON.stringify(parsed);
            } else {
              formattedJson = JSON.stringify(parsed, null, indentVal);
            }

            const lines = formattedJson.split('\n');
            const outputByteSize = new Blob([formattedJson]).size;
            const stats = this.analyzeJson(parsed, lines.length, outputByteSize);

            return resolve({
              success: true,
              formattedJson,
              parsedData: parsed,
              stats,
              duplicateKeys: duplicates,
              isLargeFile: isLarge,
              fileSizeMb,
              extractedFromFormat: extracted.formatName,
              rawOriginalInput: input,
              formatId: 'json'
            });
          }

          const errInfo = this.parseErrorDetails(input, e.message || String(e));
          const repairResult = this.detectRepairableIssues(input);

          resolve({
            success: false,
            error: errInfo.message,
            errorLine: errInfo.line,
            errorColumn: errInfo.column,
            errorSnippet: errInfo.snippet,
            errorExplanation: errInfo.explanation,
            repairIssues: repairResult.issues,
            repairedJson: repairResult.repairedJson,
            duplicateKeys: duplicates,
            isLargeFile: isLarge,
            fileSizeMb,
            formatId: 'json'
          });
        }
      }, isLarge ? 50 : 0);
    });
  }

  // ── Multi-Format Payload Extraction Engine (100% Local Browser Execution) ──
  extractPayload(input: string): ExtractionResult {
    if (!input || !input.trim()) return { success: false };

    const str = input.trim();

    // 1. Check cURL Command
    if (/^curl\s+/i.test(str) || str.includes('curl ')) {
      const res = this.extractFromCurl(str);
      if (res.success) return res;
    }

    // 2. Check HAR File (HTTP Archive)
    if (str.includes('"log"') && str.includes('"entries"')) {
      const res = this.extractFromHar(str);
      if (res.success) return res;
    }

    // 3. Check JavaScript fetch() or code snippet
    if (/fetch\s*\(/i.test(str) || /axios\./i.test(str) || /JSON\.stringify/i.test(str)) {
      const res = this.extractFromFetch(str);
      if (res.success) return res;
    }

    // 4. Check HTTP Request / Response Transcript (Headers + Body)
    if (/^HTTP\/\d/i.test(str) || /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\//i.test(str) || /Content-Type:\s*application\/json/i.test(str)) {
      const res = this.extractFromHttpTranscript(str);
      if (res.success) return res;
    }

    // 5. Generic Embedded JSON Extractor (First '{' or '[' to matching '}' or ']')
    const res = this.extractFromEmbedded(str);
    if (res.success) return res;

    return { success: false };
  }

  private extractFromCurl(curlStr: string): ExtractionResult {
    const dataRegex = /(?:-d|--data(?:-raw|-binary|-urlencode)?)\s*(?:=\s*)?((?:\$)?'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^\s]+)/gi;
    let match;
    while ((match = dataRegex.exec(curlStr)) !== null) {
      let rawData = match[1];
      if (!rawData) continue;

      if (rawData.startsWith("$'") && rawData.endsWith("'")) {
        rawData = rawData.slice(2, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      } else if ((rawData.startsWith("'") && rawData.endsWith("'")) || (rawData.startsWith('"') && rawData.endsWith('"'))) {
        rawData = rawData.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      }

      if (rawData.includes('%7B') || rawData.includes('%5B')) {
        try {
          const decoded = decodeURIComponent(rawData.replace(/\+/g, ' '));
          const embeddedJson = this.extractFromEmbedded(decoded);
          if (embeddedJson.success) {
            return {
              success: true,
              extractedJson: embeddedJson.extractedJson,
              parsedData: embeddedJson.parsedData,
              formatName: 'cURL Command (URL-Decoded)'
            };
          }
        } catch {
          // Ignore URL decode error
        }
      }

      try {
        const parsed = JSON.parse(rawData);
        return {
          success: true,
          extractedJson: JSON.stringify(parsed, null, 2),
          parsedData: parsed,
          formatName: 'cURL Request Body (JSON)'
        };
      } catch {
        const embedded = this.extractFromEmbedded(rawData);
        if (embedded.success) {
          return {
            success: true,
            extractedJson: embedded.extractedJson,
            parsedData: embedded.parsedData,
            formatName: 'cURL Request Body (JSON)'
          };
        }
      }
    }

    const embeddedFallback = this.extractFromEmbedded(curlStr);
    if (embeddedFallback.success) {
      return {
        success: true,
        extractedJson: embeddedFallback.extractedJson,
        parsedData: embeddedFallback.parsedData,
        formatName: 'cURL Request Body (JSON)'
      };
    }

    return { success: false };
  }

  private extractFromHar(harStr: string): ExtractionResult {
    try {
      const parsedHar = JSON.parse(harStr);
      const entries = parsedHar?.log?.entries;
      if (Array.isArray(entries) && entries.length > 0) {
        for (const entry of entries) {
          const respText = entry?.response?.content?.text;
          if (respText) {
            try {
              const p = JSON.parse(respText);
              return {
                success: true,
                extractedJson: JSON.stringify(p, null, 2),
                parsedData: p,
                formatName: 'HAR Archive (Response)'
              };
            } catch {
              // Not direct JSON
            }
          }

          const reqText = entry?.request?.postData?.text;
          if (reqText) {
            try {
              const p = JSON.parse(reqText);
              return {
                success: true,
                extractedJson: JSON.stringify(p, null, 2),
                parsedData: p,
                formatName: 'HAR Archive (Request)'
              };
            } catch {
              // Not direct JSON
            }
          }
        }
      }
    } catch {
      // Ignore
    }
    return { success: false };
  }

  private extractFromFetch(str: string): ExtractionResult {
    const jsonStringifyMatch = str.match(/JSON\.stringify\s*\(\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*\)/i);
    if (jsonStringifyMatch && jsonStringifyMatch[1]) {
      const embedded = this.extractFromEmbedded(jsonStringifyMatch[1]);
      if (embedded.success) {
        return {
          success: true,
          extractedJson: embedded.extractedJson,
          parsedData: embedded.parsedData,
          formatName: 'JS fetch() Snippet'
        };
      }
    }

    const bodyMatch = str.match(/body\s*:\s*(['"`])([\s\S]*?)\1/i);
    if (bodyMatch && bodyMatch[2]) {
      try {
        const parsed = JSON.parse(bodyMatch[2]);
        return {
          success: true,
          extractedJson: JSON.stringify(parsed, null, 2),
          parsedData: parsed,
          formatName: 'JS fetch() Body'
        };
      } catch {
        const embedded = this.extractFromEmbedded(bodyMatch[2]);
        if (embedded.success) {
          return {
            success: true,
            extractedJson: embedded.extractedJson,
            parsedData: embedded.parsedData,
            formatName: 'JS fetch() Body'
          };
        }
      }
    }

    return { success: false };
  }

  private extractFromHttpTranscript(str: string): ExtractionResult {
    const headerBodySplit = str.split(/\r?\n\r?\n/);
    if (headerBodySplit.length >= 2) {
      const body = headerBodySplit.slice(1).join('\n\n').trim();
      if (body) {
        try {
          const parsed = JSON.parse(body);
          return {
            success: true,
            extractedJson: JSON.stringify(parsed, null, 2),
            parsedData: parsed,
            formatName: 'HTTP Transcript Body'
          };
        } catch {
          const embedded = this.extractFromEmbedded(body);
          if (embedded.success) {
            return {
              success: true,
              extractedJson: embedded.extractedJson,
              parsedData: embedded.parsedData,
              formatName: 'HTTP Transcript Body'
            };
          }
        }
      }
    }
    return { success: false };
  }

  private extractFromEmbedded(str: string): ExtractionResult {
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    let startIdx = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx === -1) return { success: false };

    const isObject = str[startIdx] === '{';
    const lastIdx = isObject ? str.lastIndexOf('}') : str.lastIndexOf(']');
    if (lastIdx <= startIdx) return { success: false };

    const candidate = str.substring(startIdx, lastIdx + 1);
    try {
      const parsed = JSON.parse(candidate);
      return {
        success: true,
        extractedJson: JSON.stringify(parsed, null, 2),
        parsedData: parsed,
        formatName: isObject ? 'Embedded JSON Object' : 'Embedded JSON Array'
      };
    } catch {
      const cleanCandidate = candidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/'/g, '"');
      try {
        const parsed = JSON.parse(cleanCandidate);
        return {
          success: true,
          extractedJson: JSON.stringify(parsed, null, 2),
          parsedData: parsed,
          formatName: 'Embedded JSON'
        };
      } catch {
        return { success: false };
      }
    }
  }

  // ── XML Processing Engine (Browser DOMParser Native Engine) ──
  parseXml(xmlStr: string): { success: boolean; doc?: Document; error?: string; line?: number; column?: number } {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlStr, 'text/xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) {
        const errText = errorNode.textContent || 'XML Syntax Error';
        const lineMatch = errText.match(/line\s+(\d+)/i);
        const colMatch = errText.match(/column\s+(\d+)/i);
        return {
          success: false,
          error: errText.split('\n')[0],
          line: lineMatch ? parseInt(lineMatch[1], 10) : 1,
          column: colMatch ? parseInt(colMatch[1], 10) : 1
        };
      }
      return { success: true, doc };
    } catch (e: any) {
      return { success: false, error: e.message || String(e) };
    }
  }

  formatXml(xmlStr: string, indent: number | string = 2): string {
    const parsed = this.parseXml(xmlStr);
    if (!parsed.success || !parsed.doc) return xmlStr;

    const indentStr = typeof indent === 'number' ? ' '.repeat(indent) : '\t';
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    let xml = xmlStr.replace(reg, '$1\r\n$2$3');
    let pad = 0;

    xml.split('\r\n').forEach((node) => {
      let indentCount = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indentCount = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>$/)) {
        indentCount = 1;
      } else {
        indentCount = 0;
      }

      let padding = '';
      for (let i = 0; i < pad; i++) {
        padding += indentStr;
      }

      formatted += padding + node + '\r\n';
      pad += indentCount;
    });

    return formatted.trim();
  }

  minifyXml(xmlStr: string): string {
    return xmlStr.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  }

  xmlToJson(xmlStr: string): any {
    const parsed = this.parseXml(xmlStr);
    if (!parsed.success || !parsed.doc) return null;
    return this.nodeToJson(parsed.doc.documentElement);
  }

  private nodeToJson(node: Element): any {
    const obj: any = {};

    if (node.attributes && node.attributes.length > 0) {
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        obj[`@${attr.name}`] = attr.value;
      }
    }

    if (node.hasChildNodes()) {
      for (let i = 0; i < node.childNodes.length; i++) {
        const item = node.childNodes.item(i);
        const nodeName = item.nodeName;

        if (item.nodeType === 3) {
          const text = item.nodeValue?.trim();
          if (text) {
            // Try to coerce booleans and numbers for nicer tree and table display
            let parsedVal: any = text;
            if (text === 'true') parsedVal = true;
            else if (text === 'false') parsedVal = false;
            else if (!isNaN(Number(text)) && text !== '') parsedVal = Number(text);

            if (Object.keys(obj).length === 0 && !node.attributes?.length) return parsedVal;
            obj['#text'] = parsedVal;
          }
        } else if (item.nodeType === 1) {
          const childObj = this.nodeToJson(item as Element);
          if (obj[nodeName] !== undefined) {
            if (!Array.isArray(obj[nodeName])) {
              obj[nodeName] = [obj[nodeName]];
            }
            obj[nodeName].push(childObj);
          } else {
            obj[nodeName] = childObj;
          }
        }
      }
    }

    return obj;
  }

  // ── TOML Processing Engine ──
  parseToml(tomlStr: string): { success: boolean; data?: any; error?: string; line?: number } {
    if (!tomlStr || !tomlStr.trim()) return { success: false, error: 'Empty TOML' };

    try {
      const result: any = {};
      let currentSection: any = result;

      const lines = tomlStr.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('[') && line.endsWith(']')) {
          const sectionPath = line.slice(1, -1).trim().split('.');
          currentSection = result;

          for (const part of sectionPath) {
            if (!currentSection[part] || typeof currentSection[part] !== 'object') {
              currentSection[part] = {};
            }
            currentSection = currentSection[part];
          }
          continue;
        }

        const eqIdx = line.indexOf('=');
        if (eqIdx !== -1) {
          const key = line.slice(0, eqIdx).trim();
          let rawVal = line.slice(eqIdx + 1).trim();

          let parsedVal: any = rawVal;
          if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
            parsedVal = rawVal.slice(1, -1).replace(/\\"/g, '"');
          } else if (rawVal.startsWith("'") && rawVal.endsWith("'")) {
            parsedVal = rawVal.slice(1, -1);
          } else if (rawVal === 'true') {
            parsedVal = true;
          } else if (rawVal === 'false') {
            parsedVal = false;
          } else if (!isNaN(Number(rawVal)) && rawVal !== '') {
            parsedVal = Number(rawVal);
          } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
            try {
              parsedVal = JSON.parse(rawVal.replace(/'/g, '"'));
            } catch {
              parsedVal = rawVal.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
            }
          }

          currentSection[key] = parsedVal;
        }
      }

      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'TOML Syntax Error', line: 1 };
    }
  }

  jsonToToml(data: any): string {
    if (!data || typeof data !== 'object') return '';

    let toml = '';
    const simpleKeys: string[] = [];
    const tableKeys: string[] = [];

    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        tableKeys.push(key);
      } else {
        simpleKeys.push(key);
      }
    });

    simpleKeys.forEach(key => {
      const val = data[key];
      if (typeof val === 'string') {
        toml += `${key} = "${val.replace(/"/g, '\\"')}"\n`;
      } else if (Array.isArray(val)) {
        toml += `${key} = ${JSON.stringify(val)}\n`;
      } else {
        toml += `${key} = ${val}\n`;
      }
    });

    tableKeys.forEach(tableKey => {
      toml += `\n[${tableKey}]\n`;
      const subObj = data[tableKey];
      if (typeof subObj === 'object' && subObj !== null) {
        Object.keys(subObj).forEach(key => {
          const val = subObj[key];
          if (typeof val === 'string') {
            toml += `${key} = "${val.replace(/"/g, '\\"')}"\n`;
          } else if (Array.isArray(val)) {
            toml += `${key} = ${JSON.stringify(val)}\n`;
          } else {
            toml += `${key} = ${val}\n`;
          }
        });
      }
    });

    return toml.trim();
  }

  // ── Specialized JSON Transformations ──
  flattenObject(obj: any, prefix = '', result: any = {}): any {
    if (obj === null || typeof obj !== 'object') return obj;

    for (const key of Object.keys(obj)) {
      const propName = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];

      if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
        this.flattenObject(val, propName, result);
      } else {
        result[propName] = val;
      }
    }
    return result;
  }

  unflattenObject(obj: any): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const result: any = {};
    for (const key of Object.keys(obj)) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (i === keys.length - 1) {
          current[k] = obj[key];
        } else {
          if (!current[k] || typeof current[k] !== 'object') {
            current[k] = {};
          }
          current = current[k];
        }
      }
    }
    return result;
  }

  removeNullValues(data: any): any {
    if (data === null || data === undefined) return undefined;
    if (Array.isArray(data)) {
      return data.map(item => this.removeNullValues(item)).filter(item => item !== undefined && item !== null);
    }
    if (typeof data === 'object') {
      const res: any = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== null && v !== undefined) {
          const cleaned = this.removeNullValues(v);
          if (cleaned !== undefined && cleaned !== null) {
            res[k] = cleaned;
          }
        }
      }
      return res;
    }
    return data;
  }

  removeEmptyValues(data: any): any {
    if (data === null || data === undefined || data === '') return undefined;
    if (Array.isArray(data)) {
      const cleaned = data.map(item => this.removeEmptyValues(item)).filter(item => item !== undefined);
      return cleaned.length > 0 ? cleaned : undefined;
    }
    if (typeof data === 'object') {
      const res: any = {};
      for (const [k, v] of Object.entries(data)) {
        const cleaned = this.removeEmptyValues(v);
        if (cleaned !== undefined) {
          res[k] = cleaned;
        }
      }
      return Object.keys(res).length > 0 ? res : undefined;
    }
    return data;
  }

  convertKeyCase(data: any, caseType: 'camel' | 'snake' | 'kebab' | 'pascal'): any {
    if (data === null || typeof data !== 'object') return data;

    const toCase = (str: string): string => {
      const words = str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().split(/\s+/);
      if (caseType === 'camel') {
        return words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      } else if (caseType === 'snake') {
        return words.map(w => w.toLowerCase()).join('_');
      } else if (caseType === 'kebab') {
        return words.map(w => w.toLowerCase()).join('-');
      } else if (caseType === 'pascal') {
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      }
      return str;
    };

    if (Array.isArray(data)) {
      return data.map(item => this.convertKeyCase(item, caseType));
    }

    const res: any = {};
    for (const [k, v] of Object.entries(data)) {
      const newKey = toCase(k);
      res[newKey] = this.convertKeyCase(v, caseType);
    }
    return res;
  }

  // ── JSON Comment Stripper (JSONC & JSON5) ──
  stripJsonComments(str: string): string {
    if (!str) return '';
    let insideString = false;
    let stringChar = '';
    let result = '';

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const next = str[i + 1];

      if (insideString) {
        result += ch;
        if (ch === '\\') {
          result += next || '';
          i++;
        } else if (ch === stringChar) {
          insideString = false;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        insideString = true;
        stringChar = ch;
        result += ch;
        continue;
      }

      if (ch === '/' && next === '/') {
        i += 2;
        while (i < str.length && str[i] !== '\n' && str[i] !== '\r') {
          i++;
        }
        if (i < str.length) result += str[i];
        continue;
      }

      if (ch === '/' && next === '*') {
        i += 2;
        while (i < str.length && !(str[i] === '*' && str[i + 1] === '/')) {
          i++;
        }
        i++;
        continue;
      }

      result += ch;
    }
    return result;
  }

  // ── Specialized XML Operations ──
  stripXmlComments(xmlStr: string): string {
    if (!xmlStr) return '';
    return xmlStr.replace(/<!--[\s\S]*?-->/g, '');
  }

  removeXmlProcessingInstructions(xmlStr: string): string {
    if (!xmlStr) return '';
    return xmlStr.replace(/<\?(?!xml\s)[\s\S]*?\?>/gi, '');
  }

  sortXmlAttributes(xmlStr: string): string {
    if (!xmlStr) return '';
    return xmlStr.replace(/<([a-zA-Z0-9_:-]+)(\s+[^>]+?)(\/?>)/g, (match, tag, attrsStr, endTag) => {
      const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
      const attrs: { name: string; full: string }[] = [];
      let m;
      while ((m = attrRegex.exec(attrsStr)) !== null) {
        attrs.push({ name: m[1], full: m[0] });
      }
      if (attrs.length === 0) return match;
      attrs.sort((a, b) => a.name.localeCompare(b.name));
      return `<${tag} ${attrs.map(a => a.full).join(' ')}${endTag}`;
    });
  }

  normalizeXmlQuotes(xmlStr: string): string {
    if (!xmlStr) return '';
    return xmlStr.replace(/([a-zA-Z0-9_:-]+)\s*=\s*'([^']*)'/g, '$1="$2"');
  }

  // ── Specialized TOML Operations ──
  normalizeTomlTables(tomlStr: string): string {
    if (!tomlStr) return '';
    return tomlStr
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          return `\n${trimmed}`;
        }
        return line;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  normalizeTomlInlineTables(tomlStr: string): string {
    if (!tomlStr) return '';
    return tomlStr
      .replace(/\{\s*/g, '{ ')
      .replace(/\s*\}/g, ' }')
      .replace(/\[\s*/g, '[ ')
      .replace(/\s*\]/g, ' ]');
  }

  removeTomlEmptyValues(tomlStr: string): string {
    if (!tomlStr) return '';
    return tomlStr
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (/\s*=\s*""\s*$/.test(trimmed)) return false;
        if (/\s*=\s*\{\s*\}\s*$/.test(trimmed)) return false;
        if (/\s*=\s*\[\s*\]\s*$/.test(trimmed)) return false;
        return true;
      })
      .join('\n');
  }

  // ── Specialized CSV & cURL Operations ──
  trimCsvWhitespace(csvStr: string): string {
    if (!csvStr) return '';
    return csvStr
      .split('\n')
      .map(line => line.split(',').map(cell => cell.trim()).join(','))
      .join('\n');
  }

  removeCsvEmptyRows(csvStr: string): string {
    if (!csvStr) return '';
    return csvStr
      .split('\n')
      .filter(line => line.trim() !== '' && line.split(',').some(cell => cell.trim() !== ''))
      .join('\n');
  }

  removeCsvDuplicateRows(csvStr: string): string {
    if (!csvStr) return '';
    const lines = csvStr.split('\n');
    if (lines.length === 0) return '';
    const header = lines[0];
    const seen = new Set<string>();
    const unique = [header];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() && !seen.has(line.trim())) {
        seen.add(line.trim());
        unique.push(line);
      }
    }
    return unique.join('\n');
  }

  extractCurlHeaders(curlStr: string): string {
    if (!curlStr) return '{}';
    const headerRegex = /(?:-H|--header)\s+["']?([^"'\n]+)["']?/gi;
    const headers: Record<string, string> = {};
    let match;
    while ((match = headerRegex.exec(curlStr)) !== null) {
      const parts = match[1].split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(':').trim();
        headers[key] = val;
      }
    }
    return JSON.stringify(headers, null, 2);
  }

  extractCurlUrlParams(curlStr: string): string {
    if (!curlStr) return '{}';
    const urlMatch = curlStr.match(/curl\s+(?:-[A-Za-z]+\s+)*["']?(https?:\/\/[^\s"']+)["']?/i) || curlStr.match(/["']?(https?:\/\/[^\s"']+)["']?/i);
    if (!urlMatch) return JSON.stringify({ rawUrl: '', queryParameters: {} }, null, 2);
    try {
      const parsedUrl = new URL(urlMatch[1]);
      const params: Record<string, string> = {};
      parsedUrl.searchParams.forEach((v, k) => { params[k] = v; });
      return JSON.stringify({
        url: parsedUrl.origin + parsedUrl.pathname,
        host: parsedUrl.hostname,
        protocol: parsedUrl.protocol,
        queryParams: params
      }, null, 2);
    } catch {
      return JSON.stringify({ rawUrl: urlMatch[1], queryParameters: {} }, null, 2);
    }
  }

  extractCurlAuth(curlStr: string): string {
    if (!curlStr) return '{}';
    const authInfo: Record<string, any> = {};
    const bearerMatch = curlStr.match(/Authorization:\s*Bearer\s+([^\s"']+)/i);
    if (bearerMatch) authInfo['bearerToken'] = bearerMatch[1];
    const basicMatch = curlStr.match(/-u\s+["']?([^"'\s]+)["']?/i) || curlStr.match(/--user\s+["']?([^"'\s]+)["']?/i);
    if (basicMatch) authInfo['basicAuth'] = basicMatch[1];
    const apiKeyMatch = curlStr.match(/(?:x-api-key|api[-_]?key):\s*([^\s"']+)/i);
    if (apiKeyMatch) authInfo['apiKey'] = apiKeyMatch[1];
    return JSON.stringify(authInfo, null, 2);
  }

  scanCurlSecurity(curlStr: string): string {
    if (!curlStr) return '{}';
    const findings: { severity: string; type: string; description: string }[] = [];
    if (/Authorization:\s*Bearer\s+/i.test(curlStr)) {
      findings.push({ severity: 'HIGH', type: 'Exposed Bearer Token', description: 'Hardcoded Bearer authorization token detected in request headers.' });
    }
    if (/-u\s+|--user\s+/i.test(curlStr)) {
      findings.push({ severity: 'CRITICAL', type: 'Exposed Basic Credentials', description: 'Plaintext username/password credentials found in command flags.' });
    }
    if (/api[-_]?key|secret|private[-_]?key/i.test(curlStr)) {
      findings.push({ severity: 'WARNING', type: 'Exposed API Key/Secret', description: 'Potential API key or secret token referenced in headers or query strings.' });
    }
    return JSON.stringify({
      auditTarget: 'cURL Command',
      riskScore: findings.length > 0 ? (findings.some(f => f.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH') : 'LOW',
      findingsCount: findings.length,
      findings
    }, null, 2);
  }

  // ── Specialized YAML Operations ──
  stripYamlComments(yamlStr: string): string {
    if (!yamlStr) return '';
    return yamlStr
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .map(line => {
        const commentIdx = line.indexOf(' #');
        return commentIdx !== -1 ? line.substring(0, commentIdx).trimEnd() : line;
      })
      .join('\n');
  }

  convertTabsToSpaces(yamlStr: string, indentSpaces = 2): string {
    if (!yamlStr) return '';
    const spaces = ' '.repeat(indentSpaces);
    return yamlStr.replace(/\t/g, spaces);
  }

  expandYamlAnchors(yamlStr: string): string {
    if (!yamlStr) return '';
    const parsed = parseYaml(yamlStr);
    return stringifyYaml(parsed, { indent: 2 });
  }

  normalizeYamlBooleans(yamlStr: string): string {
    if (!yamlStr) return '';
    const parsed = parseYaml(yamlStr);
    return stringifyYaml(parsed, { indent: 2 });
  }

  jsonToCsv(data: any): string {
    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0 || typeof arr[0] !== 'object' || arr[0] === null) return '';

    const headers = Array.from(new Set(arr.flatMap(item => Object.keys(item || {}))));
    const csvRows = [headers.join(',')];

    for (const item of arr) {
      const values = headers.map(header => {
        const val = item ? item[header] : '';
        if (val === null || val === undefined) return '""';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  }

  generateCode(data: any, lang: 'typescript' | 'python' | 'go'): string {
    if (!data) return '';

    if (lang === 'typescript') {
      return this.toTypeScript(data, 'RootObject');
    } else if (lang === 'python') {
      return this.toPythonType(data, 'RootObject');
    } else if (lang === 'go') {
      return this.toGoStruct(data, 'RootObject');
    }
    return '';
  }

  convertTo(data: any, target: 'yaml' | 'csv' | 'xml' | 'json'): string {
    if (!data) return '';

    if (target === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (target === 'yaml') {
      try {
        return stringifyYaml(data, { indent: 2 });
      } catch {
        return this.toSimpleYaml(data);
      }
    } else if (target === 'xml') {
      return this.jsonToXml(data);
    } else if (target === 'csv') {
      return this.toCsv(data);
    }
    return '';
  }

  jsonToXml(obj: any, rootName = 'root'): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>`;

    const buildXml = (data: any, indentLevel = 1): string => {
      let res = '';
      const indent = '  '.repeat(indentLevel);

      if (data === null || data === undefined) return '';

      if (typeof data !== 'object') {
        return String(data);
      }

      if (Array.isArray(data)) {
        data.forEach((item) => {
          res += `\n${indent}<item>${buildXml(item, indentLevel + 1)}</item>`;
        });
      } else {
        Object.keys(data).forEach((key) => {
          if (key.startsWith('@')) return;
          const val = data[key];
          if (Array.isArray(val)) {
            val.forEach((subItem) => {
              res += `\n${indent}<${key}>${buildXml(subItem, indentLevel + 1)}</${key}>`;
            });
          } else if (typeof val === 'object' && val !== null) {
            res += `\n${indent}<${key}>${buildXml(val, indentLevel + 1)}\n${indent}</${key}>`;
          } else {
            res += `\n${indent}<${key}>${val}</${key}>`;
          }
        });
      }
      return res;
    };

    xml += buildXml(obj) + `\n</${rootName}>`;
    return xml;
  }

  private detectDuplicateKeysWithLines(jsonStr: string): { key: string; line: number }[] {
    const duplicates: { key: string; line: number }[] = [];
    const lines = jsonStr.split('\n');
    const keyRegex = /"([^"\\]*(\\.[^"\\]*)*)"\s*:/g;
    const seenMap: { [key: string]: number } = {};

    lines.forEach((lineText, lineIdx) => {
      let match;
      while ((match = keyRegex.exec(lineText)) !== null) {
        const key = match[1];
        if (seenMap[key]) {
          duplicates.push({ key, line: lineIdx + 1 });
        } else {
          seenMap[key] = 1;
        }
      }
    });

    return duplicates;
  }

  private detectDuplicateKeys(jsonStr: string): string[] {
    const dups = this.detectDuplicateKeysWithLines(jsonStr);
    return Array.from(new Set(dups.map(d => d.key)));
  }

  private sortKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortKeys(item));
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted: any, key: string) => {
          sorted[key] = this.sortKeys(obj[key]);
          return sorted;
        }, {});
    }
    return obj;
  }

  private analyzeJson(obj: any, lineCount: number, byteSize: number): JsonStats {
    let keyCount = 0;
    let arrayCount = 0;
    let objectCount = 0;
    let stringCount = 0;
    let numberCount = 0;
    let booleanCount = 0;
    let nullCount = 0;
    let maxDepth = 0;

    const traverse = (node: any, currentDepth: number) => {
      if (currentDepth > maxDepth) maxDepth = currentDepth;

      if (node === null) {
        nullCount++;
      } else if (Array.isArray(node)) {
        arrayCount++;
        for (const item of node) {
          traverse(item, currentDepth + 1);
        }
      } else if (typeof node === 'object') {
        objectCount++;
        const keys = Object.keys(node);
        keyCount += keys.length;
        for (const key of keys) {
          traverse(node[key], currentDepth + 1);
        }
      } else if (typeof node === 'string') {
        stringCount++;
      } else if (typeof node === 'number') {
        numberCount++;
      } else if (typeof node === 'boolean') {
        booleanCount++;
      }
    };

    traverse(obj, 1);

    const minifiedStr = JSON.stringify(obj);
    const minifiedSize = new Blob([minifiedStr]).size;
    const whitespaceOverhead = Math.max(0, byteSize - minifiedSize);

    return {
      keyCount,
      arrayCount,
      objectCount,
      stringCount,
      numberCount,
      booleanCount,
      nullCount,
      maxDepth,
      byteSize,
      lineCount,
      minifiedSize,
      whitespaceOverhead
    };
  }

  private parseErrorDetails(input: string, errorMsg: string): { message: string; line: number; column: number; snippet?: string; explanation?: string } {
    let line = 1;
    let column = 1;

    const posMatch = errorMsg.match(/at position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const sub = input.substring(0, pos);
      const lines = sub.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    } else {
      const lineMatch = errorMsg.match(/line (\d+) column (\d+)/i);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
        column = parseInt(lineMatch[2], 10);
      }
    }

    const inputLines = input.split('\n');
    const problemLine = inputLines[line - 1] || '';
    const snippet = problemLine.trim();

    let explanation = 'Syntax violation encountered during AST parsing.';
    if (errorMsg.includes('position') || errorMsg.includes('token')) {
      if (problemLine.includes(',}') || problemLine.includes(',]')) {
        explanation = 'Trailing comma before closing bracket or brace.';
      } else if (/'/.test(problemLine)) {
        explanation = 'Single quotes used instead of double quotes.';
      } else if (/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/.test(problemLine)) {
        explanation = 'Unquoted object property key detected.';
      }
    }

    return {
      message: errorMsg,
      line,
      column,
      snippet: snippet.length > 40 ? snippet.substring(0, 40) + '...' : snippet,
      explanation
    };
  }

  private detectRepairableIssues(input: string): { issues: RepairIssue[]; repairedJson?: string } {
    const issues: RepairIssue[] = [];
    let temp = input;

    if (/,\s*([\}\]])/.test(temp)) {
      issues.push({ type: 'Trailing Comma', description: 'Removed trailing comma before closing brace/bracket.' });
      temp = temp.replace(/,\s*([\}\]])/g, '$1');
    }

    if (/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/.test(temp)) {
      issues.push({ type: 'Unquoted Property Name', description: 'Wrapped property keys in double quotes.' });
      temp = temp.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
    }

    if (/'/.test(temp)) {
      issues.push({ type: 'Single Quotes', description: 'Replaced single quotes with standard JSON double quotes.' });
      temp = temp.replace(/'/g, '"');
    }

    try {
      const parsed = JSON.parse(temp);
      return {
        issues,
        repairedJson: JSON.stringify(parsed, null, 2)
      };
    } catch {
      return { issues: [] };
    }
  }

  private toTypeScript(obj: any, name: string): string {
    if (Array.isArray(obj)) {
      const first = obj[0];
      if (typeof first === 'object' && first !== null) {
        return this.toTypeScript(first, name) + `\n\nexport type ${name}List = ${name}[];`;
      }
      return `export type ${name}List = ${typeof first || 'any'}[];`;
    } else if (typeof obj === 'object' && obj !== null) {
      let code = `export interface ${name} {\n`;
      for (const k in obj) {
        const val = obj[k];
        let typeName: string = typeof val;
        if (val === null) typeName = 'any';
        else if (Array.isArray(val)) typeName = `${typeof val[0] || 'any'}[]`;
        else if (typeof val === 'object') typeName = 'Record<string, any>';
        code += `  ${k}: ${typeName};\n`;
      }
      code += `}`;
      return code;
    }
    return `export type ${name} = ${typeof obj};`;
  }

  private toPythonType(obj: any, name: string): string {
    return `from typing import Any, Dict, List, Optional\nfrom dataclasses import dataclass\n\n@dataclass\nclass ${name}:\n` +
      Object.keys(obj || {}).map(k => `    ${k}: Any`).join('\n');
  }

  private toGoStruct(obj: any, name: string): string {
    let code = `type ${name} struct {\n`;
    for (const k in obj) {
      const capital = k.charAt(0).toUpperCase() + k.slice(1);
      code += `\t${capital} interface{} \`json:"${k}"\`\n`;
    }
    code += `}`;
    return code;
  }

  private toSimpleYaml(obj: any, indent = 0): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object') {
          yaml += `${spaces}-\n${this.toSimpleYaml(item, indent + 2)}`;
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const k in obj) {
        const val = obj[k];
        if (typeof val === 'object' && val !== null) {
          yaml += `${spaces}${k}:\n${this.toSimpleYaml(val, indent + 2)}`;
        } else {
          yaml += `${spaces}${k}: ${val}\n`;
        }
      }
    }
    return yaml;
  }

  private toXml(obj: any, indent = 2): string {
    let xml = '';
    const spaces = ' '.repeat(indent);
    if (typeof obj === 'object' && obj !== null) {
      for (const k in obj) {
        const val = obj[k];
        if (typeof val === 'object') {
          xml += `${spaces}<${k}>\n${this.toXml(val, indent + 2)}${spaces}</${k}>\n`;
        } else {
          xml += `${spaces}<${k}>${val}</${k}>\n`;
        }
      }
    }
    return xml;
  }

  private toCsv(obj: any): string {
    if (obj === null || obj === undefined) return '';

    const escapeCsvValue = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        const json = JSON.stringify(val);
        return `"${json.replace(/"/g, '""')}"`;
      }
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Case 1: Array of objects or primitives
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '';

      // Check if items are objects
      const isObjectArray = obj.some(item => item !== null && typeof item === 'object' && !Array.isArray(item));

      if (isObjectArray) {
        // Flatten each object so nested fields are represented in CSV headers
        const flattenedRows = obj.map(item => {
          if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
            return this.flattenObject(item);
          }
          return { value: item };
        });

        // Collect all unique column headers across all objects
        const headerSet = new Set<string>();
        flattenedRows.forEach(row => {
          Object.keys(row).forEach(k => headerSet.add(k));
        });
        const headers = Array.from(headerSet);

        let csv = headers.map(h => escapeCsvValue(h)).join(',') + '\n';
        for (const row of flattenedRows) {
          csv += headers.map(h => escapeCsvValue(row[h])).join(',') + '\n';
        }
        return csv.trim();
      } else {
        // Simple 1D primitive array
        let csv = 'index,value\n';
        obj.forEach((item, idx) => {
          csv += `${idx},${escapeCsvValue(item)}\n`;
        });
        return csv.trim();
      }
    }

    // Case 2: Top-level single object
    if (typeof obj === 'object') {
      // Check if top-level object contains an array property (e.g. { data: [...], items: [...] })
      const arrayKeys = Object.keys(obj).filter(k => Array.isArray(obj[k]) && obj[k].length > 0);
      if (arrayKeys.length === 1 && typeof obj[arrayKeys[0]][0] === 'object') {
        return this.toCsv(obj[arrayKeys[0]]);
      }

      // Flatten object and output Key,Value pairs
      const flat = this.flattenObject(obj);
      let csv = 'key,value\n';
      for (const [k, v] of Object.entries(flat)) {
        csv += `${escapeCsvValue(k)},${escapeCsvValue(v)}\n`;
      }
      return csv.trim();
    }

    // Case 3: Primitive value
    return `value\n${escapeCsvValue(obj)}`;
  }

  highlightSyntax(
    code: string,
    lang: string = 'json',
    searchQuery: string = '',
    errorInfo: { line?: number; column?: number; message?: string } | null = null,
    isFilterCondition: boolean = false
  ): string {
    if (!code) return '';

    // First replace fold pill markers using pure alpha tags (no digits) to prevent regex collisions
    const foldPillMap = new Map<string, { line: string; tag: string }>();
    let foldCounter = 0;
    const toAlphaKey = (num: number): string => {
      let result = '';
      let n = num;
      while (n >= 0) {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
      }
      return `___FOLDTAG${result}___`;
    };

    const preprocessed = code.replace(/__FOLD_PILL_START_(\d+)_(.*?)__FOLD_PILL_END__/g, (_, line, tag) => {
      const placeholder = toAlphaKey(foldCounter++);
      foldPillMap.set(placeholder, { line, tag });
      return placeholder;
    });

    // Escape raw HTML entities
    let escaped = preprocessed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let highlighted = escaped;
    if (lang === 'json') {
      let bracketDepth = 0;
      highlighted = escaped.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[\{\}\[\]]|:|,)/g,
        (match) => {
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              return `<span class="hl-key">${match.slice(0, -1)}</span><span class="hl-colon">:</span>`;
            }
            return `<span class="hl-string">${match}</span>`;
          }
          if (/^(true|false)$/.test(match)) {
            return `<span class="hl-boolean">${match}</span>`;
          }
          if (match === 'null') {
            return `<span class="hl-null">${match}</span>`;
          }
          if (/^-?\d+/.test(match)) {
            return `<span class="hl-number">${match}</span>`;
          }
          if (match === '{' || match === '[') {
            bracketDepth++;
            const lvl = ((bracketDepth - 1) % 3) + 1;
            return `<span class="hl-bracket lvl-${lvl}">${match}</span>`;
          }
          if (match === '}' || match === ']') {
            const lvl = ((bracketDepth - 1) % 3) + 1;
            if (bracketDepth > 0) bracketDepth--;
            return `<span class="hl-bracket lvl-${lvl}">${match}</span>`;
          }
          if (match === ':') return `<span class="hl-colon">:</span>`;
          if (match === ',') return `<span class="hl-comma">,</span>`;
          return match;
        }
      );
    } else if (lang === 'xml') {
      highlighted = escaped.replace(
        /(&lt;\/?[a-zA-Z0-9_-]+|&gt;|\/&gt;|[a-zA-Z0-9_-]+(?=\=)|"[^"]*")/g,
        (match) => {
          if (match.startsWith('&lt;')) {
            return `<span class="hl-punct">&lt;</span><span class="hl-key">${match.substring(4)}</span>`;
          }
          if (match === '&gt;' || match === '/&gt;') {
            return `<span class="hl-punct">${match}</span>`;
          }
          if (match.startsWith('"')) {
            return `<span class="hl-string">${match}</span>`;
          }
          return `<span class="hl-attr">${match}</span>`;
        }
      );
    } else if (lang === 'yaml') {
      highlighted = escaped.replace(
        /(#.*$)|^(\s*)([a-zA-Z0-9_-]+)(\s*:)|("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'[^']*')|\b(true|false|null)\b|-?\d+(?:\.\d+)?/gm,
        (match, comment, p1, p2, p3) => {
          if (comment) {
            return `<span class="hl-comment">${comment}</span>`;
          }
          if (p2 && p3) {
            return `${p1}<span class="hl-key">${p2}</span><span class="hl-colon">${p3}</span>`;
          }
          if (match.startsWith('"') || match.startsWith("'")) {
            return `<span class="hl-string">${match}</span>`;
          }
          if (match === 'true' || match === 'false') {
            return `<span class="hl-boolean">${match}</span>`;
          }
          if (match === 'null') {
            return `<span class="hl-null">${match}</span>`;
          }
          if (!isNaN(Number(match))) {
            return `<span class="hl-number">${match}</span>`;
          }
          return match;
        }
      );
    } else {
      highlighted = escaped.replace(
        /\b(export|interface|type|class|struct|def|public|private|protected|package|import|use|return|func|fn|val|var|let|const|enum|final|required|dataclass|z|infer|schema|pub|derive)\b|\b(string|number|boolean|int|i64|f64|float64|bool|str|List|Vec|Map|String|Int|Double|Boolean|Any|Object|void|null|object|array|integer|Codable|SerializedName|i32|u64|usize|Option|Result|std|vector)\b|("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"|'[^']*')|\b\d+\b/g,
        (match) => {
          if (/^(export|interface|type|class|struct|def|public|private|protected|package|import|use|return|func|fn|val|var|let|const|enum|final|required|dataclass|z|infer|schema|pub|derive)$/.test(match)) {
            return `<span class="hl-keyword">${match}</span>`;
          }
          if (/^(string|number|boolean|int|i64|f64|float64|bool|str|List|Vec|Map|String|Int|Double|Boolean|Any|Object|void|null|object|array|integer|Codable|SerializedName|i32|u64|usize|Option|Result|std|vector)$/.test(match)) {
            return `<span class="hl-type">${match}</span>`;
          }
          if (match.startsWith('"') || match.startsWith("'")) {
            return `<span class="hl-string">${match}</span>`;
          }
          if (!isNaN(Number(match))) {
            return `<span class="hl-number">${match}</span>`;
          }
          return match;
        }
      );
    }

    // Live search highlighting (TEXT ONLY)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${q})(?![^<]*>|[^_]*___)`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="search-highlight-match">$1</mark>');

      // Filter condition highlighting (ENTIRE BLOCK / LINE)
      if (isFilterCondition) {
        const lines = highlighted.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('search-highlight-match')) {
            lines[i] = `<span class="filter-matched-line">${lines[i]}</span>`;
          }
        }
        highlighted = lines.join('\n');
      }
    }

    foldPillMap.forEach((val, placeholder) => {
      highlighted = highlighted.replace(placeholder, `<span class="hl-fold-pill" data-line="${val.line}">${val.tag}</span>`);
    });

    // Apply VSCode / IntelliJ style wavy error underline & hover popup widget
    if (errorInfo && errorInfo.line && errorInfo.line > 0) {
      const lines = highlighted.split('\n');
      const errIdx = errorInfo.line - 1;
      if (errIdx >= 0 && errIdx < lines.length) {
        const lineContent = lines[errIdx];
        const rawMsg = errorInfo.message || 'Syntax violation: Unexpected token or invalid bracket syntax in AST.';
        const cleanMsg = rawMsg.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const locBadge = `Line ${errorInfo.line} · Col ${errorInfo.column || 1}`;
        lines[errIdx] = `<span class="hl-syntax-error-wavy" data-error-loc="${locBadge}" data-error-msg="${cleanMsg}">${lineContent}</span>`;
        highlighted = lines.join('\n');
      }
    }

    const lines = highlighted.split('\n');
    const wrappedLines = lines.map((line, idx) => `<span class="line-marker" data-line="${idx + 1}">${line}</span>`);
    return wrappedLines.join('\n');
  }

  // ─── JSONPath Query ───────────────────────────────────────────────────────
  evaluateJsonPath(data: any, expression: string): JsonPathResult {
    if (!expression || !expression.trim()) return { results: [], paths: [] };
    try {
      const results: any[] = [];
      const paths: string[] = [];
      this.jsonPathWalk(data, expression.trim(), '$', results, paths);
      return { results, paths };
    } catch (e: any) {
      return { results: [], paths: [], error: e.message || 'Invalid JSONPath expression' };
    }
  }

  private jsonPathWalk(node: any, expr: string, currentPath: string, results: any[], paths: string[]): void {
    // Remove leading $
    let e = expr.startsWith('$') ? expr.slice(1) : expr;

    if (e === '' || e === '.') {
      results.push(node);
      paths.push(currentPath);
      return;
    }

    // Recursive descent ..
    if (e.startsWith('..')) {
      const rest = e.slice(2);
      this.jsonPathWalk(node, (rest ? `$.${rest}` : '$'), currentPath, results, paths);
      if (node !== null && typeof node === 'object') {
        const kids = Array.isArray(node) ? node : Object.values(node);
        const keys = Array.isArray(node) ? node.map((_, i) => `[${i}]`) : Object.keys(node).map(k => `.${k}`);
        kids.forEach((child, idx) => {
          this.jsonPathWalk(child, expr, `${currentPath}${keys[idx]}`, results, paths);
        });
      }
      return;
    }

    // .* or [*] — all children
    if (e.startsWith('.*') || e.startsWith('[*]')) {
      const rest = e.startsWith('.*') ? e.slice(2) : e.slice(3);
      if (node !== null && typeof node === 'object') {
        const entries = Array.isArray(node)
          ? node.map((v, i) => ({ key: `[${i}]`, val: v }))
          : Object.keys(node).map(k => ({ key: `.${k}`, val: node[k] }));
        entries.forEach(({ key, val }) => {
          this.jsonPathWalk(val, `$${rest}`, `${currentPath}${key}`, results, paths);
        });
      }
      return;
    }

    // .key or ['key']
    const dotKeyMatch = e.match(/^\.([a-zA-Z0-9_$-]+)(.*)/s);
    if (dotKeyMatch) {
      const key = dotKeyMatch[1];
      const rest = dotKeyMatch[2];
      if (node !== null && typeof node === 'object' && !Array.isArray(node) && key in node) {
        this.jsonPathWalk(node[key], `$${rest}`, `${currentPath}.${key}`, results, paths);
      }
      return;
    }

    // [index] or ['key']
    const bracketMatch = e.match(/^\[(\d+|'[^']+'|"[^"]+")\](.*)/s);
    if (bracketMatch) {
      const rawKey = bracketMatch[1];
      const rest = bracketMatch[2];
      const key = rawKey.match(/^['"]/) ? rawKey.slice(1, -1) : parseInt(rawKey, 10);
      if (node !== null && typeof node === 'object' && (key as any) in node) {
        this.jsonPathWalk((node as any)[key], `$${rest}`, `${currentPath}[${rawKey}]`, results, paths);
      }
      return;
    }

    // [?(expr)] — simple filter: [?(@.key operator value)]
    const filterMatch = e.match(/^\[\?\(@\.([a-zA-Z0-9_]+)\s*(==|!=|>|>=|<|<=)\s*(.+?)\)\](.*)/s);
    if (filterMatch) {
      const [, key, op, rawVal, rest] = filterMatch;
      let compareVal: any = rawVal.trim();
      if (compareVal === 'true') compareVal = true;
      else if (compareVal === 'false') compareVal = false;
      else if (compareVal === 'null') compareVal = null;
      else if (!isNaN(Number(compareVal))) compareVal = Number(compareVal);
      else if (/^['"]/.test(compareVal)) compareVal = compareVal.slice(1, -1);

      if (Array.isArray(node)) {
        node.forEach((item, idx) => {
          const nodeVal = item?.[key];
          let pass = false;
          if (op === '==') pass = nodeVal == compareVal;
          else if (op === '!=') pass = nodeVal != compareVal;
          else if (op === '>') pass = nodeVal > compareVal;
          else if (op === '>=') pass = nodeVal >= compareVal;
          else if (op === '<') pass = nodeVal < compareVal;
          else if (op === '<=') pass = nodeVal <= compareVal;
          if (pass) this.jsonPathWalk(item, `$${rest}`, `${currentPath}[${idx}]`, results, paths);
        });
      }
      return;
    }
  }

  // ─── JSON Diff ────────────────────────────────────────────────────────────
  computeDiff(leftStr: string, rightStr: string): DiffResult {
    let left: any, right: any;
    try { left = JSON.parse(leftStr); } catch { return { nodes: [], addedCount: 0, removedCount: 0, changedCount: 0, identical: false }; }
    try { right = JSON.parse(rightStr); } catch { return { nodes: [], addedCount: 0, removedCount: 0, changedCount: 0, identical: false }; }

    const nodes: DiffNode[] = [];
    this.diffWalk(left, right, '$', nodes);

    const addedCount = nodes.filter(n => n.type === 'added').length;
    const removedCount = nodes.filter(n => n.type === 'removed').length;
    const changedCount = nodes.filter(n => n.type === 'changed').length;

    return { nodes, addedCount, removedCount, changedCount, identical: addedCount + removedCount + changedCount === 0 };
  }

  private diffWalk(left: any, right: any, path: string, nodes: DiffNode[]): void {
    if (JSON.stringify(left) === JSON.stringify(right)) {
      nodes.push({ path, type: 'unchanged', leftValue: left, rightValue: right });
      return;
    }

    const leftIsObj = left !== null && typeof left === 'object';
    const rightIsObj = right !== null && typeof right === 'object';

    if (leftIsObj && rightIsObj) {
      const leftKeys = new Set(Array.isArray(left) ? left.map((_, i) => String(i)) : Object.keys(left));
      const rightKeys = new Set(Array.isArray(right) ? right.map((_, i) => String(i)) : Object.keys(right));
      const allKeys = new Set([...leftKeys, ...rightKeys]);

      allKeys.forEach(k => {
        const childPath = Array.isArray(left) || Array.isArray(right) ? `${path}[${k}]` : `${path}.${k}`;
        if (leftKeys.has(k) && !rightKeys.has(k)) {
          nodes.push({ path: childPath, type: 'removed', leftValue: (left as any)[k] });
        } else if (!leftKeys.has(k) && rightKeys.has(k)) {
          nodes.push({ path: childPath, type: 'added', rightValue: (right as any)[k] });
        } else {
          this.diffWalk((left as any)[k], (right as any)[k], childPath, nodes);
        }
      });
    } else {
      nodes.push({ path, type: 'changed', leftValue: left, rightValue: right });
    }
  }

  // ─── String Escape / Unescape ─────────────────────────────────────────────
  escapeJsonString(input: string): string {
    try {
      // If it's already valid JSON, stringify it as a string value (escape it)
      return JSON.stringify(input);
    } catch {
      return input;
    }
  }

  unescapeJsonString(input: string): string {
    const trimmed = input.trim();
    // If wrapped in quotes, try to parse as a JSON string
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        return JSON.parse(trimmed);
      } catch { /* fall through */ }
    }
    // Otherwise try parsing as JSON and re-stringify formatted
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return input;
    }
  }

  // ─── JSON Node Graph Builder ──────────────────────────────────────────────
  buildJsonGraph(data: any): GraphData {
    if (data === undefined || data === null || typeof data !== 'object') {
      return { nodes: [], edges: [] };
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const columnYMap = new Map<number, number>();

    const CARD_WIDTH = 230;
    const COL_GAP = 110;
    const ROW_GAP = 24;
    const ROW_HEIGHT = 26;
    const HEADER_HEIGHT = 34;

    const traverse = (val: any, label: string, depth: number, currentPath: string = '$', parentId?: string): string => {
      const nodeId = `node_${nodes.length}_${label}`;
      const keys = Array.isArray(val)
        ? val.map((_, i) => String(i))
        : Object.keys(val || {});

      const rows: GraphNodeRow[] = [];
      const childRequests: { key: string; val: any; label: string; childPath: string }[] = [];

      keys.forEach(k => {
        const itemVal = val[k];
        const t = itemVal === null ? 'null' : Array.isArray(itemVal) ? 'array' : typeof itemVal;
        const rowPath = currentPath === '$' ? (Array.isArray(val) ? `$[${k}]` : `$.${k}`) : (Array.isArray(val) ? `${currentPath}[${k}]` : `${currentPath}.${k}`);

        if (t === 'object' || t === 'array') {
          const count = itemVal !== null ? (Array.isArray(itemVal) ? itemVal.length : Object.keys(itemVal).length) : 0;
          rows.push({
            key: k,
            value: itemVal,
            valueType: t,
            childCount: count,
            jsonPath: rowPath
          });
          childRequests.push({ key: k, val: itemVal, label: k, childPath: rowPath });
        } else {
          rows.push({
            key: k,
            value: itemVal,
            valueType: t as any,
            jsonPath: rowPath
          });
        }
      });

      const cardHeight = HEADER_HEIGHT + Math.max(rows.length, 1) * ROW_HEIGHT + 10;
      const colY = columnYMap.get(depth) || 30;
      const x = 30 + depth * (CARD_WIDTH + COL_GAP);
      const y = colY;

      columnYMap.set(depth, colY + cardHeight + ROW_GAP);

      const node: GraphNode = {
        id: nodeId,
        title: label,
        jsonPath: currentPath,
        parentId,
        rows,
        depth,
        colIndex: depth,
        x,
        y,
        width: CARD_WIDTH,
        height: cardHeight
      };

      nodes.push(node);

      // Process children
      childRequests.forEach(req => {
        const childNodeId = traverse(req.val, req.label, depth + 1, req.childPath, nodeId);
        const r = rows.find(row => row.key === req.key);
        if (r) r.childNodeId = childNodeId;
      });

      return nodeId;
    };

    traverse(data, '$', 0);

    // Calculate Bezier Edges
    nodes.forEach(n => {
      n.rows.forEach((row, rowIndex) => {
        if (row.childNodeId) {
          const targetNode = nodes.find(t => t.id === row.childNodeId);
          if (targetNode) {
            const x1 = n.x + n.width;
            const y1 = n.y + HEADER_HEIGHT + (rowIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
            const x2 = targetNode.x;
            const y2 = targetNode.y + (HEADER_HEIGHT / 2);

            const c1X = x1 + Math.min((x2 - x1) / 2, 70);
            const c2X = x2 - Math.min((x2 - x1) / 2, 70);
            const pathD = `M ${x1} ${y1} C ${c1X} ${y1}, ${c2X} ${y2}, ${x2} ${y2}`;

            edges.push({
              id: `edge_${n.id}_${row.key}_${targetNode.id}`,
              fromNodeId: n.id,
              fromRowKey: row.key,
              toNodeId: targetNode.id,
              x1,
              y1,
              x2,
              y2,
              pathD
            });
          }
        }
      });
    });

    return { nodes, edges };
  }

  // ─── AST Line Mapping for Scroll Sync ────────────────────────────────────
  buildLineMappingTable(sourceText: string, targetText: string): Map<number, number> {
    const map = new Map<number, number>();
    if (!sourceText || !targetText) return map;

    const sourceLines = sourceText.split('\n');
    const targetLines = targetText.split('\n');

    const targetKeyMap = new Map<string, number>();
    targetLines.forEach((line, idx) => {
      const match = line.match(/^(\s*)([a-zA-Z0-9_-]+)(\s*:|=)/);
      if (match && match[2]) {
        if (!targetKeyMap.has(match[2])) {
          targetKeyMap.set(match[2], idx + 1);
        }
      }
    });

    sourceLines.forEach((line, idx) => {
      const srcLineNum = idx + 1;
      const match = line.match(/^(\s*)([a-zA-Z0-9_-]+)(\s*:|=)/);
      if (match && match[2] && targetKeyMap.has(match[2])) {
        map.set(srcLineNum, targetKeyMap.get(match[2])!);
      } else {
        const ratio = sourceLines.length > 0 ? (idx / sourceLines.length) : 0;
        const targetLineNum = Math.max(1, Math.round(ratio * targetLines.length));
        map.set(srcLineNum, targetLineNum);
      }
    });

    return map;
  }
}
