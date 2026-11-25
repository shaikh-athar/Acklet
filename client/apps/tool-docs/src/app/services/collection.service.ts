// client/apps/tool-docs/src/app/services/collection.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  CollectionItem,
  CreateCollectionPayload,
  UpdateCollectionPayload
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
export class CollectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/collections';

  readonly collections = signal<CollectionItem[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly totalElements = signal<number>(0);

  getMyCollections(
    query = '',
    status = 'ALL',
    page = 0,
    size = 12
  ): Observable<ApiResponse<DocPage<CollectionItem>>> {
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

    return this.http.get<ApiResponse<DocPage<CollectionItem>>>(`${this.baseUrl}/me`, { params }).pipe(
      tap({
        next: (res) => {
          this.loading.set(false);
          if (res.data?.content) {
            this.collections.set(res.data.content);
            this.totalElements.set(res.data.totalElements || 0);
          } else {
            this.collections.set([]);
            this.totalElements.set(0);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Failed to load collections');
        }
      })
    );
  }

  getCollection(id: string): Observable<ApiResponse<CollectionItem>> {
    return this.http.get<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}`);
  }

  getPublicCollectionBySlug(slug: string): Observable<ApiResponse<CollectionItem>> {
    return this.http.get<ApiResponse<CollectionItem>>(`${this.baseUrl}/public/slug/${slug}`);
  }

  createCollection(payload: CreateCollectionPayload): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(this.baseUrl, payload);
  }

  updateCollection(id: string, payload: UpdateCollectionPayload): Observable<ApiResponse<CollectionItem>> {
    return this.http.put<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}`, payload);
  }

  duplicateCollection(id: string): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}/duplicate`, {});
  }

  publishCollection(id: string): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}/publish`, {});
  }

  unpublishCollection(id: string): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}/unpublish`, {});
  }

  archiveCollection(id: string): Observable<ApiResponse<CollectionItem>> {
    return this.http.post<ApiResponse<CollectionItem>>(`${this.baseUrl}/${id}/archive`, {});
  }

  deleteCollection(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
