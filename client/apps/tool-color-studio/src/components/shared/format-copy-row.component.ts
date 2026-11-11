// apps/tool-color-studio/src/components/shared/format-copy-row.component.ts
import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-format-copy-row',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="format-row">
      <span class="format-tag">{{ label() }}</span>
      <span class="format-value" [title]="value()">{{ value() }}</span>
      <button 
        type="button" 
        class="format-copy-btn" 
        [attr.aria-label]="'Copy ' + label() + ' value'"
        (click)="copyValue()"
      >
        <ts-icon name="copy" [size]="14" />
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .format-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      transition: border-color 150ms ease;
    }

    :host-context([data-theme="light"]) .format-row {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .format-row:hover {
      border-color: var(--tool-accent, #2563EB);
    }

    .format-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3, #71717A);
      min-width: 42px;
    }

    .format-value {
      flex: 1;
      min-width: 0;
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .format-value {
      color: var(--text, #0F172A);
    }

    .format-copy-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-2, #A1A1AA);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .format-copy-btn {
      color: var(--text-2, #64748B);
    }

    .format-copy-btn:hover {
      background: var(--tool-accent-soft, rgba(244, 63, 94, 0.1));
      color: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
    }

    @media (max-width: 1023px) {
      .format-copy-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
      }
      .format-row {
        padding: 2px 4px 2px 10px;
      }
    }
  `]
})
export class FormatCopyRowComponent {
  public readonly label = input.required<string>();
  public readonly value = input.required<string>();

  private state = inject(ColorStudioStateService);

  public copyValue(): void {
    this.state.copyToClipboard(this.value(), `${this.label()} format`);
  }
}

