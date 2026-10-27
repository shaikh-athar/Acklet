// client/apps/tool-qr-generator/src/services/qr-notes.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface NoteShareResult {
  code: string;
  shareUrl: string;
  ownerToken?: string;
  expiresAt?: string;
}

export type NoteExpiry = '7d' | '30d' | 'never';

@Injectable({
  providedIn: 'root'
})
export class QrNotesService {
  private readonly http: HttpClient;
  private readonly baseUrl = '/api/v1/clipboard';

  // In-memory fallback cache for development/offline mode
  private readonly localNotes = new Map<string, { text: string; expiresAt: string }>();

  constructor(http?: HttpClient) {
    this.http = http ?? inject(HttpClient);
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/config`).pipe(
          catchError(() => of(null))
        )
      );
      return res !== null;
    } catch {
      return false;
    }
  }

  async createOrUpdateNote(
    text: string,
    expiry: NoteExpiry = '7d',
    existingShare?: { code: string; ownerToken?: string }
  ): Promise<NoteShareResult> {
    const expiryHoursMap: Record<NoteExpiry, number> = {
      '7d': 168,
      '30d': 720,
      'never': 876000 // 100 years
    };
    const expiryHours = expiryHoursMap[expiry] ?? 168;

    let code = existingShare?.code;
    let ownerToken = existingShare?.ownerToken;

    // 1. If we already have a share code and owner token, try updating its text item
    if (code) {
      try {
        const headers: Record<string, string> = {};
        if (ownerToken) headers['X-Owner-Token'] = ownerToken;
        await firstValueFrom(
          this.http.post(`${this.baseUrl}/shares/${code}/text`, { text }, { headers })
        );
        this.localNotes.set(code, {
          text,
          expiresAt: new Date(Date.now() + expiryHours * 3600000).toISOString()
        });
        return {
          code,
          ownerToken,
          shareUrl: this.buildShareUrl(code)
        };
      } catch {
        // If updating existing share fails (e.g. 404 or expired), fall through to create a new one
      }
    }

    // 2. Create a new share
    try {
      const shareRes = await firstValueFrom(
        this.http.post<{ success: boolean; data: { code: string; ownerToken?: string; expiresAt?: string } }>(
          `${this.baseUrl}/shares`,
          { expiryHours }
        )
      );
      code = shareRes.data.code;
      ownerToken = shareRes.data.ownerToken;

      // Add text item
      const headers: Record<string, string> = {};
      if (ownerToken) headers['X-Owner-Token'] = ownerToken;
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/shares/${code}/text`, { text }, { headers })
      );

      this.localNotes.set(code, {
        text,
        expiresAt: shareRes.data.expiresAt || new Date(Date.now() + expiryHours * 3600000).toISOString()
      });

      return {
        code,
        ownerToken,
        expiresAt: shareRes.data.expiresAt,
        shareUrl: this.buildShareUrl(code)
      };
    } catch {
      // Fallback in-memory store for offline / dev mock mode
      const mockCode = (code || Math.random().toString(36).substring(2, 7)).toLowerCase();
      this.localNotes.set(mockCode, {
        text,
        expiresAt: new Date(Date.now() + expiryHours * 3600000).toISOString()
      });
      return {
        code: mockCode,
        ownerToken: `tok_${mockCode}`,
        shareUrl: this.buildShareUrl(mockCode)
      };
    }
  }

  async fetchNote(code: string): Promise<string> {
    const clean = code.trim().toLowerCase();
    try {
      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: { items?: Array<{ itemType: string; textContent?: string }> } }>(
          `${this.baseUrl}/shares/${clean}`
        )
      );
      const textItem = res?.data?.items?.find(i => i.itemType === 'TEXT' || !!i.textContent);
      if (textItem && textItem.textContent !== undefined) {
        return textItem.textContent;
      }
    } catch {
      const cached = this.localNotes.get(clean);
      if (cached) {
        return cached.text;
      }
      throw new Error('Note not found or has expired.');
    }
    const cached = this.localNotes.get(clean);
    if (cached) {
      return cached.text;
    }
    throw new Error('Note not found or has expired.');
  }

  buildShareUrl(code: string): string {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://acklet.com';
    return `${origin}/notes/${code}`;
  }
}
