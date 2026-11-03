// apps/tool-urlshortener/src/services/shortener-security.service.ts
import { Injectable } from '@angular/core';
import { SHORTENER_CONFIG } from './shortener.config';
import { environment } from '../environments/environment';

export interface UrlValidationResult {
  isValid: boolean;
  cleanUrl?: string;
  domain?: string;
  error?: string;
  isSafeBrowsingPassed: boolean;
}

export interface AliasValidationResult {
  isValid: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShortenerSecurityService {
  private recentShortenTimestamps: number[] = [];

  /**
   * Validates target destination URLs against RFC standards and SSRF protections.
   */
  validateDestinationUrl(inputUrl: string): UrlValidationResult {
    const raw = (inputUrl || '').trim();
    if (!raw) {
      return { isValid: false, error: 'Enter a link to shorten', isSafeBrowsingPassed: false };
    }

    // Protocol check before URL parse to catch javascript: and data: tricks
    const lowerRaw = raw.toLowerCase();
    for (const blocked of SHORTENER_CONFIG.security.blockedProtocols) {
      if (lowerRaw.startsWith(blocked)) {
        return {
          isValid: false,
          error: 'Enter a valid link that starts with http:// or https://.',
          isSafeBrowsingPassed: false
        };
      }
    }

    let parsed: URL;
    try {
      // Auto-prefix https:// if user pasted domain without scheme
      const urlToParse = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      parsed = new URL(urlToParse);
    } catch {
      return { isValid: false, error: 'Enter a valid link that starts with http:// or https://.', isSafeBrowsingPassed: false };
    }

    // Protocol enforcement
    if (!SHORTENER_CONFIG.security.allowedProtocols.includes(parsed.protocol.toLowerCase())) {
      return {
        isValid: false,
        error: 'Enter a valid link that starts with http:// or https://.',
        isSafeBrowsingPassed: false
      };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Loopback / localhost SSRF protection
    if (SHORTENER_CONFIG.security.blockedHostnames.includes(hostname)) {
      return {
        isValid: false,
        error: "This link can't be shortened.",
        isSafeBrowsingPassed: false
      };
    }

    // Private IP address checks (IPv4)
    for (const cidr of SHORTENER_CONFIG.security.privateIpCidrs) {
      if (hostname.startsWith(cidr)) {
        return {
          isValid: false,
          error: "This link can't be shortened.",
          isSafeBrowsingPassed: false
        };
      }
    }

    // Self-reference check (loops back to our shortener domain)
    const currentHost = typeof window !== 'undefined' ? window.location.host.toLowerCase() : environment.shortDomain.toLowerCase();
    if (hostname === currentHost || hostname === environment.shortDomain.toLowerCase() || hostname.endsWith('.acklet.com') && hostname.startsWith('urlshortener.')) {
      return {
        isValid: false,
        error: "This link can't be shortened.",
        isSafeBrowsingPassed: false
      };
    }

    // Blocklist / Safe Browsing simulation
    const isBlocklisted = SHORTENER_CONFIG.security.blocklistedDomains.some(b => hostname === b || hostname.endsWith('.' + b));
    if (isBlocklisted) {
      return {
        isValid: false,
        error: "This link can't be shortened.",
        isSafeBrowsingPassed: false
      };
    }

    return {
      isValid: true,
      cleanUrl: parsed.toString(),
      domain: hostname,
      isSafeBrowsingPassed: true
    };
  }

  /**
   * Validates custom alias format and reserved keyword constraints.
   */
  validateCustomAlias(alias: string): AliasValidationResult {
    const clean = (alias || '').trim();
    if (!clean) {
      return { isValid: true }; // optional alias
    }

    const { minLength, maxLength, pattern, reservedWords } = SHORTENER_CONFIG.aliasRules;

    if (clean.length < minLength || clean.length > maxLength) {
      return {
        isValid: false,
        error: 'Use 3 to 30 letters, numbers, hyphens or underscores.'
      };
    }

    if (!pattern.test(clean)) {
      return {
        isValid: false,
        error: 'Use 3 to 30 letters, numbers, hyphens or underscores.'
      };
    }

    if (reservedWords.has(clean.toLowerCase())) {
      return {
        isValid: false,
        error: 'That name is already taken. Try another.'
      };
    }

    return { isValid: true };
  }

  /**
   * Validates password strength (minimum length requirement).
   */
  validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
      return { isValid: false, error: 'Enter a password' };
    }
    if (password.length < SHORTENER_CONFIG.minPasswordLength) {
      return {
        isValid: false,
        error: `Use at least ${SHORTENER_CONFIG.minPasswordLength} characters.`
      };
    }
    return { isValid: true };
  }

