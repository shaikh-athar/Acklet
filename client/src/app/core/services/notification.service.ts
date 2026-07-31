import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiResponse, PageResponse } from './tools.service';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  targetUrl?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/v1/notifications';

  private readonly _unreadCount = signal<number>(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  getNotifications(page = 0, size = 15): Observable<PageResponse<NotificationItem>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<PageResponse<NotificationItem>>>(`${this.baseUrl}`, { params }).pipe(
      map(res => res.data)
    );
  }

  fetchUnreadCount(): Observable<number> {
    return this.http.get<ApiResponse<{ count: number }>>(`${this.baseUrl}/unread-count`).pipe(
      map(res => res.data.count),
      tap(count => this._unreadCount.set(count))
    );
  }

  markAsRead(id: string): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => this._unreadCount.update(c => Math.max(0, c - 1))),
      map(() => void 0)
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => this._unreadCount.set(0)),
      map(() => void 0)
    );
  }
}
