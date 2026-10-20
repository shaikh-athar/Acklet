import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ElementRef,
  ViewChild,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';

import {
  ClipboardApiService,
  ClipboardConfigDto,
  type ClipboardItem,
  type ClipboardTextRevision,
  ClipboardShare,
  CreateShareOptions,
  type ApiResponse,
  type UploadSessionResponse,
  type UploadChunkResponse
} from './services/clipboard-api.service';
import { ClipboardSyncService, ClipboardSyncEvent } from './services/clipboard-sync.service';
import { ClipboardCrypto } from './services/clipboard-crypto';
import { ClipboardHistoryService, LocalClipboardRecord } from './services/clipboard-history.service';
import { QrLoaderService } from './services/qr-loader.service';
import { FormatBytesPipe } from './pipes/format-bytes.pipe';
import { ZipBuilder } from './services/zip-builder';
import { CLIPBOARD_CONFIG, FileCategory, FileTypeMetadata, resolveFileMetadata } from './clipboard.config';
import { CLIPBOARD_COPY } from './clipboard.copy';

import {
  TsIconComponent,
  HlmButton,
  HlmBadge,
  HlmInput,
  HlmTooltipImports
} from '@acklet/tool-shell';

export type MainTab = 'text' | 'files';
export type FileSubFilter = 'all' | 'images' | 'files';
export type ViewMode = 'grid' | 'list';
export type SortOption = 'newest' | 'oldest' | 'name' | 'largest';

export interface UploadingFileState {
  id: string;
  name: string;
  size: number;
  progress: number;
  isImage: boolean;
  status: 'uploading' | 'paused' | 'error' | 'done';
  errorMessage?: string;
  uploadId?: string;
  totalChunks?: number;
  uploadedChunkIndices?: number[];
  file?: File;
  fileHash?: string;
  isPaused?: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  actionText?: string;
  onAction?: () => void;
}

