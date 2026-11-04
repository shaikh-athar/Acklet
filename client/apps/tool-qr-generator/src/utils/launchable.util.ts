// client/apps/tool-qr-generator/src/utils/launchable.util.ts

/**
 * Canonical redirectable/launchable QR content types.
 * These types trigger an external app or browser redirection upon scanning:
 * - URL (website link or dynamic shortlink)
 * - Email (opens email app)
 * - Phone Call (opens dialer)
 * - SMS Message (opens messages app)
 * - Location (opens maps)
 * - Calendar Event (opens calendar)
 * - Social Profile (opens social app or page)
 * - App Store (opens store page)
 * - Crypto Wallet (opens wallet app)
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

/**
 * QR content types that NEVER open or redirect anywhere:
 * - Text (plain readable text or memo)
 * - Wi-Fi (connects to network, does not open a page)
 * - vCard (contact business card, saves to contacts)
 */
export const NON_LAUNCHABLE_QR_TYPES = new Set<string>([
  'text',
  'wifi',
  'vcard'
]);

/**
 * Checks whether a given QR content type is launchable / redirectable.
 */
export function isLaunchableType(type?: string | null): boolean {
  if (!type) return false;
  const normalized = type.toLowerCase().trim();
  if (NON_LAUNCHABLE_QR_TYPES.has(normalized)) return false;
  return LAUNCHABLE_QR_TYPES.has(normalized);
}

/**
 * Checks whether barcode or arbitrary text content represents a launchable link or URI scheme.
 * Plain numbers, SKUs, or non-URI text do NOT launch.
 */
export function isLaunchableContent(content?: string | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return /^(https?:\/\/|mailto:|tel:|sms:|geo:|market:\/\/|itms-apps:\/\/|bitcoin:|ethereum:|solana:)/i.test(trimmed);
}

