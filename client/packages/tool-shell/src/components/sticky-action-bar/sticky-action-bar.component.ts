// client/packages/tool-shell/src/components/sticky-action-bar/sticky-action-bar.component.ts
import {
  Component,
  input,
  computed,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResponsiveService } from '../../services/responsive.service';

@Component({
  selector: 'ts-sticky-action-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="ts-sticky-action-bar"
      [class.keyboard-hidden]="shouldHideOnKeyboard()"
      [class.floating-mode]="floating()"
      role="toolbar"
      [attr.aria-label]="ariaLabel()"
    >
      <div class="action-bar-content">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ts-sticky-action-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 40;
      background: var(--bg-canvas, #121214);
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px)) 14px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
      will-change: transform;
      contain: layout style;
      box-sizing: border-box;
    }

    .ts-sticky-action-bar.floating-mode {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      padding: 10px 14px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .ts-sticky-action-bar.keyboard-hidden {
      transform: translateY(calc(100% + 30px));
      opacity: 0;
      pointer-events: none;
    }

    /* Light Theme Contrast */
    :host-context([data-theme="light"]) .ts-sticky-action-bar,
    [data-theme="light"] .ts-sticky-action-bar {
      background: var(--bg-surface, #ffffff);
      border-top-color: var(--border, #e2e8f0);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
    }

    .action-bar-content {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Target sizing guarantees for buttons inside the action bar */
    ::ng-deep .ts-sticky-action-bar button,
    ::ng-deep .ts-sticky-action-bar a {
      min-height: 44px;
      touch-action: manipulation;
    }

    /* Respect reduced-motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .ts-sticky-action-bar {
        transition: none !important;
      }
    }
  `]
})
export class StickyActionBarComponent {
  private readonly responsive = inject(ResponsiveService);

  readonly hideOnKeyboard = input<boolean>(true);
  readonly floating = input<boolean>(false);
  readonly ariaLabel = input<string>('Tool action bar');

  readonly shouldHideOnKeyboard = computed(() => {
    return this.hideOnKeyboard() && this.responsive.keyboardOpen();
  });
}
