// apps/tool-barcode-generator/src/services/validator.service.ts
import { Injectable, inject } from '@angular/core';
import {
  BarcodeValidationResult,
  FormatPerOptions
} from '../models/barcode.models';
import { BARCODE_CATALOG, isBetterAsQrCode, detectFormatSuggestion } from '../config/barcode-registry';
import { BarcodeCheckDigitService } from './check-digit.service';

export interface IValidatorService {
  validate(
    formatId: string,
    rawInput: string,
    options?: FormatPerOptions
  ): BarcodeValidationResult;
}

export function extractInvalidChars(value: string, isAllowed: (ch: string) => boolean): string[] {
  const invalid = new Set<string>();
  for (const ch of value) {
    if (!isAllowed(ch)) {
      invalid.add(ch);
    }
  }
  return Array.from(invalid);
}

export function formatInvalidCharsList(invalidChars: string[]): string {
  const distinct = invalidChars.slice(0, 5);
  let str = distinct.join(' ');
  if (invalidChars.length > 5) {
    str += ' and others';
  }
  return str;
}

export function buildInvalidCharsMessage(prefix: string, invalidChars: string[]): string {
  const list = formatInvalidCharsList(invalidChars);
  return list ? `${prefix} Remove: ${list}.` : `${prefix}.`;
}

export const PDF417_CAPACITY_LIMITS: Record<number, number> = {
  0: 1850,
  1: 1700,
  2: 1550,
  3: 1350,
  4: 1100,
  5: 850,
  6: 600,
  7: 400,
  8: 220
};

export const AZTEC_CAPACITY_LIMITS: Record<number, number> = {
  10: 3000,
  23: 2000,
  30: 2000,
  50: 1000
};

@Injectable({
  providedIn: 'root'
})
export class ValidatorService implements IValidatorService {
  private checkDigitService: BarcodeCheckDigitService;

  constructor(checkDigitService?: BarcodeCheckDigitService) {
    if (checkDigitService) {
      this.checkDigitService = checkDigitService;
    } else {
      try {
        this.checkDigitService = inject(BarcodeCheckDigitService);
      } catch {
        this.checkDigitService = new BarcodeCheckDigitService();
      }
    }
  }

