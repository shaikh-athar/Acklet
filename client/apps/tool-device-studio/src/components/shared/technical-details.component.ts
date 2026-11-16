// apps/tool-device-studio/src/components/shared/technical-details.component.ts
import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-technical-details',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="technical-details" #detailsEl [attr.open]="isOpen() ? '' : null" (click)="onDetailsClick($event, detailsEl)">
      <summary class="details-summary">
        <div class="summary-left">
          <ts-icon [name]="icon()" [size]="15" />
          <span>{{ title() }}</span>
        </div>
        <ts-icon name="chevron-down" [size]="14" class="summary-chevron" />
      </summary>

      <div class="details-grid-wrapper">
        <div class="details-content">
          <div class="details-inner-pad">
            <ng-content />
          </div>
        </div>
      </div>
    </details>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .technical-details {
      margin-top: 20px;
      width: 100%;
      box-sizing: border-box;
      background: var(--ds-card-bg, #18181B);
      border: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.1));
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    :host-context([data-theme="light"]) .technical-details {
      background: #FFFFFF;
      border-color: #E2E8F0;
    }

    .technical-details[open] {
      border-color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .technical-details[open] {
      border-color: #2563EB;
    }

    .details-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      cursor: pointer;
      user-select: none;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      background: transparent;
      list-style: none;
      outline: none;
    }

    .details-summary::-webkit-details-marker {
      display: none;
    }

    .details-summary:hover {
      background: var(--surface-secondary, rgba(255, 255, 255, 0.03));
    }

    :host-context([data-theme="light"]) .details-summary {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .details-summary:hover {
      background: #F8FAFC;
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .summary-left {
      color: #2563EB;
    }

    .summary-left span {
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .summary-left span {
      color: #0F172A;
    }

    .summary-chevron {
      transition: transform 500ms ease-in-out;
      color: var(--text-2, #A1A1AA);
    }

    .technical-details[open] .summary-chevron {
      transform: rotate(180deg);
    }

    .technical-details.is-closing .summary-chevron {
      transform: rotate(0deg);
    }

    .details-grid-wrapper {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 500ms ease-in-out;
    }

    .technical-details[open] .details-grid-wrapper {
      grid-template-rows: 1fr;
    }

    .technical-details.is-closing .details-grid-wrapper {
      grid-template-rows: 0fr;
    }

    .details-content {
      overflow: hidden;
      min-height: 0;
      padding: 0 18px;
    }

    .details-inner-pad {
      padding: 16px 0 20px;
      border-top: 1px solid var(--ds-card-border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .details-inner-pad {
      border-top-color: #F1F5F9;
    }

    @media (prefers-reduced-motion: reduce) {
      .details-grid-wrapper,
      .summary-chevron {
        transition: none !important;
      }
    }
  `]
})
export class TechnicalDetailsComponent {
  public readonly title = input<string>('Technical Details');
  public readonly icon = input<string>('sliders');
  public readonly defaultOpen = input<boolean>(false);

  protected readonly isOpen = signal<boolean>(false);
  private isClosing = false;

  constructor() {
    if (this.defaultOpen()) {
      this.isOpen.set(true);
    }
  }

  protected onDetailsClick(event: MouseEvent, detailsEl: HTMLDetailsElement): void {
    const target = event.target as HTMLElement | null;
    const summary = detailsEl.querySelector('summary');
    if (!summary || !summary.contains(target)) return;

    if (detailsEl.open) {
      event.preventDefault();
      if (this.isClosing) return;

      const prefersReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        detailsEl.open = false;
        this.isOpen.set(false);
        return;
      }

      this.isClosing = true;
      detailsEl.classList.add('is-closing');

      setTimeout(() => {
        detailsEl.open = false;
        detailsEl.classList.remove('is-closing');
        this.isClosing = false;
        this.isOpen.set(false);
      }, 500);
    } else {
      this.isOpen.set(true);
    }
  }
}
