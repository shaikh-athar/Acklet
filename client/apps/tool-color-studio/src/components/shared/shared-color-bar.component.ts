// apps/tool-color-studio/src/components/shared/shared-color-bar.component.ts
import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-shared-color-bar',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shared-color-bar-root" role="region" aria-label="Shared Color and Working Palette">
      
      <!-- Left: Active Color Display & Quick Copy -->
      <div class="active-swatch-cluster">
        
        <!-- Large Interactive Swatch -->
        <div class="swatch-wrapper">
          <div 
            class="swatch-preview"
            [style.background-color]="state.activeColor()"
            [title]="'Active: ' + state.activeColor()"
          ></div>
        </div>

        <div class="active-color-meta">
          <div class="meta-headline">
            <span class="active-hex">{{ state.activeColor() }}</span>
            <button 
              type="button" 
              class="quick-copy-icon-btn" 
              title="Copy HEX"
              aria-label="Copy HEX code"
              (click)="state.copyToClipboard(state.activeColor(), 'HEX')"
            >
              <ts-icon name="copy" [size]="13" />
            </button>
          </div>
          <div class="meta-subline">
            <span class="color-model-tag">{{ state.activeColorObj().rgbString }}</span>
            <span class="meta-dot">•</span>
            <span class="color-model-tag">{{ state.activeColorObj().hslString }}</span>
          </div>
        </div>

      </div>

      <!-- Center: Shared Working Palette Strip -->
      <div class="shared-palette-strip">
        <div class="palette-header-row">
          <span class="palette-title">Working Palette</span>
          <span class="palette-count">{{ state.sharedWorkingPalette().length }}/10</span>
        </div>

        <div class="palette-swatches-row">
          @for (hex of state.sharedWorkingPalette(); track hex; let idx = $index) {
            <div 
              class="working-swatch-slot" 
              [class.active]="state.activeColor().toUpperCase() === hex.toUpperCase()"
              [style.background-color]="hex"
              [title]="'Select ' + hex"
              (click)="state.setActiveColor(hex)"
            >
              <button 
                type="button" 
                class="remove-slot-btn" 
                title="Remove swatch"
                aria-label="Remove color from palette"
                (click)="$event.stopPropagation(); state.removeFromSharedPalette(idx)"
              >
                <ts-icon name="x" [size]="10" />
              </button>
            </div>
          }

          <!-- Add Active Color Button -->
          <button 
            type="button" 
            class="add-swatch-slot-btn" 
            title="Add active color to working palette"
            (click)="state.addToSharedPalette(state.activeColor())"
          >
            <ts-icon name="plus" [size]="14" />
          </button>
        </div>
      </div>

      <!-- Right: Cross-Module Transfer Actions -->
      <div class="cross-module-actions">
        
        <div class="actions-header-row">
          <span class="actions-label">Cross-Module Actions</span>
        </div>

        <div class="action-buttons-row">
          
          <!-- Send to Contrast (FG) -->
          <button 
            type="button" 
            class="action-pill-btn" 
            title="Use as text in Contrast Checker"
            (click)="state.sendToContrast(state.activeColor(), 'fg')"
          >
            <ts-icon name="check-circle" [size]="13" />
            <span>Contrast Text</span>
          </button>

          <!-- Send to Contrast (BG) -->
          <button 
            type="button" 
            class="action-pill-btn" 
            title="Use as background in Contrast Checker"
            (click)="state.sendToContrast(state.activeColor(), 'bg')"
          >
            <ts-icon name="square" [size]="13" />
            <span>Contrast BG</span>
          </button>

          <!-- Add to Gradient -->
          <button 
            type="button" 
            class="action-pill-btn" 
            title="Add color stop to CSS Gradient"
            (click)="state.sendToGradient(state.activeColor())"
          >
            <ts-icon name="layers" [size]="13" />
            <span>+ Gradient</span>
          </button>

          <!-- Add to Palette Generator -->
          <button 
            type="button" 
            class="action-pill-btn" 
            title="Add to Palette Generator"
            (click)="state.sendToPalette(state.activeColor())"
          >
            <ts-icon name="palette" [size]="13" />
            <span>+ Harmonies</span>
          </button>

          <!-- Simulate in Vision -->
          <button 
            type="button" 
            class="action-pill-btn" 
            title="Simulate vision in Vision Simulator"
            (click)="state.sendToSimulator(state.activeColor())"
          >
            <ts-icon name="eye" [size]="13" />
            <span>Simulate</span>
          </button>

        </div>

      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .shared-color-bar-root {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding: 12px 18px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: all 180ms ease;
    }

    :host-context([data-theme="light"]) .shared-color-bar-root {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    /* Active Swatch Cluster */
    .active-swatch-cluster {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .swatch-wrapper {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.15);
      background-image: 
        linear-gradient(45deg, #27272A 25%, transparent 25%), 
        linear-gradient(-45deg, #27272A 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #27272A 75%), 
        linear-gradient(-45deg, transparent 75%, #27272A 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
    }

    .swatch-preview {
      width: 100%;
      height: 100%;
      border-radius: inherit;
    }

    .active-color-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .meta-headline {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .active-hex {
      font-family: var(--ts-font-mono, monospace);
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .active-hex {
      color: var(--text, #0F172A);
    }

    .quick-copy-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-3, #71717A);
      cursor: pointer;
      transition: color 120ms ease;
    }

    .quick-copy-icon-btn:hover {
      color: var(--tool-accent, #2563EB);
    }

    .meta-subline {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .color-model-tag {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text-3, #71717A);
    }

    .meta-dot {
      color: var(--border, rgba(255, 255, 255, 0.2));
      font-size: 10px;
    }

    /* Shared Working Palette Strip */
    .shared-palette-strip {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 240px;
    }

    .palette-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .palette-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3, #71717A);
    }

    .palette-count {
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-3, #71717A);
    }

    .palette-swatches-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .working-swatch-slot {
      position: relative;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: transform 140ms ease, box-shadow 140ms ease;
    }

    .working-swatch-slot:hover {
      transform: scale(1.15);
      z-index: 5;
    }

    .working-swatch-slot.active {
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
    }

    :host-context([data-theme="light"]) .working-swatch-slot.active {
      border-color: #0F172A;
    }

    .remove-slot-btn {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #EF4444;
      border: none;
      color: #FFFFFF;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
    }

    .working-swatch-slot:hover .remove-slot-btn {
      display: flex;
    }

    .add-swatch-slot-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.2));
      color: var(--text-3, #71717A);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .add-swatch-slot-btn {
      background: var(--bg-2, #F1F5F9);
      border-color: rgba(0, 0, 0, 0.15);
      color: #64748B;
    }

    .add-swatch-slot-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    /* Cross Module Actions */
    .cross-module-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }

    .actions-header-row {
      display: flex;
      align-items: center;
    }

    .actions-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3, #71717A);
    }

    .action-buttons-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .action-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 9px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 140ms ease;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .action-pill-btn {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-2, #475569);
    }

    .action-pill-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
    }

    :host-context([data-theme="light"]) .action-pill-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
    }

    @media (max-width: 1023px) {
      .shared-color-bar-root {
        flex-direction: column;
        align-items: stretch;
      }
      .active-swatch-cluster {
        width: 100%;
      }
      .shared-palette-strip {
        width: 100%;
      }
      .cross-module-actions {
        width: 100%;
      }
    }
  `]
})
export class SharedColorBarComponent {
  public state = inject(ColorStudioStateService);
}

