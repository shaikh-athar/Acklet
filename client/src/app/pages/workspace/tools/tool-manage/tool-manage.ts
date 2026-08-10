import { Component, signal, inject, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { ToolsService, Deployment } from '../../../../core/services/tools.service';
import { WorkspaceStateService } from '../../../../core/services/workspace-state.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { DEFAULT_FEATURE_FLAGS } from '../../../../core/config/features.config';
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
     
          <div class="tm-header-actions" style="display: flex; gap: 8px; align-items: center;">
            <button class="tm-btn tm-btn-secondary" (click)="triggerResync()" [disabled]="syncStatus() === 'BUILDING'">
              @if (syncStatus() === 'BUILDING') {
                <span class="tm-spinner sm"></span>
                <span>Building...</span>
              } @else {
                <span>Trigger Re-sync</span>
              }
            </button>

            <!-- Runtime Engine Lifecycle Buttons -->
            @if (runtimeInstance()?.status === 'RUNNING') {
              <button class="tm-btn tm-btn-secondary" (click)="stopCurrentRuntime()" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);" title="Stop Runtime Process">
                <app-icon name="square" style="width: 12px; height: 12px;" />
                <span>Stop</span>
              </button>
              <button class="tm-btn tm-btn-secondary" (click)="sleepCurrentRuntime()" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.3);" title="Put Runtime to Sleep">
                <app-icon name="moon" style="width: 12px; height: 12px;" />
                <span>Sleep</span>
              </button>
            } @else if (runtimeInstance()?.status === 'SLEEPING') {
              <button class="tm-btn tm-btn-secondary" (click)="wakeCurrentRuntime()" style="color: #10b981; border-color: rgba(16, 185, 129, 0.3);" title="Wake Runtime">
                <app-icon name="sun" style="width: 12px; height: 12px;" />
                <span>Wake</span>
              </button>
            }
            <button class="tm-btn tm-btn-secondary" (click)="restartCurrentRuntime()" title="Restart Runtime">
              <app-icon name="refresh-cw" style="width: 12px; height: 12px;" />
              <span>Restart</span>
            </button>

            @if (tool()?.subdomain) {
              <a [href]="getToolUrl(tool())" target="_blank" class="tm-btn tm-btn-primary">
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
                <div class="tm-metric-value domain">{{ tool()?.subdomain }}</div>
              </div>
              <div class="tm-metric-card">
                <div class="tm-metric-label">Runtime Engine</div>
                <div class="tm-metric-value">{{ tool()?.runtime || 'nodejs' }}</div>
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
            <div class="tm-details-card" style="margin-top: 20px;">
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

            <!-- Filter Pills (Coolify-style) -->
            <div class="dep-filters-row">
              @for (f of depFilters; track f.key) {
                <button
                  class="dep-filter-pill"
                  [class.active]="deploymentFilter() === f.key"
                  [class.pill-ready]="f.key === 'SUCCESS'"
                  [class.pill-building]="f.key === 'BUILDING'"
                  [class.pill-error]="f.key === 'FAILED'"
                  (click)="deploymentFilter.set(f.key)">
                  <span class="pill-dot" [class.dot-ready]="f.key === 'SUCCESS'" [class.dot-building]="f.key === 'BUILDING'" [class.dot-error]="f.key === 'FAILED'"></span>
                  {{ f.label }}
                  @if (depCounts()[f.key]) {
                    <span class="pill-count">{{ depCounts()[f.key] }}</span>
                  }
                </button>
              }
              <button class="tm-btn tm-btn-primary" style="margin-left: auto; padding: 5px 14px; font-size: 12px;" (click)="triggerResync()" [disabled]="syncStatus() === 'BUILDING'">
                @if (syncStatus() === 'BUILDING') {
                  <span class="tm-spinner sm"></span>
                } @else {
                  <app-icon name="refresh-cw" style="width: 12px; height: 12px;"/>
                }
                Redeploy
              </button>
            </div>

            <!-- Deployment list (Coolify-style cards) -->
            <div class="dep-list">
              @if (filteredDeployments().length === 0) {
                <div class="dep-empty">
                  <app-icon name="layers" class="dep-empty-icon"/>
                  <p>No deployments match this filter.</p>
                </div>
              }
              @for (dep of filteredDeployments(); track dep.id; let i = $index) {
                <div class="dep-card" [class.active-dep]="i === 0 && (dep.status === 'SUCCESS')">

                  <!-- Status icon column -->
                  <div class="dep-status-col">
                    <div class="dep-status-icon" [ngClass]="depIconClass(dep.status)">
                      @if (dep.status === 'BUILDING' || dep.status === 'DEPLOYING') {
                        <div class="dep-spinner"></div>
                      } @else if (dep.status === 'SUCCESS') {
                        <app-icon name="check" class="dep-si"/>
                      } @else if (dep.status === 'FAILED') {
                        <app-icon name="x" class="dep-si"/>
                      } @else if (dep.status === 'CANCELLED') {
                        <app-icon name="minus" class="dep-si"/>
                      } @else {
                        <div class="dep-queued-dot"></div>
                      }
                    </div>
                    @if (i < filteredDeployments().length - 1) {
                      <div class="dep-status-line" [class.done]="dep.status === 'SUCCESS'"></div>
                    }
                  </div>

                  <!-- Main info -->
                  <div class="dep-card-body" (click)="openDrawer(dep)">
                    <div class="dep-card-top">
                      <div class="dep-card-left">
                        <span class="dep-card-msg">{{ dep.commitMessage || 'Deployment' }}</span>
                        <span class="dep-status-badge" [ngClass]="depBadgeClass(dep.status)">
                          @if (dep.status === 'BUILDING' || dep.status === 'DEPLOYING') {
                            <span class="dep-pulse"></span>
                          }
                          {{ depStatusLabel(dep.status) }}
                        </span>
                        @if (i === 0 && dep.status === 'SUCCESS') {
                          <span class="dep-production-badge">● PRODUCTION</span>
                        }
                      </div>
                      <div class="dep-card-actions">
                        @if (dep.status === 'BUILDING' || dep.status === 'DEPLOYING') {
                          <button class="dep-action-btn cancel" (click)="$event.stopPropagation(); cancelDeployment(dep)" title="Cancel deployment">
                            <app-icon name="square" style="width:11px;height:11px;"/> Cancel
                          </button>
                        } @else if (dep.status === 'SUCCESS' || dep.status === 'FAILED') {
                          <button class="dep-action-btn redeploy" (click)="$event.stopPropagation(); triggerResync()" title="Redeploy">
                            <app-icon name="refresh-cw" style="width:11px;height:11px;"/> Redeploy
                          </button>
                        }
                        <button class="dep-action-btn" (click)="$event.stopPropagation(); openDrawer(dep)" title="View logs">
                          <app-icon name="terminal" style="width:11px;height:11px;"/> Logs
                        </button>
                      </div>
                    </div>

                    <div class="dep-card-meta">
                      @if (dep.commitSha) {
                        <span class="dep-meta-chip mono"><app-icon name="git-commit" class="dep-meta-icon"/> {{ dep.commitSha.substring(0, 7) }}</span>
                      }
                      @if (dep.branch) {
                        <span class="dep-meta-chip"><app-icon name="git-branch" class="dep-meta-icon"/> {{ dep.branch }}</span>
                      }
                      @if (dep.durationMs) {
                        <span class="dep-meta-chip"><app-icon name="clock" class="dep-meta-icon"/> {{ formatDuration(dep.durationMs) }}</span>
                      }
                      @if (dep.createdBy) {
                        <span class="dep-meta-chip"><app-icon name="user" class="dep-meta-icon"/> {{ dep.createdBy }}</span>
                      }
                      @if (dep.createdAt) {
                        <span class="dep-meta-chip muted">{{ relativeTime(dep.createdAt) }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
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

            <!-- Danger Zone -->
            <div class="danger-section">
              <h4 class="danger-title">Danger Zone</h4>
              <p class="danger-desc">
                Permanently delete this developer tool and remove its associated configuration. This action cannot be undone.
              </p>
              <button class="tm-btn tm-btn-danger" (click)="deleteCurrentTool()">
                <app-icon name="trash" class="size-2" />
                <span>Delete Tool</span>
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- ═══ Deployment Log Drawer ═══ -->
    @if (drawerOpen()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
      <div class="dep-drawer" [class.drawer-visible]="drawerOpen()">

        <!-- Drawer header -->
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span class="drawer-title">Deployment Details</span>
            <span class="dep-status-badge" [ngClass]="depBadgeClass(selectedDeployment()?.status)">
              @if (selectedDeployment()?.status === 'BUILDING' || selectedDeployment()?.status === 'DEPLOYING') {
                <span class="dep-pulse"></span>
              }
              {{ depStatusLabel(selectedDeployment()?.status) }}
            </span>
          </div>
          <button class="drawer-close" (click)="closeDrawer()"><app-icon name="x" style="width:14px;height:14px;"/></button>
        </div>

        <!-- Pipeline timeline -->
        <div class="drawer-pipeline">
          @for (stage of drawerStages; track stage.id; let i = $index) {
            <div class="dp-stage" [class.dp-done]="isDrawerStageDone(i)" [class.dp-active]="isDrawerStageActive(i)">
              <div class="dp-node">
                @if (isDrawerStageDone(i)) {
                  <app-icon name="check" style="width:10px;height:10px;color:#10b981;"/>
                } @else if (isDrawerStageActive(i)) {
                  <div class="dep-spinner sm"></div>
                } @else {
                  <div class="dp-dot"></div>
                }
              </div>
              <span class="dp-label">{{ stage.label }}</span>
              @if (i < drawerStages.length - 1) { <div class="dp-connector" [class.done]="isDrawerStageDone(i)"></div> }
            </div>
          }
        </div>

        <!-- Deployment meta -->
        <div class="drawer-meta">
          @if (selectedDeployment()?.commitSha) {
            <span class="dep-meta-chip mono"><app-icon name="git-commit" class="dep-meta-icon"/> {{ selectedDeployment()?.commitSha?.substring(0,7) }}</span>
          }
          @if (selectedDeployment()?.branch) {
            <span class="dep-meta-chip"><app-icon name="git-branch" class="dep-meta-icon"/> {{ selectedDeployment()?.branch }}</span>
          }
          @if (selectedDeployment()?.durationMs) {
            <span class="dep-meta-chip"><app-icon name="clock" class="dep-meta-icon"/> {{ formatDuration(selectedDeployment()?.durationMs) }}</span>
          }
          @if (selectedDeployment()?.createdAt) {
            <span class="dep-meta-chip muted">{{ relativeTime(selectedDeployment()?.createdAt) }}</span>
          }
        </div>

        <!-- Terminal log -->
        <div class="drawer-terminal">
          <div class="drawer-term-topbar">
            <div class="dt-dots">
              <span class="dt-dot red"></span><span class="dt-dot yellow"></span><span class="dt-dot green"></span>
            </div>
            <span class="dt-title">build + runtime log</span>
            <div style="flex:1"></div>
            @if (selectedDeployment()?.status === 'BUILDING' || selectedDeployment()?.status === 'DEPLOYING') {
              <span class="dt-live"><span class="dep-pulse sm"></span> LIVE</span>
            }
            <button class="dt-copy" (click)="copyLogsToClipboard()" title="Copy logs"><app-icon name="copy" style="width:12px;height:12px;"/></button>
          </div>
          <div class="drawer-term-body" id="drawer-terminal-body">
            @if (drawerLogLines().length === 0) {
              <div class="drawer-term-idle">
                <div class="dep-spinner sm" style="border-color:rgba(99,102,241,0.2);border-top-color:#6366f1"></div>
                No logs captured yet.
              </div>
            } @else {
              @for (line of drawerLogLines(); track $index) {
                <div class="dt-line" [ngClass]="line.cls">
                  <span class="dt-prefix">{{ line.prefix }}</span>
                  <span class="dt-text">{{ line.text }}</span>
                </div>
              }
              @if (selectedDeployment()?.status === 'BUILDING' || selectedDeployment()?.status === 'DEPLOYING') {
                <div class="dt-line"><span class="dt-cursor">█</span></div>
              }
            }
          </div>
        </div>

        <!-- Drawer actions -->
        <div class="drawer-actions">
          @if (selectedDeployment()?.status === 'BUILDING' || selectedDeployment()?.status === 'DEPLOYING') {
            <button class="dep-action-btn cancel" (click)="cancelDeployment(selectedDeployment()!)">
              <app-icon name="square" style="width:11px;height:11px;"/> Cancel Build
            </button>
          } @else {
            <button class="dep-action-btn redeploy" (click)="triggerResync()">
              <app-icon name="refresh-cw" style="width:11px;height:11px;"/> Redeploy
            </button>
          }
          <button class="dep-action-btn" (click)="copyLogsToClipboard()">
            <app-icon name="copy" style="width:11px;height:11px;"/> Copy Logs
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      color: var(--vercel-text-primary);
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
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
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
      border-bottom: 1px solid var(--vercel-border);
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
      color: #ffffff;
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
      color: var(--vercel-text-primary);
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
      color: #10b981;
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .tm-badge-status.building {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
      border-color: rgba(245, 158, 11, 0.2);
    }

    .tm-badge-status.ready {
      background: rgba(34, 197, 94, 0.1);
      color: #10b981;
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
      color: var(--vercel-text-secondary);
      font-family: var(--font-mono);
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

    .domain {
      font-family: var(--font-mono);
      color: #6366f1;
      font-size: 12px;
      border-bottom: 1px dashed var(--vercel-border);
      transition: all 0.15s ease;
    }
 
    .domain:hover {
      color: #818cf8;
      border-bottom-color: #818cf8;
      cursor: pointer;
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
      background: var(--vercel-text-primary);
      color: var(--vercel-bg);
      border: 1px solid var(--vercel-text-primary);
    }
 
    .tm-btn-primary:hover {
      opacity: 0.85;
    }
 
    .tm-btn-secondary {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-primary);
    }
 
    .tm-btn-secondary:hover {
      background: var(--vercel-subtle-bg);
    }

    .tm-btn-danger {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #ef4444;
      align-self: flex-start;
    }

    .tm-btn-danger:hover {
      background: #ef4444;
      color: #ffffff;
    }

    .tm-btn-danger .size-2 {
      width: 14px;
      height: 14px;
    }

    .tm-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
 
    .tm-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid var(--vercel-border);
      overflow-x: auto;
    }
 
    .tab-btn {
      padding: 10px 14px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--vercel-text-secondary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
      white-space: nowrap;
    }
 
    .tab-btn:hover {
      color: var(--vercel-text-primary);
    }
 
    .active-tab {
      border-bottom-color: #6366f1;
      color: var(--vercel-text-primary) !important;
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
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
 
    .tm-metric-label {
      font-size: 12px;
      color: var(--vercel-text-muted);
    }
 
    .tm-metric-value {
      font-size: 15px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
 
    .tm-metric-value.cyan { color: #06b6d4; }
    .tm-metric-value.emerald { color: #10b981; }
    .tm-metric-value.text-indigo { color: #6366f1; }
 
    .tm-details-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .tm-card-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vercel-text-primary);
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
      border-bottom: 1px solid var(--vercel-border-subtle);
      color: var(--vercel-text-primary);
    }

    .dep-table th {
      color: var(--vercel-text-muted);
      font-weight: 600;
    }

    .clickable-row {
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .clickable-row:hover {
      background: var(--vercel-subtle-bg);
    }

    .status-pill {
      display: inline-flex;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(113, 113, 122, 0.1);
      color: var(--vercel-text-muted);
    }

    .status-pill.ready {
      background: rgba(34, 197, 94, 0.1);
      color: #10b981;
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
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 2px;
    }

    .logs-toggle button {
      padding: 6px 12px;
      background: transparent;
      border: none;
      color: var(--vercel-text-secondary);
      font-size: 11px;
      cursor: pointer;
      border-radius: 4px;
    }

    .logs-toggle button.active-btn {
      background: var(--vercel-card-bg);
      color: var(--vercel-text-primary);
      font-weight: 600;
    }

    .logs-console {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
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
      border-top: 1px solid var(--vercel-border);
      padding-top: 16px;
    }

    .env-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
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
      background: var(--vercel-subtle-bg);
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
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

    .danger-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
      border-top: 1px solid rgba(239, 68, 68, 0.2);
      padding-top: 20px;
    }

    .danger-title {
      font-size: 14px;
      font-weight: 600;
      color: #ef4444;
      margin: 0;
    }

    .danger-desc {
      font-size: 13px;
      color: var(--vercel-text-muted);
      margin: 0;
      max-width: 600px;
      line-height: 1.5;
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
      color: var(--vercel-text-secondary);
    }

    .form-input, .form-textarea, .form-select {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      color: var(--vercel-text-primary);
      padding: 8px 12px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s ease, background-color 0.15s ease;
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

    /* ─── Deployment Lifecycle Styles ─────────────────────────────── */

    .dep-filters-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .dep-filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-card-bg);
      color: var(--vercel-text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .dep-filter-pill:hover { background: var(--vercel-subtle-bg); }
    .dep-filter-pill.active {
      background: var(--vercel-subtle-bg);
      border-color: var(--vercel-text-muted);
      color: var(--vercel-text-primary);
    }

    .pill-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--vercel-border);
    }
    .dot-ready   { background: #10b981; }
    .dot-building { background: #f59e0b; }
    .dot-error   { background: #ef4444; }

    .pill-count {
      font-size: 10px;
      background: var(--vercel-border);
      padding: 0 4px;
      border-radius: 4px;
    }

    /* Deployment timeline list */
    .dep-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .dep-card {
      display: flex;
      align-items: stretch;
      gap: 0;
      transition: background 0.15s;
      border-bottom: 1px solid var(--vercel-border);
    }
    .dep-card:last-child { border-bottom: none; }
    .dep-card.active-dep {
      background: rgba(16, 185, 129, 0.03);
      border-left: 3px solid #10b981;
    }

    .dep-status-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 8px 0 16px;
      gap: 0;
      flex-shrink: 0;
      width: 44px;
    }

    .dep-status-icon {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--vercel-border);
      background: var(--vercel-card-bg);
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .dep-si { width: 12px; height: 12px; }

    .dep-icon-success { border-color: #10b981; background: rgba(16,185,129,0.1); color: #10b981; }
    .dep-icon-failed  { border-color: #ef4444; background: rgba(239,68,68,0.1);  color: #ef4444; }
    .dep-icon-building { border-color: #f59e0b; background: rgba(245,158,11,0.1); animation: glow-amber 1.5s ease-in-out infinite; }
    .dep-icon-deploying { border-color: #a78bfa; background: rgba(167,139,250,0.1); animation: glow-purple 1.5s ease-in-out infinite; }
    .dep-icon-queued   { border-color: var(--vercel-border); }
    .dep-icon-cancelled { border-color: var(--vercel-border); opacity: 0.5; }

    @keyframes glow-amber  { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}  50%{box-shadow:0 0 8px 2px rgba(245,158,11,0.4)} }
    @keyframes glow-purple { 0%,100%{box-shadow:0 0 0 0 rgba(167,139,250,0)} 50%{box-shadow:0 0 8px 2px rgba(167,139,250,0.4)} }

    .dep-status-line {
      flex: 1;
      width: 2px;
      background: var(--vercel-border);
      margin: 4px 0 0;
      min-height: 24px;
      transition: background 0.3s;
    }
    .dep-status-line.done { background: #10b981; }

    .dep-queued-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--vercel-border);
    }

    .dep-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(245,158,11,0.25);
      border-top-color: #f59e0b;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .dep-spinner.sm { width: 10px; height: 10px; border-width: 1.5px; }

    .dep-card-body {
      flex: 1;
      padding: 14px 16px;
      cursor: pointer;
      min-width: 0;
    }
    .dep-card-body:hover { background: var(--vercel-subtle-bg); }

    .dep-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .dep-card-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;
    }

    .dep-card-msg {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 280px;
    }

    .dep-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      letter-spacing: 0.04em;
    }
    .dep-badge-success  { background: rgba(16,185,129,0.1);  color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
    .dep-badge-failed   { background: rgba(239,68,68,0.1);   color: #ef4444; border: 1px solid rgba(239,68,68,0.25);  }
    .dep-badge-building { background: rgba(245,158,11,0.1);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); }
    .dep-badge-deploying { background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.25); }
    .dep-badge-queued   { background: var(--vercel-subtle-bg); color: var(--vercel-text-muted); border: 1px solid var(--vercel-border); }
    .dep-badge-cancelled { background: var(--vercel-subtle-bg); color: var(--vercel-text-muted); border: 1px solid var(--vercel-border); opacity: 0.7; }

    .dep-production-badge {
      font-size: 9px; font-weight: 800;
      color: #10b981; letter-spacing: 0.08em;
    }

    .dep-pulse {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse-dot 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    .dep-pulse.sm { width: 5px; height: 5px; }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.7)} }

    .dep-card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .dep-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 5px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-card-bg);
      color: var(--vercel-text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }
    .dep-action-btn:hover { background: var(--vercel-subtle-bg); color: var(--vercel-text-primary); }
    .dep-action-btn.cancel { color: #ef4444; border-color: rgba(239,68,68,0.3); }
    .dep-action-btn.cancel:hover { background: rgba(239,68,68,0.08); }
    .dep-action-btn.redeploy { color: #6366f1; border-color: rgba(99,102,241,0.3); }
    .dep-action-btn.redeploy:hover { background: rgba(99,102,241,0.08); }

    .dep-card-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .dep-meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
    .dep-meta-chip.mono { font-family: 'JetBrains Mono', monospace; color: #818cf8; }
    .dep-meta-chip.muted { color: var(--vercel-text-muted); }
    .dep-meta-icon { width: 11px; height: 11px; }

    .dep-empty {
      text-align: center;
      padding: 48px 20px;
      color: var(--vercel-text-muted);
      font-size: 13px;
    }
    .dep-empty-icon { width: 28px; height: 28px; margin: 0 auto 8px; display: block; opacity: 0.4; }

    /* ─── Drawer ──────────────────────────────────────────────────── */
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 50;
      backdrop-filter: blur(2px);
    }

    .dep-drawer {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      width: 480px;
      max-width: 96vw;
      background: var(--vercel-card-bg);
      border-left: 1px solid var(--vercel-border);
      z-index: 51;
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 40px rgba(0,0,0,0.25);
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    .dep-drawer.drawer-visible { transform: translateX(0); }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vercel-border);
      flex-shrink: 0;
    }
    .drawer-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .drawer-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--vercel-text-primary);
    }
    .drawer-close {
      background: transparent;
      border: 1px solid var(--vercel-border);
      border-radius: 5px;
      color: var(--vercel-text-muted);
      width: 26px; height: 26px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .drawer-close:hover { color: var(--vercel-text-primary); background: var(--vercel-subtle-bg); }

    /* Drawer pipeline timeline */
    .drawer-pipeline {
      display: flex;
      align-items: center;
      padding: 14px 20px;
      border-bottom: 1px solid var(--vercel-border);
      flex-shrink: 0;
      overflow-x: auto;
    }
    .dp-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex: 1;
      position: relative;
      min-width: 60px;
    }
    .dp-node {
      width: 24px; height: 24px;
      border-radius: 50%;
      border: 2px solid var(--vercel-border);
      background: var(--vercel-card-bg);
      display: flex; align-items: center; justify-content: center;
      z-index: 1;
      position: relative;
      transition: all 0.3s;
    }
    .dp-stage.dp-done .dp-node { border-color: #10b981; background: rgba(16,185,129,0.12); }
    .dp-stage.dp-active .dp-node { border-color: #6366f1; background: rgba(99,102,241,0.12); box-shadow: 0 0 10px rgba(99,102,241,0.3); }
    .dp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vercel-border); }
    .dp-connector {
      position: absolute;
      top: 12px; left: 50%;
      width: 100%; height: 2px;
      background: var(--vercel-border);
      z-index: 0;
      transition: background 0.3s;
    }
    .dp-connector.done { background: #10b981; }
    .dp-label { font-size: 9px; font-weight: 600; color: var(--vercel-text-muted); text-align: center; }
    .dp-stage.dp-done .dp-label { color: #10b981; }
    .dp-stage.dp-active .dp-label { color: #818cf8; }

    .drawer-meta {
      display: flex; flex-wrap: wrap; gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--vercel-border);
      flex-shrink: 0;
    }

    /* Drawer terminal */
    .drawer-terminal {
      flex: 1; display: flex; flex-direction: column;
      background: #0d0d11;
      overflow: hidden;
    }
    .drawer-term-topbar {
      display: flex; align-items: center; gap: 8px;
      padding: 7px 14px;
      background: #111116;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }
    .dt-dots { display: flex; gap: 4px; }
    .dt-dot { width: 9px; height: 9px; border-radius: 50%; }
    .dt-dot.red    { background: #ff5f57; }
    .dt-dot.yellow { background: #ffbd2e; }
    .dt-dot.green  { background: #28ca41; }
    .dt-title {
      font-size: 10px; color: rgba(255,255,255,0.3);
      font-family: 'JetBrains Mono', monospace;
      flex: 1; text-align: center;
    }
    .dt-live {
      display: flex; align-items: center; gap: 4px;
      font-size: 9px; font-weight: 800; color: #818cf8; letter-spacing: 0.1em;
    }
    .dt-copy {
      background: transparent; border: none;
      color: rgba(255,255,255,0.3); cursor: pointer;
      transition: color 0.15s;
    }
    .dt-copy:hover { color: rgba(255,255,255,0.7); }

    .drawer-term-body {
      flex: 1; overflow-y: auto;
      padding: 10px 14px;
      font-family: 'JetBrains Mono','Fira Code',monospace;
      font-size: 11px;
      line-height: 1.65;
    }
    .drawer-term-body::-webkit-scrollbar { width: 4px; }
    .drawer-term-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    .drawer-term-idle {
      display: flex; align-items: center; gap: 8px;
      color: rgba(255,255,255,0.25); font-size: 11px; padding: 8px 0;
    }

    .dt-line {
      display: flex; align-items: baseline; gap: 8px;
      white-space: pre-wrap; word-break: break-all; line-height: 1.65;
    }
    .dt-prefix { font-weight: 700; flex-shrink: 0; font-size: 10px; }
    .dt-text { color: rgba(255,255,255,0.8); }

    .dt-line.builder  .dt-prefix { color: #22d3ee; }
    .dt-line.deployer .dt-prefix { color: #a78bfa; }
    .dt-line.runtime  .dt-prefix { color: #4ade80; }
    .dt-line.runner   .dt-prefix { color: #fbbf24; }
    .dt-line.error    .dt-prefix { color: #f87171; }
    .dt-line.error    .dt-text   { color: #fca5a5; }
    .dt-line.plain    .dt-text   { color: rgba(255,255,255,0.5); }

    .dt-cursor { color: #6366f1; animation: blink 1.1s step-end infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

    .drawer-actions {
      display: flex; gap: 8px; padding: 12px 20px;
      border-top: 1px solid var(--vercel-border);
      flex-shrink: 0;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `],
})
export class ToolManageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toolsService = inject(ToolsService);
  private readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);

  getToolUrl(tool: Tool | null): string {
    if (!tool) return '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:8080/tools/${tool.slug}`;
    }
    const sub = tool.subdomain || `${tool.slug}.tools.acklet.com`;
    return sub.startsWith('http') ? sub : `https://${sub}`;
  }

  readonly tool = signal<Tool | null>(null);
  readonly loading = signal<boolean>(true);
  readonly activeTab = signal<string>('overview');
  readonly syncStatus = signal<string>('SYNCED');

  // Deployments list + filtering
  readonly deployments = signal<Deployment[]>([]);
  readonly latestDeployment = signal<Deployment | null>(null);
  readonly logsView = signal<string>('build');
  readonly deploymentFilter = signal<string>('ALL');

  readonly filteredDeployments = computed(() => {
    const f = this.deploymentFilter();
    const all = this.deployments();
    if (f === 'ALL') return all;
    return all.filter(d => this.normalizeStatus(d.status) === f);
  });

  readonly depCounts = computed(() => {
    const all = this.deployments();
    const counts: Record<string, number> = {};
    for (const d of all) {
      const k = this.normalizeStatus(d.status);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  });

  readonly depFilters = [
    { key: 'ALL',       label: 'All' },
    { key: 'SUCCESS',   label: 'Ready' },
    { key: 'BUILDING',  label: 'Building' },
    { key: 'DEPLOYING', label: 'Deploying' },
    { key: 'FAILED',    label: 'Error' },
    { key: 'PENDING',   label: 'Queued' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  // Drawer state
  readonly drawerOpen = signal<boolean>(false);
  readonly selectedDeployment = signal<Deployment | null>(null);
  readonly drawerLogLines = signal<Array<{prefix:string;text:string;cls:string}>>([]);
  private drawerRawLogs = '';

  readonly drawerStages = [
    { id: 'clone',  label: 'Clone' },
    { id: 'build',  label: 'Build' },
    { id: 'deploy', label: 'Deploy' },
  ];

  // Live polling for in-progress deployments
  private livePollingInterval: ReturnType<typeof setInterval> | null = null;

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

  readonly runtimeInstance = signal<any | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.toolsService.getToolBySlug(id).subscribe({
        next: (t) => {
          if (t) {
            this.tool.set(t);
            if (t.status === 'PENDING') { this.syncStatus.set('BUILDING'); }
            if (t.repositoryId) {
              this.loadDeployments(t.repositoryId);
              this.startLivePolling(t.repositoryId);
            }
            this.loadRuntimeStatus(t.slug);
          }
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); }
      });
    } else {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.stopLivePolling();
  }

  // ── Live polling ──────────────────────────────────────────────────
  private startLivePolling(repoId: string): void {
    this.stopLivePolling();
    this.livePollingInterval = setInterval(() => {
      const hasLive = this.deployments().some(d => d.status === 'BUILDING' || d.status === 'DEPLOYING' || d.status === 'PENDING');
      if (hasLive) {
        this.toolsService.getDeployments(repoId).subscribe(res => {
          if (res?.data) {
            this.deployments.set(res.data);
            if (res.data.length > 0) this.latestDeployment.set(res.data[0]);
            // If drawer is open for a live deployment, refresh its logs
            const sel = this.selectedDeployment();
            if (sel) {
              const updated = res.data.find((d: Deployment) => d.id === sel.id);
              if (updated) {
                this.selectedDeployment.set(updated);
                this.refreshDrawerLogs(updated);
              }
            }
          }
        });
      }
    }, 2500);
  }

  private stopLivePolling(): void {
    if (this.livePollingInterval) { clearInterval(this.livePollingInterval); this.livePollingInterval = null; }
  }

  // ── Drawer ────────────────────────────────────────────────────────
  openDrawer(dep: Deployment): void {
    this.selectedDeployment.set(dep);
    this.drawerRawLogs = '';
    this.drawerLogLines.set([]);
    this.refreshDrawerLogs(dep);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedDeployment.set(null);
    this.drawerRawLogs = '';
    this.drawerLogLines.set([]);
  }

  private refreshDrawerLogs(dep: Deployment): void {
    const raw = ((dep.buildLogs || '') + (dep.runtimeLogs || ''));
    if (!raw || raw === this.drawerRawLogs) return;
    const newContent = raw.slice(this.drawerRawLogs.length);
    this.drawerRawLogs = raw;
    const newLines = newContent.split('\n').filter(l => l.trim());
    const parsed = newLines.map(l => this.parseLine(l));
    this.drawerLogLines.update(existing => [...existing, ...parsed]);
    setTimeout(() => {
      const el = document.getElementById('drawer-terminal-body');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }

  private parseLine(line: string): { prefix: string; text: string; cls: string } {
    const m = line.match(/^\[([^\]]+)\]/);
    if (!m) return { prefix: '>', text: line, cls: 'plain' };
    const tag = m[1].toLowerCase();
    const text = line.slice(m[0].length).trimStart();
    const prefix = `[${m[1]}]`;
    if (tag.includes('builder'))  return { prefix, text, cls: 'builder' };
    if (tag.includes('deployer')) return { prefix, text, cls: 'deployer' };
    if (tag.includes('runtime'))  return { prefix, text, cls: 'runtime' };
    if (tag.includes('runner') || tag.includes('sandbox')) return { prefix, text, cls: 'runner' };
    if (tag.includes('error') || tag.includes('fail'))     return { prefix, text, cls: 'error' };
    return { prefix, text, cls: 'plain' };
  }

  copyLogsToClipboard(): void {
    const lines = this.drawerLogLines();
    const text = lines.map(l => `${l.prefix} ${l.text}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  }

  // ── Deployment status helpers ─────────────────────────────────────
  normalizeStatus(status?: string): string {
    if (!status) return 'PENDING';
    const s = status.toUpperCase();
    if (s === 'DONE' || s === 'SUCCESS' || s === 'FINISHED') return 'SUCCESS';
    if (s === 'IN_PROGRESS') return 'BUILDING';
    if (s.includes('CANCEL')) return 'CANCELLED';
    return s;
  }

  depStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      SUCCESS: 'Ready', FAILED: 'Error', BUILDING: 'Building',
      DEPLOYING: 'Deploying', PENDING: 'Queued', CANCELLED: 'Cancelled',
    };
    return labels[this.normalizeStatus(status)] ?? status ?? 'Unknown';
  }

  depIconClass(status?: string): string {
    const classes: Record<string, string> = {
      SUCCESS: 'dep-icon-success', FAILED: 'dep-icon-failed',
      BUILDING: 'dep-icon-building', DEPLOYING: 'dep-icon-deploying',
      PENDING: 'dep-icon-queued', CANCELLED: 'dep-icon-cancelled',
    };
    return classes[this.normalizeStatus(status)] ?? 'dep-icon-queued';
  }

  depBadgeClass(status?: string): string {
    const classes: Record<string, string> = {
      SUCCESS: 'dep-badge-success', FAILED: 'dep-badge-failed',
      BUILDING: 'dep-badge-building', DEPLOYING: 'dep-badge-deploying',
      PENDING: 'dep-badge-queued', CANCELLED: 'dep-badge-cancelled',
    };
    return classes[this.normalizeStatus(status)] ?? 'dep-badge-queued';
  }

  // Drawer pipeline stage helpers
  isDrawerStageDone(idx: number): boolean {
    const s = this.normalizeStatus(this.selectedDeployment()?.status);
    if (s === 'SUCCESS') return true;
    if (s === 'FAILED') return false;
    if (s === 'DEPLOYING') return idx < 2;
    if (s === 'BUILDING')  return idx < 1;
    return false;
  }
  isDrawerStageActive(idx: number): boolean {
    const s = this.normalizeStatus(this.selectedDeployment()?.status);
    if (s === 'SUCCESS' || s === 'FAILED') return false;
    if (s === 'BUILDING')  return idx === 1;
    if (s === 'DEPLOYING') return idx === 2;
    return idx === 0;
  }

  cancelDeployment(dep: Deployment): void {
    if (!dep) return;
    // Mark locally as cancelled — backend kill would go here via a future endpoint
    this.deployments.update(list => list.map(d => d.id === dep.id ? { ...d, status: 'CANCELLED' } : d));
    if (this.selectedDeployment()?.id === dep.id) {
      this.selectedDeployment.update(d => d ? { ...d, status: 'CANCELLED' } : d);
    }
  }

  relativeTime(iso?: string): string {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const diff = Math.floor((Date.now() - then) / 1000);
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  loadRuntimeStatus(slug: string): void {
    this.toolsService.getRuntimeStatus(slug).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.runtimeInstance.set(res.data);
        }
      }
    });
  }

  stopCurrentRuntime(): void {
    const t = this.tool();
    if (!t) return;
    this.toolsService.stopRuntime(t.slug).subscribe(() => {
      this.loadRuntimeStatus(t.slug);
    });
  }

  restartCurrentRuntime(): void {
    const t = this.tool();
    if (!t) return;
    this.toolsService.restartRuntime(t.slug).subscribe((res) => {
      if (res && res.data) {
        this.runtimeInstance.set(res.data);
      }
    });
  }

  sleepCurrentRuntime(): void {
    const t = this.tool();
    if (!t) return;
    this.toolsService.sleepRuntime(t.slug).subscribe(() => {
      this.loadRuntimeStatus(t.slug);
    });
  }

  wakeCurrentRuntime(): void {
    const t = this.tool();
    if (!t) return;
    this.toolsService.wakeRuntime(t.slug).subscribe(() => {
      this.loadRuntimeStatus(t.slug);
    });
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

  deleteCurrentTool(): void {
    const targetTool = this.tool();
    if (!targetTool) return;

    const hasRepo = !!targetTool.repositoryId;
    if (hasRepo) {
      this.dialogSvc
        .confirm(
          `This tool is linked to repository. Do you want to detach the repository first? (Click 'Cancel' to delete both tool and repository)`,
          'Detach Repository?'
        )
        .then((detachConfirmed) => {
          this._promptToolNameAndPerformDelete(targetTool, detachConfirmed);
        });
    } else {
      this._promptToolNameAndPerformDelete(targetTool, false);
    }
  }

  private _promptToolNameAndPerformDelete(targetTool: Tool, detachRepo: boolean): void {
    const executeDelete = () => {
      this.toolsService.deleteTool(targetTool.slug).subscribe({
        next: () => {
          this.stateSvc.refreshTools();
          this.stateSvc.refreshRepos();
          if (detachRepo && targetTool.repositoryId) {
            this.stateSvc.unlinkRepository(targetTool.repositoryId);
          } else if (targetTool.repositoryId) {
            this.stateSvc.removeRepository(targetTool.repositoryId);
          }
          this.router.navigate(['/workspace/tools']);
        },
        error: (err) => {
          console.error('Failed to delete tool via ToolsService:', err);
          // Fallback via stateSvc
          this.stateSvc.deleteToolAndRepo(targetTool.id, targetTool.slug, targetTool.repositoryId, detachRepo);
          this.router.navigate(['/workspace/tools']);
        }
      });
    };

    if (DEFAULT_FEATURE_FLAGS.confirmDelete) {
      this.dialogSvc
        .prompt(
          `Please type the tool name "${targetTool.name}" to confirm deletion:`,
          'Tool Name',
          '',
          'Confirm Deletion',
          targetTool.name
        )
        .then((typedName) => {
          if (typedName === targetTool.name) {
            executeDelete();
          } else if (typedName !== null) {
            this.dialogSvc.alert('The typed name did not match. Deletion aborted.', 'Incorrect Name');
          }
        });
    } else {
      this.dialogSvc
        .confirm(`Are you sure you want to delete tool "${targetTool.name}"?`, 'Delete Tool')
        .then((confirmed) => {
          if (confirmed) {
            executeDelete();
          }
        });
    }
  }
}