  validate(
    itemOrId: any,
    rawInput: string,
    options: FormatPerOptions = {}
  ): BarcodeValidationResult {
    const formatId = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
    const trimmed = rawInput ? rawInput.trim() : '';
    const catalogItem = BARCODE_CATALOG[formatId];

    if (!trimmed) {
      return {
        valid: false,
        cleanValue: '',
        displayValue: '',
        isFixedLength: catalogItem?.length?.fixed !== undefined,
        currentLength: 0,
        targetLength: catalogItem?.length?.fixed
      };
    }

    const suggestQr = isBetterAsQrCode(trimmed);
    const suggestedFormat = detectFormatSuggestion(trimmed, formatId) || undefined;

    switch (formatId) {
      // ── EAN-13 ─────────────────────────────────────────────────────
      case 'ean13': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 13,
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length !== 12 && digits.length !== 13) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter 12 or 13 digits.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 13,
            suggestQr
          };
        }
        if (digits.length === 12) {
          const check = this.checkDigitService.calculateGs1Mod10(digits);
          return {
            valid: true,
            cleanValue: digits + check,
            displayValue: `${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}${check}`,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }
        const checkResult = this.checkDigitService.validateGs1Mod10(digits);
        if (!checkResult.valid) {
          const lastDigit = digits[digits.length - 1];
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${checkResult.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkResult.expected,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: digits,
          displayValue: `${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}`,
          isFixedLength: true,
          currentLength: 13,
          targetLength: 13,
          suggestQr
        };
      }

      // ── EAN-8 ──────────────────────────────────────────────────────
      case 'ean8': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 8,
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length !== 7 && digits.length !== 8) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter 7 or 8 digits.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 8,
            suggestQr
          };
        }
        if (digits.length === 7) {
          const check = this.checkDigitService.calculateGs1Mod10(digits);
          return {
            valid: true,
            cleanValue: digits + check,
            displayValue: `${digits.slice(0, 4)} ${digits.slice(4)}${check}`,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }
        const checkResult = this.checkDigitService.validateGs1Mod10(digits);
        if (!checkResult.valid) {
          const lastDigit = digits[digits.length - 1];
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${checkResult.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkResult.expected,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: digits,
          displayValue: `${digits.slice(0, 4)} ${digits.slice(4)}`,
          isFixedLength: true,
          currentLength: 8,
          targetLength: 8,
          suggestQr
        };
      }

      // ── UPC-A ──────────────────────────────────────────────────────
      case 'upca': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 12,
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length !== 11 && digits.length !== 12) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter 11 or 12 digits.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 12,
            suggestQr
          };
        }
        if (digits.length === 11) {
          const check = this.checkDigitService.calculateGs1Mod10(digits);
          return {
            valid: true,
            cleanValue: digits + check,
            displayValue: `${digits[0]} ${digits.slice(1, 6)} ${digits.slice(6)}${check}`,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 12,
            targetLength: 12,
            suggestQr
          };
        }
        const checkResult = this.checkDigitService.validateGs1Mod10(digits);
        if (!checkResult.valid) {
          const lastDigit = digits[digits.length - 1];
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${checkResult.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkResult.expected,
            isFixedLength: true,
            currentLength: 12,
            targetLength: 12,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: digits,
          displayValue: `${digits[0]} ${digits.slice(1, 6)} ${digits.slice(6)}`,
          isFixedLength: true,
          currentLength: 12,
          targetLength: 12,
          suggestQr
        };
      }

      // ── UPC-E ──────────────────────────────────────────────────────
      case 'upce': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 8,
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (![6, 7, 8].includes(digits.length)) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter 6, 7 or 8 digits.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 8,
            suggestQr
          };
        }

        if (digits.length === 6) {
          const fullUpce = '0' + digits;
          const expansion = this.checkDigitService.expandUpceToUpca(fullUpce);
          if (!expansion) {
            return {
              valid: false,
              cleanValue: digits,
              displayValue: digits,
              errorMessage: 'Invalid 6-digit UPC-E pattern.',
              isFixedLength: true,
              currentLength: 6,
              targetLength: 8,
              suggestQr
            };
          }
          const check = expansion.checkDigit;
          return {
            valid: true,
            cleanValue: fullUpce + check,
            displayValue: `${fullUpce}${check}`,
            checkDigitAdded: check,
            suggestion: `Number system 0 and check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }

        if (digits.length === 7) {
          if (digits[0] !== '0' && digits[0] !== '1') {
            return {
              valid: false,
              cleanValue: digits,
              displayValue: digits,
              errorMessage: 'UPC-E number system must be 0 or 1.',
              isFixedLength: true,
              currentLength: 7,
              targetLength: 8,
              suggestQr
            };
          }
          const expansion = this.checkDigitService.expandUpceToUpca(digits);
          if (!expansion) {
            return {
              valid: false,
              cleanValue: digits,
              displayValue: digits,
              errorMessage: 'Invalid 7-digit UPC-E pattern.',
              isFixedLength: true,
              currentLength: 7,
              targetLength: 8,
              suggestQr
            };
          }
          const check = expansion.checkDigit;
          return {
            valid: true,
            cleanValue: digits + check,
            displayValue: `${digits}${check}`,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }

        if (digits[0] !== '0' && digits[0] !== '1') {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'UPC-E must start with 0 or 1.',
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }

        const valRes = this.checkDigitService.validateUpce(digits);
        if (!valRes.valid) {
          if (!valRes.canExpand) {
            return {
              valid: false,
              cleanValue: digits,
              displayValue: digits,
              errorMessage: 'Invalid UPC-E manufacturer and product pattern.',
              isFixedLength: true,
              currentLength: 8,
              targetLength: 8,
              suggestQr
            };
          }
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${valRes.expected}. The last digit is ${valRes.actual}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: valRes.expected,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }

        return {
          valid: true,
          cleanValue: digits,
          displayValue: digits,
          isFixedLength: true,
          currentLength: 8,
          targetLength: 8,
          suggestQr
        };
      }

      // ── ISSN ───────────────────────────────────────────────────────
      case 'issn': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s\-xX]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 8,
            suggestQr
          };
        }
        const cleaned = trimmed.replace(/[-\s]/g, '').toUpperCase();
        if (cleaned.length !== 7 && cleaned.length !== 8) {
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: 'Enter 7 or 8 digits.',
            isFixedLength: true,
            currentLength: cleaned.length,
            targetLength: 8,
            suggestQr
          };
        }

        if (cleaned.length === 7) {
          const check = this.checkDigitService.calculateIssnCheckDigit(cleaned);
          const full8 = cleaned + check;
          const ean12 = '977' + cleaned + '00';
          const eanCheck = this.checkDigitService.calculateGs1Mod10(ean12);
          const encoded13 = ean12 + eanCheck;
          return {
            valid: true,
            cleanValue: encoded13,
            displayValue: `${cleaned.slice(0, 4)}-${cleaned.slice(4)}${check}`,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }

        const checkRes = this.checkDigitService.validateIssn(cleaned);
        if (!checkRes.valid) {
          const lastDigit = cleaned[7];
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: `Check digit should be ${checkRes.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkRes.expected,
            isFixedLength: true,
            currentLength: 8,
            targetLength: 8,
            suggestQr
          };
        }

        const body7 = cleaned.slice(0, 7);
        const ean12 = '977' + body7 + '00';
        const eanCheck = this.checkDigitService.calculateGs1Mod10(ean12);
        const encoded13 = ean12 + eanCheck;
        return {
          valid: true,
          cleanValue: encoded13,
          displayValue: `${body7.slice(0, 4)}-${body7.slice(4)}${cleaned[7]}`,
          isFixedLength: true,
          currentLength: 8,
          targetLength: 8,
          suggestQr
        };
      }

      // ── ISMN ───────────────────────────────────────────────────────
      case 'ismn': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s\-mM]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only (or legacy M- prefix).', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 13,
            suggestQr
          };
        }
        const cleaned = trimmed.replace(/[-\s]/g, '').toUpperCase();
        if (cleaned.startsWith('M')) {
          const body = cleaned.slice(1);
          if (body.length < 8) {
            return {
              valid: false,
              cleanValue: cleaned,
              displayValue: cleaned,
              errorMessage: 'Legacy ISMN must have M- followed by 8 or 9 digits.',
              isFixedLength: true,
              currentLength: cleaned.length,
              targetLength: 13,
              suggestQr
            };
          }
          const converted13 = this.checkDigitService.convertLegacyIsmnTo13(cleaned);
          return {
            valid: true,
            cleanValue: converted13,
            displayValue: converted13,
            suggestion: `Converted legacy ISMN to ${converted13}.`,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }

        if (!cleaned.startsWith('9790')) {
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: 'ISMN must start with 9790 (or legacy M-).',
            isFixedLength: true,
            currentLength: cleaned.length,
            targetLength: 13,
            suggestQr
          };
        }

        if (cleaned.length !== 12 && cleaned.length !== 13) {
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: 'Enter 12 or 13 digits.',
            isFixedLength: true,
            currentLength: cleaned.length,
            targetLength: 13,
            suggestQr
          };
        }

        if (cleaned.length === 12) {
          const check = this.checkDigitService.calculateGs1Mod10(cleaned);
          return {
            valid: true,
            cleanValue: cleaned + check,
            displayValue: `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}-${check}`,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }

        const checkRes = this.checkDigitService.validateGs1Mod10(cleaned);
        if (!checkRes.valid) {
          const lastDigit = cleaned[12];
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: `Check digit should be ${checkRes.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkRes.expected,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }

        return {
          valid: true,
          cleanValue: cleaned,
          displayValue: `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}-${cleaned[12]}`,
          isFixedLength: true,
          currentLength: 13,
          targetLength: 13,
          suggestQr
        };
      }

      // ── ISBN ───────────────────────────────────────────────────────
      case 'isbn': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s\-xX]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only (and X for ISBN-10 check).', invalid),
            suggestedAction: 'strip-non-digits',
            suggestQr
          };
        }
        const cleaned = trimmed.replace(/[-\s]/g, '');
        if (/^\d{9}[\dX]$/i.test(cleaned)) {
          let sum = 0;
          for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned[i], 10) * (10 - i);
          }
          const actualCheck = cleaned[9].toUpperCase();
          const rem = (11 - (sum % 11)) % 11;
          const expectedCheck = rem === 10 ? 'X' : String(rem);
          if (actualCheck !== expectedCheck) {
            return {
              valid: false,
              cleanValue: cleaned,
              displayValue: cleaned,
              errorMessage: `Check digit should be ${expectedCheck}. The last digit is ${actualCheck}.`,
              suggestedAction: 'fix-check-digit',
              suggestedCheckDigit: expectedCheck,
              isFixedLength: true,
              currentLength: 10,
              targetLength: 10,
              suggestQr
            };
          }
          const converted13 = this.checkDigitService.convertIsbn10To13(cleaned);
          return {
            valid: true,
            cleanValue: converted13,
            displayValue: converted13,
            suggestion: `Converted ISBN-10 to ${converted13}.`,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length !== 12 && digits.length !== 13) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter a 10 or 13 digit ISBN with 978 or 979 prefix.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 13,
            suggestQr
          };
        }
        if (!digits.startsWith('978') && !digits.startsWith('979')) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'ISBN must start with 978 or 979.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 13,
            suggestQr
          };
        }
        if (digits.length === 12) {
          const check = this.checkDigitService.calculateGs1Mod10(digits);
          return {
            valid: true,
            cleanValue: digits + check,
            displayValue: digits + check,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }
        const checkResult = this.checkDigitService.validateGs1Mod10(digits);
        if (!checkResult.valid) {
          const lastDigit = digits[digits.length - 1];
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${checkResult.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkResult.expected,
            isFixedLength: true,
            currentLength: 13,
            targetLength: 13,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: digits,
          displayValue: digits,
          isFixedLength: true,
          currentLength: 13,
          targetLength: 13,
          suggestQr
        };
      }

      // ── Code 39 ────────────────────────────────────────────────────
      case 'code39': {
        const invalid = extractInvalidChars(trimmed, ch => /[0-9A-Za-z\s\-\.\$\/\+\%]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use letters A to Z, digits and - . $ / + % only.', invalid),
            suggestQr
          };
        }
        if (/[a-z]/.test(trimmed)) {
          return {
            valid: false,
            cleanValue: trimmed.toUpperCase(),
            displayValue: trimmed.toUpperCase(),
            errorMessage: 'Use letters A to Z, digits and - . $ / + % only.',
            suggestedAction: 'uppercase',
            suggestQr
          };
        }
        const upper = trimmed.toUpperCase();
        if (trimmed.length > 43) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: 'Enter 43 characters or fewer.',
            suggestQr
          };
        }
        let clean = upper;
        if (options.includeCheckDigit) {
          const checkChar = this.checkDigitService.calculateCode39Check(clean);
          clean = clean + checkChar;
        }
        return {
          valid: true,
          cleanValue: clean,
          displayValue: clean,
          suggestQr
        };
      }

      // ── Code 93 ────────────────────────────────────────────────────
      case 'code93': {
        const invalid = extractInvalidChars(trimmed, ch => /[0-9A-Za-z\s\-\.\$\/\+\%]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use letters A to Z, digits and - . $ / + % only.', invalid),
            suggestQr
          };
        }
        const upper = trimmed.toUpperCase();
        if (trimmed.length > 50) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: 'Enter 50 characters or fewer.',
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: upper,
          displayValue: upper,
          suggestQr
        };
      }

      // ── ITF-14 ─────────────────────────────────────────────────────
      case 'itf14': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: 14,
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length !== 13 && digits.length !== 14) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter 13 or 14 digits.',
            isFixedLength: true,
            currentLength: digits.length,
            targetLength: 14,
            suggestQr
          };
        }
        if (digits.length === 13) {
          const check = this.checkDigitService.calculateGs1Mod10(digits);
          return {
            valid: true,
            cleanValue: digits + check,
            displayValue: digits + check,
            checkDigitAdded: check,
            suggestion: `Check digit ${check} added.`,
            isFixedLength: true,
            currentLength: 14,
            targetLength: 14,
            suggestQr
          };
        }
        const checkResult = this.checkDigitService.validateGs1Mod10(digits);
        if (!checkResult.valid) {
          const lastDigit = digits[digits.length - 1];
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${checkResult.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkResult.expected,
            isFixedLength: true,
            currentLength: 14,
            targetLength: 14,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: digits,
          displayValue: digits,
          isFixedLength: true,
          currentLength: 14,
          targetLength: 14,
          suggestQr
        };
      }

      // ── Interleaved 2 of 5 ─────────────────────────────────────────
      case 'itf': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (!digits) {
          return {
            valid: false,
            cleanValue: '',
            displayValue: '',
            errorMessage: 'Use digits only.',
            suggestQr
          };
        }
        if (digits.length % 2 !== 0) {
          if (options.autoPrependZero) {
            return {
              valid: true,
              cleanValue: '0' + digits,
              displayValue: '0' + digits,
              suggestion: 'Prepended 0 for even length.',
              suggestQr
            };
          }
          return {
            valid: false,
            cleanValue: '0' + digits,
            displayValue: digits,
            errorMessage: 'Length must be an even number of digits.',
            suggestedAction: 'prepend-zero',
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: digits,
          displayValue: digits,
          suggestQr
        };
      }

      // ── Codabar ────────────────────────────────────────────────────
      case 'codabar': {
        const cleaned = trimmed.toUpperCase();
        if (cleaned.length > 2 && /[A-Z]/.test(cleaned.slice(1, -1))) {
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: 'Guards A to D are allowed only at start and end.',
            suggestQr
          };
        }
        const invalid = extractInvalidChars(trimmed, ch => /[0-9\-\$\:\/\.\+a-dA-D]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: cleaned,
            displayValue: cleaned,
            errorMessage: buildInvalidCharsMessage('Use digits, symbols - $ : / . + and guards A to D.', invalid),
            suggestQr
          };
        }
        let formatted = cleaned;
        if (!/^[A-D]/.test(formatted)) {
          formatted = (options.codabarStart || 'A') + formatted;
        }
        if (!/[A-D]$/.test(formatted)) {
          formatted = formatted + (options.codabarStop || 'B');
        }
        return {
          valid: true,
          cleanValue: formatted,
          displayValue: formatted,
          suggestQr
        };
      }

      // ── Code 128 ───────────────────────────────────────────────────
      case 'code128': {
        const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Code 128 supports ASCII characters only.', invalid),
            suggestQr
          };
        }
        if (trimmed.length > 80) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: 'Enter 80 characters or fewer.',
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── Code 39 Extended ───────────────────────────────────────────
      case 'code39ext': {
        const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Code 39 Extended supports ASCII characters only.', invalid),
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── Telepen ────────────────────────────────────────────────────
      case 'telepen': {
        const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Telepen supports ASCII characters only.', invalid),
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── Data Matrix ────────────────────────────────────────────────
      case 'datamatrix': {
        const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Data Matrix supports ASCII characters only.', invalid),
            suggestQr
          };
        }
        if (options.shape === 'rectangular') {
          if (trimmed.length > 72) {
            return {
              valid: false,
              cleanValue: trimmed,
              displayValue: trimmed,
              errorMessage: 'Rectangular Data Matrix supports up to 72 characters. Choose square or shorten the value.',
              suggestQr
            };
          }
        } else if (trimmed.length > 2335) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: 'Square Data Matrix supports up to 2335 characters. Shorten the value.',
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── PDF417 ─────────────────────────────────────────────────────
      case 'pdf417': {
        const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('PDF417 supports ASCII characters only.', invalid),
            suggestQr
          };
        }
        const lvl = typeof options.securityLevel === 'number' ? options.securityLevel : 2;
        const maxCapacity = PDF417_CAPACITY_LIMITS[lvl] ?? 1550;
        if (trimmed.length > maxCapacity) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: `Level ${lvl} supports up to ${maxCapacity} characters. Use a lower level or shorten the text.`,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── Aztec ──────────────────────────────────────────────────────
      case 'aztec': {
        const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Aztec supports ASCII characters only.', invalid),
            suggestQr
          };
        }
        const ec = typeof options.errorCorrectionPercent === 'number' ? options.errorCorrectionPercent : 30;
        const maxCapacity = AZTEC_CAPACITY_LIMITS[ec] ?? 2000;
        if (trimmed.length > maxCapacity) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: `${ec}% error correction supports up to ${maxCapacity} characters. Lower the percent or shorten the text.`,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── MSI Plessey ────────────────────────────────────────────────
      case 'msi': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length < 1 || digits.length > 40) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter between 1 and 40 digits.',
            currentLength: digits.length,
            targetLength: 40,
            suggestQr
          };
        }
        const msiCheck = options.msiCheck || 'mod10';
        const cleanVal = this.checkDigitService.getMsiEncodedValue(digits, msiCheck);
        return {
          valid: true,
          cleanValue: cleanVal,
          displayValue: cleanVal,
          currentLength: digits.length,
          suggestQr
        };
      }

      // ── Code 11 ────────────────────────────────────────────────────
      case 'code11': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits and hyphens only.', invalid),
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr
        };
      }

      // ── Standard 2 of 5 ────────────────────────────────────────────
      case 'standard2of5': {
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            suggestQr
          };
        }
        const digits = trimmed.replace(/\D/g, '');
        return {
          valid: true,
          cleanValue: digits,
          displayValue: digits,
          suggestQr
        };
      }

      // ── GS1 DataBar ────────────────────────────────────────────────
      case 'databar':
      case 'gs1-databar': {
        const variant = options.variant || 'omni';
        const isLimited = variant === 'limited' || variant === 'databar-limited';
        const isExpanded = variant === 'expanded' || variant === 'expanded-stacked' || variant === 'databar-expanded' || variant === 'databar-expanded-stacked';

        if (isExpanded) {
          if (trimmed.length > 90) {
            return {
              valid: false,
              cleanValue: trimmed,
              displayValue: trimmed,
              errorMessage: `Too long. ${trimmed.length} entered, 90 allowed.`,
              suggestQr
            };
          }
          if (trimmed.startsWith('(')) {
            const aiRegex = /\((\d{2,4})\)([^\(\)]*)/g;
            let match;
            let count = 0;
            let has01 = false;
            let gtinValid = true;
            let gtinError = '';

            while ((match = aiRegex.exec(trimmed)) !== null) {
              count++;
              const ai = match[1];
              const val = match[2];
              if (ai === '01') {
                has01 = true;
                if (!/^\d{14}$/.test(val)) {
                  gtinValid = false;
                  gtinError = 'AI (01) GTIN must be exactly 14 digits.';
                } else {
                  const checkRes = this.checkDigitService.validateGs1Mod10(val);
                  if (!checkRes.valid) {
                    gtinValid = false;
                    gtinError = `AI (01) check digit should be ${checkRes.expected}. The last digit is ${val[13]}.`;
                  }
                }
              }
            }

            if (count === 0) {
              return {
                valid: false,
                cleanValue: trimmed,
                displayValue: trimmed,
                errorMessage: 'Enter valid Application Identifiers in parentheses, e.g. (01)...',
                suggestQr
              };
            }
            if (!gtinValid) {
              return {
                valid: false,
                cleanValue: trimmed,
                displayValue: trimmed,
                errorMessage: gtinError,
                suggestQr
              };
            }
            return {
              valid: true,
              cleanValue: trimmed,
              displayValue: trimmed,
              suggestQr
            };
          } else {
            const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
            if (invalid.length > 0) {
              return {
                valid: false,
                cleanValue: trimmed,
                displayValue: trimmed,
                errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
                suggestedAction: 'strip-non-digits',
                suggestQr
              };
            }
            const digits = trimmed.replace(/\D/g, '');
            if (![8, 12, 13, 14].includes(digits.length)) {
              return {
                valid: false,
                cleanValue: digits,
                displayValue: digits,
                errorMessage: 'Enter 8, 12, 13 or 14 digits (or Application Identifiers in parentheses).',
                suggestQr
              };
            }
            const checkRes = this.checkDigitService.validateGs1Mod10(digits);
            if (!checkRes.valid) {
              const lastDigit = digits[digits.length - 1];
              return {
                valid: false,
                cleanValue: digits,
                displayValue: digits,
                errorMessage: `Check digit should be ${checkRes.expected}. The last digit is ${lastDigit}.`,
                suggestedAction: 'fix-check-digit',
                suggestedCheckDigit: checkRes.expected,
                suggestQr
              };
            }
            const padded14 = digits.padStart(14, '0');
            return {
              valid: true,
              cleanValue: `(01)${padded14}`,
              displayValue: `(01)${padded14}`,
              suggestQr
            };
          }
        }

        // Standard DataBar (Omnidirectional, Truncated, Stacked, Stacked Omnidirectional, Limited)
        const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
        if (invalid.length > 0) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
            suggestedAction: 'strip-non-digits',
            suggestQr
          };
        }

        const digits = trimmed.replace(/\D/g, '');
        if (![8, 12, 13, 14].includes(digits.length)) {
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: 'Enter 8, 12, 13 or 14 digits.',
            isFixedLength: false,
            currentLength: digits.length,
            targetLength: 14,
            suggestQr
          };
        }

        const checkResult = this.checkDigitService.validateGs1Mod10(digits);
        if (!checkResult.valid) {
          const lastDigit = digits[digits.length - 1];
          return {
            valid: false,
            cleanValue: digits,
            displayValue: digits,
            errorMessage: `Check digit should be ${checkResult.expected}. The last digit is ${lastDigit}.`,
            suggestedAction: 'fix-check-digit',
            suggestedCheckDigit: checkResult.expected,
            isFixedLength: false,
            currentLength: digits.length,
            targetLength: 14,
            suggestQr
          };
        }

        const padded14 = digits.padStart(14, '0');
        if (isLimited) {
          if (!padded14.startsWith('0') && !padded14.startsWith('1')) {
            return {
              valid: false,
              cleanValue: digits,
              displayValue: digits,
              errorMessage: 'Limited accepts only GTINs starting with 0 or 1.',
              suggestQr
            };
          }
        }

        return {
          valid: true,
          cleanValue: `(01)${padded14}`,
          displayValue: `(01) ${padded14}`,
          isFixedLength: false,
          currentLength: digits.length,
          targetLength: 14,
          suggestQr
        };
      }

      // ── Default / Linear Formats ───────────────────────────────────
      default: {
        const item = BARCODE_CATALOG[formatId];
        if (!item) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: 'Format not recognized.',
            suggestQr
          };
        }
        if (item.inputMode === 'numeric') {
          const invalid = extractInvalidChars(trimmed, ch => /[\d\s-]/.test(ch));
          if (invalid.length > 0) {
            return {
              valid: false,
              cleanValue: trimmed,
              displayValue: trimmed,
              errorMessage: buildInvalidCharsMessage('Use digits only.', invalid),
              suggestedAction: 'strip-non-digits',
              currentLength: trimmed.length,
              targetLength: item.length?.fixed,
              suggestQr
            };
          }
        } else {
          const invalid = extractInvalidChars(trimmed, ch => ch.charCodeAt(0) <= 127);
          if (invalid.length > 0) {
            return {
              valid: false,
              cleanValue: trimmed,
              displayValue: trimmed,
              errorMessage: buildInvalidCharsMessage(`${item.label} supports ASCII characters only.`, invalid),
              suggestQr
            };
          }
        }
        if (item.length?.fixed && trimmed.length !== item.length.fixed) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: `Enter exactly ${item.length.fixed} characters.`,
            isFixedLength: true,
            currentLength: trimmed.length,
            targetLength: item.length.fixed,
            suggestQr
          };
        }
        if (item.length && (trimmed.length < item.length.min || trimmed.length > item.length.max)) {
          return {
            valid: false,
            cleanValue: trimmed,
            displayValue: trimmed,
            errorMessage: `Enter between ${item.length.min} and ${item.length.max} characters.`,
            currentLength: trimmed.length,
            suggestQr
          };
        }
        return {
          valid: true,
          cleanValue: trimmed,
          displayValue: trimmed,
          suggestQr,
          suggestedFormat
        };
      }
    }
  }
}
