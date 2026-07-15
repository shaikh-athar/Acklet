// client/src/app/pages/workspace/favorites/favorites.ts
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon';
import { SpotlightDirective } from '../../../shared/directives/spotlight.directive';
import { ToolsService } from '../../../core/services/tools.service';
import { Tool } from '../../../core/models/tool.model';

@Component({
  selector: 'app-workspace-favorites',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, SpotlightDirective],
  template: `
    <div class="favorites-root page-enter">
      <header class="mb-8">
        <h1 class="page-title">Favorite Tools</h1>
        <p class="page-subtitle">Your pinned tools for quick access. Launch or unpin tools instantly.</p>
      </header>

      <div class="favorites-grid">
        @for (tool of favorites(); track tool.id) {
          <div class="fav-card card-spotlight" appSpotlight [style.--tool-color]="tool.color">
            <div class="fav-icon-wrap" [style.background-color]="tool.color + '15'">
              <app-icon [name]="tool.icon" class="size-5" [style.color]="tool.color" />
            </div>
            <div class="fav-meta">
              <h3 class="fav-name">{{ tool.name }}</h3>
              <p class="fav-desc">{{ tool.shortDescription }}</p>
            </div>
            <div class="fav-actions mt-4">
              <a [routerLink]="['/tools', tool.slug]" class="btn btn-secondary btn-sm">Launch Tool</a>
              <button class="icon-btn btn-unpin" (click)="unpin(tool)" aria-label="Unpin tool">
                <app-icon name="star" class="size-4 text-warning-500 fill-warning-500" />
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-state glass p-8 text-center">
            <app-icon name="star" class="size-8 text-neutral-500 mb-2" />
            <h3 class="empty-title">No favorites yet</h3>
            <p class="empty-desc mb-4">Go to the solutions page and pin your most used tools.</p>
            <a routerLink="/tools" class="btn btn-primary">Browse Solutions</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .favorites-root { min-height: 100vh; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--color-neutral-100); }
    .page-subtitle { font-size: 0.9rem; color: var(--color-neutral-400); margin-top: 0.25rem; }

    .favorites-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
    .fav-card { padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); display: flex; flex-direction: column; }
    .fav-icon-wrap { width: 42px; height: 42px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
    .fav-name { font-size: 1rem; font-weight: 700; color: var(--color-neutral-100); }
    .fav-desc { font-size: 0.8rem; color: var(--color-neutral-400); margin-top: 0.25rem; line-height: 1.5; flex: 1; }
    
    .fav-actions { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-soft); padding-top: 1rem; }
    .btn-unpin { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; }
    .btn-unpin:hover { background: var(--surface-hover); }

    .empty-state { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); max-width: 400px; margin: 0 auto; }
    .empty-title { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }
    .empty-desc { font-size: 0.85rem; color: var(--color-neutral-500); }
    
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-4 { margin-top: 1rem; }
    .text-center { text-align: center; }

    @media (max-width: 900px) {
      .favorites-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 600px) {
      .favorites-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class WorkspaceFavoritesComponent {
  private readonly toolsSvc = inject(ToolsService);
  
  readonly favorites = signal<Tool[]>(this.toolsSvc.tools().slice(0, 4));

  unpin(t: Tool): void {
    this.favorites.update(list => list.filter(item => item.id !== t.id));
  }
}
