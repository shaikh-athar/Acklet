// src/app/core/services/publisher.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PageResponse } from './tools.service';
import { Tool } from '../models/tool.model';

export interface CreateToolRequest {
  name: string;
  slug?: string;
  tagline: string;
  description: string;
  categorySlug: string;
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  pricingType?: string;
  isOpenSource?: boolean;
}

export interface PublisherStats {
  totalTools: number;
}

@Injectable({ providedIn: 'root' })
export class PublisherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/publisher';

  becomePublisher(): Observable<ApiResponse<Record<string, string>>> {
    return this.http.post<ApiResponse<Record<string, string>>>(`${this.baseUrl}/become`, {});
  }

  getDashboard(): Observable<PublisherStats> {
    return this.http.get<ApiResponse<PublisherStats>>(`${this.baseUrl}/dashboard`).pipe(
      map(res => res.data)
    );
  }

  getMyTools(page = 0, size = 10): Observable<PageResponse<Tool>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<Tool>>>(`${this.baseUrl}/tools`, { params }).pipe(
      map(res => res.data)
    );
  }

  createTool(req: CreateToolRequest): Observable<Tool> {
    return this.http.post<ApiResponse<Tool>>(`${this.baseUrl}/tools`, req).pipe(
      map(res => res.data)
    );
  }

  updateTool(slug: string, req: Partial<CreateToolRequest>): Observable<Tool> {
    return this.http.put<ApiResponse<Tool>>(`${this.baseUrl}/tools/${slug}`, req).pipe(
      map(res => res.data)
    );
  }

  submitTool(slug: string): Observable<Tool> {
    return this.http.post<ApiResponse<Tool>>(`${this.baseUrl}/tools/${slug}/submit`, {}).pipe(
      map(res => res.data)
    );
  }

  archiveTool(slug: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/tools/${slug}`).pipe(
      map(() => void 0)
    );
  }
}
