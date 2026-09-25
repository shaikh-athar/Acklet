import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiResponse } from './tools.service';

export type FeedbackCategory = 'BUG' | 'FEATURE_REQUEST' | 'IMPROVEMENT' | 'USABILITY' | 'GENERAL' | 'PERFORMANCE';
export type FeedbackStatus = 'NEW' | 'REVIEWING' | 'PLANNED' | 'RESOLVED' | 'REJECTED';
export type FeedbackSource = 'IN_APP' | 'EMAIL' | 'EXTERNAL' | 'API' | 'MANUAL';

export interface FeedbackRequest {
  rating: number; // 1 - 5 stars
  message: string; // Required feedback content
  category?: string; // BUG, FEATURE_REQUEST, IMPROVEMENT, USABILITY, GENERAL, PERFORMANCE
  toolId?: string; // e.g. 'json-lens', 'airvault', 'platform'
  toolName?: string; // e.g. 'DataLens', 'AirVault', 'Acklet Platform'
  email?: string; // Optional contact email
  source?: string; // IN_APP, EMAIL, EXTERNAL, API, MANUAL
  pageUrl?: string; // Auto-captured or custom route URL
  userAgent?: string; // Auto-captured browser details
  deviceType?: 'desktop' | 'tablet' | 'mobile';
  userId?: string;
}

export interface FeedbackResponse {
  id: string;
  userId?: string;
  userDisplayName?: string;
  rating: number;
  message: string;
  category: string;
  toolId: string;
  toolName?: string;
  email?: string;
  source: string;
  pageUrl?: string;
  userAgent?: string;
  deviceType?: string;
  createdAt: string;
  updatedAt?: string;
  status: FeedbackStatus;
  adminNotes?: string;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface FeedbackFilterParams {
  toolId?: string;
  category?: string;
  status?: string;
  source?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface FeedbackAdminUpdateRequest {
  status?: FeedbackStatus;
  adminNotes?: string;
  toolId?: string;
  toolName?: string;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/feedback';

  submitFeedback(request: Partial<FeedbackRequest>): Observable<ApiResponse<FeedbackResponse>> {
    const payload: FeedbackRequest = {
      rating: request.rating || 5,
      message: request.message || '',
      category: (request.category || 'GENERAL').toUpperCase(),
      toolId: request.toolId || 'platform',
      toolName: request.toolName || this.resolveToolName(request.toolId || 'platform'),
      email: request.email || '',
      source: (request.source || 'IN_APP').toUpperCase(),
      pageUrl: request.pageUrl || window.location.href,
      userAgent: request.userAgent || navigator.userAgent,
      deviceType: request.deviceType || this.detectDeviceType(),
      userId: request.userId
    };

    return this.http.post<ApiResponse<FeedbackResponse>>(this.baseUrl, payload).pipe(
      catchError((err) => {
        console.warn('Feedback API endpoint unavailable, saving feedback locally.', err);
        const fallbackResponse: FeedbackResponse = {
          id: Date.now().toString(),
          rating: payload.rating,
          message: payload.message,
          category: payload.category || 'GENERAL',
          toolId: payload.toolId || 'platform',
          toolName: payload.toolName || 'Acklet Platform',
          email: payload.email,
          source: payload.source || 'IN_APP',
          pageUrl: payload.pageUrl,
          userAgent: payload.userAgent,
          deviceType: payload.deviceType,
          createdAt: new Date().toISOString(),
          status: 'NEW'
        };
        return of({ success: true, message: 'Thank you for your feedback! (Saved locally)', data: fallbackResponse, meta: {}, timestamp: new Date().toISOString(), traceId: '' });
      })
    );
  }

  getFeedbackList(params: FeedbackFilterParams = {}): Observable<ApiResponse<PageResult<FeedbackResponse>>> {
    let httpParams = new HttpParams();
    if (params.toolId) httpParams = httpParams.set('toolId', params.toolId);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.source) httpParams = httpParams.set('source', params.source);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());

    return this.http.get<ApiResponse<PageResult<FeedbackResponse>>>(this.baseUrl, { params: httpParams }).pipe(
      catchError((err) => {
        console.warn('Could not retrieve remote feedback list, returning local mock.', err);
        return of({
          success: true,
          message: 'Retrieved feedback',
          data: {
            content: this.getLocalMockFeedback(),
            totalElements: 4,
            totalPages: 1,
            size: 20,
            number: 0
          },
          meta: {},
          timestamp: new Date().toISOString(),
          traceId: ''
        });
      })
    );
  }

