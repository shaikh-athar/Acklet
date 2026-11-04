// client/apps/tool-barcode-generator/src/utils/launchable.util.ts

/**
 * Canonical redirectable/launchable QR content types.
 */
export const LAUNCHABLE_QR_TYPES = new Set<string>([
  'url',
  'email',
  'phone',
  'sms',
  'geo',
  'event',
  'social',
  'app',
  'crypto'
]);

export const NON_LAUNCHABLE_QR_TYPES = new Set<string>([
  'text',
  'wifi',
  'vcard'
]);

export function isLaunchableType(type?: string | null): boolean {
  if (!type) return false;
  const normalized = type.toLowerCase().trim();
  if (NON_LAUNCHABLE_QR_TYPES.has(normalized)) return false;
  return LAUNCHABLE_QR_TYPES.has(normalized);
}

/**
 * Checks whether barcode content is a valid link or launchable URI.
 * Plain numbers, codes, or text do NOT show a launch icon. Only valid links show the launch icon.
 */
export function isLaunchableContent(content?: string | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return /^(https?:\/\/|mailto:|tel:|sms:|geo:|market:\/\/|itms-apps:\/\/|bitcoin:|ethereum:|solana:)/i.test(trimmed);
}

