// client/apps/tool-qr-generator/src/utils/social-platforms.data.ts

export interface SocialPlatformConfig {
  id: string;
  name: string;
  domains: string[];
  placeholder: string;
  iconName?: string;
  buildUrl: (raw: string) => string;
}

export const ALL_SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    domains: ['instagram.com', 'instagr.am'],
    placeholder: '@username or profile link',
    iconName: 'instagram',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://instagram.com/${clean}`;
    }
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    domains: ['linkedin.com'],
    placeholder: 'linkedin.com/in/username or handle',
    iconName: 'linkedin',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      if (/^https?:\/\//i.test(raw)) return raw;
      if (clean.startsWith('in/')) return `https://linkedin.com/${clean}`;
      return `https://linkedin.com/in/${clean}`;
    }
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    domains: ['x.com', 'twitter.com'],
    placeholder: '@username or profile link',
    iconName: 'x',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://x.com/${clean}`;
    }
  },
  {
    id: 'youtube',
    name: 'YouTube',
    domains: ['youtube.com', 'youtu.be'],
    placeholder: '@channel, username, or video link',
    iconName: 'youtube',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      if (/^https?:\/\//i.test(raw)) return raw;
      return `https://youtube.com/@${clean}`;
    }
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    domains: ['tiktok.com'],
    placeholder: '@username or profile link',
    iconName: 'tiktok',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://tiktok.com/@${clean}`;
    }
  },
  {
    id: 'facebook',
    name: 'Facebook',
    domains: ['facebook.com', 'fb.me', 'fb.com'],
    placeholder: 'username, page, or profile link',
    iconName: 'facebook',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://facebook.com/${clean}`;
    }
  },
  {
    id: 'github',
    name: 'GitHub',
    domains: ['github.com'],
    placeholder: 'username or repository link',
    iconName: 'github',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://github.com/${clean}`;
    }
  },
  {
    id: 'threads',
    name: 'Threads',
    domains: ['threads.net'],
    placeholder: '@username or profile link',
    iconName: 'threads',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://threads.net/@${clean}`;
    }
  },
  {
    id: 'twitch',
    name: 'Twitch',
    domains: ['twitch.tv'],
    placeholder: 'username or channel link',
    iconName: 'twitch',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://twitch.tv/${clean}`;
    }
  },
  {
    id: 'discord',
    name: 'Discord',
    domains: ['discord.gg', 'discord.com'],
    placeholder: 'discord.gg/invite or username',
    iconName: 'discord',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      if (clean.startsWith('discord.gg/')) return `https://${clean}`;
      return `https://discord.gg/${clean}`;
    }
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    domains: ['wa.me', 'whatsapp.com', 'api.whatsapp.com'],
    placeholder: 'Phone number with country code (e.g. 14155552671)',
    iconName: 'whatsapp',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      const digits = clean.replace(/\D/g, '');
      return `https://wa.me/${digits}`;
    }
  },
  {
    id: 'telegram',
    name: 'Telegram',
    domains: ['t.me', 'telegram.me'],
    placeholder: '@username or channel link',
    iconName: 'telegram',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://t.me/${clean}`;
    }
  },
  {
    id: 'reddit',
    name: 'Reddit',
    domains: ['reddit.com'],
    placeholder: 'u/username or r/subreddit',
    iconName: 'reddit',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      if (clean.startsWith('r/') || clean.startsWith('u/')) return `https://reddit.com/${clean}`;
      return `https://reddit.com/u/${clean}`;
    }
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    domains: ['pinterest.com', 'pin.it'],
    placeholder: 'username or board link',
    iconName: 'pinterest',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://pinterest.com/${clean}`;
    }
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    domains: ['snapchat.com'],
    placeholder: 'username or add link',
    iconName: 'snapchat',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://snapchat.com/add/${clean}`;
    }
  },
  {
    id: 'spotify',
    name: 'Spotify',
    domains: ['spotify.com', 'open.spotify.com'],
    placeholder: 'Artist, playlist, or track URL',
    iconName: 'spotify',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      return /^https?:\/\//i.test(clean) ? clean : `https://open.spotify.com/${clean}`;
    }
  },
  {
    id: 'medium',
    name: 'Medium',
    domains: ['medium.com'],
    placeholder: '@username or story link',
    iconName: 'medium',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      const handle = clean.replace(/^@/, '');
      return `https://medium.com/@${handle}`;
    }
  },
  {
    id: 'patreon',
    name: 'Patreon',
    domains: ['patreon.com'],
    placeholder: 'creator name or page link',
    iconName: 'patreon',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://patreon.com/${clean}`;
    }
  },
  {
    id: 'substack',
    name: 'Substack',
    domains: ['substack.com'],
    placeholder: 'publication.substack.com or link',
    iconName: 'substack',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      const sub = clean.replace(/\.substack\.com$/, '');
      return `https://${sub}.substack.com`;
    }
  },
  {
    id: 'behance',
    name: 'Behance',
    domains: ['behance.net'],
    placeholder: 'username or portfolio link',
    iconName: 'behance',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://behance.net/${clean}`;
    }
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    domains: ['dribbble.com'],
    placeholder: 'username or shot link',
    iconName: 'dribbble',
    buildUrl: (raw: string) => {
      const clean = raw.trim().replace(/^@/, '');
      return /^https?:\/\//i.test(raw) ? raw : `https://dribbble.com/${clean}`;
    }
  },
  {
    id: 'custom',
    name: 'Custom / Other Link',
    domains: [],
    placeholder: 'Paste any website or profile link',
    buildUrl: (raw: string) => {
      const clean = raw.trim();
      if (/^https?:\/\//i.test(clean)) return clean;
      return `https://${clean}`;
    }
  }
];

