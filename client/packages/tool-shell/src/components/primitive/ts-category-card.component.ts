// packages/tool-shell/src/components/primitive/ts-category-card.component.ts
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getThemeForCategory, CategoryThemeConfig } from '../../config/tool-themes.config';
import { TsSpotlightDirective } from '../../directives/ts-spotlight.directive';
import { TsRevealDirective } from '../../directives/ts-reveal.directive';

@Component({
  selector: 'ts-category-card',
  standalone: true,
  imports: [CommonModule, TsSpotlightDirective, TsRevealDirective],
  template: `
    <div 
      class="ts-category-card-root"
      tsSpotlight
      tsReveal
      [revealIndex]="revealIndex()"
      (click)="categoryClick.emit(category())"
      [attr.title]="category() + ' — ' + config().description"
    >
      <!-- Top Right: Stack of overlapping circular color swatches (~28px circles overlapped ~10px) -->
      <div class="ts-swatches-stack">
        @for (color of config().palette; track color; let i = $index) {
          <div 
            class="ts-swatch-circle" 
            [style.background-color]="color"
            [style.z-index]="i + 1"
          ></div>
        }
      </div>

      <!-- Bottom Left: Category Name in uppercase Lora -->
      <div class="ts-category-info">
        <h3 class="ts-category-title">{{ category() }}</h3>
        <p class="ts-category-count">{{ count() }} {{ count() === 1 ? 'tool' : 'tools' }}</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .ts-category-card-root {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      min-height: 160px;
      padding: 24px;
      border-radius: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      user-select: none;
    }

    /* Stack of overlapping circular color swatches (~28px circles overlapped ~10px) */
    .ts-swatches-stack {
      display: flex;
      align-self: flex-end;
      position: relative;
      padding-right: 4px;
    }

    .ts-swatch-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid var(--border);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      margin-left: -10px;
      transition: transform var(--ts-dur-hover, 220ms) var(--ts-ease-out);
    }

    .ts-swatch-circle:first-child {
      margin-left: 0;
    }

    .ts-category-card-root:hover .ts-swatch-circle {
      transform: scale(1.08);
    }

    /* Category Info */
    .ts-category-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .ts-category-title {
      font-family: var(--ts-font-heading, "DM Sans", sans-serif);
      font-size: 17px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text);
      margin: 0;
    }

    .ts-category-count {
      font-family: var(--ts-font-sans);
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }
  `]
})
export class TsCategoryCardComponent {
  readonly category = input.required<string>();
  readonly count = input<number>(0);
  readonly revealIndex = input<number>(0);
  readonly categoryClick = output<string>();

  readonly config = computed<CategoryThemeConfig>(() => getThemeForCategory(this.category()));
}
