// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/dynamic-links/dynamic-links.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DynamicLinksComponent } from './dynamic-links.component';
import { SmartLinkService, LiveSmartLink } from '../../services/smart-link.service';

describe('DynamicLinksComponent (Phase 3: Dynamic Links Studio)', () => {
  let component: DynamicLinksComponent;
  let mockSmartLinkService: any;

  const sampleLinks: LiveSmartLink[] = [
    {
      code: 'abc123',
      shortUrl: 'https://acklet.link/q/abc123',
      type: 'URL',
      preview: 'https://example.com/promo-campaign',
      payload: 'https://example.com/promo-campaign',
      scanCount: 42,
      createdAt: '2026-10-20T10:00:00Z',
      expiresAt: '2027-10-20T10:00:00Z',
      lastScanAt: '2026-10-24T12:00:00Z',
      status: 'ACTIVE',
      contentBytes: 35,
      manageToken: 'tok_1'
    },
    {
      code: 'txt456',
      shortUrl: 'https://acklet.link/q/txt456',
      type: 'TEXT',
      preview: 'Important conference room wifi instructions and guidelines',
      payload: 'Important conference room wifi instructions and guidelines',
      scanCount: 150,
      createdAt: '2026-10-22T08:00:00Z',
      expiresAt: '2027-10-22T08:00:00Z',
      lastScanAt: '2026-10-24T15:30:00Z',
      status: 'DISABLED',
      contentBytes: 60,
      manageToken: 'tok_2'
    },
    {
      code: 'vcd789',
      shortUrl: 'https://acklet.link/q/vcd789',
      type: 'VCARD',
      preview: 'BEGIN:VCARD John Doe Software Architect END:VCARD',
      payload: 'BEGIN:VCARD John Doe Software Architect END:VCARD',
      scanCount: 5,
      createdAt: '2026-10-18T14:00:00Z',
      expiresAt: '2026-10-25T14:00:00Z',
      lastScanAt: null as any,
      status: 'EXPIRED',
      contentBytes: 50,
      manageToken: 'tok_3'
    }
  ];

  beforeEach(() => {
    mockSmartLinkService = {
      managedLinks: signal<LiveSmartLink[]>([...sampleLinks]),
      isFetchingSummaries: signal<boolean>(false),
      isOffline: signal<boolean>(false),
      storedLinks: signal<any[]>([...sampleLinks]),
      fetchLiveSummaries: vi.fn().mockReturnValue(of([...sampleLinks])),
      toggleLinkStatus: vi.fn().mockReturnValue(of(void 0)),
      extendLink: vi.fn().mockReturnValue(of({ expiresAt: '2028-10-20T10:00:00Z', status: 'ACTIVE' })),
      deleteLink: vi.fn().mockReturnValue(of(void 0)),
      updateLinkPayload: vi.fn().mockReturnValue(of({ code: 'abc123', contentBytes: 50 })),
      getLinkDetails: vi.fn().mockReturnValue(of({
        code: 'abc123',
        payload: 'https://example.com/promo-campaign',
        type: 'URL',
        status: 'ACTIVE'
      })),
      loadLinkIntoStudio: vi.fn()
    };

    const rootInjector = {
      get: (token: any, notFound?: any) => {
        if (token === SmartLinkService) return mockSmartLinkService;
        return notFound;
      }
    } as any;

    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new DynamicLinksComponent();
    });
  });

  it('fetches live summaries upon initialization', () => {
    component.ngOnInit();
    expect(mockSmartLinkService.fetchLiveSummaries).toHaveBeenCalledTimes(1);
    expect(component.filteredLinks().length).toBe(3);
  });

  it('filters dynamic links by search query (code, shortUrl, preview, type, or payload)', () => {
    component.searchQuery.set('wifi');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].code).toBe('txt456');

    component.searchQuery.set('abc123');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].code).toBe('abc123');

    component.searchQuery.set('nonexistent query');
    expect(component.filteredLinks().length).toBe(0);
  });

  it('filters dynamic links by content type', () => {
    component.typeFilter.set('TEXT');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].type).toBe('TEXT');

    component.typeFilter.set('VCARD');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].type).toBe('VCARD');

    component.typeFilter.set('ALL');
    expect(component.filteredLinks().length).toBe(3);
  });

  it('filters dynamic links by status', () => {
    component.statusFilter.set('ACTIVE');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].status).toBe('ACTIVE');

    component.statusFilter.set('DISABLED');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].status).toBe('DISABLED');

    component.statusFilter.set('EXPIRED');
    expect(component.filteredLinks().length).toBe(1);
    expect(component.filteredLinks()[0].status).toBe('EXPIRED');
  });

  it('sorts dynamic links by most recent or most scanned', () => {
    component.sortBy.set('recent');
    const recent = component.filteredLinks();
    expect(recent[0].code).toBe('txt456'); // Oct 22 (newest)
    expect(recent[1].code).toBe('abc123'); // Oct 20
    expect(recent[2].code).toBe('vcd789'); // Oct 18

    component.sortBy.set('scans');
    const byScans = component.filteredLinks();
    expect(byScans[0].code).toBe('txt456'); // 150 scans
    expect(byScans[1].code).toBe('abc123'); // 42 scans
    expect(byScans[2].code).toBe('vcd789'); // 5 scans
  });

  it('copies short URL to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    });

    component.copyShortUrl('https://acklet.link/q/abc123', 'abc123');
    await Promise.resolve();
    expect(writeTextMock).toHaveBeenCalledWith('https://acklet.link/q/abc123');
    expect(component.copiedCode()).toBe('abc123');
  });

  it('toggles link status via SmartLinkService', () => {
    const link = sampleLinks[0];
    component.toggleStatus(link);
    expect(mockSmartLinkService.toggleLinkStatus).toHaveBeenCalledWith('abc123');
    expect(component.toastMessage()).toContain('abc123');
  });

  it('extends link retention via SmartLinkService', () => {
    const link = sampleLinks[0];
    component.extendLink(link);
    expect(mockSmartLinkService.extendLink).toHaveBeenCalledWith('abc123');
    expect(component.toastMessage()).toContain('extended by 1 year');
  });

  it('executes delete after confirmation', () => {
    component.executeDelete('abc123');
    expect(mockSmartLinkService.deleteLink).toHaveBeenCalledWith('abc123');
    expect(component.toastMessage()).toContain('deleted');
  });

  it('opens and closes destination edit modal', () => {
    const link = sampleLinks[0];
    component.startEdit(link);
    expect(component.editingLink()).toBe(link);
    expect(component.editPayload()).toBe('https://example.com/promo-campaign');

    component.closeEditModal();
    expect(component.editingLink()).toBeNull();
    expect(component.editPayload()).toBe('');
  });

  it('saves edited destination payload via SmartLinkService', () => {
    const link = sampleLinks[0];
    component.startEdit(link);
    component.editPayload.set('https://example.com/updated-landing-page');
    component.saveEdit();

    expect(mockSmartLinkService.updateLinkPayload).toHaveBeenCalledWith(
      'abc123',
      'https://example.com/updated-landing-page',
      'URL'
    );
    expect(component.editingLink()).toBeNull();
    expect(component.toastMessage()).toContain('Destination updated');
  });

  it('emits openInGenerator with full details and loads into studio', () => {
    const emitSpy = vi.fn();
    (component.openInGenerator as any).subscribe(emitSpy);

    const link = sampleLinks[0];
    component.onOpenInGenerator(link);

    expect(mockSmartLinkService.loadLinkIntoStudio).toHaveBeenCalledWith(
      'abc123',
      'tok_1',
      'https://acklet.link/q/abc123'
    );
    expect(emitSpy).toHaveBeenCalledWith({
      code: 'abc123',
      type: 'URL',
      payload: 'https://example.com/promo-campaign',
      shortUrl: 'https://acklet.link/q/abc123'
    });
  });

  it('emits previewQr event with shortUrl', () => {
    const emitSpy = vi.fn();
    (component.previewQr as any).subscribe(emitSpy);

    const link = sampleLinks[0];
    component.previewQr.emit(link.shortUrl);
    expect(emitSpy).toHaveBeenCalledWith('https://acklet.link/q/abc123');
  });

  it('formats type labels and icons correctly', () => {
    expect(component.getTypeIcon('URL')).toBe('globe');
    expect(component.getTypeIcon('TEXT')).toBe('type');
    expect(component.getTypeIcon('VCARD')).toBe('user');
    expect(component.getTypeIcon('WIFI')).toBe('wifi');

    expect(component.formatTypeLabel('URL')).toBe('Website');
    expect(component.formatTypeLabel('TEXT')).toBe('Plain Text');
    expect(component.formatTypeLabel('VCARD')).toBe('vCard');
  });

  it('formats dates and expiry cleanly', () => {
    expect(component.formatDate('2026-10-20T10:00:00Z')).toContain('2026');
    expect(component.formatExpiry('2025-01-01T00:00:00Z')).toBe('Expired');
    expect(component.formatExpiry(undefined)).toBe('No expiration set');
  });

  it('toggles row action dropdown menu and closes on escape or document click', () => {
    const mockEvent = {
      stopPropagation: vi.fn(),
      currentTarget: null
    } as any;

    expect(component.activeDropdownCode()).toBeNull();
    component.toggleMoreMenu('abc123', mockEvent);
    expect(component.activeDropdownCode()).toBe('abc123');

    // Clicking document closes menu
    component.onDocumentClick();
    expect(component.activeDropdownCode()).toBeNull();

    // Reopen and test escape
    component.toggleMoreMenu('txt456', mockEvent);
    expect(component.activeDropdownCode()).toBe('txt456');

    component.onEscapeKey();
    expect(component.activeDropdownCode()).toBeNull();
  });

  it('calculates dropdown direction based on available vertical space', () => {
    // When space below is tight (< 210px) and space above is larger, dropUp becomes true
    const mockButton = {
      getBoundingClientRect: () => ({ top: 300, bottom: 330 }),
      closest: (sel: string) => ({
        getBoundingClientRect: () => ({ top: 50, bottom: 400 }) // spaceBelow = 400 - 330 = 70; spaceAbove = 300 - 50 = 250
      })
    } as any;

    const mockEvent = {
      stopPropagation: vi.fn(),
      currentTarget: mockButton
    } as any;

    component.toggleMoreMenu('abc123', mockEvent);
    expect(component.isDropdownUp()).toBe(true);

    // Close
    component.closeMoreMenu();
    expect(component.isDropdownUp()).toBe(false);

    // When space below is ample (> 210px), dropUp is false
    const mockButtonWithAmpleSpace = {
      getBoundingClientRect: () => ({ top: 100, bottom: 130 }),
      closest: (sel: string) => ({
        getBoundingClientRect: () => ({ top: 50, bottom: 500 }) // spaceBelow = 500 - 130 = 370
      })
    } as any;

    component.toggleMoreMenu('abc123', { stopPropagation: vi.fn(), currentTarget: mockButtonWithAmpleSpace } as any);
    expect(component.isDropdownUp()).toBe(false);
  });
});
