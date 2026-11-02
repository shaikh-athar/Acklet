// apps/tool-barcode-generator/src/config/barcode-registry.ts
import {
  BARCODE_CATALOG,
  BARCODE_CATEGORIES,
  POPULAR_FORMAT_IDS,
  BARCODE_SYSTEM_LIMITS,
  RETAIL_NOTICE,
  ENCRYPTION_NOTICE
} from './barcode-catalog.config';
import { BarcodeCatalogItem, BarcodeCategory } from '../models/barcode.models';

export {
  BARCODE_CATALOG,
  BARCODE_CATEGORIES,
  POPULAR_FORMAT_IDS,
  BARCODE_SYSTEM_LIMITS,
  RETAIL_NOTICE,
  ENCRYPTION_NOTICE
};

export const BARCODE_REGISTRY: Record<string, BarcodeCatalogItem> = BARCODE_CATALOG;

export function getActiveFormats(): BarcodeCatalogItem[] {
  return Object.values(BARCODE_CATALOG).filter(f => f.enabled);
}

export function getActiveCategories(): BarcodeCategory[] {
  const active = getActiveFormats();
  const present = new Set(active.map(f => f.category));
  return BARCODE_CATEGORIES.filter(cat => {
    if (cat === 'Popular') return true;
    return present.has(cat);
  });
}

export function getPopularFormats(): BarcodeCatalogItem[] {
  return POPULAR_FORMAT_IDS
    .map(id => BARCODE_CATALOG[id])
    .filter((f): f is BarcodeCatalogItem => !!f && f.enabled);
}

function validateGs1Check(digits: string): boolean {
  if (digits.length < 2) return false;
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 2; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  const expected = (10 - (sum % 10)) % 10;
  return parseInt(digits[digits.length - 1], 10) === expected;
}

export function detectFormatSuggestion(input: string, currentFormat: string): string | null {
  const clean = input.trim();
  if (!clean) return null;

  // If currently on GS1 DataBar, GTINs (8, 12, 13, 14 digits) are valid for it; do not suggest other formats
  if (currentFormat === 'gs1-databar' || currentFormat === 'databar') {
    return null;
  }

  // If input contains non-digits/hyphens/spaces, it cannot match purely numeric formats
  if (/[^\d\s-]/.test(clean)) {
    return null;
  }

  const digits = clean.replace(/\D/g, '');

  // ISBN: starts with 978 or 979, and must be 10 or 13 digits with valid checksum
  if (/^97[89]/i.test(clean.replace(/[-\s]/g, '')) && (digits.length === 10 || digits.length === 13)) {
    if (digits.length === 13 && validateGs1Check(digits)) {
      return currentFormat !== 'isbn' ? 'isbn' : null;
    }
    if (digits.length === 10) {
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(digits[i], 10) * (10 - i);
      }
      const rem = (11 - (sum % 11)) % 11;
      const expected = rem === 10 ? 'X' : String(rem);
      if (digits[9] === expected) {
        return currentFormat !== 'isbn' ? 'isbn' : null;
      }
    }
  }

  // 14 digits -> ITF-14 (must have valid GS1 check digit)
  if (digits.length === 14 && clean === digits && validateGs1Check(digits)) {
    return currentFormat !== 'itf14' ? 'itf14' : null;
  }

  // 13 digits -> EAN-13 (must have valid GS1 check digit)
  if (digits.length === 13 && clean === digits && validateGs1Check(digits)) {
    return currentFormat !== 'ean13' && currentFormat !== 'isbn' && currentFormat !== 'ismn' ? 'ean13' : null;
  }

  // 12 digits -> UPC-A (must have valid GS1 check digit)
  if (digits.length === 12 && clean === digits && validateGs1Check(digits)) {
    return currentFormat !== 'upca' ? 'upca' : null;
  }

  // 8 digits -> EAN-8 (must have valid GS1 check digit)
  if (digits.length === 8 && clean === digits && validateGs1Check(digits)) {
    return currentFormat !== 'ean8' && currentFormat !== 'issn' ? 'ean8' : null;
  }

  return null;
}

export function isBetterAsQrCode(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\.[a-z0-9\-]+\.[a-z]{2,}/i.test(trimmed)) return true;
  if (/^mailto:/i.test(trimmed) || /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(trimmed)) return true;
  if (/^wifi:/i.test(trimmed) || /^BEGIN:VCARD/i.test(trimmed)) return true;
  if (trimmed.length > 80) return true;
  return false;
}

export function getActiveFormatsGrouped(): Record<string, BarcodeCatalogItem[]> {
  const grouped: Record<string, BarcodeCatalogItem[]> = {};
  for (const item of getActiveFormats()) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }
  return grouped;
}
