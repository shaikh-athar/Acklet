import { Injectable } from '@angular/core';

export type FormatId = 'json' | 'yaml' | 'xml' | 'csv' | 'toml' | 'curl';

export interface FormatCapabilities {
  parse: boolean;
  validate: boolean;
  format: boolean;
  minify: boolean;
  sortKeys: boolean;
  tree: boolean;
  table: boolean;
  graph: boolean;
  stats: boolean;
  diff: boolean;
  conversion: boolean;
  codeGeneration: boolean;
}

export interface FormatDefinition {
  id: FormatId;
  label: string;
  badge: string;
  extensions: string[];
  mimeTypes?: string[];
  icon: string;
  category: 'structured-data' | 'tabular-data' | 'configuration' | 'api-representation';
  capabilities: FormatCapabilities;
}

@Injectable({
  providedIn: 'root'
})
export class FormatRegistryService {
  private readonly registry: Record<FormatId, FormatDefinition> = {
    json: {
      id: 'json',
      label: 'JSON',
      badge: 'JSON',
      extensions: ['.json'],
      mimeTypes: ['application/json', 'text/json'],
      icon: 'file-code',
      category: 'structured-data',
      capabilities: {
        parse: true,
        validate: true,
        format: true,
        minify: true,
        sortKeys: true,
        tree: true,
        table: true,
        graph: true,
        stats: true,
        diff: true,
        conversion: true,
        codeGeneration: true
      }
    },
    yaml: {
      id: 'yaml',
      label: 'YAML',
      badge: 'YAML',
      extensions: ['.yaml', '.yml'],
      mimeTypes: ['application/x-yaml', 'text/yaml'],
      icon: 'file-text',
      category: 'structured-data',
      capabilities: {
        parse: true,
        validate: true,
        format: true,
        minify: false,
        sortKeys: true,
        tree: true,
        table: true,
        graph: true,
        stats: true,
        diff: true,
        conversion: true,
        codeGeneration: true
      }
    },
    xml: {
      id: 'xml',
      label: 'XML',
      badge: 'XML',
      extensions: ['.xml', '.rss', '.svg'],
      mimeTypes: ['application/xml', 'text/xml'],
      icon: 'code',
      category: 'structured-data',
      capabilities: {
        parse: true,
        validate: true,
        format: true,
        minify: true,
        sortKeys: false,
        tree: true,
        table: false,
        graph: true,
        stats: true,
        diff: true,
        conversion: true,
        codeGeneration: false
      }
    },
    csv: {
      id: 'csv',
      label: 'CSV',
      badge: 'CSV',
      extensions: ['.csv'],
      mimeTypes: ['text/csv'],
      icon: 'table',
      category: 'tabular-data',
      capabilities: {
        parse: true,
        validate: true,
        format: true,
        minify: false,
        sortKeys: false,
        tree: false,
        table: true,
        graph: false,
        stats: true,
        diff: true,
        conversion: true,
        codeGeneration: false
      }
    },
    toml: {
      id: 'toml',
      label: 'TOML',
      badge: 'TOML',
      extensions: ['.toml'],
      mimeTypes: ['application/toml'],
      icon: 'settings',
      category: 'configuration',
      capabilities: {
        parse: true,
        validate: true,
        format: true,
        minify: false,
        sortKeys: true,
        tree: true,
        table: false,
        graph: false,
        stats: true,
        diff: true,
        conversion: true,
        codeGeneration: true
      }
    },
    curl: {
      id: 'curl',
      label: 'cURL',
      badge: 'cURL',
      extensions: ['.sh'],
      mimeTypes: ['text/plain'],
      icon: 'terminal',
      category: 'api-representation',
      capabilities: {
        parse: true,
        validate: true,
        format: false,
        minify: false,
        sortKeys: false,
        tree: true,
        table: true,
        graph: true,
        stats: true,
        diff: false,
        conversion: true,
        codeGeneration: true
      }
    }
  };

  getAllFormats(): FormatDefinition[] {
    return Object.values(this.registry);
  }

  getFormat(id: FormatId): FormatDefinition {
    return this.registry[id] || this.registry['json'];
  }

  getCapabilities(id: FormatId): FormatCapabilities {
    return this.getFormat(id).capabilities;
  }

  detectFormat(input: string, filename?: string): FormatId {
    if (filename) {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
      if (lower.endsWith('.xml')) return 'xml';
      if (lower.endsWith('.csv')) return 'csv';
      if (lower.endsWith('.toml')) return 'toml';
      if (lower.endsWith('.json')) return 'json';
    }

    if (!input || !input.trim()) return 'json';

    const str = input.trim();

    // 1. Check cURL Command
    if (/^curl\s+/i.test(str) || str.includes('curl ')) {
      return 'curl';
    }

    // 2. Check XML Signature
    if (/^<\?xml/i.test(str) || (str.startsWith('<') && str.endsWith('>') && str.includes('</'))) {
      return 'xml';
    }

    // 3. Check JSON Signature
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      try {
        JSON.parse(str);
        return 'json';
      } catch {
        // Fallback checks
      }
    }

    // 4. Check TOML Signature ([section] or key = "value")
    if (/^\s*\[[a-zA-Z0-9_.-]+\]/m.test(str) || (/^[a-zA-Z0-9_-]+\s*=\s*.+/m.test(str) && !str.includes('{') && !str.includes('<'))) {
      return 'toml';
    }

    // 5. Check YAML Signature (key: value without braces or --- prefix)
    if (str.startsWith('---') || (/^[a-zA-Z0-9_-]+\s*:\s*.+/m.test(str) && !str.includes('{') && !str.includes('}'))) {
      return 'yaml';
    }

    // 5. Check CSV Signature
    if (str.includes(',') && str.includes('\n') && !str.includes('{') && !str.includes('<')) {
      const lines = str.split('\n');
      if (lines.length > 1 && lines[0].includes(',')) {
        return 'csv';
      }
    }

    return 'json';
  }
}
