// apps/tool-urlshortener/src/services/shortener.config.ts

export type ExpiryPreset = '7_days' | '30_days' | '1_year' | 'never';

export interface ExpiryOption {
  id: ExpiryPreset;
  label: string;
  durationMs: number | null; // null for never
  badge: string;
}

export interface ShortenerConfig {
  defaultExpiry: ExpiryPreset;
  expiryOptions: ExpiryOption[];
  maxClicksOptions: (number | null)[];
  minPasswordLength: number;
  maxUnlockAttempts: number;
  unlockLockoutDurationMs: number;
  unlockTokenLifetimeMs: number;
  maxLabelLength: number;
  defaultListPageSize: number;
  aliasRules: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
    reservedWords: Set<string>;
  };
  codeRules: {
    minLength: number;
    maxLength: number;
    base62Alphabet: string;
    maxCollisionRetries: number;
  };
  security: {
    allowedProtocols: string[];
    blockedProtocols: string[];
    blockedHostnames: string[];
    privateIpCidrs: string[];
    blocklistedDomains: string[];
  };
  rateLimit: {
    maxShortensPerWindow: number;
    windowDurationMs: number;
  };
  toastDurationMs: number;
}

export const SHORTENER_CONFIG: ShortenerConfig = {
  defaultExpiry: '30_days',
  expiryOptions: [
    { id: '7_days', label: '7 days', durationMs: 7 * 24 * 60 * 60 * 1000, badge: '7d' },
    { id: '30_days', label: '30 days (default)', durationMs: 30 * 24 * 60 * 60 * 1000, badge: '30d' },
    { id: '1_year', label: '1 year', durationMs: 365 * 24 * 60 * 60 * 1000, badge: '1y' },
    { id: 'never', label: 'Never', durationMs: null, badge: '∞' }
  ],
  maxClicksOptions: [10, 50, 100, 500, 1000, null],
  minPasswordLength: 6,
  maxUnlockAttempts: 5,
  unlockLockoutDurationMs: 60 * 1000, // 1 minute
  unlockTokenLifetimeMs: 5 * 60 * 1000, // 5 minutes
  maxLabelLength: 60,
  defaultListPageSize: 20,
  aliasRules: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]{3,30}$/,
    reservedWords: new Set([
      'admin',
      'api',
      'app',
      'assets',
      'auth',
      'cdn',
      'clipboard',
      'config',
      'dashboard',
      'dev',
      'docs',
      'help',
      'hub',
      'links',
      'login',
      'logout',
      'mail',
      'null',
      'preview',
      'privacy',
      'qr',
      'qr-generator',
      'r',
      'report',
      'root',
      'short',
      'shorten',
      'static',
      'status',
      'terms',
      'tools',
      'undefined',
      'unlock',
      'url',
      'urlshortener',
      'www'
    ])
  },
  codeRules: {
    minLength: 6,
    maxLength: 7,
    base62Alphabet: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    maxCollisionRetries: 5
  },
  security: {
    allowedProtocols: ['http:', 'https:'],
    blockedProtocols: ['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'],
    blockedHostnames: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      'localhost.localdomain'
    ],
    privateIpCidrs: [
      '10.',
      '127.',
      '169.254.',
      '192.168.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.'
    ],
    blocklistedDomains: [
      'evil.com',
      'phishing.com',
      'malware-test.com',
      'badsite.test'
    ]
  },
  rateLimit: {
    maxShortensPerWindow: 20,
    windowDurationMs: 60 * 1000 // 1 minute
  },
  toastDurationMs: 4000
};
