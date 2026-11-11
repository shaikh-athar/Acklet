// apps/tool-color-studio/src/components/layout/color-studio-sidebar.component.ts
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorStudioTab } from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';
import { ColorSwatchComponent } from '../shared/color-swatch.component';

interface NavModuleItem {
  id: ColorStudioTab;
  title: string;
  icon: string;
  desc: string;
  route: string;
}

const SIDEBAR_MODULES: NavModuleItem[] = [
  {
    id: 'picker',
    title: 'Color Picker',
    icon: 'pipette',
    desc: 'Choose, customize and convert formats',
    route: '/color-picker'
  },
  {
    id: 'extractor',
    title: 'Image Extractor',
    icon: 'image',
    desc: 'Upload an image and discover colors',
    route: '/image-extractor'
  },
  {
    id: 'gradient',
    title: 'Gradient Generator',
    icon: 'layers',
    desc: 'Create gradients with CSS export',
    route: '/gradient-generator'
  },
  {
    id: 'contrast',
    title: 'Contrast Checker',
    icon: 'check-circle',
    desc: 'Audit foreground and background WCAG',
    route: '/contrast-checker'
  },
  {
    id: 'palette',
    title: 'Palette Generator',
    icon: 'palette',
    desc: 'Generate harmonic palettes and schemes',
    route: '/palette-generator'
  },
  {
    id: 'simulator',
    title: 'Vision Simulator',
    icon: 'eye',
    desc: 'Simulate color vision deficiencies',
    route: '/vision-simulator'
  }
];

