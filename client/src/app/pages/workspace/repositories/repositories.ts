import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-workspace-repositories',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="rp-wrapper">
      <div class="rp-header">
        <div class="rp-title-wrap">
          <h1 class="rp-title">Repositories</h1>
          <p class="rp-subtitle">All synchronized Git repositories across GitHub, GitLab, and Bitbucket.</p>
        </div>
        <a routerLink="/workspace/tools/import" class="rp-add-btn" style="border: none; cursor: pointer; text-decoration: none;">
          <app-icon name="plus" class="rp-add-btn-icon" />
          <span>Connect Repo</span>
        </a>
      </div>

      <!-- High Density Table -->
      <div class="rp-table-container">
        <table class="rp-table">
          <thead>
            <tr>
              <th>Repository Name</th>
              <th>Git Provider</th>
              <th>Branch</th>
              <th>Visibility</th>
              <th>Tech Stack</th>
              <th>Sync Status</th>
              <th>Tool Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (repo of repos(); track repo.id) {
              <tr>
                <td>
                  <div class="rp-repo-name-cell">
                    <app-icon name="git-branch" class="rp-repo-icon" />
                    <span>{{ repo.name }}</span>
                  </div>
                </td>
                <td class="rp-provider-cell">{{ repo.provider }}</td>
                <td class="rp-branch-cell">{{ repo.branch }}</td>
                <td>
                  <span class="rp-badge visibility" [ngClass]="repo.visibility === 'Public' ? 'public' : 'private'">
                    {{ repo.visibility }}
                  </span>
                </td>
                <td>
                  <span class="rp-tech-tag">
                    {{ repo.language }} / {{ repo.framework }}
                  </span>
                </td>
                <td>
                  <div class="rp-sync-indicator">
                    <span class="rp-dot" [ngClass]="{
                      'synced': repo.syncStatus === 'Synced',
                      'syncing animate-pulse': repo.syncStatus === 'Syncing',
                      'failed': repo.syncStatus === 'Failed'
                    }"></span>
                    <span>{{ repo.syncStatus }}</span>
                  </div>
                </td>
                <td>
                  <span class="rp-badge tool-status"
                    [ngClass]="{
                      'published': repo.toolStatus === 'Published',
                      'draft': repo.toolStatus === 'Draft',
                      'not-gen': repo.toolStatus === 'Not Generated'
                    }">
                    @if (repo.toolStatus === 'Published') {
                      Used in Tool
                    } @else if (repo.toolStatus === 'Draft') {
                      Drafting
                    } @else {
                      Not Used
                    }
                  </span>
                </td>
                <td class="text-right">
                  <div class="rp-actions-container">
                    @if (repo.toolStatus === 'Published') {
                      <div class="action-btn-wrap" data-tooltip="Manage Tool">
                        <a [routerLink]="['/workspace/tools/manage', repo.id]" class="rp-action-btn-icon manage">
                          <app-icon name="settings" class="size-5" [strokeWidth]="2.5" />
                        </a>
                      </div>
                      <div class="action-btn-wrap" data-tooltip="Unlink Tool">
                        <button (click)="unlinkRepo(repo.id)" class="rp-action-btn-icon unlink-btn">
                          <app-icon name="unlink" class="size-5" [strokeWidth]="2.5" />
                        </button>
                      </div>
                      <div class="action-btn-wrap" data-tooltip="Linked (Cannot Delete)">
                        <button class="rp-action-btn-icon disabled" disabled>
                          <app-icon name="trash" class="size-5" [strokeWidth]="2.5" style="opacity: 0.35;" />
                        </button>
                      </div>
                    } @else {
                      <div class="action-btn-wrap" data-tooltip="Deploy Tool">
                        <a [routerLink]="['/workspace/projects/publish', repo.id]" class="rp-action-btn-icon deploy">
                          <app-icon name="rocket" class="size-5" [strokeWidth]="2.5" />
                        </a>
                      </div>
                      <div class="action-btn-wrap" data-tooltip="Delete Repo">
                        <button (click)="removeRepo(repo)" class="rp-action-btn-icon delete-btn">
                          <app-icon name="trash" class="size-5" [strokeWidth]="2.5" />
                        </button>
                      </div>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .rp-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .rp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }

    .rp-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .rp-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }

    .rp-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 0;
    }

    .rp-add-btn {
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

    .rp-add-btn:hover {
      opacity: 0.9;
    }

    .rp-add-btn-icon {
      width: 14px;
      height: 14px;
    }

    .rp-table-container {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: visible;
    }

    .rp-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .rp-table th {
      background: var(--vercel-subtle-bg);
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      border-bottom: 1px solid var(--vercel-border);
    }

    .rp-table th:first-child {
      border-top-left-radius: 8px;
    }

    .rp-table th:last-child {
      border-top-right-radius: 8px;
    }

    .rp-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--vercel-border-subtle);
      color: var(--vercel-text-primary);
      font-size: 13px;
    }

    .rp-table tr:hover td {
      background: var(--surface-hover);
    }

    .rp-table tr:last-child td {
      border-bottom: none;
    }

    .rp-table tr:last-child td:first-child {
      border-bottom-left-radius: 8px;
    }

    .rp-table tr:last-child td:last-child {
      border-bottom-right-radius: 8px;
    }

    .rp-repo-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
    }

    .rp-repo-icon {
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }

    .rp-provider-cell {
      text-transform: capitalize;
      color: var(--vercel-text-secondary);
    }

    .rp-branch-cell {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--vercel-text-secondary);
    }

    .rp-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 10.5px;
      font-weight: 700;
      border: 1px solid transparent;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .rp-badge.visibility.public {
      background: rgba(16, 185, 129, 0.08);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.2);
    }

    .rp-badge.visibility.private {
      background: rgba(239, 68, 68, 0.08);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.2);
    }

    .rp-badge.tool-status.published {
      background: rgba(6, 182, 212, 0.08);
      color: #06b6d4;
      border-color: rgba(6, 182, 212, 0.2);
    }

    .rp-badge.tool-status.draft {
      background: rgba(245, 158, 11, 0.08);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.2);
    }

    .rp-badge.tool-status.not-gen {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-muted);
      border-color: var(--vercel-border);
    }

    .rp-tech-tag {
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.2);
      font-size: 10.5px;
      font-weight: 700;
      color: #3b82f6;
      font-family: var(--font-mono);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .rp-sync-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    }

    .rp-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .rp-dot.synced { background: #10b981; }
    .rp-dot.syncing { background: #f59e0b; }
    .rp-dot.failed { background: #f43f5e; }

    /* Action icons styles */
    .rp-actions-container {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
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
      transition: all 0.15s ease;
    }

    .rp-action-btn-icon app-icon {
      width: 16px;
      height: 16px;
    }

    .rp-action-btn-icon.manage {
      color: var(--vercel-text-primary);
    }
    .rp-action-btn-icon.manage:hover {
      background: rgba(23, 23, 23, 0.08);
    }
    html[data-theme="dark"] .rp-action-btn-icon.manage:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .rp-action-btn-icon.unlink-btn {
      color: #f59e0b;
    }
    .rp-action-btn-icon.unlink-btn:hover {
      background: rgba(245, 158, 11, 0.12);
    }

    .rp-action-btn-icon.delete-btn {
      color: #ef4444;
    }
    .rp-action-btn-icon.delete-btn:hover {
      background: rgba(239, 68, 68, 0.12);
    }

    .rp-action-btn-icon.deploy {
      color: #8b5cf6;
    }
    .rp-action-btn-icon.deploy:hover {
      background: rgba(139, 92, 246, 0.12);
    }

    .rp-action-btn-icon.disabled {
      cursor: not-allowed;
      color: var(--vercel-text-muted);
      opacity: 0.5;
    }
    .rp-action-btn-icon.disabled:hover {
      background: transparent;
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
      background: #111;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: all 0.15s ease-in-out;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      z-index: 100;
    }

    .action-btn-wrap[data-tooltip]:hover::after {
      opacity: 1;
      transform: scale(1);
    }

    .text-right {
      text-align: right;
    }
  `],
})
export class WorkspaceRepositoriesComponent {
  private readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);
  readonly repos = this.stateSvc.repos;



  async removeRepo(repo: any): Promise<void> {
    if (repo.toolStatus === 'Published') {
      await this.dialogSvc.alert('This repository cannot be removed because it is currently linked to a published Tool. Please unlink the tool first.', 'Cannot Remove Repository');
      return;
    }
    const expectedText = `${repo.name}`;
    const message = `To confirm deletion, please type exactly:<br><span class="dialog-highlight-text">${repo.name}</span>`;
    const verification = await this.dialogSvc.prompt(message, 'Verification Text', '', 'Confirm Repository Deletion', expectedText);
    if (verification === expectedText) {
      this.stateSvc.removeRepository(repo.id);
    } else if (verification !== null) {
      await this.dialogSvc.alert('Verification failed. Repository was not deleted.', 'Deletion Failed');
    }
  }

  async unlinkRepo(id: string): Promise<void> {
    const confirmed = await this.dialogSvc.confirm('Are you sure you want to unlink this repository from its published Tool? The tool will remain but won\'t be associated with this repository.', 'Unlink Repository');
    if (confirmed) {
      this.stateSvc.unlinkRepository(id);
    }
  }
}
