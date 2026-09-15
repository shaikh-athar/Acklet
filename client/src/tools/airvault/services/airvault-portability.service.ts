import { Injectable, inject } from '@angular/core';
import { AirVaultStorageService, AirVaultItem } from './airvault-storage.service';
import { AirVaultDeviceService } from './airvault-device.service';

export interface AirVaultBackupSchema {
  version: string;
  application: string;
  username: string;
  exportedAt: number;
  totalItems: number;
  items: AirVaultItem[];
  auditLogs?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultPortabilityService {
  private storage = inject(AirVaultStorageService);
  private deviceService = inject(AirVaultDeviceService);

  exportVault(onlyPinned: boolean = false, customUsername?: string): string {
    let items = this.storage.allItems(); // Export all items (active and history)
    if (onlyPinned) {
      items = items.filter(i => i.isPinned);
    }

    const cur = this.deviceService.currentDevice();
    const uname = (customUsername || cur.username || cur.name || 'user')
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const payload: AirVaultBackupSchema = {
      version: '2.0.0',
      application: 'AirVault by Acklet',
      username: uname,
      exportedAt: Date.now(),
      totalItems: items.length,
      items: items.map(it => ({
        ...it,
        content: {
          ...it.content,
          raw: it.content?.raw || ''
        }
      })),
      auditLogs: this.storage.auditLogs()
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `${uname}_airvault_${dateStr}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    return jsonStr;
  }

  async importVault(file: File): Promise<{ success: boolean; importedCount: number; message: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || (!Array.isArray(data.items) && !Array.isArray(data))) {
        return { success: false, importedCount: 0, message: 'Invalid backup file schema: missing items array.' };
      }

      const itemsToImport: any[] = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
      let imported = 0;

      for (const rawItem of itemsToImport) {
        if (!rawItem) continue;

        // Ensure content object structure is preserved even for plain text / string exports
        let contentObj = rawItem.content;
        if (!contentObj) {
          contentObj = {
            category: rawItem.category || 'text',
            raw: rawItem.raw || rawItem.text || rawItem.snippet || '',
            byteSize: rawItem.byteSize || (rawItem.raw?.length || 0),
            isSensitive: !!rawItem.isSensitive,
            filename: rawItem.filename
          };
        }

        const item: AirVaultItem = {
          id: rawItem.id || 'imported-' + Math.random().toString(36).substring(2, 9),
          senderDeviceId: rawItem.senderDeviceId || 'imported-device',
          senderDeviceName: rawItem.senderDeviceName || (data.username ? `@${data.username}` : 'Imported Vault'),
          senderDeviceAccent: rawItem.senderDeviceAccent || '#2196F3',
          content: {
            category: contentObj.category || 'text',
            raw: contentObj.raw || '',
            language: contentObj.language,
            isSensitive: !!contentObj.isSensitive,
            sensitiveType: contentObj.sensitiveType,
            maskedSnippet: contentObj.maskedSnippet,
            previewUrl: contentObj.previewUrl,
            filename: contentObj.filename,
            byteSize: contentObj.byteSize !== undefined ? contentObj.byteSize : (contentObj.raw?.length || 0),
            collapseState: contentObj.collapseState || 'collapsed',
            lineBlameMap: contentObj.lineBlameMap
          },
          timestamp: rawItem.timestamp || Date.now(),
          isPinned: !!rawItem.isPinned,
          deliveryStatus: 'delivered',
          processingState: 'done'
        };

        this.storage.addItem(item);
        imported++;
      }

      // If backup includes audit logs, restore them into storage
      if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
        for (const log of data.auditLogs) {
          if (log && log.id) {
            this.storage.recordAudit(log);
          }
        }
      }

      return {
        success: true,
        importedCount: imported,
        message: `Successfully restored ${imported} items into your vault.`
      };
    } catch (err: any) {
      return { success: false, importedCount: 0, message: 'JSON parsing error: ' + (err.message || 'Corrupted file') };
    }
  }
}
