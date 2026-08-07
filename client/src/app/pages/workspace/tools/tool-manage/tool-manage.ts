import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ToolsService, Deployment } from '../../../../core/services/tools.service';
import { Tool } from '../../../../core/models/tool.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tool-manage',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, FormsModule],
  template: `
    <div class="tm-wrapper">
      @if (loading()) {
        <div class="tm-loading-state">
          <div class="tm-spinner"></div>
          <p>Loading developer workspace...</p>
        </div>
      } @else if (!tool()) {
        <div class="tm-error-state">
          <app-icon name="alert-triangle" class="tm-error-icon" />
          <h2>Tool Workspace Not Found</h2>
          <p>We couldn't locate the specified developer tool profile. Make sure the ID or slug is correct.</p>
          <a routerLink="/workspace" class="tm-btn tm-btn-primary">Return to Workspace</a>
        </div>
      } @else {
        <!-- Tool Header -->
        <div class="tm-header">
          <div class="tm-header-left">
            <div class="tm-avatar">
              {{ getInitials(tool()?.name) }}
            </div>
            <div class="tm-details">
              <div class="tm-title-row">
                <h1 class="tm-title">{{ tool()?.name }}</h1>
                <span class="tm-badge-status" [class.building]="syncStatus() === 'BUILDING'">
                  {{ syncStatus() }}
                </span>
                <span class="tm-badge-mode">
                  {{ tool()?.executionMode }}
                </span>
              </div>
              <p class="tm-repo-subtitle">
                <app-icon name="git-branch" class="tm-repo-icon" />
                <span>{{ tool()?.githubUrl || 'https://github.com/' + tool()?.slug }}</span>
              </p>
            </div>
          </div>
     
          <div class="tm-header-actions">
            <button class="tm-btn tm-btn-secondary" (click)="triggerResync()" [disabled]="syncStatus() === 'BUILDING'">
              @if (syncStatus() === 'BUILDING') {
                <span class="tm-spinner sm"></span>
                <span>Building...</span>
              } @else {
                <span>Trigger Re-sync</span>
              }
            </button>
            @if (tool()?.subdomain) {
              <a [href]="'http://localhost/tools/' + tool()?.slug" target="_blank" class="tm-btn tm-btn-primary">
                Visit Live Tool ↗
              </a>
            }
          </div>
        </div>
     
        <!-- Navigation Tabs (Vercel Style) -->
        <div class="tm-tabs">
          <button (click)="activeTab.set('overview')" [class.active-tab]="activeTab() === 'overview'" class="tab-btn">Overview</button>
          <button (click)="activeTab.set('deployments')" [class.active-tab]="activeTab() === 'deployments'" class="tab-btn">Deployments</button>
          <button (click)="activeTab.set('logs')" [class.active-tab]="activeTab() === 'logs'" class="tab-btn">Logs</button>
          <button (click)="activeTab.set('sandbox')" [class.active-tab]="activeTab() === 'sandbox'" class="tab-btn">Sandbox Execution</button>
          <button (click)="activeTab.set('settings')" [class.active-tab]="activeTab() === 'settings'" class="tab-btn">Settings</button>
        </div>
     
        <!-- Tab Contents -->
        <div [ngSwitch]="activeTab()" class="tm-content">
          
          <!-- OVERVIEW TAB -->
          <div *ngSwitchCase="'overview'" class="tm-tab-pane">
            <div class="tm-metrics-grid">
              <div class="tm-metric-card">
                <div class="tm-metric-label">Execution Count</div>
                <div class="tm-metric-value">{{ tool()?.usageCount }}</div>
              </div>
              <div class="tm-metric-card">
                <div class="tm-metric-label">Subdomain Domain</div>
                <div class="tm-metric-value font-mono text-indigo">{{ tool()?.subdomain }}</div>
              </div>
              <div class="tm-metric-card">
                <div class="tm-metric-label">Runtime Engine</div>
                <div class="tm-metric-value cyan">{{ tool()?.runtime || 'nodejs' }}</div>
              </div>
              <div class="tm-metric-card">
                <div class="tm-metric-label">Sandbox Status</div>
                <div class="tm-metric-value emerald">HEALTHY</div>
              </div>
            </div>

            <!-- Active Deployment Card -->
            @if (latestDeployment()) {
              <div class="tm-details-card">
                <div class="dd-header-row">
                  <h3 class="tm-card-title">Production Deployment</h3>
                  <span class="tm-badge-status ready">Active</span>
                </div>
                <div class="active-dep-content">
                  <div class="dep-info-line">
                    <span class="dep-lbl">Deployment:</span>
                    <a [routerLink]="['/workspace/tools/manage', tool()?.slug, 'deployments', latestDeployment()?.id]" class="dep-link">
                      {{ latestDeployment()?.commitMessage }} ({{ latestDeployment()?.commitSha?.substring(0,7) }})
                    </a>
                  </div>
                  <div class="dep-info-line">
                    <span class="dep-lbl">Duration:</span>
                    <span>{{ formatDuration(latestDeployment()?.durationMs) }}</span>
                  </div>
                  <div class="dep-info-line">
                    <span class="dep-lbl">Created By:</span>
                    <span>{{ latestDeployment()?.createdBy }}</span>
                  </div>
                  <div class="dep-info-line">
                    <span class="dep-lbl">Date:</span>
                    <span>{{ latestDeployment()?.createdAt | date:'short' }}</span>
                  </div>
                </div>
              </div>
            }

            <!-- Recent Deployments List -->
            <div class="tm-details-card">
              <h3 class="tm-card-title">Recent Deployments</h3>
              <div class="dep-table-container">
                <table class="dep-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Commit</th>
                      <th>Branch</th>
                      <th>Created By</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (dep of deployments(); track dep.id) {
                      <tr [routerLink]="['/workspace/tools/manage', tool()?.slug, 'deployments', dep.id]" class="clickable-row">
                        <td>
                          <span class="status-pill" [class.ready]="dep.status === 'SUCCESS'" [class.building]="dep.status === 'BUILDING'">
                            {{ dep.status }}
                          </span>
                        </td>
                        <td class="font-mono text-indigo">{{ dep.commitSha?.substring(0,7) }} · {{ dep.commitMessage }}</td>
                        <td>{{ dep.branch }}</td>
                        <td>{{ dep.createdBy }}</td>
                        <td>{{ dep.createdAt | date:'short' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="text-center">No deployments found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- DEPLOYMENTS TAB -->
          <div *ngSwitchCase="'deployments'" class="tm-tab-pane">
            <div class="tm-details-card">
              <h3 class="tm-card-title">Deployment History</h3>
              <div class="dep-table-container">
                <table class="dep-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Commit</th>
                      <th>Branch</th>
                      <th>Duration</th>
                      <th>Created By</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (dep of deployments(); track dep.id) {
                      <tr [routerLink]="['/workspace/tools/manage', tool()?.slug, 'deployments', dep.id]" class="clickable-row">
                        <td>
                          <span class="status-pill" [class.ready]="dep.status === 'SUCCESS'" [class.building]="dep.status === 'BUILDING'">
                            {{ dep.status }}
                          </span>
                        </td>
                        <td class="font-mono text-indigo">{{ dep.commitSha?.substring(0,7) }} · {{ dep.commitMessage }}</td>
                        <td>{{ dep.branch }}</td>
                        <td>{{ formatDuration(dep.durationMs) }}</td>
                        <td>{{ dep.createdBy }}</td>
                        <td>{{ dep.createdAt | date:'medium' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="text-center">No deployments found.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- LOGS TAB -->
          <div *ngSwitchCase="'logs'" class="tm-tab-pane">
            <div class="tm-details-card">
              <div class="logs-header-row">
                <h3 class="tm-card-title">Build & Runtime Logs</h3>
                <div class="logs-toggle">
                  <button (click)="logsView.set('build')" [class.active-btn]="logsView() === 'build'">Build Logs</button>
                  <button (click)="logsView.set('runtime')" [class.active-btn]="logsView() === 'runtime'">Runtime Logs</button>
                </div>
              </div>
              <div class="logs-console">
                <pre class="logs-body">{{ activeLogs() }}</pre>
              </div>
            </div>
          </div>

          <!-- SANDBOX EXECUTION TAB -->
          <div *ngSwitchCase="'sandbox'" class="tm-tab-pane sandbox-container">
            <div class="sandbox-grid">
              <!-- Left: Form inputs -->
              <div class="tm-details-card sandbox-input">
                <h3 class="tm-card-title">Sandbox Inputs</h3>
                <p class="tm-card-desc">Provide parameter fields below to trigger execution simulation in the sandbox container.</p>
                
                <div class="form-group">
                  <label class="form-label">Input Text / Payload</label>
                  <textarea class="form-textarea" [(ngModel)]="sandboxInputText" placeholder="Enter file payload, JSON configs, or raw string data..."></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Payload Size</label>
                    <input type="text" class="form-input" [(ngModel)]="sandboxPayloadSize" placeholder="e.g. 4.2 MB" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Mock Execution Mode</label>
                    <select class="form-select" [(ngModel)]="sandboxExecMode">
                      <option value="standard">Standard Run</option>
                      <option value="verbose">Verbose Logs</option>
                    </select>
                  </div>
                </div>

                <button class="tm-btn tm-btn-primary run-btn" (click)="runSandboxTool()" [disabled]="runningExecution()">
                  @if (runningExecution()) {
                    <span class="tm-spinner sm"></span>
                    <span>Running in Sandbox...</span>
                  } @else {
                    <app-icon name="play" class="run-icon" />
                    <span>Run Tool Action</span>
                  }
                </button>
              </div>

              <!-- Right: Logs & Terminal output -->
              <div class="tm-details-card sandbox-console">
                <div class="console-header">
                  <h3 class="tm-card-title console-title">Sandbox Console Logs</h3>
                  <button class="console-clear-btn" (click)="clearConsole()">Clear</button>
                </div>
                <div class="console-body">
                  @if (consoleLogs().length === 0) {
                    <div class="console-placeholder">
                      <app-icon name="terminal" class="console-icon" />
                      <p>Console idle. Click "Run Tool Action" to execute container sandbox.</p>
                    </div>
                  } @else {
                    @for (log of consoleLogs(); track log) {
                      <div class="console-line">{{ log }}</div>
                    }
                  }
                </div>

                @if (executionResult()) {
                  <div class="console-result">
                    <div class="result-title">Result Output:</div>
                    <pre class="result-raw">{{ executionResult() | json }}</pre>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- SETTINGS TAB -->
          <div *ngSwitchCase="'settings'" class="tm-details-card">
            <h3 class="tm-card-title">Tool Configuration</h3>
            <div class="form-group">
              <label class="form-label">Live Tool Subdomain Prefix</label>
              <input type="text" class="form-input" [ngModel]="tool()?.slug" readonly />
            </div>

            <div class="form-group">
              <label class="form-label">Build Command Override</label>
              <input type="text" class="form-input" [ngModel]="tool()?.buildCommand" />
            </div>

            <div class="form-group">
              <label class="form-label">Start Command Override</label>
              <input type="text" class="form-input" [ngModel]="tool()?.startCommand" />
            </div>

            <!-- Environment Variables -->
            <div class="env-section">
              <h4 class="env-title">Environment Variables</h4>
              <div class="env-list">
                <div class="env-item">
                  <span class="env-key font-mono">NODE_ENV</span>
                  <span class="env-val font-mono">production</span>
                </div>
                <div class="env-item">
                  <span class="env-key font-mono">PORT</span>
                  <span class="env-val font-mono">{{ tool()?.port }}</span>
                </div>
              </div>
              <div class="env-add-row">
                <input type="text" placeholder="KEY" class="form-input env-input" [(ngModel)]="newEnvKey" />
                <input type="text" placeholder="VALUE" class="form-input env-input" [(ngModel)]="newEnvValue" />
                <button class="tm-btn tm-btn-secondary" (click)="addEnvVar()">Add</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      color: #f4f4f5;
    }

    .tm-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 16px;
    }

    .tm-loading-state, .tm-error-state {
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

    .tm-error-icon {
      width: 48px;
      height: 48px;
      color: #ef4444;
      margin-bottom: 16px;
    }

    .tm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid #27272a;
    }
 
    .tm-header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
 
    .tm-avatar {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #06b6d4);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
    }
 
    .tm-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
 
    .tm-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
 
    .tm-title {
      font-size: 20px;
      font-weight: 700;
      color: #f4f4f5;
      margin: 0;
    }
 
    .tm-badge-status {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .tm-badge-status.building {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.2);
    }

    .tm-badge-status.ready {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border-color: rgba(34, 197, 94, 0.2);
    }

    .tm-badge-mode {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(99, 102, 241, 0.1);
      color: #6366f1;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
 
    .tm-repo-subtitle {
      font-size: 12px;
      color: #a1a1aa;
      font-family: monospace;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
 
    .tm-repo-icon {
      width: 14px;
      height: 14px;
    }
 
    .tm-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
 
    .tm-btn {
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
 
    .tm-btn-primary {
      background: #6366f1;
      color: #ffffff;
      border: none;
    }
 
    .tm-btn-primary:hover {
      background: #4f46e5;
    }
 
    .tm-btn-secondary {
      background: #18181b;
      border: 1px solid #27272a;
      color: #f4f4f5;
    }
 
    .tm-btn-secondary:hover {
      background: #27272a;
    }
 
    .tm-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
 
    .tm-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #27272a;
      overflow-x: auto;
    }
 
    .tab-btn {
      padding: 10px 14px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #a1a1aa;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
      white-space: nowrap;
    }
 
    .tab-btn:hover {
      color: #f4f4f5;
    }
 
    .active-tab {
      border-bottom-color: #6366f1;
      color: #f4f4f5 !important;
      font-weight: 600;
    }
 
    .tm-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .tm-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
 
    .tm-metric-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
 
    .tm-metric-label {
      font-size: 12px;
      color: #a1a1aa;
    }
 
    .tm-metric-value {
      font-size: 18px;
      font-weight: 700;
      color: #f4f4f5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
 
    .tm-metric-value.cyan { color: #06b6d4; }
    .tm-metric-value.emerald { color: #22c55e; }
    .tm-metric-value.text-indigo { color: #818cf8; }
 
    .tm-details-card {
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .tm-card-title {
      font-size: 14px;
      font-weight: 600;
      color: #f4f4f5;
      margin: 0;
    }
 
    .dd-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .active-dep-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }

    .dep-info-line {
      display: flex;
      gap: 10px;
    }

    .dep-lbl {
      color: #a1a1aa;
      width: 100px;
      flex-shrink: 0;
    }

    .dep-link {
      color: #6366f1;
      text-decoration: none;
      font-weight: 600;
    }

    .dep-link:hover {
      text-decoration: underline;
    }

    .dep-table-container {
      overflow-x: auto;
    }

    .dep-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .dep-table th, .dep-table td {
      padding: 12px;
      border-bottom: 1px solid #27272a;
    }

    .dep-table th {
      color: #a1a1aa;
      font-weight: 600;
    }

    .clickable-row {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .clickable-row:hover {
      background: #18181b;
    }

    .status-pill {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(113, 113, 122, 0.1);
      color: #a1a1aa;
    }

    .status-pill.ready {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .status-pill.building {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }

    .logs-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logs-toggle {
      display: flex;
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      padding: 2px;
    }

    .logs-toggle button {
      padding: 6px 12px;
      background: transparent;
      border: none;
      color: #a1a1aa;
      font-size: 11px;
      cursor: pointer;
      border-radius: 4px;
    }

    .logs-toggle button.active-btn {
      background: #27272a;
      color: #f4f4f5;
      font-weight: 600;
    }

    .logs-console {
      background: #040405;
      border: 1px solid #18181b;
      border-radius: 6px;
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .logs-body {
      margin: 0;
      font-family: monospace;
      font-size: 12px;
      color: #a1a1aa;
      white-space: pre-wrap;
    }

    .env-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
      border-top: 1px solid #27272a;
      padding-top: 16px;
    }

    .env-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
    }

    .env-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .env-item {
      display: flex;
      justify-content: space-between;
      background: #18181b;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #27272a;
      font-size: 12px;
    }

    .env-key { color: #818cf8; font-weight: 600; }
    .env-val { color: #34d399; }

    .env-add-row {
      display: flex;
      gap: 10px;
      margin-top: 8px;
    }

    .env-input {
      flex: 1;
    }

    /* Sandbox layout */
    .sandbox-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    @media (min-width: 900px) {
      .sandbox-grid {
        grid-template-columns: 4fr 5fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: #a1a1aa;
    }

    .form-input, .form-textarea, .form-select {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 6px;
      color: #f4f4f5;
      padding: 8px 12px;
      font-size: 13px;
      outline: none;
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      border-color: #6366f1;
    }

    .form-textarea {
      min-height: 120px;
      resize: vertical;
      font-family: monospace;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .run-btn {
      width: 100%;
      margin-top: 10px;
    }

    .run-icon {
      width: 14px;
      height: 14px;
    }

    .sandbox-console {
      display: flex;
      flex-direction: column;
      height: 480px;
      background: #09090b;
    }

    .console-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #27272a;
      padding-bottom: 10px;
    }

    .console-clear-btn {
      background: transparent;
      border: none;
      color: #71717a;
      font-size: 11px;
      cursor: pointer;
    }

    .console-clear-btn:hover {
      color: #f4f4f5;
    }

    .console-body {
      flex: 1;
      background: #040405;
      border: 1px solid #18181b;
      border-radius: 6px;
      padding: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #38bdf8;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .console-line {
      white-space: pre-wrap;
      word-break: break-all;
    }

    .console-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #71717a;
      gap: 8px;
    }

    .console-placeholder .console-icon {
      width: 24px;
      height: 24px;
    }

    .console-result {
      margin-top: 12px;
      border-top: 1px solid #27272a;
      padding-top: 12px;
    }

    .result-title {
      font-size: 11px;
      font-weight: 700;
      color: #a1a1aa;
      margin-bottom: 4px;
    }

    .result-raw {
      background: #18181b;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 10px;
      color: #34d399;
      margin: 0;
      overflow-x: auto;
    }

    .tm-spinner {
      border: 3px solid #27272a;
      border-top: 3px solid #6366f1;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      animation: spin 0.8s linear infinite;
    }

    .tm-spinner.sm {
      width: 14px;
      height: 14px;
      border-width: 2px;
    }

    .font-mono {
      font-family: monospace;
    }

    .text-indigo { color: #818cf8; }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `],
})
export class ToolManageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toolsService = inject(ToolsService);

  readonly tool = signal<Tool | null>(null);
  readonly loading = signal<boolean>(true);
  readonly activeTab = signal<string>('overview');
  readonly syncStatus = signal<string>('SYNCED');

  // Deployments list
  readonly deployments = signal<Deployment[]>([]);
  readonly latestDeployment = signal<Deployment | null>(null);
  readonly logsView = signal<string>('build');

  // Settings / Env vars
  newEnvKey = '';
  newEnvValue = '';

  // Sandbox inputs
  sandboxInputText = 'Sample target input document content for Acklet platform...';
  sandboxPayloadSize = '2.4 MB';
  sandboxExecMode = 'standard';

  readonly runningExecution = signal<boolean>(false);
  readonly consoleLogs = signal<string[]>([]);
  readonly executionResult = signal<any | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.toolsService.getToolBySlug(id).subscribe({
        next: (t) => {
          if (t) {
            this.tool.set(t);
            if (t.status === 'PENDING') {
              this.syncStatus.set('BUILDING');
            }
            if (t.repositoryId) {
              this.loadDeployments(t.repositoryId);
            }
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  loadDeployments(repoId: string): void {
    this.toolsService.getDeployments(repoId).subscribe(res => {
      if (res && res.data) {
        this.deployments.set(res.data);
        if (res.data.length > 0) {
          this.latestDeployment.set(res.data[0]);
        }
      }
    });
  }

  activeLogs(): string {
    const dep = this.latestDeployment();
    if (!dep) return 'No deployment logs captured.';
    return this.logsView() === 'build' 
      ? dep.buildLogs || 'No build logs captured.' 
      : dep.runtimeLogs || 'No runtime logs captured.';
  }

  formatDuration(ms?: number): string {
    if (!ms) return '0s';
    return (ms / 1000).toFixed(1) + 's';
  }

  addEnvVar(): void {
    if (!this.newEnvKey || !this.newEnvValue) return;
    this.newEnvKey = '';
    this.newEnvValue = '';
  }

  getInitials(name?: string): string {
    if (!name) return 'AT';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  triggerResync(): void {
    const t = this.tool();
    if (!t || !t.repositoryId) return;

    this.syncStatus.set('BUILDING');
    this.toolsService.redeployDeployment(t.id).subscribe(() => {
      this.loadDeployments(t.repositoryId!);
      this.syncStatus.set('SYNCED');
    });
  }

  runSandboxTool(): void {
    const t = this.tool();
    if (!t) return;

    this.runningExecution.set(true);
    this.executionResult.set(null);
    this.consoleLogs.set([
      '[acklet-sandbox] Initializing container runtime environment...',
      `[acklet-sandbox] Checking execution routing rules (mode: ${t.executionMode})...`
    ]);

    const inputs = {
      text: this.sandboxInputText,
      size: this.sandboxPayloadSize,
      mode: this.sandboxExecMode
    };

    setTimeout(() => {
      this.toolsService.executeTool(t.id, inputs).subscribe({
        next: (res) => {
          if (res && res.data) {
            this.consoleLogs.set(res.data.logs || []);
            this.executionResult.set(res.data.results || {});
          }
          this.runningExecution.set(false);
        },
        error: (err) => {
          this.consoleLogs.update(logs => [
            ...logs,
            `[acklet-error] Execution failed: ${err.message || 'Unknown sandbox runtime error'}`
          ]);
          this.runningExecution.set(false);
        }
      });
    }, 1500);
  }

  clearConsole(): void {
    this.consoleLogs.set([]);
    this.executionResult.set(null);
  }
}
