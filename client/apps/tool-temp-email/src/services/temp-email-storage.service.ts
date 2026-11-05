// apps/tool-temp-email/src/services/temp-email-storage.service.ts
import { Injectable } from '@angular/core';
import { MailAccount, AutoRefreshInterval } from '../models/temp-email.models';

const STORAGE_INBOXES_KEY = 'acklet.tempmail.inboxes.v1';
const STORAGE_ACTIVE_KEY = 'acklet.tempmail.active_id.v1';
const STORAGE_INTERVAL_KEY = 'acklet.tempmail.refresh_interval.v1';
const STORAGE_IMAGES_KEY = 'acklet.tempmail.block_images.v1';
const STORAGE_SOUND_KEY = 'acklet.tempmail.sound_enabled.v1';
const STORAGE_ALERTS_KEY = 'acklet.tempmail.alerts_enabled.v1';
const MAX_INBOXES = 5;

@Injectable({
  providedIn: 'root'
})
export class TempEmailStorageService {
  /**
   * Loads all saved accounts from localStorage, filtering out expired ones.
   */
  getSavedAccounts(): MailAccount[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_INBOXES_KEY);
      if (!raw) return [];
      const parsed: MailAccount[] = JSON.parse(raw);
      const now = Date.now();
      // Keep accounts that have not expired (or within 24 hours of creation)
      const valid = parsed.filter(acc => !acc.expiresAt || acc.expiresAt > now);
      if (valid.length !== parsed.length) {
        this.saveAccounts(valid);
      }
      return valid;
    } catch {
      return [];
    }
  }

  /**
   * Saves list of accounts to localStorage.
   */
  saveAccounts(accounts: MailAccount[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      // Limit to MAX_INBOXES
      const trimmed = accounts.slice(0, MAX_INBOXES);
      window.localStorage.setItem(STORAGE_INBOXES_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save temp email accounts to localStorage:', e);
    }
  }

  /**
   * Adds or updates an account.
   */
  upsertAccount(account: MailAccount): void {
    const list = this.getSavedAccounts();
    const index = list.findIndex(a => a.id === account.id || a.address === account.address);
    if (index >= 0) {
      list[index] = { ...list[index], ...account };
    } else {
      list.unshift(account);
    }
    this.saveAccounts(list);
    this.setActiveAccountId(account.id);
  }

  /**
   * Removes an account by ID.
   */
  removeAccount(accountId: string): MailAccount[] {
    const list = this.getSavedAccounts().filter(a => a.id !== accountId);
    this.saveAccounts(list);
    if (this.getActiveAccountId() === accountId) {
      const next = list.length > 0 ? list[0].id : null;
      this.setActiveAccountId(next);
    }
    return list;
  }

  /**
   * Retrieves the currently active account ID.
   */
  getActiveAccountId(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(STORAGE_ACTIVE_KEY);
  }

  /**
   * Sets the active account ID.
   */
  setActiveAccountId(id: string | null): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (id) {
      window.localStorage.setItem(STORAGE_ACTIVE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_ACTIVE_KEY);
    }
  }

  /**
   * Gets saved auto-refresh interval (default 10s).
   */
  getRefreshInterval(): AutoRefreshInterval {
    if (typeof window === 'undefined' || !window.localStorage) return 10;
    const val = window.localStorage.getItem(STORAGE_INTERVAL_KEY);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      if ([5, 10, 15, 30, 0].includes(parsed)) {
        return parsed as AutoRefreshInterval;
      }
    }
    return 10;
  }

  /**
   * Saves user's auto-refresh interval preference.
   */
  saveRefreshInterval(interval: AutoRefreshInterval): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_INTERVAL_KEY, interval.toString());
  }

  /**
   * Gets image display preference (default false = load images automatically).
   */
  getBlockRemoteImages(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const val = window.localStorage.getItem(STORAGE_IMAGES_KEY);
    return val === 'true';
  }

  /**
   * Sets tracking protection preference.
   */
  setBlockRemoteImages(block: boolean): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_IMAGES_KEY, block.toString());
  }

  /**
   * Extends the expiry time of an account by given milliseconds (defaults to 24 hours from now).
   */
  extendAccountExpiry(accountId: string, additionalMs: number = 24 * 60 * 60 * 1000): MailAccount | null {
    const list = this.getSavedAccounts();
    const index = list.findIndex(a => a.id === accountId);
    if (index === -1) return null;
    const currentExpiry = list[index].expiresAt || Date.now();
    const base = Math.max(currentExpiry, Date.now());
    list[index].expiresAt = base + additionalMs;
    this.saveAccounts(list);
    return list[index];
  }

  /**
   * Wipes all saved temporary email data, active inboxes, and local preferences.
   */
  wipeAllData(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(STORAGE_INBOXES_KEY);
      window.localStorage.removeItem(STORAGE_ACTIVE_KEY);
      window.localStorage.removeItem(STORAGE_INTERVAL_KEY);
      window.localStorage.removeItem(STORAGE_IMAGES_KEY);
      window.localStorage.removeItem(STORAGE_SOUND_KEY);
      window.localStorage.removeItem(STORAGE_ALERTS_KEY);
    } catch (e) {
      console.warn('Failed to wipe temp email storage:', e);
    }
  }

  /**
   * Gets notification sound preference (default true).
   */
  getSoundEnabled(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    const val = window.localStorage.getItem(STORAGE_SOUND_KEY);
    return val === null ? true : val === 'true';
  }

  /**
   * Sets notification sound preference.
   */
  setSoundEnabled(enabled: boolean): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_SOUND_KEY, enabled.toString());
  }

  /**
   * Gets browser alerts preference (default false).
   */
  getAlertsEnabled(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const val = window.localStorage.getItem(STORAGE_ALERTS_KEY);
    return val === 'true';
  }

  /**
   * Sets browser alerts preference.
   */
  setAlertsEnabled(enabled: boolean): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_ALERTS_KEY, enabled.toString());
  }

  /**
   * Generates a pleasant, human-readable random username prefix.
   */
  generateRandomUsername(): string {
    const prefixes = ['spark', 'wave', 'nova', 'echo', 'flux', 'swift', 'cloud', 'orbit', 'pulse', 'pixel', 'vibe', 'atlas', 'apex', 'cyber', 'neon'];
    const animals = ['falcon', 'fox', 'wolf', 'hawk', 'lynx', 'otter', 'panda', 'tiger', 'eagle', 'raven', 'badger', 'badger', 'bear', 'finch'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const a = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(100 + Math.random() * 900); // 3-digit random number
    return `${p}-${a}-${num}`;
  }

  /**
   * Generates a cryptographically strong random password for Mail.tm.
   */
  generateSecurePassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const arr = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    let pwd = '';
    for (let i = 0; i < 16; i++) {
      pwd += chars[arr[i] % chars.length];
    }
    return pwd;
  }
}
