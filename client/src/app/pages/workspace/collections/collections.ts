// client/src/app/pages/workspace/collections/collections.ts
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';

interface CollectionFolder {
  id: string;
  name: string;
  description: string;
  toolCount: number;
  color: string;
}

@Component({
  selector: 'app-workspace-collections',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="collections-root page-enter">
      <header class="header-row mb-8">
        <div>
          <h1 class="page-title">Custom Collections</h1>
          <p class="page-subtitle">Group tools into custom folders for project workspaces or teams.</p>
        </div>
        <button class="btn btn-primary btn-sm" (click)="createFolder()">New Collection</button>
      </header>

      <div class="collections-grid">
        @for (folder of folders(); track folder.id) {
          <div class="folder-card" [style.--tool-color]="folder.color">
            <div class="folder-header mb-4">
              <div class="folder-icon-wrap" [style.background-color]="folder.color + '15'">
                <app-icon name="folder" class="size-6" [style.color]="folder.color" />
              </div>
              <button class="icon-btn btn-delete" (click)="deleteFolder(folder)" aria-label="Delete folder">
                <app-icon name="trash" class="size-4 text-neutral-500" />
              </button>
            </div>

            <div class="folder-body flex-1">
              <h3 class="folder-name">{{ folder.name }}</h3>
              <p class="folder-desc">{{ folder.description }}</p>
            </div>

            <div class="folder-footer mt-6">
              <span class="tool-count">{{ folder.toolCount }} solutions inside</span>
              <a routerLink="/tools" class="link-open">
                <app-icon name="external-link" class="size-4" />
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .collections-root { min-height: 100vh; }
    .header-row { display: flex; align-items: center; justify-content: space-between; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .collections-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .folder-card { padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); display: flex; flex-direction: column; }
    .folder-header { display: flex; align-items: center; justify-content: space-between; }
    .folder-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; }
    
    .folder-name { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }
    .folder-desc { font-size: 0.8rem; color: var(--color-neutral-400); margin-top: 0.25rem; line-height: 1.55; }
    
    .folder-footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-soft); padding-top: 1rem; font-size: 0.75rem; color: var(--color-neutral-500); }
    .link-open { color: var(--color-brand-500); text-decoration: none; transition: color 0.2s; }
    .link-open:hover { color: var(--color-brand-600); }

    .btn-delete { background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; }
    .btn-delete:hover { background: var(--surface-hover); }
    .btn-delete:hover app-icon { color: var(--color-feedback-error) !important; }

    .mb-4 { margin-bottom: 1rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-6 { margin-top: 1.5rem; }

    @media (max-width: 900px) {
      .collections-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .collections-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WorkspaceCollectionsComponent {
  readonly folders = signal<CollectionFolder[]>([
    { id: '1', name: 'Identity & JWT', description: 'Tools relating to authorization payload checks and signature matching.', toolCount: 3, color: '#6366f1' },
    { id: '2', name: 'JSON & SQL tools', description: 'Beautifiers and encoders used daily for parsing server parameters.', toolCount: 2, color: '#06b6d4' }
  ]);

  createFolder(): void {
    const name = prompt('Enter collection name:');
    if (name) {
      this.folders.update(list => [...list, {
        id: (list.length + 1).toString(),
        name,
        description: 'Custom created developer collection folder.',
        toolCount: 0,
        color: '#f59e0b'
      }]);
    }
  }

  deleteFolder(folder: CollectionFolder): void {
    if (confirm(`Are you sure you want to delete "${folder.name}"?`)) {
      this.folders.update(list => list.filter(f => f.id !== folder.id));
    }
  }
}
