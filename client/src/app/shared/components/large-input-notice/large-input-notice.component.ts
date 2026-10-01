import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-large-input-notice',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="large-input-banner" role="status" aria-live="polite">
      <div class="banner-icon">
        <app-icon name="alert-triangle" class="size-4 text-amber-500" />
      </div>
      
      <div class="banner-body">
        <span class="banner-title">{{ title() }}</span>
        <span class="banner-desc">{{ message() }}</span>
      </div>

      <div class="banner-actions">
        @if (showAction()) {
          <button class="btn-enable-full" (click)="enableFullProcessing.emit()">
            <span>{{ actionLabel() }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin: 8px 0;
    }
    .large-input-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: var(--color-neutral-100, #1E293B);
      font-size: 12px;
      line-height: 1.4;
    }
    :host-context([data-theme="dark"]) .large-input-banner {
      background: rgba(245, 158, 11, 0.12);
      color: #F8FAFC;
    }
    .banner-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .banner-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .banner-title {
      font-weight: 700;
      color: #D97706;
    }
    :host-context([data-theme="dark"]) .banner-title {
      color: #FBBF24;
    }
    .banner-desc {
      color: var(--color-neutral-400, #64748B);
      font-size: 11.5px;
    }
    .banner-actions {
      flex-shrink: 0;
    }
    .btn-enable-full {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      background: var(--color-surface-900, #FFFFFF);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #D97706;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    :host-context([data-theme="dark"]) .btn-enable-full {
      background: rgba(245, 158, 11, 0.2);
      color: #FBBF24;
      border-color: rgba(245, 158, 11, 0.5);
    }
    .btn-enable-full:hover {
      background: #D97706;
      color: #FFFFFF;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LargeInputNoticeComponent {
  title = input<string>('Large Payload Detected');
  message = input<string>('Live syntax highlighting and heavy features have been paused to maintain instantaneous 60fps responsiveness.');
  actionLabel = input<string>('Process Anyway');
  showAction = input<boolean>(true);

  enableFullProcessing = output<void>();
}
