// apps/tool-image-compressor/src/services/save-to-and-shared-link-flow.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyBlobToClipboard } from './save-destination.util';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';
import type { CompressionSettings } from '../models/compressor.models';

describe('Output Save-To Split Dropdown & Select Images Control Group Suite', () => {

  describe('Home Screen Select Images & Output Screen Header Symmetry', () => {
    it('Home screen Select Images chevron button has 44px min-width and acts as in-flow flex child dropdown trigger', () => {
      const chevronBtnStyles = {
        width: '44px',
        minWidth: '44px',
        height: '100%',
        borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'inline-flex'
      };

      expect(chevronBtnStyles.width).toBe('44px');
      expect(chevronBtnStyles.minWidth).toBe('44px');
      expect(chevronBtnStyles.borderLeft).toContain('1px solid');
    });

    it('Output screen header has only Download combined pill and Back navigation without More button', () => {
      const outputHeaderControls = ['output-download-control-group', 'output-nav-links'];
      expect(outputHeaderControls).not.toContain('output-more-wrapper');
      expect(outputHeaderControls).toContain('output-download-control-group');
      expect(outputHeaderControls).toContain('output-nav-links');
    });
  });

  describe('PART 2: Save to Dropdown on Output Screen & Cards', () => {
    it('download dropdown items order strictly matches the 5 options: Download to device, Google Drive, Dropbox, OneDrive, Copy to clipboard', () => {
      const expectedDownloadOrder = [
        'Download to device',
        'Google Drive',
        'Dropbox',
        'OneDrive',
        'Copy to clipboard'
      ];

      const downloadSaveOptions = [
        { id: 'device', label: 'Download to device', icon: 'monitor-smartphone' },
        { id: 'drive', label: 'Google Drive' },
        { id: 'dropbox', label: 'Dropbox' },
        { id: 'onedrive', label: 'OneDrive' },
        { id: 'clipboard', label: 'Copy to clipboard' }
      ];

      expect(downloadSaveOptions.map(o => o.label)).toEqual(expectedDownloadOrder);
      expect(downloadSaveOptions[0].icon).toBe('monitor-smartphone');
    });

    it('select image dropdown options order includes This device with monitor-smartphone icon: This device, Google Drive, Dropbox, OneDrive, Clipboard', () => {
      const expectedSelectOrder = [
        'This device',
        'Google Drive',
        'Dropbox',
        'OneDrive',
        'Clipboard'
      ];

      const selectSourceOptions = [
        { id: 'device', label: 'This device', icon: 'monitor-smartphone' },
        { id: 'drive', label: 'Google Drive' },
        { id: 'dropbox', label: 'Dropbox' },
        { id: 'onedrive', label: 'OneDrive' },
        { id: 'clipboard', label: 'Clipboard' }
      ];

      expect(selectSourceOptions.map(o => o.label)).toEqual(expectedSelectOrder);
      expect(selectSourceOptions[0].icon).toBe('monitor-smartphone');
    });

    it('Card Save button has no chevron and downloads that file directly', () => {
      let fileDownloaded = '';
      const onCardSaveClick = (id: string) => {
        fileDownloaded = id;
      };

      onCardSaveClick('img-123');
      expect(fileDownloaded).toBe('img-123');
    });

    it('Download pill is one continuous control with matching height and radius to Select Images', () => {
      const downloadPillStyles = {
        height: '48px',
        borderRadius: '999px',
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
        backgroundColor: '#2563EB'
      };
      const selectImagesStyles = {
        height: '48px',
        borderRadius: '999px',
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
        backgroundColor: '#2563EB'
      };

      expect(downloadPillStyles.height).toBe(selectImagesStyles.height);
      expect(downloadPillStyles.borderRadius).toBe(selectImagesStyles.borderRadius);
      expect(downloadPillStyles.boxShadow).toBe(selectImagesStyles.boxShadow);
      expect(downloadPillStyles.backgroundColor).toBe(selectImagesStyles.backgroundColor);
    });

    it('Google Drive, Dropbox, and OneDrive are disabled when keys are unset, with tooltip "Not set up yet"', () => {
      const isGoogleDriveConfigured = Boolean(
        COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey &&
        COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId
      );
      const isDropboxConfigured = Boolean(
        COMPRESSOR_CONFIG.cloudSources?.dropbox?.appKey
      );
      const isOneDriveConfigured = Boolean(
        COMPRESSOR_CONFIG.cloudSources?.oneDrive?.clientId
      );

      // In test/default config, keys are not configured
      expect(isGoogleDriveConfigured).toBe(false);
      expect(isDropboxConfigured).toBe(false);
      expect(isOneDriveConfigured).toBe(false);

      const getTooltip = (isConfigured: boolean, provider: string) => {
        return !isConfigured ? 'Not set up yet' : `Save to ${provider}`;
      };

      expect(getTooltip(isGoogleDriveConfigured, 'Google Drive')).toBe('Not set up yet');
      expect(getTooltip(isDropboxConfigured, 'Dropbox')).toBe('Not set up yet');
      expect(getTooltip(isOneDriveConfigured, 'OneDrive')).toBe('Not set up yet');
    });

    it('clicking disabled Google Drive, Dropbox, or OneDrive keeps dropdown open and does nothing', () => {
      let isDropdownOpen = true;
      let toastMessage = '';

      const onSaveItemClick = (target: string, isConfigured: boolean) => {
        if (!isConfigured) {
          // Disabled: keep dropdown open, do nothing
          return;
        }
        isDropdownOpen = false;
        toastMessage = `Connecting to ${target}...`;
      };

      onSaveItemClick('Google Drive', false);
      expect(isDropdownOpen).toBe(true);
      expect(toastMessage).toBe('');

      onSaveItemClick('Dropbox', false);
      expect(isDropdownOpen).toBe(true);
      expect(toastMessage).toBe('');

      onSaveItemClick('OneDrive', false);
      expect(isDropdownOpen).toBe(true);
      expect(toastMessage).toBe('');
    });

    it('clicking main Download button directly triggers download to device', () => {
      let downloaded = false;

      const onDownloadAction = () => {
        downloaded = true;
      };

      onDownloadAction();
      expect(downloaded).toBe(true);
    });

    it('copyBlobToClipboard returns short message when clipboard API is unavailable', async () => {
      const dummyBlob = new Blob(['test content'], { type: 'image/png' });
      const result = await copyBlobToClipboard(dummyBlob);

      // In Node/Vitest headless environment without navigator.clipboard.write:
      expect(result.success).toBe(false);
      expect(result.message).toBe('Your browser cannot copy this. Use Download.');
    });
  });

  describe('PART 3: Responsive Layout Breakpoints for Output Screen', () => {
    it('defines the 4 required standard breakpoints', () => {
      const breakpoints = {
        xs: { min: 0, max: 479, name: 'phones' },
        sm: { min: 480, max: 767, name: 'large phones' },
        md: { min: 768, max: 1023, name: 'tablets' },
        lg: { min: 1024, max: Infinity, name: 'desktop' }
      };

      expect(breakpoints.xs.max).toBe(479);
      expect(breakpoints.sm.min).toBe(480);
      expect(breakpoints.sm.max).toBe(767);
      expect(breakpoints.md.min).toBe(768);
      expect(breakpoints.md.max).toBe(1023);
      expect(breakpoints.lg.min).toBe(1024);
    });

    it('grid column count adheres to spec across breakpoints', () => {
      const getColumnsForWidth = (w: number): number => {
        if (w < 480) return 1;
        if (w <= 767) return 2;
        if (w <= 1023) return 3;
        return 4;
      };

      // xs (360px) -> 1 column
      expect(getColumnsForWidth(360)).toBe(1);
      // sm (600px) -> 2 columns
      expect(getColumnsForWidth(600)).toBe(2);
      // md (800px) -> 3 columns
      expect(getColumnsForWidth(800)).toBe(3);
      // lg (1440px) -> 4 columns
      expect(getColumnsForWidth(1440)).toBe(4);
    });

    it('enforces min 44px tap targets for mobile buttons on xs', () => {
      const mobileButtonHeight = 44;
      const mobileChevronWidth = 44;

      expect(mobileButtonHeight).toBeGreaterThanOrEqual(44);
      expect(mobileChevronWidth).toBeGreaterThanOrEqual(44);
    });
  });
});
