import { Injectable, inject } from '@angular/core';
import { AirVaultStorageService, AirVaultItem, AirVaultAuditEntry } from './airvault-storage.service';
import { AirVaultDeviceService } from './airvault-device.service';
import { AirVaultUIStore } from './airvault-ui.store';

export type DuplicateStrategy = 'skip' | 'overwrite' | 'keep_both';

export interface AirVaultExportSchema {
  schemaVersion: number;
  version: string;
  application: string;
  exportedAt: number;
  exportedBy: {
    username: string;
    deviceId: string;
    deviceName: string;
  };
  itemCount: number;
  items: AirVaultItem[];
  auditLogs?: AirVaultAuditEntry[];
}

export interface BackupValidationInspection {
  valid: boolean;
  error?: string;
  schemaVersion?: number;
  exportedAt?: number;
  exportedBy?: string;
  totalItems: number;
  duplicateCount: number;
  newCount: number;
  parsedData?: AirVaultExportSchema;
}

export interface ImportResult {
  success: boolean;
  totalProcessed: number;
  importedCount: number;
  skippedCount: number;
  overwrittenCount: number;
  createdCount: number;
  message: string;
}

export const CURRENT_SCHEMA_VERSION = 1;

@Injectable({
  providedIn: 'root'
})
export class AirVaultPortabilityService {
  private storage = inject(AirVaultStorageService);
  private deviceService = inject(AirVaultDeviceService);
  private uiStore = inject(AirVaultUIStore);

  /**
   * Serializes the user's entire clipboard data (all items, metadata, timestamps)
   * into a standardized JSON file with schemaVersion and triggers browser download.
   */
  exportVault(onlyPinned: boolean = false, customUsername?: string): string {
    let items = this.storage.allItems(); // Export all items (active and history)
    if (onlyPinned) {
      items = items.filter(i => i.isPinned);
    }

    const cur = this.deviceService.currentDevice();
    const uname = (customUsername || cur.username || cur.name || 'user')
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const payload: AirVaultExportSchema = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      version: '1.0.0',
      application: 'AirVault by Acklet',
      exportedAt: Date.now(),
      exportedBy: {
        username: uname,
        deviceId: cur.id || 'local-device',
        deviceName: cur.name || uname
      },
      itemCount: items.length,
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

    this.uiStore.triggerToast(`📦 Exported ${items.length} items to ${a.download}`);
    return jsonStr;
  }