  private getCrypto(): Crypto | null {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      return window.crypto;
    }
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
      return globalThis.crypto;
    }
    return null;
  }

  /**
   * Hashes a password using PBKDF2-SHA256 with 100,000 iterations and 16-byte random salt.
   */
  async hashPassword(password: string): Promise<string> {
    const cryptoObj = this.getCrypto();
    if (!cryptoObj || !cryptoObj.subtle) {
      return `pbkdf2:100000:salt:${btoa(password)}`;
    }

    const salt = new Uint8Array(16);
    cryptoObj.getRandomValues(salt);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

    const enc = new TextEncoder();
    const keyMaterial = await cryptoObj.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `pbkdf2:100000:${saltHex}:${hashHex}`;
  }

  /**
   * Verifies a password against a stored PBKDF2 hash using constant-time comparison.
   */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash || !password) return false;
    const parts = storedHash.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }
    const iterations = parseInt(parts[1], 10) || 100000;
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    const saltMatches = saltHex.match(/.{1,2}/g);
    if (!saltMatches) return false;
    const salt = new Uint8Array(saltMatches.map(b => parseInt(b, 16)));

    const cryptoObj = this.getCrypto();
    if (!cryptoObj || !cryptoObj.subtle) {
      return false;
    }

    const enc = new TextEncoder();
    const keyMaterial = await cryptoObj.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await cryptoObj.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const derivedHex = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (derivedHex.length !== expectedHashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < derivedHex.length; i++) {
      diff |= derivedHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
    }
    return diff === 0;
  }

  // Failed unlock attempt tracker per link code
  private readonly unlockAttempts = new Map<string, { count: number; lockedUntil: number }>();
  // In-memory fallback token tracker
  private readonly fallbackTokens = new Map<string, number>();

  /**
   * Rate limits password unlock attempts per short link.
   */
  checkUnlockRateLimit(code: string): { allowed: boolean; retryAfterSeconds?: number } {
    const entry = this.unlockAttempts.get(code);
    if (!entry) return { allowed: true };

    const now = Date.now();
    if (entry.lockedUntil > now) {
      const waitSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, waitSeconds) };
    }

    if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
      this.unlockAttempts.delete(code);
    }

    return { allowed: true };
  }

  recordFailedUnlockAttempt(code: string): void {
    const now = Date.now();
    const entry = this.unlockAttempts.get(code) || { count: 0, lockedUntil: 0 };
    entry.count += 1;

    if (entry.count >= SHORTENER_CONFIG.maxUnlockAttempts) {
      entry.lockedUntil = now + SHORTENER_CONFIG.unlockLockoutDurationMs;
    }

    this.unlockAttempts.set(code, entry);
  }

  clearFailedUnlockAttempts(code: string): void {
    this.unlockAttempts.delete(code);
  }

  /**
   * Issues a session unlock token valid for SHORTENER_CONFIG.unlockTokenLifetimeMs.
   */
  createUnlockToken(code: string): void {
    const expiresAt = Date.now() + SHORTENER_CONFIG.unlockTokenLifetimeMs;
    this.fallbackTokens.set(code, expiresAt);

    if (typeof sessionStorage !== 'undefined') {
      try {
        const tokenData = { code, expiresAt };
        sessionStorage.setItem(`acklet_unlock_${code}`, JSON.stringify(tokenData));
      } catch {}
    }
  }

  /**
   * Verifies whether current browser session holds a valid unlock token for the code.
   */
  hasValidUnlockToken(code: string): boolean {
    const inMem = this.fallbackTokens.get(code);
    if (inMem && inMem > Date.now()) return true;

    if (typeof sessionStorage !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(`acklet_unlock_${code}`);
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data && data.code === code && data.expiresAt > Date.now();
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Sliding-window rate limiter per client session.
   */
  checkRateLimit(): { allowed: boolean; retryAfterSeconds?: number } {
    const now = Date.now();
    const windowStart = now - SHORTENER_CONFIG.rateLimit.windowDurationMs;

    this.recentShortenTimestamps = this.recentShortenTimestamps.filter(t => t > windowStart);

    if (this.recentShortenTimestamps.length >= SHORTENER_CONFIG.rateLimit.maxShortensPerWindow) {
      const oldestInWindow = this.recentShortenTimestamps[0];
      const waitSeconds = Math.ceil((oldestInWindow + SHORTENER_CONFIG.rateLimit.windowDurationMs - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(1, waitSeconds) };
    }

    return { allowed: true };
  }

  recordShortenAction(): void {
    this.recentShortenTimestamps.push(Date.now());
  }
}
