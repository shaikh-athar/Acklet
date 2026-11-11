// apps/tool-color-studio/src/components/shared/color-swatch.component.ts
import { Component, input, output, inject, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-color-swatch',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="color-swatch-card" 
      [class.size-sm]="size() === 'sm'"
      [class.size-md]="size() === 'md'"
      [class.size-lg]="size() === 'lg'"
      [class.size-compact]="size() === 'compact'"
      [class.selected]="selected() || isCurrentActive()"
      [attr.tabindex]="0"
      [attr.title]="computedTooltip()"
      (keydown.enter)="onSelect()"
      (keydown.space)="$event.preventDefault(); onSelect()"
      (click)="onSelect()"
    >
      <!-- Visual Color Preview -->
      <div 
        class="swatch-preview"
        [style.background-color]="hex()"
      >
        <!-- Overlay on Hover -->
        @if (size() !== 'sm') {
          <div class="swatch-overlay">
            @if (showCopy()) {
              <button 
                type="button" 
                class="swatch-btn" 
                title="Copy HEX"
                aria-label="Copy color HEX"
                (click)="$event.stopPropagation(); copyHex()"
              >
                <ts-icon name="copy" [size]="14" />
              </button>
            }

            @if (showMenu()) {
              <button 
                type="button" 
                class="swatch-btn" 
                title="Color Actions"
                aria-label="Color actions"
                (click)="$event.stopPropagation(); toggleMenu()"
              >
                <ts-icon name="more-horizontal" [size]="14" />
              </button>
            }
          </div>
        }
      </div>

      <!-- Card Footer Information -->
      @if (size() !== 'sm') {
        <div class="swatch-info">
          @if (showHex()) {
            <div class="hex-row">
              <span class="swatch-hex">{{ hex().toUpperCase() }}</span>
              <button 
                type="button" 
                class="bookmark-icon-btn" 
                [class.saved]="state.isColorSaved(hex())"
                [title]="state.isColorSaved(hex()) ? 'Remove from saved' : 'Bookmark color'"
                (click)="$event.stopPropagation(); state.toggleSavedColor(hex())"
              >
                <ts-icon [name]="state.isColorSaved(hex()) ? 'check' : 'plus'" [size]="12" />
              </button>
            </div>
          }
          @if (label()) {
            <span class="swatch-label">{{ label() }}</span>
          }
        </div>
      }

      <!-- Quick Action Menu Dropdown -->
      @if (showDropdown()) {
        <div class="swatch-dropdown" (click)="$event.stopPropagation()">
          <button type="button" class="dropdown-item" (click)="sendTo('picker')">
            <ts-icon name="pipette" [size]="13" />
            <span>Open in Picker</span>
          </button>
          <button type="button" class="dropdown-item" (click)="sendTo('contrast-fg')">
            <ts-icon name="check-circle" [size]="13" />
            <span>Contrast Text</span>
          </button>
          <button type="button" class="dropdown-item" (click)="sendTo('contrast-bg')">
            <ts-icon name="square" [size]="13" />
            <span>Contrast BG</span>
          </button>
          <button type="button" class="dropdown-item" (click)="sendTo('gradient')">
            <ts-icon name="layers" [size]="13" />
            <span>Add to Gradient</span>
          </button>
          <button type="button" class="dropdown-item" (click)="sendTo('palette')">
            <ts-icon name="palette" [size]="13" />
            <span>Add to Palette</span>
          </button>
          <button type="button" class="dropdown-item" (click)="sendTo('simulator')">
            <ts-icon name="eye" [size]="13" />
            <span>Simulate Vision</span>
          </button>
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item" (click)="copyFormat('rgb')">
            <ts-icon name="copy" [size]="13" />
            <span>Copy RGB</span>
          </button>
          <button type="button" class="dropdown-item" (click)="copyFormat('hsl')">
            <ts-icon name="copy" [size]="13" />
            <span>Copy HSL</span>
          </button>
          <button type="button" class="dropdown-item" (click)="state.toggleSavedColor(hex()); showDropdown.set(false)">
            <ts-icon [name]="state.isColorSaved(hex()) ? 'x' : 'plus'" [size]="13" />
            <span>{{ state.isColorSaved(hex()) ? 'Remove Bookmark' : 'Save Color' }}</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }

    .color-swatch-card {
      position: relative;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      cursor: pointer;
      transition: all 160ms cubic-bezier(0.22, 1, 0.36, 1);
      user-select: none;
      display: flex;
      flex-direction: column;
    }

    :host-context([data-theme="light"]) .color-swatch-card {
      background: var(--bg-1, #FFFFFF);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .color-swatch-card:hover {
      border-color: var(--tool-accent, #2563EB);
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
    }

    .color-swatch-card:active {
      transform: translateY(0) scale(0.985);
    }

    .color-swatch-card.selected {
      border-color: var(--tool-accent, #2563EB);
      box-shadow: 0 0 0 2px var(--tool-accent, #2563EB);
    }

    /* Size Variations */
    .color-swatch-card.size-sm {
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }
    .color-swatch-card.size-sm .swatch-preview {
      height: 100%;
      border-radius: 7px;
    }

    .color-swatch-card.size-md {
      width: 100%;
      min-width: 100px;
    }
    .color-swatch-card.size-md .swatch-preview {
      height: 64px;
      border-radius: 11px 11px 0 0;
    }

    .color-swatch-card.size-lg {
      width: 100%;
      min-width: 130px;
    }
    .color-swatch-card.size-lg .swatch-preview {
      height: 96px;
      border-radius: 11px 11px 0 0;
    }

    .color-swatch-card.size-compact {
      flex-direction: row;
      align-items: center;
      padding: 6px 10px;
      gap: 10px;
      border-radius: 8px;
    }
    .color-swatch-card.size-compact .swatch-preview {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .color-swatch-card.size-compact .swatch-info {
      padding: 0;
      flex: 1;
    }

    .swatch-preview {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background-image: 
        linear-gradient(45deg, #27272A 25%, transparent 25%), 
        linear-gradient(-45deg, #27272A 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #27272A 75%), 
        linear-gradient(-45deg, transparent 75%, #27272A 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
    }

    .swatch-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      opacity: 0;
      transition: opacity 140ms ease;
    }

    .color-swatch-card:hover .swatch-overlay {
      opacity: 1;
    }

    .swatch-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.9);
      color: #0F172A;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 120ms ease, background 120ms ease;
    }

    .swatch-btn:hover {
      background: #FFFFFF;
      transform: scale(1.1);
    }

    .swatch-info {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .hex-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .swatch-hex {
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .swatch-hex {
      color: var(--text, #0F172A);
    }

    .bookmark-icon-btn {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-3, #71717A);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: color 120ms ease;
    }

    .bookmark-icon-btn:hover {
      color: var(--tool-accent, #2563EB);
    }

    @keyframes bookmark-pop {
      0% { transform: scale(0.8); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    .bookmark-icon-btn.saved {
      color: var(--tool-accent, #2563EB);
      animation: bookmark-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .swatch-label {
      font-size: 11px;
      color: var(--text-3, #71717A);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Actions Dropdown */
    .swatch-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 6px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 10px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 1000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      min-width: 160px;
      animation: dropdownFadeIn 140ms ease;
    }

    :host-context([data-theme="light"]) .swatch-dropdown {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    :host-context([data-theme="light"]) .dropdown-divider {
      background: rgba(0, 0, 0, 0.08);
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .dropdown-item {
      color: var(--text-2, #475569);
    }

    .dropdown-item:hover {
      background: rgba(244, 63, 94, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .dropdown-item:hover {
      background: rgba(37, 99, 235, 0.08);
      color: var(--tool-accent, #2563EB);
    }
  `]
})
export class ColorSwatchComponent {
  public readonly hex = input.required<string>();
  public readonly label = input<string>('');
  public readonly size = input<'sm' | 'md' | 'lg' | 'compact'>('md');
  public readonly selected = input<boolean>(false);
  public readonly showHex = input<boolean>(true);
  public readonly showMenu = input<boolean>(true);
  public readonly showCopy = input<boolean>(true);
  public readonly tooltip = input<string>('');

  public readonly colorSelect = output<string>();

  public readonly showDropdown = signal<boolean>(false);

  public state = inject(ColorStudioStateService);
  private engine = inject(ColorEngineService);

  public readonly isCurrentActive = computed<boolean>(() => {
    return this.state.selectedColor().toUpperCase() === this.hex().toUpperCase();
  });

  public readonly computedTooltip = computed<string>(() => {
    if (this.tooltip()) return this.tooltip();
    const hex = this.hex();
    const obj = this.engine.parseColor(hex);
    return `${hex.toUpperCase()} • ${obj.rgbString} • ${obj.hslString}`;
  });

  public onSelect(): void {
    const hex = this.hex();
    this.colorSelect.emit(hex);
    this.state.setSelectedColor(hex);
  }

  public copyHex(): void {
    this.state.copyFormat(this.hex(), 'hex');
  }

  public copyFormat(format: 'hex' | 'rgb' | 'hsl'): void {
    this.showDropdown.set(false);
    this.state.copyFormat(this.hex(), format);
  }

  public toggleMenu(): void {
    this.showDropdown.update(v => !v);
  }

  public sendTo(destination: string): void {
    this.showDropdown.set(false);
    const color = this.hex();

    switch (destination) {
      case 'picker':
        this.state.sendToPicker(color);
        break;
      case 'contrast-fg':
        this.state.sendToContrast(color, 'fg');
        break;
      case 'contrast-bg':
        this.state.sendToContrast(color, 'bg');
        break;
      case 'gradient':
        this.state.sendToGradient(color);
        break;
      case 'palette':
        this.state.sendToPalette(color);
        break;
      case 'simulator':
        this.state.sendToSimulator(color);
        break;
    }
  }
}
