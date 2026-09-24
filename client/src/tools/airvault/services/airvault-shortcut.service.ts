import { Injectable, signal, computed } from '@angular/core';

export interface ShortcutDefinition {
  id: string;
  category: 'General' | 'Search' | 'Clipboard' | 'Input / Composer' | 'Preview / Review' | 'Navigation';
  description: string;
  key: string;
  metaOrCtrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  displayMac: string;
  displayWin: string;
}

@Injectable({
  providedIn: 'root'
})
export class AirVaultShortcutService {
  readonly isMac = typeof navigator !== 'undefined' && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);

  /** Central Master Shortcut Registry */
  readonly shortcuts: ShortcutDefinition[] = [
    // ── Navigation ──
    {
      id: 'shortcuts-help',
      category: 'Navigation',
      description: 'Open Keyboard Shortcuts Reference',
      key: '?',
      shift: true,
      displayMac: '?',
      displayWin: '?'
    },
    {
      id: 'close-modal',
      category: 'Navigation',
      description: 'Close Modal / Popover / Active UI',
      key: 'Escape',
      displayMac: 'Esc',
      displayWin: 'Esc'
    },

    // ── Search ──
    {
      id: 'search-focus',
      category: 'Search',
      description: 'Focus Search',
      key: 'k',
      metaOrCtrl: true,
      displayMac: '⌘ K',
      displayWin: 'Ctrl K'
    },
    {
      id: 'search-close',
      category: 'Search',
      description: 'Close / Clear Search',
      key: 'Escape',
      displayMac: 'Esc',
      displayWin: 'Esc'
    },
    {
      id: 'search-nav-next',
      category: 'Search',
      description: 'Next Search Match',
      key: 'Enter',
      displayMac: '↵',
      displayWin: 'Enter'
    },
    {
      id: 'search-nav-prev',
      category: 'Search',
      description: 'Previous Search Match',
      key: 'Enter',
      shift: true,
      displayMac: '⇧ ↵',
      displayWin: 'Shift Enter'
    },

    // ── Input & Composer ──
    {
      id: 'composer-send',
      category: 'Input / Composer',
      description: 'Send / Beam to Vault',
      key: 'Enter',
      metaOrCtrl: true,
      displayMac: '⌘ ↵',
      displayWin: 'Ctrl Enter'
    },
    {
      id: 'composer-clear',
      category: 'Input / Composer',
      description: 'Clear Composer Input / Draft',
      key: 'Escape',
      displayMac: 'Esc',
      displayWin: 'Esc'
    },

    // ── Preview / Review ──
    {
      id: 'preview-zoom-in',
      category: 'Preview / Review',
      description: 'Zoom In',
      key: '+',
      metaOrCtrl: true,
      displayMac: '⌘ +',
      displayWin: 'Ctrl +'
    },
    {
      id: 'preview-zoom-out',
      category: 'Preview / Review',
      description: 'Zoom Out',
      key: '-',
      metaOrCtrl: true,
      displayMac: '⌘ -',
      displayWin: 'Ctrl -'
    },
    {
      id: 'preview-zoom-reset',
      category: 'Preview / Review',
      description: 'Reset Zoom (100%)',
      key: '0',
      metaOrCtrl: true,
      displayMac: '⌘ 0',
      displayWin: 'Ctrl 0'
    },
    {
      id: 'preview-close',
      category: 'Preview / Review',
      description: 'Close Preview',
      key: 'Escape',
      displayMac: 'Esc',
      displayWin: 'Esc'
    }
  ];

  /** Grouped shortcuts for settings view */
  readonly groupedShortcuts = computed(() => {
    const groups: { [cat: string]: ShortcutDefinition[] } = {};
    for (const sc of this.shortcuts) {
      if (!groups[sc.category]) {
        groups[sc.category] = [];
      }
      groups[sc.category].push(sc);
    }
    return groups;
  });

  /** Categories in logical order */
  readonly categories: Array<ShortcutDefinition['category']> = [
    'Navigation',
    'Search',
    'Input / Composer',
    'Preview / Review'
  ];

  /** Format modifier display for the current user's OS */
  formatShortcut(shortcutId: string): string {
    const sc = this.shortcuts.find(s => s.id === shortcutId);
    if (!sc) return '';
    return this.isMac ? sc.displayMac : sc.displayWin;
  }

  /**
   * Helper to format a tooltip with standard shortcut suffix:
   * e.g. formatTooltip('Search', 'search-focus') -> "Search · ⌘K"
   */
  formatTooltip(label: string, shortcutId?: string): string {
    if (!shortcutId) return label;
    const keyCombo = this.formatShortcut(shortcutId);
    if (!keyCombo) return label;
    return `${label} · ${keyCombo}`;
  }

  /** Check if active element is an input, textarea, or contenteditable */
  isTypingContext(target?: EventTarget | null): boolean {
    const el = (target || (typeof document !== 'undefined' ? document.activeElement : null)) as HTMLElement | null;
    if (!el) return false;
    const tagName = (el.tagName || '').toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true' || el.closest('[contenteditable="true"]')) return true;
    return false;
  }
}
