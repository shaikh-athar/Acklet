// client/apps/tool-qr-generator/src/services/qr-dynamic.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CreateDynamicQrPayload,
  DynamicQrAsset,
  DynamicQrCode,
  ManagedDynamicQrItem,
  QrPublicInfoDto,
  QrScanAnalytics,
  UpdateDynamicQrPayload
} from '../models/qr-generator.models';
import { getQrApiUrl } from './qr-api.util';

const MANAGED_STORAGE_KEY = 'acklet_dynamic_qr_managed_v1';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class QrDynamicService {
  private readonly http: HttpClient;

  get apiBase(): string {
    return getQrApiUrl('/api/v1/qr');
  }

  readonly managedItems = signal<ManagedDynamicQrItem[]>([]);
  readonly isCreating = signal<boolean>(false);
  readonly lastCreated = signal<DynamicQrCode | null>(null);
  readonly activeAnalytics = signal<QrScanAnalytics | null>(null);
  readonly error = signal<string | null>(null);

  constructor(http?: HttpClient) {
    this.http = http ?? inject(HttpClient);
    this.loadManagedFromStorage();
  }

  private loadManagedFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(MANAGED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.managedItems.set(parsed);
        }
      }
    } catch {
      // Storage parsing failure ignored
    }
  }

  private saveManagedToStorage(items: ManagedDynamicQrItem[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(MANAGED_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota exceeded ignored
    }
  }

  /**
   * Creates a new hosted dynamic QR code on the Spring Boot backend.
   */
  async createDynamicQr(payload: CreateDynamicQrPayload): Promise<DynamicQrCode> {
    this.isCreating.set(true);
    this.error.set(null);

    try {
      const res = await firstValueFrom(
        this.http.post<ApiResponse<DynamicQrCode>>(`${this.apiBase}/create`, payload)
      );

      const created = res.data;
      this.lastCreated.set(created);

      if (created.manageKey) {
        const managedItem: ManagedDynamicQrItem = {
          code: created.code,
          manageKey: created.manageKey,
          title: created.title || `Dynamic QR ${created.code}`,
          type: created.type,
          shortUrl: created.shortUrl,
          targetUrl: created.targetUrl,
          status: created.status,
          scanCount: created.scanCount || 0,
          createdAt: Date.now()
        };

        const updated = [managedItem, ...this.managedItems().filter(i => i.code !== created.code)];
        this.managedItems.set(updated);
        this.saveManagedToStorage(updated);
      }

      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create dynamic QR code';
      this.error.set(msg);
      throw err;
    } finally {
      this.isCreating.set(false);
    }
  }

  /**
   * Retrieves full details for a dynamic QR code using its private manage key.
   */
  async getManagedDetails(manageKey: string): Promise<DynamicQrCode> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<DynamicQrCode>>(`${this.apiBase}/manage/${manageKey}`)
    );
    const data = res.data;

    // Update local cached metrics
    const current = this.managedItems();
    const index = current.findIndex(i => i.manageKey === manageKey);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        scanCount: data.scanCount,
        status: data.status,
        title: data.title,
        targetUrl: data.targetUrl
      };
      this.managedItems.set(updated);
      this.saveManagedToStorage(updated);
    }

    return data;
  }

  /**
   * Updates an existing dynamic QR's target URL, title, or settings without re-printing the QR code.
   */
  async updateDynamicQr(manageKey: string, payload: UpdateDynamicQrPayload): Promise<DynamicQrCode> {
    const res = await firstValueFrom(
      this.http.put<ApiResponse<DynamicQrCode>>(`${this.apiBase}/manage/${manageKey}`, payload)
    );
    const data = res.data;

    const current = this.managedItems();
    const index = current.findIndex(i => i.manageKey === manageKey);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        title: data.title,
        targetUrl: data.targetUrl,
        status: data.status
      };
      this.managedItems.set(updated);
      this.saveManagedToStorage(updated);
    }

    return data;
  }

  /**
   * Toggles pause / resume status for a dynamic QR code.
   */
  async toggleStatus(manageKey: string, currentStatus: string): Promise<DynamicQrCode> {
    const isPaused = currentStatus === 'PAUSED';
    const endpoint = isPaused ? 'resume' : 'pause';

    const res = await firstValueFrom(
      this.http.post<ApiResponse<DynamicQrCode>>(`${this.apiBase}/manage/${manageKey}/${endpoint}`, {})
    );
    const data = res.data;

    const current = this.managedItems();
    const index = current.findIndex(i => i.manageKey === manageKey);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        status: data.status
      };
      this.managedItems.set(updated);
      this.saveManagedToStorage(updated);
    }

    return data;
  }

  /**
   * Loads privacy-preserving scan telemetry for a dynamic QR code.
   */
  async loadAnalytics(manageKey: string): Promise<QrScanAnalytics> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<QrScanAnalytics>>(`${this.apiBase}/manage/${manageKey}/analytics`)
    );
    this.activeAnalytics.set(res.data);
    return res.data;
  }

  /**
   * Uploads an asset (PDF, image, menu) to a dynamic QR code using its private manage key.
   */
  async uploadAsset(manageKey: string, file: File): Promise<DynamicQrAsset> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await firstValueFrom(
      this.http.post<ApiResponse<DynamicQrAsset>>(`${this.apiBase}/manage/${manageKey}/upload-asset`, formData)
    );
    return res.data;
  }

  /**
   * Retrieves public metadata and content for rendering landing page viewers.
   */
  async getPublicInfo(code: string): Promise<QrPublicInfoDto> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<QrPublicInfoDto>>(`${this.apiBase}/public/${code}`)
    );
    return res.data;
  }

  /**
   * Unlocks a password-protected dynamic QR code and returns its full destination / content.
   */
  async verifyPassword(code: string, password: string): Promise<QrPublicInfoDto> {
    const res = await firstValueFrom(
      this.http.post<ApiResponse<QrPublicInfoDto>>(`${this.apiBase}/public/${code}/verify-password`, { password })
    );
    return res.data;
  }

  /**
   * Imports an existing manage key into local storage.
   */
  async importManageKey(manageKey: string): Promise<DynamicQrCode> {
    const details = await this.getManagedDetails(manageKey.trim());
    const managedItem: ManagedDynamicQrItem = {
      code: details.code,
      manageKey: manageKey.trim(),
      title: details.title || `Dynamic QR ${details.code}`,
      type: details.type,
      shortUrl: details.shortUrl,
      targetUrl: details.targetUrl,
      status: details.status,
      scanCount: details.scanCount,
      createdAt: Date.now()
    };

    const updated = [managedItem, ...this.managedItems().filter(i => i.code !== details.code)];
    this.managedItems.set(updated);
    this.saveManagedToStorage(updated);
    return details;
  }

  /**
   * Removes a manage key from local storage (does not delete the backend record).
   */
  removeManagedItem(manageKey: string): void {
    const updated = this.managedItems().filter(i => i.manageKey !== manageKey);
    this.managedItems.set(updated);
    this.saveManagedToStorage(updated);
  }
}
