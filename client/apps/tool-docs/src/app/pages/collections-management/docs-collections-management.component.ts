// client/apps/tool-docs/src/app/pages/collections-management/docs-collections-management.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CollectionService } from '../../services/collection.service';
import { CollectionItem } from '../../models/content-management.model';
import { DocsToastService } from '../../services/docs-toast.service';

@Component({
  selector: 'app-docs-collections-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-app docs-page docs-page--collections">
      <div class="docs-workspace">
        <!-- ── Page Header ───────────────────────────────────────────────── -->
        <div class="docs-workspace__header">
          <div class="docs-workspace__title-group">
            <h1 class="docs-workspace__title">Your Collections</h1>
            <p class="docs-workspace__subtitle">
              Curate, order, and publish developer tool bundles and software showcases.
            </p>
          </div>
          <div class="docs-workspace__actions">
            <a routerLink="/collections/new" class="docs-button docs-button--primary docs-button--sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Collection</span>
            </a>
          </div>
        </div>

      <!-- ── Toolbar ───────────────────────────────────────────────────── -->
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
              placeholder="Search collections by name..."
              aria-label="Search collections"
            />
            @if (searchQuery.trim().length > 0) {
              <button
                type="button"
                class="docs-search-input-box__clear"
                (click)="clearSearch()"
                aria-label="Clear search"
              >
                ✕
              </button>
            }
          </div>
        </div>

        <!-- Actions: Status Filter Segment -->
        <div class="docs-toolbar__controls">
          <div class="docs-segmented-control" role="group" aria-label="Filter collections by status">
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
        </div>
      </div>

      <!-- ── Collections Grid / Empty State ────────────────────────────── -->
      @if (collectionService.loading()) {
        <div class="docs-card-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="docs-skeleton--card">
              <div class="docs-skeleton__line docs-skeleton__line--sm"></div>
              <div class="docs-skeleton__line docs-skeleton__line--lg"></div>
              <div class="docs-skeleton__line"></div>
            </div>
          }
        </div>
      } @else if (collectionService.collections().length === 0) {
        <div class="docs-empty-state">
          <div class="docs-empty-state__icon-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
          </div>
          <h2 class="docs-empty-state__title">No collections found</h2>
          <p class="docs-empty-state__desc">
            {{ searchQuery.trim() || statusFilter() !== 'ALL' ? 'No collections matched your active search or filter criteria.' : 'Create curated groups of software products and developer utilities.' }}
          </p>
          <div class="docs-empty-state__actions">
            @if (searchQuery.trim() || statusFilter() !== 'ALL') {
              <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="resetFilters()">
                Clear all filters
              </button>
            } @else {
              <a routerLink="/collections/new" class="docs-button docs-button--primary docs-button--sm">
                New Collection
              </a>
            }
          </div>
        </div>
      } @else {
        <div class="docs-card-grid">
          @for (col of collectionService.collections(); track col.id) {
            <div class="docs-item-card">
              <div>
                <div class="docs-item-card__top">
                  <div class="docs-item-card__badges">
                    <span class="docs-badge" [ngClass]="col.status === 'PUBLISHED' ? 'docs-badge--published' : 'docs-badge--draft'">
                      {{ col.status === 'PUBLISHED' ? 'Published' : 'Draft' }}
                    </span>
                    <span class="docs-badge docs-badge--topic">
                      {{ col.toolCount || 0 }} tools
                    </span>
                  </div>
                  <span class="docs-item-card__date">
                    {{ formatDate(col.updatedAt) }}
                  </span>
                </div>

                <a [routerLink]="['/collections', col.id]" class="docs-link">
                  <h3 class="docs-item-card__title">
                    {{ col.name }}
                  </h3>
                </a>
                <p class="docs-item-card__slug">
                  /collections/{{ col.slug }}
                </p>

                @if (col.description) {
                  <p class="docs-item-card__desc">
                    {{ col.description }}
                  </p>
                }
              </div>

              <div class="docs-item-card__footer">
                <span class="docs-card__meta">
                  {{ col.toolCount || 0 }} {{ (col.toolCount || 0) === 1 ? 'tool' : 'tools' }} selected
                </span>

                <div class="docs-item-card__actions">
                  <!-- Edit Action -->
                  <a [routerLink]="['/collections', col.id]" class="docs-icon-button" title="Edit Collection">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </a>

                  <!-- Duplicate Action -->
                  <button type="button" class="docs-icon-button" (click)="duplicateCollection(col)" title="Duplicate Collection">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  <!-- Publish / Unpublish Toggle -->
                  @if (col.status === 'PUBLISHED') {
                    <button type="button" class="docs-icon-button" (click)="unpublishCollection(col)" title="Unpublish Collection">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    </button>
                  } @else {
                    <button type="button" class="docs-icon-button" (click)="publishCollection(col)" title="Publish Collection">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </button>
                  }

                  <!-- Delete Action -->
                  <button type="button" class="docs-icon-button docs-action-btn--danger" (click)="openDeleteModal(col)" title="Delete Collection">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ── Confirmation Modal ────────────────────────────────────────── -->
      @if (deleteTarget()) {
        <div class="docs-dialog">
          <div class="docs-dialog__backdrop"></div>
          <div class="docs-dialog__content">
            <h3 class="docs-dialog__title">Delete {{ deleteTarget()?.name }}?</h3>
            <p class="docs-dialog__desc">This curated collection will be permanently deleted. Member tools will remain unaffected.</p>
            <div class="docs-dialog__actions">
              <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="deleteTarget.set(null)">Cancel</button>
              <button type="button" class="docs-button docs-button--danger docs-button--sm" (click)="confirmDelete()">Delete</button>
            </div>
          </div>
        </div>
      }
      </div>
    </div>
  `
})
export class DocsCollectionsManagementComponent implements OnInit {
  readonly collectionService = inject(CollectionService);
  private readonly toast = inject(DocsToastService);

  searchQuery = '';
  readonly statusFilter = signal<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');
  readonly deleteTarget = signal<CollectionItem | null>(null);

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.collectionService.getMyCollections(this.searchQuery, this.statusFilter(), 0, 20).subscribe();
  }

  onSearchInput(val: string): void {
    this.searchQuery = val;
    this.loadCollections();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.loadCollections();
  }

  setStatusFilter(status: 'ALL' | 'DRAFT' | 'PUBLISHED'): void {
    this.statusFilter.set(status);
    this.loadCollections();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter.set('ALL');
    this.loadCollections();
  }

  duplicateCollection(col: CollectionItem): void {
    this.collectionService.duplicateCollection(col.id).subscribe({
      next: () => {
        this.toast.success('Collection Duplicated', `Created a clone of ${col.name}`);
        this.loadCollections();
      },
      error: (err) => this.toast.error('Failed to duplicate collection', err?.error?.message)
    });
  }

  publishCollection(col: CollectionItem): void {
    this.collectionService.publishCollection(col.id).subscribe({
      next: () => {
        this.toast.success('Collection Published', `${col.name} is now published`);
        this.loadCollections();
      },
      error: (err) => this.toast.error('Failed to publish collection', err?.error?.message)
    });
  }

  unpublishCollection(col: CollectionItem): void {
    this.collectionService.unpublishCollection(col.id).subscribe({
      next: () => {
        this.toast.success('Collection Unpublished', `${col.name} reverted to Draft`);
        this.loadCollections();
      },
      error: (err) => this.toast.error('Failed to unpublish collection', err?.error?.message)
    });
  }

  openDeleteModal(col: CollectionItem): void {
    this.deleteTarget.set(col);
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.collectionService.deleteCollection(target.id).subscribe({
      next: () => {
        this.toast.success('Collection Deleted', `${target.name} has been deleted`);
        this.deleteTarget.set(null);
        this.loadCollections();
      },
      error: (err) => {
        this.toast.error('Failed to delete collection', err?.error?.message);
        this.deleteTarget.set(null);
      }
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
