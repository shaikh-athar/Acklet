// client/apps/tool-docs/src/app/services/doc.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DocDocument,
  DocDocumentDetail,
  DocSection,
  DocTool,
  CreateDocumentPayload,
  UpdateDocumentPayload,
  CreateSectionPayload,
  UpdateSectionPayload,
  PublishDocumentPayload,
  PublicDocument,
  SaveBlocksPayload,
  MediaUploadResult,
  DocPage,
  DocumentQueryParams,
  AutosaveStatus,
  FollowStatus,
  AuthorProfile,
  BookmarkItem,
  ReadingHistoryItem,
  DocNotificationItem
} from '../models/doc.model';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class DocService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/docs';

  // State Signals
  readonly tools = signal<DocTool[]>([]);
  readonly selectedTool = signal<DocTool | null>(null);
  readonly documents = signal<DocDocument[]>([]);
  readonly docPage = signal<DocPage<DocDocument> | null>(null);
  readonly publicFeed = signal<DocDocument[]>([]);
  readonly publicFeedPage = signal<DocPage<DocDocument> | null>(null);
  readonly currentDocument = signal<DocDocumentDetail | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Autosave & Dirty State Signals
  readonly autosaveStatus = signal<AutosaveStatus>('idle');
  readonly lastSavedAt = signal<Date | null>(null);
  readonly hasUnsavedChanges = signal<boolean>(false);

  // ── Tools ───────────────────────────────────────────────────────────────────

  fetchTools(): Observable<DocTool[]> {
    this.loading.set(true);
    return this.http.get<ApiResponse<DocTool[]>>(`${this.baseUrl}/tools`).pipe(
      map(res => res.data || []),
      tap({
        next: tools => {
          this.tools.set(tools);
          if (tools.length > 0 && !this.selectedTool()) {
            this.selectedTool.set(tools[0]);
          }
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.message || 'Failed to fetch documentation tools');
          this.loading.set(false);
        }
      })
    );
  }

  selectTool(tool: DocTool): void {
    this.selectedTool.set(tool);
    this.fetchDocuments(tool.id).subscribe();
  }

  // ── Documents ───────────────────────────────────────────────────────────────

  fetchDocuments(toolIdOrParams?: string | DocumentQueryParams): Observable<DocPage<DocDocument>> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (typeof toolIdOrParams === 'string') {
      httpParams = httpParams.set('toolId', toolIdOrParams);
    } else if (toolIdOrParams) {
      if (toolIdOrParams.toolId) httpParams = httpParams.set('toolId', toolIdOrParams.toolId);
      if (toolIdOrParams.q) httpParams = httpParams.set('q', toolIdOrParams.q.trim());
      if (toolIdOrParams.status && toolIdOrParams.status !== 'ALL') httpParams = httpParams.set('status', toolIdOrParams.status);
      if (toolIdOrParams.sort) httpParams = httpParams.set('sort', toolIdOrParams.sort);
      if (toolIdOrParams.page !== undefined) httpParams = httpParams.set('page', toolIdOrParams.page.toString());
      if (toolIdOrParams.size !== undefined) httpParams = httpParams.set('size', toolIdOrParams.size.toString());
    }

    return this.http.get<ApiResponse<DocPage<DocDocument>>>(this.baseUrl, { params: httpParams }).pipe(
      map(res => res.data),
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch documents');
        this.loading.set(false);
        const fallback: DocPage<DocDocument> = {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 9,
          first: true,
          last: true,
          empty: true
        };
        return of(fallback);
      }),
      tap({
        next: page => {
          this.docPage.set(page);
          this.documents.set(page?.content || []);
          this.loading.set(false);
        }
      })
    );
  }

  fetchPublicFeed(params?: { q?: string; sort?: string; page?: number; size?: number }): Observable<DocPage<DocDocument>> {
    this.loading.set(true);
    let httpParams = new HttpParams();
    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q.trim());
      if (params.sort) httpParams = httpParams.set('sort', params.sort);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    }

    return this.http.get<ApiResponse<DocPage<DocDocument>>>(`${this.baseUrl}/public/feed`, { params: httpParams }).pipe(
      map(res => res.data),
      catchError(err => {
        this.error.set(err?.message || 'Failed to fetch community feed');
        this.loading.set(false);
        const fallback: DocPage<DocDocument> = {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 10,
          first: true,
          last: true,
          empty: true
        };
        return of(fallback);
      }),
      tap({
        next: page => {
          this.publicFeedPage.set(page);
          this.publicFeed.set(page?.content || []);
          this.loading.set(false);
        }
      })
    );
  }

  createDocument(payload: CreateDocumentPayload): Observable<DocDocumentDetail> {
    return this.http.post<ApiResponse<DocDocumentDetail>>(this.baseUrl, payload).pipe(
      map(res => res.data),
      tap(created => {
        const cur = this.documents();
        const docSummary: DocDocument = {
          id: created.id,
          toolId: created.toolId,
          toolName: created.toolName,
          title: created.title,
          status: created.status,
          ownerId: created.ownerId,
          sectionCount: created.sections?.length || 1,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt
        };
        this.documents.set([docSummary, ...cur]);
      })
    );
  }

  getDocument(docId: string): Observable<DocDocumentDetail> {
    this.loading.set(true);
    return this.http.get<ApiResponse<DocDocumentDetail>>(`${this.baseUrl}/${docId}`).pipe(
      map(res => res.data),
      tap({
        next: doc => {
          this.currentDocument.set(doc);
          this.hasUnsavedChanges.set(false);
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date(doc.updatedAt));
          this.loading.set(false);
        },
        error: err => {
          this.error.set(err.message || 'Failed to load document');
          this.loading.set(false);
        }
      })
    );
  }

  updateDocument(docId: string, payload: UpdateDocumentPayload): Observable<DocDocumentDetail> {
    this.autosaveStatus.set('saving');
    return this.http.put<ApiResponse<DocDocumentDetail>>(`${this.baseUrl}/${docId}`, payload).pipe(
      map(res => res.data),
      tap({
        next: updated => {
          this.currentDocument.set(updated);
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);

          // Update in documents list if present
          this.documents.update(list =>
            list.map(d => (d.id === docId ? { ...d, title: updated.title, status: updated.status, updatedAt: updated.updatedAt } : d))
          );
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  duplicateDocument(docId: string): Observable<DocDocumentDetail> {
    return this.http.post<ApiResponse<DocDocumentDetail>>(`${this.baseUrl}/${docId}/duplicate`, {}).pipe(
      map(res => res.data),
      tap(duplicated => {
        const docSummary: DocDocument = {
          id: duplicated.id,
          toolId: duplicated.toolId,
          toolName: duplicated.toolName,
          title: duplicated.title,
          status: duplicated.status,
          ownerId: duplicated.ownerId,
          sectionCount: duplicated.sections?.length || 0,
          createdAt: duplicated.createdAt,
          updatedAt: duplicated.updatedAt
        };
        this.documents.update(list => [docSummary, ...list]);
        const current = this.docPage();
        if (current) {
          this.docPage.set({
            ...current,
            content: [docSummary, ...current.content],
            totalElements: current.totalElements + 1
          });
        }
      })
    );
  }

  deleteDocument(docId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${docId}`).pipe(
      map(() => void 0),
      tap(() => {
        this.documents.update(list => list.filter(d => d.id !== docId));
        const current = this.docPage();
        if (current) {
          this.docPage.set({
            ...current,
            content: current.content.filter(d => d.id !== docId),
            totalElements: Math.max(0, current.totalElements - 1)
          });
        }
        if (this.currentDocument()?.id === docId) {
          this.currentDocument.set(null);
        }
      })
    );
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  createSection(docId: string, payload: CreateSectionPayload): Observable<DocSection> {
    this.autosaveStatus.set('saving');
    return this.http.post<ApiResponse<DocSection>>(`${this.baseUrl}/${docId}/sections`, payload).pipe(
      map(res => res.data),
      tap({
        next: section => {
          const doc = this.currentDocument();
          if (doc) {
            const sections = [...doc.sections, section].sort((a, b) => a.position - b.position);
            this.currentDocument.set({ ...doc, sections, updatedAt: new Date().toISOString() });
          }
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  updateSection(docId: string, sectionId: string, payload: UpdateSectionPayload): Observable<DocSection> {
    this.autosaveStatus.set('saving');
    return this.http.put<ApiResponse<DocSection>>(`${this.baseUrl}/${docId}/sections/${sectionId}`, payload).pipe(
      map(res => res.data),
      tap({
        next: updated => {
          const doc = this.currentDocument();
          if (doc) {
            const sections = doc.sections.map(s => (s.id === sectionId ? updated : s));
            this.currentDocument.set({ ...doc, sections, updatedAt: new Date().toISOString() });
          }
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  deleteSection(docId: string, sectionId: string): Observable<void> {
    this.autosaveStatus.set('saving');
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${docId}/sections/${sectionId}`).pipe(
      map(() => void 0),
      tap({
        next: () => {
          const doc = this.currentDocument();
          if (doc) {
            const remaining = doc.sections
              .filter(s => s.id !== sectionId)
              .map((s, idx) => ({ ...s, position: idx }));
            this.currentDocument.set({ ...doc, sections: remaining, updatedAt: new Date().toISOString() });
          }
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  reorderSections(docId: string, sectionIds: string[]): Observable<DocSection[]> {
    this.autosaveStatus.set('saving');
    return this.http.put<ApiResponse<DocSection[]>>(`${this.baseUrl}/${docId}/sections/reorder`, { sectionIds }).pipe(
      map(res => res.data),
      tap({
        next: reordered => {
          const doc = this.currentDocument();
          if (doc) {
            this.currentDocument.set({ ...doc, sections: reordered, updatedAt: new Date().toISOString() });
          }
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  // ── Manual State Mutations ──────────────────────────────────────────────────

  markDirty(): void {
    this.hasUnsavedChanges.set(true);
  }

  // ── Publishing & Public Operations ───────────────────────────────────────────

  publishDocument(docId: string, payload: PublishDocumentPayload): Observable<DocDocumentDetail> {
    this.autosaveStatus.set('saving');
    return this.http.post<ApiResponse<DocDocumentDetail>>(`${this.baseUrl}/${docId}/publish`, payload).pipe(
      map(res => res.data),
      tap({
        next: published => {
          this.currentDocument.set(published);
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);

          this.documents.update(list =>
            list.map(d =>
              d.id === docId
                ? {
                    ...d,
                    title: published.title,
                    slug: published.slug,
                    summary: published.summary,
                    status: published.status,
                    publishedAt: published.publishedAt,
                    updatedAt: published.updatedAt
                  }
                : d
            )
          );
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  unpublishDocument(docId: string): Observable<DocDocumentDetail> {
    this.autosaveStatus.set('saving');
    return this.http.post<ApiResponse<DocDocumentDetail>>(`${this.baseUrl}/${docId}/unpublish`, {}).pipe(
      map(res => res.data),
      tap({
        next: unpublished => {
          this.currentDocument.set(unpublished);
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);

          this.documents.update(list =>
            list.map(d =>
              d.id === docId
                ? {
                    ...d,
                    status: unpublished.status,
                    updatedAt: unpublished.updatedAt
                  }
                : d
            )
          );
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  getPublicDocument(slugOrToolSlug: string, optionalDocSlug?: string): Observable<PublicDocument> {
    const slug = optionalDocSlug ? optionalDocSlug : slugOrToolSlug;
    return this.http.get<ApiResponse<PublicDocument>>(`${this.baseUrl}/public/${slug}`).pipe(
      map(res => res.data)
    );
  }

  // ── Block Architecture & Media ──────────────────────────────────────────────

  saveBlocks(docId: string, payload: SaveBlocksPayload): Observable<DocDocumentDetail> {
    this.autosaveStatus.set('saving');
    return this.http.put<ApiResponse<DocDocumentDetail>>(`${this.baseUrl}/${docId}/blocks`, payload).pipe(
      map(res => res.data),
      tap({
        next: updated => {
          this.currentDocument.set(updated);
          this.autosaveStatus.set('saved');
          this.lastSavedAt.set(new Date());
          this.hasUnsavedChanges.set(false);

          this.documents.update(list =>
            list.map(d =>
              d.id === docId
                ? {
                    ...d,
                    title: updated.title,
                    updatedAt: updated.updatedAt
                  }
                : d
            )
          );
        },
        error: () => {
          this.autosaveStatus.set('error');
        }
      })
    );
  }

  uploadImage(docId: string, file: File): Observable<MediaUploadResult> {
    if (!docId || !docId.trim()) {
      return throwError(() => new Error('Draft document not created yet'));
    }
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<MediaUploadResult>>(`${this.baseUrl}/${encodeURIComponent(docId.trim())}/media/image`, formData).pipe(
      map(res => res.data)
    );
  }

  uploadVideo(docId: string, file: File): Observable<MediaUploadResult> {
    if (!docId || !docId.trim()) {
      return throwError(() => new Error('Draft document not created yet'));
    }
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<MediaUploadResult>>(`${this.baseUrl}/${encodeURIComponent(docId.trim())}/media/video`, formData).pipe(
      map(res => res.data)
    );
  }

  // ── Community Engagement: Following, Bookmarks, History, Notifications ─────

  followAuthor(authorId: string): Observable<FollowStatus> {
    return this.http.post<ApiResponse<FollowStatus>>(`${this.baseUrl}/authors/${authorId}/follow`, {}).pipe(
      map(res => res.data)
    );
  }

  unfollowAuthor(authorId: string): Observable<FollowStatus> {
    return this.http.delete<ApiResponse<FollowStatus>>(`${this.baseUrl}/authors/${authorId}/follow`).pipe(
      map(res => res.data)
    );
  }

  getFollowStatus(authorId: string): Observable<FollowStatus> {
    return this.http.get<ApiResponse<FollowStatus>>(`${this.baseUrl}/authors/${authorId}/follow-status`).pipe(
      map(res => res.data)
    );
  }

  listFollowing(): Observable<AuthorProfile[]> {
    return this.http.get<ApiResponse<AuthorProfile[]>>(`${this.baseUrl}/following`).pipe(
      map(res => res.data || [])
    );
  }

  toggleBookmark(docId: string): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${docId}/bookmark`, {}).pipe(
      map(res => res.data)
    );
  }

  isBookmarked(docId: string): Observable<boolean> {
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/${docId}/bookmark`).pipe(
      map(res => res.data)
    );
  }

  listBookmarks(page = 0, size = 15): Observable<DocPage<BookmarkItem>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<DocPage<BookmarkItem>>>(`${this.baseUrl}/bookmarks`, { params }).pipe(
      map(res => res.data)
    );
  }

  recordRead(slug: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/public/${slug}/read`, {}).pipe(
      map(() => void 0)
    );
  }

  listReadingHistory(page = 0, size = 20): Observable<DocPage<ReadingHistoryItem>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<DocPage<ReadingHistoryItem>>>(`${this.baseUrl}/history`, { params }).pipe(
      map(res => res.data)
    );
  }

  clearReadingHistory(): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/history`).pipe(
      map(() => void 0)
    );
  }

  listNotifications(page = 0, size = 20): Observable<DocPage<DocNotificationItem>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<ApiResponse<DocPage<DocNotificationItem>>>(`${this.baseUrl}/notifications`, { params }).pipe(
      map(res => res.data)
    );
  }

  getUnreadNotificationCount(): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/notifications/unread-count`).pipe(
      map(res => res.data || 0)
    );
  }

  markNotificationRead(id: string): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/notifications/${id}/read`, {}).pipe(
      map(() => void 0)
    );
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/notifications/read-all`, {}).pipe(
      map(() => void 0)
    );
  }

  getAuthorProfile(authorId: string): Observable<AuthorProfile> {
    return this.http.get<ApiResponse<AuthorProfile>>(`${this.baseUrl}/authors/${authorId}`).pipe(
      map(res => res.data)
    );
  }

  getAuthorProfileByUsername(username: string): Observable<AuthorProfile> {
    return this.http.get<ApiResponse<AuthorProfile>>(`${this.baseUrl}/authors/username/${username}`).pipe(
      map(res => res.data)
    );
  }
}
