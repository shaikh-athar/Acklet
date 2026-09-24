import { Component, ChangeDetectionStrategy, signal, input, output, inject, OnDestroy, AfterViewInit, computed, ViewChild, ElementRef, NgZone, effect, HostListener } from '@angular/core';
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
import { maskSensitivePreview, ComposerMatch, scanAllMatches, checkDuplicateResource } from '../services/airvault-action-detector';
import { AirVaultActionPopoverComponent } from './airvault-action-popover.component';
import { getAirVaultApiUrl } from '../services/airvault-api.util';
import { checkInputThreshold, formatByteSize } from '../../../app/core/config/tool-thresholds';
import { AirVaultDocSyncService } from '../services/airvault-doc-sync.service';
import { AirVaultShortcutService } from '../services/airvault-shortcut.service';
import { WordUndoManager } from '../services/airvault-undo.manager';
import { AirVaultPreferencesService } from '../services/airvault-preferences.service';
import { AirVaultLogger } from '../services/airvault-sync-debug.service';
import { AirVaultOperationStateService } from '../services/airvault-operation-state.service';
import {
  sendLog, markStart, markEnd, getMeasureMs,
  countStage, resetCounters, getExecutionCounts,
  watchdogStart, watchdogClear,
  snapshotComposer, snapshotMemory,
  checkDivergence,
  logFileStart, logFileValidated, logUploadInitStart, logUploadInitEnd,
  logWorkerPost, logWorkerMessage, logResourceCreated, logResourcePersisted, logResourceReady,
  measureSync, logSignalWrite,
  recordWorkerPostTime, getWorkerPostElapsedMs, clearWorkerPostTime,
  logRequestStart, logRequestEnd, logRequestFailed,
  logBroadcastStart, logBroadcastDeviceStart, logBroadcastDeviceEnd, logBroadcastComplete,
  auditEffect, resetEffectRegistry,
  createRun, recordStage, finaliseRun,
  installLongTaskObserver, installGlobalExporter, isSendTracerEnabled,
} from '../services/airvault-send-tracer';
import { AirvaultRichEditorService } from '../services/airvault-rich-editor.service';
import { isHtmlContent } from '../services/airvault-markdown.util';

export type ResourceStatus = 'SELECTED' | 'PREPARING' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface StagedAttachment {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  previewUrl?: string;
  isImage: boolean;
  iconName: string;
  status: ResourceStatus;
  progressPercent: number;
  uploadedBytes?: number;
  totalBytes?: number;
  errorMessage?: string;
  resourceId?: string;
  verifiedObjectUrl?: string;
}

