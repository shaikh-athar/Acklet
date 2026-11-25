// client/apps/tool-docs/src/app/pages/overview/docs-overview.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocService } from '../../services/doc.service';
import { CollectionService } from '../../services/collection.service';
import { ToolManagementService } from '../../services/tool-management.service';

@Component({
  selector: 'app-docs-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="docs-app docs-page docs-page--overview">
      <div class="docs-overview">
        <!-- ── Page Header ───────────────────────────────────────────────── -->
        <div class="docs-overview__header">
          <div class="docs-overview__title-group">
            <h1 class="docs-overview__title">Content Overview</h1>
            <p class="docs-overview__desc">
              Unified workspace for authoring stories, cataloging developer tools, and curating collections.
            </p>
          </div>
          <div>
            <a routerLink="/new" class="docs-button docs-button--primary docs-button--sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Story</span>
            </a>
          </div>
        </div>

        <!-- ── 3 Core Content Cards ─────────────────────────────────────── -->
        <div class="docs-overview__grid">
          <!-- 1. Stories Card -->
          <article class="docs-overview-card">
            <div>
              <header class="docs-overview-card__header">
                <span class="docs-overview-card__tag">Editorial</span>
                <span class="docs-badge docs-badge--topic">Stories</span>
              </header>
              <div class="docs-overview-card__body">
                <h2 class="docs-overview-card__count">{{ docService.docPage()?.totalElements || docService.documents().length }}</h2>
                <p class="docs-overview-card__desc">Technical guides, tutorials, benchmarks, and articles.</p>
              </div>
            </div>
            <footer class="docs-overview-card__footer">
              <a routerLink="/stories" class="docs-overview-card__link">Manage Stories →</a>
              <a routerLink="/new" class="docs-overview-card__new-btn">+ New</a>
            </footer>
          </article>

          <!-- 2. Tools Card -->
          <article class="docs-overview-card">
            <div>
              <header class="docs-overview-card__header">
                <span class="docs-overview-card__tag">Products</span>
                <span class="docs-badge docs-badge--topic">Tools</span>
              </header>
              <div class="docs-overview-card__body">
                <h2 class="docs-overview-card__count">{{ toolManagementService.totalElements() }}</h2>
                <p class="docs-overview-card__desc">Applications, platforms, utilities, and developer software.</p>
              </div>
            </div>
            <footer class="docs-overview-card__footer">
              <a routerLink="/tools-admin" class="docs-overview-card__link">Manage Tools →</a>
              <a routerLink="/tools-admin/new" class="docs-overview-card__new-btn">+ Add</a>
            </footer>
          </article>

          <!-- 3. Collections Card -->
          <article class="docs-overview-card">
            <div>
              <header class="docs-overview-card__header">
                <span class="docs-overview-card__tag">Curated</span>
                <span class="docs-badge docs-badge--topic">Collections</span>
              </header>
              <div class="docs-overview-card__body">
                <h2 class="docs-overview-card__count">{{ collectionService.totalElements() }}</h2>
                <p class="docs-overview-card__desc">Ordered tool bundles, toolkits, and category showcases.</p>
              </div>
            </div>
            <footer class="docs-overview-card__footer">
              <a routerLink="/collections" class="docs-overview-card__link">Manage Collections →</a>
              <a routerLink="/collections/new" class="docs-overview-card__new-btn">+ Create</a>
            </footer>
          </article>
        </div>

        <!-- ── Content Navigator Sub-Sections ────────────────────────────── -->
        <section class="docs-overview__recent">
          <header class="docs-overview__recent-header">
            <h2 class="docs-overview__recent-title">Recent Content Across Acklet</h2>
            <div class="docs-segmented-control" role="group" aria-label="Recent content types">
              <button
                type="button"
                class="docs-segmented-control__button"
                [class.docs-segmented-control__button--active]="activeTab() === 'stories'"
                (click)="activeTab.set('stories')"
              >
                Stories ({{ docService.documents().length }})
              </button>
              <button
                type="button"
                class="docs-segmented-control__button"
                [class.docs-segmented-control__button--active]="activeTab() === 'tools'"
                (click)="activeTab.set('tools')"
              >
                Tools ({{ toolManagementService.tools().length }})
              </button>
              <button
                type="button"
                class="docs-segmented-control__button"
                [class.docs-segmented-control__button--active]="activeTab() === 'collections'"
                (click)="activeTab.set('collections')"
              >
                Collections ({{ collectionService.collections().length }})
              </button>
            </div>
          </header>

          <!-- Tab 1: Stories -->
          @if (activeTab() === 'stories') {
            @if (docService.documents().length === 0) {
              <div class="docs-empty-state">
                <p class="docs-empty-state__desc">
                  No stories created yet. <a routerLink="/new" class="docs-overview-card__link">Write your first story</a>.
                </p>
              </div>
            } @else {
              <div class="docs-overview__recent-list">
                @for (story of docService.documents().slice(0, 5); track story.id) {
                  <article class="docs-overview-item">
                    <div class="docs-overview-item__left">
                      <div class="docs-overview-item__icon-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                          <path d="M6 6h10" />
                          <path d="M6 10h10" />
                        </svg>
                      </div>
                      <div class="docs-overview-item__info">
                        <a [routerLink]="['/write', story.id]" class="docs-overview-item__title">
                          {{ story.title || 'Untitled Story' }}
                        </a>
                        <div class="docs-overview-item__meta">
                          <span class="docs-badge" [ngClass]="story.status === 'PUBLISHED' ? 'docs-badge--published' : 'docs-badge--draft'">
                            {{ story.status === 'PUBLISHED' ? 'Published' : 'Draft' }}
                          </span>
                          <span>·</span>
                          <span>{{ (story.sectionCount || 1) === 1 ? '1 section' : (story.sectionCount || 1) + ' sections' }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="docs-overview-item__action">
                      <a [routerLink]="['/write', story.id]" class="docs-button docs-button--secondary docs-button--sm">Edit</a>
                    </div>
                  </article>
                }
              </div>
            }
          }

          <!-- Tab 2: Tools -->
          @if (activeTab() === 'tools') {
            @if (toolManagementService.tools().length === 0) {
              <div class="docs-empty-state">
                <p class="docs-empty-state__desc">
                  No tools cataloged yet. <a routerLink="/tools-admin/new" class="docs-overview-card__link">Add your first tool</a>.
                </p>
              </div>
            } @else {
              <div class="docs-overview__recent-list">
                @for (tool of toolManagementService.tools().slice(0, 5); track tool.id) {
                  <article class="docs-overview-item">
                    <div class="docs-overview-item__left">
                      <div class="docs-overview-item__icon-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18M9 21V9" />
                        </svg>
                      </div>
                      <div class="docs-overview-item__info">
                        <a [routerLink]="['/tools-admin', tool.slug]" class="docs-overview-item__title">
                          {{ tool.name }}
                        </a>
                        <div class="docs-overview-item__meta">
                          <span class="docs-badge" [ngClass]="tool.status === 'ACTIVE' ? 'docs-badge--published' : 'docs-badge--draft'">
                            {{ tool.status === 'ACTIVE' ? 'Active' : 'Draft' }}
                          </span>
                          <span>·</span>
                          <span>{{ tool.pricingType }}</span>
                          @if (tool.categoryName || tool.categorySlug) {
                            <span>·</span>
                            <span>{{ tool.categoryName || tool.categorySlug }}</span>
                          }
                        </div>
                      </div>
                    </div>
                    <div class="docs-overview-item__action">
                      <a [routerLink]="['/tools-admin', tool.slug]" class="docs-button docs-button--secondary docs-button--sm">Edit</a>
                    </div>
                  </article>
                }
              </div>
            }
          }

          <!-- Tab 3: Collections -->
          @if (activeTab() === 'collections') {
            @if (collectionService.collections().length === 0) {
              <div class="docs-empty-state">
                <p class="docs-empty-state__desc">
                  No collections created yet. <a routerLink="/collections/new" class="docs-overview-card__link">Create your first collection</a>.
                </p>
              </div>
            } @else {
              <div class="docs-overview__recent-list">
                @for (col of collectionService.collections().slice(0, 5); track col.id) {
                  <article class="docs-overview-item">
                    <div class="docs-overview-item__left">
                      <div class="docs-overview-item__icon-box">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" />
                          <polyline points="2 17 12 22 22 17" />
                          <polyline points="2 12 12 17 22 12" />
                        </svg>
                      </div>
                      <div class="docs-overview-item__info">
                        <a [routerLink]="['/collections', col.id]" class="docs-overview-item__title">
                          {{ col.name }}
                        </a>
                        <div class="docs-overview-item__meta">
                          <span class="docs-badge" [ngClass]="col.status === 'PUBLISHED' ? 'docs-badge--published' : 'docs-badge--draft'">
                            {{ col.status === 'PUBLISHED' ? 'Published' : 'Draft' }}
                          </span>
                          <span>·</span>
                          <span>{{ col.toolCount || 0 }} tools</span>
                        </div>
                      </div>
                    </div>
                    <div class="docs-overview-item__action">
                      <a [routerLink]="['/collections', col.id]" class="docs-button docs-button--secondary docs-button--sm">Edit</a>
                    </div>
                  </article>
                }
              </div>
            }
          }
        </section>
      </div>
    </div>
  `
})
export class DocsOverviewComponent implements OnInit {
  readonly docService = inject(DocService);
  readonly collectionService = inject(CollectionService);
  readonly toolManagementService = inject(ToolManagementService);

  readonly activeTab = signal<'stories' | 'tools' | 'collections'>('stories');

  ngOnInit(): void {
    this.docService.fetchDocuments({ page: 0, size: 5 }).subscribe();
    this.toolManagementService.getMyTools('', 'ALL', 0, 5).subscribe();
    this.collectionService.getMyCollections('', 'ALL', 0, 5).subscribe();
  }
}
