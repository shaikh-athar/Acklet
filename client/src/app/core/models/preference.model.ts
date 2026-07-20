// Core interfaces for the Acklet Personalization & Sync Engine

// ── Storage namespaces ────────────────────────────────────────────────────────
export const PREF_STORE_VERSION = 1;
export const PREF_KEY_PREFS     = `acklet:v${PREF_STORE_VERSION}:prefs`;
export const PREF_KEY_ACTIVITY  = `acklet:v${PREF_STORE_VERSION}:activity`;
export const PREF_KEY_FAVORITES = `acklet:v${PREF_STORE_VERSION}:favorites`;
export const PREF_KEY_SYNC_META = `acklet:v${PREF_STORE_VERSION}:sync-meta`;
export const PREF_KEY_TOOL_PREFS = (slug: string) => `acklet:v${PREF_STORE_VERSION}:tool-prefs:${slug}`;

// ── Entity types ─────────────────────────────────────────────────────────────
export type EntityType = 'TOOL' | 'CATEGORY' | 'COLLECTION' | 'BLOG' | 'GUIDE' | 'SEARCH';

// ── Preferences blob ─────────────────────────────────────────────────────────
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  viewMode: 'grid' | 'list';
  cardSize: 'compact' | 'normal' | 'large';
  density: 'comfortable' | 'compact';
  sidebarOpen: boolean;
  search: SearchPreferences;
  homepage: HomepagePreferences;
  onboarding: OnboardingPreferences;
  dismissedTips: string[];
  dismissedAnnouncements: string[];
}

export interface OnboardingPreferences {
  completed: boolean;
  skipped: boolean;
  completedAt: string | null;
  roles: string[];
  interests: string[];
  categoryPriority: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  accentColor: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'gray';
}

export interface SearchPreferences {
  recentSearches: string[];
  pinnedSearches: string[];
  preferredFilters: Record<string, string>;
  preferredCategories: string[];
  searchMode: 'fuzzy' | 'exact' | 'smart';
}

export interface HomepagePreferences {
  widgetOrder: string[];
  hiddenWidgets: string[];
  pinnedSections: string[];
}

// ── Activity ──────────────────────────────────────────────────────────────────
export interface ActivityItem {
  entityType: EntityType;
  entityId: string;
  entitySlug?: string;
  entityName?: string;
  accessedAt: string; // ISO timestamp
  metadata?: Record<string, any>;
}

// ── Favorites ─────────────────────────────────────────────────────────────────
export interface FavoriteItem {
  entityType: EntityType;
  entityId: string;
  entitySlug?: string;
  entityName?: string;
  pinned: boolean;
  pinnedAt?: string;
  createdAt: string;
}

export interface FavoritesStore {
  tools: FavoriteItem[];
  categories: FavoriteItem[];
  collections: FavoriteItem[];
  blogs: FavoriteItem[];
  guides: FavoriteItem[];
}

// ── Tool Preferences ──────────────────────────────────────────────────────────
export interface ToolPreferenceSchema {
  slug: string;
  defaults: Record<string, any>;
  schema?: Record<string, 'string' | 'number' | 'boolean' | 'select'>;
}

// ── Sync ──────────────────────────────────────────────────────────────────────
export interface SyncMeta {
  deviceId: string;
  lastSyncAt: string | null;
  syncVersion: number;
}

export interface SyncRequest {
  deviceId: string;
  lastSyncAt: string | null;
  prefsDelta: Partial<UserPreferences>;
  favoritesSnapshot: FavoriteItem[];
  activitySince: ActivityItem[];
  toolPrefsSnapshot: Record<string, Record<string, any>>;
}

export interface SyncResponse {
  mergedPrefs: UserPreferences;
  mergedFavorites: FavoriteItem[];
  mergedToolPrefs: { toolSlug: string; preferences: Record<string, any> }[];
  syncedAt: string;
  hasConflicts: boolean;
}

// ── Default values ────────────────────────────────────────────────────────────
export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'en',
  viewMode: 'grid',
  cardSize: 'normal',
  density: 'comfortable',
  sidebarOpen: true,
  search: {
    recentSearches: [],
    pinnedSearches: [],
    preferredFilters: {},
    preferredCategories: [],
    searchMode: 'smart',
  },
  homepage: {
    widgetOrder: ['continue-using', 'trending', 'featured', 'new-releases', 'favorites'],
    hiddenWidgets: [],
    pinnedSections: [],
  },
  onboarding: {
    completed: false,
    skipped: false,
    completedAt: null,
    roles: [],
    interests: [],
    categoryPriority: [],
    experienceLevel: null,
    accentColor: 'blue'
  },
  dismissedTips: [],
  dismissedAnnouncements: [],
};

export const DEFAULT_FAVORITES_STORE: FavoritesStore = {
  tools: [], categories: [], collections: [], blogs: [], guides: []
};
