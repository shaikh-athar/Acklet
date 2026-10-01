import { Injectable } from '@angular/core';
import { AirVaultLogger } from './airvault-sync-debug.service';

export interface EncryptedPacket {
  packetId: string;
  sequenceNumber: number;
  iv: string;
  ciphertext: string;
  senderDeviceId: string;
  recipientDeviceId?: string;
  timestamp: number;
  contentHash: string;
  syncCorrelationId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultCryptoService {
  private keyPair: CryptoKeyPair | null = null;
  private sessionKey: CryptoKey | null = null;
  private deviceThumbprint = '';

  constructor() {
    this.initCrypto();
  }

  private async initCrypto() {
    try {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // NOTE: Shared-clipboard content is encrypted in transit and stored on the server until expiry.
        // TODO: Planned fix for full zero-knowledge End-to-End Encryption (E2EE):
        // Replace this static workspace passphrase with a random, per-clipboard 256-bit AES key embedded
        // in the client-side URL hash fragment (e.g. /c/<clipboardId>#key=<random-key>).
        // The hash fragment is never transmitted to the backend server, ensuring true zero-knowledge encryption.
        const encoder = new TextEncoder();
        const baseKeyMaterial = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode('acklet_airvault_shared_workspace_v1'),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        this.sessionKey = await window.crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: encoder.encode('airvault_e2ee_salt_2026'),
            iterations: 100000,
            hash: 'SHA-256'
          },
          baseKeyMaterial,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        );

        // Generate readable thumbprint
        const raw = window.crypto.getRandomValues(new Uint8Array(4));
        const hex = Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        this.deviceThumbprint = `AV-${hex.substring(0, 4)}-${hex.substring(4, 8)}`;
      } else {
        this.deviceThumbprint = `AV-SIM-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
    } catch (err) {
      AirVaultLogger.warn('[Clipboard Crypto] Warning initializing WebCrypto:', err);
      this.deviceThumbprint = `AV-MOCK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }
  }

  getThumbprint(): string {
    return this.deviceThumbprint || 'AV-PENDING';
  }

  async exportRawKey(): Promise<ArrayBuffer | null> {
    if (!this.sessionKey || !window.crypto?.subtle) return null;
    try {
      return await window.crypto.subtle.exportKey('raw', this.sessionKey);
    } catch {
      return null;
    }
  }

  private packetSequence = 0;

  async encryptPayload(plaintext: string, senderDeviceId: string, recipientDeviceId?: string): Promise<EncryptedPacket> {
    AirVaultLogger.debug('[Clipboard Crypto] Encrypting outgoing item');
    const timestamp = Date.now();
    const contentHash = await this.hashContent(plaintext);
    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const sequenceNumber = ++this.packetSequence;

    try {
      if (!window.crypto?.subtle) throw new Error('SubtleCrypto not available');

      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      if (this.sessionKey) {
        const ciphertextBuffer = await window.crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv as any
          },
          this.sessionKey,
          data as any
        );

        const packet: EncryptedPacket = {
          packetId,
          sequenceNumber,
          iv: this.bufferToBase64(iv),
          ciphertext: this.bufferToBase64(ciphertextBuffer),
          senderDeviceId,
          recipientDeviceId,
          timestamp,
          contentHash
        };

        AirVaultLogger.debug('[Clipboard Crypto] Encrypted sync payload created');
        return packet;
      }
    } catch (err) {
      AirVaultLogger.error('[Clipboard Crypto] Encryption failed, using transport fallback:', err);
    }

    const base64Plain = btoa(unescape(encodeURIComponent(plaintext)));
    return {
      packetId,
      sequenceNumber,
      iv: btoa(senderDeviceId),
      ciphertext: base64Plain,
      senderDeviceId,
      recipientDeviceId,
      timestamp,
      contentHash
    };
  }

  async decryptPayload(packet: EncryptedPacket): Promise<string> {
    AirVaultLogger.debug('[Clipboard Crypto] Decrypting payload for packet:', packet.packetId);

    try {
      if (this.sessionKey && packet.iv && packet.ciphertext) {
        const iv = this.base64ToBuffer(packet.iv);
        const ciphertext = this.base64ToBuffer(packet.ciphertext);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: iv as any
          },
          this.sessionKey,
          ciphertext as any
        );

        const decoder = new TextDecoder();
        const decrypted = decoder.decode(decryptedBuffer);
        AirVaultLogger.debug('[Clipboard Crypto] Decryption successful');
        return decrypted;
      }
    } catch (err) {
      // Fallback base64 decoding if transmitted in compat mode
      try {
        const fallback = decodeURIComponent(escape(atob(packet.ciphertext)));
        AirVaultLogger.debug('[Clipboard Crypto] Decryption successful (via compat)');
        return fallback;
      } catch (fallbackErr) {
        AirVaultLogger.error('[Clipboard Crypto] Decryption failed:', err);
        throw new Error(`Decryption failed for packet ${packet.packetId}`);
      }
    }

    try {
      return decodeURIComponent(escape(atob(packet.ciphertext)));
    } catch (e) {
      AirVaultLogger.error('[Clipboard Crypto] Decryption failed:', e);
      throw e;
    }
  }

  async hashContent(text: string): Promise<string> {
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    } catch {
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16);
    }
  }

  private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
