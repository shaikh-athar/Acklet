import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getAllTools } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { HlmItemImports } from '../../helm/item';
import { TsToolTileComponent } from '../primitive/ts-tool-tile.component';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-tool-related',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HlmItemImports, TsToolTileComponent, TsIconComponent],
  template: `
    @if (relatedTools().length > 0) {
      <div id="related" class="ts-related-panel" role="region" aria-label="Related tools">
        <h3 class="ts-related-title">Related tools</h3>

        <div class="ts-related-items-list" role="list">
          @for (relTool of relatedTools(); track relTool.slug; let idx = $index) {
            <a 
              [href]="getToolSubdomainUrl(relTool.slug)" 
              class="ts-related-item-link"
              role="listitem"
              [attr.aria-label]="relTool.name"
            >
              <hlm-item variant="outline" class="ts-related-hlm-item">
                <hlm-item-media>
                  <ts-tool-tile [icon]="relTool.icon" [name]="relTool.name" [size]="32" />
                </hlm-item-media>
                <hlm-item-content>
                  <span class="ts-related-name">{{ relTool.name }}</span>
                </hlm-item-content>
                <hlm-item-actions>
                  <ts-icon name="arrow-up-right" [size]="14" class="ts-related-arrow" />
                </hlm-item-actions>
              </hlm-item>
            </a>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 0;
      flex: 1 1 0;
    }

    @media (max-height: 759px) {
      :host {
        display: none !important;
      }
    }

    .ts-related-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 20px;
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: var(--ts-surface-raised-shadow);
      user-select: none;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
    }

    .ts-related-title {
      font-family: var(--font-heading, "Scoutie Sans", sans-serif);
      font-size: var(--ts-type-section-label-size, 12px);
      line-height: var(--ts-type-section-label-lh, 16px);
      font-weight: var(--ts-type-section-label-weight, 600);
      text-transform: uppercase;
      letter-spacing: var(--ts-type-section-label-tracking, 0.08em);
      color: var(--text-3, #6B7280);
      margin: 0;
      flex-shrink: 0;
    }

    .ts-related-items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      flex: 1 1 0;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      max-height: calc(3 * 54px + 12px);
    }

    .ts-related-item-link {
      display: block;
      text-decoration: none;
      color: inherit;
      outline: none;
      border-radius: var(--ts-radius-control, 12px);
      transition: transform 120ms ease;
    }

    .ts-related-item-link:active {
      transform: scale(0.98);
    }

    .ts-related-item-link:focus-visible {
      outline: 2px solid var(--accent-strong) !important;
      outline-offset: 2px;
    }

    .ts-related-hlm-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--ts-radius-control, 12px);
      background: var(--ts-surface-inset, #F6F7F7);
      border: 1px solid var(--ts-surface-inset-border, rgba(15, 23, 42, 0.05));
      cursor: pointer;
      transition: background-color 150ms ease,
                  border-color 150ms ease;
    }

    .ts-related-item-link:hover .ts-related-hlm-item {
      background: var(--surface-hover);
      border-color: var(--ts-surface-raised-border);
    }

    .ts-related-name {
      font-family: var(--font-body, "Scoutie Sans", sans-serif);
      font-size: var(--ts-type-label-size, 13px);
      line-height: var(--ts-type-label-lh, 18px);
      font-weight: 600;
      color: var(--text, #09090B);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ts-related-arrow {
      color: var(--text-3, #6B7280);
      transition: transform 150ms ease, color 150ms ease;
    }

    .ts-related-item-link:hover .ts-related-arrow {
      color: var(--accent-strong);
      transform: translate(1px, -1px);
    }
  `]
})
export class TsToolRelatedComponent {
  readonly tool = input<ToolRegistryItem | null>(null);

  readonly relatedTools = computed<ToolRegistryItem[]>(() => {
    const current = this.tool();
    if (!current) return [];

    const all = getAllTools().filter(t => t.slug !== current.slug);

    if (current.related && current.related.length > 0) {
      const explicit = current.related
        .map(slug => all.find(t => t.slug === slug))
        .filter((t): t is ToolRegistryItem => !!t);
      if (explicit.length >= 3) return explicit.slice(0, 3);
    }

    const sameCat = all.filter(t => t.category.toLowerCase() === current.category.toLowerCase());
    const otherCat = all.filter(t => t.category.toLowerCase() !== current.category.toLowerCase());

    return [...sameCat, ...otherCat].slice(0, 3);
  });

  getToolSubdomainUrl(slug: string): string {
    return getToolUrl(slug);
  }
}
