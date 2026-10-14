// apps/tool-online-clipboard/src/clipboard.copy.ts

export const CLIPBOARD_COPY = {
  header: {
    title: 'Your clipboard',
    subtitle: 'Share this code or scan the QR on another device.'
  },
  identity: {
    codeLabel: 'Link to this clipboard',
    copyCode: 'Copy',
    copyLink: 'Copy link',
    copied: 'Copied',
    newClipboard: 'New clipboard',
    confirmNew: 'Start a new clipboard? Any unsaved edits will be lost.',
    statusLive: 'Live',
    statusReconnecting: 'Reconnecting...',
    privateChip: 'Private',
    qrTitle: 'Scan this QR code',
    qrButton: 'QR',
    qrScanHint: 'Scan with your camera or another device to open this clipboard instantly.',
    joinPlaceholder: 'Have a code?',
    joinButton: 'Open',
    openAnother: 'Open another',
    errorInvalidCode: "That code doesn't match any clipboard.",
    errorExpiredCode: 'This clipboard has expired.',
    errorTooLarge: 'File is over the 200 MB limit.',
    settings: 'Settings',
    history: 'History'
  },
  tabs: {
    text: 'Text & Links',
    files: 'Files',
    allChip: 'All',
    imagesChip: 'Images',
    filesChip: 'Files'
  },
  textTab: {
    placeholder: 'Paste or type anything. Everyone on this clipboard sees it.',
    copy: 'Copy',
    refresh: 'Refresh',
    save: 'Save',
    clear: 'Clear',
    allSaved: 'All changes saved',
    unsaved: 'Unsaved changes',
    savedJustNow: 'Saved just now',
    savedRelative: (timeStr: string) => `Saved ${timeStr}`,
    remoteUpdateBanner: 'Updated on another device.',
    refreshToSee: 'Refresh to see it',
    limitHint: '1 MB max',
    openLink: 'Open link',
    toastCopied: 'Copied',
    toastClearedUndo: 'Cleared. Undo',
    toastSaved: 'Saved'
  },
  filesTab: {
    filterButton: 'Filter',
    filterActiveDot: 'Filters active',
    viewGrid: 'Grid view',
    viewList: 'List view',
    searchPlaceholder: 'Search files',
    addButton: 'Add',
    addFromDevice: 'From your device',
    addPasteClipboard: 'Paste from clipboard',
    sortButton: 'Sort',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortNameAZ: 'Name A-Z',
    sortLargest: 'Largest',
    dropOverlay: 'Drop to add',
    emptyTitle: 'Drop files here',
    emptySubtitle: 'Images, documents, anything up to 200 MB.',
    emptyAddButton: 'Add files',
    noMatchesTitle: 'No matches',
    noMatchesSubtitle: 'Try a different search or clear the filters.',
    clearFilters: 'Clear filters',
    filterSections: {
      fileType: 'File type',
      addedBy: 'Added by'
    },
    filterCategories: {
      images: 'Images',
      documents: 'Documents',
      spreadsheets: 'Spreadsheets',
      presentations: 'Presentations',
      pdfs: 'PDFs',
      videos: 'Videos',
      audio: 'Audio',
      archives: 'Archives',
      code: 'Code and text',
      other: 'Other'
    },
    filterSources: {
      uploaded: 'Uploaded',
      pasted: 'Pasted'
    },
    selectionBar: {
      selectedCount: (n: number) => `${n} selected`,
      primaryDownload: 'Download',
      delete: 'Delete',
      selectAll: 'Select all',
      copyLink: 'Copy link',
      clearSelection: 'Clear selection'
    },
    toastDeletedUndo: 'Deleted. Undo',
    lightbox: {
      download: 'Download',
      prev: 'Previous',
      next: 'Next',
      close: 'Close'
    },
    detailsSheet: {
      title: 'File details',
      download: 'Download',
      close: 'Close',
      nameLabel: 'Name',
      sizeLabel: 'Size',
      typeLabel: 'Type',
      addedLabel: 'Added'
    }
  },
  settingsModal: {
    title: 'Clipboard Settings',
    privateModeTitle: 'Private Mode',
    privateModeDesc: 'Do not save clipboards in device history.',
    e2eeTitle: 'End-to-End Encryption',
    e2eeDesc: 'Encrypt text and files in your browser with AES-GCM before sending.',
    done: 'Done'
  },
  historyDrawer: {
    title: 'Recent Clipboards',
    empty: 'No recent clipboards on this device.',
    clearAll: 'Clear history',
    close: 'Close'
  }
} as const;
