// apps/tool-barcode-generator/src/services/share.service.ts
import { Injectable, inject } from '@angular/core';
import { BarcodeDesignOptions, FormatPerOptions } from '../models/barcode.models';
import { FormatRegistryService } from './format-registry.service';

export interface ShareData {
  format: string;
  value: string;
  name?: string;
  design?: Partial<BarcodeDesignOptions>;
  options?: FormatPerOptions;
}

export interface IShareService {
  isShareable(formatId: string): boolean;
  buildShareUrl(data: ShareData): string;
  copyShareLink(data: ShareData): Promise<boolean>;
}

export const SHARE_PRIVACY_NOTICE = 'The value is visible in the link.';

@Injectable({
  providedIn: 'root'
})
export class ShareService implements IShareService {
  private registry = inject(FormatRegistryService);

  isShareable(formatId: string): boolean {
    const item = this.registry.getFormat(formatId);
    if (!item) return false;
    return !item.isSensitive;
  }

  buildShareUrl(data: ShareData): string {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.origin + window.location.pathname);
    if (data.format) {
      url.searchParams.set('format', data.format);
    }
    if (data.value) {
      url.searchParams.set('value', data.value);
    }
    if (data.name && data.name !== 'My Barcode') {
      url.searchParams.set('name', data.name);
    }
    if (data.design) {
      if (data.design.barColor && data.design.barColor !== '#000000') {
        url.searchParams.set('barColor', data.design.barColor);
      }
      if (data.design.bgColor && data.design.bgColor !== '#FFFFFF') {
        url.searchParams.set('bgColor', data.design.bgColor);
      }
      if (data.design.transparentBg) {
        url.searchParams.set('transparentBg', '1');
      }
      if (data.design.showText === false) {
        url.searchParams.set('showText', '0');
      }
    }
    return url.toString();
  }

  async copyShareLink(data: ShareData): Promise<boolean> {
    if (!this.isShareable(data.format)) {
      return false;
    }
    const shareUrl = this.buildShareUrl(data);
    if (!shareUrl) return false;
    try {
      await navigator.clipboard.writeText(shareUrl);
      return true;
    } catch {
      return false;
    }
  }
}
