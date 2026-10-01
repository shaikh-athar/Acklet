// src/app/core/services/tools.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Tool } from '../models/tool.model';
import { Category } from '../models/category.model';
import { MOCK_TOOLS } from '../mock-data/tools.data';
import { MOCK_CATEGORIES } from '../mock-data/categories.data';
import { TOOL_REGISTRY } from '../tool-registry';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  private readonly _tools = signal<Tool[]>(
    MOCK_TOOLS.map(t => {
      const reg = TOOL_REGISTRY[t.slug];
      if (reg) {
        return {
          ...t,
          name: reg.name,
          description: reg.description,
          shortDescription: reg.shortDescription,
          version: reg.version,
          features: reg.features || t.features,
          icon: reg.icon || t.icon,
          color: reg.theme?.accent || t.color
        };
      }
      return t;
    })
  );
  private readonly _categories = signal<Category[]>(MOCK_CATEGORIES);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly tools = this._tools.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly featuredTools = computed(() => this._tools().filter(t => t.isFeatured));
  readonly trendingTools = computed(() => this._tools().filter(t => t.isTrending));
  readonly newTools = computed(() => this._tools().filter(t => t.isNew));
  readonly popularTools = computed(() => this._tools().filter(t => t.isPopular || (t.usageCount && t.usageCount > 100)));
  readonly featuredCategories = computed(() => this._categories().filter(c => c.isFeatured));

  constructor() {
    this.loadCategories();
    this.loadFeaturedTools();
  }

  loadCategories(): void {
    this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/categories`).pipe(
      map(res => res.data || []),
      tap(cats => {
        if (cats.length > 0) this._categories.set(cats);
      }),
      catchError(() => of(MOCK_CATEGORIES))
    ).subscribe();
  }

  loadFeaturedTools(): void {
    this._loading.set(true);
    this.http.get<ApiResponse<Tool[]>>(`${this.baseUrl}/tools/featured`).pipe(
      map(res => (res.data || []).map(this.mapBackendTool)),
      tap(tools => {
        if (tools.length > 0) {
          this.mergeTools(tools);
        }
        this._loading.set(false);
      }),
      catchError(() => {
        this._loading.set(false);
        return of(MOCK_TOOLS);
      })
    ).subscribe();
  }

  getToolsApi(query?: string, categorySlug?: string, mode = 'HYBRID', page = 0, size = 12): Observable<PageResponse<Tool>> {
    this._loading.set(true);
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (query) params = params.set('q', query);
    if (categorySlug) params = params.set('category', categorySlug);
    if (mode) params = params.set('mode', mode);

    return this.http.get<ApiResponse<PageResponse<Tool>>>(`${this.baseUrl}/tools/search`, { params }).pipe(
      map(res => {
        const pageData = res.data;
        const mappedContent = (pageData?.content || []).map(this.mapBackendTool);
        if (mappedContent.length > 0) {
          this.mergeTools(mappedContent);
          this._loading.set(false);
          return {
            content: mappedContent,
            totalElements: pageData?.totalElements || mappedContent.length,
            totalPages: pageData?.totalPages || Math.ceil(mappedContent.length / size) || 1,
            size: pageData?.size || size,
            number: pageData?.number || page
          };
        }

        // Graceful fallback to client-side data when backend returns empty content
        const filtered = this.filterToolsLocally(categorySlug, query);
        const startIndex = page * size;
        const pagedContent = filtered.slice(startIndex, startIndex + size);
        this._loading.set(false);
        return {
          content: pagedContent,
          totalElements: filtered.length,
          totalPages: Math.ceil(filtered.length / size) || 1,
          size: size,
          number: page
        };
      }),
      catchError(() => {
        this._loading.set(false);
        const filtered = this.filterToolsLocally(categorySlug, query);
        const startIndex = page * size;
        const pagedContent = filtered.slice(startIndex, startIndex + size);
        return of({
          content: pagedContent,
          totalElements: filtered.length,
          totalPages: Math.ceil(filtered.length / size) || 1,
          size: size,
          number: page
        });
      })
    );
  }

  getToolBySlug(slug: string): Observable<Tool | undefined> {
    return this.http.get<ApiResponse<Tool>>(`${this.baseUrl}/tools/${slug}`).pipe(
      map(res => res.data ? this.mapBackendTool(res.data) : undefined),
      catchError(() => of(this._tools().find(t => t.slug === slug)))
    );
  }

  getToolById(id: string): Tool | undefined {
    return this._tools().find(t => t.id === id || t.slug === id);
  }

  getToolsByCategory(categoryId: string): Tool[] {
    const cat = this.getCategoryById(categoryId) || this.getCategoryBySlug(categoryId);
    const targetId = cat ? cat.id : categoryId;
    const targetSlug = cat ? cat.slug : categoryId;
    const targetName = cat ? cat.name.toLowerCase() : categoryId.toLowerCase();

    return this._tools().filter(t =>
      t.categoryId === targetId ||
      t.categoryId === targetSlug ||
      t.categoryId === categoryId ||
      (t.categoryName && t.categoryName.toLowerCase() === targetName) ||
      (t.categoryName && cat && t.categoryName.toLowerCase() === cat.name.toLowerCase())
    );
  }

  getCategoryById(id: string): Category | undefined {
    return this._categories().find(c => c.id === id);
  }

  getCategoryBySlug(slug: string): Category | undefined {
    return this._categories().find(c => c.slug === slug);
  }

  searchTools(query: string): Tool[] {
    const q = query.toLowerCase().trim();
    if (!q) return this._tools();
    return this._tools().filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.shortDescription && t.shortDescription.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(q))
    );
  }

  getRelatedTools(ids: string[]): Tool[] {
    return ids.map(id => this.getToolById(id)).filter(Boolean) as Tool[];
  }

  filterTools(categoryId?: string, query?: string): Tool[] {
    return this.filterToolsLocally(categoryId, query);
  }

  private filterToolsLocally(categoryId?: string, query?: string): Tool[] {
    let result = this._tools();
    if (categoryId) {
      const cat = this.getCategoryById(categoryId) || this.getCategoryBySlug(categoryId);
      const targetId = cat ? cat.id : categoryId;
      const targetSlug = cat ? cat.slug : categoryId;
      const targetName = cat ? cat.name.toLowerCase() : categoryId.toLowerCase();

      result = result.filter(t =>
        t.categoryId === targetId ||
        t.categoryId === targetSlug ||
        t.categoryId === categoryId ||
        t.slug === categoryId ||
        (t.categoryName && t.categoryName.toLowerCase() === targetName) ||
        (t.categoryName && cat && t.categoryName.toLowerCase() === cat.name.toLowerCase())
      );
    }
    if (query) {
      const q = query.toLowerCase().trim();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.shortDescription && t.shortDescription.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (t.categoryName && t.categoryName.toLowerCase().includes(q))
      );
    }
    return result;
  }

  private mergeTools(newTools: Tool[]): void {
    const current = this._tools();
    const map = new Map(current.map(t => [t.slug || t.id, t]));
    newTools.forEach(t => map.set(t.slug || t.id, { ...map.get(t.slug || t.id), ...t }));
    this._tools.set(Array.from(map.values()));
  }

  private mapBackendTool(bTool: any): Tool {
    return {
      id: bTool.id,
      name: bTool.name,
      slug: bTool.slug,
      categoryId: bTool.categoryId || 'developer-tools',
      categoryName: bTool.categoryName || 'Developer Tools',
      shortDescription: bTool.tagline || bTool.description || 'Developer utility tool',
      description: bTool.description || bTool.tagline || '',
      tagline: bTool.tagline,
      websiteUrl: bTool.websiteUrl || bTool.url,
      githubUrl: bTool.githubUrl,
      logoUrl: bTool.logoUrl || bTool.icon,
      coverUrl: bTool.coverUrl,
      pricingType: bTool.pricingType || 'FREE',
      isOpenSource: bTool.isOpenSource ?? false,
      status: bTool.status || 'ACTIVE',
      verificationStatus: bTool.verificationStatus || 'COMMUNITY',
      upvoteCount: bTool.upvoteCount || 0,
      usageCount: bTool.usageCount || 0,
      isFeatured: bTool.isFeatured ?? false,
      isTrending: bTool.isTrending ?? false,
      isNew: bTool.isNew ?? false,
      isPopular: (bTool.usageCount && bTool.usageCount > 50) ?? false,
      icon: bTool.icon || bTool.logoUrl || 'code',
      version: bTool.version || '1.0.0',
      author: bTool.author || 'Acklet Community',
      tags: bTool.tags || ['developer', 'tool']
    };
  }
}
