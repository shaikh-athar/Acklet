// client/apps/tool-qr-generator/src/utils/store-link-normalizer.ts

export interface StoreLinkNormalized {
  isValid: boolean;
  canonicalUrl: string;
  store: 'ios' | 'android';
  identifier?: string;
  error?: string;
}

/**
 * Normalizes and validates Apple App Store inputs.
 * Accepts full URLs (apps.apple.com/app/id123... or itunes.apple.com)
 * or bare numeric App IDs (e.g. 123456789 or id123456789).
 * Blocks non-store links like google.com/maps.
 */
export function normalizeIosAppInput(input: string): StoreLinkNormalized {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, canonicalUrl: '', store: 'ios' };
  }

  // Case 1: Bare numeric ID e.g. "123456789" or "id123456789"
  const bareIdMatch = trimmed.match(/^(?:id)?(\d{6,14})$/i);
  if (bareIdMatch) {
    const id = bareIdMatch[1];
    return {
      isValid: true,
      canonicalUrl: `https://apps.apple.com/app/id${id}`,
      store: 'ios',
      identifier: `id${id}`
    };
  }

  // Case 2: URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      canonicalUrl: '',
      store: 'ios',
      error: 'Please enter a valid Apple App Store link or numeric App ID (e.g. apps.apple.com/... or 123456789).'
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const isAppleStore =
    hostname === 'apps.apple.com' ||
    hostname === 'itunes.apple.com' ||
    hostname.endsWith('.apple.com');

  if (!isAppleStore) {
    return {
      isValid: false,
      canonicalUrl: '',
      store: 'ios',
      error: `"${hostname}" is not an Apple App Store link. Please enter an App Store link or numeric App ID.`
    };
  }

  // Extract id123456789 from path
  const idMatch = parsedUrl.pathname.match(/id(\d{6,14})/i);
  if (idMatch) {
    return {
      isValid: true,
      canonicalUrl: parsedUrl.toString(),
      store: 'ios',
      identifier: `id${idMatch[1]}`
    };
  }

  // Apple Store page link without explicit ID (e.g. developer page or store front)
  return {
    isValid: true,
    canonicalUrl: parsedUrl.toString(),
    store: 'ios'
  };
}

/**
 * Normalizes and validates Google Play Store inputs.
 * Accepts full URLs (play.google.com/store/apps/details?id=com.example.app)
 * or bare Android package names (e.g. com.example.app).
 * Blocks non-store links like google.com/maps.
 */
export function normalizeAndroidAppInput(input: string): StoreLinkNormalized {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, canonicalUrl: '', store: 'android' };
  }

  // Case 1: Package name e.g. "com.example.app" or "org.mozilla.firefox"
  // Android package name: at least 2 segments, letters/digits/underscores
  const packageRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/;
  if (packageRegex.test(trimmed)) {
    return {
      isValid: true,
      canonicalUrl: `https://play.google.com/store/apps/details?id=${trimmed}`,
      store: 'android',
      identifier: trimmed
    };
  }

  // Case 2: URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      isValid: false,
      canonicalUrl: '',
      store: 'android',
      error: 'Please enter a valid Google Play link or package name (e.g. play.google.com/... or com.example.app).'
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const isPlayStore =
    hostname === 'play.google.com' ||
    hostname === 'market.android.com';

  if (!isPlayStore) {
    return {
      isValid: false,
      canonicalUrl: '',
      store: 'android',
      error: `"${hostname}" is not a Google Play Store link. Please enter a Play Store link or package name.`
    };
  }

  const packageParam = parsedUrl.searchParams.get('id');
  if (packageParam && packageRegex.test(packageParam)) {
    return {
      isValid: true,
      canonicalUrl: parsedUrl.toString(),
      store: 'android',
      identifier: packageParam
    };
  }

  return {
    isValid: true,
    canonicalUrl: parsedUrl.toString(),
    store: 'android'
  };
}
