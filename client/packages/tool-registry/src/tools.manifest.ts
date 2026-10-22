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
  'qr': {
    id: 'qr',
    name: 'QR Code Generator',
    slug: 'qr',
    category: 'Utilities',
    categorySlug: 'utilities',
    shortDescription: 'Create, customize, and download high-resolution QR codes locally in your browser.',
    about: 'QR Generator is a lightweight, privacy-first utility to generate and customize QR codes for text, URLs, email addresses, and phone numbers. Everything is computed 100% client-side with zero telemetry.',
    description: 'Create QR codes for websites, plain text, email messages, and phone numbers. Customize error correction and size, test color contrast, preview in real time, and download crisp PNG files without sending any data to a remote server.',
    icon: 'qr-code',
    version: '1.0.0',
    status: 'live',
    badge: 'new',
    featured: true,
    order: 2,
    subdomain: 'qr',
    layout: 'fullBleed',
    addedAt: '2026-10-20',
    updatedAt: '2026-10-20',
    accent: 'blue',
    accentHue: 217,
    supports: ['shield-check', 'zap', 'download'],
    facts: [
      { label: 'Privacy', value: '100% Client-Side' },
      { label: 'Export', value: 'Lossless PNG' },
      { label: 'Tracking', value: 'Zero Telemetry' }
    ],
    highlights: [
      { label: 'Privacy', value: '100% Local', tooltip: 'No server upload; generated entirely in-browser' },
      { label: 'Payloads', value: '4 Formats', tooltip: 'Text, URL, Email, and Phone types supported' },
      { label: 'Export', value: 'Crisp PNG', tooltip: 'Standard raster export ready for screens and print' }
    ],
    tabs: [
      { id: 'create', label: 'Generator', icon: 'qr-code' }
    ],
    features: [
      'Processed locally in your browser — zero tracking',
      'Supports Text, URLs, mailto: emails, and tel: phone numbers',
      'Instant real-time preview on every keystroke',
      'One-click high-resolution PNG download',
      'Clean dual-theme support (Dark & Light)'
    ],
    howTo: [
      'Select your content type: Text, URL, Email, or Phone.',
      'Enter your text or link into the input canvas.',
      'Check the live QR code preview on the right.',
      'Click Download PNG to save your code instantly.'
    ],
    howItWorks: [
      'Select content type to configure payload formatting automatically.',
      'Type or paste your information in the input area.',
      'The client engine renders the QR code matrix with 250ms debouncing.',
      'Export the generated canvas as a PNG file directly to your downloads.'
    ],
    faqs: [
      {
        id: 'faq-privacy',
        question: 'Does this QR Generator send my data to a server?',
        answer: 'No. The entire QR generation process happens 100% client-side in your browser. No text, link, email, or phone number ever leaves your device.'
      },
      {
        id: 'faq-formats',
        question: 'What content types are supported?',
        answer: 'You can generate QR codes for plain text, website URLs, RFC 5322 email addresses (mailto:), and international phone numbers (tel:).'
      },
      {
        id: 'faq-commercial',
        question: 'Can I use generated QR codes for commercial projects and print?',
        answer: 'Yes! Generated QR codes are completely free and unencumbered for personal or commercial use.'
      }
    ],
    related: ['clipboard', 'json-formatter', 'uuid-generator', 'base64-encoder'],
    suggestedTools: ['clipboard', 'json-formatter', 'uuid-generator', 'base64-encoder'],
    seo: {
      title: 'QR Code Generator — Free, Private & Instant | Acklet',
      description: 'Generate customizable QR codes for text, URLs, email, and phone numbers directly in your browser. 100% private with no tracking.',
      keywords: ['qr generator', 'qr code maker', 'client-side qr', 'free qr code', 'private qr code']
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
