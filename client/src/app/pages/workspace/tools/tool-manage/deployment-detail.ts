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
        <!-- Top Breadcrumb Bar -->
        <div class="dd-top-nav">
          <div class="dd-breadcrumbs">
            <a [routerLink]="['/workspace/tools/manage', toolId]" class="dd-breadcrumb-link">Deployments</a>
            <span class="dd-breadcrumb-separator">/</span>
            <span class="dd-breadcrumb-current">{{ deploymentId.substring(0, 8) }}...</span>
            <app-icon name="copy" class="dd-copy-icon" (click)="copyId()" title="Copy Deployment ID" />
          </div>
          <div class="dd-top-actions">
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
                <app-icon name="external-link" class="dd-btn-icon" />
                <span>Visit Tool</span>
              </a>
            }
          </div>
        </div>

        <!-- Tabbed Menu -->
        <div class="dd-tabs">
          <button class="dd-tab-btn active">Deployment</button>
          <button class="dd-tab-btn" (click)="scrollToLogs()">Logs</button>
          <button class="dd-tab-btn">Source</button>
          <button class="dd-tab-btn">Sandbox</button>
        </div>

        <!-- Main Deployment Details Card -->
        <div class="dd-main-card">
          <!-- Left Status Box -->
          <div class="dd-status-box" [class.success]="deployment()?.status === 'SUCCESS'" [class.failed]="deployment()?.status === 'FAILED'" [class.building]="deployment()?.status === 'BUILDING'">
            <div class="dd-status-box-header">
              <app-icon [name]="deployment()?.status === 'SUCCESS' ? 'check-circle' : (deployment()?.status === 'FAILED' ? 'x-circle' : 'loader')" class="dd-status-box-icon" />
              <span>{{ deployment()?.status === 'SUCCESS' ? 'Deployment Live' : (deployment()?.status === 'FAILED' ? 'Build Failed' : 'Building Tool') }}</span>
            </div>
            <p class="dd-status-box-desc">
              {{ deployment()?.status === 'SUCCESS' ? 'Your live executable tool is ready and running.' : (deployment()?.status === 'FAILED' ? 'Build halted due to execution errors.' : 'Assembling workspace resources...') }}
            </p>
          </div>

          <!-- Right Metadata Grid -->
          <div class="dd-meta-grid">
            <div class="dd-meta-col">
              <span class="dd-meta-label">Created</span>
              <div class="dd-meta-value flex-align">
                <div class="dd-user-avatar">{{ deployment()?.createdBy?.charAt(0)?.toUpperCase() }}</div>
                <span>{{ deployment()?.createdBy }}</span>
              </div>
            </div>

            <div class="dd-meta-col">
              <span class="dd-meta-label">Status</span>
              <div class="dd-meta-value">
                <span class="dd-badge" [class.success]="deployment()?.status === 'SUCCESS'" [class.failed]="deployment()?.status === 'FAILED'" [class.building]="deployment()?.status === 'BUILDING'">
                  {{ deployment()?.status }}
                </span>
              </div>
            </div>

            <div class="dd-meta-col">
              <span class="dd-meta-label">Duration</span>
              <div class="dd-meta-value flex-align">
                <app-icon name="clock" class="dd-meta-icon" />
                <span>{{ formatDuration(deployment()?.durationMs) }}</span>
              </div>
            </div>

            <div class="dd-meta-col">
              <span class="dd-meta-label">Environment</span>
              <div class="dd-meta-value flex-align">
                <app-icon name="globe" class="dd-meta-icon" />
                <span>Production</span>
              </div>
            </div>

            <div class="dd-meta-col">
              <span class="dd-meta-label">Domains</span>
              <div class="dd-meta-value">
                <a [href]="deployment()?.liveUrl" target="_blank" class="dd-domain-link">
                  {{ toolId }}.acklet.app
                </a>
              </div>
            </div>

            <div class="dd-meta-col">
              <span class="dd-meta-label">Source</span>
              <div class="dd-meta-value flex-align-col">
                <span class="dd-branch-label">
                  <app-icon name="git-branch" class="dd-meta-icon" />
                  <span>{{ deployment()?.branch }}</span>
                </span>
                <span class="dd-commit-msg">
                  {{ deployment()?.commitMessage }} ({{ deployment()?.commitSha?.substring(0,7) }})
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordions -->
        <div class="dd-accordions">
          <!-- Accordion 1: Build Logs -->
          <div class="dd-accordion-card">
            <button class="dd-accordion-header" (click)="toggleLogs()">
              <div class="dd-accordion-header-left">
                <app-icon [name]="logsOpen() ? 'chevron-down' : 'chevron-right'" class="dd-accordion-arrow" />
                <app-icon name="terminal" class="dd-accordion-icon" />
                <span>Deployment and Build Logs</span>
              </div>
              <div class="dd-accordion-header-right">
                <span class="dd-log-timer">{{ formatDuration(deployment()?.durationMs) }}</span>
              </div>
            </button>
            
            @if (logsOpen()) {
              <div class="dd-accordion-content">
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

          <!-- Accordion 2: Deployment Summary -->
          <div class="dd-accordion-card">
            <button class="dd-accordion-header" (click)="summaryOpen.set(!summaryOpen())">
              <div class="dd-accordion-header-left">
                <app-icon [name]="summaryOpen() ? 'chevron-down' : 'chevron-right'" class="dd-accordion-arrow" />
                <app-icon name="info" class="dd-accordion-icon" />
                <span>Deployment Summary</span>
              </div>
            </button>
            @if (summaryOpen()) {
              <div class="dd-accordion-content padded">
                <table class="dd-summary-table">
                  <tr>
                    <td>Runtime Environment</td>
                    <td>{{ deployment()?.runtime || 'nodejs' }}</td>
                  </tr>
                  <tr>
                    <td>Package Manager</td>
                    <td>{{ deployment()?.packageManager || 'npm' }}</td>
                  </tr>
                  <tr>
                    <td>Build Command</td>
                    <td><code>{{ deployment()?.buildCommand || 'npm run build' }}</code></td>
                  </tr>
                  <tr>
                    <td>Start Command</td>
                    <td><code>{{ deployment()?.startCommand || 'npm start' }}</code></td>
                  </tr>
                </table>
              </div>
            }
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
      gap: 20px;
      padding: 24px;
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

    .dd-top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .dd-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #71717a;
    }

    .dd-breadcrumb-link {
      color: #f4f4f5;
      text-decoration: none;
      font-weight: 500;
    }

    .dd-breadcrumb-link:hover {
      text-decoration: underline;
    }

    .dd-copy-icon {
      width: 14px;
      height: 14px;
      cursor: pointer;
      color: #71717a;
      transition: color 0.15s ease;
    }

    .dd-copy-icon:hover {
      color: #f4f4f5;
    }

    .dd-top-actions {
      display: flex;
      gap: 8px;
    }

    .dd-tabs {
      display: flex;
      gap: 16px;
      border-bottom: 1px solid #27272a;
      padding-bottom: 8px;
    }

    .dd-tab-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 12px;
      border-bottom: 2px solid transparent;
      transition: color 0.15s ease, border-color 0.15s ease;
    }

    .dd-tab-btn:hover, .dd-tab-btn.active {
      color: #f4f4f5;
    }

    .dd-tab-btn.active {
      border-bottom-color: #f4f4f5;
    }

    .dd-main-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      display: grid;
      grid-template-columns: 1fr 2fr;
      overflow: hidden;
      min-height: 200px;
    }

    .dd-status-box {
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: #18181b;
      border-right: 1px solid #27272a;
    }

    .dd-status-box-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
    }

    .dd-status-box.success { color: #22c55e; }
    .dd-status-box.failed { color: #ef4444; }
    .dd-status-box.building { color: #f59e0b; }

    .dd-status-box-icon {
      width: 20px;
      height: 20px;
    }

    .dd-status-box-desc {
      font-size: 13px;
      color: #a1a1aa;
      margin: 8px 0 0 0;
      line-height: 1.5;
    }

    .dd-meta-grid {
      padding: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .dd-meta-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .dd-meta-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
    }

    .dd-meta-value {
      font-size: 13px;
      color: #f4f4f5;
      font-weight: 500;
    }

    .flex-align {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .flex-align-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dd-user-avatar {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #3f3f46;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
    }

    .dd-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .dd-badge.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
    .dd-badge.failed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    .dd-badge.building { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

    .dd-meta-icon {
      width: 14px;
      height: 14px;
      color: #71717a;
    }

    .dd-domain-link {
      color: #6366f1;
      text-decoration: none;
    }

    .dd-domain-link:hover {
      text-decoration: underline;
    }

    .dd-branch-label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: monospace;
      color: #f4f4f5;
    }

    .dd-commit-msg {
      font-size: 12px;
      color: #71717a;
    }

    .dd-accordions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dd-accordion-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      overflow: hidden;
    }

    .dd-accordion-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: transparent;
      border: none;
      color: #f4f4f5;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease;
    }

    .dd-accordion-header:hover {
      background: #18181b;
    }

    .dd-accordion-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dd-accordion-arrow {
      width: 16px;
      height: 16px;
      color: #71717a;
    }

    .dd-accordion-icon {
      width: 16px;
      height: 16px;
      color: #6366f1;
    }

    .dd-log-timer {
      font-size: 12px;
      color: #71717a;
      font-family: monospace;
    }

    .dd-accordion-content {
      border-top: 1px solid #27272a;
    }

    .dd-accordion-content.padded {
      padding: 16px 20px;
    }

    .dd-summary-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .dd-summary-table td {
      padding: 8px 0;
      color: #a1a1aa;
    }

    .dd-summary-table td:first-child {
      font-weight: 500;
      color: #71717a;
      width: 200px;
    }

    .dd-summary-table td code {
      font-family: monospace;
      background: #18181b;
      padding: 2px 6px;
      border-radius: 4px;
      color: #f4f4f5;
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
      max-height: 400px;
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
      border: 1px solid transparent;
      transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
    }

    .dd-btn-primary {
      background: #6366f1;
      color: #ffffff;
    }

    .dd-btn-primary:hover {
      background: #4f46e5;
    }

    .dd-btn-secondary {
      background: #18181b;
      border-color: #27272a;
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
  readonly logsOpen = signal<boolean>(true);
  readonly summaryOpen = signal<boolean>(false);

  toggleLogs(): void {
    this.logsOpen.set(!this.logsOpen());
  }

  copyId(): void {
    navigator.clipboard.writeText(this.deploymentId);
  }

  scrollToLogs(): void {
    const el = document.querySelector('.dd-accordions');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

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
