// apps/tool-temp-email/src/services/temp-email-storage.service.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TempEmailStorageService } from './temp-email-storage.service';
import { MailAccount } from '../models/temp-email.models';

describe('TempEmailStorageService', () => {
  let service: TempEmailStorageService;
  let mockStore: Record<string, string> = {};
  let originalWindow: any;

  beforeEach(() => {
    mockStore = {};
    service = new TempEmailStorageService();
    originalWindow = (globalThis as any).window;

    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => mockStore[key] || null,
        setItem: (key: string, val: string) => {
          mockStore[key] = val;
        },
        removeItem: (key: string) => {
          delete mockStore[key];
        }
      },
      crypto: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
          return arr;
        }
      }
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
  });

  it('should return empty list when no saved accounts exist', () => {
    expect(service.getSavedAccounts()).toEqual([]);
  });

  it('should save and retrieve accounts correctly', () => {
    const acc: MailAccount = {
      id: 'acc-1',
      address: 'test@fldubai.com',
      token: 'jwt-token-1',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 100000
    };

    service.upsertAccount(acc);
    const retrieved = service.getSavedAccounts();
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].address).toBe('test@fldubai.com');
  });

  it('should filter out expired accounts automatically', () => {
    const expired: MailAccount = {
      id: 'acc-old',
      address: 'expired@fldubai.com',
      token: 'jwt-old',
      createdAt: new Date(Date.now() - 200000).toISOString(),
      expiresAt: Date.now() - 50000 // expired
    };
    const valid: MailAccount = {
      id: 'acc-valid',
      address: 'valid@fldubai.com',
      token: 'jwt-valid',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 50000 // valid
    };

    mockStore['acklet.tempmail.inboxes.v1'] = JSON.stringify([expired, valid]);
    const result = service.getSavedAccounts();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('acc-valid');
  });

  it('should enforce MAX_INBOXES limit of 5 accounts', () => {
    const accounts: MailAccount[] = Array.from({ length: 7 }, (_, i) => ({
      id: `acc-${i}`,
      address: `test${i}@fldubai.com`,
      token: `jwt-${i}`,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 100000
    }));

    service.saveAccounts(accounts);
    const saved = service.getSavedAccounts();
    expect(saved.length).toBe(5);
  });

  it('should generate secure random passwords and readable usernames', () => {
    const user = service.generateRandomUsername();
    expect(user).toContain('-');
    expect(user.length).toBeGreaterThan(6);

    const pwd = service.generateSecurePassword();
    expect(pwd.length).toBe(16);
  });

  it('should extend account expiry by additional duration', () => {
    const acc: MailAccount = {
      id: 'acc-extend',
      address: 'extend@fldubai.com',
      token: 'jwt-extend',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 3600000 // 1 hour from now
    };
    service.upsertAccount(acc);

    const updated = service.extendAccountExpiry('acc-extend', 86400000); // +24 hours
    expect(updated).not.toBeNull();
    expect(updated!.expiresAt).toBeGreaterThan(Date.now() + 80000000);
  });

  it('should wipe all temporary email data from storage', () => {
    mockStore['acklet.tempmail.inboxes.v1'] = 'data';
    mockStore['acklet.tempmail.active_id.v1'] = 'active';
    mockStore['acklet.tempmail.refresh_interval.v1'] = '10';

    service.wipeAllData();

    expect(mockStore['acklet.tempmail.inboxes.v1']).toBeUndefined();
    expect(mockStore['acklet.tempmail.active_id.v1']).toBeUndefined();
    expect(mockStore['acklet.tempmail.refresh_interval.v1']).toBeUndefined();
  });

  it('should manage sound and alerts settings with sensible defaults', () => {
    expect(service.getSoundEnabled()).toBe(true);
    service.setSoundEnabled(false);
    expect(service.getSoundEnabled()).toBe(false);

    expect(service.getAlertsEnabled()).toBe(false);
    service.setAlertsEnabled(true);
    expect(service.getAlertsEnabled()).toBe(true);
  });
});
