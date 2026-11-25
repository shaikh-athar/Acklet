// client/apps/tool-docs/src/app/pages/dashboard/docs-dashboard.component.ts

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DocService } from '../../services/doc.service';
import { DocDocument, DocStatus, DocSort, DocumentQueryParams } from '../../models/doc.model';

@Component({
  selector: 'app-docs-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-app docs-page docs-page--stories">
      <div class="docs-stories-workspace">
        <!-- ── Writer Workspace Header ───────────────────────────────────── -->
        <div class="docs-stories-workspace__header">
          <div class="docs-stories-workspace__titles">
            <h1 class="docs-stories-workspace__title">
              Your Stories
            </h1>
            <p class="docs-stories-workspace__desc">
              Manage your technical drafts, review published guides, and track your documentation history.
            </p>
          </div>
          <div>
            <a
              routerLink="/new"
              class="docs-button docs-button--primary docs-button--sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Story</span>
            </a>
          </div>
        </div>

        <!-- ── Search & Filter Controls Toolbar ──────────────────────────── -->
        <div class="docs-toolbar">
          <!-- Search Box -->
          <div class="docs-toolbar__search">
            <div class="docs-search-input-box">
              <span class="docs-search-input-box__icon">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" stroke-width="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" />
                </svg>
              </span>
              <input
                type="text"
                class="docs-search-input-box__input"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchInput($event)"
                placeholder="Search documents by title or summary..."
                aria-label="Search documents"
              />
              @if (searchQuery.trim().length > 0) {
                <button
                  type="button"
                  class="docs-search-input-box__clear"
                  (click)="clearSearch()"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              }
            </div>
          </div>

          <!-- Filters & Sort Actions -->
          <div class="docs-toolbar__controls">
            <!-- Filter Segmented Control -->
            <div
              class="docs-segmented-control"
              role="group"
              aria-label="Filter documents by status"
            >
              <button
                type="button"
                class="docs-segmented-control__button"
                [class.docs-segmented-control__button--active]="statusFilter() === 'ALL'"
                (click)="setStatusFilter('ALL')"
              >
                All
              </button>
              <button
                type="button"
                class="docs-segmented-control__button"
                [class.docs-segmented-control__button--active]="statusFilter() === 'DRAFT'"
                (click)="setStatusFilter('DRAFT')"
              >
                Draft
              </button>
              <button
                type="button"
                class="docs-segmented-control__button"
                [class.docs-segmented-control__button--active]="statusFilter() === 'PUBLISHED'"
                (click)="setStatusFilter('PUBLISHED')"
              >
                Published
              </button>
            </div>

            <!-- Sort Select Dropdown -->
            <select
              class="docs-select docs-select--sort"
              [ngModel]="sortOption()"
              (ngModelChange)="onSortChange($event)"
              aria-label="Sort documents"
            >
              <option value="last_modified">Last modified</option>
              <option value="title_asc">Title A-Z</option>
              <option value="published_at">Published date</option>
            </select>
          </div>
        </div>

        <!-- ── Document Cards Grid / List ─────────────────────────────────── -->
        @if (docService.loading()) {
          <!-- Skeleton Loading -->
          <div class="docs-card-grid">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <div class="docs-skeleton docs-skeleton--card">
                <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
                <div class="docs-skeleton__line"></div>
                <div class="docs-skeleton__line docs-skeleton__line--sm"></div>
              </div>
            }
          </div>
        } @else if (docService.documents().length === 0) {
          <!-- Empty State -->
          @if (hasActiveFilterOrSearch()) {
            <div class="docs-empty-state">
              <div class="docs-empty-state__icon">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" stroke-width="2" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" />
                </svg>
              </div>
              <h2 class="docs-empty-state__title">
                No matching documents
              </h2>
              <p class="docs-empty-state__desc">
                No documents matched your search query or active filter.
              </p>
              <div class="docs-empty-state__actions">
                <button
                  type="button"
                  class="docs-button docs-button--secondary docs-button--sm"
                  (click)="clearAllFilters()"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          } @else {
            <div class="docs-empty-state">
              <div class="docs-empty-state__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h2 class="docs-empty-state__title">
                No documents yet
              </h2>
              <p class="docs-empty-state__desc">
                Create your first document to start drafting guides, notes, or articles.
              </p>
              <div class="docs-empty-state__actions">
                <button
                  type="button"
                  class="docs-button docs-button--primary docs-button--sm"
                  (click)="createNewDocument()"
                  [disabled]="isCreating()"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Story</span>
                </button>
              </div>
            </div>
          }
        } @else {
          <!-- Document Cards Grid -->
          <div class="docs-card-grid">
            @for (doc of docService.documents(); track doc.id) {
              <article class="docs-story-card">
                <div>
                  <div class="docs-story-card__top">
                    <div class="docs-story-card__badge-row">
                      <span
                        class="docs-badge"
                        [ngClass]="doc.status === 'PUBLISHED' ? 'docs-badge--published' : 'docs-badge--draft'"
                      >
                        {{ doc.status === 'PUBLISHED' ? 'Published' : 'Draft' }}
                      </span>
                    </div>
                    <span class="docs-story-card__date">
                      {{ formatDate(doc.updatedAt) }}
                    </span>
                  </div>

                  <a [routerLink]="['/write', doc.id]" class="docs-story-card__title-link">
                    {{ doc.title || 'Untitled Document' }}
                  </a>

                  @if (doc.summary) {
                    <p class="docs-feed-card__excerpt">
                      {{ doc.summary }}
                    </p>
                  }
                </div>

                <footer class="docs-story-card__footer">
                  <span class="docs-story-card__meta">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>{{ doc.sectionCount || 1 }} {{ (doc.sectionCount || 1) === 1 ? 'section' : 'sections' }}</span>
                  </span>

                  <div class="docs-story-card__actions">
                    @if (doc.status === 'PUBLISHED' && doc.slug) {
                      <a
                        [routerLink]="['/p', doc.slug]"
                        class="docs-icon-button docs-icon-button--sm docs-icon-button--subtle"
                        title="View Public Story"
                        aria-label="View public story"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    }

                    <button
                      type="button"
                      class="docs-icon-button docs-icon-button--sm docs-icon-button--subtle"
                      (click)="duplicateDoc(doc)"
                      [disabled]="duplicatingId() === doc.id"
                      title="Duplicate Story"
                      aria-label="Duplicate story"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      class="docs-icon-button docs-icon-button--sm docs-icon-button--subtle docs-action-btn--danger"
                      (click)="confirmDelete(doc)"
                      title="Delete Story"
                      aria-label="Delete story"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </footer>
              </article>
            }
          </div>

          <!-- Pagination Bar -->
          @if (docService.docPage() && (docService.docPage()?.totalPages || 0) > 1) {
            <div class="docs-pagination-bar">
              <div class="docs-pagination-info">
                Showing {{ currentPage() * pageSize + 1 }}–{{
                  Math.min((currentPage() + 1) * pageSize, docService.docPage()?.totalElements || 0)
                }}
                of {{ docService.docPage()?.totalElements }} documents
              </div>

              <div class="docs-pagination-actions">
                <button
                  type="button"
                  class="docs-button docs-button--secondary docs-button--sm"
                  (click)="goToPage(currentPage() - 1)"
                  [disabled]="currentPage() === 0"
                >
                  Previous
                </button>
                <span class="docs-pagination-current">
                  Page {{ currentPage() + 1 }} of {{ docService.docPage()?.totalPages }}
                </span>
                <button
                  type="button"
                  class="docs-button docs-button--secondary docs-button--sm"
                  (click)="goToPage(currentPage() + 1)"
                  [disabled]="currentPage() >= (docService.docPage()?.totalPages || 1) - 1"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Delete Confirmation Modal -->
      @if (pendingDeleteDoc()) {
        <div class="docs-modal">
          <div class="docs-modal__backdrop" (click)="cancelDelete()"></div>
          <div class="docs-modal__box">
            <header class="docs-modal__header">
              <h3 class="docs-modal__title">
                Delete Document
              </h3>
            </header>
            <div class="docs-modal__body">
              <p>
                Are you sure you want to delete <strong>"{{ pendingDeleteDoc()?.title }}"</strong>? This action cannot be undone.
              </p>
            </div>

            <footer class="docs-modal__actions">
              <button
                type="button"
                class="docs-button docs-button--secondary docs-button--sm"
                (click)="cancelDelete()"
                [disabled]="isDeleting()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="docs-button docs-button--primary docs-button--sm docs-button--danger"
                (click)="executeDelete()"
                [disabled]="isDeleting()"
              >
                @if (isDeleting()) {
                  <span>Deleting...</span>
                } @else {
                  <span>Delete permanently</span>
                }
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `
})
export class DocsDashboardComponent implements OnInit {
  readonly docService = inject(DocService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly Math = Math;

  searchQuery = '';
  private searchSubject = new Subject<string>();

  readonly statusFilter = signal<DocStatus | 'ALL'>('ALL');
  readonly sortOption = signal<DocSort>('last_modified');
  readonly currentPage = signal<number>(0);
  readonly pageSize = 9;

  readonly isCreating = signal<boolean>(false);
  readonly duplicatingId = signal<string | null>(null);
  readonly pendingDeleteDoc = signal<DocDocument | null>(null);
  readonly isDeleting = signal<boolean>(false);

  readonly hasActiveFilterOrSearch = computed(() => {
    return this.searchQuery.trim().length > 0 || this.statusFilter() !== 'ALL';
  });

  ngOnInit(): void {
    let url = this.router.url.split('?')[0];
    if (url.startsWith('/docs')) {
      url = url.substring('/docs'.length) || '/';
    }

    // Default status filter by route
    if (url === '/drafts') {
      this.statusFilter.set('DRAFT');
    } else if (url === '/published') {
      this.statusFilter.set('PUBLISHED');
    }

    this.route.queryParams.subscribe(params => {
      this.searchQuery = params['q'] || '';
      const statusParam = (params['status'] || '').toUpperCase();
      if (statusParam === 'DRAFT' || statusParam === 'PUBLISHED') {
        this.statusFilter.set(statusParam);
      } else if (statusParam === 'ALL') {
        this.statusFilter.set('ALL');
      }

      const sortParam = params['sort'] || 'last_modified';
      this.sortOption.set(sortParam === 'title_asc' || sortParam === 'published_at' ? sortParam : 'last_modified');

      const pageParam = parseInt(params['page'], 10);
      this.currentPage.set(!isNaN(pageParam) && pageParam >= 0 ? pageParam : 0);

      this.loadDocuments();
    });

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(0);
        this.syncUrlParams();
      });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage.set(0);
    this.syncUrlParams();
  }

  setStatusFilter(status: DocStatus | 'ALL'): void {
    this.statusFilter.set(status);
    this.currentPage.set(0);
    this.syncUrlParams();
  }

  onSortChange(sort: DocSort): void {
    this.sortOption.set(sort);
    this.currentPage.set(0);
    this.syncUrlParams();
  }

  goToPage(page: number): void {
    const totalPages = this.docService.docPage()?.totalPages || 1;
    if (page >= 0 && page < totalPages) {
      this.currentPage.set(page);
      this.syncUrlParams();
    }
  }

  clearAllFilters(): void {
    this.searchQuery = '';
    this.statusFilter.set('ALL');
    this.sortOption.set('last_modified');
    this.currentPage.set(0);
    this.syncUrlParams();
  }

  private syncUrlParams(): void {
    const queryParams: Record<string, string | number | null> = {};
    if (this.searchQuery.trim()) queryParams['q'] = this.searchQuery.trim();
    if (this.statusFilter() !== 'ALL') queryParams['status'] = this.statusFilter();
    if (this.sortOption() !== 'last_modified') queryParams['sort'] = this.sortOption();
    if (this.currentPage() > 0) queryParams['page'] = this.currentPage();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  private loadDocuments(): void {
    const params: DocumentQueryParams = {
      q: this.searchQuery.trim() || undefined,
      status: this.statusFilter(),
      sort: this.sortOption(),
      page: this.currentPage(),
      size: this.pageSize
    };
    this.docService.fetchDocuments(params).subscribe();
  }

  createNewDocument(): void {
    if (this.isCreating()) return;
    this.isCreating.set(true);
    this.docService.createDocument({ title: 'Untitled Document' }).subscribe({
      next: (doc) => {
        this.isCreating.set(false);
        this.router.navigate(['/write', doc.id]);
      },
      error: () => {
        this.isCreating.set(false);
      }
    });
  }

  duplicateDoc(doc: DocDocument): void {
    if (this.duplicatingId()) return;
    this.duplicatingId.set(doc.id);
    this.docService.duplicateDocument(doc.id).subscribe({
      next: (duplicated) => {
        this.duplicatingId.set(null);
        this.router.navigate(['/write', duplicated.id]);
      },
      error: () => {
        this.duplicatingId.set(null);
      }
    });
  }

  confirmDelete(doc: DocDocument): void {
    this.pendingDeleteDoc.set(doc);
  }

  cancelDelete(): void {
    this.pendingDeleteDoc.set(null);
  }

  executeDelete(): void {
    const doc = this.pendingDeleteDoc();
    if (!doc || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.docService.deleteDocument(doc.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.pendingDeleteDoc.set(null);
        this.loadDocuments();
      },
      error: () => {
        this.isDeleting.set(false);
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}
