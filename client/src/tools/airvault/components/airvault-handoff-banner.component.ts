import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { DraftActivityPayload } from '../services/airvault-sync.service';

@Component({
  selector: 'app-airvault-handoff-banner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.banner-active]': 'isVisible()'
  },
  template: `
    <div class="handoff-banner-container" [class.visible]="isVisible()">
      <div class="handoff-inner" (click)="$event.stopPropagation()">
        <!-- Source Device Icon & Live Activity Pulse -->
        <div class="handoff-device-badge" [style.color]="deviceAccent()" [style.borderColor]="deviceAccent()">
          <app-icon [name]="deviceIcon()" class="icon-xs"></app-icon>
          <span class="handoff-pulse-dot" [style.background]="deviceAccent()"></span>
        </div>

        <!-- Banner Text & Truncated Preview -->
        <div class="handoff-text-box">
          <span class="handoff-headline">
            Continue typing from <strong class="handoff-username">{{ username() }}</strong>
          </span>
          <span class="handoff-sep">·</span>
          <span class="handoff-preview" [title]="contentPreview()">
            "{{ contentPreview() }}"
          </span>
        </div>

        <!-- Actions: Continue & Dismiss (x) -->
        <div class="handoff-actions">
          <button
            type="button"
            class="handoff-continue-btn"
            (click)="onContinueClicked($event)"
            title="Pull draft into local composer">
            <app-icon name="arrow-down-to-line" class="icon-2xs"></app-icon>
            <span>Continue</span>
          </button>

          <button
            type="button"
            class="handoff-dismiss-btn"
            (click)="onDismissClicked($event)"
            title="Dismiss draft banner">
            <app-icon name="x" class="icon-xs"></app-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      overflow: hidden;
    }

    :host(:not(.banner-active)) {
      display: none;
    }

    .handoff-banner-container {
      max-height: 0;
      opacity: 0;
      transform: translateY(-4px);
      transition: max-height 0.24s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.18s ease,
                  transform 0.18s ease,
                  margin-bottom 0.24s ease;
      margin-bottom: 0;
      pointer-events: none;
      box-sizing: border-box;
      padding: 0 12px;
    }

    .handoff-banner-container.visible {
      max-height: 48px;
      opacity: 1;
      transform: translateY(0);
      margin-top: 8px;
      margin-bottom: 4px;
      pointer-events: auto;
    }

    .handoff-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: var(--av-surface-secondary, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--av-border, rgba(255, 255, 255, 0.08));
      border-left: 3px solid var(--av-accent, #3b82f6);
      border-radius: var(--av-radius-md, 6px);
      box-sizing: border-box;
      min-height: 36px;
    }

    .handoff-device-badge {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid currentColor;
      flex-shrink: 0;
    }

    .handoff-pulse-dot {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      box-shadow: 0 0 0 1.5px var(--av-surface-primary, #12141a);
      animation: pulseAnim 1.4s infinite;
    }

    @keyframes pulseAnim {
      0% { transform: scale(0.9); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.8; }
    }

    .handoff-text-box {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1;
      font-size: 11.5px;
      color: var(--av-text-primary, #e2e8f0);
      white-space: nowrap;
      overflow: hidden;
    }

    .handoff-headline {
      flex-shrink: 0;
      font-weight: 500;
    }

    .handoff-username {
      color: var(--av-text-primary, #ffffff);
      font-weight: 600;
    }

    .handoff-sep {
      color: var(--av-text-faint, rgba(255, 255, 255, 0.3));
      font-size: 9px;
      flex-shrink: 0;
    }

    .handoff-preview {
      color: var(--av-text-muted, #94a3b8);
      font-style: italic;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .handoff-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .handoff-continue-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 9px;
      font-size: 11px;
      font-weight: 600;
      color: #ffffff;
      background: var(--av-accent, #3b82f6);
      border: 1px solid var(--av-accent, #3b82f6);
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.12s ease;
      user-select: none;
    }

    .handoff-continue-btn:hover {
      background: #2563eb;
      border-color: #2563eb;
      transform: translateY(-0.5px);
    }

    .handoff-dismiss-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--av-text-muted, #94a3b8);
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .handoff-dismiss-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--av-text-primary, #ffffff);
    }
  `]
})
export class AirVaultHandoffBannerComponent {
  draft = input<DraftActivityPayload | null>(null);
  isVisible = input<boolean>(false);

  continueDraft = output<DraftActivityPayload>();
  dismiss = output<void>();

  username = computed(() => {
    const u = this.draft()?.username || 'Paired Device';
    return u.startsWith('@') ? u : `@${u}`;
  });

  contentPreview = computed(() => {
    return this.draft()?.contentPreview || '';
  });

  deviceIcon = computed(() => {
    const t = (this.draft()?.deviceType || '').toLowerCase();
    switch (t) {
      case 'smartphone': return 'smartphone';
      case 'tablet': return 'tablet';
      case 'laptop': return 'laptop';
      case 'desktop': return 'monitor';
      default: return 'laptop';
    }
  });

  deviceAccent = computed(() => {
    return this.draft()?.deviceAccent || '#3b82f6';
  });

  onContinueClicked(event: MouseEvent) {
    event.stopPropagation();
    const d = this.draft();
    if (d) {
      this.continueDraft.emit(d);
    }
  }

  onDismissClicked(event: MouseEvent) {
    event.stopPropagation();
    this.dismiss.emit();
  }
}