  /**
   * Pre-inspects and validates an uploaded backup file.
   * Performs schema validation, version checks, and calculates duplicate count vs current target account.
   */
  async inspectBackupFile(file: File): Promise<BackupValidationInspection> {
    try {
      const text = await file.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (jsonErr: any) {
        return {
          valid: false,
          error: `Malformed JSON: The file is not valid JSON (${jsonErr.message || 'SyntaxError'}).`,
          totalItems: 0,
          duplicateCount: 0,
          newCount: 0
        };
      }

      if (!data || typeof data !== 'object') {
        return {
          valid: false,
          error: 'Invalid backup file: Top-level JSON payload is not an object.',
          totalItems: 0,
          duplicateCount: 0,
          newCount: 0
        };
      }

      // Check schema version compatibility (handles schemaVersion number or legacy version string)
      const schemaVer = typeof data.schemaVersion === 'number'
        ? data.schemaVersion
        : (data.version?.startsWith('2.') ? 2 : (data.version?.startsWith('1.') ? 1 : 1));

      if (schemaVer > CURRENT_SCHEMA_VERSION + 1) {
        return {
          valid: false,
          error: `Incompatible backup version (schema v${schemaVer}). This AirVault client supports up to schema v${CURRENT_SCHEMA_VERSION}.`,
          totalItems: 0,
          duplicateCount: 0,
          newCount: 0
        };
      }

      // Extract items array (handles standard data.items or raw array backup)
      const rawItems: any[] = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return {
          valid: false,
          error: 'The backup file contains no clipboard items to import.',
          totalItems: 0,
          duplicateCount: 0,
          newCount: 0
        };
      }

      // Compare against current existing items to compute duplicates vs new items
      const existingItems = this.storage.allItems();
      let duplicates = 0;
      let newItems = 0;

      for (const item of rawItems) {
        if (!item) continue;
        if (this.isDuplicateMatch(item, existingItems)) {
          duplicates++;
        } else {
          newItems++;
        }
      }

      const exportedByStr = data.exportedBy?.username || data.username || 'Unknown user';

      return {
        valid: true,
        schemaVersion: schemaVer,
        exportedAt: data.exportedAt || (rawItems[0]?.timestamp || Date.now()),
        exportedBy: exportedByStr,
        totalItems: rawItems.length,
        duplicateCount: duplicates,
        newCount: newItems,
        parsedData: {
          schemaVersion: schemaVer,
          version: data.version || '1.0.0',
          application: data.application || 'AirVault by Acklet',
          exportedAt: data.exportedAt || Date.now(),
          exportedBy: {
            username: exportedByStr,
            deviceId: data.exportedBy?.deviceId || data.senderDeviceId || 'imported-device',
            deviceName: data.exportedBy?.deviceName || data.senderDeviceName || exportedByStr
          },
          itemCount: rawItems.length,
          items: rawItems,
          auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs : undefined
        }
      };
    } catch (err: any) {
      return {
        valid: false,
        error: `Failed to inspect backup file: ${err.message || 'Unknown error'}`,
        totalItems: 0,
        duplicateCount: 0,
        newCount: 0
      };
    }
  }

  /**
   * Merges inspected backup data into the importing user's account with the selected duplicate strategy.
   * Ensures all imported data properly lands in the importing user's account.
   */
  async executeImport(
    parsedData: AirVaultExportSchema,
    strategy: DuplicateStrategy = 'skip'
  ): Promise<ImportResult> {
    try {
      const curDev = this.deviceService.currentDevice();
      const curUsername = (curDev.username || curDev.name || 'user').replace(/^@/, '');
      const all = [...this.storage.allItems()];

      let importedCount = 0;
      let skippedCount = 0;
      let overwrittenCount = 0;
      let createdCount = 0;

      for (const rawItem of (parsedData.items as any[])) {
        if (!rawItem) continue;

        // Ensure robust content structure is preserved
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

        const normalizedItem: AirVaultItem = {
          id: rawItem.id || ('item-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8)),
          originDeviceId: curDev.id,
          originOwnerId: curUsername,
          senderDeviceId: curDev.id,
          senderDeviceName: curDev.name || curDev.username || `@${curUsername}`,
          senderDeviceAccent: curDev.accentColor || rawItem.senderDeviceAccent || '#2196F3',
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
            lineBlameMap: contentObj.lineBlameMap,
            dedupKey: contentObj.dedupKey
          },
          timestamp: rawItem.timestamp || Date.now(),
          isPinned: !!rawItem.isPinned,
          deliveryStatus: 'delivered',
          processingState: 'done',
          isDeletedFromActive: false,
          isDeletedLocally: false,
          batchId: rawItem.batchId,
          isBatchParent: rawItem.isBatchParent,
          batchFiles: rawItem.batchFiles,
          batchTotalCount: rawItem.batchTotalCount,
          batchCompletedCount: rawItem.batchCompletedCount,
          batchTotalBytes: rawItem.batchTotalBytes
        };

        // Match against existing items in target user's account
        const existingIdx = all.findIndex(e => this.isItemsMatching(e, normalizedItem));

        if (existingIdx !== -1) {
          // Duplicate detected
          if (strategy === 'skip') {
            skippedCount++;
            continue;
          } else if (strategy === 'overwrite') {
            // Overwrite existing item in place
            all[existingIdx] = {
              ...normalizedItem,
              id: all[existingIdx].id, // Keep existing ID for stability
              timestamp: normalizedItem.timestamp
            };
            overwrittenCount++;
            importedCount++;
          } else if (strategy === 'keep_both') {
            // Keep both: assign a brand-new unique ID
            const freshItem = {
              ...normalizedItem,
              id: 'imported-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8)
            };
            all.unshift(freshItem);
            createdCount++;
            importedCount++;
          }
        } else {
          // New item: insert into vault
          all.unshift(normalizedItem);
          createdCount++;
          importedCount++;
        }
      }

      // Restore audit logs if included
      if (Array.isArray(parsedData.auditLogs) && parsedData.auditLogs.length > 0) {
        for (const log of parsedData.auditLogs) {
          if (log && log.id) {
            this.storage.recordAudit(log);
          }
        }
      }

      // Persist all changes atomically
      this.storage.allItems.set(all);
      this.storage.persistAll();

      // Record import audit record
      this.storage.recordAudit({
        id: 'audit-import-' + Date.now(),
        action: 'created',
        itemId: 'import-backup',
        itemCategory: 'backup',
        itemSnippet: `Imported ${importedCount} items from backup (${strategy} strategy: ${skippedCount} skipped, ${overwrittenCount} overwritten)`,
        deviceId: curDev.id,
        deviceName: curDev.name || curDev.username || 'Local Device',
        timestamp: Date.now()
      });

      const message = `Successfully merged ${importedCount} items (${skippedCount} skipped, ${overwrittenCount} overwritten, ${createdCount} created).`;
      this.uiStore.triggerToast(`✅ ${message}`);

      return {
        success: true,
        totalProcessed: parsedData.items.length,
        importedCount,
        skippedCount,
        overwrittenCount,
        createdCount,
        message
      };
    } catch (err: any) {
      const friendlyMsg = this.uiStore.reportOperationError('import', err, '❌');
      return {
        success: false,
        totalProcessed: parsedData.items.length,
        importedCount: 0,
        skippedCount: 0,
        overwrittenCount: 0,
        createdCount: 0,
        message: friendlyMsg
      };
    }
  }

  /**
   * Fast duplicate check between a single imported item and existing items.
   */
  private isDuplicateMatch(item: any, existingItems: AirVaultItem[]): boolean {
    return existingItems.some(existing => this.isItemsMatching(existing, item));
  }

  /**
   * Checks whether two items represent the same clipboard entry.
   * Matches by ID or semantic content key (category + raw text / filename + size).
   */
  private isItemsMatching(a: AirVaultItem, b: any): boolean {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;

    const aContent = a.content;
    const bContent = b.content || b;

    if (!aContent || !bContent) return false;

    // 1. Semantic dedupKey match
    if (aContent.dedupKey && bContent.dedupKey && aContent.dedupKey === bContent.dedupKey) {
      return true;
    }

    if (aContent.category !== bContent.category) return false;

    // 2. Text / Code / JSON / Markdown / URL content match
    if (['text', 'code', 'json', 'url', 'markdown'].includes(aContent.category)) {
      const rawA = (aContent.raw || '').trim();
      const rawB = (bContent.raw || '').trim();
      return rawA.length > 0 && rawA === rawB;
    }

    // 3. Binary / Image / File / Media match by filename and byteSize
    if (aContent.filename && bContent.filename && aContent.filename === bContent.filename) {
      if (aContent.byteSize !== undefined && bContent.byteSize !== undefined) {
        return aContent.byteSize === bContent.byteSize;
      }
      return true;
    }

    // 4. Raw Base64 / Blob matching if available
    if (aContent.raw && bContent.raw && aContent.raw.length > 30 && aContent.raw === bContent.raw) {
      return true;
    }

    return false;
  }
}
