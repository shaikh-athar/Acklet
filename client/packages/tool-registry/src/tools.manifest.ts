// packages/tool-registry/src/tools.manifest.ts
import type { ToolRegistryItem } from './models';

/**
 * Single Source of Truth for all tools in Acklet.
 */
export const TOOL_REGISTRY: Record<string, ToolRegistryItem> = {
  'clipboard': {
    id: 'clipboard',
    name: 'Online Clipboard',
    slug: 'clipboard',
    category: 'Utilities',
    categorySlug: 'utilities',
    shortDescription: 'Share text, links, images and files between any two devices with a 5-digit code.',
    about: 'Online Clipboard is a private, lightweight workspace to move text snippets, links, images, and files between any two devices in seconds. There is no account to create, no app to install, and zero tracking or advertising.\n\nEntering a quick 5-digit code pairs your devices across networks. Content stays in memory and temporary storage strictly until delivered or expired, keeping your data confidential.',
    description: 'Online Clipboard is a free tool for moving content from one device to another without email, cables or messaging apps. Paste some text or a link, or add images and files, and you get a 5-digit code. Enter that code on another phone, tablet or computer and everything you shared appears right away.\n\nIt works in any modern browser and needs no account. Shared items are kept on our servers only so the receiving device can fetch them, and they are automatically deleted after 7 days. You can also delete items yourself at any time.\n\nUse it to send a link from your laptop to your phone, move photos to a computer without a cable, or hand a document to a colleague on a different network. Each file can be up to 200 MB.',
    icon: 'clipboard',
    version: '1.0.0',
    status: 'live',
    badge: 'updated',
    featured: true,
    order: 1,
    subdomain: 'clipboard',
    executionMode: 'browser',
    layout: 'fullBleed',
    addedAt: '2026-01-15',
    updatedAt: '2026-10-07',
    accent: 'teal',
    accentHue: 195,
    supports: ['shield-check', 'zap', 'lock'],
    facts: [
      { label: 'Max file size', value: '200 MB' },
      { label: 'Auto delete', value: '7 days' },
      { label: 'Encryption', value: 'AES-GCM' }
    ],
    highlights: [
      { label: 'Max File Size', value: '200 MB', tooltip: 'Resumable chunked upload support up to 200MB per file' },
      { label: 'Auto Delete', value: '7 Days', tooltip: 'Configurable from 1 hour to 7 days retention' },
      { label: 'Sign-up', value: 'Not required', tooltip: 'Completely anonymous, no login or email needed' },
      { label: 'Encryption', value: 'AES-GCM', tooltip: 'Optional client-side zero-knowledge encryption' }
    ],
    tabs: [
      { id: 'text', label: 'Text & Links', icon: 'file-text' },
      { id: 'files', label: 'Files & Images', icon: 'folder' }
    ],
    features: [
      'Runs in your browser',
      'No sign-up or registration',
      'No tracking & no ads',
      'Instant 5-digit sync code',
      'Up to 200 MB per file',
      'Automatic auto-deletion'
    ],
    howTo: [
      'Paste your text snippet, link, or drop files into the Send tab.',
      'A secure 5-digit pairing code is instantly generated.',
      'Open Online Clipboard on your receiving device and select Receive.',
      'Enter the 5-digit code to preview and download your items immediately.'
    ],
    howItWorks: [
      'Open Online Clipboard on your sending device.',
      'Add text snippets, links, images or documents using the tabs.',
      'A 5-digit code is generated instantly.',
      'On the receiving device, select Receive and enter the 5-digit code.',
      'Download files individually or bundled as a ZIP archive.'
    ],
    faqs: [
      {
        id: 'faq-free',
        question: 'Is Online Clipboard completely free to use?',
        answer: 'Yes. Online Clipboard is completely free with no hidden paywalls, subscription tiers, or usage limits.'
      },
      {
        id: 'faq-privacy',
        question: 'Do you collect personal data or show advertisements?',
        answer: 'No. Acklet upholds a strict privacy promise: no advertisements, no tracking scripts, and no personal data collection. You never need to provide an email address or sign up.'
      },
      {
        id: 'faq-max-size',
        question: 'What is the maximum file size supported?',
        answer: 'You can transfer files up to 200 MB each. Uploads use resumable chunking so transfers remain dependable even on unstable connections.'
      },
      {
        id: 'faq-retention',
        question: 'How long does shared content stay available?',
        answer: 'Content is temporarily stored for transfer and automatically purged after 7 days (or sooner if manually deleted by the sender).'
      },
      {
        id: 'faq-devices',
        question: 'Which devices and browsers are supported?',
        answer: 'Online Clipboard runs directly in any modern web browser across macOS, Windows, Linux, iOS, and Android without needing any app installation.'
      }
    ],
    related: ['json-formatter', 'jwt-inspector', 'uuid-generator', 'base64-encoder'],
    suggestedTools: ['json-formatter', 'jwt-inspector', 'uuid-generator', 'base64-encoder'],
    seo: {
      title: 'Online Clipboard: Share Text, Images and Files Between Devices | Acklet',
      description: 'Copy text, links, images and files on one device and paste them on another with a simple 5-digit code. Free, no signup, up to 200 MB per file.',
      keywords: ['online clipboard', 'share files', 'cross-device clipboard', 'send files', 'temporary file share', 'text sharing']
    }
  },
  'json-formatter': {
    id: 'json-formatter',
    name: 'JSON Formatter',
    slug: 'json-formatter',
    category: 'Formatters',
    categorySlug: 'formatters',
    shortDescription: 'Beautify, minify, and validate JSON with real-time error detection.',
    about: 'JSON Formatter is a fast, keyboard-friendly editor to format, validate, and minify JSON payloads in your browser.',
    description: 'Clean up messy JSON, minify for production payloads, and detect syntax errors with line-level indicators.',
    icon: 'braces',
    version: '1.0.0',
    status: 'live',
    badge: 'updated',
    featured: true,
    order: 2,
    subdomain: 'json-formatter',
    executionMode: 'browser',
    accentHue: 28,
    features: ['Runs offline in browser', 'Syntax error locator', 'Minify & beautify', 'No data stored'],
    howTo: [
      'Paste your raw JSON into the editor.',
      'Click Format to beautify or Minify to compress.',
      'Copy the formatted output with one click.'
    ],
    faqs: [
      {
        id: 'json-privacy',
        question: 'Is my JSON uploaded anywhere?',
        answer: 'No. All formatting and validation executes entirely in your browser memory.'
      }
    ],
    related: ['jwt-inspector', 'clipboard', 'base64-encoder'],
    seo: {
      title: 'JSON Formatter & Validator | Acklet',
      description: 'Format, validate and minify JSON in your browser with zero latency.',
      keywords: ['json formatter', 'json validator', 'beautify json']
    }
  },
  'jwt-inspector': {
    id: 'jwt-inspector',
    name: 'JWT Inspector',
    slug: 'jwt-inspector',
    category: 'Developer',
    categorySlug: 'developer',
    shortDescription: 'Decode, verify, and inspect JSON Web Tokens in real-time.',
    about: 'Decode JWT tokens, inspect claims, and check expiration time without sending secrets to any server.',
    description: 'JWT Inspector lets you inspect token headers, payloads, and signatures with client-side verification.',
    icon: 'key-round',
    version: '1.0.0',
    status: 'live',
    badge: 'updated',
    featured: true,
    order: 3,
    subdomain: 'jwt',
    executionMode: 'browser',
    accentHue: 245,
    features: ['Client-side decoding', 'Expiration warning', 'Header & payload breakdown'],
    howTo: [
      'Paste your encoded JSON Web Token.',
      'Review decoded header and payload claims instantly.',
      'Check expiration timestamp and signature validity.'
    ],
    faqs: [
      {
        id: 'jwt-security',
        question: 'Is it safe to paste sensitive tokens?',
        answer: 'Yes. Token decoding happens 100% on your device inside browser memory without network transmission.'
      }
    ],
    related: ['clipboard', 'json-formatter', 'base64-encoder'],
    seo: {
      title: 'JWT Inspector & Token Decoder | Acklet',
      description: 'Decode and inspect JSON Web Tokens safely in your browser.',
      keywords: ['jwt decoder', 'jwt inspector', 'decode token']
    }
  },
  'uuid-generator': {
    id: 'uuid-generator',
    name: 'UUID Generator',
    slug: 'uuid-generator',
    category: 'Utilities',
    categorySlug: 'utilities',
    shortDescription: 'Generate cryptographically secure UUID v4 and v7 identifiers in bulk.',
    about: 'Generate cryptographically random UUIDs v4 and sortable UUIDs v7 instantly for databases and APIs.',
    description: 'Bulk UUID generator with custom formatting options (uppercase, hyphens) and one-click copy.',
    icon: 'fingerprint',
    version: '1.0.0',
    status: 'live',
    order: 4,
    subdomain: 'uuid',
    executionMode: 'browser',
    accentHue: 330,
    features: ['UUID v4 & v7', 'Bulk generation', 'Cryptographically secure'],
    howTo: [
      'Choose UUID version and quantity.',
      'Select formatting options.',
      'Copy generated UUIDs to clipboard.'
    ],
    faqs: [
      {
        id: 'uuid-randomness',
        question: 'Are the UUIDs cryptographically random?',
        answer: 'Yes, generated using the native browser crypto.getRandomValues API.'
      }
    ],
    related: ['clipboard', 'base64-encoder', 'json-formatter'],
    seo: {
      title: 'UUID Generator (v4 & v7) | Acklet',
      description: 'Generate bulk UUID v4 and v7 identifiers instantly.',
      keywords: ['uuid generator', 'guid generator', 'uuid v4', 'uuid v7']
    }
  },
  'base64-encoder': {
    id: 'base64-encoder',
    name: 'Base64 Encoder / Decoder',
    slug: 'base64-encoder',
    category: 'Utilities',
    categorySlug: 'utilities',
    shortDescription: 'Convert text, strings, and files to and from Base64 encoding.',
    about: 'Encode and decode Base64 strings, UTF-8 text, and binary files with URL-safe option.',
    description: 'Fast, secure Base64 converter running locally in your browser with zero server roundtrips.',
    icon: 'binary',
    version: '1.0.0',
    status: 'live',
    order: 5,
    subdomain: 'base64',
    executionMode: 'browser',
    accentHue: 215,
    features: ['Standard & URL-safe', 'Instant conversion', 'Zero server uploads'],
    howTo: [
      'Enter text or upload a file.',
      'Choose Encode or Decode.',
      'Copy the output string.'
    ],
    faqs: [
      {
        id: 'b64-urlsafe',
        question: 'Does this support URL-safe Base64?',
        answer: 'Yes, both RFC standard (+/) and URL-safe (-_) variants are supported.'
      }
    ],
    related: ['clipboard', 'jwt-inspector', 'json-formatter'],
    seo: {
      title: 'Base64 Encoder & Decoder | Acklet',
      description: 'Encode and decode text and files in Base64 format.',
      keywords: ['base64 encoder', 'base64 decoder', 'url safe base64']
    }
  }
};

export function getAllTools(): ToolRegistryItem[] {
  return Object.values(TOOL_REGISTRY).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export function getToolsByCategory(category: string, excludeSlug?: string): ToolRegistryItem[] {
  return Object.values(TOOL_REGISTRY).filter(
    tool => tool.category.toLowerCase() === category.toLowerCase() && tool.slug !== excludeSlug
  );
}

export function getToolBySlug(slug: string): ToolRegistryItem | undefined {
  return TOOL_REGISTRY[slug];
}
