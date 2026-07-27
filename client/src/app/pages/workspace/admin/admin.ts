import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, SystemHealthResponse, ProviderHealthResponse, AiJobResponse } from '../../../core/services/admin.service';
import { Tool } from '../../../core/models/tool.model';
import { IconComponent } from '../../../shared/components/icon/icon';
import { FallbackStateComponent } from '../../../shared/components/fallback-state/fallback-state';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-workspace',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    FallbackStateComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <div class="space-y-8 pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Admin Workspace
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              System Admin
            </span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Moderate publisher tool submissions, monitor AI providers, and audit system health.</p>
        </div>
        <button (click)="loadAllData()" class="btn btn-secondary px-4 py-2 text-sm font-medium rounded-xl flex items-center gap-2">
          <app-icon name="refresh-cw" size="16"></app-icon>
          Refresh All
        </button>
      </div>

      <!-- System Health Indicator Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">System Status</span>
            <app-icon name="activity" size="20" class="text-emerald-400"></app-icon>
          </div>
          <p class="text-xl font-bold text-white uppercase">{{ systemHealth()?.status || 'UP' }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">Database</span>
            <app-icon name="database" size="20" class="text-cyan-400"></app-icon>
          </div>
          <p class="text-xl font-bold text-white uppercase">{{ systemHealth()?.database || 'CONNECTED' }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">Redis Cache</span>
            <app-icon name="zap" size="20" class="text-amber-400"></app-icon>
          </div>
          <p class="text-xl font-bold text-white uppercase">{{ systemHealth()?.redis || 'ACTIVE' }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">RabbitMQ</span>
            <app-icon name="layers" size="20" class="text-violet-400"></app-icon>
          </div>
          <p class="text-xl font-bold text-white uppercase">{{ systemHealth()?.rabbitmq || 'ACTIVE' }}</p>
        </div>
      </div>

      <!-- Pending Submissions Moderation Table -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white flex items-center gap-2">
            <app-icon name="clock" size="18" class="text-amber-400"></app-icon>
            Pending Tool Submissions ({{ pendingTools().length }})
          </h2>
        </div>

        @if (loadingPending()) {
          <app-loading-skeleton type="card" [count]="2"></app-loading-skeleton>
        } @else if (pendingTools().length === 0) {
          <app-fallback-state
            type="EMPTY"
            title="No Submissions Awaiting Moderation"
            message="All publisher submissions have been reviewed. New submissions will appear here automatically.">
          </app-fallback-state>
        } @else {
          <div class="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md">
            <table class="w-full text-left text-sm text-slate-300">
              <thead class="bg-white/5 text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
                <tr>
                  <th class="px-6 py-4">Tool</th>
                  <th class="px-6 py-4">Publisher</th>
                  <th class="px-6 py-4">Submitted Date</th>
                  <th class="px-6 py-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (t of pendingTools(); track t.id) {
                  <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="px-6 py-4 font-medium text-white">
                      <div>
                        <span class="font-semibold text-white">{{ t.name }}</span>
                        <p class="text-xs text-slate-400 line-clamp-1 max-w-xs">{{ t.tagline }}</p>
                      </div>
                    </td>

                    <td class="px-6 py-4 text-slate-400">
                      {{ t.authorName || 'Publisher' }}
                    </td>

                    <td class="px-6 py-4 text-slate-400 text-xs">
                      {{ t.createdAt | date:'mediumDate' }}
                    </td>

                    <td class="px-6 py-4 text-right space-x-2">
                      <button (click)="approveTool(t.id)" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                        Approve
                      </button>
                      <button (click)="rejectTool(t.id)" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all">
                        Reject
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- AI Provider Health & Job Monitoring -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Provider Health Panel -->
        <div class="p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md space-y-4">
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <app-icon name="cpu" size="18" class="text-purple-400"></app-icon>
            AI Gateway Provider Status
          </h3>

          <div class="space-y-3">
            <div class="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <p class="font-medium text-white">Mistral AI (Primary Provider)</p>
                <p class="text-xs text-slate-400">Handles Summary, SEO, documentation generation</p>
              </div>
              <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            <div class="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div>
                <p class="font-medium text-white">Google Gemini (Fallback Provider)</p>
                <p class="text-xs text-slate-400">Automatic fallback when Mistral is offline</p>
              </div>
              <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                READY
              </span>
            </div>
          </div>
        </div>

        <!-- Recent AI Jobs List -->
        <div class="p-6 rounded-2xl bg-slate-900/40 border border-white/5 backdrop-blur-md space-y-4">
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <app-icon name="list" size="18" class="text-cyan-400"></app-icon>
            Recent AI Job Executions
          </h3>

          @if (aiJobs().length === 0) {
            <p class="text-sm text-slate-400">No recent AI job executions found.</p>
          } @else {
            <div class="space-y-2">
              @for (job of aiJobs(); track job.id) {
                <div class="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span class="font-semibold text-white">{{ job.taskType }}</span>
                    <span class="text-slate-400 ml-2">({{ job.providerName }})</span>
                  </div>
                  <span [ngClass]="{
                    'text-emerald-400': job.status === 'COMPLETED',
                    'text-amber-400': job.status === 'PROCESSING' || job.status === 'QUEUED',
                    'text-rose-400': job.status === 'FAILED'
                  }" class="font-semibold">
                    {{ job.status }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
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
      next: page => this.aiJobs.set(page?.content || []),
      error: () => {}
    });
  }

  approveTool(id: string): void {
    this.adminSvc.approveTool(id).subscribe({
      next: () => {
        this.toastSvc.success('Tool approved and published!');
        this.loadPendingTools();
      },
      error: () => this.toastSvc.error('Failed to approve tool')
    });
  }

  rejectTool(id: string): void {
    this.adminSvc.rejectTool(id).subscribe({
      next: () => {
        this.toastSvc.success('Tool rejected');
        this.loadPendingTools();
      },
      error: () => this.toastSvc.error('Failed to reject tool')
    });
  }
}
