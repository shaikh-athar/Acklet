// packages/tool-shell/src/components/primitive/ts-related-tools.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolTileComponent } from './ts-tool-tile.component';

@Component({
  selector: 'ts-related-tools',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsToolTileComponent],
  template: `
    @if (tools() && tools()!.length > 0) {
      <div class="ts-related-card-root">
        <h4 class="ts-related-heading">Related tools</h4>
        <div class="ts-related-list">
          @for (tool of tools()!.slice(0, 3); track tool.slug) {
            <a [href]="getToolUrl(tool.slug)" class="ts-related-item">
              <ts-tool-tile [icon]="tool.icon" [name]="tool.name" [size]="28" />
              <div class="ts-related-info">
                <span class="ts-related-name">{{ tool.name }}</span>
                <span class="ts-related-desc">{{ tool.shortDescription }}</span>
              </div>
              <ts-icon name="arrow-up-right" [size]="14" class="ts-related-arrow" />
            </a>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .ts-related-card-root {
      background: var(--ts-surface);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-lg, 16px);
      padding: var(--ts-space-3, 12px) var(--ts-space-4, 16px);
      box-shadow: var(--ts-shadow-sm);
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-3, 12px);
    }

    .ts-related-heading {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ts-text-subtle);
      margin: 0;
    }

    .ts-related-list {
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-2, 8px);
    }

    .ts-related-item {
      display: flex;
      align-items: center;
      gap: var(--ts-space-2, 8px);
      padding: 6px;
      border-radius: var(--ts-radius-md, 12px);
      text-decoration: none;
      color: var(--ts-text);
      transition: background-color var(--ts-dur-base) var(--ts-ease);
    }

    .ts-related-item:hover {
      background: var(--ts-raised);
    }

    .ts-related-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .ts-related-name {
      font-size: var(--ts-text-xs, 12px);
      font-weight: 600;
      color: var(--ts-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ts-related-desc {
      font-size: 11px;
      color: var(--ts-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ts-related-arrow {
      color: var(--ts-text-subtle);
      opacity: 0;
      transition: opacity var(--ts-dur-base) var(--ts-ease),
                  transform var(--ts-dur-base) var(--ts-ease);
    }

    .ts-related-item:hover .ts-related-arrow {
      opacity: 1;
      transform: translate(2px, -2px);
      color: var(--ts-text);
    }
  `]
})
export class TsRelatedToolsComponent {
  readonly tools = input<ToolRegistryItem[] | undefined>([]);
  readonly getToolUrl = getToolUrl;
}
