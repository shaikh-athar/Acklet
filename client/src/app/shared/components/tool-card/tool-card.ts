// client/src/app/shared/components/tool-card/tool-card.ts
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tool } from '../../../core/models/tool.model';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-tool-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <a [routerLink]="['/tools', tool().slug]" class="tool-card-root">
      <!-- Top badges -->
      <div class="card-badges">
        @if (tool().isNew) { <span class="badge badge-accent">New</span> }
        @if (tool().isTrending) { <span class="badge badge-brand">Trending</span> }
        @if (tool().isFeatured) { <span class="badge badge-warning">Featured</span> }
      </div>

      <!-- Icon -->
      <div class="card-icon-wrap">
        <app-icon [name]="tool().icon" class="card-icon size-5" />
      </div>

      <!-- Content -->
      <div class="card-content">
        <div class="card-category">{{ tool().categoryName }}</div>
        <h3 class="card-title">{{ tool().name }}</h3>
        <p class="card-desc">{{ tool().shortDescription }}</p>
      </div>

      <!-- Hover arrow -->
      <div class="card-arrow">
        <app-icon name="arrow-up-right" class="size-4" />
      </div>
    </a>
  `,
  styles: [`
    .tool-card-root {
      display: flex; flex-direction: column; gap: 0.875rem;
      padding: 1.5rem; border-radius: var(--radius-xl); text-decoration: none;
      background: var(--color-surface-900);
      border: 1px solid rgba(0, 0, 0, 0.05);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative; overflow: hidden; cursor: pointer;
    }
    
    .tool-card-root:hover {
      background: var(--color-surface-800);
      border-color: rgba(0, 0, 0, 0.12);
      transform: translateY(-4px) scale(1.1) translateX(1px);
      box-shadow: var(--shadow-card-hover);
      z-index: 1;
    }
    .tool-card-root:hover .card-arrow { opacity: 1; transform: translate(0,0); }

    .card-badges { display: flex; gap: 0.375rem; flex-wrap: wrap; min-height: 20px; }
    
    .card-icon-wrap {
      width: 44px; height: 44px; border-radius: var(--radius-lg);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid rgba(0, 0, 0, 0.05);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tool-card-root:hover .card-icon-wrap {
      background: rgba(0, 0, 0, 0.04) !important;
      border-color: rgba(0, 0, 0, 0.08) !important;
    }
    .card-icon {
      color: var(--color-neutral-400);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tool-card-root:hover .card-icon {
      color: var(--color-violet-600);
    }

    .card-content { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
    .card-category { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-neutral-500); transition: color 0.3s; }
    .card-title { font-size: 1rem; font-weight: 600; color: var(--color-neutral-100); line-height: 1.35; }
    .card-desc { font-size: 0.8rem; color: var(--color-neutral-400); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

    .card-arrow {
      position: absolute; top: 1.25rem; right: 1.25rem;
      width: 26px; height: 26px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.06);
      color: var(--color-neutral-400);
      opacity: 0; transform: translate(4px, -4px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tool-card-root:hover .card-arrow {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.1);
      color: var(--color-accent-500);
    }
  `],
})
export class ToolCardComponent {
  readonly tool = input.required<Tool>();

  formatCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
    return n.toString();
  }
}
