import { Injectable, inject, OnDestroy } from '@angular/core';
import { AirVaultStorageService, AirVaultItem } from './airvault-storage.service';
import { AirVaultPreferencesService } from './airvault-preferences.service';
import { COLLAPSE_WORD_THRESHOLD } from './airvault-clipboard.service';
import { AirVaultLogger } from './airvault-sync-debug.service';

@Injectable({
  providedIn: 'root'
})
export class AirVaultCollapseService implements OnDestroy {
  private storageService = inject(AirVaultStorageService);
  private preferencesService = inject(AirVaultPreferencesService);

  /** Active timers keyed by item ID */
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Schedule auto-collapse for a newly added item if it qualifies */
  scheduleCollapse(item: AirVaultItem) {
    const content = item.content;

    // Only schedule collapse for text, code, and json categories
    if (!['text', 'code', 'json'].includes(content.category)) return;

    // Check if content exceeds 1,500 word threshold
    const wordCount = content.raw.trim().split(/\s+/).filter(Boolean).length;
    const wordOver = wordCount >= COLLAPSE_WORD_THRESHOLD;

    // Below 1,500 words stays expanded in staging
    if (!wordOver) {
      this.storageService.setCollapseState(item.id, 'expanded');
      return;
    }

    // Cancel existing timer for this item (if re-beamed/re-pasted)
    this.cancelTimer(item.id);

    const delayMs = this.preferencesService.prefs().collapseDelayMs ?? 1000;

    AirVaultLogger.debug(`[AirHold Collapse] ⏱ Scheduling auto-collapse for item "${item.id}" (${content.raw.length} chars) in ${delayMs}ms`);

    const timer = setTimeout(() => {
      AirVaultLogger.debug(`[AirHold Collapse] 📦 Auto-collapsing item "${item.id}"`);
      this.storageService.setCollapseState(item.id, 'collapsed');
      this.timers.delete(item.id);
    }, delayMs);

    this.timers.set(item.id, timer);
  }

  /** Expand a collapsed block */
  expand(itemId: string) {
    this.cancelTimer(itemId);
    this.storageService.setCollapseState(itemId, 'expanded');
  }

  /** Manually collapse an expanded block */
  collapse(itemId: string) {
    this.cancelTimer(itemId);
    this.storageService.setCollapseState(itemId, 'collapsed');
  }

  /** Toggle between expanded and collapsed */
  toggle(item: AirVaultItem) {
    const current = item.content.collapseState;
    if (current === 'collapsed') {
      this.expand(item.id);
    } else {
      this.collapse(item.id);
    }
  }

  private cancelTimer(itemId: string) {
    const existing = this.timers.get(itemId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(itemId);
    }
  }

  ngOnDestroy() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}
