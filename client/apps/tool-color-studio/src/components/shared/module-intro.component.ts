// apps/tool-color-studio/src/components/shared/module-intro.component.ts
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-module-intro',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="module-intro-card">
      <div class="intro-content-col">
        <div class="intro-title-row">
          <h1 class="intro-heading">{{ title() }}</h1>
          @if (badge()) {
            <span class="intro-badge">{{ badge() }}</span>
          }
        </div>
        <p class="intro-description">{{ description() }}</p>
      </div>

      <div class="intro-actions-col">
        <ng-content select="[actions]"></ng-content>
        @if (primaryActionLabel()) {
          <button 
            type="button" 
            class="intro-action-btn primary"
            (click)="primaryAction.emit()"
          >
            @if (primaryActionIcon()) {
              <ts-icon [name]="primaryActionIcon()!" [size]="15" />
            }
            <span>{{ primaryActionLabel() }}</span>
          </button>
        }
        @if (secondaryActionLabel()) {
          <button 
            type="button" 
            class="intro-action-btn secondary"
            (click)="secondaryAction.emit()"
          >
            @if (secondaryActionIcon()) {
              <ts-icon [name]="secondaryActionIcon()!" [size]="15" />
            }
            <span>{{ secondaryActionLabel() }}</span>
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin-bottom: 24px;
    }

    .module-intro-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 20px 24px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--cs-card-radius, 16px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      position: relative;
    }

    :host-context([data-theme="light"]) .module-intro-card {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .intro-content-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .intro-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .intro-heading {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.3;
    }

    :host-context([data-theme="light"]) .intro-heading {
      color: #0F172A;
    }

    .intro-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 9px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.1));
      color: var(--tool-accent, #2563EB);
      border: 1px solid var(--tool-accent-border, rgba(37, 99, 235, 0.25));
    }

    .intro-description {
      font-size: 13.5px;
      color: var(--text-muted, #A1A1AA);
      line-height: 1.5;
      margin: 0;
      max-width: 780px;
    }

    :host-context([data-theme="light"]) .intro-description {
      color: #64748B;
    }

    .intro-actions-col {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .intro-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 160ms cubic-bezier(0.16, 1, 0.3, 1);
      border: none;
      white-space: nowrap;
    }

    .intro-action-btn.primary {
      background: var(--tool-primary, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 1px 2px rgba(37, 99, 235, 0.25);
    }

    .intro-action-btn.primary:hover {
      background: var(--tool-primary-hover, #1D4ED8);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      transform: translateY(-1px);
    }

    .intro-action-btn.secondary {
      background: transparent;
      color: var(--text, #E4E4E7);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
    }

    :host-context([data-theme="light"]) .intro-action-btn.secondary {
      color: #334155;
      border-color: rgba(0, 0, 0, 0.12);
      background: #F8FAFC;
    }

    .intro-action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .intro-action-btn.secondary:hover {
      background: #EFF6FF;
      border-color: #2563EB;
      color: #2563EB;
    }

    @media (max-width: 768px) {
      .module-intro-card {
        flex-direction: column;
        align-items: flex-start;
        padding: 16px;
        gap: 14px;
      }

      .intro-actions-col {
        width: 100%;
        flex-wrap: wrap;
      }

      .intro-action-btn {
        flex: 1;
        justify-content: center;
      }
    }
  `]
})
export class ModuleIntroComponent {
  public readonly title = input.required<string>();
  public readonly description = input.required<string>();
  public readonly badge = input<string>();
  public readonly primaryActionLabel = input<string>();
  public readonly primaryActionIcon = input<string>();
  public readonly secondaryActionLabel = input<string>();
  public readonly secondaryActionIcon = input<string>();

  public readonly primaryAction = output<void>();
  public readonly secondaryAction = output<void>();
}