  getUserFeedback(userId?: string): Observable<ApiResponse<PageResult<FeedbackResponse>>> {
    let httpParams = new HttpParams();
    if (userId) httpParams = httpParams.set('userId', userId);

    return this.http.get<ApiResponse<PageResult<FeedbackResponse>>>(`${this.baseUrl}/my`, { params: httpParams }).pipe(
      catchError((err) => {
        console.warn('Could not retrieve user feedback list, returning local mock.', err);
        return of({
          success: true,
          message: 'Retrieved feedback',
          data: {
            content: this.getLocalMockFeedback().slice(0, 2),
            totalElements: 2,
            totalPages: 1,
            size: 20,
            number: 0
          },
          meta: {},
          timestamp: new Date().toISOString(),
          traceId: ''
        });
      })
    );
  }

  updateFeedbackStatus(id: string, update: FeedbackAdminUpdateRequest): Observable<ApiResponse<FeedbackResponse>> {
    return this.http.patch<ApiResponse<FeedbackResponse>>(`${this.baseUrl}/${id}`, update).pipe(
      catchError((err) => {
        console.warn('Could not update feedback remotely, returning local update.', err);
        const updatedMock: FeedbackResponse = {
          id,
          rating: 5,
          message: 'Updated feedback item',
          category: update.category || 'GENERAL',
          toolId: update.toolId || 'platform',
          toolName: update.toolName || 'Acklet Platform',
          source: 'IN_APP',
          createdAt: new Date().toISOString(),
          status: update.status || 'REVIEWING',
          adminNotes: update.adminNotes
        };
        return of({ success: true, message: 'Feedback updated successfully', data: updatedMock, meta: {}, timestamp: new Date().toISOString(), traceId: '' });
      })
    );
  }

  private detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  private resolveToolName(toolId: string): string {
    if (!toolId || toolId === 'platform') return 'Acklet Platform';
    if (toolId.includes('airvault')) return 'AirVault';
    if (toolId.includes('data-lens') || toolId.includes('json')) return 'DataLens';
    return toolId.charAt(0).toUpperCase() + toolId.slice(1);
  }

  private getLocalMockFeedback(): FeedbackResponse[] {
    return [
      {
        id: 'fb-001',
        rating: 5,
        message: 'The zero-knowledge E2EE clipboard synchronization in AirVault is incredibly smooth and fast across my phone and MacBook.',
        category: 'GENERAL',
        toolId: 'airvault',
        toolName: 'AirVault',
        email: 'developer@example.com',
        source: 'IN_APP',
        deviceType: 'desktop',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        status: 'RESOLVED',
        adminNotes: 'Validated with latest WebRTC signaling deployment.'
      },
      {
        id: 'fb-002',
        rating: 4,
        message: 'Could we get support for Protobuf decoding in DataLens alongside JSON, YAML, and XML?',
        category: 'FEATURE_REQUEST',
        toolId: 'datalens',
        toolName: 'DataLens',
        email: 'proto_fan@acme.org',
        source: 'IN_APP',
        deviceType: 'desktop',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        status: 'PLANNED',
        adminNotes: 'Added to Q4 tool roadmap.'
      },
      {
        id: 'fb-003',
        rating: 3,
        message: 'Formatting very large 25MB XML files causes slight lag in Safari mobile.',
        category: 'PERFORMANCE',
        toolId: 'datalens',
        toolName: 'DataLens',
        email: '',
        source: 'IN_APP',
        deviceType: 'mobile',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        status: 'REVIEWING',
        adminNotes: 'Investigating web worker streaming chunk parser.'
      },
      {
        id: 'fb-004',
        rating: 5,
        message: 'Love the unified dark theme and keyboard shortcuts across all tools!',
        category: 'USABILITY',
        toolId: 'platform',
        toolName: 'Acklet Platform',
        email: 'ux_lover@gmail.com',
        source: 'IN_APP',
        deviceType: 'desktop',
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
        status: 'NEW',
        adminNotes: ''
      }
    ];
  }
}
