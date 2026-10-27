// client/apps/tool-qr-generator/src/services/smart-link.config.ts
import { ContentType } from '../models/qr-generator.models';

/**
 * Smart Link Engine Configuration Constants.
 * In strict synchronization with backend limits in app.qr.link.
 */
export const DYNAMIC_THRESHOLD_BYTES = 180;
export const MAX_DIRECT_VERSION = 8;
export const HYSTERESIS = 0.15;
export const MAX_TEXT_CHARS = 5000;
export const BACKEND_MAX_TEXT_CHARS = 20000;
export const MAX_OTHER_BYTES = 10000;
export const MAX_URL_CHARS = 4000;
export const DEBOUNCE_MS = 600;
export const NON_ASCII_THRESHOLD_BYTES = 60;

/**
 * Types that are ALWAYS encoded directly into the QR matrix.
 * Wi-Fi, phone, SMS, geo, email, crypto, and app require direct native phone scanner handling.
 */
export const ALWAYS_DIRECT_TYPES: ReadonlyArray<ContentType> = [
  'wifi',
  'phone',
  'sms',
  'geo',
  'email',
  'crypto',
  'app'
];

/**
 * Types that are eligible for automatic Smart Link promotion when content is large.
 */
export const SMART_LINK_ELIGIBLE_TYPES: ReadonlyArray<ContentType> = [
  'url',
  'text',
  'vcard',
  'event',
  'social'
];

