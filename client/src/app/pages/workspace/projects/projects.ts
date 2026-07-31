import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/components/icon/icon';
import { WorkspaceStateService, RepositoryItem } from '../../../core/services/workspace-state.service';

@Component({
  selector: 'app-workspace-projects',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="pr-wrapper">
      <!-- Header -->
      <div class="pr-header">
        <div class="pr-title-wrap">
          <h1 class="pr-title">Projects</h1>
          <p class="pr-subtitle">Repositories connected to Acklet for tool generation and deployment.</p>
        </div>
        <a routerLink="/workspace/projects/import" class="pr-add-btn">
          <app-icon name="plus" class="pr-add-btn-icon" />
          <span>Add New Project</span>
        </a>
      </div>
 
      <!-- Controls -->
      <div class="pr-controls">
        <div class="pr-search-box">
          <app-icon name="search" class="pr-search-icon" />
          <input type="text" placeholder="Filter projects..." (input)="onSearch($event)" class="pr-search-input" />
        </div>
      </div>
 
      <!-- Projects Grid -->
      <div class="pr-grid">
        @for (project of filteredProjects(); track project.id) {
          <div class="pr-card">
            <div class="pr-card-top">
              <div class="pr-card-header">
                <a [routerLink]="['/workspace/tools/manage', project.id]" class="pr-card-title">
                  <app-icon name="folder-git-2" class="pr-folder-icon" />
                  <span>{{ project.name.split('/')[1] || project.name }}</span>
                </a>
                <span class="pr-status-badge"
                  [ngClass]="{
                    'active': project.syncStatus === 'Synced',
                    'syncing': project.syncStatus === 'Syncing',
                    'error': project.syncStatus === 'Failed'
                  }">
                  {{ project.syncStatus }}
                </span>
              </div>
              <div class="pr-card-repo">
                <app-icon name="git-branch" class="pr-repo-icon" />
                <span>{{ project.name }}</span>
              </div>
              @if (project.description) {
                <div class="pr-description">{{ project.description }}</div>
              }
            </div>

            <div class="pr-card-bottom">
              <div class="pr-tech-info">
                <span class="pr-framework-tag">
                  {{ project.framework || 'Detected' }}
                </span>
                @if (project.language && project.language !== 'Unknown') {
                  <span class="pr-lang-text">{{ project.language }}</span>
                }
              </div>
              <a [routerLink]="['/workspace/projects/publish', project.id]"
                 class="pr-publish-btn">
                <app-icon name="rocket" class="pr-publish-icon" />
                <span>Publish</span>
              </a>
            </div>
          </div>

        } @empty {
          <div class="pr-empty">
            <app-icon name="folder-x" class="pr-empty-icon" />
            <h3>No connected projects found</h3>
            <p>Import a GitHub repository to get started with Acklet tool generation.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .pr-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .pr-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .pr-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
 
    .pr-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
      margin: 0;
    }
 
    .pr-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin-top: 4px;
    }
 
    .pr-add-btn {
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
 
    .pr-add-btn:hover {
      opacity: 0.9;
    }
 
    .pr-add-btn-icon {
      width: 14px;
      height: 14px;
    }
 
    .pr-controls {
      display: flex;
      align-items: center;
    }
 
    .pr-search-box {
      position: relative;
      flex: 1;
      max-width: 360px;
    }
 
    .pr-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }
 
    .pr-search-input {
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
 
    .pr-search-input:focus {
      border-color: var(--vercel-text-muted);
    }
 
    .pr-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
 
    @media (min-width: 640px) {
      .pr-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
 
    @media (min-width: 1024px) {
      .pr-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
 
    .pr-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
 
    .pr-card:hover {
      transform: translateY(-2px);
      border-color: var(--vercel-border-active);
    }
 
    .pr-card-top {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
 
    .pr-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
 
    .pr-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      text-decoration: none;
    }
 
    .pr-card-title:hover {
      color: #06b6d4;
    }
 
    .pr-folder-icon {
      width: 16px;
      height: 16px;
      color: var(--vercel-text-secondary);
    }
 
    .pr-status-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 99px;
      text-transform: capitalize;
    }
 
    .pr-status-badge.active {
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
    }
 
    .pr-status-badge.syncing {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
    }
 
    .pr-status-badge.error {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
 
    .pr-card-repo {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--vercel-text-secondary);
    }
 
    .pr-repo-icon {
      width: 14px;
      height: 14px;
      color: var(--vercel-text-muted);
    }
 
    .pr-card-bottom {
      border-top: 1px solid var(--vercel-border-subtle);
      padding-top: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
 
    .pr-tech-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
 
    .pr-framework-tag {
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      font-size: 10px;
      font-weight: 600;
      color: var(--vercel-text-secondary);
      font-family: var(--font-mono);
    }
 
    .pr-lang-text {
      font-size: 10px;
      color: var(--vercel-text-muted);
    }

    .pr-time-text {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }

    .pr-description {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin-top: 8px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .pr-publish-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 6px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pr-publish-btn:hover {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px #6366f140;
    }
    .pr-publish-icon {
      width: 11px;
      height: 11px;
    }

    .pr-empty {
      grid-column: 1 / -1;
      padding: 60px 24px;
      text-align: center;
      color: var(--vercel-text-muted);
    }

    .pr-empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      display: block;
      opacity: 0.4;
    }

    .pr-empty h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0 0 8px;
    }
  `],
})
export class WorkspaceProjectsComponent {
  private readonly stateSvc = inject(WorkspaceStateService);
  readonly searchQuery = signal('');
 
  readonly filteredProjects = computed(() => {
    const list = this.stateSvc.repos();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter((p: RepositoryItem) => 
      p.name.toLowerCase().includes(query) || 
      p.language.toLowerCase().includes(query) ||
      p.framework.toLowerCase().includes(query)
    );
  });
 
  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }
}
