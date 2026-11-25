// client/apps/tool-docs/src/app/pages/tools-management/docs-tool-editor.component.ts

import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToolManagementService } from '../../services/tool-management.service';
import { DocsToastService } from '../../services/docs-toast.service';
import { CreateToolPayload, UpdateToolPayload } from '../../models/content-management.model';

@Component({
  selector: 'app-docs-tool-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-publish">
      <!-- ── Top Action Bar ────────────────────────────────────────── -->
      <header class="docs-publish__topbar">
        <div class="docs-publish__topbar-inner">
          <a routerLink="/tools-admin" class="docs-publish__back-link" title="Return to tools">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to Tools</span>
          </a>

          <div class="docs-publish__topbar-actions">
            <span class="docs-badge" [ngClass]="isExisting() && toolStatus() === 'ACTIVE' ? 'docs-badge--published' : 'docs-badge--draft'">
              {{ isExisting() ? toolStatus() : 'New Tool Draft' }}
            </span>

            <a routerLink="/tools-admin" class="docs-button docs-button--secondary docs-button--sm">
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
              (click)="publishTool()"
              [disabled]="saving()"
            >
              @if (saving()) {
                <span>Saving...</span>
              } @else {
                <span>{{ isExisting() ? 'Update & Publish' : 'Publish Tool' }}</span>
              }
            </button>
          </div>
        </div>
      </header>

      <!-- ── Editor Canvas ─────────────────────────────────────────────── -->
      <main class="docs-publish__workbench">
        <!-- Left: Summary / Info Card -->
        <div class="docs-publish__preview-col">
          <div class="docs-publish__section-header">
            <h2 class="docs-publish__section-title">Tool Profile Preview</h2>
            <p class="docs-publish__section-desc">
              How this product appears in search cards, category listings, and collections.
            </p>
          </div>

          <div class="docs-card">
            <div class="docs-item-card__identity">
              <div class="docs-item-card__logo">
                @if (logoUrl) {
                  <img [src]="logoUrl" [alt]="name" />
                } @else {
                  <span>{{ (name || 'T').charAt(0).toUpperCase() }}</span>
                }
              </div>
              <div class="docs-item-card__info">
                <h3 class="docs-item-card__title">
                  {{ name || 'Tool Name' }}
                </h3>
                <span class="docs-item-card__slug">
                  /tools/{{ slug || 'tool-slug' }}
                </span>
              </div>
            </div>

            <p class="docs-item-card__desc">
              {{ tagline || 'A short, compelling tagline describing what this tool does.' }}
            </p>

            <div class="docs-item-card__footer">
              <div class="docs-item-card__badges">
                <span class="docs-badge docs-badge--topic">
                  {{ pricingType }}
                </span>
                @if (isOpenSource) {
                  <span class="docs-badge docs-badge--published">Open Source</span>
                }
              </div>
              @if (websiteUrl) {
                <span class="docs-item-card__slug">{{ websiteUrl }}</span>
              }
            </div>
          </div>
        </div>

        <!-- Right: Tool Form Details -->
        <div class="docs-publish__settings-col">
          <div class="docs-publish__section-header">
            <h2 class="docs-publish__section-title">Product Information</h2>
            <p class="docs-publish__section-desc">Configure identifiers, links, pricing, and category metadata.</p>
          </div>

          <form class="docs-card docs-form-col" (ngSubmit)="saveDraft()">
            <!-- Name -->
            <div class="docs-form-group">
              <label class="docs-form-label">Tool Name *</label>
              <input
                type="text"
                class="docs-input"
                [(ngModel)]="name"
                name="name"
                (ngModelChange)="onNameChange($event)"
                placeholder="e.g. DataLens, Figma, Postman"
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
                placeholder="datalens"
                required
                [disabled]="isExisting()"
              />
            </div>

            <!-- Tagline -->
            <div class="docs-form-group">
              <label class="docs-form-label">Tagline (1-line hook)</label>
              <input
                type="text"
                class="docs-input"
                [(ngModel)]="tagline"
                name="tagline"
                placeholder="Instant JSON formatter, validator and tree viewer"
              />
            </div>

            <!-- Category & Pricing -->
            <div class="docs-form-group">
              <label class="docs-form-label">Category *</label>
              <select class="docs-select" [(ngModel)]="categorySlug" name="categorySlug" required>
                <option value="" disabled>Select Category</option>
                @for (cat of toolService.categories(); track cat.id) {
                  <option [value]="cat.slug">{{ cat.name }}</option>
                }
              </select>
            </div>

            <div class="docs-form-group">
              <label class="docs-form-label">Pricing Model</label>
              <select class="docs-select" [(ngModel)]="pricingType" name="pricingType">
                <option value="FREE">Free</option>
                <option value="FREEMIUM">Freemium</option>
                <option value="PAID">Paid</option>
                <option value="OPEN_SOURCE">Open Source</option>
              </select>
            </div>

            <!-- Website & GitHub -->
            <div class="docs-form-group">
              <label class="docs-form-label">Official Website URL</label>
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="websiteUrl"
                name="websiteUrl"
                placeholder="https://example.com"
              />
            </div>

            <div class="docs-form-group">
              <label class="docs-form-label">GitHub URL</label>
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="githubUrl"
                name="githubUrl"
                placeholder="https://github.com/org/repo"
              />
            </div>

            <!-- Logo & Cover -->
            <div class="docs-form-group">
              <label class="docs-form-label">Logo Image URL</label>
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="logoUrl"
                name="logoUrl"
                placeholder="https://cdn.example.com/logo.png"
              />
            </div>

            <div class="docs-form-group">
              <label class="docs-form-label">Cover Image URL</label>
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="coverUrl"
                name="coverUrl"
                placeholder="https://cdn.example.com/cover.png"
              />
            </div>

            <!-- Description -->
            <div class="docs-form-group">
              <label class="docs-form-label">Detailed Description</label>
              <textarea
                class="docs-textarea"
                rows="4"
                [(ngModel)]="description"
                name="description"
                placeholder="Comprehensive technical explanation of features, architecture, and developer use cases..."
              ></textarea>
            </div>

            <!-- Open Source Toggle -->
            <div class="docs-form-group">
              <label class="docs-form-label">
                <input
                  type="checkbox"
                  id="isOpenSource"
                  [(ngModel)]="isOpenSource"
                  name="isOpenSource"
                />
                <span>Open Source Software</span>
              </label>
            </div>
          </form>
        </div>
      </main>
    </div>
  `
})
export class DocsToolEditorComponent implements OnInit {
  readonly toolService = inject(ToolManagementService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(DocsToastService);

  readonly isExisting = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly toolStatus = signal<string>('DRAFT');

  name = '';
  slug = '';
  tagline = '';
  description = '';
  categorySlug = '';
  pricingType = 'FREE';
  websiteUrl = '';
  githubUrl = '';
  logoUrl = '';
  coverUrl = '';
  isOpenSource = false;

  ngOnInit(): void {
    this.toolService.loadCategories().subscribe();

    const paramSlug = this.route.snapshot.paramMap.get('slug');
    if (paramSlug && paramSlug !== 'new') {
      this.isExisting.set(true);
      this.slug = paramSlug;
      this.loadToolData(paramSlug);
    }
  }

  loadToolData(slug: string): void {
    this.toolService.getToolBySlug(slug).subscribe({
      next: (res) => {
        if (res.data) {
          const t = res.data;
          this.name = t.name;
          this.slug = t.slug;
          this.tagline = t.tagline || '';
          this.description = t.description || '';
          this.categorySlug = t.categorySlug || t.category?.slug || '';
          this.pricingType = t.pricingType || 'FREE';
          this.websiteUrl = t.websiteUrl || '';
          this.githubUrl = t.githubUrl || '';
          this.logoUrl = t.logoUrl || '';
          this.coverUrl = t.coverUrl || '';
          this.isOpenSource = t.isOpenSource || false;
          this.toolStatus.set(t.status);
        }
      },
      error: (err) => this.toast.error('Failed to load tool', err?.error?.message)
    });
  }

  onNameChange(name: string): void {
    if (!this.isExisting()) {
      this.slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    }
  }

  saveDraft(): void {
    if (!this.name.trim()) {
      this.toast.error('Validation Error', 'Tool name is required');
      return;
    }

    this.saving.set(true);
    if (this.isExisting()) {
      const payload: UpdateToolPayload = {
        name: this.name.trim(),
        tagline: this.tagline.trim(),
        description: this.description.trim(),
        categorySlug: this.categorySlug,
        websiteUrl: this.websiteUrl.trim(),
        githubUrl: this.githubUrl.trim(),
        logoUrl: this.logoUrl.trim(),
        coverUrl: this.coverUrl.trim(),
        pricingType: this.pricingType,
        isOpenSource: this.isOpenSource
      };

      this.toolService.updateTool(this.slug, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Tool Saved', 'Draft updated successfully');
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error('Save Failed', err?.error?.message);
        }
      });
    } else {
      const payload: CreateToolPayload = {
        name: this.name.trim(),
        slug: this.slug.trim(),
        tagline: this.tagline.trim(),
        description: this.description.trim(),
        categorySlug: this.categorySlug || (this.toolService.categories()[0]?.slug || 'developer-tools'),
        websiteUrl: this.websiteUrl.trim(),
        githubUrl: this.githubUrl.trim(),
        logoUrl: this.logoUrl.trim(),
        coverUrl: this.coverUrl.trim(),
        pricingType: this.pricingType,
        isOpenSource: this.isOpenSource
      };

      this.toolService.createTool(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Tool Created', 'Tool draft created successfully');
          this.router.navigate(['/tools-admin']);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error('Creation Failed', err?.error?.message);
        }
      });
    }
  }

  publishTool(): void {
    this.saveDraft();
    if (this.isExisting()) {
      this.toolService.submitTool(this.slug).subscribe({
        next: () => {
          this.toolStatus.set('ACTIVE');
          this.toast.success('Tool Published', `${this.name} is now published`);
        },
        error: (err) => this.toast.error('Publish Failed', err?.error?.message)
      });
    }
  }
}
