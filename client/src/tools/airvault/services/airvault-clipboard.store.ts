import { Injectable, signal, computed, inject } from '@angular/core';
import { AirVaultStorageService, AirVaultItem } from './airvault-storage.service';
import { AirVaultClipboardService, ClassifiedContent } from './airvault-clipboard.service';

export type FilterTab = 'all' | 'pinned' | 'batch' | 'code' | 'url' | 'image' | 'file' | 'markdown' | 'text';

@Injectable({
  providedIn: 'root'
})
export class AirVaultClipboardStore {
  private storage = inject(AirVaultStorageService);
  private clipboard = inject(AirVaultClipboardService);

  // State Signals
  readonly items = this.storage.items;
  readonly searchQuery = signal<string>('');
  readonly activeTab = signal<FilterTab>('all');
  readonly isDragging = signal<boolean>(false);
  readonly stagedText = signal<string>('');
  readonly stagedClassification = signal<ClassifiedContent | null>(null);
  readonly autoCaptureEnabled = this.clipboard.autoCaptureEnabled;

  // Filter Tabs definition
  readonly filterTabs: { id: FilterTab; label: string; icon: string }[] = [
    { id: 'all', label: 'All Items', icon: 'layers' },
    { id: 'pinned', label: 'Pinned', icon: 'pin' },
    { id: 'batch', label: 'Multi-Resource', icon: 'layers' },
    { id: 'code', label: 'Code', icon: 'code' },
    { id: 'markdown', label: 'Markdown', icon: 'file-text' },
    { id: 'url', label: 'Links', icon: 'link' },
    { id: 'image', label: 'Images', icon: 'image' },
    { id: 'file', label: 'Files', icon: 'file-text' },
    { id: 'text', label: 'Text', icon: 'align-left' }
  ];

  // Computed
  readonly filteredItems = computed(() => {
    let list = this.items();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(i =>
        i.content.raw.toLowerCase().includes(query) ||
        i.senderDeviceName.toLowerCase().includes(query) ||
        (i.content.language && i.content.language.toLowerCase().includes(query)) ||
        (i.content.filename && i.content.filename.toLowerCase().includes(query))
      );
    }

    const tab = this.activeTab();
    if (tab === 'pinned') return list.filter(i => i.isPinned);
    if (tab === 'batch') return list.filter(i => !!i.isBatchParent || i.content.category === 'batch');
    if (tab !== 'all') {
      return list.filter(i => {
        if (i.content.category === tab) return true;
        if (i.isBatchParent && i.batchFiles && i.batchFiles.length > 0) {
          return i.batchFiles.some(sub => sub.content?.category === tab);
        }
        return false;
      });
    }

    return list;
  });

  readonly latestItem = computed(() => {
    const list = this.items();
    return list.length > 0 ? list[0] : null;
  });

  readonly tabCounts = computed(() => {
    const all = this.items();
    return {
      all: all.length,
      pinned: all.filter(i => i.isPinned).length,
      batch: all.filter(i => !!i.isBatchParent || i.content.category === 'batch').length,
      code: all.filter(i => i.content.category === 'code' || (i.isBatchParent && i.batchFiles?.some(s => s.content?.category === 'code'))).length,
      markdown: all.filter(i => i.content.category === 'markdown' || (i.isBatchParent && i.batchFiles?.some(s => s.content?.category === 'markdown'))).length,
      url: all.filter(i => i.content.category === 'url' || (i.isBatchParent && i.batchFiles?.some(s => s.content?.category === 'url'))).length,
      image: all.filter(i => i.content.category === 'image' || (i.isBatchParent && i.batchFiles?.some(s => s.content?.category === 'image'))).length,
      file: all.filter(i => i.content.category === 'file' || (i.isBatchParent && i.batchFiles?.some(s => s.content?.category === 'file'))).length,
      text: all.filter(i => i.content.category === 'text').length
    };
  });

  // Actions
  setSearchQuery(query: string) {
    this.searchQuery.set(query);
  }

  setActiveTab(tab: FilterTab) {
    this.activeTab.set(tab);
  }

  setStagedText(text: string) {
    this.stagedText.set(text);
    if (text.trim()) {
      this.stagedClassification.set(this.clipboard.classify(text));
    } else {
      this.stagedClassification.set(null);
    }
  }

  clearStaged() {
    this.stagedText.set('');
    this.stagedClassification.set(null);
  }

  togglePin(id: string) {
    this.storage.togglePin(id);
  }

  toggleReveal(id: string) {
    this.storage.toggleReveal(id);
  }

  deleteItem(id: string) {
    this.storage.deleteItem(id);
  }

  clearAll() {
    this.storage.clearAll();
  }

  toggleAutoCapture() {
    this.clipboard.toggleAutoCapture();
  }
}
