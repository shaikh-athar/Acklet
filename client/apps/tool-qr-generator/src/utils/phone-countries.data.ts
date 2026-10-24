// client/apps/tool-qr-generator/src/utils/phone-countries.data.ts
import { CountryCode, getCountryCallingCode } from 'libphonenumber-js/min';

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  dialCode: string;
  formatPlaceholder: string;
}

export const POPULAR_COUNTRIES: PhoneCountry[] = [
  { code: 'US', name: 'United States', dialCode: '+1', formatPlaceholder: '(555) 234-5678' },
  { code: 'IN', name: 'India', dialCode: '+91', formatPlaceholder: '98765 43210' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', formatPlaceholder: '7911 123456' },
  { code: 'CA', name: 'Canada', dialCode: '+1', formatPlaceholder: '(555) 234-5678' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', formatPlaceholder: '50 123 4567' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', formatPlaceholder: '50 123 4567' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', formatPlaceholder: '301 2345678' },
  { code: 'DE', name: 'Germany', dialCode: '+49', formatPlaceholder: '151 12345678' },
  { code: 'FR', name: 'France', dialCode: '+33', formatPlaceholder: '6 12 34 56 78' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', formatPlaceholder: '(11) 98765-4321' },
  { code: 'AU', name: 'Australia', dialCode: '+61', formatPlaceholder: '412 345 678' }
];

export const ALL_PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'AF', name: 'Afghanistan', dialCode: '+93', formatPlaceholder: '70 123 4567' },
  { code: 'AL', name: 'Albania', dialCode: '+355', formatPlaceholder: '69 123 4567' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', formatPlaceholder: '551 23 45 67' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', formatPlaceholder: '9 11 2345-6789' },
  { code: 'AU', name: 'Australia', dialCode: '+61', formatPlaceholder: '412 345 678' },
  { code: 'AT', name: 'Austria', dialCode: '+43', formatPlaceholder: '664 1234567' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', formatPlaceholder: '3600 1234' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', formatPlaceholder: '1712-345678' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', formatPlaceholder: '470 12 34 56' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', formatPlaceholder: '(11) 98765-4321' },
  { code: 'CA', name: 'Canada', dialCode: '+1', formatPlaceholder: '(555) 234-5678' },
  { code: 'CL', name: 'Chile', dialCode: '+56', formatPlaceholder: '9 1234 5678' },
  { code: 'CN', name: 'China', dialCode: '+86', formatPlaceholder: '138 0013 8000' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', formatPlaceholder: '300 123 4567' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', formatPlaceholder: '8312 3456' },
  { code: 'HR', name: 'Croatia', dialCode: '+385', formatPlaceholder: '91 234 5678' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', formatPlaceholder: '601 123 456' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', formatPlaceholder: '20 12 34 56' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', formatPlaceholder: '100 123 4567' },
  { code: 'FI', name: 'Finland', dialCode: '+358', formatPlaceholder: '40 1234567' },
  { code: 'FR', name: 'France', dialCode: '+33', formatPlaceholder: '6 12 34 56 78' },
  { code: 'DE', name: 'Germany', dialCode: '+49', formatPlaceholder: '151 12345678' },
  { code: 'GR', name: 'Greece', dialCode: '+30', formatPlaceholder: '691 234 5678' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', formatPlaceholder: '5123 4567' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', formatPlaceholder: '20 123 4567' },
  { code: 'IN', name: 'India', dialCode: '+91', formatPlaceholder: '98765 43210' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', formatPlaceholder: '812-3456-7890' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', formatPlaceholder: '85 123 4567' },
  { code: 'IL', name: 'Israel', dialCode: '+972', formatPlaceholder: '50-123-4567' },
  { code: 'IT', name: 'Italy', dialCode: '+39', formatPlaceholder: '312 345 6789' },
  { code: 'JP', name: 'Japan', dialCode: '+81', formatPlaceholder: '90-1234-5678' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', formatPlaceholder: '7 9012 3456' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', formatPlaceholder: '712 345678' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', formatPlaceholder: '5001 2345' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', formatPlaceholder: '70 123 456' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', formatPlaceholder: '12-345 6789' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', formatPlaceholder: '55 1234 5678' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', formatPlaceholder: '650-123456' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', formatPlaceholder: '6 12345678' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', formatPlaceholder: '21 123 4567' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', formatPlaceholder: '802 123 4567' },
  { code: 'NO', name: 'Norway', dialCode: '+47', formatPlaceholder: '412 34 567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', formatPlaceholder: '9123 4567' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', formatPlaceholder: '301 2345678' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', formatPlaceholder: '917 123 4567' },
  { code: 'PL', name: 'Poland', dialCode: '+48', formatPlaceholder: '512 345 678' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', formatPlaceholder: '912 345 678' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', formatPlaceholder: '3312 3456' },
  { code: 'RO', name: 'Romania', dialCode: '+40', formatPlaceholder: '712 345 678' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', formatPlaceholder: '50 123 4567' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', formatPlaceholder: '8123 4567' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', formatPlaceholder: '71 123 4567' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', formatPlaceholder: '10-1234-5678' },
  { code: 'ES', name: 'Spain', dialCode: '+34', formatPlaceholder: '612 34 56 78' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', formatPlaceholder: '71 234 5678' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', formatPlaceholder: '70 123 45 67' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', formatPlaceholder: '78 123 45 67' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', formatPlaceholder: '912 345 678' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', formatPlaceholder: '81 234 5678' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', formatPlaceholder: '501 234 56 78' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', formatPlaceholder: '50 123 4567' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', formatPlaceholder: '50 123 4567' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', formatPlaceholder: '7911 123456' },
  { code: 'US', name: 'United States', dialCode: '+1', formatPlaceholder: '(555) 234-5678' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', formatPlaceholder: '91 234 56 78' }
];

const TIMEZONE_PREFIX_MAP: Record<string, CountryCode> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Karachi': 'PK',
  'Asia/Tokyo': 'JP',
  'Asia/Shanghai': 'CN',
  'Asia/Singapore': 'SG',
  'Asia/Hong_Kong': 'HK',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Sao_Paulo': 'BR',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU'
};

/**
 * Detects default country code from browser timezone and navigator language.
 * Completely local, zero network requests.
 */
export function detectDefaultCountry(): CountryCode {
  if (typeof window === 'undefined') return 'US';

  // 1. Check remembered preference in localStorage
  try {
    const saved = localStorage.getItem('acklet_qr_last_phone_country') as CountryCode;
    if (saved && ALL_PHONE_COUNTRIES.some(c => c.code === saved)) {
      return saved;
    }
  } catch {}

  // 2. Check browser timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_PREFIX_MAP[tz]) {
      return TIMEZONE_PREFIX_MAP[tz];
    }
    if (tz?.startsWith('Asia/Kolkata')) return 'IN';
    if (tz?.startsWith('Europe/London')) return 'GB';
  } catch {}

  // 3. Check navigator language region code (e.g. "en-IN" -> "IN")
  try {
    const lang = navigator.language || '';
    const parts = lang.split('-');
    if (parts.length > 1) {
      const region = parts[1].toUpperCase() as CountryCode;
      if (ALL_PHONE_COUNTRIES.some(c => c.code === region)) {
        return region;
      }
    }
  } catch {}

  return 'US';
}

export function saveLastPhoneCountry(code: CountryCode): void {
  try {
    localStorage.setItem('acklet_qr_last_phone_country', code);
  } catch {}
}

export function getCountryByCode(code: CountryCode): PhoneCountry {
  return (
    ALL_PHONE_COUNTRIES.find(c => c.code === code) || {
      code,
      name: code,
      dialCode: `+${getCountryCallingCode(code)}`,
      formatPlaceholder: 'Phone number'
    }
  );
}
