import { Component, ChangeDetectionStrategy, signal, input, output, inject, OnDestroy, AfterViewInit, computed, ViewChild, ElementRef, NgZone, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { LargeInputNoticeComponent } from '../../../app/shared/components/large-input-notice/large-input-notice.component';
import { AirVaultCardComponent } from './airvault-card.component';
import { AirVaultHandoffBannerComponent } from './airvault-handoff-banner.component';
import { AirVaultClipboardService, ClassifiedContent, LineBlameEntry, CLIPBOARD_STORAGE_CAP_BYTES, MAX_SINGLE_FILE_SIZE_BYTES } from '../services/airvault-clipboard.service';
import { AirVaultDevice, AirVaultDeviceService } from '../services/airvault-device.service';
import { AirVaultMotionService } from '../services/airvault-motion.service';
import { AirVaultStorageService, AirVaultItem } from '../services/airvault-storage.service';
import { AirVaultClipboardStore } from '../services/airvault-clipboard.store';
import { AirVaultSyncService, DraftActivityPayload } from '../services/airvault-sync.service';
import { AirVaultCollapseService } from '../services/airvault-collapse.service';
import { AirVaultUIStore } from '../services/airvault-ui.store';
import { AirVaultCryptoService } from '../services/airvault-crypto.service';
import { AirVaultColorService } from '../services/airvault-color.service';
import { AirVaultBlameService } from '../services/airvault-blame.service';
import { maskSensitivePreview, ComposerMatch, scanAllMatches } from '../services/airvault-action-detector';
import { AirVaultActionPopoverComponent } from './airvault-action-popover.component';
import { getAirVaultApiUrl } from '../services/airvault-api.util';
import { checkInputThreshold, formatByteSize } from '../../../app/core/config/tool-thresholds';

import { AirVaultDocSyncService } from '../services/airvault-doc-sync.service';
import { WordUndoManager } from '../services/airvault-undo.manager';
import { AirVaultPreferencesService } from '../services/airvault-preferences.service';
import { AirVaultLogger } from '../services/airvault-sync-debug.service';

@Component({
  selector: 'app-airvault-staging',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, LargeInputNoticeComponent, AirVaultCardComponent, AirVaultHandoffBannerComponent, AirVaultActionPopoverComponent],
  templateUrl: './airvault-staging.component.html',
  styleUrls: ['../airvault.shared.css', './airvault-staging.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultStagingComponent implements OnDestroy, AfterViewInit {
  @ViewChild('textareaRef') textareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('streamArea') streamAreaRef?: ElementRef<HTMLDivElement>;

  public clipboard = inject(AirVaultClipboardService);
  public clipboardStore = inject(AirVaultClipboardStore);
  public storageService = inject(AirVaultStorageService);
  public syncService = inject(AirVaultSyncService);
  public docSync = inject(AirVaultDocSyncService);
  public deviceService = inject(AirVaultDeviceService);
  public collapseService = inject(AirVaultCollapseService);
  public colorService = inject(AirVaultColorService);
  public blameService = inject(AirVaultBlameService);
  public uiStore = inject(AirVaultUIStore);
  public cryptoService = inject(AirVaultCryptoService);
  public prefService = inject(AirVaultPreferencesService);
  private ngZone = inject(NgZone);
  motion = inject(AirVaultMotionService);

  private subs: Subscription[] = [];

  searchHighlightQuery = computed(() => this.uiStore.searchHighlightQuery());
  activeSearchMatchIndex = computed(() => this.uiStore.activeMatchIndex());
  editorScrollTop = signal<number>(0);

  /**
   * Precomputes global search match offsets across the staged document
   */
  editorSearchMatchOffsets = computed(() => {
    const text = this.stagedText();
    const q = this.searchHighlightQuery().trim();
    if (!text || !q) return [];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(q)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(q), 'gi');
    }

    const offsets: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      offsets.push(match.index);
    }
    return offsets;
  });

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }

  showSearchHighlights = computed(() => this.uiStore.showSearchHighlights());

  getHighlightParts(text: string, query: string, spanOffset: number = 0): { text: string; isMatch: boolean; isCurrent: boolean }[] {
    if (!text) return [];
    if (!this.showSearchHighlights()) {
      return [{ text, isMatch: false, isCurrent: false }];
    }
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false, isCurrent: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`(\\b${this.escapeRegex(q)}\\b)`, 'gi');
    } else {
      pattern = new RegExp(`(${this.escapeRegex(q)})`, 'gi');
    }

    const parts = text.split(pattern);
    const activeIdx = this.activeSearchMatchIndex();
    const matchOffsets = this.editorSearchMatchOffsets();
    const currentActiveGlobalOffset = (activeIdx >= 0 && activeIdx < matchOffsets.length) ? matchOffsets[activeIdx] : -1;

    let relativeOffset = 0;
    return parts.filter(p => p.length > 0).map(part => {
      const isMatch = part.toLowerCase() === q.toLowerCase();
      const globalOffset = spanOffset + relativeOffset;
      const isCurrent = isMatch && (globalOffset === currentActiveGlobalOffset);
      relativeOffset += part.length;
      return {
        text: part,
        isMatch,
        isCurrent
      };
    });
  }

  /** Optimistically tracked per-line/range blame map for the current staging editor text */
  liveBlameMap = signal<LineBlameEntry[]>([]);

  hoveredAttribution = signal<any | null>(null);
  hoveredAuthorKey = signal<string | null>(null);
  attributionTooltipTop = signal<number>(0);
  attributionTooltipLeft = signal<number>(20);

  /**
   * Inline attribution spans computed for the live shared editor.
   * Maps each contiguous block/line of text to its author attribution, subtle background tint,
   * subtle bottom border indicator, and tooltip info.
   */
  inlineAttributionSpans = computed(() => {
    const text = this.stagedText();
    const blame = this.liveBlameMap();
    const curDev = this.deviceService.currentDevice();
    const paired = this.deviceService.pairedDevices();
    if (!text) return [];

    const lines = text.split('\n');
    const localAuthorName = curDev.name || (curDev.username ? `@${curDev.username.replace(/^@/, '')}` : 'This Device');
    const localAuthorId = curDev.username || curDev.id;

    let currentOffset = 0;
    const spans: Array<{
      text: string;
      hasAttribution: boolean;
      authorKey: string;
      color: string;
      bgHighlight: string;
      borderHighlight: string;
      author: string;
      timeStr: string;
      tooltip: string;
      startOffset: number;
    }> = [];

    lines.forEach((lineStr, idx) => {
      const isLast = idx === lines.length - 1;
      const entry = blame[idx];

      const authorKey = entry?.authorName || entry?.authorIdentityId || localAuthorName || localAuthorId;
      const isLocalAuthor = (authorKey.toLowerCase().replace(/^@/, '') === localAuthorId.toLowerCase().replace(/^@/, '')) ||
        (authorKey.toLowerCase().replace(/^@/, '') === localAuthorName.toLowerCase().replace(/^@/, ''));

      // Look up paired device details for remote lines
      const matchedDevice = !isLocalAuthor ? paired.find(d =>
        (entry?.authorIdentityId && (d.id === entry.authorIdentityId || d.username === entry.authorIdentityId)) ||
        (entry?.authorName && (d.name === entry.authorName || d.username === entry.authorName))
      ) : undefined;

      const rawDeviceName = isLocalAuthor
        ? (curDev.name || 'This Device')
        : (matchedDevice?.name || entry?.authorName || 'Connected Device');

      const rawUsername = isLocalAuthor
        ? (curDev.username || '')
        : (matchedDevice?.username || (entry?.authorIdentityId?.startsWith('@') ? entry.authorIdentityId : ''));

      const cleanDevName = rawDeviceName.replace(/^@/, '').trim();
      const cleanUsername = rawUsername.replace(/^@/, '').trim();

      let authorDisplayName = '';
      if (cleanDevName && cleanUsername && cleanDevName.toLowerCase() !== cleanUsername.toLowerCase()) {
        authorDisplayName = `${cleanDevName} (@${cleanUsername})`;
      } else if (cleanDevName) {
        authorDisplayName = rawDeviceName.startsWith('@') ? rawDeviceName : (cleanUsername ? `@${cleanUsername}` : cleanDevName);
      } else if (cleanUsername) {
        authorDisplayName = `@${cleanUsername}`;
      } else {
        authorDisplayName = 'Connected Device';
      }

      const localAccent = curDev.accentColor || entry?.authorColor;
      const remoteAccent = matchedDevice?.accentColor || entry?.authorColor;
      const originatingAccent = isLocalAuthor ? localAccent : remoteAccent;
      const color = this.colorService.getColorForIdentity(authorKey, originatingAccent, isLocalAuthor);
      const timeStr = entry?.lastEditedAt ? this.relativeTime(entry.lastEditedAt) : 'Just now';
      const tooltip = `Authored by ${authorDisplayName} · ${timeStr}`;

      const isAttributionOn = this.uiStore.showAttributionHighlights();
      const bgHighlight = isAttributionOn ? this.hexToRgba(color, 0.22) : 'transparent';
      const borderHighlight = isAttributionOn ? this.hexToRgba(color, 0.5) : 'transparent';

      // Split the line into text chunks and whitespace chunks so trailing spaces and empty lines don't get highlighted
      const match = lineStr.match(/^(\s*)(.*?)(\s*)$/);
      const leadingSpace = match ? match[1] : '';
      const coreText = match ? match[2] : lineStr;
      const trailingSpace = (match ? match[3] : '') + (isLast ? '' : '\n');

      if (leadingSpace) {
        spans.push({
          text: leadingSpace,
          hasAttribution: false,
          authorKey: '',
          color: '',
          bgHighlight: 'transparent',
          borderHighlight: 'transparent',
          author: '',
          timeStr: '',
          tooltip: '',
          startOffset: currentOffset
        });
        currentOffset += leadingSpace.length;
      }

      if (coreText) {
        spans.push({
          text: coreText,
          hasAttribution: true,
          authorKey: authorKey.toLowerCase().replace(/^@/, ''),
          color,
          bgHighlight,
          borderHighlight,
          author: authorDisplayName,
          timeStr,
          tooltip,
          startOffset: currentOffset
        });
        currentOffset += coreText.length;
      }

      if (trailingSpace) {
        spans.push({
          text: trailingSpace,
          hasAttribution: false,
          authorKey: '',
          color: '',
          bgHighlight: 'transparent',
          borderHighlight: 'transparent',
          author: '',
          timeStr: '',
          tooltip: '',
          startOffset: currentOffset
        });
        currentOffset += trailingSpace.length;
      }
    });

    return spans;
  });

  private hexToRgba(hex: string, alpha: number): string {
    if (!hex || typeof hex !== 'string') return `rgba(33, 150, 243, ${alpha})`;
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(33, 150, 243, ${alpha})`;
  }

  onSpanMouseEnter(span: any, event: MouseEvent) {
    if (!span.hasAttribution || !span.tooltip) {
      this.hoveredAttribution.set(null);
      this.hoveredAuthorKey.set(null);
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const wrapper = target.closest('.editor-wrapper') as HTMLElement;
    if (wrapper && target) {
      const targetRect = target.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const spanTop = targetRect.top - wrapperRect.top;
      const spanLeft = targetRect.left - wrapperRect.left;
      const top = spanTop >= 28 ? (spanTop - 26) : (spanTop + targetRect.height + 4);
      const left = Math.max(14, Math.min(wrapperRect.width - 240, spanLeft + 10));
      this.attributionTooltipTop.set(top);
      this.attributionTooltipLeft.set(left);
    }
    this.hoveredAttribution.set(span);
    this.hoveredAuthorKey.set(span.authorKey);
  }

  onSpanMouseLeave() {
    this.hoveredAttribution.set(null);
    this.hoveredAuthorKey.set(null);
  }

  onEditorScroll(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    if (textarea) {
      this.editorScrollTop.set(textarea.scrollTop);
    }
    if (this.hoveredAttribution()) {
      this.hoveredAttribution.set(null);
      this.hoveredAuthorKey.set(null);
    }
  }

  /** Items sorted newest-first for the tile grid */
  vaultItems = computed(() => this.storageService.items());
  visibleItemCount = signal<number>(12);
  isLoadingMoreRailItems = signal<boolean>(false);

  // Filter menu popover state
  showFilterPopover = signal<boolean>(false);

  /** Filter categories metadata */
  filterCategories = [
    { id: 'text', label: 'Plain Text', icon: 'align-left' },
    { id: 'code', label: 'Code Snippets', icon: 'code-2' },
    { id: 'json', label: 'JSON Data', icon: 'braces' },
    { id: 'url', label: 'URLs & Links', icon: 'link' },
    { id: 'image', label: 'Images & Photos', icon: 'image' },
    { id: 'video', label: 'Videos & Media', icon: 'film' },
    { id: 'file', label: 'Files & Documents', icon: 'file-text' },
    { id: 'archive', label: 'Archives (.zip)', icon: 'archive' },
  ];

  filterTimeRanges = [
    { id: 'today', label: 'Today (24h)' },
    { id: '7d', label: 'Past 7 Days' },
    { id: '30d', label: 'Past 30 Days' },
  ];

  filterSizeRanges = [
    { id: 'small', label: 'Small (< 10 KB)' },
    { id: 'medium', label: 'Medium (< 1 MB)' },
    { id: 'large', label: 'Large (> 1 MB)' },
  ];

  toggleFilterPopover() {
    this.showFilterPopover.update(v => !v);
  }

  closeFilterPopover() {
    this.showFilterPopover.set(false);
  }

  toggleCategoryFilter(cat: string) {
    this.uiStore.activeCategoryFilters.update(current => {
      if (current.includes(cat)) {
        return current.filter(c => c !== cat);
      } else {
        return [...current, cat];
      }
    });
  }

  toggleTimeFilter(time: string) {
    this.uiStore.activeTimeFilters.update(current => {
      if (current.includes(time)) {
        return current.filter(t => t !== time);
      } else {
        return [...current, time];
      }
    });
  }

  toggleSenderFilter(senderId: string) {
    this.uiStore.activeSenderFilters.update(current => {
      if (current.includes(senderId)) {
        return current.filter(s => s !== senderId);
      } else {
        return [...current, senderId];
      }
    });
  }

  toggleSizeFilter(size: string) {
    this.uiStore.activeSizeFilters.update(current => {
      if (current.includes(size)) {
        return current.filter(s => s !== size);
      } else {
        return [...current, size];
      }
    });
  }

  togglePinnedFilter() {
    this.uiStore.activePinnedOnly.update(v => !v);
  }

  toggleSensitiveFilter() {
    this.uiStore.activeSensitiveOnly.update(v => !v);
  }

  resetFilters() {
    this.uiStore.resetAllFilters();
  }

  filteredVaultItems = computed(() => {
    let items = this.vaultItems();
    const cats = this.uiStore.activeCategoryFilters();
    const times = this.uiStore.activeTimeFilters();
    const senders = this.uiStore.activeSenderFilters();
    const sizes = this.uiStore.activeSizeFilters();
    const pinned = this.uiStore.activePinnedOnly();
    const sensitive = this.uiStore.activeSensitiveOnly();

    // Multi-select Category (OR condition between selected categories)
    if (cats.length > 0) {
      items = items.filter(it => cats.some(c => c.toLowerCase() === (it.content?.category || 'text').toLowerCase()));
    }

    // Multi-select Time (OR condition between selected time ranges)
    if (times.length > 0) {
      const now = Date.now();
      items = items.filter(it => {
        const itemTs = typeof it.timestamp === 'number' ? it.timestamp : (it.timestamp ? new Date(it.timestamp).getTime() : 0);
        const age = now - itemTs;
        return times.some(time => {
          if (time === 'today') return age <= 86_400_000;
          if (time === '7d') return age <= 7 * 86_400_000;
          if (time === '30d') return age <= 30 * 86_400_000;
          return true;
        });
      });
    }

    // Multi-select Sender / Device (OR condition between selected senders)
    if (senders.length > 0) {
      const curDev = this.deviceService.currentDevice();
      items = items.filter(it => {
        return senders.some(sender => {
          if (sender === 'self') {
            return it.senderDeviceId === curDev.id || it.originDeviceId === curDev.id || (!it.senderDeviceId && !it.originDeviceId);
          }
          return it.senderDeviceId === sender || it.originDeviceId === sender;
        });
      });
    }

    // Multi-select Payload Size (OR condition between selected size bands)
    if (sizes.length > 0) {
      items = items.filter(it => {
        const bytes = it.content?.byteSize || (it.content?.raw ? new Blob([it.content.raw]).size : 0);
        return sizes.some(size => {
          if (size === 'small') return bytes <= 10 * 1024;
          if (size === 'medium') return bytes > 10 * 1024 && bytes <= 1024 * 1024;
          if (size === 'large') return bytes > 1024 * 1024;
          return true;
        });
      });
    }

    // Attributes
    if (pinned) {
      items = items.filter(it => !!it.isPinned);
    }

    if (sensitive) {
      items = items.filter(it => !!it.content?.isSensitive);
    }

    return items;
  });

  displayedVaultItems = computed(() => {
    return this.filteredVaultItems().slice(0, this.visibleItemCount());
  });

  hasMoreRailItems = computed(() => {
    return this.filteredVaultItems().length > this.visibleItemCount();
  });

  onRailScroll(e: Event) {
    const el = e.target as HTMLElement;
    if (!el || this.isLoadingMoreRailItems() || !this.hasMoreRailItems()) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 160) {
      this.isLoadingMoreRailItems.set(true);
      setTimeout(() => {
        this.visibleItemCount.update(c => c + 12);
        this.isLoadingMoreRailItems.set(false);
      }, 100);
    }
  }

  pairedDevices = input.required<AirVaultDevice[]>();
  selectedTargetId = input<string | undefined>(undefined);

  // ── Search bar inputs (state owned by AirVaultComponent, passed down) ──
  showNavbarSearch = input<boolean>(false);
  navbarSearchQuery = input<string>('');
  isSearchingServer = input<boolean>(false);
  navbarTotalMatches = input<number>(0);
  navbarActiveMatchDisplay = input<number>(0);
  topDropdownResults = input<any[]>([]);
  totalResultCount = input<number>(0);

  // Local interactive state for input focus and hover in dropdown
  isNavbarSearchFocused = signal<boolean>(false);
  selectedDropdownIndex = signal<number>(0);

  // Search bar outputs (actions bubble back up to AirVaultComponent)
  openNavbarSearchEvt = output<void>();
  closeNavbarSearchEvt = output<void>();
  navbarSearchInputEvt = output<string>();
  navbarSearchKeydownEvt = output<KeyboardEvent>();
  prevNavbarMatchEvt = output<MouseEvent>();
  nextNavbarMatchEvt = output<MouseEvent>();
  selectSearchResultEvt = output<any>();
  openHistoryEvt = output<void>();

  @ViewChild('navbarSearchInput') navbarSearchInput?: ElementRef<HTMLInputElement>;

  // ── Forwarding methods for template convenience ──
  openNavbarSearch() {
    this.openNavbarSearchEvt.emit();
    setTimeout(() => {
      this.navbarSearchInput?.nativeElement?.focus();
    }, 50);
  }
  closeNavbarSearch() { this.closeNavbarSearchEvt.emit(); }
  onNavbarSearchInput(val: string) { this.navbarSearchInputEvt.emit(val); }
  onNavbarSearchKeydown(e: KeyboardEvent) { this.navbarSearchKeydownEvt.emit(e); }
  prevNavbarMatch(e: MouseEvent) { this.prevNavbarMatchEvt.emit(e); }
  nextNavbarMatch(e: MouseEvent) { this.nextNavbarMatchEvt.emit(e); }
  onSelectSearchResult(res: any) { this.selectSearchResultEvt.emit(res); }
  openHistory() { this.openHistoryEvt.emit(); }

  // ── Search Formatting and UI Helpers ──
  getSearchTypeClass(item: any): string {
    const type = (item.type || item.entryType || item.category || '').toLowerCase();
    if (type.includes('image')) return 'type-amber';
    if (type.includes('file') || type.includes('pdf')) return 'type-blue';
    if (type.includes('url') || type.includes('link')) return 'type-blue';
    if (type.includes('code')) return 'type-indigo';
    if (type.includes('json')) return 'type-emerald';
    if (type.includes('archive')) return 'type-cyan';
    return 'type-muted';
  }

  getSearchItemIcon(item: any): string {
    const type = (item.type || item.entryType || item.category || '').toLowerCase();
    if (type.includes('image')) return 'image';
    if (type.includes('file') || type.includes('pdf')) return 'file-text';
    if (type.includes('url') || type.includes('link')) return 'link';
    if (type.includes('code')) return 'code';
    if (type.includes('json')) return 'file-json';
    if (type.includes('archive')) return 'archive';
    return 'file';
  }

  getHighlightSegments(text: string, query: string): { text: string; isMatch: boolean }[] {
    if (!text) return [];
    const q = query ? query.trim() : '';
    if (!q) return [{ text, isMatch: false }];

    let pattern: RegExp;
    if (q.length <= 2) {
      pattern = new RegExp(`\\b${this.escapeRegex(q)}\\b`, 'gi');
    } else {
      pattern = new RegExp(this.escapeRegex(q), 'gi');
    }

    const segments: { text: string; isMatch: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: text.substring(lastIndex, match.index), isMatch: false });
      }
      segments.push({ text: match[0], isMatch: true });
      lastIndex = pattern.lastIndex;
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
    }

    if (lastIndex < text.length) {
      segments.push({ text: text.substring(lastIndex), isMatch: false });
    }

    return segments;
  }

  formatRelativeTime(ts: number | string | Date): string {
    if (!ts) return '';
    const now = Date.now();
    const time = new Date(ts).getTime();
    const diff = Math.floor((now - time) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'Yesterday';
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  syncEnabledCount = computed(() => this.pairedDevices().filter(d => d.syncEnabled !== false && d.status === 'active').length);

  beamPayload = output<{
    text: string;
    targetDeviceId?: string;
    filename?: string;
    existingItemId?: string;
    lineBlameMap?: LineBlameEntry[];
    options?: { tag?: string; customCategory?: string; retentionTtlMs?: number };
  }>();
  liveTextChange = output<{ text: string; lineBlameMap?: LineBlameEntry[] }>();
  targetChange = output<string | undefined>();
  deleteItem = output<string>();
  resendItem = output<AirVaultItem>();
  clearActiveClipboard = output<void>();
  refreshClipboard = output<void>();

  getConnectedCount(): number {
    return this.pairedDevices().filter(d => d.status === 'active').length;
  }
  isSyncingActive = computed(() => {
    const logs = this.syncService.syncTelemetryLogs();
    return logs.length > 0 && logs[0].status === 'pending';
  });

  /** Upload/attach popover visibility for chat composer bar */
  uploadMenuOpen = signal<boolean>(false);

  // ── Redesigned Smart Composer Input State ──
  isExpanded = signal<boolean>(false);
  isManualExpanded = signal<boolean>(false);
  /** Line count tracked on each keystroke — drives expand-button visibility (hidden < 5 lines) */
  composerLineCount = signal<number>(1);
  isCodeJsonHintActive = signal<boolean>(false);
  perItemRetentionTtl = signal<number | null>(null);
  retentionPopoverOpen = signal<boolean>(false);
  tagInputOpen = signal<boolean>(false);
  currentTag = signal<string>('');
  tagDraft = signal<string>('');

  @ViewChild('tagInputRef') tagInputRef?: ElementRef<HTMLInputElement>;

  toggleRetentionPopover(e?: Event) {
    if (e) e.stopPropagation();
    this.retentionPopoverOpen.update(v => !v);
    if (this.retentionPopoverOpen()) {
      this.tagInputOpen.set(false);
      this.uploadMenuOpen.set(false);
    }
  }

  setPerItemRetention(ttl: number | null, e?: Event) {
    if (e) e.stopPropagation();
    this.perItemRetentionTtl.set(ttl);
    this.retentionPopoverOpen.set(false);
    const label = this.getRetentionLabel(ttl);
    this.uiStore.triggerToast(`🔒 Item retention set to ${label}`);
  }

  getRetentionLabel(ttl: number | null): string {
    if (ttl === null) return 'Default (7d)';
    if (ttl === -1) return 'Burn after read';
    if (ttl === 0) return 'Never expire';
    if (ttl === 15 * 60 * 1000) return '15m';
    if (ttl === 60 * 60 * 1000) return '1h';
    if (ttl === 24 * 60 * 60 * 1000) return '24h';
    if (ttl === 7 * 24 * 60 * 60 * 1000) return '7d';
    if (ttl === 30 * 24 * 60 * 60 * 1000) return '1mo';
    return `${Math.round(ttl / (3600 * 1000))}h`;
  }

  toggleCodeJsonHint(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    this.isCodeJsonHintActive.update(v => !v);
    if (this.isCodeJsonHintActive()) {
      this.uiStore.triggerToast('🏷️ Marked as Code / JSON snippet');
    }
  }

  popularTags = ['work', 'secret', 'temp', 'api', 'notes'];

  selectPresetTag(tag: string) {
    this.currentTag.set(tag);
    this.tagInputOpen.set(false);
    this.uiStore.triggerToast(`🏷️ Tag "#${tag}" attached to item`);
  }

  toggleTagInput(e?: Event) {
    if (e) e.stopPropagation();
    this.tagInputOpen.update(v => !v);
    if (this.tagInputOpen()) {
      this.retentionPopoverOpen.set(false);
      this.uploadMenuOpen.set(false);
      this.tagDraft.set(this.currentTag());
      setTimeout(() => this.tagInputRef?.nativeElement?.focus(), 60);
    }
  }

  saveTagFromDraft() {
    const raw = this.tagDraft().trim().replace(/^#+/, '');
    this.currentTag.set(raw);
    this.tagInputOpen.set(false);
    if (raw) {
      this.uiStore.triggerToast(`🏷️ Tag "#${raw}" attached to item`);
    }
  }

  removeTag(e?: Event) {
    if (e) e.stopPropagation();
    this.currentTag.set('');
    this.tagDraft.set('');
    this.tagInputOpen.set(false);
  }

  toggleManualExpand() {
    const el = this.textareaRef?.nativeElement;
    if (this.isExpanded()) {
      this.isExpanded.set(false);
      this.isManualExpanded.set(false);
      if (el) {
        el.style.overflow = 'hidden';
        const LINE_HEIGHT = 19;
        const COLLAPSED_MAX = LINE_HEIGHT * 5 + 8;
        el.style.height = 'auto';
        const capped = Math.min(el.scrollHeight, COLLAPSED_MAX);
        el.style.height = capped + 'px';
      }
    } else {
      this.isExpanded.set(true);
      this.isManualExpanded.set(true);
      if (el) {
        const LINE_HEIGHT = 19;
        const EXPANDED_MAX = LINE_HEIGHT * 18 + 8;
        el.style.height = 'auto';
        const scrollH = el.scrollHeight;
        const capped = Math.min(scrollH, EXPANDED_MAX);
        el.style.height = capped + 'px';
        el.style.overflow = scrollH > EXPANDED_MAX ? 'auto' : 'hidden';
      }
    }
  }

  collapseToPill() {
    this.isExpanded.set(false);
    this.isManualExpanded.set(false);
    const el = this.textareaRef?.nativeElement;
    if (el) {
      el.style.overflow = 'hidden';
      const LINE_HEIGHT = 19;
      const COLLAPSED_MAX = LINE_HEIGHT * 5 + 8;
      el.style.height = 'auto';
      const capped = Math.min(el.scrollHeight, COLLAPSED_MAX);
      el.style.height = capped + 'px';
    }
  }

  async pasteFromClipboardDirectly(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        this.uiStore.triggerToast('⚠️ Clipboard API not supported');
        return;
      }

      // Check if files exist in clipboard first
      if (navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/') || type.startsWith('application/')) {
                const blob = await item.getType(type);
                const ext = type === 'application/zip' ? 'zip' : (type.split('/')[1] || 'bin');
                const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type });
                this.handleFile(file);
                this.uiStore.triggerToast(`📋 Pasted file (${this.formatBytes(file.size)})`);
                return;
              }
            }
          }
        } catch { }
      }

      let text = '';
      if (navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      }
      if (!text || !text.trim()) {
        this.uiStore.triggerToast('ℹ️ System clipboard is empty');
        return;
      }

      const cur = this.payloadText || '';
      const el = this.textareaRef?.nativeElement;
      const start = el ? el.selectionStart : cur.length;
      const end = el ? el.selectionEnd : cur.length;
      const newText = cur.slice(0, start) + text + cur.slice(end);

      this.payloadText = newText;
      this.dismissGhostSuggestion();
      this.recordHistory(newText, true, 'paste');

      const res = await this.clipboard.classifyAsync(newText);
      this.classified.set(res);
      this.onTextChange(false);
      this.checkAndApplyAutoExpand(newText);

      setTimeout(() => {
        if (el) {
          const newPos = start + text.length;
          el.selectionStart = newPos;
          el.selectionEnd = newPos;
          el.focus();
        }
      }, 0);

      this.uiStore.triggerToast('📋 Content pasted from clipboard');
    } catch (err) {
      this.uiStore.triggerToast('⚠️ Clipboard access denied by browser');
    }
  }

  checkAndApplyAutoExpand(text: string) {
    const el = this.textareaRef?.nativeElement;
    // Count visual lines using scrollHeight vs line-height
    let visualLines = 1;
    if (el) {
      const lineH = parseFloat(getComputedStyle(el).lineHeight) || 19;
      visualLines = Math.round(el.scrollHeight / lineH);
    } else {
      visualLines = (text || '').split('\n').length;
    }
    this.composerLineCount.set(visualLines);

    if (this.isManualExpanded()) return;
    // Threshold: 5 lines triggers expand icon; auto-expand state at 5+
    const isLong = visualLines >= 5;
    if (isLong && !this.isExpanded()) {
      this.isExpanded.set(true);
    } else if (!isLong && this.isExpanded()) {
      this.isExpanded.set(false);
    }
  }

  /**
   * Returns true if the vault item originates from the current device.
   */
  isCurrentDeviceItem(item: AirVaultItem): boolean {
    const cur = this.deviceService.currentDevice();
    return item.senderDeviceId === cur.id || item.originDeviceId === cur.id;
  }

  /**
   * Consecutive-message grouping: Returns true if this item should display the sender header.
   * If the same sender posts 2+ items within 60 seconds, the header is shown only for the first item.
   */
  isFirstInGroup(index: number): boolean {
    if (index === 0) return true;
    const items = this.displayedVaultItems();
    const current = items[index];
    const prev = items[index - 1];
    if (!current || !prev) return true;

    const currentSender = this.getSenderKey(current);
    const prevSender = this.getSenderKey(prev);

    if (currentSender !== prevSender) return true;

    const currentTs = typeof current.timestamp === 'number' ? current.timestamp : (current.timestamp ? new Date(current.timestamp).getTime() : 0);
    const prevTs = typeof prev.timestamp === 'number' ? prev.timestamp : (prev.timestamp ? new Date(prev.timestamp).getTime() : 0);

    const timeDiff = Math.abs(currentTs - prevTs);
    return timeDiff >= 60_000;
  }

  getSenderKey(item: AirVaultItem): string {
    return item.senderDeviceId || item.originDeviceId || item.originOwnerId || item.senderDeviceName || 'unknown';
  }

  getSenderDisplayName(item: AirVaultItem): string {
    const isLocal = this.isCurrentDeviceItem(item);
    if (isLocal) {
      const cur = this.deviceService.currentDevice();
      return cur.username ? `@${cur.username.replace(/^@/, '')}` : (cur.name?.startsWith('@') ? cur.name : `@${cur.name || 'local'}`);
    }
    if (item.originOwnerId) {
      return item.originOwnerId.startsWith('@') ? item.originOwnerId : `@${item.originOwnerId}`;
    }
    if (item.senderDeviceName) {
      return item.senderDeviceName.startsWith('@') ? item.senderDeviceName : `@${item.senderDeviceName}`;
    }
    const paired = this.pairedDevices().find(d => d.id === item.senderDeviceId || d.id === item.originDeviceId);
    if (paired) {
      return paired.username ? `@${paired.username.replace(/^@/, '')}` : (paired.name?.startsWith('@') ? paired.name : `@${paired.name}`);
    }
    return '@device';
  }

  getSenderAccent(item: AirVaultItem): string {
    if (item.senderDeviceAccent) return item.senderDeviceAccent;
    if (item.author_color || item.authorColor) return item.author_color || item.authorColor || '#10B981';
    const isLocal = this.isCurrentDeviceItem(item);
    if (isLocal) {
      const cur = this.deviceService.currentDevice();
      return cur.accentColor || '#2196F3';
    }
    const paired = this.pairedDevices().find(d => d.id === item.senderDeviceId || d.id === item.originDeviceId);
    if (paired?.accentColor) return paired.accentColor;
    return this.colorService.getColorForIdentity(item.senderDeviceName || item.senderDeviceId || 'peer', undefined);
  }

  /**
   * Legacy alias for getSenderAccent
   */
  getBubbleAccent(item: AirVaultItem): string {
    return this.getSenderAccent(item);
  }

  /**
   * Auto-grows the chat composer textarea to fit content and adjusts expand state.
   */
  onComposerInput(event: Event): void {
    this.autoResizeTextarea();
  }

  autoResizeTextarea(): void {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;
    // Reset to auto to measure true scrollHeight
    el.style.overflow = 'hidden';
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    const LINE_HEIGHT = 19; // ~13px font * 1.45 line-height
    // 5 lines cap = 95px; 18 lines cap = 342px (+ padding)
    const COLLAPSED_MAX = LINE_HEIGHT * 5 + 8;  // ~103px
    const EXPANDED_MAX  = LINE_HEIGHT * 18 + 8; // ~350px
    if (this.isManualExpanded()) {
      const capped = Math.min(scrollH, EXPANDED_MAX);
      el.style.height = capped + 'px';
      // Only allow scroll inside textarea once we hit absolute max
      el.style.overflow = scrollH > EXPANDED_MAX ? 'auto' : 'hidden';
    } else {
      const capped = Math.min(scrollH, COLLAPSED_MAX);
      el.style.height = capped + 'px';
      el.style.overflow = 'hidden'; // never scroll in collapsed mode
    }
    this.checkAndApplyAutoExpand(el.value);
  }


  stagedText = signal<string>(this.loadInitialStagedText());
  get payloadText(): string { return this.stagedText(); }
  set payloadText(v: string) {
    this.stagedText.set(v || '');
    this.clipboardStore.stagedText.set(v || '');
  }
  isDragging = signal<boolean>(false);
  classified = signal<ClassifiedContent | null>(null);
  isLargePayload = signal<boolean>(false);
  formattedPayloadSize = signal<string>('');
  forceFullFidelity = signal<boolean>(false);
  largeFileWarning = signal<string>('');

  // Pointer / Cursor-Anchored Inline Paste Loader
  isProcessingPaste = signal<boolean>(false);
  pasteLoaderPos = signal<{ x: number; y: number }>({ x: 120, y: 80 });
  pasteLoaderSize = signal<string>('');
  pasteProgress = signal<number>(0);
  private lastPointerPos = { x: 120, y: 80 };

  // Ghost Text / Inline Clipboard Suggestion (Tab-to-Insert)
  ghostSuggestion = signal<string>('');
  ghostPrefix = signal<string>('');
  isInputFocused = signal<boolean>(false);

  // Word-level Undo / Redo Manager
  private undoManager = new WordUndoManager(this.payloadText);
  canUndo = signal<boolean>(false);
  canRedo = signal<boolean>(false);
  private isHistoryNavigating = false;

  // Resizable Rail Width State (default 330px, min 330px, max 540px)
  railWidth = signal<number>(330);
  private isResizing = false;
  private startX = 0;
  private startWidth = 330;

  private debounceTimer: any;

  // ── Live Composer Entity Detection (inline highlights + hover popovers) ──
  composerMatches = signal<ComposerMatch[]>([]);
  activePopoverMatch = signal<ComposerMatch | null>(null);
  composerPopoverPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  constructor() {
    // Restore draft from local IndexedDB asynchronously — never from remote
    // We use a short delay to let the DB open (initIndexedDb fires in storage constructor)
    setTimeout(async () => {
      const draft = await this.storageService.loadDraft();
      if (draft && !this.payloadText.trim()) {
        this.payloadText = draft;
        this.onTextChange(false);
      }
    }, 300);

    if (this.payloadText.trim()) {
      setTimeout(() => this.onTextChange(false), 50);
    }
    this.initClipboardFocusListener();
    this.initDraftHandoffListeners();
  }
  private clipboardFocusHandler: (() => void) | null = null;
  private clipboardVisibilityHandler: (() => void) | null = null;
  private clipboardFocusInHandler: (() => void) | null = null;
  private clipboardFocusTimeout: any = null;

  private initClipboardFocusListener() {
    if (typeof window !== 'undefined') {
      this.clipboardFocusHandler = () => {
        if (!this.prefService.prefs().autoCaptureOnFocus) {
          this.dismissGhostSuggestion();
          return;
        }
        // Direct synchronous check on focus to preserve transient activation in Safari
        this.checkClipboardForSuggestion();
      };

      this.clipboardVisibilityHandler = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (!this.prefService.prefs().autoCaptureOnFocus) {
            this.dismissGhostSuggestion();
            return;
          }
          this.checkClipboardForSuggestion();
        }
      };

      this.clipboardFocusInHandler = () => {
        if (!this.prefService.prefs().autoCaptureOnFocus) {
          this.dismissGhostSuggestion();
          return;
        }
        if (!this.ghostSuggestion()) {
          this.checkClipboardForSuggestion();
        }
      };

      window.addEventListener('focus', this.clipboardFocusHandler);
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.clipboardVisibilityHandler);
        window.addEventListener('focusin', this.clipboardFocusInHandler);
      }

      // Listen for text copied within Acklet / AirVault (e.g. card copy, auto-copy incoming items)
      this.subs.push(
        this.clipboard.onClipboardTextCopied.subscribe((copiedText: string) => {
          if (this.prefService.prefs().autoCaptureOnFocus && copiedText) {
            this.checkClipboardForSuggestion(copiedText);
          }
        })
      );
    }
  }

  private loadInitialStagedText(): string {
    return '';
  }

  /**
   * Persists the in-progress draft to local IndexedDB only (via storageService.saveDraft).
   * This is NOT synced to other devices — it is purely local crash/refresh recovery.
   */
  private saveStagedText(text: string) {
    // Fire-and-forget: async IndexedDB write, non-blocking
    this.storageService.saveDraft(text);
  }

  onStartResize(e: MouseEvent) {
    e.preventDefault();
    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.railWidth();

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!this.isResizing) return;
      const delta = this.startX - moveEvent.clientX;
      const maxWidth = typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.65) : 800;
      const newWidth = Math.min(maxWidth, Math.max(330, this.startWidth + delta));
      this.railWidth.set(newWidth);
    };

    const onMouseUp = () => {
      this.isResizing = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  private remoteSyncDebounceTimer: any;

  ngAfterViewInit() {
    // Initialization complete
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.remoteSyncDebounceTimer) clearTimeout(this.remoteSyncDebounceTimer);
    if (this.draftAutoDismissTimer) clearTimeout(this.draftAutoDismissTimer);
    if (this.draftBroadcastThrottleTimer) clearTimeout(this.draftBroadcastThrottleTimer);
    if (this.clipboardFocusTimeout) clearTimeout(this.clipboardFocusTimeout);
    if (typeof window !== 'undefined') {
      if (this.clipboardFocusHandler) window.removeEventListener('focus', this.clipboardFocusHandler);
      if (this.clipboardFocusInHandler) window.removeEventListener('focusin', this.clipboardFocusInHandler);
      if (this.clipboardVisibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this.clipboardVisibilityHandler);
      }
    }
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.activeWorkers.forEach(w => w.terminate());
    this.activeWorkers.clear();
  }

  loadSample(type: 'code' | 'json' | 'url' | 'phone') {
    this.recordHistory(this.payloadText);
    if (type === 'code') {
      this.payloadText = `// P2P ECDH Derivation Session\nconst e2eeSession = await airVaultCrypto.deriveKey(peerPublicKey);\nconsole.log('Session initialized:', e2eeSession.keyId);`;
    } else if (type === 'json') {
      this.payloadText = JSON.stringify({
        protocol: 'AirVault E2EE',
        algorithm: 'AES-GCM-256',
        curve: 'ECDH P-256',
        timestamp: Date.now(),
        status: 'ready'
      }, null, 2);
    } else if (type === 'phone') {
      this.payloadText = '+1 (415) 555-0198';
    } else {
      this.payloadText = 'https://acklet.com/tools/app/airvault';
    }
    this.onTextChange();
  }

  // ── Cross-Device Draft Handoff State ──
  remoteDraft = signal<DraftActivityPayload | null>(null);
  showHandoffBanner = signal<boolean>(false);
  private draftActivityTimestamps = new Map<string, number[]>(); // deviceId -> timestamps array
  private draftAutoDismissTimer: any = null;
  private draftBroadcastThrottleTimer: any = null;
  private lastDraftBroadcastTime = 0;
  private locallyDismissedDrafts = new Set<string>(); // deviceId_timestamp key

  private initDraftHandoffListeners() {
    // 1. Listen for incoming DRAFT_ACTIVITY from peers
    this.subs.push(
      this.syncService.onDraftActivity.subscribe(({ draft, senderDevice }) => {
        const localText = this.payloadText || '';
        const cur = this.deviceService.currentDevice();
        if (!draft || draft.deviceId === cur.id) return;

        // Rule 4(a) & 4(b): Message from different device and local staging is currently empty
        if (localText.trim().length > 0) return;

        // Check if user dismissed this draft locally
        const dismissKey = `${draft.deviceId}_${draft.lastKeystrokeAt}`;
        if (this.locallyDismissedDrafts.has(dismissKey)) return;

        // Rule 4(c): Anti-flicker threshold (at least 2 keystrokes/activities within 2000ms)
        const now = Date.now();
        const existingTimes = (this.draftActivityTimestamps.get(draft.deviceId) || []).filter(t => (now - t) <= 2000);
        existingTimes.push(now);
        this.draftActivityTimestamps.set(draft.deviceId, existingTimes);

        if (existingTimes.length >= 2) {
          this.remoteDraft.set(draft);
          this.showHandoffBanner.set(true);

          // Auto-hide after 20s of inactivity
          if (this.draftAutoDismissTimer) clearTimeout(this.draftAutoDismissTimer);
          this.draftAutoDismissTimer = setTimeout(() => {
            this.showHandoffBanner.set(false);
            this.remoteDraft.set(null);
          }, 20000);
        }
      })
    );

    // 2. Listen for DRAFT_FINALIZED from peers
    this.subs.push(
      this.syncService.onDraftFinalized.subscribe(({ deviceId }) => {
        const curDraft = this.remoteDraft();
        if (curDraft && curDraft.deviceId === deviceId) {
          this.showHandoffBanner.set(false);
          this.remoteDraft.set(null);
          if (this.draftAutoDismissTimer) clearTimeout(this.draftAutoDismissTimer);
        }
      })
    );

    // 3. Listen for DRAFT_REQUEST from peers and respond with full current draft
    this.subs.push(
      this.syncService.onDraftRequest.subscribe(({ senderDevice, requestId }) => {
        if (senderDevice && senderDevice.id) {
          const fullContent = this.payloadText || '';
          const lineBlameMap = this.liveBlameMap();
          this.syncService.sendDraftResponse(senderDevice.id, requestId, fullContent, lineBlameMap);
        }
      })
    );

    // 4. Listen for DRAFT_RESPONSE and populate local composer
    this.subs.push(
      this.syncService.onDraftResponse.subscribe(({ senderDevice, requestId, fullContent, lineBlameMap }) => {
        if (fullContent) {
          this.payloadText = fullContent;
          this.saveStagedText(fullContent);
          if (lineBlameMap && lineBlameMap.length > 0) {
            this.liveBlameMap.set(lineBlameMap);
          }
          this.undoManager.reset(fullContent, lineBlameMap || []);
          this.updateUndoRedoSignals();
          this.onTextChange(false);
          this.showHandoffBanner.set(false);
          this.remoteDraft.set(null);
          this.uiStore.triggerToast(`Pulled draft from ${senderDevice?.username ? '@' + senderDevice.username.replace(/^@/, '') : (senderDevice?.name || 'device')}`);
        }
      })
    );
  }

  onContinueDraft(draft: DraftActivityPayload) {
    if (!draft || !draft.deviceId) return;

    // Rule 6: If local staging already has content, confirm before overwriting
    if (this.payloadText.trim().length > 0) {
      const confirmOverwrite = window.confirm('Local staging area has unsaved text. Overwrite with draft from ' + draft.username + '?');
      if (!confirmOverwrite) return;
    }

    // Request full draft content over secure channel
    this.syncService.requestDraftFromDevice(draft.deviceId);
  }

  onDismissDraftHandoff() {
    const d = this.remoteDraft();
    if (d) {
      const dismissKey = `${d.deviceId}_${d.lastKeystrokeAt}`;
      this.locallyDismissedDrafts.add(dismissKey);
    }
    this.showHandoffBanner.set(false);
    this.remoteDraft.set(null);
    if (this.draftAutoDismissTimer) clearTimeout(this.draftAutoDismissTimer);
  }

  onTextChange(pushHistory = true) {
    const text = this.payloadText || '';
    this.saveStagedText(text);

    if (pushHistory && !this.isHistoryNavigating) {
      this.recordHistory(text);
    }

    const threshold = checkInputThreshold('airvault', text);
    this.isLargePayload.set(threshold.isLarge);
    this.formattedPayloadSize.set(threshold.formattedSize);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (!text.trim()) {
      this.classified.set(null);
      this.composerMatches.set([]);
      this.activePopoverMatch.set(null);
      this.syncService.broadcastDraftFinalized();
      return;
    }

    // Debounce draft activity broadcast (at most once per 800ms while typing)
    const now = Date.now();
    if (now - this.lastDraftBroadcastTime >= 800) {
      this.lastDraftBroadcastTime = now;
      const masked = maskSensitivePreview(text, 80);
      this.syncService.broadcastDraftActivity(masked, now);
    } else {
      if (this.draftBroadcastThrottleTimer) clearTimeout(this.draftBroadcastThrottleTimer);
      this.draftBroadcastThrottleTimer = setTimeout(() => {
        this.lastDraftBroadcastTime = Date.now();
        const masked = maskSensitivePreview(this.payloadText || '', 80);
        this.syncService.broadcastDraftActivity(masked, this.lastDraftBroadcastTime);
      }, 800 - (now - this.lastDraftBroadcastTime));
    }

    // Synchronously adjust textarea height and auto-expand state
    this.autoResizeTextarea();

    // Debounce typing (400ms after paste/keystroke)
    this.debounceTimer = setTimeout(async () => {
      if (threshold.isLarge && !this.forceFullFidelity()) {
        this.classified.set({
          category: 'text',
          raw: text,
          isSensitive: false,
          byteSize: threshold.byteSize
        });
      } else {
        const res = await this.clipboard.classifyAsync(text);
        this.classified.set(res);
      }

      // Run live composer entity detection (inline highlights)
      this.runComposerDetection(text);

      // NOTE: Raw live-sync of the staging buffer is intentionally removed.
      // The composer text is 100% local until the user explicitly Beams it.
      // DRAFT_ACTIVITY (masked preview, 800ms throttled) is the only signal sent while typing.
    }, 400);
  }

  /**
   * Scans the current composer text for all recognizable entity spans
   * (URL, phone, address) and updates composerMatches.
   * For texts ≤ 10 KB, runs synchronously on the main thread (instant).
   * For larger texts, delegates to the airvault worker off-thread.
   * Does NOT duplicate detection logic — imports scanAllMatches() from
   * airvault-action-detector.ts which is the single source of truth.
   */
  private runComposerDetection(text: string) {
    if (!text || !text.trim()) {
      this.composerMatches.set([]);
      return;
    }
    // scanAllMatches() gates itself at 50 KB — sync is fast enough for all
    // typical clipboard payloads. No separate worker invocation needed.
    const matches = scanAllMatches(text);
    this.composerMatches.set(matches);
  }

  private popoverDismissTimer: any = null;

  /**
   * Called when the user hovers over an inline detection highlight span in the
   * composer backdrop. Anchors the action popover to the span element.
   */
  onComposerMatchHover(match: ComposerMatch, event: MouseEvent) {
    if (this.popoverDismissTimer) {
      clearTimeout(this.popoverDismissTimer);
      this.popoverDismissTimer = null;
    }

    const span = event.currentTarget as HTMLElement;
    const container = span.closest('.composer-textarea-container') as HTMLElement;
    if (!container) { this.activePopoverMatch.set(match); return; }
    const spanRect = span.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const relativeSpanTop = spanRect.top - containerRect.top;
    const relativeSpanLeft = spanRect.left - containerRect.left;

    // If span is near the top (< 45px), place the popover below the span so it is fully visible and never hidden!
    let top: number;
    if (relativeSpanTop < 45) {
      top = relativeSpanTop + spanRect.height + 4; // below span with slight overlap
    } else {
      top = relativeSpanTop - 38; // above span
    }

    const left = Math.max(6, Math.min(containerRect.width - 280, relativeSpanLeft));
    this.composerPopoverPos.set({ top, left });
    this.activePopoverMatch.set(match);
  }

  onComposerMatchLeave(event: MouseEvent) {
    if (this.popoverDismissTimer) clearTimeout(this.popoverDismissTimer);
    // Generous 400ms grace window so moving cursor into the popover buttons never disappears
    this.popoverDismissTimer = setTimeout(() => {
      this.activePopoverMatch.set(null);
    }, 400);
  }

  onComposerPopoverEnter() {
    if (this.popoverDismissTimer) {
      clearTimeout(this.popoverDismissTimer);
      this.popoverDismissTimer = null;
    }
  }

  onComposerPopoverLeave() {
    if (this.popoverDismissTimer) clearTimeout(this.popoverDismissTimer);
    this.popoverDismissTimer = setTimeout(() => {
      this.activePopoverMatch.set(null);
    }, 250);
  }

  /**
   * Splits the composer text into plain + highlighted segments for the
   * backdrop overlay. Each detected ComposerMatch range becomes a
   * .av-detection-span element; gaps between matches are plain text spans.
   */
  composerBackdropSegments = computed(() => {
    const text = this.stagedText();
    const matches = this.composerMatches();
    if (!text) return [{ text, isMatch: false, match: null as ComposerMatch | null, startOffset: 0 }];
    if (!matches.length) return [{ text, isMatch: false, match: null as ComposerMatch | null, startOffset: 0 }];

    const segments: { text: string; isMatch: boolean; match: ComposerMatch | null; startOffset: number }[] = [];
    let cursor = 0;
    for (const m of matches) {
      if (m.start > cursor) {
        segments.push({ text: text.slice(cursor, m.start), isMatch: false, match: null, startOffset: cursor });
      }
      segments.push({ text: text.slice(m.start, m.end), isMatch: true, match: m, startOffset: m.start });
      cursor = m.end;
    }
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), isMatch: false, match: null, startOffset: cursor });
    }
    return segments;
  });

  /** Updates clipboard staging editor when live typing/pasting is received from a paired device */
  updateLiveTextFromRemote(text: string, senderDevice: AirVaultDevice, remoteBlameMap?: LineBlameEntry[]) {
    // Security & Data Isolation Guard: Verify sender is directly paired and sync-enabled
    const isAuthorized = this.pairedDevices().some(d =>
      (d.id === senderDevice?.id || (senderDevice?.username && d.username && d.username.toLowerCase() === senderDevice.username.toLowerCase())) &&
      d.status !== 'revoked' &&
      d.syncEnabled !== false
    );
    if (!isAuthorized) {
      AirVaultLogger.warn(`[AirVault Staging] 🛡️ Blocked live text from unauthorized peer:`, senderDevice?.name);
      return;
    }

    const localText = this.payloadText || '';
    const localBlame = this.liveBlameMap() || [];

    const senderId = senderDevice.username || senderDevice.id;
    const senderAuthor = senderDevice.username ? (senderDevice.username.startsWith('@') ? senderDevice.username : `@${senderDevice.username}`) : (senderDevice.name || 'Remote');
    const senderColor = this.colorService.getColorForIdentity(senderId);

    const normalizedRemoteBlame = (remoteBlameMap && remoteBlameMap.length === text.split('\n').length)
      ? remoteBlameMap
      : this.blameService.buildInitialBlame(text, senderId, senderColor, senderAuthor);

    // Filter out any lines authored by non-paired 3rd parties before merging
    const filteredRemote = this.blameService.filterAuthorizedLines(
      text,
      normalizedRemoteBlame,
      this.deviceService.currentDevice(),
      this.pairedDevices()
    );

    // Merge concurrent changes respecting user setting for author text deletions
    const allowDeletions = this.prefService.prefs().syncTextDeletions !== false;
    const merged = this.blameService.mergeConcurrentTextsAndBlame(
      localText,
      localBlame,
      filteredRemote.text,
      filteredRemote.blame,
      senderId,
      senderAuthor,
      senderColor,
      allowDeletions
    );

    // Ensure final merged content strictly contains ONLY lines authorized for this device
    const finalFiltered = this.blameService.filterAuthorizedLines(
      merged.text,
      merged.blame,
      this.deviceService.currentDevice(),
      this.pairedDevices()
    );

    const mergedText = finalFiltered.text;
    const finalBlame = finalFiltered.blame;

    if (this.payloadText === mergedText) return;

    this.payloadText = mergedText;
    this.saveStagedText(mergedText);
    this.liveBlameMap.set(finalBlame);
    this.undoManager.reset(mergedText, finalBlame);
    this.updateUndoRedoSignals();

    // Check thresholds & classify locally without triggering echo-broadcast
    const threshold = checkInputThreshold('airvault', mergedText);
    this.isLargePayload.set(threshold.isLarge);
    this.formattedPayloadSize.set(threshold.formattedSize);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (!mergedText.trim()) {
      this.classified.set(null);
    } else {
      this.clipboard.classifyAsync(mergedText).then(res => {
        if (this.payloadText === mergedText) {
          this.classified.set(res);
        }
      });
    }
    // No consensus re-broadcast: the staging composer is 100% local until Beam.
    // Feature 23/25 shared-item sync (already committed cards) uses its own pipeline.
  }

  recordHistory(
    currentText: string,
    isAtomic: boolean = false,
    type: 'paste' | 'cut' | 'suggestion' | 'delete' = 'paste',
    authorDevice?: AirVaultDevice
  ) {
    const el = this.textareaRef?.nativeElement;
    const cursorPos = el ? el.selectionStart : currentText.length;
    const targetDev = authorDevice || this.deviceService.currentDevice();
    const isOwner = targetDev.isCurrent || targetDev.id === this.deviceService.currentDevice().id;
    const curId = targetDev.username || targetDev.id;
    const curAuthor = targetDev.username ? (targetDev.username.startsWith('@') ? targetDev.username : `@${targetDev.username}`) : (targetDev.name || 'User');
    const curColor = this.colorService.getColorForIdentity(curAuthor || curId, targetDev.accentColor, isOwner);

    // Compute updated blame map via line diffing
    const prevText = this.undoManager.getCurrentText();
    const prevBlame = this.liveBlameMap();
    const newBlame = this.blameService.reconcile(
      prevText,
      prevBlame,
      currentText,
      curId,
      curColor,
      curAuthor,
      Date.now()
    );
    this.liveBlameMap.set(newBlame);

    if (isAtomic) {
      this.undoManager.recordAtomicOperation(currentText, type, cursorPos, newBlame);
    } else {
      this.undoManager.recordTyping(currentText, cursorPos, newBlame);
    }
    this.updateUndoRedoSignals();
  }

  undo() {
    const prevText = this.undoManager.undo();
    if (prevText === null) return;
    this.isHistoryNavigating = true;
    this.payloadText = prevText;
    const restoredBlame = this.undoManager.getCurrentBlameMap();
    if (restoredBlame) {
      this.liveBlameMap.set(restoredBlame);
    }
    this.saveStagedText(prevText);
    this.onTextChange(false);
    this.updateUndoRedoSignals();
    this.isHistoryNavigating = false;
  }

  redo() {
    const nextText = this.undoManager.redo();
    if (nextText === null) return;
    this.isHistoryNavigating = true;
    this.payloadText = nextText;
    const restoredBlame = this.undoManager.getCurrentBlameMap();
    if (restoredBlame) {
      this.liveBlameMap.set(restoredBlame);
    }
    this.saveStagedText(nextText);
    this.onTextChange(false);
    this.updateUndoRedoSignals();
    this.isHistoryNavigating = false;
  }

  private updateUndoRedoSignals() {
    this.canUndo.set(this.undoManager.canUndo());
    this.canRedo.set(this.undoManager.canRedo());
  }

  enableFullProcessing() {
    this.forceFullFidelity.set(true);
    this.onTextChange();
  }

  onMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.lastPointerPos = {
      x: Math.max(30, Math.min(rect.width - 180, e.clientX - rect.left)),
      y: Math.max(40, Math.min(rect.height - 50, e.clientY - rect.top))
    };
  }

  async onPasteClipboard(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) return;

      // 1. Check if clipboard contains binary/file items (images, zip, pdf)
      if (navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            for (const type of item.types) {
              if (type.startsWith('image/') || type.startsWith('application/')) {
                const blob = await item.getType(type);
                const ext = type === 'application/zip' ? 'zip' : (type.split('/')[1] || 'bin');
                const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type });
                this.pasteLoaderPos.set({ x: 120, y: 80 });
                this.pasteLoaderSize.set(this.formatBytes(file.size));
                this.pasteProgress.set(10);
                this.isProcessingPaste.set(true);
                this.handleFile(file);
                return;
              }
            }
          }
        } catch { }
      }

      // 2. Read text payload (use full pending text if ghost suggestion is active, or read directly from clipboard)
      let text = this.fullPendingClipText;
      if (!text && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }

      if (!text || !text.trim()) return;

      // If large text/bytecode (>5 KB), offload to Web Worker with pointer progress bar
      if (text.length > 5000) {
        const byteSize = new Blob([text]).size;
        this.pasteLoaderSize.set(this.formatBytes(byteSize));
        this.pasteProgress.set(15);
        this.pasteLoaderPos.set({ x: 140, y: 70 });
        this.isProcessingPaste.set(true);

        const isZipBytecode = text.startsWith('PK') || text.startsWith('data:application/zip');
        const filename = isZipBytecode ? `pasted_archive_${Date.now()}.zip` : `pasted_payload_${Date.now()}.txt`;
        const file = new File([text], filename, {
          type: isZipBytecode ? 'application/zip' : 'text/plain'
        });
        this.handleFile(file);
        return;
      }

      const el = this.textareaRef?.nativeElement;
      const current = this.payloadText || '';
      const start = el ? el.selectionStart : current.length;
      const end = el ? el.selectionEnd : current.length;
      const newText = current.slice(0, start) + text + current.slice(end);

      this.payloadText = newText;
      this.dismissGhostSuggestion();
      this.recordHistory(newText, true, 'paste');

      const res = await this.clipboard.classifyAsync(newText);
      this.classified.set(res);
      this.onTextChange(false);

      if (this.prefService.prefs().instantBeamOnPaste) {
        this.triggerBeam();
        return;
      }

      setTimeout(() => {
        if (el) {
          const newPos = start + text.length;
          el.selectionStart = newPos;
          el.selectionEnd = newPos;
          el.focus();
        }
      }, 0);
    } catch {
      // Permission denied
    }
  }

  onInputFocus() {
    this.isInputFocused.set(true);
    if (this.prefService.prefs().autoCaptureOnFocus) {
      this.checkClipboardForSuggestion();
    } else {
      this.dismissGhostSuggestion();
    }
  }

  onInputBlur() {
    // Delay blur slightly so click/tab actions can finish
    setTimeout(() => {
      this.isInputFocused.set(false);
      this.dismissGhostSuggestion();
    }, 300);
  }

  onInputClick() {
    // Dismiss suggestion on explicit mouse click/cursor move
    if (this.ghostSuggestion()) {
      this.dismissGhostSuggestion();
    }
  }

  onKeyDown(e: KeyboardEvent) {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    // 0. Intercept Cmd/Ctrl + Enter to trigger beam
    if (isCmdOrCtrl && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.triggerBeam();
      return;
    }

    // 1. Intercept Undo (Cmd/Ctrl + Z)
    if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.stopPropagation();
      this.undo();
      return;
    }

    // 2. Intercept Redo (Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y)
    if ((isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z') || (isCmdOrCtrl && e.key.toLowerCase() === 'y')) {
      e.preventDefault();
      e.stopPropagation();
      this.redo();
      return;
    }

    // 3. Ghost suggestion key navigation
    if (this.ghostSuggestion()) {
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.acceptGhostSuggestion();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.dismissGhostSuggestion();
        return;
      }
      // Any typing key dismisses ghost suggestion
      if (!isCmdOrCtrl && e.key.length === 1) {
        this.dismissGhostSuggestion();
      }
    }
  }

  async checkClipboardForSuggestion(candidateText?: string) {
    try {
      // 1. Respect Auto-Capture on Focus state
      if (!this.prefService.prefs().autoCaptureOnFocus) {
        this.dismissGhostSuggestion();
        return;
      }

      let clipText = candidateText;
      if (!clipText) {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
          try {
            clipText = await navigator.clipboard.readText();
          } catch {
            // Safari / restricted permission fallback: use in-session copied text
            clipText = this.clipboard.lastCopiedText();
          }
        } else {
          clipText = this.clipboard.lastCopiedText();
        }
      }

      if (!clipText || !clipText.trim()) {
        this.dismissGhostSuggestion();
        return;
      }

      // Do not suggest if it's already exactly the same text in staging
      const currentText = this.payloadText || '';
      if (currentText.trim() === clipText.trim()) {
        this.dismissGhostSuggestion();
        return;
      }

      // Categorize: only text, code, url, json (exclude images/files/videos/archives)
      const classified = this.clipboard.classify(clipText);
      const excludedCategories = ['image', 'video', 'file', 'audio', 'pdf', 'spreadsheet', 'archive', 'font'];
      if (excludedCategories.includes(classified.category)) {
        return;
      }

      // Truncate preview text cleanly (single line preview up to 90 chars) while preserving full text for insertion
      const cleanSnippet = clipText.replace(/\s+/g, ' ').trim();
      const visualPreview = cleanSnippet.length > 90
        ? cleanSnippet.slice(0, 90) + '…'
        : cleanSnippet;

      this.fullPendingClipText = clipText;
      this.ghostSuggestion.set(visualPreview);
    } catch {
      // Permission rejected or not supported
    }
  }

  public fullPendingClipText = '';
  acceptGhostSuggestion() {
    const suggestion = this.fullPendingClipText || this.ghostSuggestion();
    if (!suggestion) return;

    const el = this.textareaRef?.nativeElement;
    const currentText = this.payloadText || '';
    const start = el ? el.selectionStart : currentText.length;
    const end = el ? el.selectionEnd : currentText.length;

    const textBefore = currentText.slice(0, start);
    const textAfter = currentText.slice(end);

    // If there is preceding text that doesn't end with a newline, and cursor is at end of line
    const needsLeadingNewline = textBefore.length > 0 && !textBefore.endsWith('\n') && !suggestion.startsWith('\n');
    const insertedText = (needsLeadingNewline ? '\n' : '') + suggestion;

    // Insert suggestion at cursor position
    const newText = textBefore + insertedText + textAfter;
    this.payloadText = newText;
    this.dismissGhostSuggestion();
    this.recordHistory(newText, true, 'suggestion');

    // Trigger normal tile creation pipeline
    this.onTextChange(false);

    if (this.prefService.prefs().instantBeamOnPaste) {
      this.triggerBeam();
      return;
    }

    setTimeout(() => {
      if (el) {
        const newPos = start + insertedText.length;
        el.selectionStart = newPos;
        el.selectionEnd = newPos;
        el.focus();
      }
    }, 0);
  }

  dismissGhostSuggestion() {
    this.ghostSuggestion.set('');
    this.ghostPrefix.set('');
    this.fullPendingClipText = '';
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }

  async onRefreshClipboard(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    this.storageService.isRefreshing.set(true);
    await this.storageService.refreshFromStorage();
    await this.syncService.syncAllDevices();
    setTimeout(() => {
      this.storageService.isRefreshing.set(false);
    }, 650);
  }

  clearText(e?: Event) {
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    this.payloadText = '';
    if (this.textareaRef?.nativeElement) {
      this.textareaRef.nativeElement.value = '';
      this.textareaRef.nativeElement.style.height = 'auto';
    }
    this.classified.set(null);
    this.liveBlameMap.set([]);
    this.saveStagedText('');
    this.undoManager.reset('', []);
    this.updateUndoRedoSignals();
    this.onTextChange(false);
  }

  triggerBeam(e?: Event) {
    if (!this.payloadText.trim()) return;
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    const textToBeam = this.payloadText;
    const blameToBeam = this.liveBlameMap();
    const targetDevId = this.selectedTargetId();

    const beamOpts = {
      tag: this.currentTag() || undefined,
      customCategory: this.isCodeJsonHintActive() ? 'code' : undefined,
      retentionTtlMs: this.perItemRetentionTtl() !== null ? this.perItemRetentionTtl()! : undefined
    };

    // Reset per-item settings immediately (transient per item)
    this.currentTag.set('');
    this.tagDraft.set('');
    this.isCodeJsonHintActive.set(false);
    this.perItemRetentionTtl.set(null);
    this.retentionPopoverOpen.set(false);
    this.tagInputOpen.set(false);
    this.isExpanded.set(false);
    this.isManualExpanded.set(false);

    // Clear composer input and draft immediately
    this.clearText();
    if (this.textareaRef?.nativeElement) {
      this.textareaRef.nativeElement.style.height = 'auto';
    }

    this.syncService.broadcastDraftFinalized();
    this.beamPayload.emit({
      text: textToBeam,
      targetDeviceId: targetDevId,
      lineBlameMap: blameToBeam,
      options: beamOpts
    });
    // Clear the local IndexedDB draft now that this content has been committed as a Beam
    this.storageService.clearDraft();
    this.uiStore.triggerToast('⚡ Beamed entry to connected devices');
  }

  // Upload / File Processing Queue & Concurrency Management
  private activeUploadsCount = 0;
  private readonly MAX_CONCURRENT_UPLOADS = 2;
  private uploadQueue: Array<{ file: File; itemId: string }> = [];
  private activeWorkers = new Map<string, Worker>();

  onFileInput(e: Event) {
    const fileList = (e.target as HTMLInputElement).files;
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      if (files.length === 1) {
        this.handleFile(files[0]);
      } else {
        this.handleBatchFiles(files);
      }
      (e.target as HTMLInputElement).value = '';
    }
  }

  onPaste(e: ClipboardEvent) {
    this.dismissGhostSuggestion();
    if (e.clipboardData?.files.length) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files);
      if (files.length === 1) {
        this.handleFile(files[0]);
      } else {
        this.handleBatchFiles(files);
      }
      return;
    }

    const pastedText = e.clipboardData?.getData('text/plain') || '';
    if (!pastedText || !pastedText.trim()) return;

    // If pasted text/bytecode is large (> 5 KB or > 5,000 chars), offload immediately to Web Worker with pointer loader
    if (pastedText.length > 5000) {
      e.preventDefault();
      const byteSize = new Blob([pastedText]).size;
      this.pasteLoaderPos.set({ ...this.lastPointerPos });
      this.pasteLoaderSize.set(this.formatBytes(byteSize));
      this.pasteProgress.set(15);
      this.isProcessingPaste.set(true);

      const isZipBytecode = pastedText.startsWith('PK') || pastedText.startsWith('data:application/zip');
      const filename = isZipBytecode ? `pasted_archive_${Date.now()}.zip` : `pasted_payload_${Date.now()}.txt`;
      const file = new File([pastedText], filename, {
        type: isZipBytecode ? 'application/zip' : 'text/plain'
      });
      this.handleFile(file);
      return;
    }

    // Regular text paste: insert and record atomic operation
    e.preventDefault();
    const el = this.textareaRef?.nativeElement;
    const current = this.payloadText || '';
    const start = el ? el.selectionStart : current.length;
    const end = el ? el.selectionEnd : current.length;
    const newText = current.slice(0, start) + pastedText + current.slice(end);

    this.payloadText = newText;
    this.recordHistory(newText, true, 'paste');
    this.onTextChange(false);

    if (this.prefService.prefs().instantBeamOnPaste) {
      this.triggerBeam();
      return;
    }

    setTimeout(() => {
      if (el) {
        const newPos = start + pastedText.length;
        el.selectionStart = newPos;
        el.selectionEnd = newPos;
      }
    }, 0);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
  }

  async onFolderButtonClick(fallbackInput: HTMLInputElement) {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle) {
          await this.handleDirectoryHandle(dirHandle);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled directory picker
        AirVaultLogger.debug('[AirVault] showDirectoryPicker fallback:', err);
      }
    }
    fallbackInput.click();
  }

  private async handleDirectoryHandle(dirHandle: any) {
    const rootFolderName = dirHandle.name || 'folder';
    this.uiStore.triggerToast(`📦 Archiving folder "${rootFolderName}" into ZIP...`);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const readDirectoryRecursively = async (handle: any, currentZip: any) => {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            currentZip.file(file.name, file);
          } else if (entry.kind === 'directory') {
            const subZip = currentZip.folder(entry.name);
            await readDirectoryRecursively(entry, subZip);
          }
        }
      };

      await readDirectoryRecursively(dirHandle, zip.folder(rootFolderName) || zip);

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipFile = new File([zipBlob], `${rootFolderName}.zip`, { type: 'application/zip' });
      this.uiStore.triggerToast(`✓ Folder archived as ${zipFile.name} (${(zipFile.size / 1024 / 1024).toFixed(1)} MB)`);
      this.handleFile(zipFile);
    } catch (err) {
      AirVaultLogger.error('[AirVault] Failed to zip folder handle:', err);
      this.uiStore.triggerToast(`⛔ Failed to compress folder "${rootFolderName}"`);
    }
  }

  async onFolderInputSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    const rootFolderName = firstFile.webkitRelativePath ? firstFile.webkitRelativePath.split('/')[0] : 'folder';

    this.uiStore.triggerToast(`📦 Archiving folder "${rootFolderName}" (${files.length} files) into ZIP...`);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const path = f.webkitRelativePath || f.name;
        zip.file(path, f);
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipFile = new File([zipBlob], `${rootFolderName}.zip`, { type: 'application/zip' });
      this.uiStore.triggerToast(`✓ Folder archived as ${zipFile.name} (${(zipFile.size / 1024 / 1024).toFixed(1)} MB)`);
      this.handleFile(zipFile);
      input.value = '';
    } catch (err) {
      AirVaultLogger.error('[AirVault] Failed to archive folder:', err);
      this.uiStore.triggerToast(`⛔ Failed to compress folder "${rootFolderName}"`);
    }
  }

  async onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);

    // 1. Files / Folders dropped take highest priority
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      // Check for directory / folder drop via webkitGetAsEntry
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        const items = Array.from(e.dataTransfer.items);
        let foundFolder = false;
        for (const item of items) {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry && entry.isDirectory) {
            foundFolder = true;
            this.handleFolderDrop(entry as FileSystemDirectoryEntry);
          }
        }
        if (foundFolder) return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 1) {
        this.handleFile(files[0]);
      } else {
        this.handleBatchFiles(files);
      }
      return;
    }

    // 2. Check if text or an existing tile was dragged onto the composer
    const droppedText = e.dataTransfer?.getData('text/plain');
    if (droppedText) {
      this.payloadText = droppedText;
      this.onTextChange();
      return;
    }
  }

  private async handleFolderDrop(dirEntry: FileSystemDirectoryEntry) {
    this.uiStore.triggerToast(`📦 Archiving dropped folder "${dirEntry.name}" into ZIP...`);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      await this.traverseDirectory(dirEntry, zip.folder(dirEntry.name) || zip);

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipFile = new File([zipBlob], `${dirEntry.name}.zip`, { type: 'application/zip' });
      this.uiStore.triggerToast(`✓ Folder archived as ${zipFile.name} (${(zipFile.size / 1024 / 1024).toFixed(1)} MB)`);
      this.handleFile(zipFile);
    } catch (err) {
      AirVaultLogger.error('[AirVault] Failed to zip folder:', err);
      this.uiStore.triggerToast(`⛔ Failed to compress folder "${dirEntry.name}"`);
    }
  }

  private async traverseDirectory(dirEntry: FileSystemDirectoryEntry, currentZip: any): Promise<void> {
    const reader = dirEntry.createReader();
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    let entries: FileSystemEntry[] = [];
    let batch: FileSystemEntry[];
    do {
      batch = await readEntries();
      entries = entries.concat(batch);
    } while (batch.length > 0);

    for (const entry of entries) {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file: File = await new Promise((resolve, reject) => fileEntry.file(resolve, reject));
        currentZip.file(file.name, file);
      } else if (entry.isDirectory) {
        const subDirEntry = entry as FileSystemDirectoryEntry;
        const subZip = currentZip.folder(subDirEntry.name);
        await this.traverseDirectory(subDirEntry, subZip);
      }
    }
  }

  dismissLargeFileWarning() {
    this.largeFileWarning.set('');
  }

  /**
   * Multi-file Batch Upload Handler
   * Enforces max 20 files per batch and total combined storage cap before starting.
   * Creates a single parent batch item containing individual items.
   */
  private async handleBatchFiles(files: File[]) {
    if (!files || files.length === 0) return;

    // 1. Enforce batch item count limit (max 20)
    if (files.length > 20) {
      this.uiStore.triggerToast(`⛔ Batch upload limit exceeded. You can upload at most 20 files at once (received ${files.length}).`);
      return;
    }

    // 2. Check individual file sizes and combined total size against storage cap
    let totalBatchBytes = 0;
    for (const f of files) {
      if (f.size > MAX_SINGLE_FILE_SIZE_BYTES) {
        this.uiStore.triggerToast(`⛔ "${f.name}" (${(f.size / 1024 / 1024).toFixed(1)} MB) exceeds single file limit of 500 MB.`);
        return;
      }
      totalBatchBytes += f.size;
    }

    const currentUsage = this.storageService.totalBytes();
    const currentCap = this.storageService.totalStorageCapBytes();
    const remainingStorage = currentCap - currentUsage;

    if (totalBatchBytes > remainingStorage) {
      const capGB = (currentCap / (1024 * 1024 * 1024)).toFixed(0);
      this.uiStore.triggerToast(`⛔ Batch total size (${(totalBatchBytes / 1024 / 1024).toFixed(1)} MB) exceeds remaining storage (${(remainingStorage / 1024 / 1024).toFixed(0)} MB / ${capGB} GB).`);
      return;
    }

    const batchId = `av_batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const curDev = this.deviceService.currentDevice();
    const curUserName = curDev.username ? `@${curDev.username}` : (curDev.name || 'User');
    const authorColor = this.colorService.getColorForIdentity(curDev.username || curDev.id, curDev.accentColor);

    // Create child items in pending state
    const childItems: AirVaultItem[] = files.map((file, i) => {
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
      const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
      return {
        id: `av_file_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        originDeviceId: curDev.id,
        originOwnerId: curDev.username || curDev.id,
        senderDeviceId: curDev.id,
        senderDeviceName: curUserName,
        senderDeviceAccent: authorColor,
        authorColor: authorColor,
        author_color: authorColor,
        senderDeviceType: curDev.type,
        targetDeviceId: this.selectedTargetId(),
        timestamp: Date.now(),
        isPinned: false,
        batchId: batchId,
        deliveryStatus: 'pending',
        processingState: 'processing',
        progressPercent: 0,
        content: {
          category: isImg ? 'image' : (isVid ? 'video' : 'file'),
          raw: '',
          filename: file.name,
          byteSize: file.size,
          isSensitive: false
        }
      };
    });

    // Create collapsed parent batch item
    const parentBatchItem: AirVaultItem = {
      id: batchId,
      batchId: batchId,
      isBatchParent: true,
      batchFiles: childItems,
      batchTotalCount: files.length,
      batchCompletedCount: 0,
      batchFailedCount: 0,
      batchTotalBytes: totalBatchBytes,
      originDeviceId: curDev.id,
      originOwnerId: curDev.username || curDev.id,
      senderDeviceId: curDev.id,
      senderDeviceName: curUserName,
      senderDeviceAccent: authorColor,
      authorColor: authorColor,
      author_color: authorColor,
      senderDeviceType: curDev.type,
      targetDeviceId: this.selectedTargetId(),
      timestamp: Date.now(),
      isPinned: false,
      deliveryStatus: 'pending',
      processingState: 'processing',
      progressPercent: 0,
      content: {
        category: 'archive',
        raw: `Batch of ${files.length} files (${(totalBatchBytes / 1024 / 1024).toFixed(1)} MB)`,
        filename: `${files.length} Files Batch`,
        byteSize: totalBatchBytes,
        isSensitive: false,
        collapseState: 'collapsed'
      }
    };

    // Save batch parent tile to UI & storage
    this.storageService.addItem(parentBatchItem);
    this.uiStore.triggerToast(`📦 Uploading batch of ${files.length} files...`);

    // Queue all child files with batchId linked
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const childItem = childItems[i];
      this.handleFile(file, childItem.id, batchId);
    }
  }

  private async handleFile(file: File, explicitItemId?: string, batchId?: string) {
    if (!file) return;

    AirVaultLogger.debug('[upload] file received:', file.name, file.size);

    // 0. Strict 500 MB Single File Limit Guard
    if (file.size > MAX_SINGLE_FILE_SIZE_BYTES) {
      this.uiStore.triggerToast(`⛔ File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum single file upload limit of 500 MB.`);
      return;
    }

    // 0.1 Deduplication Check: if exact same file exists, restart 7d expiry and notify (only for standalone file uploads)
    if (!batchId) {
      const existingFile = this.storageService.items().find(i =>
        (!i.processingState || i.processingState === 'done') &&
        i.content.filename === file.name &&
        i.content.byteSize === file.size
      );
      if (existingFile) {
        this.storageService.refreshItemExpiry(existingFile.id);
        this.uiStore.triggerToast(`ℹ️ "${file.name}" already exists in your vault · Expiration timer refreshed (7d)`);
        return;
      }
    }

    // 1. Dynamic Storage Cap Guard (1 GB + 1 GB per connected device)
    const currentUsage = this.storageService.totalBytes();
    const currentCap = this.storageService.totalStorageCapBytes();
    const remainingStorage = currentCap - currentUsage;

    if (file.size > remainingStorage) {
      const capGB = (currentCap / (1024 * 1024 * 1024)).toFixed(0);
      this.uiStore.triggerToast(`⛔ Clipboard storage is full. Free up space to add more resources (${(currentUsage / 1024 / 1024).toFixed(0)} MB / ${capGB} GB).`);
      return;
    }

    // 2. Large File Notification (> 5 MB has lifetime retention, > 50 MB triggers chunked encryption note)
    if (file.size > 50 * 1024 * 1024) {
      this.largeFileWarning.set(`⚠️ Large resource detected (${(file.size / 1024 / 1024).toFixed(1)} MB). Off-thread chunked AES-GCM encryption started. Large resources (>5 MB) are retained for clipboard lifetime.`);
      setTimeout(() => this.dismissLargeFileWarning(), 8000);
    }

    const curDev = this.deviceService.currentDevice();
    const curUserName = curDev.username ? `@${curDev.username}` : (curDev.name || 'User');

    // 3. Authoritative Server Cap Check & Session Initiation
    let uploadSessionId: string | undefined = undefined;
    const itemId = explicitItemId || `av_file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const initRes = await fetch(getAirVaultApiUrl('/api/v1/airvault/clipboards/default/uploads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: itemId,
          fileName: file.name,
          category: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file'),
          declaredSize: file.size,
          chunkSize: 4 * 1024 * 1024,
          totalChunks: Math.max(1, Math.ceil(file.size / (4 * 1024 * 1024))),
          senderDeviceId: curDev.id,
          senderDeviceName: curUserName,
          batchId: batchId
        })
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        uploadSessionId = initData.data?.uploadSessionId;
      } else if (initRes.status === 400) {
        const errJson = await initRes.json().catch(() => ({}));
        const msg = errJson.message || `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds server clipboard cap`;
        this.uiStore.triggerToast(`⛔ ${msg}`);
        return;
      } else {
        // Backend returned 502/504/404 (offline or unreachable) - continue gracefully with 100% client-side local storage & P2P sync
        AirVaultLogger.debug(`[AirVault] Backend upload initiation returned HTTP ${initRes.status}. Continuing client-side.`);
      }
    } catch {
      // Backend completely offline - seamless client-side fallback
    }

    // 4. If single file upload (no batchId), immediately create single tile in "pending" / "processing" state
    if (!batchId) {
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
      const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
      const authorColor = this.colorService.getColorForIdentity(curDev.username || curDev.id, curDev.accentColor);

      const pendingItem: AirVaultItem = {
        id: itemId,
        originDeviceId: curDev.id,
        originOwnerId: curDev.username || curDev.id,
        senderDeviceId: curDev.id,
        senderDeviceName: curUserName,
        senderDeviceAccent: authorColor,
        authorColor: authorColor,
        author_color: authorColor,
        senderDeviceType: curDev.type,
        targetDeviceId: this.selectedTargetId(),
        timestamp: Date.now(),
        isPinned: false,
        deliveryStatus: 'pending',
        processingState: this.activeUploadsCount >= this.MAX_CONCURRENT_UPLOADS ? 'queued' : 'processing',
        progressPercent: 0,
        content: {
          category: isImg ? 'image' : (isVid ? 'video' : 'file'),
          raw: '',
          filename: file.name,
          byteSize: file.size,
          isSensitive: false
        }
      };

      AirVaultLogger.debug('[upload] bytes added to clipboard total:', file.size);

      // Save single pending tile to UI storage
      this.storageService.allItems.update(list => [pendingItem, ...list]);
    }

    // Add to concurrency queue with server session ID and batchId
    this.uploadQueue.push({ file, itemId, uploadSessionId, batchId } as any);
    this.processNextInQueue();
  }

  private async processNextInQueue() {
    if (this.activeUploadsCount >= this.MAX_CONCURRENT_UPLOADS || this.uploadQueue.length === 0) {
      return;
    }

    const { file, itemId, uploadSessionId, batchId } = this.uploadQueue.shift() as any;
    this.activeUploadsCount++;
    this.storageService.updateItemProcessingState(itemId, 'processing');

    // Run heavy reading, thumbnailing, and AES-GCM crypto chunking inside Web Worker
    try {
      if (typeof Worker === 'undefined') {
        throw new Error('Web Worker not supported in this environment');
      }

      const worker = new Worker(new URL('../services/airvault.worker', import.meta.url), { type: 'module' });
      this.activeWorkers.set(itemId, worker);

      const encryptionKey = await this.cryptoService.exportRawKey();
      const remainingCapBytes = CLIPBOARD_STORAGE_CAP_BYTES - this.storageService.totalBytes();

      worker.onmessage = (event: MessageEvent) => {
        const { type, payload, success, result, error } = event.data;

        if (type === 'FILE_PROGRESS' || type === 'PROGRESS') {
          // Real-time chunked progress update (0–100%)
          const percent = payload?.progressPercent ?? payload?.percent ?? 0;
          const stage = payload?.stage;
          this.pasteProgress.set(percent);
          this.storageService.updateItemProgress(itemId, percent, stage);
        } else if (type === 'DONE' || (success && result)) {
          this.isProcessingPaste.set(false);
          // Finished successfully - update the existing tile in place
          const data = payload || result;
          const classified: ClassifiedContent = {
            category: data.category,
            raw: data.rawContent || data.raw,
            previewUrl: data.previewUrl,
            filename: data.filename,
            byteSize: data.finalSize || data.byteSize,
            isSensitive: false
          };

          // Check if identical content was already in the vault (only for standalone items)
          if (!batchId) {
            const duplicate = this.storageService.findDuplicateItem(classified, itemId);
            if (duplicate) {
              this.storageService.deleteItem(itemId);
              this.storageService.refreshItemExpiry(duplicate.id);
              this.cleanupWorker(itemId);
              this.activeUploadsCount = Math.max(0, this.activeUploadsCount - 1);
              this.processNextInQueue();
              this.uiStore.triggerToast(`ℹ️ "${classified.filename || 'Item'}" already exists in your vault · Expiration timer refreshed (7d)`);
              return;
            }
          }

          this.storageService.updateItemProcessingState(itemId, 'done', classified);
          this.storageService.fetchServerUsage('default');
          this.cleanupWorker(itemId);

          // If this file belongs to a batch, check if batch is now complete
          const parentBatch = this.storageService.allItems().find(i => i.isBatchParent && i.batchFiles && i.batchFiles.some(bf => bf.id === itemId));
          if (parentBatch) {
            const allDone = parentBatch.batchFiles?.every(bf => bf.processingState === 'done');
            if (allDone) {
              // Send the consolidated batch parent item across sync
              const batchPayload = JSON.stringify({
                isBatchParent: true,
                batchId: parentBatch.id,
                batchTotalCount: parentBatch.batchFiles?.length || 0,
                batchTotalBytes: parentBatch.batchTotalBytes,
                batchFiles: parentBatch.batchFiles?.map(bf => ({
                  id: bf.id,
                  content: bf.content,
                  timestamp: bf.timestamp
                }))
              });
              this.beamPayload.emit({ text: batchPayload, targetDeviceId: this.selectedTargetId(), filename: `${parentBatch.batchFiles?.length || 0} Files Batch`, existingItemId: parentBatch.id });
            }
          } else {
            // Broadcast standard individual file payload to paired peer devices
            this.beamPayload.emit({ text: classified.raw, targetDeviceId: this.selectedTargetId(), filename: classified.filename, existingItemId: itemId });
          }
        } else if (type === 'ERROR' || error || success === false) {
          this.isProcessingPaste.set(false);
          AirVaultLogger.warn('[AirVault Worker] Worker reported failure. Falling back to inline processing.');
          this.cleanupWorker(itemId);
          this.processFileInline(file, itemId, uploadSessionId, batchId);
        } else if (type === 'CANCELLED') {
          this.isProcessingPaste.set(false);
          this.storageService.deleteItem(itemId);
          this.cleanupWorker(itemId);
        }
      };

      worker.onerror = (err) => {
        AirVaultLogger.warn('[AirVault Worker] Worker load error. Falling back to inline processing:', err);
        this.cleanupWorker(itemId);
        this.processFileInline(file, itemId, uploadSessionId, batchId);
      };

      // Protocol START / PROCESS_FILE_CHUNKED message with server session ID
      worker.postMessage({
        type: 'PROCESS_FILE_CHUNKED',
        id: itemId,
        payload: {
          itemId,
          fileId: itemId,
          file,
          filename: file.name,
          chunkSize: 4 * 1024 * 1024,
          byteSize: file.size,
          encryptionKey,
          uploadSessionId,
          remainingCapBytes
        }
      });
    } catch (err: unknown) {
      AirVaultLogger.warn('[AirVault Worker] Worker instantiation failed, executing inline fallback.');
      this.processFileInline(file, itemId, uploadSessionId);
    }
  }

  private async processFileInline(file: File, itemId: string, uploadSessionId?: string, batchId?: string) {
    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
    const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/i.test(file.name);
    const CHUNK_SIZE = 4 * 1024 * 1024;
    const totalBytes = file.size;
    let bytesProcessed = 0;
    let chunkIndex = 0;

    let previewUrl: string | undefined = undefined;

    // Fast image thumbnailing if image
    if (isImg && typeof createImageBitmap !== 'undefined') {
      try {
        const bmp = await createImageBitmap(file, { resizeWidth: 320 });
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bmp, 0, 0);
          previewUrl = canvas.toDataURL('image/jpeg', 0.6);
        }
      } catch { }
    }

    try {
      while (bytesProcessed < totalBytes) {
        const nextEnd = Math.min(bytesProcessed + CHUNK_SIZE, totalBytes);
        const chunkBlob = file.slice(bytesProcessed, nextEnd);
        const chunkBuffer = await chunkBlob.arrayBuffer();

        // Server chunk upload if session ID is active
        if (uploadSessionId) {
          try {
            await fetch(getAirVaultApiUrl(`/api/v1/airvault/uploads/${uploadSessionId}/chunks/${chunkIndex}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: chunkBuffer
            });
          } catch { }
        }

        bytesProcessed = nextEnd;
        chunkIndex++;
        const percent = Math.min(100, Math.round((bytesProcessed / totalBytes) * 100));
        this.storageService.updateItemProgress(itemId, percent, bytesProcessed < totalBytes ? 'encrypting' : 'uploading');

        // Yield for UI render loop
        await new Promise(r => setTimeout(r, 16));
      }

      if (uploadSessionId) {
        try {
          await fetch(getAirVaultApiUrl(`/api/v1/airvault/uploads/${uploadSessionId}/complete`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewUrl })
          });
        } catch { }
      }

      // Cache blob directly in binary LRU cache and IndexedDB payload store
      this.storageService.resourceCache.put(itemId, file);
      this.storageService.savePayloadToIndexedDb(itemId, file);

      let rawContent = '';
      const isBinary = isImg || isVid || /\.(zip|pdf|docx?|xlsx?|tar|gz|7z|bin|iso|dmg|pkg|wasm|dylib|so)$/i.test(file.name || '') || (file.type && (file.type.startsWith('application/zip') || file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/octet-stream'));

      if (isBinary) {
        rawContent = '';
      } else if (totalBytes <= 100 * 1024) {
        try {
          rawContent = await file.text();
        } catch {
          rawContent = '';
        }
      } else {
        rawContent = '';
      }

      const classified: ClassifiedContent = {
        category: isImg ? 'image' : (isVid ? 'video' : 'file'),
        raw: rawContent,
        previewUrl: previewUrl || (isImg ? rawContent : undefined),
        filename: file.name,
        byteSize: totalBytes,
        isSensitive: false
      };

      // Check if identical content was already in the vault (only for standalone items)
      if (!batchId) {
        const duplicate = this.storageService.findDuplicateItem(classified, itemId);
        if (duplicate) {
          this.storageService.deleteItem(itemId);
          this.storageService.refreshItemExpiry(duplicate.id);
          this.cleanupWorker(itemId);
          this.activeUploadsCount = Math.max(0, this.activeUploadsCount - 1);
          this.processNextInQueue();
          this.uiStore.triggerToast(`ℹ️ "${classified.filename || 'Item'}" already exists in your vault · Expiration timer refreshed (7d)`);
          return;
        }
      }

      this.storageService.updateItemProcessingState(itemId, 'done', classified);
      this.storageService.fetchServerUsage('default');
      this.cleanupWorker(itemId);

      // If this file belongs to a batch, check if batch is now complete
      const parentBatch = this.storageService.allItems().find(i => i.isBatchParent && i.batchFiles && i.batchFiles.some(bf => bf.id === itemId));
      if (parentBatch) {
        const allDone = parentBatch.batchFiles?.every(bf => bf.processingState === 'done');
        if (allDone) {
          const batchPayload = JSON.stringify({
            isBatchParent: true,
            batchId: parentBatch.id,
            batchTotalCount: parentBatch.batchFiles?.length || 0,
            batchTotalBytes: parentBatch.batchTotalBytes,
            batchFiles: parentBatch.batchFiles?.map(bf => ({
              id: bf.id,
              content: bf.content,
              timestamp: bf.timestamp
            }))
          });
          this.beamPayload.emit({ text: batchPayload, targetDeviceId: this.selectedTargetId(), filename: `${parentBatch.batchFiles?.length || 0} Files Batch`, existingItemId: parentBatch.id });
        }
      } else {
        // Broadcast encrypted file payload to paired peer devices without duplicate local tiles
        this.beamPayload.emit({ text: classified.raw, targetDeviceId: this.selectedTargetId(), filename: classified.filename, existingItemId: itemId });
      }
    } catch (err: any) {
      AirVaultLogger.error('[AirVault] Inline file processing failed:', err);
      this.storageService.updateItemProcessingState(itemId, 'failed', undefined, err?.message || 'Processing failed');
      this.cleanupWorker(itemId);
    }
  }

  cancelUpload(itemId: string) {
    const worker = this.activeWorkers.get(itemId);
    if (worker) {
      worker.postMessage({ type: 'CANCEL', payload: { fileId: itemId } });
      setTimeout(() => {
        worker.terminate();
        this.activeWorkers.delete(itemId);
      }, 50);
    }
    this.uploadQueue = this.uploadQueue.filter(q => q.itemId !== itemId);
    this.storageService.deleteItem(itemId);
    this.activeUploadsCount = Math.max(0, this.activeUploadsCount - 1);
    this.processNextInQueue();
    this.uiStore.triggerToast('Upload cancelled');
  }

  retryUpload(itemId: string) {
    const item = this.storageService.items().find(i => i.id === itemId);
    if (!item) return;
    this.storageService.updateItemProcessingState(itemId, 'queued', undefined, undefined);
    this.uiStore.triggerToast(`Retrying ${item.content.filename || 'upload'}…`);
  }

  private cleanupWorker(itemId: string) {
    const worker = this.activeWorkers.get(itemId);
    if (worker) {
      worker.terminate();
      this.activeWorkers.delete(itemId);
    }
    this.activeUploadsCount = Math.max(0, this.activeUploadsCount - 1);
    this.processNextInQueue();
  }

  getCategoryIcon(cat: string): string {
    switch (cat) {
      case 'code': return 'code';
      case 'url': return 'link';
      case 'image': return 'file';
      case 'video': return 'film';
      case 'audio': return 'music';
      case 'pdf': return 'file-text';
      case 'spreadsheet': return 'table';
      case 'archive': return 'folder-archive';
      case 'font': return 'type';
      case 'json': return 'braces';
      case 'file': return 'file-text';
      default: return 'align-left';
    }
  }

  relativeTime(ts: number): string {
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return 'Just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  }

  onCursorMove() {
    if (this.ghostSuggestion()) {
      this.dismissGhostSuggestion();
    }
    this.updateSelectionToolbar();
  }

  // ── Floating Text Selection Formatting Toolbar ──
  showSelectionToolbar = signal(false);
  selectionToolbarPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  showHeadingMenu = signal(false);
  showLinkInput = signal(false);
  linkUrlDraft = signal('');
  selectedFormatText = signal('');
  private selectionRange = { start: 0, end: 0 };
  private toolbarDismissTimer: any = null;

  onComposerSelect(e?: Event) {
    this.updateSelectionToolbar();
  }

  updateSelectionToolbar() {
    const el = this.textareaRef?.nativeElement;
    if (!el) {
      this.showSelectionToolbar.set(false);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start === end || (end - start) === 0) {
      if (!this.showLinkInput() && !this.showHeadingMenu()) {
        this.showSelectionToolbar.set(false);
      }
      return;
    }

    const selText = el.value.substring(start, end);
    this.selectedFormatText.set(selText);
    this.selectionRange = { start, end };

    // Calculate approximate coordinates in container
    const textareaRect = el.getBoundingClientRect();
    const parentRect = el.parentElement?.getBoundingClientRect() || textareaRect;

    // Estimate cursor X / Y position
    const textBefore = el.value.substring(0, start);
    const lines = textBefore.split('\n');
    const lineIndex = lines.length - 1;
    const charIndex = lines[lineIndex].length;

    const approxCharWidth = 7.5;
    const lineHeight = 20;

    let left = (charIndex * approxCharWidth) + 12;
    let top = (lineIndex * lineHeight) - 44;

    // Bounds checking
    left = Math.max(10, Math.min(parentRect.width - 240, left));
    if (top < -60) top = -50;

    this.selectionToolbarPos.set({ top, left });
    this.showSelectionToolbar.set(true);
  }

  applyFormat(type: 'bold' | 'italic') {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;

    const { start, end } = this.selectionRange;
    if (start === end) return;

    const val = el.value;
    const selected = val.substring(start, end);
    const wrap = type === 'bold' ? '**' : '*';

    let nextVal: string;
    let newStart: number;
    let newEnd: number;

    // Check if already wrapped
    if (selected.startsWith(wrap) && selected.endsWith(wrap) && selected.length >= wrap.length * 2) {
      const unwrapped = selected.slice(wrap.length, selected.length - wrap.length);
      nextVal = val.slice(0, start) + unwrapped + val.slice(end);
      newStart = start;
      newEnd = start + unwrapped.length;
    } else {
      const wrapped = `${wrap}${selected}${wrap}`;
      nextVal = val.slice(0, start) + wrapped + val.slice(end);
      newStart = start;
      newEnd = start + wrapped.length;
    }

    this.payloadText = nextVal;
    this.saveStagedText(nextVal);
    this.onTextChange();

    setTimeout(() => {
      el.focus();
      el.selectionStart = newStart;
      el.selectionEnd = newEnd;
      this.selectionRange = { start: newStart, end: newEnd };
    }, 0);
  }

  applyHeading(level: 0 | 1 | 2 | 3 | 'ordered' | 'bullet') {
    const el = this.textareaRef?.nativeElement;
    if (!el) return;

    const { start } = this.selectionRange;
    const val = el.value;

    // Find the start and end of the line containing start
    const lineStart = val.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = val.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = val.length;

    const currentLine = val.substring(lineStart, lineEnd);
    // Strip existing markdown heading/list prefixes
    const cleanLine = currentLine.replace(/^(\#{1,6}\s+|-\s+|\d+\.\s+)/, '');

    let prefix = '';
    if (level === 1) prefix = '# ';
    else if (level === 2) prefix = '## ';
    else if (level === 3) prefix = '### ';
    else if (level === 'ordered') prefix = '1. ';
    else if (level === 'bullet') prefix = '- ';
    else prefix = ''; // normal text

    const newLine = `${prefix}${cleanLine}`;
    const nextVal = val.slice(0, lineStart) + newLine + val.slice(lineEnd);

    this.payloadText = nextVal;
    this.saveStagedText(nextVal);
    this.onTextChange();
    this.showHeadingMenu.set(false);

    setTimeout(() => {
      el.focus();
      el.selectionStart = lineStart + newLine.length;
      el.selectionEnd = lineStart + newLine.length;
    }, 0);
  }

  toggleLinkInput() {
    this.showHeadingMenu.set(false);
    this.showLinkInput.set(!this.showLinkInput());
    if (this.showLinkInput()) {
      this.linkUrlDraft.set('');
    }
  }

  applyLink() {
    const el = this.textareaRef?.nativeElement;
    const url = this.linkUrlDraft().trim();
    if (!el || !url) {
      this.showLinkInput.set(false);
      return;
    }

    const { start, end } = this.selectionRange;
    const val = el.value;
    const selected = val.substring(start, end) || 'link';

    const formattedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const mdLink = `[${selected}](${formattedUrl})`;

    const nextVal = val.slice(0, start) + mdLink + val.slice(end);
    this.payloadText = nextVal;
    this.saveStagedText(nextVal);
    this.onTextChange();
    this.showLinkInput.set(false);
    this.showSelectionToolbar.set(false);

    setTimeout(() => {
      el.focus();
      el.selectionStart = start + mdLink.length;
      el.selectionEnd = start + mdLink.length;
    }, 0);
  }
}

