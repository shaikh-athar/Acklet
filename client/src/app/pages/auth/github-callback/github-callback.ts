import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GitHubService } from '../../../core/services/github.service';
import { IconComponent } from '../../../shared/components/icon/icon';

/**
 * Handles the GitHub OAuth callback redirect.
 * URL: /auth/github/callback?code=XXX&state=YYY
 *
 * Flow:
 *   1. Read code + state from query params
 *   2. Call backend /api/v1/github/callback
 *   3. On success → navigate to import page Step 2
 *   4. On error → show error message
 */
@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="cb-root">
      <div class="cb-card">
        @if (!error()) {
          <div class="cb-spinner-wrap">
            <div class="cb-spinner"></div>
          </div>
          <h2 class="cb-title">Connecting GitHub</h2>
          <p class="cb-subtitle">{{ statusText() }}</p>
        } @else {
          <div class="cb-error-icon">
            <app-icon name="alert-circle" class="cb-icon-err" />
          </div>
          <h2 class="cb-title">Connection Failed</h2>
          <p class="cb-subtitle">{{ error() }}</p>
          <button class="cb-retry-btn" (click)="retry()">Try Again</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .cb-root {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--vercel-bg, #fff);
    }
    .cb-card {
      text-align: center;
      padding: 48px 40px;
      background: var(--vercel-card-bg, #fafafa);
      border: 1px solid var(--vercel-border, #e5e7eb);
      border-radius: 12px;
      max-width: 400px;
      width: 100%;
    }
    .cb-spinner-wrap {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .cb-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--vercel-border);
      border-top-color: #171515;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .cb-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0 0 8px;
    }
    .cb-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 0;
    }
    .cb-error-icon {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .cb-icon-err {
      width: 40px;
      height: 40px;
      color: #ef4444;
    }
    .cb-retry-btn {
      margin-top: 20px;
      padding: 8px 24px;
      border-radius: 6px;
      background: #171515;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
  `]
})
export class GitHubCallbackComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gh     = inject(GitHubService);

  readonly error      = signal<string | null>(null);
  readonly statusText = signal('Exchanging authorization code…');

  ngOnInit(): void {
    const code  = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (!code || !state) {
      this.error.set('Missing OAuth code or state. Please try connecting again.');
      return;
    }

    this.statusText.set('Verifying security token…');

    this.gh.handleCallback(code, state).subscribe({
      next: (account) => {
        this.statusText.set(`Connected as @${account.githubLogin}! Redirecting…`);
        // Navigate to import page with the connected account pre-selected
        this.router.navigate(['/workspace/projects/import'], {
          queryParams: { step: 2, accountId: account.id },
          replaceUrl: true
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to connect GitHub. Please try again.');
      }
    });
  }

  retry(): void {
    this.router.navigate(['/workspace/projects/import']);
  }
}
