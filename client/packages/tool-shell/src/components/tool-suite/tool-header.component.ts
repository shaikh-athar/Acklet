// packages/tool-shell/src/components/tool-suite/tool-header.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../icon/ts-icon.component';

export type ToolHeaderTab = 'tool' | 'about' | 'how-to-use' | 'faq' | 'related';

@Component({
  selector: 'app-tool-header',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="tool-header-bar">
      <!-- Left: Breadcrumb -->
      <div class="tool-breadcrumb">
        <a href="/" class="crumb-brand" aria-label="Acklet Home">
          <ts-icon name="zap" [size]="18" class="crumb-icon" />
          <span class="crumb-brand-text">Acklet</span>
        </a>
        <span class="crumb-sep">/</span>
        <span class="crumb-tool-name">{{ toolName() }}</span>
      </div>

      <!-- Center: Fixed 5 Canonical Tabs -->
      <nav class="tool-nav-tabs" aria-label="Tool sections">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            class="nav-tab-btn"
            [class.is-active]="activeTab() === tab.id"
            (click)="selectTab(tab.id)"
            [attr.aria-current]="activeTab() === tab.id ? 'page' : null"
          >
            <span>{{ tab.label }}</span>
          </button>
        }
      </nav>

      <!-- Right: Share and Save Actions -->
      <div class="tool-header-actions">
        <button
          type="button"
          class="header-action-btn btn-share"
          (click)="shareClicked.emit()"
          title="Share tool"
          aria-label="Share tool"
        >
          <ts-icon name="share-2" [size]="15" />
          <span class="action-label hide-xs">Share</span>
        </button>

        <button
          type="button"
          class="header-action-btn btn-save"
          [class.is-saved]="isSaved()"
          (click)="saveToggled.emit(!isSaved())"
          [title]="isSaved() ? 'Saved to Favorites' : 'Save tool to favorites'"
          [attr.aria-label]="isSaved() ? 'Saved to Favorites' : 'Save tool'"
        >
          <ts-icon [name]="isSaved() ? 'star' : 'star'" [size]="15" [class.is-filled]="isSaved()" />
          <span class="action-label">{{ isSaved() ? 'Saved' : 'Save' }}</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tool-header-bar {
      height: var(--tool-header-height, 56px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 var(--tool-content-padding, 24px);
      max-width: var(--tool-page-max-width, 1280px);
      margin: 0 auto;
      box-sizing: border-box;
      font-family: var(--tool-font-family, inherit);
    }

    /* ── Breadcrumb ── */
    .tool-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .crumb-brand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text, #0F172A);
      text-decoration: none;
      transition: opacity 150ms ease;
    }

    :host-context([data-theme="dark"]) .crumb-brand,
    [data-theme="dark"] .crumb-brand {
      color: #F8FAFC;
    }

    .crumb-brand:hover {
      opacity: 0.8;
    }

    .crumb-icon {
      color: var(--tool-accent, #2563EB);
    }

    .crumb-sep {
      color: var(--text-muted, #94A3B8);
    }

    .crumb-tool-name {
      color: var(--text-secondary, #475569);
    }

    :host-context([data-theme="dark"]) .crumb-tool-name,
    [data-theme="dark"] .crumb-tool-name {
      color: #CBD5E1;
    }

    /* ── Tabs (Strict 5 Canonical) ── */
    .tool-nav-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--ts-surface-inset, rgba(15, 23, 42, 0.04));
      padding: 3px;
      border-radius: var(--tool-radius-pill, 999px);
      border: 1px solid var(--border-subtle, #E2E8F0);
    }

    :host-context([data-theme="dark"]) .tool-nav-tabs,
    [data-theme="dark"] .tool-nav-tabs {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .nav-tab-btn {
      height: 30px;
      padding: 0 14px;
      border-radius: var(--tool-radius-pill, 999px);
      border: none;
      background: transparent;
      color: var(--text-muted, #64748B);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .nav-tab-btn,
    [data-theme="dark"] .nav-tab-btn {
      color: #94A3B8;
    }

    .nav-tab-btn:hover:not(.is-active) {
      color: var(--text, #0F172A);
      background: rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="dark"]) .nav-tab-btn:hover:not(.is-active),
    [data-theme="dark"] .nav-tab-btn:hover:not(.is-active) {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-tab-btn.is-active {
      background: #FFFFFF;
      color: var(--tool-accent, #2563EB);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    :host-context([data-theme="dark"]) .nav-tab-btn.is-active,
    [data-theme="dark"] .nav-tab-btn.is-active {
      background: #27272A;
      color: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* ── Right Actions: Share & Save ── */
    .tool-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-action-btn {
      height: 36px;
      padding: 0 14px;
      border-radius: var(--tool-radius-control, 12px);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .btn-share {
      background: transparent;
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
    }

    :host-context([data-theme="dark"]) .btn-share,
    [data-theme="dark"] .btn-share {
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .btn-share:hover {
      background: rgba(0, 0, 0, 0.04);
      border-color: var(--text-muted, #94A3B8);
    }

    :host-context([data-theme="dark"]) .btn-share:hover,
    [data-theme="dark"] .btn-share:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* Save button: Exactly Outlined (Save) vs Filled Accent (Saved) */
    .btn-save {
      background: transparent;
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #0F172A);
    }

    :host-context([data-theme="dark"]) .btn-save,
    [data-theme="dark"] .btn-save {
      border-color: rgba(255, 255, 255, 0.12);
      color: #F8FAFC;
    }

    .btn-save:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .btn-save.is-saved {
      background: var(--tool-accent, #2563EB) !important;
      border-color: var(--tool-accent, #2563EB) !important;
      color: var(--tool-accent-contrast, #FFFFFF) !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }

    .btn-save.is-saved .is-filled {
      fill: currentColor;
    }

    @media (max-width: 860px) {
      .tool-nav-tabs {
        display: none;
      }
    }

    @media (max-width: 500px) {
      .hide-xs {
        display: none;
      }
      .header-action-btn {
        padding: 0 10px;
      }
    }
  `]
})
export class ToolHeaderComponent {
  readonly toolName = input.required<string>();
  readonly activeTab = input<ToolHeaderTab>('tool');
  readonly isSaved = input<boolean>(false);

  readonly tabSelected = output<ToolHeaderTab>();
  readonly shareClicked = output<void>();
  readonly saveToggled = output<boolean>();

  readonly tabs: Array<{ id: ToolHeaderTab; label: string }> = [
    { id: 'tool', label: 'Tool' },
    { id: 'about', label: 'About' },
    { id: 'how-to-use', label: 'How to use' },
    { id: 'faq', label: 'FAQ' },
    { id: 'related', label: 'Related' }
  ];

  selectTab(tabId: ToolHeaderTab): void {
    this.tabSelected.emit(tabId);
  }
}
