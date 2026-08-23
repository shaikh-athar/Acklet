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
  'json-formatter': {
    id: 'tool-2', // maps to MOCK_TOOLS tool-2
    name: 'JSON Formatter',
    slug: 'json-formatter',
    category: 'Formatters',
    description: 'JSON Formatter is the fastest way to clean up messy JSON. Paste your raw JSON to instantly beautify it with proper indentation and syntax highlighting. Minify for production, validate structure, and spot errors with clear line-level indicators.',
    shortDescription: 'Beautify, minify, and validate JSON with syntax highlighting.',
    version: '1.0.0',
    status: 'active',
    route: '/tools/json-formatter',
    icon: 'braces',
    theme: {
      mode: 'both',
      accent: '#f97316'
    },
    features: [
      'One-click JSON beautification with configurable indent',
      'Minify JSON for production use',
      'Real-time syntax validation with error indicators',
      'Syntax-highlighted output',
      'Copy to clipboard with one click',
      'JSON path explorer'
    ],
    capabilities: [
      'offline-first',
      'sub-10ms-latency'
    ],
    seo: {
      title: 'JSON Formatter & Validator — Free Online Tool | Acklet',
      description: 'Format, validate, minify and inspect JSON directly in your browser.',
      keywords: ['json', 'formatter', 'beautify', 'minify', 'validator', 'json-parser']
    },
    analytics: {
      enabled: true,
      toolId: 'json_formatter_001'
    },
    relatedTools: ['jwt-inspector', 'yaml-validator', 'csv-to-json']
  }
};

// Dynamic Component map for dynamic imports of tool components
export const TOOL_COMPONENTS: Record<string, () => Promise<Type<any>>> = {
  'json-formatter': () => import('../../../tools/json-lens/json-lens.component').then(m => m.JsonLensComponent)
};
