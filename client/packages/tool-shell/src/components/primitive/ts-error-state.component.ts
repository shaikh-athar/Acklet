// packages/tool-shell/src/components/primitive/ts-error-state.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-error-state',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="ts-error-state-root" role="alert">
      <div class="ts-error-icon-box">
        <ts-icon name="help-circle" [size]="24" />
      </div>
      <h3 class="ts-error-title">{{ title() }}</h3>
      <p class="ts-error-description">{{ message() }}</p>
      <div class="ts-error-actions">
        <button type="button" class="ts-btn-retry" (click)="retry.emit()">
          {{ retryLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ts-error-state-root {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--ts-space-8, 32px) var(--ts-space-4, 16px);
      max-width: 440px;
      margin: 0 auto;
      gap: var(--ts-space-3, 12px);
    }
    .ts-error-icon-box {
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
    .ts-error-title {
      font-size: var(--ts-text-md, 16px);
      font-weight: 600;
      color: var(--ts-text);
    }
    .ts-error-description {
      font-size: var(--ts-text-sm, 13px);
      color: var(--ts-text-muted);
      line-height: 1.5;
    }
    .ts-error-actions {
      margin-top: var(--ts-space-2, 8px);
    }
    .ts-btn-retry {
      padding: 6px 14px;
      border-radius: var(--ts-radius-sm, 8px);
      background: var(--ts-raised);
      color: var(--ts-text);
      font-weight: 500;
      font-size: var(--ts-text-sm, 13px);
      border: 1px solid var(--ts-border);
      cursor: pointer;
      transition: var(--ts-transition-colors);
    }
    .ts-btn-retry:hover {
      background: var(--ts-raised-hover);
    }
  `]
})
export class TsErrorStateComponent {
  readonly title = input<string>('Something went wrong');
  readonly message = input<string>('Unable to load this section. Please try again.');
  readonly retryLabel = input<string>('Try Again');
  readonly retry = output<void>();
}
