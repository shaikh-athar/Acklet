// client/apps/tool-docs/src/app/pages/not-found/docs-not-found.component.ts

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'docs-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="docs-page--not-found">
      <div class="docs-not-found">
        <span class="docs-badge docs-badge--draft">404 Error</span>
        <h1 class="docs-not-found__code">404</h1>
        <h2 class="docs-not-found__title">Document Not Found</h2>
        <p class="docs-not-found__desc">
          The document or page you are looking for does not exist, has been unpublished, or was moved.
        </p>
        <div class="docs-not-found__actions">
          <a routerLink="/" class="docs-button docs-button--primary docs-button--md">
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Home</span>
          </a>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocsNotFoundComponent {}
