// apps/tool-temp-email/src/services/temp-email.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { createToolLogger } from '@acklet/shared';
import { TempEmailApiService } from './temp-email-api.service';
import { TempEmailStorageService } from './temp-email-storage.service';
import { TempEmailOtpService } from './temp-email-otp.service';
import {
  MailAccount,
  MailDomain,
  MessageSummary,
  MessageDetail,
  AutoRefreshInterval,
  InboxFilter,
  EmailScanResults,
  ProviderStatus,
  LinkPreviewData
} from '../models/temp-email.models';

const log = createToolLogger('TempEmail');

const SYNC_CHANNEL_NAME = 'acklet_temp_email_sync';

interface SyncMessage {
  type: 'HEARTBEAT' | 'SYNC_STATE' | 'NEW_MESSAGES' | 'WIPE_ALL';
  tabId: string;
  activeAccountId?: string | null;
  accounts?: MailAccount[];
  messages?: MessageSummary[];
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TempEmailService {
  private readonly api = inject(TempEmailApiService);
  private readonly storage = inject(TempEmailStorageService);
  private readonly otpService = inject(TempEmailOtpService);

  // Tab Sync & Polling Leader Election
  private readonly tabId = Math.random().toString(36).substring(2, 9);
  private syncChannel: BroadcastChannel | null = null;
  private isLeaderTab = false;
  private lastLeaderHeartbeat = Date.now();
  private leaderCheckHandle: any = null;
  private heartbeatSendHandle: any = null;

  // Audio & Notification References
  private notificationAudio: HTMLAudioElement | null = null;

  // Core Reactive Signals
  readonly activeAccount = signal<MailAccount | null>(null);
  readonly inboxes = signal<MailAccount[]>([]);
  readonly domains = signal<MailDomain[]>([]);
  readonly messages = signal<MessageSummary[]>([]);
  readonly selectedMessage = signal<MessageDetail | null>(null);

  // State Signals
  readonly isLoading = signal<boolean>(false);
  readonly isGeneratingAccount = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly successToast = signal<string | null>(null);
  readonly providerStatus = signal<ProviderStatus | null>(null);
  readonly activeLinkPreview = signal<LinkPreviewData | null>(null);

  // Expiry Signal
  readonly timeUntilExpiry = signal<string>('24h');
  readonly isExpired = signal<boolean>(false);

  // Auto-refresh & Settings Signals
  readonly autoRefreshInterval = signal<AutoRefreshInterval>(10);
  readonly secondsUntilRefresh = signal<number>(10);
  readonly isTabVisible = signal<boolean>(true);
  readonly blockRemoteImages = signal<boolean>(true);

  // Retention & Alert Signals
  readonly soundEnabled = signal<boolean>(true);
  readonly browserAlertsEnabled = signal<boolean>(false);
  readonly notificationPermission = signal<NotificationPermission | 'default'>('default');

  // Filter & Search Signals
  readonly searchQuery = signal<string>('');
  readonly activeFilter = signal<InboxFilter>('all');

  // Timers
  private countdownHandle: any = null;
  private expiryTimerHandle: any = null;
  private toastTimeout: any = null;
  private rateLimitPauseTimeout: any = null;

  // Computed Filter Counts
  readonly allCount = computed(() => this.messages().length);
  readonly unreadCount = computed(() => this.messages().filter(m => !m.seen).length);
  readonly otpCount = computed(() => this.messages().filter(m => !!m.extractedOtp).length);
  readonly linkCount = computed(() => this.messages().filter(m => !!m.hasLinks).length);
  readonly attachmentCount = computed(() => this.messages().filter(m => m.hasAttachments).length);

  readonly filteredMessages = computed(() => {
    const list = this.messages();
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    return list.filter(item => {
      // 1. Text filter
      if (query) {
        const fromMatch = (item.from.name || '').toLowerCase().includes(query) ||
                          (item.from.address || '').toLowerCase().includes(query);
        const subjectMatch = (item.subject || '').toLowerCase().includes(query);
        const introMatch = (item.intro || '').toLowerCase().includes(query);
        const otpMatch = item.extractedOtp?.code.toLowerCase().includes(query);
        if (!fromMatch && !subjectMatch && !introMatch && !otpMatch) return false;
      }

      // 2. Category filter
      if (filter === 'unread' && item.seen) return false;
      if (filter === 'otp' && !item.extractedOtp) return false;
      if (filter === 'links' && !item.hasLinks) return false;
      if (filter === 'attachments' && !item.hasAttachments) return false;

      return true;
    });
  });

  readonly selectedMessageScan = computed<EmailScanResults | null>(() => {
    const msg = this.selectedMessage();
    if (!msg) return null;
    return this.otpService.scanEmail(msg.subject, msg.text, msg.html);
  });

  constructor() {
    this.setupPageVisibilityListener();
    this.initAudioAndNotificationSettings();
    this.initMultiTabSync();
  }

  /**
   * Initializes state on component mount.
   */
  async initialize(): Promise<void> {
    log.info(`Initializing Temporary Email Service (Tab ID=${this.tabId})...`);
    this.autoRefreshInterval.set(this.storage.getRefreshInterval());
    this.blockRemoteImages.set(this.storage.getBlockRemoteImages());
    this.soundEnabled.set(this.storage.getSoundEnabled());
    this.browserAlertsEnabled.set(this.storage.getAlertsEnabled());

    if (typeof Notification !== 'undefined') {
      this.notificationPermission.set(Notification.permission);
    }

    // Load available domains in parallel
    this.fetchDomains();

    // Check saved inboxes
    const saved = this.storage.getSavedAccounts();
    log.debug(`Loaded ${saved.length} saved inboxes from localStorage`);
    this.inboxes.set(saved);

    const activeId = this.storage.getActiveAccountId();
    let accountToUse = saved.find(a => a.id === activeId);

    if (!accountToUse && saved.length > 0) {
      accountToUse = saved[0];
    }

    if (accountToUse) {
      log.info(`Restoring saved active mailbox: ${accountToUse.address}`);
      this.activeAccount.set(accountToUse);
      this.updateExpiryStatus();
      try {
        await this.refreshInbox(false);
        this.startCountdownTimer();
        this.startExpiryTimer();
      } catch (err: any) {
        log.warn(`Mailbox ${accountToUse.address} restoration check failed. Purging and provisioning replacement:`, err);
        this.storage.removeAccount(accountToUse.id);
        this.inboxes.set(this.storage.getSavedAccounts());
        await this.generateRandomAccount();
      }
    } else {
      log.info('No saved mailbox found. Provisioning fresh temporary email...');
      await this.generateRandomAccount();
    }
  }

  /**
   * Cleans up timers when component unmounts.
   */
  cleanup(): void {
    if (this.countdownHandle) clearInterval(this.countdownHandle);
    if (this.expiryTimerHandle) clearInterval(this.expiryTimerHandle);
    if (this.leaderCheckHandle) clearInterval(this.leaderCheckHandle);
    if (this.heartbeatSendHandle) clearInterval(this.heartbeatSendHandle);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.rateLimitPauseTimeout) clearTimeout(this.rateLimitPauseTimeout);
    if (this.syncChannel) {
      this.syncChannel.close();
      this.syncChannel = null;
    }
  }

