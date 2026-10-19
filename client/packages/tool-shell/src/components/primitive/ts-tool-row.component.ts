// packages/tool-shell/src/components/primitive/ts-tool-row.component.ts
import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsToolTileComponent } from './ts-tool-tile.component';

@Component({
  selector: 'ts-tool-row',
  standalone: true,
  imports: [CommonModule, TsIconComponent, TsToolTileComponent],
  template: `
    @if (isComingSoon()) {
      <div 
        class="ts-card-root is-disabled" 
        [attr.aria-disabled]="true"
      >
        <div class="ts-media-box">
          <ts-tool-tile [icon]="tool().icon" [name]="tool().name" [category]="tool().category" [size]="44" />
        </div>

        <div class="ts-card-info">
          <div class="ts-card-title-line">
            <span class="ts-card-name">{{ tool().name }}</span>
            <span class="ts-badge ts-badge-soon">Soon</span>
          </div>
          @if (tool().shortDescription) {
            <p class="ts-card-desc">{{ tool().shortDescription }}</p>
          }
        </div>
      </div>
    } @else {
      <a 
        #cardLink
        [href]="toolUrl()" 
        class="ts-card-root"
        [attr.data-tool-slug]="tool().slug"
        [class.is-maintenance]="tool().status === 'maintenance'"
        (click)="onRowClick($event, cardLink)"
      >
        <div class="ts-media-box">
          <ts-tool-tile [icon]="tool().icon" [name]="tool().name" [category]="tool().category" [size]="44" />
        </div>

        <div class="ts-card-info">
          <div class="ts-card-title-line">
            <span class="ts-card-name">{{ tool().name }}</span>
          </div>
          @if (tool().shortDescription) {
            <p class="ts-card-desc">{{ tool().shortDescription }}</p>
          }
        </div>

        <div class="ts-card-action">
          <button 
            type="button" 
            class="ts-action-btn-circle" 
            aria-label="Open tool"
            tabindex="-1"
            (click)="onPlusClick($event)"
          >
            <ts-icon name="plus" [size]="16" />
          </button>
        </div>
      </a>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .ts-card-root {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      min-height: 56px;
      border-radius: 16px;
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, #E4E4E7);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      text-decoration: none;
      color: inherit;
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  box-shadow var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform 80ms cubic-bezier(0.32, 0.72, 0, 1);
      user-select: none;
      outline: none;
      position: relative;
      min-width: 0;
    }
    [data-theme="dark"] .ts-card-root {
      background: #141416;
      border-color: #27272A;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }
    @media (hover: hover) and (pointer: fine) {
      .ts-card-root:hover {
        background: var(--surface-hover, #F8F8FA);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        transform: translateY(-1px);
      }
      [data-theme="dark"] .ts-card-root:hover {
        background: #1C1C20;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
      }
    }
    .ts-card-root:active {
      transform: scale(0.98);
    }
    .ts-card-root:focus-visible {
      outline: 2px solid var(--ts-focus-ring);
      outline-offset: 2px;
    }
    .ts-card-root.is-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
      box-shadow: none;
    }
    .ts-media-box {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ts-card-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
      overflow: hidden;
    }
    .ts-card-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .ts-card-name {
      font-family: var(--ts-font-heading, "DM Sans", sans-serif);
      font-size: 15.5px;
      font-weight: 600;
      color: var(--text, #18181B);
      letter-spacing: var(--ts-tracking-tight);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
      min-width: 0;
    }
    .ts-card-desc {
      font-family: var(--ts-font-sans);
      font-size: 13px;
      color: var(--text-muted, #71717A);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
      word-break: break-word;
      margin: 0;
    }

    /* Badges with subtle colors (tasteful, not funky) */
    .ts-badge {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1.5px 8px;
      border-radius: var(--ts-radius-full);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, #E4E4E7);
      color: var(--text-muted);
    }
    .ts-badge[data-badge="updated"],
    .ts-badge[data-badge="new"],
    .ts-badge[data-badge="popular"],
    .ts-badge[data-badge="hot"],
    .ts-badge[data-badge="beta"],
    .ts-badge-soon {
      background: var(--surface-hover);
      color: var(--text-muted);
      border-color: var(--border);
    }

    .ts-card-action {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ts-action-btn-circle {
      width: 32px;
      height: 32px;
      border-radius: var(--ts-radius-full, 9999px);
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, #E4E4E7);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted, #71717A);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    .ts-card-root:hover .ts-action-btn-circle {
      color: var(--text, #18181B);
      background: var(--surface, #FFFFFF);
      transform: scale(1.06);
    }
    [data-theme="dark"] .ts-action-btn-circle {
      background: #18181B;
      border-color: #27272A;
      color: #A1A1AA;
    }
    [data-theme="dark"] .ts-card-root:hover .ts-action-btn-circle {
      color: #FFFFFF;
      background: #27272A;
    }
  `]
})
export class TsToolRowComponent {
  readonly tool = input.required<ToolRegistryItem>();
  readonly rowClick = output<{ tool: ToolRegistryItem; rect: DOMRect; mouseEvent: MouseEvent }>();

  readonly isComingSoon = computed(() => this.tool().status === 'coming-soon');
  readonly toolUrl = computed(() => getToolUrl(this.tool().slug));

  onPlusClick(event: MouseEvent): void {
    // "+" button does not trigger the expand
    event.stopPropagation();
  }

  onRowClick(event: MouseEvent, cardEl: HTMLElement): void {
    // Keep real <a href>. Only intercept plain left-clicks
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    const rect = cardEl.getBoundingClientRect();
    this.rowClick.emit({
      tool: this.tool(),
      rect,
      mouseEvent: event
    });
  }
}
