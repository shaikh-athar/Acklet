// src/app/core/services/tools.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { Tool } from '../models/tool.model';
import { Category } from '../models/category.model';
import { MOCK_TOOLS } from '../mock-data/tools.data';
import { MOCK_CATEGORIES } from '../mock-data/categories.data';

@Injectable({ providedIn: 'root' })
export class ToolsService {
  private readonly _tools = signal<Tool[]>(MOCK_TOOLS);
  private readonly _categories = signal<Category[]>(MOCK_CATEGORIES);

  readonly tools = this._tools.asReadonly();
  readonly categories = this._categories.asReadonly();

  readonly featuredTools = computed(() => this._tools().filter(t => t.isFeatured));
  readonly trendingTools = computed(() => this._tools().filter(t => t.isTrending));
  readonly newTools = computed(() => this._tools().filter(t => t.isNew));
  readonly popularTools = computed(() => this._tools().filter(t => t.isPopular));
  readonly featuredCategories = computed(() => this._categories().filter(c => c.isFeatured));

  getToolById(id: string): Tool | undefined {
    return this._tools().find(t => t.id === id);
  }

  getToolBySlug(slug: string): Tool | undefined {
    return this._tools().find(t => t.slug === slug);
  }

  getToolsByCategory(categoryId: string): Tool[] {
    return this._tools().filter(t => t.categoryId === categoryId);
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
      t.shortDescription.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.categoryName.toLowerCase().includes(q)
    );
  }

  getRelatedTools(ids: string[]): Tool[] {
    return ids.map(id => this.getToolById(id)).filter(Boolean) as Tool[];
  }

  filterTools(categoryId?: string, query?: string): Tool[] {
    let result = this._tools();
    if (categoryId) result = result.filter(t => t.categoryId === categoryId);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }
}
