// client/apps/tool-docs/src/app/pages/publish/docs-publish.component.ts

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocService } from '../../services/doc.service';
import { DocsAuthService } from '../../services/docs-auth.service';
import { DocsToastService } from '../../services/docs-toast.service';
import { getDocsUrl } from '@acklet/shared';
import { DocDocumentDetail } from '../../models/doc.model';

@Component({
  selector: 'app-docs-publish',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="docs-app docs-publish">
      <!-- ── 56px Top Action Bar ────────────────────────────────────────── -->
      <header class="docs-publish__topbar">
        <div class="docs-publish__topbar-inner">
          <a
            [routerLink]="['/write', docId()]"
            class="docs-editor__back-link"
            title="Return to writing canvas"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to editor</span>
          </a>

          <div>
            <span class="docs-badge docs-badge--draft">
              {{ isPublished() ? 'Published Story' : 'Story Draft' }}
            </span>
          </div>
        </div>
      </header>

      <!-- ── Two-Column Publishing Workbench ──────────────────────────── -->
      <div class="docs-publish__container">
        <main class="docs-publish__layout">
          <!-- Left Column: Live Story Preview -->
          <div class="docs-publish__preview">
            <div>
              <h2 class="docs-publish__preview-title">Story Preview</h2>
              <p class="docs-publish__preview-desc">
                Preview how your story appears in community feeds and search previews.
              </p>
            </div>

            <!-- Feed Card Preview -->
            <article class="docs-publish__card-preview docs-feed-card">
              <header class="docs-feed-card__meta">
                <div class="docs-feed-card__author">
                  <div class="docs-avatar docs-avatar--sm">
                    {{ authorInitial() }}
                  </div>
                  <span class="docs-feed-card__author-name">{{ authorName() }}</span>
                  <span>·</span>
                  <time class="docs-feed-card__date">{{ todayFormatted() }}</time>
                </div>
              </header>

              <h3 class="docs-feed-card__title">
                {{ title().trim() || 'Untitled story' }}
              </h3>
              <p class="docs-feed-card__excerpt">
                {{
                  summary().trim() ||
                    'No summary provided. Readers will see the opening excerpt of your story.'
                }}
              </p>

              <footer class="docs-feed-card__footer">
                <div class="docs-feed-card__tags">
                  <span class="docs-badge docs-badge--topic"> Article </span>
                  <span class="docs-feed-card__reading-time">1 min read</span>
                </div>
                <span class="docs-feed-card__action">
                  <span>Read story</span>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </footer>
            </article>
          </div>

          <!-- Right Column: Publishing Details -->
          <div class="docs-publish__settings">
            <div>
              <h2 class="docs-publish__preview-title">
                {{ isPublished() ? 'Publish settings' : 'Publishing to Acklet Docs' }}
              </h2>
              <p class="docs-publish__preview-desc">
                Configure how your story appears across Acklet Docs and in search previews.
              </p>
            </div>

            <form (ngSubmit)="onPublish()" class="docs-publish__form">
              <!-- 1. Title (Required) -->
              <div class="docs-form-group">
                <label for="publish-title" class="docs-label"> Title * </label>
                <input
                  id="publish-title"
                  type="text"
                  [(ngModel)]="title"
                  name="title"
                  (ngModelChange)="onTitleChange()"
                  maxlength="255"
                  placeholder="Give your story a clear title"
                  class="docs-input"
                />
              </div>

              <!-- 2. Summary (Optional, Max 160 Characters) -->
              <div class="docs-form-group">
                <div class="docs-label">
                  <span>Summary</span>
                  <span class="docs-counter"> {{ summary().length }}/160 </span>
                </div>
                <textarea
                  id="publish-summary"
                  [(ngModel)]="summary"
                  name="summary"
                  maxlength="160"
                  rows="3"
                  placeholder="A brief 1-2 sentence description for feed cards and search results..."
                  class="docs-textarea"
                ></textarea>
                <p class="docs-form-helper">
                  Displayed on your author profile, community feed cards, and search engine results.
                </p>
              </div>

              <!-- 3. URL Slug Preview -->
              <div class="docs-form-group">
                <label class="docs-label"> Public Address Preview </label>
                <input
                  type="text"
                  readonly
                  [value]="publicUrlPreview()"
                  class="docs-input"
                  title="Public URL assigned upon publishing"
                />
                <p class="docs-form-helper">
                  Generated automatically from your title to ensure permanent, clean reading links.
                </p>
              </div>

              <!-- ── Footer Actions ─────────────────────────────────────────── -->
              <div class="docs-publish__actions">
                <a
                  [routerLink]="['/write', docId()]"
                  class="docs-button docs-button--secondary docs-button--md"
                >
                  Cancel
                </a>

                @if (isPublished()) {
                  <button
                    type="button"
                    (click)="showUnpublishModal.set(true)"
                    [disabled]="isSubmitting()"
                    class="docs-button docs-button--secondary docs-button--md docs-button--danger"
                  >
                    Unpublish
                  </button>
                }

                <button
                  type="submit"
                  [disabled]="isSubmitting()"
                  class="docs-button docs-button--primary docs-button--md"
                >
                  @if (isSubmitting()) {
                    <span>Publishing...</span>
                  } @else if (isPublished()) {
                    <span>Update Story</span>
                  } @else {
                    <span>Publish now</span>
                  }
                </button>
              </div>

              @if (validationErrors().length > 0 && hasAttemptedPublish()) {
                <div class="docs-publish__validation-box">
                  @for (err of validationErrors(); track err) {
                    <div class="docs-publish__error-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{{ err }}</span>
                    </div>
                  }
                </div>
              }
            </form>
          </div>
        </main>
      </div>

      <!-- ── Unpublish Confirmation Modal ──────────────────────────────── -->
      @if (showUnpublishModal()) {
        <div class="docs-modal" role="dialog" aria-modal="true" aria-labelledby="unpub-title">
          <div class="docs-modal__backdrop" (click)="showUnpublishModal.set(false)"></div>
          <div class="docs-modal__box">
            <header class="docs-modal__header">
              <h2 id="unpub-title" class="docs-modal__title">Unpublish story?</h2>
            </header>
            <div class="docs-modal__body">
              <p>
                This story will be reverted to draft status and will no longer be visible to readers
                or discoverable in search. Your URL slug is preserved if you republish later.
              </p>
            </div>

            <footer class="docs-modal__actions">
              <button
                type="button"
                class="docs-button docs-button--secondary docs-button--sm"
                (click)="showUnpublishModal.set(false)"
                [disabled]="isSubmitting()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="docs-button docs-button--primary docs-button--sm docs-button--danger"
                (click)="onConfirmUnpublish()"
                [disabled]="isSubmitting()"
              >
                @if (isSubmitting()) {
                  <span>Unpublishing...</span>
                } @else {
                  <span>Yes, unpublish</span>
                }
              </button>
            </footer>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class DocsPublishPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly docService = inject(DocService);
  private readonly authService = inject(DocsAuthService);
  private readonly toastService = inject(DocsToastService);

  readonly docId = signal<string>('');
  readonly title = signal<string>('');
  readonly summary = signal<string>('');
  readonly currentDoc = signal<DocDocumentDetail | null>(null);

  readonly isSubmitting = signal<boolean>(false);
  readonly hasAttemptedPublish = signal<boolean>(false);
  readonly showUnpublishModal = signal<boolean>(false);

  readonly isPublished = computed(() => this.currentDoc()?.status === 'PUBLISHED');

  readonly validationErrors = computed<string[]>(() => {
    const errors: string[] = [];
    if (!this.title().trim()) {
      errors.push('Add a title to publish');
    }
    const doc = this.currentDoc();
    const hasSectionBody = doc?.sections?.some((s) => s.body && s.body.trim().length > 0);
    const hasBlockBody = doc?.blocks?.some((b) => b.type === 'paragraph' && b.text && b.text.trim().length > 0);
    if (!hasSectionBody && !hasBlockBody) {
      errors.push('Add at least one paragraph to publish');
    }
    const missingAlt = doc?.blocks?.some((b) => b.type === 'image' && (!b.alt || b.alt.trim().length === 0));
    if (missingAlt) {
      errors.push('Add alt text to every image before publishing');
    }
    return errors;
  });

  readonly publicUrlPreview = computed(() => {
    const slug = this.currentDoc()?.slug || this.slugify(this.title() || 'untitled-story');
    return getDocsUrl(`p/${slug}`);
  });

  readonly authorName = computed(() => {
    return this.authService.currentUser()?.displayName || 'Author';
  });

  readonly authorInitial = computed(() => {
    return (this.authorName()[0] || 'A').toUpperCase();
  });

  readonly todayFormatted = computed(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('docId');
    if (!id) {
      this.router.navigate(['/stories']);
      return;
    }
    this.docId.set(id);

    this.docService.getDocument(id).subscribe({
      next: (doc: DocDocumentDetail) => {
        this.currentDoc.set(doc);
        this.title.set(doc.title || '');
        this.summary.set(doc.summary || '');
      },
      error: () => {
        this.toastService.error('Story Not Found', 'Could not load story details for publishing.');
        this.router.navigate(['/stories']);
      },
    });
  }

  onTitleChange(): void {
    // Keep local preview reactive
  }

  onPublish(): void {
    this.hasAttemptedPublish.set(true);
    if (this.validationErrors().length > 0) {
      return;
    }

    this.isSubmitting.set(true);

    this.docService
      .publishDocument(this.docId(), {
        title: this.title().trim(),
        summary: this.summary().trim() || undefined,
      })
      .subscribe({
        next: (published) => {
          this.isSubmitting.set(false);
          this.toastService.success(
            this.isPublished() ? 'Story Updated' : 'Story Published',
            'Your story is now live and readable by the community.',
          );
          if (published.slug) {
            this.router.navigate(['/p', published.slug]);
          } else {
            this.router.navigate(['/stories']);
          }
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toastService.error(
            'Publish Failed',
            err?.message || 'Could not publish story. Please verify requirements.',
          );
        },
      });
  }

  onConfirmUnpublish(): void {
    this.isSubmitting.set(true);
    this.docService.unpublishDocument(this.docId()).subscribe({
      next: (unpublished) => {
        this.isSubmitting.set(false);
        this.showUnpublishModal.set(false);
        this.currentDoc.set(unpublished);
        this.toastService.success('Story Unpublished', 'Your story was reverted to a draft.');
        this.router.navigate(['/write', this.docId()]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showUnpublishModal.set(false);
        this.toastService.error('Unpublish Failed', err?.message || 'Could not unpublish story.');
      },
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
