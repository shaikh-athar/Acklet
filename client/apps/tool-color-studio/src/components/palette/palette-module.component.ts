// apps/tool-color-studio/src/components/palette/palette-module.component.ts
import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { PaletteService } from '../../services/palette.service';
import { ExportService } from '../../services/export.service';
import { ThemeGenerationService } from '../../services/theme-generation.service';
import { ThemeExportService } from '../../services/theme-export.service';
import {
  PaletteHarmony,
  PaletteItem,
  SavedPalette
} from '../../models/color.models';
import {
  UiTheme,
  ThemeStyle,
  ColorMood,
  ApplicationType,
  ThemeMode,
  ThemeCategory,
  ThemeExportFormat
} from '../../models/theme.models';
import { TsIconComponent } from '@acklet/tool-shell';
import { ThemeCardComponent } from './theme-card.component';
import { ThemeDetailsComponent } from './theme-details.component';

@Component({
  selector: 'app-palette-module',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    ThemeCardComponent,
    ThemeDetailsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="palette-stage-container">
      
      <!-- Top Workspace Module Header -->
      <div class="workspace-module-header">
        <div class="header-titles">
          <h2 class="workspace-title">Color Palette Generator</h2>
          <p class="workspace-subtitle">Create beautiful, ready-to-use color themes for your applications.</p>
        </div>
        
        <div class="workspace-actions">
          <button 
            type="button" 
            class="toolbar-action-btn primary" 
            (click)="generateCurrentTheme()"
            title="Generate fresh theme (Press Spacebar)"
          >
            <ts-icon name="sparkles" [size]="14" />
            <span>Generate Theme</span>
          </button>

          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="exploreThemes()"
            title="Explore curated themes"
          >
            <ts-icon name="compass" [size]="14" />
            <span>Explore Themes</span>
          </button>

          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="randomizeBaseColor()"
            title="Randomize base color"
          >
            <ts-icon name="refresh-cw" [size]="14" />
            <span>Randomize</span>
          </button>

          <div class="saved-dropdown-wrap">
            <button 
              type="button" 
              class="toolbar-action-btn" 
              [class.active]="savedDropdownOpen()"
              [class.saved-highlight]="savedLibraryHighlight()"
              (click)="toggleSavedDropdown()"
              title="View saved application themes"
            >
              <ts-icon name="bookmark" [size]="14" class="saved-lib-icon" />
              <span>Saved Themes ({{ savedThemes().length }})</span>
              <ts-icon name="chevron-down" [size]="11" />
            </button>

            <!-- Saved Themes Dropdown Menu -->
            <div *ngIf="savedDropdownOpen()" class="saved-dropdown-menu">
              <div class="dropdown-head">
                <span class="dropdown-title">Saved Library</span>
                <span class="dropdown-count">{{ savedThemes().length }} themes</span>
              </div>

              <div *ngIf="savedThemes().length === 0" class="dropdown-empty">
                <span>No saved themes yet. Click the bookmark icon on any theme to save it.</span>
              </div>

              <div class="dropdown-list">
                <div *ngFor="let th of savedThemes()" class="saved-item-row">
                  <div class="saved-item-info" (click)="openThemeDetails(th); savedDropdownOpen.set(false)">
                    <div class="saved-mini-swatches">
                      <span *ngFor="let dot of getPreviewDots(th)" class="m-dot" [style.background-color]="dot"></span>
                    </div>
                    <span class="saved-item-name" [title]="th.name">{{ th.name }}</span>
                    <span class="saved-item-mode" [class.dark]="th.mode === 'dark'">{{ th.mode === 'dark' ? 'Dark' : 'Light' }}</span>
                  </div>

                  <div class="saved-item-actions">
                    <button type="button" class="s-action-btn" (click)="deleteSavedTheme(th.id)" title="Delete saved theme">
                      <ts-icon name="trash-2" [size]="12" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Backdrop for dropdowns -->
      <div *ngIf="savedDropdownOpen()" class="click-outside-backdrop" (click)="savedDropdownOpen.set(false)"></div>

      <!-- VIEW 1: THEME DISCOVERY & GENERATION GALLERY -->
      <div *ngIf="activeView() === 'gallery'" class="gallery-view-container">
        
        <!-- Compact Theme Generation Controls Panel -->
        <section class="generation-controls-card">
          <div class="controls-grid">
            
            <!-- 1. Base Color Input -->
            <div class="control-field base-color-field">
              <label class="field-label">Base Color</label>
              <div class="base-picker-box">
                <input 
                  type="color" 
                  class="base-color-swatch"
                  [value]="selectedBaseColor()"
                  (input)="onBaseColorInput($event)"
                  title="Pick base brand color"
                />
                <input 
                  type="text" 
                  class="base-hex-text"
                  [value]="selectedBaseColor()"
                  (change)="onManualBaseHexChange($event)"
                  maxlength="7"
                />
                <button 
                  type="button" 
                  class="field-icon-btn"
                  (click)="randomizeBaseColor()"
                  title="Randomize color"
                >
                  <ts-icon name="refresh-cw" [size]="12" />
                </button>
              </div>
            </div>

            <!-- 2. Theme Style (12 options) -->
            <div class="control-field">
              <label class="field-label">Theme Style</label>
              <div class="select-wrap">
                <select 
                  class="styled-select" 
                  [ngModel]="selectedStyle()" 
                  (ngModelChange)="onStyleChange($event)"
                >
                  <option value="minimal">Minimal</option>
                  <option value="modern">Modern</option>
                  <option value="corporate">Corporate</option>
                  <option value="elegant">Elegant</option>
                  <option value="creative">Creative</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="brutalist">Brutal</option>
                  <option value="glass">Glass</option>
                  <option value="editorial">Editorial</option>
                  <option value="luxury">Luxury</option>
                  <option value="dark-cinematic">Dark Cinematic</option>
                  <option value="natural">Natural</option>
                </select>
                <ts-icon name="chevron-down" [size]="12" class="select-chevron" />
              </div>
            </div>

            <!-- 3. Color Mood (8 options) -->
            <div class="control-field">
              <label class="field-label">Color Mood</label>
              <div class="select-wrap">
                <select 
                  class="styled-select" 
                  [ngModel]="selectedMood()" 
                  (ngModelChange)="onMoodChange($event)"
                >
                  <option value="calm">Calm</option>
                  <option value="warm">Warm</option>
                  <option value="cool">Cool</option>
                  <option value="bold">Bold</option>
                  <option value="muted">Muted</option>
                  <option value="pastel">Pastel</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="neutral">Neutral</option>
                </select>
                <ts-icon name="chevron-down" [size]="12" class="select-chevron" />
              </div>
            </div>

            <!-- 4. Application Type (9 options) -->
            <div class="control-field">
              <label class="field-label">Application Type</label>
              <div class="select-wrap">
                <select 
                  class="styled-select" 
                  [ngModel]="selectedAppType()" 
                  (ngModelChange)="onAppTypeChange($event)"
                >
                  <option value="saas-dashboard">SaaS Dashboard</option>
                  <option value="fintech">FinTech</option>
                  <option value="developer-tool">Developer Tool</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="productivity">Productivity</option>
                  <option value="admin-panel">Admin Panel</option>
                  <option value="landing-page">Landing Page</option>
                  <option value="mobile-app">Mobile App</option>
                </select>
                <ts-icon name="chevron-down" [size]="12" class="select-chevron" />
              </div>
            </div>

            <!-- 5. Theme Mode (Light / Dark / Both) -->
            <div class="control-field mode-toggle-field">
              <label class="field-label">Theme Mode</label>
              <div class="segmented-control">
                <button 
                  type="button" 
                  class="segment-btn" 
                  [class.active]="selectedMode() === 'light'"
                  (click)="onModeChange('light')"
                >
                  Light
                </button>
                <button 
                  type="button" 
                  class="segment-btn" 
                  [class.active]="selectedMode() === 'dark'"
                  (click)="onModeChange('dark')"
                >
                  Dark
                </button>
                <button 
                  type="button" 
                  class="segment-btn" 
                  [class.active]="selectedMode() === 'both'"
                  (click)="onModeChange('both')"
                >
                  Both
                </button>
              </div>
            </div>

            <!-- 6. Variations Count -->
            <div class="control-field variations-field">
              <label class="field-label">Variations</label>
              <div class="select-wrap">
                <select 
                  class="styled-select" 
                  [ngModel]="selectedVariationsCount()" 
                  (ngModelChange)="onVariationsCountChange($event)"
                >
                  <option [value]="2">2 themes</option>
                  <option [value]="4">4 themes</option>
                  <option [value]="6">6 themes</option>
                  <option [value]="8">8 themes</option>
                </select>
                <ts-icon name="chevron-down" [size]="12" class="select-chevron" />
              </div>
            </div>
          </div>
        </section>

        <!-- Curated Categories & Search Filter Bar -->
        <section class="discovery-filter-bar" id="themes-discovery-section">
          <!-- Category Pills -->
          <div class="categories-scroll-wrapper">
            <button 
              *ngFor="let cat of curatedCategories" 
              type="button" 
              class="cat-pill"
              [class.active]="selectedCategory() === cat"
              (click)="onCategorySelect(cat)"
            >
              {{ cat }}
            </button>
          </div>

          <!-- Search Input -->
          <div class="search-box">
            <ts-icon name="search" [size]="13" class="search-icon" />
            <input 
              type="text" 
              class="search-input" 
              placeholder="Search themes by name or style..." 
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
            />
            <button 
              *ngIf="searchQuery()" 
              type="button" 
              class="clear-search-btn"
              (click)="searchQuery.set('')"
            >
              <ts-icon name="x" [size]="12" />
            </button>
          </div>
        </section>

        <!-- Results Counter -->
        <div class="results-meta-row">
          <span class="count-badge">Showing {{ filteredThemes().length }} unique themes</span>
          <span *ngIf="selectedCategory() !== 'All'" class="filter-indicator">
            in <strong>{{ selectedCategory() }}</strong>
          </span>
        </div>

        <!-- Premium Theme Discovery Cards Grid -->
        <section class="themes-grid">
          <app-theme-card 
            *ngFor="let th of filteredThemes(); trackBy: trackByThemeId"
            [theme]="th"
            [isSaved]="savedThemeIds().has(th.id)"
            (view)="openThemeDetails($event)"
            (apply)="applyThemeToStudio($event)"
            (save)="saveThemeToLibrary($event)"
            (export)="openThemeExportModal($event)"
            (toggleFavorite)="toggleThemeFavorite($event)"
          />
        </section>

        <!-- Continuous Theme Expansion Trigger -->
        <div *ngIf="filteredThemes().length > 0" class="show-more-container">
          <button 
            type="button" 
            class="show-more-link"
            (click)="loadMoreThemes()"
            title="Generate and show more application themes"
          >
            <ts-icon name="loader" [size]="14" class="show-more-icon" />
            <span>Show more...</span>
          </button>
        </div>

        <!-- Empty State if search fails -->
        <div *ngIf="filteredThemes().length === 0" class="empty-search-state">
          <ts-icon name="compass" [size]="32" class="empty-icon" />
          <h4 class="empty-title">No matching themes found</h4>
          <p class="empty-desc">Try clearing your search query or selecting "All" categories to view all available themes.</p>
          <button type="button" class="reset-filter-btn" (click)="resetFilters()">
            <span>Reset Filters</span>
          </button>
        </div>

      </div>

      <!-- VIEW 2: DEDICATED THEME DETAILS PAGE -->
      <div *ngIf="activeView() === 'details' && selectedTheme()" class="details-view-container">
        <app-theme-details 
          [theme]="selectedTheme()!"
          (back)="activeView.set('gallery')"
          (themeChange)="onThemeUpdated($event)"
          (apply)="applyThemeToStudio($event)"
          (duplicate)="saveThemeToLibrary($event)"
        />
      </div>

      <!-- Theme Export Modal for Individual Themes -->
      <div *ngIf="showThemeExport() && exportingTheme()" class="modal-backdrop" (click)="closeThemeExportModal()">
        <div class="export-modal-box theme-export-modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div class="modal-title-group">
              <h3 class="modal-title">Export Theme: {{ exportingTheme()?.name }}</h3>
              <span class="modal-subtitle">{{ exportingTheme()?.category }} • {{ exportingTheme()?.mode }} mode</span>
            </div>
            <button type="button" class="close-btn" (click)="closeThemeExportModal()" title="Close dialog">
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Format Tabs (6 formats: css, scss, tailwind, json, design-tokens, png) -->
          <div class="export-tabs-row">
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="themeExportFormat() === 'css'"
              (click)="themeExportFormat.set('css')"
            >
              CSS Variables
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="themeExportFormat() === 'scss'"
              (click)="themeExportFormat.set('scss')"
            >
              SCSS Variables
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="themeExportFormat() === 'tailwind'"
              (click)="themeExportFormat.set('tailwind')"
            >
              Tailwind
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="themeExportFormat() === 'json'"
              (click)="themeExportFormat.set('json')"
            >
              JSON Tokens
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="themeExportFormat() === 'design-tokens'"
              (click)="themeExportFormat.set('design-tokens')"
            >
              Design Tokens
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="themeExportFormat() === 'png'"
              (click)="themeExportFormat.set('png')"
            >
              PNG Card
            </button>
          </div>

          <!-- Code View / PNG Preview -->
          <div *ngIf="themeExportFormat() !== 'png'" class="code-box">
            <pre><code>{{ getThemeExportCode() }}</code></pre>
          </div>

          <div *ngIf="themeExportFormat() === 'png'" class="png-export-preview">
            <div class="png-info-card">
              <ts-icon name="image" [size]="28" class="png-icon" />
              <div class="png-info-text">
                <span class="png-title">High-Resolution Palette Preview (1200 × 630 PNG)</span>
                <span class="png-desc">Crisp, ready-to-share card with color composition swatches, contrast ratios, and semantic token metadata.</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions-row">
            <button 
              *ngIf="themeExportFormat() !== 'png'" 
              type="button" 
              class="modal-btn" 
              (click)="copyThemeExportCode()"
            >
              <ts-icon name="copy" [size]="13" />
              <span>Copy Code</span>
            </button>
            <button 
              type="button" 
              class="modal-btn primary" 
              (click)="downloadThemeExport()"
            >
              <ts-icon name="download" [size]="13" />
              <span>{{ themeExportFormat() === 'png' ? 'Download PNG Card' : 'Download File' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Export Modal for Global / Quick Export -->
      <div *ngIf="showExport()" class="modal-backdrop" (click)="toggleExportDialog()">
        <div class="export-modal-box" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3 class="modal-title">Export Color Tokens</h3>
            <button type="button" class="close-btn" (click)="toggleExportDialog()">
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Format Tabs -->
          <div class="export-tabs-row">
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="exportTab() === 'css'"
              (click)="exportTab.set('css')"
            >
              CSS Variables
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="exportTab() === 'tailwind'"
              (click)="exportTab.set('tailwind')"
            >
              Tailwind
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="exportTab() === 'json'"
              (click)="exportTab.set('json')"
            >
              JSON
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="exportTab() === 'hex'"
              (click)="exportTab.set('hex')"
            >
              HEX List
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="exportTab() === 'gpl'"
              (click)="exportTab.set('gpl')"
            >
              GIMP (.gpl)
            </button>
            <button 
              type="button" 
              class="e-tab" 
              [class.active]="exportTab() === 'ase'"
              (click)="exportTab.set('ase')"
            >
              Adobe (.ase)
            </button>
          </div>

          <!-- Code View -->
          <div class="code-box">
            <pre><code>{{ getExportCode() }}</code></pre>
          </div>

          <!-- Actions -->
          <div class="modal-actions-row">
            <button type="button" class="modal-btn" (click)="copyExportCode()">
              <ts-icon name="copy" [size]="13" />
              <span>Copy Code</span>
            </button>
            <button type="button" class="modal-btn primary" (click)="downloadExportFile()">
              <ts-icon name="download" [size]="13" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .palette-stage-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 1320px;
      margin: 0 auto;
      padding: 0 16px 40px;
      box-sizing: border-box;
      position: relative;
    }

    /* Workspace Header */
    .workspace-module-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px 20px;
      border-radius: 14px;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    :host-context([data-theme="dark"]) .workspace-module-header,
    :host-context(.dark) .workspace-module-header {
      background: var(--bg-surface, #131722);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .workspace-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .workspace-title,
    :host-context(.dark) .workspace-title {
      color: var(--text-primary, #f8fafc);
    }

    .workspace-subtitle {
      font-size: 13px;
      color: var(--text-muted, #64748b);
      margin: 0;
    }

    .workspace-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .toolbar-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #0f172a);
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .toolbar-action-btn,
    :host-context(.dark) .toolbar-action-btn {
      background: var(--bg-surface, #1e293b);
      color: var(--text-primary, #f8fafc);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .toolbar-action-btn:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.04));
      border-color: var(--border-strong, #cbd5e1);
    }

    @keyframes saved-lib-ping {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6);
      }
      40% {
        transform: scale(1.05);
        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.3), 0 4px 14px rgba(37, 99, 235, 0.35);
        border-color: #2563eb;
        color: #2563eb;
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
      }
    }

    .toolbar-action-btn.saved-highlight {
      animation: saved-lib-ping 0.85s cubic-bezier(0.16, 1, 0.3, 1);
      border-color: #2563eb !important;
      color: #2563eb !important;
      background: rgba(37, 99, 235, 0.12) !important;
    }

    :host-context([data-theme="dark"]) .toolbar-action-btn.saved-highlight,
    :host-context(.dark) .toolbar-action-btn.saved-highlight {
      border-color: #60a5fa !important;
      color: #93c5fd !important;
      background: rgba(37, 99, 235, 0.25) !important;
    }

    .toolbar-action-btn.saved-highlight .saved-lib-icon {
      animation: bookmark-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .toolbar-action-btn.primary {
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
      border-color: transparent;
      font-weight: 600;
    }

    .toolbar-action-btn.primary:hover {
      filter: brightness(1.08);
    }

    .space-kbd {
      font-size: 10px;
      background: rgba(255, 255, 255, 0.25);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: inherit;
    }

    /* Saved Themes Dropdown */
    .saved-dropdown-wrap {
      position: relative;
    }

    .saved-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: min(330px, calc(100vw - 32px));
      max-width: calc(100vw - 24px);
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.2);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    :host-context([data-theme="dark"]) .saved-dropdown-menu,
    :host-context(.dark) .saved-dropdown-menu {
      background: var(--bg-surface, #131722);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .dropdown-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle, #e2e8f0);
      padding-bottom: 6px;
    }

    .dropdown-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    :host-context([data-theme="dark"]) .dropdown-title,
    :host-context(.dark) .dropdown-title {
      color: var(--text-primary, #f8fafc);
    }

    .dropdown-count {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    .dropdown-empty {
      padding: 16px;
      text-align: center;
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }

    .dropdown-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 240px;
      overflow-y: auto;
    }

    .saved-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }

    .saved-item-row:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="dark"]) .saved-item-row:hover,
    :host-context(.dark) .saved-item-row:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .saved-item-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }

    .saved-mini-swatches {
      display: flex;
      gap: 3px;
      flex-shrink: 0;
    }

    .m-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .saved-item-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    :host-context([data-theme="dark"]) .saved-item-name,
    :host-context(.dark) .saved-item-name {
      color: var(--text-primary, #f8fafc);
    }

    .saved-item-mode {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(148, 163, 184, 0.15);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      color: var(--text-secondary, #475569);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap !important;
      word-break: keep-all !important;
      flex-shrink: 0 !important;
      min-width: 44px;
      line-height: 1.2;
    }

    .saved-item-mode.dark {
      background: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.28);
      color: #818cf8;
    }

    :host-context([data-theme="dark"]) .saved-item-mode:not(.dark),
    :host-context(.dark) .saved-item-mode:not(.dark) {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text-secondary, #94a3b8);
    }

    .saved-item-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .s-action-btn {
      background: transparent;
      border: none;
      padding: 4px;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .s-action-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .click-outside-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
    }

    /* Generation Controls Card */
    .generation-controls-card {
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      border-radius: 14px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    :host-context([data-theme="dark"]) .generation-controls-card,
    :host-context(.dark) .generation-controls-card {
      background: var(--bg-surface, #131722);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .controls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      align-items: end;
      gap: 14px;
    }

    .mode-toggle-field {
      min-width: 180px;
    }

    .control-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary, #475569);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    :host-context([data-theme="dark"]) .field-label,
    :host-context(.dark) .field-label {
      color: var(--text-secondary, #94a3b8);
    }

    .base-picker-box {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 8px;
      padding: 0 6px;
      background: var(--bg-surface-secondary, #f8fafc);
    }

    :host-context([data-theme="dark"]) .base-picker-box,
    :host-context(.dark) .base-picker-box {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .base-color-swatch {
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
    }

    .base-hex-text {
      width: 80px;
      border: none;
      background: transparent;
      font-size: 12px;
      font-family: monospace;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      text-transform: uppercase;
    }

    :host-context([data-theme="dark"]) .base-hex-text,
    :host-context(.dark) .base-hex-text {
      color: var(--text-primary, #f8fafc);
    }

    .field-icon-btn {
      background: transparent;
      border: none;
      padding: 4px;
      border-radius: 4px;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }

    .select-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .styled-select {
      width: 100%;
      height: 34px;
      appearance: none;
      padding: 0 28px 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface-secondary, #f8fafc);
      color: var(--text-primary, #0f172a);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .styled-select,
    :host-context(.dark) .styled-select {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--text-primary, #f8fafc);
    }

    .select-chevron {
      position: absolute;
      right: 10px;
      pointer-events: none;
      color: var(--text-muted, #94a3b8);
    }

    .segmented-control {
      display: flex;
      height: 36px;
      padding: 3px;
      border-radius: 8px;
      background: var(--bg-surface-secondary, #F1F5F9);
      border: 1px solid var(--border-subtle, #E2E8F0);
      box-sizing: border-box;
      gap: 3px;
      width: 100%;
    }

    :host-context([data-theme="dark"]) .segmented-control,
    :host-context(.dark) .segmented-control {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .segment-btn {
      flex: 1;
      min-width: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-secondary, #64748B);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      padding: 0 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .segment-btn:hover {
      color: var(--text-primary, #0F172A);
      background: rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="dark"]) .segment-btn:hover,
    :host-context(.dark) .segment-btn:hover {
      color: #F8FAFC;
      background: rgba(255, 255, 255, 0.06);
    }

    .segment-btn.active {
      background: var(--bg-surface, #FFFFFF);
      color: var(--accent-primary, #2563EB);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    :host-context([data-theme="dark"]) .segment-btn.active,
    :host-context(.dark) .segment-btn.active {
      background: rgba(37, 99, 235, 0.25);
      color: #93C5FD;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(147, 197, 253, 0.3);
    }

    .generate-submit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      padding: 0 16px;
      border-radius: 8px;
      border: none;
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.15s ease;
    }

    .generate-submit-btn:hover {
      filter: brightness(1.08);
    }

    /* Discovery & Filter Bar */
    .discovery-filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin: 4px 0 6px;
    }

    .categories-scroll-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 2px 6px;
      max-width: 100%;
      scrollbar-width: none;
      -ms-overflow-style: none;
      -webkit-overflow-scrolling: touch;
    }

    .categories-scroll-wrapper::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .cat-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      font-size: 12px;
      font-weight: 500;
      padding: 0 14px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
      color: var(--text-secondary, #475569);
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .cat-pill,
    :host-context(.dark) .cat-pill {
      background: var(--bg-surface, #131722);
      border-color: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary, #94a3b8);
    }

    .cat-pill:hover {
      border-color: var(--border-strong, #cbd5e1);
      color: var(--text-primary, #0f172a);
      background: var(--bg-hover, rgba(0, 0, 0, 0.04));
    }

    :host-context([data-theme="dark"]) .cat-pill:hover,
    :host-context(.dark) .cat-pill:hover {
      color: var(--text-primary, #f8fafc);
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .cat-pill.active {
      background: var(--tool-accent, #2563eb);
      color: #ffffff;
      border-color: transparent;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
    }

    .cat-pill:focus-visible {
      outline: 2px solid var(--tool-accent, #2563eb);
      outline-offset: 1px;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 34px;
      width: 260px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
    }

    :host-context([data-theme="dark"]) .search-box,
    :host-context(.dark) .search-box {
      background: var(--bg-surface, #131722);
      border-color: rgba(255, 255, 255, 0.08);
    }

    .search-icon {
      color: var(--text-muted, #94a3b8);
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 12px;
      color: var(--text-primary, #0f172a);
      outline: none;
    }

    :host-context([data-theme="dark"]) .search-input,
    :host-context(.dark) .search-input {
      color: var(--text-primary, #f8fafc);
    }

    .clear-search-btn {
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
    }

    .results-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted, #64748b);
    }

    .count-badge {
      font-weight: 600;
      margin-bottom: 10px; 
    }

    /* Themes Grid */
    .themes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 18px;
    }

    /* Continuous Theme Expansion Trigger */
    .show-more-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px 0 16px;
      width: 100%;
    }

    .show-more-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--tool-accent, #2563eb);
      background: transparent;
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 999px;
      padding: 9px 24px;
      cursor: pointer;
      text-decoration: none !important;
      outline: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      user-select: none;
    }

    .show-more-link * {
      text-decoration: none !important;
    }

    .show-more-link:hover {
      background: rgba(37, 99, 235, 0.08);
      border-color: var(--tool-accent, #2563eb);
      color: var(--tool-accent, #2563eb);
      text-decoration: none !important;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }

    .show-more-link:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      text-decoration: none !important;
    }

    .show-more-link:focus-visible {
      outline: 2px solid var(--tool-accent, #2563eb);
      outline-offset: 2px;
      text-decoration: none !important;
    }

    :host-context([data-theme="dark"]) .show-more-link,
    :host-context(.dark) .show-more-link {
      border-color: rgba(255, 255, 255, 0.14);
      color: #60a5fa;
      background: rgba(255, 255, 255, 0.03);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="dark"]) .show-more-link:hover,
    :host-context(.dark) .show-more-link:hover {
      background: rgba(96, 165, 250, 0.12);
      border-color: #60a5fa;
      color: #93c5fd;
      text-decoration: none !important;
      box-shadow: 0 4px 16px rgba(96, 165, 250, 0.18);
    }

    .empty-search-state {
      padding: 48px 24px;
      border-radius: 14px;
      border: 1px dashed var(--border-subtle, #e2e8f0);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .empty-icon {
      color: var(--text-muted, #94a3b8);
    }

    .empty-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    .empty-desc {
      font-size: 12px;
      color: var(--text-muted, #64748b);
      max-width: 400px;
      margin: 0;
    }

    .reset-filter-btn {
      margin-top: 8px;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Export Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .export-modal-box {
      width: 100%;
      max-width: 620px;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.3);
    }

    :host-context([data-theme="dark"]) .export-modal-box,
    :host-context(.dark) .export-modal-box {
      background: var(--bg-surface, #131722);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .modal-title,
    :host-context(.dark) .modal-title {
      color: var(--text-primary, #f8fafc);
    }

    .close-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted, #94a3b8);
    }

    .export-tabs-row {
      display: flex;
      gap: 6px;
      overflow-x: auto;
    }

    .e-tab {
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: transparent;
      color: var(--text-secondary, #475569);
      cursor: pointer;
      white-space: nowrap;
    }

    .e-tab.active {
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
      border-color: transparent;
      font-weight: 600;
    }

    .code-box {
      background: #0f172a;
      border-radius: 8px;
      padding: 12px;
      max-height: 240px;
      overflow: auto;
    }

    .code-box pre {
      margin: 0;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #e2e8f0;
    }

    .modal-actions-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    .modal-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #0f172a);
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .modal-btn,
    :host-context(.dark) .modal-btn {
      background: #1e293b;
      color: #f8fafc;
      border-color: rgba(255, 255, 255, 0.1);
    }

    .modal-btn.primary {
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
      border-color: transparent;
      font-weight: 600;
    }

    /* Theme Export Modal */
    .theme-export-modal {
      max-width: 680px;
    }

    .modal-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .modal-subtitle {
      font-size: 11px;
      color: var(--text-muted, #64748b);
      text-transform: capitalize;
    }

    .png-export-preview {
      padding: 24px;
      background: var(--bg-surface-secondary, #f8fafc);
      border: 1px dashed var(--border-subtle, #cbd5e1);
      border-radius: 12px;
    }

    :host-context([data-theme="dark"]) .png-export-preview,
    :host-context(.dark) .png-export-preview {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .png-info-card {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .png-icon {
      color: var(--tool-accent, #2563eb);
      flex-shrink: 0;
    }

    .png-info-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .png-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    :host-context([data-theme="dark"]) .png-title,
    :host-context(.dark) .png-title {
      color: var(--text-primary, #f8fafc);
    }

    .png-desc {
      font-size: 12px;
      color: var(--text-secondary, #64748b);
      line-height: 1.4;
    }

    :host-context([data-theme="dark"]) .png-desc,
    :host-context(.dark) .png-desc {
      color: var(--text-secondary, #94a3b8);
    }

    /* ── Responsive Reflow ─────────────────────────────────────────────────── */
    @media (max-width: 1023px) {
      .toolbar-action-btn {
        min-height: 44px;
        padding: 8px 14px;
      }

      .generate-submit-btn {
        min-height: 44px;
      }

      .cat-pill {
        min-height: 40px;
      }

      .show-more-link {
        min-height: 44px;
      }

      .themes-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 639px) {
      .palette-stage-container {
        padding: 0 10px 32px;
        gap: 14px;
      }

      .workspace-module-header {
        flex-direction: column;
        align-items: stretch;
        padding: 12px 14px;
        gap: 12px;
      }

      .workspace-title {
        font-size: 18px;
      }

      .workspace-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        width: 100%;
        overflow-x: visible;
      }

      .workspace-actions .toolbar-action-btn,
      .workspace-actions .saved-dropdown-wrap {
        width: 100%;
      }

      .workspace-actions .toolbar-action-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 44px;
        white-space: nowrap;
        font-size: 11px;
      }

      .workspace-actions .toolbar-action-btn span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .saved-dropdown-menu {
        width: min(320px, calc(100vw - 28px));
        min-width: 0;
        right: 0;
        left: auto;
      }

      .generation-controls-card {
        padding: 12px;
      }

      .controls-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .controls-grid .control-field {
        width: 100%;
      }

      .generate-submit-btn {
        width: 100%;
        height: 44px;
      }

      .discovery-filter-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }

      .search-box {
        width: 100%;
        height: 44px;
        box-sizing: border-box;
      }

      .categories-scroll-wrapper {
        padding: 4px 0 8px;
      }

      .themes-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .export-modal-box,
      .theme-export-modal {
        max-width: 100%;
        padding: 16px;
        margin: 10px;
        border-radius: 12px;
      }

      .export-tabs-row {
        padding-bottom: 4px;
      }

      .e-tab {
        min-height: 40px;
        padding: 8px 12px;
      }

      .modal-actions-row {
        flex-direction: column;
        align-items: stretch;
      }

      .modal-btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }
    }
  `]
})
export class PaletteModuleComponent implements OnInit {
  public state = inject(ColorStudioStateService);
  private engine = inject(ColorEngineService);
  public paletteService = inject(PaletteService);
  public exportService = inject(ExportService);
  public themeGenService = inject(ThemeGenerationService);
  public themeExportService = inject(ThemeExportService);

  // ── Backward Compatible Palette Signals ──────────────────────────────────
  public items = this.state.paletteItems;
  public selectedHarmony = signal<PaletteHarmony>('analogous');
  public viewMode = signal<'strip' | 'cards'>('strip');
  public showExport = signal<boolean>(false);
  public exportTab = signal<'css' | 'tailwind' | 'hex' | 'json' | 'gpl' | 'ase'>('css');
  public renamingId = signal<string | null>(null);

  // ── New Theme Generator Signals ──────────────────────────────────────────
  public activeView = signal<'gallery' | 'details'>('gallery');
  public selectedTheme = signal<UiTheme | null>(null);

  public selectedBaseColor = signal<string>('#2563EB');
  public selectedStyle = signal<ThemeStyle>('modern');
  public selectedMood = signal<ColorMood>('calm');
  public selectedAppType = signal<ApplicationType>('saas-dashboard');
  public selectedMode = signal<ThemeMode>('both');
  public selectedVariationsCount = signal<number>(4);

  public selectedCategory = signal<string>('All');
  public searchQuery = signal<string>('');
  public savedDropdownOpen = signal<boolean>(false);

  public themeList = signal<UiTheme[]>([]);
  public savedThemes = signal<UiTheme[]>([]);
  public savedThemeIds = computed(() => new Set(this.savedThemes().map(t => t.id)));
  public savedLibraryHighlight = signal<boolean>(false);
  private highlightTimeout: any;

  public triggerSavedHighlight(): void {
    this.savedLibraryHighlight.set(true);
    if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
    this.highlightTimeout = setTimeout(() => {
      this.savedLibraryHighlight.set(false);
    }, 1200);
  }

  // ── Theme Continuous Expansion Tracking ──────────────────────────────────
  public generationMode = signal<'preferences' | 'curated'>('curated');
  public preferenceLoadOffset: number = 4;
  public categoryLoadOffset: number = 0;
  public curatedLoadOffset: number = 10;

  public readonly curatedCategories = [
    'All',
    'Minimal & Clean',
    'Professional',
    'Dark & Cinematic',
    'Natural & Organic',
    'Modern SaaS',
    'FinTech',
    'Creative & Colorful',
    'Luxury & Elegant',
    'High Contrast',
    'Warm & Neutral'
  ];

  // ── Keyboard Shortcode: Spacebar triggers generation ─────────────────────
  @HostListener('window:keydown', ['$event'])
  public handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.code === 'Space' && (event.target as HTMLElement)?.tagName !== 'INPUT' && (event.target as HTMLElement)?.tagName !== 'SELECT') {
      event.preventDefault();
      this.generateNewPalette();
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  public ngOnInit(): void {
    this.initThemes();
    this.loadSavedThemes();
  }

  public initThemes(): void {
    const seeds = this.themeGenService.getCuratedSeedThemes();
    this.themeList.set(seeds);
    this.curatedLoadOffset = seeds.length;
    this.generationMode.set('curated');
    if (seeds.length > 0) {
      this.selectedTheme.set(seeds[0]);
    }
  }

  // ── Filtered Themes Computed ─────────────────────────────────────────────
  public filteredThemes = computed(() => {
    let list = this.themeList();
    const cat = this.selectedCategory();
    const q = this.searchQuery().trim().toLowerCase();

    if (cat !== 'All') {
      list = list.filter(t => t.category === cat);
    }

    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.style.toLowerCase().includes(q) ||
        t.appType.toLowerCase().includes(q)
      );
    }

    return list;
  });

  public quickColors = computed<string[]>(() => {
    const saved = this.state.savedColors();
    const shared = this.state.sharedColorPalettes();
    const extracted = this.state.extractedColors().map(e => e.hex);
    const set = new Set<string>();
    [...saved, ...shared, ...extracted].forEach(c => set.add(c.toUpperCase()));
    return Array.from(set).slice(0, 10);
  });

  // ── Theme Generation Operations ──────────────────────────────────────────
  public generateCurrentTheme(): void {
    const baseColor = this.selectedBaseColor();
    const style = this.selectedStyle();
    const mood = this.selectedMood();
    const appType = this.selectedAppType();
    const mode = this.selectedMode();
    const count = Number(this.selectedVariationsCount()) || 4;

    const batch = this.themeGenService.generateThemeBatch({
      baseColor,
      style,
      mood,
      appType,
      mode,
      count
    });

    // Replace the theme list with the newly generated variations, ensuring 100% duplicate-free results
    this.themeList.set(batch);
    this.generationMode.set('preferences');
    this.preferenceLoadOffset = batch.length;

    if (batch.length > 0) {
      this.selectedTheme.set(batch[0]);
    }

    this.state.showToast(`Generated ${batch.length} unique themes`);
    this.generateNewPalette();
  }

  public exploreThemes(): void {
    this.selectedCategory.set('All');
    this.searchQuery.set('');
    const seeds = this.themeGenService.getCuratedSeedThemes();
    this.themeList.set(seeds);
    this.curatedLoadOffset = seeds.length;
    this.generationMode.set('curated');
    if (typeof document !== 'undefined') {
      const target = document.getElementById('themes-discovery-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  public onCategorySelect(cat: string): void {
    this.selectedCategory.set(cat);
    this.categoryLoadOffset = 0;
  }

  /**
   * Continuous Theme Expansion:
   * Generates and appends more distinct themes dynamically.
   * Works across Curated Explore, Category Filters, and User Preference variations.
   */
  public loadMoreThemes(): void {
    const count = 8;
    const existingFingerprints = new Set(this.themeList().map(t => this.themeGenService.getThemeFingerprint(t)));
    const cat = this.selectedCategory();

    let newThemes: UiTheme[] = [];

    if (cat !== 'All') {
      // Scenario 1: User filtered by specific category (e.g. FinTech, Minimal & Clean, etc.)
      newThemes = this.themeGenService.generateCategoryThemes(
        cat as ThemeCategory,
        count,
        existingFingerprints,
        this.categoryLoadOffset
      );
      this.categoryLoadOffset += count;
    } else if (this.generationMode() === 'preferences') {
      // Scenario 2: User generated themes via preference controls
      newThemes = this.themeGenService.generateThemeBatch({
        baseColor: this.selectedBaseColor(),
        style: this.selectedStyle(),
        mood: this.selectedMood(),
        appType: this.selectedAppType(),
        mode: this.selectedMode(),
        count,
        offset: this.preferenceLoadOffset,
        existingFingerprints
      });
      this.preferenceLoadOffset += count;
    } else {
      // Scenario 3: Curated explore gallery
      newThemes = this.themeGenService.generateCuratedBatch(
        count,
        existingFingerprints,
        this.curatedLoadOffset
      );
      this.curatedLoadOffset += count;
    }

    if (newThemes.length > 0) {
      this.themeList.update(list => [...list, ...newThemes]);
      this.state.showToast(`Loaded ${newThemes.length} more themes.`);
    } else {
      this.state.showToast('All distinct variations generated');
    }
  }

  // ── Individual Theme Export Suite ──────────────────────────────────────────
  public showThemeExport = signal<boolean>(false);
  public exportingTheme = signal<UiTheme | null>(null);
  public themeExportFormat = signal<ThemeExportFormat>('css');

  public openThemeExportModal(theme: UiTheme): void {
    this.exportingTheme.set(theme);
    this.themeExportFormat.set('css');
    this.showThemeExport.set(true);
  }

  public closeThemeExportModal(): void {
    this.showThemeExport.set(false);
  }

  public getThemeExportCode(): string {
    const theme = this.exportingTheme();
    if (!theme) return '';
    return this.themeExportService.generateCode(theme, this.themeExportFormat());
  }

  public copyThemeExportCode(): void {
    const code = this.getThemeExportCode();
    if (!code) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.state.showToast('Theme code copied to clipboard');
      });
    }
  }

  public downloadThemeExport(): void {
    const theme = this.exportingTheme();
    if (!theme) return;
    const format = this.themeExportFormat();
    this.themeExportService.download(theme, format);
    this.state.showToast(`Downloaded ${theme.name} (${format.toUpperCase()})`);
  }

  public trackByThemeId(index: number, theme: UiTheme): string {
    return theme.id;
  }

  public openThemeDetails(theme: UiTheme): void {
    this.selectedTheme.set(theme);
    this.activeView.set('details');
  }

  public onThemeUpdated(theme: UiTheme): void {
    this.selectedTheme.set(theme);
    this.themeList.update(list => list.map(t => t.id === theme.id ? theme : t));
  }

  public applyThemeToStudio(theme: UiTheme): void {
    this.selectedBaseColor.set(theme.baseColor);
    this.state.setSelectedColor(theme.baseColor);
    const keyColors = theme.tokens.slice(0, 5).map(t => t.hex);
    this.state.setSharedPalette(keyColors);
    this.state.showToast(`Applied ${theme.name} to Color Studio`);
  }

  public resetFilters(): void {
    this.selectedCategory.set('All');
    this.searchQuery.set('');
  }

  // ── Saved Themes Persistence ─────────────────────────────────────────────
  public loadSavedThemes(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('acklet.colorstudio.saved_themes');
      if (raw) {
        this.savedThemes.set(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }

  public persistSavedThemes(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('acklet.colorstudio.saved_themes', JSON.stringify(this.savedThemes()));
    } catch {
      // ignore
    }
  }

  public saveThemeToLibrary(theme: UiTheme): void {
    const existing = this.savedThemes().find(t => t.id === theme.id);
    if (!existing) {
      const toSave = { ...theme, isCustom: true, favorite: true };
      this.savedThemes.update(list => [toSave, ...list]);
      this.persistSavedThemes();
      this.themeList.update(list =>
        list.map(t => t.id === theme.id ? { ...t, favorite: true } : t)
      );
      this.triggerSavedHighlight();
      this.state.showToast(`Saved ${theme.name} to library`);
    } else {
      this.deleteSavedTheme(theme.id);
    }
  }

  public deleteSavedTheme(id: string): void {
    this.savedThemes.update(list => list.filter(t => t.id !== id));
    this.persistSavedThemes();
    this.themeList.update(list =>
      list.map(t => t.id === id ? { ...t, favorite: false } : t)
    );
    this.state.showToast('Theme removed from saved library');
  }

  public toggleThemeFavorite(id: string): void {
    this.themeList.update(list =>
      list.map(t => t.id === id ? { ...t, favorite: !t.favorite } : t)
    );
  }

  public toggleSavedDropdown(): void {
    this.savedDropdownOpen.update(v => !v);
  }

  public getPreviewDots(theme: UiTheme): string[] {
    return theme.tokens.slice(0, 4).map(t => t.hex);
  }

  // ── Base Color Operations (Tests & Studio Sync) ───────────────────────────
  public onBaseColorInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.onBaseColorChange(val);
  }

  public onBaseColorChange(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    this.selectedBaseColor.set(clean);
    this.state.setSelectedColor(clean);
    this.generateCurrentTheme();
  }

  public onStyleChange(style: ThemeStyle): void {
    this.selectedStyle.set(style);
    this.generateCurrentTheme();
  }

  public onMoodChange(mood: ColorMood): void {
    this.selectedMood.set(mood);
    this.generateCurrentTheme();
  }

  public onAppTypeChange(appType: ApplicationType): void {
    this.selectedAppType.set(appType);
    this.generateCurrentTheme();
  }

  public onModeChange(mode: ThemeMode): void {
    this.selectedMode.set(mode);
    this.generateCurrentTheme();
  }

  public onVariationsCountChange(count: number): void {
    this.selectedVariationsCount.set(Number(count));
    this.generateCurrentTheme();
  }

  public onManualBaseHexChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length === 3 || clean.length === 6) {
      this.onBaseColorChange('#' + clean);
    } else {
      input.value = this.state.selectedColor().toUpperCase();
    }
  }

  public setAsBase(hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    this.selectedBaseColor.set(clean);
    this.state.setSelectedColor(clean);
    this.state.showToast(`Set ${clean} as base color`);
  }

  public randomizeBaseColor(): void {
    this.state.randomizeActiveColor();
    const newColor = this.state.selectedColor();
    this.selectedBaseColor.set(newColor);
    this.generateCurrentTheme();
  }

  // ── Harmony and Generation Facade ─────────────────────────────────────────
  public onHarmonyChange(harmony: PaletteHarmony): void {
    this.selectedHarmony.set(harmony);
    this.generateNewPalette();
  }

  public setPaletteSize(size: number): void {
    const current = this.items();
    if (current.length === size) return;

    if (size > current.length) {
      const generated = this.paletteService.generatePalette(
        this.state.selectedColor(),
        this.selectedHarmony(),
        size
      );
      const newItems: PaletteItem[] = [...current];
      for (let i = current.length; i < size; i++) {
        const hex = generated[i] || '#FB7185';
        newItems.push({
          id: `p-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          hex,
          locked: false,
          name: this.paletteService.getNearestColorName(hex)
        });
      }
      this.state.paletteItems.set(newItems);
    } else {
      this.state.paletteItems.set(current.slice(0, size));
    }
    this.state.showToast(`Adjusted palette size to ${size} colors`);
  }

  public generateNewPalette(): void {
    const baseColor = this.state.selectedColor();
    const updated = this.paletteService.regenerateUnlocked(
      this.items(),
      baseColor,
      this.selectedHarmony()
    );
    this.state.paletteItems.set(updated);
  }

  // ── Item Interactions (Lock, Edit, Add, Remove, Reorder) ───────────────────
  public toggleLock(id: string): void {
    this.state.paletteItems.update(items =>
      items.map(item => item.id === id ? { ...item, locked: !item.locked } : item)
    );
  }

  public onColorTweak(id: string, hex: string): void {
    const clean = this.engine.normalizeHex(hex);
    this.state.paletteItems.update(items =>
      items.map(item => item.id === id ? { ...item, hex: clean, name: this.paletteService.getNearestColorName(clean) } : item)
    );
  }

  public addColor(): void {
    const updated = this.paletteService.addColor(this.items());
    this.state.paletteItems.set(updated);
  }

  public removeColor(id: string): void {
    if (this.items().length <= 3) {
      this.state.showToast('Palette must contain at least 3 colors');
      return;
    }
    const updated = this.paletteService.removeColor(this.items(), id);
    this.state.paletteItems.set(updated);
  }

  public reversePalette(): void {
    const updated = this.paletteService.reversePalette(this.items());
    this.state.paletteItems.set(updated);
    this.state.showToast('Reversed color order');
  }

  public copyColor(hex: string): void {
    this.state.copyToClipboard(hex.toUpperCase(), 'Color HEX');
  }

  // ── Cross-Module Dispatches ───────────────────────────────────────────────
  public pushToSharedPalette(): void {
    const colors = this.items().map(i => i.hex);
    this.state.setSharedPalette(colors);
  }

  public sendToGradient(): void {
    const colors = this.items().map(i => i.hex);
    this.state.populateGradientFromPalette(colors);
  }

  public sendToContrast(): void {
    const items = this.items();
    if (items.length >= 2) {
      this.state.setContrastFg(items[0].hex);
      this.state.setContrastBg(items[1].hex);
      this.state.setActiveModule('contrast');
      this.state.showToast(`Loaded ${items[0].hex} and ${items[1].hex} into Contrast Checker`);
    }
  }

  public sendToPicker(hex: string): void {
    this.state.sendToPicker(hex);
  }

  // ── Saved Palettes Legacy Facade ──────────────────────────────────────────
  public saveCurrentPalette(): void {
    const count = this.state.savedPalettes().length + 1;
    this.state.saveCurrentPalette(`Palette ${count}`, undefined, this.selectedHarmony());
  }

  public loadSavedPalette(saved: SavedPalette): void {
    this.state.applySavedPalette(saved);
    if (saved.harmony) {
      this.selectedHarmony.set(saved.harmony);
    }
  }

  public toggleFavorite(id: string): void {
    this.state.toggleFavoriteSavedPalette(id);
  }

  public duplicatePalette(id: string): void {
    this.state.duplicateSavedPalette(id);
  }

  public deleteSavedPalette(id: string): void {
    this.state.deleteSavedPalette(id);
  }

  public startRenaming(id: string): void {
    this.renamingId.set(id);
  }

  public saveRename(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (value) {
      this.state.updateSavedPaletteName(id, value);
    }
    this.renamingId.set(null);
  }

  // ── Color Utilities ───────────────────────────────────────────────────────
  public isDarkColor(hex: string): boolean {
    return this.engine.isDark(hex);
  }

  public getRgbString(hex: string): string {
    const rgb = this.engine.hexToRgb(hex);
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
  }

  public getHslString(hex: string): string {
    const hsl = this.engine.rgbToHsl(this.engine.hexToRgb(hex));
    return `${hsl.h}°, ${hsl.s}%, ${hsl.l}%`;
  }

  // ── Export Suite ──────────────────────────────────────────────────────────
  public toggleExportDialog(): void {
    this.showExport.update(v => !v);
  }

  public getExportCode(): string {
    const items = this.items();
    switch (this.exportTab()) {
      case 'css':
        return this.paletteService.generateCss(items);
      case 'tailwind':
        return this.paletteService.generateTailwind(items);
      case 'hex':
        return items.map(i => i.hex.toUpperCase()).join(', ');
      case 'json':
        return this.paletteService.generateJson(items);
      case 'gpl':
        return this.paletteService.generateGpl(items);
      case 'ase':
        return `Adobe Swatch Exchange (.ASE) Binary File (${items.length} swatches)`;
    }
  }

  public copyExportCode(): void {
    const code = this.getExportCode();
    this.state.copyToClipboard(code, 'Palette Code');
    this.showExport.set(false);
  }

  public downloadExportFile(): void {
    const items = this.items();
    const tab = this.exportTab();

    if (tab === 'ase') {
      const buffer = this.paletteService.generateAse(items);
      this.exportService.downloadBinaryFile(buffer, 'palette.ase', 'application/octet-stream');
      this.state.showToast('Downloaded palette.ase');
    } else if (tab === 'gpl') {
      const gpl = this.paletteService.generateGpl(items);
      this.exportService.downloadFile(gpl, 'palette.gpl', 'text/plain');
      this.state.showToast('Downloaded palette.gpl');
    } else if (tab === 'json') {
      const json = this.paletteService.generateJson(items);
      this.exportService.downloadFile(json, 'palette.json', 'application/json');
      this.state.showToast('Downloaded palette.json');
    } else if (tab === 'tailwind') {
      const tw = this.paletteService.generateTailwind(items);
      this.exportService.downloadFile(tw, 'tailwind-palette.js', 'application/javascript');
      this.state.showToast('Downloaded tailwind-palette.js');
    } else {
      const css = this.paletteService.generateCss(items);
      this.exportService.downloadFile(css, 'palette.css', 'text/css');
      this.state.showToast('Downloaded palette.css');
    }
  }

  public downloadPngGraphic(): void {
    const canvas = this.paletteService.renderToCanvas(this.items(), 1200, 420);
    if (!canvas) {
      this.state.showToast('Canvas rendering unavailable');
      return;
    }

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'palette.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.state.showToast('Downloaded palette.png graphic');
    }, 'image/png');
  }
}