@Component({
  selector: 'app-airvault-staging',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, LargeInputNoticeComponent, AirVaultCardComponent, AirVaultHandoffBannerComponent, AirVaultActionPopoverComponent],
  providers: [AirvaultRichEditorService],
  templateUrl: './airvault-staging.component.html',
  styleUrls: ['../airvault.shared.css', './airvault-staging.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AirVaultStagingComponent implements OnDestroy, AfterViewInit {
  /** Reference to the contenteditable Tiptap editor host element */
  @ViewChild('editorRef') editorRef?: ElementRef<HTMLDivElement>;
  @ViewChild('streamArea') streamAreaRef?: ElementRef<HTMLDivElement>;
  @ViewChild('cardGrid') cardGridRef?: ElementRef<HTMLDivElement>;

  private prevCardRects = new Map<string, DOMRect>();

  public richEditor = inject(AirvaultRichEditorService);

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
  public operationState = inject(AirVaultOperationStateService);
  public shortcutService = inject(AirVaultShortcutService);
  private ngZone = inject(NgZone);
  motion = inject(AirVaultMotionService);

  private subs: Subscription[] = [];

  searchHighlightQuery = computed(() => this.uiStore.searchHighlightQuery());
  activeSearchMatchIndex = computed(() => this.uiStore.activeMatchIndex());
  editorScrollTop = signal<number>(0);
  isEditorScrolledTop = signal<boolean>(false);
  isEditorScrolledBottom = signal<boolean>(false);

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
    const el = e.target as HTMLElement;
    if (el) {
      this.editorScrollTop.set(el.scrollTop);
      this.updateEditorScrollState(el);
    }
    if (this.hoveredAttribution()) {
      this.hoveredAttribution.set(null);
      this.hoveredAuthorKey.set(null);
    }
  }

  updateEditorScrollState(el?: HTMLElement) {
    const target = el ?? this.editorRef?.nativeElement;
    if (!target) return;
    const hasScrollableContent = target.scrollHeight > target.clientHeight + 4;
    const canScrollUp = hasScrollableContent && target.scrollTop > 4;
    const canScrollDown = hasScrollableContent && (target.scrollTop + target.clientHeight < target.scrollHeight - 4);

    if (this.isEditorScrolledTop() !== canScrollUp) {
      this.isEditorScrolledTop.set(canScrollUp);
    }
    if (this.isEditorScrolledBottom() !== canScrollDown) {
      this.isEditorScrolledBottom.set(canScrollDown);
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
    { id: 'markdown', label: 'Markdown', icon: 'file-text' },
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
      items = items.filter(it => {
        const itemCat = (it.content?.category || 'text').toLowerCase();
        const isBatch = !!it.isBatchParent || itemCat === 'batch';
        const batchFiles = it.batchFiles || [];

        return cats.some(c => {
          const filterCat = c.toLowerCase();
          // If filtering for multi-resource/mixed tiles
          if (filterCat === 'batch') {
            return isBatch || (it.content?.category === 'batch');
          }

          // Direct category match
          if (itemCat === filterCat) {
            return true;
          }

          // If item is a multi-resource/batch tile, check if any attached sub-file matches the category (e.g. image in batch)
          if (isBatch && batchFiles.length > 0) {
            return batchFiles.some(subFile => (subFile.content?.category || '').toLowerCase() === filterCat);
          }

          return false;
        });
      });
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

  /**
   * Tracks only the ordered sequence of item IDs in the current view.
   * The FLIP animation effect depends on this instead of displayedVaultItems()
   * so it only fires when tile positions actually change — not on any item
   * property update (sync status, progress, copyCount, etc.).
   */
  displayedItemOrder = computed(() =>
    this.displayedVaultItems().map(i => i.id).join(',')
  );

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
    if (type.includes('markdown') || type.includes('md')) return 'type-cyan';
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
    if (type.includes('markdown') || type.includes('md')) return 'file-text';
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
    options?: { tag?: string; customCategory?: string; retentionTtlMs?: number; byteSize?: number };
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
  /** Show expand icon only when content exceeds 4 lines and composer isn't already expanded */
  showExpandIcon = computed(() => !this.isExpanded() && this.composerLineCount() >= 5);
  isCodeJsonHintActive = signal<boolean>(false);
  perItemRetentionTtl = signal<number | null>(null);
  retentionPopoverOpen = signal<boolean>(false);
  tagInputOpen = signal<boolean>(false);
  currentTag = signal<string>('');
  tagDraft = signal<string>('');

  /** Tracks briefly clicked toolbar button to trigger lively pulse feedback */
  clickedButtonId = signal<string | null>(null);
  private clickPulseTimer: any = null;

  onPlusHover() {
    console.log('[TOOLTIP] show (+ button hover)', performance.now());
  }

  onPlusLeave() {
    console.log('[TOOLTIP] hide fired (+ button leave)', performance.now());
  }

  triggerClickPulse(id: string) {
    this.clickedButtonId.set(id);
    if (this.clickPulseTimer) clearTimeout(this.clickPulseTimer);
    this.clickPulseTimer = setTimeout(() => {
      if (this.clickedButtonId() === id) {
        this.clickedButtonId.set(null);
      }
    }, 500);
  }

  /** Computed signal that strictly gates the Send button until all staged attachments are fully READY */
  canSend = computed(() => {
    const atts = this.stagedAttachments();
    const text = this.stagedText();
    const hasText = text.trim().length > 0;
    if (atts.length === 0) return hasText;
    const allReady = atts.every(a => a.status === 'READY');
    return allReady && (hasText || atts.length > 0);
  });

  /** Staged file attachments waiting to be beamed with the message */
  stagedAttachments = signal<StagedAttachment[]>([]);

  /** Adds one or more files to the composer staged attachments row and begins background preparation/upload */
  stageFiles(files: File[]) {
    if (!files || files.length === 0) return;
    const current = this.stagedAttachments();
    const newItems: StagedAttachment[] = [];

    for (const file of files) {
      if (file.size > MAX_SINGLE_FILE_SIZE_BYTES) {
        this.uiStore.triggerToast(`⛔ "${file.name}" exceeds single file limit of 1 GB.`);
        continue;
      }
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isZip = file.type === 'application/zip' || file.name.endsWith('.zip');
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name);

      let icon = 'file';
      if (isImg) icon = 'image';
      else if (isPdf) icon = 'file-text';
      else if (isZip) icon = 'folder-archive';
      else if (isVideo) icon = 'film';

      let previewUrl: string | undefined;
      if (isImg && typeof URL !== 'undefined') {
        previewUrl = URL.createObjectURL(file);
      }

      const attId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const attachmentItem: StagedAttachment = {
        id: attId,
        file,
        name: file.name,
        sizeFormatted: this.formatBytes(file.size),
        previewUrl,
        isImage: isImg,
        iconName: icon,
        status: 'SELECTED',
        progressPercent: 0,
        uploadedBytes: 0,
        totalBytes: file.size
      };

      newItems.push(attachmentItem);

      AirVaultLogger.debug('[AirVault Staging] 📎 Resource attached:', {
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
        id: attId
      });
    }

    if (newItems.length > 0) {
      const updatedList = [...current, ...newItems];
      this.stagedAttachments.set(updatedList);
      this.autoResizeTextarea();
      this.uiStore.triggerToast(`📎 Attached ${newItems.length} file${newItems.length > 1 ? 's' : ''}`);

      AirVaultLogger.debug('[AirVault Staging] 📦 Total composer attachments count:', updatedList.length);

      // Immediately process background upload/storage for each newly staged attachment
      for (const item of newItems) {
        this.processStagedAttachmentUpload(item);
      }
    }
  }

  /** Background upload, crypto chunking, and persistence pipeline for a staged attachment */
  async processStagedAttachmentUpload(item: StagedAttachment) {
    const file = item.file;
    const attId = item.id;
    const operationId = `stage_up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const startTime = performance.now();

    // Transition to PREPARING
    this.updateStagedAttachmentStatus(attId, { status: 'PREPARING', progressPercent: 0 });

    const curDev = this.deviceService.currentDevice();
    const curUserName = curDev.username ? `@${curDev.username}` : (curDev.name || 'User');

    // Step 2: Request server upload session (if server is available)
    let uploadSessionId: string | undefined = undefined;
    try {
      const initRes = await fetch(getAirVaultApiUrl('/api/v1/airvault/clipboards/default/uploads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Operation-Id': operationId },
        body: JSON.stringify({
          fileId: attId,
          fileName: file.name,
          category: this.clipboard.classify(file.type ? `data:${file.type};base64,` : '', file.name).category,
          declaredSize: file.size,
          chunkSize: 4 * 1024 * 1024,
          totalChunks: Math.max(1, Math.ceil(file.size / (4 * 1024 * 1024))),
          senderDeviceId: curDev.id,
          senderDeviceName: curUserName
        })
      });

      if (initRes.ok) {
        const initData = await initRes.json();
        uploadSessionId = initData.data?.uploadSessionId;
      } else if (initRes.status === 400) {
        const uploadInitBodyText = await initRes.text().catch(() => '');
        const errJson = (() => { try { return JSON.parse(uploadInitBodyText); } catch { return {}; } })();
        const msg = errJson.message || `File size exceeds server clipboard cap`;
        this.updateStagedAttachmentStatus(attId, { status: 'FAILED', errorMessage: msg });
        this.uiStore.triggerToast(`⛔ ${msg}`);
        return;
      }
    } catch {
      // Backend unreachable - graceful client-side fallback
    }

    // Step 3: Transition to UPLOADING and execute chunked upload via Web Worker (or inline fallback)
    this.updateStagedAttachmentStatus(attId, { status: 'UPLOADING', progressPercent: 1 });

    try {
      if (typeof Worker !== 'undefined') {
        const worker = new Worker(new URL('../services/airvault.worker', import.meta.url), { type: 'module' });
        const encryptionKey = await this.cryptoService.exportRawKey();
        const remainingCapBytes = CLIPBOARD_STORAGE_CAP_BYTES - this.storageService.totalBytes();

        worker.onmessage = (event: MessageEvent) => {
          const { type, payload, success, result, error } = event.data;

          if (type === 'FILE_PROGRESS' || type === 'PROGRESS') {
            const percent = payload?.progressPercent ?? payload?.percent ?? 0;
            const bytes = payload?.bytesProcessed ?? Math.round((percent / 100) * file.size);
            const status: ResourceStatus = percent >= 100 ? 'PROCESSING' : 'UPLOADING';
            this.updateStagedAttachmentStatus(attId, {
              status,
              progressPercent: Math.min(100, percent),
              uploadedBytes: bytes,
              totalBytes: file.size
            });
          } else if (type === 'DONE' || (success && result)) {
            const data = payload || result;
            const verifiedObjUrl = this.storageService.resourceCache.put(attId, file);
            this.storageService.savePayloadToIndexedDb(attId, file);

            const uploadDuration = ((performance.now() - startTime) / 1000).toFixed(2);
            AirVaultLogger.debug('[AirVault Staging] ✅ Resource READY:', {
              resourceId: attId,
              filename: file.name,
              size: file.size,
              duration: `${uploadDuration}s`,
              verifiedObjectUrl: verifiedObjUrl
            });

            this.updateStagedAttachmentStatus(attId, {
              status: 'READY',
              progressPercent: 100,
              uploadedBytes: file.size,
              totalBytes: file.size,
              previewUrl: item.previewUrl || verifiedObjUrl,
              verifiedObjectUrl: verifiedObjUrl,
              resourceId: attId
            });

            // Automatically place pointer directly in new next line in composer
            this.richEditor.focusOnNewLine();

            worker.terminate();
          } else if (type === 'ERROR' || error || success === false) {
            console.error('[AirVault Staging] Worker upload error:', error);
            const friendlyErr = this.uiStore.getUserFriendlyErrorMessage('sending', error);
            this.updateStagedAttachmentStatus(attId, { status: 'FAILED', errorMessage: friendlyErr });
            worker.terminate();
          }
        };

        worker.onerror = (err) => {
          console.warn('[AirVault Staging] Worker failed, running inline:', err);
          worker.terminate();
          this.executeInlineStagedUpload(item, uploadSessionId, startTime);
        };

        worker.postMessage({
          type: 'PROCESS_FILE_CHUNKED',
          id: attId,
          operationId,
          payload: {
            itemId: attId,
            fileId: attId,
            file,
            filename: file.name,
            chunkSize: 4 * 1024 * 1024,
            byteSize: file.size,
            encryptionKey,
            uploadSessionId,
            remainingCapBytes
          }
        });
      } else {
        await this.executeInlineStagedUpload(item, uploadSessionId, startTime);
      }
    } catch (workerErr) {
      console.warn('[AirVault Staging] Worker initialization error, running inline fallback:', workerErr);
      await this.executeInlineStagedUpload(item, uploadSessionId, startTime);
    }
  }

  /** Inline chunked upload fallback for staged attachments */
  private async executeInlineStagedUpload(item: StagedAttachment, uploadSessionId?: string, startTime: number = performance.now()) {
    const file = item.file;
    const attId = item.id;
    const CHUNK_SIZE = 4 * 1024 * 1024;
    const totalBytes = file.size;
    let bytesProcessed = 0;
    let chunkIndex = 0;

    try {
      while (bytesProcessed < totalBytes) {
        const nextEnd = Math.min(bytesProcessed + CHUNK_SIZE, totalBytes);
        const chunkBlob = file.slice(bytesProcessed, nextEnd);
        const chunkBuffer = await chunkBlob.arrayBuffer();

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
        const status: ResourceStatus = percent >= 100 ? 'PROCESSING' : 'UPLOADING';
        this.updateStagedAttachmentStatus(attId, {
          status,
          progressPercent: percent,
          uploadedBytes: bytesProcessed,
          totalBytes
        });

        await new Promise(r => setTimeout(r, 16));
      }

      if (uploadSessionId) {
        try {
          await fetch(getAirVaultApiUrl(`/api/v1/airvault/uploads/${uploadSessionId}/complete`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewUrl: item.previewUrl })
          });
        } catch { }
      }

      const verifiedObjUrl = this.storageService.resourceCache.put(attId, file);
      this.storageService.savePayloadToIndexedDb(attId, file);

      this.updateStagedAttachmentStatus(attId, {
        status: 'READY',
        progressPercent: 100,
        uploadedBytes: totalBytes,
        totalBytes,
        previewUrl: item.previewUrl || verifiedObjUrl,
        verifiedObjectUrl: verifiedObjUrl,
        resourceId: attId
      });

      // Automatically place pointer directly in new next line in composer
      this.richEditor.focusOnNewLine();
    } catch (err) {
      this.updateStagedAttachmentStatus(attId, { status: 'FAILED', errorMessage: 'Upload failed' });
    }
  }

  /** Updates specific fields of a staged attachment by ID */
  private updateStagedAttachmentStatus(id: string, updates: Partial<StagedAttachment>) {
    this.stagedAttachments.update(list =>
      list.map(att => att.id === id ? { ...att, ...updates } : att)
    );
  }

  /** Retries upload for a failed staged attachment */
  retryStagedUpload(attId: string, e?: Event) {
    if (e) e.stopPropagation();
    const item = this.stagedAttachments().find(a => a.id === attId);
    if (!item) return;
    this.processStagedAttachmentUpload(item);
  }

  /** Removes a staged attachment before sending */
  removeStagedAttachment(id: string, e?: Event) {
    if (e) e.stopPropagation();
    const item = this.stagedAttachments().find(a => a.id === id);
    if (item?.previewUrl && item.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }
    this.stagedAttachments.update(list => list.filter(a => a.id !== id));
    this.autoResizeTextarea();
  }

  /** Opens full-screen preview modal for any staged image, media, or file attachment */
  previewStagedAttachment(att: StagedAttachment, e?: Event) {
    if (e) e.stopPropagation();
    const curDev = this.deviceService.currentDevice();
    const category = att.isImage ? 'image' : (att.iconName === 'film' ? 'video' : (att.iconName === 'file-text' ? 'pdf' : (att.iconName === 'folder-archive' ? 'archive' : 'file')));
    const effectiveUrl = att.verifiedObjectUrl || att.previewUrl || (att.file ? URL.createObjectURL(att.file) : '');
    const mockItem: AirVaultItem = {
      id: att.id,
      senderDeviceId: curDev.id,
      senderDeviceName: curDev.name || 'This Device',
      senderDeviceAccent: curDev.accentColor,
      senderDeviceType: curDev.type,
      processingState: att.status === 'READY' ? 'done' : (att.status === 'FAILED' ? 'failed' : 'processing'),
      progressPercent: att.progressPercent,
      errorMessage: att.errorMessage,
      content: {
        category,
        raw: effectiveUrl || att.name,
        previewUrl: effectiveUrl,
        filename: att.name,
        byteSize: att.file.size,
        isSensitive: false
      },
      timestamp: Date.now(),
      isPinned: false
    };
    this.uiStore.openPreview(mockItem);
  }

  @ViewChild('tagInputRef') tagInputRef?: ElementRef<HTMLInputElement>;

  isRetentionClosing = signal<boolean>(false);
  isTagClosing = signal<boolean>(false);
  isUploadMenuClosing = signal<boolean>(false);

  toggleRetentionPopover(e?: Event) {
    if (e) {
      e.stopPropagation();
      this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    }
    if (this.retentionPopoverOpen() && !this.isRetentionClosing()) {
      this.closeRetentionPopover();
    } else {
      this.isRetentionClosing.set(false);
      this.retentionPopoverOpen.set(true);
      this.closeTagInput(true);
      this.closeUploadMenu(true);
    }
  }

  closeRetentionPopover(immediate = false) {
    if (!this.retentionPopoverOpen() || this.isRetentionClosing()) return;
    if (immediate) {
      this.retentionPopoverOpen.set(false);
      this.isRetentionClosing.set(false);
      return;
    }
    this.isRetentionClosing.set(true);
    setTimeout(() => {
      this.retentionPopoverOpen.set(false);
      this.isRetentionClosing.set(false);
    }, 500);
  }

  setPerItemRetention(ttl: number | null, e?: Event) {
    if (e) e.stopPropagation();
    this.perItemRetentionTtl.set(ttl);
    this.closeRetentionPopover();
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
    this.closeTagInput();
    this.uiStore.triggerToast(`🏷️ Tag "#${tag}" attached to item`);
  }

  toggleTagInput(e?: Event) {
    if (e) {
      e.stopPropagation();
      this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    }
    if (this.tagInputOpen() && !this.isTagClosing()) {
      this.closeTagInput();
    } else {
      this.isTagClosing.set(false);
      this.closeRetentionPopover(true);
      this.closeUploadMenu(true);
      this.tagDraft.set(this.currentTag());
      this.tagInputOpen.set(true);
      setTimeout(() => this.tagInputRef?.nativeElement?.focus(), 60);
    }
  }

  closeTagInput(immediate = false) {
    if (!this.tagInputOpen() || this.isTagClosing()) return;
    if (immediate) {
      this.tagInputOpen.set(false);
      this.isTagClosing.set(false);
      return;
    }
    this.isTagClosing.set(true);
    setTimeout(() => {
      this.tagInputOpen.set(false);
      this.isTagClosing.set(false);
    }, 500);
  }

  saveTagFromDraft() {
    const raw = this.tagDraft().trim().replace(/^#+/, '');
    this.currentTag.set(raw);
    this.closeTagInput();
    if (raw) {
      this.uiStore.triggerToast(`🏷️ Tag "#${raw}" attached to item`);
    }
  }

  removeTag(e?: Event) {
    if (e) e.stopPropagation();
    this.currentTag.set('');
    this.tagDraft.set('');
    this.closeTagInput();
  }

  toggleUploadMenu(e?: Event) {
    if (e) {
      e.stopPropagation();
      this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    }
    if (this.uploadMenuOpen() && !this.isUploadMenuClosing()) {
      this.closeUploadMenu();
    } else {
      this.isUploadMenuClosing.set(false);
      this.uploadMenuOpen.set(true);
      this.closeRetentionPopover(true);
      this.closeTagInput(true);
    }
  }

  closeUploadMenu(immediate = false) {
    if (!this.uploadMenuOpen() || this.isUploadMenuClosing()) return;
    if (immediate) {
      this.uploadMenuOpen.set(false);
      this.isUploadMenuClosing.set(false);
      return;
    }
    this.isUploadMenuClosing.set(true);
    setTimeout(() => {
      this.uploadMenuOpen.set(false);
      this.isUploadMenuClosing.set(false);
    }, 500);
  }

  @HostListener('document:click', ['$event'])
  onGlobalClickOutsidePopovers(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // 1. Retention popover click outside
    if (this.retentionPopoverOpen() && !this.isRetentionClosing()) {
      if (!target.closest('.composer-retention-popover') && !target.closest('.composer-active-retention-chip') && !target.closest('[aria-label="Set retention for this item"]')) {
        this.closeRetentionPopover();
      }
    }

    // 2. Tag popover click outside
    if (this.tagInputOpen() && !this.isTagClosing()) {
      if (!target.closest('.composer-tag-popover') && !target.closest('.composer-active-tag-chip') && !target.closest('[aria-label="Add tag to item"]')) {
        this.closeTagInput();
      }
    }

    // 3. Upload menu click outside
    if (this.uploadMenuOpen() && !this.isUploadMenuClosing()) {
      if (!target.closest('.chat-attach-popover') && !target.closest('.composer-plus-attach-btn')) {
        this.closeUploadMenu();
      }
    }
  }


  toggleManualExpand() {
    const wasExpanded = this.isManualExpanded();
    const nextState = !wasExpanded;
    this.isManualExpanded.set(nextState);
    this.isExpanded.set(nextState);

    // Defer resize to next frame so [class.expanded] is applied before measuring scrollHeight
    requestAnimationFrame(() => this.autoResizeTextarea());
  }

  collapseToPill() {
    this.isExpanded.set(false);
    this.isManualExpanded.set(false);
    // Clear inline height immediately so CSS collapsed max-height takes over on next frame
    const el = this.editorRef?.nativeElement;
    if (el) el.style.height = '';
    requestAnimationFrame(() => this.autoResizeTextarea());
  }

  checkAndApplyAutoExpand(text: string, scrollH?: number, lineH?: number) {
    // Use the ProseMirror div inside the editorRef host for accurate scroll height
    const host = this.editorRef?.nativeElement;
    const el = host?.querySelector('.ProseMirror') as HTMLElement | null ?? host;
    let visualLines = 1;
    if (el) {
      const style = getComputedStyle(host!);
      const lh = lineH ?? (parseFloat(style.lineHeight) || 19);
      const sh = scrollH ?? el.scrollHeight;
      const padTop = parseFloat(style.paddingTop) || 0;
      const padBot = parseFloat(style.paddingBottom) || 0;
      const contentH = Math.max(lh, sh - padTop - padBot);
      visualLines = Math.max(1, Math.round(contentH / lh));
    } else {
      visualLines = Math.max(1, (text || '').split('\n').length);
    }
    if (this.composerLineCount() !== visualLines) {
      this.composerLineCount.set(visualLines);
    }
  }

  onComposerInput(event: Event): void {
    this.autoResizeTextarea();
  }

  private isTextareaResizing = false;

  autoResizeTextarea(): void {
    if (this.isTextareaResizing) return; // re-entrancy guard
    this.isTextareaResizing = true;

    const host = this.editorRef?.nativeElement as HTMLElement | undefined;
    // Measure the inner ProseMirror element for accurate content height
    const prose = host?.querySelector('.ProseMirror') as HTMLElement | null;
    const el = prose ?? host;
    if (!el || !host) { this.isTextareaResizing = false; return; }

    // Reset host height so the inner element can report natural scroll height
    host.style.height = '';
    const style = getComputedStyle(host);
    const scrollH = el.scrollHeight;
    const lineH = parseFloat(style.lineHeight) || 19;

    // Track line count for showExpandIcon (>= 5 lines)
    this.checkAndApplyAutoExpand(this.richEditor.getText(), scrollH, lineH);

    if (this.isExpanded()) {
      // Expanded: grow host to content height (capped by CSS max-height)
      host.style.height = scrollH + 'px';
    }
    // Collapsed: height stays '' → CSS min-height/max-height take over

    this.updateEditorScrollState(host);

    requestAnimationFrame(() => {
      this.isTextareaResizing = false;
      this.updateEditorScrollState(host);
    });
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
                this.stageFiles([file]);
                this.uiStore.triggerToast(`📋 Staged file (${this.formatBytes(file.size)}) into composer`);
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
      // With Tiptap, insert the pasted text at the current cursor position
      this.richEditor.editor?.commands.insertContent(text);
      const newText = this.richEditor.getText();

      this.dismissGhostSuggestion();
      this.recordHistory(newText, true, 'paste');

      const res = await this.clipboard.classifyAsync(newText);
      this.classified.set(res);
      this.onTextChange(false);
      // Tiptap manages cursor position natively
      this.richEditor.focus('end');

      this.uiStore.triggerToast('📋 Content pasted into composer');
    } catch (err) {
      this.uiStore.triggerToast('⚠️ Clipboard access denied by browser');
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




  stagedText = signal<string>(this.loadInitialStagedText());
  /**
   * Convenience accessor — now backed by the Tiptap editor's plain text
   * for read operations, and setHTML/setText for write operations.
   *
   * READ:  returns plain text (for search, line count, sync diff checks, byte size)
   * WRITE: if value looks like HTML, sets as HTML; otherwise sets as plain text
   */
  get payloadText(): string {
    return this.richEditor.getText();
  }
  set payloadText(v: string) {
    if (!v) {
      this.richEditor.clear();
      this.stagedText.set('');
      return;
    }
    this.richEditor.setContent(v);
    this.stagedText.set(this.richEditor.getText());
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

  // Synchronous Send / In-flight Beam States & Retry Affordance
  isSending = signal<boolean>(false);
  sendError = signal<string | null>(null);
  lastFailedPayload = signal<{ text: string; attachments: StagedAttachment[]; targetDevId?: string; blame: LineBlameEntry[]; options?: any } | null>(null);

  // In-flight Async Detection & Paste Queue
  inFlightDetectId = signal<string | null>(null);
  inFlightDetectDescription = signal<string>('Detecting format & metadata…');
  inFlightDetectCounter = signal<string>('');
  private pasteDropQueue: Array<{ rawText?: string; files?: File[]; isInstant?: boolean }> = [];
  private isProcessingPasteDropQueue = false;

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

  /** Guards against stacking multiple FLIP calls within the same animation frame */
  private flipPending = false;

  constructor() {
    // Smooth FLIP layout animation: fires only when the ordered list of tile IDs changes.
    // Using displayedItemOrder (ID sequence) instead of displayedVaultItems (full objects)
    // prevents spurious animations on status/progress/sync-metadata updates.
    effect(() => {
      // Reactive dependency: only the ordered ID sequence
      const _order = this.displayedItemOrder();

      // Capture current DOM positions synchronously (before RAF runs the FLIP).
      // This ensures the "before" snapshot reflects positions at the moment the order changed.
      const gridEl = this.cardGridRef?.nativeElement;
      const hasExistingRects = this.prevCardRects.size > 0;

      // Snapshot current positions immediately (synchronous, pre-RAF)
      const snapshotBefore = new Map(this.prevCardRects);

      // Update our stored snapshot to the NEW positions after DOM settles
      if (!this.flipPending) {
        this.flipPending = true;
        this.ngZone.runOutsideAngular(() => {
          requestAnimationFrame(() => {
            this.flipPending = false;
            if (gridEl && hasExistingRects && snapshotBefore.size > 0) {
              this.motion.animateGridFlip(gridEl, snapshotBefore);
            }
            // Always refresh snapshot so next change has fresh "before" positions
            this.captureCardPositions();
          });
        });
      }
    });

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

  private captureCardPositions() {
    const gridEl = this.cardGridRef?.nativeElement;
    if (!gridEl) return;
    this.prevCardRects.clear();
    const cards = gridEl.querySelectorAll<HTMLElement>('.vault-card-cell');
    cards.forEach(card => {
      const cardInner = card.querySelector<HTMLElement>('.av-card');
      const cardId = cardInner?.getAttribute('data-card-id');
      if (cardId) {
        this.prevCardRects.set(cardId, card.getBoundingClientRect());
      }
    });
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
    // Fire-and-forget: async IndexedDB write/delete, non-blocking
    if (!text || !text.trim()) {
      this.storageService.clearDraft();
    } else {
      this.storageService.saveDraft(text);
    }
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
    // ── Forensic instrumentation: install long-task observer + export helper (§14) ──
    installLongTaskObserver();
    installGlobalExporter();

    const el = this.editorRef?.nativeElement;
    if (el) {
      this.richEditor.init(el);
      // Subscribe to content changes from Tiptap — runs inside Angular zone (from service)
      this.subs.push(
        this.richEditor.content$.subscribe(html => {
          // Update stagedText (plain text for search/sync/size) from the editor
          const plain = this.richEditor.getText();
          this.stagedText.set(plain);
          // Trigger the existing text-change pipeline (detection, sync, draft save)
          this.onTextChange(true);
          // Resize the editor host element
          this.autoResizeTextarea();
        })
      );
      // Subscribe to selection changes to position floating bubble toolbar above selected text
      this.subs.push(
        this.richEditor.selection$.subscribe(({ empty }) => {
          this.handleSelectionUpdate(empty);
        })
      );
      // Subscribe to transactions (format toggles, cursor updates) to keep active toolbar signals reactive
      this.subs.push(
        this.richEditor.transaction$.subscribe(() => {
          this.updateActiveFormattingStates();
        })
      );
      // Restore any pre-filled draft text
      setTimeout(() => {
        if (this.payloadText.trim()) {
          this.onTextChange(false);
        }
        this.autoResizeTextarea();
      }, 0);
    }
  }

  ngOnDestroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.clickPulseTimer) clearTimeout(this.clickPulseTimer);
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
    // Destroy the Tiptap editor instance
    this.richEditor.destroy();
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
   *
   * SCOPE RESTRICTION:
   * To guarantee zero corruption and prevent performance degradation on long-form,
   * multiline, or markdown/code documents, live inline highlight decoration is
   * strictly restricted to SHORT, single-line clipboard content (< 500 chars, single line).
   * For multiline/markdown/code content, entity detection is handled in read-only preview.
   */
  private runComposerDetection(text: string) {
    if (!text || !text.trim()) {
      this.composerMatches.set([]);
      return;
    }

    // Only run live composer entity detection on short single-line content
    const isSingleLine = !text.includes('\n');
    const isShort = text.length < 500;
    if (!isSingleLine || !isShort) {
      this.composerMatches.set([]);
      return;
    }

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
    // With Tiptap, cursor position is tracked internally — use text length as approximation
    const cursorPos = this.richEditor.getText().length;
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

  async enableFullProcessing() {
    this.forceFullFidelity.set(true);
    const text = this.payloadText || '';
    if (!text.trim()) return;

    // Clear debounce timer and run deep analysis immediately
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    try {
      const res = await this.clipboard.classifyAsync(text);
      this.classified.set(res);
      this.runComposerDetection(text);
      this.uiStore.triggerToast(`⚡ Deep analysis complete: detected ${res.category.toUpperCase()}`);
    } catch {
      this.onTextChange(false);
    }
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
                this.stageFiles([file]);
                this.uiStore.triggerToast(`📋 Staged file (${this.formatBytes(file.size)}) into composer`);
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

      // Insert plain/formatted text at cursor via Tiptap
      this.richEditor.editor?.commands.insertContent(text);
      const newText = this.richEditor.getText();

      this.dismissGhostSuggestion();
      this.recordHistory(newText, true, 'paste');

      const res = await this.clipboard.classifyAsync(newText);
      this.classified.set(res);
      this.onTextChange(false);
      this.richEditor.focus('end');
      this.uiStore.triggerToast('📋 Content pasted into composer');

      this.richEditor.focus('end');
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

  onCapsuleClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    // Don't intercept clicks that occurred on interactive buttons, popovers, chips, toolbar, or inputs
    if (target?.closest('button') || target?.closest('.composer-tool-btn') || target?.closest('.composer-popover-anchor') ||
      target?.closest('.composer-label-chip-group') || target?.closest('.staged-attachment-tile') ||
      target?.closest('.chat-attach-popover') || target?.closest('.composer-selection-toolbar') ||
      target?.closest('input') || target?.closest('.capsule-input-area') || target?.closest('.chat-composer-textarea') ||
      target?.closest('.ProseMirror')) {
      return;
    }
    if (this.ghostSuggestion()) {
      this.dismissGhostSuggestion();
    }
    // Only if clicking on empty background margin outside the text area and input capsule, focus editor at end
    this.richEditor.focus('end');
  }

  onInputClick(e?: MouseEvent) {
    if (this.ghostSuggestion()) {
      this.dismissGhostSuggestion();
    }
    // Do NOT force focus('end') on input click; allow user's cursor/range selection to stay intact.
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

    this.richEditor.editor?.commands.insertContent(suggestion);
    const newText = this.richEditor.getText();

    this.dismissGhostSuggestion();
    this.recordHistory(newText, true, 'suggestion');
    this.onTextChange(false);

    this.richEditor.focus('end');
    this.dismissGhostSuggestion();
    this.uiStore.triggerToast('📋 Auto-captured clipboard content into composer');
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
    this.richEditor.clear();
    this.stagedText.set('');
    this.classified.set(null);
    this.liveBlameMap.set([]);
    this.saveStagedText('');
    this.undoManager.reset('', []);
    this.updateUndoRedoSignals();
    this.onTextChange(false);
    // Reset composer height
    const el = this.editorRef?.nativeElement;
    if (el) el.style.height = '';
    this.isExpanded.set(false);
    this.isManualExpanded.set(false);
  }

  /**
   * Clears the current input text, draft, and staged attachments from the composer tab.
   * Does not affect any saved vault clipboard items.
   */
  clearCurrentInput(e?: Event) {
    if (e) {
      e.stopPropagation();
      this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    }
    const hadContent = !this.richEditor.isEmpty() || this.stagedText().trim().length > 0 || this.stagedAttachments().length > 0;
    this.clearText();
    // Clean up any object URLs for staged attachments
    this.stagedAttachments().forEach(a => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    this.stagedAttachments.set([]);
    this.dismissGhostSuggestion();
    if (hadContent) {
      this.uiStore.triggerToast('🧹 Input cleared');
    }
  }

  triggerBeam(e?: Event) {
    // ── §12 Duplicate execution counter ─────────────────────────────────────
    resetCounters();
    const execCount = countStage('SEND_HANDLER');

    const textToBeam = this.richEditor.isEmpty() ? '' : this.richEditor.getHTML();
    const plainText = this.richEditor.getText();
    const attachments = this.stagedAttachments();
    if (!plainText.trim() && attachments.length === 0) return;
    if (e) this.motion.animateButtonBounce(e.currentTarget as HTMLElement);
    const blameToBeam = this.liveBlameMap();
    const targetDevId = this.selectedTargetId();

    // ── §1 Correlation ID — threads through every layer ──────────────────────
    const operationId = crypto.randomUUID();
    const connectedDeviceCount = this.deviceService.pairedDevices().filter(d => d.status !== 'revoked' && d.syncEnabled !== false).length;

    // ── §14 Memory snapshot before any send work begins ─────────────────────
    const memBefore = snapshotMemory('BEFORE_SEND');

    // ── §16 Create structured test run record ────────────────────────────────
    const run = createRun(operationId, attachments.length, connectedDeviceCount, attachments.reduce((s, a) => s + (a.file?.size ?? 0), 0));
    run.duplicateExecutionDetected = execCount > 1;
    run.memoryBefore = memBefore;

    // ── §13 Reset effect audit registry for a clean per-run window ───────────
    resetEffectRegistry();

    markStart(operationId, 'SEND_TOTAL');
    watchdogStart(operationId, 'PREPARING');

    // ── §3 Composer snapshot BEFORE any mutation ─────────────────────────────
    const snapBefore = snapshotComposer(
      operationId, 'BEFORE_SEND',
      plainText.length,
      attachments as any,
      connectedDeviceCount
    );
    run.composerSnapshotBefore = snapBefore;

    sendLog(operationId, 'SEND_CLICK', {
      execCount,
      textLength: plainText.length,
      attachmentCount: attachments.length,
      attachments: attachments.map(a => ({ id: a.id, name: a.name, sizeBytes: a.file.size, type: a.file.type })),
      connectedDeviceCount,
      targetDevId,
    });

    const beamOpts = {
      tag: this.currentTag() || undefined,
      customCategory: this.isCodeJsonHintActive() ? 'code' : undefined,
      retentionTtlMs: this.perItemRetentionTtl() !== null ? this.perItemRetentionTtl()! : undefined
    };

    // ── §5 Divergence check: what user sees vs what we're about to send ───────
    const composerIds = attachments.map(a => a.id);
    // For pure text sends payloadResourceIds is empty — divergence only matters when attachments exist
    if (attachments.length > 0) {
      checkDivergence(operationId, composerIds, composerIds); // pre-send: IDs should match themselves
    }

    markStart(operationId, 'VALIDATE');
    recordStage(run, 'validation', getMeasureMs(operationId, 'VALIDATE'), 'ok');
    markEnd(operationId, 'VALIDATE');

    // ── §4 FILE PIPELINE ─────────────────────────────────────────────────────
    if (attachments.length > 0) {
      markStart(operationId, 'FILE_COLLECTION');
      sendLog(operationId, 'FILE_COLLECTION_START', { count: attachments.length });
      countStage('FILE_HANDLER');

      const files = attachments.map(a => a.file);

      // ── §3 Snapshot the moment we pass files to handler, BEFORE clearing ──
      sendLog(operationId, 'PRE_CLEAR_STATE', {
        attachmentCount: attachments.length,
        stagedAttachmentCount: this.stagedAttachments().length,
        t: performance.now(),
      });
      markEnd(operationId, 'FILE_COLLECTION');
      recordStage(run, 'resourceCollection', getMeasureMs(operationId, 'FILE_COLLECTION'), 'ok');

      watchdogStart(operationId, 'WORKER');
      // Store operationId on the component so the worker handler can pick it up
      (this as any)._activeOperationId = operationId;
      (this as any)._activeRun = run;

      markStart(operationId, 'WORKER');
      const richContentToSend = plainText.trim() ? (this.richEditor.getMarkdown() || plainText) : undefined;
      if (files.length === 1 && !richContentToSend) {
        this.handleFile(files[0]);
      } else {
        this.handleBatchFiles(files, richContentToSend);
      }

      // ── §3 Snapshot IMMEDIATELY after handleFile is called (sync part only) ─
      sendLog(operationId, 'POST_HANDLE_FILE_CALL', { t: performance.now(), uploadQueueLength: this.uploadQueue.length });

      attachments.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });

      // ── §3 Snapshot the stagedAttachments.set([]) mutation ───────────────
      const tBeforeClear = performance.now();
      this.stagedAttachments.set([]);
      sendLog(operationId, 'STAGED_ATTACHMENTS_CLEARED', {
        t: tBeforeClear,
        clearedCount: attachments.length,
        noteForReview: 'SUSPECTED_ISSUE: composer cleared before async worker/upload resolves',
      });
    }

    // ── §3 Snapshot per-item setting clears ──────────────────────────────────
    // Reset per-item settings immediately (transient per item)
    this.currentTag.set('');
    this.tagDraft.set('');
    this.isCodeJsonHintActive.set(false);
    this.perItemRetentionTtl.set(null);
    this.retentionPopoverOpen.set(false);
    this.tagInputOpen.set(false);
    this.isExpanded.set(false);
    this.isManualExpanded.set(false);

    // Capture the contentToBeam BEFORE clearText() clears the rich editor!
    const contentToBeam = plainText.trim() ? (this.richEditor.getMarkdown() || plainText) : '';

    // ── §3 Snapshot text clearance — note timestamp vs async resolution ───────
    const tBeforeTextClear = performance.now();
    this.clearText();
    sendLog(operationId, 'TEXT_CLEARED', {
      t: tBeforeTextClear,
      hadText: plainText.length > 0,
      noteForReview: 'Text cleared synchronously before async file pipeline completes',
    });

    const el = this.editorRef?.nativeElement;
    if (el) el.style.height = '';

    markStart(operationId, 'TEXT_BEAM');
    // Only fire standalone TEXT_BEAM if there were no attachments (if attachments existed, text was bundled as caption)
    if (plainText.trim() && attachments.length === 0) {
      sendLog(operationId, 'TEXT_BEAM_START', { textLength: plainText.length });
      countStage('BROADCAST');
      this.syncService.broadcastDraftFinalized();
      this.beamPayload.emit({
        text: contentToBeam,
        targetDeviceId: targetDevId,
        lineBlameMap: blameToBeam,
        options: beamOpts
      });
      sendLog(operationId, 'TEXT_BEAM_END', { textLength: plainText.length });
    }
    markEnd(operationId, 'TEXT_BEAM');
    recordStage(run, 'textBeam', getMeasureMs(operationId, 'TEXT_BEAM'), 'ok');
    watchdogClear(operationId);

    // ── §3 Snapshot after all synchronous send logic ──────────────────────────
    const snapAfter = snapshotComposer(
      operationId, 'AFTER_SEND_SYNC',
      this.richEditor.getText().length,
      this.stagedAttachments() as any,
      connectedDeviceCount
    );
    run.composerSnapshotAfter = snapAfter;
    sendLog(operationId, 'SEND_SYNC_COMPLETE', {
      attachmentsRemainingInComposer: snapAfter.attachmentCount,
      textRemainingInComposer: snapAfter.textLength,
    });

    // Clear the local IndexedDB draft now that this content has been committed as a Beam
    this.storageService.clearDraft();

    // Note: run.finalise() is called by the async worker/beam pipeline when DONE
    // If it's a text-only send, finalise here
    if (attachments.length === 0) {
      finaliseRun(run);
    }
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
      this.stageFiles(files);
      (e.target as HTMLInputElement).value = '';
    }
  }

  onPaste(e: ClipboardEvent) {
    this.dismissGhostSuggestion();
    if (e.clipboardData?.files.length) {
      e.preventDefault();
      const files = Array.from(e.clipboardData.files);
      this.enqueuePasteDrop({ files });
      return;
    }

    // MANDATORY PIPELINE RULE: Always extract plain text from the clipboard.
    // Never allow text/html from clipboard to inject arbitrary HTML elements or entities into the composer.
    const pastedText = e.clipboardData?.getData('text/plain') || '';
    if (!pastedText || !pastedText.trim()) return;

    // Route pasted text into composer queue as raw canonical text
    e.preventDefault();
    this.enqueuePasteDrop({ rawText: pastedText });
  }

  private enqueuePasteDrop(item: { rawText?: string; files?: File[] }) {
    this.pasteDropQueue.push(item);
    if (!this.isProcessingPasteDropQueue) {
      this.processNextPasteDropQueue();
    } else {
      this.updatePasteQueueCounter();
    }
  }

  private updatePasteQueueCounter() {
    const total = this.pasteDropQueue.length + (this.isProcessingPasteDropQueue ? 1 : 0);
    if (total > 1) {
      const currentIdx = 1;
      this.inFlightDetectCounter.set(`Processing ${currentIdx} of ${total}`);
    } else {
      this.inFlightDetectCounter.set('');
    }
  }

  private async processNextPasteDropQueue() {
    if (this.pasteDropQueue.length === 0) {
      this.isProcessingPasteDropQueue = false;
      this.inFlightDetectId.set(null);
      this.inFlightDetectCounter.set('');
      return;
    }

    this.isProcessingPasteDropQueue = true;
    const item = this.pasteDropQueue.shift()!;
    this.updatePasteQueueCounter();

    const opId = `detect_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.inFlightDetectId.set(opId);
    this.inFlightDetectDescription.set(item.files ? `Staging ${item.files.length} file(s)…` : 'Detecting format & metadata…');

    // 1. Register "detect" operation in AirVaultOperationStateService
    this.operationState.registerOperation(opId, 'composer', 'detect', 0, this.inFlightDetectDescription());

    try {
      if (item.files && item.files.length > 0) {
        this.stageFiles(item.files);
        this.operationState.completeOperation(opId);
      } else if (item.rawText) {
        const rawText = item.rawText;
        // Offload detection off-thread
        this.operationState.updateProgress(opId, 30, 'Running AST classification…');
        const classified = await this.clipboard.classifyAsync(rawText);
        this.operationState.updateProgress(opId, 80, 'Applying to composer…');

        this.richEditor.editor?.commands.insertContent(rawText);
        const newText = this.richEditor.getText();
        this.recordHistory(newText, true, 'paste');
        this.onTextChange(false);

        this.operationState.completeOperation(opId);
      }
    } catch (err: any) {
      this.operationState.failOperation(opId, err?.message || 'Detection failed');
      this.uiStore.triggerToast('⚠️ Clipboard parsing encountered an issue');
    } finally {
      this.inFlightDetectId.set(null);
      // Process next in queue sequentially
      this.processNextPasteDropQueue();
    }
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
      this.stageFiles([zipFile]);
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
      this.stageFiles([zipFile]);
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
      this.stageFiles(files);
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
      this.stageFiles([zipFile]);
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
   * Multi-file Batch Upload Handler (supports standalone file batches and mixed text + file payloads)
   * Enforces max 20 files per batch and total combined storage cap before starting.
   * Creates a single parent batch item containing individual items.
   */
  private async handleBatchFiles(files: File[], richTextCaption?: string) {
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
        this.uiStore.triggerToast(`⛔ "${f.name}" (${(f.size / 1024 / 1024).toFixed(1)} MB) exceeds single file limit of 1 GB.`);
        return;
      }
      totalBatchBytes += f.size;
    }

    const batchId = `av_batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const curDev = this.deviceService.currentDevice();
    const curUserName = curDev.username ? `@${curDev.username}` : (curDev.name || 'User');
    const authorColor = this.colorService.getColorForIdentity(curDev.username || curDev.id, curDev.accentColor);

    // Create child items in pending state
    const childItems: AirVaultItem[] = files.map((file, i) => {
      const classified = this.clipboard.classify(file.type ? `data:${file.type};base64,` : '', file.name);
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
          category: classified.category,
          raw: '',
          filename: file.name,
          byteSize: file.size,
          isSensitive: false
        }
      };
    });

    const captionText = richTextCaption && richTextCaption.trim() ? richTextCaption : `Batch of ${files.length} files (${(totalBatchBytes / 1024 / 1024).toFixed(1)} MB)`;

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
        raw: captionText,
        filename: `${files.length} Files Batch`,
        byteSize: totalBatchBytes,
        isSensitive: false,
        collapseState: 'collapsed'
      }
    };

    // Save batch parent tile to UI & storage
    this.storageService.addItem(parentBatchItem);
    this.uiStore.triggerToast(`📦 Uploading ${files.length} resource${files.length > 1 ? 's' : ''}...`);

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

    // 0. Strict 1 GB Single File Limit Guard
    if (file.size > MAX_SINGLE_FILE_SIZE_BYTES) {
      this.uiStore.triggerToast(`⛔ File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the maximum single file upload limit of 1 GB.`);
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

    // ── §1 Forensic: pick up correlation ID threaded from triggerBeam ────────
    const operationId: string = (this as any)._activeOperationId || 'no-op-id';
    const _fileHandleStartT = performance.now();
    logFileStart(operationId, file.name, file.size, file.type, 'main');
    countStage('FILE_HANDLER');

    // 2. Large File Notification (> 5 MB has lifetime retention, > 50 MB triggers chunked encryption note)
    if (file.size > 50 * 1024 * 1024) {
      this.largeFileWarning.set(`⚠️ Large resource detected (${(file.size / 1024 / 1024).toFixed(1)} MB). Off-thread chunked AES-GCM encryption started. Large resources (>5 MB) are retained for clipboard lifetime.`);
      setTimeout(() => this.dismissLargeFileWarning(), 8000);
    }

    const curDev = this.deviceService.currentDevice();
    const curUserName = curDev.username ? `@${curDev.username}` : (curDev.name || 'User');

    // ── §4 FILE_VALIDATED checkpoint (all guards passed) ─────────────────────
    logFileValidated(operationId, file.name, performance.now() - _fileHandleStartT);

    // 3. Authoritative Server Cap Check & Session Initiation
    let uploadSessionId: string | undefined = undefined;
    const itemId = explicitItemId || `av_file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const uploadInitStart = performance.now();
    logUploadInitStart(operationId, itemId, file.size);
    logRequestStart(operationId, '/api/v1/airvault/clipboards/default/uploads', file.size);
    try {
      const initRes = await fetch(getAirVaultApiUrl('/api/v1/airvault/clipboards/default/uploads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Operation-Id': operationId },
        body: JSON.stringify({
          fileId: itemId,
          fileName: file.name,
          category: this.clipboard.classify(file.type ? `data:${file.type};base64,` : '', file.name).category,
          declaredSize: file.size,
          chunkSize: 4 * 1024 * 1024,
          totalChunks: Math.max(1, Math.ceil(file.size / (4 * 1024 * 1024))),
          senderDeviceId: curDev.id,
          senderDeviceName: curUserName,
          batchId: batchId
        })
      });

      const uploadInitDuration = performance.now() - uploadInitStart;
      if (initRes.ok) {
        const initData = await initRes.json();
        uploadSessionId = initData.data?.uploadSessionId;
        logUploadInitEnd(operationId, itemId, uploadInitDuration, initRes.status, !!uploadSessionId);
        logRequestEnd(operationId, '/api/v1/airvault/clipboards/default/uploads', uploadInitDuration, initRes.status);
      } else if (initRes.status === 400) {
        const uploadInitBodyText = await initRes.text().catch(() => '');
        const errJson = (() => { try { return JSON.parse(uploadInitBodyText); } catch { return {}; } })();
        const msg = errJson.message || `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds server clipboard cap`;
        logUploadInitEnd(operationId, itemId, uploadInitDuration, initRes.status, false);
        logRequestEnd(operationId, '/api/v1/airvault/clipboards/default/uploads', uploadInitDuration, initRes.status, uploadInitBodyText);
        this.uiStore.triggerToast(`⛔ ${msg}`);
        return;
      } else {
        // Backend returned 502/504/404 (offline or unreachable) - continue gracefully with 100% client-side local storage & P2P sync
        logUploadInitEnd(operationId, itemId, uploadInitDuration, initRes.status, false);
        logRequestEnd(operationId, '/api/v1/airvault/clipboards/default/uploads', uploadInitDuration, initRes.status);
        AirVaultLogger.debug(`[AirVault] Backend upload initiation returned HTTP ${initRes.status}. Continuing client-side.`);
      }
    } catch (networkErr) {
      const uploadInitDuration = performance.now() - uploadInitStart;
      logUploadInitEnd(operationId, itemId, uploadInitDuration, 0, false);
      logRequestFailed(operationId, '/api/v1/airvault/clipboards/default/uploads', String(networkErr), uploadInitDuration);
      // Backend completely offline - seamless client-side fallback
    }

    // 4. If single file upload (no batchId), immediately create single tile in "pending" / "processing" state
    if (!batchId) {
      const classified = this.clipboard.classify(file.type ? `data:${file.type};base64,` : '', file.name);
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
          category: classified.category,
          raw: '',
          filename: file.name,
          byteSize: file.size,
          isSensitive: false
        }
      };

      AirVaultLogger.debug('[upload] bytes added to clipboard total:', file.size);

      // §6 §9: Log signal write — carries full items list, potential CD pressure
      logSignalWrite(operationId, 'storageService.allItems (pendingItem prepend)', this.storageService.allItems().length + 1);
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

    // Retrieve correlation ID set by triggerBeam (§1 — ID threads through every layer)
    const operationId: string = (this as any)._activeOperationId || 'no-op-id';
    countStage('UPLOAD');
    sendLog(operationId, 'QUEUE_DEQUEUE', { itemId, fileSize: file.size, fileType: file.type, queueRemaining: this.uploadQueue.length });

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
        // ── §4/§7: postMessage queue delay = main-thread saturation indicator ──
        const _workerMsgT = performance.now();
        const _queueDelayMs = getWorkerPostElapsedMs(itemId); // ms from postMessage call to THIS handler
        const _workerRoundTripMs = _workerMsgT - workerPostT;
        logWorkerMessage(operationId, itemId, event.data?.type ?? 'unknown', _queueDelayMs); // §4 WORKER_MESSAGE
        sendLog(operationId, 'WORKER_MSG_RECEIVED', {
          itemId,
          msgType: event.data?.type,
          queueDelayMs: _queueDelayMs.toFixed(2),       // §7: postMessage fire → handler start
          workerRoundTripMs: _workerRoundTripMs.toFixed(2), // §7: total round-trip
        });

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

          // ── §6/§7 Measure raw content size coming back from worker (§2 base64 suspect)
          const rawContentBytes = typeof data.raw === 'string' ? data.raw.length : (typeof data.rawContent === 'string' ? data.rawContent.length : 0);
          const previewUrlBytes = typeof data.previewUrl === 'string' ? data.previewUrl.length : 0;
          markEnd(operationId, 'WORKER');
          watchdogClear(operationId);
          sendLog(operationId, 'WORKER_DONE', {
            itemId,
            rawContentBytes,
            previewUrlBytes,
            workerTotalMs: getMeasureMs(operationId, 'WORKER').toFixed(2),
            category: data.category,
            fileSize: data.byteSize || data.finalSize,
            noteForReview: rawContentBytes > 500_000
              ? '⚠️ LARGE_BASE64_TRANSFER: rawContent exceeds 500KB — this is the worker→main thread base64 transfer suspect'
              : 'raw content size acceptable',
          });

          const classified: ClassifiedContent = {
            category: data.category,
            raw: data.rawContent || data.raw,
            previewUrl: data.previewUrl,
            filename: data.filename,
            byteSize: data.finalSize || data.byteSize,
            isSensitive: false
          };

          // Check if identical content exists for a paired user / connected device
          if (!batchId) {
            const curUser = this.deviceService.currentDevice().username?.toLowerCase().replace(/^@/, '');
            const curDevId = this.deviceService.currentDevice().id;
            const pairedResources = this.storageService.allItems().filter(i => {
              const owner = (i.originOwnerId || i.senderDeviceName || i.senderDeviceId || '').toLowerCase().replace(/^@/, '');
              return owner && owner !== curUser && owner !== curDevId;
            });
            const pairedDup = checkDuplicateResource(classified, pairedResources);
            if (pairedDup.isDuplicate && pairedDup.matchedUsername) {
              this.uiStore.openDuplicateModal(pairedDup.matchedUsername, classified);
            }
          }

          const _resourceCreatedT = performance.now();
          logResourceCreated(operationId, itemId, _workerRoundTripMs, data.category, data.byteSize || data.finalSize || file.size); // §4 RESOURCE_CREATED
          markStart(operationId, 'STATE_UPDATE');
          // Cache and persist original file/blob for high-res preview & downloads
          if (file) {
            this.storageService.resourceCache.put(itemId, file);
            this.storageService.savePayloadToIndexedDb(itemId, file);
          }
          this.storageService.updateItemProcessingState(itemId, 'done', classified);
          markEnd(operationId, 'STATE_UPDATE');
          const _persistMs = getMeasureMs(operationId, 'STATE_UPDATE');
          logResourcePersisted(operationId, itemId, _persistMs); // §4 RESOURCE_PERSISTED
          sendLog(operationId, 'STATE_UPDATE_DONE', {
            itemId, stateUpdateMs: _persistMs.toFixed(2),
          });
          clearWorkerPostTime(itemId); // §7: clean up timing map
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
                raw: parentBatch.content?.raw,
                batchFiles: parentBatch.batchFiles?.map(bf => ({
                  id: bf.id,
                  content: bf.content,
                  timestamp: bf.timestamp
                }))
              });
              this.beamPayload.emit({ text: batchPayload, targetDeviceId: this.selectedTargetId(), filename: `${parentBatch.batchFiles?.length || 0} Files Batch`, existingItemId: parentBatch.id });
            }
          } else {
            // ── §4 Log individual file beam before emit ──────────────────────────────────
            logResourceReady(operationId, itemId, _workerRoundTripMs + _persistMs); // §4 RESOURCE_READY
            sendLog(operationId, 'FILE_BEAM_EMIT', {
              itemId, filename: classified.filename, category: classified.category,
              rawBytes: typeof classified.raw === 'string' ? classified.raw.length : 0,
            });
            this.beamPayload.emit({ 
              text: classified.raw, 
              targetDeviceId: this.selectedTargetId(), 
              filename: classified.filename, 
              existingItemId: itemId,
              options: { byteSize: classified.byteSize }
            });
            // §4/§16 Finalise the run record
            const activeRun: any = (this as any)._activeRun;
            if (activeRun) {
              markEnd(operationId, 'SEND_TOTAL');
              recordStage(activeRun, 'worker', getMeasureMs(operationId, 'WORKER'), 'ok');
              recordStage(activeRun, 'stateUpdate', _persistMs, 'ok');
              recordStage(activeRun, 'api', getMeasureMs(operationId, 'VALIDATE'), 'ok', 'upload-init included');
              finaliseRun(activeRun);
              (this as any)._activeRun = null;
            }
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

      // ── §4/§7: Measure structured-clone cost + queue delay ─────────────────
      const workerPostT = performance.now();
      recordWorkerPostTime(itemId);       // §7: store t₀ for postMessage→onmessage gap calc
      markStart(operationId, `WORKER_POST_${itemId}`);
      logWorkerPost(operationId, itemId, file.size, file.type); // §4 WORKER_POST
      countStage('PERSIST');
      // Protocol START / PROCESS_FILE_CHUNKED message with server session ID
      worker.postMessage({
        type: 'PROCESS_FILE_CHUNKED',
        id: itemId,
        operationId,             // ─ thread operationId into worker for echo-back
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
      markEnd(operationId, `WORKER_POST_${itemId}`);
      const _postMsgDurationMs = getMeasureMs(operationId, `WORKER_POST_${itemId}`);
      sendLog(operationId, 'WORKER_POST_DONE', {
        itemId,
        postMessageDurationMs: _postMsgDurationMs.toFixed(2),
        note: 'High duration = structured-clone serialization cost on main thread (§7 suspect)',
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
        if (totalBytes <= 50 * 1024 * 1024) {
          try {
            rawContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } catch {
            rawContent = '';
          }
        } else {
          rawContent = '';
        }
      } else if (totalBytes <= 25 * 1024 * 1024) {
        try {
          rawContent = await file.text();
        } catch {
          rawContent = '';
        }
      } else {
        rawContent = '';
      }

      const classifiedContent = this.clipboard.classify(file.type ? `data:${file.type};base64,` : rawContent, file.name);
      const classified: ClassifiedContent = {
        category: classifiedContent.category,
        raw: rawContent,
        previewUrl: previewUrl || (isImg ? rawContent : undefined),
        filename: file.name,
        byteSize: totalBytes,
        isSensitive: false
      };

      // Check if identical content exists for a paired user / connected device
      if (!batchId) {
        const curUser = this.deviceService.currentDevice().username?.toLowerCase().replace(/^@/, '');
        const curDevId = this.deviceService.currentDevice().id;
        const pairedResources = this.storageService.allItems().filter(i => {
          const owner = (i.originOwnerId || i.senderDeviceName || i.senderDeviceId || '').toLowerCase().replace(/^@/, '');
          return owner && owner !== curUser && owner !== curDevId;
        });
        const pairedDup = checkDuplicateResource(classified, pairedResources);
        if (pairedDup.isDuplicate && pairedDup.matchedUsername) {
          this.uiStore.openDuplicateModal(pairedDup.matchedUsername, classified);
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
            raw: parentBatch.content?.raw,
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
        this.beamPayload.emit({ 
          text: classified.raw, 
          targetDeviceId: this.selectedTargetId(), 
          filename: classified.filename, 
          existingItemId: itemId,
          options: { byteSize: classified.byteSize }
        });
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
      case 'markdown': return 'file-text';
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
  // ── Rich-Text Toolbar (Tiptap-delegating, replaces markdown string-splice approach) ──

  showSelectionToolbar = signal(false);
  selectionToolbarPos = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  showHeadingMenu = signal(false);
  showFontSizeMenu = signal(false);
  showLinkInput = signal(false);
  linkUrlDraft = signal<string>('');
  // Active formatting state signals (driven by editor transactions and selection changes)
  isBoldActive = signal<boolean>(false);
  isItalicActive = signal<boolean>(false);
  isUnderlineActive = signal<boolean>(false);
  isCodeActive = signal<boolean>(false);
  isBlockquoteActive = signal<boolean>(false);
  isLinkActive = signal<boolean>(false);
  activeHeadingLevel = signal<number | 'ordered' | 'bullet' | 'quote' | 0>(0);

  activeHeadingLabel = computed(() => {
    const lvl = this.activeHeadingLevel();
    if (lvl === 1) return 'H1';
    if (lvl === 2) return 'H2';
    if (lvl === 3) return 'H3';
    if (lvl === 'bullet') return 'Bullet';
    if (lvl === 'ordered') return '123';
    if (lvl === 'quote') return 'Quote';
    return 'Text';
  });

  toggleHeadingMenu(): void {
    this.showLinkInput.set(false);
    this.showHeadingMenu.set(!this.showHeadingMenu());
  }

  updateActiveFormattingStates(): void {
    this.isBoldActive.set(this.richEditor.isBoldActive());
    this.isItalicActive.set(this.richEditor.isItalicActive());
    this.isUnderlineActive.set(this.richEditor.isUnderlineActive());
    this.isCodeActive.set(this.richEditor.isCodeActive());
    this.isBlockquoteActive.set(this.richEditor.isBlockquoteActive());
    this.isLinkActive.set(this.richEditor.isLinkActive());
    if (this.richEditor.isOrderedListActive()) {
      this.activeHeadingLevel.set('ordered');
    } else if (this.richEditor.isBulletListActive()) {
      this.activeHeadingLevel.set('bullet');
    } else if (this.richEditor.isBlockquoteActive()) {
      this.activeHeadingLevel.set('quote');
    } else if (this.richEditor.isHeadingActive(1)) {
      this.activeHeadingLevel.set(1);
    } else if (this.richEditor.isHeadingActive(2)) {
      this.activeHeadingLevel.set(2);
    } else if (this.richEditor.isHeadingActive(3)) {
      this.activeHeadingLevel.set(3);
    } else {
      this.activeHeadingLevel.set(0);
    }
  }

  handleSelectionUpdate(empty: boolean): void {
    this.updateActiveFormattingStates();

    if (empty) {
      if (this.showLinkInput()) {
        this.showLinkInput.set(false);
      }
      if (!this.showHeadingMenu() && !this.showFontSizeMenu()) {
        this.showSelectionToolbar.set(false);
      }
      return;
    }

    if (typeof window === 'undefined') return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      this.showSelectionToolbar.set(false);
      return;
    }

    const range = sel.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();
    if (!rangeRect || (rangeRect.width === 0 && rangeRect.height === 0)) {
      this.showSelectionToolbar.set(false);
      return;
    }

    const editorEl = this.editorRef?.nativeElement;
    if (!editorEl) return;

    const parentArea = editorEl.closest('.capsule-input-area') as HTMLElement;
    const parentRect = (parentArea || editorEl).getBoundingClientRect();

    // Position bubble comfortably above the selection or float cleanly above the capsule
    const spaceAbove = rangeRect.top - parentRect.top;
    let top: number;
    if (spaceAbove >= 44) {
      top = spaceAbove - 42;
    } else {
      // Float cleanly right above the input capsule (top: -42px) without overlapping text
      top = -42;
    }
    const selCenterX = (rangeRect.left + rangeRect.right) / 2;
    const left = Math.max(8, Math.min(parentRect.width - 250, selCenterX - parentRect.left - 120));

    this.selectionToolbarPos.set({ top, left });
    this.showSelectionToolbar.set(true);
  }

  onComposerSelect(_e?: Event): void {
    this.updateSelectionToolbar();
  }

  updateSelectionToolbar(): void {
    const editor = this.richEditor.editor;
    if (editor) {
      const { empty } = editor.state.selection;
      this.handleSelectionUpdate(empty);
    }
  }

  applyFormat(type: 'bold' | 'italic' | 'underline' | 'code' | 'codeBlock'): void {
    if (type === 'bold') {
      this.richEditor.toggleBold();
    } else if (type === 'italic') {
      this.richEditor.toggleItalic();
    } else if (type === 'underline') {
      this.richEditor.toggleUnderline();
    } else if (type === 'code') {
      this.richEditor.toggleCode();
    } else if (type === 'codeBlock') {
      this.richEditor.toggleCodeBlock();
    }
    this.updateActiveFormattingStates();
  }

  applyHeading(level: 0 | 1 | 2 | 3 | 'ordered' | 'bullet' | 'quote'): void {
    if (level === 'ordered') {
      this.richEditor.toggleOrderedList();
    } else if (level === 'bullet') {
      this.richEditor.toggleBulletList();
    } else if (level === 'quote') {
      this.richEditor.toggleBlockquote();
    } else {
      this.richEditor.toggleHeading(level);
    }
    this.showHeadingMenu.set(false);
    this.updateActiveFormattingStates();
  }

  setComposerFontSize(size: string): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--av-clipboard-font-size', size);
    }
    this.showFontSizeMenu.set(false);
  }

  toggleLinkInput(): void {
    this.showHeadingMenu.set(false);
    this.showFontSizeMenu.set(false);
    this.showLinkInput.set(!this.showLinkInput());
    if (this.showLinkInput()) this.linkUrlDraft.set('');
  }

  applyLink(): void {
    const url = this.linkUrlDraft().trim();
    if (!url) { this.showLinkInput.set(false); return; }
    const formatted = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    this.richEditor.setLink(formatted);
    this.showLinkInput.set(false);
    this.showSelectionToolbar.set(false);
    this.updateActiveFormattingStates();
  }

  isHeadingActive(level: 1 | 2 | 3): boolean { return this.activeHeadingLevel() === level; }
}

