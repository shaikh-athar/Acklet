// packages/tool-shell/src/components/tool-suite/tool-workspace.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'app-tool-workspace',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tool-workspace-layout">
      <!-- LEFT COLUMN: Main Gallery Stage -->
      <main class="tool-stage" aria-label="Files queue">
        <!-- Stage Header: Exact same left edge as grid & topbar -->
        <div class="stage-header-row">
          <div class="stage-title-wrap">
            <h2 class="stage-heading">{{ listTitle() }}</h2>
            <span class="stage-count-pill">{{ count() }} / {{ limit() }}</span>
          </div>

          <div class="stage-actions-wrap">
            <button
              type="button"
              class="stage-action-primary-btn"
              (click)="addFilesClicked.emit()"
              [disabled]="count() >= limit() || isProcessing()"
              title="Add more files to batch"
              aria-label="Add files"
            >
              <ts-icon name="plus" [size]="14" />
              <span>Add files</span>
            </button>

            @if (hasMoreAction()) {
              <div class="stage-more-wrap">
                <button
                  type="button"
                  class="stage-action-secondary-btn"
                  (click)="isMoreOpen.set(!isMoreOpen())"
                  [attr.aria-expanded]="isMoreOpen()"
                  title="More actions"
                  aria-label="More actions"
                >
                  <span>More</span>
                  <ts-icon [name]="isMoreOpen() ? 'chevron-up' : 'chevron-down'" [size]="12" />
                </button>

                @if (isMoreOpen()) {
                  <div class="stage-more-menu" role="menu">
                    <button
                      type="button"
                      class="more-menu-item"
                      role="menuitem"
                      (click)="selectAllClicked.emit(); isMoreOpen.set(false)"
                    >
                      <ts-icon name="check-square" [size]="14" />
                      <span>Select all</span>
                    </button>
                    <button
                      type="button"
                      class="more-menu-item"
                      role="menuitem"
                      (click)="resetAllClicked.emit(); isMoreOpen.set(false)"
                    >
                      <ts-icon name="rotate-ccw" [size]="14" />
                      <span>Reset all</span>
                    </button>
                  </div>
                }
              </div>
            }

            <button
              type="button"
              class="stage-action-ghost-btn"
              (click)="clearAllClicked.emit()"
              [disabled]="isProcessing() || count() === 0"
              title="Clear all files"
              aria-label="Clear all files"
            >
              <ts-icon name="trash-2" [size]="14" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <!-- Cards Grid Container -->
        <div class="tool-cards-grid" role="list">
          <ng-content select="[cards-slot]" />
        </div>
      </main>

      <!-- RIGHT COLUMN: Settings Panel -->
      <aside class="tool-sidebar-panel" aria-label="Tool configuration">
        <ng-content select="[panel-slot]" />
      </aside>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tool-workspace-layout {
      max-width: var(--tool-page-max-width, 1280px);
      margin: 0 auto;
      padding: 0 var(--tool-content-padding, 24px) var(--tool-space-48, 48px);
      display: grid;
      grid-template-columns: 1fr var(--tool-panel-width, 360px);
      gap: var(--tool-space-24, 24px);
      align-items: start;
      box-sizing: border-box;
      font-family: var(--tool-font-family, inherit);
    }

    /* ── LEFT: Main Stage ── */
    .tool-stage {
      display: flex;
      flex-direction: column;
      gap: var(--tool-space-16, 16px);
      min-width: 0;
      padding-left: 0 !important; /* Strictly 0 offset; shares exact left edge */
    }

    .stage-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      width: 100%;
    }

    .stage-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .stage-heading {
      font-size: var(--tool-type-h2-size, 24px);
      line-height: var(--tool-type-h2-lh, 32px);
      font-weight: var(--tool-type-h2-weight, 600);
      letter-spacing: var(--tool-type-h2-tracking, -0.015em);
      color: var(--text, #0F172A);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .stage-heading,
    [data-theme="dark"] .stage-heading {
      color: #F8FAFC;
    }

    .stage-count-pill {
      font-size: 12px;
      line-height: var(--tool-count-pill-height, 24px);
      height: var(--tool-count-pill-height, 24px);
      padding: 0 10px;
      border-radius: var(--tool-radius-pill, 999px);
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      color: var(--tool-accent, #2563EB);
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    :host-context([data-theme="dark"]) .stage-count-pill,
    [data-theme="dark"] .stage-count-pill {
      background: rgba(255, 255, 255, 0.08);
      color: var(--tool-accent, #60A5FA);
    }

    .stage-actions-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .stage-action-primary-btn {
      height: 36px;
      padding: 0 14px;
      border-radius: var(--tool-radius-control, 12px);
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .stage-action-primary-btn:hover:not(:disabled) {
      filter: brightness(1.08);
      transform: translateY(-1px);
    }

    .stage-action-secondary-btn {
      height: 36px;
      padding: 0 12px;
      border-radius: var(--tool-radius-control, 12px);
      background: transparent;
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    :host-context([data-theme="dark"]) .stage-action-secondary-btn,
    [data-theme="dark"] .stage-action-secondary-btn {
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .stage-action-ghost-btn {
      height: 36px;
      padding: 0 10px;
      border-radius: var(--tool-radius-control, 12px);
      background: transparent;
      border: none;
      color: var(--text-muted, #64748B);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 150ms ease, background-color 150ms ease;
    }

    .stage-action-ghost-btn:hover:not(:disabled) {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.08);
    }

    .stage-more-wrap {
      position: relative;
    }

    .stage-more-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      z-index: 50;
      background: #FFFFFF;
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: var(--tool-radius-control, 12px);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
      padding: 4px;
      min-width: 140px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .stage-more-menu,
    [data-theme="dark"] .stage-more-menu {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .more-menu-item {
      height: 32px;
      padding: 0 10px;
      border-radius: calc(var(--tool-radius-control, 12px) - 4px);
      border: none;
      background: transparent;
      color: var(--text, #0F172A);
      font-family: var(--tool-font-family, inherit);
      font-size: 12.5px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .more-menu-item,
    [data-theme="dark"] .more-menu-item {
      color: #F8FAFC;
    }

    .more-menu-item:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="dark"]) .more-menu-item:hover,
    [data-theme="dark"] .more-menu-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* ── Grid ── */
    .tool-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: var(--tool-grid-gap, 16px);
      width: 100%;
    }

    /* ── RIGHT: Sidebar Panel ── */
    .tool-sidebar-panel {
      position: sticky;
      top: 24px;
      width: 100%;
    }

    /* Responsive */
    @media (max-width: 1023px) {
      .tool-workspace-layout {
        grid-template-columns: 1fr;
      }
      .tool-sidebar-panel {
        position: static;
        margin-top: var(--tool-space-24, 24px);
      }
    }

    @media (max-width: 600px) {
      .stage-header-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .stage-actions-wrap {
        width: 100%;
        justify-content: flex-start;
      }
      .tool-cards-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
    }
  `]
})
export class ToolWorkspaceComponent {
  readonly listTitle = input<string>('Files to Process');
  readonly count = input<number>(0);
  readonly limit = input<number>(50);
  readonly isProcessing = input<boolean>(false);
  readonly hasMoreAction = input<boolean>(true);

  readonly addFilesClicked = output<void>();
  readonly selectAllClicked = output<void>();
  readonly resetAllClicked = output<void>();
  readonly clearAllClicked = output<void>();

  readonly isMoreOpen = signal(false);
}
