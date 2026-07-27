import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PageResponse } from './tools.service';

export interface ArticleResponse {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  coverImageUrl?: string;
  category: string;
  readTimeMinutes: number;
  tags: string[];
  publishedAt: string;
}

export interface ArticleRequest {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  category: string;
  tags?: string[];
  coverImageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/blog';

  getArticles(page = 0, size = 10): Observable<PageResponse<ArticleResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<ArticleResponse>>>(`${this.baseUrl}`, { params }).pipe(
      map(res => res.data)
    );
  }

  getArticleBySlug(slug: string): Observable<ArticleResponse> {
    return this.http.get<ApiResponse<ArticleResponse>>(`${this.baseUrl}/${slug}`).pipe(
      map(res => res.data)
    );
  }

  createArticle(req: ArticleRequest): Observable<ArticleResponse> {
    return this.http.post<ApiResponse<ArticleResponse>>(`${this.baseUrl}`, req).pipe(
      map(res => res.data)
    );
  }
}
