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
    description: 'Online Clipboard is a free tool for moving content from one device to another without email, cables or messaging apps. Paste some text or a link, or add images and files, and you get a 5-digit code. Enter that code on another phone, tablet or computer and everything you shared appears right away.\n\nIt works in any modern browser and needs no account. Shared items are kept on our servers only so the receiving device can fetch them, and they are automatically deleted after 7 days. You can also delete items yourself at any time.\n\nUse it to send a link from your laptop to your phone, move photos to a computer without a cable, or hand a document to a colleague on a different network. Each file can be up to 200 MB.',
    icon: 'copy',
    version: '1.0.0',
    status: 'live',
    badge: 'updated',
    featured: true,
    order: 1,
    subdomain: 'clipboard',
    addedAt: '2026-01-15',
    updatedAt: '2026-10-07',
    accentHue: 195,
    supports: ['shield-check', 'zap', 'lock'],
    highlights: [
      { label: 'Max File Size', value: '200 MB', tooltip: 'Resumable chunked upload support up to 200MB per file' },
      { label: 'Auto Delete', value: '7 Days', tooltip: 'Configurable from 1 hour to 7 days retention' },
      { label: 'Sign-up', value: 'Not required', tooltip: 'Completely anonymous, no login or email needed' },
      { label: 'Encryption', value: 'AES-GCM', tooltip: 'Optional client-side zero-knowledge encryption' }
    ],
    requires: ['clipboard', 'backend'],
    tabs: [
      { id: 'send', label: 'Send', icon: 'upload' },
      { id: 'receive', label: 'Receive', icon: 'download' },
      { id: 'history', label: 'History', icon: 'history' }
    ],
    features: [
      'No signup or installation required',
      'Share text, links, images and files in one place',
      'Simple 5-digit code or memorable word code',
      'Up to 200 MB per file with resumable chunked uploads',
      'Works seamlessly across phone, tablet and desktop',
      'Image lightbox previews and one-click copy',
      'Live 2-way room mode and WebSocket instant sync',
      'Optional client-side AES-GCM end-to-end encryption',
      'Automatic deletion after retention period (1h to 7 days)'
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
        question: 'Is Online Clipboard free?',
        answer: 'Yes, it is completely free to use and requires no account or registration.'
      },
      {
        id: 'faq-max-size',
        question: 'What is the maximum file size?',
        answer: 'Each file can be up to 200 MB. Larger files are securely chunked and uploaded with resume capability.'
      },
      {
        id: 'faq-retention',
        question: 'How long are my items stored?',
        answer: 'Shared items are retained for up to 7 days by default, or 1 to 24 hours based on sender preference. You can also delete them manually at any time.'
      },
      {
        id: 'faq-privacy',
        question: 'Who can see what I share?',
        answer: 'Anyone who has your 5-digit code can view the items. For extra security, you can enable PIN protection or client-side AES-GCM encryption.'
      },
      {
        id: 'faq-file-types',
        question: 'Which file types are supported?',
        answer: 'All file types are supported, including plain text, code, Markdown, images (JPG, PNG, WebP, GIF), PDFs, and ZIP archives.'
      },
      {
        id: 'faq-cross-device',
        question: 'Can I share from my phone to my computer?',
        answer: 'Yes. It works in any modern browser on Android, iOS, Windows, macOS, and Linux.'
      },
      {
        id: 'faq-encryption',
        question: 'How does the end-to-end encryption work?',
        answer: 'When encryption is enabled, data is encrypted directly in your browser using AES-GCM before uploading. The encryption key is included in the URL fragment (#) or entered manually on the receiving device.'
      }
    ],
    suggestedTools: [],
    seo: {
      title: 'Online Clipboard: Share Text, Images and Files Between Devices | Acklet',
      description: 'Copy text, links, images and files on one device and paste them on another with a simple 5-digit code. Free, no signup, up to 200 MB per file.',
      keywords: ['online clipboard', 'share files', 'cross-device clipboard', 'send files', 'temporary file share', 'text sharing']
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
