// apps/tool-file-converter/src/components/document-converter/structure-check.component.ts
import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StructureReport, StructureReviewItem } from '../../converter.models';

@Component({
  selector: 'app-structure-check',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (report(); as rep) {
      <div class="structure-container" aria-label="Detected document structure and fidelity">
        <div class="structure-header-row">
          <!-- Fidelity Pill -->
          <div
            class="fidelity-badge"
            [class.fidelity-high]="rep.fidelityLevel === 'high' || !rep.fidelityLevel"
            [class.fidelity-medium]="rep.fidelityLevel === 'medium'"
            [class.fidelity-low]="rep.fidelityLevel === 'low'"
          >
            <span class="fidelity-dot"></span>
            <span class="fidelity-text">{{ rep.fidelityLevel ? (rep.fidelityLevel | titlecase) + ' fidelity' : 'High fidelity' }}</span>
          </div>

          <!-- Detected counts -->
          <div class="structure-list">
            <span class="structure-label">Detected:</span>
            <ul class="items-list">
              <li class="structure-item" [class.needs-review]="isLowConfidence('headings')">
                <span>{{ rep.headingsCount }} {{ rep.headingsCount === 1 ? 'heading' : 'headings' }}</span>
                @if (isLowConfidence('headings')) {
                  <span class="review-tag" title="Confidence is low; check after conversion">review</span>
                }
              </li>
              <li class="separator" aria-hidden="true">•</li>
              <li class="structure-item" [class.needs-review]="isLowConfidence('tables')">
                <span>{{ rep.tablesCount }} {{ rep.tablesCount === 1 ? 'table' : 'tables' }}</span>
                @if (isLowConfidence('tables')) {
                  <span class="review-tag" title="Confidence is low; check after conversion">review</span>
                }
              </li>
              <li class="separator" aria-hidden="true">•</li>
              <li class="structure-item" [class.needs-review]="isLowConfidence('columns')">
                <span>{{ rep.columnsCount }} {{ rep.columnsCount === 1 ? 'column' : 'columns' }}</span>
                @if (isLowConfidence('columns')) {
                  <span class="review-tag" title="Confidence is low; check after conversion">review</span>
                }
              </li>
              <li class="separator" aria-hidden="true">•</li>
              <li class="structure-item" [class.needs-review]="isLowConfidence('images')">
                <span>{{ rep.imagesCount }} {{ rep.imagesCount === 1 ? 'image' : 'images' }}</span>
                @if (isLowConfidence('images')) {
                  <span class="review-tag" title="Confidence is low; check after conversion">review</span>
                }
              </li>
            </ul>
          </div>

          <!-- Review toggle button if items need review -->
          @if (rep.reviewItems && rep.reviewItems.length > 0) {
            <button
              type="button"
              class="review-toggle-btn"
              (click)="toggleReview()"
              [attr.aria-expanded]="showReview()"
              aria-controls="review-items-list"
            >
              {{ rep.reviewItems.length }} flagged for review
              <span class="toggle-icon">{{ showReview() ? '▲' : '▼' }}</span>
            </button>
          }
        </div>

        <!-- Plain language fidelity notes -->
        @if (rep.fidelityReasons && rep.fidelityReasons.length > 0) {
          <div class="fidelity-reasons-list">
            @for (reason of rep.fidelityReasons; track reason) {
              <div class="fidelity-reason-item">
                <span class="reason-bullet">ℹ</span>
                <span>{{ reason }}</span>
              </div>
            }
          </div>
        }

        <!-- Collapsible Review Items list with page and block references -->
        @if (showReview() && rep.reviewItems && rep.reviewItems.length > 0) {
          <div id="review-items-list" class="review-details-panel" role="region" aria-label="Flagged structure elements">
            <h4 class="review-panel-title">Structure Review Items</h4>
            <div class="review-cards-list">
              @for (item of rep.reviewItems; track item.page + item.blockType + item.reason) {
                <div class="review-card">
                  <div class="review-card-header">
                    <span class="review-page-pill">Page {{ item.page }}</span>
                    <span class="review-type-pill">{{ item.blockType }}</span>
                    <span class="review-conf">Confidence: {{ (item.confidence * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <div class="review-card-reason">{{ item.reason }}</div>
                  @if (item.snippet) {
                    <div class="review-card-snippet">"{{ item.snippet }}"</div>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .structure-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
    }

    .structure-header-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .fidelity-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .fidelity-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .fidelity-high {
      background: var(--color-success-bg, #ecfdf5);
      color: var(--color-success-text, #065f46);
      border: 1px solid var(--color-success-border, #a7f3d0);
    }
    .fidelity-high .fidelity-dot {
      background: var(--color-success, #10b981);
    }

    .fidelity-medium {
      background: var(--color-warning-bg, #fffbeb);
      color: var(--color-warning-text, #92400e);
      border: 1px solid var(--color-warning-border, #fde68a);
    }
    .fidelity-medium .fidelity-dot {
      background: var(--color-warning, #f59e0b);
    }

    .fidelity-low {
      background: var(--color-error-bg, #fef2f2);
      color: var(--color-error-text, #991b1b);
      border: 1px solid var(--color-error-border, #fecaca);
    }
    .fidelity-low .fidelity-dot {
      background: var(--color-error, #ef4444);
    }

    .structure-list {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      line-height: 1.4;
      color: var(--text-muted);
      flex-wrap: wrap;
    }

    .structure-label {
      font-weight: 600;
      color: var(--text-secondary);
    }

    .items-list {
      display: flex;
      align-items: center;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
      flex-wrap: wrap;
    }

    .structure-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--text-muted);
    }

    .structure-item.needs-review {
      color: var(--color-warning, #d97706);
      font-weight: 600;
    }

    .review-tag {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid var(--color-warning, #d97706);
    }

    .separator {
      color: var(--border-default);
      user-select: none;
    }

    .review-toggle-btn {
      background: transparent;
      border: 1px solid var(--color-warning, #d97706);
      color: var(--color-warning, #d97706);
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s ease;
    }
    .review-toggle-btn:hover {
      background: var(--color-warning-bg, #fffbeb);
    }

    .fidelity-reasons-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted);
      padding-left: 2px;
    }

    .fidelity-reason-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .reason-bullet {
      color: var(--text-muted);
      font-size: 11px;
    }

    .review-details-panel {
      margin-top: 6px;
      background: var(--bg-surface-elevated, #ffffff);
      border: 1px solid var(--border-default, #e2e8f0);
      border-radius: 8px;
      padding: 12px;
    }

    .review-panel-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: var(--text-primary);
    }

    .review-cards-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .review-card {
      border: 1px solid var(--color-warning-border, #fde68a);
      background: var(--color-warning-bg, #fffbeb);
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .review-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }

    .review-page-pill {
      font-weight: 600;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--text-secondary);
    }

    .review-type-pill {
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--color-warning-text, #92400e);
    }

    .review-conf {
      margin-left: auto;
      color: var(--text-muted);
    }

    .review-card-reason {
      font-size: 12px;
      font-weight: 500;
      color: var(--color-warning-text, #92400e);
    }

    .review-card-snippet {
      font-size: 11px;
      font-style: italic;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `]
})
export class StructureCheckComponent {
  readonly report = input<StructureReport | undefined>();
  readonly showReview = signal(false);

  toggleReview(): void {
    this.showReview.update(v => !v);
  }

  isLowConfidence(type: string): boolean {
    const chips = this.report()?.chips;
    if (!chips) return false;
    const chip = chips.find(c => c.type === type);
    return Boolean(chip?.lowConfidence);
  }
}
