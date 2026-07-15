// client/src/app/shared/components/category-card/category-card.ts
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category } from '../../../core/models/category.model';
import { IconComponent } from '../icon/icon';
import { SpotlightDirective } from '../../directives/spotlight.directive';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [RouterLink, IconComponent, SpotlightDirective],
  template: `
    <a [routerLink]="['/tools']" [queryParams]="{ category: category().slug }"
       class="cat-card-root shimmer-border" [style.--cat-color]="category().color" appSpotlight>
      <div class="cat-icon-box">
        <app-icon [name]="category().icon" class="cat-icon size-6" />
      </div>
      <div class="cat-info">
        <div class="cat-name">{{ category().name }}</div>
        <div class="cat-count">{{ category().toolCount }} tools</div>
      </div>
      <div class="cat-arrow">
        <app-icon name="arrow-right" class="size-3.5" />
      </div>
    </a>
  `,
  styles: [`
    .cat-card-root {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.125rem 1.25rem; border-radius: var(--radius-xl);
      text-decoration: none;
      background: var(--color-surface-900);
      border: 1px solid rgba(0,0,0,0.06);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative; overflow: hidden; cursor: pointer;
    }
    .cat-card-root::before {
      content: ''; position: absolute; inset: -1px;
      border-radius: inherit;
      background: radial-gradient(
        150px circle at var(--mouse-x, 0px) var(--mouse-y, 0px),
        color-mix(in srgb, var(--cat-color, #6366f1) 12%, transparent),
        transparent 80%
      );
      opacity: 0; transition: opacity 0.3s ease;
      z-index: 0;
      pointer-events: none;
    }
    .cat-card-root:hover {
      background: var(--color-surface-800);
      transform: translateY(-3px);
      box-shadow: var(--shadow-card-hover), var(--shadow-glow-brand);
      border-color: color-mix(in srgb, var(--cat-color, #6366f1) 20%, transparent);
    }
    .cat-card-root:hover::before { opacity: 1; }
    .cat-card-root:hover .cat-arrow { opacity: 1; transform: translateX(0); color: var(--cat-color, #818cf8); }

    .cat-icon-box {
      width: 42px; height: 42px; flex-shrink: 0;
      border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--cat-color, #6366f1) 8%, rgba(0,0,0,0.02));
      border: 1px solid color-mix(in srgb, var(--cat-color, #6366f1) 14%, rgba(0,0,0,0.04));
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .cat-card-root:hover .cat-icon-box {
      background: color-mix(in srgb, var(--cat-color, #6366f1) 14%, transparent);
      border-color: color-mix(in srgb, var(--cat-color, #6366f1) 30%, transparent);
      box-shadow: 0 0 14px color-mix(in srgb, var(--cat-color, #6366f1) 25%, transparent);
    }
    .cat-icon { color: var(--cat-color, #818cf8); transition: all 0.3s; }

    .cat-info { flex: 1; }
    .cat-name { font-size: 0.9rem; font-weight: 600; color: var(--color-neutral-100); }
    .cat-name:hover { 
      color: var(--cat-color, #000000); 
    }
    .cat-count { font-size: 0.72rem; color: var(--color-neutral-500); margin-top: 0.15rem; }

    .cat-arrow {
      color: var(--color-neutral-600);
      opacity: 0; transform: translateX(-4px);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `],
})
export class CategoryCardComponent {
  readonly category = input.required<Category>();
}
