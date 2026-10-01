import { Injectable, signal } from '@angular/core';

/**
 * Standard Acklet theme blue accent reserved exclusively for the device owner.
 */
export const OWNER_THEME_COLOR = '#2096f3'; // Theme Blue for Device Owner

export interface PeerPaletteColor {
  name: string;
  hex: string;
}

/**
 * Curated high-contrast palette of 16 maximally distinct, non-overlapping color families:
 * Designed for perfect legibility in both Light and Dark themes.
 */
export const PEER_IDENTITY_PALETTE = [
  '#10B981', // 1. Emerald Mint (Green)
  '#EF4444', // 2. Crimson Flame (Red)
  '#8B5CF6', // 3. Electric Violet (Purple)
  '#06B6D4', // 4. Deep Cyan (Cyan / Sky)
  '#EC4899', // 5. Hot Pink (Pink)
  '#F97316', // 6. Radiant Tangerine (Orange)
  '#84CC16', // 7. Forest Lime (Lime / Chartreuse)
  '#D97706', // 8. Warm Ochre (Gold / Bronze)
  '#4F46E5', // 9. Midnight Indigo (Deep Indigo)
  '#BE185D', // 10. Deep Bordeaux (Burgundy / Wine)
  '#14B8A6', // 11. Persian Teal
  '#E11D48', // 12. Rose Coral
  '#6366F1', // 13. Vivid Indigo
  '#F59E0B', // 14. Amber Gold
  '#3B82F6', // 15. Cobalt Blue
  '#A855F7'  // 16. Purple Neon
];

