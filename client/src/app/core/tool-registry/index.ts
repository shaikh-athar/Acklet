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
  'airvault': {
    id: 'tool-airvault',
    name: 'AirVault',
    slug: 'airvault',
    category: 'Sync & Utilities',
    description: 'AirVault is a real-time, peer-to-peer cross-device clipboard synchronization platform with zero-knowledge End-to-End Encryption (E2EE), smart content classification, and GSAP motion.',
    shortDescription: 'Real-time, zero-knowledge cross-device clipboard and content sync.',
    version: '1.0.0',
    status: 'active',
    route: '/tools/app/airvault',
    icon: 'zap',
    theme: {
      mode: 'both',
      accent: '#00D2B4'
    },
    features: [
      'Zero-knowledge E2EE using Web Crypto ECDH and AES-GCM-256',
      'Real-time P2P WebRTC DataChannel & multi-tab BroadcastChannel sync',
      'Smart classifier for Code, Rich URLs, Images, Files, and Plain Text',
      'Sensitive credential detector with auto-masking shield',
      'Device Constellation presence dock with QR and 6-digit PIN pairing',
      '100% in-browser IndexedDB persistence with automated TTL purge'
    ],
    capabilities: [
      'offline-first',
      'e2ee',
      'p2p-sync',
      'clipboard',
      'client-only'
    ],
    seo: {
      title: 'AirVault — Cross-Device Clipboard & Content Sync — Acklet',
      description: 'Synchronize clipboard text, code, images, and links across your devices securely with zero-knowledge E2EE.',
      keywords: ['clipboard sync', 'cross-device clipboard', 'p2p clipboard', 'e2ee sync', 'uniclipboard alternative', 'airvault']
    }
  },
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
  'airvault': () => import('../../../tools/airvault/airvault.component').then(m => m.AirVaultComponent),
  'air-vault': () => import('../../../tools/airvault/airvault.component').then(m => m.AirVaultComponent),
  'datalens': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent),
  'data-lens': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent),
  'json-formatter': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent),
  'json-lens': () => import('../../../tools/data-lens/data-lens.component').then(m => m.JsonLensComponent)
};
