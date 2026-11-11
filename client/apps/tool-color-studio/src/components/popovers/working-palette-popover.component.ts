// apps/tool-color-studio/src/components/popovers/working-palette-popover.component.ts
import { Component, inject, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-working-palette-popover',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="popover-backdrop" (click)="close.emit()"></div>
    <div class="popover-panel animate-scale-in" role="dialog" aria-label="Studio Working Palette">
      <div class="popover-header">
        <div class="popover-title-row">
          <ts-icon name="layers" [size]="15" class="popover-icon" />
          <h4 class="popover-title">Working Palette</h4>
          <span class="count-badge">{{ state.sharedColorPalettes().length }}/10</span>
        </div>
        <div class="header-actions">
          <button 
            type="button" 
            class="text-action-btn" 
            (click)="addCurrentColor()"
            title="Add active color to palette"
          >
            + Add Current
          </button>
          <button 
            type="button" 
            class="close-btn" 
            (click)="close.emit()" 
            aria-label="Close popover"
          >
            <ts-icon name="x" [size]="14" />
          </button>
        </div>
      </div>

      <div class="popover-body">
        @if (state.sharedColorPalettes().length === 0) {
          <div class="empty-state">
            <ts-icon name="layers" [size]="24" class="empty-icon" />
            <p class="empty-text">Working palette is empty.</p>
            <span class="empty-subtext">Add swatches to share them instantly across all 6 modules.</span>
          </div>
        } @else {
          <!-- Swatches Grid -->
          <div class="swatches-strip">
            @for (hex of state.sharedColorPalettes(); track $index) {
              <div 
                class="palette-swatch-card"
                [class.active]="hex.toUpperCase() === state.activeColor().toUpperCase()"
                (click)="selectColor(hex)"
                [style.background-color]="hex"
                role="button"
                tabindex="0"
              >
                <button 
                  type="button" 
                  class="remove-swatch-btn" 
                  (click)="removeSwatch($index, $event)"
                  title="Remove swatch"
                >
                  <ts-icon name="x" [size]="10" />
                </button>
                <span class="swatch-label">{{ hex.toUpperCase() }}</span>
              </div>
            }
          </div>

          <!-- Quick Cross-Module Transfers -->
          <div class="transfers-section">
            <span class="section-label">Send Palette To:</span>
            <div class="transfers-grid">
              <button type="button" class="transfer-btn" (click)="sendToGradient()">
                <ts-icon name="sliders" [size]="12" />
                <span>Gradient</span>
              </button>
              <button type="button" class="transfer-btn" (click)="sendToPaletteGen()">
                <ts-icon name="sparkles" [size]="12" />
                <span>Harmonies</span>
              </button>
              <button type="button" class="transfer-btn" (click)="sendToSimulator()">
                <ts-icon name="eye" [size]="12" />
                <span>Simulator</span>
              </button>
              <button type="button" class="transfer-btn" (click)="copyAll()">
                <ts-icon name="copy" [size]="12" />
                <span>Copy List</span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      z-index: 50;
    }

    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
    }

    .popover-panel {
      position: relative;
      z-index: 50;
      width: 340px;
      background: var(--bg-surface, #18181B);
      border: 1px solid var(--border-default, #27272A);
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .popover-panel {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
    }

    .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-default, #27272A);
    }

    :host-context([data-theme="light"]) .popover-header {
      border-bottom-color: #F1F5F9;
    }

    .popover-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .popover-icon {
      color: var(--tool-accent, #2563EB);
    }

    .popover-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .popover-title {
      color: #0F172A;
    }

    .count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .text-action-btn {
      font-size: 11px;
      font-weight: 600;
      background: rgba(37, 99, 235, 0.1);
      color: var(--tool-accent, #2563EB);
      border: 1px solid rgba(37, 99, 235, 0.2);
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .text-action-btn:hover {
      background: var(--tool-accent, #2563EB);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: none;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
    }

    .close-btn:hover {
      background: var(--bg-hover, rgba(255, 255, 255, 0.06));
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .popover-body {
      padding: 12px 14px;
      max-height: 320px;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px 8px;
    }

    .empty-icon {
      color: var(--text-muted, #71717A);
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0 0 4px;
    }

    :host-context([data-theme="light"]) .empty-text {
      color: #0F172A;
    }

    .empty-subtext {
      font-size: 11px;
      color: var(--text-muted, #A1A1AA);
      line-height: 1.4;
    }

    .swatches-strip {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }

    .palette-swatch-card {
      position: relative;
      height: 48px;
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 2px;
      transition: transform 0.12s ease;
    }

    .palette-swatch-card:hover {
      transform: translateY(-1px);
    }

    .palette-swatch-card.active {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
    }

    .remove-swatch-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      opacity: 0;
      width: 16px;
      height: 16px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.7);
      color: #FFFFFF;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.12s ease;
    }

    .palette-swatch-card:hover .remove-swatch-btn {
      opacity: 1;
    }

    .swatch-label {
      font-size: 8px;
      font-family: monospace;
      font-weight: 600;
      color: #FFFFFF;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
      text-align: center;
    }

    .transfers-section {
      border-top: 1px solid var(--border-default, #27272A);
      padding-top: 10px;
    }

    :host-context([data-theme="light"]) .transfers-section {
      border-top-color: #F1F5F9;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #A1A1AA);
      margin-bottom: 6px;
      display: block;
    }

    .transfers-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .transfer-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 600;
      background: var(--bg-base, #09090B);
      border: 1px solid var(--border-default, #27272A);
      border-radius: 6px;
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: background 0.12s ease;
    }

    :host-context([data-theme="light"]) .transfer-btn {
      background: #F8FAFC;
      border-color: #E2E8F0;
      color: #0F172A;
    }

    .transfer-btn:hover {
      background: rgba(37, 99, 235, 0.1);
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    @media (max-width: 640px) {
      :host {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        margin: 0;
        z-index: 9999;
      }
      .popover-panel {
        width: 100% !important;
        max-height: 80vh;
        border-radius: 16px 16px 0 0;
        box-sizing: border-box;
      }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-scale-in {
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class WorkingPalettePopoverComponent {
  public state = inject(ColorStudioStateService);
  public close = output<void>();

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.close.emit();
  }

  public addCurrentColor(): void {
    this.state.addToSharedPalette(this.state.activeColor());
  }

  public selectColor(hex: string): void {
    this.state.setSelectedColor(hex);
    this.close.emit();
  }

  public removeSwatch(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.state.removeFromSharedPalette(index);
  }

  public sendToGradient(): void {
    this.state.populateGradientFromPalette(this.state.sharedColorPalettes());
    this.state.setActiveModule('gradient');
    this.close.emit();
  }

  public sendToPaletteGen(): void {
    this.state.setActiveModule('palette');
    this.close.emit();
  }

  public sendToSimulator(): void {
    this.state.sendPaletteToSimulator(this.state.sharedColorPalettes());
    this.state.setActiveModule('simulator');
    this.close.emit();
  }

  public copyAll(): void {
    const list = this.state.sharedColorPalettes().join(', ');
    this.state.copyToClipboard(list, 'Palette Colors');
  }
}
