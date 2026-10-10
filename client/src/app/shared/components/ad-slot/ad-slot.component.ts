// client/src/app/shared/components/ad-slot/ad-slot.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdSlotPlacement = 'top' | 'bottom' | 'in-content' | 'sidebar-left' | 'sidebar-right';
export type AdSlotSize = 'leaderboard' | 'banner' | 'rectangle' | 'skyscraper' | 'responsive';

@Component({
  selector: 'app-ad-slot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="ad-slot-container" 
      [attr.data-placement]="placement()" 
      [attr.data-size]="size()"
      [ngClass]="'ad-' + placement()"
      aria-hidden="true"
    >
      <div class="ad-placeholder-box">
        <span class="ad-badge">Advertisement</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ad-slot-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 1.5rem 0;
      box-sizing: border-box;
      contain: layout style;
    }

    .ad-placeholder-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      border-radius: var(--radius-lg, 12px);
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      position: relative;
      transition: border-color 0.2s;
    }

    .ad-badge {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-neutral-600, #52525b);
      user-select: none;
    }

    /* Fixed Heights per Placement / Size to prevent Cumulative Layout Shift (CLS) */
    .ad-top, .ad-bottom {
      min-height: 90px;
      max-width: 970px;
      margin-left: auto;
      margin-right: auto;
    }
    .ad-top .ad-placeholder-box, .ad-bottom .ad-placeholder-box {
      height: 90px;
    }

    .ad-in-content {
      min-height: 120px;
      margin: 2rem 0;
    }
    .ad-in-content .ad-placeholder-box {
      height: 120px;
    }

    .ad-sidebar-left, .ad-sidebar-right {
      min-height: 600px;
      width: 160px;
      margin: 0;
    }
    .ad-sidebar-left .ad-placeholder-box, .ad-sidebar-right .ad-placeholder-box {
      height: 600px;
      width: 160px;
    }

    /* Size overrides */
    [data-size="rectangle"] .ad-placeholder-box {
      height: 250px;
      max-width: 300px;
    }
    [data-size="banner"] .ad-placeholder-box {
      height: 60px;
      max-width: 468px;
    }
    [data-size="skyscraper"] .ad-placeholder-box {
      height: 600px;
      width: 160px;
    }

    @media (max-width: 768px) {
      .ad-top .ad-placeholder-box, .ad-bottom .ad-placeholder-box {
        height: 60px;
      }
      .ad-in-content .ad-placeholder-box {
        height: 90px;
      }
    }
  `]
})
export class AdSlotComponent {
  readonly placement = input<AdSlotPlacement>('in-content');
  readonly size = input<AdSlotSize>('responsive');
}
