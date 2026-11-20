// packages/tool-shell/src/components/tool-suite/cta-bar.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'app-cta-bar',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cta-bar-wrapper">
      <button
        type="button"
        class="cta-primary-btn"
        [disabled]="disabled() || isProcessing()"
        (click)="ctaClicked.emit()"
        [title]="buttonLabel()"
      >
        @if (isProcessing()) {
          <span class="cta-spinner"></span>
          <span>Processing ({{ processingCount() }}/{{ totalCount() }})...</span>
        } @else {
          <span>{{ buttonLabel() }}</span>
          <ts-icon name="arrow-right" [size]="18" />
        }
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .cta-bar-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
      font-family: var(--tool-font-family, inherit);
      box-sizing: border-box;
    }

    .cta-primary-btn {
      width: 100%;
      height: var(--tool-cta-height, 48px);
      border-radius: var(--tool-radius-control, 12px);
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-family: var(--tool-font-family, inherit);
      font-size: 15px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .cta-primary-btn:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .cta-primary-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .cta-primary-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .cta-privacy-line {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--tool-type-caption-size, 13px);
      line-height: var(--tool-type-caption-lh, 18px);
      color: var(--text-muted, #64748B);
      margin: 0;
      text-align: center;
    }

    :host-context([data-theme="dark"]) .cta-privacy-line,
    [data-theme="dark"] .cta-privacy-line {
      color: #94A3B8;
    }

    .privacy-icon {
      color: #10B981;
      flex-shrink: 0;
    }

    .cta-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: ctaSpin 0.6s linear infinite;
    }

    @keyframes ctaSpin {
      to { transform: rotate(360deg); }
    }

    /* Mobile Sticky Bottom Bar Dock */
    @media (max-width: 600px) {
      .cta-bar-wrapper {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 50;
        background: var(--ts-surface-raised, #FFFFFF);
        border-top: 1px solid var(--border-subtle, #E2E8F0);
        padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
      }

      :host-context([data-theme="dark"]) .cta-bar-wrapper,
      [data-theme="dark"] .cta-bar-wrapper {
        background: #18181B;
        border-color: rgba(255, 255, 255, 0.1);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.35);
      }
    }
  `]
})
export class CtaBarComponent {
  readonly ctaVerb = input<string>('Convert');
  readonly nounSingular = input<string>('file');
  readonly nounPlural = input<string>('files');
  readonly count = input<number>(0);
  readonly totalCount = input<number>(0);
  readonly isProcessing = input<boolean>(false);
  readonly processingCount = input<number>(0);
  readonly disabled = input<boolean>(false);

  readonly ctaClicked = output<void>();

  readonly buttonLabel = computed(() => {
    const n = this.count();
    const verb = this.ctaVerb();
    const noun = n === 1 ? this.nounSingular() : this.nounPlural();
    return `${verb} ${n} ${noun}`;
  });
}
