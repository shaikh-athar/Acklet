import { Component, signal, inject, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { GitHubService, GitHubAccount, GitHubRepo } from '../../../../core/services/github.service';
import {
  WorkspaceStateService,
  RepositoryItem,
} from '../../../../core/services/workspace-state.service';
import { DialogService } from '../../../../core/services/dialog.service';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-project-import',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, IconComponent],
  template: `
    <div class="ip-container">
      <div class="ip-backdrop" (click)="closeCard()"></div>

      <div class="ip-card" [class.ip-card-wide]="step() === 4 || step() === 5">
        @if (step() === 4) {
          <button class="ip-stop-header-btn" (click)="onCancelImport()">
            <span>Stop</span>
          </button>
        } @else if (step() !== 5) {
          <button class="ip-close-btn" (click)="closeCard()" aria-label="Close">
            <app-icon name="x" class="ip-close-icon" />
          </button>
        }

        <!-- Mode: Deploy (Show already imported repos) -->
        @if (mode() === 'deploy' && (step() === 1 || step() === 2)) {
          <div class="ip-step-pane">
            <div class="ip-card-header">
              <h1 class="ip-card-title">Deploy Repository to Tools</h1>
              <p class="ip-card-subtitle">
                Select an imported repository to build and deploy as a live tool on Acklet.
              </p>
            </div>

            <!-- Search -->
            <div class="ip-search-row">
              <app-icon name="search" class="ip-search-icon" />
              <input
                type="text"
                class="ip-search-input"
                placeholder="Search imported repositories…"
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
              />
            </div>

            <!-- Repo list -->
            <div class="ip-repo-list">
              @if (stateSvc.repos().length === 0) {
                <div class="ip-empty">
                  <app-icon name="folder-x" class="ip-empty-icon" />
                  <p>No imported repositories found in workspace.</p>
                </div>
              } @else if (filteredImportedRepos().length === 0) {
                <div class="ip-empty">
                  <app-icon name="search" class="ip-empty-icon" />
                  <p>No matching repositories found.</p>
                </div>
              } @else {
                @for (repo of filteredImportedRepos(); track repo.id) {
                  <div class="ip-repo-item">
                    <!-- Left: colored language icon badge -->
                    <div class="ip-repo-avatar" [style]="getLangAvatarStyle(repo.language)">
                      <span class="ip-repo-avatar-letter">{{ getLangInitial(repo.language) }}</span>
                    </div>

                    <!-- Center: name + visibility + desc -->
                    <div class="ip-repo-info">
                      <div class="ip-repo-name-row">
                        <span class="ip-repo-name">{{ repo.name.split('/')[1] || repo.name }}</span>
                        @if (repo.visibility === 'Private') {
                          <app-icon name="lock" class="ip-lock-icon" />
                        }
                      </div>
                      @if (repo.description) {
                        <p class="ip-repo-desc">{{ repo.description }}</p>
                      }
                    </div>

                    <!-- Right: Deploy button -->
                    <button
                      (click)="deployImportedRepo(repo)"
                      class="ip-btn ip-btn-primary ip-btn-sm"
                      [disabled]="importingRepo() === repo.name"
                    >
                      @if (importingRepo() === repo.name) {
                        <div class="ip-mini-spinner sm"></div>
                      } @else {
                        Deploy Repo to Tools
                      }
                    </button>
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- Mode: Import (Show provider connection / remote repos list) -->
        @if (mode() === 'import') {
          <!-- Step 1: Provider Selection -->
          @if (step() === 1) {
            <div class="ip-step-pane">
              <div class="ip-card-header">
                <h1 class="ip-card-title">Import Git Repository</h1>
                <p class="ip-card-subtitle">
                  Select a Git provider to import an existing project from a Git Repository.
                </p>
              </div>

              <div class="ip-provider-list">
                <button
                  (click)="connectGitHub()"
                  class="ip-provider-btn github"
                  [disabled]="connecting()"
                >
                  @if (connecting()) {
                    <div class="ip-mini-spinner"></div>
                  } @else {
                    <app-icon name="github" class="ip-provider-icon" />
                  }
                  <span>Continue with GitHub</span>
                </button>

                <button class="ip-provider-btn gitlab ip-btn-soon" disabled>
                  <app-icon name="gitlab" class="ip-provider-icon" />
                  <span>Continue with GitLab</span>
                  <span class="ip-soon-badge">Soon</span>
                </button>

                <button class="ip-provider-btn bitbucket ip-btn-soon" disabled>
                  <app-icon name="bitbucket" class="ip-provider-icon" />
                  <span>Continue with Bitbucket</span>
                  <span class="ip-soon-badge">Soon</span>
                </button>
              </div>

              @if (connectError()) {
                <div class="ip-error-banner">
                  <app-icon name="alert-circle" class="ip-error-icon" />
                  <span>{{ connectError() }}</span>
                </div>
              }

              <div class="ip-card-footer">
                <a routerLink="/workspace/settings" class="ip-footer-link"
                  >Manage Git Connections ↗</a
                >
              </div>
            </div>
          }

          <!-- Step 2: Select Repository -->
          @if (step() === 2) {
            <div class="ip-step-pane">
              <div class="ip-card-header" style="margin-bottom: 16px; flex-shrink: 0;">
                <div class="ip-back-nav" (click)="step.set(1)">
                  <app-icon name="arrow-left" class="ip-back-icon" />
                  <span>Back to providers</span>
                </div>
                <h1 class="ip-card-title">Import Git Repository</h1>
                <p class="ip-card-subtitle">
                  Select a repository to import and deploy as a live tool.
                </p>
              </div>

              <!-- Account chip + Search -->
              @if (accounts().length > 0) {
                <div class="ip-account-chip" style="flex-shrink: 0;">
                  <app-icon
                    name="github"
                    style="width: 16px; height: 16px; color: var(--vercel-text-secondary);"
                  />
                  <span class="ip-account-name">{{ accounts()[0].githubLogin }}</span>
                  <span class="ip-account-badge">GitHub</span>
                </div>
              }

              <div class="ip-search-row" style="flex-shrink: 0; margin-bottom: 12px;">
                <app-icon name="search" class="ip-search-icon" />
                <input
                  type="text"
                  id="repo-search-input"
                  class="ip-search-input"
                  placeholder="Search repositories…"
                  [(ngModel)]="searchQuery"
                  (input)="onSearch()"
                />
              </div>

              <!-- Repo list -->
              <div class="ip-repo-list" style="flex: 1; overflow-y: auto;">
                @if (loadingRepos()) {
                  @for (i of [1, 2, 3, 4, 5]; track i) {
                    <div class="ip-repo-skeleton">
                      <div class="ip-skel-name"></div>
                      <div class="ip-skel-desc"></div>
                    </div>
                  }
                } @else if (filteredRepos().length === 0) {
                  <div class="ip-empty">
                    <app-icon name="folder-x" class="ip-empty-icon" />
                    <p>No repositories found.</p>
                  </div>
                } @else {
                  @for (repo of filteredRepos(); track repo.id) {
                    <div
                      class="ip-repo-item"
                      [class.ip-repo-selected]="selectedRepo()?.id === repo.id"
                    >
                      <!-- Language avatar -->
                      <div class="ip-repo-avatar" [style]="getLangAvatarStyle(repo.language)">
                        <span class="ip-repo-avatar-letter">{{
                          getLangInitial(repo.language)
                        }}</span>
                      </div>

                      <!-- Repo info -->
                      <div class="ip-repo-info" style="flex: 1; min-width: 0;">
                        <div class="ip-repo-name-row">
                          <span class="ip-repo-name">{{ repo.name }}</span>
                          @if (repo.privateRepo || repo.private) {
                            <app-icon name="lock" class="ip-lock-icon" />
                          }
                          @if (repo.language) {
                            <span class="ip-lang-chip">{{ repo.language }}</span>
                          }
                        </div>
                        @if (repo.description) {
                          <p class="ip-repo-desc">{{ repo.description }}</p>
                        }
                        @if (repo.updatedAt) {
                          <span class="ip-repo-updated"
                            >Updated {{ formatDate(repo.updatedAt) }}</span
                          >
                        }
                      </div>

                      <!-- Import button -->
                      <button
                        id="import-btn-{{ repo.id }}"
                        class="ip-btn ip-btn-primary ip-btn-sm"
                        (click)="selectRepoForConfig(repo)"
                      >
                        Import
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          }

          <!-- Step 3: Configure Deployment -->
          @if (step() === 3) {
            <div class="ip-step-pane" style="overflow-y: auto;">
              <div class="ip-card-header" style="flex-shrink: 0; margin-bottom: 20px;">
                <div class="ip-back-nav" (click)="step.set(2)">
                  <app-icon name="arrow-left" class="ip-back-icon" />
                  <span>Back to repositories</span>
                </div>
                <h1 class="ip-card-title">Configure Deployment</h1>
                <p class="ip-card-subtitle">
                  Set up environment, branch, and build settings for
                  <strong>{{ selectedRepo()?.name }}</strong
                  >.
                </p>
              </div>

              <!-- Selected repo info chip -->
              @if (selectedRepo()) {
                <div class="ip-selected-repo-chip">
                  <div
                    class="ip-repo-avatar sm"
                    [style]="getLangAvatarStyle(selectedRepo()?.language)"
                  >
                    <span class="ip-repo-avatar-letter">{{
                      getLangInitial(selectedRepo()?.language)
                    }}</span>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div class="ip-repo-name" style="font-size: 13px;">
                      {{ selectedRepo()?.full_name || selectedRepo()?.name }}
                    </div>
                    @if (selectedRepo()?.description) {
                      <div class="ip-repo-desc" style="font-size: 11px;">
                        {{ selectedRepo()?.description }}
                      </div>
                    }
                  </div>
                  @if (selectedRepo()?.privateRepo || selectedRepo()?.private) {
                    <span class="ip-private-badge">
                      <app-icon name="lock" style="width: 10px; height: 10px;" />
                      Private
                    </span>
                  }
                </div>
              }

              <!-- ═══ Detected Configuration Panel ═══ -->
              <div class="ip-detected-config">
                <button
                  class="ip-detected-config-header"
                  (click)="showDetectedConfig = !showDetectedConfig"
                >
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="ip-detected-dot"></div>
                    <span>Detected Configuration</span>
                    @if (selectedRepo()?.language) {
                      <span class="ip-lang-chip">{{ selectedRepo()?.language }}</span>
                    }
                  </div>
                  <app-icon
                    [name]="showDetectedConfig ? 'chevron-up' : 'chevron-down'"
                    style="width:14px;height:14px;color:var(--vercel-text-muted);"
                  />
                </button>
                @if (showDetectedConfig) {
                  <div class="ip-detected-config-body">
                    <div class="ip-detected-grid">
                      <div class="ip-detected-item">
                        <span class="ip-detected-label">Framework / Runtime</span>
                        <span class="ip-detected-value">{{ getDetectedRuntime() }}</span>
                      </div>
                      <div class="ip-detected-item">
                        <span class="ip-detected-label">Package Manager</span>
                        <span class="ip-detected-value">{{ getDetectedPackageManager() }}</span>
                      </div>
                      <div class="ip-detected-item">
                        <span class="ip-detected-label">App Port</span>
                        <span class="ip-detected-value">{{ appPort }}</span>
                      </div>
                      <div class="ip-detected-item">
                        <span class="ip-detected-label">Branch</span>
                        <span class="ip-detected-value">{{ selectedBranch }}</span>
                      </div>
                    </div>
                    @if (buildCommand) {
                      <div class="ip-detected-cmd">
                        <span class="ip-detected-label">Build</span>
                        <code class="ip-detected-code">{{ buildCommand }}</code>
                      </div>
                    }
                    @if (installCommand) {
                      <div class="ip-detected-cmd">
                        <span class="ip-detected-label">Install</span>
                        <code class="ip-detected-code">{{ installCommand }}</code>
                      </div>
                    }
                    @if (startCommand) {
                      <div class="ip-detected-cmd">
                        <span class="ip-detected-label">Start</span>
                        <code class="ip-detected-code">{{ startCommand }}</code>
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Config form -->
              <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div class="ip-form-group">
                    <label class="ip-form-label">Workspace</label>
                    <select class="ip-select" [(ngModel)]="selectedWorkspace">
                      <option value="Personal Workspace">Personal Workspace</option>
                      <option value="Acklet Engineering">Acklet Engineering</option>
                    </select>
                  </div>
                  <div class="ip-form-group">
                    <label class="ip-form-label">Collection</label>
                    <select class="ip-select" [(ngModel)]="selectedCollection">
                      <option value="Developer Tools">Developer Tools</option>
                      <option value="Utilities">Utilities</option>
                      <option value="Monitoring">Monitoring</option>
                    </select>
                  </div>
                </div>

                <div class="ip-form-group">
                  <label class="ip-form-label">Deploy Branch</label>
                  <select class="ip-select" [(ngModel)]="selectedBranch">
                    @for (b of availableBranches; track b) {
                      <option [value]="b">{{ b }}</option>
                    }
                    @if (availableBranches.length === 0) {
                      <option value="main">main</option>
                    }
                  </select>
                </div>

                <!-- Build & Output Settings -->
                <div class="ip-config-section">
                  <div class="ip-config-section-header">
                    <span>Build and Output Settings</span>
                    <app-icon
                      name="sliders"
                      style="width: 14px; height: 14px; color: var(--vercel-text-muted);"
                    />
                  </div>
                  <div class="ip-config-section-body">
                    <div class="ip-form-group">
                      <label class="ip-form-label">Root Directory</label>
                      <input
                        id="root-dir-input"
                        type="text"
                        class="ip-field"
                        [(ngModel)]="rootDirectory"
                        placeholder="./"
                      />
                    </div>

                    <!-- Build Command with Override Toggle -->
                    <div class="ip-form-group">
                      <div class="ip-label-toggle-row">
                        <label class="ip-form-label">Build Command</label>
                        <label class="ip-toggle-label">
                          <input
                            type="checkbox"
                            [(ngModel)]="overrideBuildCmd"
                            class="ip-toggle-checkbox"
                          />
                          <span class="ip-toggle-text">{{
                            overrideBuildCmd ? 'Custom Override' : 'System Default (Disabled)'
                          }}</span>
                        </label>
                      </div>
                      <input
                        id="build-cmd-input"
                        type="text"
                        class="ip-field"
                        [class.ip-field-disabled]="!overrideBuildCmd"
                        [disabled]="!overrideBuildCmd"
                        [(ngModel)]="buildCommand"
                        placeholder="npm run build"
                      />
                    </div>

                    <div class="ip-form-group">
                      <label class="ip-form-label">Output Directory</label>
                      <input
                        id="output-dir-input"
                        type="text"
                        class="ip-field"
                        [(ngModel)]="outputDirectory"
                        placeholder="dist/"
                      />
                    </div>

                    <!-- Install Command with Override Toggle -->
                    <div class="ip-form-group">
                      <div class="ip-label-toggle-row">
                        <label class="ip-form-label">Install Command</label>
                        <label class="ip-toggle-label">
                          <input
                            type="checkbox"
                            [(ngModel)]="overrideInstallCmd"
                            class="ip-toggle-checkbox"
                          />
                          <span class="ip-toggle-text">{{
                            overrideInstallCmd ? 'Custom Override' : 'System Default (Disabled)'
                          }}</span>
                        </label>
                      </div>
                      <input
                        id="install-cmd-input"
                        type="text"
                        class="ip-field"
                        [class.ip-field-disabled]="!overrideInstallCmd"
                        [disabled]="!overrideInstallCmd"
                        [(ngModel)]="installCommand"
                        placeholder="npm install"
                      />
                    </div>

                    <!-- Start Command with Override Toggle -->
                    <div class="ip-form-group">
                      <div class="ip-label-toggle-row">
                        <label class="ip-form-label">Start Command</label>
                        <label class="ip-toggle-label">
                          <input
                            type="checkbox"
                            [(ngModel)]="overrideStartCmd"
                            class="ip-toggle-checkbox"
                          />
                          <span class="ip-toggle-text">{{
                            overrideStartCmd ? 'Custom Override' : 'System Default (Disabled)'
                          }}</span>
                        </label>
                      </div>
                      <input
                        id="start-cmd-input"
                        type="text"
                        class="ip-field"
                        [class.ip-field-disabled]="!overrideStartCmd"
                        [disabled]="!overrideStartCmd"
                        [(ngModel)]="startCommand"
                        placeholder="npm start"
                      />
                    </div>

                    <!-- Informational Port UI -->
                    <div class="ip-form-group">
                      <div class="ip-label-toggle-row">
                        <label class="ip-form-label">Port</label>
                        <span class="ip-toggle-text" style="color: var(--vercel-success); font-weight: 500;">✓ Detected automatically (Confidence: 94%)</span>
                      </div>
                      <div class="ip-field ip-field-disabled" style="display: flex; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px 14px; font-family: monospace; color: var(--vercel-text-muted);">
                        {{ appPort || 3000 }} (Internal Runtime Port)
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Environment Variables -->
                <div class="ip-config-section">
                  <div class="ip-config-section-header">
                    <span>Environment Variables</span>
                    <app-icon
                      name="key"
                      style="width: 14px; height: 14px; color: var(--vercel-text-muted);"
                    />
                  </div>
                  <div class="ip-config-section-body">
                    @for (env of envList; track $index) {
                      <div
                        style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;"
                      >
                        <input
                          type="text"
                          class="ip-field"
                          style="flex: 1;"
                          placeholder="KEY"
                          [(ngModel)]="env.key"
                        />
                        <input
                          [type]="env.isSecret ? 'password' : 'text'"
                          class="ip-field"
                          style="flex: 1.5;"
                          placeholder="VALUE"
                          [(ngModel)]="env.value"
                        />
                        <button
                          (click)="env.isSecret = !env.isSecret"
                          class="ip-btn ip-btn-secondary"
                          style="padding: 4px 8px;"
                          [title]="env.isSecret ? 'Show value' : 'Mask as secret'"
                        >
                          <app-icon
                            [name]="env.isSecret ? 'eye-off' : 'eye'"
                            style="width: 12px; height: 12px;"
                          />
                        </button>
                        <button
                          (click)="removeEnvRow($index)"
                          class="ip-btn ip-btn-secondary"
                          style="padding: 4px 8px; color: #ef4444;"
                        >
                          ✕
                        </button>
                      </div>
                    }
                    <button
                      id="add-env-btn"
                      (click)="addEnvRow()"
                      class="ip-btn ip-btn-secondary"
                      style="margin-top: 4px; font-size: 11px;"
                    >
                      + Add Variable
                    </button>
                  </div>
                </div>

                <!-- Deploy Action -->
                <div class="ip-deploy-action-row">
                  <button
                    id="deploy-btn"
                    class="ip-deploy-btn"
                    (click)="deploySelectedRepo()"
                    [disabled]="deploying()"
                  >
                    @if (deploying()) {
                      <div class="ip-mini-spinner sm"></div>
                      <span>Starting Deployment...</span>
                    } @else {
                      <app-icon name="upload-cloud" style="width: 16px; height: 16px;" />
                      <span>Deploy to Acklet</span>
                    }
                  </button>
                </div>

                @if (importError()) {
                  <div class="ip-error-banner">
                    <app-icon name="alert-circle" class="ip-error-icon" />
                    <span>{{ importError() }}</span>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- Step 4: Live Deployment Console                                    -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        @if (step() === 4) {
          <div class="ip-console-pane">


            <!-- Right Panel: Terminal logs -->
            <div class="ip-terminal-panel">
              <div class="ip-terminal-topbar">
                <div class="ip-terminal-dots">
                  <span class="ip-dot red"></span>
                  <span class="ip-dot yellow"></span>
                  <span class="ip-dot green"></span>
                </div>
                <span class="ip-terminal-title">deployment · build log</span>
                <div style="flex:1"></div>
                @if (importStatus() === 'RUNNING' || importStatus() === 'PENDING') {
                  <div class="ip-live-badge">
                    <div class="ip-pulse-dot sm"></div>
                    LIVE
                  </div>
                }
              </div>

              <div class="ip-terminal-body" #terminalBody id="terminal-body">
                <!-- Mock raw console commands logs requested by user -->
                <div class="ip-log-line command"><span class="ip-log-prefix">$</span> <span class="ip-log-text">npm install</span></div>
                <div class="ip-log-line"><span class="ip-log-prefix">></span> <span class="ip-log-text">added 932 packages in 8s</span></div>
                <div class="ip-log-line command"><span class="ip-log-prefix">$</span> <span class="ip-log-text">npm run build</span></div>
                <div class="ip-log-line"><span class="ip-log-prefix">></span> <span class="ip-log-text">vite v7 compiling application...</span></div>

                @if (renderedLogLines().length === 0) {
                  <div class="ip-terminal-waiting">
                    <div class="ip-mini-spinner sm" style="border-color:rgba(99,102,241,0.3);border-top-color:#6366f1;"></div>
                    <span>Waiting for deployment logs...</span>
                  </div>
                } @else {
                  @for (line of renderedLogLines(); track $index) {
                    <div class="ip-log-line" [class]="line.cls">
                      <span class="ip-log-prefix" [class]="line.prefixCls">{{ line.prefix }}</span>
                      <span class="ip-log-text">{{ line.text }}</span>
                    </div>
                  }
                  @if (importStatus() === 'RUNNING' || importStatus() === 'PENDING') {
                    <div class="ip-log-line">
                      <span class="ip-cursor-blink">█</span>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        }

        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- Step 5: Success — Deployed Tool Dashboard                          -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        <!-- Step 5: Success — Deployed Tool Dashboard                          -->
        <!-- ═══════════════════════════════════════════════════════════════════ -->
        @if (step() === 5) {
          <div class="ip-success-pane">
            <!-- Header Section (Full Width) -->
            <div class="ip-success-header-full">
              <div class="ip-success-icon-wrap">
                <div class="ip-success-ring"></div>
                <div class="ip-success-ring r2"></div>
                <app-icon name="check-circle" class="ip-success-icon" />
              </div>
              <h1 class="ip-success-title">Deployed Successfully! 🎉</h1>
              <p class="ip-success-subtitle">Your tool is live and running on Acklet.</p>
            </div>

            <!-- Body Grid: Left side details, Right side live tool preview -->
            <div class="ip-success-body-grid">
              <div class="ip-success-details-column">
                <!-- Tool summary card -->
                <div class="ip-success-card">
                  <div class="ip-success-card-row">
                    <div
                      class="ip-repo-avatar"
                      [style]="getLangAvatarStyle(selectedRepo()?.language ?? '')"
                    >
                      <span class="ip-repo-avatar-letter">{{
                        getLangInitial(selectedRepo()?.language)
                      }}</span>
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div class="ip-success-tool-name">{{ importingRepo() }}</div>
                      @if (deployedToolSlug()) {
                        <div class="ip-success-url">acklet.app/tools/{{ deployedToolSlug() }}</div>
                      }
                    </div>
                    <span class="ip-success-live-badge">● LIVE</span>
                  </div>

                  <div class="ip-success-meta-grid">
                    <div class="ip-success-meta-item">
                      <span class="ip-success-meta-label">Runtime</span>
                      <span class="ip-success-meta-value">{{ getDetectedRuntime() }}</span>
                    </div>
                    <div class="ip-success-meta-item">
                      <span class="ip-success-meta-label">Port</span>
                      <span class="ip-success-meta-value">{{ appPort }}</span>
                    </div>
                    <div class="ip-success-meta-item">
                      <span class="ip-success-meta-label">Build Time</span>
                      <span class="ip-success-meta-value">{{ elapsedLabel() }}</span>
                    </div>
                    <div class="ip-success-meta-item">
                      <span class="ip-success-meta-label">Branch</span>
                      <span class="ip-success-meta-value">{{ selectedBranch }}</span>
                    </div>
                  </div>
                </div>

                <!-- CTA buttons -->
                <div class="ip-success-actions">
                  <a
                    [href]="getToolUrl()"
                    target="_blank"
                    class="ip-btn ip-btn-secondary ip-success-btn-visit"
                  >
                    <app-icon name="external-link" style="width:14px;height:14px;" />
                    Visit Live Tool
                  </a>
                  <button class="ip-deploy-btn" (click)="goToToolDashboard()">
                    <app-icon name="layout-dashboard" style="width:15px;height:15px;" />
                    Go to Tool Dashboard
                  </button>
                </div>
              </div>

              <!-- Live Tool Iframe / Preview Column -->
              <div class="ip-success-preview-column">
                <div class="ip-preview-browser">
                  <div class="ip-browser-header">
                    <div class="ip-browser-dots">
                      <span class="ip-browser-dot red"></span>
                      <span class="ip-browser-dot yellow"></span>
                      <span class="ip-browser-dot green"></span>
                    </div>
                    <div class="ip-browser-address">
                      <app-icon name="lock" style="width: 10px; height: 10px; color: #10b981; flex-shrink: 0;" />
                      <span class="ip-browser-url">http://localhost:{{ appPort }}</span>
                    </div>
                  </div>
                  <div class="ip-browser-content">
                    <iframe [src]="getSafeToolUrl()" style="width:100%; height:100%; border:none; background: #fff; border-radius: 0 0 8px 8px;"></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .ip-container {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        z-index: 10;
      }

      .ip-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 1;
      }

      .ip-card {
        position: relative;
        width: 100%;
        max-width: 540px;
        background: var(--vercel-card-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 12px;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
        padding: 32px;
        z-index: 2;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .ip-card.ip-card-wide {
        max-width: 780px;
      }

      .ip-step-pane {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex: 1;
      }

      .ip-close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        color: var(--vercel-text-muted);
        cursor: pointer;
        transition: all 0.15s ease;
        z-index: 3;
      }
      .ip-close-btn:hover {
        background: var(--vercel-subtle-bg);
        color: var(--vercel-text-primary);
      }
      .ip-close-icon {
        width: 14px;
        height: 14px;
      }

      .ip-stop-header-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: transparent;
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
        z-index: 3;
      }

      .ip-card-header {
        margin-bottom: 28px;
        flex-shrink: 0;
        padding: 7px;
      }

      .ip-back-nav {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--vercel-text-muted);
        cursor: pointer;
        margin-bottom: 12px;
        transition: color 0.15s;
      }
      .ip-back-nav:hover {
        color: var(--vercel-text-primary);
      }
      .ip-back-icon {
        width: 14px;
        height: 14px;
      }

      .ip-card-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--vercel-text-primary);
        margin: 0;
      }
      .ip-card-subtitle {
        font-size: 13px;
        color: var(--vercel-text-secondary);
        margin: 4px 0 0;
      }

      .ip-provider-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
      }
      .ip-provider-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        transition:
          opacity 0.15s ease,
          transform 0.1s ease;
      }
      .ip-provider-btn:hover:not(:disabled) {
        opacity: 0.9;
      }
      .ip-provider-btn:active:not(:disabled) {
        transform: scale(0.99);
      }
      .ip-provider-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ip-provider-btn.github {
        background: #171515;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .ip-provider-btn.gitlab {
        background: #7928ca;
      }
      .ip-provider-btn.bitbucket {
        background: #0052cc;
      }
      .ip-provider-icon {
        width: 20px;
        height: 20px;
      }

      .ip-btn-soon {
        position: relative;
      }
      .ip-soon-badge {
        margin-left: auto;
        font-size: 9px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 99px;
        letter-spacing: 0.05em;
      }

      .ip-card-footer {
        border-top: 1px solid var(--vercel-border);
        padding-top: 14px;
        text-align: center;
        flex-shrink: 0;
      }
      .ip-footer-link {
        font-size: 12px;
        color: var(--vercel-text-muted);
        text-decoration: none;
        transition: color 0.15s;
      }
      .ip-footer-link:hover {
        color: var(--vercel-text-primary);
      }

      .ip-account-chip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        margin-bottom: 12px;
        flex-shrink: 0;
      }
      .ip-account-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--vercel-text-primary);
        flex: 1;
      }
      .ip-account-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        background: var(--vercel-border);
        color: var(--vercel-text-muted);
        border-radius: 4px;
      }

      .ip-select {
        flex: 1;
        padding: 6px 10px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        color: var(--vercel-text-primary);
        font-size: 13px;
      }

      .ip-search-row {
        position: relative;
        margin-bottom: 12px;
        flex-shrink: 0;
      }
      .ip-search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 14px;
        height: 14px;
        color: var(--vercel-text-muted);
      }
      .ip-search-input {
        width: 100%;
        padding: 8px 12px 8px 32px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        font-size: 13px;
        color: var(--vercel-text-primary);
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
      }
      .ip-search-input::placeholder {
        color: var(--vercel-text-muted);
      }
      .ip-search-input:focus {
        border-color: var(--vercel-text-muted);
      }

      .ip-label-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .ip-toggle-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        user-select: none;
      }
      .ip-toggle-checkbox {
        width: 14px;
        height: 14px;
        accent-color: #6366f1;
        cursor: pointer;
      }
      .ip-toggle-text {
        font-size: 11px;
        font-weight: 600;
        color: var(--vercel-text-muted);
      }
      .ip-field-disabled {
        opacity: 0.55;
        background: rgba(0, 0, 0, 0.2) !important;
        cursor: not-allowed !important;
      }

      .ip-repo-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .ip-repo-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--vercel-border);
        margin-bottom: 8px;
        transition:
          border-color 0.15s ease,
          background 0.15s ease;
        cursor: default;
      }
      .ip-repo-item:hover {
        border-color: var(--vercel-text-muted);
        background: var(--vercel-subtle-bg);
      }
      .ip-repo-item.ip-repo-selected {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.05);
      }

      .ip-repo-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 1px solid var(--vercel-border);
        font-weight: 700;
      }
      .ip-repo-avatar-letter {
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        text-transform: uppercase;
      }
      .ip-repo-info {
        flex: 1;
        min-width: 0;
      }
      .ip-repo-name-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .ip-repo-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--vercel-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
      .ip-lock-icon {
        width: 11px;
        height: 11px;
        color: var(--vercel-text-muted);
        flex-shrink: 0;
      }
      .ip-repo-desc {
        font-size: 11px;
        color: var(--vercel-text-muted);
        margin: 2px 0 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ip-repo-updated {
        font-size: 10px;
        color: var(--vercel-text-muted);
        margin-top: 4px;
        display: block;
      }
      .ip-lang-chip {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 99px;
        background: rgba(99, 102, 241, 0.12);
        color: #818cf8;
        border: 1px solid rgba(99, 102, 241, 0.2);
      }

      .ip-repo-skeleton {
        padding: 12px;
        border-radius: 6px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        margin-bottom: 8px;
      }
      .ip-skel-name {
        height: 14px;
        width: 50%;
        background: var(--vercel-border);
        margin-bottom: 6px;
        border-radius: 4px;
      }
      .ip-skel-desc {
        height: 10px;
        width: 75%;
        background: var(--vercel-border);
        border-radius: 4px;
      }

      .ip-empty {
        text-align: center;
        padding: 32px;
        color: var(--vercel-text-muted);
        font-size: 13px;
      }
      .ip-empty-icon {
        width: 28px;
        height: 28px;
        margin: 0 auto 8px;
        display: block;
        opacity: 0.5;
      }

      /* Step 3 — config form elements */
      .ip-selected-repo-chip {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--vercel-border);
        background: var(--vercel-subtle-bg);
        flex-shrink: 0;
      }
      .ip-repo-avatar.sm {
        width: 30px;
        height: 30px;
        min-width: 30px;
        font-size: 10px;
      }
      .ip-private-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 99px;
        background: rgba(251, 191, 36, 0.1);
        color: #f59e0b;
        border: 1px solid rgba(251, 191, 36, 0.25);
        flex-shrink: 0;
      }
      .ip-form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .ip-form-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--vercel-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .ip-field {
        width: 100%;
        box-sizing: border-box;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 6px;
        color: var(--vercel-text-primary);
        padding: 7px 10px;
        font-size: 12px;
        outline: none;
        transition: border-color 0.15s;
        font-family: inherit;
      }
      .ip-field:focus {
        border-color: #6366f1;
      }
      .ip-field::placeholder {
        color: var(--vercel-text-muted);
      }
      .ip-config-section {
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .ip-config-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-primary);
        background: var(--vercel-subtle-bg);
        border-bottom: 1px solid var(--vercel-border);
      }
      .ip-config-section-body {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .ip-deploy-action-row {
        display: flex;
        justify-content: flex-end;
        padding-top: 8px;
        border-top: 1px solid var(--vercel-border);
        margin-top: 8px;
      }
      .ip-deploy-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition:
          opacity 0.15s ease,
          transform 0.1s ease;
      }
      .ip-deploy-btn:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
      }
      .ip-deploy-btn:active:not(:disabled) {
        transform: scale(0.98);
      }
      .ip-deploy-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      /* ─── Detected Config Panel ──────────────────────────────── */
      .ip-detected-config {
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        margin-top: 14px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .ip-detected-config-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--vercel-subtle-bg);
        border: none;
        width: 100%;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-primary);
        transition: background 0.15s;
      }
      .ip-detected-config-header:hover {
        background: var(--vercel-border);
      }
      .ip-detected-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 6px #10b981;
      }
      .ip-detected-config-body {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        border-top: 1px solid var(--vercel-border);
      }
      .ip-detected-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .ip-detected-item {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .ip-detected-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--vercel-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .ip-detected-value {
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-primary);
      }
      .ip-detected-cmd {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ip-detected-code {
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        font-size: 11px;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 4px;
        padding: 3px 8px;
        color: #a78bfa;
        flex: 1;
      }

      /* ─── Buttons ──────────────────────────────────────────────── */
      .ip-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s ease;
        white-space: nowrap;
      }
      .ip-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ip-btn-primary {
        background: var(--vercel-text-primary);
        color: var(--vercel-bg);
      }
      .ip-btn-primary:hover:not(:disabled) {
        opacity: 0.9;
      }
      .ip-btn-secondary {
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        color: var(--vercel-text-primary);
      }
      .ip-btn-sm {
        font-size: 11px;
        padding: 5px 12px;
      }

      .ip-mini-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.25);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      .ip-mini-spinner.sm {
        width: 12px;
        height: 12px;
        border: 2px solid var(--vercel-border);
        border-top-color: var(--vercel-text-primary, #171717);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .ip-error-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        color: #ef4444;
        font-size: 12px;
        font-weight: 500;
        margin-top: 12px;
      }
      .ip-error-icon {
        width: 16px;
        height: 16px;
        color: #ef4444;
        flex-shrink: 0;
      }
      .ip-card-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      /* ═══════════════════════════════════════════════════════════ */
      /*  Step 4 — Live Deployment Console                          */
      /* ═══════════════════════════════════════════════════════════ */
      .ip-console-pane {
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex: 1;
        min-height: 0;
      }

      /* Pipeline stage timeline */
      .ip-pipeline-bar {
        display: flex;
        align-items: center;
        gap: 0;
        padding: 16px 0 12px;
        overflow-x: auto;
      }
      .ip-pipeline-stage {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex: 1;
        position: relative;
        min-width: 80px;
      }
      .ip-pipeline-connector {
        position: absolute;
        top: 14px;
        left: 50%;
        width: 100%;
        height: 2px;
        background: var(--vercel-border);
        z-index: 0;
        transition: background 0.3s;
      }
      .ip-pipeline-connector.done {
        background: #10b981;
      }
      .ip-pipeline-node {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid var(--vercel-border);
        background: var(--vercel-card-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
        position: relative;
        transition:
          border-color 0.3s,
          background 0.3s;
      }
      .ip-pipeline-stage.done .ip-pipeline-node {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.12);
      }
      .ip-pipeline-stage.active .ip-pipeline-node {
        border-color: #6366f1;
        background: rgba(99, 102, 241, 0.12);
        box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
      }
      .ip-ps-check {
        width: 14px;
        height: 14px;
        color: #10b981;
      }
      .ip-ps-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--vercel-border);
      }
      .ip-ps-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(99, 102, 241, 0.25);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .ip-pipeline-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--vercel-text-muted);
        text-align: center;
        transition: color 0.3s;
      }
      .ip-pipeline-stage.done .ip-pipeline-label {
        color: #10b981;
      }
      .ip-pipeline-stage.active .ip-pipeline-label {
        color: #818cf8;
      }

      /* Console header */
      .ip-console-header {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ip-console-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .ip-console-repo-badge {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ip-console-repo-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--vercel-text-primary);
      }
      .ip-console-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ip-console-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 99px;
        letter-spacing: 0.05em;
        background: var(--vercel-border);
        color: var(--vercel-text-muted);
        transition: all 0.3s;
      }
      .ip-console-status-badge.running {
        background: rgba(99, 102, 241, 0.12);
        color: #818cf8;
        border: 1px solid rgba(99, 102, 241, 0.25);
      }
      .ip-console-status-badge.done {
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }
      .ip-console-status-badge.failed {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }
      .ip-elapsed {
        font-size: 11px;
        color: var(--vercel-text-muted);
        font-variant-numeric: tabular-nums;
        font-family: 'JetBrains Mono', monospace;
      }
      .ip-console-current-step {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--vercel-text-secondary);
        padding: 4px 0;
      }

      /* Pulse dot */
      .ip-pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #818cf8;
        animation: pulse 1.5s ease-in-out infinite;
      }
      .ip-pulse-dot.sm {
        width: 5px;
        height: 5px;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.4;
          transform: scale(0.8);
        }
      }

      /* Live badge */
      .ip-live-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 9px;
        font-weight: 800;
        color: #818cf8;
        letter-spacing: 0.1em;
      }



      .ip-activity-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #09090b;
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        padding: 20px;
        overflow-y: auto;
      }

      .ip-panel-title {
        font-size: 11px;
        font-weight: 700;
        color: #71717a;
        margin: 0;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .ip-milestones-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .ip-milestone-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #71717a;
      }

      .ip-milestone-item.done {
        color: #f4f4f5;
        font-weight: 500;
      }

      .ip-milestone-item.active {
        color: #f59e0b;
        font-weight: 500;
      }

      .ip-milestone-icon {
        width: 15px;
        height: 15px;
        color: #3f3f46;
      }

      .ip-milestone-icon.success {
        color: #22c55e;
      }

      .ip-progress-section {
        border-top: 1px solid var(--vercel-border);
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ip-progress-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }

      .ip-progress-lbl {
        color: #71717a;
        font-family: monospace;
      }

      .ip-progress-bar {
        color: #a1a1aa;
        font-family: monospace;
      }

      .ip-checklist-section {
        border-top: 1px solid var(--vercel-border);
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ip-checklist-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #71717a;
      }

      .ip-checklist-item.done {
        color: #a1a1aa;
      }

      .ip-chk-icon {
        width: 14px;
        height: 14px;
        color: #3f3f46;
      }

      .ip-chk-icon.success {
        color: #22c55e;
      }

      .ip-timeline-section {
        border-top: 1px solid var(--vercel-border);
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ip-timeline-log {
        display: flex;
        gap: 12px;
        font-size: 11px;
        font-family: monospace;
      }

      .ip-log-time {
        color: #71717a;
      }

      .ip-log-text {
        color: #a1a1aa;
      }

      .ip-terminal-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #040405;
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        overflow: hidden;
      }

      .ip-terminal {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #0d0d11;
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 10px;
        overflow: hidden;
        min-height: 300px;
        max-height: 380px;
      }
      .ip-terminal-topbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: #111116;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        flex-shrink: 0;
      }
      .ip-terminal-dots {
        display: flex;
        gap: 5px;
      }
      .ip-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .ip-dot.red {
        background: #ff5f57;
      }
      .ip-dot.yellow {
        background: #ffbd2e;
      }
      .ip-dot.green {
        background: #28ca41;
      }
      .ip-terminal-title {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.35);
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        flex: 1;
        text-align: center;
      }
      .ip-terminal-body {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
        font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
        font-size: 11.5px;
        line-height: 1.6;
        scroll-behavior: smooth;
      }
      .ip-terminal-body::-webkit-scrollbar {
        width: 4px;
      }
      .ip-terminal-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .ip-terminal-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      .ip-terminal-waiting {
        display: flex;
        align-items: center;
        gap: 10px;
        color: rgba(255, 255, 255, 0.3);
        font-size: 12px;
        padding: 12px 0;
      }

      /* Log line coloring */
      .ip-log-line {
        display: flex;
        align-items: baseline;
        gap: 8px;
        line-height: 1.65;
        white-space: pre-wrap;
        word-break: break-all;
      }
      .ip-log-prefix {
        font-weight: 700;
        flex-shrink: 0;
        font-size: 10px;
      }
      .ip-log-text {
        color: rgba(255, 255, 255, 0.82);
      }

      /* Builder = cyan */
      .ip-log-line.builder .ip-log-prefix {
        color: #22d3ee;
      }
      /* Deployer = purple */
      .ip-log-line.deployer .ip-log-prefix {
        color: #a78bfa;
      }
      /* Runtime = green */
      .ip-log-line.runtime .ip-log-prefix {
        color: #4ade80;
      }
      /* Runner/sandbox = amber */
      .ip-log-line.runner .ip-log-prefix {
        color: #fbbf24;
      }
      /* Error = red */
      .ip-log-line.error .ip-log-prefix {
        color: #f87171;
      }
      .ip-log-line.error .ip-log-text {
        color: #fca5a5;
      }
      /* Plain */
      .ip-log-line.plain .ip-log-text {
        color: rgba(255, 255, 255, 0.55);
      }

      .ip-cursor-blink {
        color: #6366f1;
        animation: blink 1.1s step-end infinite;
      }
      @keyframes blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
      }

      /* ═══════════════════════════════════════════════════════════ */
      /*  Step 5 — Success Screen                                   */
      /* ═══════════════════════════════════════════════════════════ */
      .ip-success-pane {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 8px 8px 0;
        gap: 16px;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .ip-success-header-full {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 12px;
        margin-bottom: 8px;
        flex-shrink: 0;
      }
      .ip-success-body-grid {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 20px;
        width: 100%;
        flex: 1;
        min-height: 0;
        align-items: stretch;
      }
      .ip-success-details-column {
        display: flex;
        flex-direction: column;
        gap: 16px;
        justify-content: flex-start;
      }
      .ip-success-preview-column {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 250px;
      }
      .ip-preview-browser {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--vercel-border);
        border-radius: 8px;
        overflow: hidden;
        background: #111116;
        height: 100%;
        min-height: 250px;
      }
      .ip-browser-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: #18181f;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        flex-shrink: 0;
      }
      .ip-browser-dots {
        display: flex;
        gap: 5px;
      }
      .ip-browser-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .ip-browser-dot.red { background: #ff5f57; }
      .ip-browser-dot.yellow { background: #ffbd2e; }
      .ip-browser-dot.green { background: #28ca41; }
      .ip-browser-address {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 4px;
        padding: 3px 8px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        max-width: 280px;
        margin: 0 auto;
      }
      .ip-browser-url {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .ip-browser-content {
        flex: 1;
        min-height: 0;
        background: #fff;
      }
      .ip-success-icon-wrap {
        position: relative;
        width: 72px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ip-success-ring {
        position: absolute;
        inset: 0;
        border: 2px solid rgba(16, 185, 129, 0.3);
        border-radius: 50%;
        animation: ripple 2s ease-out infinite;
      }
      .ip-success-ring.r2 {
        animation-delay: 0.7s;
        border-color: rgba(16, 185, 129, 0.15);
      }
      @keyframes ripple {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(1.7);
          opacity: 0;
        }
      }
      .ip-success-icon {
        width: 44px;
        height: 44px;
        color: #10b981;
        z-index: 1;
        filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.5));
      }
      .ip-success-title {
        font-size: 22px;
        font-weight: 800;
        color: var(--vercel-text-primary);
        margin: 0;
      }
      .ip-success-subtitle {
        font-size: 14px;
        color: var(--vercel-text-secondary);
        margin: -12px 0 0;
      }

      .ip-success-card {
        width: 100%;
        background: var(--vercel-subtle-bg);
        border: 1px solid var(--vercel-border);
        border-radius: 10px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        text-align: left;
      }
      .ip-success-card-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ip-success-tool-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--vercel-text-primary);
      }
      .ip-success-url {
        font-size: 11px;
        color: var(--vercel-text-muted);
        font-family: 'JetBrains Mono', monospace;
        margin-top: 2px;
      }
      .ip-success-live-badge {
        margin-left: auto;
        font-size: 10px;
        font-weight: 800;
        color: #10b981;
        letter-spacing: 0.08em;
        animation: pulse 2s ease-in-out infinite;
      }
      .ip-success-meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .ip-success-meta-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .ip-success-meta-label {
        font-size: 10px;
        font-weight: 600;
        color: var(--vercel-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .ip-success-meta-value {
        font-size: 12px;
        font-weight: 600;
        color: var(--vercel-text-primary);
      }

      .ip-success-actions {
        display: flex;
        gap: 10px;
        width: 100%;
        padding-bottom: 8px;
      }
      .ip-success-btn-visit {
        flex: 0 0 auto;
      }
      .ip-success-actions .ip-deploy-btn {
        flex: 1;
      }
    `,
  ],
})
export class ProjectImportComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly gh = inject(GitHubService);
  readonly stateSvc = inject(WorkspaceStateService);
  private readonly dialogSvc = inject(DialogService);
  private readonly location = inject(Location);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  getToolUrl(): string {
    const slug = this.deployedToolSlug() || '';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://localhost:8080/tools/${slug}`;
    }
    return `https://${slug}.tools.acklet.com`;
  }

  getSafeToolUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.getToolUrl());
  }

  readonly step = signal(1);
  readonly mode = signal<'import' | 'deploy'>('import');
  readonly connecting = signal(false);
  readonly connectError = signal<string | null>(null);
  readonly deploying = signal(false);

  readonly accounts = signal<GitHubAccount[]>([]);
  readonly repos = signal<GitHubRepo[]>([]);
  readonly loadingRepos = signal(false);
  selectedAccountId = '';

  readonly selectedRepo = signal<GitHubRepo | null>(null);
  readonly importingRepo = signal<string | null>(null);
  readonly importError = signal<string | null>(null);
  readonly importStatus = signal<'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | null>(null);
  readonly currentStep = signal<string | null>(null);
  activeJobId: string | null = null;
  readonly importedRepositoryId = signal<string | null>(null);
  readonly deployedToolSlug = signal<string | null>(null);
  readonly deployedToolId = signal<string | null>(null);

  // Live log tracking
  private rawLogsBuffer = '';
  readonly renderedLogLines = signal<
    Array<{ prefix: string; text: string; cls: string; prefixCls: string }>
  >([]);

  // Elapsed timer
  private deployStartTime = 0;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;
  readonly elapsedSeconds = signal(0);
  readonly elapsedLabel = computed(() => {
    const s = this.elapsedSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  });

  getTimestampOffset(offsetSeconds: number): string {
    const start = this.deployStartTime || Date.now();
    const t = new Date(start + (offsetSeconds * 1000));
    const hrs = String(t.getHours()).padStart(2, '0');
    const mins = String(t.getMinutes()).padStart(2, '0');
    const secs = String(t.getSeconds()).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }




  searchQuery = '';
  selectedWorkspace = 'Personal Workspace';
  selectedCollection = 'Developer Tools';
  selectedBranch = 'main';
  availableBranches: string[] = [];
  rootDirectory = './';
  buildCommand = '';
  outputDirectory = '';
  installCommand = '';
  startCommand = '';
  appPort = 3000;
  overrideBuildCmd = false;
  overrideInstallCmd = false;
  overrideStartCmd = false;
  overridePort = false;
  envList: Array<{ key: string; value: string; isSecret: boolean }> = [];
  showDetectedConfig = true;

  readonly pipelineStages = [
    { id: 'connect', label: 'GitHub' },
    { id: 'clone', label: 'Clone' },
    { id: 'gather', label: 'Gather Info' },
    { id: 'build', label: 'Build' },
    { id: 'deploy', label: 'Deploy' },
  ];

  private readonly STATUS_TO_STAGE: Record<string, number> = {
    PENDING: 0,
    CLONING: 1,
    ANALYZING: 2,
    AI_GENERATION: 3,
    DONE: 4,
  };

  addEnvRow(): void {
    this.envList.push({ key: '', value: '', isSecret: false });
  }

  removeEnvRow(index: number): void {
    this.envList.splice(index, 1);
  }

  readonly filteredImportedRepos = computed(() => {
    const list = this.stateSvc.repos();
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
    );
  });

  readonly filteredRepos = computed(() => {
    const list = this.repos();
    if (!this.searchQuery.trim()) return list;
    const q = this.searchQuery.toLowerCase().trim();
    return list.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    );
  });

  readonly progressSteps = signal<
    Array<{ label: string; done: boolean; active: boolean; failed?: boolean }>
  >([
    { label: 'Queued', done: false, active: false },
    { label: 'Cloning Repository', done: false, active: false },
    { label: 'Analyzing Structure', done: false, active: false },
    { label: 'Building & Packaging', done: false, active: false },
    { label: 'Deploying Live Sandbox', done: false, active: false },
    { label: 'Completed', done: false, active: false },
  ]);

  // Active pipeline stage index (for the visual bar)
  private activePipelineIdx = signal(0);

  isPipelineStageDone(idx: number): boolean {
    const status = this.importStatus();
    if (status === 'DONE') return true;
    return idx < this.activePipelineIdx();
  }

  isPipelineStageActive(idx: number): boolean {
    const status = this.importStatus();
    if (status === 'DONE' || status === 'FAILED') return false;
    return idx === this.activePipelineIdx();
  }

  ngOnInit(): void {
    const modeParam = this.route.snapshot.queryParamMap.get('mode');
    if (modeParam === 'deploy') {
      this.mode.set('deploy');
      this.step.set(2);
      this.gh.listAccounts().subscribe({
        next: (accs) => {
          this.accounts.set(accs);
          if (accs.length > 0) this.selectedAccountId = accs[0].id;
        },
      });
    } else {
      this.mode.set('import');
      const stepParam = this.route.snapshot.queryParamMap.get('step');
      const accountIdParam = this.route.snapshot.queryParamMap.get('accountId');

      if (stepParam === '2') {
        this.loadAccounts(accountIdParam ?? undefined);
      } else {
        this.step.set(1);
        this.gh.listAccounts().subscribe({
          next: (accs) => {
            this.accounts.set(accs);
            if (accs.length > 0) {
              this.selectedAccountId = accs[0].id;
              if (accs.length > 0 && stepParam !== '1') {
                this.loadAccounts(accountIdParam ?? accs[0].id);
              }
            }
          },
        });
      }
    }
  }

  ngOnDestroy(): void {
    this.stopElapsedTimer();
  }

  // ── Elapsed timer ──────────────────────────────────────────────
  private startElapsedTimer(): void {
    this.deployStartTime = Date.now();
    this.elapsedSeconds.set(0);
    this.elapsedInterval = setInterval(() => {
      this.elapsedSeconds.set(Math.floor((Date.now() - this.deployStartTime) / 1000));
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  // ── Log parsing ────────────────────────────────────────────────
  private parseAndAppendLogs(rawLogs: string): void {
    if (!rawLogs || rawLogs === this.rawLogsBuffer) return;
    // Get only new content since last poll
    const newContent = rawLogs.slice(this.rawLogsBuffer.length);
    this.rawLogsBuffer = rawLogs;

    const newLines = newContent.split('\n').filter((l) => l.trim().length > 0);
    if (newLines.length === 0) return;

    const parsed = newLines.map((line) => this.parseLine(line));
    this.renderedLogLines.update((existing) => [...existing, ...parsed]);

    // Auto-scroll terminal to bottom
    setTimeout(() => {
      const el = document.getElementById('terminal-body');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }

  private parseLine(line: string): {
    prefix: string;
    text: string;
    cls: string;
    prefixCls: string;
  } {
    const prefixMatch = line.match(/^\[([^\]]+)\]/);
    if (!prefixMatch) {
      return { prefix: '>', text: line, cls: 'plain', prefixCls: '' };
    }
    const tag = prefixMatch[1].toLowerCase();
    const text = line.slice(prefixMatch[0].length).trimStart();
    const prefix = `[${prefixMatch[1]}]`;

    if (tag.includes('builder')) return { prefix, text, cls: 'builder', prefixCls: '' };
    if (tag.includes('deployer')) return { prefix, text, cls: 'deployer', prefixCls: '' };
    if (tag.includes('runtime')) return { prefix, text, cls: 'runtime', prefixCls: '' };
    if (tag.includes('runner') || tag.includes('sandbox'))
      return { prefix, text, cls: 'runner', prefixCls: '' };
    if (tag.includes('error') || tag.includes('fail'))
      return { prefix, text, cls: 'error', prefixCls: '' };
    return { prefix, text, cls: 'plain', prefixCls: '' };
  }

  // ── Connections / Accounts ─────────────────────────────────────
  connectGitHub(): void {
    this.connecting.set(true);
    this.connectError.set(null);
    this.gh.getConnectUrl().subscribe({
      next: (url) => {
        window.location.href = url;
      },
      error: () => {
        this.connecting.set(false);
        this.connectError.set('Failed to reach Git provider backend.');
      },
    });
  }

  loadAccounts(preselect?: string): void {
    this.gh.listAccounts().subscribe({
      next: (accs) => {
        this.accounts.set(accs);
        if (accs.length > 0) {
          const target = accs.find((a) => a.id === preselect) ?? accs[0];
          this.selectedAccountId = target.id;
          this.step.set(2);
          this.loadRepos();
        }
      },
    });
  }

  loadRepos(): void {
    if (!this.selectedAccountId) return;
    this.loadingRepos.set(true);
    this.repos.set([]);
    this.gh.listRepos(this.selectedAccountId, 1, 50).subscribe({
      next: (repos) => {
        this.repos.set(repos);
        this.loadingRepos.set(false);
      },
      error: () => {
        this.loadingRepos.set(false);
      },
    });
  }

  onSearch(): void {}

  loadBranchesForRepo(repo: GitHubRepo): void {
    if (!this.selectedAccountId) return;
    const fullName = repo.full_name || repo.fullName || '';
    if (!fullName.includes('/')) return;
    const [owner, name] = fullName.split('/');
    this.http
      .get<any>(
        `http://localhost:8080/api/v1/github/accounts/${this.selectedAccountId}/repos/${owner}/${name}/branches`,
      )
      .subscribe({
        next: (res) => {
          if (res.data) {
            this.availableBranches = res.data;
            if (this.availableBranches.length > 0) this.selectedBranch = this.availableBranches[0];
          }
        },
      });
  }

  // ── Detected config helpers ────────────────────────────────────
  getDetectedRuntime(): string {
    const lang = (this.selectedRepo()?.language || '').toLowerCase();
    const runtimes: Record<string, string> = {
      typescript: 'Node.js / TypeScript',
      javascript: 'Node.js',
      python: 'Python',
      java: 'JVM / Java',
      kotlin: 'JVM / Kotlin',
      go: 'Go',
      rust: 'Rust',
      'c#': '.NET',
      ruby: 'Ruby',
      php: 'PHP',
    };
    return runtimes[lang] || this.selectedRepo()?.language || 'Unknown';
  }

  getDetectedPackageManager(): string {
    const lang = (this.selectedRepo()?.language || '').toLowerCase();
    if (lang === 'python') return 'pip';
    if (lang === 'java' || lang === 'kotlin') return 'Maven / Gradle';
    if (lang === 'go') return 'go mod';
    if (lang === 'rust') return 'cargo';
    if (lang === 'php') return 'composer';
    if (lang === 'ruby') return 'bundler';
    return 'npm';
  }

  // ── Import / Deploy ────────────────────────────────────────────
  deployImportedRepo(repo: RepositoryItem): void {
    if (!this.selectedAccountId) {
      this.importError.set(
        'No connected GitHub account found. Please connect your account in Settings.',
      );
      return;
    }
    this.importingRepo.set(repo.name);
    this.importError.set(null);
    this.importStatus.set('PENDING');
    this.step.set(3);

    this.gh.importRepo(this.selectedAccountId, repo.name).subscribe({
      next: (job) => {
        this.activeJobId = job.jobId;
        this.pollImportStatus(job.jobId);
      },
      error: () => {
        this.importingRepo.set(null);
        this.step.set(2);
        this.importError.set('Failed to queue deployment. Please try again.');
      },
    });
  }

  selectRepoForConfig(repo: GitHubRepo): void {
    this.selectedRepo.set(repo);
    this.importError.set(null);
    this.loadBranchesForRepo(repo);
    const lang = (repo.language || '').toLowerCase();
    if (lang === 'java') {
      this.buildCommand = this.buildCommand || 'mvn package -DskipTests';
      this.installCommand = '';
      this.startCommand = this.startCommand || 'java -jar target/*.jar';
      this.appPort = 8080;
    } else if (lang === 'python') {
      this.buildCommand = '';
      this.installCommand = this.installCommand || 'pip install -r requirements.txt';
      this.startCommand = this.startCommand || 'python app.py';
      this.appPort = 5000;
    } else if (lang === 'go') {
      this.buildCommand = this.buildCommand || 'go build -o app .';
      this.installCommand = this.installCommand || 'go mod download';
      this.startCommand = this.startCommand || './app';
      this.appPort = 8080;
    } else if (lang === 'rust') {
      this.buildCommand = this.buildCommand || 'cargo build --release';
      this.installCommand = this.installCommand || 'cargo fetch';
      this.startCommand = this.startCommand || './target/release/app';
      this.appPort = 8080;
    } else {
      this.buildCommand = this.buildCommand || 'npm run build';
      this.installCommand = this.installCommand || 'npm install';
      this.startCommand = this.startCommand || 'npm start';
      this.appPort = 3000;
    }
    this.step.set(3);
  }

  deploySelectedRepo(): void {
    const repo = this.selectedRepo();
    if (!repo) return;
    const fullName = repo.full_name || repo.fullName || '';
    this.deploying.set(true);
    this.importingRepo.set(fullName);
    this.importError.set(null);
    this.importStatus.set('PENDING');

    // Reset log state
    this.rawLogsBuffer = '';
    this.renderedLogLines.set([]);

    const envMap: Record<string, string> = {};
    for (const env of this.envList) {
      if (env.key?.trim()) envMap[env.key.trim()] = env.value?.trim() ?? '';
    }

    // Only send custom commands if their toggle is enabled; otherwise send null to use system defaults
    const finalBuildCommand = this.overrideBuildCmd ? this.buildCommand : undefined;
    const finalStartCommand = this.overrideStartCmd ? this.startCommand : undefined;
    const finalInstallCommand = this.overrideInstallCmd ? this.installCommand : undefined;

    this.gh
      .importRepo(
        this.selectedAccountId,
        fullName,
        this.selectedBranch,
        finalBuildCommand,
        finalStartCommand,
        finalInstallCommand,
        envMap,
      )
      .subscribe({
        next: (job) => {
          this.deploying.set(false);
          this.activeJobId = job.jobId;
          this.step.set(4);
          this.startElapsedTimer();
          this.activePipelineIdx.set(0);
          this.pollImportStatus(job.jobId);
        },
        error: () => {
          this.deploying.set(false);
          this.importingRepo.set(null);
          this.importError.set('Failed to queue deployment. Please try again.');
        },
      });
  }

  startImport(repo: GitHubRepo): void {
    this.selectRepoForConfig(repo);
  }

  private pollImportStatus(jobId: string): void {
    const STATUS_MAP: Record<string, number> = {
      PENDING: 0,
      CLONING: 1,
      ANALYZING: 2,
      AI_GENERATION: 3,
      DONE: 4,
    };

    let lastActiveIdx = 0;

    const poll = () => {
      if (!this.activeJobId || this.step() !== 4) return;
      this.gh.getImportStatus(jobId).subscribe({
        next: (job: any) => {
          if (!this.activeJobId || this.step() !== 4) return;
          this.currentStep.set(job.currentStep ?? null);

          const isFailed = job.status === 'FAILED';
          const isDone = job.status === 'DONE';
          const activeIdx = isFailed ? lastActiveIdx : (STATUS_MAP[job.status] ?? 0);
          if (!isFailed) {
            lastActiveIdx = activeIdx;
            this.activePipelineIdx.set(activeIdx);
          }

          // Append new log lines from the poll
          if (job.buildLogs) {
            this.parseAndAppendLogs(job.buildLogs);
          }

          // Update progress steps (legacy list, still drives the pipeline bar)
          this.progressSteps.update((steps) =>
            steps.map((s, i) => ({
              ...s,
              done: isDone || i < activeIdx,
              active: i === activeIdx && !isDone && !isFailed,
              failed: isFailed && i === activeIdx,
            })),
          );

          if (job.repositoryId) this.importedRepositoryId.set(job.repositoryId);
          if (job.toolId) this.deployedToolId.set(job.toolId);
          if (job.toolSlug) this.deployedToolSlug.set(job.toolSlug);

          if (isDone) {
            this.importStatus.set('DONE');
            this.stopElapsedTimer();
            this.activePipelineIdx.set(this.pipelineStages.length); // all done
            this.stateSvc.refreshRepos();
            this.stateSvc.refreshTools();
            // Show success screen
            setTimeout(() => {
              this.activeJobId = null;
              this.step.set(5);
            }, 600);
          } else if (isFailed) {
            this.importStatus.set('FAILED');
            this.stopElapsedTimer();
            const msg = job.errorMessage?.trim() || 'Deployment failed. Check build configuration.';
            this.importError.set(msg);
          } else {
            this.importStatus.set('RUNNING');
            setTimeout(poll, 1500);
          }
        },
        error: () => {
          if (!this.activeJobId || this.step() !== 4) return;
          setTimeout(poll, 3000);
        },
      });
    };

    setTimeout(poll, 1000);
  }

  // ── Navigation ─────────────────────────────────────────────────
  goToToolDashboard(): void {
    const slug = this.deployedToolSlug();
    const id = this.deployedToolId();
    if (slug) {
      this.router.navigate(['/workspace/tools/manage', slug]);
    } else if (id) {
      this.router.navigate(['/workspace/tools/manage', id]);
    } else {
      this.router.navigate(['/workspace/tools']);
    }
  }

  closeCard(): void {
    if (this.step() === 5) {
      this.goToToolDashboard();
      return;
    }
    if (this.importStatus() === 'DONE' && this.importedRepositoryId()) {
      this.router.navigate(['/workspace/projects/publish', this.importedRepositoryId()]);
    } else if (this.importStatus() === 'DONE') {
      this.router.navigate(['/workspace/tools']);
    } else {
      this.location.back();
    }
  }

  async onCancelImport(): Promise<void> {
    if (this.step() === 4 && this.activeJobId) {
      const stop = await this.dialogSvc.confirm(
        'Do you really want to stop the deployment?',
        'Cancel Build',
      );
      if (stop) {
        const jobIdToCancel = this.activeJobId;
        this.activeJobId = null;
        this.stopElapsedTimer();
        this.router.navigate(['/workspace/tools']);
        this.gh.cancelImport(jobIdToCancel).subscribe({
          error: (err) => console.error('Failed to cancel import:', err),
        });
      }
    } else {
      this.closeCard();
    }
  }

  // ── Formatting helpers ─────────────────────────────────────────
  formatDate(iso?: string): string {
    if (!iso) return '';
    const now = Date.now();
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) {
      const m = Math.floor(diffSec / 60);
      return `${m}m ago`;
    }
    if (diffSec < 86400) {
      const h = Math.floor(diffSec / 3600);
      return `${h}h ago`;
    }
    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) {
      const w = Math.floor(diffDays / 7);
      return `${w}w ago`;
    }
    if (diffDays < 365) {
      const mo = Math.floor(diffDays / 30);
      return `${mo}mo ago`;
    }
    const yr = Math.floor(diffDays / 365);
    return `${yr}y ago`;
  }

  getLangAvatarStyle(lang?: string): string {
    const colors: Record<string, { bg: string; color: string; border: string }> = {
      TypeScript: {
        bg: 'linear-gradient(135deg, #3178c6, #235a97)',
        color: '#fff',
        border: '#3178c6',
      },
      JavaScript: {
        bg: 'linear-gradient(135deg, #f7df1e, #d4be19)',
        color: '#000',
        border: '#f7df1e',
      },
      Python: { bg: 'linear-gradient(135deg, #3776ab, #2b5b84)', color: '#fff', border: '#3776ab' },
      Java: { bg: 'linear-gradient(135deg, #b07219, #8c5a14)', color: '#fff', border: '#b07219' },
      Kotlin: { bg: 'linear-gradient(135deg, #a97bff, #855be6)', color: '#fff', border: '#a97bff' },
      Swift: { bg: 'linear-gradient(135deg, #f05138, #c43e28)', color: '#fff', border: '#f05138' },
      Go: { bg: 'linear-gradient(135deg, #00add8, #0087a8)', color: '#fff', border: '#00add8' },
      Rust: { bg: 'linear-gradient(135deg, #a9581a, #854314)', color: '#fff', border: '#a9581a' },
      'C#': { bg: 'linear-gradient(135deg, #68217a, #521961)', color: '#fff', border: '#68217a' },
      'C++': { bg: 'linear-gradient(135deg, #f34b7d, #cc3b67)', color: '#fff', border: '#f34b7d' },
      C: { bg: 'linear-gradient(135deg, #555555, #3c3c3c)', color: '#fff', border: '#555555' },
      PHP: { bg: 'linear-gradient(135deg, #777bb4, #5f6291)', color: '#fff', border: '#777bb4' },
      Ruby: { bg: 'linear-gradient(135deg, #701516, #591011)', color: '#fff', border: '#701516' },
      HTML: { bg: 'linear-gradient(135deg, #e34c26, #b83a1b)', color: '#fff', border: '#e34c26' },
      CSS: { bg: 'linear-gradient(135deg, #563d7c, #422d60)', color: '#fff', border: '#563d7c' },
      SCSS: { bg: 'linear-gradient(135deg, #c6538c, #a13f70)', color: '#fff', border: '#c6538c' },
      Shell: { bg: 'linear-gradient(135deg, #4caf1e, #3a8a15)', color: '#fff', border: '#4caf1e' },
      Dart: { bg: 'linear-gradient(135deg, #00b4ab, #009189)', color: '#fff', border: '#00b4ab' },
      Vue: { bg: 'linear-gradient(135deg, #41b883, #339469)', color: '#fff', border: '#41b883' },
      Svelte: { bg: 'linear-gradient(135deg, #ff3e00, #cc3100)', color: '#fff', border: '#ff3e00' },
      Dockerfile: {
        bg: 'linear-gradient(135deg, #2496ed, #1c78be)',
        color: '#fff',
        border: '#2496ed',
      },
    };
    const c = lang
      ? (colors[lang] ?? {
          bg: 'linear-gradient(135deg, #888888, #666666)',
          color: '#fff',
          border: '#888888',
        })
      : { bg: 'linear-gradient(135deg, #888888, #666666)', color: '#fff', border: '#888888' };
    return `background:${c.bg};color:${c.color};border-color:${c.border}`;
  }

  getLangInitial(lang?: string): string {
    if (!lang) return '?';
    const abbr: Record<string, string> = {
      TypeScript: 'TS',
      JavaScript: 'JS',
      Python: 'Py',
      Kotlin: 'Kt',
      Swift: 'Sw',
      Rust: 'Rs',
      Dockerfile: 'Dk',
      Shell: 'Sh',
      Ruby: 'Rb',
      HTML: 'HT',
      SCSS: 'SC',
      Dart: 'Da',
      Svelte: 'Sv',
    };
    return abbr[lang] ?? lang.charAt(0);
  }
}
