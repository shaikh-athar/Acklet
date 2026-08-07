import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ToolsService, Deployment } from '../../../../core/services/tools.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-deployment-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, FormsModule],
  template: `
    <div class="dd-wrapper">
      @if (loading()) {
        <div class="dd-loading-state">
          <div class="dd-spinner"></div>
          <p>Loading deployment details...</p>
        </div>
      } @else if (!deployment()) {
        <div class="dd-error-state">
          <app-icon name="alert-triangle" class="dd-error-icon" />
          <h2>Deployment Not Found</h2>
          <p>We couldn't locate the specified deployment records. Make sure the ID is correct.</p>
          <a [routerLink]="['/workspace/tools/manage', toolId]" class="dd-btn dd-btn-primary">Return to Tool Workspace</a>
        </div>
      } @else {
        <!-- Back Navigation -->
        <div class="dd-back">
          <a [routerLink]="['/workspace/tools/manage', toolId]" class="dd-back-link">
            <app-icon name="arrow-left" class="dd-back-icon" />
            <span>Back to Workspace</span>
          </a>
        </div>

        <!-- Header -->
        <div class="dd-header">
          <div class="dd-header-left">
            <div class="dd-status-indicator" [class.ready]="deployment()?.status === 'SUCCESS'" [class.error]="deployment()?.status === 'FAILED'" [class.building]="deployment()?.status === 'BUILDING'"></div>
            <div>
              <h1 class="dd-title">Deployment Details</h1>
              <p class="dd-subtitle">Commit: {{ deployment()?.commitMessage }} ({{ deployment()?.commitSha?.substring(0, 7) }})</p>
            </div>
          </div>
          <div class="dd-header-actions">
            <button class="dd-btn dd-btn-secondary" (click)="triggerRedeploy()" [disabled]="actionRunning()">
              <app-icon name="refresh-cw" class="dd-btn-icon" [class.spin]="actionRunning()" />
              <span>Redeploy</span>
            </button>
            <button class="dd-btn dd-btn-secondary" (click)="triggerRollback()" [disabled]="actionRunning() || deployment()?.status !== 'SUCCESS'">
              <app-icon name="git-pull-request" class="dd-btn-icon" />
              <span>Rollback here</span>
            </button>
            @if (deployment()?.liveUrl) {
              <a [href]="deployment()?.liveUrl" target="_blank" class="dd-btn dd-btn-primary">
                Visit Tool ↗
              </a>
            }
          </div>
        </div>

        <!-- Info Grid -->
        <div class="dd-details-grid">
          <div class="dd-detail-card">
            <div class="dd-detail-label">Status</div>
            <div class="dd-detail-value" [class.text-emerald]="deployment()?.status === 'SUCCESS'" [class.text-amber]="deployment()?.status === 'BUILDING'" [class.text-red]="deployment()?.status === 'FAILED'">
              {{ deployment()?.status }}
            </div>
          </div>
          <div class="dd-detail-card">
            <div class="dd-detail-label">Created By</div>
            <div class="dd-detail-value">{{ deployment()?.createdBy }}</div>
          </div>
          <div class="dd-detail-card">
            <div class="dd-detail-label">Duration</div>
            <div class="dd-detail-value">{{ formatDuration(deployment()?.durationMs) }}</div>
          </div>
          <div class="dd-detail-card">
            <div class="dd-detail-label">Environment</div>
            <div class="dd-detail-value">Production</div>
          </div>
          <div class="dd-detail-card">
            <div class="dd-detail-label">Branch</div>
            <div class="dd-detail-value font-mono">{{ deployment()?.branch }}</div>
          </div>
          <div class="dd-detail-card">
            <div class="dd-detail-label">Framework</div>
            <div class="dd-detail-value font-mono">{{ deployment()?.framework || 'Static Site' }}</div>
          </div>
        </div>

        <!-- Logs Panels -->
        <div class="dd-logs-container">
          <div class="dd-logs-tabs">
            <button (click)="activeLogsTab.set('build')" [class.active-logs-tab]="activeLogsTab() === 'build'" class="logs-tab-btn">Build Logs</button>
            <button (click)="activeLogsTab.set('runtime')" [class.active-logs-tab]="activeLogsTab() === 'runtime'" class="logs-tab-btn">Runtime Logs</button>
          </div>
          
          <div class="dd-terminal">
            <pre class="dd-terminal-body">{{ activeLogs() }}</pre>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dd-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 16px;
      color: #f4f4f5;
    }

    .dd-loading-state, .dd-error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      text-align: center;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
    }

    .dd-error-icon {
      width: 48px;
      height: 48px;
      color: #ef4444;
      margin-bottom: 16px;
    }

    .dd-back {
      display: flex;
      align-items: center;
    }

    .dd-back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #a1a1aa;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .dd-back-link:hover {
      color: #f4f4f5;
    }

    .dd-back-icon {
      width: 14px;
      height: 14px;
    }

    .dd-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid #27272a;
    }

    .dd-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .dd-status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #71717a;
    }

    .dd-status-indicator.ready { background: #22c55e; }
    .dd-status-indicator.error { background: #ef4444; }
    .dd-status-indicator.building { background: #f59e0b; }

    .dd-title {
      font-size: 20px;
      font-weight: 700;
      color: #f4f4f5;
      margin: 0;
    }

    .dd-subtitle {
      font-size: 13px;
      color: #a1a1aa;
      margin: 4px 0 0 0;
    }

    .dd-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dd-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
    }

    .dd-btn-primary {
      background: #6366f1;
      color: #ffffff;
      border: none;
    }

    .dd-btn-primary:hover {
      background: #4f46e5;
    }

    .dd-btn-secondary {
      background: #18181b;
      border: 1px solid #27272a;
      color: #f4f4f5;
    }

    .dd-btn-secondary:hover {
      background: #27272a;
    }

    .dd-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .dd-btn-icon {
      width: 14px;
      height: 14px;
    }

    .dd-btn-icon.spin {
      animation: spin 1s linear infinite;
    }

    .dd-details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .dd-detail-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dd-detail-label {
      font-size: 12px;
      color: #a1a1aa;
    }

    .dd-detail-value {
      font-size: 15px;
      font-weight: 600;
      color: #f4f4f5;
    }

    .dd-detail-value.font-mono {
      font-family: monospace;
    }

    .text-emerald { color: #22c55e; }
    .text-amber { color: #f59e0b; }
    .text-red { color: #ef4444; }

    .dd-logs-container {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dd-logs-tabs {
      display: flex;
      align-items: center;
      background: #18181b;
      border-bottom: 1px solid #27272a;
    }

    .logs-tab-btn {
      padding: 12px 18px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #a1a1aa;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
    }

    .logs-tab-btn:hover {
      color: #f4f4f5;
    }

    .active-logs-tab {
      border-bottom-color: #6366f1;
      color: #f4f4f5;
      font-weight: 600;
    }

    .dd-terminal {
      background: #040405;
      padding: 16px;
      max-height: 500px;
      overflow-y: auto;
    }

    .dd-terminal-body {
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #a1a1aa;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .dd-spinner {
      border: 3px solid #27272a;
      border-top: 3px solid #6366f1;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class DeploymentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toolsService = inject(ToolsService);

  toolId = '';
  deploymentId = '';
  readonly deployment = signal<Deployment | null>(null);
  readonly loading = signal<boolean>(true);
  readonly activeLogsTab = signal<string>('build');
  readonly actionRunning = signal<boolean>(false);

  ngOnInit(): void {
    this.toolId = this.route.snapshot.paramMap.get('id') || '';
    this.deploymentId = this.route.snapshot.paramMap.get('depId') || '';

    if (this.deploymentId) {
      this.loadDeployment();
    } else {
      this.loading.set(false);
    }
  }

  loadDeployment(): void {
    this.toolsService.getDeploymentDetails(this.deploymentId).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.deployment.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  activeLogs(): string {
    const dep = this.deployment();
    if (!dep) return 'No logs available.';
    return this.activeLogsTab() === 'build' 
      ? dep.buildLogs || 'No build logs captured.' 
      : dep.runtimeLogs || 'No runtime logs captured.';
  }

  formatDuration(ms?: number): string {
    if (!ms) return '0s';
    return (ms / 1000).toFixed(1) + 's';
  }

  triggerRollback(): void {
    if (this.actionRunning()) return;
    this.actionRunning.set(true);
    this.toolsService.rollbackDeployment(this.deploymentId).subscribe({
      next: () => {
        this.actionRunning.set(false);
        this.router.navigate(['/workspace/tools/manage', this.toolId]);
      },
      error: () => {
        this.actionRunning.set(false);
      }
    });
  }

  triggerRedeploy(): void {
    if (this.actionRunning()) return;
    this.actionRunning.set(true);
    this.toolsService.redeployDeployment(this.deploymentId).subscribe({
      next: () => {
        this.actionRunning.set(false);
        this.router.navigate(['/workspace/tools/manage', this.toolId]);
      },
      error: () => {
        this.actionRunning.set(false);
      }
    });
  }
}
