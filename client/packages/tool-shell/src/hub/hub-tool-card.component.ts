// packages/tool-shell/src/hub/hub-tool-card.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { TsIconComponent } from '../components/icon/ts-icon.component';

@Component({
  selector: 'hub-tool-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <a [href]="getToolUrl(tool().slug)" class="hub-card-root">
      <div class="hub-card-top">
        <div class="hub-card-icon-box">
          <ts-icon [name]="tool().icon || 'file'" [size]="20" />
        </div>
        <span class="hub-card-category">{{ tool().category }}</span>
      </div>

      <div class="hub-card-body">
        <h3 class="hub-card-title">{{ tool().name }}</h3>
        <p class="hub-card-desc">{{ tool().shortDescription }}</p>
      </div>

      <div class="hub-card-footer">
        <span class="hub-card-action">Open tool →</span>
      </div>
    </a>
  `,
  styles: [`
    .hub-card-root {
      display: flex;
      flex-direction: column;
      padding: var(--ts-space-4, 16px);
      background: var(--ts-surface);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-md, 12px);
      text-decoration: none;
      color: inherit;
      transition: var(--ts-transition-colors), transform var(--ts-dur-base) var(--ts-ease);
      user-select: none;
    }
    .hub-card-root:hover {
      background: var(--ts-raised);
      border-color: var(--ts-border-hover);
      transform: translateY(-2px);
    }
    .hub-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--ts-space-3, 12px);
    }
    .hub-card-icon-box {
      width: 36px;
      height: 36px;
      border-radius: var(--ts-radius-sm, 8px);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ts-text);
    }
    .hub-card-category {
      font-size: 11px;
      font-weight: 500;
      color: var(--ts-text-subtle);
      background: var(--ts-raised);
      padding: 2px 8px;
      border-radius: var(--ts-radius-full);
      border: 1px solid var(--ts-border);
    }
    .hub-card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: var(--ts-space-3, 12px);
    }
    .hub-card-title {
      font-size: var(--ts-text-md, 16px);
      font-weight: 600;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
    }
    .hub-card-desc {
      font-size: var(--ts-text-xs, 12px);
      color: var(--ts-text-muted);
      line-height: 1.5;
    }
    .hub-card-footer {
      display: flex;
      align-items: center;
      padding-top: var(--ts-space-2, 8px);
      border-top: 1px solid var(--ts-border-subtle);
      font-size: var(--ts-text-xs, 12px);
    }
    .hub-card-action {
      font-weight: 500;
      color: var(--ts-text-muted);
      transition: var(--ts-transition-colors);
    }
    .hub-card-root:hover .hub-card-action {
      color: var(--ts-text);
    }
  `]
})
export class HubToolCardComponent {
  readonly tool = input.required<ToolRegistryItem>();

  getToolUrl(slug: string): string {
    return getToolUrl(slug);
  }
}
