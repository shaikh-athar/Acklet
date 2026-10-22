// @vitest-environment jsdom
import '@angular/compiler';
// client/apps/tool-qr-generator/src/components/landing-viewer/landing-viewer.component.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { QrLandingViewerComponent } from './landing-viewer.component';
import { QrDynamicService } from '../../services/qr-dynamic.service';
import { QrPublicInfoDto } from '../../models/qr-generator.models';

describe('QrLandingViewerComponent', () => {
  let component: QrLandingViewerComponent;
  let mockDynamicService: Partial<Record<keyof QrDynamicService, ReturnType<typeof vi.fn>>>;
  let mockRoute: {
    snapshot: {
      paramMap: { get: ReturnType<typeof vi.fn> };
      queryParams: Record<string, string>;
    };
  };
  let mockSanitizer: { bypassSecurityTrustResourceUrl: ReturnType<typeof vi.fn> };

  const mockPdfInfo: QrPublicInfoDto = {
    code: 'doc123',
    type: 'DYNAMIC_PDF',
    title: 'Product Whitepaper',
    hasPassword: false,
    status: 'ACTIVE',
    contentJson: JSON.stringify({
      documentTitle: 'Product Whitepaper 2026',
      description: 'Comprehensive technical architecture'
    }),
    assets: [{
      id: 'asset-1',
      fileName: 'whitepaper.pdf',
      detectedMime: 'application/pdf',
      sizeBytes: 2048576,
      downloadUrl: '/api/v1/qr/public/doc123/assets/asset-1',
      createdAt: new Date().toISOString()
    }]
  };

  const mockMenuInfo: QrPublicInfoDto = {
    code: 'cafe99',
    type: 'DYNAMIC_MENU',
    title: 'Artisan Cafe',
    hasPassword: false,
    status: 'ACTIVE',
    contentJson: JSON.stringify({
      restaurantName: 'Artisan Cafe & Bakery',
      tagline: 'Freshly roasted coffee & organic pastries',
      currency: '$',
      sections: [{
        category: 'Hot Beverages',
        items: [{
          name: 'Single Origin Espresso',
          price: '3.50',
          description: 'Ethiopian Yirgacheffe with floral notes',
          dietary: ['vegan']
        }]
      }]
    })
  };

  const mockCouponInfo: QrPublicInfoDto = {
    code: 'promo50',
    type: 'DYNAMIC_COUPON',
    title: 'Summer Sale',
    hasPassword: false,
    status: 'ACTIVE',
    contentJson: JSON.stringify({
      title: 'Summer Flash Sale',
      discountText: '30% OFF',
      couponCode: 'SUMMER30',
      validUntil: '2026-08-31',
      terms: 'Valid on orders over $50'
    })
  };

  beforeEach(() => {
    mockDynamicService = {
      getPublicInfo: vi.fn(),
      verifyPassword: vi.fn()
    };

    mockRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('doc123')
        },
        queryParams: {}
      }
    };

    mockSanitizer = {
      bypassSecurityTrustResourceUrl: vi.fn((url: string) => url)
    };
  });

  function createComponent(routeOverride = mockRoute, serviceOverride = mockDynamicService): QrLandingViewerComponent {
    return new QrLandingViewerComponent(
      routeOverride as unknown as ActivatedRoute,
      serviceOverride as unknown as QrDynamicService,
      mockSanitizer as unknown as DomSanitizer
    );
  }

  it('detects paused query parameter on init', () => {
    mockRoute.snapshot.queryParams = { paused: 'true' };
    component = createComponent();
    component.ngOnInit();

    expect(component.isPaused()).toBe(true);
    expect(component.isLoading()).toBe(false);
  });

  it('detects expired query parameter on init', () => {
    mockRoute.snapshot.queryParams = { expired: 'true' };
    component = createComponent();
    component.ngOnInit();

    expect(component.isExpired()).toBe(true);
    expect(component.isLoading()).toBe(false);
  });

  it('loads public metadata for PDF and computes pdfContent and primaryAsset', async () => {
    mockDynamicService.getPublicInfo?.mockResolvedValue(mockPdfInfo);
    component = createComponent();
    component.ngOnInit();

    await component.loadPublicMetadata('doc123');

    expect(component.info()).toEqual(mockPdfInfo);
    expect(component.pdfContent().documentTitle).toBe('Product Whitepaper 2026');
    expect(component.primaryAsset()?.fileName).toBe('whitepaper.pdf');
    expect(component.formatBytes(2048576)).toBe('2 MB');
  });

  it('parses digital menu content correctly', async () => {
    mockDynamicService.getPublicInfo?.mockResolvedValue(mockMenuInfo);
    component = createComponent();
    component.ngOnInit();

    await component.loadPublicMetadata('cafe99');

    expect(component.menuContent().restaurantName).toBe('Artisan Cafe & Bakery');
    expect(component.menuContent().sections.length).toBe(1);
    expect(component.menuContent().sections[0].items[0].name).toBe('Single Origin Espresso');
  });

  it('parses coupon content and copies code', async () => {
    mockDynamicService.getPublicInfo?.mockResolvedValue(mockCouponInfo);
    component = createComponent();
    component.ngOnInit();

    await component.loadPublicMetadata('promo50');

    expect(component.couponContent().discountText).toBe('30% OFF');
    expect(component.couponContent().couponCode).toBe('SUMMER30');
  });

  it('opens password gate if hasPassword is true and content is masked', async () => {
    const protectedInfo: QrPublicInfoDto = {
      code: 'vault1',
      type: 'DYNAMIC_PDF',
      title: 'Secret Doc',
      hasPassword: true,
      status: 'ACTIVE'
    };

    mockDynamicService.getPublicInfo?.mockResolvedValue(protectedInfo);
    component = createComponent();
    component.ngOnInit();

    await component.loadPublicMetadata('vault1');

    expect(component.isPasswordGateOpen()).toBe(true);
  });

  it('submits password and unlocks content', async () => {
    mockDynamicService.verifyPassword?.mockResolvedValue(mockPdfInfo);
    component = createComponent();
    component.code.set('vault1');
    component.passwordInput.set('secretPass');
    component.isPasswordGateOpen.set(true);

    await component.submitPassword();

    expect(mockDynamicService.verifyPassword).toHaveBeenCalledWith('vault1', 'secretPass');
    expect(component.isPasswordGateOpen()).toBe(false);
    expect(component.info()?.title).toBe('Product Whitepaper');
  });
});
