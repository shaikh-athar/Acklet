// client/src/app/pages/workspace/dashboard/dashboard.ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { ToolsService } from '../../../core/services/tools.service';
import { Tool } from '../../../core/models/tool.model';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="dashboard-root page-enter">
      <!-- Title -->
      <header class="dashboard-header mb-8">
        <h1 class="page-title">Workspace Dashboard</h1>
        <p class="page-subtitle">Welcome back! Manage your favorite tools, history, and active sessions.</p>
      </header>

      <!-- Quick Metrics -->
      <div class="metrics-grid mb-8">
        <div class="metric-card">
          <div class="metric-icon-wrap bg-brand">
            <app-icon name="star" class="size-5 text-white" />
          </div>
          <div>
            <div class="metric-value">4</div>
            <div class="metric-label">Favorites Pinned</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap bg-accent">
            <app-icon name="history" class="size-5 text-white" />
          </div>
          <div>
            <div class="metric-value">28</div>
            <div class="metric-label">Runs This Week</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon-wrap bg-purple">
            <app-icon name="folder" class="size-5 text-white" />
          </div>
          <div>
            <div class="metric-value">2</div>
            <div class="metric-label">Custom Collections</div>
          </div>
        </div>
      </div>

      <!-- Main Columns -->
      <div class="dashboard-layout">
        <!-- Pinned Tools -->
        <div class="left-col">
          <div class="section-title-row mb-4">
            <h2 class="section-title">Pinned Tools</h2>
            <a routerLink="/workspace/favorites" class="action-link">Manage Favorites</a>
          </div>

          <div class="pinned-grid">
            @for (tool of pinnedTools(); track tool.id) {
              <a [routerLink]="['/tools', tool.slug]" class="pinned-card card-spotlight" appSpotlight>
                <div class="pinned-icon-wrap" [style.background-color]="tool.color + '15'" [style.border-color]="tool.color + '30'">
                  <app-icon [name]="tool.icon" class="size-5" [style.color]="tool.color" />
                </div>
                <div>
                  <h3 class="pinned-name">{{ tool.name }}</h3>
                  <p class="pinned-cat">{{ tool.categoryName }}</p>
                </div>
                <app-icon name="arrow-right" class="pinned-arrow size-4 ml-auto" />
              </a>
            }
          </div>
        </div>

        <!-- Recent Logs -->
        <div class="right-col">
          <div class="section-title-row mb-4">
            <h2 class="section-title">Recent Run History</h2>
            <a routerLink="/workspace/history" class="action-link">View Logs</a>
          </div>

          <div class="history-list glass">
            @for (log of recentLogs; track log.time) {
              <div class="history-item">
                <app-icon name="check-circle" class="size-4.5 text-feedback-success" />
                <div class="history-meta">
                  <div class="history-tool">{{ log.tool }}</div>
                  <div class="history-details">{{ log.details }}</div>
                </div>
                <span class="history-time">{{ log.time }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-root { min-height: 100vh; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    /* Metrics */
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .metric-card { display: flex; align-items: center; gap: 1rem; padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .metric-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    .bg-brand { background: var(--color-brand-800); }
    .bg-accent { background: var(--color-accent-600); }
    .bg-purple { background: #8b5cf6; }
    .metric-value { font-size: 1.5rem; font-weight: 800; color: var(--color-neutral-100); line-height: 1.1; }
    .metric-label { font-size: 0.75rem; color: var(--color-neutral-500); margin-top: 0.1rem; }

    /* Layout */
    .dashboard-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .section-title-row { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: 1.15rem; font-weight: 700; color: var(--color-neutral-100); }
    .action-link { font-size: 0.8rem; color: var(--color-brand-500); text-decoration: none; font-weight: 600; }
    
    .pinned-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .pinned-card { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); text-decoration: none; color: inherit; }
    .pinned-icon-wrap { width: 38px; height: 38px; border-radius: var(--radius-lg); border: 1px solid transparent; display: flex; align-items: center; justify-content: center; }
    .pinned-name { font-size: 0.9rem; font-weight: 600; color: var(--color-neutral-100); }
    .pinned-cat { font-size: 0.72rem; color: var(--color-neutral-500); }
    .pinned-arrow { color: var(--color-neutral-600); opacity: 0; transform: translateX(-4px); transition: all 0.2s; }
    .pinned-card:hover .pinned-arrow { opacity: 1; transform: translateX(0); }

    /* History list */
    .history-list { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); overflow: hidden; display: flex; flex-direction: column; }
    .history-item { display: flex; align-items: center; gap: 0.875rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-soft); }
    .history-item:last-child { border-bottom: none; }
    .history-meta { flex: 1; }
    .history-tool { font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-200); }
    .history-details { font-size: 0.72rem; color: var(--color-neutral-500); }
    .history-time { font-size: 0.75rem; color: var(--color-neutral-500); }

    .mb-4 { margin-bottom: 1rem; }
    .mb-8 { margin-bottom: 2rem; }
    .ml-auto { margin-left: auto; }

    @media (max-width: 900px) {
      .dashboard-layout { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WorkspaceDashboardComponent {
  private readonly toolsSvc = inject(ToolsService);
  
  readonly pinnedTools = signal<Tool[]>(this.toolsSvc.tools().slice(0, 4));

  readonly recentLogs = [
    { tool: 'JWT Inspector', details: 'Decoded RS256 token (248 chars)', time: '10m ago' },
    { tool: 'JSON Formatter', details: 'Beautified client.json (2.4 KB)', time: '1h ago' },
    { tool: 'Base64 Encoder', details: 'Encoded config buffer', time: '3h ago' }
  ];
}
