// client/apps/tool-docs/src/app/services/tool-management.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  ToolItem,
  CategoryItem,
  CreateToolPayload,
  UpdateToolPayload
} from '../models/content-management.model';
import { DocPage } from '../models/doc.model';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ToolManagementService {
  private readonly http = inject(HttpClient);
  private readonly publisherUrl = '/api/v1/publisher/tools';
  private readonly publicToolsUrl = '/api/v1/tools';
  private readonly categoriesUrl = '/api/v1/categories';

  readonly tools = signal<ToolItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly totalElements = signal<number>(0);
  readonly categories = signal<CategoryItem[]>([]);

  getMyTools(
    query = '',
    status = 'ALL',
    page = 0,
    size = 12
  ): Observable<ApiResponse<DocPage<ToolItem>>> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (query && query.trim()) {
      params = params.set('q', query.trim());
    }
    if (status && status !== 'ALL') {
      params = params.set('status', status.trim());
    }

    return this.http.get<ApiResponse<DocPage<ToolItem>>>(this.publisherUrl, { params }).pipe(
      tap({
        next: (res) => {
          this.loading.set(false);
          if (res.data?.content) {
            this.tools.set(res.data.content);
            this.totalElements.set(res.data.totalElements || 0);
          } else {
            this.tools.set([]);
            this.totalElements.set(0);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Failed to load tools');
        }
      })
    );
  }

  getToolBySlug(slug: string): Observable<ApiResponse<ToolItem>> {
    return this.http.get<ApiResponse<ToolItem>>(`${this.publicToolsUrl}/${slug}`);
  }

  createTool(payload: CreateToolPayload): Observable<ApiResponse<ToolItem>> {
    return this.http.post<ApiResponse<ToolItem>>(this.publisherUrl, payload);
  }

  updateTool(slug: string, payload: UpdateToolPayload): Observable<ApiResponse<ToolItem>> {
    return this.http.put<ApiResponse<ToolItem>>(`${this.publisherUrl}/${slug}`, payload);
  }

  duplicateTool(slug: string): Observable<ApiResponse<ToolItem>> {
    return this.http.post<ApiResponse<ToolItem>>(`${this.publisherUrl}/${slug}/duplicate`, {});
  }

  submitTool(slug: string): Observable<ApiResponse<ToolItem>> {
    return this.http.post<ApiResponse<ToolItem>>(`${this.publisherUrl}/${slug}/submit`, {});
  }

  unpublishTool(slug: string): Observable<ApiResponse<ToolItem>> {
    return this.http.post<ApiResponse<ToolItem>>(`${this.publisherUrl}/${slug}/unpublish`, {});
  }

  archiveTool(slug: string): Observable<ApiResponse<ToolItem>> {
    return this.http.post<ApiResponse<ToolItem>>(`${this.publisherUrl}/${slug}/archive`, {});
  }

  deleteTool(slug: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.publisherUrl}/${slug}`);
  }

  loadCategories(): Observable<ApiResponse<CategoryItem[]>> {
    return this.http.get<ApiResponse<CategoryItem[]>>(this.categoriesUrl).pipe(
      tap({
        next: (res) => {
          if (res.data) {
            this.categories.set(res.data);
          }
        }
      })
    );
  }

  searchCatalogTools(query = ''): Observable<ApiResponse<DocPage<ToolItem>>> {
    let params = new HttpParams().set('size', '30');
    if (query && query.trim()) {
      params = params.set('q', query.trim());
    }
    return this.http.get<ApiResponse<DocPage<ToolItem>>>(this.publicToolsUrl, { params });
  }
}
