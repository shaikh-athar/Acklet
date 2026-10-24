// packages/tool-registry/src/manifests/clipboard.manifest.ts
import type { ToolRegistryItem } from '../models';
import { TEAL_ACCENT } from '../accent-presets';

export const CLIPBOARD_MANIFEST: ToolRegistryItem = {
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
  theme: {
    accent: TEAL_ACCENT,
    font: {
      family: 'Nunito',
      fontFamily: "'Nunito', system-ui, -apple-system, sans-serif",
      fallback: 'system-ui, -apple-system, sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
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
};
