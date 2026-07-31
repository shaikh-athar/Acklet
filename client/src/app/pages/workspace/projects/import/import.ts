import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { GitHubService, GitHubAccount, GitHubRepo } from '../../../../core/services/github.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';

@Component({
  selector: 'app-project-import',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="ip-container">
      <div class="ip-backdrop" (click)="closeCard()"></div>

      <div class="ip-card">
        <button class="ip-close-btn" (click)="closeCard()">
          <app-icon name="x" class="ip-close-icon" />
        </button>

        <!-- Step 1: Provider Selection -->
        @if (step() === 1) {
          <div class="ip-step-pane">
            <div class="ip-card-header">
              <h1 class="ip-card-title">Import Git Repository</h1>
              <p class="ip-card-subtitle">Select a Git provider to import an existing project from a Git Repository.</p>
            </div>

            <div class="ip-provider-list">
              <button (click)="connectGitHub()" class="ip-provider-btn github" [disabled]="connecting()">
                @if (connecting()) {
                  <div class="ip-mini-spinner"></div>
                } @else {
                  <app-icon name="github" class="ip-provider-icon" />
                }
                <span>Continue with GitHub</span>
              </button>

              <button class="ip-provider-btn gitlab ip-btn-soon" disabled>
                <app-icon name="gitlab" class="ip-provider-icon" />
                <span>Continue with GitLab</span>
                <span class="ip-soon-badge">Soon</span>
              </button>

              <button class="ip-provider-btn bitbucket ip-btn-soon" disabled>
                <app-icon name="bitbucket" class="ip-provider-icon" />
                <span>Continue with Bitbucket</span>
                <span class="ip-soon-badge">Soon</span>
              </button>
            </div>

            @if (connectError()) {
              <div class="ip-error-banner">
                <app-icon name="alert-circle" class="ip-error-icon" />
                <span>{{ connectError() }}</span>
              </div>
            }

            <div class="ip-card-footer">
              <a routerLink="/workspace/settings" class="ip-footer-link">Manage Git Connections ↗</a>
            </div>
          </div>
        }

        <!-- Step 2: Repo Picker -->
        @if (step() === 2) {
          <div class="ip-step-pane">
            <div class="ip-card-header">
              <div class="ip-back-nav" (click)="step.set(1)">
                <app-icon name="arrow-left" class="ip-back-icon" />
                <span>Back to providers</span>
              </div>
              <h1 class="ip-card-title">Import Repository</h1>
            </div>

            <!-- Account selector -->
            @if (accounts().length > 1) {
              <div class="ip-account-row">
                <div class="ip-account-label">Account</div>
                <select class="ip-select" [(ngModel)]="selectedAccountId" (change)="loadRepos()">
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.githubLogin }}</option>
                  }
                </select>
              </div>
            } @else if (accounts().length === 1) {
              <div class="ip-account-chip">
                @if (accounts()[0].avatarUrl) {
                  <img [src]="accounts()[0].avatarUrl" class="ip-account-avatar" alt="" />
                }
                <span class="ip-account-name">{{ accounts()[0].githubLogin }}</span>
                <span class="ip-account-badge">GitHub</span>
              </div>
            }

            <!-- Search -->
            <div class="ip-search-row">
              <app-icon name="search" class="ip-search-icon" />
              <input
                type="text"
                class="ip-search-input"
                placeholder="Search repositories…"
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
              />
            </div>

            <!-- Repo list -->
            <div class="ip-repo-list">
              @if (loadingRepos()) {
                @for (i of [1,2,3,4]; track i) {
                  <div class="ip-repo-skeleton">
                    <div class="ip-skel-name"></div>
                    <div class="ip-skel-desc"></div>
                  </div>
                }
              } @else if (filteredRepos().length === 0) {
                <div class="ip-empty">
                  <app-icon name="folder-x" class="ip-empty-icon" />
                  <p>No repositories found.</p>
                </div>
              } @else {
                @for (repo of filteredRepos(); track repo.id) {
                  <div class="ip-repo-item">
                    <!-- Left: colored language icon badge -->
                    <div class="ip-repo-avatar" [style]="getLangAvatarStyle(repo.language)">
                      <span class="ip-repo-avatar-letter">{{ getLangInitial(repo.language) }}</span>
                    </div>

                    <!-- Center: name + lock + date + desc -->
                    <div class="ip-repo-info">
                      <div class="ip-repo-name-row">
                        <span class="ip-repo-name">{{ repo.name }}</span>
                        @if (repo.privateRepo || repo.private) {
                          <app-icon name="lock" class="ip-lock-icon" />
                        }
                        <span class="ip-repo-dot">·</span>
                        <span class="ip-repo-date">{{ formatDate(repo.pushed_at || repo.pushedAt || repo.updated_at || repo.updatedAt) }}</span>
                      </div>
                      @if (repo.description) {
                        <p class="ip-repo-desc">{{ repo.description }}</p>
                      }
                    </div>

                    <!-- Right: Import button -->
                    <button
                      (click)="startImport(repo)"
                      class="ip-btn ip-btn-primary ip-btn-sm"
                      [disabled]="importingRepo() === (repo.full_name || repo.fullName)"
                    >
                      @if (importingRepo() === (repo.full_name || repo.fullName)) {
                        <div class="ip-mini-spinner sm"></div>
                      } @else {
                        Import
                      }
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- Step 3: Import Progress -->
        @if (step() === 3) {
          <div class="ip-step-pane">
            <div class="ip-card-header">
              <h1 class="ip-card-title status-analyzing">
                <app-icon name="sparkles" class="ip-sparkles-icon animate-pulse" />
                <span>Importing Repository</span>
              </h1>
              <p class="ip-card-subtitle">{{ importingRepo() }}</p>
            </div>

            <div class="ip-progress-steps">
              @for (s of progressSteps(); track s.label) {
                <div class="ip-progress-step" [class.done]="s.done" [class.active]="s.active">
                  <div class="ip-step-indicator">
                    @if (s.done) {
                      <app-icon name="check" class="ip-step-check" />
                    } @else if (s.active) {
                      <div class="ip-mini-spinner sm"></div>
                    } @else {
                      <div class="ip-step-dot"></div>
                    }
                  </div>
                  <div class="ip-step-info">
                    <div class="ip-step-label">{{ s.label }}</div>
                    @if (s.active && currentStep()) {
                      <div class="ip-step-detail">{{ currentStep() }}</div>
                    }
                  </div>
                </div>
              }
            </div>

            @if (importError()) {
              <div class="ip-error-banner">
                <app-icon name="alert-circle" class="ip-error-icon" />
                <span>{{ importError() }}</span>
              </div>
              <div class="ip-card-actions">
                <button (click)="step.set(2)" class="ip-btn ip-btn-secondary">Back to repos</button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .ip-container {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 10;
    }

    .ip-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 1;
    }

    .ip-card {
      position: relative;
      width: 100%;
      max-width: 540px;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 12px;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
      padding: 32px;
      z-index: 2;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
    }

    .ip-step-pane {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .ip-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      color: var(--vercel-text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ip-close-btn:hover {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
    }
    .ip-close-icon { width: 14px; height: 14px; }

    .ip-card-header {
      margin-bottom: 20px;
      flex-shrink: 0;
    }
    .ip-back-nav {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--vercel-text-muted);
      cursor: pointer;
      margin-bottom: 12px;
      transition: color 0.15s;
    }
    .ip-back-nav:hover { color: var(--vercel-text-primary); }
    .ip-back-icon { width: 14px; height: 14px; }

    .ip-card-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }
    .ip-card-title.status-analyzing {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ip-sparkles-icon {
      width: 18px;
      height: 18px;
      color: #06b6d4;
    }
    .ip-card-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 4px 0 0;
    }

    /* Provider buttons */
    .ip-provider-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }
    .ip-provider-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.1s ease;
    }
    .ip-provider-btn:hover:not(:disabled) { opacity: 0.9; }
    .ip-provider-btn:active:not(:disabled) { transform: scale(0.99); }
    .ip-provider-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .ip-provider-btn.github { background: #171515; border: 1px solid rgba(255,255,255,0.08); }
    .ip-provider-btn.gitlab { background: #7928ca; }
    .ip-provider-btn.bitbucket { background: #0052cc; }
    .ip-provider-icon { width: 20px; height: 20px; }

    .ip-btn-soon { position: relative; }
    .ip-soon-badge {
      margin-left: auto;
      font-size: 9px;
      padding: 2px 6px;
      background: rgba(255,255,255,0.15);
      border-radius: 99px;
      letter-spacing: 0.05em;
    }

    .ip-card-footer {
      border-top: 1px solid var(--vercel-border);
      padding-top: 14px;
      text-align: center;
      flex-shrink: 0;
    }
    .ip-footer-link {
      font-size: 12px;
      color: var(--vercel-text-muted);
      text-decoration: none;
      transition: color 0.15s;
    }
    .ip-footer-link:hover { color: var(--vercel-text-primary); }

    /* Error banner */
    .ip-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 6px;
      font-size: 12px;
      color: #ef4444;
      margin-bottom: 12px;
    }
    .ip-error-icon { width: 14px; height: 14px; flex-shrink: 0; }

    /* Account chip */
    .ip-account-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      margin-bottom: 12px;
      flex-shrink: 0;
    }
    .ip-account-avatar {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
    .ip-account-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      flex: 1;
    }
    .ip-account-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      background: var(--vercel-border);
      color: var(--vercel-text-muted);
      border-radius: 4px;
    }

    /* Account select */
    .ip-account-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .ip-account-label {
      font-size: 12px;
      color: var(--vercel-text-muted);
      white-space: nowrap;
    }
    .ip-select {
      flex: 1;
      padding: 6px 10px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      color: var(--vercel-text-primary);
      font-size: 13px;
    }

    /* Search */
    .ip-search-row {
      position: relative;
      margin-bottom: 12px;
      flex-shrink: 0;
    }
    .ip-search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }
    .ip-search-input {
      width: 100%;
      padding: 8px 12px 8px 32px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      font-size: 13px;
      color: var(--vercel-text-primary);
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .ip-search-input::placeholder { color: var(--vercel-text-muted); }
    .ip-search-input:focus { border-color: var(--vercel-text-muted); }

    /* Repo list */
    .ip-repo-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
      overflow-y: auto;
    }
    .ip-repo-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-bottom: 1px solid var(--vercel-border);
      transition: background 0.12s;
    }
    .ip-repo-item:first-child { border-radius: 6px 6px 0 0; }
    .ip-repo-item:last-child  { border-bottom: none; border-radius: 0 0 6px 6px; }
    .ip-repo-item:only-child  { border-radius: 6px; }
    .ip-repo-item:hover { background: var(--vercel-subtle-bg); }

    /* Language avatar */
    .ip-repo-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid var(--vercel-border);
      box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      font-weight: 700;
    }
    .ip-repo-avatar-letter {
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .ip-repo-info { flex: 1; min-width: 0; }
    .ip-repo-name-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .ip-repo-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .ip-lock-icon {
      width: 11px;
      height: 11px;
      color: var(--vercel-text-muted);
      flex-shrink: 0;
    }
    .ip-repo-dot {
      font-size: 12px;
      color: var(--vercel-text-muted);
      flex-shrink: 0;
    }
    .ip-repo-date {
      font-size: 12px;
      color: var(--vercel-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }
    .ip-repo-lang {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border: 1px solid transparent;
      border-radius: 99px;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .ip-repo-desc {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin: 2px 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Skeleton */
    .ip-repo-skeleton {
      padding: 12px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
    }
    .ip-skel-name, .ip-skel-desc {
      border-radius: 4px;
      background: var(--vercel-border);
      animation: pulse 1.5s ease-in-out infinite;
    }
    .ip-skel-name { height: 14px; width: 55%; margin-bottom: 8px; }
    .ip-skel-desc { height: 10px; width: 80%; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

    /* Empty state */
    .ip-empty {
      text-align: center;
      padding: 32px;
      color: var(--vercel-text-muted);
      font-size: 13px;
    }
    .ip-empty-icon { width: 28px; height: 28px; margin: 0 auto 8px; display: block; opacity: 0.5; }

    /* Progress steps */
    .ip-progress-steps {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .ip-progress-step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--vercel-border);
    }
    .ip-progress-step:last-child { border-bottom: none; }
    .ip-step-indicator {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .ip-step-check { width: 18px; height: 18px; color: #10b981; }
    .ip-step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vercel-border);
    }
    .ip-progress-step.done .ip-step-label { color: var(--vercel-text-secondary); }
    .ip-progress-step.active .ip-step-label { color: var(--vercel-text-primary); font-weight: 600; }
    .ip-step-label {
      font-size: 13px;
      color: var(--vercel-text-muted);
    }
    .ip-step-detail {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin-top: 2px;
    }

    /* Buttons */
    .ip-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .ip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ip-btn-primary {
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
    }
    .ip-btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .ip-btn-secondary {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-primary);
    }
    .ip-btn-sm { font-size: 11px; padding: 5px 12px; }

    .ip-card-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }

    /* Spinner */
    .ip-mini-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .ip-mini-spinner.sm { width: 12px; height: 12px; border-width: 2px; border-top-color: var(--vercel-bg); border-color: var(--vercel-border); }
    @keyframes spin { to { transform: rotate(360deg); } }

    .ip-error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      color: #ef4444;
      font-size: 12px;
      font-weight: 500;
      margin-top: 12px;
    }
    .ip-error-icon {
      width: 16px;
      height: 16px;
      color: #ef4444;
      flex-shrink: 0;
    }
  `]
})
export class ProjectImportComponent implements OnInit {
  private readonly router  = inject(Router);
  private readonly route   = inject(ActivatedRoute);
  private readonly gh      = inject(GitHubService);
  private readonly stateSvc = inject(WorkspaceStateService);

  readonly step           = signal(1);
  readonly connecting     = signal(false);
  readonly connectError   = signal<string | null>(null);

  readonly accounts       = signal<GitHubAccount[]>([]);
  readonly repos          = signal<GitHubRepo[]>([]);
  readonly loadingRepos   = signal(false);

  readonly importingRepo  = signal<string | null>(null);
  readonly importError    = signal<string | null>(null);
  readonly currentStep    = signal<string | null>(null);

  searchQuery = '';
  selectedAccountId = '';

  readonly filteredRepos = computed(() => {
    if (!this.searchQuery.trim()) return this.repos();
    const q = this.searchQuery.toLowerCase();
    return this.repos().filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly progressSteps = signal([
    { label: 'Queued',                       done: false, active: false },
    { label: 'Fetching Metadata',             done: false, active: false },
    { label: 'Fetching Repository Structure', done: false, active: false },
    { label: 'Detecting Framework',           done: false, active: false },
    { label: 'Calculating Health',            done: false, active: false },
    { label: 'Completed',                     done: false, active: false },
  ]);

  ngOnInit(): void {
    // Handle redirect back from GitHub OAuth (step=2&accountId=...)
    const stepParam     = this.route.snapshot.queryParamMap.get('step');
    const accountIdParam = this.route.snapshot.queryParamMap.get('accountId');

    if (stepParam === '2') {
      this.loadAccounts(accountIdParam ?? undefined);
    }
  }

  connectGitHub(): void {
    this.connecting.set(true);
    this.connectError.set(null);
    this.gh.getConnectUrl().subscribe({
      next: url => { window.location.href = url; },
      error: () => {
        this.connecting.set(false);
        this.connectError.set('Failed to reach backend. Is the server running?');
      }
    });
  }

  loadAccounts(preselect?: string): void {
    this.gh.listAccounts().subscribe({
      next: accs => {
        this.accounts.set(accs);
        if (accs.length === 0) {
          // No accounts connected — stay on step 1
          return;
        }
        const target = accs.find(a => a.id === preselect) ?? accs[0];
        this.selectedAccountId = target.id;
        this.step.set(2);
        this.loadRepos();
      },
      error: () => {
        this.step.set(2);
      }
    });
  }

  loadRepos(): void {
    if (!this.selectedAccountId) return;
    this.loadingRepos.set(true);
    this.repos.set([]);
    this.gh.listRepos(this.selectedAccountId, 1, 50).subscribe({
      next: repos => { this.repos.set(repos); this.loadingRepos.set(false); },
      error: () => { this.loadingRepos.set(false); }
    });
  }

  onSearch(): void {
    // filteredRepos computed signal handles filtering reactively
  }

  startImport(repo: GitHubRepo): void {
    const fullName = repo.full_name || repo.fullName || '';
    this.importingRepo.set(fullName);
    this.importError.set(null);

    this.gh.importRepo(this.selectedAccountId, fullName).subscribe({
      next: job => {
        this.step.set(3);
        this.pollImportStatus(job.jobId);
      },
      error: () => {
        this.importingRepo.set(null);
        this.importError.set('Failed to start import. Please try again.');
      }
    });
  }

  private pollImportStatus(jobId: string): void {
    const STATUS_MAP: Record<string, number> = {
      PENDING: 0,
      CLONING: 1, // Fetching Metadata
      ANALYZING: 2, // Fetching Tree
      AI_GENERATION: 3, // Framework detection
      HEALTH_CALC: 4, // Calculating health
      DONE: 5
    };

    const poll = () => {
      this.gh.getImportStatus(jobId).subscribe({
        next: job => {
          this.currentStep.set(job.currentStep ?? null);

          const activeIdx = STATUS_MAP[job.status] ?? 0;
          this.progressSteps.update(steps =>
            steps.map((s, i) => ({
              ...s,
              done:   i < activeIdx || job.status === 'DONE',
              active: i === activeIdx && job.status !== 'DONE' && job.status !== 'FAILED',
            }))
          );

          if (job.status === 'DONE') {
            this.stateSvc.refreshRepos();
            if (job.toolId) {
              setTimeout(() => {
                this.router.navigate(['/workspace/projects/publish', job.toolId]);
              }, 800);
            }
          } else if (job.status === 'FAILED') {
            this.importError.set(job.errorMessage ?? 'Import failed. Please try again.');
          } else {
            setTimeout(poll, 1500);
          }
        },
        error: () => setTimeout(poll, 3000)
      });
    };

    setTimeout(poll, 1000);
  }

  closeCard(): void {
    this.router.navigate(['/workspace/projects']);
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getLangStyle(lang: string): string {
    const map: Record<string, { bg: string; color: string }> = {
      'TypeScript':   { bg: 'rgba(49,120,198,0.12)',  color: '#3178c6' },
      'JavaScript':   { bg: 'rgba(240,219,79,0.15)',  color: '#c0a000' },
      'Python':       { bg: 'rgba(55,118,171,0.12)',  color: '#3776ab' },
      'Java':         { bg: 'rgba(176,114,25,0.12)',  color: '#b07219' },
      'Kotlin':       { bg: 'rgba(168,114,255,0.12)', color: '#a97bff' },
      'Swift':        { bg: 'rgba(240,81,56,0.12)',   color: '#f05138' },
      'Go':           { bg: 'rgba(0,173,216,0.12)',   color: '#00add8' },
      'Rust':         { bg: 'rgba(222,165,132,0.15)', color: '#a9581a' },
      'C#':           { bg: 'rgba(104,33,122,0.12)',  color: '#68217a' },
      'C++':          { bg: 'rgba(243,75,125,0.12)',  color: '#f34b7d' },
      'C':            { bg: 'rgba(85,85,85,0.12)',    color: '#555555' },
      'PHP':          { bg: 'rgba(119,123,180,0.12)', color: '#777bb4' },
      'Ruby':         { bg: 'rgba(112,21,22,0.12)',   color: '#701516' },
      'HTML':         { bg: 'rgba(227,76,38,0.12)',   color: '#e34c26' },
      'CSS':          { bg: 'rgba(86,61,124,0.12)',   color: '#563d7c' },
      'SCSS':         { bg: 'rgba(198,83,140,0.12)',  color: '#c6538c' },
      'Shell':        { bg: 'rgba(137,224,81,0.12)',  color: '#4caf1e' },
      'Dart':         { bg: 'rgba(0,180,171,0.12)',   color: '#00b4ab' },
      'Vue':          { bg: 'rgba(65,184,131,0.12)',  color: '#41b883' },
      'Svelte':       { bg: 'rgba(255,62,0,0.12)',    color: '#ff3e00' },
      'Dockerfile':   { bg: 'rgba(33,150,243,0.12)',  color: '#2496ed' },
    };
    const style = map[lang];
    if (!style) return 'background:rgba(120,120,120,0.1);color:var(--vercel-text-muted)';
    return `background:${style.bg};color:${style.color};border-color:${style.color}30`;
  }

  getLangAvatarStyle(lang?: string): string {
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      'TypeScript':  { bg: 'linear-gradient(135deg, #3178c6, #235a97)', color: '#fff', border: '#3178c6' },
      'JavaScript':  { bg: 'linear-gradient(135deg, #f7df1e, #d4be19)', color: '#000', border: '#f7df1e' },
      'Python':      { bg: 'linear-gradient(135deg, #3776ab, #2b5b84)', color: '#fff', border: '#3776ab' },
      'Java':        { bg: 'linear-gradient(135deg, #b07219, #8c5a14)', color: '#fff', border: '#b07219' },
      'Kotlin':      { bg: 'linear-gradient(135deg, #a97bff, #855be6)', color: '#fff', border: '#a97bff' },
      'Swift':       { bg: 'linear-gradient(135deg, #f05138, #c43e28)', color: '#fff', border: '#f05138' },
      'Go':          { bg: 'linear-gradient(135deg, #00add8, #0087a8)', color: '#fff', border: '#00add8' },
      'Rust':        { bg: 'linear-gradient(135deg, #a9581a, #854314)', color: '#fff', border: '#a9581a' },
      'C#':          { bg: 'linear-gradient(135deg, #68217a, #521961)', color: '#fff', border: '#68217a' },
      'C++':         { bg: 'linear-gradient(135deg, #f34b7d, #cc3b67)', color: '#fff', border: '#f34b7d' },
      'C':           { bg: 'linear-gradient(135deg, #555555, #3c3c3c)', color: '#fff', border: '#555555' },
      'PHP':         { bg: 'linear-gradient(135deg, #777bb4, #5f6291)', color: '#fff', border: '#777bb4' },
      'Ruby':        { bg: 'linear-gradient(135deg, #701516, #591011)', color: '#fff', border: '#701516' },
      'HTML':        { bg: 'linear-gradient(135deg, #e34c26, #b83a1b)', color: '#fff', border: '#e34c26' },
      'CSS':         { bg: 'linear-gradient(135deg, #563d7c, #422d60)', color: '#fff', border: '#563d7c' },
      'SCSS':        { bg: 'linear-gradient(135deg, #c6538c, #a13f70)', color: '#fff', border: '#c6538c' },
      'Shell':       { bg: 'linear-gradient(135deg, #4caf1e, #3a8a15)', color: '#fff', border: '#4caf1e' },
      'Dart':        { bg: 'linear-gradient(135deg, #00b4ab, #009189)', color: '#fff', border: '#00b4ab' },
      'Vue':         { bg: 'linear-gradient(135deg, #41b883, #339469)', color: '#fff', border: '#41b883' },
      'Svelte':      { bg: 'linear-gradient(135deg, #ff3e00, #cc3100)', color: '#fff', border: '#ff3e00' },
      'Dockerfile':  { bg: 'linear-gradient(135deg, #2496ed, #1c78be)', color: '#fff', border: '#2496ed' },
    };
    const c = lang ? (colors[lang] ?? { bg: 'linear-gradient(135deg, #888888, #666666)', color: '#fff', border: '#888888' }) : { bg: 'linear-gradient(135deg, #888888, #666666)', color: '#fff', border: '#888888' };
    return `background:${c.bg};color:${c.color};border-color:${c.border}`;
  }

  getLangInitial(lang?: string): string {
    if (!lang) return '?';
    // Special short abbreviations
    const abbr: Record<string, string> = {
      'TypeScript': 'TS', 'JavaScript': 'JS', 'Python': 'Py',
      'Kotlin': 'Kt', 'Swift': 'Sw', 'Rust': 'Rs',
      'Dockerfile': 'Dk', 'Shell': 'Sh', 'Ruby': 'Rb',
      'HTML': 'HT', 'SCSS': 'SC', 'Dart': 'Da', 'Svelte': 'Sv',
    };
    return abbr[lang] ?? lang.charAt(0);
  }
}
