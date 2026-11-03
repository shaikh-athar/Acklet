// apps/tool-urlshortener/src/services/shortener-filter.model.ts
import { ShortLinkRecord, computeLinkStatus, LinkStatus } from './shortener-storage.service';

export type ActivityFilter = 'TRENDING' | 'POPULAR' | 'RECENTLY_OPENED' | 'NEVER_OPENED';
export type ExpiryFilter = 'EXPIRING_SOON' | 'EXPIRING_30D' | 'NO_EXPIRY';
export type ProtectionFilter = 'ANY' | 'PROTECTED' | 'NOT_PROTECTED';
export type RuleFilter = 'ONE_TIME' | 'CLICK_LIMIT' | 'HAS_FALLBACK';
export type CreatedRangePreset = 'ANY_TIME' | 'TODAY' | 'LAST_7D' | 'LAST_30D' | 'CUSTOM';

export interface FilterCriteria {
  activity: Set<ActivityFilter>;
  expiry: Set<ExpiryFilter>;
  protection: ProtectionFilter;
  rules: Set<RuleFilter>;
  createdPreset: CreatedRangePreset;
  customCreatedFrom?: number | null; // epoch ms
  customCreatedTo?: number | null; // epoch ms
  tags: Set<string>;
  domains: Set<string>;
  needsReview: boolean;
}

export function createDefaultFilterCriteria(): FilterCriteria {
  return {
    activity: new Set<ActivityFilter>(),
    expiry: new Set<ExpiryFilter>(),
    protection: 'ANY',
    rules: new Set<RuleFilter>(),
    createdPreset: 'ANY_TIME',
    customCreatedFrom: null,
    customCreatedTo: null,
    tags: new Set<string>(),
    domains: new Set<string>(),
    needsReview: false
  };
}

export interface FilterThresholds {
  trendingMinClicks: number;
  popularThreshold30d: number;
  recentlyOpenedDays: number;
  expiringSoonDays: number;
}

export const DEFAULT_FILTER_THRESHOLDS: FilterThresholds = {
  trendingMinClicks: 5,
  popularThreshold30d: 25,
  recentlyOpenedDays: 7,
  expiringSoonDays: 7
};

/**
 * Pure evaluation function for filtering ShortLinkRecords.
 * Logic:
 * - OR within each group
 * - AND across groups
 */
export function matchesFilterCriteria(
  link: ShortLinkRecord,
  criteria: FilterCriteria,
  thresholds: FilterThresholds = DEFAULT_FILTER_THRESHOLDS,
  nowMs: number = Date.now()
): boolean {
  // 1. Activity Group (OR within group)
  if (criteria.activity.size > 0) {
    let matchedActivity = false;
    const sevenDaysMs = thresholds.recentlyOpenedDays * 24 * 60 * 60 * 1000;
    const isRecentlyOpened = link.lastOpenedAt != null && (nowMs - link.lastOpenedAt) <= sevenDaysMs;
    const isNeverOpened = (link.clicks === 0 || !link.lastOpenedAt);
    const isPopular = (link.clicks >= thresholds.popularThreshold30d);
    // Trending: clicks >= min and recent opened
    const isTrending = link.clicks >= thresholds.trendingMinClicks && isRecentlyOpened;

    for (const act of criteria.activity) {
      if (act === 'TRENDING' && isTrending) { matchedActivity = true; break; }
      if (act === 'POPULAR' && isPopular) { matchedActivity = true; break; }
      if (act === 'RECENTLY_OPENED' && isRecentlyOpened) { matchedActivity = true; break; }
      if (act === 'NEVER_OPENED' && isNeverOpened) { matchedActivity = true; break; }
    }
    if (!matchedActivity) return false;
  }

  // 2. Expiry Group (OR within group)
  if (criteria.expiry.size > 0) {
    let matchedExpiry = false;
    const sevenDaysMs = thresholds.expiringSoonDays * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    for (const exp of criteria.expiry) {
      if (exp === 'NO_EXPIRY' && !link.expiresAt) {
        matchedExpiry = true;
        break;
      }
      if (link.expiresAt && link.expiresAt > nowMs) {
        const remaining = link.expiresAt - nowMs;
        if (exp === 'EXPIRING_SOON' && remaining <= sevenDaysMs) {
          matchedExpiry = true;
          break;
        }
        if (exp === 'EXPIRING_30D' && remaining <= thirtyDaysMs) {
          matchedExpiry = true;
          break;
        }
      }
    }
    if (!matchedExpiry) return false;
  }

  // 3. Protection Group (Segmented)
  if (criteria.protection === 'PROTECTED' && !link.hasPassword) return false;
  if (criteria.protection === 'NOT_PROTECTED' && link.hasPassword) return false;

  // 4. Rules Group (OR within group)
  if (criteria.rules.size > 0) {
    let matchedRule = false;
    for (const rule of criteria.rules) {
      if (rule === 'ONE_TIME' && link.isOneTime) { matchedRule = true; break; }
      if (rule === 'CLICK_LIMIT' && link.maxClicks != null && link.maxClicks > 0) { matchedRule = true; break; }
      if (rule === 'HAS_FALLBACK' && (link as any).fallbackUrl) { matchedRule = true; break; }
    }
    if (!matchedRule) return false;
  }

  // 5. Created Date Group
  if (criteria.createdPreset !== 'ANY_TIME') {
    const created = link.createdAt;
    if (criteria.createdPreset === 'TODAY') {
      const nowDate = new Date(nowMs);
      const startOfDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999).getTime();
      if (created < startOfDay || created > endOfDay) return false;
    } else if (criteria.createdPreset === 'LAST_7D') {
      const sevenDaysAgo = nowMs - (7 * 24 * 60 * 60 * 1000);
      if (created < sevenDaysAgo) return false;
    } else if (criteria.createdPreset === 'LAST_30D') {
      const thirtyDaysAgo = nowMs - (30 * 24 * 60 * 60 * 1000);
      if (created < thirtyDaysAgo) return false;
    } else if (criteria.createdPreset === 'CUSTOM') {
      if (criteria.customCreatedFrom && created < criteria.customCreatedFrom) return false;
      if (criteria.customCreatedTo && created > criteria.customCreatedTo) return false;
    }
  }

  // 6. Tags Group (OR within tags)
  if (criteria.tags.size > 0) {
    if (!link.tags || link.tags.length === 0) return false;
    const hasTag = link.tags.some(t => criteria.tags.has(t.toLowerCase()));
    if (!hasTag) return false;
  }

  // 7. Domain Group (OR within domains)
  if (criteria.domains.size > 0) {
    let domain = link.domain ? link.domain.toLowerCase() : '';
    if (!domain && link.targetUrl) {
      try { domain = new URL(link.targetUrl).host.toLowerCase(); } catch (_) {}
    }
    if (!criteria.domains.has(domain)) return false;
  }

  // 8. Needs Review Group
  if (criteria.needsReview) {
    if (!link.isReported && !link.reportCount && !(link as any).flagged) {
      return false;
    }
  }

  return true;
}

/**
 * Counts active attribute filter choices (excluding Status and Sort).
 */
export function countActiveFilters(criteria: FilterCriteria): number {
  let count = 0;
  count += criteria.activity.size;
  count += criteria.expiry.size;
  if (criteria.protection !== 'ANY') count += 1;
  count += criteria.rules.size;
  if (criteria.createdPreset !== 'ANY_TIME') count += 1;
  count += criteria.tags.size;
  count += criteria.domains.size;
  if (criteria.needsReview) count += 1;
  return count;
}