export const PEER_NAMED_PALETTE: PeerPaletteColor[] = [
  { name: 'Emerald Mint', hex: '#10B981' },
  { name: 'Crimson Flame', hex: '#EF4444' },
  { name: 'Electric Violet', hex: '#8B5CF6' },
  { name: 'Deep Cyan', hex: '#06B6D4' },
  { name: 'Hot Pink', hex: '#EC4899' },
  { name: 'Radiant Tangerine', hex: '#F97316' },
  { name: 'Forest Lime', hex: '#84CC16' },
  { name: 'Warm Ochre', hex: '#D97706' },
  { name: 'Midnight Indigo', hex: '#4F46E5' },
  { name: 'Deep Bordeaux', hex: '#BE185D' },
  { name: 'Persian Teal', hex: '#14B8A6' },
  { name: 'Rose Coral', hex: '#E11D48' },
  { name: 'Vivid Indigo', hex: '#6366F1' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Cobalt Blue', hex: '#3B82F6' },
  { name: 'Purple Neon', hex: '#A855F7' }
];

export const CURATED_IDENTITY_PALETTE = [OWNER_THEME_COLOR, ...PEER_IDENTITY_PALETTE];

const DEVICE_COLOR_STORAGE_KEY = 'acklet_airvault_device_colors';
const OVERRIDE_STORAGE_KEY = 'acklet_airvault_identity_colors';

@Injectable({
  providedIn: 'root'
})
export class AirVaultColorService {
  /** Map of deviceName/username/deviceId -> accentColor stored in memory and persisted to localStorage */
  private deviceColors: Record<string, string> = this.loadAndSanitizeDeviceColors();

  /**
   * Returns the theme blue color reserved for device owners.
   */
  getOwnerColor(): string {
    return OWNER_THEME_COLOR;
  }

  /**
   * Loads the deviceName : accentColor mapping from localStorage and deduplicates any colliding peer colors.
   */
  private loadAndSanitizeDeviceColors(): Record<string, string> {
    try {
      const raw1 = localStorage.getItem(DEVICE_COLOR_STORAGE_KEY);
      const raw2 = localStorage.getItem(OVERRIDE_STORAGE_KEY);
      const parsed1 = raw1 ? JSON.parse(raw1) : {};
      const parsed2 = raw2 ? JSON.parse(raw2) : {};
      const merged: Record<string, string> = { ...parsed2, ...parsed1 };
      return this.deduplicatePeerColors(merged);
    } catch {
      return {};
    }
  }

  /**
   * Automatically inspects stored color mappings and ensures no two different peer identities share the same color.
   */
  private deduplicatePeerColors(map: Record<string, string>): Record<string, string> {
    const cleanedMap: Record<string, string> = {};
    const claimedColors = new Set<string>();

    // Canonicalize identities: group by stripped lowercase root
    const identityToOriginalKey: Map<string, string[]> = new Map();
    for (const key of Object.keys(map)) {
      const clean = key.toLowerCase().trim().replace(/^@/, '');
      if (!clean) continue;
      if (!identityToOriginalKey.has(clean)) {
        identityToOriginalKey.set(clean, []);
      }
      identityToOriginalKey.get(clean)!.push(key);
    }

    let paletteIndex = 0;

    for (const [canonicalId, keys] of identityToOriginalKey.entries()) {
      const existingColor = keys.map(k => map[k]).find(c => Boolean(c));

      let chosenColor: string;

      // If this is the owner color, allow if designated for owner
      if (existingColor && (existingColor.toLowerCase() === OWNER_THEME_COLOR.toLowerCase() || existingColor === '#2196F3')) {
        chosenColor = OWNER_THEME_COLOR;
      } else if (existingColor && !claimedColors.has(existingColor.toUpperCase())) {
        // Unclaimed distinct color — keep it
        chosenColor = existingColor;
        claimedColors.add(chosenColor.toUpperCase());
      } else {
        // Colliding or missing color: pick next distinct available from palette
        while (paletteIndex < PEER_IDENTITY_PALETTE.length && claimedColors.has(PEER_IDENTITY_PALETTE[paletteIndex].toUpperCase())) {
          paletteIndex++;
        }
        if (paletteIndex < PEER_IDENTITY_PALETTE.length) {
          chosenColor = PEER_IDENTITY_PALETTE[paletteIndex];
          claimedColors.add(chosenColor.toUpperCase());
          paletteIndex++;
        } else {
          chosenColor = this.computePeerDeterministicColor(canonicalId);
        }
      }

      // Assign to canonical key and all aliases
      cleanedMap[canonicalId] = chosenColor;
      cleanedMap['@' + canonicalId] = chosenColor;
      for (const k of keys) {
        cleanedMap[k.toLowerCase()] = chosenColor;
      }
    }

    try {
      localStorage.setItem(DEVICE_COLOR_STORAGE_KEY, JSON.stringify(cleanedMap));
      localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(cleanedMap));
    } catch { }

    return cleanedMap;
  }

  /**
   * Persists deviceName : accentColor mapping to localStorage.
   */
  private saveDeviceColors(map: Record<string, string>) {
    try {
      localStorage.setItem(DEVICE_COLOR_STORAGE_KEY, JSON.stringify(map));
      localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(map));
    } catch { }
  }

  /**
   * Returns a set of uppercase hex colors claimed by other peer identities.
   */
  private getUsedColorsByOtherPeers(map: Record<string, string>, currentAliases: string[]): Set<string> {
    const selfSet = new Set(
      currentAliases
        .filter(Boolean)
        .map(a => a.toLowerCase().trim().replace(/^@/, ''))
        .filter(a => a.length > 0)
    );

    const used = new Set<string>();

    for (const [key, color] of Object.entries(map)) {
      if (!color) continue;
      const normKey = key.toLowerCase().trim().replace(/^@/, '');
      if (!selfSet.has(normKey) && color.toLowerCase() !== OWNER_THEME_COLOR.toLowerCase() && color !== '#2196F3') {
        used.add(color.toUpperCase());
      }
    }

    return used;
  }

  private setAliasesInMap(map: Record<string, string>, rawKey: string, color: string) {
    const lower = rawKey.toLowerCase().trim();
    if (!lower) return;
    const stripped = lower.replace(/^@/, '');
    map[lower] = color;
    map[stripped] = color;
    map['@' + stripped] = color;
  }

  /**
   * Registers a device and maintains deviceName : accentColor in localStorage.
   * Device owner uses their configured accent color (or fallback OWNER_THEME_COLOR).
   * Peer devices prioritize their configured accent color with fallback to PEER_IDENTITY_PALETTE.
   */
  registerDeviceAccent(deviceName?: string, accentColor?: string, username?: string, deviceId?: string, isOwner: boolean = false): string {
    const map = { ...this.deviceColors };
    const cleanName = (deviceName || '').trim();
    const cleanUser = (username || '').trim().replace(/^@/, '');
    const cleanId = (deviceId || '').trim();

    if (isOwner) {
      const ownerColor = accentColor || OWNER_THEME_COLOR;
      if (cleanName) this.setAliasesInMap(map, cleanName, ownerColor);
      if (cleanUser) this.setAliasesInMap(map, cleanUser, ownerColor);
      if (cleanId) map[cleanId.toLowerCase()] = ownerColor;
      this.deviceColors = map;
      this.saveDeviceColors(map);
      return ownerColor;
    }

    const selfAliases = [cleanName, cleanUser, cleanId].filter(Boolean);
    const usedByOthers = this.getUsedColorsByOtherPeers(map, selfAliases);
    const isBlueColor = (c: string) => {
      const lower = c.toLowerCase();
      return lower === OWNER_THEME_COLOR.toLowerCase() || lower === '#2196f3' || lower === '#2563eb' || lower === '#3b82f6';
    };

    let resolvedColor: string | null = null;

    if (accentColor && !isBlueColor(accentColor) && !usedByOthers.has(accentColor.toUpperCase())) {
      resolvedColor = accentColor;
    } else {
      // Check if color is already registered under any of the device keys
      const existing = (cleanUser && map[cleanUser.toLowerCase()]) ||
        (cleanName && map[cleanName.toLowerCase()]) ||
        (cleanName && map[cleanName.toLowerCase().replace(/^@/, '')]) ||
        (cleanId && map[cleanId.toLowerCase()]);

      if (existing && !isBlueColor(existing) && !usedByOthers.has(existing.toUpperCase())) {
        resolvedColor = existing;
      } else {
        const seed = cleanUser || cleanName || cleanId || 'peer';
        resolvedColor = this.assignDistinctPeerColor(seed, usedByOthers);
      }
    }

    // Save devicename : accent color mappings for all lookup keys
    if (cleanName) this.setAliasesInMap(map, cleanName, resolvedColor);
    if (cleanUser) this.setAliasesInMap(map, cleanUser, resolvedColor);
    if (cleanId) map[cleanId.toLowerCase()] = resolvedColor;

    this.deviceColors = map;
    this.saveDeviceColors(map);
    return resolvedColor;
  }

  /**
   * Resolves the accent color for a device / author identity:
   * 1. Checks explicit custom override / originating device accent
   * 2. Checks device colors in localStorage
   * 3. Assigns an unused distinct color from the peer palette, registers to localStorage, and returns
   */
  getColorForIdentity(identityIdOrDeviceName: string, customOverride?: string, isOwner: boolean = false): string {
    if (isOwner) {
      return customOverride || OWNER_THEME_COLOR;
    }

    const raw = (identityIdOrDeviceName || 'anonymous').trim();
    const lower = raw.toLowerCase();
    const stripped = lower.replace(/^@/, '');
    const withAt = '@' + stripped;

    if (customOverride) {
      this.registerDeviceAccent(raw, customOverride, undefined, undefined, false);
      return customOverride;
    }

    const map = this.deviceColors;
    const existing = map[lower] || map[stripped] || map[withAt];
    if (existing) {
      return existing;
    }

    // Compute distinct non-colliding color from peer palette
    const selfAliases = [raw, stripped, withAt];
    const usedByOthers = this.getUsedColorsByOtherPeers(map, selfAliases);
    const color = this.assignDistinctPeerColor(stripped, usedByOthers);
    this.registerDeviceAccent(raw, color, undefined, undefined, false);
    return color;
  }

  /**
   * Assigns a distinct color from the palette.
   * Ensures that no two different peers are assigned the same color.
   */
  assignDistinctPeerColor(seed: string, usedColorsOrMap?: Set<string> | Record<string, string>): string {
    let usedColors: Set<string>;
    if (usedColorsOrMap instanceof Set) {
      usedColors = usedColorsOrMap;
    } else if (usedColorsOrMap) {
      usedColors = this.getUsedColorsByOtherPeers(usedColorsOrMap, [seed]);
    } else {
      usedColors = this.getUsedColorsByOtherPeers(this.deviceColors, [seed]);
    }

    // 1. First choice: try the deterministic hash-based color if it's unused
    const hashColor = this.computePeerDeterministicColor(seed);
    if (!usedColors.has(hashColor.toUpperCase())) {
      return hashColor;
    }

    // 2. If already taken by another peer, find the first unused color from the palette
    for (const color of PEER_IDENTITY_PALETTE) {
      if (!usedColors.has(color.toUpperCase())) {
        return color;
      }
    }

    // 3. Fallback: generate dynamic HSL hue if palette is fully occupied
    return this.getDynamicHueColor(usedColors.size);
  }

  /**
   * Deterministic hash-based color assignment across peer palette
   */
  computePeerDeterministicColor(seed: string): string {
    const id = (seed || 'peer').toLowerCase().trim().replace(/^@/, '');
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    const index = positiveHash % PEER_IDENTITY_PALETTE.length;
    return PEER_IDENTITY_PALETTE[index];
  }

  /**
   * Legacy alias
   */
  computeDeterministicColor(seed: string): string {
    return this.computePeerDeterministicColor(seed);
  }

  /**
   * Generates evenly spaced distinct HSL color if needed for ultra-large constellations
   */
  getDynamicHueColor(index: number, total: number = 16): string {
    const hue = Math.round((index * 360) / Math.max(total, 1));
    return `hsl(${hue}, 75%, 52%)`;
  }

  setCustomColorOverride(identityIdOrUsername: string, hexColor: string) {
    this.registerDeviceAccent(identityIdOrUsername, hexColor, undefined, undefined, false);
  }

  /**
   * Returns curated list of named palette colors for tag selection.
   */
  getNamedTagPalette(): PeerPaletteColor[] {
    return [
      { name: 'Default Cyan', hex: '#06B6D4' },
      { name: 'Emerald Mint', hex: '#10B981' },
      { name: 'Crimson Flame', hex: '#EF4444' },
      { name: 'Electric Violet', hex: '#8B5CF6' },
      { name: 'Hot Pink', hex: '#EC4899' },
      { name: 'Radiant Tangerine', hex: '#F97316' },
      { name: 'Forest Lime', hex: '#84CC16' },
      { name: 'Amber Gold', hex: '#F59E0B' },
      { name: 'Midnight Indigo', hex: '#4F46E5' },
      { name: 'Persian Teal', hex: '#14B8A6' },
      { name: 'Rose Coral', hex: '#E11D48' },
      { name: 'Cobalt Blue', hex: '#3B82F6' }
    ];
  }

  /**
   * Resolves color for a label/tag:
   * 1. Returns explicit custom tagColor if provided.
   * 2. Defaults to deterministic color based on the tag name.
   */
  getTagColor(tag?: string, explicitColor?: string): string {
    if (explicitColor && explicitColor.trim()) return explicitColor.trim();
    if (!tag || !tag.trim()) return '#06B6D4';
    const cleanTag = tag.trim().toLowerCase().replace(/^#+/, '');
    return this.computePeerDeterministicColor(cleanTag);
  }
}
