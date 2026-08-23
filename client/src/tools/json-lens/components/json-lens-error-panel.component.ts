import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JsonLensResult } from '../services/json-lens.service';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-error-panel',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (result(); as res) {
      @if (!res.success) {
        <div class="compact-error-panel">
          <div class="error-badge-icon">
            <app-icon name="shield-alert" class="icon-xs"></app-icon>
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
              <button class="btn-fix-sm" (click)="fixClick.emit()">
                <app-icon name="wand-2" class="icon-xs"></app-icon>
                Smart Auto-Fix
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
  fixClick = output<void>();
}
