import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';

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
        <button (click)="connectRepo()" class="rp-add-btn" style="border: none; cursor: pointer;">
          <app-icon name="plus" class="rp-add-btn-icon" />
          <span>Connect Repo</span>
        </button>
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
                <td class="rp-repo-name-cell">
                  <app-icon name="git-branch" class="rp-repo-icon" />
                  <span>{{ repo.name }}</span>
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
                  <div style="display: flex; justify-content: flex-end; align-items: center; gap: 14px;">
                    @if (repo.toolStatus === 'Published') {
                      <a [routerLink]="['/workspace/tools/manage', repo.id]" class="rp-action-link">
                        Manage Tool →
                      </a>
                      <button (click)="unlinkRepo(repo.id)" style="background: transparent; border: none; color: #f59e0b; cursor: pointer; padding: 2px 4px; font-size: 11px; font-weight: 600;" title="Unlink repository from Tool">
                        Unlink
                      </button>
                      <button style="background: transparent; border: none; color: var(--vercel-text-muted); opacity: 0.35; cursor: not-allowed; padding: 2px 4px; display: inline-flex;" title="Cannot delete repository while linked to a Tool (unlink first)">
                        <app-icon name="trash" style="width: 14px; height: 14px;" />
                      </button>
                    } @else {
                      <a [routerLink]="['/workspace/projects/publish', repo.id]" class="rp-action-link deploy-link">
                        <app-icon name="rocket" style="width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle;" />
                        <span>Deploy Tool →</span>
                      </a>
                      <button (click)="removeRepo(repo)" style="background: transparent; border: none; color: var(--vercel-text-muted); cursor: pointer; padding: 2px 4px; display: inline-flex;" title="Disconnect repository">
                        <app-icon name="trash" style="width: 14px; height: 14px;" />
                      </button>
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
      overflow: hidden;
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

    .rp-repo-name-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
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
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .rp-badge.visibility.public {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-secondary);
      border-color: var(--vercel-border);
    }

    .rp-badge.visibility.private {
      background: rgba(168, 85, 247, 0.1);
      color: #c084fc;
      border-color: rgba(168, 85, 247, 0.2);
    }

    .rp-badge.tool-status.published {
      background: rgba(6, 182, 212, 0.1);
      color: #06b6d4;
      border-color: rgba(6, 182, 212, 0.2);
    }

    .rp-badge.tool-status.draft {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.2);
    }

    .rp-badge.tool-status.not-gen {
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-muted);
      border-color: var(--vercel-border);
    }

    .rp-tech-tag {
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      font-size: 10px;
      font-weight: 600;
      color: var(--vercel-text-secondary);
      font-family: var(--font-mono);
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

    .rp-action-link {
      font-size: 11px;
      font-weight: 600;
      color: #06b6d4;
      text-decoration: none;
    }

    .rp-action-link:hover {
      text-decoration: underline;
    }

    .deploy-link {
      color: #8b5cf6 !important;
      display: inline-flex;
      align-items: center;
    }

    .deploy-link:hover {
      color: #a78bfa !important;
    }

    .text-right {
      text-align: right;
    }
  `],
})
export class WorkspaceRepositoriesComponent {
  private readonly stateSvc = inject(WorkspaceStateService);
  readonly repos = this.stateSvc.repos;

  connectRepo(): void {
    this.stateSvc.openModal('connect_repo');
  }

  removeRepo(repo: any): void {
    if (repo.toolStatus === 'Published') {
      alert('This repository cannot be removed because it is currently linked to a published Tool. Please unlink the tool first.');
      return;
    }
    if (confirm(`Are you sure you want to disconnect repository "${repo.name}"? This action is permanent.`)) {
      this.stateSvc.removeRepository(repo.id);
    }
  }

  unlinkRepo(id: string): void {
    if (confirm('Are you sure you want to unlink this repository from its published Tool? The tool will remain but won\'t be associated with this repository.')) {
      this.stateSvc.unlinkRepository(id);
    }
  }
}
