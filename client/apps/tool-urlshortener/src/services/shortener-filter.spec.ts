import { describe, it, expect } from 'vitest';
import {
  FilterCriteria,
  createDefaultFilterCriteria,
  matchesFilterCriteria,
  countActiveFilters
} from './shortener-filter.model';
import { ShortLinkRecord } from './shortener-storage.service';

describe('Shortener Filter Model - Pure Logic Tests', () => {
  const now = 1700000000000;

  const mockLink = (overrides: Partial<ShortLinkRecord> = {}): ShortLinkRecord => ({
    code: 'abc123',
    targetUrl: 'https://example.com/page',
    domain: 'example.com',
    createdAt: now - 3600000,
    expiresAt: now + 86400000 * 10,
    clicks: 10,
    lastOpenedAt: now - 3600000,
    hasPassword: false,
    isOneTime: false,
    isDeactivated: false,
    ...overrides
  });

  it('should match all links with default criteria', () => {
    const link = mockLink();
    const criteria = createDefaultFilterCriteria();
    expect(matchesFilterCriteria(link, criteria, undefined, now)).toBe(true);
    expect(countActiveFilters(criteria)).toBe(0);
  });

  it('should filter by Protection group (PROTECTED vs NOT_PROTECTED)', () => {
    const linkProtected = mockLink({ hasPassword: true });
    const linkPublic = mockLink({ hasPassword: false });

    const criteria = createDefaultFilterCriteria();
    criteria.protection = 'PROTECTED';
    expect(countActiveFilters(criteria)).toBe(1);

    expect(matchesFilterCriteria(linkProtected, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkPublic, criteria, undefined, now)).toBe(false);

    criteria.protection = 'NOT_PROTECTED';
    expect(matchesFilterCriteria(linkProtected, criteria, undefined, now)).toBe(false);
    expect(matchesFilterCriteria(linkPublic, criteria, undefined, now)).toBe(true);
  });

  it('should filter by Rules group (ONE_TIME, CLICK_LIMIT, HAS_FALLBACK)', () => {
    const linkOneTime = mockLink({ isOneTime: true });
    const linkStandard = mockLink({ isOneTime: false });

    const criteria = createDefaultFilterCriteria();
    criteria.rules.add('ONE_TIME');
    expect(matchesFilterCriteria(linkOneTime, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkStandard, criteria, undefined, now)).toBe(false);
  });

  it('should filter by Expiry group (EXPIRING_SOON vs NO_EXPIRY)', () => {
    const linkSoon = mockLink({ expiresAt: now + 86400000 * 2 }); // 2 days
    const linkFar = mockLink({ expiresAt: now + 86400000 * 20 }); // 20 days
    const linkNever = mockLink({ expiresAt: null });

    const criteria = createDefaultFilterCriteria();
    criteria.expiry.add('EXPIRING_SOON');
    expect(matchesFilterCriteria(linkSoon, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkFar, criteria, undefined, now)).toBe(false);
    expect(matchesFilterCriteria(linkNever, criteria, undefined, now)).toBe(false);

    criteria.expiry.clear();
    criteria.expiry.add('NO_EXPIRY');
    expect(matchesFilterCriteria(linkNever, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkSoon, criteria, undefined, now)).toBe(false);
  });

  it('should filter by Tags (multi-select OR within tags)', () => {
    const linkDev = mockLink({ tags: ['dev', 'api'] });
    const linkMarketing = mockLink({ tags: ['marketing'] });

    const criteria = createDefaultFilterCriteria();
    criteria.tags.add('dev');
    expect(matchesFilterCriteria(linkDev, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkMarketing, criteria, undefined, now)).toBe(false);

    criteria.tags.add('marketing');
    expect(matchesFilterCriteria(linkMarketing, criteria, undefined, now)).toBe(true);
  });

  it('should combine multiple groups with AND logic', () => {
    const linkA = mockLink({ hasPassword: true, isOneTime: true });
    const linkB = mockLink({ hasPassword: true, isOneTime: false });
    const linkC = mockLink({ hasPassword: false, isOneTime: true });

    const criteria = createDefaultFilterCriteria();
    criteria.protection = 'PROTECTED';
    criteria.rules.add('ONE_TIME');

    expect(countActiveFilters(criteria)).toBe(2);
    expect(matchesFilterCriteria(linkA, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkB, criteria, undefined, now)).toBe(false);
    expect(matchesFilterCriteria(linkC, criteria, undefined, now)).toBe(false);
  });

  it('should filter by Created Date group (TODAY, LAST_7D, LAST_30D)', () => {
    const linkToday = mockLink({ createdAt: now });
    const linkThreeDaysAgo = mockLink({ createdAt: now - (3 * 24 * 60 * 60 * 1000) });
    const linkFifteenDaysAgo = mockLink({ createdAt: now - (15 * 24 * 60 * 60 * 1000) });
    const linkFortyDaysAgo = mockLink({ createdAt: now - (40 * 24 * 60 * 60 * 1000) });

    const criteria = createDefaultFilterCriteria();
    criteria.createdPreset = 'TODAY';

    expect(matchesFilterCriteria(linkToday, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkThreeDaysAgo, criteria, undefined, now)).toBe(false);
    expect(matchesFilterCriteria(linkFifteenDaysAgo, criteria, undefined, now)).toBe(false);

    criteria.createdPreset = 'LAST_7D';
    expect(matchesFilterCriteria(linkToday, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkThreeDaysAgo, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkFifteenDaysAgo, criteria, undefined, now)).toBe(false);

    criteria.createdPreset = 'LAST_30D';
    expect(matchesFilterCriteria(linkFifteenDaysAgo, criteria, undefined, now)).toBe(true);
    expect(matchesFilterCriteria(linkFortyDaysAgo, criteria, undefined, now)).toBe(false);
  });
});

