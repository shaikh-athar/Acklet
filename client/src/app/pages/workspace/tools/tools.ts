import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';

interface Tool {
  id: string;
  name: string;
  description: string;
  lang: string;
  langColor: string;
  status: 'Published' | 'Draft' | 'In Review';
  downloads: number;
  stars: number;
  lastUpdated: string;
}

@Component({
  selector: 'app-workspace-tools',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="tl-root">
      <!-- Page Header -->
      <div class="tl-page-header">
        <div>
          <h1 class="tl-page-title">Tools</h1>
          <p class="tl-page-subtitle">Manage and monitor all developer tools linked to your workspace.</p>
        </div>
        <a routerLink="/workspace/tools/import" class="tl-cta-btn" style="text-decoration: none;">
          <app-icon name="plus" class="tl-cta-icon" />
          <span>Add Tool</span>
        </a>
      </div>

      <!-- Stats Strip -->
      <div class="tl-stats-row">
        <div class="tl-stat-card">
          <div class="tl-stat-value">{{ tools.length }}</div>
          <div class="tl-stat-label">Total Tools</div>
        </div>
        <div class="tl-stat-card">
          <div class="tl-stat-value">{{ publishedCount }}</div>
          <div class="tl-stat-label">Published</div>
        </div>
        <div class="tl-stat-card">
          <div class="tl-stat-value">{{ totalDownloads }}</div>
          <div class="tl-stat-label">Total Downloads</div>
        </div>
        <div class="tl-stat-card">
          <div class="tl-stat-value">{{ totalStars }}</div>
          <div class="tl-stat-label">Stars Earned</div>
        </div>
      </div>

      <!-- Tools Table -->
      <div class="tl-table-card">
        <div class="tl-table-head-row">
          <div class="tl-th">Tool</div>
          <div class="tl-th">Language</div>
          <div class="tl-th">Status</div>
          <div class="tl-th tl-th-right">Downloads</div>
          <div class="tl-th tl-th-right">Stars</div>
          <div class="tl-th tl-th-right">Updated</div>
          <div class="tl-th"></div>
        </div>
        @for (tool of tools; track tool.id) {
          <div class="tl-table-row">
            <div class="tl-td tl-td-name">
              <div class="tl-tool-avatar">{{ tool.name.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="tl-tool-name">{{ tool.name }}</div>
                <div class="tl-tool-desc">{{ tool.description }}</div>
              </div>
            </div>
            <div class="tl-td">
              <span class="tl-lang-badge" [style.background]="tool.langColor + '18'" [style.color]="tool.langColor">
                {{ tool.lang }}
              </span>
            </div>
            <div class="tl-td">
              <span class="tl-status-badge tl-status-{{ tool.status.toLowerCase().replace(' ', '-') }}">
                {{ tool.status }}
              </span>
            </div>
            <div class="tl-td tl-td-right">
              <span class="tl-num">{{ tool.downloads.toLocaleString() }}</span>
            </div>
            <div class="tl-td tl-td-right">
              <span class="tl-num">{{ tool.stars.toLocaleString() }}</span>
            </div>
            <div class="tl-td tl-td-right tl-muted">{{ tool.lastUpdated }}</div>
            <div class="tl-td tl-td-actions">
              <div style="display: flex; gap: 8px; align-items: center;">
                <a [routerLink]="['/workspace/tools/manage', tool.id]" class="tl-manage-btn">
                  Manage
                  <app-icon name="arrow-right" class="tl-manage-icon" />
                </a>
                <button (click)="removeTool(tool.id)" style="background: transparent; border: none; color: var(--vercel-text-muted); cursor: pointer; padding: 4px; display: inline-flex;" title="Delete tool">
                  <app-icon name="trash" style="width: 14px; height: 14px;" />
                </button>
              </div>
            </div>
          </div>
        }
        @if (tools.length === 0) {
          <div class="tl-empty">
            <app-icon name="box" class="tl-empty-icon" />
            <p>No tools yet. Import a repository to get started.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tl-root { display: flex; flex-direction: column; gap: 24px; }

    /* Header */
    .tl-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--vercel-border);
    }
    .tl-page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
      margin: 0;
    }
    .tl-page-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin-top: 4px;
    }
    .tl-cta-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.15s ease;
      white-space: nowrap;
    }
    .tl-cta-btn:hover { opacity: 0.85; }
    .tl-cta-icon { width: 14px; height: 14px; }

    /* Stats */
    .tl-stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .tl-stat-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 18px 20px;
    }
    .tl-stat-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
    }
    .tl-stat-label {
      font-size: 12px;
      color: var(--vercel-text-muted);
      margin-top: 2px;
    }

    /* Table */
    .tl-table-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      overflow: hidden;
    }
    .tl-table-head-row {
      display: grid;
      grid-template-columns: 2.5fr 0.8fr 0.8fr 0.7fr 0.6fr 0.8fr 0.6fr;
      padding: 10px 20px;
      background: var(--vercel-subtle-bg);
      border-bottom: 1px solid var(--vercel-border);
    }
    .tl-th {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--vercel-text-muted);
    }
    .tl-th-right { text-align: right; }

    .tl-table-row {
      display: grid;
      grid-template-columns: 2.5fr 0.8fr 0.8fr 0.7fr 0.6fr 0.8fr 0.6fr;
      padding: 14px 20px;
      border-bottom: 1px solid var(--vercel-border);
      align-items: center;
      transition: background 0.1s ease;
    }
    .tl-table-row:last-child { border-bottom: none; }
    .tl-table-row:hover { background: var(--vercel-subtle-bg); }

    .tl-td {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      display: flex;
      align-items: center;
    }
    .tl-td-name {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .tl-td-right { justify-content: flex-end; }
    .tl-td-actions { justify-content: flex-end; }
    .tl-muted { color: var(--vercel-text-muted); font-size: 12px; }

    .tl-tool-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      flex-shrink: 0;
    }
    .tl-tool-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tl-tool-desc {
      font-size: 11px;
      color: var(--vercel-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tl-lang-badge {
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
    }

    .tl-status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .tl-status-published { background: rgba(16,185,129,0.12); color: #10b981; }
    .tl-status-draft { background: rgba(148,163,184,0.12); color: #94a3b8; }
    .tl-status-in-review { background: rgba(251,191,36,0.12); color: #f59e0b; }

    .tl-num {
      font-size: 13px;
      color: var(--vercel-text-primary);
      font-variant-numeric: tabular-nums;
    }

    .tl-manage-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 600;
      color: var(--vercel-text-secondary);
      background: transparent;
      border: 1px solid var(--vercel-border);
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .tl-manage-btn:hover {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
    }
    .tl-manage-icon { width: 12px; height: 12px; }

    .tl-empty {
      padding: 60px 24px;
      text-align: center;
      color: var(--vercel-text-muted);
      font-size: 13px;
    }
    .tl-empty-icon {
      width: 32px;
      height: 32px;
      margin: 0 auto 12px;
      display: block;
      opacity: 0.4;
    }

    @media (max-width: 960px) {
      .tl-stats-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class WorkspaceToolsComponent {
  private readonly stateSvc = inject(WorkspaceStateService);

  get tools(): Tool[] {
    return this.stateSvc.tools();
  }

  get publishedCount(): number {
    return this.tools.filter(t => t.status === 'Published').length;
  }
  get totalDownloads(): string {
    const n = this.tools.reduce((s, t) => s + t.downloads, 0);
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  }
  get totalStars(): number {
    return this.tools.reduce((s, t) => s + t.stars, 0);
  }

  addTool(): void {
    this.stateSvc.openModal('add_tool');
  }

  removeTool(id: string): void {
    if (confirm('Are you sure you want to remove this tool?')) {
      this.stateSvc.removeTool(id);
    }
  }
}
