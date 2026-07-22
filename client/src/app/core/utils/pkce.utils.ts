// client/src/app/core/utils/pkce.utils.ts

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/**
 * Generates a high-entropy random code_verifier and derives the S256 code_challenge
 * using standard Web Crypto APIs available in browser environments.
 */
export async function generatePkcePair(): Promise<PkcePair> {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array);

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64UrlEncode(new Uint8Array(digest));

  return { codeVerifier, codeChallenge };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
