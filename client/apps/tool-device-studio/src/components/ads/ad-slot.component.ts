// apps/tool-device-studio/src/components/ads/ad-slot.component.ts
import { Component, input, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdConfigService, AdSlotPlacement } from './ad-config.service';

@Component({
  selector: 'app-device-ad-slot',
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

    [data-placement="top-banner"] .ad-frame-wrapper {
      min-height: 90px;
      max-width: 970px;
    }

    [data-placement="bottom-banner"] .ad-frame-wrapper {
      min-height: 90px;
      max-width: 728px;
    }

    [data-placement="side-rail-left"] .ad-frame-wrapper,
    [data-placement="side-rail-right"] .ad-frame-wrapper {
      min-height: 600px;
      width: 160px;
      max-width: 160px;
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
      text-align: center;
      gap: 4px;
      padding: 12px;
    }

    .ad-spec-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #A1A1AA);
    }

    .ad-notice {
      font-size: 10px;
      color: var(--text-3, #71717A);
    }
  `]
})
export class DeviceAdSlotComponent {
  public readonly placement = input.required<AdSlotPlacement>();
  public readonly adService = inject(AdConfigService);

  public readonly isActive = computed(() => this.adService.isSlotActive(this.placement()));
  public readonly slotConfig = computed(() => this.adService.getSlotConfig(this.placement()));

  public readonly maxWidth = computed(() => {
    const cfg = this.slotConfig();
    return cfg ? cfg.minWidthDesktop : undefined;
  });
}

