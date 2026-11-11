// apps/tool-color-studio/src/components/ads/ad-slot.component.ts
import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdConfigService, AdSlotPlacement } from './ad-config.service';

@Component({
  selector: 'app-ad-slot',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isActive()) {
      <aside 
        class="ad-slot-container" 
        [attr.data-placement]="placement()"
        [class.has-placeholder]="adService.showPlaceholders()"
        aria-label="Advertisement"
      >
        <div class="ad-label" aria-hidden="true">Advertisement</div>
        
        <div class="ad-frame-wrapper" [style.max-width.px]="maxWidth()">
          <!-- Future ad script hook / iframe placement container -->
          <div class="ad-inner-content" [attr.id]="'ad-slot-' + placement()">
            @if (adService.showPlaceholders()) {
              <div class="ad-placeholder-badge">
                <span class="ad-spec-label">{{ slotConfig()?.label }}</span>
                <span class="ad-notice">Ad placement reserved — zero layout shift guaranteed</span>
              </div>
            }
          </div>
        </div>
      </aside>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ad-slot-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 16px 0;
      width: 100%;
      contain: layout style;
      transition: opacity 180ms ease;
    }

    .ad-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted, #71717A);
      margin-bottom: 6px;
      user-select: none;
    }

    .ad-frame-wrapper {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-1, #18181B);
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .ad-frame-wrapper {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.12);
    }

    /* Placement specific dimensions to eliminate Cumulative Layout Shift (CLS) */
    [data-placement="top-banner"] .ad-frame-wrapper {
      min-height: 90px;
      max-width: 970px;
    }

    [data-placement="bottom-banner"] .ad-frame-wrapper {
      min-height: 90px;
      max-width: 728px;
    }

    [data-placement="side-rail"] .ad-frame-wrapper {
      min-height: 600px;
      width: 300px;
      max-width: 300px;
    }

    .ad-inner-content {
      width: 100%;
      height: 100%;
      min-height: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ad-placeholder-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 16px;
      text-align: center;
    }

    .ad-spec-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--tool-accent, #2563EB);
    }

    .ad-notice {
      font-size: 11px;
      color: var(--text-muted, #71717A);
    }

    @media (max-width: 768px) {
      .ad-slot-container {
        margin: 12px 0;
      }

      [data-placement="top-banner"] .ad-frame-wrapper {
        min-height: 100px;
        max-width: 320px;
      }

      [data-placement="bottom-banner"] .ad-frame-wrapper {
        min-height: 50px;
        max-width: 320px;
      }

      [data-placement="side-rail"] {
        display: none !important;
      }
    }
  `]
})
export class AdSlotComponent {
  public readonly placement = input.required<AdSlotPlacement>();
  public adService = inject(AdConfigService);

  public readonly slotConfig = computed(() => this.adService.getSlotConfig(this.placement()));
  public readonly isActive = computed(() => this.adService.isSlotActive(this.placement()));
  public readonly maxWidth = computed(() => this.slotConfig()?.minWidthDesktop || 970);
}

