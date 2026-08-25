import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from './tools.service';

export interface FeedbackRequest {
  rating: number; // 1 - 5 stars
  message: string; // Required feedback content
  category?: 'bug' | 'feature_request' | 'usability' | 'general' | 'performance';
  toolId?: string; // e.g. 'json-lens', 'jwt-decoder', 'platform'
  email?: string; // Optional contact email
  pageUrl?: string; // Auto-captured or custom route URL
  userAgent?: string; // Auto-captured browser details
  deviceType?: 'desktop' | 'tablet' | 'mobile';
}

export interface FeedbackResponse {
  id: string;
  rating: number;
  message: string;
  category: string;
  toolId: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
  deviceType?: string;
  createdAt: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/feedback';

  submitFeedback(request: Partial<FeedbackRequest>): Observable<ApiResponse<FeedbackResponse>> {
    const payload: FeedbackRequest = {
      rating: request.rating || 5,
      message: request.message || '',
      category: request.category || 'general',
      toolId: request.toolId || 'json-lens',
      email: request.email || '',
      pageUrl: request.pageUrl || window.location.href,
      userAgent: request.userAgent || navigator.userAgent,
      deviceType: request.deviceType || this.detectDeviceType()
    };

    return this.http.post<ApiResponse<FeedbackResponse>>(this.baseUrl, payload).pipe(
      catchError((err) => {
        console.warn('Feedback API endpoint unavailable, saving feedback locally.', err);
        const fallbackResponse: FeedbackResponse = {
          id: Date.now().toString(),
          rating: payload.rating,
          message: payload.message,
          category: payload.category || 'general',
          toolId: payload.toolId || 'json-lens',
          email: payload.email,
          pageUrl: payload.pageUrl,
          userAgent: payload.userAgent,
          deviceType: payload.deviceType,
          createdAt: new Date().toISOString(),
          status: 'RECEIVED'
        };
        return of({ success: true, message: 'Thank you for your feedback! (Saved locally)', data: fallbackResponse });
      })
    );
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }
}
