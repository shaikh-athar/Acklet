import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AirVaultUIStore {
  // Sidebar state
  readonly rightSidebarCollapsed = signal<boolean>(false);

  // Modal / Drawer states
  readonly showPairingModal = signal<boolean>(false);
  readonly showIdentityOnboardingModal = signal<boolean>(false);
  readonly identityOnboardingInitialView = signal<'choose' | 'login'>('choose');
  readonly showIdentityMergeModal = signal<boolean>(false);
  readonly pendingLoginIdentity = signal<{ username: string; pin: string } | null>(null);
  readonly showDeviceDrawer = signal<boolean>(false);
  readonly showPrivacyModal = signal<boolean>(false);
  readonly showSettingsDrawer = signal<boolean>(false);
  readonly showEraseModal = signal<boolean>(false);
  readonly showHistoryModal = signal<boolean>(false);
  readonly showTipsModal = signal<boolean>(false);
  readonly showFeedbackModal = signal<boolean>(false);
  readonly showDeleteConfirmModal = signal<boolean>(false);
  readonly deleteConfirmModalItem = signal<any | null>(null);
  readonly showClearActiveModal = signal<boolean>(false);

  // Multi-select Filter criteria signals
  readonly activeCategoryFilters = signal<string[]>([]); // ['text', 'code', 'json', ...]
  readonly activeTimeFilters = signal<string[]>([]);     // ['today', '7d', '30d']
  readonly activeSenderFilters = signal<string[]>([]);   // ['self', deviceId1, ...]
  readonly activeSizeFilters = signal<string[]>([]);     // ['small', 'medium', 'large']
  readonly activePinnedOnly = signal<boolean>(false);
  readonly activeSensitiveOnly = signal<boolean>(false);

  // Sync Confirmation & Progress Modal
  readonly showSyncModal = signal<boolean>(false);
  readonly syncModalDevice = signal<any | null>(null);
  readonly syncModalProgress = signal<{
    status: 'connecting' | 'authenticating' | 'syncing' | 'synced' | 'error';
    syncedCount: number;
    totalCount: number;
    errorMessage?: string;
  }>({
    status: 'connecting',
    syncedCount: 0,
    totalCount: 0
  });

  // Big screen content preview modal
  readonly previewModalItem = signal<any | null>(null);
  readonly searchHighlightQuery = signal<string>('');
  readonly showSearchHighlights = signal<boolean>(false);
  readonly showAttributionHighlights = signal<boolean>(false);
  readonly activeMatchIndex = signal<number>(0);
  readonly totalMatchesCount = signal<number>(0);

  setSearchHighlightQuery(query: string) {
    this.searchHighlightQuery.set(query ? query.trim() : '');
    this.activeMatchIndex.set(0);
  }

  toggleSearchHighlights() {
    this.showSearchHighlights.update(v => !v);
  }

  setShowSearchHighlights(show: boolean) {
    this.showSearchHighlights.set(show);
  }

  toggleAttributionHighlights() {
    this.showAttributionHighlights.update(v => !v);
  }

  setShowAttributionHighlights(show: boolean) {
    this.showAttributionHighlights.set(show);
  }

  clearSearchHighlightQuery() {
    this.searchHighlightQuery.set('');
    this.activeMatchIndex.set(0);
    this.totalMatchesCount.set(0);
  }

  setActiveMatchIndex(idx: number) {
    this.activeMatchIndex.set(idx);
  }

  setTotalMatchesCount(count: number) {
    this.totalMatchesCount.set(count);
  }

  nextMatch() {
    const total = this.totalMatchesCount();
    if (total <= 1) return;
    this.activeMatchIndex.update(cur => (cur + 1) % total);
  }

  prevMatch() {
    const total = this.totalMatchesCount();
    if (total <= 1) return;
    this.activeMatchIndex.update(cur => (cur - 1 + total) % total);
  }

  openPreview(item: any, highlightQuery?: string) {
    if (highlightQuery !== undefined) {
      this.searchHighlightQuery.set(highlightQuery.trim());
      this.activeMatchIndex.set(0);
    }
    this.previewModalItem.set(item);
  }

  closePreview() {
    this.previewModalItem.set(null);
  }

  openDeleteConfirm(item: any) {
    this.deleteConfirmModalItem.set(item);
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirm() {
    this.deleteConfirmModalItem.set(null);
    this.showDeleteConfirmModal.set(false);
  }

  // Toast notification state
  readonly toastMessage = signal<string | null>(null);
  private toastTimer: any = null;

  // Disconnected Source Notification banner/modal state
  readonly disconnectedSourceNotification = signal<{
    sourceDeviceId: string;
    sourceDeviceName: string;
    sourceDeviceUsername?: string;
    sourceDeviceType?: string;
    sourceDeviceAccent?: string;
    itemSnippet?: string;
    itemCategory?: string;
    timestamp: number;
  } | null>(null);

  toggleRightSidebar() {
    this.rightSidebarCollapsed.update(v => !v);
  }

  setRightSidebar(collapsed: boolean) {
    this.rightSidebarCollapsed.set(collapsed);
  }

  triggerToast(msg: string) {
    this.toastMessage.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 2800);
  }

  // ─── Centralized network-offline state ─────────────────────────────────────
  // One flag tracks whether we're currently in an "offline" episode.
  // Only ONE toast fires per episode; repeat failures are silently swallowed.
  // A recovery toast fires exactly once when connectivity returns.
  readonly networkOffline = signal<boolean>(false);
  private networkOfflineToastCooldown: any = null;
  private readonly OFFLINE_TOAST_COOLDOWN_MS = 30_000;

  /**
   * Call on any network failure (fetch/HTTP error).
   * Shows at most one "unreachable" toast per 30-second window.
   */
  reportNetworkError() {
    if (this.networkOffline()) return; // Already in offline episode — stay silent
    this.networkOffline.set(true);
    this.triggerToast('⚠️ Network unreachable — retrying…');
    // Allow re-toast after cooldown if still offline (e.g. extended outage)
    if (this.networkOfflineToastCooldown) clearTimeout(this.networkOfflineToastCooldown);
    this.networkOfflineToastCooldown = setTimeout(() => {
      // Reset flag only if STILL offline so the next failure re-arms the toast
      if (this.networkOffline()) this.networkOffline.set(false);
    }, this.OFFLINE_TOAST_COOLDOWN_MS);
  }

  /**
   * Call on any network success.
   * Clears the offline flag and shows a recovery toast (only if we were offline).
   */
  reportNetworkRecovery() {
    if (!this.networkOffline()) return; // Was already online — nothing to do
    this.networkOffline.set(false);
    if (this.networkOfflineToastCooldown) {
      clearTimeout(this.networkOfflineToastCooldown);
      this.networkOfflineToastCooldown = null;
    }
    this.triggerToast('✓ Connection restored');
  }
  // ───────────────────────────────────────────────────────────────────────────

  showDisconnectedSourceAlert(notification: {
    sourceDeviceId: string;
    sourceDeviceName: string;
    sourceDeviceUsername?: string;
    sourceDeviceType?: string;
    sourceDeviceAccent?: string;
    itemSnippet?: string;
    itemCategory?: string;
    timestamp: number;
  }) {
    this.disconnectedSourceNotification.set(notification);
  }

  dismissDisconnectedSourceAlert() {
    this.disconnectedSourceNotification.set(null);
  }

  activeFiltersCount() {
    let count = 0;
    count += this.activeCategoryFilters().length;
    count += this.activeTimeFilters().length;
    count += this.activeSenderFilters().length;
    count += this.activeSizeFilters().length;
    if (this.activePinnedOnly()) count++;
    if (this.activeSensitiveOnly()) count++;
    return count;
  }

  resetAllFilters() {
    this.activeCategoryFilters.set([]);
    this.activeTimeFilters.set([]);
    this.activeSenderFilters.set([]);
    this.activeSizeFilters.set([]);
    this.activePinnedOnly.set(false);
    this.activeSensitiveOnly.set(false);
  }

  closeAllModals() {
    this.showPairingModal.set(false);
    this.showDeviceDrawer.set(false);
    this.showPrivacyModal.set(false);
    this.showSettingsDrawer.set(false);
    this.showTipsModal.set(false);
    this.showFeedbackModal.set(false);
    this.showClearActiveModal.set(false);
    this.disconnectedSourceNotification.set(null);
  }
}