@Component({
  selector: 'app-color-studio-sidebar',
  standalone: true,
  imports: [CommonModule, TsIconComponent, ColorSwatchComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Mobile Backdrop Overlay -->
    @if (state.sidebarOpen()) {
      <div 
        class="mobile-sidebar-backdrop" 
        (click)="state.closeSidebar()"
        aria-hidden="true"
      ></div>
    }

    <!-- Sidebar Container -->
    <aside 
      class="studio-sidebar" 
      [class.open]="state.sidebarOpen()"
      role="navigation"
      aria-label="Color Studio Modules"
    >
      
      <!-- Mobile Drawer Header -->
      <div class="sidebar-drawer-top">
        <div class="drawer-title-group">
          <ts-icon name="palette" [size]="18" class="drawer-logo-icon" />
          <span class="drawer-title">Color Studio</span>
        </div>
        <button 
          type="button" 
          class="drawer-close-btn" 
          aria-label="Close navigation"
          (click)="state.closeSidebar()"
        >
          <ts-icon name="x" [size]="18" />
        </button>
      </div>

      <!-- Main Module Navigation List -->
      <div class="sidebar-section-header">
        <span class="section-title">Studio Modules</span>
      </div>

      <nav class="modules-nav-list" role="tablist">
        @for (item of modules; track item.id) {
          <button 
            type="button" 
            role="tab"
            class="nav-module-card" 
            [class.active]="state.activeTab() === item.id"
            [attr.aria-selected]="state.activeTab() === item.id"
            (click)="selectModule(item.id)"
          >
            <div class="module-icon-box">
              <ts-icon [name]="item.icon" [size]="17" />
            </div>
            <div class="module-text-group">
              <span class="module-title">{{ item.title }}</span>
              <span class="module-desc">{{ item.desc }}</span>
            </div>
          </button>
        }
      </nav>

      <!-- Quick Harmonies Preview -->
      <div class="sidebar-harmonies-section">
        <div class="sidebar-section-header">
          <span class="section-title">Active Harmonies</span>
          <span class="section-badge">Live</span>
        </div>

        <div class="harmonies-grid">
          
          <!-- Complementary -->
          <div class="harmony-row">
            <span class="harmony-label">Complement:</span>
            <div class="harmony-swatches">
              @for (hex of state.activeHarmonies().complementary.slice(0, 2); track hex) {
                <app-color-swatch [hex]="hex" size="sm" [tooltip]="'Complementary: ' + hex" />
              }
            </div>
          </div>

          <!-- Analogous -->
          <div class="harmony-row">
            <span class="harmony-label">Analogous:</span>
            <div class="harmony-swatches">
              @for (hex of state.activeHarmonies().analogous.slice(0, 3); track hex) {
                <app-color-swatch [hex]="hex" size="sm" [tooltip]="'Analogous: ' + hex" />
              }
            </div>
          </div>

          <!-- Triadic -->
          <div class="harmony-row">
            <span class="harmony-label">Triadic:</span>
            <div class="harmony-swatches">
              @for (hex of state.activeHarmonies().triadic.slice(0, 3); track hex) {
                <app-color-swatch [hex]="hex" size="sm" [tooltip]="'Triadic: ' + hex" />
              }
            </div>
          </div>

        </div>
      </div>

      <!-- Saved Bookmarked Colors -->
      @if (state.savedColors().length > 0) {
        <div class="sidebar-saved-section">
          <div class="sidebar-section-header">
            <span class="section-title">Saved Colors ({{ state.savedColors().length }})</span>
            <button 
              type="button" 
              class="clear-history-btn" 
              title="Clear saved colors"
              (click)="state.clearSavedColors()"
            >
              Clear
            </button>
          </div>

          <div class="history-grid">
            @for (hex of state.savedColors().slice(0, 10); track hex) {
              <app-color-swatch [hex]="hex" size="sm" [tooltip]="'Saved: ' + hex" />
            }
          </div>
        </div>
      }

      <!-- Recent History Swatches -->
      <div class="sidebar-history-section">
        <div class="sidebar-section-header">
          <span class="section-title">Recent Colors</span>
          @if (state.colorHistory().length > 0) {
            <button 
              type="button" 
              class="clear-history-btn" 
              title="Clear color history"
              (click)="state.clearHistory()"
            >
              Clear
            </button>
          }
        </div>

        <div class="history-grid">
          @for (hex of state.colorHistory().slice(0, 10); track hex) {
            <app-color-swatch [hex]="hex" size="sm" [tooltip]="'Recent: ' + hex" />
          }
        </div>
      </div>

      <!-- Quick Hint Footer -->
      <div class="sidebar-footer-hint">
        <span class="hint-key">Space</span>
        <span class="hint-text">Re-rolls palette in Generator</span>
      </div>

    </aside>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Backdrop for Mobile Slide-over Drawer */
    .mobile-sidebar-backdrop {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 9998;
    }

    .studio-sidebar {
      width: var(--cs-sidebar-width, 260px);
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--cs-card-radius, 16px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .studio-sidebar {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .sidebar-drawer-top {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .sidebar-drawer-top {
      border-color: var(--border, rgba(0, 0, 0, 0.08));
    }

    .drawer-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .drawer-logo-icon {
      color: var(--tool-accent, #2563EB);
    }

    .drawer-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .drawer-title {
      color: var(--text, #0F172A);
    }

    .drawer-close-btn {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
    }

    .sidebar-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--text-3, #71717A);
    }

    .section-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 1px 6px;
      border-radius: 8px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .section-badge {
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      color: var(--tool-accent, #2563EB);
    }

    .modules-nav-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-module-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      transition: all 140ms cubic-bezier(0.22, 1, 0.36, 1);
      width: 100%;
      position: relative;
    }

    .nav-module-card:hover {
      background: var(--bg-2, #27272A);
      border-color: var(--border, rgba(255, 255, 255, 0.06));
    }

    :host-context([data-theme="light"]) .nav-module-card:hover {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.06));
    }

    .nav-module-card.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.35));
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    :host-context([data-theme="light"]) .nav-module-card.active {
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      border-color: var(--tool-accent-border, rgba(37, 99, 235, 0.25));
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
    }

    .nav-module-card.active .module-title {
      color: var(--tool-accent, #3B82F6);
    }

    :host-context([data-theme="light"]) .nav-module-card.active .module-title {
      color: var(--tool-accent, #2563EB);
    }

    .module-icon-box {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      flex-shrink: 0;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .module-icon-box {
      background: #F1F5F9;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text-2, #64748B);
    }

    .nav-module-card.active .module-icon-box {
      background: var(--tool-primary, #2563EB);
      border-color: var(--tool-primary, #2563EB);
      color: #FFFFFF;
    }

    :host-context([data-theme="light"]) .nav-module-card.active .module-icon-box {
      background: var(--tool-primary, #2563EB);
      border-color: var(--tool-primary, #2563EB);
      color: #FFFFFF;
    }

    .module-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .module-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .module-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .module-title {
      color: var(--text, #0F172A);
    }

    .module-tag {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-3, #71717A);
      background: var(--bg-1, #18181B);
      padding: 1px 4px;
      border-radius: 4px;
    }

    :host-context([data-theme="light"]) .module-tag {
      background: #F1F5F9;
    }

    .module-desc {
      font-size: 11px;
      color: var(--text-3, #71717A);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Harmonies Preview */
    .sidebar-harmonies-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      border-radius: 10px;
    }

    :host-context([data-theme="light"]) .sidebar-harmonies-section {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.06));
    }

    .harmonies-grid {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .harmony-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .harmony-label {
      font-size: 11px;
      color: var(--text-3, #A1A1AA);
    }

    :host-context([data-theme="light"]) .harmony-label {
      color: var(--text-3, #64748B);
    }

    .harmony-swatches {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .mini-harmony-swatch {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: transform 120ms ease;
    }

    .mini-harmony-swatch:hover {
      transform: scale(1.25);
      z-index: 5;
    }

    /* History Grid */
    .sidebar-history-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      border-radius: 10px;
    }

    :host-context([data-theme="light"]) .sidebar-history-section {
      background: var(--bg-2, #F8FAFC);
      border-color: var(--border, rgba(0, 0, 0, 0.06));
    }

    .clear-history-btn {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-3, #71717A);
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
    }

    .clear-history-btn:hover {
      color: var(--tool-accent, #2563EB);
    }

    .history-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .history-color-chip {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: transform 120ms ease;
    }

    .history-color-chip:hover {
      transform: scale(1.2);
      z-index: 5;
    }

    /* Hint Footer */
    .sidebar-footer-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
    }

    .hint-key {
      font-family: var(--ts-font-mono, monospace);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .hint-key {
      background: #E2E8F0;
      color: #334155;
    }

    .hint-text {
      font-size: 11px;
      color: var(--text-3, #71717A);
    }

    /* Mobile / Tablet Responsive Behavior */
    @media (max-width: 1023px) {
      .mobile-sidebar-backdrop {
        display: block;
      }

      .studio-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 290px;
        z-index: 9999;
        border-radius: 0;
        transform: translateX(-100%);
        transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
        overflow-y: auto;
      }

      .studio-sidebar.open {
        transform: translateX(0);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
      }

      .sidebar-drawer-top {
        display: flex;
      }
    }
  `]
})
export class ColorStudioSidebarComponent {
  public state = inject(ColorStudioStateService);
  public modules = SIDEBAR_MODULES;

  public selectModule(id: ColorStudioTab): void {
    this.state.setActiveTab(id);
    this.state.closeSidebar();
  }
}

