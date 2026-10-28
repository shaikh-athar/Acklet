import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';

interface DetailRow {
  label: string;
  value: string;
}

@Component({
  selector: 'ts-tool-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (tool(); as currentTool) {
      <div class="ts-details-panel" role="region" aria-label="Tool specifications and details">
        <h3 class="ts-details-title">Details</h3>

        <div class="ts-details-table" role="table">
          @for (row of detailRows(); track row.label; let idx = $index) {
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
      padding: 20px;
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: var(--ts-surface-raised-shadow);
      user-select: none;
    }

    .ts-details-title {
      font-family: var(--font-heading, "Scoutie Sans", sans-serif);
      font-size: var(--ts-type-section-label-size, 12px);
      line-height: var(--ts-type-section-label-lh, 16px);
      font-weight: var(--ts-type-section-label-weight, 600);
      text-transform: uppercase;
      letter-spacing: var(--ts-type-section-label-tracking, 0.08em);
      color: var(--text-3, #6B7280);
      margin: 0;
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
      min-height: 36px;
      padding: 0;
      border-bottom: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
    }

    .ts-details-row:last-child {
      border-bottom: none;
    }

    .ts-details-label {
      font-family: var(--font-body, "Scoutie Sans", sans-serif);
      font-size: 14px;
      line-height: 20px;
      font-weight: 500;
      color: var(--text-2, #52525B);
      white-space: nowrap;
    }

    .ts-details-value {
      font-family: var(--font-body, "Scoutie Sans", sans-serif);
      font-size: 14px;
      line-height: 20px;
      font-weight: 600;
      color: var(--text, #09090B);
      text-align: right;
      word-break: break-word;
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
