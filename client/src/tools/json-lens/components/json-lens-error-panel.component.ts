import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsonLensResult } from '../services/json-lens.service';
import { LucideAngularModule, AlertCircle, Wrench } from 'lucide-angular';

@Component({
  selector: 'app-json-lens-error-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (result(); as res) {
      @if (!res.success) {
        <div class="compact-error-panel">
          <div class="error-badge-icon">
            <lucide-icon [img]="AlertIcon" class="icon-xs"></lucide-icon>
          </div>
          <div class="error-main-info">
            <div class="error-title-row">
              <strong>Invalid JSON</strong>
              @if (res.errorLine) {
                <span class="error-location-tag">Line {{ res.errorLine }} · Column {{ res.errorColumn }}</span>
              }
            </div>
            <div class="error-explanation">{{ res.errorExplanation || res.error }}</div>
          </div>
          <div class="error-actions">
            <button class="err-action-btn" (click)="goToErrorClick.emit()">Go to error</button>
            @if (res.repairedJson) {
              <button class="err-action-btn fix-btn" (click)="openRepairClick.emit()">
                <lucide-icon [img]="FixIcon" class="icon-xs"></lucide-icon>
                Try Fix
              </button>
            }
          </div>
        </div>
      }
    }
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensErrorPanelComponent {
  result = input<JsonLensResult | null>(null);
  
  goToErrorClick = output<void>();
  openRepairClick = output<void>();

  readonly AlertIcon = AlertCircle;
  readonly FixIcon = Wrench;
}
