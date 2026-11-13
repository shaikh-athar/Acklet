// apps/tool-watermark-remover/src/components/processing-indicator/processing-indicator.component.ts
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { InpaintingProgress } from '../../models/watermark.models';

@Component({
  selector: 'app-processing-indicator',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="processing-backdrop animate-fade-in" role="status" aria-live="polite">
      <div class="processing-card">
        
        <!-- Processing Icon -->
        <div class="processing-icon-box">
          <ts-icon name="wand-2" [size]="28" class="processing-icon animate-pulse" />
        </div>

        <h3 class="processing-title">Removing Watermark...</h3>
        <p class="processing-message">{{ progress().message }}</p>

        <!-- Progress Bar -->
        <div class="progress-bar-track">
          <div 
            class="progress-bar-fill" 
            [style.width.%]="progress().progress"
          ></div>
        </div>

        <div class="progress-footer">
          <span class="progress-percent">{{ progress().progress }}%</span>
          <span class="progress-phase">{{ progress().phase }}</span>
        </div>

        <!-- Cancel Button -->
        <button 
          type="button" 
          class="btn-cancel" 
          (click)="cancel.emit()"
        >
          <span>Cancel</span>
        </button>

      </div>
    </div>
  `,
  styles: [`
    .processing-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: var(--ts-space-16, 16px);
      box-sizing: border-box;
    }

    .processing-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 100%;
      max-width: 400px;
      padding: var(--ts-space-24, 24px);
      border-radius: var(--ts-radius-card, 20px);
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }

    .processing-icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--accent, #3B82F6);
      margin-bottom: var(--ts-space-16, 16px);
    }

    .processing-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text, #F3F4F6);
      margin: 0 0 6px 0;
    }

    .processing-message {
      font-size: 13px;
      color: var(--text-2, #94A3B8);
      margin: 0 0 var(--ts-space-20, 20px) 0;
      min-height: 20px;
    }

    .progress-bar-track {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.1));
      overflow: hidden;
      margin-bottom: var(--ts-space-8, 8px);
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3B82F6, #8B5CF6);
      border-radius: 4px;
      transition: width var(--ts-dur-fast, 150ms) ease;
    }

    .progress-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      font-size: 12px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-3, #64748B);
      margin-bottom: var(--ts-space-20, 20px);
    }

    .progress-percent {
      font-weight: 700;
      color: var(--text, #F3F4F6);
    }

    .progress-phase {
      text-transform: capitalize;
    }

    .btn-cancel {
      padding: 8px 20px;
      border-radius: var(--ts-radius-control, 10px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.05));
      color: var(--text, #F3F4F6);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .btn-cancel:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: #EF4444;
      color: #EF4444;
    }

    .animate-pulse {
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.12); opacity: 0.8; }
    }
  `]
})
export class ProcessingIndicatorComponent {
  readonly progress = input.required<InpaintingProgress>();
  readonly cancel = output<void>();
}

