// apps/tool-color-studio/src/components/popovers/harmony-popover.component.ts
import { Component, inject, computed, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { TsIconComponent } from '@acklet/tool-shell';

interface HarmonyScheme {
  name: string;
  colors: string[];
}

@Component({
  selector: 'app-harmony-popover',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="popover-backdrop" (click)="close.emit()"></div>
    <div class="popover-panel animate-scale-in" role="dialog" aria-label="Color Harmonies">
      <div class="popover-header">
        <div class="popover-title-row">
          <ts-icon name="sparkles" [size]="15" class="popover-icon" />
          <h4 class="popover-title">Active Harmonies</h4>
        </div>
        <div class="header-actions">
          <button 
            type="button" 
            class="text-action-btn" 
            (click)="openPaletteGen()"
            title="Open in Palette Generator"
          >
            Full Generator →
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
        <div class="schemes-list">
          @for (scheme of schemes(); track scheme.name) {
            <div class="scheme-row">
              <span class="scheme-name">{{ scheme.name }}</span>
              <div class="scheme-swatches">
                @for (c of scheme.colors; track c) {
                  <div 
                    class="scheme-swatch"
                    [class.active]="c.toUpperCase() === state.activeColor().toUpperCase()"
                    [style.background-color]="c"
                    (click)="selectColor(c)"
                    [title]="c + ' (Click to select)'"
                    role="button"
                    tabindex="0"
                  ></div>
                }
              </div>
            </div>
          }
        </div>
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
      width: 320px;
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .text-action-btn {
      font-size: 11px;
      font-weight: 600;
      background: none;
      color: var(--tool-accent, #2563EB);
      border: none;
      cursor: pointer;
      padding: 2px 4px;
    }

    .text-action-btn:hover {
      text-decoration: underline;
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
    }

    .schemes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .scheme-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .scheme-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #A1A1AA);
    }

    .scheme-swatches {
      display: flex;
      gap: 6px;
    }

    .scheme-swatch {
      flex: 1;
      height: 32px;
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: transform 0.12s ease;
    }

    .scheme-swatch:hover {
      transform: translateY(-1px);
    }

    .scheme-swatch.active {
      outline: 2px solid var(--tool-accent, #2563EB);
      outline-offset: 2px;
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
export class HarmonyPopoverComponent {
  public state = inject(ColorStudioStateService);
  public engine = inject(ColorEngineService);
  public close = output<void>();

  public schemes = computed<HarmonyScheme[]>(() => {
    const base = this.state.activeColor();
    const hsl = this.engine.hexToHsl(base);
    
    // Complementary
    const compHue = (hsl.h + 180) % 360;
    const compHex = this.engine.hslToHex({ ...hsl, h: compHue });

    // Analogous (+30, -30)
    const ana1 = this.engine.hslToHex({ ...hsl, h: (hsl.h + 30) % 360 });
    const ana2 = this.engine.hslToHex({ ...hsl, h: (hsl.h + 330) % 360 });

    // Triadic (+120, +240)
    const tri1 = this.engine.hslToHex({ ...hsl, h: (hsl.h + 120) % 360 });
    const tri2 = this.engine.hslToHex({ ...hsl, h: (hsl.h + 240) % 360 });

    return [
      { name: 'Complementary', colors: [base, compHex] },
      { name: 'Analogous', colors: [ana2, base, ana1] },
      { name: 'Triadic', colors: [base, tri1, tri2] }
    ];
  });

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.close.emit();
  }

  public selectColor(hex: string): void {
    this.state.setSelectedColor(hex);
    this.close.emit();
  }

  public openPaletteGen(): void {
    this.state.setActiveModule('palette');
    this.close.emit();
  }
}

