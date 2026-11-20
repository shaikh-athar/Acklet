// packages/tool-shell/src/components/tool-suite/settings-panel.component.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsSectionType } from '../../models/tool-config.models';

@Component({
  selector: 'app-settings-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tool-settings-card">
      <div class="panel-header">
        <h3 class="panel-title">{{ title() }}</h3>
        @if (subtitle()) {
          <span class="panel-subtitle">{{ subtitle() }}</span>
        }
      </div>

      <div class="panel-sections-body">
        @for (section of visibleSections(); track section) {
          <div class="panel-section">
            <label class="section-label">{{ sectionLabel(section) }}</label>
            <ng-content [select]="'[section-' + section.toLowerCase() + ']'" />
          </div>
        }
        <ng-content />
      </div>

      <div class="panel-footer-slot">
        <ng-content select="[panel-footer]" />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tool-settings-card {
      width: 100%;
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: var(--tool-radius-panel, 20px);
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: var(--tool-font-family, inherit);
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .tool-settings-card,
    [data-theme="dark"] .tool-settings-card {
      background: #18181B;
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    }

    .panel-header {
      padding: var(--tool-space-16, 16px) var(--tool-space-20, 20px);
      border-bottom: 1px solid var(--border-subtle, #F1F5F9);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="dark"]) .panel-header,
    [data-theme="dark"] .panel-header {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }

    .panel-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #0F172A);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .panel-title,
    [data-theme="dark"] .panel-title {
      color: #F8FAFC;
    }

    .panel-subtitle {
      font-size: 12px;
      color: var(--text-muted, #64748B);
    }

    .panel-sections-body {
      padding: var(--tool-space-16, 16px) var(--tool-space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--tool-space-20, 20px);
      max-height: calc(100vh - 220px);
      overflow-y: auto;
    }

    .panel-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .section-label {
      font-size: var(--tool-type-label-size, 12px);
      line-height: var(--tool-type-label-lh, 16px);
      font-weight: var(--tool-type-label-weight, 600);
      letter-spacing: var(--tool-type-label-tracking, 0.06em);
      text-transform: uppercase;
      color: var(--text-muted, #64748B);
    }

    :host-context([data-theme="dark"]) .section-label,
    [data-theme="dark"] .section-label {
      color: #A1A1AA;
    }

    .panel-footer-slot {
      padding: var(--tool-space-16, 16px) var(--tool-space-20, 20px);
      border-top: 1px solid var(--border-subtle, #F1F5F9);
    }

    :host-context([data-theme="dark"]) .panel-footer-slot,
    [data-theme="dark"] .panel-footer-slot {
      border-top-color: rgba(255, 255, 255, 0.08);
    }
  `]
})
export class SettingsPanelComponent {
  readonly title = input<string>('Settings');
  readonly subtitle = input<string>('Applies to all files');
  readonly visibleSections = input<SettingsSectionType[]>(['TARGET', 'QUALITY']);

  sectionLabel(sec: SettingsSectionType): string {
    return sec;
  }
}
