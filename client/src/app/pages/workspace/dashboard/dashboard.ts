import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { ToolsService } from '../../../core/services/tools.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';
import { FeedbackService, FeedbackResponse } from '../../../core/services/feedback.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="db-wrapper">
      <!-- Search & Quick Action Header Bar -->
      <div class="db-header-bar">
        <div class="db-search-box">
          <app-icon name="search" class="db-search-icon" />
          <input type="text" placeholder="Search Projects..." class="db-search-input" />
        </div>
 
        <div class="db-actions">
          <div class="db-view-toggle">
            <button class="db-toggle-btn active">
              <app-icon name="layout-grid" class="db-toggle-icon" />
            </button>
            <button class="db-toggle-btn">
              <app-icon name="list" class="db-toggle-icon" />
            </button>
          </div>
          <a routerLink="/workspace/projects/import" class="db-add-btn">
            <span>Add New...</span>
            <app-icon name="chevron-down" class="db-add-btn-icon" />
          </a>
        </div>
      </div>
 
      <!-- Main Dashboard Grid (Vercel Overview Layout) -->
      <div class="db-grid">
        <!-- Stats Widget (Left Column) -->
        <div class="db-widget-card usage-card">
          <div class="db-widget-header">
            <span class="db-widget-title">Workspace Overview</span>
            <span class="db-widget-subtitle">Live Stats</span>
          </div>

          <div class="db-usage-list">
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot cyan"></span>
                <span>Connected Repos</span>
              </div>
              <span class="db-usage-value">{{ stateSvc.repos().length }}</span>
            </div>
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot emerald"></span>
                <span>Synced</span>
              </div>
              <span class="db-usage-value">{{ syncedCount() }}</span>
            </div>
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot indigo"></span>
                <span>Syncing / Pending</span>
              </div>
              <span class="db-usage-value">{{ syncingCount() }}</span>
            </div>
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot purple"></span>
                <span>AI Analyzed</span>
              </div>
              <span class="db-usage-value">{{ analyzedCount() }}</span>
            </div>
          </div>

          <div class="db-widget-footer">
            <a routerLink="/workspace/projects/import" class="db-upgrade-btn">
              Import Repository
            </a>
          </div>
        </div>

        <!-- Projects Grid (Right 2 Columns) -->
        <div class="db-projects-section">
          <div class="db-section-header">
            <h2 class="db-section-title">Projects</h2>
            <a routerLink="/workspace/projects" class="db-view-all-link">View All →</a>
          </div>
 
          <div class="db-projects-grid">
            @for (project of projects(); track project.id) {
              <div class="db-project-card">
                <div class="db-project-top">
                  <div class="db-project-info">
                    <div class="db-project-avatar">
                      {{ project.name[0].toUpperCase() }}
                    </div>
                    <div class="db-project-names">
                      <a [routerLink]="['/workspace/tools/manage', project.id]" class="db-project-title">
                        {{ project.name }}
                      </a>
                      <div class="db-project-domain">{{ project.domain }}</div>
                    </div>
                  </div>
                  <span class="db-project-status-dot"></span>
                </div>
 
                <div class="db-project-bottom">
                  <div class="db-project-repo">
                    <app-icon name="git-branch" class="db-project-repo-icon" />
                    <span>{{ project.repo }}</span>
                  </div>
                  <span class="db-project-time">{{ project.lastSync }}</span>
                </div>
              </div>
            }
          </div>

          <!-- Section: My Submitted Tool Feedback -->
          <div class="db-section-header mt-8">
            <h2 class="db-section-title flex items-center gap-2">
              <app-icon name="message-square" class="size-4 text-cyan-500" />
              <span>My Submitted Feedback ({{ userFeedback().length }})</span>
            </h2>
          </div>

          <div class="user-fb-list">
            @for (fb of userFeedback(); track fb.id) {
              <div class="user-fb-card">
                <div class="user-fb-head">
                  <div class="flex items-center gap-2">
                    <span class="user-fb-tool font-bold text-slate-200">{{ fb.toolName || fb.toolId }}</span>
                    <span class="user-fb-category badge-cat">{{ fb.category }}</span>
                    <span class="user-fb-rating text-amber-500 font-bold">★ {{ fb.rating }}</span>
                  </div>
                  <span class="badge" [ngClass]="getStatusBadgeClass(fb.status)">{{ fb.status }}</span>
                </div>
                <p class="user-fb-msg">{{ fb.message }}</p>
                <div class="user-fb-foot">
                  <span>Submitted {{ fb.createdAt | date:'mediumDate' }}</span>
                  <span class="text-slate-500">Source: {{ fb.source }}</span>
                </div>
              </div>
            } @empty {
              <div class="empty-fb-card">
                <p class="text-xs text-slate-500">You haven't submitted any feedback yet. Share your thoughts directly from any tool!</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .db-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .db-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .db-search-box {
      position: relative;
      flex: 1;
      max-width: 480px;
    }
 
    .db-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }
 
    .db-search-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      font-size: 13px;
      color: var(--vercel-text-primary);
      outline: none;
      transition: border-color 0.15s ease;
    }
 
    .db-search-input:focus {
      border-color: var(--vercel-text-muted);
    }
 
    .db-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
 
    .db-view-toggle {
      display: flex;
      align-items: center;
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 2px;
      background: var(--vercel-subtle-bg);
    }
 
    .db-toggle-btn {
      background: transparent;
      border: none;
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--vercel-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }
 
    .db-toggle-btn.active {
      background: var(--vercel-card-bg);
      color: var(--vercel-text-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
 
    .db-toggle-icon {
      width: 14px;
      height: 14px;
    }
 
    .db-add-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 6px;
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      transition: opacity 0.15s ease;
    }
 
    .db-add-btn:hover {
      opacity: 0.9;
    }
 
    .db-add-btn-icon {
      width: 12px;
      height: 12px;
    }
 
    .db-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
 
    @media (min-width: 1024px) {
      .db-grid {
        grid-template-columns: 320px 1fr;
      }
    }
 
    .db-widget-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .db-widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
 
    .db-widget-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }
 
    .db-widget-subtitle {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    .db-usage-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
 
    .db-usage-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vercel-text-secondary);
    }
 
    .db-usage-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
 
    .db-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
 
    .db-status-dot.cyan { background-color: #06b6d4; }
    .db-status-dot.indigo { background-color: #6366f1; }
    .db-status-dot.purple { background-color: #a855f7; }
    .db-status-dot.emerald { background-color: #10b981; }
 
    .db-usage-value {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--vercel-text-primary);
      font-size: 11px;
    }
 
    .db-widget-footer {
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
 
    .db-upgrade-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
 
    .db-upgrade-btn:hover {
      background: var(--surface-hover);
    }
 
    .db-projects-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .db-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
 
    .db-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      letter-spacing: 0.5px;
      margin: 0;
    }
 
    .db-view-all-link {
      font-size: 12px;
      color: var(--vercel-text-secondary);
      text-decoration: none;
      transition: color 0.15s ease;
    }
 
    .db-view-all-link:hover {
      color: var(--vercel-text-primary);
    }
 
    .db-projects-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
 
    @media (min-width: 640px) {
      .db-projects-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    .db-project-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
 
    .db-project-card:hover {
      border-color: var(--vercel-text-muted);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
 
    .db-project-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
 
    .db-project-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
 
    .db-project-avatar {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #000;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
 
    html[data-theme="dark"] .db-project-avatar {
      background: #fff;
      color: #000;
    }
 
    .db-project-names {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
 
    .db-project-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
 
    .db-project-title:hover {
      text-decoration: underline;
    }
 
    .db-project-domain {
      font-size: 11px;
      color: var(--vercel-text-muted);
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
 
    .db-project-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #10b981;
      flex-shrink: 0;
    }
 
    .db-project-bottom {
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    .db-project-repo {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
 
    .db-project-repo-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
 
    .db-project-time {
      flex-shrink: 0;
    }

    /* User Feedback Styles */
    .user-fb-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 12px;
    }
    .user-fb-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .user-fb-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .badge-cat {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-muted);
    }
    .user-fb-msg {
      font-size: 13px;
      color: var(--vercel-text-primary);
      margin: 0;
      line-height: 1.4;
    }
    .user-fb-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--vercel-text-muted);
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 6px;
    }
    .empty-fb-card {
      padding: 20px;
      text-align: center;
      background: var(--vercel-card-bg);
      border: 1px dashed var(--vercel-border);
      border-radius: 8px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-info { background: rgba(33, 150, 243, 0.1); color: #2196f3; border: 1px solid rgba(33, 150, 243, 0.2); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .badge-purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); }
    .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .badge-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
    .badge-gray { background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }
  `],
})
export class WorkspaceDashboardComponent {
  readonly stateSvc = inject(WorkspaceStateService);
  private readonly feedbackSvc = inject(FeedbackService);
  private readonly authSvc = inject(AuthService);

  readonly userFeedback = signal<FeedbackResponse[]>([]);

  readonly syncedCount = computed(() => this.stateSvc.repos().filter(r => r.syncStatus === 'Synced').length);
  readonly syncingCount = computed(() => this.stateSvc.repos().filter(r => r.syncStatus === 'Syncing').length);
  readonly analyzedCount = computed(() => this.stateSvc.repos().filter(r => r.toolStatus === 'Published').length);

  constructor() {
    this.loadUserFeedback();
  }

  loadUserFeedback(): void {
    const user = this.authSvc.currentUser();
    this.feedbackSvc.getUserFeedback(user?.id).subscribe({
      next: (res) => {
        this.userFeedback.set(res?.data?.content || []);
      },
      error: () => {}
    });
  }

  getStatusBadgeClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'NEW': return 'badge-info';
      case 'REVIEWING': return 'badge-warning';
      case 'PLANNED': return 'badge-purple';
      case 'RESOLVED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-gray';
    }
  }

  readonly projects = computed(() => {
    return this.stateSvc.repos().map(repo => ({
      id: repo.id,
      name: repo.name.split('/')[1] || repo.name,
      domain: `${repo.name.split('/')[1] || repo.name}.acklet.app`,
      repo: repo.name,
      lastSync: repo.lastSync
    }));
  });
}


