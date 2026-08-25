// src/app/core/tool-registry/index.ts

import { Type } from '@angular/core';

export interface ToolManifest {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  version: string;
  status: 'active' | 'beta' | 'deprecated';
  route: string;
  icon: string;
  logo?: string;
  theme?: {
    mode?: 'light' | 'dark' | 'both';
    accent?: string;
  };
  features?: string[];
  capabilities?: string[];
  seo?: {
    title: string;
    description: string;
    keywords: string[];
  };
  analytics?: {
    enabled: boolean;
    toolId: string;
  };
  relatedTools?: string[];
}

export const TOOL_REGISTRY: Record<string, ToolManifest> = {
  'datalens': {
    id: 'tool-2',
    name: 'DataLens',
    slug: 'datalens',
    category: 'Formatters & Analyzers',
    description: 'DataLens is a high-performance multi-format workspace for formatting, validating, diffing, querying, and transforming data across JSON, YAML, XML, TOML, CSV, and cURL.',
    shortDescription: 'Format, validate, compare, inspect, and transform multi-format structured data.',
    version: '2.0.0',
    status: 'active',
    route: '/tools/app/datalens',
    icon: 'search',
    theme: {
      mode: 'both',
      accent: '#2FA084'
    },
    features: [
      'Multi-format support for JSON, YAML, XML, TOML, CSV & cURL',
      'Side-by-side structured Git-style Compare engine',
      'Interactive Tree, Table, Graph & JSONPath query inspector',
      'Polyglot code generator (TypeScript, Python, Go, Rust, Swift, etc.)',
      'Smart syntax repair and auto-detection',
      '100% offline & client-side security'
    ],
    capabilities: [
      'offline-first',
      'sub-10ms-latency'
    ],
    seo: {
      title: 'DataLens — Multi-Format Data Workspace & Validator | Acklet',
      description: 'Format, validate, compare, minify and inspect JSON, YAML, XML, TOML, and CSV payloads directly in your browser.',
      keywords: ['datalens', 'json', 'yaml', 'xml', 'toml', 'csv', 'formatter', 'beautify', 'minify', 'validator', 'diff']
    },
    analytics: {
      enabled: true,
      toolId: 'datalens_001'
    },
    relatedTools: ['jwt-inspector', 'yaml-validator', 'csv-to-json']
  },
  'json-formatter': {
    id: 'tool-2',
    name: 'DataLens (JSON Formatter)',
    slug: 'json-formatter',
    category: 'Formatters',
    description: 'DataLens JSON Formatter is the fastest way to clean up messy JSON payloads.',
    shortDescription: 'Beautify, minify, and validate JSON with syntax highlighting.',
    version: '2.0.0',
    status: 'active',
    route: '/tools/app/json-formatter',
    icon: 'braces',
    theme: {
      mode: 'both',
      accent: '#2FA084'
    }
  }
};

// Dynamic Component map for dynamic imports of tool components
export const TOOL_COMPONENTS: Record<string, () => Promise<Type<any>>> = {
  'datalens': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent),
  'data-lens': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent),
  'json-formatter': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent),
  'json-lens': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent)
};
