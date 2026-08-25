import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'app-fallback-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="fallback-state-container" role="alert" aria-live="polite">
      <div class="fallback-card">
        <div class="fallback-icon-box">
          <app-icon [name]="icon()" class="fallback-icon"></app-icon>
        </div>
        
        <div class="fallback-content">
          <h3 class="fallback-title">{{ title() }}</h3>
          <p class="fallback-description">{{ message() }}</p>
        </div>

        <div class="fallback-actions">
          @if (showRetry()) {
            <button class="fallback-btn primary" (click)="retry.emit()">
              <app-icon name="rotate-cw" class="icon-xs"></app-icon>
              <span>{{ retryLabel() }}</span>
            </button>
          }
          @if (showFeedback()) {
            <button class="fallback-btn secondary" (click)="feedback.emit()">
              <app-icon name="message-square" class="icon-xs"></app-icon>
              <span>Report this issue</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fallback-state-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      min-height: 260px;
      padding: 1.5rem;
      background: var(--jl-surface-primary, #0B0D10);
      color: var(--jl-text-main, #EDEDED);
      box-sizing: border-box;
    }

    .fallback-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 440px;
      padding: 2rem 2.2rem;
      background: var(--jl-surface-secondary, #12161C);
      border: 1px solid var(--jl-border-dark, #262B33);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      animation: fallbackFadeIn 0.2s ease-out;
    }

    @keyframes fallbackFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }

    .fallback-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.1rem;
      color: #ef4444;
    }

    .fallback-icon {
      width: 26px;
      height: 26px;
    }

    .fallback-content {
      margin-bottom: 1.4rem;
    }

    .fallback-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--jl-text-main, #EDEDED);
      margin: 0 0 0.45rem 0;
      letter-spacing: -0.01em;
    }

    .fallback-description {
      font-size: 0.84rem;
      color: var(--jl-text-secondary, #9BA3AF);
      line-height: 1.5;
      margin: 0;
    }

    .fallback-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .fallback-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.48rem 0.95rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .fallback-btn.primary {
      background: var(--jl-accent, #2FA084);
      color: #ffffff;
      border: 1px solid var(--jl-accent, #2FA084);
    }

    .fallback-btn.primary:hover {
      background: #27856e;
      box-shadow: 0 2px 8px rgba(47, 160, 132, 0.35);
    }

    .fallback-btn.secondary {
      background: var(--jl-surface-primary, #0B0D10);
      color: var(--jl-text-main, #EDEDED);
      border: 1px solid var(--jl-border-dark, #262B33);
    }

    .fallback-btn.secondary:hover {
      border-color: var(--jl-accent, #2FA084);
      color: var(--jl-accent, #2FA084);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FallbackStateComponent {
  icon = input<string>('alert-triangle');
  title = input<string>('Unable to process data');
  message = input<string>('Something went wrong on our end — try again or check your payload structure.');
  showRetry = input<boolean>(true);
  retryLabel = input<string>('Try again');
  showFeedback = input<boolean>(true);

  retry = output<void>();
  feedback = output<void>();
}
