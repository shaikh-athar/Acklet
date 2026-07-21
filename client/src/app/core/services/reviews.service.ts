// src/app/core/services/reviews.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse, PageResponse } from './tools.service';

export interface ToolReviewRequest {
  rating: number;
  title?: string;
  body: string;
  useCase?: string;
  pros?: string[];
  cons?: string[];
}

export interface ToolReviewResponse {
  id: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  rating: number;
  title?: string;
  body: string;
  useCase?: string;
  pros?: string[];
  cons?: string[];
  isVerified: boolean;
  moderationStatus: string;
  helpfulCount: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  getReviews(toolSlug: string, page = 0, size = 10): Observable<PageResponse<ToolReviewResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<ToolReviewResponse>>>(`${this.baseUrl}/tools/${toolSlug}/reviews`, { params }).pipe(
      map(res => res.data),
      catchError(() => of({ content: [], totalElements: 0, totalPages: 0, size, number: page }))
    );
  }

  submitReview(toolSlug: string, review: ToolReviewRequest): Observable<ApiResponse<ToolReviewResponse>> {
    return this.http.post<ApiResponse<ToolReviewResponse>>(`${this.baseUrl}/tools/${toolSlug}/reviews`, review);
  }

  deleteReview(toolSlug: string, reviewId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/tools/${toolSlug}/reviews/${reviewId}`);
  }
}
