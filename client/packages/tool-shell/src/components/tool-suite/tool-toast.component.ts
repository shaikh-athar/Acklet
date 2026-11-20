// packages/tool-shell/src/components/tool-suite/tool-toast.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

export interface ToolToastData {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isLeaving?: boolean;
}

@Component({
  selector: 'app-tool-toast',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast(); as t) {
      <div
        class="tool-toast-pill"
        [class.toast-success]="t.type === 'success'"
        [class.toast-error]="t.type === 'error'"
        [class.toast-warning]="t.type === 'warning'"
        [class.toast-info]="t.type === 'info'"
        [class.is-leaving]="t.isLeaving"
        role="status"
        aria-live="polite"
        (mouseenter)="onMouseEnter()"
        (mouseleave)="onMouseLeave()"
      >
        <ts-icon
          [name]="t.type === 'success' ? 'check' : (t.type === 'error' ? 'alert-circle' : (t.type === 'warning' ? 'alert-triangle' : 'info'))"
          [size]="15"
          class="toast-icon"
        />
        <span class="toast-message">{{ t.message }}</span>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .tool-toast-pill {
      position: fixed;
      bottom: max(28px, env(safe-area-inset-bottom, 28px));
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      max-width: min(90vw, 420px);
      min-width: 220px;
      width: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 18px;
      border-radius: var(--tool-radius-pill, 999px);
      font-family: var(--tool-font-family, inherit);
      font-size: var(--tool-type-caption-size, 13px);
      font-weight: 500;
      line-height: 1.4;
      text-align: center;
      word-break: break-word;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #0F172A;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04);
      animation: toolToastEnter 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      pointer-events: auto;
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .tool-toast-pill,
    [data-theme="dark"] .tool-toast-pill {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    .tool-toast-pill.is-leaving {
      animation: toolToastExit 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    .tool-toast-pill.toast-success {
      border-color: #A7F3D0;
    }
    .tool-toast-pill.toast-success .toast-icon {
      color: #059669;
    }
    :host-context([data-theme="dark"]) .tool-toast-pill.toast-success,
    [data-theme="dark"] .tool-toast-pill.toast-success {
      border-color: rgba(16, 185, 129, 0.35);
    }
    :host-context([data-theme="dark"]) .tool-toast-pill.toast-success .toast-icon,
    [data-theme="dark"] .tool-toast-pill.toast-success .toast-icon {
      color: #10B981;
    }

    .tool-toast-pill.toast-error {
      border-color: #FECACA;
    }
    .tool-toast-pill.toast-error .toast-icon {
      color: #DC2626;
    }
    :host-context([data-theme="dark"]) .tool-toast-pill.toast-error,
    [data-theme="dark"] .tool-toast-pill.toast-error {
      border-color: rgba(239, 68, 68, 0.35);
    }
    :host-context([data-theme="dark"]) .tool-toast-pill.toast-error .toast-icon,
    [data-theme="dark"] .tool-toast-pill.toast-error .toast-icon {
      color: #EF4444;
    }

    .tool-toast-pill.toast-info {
      border-color: var(--tool-accent-soft, #BFDBFE);
    }
    .tool-toast-pill.toast-info .toast-icon {
      color: var(--tool-accent, #2563EB);
    }

    .toast-icon {
      flex-shrink: 0;
    }

    .toast-message {
      line-height: 1.4;
    }

    @keyframes toolToastEnter {
      from {
        opacity: 0;
        transform: translate(-50%, 14px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    @keyframes toolToastExit {
      from {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      to {
        opacity: 0;
        transform: translate(-50%, 14px);
      }
    }

    @media (max-width: 640px) {
      .tool-toast-pill {
        bottom: max(16px, env(safe-area-inset-bottom, 16px));
        max-width: calc(100vw - 32px);
        font-size: 12px;
        padding: 8px 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .tool-toast-pill {
        animation: none !important;
      }
    }
  `]
})
export class ToolToastComponent {
  readonly toast = input<ToolToastData | null>(null);
  readonly pauseTimer = output<void>();
  readonly resumeTimer = output<void>();

  onMouseEnter(): void {
    this.pauseTimer.emit();
  }

  onMouseLeave(): void {
    this.resumeTimer.emit();
  }
}
