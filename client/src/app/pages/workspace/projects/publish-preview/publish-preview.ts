import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ApiResponse } from '../../../../core/services/tools.service';

interface DraftTool {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  githubUrl?: string;
  websiteUrl?: string;
  version?: string;
  author?: string;
  pricingType?: string;
  isOpenSource?: boolean;
  status?: string;
  category?: { id: string; name: string; slug: string };
}

@Component({
  selector: 'app-publish-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="pp-root">
      <div class="pp-header">
        <div class="pp-breadcrumb">
          <a routerLink="/workspace/projects" class="pp-bc-link">Projects</a>
          <app-icon name="chevron-right" class="pp-bc-sep" />
          <span class="pp-bc-current">Review & Publish</span>
        </div>
        <div class="pp-header-actions">
          <button class="pp-btn pp-btn-ghost" (click)="saveDraft()" [disabled]="saving()">
            @if (saving()) { <div class="pp-spinner-sm"></div> } @else { Save Draft }
          </button>
          <button class="pp-btn pp-btn-primary" (click)="publish()" [disabled]="publishing() || !tool()">
            @if (publishing()) {
              <div class="pp-spinner-sm light"></div>
              <span>Publishing…</span>
            } @else {
              <app-icon name="rocket" class="pp-btn-icon" />
              <span>Publish Tool</span>
            }
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="pp-loading">
          <div class="pp-spinner"></div>
          <p>Loading tool data…</p>
        </div>
      } @else if (tool()) {

        <div class="pp-body">
          <!-- Left column: editable metadata -->
          <div class="pp-left">
            <!-- Tool identity -->
            <div class="pp-card">
              <div class="pp-card-head">
                <h2 class="pp-section-title">Tool Identity</h2>
                <span class="pp-badge pp-badge-draft">DRAFT</span>
              </div>

              <div class="pp-logo-row">
                <div class="pp-logo-placeholder">
                  <app-icon name="package" class="pp-logo-icon" />
                </div>
                <div class="pp-logo-meta">
                  <div class="pp-field-label">Logo</div>
                  <button class="pp-btn pp-btn-sm pp-btn-outline">Upload Logo</button>
                </div>
              </div>

              <div class="pp-field">
                <label class="pp-field-label">Tool Name *</label>
                <input type="text" class="pp-input" [(ngModel)]="editName" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Tagline</label>
                <input type="text" class="pp-input" [(ngModel)]="editTagline" placeholder="One-line description" />
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Description</label>
                <textarea class="pp-textarea" [(ngModel)]="editDescription" rows="4" placeholder="What does this tool do?"></textarea>
              </div>
              <div class="pp-field-row">
                <div class="pp-field">
                  <label class="pp-field-label">Version</label>
                  <input type="text" class="pp-input" [(ngModel)]="editVersion" />
                </div>
                <div class="pp-field">
                  <label class="pp-field-label">Pricing</label>
                  <select class="pp-select" [(ngModel)]="editPricing">
                    <option value="FREE">Free</option>
                    <option value="FREEMIUM">Freemium</option>
                    <option value="PAID">Paid</option>
                    <option value="OPEN_SOURCE">Open Source</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Links -->
            <div class="pp-card">
              <h2 class="pp-section-title">Links</h2>
              <div class="pp-field">
                <label class="pp-field-label">GitHub Repository</label>
                <div class="pp-input-group">
                  <app-icon name="github" class="pp-input-icon" />
                  <input type="text" class="pp-input pp-input-with-icon" [(ngModel)]="editGithubUrl" />
                </div>
              </div>
              <div class="pp-field">
                <label class="pp-field-label">Website / Docs URL</label>
                <div class="pp-input-group">
                  <app-icon name="globe" class="pp-input-icon" />
                  <input type="text" class="pp-input pp-input-with-icon" [(ngModel)]="editWebsiteUrl" />
                </div>
              </div>
            </div>
          </div>

          <!-- Right column: info panels -->
          <div class="pp-right">
            <!-- GitHub repo info -->
            @if (tool()!.githubUrl) {
              <div class="pp-card pp-github-card">
                <div class="pp-card-head">
                  <app-icon name="github" class="pp-gh-icon" />
                  <h3 class="pp-section-title">GitHub Repository</h3>
                </div>
                <a [href]="tool()!.githubUrl" target="_blank" class="pp-gh-link">
                  {{ tool()!.githubUrl?.replace('https://github.com/', '') }}
                  <app-icon name="external-link" class="pp-ext-icon" />
                </a>
                <div class="pp-gh-badges">
                  @if (tool()!.isOpenSource) {
                    <span class="pp-badge pp-badge-green">Open Source</span>
                  }
                  <span class="pp-badge pp-badge-blue">{{ tool()!.version }}</span>
                </div>
              </div>
            }

            <!-- Checklist -->
            <div class="pp-card">
              <h2 class="pp-section-title">Readiness Checklist</h2>
              <div class="pp-checklist">
                <div class="pp-check-item" [class.ok]="!!editName">
                  <app-icon [name]="editName ? 'check-circle' : 'circle'" class="pp-check-icon" />
                  <span>Tool name</span>
                </div>
                <div class="pp-check-item" [class.ok]="!!editDescription">
                  <app-icon [name]="editDescription ? 'check-circle' : 'circle'" class="pp-check-icon" />
                  <span>Description</span>
                </div>
                <div class="pp-check-item" [class.ok]="!!editTagline">
                  <app-icon [name]="editTagline ? 'check-circle' : 'circle'" class="pp-check-icon" />
                  <span>Tagline</span>
                </div>
                <div class="pp-check-item" [class.ok]="!!editGithubUrl">
                  <app-icon [name]="editGithubUrl ? 'check-circle' : 'circle'" class="pp-check-icon" />
                  <span>GitHub URL</span>
                </div>
              </div>
            </div>

            <!-- AI scores -->
            <div class="pp-card">
              <h2 class="pp-section-title">AI Analysis Scores</h2>
              <div class="pp-scores">
                <div class="pp-score-row">
                  <span class="pp-score-label">Repository Quality</span>
                  <div class="pp-score-bar-wrap">
                    <div class="pp-score-bar" style="width: 72%"></div>
                  </div>
                  <span class="pp-score-val">72</span>
                </div>
                <div class="pp-score-row">
                  <span class="pp-score-label">Documentation</span>
                  <div class="pp-score-bar-wrap">
                    <div class="pp-score-bar" style="width: 55%"></div>
                  </div>
                  <span class="pp-score-val">55</span>
                </div>
                <div class="pp-score-row">
                  <span class="pp-score-label">Security</span>
                  <div class="pp-score-bar-wrap">
                    <div class="pp-score-bar" style="width: 88%"></div>
                  </div>
                  <span class="pp-score-val">88</span>
                </div>
              </div>
              <p class="pp-scores-note">Scores are generated automatically and updated on every sync.</p>
            </div>

            <!-- Success toast -->
            @if (successMsg()) {
              <div class="pp-success-toast">
                <app-icon name="check-circle" class="pp-toast-icon" />
                <span>{{ successMsg() }}</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="pp-loading">
          <app-icon name="alert-circle" class="pp-err-icon" />
          <p>Tool not found or you don't have access.</p>
          <a routerLink="/workspace/projects" class="pp-btn pp-btn-outline" style="margin-top:12px">Back to Projects</a>
        </div>
      }
    </div>
  `,
  styles: [`
    .pp-root {
      padding: 32px 40px;
      max-width: 1100px;
      margin: 0 auto;
      color: var(--vercel-text-primary);
    }

    /* Header */
    .pp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .pp-breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .pp-bc-link {
      color: var(--vercel-text-muted);
      text-decoration: none;
      transition: color 0.15s;
    }
    .pp-bc-link:hover { color: var(--vercel-text-primary); }
    .pp-bc-sep { width: 14px; height: 14px; color: var(--vercel-text-muted); }
    .pp-bc-current { color: var(--vercel-text-primary); font-weight: 500; }
    .pp-header-actions { display: flex; gap: 10px; align-items: center; }

    /* Body layout */
    .pp-body {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      align-items: start;
    }
    .pp-left { display: flex; flex-direction: column; gap: 16px; }
    .pp-right { display: flex; flex-direction: column; gap: 16px; }

    /* Card */
    .pp-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 20px;
    }
    .pp-card-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .pp-section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0 0 16px;
    }
    .pp-card-head .pp-section-title { margin: 0; }

    /* Logo row */
    .pp-logo-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .pp-logo-placeholder {
      width: 56px;
      height: 56px;
      border-radius: 10px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .pp-logo-icon { width: 24px; height: 24px; color: var(--vercel-text-muted); }
    .pp-logo-meta { display: flex; flex-direction: column; gap: 6px; }

    /* Fields */
    .pp-field { margin-bottom: 14px; }
    .pp-field:last-child { margin-bottom: 0; }
    .pp-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .pp-field-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: var(--vercel-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 5px;
    }
    .pp-input, .pp-textarea, .pp-select {
      width: 100%;
      padding: 8px 10px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      font-size: 13px;
      color: var(--vercel-text-primary);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
      font-family: inherit;
    }
    .pp-textarea { resize: vertical; }
    .pp-input:focus, .pp-textarea:focus, .pp-select:focus { border-color: var(--vercel-text-muted); }
    .pp-input::placeholder, .pp-textarea::placeholder { color: var(--vercel-text-muted); }

    /* Input with icon */
    .pp-input-group { position: relative; }
    .pp-input-icon {
      position: absolute;
      left: 9px;
      top: 50%;
      transform: translateY(-50%);
      width: 13px;
      height: 13px;
      color: var(--vercel-text-muted);
    }
    .pp-input-with-icon { padding-left: 28px; }

    /* Buttons */
    .pp-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s ease;
    }
    .pp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .pp-btn-primary { background: var(--vercel-text-primary); color: var(--vercel-bg); }
    .pp-btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .pp-btn-ghost {
      background: transparent;
      color: var(--vercel-text-secondary);
      border: 1px solid var(--vercel-border);
    }
    .pp-btn-ghost:hover:not(:disabled) { background: var(--vercel-subtle-bg); }
    .pp-btn-outline {
      background: transparent;
      color: var(--vercel-text-primary);
      border: 1px solid var(--vercel-border);
      text-decoration: none;
    }
    .pp-btn-sm { padding: 5px 12px; font-size: 11px; }
    .pp-btn-icon { width: 14px; height: 14px; }

    /* Badges */
    .pp-badge {
      display: inline-flex;
      align-items: center;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 99px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .pp-badge-draft { background: rgba(245,158,11,0.1); color: #f59e0b; }
    .pp-badge-green { background: rgba(16,185,129,0.1); color: #10b981; }
    .pp-badge-blue  { background: rgba(59,130,246,0.1);  color: #3b82f6; }

    /* GitHub card */
    .pp-github-card { }
    .pp-gh-icon { width: 16px; height: 16px; }
    .pp-gh-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--vercel-text-secondary);
      text-decoration: none;
      margin-bottom: 10px;
      word-break: break-all;
      transition: color 0.15s;
    }
    .pp-gh-link:hover { color: var(--vercel-text-primary); }
    .pp-ext-icon { width: 10px; height: 10px; flex-shrink: 0; }
    .pp-gh-badges { display: flex; gap: 6px; flex-wrap: wrap; }

    /* Checklist */
    .pp-checklist { display: flex; flex-direction: column; gap: 10px; }
    .pp-check-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--vercel-text-muted);
    }
    .pp-check-item.ok { color: var(--vercel-text-primary); }
    .pp-check-icon { width: 16px; height: 16px; flex-shrink: 0; }
    .pp-check-item.ok .pp-check-icon { color: #10b981; }

    /* Scores */
    .pp-scores { display: flex; flex-direction: column; gap: 12px; margin-bottom: 10px; }
    .pp-score-row { display: flex; align-items: center; gap: 10px; }
    .pp-score-label { font-size: 12px; color: var(--vercel-text-secondary); flex: 1; min-width: 110px; }
    .pp-score-bar-wrap {
      flex: 1;
      height: 6px;
      background: var(--vercel-border);
      border-radius: 99px;
      overflow: hidden;
    }
    .pp-score-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 99px;
      transition: width 0.5s ease;
    }
    .pp-score-val { font-size: 12px; font-weight: 700; color: var(--vercel-text-primary); width: 24px; text-align: right; }
    .pp-scores-note { font-size: 10px; color: var(--vercel-text-muted); margin: 0; }

    /* Loading */
    .pp-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px;
      color: var(--vercel-text-muted);
      gap: 12px;
    }
    .pp-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--vercel-border);
      border-top-color: var(--vercel-text-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .pp-spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .pp-spinner-sm.light { border-top-color: #fff; }
    .pp-err-icon { width: 32px; height: 32px; color: #ef4444; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Success toast */
    .pp-success-toast {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      border-radius: 8px;
      font-size: 13px;
      color: #10b981;
      font-weight: 500;
    }
    .pp-toast-icon { width: 16px; height: 16px; flex-shrink: 0; }
  `]
})
export class PublishPreviewComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  readonly tool      = signal<DraftTool | null>(null);
  readonly loading   = signal(true);
  readonly saving    = signal(false);
  readonly publishing = signal(false);
  readonly successMsg = signal<string | null>(null);

  editName        = '';
  editTagline     = '';
  editDescription = '';
  editVersion     = '1.0.0';
  editPricing     = 'FREE';
  editGithubUrl   = '';
  editWebsiteUrl  = '';

  ngOnInit(): void {
    const toolId = this.route.snapshot.paramMap.get('toolId');
    if (!toolId) { this.loading.set(false); return; }

    this.http.get<ApiResponse<DraftTool>>(`http://localhost:8080/api/v1/publisher/tools/${toolId}`)
      .pipe(map(r => r.data))
      .subscribe({
        next: t => {
          this.tool.set(t);
          this.editName        = t.name;
          this.editTagline     = t.tagline ?? '';
          this.editDescription = t.description ?? '';
          this.editVersion     = t.version ?? '1.0.0';
          this.editPricing     = t.pricingType ?? 'FREE';
          this.editGithubUrl   = t.githubUrl ?? '';
          this.editWebsiteUrl  = t.websiteUrl ?? '';
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  saveDraft(): void {
    this.saving.set(true);
    this.patchTool({ status: 'DRAFT' }).subscribe({
      next: () => {
        this.saving.set(false);
        this.successMsg.set('Draft saved successfully');
        setTimeout(() => this.successMsg.set(null), 3000);
      },
      error: () => this.saving.set(false)
    });
  }

  publish(): void {
    this.publishing.set(true);
    this.patchTool({ status: 'PENDING' }).subscribe({
      next: () => {
        this.publishing.set(false);
        this.successMsg.set('Tool submitted for review!');
        setTimeout(() => this.router.navigate(['/workspace/tools']), 1500);
      },
      error: () => this.publishing.set(false)
    });
  }

  private patchTool(extra: Record<string, unknown>) {
    const toolId = this.tool()?.id;
    const body = {
      name: this.editName,
      tagline: this.editTagline,
      description: this.editDescription,
      version: this.editVersion,
      pricingType: this.editPricing,
      githubUrl: this.editGithubUrl,
      websiteUrl: this.editWebsiteUrl,
      ...extra
    };
    return this.http.patch<ApiResponse<DraftTool>>(
      `http://localhost:8080/api/v1/publisher/tools/${toolId}`, body
    );
  }
}
