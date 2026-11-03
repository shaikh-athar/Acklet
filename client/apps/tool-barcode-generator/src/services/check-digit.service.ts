// apps/tool-barcode-generator/src/services/check-digit.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BarcodeCheckDigitService {
  /**
   * Universal GS1 Modulo-10 Check Digit calculation.
   * Moving from right to left before the check digit, weights alternate 3 and 1.
   * Works for EAN-13 (12 digits in), UPC-A (11 digits in), EAN-8 (7 digits in),
   * ISBN-13 (12 digits in), and ITF-14 (13 digits in).
   */
  calculateGs1Mod10(digitsWithoutCheck: string): string {
    const clean = digitsWithoutCheck.replace(/\D/g, '');
    if (!clean) return '';

    let sum = 0;
    let weight = 3;

    for (let i = clean.length - 1; i >= 0; i--) {
      const val = parseInt(clean[i], 10);
      sum += val * weight;
      weight = weight === 3 ? 1 : 3;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Validates a full GS1 barcode value against its expected Modulo-10 check digit.
   */
  validateGs1Mod10(fullCode: string): { valid: boolean; expected: string; actual: string } {
    const clean = fullCode.replace(/\D/g, '');
    if (clean.length < 2) {
      return { valid: false, expected: '', actual: '' };
    }
    const body = clean.slice(0, -1);
    const actual = clean.slice(-1);
    const expected = this.calculateGs1Mod10(body);
    return {
      valid: actual === expected,
      expected,
      actual
    };
  }

  /**
   * Converts ISBN-10 (with or without hyphens) to ISBN-13.
   */
  convertIsbn10To13(isbn10: string): string {
    const clean = isbn10.replace(/[^0-9X]/gi, '').toUpperCase();
    if (clean.length !== 10) return isbn10;
    // Take first 9 digits, prepend 978, compute EAN-13 check digit
    const core = '978' + clean.slice(0, 9);
    const checkDigit = this.calculateGs1Mod10(core);
    return core + checkDigit;
  }

  /**
   * Converts legacy ISMN-10 (e.g. M-060-11561-5 or M060115615) to 13-digit ISMN (starts with 9790).
   * Strips spaces/hyphens, replaces 'M' with '9790', takes the 8 item digits, and calculates GS1 Mod-10.
   */
  convertLegacyIsmnTo13(legacyIsmn: string): string {
    const clean = legacyIsmn.replace(/[-\s]/g, '').toUpperCase();
    if (!clean.startsWith('M')) return clean;
    const body = clean.slice(1); // 8 digits (or 9 including old check digit)
    const itemDigits = body.slice(0, 8);
    const core = '9790' + itemDigits;
    const check = this.calculateGs1Mod10(core);
    return core + check;
  }

  /**
   * ISSN Check Character calculation (Modulo 11, weights 8 down to 2).
   */
  calculateIssnCheckDigit(digits7: string): string {
    const clean = digits7.replace(/\D/g, '');
    if (clean.length < 7) return '';
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      sum += parseInt(clean[i], 10) * (8 - i);
    }
    const rem = sum % 11;
    if (rem === 0) return '0';
    const diff = 11 - rem;
    return diff === 10 ? 'X' : String(diff);
  }

  /**
   * Validates full 8-character ISSN (7 digits + 1 check character 0-9 or X).
   */
  validateIssn(issn8: string): { valid: boolean; expected: string; actual: string } {
    const clean = issn8.replace(/[-\s]/g, '').toUpperCase();
    if (clean.length !== 8) {
      return { valid: false, expected: '', actual: '' };
    }
    const body = clean.slice(0, 7);
    const actual = clean.slice(7);
    const expected = this.calculateIssnCheckDigit(body);
    return {
      valid: actual === expected,
      expected,
      actual
    };
  }

  /**
   * Expands UPC-E (6, 7, or 8 digits) into full 12-digit UPC-A.
   * Expansion rules by the 6th digit of the body:
   *   0, 1, 2: d1 d2 d6 0000 d3 d4 d5
   *   3:       d1 d2 d3 00000 d4 d5 (valid only if d3 != '0')
   *   4:       d1 d2 d3 d4 00000 d5 (valid only if d4 != '0')
   *   5..9:    d1 d2 d3 d4 d5 0000 d6
   * Returns null if the body pattern cannot be expanded or number system is invalid.
   */
  expandUpceToUpca(upce: string): { upca12: string; checkDigit: string; numSystem: string } | null {
    const digits = upce.replace(/\D/g, '');
    let numSystem = '0';
    let body = '';
    let enteredCheck = '';

    if (digits.length === 6) {
      numSystem = '0';
      body = digits;
    } else if (digits.length === 7) {
      numSystem = digits[0];
      body = digits.slice(1, 7);
    } else if (digits.length === 8) {
      numSystem = digits[0];
      body = digits.slice(1, 7);
      enteredCheck = digits[7];
    } else {
      return null;
    }

    if (numSystem !== '0' && numSystem !== '1') {
      return null;
    }

    const d1 = body[0], d2 = body[1], d3 = body[2], d4 = body[3], d5 = body[4], d6 = body[5];
    let mfgProd = '';
    if (['0', '1', '2'].includes(d6)) {
      mfgProd = d1 + d2 + d6 + '0000' + d3 + d4 + d5;
    } else if (d6 === '3') {
      if (d3 === '0') return null;
      mfgProd = d1 + d2 + d3 + '00000' + d4 + d5;
    } else if (d6 === '4') {
      if (d4 === '0') return null;
      mfgProd = d1 + d2 + d3 + d4 + '00000' + d5;
    } else {
      mfgProd = d1 + d2 + d3 + d4 + d5 + '0000' + d6;
    }

    const core11 = numSystem + mfgProd;
    const checkDigit = this.calculateGs1Mod10(core11);
    return {
      upca12: core11 + checkDigit,
      checkDigit,
      numSystem
    };
  }

  /**
   * Validates full 8-digit UPC-E code.
   */
  validateUpce(upce: string): { valid: boolean; expected: string; actual: string; canExpand: boolean } {
    const digits = upce.replace(/\D/g, '');
    if (digits.length !== 8) {
      return { valid: false, expected: '', actual: '', canExpand: false };
    }
    const expansion = this.expandUpceToUpca(digits);
    if (!expansion) {
      return { valid: false, expected: '', actual: digits[7], canExpand: false };
    }
    const actual = digits[7];
    return {
      valid: actual === expansion.checkDigit,
      expected: expansion.checkDigit,
      actual,
      canExpand: true
    };
  }

  /**
   * Code 39 Modulo-43 Check Character
   */
  private readonly CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

  calculateCode39Check(value: string): string {
    const upper = value.toUpperCase();
    let sum = 0;
    for (let i = 0; i < upper.length; i++) {
      const idx = this.CODE39_CHARS.indexOf(upper[i]);
      if (idx === -1) return '';
      sum += idx;
    }
    return this.CODE39_CHARS[sum % 43];
  }

  validateCode39Check(valueWithCheck: string): boolean {
    if (valueWithCheck.length < 2) return false;
    const body = valueWithCheck.slice(0, -1);
    const actual = valueWithCheck.slice(-1).toUpperCase();
    const expected = this.calculateCode39Check(body);
    return actual === expected;
  }

  /**
   * Code 93 Check Characters C and K
   */
  calculateCode93Check(value: string): { c: string; k: string } {
    const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%($)(%)(/)(+)';
    const upper = value.toUpperCase();
    
    // Weight for C is 1..20
    let sumC = 0;
    let weightC = 1;
    for (let i = upper.length - 1; i >= 0; i--) {
      const idx = CHARS.indexOf(upper[i]);
      if (idx !== -1) {
        sumC += idx * weightC;
        weightC = weightC >= 20 ? 1 : weightC + 1;
      }
    }
    const cChar = CHARS[sumC % 47];

    // Weight for K is 1..15 including C
    const withC = upper + cChar;
    let sumK = 0;
    let weightK = 1;
    for (let i = withC.length - 1; i >= 0; i--) {
      const idx = CHARS.indexOf(withC[i]);
      if (idx !== -1) {
        sumK += idx * weightK;
        weightK = weightK >= 15 ? 1 : weightK + 1;
      }
    }
    const kChar = CHARS[sumK % 47];

    return { c: cChar, k: kChar };
  }

  /**
   * Compresses a 12-digit UPC-A to 6 or 7/8-digit UPC-E if zero-suppressible.
   * Returns null if the code cannot be compressed.
   */
  compressUpcaToUpce(upca: string): string | null {
    const clean = upca.replace(/\D/g, '');
    if (clean.length !== 12 && clean.length !== 11) return null;
    const full = clean.length === 11 ? clean + this.calculateGs1Mod10(clean) : clean;
    if (full[0] !== '0') return null; // UPC-E requires number system 0 (or 1)

    const mfg = full.substring(1, 6);
    const item = full.substring(6, 11);
    const check = full[11];

    // Pattern 1: Manufacturer ends in 000, 100, or 200 -> mfg[0..1] + item[2..4] + mfg[2]
    if (['000', '100', '200'].includes(mfg.substring(2)) && item.substring(0, 2) === '00') {
      return mfg.substring(0, 2) + item.substring(2, 5) + mfg[2] + check;
    }
    // Pattern 2: Manufacturer ends in 00 (300-900) -> mfg[0..2] + item[3..4] + '3'
    if (mfg.substring(3) === '00' && item.substring(0, 3) === '000') {
      return mfg.substring(0, 3) + item.substring(3, 5) + '3' + check;
    }
    // Pattern 3: Manufacturer ends in 0 -> mfg[0..3] + item[4] + '4'
    if (mfg[4] === '0' && item.substring(0, 4) === '0000') {
      return mfg.substring(0, 4) + item[4] + '4' + check;
    }
    // Pattern 4: Manufacturer does not end in 0, item 00005-00009 -> mfg[0..4] + item[4]
    if (mfg[4] !== '0' && item.substring(0, 4) === '0000' && parseInt(item[4], 10) >= 5) {
      return mfg + item[4] + check;
    }

    return null;
  }

  /**
   * Calculates MSI Plessey Modulo 10 check digit.
   * Algorithm: odd-positioned digits from the right form a number, multiplied by 2.
   * Add digits of this product, then add even-positioned digits.
   * Check digit = (10 - (sum % 10)) % 10.
   */
  calculateMsiMod10(digits: string): string {
    const clean = digits.replace(/\D/g, '');
    if (!clean) return '';
    let oddStr = '';
    let evenSum = 0;
    for (let i = clean.length - 1; i >= 0; i--) {
      const posFromRight = clean.length - 1 - i;
      if (posFromRight % 2 === 0) {
        oddStr = clean[i] + oddStr;
      } else {
        evenSum += parseInt(clean[i], 10);
      }
    }
    const num = parseInt(oddStr, 10) * 2;
    const numStr = String(num);
    let numSum = 0;
    for (const ch of numStr) {
      numSum += parseInt(ch, 10);
    }
    const total = numSum + evenSum;
    return String((10 - (total % 10)) % 10);
  }

  /**
   * Calculates MSI Plessey Modulo 11 check digit.
   * Algorithm: weights 2..7 repeating from right to left.
   * sum = sum(digit * weight).
   * Check digit = (11 - (sum % 11)) % 11.
   * Note edge case: if check value is 10, returns '10'.
   */
  calculateMsiMod11(digits: string): string {
    const clean = digits.replace(/\D/g, '');
    if (!clean) return '';
    let sum = 0;
    let weight = 2;
    for (let i = clean.length - 1; i >= 0; i--) {
      sum += parseInt(clean[i], 10) * weight;
      weight++;
      if (weight > 7) weight = 2;
    }
    const rem = sum % 11;
    const diff = (11 - rem) % 11;
    return diff === 10 ? '10' : String(diff);
  }

  /**
   * Calculates MSI Plessey Modulo 10/10 check digits (two consecutive Mod 10 checks).
   */
  calculateMsiMod1010(digits: string): string {
    const clean = digits.replace(/\D/g, '');
    if (!clean) return '';
    const firstCheck = this.calculateMsiMod10(clean);
    const secondCheck = this.calculateMsiMod10(clean + firstCheck);
    return firstCheck + secondCheck;
  }

  /**
   * Returns full encoded string for MSI Plessey given raw input and check algorithm.
   */
  getMsiEncodedValue(digits: string, checkType: 'none' | 'mod10' | 'mod11' | 'mod1010' = 'mod10'): string {
    const clean = digits.replace(/\D/g, '');
    if (!clean) return '';
    switch (checkType) {
      case 'none':
        return clean;
      case 'mod10':
        return clean + this.calculateMsiMod10(clean);
      case 'mod11':
        return clean + this.calculateMsiMod11(clean);
      case 'mod1010':
        return clean + this.calculateMsiMod1010(clean);
      default:
        return clean + this.calculateMsiMod10(clean);
    }
  }
}
