import { Component, inject, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClipboardApiService, ClipboardConfigDto, ClipboardItem, ClipboardShare, CreateShareOptions } from './services/clipboard-api.service';
import { ClipboardSyncService } from './services/clipboard-sync.service';
import { ClipboardCrypto } from './services/clipboard-crypto';
import { ClipboardHistoryService, LocalClipboardRecord } from './services/clipboard-history.service';
import { ToolIconComponent } from '@acklet/tool-shell';
import { Subscription } from 'rxjs';

type ToolMode = 'send' | 'receive';
type ActiveTab = 'text' | 'images' | 'files';

interface UploadingFileState {
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

@Component({
  selector: 'app-clipboard-tool',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolIconComponent],
  templateUrl: './clipboard.component.html',
  styleUrls: ['./clipboard.component.css']
})
export class ClipboardComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClipboardApiService);
  private readonly syncService = inject(ClipboardSyncService);
  private readonly historyService = inject(ClipboardHistoryService);

  private syncSub?: Subscription;
  private pollInterval?: any;

  // Configuration
  readonly config = signal<ClipboardConfigDto>({
    codeLength: 5,
    maxCodeLength: 6,
    maxFileSizeBytes: 200 * 1024 * 1024,
    maxTextSizeBytes: 1024 * 1024,
    maxItemsPerType: 20,
    maxTotalShareSizeBytes: 1024 * 1024 * 1024,
    retentionDays: 7,
    chunkSize: 5 * 1024 * 1024
  });

  // State
  readonly mode = signal<ToolMode>('send');
  readonly activeTab = signal<ActiveTab>('text');

  // Share Options (Advanced Differentiators)
  readonly expiryHours = signal<number>(168); // 1, 24, 168 (7 days)
  readonly pinProtection = signal<string>('');
  readonly burnAfterReading = signal<boolean>(false);
  readonly liveRoomMode = signal<boolean>(false);
  readonly e2eeEnabled = signal<boolean>(false);
  readonly encryptionKey = signal<string>('');

  // Sender State
  readonly shareCode = signal<string | null>(null);
  readonly wordCode = signal<string | null>(null);
  readonly ownerToken = signal<string | null>(null);
  readonly isCreatingShare = signal<boolean>(false);
  readonly newTextSnippet = signal<string>('');
  readonly isSubmittingText = signal<boolean>(false);
  readonly uploadingFiles = signal<UploadingFileState[]>([]);
  readonly showShareSettings = signal<boolean>(false);

  // Receiver State
  receiveCode = '';
  receivePin = '';
  readonly pinRequired = signal<boolean>(false);
  readonly isLoadingShare = signal<boolean>(false);
  readonly activeShare = signal<ClipboardShare | null>(null);
  readonly receiveError = signal<string | null>(null);

  // Retention & History
  readonly showHistoryDrawer = signal<boolean>(false);
  readonly isPrivateMode = signal<boolean>(false);
  readonly recentClipboards = signal<LocalClipboardRecord[]>([]);

  // Preview Modal
  readonly previewItem = signal<ClipboardItem | null>(null);

  // QR Code Modal
  readonly showQrModal = signal<boolean>(false);

  // Abuse Report State
  readonly isReportingAbuse = signal<boolean>(false);
  readonly reportSubmitted = signal<boolean>(false);
  readonly showReportModal = signal<boolean>(false);
  reportReason = '';

  // Copied feedback states
  readonly copiedItemId = signal<string | null>(null);
  readonly copiedCode = signal<boolean>(false);
  readonly copiedLink = signal<boolean>(false);

  // Drag overlay states
  readonly isDragOver = signal<boolean>(false);

  // Counts & Filtered lists
  readonly currentItems = computed(() => this.activeShare()?.items || []);

  readonly textItems = computed(() => 
    this.currentItems().filter(i => i.itemType === 'TEXT' || i.itemType === 'LINK')
  );

  readonly imageItems = computed(() => 
    this.currentItems().filter(i => i.itemType === 'IMAGE')
  );

  readonly fileItems = computed(() => 
    this.currentItems().filter(i => i.itemType === 'FILE')
  );

  readonly formattedMaxFileSize = computed(() => {
    const bytes = this.config().maxFileSizeBytes;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  });

  @ViewChild('imageFileInput') imageFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('docFileInput') docFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('codeBox') codeBoxInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.loadConfig();
    this.isPrivateMode.set(this.historyService.isPrivateMode());
    this.loadHistory();

    // Check URL search parameters (?code=12345&key=...) OR hash fragments (/#12345&key=...)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      let incomingCode = urlParams.get('code') || '';
      let incomingKey = urlParams.get('key') || '';

      if (!incomingCode && window.location.hash) {
        const hashContent = window.location.hash.replace('#', '');
        const parts = hashContent.split('&');
        incomingCode = parts[0]?.trim() || '';
        const keyParam = parts.find(p => p.startsWith('key='));
        if (keyParam) {
          incomingKey = keyParam.replace('key=', '');
        }
      }

      if (incomingKey) {
        this.encryptionKey.set(incomingKey);
        this.e2eeEnabled.set(true);
      }

      if (incomingCode.length >= 4) {
        this.mode.set('receive');
        this.receiveCode = incomingCode;
        this.fetchReceiverShare(incomingCode);
      }

      // Handle PWA Web Share Target payload (?title=...&text=...&url=...)
      const sharedTitle = urlParams.get('title') || '';
      const sharedText = urlParams.get('text') || '';
      const sharedUrl = urlParams.get('url') || '';
      const combinedShared = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join('\n');
      if (combinedShared && !incomingCode) {
        this.mode.set('send');
        this.activeTab.set('text');
        this.newTextSnippet.set(combinedShared);
        this.generateCode();
      }
    }

    // Subscribe to real-time sync events
    this.syncSub = this.syncService.events.subscribe(event => {
      this.handleSyncEvent(event);
    });
  }

  ngOnDestroy(): void {
    this.syncSub?.unsubscribe();
    this.syncService.disconnect();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  // --- Fast Input Listeners (Ctrl+V anywhere & Drag-Drop) ---
  @HostListener('window:paste', ['$event'])
  async onWindowPaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;

    // Check for images first
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          this.activeTab.set('images');
          this.processFilesUpload([file], true);
          return;
        }
      }
    }

    // Plain text paste fallback if not inside an input box
    const target = event.target as HTMLElement;
    const isInsideInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    if (!isInsideInput) {
      const pastedText = event.clipboardData?.getData('text');
      if (pastedText && pastedText.trim()) {
        event.preventDefault();
        this.activeTab.set('text');
        this.newTextSnippet.set(pastedText.trim());
        this.submitTextSnippet();
      }
    }
  }

  loadConfig(): void {
    this.api.getConfig().subscribe({
      next: cfg => this.config.set(cfg),
      error: () => {}
    });
  }

  async loadHistory(): Promise<void> {
    const records = await this.historyService.getRecentRecords();
    this.recentClipboards.set(records);
  }

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

  setMode(m: ToolMode): void {
    this.mode.set(m);
    if (m === 'receive' && this.receiveCode.length >= 4 && !this.activeShare()) {
      this.fetchReceiverShare(this.receiveCode);
    }
  }

  setActiveTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  // --- Sender Logic ---
  async generateCode(): Promise<void> {
    if (this.shareCode()) return;

    this.isCreatingShare.set(true);

    if (this.e2eeEnabled() && !this.encryptionKey()) {
      const generatedKey = await ClipboardCrypto.generateKey();
      this.encryptionKey.set(generatedKey);
    }

    const options: CreateShareOptions = {
      expiryHours: this.expiryHours(),
      pin: this.pinProtection() ? this.pinProtection() : undefined,
      burnAfterReading: this.burnAfterReading(),
      liveMode: this.liveRoomMode()
    };

    this.api.createShare(options).subscribe({
      next: share => {
        this.shareCode.set(share.code);
        this.wordCode.set(share.wordCode || null);
        this.ownerToken.set(share.ownerToken || null);
        this.activeShare.set(share);
        this.isCreatingShare.set(false);

        // Connect real-time WebSocket channel
        this.syncService.connect(share.code);
        this.startReactivePollingFallback(share.code);

        // Record to local IndexedDB history
        this.historyService.saveRecord({
          code: share.code,
          wordCode: share.wordCode,
          ownerToken: share.ownerToken,
          isSender: true,
          createdAt: Date.now(),
          itemCount: 0,
          isEncrypted: this.e2eeEnabled(),
          encryptionKey: this.encryptionKey()
        });
        this.loadHistory();

        // If there is pending text snippet, add it automatically
        if (this.newTextSnippet().trim()) {
          this.submitTextSnippet();
        }
      },
      error: () => {
        this.isCreatingShare.set(false);
      }
    });
  }

  async submitTextSnippet(): Promise<void> {
    const text = this.newTextSnippet().trim();
    if (!text) return;

    if (!this.shareCode()) {
      await this.generateCode();
      return;
    }

    const code = this.shareCode()!;
    this.isSubmittingText.set(true);

    let textToSend = text;
    if (this.e2eeEnabled() && this.encryptionKey()) {
      textToSend = await ClipboardCrypto.encryptText(text, this.encryptionKey());
    }

    this.api.addTextItem(code, textToSend, this.ownerToken() || undefined, this.e2eeEnabled()).subscribe({
      next: item => {
        this.isSubmittingText.set(false);
        this.newTextSnippet.set('');
        this.appendItemLocally(item);
      },
      error: () => {
        this.isSubmittingText.set(false);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFilesUpload(Array.from(input.files), true);
      input.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFilesUpload(Array.from(input.files), false);
      input.value = '';
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      const isImg = this.activeTab() === 'images';
      this.processFilesUpload(files, isImg);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  async processFilesUpload(files: File[], isImageTab: boolean): Promise<void> {
    if (!this.shareCode()) {
      await this.generateCode();
    }

    const code = this.shareCode()!;
    const chunkSize = this.config().chunkSize || 5 * 1024 * 1024;

    for (const file of files) {
      // Validate file size cap (200 MB)
      if (file.size > this.config().maxFileSizeBytes) {
        alert(`File "${file.name}" exceeds the maximum allowed size of 200 MB.`);
        continue;
      }

      const uploadId = 'upload-' + Math.random().toString(36).substring(2, 9);
      const totalChunks = Math.ceil(file.size / chunkSize);

      const state: UploadingFileState = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        isImage: isImageTab,
        status: 'uploading',
        totalChunks,
        uploadedChunks: 0
      };

      this.uploadingFiles.update(list => [...list, state]);

      if (file.size <= chunkSize) {
        // Direct single-flight upload for smaller files
        this.api.uploadFileDirect(code, file, isImageTab, this.ownerToken() || undefined, this.e2eeEnabled()).subscribe({
          next: item => {
            this.uploadingFiles.update(list => list.filter(u => u.id !== uploadId));
            this.appendItemLocally(item);
          },
          error: (err) => {
            this.uploadingFiles.update(list => list.map(u => u.id === uploadId ? {
              ...u,
              status: 'error',
              errorMessage: err.error?.message || 'Upload failed'
            } : u));
          }
        });
      } else {
        // Resumable Chunked Upload (5MB slices)
        this.executeChunkedUpload(code, file, uploadId, chunkSize, totalChunks, isImageTab);
      }
    }
  }

  private executeChunkedUpload(code: string, file: File, uploadId: string, chunkSize: number, totalChunks: number, isImageTab: boolean): void {
    this.api.initChunkedUpload(code, file.name, file.size, chunkSize, totalChunks, isImageTab, this.e2eeEnabled(), this.ownerToken() || undefined).subscribe({
      next: session => {
        this.uploadNextChunk(code, file, uploadId, session.uploadId, 0, chunkSize, totalChunks);
      },
      error: (err) => {
        this.uploadingFiles.update(list => list.map(u => u.id === uploadId ? {
          ...u,
          status: 'error',
          errorMessage: err.error?.message || 'Failed to initialize chunked upload'
        } : u));
      }
    });
  }

  private uploadNextChunk(code: string, file: File, clientUploadId: string, serverUploadId: string, chunkNumber: number, chunkSize: number, totalChunks: number): void {
    const current = this.uploadingFiles().find(u => u.id === clientUploadId);
    if (current && current.isPaused) {
      return; // Paused
    }

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
          // Final assembly step
          this.api.completeChunkedUpload(code, serverUploadId).subscribe({
            next: item => {
              this.uploadingFiles.update(list => list.filter(u => u.id !== clientUploadId));
              this.appendItemLocally(item);
            },
            error: err => {
              this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
                ...u,
                status: 'error',
                errorMessage: err.error?.message || 'Failed to assemble chunks'
              } : u));
            }
          });
        } else {
          // Upload next chunk
          this.uploadNextChunk(code, file, clientUploadId, serverUploadId, chunkNumber + 1, chunkSize, totalChunks);
        }
      },
      error: err => {
        this.uploadingFiles.update(list => list.map(u => u.id === clientUploadId ? {
          ...u,
          status: 'error',
          errorMessage: err.error?.message || `Chunk ${chunkNumber + 1} upload failed`
        } : u));
      }
    });
  }

  pauseUpload(uploadId: string): void {
    this.uploadingFiles.update(list => list.map(u => u.id === uploadId ? { ...u, isPaused: true, status: 'paused' } : u));
  }

  resumeUpload(uploadId: string): void {
    this.uploadingFiles.update(list => list.map(u => u.id === uploadId ? { ...u, isPaused: false, status: 'uploading' } : u));
  }

  cancelUpload(uploadId: string): void {
    this.uploadingFiles.update(list => list.filter(u => u.id !== uploadId));
  }

  deleteItem(item: ClipboardItem): void {
    const code = this.shareCode() || this.activeShare()?.code;
    if (!code) return;

    this.api.deleteItem(code, item.id, this.ownerToken() || undefined).subscribe({
      next: () => {
        this.removeItemLocally(item.id);
      },
      error: () => {}
    });
  }

  // --- Receiver Logic ---
  onReceiveCodeInput(val: string): void {
    this.receiveCode = val.trim();
    this.receiveError.set(null);
    this.pinRequired.set(false);

    if (this.receiveCode.length >= 4) {
      this.fetchReceiverShare(this.receiveCode);
    } else {
      this.activeShare.set(null);
    }
  }

  onPinSubmit(): void {
    if (this.receiveCode && this.receivePin) {
      this.fetchReceiverShare(this.receiveCode, this.receivePin);
    }
  }

  fetchReceiverShare(code: string, pin?: string): void {
    this.isLoadingShare.set(true);
    this.receiveError.set(null);

    this.api.getShare(code, pin).subscribe({
      next: async share => {
        // If items are encrypted, attempt decryption
        if (this.encryptionKey()) {
          for (const item of share.items) {
            if (item.textContent && item.isEncrypted) {
              item.textContent = await ClipboardCrypto.decryptText(item.textContent, this.encryptionKey());
            }
          }
        }

        this.activeShare.set(share);
        this.isLoadingShare.set(false);
        this.pinRequired.set(false);

        // Connect WebSocket and polling for receiver live updates
        this.syncService.connect(share.code);
        this.startReactivePollingFallback(share.code);

        // Record to IndexedDB
        this.historyService.saveRecord({
          code: share.code,
          wordCode: share.wordCode,
          isSender: false,
          createdAt: Date.now(),
          itemCount: share.items.length,
          isEncrypted: this.e2eeEnabled(),
          encryptionKey: this.encryptionKey()
        });
        this.loadHistory();
      },
      error: err => {
        this.isLoadingShare.set(false);
        if (err.error?.message === 'PIN_REQUIRED' || err.error?.message === 'INVALID_PIN') {
          this.pinRequired.set(true);
          this.receiveError.set(err.error?.message === 'INVALID_PIN' ? 'Incorrect PIN entered.' : 'This clipboard is protected with a PIN.');
        } else {
          this.activeShare.set(null);
          this.receiveError.set(err.error?.message || 'Invalid or expired code. Please verify the 5-digit code or word code.');
        }
      }
    });
  }

  openFromHistory(record: LocalClipboardRecord): void {
    this.showHistoryDrawer.set(false);
    if (record.isSender && record.ownerToken) {
      this.mode.set('send');
      this.shareCode.set(record.code);
      this.wordCode.set(record.wordCode || null);
      this.ownerToken.set(record.ownerToken);
      if (record.encryptionKey) {
        this.encryptionKey.set(record.encryptionKey);
        this.e2eeEnabled.set(true);
      }
      this.fetchReceiverShare(record.code);
    } else {
      this.mode.set('receive');
      this.receiveCode = record.code;
      if (record.encryptionKey) {
        this.encryptionKey.set(record.encryptionKey);
        this.e2eeEnabled.set(true);
      }
      this.fetchReceiverShare(record.code);
    }
  }

  // --- Real-time Sync Handlers ---
  private handleSyncEvent(event: any): void {
    if (!event || !this.activeShare()) return;

    if (event.eventType === 'ITEM_ADDED' && event.item) {
      this.appendItemLocally(event.item);
      this.triggerTabNotification(event.item);
    } else if (event.eventType === 'ITEM_DELETED' && event.item?.id) {
      this.removeItemLocally(event.item.id);
    } else if (event.eventType === 'RECEIPT_UPDATED' && event.item) {
      this.updateItemReceiptsLocally(event.item);
    }
  }

  private triggerTabNotification(item: ClipboardItem): void {
    if (typeof document !== 'undefined' && document.hidden) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const title = 'New Clipboard Item';
        const body = item.originalName || (item.itemType === 'LINK' ? 'New Link shared' : 'New text snippet shared');
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }

  private startReactivePollingFallback(code: string): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (this.activeShare() && this.activeShare()?.code === code) {
        this.api.getShare(code, this.receivePin || undefined).subscribe({
          next: share => {
            this.activeShare.set(share);
          },
          error: () => {}
        });
      }
    }, 4000);
  }

  private appendItemLocally(item: ClipboardItem): void {
    const current = this.activeShare();
    if (!current) return;
    if (current.items.some(i => i.id === item.id)) return;

    const updated = {
      ...current,
      items: [...current.items, item],
      totalSizeBytes: current.totalSizeBytes + (item.sizeBytes || 0)
    };
    this.activeShare.set(updated);
  }

  private removeItemLocally(itemId: string): void {
    const current = this.activeShare();
    if (!current) return;

    const filtered = current.items.filter(i => i.id !== itemId);
    const updated = {
      ...current,
      items: filtered,
      totalSizeBytes: filtered.reduce((acc, i) => acc + (i.sizeBytes || 0), 0)
    };
    this.activeShare.set(updated);
  }

  private updateItemReceiptsLocally(item: ClipboardItem): void {
    const current = this.activeShare();
    if (!current) return;

    const updatedItems = current.items.map(i => i.id === item.id ? {
      ...i,
      downloadCount: item.downloadCount,
      viewCount: item.viewCount
    } : i);

    this.activeShare.set({
      ...current,
      items: updatedItems
    });
  }

  // --- Copy, QR & Direct Links ---
  copyShareCode(): void {
    const code = this.shareCode() || this.wordCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    this.copiedCode.set(true);
    setTimeout(() => this.copiedCode.set(false), 2000);
  }

  copyDirectLink(): void {
    const code = this.shareCode();
    if (!code || typeof window === 'undefined') return;
    let url = `${window.location.origin}/#${code}`;
    if (this.e2eeEnabled() && this.encryptionKey()) {
      url += `&key=${this.encryptionKey()}`;
    }
    navigator.clipboard.writeText(url);
    this.copiedLink.set(true);
    setTimeout(() => this.copiedLink.set(false), 2000);
  }

  getDirectLinkUrl(): string {
    const code = this.shareCode() || this.activeShare()?.code;
    if (!code || typeof window === 'undefined') return '';
    let url = `${window.location.origin}/#${code}`;
    if (this.e2eeEnabled() && this.encryptionKey()) {
      url += `&key=${this.encryptionKey()}`;
    }
    return url;
  }

  getQrCodeImageUrl(): string {
    const link = encodeURIComponent(this.getDirectLinkUrl());
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${link}`;
  }

  copySnippetText(item: ClipboardItem): void {
    if (!item.textContent) return;
    navigator.clipboard.writeText(item.textContent);
    this.copiedItemId.set(item.id);
    setTimeout(() => this.copiedItemId.set(null), 2000);
  }

  openPreview(item: ClipboardItem): void {
    this.previewItem.set(item);
  }

  closePreview(): void {
    this.previewItem.set(null);
  }

  getDownloadUrl(item: ClipboardItem): string {
    const code = this.activeShare()?.code || this.shareCode()!;
    return this.api.getDownloadUrl(code, item.id, this.receivePin || undefined);
  }

  getPreviewUrl(item: ClipboardItem): string {
    const code = this.activeShare()?.code || this.shareCode()!;
    return this.api.getPreviewUrl(code, item.id, this.receivePin || undefined);
  }

  downloadZipAll(): void {
    const code = this.activeShare()?.code || this.shareCode()!;
    const url = this.api.getZipDownloadUrl(code, this.receivePin || undefined);
    window.open(url, '_blank');
  }

  submitAbuseReport(): void {
    const code = this.activeShare()?.code || this.receiveCode;
    if (!code || !this.reportReason.trim()) return;

    this.isReportingAbuse.set(true);
    this.api.reportShare(code, this.reportReason.trim()).subscribe({
      next: () => {
        this.isReportingAbuse.set(false);
        this.reportSubmitted.set(true);
        setTimeout(() => {
          this.showReportModal.set(false);
          this.reportSubmitted.set(false);
          this.reportReason = '';
        }, 2000);
      },
      error: () => {
        this.isReportingAbuse.set(false);
      }
    });
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
