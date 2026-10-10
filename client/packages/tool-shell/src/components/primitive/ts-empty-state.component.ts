// packages/tool-shell/src/components/primitive/ts-empty-state.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-empty-state',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="ts-empty-state-root">
      @if (image()) {
        <div class="ts-empty-image-box">
          <img [src]="image()!" [alt]="title()" class="ts-empty-gif" />
        </div>
      } @else {
        <div class="ts-empty-icon-circle">
          <ts-icon [name]="icon()" [size]="24" />
        </div>
      }
      <h3 class="ts-empty-title">{{ title() }}</h3>
      <p class="ts-empty-description">{{ description() }}</p>
      @if (actionLabel()) {
        <button type="button" class="ts-empty-action-btn" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    .ts-empty-state-root {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--ts-space-8, 32px) var(--ts-space-4, 16px);
      max-width: 420px;
      margin: 0 auto;
      gap: var(--ts-space-3, 12px);
    }
    .ts-empty-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: var(--ts-radius-full);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ts-text-muted);
    }
    .ts-empty-image-box {
      width: 320px;
      height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .ts-empty-gif {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
      user-select: none;
      pointer-events: none;
    }
    .ts-empty-title {
      font-size: var(--ts-text-md, 16px);
      font-weight: 600;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
      margin: 0;
    }
    .ts-empty-description {
      font-size: var(--ts-text-sm, 13.5px);
      color: var(--ts-text-muted);
      line-height: 1.5;
      margin: 0;
    }
    .ts-empty-action-btn {
      margin-top: var(--ts-space-2, 8px);
      padding: 6px 14px;
      border-radius: var(--ts-radius-sm, 8px);
      background: var(--ts-accent);
      color: var(--ts-accent-contrast);
      font-weight: 500;
      font-size: var(--ts-text-sm, 13px);
      border: none;
      cursor: pointer;
      transition: opacity var(--ts-dur-base) var(--ts-ease);
    }
    .ts-empty-action-btn:hover {
      opacity: 0.9;
    }
  `]
})
export class TsEmptyStateComponent {
  readonly image = input<string | null>(null);
  readonly icon = input<string>('info');
  readonly title = input<string>('No items found');
  readonly description = input<string>('There are no records to display.');
  readonly actionLabel = input<string | null>(null);
  readonly action = output<void>();
}
