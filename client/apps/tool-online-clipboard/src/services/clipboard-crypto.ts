export class ClipboardCrypto {
  /**
   * Generates a random 256-bit AES-GCM key as a base64url string
   */
  static async generateKey(): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
      return '';
    }
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return this.bufferToBase64(new Uint8Array(exported));
  }

  /**
   * Encrypts plaintext string using AES-GCM-256 and returns a JSON string with IV + ciphertext
   */
  static async encryptText(plainText: string, keyBase64: string): Promise<string> {
    if (!keyBase64) return plainText;
    const key = await this.importKey(keyBase64);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(plainText);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> },
      key,
      encodedData as unknown as Uint8Array<ArrayBuffer>
    );

    return JSON.stringify({
      iv: this.bufferToBase64(iv),
      data: this.bufferToBase64(new Uint8Array(ciphertext))
    });
  }

  /**
   * Decrypts AES-GCM ciphertext back into plain string
   */
  static async decryptText(encryptedJson: string, keyBase64: string): Promise<string> {
    if (!keyBase64 || !encryptedJson.startsWith('{"iv":')) return encryptedJson;
    try {
      const parsed = JSON.parse(encryptedJson);
      const key = await this.importKey(keyBase64);
      const iv = this.base64ToBuffer(parsed.iv);
      const ciphertext = this.base64ToBuffer(parsed.data);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as unknown as Uint8Array<ArrayBuffer> },
        key,
        ciphertext as unknown as Uint8Array<ArrayBuffer>
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      return '[Encrypted snippet - key required or invalid]';
    }
  }

  private static async importKey(keyBase64: string): Promise<CryptoKey> {
    const raw = this.base64ToBuffer(keyBase64);
    return await window.crypto.subtle.importKey('raw', raw as unknown as ArrayBuffer, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  private static bufferToBase64(buf: Uint8Array): string {
    let binary = '';
    const len = buf.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private static base64ToBuffer(b64: string): Uint8Array {
    let str = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
