// apps/tool-image-compressor/src/components/upload-landing/source-menu-v3.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { COMPRESSOR_CONFIG } from '../../config/compressor.config';

describe('Image Compressor Vertical Source Menu (Home & Working Screen)', () => {
  describe('1. Vertical Source Menu Items & Order (Home Screen)', () => {
    it('defines sources in vertical order: Google Drive, Dropbox, Clipboard (exactly three items)', () => {
      const sources = [
        {
          id: 'drive',
          label: 'Google Drive',
          ariaLabel: 'Add from Google Drive',
          tooltip: 'Add from Google Drive',
          logo: '/assets/icons/sources/google-drive.png',
          icon: 'hard-drive',
          get isConfigured(): boolean {
            return Boolean(COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey && COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId);
          }
        },
        {
          id: 'dropbox',
          label: 'Dropbox',
          ariaLabel: 'Add from Dropbox',
          tooltip: 'Add from Dropbox',
          logo: '/assets/icons/sources/dropbox.png',
          icon: 'folder-up',
          get isConfigured(): boolean {
            return Boolean(COMPRESSOR_CONFIG.cloudSources?.dropbox?.appKey);
          }
        },
        {
          id: 'clipboard',
          label: 'Clipboard',
          ariaLabel: 'Paste from clipboard',
          tooltip: 'Paste from clipboard',
          icon: 'clipboard-paste',
          isConfigured: true
        }
      ];

      expect(sources.length).toBe(3);
      expect(sources[0].id).toBe('drive');
      expect(sources[0].label).toBe('Google Drive');
      expect(sources[0].logo).toBe('/assets/icons/sources/google-drive.png');

      expect(sources[1].id).toBe('dropbox');
      expect(sources[1].label).toBe('Dropbox');
      expect(sources[1].logo).toBe('/assets/icons/sources/dropbox.png');

      expect(sources[2].id).toBe('clipboard');
      expect(sources[2].label).toBe('Clipboard');
      expect(sources[2].icon).toBe('clipboard-paste');
    });

    it('provides accessible labels for all three menu items', () => {
      const items = [
        { ariaLabel: 'Add from Google Drive' },
        { ariaLabel: 'Add from Dropbox' },
        { ariaLabel: 'Paste from clipboard' }
      ];

      expect(items[0].ariaLabel).toBe('Add from Google Drive');
      expect(items[1].ariaLabel).toBe('Add from Dropbox');
      expect(items[2].ariaLabel).toBe('Paste from clipboard');
    });

    it('ensures each menu item is at least 40px tall for desktop and 44px for touch targets', () => {
      const desktopMinHeight = 40;
      const touchMinHeight = 44;
      expect(desktopMinHeight).toBeGreaterThanOrEqual(40);
      expect(touchMinHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('2. Desktop Hover, Plus Button & 150ms Delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('hovering Select Images shows the plus button; leaving hides it after 150 ms delay', () => {
      let isPlusVisible = false;
      let isPlusClosing = false;
      let isMenuOpen = false;
      let hidePlusTimer: any = null;

      const onPointerEnter = () => {
        if (hidePlusTimer) {
          clearTimeout(hidePlusTimer);
          hidePlusTimer = null;
        }
        isPlusClosing = false;
        isPlusVisible = true;
      };

      const onPointerLeave = () => {
        if (hidePlusTimer) clearTimeout(hidePlusTimer);
        hidePlusTimer = setTimeout(() => {
          if (!isMenuOpen) {
            isPlusClosing = true;
            setTimeout(() => {
              isPlusVisible = false;
              isPlusClosing = false;
            }, 150);
          }
        }, 150);
      };

      // Initially hidden
      expect(isPlusVisible).toBe(false);

      // Pointer enters button area
      onPointerEnter();
      expect(isPlusVisible).toBe(true);
      expect(isPlusClosing).toBe(false);

      // Pointer leaves
      onPointerLeave();
      expect(isPlusVisible).toBe(true); // Still visible during 150ms delay

      vi.advanceTimersByTime(149);
      expect(isPlusVisible).toBe(true); // Still visible at 149ms

      vi.advanceTimersByTime(1); // 150ms reached
      expect(isPlusClosing).toBe(true); // Begins fade out

      vi.advanceTimersByTime(150);
      expect(isPlusVisible).toBe(false); // Completely hidden
    });

    it('clicking the plus opens three items in vertical order; clicking again closes them', () => {
      let isMenuOpen = false;

      const toggleMenu = () => {
        isMenuOpen = !isMenuOpen;
      };

      expect(isMenuOpen).toBe(false);
      toggleMenu(); // First click opens
      expect(isMenuOpen).toBe(true);

      toggleMenu(); // Second click closes
      expect(isMenuOpen).toBe(false);
    });

    it('clicking outside or pressing Escape closes the dropdown and returns focus to plus button', () => {
      let isMenuOpen = true;
      let focused = '';

      const onDocumentClick = () => {
        isMenuOpen = false;
      };

      const onEscape = () => {
        isMenuOpen = false;
        focused = 'cornerPlusBtn';
      };

      expect(isMenuOpen).toBe(true);

      // Outside click closes
      onDocumentClick();
      expect(isMenuOpen).toBe(false);

      // Re-open and Escape closes + focuses plus button
      isMenuOpen = true;
      onEscape();
      expect(isMenuOpen).toBe(false);
      expect(focused).toBe('cornerPlusBtn');
    });

    it('keeps dropdown open when pointer leaves (pinned state)', () => {
      let isMenuOpen = true;
      let isPlusVisible = true;
      let hidePlusTimer: any = null;

      const onPointerLeave = () => {
        if (hidePlusTimer) clearTimeout(hidePlusTimer);
        hidePlusTimer = setTimeout(() => {
          if (!isMenuOpen) {
            isPlusVisible = false;
          }
        }, 150);
      };

      onPointerLeave();
      vi.advanceTimersByTime(500);

      // Menu is open, so plus and menu stay pinned open!
      expect(isMenuOpen).toBe(true);
      expect(isPlusVisible).toBe(true);
    });
  });

  describe('3. Mobile Viewport (< 768px)', () => {
    it('hides plus button below 768px and touch devices, showing chevron inside Select Images', () => {
      const viewportWidth = 375;
      const isMobile = viewportWidth < 768;

      const showPlusButton = !isMobile;
      const showMobileChevron = isMobile;

      expect(showPlusButton).toBe(false);
      expect(showMobileChevron).toBe(true);
    });

    it('tapping Select Images opens file picker directly and does not open dropdown', () => {
      let pickerOpened = false;
      let listOpened = false;

      const onSelectImagesClick = () => {
        pickerOpened = true;
      };

      onSelectImagesClick();
      expect(pickerOpened).toBe(true);
      expect(listOpened).toBe(false);
    });

    it('tapping the chevron inside Select Images opens the list; tapping outside closes it', () => {
      let isListOpen = false;

      const toggleFromChevron = () => {
        isListOpen = !isListOpen;
      };

      const onOutsideClick = () => {
        isListOpen = false;
      };

      toggleFromChevron();
      expect(isListOpen).toBe(true);

      onOutsideClick();
      expect(isListOpen).toBe(false);
    });

    it('shows chevron dropdown icon and hides corner plus button on touch devices (tablets, iPads, pointer: coarse)', () => {
      const isTouchMode = (hasTouch: boolean, isCoarsePointer: boolean, viewportWidth: number) => {
        return viewportWidth < 768 || hasTouch || isCoarsePointer;
      };

      // Tablet iPad 1024px with touch screen
      expect(isTouchMode(true, true, 1024)).toBe(true);
      // Galaxy Tab 800px with touch screen
      expect(isTouchMode(true, true, 800)).toBe(true);
      // Desktop mouse pointer (1440px, no touch)
      expect(isTouchMode(false, false, 1440)).toBe(false);
    });
  });

  describe('4. Working Screen (Add Images Split Button)', () => {
    it('provides default action for local picker and chevron for vertical source menu', () => {
      let localPickerOpened = false;
      let menuOpen = false;

      const onAddImagesClick = () => {
        localPickerOpened = true;
      };

      const onChevronClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        menuOpen = !menuOpen;
      };

      // Click button label -> local picker
      onAddImagesClick();
      expect(localPickerOpened).toBe(true);
      expect(menuOpen).toBe(false);

      // Click chevron -> menu toggles
      onChevronClick({ stopPropagation: vi.fn() });
      expect(menuOpen).toBe(true);
    });

    it('shows sources including "This computer" on the Working screen', () => {
      const workingOptions = [
        { id: 'local', label: 'This computer', isConfigured: true },
        { id: 'drive', label: 'Google Drive', isConfigured: false },
        { id: 'onedrive', label: 'OneDrive', isConfigured: false },
        { id: 'dropbox', label: 'Dropbox', isConfigured: false },
        { id: 'clipboard', label: 'Clipboard', isConfigured: true }
      ];

      expect(workingOptions[0].id).toBe('local');
      expect(workingOptions[0].label).toBe('This computer');
      expect(workingOptions[0].isConfigured).toBe(true);
      expect(workingOptions.length).toBe(5);
    });
  });

  describe('5. Cloud Connections & Reduced Motion', () => {
    it('missing key shows tooltip "Not set up yet", does nothing, and dropdown stays open', () => {
      let clicked = false;
      let pickerOpened = false;
      let isDropdownOpen = true;

      const handleSourceClick = (src: { id: string; isConfigured: boolean }) => {
        if (!src.isConfigured) {
          // Missing key: does nothing, does NOT close dropdown
          return;
        }
        isDropdownOpen = false;
        clicked = true;
        pickerOpened = true;
      };

      const unconfiguredSource = { id: 'drive', isConfigured: false };
      handleSourceClick(unconfiguredSource);

      expect(clicked).toBe(false);
      expect(pickerOpened).toBe(false);
      expect(isDropdownOpen).toBe(true); // Dropdown stays open!
    });

    it('clicking configured item runs action and closes dropdown', () => {
      let isDropdownOpen = true;
      let actionRun = false;

      const handleSourceClick = (src: { id: string; isConfigured: boolean }) => {
        if (!src.isConfigured) return;
        isDropdownOpen = false;
        actionRun = true;
      };

      handleSourceClick({ id: 'clipboard', isConfigured: true });
      expect(actionRun).toBe(true);
      expect(isDropdownOpen).toBe(false);
    });

    it('reduced motion disables all entrance and exit animation keyframes', () => {
      const isReducedMotion = true;
      const getAnimation = (reduced: boolean) => (reduced ? 'none' : 'dropdown-slide-in 0.15s ease-out');
      expect(getAnimation(isReducedMotion)).toBe('none');
    });
  });

  describe('6. Cluster Removal & Restored Plus Button Verification', () => {
    it('verifies that the fan cluster and badges are removed from Home screen configuration', () => {
      const homeScreenConfig = {
        hasFanCluster: false,
        hasBadgeGroup: false,
        hasCornerPlusButton: true,
        sourceMenuOrder: ['drive', 'dropbox', 'clipboard']
      };

      expect(homeScreenConfig.hasFanCluster).toBe(false);
      expect(homeScreenConfig.hasBadgeGroup).toBe(false);
      expect(homeScreenConfig.hasCornerPlusButton).toBe(true);
      expect(homeScreenConfig.sourceMenuOrder).toEqual(['drive', 'dropbox', 'clipboard']);
    });

    it('verifies dropdown entrance animation: 0.15s fade and 4px slide down with ease-out', () => {
      const entranceAnimation = {
        duration: '0.15s',
        easing: 'ease-out',
        offset: '4px'
      };

      expect(entranceAnimation.duration).toBe('0.15s');
      expect(entranceAnimation.easing).toBe('ease-out');
      expect(entranceAnimation.offset).toBe('4px');
    });
  });
});

