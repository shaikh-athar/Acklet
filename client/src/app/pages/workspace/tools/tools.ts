import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';
import { DialogService } from '../../../core/services/dialog.service';
import { DEFAULT_FEATURE_FLAGS } from '../../../core/config/features.config';

interface Tool {
  id: string;
  name: string;
  slug: string;
  repositoryId?: string;
  description: string;
  lang: string;
  langColor: string;
  status: 'Published' | 'Draft' | 'In Review';
  branch?: string;
  lastCommit?: string;
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
          <p class="tl-page-subtitle">
            Manage and monitor all developer tools linked to your workspace.
          </p>
        </div>
        <a routerLink="/workspace/tools/import" class="tl-cta-btn" style="text-decoration: none;">
          <app-icon name="plus" class="tl-cta-icon" />
          <span>Add Tool</span>
        </a>
      </div>

      <!-- Tools Table -->
      <div class="tl-table-card">
        <div class="tl-table-head-row">
          <div class="tl-th">Tool</div>
          <div class="tl-th">Language</div>
          <div class="tl-th">Status</div>
          <div class="tl-th">Branch</div>
          <div class="tl-th">Last Commit</div>
          <div class="tl-th tl-th-right">Updated</div>
        </div>
        @for (tool of tools; track tool.id) {
          <div class="tl-table-row" [routerLink]="['/workspace/tools/manage', tool.slug]">
            <div class="tl-td tl-td-name">
              <div class="tl-tool-avatar">{{ tool.name.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="tl-tool-name">{{ tool.name }}</div>
                <div class="tl-tool-desc">{{ tool.description }}</div>
              </div>
            </div>
            <div class="tl-td">
              <span
                class="tl-lang-badge"
                [style.background]="tool.langColor + '18'"
                [style.color]="tool.langColor"
              >
                {{ tool.lang }}
              </span>
            </div>
            <div class="tl-td">
              <span
                class="tl-status-badge tl-status-{{ tool.status.toLowerCase().replace(' ', '-') }}"
              >
                {{ tool.status }}
              </span>
            </div>
            <div class="tl-td">
              <span class="tl-branch-pill">
                <app-icon name="git-branch" class="size-2" />
                {{ tool.branch || '' }}
              </span>
            </div>
            <div class="tl-td">
              <span class="tl-commit-sha font-mono">{{ tool.lastCommit || '...' }}</span>
            </div>
            <div class="tl-td tl-td-right tl-muted">{{ tool.lastUpdated }}</div>
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
  styles: [
    `
      .tl-root {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

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
      .tl-cta-btn:hover {
        opacity: 0.85;
      }
      .tl-cta-icon {
        width: 14px;
        height: 14px;
      }

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
        grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr 1fr;
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
      .tl-th-right {
        text-align: right;
      }

      .tl-table-row {
        display: grid;
        grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr 1fr;
        padding: 14px 20px;
        border-bottom: 1px solid var(--vercel-border);
        align-items: center;
        transition: background 0.1s ease;
      }
      .tl-table-row:last-child {
        border-bottom: none;
      }
      .tl-table-row:hover {
        background: var(--vercel-subtle-bg);
      }

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
      .tl-td-right {
        justify-content: flex-end;
      }
      .tl-td-actions {
        justify-content: flex-end;
      }
      .tl-muted {
        color: var(--vercel-text-muted);
        font-size: 12px;
      }

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
      .tl-status-published {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
      }
      .tl-status-draft {
        background: rgba(148, 163, 184, 0.12);
        color: #94a3b8;
      }
      .tl-status-in-review {
        background: rgba(251, 191, 36, 0.12);
        color: #f59e0b;
      }

      .tl-branch-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        color: var(--vercel-text-primary);
        font-family: var(--font-mono);
      }

      .tl-branch-pill .size-2{
        width: 14px !important;
        height: 14px !important;
      }

      .tl-commit-sha {
        font-size: 12px;
        color: #818cf8;
        font-weight: 500;
      }

      .tl-num {
        font-size: 13px;
        color: var(--vercel-text-primary);
        font-variant-numeric: tabular-nums;
      }

      .tl-table-row {
        cursor: pointer;
        text-decoration: none;
      }
      .tl-table-row:hover {
        background: var(--vercel-subtle-bg);
      }

      .rp-action-btn-icon {
        background: transparent;
        border: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .rp-action-btn-icon app-icon {
        width: 16px;
        height: 16px;
      }
      .rp-action-btn-icon.delete-btn {
        color: #ef4444;
      }
      .rp-action-btn-icon.delete-btn:hover {
        background: rgba(239, 68, 68, 0.12);
      }

      /* Tooltip styles */
      .action-btn-wrap {
        position: relative;
        display: inline-flex;
      }

      .action-btn-wrap[data-tooltip]::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 125%;
        right: 0;
        transform: scale(0.9);
        background: var(--color-neutral-50, #f4f4f5);
        color: var(--color-neutral-950, #09090b);
        border: 1px solid var(--vercel-border, #27272a);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: all 0.15s ease-in-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        z-index: 100;
      }

      .action-btn-wrap[data-tooltip]:hover::after {
        opacity: 1;
        transform: scale(1);
        pointer-events: auto;
      }

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
        .tl-stats-row {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class WorkspaceToolsComponent {
  private readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);

  get tools(): Tool[] {
    return this.stateSvc.tools();
  }

  get publishedCount(): number {
    return this.tools.filter((t) => t.status === 'Published').length;
  }
  get defaultBranch(): string {
    const firstBranch = this.tools.find((t) => !!t.branch)?.branch;
    return firstBranch || 'main';
  }

  removeTool(tool: Tool): void {
    const hasRepo = !!tool.repositoryId;
    if (hasRepo) {
      // Step 1: Ask for detach with the repo
      this.dialogSvc
        .confirm(
          `This tool is linked to repository. Do you want to detach the repository first? (Click 'Cancel' to delete both the tool and the repository)`,
          'Detach Repository?',
        )
        .then((detachConfirmed) => {
          this._promptNameConfirmAndDelete(tool, detachConfirmed);
        });
    } else {
      this._promptNameConfirmAndDelete(tool, false);
    }
  }

  private _promptNameConfirmAndDelete(tool: Tool, detachRepo: boolean): void {
    if (DEFAULT_FEATURE_FLAGS.confirmDelete) {
      // Step 2: Ask for confirmDelete name matching
      this.dialogSvc
        .prompt(
          `Please type the tool name "${tool.name}" to confirm deletion:`,
          'Tool Name',
          '',
          'Confirm Deletion',
          tool.name,
        )
        .then((typedName) => {
          if (typedName === tool.name) {
            // Step 3: Delete
            this.stateSvc.deleteToolAndRepo(tool.id, tool.slug, tool.repositoryId, detachRepo);
          } else if (typedName !== null) {
            this.dialogSvc.alert(
              'The typed name did not match. Deletion aborted.',
              'Incorrect Name',
            );
          }
        });
    } else {
      // Testing: simple confirm dialog
      this.dialogSvc
        .confirm(`Are you sure you want to delete tool "${tool.name}"?`, 'Delete Tool')
        .then((confirmed) => {
          if (confirmed) {
            this.stateSvc.deleteToolAndRepo(tool.id, tool.slug, tool.repositoryId, detachRepo);
          }
        });
    }
  }
}
