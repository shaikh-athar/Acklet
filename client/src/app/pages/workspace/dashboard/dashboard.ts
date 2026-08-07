import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';

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
        </div>
      </div>

      <!-- Main Dashboard Grid (Vercel Overview Layout) -->
      <div class="db-grid">

        <!-- Stats Widget (Left Column) -->
        <div class="db-widget-card">
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

        </div>

        <!-- Projects Grid (Right Column) -->
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
            } @empty {
              <div class="db-empty-state">
                <app-icon name="folder-open" class="db-empty-icon" />
                <p class="db-empty-text">No projects yet</p>
                <a routerLink="/workspace/tools/import" class="db-upgrade-btn">Import your first Tool</a>
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
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Header Bar ─────────────────────────────────────────────── */
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

    .db-search-input::placeholder {
      color: var(--vercel-text-muted);
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

    /* ── Main Grid ──────────────────────────────────────────────── */
    .db-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    @media (min-width: 1024px) {
      .db-grid {
        grid-template-columns: 300px 1fr;
      }
    }

    /* ── Stats Widget ───────────────────────────────────────────── */
    .db-widget-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: fit-content;
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
      flex-shrink: 0;
    }

    .db-status-dot.cyan    { background-color: var(--color-accent-500); }
    .db-status-dot.indigo  { background-color: var(--color-violet-500); }
    .db-status-dot.purple  { background-color: var(--color-violet-400); }
    .db-status-dot.emerald { background-color: var(--vercel-status-success); }

    .db-usage-value {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--vercel-text-primary);
      font-size: 11px;
    }

    .db-widget-footer {
      border-top: 1px solid var(--vercel-border);
      padding-top: 16px;
      display: flex;
      justify-content: flex-end;
    }

    /* ── Buttons ────────────────────────────────────────────────── */
    .db-upgrade-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .db-upgrade-btn:hover {
      background: var(--surface-hover);
    }

    /* ── Projects Section ───────────────────────────────────────── */
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

    /* ── Projects Grid ──────────────────────────────────────────── */
    .db-projects-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    @media (min-width: 640px) {
      .db-projects-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* ── Project Card ───────────────────────────────────────────── */
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
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .db-project-names {
      display: flex;
      flex-direction: column;
      gap: 2px;
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
      background-color: var(--vercel-status-success);
      flex-shrink: 0;
      margin-top: 4px;
    }

    .db-project-bottom {
      border-top: 1px solid var(--vercel-border);
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

    /* ── Empty State ────────────────────────────────────────────── */
    .db-empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 48px 24px;
      border: 1px dashed var(--vercel-border);
      border-radius: 8px;
      text-align: center;
    }

    .db-empty-icon {
      width: 32px;
      height: 32px;
      color: var(--vercel-text-muted);
    }

    .db-empty-text {
      font-size: 13px;
      color: var(--vercel-text-muted);
      margin: 0;
    }
  `],
})
export class WorkspaceDashboardComponent {
  readonly stateSvc = inject(WorkspaceStateService);

  readonly syncedCount = computed(() =>
    this.stateSvc.repos().filter(r => r.syncStatus === 'Synced').length
  );
  readonly syncingCount = computed(() =>
    this.stateSvc.repos().filter(r => r.syncStatus === 'Syncing').length
  );
  readonly analyzedCount = computed(() =>
    this.stateSvc.repos().filter(r => r.toolStatus === 'Published').length
  );

  readonly projects = computed(() =>
    this.stateSvc.repos().map(repo => ({
      id: repo.id,
      name: repo.name.split('/')[1] || repo.name,
      domain: `${repo.name.split('/')[1] || repo.name}.acklet.app`,
      repo: repo.name,
      lastSync: repo.lastSync,
    }))
  );
}