export const SOCIAL_PLATFORMS_MAP = new Map<string, SocialPlatformConfig>(
  ALL_SOCIAL_PLATFORMS.map(p => [p.id, p])
);

/**
 * Automatically inspects a URL or input string to detect if it matches any of the
 * 20+ supported social media platforms.
 */
export function detectPlatformFromUrl(input: string): SocialPlatformConfig | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Try URL parsing
  let hostname = '';
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    // If not a valid URL structure yet, try regex on domain names
  }

  for (const config of ALL_SOCIAL_PLATFORMS) {
    if (config.id === 'custom') continue;
    for (const domain of config.domains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return config;
      }
      // Also match raw domain in string e.g. "linkedin.com/in/..."
      const domainPattern = new RegExp(`(^|https?:\\/\\/|(?:www\\.)?)${domain.replace('.', '\\.')}`, 'i');
      if (domainPattern.test(trimmed)) {
        return config;
      }
    }
  }

  return null;
}

export function getSocialPlatform(id: string): SocialPlatformConfig {
  return SOCIAL_PLATFORMS_MAP.get(id) ?? SOCIAL_PLATFORMS_MAP.get('custom')!;
}

const BRAND_SVGS: Record<string, string> = {
  instagram: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#E1306C"/><rect x="4.5" y="4.5" width="15" height="15" rx="3.5" fill="none" stroke="white" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="white" stroke-width="1.8"/><circle cx="16.2" cy="7.8" r="1.1" fill="white"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#000000"/><path fill="white" d="M17.5 5.5h2l-4.4 5 5.1 6.8h-4.1l-3.2-4.2-3.7 4.2h-2l4.7-5.4L6.5 5.5h4.2l2.9 3.8zm-.7 10.6h1.1L9.8 6.6H8.6z"/></svg>',
  twitter: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#000000"/><path fill="white" d="M17.5 5.5h2l-4.4 5 5.1 6.8h-4.1l-3.2-4.2-3.7 4.2h-2l4.7-5.4L6.5 5.5h4.2l2.9 3.8zm-.7 10.6h1.1L9.8 6.6H8.6z"/></svg>',
  linkedin: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4.5" fill="#0A66C2"/><path fill="#ffffff" d="M7.12 5.5a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24zm-1.42 4.74h2.84v8.26H5.7v-8.26zm4.5 0h2.72v1.13h.04c.38-.72 1.3-1.47 2.68-1.47 2.87 0 3.4 1.89 3.4 4.34v4.26h-2.83v-3.77c0-.9-.02-2.06-1.25-2.06-1.26 0-1.45.98-1.45 2v3.83H10.2v-8.26z"/></svg>',
  youtube: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#FF0000"/><path fill="white" d="M10 15l5-3-5-3v6z"/><path fill="none" stroke="white" stroke-width="1.8" d="M20 8c-.2-.7-.7-1.3-1.4-1.5C17.3 6 12 6 12 6s-5.3 0-6.6.5C4.7 6.7 4.2 7.3 4 8c-.4 1.3-.4 4-.4 4s0 2.7.4 4c.2.7.7 1.3 1.4 1.5 1.3.5 6.6.5 6.6.5s5.3 0 6.6-.5c.7-.2 1.2-.8 1.4-1.5.4-1.3.4-4 .4-4s0-2.7-.4-4z"/></svg>',
  facebook: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#1877F2"/><path fill="white" d="M16 4h-2.5c-2.2 0-3.5 1.5-3.5 3.5V10H7.5v3H10v7h3.5v-7h2.5l.5-3h-3V7.8c0-.7.4-1.1 1.2-1.1H16V4z"/></svg>',
  tiktok: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#000000"/><path fill="white" d="M17.5 7.5a3.8 3.8 0 0 1-3-3.4V4h-2.7v10.9a2.3 2.3 0 0 1-4.2 1.4 2.3 2.3 0 0 1 1.9-3.7c.2 0 .5 0 .7.1V10c-.2 0-.5-.1-.7-.1a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5V9.7a6.5 6.5 0 0 0 3.9 1.3V8.3c-.3 0-.6-.4-.9-.8z"/></svg>',
  whatsapp: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#25D366"/><path fill="white" d="M17.5 14.5c-.3.8-.9 1.4-1.7 1.6-.7.2-1.7.1-3.5-.7-2.3-1.1-3.8-3.5-3.9-3.7-.1-.2-.9-1.2-.9-2.3 0-1.1.6-1.6.8-1.8.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .5.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .5-.1.2-.2.3-.3.4l-.5.6c-.1.1-.2.2-.1.4.2.4.9 1.5 2 2.1 1.4.8 2.1.9 2.4.8.3-.1.7-.8.9-1.1.2-.3.4-.3.6-.2.2.1 1.4.7 1.6.8.2.1.4.2.4.3 0 .2 0 .9-.3 1.3z"/><path fill="none" stroke="white" stroke-width="1.8" d="M19.5 11.5a7.5 7.5 0 0 1-.8 3.4 7.5 7.5 0 0 1-6.7 4.1 7.5 7.5 0 0 1-3.4-.8L4.5 20l1.7-4.1a7.5 7.5 0 0 1-.7-3.4 7.5 7.5 0 0 1 4.1-6.7 7.5 7.5 0 0 1 3.4-.8h.5a7.5 7.5 0 0 1 7 7v.5z"/></svg>',
  telegram: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#229ED9"/><path fill="white" d="M19.6 5.6a1 1 0 0 0-1.1-.2L4.7 11.3c-.7.3-.7 1.2 0 1.5l3.8 1.4 1.4 4.5c.2.6.8.7 1.2.3l2.2-2.1 4.2 3.1c.6.4 1.4.1 1.5-.6l2.4-12.5c.1-.3 0-.7-.2-.9zm-7.8 8.2L9.8 18l-1-3.4 7.5-5.5-4.5 4.7z"/></svg>',
  github: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#24292F"/><path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M12 4C7.58 4 4 7.58 4 12c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 20 12c0-4.42-3.58-8-8-8z"/></svg>',
  discord: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#5865F2"/><path fill="white" d="M18.8 6.5c-1.3-.6-2.6-1-4-1.2l-.2.4c1.5.4 2.2 1.1 2.2 1.1-1.2-.7-2.5-1.1-3.8-1.3-.7-.1-1.4-.1-2.1 0C9.6 5.7 8.3 6.1 7.1 6.8c0 0 .7-.7 2.2-1.1l-.2-.4c-1.4.2-2.7.6-4 1.2C3.1 9.5 2.6 15.2 3.1 17.8c1.6 1.2 3.2 1.2 4.1 1.2.5-.6.9-1.3 1.3-2-1-.3-1.4-.9-1.4-.9.1.1.2.1.3.2 1.2.7 2.7 1.1 4.5 1.1s3.3-.4 4.5-1.1c.1-.1.2-.1.3-.2 0 0-.4.6-1.4.9.4.7.8 1.4 1.3 2 .9 0 2.5 0 4.1-1.2.5-2.6.1-8.3-2-11.3zM8.5 14.5c-.8 0-1.5-.7-1.5-1.6s.7-1.6 1.5-1.6 1.5.7 1.5 1.6-.7 1.6-1.5 1.6zm7 0c-.8 0-1.5-.7-1.5-1.6s.7-1.6 1.5-1.6 1.5.7 1.5 1.6-.7 1.6-1.5 1.6z"/></svg>'
};

/**
 * Returns a high-contrast data:image/svg+xml URL for the requested social platform brand icon.
 */
export function getSocialPlatformSvgDataUrl(iconId: string): string | null {
  const normalized = iconId.toLowerCase().trim();
  const rawSvg = BRAND_SVGS[normalized];
  if (!rawSvg) return null;
  return `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
}
