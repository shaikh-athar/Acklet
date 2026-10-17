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
import { Subscription } from 'rxjs';

import {
  ClipboardApiService,
  ClipboardConfigDto,
  ClipboardItem,
  ClipboardShare,
  CreateShareOptions
} from './services/clipboard-api.service';
import { ClipboardSyncService, ClipboardSyncEvent } from './services/clipboard-sync.service';
import { ClipboardCrypto } from './services/clipboard-crypto';
import { ClipboardHistoryService, LocalClipboardRecord } from './services/clipboard-history.service';
import { QrLoaderService } from './services/qr-loader.service';
import { FormatBytesPipe } from './pipes/format-bytes.pipe';
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
  uploadedChunks?: number;
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
  private autoSaveTimeout?: any;
  private toastTimeout?: any;

  // Active Main Tab: Text & Links vs Files
  readonly activeTab = signal<MainTab>('text');
  readonly tabDirection = signal<'left' | 'right'>('right');

  setTab(tab: MainTab): void {
    if (tab === this.activeTab()) return;
    this.tabDirection.set(tab === 'files' ? 'right' : 'left');
    this.activeTab.set(tab);
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
  readonly e2eeEnabled = signal<boolean>(true);
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
    isDestructive?: boolean;
    action: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Switching clipboard state
  readonly isSwitching = signal<boolean>(false);
  readonly switchingCode = signal<string | null>(null);

  // Deleting item IDs for smooth exit animation
  readonly deletingItemIds = signal<Set<string>>(new Set<string>());

  // Feedback states
  readonly copiedCode = signal<boolean>(false);
  readonly copiedLink = signal<boolean>(false);
  readonly activeToast = signal<ToastMessage | null>(null);

  // -------------------------------------------------------------
  // TAB 1: TEXT & LINKS (Shared Single Textarea, Klipit Style)
  // -------------------------------------------------------------
  readonly sharedText = signal<string>('');
  readonly remoteTextSnapshot = signal<string>('');
  readonly isTextDirty = signal<boolean>(false);
  readonly isSavingText = signal<boolean>(false);
  readonly isRefreshing = signal<boolean>(false);
  readonly lastSavedTime = signal<number | null>(null);
  readonly hasRemoteTextConflict = signal<boolean>(false);
  readonly remoteTextHighlight = signal<boolean>(false);
  private textUndoSnapshot: string | null = null;

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

  // Filter Popover
  readonly showFilterPopover = signal<boolean>(false);
  readonly showSortPopover = signal<boolean>(false);
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

  // Drag Overlay
  readonly isDragOver = signal<boolean>(false);

  // Uploading Files Queue
  readonly uploadingFiles = signal<UploadingFileState[]>([]);

  // Previews
  readonly lightboxImage = signal<ClipboardItem | null>(null);
  readonly detailsSheetItem = signal<ClipboardItem | null>(null);

  // References
  @ViewChild('fileInputGeneral') fileInputGeneral!: ElementRef<HTMLInputElement>;
  @ViewChild('fileSearchInput') fileSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('sharedTextarea') sharedTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('textBackdrop') textBackdrop?: ElementRef<HTMLDivElement>;

  syncTextareaScroll(): void {
    if (this.sharedTextarea && this.textBackdrop) {
      this.textBackdrop.nativeElement.scrollTop = this.sharedTextarea.nativeElement.scrollTop;
      this.textBackdrop.nativeElement.scrollLeft = this.sharedTextarea.nativeElement.scrollLeft;
    }
  }

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
      this.joinClipboard(incomingCode);
    } else {
      // Auto-create initial active clipboard session so user has an ID right away
      this.initSharedClipboard();
    }

    // Real-time synchronization stream
    this.syncSub = this.syncService.events.subscribe(event => {
      this.handleSyncEvent(event);
    });
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    this.syncService.disconnect();
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.autoSaveTimeout) clearTimeout(this.autoSaveTimeout);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  // -------------------------------------------------------------
  // KEYBOARD SHORTCUTS & GLOBAL LISTENERS
  // -------------------------------------------------------------
  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
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
        this.lightboxImage.set(null);
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

  // Prevent silent data loss if navigating away with unsaved changes
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isTextDirty()) {
      event.preventDefault();
      event.returnValue = '';
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
    const isInsideInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (!isInsideInput && this.activeTab() === 'files') {
      const text = event.clipboardData?.getData('text');
      if (text && text.trim()) {
        event.preventDefault();
        this.setTab('text');
        this.onTextChanged(this.sharedText() + (this.sharedText() ? '\n' : '') + text.trim());
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
  onWindowDrop(event: DragEvent): void {
    if (this.hasFilesBeingDragged(event)) {
      event.preventDefault();
      this.dragCounter = 0;
      this.isDragOver.set(false);
      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        this.setTab('files');
        this.processFilesUpload(Array.from(event.dataTransfer.files));
      }
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
  async initSharedClipboard(): Promise<void> {
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

    // If no encryption key was loaded from URL or existing room, generate one now
    if (!this.encryptionKey() && this.e2eeEnabled()) {
      try {
        const freshKey = await ClipboardCrypto.generateKey();
        this.encryptionKey.set(freshKey);
      } catch (e) {
        console.warn('Could not generate default crypto key', e);
      }
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
      if (diffHours >= 600) {
        this.retentionHours.set(720);
        this.selectedRetentionHours = 720;
      } else if (diffHours >= 300) {
        this.retentionHours.set(360);
        this.selectedRetentionHours = 360;
      } else {
        this.retentionHours.set(168);
        this.selectedRetentionHours = 168;
      }
    } else {
      this.retentionHours.set(168);
      this.selectedRetentionHours = 168;
    }

    // Connect WebSocket
    this.syncService.connect(share.code);
    this.isSyncConnected.set(true);
    this.startReactivePollingFallback(share.code);

    // Generate QR Code data URL
    this.refreshQrCode();

    // Extract text item from share items if one exists
    const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
    if (textItem && textItem.textContent) {
      let content = textItem.textContent;
      if (textItem.isEncrypted && this.encryptionKey()) {
        content = await ClipboardCrypto.decryptText(content, this.encryptionKey());
      }
      this.sharedText.set(content);
      this.remoteTextSnapshot.set(content);
      this.isTextDirty.set(false);
      this.lastSavedTime.set(Date.now());
    } else {
      this.sharedText.set('');
      this.remoteTextSnapshot.set('');
      this.isTextDirty.set(false);
      this.lastSavedTime.set(null);
    }

    // Save to history
    this.historyService.saveRecord({
      code: share.code,
      wordCode: share.wordCode,
      ownerToken: share.ownerToken,
      isSender: true,
      createdAt: Date.now(),
      itemCount: share.items.length,
      isEncrypted: this.e2eeEnabled(),
      encryptionKey: this.encryptionKey()
    });
    this.loadHistory();
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

    // Check if target custom ID already exists
    this.api.getShare(desired).subscribe({
      next: (existing) => {
        // If an existing room exists with items/activity not ours, warn user
        const isCurrentOurs = existing.code === current;
        const hasExistingItems = (existing.items && existing.items.length > 0) || existing.textCount > 0;
        
        if (!isCurrentOurs && hasExistingItems) {
          this.isSavingCustomCode.set(false);
          this.showToast('This Clipboard ID is already in use by another session. Choose a unique one.');
          return;
        }

        // Migrate current text and files into new code session if we had content
        const currentText = this.sharedText();
        const token = this.ownerToken() || undefined;

        this.api.createShare({ requestedCode: desired, liveMode: true }).subscribe({
          next: (newShare) => {
            this.isSavingCustomCode.set(false);
            this.isEditingCode.set(false);
            this.applyShareSession(newShare);

            // Re-save existing text if present
            if (currentText.trim()) {
              this.api.addTextItem(desired, currentText, newShare.ownerToken || token).subscribe();
            }

            this.showToast(`Clipboard ID updated to "${desired}"`);
          },
          error: () => {
            this.isSavingCustomCode.set(false);
            this.cancelEditCode();
            this.showToast('Failed to update clipboard ID');
          }
        });
      },
      error: () => {
        // Code does not exist -> create new share with desired code
        this.api.createShare({ requestedCode: desired, liveMode: true }).subscribe({
          next: (newShare) => {
            this.isSavingCustomCode.set(false);
            this.isEditingCode.set(false);
            const currentText = this.sharedText();
            this.applyShareSession(newShare);

            if (currentText.trim()) {
              this.api.addTextItem(desired, currentText, newShare.ownerToken).subscribe();
            }

            this.showToast(`Clipboard ID set to "${desired}"`);
          },
          error: () => {
            this.isSavingCustomCode.set(false);
            this.cancelEditCode();
            this.showToast('Failed to update clipboard ID');
          }
        });
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
    if (this.isTextDirty() || this.sharedText().trim() || this.allFileItems().length > 0) {
      this.confirmDialog.set({
        title: 'Start New Clipboard',
        message: 'Are you sure you want to start a fresh clipboard? Any unsaved edits will be saved or cleared.',
        confirmText: 'New Clipboard',
        cancelText: 'Cancel',
        isDestructive: false,
        action: () => {
          this.sharedText.set('');
          this.remoteTextSnapshot.set('');
          this.isTextDirty.set(false);
          this.selectedItemIds.set(new Set());
          this.initSharedClipboard();
        }
      });
      return;
    }
    this.sharedText.set('');
    this.remoteTextSnapshot.set('');
    this.isTextDirty.set(false);
    this.selectedItemIds.set(new Set());
    this.initSharedClipboard();
  }

  joinClipboard(codeToJoin?: string, fromUrlInit = false): void {
    const code = (codeToJoin || this.joinCodeInput).trim().toLowerCase();
    if (!code) return;

    this.isJoining.set(true);
    this.isSwitching.set(true);
    this.switchingCode.set(code);
    this.joinError.set(null);

    this.api.getShare(code).subscribe({
      next: async share => {
        this.isJoining.set(false);
        this.isSwitching.set(false);
        this.switchingCode.set(null);
        this.joinCodeInput = '';
        this.showMobileJoinPopover.set(false);
        this.applyShareSession(share);
      },
      error: err => {
        this.isJoining.set(false);
        this.isSwitching.set(false);
        this.switchingCode.set(null);
        const isNotFound = err.status === 404 || err.error?.message?.includes('not found');
        const isExpired = err.error?.message?.includes('expired');

        if (isNotFound) {
          this.joinError.set(`Code "${code}" does not exist`);
          // Show Acklet alert dialog offering to start a fresh clipboard
          this.confirmDialog.set({
            title: 'Clipboard Not Found',
            message: `Clipboard "${code}" does not exist or may have expired. Would you like to start a new clipboard instead?`,
            confirmText: 'Start New Clipboard',
            cancelText: 'Dismiss',
            isDestructive: false,
            action: () => {
              this.sharedText.set('');
              this.remoteTextSnapshot.set('');
              this.isTextDirty.set(false);
              this.initSharedClipboard();
            },
            onCancel: () => {
              // Dismissed without creating
            }
          });
        } else if (isExpired) {
          this.joinError.set(this.copy.identity.errorExpiredCode);
          this.confirmDialog.set({
            title: 'Clipboard Expired',
            message: `Clipboard "${code}" has expired. Would you like to start a new clipboard session?`,
            confirmText: 'Start New Clipboard',
            cancelText: 'Dismiss',
            isDestructive: false,
            action: () => {
              this.initSharedClipboard();
            }
          });
        } else {
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

    // Clear conflict banner once user edits or aligns
    if (this.hasRemoteTextConflict()) {
      this.hasRemoteTextConflict.set(false);
    }
  }

  async saveTextContent(): Promise<void> {
    const code = this.shareCode();
    if (!code) return;

    const text = this.sharedText();
    this.isSavingText.set(true);

    let textToSend = text;
    if (this.e2eeEnabled() && this.encryptionKey()) {
      textToSend = await ClipboardCrypto.encryptText(text, this.encryptionKey());
    }

    this.api.addTextItem(code, textToSend, this.ownerToken() || undefined, this.e2eeEnabled()).subscribe({
      next: item => {
        this.isSavingText.set(false);
        this.remoteTextSnapshot.set(text);
        this.isTextDirty.set(false);
        this.lastSavedTime.set(Date.now());
        this.showToast(this.copy.textTab.toastSaved);
        this.appendItemLocally(item);
      },
      error: () => {
        this.isSavingText.set(false);
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
        title: 'Refresh Clipboard',
        message: 'You have unsaved edits. Refreshing from the server will discard them. Would you like to save them first or refresh anyway?',
        confirmText: 'Discard & Refresh',
        cancelText: 'Cancel',
        isDestructive: true,
        action: () => {
          this.refreshTextContent(true);
        }
      });
      return;
    }

    this.isRefreshing.set(true);

    this.api.getShare(code).subscribe({
      next: async share => {
        this.isRefreshing.set(false);
        this.activeShare.set(share);
        this.hasRemoteTextConflict.set(false);

        const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
        let content = textItem?.textContent || '';
        if (textItem?.isEncrypted && this.encryptionKey()) {
          content = await ClipboardCrypto.decryptText(content, this.encryptionKey());
        }
        this.sharedText.set(content);
        this.remoteTextSnapshot.set(content);
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
    this.isTextDirty.set(true);

    this.showToast(this.copy.textTab.toastClearedUndo, 'Undo', () => {
      if (this.textUndoSnapshot !== null) {
        this.sharedText.set(this.textUndoSnapshot);
        this.isTextDirty.set(this.textUndoSnapshot !== this.remoteTextSnapshot());
        this.textUndoSnapshot = null;
      }
    });
  }

  copyEntireText(): void {
    const val = this.sharedText();
    if (!val) return;
    navigator.clipboard.writeText(val);
    this.showToast(this.copy.textTab.toastCopied);
  }

  async pasteTextFromClipboard(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.showToast('Press Ctrl+V or Cmd+V to paste into this clipboard.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const current = this.sharedText();
        const separator = current && !current.endsWith('\n') ? '\n' : '';
        this.onTextChanged(current + separator + text);
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
  // TAB 2: FILES UPLOAD & SELECTION LOGIC
  // -------------------------------------------------------------
  openFilePicker(): void {
    this.fileInputGeneral?.nativeElement?.click();
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

    const chunkSize = CLIPBOARD_CONFIG.chunkSize;
    const existingItems = this.activeShare()?.items || [];

    for (const file of files) {
      if (file.size > CLIPBOARD_CONFIG.maxFileSizeBytes) {
        this.showToast(this.copy.identity.errorTooLarge);
        continue;
      }

      // SHA-256 Content Hashing Deduplication check
      let fileHash = '';
      try {
        fileHash = await ClipboardCrypto.computeFileHash(file);
      } catch (e) {
        console.warn('Could not compute file hash, using size+name fallback', e);
      }

      const isDuplicate = existingItems.some(i => {
        if (fileHash && i.contentHash) {
          return i.contentHash === fileHash;
        }
        return (i.originalName === file.name && i.sizeBytes === file.size);
      });

      if (isDuplicate) {
        this.showToast(`"${file.name}": ${this.copy.textTab.duplicateFileSkipped}`);
        continue;
      }

      const isImg = file.type.startsWith('image/');
      const uploadId = 'up-' + Math.random().toString(36).substring(2, 9);
      const totalChunks = Math.ceil(file.size / chunkSize);

      const state: UploadingFileState = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        isImage: isImg,
        status: 'uploading',
        totalChunks,
        uploadedChunks: 0
      };

      this.uploadingFiles.update(list => [...list, state]);

      if (file.size <= chunkSize) {
        this.api.uploadFileDirect(code, file, isImg, this.ownerToken() || undefined, this.e2eeEnabled()).subscribe({
          next: item => {
            if (fileHash) item.contentHash = fileHash;
            this.uploadingFiles.update(list => list.filter(u => u.id !== uploadId));
            this.appendItemLocally(item);
          },
          error: err => {
            this.uploadingFiles.update(list => list.map(u => u.id === uploadId ? {
              ...u,
              status: 'error',
              errorMessage: err.error?.message || 'Upload failed'
            } : u));
          }
        });
      } else {
        this.executeChunkedUpload(code, file, uploadId, chunkSize, totalChunks, isImg);
      }
    }
  }

  private executeChunkedUpload(code: string, file: File, uploadId: string, chunkSize: number, totalChunks: number, isImg: boolean): void {
    this.api.initChunkedUpload(code, file.name, file.size, chunkSize, totalChunks, isImg, this.e2eeEnabled(), this.ownerToken() || undefined).subscribe({
      next: session => {
        this.uploadNextChunk(code, file, uploadId, session.uploadId, 0, chunkSize, totalChunks);
      },
      error: err => {
        this.uploadingFiles.update(list => list.map(u => u.id === uploadId ? {
          ...u,
          status: 'error',
          errorMessage: err.error?.message || 'Chunk init failed'
        } : u));
      }
    });
  }

  private uploadNextChunk(code: string, file: File, clientUploadId: string, serverUploadId: string, chunkNumber: number, chunkSize: number, totalChunks: number): void {
    const start = chunkNumber * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    this.api.uploadChunk(code, serverUploadId, chunkNumber, chunkBlob).subscribe({
      next: res => {
        const progress = Math.round(((chunkNumber + 1) / totalChunks) * 100);
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          progress,
          uploadedChunks: chunkNumber + 1
        } : u));

        if (res.isComplete || chunkNumber + 1 >= totalChunks) {
          this.api.completeChunkedUpload(code, serverUploadId).subscribe({
            next: item => {
              this.uploadingFiles.update(list => list.filter(u => u.id !== clientUploadId));
              this.appendItemLocally(item);
            },
            error: () => {
              this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? { ...u, status: 'error' } : u));
            }
          });
        } else {
          this.uploadNextChunk(code, file, clientUploadId, serverUploadId, chunkNumber + 1, chunkSize, totalChunks);
        }
      },
      error: () => {
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? { ...u, status: 'error' } : u));
      }
    });
  }

  cancelUpload(id: string): void {
    this.uploadingFiles.update(list => list.filter(u => u.id !== id));
  }

  // Card Clicks & Selection Mechanics
  onCardClick(item: ClipboardItem, event: MouseEvent): void {
    const isSelectionActive = this.selectedItemIds().size > 0;

    if (event.shiftKey && this.lastSelectedItemId) {
      this.selectRange(this.lastSelectedItemId, item.id);
      return;
    }

    if (isSelectionActive) {
      this.toggleItemSelection(item.id);
      return;
    }

    // Default: Open Preview
    if (item.itemType === 'IMAGE') {
      this.lightboxImage.set(item);
    } else {
      this.detailsSheetItem.set(item);
    }
    this.lastSelectedItemId = item.id;
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

    this.deletedItemsUndoStack = [...itemsToDelete];

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

    this.showToast(this.copy.filesTab.toastDeletedUndo, 'Undo', () => {
      // Undo restoration
      this.deletedItemsUndoStack.forEach(item => this.appendItemLocally(item));
      this.deletedItemsUndoStack = [];
    });

    // Permanently trigger delete on backend after toast timeout
    setTimeout(() => {
      if (this.deletedItemsUndoStack.length > 0) {
        itemsToDelete.forEach(item => {
          this.api.deleteItem(code, item.id, this.ownerToken() || undefined).subscribe();
        });
        this.deletedItemsUndoStack = [];
      }
    }, CLIPBOARD_CONFIG.toastDurationMs);
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

    if (event.eventType === 'ITEM_ADDED' && event.item) {
      const item = event.item;
      if (item.itemType === 'TEXT' || item.itemType === 'LINK') {
        let content = item.textContent || '';
        if (item.isEncrypted && this.encryptionKey()) {
          content = await ClipboardCrypto.decryptText(content, this.encryptionKey());
        }

        if (this.isTextDirty()) {
          // Unsaved edits safety: do NOT overwrite. Show Slim Banner
          this.hasRemoteTextConflict.set(true);
        } else {
          // Silently update with soft highlight
          this.sharedText.set(content);
          this.remoteTextSnapshot.set(content);
          this.lastSavedTime.set(Date.now());
          this.triggerTextHighlight();
        }
      } else {
        this.appendItemLocally(item);
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
            const textItem = share.items.find(i => i.itemType === 'TEXT' || i.itemType === 'LINK');
            if (textItem && textItem.textContent && !this.isTextDirty()) {
              let content = textItem.textContent;
              if (textItem.isEncrypted && this.encryptionKey()) {
                content = await ClipboardCrypto.decryptText(content, this.encryptionKey());
              }
              if (content !== this.remoteTextSnapshot()) {
                this.sharedText.set(content);
                this.remoteTextSnapshot.set(content);
                this.triggerTextHighlight();
              }
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
