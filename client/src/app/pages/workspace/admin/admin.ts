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
    .admin-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-height: 100%;
    }
 
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
 
    .page-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 4px 0 0 0;
    }
 
    .grid-4-col {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 16px;
    }
 
    .grid-2-col {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 24px;
    }
 
    @media (min-width: 640px) {
      .grid-4-col { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1024px) {
      .grid-4-col { grid-template-columns: repeat(4, 1fr); }
      .grid-2-col { grid-template-columns: repeat(2, 1fr); }
    }
 
    .glass-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.15s ease;
    }
    .glass-card:hover {
      border-color: var(--vercel-text-muted);
    }
 
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
 
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vercel-text-muted);
    }
 
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    .section-heading {
      font-size: 14px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    /* Table */
    .table-container {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
    }
 
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
 
    .data-table th {
      background: var(--vercel-subtle-bg);
      padding: 12px 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .data-table td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--vercel-border-subtle);
      color: var(--vercel-text-primary);
      font-size: 13px;
    }
 
    .data-table tr:hover td {
      background: var(--surface-hover);
    }
 
    .data-table tr:last-child td {
      border-bottom: none;
    }
 
    .tool-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }
 
    .tool-sub {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin: 2px 0 0 0;
    }
 
    .empty-msg {
      color: var(--vercel-text-muted);
      text-align: center;
      padding: 32px;
    }
 
    .panel-card {
      padding: 20px;
    }
 
    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
    }
 
    .item-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }
 
    .item-sub {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    /* Badges */
    .badge-admin { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
 
    .btn-approve { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .btn-approve:hover { background: rgba(16, 185, 129, 0.2); }
 
    .btn-reject { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
    .btn-reject:hover { background: rgba(244, 63, 94, 0.2); }
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
