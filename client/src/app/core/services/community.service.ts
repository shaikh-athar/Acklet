import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PageResponse } from './tools.service';

export interface ReplyResponse {
  id: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  upvotes: number;
  createdAt: string;
}

export interface DiscussionResponse {
  id: string;
  slug: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatarUrl?: string;
  category: string;
  tags: string[];
  upvotes: number;
  viewsCount: number;
  replyCount: number;
  replies?: ReplyResponse[];
  createdAt: string;
}

export interface DiscussionRequest {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

export interface ReplyRequest {
  content: string;
}

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/community';

  getDiscussions(page = 0, size = 10): Observable<PageResponse<DiscussionResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<DiscussionResponse>>>(`${this.baseUrl}/discussions`, { params }).pipe(
      map(res => res.data)
    );
  }

  getDiscussionBySlug(slug: string): Observable<DiscussionResponse> {
    return this.http.get<ApiResponse<DiscussionResponse>>(`${this.baseUrl}/discussions/${slug}`).pipe(
      map(res => res.data)
    );
  }

  createDiscussion(req: DiscussionRequest): Observable<DiscussionResponse> {
    return this.http.post<ApiResponse<DiscussionResponse>>(`${this.baseUrl}/discussions`, req).pipe(
      map(res => res.data)
    );
  }

  deleteDiscussion(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/discussions/${id}`).pipe(
      map(() => void 0)
    );
  }

  getReplies(discussionId: string): Observable<ReplyResponse[]> {
    return this.http.get<ApiResponse<ReplyResponse[]>>(`${this.baseUrl}/discussions/${discussionId}/replies`).pipe(
      map(res => res.data)
    );
  }

  createReply(discussionId: string, req: ReplyRequest): Observable<ReplyResponse> {
    return this.http.post<ApiResponse<ReplyResponse>>(`${this.baseUrl}/discussions/${discussionId}/replies`, req).pipe(
      map(res => res.data)
    );
  }
}
