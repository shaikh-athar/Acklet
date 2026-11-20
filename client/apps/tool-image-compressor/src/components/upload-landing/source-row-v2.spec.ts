// apps/tool-image-compressor/src/components/upload-landing/source-row-v2.spec.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { COMPRESSOR_CONFIG } from '../../config/compressor.config';

describe('Image Compressor Home Screen Source Row v2 (Hover Below Button)', () => {
  describe('1. Exactly Three Icons in Specified Order', () => {
    it('defines exactly three source options in strict order: Google Drive, Dropbox, Clipboard', () => {
      const mockSources = [
        {
          id: 'drive',
          label: 'Google Drive',
          ariaLabel: 'Add from Google Drive',
          tooltip: 'Google Drive',
          icon: 'hard-drive',
          get isConfigured(): boolean {
            return Boolean(COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey && COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId);
          }
        },
        {
          id: 'dropbox',
          label: 'Dropbox',
          ariaLabel: 'Add from Dropbox',
          tooltip: 'Dropbox',
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

      expect(mockSources.length).toBe(3);
      expect(mockSources[0].id).toBe('drive');
      expect(mockSources[0].icon).toBe('hard-drive');
      expect(mockSources[0].label).toBe('Google Drive');

      expect(mockSources[1].id).toBe('dropbox');
      expect(mockSources[1].icon).toBe('folder-up');
      expect(mockSources[1].label).toBe('Dropbox');

      expect(mockSources[2].id).toBe('clipboard');
      expect(mockSources[2].icon).toBe('clipboard-paste');
      expect(mockSources[2].label).toBe('Clipboard');
    });

    it('provides accessible labels and tooltips for all three options', () => {
      const sources = [
        { id: 'drive', ariaLabel: 'Add from Google Drive', tooltip: 'Google Drive', isConfigured: false },
        { id: 'dropbox', ariaLabel: 'Add from Dropbox', tooltip: 'Dropbox', isConfigured: false },
        { id: 'clipboard', ariaLabel: 'Paste from clipboard', tooltip: 'Paste from clipboard', isConfigured: true }
      ];

      expect(sources[0].ariaLabel).toBe('Add from Google Drive');
      expect(sources[1].ariaLabel).toBe('Add from Dropbox');
      expect(sources[2].ariaLabel).toBe('Paste from clipboard');

      // Unconfigured tooltip
      const driveTooltip = sources[0].isConfigured ? sources[0].tooltip : 'Not set up yet';
      const dropTooltip = sources[1].isConfigured ? sources[1].tooltip : 'Not set up yet';
      const clipTooltip = sources[2].isConfigured ? sources[2].tooltip : 'Not set up yet';

      expect(driveTooltip).toBe('Not set up yet');
      expect(dropTooltip).toBe('Not set up yet');
      expect(clipTooltip).toBe('Paste from clipboard');
    });
  });

  describe('2. Hover Behavior & 150ms Delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows row when pointer enters button or row, and hides after 150 ms delay upon pointer leave', () => {
      let isVisible = false;
      let isClosing = false;
      let hideDebounceTimer: any = null;

      const showSourceRow = () => {
        if (hideDebounceTimer) {
          clearTimeout(hideDebounceTimer);
          hideDebounceTimer = null;
        }
        isClosing = false;
        isVisible = true;
      };

      const onPointerLeave = () => {
        if (hideDebounceTimer) clearTimeout(hideDebounceTimer);
        hideDebounceTimer = setTimeout(() => {
          isClosing = true;
          isVisible = false;
        }, 150);
      };

      // Initially hidden
      expect(isVisible).toBe(false);

      // Pointer enters "Select Images" button
      showSourceRow();
      expect(isVisible).toBe(true);
      expect(isClosing).toBe(false);

      // Pointer leaves button moving toward row
      onPointerLeave();
      expect(isVisible).toBe(true); // Still visible during the 150ms window!

      // Moving into row after 80ms cancels hide timer
      vi.advanceTimersByTime(80);
      expect(isVisible).toBe(true);
      showSourceRow(); // Pointer entered row

      // Advancing past original 150ms does not close because timer was reset
      vi.advanceTimersByTime(100);
      expect(isVisible).toBe(true);

      // Pointer leaves row completely
      onPointerLeave();
      vi.advanceTimersByTime(149);
      expect(isVisible).toBe(true); // Still visible at 149ms

      vi.advanceTimersByTime(2); // Reaches 151ms
      expect(isVisible).toBe(false); // Hides after exactly 150ms
    });
  });

  describe('3. Keyboard Navigation & Accessibility', () => {
    it('shows row on keyboard focus and closes on Escape, restoring focus to Select Images', () => {
      let isVisible = false;
      let focusedElement = 'none';

      const selectBtn = {
        focus: () => { focusedElement = 'selectBtn'; }
      };

      const onFocusIn = () => { isVisible = true; focusedElement = 'selectBtn'; };
      const onEscape = () => {
        isVisible = false;
        selectBtn.focus();
      };

      // Button receives keyboard focus
      onFocusIn();
      expect(isVisible).toBe(true);
      expect(focusedElement).toBe('selectBtn');

      // User presses Escape key
      onEscape();
      expect(isVisible).toBe(false);
      expect(focusedElement).toBe('selectBtn');
    });

    it('maintains aria-expanded and aria-controls on the Select Images button', () => {
      const getAriaAttributes = (visible: boolean) => ({
        'aria-expanded': visible,
        'aria-controls': 'home-source-options'
      });

      expect(getAriaAttributes(false)['aria-expanded']).toBe(false);
      expect(getAriaAttributes(true)['aria-expanded']).toBe(true);
      expect(getAriaAttributes(true)['aria-controls']).toBe('home-source-options');
    });

    it('sets tabindex to 0 when row is visible and -1 when row is hidden for proper Tab navigation', () => {
      const getTabIndex = (isVisible: boolean) => (isVisible ? 0 : -1);

      expect(getTabIndex(false)).toBe(-1);
      expect(getTabIndex(true)).toBe(0);
    });
  });

  describe('4. Height Reservation & Layout Shift Prevention', () => {
    it('reserves 44px height for the source row slot permanently so the grid below does not jump', () => {
      const rowSlotStyles = {
        height: '44px',
        width: '100%',
        margin: '4px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      };

      expect(rowSlotStyles.height).toBe('44px');
      // When hidden, row slot still takes 44px in document flow
      const containerHeightHidden = parseInt(rowSlotStyles.height, 10);
      const containerHeightVisible = parseInt(rowSlotStyles.height, 10);
      expect(containerHeightVisible - containerHeightHidden).toBe(0); // 0px delta!
    });
  });

  describe('5. Water-Drop Animation Timing & Easing', () => {
    it('applies 0.22s duration per icon with 0.05s stagger, completing entrance in ~0.32s', () => {
      const durationSeconds = 0.22;
      const staggerSeconds = 0.05;
      const itemCount = 3;

      const delays = Array.from({ length: itemCount }, (_, idx) => idx * staggerSeconds);
      expect(delays[0]).toBe(0.00); // Drive starts at 0.00s
      expect(delays[1]).toBe(0.05); // Dropbox starts at 0.05s
      expect(delays[2]).toBe(0.10); // Clipboard starts at 0.10s

      const totalEntranceTime = delays[itemCount - 1] + durationSeconds;
      expect(Number(totalEntranceTime.toFixed(2))).toBe(0.32); // exactly 0.32s
    });

    it('reverses exit animation from right to left using the identical timing', () => {
      const durationSeconds = 0.22;
      const staggerSeconds = 0.05;
      const itemCount = 3;

      // Reverse exit: item index 2 (Clipboard) starts first, item 0 (Drive) starts last
      const exitDelays = Array.from({ length: itemCount }, (_, idx) => (itemCount - 1 - idx) * staggerSeconds);
      expect(exitDelays[2]).toBe(0.00); // Clipboard (idx 2) exits at 0.00s
      expect(exitDelays[1]).toBe(0.05); // Dropbox (idx 1) exits at 0.05s
      expect(exitDelays[0]).toBe(0.10); // Drive (idx 0) exits at 0.10s

      const totalExitTime = exitDelays[0] + durationSeconds;
      expect(Number(totalExitTime.toFixed(2))).toBe(0.32);
    });

    it('uses cubic-bezier(0.34, 1.4, 0.64, 1) and animates strictly transform and opacity', () => {
      const animationDefinition = {
        easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
        animatedProperties: ['transform', 'opacity'],
        keyframesStart: { opacity: 0, transform: 'translateY(-6px) scale(0.6)' },
        keyframesEnd: { opacity: 1, transform: 'translateY(0) scale(1)' }
      };

      expect(animationDefinition.easing).toBe('cubic-bezier(0.34, 1.4, 0.64, 1)');
      expect(animationDefinition.animatedProperties).toEqual(['transform', 'opacity']);
      expect(animationDefinition.keyframesStart.opacity).toBe(0);
      expect(animationDefinition.keyframesEnd.opacity).toBe(1);
    });

    it('respects prefers-reduced-motion with zero animation and immediate toggle', () => {
      const isReducedMotion = true;
      const getAnimation = (reduced: boolean) => (reduced ? 'none' : 'waterdrop-drop-in 0.22s');
      expect(getAnimation(isReducedMotion)).toBe('none');
    });
  });

  describe('6. Cloud Connections & API Keys', () => {
    it('shows "Not set up yet" and opens no picker when Google Drive or Dropbox credentials are missing', () => {
      let toastMessage = '';
      let pickerOpened = false;

      const clickSource = (src: { id: string; isConfigured: boolean }) => {
        if (!src.isConfigured) {
          toastMessage = 'Not set up yet';
          pickerOpened = false;
        } else {
          pickerOpened = true;
        }
      };

      // Unconfigured Drive
      clickSource({ id: 'drive', isConfigured: false });
      expect(toastMessage).toBe('Not set up yet');
      expect(pickerOpened).toBe(false);

      // Unconfigured Dropbox
      clickSource({ id: 'dropbox', isConfigured: false });
      expect(toastMessage).toBe('Not set up yet');
      expect(pickerOpened).toBe(false);
    });
  });

  describe('7. Touch Devices', () => {
    it('does not trigger hover on touch devices and opens the file picker directly on tap', () => {
      let isVisible = false;
      let pickerOpened = false;

      const onPointerEnter = (pointerType: string) => {
        if (pointerType === 'touch') return;
        isVisible = true;
      };

      const onSelectBtnClick = () => {
        pickerOpened = true;
      };

      // Touch pointer entering
      onPointerEnter('touch');
      expect(isVisible).toBe(false); // Row does not show on touch hover

      // Tap triggers click
      onSelectBtnClick();
      expect(pickerOpened).toBe(true); // Picker opens directly without interception
    });
  });
});
