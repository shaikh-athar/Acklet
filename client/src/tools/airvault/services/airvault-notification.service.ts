import { Injectable, inject, signal } from '@angular/core';
import { AirVaultPreferencesService } from './airvault-preferences.service';
import { AirVaultUIStore } from './airvault-ui.store';
import { AirVaultItem } from './airvault-storage.service';

export interface QueuedNotificationItem {
  id: string;
  senderHandle: string;
  category: string;
  snippet: string;
  isSensitive: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultNotificationService {
  private prefService = inject(AirVaultPreferencesService);
  private uiStore = inject(AirVaultUIStore);

  // Unread badge counter for tab and UI indicators
  unreadCount = signal<number>(0);
  permissionStatus = signal<NotificationPermission>(this.getInitialPermission());

  private groupBuffer: QueuedNotificationItem[] = [];
  private groupTimer: any = null;
  private readonly GROUP_WINDOW_MS = 2500; // 2.5s grouping window

  private audioCtx: AudioContext | null = null;
  private originalDocumentTitle: string = typeof document !== 'undefined' ? document.title : 'AirVault | Acklet';

  private ensureAudioContext() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch { }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.ensureAudioContext();
        this.getOrCreateAudio();
      };

      window.addEventListener('click', unlockAudio, { once: true, passive: true });
      window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
      window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

      window.addEventListener('focus', () => {
        this.clearBadge();
      });
      window.addEventListener('click', () => {
        if (this.unreadCount() > 0) {
          this.clearBadge();
        }
      });
    }
  }

  private getInitialPermission(): NotificationPermission {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus.set(permission);
      const granted = permission === 'granted';
      this.prefService.updatePref('pushNotificationsEnabled', granted);
      if (granted) {
        this.uiStore.triggerToast('🔔 Push notifications enabled for incoming clipboard items');
      }
      return granted;
    } catch {
      return false;
    }
  }

  /**
   * Main notification gateway: handles app state (foreground focused, different screen, backgrounded/closed),
   * grouping, sound synthesis, badges, and sensitive content masking.
   */
  notifyIncomingItem(item: AirVaultItem, isQualifyingAutoCopy: boolean, autoCopied: boolean) {
    const isAppFocused = typeof document !== 'undefined' && document.hasFocus() && !document.hidden;
    const senderHandle = item.senderDeviceName?.startsWith('@')
      ? item.senderDeviceName
      : (item.senderDeviceName ? `@${item.senderDeviceName}` : '@peer');

    const isSensitive = !!(item.content.isSensitive || item.content.sensitiveType);
    let snippet = '';

    if (isSensitive) {
      snippet = '🔒 Sensitive Item Protected';
    } else if (item.isBatchParent) {
      snippet = `${item.batchTotalCount || item.batchFiles?.length || 'Multiple'} files`;
    } else if (item.content.filename) {
      snippet = item.content.filename;
    } else if (item.content.category === 'image') {
      snippet = 'Image resource';
    } else {
      const raw = item.content.raw || '';
      snippet = raw.length > 50 ? raw.slice(0, 50) + '…' : raw;
    }

    // 1. Play sleek custom synthesized audio chime if enabled
    if (this.prefService.prefs().notificationSoundEnabled) {
      this.playNotificationChime(autoCopied);
    }

    // 2. If app is foregrounded and focused:
    if (isAppFocused) {
      if (autoCopied) {
        this.uiStore.triggerToast(`⚡ Auto-copied ${item.content.category} from ${senderHandle}`);
      } else if (isQualifyingAutoCopy) {
        this.uiStore.triggerToast(`📥 Received ${item.content.category} from ${senderHandle}`);
      } else {
        this.uiStore.triggerToast(`📦 Received ${item.content.category} (${snippet}) · Tap to inspect`);
      }
      return;
    }

    // 3. If app is backgrounded or tab is inactive:
    this.incrementBadge();

    // Buffer for notification grouping
    this.groupBuffer.push({
      id: item.id,
      senderHandle,
      category: item.content.category,
      snippet,
      isSensitive,
      timestamp: Date.now()
    });

    if (this.groupTimer) {
      clearTimeout(this.groupTimer);
    }

    this.groupTimer = setTimeout(() => {
      this.flushGroupedNotifications();
    }, this.GROUP_WINDOW_MS);
  }

  private flushGroupedNotifications() {
    if (this.groupBuffer.length === 0) return;

    const items = [...this.groupBuffer];
    this.groupBuffer = [];

    // If notifications are not permitted or disabled in settings, stop
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    if (!this.prefService.prefs().pushNotificationsEnabled) {
      return;
    }

    let title = '';
    let body = '';

    if (items.length === 1) {
      const single = items[0];
      title = `AirVault · ${single.senderHandle}`;
      body = single.isSensitive ? 'New sensitive item (preview hidden)' : single.snippet;
    } else {
      // Grouped notification
      const senders = Array.from(new Set(items.map(i => i.senderHandle)));
      const senderText = senders.length === 1 ? senders[0] : `${senders.length} devices`;
      title = `AirVault · ${items.length} new items`;
      body = `${items.length} incoming clips from ${senderText}`;
    }

    try {
      const options: NotificationOptions = {
        body,
        icon: '/favicon.ico',
        tag: 'airvault-sync-group'
      };
      const notification = new Notification(title, options);

      notification.onclick = () => {
        window.focus();
        this.clearBadge();
        notification.close();
      };
    } catch (err) {
      console.warn('[AirVault Notifications] OS Push dispatch warning:', err);
    }
  }

  incrementBadge() {
    this.unreadCount.update(c => c + 1);
    this.updateTabTitle();
  }

  clearBadge() {
    this.unreadCount.set(0);
    this.updateTabTitle();
  }

  private updateTabTitle() {
    if (typeof document === 'undefined') return;
    const count = this.unreadCount();
    if (count > 0) {
      document.title = `(${count}) AirVault | Acklet`;
    } else {
      document.title = this.originalDocumentTitle || 'AirVault | Acklet';
    }
  }

  private readonly NOTIFICATION_SOUND_URL = '/assets/airvault/airvault_notification.mp3';
  private reusableAudio: HTMLAudioElement | null = null;

  private getOrCreateAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.reusableAudio) {
      try {
        this.reusableAudio = new Audio(this.NOTIFICATION_SOUND_URL);
        this.reusableAudio.volume = 1.0;
        this.reusableAudio.preload = 'auto';
      } catch {
        this.reusableAudio = null;
      }
    }
    return this.reusableAudio;
  }

  /**
   * 
   *  the official AirVault notification MP3 sound (/assets/airvault/airvault_notification.mp3).
   * Resets currentTime = 0 and plays the audio file.
   */
  public playNotificationChime(_isAutoCopied: boolean = false) {
    if (typeof window === 'undefined') return;

    try {
      const audio = this.getOrCreateAudio();
      if (audio) {
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.debug('[AirVault Audio] Notification audio playback deferred by browser autoplay policy:', err);
          });
        }
      }
    } catch (err) {
      console.debug('[AirVault Audio] Error playing notification sound:', err);
    }
  }
}
