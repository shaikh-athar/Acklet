/**
 * Central message catalog for the Acklet URL Shortener.
 * Maps error and feedback codes to plain, friendly, non-technical text.
 */
export const SHORTENER_MESSAGE_CATALOG = {
  LINK_INVALID: 'Enter a valid link that starts with http:// or https://.',
  LINK_BLOCKED: "This link can't be shortened.",
  LINK_TOO_LONG: 'That link is too long. Try a shorter one.',
  NAME_INVALID: 'Use 3 to 30 letters, numbers, hyphens or underscores.',
  NAME_TAKEN: 'That name is already taken. Try another.',
  PASSWORD_TOO_SHORT: 'Use at least 6 characters.',
  PASSWORD_WRONG: "That password isn't correct. Try again.",
  RATE_LIMITED: "You're creating links too quickly. Please wait a moment and try again.",
  LINK_UNAVAILABLE: "This link isn't available.",
  LINK_EXPIRED: 'This link has expired.',
  LINK_NOT_ACTIVE_YET: "This link isn't active yet. Please check back later.",
  VISIT_LIMIT_REACHED: 'This link has reached its visit limit.',
  NO_PERMISSION: 'You can only manage links created on this device or restored from a backup.',
  BACKUP_FILE_INVALID: "That file couldn't be read. Choose a backup file downloaded from this tool.",
  SERVER_ERROR: "We couldn't complete that. Please try again in a few minutes.",
  OFFLINE_OR_NETWORK: 'You appear to be offline. Check your connection and try again.',
  ACCESS_EXPIRED: 'Your access has expired. Enter the password again.',
  REPORT_RECEIVED: 'Report received. Thank you.',
  SAVE_FAILED: "Your changes weren't saved. Please try again.",
  COPY_FAILED: "Couldn't copy. Select the link and copy it manually.",
  LINK_COPIED: 'Link copied',
  CSV_EXPORTED: 'CSV exported',
  BACKUP_EXPORTED: 'Recovery file exported'
} as const;

export type ShortenerMessageKey = keyof typeof SHORTENER_MESSAGE_CATALOG;

export function getShortenerMessage(code: string | null | undefined, fallback: string = SHORTENER_MESSAGE_CATALOG.SERVER_ERROR): string {
  if (!code) return fallback;
  return (SHORTENER_MESSAGE_CATALOG as Record<string, string>)[code] || fallback;
}
