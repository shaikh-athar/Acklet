// packages/tool-shell/src/components/primitive/ts-about-card.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-about-card',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    @if (tool()) {
      <div class="ts-about-card-root">
        <div class="ts-about-card-header">
          <div class="ts-about-card-title-group">
            <span class="ts-about-card-title">About {{ tool()?.name }}</span>
          </div>
          <button 
            type="button" 
            class="ts-about-action-btn"
            (click)="readMore.emit()"
            aria-label="Read full documentation and FAQs"
          >
            <span>Read more</span>
            <ts-icon name="arrow-right" [size]="14" />
          </button>
        </div>

        <div class="ts-about-card-body">
          <p class="ts-about-desc-text">{{ tool()?.shortDescription }}</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .ts-about-card-root {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--ts-radius-2xl, 24px);
      padding: 20px 24px;
      box-shadow: var(--ts-shadow-surface);
      transition: background-color var(--ts-dur-base, 200ms) var(--ts-ease),
                  border-color var(--ts-dur-base, 200ms) var(--ts-ease);
      user-select: text;
    }

    .ts-about-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .ts-about-card-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ts-about-card-title {
      font-family: var(--ts-font-heading);
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
      letter-spacing: var(--ts-tracking-tight);
    }

    .ts-about-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      background: var(--accent-soft);
      border: 1px solid var(--border);
      border-radius: 9999px;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .ts-about-action-btn:hover {
      background: var(--surface-hover);
      color: var(--text);
    }

    .ts-about-desc-text {
      font-size: 14.5px;
      color: var(--text-muted);
      line-height: 1.6;
      max-width: 72ch;
      margin: 0;
    }
  `]
})
export class TsAboutCardComponent {
  readonly tool = input<ToolRegistryItem | null>(null);
  readonly readMore = output<void>();
}
