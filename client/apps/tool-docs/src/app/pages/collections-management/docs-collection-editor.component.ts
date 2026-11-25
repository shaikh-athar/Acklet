// client/apps/tool-docs/src/app/pages/collections-management/docs-collection-editor.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CollectionService } from '../../services/collection.service';
import { ToolManagementService } from '../../services/tool-management.service';
import { DocsToastService } from '../../services/docs-toast.service';
import {
  ToolItem,
  CreateCollectionPayload,
  UpdateCollectionPayload
} from '../../models/content-management.model';

@Component({
  selector: 'app-docs-collection-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-publish">
      <!-- ── Top Action Bar ────────────────────────────────────────── -->
      <header class="docs-publish__topbar">
        <div class="docs-publish__topbar-inner">
          <a routerLink="/collections" class="docs-publish__back-link" title="Return to collections">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to Collections</span>
          </a>

          <div class="docs-publish__topbar-actions">
            <span class="docs-badge" [ngClass]="isExisting() && collectionStatus() === 'PUBLISHED' ? 'docs-badge--published' : 'docs-badge--draft'">
              {{ isExisting() ? collectionStatus() : 'New Collection Draft' }}
            </span>

            <a routerLink="/collections" class="docs-button docs-button--secondary docs-button--sm">
              Cancel
            </a>

            <button
              type="button"
              class="docs-button docs-button--secondary docs-button--sm"
              (click)="saveDraft()"
              [disabled]="saving()"
            >
              Save Draft
            </button>

            <button
              type="button"
              class="docs-button docs-button--primary docs-button--sm"
              (click)="publishCollection()"
              [disabled]="saving()"
            >
              @if (saving()) {
                <span>Saving...</span>
              } @else {
                <span>{{ isExisting() ? 'Update & Publish' : 'Publish Collection' }}</span>
              }
            </button>
          </div>
        </div>
      </header>

      <!-- ── Editor Canvas ─────────────────────────────────────────────── -->
      <main class="docs-publish__workbench">
        <!-- Left: Collection Details Form -->
        <div class="docs-publish__preview-col">
          <div class="docs-publish__section-header">
            <h2 class="docs-publish__section-title">Collection Details</h2>
            <p class="docs-publish__section-desc">
              Define the name, slug, overview, and cover imagery for this tool showcase.
            </p>
          </div>

          <form class="docs-card docs-form-col" (ngSubmit)="saveDraft()">
            <!-- Name -->
            <div class="docs-form-group">
              <label class="docs-form-label">Collection Name *</label>
              <input
                type="text"
                class="docs-input"
                [(ngModel)]="name"
                name="name"
                (ngModelChange)="onNameChange($event)"
                placeholder="e.g. Essential AI Tools, Dev Productivity Toolkit"
                required
              />
            </div>

            <!-- Slug -->
            <div class="docs-form-group">
              <label class="docs-form-label">URL Slug *</label>
              <input
                type="text"
                class="docs-input"
                [(ngModel)]="slug"
                name="slug"
                placeholder="essential-ai-tools"
                required
                [disabled]="isExisting()"
              />
            </div>

            <!-- Cover Image URL -->
            <div class="docs-form-group">
              <label class="docs-form-label">Cover Image URL</label>
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="coverImage"
                name="coverImage"
                placeholder="https://cdn.example.com/cover.png"
              />
            </div>

            <!-- Short Description -->
            <div class="docs-form-group">
              <label class="docs-form-label">Short Description (Summary)</label>
              <textarea
                class="docs-textarea"
                rows="2"
                [(ngModel)]="description"
                name="description"
                placeholder="A brief 1-2 sentence overview for cards and discovery feeds..."
              ></textarea>
            </div>

            <!-- Detailed Introduction -->
            <div class="docs-form-group">
              <label class="docs-form-label">Detailed Introduction</label>
              <textarea
                class="docs-textarea"
                rows="5"
                [(ngModel)]="introduction"
                name="introduction"
                placeholder="Comprehensive editorial introduction explaining why these tools were selected, their synergies, and ideal workflows..."
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Right: Tool Selector & Ordering Workbench -->
        <div class="docs-publish__settings-col">
          <div class="docs-publish__section-header">
            <h2 class="docs-publish__section-title">Selected Tools ({{ selectedTools().length }})</h2>
            <p class="docs-publish__section-desc">Search existing tools, add them to this collection, and arrange their custom order.</p>
          </div>

          <!-- Tool Search Box -->
          <div class="docs-card docs-form-col">
            <div class="docs-form-group">
              <label class="docs-form-label">Search Tool Catalog to Add</label>
              <div class="docs-search-input-box">
                <span class="docs-search-input-box__icon">
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" stroke-width="2" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" />
                  </svg>
                </span>
                <input
                  type="text"
                  class="docs-search-input-box__input"
                  [(ngModel)]="toolCatalogSearch"
                  (ngModelChange)="onCatalogSearch($event)"
                  placeholder="Search tools by name (e.g. QR, Barcode, Clipboard)..."
                />
              </div>
            </div>

            <!-- Search Results Dropdown -->
            @if (searchResults().length > 0) {
              <div class="docs-catalog-results">
                @for (tool of searchResults(); track tool.id) {
                  <div class="docs-catalog-result-row">
                    <div class="docs-item-card__badges">
                      <span class="docs-item-card__title">{{ tool.name }}</span>
                      <span class="docs-badge docs-badge--topic">{{ tool.pricingType }}</span>
                    </div>
                    <button
                      type="button"
                      class="docs-button docs-button--secondary docs-button--xs"
                      (click)="addTool(tool)"
                      [disabled]="isToolSelected(tool.id)"
                    >
                      {{ isToolSelected(tool.id) ? 'Added' : '+ Add' }}
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Ordered List of Tools -->
          <div class="docs-card docs-form-col">
            @if (selectedTools().length === 0) {
              <div class="docs-empty-state__desc docs-empty-state__desc--center">
                No tools selected yet. Search the catalog above to add tools to this collection.
              </div>
            } @else {
              <div class="docs-collection-tools">
                @for (tool of selectedTools(); track tool.id; let idx = $index) {
                  <div class="docs-collection-tool-row">
                    <span class="docs-collection-tool-num">
                      {{ idx + 1 }}
                    </span>
                    <div class="docs-collection-tool-info">
                      <span class="docs-collection-tool-name">{{ tool.name }}</span>
                      <span class="docs-collection-tool-slug">/tools/{{ tool.slug }}</span>
                    </div>

                    <div class="docs-collection-tool-actions">
                      <!-- Move Up -->
                      <button
                        type="button"
                        class="docs-icon-button"
                        [disabled]="idx === 0"
                        (click)="moveTool(idx, -1)"
                        title="Move Up"
                      >
                        ↑
                      </button>

                      <!-- Move Down -->
                      <button
                        type="button"
                        class="docs-icon-button"
                        [disabled]="idx === selectedTools().length - 1"
                        (click)="moveTool(idx, 1)"
                        title="Move Down"
                      >
                        ↓
                      </button>

                      <!-- Remove -->
                      <button
                        type="button"
                        class="docs-icon-button docs-action-btn--danger"
                        (click)="removeTool(idx)"
                        title="Remove from Collection"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </main>
    </div>
  `
})
export class DocsCollectionEditorComponent implements OnInit {
  readonly collectionService = inject(CollectionService);
  readonly toolService = inject(ToolManagementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(DocsToastService);

  readonly isExisting = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly collectionStatus = signal<string>('DRAFT');
  readonly selectedTools = signal<ToolItem[]>([]);
  readonly searchResults = signal<ToolItem[]>([]);

  collectionId = '';
  name = '';
  slug = '';
  coverImage = '';
  description = '';
  introduction = '';
  toolCatalogSearch = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isExisting.set(true);
      this.collectionId = id;
      this.loadCollectionData(id);
    }
  }

  loadCollectionData(id: string): void {
    this.collectionService.getCollection(id).subscribe({
      next: (res) => {
        if (res.data) {
          const c = res.data;
          this.name = c.name;
          this.slug = c.slug;
          this.coverImage = c.coverImage || '';
          this.description = c.description || '';
          this.introduction = c.introduction || '';
          this.collectionStatus.set(c.status);
          if (c.tools) {
            this.selectedTools.set(c.tools);
          }
        }
      },
      error: (err) => this.toast.error('Failed to load collection', err?.error?.message)
    });
  }

  onNameChange(name: string): void {
    if (!this.isExisting()) {
      this.slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    }
  }

  onCatalogSearch(q: string): void {
    if (!q || !q.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.toolService.searchCatalogTools(q.trim()).subscribe({
      next: (res) => {
        if (res.data?.content) {
          this.searchResults.set(res.data.content);
        } else {
          this.searchResults.set([]);
        }
      }
    });
  }

  isToolSelected(toolId: string): boolean {
    return this.selectedTools().some((t) => t.id === toolId);
  }

  addTool(tool: ToolItem): void {
    if (this.isToolSelected(tool.id)) return;
    this.selectedTools.update((list) => [...list, tool]);
  }

  removeTool(idx: number): void {
    this.selectedTools.update((list) => list.filter((_, i) => i !== idx));
  }

  moveTool(idx: number, delta: number): void {
    const target = idx + delta;
    if (target < 0 || target >= this.selectedTools().length) return;
    this.selectedTools.update((list) => {
      const copy = [...list];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  }

  saveDraft(): void {
    if (!this.name.trim()) {
      this.toast.error('Validation Error', 'Collection name is required');
      return;
    }

    this.saving.set(true);
    const toolIds = this.selectedTools().map((t) => t.id);

    if (this.isExisting()) {
      const payload: UpdateCollectionPayload = {
        name: this.name.trim(),
        coverImage: this.coverImage.trim(),
        description: this.description.trim(),
        introduction: this.introduction.trim(),
        toolIds
      };

      this.collectionService.updateCollection(this.collectionId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Collection Saved', 'Draft updated successfully');
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error('Save Failed', err?.error?.message);
        }
      });
    } else {
      const payload: CreateCollectionPayload = {
        name: this.name.trim(),
        slug: this.slug.trim(),
        coverImage: this.coverImage.trim(),
        description: this.description.trim(),
        introduction: this.introduction.trim(),
        toolIds
      };

      this.collectionService.createCollection(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Collection Created', 'Draft created successfully');
          this.router.navigate(['/collections']);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error('Creation Failed', err?.error?.message);
        }
      });
    }
  }

  publishCollection(): void {
    this.saveDraft();
    if (this.isExisting()) {
      this.collectionService.publishCollection(this.collectionId).subscribe({
        next: () => {
          this.collectionStatus.set('PUBLISHED');
          this.toast.success('Collection Published', `${this.name} is now publicly visible`);
        },
        error: (err) => this.toast.error('Publish Failed', err?.error?.message)
      });
    }
  }
}
