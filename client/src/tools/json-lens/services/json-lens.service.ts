import { Injectable } from '@angular/core';

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
}

@Injectable({
  providedIn: 'root'
})
export class JsonLensService {

  format(input: string, options: JsonLensOptions): Promise<JsonLensResult> {
    return new Promise((resolve) => {
      if (!input || input.trim() === '') {
        return resolve({
          success: false,
          error: 'JSON payload cannot be empty',
          errorLine: 1,
          errorColumn: 1
        });
      }

      const byteSize = new Blob([input]).size;
      const fileSizeMb = (byteSize / (1024 * 1024)).toFixed(1);
      const isLarge = byteSize > 2 * 1024 * 1024; // > 2MB

      // Use setTimeout / non-blocking macro-task to prevent main thread UI freezing
      setTimeout(() => {
        const duplicates = this.detectDuplicateKeys(input);

        try {
          let parsed = JSON.parse(input);

          if (options.sortKeys) {
            parsed = this.sortKeys(parsed);
          }

          let formattedJson: string;
          if (options.minify) {
            formattedJson = JSON.stringify(parsed);
          } else {
            const indentVal = options.indent === '\t' ? '\t' : (typeof options.indent === 'number' ? options.indent : 2);
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
            fileSizeMb
          });

        } catch (e: any) {
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
            fileSizeMb
          });
        }
      }, isLarge ? 50 : 0);
    });
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

  convertTo(data: any, target: 'yaml' | 'csv' | 'xml'): string {
    if (!data) return '';

    if (target === 'yaml') {
      return this.toSimpleYaml(data);
    } else if (target === 'xml') {
      return `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${this.toXml(data, 2)}</root>`;
    } else if (target === 'csv') {
      return this.toCsv(data);
    }
    return '';
  }

  private detectDuplicateKeys(jsonStr: string): string[] {
    const duplicates: string[] = [];
    const keyRegex = /"([^"\\]*(\\.[^"\\]*)*)"\s*:/g;
    const seenMap: { [key: string]: number } = {};

    let match;
    while ((match = keyRegex.exec(jsonStr)) !== null) {
      const key = match[1];
      seenMap[key] = (seenMap[key] || 0) + 1;
    }

    for (const k in seenMap) {
      if (seenMap[k] > 1) {
        duplicates.push(k);
      }
    }
    return duplicates;
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
    if (!Array.isArray(obj) || obj.length === 0) {
      return 'This JSON structure isn\'t naturally tabular.\nTry Tree view instead.';
    }
    const headers = Object.keys(obj[0]);
    let csv = headers.join(',') + '\n';
    for (const row of obj) {
      csv += headers.map(h => JSON.stringify(row[h] ?? '')).join(',') + '\n';
    }
    return csv;
  }
}