@Component({
  selector: 'app-clipboard-tool',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    HlmTooltipImports
  ],
  templateUrl: './clipboard.component.html',
  styleUrls: ['./clipboard.component.css']
})
export class ClipboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClipboardApiService);
  private readonly syncService = inject(ClipboardSyncService);
  private readonly historyService = inject(ClipboardHistoryService);
  private readonly qrLoader = inject(QrLoaderService);

  readonly copy = CLIPBOARD_COPY;
  readonly configConstants = CLIPBOARD_CONFIG;

  private syncSub?: Subscription;
  private pollInterval?: any;
  private toastTimeout?: any;

  // Active Main Tab: Text & Links vs Files
  readonly activeTab = signal<MainTab>('text');
  readonly tabDirection = signal<'left' | 'right'>('right');

  setTab(tab: MainTab): void {
    if (tab === this.activeTab()) return;
    this.tabDirection.set(tab === 'files' ? 'right' : 'left');
    this.activeTab.set(tab);
    this.isFilesScrolled.set(false);
    if (tab === 'text') {
      this.clearSelection();
    }
  }

  // Clipboard Identity & Shared Room State
  readonly shareCode = signal<string | null>(null);
  readonly wordCode = signal<string | null>(null);
  readonly ownerToken = signal<string | null>(null);
  readonly activeShare = signal<ClipboardShare | null>(null);
  readonly isCreatingShare = signal<boolean>(false);
  readonly isSyncConnected = signal<boolean>(false);

  // QR Code Image Data URL
  readonly qrDataUrl = signal<string>('');
  readonly showQrModal = signal<boolean>(false);

  // Join Code Input (Header Strip)
  joinCodeInput = '';
  readonly joinError = signal<string | null>(null);
  readonly pendingJoinNewCode = signal<string | null>(null);
  readonly isJoining = signal<boolean>(false);
  readonly showMobileJoinPopover = signal<boolean>(false);

  // Editable Clipboard ID
  readonly isEditingCode = signal<boolean>(false);
  editingCodeInput = '';
  readonly isSavingCustomCode = signal<boolean>(false);

  // Settings & History Overlays
  readonly showSettingsModal = signal<boolean>(false);
  readonly showHistoryDrawer = signal<boolean>(false);
  readonly isPrivateMode = signal<boolean>(false);
  readonly isProtectedShare = signal<boolean>(false);
  readonly e2eeEnabled = signal<boolean>(false);
  readonly encryptionKey = signal<string>('');
  readonly retentionHours = signal<number>(CLIPBOARD_CONFIG.defaultExpiryHours);
  selectedRetentionHours: number = CLIPBOARD_CONFIG.defaultExpiryHours;
  readonly recentClipboards = signal<LocalClipboardRecord[]>([]);

  // Custom Acklet-designed Confirmation Dialog (replaces browser confirm())
  readonly confirmDialog = signal<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    secondaryText?: string;
    isDestructive?: boolean;
    secondaryDestructive?: boolean;
    withInput?: boolean;
    inputPlaceholder?: string;
    inputInitialValue?: string;
    action: () => void;
    onActionWithInput?: (value: string) => void;
    secondaryAction?: () => void;
    onCancel?: () => void;
  } | null>(null);

  confirmDialogInput: string = '';

  // Switching clipboard state
  readonly isSwitching = signal<boolean>(false);
  readonly switchingCode = signal<string | null>(null);

  // Deleting item IDs for smooth exit animation
  readonly deletingItemIds = signal<Set<string>>(new Set<string>());

  // Feedback states
  readonly copiedCode = signal<boolean>(false);
  readonly copiedLink = signal<boolean>(false);
  readonly copiedText = signal<boolean>(false);
  readonly activeToast = signal<ToastMessage | null>(null);

  // -------------------------------------------------------------
  // TAB 1: TEXT & LINKS (Shared Single Textarea, Klipit Style)
  // -------------------------------------------------------------
  readonly sharedText = signal<string>('');
  readonly remoteTextSnapshot = signal<string>('');
  readonly isTextDirty = signal<boolean>(false);
  readonly isSavingText = signal<boolean>(false);
  readonly saveFailed = signal<boolean>(false);
  readonly currentVersion = signal<number>(1);
  readonly isRefreshing = signal<boolean>(false);
  readonly lastSavedTime = signal<number | null>(null);
  readonly hasRemoteTextConflict = signal<boolean>(false);
  readonly conflictServerText = signal<string>('');
  readonly isComparingConflict = signal<boolean>(false);
  readonly hasDraftRecovery = signal<boolean>(false);
  readonly localDraftText = signal<string>('');
  readonly remoteTextHighlight = signal<boolean>(false);
  private textUndoSnapshot: string | null = null;

  // History & Revisions State
  readonly historyDrawerTab = signal<'recent' | 'revisions'>('recent');
  readonly textRevisions = signal<ClipboardTextRevision[]>([]);
  readonly isLoadingRevisions = signal<boolean>(false);
  readonly isRestoringRevision = signal<string | null>(null);

  readonly isTextOver80Percent = computed(() => {
    const len = new Blob([this.sharedText()]).size;
    return len >= CLIPBOARD_CONFIG.maxTextSizeBytes * CLIPBOARD_CONFIG.textWarningThreshold;
  });

  readonly textByteLength = computed(() => {
    return new Blob([this.sharedText()]).size;
  });

  readonly detectedUrls = computed<string[]>(() => {
    const text = this.sharedText();
    if (!text) return [];
    // Strict URL regex matching valid http/https URLs surrounded by whitespace or string boundaries
    const urlRegex = /(?:https?:\/\/)[^\s<>"'{}|\\^`[\]]+/gi;
    const matches = text.match(urlRegex) || [];
    const validUrls: string[] = [];
    const seen = new Set<string>();

    for (let url of matches) {
      // Strip trailing punctuation often typed at end of sentence
      url = url.replace(/[.,;:!?)]+$/, '');
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          if (!seen.has(url)) {
            seen.add(url);
            validUrls.push(url);
          }
        }
      } catch {
        // Ignore malformed URLs
      }
    }
    return validUrls;
  });

  readonly singleDetectedUrl = computed<string | null>(() => {
    const urls = this.detectedUrls();
    return urls.length === 1 ? urls[0] : null;
  });

  // Formatting Toolbar States
  readonly showFormattingMore = signal<boolean>(false);
  readonly showColorPicker = signal<boolean>(false);
  readonly isWordWrap = signal<boolean>(true);

  readonly isAnyModalOpen = computed<boolean>(() => {
    return (
      this.showQrModal() ||
      this.lightboxImage() !== null ||
      this.detailsSheetItem() !== null ||
      this.showSettingsModal() ||
      this.showHistoryDrawer() ||
      this.confirmDialog() !== null
    );
  });

  private readonly sanitizer = inject(DomSanitizer);

  // Markdown Mode & Rendering States
  readonly isMarkdownPreview = signal<boolean>(false);

  readonly hasMarkdownSyntax = computed<boolean>(() => {
    const text = this.sharedText();
    if (!text || text.length < 3) return false;
    // Check for standard markdown indicators: headers, lists, bold, blockquotes, code fences, links
    return /(?:^#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|^\s*>\s+|```|~~[^~]+~~|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/m.test(text);
  });

  readonly isMarkdownDetected = computed<boolean>(() => {
    // True if text has structural markdown markers, or if any uploaded file is a .md document
    const files = this.allFileItems();
    const hasMdFile = files.some(f => (f.originalName || '').toLowerCase().endsWith('.md'));
    return this.hasMarkdownSyntax() || hasMdFile;
  });

  readonly renderedMarkdownHtml = computed<SafeHtml>(() => {
    const raw = this.sharedText();
    if (!raw) return '';
    const parsed = this.parseMarkdownToHtml(raw);
    return this.sanitizer.bypassSecurityTrustHtml(parsed);
  });

  // Editor Word and Character Metrics
  readonly editorCharCount = computed(() => {
    const raw = this.sharedText();
    if (!raw) return 0;
    // Strip HTML tags for human-readable character count
    return raw.replace(/<[^>]*>/g, '').length;
  });
  readonly editorWordCount = computed(() => {
    const raw = this.sharedText();
    if (!raw) return 0;
    const cleanText = raw.replace(/<[^>]*>/g, ' ').trim();
    if (!cleanText) return 0;
    return cleanText.split(/\s+/).filter(Boolean).length;
  });

  // Inline URL Segments for Live Clickable Editor
  readonly isEditorFocused = signal<boolean>(false);

  readonly textSegments = computed<Array<{ text: string; isUrl: boolean; url?: string }>>(() => {
    const text = this.sharedText();
    if (!text) return [];

    const urlRegex = /(?:https?:\/\/)[^\s<>"'{}|\\^`[\]]+/gi;
    const segments: Array<{ text: string; isUrl: boolean; url?: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      let matchedUrl = match[0];

      // Add preceding plain text
      if (matchIndex > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, matchIndex),
          isUrl: false
        });
      }

      // Check for trailing punctuation
      const punctuationMatch = matchedUrl.match(/[.,;:!?)]+$/);
      let trailingPunctuation = '';
      if (punctuationMatch) {
        trailingPunctuation = punctuationMatch[0];
        matchedUrl = matchedUrl.slice(0, -trailingPunctuation.length);
      }

      try {
        const parsed = new URL(matchedUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          segments.push({
            text: matchedUrl,
            isUrl: true,
            url: matchedUrl
          });
          if (trailingPunctuation) {
            segments.push({
              text: trailingPunctuation,
              isUrl: false
            });
          }
        } else {
          segments.push({
            text: match[0],
            isUrl: false
          });
        }
      } catch {
        segments.push({
          text: match[0],
          isUrl: false
        });
      }

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        isUrl: false
      });
    }

    return segments;
  });

  // -------------------------------------------------------------
  // TAB 2: FILES (Combined Library Style)
  // -------------------------------------------------------------
  readonly fileSubFilter = signal<FileSubFilter>('all');
  readonly viewMode = signal<ViewMode>('grid');
  readonly searchQuery = signal<string>('');
  readonly sortOption = signal<SortOption>('newest');
  readonly isFilesScrolled = signal<boolean>(false);

  // Filter Popover
  readonly showFilterPopover = signal<boolean>(false);
  readonly showSortPopover = signal<boolean>(false);
  readonly showFilesMoreMenu = signal<boolean>(false);
  readonly showAddMenu = signal<boolean>(false);
  readonly selectedTypeFilters = signal<Set<FileCategory>>(new Set());
  readonly selectedSourceFilters = signal<Set<'uploaded' | 'pasted'>>(new Set());

  readonly hasActiveFilters = computed(() => {
    return this.selectedTypeFilters().size > 0 || this.selectedSourceFilters().size > 0;
  });

  // Card Selection & Multi-select Floating Bar
  readonly selectedItemIds = signal<Set<string>>(new Set());
  private lastSelectedItemId: string | null = null;
  private deletedItemsUndoStack: ClipboardItem[] = [];
  private readonly deletedItemIds = new Set<string>();

  // Drag Overlay
  readonly isDragOver = signal<boolean>(false);

  // Uploading Files Queue
  readonly uploadingFiles = signal<UploadingFileState[]>([]);
  private readonly uploadSubscriptions = new Map<string, Subscription>();

  // Previews
  readonly lightboxImage = signal<ClipboardItem | null>(null);
  readonly isClosingLightbox = signal<boolean>(false);
  readonly detailsSheetItem = signal<ClipboardItem | null>(null);

  // References
  @ViewChild('fileInputGeneral') fileInputGeneral!: ElementRef<HTMLInputElement>;
  @ViewChild('fileSearchInput') fileSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('wysiwygEditor') wysiwygEditor?: ElementRef<HTMLDivElement>;

  // Filtered & Sorted File Items
  readonly allFileItems = computed<ClipboardItem[]>(() => {
    const items = this.activeShare()?.items || [];
    return items.filter(i => i.itemType === 'IMAGE' || i.itemType === 'FILE');
  });

  readonly displayFileItems = computed<ClipboardItem[]>(() => {
    let list = [...this.allFileItems()];

    // 1. Sub-filter: all / images / files
    if (this.fileSubFilter() === 'images') {
      list = list.filter(i => {
        if (i.itemType === 'IMAGE') return true;
        if (i.detectedMime && i.detectedMime.startsWith('image/')) return true;
        return resolveFileMetadata(i.originalName || '', i.detectedMime).category === 'images';
      });
    } else if (this.fileSubFilter() === 'files') {
      list = list.filter(i => {
        if (i.itemType === 'IMAGE') return false;
        if (i.detectedMime && i.detectedMime.startsWith('image/')) return false;
        return resolveFileMetadata(i.originalName || '', i.detectedMime).category !== 'images';
      });
    }

    // 2. Type Categories from Filter Popover
    const typeFilters = this.selectedTypeFilters();
    if (typeFilters.size > 0) {
      list = list.filter(i => {
        const meta = resolveFileMetadata(i.originalName || '', i.detectedMime);
        return typeFilters.has(meta.category);
      });
    }

    // 3. Source Filters (Uploaded vs Pasted)
    const sourceFilters = this.selectedSourceFilters();
    if (sourceFilters.size > 0) {
      list = list.filter(i => {
        const isPasted = (i.originalName || '').toLowerCase().includes('pasted');
        if (sourceFilters.has('pasted') && isPasted) return true;
        if (sourceFilters.has('uploaded') && !isPasted) return true;
        return false;
      });
    }

    // 4. Search Filter
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(i => (i.originalName || '').toLowerCase().includes(query));
    }

    // 5. Sorting
    const sort = this.sortOption();
    if (sort === 'newest') {
      list.sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
      });
    } else if (sort === 'oldest') {
      list.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
      });
    } else if (sort === 'name') {
      list.sort((a, b) => {
        const diff = (a.originalName || '').localeCompare(b.originalName || '', undefined, { sensitivity: 'base' });
        return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
      });
    } else if (sort === 'largest') {
      list.sort((a, b) => {
        const diff = (b.sizeBytes || 0) - (a.sizeBytes || 0);
        return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
      });
    }

    return list;
  });

  readonly imagesCount = computed(() => {
    return this.allFileItems().filter(i => {
      if (i.itemType === 'IMAGE') return true;
      if (i.detectedMime && i.detectedMime.startsWith('image/')) return true;
      return resolveFileMetadata(i.originalName || '', i.detectedMime).category === 'images';
    }).length;
  });

  readonly filesCount = computed(() => {
    return this.allFileItems().filter(i => {
      if (i.itemType === 'IMAGE') return false;
      if (i.detectedMime && i.detectedMime.startsWith('image/')) return false;
      return resolveFileMetadata(i.originalName || '', i.detectedMime).category !== 'images';
    }).length;
  });

  // -------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------
  ngOnInit(): void {
    // Restore persistent user choices
    if (typeof localStorage !== 'undefined') {
      const savedView = localStorage.getItem('acklet_clipboard_view_mode') as ViewMode;
      if (savedView === 'grid' || savedView === 'list') {
        this.viewMode.set(savedView);
      }
      const savedSort = localStorage.getItem('acklet_clipboard_sort_option') as SortOption;
      if (savedSort) {
        this.sortOption.set(savedSort);
      }
    }

    this.isPrivateMode.set(this.historyService.isPrivateMode());
    this.loadHistory();

    // Parse incoming code from URL path, query (?code=...), hash, or device storage
    let incomingCode = '';
    let incomingKey = '';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      incomingCode = urlParams.get('code') || '';
      incomingKey = urlParams.get('key') || '';

      // Support clean path-based IDs (/29ypw or /custom-id)
      const pathname = window.location.pathname.replace(/^\/+/, '').split('/')[0]?.trim();
      if (!incomingCode && pathname && pathname.length >= 3) {
        incomingCode = pathname;
      }

      // Legacy fallback: Support hash fragment (#29ypw) and cleanup
      if (!incomingCode && window.location.hash) {
        const hashContent = window.location.hash.replace('#', '');
        const parts = hashContent.split('&');
        const candidate = parts[0]?.trim() || '';
        if (candidate && !candidate.includes('=')) {
          incomingCode = candidate;
          const keyParam = parts.find(p => p.startsWith('key='));
          if (keyParam) incomingKey = keyParam.replace('key=', '');
        }
      }

      if (incomingKey) {
        this.encryptionKey.set(incomingKey);
        this.e2eeEnabled.set(true);
        // Clean key parameter from visible URL address bar
        if (incomingCode && window.history) {
          window.history.replaceState({}, '', `${window.location.origin}/${incomingCode}`);
        }
      } else if (incomingCode && typeof localStorage !== 'undefined') {
        const storedKey = localStorage.getItem(`acklet_clip_key_${incomingCode}`);
        if (storedKey) {
          this.encryptionKey.set(storedKey);
          this.e2eeEnabled.set(true);
        }
      }
    }

    // Check device persistent session (like Google Drive session) if no code in URL
    if (!incomingCode && typeof localStorage !== 'undefined') {
      const storedDeviceSession = localStorage.getItem('acklet_clipboard_active_code')?.trim();
      if (storedDeviceSession && storedDeviceSession.length >= 3) {
        incomingCode = storedDeviceSession;
        const storedKey = localStorage.getItem(`acklet_clip_key_${incomingCode}`);
        if (storedKey) {
          this.encryptionKey.set(storedKey);
          this.e2eeEnabled.set(true);
        }
      }
    }

    if (incomingCode) {
      this.historyService.saveRecord({
        code: incomingCode,
        isSender: true,
        createdAt: Date.now(),
        itemCount: 0
      }).then(() => this.loadHistory());
      this.joinClipboard(incomingCode, true);
    } else {
      // Auto-create initial active clipboard session so user has an ID right away
      this.initSharedClipboard();
      this.loadHistory();
    }

    // Real-time synchronization stream
    this.syncSub = this.syncService.events.subscribe(event => {
      this.handleSyncEvent(event);
    });
  }

  ngOnDestroy(): void {
    this.uploadSubscriptions.forEach(sub => sub.unsubscribe());
    this.uploadSubscriptions.clear();
    this.syncSub?.unsubscribe();
    this.syncService.disconnect();
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    if (this.cardClickTimer) clearTimeout(this.cardClickTimer);
  }

  // -------------------------------------------------------------
  // KEYBOARD SHORTCUTS & GLOBAL LISTENERS
  // -------------------------------------------------------------
  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
    // Ctrl+S / Cmd+S: Save text changes immediately
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.isTextDirty() && !this.isSavingText()) {
        this.saveTextContent();
      }
      return;
    }

    // Focus search on '/' when on files tab
    if (event.key === '/' && this.activeTab() === 'files') {
      const target = event.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        this.fileSearchInput?.nativeElement?.focus();
        return;
      }
    }

    // Esc: Close popovers, lightbox, or clear multi-selection
    if (event.key === 'Escape') {
      if (this.lightboxImage()) {
        this.closeLightbox();
        return;
      }
      if (this.detailsSheetItem()) {
        this.detailsSheetItem.set(null);
        return;
      }
      if (this.showQrModal()) {
        this.showQrModal.set(false);
        return;
      }
      if (this.showFilterPopover()) {
        this.showFilterPopover.set(false);
        return;
      }
      if (this.showSortPopover()) {
        this.showSortPopover.set(false);
        return;
      }
      if (this.selectedItemIds().size > 0) {
        this.clearSelection();
        return;
      }
    }

    // Ctrl+A / Cmd+A when on files tab and not inside input
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && this.activeTab() === 'files') {
      const target = event.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        this.selectAllFiles();
        return;
      }
    }

    // Lightbox Arrow navigation
    if (this.lightboxImage()) {
      if (event.key === 'ArrowLeft') {
        this.navigateLightbox(-1);
      } else if (event.key === 'ArrowRight') {
        this.navigateLightbox(1);
      }
    }
  }

  /**
   * Performs an immediate, non-blocking background save using fetch with keepalive: true
   * and localStorage when the user abruptly closes the tab, refreshes, or navigates away.
   * Guarantees zero data loss without showing the intrusive browser "Leave site?" dialog.
   */
  private triggerSuddenExitSave(): void {
    if (!this.isTextDirty() && !this.saveFailed()) return;
    const code = this.shareCode();
    if (!code) return;

    const text = this.sharedText();

    // 1. Immediately persist to localStorage as synchronous safety net
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`acklet_draft_text_${code}`, text);
      } catch (_) {}
    }

    // 2. Transmit to backend via keepalive fetch (guaranteed to complete after page unload)
    this.api.saveTextOnSuddenExit(
      code,
      text,
      this.ownerToken() || undefined,
      this.e2eeEnabled(),
      this.currentVersion()
    );

    this.isTextDirty.set(false);
  }

  // Auto-save on sudden tab close, browser close, or page reload without intrusive dialog
  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    if (this.isTextDirty() || this.saveFailed()) {
      this.triggerSuddenExitSave();
      // NOTE: We deliberately do NOT call event.preventDefault() or set event.returnValue,
      // eliminating the intrusive browser "Leave site?" modal while guaranteeing zero data loss.
    }
  }

  // Safari / iOS mobile lifecycle: saves on tab switch, home swipe, or app backgrounding
  @HostListener('window:pagehide')
  onPageHide(): void {
    if (this.isTextDirty() || this.saveFailed()) {
      this.triggerSuddenExitSave();
    }
  }

  // Ctrl+V Paste anywhere on page
  @HostListener('window:paste', ['$event'])
  async onWindowPaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;

    // Check for images
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          this.setTab('files');
          // Rename pasted file clearly
          const ext = file.type.split('/')[1] || 'png';
          const pastedFile = new File([file], `Pasted image ${new Date().toLocaleTimeString()}.${ext}`, {
            type: file.type
          });
          this.processFilesUpload([pastedFile]);
          return;
        }
      }
    }

    // Fallback: If pasted text on Files tab, switch to Text tab or append
    const target = event.target as HTMLElement;
    const isInsideInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (!isInsideInput && this.activeTab() === 'files') {
      const text = event.clipboardData?.getData('text');
      if (text && text.trim()) {
        event.preventDefault();
        this.setTab('text');
        this.onTextChanged(this.sharedText() + (this.sharedText() ? '\n' : '') + text.trim());
        this.setEditorHtml(this.formatContentForEditor(this.sharedText()));
      }
    }
  }

  // Global Window Drag & Drop Listeners (Entire Screen Dropzone)
  private dragCounter = 0;

  @HostListener('window:dragenter', ['$event'])
  onWindowDragEnter(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      this.dragCounter++;
      this.isDragOver.set(true);
    }
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
      if (!this.isDragOver()) {
        this.isDragOver.set(true);
      }
    }
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      this.dragCounter = Math.max(0, this.dragCounter - 1);
      if (this.dragCounter === 0) {
        this.isDragOver.set(false);
      }
    }
  }

  @HostListener('window:drop', ['$event'])
  async onWindowDrop(event: DragEvent): Promise<void> {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      this.dragCounter = 0;
      this.isDragOver.set(false);
      this.setTab('files');

      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;

      const items = dataTransfer.items;
      if (items && items.length > 0) {
        await this.handleDroppedItems(Array.from(items), dataTransfer.files);
      } else if (dataTransfer.files && dataTransfer.files.length > 0) {
        this.processFilesUpload(Array.from(dataTransfer.files));
      }
    }
  }

  private async handleDroppedItems(items: DataTransferItem[], fallbackFiles: FileList | null): Promise<void> {
    const plainFiles: File[] = [];
    const foldersToZip: { name: string; entries: { path: string; file: File }[] }[] = [];
    let hasDirectory = false;

    for (const item of items) {
      if (item.kind !== 'file') continue;

      const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
      if (entry && entry.isDirectory) {
        hasDirectory = true;
        const entries = await this.readDirectoryEntry(entry, '');
        if (entries.length > 0) {
          foldersToZip.push({ name: entry.name, entries });
        }
      } else if (entry && entry.isFile) {
        const file = item.getAsFile();
        if (file) plainFiles.push(file);
      } else {
        const file = item.getAsFile();
        if (file) plainFiles.push(file);
      }
    }

    if (!hasDirectory && plainFiles.length === 0 && fallbackFiles && fallbackFiles.length > 0) {
      this.processFilesUpload(Array.from(fallbackFiles));
      return;
    }

    if (plainFiles.length > 0) {
      this.processFilesUpload(plainFiles);
    }

    for (const folder of foldersToZip) {
      await this.zipAndUploadFolder(folder.name, folder.entries);
    }
  }

  private async readDirectoryEntry(dirEntry: any, parentPath: string): Promise<{ path: string; file: File }[]> {
    const dirReader = dirEntry.createReader();
    const currentPath = parentPath ? `${parentPath}/${dirEntry.name}` : dirEntry.name;
    const allEntries: any[] = [];

    const readBatch = (): Promise<any[]> => {
      return new Promise((resolve, reject) => {
        dirReader.readEntries((entries: any[]) => resolve(entries || []), reject);
      });
    };

    while (true) {
      try {
        const batch = await readBatch();
        if (!batch || batch.length === 0) break;
        allEntries.push(...batch);
      } catch {
        break;
      }
    }

    const results: { path: string; file: File }[] = [];

    for (const child of allEntries) {
      if (child.isFile) {
        try {
          const file: File = await new Promise((resolve, reject) => child.file(resolve, reject));
          results.push({ path: `${currentPath}/${child.name}`, file });
        } catch (e) {
          console.warn('[Clipboard] Failed reading file in folder', child.name, e);
        }
      } else if (child.isDirectory) {
        const subResults = await this.readDirectoryEntry(child, currentPath);
        results.push(...subResults);
      }
    }

    return results;
  }

  private async zipAndUploadFolder(folderName: string, entries: { path: string; file: File }[]): Promise<void> {
    if (!entries || entries.length === 0) {
      this.showToast(`Folder "${folderName}" is empty`);
      return;
    }

    this.showToast(`Converting folder "${folderName}" to zip (${entries.length} file${entries.length > 1 ? 's' : ''})...`);

    try {
      const zipFile = await ZipBuilder.createZipFile(folderName, entries);
      this.processFilesUpload([zipFile]);
    } catch (err: any) {
      console.error('[Clipboard] Failed to convert folder to zip', err);
      this.showToast(`Failed to zip folder "${folderName}": ${err?.message || 'Error creating archive'}`);
    }
  }

  private hasFilesBeingDragged(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (!types) return false;
    return Array.from(types).includes('Files');
  }

  // -------------------------------------------------------------
  // CLIPBOARD IDENTITY & CREATION
  // -------------------------------------------------------------
  async initSharedClipboard(requestedCode?: string): Promise<void> {
    this.isCreatingShare.set(true);
    // Auto-generate fresh AES-GCM 256-bit key for default-on E2EE
    try {
      const newKey = await ClipboardCrypto.generateKey();
      this.encryptionKey.set(newKey);
      this.e2eeEnabled.set(true);
    } catch (e) {
      console.warn('Could not generate crypto key', e);
    }

    const options: CreateShareOptions = {
      requestedCode: requestedCode ? requestedCode.trim().toLowerCase() : undefined,
      expiryHours: this.retentionHours(),
      liveMode: true
    };

    this.api.createShare(options).subscribe({
      next: async share => {
        await this.applyShareSession(share);
        this.isCreatingShare.set(false);
      },
      error: () => {
        this.isCreatingShare.set(false);
      }
    });
  }

  private async applyShareSession(share: ClipboardShare): Promise<void> {
    // 1. Reset state from previous room for strict isolation
    this.selectedItemIds.set(new Set());
    this.uploadingFiles.set([]);
    this.hasRemoteTextConflict.set(false);
    this.deletedItemIds.clear();

    const isNewRoom = this.shareCode() !== share.code;
    if (isNewRoom) {
      this.encryptionKey.set('');
    }

    // Load key specifically for this room: URL param -> localStorage -> code derivation
    let roomKey = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      roomKey = params.get('key') || '';
    }
    if (!roomKey && typeof localStorage !== 'undefined') {
      try {
        roomKey = localStorage.getItem(`acklet_clip_key_${share.code}`) || '';
      } catch (_) {}
    }
    if (!roomKey) {
      try {
        roomKey = await ClipboardCrypto.deriveKeyFromCode(share.code);
      } catch (e) {
        console.warn('Could not derive room crypto key', e);
      }
    }
    if (roomKey) {
      this.encryptionKey.set(roomKey);
      this.e2eeEnabled.set(true);
    }

    this.shareCode.set(share.code);
    this.wordCode.set(share.wordCode || null);
    this.ownerToken.set(share.ownerToken || null);
    this.activeShare.set(share);

    // Keep clean path variable in address bar (/code) without leaking encryption key in URL query
    if (typeof window !== 'undefined' && window.history) {
      const cleanUrl = `${window.location.origin}/${share.code}`;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Persist active session and room encryption key in device localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('acklet_clipboard_active_code', share.code);
        if (this.encryptionKey()) {
          localStorage.setItem(`acklet_clip_key_${share.code}`, this.encryptionKey());
        }
      } catch (e) {
        console.warn('Could not persist clipboard session to localStorage', e);
      }
    }

    // Sync retention option from share expiration if available
    if (share.expiresAt && share.createdAt) {
      const created = new Date(share.createdAt).getTime();
      const expires = new Date(share.expiresAt).getTime();
      const diffHours = Math.round((expires - created) / (1000 * 60 * 60));
      if (diffHours >= 360) {
        this.retentionHours.set(480);
        this.selectedRetentionHours = 480;
      } else if (diffHours >= 200) {
        this.retentionHours.set(240);
        this.selectedRetentionHours = 240;
      } else {
        this.retentionHours.set(168);
        this.selectedRetentionHours = 168;
      }
    } else {
      this.retentionHours.set(168);
      this.selectedRetentionHours = 168;
    }

    // Sync privacy settings
    this.isProtectedShare.set(!!(share.hasPin || share.burnAfterReading));

    // Connect WebSocket
    this.syncService.connect(share.code);
    this.isSyncConnected.set(true);
    this.startReactivePollingFallback(share.code);

    // Generate QR Code data URL
    this.refreshQrCode();

    // Set version and reset conflict/failed states
    this.currentVersion.set(share.version || 1);
    this.saveFailed.set(false);
    this.hasRemoteTextConflict.set(false);

    // Extract text item from share items if one exists
    const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
    if (textItem && textItem.textContent) {
      let content = textItem.textContent;
      if (textItem.isEncrypted || content.startsWith('{"iv":')) {
        content = await ClipboardCrypto.decryptText(content, this.encryptionKey(), share.code);
      }
      this.sharedText.set(content);
      this.remoteTextSnapshot.set(content);
      this.setEditorHtml(this.formatContentForEditor(content));
      this.isTextDirty.set(false);
      this.lastSavedTime.set(Date.now());
    } else {
      this.sharedText.set('');
      this.remoteTextSnapshot.set('');
      this.setEditorHtml('');
      this.isTextDirty.set(false);
      this.lastSavedTime.set(null);
    }

    // Check for recoverable local draft from a previous session
    if (typeof localStorage !== 'undefined') {
      try {
        const draft = localStorage.getItem(`acklet_draft_text_${share.code}`);
        const currentText = this.sharedText();
        if (draft && draft !== currentText && draft.trim()) {
          this.localDraftText.set(draft);
          this.hasDraftRecovery.set(true);
        } else {
          this.hasDraftRecovery.set(false);
          this.localDraftText.set('');
        }
      } catch (_) {}
    }

    // Save to history
    await this.historyService.saveRecord({
      code: share.code,
      wordCode: share.wordCode,
      ownerToken: share.ownerToken,
      isSender: true,
      createdAt: Date.now(),
      itemCount: share.items.length,
      isEncrypted: this.e2eeEnabled(),
      encryptionKey: this.encryptionKey()
    });
    await this.loadHistory();
  }

  async refreshQrCode(): Promise<void> {
    const directUrl = this.getDirectLinkUrl();
    if (!directUrl) return;
    try {
      const dataUrl = await this.qrLoader.generateDataUrl(directUrl, 260);
      this.qrDataUrl.set(dataUrl);
    } catch (e) {
      console.warn('QR generation fallback', e);
    }
  }

  getDirectLinkUrl(): string {
    const code = this.shareCode();
    if (!code || typeof window === 'undefined') return '';
    let url = `${window.location.origin}/${code}`;
    if (this.e2eeEnabled() && this.encryptionKey()) {
      url += `?key=${this.encryptionKey()}`;
    }
    return url;
  }

  copyShareId(): void {
    const code = this.shareCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    this.copiedCode.set(true);
    this.showToast(this.copy.identity.copied);
    setTimeout(() => this.copiedCode.set(false), 2000);
  }

  startEditCode(): void {
    const current = this.shareCode() || '';
    this.editingCodeInput = current;
    this.isEditingCode.set(true);
  }

  cancelEditCode(): void {
    this.isEditingCode.set(false);
    this.editingCodeInput = '';
  }

  saveCustomCode(): void {
    const desired = this.editingCodeInput.trim().toLowerCase();
    const current = (this.shareCode() || '').trim().toLowerCase();

    if (!desired || desired === current) {
      this.cancelEditCode();
      return;
    }

    // Format validation: 3-16 alphanumeric or dash characters
    if (!/^[a-z0-9_-]{3,16}$/.test(desired)) {
      this.showToast('ID must be 3-16 letters, numbers, or dashes');
      return;
    }

    this.isSavingCustomCode.set(true);
    const token = this.ownerToken() || undefined;

    // Check if target custom ID is already taken by an active populated session
    this.api.getShare(desired).subscribe({
      next: (existing) => {
        const isCurrentOurs = existing.code === current;
        const hasExistingItems = (existing.items && existing.items.length > 0) ||
          existing.textCount > 0 ||
          existing.fileCount > 0 ||
          existing.imageCount > 0 ||
          (existing.totalSizeBytes && existing.totalSizeBytes > 0);

        if (!isCurrentOurs && hasExistingItems) {
          this.isSavingCustomCode.set(false);
          this.showToast(`Clipboard ID "${desired}" is already taken. Choose a unique one.`);
          return;
        }

        this.executeRename(current, desired, token);
      },
      error: () => {
        // ID does not exist yet -> proceed with rename
        this.executeRename(current, desired, token);
      }
    });
  }

  private executeRename(current: string, desired: string, token?: string): void {
    this.api.renameShare(current, desired, token).subscribe({
      next: (renamedShare) => {
        this.isSavingCustomCode.set(false);
        this.isEditingCode.set(false);
        this.editingCodeInput = '';

        // Preserve room encryption key for renamed ID
        if (this.encryptionKey() && typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`acklet_clip_key_${desired}`, this.encryptionKey());
          } catch (_) {}
        }

        // Post redirect pointer to previous room so all connected devices switch to desired ID
        if (current && current !== desired) {
          const redirectPayload = JSON.stringify({ __acklet_redirect__: desired });
          this.syncService.notifyLocalChange({
            eventType: 'ITEM_ADDED',
            shareCode: current,
            item: {
              id: 'redirect_' + Date.now(),
              shareCode: current,
              itemType: 'TEXT',
              textContent: redirectPayload,
              sizeBytes: redirectPayload.length,
              createdAt: new Date().toISOString(),
              downloadCount: 0,
              viewCount: 0
            }
          });
        }

        this.applyShareSession(renamedShare);
        this.showToast(`Clipboard ID updated to "${desired}"`);
      },
      error: (err) => {
        this.isSavingCustomCode.set(false);
        const errorMsg: string = err?.error?.message || err?.message || '';
        if (err.status === 409 || errorMsg.toLowerCase().includes('already taken') || errorMsg.toLowerCase().includes('already in use')) {
          this.showToast(`Clipboard ID "${desired}" is already taken. Choose a unique one.`);
        } else if (err.status === 403 || errorMsg.toLowerCase().includes('owner') || errorMsg.toLowerCase().includes('permission')) {
          this.showToast('Permission denied to rename this clipboard');
          this.cancelEditCode();
        } else {
          this.showToast('Failed to update clipboard ID');
          this.cancelEditCode();
        }
      }
    });
  }

  copyDirectLink(): void {
    const url = this.getDirectLinkUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    this.copiedLink.set(true);
    this.showToast(this.copy.identity.copied);
    setTimeout(() => this.copiedLink.set(false), 2000);
  }

  confirmCreateNewClipboard(): void {
    if (this.isTextDirty()) {
      this.confirmDialog.set({
        title: 'Unsaved Changes',
        message: 'You have unsaved changes in your clipboard text. Would you like to save your changes before starting a new clipboard, or discard them?',
        confirmText: 'Save & Continue',
        secondaryText: 'Discard Changes',
        secondaryDestructive: true,
        cancelText: 'Cancel',
        isDestructive: false,
        action: async () => {
          const saved = await this.saveTextContent();
          if (saved) {
            this.executeCreateNewClipboard();
          }
        },
        secondaryAction: () => {
          this.discardTextChanges();
          this.executeCreateNewClipboard();
        }
      });
      return;
    }

    if (this.sharedText().trim() || this.allFileItems().length > 0) {
      this.confirmDialog.set({
        title: 'Start New Clipboard',
        message: 'Are you sure you want to start a fresh clipboard session?',
        confirmText: 'New Clipboard',
        cancelText: 'Cancel',
        isDestructive: false,
        action: () => {
          this.executeCreateNewClipboard();
        }
      });
      return;
    }

    this.executeCreateNewClipboard();
  }

  private executeCreateNewClipboard(): void {
    this.sharedText.set('');
    this.remoteTextSnapshot.set('');
    this.setEditorHtml('');
    this.isTextDirty.set(false);
    this.selectedItemIds.set(new Set());
    this.initSharedClipboard();
  }

  onJoinInputChange(): void {
    if (this.joinError()) {
      this.joinError.set(null);
    }
    if (this.pendingJoinNewCode()) {
      this.pendingJoinNewCode.set(null);
    }
  }

  joinClipboard(codeToJoin?: string, fromUrlInit = false): void {
    const code = (codeToJoin || this.joinCodeInput).trim().toLowerCase();
    if (!code) {
      this.joinError.set('Enter a clipboard code to continue');
      return;
    }

    // Format validation: 3-24 alphanumeric or dash/underscore
    if (!/^[a-z0-9_-]{3,24}$/.test(code)) {
      this.joinError.set('ID must be 3-24 letters, numbers, or dashes');
      return;
    }

    // If user has unsaved edits in current room, ask before switching
    if (!fromUrlInit && this.isTextDirty() && code !== this.shareCode()) {
      this.confirmDialog.set({
        title: 'Unsaved Changes',
        message: `You have unsaved changes in your clipboard text. Would you like to save your changes before opening clipboard "${code}", or discard them?`,
        confirmText: 'Save & Open',
        secondaryText: 'Discard Changes',
        secondaryDestructive: true,
        cancelText: 'Cancel',
        isDestructive: false,
        action: async () => {
          const saved = await this.saveTextContent();
          if (saved) {
            this.executeJoinClipboard(code, fromUrlInit);
          }
        },
        secondaryAction: () => {
          this.discardTextChanges();
          this.executeJoinClipboard(code, fromUrlInit);
        }
      });
      return;
    }

    this.executeJoinClipboard(code, fromUrlInit);
  }

  private executeJoinClipboard(code: string, fromUrlInit = false): void {
    this.isJoining.set(true);
    this.isSwitching.set(true);
    this.switchingCode.set(code);
    this.joinError.set(null);

    this.api.getShare(code).subscribe({
      next: async share => {
        this.isJoining.set(false);
        this.isSwitching.set(false);
        this.switchingCode.set(null);

        // Check if clipboard is an empty uninitialized session (no text and no items)
        const hasText = share.items?.some(i => (i.itemType === 'TEXT' || i.itemType === 'LINK') && i.textContent?.trim());
        const hasFiles = share.items?.some(i => i.itemType === 'FILE' || i.itemType === 'IMAGE');
        const isPopulated = hasText || hasFiles || (share.textCount > 0) || (share.fileCount > 0);

        if (!fromUrlInit && !isPopulated && share.code !== this.shareCode()) {
          // If the user already confirmed/re-clicked Open for this empty code, proceed
          if (this.pendingJoinNewCode() === code) {
            this.pendingJoinNewCode.set(null);
            this.joinCodeInput = '';
            this.showMobileJoinPopover.set(false);
            this.applyShareSession(share);
            return;
          }
          // Suggest inline without popping up a disruptive dialog modal
          this.pendingJoinNewCode.set(code);
          this.joinError.set(`Code "${code}" is empty. Press Open again to continue, or enter an existing code.`);
          return;
        }

        this.pendingJoinNewCode.set(null);
        this.joinCodeInput = '';
        this.showMobileJoinPopover.set(false);
        await this.applyShareSession(share);
      },
      error: err => {
        this.isJoining.set(false);
        this.isSwitching.set(false);
        this.switchingCode.set(null);
        const isNotFound = err.status === 404 || err.error?.message?.includes('not found');
        const isExpired = err.error?.message?.includes('expired');

        if (isNotFound) {
          // If the user already confirmed, or if joining from URL init, create / auto-provision it
          if (fromUrlInit || this.pendingJoinNewCode() === code) {
            this.pendingJoinNewCode.set(null);
            this.joinCodeInput = '';
            this.showMobileJoinPopover.set(false);
            this.initSharedClipboard(code);
            return;
          }
          // Suggest inline without popping up a disruptive dialog modal
          this.pendingJoinNewCode.set(code);
          this.joinError.set(`Code "${code}" does not exist. Press Open again to create it, or enter an existing code.`);
        } else if (isExpired) {
          this.pendingJoinNewCode.set(null);
          this.joinError.set(this.copy.identity.errorExpiredCode);
        } else {
          this.pendingJoinNewCode.set(null);
          this.joinError.set(this.copy.identity.errorInvalidCode);
        }
      }
    });
  }

  // -------------------------------------------------------------
  // TAB 1: TEXT & LINKS LOGIC
  // -------------------------------------------------------------
  onTextChanged(val: string): void {
    this.sharedText.set(val);
    const isDirty = val !== this.remoteTextSnapshot();
    this.isTextDirty.set(isDirty);
    this.saveFailed.set(false);

    // Persist recoverable local draft to localStorage
    if (typeof localStorage !== 'undefined' && this.shareCode()) {
      try {
        if (isDirty && val.trim()) {
          localStorage.setItem(`acklet_draft_text_${this.shareCode()}`, val);
        } else if (!isDirty) {
          localStorage.removeItem(`acklet_draft_text_${this.shareCode()}`);
        }
      } catch (_) {}
    }

    // Clear conflict banner once user edits
    if (this.hasRemoteTextConflict()) {
      this.hasRemoteTextConflict.set(false);
    }
  }

  discardTextChanges(): void {
    const remote = this.remoteTextSnapshot();
    this.sharedText.set(remote);
    this.setEditorHtml(this.formatContentForEditor(remote));
    this.isTextDirty.set(false);
    this.saveFailed.set(false);
    if (typeof localStorage !== 'undefined' && this.shareCode()) {
      try {
        localStorage.removeItem(`acklet_draft_text_${this.shareCode()}`);
      } catch (_) {}
    }
    this.showToast('Changes discarded');
  }

  confirmDiscardChanges(): void {
    if (!this.isTextDirty()) return;
    this.confirmDialog.set({
      title: 'Discard Changes',
      message: 'Are you sure you want to discard your unsaved changes? Your text will revert back to the last saved version.',
      confirmText: 'Discard Changes',
      cancelText: 'Keep Editing',
      isDestructive: true,
      action: () => {
        this.discardTextChanges();
      }
    });
  }

  saveTextContent(silent = false, force = false): Promise<boolean> {
    return new Promise(async (resolve) => {
      const code = this.shareCode();
      // Case 1: If no clipboard is assigned / empty clipboard session
      if (!code) {
        this.confirmDialog.set({
          title: 'No Clipboard Assigned',
          message: 'No clipboard is currently assigned. Would you like to continue with a new clipboard, or do you already have a clipboard ID to continue with?',
          confirmText: 'Create New Clipboard',
          secondaryText: 'I Have a Clipboard ID',
          cancelText: 'Cancel',
          isDestructive: false,
          action: () => {
            this.initSharedClipboard().then(() => {
              if (this.sharedText().trim()) {
                this.saveTextContent(silent, force).then(resolve);
              } else {
                resolve(true);
              }
            });
          },
          secondaryAction: () => {
            this.confirmDialog.set({
              title: 'Enter Clipboard ID',
              message: 'Please enter your clipboard ID to continue with:',
              confirmText: 'Open & Continue',
              cancelText: 'Cancel',
              withInput: true,
              inputPlaceholder: 'e.g. 29ypw or my-code',
              action: () => { resolve(false); },
              onActionWithInput: (enteredCode) => {
                const trimmed = (enteredCode || '').trim();
                if (trimmed) {
                  this.joinClipboard(trimmed);
                }
                resolve(false);
              },
              onCancel: () => resolve(false)
            });
          },
          onCancel: () => resolve(false)
        });
        return;
      }

      // Prevent duplicate saving requests
      if (this.isSavingText()) {
        resolve(false);
        return;
      }

      const text = this.sharedText();
      this.isSavingText.set(true);
      this.saveFailed.set(false);

      let textToSend = text;
      if (this.e2eeEnabled() && this.encryptionKey()) {
        textToSend = await ClipboardCrypto.encryptText(text, this.encryptionKey());
      }

      const expectedVersion = force ? undefined : this.currentVersion();

      this.api.addTextItem(
        code,
        textToSend,
        this.ownerToken() || undefined,
        this.e2eeEnabled(),
        expectedVersion
      ).subscribe({
        next: item => {
          this.isSavingText.set(false);
          this.saveFailed.set(false);
          this.remoteTextSnapshot.set(text);
          this.isTextDirty.set(false);
          this.hasRemoteTextConflict.set(false);
          this.lastSavedTime.set(Date.now());
          this.currentVersion.update(v => v + 1);

          // Clear local draft from storage on confirmed server save
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.removeItem(`acklet_draft_text_${code}`);
            } catch (_) {}
          }
          this.hasDraftRecovery.set(false);

          if (!silent) {
            this.showToast(this.copy.textTab.toastSaved);
          }
          this.appendItemLocally(item);

          // Notify other tabs via sync service
          this.syncService.notifyLocalChange({
            eventType: 'ITEM_ADDED',
            shareCode: code,
            version: this.currentVersion(),
            item
          });
          resolve(true);
        },
        error: (err: any) => {
          this.isSavingText.set(false);
          if (err?.status === 409) {
            // Concurrency conflict: optimistic locking detected newer version!
            this.hasRemoteTextConflict.set(true);
            this.saveFailed.set(false);
            this.fetchConflictServerText(code);
            this.showToast(this.copy.textTab.toastConflictDetected);
          } else {
            this.saveFailed.set(true);
            if (!silent) {
              this.showToast(this.copy.textTab.toastSaveFailed);
            }
          }
          resolve(false);
        }
      });
    });
  }

  fetchConflictServerText(code: string): void {
    this.api.getShare(code).subscribe({
      next: async share => {
        if (share.version) {
          this.currentVersion.set(share.version);
        }
        const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
        let content = textItem?.textContent || '';
        if (textItem?.isEncrypted && this.encryptionKey()) {
          content = await ClipboardCrypto.decryptText(content, this.encryptionKey(), share.code);
        }
        this.conflictServerText.set(content);
      }
    });
  }

  restoreDraft(): void {
    const draft = this.localDraftText();
    if (draft) {
      this.sharedText.set(draft);
      this.setEditorHtml(this.formatContentForEditor(draft));
      this.isTextDirty.set(draft !== this.remoteTextSnapshot());
      this.hasDraftRecovery.set(false);
      this.showToast(this.copy.textTab.toastDraftRestored);
    }
  }

  discardDraft(): void {
    if (typeof localStorage !== 'undefined' && this.shareCode()) {
      try {
        localStorage.removeItem(`acklet_draft_text_${this.shareCode()}`);
      } catch (_) {}
    }
    this.localDraftText.set('');
    this.hasDraftRecovery.set(false);
    this.showToast(this.copy.textTab.toastDraftDiscarded);
  }

  resolveConflictKeepMine(): void {
    this.hasRemoteTextConflict.set(false);
    this.isComparingConflict.set(false);
    // Force save overwrites server and bumps version
    this.saveTextContent(false, true);
  }

  resolveConflictAcceptServer(): void {
    const serverText = this.conflictServerText();
    this.sharedText.set(serverText);
    this.remoteTextSnapshot.set(serverText);
    this.setEditorHtml(this.formatContentForEditor(serverText));
    this.isTextDirty.set(false);
    this.hasRemoteTextConflict.set(false);
    this.isComparingConflict.set(false);
    if (typeof localStorage !== 'undefined' && this.shareCode()) {
      try {
        localStorage.removeItem(`acklet_draft_text_${this.shareCode()}`);
      } catch (_) {}
    }
    this.showToast('Updated to server version');
  }

  openCompareConflict(): void {
    this.isComparingConflict.set(true);
  }

  closeCompareConflict(): void {
    this.isComparingConflict.set(false);
  }

  async openRecentClipboardsDrawer(): Promise<void> {
    this.historyDrawerTab.set('recent');
    this.showHistoryDrawer.set(true);
    await this.loadHistory();
  }

  private async ensureCurrentRoomInHistory(): Promise<void> {
    const raw = this.shareCode() || (typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+/, '').split('/')[0]?.trim() : '');
    const code = raw ? raw.trim().toLowerCase() : '';
    if (!code || code.length < 3) return;
    await this.historyService.saveRecord({
      code,
      wordCode: this.wordCode() || undefined,
      ownerToken: this.ownerToken() || undefined,
      isSender: true,
      createdAt: Date.now(),
      itemCount: this.allFileItems().length + (this.sharedText() ? 1 : 0),
      isEncrypted: this.e2eeEnabled(),
      encryptionKey: this.encryptionKey()
    });
  }

  openRevisionsDrawer(): void {
    this.historyDrawerTab.set('revisions');
    this.showHistoryDrawer.set(true);
    this.ensureCurrentRoomInHistory();
    this.loadTextRevisions();
    this.loadHistory();
  }

  loadTextRevisions(): void {
    const raw = this.shareCode() || (typeof window !== 'undefined' ? window.location.pathname.replace(/^\/+/, '').split('/')[0]?.trim() : '');
    const code = raw ? raw.trim().toLowerCase() : '';
    if (!code || code.length < 3) return;
    this.isLoadingRevisions.set(true);
    this.api.getTextRevisions(code).subscribe({
      next: async revs => {
        this.isLoadingRevisions.set(false);
        const processedRevs: ClipboardTextRevision[] = [];
        for (const r of revs) {
          r.revisionNumber = r.version;
          let text = r.textContent || '';
          if (this.e2eeEnabled() && this.encryptionKey() && (r.isEncrypted || text.startsWith('{"iv":'))) {
            try {
              text = await ClipboardCrypto.decryptText(text, this.encryptionKey(), code);
            } catch (_) {}
          }
          r.charCount = text.length;
          r.lineCount = text ? text.split('\n').length : 1;
          r.textPreview = text.length > 120 ? text.substring(0, 120) + '...' : text;
          processedRevs.push(r);
        }

        // If no active version is present in revs but we have text in the current session, synthesize it
        if (!processedRevs.some(r => r.isCurrent) && this.sharedText()?.trim()) {
          const currentText = this.sharedText();
          const currentRev: ClipboardTextRevision = {
            id: 'current_active',
            shareCode: code,
            version: this.currentVersion() || 1,
            revisionNumber: this.currentVersion() || 1,
            textContent: currentText,
            isCurrent: true,
            isEncrypted: this.e2eeEnabled(),
            createdAt: new Date().toISOString(),
            charCount: currentText.length,
            lineCount: currentText.split('\n').length,
            textPreview: currentText.length > 120 ? currentText.substring(0, 120) + '...' : currentText
          };
          processedRevs.unshift(currentRev);
        }

        this.textRevisions.set(processedRevs);
      },
      error: () => {
        this.isLoadingRevisions.set(false);
        if (this.sharedText()?.trim()) {
          const currentText = this.sharedText();
          this.textRevisions.set([{
            id: 'current_active',
            shareCode: code,
            version: this.currentVersion() || 1,
            revisionNumber: this.currentVersion() || 1,
            textContent: currentText,
            isCurrent: true,
            isEncrypted: this.e2eeEnabled(),
            createdAt: new Date().toISOString(),
            charCount: currentText.length,
            lineCount: currentText.split('\n').length,
            textPreview: currentText.length > 120 ? currentText.substring(0, 120) + '...' : currentText
          }]);
        }
      }
    });
  }

  restoreRevision(rev: ClipboardTextRevision): void {
    const code = this.shareCode();
    if (!code) return;

    if (this.isTextDirty()) {
      this.confirmDialog.set({
        title: 'Unsaved Changes',
        message: `You have unsaved edits. Restoring version #${rev.revisionNumber || rev.version} will discard them. Would you like to save your current text first or discard and restore?`,
        confirmText: 'Save Current First',
        secondaryText: 'Discard & Restore',
        secondaryDestructive: true,
        cancelText: 'Cancel',
        isDestructive: false,
        action: async () => {
          const saved = await this.saveTextContent();
          if (saved) {
            this.executeRestoreRevision(rev);
          }
        },
        secondaryAction: () => {
          this.discardTextChanges();
          this.executeRestoreRevision(rev);
        }
      });
      return;
    }

    this.executeRestoreRevision(rev);
  }

  private executeRestoreRevision(rev: ClipboardTextRevision): void {
    const code = this.shareCode();
    if (!code) return;
    this.isRestoringRevision.set(rev.id);
    this.api.restoreTextRevision(code, rev.id, this.ownerToken() || undefined).subscribe({
      next: async item => {
        this.isRestoringRevision.set(null);
        let content = item.textContent || '';
        if (item.isEncrypted && this.encryptionKey()) {
          content = await ClipboardCrypto.decryptText(content, this.encryptionKey(), code);
        }
        this.sharedText.set(content);
        this.remoteTextSnapshot.set(content);
        this.setEditorHtml(this.formatContentForEditor(content));
        this.isTextDirty.set(false);
        this.lastSavedTime.set(Date.now());
        this.currentVersion.update(v => v + 1);
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.removeItem(`acklet_draft_text_${code}`);
          } catch (_) {}
        }
        this.showToast(this.copy.textTab.toastVersionRestored(rev.revisionNumber || rev.version));
        this.loadTextRevisions();
        this.showHistoryDrawer.set(false);
      },
      error: () => {
        this.isRestoringRevision.set(null);
        this.showToast('Failed to restore version');
      }
    });
  }

  refreshTextContent(force = false): void {
    const code = this.shareCode();
    if (!code) return;

    // Prevent duplicate concurrent refresh calls
    if (this.isRefreshing()) return;

    // Preserve unsaved local edits using custom designed modal dialog
    if (!force && this.isTextDirty()) {
      this.confirmDialog.set({
        title: 'Unsaved Changes',
        message: 'You have unsaved edits. Refreshing from the server will overwrite them. Would you like to save them first or discard and refresh?',
        confirmText: 'Save & Refresh',
        secondaryText: 'Discard & Refresh',
        secondaryDestructive: true,
        cancelText: 'Cancel',
        isDestructive: false,
        action: async () => {
          const saved = await this.saveTextContent();
          if (saved) {
            this.refreshTextContent(true);
          }
        },
        secondaryAction: () => {
          this.discardTextChanges();
          this.refreshTextContent(true);
        }
      });
      return;
    }

    this.isRefreshing.set(true);

    this.api.getShare(code).subscribe({
      next: async share => {
        this.isRefreshing.set(false);
        if (this.deletedItemIds.size > 0) {
          share = {
            ...share,
            items: share.items.filter(i => !this.deletedItemIds.has(i.id))
          };
        }
        this.activeShare.set(share);
        this.hasRemoteTextConflict.set(false);

        const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
        let content = textItem?.textContent || '';
        if (textItem?.isEncrypted && this.encryptionKey()) {
          content = await ClipboardCrypto.decryptText(content, this.encryptionKey());
        }
        this.sharedText.set(content);
        this.remoteTextSnapshot.set(content);
        this.setEditorHtml(this.formatContentForEditor(content));
        this.isTextDirty.set(false);
        this.lastSavedTime.set(Date.now());
        this.triggerTextHighlight();
      },
      error: () => {
        this.isRefreshing.set(false);
        this.showToast(this.copy.textTab.refreshFailed);
      }
    });
  }

  clearTextContent(): void {
    const current = this.sharedText();
    if (!current) return;

    this.textUndoSnapshot = current;
    this.sharedText.set('');
    this.setEditorHtml('');
    this.isTextDirty.set(true);

    this.showToast(this.copy.textTab.toastClearedUndo, 'Undo', () => {
      if (this.textUndoSnapshot !== null) {
        this.sharedText.set(this.textUndoSnapshot);
        this.setEditorHtml(this.formatContentForEditor(this.textUndoSnapshot));
        this.isTextDirty.set(this.textUndoSnapshot !== this.remoteTextSnapshot());
        this.textUndoSnapshot = null;
      }
    });
  }

  copyEntireText(): void {
    const editor = this.wysiwygEditor?.nativeElement;
    const plainText = editor ? editor.innerText : this.sharedText();
    if (!plainText && !this.sharedText()) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      // Copy both rich HTML and plain text if available
      const html = this.sharedText();
      if (typeof ClipboardItem !== 'undefined' && html) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([html], { type: 'text/html' });
        navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob
          })
        ]).catch(() => {
          navigator.clipboard.writeText(plainText);
        });
      } else {
        navigator.clipboard.writeText(plainText);
      }
    }
    this.copiedText.set(true);
    this.showToast(this.copy.textTab.toastCopied);
    setTimeout(() => this.copiedText.set(false), 2000);
  }

  async pasteTextFromClipboard(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToast('Press Ctrl+V or Cmd+V to paste into this clipboard.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const editor = this.wysiwygEditor?.nativeElement;
        if (editor) {
          editor.focus();
          if (/^https?:\/\/[^\s]+$/i.test(text.trim())) {
            const url = text.trim();
            document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
          } else {
            document.execCommand('insertText', false, text);
          }
          this.onEditorInput();
        } else {
          this.onTextChanged(this.sharedText() + text);
        }
        this.showToast('Pasted text from clipboard');
      } else {
        this.showToast('System clipboard is empty');
      }
    } catch {
      this.showToast('Use Ctrl+V / Cmd+V to paste text directly.');
    }
  }

  private triggerTextHighlight(): void {
    this.remoteTextHighlight.set(true);
    setTimeout(() => {
      this.remoteTextHighlight.set(false);
    }, CLIPBOARD_CONFIG.syncHighlightDurationMs);
  }

  // -------------------------------------------------------------
  // WYSIWYG TRUE RICH-TEXT EDITOR ENGINE
  // -------------------------------------------------------------

  /**
   * Helper to format content for display in the WYSIWYG editor.
   * If plain text or markdown is provided, converts it to clean rich HTML.
   * Auto-links any bare URLs or domain references (e.g. google.com, http://..., www...)
   * so they are immediately styled, highlighted, and interactive.
   */
  private formatContentForEditor(raw: string): string {
    if (!raw) return '';
    // If it already looks like rich HTML markup (has tags)
    if (/<[a-z][\s\S]*>/i.test(raw)) {
      return this.linkifyHtml(raw);
    }
    // If it contains markdown syntax, render it to structured HTML
    if (this.hasMarkdownSyntax()) {
      return this.linkifyHtml(this.parseMarkdownToHtml(raw));
    }
    // Otherwise plain text: escape entities, linkify URLs/domains, and convert newlines to br
    const escaped = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const linkified = this.linkifyHtml(escaped);
    return linkified.replace(/\n/g, '<br>');
  }

  /**
   * Scans HTML content and turns unlinked URLs, www links, and domain names (e.g. google.com)
   * into clean, clickable anchor tags without corrupting existing HTML attributes or tags.
   */
  private linkifyHtml(html: string): string {
    if (!html) return '';
    const parts = html.split(/(<[^>]+>)/g);
    let inAnchor = false;
    const urlRegex = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|ai|dev|co|app|me|info|biz|site|xyz|online|live|tech|cloud|store|space)(?:\/[^\s<>"'{}|\\^`[\]]*)?/gi;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('<')) {
        if (/^<a\b/i.test(part)) inAnchor = true;
        if (/^<\/a>/i.test(part)) inAnchor = false;
        continue;
      }
      if (!inAnchor && part.length > 0) {
        parts[i] = part.replace(urlRegex, (match) => {
          const clean = match.replace(/[.,;:!?)]+$/, '');
          const trailing = match.slice(clean.length);
          if (!clean) return match;
          let href = clean;
          if (!href.startsWith('http://') && !href.startsWith('https://')) {
            href = 'https://' + href;
          }
          return `<a href="${href}" target="_blank" rel="noopener noreferrer">${clean}</a>${trailing}`;
        });
      }
    }
    return parts.join('');
  }

  /**
   * Automatically scans and transforms any raw unlinked URLs or domains inside
   * the active WYSIWYG editor into clickable <a> anchor tags.
   */
  linkifyEditorDom(): void {
    const editor = this.wysiwygEditor?.nativeElement;
    if (!editor) return;

    const currentHtml = editor.innerHTML;
    if (!currentHtml) return;

    const linkified = this.linkifyHtml(currentHtml);
    if (linkified !== currentHtml) {
      editor.innerHTML = linkified;
      this.onEditorInput();
    }
  }

  /**
   * Updates the editor's live DOM content while preserving focus and caret position if requested.
   */
  private setEditorHtml(html: string): void {
    const editor = this.wysiwygEditor?.nativeElement;
    if (!editor) return;
    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }

  /**
   * Invoked when the WYSIWYG editor loses focus. Automatically ensures all URLs
   * and domains in the editor are converted to bold, clickable links.
   */
  onEditorBlur(): void {
    this.isEditorFocused.set(false);
    this.linkifyEditorDom();
  }

  /**
   * Handles user typing or modifications in the contenteditable WYSIWYG container.
   */
  onEditorInput(): void {
    const editor = this.wysiwygEditor?.nativeElement;
    if (!editor) return;

    // Grab current innerHTML
    const currentHtml = editor.innerHTML;
    // Normalize empty editor (e.g. <br> or empty whitespace)
    const normalized = (currentHtml === '<br>' || currentHtml === '<div><br></div>' || !editor.innerText.trim()) && !editor.querySelector('img, hr')
      ? ''
      : currentHtml;

    this.sharedText.set(normalized);
    const isDirty = normalized !== this.remoteTextSnapshot();
    this.isTextDirty.set(isDirty);

    if (this.hasRemoteTextConflict()) {
      this.hasRemoteTextConflict.set(false);
    }

    // Persist recoverable local draft to localStorage
    if (typeof localStorage !== 'undefined' && this.shareCode()) {
      try {
        if (isDirty && normalized.trim()) {
          localStorage.setItem(`acklet_draft_text_${this.shareCode()}`, normalized);
        } else if (!isDirty) {
          localStorage.removeItem(`acklet_draft_text_${this.shareCode()}`);
        }
      } catch (_) {}
    }
  }

  /**
   * Handles keyboard shortcuts in the editor (Ctrl+B, Ctrl+I, Ctrl+U, Tab indent, etc.)
   */
  onEditorKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'b') {
        event.preventDefault();
        this.applyFormatting('bold');
      } else if (key === 'i') {
        event.preventDefault();
        this.applyFormatting('italic');
      } else if (key === 'u') {
        event.preventDefault();
        this.applyFormatting('underline');
      } else if (key === 's') {
        event.preventDefault();
        this.saveTextContent();
      }
      return;
    }

    // Auto-link typed URLs and domains when pressing Space or Enter
    if (event.key === ' ' || event.key === 'Enter') {
      this.autoLinkLastTypedWord();
    }
  }

  /**
   * Checks the text node right before the caret; if the user just typed a URL or domain
   * (e.g. https://google.com or google.com or www.example.org), automatically turns it into
   * a clickable <a> link before proceeding with space/enter.
   */
  private autoLinkLastTypedWord(): void {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode) return;

    const node = sel.anchorNode;
    // Don't auto-link if already inside an anchor tag
    if (node.parentElement?.closest('a')) return;

    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const textBeforeCaret = node.nodeValue.substring(0, sel.anchorOffset);
      const urlPattern = /(?:https?:\/\/|www\.)[^\s<>"'{}|\\^`[\]]+|(?:[a-zA-Z0-9-]+\.)+(?:com|org|net|edu|gov|io|ai|dev|co|app|me|info|biz|site|xyz|online|live|tech|cloud|store|space)(?:\/[^\s<>"'{}|\\^`[\]]*)?$/i;
      const match = textBeforeCaret.match(urlPattern);

      if (match && match.index !== undefined) {
        let matchedStr = match[0];
        let clean = matchedStr.replace(/[.,;:!?)]+$/, '');
        let trailing = matchedStr.slice(clean.length);
        if (clean.length > 3) {
          const startIdx = match.index;
          const endIdx = startIdx + clean.length;

          let href = clean;
          if (!href.startsWith('http://') && !href.startsWith('https://')) {
            href = 'https://' + href;
          }

          const range = document.createRange();
          range.setStart(node, startIdx);
          range.setEnd(node, endIdx);

          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = clean;

          range.deleteContents();
          range.insertNode(a);

          // Position caret right after the link
          const newRange = document.createRange();
          if (trailing) {
            const trailingNode = document.createTextNode(trailing);
            a.parentNode?.insertBefore(trailingNode, a.nextSibling);
            newRange.setStart(trailingNode, trailing.length);
            newRange.setEnd(trailingNode, trailing.length);
          } else {
            newRange.setStartAfter(a);
            newRange.setEndAfter(a);
          }
          sel.removeAllRanges();
          sel.addRange(newRange);

          this.onEditorInput();
        }
      }
    }
  }

  /**
   * Cleans incoming pasted HTML/text and inserts it cleanly into the WYSIWYG document.
   */
  onEditorPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipData = event.clipboardData;
    if (!clipData) return;

    const html = clipData.getData('text/html');
    const text = clipData.getData('text/plain');

    if (html) {
      // Basic sanitization of pasted HTML to eliminate unsafe scripts
      const temp = document.createElement('div');
      temp.innerHTML = html;
      // Strip script/style tags
      const scripts = temp.querySelectorAll('script, style, meta, link');
      scripts.forEach(s => s.remove());
      const safeHtml = this.linkifyHtml(temp.innerHTML);
      document.execCommand('insertHTML', false, safeHtml);
    } else if (text) {
      // Check if text is a single valid URL: insert as a link
      if (/^https?:\/\/[^\s]+$/i.test(text.trim())) {
        const url = text.trim();
        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
      } else {
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const linkified = this.linkifyHtml(escaped).replace(/\n/g, '<br>');
        document.execCommand('insertHTML', false, linkified);
      }
    }

    this.onEditorInput();
  }

  /**
   * Handles user clicks inside the editor. If a link or anchor element is clicked,
   * safely opens the URL in a new window/tab so hyperlinks remain fully clickable and active.
   */
  onEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (anchor && anchor.href) {
      event.preventDefault();
      event.stopPropagation();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  }

  private savedSelectionRange: Range | null = null;

  saveEditorSelection(): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const editor = this.wysiwygEditor?.nativeElement;
      const range = sel.getRangeAt(0);
      if (editor && (editor === range.commonAncestorContainer || editor.contains(range.commonAncestorContainer))) {
        this.savedSelectionRange = range.cloneRange();
      }
    }
  }

  restoreEditorSelection(): void {
    if (!this.savedSelectionRange) return;
    const sel = window.getSelection();
    if (sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(this.savedSelectionRange);
      } catch (e) {}
    }
  }

  /**
   * Applies formatting directly to the selected text in the WYSIWYG editor.
   * No raw HTML or tags are ever typed as visible strings!
   */
  applyFormatting(type: string, arg?: string): void {
    const editor = this.wysiwygEditor?.nativeElement;
    if (!editor) return;

    editor.focus();
    this.restoreEditorSelection();

    switch (type) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false);
        break;
      case 'heading1':
        try {
          document.execCommand('formatBlock', false, '<h1>');
        } catch {
          document.execCommand('formatBlock', false, 'h1');
        }
        break;
      case 'heading2':
        try {
          document.execCommand('formatBlock', false, '<h2>');
        } catch {
          document.execCommand('formatBlock', false, 'h2');
        }
        break;
      case 'heading3':
        try {
          document.execCommand('formatBlock', false, '<h3>');
        } catch {
          document.execCommand('formatBlock', false, 'h3');
        }
        break;
      case 'bullet':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'number':
        document.execCommand('insertOrderedList', false);
        break;
      case 'quote':
        try {
          document.execCommand('formatBlock', false, '<blockquote>');
        } catch {
          document.execCommand('formatBlock', false, 'blockquote');
        }
        break;
      case 'hr':
        document.execCommand('insertHorizontalRule', false);
        break;
      case 'color': {
        const color = arg || '#0d9488';
        document.execCommand('foreColor', false, color);
        this.showColorPicker.set(false);
        break;
      }
      case 'hiliteColor': {
        const highlight = arg || '#fef08a';
        document.execCommand('hiliteColor', false, highlight);
        this.showColorPicker.set(false);
        break;
      }
      case 'code': {
        // Inline code formatting using DOM Range
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          if (!range.collapsed) {
            const codeEl = document.createElement('code');
            codeEl.className = 'editor-inline-code';
            try {
              range.surroundContents(codeEl);
            } catch {
              const text = range.toString();
              document.execCommand('insertHTML', false, `<code class="editor-inline-code">${text}</code>`);
            }
          } else {
            document.execCommand('insertHTML', false, '<code class="editor-inline-code">code</code>');
          }
        }
        break;
      }
      case 'codeblock': {
        const sel = window.getSelection();
        const selectedText = sel ? sel.toString() : '';
        const content = selectedText || 'Hello';
        document.execCommand('insertHTML', false, `<pre class="editor-code-block"><code>${content}</code></pre><p><br></p>`);
        break;
      }
      case 'link': {
        this.saveEditorSelection();
        const sel = window.getSelection();
        const selectedText = sel ? sel.toString().trim() : '';
        const rangeToUse = this.savedSelectionRange ? this.savedSelectionRange.cloneRange() : null;
        this.confirmDialog.set({
          title: 'Insert Link',
          message: 'Enter URL for the hyperlink:',
          confirmText: 'Insert',
          cancelText: 'Cancel',
          withInput: true,
          inputPlaceholder: 'https://example.com',
          inputInitialValue: selectedText.startsWith('http') ? selectedText : '',
          action: () => {},
          onActionWithInput: (url) => {
            if (url && url.trim()) {
              editor.focus();
              let linkUrl = url.trim();
              if (!linkUrl.startsWith('http://') && !linkUrl.startsWith('https://')) {
                linkUrl = 'https://' + linkUrl;
              }
              if (rangeToUse) {
                const s = window.getSelection();
                if (s) {
                  s.removeAllRanges();
                  s.addRange(rangeToUse);
                }
                const a = document.createElement('a');
                a.href = linkUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = selectedText || linkUrl;
                rangeToUse.deleteContents();
                rangeToUse.insertNode(a);
              } else {
                document.execCommand('insertHTML', false, `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkUrl}</a> `);
              }
              this.onEditorInput();
            }
          }
        });
        this.showFormattingMore.set(false);
        return;
      }
      case 'clear':
        document.execCommand('removeFormat', false);
        try {
          document.execCommand('formatBlock', false, '<p>');
        } catch {
          document.execCommand('formatBlock', false, 'p');
        }
        this.showFormattingMore.set(false);
        break;
      default:
        break;
    }

    this.onEditorInput();
    this.showFormattingMore.set(false);
  }

  /**
   * High-performance, fully sanitized Markdown-to-HTML parser.
   * Strips unsafe scripts/protocols and renders headers, bold, italics,
   * code blocks, lists, links, blockquotes, and horizontal rules safely.
   */
  private parseMarkdownToHtml(md: string): string {
    if (!md) return '';

    // 1. Initial escape for untrusted raw HTML entities
    let out = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Fenced Code Blocks (```code```)
    out = out.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
      return `<pre class="md-code-block"><code>${code.trim()}</code></pre>`;
    });

    // 3. Inline Code (`code`)
    out = out.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

    // 4. Horizontal Rules
    out = out.replace(/^\s*(?:---|\*\*\*|___)\s*$/gm, '<hr class="md-hr" />');

    // 5. Headings (# H1 to ###### H6)
    out = out.replace(/^###### (.*$)/gm, '<h6 class="md-h6">$1</h6>');
    out = out.replace(/^##### (.*$)/gm, '<h5 class="md-h5">$1</h5>');
    out = out.replace(/^#### (.*$)/gm, '<h4 class="md-h4">$1</h4>');
    out = out.replace(/^### (.*$)/gm, '<h3 class="md-h3">$1</h3>');
    out = out.replace(/^## (.*$)/gm, '<h2 class="md-h2">$1</h2>');
    out = out.replace(/^# (.*$)/gm, '<h1 class="md-h1">$1</h1>');

    // 6. Blockquotes (> quote)
    out = out.replace(/^\s*&gt;\s+(.*$)/gm, '<blockquote class="md-blockquote">$1</blockquote>');

    // 7. Unordered Lists (- or *)
    out = out.replace(/^\s*[-*+]\s+(.*$)/gm, '<li class="md-bullet-item">$1</li>');

    // 8. Ordered Lists (1. item)
    out = out.replace(/^\s*(\d+)\.\s+(.*$)/gm, '<li class="md-number-item"><span class="md-num">$1.</span> $2</li>');

    // Wrap consecutive list items in <ul> or <ol>
    out = out.replace(/((?:<li class="md-bullet-item">.*?<\/li>\s*)+)/g, '<ul class="md-ul">$1</ul>');
    out = out.replace(/((?:<li class="md-number-item">.*?<\/li>\s*)+)/g, '<ol class="md-ol">$1</ol>');

    // 9. Bold (**text** or __text__)
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 10. Italic (*text* or _text_)
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 11. Strikethrough (~~text~~)
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 12. Safe Hyperlinks [text](url) — validate protocol against javascript: or data: exploits
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
      const cleanUrl = url.trim();
      const isSafe = /^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('/');
      if (!isSafe) {
        return text;
      }
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="md-link">${text}</a>`;
    });

    // 13. Auto-link bare URLs
    const bareUrlRegex = /(?<!href="|">)(https?:\/\/[^\s<]+)/gi;
    out = out.replace(bareUrlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

    // 14. Paragraphs and line breaks
    const lines = out.split('\n\n');
    out = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // If line is already a structural block element, keep as is
      if (/^<(h[1-6]|pre|ul|ol|blockquote|hr)/.test(trimmed)) {
        return trimmed;
      }
      return `<p class="md-p">${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    return out;
  }

  // -------------------------------------------------------------
  // TAB 2: FILES UPLOAD & SELECTION LOGIC
  // -------------------------------------------------------------
  openFilePicker(): void {
    this.fileInputGeneral?.nativeElement?.click();
  }

  /**
   * Opens the native folder picker (webkitdirectory) and converts the selected folder to a zip.
   */
  openFolderPicker(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = async () => {
      if (input.files && input.files.length > 0) {
        this.setTab('files');
        await this.processFolderFiles(Array.from(input.files));
      }
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  }

  async processFolderFiles(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;

    const folderMap = new Map<string, { path: string; file: File }[]>();

    for (const file of files) {
      const relPath = file.webkitRelativePath || file.name;
      const cleanPath = relPath.replace(/\\/g, '/');
      const firstSlash = cleanPath.indexOf('/');
      const rootDir = firstSlash > 0 ? cleanPath.substring(0, firstSlash) : 'folder';

      if (!folderMap.has(rootDir)) {
        folderMap.set(rootDir, []);
      }
      folderMap.get(rootDir)!.push({ path: cleanPath, file });
    }

    for (const [folderName, entries] of folderMap.entries()) {
      await this.zipAndUploadFolder(folderName, entries);
    }
  }

  /**
   * Reads the system clipboard using navigator.clipboard API.
   * Extracts images or text and processes them into the clipboard.
   */
  async pasteFromClipboard(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToast('Clipboard access not supported in this browser. Use Ctrl+V instead.');
      return;
    }

    try {
      // Modern Clipboard Items API (supports images and files)
      if (typeof navigator.clipboard.read === 'function') {
        const clipboardItems = await navigator.clipboard.read();
        let foundMedia = false;

        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split('/')[1] || 'png';
            const pastedFile = new File([blob], `Pasted image ${new Date().toLocaleTimeString().replace(/:/g, '-')}.${ext}`, {
              type: imageType
            });
            this.setTab('files');
            await this.processFilesUpload([pastedFile]);
            foundMedia = true;
            this.showToast('Pasted image added to files');
            break;
          }
        }

        if (foundMedia) return;
      }

      // Text fallback via readText()
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        if (this.activeTab() === 'text') {
          const current = this.sharedText();
          const separator = current && !current.endsWith('\n') ? '\n' : '';
          this.onTextChanged(current + separator + text);
          this.showToast('Pasted text into editor');
        } else {
          // If on files tab, create a text snippet file
          const textBlob = new Blob([text], { type: 'text/plain' });
          const textFile = new File([textBlob], `Pasted snippet ${new Date().toLocaleTimeString().replace(/:/g, '-')}.txt`, {
            type: 'text/plain'
          });
          await this.processFilesUpload([textFile]);
          this.showToast('Pasted text saved as file');
        }
      } else {
        this.showToast('Clipboard is empty or contains unsupported content');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (errorMsg.includes('denied') || errorMsg.includes('permission')) {
        this.showToast('Clipboard permission was denied. Use Ctrl+V / Cmd+V to paste directly.');
      } else {
        this.showToast('Press Ctrl+V or Cmd+V to paste into this clipboard.');
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFilesUpload(Array.from(input.files));
      input.value = '';
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFilesUpload(Array.from(event.dataTransfer.files));
    }
  }

  async processFilesUpload(files: File[]): Promise<void> {
    const code = this.shareCode();
    if (!code) return;

    const existingItems = this.activeShare()?.items || [];

    for (const file of files) {
      if (file.size > CLIPBOARD_CONFIG.maxFileSizeBytes) {
        this.showToast(this.copy.identity.errorTooLarge);
        continue;
      }

      // Quick duplicate check by name and size
      const isDuplicate = existingItems.some(i => i.originalName === file.name && i.sizeBytes === file.size);
      if (isDuplicate) {
        this.showToast(`"${file.name}": ${this.copy.textTab.duplicateFileSkipped}`);
        continue;
      }

      const isImg = file.type.startsWith('image/');
      const clientUploadId = 'up-' + Math.random().toString(36).substring(2, 9);

      const state: UploadingFileState = {
        id: clientUploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        isImage: isImg,
        status: 'uploading',
        file
      };

      this.uploadingFiles.update(list => [...list, state]);

      // Launch resumable chunked upload asynchronously
      this.startResumableUpload(state, existingItems);
    }
  }

  private async startResumableUpload(
    uploadState: UploadingFileState,
    existingItems: ClipboardItem[]
  ): Promise<void> {
    const code = this.shareCode();
    if (!code || !uploadState.file) return;

    const file = uploadState.file;
    const clientUploadId = uploadState.id;
    const chunkSize = CLIPBOARD_CONFIG.chunkSize;
    const totalChunks = Math.ceil(file.size / chunkSize);

    let fileHash = uploadState.fileHash || '';
    if (!fileHash) {
      try {
        fileHash = await ClipboardCrypto.computeFileHash(file);
      } catch (e) {
        console.warn('Could not compute file hash, using size fallback', e);
      }
    }

    if (fileHash) {
      const isHashDuplicate = existingItems.some(i => i.contentHash === fileHash);
      if (isHashDuplicate) {
        this.uploadingFiles.update(list => list.filter(u => u.id !== clientUploadId));
        this.showToast(`"${file.name}": ${this.copy.textTab.duplicateFileSkipped}`);
        return;
      }
    }

    // Initialize or resume chunked session on server
    this.api.initChunkedUpload(
      code,
      file.name,
      file.size,
      chunkSize,
      totalChunks,
      uploadState.isImage,
      this.e2eeEnabled(),
      this.ownerToken() || undefined,
      fileHash || undefined
    ).subscribe({
      next: session => {
        const verifiedChunks = new Set<number>(session.uploadedChunks || []);
        const serverUploadId = session.uploadId;

        // Persist upload session key in localStorage for recovery
        if (typeof localStorage !== 'undefined' && fileHash) {
          try {
            localStorage.setItem(`acklet_clip_resumable_${code}_${fileHash}_${file.size}`, serverUploadId);
          } catch (_) {}
        }

        const initialProgress = totalChunks > 0 ? Math.round((verifiedChunks.size / totalChunks) * 100) : 0;
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          uploadId: serverUploadId,
          totalChunks,
          uploadedChunkIndices: Array.from(verifiedChunks),
          fileHash,
          progress: initialProgress,
          status: 'uploading',
          errorMessage: undefined
        } : u));

        if (session.isComplete || verifiedChunks.size >= totalChunks) {
          this.finalizeChunkedUpload(code, clientUploadId, serverUploadId, fileHash);
        } else {
          this.uploadNextMissingChunk(code, file, clientUploadId, serverUploadId, verifiedChunks, chunkSize, totalChunks, fileHash);
        }
      },
      error: err => {
        this.uploadSubscriptions.delete(clientUploadId);
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          status: 'error',
          errorMessage: err.error?.message || 'Upload could not be initialized. Click retry to resume.'
        } : u));
      }
    });
  }

  private uploadNextMissingChunk(
    code: string,
    file: File,
    clientUploadId: string,
    serverUploadId: string,
    verifiedChunks: Set<number>,
    chunkSize: number,
    totalChunks: number,
    fileHash: string
  ): void {
    // Find next chunk index that has not been uploaded yet
    let nextChunk = -1;
    for (let i = 0; i < totalChunks; i++) {
      if (!verifiedChunks.has(i)) {
        nextChunk = i;
        break;
      }
    }

    if (nextChunk === -1 || verifiedChunks.size >= totalChunks) {
      // All chunks uploaded: finalize
      this.finalizeChunkedUpload(code, clientUploadId, serverUploadId, fileHash);
      return;
    }

    const start = nextChunk * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    const sub = this.api.uploadChunk(code, serverUploadId, nextChunk, chunkBlob).subscribe({
      next: res => {
        verifiedChunks.add(nextChunk);
        const progress = Math.round((verifiedChunks.size / totalChunks) * 100);

        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          progress,
          uploadedChunkIndices: Array.from(verifiedChunks)
        } : u));

        if (res.isComplete || verifiedChunks.size >= totalChunks) {
          this.finalizeChunkedUpload(code, clientUploadId, serverUploadId, fileHash);
        } else {
          this.uploadNextMissingChunk(code, file, clientUploadId, serverUploadId, verifiedChunks, chunkSize, totalChunks, fileHash);
        }
      },
      error: () => {
        this.uploadSubscriptions.delete(clientUploadId);
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          status: 'error',
          errorMessage: 'Upload interrupted. Click resume to continue.'
        } : u));
      }
    });

    this.uploadSubscriptions.set(clientUploadId, sub);
  }

  private finalizeChunkedUpload(code: string, clientUploadId: string, serverUploadId: string, fileHash: string): void {
    this.uploadSubscriptions.delete(clientUploadId);
    this.api.completeChunkedUpload(code, serverUploadId).subscribe({
      next: item => {
        if (fileHash) item.contentHash = fileHash;
        if (typeof localStorage !== 'undefined' && fileHash) {
          try {
            localStorage.removeItem(`acklet_clip_resumable_${code}_${fileHash}_${item.sizeBytes}`);
          } catch (_) {}
        }
        this.uploadingFiles.update(list => list.filter(u => u.id !== clientUploadId));
        this.appendItemLocally(item);
        this.syncService.notifyLocalChange({
          shareCode: code,
          eventType: 'ITEM_ADDED',
          item
        });
        this.showToast('File uploaded successfully');
      },
      error: err => {
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          status: 'error',
          errorMessage: err.error?.message || 'Final assembly failed. Click retry to resume.'
        } : u));
      }
    });
  }

  retryUpload(id: string): void {
    const current = this.uploadingFiles().find(u => u.id === id);
    if (!current || !current.file) {
      this.showToast('Please re-select the file to resume upload');
      return;
    }

    this.uploadingFiles.update(list => list.map(u => u.id === id ? {
      ...u,
      status: 'uploading',
      errorMessage: undefined
    } : u));

    const existingItems = this.activeShare()?.items || [];
    this.startResumableUpload(current, existingItems);
  }

  cancelUpload(id: string): void {
    const sub = this.uploadSubscriptions.get(id);
    if (sub) {
      sub.unsubscribe();
      this.uploadSubscriptions.delete(id);
    }
    const current = this.uploadingFiles().find(u => u.id === id);
    if (current && typeof localStorage !== 'undefined' && current.fileHash && current.size) {
      try {
        const code = this.shareCode();
        if (code) {
          localStorage.removeItem(`acklet_clip_resumable_${code}_${current.fileHash}_${current.size}`);
        }
      } catch (_) {}
    }
    this.uploadingFiles.update(list => list.filter(u => u.id !== id));
  }

  private cardClickTimer: any = null;

  // Card Clicks & Selection Mechanics (Single-click preview, Double-click select/deselect)
  onCardClick(item: ClipboardItem, event: MouseEvent): void {
    if (event.shiftKey && this.lastSelectedItemId) {
      this.selectRange(this.lastSelectedItemId, item.id);
      return;
    }

    const isSelectionActive = this.selectedItemIds().size > 0;
    if (isSelectionActive) {
      this.toggleItemSelection(item.id);
      return;
    }

    // Debounce single-click preview slightly so double-click cleanly toggles selection
    if (this.cardClickTimer) {
      clearTimeout(this.cardClickTimer);
      this.cardClickTimer = null;
    }

    this.cardClickTimer = setTimeout(() => {
      if (item.itemType === 'IMAGE') {
        this.lightboxImage.set(item);
      } else {
        this.detailsSheetItem.set(item);
      }
      this.lastSelectedItemId = item.id;
      this.cardClickTimer = null;
    }, 220);
  }

  onCardDblClick(item: ClipboardItem, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.cardClickTimer) {
      clearTimeout(this.cardClickTimer);
      this.cardClickTimer = null;
    }
    this.toggleItemSelection(item.id);
  }

  toggleItemSelection(itemId: string, event?: Event): void {
    if (event) event.stopPropagation();
    const current = new Set(this.selectedItemIds());
    if (current.has(itemId)) {
      current.delete(itemId);
    } else {
      current.add(itemId);
    }
    this.selectedItemIds.set(current);
    this.lastSelectedItemId = itemId;
  }

  private selectRange(fromId: string, toId: string): void {
    const items = this.displayFileItems();
    const fromIdx = items.findIndex(i => i.id === fromId);
    const toIdx = items.findIndex(i => i.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const set = new Set(this.selectedItemIds());
    for (let i = start; i <= end; i++) {
      set.add(items[i].id);
    }
    this.selectedItemIds.set(set);
  }

  selectAllFiles(): void {
    const allIds = this.displayFileItems().map(i => i.id);
    this.selectedItemIds.set(new Set(allIds));
  }

  clearSelection(): void {
    this.selectedItemIds.set(new Set());
  }

  // Multi-Selection Actions (Bottom Floating Dark Pill Bar)
  downloadSelectedItems(): void {
    const ids = Array.from(this.selectedItemIds());
    const items = this.allFileItems().filter(i => ids.includes(i.id));
    if (items.length === 0) return;

    if (items.length === 1) {
      this.triggerDirectDownload(items[0]);
    } else {
      // Use existing backend zip endpoint if available
      const code = this.shareCode();
      if (code) {
        const zipUrl = this.api.getZipDownloadUrl(code);
        window.open(zipUrl, '_blank');
      } else {
        items.forEach(i => this.triggerDirectDownload(i));
      }
    }
    this.clearSelection();
  }

  deleteSelectedItems(): void {
    const code = this.shareCode();
    if (!code) return;

    const ids = Array.from(this.selectedItemIds());
    const itemsToDelete = this.allFileItems().filter(i => ids.includes(i.id));
    if (itemsToDelete.length === 0) return;

    // Immediately record as deleted locally so polling/sync can never re-add them
    ids.forEach(id => this.deletedItemIds.add(id));

    // Trigger smooth exit animation on items first
    this.deletingItemIds.set(new Set(ids));
    this.clearSelection();

    setTimeout(() => {
      // Remove after animation completes
      ids.forEach(id => this.removeItemLocally(id));
      const nextDeleting = new Set(this.deletingItemIds());
      ids.forEach(id => nextDeleting.delete(id));
      this.deletingItemIds.set(nextDeleting);
    }, 220);

    // Delete immediately on backend
    itemsToDelete.forEach(item => {
      this.api.deleteItem(code, item.id, this.ownerToken() || undefined).subscribe({
        next: () => {
          this.syncService.notifyLocalChange({
            shareCode: code,
            eventType: 'ITEM_DELETED',
            item
          });
        },
        error: (err) => console.error('[Clipboard] Failed to delete item:', err)
      });
    });

    const count = itemsToDelete.length;
    this.showToast(count === 1 ? '1 item deleted' : `${count} items deleted`);
  }

  triggerDirectDownload(item: ClipboardItem): void {
    const code = this.shareCode();
    if (!code) return;
    const url = this.api.getDownloadUrl(code, item.id);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.originalName || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  closeLightbox(): void {
    if (this.isClosingLightbox()) return;
    this.isClosingLightbox.set(true);
    setTimeout(() => {
      this.lightboxImage.set(null);
      this.isClosingLightbox.set(false);
    }, 200);
  }

  // Lightbox Navigation
  navigateLightbox(offset: number): void {
    const images = this.allFileItems().filter(i => i.itemType === 'IMAGE');
    const current = this.lightboxImage();
    if (!current || images.length === 0) return;

    const idx = images.findIndex(i => i.id === current.id);
    const nextIdx = (idx + offset + images.length) % images.length;
    this.lightboxImage.set(images[nextIdx]);
  }

  // Filter & Sort Controls
  setFileSubFilter(filter: FileSubFilter): void {
    if (this.fileSubFilter() === filter) return;
    this.fileSubFilter.set(filter);
  }

  onScrollerScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    const scrolled = target.scrollTop > 4;
    if (this.isFilesScrolled() !== scrolled) {
      this.isFilesScrolled.set(scrolled);
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('acklet_clipboard_view_mode', mode);
    }
  }

  setSortOption(opt: SortOption): void {
    this.sortOption.set(opt);
    this.showSortPopover.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('acklet_clipboard_sort_option', opt);
    }
  }

  toggleTypeFilter(cat: FileCategory): void {
    const current = new Set(this.selectedTypeFilters());
    if (current.has(cat)) current.delete(cat);
    else current.add(cat);
    this.selectedTypeFilters.set(current);
  }

  toggleSourceFilter(source: 'uploaded' | 'pasted'): void {
    const current = new Set(this.selectedSourceFilters());
    if (current.has(source)) current.delete(source);
    else current.add(source);
    this.selectedSourceFilters.set(current);
  }

  clearAllFilters(): void {
    this.selectedTypeFilters.set(new Set());
    this.selectedSourceFilters.set(new Set());
    this.searchQuery.set('');
    this.fileSubFilter.set('all');
    this.showFilterPopover.set(false);
  }

  // Metadata Resolver Helper for Template
  resolveItemMeta(item: ClipboardItem): FileTypeMetadata {
    return resolveFileMetadata(item.originalName || '', item.detectedMime);
  }

  isImageItem(item: ClipboardItem): boolean {
    if (item.itemType === 'IMAGE') return true;
    if (item.detectedMime && item.detectedMime.startsWith('image/')) return true;
    return resolveFileMetadata(item.originalName || '', item.detectedMime).category === 'images';
  }

  getItemThumbnailUrl(item: ClipboardItem): string {
    const code = this.shareCode();
    if (!code) return '';
    return this.api.getPreviewUrl(code, item.id);
  }

  // -------------------------------------------------------------
  // REAL-TIME SYNC EVENT HANDLER
  // -------------------------------------------------------------
  private async handleSyncEvent(event: ClipboardSyncEvent): Promise<void> {
    if (!event || !this.activeShare()) return;

    if (event.version) {
      this.currentVersion.set(Math.max(this.currentVersion(), event.version));
    }

    if (event.eventType === 'ITEM_ADDED' && event.item) {
      const item = event.item;
      if (item.itemType === 'TEXT' || item.itemType === 'LINK') {
        let content = item.textContent || '';

        // Check if this room was renamed by another device
        if (content.includes('__acklet_redirect__')) {
          try {
            const parsed = JSON.parse(content);
            if (parsed.__acklet_redirect__ && parsed.__acklet_redirect__ !== this.shareCode()) {
              this.showToast(`Clipboard renamed to "${parsed.__acklet_redirect__}" by another device`);
              this.joinClipboard(parsed.__acklet_redirect__);
              return;
            }
          } catch (e) {}
        }

        if (item.isEncrypted || content.startsWith('{"iv":')) {
          content = await ClipboardCrypto.decryptText(content, this.encryptionKey(), this.shareCode() || undefined);
        }

        if (this.isTextDirty()) {
          // Unsaved edits safety: do NOT overwrite user's work! Show conflict resolution banner
          this.conflictServerText.set(content);
          this.hasRemoteTextConflict.set(true);
        } else if (content !== this.sharedText()) {
          // Silently update with soft highlight
          this.sharedText.set(content);
          this.remoteTextSnapshot.set(content);
          this.setEditorHtml(this.formatContentForEditor(content));
          this.lastSavedTime.set(Date.now());
          this.triggerTextHighlight();
        }
      } else {
        if (!this.deletedItemIds.has(item.id)) {
          this.appendItemLocally(item);
        }
      }
    } else if (event.eventType === 'ITEM_DELETED' && event.item?.id) {
      this.removeItemLocally(event.item.id);
    }
  }

  private startReactivePollingFallback(code: string): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (this.activeShare() && this.activeShare()?.code === code) {
        this.api.getShare(code).subscribe({
          next: async share => {
            if (share.version) {
              this.currentVersion.set(Math.max(this.currentVersion(), share.version));
            }
            const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
            if (textItem && textItem.textContent) {
              // Check if room was renamed from another device
              if (textItem.textContent.includes('__acklet_redirect__')) {
                try {
                  const parsed = JSON.parse(textItem.textContent);
                  if (parsed.__acklet_redirect__ && parsed.__acklet_redirect__ !== this.shareCode()) {
                    this.showToast(`Clipboard renamed to "${parsed.__acklet_redirect__}" by another device`);
                    this.joinClipboard(parsed.__acklet_redirect__);
                    return;
                  }
                } catch (e) {}
              }

              let content = textItem.textContent;
              if (textItem.isEncrypted || content.startsWith('{"iv":')) {
                content = await ClipboardCrypto.decryptText(content, this.encryptionKey(), share.code);
              }

              if (this.isTextDirty()) {
                if (content !== this.remoteTextSnapshot() && content !== this.sharedText()) {
                  this.conflictServerText.set(content);
                  this.hasRemoteTextConflict.set(true);
                }
              } else {
                if (content !== this.sharedText() && content !== this.remoteTextSnapshot()) {
                  this.sharedText.set(content);
                  this.remoteTextSnapshot.set(content);
                  this.setEditorHtml(this.formatContentForEditor(content));
                  this.triggerTextHighlight();
                }
              }
            }
            if (this.deletedItemIds.size > 0) {
              share = {
                ...share,
                items: share.items.filter(i => !this.deletedItemIds.has(i.id))
              };
            }
            this.activeShare.set(share);
          },
          error: () => { }
        });
      }
    }, 4500);
  }

  private appendItemLocally(item: ClipboardItem): void {
    const current = this.activeShare();
    if (!current) return;
    if (current.items.some(i => i.id === item.id)) return;

    this.activeShare.set({
      ...current,
      items: [item, ...current.items],
      totalSizeBytes: current.totalSizeBytes + (item.sizeBytes || 0)
    });
  }

  private removeItemLocally(itemId: string): void {
    this.deletedItemIds.add(itemId);
    const current = this.activeShare();
    if (!current) return;

    this.activeShare.set({
      ...current,
      items: current.items.filter(i => i.id !== itemId)
    });
  }

  // -------------------------------------------------------------
  // TOAST & FEEDBACK UTILITIES
  // -------------------------------------------------------------
  showToast(text: string, actionText?: string, onAction?: () => void): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.activeToast.set({
      id: Math.random().toString(),
      text,
      actionText,
      onAction
    });

    this.toastTimeout = setTimeout(() => {
      this.activeToast.set(null);
    }, CLIPBOARD_CONFIG.toastDurationMs);
  }

  dismissToast(): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.activeToast.set(null);
  }

  // -------------------------------------------------------------
  // SETTINGS & HISTORY
  // -------------------------------------------------------------
  togglePrivateMode(): void {
    const next = !this.isPrivateMode();
    this.isPrivateMode.set(next);
    this.historyService.setPrivateMode(next);
    if (next) {
      this.recentClipboards.set([]);
    } else {
      this.loadHistory();
    }
  }

  async loadHistory(): Promise<void> {
    await this.ensureCurrentRoomInHistory();
    const records = await this.historyService.getRecentRecords();
    this.recentClipboards.set(records);
  }

  openFromHistory(record: LocalClipboardRecord): void {
    this.showHistoryDrawer.set(false);
    this.joinClipboard(record.code);
  }

  async removeClipboardFromHistory(code: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.historyService.deleteRecord(code);
    await this.loadHistory();
    this.showToast(`Removed "${code}" from history`);
  }

  clearHistory(): void {
    this.historyService.clearAllHistory();
    this.recentClipboards.set([]);
  }

  getRelativeTimeString(timestamp: number | string): string {
    const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    const diffSec = Math.floor((Date.now() - time) / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} d ago`;
  }

  formatBytes(bytes: number | null | undefined): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + (sizes[i] || 'B');
  }
}
