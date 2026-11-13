// apps/tool-color-studio/src/components/gradient/gradient-repair.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradientConfig, GradientStop } from '../../models/color.models';
import {
  RepairStrategy,
  CustomRepairOptions,
  GradientAnalysisResult,
  GradientRepairResult,
  GradientFinding
} from '../../models/gradient-repair.models';
import { GradientAnalysisService } from '../../services/gradient-analysis.service';
import {
  GradientRepairService,
  DEFAULT_CUSTOM_REPAIR_OPTIONS
} from '../../services/gradient-repair.service';
import { GradientService } from '../../services/gradient.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-gradient-repair',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <div 
        class="repair-modal-overlay" 
        [class.closing]="isClosing()"
        (click)="onBackdropClick($event)"
        role="dialog"
        aria-modal="true"
        aria-labelledby="repair-modal-title"
      >
        <div class="repair-modal-container" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="repair-modal-header">
            <div class="header-title-wrap">
              <div class="header-icon-badge">
                <ts-icon name="wand-2" [size]="18" />
              </div>
              <div class="header-text-group">
                <h2 id="repair-modal-title" class="repair-title">Intelligent Gradient Repair & Auto Improve</h2>
                <p class="repair-subtitle">Analyze colors, stop spacing, and transitions to automatically optimize gradient quality.</p>
              </div>
            </div>

            <button 
              type="button" 
              class="close-modal-btn" 
              (click)="closeModal()"
              title="Close Repair Dialog"
              aria-label="Close"
            >
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Modal Scrollable Body -->
          <div class="repair-modal-body">
            
            <!-- Strategy Selector Bar -->
            <div class="strategy-selector-section">
              <div class="strategy-pills-row">
                @for (strat of strategies; track strat.id) {
                  <button 
                    type="button" 
                    class="strategy-pill"
                    [class.active]="selectedStrategy() === strat.id"
                    (click)="setStrategy(strat.id)"
                  >
                    <ts-icon [name]="strat.icon" [size]="13" />
                    <span>{{ strat.label }}</span>
                  </button>
                }
              </div>

              <!-- Custom Strategy Options (When custom is active) -->
              @if (selectedStrategy() === 'custom') {
                <div class="custom-options-panel">
                  <span class="custom-panel-title">Select properties to repair:</span>
                  <div class="custom-checkboxes-grid">
                    <label class="custom-checkbox-item">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="customOptions.stopPositions"
                        (change)="recomputeRepair()" 
                      />
                      <span>Normalize Stop Positions & Boundaries (0%–100%)</span>
                    </label>

                    <label class="custom-checkbox-item">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="customOptions.colorTransitions"
                        (change)="recomputeRepair()" 
                      />
                      <span>Smooth Transitions (ΔE Weighting)</span>
                    </label>

                    <label class="custom-checkbox-item">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="customOptions.colorHarmony"
                        (change)="recomputeRepair()" 
                      />
                      <span>Harmonize Colors with Primary Anchor</span>
                    </label>

                    <label class="custom-checkbox-item">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="customOptions.balanceBrightnessSaturation"
                        (change)="recomputeRepair()" 
                      />
                      <span>Balance Brightness & Saturation Extremes</span>
                    </label>

                    <label class="custom-checkbox-item">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="customOptions.gradientAngle"
                        (change)="recomputeRepair()" 
                      />
                      <span>Snap Linear Angle to Clean 45° Steps</span>
                    </label>

                    <label class="custom-checkbox-item">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="customOptions.cssConfig"
                        (change)="recomputeRepair()" 
                      />
                      <span>Validate Radial/Conic Coordinates & CSS</span>
                    </label>
                  </div>
                </div>
              }
            </div>

            <!-- Before & After Comparison Stage -->
            <div class="comparison-stage-grid">
              
              <!-- Original Gradient Card -->
              <div class="comparison-card original-card">
                <div class="comparison-header">
                  <span class="card-badge original-badge">Original Gradient</span>
                  <span class="spec-tag">{{ getOriginalSummary() }}</span>
                </div>

                <div 
                  class="preview-viewport-box"
                  [style.background]="originalCss()"
                ></div>

                <div class="stops-summary-strip">
                  @for (stop of originalConfig.stops; track stop.id; let idx = $index) {
                    <div class="stop-mini-pill">
                      <span class="color-dot" [style.background-color]="stop.color"></span>
                      <span class="pos-text">{{ stop.position }}%</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Repaired Gradient Card -->
              <div class="comparison-card repaired-card">
                <div class="comparison-header">
                  <span class="card-badge repaired-badge">Repaired Gradient</span>
                  <span class="spec-tag accent-spec">{{ getRepairedSummary() }}</span>
                </div>

                <div 
                  class="preview-viewport-box"
                  [style.background]="repairedCss()"
                ></div>

                <div class="stops-summary-strip">
                  @for (stop of activeRepairedConfig()?.stops; track stop.id; let idx = $index) {
                    <div 
                      class="stop-mini-pill"
                      [class.changed]="isStopModified(stop, idx)"
                    >
                      <span class="color-dot" [style.background-color]="stop.color"></span>
                      <span class="pos-text">{{ stop.position }}%</span>
                    </div>
                  }
                </div>
              </div>

            </div>

            <!-- Analysis Summary Badges -->
            <div class="analysis-summary-bar">
              <div class="summary-metric-card">
                <span class="metric-label">Stop Positions</span>
                <span 
                  class="status-chip"
                  [class.status-good]="repairResult()?.analysis?.summary?.stopPositionsStatus === 'good'"
                  [class.status-warn]="repairResult()?.analysis?.summary?.stopPositionsStatus === 'needs-attention'"
                >
                  {{ repairResult()?.analysis?.summary?.stopPositionsStatus === 'good' ? 'Optimal' : 'Adjusted' }}
                </span>
              </div>

              <div class="summary-metric-card">
                <span class="metric-label">Color Transitions</span>
                <span 
                  class="status-chip"
                  [class.status-good]="repairResult()?.analysis?.summary?.transitionsStatus === 'good'"
                  [class.status-warn]="repairResult()?.analysis?.summary?.transitionsStatus === 'needs-attention'"
                >
                  {{ repairResult()?.analysis?.summary?.transitionsStatus === 'good' ? 'Smooth' : 'Improved' }}
                </span>
              </div>

              <div class="summary-metric-card">
                <span class="metric-label">Color Harmony</span>
                <span class="status-chip status-info">
                  {{ repairResult()?.analysis?.summary?.colorHarmonyLabel || 'Cohesive' }}
                </span>
              </div>

              <div class="summary-metric-card">
                <span class="metric-label">CSS Validity</span>
                <span class="status-chip status-good">
                  Valid CSS
                </span>
              </div>
            </div>

            <!-- Changes & Findings List -->
            <div class="findings-section">
              <h3 class="findings-section-title">Automated Improvements ({{ repairResult()?.changesMade?.length || 0 }})</h3>
              
              <div class="changes-list">
                @for (change of repairResult()?.changesMade; track change) {
                  <div class="change-item-row">
                    <span class="check-icon-wrap">
                      <ts-icon name="check" [size]="12" />
                    </span>
                    <span class="change-text">{{ change }}</span>
                  </div>
                }
              </div>

              <!-- Actionable Issues Details Accordion -->
              @if (initialAnalysis()?.findings?.length) {
                <div class="detailed-findings-wrap">
                  <div class="findings-accordion-header" (click)="toggleAccordion()">
                    <span class="accordion-title">Diagnostic Findings ({{ initialAnalysis()?.findings?.length }})</span>
                    <ts-icon [name]="isAccordionOpen() ? 'chevron-up' : 'chevron-down'" [size]="14" />
                  </div>

                  @if (isAccordionOpen()) {
                    <div class="accordion-content-list">
                      @for (finding of initialAnalysis()?.findings; track finding.id) {
                        <div class="finding-card" [class.severity-error]="finding.severity === 'error'">
                          <div class="finding-header">
                            <span 
                              class="severity-badge"
                              [class.badge-error]="finding.severity === 'error'"
                              [class.badge-warn]="finding.severity === 'warning'"
                              [class.badge-sugg]="finding.severity === 'suggestion'"
                              [class.badge-info]="finding.severity === 'info'"
                            >
                              {{ finding.severity | uppercase }}
                            </span>
                            <span class="finding-title">{{ finding.title }}</span>
                          </div>
                          <p class="finding-message">{{ finding.message }}</p>

                          @if (finding.originalValue && finding.suggestedValue) {
                            <div class="finding-diff-pill">
                              <span class="diff-before">Original: {{ finding.originalValue }}</span>
                              <span class="diff-arrow">→</span>
                              <span class="diff-after">Repaired: {{ finding.suggestedValue }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

          </div>

          <!-- Modal Footer Actions -->
          <div class="repair-modal-footer">
            <div class="footer-left-actions">
              <button 
                type="button" 
                class="modal-secondary-btn" 
                (click)="closeModal()"
                title="Discard repair and keep original"
              >
                <span>Keep Original</span>
              </button>

              <button 
                type="button" 
                class="modal-secondary-btn" 
                (click)="cycleStrategy()"
                title="Try next repair strategy"
              >
                <ts-icon name="refresh-cw" [size]="13" />
                <span>Try Another Strategy</span>
              </button>
            </div>

            <div class="footer-right-actions">
              <button 
                type="button" 
                class="modal-apply-btn primary" 
                data-variant="primary"
                (click)="applyRepair()"
                title="Apply repaired gradient to workspace"
              >
                <ts-icon name="check" [size]="14" />
                <span>Apply Repair</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Modal Overlay Backdrop Animation ── */
    .repair-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: modalFadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .repair-modal-overlay.closing {
      animation: modalFadeOut 150ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
      pointer-events: none;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    /* ── Modal Dialog Container Animation ── */
    .repair-modal-container {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 14px;
      width: 100%;
      max-width: 860px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: modalScaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .repair-modal-overlay.closing .repair-modal-container {
      animation: modalScaleOut 150ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes modalScaleIn {
      from { transform: translateY(12px) scale(0.96); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes modalScaleOut {
      from { transform: translateY(0) scale(1); opacity: 1; }
      to { transform: translateY(12px) scale(0.96); opacity: 0; }
    }

    :host-context([data-theme="light"]) .repair-modal-container {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    /* ── Header ── */
    .repair-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .repair-modal-header {
      border-bottom-color: rgba(0, 0, 0, 0.08);
    }

    .header-title-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(37, 99, 235, 0.15);
      color: var(--tool-accent, #2563EB);
    }

    .header-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .repair-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .repair-title {
      color: #0F172A;
    }

    .repair-subtitle {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
    }

    :host-context([data-theme="light"]) .repair-subtitle {
      color: #475569;
    }

    .close-modal-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .close-modal-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .close-modal-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    /* ── Scrollable Body ── */
    .repair-modal-body {
      padding: 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ── Strategy Segmented Control ── */
    .strategy-selector-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .strategy-pills-row {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-2, #27272A);
      padding: 4px;
      border-radius: 8px;
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .strategy-pills-row {
      background: #F1F5F9;
    }

    .strategy-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .strategy-pill {
      color: #475569;
    }

    .strategy-pill.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .strategy-pill.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    /* ── Custom Options ── */
    .custom-options-panel {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .custom-options-panel {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .custom-panel-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .custom-panel-title {
      color: #0F172A;
    }

    .custom-checkboxes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    @media (max-width: 640px) {
      .custom-checkboxes-grid {
        grid-template-columns: 1fr;
      }
    }

    .custom-checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .custom-checkbox-item {
      color: #334155;
    }

    /* ── Comparison Stage Grid ── */
    .comparison-stage-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 700px) {
      .comparison-stage-grid {
        grid-template-columns: 1fr;
      }
    }

    .comparison-card {
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    :host-context([data-theme="light"]) .comparison-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .repaired-card {
      border-color: rgba(37, 99, 235, 0.4);
    }

    .comparison-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .original-badge {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .original-badge {
      background: #E2E8F0;
      color: #475569;
    }

    .repaired-badge {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
    }

    .spec-tag {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .spec-tag {
      color: #475569;
    }

    .accent-spec {
      color: var(--tool-accent, #2563EB);
      font-weight: 700;
    }

    .preview-viewport-box {
      width: 100%;
      height: 120px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .stops-summary-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .stop-mini-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 6px;
      border-radius: 5px;
      background: var(--bg-1, #18181B);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .stop-mini-pill {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .stop-mini-pill.changed {
      border-color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.1);
    }

    .color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .pos-text {
      font-size: 10px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .pos-text {
      color: #0F172A;
    }

    /* ── Metric Summary Bar ── */
    .analysis-summary-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    @media (max-width: 600px) {
      .analysis-summary-bar {
        grid-template-columns: 1fr 1fr;
      }
    }

    .summary-metric-card {
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    :host-context([data-theme="light"]) .summary-metric-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .metric-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .metric-label {
      color: #64748B;
    }

    .status-chip {
      font-size: 11px;
      font-weight: 700;
    }

    .status-good {
      color: #10B981;
    }

    .status-warn {
      color: #F59E0B;
    }

    .status-info {
      color: var(--tool-accent, #2563EB);
    }

    /* ── Findings Section ── */
    .findings-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .findings-section-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .findings-section-title {
      color: #0F172A;
    }

    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .change-item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .change-item-row {
      color: #1E293B;
    }

    .check-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      flex-shrink: 0;
    }

    /* ── Accordion ── */
    .detailed-findings-wrap {
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .detailed-findings-wrap {
      border-color: rgba(0, 0, 0, 0.08);
    }

    .findings-accordion-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: var(--bg-2, #27272A);
      cursor: pointer;
      user-select: none;
    }

    :host-context([data-theme="light"]) .findings-accordion-header {
      background: #F1F5F9;
    }

    .accordion-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .accordion-title {
      color: #334155;
    }

    .accordion-content-list {
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--bg-1, #18181B);
    }

    :host-context([data-theme="light"]) .accordion-content-list {
      background: #FFFFFF;
    }

    .finding-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .finding-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .finding-card.severity-error {
      border-color: rgba(239, 68, 68, 0.3);
    }

    .finding-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .severity-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .badge-error { background: rgba(239, 68, 68, 0.2); color: #EF4444; }
    .badge-warn { background: rgba(245, 158, 11, 0.2); color: #F59E0B; }
    .badge-sugg { background: rgba(37, 99, 235, 0.2); color: #2563EB; }
    .badge-info { background: rgba(161, 161, 170, 0.2); color: #A1A1AA; }

    .finding-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .finding-title {
      color: #0F172A;
    }

    .finding-message {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
      margin: 0;
      line-height: 1.35;
    }

    :host-context([data-theme="light"]) .finding-message {
      color: #475569;
    }

    .finding-diff-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.2);
      width: fit-content;
      margin-top: 2px;
    }

    :host-context([data-theme="light"]) .finding-diff-pill {
      background: #E2E8F0;
    }

    .diff-before { color: #EF4444; }
    .diff-arrow { color: var(--text-muted, #71717A); }
    .diff-after { color: #10B981; font-weight: 700; }

    /* ── Modal Footer Actions ── */
    .repair-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--bg-1, #18181B);
      flex-wrap: wrap;
      gap: 10px;
    }

    :host-context([data-theme="light"]) .repair-modal-footer {
      border-top-color: rgba(0, 0, 0, 0.08);
      background: #FFFFFF;
    }

    .footer-left-actions,
    .footer-right-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-secondary-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .modal-secondary-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
      color: #0F172A;
    }

    .modal-secondary-btn:hover {
      background: var(--bg-3, #3F3F46) !important;
      border-color: var(--tool-accent, #2563EB) !important;
      color: var(--tool-accent, #2563EB) !important;
    }

    :host-context([data-theme="light"]) .modal-secondary-btn:hover {
      background: #E2E8F0 !important;
      border-color: #2563EB !important;
      color: #2563EB !important;
    }

    .modal-apply-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 6px;
      background: var(--tool-accent, #2563EB) !important;
      border: 1px solid var(--tool-accent, #2563EB) !important;
      color: #FFFFFF !important;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 120ms ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .modal-apply-btn:hover:not(:disabled) {
      background: #1D4ED8 !important;
      border-color: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }

    .modal-apply-btn:active:not(:disabled) {
      background: #1E40AF !important;
      border-color: #1E40AF !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .modal-apply-btn {
      background: #2563EB !important;
      border-color: #2563EB !important;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .modal-apply-btn:hover:not(:disabled) {
      background: #1D4ED8 !important;
      border-color: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
    }
  `]
})
export class GradientRepairComponent implements OnChanges {
  @Input({ required: true }) public isOpen = false;
  @Input({ required: true }) public originalConfig!: GradientConfig;
  @Output() public close = new EventEmitter<void>();
  @Output() public applied = new EventEmitter<GradientConfig>();

  private analysisService = inject(GradientAnalysisService);
  private repairService = inject(GradientRepairService);
  private gradientService = inject(GradientService);

  public selectedStrategy = signal<RepairStrategy>('balanced');
  public isAccordionOpen = signal<boolean>(false);
  public isClosing = signal<boolean>(false);
  public customOptions: CustomRepairOptions = { ...DEFAULT_CUSTOM_REPAIR_OPTIONS };

  public initialAnalysis = signal<GradientAnalysisResult | null>(null);
  public repairResult = signal<GradientRepairResult | null>(null);

  public strategies: { id: RepairStrategy; label: string; icon: string; desc: string }[] = [
    {
      id: 'balanced',
      label: 'Balanced (Recommended)',
      icon: 'sparkles',
      desc: 'Normalizes stop boundaries (0%–100%), resolves pinch points, and eliminates crowded positions while preserving your visual identity.'
    },
    {
      id: 'smooth',
      label: 'Smooth Transitions',
      icon: 'sliders-horizontal',
      desc: 'Proportionally spaces stops according to perceptual color distance (CIELAB ΔE) to eliminate harsh color banding and hot spots.'
    },
    {
      id: 'harmony',
      label: 'Color Harmony',
      icon: 'compass',
      desc: 'Anchors on your primary stop and gently tunes discordant stop hues and saturation into an analogous aesthetic relationship.'
    },
    {
      id: 'contrast',
      label: 'Contrast Optimized',
      icon: 'eye',
      desc: 'Enhances luminance steps across consecutive stops for high contrast separation, visual depth, and text overlay clarity.'
    },
    {
      id: 'custom',
      label: 'Custom Repair',
      icon: 'settings',
      desc: 'Select individual properties to repair without altering other aspects of your gradient.'
    }
  ];

  public currentStrategyDescription = computed(() => {
    const s = this.strategies.find(item => item.id === this.selectedStrategy());
    return s?.desc || '';
  });

  public activeRepairedConfig = computed(() => {
    return this.repairResult()?.repairedConfig || null;
  });

  public originalCss = computed(() => {
    if (!this.originalConfig) return '';
    return this.gradientService.generateCss(this.originalConfig);
  });

  public repairedCss = computed(() => {
    const rep = this.activeRepairedConfig();
    if (!rep) return '';
    return this.gradientService.generateCss(rep);
  });

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.isClosing.set(false);
      if (this.originalConfig) {
        this.runInitialAnalysis();
        this.recomputeRepair();
      }
    } else if (changes['originalConfig'] && this.originalConfig) {
      this.runInitialAnalysis();
      this.recomputeRepair();
    }
  }

  public runInitialAnalysis(): void {
    const result = this.analysisService.analyze(this.originalConfig);
    this.initialAnalysis.set(result);
  }

  public setStrategy(strategy: RepairStrategy): void {
    this.selectedStrategy.set(strategy);
    this.recomputeRepair();
  }

  public toggleCustomOption(key: keyof CustomRepairOptions): void {
    this.customOptions[key] = !this.customOptions[key];
    this.recomputeRepair();
  }

  public resetRepair(): void {
    this.selectedStrategy.set('balanced');
    this.customOptions = { ...DEFAULT_CUSTOM_REPAIR_OPTIONS };
    this.recomputeRepair();
  }

  public recomputeRepair(): void {
    if (!this.originalConfig) return;
    const result = this.repairService.repair(
      this.originalConfig,
      this.selectedStrategy(),
      this.customOptions
    );
    this.repairResult.set(result);
  }

  public cycleStrategy(): void {
    const order: RepairStrategy[] = ['balanced', 'smooth', 'harmony', 'contrast', 'custom'];
    const idx = order.indexOf(this.selectedStrategy());
    const next = order[(idx + 1) % order.length];
    this.setStrategy(next);
  }

  public toggleAccordion(): void {
    this.isAccordionOpen.update(v => !v);
  }

  public isStopModified(stop: GradientStop, index: number): boolean {
    const orig = this.originalConfig?.stops[index];
    if (!orig) return true;
    return orig.position !== stop.position || orig.color.toUpperCase() !== stop.color.toUpperCase();
  }

  public getOriginalSummary(): string {
    if (!this.originalConfig) return '';
    return `${this.originalConfig.type.toUpperCase()} • ${this.originalConfig.stops.length} stops`;
  }

  public getRepairedSummary(): string {
    const rep = this.activeRepairedConfig();
    if (!rep) return '';
    return `${this.selectedStrategy().toUpperCase()} REPAIR • ${rep.stops.length} stops`;
  }

  public onBackdropClick(event: MouseEvent): void {
    this.closeModal();
  }

  public closeModal(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.close.emit();
      this.isClosing.set(false);
    }, 150);
  }

  public applyRepair(): void {
    if (this.isClosing()) return;
    const rep = this.activeRepairedConfig();
    if (rep) {
      this.isClosing.set(true);
      setTimeout(() => {
        this.applied.emit(rep);
        this.isClosing.set(false);
      }, 150);
    }
  }
}
