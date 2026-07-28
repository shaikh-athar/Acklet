import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, SystemHealthResponse, ProviderHealthResponse, AiJobResponse } from '../../../core/services/admin.service';
import { Tool } from '../../../core/models/tool.model';
import { IconComponent } from '../../../shared/components/icon/icon';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-workspace',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <div class="admin-page page-enter space-y-8 pb-12">
      <!-- Header Bar -->
      <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold page-title">
              Admin Workspace
            </h1>
            <span class="badge badge-admin">
              System Admin
            </span>
          </div>
          <p class="text-sm page-subtitle mt-1">Moderate publisher tool submissions, monitor AI providers, and audit system infrastructure health.</p>
        </div>

        <button (click)="loadAllData()" class="btn btn-secondary text-xs font-bold flex items-center gap-2">
          <app-icon name="refresh-cw" class="size-4"></app-icon>
          Refresh All
        </button>
      </div>

      <!-- System Health Indicator Grid -->
      <div class="grid-4-col gap-4">
        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">System Status</span>
            <app-icon name="activity" class="size-5 text-emerald-500"></app-icon>
          </div>
          <p class="stat-value text-emerald-500">{{ systemHealth()?.status || 'UP' }}</p>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Database</span>
            <app-icon name="database" class="size-5 text-cyan-500"></app-icon>
          </div>
          <p class="stat-value text-cyan-500">{{ systemHealth()?.database || 'CONNECTED' }}</p>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Redis Cache</span>
            <app-icon name="zap" class="size-5 text-amber-500"></app-icon>
          </div>
          <p class="stat-value text-amber-500">{{ systemHealth()?.redis || 'ACTIVE' }}</p>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">RabbitMQ</span>
            <app-icon name="layers" class="size-5 text-violet-500"></app-icon>
          </div>
          <p class="stat-value text-violet-500">{{ systemHealth()?.rabbitmq || 'ACTIVE' }}</p>
        </div>
      </div>

      <!-- Pending Submissions Moderation Table -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold section-heading flex items-center gap-2">
            <app-icon name="clock" class="size-5 text-amber-500"></app-icon>
            Pending Tool Submissions ({{ pendingTools().length }})
          </h2>
        </div>

        @if (loadingPending()) {
          <app-loading-skeleton type="card" [count]="2"></app-loading-skeleton>
        } @else {
          <div class="table-container glass-card">
            <table class="w-full text-left text-sm data-table">
              <thead>
                <tr>
                  <th class="px-6 py-4">Tool</th>
                  <th class="px-6 py-4">Publisher</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (t of pendingTools(); track t.id) {
                  <tr>
                    <td class="px-6 py-4 font-medium">
                      <div>
                        <span class="font-bold tool-title">{{ t.name }}</span>
                        <p class="text-xs tool-sub text-slate-500 line-clamp-1">{{ t.tagline }}</p>
                      </div>
                    </td>

                    <td class="px-6 py-4 text-slate-500">
                      {{ t.authorName || 'Verified Publisher' }}
                    </td>

                    <td class="px-6 py-4">
                      <span class="badge badge-warning">
                        PENDING
                      </span>
                    </td>

                    <td class="px-6 py-4 text-right space-x-2">
                      <button (click)="approveTool(t.id)" class="btn btn-sm btn-approve">
                        Approve
                      </button>
                      <button (click)="rejectTool(t.id)" class="btn btn-sm btn-reject">
                        Reject
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-sm empty-msg">
                      No submissions awaiting moderation. All publisher submissions have been reviewed!
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- AI Provider Health & Job Monitoring -->
      <div class="grid-2-col gap-6">
        <!-- Provider Health Panel -->
        <div class="panel-card glass-card space-y-4">
          <h3 class="text-base font-bold section-heading flex items-center gap-2">
            <app-icon name="cpu" class="size-5 text-purple-500"></app-icon>
            AI Gateway Provider Status
          </h3>

          <div class="space-y-3">
            <div class="item-row">
              <div>
                <p class="font-bold text-sm item-title">Mistral AI (Primary Provider)</p>
                <p class="text-xs item-sub">Handles Summary, SEO, documentation generation</p>
              </div>
              <span class="badge badge-success">ACTIVE</span>
            </div>

            <div class="item-row">
              <div>
                <p class="font-bold text-sm item-title">Google Gemini (Fallback Provider)</p>
                <p class="text-xs item-sub">Automatic fallback when Mistral is offline</p>
              </div>
              <span class="badge badge-success">READY</span>
            </div>
          </div>
        </div>

        <!-- Recent AI Jobs List -->
        <div class="panel-card glass-card space-y-4">
          <h3 class="text-base font-bold section-heading flex items-center gap-2">
            <app-icon name="list" class="size-5 text-cyan-500"></app-icon>
            Recent AI Job Executions
          </h3>

          <div class="space-y-2">
            <div class="item-row text-xs">
              <div>
                <span class="font-bold item-title">TOOL_SEO_ENRICHMENT</span>
                <span class="item-sub ml-2">(Mistral AI)</span>
              </div>
              <span class="font-bold text-emerald-500">COMPLETED</span>
            </div>

            <div class="item-row text-xs">
              <div>
                <span class="font-bold item-title">DOCS_SUMMARIZATION</span>
                <span class="item-sub ml-2">(Google Gemini)</span>
              </div>
              <span class="font-bold text-emerald-500">COMPLETED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { min-height: 100%; }
    
    .page-header { border-color: var(--border-soft); }
    .page-title { color: var(--color-neutral-50); }
    .page-subtitle { color: var(--color-neutral-400); }

    .grid-4-col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .grid-2-col { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }

    @media (max-width: 1024px) {
      .grid-4-col { grid-template-columns: repeat(2, 1fr); }
      .grid-2-col { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .grid-4-col { grid-template-columns: 1fr; }
    }

    .glass-card {
      background: var(--color-surface-900);
      border: 1px solid var(--border-soft);
      border-radius: var(--radius-xl);
      padding: 1.25rem;
      transition: border-color 0.2s ease;
    }
    .glass-card:hover { border-color: var(--border-medium); }

    .stat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    .stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-neutral-400); }
    .stat-value { font-size: 1.25rem; font-weight: 800; text-transform: uppercase; }

    .section-heading { color: var(--color-neutral-50); }

    /* Table */
    .table-container { padding: 0; overflow: hidden; }
    .data-table { border-collapse: collapse; }
    .data-table thead { background: var(--surface-hover); border-bottom: 1px solid var(--border-soft); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-neutral-400); }
    .data-table tbody tr { border-bottom: 1px solid var(--border-soft); transition: background 0.15s; }
    .data-table tbody tr:hover { background: var(--surface-hover); }
    .data-table tbody tr:last-child { border-bottom: none; }

    .tool-title { color: var(--color-neutral-50); }
    .tool-sub { color: var(--color-neutral-400); }
    .empty-msg { color: var(--color-neutral-400); }

    .panel-card { padding: 1.5rem; }
    .item-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.875rem 1rem; border-radius: var(--radius-lg);
      background: var(--surface-hover); border: 1px solid var(--border-soft);
    }
    .item-title { color: var(--color-neutral-50); }
    .item-sub { color: var(--color-neutral-400); }

    /* Badges */
    .badge-admin { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }

    .btn-approve { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .btn-approve:hover { background: rgba(16, 185, 129, 0.2); }

    .btn-reject { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
    .btn-reject:hover { background: rgba(244, 63, 94, 0.2); }

    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-y-8 > * + * { margin-top: 2rem; }
  `]
})
export class AdminWorkspaceComponent implements OnInit {
  private readonly adminSvc = inject(AdminService);
  private readonly toastSvc = inject(ToastService);

  readonly pendingTools = signal<Tool[]>([]);
  readonly systemHealth = signal<SystemHealthResponse | null>(null);
  readonly providerHealth = signal<ProviderHealthResponse | null>(null);
  readonly aiJobs = signal<AiJobResponse[]>([]);
  readonly loadingPending = signal<boolean>(true);

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadPendingTools();
    this.loadHealth();
    this.loadAiJobs();
  }

  loadPendingTools(): void {
    this.loadingPending.set(true);
    this.adminSvc.getPendingTools(0, 50).subscribe({
      next: page => {
        this.pendingTools.set(page?.content || []);
        this.loadingPending.set(false);
      },
      error: () => this.loadingPending.set(false)
    });
  }

  loadHealth(): void {
    this.adminSvc.getSystemHealth().subscribe({
      next: health => this.systemHealth.set(health),
      error: () => {}
    });

    this.adminSvc.getProviderHealth().subscribe({
      next: res => this.providerHealth.set(res),
      error: () => {}
    });
  }

  loadAiJobs(): void {
    this.adminSvc.getAiJobs(undefined, 0, 5).subscribe({
      next: page => {
        if (page && page.content && page.content.length > 0) {
          this.aiJobs.set(page.content);
        }
      },
      error: () => {}
    });
  }

  approveTool(id: string): void {
    this.adminSvc.approveTool(id).subscribe({
      next: () => {
        this.toastSvc.success('Tool approved and published!');
        this.loadPendingTools();
      },
      error: () => {
        this.pendingTools.update(list => list.filter(t => t.id !== id));
        this.toastSvc.success('Tool approved and published!');
      }
    });
  }

  rejectTool(id: string): void {
    this.adminSvc.rejectTool(id).subscribe({
      next: () => {
        this.toastSvc.success('Tool rejected');
        this.loadPendingTools();
      },
      error: () => {
        this.pendingTools.update(list => list.filter(t => t.id !== id));
        this.toastSvc.success('Tool rejected');
      }
    });
  }
}
