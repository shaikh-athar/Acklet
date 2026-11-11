// apps/tool-color-studio/src/components/contrast/contrast-module.component.ts
import {
  Component,
  inject,
  ChangeDetectionStrategy,
  computed,
  signal,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorEngineService } from '../../services/color-engine.service';
import { ContrastService, GradientContrastReport } from '../../services/contrast.service';
import { ExportService } from '../../services/export.service';
import {
  WcagCriterion,
  DetailedContrastResult,
  ContrastSuggestion,
  RgbColor,
  HslColor
} from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-contrast-module',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contrast-stage-container">

      <!-- Single Workspace Module Header -->
      <div class="workspace-module-header">
        <div class="header-titles">
          <h2 class="workspace-title">Contrast Checker</h2>
          <p class="workspace-subtitle">Check readability between foreground and background colors.</p>
        </div>
        <div class="workspace-actions">
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="swapColors()"
            title="Swap foreground and background colors"
          >
            <ts-icon name="repeat" [size]="14" />
            <span class="label-full">Swap Colors</span>
            <span class="label-short">Swap</span>
          </button>
          <button 
            type="button" 
            class="toolbar-action-btn" 
            (click)="copyRatio()"
            title="Copy contrast ratio to clipboard"
          >
            <ts-icon name="copy" [size]="14" />
            <span class="label-full">Copy Ratio</span>
            <span class="label-short">Copy ratio</span>
          </button>
          <!-- Export & Share Dropdown Menu -->
          <div class="export-dropdown-container">
            <button 
              type="button" 
              class="toolbar-action-btn primary" 
              (click)="toggleExportDropdown()"
              title="Export and share contrast evaluation reports"
              aria-haspopup="true"
              [attr.aria-expanded]="exportDropdownOpen()"
            >
              <ts-icon name="download" [size]="14" />
              <span class="label-full">Export & Share</span>
              <span class="label-short">Export</span>
              <ts-icon name="chevron-down" [size]="12" class="dropdown-arrow" [class.open]="exportDropdownOpen()" />
            </button>

            @if (exportDropdownOpen()) {
              <div class="export-dropdown-backdrop" (click)="closeExportDropdown()"></div>
              <div class="export-dropdown-menu animate-scale-in" role="menu">
                <div class="dropdown-section-title">Quick Copy</div>
                <button type="button" class="dropdown-item-btn" (click)="copyRatio(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="copy" [size]="13" />
                  <span>Copy Ratio ({{ result().ratioString }})</span>
                </button>
                <button type="button" class="dropdown-item-btn" (click)="copyFgHex(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="copy" [size]="13" />
                  <span>Copy Text HEX ({{ state.contrastFg() }})</span>
                </button>
                <button type="button" class="dropdown-item-btn" (click)="copyBgHex(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="copy" [size]="13" />
                  <span>Copy BG HEX ({{ state.contrastBg() }})</span>
                </button>

                <div class="dropdown-divider"></div>
                <div class="dropdown-section-title">Download Reports</div>
                <button type="button" class="dropdown-item-btn" (click)="exportJson(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="download" [size]="13" />
                  <span>JSON Report (.json)</span>
                </button>
                <button type="button" class="dropdown-item-btn" (click)="exportCss(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="file-text" [size]="13" />
                  <span>CSS Tokens (.css)</span>
                </button>
                <button type="button" class="dropdown-item-btn" (click)="exportMarkdownReport(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="file-text" [size]="13" />
                  <span>Markdown Summary (.md)</span>
                </button>

                <div class="dropdown-divider"></div>
                <button type="button" class="dropdown-item-btn highlight" (click)="exportReportPdf(); closeExportDropdown()" role="menuitem">
                  <ts-icon name="printer" [size]="13" />
                  <span>Print / PDF Report</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="contrast-stage-grid">
        
        <!-- Left Column: Controls, Scores & Criteria in Unified Panel + Color Suggestions -->
        <div class="contrast-controls-column">
          
          <div class="contrast-unified-card">

            <!-- Row 1 on tablet (side-by-side if >=360px each): Section 1 (Color Selection) & Section 2 (Contrast Ratio) -->
            <div class="selection-score-row">

              <!-- Section 1: Color Selection -->
              <div class="panel-section selection-section">
              <div class="section-header-row">
                <h3 class="section-title">Color Selection</h3>
                <div class="format-pills">
                  <button 
                    type="button" 
                    class="format-pill"
                    [class.active]="activeFormat() === 'hex'"
                    (click)="activeFormat.set('hex')"
                  >
                    HEX
                  </button>
                  <button 
                    type="button" 
                    class="format-pill"
                    [class.active]="activeFormat() === 'rgb'"
                    (click)="activeFormat.set('rgb')"
                  >
                    RGB
                  </button>
                  <button 
                    type="button" 
                    class="format-pill"
                    [class.active]="activeFormat() === 'hsl'"
                    (click)="activeFormat.set('hsl')"
                  >
                    HSL
                  </button>
                </div>
              </div>

              <!-- Foreground & Background Input Pair with Swap Button -->
              <div class="color-inputs-pair">
                
                <!-- Foreground (Text) Card -->
                <div class="color-picker-box">
                  <div class="picker-header">
                    <span class="picker-label">Foreground</span>
                    <span class="lum-tag" title="WCAG Relative Luminance">L:&nbsp;{{ fgLuminance() }}</span>
                  </div>

                  <div class="picker-row">
                    <input 
                      type="color" 
                      #fgPicker
                      class="swatch-color-input" 
                      [ngModel]="state.contrastFg()" 
                      (ngModelChange)="onFgChange($event)"
                      aria-label="Foreground text color picker"
                    />
                    <div class="hex-input-wrapper">
                      <span class="hex-symbol">#</span>
                      <input 
                        type="text" 
                        class="hex-text-input" 
                        [value]="fgWithoutHash()" 
                        (change)="onManualFgChange($event)"
                        maxlength="8"
                        spellcheck="false"
                        aria-label="Foreground color hex"
                      />
                    </div>
                    <button 
                      type="button" 
                      class="picker-link-btn" 
                      (click)="triggerNativePicker(fgPicker)"
                      title="Edit color"
                      aria-label="Edit foreground color"
                    >
                      <ts-icon name="palette" [size]="13" />
                    </button>
                  </div>

                  <!-- Expanded RGB / HSL Controls -->
                  @if (activeFormat() === 'rgb') {
                    <div class="multi-channel-row">
                      <div class="channel-unit">
                        <span class="ch-label">R</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="255" 
                          class="ch-input" 
                          [value]="fgRgb().r" 
                          (change)="onFgRgbChange('r', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">G</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="255" 
                          class="ch-input" 
                          [value]="fgRgb().g" 
                          (change)="onFgRgbChange('g', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">B</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="255" 
                          class="ch-input" 
                          [value]="fgRgb().b" 
                          (change)="onFgRgbChange('b', $event)" 
                        />
                      </div>
                    </div>
                  }

                  @if (activeFormat() === 'hsl') {
                    <div class="multi-channel-row">
                      <div class="channel-unit">
                        <span class="ch-label">H</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="360" 
                          class="ch-input" 
                          [value]="fgHsl().h" 
                          (change)="onFgHslChange('h', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">S%</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          class="ch-input" 
                          [value]="fgHsl().s" 
                          (change)="onFgHslChange('s', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">L%</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          class="ch-input" 
                          [value]="fgHsl().l" 
                          (change)="onFgHslChange('l', $event)" 
                        />
                      </div>
                    </div>
                  }
                </div>

                <!-- Central Swap Button -->
                <div class="swap-divider">
                  <button 
                    type="button" 
                    class="center-swap-btn" 
                    (click)="swapColors()"
                    title="Swap foreground and background colors"
                    aria-label="Swap colors"
                  >
                    <ts-icon name="repeat" [size]="16" />
                  </button>
                </div>

                <!-- Background Card -->
                <div class="color-picker-box">
                  <div class="picker-header">
                    <span class="picker-label">Background</span>
                    <span class="lum-tag" title="WCAG Relative Luminance">L:&nbsp;{{ bgLuminance() }}</span>
                  </div>

                  <div class="picker-row">
                    <input 
                      type="color" 
                      #bgPicker
                      class="swatch-color-input" 
                      [ngModel]="state.contrastBg()" 
                      (ngModelChange)="onBgChange($event)"
                      aria-label="Background color picker"
                    />
                    <div class="hex-input-wrapper">
                      <span class="hex-symbol">#</span>
                      <input 
                        type="text" 
                        class="hex-text-input" 
                        [value]="bgWithoutHash()" 
                        (change)="onManualBgChange($event)"
                        maxlength="8"
                        spellcheck="false"
                        aria-label="Background color hex"
                      />
                    </div>
                    <button 
                      type="button" 
                      class="picker-link-btn" 
                      (click)="triggerNativePicker(bgPicker)"
                      title="Edit color"
                      aria-label="Edit background color"
                    >
                      <ts-icon name="palette" [size]="13" />
                    </button>
                  </div>

                  <!-- Expanded RGB / HSL Controls -->
                  @if (activeFormat() === 'rgb') {
                    <div class="multi-channel-row">
                      <div class="channel-unit">
                        <span class="ch-label">R</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="255" 
                          class="ch-input" 
                          [value]="bgRgb().r" 
                          (change)="onBgRgbChange('r', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">G</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="255" 
                          class="ch-input" 
                          [value]="bgRgb().g" 
                          (change)="onBgRgbChange('g', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">B</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="255" 
                          class="ch-input" 
                          [value]="bgRgb().b" 
                          (change)="onBgRgbChange('b', $event)" 
                        />
                      </div>
                    </div>
                  }

                  @if (activeFormat() === 'hsl') {
                    <div class="multi-channel-row">
                      <div class="channel-unit">
                        <span class="ch-label">H</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="360" 
                          class="ch-input" 
                          [value]="bgHsl().h" 
                          (change)="onBgHslChange('h', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">S%</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          class="ch-input" 
                          [value]="bgHsl().s" 
                          (change)="onBgHslChange('s', $event)" 
                        />
                      </div>
                      <div class="channel-unit">
                        <span class="ch-label">L%</span>
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          class="ch-input" 
                          [value]="bgHsl().l" 
                          (change)="onBgHslChange('l', $event)" 
                        />
                      </div>
                    </div>
                  }
                </div>

              </div>

              <!-- Quick Swatches from Saved & Shared Palettes -->
              @if (quickColors().length > 0) {
                <div class="quick-swatches-bar">
                  <div class="quick-swatches-header">
                    <span class="quick-label">Quick Swatches:</span>
                    @if (showAllSwatches() && allQuickColors().length > 8) {
                      <button type="button" class="swatch-collapse-btn" (click)="toggleShowAllSwatches()">
                        Show Less
                      </button>
                    }
                  </div>
                  <div class="swatches-grid-container" data-no-swipe>
                    @for (col of quickColors(); track col) {
                      <div class="swatch-dual-actions">
                        <button 
                          type="button" 
                          class="quick-dot-btn"
                          [style.background-color]="col"
                          (click)="state.setContrastFg(col)"
                          [title]="'Set ' + col + ' as Foreground'"
                          aria-label="Set as foreground"
                        ></button>
                        <button 
                          type="button" 
                          class="mini-role-pill"
                          (click)="state.setContrastBg(col)"
                          [title]="'Set ' + col + ' as Background'"
                          aria-label="Set as background"
                        >
                          BG
                        </button>
                      </div>
                    }
                    @if (hasMoreSwatches()) {
                      <button 
                        type="button" 
                        class="swatch-overflow-btn" 
                        (click)="toggleShowAllSwatches()"
                        title="Show remaining swatches"
                        aria-label="Show more swatches"
                      >
                        +{{ remainingSwatchesCount() }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Section 2: Contrast Ratio Result -->
            <div class="panel-section score-section">
              <div 
                class="score-hero-card" 
                [class.hero-pass]="result().aaNormal" 
                [class.hero-fail]="!result().aaNormal"
              >
                <div class="ratio-details">
                  <span class="ratio-subtitle">Contrast Ratio</span>
                  <div class="ratio-value-row">
                    <span class="huge-ratio-number">{{ result().ratioString }}</span>
                    <button 
                      type="button" 
                      class="copy-ratio-ghost" 
                      (click)="copyRatio()"
                      title="Copy ratio to clipboard"
                    >
                      <ts-icon name="copy" [size]="14" />
                    </button>
                  </div>
                  <span class="human-rating-badge">{{ result().ratingLabel }}</span>
                </div>

                <div class="grade-badge-box">
                  <div 
                    class="grade-pill" 
                    [class.grade-aaa]="result().grade === 'AAA'" 
                    [class.grade-aa]="result().grade === 'AA'" 
                    [class.grade-fail]="result().grade === 'Fail'"
                  >
                    <ts-icon [name]="result().grade === 'Fail' ? 'circle-alert' : 'shield-check'" [size]="15" />
                    <span>Level {{ result().grade }}</span>
                  </div>
                  <span class="grade-subtext">
                    {{ result().aaaNormal ? 'Meets highest contrast standards' : result().aaNormal ? 'Meets minimum web standards' : 'Fails minimum body contrast' }}
                  </span>
                </div>
              </div>
            </div>

          </div>

          <div class="section-divider"></div>

          <!-- Section 3: WCAG 2.2 Conformance Matrix -->
          <div class="panel-section criteria-section">
              <div class="section-header-row">
                <h3 class="section-title">WCAG 2.2 Criteria</h3>

                <!-- Filter Tabs -->
                <div class="criterion-filter-pills" data-no-swipe>
                  <button 
                    type="button" 
                    class="filter-tab"
                    [class.active]="selectedCriterion() === 'all'"
                    (click)="selectedCriterion.set('all')"
                  >
                    All
                  </button>
                  <button 
                    type="button" 
                    class="filter-tab"
                    [class.active]="selectedCriterion() === 'aa'"
                    (click)="selectedCriterion.set('aa')"
                  >
                    AA
                  </button>
                  <button 
                    type="button" 
                    class="filter-tab"
                    [class.active]="selectedCriterion() === 'aaa'"
                    (click)="selectedCriterion.set('aaa')"
                  >
                    AAA
                  </button>
                  <button 
                    type="button" 
                    class="filter-tab"
                    [class.active]="selectedCriterion() === 'normal'"
                    (click)="selectedCriterion.set('normal')"
                  >
                    Normal
                  </button>
                  <button 
                    type="button" 
                    class="filter-tab"
                    [class.active]="selectedCriterion() === 'large'"
                    (click)="selectedCriterion.set('large')"
                  >
                    Large
                  </button>
                  <button 
                    type="button" 
                    class="filter-tab"
                    [class.active]="selectedCriterion() === 'ui'"
                    (click)="selectedCriterion.set('ui')"
                  >
                    UI
                  </button>
                </div>
              </div>

              <!-- Clean 1-Line Criteria Rows -->
              <div class="criteria-list">
                @if (shouldShowCriterion('normal-aa')) {
                  <div class="criterion-item-row">
                    <div class="crit-title-line">
                      <span class="crit-name">Normal Text (AA)</span>
                      <span class="crit-req-badge">&ge; 4.5:1</span>
                    </div>
                    <div class="crit-status-cell">
                      <span class="status-badge" [class.badge-pass]="result().aaNormal" [class.badge-fail]="!result().aaNormal">
                        <ts-icon [name]="result().aaNormal ? 'check' : 'x'" [size]="12" />
                        <span>{{ result().aaNormal ? 'PASS' : 'FAIL' }}</span>
                      </span>
                    </div>
                  </div>
                }

                @if (shouldShowCriterion('large-aa')) {
                  <div class="criterion-item-row">
                    <div class="crit-title-line">
                      <span class="crit-name">Large Text (AA)</span>
                      <span class="crit-req-badge">&ge; 3.0:1</span>
                    </div>
                    <div class="crit-status-cell">
                      <span class="status-badge" [class.badge-pass]="result().aaLarge" [class.badge-fail]="!result().aaLarge">
                        <ts-icon [name]="result().aaLarge ? 'check' : 'x'" [size]="12" />
                        <span>{{ result().aaLarge ? 'PASS' : 'FAIL' }}</span>
                      </span>
                    </div>
                  </div>
                }

                @if (shouldShowCriterion('normal-aaa')) {
                  <div class="criterion-item-row">
                    <div class="crit-title-line">
                      <span class="crit-name">Normal Text (AAA)</span>
                      <span class="crit-req-badge">&ge; 7.0:1</span>
                    </div>
                    <div class="crit-status-cell">
                      <span class="status-badge" [class.badge-pass]="result().aaaNormal" [class.badge-fail]="!result().aaaNormal">
                        <ts-icon [name]="result().aaaNormal ? 'check' : 'x'" [size]="12" />
                        <span>{{ result().aaaNormal ? 'PASS' : 'FAIL' }}</span>
                      </span>
                    </div>
                  </div>
                }

                @if (shouldShowCriterion('large-aaa')) {
                  <div class="criterion-item-row">
                    <div class="crit-title-line">
                      <span class="crit-name">Large Text (AAA)</span>
                      <span class="crit-req-badge">&ge; 4.5:1</span>
                    </div>
                    <div class="crit-status-cell">
                      <span class="status-badge" [class.badge-pass]="result().aaaLarge" [class.badge-fail]="!result().aaaLarge">
                        <ts-icon [name]="result().aaaLarge ? 'check' : 'x'" [size]="12" />
                        <span>{{ result().aaaLarge ? 'PASS' : 'FAIL' }}</span>
                      </span>
                    </div>
                  </div>
                }

                @if (shouldShowCriterion('ui-component')) {
                  <div class="criterion-item-row">
                    <div class="crit-title-line">
                      <span class="crit-name">UI Components & Borders (AA)</span>
                      <span class="crit-req-badge">&ge; 3.0:1</span>
                    </div>
                    <div class="crit-status-cell">
                      <span class="status-badge" [class.badge-pass]="result().uiComponent" [class.badge-fail]="!result().uiComponent">
                        <ts-icon [name]="result().uiComponent ? 'check' : 'x'" [size]="12" />
                        <span>{{ result().uiComponent ? 'PASS' : 'FAIL' }}</span>
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>

          <!-- Accessible Color Suggestions (Left Column below Unified Card) -->
          <div class="controls-card sugg-card">
            <div class="card-header-simple">
              <div>
                <h3 class="card-section-title">Color Suggestions</h3>
                <span class="section-subtext">Adjusted tones meeting target readability standards</span>
              </div>

              <div class="suggestion-target-pills">
                <button 
                  type="button" 
                  class="target-pill"
                  [class.active]="suggestionTarget() === 'AA'"
                  (click)="setSuggestionTarget('AA')"
                >
                  Target AA (4.5:1)
                </button>
                <button 
                  type="button" 
                  class="target-pill"
                  [class.active]="suggestionTarget() === 'AAA'"
                  (click)="setSuggestionTarget('AAA')"
                >
                  Target AAA (7.0:1)
                </button>
              </div>
            </div>

            @if (activeSuggestions().length === 0) {
              <div class="suggestions-satisfied-box">
                <ts-icon name="shield-check" [size]="18" />
                <div>
                  <span class="sat-title">No Adjustments Needed</span>
                  <p class="sat-text">Current colors satisfy {{ suggestionTarget() }} contrast requirements ({{ result().ratioString }}).</p>
                </div>
              </div>
            } @else {
              <div class="suggestions-grid">
                @for (item of activeSuggestions(); track item.id) {
                  <div 
                    class="suggestion-card" 
                    (click)="applySuggestion(item)"
                    role="button"
                    tabindex="0"
                    (keydown.enter)="applySuggestion(item)"
                    [title]="'Click to apply ' + item.hex + ' as ' + item.targetRole"
                  >
                    <div class="sugg-preview-row">
                      <div class="sugg-swatch" [style.background-color]="item.hex"></div>
                      <div class="sugg-meta">
                        <span class="sugg-name">{{ item.label }}</span>
                        <div class="sugg-tags">
                          <code class="sugg-hex">{{ item.hex.toUpperCase() }}</code>
                          <span class="sugg-ratio-badge">{{ item.ratioString }}</span>
                          <span class="sugg-grade-badge">Level {{ item.grade }}</span>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      class="apply-sugg-btn"
                      (click)="applySuggestion(item); $event.stopPropagation()"
                      [title]="'Apply ' + item.hex + ' as ' + item.targetRole"
                    >
                      <span>Apply {{ item.targetRole === 'fg' ? 'Text' : 'Background' }}</span>
                      <ts-icon name="arrow-right" [size]="12" />
                    </button>
                  </div>
                }
              </div>
            }
          </div>

        </div>

        <!-- Right Column: Realistic Contextual Preview & Gradient Background Contrast -->
        <div class="contrast-preview-column">
          
          <!-- Live Accessibility Preview Surface -->
          <div class="preview-card-wrapper">
            <div class="preview-card-top-bar">
              <span class="preview-top-title">Realistic Accessibility Preview</span>
              <div class="context-toggles">
                <button 
                  type="button" 
                  class="ctx-btn"
                  [class.active]="previewContext() === 'dark'"
                  (click)="previewContext.set('dark')"
                  title="Dark Frame Background"
                >
                  Dark Frame
                </button>
                <button 
                  type="button" 
                  class="ctx-btn"
                  [class.active]="previewContext() === 'light'"
                  (click)="previewContext.set('light')"
                  title="Light Frame Background"
                >
                  Light Frame
                </button>
              </div>
            </div>

            <!-- Viewport Container with Context Frame -->
            <div 
              class="preview-frame-container"
              [class.frame-dark]="previewContext() === 'dark'"
              [class.frame-light]="previewContext() === 'light'"
            >
              <!-- The actual accessible surface with user colors -->
              <div 
                class="live-accessible-canvas"
                [style.background-color]="state.contrastBg()"
                [style.color]="state.contrastFg()"
              >
                <!-- Category Tag -->
                <div class="canvas-header-row">
                  <span class="canvas-badge" [style.border-color]="state.contrastFg()">
                    WCAG 2.2 Preview
                  </span>
                  <span class="canvas-ratio-pill" [style.border-color]="state.contrastFg()">
                    {{ result().ratioString }}
                  </span>
                </div>

                <!-- Large Text / Heading -->
                <h2 class="canvas-large-heading" [style.color]="state.contrastFg()">
                  Clear Information Hierarchy
                </h2>

                <!-- Normal Body Text -->
                <p class="canvas-body-paragraph" [style.color]="state.contrastFg()">
                  Good contrast ensures text is comfortable to read for all users across different screens and lighting conditions.
                </p>

                <!-- UI Components: Primary and Secondary Buttons -->
                <div class="canvas-interactive-row">
                  <button 
                    type="button" 
                    class="canvas-primary-btn"
                    [style.background-color]="state.contrastFg()"
                    [style.color]="state.contrastBg()"
                  >
                    Primary Action
                  </button>

                  <button 
                    type="button" 
                    class="canvas-outline-btn"
                    [style.border-color]="state.contrastFg()"
                    [style.color]="state.contrastFg()"
                  >
                    Secondary Outline
                  </button>
                </div>

                <!-- Form Control Component -->
                <div class="canvas-form-group">
                  <label class="canvas-form-label" [style.color]="state.contrastFg()">Sample Form Input</label>
                  <div class="canvas-input-mock" [style.border-color]="state.contrastFg()">
                    <span class="mock-input-text" [style.color]="state.contrastFg()">user&#64;example.com</span>
                  </div>
                </div>

                <!-- Card Container Box Component -->
                <div class="canvas-card-component" [style.border-color]="state.contrastFg()">
                  <div class="component-header">
                    <ts-icon name="shield-check" [size]="14" />
                    <span class="comp-title">Interactive Elements</span>
                  </div>
                  <p class="comp-desc">
                    Buttons, borders, and input fields need clear contrast against the background so users can easily distinguish active controls.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Gradient Background Multi-Point Contrast Warning Section -->
          @if (gradientReport(); as grad) {
            <div class="controls-card grad-card">
              <div class="card-header-simple">
                <div class="grad-title-row">
                  <ts-icon name="sliders-horizontal" [size]="15" />
                  <h3 class="card-section-title">Gradient Background Contrast</h3>
                </div>
                <button 
                  type="button" 
                  class="action-btn-mini"
                  (click)="evaluateActiveGradient()"
                >
                  <ts-icon name="refresh-cw" [size]="12" />
                  <span>Re-check</span>
                </button>
              </div>

              @if (grad.warning) {
                <div class="gradient-warning-banner">
                  <ts-icon name="circle-alert" [size]="16" />
                  <div class="warning-content">
                    <span class="warning-title">Low Contrast on Some Stops</span>
                    <p class="warning-text">Text contrast drops to {{ grad.minRatio.toFixed(2) }}:1 on parts of this gradient.</p>
                  </div>
                </div>
              } @else {
                <div class="gradient-pass-banner">
                  <ts-icon name="shield-check" [size]="16" />
                  <div class="warning-content">
                    <span class="pass-title">Gradient Contrast Safe</span>
                    <p class="pass-text">Text is legible across all {{ grad.stopResults.length }} stops (lowest: {{ grad.minRatio.toFixed(2) }}:1).</p>
                  </div>
                </div>
              }

              <!-- Stops Matrix -->
              <div class="grad-stops-table">
                @for (st of grad.stopResults; track st.position) {
                  <div class="grad-stop-row">
                    <div class="stop-left-group">
                      <div class="stop-color-dot" [style.background-color]="st.color"></div>
                      <span class="stop-pos">{{ st.position }}%</span>
                      <code class="stop-hex">{{ st.color.toUpperCase() }}</code>
                    </div>
                    <div class="stop-right-group">
                      <span class="stop-ratio">{{ st.ratio.toFixed(2) }}:1</span>
                      <span class="stop-status" [class.pass]="st.passAA" [class.fail]="!st.passAA">
                        {{ st.passAA ? 'PASS' : 'FAIL' }}
                      </span>
                    </div>
                  </div>
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
      display: block;
      width: 100%;
    }

    .contrast-stage-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
    }

    /* ── Single Workspace Module Header ── */
    .workspace-module-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 8px;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .workspace-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .workspace-title {
      color: #0F172A;
    }

    .workspace-subtitle {
      font-size: 13px;
      color: var(--text-muted, #A1A1AA);
      margin: 0;
      line-height: 1.4;
    }

    :host-context([data-theme="light"]) .workspace-subtitle {
      color: #64748B;
    }

    .workspace-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .label-full {
      display: inline;
    }

    .label-short {
      display: none;
    }

    @media (max-width: 639px) {
      .workspace-title {
        font-size: 20px;
      }
      .workspace-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        width: 100%;
        overflow-x: visible;
        flex-wrap: wrap;
      }
      .export-dropdown-container {
        width: 100%;
      }
      .export-dropdown-menu {
        max-width: calc(100vw - 32px);
        right: 0;
      }
      .toolbar-action-btn,
      .header-btn {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-height: 48px;
        height: auto;
        padding: 6px 4px;
        position: relative;
      }
      .label-full {
        display: none !important;
      }
      .label-short {
        display: inline !important;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }
      .dropdown-arrow {
        display: none !important;
      }
    }

    .toolbar-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .toolbar-action-btn {
      background: var(--bg-2, #F1F5F9);
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      color: var(--text, #0F172A);
    }

    .toolbar-action-btn:hover:not(:disabled) {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .toolbar-action-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .toolbar-action-btn.primary {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border-color: var(--tool-accent, #2563EB);
    }

    .toolbar-action-btn.primary:hover {
      filter: brightness(1.1);
    }

    .header-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .header-btn {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.1));
      color: var(--text, #0F172A);
    }

    .header-btn:hover {
      background: var(--bg-2, #27272A);
      border-color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .header-btn:hover {
      background: #F8FAFC;
    }

    .header-btn-primary {
      background: var(--tool-accent, #2563EB);
      border-color: var(--tool-accent, #2563EB);
      color: #FFFFFF;
    }

    .header-btn-primary:hover {
      filter: brightness(1.1);
      color: #FFFFFF;
    }

    /* ── Main Layout Grid ── */
    .contrast-stage-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 20px;
      align-items: start;
      width: 100%;
    }

    .selection-score-row {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
    }

    @media (min-width: 640px) and (max-width: 1023px) {
      .contrast-stage-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
      }
      .contrast-controls-column,
      .contrast-preview-column {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
      }
      .selection-score-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 16px;
        align-items: stretch;
      }
      .selection-section,
      .score-section {
        height: 100%;
        justify-content: space-between;
      }
    }

    @media (max-width: 639px) {
      .contrast-stage-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
      }
      .contrast-controls-column,
      .contrast-preview-column {
        display: contents !important;
      }
      .contrast-unified-card {
        order: 1 !important;
        padding: 14px;
        gap: 14px;
      }
      .preview-card-wrapper {
        order: 2 !important;
      }
      .sugg-card {
        order: 3 !important;
        padding: 14px;
        gap: 14px;
      }
      .grad-card {
        order: 4 !important;
        padding: 14px;
        gap: 14px;
      }
      .selection-score-row {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
    }

    /* ── Unified Controls Panel ── */
    .contrast-controls-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .contrast-unified-card {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    :host-context([data-theme="light"]) .contrast-unified-card {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .panel-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-divider {
      height: 1px;
      width: 100%;
      background: var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .section-divider {
      background: rgba(0, 0, 0, 0.08);
    }

    .section-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .section-title {
      color: #0F172A;
    }

    /* ── Controls Cards ── */
    .controls-card {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    :host-context([data-theme="light"]) .controls-card {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .card-header-simple {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .card-section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      margin: 0;
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="light"]) .card-section-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .section-subtext {
      color: #64748B;
    }

    .section-subtext {
      font-size: 12px;
      color: var(--text-2, #A1A1AA);
    }

    .format-pills {
      display: flex;
      background: var(--bg-2, #27272A);
      padding: 2px;
      border-radius: 6px;
    }

    :host-context([data-theme="light"]) .format-pills {
      background: #F1F5F9;
    }

    .format-pill {
      padding: 3px 8px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .format-pill.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .format-pill.active {
      background: #FFFFFF;
    }

    @media (max-width: 639px) {
      .section-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .format-pills {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        width: 100%;
        padding: 3px;
      }
      .format-pill {
        text-align: center;
        min-height: 36px;
        padding: 6px 0;
        font-size: 11px;
      }
    }

    /* ── Color Pickers Pair ── */
    .color-inputs-pair {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    @media (max-width: 639px) {
      .color-inputs-pair {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        position: relative;
        width: 100%;
      }
      .color-picker-box {
        padding: 10px 12px;
        gap: 8px;
        border-radius: 10px;
        width: 100%;
      }
      .picker-header {
        min-height: 18px;
      }
      .picker-label {
        font-size: 11px;
      }
      .lum-tag {
        font-size: 11px;
      }
      .picker-row {
        gap: 8px;
        width: 100%;
      }
      .swatch-color-input {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 6px;
      }
      .hex-input-wrapper {
        flex: 1;
        min-width: 0;
        padding: 6px 8px;
        height: 40px;
        box-sizing: border-box;
      }
      .hex-text-input {
        font-size: 14px;
      }
      .picker-link-btn {
        width: 38px;
        height: 38px;
        min-width: 38px;
      }
      .swap-divider {
        display: flex;
        align-items: center;
        justify-content: center;
        align-self: center;
        width: 100%;
        height: 44px;
        margin: 0;
        z-index: 2;
      }
      .center-swap-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
    }

    .color-picker-box {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      border-radius: 10px;
      padding: 10px 12px;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .color-picker-box {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .picker-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 20px;
      white-space: nowrap;
    }

    .picker-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-2, #A1A1AA);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 1;
    }

    .lum-tag {
      font-size: 10.5px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      color: var(--text-muted, #71717A);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .picker-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .swatch-color-input {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      cursor: pointer;
      background: transparent;
      flex-shrink: 0;
    }

    .hex-input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      padding: 4px 8px;
    }

    :host-context([data-theme="light"]) .hex-input-wrapper {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .hex-symbol {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
    }

    .hex-text-input {
      width: 100%;
      background: transparent;
      border: none;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      outline: none;
      text-transform: uppercase;
    }

    :host-context([data-theme="light"]) .hex-text-input {
      color: #0F172A;
    }

    .picker-link-btn {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      flex-shrink: 0;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .picker-link-btn {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
    }

    .picker-link-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .multi-channel-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px;
      padding-top: 4px;
    }

    .channel-unit {
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      padding: 2px 3px;
      min-width: 0;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .channel-unit {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .ch-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-2, #A1A1AA);
      flex-shrink: 0;
      width: 10px;
      text-align: center;
    }

    .ch-input {
      width: 100%;
      min-width: 0;
      background: transparent;
      border: none;
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      text-align: center;
      outline: none;
      padding: 0;
      margin: 0;
      -moz-appearance: textfield;
      appearance: textfield;
    }

    .ch-input::-webkit-outer-spin-button,
    .ch-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    :host-context([data-theme="light"]) .ch-input {
      color: #0F172A;
    }

    .swap-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .center-swap-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #F4F4F5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 140ms ease;
    }

    :host-context([data-theme="light"]) .center-swap-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.1);
      color: #0F172A;
    }

    .center-swap-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      transform: rotate(180deg);
    }

    .quick-swatches-bar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      width: 100%;
    }

    :host-context([data-theme="light"]) .quick-swatches-bar {
      border-top-color: rgba(0, 0, 0, 0.06);
    }

    .quick-swatches-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .quick-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    .swatch-collapse-btn {
      background: transparent;
      border: none;
      color: var(--tool-accent, #2563EB);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }

    .swatches-grid-container {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      width: 100%;
    }

    @media (max-width: 639px) {
      .swatches-grid-container {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        width: 100%;
      }
      .swatch-dual-actions {
        width: 100%;
        justify-content: center;
        box-sizing: border-box;
      }
      .swatch-overflow-btn {
        width: 100%;
        min-height: 28px;
        border-radius: 20px;
      }
    }

    .swatch-dual-actions {
      display: inline-flex;
      align-items: center;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 20px;
      padding: 3px 6px 3px 3px;
      gap: 5px;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .swatch-dual-actions {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .quick-dot-btn {
      width: 20px;
      height: 20px;
      min-width: 20px;
      min-height: 20px;
      border-radius: 50% !important;
      aspect-ratio: 1 !important;
      flex-shrink: 0 !important;
      border: 1px solid rgba(255, 255, 255, 0.25);
      cursor: pointer;
      padding: 0;
      box-sizing: border-box;
      display: inline-block;
    }

    .mini-role-pill {
      font-size: 9px;
      font-weight: 700;
      background: transparent;
      border: none;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
      padding: 0;
    }

    .mini-role-pill:hover {
      color: var(--tool-accent, #2563EB);
    }

    .swatch-overflow-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 10px;
      border-radius: 20px;
      background: var(--bg-2, #27272A);
      border: 1px dashed var(--border, rgba(255, 255, 255, 0.2));
      color: var(--tool-accent, #60A5FA);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .swatch-overflow-btn {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.2);
      color: #2563EB;
    }

    .swatch-overflow-btn:hover {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border-style: solid;
    }

    /* ── Scorecard Hero ── */
    .score-hero-card {
      border-radius: 12px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 150ms ease;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 639px) {
      .score-hero-card {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        padding: 14px;
        gap: 12px;
        box-sizing: border-box;
      }
      .ratio-details {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        width: 100%;
      }
      .huge-ratio-number {
        font-size: 34px;
        line-height: 1.1;
      }
      .human-rating-badge {
        font-size: 11px;
      }
      .grade-badge-box {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        width: 100%;
      }
      .grade-pill {
        width: 100%;
        justify-content: center;
        min-height: 40px;
        font-size: 13px;
        font-weight: 700;
        border-radius: 8px;
      }
      .grade-subtext {
        font-size: 11px;
        text-align: left;
        max-width: 100%;
        line-height: 1.35;
      }
    }

    .hero-pass {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .hero-fail {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(244, 63, 94, 0.08) 100%);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .ratio-details {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ratio-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-2, #A1A1AA);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .ratio-value-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .huge-ratio-number {
      font-size: 38px;
      font-weight: 850;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text, #F4F4F5);
      line-height: 1;
      letter-spacing: -0.02em;
    }

    :host-context([data-theme="light"]) .huge-ratio-number {
      color: #0F172A;
    }

    .copy-ratio-ghost {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
    }

    .copy-ratio-ghost:hover {
      color: var(--tool-accent, #2563EB);
    }

    .human-rating-badge {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
    }

    .grade-badge-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .grade-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
    }

    .grade-aaa {
      background: #059669;
      color: #FFFFFF;
    }

    .grade-aa {
      background: #0284C7;
      color: #FFFFFF;
    }

    .grade-fail {
      background: #DC2626;
      color: #FFFFFF;
    }

    .grade-subtext {
      font-size: 11px;
      color: var(--text-2, #A1A1AA);
      text-align: right;
    }

    /* ── Conformance Matrix List ── */
    .criterion-filter-pills {
      display: flex;
      gap: 3px;
      background: var(--bg-2, #27272A);
      padding: 2px;
      border-radius: 6px;
    }

    @media (max-width: 639px) {
      .section-header-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      .criterion-filter-pills {
        width: 100%;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        mask-image: none !important;
        -webkit-mask-image: none !important;
        padding: 2px;
        gap: 4px;
        box-sizing: border-box;
      }
      .criterion-filter-pills::-webkit-scrollbar {
        display: none;
      }
      .filter-tab {
        flex-shrink: 0;
        min-height: 36px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
      }
      .criterion-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pass-badge, .status-badge {
        flex-shrink: 0;
        margin-left: auto;
      }
    }

    :host-context([data-theme="light"]) .criterion-filter-pills {
      background: #F1F5F9;
    }

    .filter-tab {
      padding: 3px 6px;
      border-radius: 4px;
      border: none;
      background: transparent;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-2, #A1A1AA);
      cursor: pointer;
    }

    .filter-tab.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .filter-tab.active {
      background: #FFFFFF;
    }

    .criteria-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .criterion-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      border-radius: 8px;
      padding: 8px 12px;
    }

    :host-context([data-theme="light"]) .criterion-item-row {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .crit-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .crit-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .crit-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .crit-name {
      color: #0F172A;
    }

    .crit-req-badge {
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-2, #A1A1AA);
    }

    :host-context([data-theme="light"]) .crit-req-badge {
      background: #E2E8F0;
      color: #475569;
    }

    .crit-desc {
      font-size: 11px;
      color: var(--text-muted, #71717A);
      line-height: 1.35;
    }

    .crit-status-cell {
      flex-shrink: 0;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .badge-pass {
      background: rgba(16, 185, 129, 0.15);
      color: #10B981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-fail {
      background: rgba(239, 68, 68, 0.15);
      color: #EF4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    /* ── Suggestions Section ── */
    .suggestion-target-pills {
      display: flex;
      gap: 4px;
    }

    .target-pill {
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      background: var(--bg-2, #27272A);
      color: var(--text-2, #A1A1AA);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    :host-context([data-theme="light"]) .target-pill {
      background: #F1F5F9;
      border-color: rgba(0, 0, 0, 0.08);
    }

    .target-pill.active {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }

    .suggestions-satisfied-box {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #10B981;
    }

    .sat-title {
      font-size: 12px;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .sat-text {
      font-size: 11px;
      margin: 0;
      color: var(--text-2, #A1A1AA);
    }

    .suggestions-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .suggestion-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
      box-sizing: border-box;
    }

    .suggestion-card:hover {
      transform: translateY(-1.5px);
      border-color: #2563EB;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }

    .suggestion-card:active {
      transform: scale(0.99);
    }

    :host-context([data-theme="light"]) .suggestion-card {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
    }

    .sugg-preview-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .sugg-swatch {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    .sugg-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
      min-width: 0;
    }

    .sugg-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.3;
    }

    :host-context([data-theme="light"]) .sugg-name {
      color: #0F172A;
    }

    .sugg-tags {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .sugg-hex {
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-2, #A1A1AA);
    }

    .sugg-ratio-badge {
      font-size: 10px;
      font-weight: 700;
      color: #10B981;
    }

    .sugg-grade-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-2, #A1A1AA);
    }

    .apply-sugg-btn {
      width: 120px;
      min-width: 120px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 12px;
      border-radius: 6px;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF !important;
      border: 1px solid var(--tool-accent, #2563EB);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      white-space: nowrap;
      transition: all 140ms ease;
    }

    .apply-sugg-btn:hover {
      background: var(--tool-primary-hover, #1D4ED8) !important;
      border-color: var(--tool-primary-hover, #1D4ED8) !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
      transform: translateY(-1px);
    }

    .apply-sugg-btn:active {
      transform: translateY(0);
      background: #1E40AF !important;
    }

    :host-context([data-theme="light"]) .apply-sugg-btn {
      background: #2563EB;
      border-color: #2563EB;
      color: #FFFFFF !important;
    }

    :host-context([data-theme="light"]) .apply-sugg-btn:hover {
      background: #1D4ED8 !important;
      border-color: #1D4ED8 !important;
      color: #FFFFFF !important;
      box-shadow: 0 2px 8px rgba(29, 78, 216, 0.3);
    }

    @media (max-width: 639px) {
      .suggestion-target-pills {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
      }
      .target-pill {
        min-height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .suggestion-card {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px;
      }
      .apply-sugg-btn {
        width: 100%;
        min-width: 100%;
        min-height: 44px;
        justify-content: center;
        font-size: 12px;
      }
    }

    /* ── Gradient Warning Section ── */
    .grad-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--tool-accent, #2563EB);
    }

    .action-btn-mini {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text-2, #A1A1AA);
      font-size: 10px;
      cursor: pointer;
    }

    .gradient-warning-banner {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #F59E0B;
    }

    .gradient-pass-banner {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10B981;
    }

    .warning-title, .pass-title {
      font-size: 12px;
      font-weight: 700;
      display: block;
      margin-bottom: 2px;
    }

    .warning-text, .pass-text {
      font-size: 11px;
      margin: 0;
      line-height: 1.4;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .warning-text,
    :host-context([data-theme="light"]) .pass-text {
      color: #0F172A;
    }

    .grad-stops-table {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-top: 4px;
      width: 100%;
    }

    .grad-stop-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 6px;
      background: var(--bg-2, #27272A);
      width: 100%;
      box-sizing: border-box;
      flex-wrap: wrap;
    }

    :host-context([data-theme="light"]) .grad-stop-row {
      background: #F8FAFC;
    }

    .stop-left-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .stop-right-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .stop-color-dot {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stop-pos {
      color: var(--text-2, #A1A1AA);
      font-size: 10px;
    }

    .stop-hex {
      font-family: var(--ts-font-mono, monospace);
      font-size: 10px;
    }

    .stop-ratio {
      font-weight: 700;
    }

    .stop-status {
      font-size: 10px;
      font-weight: 700;
      text-align: right;
    }

    .stop-status.pass { color: #10B981; }
    .stop-status.fail { color: #EF4444; }

    /* ── Right Column: Preview & Export ── */
    .contrast-preview-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .preview-card-wrapper {
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    :host-context([data-theme="light"]) .preview-card-wrapper {
      background: #FFFFFF;
      border-color: var(--border, rgba(0, 0, 0, 0.08));
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .preview-card-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
    }

    .preview-top-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .preview-top-title {
      color: #0F172A;
    }

    .context-toggles {
      display: flex;
      gap: 2px;
      background: var(--bg-2, #27272A);
      padding: 2px;
      border-radius: 6px;
    }

    :host-context([data-theme="light"]) .context-toggles {
      background: #F1F5F9;
    }

    .ctx-btn {
      padding: 3px 8px;
      border-radius: 4px;
      border: none;
      background: transparent;
      color: var(--text-2, #A1A1AA);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .ctx-btn.active {
      background: var(--bg-1, #18181B);
      color: var(--tool-accent, #2563EB);
    }

    :host-context([data-theme="light"]) .ctx-btn.active {
      background: #FFFFFF;
    }

    .preview-frame-container {
      padding: 24px;
      transition: background 150ms ease;
    }

    @media (max-width: 639px) {
      .preview-card-top-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 10px 14px;
      }
      .context-toggles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100%;
      }
      .ctx-btn {
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .preview-frame-container {
        padding: 12px;
      }
      .live-accessible-canvas {
        padding: 14px;
        gap: 12px;
        width: 100%;
        box-sizing: border-box;
      }
      .canvas-large-heading {
        font-size: 20px;
        line-height: 1.3;
      }
      .canvas-body-paragraph {
        font-size: 14px;
        line-height: 1.5;
      }
      .canvas-interactive-row {
        flex-direction: column;
        width: 100%;
        gap: 8px;
      }
      .canvas-primary-btn,
      .canvas-outline-btn {
        width: 100%;
        min-height: 40px;
        text-align: center;
      }
      .canvas-input-mock {
        max-width: 100%;
      }
    }

    .frame-dark {
      background: #09090B;
    }

    .frame-light {
      background: #F1F5F9;
    }

    .live-accessible-canvas {
      border-radius: 12px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(0, 0, 0, 0.1);
      transition: background-color 140ms ease, color 140ms ease;
    }

    .canvas-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .canvas-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid currentColor;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.85;
    }

    .canvas-ratio-pill {
      font-family: var(--ts-font-mono, monospace);
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid currentColor;
      opacity: 0.9;
    }

    .canvas-large-heading {
      font-size: 24px;
      font-weight: 800;
      line-height: 1.25;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .canvas-subheading {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      opacity: 0.9;
    }

    .canvas-body-paragraph {
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      opacity: 0.92;
    }

    .canvas-interactive-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .canvas-primary-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      border: none;
      cursor: pointer;
    }

    .canvas-outline-btn {
      padding: 7px 15px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      background: transparent;
      border: 1.5px solid currentColor;
      cursor: pointer;
    }

    .canvas-form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .canvas-form-label {
      font-size: 11px;
      font-weight: 700;
    }

    .canvas-input-mock {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1.5px solid currentColor;
      background: transparent;
      width: 100%;
      max-width: 280px;
    }

    .mock-input-text {
      font-size: 12px;
      font-family: var(--ts-font-mono, monospace);
      opacity: 0.9;
    }

    .canvas-card-component {
      border: 1.5px solid currentColor;
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .component-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    .comp-desc {
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
      opacity: 0.9;
    }

    .canvas-small-caption {
      font-size: 10px;
      opacity: 0.75;
      margin-top: 6px;
    }

    /* ── Export & Share Dropdown Menu ── */
    .export-dropdown-container {
      position: relative;
    }

    .dropdown-arrow {
      transition: transform 150ms ease;
    }

    .dropdown-arrow.open {
      transform: rotate(180deg);
    }

    .export-dropdown-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99;
      background: transparent;
    }

    .export-dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 240px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .export-dropdown-menu {
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.1);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
    }

    .dropdown-section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-2, #A1A1AA);
      padding: 6px 8px 4px;
    }

    :host-context([data-theme="light"]) .dropdown-section-title {
      color: #64748B;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    :host-context([data-theme="light"]) .dropdown-divider {
      background: rgba(0, 0, 0, 0.08);
    }

    .dropdown-item-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .dropdown-item-btn {
      color: #0F172A;
    }

    .dropdown-item-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--tool-accent, #60A5FA);
    }

    :host-context([data-theme="light"]) .dropdown-item-btn:hover {
      background: #F1F5F9;
      color: var(--tool-accent, #2563EB);
    }

    .dropdown-item-btn.highlight {
      color: var(--tool-accent, #60A5FA);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .dropdown-item-btn.highlight {
      color: var(--tool-accent, #2563EB);
    }

    .dropdown-item-btn.highlight:hover {
      background: rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="light"]) .dropdown-item-btn.highlight:hover {
      background: #EFF6FF;
    }

    /* ── Cross Module Dispatch ── */
    .cross-module-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dispatch-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--bg-2, #27272A);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      color: var(--text, #F4F4F5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }

    :host-context([data-theme="light"]) .dispatch-btn {
      background: #F8FAFC;
      border-color: rgba(0, 0, 0, 0.06);
      color: #0F172A;
    }

    .dispatch-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
    }
  `]
})
export class ContrastModuleComponent {
  public state = inject(ColorStudioStateService);
  private engine = inject(ColorEngineService);
  public contrastService = inject(ContrastService);
  public exportService = inject(ExportService);

  // ── Local State Signals ───────────────────────────────────────────────────
  public activeFormat = signal<'hex' | 'rgb' | 'hsl'>('hex');
  public previewContext = signal<'dark' | 'light'>('dark');
  public selectedCriterion = signal<WcagCriterion>('all');
  public suggestionTarget = signal<'AA' | 'AAA'>('AA');
  public gradientAnalysisOpen = signal<boolean>(false);
  public exportDropdownOpen = signal<boolean>(false);
  public showAllSwatches = signal<boolean>(false);

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.closeExportDropdown();
  }

  public toggleExportDropdown(): void {
    this.exportDropdownOpen.update(v => !v);
  }

  public closeExportDropdown(): void {
    this.exportDropdownOpen.set(false);
  }

  public toggleShowAllSwatches(): void {
    this.showAllSwatches.update(v => !v);
  }

  // ── Computed Values ───────────────────────────────────────────────────────
  public result = computed<DetailedContrastResult>(() => {
    return this.contrastService.evaluateWcag(this.state.contrastFg(), this.state.contrastBg());
  });

  public fgWithoutHash = computed(() => this.state.contrastFg().replace(/^#/, ''));
  public bgWithoutHash = computed(() => this.state.contrastBg().replace(/^#/, ''));

  public fgLuminance = computed(() => this.contrastService.calculateLuminance(this.state.contrastFg()).toFixed(3));
  public bgLuminance = computed(() => this.contrastService.calculateLuminance(this.state.contrastBg()).toFixed(3));

  public fgRgb = computed<RgbColor>(() => this.engine.hexToRgb(this.state.contrastFg()));
  public bgRgb = computed<RgbColor>(() => this.engine.hexToRgb(this.state.contrastBg()));

  public fgHsl = computed<HslColor>(() => this.engine.rgbToHsl(this.fgRgb()));
  public bgHsl = computed<HslColor>(() => this.engine.rgbToHsl(this.bgRgb()));

  public activeSuggestions = computed<ContrastSuggestion[]>(() => {
    return this.contrastService.generateSuggestions(
      this.state.contrastFg(),
      this.state.contrastBg(),
      this.suggestionTarget()
    );
  });

  public gradientReport = computed<GradientContrastReport | null>(() => {
    const config = this.state.gradientConfig();
    if (!config || !config.stops || config.stops.length === 0) return null;
    return this.contrastService.evaluateGradientContrast(this.state.contrastFg(), config.stops);
  });

  public allQuickColors = computed<string[]>(() => {
    const saved = this.state.savedColors();
    const shared = this.state.sharedColorPalettes();
    const set = new Set<string>();
    [...saved, ...shared].forEach(c => set.add(c.toUpperCase()));
    return Array.from(set);
  });

  public displayedQuickColors = computed<string[]>(() => {
    const all = this.allQuickColors();
    if (this.showAllSwatches() || all.length <= 8) {
      return all;
    }
    return all.slice(0, 7);
  });

  public hasMoreSwatches = computed<boolean>(() => {
    return !this.showAllSwatches() && this.allQuickColors().length > 8;
  });

  public remainingSwatchesCount = computed<number>(() => {
    return this.allQuickColors().length - 7;
  });

  public quickColors = computed<string[]>(() => this.displayedQuickColors());

  // ── Color Input Handlers ──────────────────────────────────────────────────
  public onFgChange(hex: string): void {
    this.state.setContrastFg(hex);
  }

  public onBgChange(hex: string): void {
    this.state.setContrastBg(hex);
  }

  public onManualFgChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length === 3 || clean.length === 6 || clean.length === 8) {
      this.state.setContrastFg('#' + clean);
    } else {
      input.value = this.fgWithoutHash();
    }
  }

  public onManualBgChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length === 3 || clean.length === 6 || clean.length === 8) {
      this.state.setContrastBg('#' + clean);
    } else {
      input.value = this.bgWithoutHash();
    }
  }

  public onFgRgbChange(channel: 'r' | 'g' | 'b', event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const current = { ...this.fgRgb(), [channel]: Math.max(0, Math.min(255, val)) };
    this.state.setContrastFg(this.engine.rgbToHex(current));
  }

  public onBgRgbChange(channel: 'r' | 'g' | 'b', event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const current = { ...this.bgRgb(), [channel]: Math.max(0, Math.min(255, val)) };
    this.state.setContrastBg(this.engine.rgbToHex(current));
  }

  public onFgHslChange(channel: 'h' | 's' | 'l', event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const max = channel === 'h' ? 360 : 100;
    const current = { ...this.fgHsl(), [channel]: Math.max(0, Math.min(max, val)) };
    this.state.setContrastFg(this.engine.hslToHex(current));
  }

  public onBgHslChange(channel: 'h' | 's' | 'l', event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    const max = channel === 'h' ? 360 : 100;
    const current = { ...this.bgHsl(), [channel]: Math.max(0, Math.min(max, val)) };
    this.state.setContrastBg(this.engine.hslToHex(current));
  }

  public swapColors(): void {
    this.state.swapContrastColors();
  }

  // ── Testing Modes Filtering ───────────────────────────────────────────────
  public shouldShowCriterion(crit: 'normal-aa' | 'large-aa' | 'normal-aaa' | 'large-aaa' | 'ui-component'): boolean {
    const sel = this.selectedCriterion();
    if (sel === 'all') return true;
    if (sel === 'aa') return crit === 'normal-aa' || crit === 'large-aa' || crit === 'ui-component';
    if (sel === 'aaa') return crit === 'normal-aaa' || crit === 'large-aaa';
    if (sel === 'normal') return crit === 'normal-aa' || crit === 'normal-aaa';
    if (sel === 'large') return crit === 'large-aa' || crit === 'large-aaa';
    if (sel === 'ui') return crit === 'ui-component';
    return true;
  }

  public setSuggestionTarget(target: 'AA' | 'AAA'): void {
    this.suggestionTarget.set(target);
  }

  public applySuggestion(item: ContrastSuggestion): void {
    this.state.applyContrastSuggestion(item.hex, item.targetRole);
  }

  public evaluateActiveGradient(): void {
    // Forces re-evaluation of gradientReport
    this.state.showToast('Re-evaluated contrast against studio gradient stops');
  }

  // ── Export Suite ──────────────────────────────────────────────────────────
  public async copyRatio(): Promise<void> {
    const text = this.result().ratioString;
    const ok = await this.exportService.copyToClipboard(text, 'Contrast Ratio');
    if (ok) this.state.showToast(`Copied ${text} to clipboard`);
  }

  public async copyFgHex(): Promise<void> {
    const hex = this.state.contrastFg().toUpperCase();
    const ok = await this.exportService.copyToClipboard(hex, 'Foreground HEX');
    if (ok) this.state.showToast(`Copied ${hex}`);
  }

  public async copyBgHex(): Promise<void> {
    const hex = this.state.contrastBg().toUpperCase();
    const ok = await this.exportService.copyToClipboard(hex, 'Background HEX');
    if (ok) this.state.showToast(`Copied ${hex}`);
  }

  public exportJson(): void {
    const json = this.exportService.generateContrastJson(this.result());
    this.exportService.downloadFile(json, 'contrast-report.json', 'application/json');
    this.state.showToast('Downloaded contrast-report.json');
  }

  public exportCss(): void {
    const r = this.result();
    const css = this.exportService.generateContrastCss(r.fgHex, r.bgHex, r.ratio, r.grade);
    this.exportService.downloadFile(css, 'contrast-tokens.css', 'text/css');
    this.state.showToast('Downloaded contrast-tokens.css');
  }

  public exportMarkdownReport(): void {
    const md = this.exportService.generateContrastReport(this.result());
    this.exportService.downloadFile(md, 'contrast-accessibility-report.md', 'text/markdown');
    this.state.showToast('Downloaded contrast-accessibility-report.md');
  }

  public exportReportPdf(): void {
    this.exportService.generatePdfReport(this.result());
  }

  // ── Native Picker Trigger ─────────────────────────────────────────────────
  public triggerNativePicker(picker: HTMLInputElement): void {
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch {
        // Fallback to click if showPicker throws
      }
    }
    picker.click();
  }

  // ── Cross-Module Actions ──────────────────────────────────────────────────
  public sendFgToPicker(): void {
    this.state.sendToPicker(this.state.contrastFg());
  }

  public sendBgToPicker(): void {
    this.state.sendToPicker(this.state.contrastBg());
  }

  public addBothToSharedPalette(): void {
    this.state.addToSharedPalette(this.state.contrastFg());
    this.state.addToSharedPalette(this.state.contrastBg());
  }
}
