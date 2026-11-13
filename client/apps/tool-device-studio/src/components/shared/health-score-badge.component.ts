// apps/tool-device-studio/src/components/shared/health-score-badge.component.ts
import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-health-score-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="score-badge" [attr.data-tier]="scoreTier()">
      <div class="score-ring-wrap">
        <svg class="score-svg" viewBox="0 0 36 36">
          <path
            class="circle-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            class="circle-fill"
            [attr.stroke-dasharray]="score() + ', 100'"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span class="score-num">{{ score() }}</span>
      </div>
      <div class="score-info">
        <span class="score-label">Device Health</span>
        <span class="score-rating">{{ ratingText() }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .score-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 14px 6px 8px;
      border-radius: 9999px;
      background: var(--surface, var(--bg-1, #18181B));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
    }

    :host-context([data-theme="light"]) .score-badge {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .score-ring-wrap {
      position: relative;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .circle-bg {
      fill: none;
      stroke: var(--ds-meter-bg, #27272A);
      stroke-width: 3.2;
    }

    :host-context([data-theme="light"]) .circle-bg {
      stroke: #E2E8F0;
    }

    .circle-fill {
      fill: none;
      stroke: var(--tool-accent, #3B82F6);
      stroke-width: 3.2;
      stroke-linecap: round;
      transition: stroke-dasharray 0.5s ease;
    }

    :host-context([data-theme="light"]) .circle-fill {
      stroke: #2563EB;
    }

    .score-num {
      position: absolute;
      font-size: 11px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .score-num {
      color: #0F172A;
    }

    .score-info {
      display: flex;
      flex-direction: column;
    }

    .score-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-3, #71717A);
    }

    .score-rating {
      font-size: 13px;
      font-weight: 600;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .score-rating {
      color: #2563EB;
    }
  `]
})
export class HealthScoreBadgeComponent {
  public readonly score = input.required<number>();

  public readonly scoreTier = computed(() => {
    const s = this.score();
    if (s >= 80) return 'excellent';
    if (s >= 60) return 'good';
    return 'fair';
  });

  public readonly ratingText = computed(() => {
    const s = this.score();
    if (s >= 90) return 'Optimal (100%)';
    if (s >= 75) return 'Meeting Ready';
    if (s >= 50) return 'Functional';
    return 'Auditing...';
  });
}
