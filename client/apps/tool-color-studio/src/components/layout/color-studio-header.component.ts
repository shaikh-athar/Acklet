// apps/tool-color-studio/src/components/layout/color-studio-header.component.ts
import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorStudioTab } from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  ColorHistoryPopoverComponent,
  SavedColorsPopoverComponent,
  WorkingPalettePopoverComponent,
  HarmonyPopoverComponent
} from '../popovers';

interface ModuleItem {
  id: ColorStudioTab;
  route: string;
  title: string;
  icon: string;
}

@Component({
  selector: 'app-color-studio-header',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    ColorHistoryPopoverComponent,
    SavedColorsPopoverComponent,
    WorkingPalettePopoverComponent,
    HarmonyPopoverComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isLanding()) {
      <div class="studio-module-bar">
        
        <!-- Left: Contextual Module Switcher Pill -->
        <div class="switcher-wrapper">
          <button 
            type="button" 
            class="switcher-trigger-pill"
            (click)="toggleSwitcher()"
            [class.open]="showSwitcher()"
            [attr.aria-expanded]="showSwitcher()"
            title="Switch Color Studio tool"
          >
            <ts-icon [name]="currentModuleIcon()" [size]="14" class="module-icon" />
            <span class="module-current-name">{{ currentTitle() }}</span>
            <ts-icon name="chevron-down" [size]="12" class="chevron-icon" />
          </button>

          @if (showSwitcher()) {
            <div class="popover-backdrop" (click)="showSwitcher.set(false)"></div>
            <div class="switcher-dropdown animate-scale-in" role="menu">
              @for (m of modules; track m.id) {
                <button 
                  type="button" 
                  class="switcher-item"
                  [class.active]="m.id === state.activeTab()"
                  (click)="selectModule(m.id)"
                  role="menuitem"
                >
                  <ts-icon [name]="m.icon" [size]="14" class="switcher-item-icon" />
                  <span class="switcher-item-title">{{ m.title }}</span>
                  @if (m.id === state.activeTab()) {
                    <ts-icon name="check" [size]="13" class="check-icon" />
                  }
                </button>
              }
            </div>
          }
        </div>

        <!-- Right: Active Working Color Pill & Popovers -->
        <div class="header-actions">
          
          <!-- Active Color Pill -->
          <div 
            class="active-color-pill" 
            [title]="'Active color: ' + state.activeColor() + ' (Click to copy HEX)'"
            role="button"
            tabindex="0"
            (keydown.enter)="state.copyToClipboard(state.activeColor(), 'HEX')"
            (click)="state.copyToClipboard(state.activeColor(), 'HEX')"
          >
            <div class="color-swatch-dot" [style.background-color]="state.activeColor()"></div>
            <span class="color-hex-text">{{ state.activeColor() }}</span>
            <ts-icon name="copy" [size]="12" class="copy-hint" />
          </div>

          <div class="header-separator"></div>

          <!-- Contextual Popovers Group -->
          <div class="popovers-btn-group" role="group" aria-label="Color Tools">
            
            <!-- 1. Color History Popover (Clock) -->
            <div class="popover-anchor">
              <button 
                type="button" 
                class="header-icon-btn"
                [class.active]="activePopover() === 'history'"
                (click)="togglePopover('history')"
                title="Recent colors"
                aria-label="Recent colors"
              >
                <ts-icon name="clock" [size]="15" />
              </button>
              @if (activePopover() === 'history') {
                <app-color-history-popover (close)="activePopover.set(null)" />
              }
            </div>

            <!-- 2. Saved Bookmarks Popover (Bookmark) -->
            <div class="popover-anchor">
              <button 
                type="button" 
                class="header-icon-btn"
                [class.active]="activePopover() === 'saved'"
                [class.ping-highlight]="state.savedPing()"
                (click)="togglePopover('saved')"
                title="Saved colors"
                aria-label="Saved colors"
              >
                <ts-icon name="bookmark" [size]="15" />
              </button>
              @if (activePopover() === 'saved') {
                <app-saved-colors-popover (close)="activePopover.set(null)" />
              }
            </div>

            <!-- 3. Working Palette Popover (Layers) -->
            <div class="popover-anchor">
              <button 
                type="button" 
                class="header-icon-btn"
                [class.active]="activePopover() === 'palette'"
                (click)="togglePopover('palette')"
                title="Working palette"
                aria-label="Working palette"
              >
                <ts-icon name="layers" [size]="15" />
              </button>
              @if (activePopover() === 'palette') {
                <app-working-palette-popover (close)="activePopover.set(null)" />
              }
            </div>

            <!-- 4. Active Harmonies Popover (Sparkles) -->
            <div class="popover-anchor">
              <button 
                type="button" 
                class="header-icon-btn"
                [class.active]="activePopover() === 'harmony'"
                (click)="togglePopover('harmony')"
                title="Color harmonies"
                aria-label="Harmonies"
              >
                <ts-icon name="sparkles" [size]="15" />
              </button>
              @if (activePopover() === 'harmony') {
                <app-harmony-popover (close)="activePopover.set(null)" />
              }
            </div>

          </div>

        </div>

      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .studio-module-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      margin-bottom: 20px;
      gap: 12px;
    }

    /* Contextual Module Switcher Pill */
    .switcher-wrapper {
      position: relative;
    }

    .switcher-trigger-pill {
      display: inline-flex;
      align-items: center;
      margin-left : 10px;
      gap: 8px;
      height: 34px;
      padding: 0 12px;
      border-radius: 10px;
      background: var(--surface, var(--bg-1, #FFFFFF));
      border: 1px solid var(--border, var(--border-color, #E2E8F0));
      color: var(--text, var(--text-primary, #0F172A));
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.14s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    [data-theme="dark"] .switcher-trigger-pill {
      background: var(--surface, #141416);
      border-color: var(--border, #27272A);
      color: var(--text, #F4F4F5);
    }

    .switcher-trigger-pill:hover,
    .switcher-trigger-pill.open {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .module-icon {
      color: var(--tool-accent, #2563EB);
    }

    .chevron-icon {
      color: var(--text-2, #64748B);
      transition: transform 0.15s ease;
    }

    .switcher-trigger-pill.open .chevron-icon {
      transform: rotate(180deg);
    }

    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 50;
    }

    .switcher-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 220px;
      background: var(--surface, var(--bg-1, #FFFFFF));
      border: 1px solid var(--border, var(--border-color, #E2E8F0));
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
      padding: 6px;
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    [data-theme="dark"] .switcher-dropdown {
      background: var(--surface, #18181B);
      border-color: var(--border, #27272A);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }

    .switcher-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text, var(--text-primary, #0F172A));
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: background 0.12s ease;
    }

    [data-theme="dark"] .switcher-item {
      color: var(--text, #F4F4F5);
    }

    .switcher-item:hover {
      background: var(--surface-secondary, var(--bg-2, #F1F5F9));
    }

    [data-theme="dark"] .switcher-item:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    .switcher-item.active {
      color: var(--tool-accent, #2563EB);
      font-weight: 600;
      background: rgba(37, 99, 235, 0.08);
    }

    .switcher-item-icon {
      color: var(--text-2, #64748B);
    }

    .switcher-item.active .switcher-item-icon {
      color: var(--tool-accent, #2563EB);
    }

    .switcher-item-title {
      flex: 1;
    }

    .check-icon {
      color: var(--tool-accent, #2563EB);
    }

    /* Right: Header Actions */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-right : 10px;
      flex-shrink: 0;
    }

    .active-color-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 8px;
      background: var(--surface, var(--bg-1, #FFFFFF));
      border: 1px solid var(--border, var(--border-color, #E2E8F0));
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition: border-color 0.14s ease;
    }

    [data-theme="dark"] .active-color-pill {
      background: var(--surface, #141416);
      border-color: var(--border, #27272A);
    }

    .active-color-pill:hover {
      border-color: var(--tool-accent, #2563EB);
    }

    .color-swatch-dot {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      flex-shrink: 0;
    }

    .color-hex-text {
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      color: var(--text, var(--text-primary, #0F172A));
    }

    [data-theme="dark"] .color-hex-text {
      color: var(--text, #F4F4F5);
    }

    .copy-hint {
      color: var(--text-2, #64748B);
    }

    .header-separator {
      width: 1px;
      height: 20px;
      background: var(--border, var(--border-color, #E2E8F0));
    }

    [data-theme="dark"] .header-separator {
      background: var(--border, #27272A);
    }

    /* Popovers Group */
    .popovers-btn-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .popover-anchor {
      position: relative;
    }

    .header-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border, var(--border-color, #E2E8F0));
      background: var(--surface, var(--bg-1, #FFFFFF));
      color: var(--text-2, #64748B);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.14s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    [data-theme="dark"] .header-icon-btn {
      background: var(--surface, #141416);
      border-color: var(--border, #27272A);
      color: var(--text-2, #A1A1AA);
    }

    .header-icon-btn:hover,
    .header-icon-btn.active {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    @keyframes header-btn-ping {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6);
      }
      40% {
        transform: scale(1.18);
        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25);
        color: #2563EB;
        background: rgba(37, 99, 235, 0.15);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
      }
    }

    .header-icon-btn.ping-highlight {
      animation: header-btn-ping 0.85s cubic-bezier(0.16, 1, 0.3, 1);
      color: #2563EB !important;
      border-color: #2563EB !important;
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-scale-in {
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @media (max-width: 640px) {
      .color-hex-text {
        display: none;
      }

      .header-icon-btn {
        width: 36px;
        height: 36px;
      }

      .header-actions {
        gap: 6px;
        margin-right: 0;
      }
    }
  `]
})
export class ColorStudioHeaderComponent {
  public state = inject(ColorStudioStateService);
  private router = inject(Router);

  public showSwitcher = signal<boolean>(false);
  public activePopover = signal<'history' | 'saved' | 'palette' | 'harmony' | null>(null);

  public readonly modules: ModuleItem[] = [
    { id: 'picker', route: 'color-picker', title: 'Color Picker', icon: 'pipette' },
    { id: 'extractor', route: 'image-extractor', title: 'Image Extractor', icon: 'image' },
    { id: 'gradient', route: 'gradient-generator', title: 'Gradient Generator', icon: 'layers' },
    { id: 'contrast', route: 'contrast-checker', title: 'Contrast Checker', icon: 'check-circle' },
    { id: 'palette', route: 'palette-generator', title: 'Palette Generator', icon: 'sliders' },
    { id: 'simulator', route: 'vision-simulator', title: 'Vision Simulator', icon: 'eye' }
  ];

  public isLanding = computed(() => {
    return this.state.activeTab() === 'landing';
  });

  public currentTitle = computed(() => {
    const tab = this.state.activeTab();
    const match = this.modules.find(m => m.id === tab);
    return match ? match.title : 'Color Picker';
  });

  public currentModuleIcon = computed(() => {
    const tab = this.state.activeTab();
    const match = this.modules.find(m => m.id === tab);
    return match ? match.icon : 'pipette';
  });

  public toggleSwitcher(): void {
    this.showSwitcher.update(v => !v);
  }

  public selectModule(modId: ColorStudioTab): void {
    this.showSwitcher.set(false);
    this.state.setActiveModule(modId);
    const mod = this.modules.find(m => m.id === modId);
    if (mod) {
      let target = `/colorstudio/${mod.route}`;
      if (this.router.url.includes('/tools/colorstudio') || this.router.url.includes('/tools/color-studio')) {
        target = `/tools/colorstudio/${mod.route}`;
      }
      this.router.navigateByUrl(target).catch(() => {});
    }
  }

  public togglePopover(popover: 'history' | 'saved' | 'palette' | 'harmony'): void {
    this.activePopover.update(curr => curr === popover ? null : popover);
  }
}
