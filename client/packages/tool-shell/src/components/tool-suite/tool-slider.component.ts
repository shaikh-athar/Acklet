// packages/tool-shell/src/components/tool-suite/tool-slider.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tool-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tool-slider-container">
      <div class="slider-header-row">
        <label class="slider-label" [attr.for]="sliderId()">{{ label() }}</label>
        <div class="slider-value-display">
          <input
            type="number"
            class="slider-num-input"
            [min]="min()"
            [max]="max()"
            [step]="step()"
            [value]="value()"
            (input)="onNumInput($event)"
            [disabled]="disabled()"
            aria-label="Numeric value"
          />
          @if (unit()) {
            <span class="slider-unit">{{ unit() }}</span>
          }
        </div>
      </div>

      <div class="slider-track-wrap">
        <input
          [id]="sliderId()"
          type="range"
          class="tool-range-input"
          [min]="min()"
          [max]="max()"
          [step]="step()"
          [value]="value()"
          (input)="onRangeInput($event)"
          [disabled]="disabled()"
          [style.--fill-pct]="fillPercentage() + '%'"
        />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tool-slider-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .slider-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .slider-label {
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #0F172A);
    }

    :host-context([data-theme="dark"]) .slider-label,
    [data-theme="dark"] .slider-label {
      color: #F8FAFC;
    }

    .slider-value-display {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: 8px;
      padding: 2px 8px;
    }

    :host-context([data-theme="dark"]) .slider-value-display,
    [data-theme="dark"] .slider-value-display {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
    }

    .slider-num-input {
      width: 44px;
      border: none;
      background: transparent;
      font-family: var(--tool-font-family, inherit); /* Strictly UI font, NO monospace */
      font-size: 13px;
      font-weight: 600;
      text-align: right;
      color: var(--tool-accent, #2563EB);
      outline: none;
      padding: 0;
      -moz-appearance: textfield;
    }

    .slider-num-input::-webkit-outer-spin-button,
    .slider-num-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .slider-unit {
      font-family: var(--tool-font-family, inherit);
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted, #64748B);
    }

    .slider-track-wrap {
      position: relative;
      width: 100%;
      height: 24px;
      display: flex;
      align-items: center;
    }

    .tool-range-input {
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 999px;
      outline: none;
      background: linear-gradient(
        to right,
        var(--tool-accent, #2563EB) 0%,
        var(--tool-accent, #2563EB) var(--fill-pct, 0%),
        var(--border-subtle, #E2E8F0) var(--fill-pct, 0%),
        var(--border-subtle, #E2E8F0) 100%
      );
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .tool-range-input,
    [data-theme="dark"] .tool-range-input {
      background: linear-gradient(
        to right,
        var(--tool-accent, #2563EB) 0%,
        var(--tool-accent, #2563EB) var(--fill-pct, 0%),
        rgba(255, 255, 255, 0.14) var(--fill-pct, 0%),
        rgba(255, 255, 255, 0.14) 100%
      );
    }

    .tool-range-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid var(--tool-accent, #2563EB);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
      cursor: grab;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .tool-range-input:focus-visible::-webkit-slider-thumb {
      box-shadow: 0 0 0 4px var(--tool-accent-soft, rgba(37, 99, 235, 0.2));
      transform: scale(1.1);
    }

    .tool-range-input::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 2px solid var(--tool-accent, #2563EB);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
      cursor: grab;
    }
  `]
})
export class ToolSliderComponent {
  readonly label = input<string>('Value');
  readonly value = input<number>(80);
  readonly min = input<number>(1);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly unit = input<string>('%');
  readonly disabled = input<boolean>(false);
  readonly sliderId = input<string>('tool-slider-' + Math.random().toString(36).substring(2, 7));

  readonly valueChange = output<number>();

  readonly fillPercentage = computed(() => {
    const range = this.max() - this.min();
    if (range <= 0) return 0;
    const pct = ((this.value() - this.min()) / range) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  });

  onRangeInput(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    const val = Number(target.value);
    this.valueChange.emit(val);
  }

  onNumInput(evt: Event): void {
    const target = evt.target as HTMLInputElement;
    let val = Number(target.value);
    if (isNaN(val)) return;
    val = Math.max(this.min(), Math.min(this.max(), val));
    this.valueChange.emit(val);
  }
}
