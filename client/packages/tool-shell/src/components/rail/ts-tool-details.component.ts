// packages/tool-shell/src/components/rail/ts-tool-details.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';

interface DetailRow {
  label: string;
  value: string;
}

@Component({
  selector: 'ts-tool-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tool(); as currentTool) {
      <div class="ts-details-panel" role="region" aria-label="Tool specifications and details">
        <h3 class="ts-details-title">Details</h3>

        <div class="ts-details-table" role="table">
          @for (row of detailRows(); track row.label) {
            <div class="ts-details-row" role="row">
              <span class="ts-details-label" role="rowheader">{{ row.label }}</span>
              <span class="ts-details-value" role="cell">{{ row.value }}</span>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ts-details-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: var(--surface-hover, #F4F4F5);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      border-radius: var(--ts-radius-tile, 14px);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      user-select: none;
    }

    :host-context([data-theme="dark"]) .ts-details-panel {
      background: #18181B;
      border-color: var(--border, #27272A);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .ts-details-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: var(--ts-type-label-size, 13px);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, #71717A);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .ts-details-title {
      color: var(--text-muted, #A1A1AA);
    }

    .ts-details-table {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .ts-details-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 0;
      border-bottom: 1px solid var(--border, rgba(0, 0, 0, 0.06));
    }

    :host-context([data-theme="dark"]) .ts-details-row {
      border-bottom-color: var(--border, rgba(255, 255, 255, 0.06));
    }

    .ts-details-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .ts-details-row:first-child {
      padding-top: 4px;
    }

    .ts-details-label {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: var(--ts-type-label-size, 13px);
      line-height: var(--ts-type-label-lh, 18px);
      font-weight: 500;
      color: var(--text-muted, #71717A);
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .ts-details-label {
      color: var(--text-muted, #A1A1AA);
    }

    .ts-details-value {
      font-family: var(--font-body, "Nunito", sans-serif);
      font-size: var(--ts-type-label-size, 13px);
      line-height: var(--ts-type-label-lh, 18px);
      font-weight: var(--ts-type-label-weight, 600);
      color: var(--text, #18181B);
      text-align: right;
      word-break: break-word;
    }

    :host-context([data-theme="dark"]) .ts-details-value {
      color: var(--text, #FCFCFC);
    }
  `]
})
export class TsToolDetailsComponent {
  readonly tool = input<ToolRegistryItem | null>(null);

  readonly detailRows = computed<DetailRow[]>(() => {
    const t = this.tool();
    if (!t) return [];

    const rows: DetailRow[] = [
      { label: 'Category', value: t.category || 'Utilities' },
      { label: 'Price', value: 'Free' },
      { label: 'Platform', value: 'Web browser' },
      { label: 'Sign-up', value: 'Not required' }
    ];

    // Tool facts from registry (e.g., Max file size, Auto delete, Encryption)
    if (t.facts && t.facts.length > 0) {
      for (const fact of t.facts) {
        // Avoid duplicate label if already present in standard rows
        if (!rows.some(r => r.label.toLowerCase() === fact.label.toLowerCase())) {
          rows.push({ label: fact.label, value: fact.value });
        }
      }
    } else if (t.highlights && t.highlights.length > 0) {
      // Fallback to highlights if facts not explicitly passed
      for (const h of t.highlights) {
        if (!rows.some(r => r.label.toLowerCase() === h.label.toLowerCase())) {
          rows.push({ label: h.label, value: h.value });
        }
      }
    }

    return rows;
  });
}
