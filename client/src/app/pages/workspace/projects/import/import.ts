import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { GitHubService, GitHubAccount, GitHubRepo } from '../../../../core/services/github.service';
import { WorkspaceStateService, RepositoryItem } from '../../../../core/services/workspace-state.service';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-project-import',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="ip-container">
      <div class="ip-backdrop" (click)="closeCard()"></div>

      <div class="ip-card">
        @if (step() === 3) {
          <button class="ip-stop-header-btn" (click)="onCancelImport()">
            <span>Stop</span>
          </button>
        } @else {
          <button class="ip-close-btn" (click)="closeCard()" aria-label="Close">
            <app-icon name="x" class="ip-close-icon" />
          </button>
        }

        <!-- Mode: Deploy (Show already imported repos) -->
        @if (mode() === 'deploy' && (step() === 1 || step() === 2)) {
          <div class="ip-step-pane">
            <div class="ip-card-header">
              <h1 class="ip-card-title">Deploy Repository to Tools</h1>
              <p class="ip-card-subtitle">Select an imported repository to build and deploy as a live tool on Acklet.</p>
            </div>

            <!-- Search -->
            <div class="ip-search-row">
              <app-icon name="search" class="ip-search-icon" />
              <input
                type="text"
                class="ip-search-input"
                placeholder="Search imported repositories…"
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
              />
            </div>

            <!-- Repo list -->
            <div class="ip-repo-list">
              @if (stateSvc.repos().length === 0) {
                <div class="ip-empty">
                  <app-icon name="folder-x" class="ip-empty-icon" />
                  <p>No imported repositories found in workspace.</p>
                </div>
              } @else if (filteredImportedRepos().length === 0) {
                <div class="ip-empty">
                  <app-icon name="search" class="ip-empty-icon" />
                  <p>No matching repositories found.</p>
                </div>
              } @else {
                @for (repo of filteredImportedRepos(); track repo.id) {
                  <div class="ip-repo-item">
                    <!-- Left: colored language icon badge -->
                    <div class="ip-repo-avatar" [style]="getLangAvatarStyle(repo.language)">
                      <span class="ip-repo-avatar-letter">{{ getLangInitial(repo.language) }}</span>
                    </div>

                    <!-- Center: name + visibility + desc -->
                    <div class="ip-repo-info">
                      <div class="ip-repo-name-row">
                        <span class="ip-repo-name">{{ repo.name.split('/')[1] || repo.name }}</span>
                        @if (repo.visibility === 'Private') {
                          <app-icon name="lock" class="ip-lock-icon" />
                        }
                      </div>
                      @if (repo.description) {
                        <p class="ip-repo-desc">{{ repo.description }}</p>
                      }
                    </div>

                    <!-- Right: Deploy button -->
                    <button
                      (click)="deployImportedRepo(repo)"
                      class="ip-btn ip-btn-primary ip-btn-sm"
                      [disabled]="importingRepo() === repo.name"
                    >
                      @if (importingRepo() === repo.name) {
                        <div class="ip-mini-spinner sm"></div>
                      } @else {
                        Deploy Repo to Tools
                      }
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- Mode: Import (Show provider connection / remote repos list) -->
        @if (mode() === 'import') {
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

          <!-- Step 2: Remote Repo Picker -->
          @if (step() === 2) {
            <div class="ip-step-pane">
              <div class="ip-card-header">
                <div class="ip-back-nav" (click)="step.set(1)">
                  <app-icon name="arrow-left" class="ip-back-icon" />
                  <span>Back to providers</span>
                </div>
                <h1 class="ip-card-title">Import & Deploy Repository</h1>
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

                      <!-- Center: name + lock + desc -->
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
                          Import & Deploy
                        }
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          }
        }

        <!-- Step 3: Deployment Progress -->
        @if (step() === 3) {
          <div class="ip-step-pane">
            <div class="ip-card-header">
              <h1 class="ip-card-title status-analyzing">
                <div class="ip-loader-wrap" [class.done]="importStatus() === 'DONE'" [class.failed]="importStatus() === 'FAILED'" [class.running]="importStatus() === 'RUNNING' || importStatus() === 'PENDING'">
                  <app-icon name="upload-cloud" class="ip-sparkles-icon" />
                  <div class="ip-loader-ring"></div>
                </div>
                <span>Deploying Live Tool</span>
              </h1>
              <p class="ip-card-subtitle">{{ importingRepo() }}</p>
            </div>

            <div class="ip-progress-steps">
              @for (s of progressSteps(); track s.label) {
                <div class="ip-progress-step" [class.done]="s.done" [class.active]="s.active">
                  <div class="ip-step-indicator">
                    @if (s.done) {
                      <app-icon name="check" class="ip-step-check" />
                    } @else if (s.failed) {
                      <app-icon name="x" class="ip-step-fail" />
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
                <button (click)="step.set(2)" class="ip-btn ip-btn-secondary">Back</button>
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

    .ip-stop-header-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #ef4444;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ip-card-header {
      margin-bottom: 28px;
      flex-shrink: 0;
      padding: 7px;
    }

    .ip-back-nav {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--vercel-text-muted);
      cursor: pointer;
      margin-bottom: 12px;
      transition: color 0.15;
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
      gap: 14px;
      margin-bottom: 8px;
    }
    .ip-loader-wrap {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(6, 182, 212, 0.08);
      border-radius: 50%;
      flex-shrink: 0;
      transition: background-color 0.25s ease;
    }
    .ip-loader-wrap.done {
      background: rgba(16, 185, 129, 0.08);
    }
    .ip-loader-wrap.done .ip-sparkles-icon {
      color: #10b981;
    }
    .ip-loader-wrap.done .ip-loader-ring {
      border-color: #10b981;
      animation: none;
      inset: -2px;
    }
    .ip-loader-wrap.failed {
      background: rgba(239, 68, 68, 0.08);
    }
    .ip-loader-wrap.failed .ip-sparkles-icon {
      color: #ef4444;
    }
    .ip-loader-wrap.failed .ip-loader-ring {
      border-color: #ef4444;
      animation: none;
      inset: -2px;
    }
    .ip-sparkles-icon {
      width: 14px;
      height: 14px;
      color: #06b6d4;
      transition: color 0.25s ease;
    }
    .ip-loader-ring {
      position: absolute;
      inset: -2px;
      border: 2px solid transparent;
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      transition: border-color 0.25s ease;
    }
    .ip-card-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 4px 0 0;
    }

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

    .ip-repo-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0;
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .ip-repo-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-bottom: 1px solid var(--vercel-border);
      transition: background 0.12s;
    }
    .ip-repo-item:hover { background: var(--vercel-subtle-bg); }

    .ip-repo-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid var(--vercel-border);
      font-weight: 700;
    }
    .ip-repo-avatar-letter {
      font-size: 11px;
      font-weight: 800;
      line-height: 1;
      text-transform: uppercase;
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
    .ip-repo-desc {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin: 2px 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ip-repo-skeleton {
      padding: 12px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      margin-bottom: 8px;
    }
    .ip-skel-name { height: 14px; width: 50%; background: var(--vercel-border); margin-bottom: 6px; border-radius: 4px; }
    .ip-skel-desc { height: 10px; width: 75%; background: var(--vercel-border); border-radius: 4px; }

    .ip-empty {
      text-align: center;
      padding: 32px;
      color: var(--vercel-text-muted);
      font-size: 13px;
    }
    .ip-empty-icon { width: 28px; height: 28px; margin: 0 auto 8px; display: block; opacity: 0.5; }

    .ip-progress-steps {
      display: flex;
      flex-direction: column;
      margin-top: 12px;
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
    }
    .ip-step-check { width: 18px; height: 18px; color: #10b981; }
    .ip-step-fail { width: 14px; height: 14px; color: #ef4444; }
    .ip-step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vercel-border);
    }
    .ip-step-label {
      font-size: 13px;
      color: var(--vercel-text-muted);
    }
    .ip-step-detail {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin-top: 2px;
    }

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

    .ip-mini-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .ip-mini-spinner.sm {
      width: 12px;
      height: 12px;
      border: 2px solid var(--vercel-border);
      border-top-color: var(--vercel-text-primary, #171717);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
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
  readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);

  readonly step           = signal(1);
  readonly mode           = signal<'import' | 'deploy'>('import');
  readonly connecting     = signal(false);
  readonly connectError   = signal<string | null>(null);

  readonly accounts       = signal<GitHubAccount[]>([]);
  readonly repos          = signal<GitHubRepo[]>([]);
  readonly loadingRepos   = signal(false);
  selectedAccountId = '';

  readonly importingRepo  = signal<string | null>(null);
  readonly importError    = signal<string | null>(null);
  readonly importStatus   = signal<'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | null>(null);
  readonly currentStep    = signal<string | null>(null);
  activeJobId: string | null = null;

  searchQuery = '';

  readonly filteredImportedRepos = computed(() => {
    const list = this.stateSvc.repos();
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase().trim();
    return list.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly filteredRepos = computed(() => {
    const list = this.repos();
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase().trim();
    return list.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.description?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly progressSteps = signal<Array<{ label: string; done: boolean; active: boolean; failed?: boolean }>>([
    { label: 'Queued',                       done: false, active: false },
    { label: 'Cloning Repository',            done: false, active: false },
    { label: 'Analyzing Structure',           done: false, active: false },
    { label: 'Building & Packaging',          done: false, active: false },
    { label: 'Deploying Live Sandbox',        done: false, active: false },
    { label: 'Completed',                     done: false, active: false },
  ]);

  ngOnInit(): void {
    // Determine mode based on query params
    const modeParam = this.route.snapshot.queryParamMap.get('mode');
    if (modeParam === 'deploy') {
      this.mode.set('deploy');
      this.step.set(2);
      this.gh.listAccounts().subscribe({
        next: accs => {
          this.accounts.set(accs);
          if (accs.length > 0) {
            this.selectedAccountId = accs[0].id;
          }
        }
      });
    } else {
      this.mode.set('import');
      const stepParam     = this.route.snapshot.queryParamMap.get('step');
      const accountIdParam = this.route.snapshot.queryParamMap.get('accountId');

      if (stepParam === '2') {
        this.loadAccounts(accountIdParam ?? undefined);
      } else {
        this.step.set(1);
        this.gh.listAccounts().subscribe({
          next: accs => {
            this.accounts.set(accs);
            if (accs.length > 0) {
              this.selectedAccountId = accs[0].id;
            }
          }
        });
      }
    }
  }

  connectGitHub(): void {
    this.connecting.set(true);
    this.connectError.set(null);
    this.gh.getConnectUrl().subscribe({
      next: url => { window.location.href = url; },
      error: () => {
        this.connecting.set(false);
        this.connectError.set('Failed to reach Git provider backend.');
      }
    });
  }

  loadAccounts(preselect?: string): void {
    this.gh.listAccounts().subscribe({
      next: accs => {
        this.accounts.set(accs);
        if (accs.length > 0) {
          const target = accs.find(a => a.id === preselect) ?? accs[0];
          this.selectedAccountId = target.id;
          this.step.set(2);
          this.loadRepos();
        }
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
  }

  deployImportedRepo(repo: RepositoryItem): void {
    if (!this.selectedAccountId) {
      this.importError.set('No connected GitHub account found. Please connect your account in Settings.');
      return;
    }
    this.importingRepo.set(repo.name);
    this.importError.set(null);
    this.importStatus.set('PENDING');
    this.step.set(3);

    this.gh.importRepo(this.selectedAccountId, repo.name).subscribe({
      next: job => {
        this.activeJobId = job.jobId;
        this.pollImportStatus(job.jobId);
      },
      error: () => {
        this.importingRepo.set(null);
        this.step.set(2);
        this.importError.set('Failed to queue deployment. Please try again.');
      }
    });
  }

  startImport(repo: GitHubRepo): void {
    const fullName = repo.full_name || repo.fullName || '';
    this.importingRepo.set(fullName);
    this.importError.set(null);
    this.importStatus.set('PENDING');
    this.step.set(3);

    this.gh.importRepo(this.selectedAccountId, fullName).subscribe({
      next: job => {
        this.activeJobId = job.jobId;
        this.pollImportStatus(job.jobId);
      },
      error: () => {
        this.importingRepo.set(null);
        this.step.set(2);
        this.importError.set('Failed to queue deployment. Please try again.');
      }
    });
  }

  private pollImportStatus(jobId: string): void {
    const STATUS_MAP: Record<string, number> = {
      PENDING: 0,
      CLONING: 1,
      ANALYZING: 2,
      AI_GENERATION: 3,
      HEALTH_CALC: 4,
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
              failed: i === activeIdx && job.status === 'FAILED'
            }))
          );

          if (job.status === 'DONE') {
            this.importStatus.set('DONE');
            this.stateSvc.refreshRepos();
            this.stateSvc.refreshTools(); // Automatically refresh tools
            setTimeout(() => {
              this.closeCard();
            }, 1200);
          } else if (job.status === 'FAILED') {
            this.importStatus.set('FAILED');
            this.importError.set(job.errorMessage ?? 'Deployment failed. Please check build configuration.');
          } else {
            this.importStatus.set('RUNNING');
            setTimeout(poll, 1500);
          }
        },
        error: () => setTimeout(poll, 3000)
      });
    };

    setTimeout(poll, 1000);
  }

  closeCard(): void {
    this.router.navigate(['/workspace/tools']);
  }

  async onCancelImport(): Promise<void> {
    if (this.step() === 3 && this.activeJobId) {
      const stop = await this.dialogSvc.confirm('Do you really want to stop the deployment?', 'Cancel Build');
      if (stop) {
        this.gh.cancelImport(this.activeJobId).subscribe({
          next: () => {
            this.closeCard();
          },
          error: (err) => {
            console.error('Failed to cancel import:', err);
            this.closeCard();
          }
        });
      }
    } else {
      this.closeCard();
    }
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    const abbr: Record<string, string> = {
      'TypeScript': 'TS', 'JavaScript': 'JS', 'Python': 'Py',
      'Kotlin': 'Kt', 'Swift': 'Sw', 'Rust': 'Rs',
      'Dockerfile': 'Dk', 'Shell': 'Sh', 'Ruby': 'Rb',
      'HTML': 'HT', 'SCSS': 'SC', 'Dart': 'Da', 'Svelte': 'Sv',
    };
    return abbr[lang] ?? lang.charAt(0);
  }
}
