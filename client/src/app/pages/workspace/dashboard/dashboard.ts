import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { ToolsService } from '../../../core/services/tools.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { AuthService } from '../../../core/services/auth.service';
import { WorkspaceStateService } from '../../../core/services/workspace-state.service';

@Component({
  selector: 'app-workspace-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent],
  template: `
    <div class="db-wrapper">
      <!-- Search & Quick Action Header Bar -->
      <div class="db-header-bar">
        <div class="db-search-box">
          <app-icon name="search" class="db-search-icon" />
          <input type="text" placeholder="Search Projects..." class="db-search-input" />
        </div>
 
        <div class="db-actions">
          <div class="db-view-toggle">
            <button class="db-toggle-btn active">
              <app-icon name="layout-grid" class="db-toggle-icon" />
            </button>
            <button class="db-toggle-btn">
              <app-icon name="list" class="db-toggle-icon" />
            </button>
          </div>
          <a routerLink="/workspace/projects/import" class="db-add-btn">
            <span>Add New...</span>
            <app-icon name="chevron-down" class="db-add-btn-icon" />
          </a>
        </div>
      </div>
 
      <!-- Main Dashboard Grid (Vercel Overview Layout) -->
      <div class="db-grid">
        <!-- Stats Widget (Left Column) -->
        <div class="db-widget-card usage-card">
          <div class="db-widget-header">
            <span class="db-widget-title">Workspace Overview</span>
            <span class="db-widget-subtitle">Live Stats</span>
          </div>

          <div class="db-usage-list">
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot cyan"></span>
                <span>Connected Repos</span>
              </div>
              <span class="db-usage-value">{{ stateSvc.repos().length }}</span>
            </div>
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot emerald"></span>
                <span>Synced</span>
              </div>
              <span class="db-usage-value">{{ syncedCount() }}</span>
            </div>
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot indigo"></span>
                <span>Syncing / Pending</span>
              </div>
              <span class="db-usage-value">{{ syncingCount() }}</span>
            </div>
            <div class="db-usage-item">
              <div class="db-usage-label">
                <span class="db-status-dot purple"></span>
                <span>AI Analyzed</span>
              </div>
              <span class="db-usage-value">{{ analyzedCount() }}</span>
            </div>
          </div>

          <div class="db-widget-footer">
            <a routerLink="/workspace/projects/import" class="db-upgrade-btn">
              Import Repository
            </a>
          </div>
        </div>

        <!-- Projects Grid (Right 2 Columns) -->
        <div class="db-projects-section">
          <div class="db-section-header">
            <h2 class="db-section-title">Projects</h2>
            <a routerLink="/workspace/projects" class="db-view-all-link">View All →</a>
          </div>
 
          <div class="db-projects-grid">
            @for (project of projects(); track project.id) {
              <div class="db-project-card">
                <div class="db-project-top">
                  <div class="db-project-info">
                    <div class="db-project-avatar">
                      {{ project.name[0].toUpperCase() }}
                    </div>
                    <div class="db-project-names">
                      <a [routerLink]="['/workspace/tools/manage', project.id]" class="db-project-title">
                        {{ project.name }}
                      </a>
                      <div class="db-project-domain">{{ project.domain }}</div>
                    </div>
                  </div>
                  <span class="db-project-status-dot"></span>
                </div>
 
                <div class="db-project-bottom">
                  <div class="db-project-repo">
                    <app-icon name="git-branch" class="db-project-repo-icon" />
                    <span>{{ project.repo }}</span>
                  </div>
                  <span class="db-project-time">{{ project.lastSync }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- ── Quick Launch Tools Widget ─────────────────────────────────────── -->
      <div class="ql-section">
        <div class="ql-section-header">
          <div class="ql-section-title-group">
            <app-icon name="zap" class="ql-section-icon" />
            <h2 class="ql-section-title">Quick Launch</h2>
            <span class="ql-section-badge">Tools</span>
          </div>
          <a routerLink="/tools/explore" class="ql-browse-link">
            Browse All
            <app-icon name="arrow-right" class="ql-browse-icon" />
          </a>
        </div>

        <div class="ql-tools-grid">
          <!-- EasyConvert -->
          <a routerLink="/tools/easy-convert" class="ql-tool-card">
            <div class="ql-tool-accent" style="background: linear-gradient(135deg, #2196F3, #0D47A1)"></div>
            <div class="ql-tool-body">
              <div class="ql-tool-icon-wrap" style="background: linear-gradient(135deg, #2196F3, #0D47A1)">
                <app-icon name="arrow-right-left" class="ql-tool-icon" />
              </div>
              <div class="ql-tool-info">
                <div class="ql-tool-header">
                  <span class="ql-tool-name">EasyConvert</span>
                  <span class="ql-tool-badge new">New</span>
                </div>
                <p class="ql-tool-desc">Convert PDF, Word, images &amp; more — locally in your browser.</p>
                <div class="ql-tool-meta">
                  <span class="ql-tool-tag"><app-icon name="shield-check" class="ql-tag-icon" /> Local-first</span>
                  <span class="ql-tool-tag"><app-icon name="layers" class="ql-tag-icon" /> Batch support</span>
                </div>
              </div>
            </div>
            <div class="ql-tool-footer">
              <span class="ql-launch-btn">
                <app-icon name="rocket" class="ql-launch-icon" />
                Launch EasyConvert
              </span>
              <span class="ql-rating">★ 5.0 · 154k uses</span>
            </div>
          </a>

          <!-- JSON Formatter -->
          <a routerLink="/tools/json-formatter" class="ql-tool-card">
            <div class="ql-tool-accent" style="background: linear-gradient(135deg, #f97316, #ea580c)"></div>
            <div class="ql-tool-body">
              <div class="ql-tool-icon-wrap" style="background: linear-gradient(135deg, #f97316, #ea580c)">
                <app-icon name="braces" class="ql-tool-icon" />
              </div>
              <div class="ql-tool-info">
                <div class="ql-tool-header">
                  <span class="ql-tool-name">JSON Formatter</span>
                </div>
                <p class="ql-tool-desc">Beautify, minify, and validate JSON with syntax highlighting.</p>
                <div class="ql-tool-meta">
                  <span class="ql-tool-tag"><app-icon name="zap" class="ql-tag-icon" /> Instant</span>
                  <span class="ql-tool-tag"><app-icon name="shield-check" class="ql-tag-icon" /> Browser-only</span>
                </div>
              </div>
            </div>
            <div class="ql-tool-footer">
              <span class="ql-launch-btn">
                <app-icon name="rocket" class="ql-launch-icon" />
                Launch JSON Formatter
              </span>
              <span class="ql-rating">★ 4.8 · 891k uses</span>
            </div>
          </a>

          <!-- Color Palette Generator -->
          <a routerLink="/tools/color-palette" class="ql-tool-card">
            <div class="ql-tool-accent" style="background: linear-gradient(135deg, #ec4899, #8b5cf6)"></div>
            <div class="ql-tool-body">
              <div class="ql-tool-icon-wrap" style="background: linear-gradient(135deg, #ec4899, #8b5cf6)">
                <app-icon name="palette" class="ql-tool-icon" />
              </div>
              <div class="ql-tool-info">
                <div class="ql-tool-header">
                  <span class="ql-tool-name">Color Palette</span>
                  <span class="ql-tool-badge hot">Trending</span>
                </div>
                <p class="ql-tool-desc">Generate beautiful palettes for design systems and UIs.</p>
                <div class="ql-tool-meta">
                  <span class="ql-tool-tag"><app-icon name="eye" class="ql-tag-icon" /> WCAG check</span>
                  <span class="ql-tool-tag"><app-icon name="download" class="ql-tag-icon" /> CSS export</span>
                </div>
              </div>
            </div>
            <div class="ql-tool-footer">
              <span class="ql-launch-btn">
                <app-icon name="rocket" class="ql-launch-icon" />
                Launch Color Palette
              </span>
              <span class="ql-rating">★ 4.9 · 234k uses</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .db-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .db-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .db-search-box {
      position: relative;
      flex: 1;
      max-width: 480px;
    }
 
    .db-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }
 
    .db-search-input {
      width: 100%;
      padding: 8px 12px 8px 36px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      font-size: 13px;
      color: var(--vercel-text-primary);
      outline: none;
      transition: border-color 0.15s ease;
    }
 
    .db-search-input:focus {
      border-color: var(--vercel-text-muted);
    }
 
    .db-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
 
    .db-view-toggle {
      display: flex;
      align-items: center;
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 2px;
      background: var(--vercel-subtle-bg);
    }
 
    .db-toggle-btn {
      background: transparent;
      border: none;
      padding: 6px;
      border-radius: 4px;
      cursor: pointer;
      color: var(--vercel-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
    }
 
    .db-toggle-btn.active {
      background: var(--vercel-card-bg);
      color: var(--vercel-text-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
 
    .db-toggle-icon {
      width: 14px;
      height: 14px;
    }
 
    .db-add-btn {
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
 
    .db-add-btn:hover {
      opacity: 0.9;
    }
 
    .db-add-btn-icon {
      width: 12px;
      height: 12px;
    }
 
    .db-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
 
    @media (min-width: 1024px) {
      .db-grid {
        grid-template-columns: 320px 1fr;
      }
    }
 
    .db-widget-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .db-widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
 
    .db-widget-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }
 
    .db-widget-subtitle {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    .db-usage-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
 
    .db-usage-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--vercel-text-secondary);
    }
 
    .db-usage-label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
 
    .db-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
 
    .db-status-dot.cyan { background-color: #06b6d4; }
    .db-status-dot.indigo { background-color: #6366f1; }
    .db-status-dot.purple { background-color: #a855f7; }
    .db-status-dot.emerald { background-color: #10b981; }
 
    .db-usage-value {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--vercel-text-primary);
      font-size: 11px;
    }
 
    .db-widget-footer {
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
 
    .db-upgrade-btn {
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-primary);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease;
    }
 
    .db-upgrade-btn:hover {
      background: var(--surface-hover);
    }
 
    .db-projects-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .db-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
 
    .db-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      letter-spacing: 0.5px;
      margin: 0;
    }
 
    .db-view-all-link {
      font-size: 12px;
      color: var(--vercel-text-secondary);
      text-decoration: none;
      transition: color 0.15s ease;
    }
 
    .db-view-all-link:hover {
      color: var(--vercel-text-primary);
    }
 
    .db-projects-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
 
    @media (min-width: 640px) {
      .db-projects-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    .db-project-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
 
    .db-project-card:hover {
      border-color: var(--vercel-text-muted);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
 
    .db-project-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
 
    .db-project-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
 
    .db-project-avatar {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #000;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
 
    html[data-theme="dark"] .db-project-avatar {
      background: #fff;
      color: #000;
    }
 
    .db-project-names {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
 
    .db-project-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
 
    .db-project-title:hover {
      text-decoration: underline;
    }
 
    .db-project-domain {
      font-size: 11px;
      color: var(--vercel-text-muted);
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
 
    .db-project-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #10b981;
      flex-shrink: 0;
    }
 
    .db-project-bottom {
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    .db-project-repo {
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
 
    .db-project-repo-icon {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
 
    .db-project-time {
      flex-shrink: 0;
    }

    /* ── Quick Launch Tools ─────────────────────────────────────── */
    .ql-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .ql-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ql-section-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ql-section-icon {
      width: 16px;
      height: 16px;
      color: #f59e0b;
    }

    .ql-section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }

    .ql-section-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.25);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .ql-browse-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--vercel-text-muted);
      text-decoration: none;
      transition: color 0.15s;
    }

    .ql-browse-link:hover {
      color: var(--vercel-text-primary);
    }

    .ql-browse-icon {
      width: 12px;
      height: 12px;
    }

    .ql-tools-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    @media (min-width: 768px) {
      .ql-tools-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1280px) {
      .ql-tools-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .ql-tool-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      overflow: hidden;
      text-decoration: none;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
      cursor: pointer;
    }

    .ql-tool-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      border-color: rgba(99, 102, 241, 0.4);
    }

    .ql-tool-accent {
      height: 3px;
      width: 100%;
    }

    .ql-tool-body {
      display: flex;
      gap: 14px;
      padding: 16px;
      flex: 1;
    }

    .ql-tool-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ql-tool-icon {
      width: 20px;
      height: 20px;
      color: #fff;
    }

    .ql-tool-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .ql-tool-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ql-tool-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--vercel-text-primary);
    }

    .ql-tool-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .ql-tool-badge.new {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }

    .ql-tool-badge.hot {
      background: rgba(249, 115, 22, 0.15);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.25);
    }

    .ql-tool-desc {
      font-size: 12px;
      line-height: 1.5;
      color: var(--vercel-text-muted);
      margin: 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .ql-tool-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .ql-tool-tag {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 500;
      color: var(--vercel-text-muted);
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 4px;
      padding: 2px 6px;
    }

    .ql-tag-icon {
      width: 10px;
      height: 10px;
    }

    .ql-tool-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
    }

    .ql-launch-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }

    .ql-launch-icon {
      width: 12px;
      height: 12px;
      color: #818cf8;
    }

    .ql-rating {
      font-size: 10px;
      color: var(--vercel-text-muted);
    }
  `],
})
export class WorkspaceDashboardComponent {
  readonly stateSvc = inject(WorkspaceStateService);

  readonly syncedCount = computed(() => this.stateSvc.repos().filter(r => r.syncStatus === 'Synced').length);
  readonly syncingCount = computed(() => this.stateSvc.repos().filter(r => r.syncStatus === 'Syncing').length);
  readonly analyzedCount = computed(() => this.stateSvc.repos().filter(r => r.toolStatus === 'Published').length);

  readonly projects = computed(() => {
    return this.stateSvc.repos().map(repo => ({
      id: repo.id,
      name: repo.name.split('/')[1] || repo.name,
      domain: `${repo.name.split('/')[1] || repo.name}.acklet.app`,
      repo: repo.name,
      lastSync: repo.lastSync
    }));
  });
}


