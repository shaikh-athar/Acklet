// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/notes-viewer/notes-viewer.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QrNotesViewerComponent } from './notes-viewer.component';

describe('QrNotesViewerComponent', () => {
  let component: QrNotesViewerComponent;
  let mockRoute: any;
  let mockNotesService: any;

  beforeEach(() => {
    mockRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('test-code-123')
        }
      }
    };

    mockNotesService = {
      fetchNote: vi.fn().mockResolvedValue('Sample Note Content\nLine 2')
    };

    component = new QrNotesViewerComponent(mockRoute, mockNotesService);
  });

  it('loads note text from route parameter', async () => {
    component.ngOnInit();
    expect(component.isLoading()).toBe(true);
    await component.loadNote('test-code-123');

    expect(component.isLoading()).toBe(false);
    expect(component.noteText()).toBe('Sample Note Content\nLine 2');
    expect(component.noteCharCount()).toBe(26);
    expect(component.noteWordCount()).toBe(5);
    expect(component.error()).toBeNull();
  });

  it('sets error when code is missing', () => {
    mockRoute.snapshot.paramMap.get.mockReturnValue(null);
    component.ngOnInit();
    expect(component.error()).toContain('No note code was provided');
    expect(component.isLoading()).toBe(false);
  });

  it('handles fetch failure gracefully', async () => {
    mockNotesService.fetchNote.mockRejectedValue(new Error('Note has expired'));
    await component.loadNote('expired-code');
    expect(component.error()).toBe('Note has expired');
    expect(component.isLoading()).toBe(false);
  });

  it('hides Save to Notes button when navigator.share is unavailable', () => {
    const originalNavigator = global.navigator;
    try {
      (global as any).navigator = { ...originalNavigator, share: undefined };
      expect(component.canShare()).toBe(false);
    } finally {
      (global as any).navigator = originalNavigator;
    }
  });

  it('copies text and sets isCopied flag for 2 seconds', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    (global as any).navigator.clipboard = { writeText: writeTextMock };

    component.noteText.set('Copy Me');
    await component.copyText();

    expect(writeTextMock).toHaveBeenCalledWith('Copy Me');
    expect(component.isCopied()).toBe(true);
  });
});
