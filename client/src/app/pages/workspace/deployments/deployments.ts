import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon';
import { ToolsService, Deployment } from '../../../core/services/tools.service';

@Component({
  selector: 'app-workspace-deployments',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="dp-wrapper">
      <div class="dp-header">
        <div class="dp-title-wrap">
          <h1 class="dp-title">Deployments</h1>
          <p class="dp-subtitle">
            All system builds, background deployments, live outcomes, and historical tool runs.
          </p>
        </div>
      </div>

      <!-- Filters & Control Row -->
      <div class="dp-filters-card">
        <div class="dp-filters-grid">
          <div class="dp-search-wrap">
            <app-icon name="search" class="dp-search-icon" />
            <input
              type="text"
              class="dp-input"
              [(ngModel)]="searchQuery"
              placeholder="Search deployments by commit, message or author..."
            />
          </div>

          <div class="dp-select-group">
            <select class="dp-select" [(ngModel)]="statusFilter">
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed / Errors</option>
              <option value="BUILDING">Building / Pending</option>
            </select>

            <select class="dp-select" [(ngModel)]="branchFilter">
              <option value="ALL">All Branches</option>
              <option value="main">main</option>
              <option value="master">master</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Deployments Table -->
      <div class="dp-table-container">
        @if (loading()) {
          <div class="dp-loading">
            <div class="dp-spinner"></div>
            <p>Fetching deployment logs...</p>
          </div>
        } @else {
          <table class="dp-table">
            <thead>
              <tr>
                <th>Outcome / Commit Message</th>
                <th>Status</th>
                <th>Environment</th>
                <th>Commit</th>
                <th>Branch</th>
                <th>Duration</th>
                <th>Created By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (dep of filteredDeployments; track dep.id) {
                <tr>
                  <td class="dp-commit-msg">
                    <span>{{ dep.commitMessage || 'Automated deployment' }}</span>
                  </td>
                  <td>
                    <span
                      class="dp-status-badge"
                      [class.success]="dep.status === 'SUCCESS'"
                      [class.failed]="dep.status === 'FAILED'"
                      [class.building]="dep.status === 'BUILDING'"
                    >
                      {{ dep.status }}
                    </span>
                  </td>
                  <td>
                    <span class="dp-env-badge">Production</span>
                  </td>
                  <td class="font-mono text-indigo">
                    {{ dep.commitSha ? dep.commitSha.substring(0, 7) : 'head' }}
                  </td>
                  <td class="font-mono">{{ dep.branch || 'main' }}</td>
                  <td>{{ formatDuration(dep.durationMs) }}</td>
                  <td>
                    <div class="dp-author-cell">
                      <div class="dp-avatar-mini">
                        {{ (dep.createdBy || 'A')[0].toUpperCase() }}
                      </div>
                      <span>{{ dep.createdBy || 'System' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="dp-actions-row">
                      <button
                        (click)="redeploy(dep)"
                        class="dp-action-btn redeploy"
                        title="Redeploy Tool"
                      >
                        <app-icon name="refresh-cw" class="size-4" />
                        <span>Redeploy</span>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="dp-empty">
                    <app-icon name="cloud-off" class="dp-empty-icon" />
                    <p>No deployments matching your filters.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: [`
    .dp-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .dp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .dp-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
      letter-spacing: -0.5px;
    }
    .dp-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin-top: 4px;
    }

    .dp-filters-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
    }
    .dp-filters-grid {
      display: flex;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .dp-search-wrap {
      position: relative;
      flex: 1;
      min-width: 260px;
    }
    .dp-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px;
      height: 15px;
      color: var(--vercel-text-muted);
    }
    .dp-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      font-size: 13px;
    }
    .dp-select-group {
      display: flex;
      gap: 8px;
    }
    .dp-select {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      font-size: 13px;
    }

    .dp-table-container {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .dp-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .dp-table th {
      background: var(--vercel-subtle-bg);
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      border-bottom: 1px solid var(--vercel-border);
    }
    .dp-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--vercel-border-subtle);
      font-size: 13px;
      color: var(--vercel-text-primary);
    }
    .dp-table tr:hover td {
      background: var(--vercel-subtle-bg);
    }
    .dp-commit-msg {
      font-weight: 600;
    }

    .dp-status-badge {
      padding: 3px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      display: inline-block;
    }
    .dp-status-badge.success { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .dp-status-badge.failed { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
    .dp-status-badge.building { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }

    .dp-env-badge {
      font-size: 10px;
      font-weight: 600;
      background: rgba(99,102,241,0.08);
      color: #818cf8;
      border: 1px solid rgba(99,102,241,0.15);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .dp-author-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dp-avatar-mini {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--vercel-border);
      color: var(--vercel-text-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
    }

    .dp-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .dp-action-btn:hover {
      background: var(--vercel-border);
    }

    .dp-empty {
      text-align: center;
      padding: 48px 16px;
      color: var(--vercel-text-muted);
    }
    .dp-empty-icon {
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    .dp-loading {
      text-align: center;
      padding: 48px;
      color: var(--vercel-text-muted);
    }
  `]
})
export class WorkspaceDeploymentsComponent implements OnInit {
  private readonly toolsSvc = inject(ToolsService);

  readonly deployments = signal<Deployment[]>([]);
  readonly loading = signal(true);

  searchQuery = '';
  statusFilter = 'ALL';
  branchFilter = 'ALL';

  ngOnInit(): void {
    this.toolsSvc.getAllDeployments().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.deployments.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  get filteredDeployments(): Deployment[] {
    return this.deployments().filter((dep) => {
      if (this.statusFilter !== 'ALL' && dep.status !== this.statusFilter) {
        return false;
      }
      if (this.branchFilter !== 'ALL' && dep.branch !== this.branchFilter) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        const msg = (dep.commitMessage || '').toLowerCase();
        const author = (dep.createdBy || '').toLowerCase();
        const sha = (dep.commitSha || '').toLowerCase();
        return msg.includes(q) || author.includes(q) || sha.includes(q);
      }
      return true;
    });
  }

  formatDuration(ms?: number): string {
    if (!ms) return '0s';
    return (ms / 1000).toFixed(1) + 's';
  }

  redeploy(dep: Deployment): void {
    this.toolsSvc.redeployDeployment(dep.id).subscribe(() => {
      this.ngOnInit();
    });
  }
}
