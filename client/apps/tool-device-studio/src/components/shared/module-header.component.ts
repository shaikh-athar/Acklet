// apps/tool-device-studio/src/components/shared/module-header.component.ts
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-device-module-header',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="module-header"
      [class.compact-back]="compactBackOnMobile()"
      [class.full-width-actions]="fullWidthActionsOnMobile()"
    >
      <div class="title-wrap">
        <div class="icon-badge">
          <ts-icon [name]="icon()" [size]="20" />
        </div>
        <div class="title-meta">
          <div class="title-row">
            <h1 class="module-title">{{ title() }}</h1>
            @if (badge()) {
              <span class="status-badge" [attr.data-status]="badgeType()">{{ badge() }}</span>
            }
          </div>
          <p class="module-desc">{{ description() }}</p>
        </div>
      </div>

      <button
        type="button"
        class="back-btn"
        (click)="backClicked.emit()"
        title="All Tools"
        aria-label="All Tools"
      >
        <ts-icon name="arrow-left" [size]="16" />
        <span class="back-text">All Tools</span>
      </button>

      <div class="header-actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin-bottom: 24px;
    }

    .module-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      flex-wrap: wrap;
    }

    .back-btn {
      order: 1;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--surface-secondary, var(--bg-2, #27272A));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #F4F4F5);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap !important;
      transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .back-btn {
      background: #F1F5F9;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    .back-btn:hover {
      border-color: var(--tool-accent, #3B82F6);
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .back-btn:hover {
      border-color: #2563EB;
      color: #2563EB;
    }

    .title-wrap {
      order: 2;
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1 1 auto;
      min-width: 0;
    }

    .icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      color: var(--tool-accent, #3B82F6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .icon-badge {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .title-meta {
      flex: 1;
      min-width: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .module-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--text, #F4F4F5);
      line-height: 1.25;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .module-title {
      color: #0F172A;
    }

    .status-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--ds-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #3B82F6);
      border: 1px solid var(--ds-accent-border, rgba(59, 130, 246, 0.28));
      white-space: nowrap !important;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .status-badge {
      background: #EFF6FF;
      border-color: #BFDBFE;
      color: #2563EB;
    }

    .status-badge[data-status="active"] {
      background: rgba(52, 211, 153, 0.14);
      color: #34D399;
      border-color: rgba(52, 211, 153, 0.3);
    }

    .status-badge[data-status="warn"] {
      background: rgba(251, 191, 36, 0.14);
      color: #FBBF24;
      border-color: rgba(251, 191, 36, 0.3);
    }

    .module-desc {
      font-size: 14px;
      color: var(--text-2, #A1A1AA);
      margin: 4px 0 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .module-desc {
      color: #64748B;
    }

    .header-actions {
      order: 3;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
      flex-shrink: 0;
    }

    @media (max-width: 639px) {
      .module-header {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px 10px;
        align-items: center;
        padding-bottom: 16px;
      }

      .title-wrap {
        grid-column: 1 / -1;
        order: 1;
        gap: 12px;
      }

      .icon-badge {
        width: 38px;
        height: 38px;
      }

      .title-row {
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      .module-title {
        font-size: 18px;
        line-height: 1.25;
        white-space: normal;
        word-break: break-word;
      }

      .status-badge {
        font-size: 10.5px;
        padding: 2px 7px;
        white-space: nowrap;
      }

      .module-desc {
        display: none;
      }

      .back-btn {
        grid-column: 1;
        order: 2;
        justify-self: start;
        margin-top: 0;
        padding: 7px 10px;
        font-size: 12px;
      }

      .header-actions {
        grid-column: 2;
        order: 3;
        justify-self: end;
        margin-left: 0;
        gap: 8px;
        flex-wrap: wrap;
      }

      .compact-back .back-btn .back-text {
        display: none;
      }

      .compact-back .back-btn {
        padding: 7px 8px;
      }

      .full-width-actions .header-actions {
        grid-column: 1 / -1;
        order: 3;
        width: 100%;
        margin-top: 4px;
      }
    }
  `]
})
export class DeviceModuleHeaderComponent {
  public readonly title = input.required<string>();
  public readonly icon = input.required<string>();
  public readonly description = input.required<string>();
  public readonly badge = input<string>();
  public readonly badgeType = input<'default' | 'active' | 'warn'>('default');
  public readonly compactBackOnMobile = input<boolean>(false);
  public readonly fullWidthActionsOnMobile = input<boolean>(false);

  public readonly backClicked = output<void>();
}
