// client/apps/tool-docs/src/app/pages/write/docs-write.component.ts

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DocService } from '../../services/doc.service';
import { DocsAuthService } from '../../services/docs-auth.service';

@Component({
  selector: 'app-docs-write',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="docs-loading-screen">
      <div class="docs-spinner"></div>
      <p class="docs-loading-screen__message">Initializing your draft workspace...</p>
    </div>
  `
})
export class DocsWriteComponent implements OnInit {
  private readonly docService = inject(DocService);
  private readonly authService = inject(DocsAuthService);
  private readonly router = inject(Router);

  private isCreating = false;

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/sign-in'], { queryParams: { returnUrl: '/write' } });
      return;
    }

    if (this.isCreating) return;
    this.isCreating = true;

    this.docService.createDocument({ title: 'Untitled story' }).subscribe({
      next: (doc) => {
        this.isCreating = false;
        this.router.navigate(['/write', doc.id], { replaceUrl: true });
      },
      error: () => {
        this.isCreating = false;
        this.router.navigate(['/stories']);
      }
    });
  }
}
