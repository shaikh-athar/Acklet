// packages/tool-shell/src/components/ad-slot/tool-ad-slot.component.ts
import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolAdService } from '../../services/tool-ad.service';

@Component({
  selector: 'lib-tool-ad-slot',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (adService.isAdEnabled()) {
      <div 
        class="tool-ad-container" 
        [attr.data-placement]="placement()" 
        [attr.data-size]="size()"
        [attr.data-slot-id]="slotId"
      >
        <div class="tool-ad-label">Advertisement</div>
        <div class="tool-ad-render-box">
          <!-- Placeholder or provider script container -->
          <div class="tool-ad-placeholder">
            <span>Sponsored Slot ({{ size() }})</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .tool-ad-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 1.5rem 0;
      width: 100%;
    }
    .tool-ad-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--tool-text-muted, #64748b);
      margin-bottom: 0.25rem;
    }
    .tool-ad-render-box {
      background: var(--tool-bg-subtle, rgba(255, 255, 255, 0.03));
      border: 1px dashed var(--tool-border, rgba(255, 255, 255, 0.1));
      border-radius: var(--tool-radius-md, 8px);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      width: 100%;
      min-height: 90px;
    }
    [data-size="skyscraper"] .tool-ad-render-box {
      min-height: 600px;
      width: 160px;
    }
    [data-size="leaderboard"] .tool-ad-render-box {
      min-height: 90px;
      max-width: 728px;
    }
    [data-size="responsive"] .tool-ad-render-box {
      min-height: 120px;
    }
    .tool-ad-placeholder {
      font-size: 0.75rem;
      color: var(--tool-text-muted, #64748b);
    }
  `]
})
export class ToolAdSlotComponent {
  readonly placement = input.required<string>();
  readonly size = input<'skyscraper' | 'leaderboard' | 'responsive' | 'rectangle'>('responsive');

  readonly adService = inject(ToolAdService);

  get slotId(): string | undefined {
    return this.adService.getSlotId(this.placement());
  }
}
