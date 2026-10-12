// packages/tool-shell/src/components/search/ts-search.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-search',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  template: `
    <div class="ts-search-field-wrap">
      <ts-icon name="search" [size]="14" class="ts-search-input-icon" />
      <input
        type="text"
        class="ts-search-input"
        [placeholder]="placeholder()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
        aria-label="Search tools"
      />
      @if (value()) {
        <button 
          type="button" 
          class="ts-search-clear-btn" 
          (click)="valueChange.emit('')"
          aria-label="Clear search"
        >
          <ts-icon name="x" [size]="12" />
        </button>
      }
    </div>
  `,
  styles: [`
    .ts-search-field-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }
    .ts-search-input-icon {
      position: absolute;
      left: 10px;
      color: var(--ts-text-subtle);
      pointer-events: none;
    }
    .ts-search-input {
      width: 100%;
      height: 36px;
      padding: 0 28px 0 32px;
      background: var(--ts-surface-inset, #F6F7F7);
      border: 1px solid var(--ts-surface-inset-border, rgba(15, 23, 42, 0.06));
      border-radius: 10px;
      color: var(--text, #09090B);
      font-family: inherit;
      font-size: 14px;
      outline: none;
      transition: border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }
    :host-context([data-theme="dark"]) .ts-search-input {
      background: var(--ts-surface-inset, #1A1B1E);
      border-color: var(--ts-surface-inset-border, rgba(255, 255, 255, 0.06));
      color: var(--text, #FCFCFC);
    }
    .ts-search-input:focus {
      border-color: var(--accent-strong, #111111);
      outline: 2px solid var(--accent-strong, #111111);
      outline-offset: 1px;
    }
    .ts-search-input::placeholder {
      color: var(--ts-text-subtle);
    }
    .ts-search-clear-btn {
      position: absolute;
      right: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: var(--ts-radius-full);
      background: transparent;
      border: none;
      color: var(--ts-text-subtle);
      cursor: pointer;
    }
    .ts-search-clear-btn:hover {
      color: var(--ts-text);
      background: var(--ts-border);
    }
  `]
})
export class TsSearchComponent {
  readonly value = input<string>('');
  readonly placeholder = input<string>('Filter tools...');
  readonly valueChange = output<string>();
}
