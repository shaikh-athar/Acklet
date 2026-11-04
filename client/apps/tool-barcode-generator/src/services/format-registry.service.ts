// apps/tool-barcode-generator/src/services/format-registry.service.ts
import { Injectable } from '@angular/core';
import { BarcodeCatalogItem, BarcodeCategory } from '../models/barcode.models';
import {
  BARCODE_CATALOG,
  BARCODE_CATEGORIES,
  POPULAR_FORMAT_IDS,
  BARCODE_SYSTEM_LIMITS
} from '../config/barcode-catalog.config';

export interface IFormatRegistryService {
  getFormat(idOrSlug: string): BarcodeCatalogItem | undefined;
  getAll(): BarcodeCatalogItem[];
  getEnabled(): BarcodeCatalogItem[];
  getCategories(): BarcodeCategory[];
  getByCategory(category: BarcodeCategory): BarcodeCatalogItem[];
  getPopular(): BarcodeCatalogItem[];
  getRecent(): BarcodeCatalogItem[];
  addRecent(id: string): void;
  search(query: string): BarcodeCatalogItem[];
}

const RECENT_KEY = 'acklet:barcode:recent-formats';

@Injectable({
  providedIn: 'root'
})
export class FormatRegistryService implements IFormatRegistryService {
  getFormat(idOrSlug: string): BarcodeCatalogItem | undefined {
    if (!idOrSlug) return undefined;
    const normalized = idOrSlug.toLowerCase().trim();
    if (BARCODE_CATALOG[normalized]) {
      return BARCODE_CATALOG[normalized];
    }
    return Object.values(BARCODE_CATALOG).find(
      f => f.slug.toLowerCase() === normalized || f.id.toLowerCase() === normalized
    );
  }

  getAll(): BarcodeCatalogItem[] {
    return Object.values(BARCODE_CATALOG);
  }

  getTemporaryFormats(): BarcodeCatalogItem[] {
    const order = ['qrcode', 'datamatrix', 'aztec', 'pdf417', 'code128'];
    return order
      .map(id => BARCODE_CATALOG[id])
      .filter((f): f is BarcodeCatalogItem => !!f && !!f.supportsTemporary);
  }

  getEnabled(): BarcodeCatalogItem[] {
    return Object.values(BARCODE_CATALOG).filter(f => f.enabled);
  }

  getCategories(): BarcodeCategory[] {
    const enabled = this.getEnabled();
    const categoriesWithFormats = new Set(enabled.map(f => f.category));
    return BARCODE_CATEGORIES.filter(cat => {
      if (cat === 'Popular') return true;
      return categoriesWithFormats.has(cat);
    });
  }

  getByCategory(category: BarcodeCategory): BarcodeCatalogItem[] {
    if (category === 'Popular') {
      return this.getPopular();
    }
    return this.getEnabled().filter(f => f.category === category);
  }

  getPopular(): BarcodeCatalogItem[] {
    return POPULAR_FORMAT_IDS
      .map(id => BARCODE_CATALOG[id])
      .filter((f): f is BarcodeCatalogItem => !!f && f.enabled);
  }

  getRecent(): BarcodeCatalogItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const ids: string[] = JSON.parse(raw);
      return ids
        .map(id => BARCODE_CATALOG[id])
        .filter((f): f is BarcodeCatalogItem => !!f && f.enabled)
        .slice(0, BARCODE_SYSTEM_LIMITS.maxRecentFormats);
    } catch {
      return [];
    }
  }

  addRecent(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getRecent().map(f => f.id);
      const filtered = current.filter(item => item !== id);
      filtered.unshift(id);
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify(filtered.slice(0, BARCODE_SYSTEM_LIMITS.maxRecentFormats))
      );
    } catch {
      // Storage unavailable or disabled
    }
  }

  search(query: string): BarcodeCatalogItem[] {
    const q = query.toLowerCase().trim();
    if (!q) {
      return this.getPopular();
    }
    return this.getEnabled().filter(f => {
      if (f.label.toLowerCase().includes(q)) return true;
      if (f.slug.toLowerCase().includes(q)) return true;
      if (f.description.toLowerCase().includes(q)) return true;
      if (f.standardRef.toLowerCase().includes(q)) return true;
      if (f.aliases.some(alias => alias.toLowerCase().includes(q))) return true;
      if (f.usePageContent.commonUses.toLowerCase().includes(q)) return true;
      return false;
    });
  }
}
