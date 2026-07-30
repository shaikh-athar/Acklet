import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-tool-manage',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="tm-wrapper">
      <!-- Tool Header -->
      <div class="tm-header">
        <div class="tm-header-left">
          <div class="tm-avatar">
            AT
          </div>
          <div class="tm-details">
            <div class="tm-title-row">
              <h1 class="tm-title">Acklet CLI Developer Kit</h1>
              <span class="tm-badge-status">Published</span>
            </div>
            <p class="tm-repo-subtitle">
              <app-icon name="git-branch" class="tm-repo-icon" />
              <span>athar-taj/acklet-cli • main branch</span>
            </p>
          </div>
        </div>
 
        <div class="tm-header-actions">
          <button class="tm-btn tm-btn-secondary">
            Trigger Re-sync
          </button>
          <a routerLink="/tools/explore" class="tm-btn tm-btn-primary">
            View Live Tool Page →
          </a>
        </div>
      </div>
 
      <!-- Navigation Tabs (Vercel Style) -->
      <div class="tm-tabs">
        <button (click)="activeTab.set('overview')" [class.active-tab]="activeTab() === 'overview'" class="tab-btn">Overview</button>
        <button (click)="activeTab.set('docs')" [class.active-tab]="activeTab() === 'docs'" class="tab-btn">Documentation</button>
        <button (click)="activeTab.set('versions')" [class.active-tab]="activeTab() === 'versions'" class="tab-btn">Versions</button>
        <button (click)="activeTab.set('analytics')" [class.active-tab]="activeTab() === 'analytics'" class="tab-btn">Analytics</button>
        <button (click)="activeTab.set('reviews')" [class.active-tab]="activeTab() === 'reviews'" class="tab-btn">Reviews</button>
        <button (click)="activeTab.set('ai')" [class.active-tab]="activeTab() === 'ai'" class="tab-btn">AI & Prompts</button>
        <button (click)="activeTab.set('history')" [class.active-tab]="activeTab() === 'history'" class="tab-btn">Publication History</button>
        <button (click)="activeTab.set('settings')" [class.active-tab]="activeTab() === 'settings'" class="tab-btn">Settings</button>
      </div>
 
      <!-- Tab Contents -->
      <div [ngSwitch]="activeTab()" class="tm-content">
        <!-- OVERVIEW TAB -->
        <div *ngSwitchCase="'overview'" class="tm-tab-pane">
          <div class="tm-metrics-grid">
            <div class="tm-metric-card">
              <div class="tm-metric-label">Total Views</div>
              <div class="tm-metric-value">14,290</div>
            </div>
            <div class="tm-metric-card">
              <div class="tm-metric-label">Downloads</div>
              <div class="tm-metric-value">3,841</div>
            </div>
            <div class="tm-metric-card">
              <div class="tm-metric-label">Community Score</div>
              <div class="tm-metric-value cyan">4.95 / 5.0</div>
            </div>
            <div class="tm-metric-card">
              <div class="tm-metric-label">Trust Score</div>
              <div class="tm-metric-value emerald">99.8%</div>
            </div>
          </div>
 
          <div class="tm-details-card">
            <h3 class="tm-card-title">Tool Deployment & Sync Metadata</h3>
            <div class="tm-meta-grid">
              <div class="tm-meta-item">
                <span class="tm-meta-label">Package Endpoint:</span>
                <span class="tm-meta-val font-mono">npm i @acklet/cli</span>
              </div>
              <div class="tm-meta-item">
                <span class="tm-meta-label">Latest Release:</span>
                <span class="tm-meta-val font-mono">v2.4.1</span>
              </div>
              <div class="tm-meta-item">
                <span class="tm-meta-label">License:</span>
                <span class="tm-meta-val font-mono">MIT</span>
              </div>
              <div class="tm-meta-item">
                <span class="tm-meta-label">AI Doc Auto Sync:</span>
                <span class="tm-meta-val text-emerald">Enabled</span>
              </div>
            </div>
          </div>
        </div>
 
        <!-- DOCS TAB -->
        <div *ngSwitchCase="'docs'" class="tm-details-card">
          <div class="tm-card-header-row">
            <h3 class="tm-card-title">AI-Generated Documentation</h3>
            <button class="tm-btn tm-btn-sm tm-btn-secondary">Regenerate Docs</button>
          </div>
          <div class="tm-code-block">
            # Acklet CLI Developer Kit<br/>
            Automated code generation and developer tool setup for modern web frameworks.<br/><br/>
            ## Installation<br/>
            npm install -g @acklet/cli<br/><br/>
            ## Usage<br/>
            acklet init --repo my-org/my-tool
          </div>
        </div>
 
        <!-- VERSIONS TAB -->
        <div *ngSwitchCase="'versions'" class="tm-details-card">
          <h3 class="tm-card-title">Release Version Timeline</h3>
          <div class="tm-timeline">
            <div class="tm-timeline-item">
              <div class="tm-timeline-info">
                <span class="tm-timeline-version">v2.4.1</span>
                <span class="tm-timeline-desc">Fix OpenAPI spec generator & CLI args</span>
              </div>
              <span class="tm-timeline-date">2 days ago</span>
            </div>
            <div class="tm-timeline-item">
              <div class="tm-timeline-info">
                <span class="tm-timeline-version">v2.4.0</span>
                <span class="tm-timeline-desc">Add FastAPI metadata extraction hooks</span>
              </div>
              <span class="tm-timeline-date">1 week ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tm-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
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
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: linear-gradient(135deg, #06b6d4, #6366f1);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
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
    }
 
    .tm-title {
      font-size: 18px;
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
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.2);
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
 
    .tm-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
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
      border: none;
    }
 
    .tm-btn-primary:hover {
      opacity: 0.9;
    }
 
    .tm-btn-secondary {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-primary);
    }
 
    .tm-btn-secondary:hover {
      background: var(--surface-hover);
      border-color: var(--vercel-text-muted);
    }
 
    .tm-btn-sm {
      font-size: 11px;
      padding: 6px 10px;
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
      color: var(--vercel-text-muted);
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
      border-bottom-color: var(--vercel-text-primary);
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
      grid-template-columns: repeat(1, 1fr);
      gap: 16px;
    }
 
    @media (min-width: 640px) {
      .tm-metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    @media (min-width: 1024px) {
      .tm-metrics-grid {
        grid-template-columns: repeat(4, 1fr);
      }
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
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
    }
 
    .tm-metric-value.cyan { color: #06b6d4; }
    .tm-metric-value.emerald { color: #10b981; }
 
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
 
    .tm-meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
 
    @media (min-width: 640px) {
      .tm-meta-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    .tm-meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
 
    .tm-meta-label {
      color: var(--vercel-text-secondary);
    }
 
    .tm-meta-val {
      color: var(--vercel-text-primary);
      font-weight: 500;
    }
 
    .tm-meta-val.text-emerald {
      color: #10b981;
      font-weight: 600;
    }
 
    .tm-card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
 
    .tm-code-block {
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--vercel-text-secondary);
      line-height: 1.6;
    }
 
    .tm-timeline {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
 
    .tm-timeline-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      font-size: 13px;
    }
 
    .tm-timeline-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
 
    .tm-timeline-version {
      font-weight: 700;
      color: var(--vercel-text-primary);
    }
 
    .tm-timeline-desc {
      color: var(--vercel-text-secondary);
    }
 
    .tm-timeline-date {
      color: var(--vercel-text-muted);
      font-size: 11px;
    }
 
    .font-mono {
      font-family: var(--font-mono);
    }
 
    .text-emerald {
      color: #10b981;
    }
  `],
})
export class ToolManageComponent {
  readonly activeTab = signal<'overview' | 'docs' | 'versions' | 'analytics' | 'reviews' | 'ai' | 'history' | 'settings'>('overview');
}
