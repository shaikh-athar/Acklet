// src/app/shared/components/loading-skeleton/loading-skeleton.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    <div class="skeleton-grid" [style.--cols]="cols()">
      @for (item of items; track $index) {
        <div class="skeleton-card">
          <div class="skeleton-badge skeleton"></div>
          <div class="skeleton-icon skeleton"></div>
          <div class="skeleton-line skeleton" style="width:40%;height:10px"></div>
          <div class="skeleton-line skeleton" style="width:75%"></div>
          <div class="skeleton-line skeleton" style="width:90%;height:10px"></div>
          <div class="skeleton-line skeleton" style="width:85%;height:10px"></div>
          <div class="skeleton-tags">
            <div class="skeleton-tag skeleton"></div>
            <div class="skeleton-tag skeleton"></div>
          </div>
          <div class="skeleton-footer">
            <div class="skeleton skeleton" style="width:60px;height:12px;border-radius:6px"></div>
            <div class="skeleton skeleton" style="width:40px;height:12px;border-radius:6px"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-grid { display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr); gap: 1.25rem; }
    .skeleton-card { display: flex; flex-direction: column; gap: 0.875rem; padding: 1.25rem; border-radius: 1rem; background: var(--color-surface-800); border: 1px solid rgba(255,255,255,0.04); }
    .skeleton-badge { width: 50px; height: 20px; border-radius: 999px; }
    .skeleton-icon { width: 48px; height: 48px; border-radius: 12px; }
    .skeleton-line { height: 14px; border-radius: 6px; }
    .skeleton-tags { display: flex; gap: 0.375rem; }
    .skeleton-tag { width: 48px; height: 18px; border-radius: 999px; }
    .skeleton-footer { display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.04); }
    @media (max-width: 768px) { .skeleton-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 480px) { .skeleton-grid { grid-template-columns: 1fr; } }
  `],
})
export class LoadingSkeletonComponent {
  readonly count = input<number>(6);
  readonly cols = input<number>(3);
  get items() { return Array(this.count()); }
}
