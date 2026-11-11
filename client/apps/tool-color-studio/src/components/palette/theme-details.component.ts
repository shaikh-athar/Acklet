// apps/tool-color-studio/src/components/palette/theme-details.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiTheme, SemanticToken, SemanticCategory, ThemeExportFormat } from '../../models/theme.models';
import { ThemeGenerationService } from '../../services/theme-generation.service';
import { ThemeExportService } from '../../services/theme-export.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-theme-details',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="theme-details-wrapper" [style]="activeThemeCssVars()">
      
      <!-- Top Details Navigation Bar -->
      <div class="details-nav-header">
        <div class="left-nav">
          <button 
            type="button" 
            class="back-btn" 
            (click)="back.emit()"
            title="Return to Theme Discovery Gallery"
          >
            <ts-icon name="arrow-right" [size]="14" style="transform: rotate(180deg);" />
            <span>Back to Themes</span>
          </button>
          
          <div class="title-meta">
            <h2 class="theme-heading">{{ activeTheme().name }}</h2>
            <div class="meta-tags">
              <span class="meta-tag category">{{ activeTheme().category }}</span>
              <span class="meta-tag mode" [class.dark]="activeTheme().mode === 'dark'">
                {{ activeTheme().mode === 'dark' ? 'Dark Theme' : 'Light Theme' }}
              </span>
              <span class="meta-tag app">{{ activeTheme().appType }}</span>
            </div>
          </div>
        </div>

        <div class="right-nav-actions">
          <button 
            type="button" 
            class="action-btn"
            (click)="openVariationsDialog()"
            title="Generate subtle variations in hue, saturation and contrast"
          >
            <ts-icon name="sparkles" [size]="14" />
            <span>Generate Variations</span>
          </button>

          <button 
            type="button" 
            class="action-btn"
            (click)="duplicateTheme()"
            title="Duplicate this theme"
          >
            <ts-icon name="copy" [size]="14" />
            <span>Duplicate</span>
          </button>

          <button 
            type="button" 
            class="action-btn"
            (click)="exportModalOpen.set(true)"
            title="Export CSS, JSON, Tailwind, SCSS, Tokens"
          >
            <ts-icon name="download" [size]="14" />
            <span>Export</span>
          </button>

          <button 
            type="button" 
            class="action-btn primary"
            (click)="applyTheme()"
            title="Apply theme to Acklet Color Studio workspace"
          >
            <ts-icon name="check" [size]="14" *ngIf="appliedRecently()" />
            <ts-icon name="zap" [size]="14" *ngIf="!appliedRecently()" />
            <span>{{ appliedRecently() ? 'Theme Applied' : 'Apply Theme' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Layout: 2 Columns (Color System Tokens vs Live Application Preview) -->
      <div class="details-workspace-grid">
        
        <!-- Column 1: Semantic Color System -->
        <div class="tokens-column">
          <div class="column-header">
            <div>
              <h3 class="column-title">Semantic Design Tokens</h3>
              <p class="column-subtitle">23 application tokens mathematically balanced for WCAG AA compliance.</p>
            </div>
            
            <button 
              type="button" 
              class="copy-all-btn"
              (click)="copyAllCssVars()"
              title="Copy all tokens as CSS custom properties"
            >
              <ts-icon name="copy" [size]="12" />
              <span>Copy CSS</span>
            </button>
          </div>

          <!-- Grouped Token Sections -->
          <div class="token-groups-container">
            <div *ngFor="let group of tokenGroups()" class="token-group">
              <div class="group-title-row">
                <span class="group-label">{{ group.title }}</span>
                <span class="group-count">{{ group.tokens.length }} tokens</span>
              </div>

              <div class="tokens-list">
                <div 
                  *ngFor="let token of group.tokens" 
                  class="token-row"
                  [class.editing]="editingTokenKey() === token.key"
                >
                  <!-- Color Swatch -->
                  <div class="swatch-wrap">
                    <div 
                      class="token-swatch"
                      [style.background-color]="token.hex"
                      [title]="'Edit ' + token.name"
                      (click)="toggleEditToken(token)"
                    ></div>
                  </div>

                  <!-- Token Names & Key -->
                  <div class="token-identifiers">
                    <div class="name-line">
                      <span class="token-name">{{ token.name }}</span>
                      <span 
                        class="wcag-badge"
                        [class.aaa]="token.wcagGrade === 'AAA'"
                        [class.aa]="token.wcagGrade === 'AA'"
                        [class.fail]="token.wcagGrade === 'Fail'"
                        [title]="token.contrastWithBg + ':1 ratio against background'"
                      >
                        {{ token.contrastWithBg }}:1 {{ token.wcagGrade }}
                      </span>
                    </div>
                    <code class="token-key">{{ token.key }}</code>
                  </div>

                  <!-- Hex & RGB Info -->
                  <div class="token-values">
                    <span class="hex-text">{{ token.hex }}</span>
                    <span class="rgb-text">{{ token.rgb }}</span>
                  </div>

                  <!-- Token Row Actions -->
                  <div class="token-actions">
                    <button 
                      type="button" 
                      class="token-icon-btn"
                      [class.locked]="token.locked"
                      (click)="toggleLock(token)"
                      [title]="token.locked ? 'Unlock color' : 'Lock color to preserve during regeneration'"
                    >
                      <ts-icon [name]="token.locked ? 'bookmark' : 'bookmark'" [size]="12" />
                    </button>

                    <button 
                      type="button" 
                      class="token-icon-btn"
                      (click)="copyHex(token.hex)"
                      title="Copy HEX code"
                    >
                      <ts-icon name="copy" [size]="12" />
                    </button>

                    <button 
                      type="button" 
                      class="token-icon-btn"
                      (click)="toggleEditToken(token)"
                      title="Customize color"
                    >
                      <ts-icon name="palette" [size]="12" />
                    </button>
                  </div>

                  <!-- Inline Color Editor Panel (if selected) -->
                  <div *ngIf="editingTokenKey() === token.key" class="inline-editor-panel">
                    <div class="editor-row">
                      <input 
                        type="color" 
                        class="native-color-picker"
                        [value]="token.hex"
                        (input)="onTokenColorInput(token.key, $event)"
                      />
                      <input 
                        type="text" 
                        class="hex-input"
                        [value]="token.hex"
                        (change)="onTokenHexChange(token.key, $event)"
                        maxlength="7"
                      />
                      <button 
                        type="button" 
                        class="reset-btn"
                        (click)="resetTokenColor(token.key)"
                        title="Reset to generated default"
                      >
                        <ts-icon name="rotate-ccw" [size]="12" />
                        <span>Reset</span>
                      </button>
                      <button 
                        type="button" 
                        class="close-edit-btn"
                        (click)="editingTokenKey.set(null)"
                      >
                        <ts-icon name="x" [size]="12" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Realistic Interactive Application Preview -->
        <div class="preview-column">
          
          <!-- Preview Control Toolbar -->
          <div class="preview-toolbar">
            <div class="preview-title-box">
              <h3 class="preview-title">Live Application Preview</h3>
              <span class="preview-desc">Realistic SaaS dashboard responding to theme token changes.</span>
            </div>

            <div class="preview-toggles">
              <!-- Mode Toggle -->
              <div class="toggle-pill-group">
                <button 
                  type="button" 
                  class="pill-btn"
                  [class.active]="previewMode() === 'light'"
                  (click)="setPreviewMode('light')"
                >
                  Light
                </button>
                <button 
                  type="button" 
                  class="pill-btn"
                  [class.active]="previewMode() === 'dark'"
                  (click)="setPreviewMode('dark')"
                >
                  Dark
                </button>
              </div>

              <!-- Device Viewport Toggle -->
              <div class="toggle-pill-group">
                <button 
                  type="button" 
                  class="pill-btn"
                  [class.active]="previewDevice() === 'desktop'"
                  (click)="previewDevice.set('desktop')"
                >
                  Desktop
                </button>
                <button 
                  type="button" 
                  class="pill-btn"
                  [class.active]="previewDevice() === 'mobile'"
                  (click)="previewDevice.set('mobile')"
                >
                  Mobile
                </button>
              </div>
            </div>
          </div>

          <!-- Application Preview Viewport Frame -->
          <div 
            class="app-preview-viewport" 
            [class.mobile-frame]="previewDevice() === 'mobile'"
            [style]="activeThemeCssVars()"
          >
            
            <div class="app-chrome">
              
              <!-- App Main Layout (Full-Height Sidebar + Main Pane) -->
              <div class="app-layout-body">
                
                <!-- Desktop Sidebar Navigation -->
                <aside class="app-sidebar" *ngIf="previewDevice() === 'desktop'">
                  <div class="sidebar-top-section">
                    <div class="app-brand-area">
                      <div class="app-brand-icon"></div>
                      <span class="app-brand-name">Acme Studio</span>
                      <span class="app-env-badge">v2.4</span>
                    </div>

                    <div class="app-nav-list">
                      <div class="app-nav-item active">
                        <ts-icon name="layers" [size]="14" />
                        <span>Overview</span>
                      </div>
                      <div class="app-nav-item">
                        <ts-icon name="bar-chart-2" [size]="14" />
                        <span>Analytics</span>
                      </div>
                      <div class="app-nav-item">
                        <ts-icon name="shield-check" [size]="14" />
                        <span>Security</span>
                      </div>
                      <div class="app-nav-item">
                        <ts-icon name="sliders" [size]="14" />
                        <span>Settings</span>
                      </div>
                    </div>
                  </div>

                  <div class="sidebar-footer-card">
                    <div class="footer-card-title">Enterprise Plan</div>
                    <div class="footer-card-bar">
                      <div class="footer-bar-fill" style="width: 78%"></div>
                    </div>
                    <span class="footer-card-text">78% of monthly quota</span>
                  </div>
                </aside>

                <!-- Main Content Pane -->
                <div class="app-main-pane">
                  <!-- App Top Navbar -->
                  <header class="app-topbar">
                    <div class="app-brand-area mobile-only" *ngIf="previewDevice() === 'mobile'">
                      <div class="app-brand-icon"></div>
                      <span class="app-brand-name">Acme</span>
                    </div>

                    <div class="app-topbar-center" *ngIf="previewDevice() === 'desktop'">
                      <div class="app-search-input">
                        <ts-icon name="search" [size]="12" />
                        <span>Search metrics, APIs, logs...</span>
                        <kbd>⌘K</kbd>
                      </div>
                    </div>

                    <div class="app-topbar-right">
                      <div class="app-icon-badge">
                        <ts-icon name="bell" [size]="13" />
                      </div>
                      <div class="app-avatar-badge">AD</div>
                    </div>
                  </header>

                  <!-- Main Application Dashboard Content -->
                  <main class="app-main-content">
                    
                    <!-- Page Header Action Row -->
                    <div class="dashboard-head-row">
                      <div>
                        <h4 class="page-title">Executive Overview</h4>
                        <p class="page-subtitle">Real-time system telemetry and commercial transactions.</p>
                      </div>

                    <div class="header-action-btns">
                      <button type="button" class="app-btn-secondary">
                        <ts-icon name="download" [size]="12" />
                        <span>Export</span>
                      </button>
                      <button type="button" class="app-btn-primary">
                        <ts-icon name="plus" [size]="12" />
                        <span>New Project</span>
                      </button>
                    </div>
                  </div>

                  <!-- Metric Summary Cards -->
                  <div class="metric-cards-grid">
                    <div class="metric-card">
                      <div class="card-meta">
                        <span class="card-label">Monthly Revenue</span>
                        <span class="status-pill success">+14.2%</span>
                      </div>
                      <div class="card-value">$48,290.00</div>
                      <div class="card-sparkline">
                        <span class="bar" style="height: 35%"></span>
                        <span class="bar" style="height: 50%"></span>
                        <span class="bar" style="height: 45%"></span>
                        <span class="bar" style="height: 70%"></span>
                        <span class="bar primary" style="height: 100%"></span>
                      </div>
                    </div>

                    <div class="metric-card">
                      <div class="card-meta">
                        <span class="card-label">Active Users</span>
                        <span class="status-pill info">+8.4%</span>
                      </div>
                      <div class="card-value">3,842</div>
                      <div class="card-sparkline">
                        <span class="bar" style="height: 55%"></span>
                        <span class="bar" style="height: 65%"></span>
                        <span class="bar primary" style="height: 85%"></span>
                        <span class="bar" style="height: 90%"></span>
                        <span class="bar primary" style="height: 100%"></span>
                      </div>
                    </div>

                    <div class="metric-card" *ngIf="previewDevice() === 'desktop'">
                      <div class="card-meta">
                        <span class="card-label">Uptime Status</span>
                        <span class="status-pill success">Operational</span>
                      </div>
                      <div class="card-value">99.98%</div>
                      <div class="card-sparkline">
                        <span class="bar" style="height: 95%"></span>
                        <span class="bar" style="height: 98%"></span>
                        <span class="bar" style="height: 99%"></span>
                        <span class="bar" style="height: 97%"></span>
                        <span class="bar primary" style="height: 100%"></span>
                      </div>
                    </div>
                  </div>

                  <!-- Recent Transactions Data Table -->
                  <div class="data-table-container">
                    <div class="table-header-title">Recent Cloud Deployments</div>
                    <table class="preview-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Status</th>
                          <th *ngIf="previewDevice() === 'desktop'">Region</th>
                          <th>Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div class="service-cell">
                              <span class="service-dot success"></span>
                              <strong>Auth Gateway</strong>
                            </div>
                          </td>
                          <td><span class="badge success">Active</span></td>
                          <td *ngIf="previewDevice() === 'desktop'">us-east-1</td>
                          <td>24ms</td>
                        </tr>
                        <tr>
                          <td>
                            <div class="service-cell">
                              <span class="service-dot warning"></span>
                              <strong>Queue Worker</strong>
                            </div>
                          </td>
                          <td><span class="badge warning">Syncing</span></td>
                          <td *ngIf="previewDevice() === 'desktop'">eu-central-1</td>
                          <td>48ms</td>
                        </tr>
                        <tr>
                          <td>
                            <div class="service-cell">
                              <span class="service-dot info"></span>
                              <strong>Image Pipeline</strong>
                            </div>
                          </td>
                          <td><span class="badge info">Deployed</span></td>
                          <td *ngIf="previewDevice() === 'desktop'">ap-south-1</td>
                          <td>31ms</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </main>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      <!-- Variations Dialog / Modal -->
      <div *ngIf="variationsModalOpen()" class="modal-backdrop" (click)="variationsModalOpen.set(false)">
        <div class="variations-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Theme Variations</h3>
              <p class="modal-subtitle">Subtle hue shifts, harmonic saturation, and contrast profiles based on {{ activeTheme().name }}.</p>
            </div>
            <button type="button" class="close-modal-btn" (click)="variationsModalOpen.set(false)">
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <div class="variations-grid">
            <div 
              *ngFor="let variation of variationsList()" 
              class="variation-card"
              (click)="selectVariation(variation)"
            >
              <div class="var-card-header">
                <span class="var-name">{{ variation.name }}</span>
                <span class="var-badge">{{ variation.mode }}</span>
              </div>

              <!-- Miniature swatches -->
              <div class="var-swatches">
                <span 
                  *ngFor="let t of getPreviewSwatches(variation)" 
                  class="var-dot"
                  [style.background-color]="t.hex"
                ></span>
              </div>

              <!-- Micro UI Card -->
              <div class="var-micro-box" [style]="getThemeCssVars(variation)">
                <div class="v-bar"></div>
                <div class="v-btn">Preview</div>
              </div>

              <button type="button" class="choose-var-btn">
                <span>Select Variation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Modal -->
      <div *ngIf="exportModalOpen()" class="modal-backdrop" (click)="exportModalOpen.set(false)">
        <div class="export-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h3 class="modal-title">Export Theme Tokens</h3>
              <p class="modal-subtitle">Export {{ activeTheme().name }} to production formats.</p>
            </div>
            <button type="button" class="close-modal-btn" (click)="exportModalOpen.set(false)">
              <ts-icon name="x" [size]="16" />
            </button>
          </div>

          <!-- Format Tabs -->
          <div class="format-tabs">
            <button 
              type="button" 
              class="format-tab" 
              [class.active]="selectedExportFormat() === 'css'"
              (click)="selectedExportFormat.set('css')"
            >
              CSS Variables
            </button>
            <button 
              type="button" 
              class="format-tab" 
              [class.active]="selectedExportFormat() === 'tailwind'"
              (click)="selectedExportFormat.set('tailwind')"
            >
              Tailwind
            </button>
            <button 
              type="button" 
              class="format-tab" 
              [class.active]="selectedExportFormat() === 'json'"
              (click)="selectedExportFormat.set('json')"
            >
              JSON
            </button>
            <button 
              type="button" 
              class="format-tab" 
              [class.active]="selectedExportFormat() === 'scss'"
              (click)="selectedExportFormat.set('scss')"
            >
              SCSS
            </button>
            <button 
              type="button" 
              class="format-tab" 
              [class.active]="selectedExportFormat() === 'design-tokens'"
              (click)="selectedExportFormat.set('design-tokens')"
            >
              Design Tokens (W3C)
            </button>
          </div>

          <!-- Code Preview Area -->
          <div class="code-preview-area">
            <pre><code>{{ exportCode() }}</code></pre>
          </div>

          <!-- Modal Footer Actions -->
          <div class="export-footer">
            <button type="button" class="action-btn" (click)="copyExportCode()">
              <ts-icon name="copy" [size]="13" />
              <span>Copy to Clipboard</span>
            </button>

            <button type="button" class="action-btn primary" (click)="downloadExportFile()">
              <ts-icon name="download" [size]="13" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .theme-details-wrapper {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 0 4px;
    }

    /* Top Details Navigation Bar */
    .details-nav-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
    }

    :host-context([data-theme="dark"]) .details-nav-header,
    :host-context(.dark) .details-nav-header {
      border-bottom-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .left-nav {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #0f172a);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .back-btn,
    :host-context(.dark) .back-btn {
      background: var(--bg-surface, #1e293b);
      color: var(--text-primary, #f8fafc);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .back-btn:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.05));
    }

    .title-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .theme-heading {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .theme-heading,
    :host-context(.dark) .theme-heading {
      color: var(--text-primary, #f8fafc);
    }

    .meta-tags {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-tag {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-secondary, #475569);
    }

    .meta-tag.mode.dark {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
    }

    .right-nav-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
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
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .action-btn,
    :host-context(.dark) .action-btn {
      background: var(--bg-surface, #1e293b);
      color: var(--text-primary, #f8fafc);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.1));
    }

    .action-btn:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.05));
    }

    .action-btn.primary {
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
      border-color: transparent;
      font-weight: 600;
    }

    .action-btn.primary:hover {
      filter: brightness(1.08);
    }

    /* 2 Columns Grid */
    .details-workspace-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 1024px) {
      .details-workspace-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Column 1: Tokens List */
    .tokens-column {
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    :host-context([data-theme="dark"]) .tokens-column,
    :host-context(.dark) .tokens-column {
      background: var(--bg-surface, #131722);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .column-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.6));
    }

    :host-context([data-theme="dark"]) .column-header,
    :host-context(.dark) .column-header {
      border-bottom-color: var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .column-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .column-title,
    :host-context(.dark) .column-title {
      color: var(--text-primary, #f8fafc);
    }

    .column-subtitle {
      font-size: 12px;
      color: var(--text-muted, #64748b);
      margin: 2px 0 0;
    }

    .copy-all-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: transparent;
      color: var(--text-secondary, #475569);
      cursor: pointer;
    }

    .token-groups-container {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .token-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .group-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, #94a3b8);
      padding: 0 4px;
    }

    .tokens-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .token-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.6));
      background: var(--bg-surface-secondary, rgba(248, 250, 252, 0.6));
      position: relative;
      flex-wrap: wrap;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .token-row,
    :host-context(.dark) .token-row {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.05);
    }

    .token-row:hover {
      border-color: var(--border-strong, #cbd5e1);
      background: var(--bg-surface-secondary, rgba(241, 245, 249, 0.8));
    }

    :host-context([data-theme="dark"]) .token-row:hover,
    :host-context(.dark) .token-row:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .token-row.editing {
      border-color: var(--accent-primary, #2563eb);
      background: rgba(37, 99, 235, 0.04);
    }

    .token-swatch {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
    }

    .token-identifiers {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 120px;
      flex: 1;
    }

    .name-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .token-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    :host-context([data-theme="dark"]) .token-name,
    :host-context(.dark) .token-name {
      color: var(--text-primary, #f8fafc);
    }

    .token-key {
      font-size: 11px;
      font-family: monospace;
      color: var(--text-muted, #64748b);
    }

    .wcag-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(148, 163, 184, 0.15);
      color: var(--text-secondary, #475569);
    }

    .wcag-badge.aaa {
      background: rgba(22, 163, 74, 0.15);
      color: #16a34a;
    }

    .wcag-badge.aa {
      background: rgba(37, 99, 235, 0.15);
      color: #2563eb;
    }

    .wcag-badge.fail {
      background: rgba(220, 38, 38, 0.12);
      color: #dc2626;
    }

    .token-values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      font-family: monospace;
    }

    .hex-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    :host-context([data-theme="dark"]) .hex-text,
    :host-context(.dark) .hex-text {
      color: var(--text-primary, #f8fafc);
    }

    .rgb-text {
      font-size: 10px;
      color: var(--text-muted, #94a3b8);
    }

    .token-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .token-icon-btn {
      background: transparent;
      border: none;
      padding: 5px;
      border-radius: 5px;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .token-icon-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: var(--text-primary, #0f172a);
    }

    :host-context([data-theme="dark"]) .token-icon-btn:hover,
    :host-context(.dark) .token-icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary, #f8fafc);
    }

    .token-icon-btn.locked {
      color: #f59e0b;
    }

    .inline-editor-panel {
      width: 100%;
      padding-top: 8px;
      border-top: 1px dashed var(--border-subtle, #e2e8f0);
      margin-top: 4px;
    }

    .editor-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .native-color-picker {
      width: 32px;
      height: 28px;
      padding: 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
    }

    .hex-input {
      width: 90px;
      height: 28px;
      padding: 0 8px;
      border-radius: 5px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #0f172a);
      font-size: 12px;
      font-family: monospace;
      text-transform: uppercase;
    }

    .reset-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 5px 8px;
      border-radius: 5px;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: transparent;
      color: var(--text-secondary, #475569);
      cursor: pointer;
    }

    .close-edit-btn {
      margin-left: auto;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted, #94a3b8);
    }

    /* Column 2: Live Preview */
    .preview-column {
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: sticky;
      top: 20px;
    }

    .preview-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, rgba(226, 232, 240, 0.8));
    }

    :host-context([data-theme="dark"]) .preview-toolbar,
    :host-context(.dark) .preview-toolbar {
      background: var(--bg-surface, #131722);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .preview-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .preview-title,
    :host-context(.dark) .preview-title {
      color: var(--text-primary, #f8fafc);
    }

    .preview-desc {
      font-size: 11px;
      color: var(--text-muted, #64748b);
    }

    .preview-toggles {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-pill-group {
      display: flex;
      align-items: center;
      padding: 2px;
      border-radius: 6px;
      background: rgba(148, 163, 184, 0.15);
    }

    .pill-btn {
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      border: none;
      border-radius: 5px;
      background: transparent;
      color: var(--text-secondary, #475569);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill-btn.active {
      background: var(--bg-surface, #ffffff);
      color: var(--text-primary, #0f172a);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      font-weight: 600;
    }

    :host-context([data-theme="dark"]) .pill-btn.active,
    :host-context(.dark) .pill-btn.active {
      background: #1e293b;
      color: #f8fafc;
    }

    /* Live Preview Viewport Frame */
    .app-preview-viewport {
      border-radius: 14px;
      border: 1px solid var(--theme-border, #e2e8f0);
      background: var(--theme-background, #f8fafc);
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
      transition: max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .app-preview-viewport.mobile-frame {
      max-width: 375px;
      margin: 0 auto;
      border-width: 4px;
      border-color: #334155;
      border-radius: 28px;
    }

    .app-chrome {
      display: flex;
      flex-direction: column;
      min-height: 480px;
    }

    .app-main-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      min-height: 0;
    }

    .sidebar-top-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .app-topbar {
      height: 48px;
      background: var(--theme-surface, #ffffff);
      border-bottom: 1px solid var(--theme-border-subtle, #f1f5f9);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      flex-shrink: 0;
    }

    .app-brand-area {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .app-brand-icon {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      background: var(--theme-primary, #2563eb);
    }

    .app-brand-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--theme-text-primary, #0f172a);
    }

    .app-env-badge {
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--theme-background-secondary, #f1f5f9);
      color: var(--theme-text-secondary, #475569);
    }

    .app-search-input {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 220px;
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      border: 1px solid var(--theme-border-subtle, #e2e8f0);
      background: var(--theme-background, #f8fafc);
      color: var(--theme-text-muted, #94a3b8);
      font-size: 11px;
    }

    .app-search-input kbd {
      margin-left: auto;
      font-size: 9px;
      background: var(--theme-surface, #ffffff);
      border: 1px solid var(--theme-border-subtle, #cbd5e1);
      border-radius: 3px;
      padding: 1px 3px;
    }

    .app-topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .app-icon-badge {
      color: var(--theme-text-secondary, #64748b);
      cursor: pointer;
    }

    .app-avatar-badge {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--theme-accent, #ec4899);
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .app-layout-body {
      display: flex;
      flex: 1;
      min-height: 0;
    }

    .app-sidebar {
      width: 175px;
      background: var(--theme-background-secondary, #f1f5f9);
      border-right: 1px solid var(--theme-border-subtle, #e2e8f0);
      padding: 14px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .app-nav-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .app-nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--theme-text-secondary, #475569);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .app-nav-item.active {
      background: var(--theme-surface, #ffffff);
      color: var(--theme-primary, #2563eb);
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .sidebar-footer-card {
      background: var(--theme-surface, #ffffff);
      border: 1px solid var(--theme-border-subtle, #e2e8f0);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .footer-card-title {
      font-size: 10px;
      font-weight: 700;
      color: var(--theme-text-primary, #0f172a);
    }

    .footer-card-bar {
      height: 5px;
      border-radius: 3px;
      background: var(--theme-background-secondary, #e2e8f0);
      overflow: hidden;
    }

    .footer-bar-fill {
      height: 100%;
      background: var(--theme-primary, #2563eb);
    }

    .footer-card-text {
      font-size: 9px;
      color: var(--theme-text-muted, #94a3b8);
    }

    .app-main-content {
      flex: 1;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 0;
    }

    .dashboard-head-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
    }

    .page-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--theme-text-primary, #0f172a);
      margin: 0;
    }

    .page-subtitle {
      font-size: 11px;
      color: var(--theme-text-secondary, #64748b);
      margin: 2px 0 0;
    }

    .header-action-btns {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .app-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--theme-primary, #2563eb);
      color: var(--theme-text-inverse, #ffffff);
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .app-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--theme-surface, #ffffff);
      color: var(--theme-text-primary, #0f172a);
      border: 1px solid var(--theme-border, #cbd5e1);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
    }

    /* Metric Cards Grid */
    .metric-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
    }

    .metric-card {
      background: var(--theme-surface, #ffffff);
      border: 1px solid var(--theme-border, #e2e8f0);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--theme-text-secondary, #64748b);
    }

    .status-pill {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
    }

    .status-pill.success {
      background: rgba(22, 163, 74, 0.15);
      color: var(--theme-success, #16a34a);
    }

    .status-pill.info {
      background: rgba(2, 132, 199, 0.15);
      color: var(--theme-information, #0284c7);
    }

    .card-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--theme-text-primary, #0f172a);
    }

    .card-sparkline {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 24px;
      padding-top: 4px;
    }

    .card-sparkline .bar {
      flex: 1;
      border-radius: 3px 3px 0 0;
      background: var(--theme-background-secondary, rgba(148, 163, 184, 0.22));
      border: 1px solid var(--theme-border-subtle, rgba(0, 0, 0, 0.05));
      min-height: 4px;
    }

    .card-sparkline .bar.primary {
      background: var(--theme-primary, #2563eb);
      border-color: transparent;
    }

    /* Data Table */
    .data-table-container {
      background: var(--theme-surface, #ffffff);
      border: 1px solid var(--theme-border, #e2e8f0);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow-x: auto;
    }

    .table-header-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--theme-text-primary, #0f172a);
    }

    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    .preview-table th {
      text-align: left;
      padding: 6px 8px;
      color: var(--theme-text-muted, #94a3b8);
      font-weight: 600;
      border-bottom: 1px solid var(--theme-border-subtle, #f1f5f9);
    }

    .preview-table td {
      padding: 8px;
      color: var(--theme-text-primary, #0f172a);
      border-bottom: 1px solid var(--theme-border-subtle, #f1f5f9);
    }

    .service-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .service-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .service-dot.success { background: var(--theme-success, #16a34a); }
    .service-dot.warning { background: var(--theme-warning, #d97706); }
    .service-dot.info { background: var(--theme-information, #0284c7); }

    .badge {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .badge.success {
      background: rgba(22, 163, 74, 0.12);
      color: var(--theme-success, #16a34a);
    }

    .badge.warning {
      background: rgba(217, 119, 6, 0.12);
      color: var(--theme-warning, #d97706);
    }

    .badge.info {
      background: rgba(2, 132, 199, 0.12);
      color: var(--theme-information, #0284c7);
    }

    /* Modals */
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

    .variations-modal, .export-modal {
      width: 100%;
      max-width: 680px;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.3);
      max-height: 90vh;
      overflow-y: auto;
    }

    :host-context([data-theme="dark"]) .variations-modal,
    :host-context([data-theme="dark"]) .export-modal,
    :host-context(.dark) .variations-modal,
    :host-context(.dark) .export-modal {
      background: var(--bg-surface, #131722);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
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

    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted, #64748b);
      margin: 3px 0 0;
    }

    .close-modal-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted, #94a3b8);
    }

    .variations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }

    .variation-card {
      border: 1px solid var(--border-subtle, #e2e8f0);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .variation-card,
    :host-context(.dark) .variation-card {
      border-color: rgba(255, 255, 255, 0.08);
    }

    .variation-card:hover {
      border-color: var(--accent-primary, #2563eb);
      transform: translateY(-2px);
    }

    .var-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .var-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    :host-context([data-theme="dark"]) .var-name,
    :host-context(.dark) .var-name {
      color: var(--text-primary, #f8fafc);
    }

    .var-badge {
      font-size: 9px;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(148, 163, 184, 0.2);
    }

    .var-swatches {
      display: flex;
      gap: 4px;
    }

    .var-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
    }

    .var-micro-box {
      height: 50px;
      border-radius: 6px;
      background: var(--theme-background, #f8fafc);
      border: 1px solid var(--theme-border, #e2e8f0);
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .v-bar {
      width: 40px;
      height: 8px;
      border-radius: 4px;
      background: var(--theme-primary, #2563eb);
    }

    .v-btn {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--theme-surface, #ffffff);
      color: var(--theme-text-primary, #0f172a);
      border: 1px solid var(--theme-border, #cbd5e1);
    }

    .choose-var-btn {
      width: 100%;
      padding: 6px;
      border-radius: 6px;
      background: var(--btn-secondary-bg, rgba(241, 245, 249, 0.7));
      border: 1px solid var(--border-subtle, #e2e8f0);
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      cursor: pointer;
    }

    :host-context([data-theme="dark"]) .choose-var-btn,
    :host-context(.dark) .choose-var-btn {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-primary, #f8fafc);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .choose-var-btn:hover {
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
    }

    /* Export Modal Elements */
    .format-tabs {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .format-tab {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--border-subtle, #e2e8f0);
      background: transparent;
      color: var(--text-secondary, #475569);
      cursor: pointer;
      white-space: nowrap;
    }

    :host-context([data-theme="dark"]) .format-tab,
    :host-context(.dark) .format-tab {
      color: var(--text-secondary, #94a3b8);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .format-tab.active {
      background: var(--accent-primary, #2563eb);
      color: #ffffff;
      border-color: transparent;
      font-weight: 600;
    }

    .code-preview-area {
      background: #0f172a;
      border-radius: 8px;
      padding: 14px;
      max-height: 320px;
      overflow: auto;
    }

    .code-preview-area pre {
      margin: 0;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
      color: #e2e8f0;
    }

    .export-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }

    /* ── Responsive Reflow ─────────────────────────────────────────────────── */
    @media (max-width: 1023px) {
      .details-workspace-grid {
        grid-template-columns: 1fr;
      }

      .preview-column {
        position: static;
      }

      .action-btn {
        min-height: 44px;
        padding: 8px 14px;
      }

      .token-icon-btn {
        min-width: 36px;
        min-height: 36px;
      }
    }

    @media (max-width: 639px) {
      .details-header {
        flex-direction: column;
        align-items: stretch;
        padding: 12px 14px;
        gap: 12px;
      }

      .theme-heading {
        font-size: 18px;
      }

      .right-nav-actions {
        overflow-x: auto;
        flex-wrap: nowrap;
        max-width: 100%;
        scroll-snap-type: x mandatory;
        padding-bottom: 4px;
        -webkit-overflow-scrolling: touch;
      }

      .right-nav-actions .action-btn {
        scroll-snap-align: start;
        flex-shrink: 0;
      }

      .tokens-column {
        padding: 14px 12px;
      }

      .token-row {
        gap: 8px;
        padding: 8px;
      }

      .token-identifiers {
        min-width: 100px;
      }

      .preview-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }

      .preview-toggles {
        justify-content: space-between;
        width: 100%;
      }

      .app-sidebar {
        display: none !important;
      }

      .app-topbar-center {
        display: none !important;
      }

      .export-modal-box {
        max-width: 100%;
        padding: 16px;
        margin: 10px;
        border-radius: 12px;
      }

      .export-footer {
        flex-direction: column;
        align-items: stretch;
      }

      .export-footer .action-btn {
        width: 100%;
        justify-content: center;
        min-height: 44px;
      }
    }
  `]
})
export class ThemeDetailsComponent {
  @Input({ required: true }) set theme(val: UiTheme) {
    this.activeTheme.set(val);
    this.previewMode.set(val.mode);
  }

  @Output() back = new EventEmitter<void>();
  @Output() themeChange = new EventEmitter<UiTheme>();
  @Output() apply = new EventEmitter<UiTheme>();
  @Output() duplicate = new EventEmitter<UiTheme>();

  private themeGenService = inject(ThemeGenerationService);
  private themeExportService = inject(ThemeExportService);

  public activeTheme = signal<UiTheme>({} as UiTheme);
  public previewMode = signal<'light' | 'dark'>('light');
  public previewDevice = signal<'desktop' | 'mobile'>('desktop');
  public editingTokenKey = signal<string | null>(null);

  public variationsModalOpen = signal(false);
  public variationsList = signal<UiTheme[]>([]);
  public exportModalOpen = signal(false);
  public selectedExportFormat = signal<ThemeExportFormat>('css');
  public appliedRecently = signal(false);

  // Group tokens for display
  public tokenGroups = computed(() => {
    const tokens = this.activeTheme().tokens || [];
    const groups: Array<{ title: string; category: SemanticCategory; tokens: SemanticToken[] }> = [
      {
        title: 'Core & Brand',
        category: 'brand',
        tokens: tokens.filter(t => t.category === 'brand')
      },
      {
        title: 'Background & Surface',
        category: 'surface',
        tokens: tokens.filter(t => t.category === 'background' || t.category === 'surface')
      },
      {
        title: 'Typography',
        category: 'typography',
        tokens: tokens.filter(t => t.category === 'typography')
      },
      {
        title: 'Borders & Focus',
        category: 'border',
        tokens: tokens.filter(t => t.category === 'border')
      },
      {
        title: 'Status & Semantics',
        category: 'status',
        tokens: tokens.filter(t => t.category === 'status')
      }
    ];
    return groups;
  });

  public activeThemeCssVars = computed(() => {
    const tokens = this.activeTheme().tokens || [];
    return tokens.map(t => `${t.key.replace('--color-', '--theme-')}: ${t.hex};`).join(' ');
  });

  public exportCode = computed(() => {
    const th = this.activeTheme();
    if (!th.name) return '';
    return this.themeExportService.generateCode(th, this.selectedExportFormat());
  });

  public setPreviewMode(mode: 'light' | 'dark'): void {
    this.previewMode.set(mode);
    if (this.activeTheme().mode !== mode) {
      // Regenerate or flip mode tokens
      const updated = this.themeGenService.generateTheme({
        baseColor: this.activeTheme().baseColor,
        style: this.activeTheme().style,
        mood: this.activeTheme().mood,
        appType: this.activeTheme().appType,
        mode,
        name: this.activeTheme().name,
        category: this.activeTheme().category
      });
      this.activeTheme.set(updated);
      this.themeChange.emit(updated);
    }
  }

  public toggleLock(token: SemanticToken): void {
    const updated = {
      ...this.activeTheme(),
      tokens: this.activeTheme().tokens.map(t => {
        if (t.key === token.key) {
          return { ...t, locked: !t.locked };
        }
        return t;
      })
    };
    this.activeTheme.set(updated);
    this.themeChange.emit(updated);
  }

  public toggleEditToken(token: SemanticToken): void {
    if (this.editingTokenKey() === token.key) {
      this.editingTokenKey.set(null);
    } else {
      this.editingTokenKey.set(token.key);
    }
  }

  public onTokenColorInput(tokenKey: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    const updated = this.themeGenService.updateToken(this.activeTheme(), tokenKey, val);
    this.activeTheme.set(updated);
    this.themeChange.emit(updated);
  }

  public onTokenHexChange(tokenKey: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (/^#?[0-9A-Fa-f]{6}$/.test(val)) {
      const updated = this.themeGenService.updateToken(this.activeTheme(), tokenKey, val);
      this.activeTheme.set(updated);
      this.themeChange.emit(updated);
    }
  }

  public resetTokenColor(tokenKey: string): void {
    const fresh = this.themeGenService.generateTheme({
      baseColor: this.activeTheme().baseColor,
      style: this.activeTheme().style,
      mood: this.activeTheme().mood,
      appType: this.activeTheme().appType,
      mode: this.activeTheme().mode,
      name: this.activeTheme().name,
      category: this.activeTheme().category
    });
    const defaultToken = fresh.tokens.find(t => t.key === tokenKey);
    if (defaultToken) {
      const updated = this.themeGenService.updateToken(this.activeTheme(), tokenKey, defaultToken.hex);
      this.activeTheme.set(updated);
      this.themeChange.emit(updated);
    }
  }

  public openVariationsDialog(): void {
    const list = this.themeGenService.generateVariations(this.activeTheme(), 4);
    this.variationsList.set(list);
    this.variationsModalOpen.set(true);
  }

  public selectVariation(v: UiTheme): void {
    this.activeTheme.set(v);
    this.themeChange.emit(v);
    this.variationsModalOpen.set(false);
  }

  public duplicateTheme(): void {
    const dup = {
      ...this.activeTheme(),
      id: 'theme-' + Math.random().toString(36).substring(2, 9),
      name: `${this.activeTheme().name} (Copy)`,
      createdAt: Date.now()
    };
    this.duplicate.emit(dup);
    this.activeTheme.set(dup);
  }

  public applyTheme(): void {
    this.apply.emit(this.activeTheme());
    this.appliedRecently.set(true);
    setTimeout(() => this.appliedRecently.set(false), 2000);
  }

  public copyHex(hex: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(hex);
    }
  }

  public copyAllCssVars(): void {
    const code = this.themeExportService.generateCode(this.activeTheme(), 'css');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
  }

  public copyExportCode(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.exportCode());
    }
  }

  public downloadExportFile(): void {
    this.themeExportService.download(this.activeTheme(), this.selectedExportFormat());
  }

  public getPreviewSwatches(theme: UiTheme): SemanticToken[] {
    const keys = ['--color-primary', '--color-secondary', '--color-accent', '--color-background', '--color-surface'];
    return keys
      .map(k => theme.tokens.find(t => t.key === k))
      .filter((t): t is SemanticToken => !!t);
  }

  public getThemeCssVars(theme: UiTheme): string {
    return theme.tokens.map(t => `${t.key.replace('--color-', '--theme-')}: ${t.hex};`).join(' ');
  }
}

