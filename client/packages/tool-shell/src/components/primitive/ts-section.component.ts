// packages/tool-shell/src/components/primitive/ts-section.component.ts
import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-section',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <section class="ts-section-root">
      <header class="ts-section-header">
        <button 
          type="button" 
          class="ts-section-toggle-btn"
          (click)="toggleCollapse()"
          [attr.aria-expanded]="!isCollapsed()"
        >
          <span class="ts-section-title">{{ title() }}</span>
          <span class="ts-section-chevron" [class.is-rotated]="isCollapsed()">
            <ts-icon name="chevron-right" [size]="14" />
          </span>
        </button>

        @if (seeAllAction()) {
          <button type="button" class="ts-section-see-all" (click)="seeAll.emit()">
            See all
          </button>
        }
      </header>

      @if (!isCollapsed()) {
        <div class="ts-section-content ts-animate-fade-in">
          <ng-content />
        </div>
      }
    </section>
  `,
  styles: [`
    .ts-section-root {
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-3, 12px);
      width: 100%;
    }
    .ts-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      user-select: none;
    }
    .ts-section-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      padding: 4px 0;
      color: var(--ts-text);
      cursor: pointer;
      border-radius: var(--ts-radius-sm, 8px);
      outline: none;
      transition: color var(--ts-dur-base) var(--ts-ease);
    }
    .ts-section-toggle-btn:hover {
      color: var(--ts-text-muted);
    }
    .ts-section-toggle-btn:focus-visible {
      outline: 2px solid var(--ts-focus-ring);
      outline-offset: 2px;
    }
    .ts-section-title {
      font-size: var(--ts-text-md, 16px);
      font-weight: 600;
      letter-spacing: var(--ts-tracking-tight);
      color: var(--ts-text);
    }
    .ts-section-chevron {
      display: inline-flex;
      align-items: center;
      color: var(--ts-text-subtle);
      transition: transform var(--ts-dur-base) var(--ts-ease);
    }
    .ts-section-chevron.is-rotated {
      transform: rotate(90deg);
    }
    .ts-section-see-all {
      background: transparent;
      border: none;
      font-size: var(--ts-text-xs, 12px);
      font-weight: 500;
      color: var(--ts-text-muted);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--ts-radius-sm, 8px);
      transition: var(--ts-transition-colors);
    }
    .ts-section-see-all:hover {
      color: var(--ts-text);
      background: var(--ts-raised);
    }
    .ts-section-content {
      width: 100%;
    }
  `]
})
export class TsSectionComponent {
  readonly title = input.required<string>();
  readonly seeAllAction = input<boolean>(false);
  readonly seeAll = output<void>();

  readonly isCollapsed = signal<boolean>(false);

  toggleCollapse(): void {
    this.isCollapsed.update(v => !v);
  }
}