  /**
   * Multi-Tab Synchronization & Leader Election Setup
   */
  private initMultiTabSync(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    try {
      this.syncChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
      this.syncChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
        this.handleSyncMessage(event.data);
      };

      // Periodic check for leader tab heartbeats
      this.leaderCheckHandle = setInterval(() => {
        const timeSinceHeartbeat = Date.now() - this.lastLeaderHeartbeat;
        if (timeSinceHeartbeat > 4000) {
          // Previous leader died or this is the only tab -> become leader
          if (!this.isLeaderTab) {
            log.info(`Tab ${this.tabId} assumed polling leadership.`);
            this.isLeaderTab = true;
            this.startHeartbeatBroadcast();
          }
        }
      }, 2000);

      // Assume initial leadership tentatively
      this.isLeaderTab = true;
      this.startHeartbeatBroadcast();
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment:', e);
      this.isLeaderTab = true;
    }
  }

  private startHeartbeatBroadcast(): void {
    if (this.heartbeatSendHandle) clearInterval(this.heartbeatSendHandle);
    this.heartbeatSendHandle = setInterval(() => {
      if (this.isLeaderTab && this.syncChannel) {
        this.syncChannel.postMessage({
          type: 'HEARTBEAT',
          tabId: this.tabId,
          timestamp: Date.now()
        });
      }
    }, 2000);
  }

  private handleSyncMessage(msg: SyncMessage): void {
    if (!msg || msg.tabId === this.tabId) return;

    if (msg.type === 'HEARTBEAT') {
      this.lastLeaderHeartbeat = Date.now();
      // If another tab was already established as leader, yield
      if (msg.tabId < this.tabId && this.isLeaderTab) {
        this.isLeaderTab = false;
        log.info(`Tab ${this.tabId} yielded polling leadership to ${msg.tabId}`);
      }
      return;
    }

    if (msg.type === 'SYNC_STATE') {
      if (msg.accounts) this.inboxes.set(msg.accounts);
      if (msg.activeAccountId) {
        const target = this.inboxes().find(a => a.id === msg.activeAccountId);
        if (target && target.id !== this.activeAccount()?.id) {
          this.activeAccount.set(target);
          this.updateExpiryStatus();
        }
      }
      if (msg.messages) {
        this.messages.set(msg.messages);
      }
      return;
    }

    if (msg.type === 'NEW_MESSAGES' && msg.messages) {
      this.messages.set(msg.messages);
      this.onNewMessagesDetected(msg.messages);
      return;
    }

    if (msg.type === 'WIPE_ALL') {
      this.inboxes.set([]);
      this.activeAccount.set(null);
      this.messages.set([]);
      this.selectedMessage.set(null);
      this.generateRandomAccount();
      return;
    }
  }

  private broadcastState(): void {
    if (!this.syncChannel) return;
    this.syncChannel.postMessage({
      type: 'SYNC_STATE',
      tabId: this.tabId,
      activeAccountId: this.activeAccount()?.id,
      accounts: this.inboxes(),
      messages: this.messages(),
      timestamp: Date.now()
    });
  }

  /**
   * Initializes local audio element and loads alert preferences.
   */
  private initAudioAndNotificationSettings(): void {
    if (typeof Audio !== 'undefined') {
      try {
        this.notificationAudio = new Audio('/assets/sounds/notification.mp3');
        this.notificationAudio.load();
      } catch (e) {
        console.warn('Could not initialize notification audio:', e);
      }
    }
  }

  /**
   * Plays local notification chime.
   */
  playNotificationSound(): void {
    if (!this.soundEnabled()) return;
    try {
      if (!this.notificationAudio) {
        this.notificationAudio = new Audio('/assets/sounds/notification.mp3');
      }
      this.notificationAudio.currentTime = 0;
      this.notificationAudio.play().catch(err => {
        // Autoplay policy might block until first interaction
        console.warn('Audio playback prevented by browser policy:', err);
      });
    } catch (e) {
      console.warn('Error playing notification sound:', e);
    }
  }

  /**
   * Requests browser notification permission and enables alerts.
   */
  async toggleBrowserAlerts(): Promise<void> {
    if (typeof Notification === 'undefined') {
      this.showToast('Browser notifications are not supported by this browser.');
      return;
    }

    if (Notification.permission === 'granted') {
      const next = !this.browserAlertsEnabled();
      this.browserAlertsEnabled.set(next);
      this.storage.setAlertsEnabled(next);
      this.showToast(next ? 'Browser alerts enabled' : 'Browser alerts muted');
      return;
    }

    if (Notification.permission === 'denied') {
      this.showToast('Notifications are blocked in your browser settings. Please allow them for alerts.');
      this.notificationPermission.set('denied');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      this.notificationPermission.set(permission);
      if (permission === 'granted') {
        this.browserAlertsEnabled.set(true);
        this.storage.setAlertsEnabled(true);
        this.showToast('Browser alerts enabled!');
        this.playNotificationSound();
      } else {
        this.showToast('Notifications were not granted.');
      }
    } catch {
      this.showToast('Unable to request notification permission.');
    }
  }

  /**
   * Toggles sound alerts.
   */
  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    this.storage.setSoundEnabled(next);
    this.showToast(next ? 'Notification sound enabled' : 'Notification sound muted');
    if (next) this.playNotificationSound();
  }

  /**
   * Triggers browser notifications and sound when new emails arrive.
   */
  private onNewMessagesDetected(newMessages: MessageSummary[]): void {
    this.playNotificationSound();

    if (this.browserAlertsEnabled() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const unread = newMessages.filter(m => !m.seen);
      const newest = unread[0] || newMessages[0];
      if (newest) {
        const sender = newest.from.name || newest.from.address;
        const otpText = newest.extractedOtp ? `\nVerification Code: ${newest.extractedOtp.code}` : '';
        new Notification(`New Email from ${sender}`, {
          body: `${newest.subject || '(No Subject)'}${otpText}`,
          icon: '/assets/icons/favicon.ico'
        });
      }
    }
  }

  /**
   * Fetches active domains from provider.
   */
  async fetchDomains(): Promise<MailDomain[]> {
    try {
      const list = await this.api.getDomains();
      this.domains.set(list);
      return list;
    } catch (e: any) {
      console.warn('Could not fetch domains:', e.message);
      return [];
    }
  }

  /**
   * Generates a new random temporary email account instantly.
   */
  async generateRandomAccount(retryCount: number = 0): Promise<void> {
    this.isGeneratingAccount.set(true);

    try {
      let domainList = this.domains();
      if (domainList.length === 0) {
        domainList = await this.fetchDomains();
      }

      if (domainList.length === 0) {
        throw new Error('Temporary email service is temporarily unavailable. Please try again in a moment.');
      }

      const domainIndex = retryCount % domainList.length;
      const domain = domainList[domainIndex].domain;
      const username = this.storage.generateRandomUsername();
      const address = `${username}@${domain}`;
      const password = this.storage.generateSecurePassword();

      // 1. Create account
      const created = await this.api.createAccount(address, password);
      const registeredAddress = created.address || address;

      // 2. Obtain token with retry
      const tokenRes = await this.api.getToken(registeredAddress, password);

      const newAccount: MailAccount = {
        id: created.id,
        address: registeredAddress,
        password,
        token: tokenRes.token,
        createdAt: created.createdAt || new Date().toISOString(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        label: `Inbox ${this.inboxes().length + 1}`
      };

      this.storage.upsertAccount(newAccount);
      this.inboxes.set(this.storage.getSavedAccounts());
      this.activeAccount.set(newAccount);
      this.messages.set([]);
      this.selectedMessage.set(null);
      this.error.set(null);
      this.providerStatus.set(null);

      this.updateExpiryStatus();
      log.info(`New random temporary mailbox ready: ${newAccount.address}`);
      this.showToast(`Generated: ${registeredAddress}`);
      this.startCountdownTimer();
      this.startExpiryTimer();
      this.broadcastState();
    } catch (e: any) {
      log.error('Failed to generate temporary email attempt:', e);
      if (retryCount < 2) {
        log.warn(`Retrying mailbox creation (attempt ${retryCount + 2})...`);
        await new Promise(r => setTimeout(r, 600));
        return this.generateRandomAccount(retryCount + 1);
      }
      this.error.set(e.message || 'Failed to generate temporary email');
    } finally {
      this.isGeneratingAccount.set(false);
    }
  }

  /**
   * Creates a custom email with a user-chosen username and selected domain.
   */
  async createCustomAccount(username: string, domainName: string): Promise<{ success: boolean; error?: string }> {
    this.isGeneratingAccount.set(true);

    try {
      const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (cleanUser.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters.' };
      }

      const address = `${cleanUser}@${domainName}`;
      if (this.inboxes().some(a => a.address.toLowerCase() === address.toLowerCase())) {
        return { success: false, error: `The address "${address}" is already in your active inboxes list.` };
      }

      log.info(`Creating custom mailbox: ${address}`);
      const password = this.storage.generateSecurePassword();

      const created = await this.api.createAccount(address, password);
      const registeredAddress = created.address || address;
      const tokenRes = await this.api.getToken(registeredAddress, password);

      const newAccount: MailAccount = {
        id: created.id,
        address: registeredAddress,
        password,
        token: tokenRes.token,
        createdAt: created.createdAt || new Date().toISOString(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        label: `Custom (${cleanUser})`
      };

      this.storage.upsertAccount(newAccount);
      this.inboxes.set(this.storage.getSavedAccounts());
      this.activeAccount.set(newAccount);
      this.messages.set([]);
      this.selectedMessage.set(null);
      this.updateExpiryStatus();

      log.info(`Custom mailbox active: ${registeredAddress}`);
      this.showToast(`Custom inbox ready: ${address}`);
      this.startCountdownTimer();
      this.startExpiryTimer();
      this.broadcastState();
      return { success: true };
    } catch (e: any) {
      log.error(`Could not create custom address ${username}@${domainName}:`, e);
      const msg = e.message || 'Could not create custom address.';
      return { success: false, error: msg };
    } finally {
      this.isGeneratingAccount.set(false);
    }
  }

  /**
   * Extends active mailbox expiry time by 24 hours.
   */
  extendActiveAccount(): void {
    const acc = this.activeAccount();
    if (!acc) return;
    const updated = this.storage.extendAccountExpiry(acc.id, 24 * 60 * 60 * 1000);
    if (updated) {
      this.activeAccount.set(updated);
      this.inboxes.set(this.storage.getSavedAccounts());
      this.updateExpiryStatus();
      this.showToast('Inbox expiry extended by 24 hours');
      this.broadcastState();
    }
  }

  /**
   * Calculates and updates human-readable expiry string.
   */
  private updateExpiryStatus(): void {
    const acc = this.activeAccount();
    if (!acc || !acc.expiresAt) {
      this.timeUntilExpiry.set('24h');
      this.isExpired.set(false);
      return;
    }

    const diff = acc.expiresAt - Date.now();
    if (diff <= 0) {
      this.timeUntilExpiry.set('Expired');
      this.isExpired.set(true);
      return;
    }

    this.isExpired.set(false);
    const totalMinutes = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours > 0) {
      this.timeUntilExpiry.set(`${hours}h ${mins}m`);
    } else {
      this.timeUntilExpiry.set(`${mins} min`);
    }
  }

  private startExpiryTimer(): void {
    if (this.expiryTimerHandle) clearInterval(this.expiryTimerHandle);
    this.updateExpiryStatus();
    this.expiryTimerHandle = setInterval(() => {
      this.updateExpiryStatus();
    }, 60000);
  }

  /**
   * Wipes all accounts, messages, and preferences from local storage.
   */
  async wipeAllData(): Promise<void> {
    log.info('Wiping all temporary email data from browser...');
    this.storage.wipeAllData();
    this.inboxes.set([]);
    this.activeAccount.set(null);
    this.messages.set([]);
    this.selectedMessage.set(null);
    this.error.set(null);
    this.providerStatus.set(null);

    if (this.syncChannel) {
      this.syncChannel.postMessage({
        type: 'WIPE_ALL',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }

    this.showToast('All temporary addresses and data cleared');
    await this.generateRandomAccount();
  }

  /**
   * Switches to another saved mailbox.
   */
  async switchAccount(accountId: string): Promise<void> {
    const target = this.inboxes().find(a => a.id === accountId);
    if (!target || target.id === this.activeAccount()?.id) return;

    log.info(`Switching active mailbox to: ${target.address}`);
    this.activeAccount.set(target);
    this.storage.setActiveAccountId(accountId);
    this.selectedMessage.set(null);
    this.messages.set([]);
    this.error.set(null);
    this.updateExpiryStatus();

    await this.refreshInbox(false);
    this.startCountdownTimer();
    this.broadcastState();
  }

  /**
   * Deletes a specific mailbox by ID.
   */
  async deleteAccountById(accountId: string): Promise<void> {
    const target = this.inboxes().find(a => a.id === accountId);
    if (!target) return;

    if (this.activeAccount()?.id === accountId) {
      await this.deleteActiveAccount();
      return;
    }

    this.isLoading.set(true);
    try {
      await this.api.deleteAccount(target.token, target.id).catch(err => {
        console.warn('Account deletion on server returned:', err);
      });

      const updated = this.storage.removeAccount(target.id);
      this.inboxes.set(updated);
      this.showToast('Inbox removed');
      this.broadcastState();
    } catch {
      this.error.set('Failed to delete inbox');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Deletes the currently active mailbox.
   */
  async deleteActiveAccount(): Promise<void> {
    const acc = this.activeAccount();
    if (!acc) return;

    this.isLoading.set(true);
    try {
      await this.api.deleteAccount(acc.token, acc.id).catch(err => {
        console.warn('Account deletion on server returned:', err);
      });

      const updated = this.storage.removeAccount(acc.id);
      this.inboxes.set(updated);

      if (updated.length > 0) {
        this.activeAccount.set(updated[0]);
        this.selectedMessage.set(null);
        this.updateExpiryStatus();
        await this.refreshInbox(false);
      } else {
        this.activeAccount.set(null);
        this.selectedMessage.set(null);
        await this.generateRandomAccount();
      }

      this.showToast('Inbox deleted');
      this.broadcastState();
    } catch {
      this.error.set('Failed to delete inbox');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Fetches latest messages for active inbox with smart rate limiting & provider monitoring.
   */
  async refreshInbox(isManual: boolean = false): Promise<void> {
    const acc = this.activeAccount();
    if (!acc) return;

    // Only leader tab or manual user interaction fires HTTP request
    if (!this.isLeaderTab && !isManual) {
      log.debug(`Tab ${this.tabId} is non-leader; skipping background refresh.`);
      return;
    }

    this.isRefreshing.set(true);
    if (isManual) this.error.set(null);
    log.debug(`Checking inbox for ${acc.address} (manual=${isManual})...`);

    // Provider latency monitor
    const slowTimer = setTimeout(() => {
      this.providerStatus.set({
        type: 'slow',
        message: 'Mail provider response is slow, waiting...'
      });
    }, 3500);

    try {
      const res = await this.api.getMessages(acc.token, 1);
      clearTimeout(slowTimer);
      this.providerStatus.set(null);

      const previousIds = new Set(this.messages().map(m => m.id));
      const enhanced: MessageSummary[] = (res.messages || []).map(m => {
        const otp = this.otpService.extractOtp(m.subject, m.intro || '');
        const hasLinks = this.otpService.hasLinks(m.intro || '', '', '');
        return {
          ...m,
          extractedOtp: otp,
          hasLinks
        };
      });

      // Detect if brand-new incoming messages arrived
      const newItems = enhanced.filter(m => !previousIds.has(m.id));
      if (newItems.length > 0 && this.messages().length > 0) {
        this.onNewMessagesDetected(newItems);
      }

      this.messages.set(enhanced);
      log.info(`Inbox checked for ${acc.address}: ${enhanced.length} message(s) retrieved`);

      // Reset countdown timer
      this.secondsUntilRefresh.set(this.autoRefreshInterval());

      if (isManual) {
        this.showToast('Inbox up to date');
      }

      // Sync state to other tabs
      if (this.syncChannel) {
        this.syncChannel.postMessage({
          type: 'SYNC_STATE',
          tabId: this.tabId,
          activeAccountId: acc.id,
          accounts: this.inboxes(),
          messages: enhanced,
          timestamp: Date.now()
        });
      }
    } catch (e: any) {
      clearTimeout(slowTimer);

      const isRateLimit = e.message && (e.message.includes('Rate limit') || e.message.includes('429'));
      if (isRateLimit) {
        log.warn('Provider rate limit reached. Pausing refresh for 30 seconds...');
        this.providerStatus.set({
          type: 'rate-limited',
          message: 'Provider rate limit reached (max 30 req/min). Pausing refresh for 30s...',
          retryInSeconds: 30
        });
        if (this.rateLimitPauseTimeout) clearTimeout(this.rateLimitPauseTimeout);
        this.rateLimitPauseTimeout = setTimeout(() => {
          this.providerStatus.set(null);
        }, 30000);
        return;
      }

      const isAuthOrExpiry = e.message && (
        e.message.includes('expired') ||
        e.message.includes('Invalid credentials') ||
        e.message.includes('Authentication failed') ||
        e.message.includes('401')
      );

      if (isAuthOrExpiry && acc) {
        log.warn(`Mailbox ${acc.address} session expired. Auto-purging and provisioning replacement...`);
        const remaining = this.storage.removeAccount(acc.id);
        this.inboxes.set(remaining);
        this.error.set(null);

        if (remaining.length > 0) {
          this.activeAccount.set(remaining[0]);
          await this.refreshInbox(false);
        } else {
          this.activeAccount.set(null);
          await this.generateRandomAccount();
        }
      } else if (isManual) {
        this.error.set(e.message || 'Failed to refresh inbox');
      } else {
        this.providerStatus.set({
          type: 'unavailable',
          message: 'Email provider temporarily unavailable. Retrying automatically...',
          retryInSeconds: 15
        });
      }
    } finally {
      this.isRefreshing.set(false);
    }
  }

  /**
   * Opens and displays message details, marking it read.
   */
  async openMessage(messageId: string): Promise<void> {
    const acc = this.activeAccount();
    if (!acc) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const detail = await this.api.getMessage(acc.token, messageId);

      // Deep scan OTP & Links
      const combinedHtml = (detail.html || []).join('\n');
      const otp = this.otpService.extractOtp(detail.subject, detail.text || '', combinedHtml);
      const hasLinks = this.otpService.hasLinks(detail.intro || '', detail.text || '', combinedHtml);

      const enhanced: MessageDetail = {
        ...detail,
        seen: true,
        extractedOtp: otp,
        hasLinks
      };

      this.selectedMessage.set(enhanced);

      // Mark seen locally
      this.messages.update(list =>
        list.map(m => (m.id === messageId ? { ...m, seen: true } : m))
      );

      // Mark seen on server asynchronously
      this.api.markAsSeen(acc.token, messageId);
      this.broadcastState();
    } catch (e: any) {
      this.error.set(e.message || 'Could not load email content');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Closes message viewer and returns to inbox list.
   */
  closeMessage(): void {
    this.selectedMessage.set(null);
  }

  /**
   * Deletes a specific message.
   */
  async deleteMessage(messageId: string): Promise<void> {
    const acc = this.activeAccount();
    if (!acc) return;

    try {
      await this.api.deleteMessage(acc.token, messageId);

      // Remove from list
      this.messages.update(list => list.filter(m => m.id !== messageId));

      // Clear selection if deleted
      if (this.selectedMessage()?.id === messageId) {
        this.selectedMessage.set(null);
      }

      this.showToast('Message deleted');
      this.broadcastState();
    } catch (e: any) {
      this.error.set(e.message || 'Failed to delete message');
    }
  }

  /**
   * Sets auto-refresh interval.
   */
  setRefreshInterval(interval: AutoRefreshInterval): void {
    this.autoRefreshInterval.set(interval);
    this.storage.saveRefreshInterval(interval);
    this.secondsUntilRefresh.set(interval);
    this.startCountdownTimer();
  }

  /**
   * Toggles tracking protection / blocking remote images.
   */
  setBlockRemoteImages(block: boolean): void {
    this.blockRemoteImages.set(block);
    this.storage.setBlockRemoteImages(block);
  }

  /**
   * Fetches the binary blob of an attachment.
   */
  async getAttachmentBlob(downloadUrl: string): Promise<Blob | null> {
    const acc = this.activeAccount();
    if (!acc || !downloadUrl) return null;
    try {
      return await this.api.getAttachmentBlob(acc.token, downloadUrl);
    } catch (e) {
      console.warn('Could not fetch attachment blob:', e);
      return null;
    }
  }

  /**
   * Opens link preview verification modal.
   */
  inspectLink(url: string, visibleText?: string): void {
    const data = this.otpService.analyzeLink(url, visibleText);
    this.activeLinkPreview.set(data);
  }

  /**
   * Closes link preview modal.
   */
  closeLinkPreview(): void {
    this.activeLinkPreview.set(null);
  }

  /**
   * Filters by category.
   */
  setFilter(filter: InboxFilter): void {
    this.activeFilter.set(filter);
  }

  /**
   * Sets search text.
   */
  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  /**
   * Starts or resets the interval countdown timer.
   */
  private startCountdownTimer(): void {
    if (this.countdownHandle) clearInterval(this.countdownHandle);

    const interval = this.autoRefreshInterval();
    if (interval === 0) return; // Manual mode

    this.secondsUntilRefresh.set(interval);

    this.countdownHandle = setInterval(() => {
      if (!this.isTabVisible() || this.isRefreshing()) return;

      const current = this.secondsUntilRefresh();
      if (current <= 1) {
        this.secondsUntilRefresh.set(this.autoRefreshInterval());
        this.refreshInbox(false);
      } else {
        this.secondsUntilRefresh.set(current - 1);
      }
    }, 1000);
  }

  /**
   * Listens for tab focus changes to pause auto-refresh when tab is hidden.
   */
  private setupPageVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const isVis = document.visibilityState === 'visible';
        this.isTabVisible.set(isVis);
        if (isVis && this.activeAccount()) {
          this.refreshInbox(false);
        }
      });
    }
  }

  showToast(msg: string): void {
    this.successToast.set(msg);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.successToast.set(null);
    }, 3000);
  }
}
