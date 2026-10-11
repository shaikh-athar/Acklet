// packages/tool-shell/src/components/rail/ts-tool-related.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem, getAllTools } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { HlmItemImports } from '../../helm/item';
import { TsToolTileComponent } from '../primitive/ts-tool-tile.component';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-tool-related',
  standalone: true,
  imports: [CommonModule, HlmItemImports, TsToolTileComponent, TsIconComponent],
  template: `
    @if (relatedTools().length > 0) {
      <div id="related" class="ts-related-panel" role="region" aria-label="Related tools">
        <h3 class="ts-related-title">Related tools</h3>

        <div class="ts-related-items-list" role="list">
          @for (relTool of relatedTools(); track relTool.slug) {
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
    }

    .ts-related-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      border-radius: var(--ts-radius-tile, 14px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      user-select: none;
    }

    :host-context([data-theme="dark"]) .ts-related-panel {
      background: #18181B;
      border-color: var(--border, #27272A);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .ts-related-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: var(--ts-type-label-size, 13px);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, #71717A);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .ts-related-title {
      color: var(--text-muted, #A1A1AA);
    }

    .ts-related-items-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
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
      padding: 8px 10px;
      border-radius: var(--ts-radius-control, 12px);
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      cursor: pointer;
      transition: background-color 150ms ease,
                  border-color 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-related-hlm-item {
      background: #141416;
      border-color: var(--border, #27272A);
    }

    .ts-related-item-link:hover .ts-related-hlm-item {
      background: var(--surface-hover, #F4F4F5);
      border-color: rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="dark"]) .ts-related-item-link:hover .ts-related-hlm-item {
      background: #202024;
      border-color: #3F3F46;
    }

    .ts-related-name {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: var(--ts-type-label-size, 13.5px);
      font-weight: 600;
      color: var(--text, #18181B);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="dark"]) .ts-related-name {
      color: var(--text, #FCFCFC);
    }

    .ts-related-arrow {
      color: var(--text-muted, #71717A);
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
