import { Component, ChangeDetectionStrategy, input, output, signal, computed, ViewChild, ElementRef, inject, HostListener, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonLensResult, JsonStats, DataLensService, GraphNode } from '../services/data-lens.service';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { InspectorEmptyStateComponent } from './inspector-empty-state.component';

@Component({
  selector: 'app-json-lens-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, InspectorEmptyStateComponent],
  template: `
    <div class="panel output-panel">
      <!-- Dedicated Inspector Sub-Navbar Tab Bar with Horizontal Scroll -->
      <div class="panel-header">
        <div class="panel-header-left">
          <app-icon name="eye" class="icon-xs text-brand-400"></app-icon>
          <span class="panel-label">INSPECTOR</span>
        </div>

        <!-- CENTER: View Mode Tab Navigation (Editor, Tree, Table, Graph, Stats, Code Gen) & Context Selectors -->
        <div class="panel-header-center">
          <div class="inspector-views-pill-bar">
            <!-- Formatted Code / Editor View Tab with Custom Format Dropdown Menu -->
            <div class="inspector-view-tab-btn format-dropdown-tab" [class.active]="inspectorTab() === 'formatted'">
              <button class="format-tab-trigger-btn" (click)="tabChange.emit('formatted'); showInspectorFormatMenu.set(!showInspectorFormatMenu())" data-tooltip="Code / Formatted Output View">
                <app-icon name="file-code" class="icon-xs"></app-icon>
                <span class="format-active-badge">{{ activeFormat().toUpperCase() }}</span>
                <app-icon name="chevron-down" class="icon-xs chevron-icon"></app-icon>
              </button>

              @if (showInspectorFormatMenu()) {
                <div class="indent-dropdown-backdrop" (click)="showInspectorFormatMenu.set(false)"></div>
                <div class="indent-dropdown-menu inspector-format-menu" (click)="$event.stopPropagation()">
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'json'" (click)="onFormatChange('json'); showInspectorFormatMenu.set(false)">
                    <span>JSON</span>
                  </button>
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'stringify'" (click)="onFormatChange('stringify'); showInspectorFormatMenu.set(false)">
                    <span>Stringified JSON</span>
                  </button>
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'yaml'" (click)="onFormatChange('yaml'); showInspectorFormatMenu.set(false)">
                    <span>YAML</span>
                  </button>
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'xml'" (click)="onFormatChange('xml'); showInspectorFormatMenu.set(false)">
                    <span>XML</span>
                  </button>
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'toml'" (click)="onFormatChange('toml'); showInspectorFormatMenu.set(false)">
                    <span>TOML</span>
                  </button>
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'curl'" (click)="onFormatChange('curl'); showInspectorFormatMenu.set(false)">
                    <span>cURL</span>
                  </button>
                  <button class="indent-menu-item" [class.active]="activeFormat() === 'csv'" [disabled]="!tableData().isTabular" (click)="onFormatChange('csv'); showInspectorFormatMenu.set(false)">
                    <span>CSV {{ !tableData().isTabular ? '(N/A)' : '' }}</span>
                  </button>
                </div>
              }
            </div>

            <!-- Tree View Tab (Icon Only) -->
            @if (activeFormat() !== 'csv') {
              <button
                class="inspector-view-tab-btn icon-only"
                [class.active]="inspectorTab() === 'tree'"
                (click)="tabChange.emit('tree')"
                data-tooltip="Tree View"
              >
                <app-icon name="folder-tree" class="icon-xs"></app-icon>
              </button>
            }

            <!-- Table View Tab (Icon Only) -->
            <button
              class="inspector-view-tab-btn icon-only"
              [class.active]="inspectorTab() === 'table'"
              (click)="tabChange.emit('table')"
              data-tooltip="Table View"
            >
              <app-icon name="table" class="icon-xs"></app-icon>
            </button>

            <!-- Graph View Tab (Icon Only) -->
            @if (activeFormat() !== 'csv') {
              <button
                class="inspector-view-tab-btn icon-only"
                [class.active]="inspectorTab() === 'graph'"
                (click)="tabChange.emit('graph')"
                data-tooltip="Graph Visualizer View"
              >
                <app-icon name="network" class="icon-xs"></app-icon>
              </button>
            }

            <!-- Stats View Tab (Icon Only) -->
            <button
              class="inspector-view-tab-btn icon-only"
              [class.active]="inspectorTab() === 'stats'"
              (click)="tabChange.emit('stats')"
              data-tooltip="Payload Statistics"
            >
              <app-icon name="bar-chart-2" class="icon-xs"></app-icon>
            </button>

            <!-- Code Gen View Tab (Icon Only) -->
            <button
              class="inspector-view-tab-btn icon-only"
              [class.active]="inspectorTab() === 'codegen'"
              (click)="tabChange.emit('codegen')"
              data-tooltip="Code Generator"
            >
              <app-icon name="terminal" class="icon-xs"></app-icon>
            </button>
          </div>
        </div>

        <!-- RIGHT: tab-specific action buttons & Export Menu -->
        <div class="panel-header-right">
          @if (inspectorTab() === 'tree') {
            <button class="panel-btn icon-only-btn" (click)="toggleAllTreeNodes()" [attr.data-tooltip]="isAllTreeExpanded() ? 'Collapse All Tree Nodes' : 'Expand All Tree Nodes'">
              <app-icon [name]="isAllTreeExpanded() ? 'minimize-2' : 'maximize-2'" class="icon-xs"></app-icon>
            </button>
          }

          <!-- Stringify Action Button (Quotes Icon) — Only relevant for Formatted / Editor view -->
          @if (inspectorTab() === 'formatted') {
            <button class="panel-btn icon-only-btn" [class.active]="activeFormat() === 'stringify'" (click)="toggleInspectorStringify()" data-tooltip="Toggle Stringified JSON View">
              <app-icon name="quote" class="icon-xs"></app-icon>
            </button>
          }

          <!-- Context Export Dropdown -->
          <div class="export-dropdown-wrapper">
            <button class="panel-btn icon-only-btn" (click)="toggleExportMenu($event)" data-tooltip="Export Data / View">
              <app-icon name="download" class="icon-xs"></app-icon>
            </button>

            @if (showExportMenu()) {
              <div class="export-menu-backdrop" (click)="showExportMenu.set(false)"></div>
              <div class="export-menu-popover" (click)="$event.stopPropagation()">
                <div class="export-menu-header">Export {{ inspectorTab().toUpperCase() }}</div>
                
                @if (inspectorTab() === 'table') {
                  <button class="export-menu-item export-hover-csv" (click)="exportAs('csv'); showExportMenu.set(false)">
                    <span class="item-title">CSV (.csv)</span>
                  </button>
                  <button class="export-menu-item export-hover-html" (click)="exportTableHTML(); showExportMenu.set(false)">
                    <span class="item-title">HTML Table (.html)</span>
                  </button>
                  <button class="export-menu-item export-hover-json" (click)="exportAs('json'); showExportMenu.set(false)">
                    <span class="item-title">JSON (.json)</span>
                  </button>
                } @else if (inspectorTab() === 'graph') {
                  <button class="export-menu-item export-hover-svg" (click)="exportGraphSVG(); showExportMenu.set(false)">
                    <span class="item-title">SVG Vector (.svg)</span>
                  </button>
                  <button class="export-menu-item export-hover-json" (click)="exportGraphJSON(); showExportMenu.set(false)">
                    <span class="item-title">JSON AST (.json)</span>
                  </button>
                } @else if (inspectorTab() === 'stats') {
                  <button class="export-menu-item export-hover-md" (click)="exportStatsMarkdown(); showExportMenu.set(false)">
                    <span class="item-title">Markdown Report (.md)</span>
                  </button>
                  <button class="export-menu-item export-hover-json" (click)="exportStatsJSON(); showExportMenu.set(false)">
                    <span class="item-title">JSON Metrics (.json)</span>
                  </button>
                } @else if (inspectorTab() === 'codegen') {
                  <button class="export-menu-item export-hover-lang" (click)="exportCodeGenFile(); showExportMenu.set(false)">
                    <span class="item-title">Source File ({{ getFileExtForActiveLang() }})</span>
                  </button>
                  <button class="export-menu-item export-hover-md" (click)="exportCodeGenMarkdown(); showExportMenu.set(false)">
                    <span class="item-title">Markdown Snippet (.md)</span>
                  </button>
                } @else if (inspectorTab() === 'jsonpath') {
                  <button class="export-menu-item export-hover-json" (click)="exportJsonPathResults(); showExportMenu.set(false)">
                    <span class="item-title">Matches JSON (.json)</span>
                  </button>
                } @else if (inspectorTab() === 'tree') {
                  <button class="export-menu-item export-hover-json" (click)="exportAs('json'); showExportMenu.set(false)">
                    <span class="item-title">JSON (.json)</span>
                  </button>
                  <button class="export-menu-item export-hover-csv" (click)="exportAs('csv'); showExportMenu.set(false)">
                    <span class="item-title">Flattened CSV (.csv)</span>
                  </button>
                  <button class="export-menu-item export-hover-yaml" (click)="exportAs('yaml'); showExportMenu.set(false)">
                    <span class="item-title">YAML (.yaml)</span>
                  </button>
                  <button class="export-menu-item export-hover-xml" (click)="exportAs('xml'); showExportMenu.set(false)">
                    <span class="item-title">XML (.xml)</span>
                  </button>
                  <button class="export-menu-item export-hover-md" (click)="exportAs('md'); showExportMenu.set(false)">
                    <span class="item-title">Markdown Tree (.md)</span>
                  </button>
                } @else {
                  <!-- Formatted / General Views -->
                  <button class="export-menu-item export-hover-json" (click)="exportAs('json'); showExportMenu.set(false)">
                    <span class="item-title">JSON (.json)</span>
                  </button>
                  <button class="export-menu-item export-hover-yaml" (click)="exportAs('yaml'); showExportMenu.set(false)">
                    <span class="item-title">YAML (.yaml)</span>
                  </button>
                  <button class="export-menu-item export-hover-xml" (click)="exportAs('xml'); showExportMenu.set(false)">
                    <span class="item-title">XML (.xml)</span>
                  </button>
                  <button class="export-menu-item export-hover-csv" (click)="exportAs('csv'); showExportMenu.set(false)">
                    <span class="item-title">CSV (.csv)</span>
                  </button>
                  <button class="export-menu-item export-hover-md" (click)="exportAs('md'); showExportMenu.set(false)">
                    <span class="item-title">Markdown (.md)</span>
                  </button>
                }
              </div>
            }
          </div>

          <button class="panel-btn icon-only-btn" (click)="copyClick.emit()" [title]="copied() ? 'Copied!' : 'Copy Output'">
            <app-icon [name]="copied() ? 'check-check' : 'copy'" class="icon-xs"></app-icon>
          </button>
        </div>
      </div>

      <!-- Active Filter Chip Banner -->
      @if (activeFilterCondition() && activeFilterCondition()!.query.trim()) {
        <div class="panel-active-filter-bar">
          <div class="active-filter-chip">
            <app-icon name="filter" class="icon-xs text-brand-400"></app-icon>
            <span class="chip-operator">{{ activeFilterCondition()!.operator | uppercase }}</span>
            <span class="chip-query">"{{ activeFilterCondition()!.query }}"</span>
            <span class="chip-scope">({{ activeFilterCondition()!.scope }})</span>
            <span class="chip-matches">{{ activeFilterMatchesCount() }} matches</span>
            <button class="chip-clear-btn" (click)="resetFilterCondition()" data-tooltip="Clear filter">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          </div>
        </div>
      }

      <!-- Interactive Filter Condition Popover Modal -->
      @if (showFilterPopover()) {
        <div class="filter-popover-backdrop" (click)="closeFilterPopover()"></div>
        <div class="filter-condition-popover" (click)="$event.stopPropagation()">
          <div class="filter-popover-header">
            <div class="filter-popover-title">
              <app-icon name="filter" class="icon-xs text-brand-400"></app-icon>
              <span>Apply Inspector Filter Condition</span>
            </div>
            <button class="filter-popover-close" (click)="closeFilterPopover()">
              <app-icon name="x" class="icon-xs"></app-icon>
            </button>
          </div>

          <div class="filter-popover-body">
            <div class="filter-field-group">
              <label class="filter-label">Filter Value / Pattern</label>
              <input
                type="text"
                class="filter-query-input"
                placeholder="Enter value, text, or regex pattern..."
                [ngModel]="filterCondition().query"
                (ngModelChange)="updateFilterQuery($event)"
                (keydown.enter)="applyFilterCondition()"
              />
            </div>

            <div class="filter-field-group">
              <label class="filter-label">Condition Operator</label>
              <select
                class="filter-select"
                [ngModel]="filterCondition().operator"
                (ngModelChange)="updateFilterOperator($event)"
              >
                <option value="contains">Contains text</option>
                <option value="equals">Exact match (Equals)</option>
                <option value="startsWith">Starts with</option>
                <option value="endsWith">Ends with</option>
                <option value="keyEquals">Key name equals</option>
                <option value="gt">Numeric Value &gt; (Greater than)</option>
                <option value="lt">Numeric Value &lt; (Less than)</option>
                <option value="regex">Regular Expression (Regex)</option>
              </select>
            </div>

            <div class="filter-field-row">
              <div class="filter-field-group flex-1">
                <label class="filter-label">Target Scope</label>
                <select
                  class="filter-select"
                  [ngModel]="filterCondition().scope"
                  (ngModelChange)="updateFilterScope($event)"
                >
                  <option value="all">Keys & Values</option>
                  <option value="keys">Keys Only</option>
                  <option value="values">Values Only</option>
                </select>
              </div>

              <div class="filter-field-group">
                <label class="filter-label">Match Case</label>
                <button
                  class="filter-toggle-btn"
                  [class.active]="filterCondition().matchCase"
                  (click)="toggleMatchCase()"
                  data-tooltip="Toggle case sensitivity"
                >
                  <span class="case-badge">Aa</span>
                  <span>{{ filterCondition().matchCase ? 'On' : 'Off' }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="filter-popover-footer">
            <button class="filter-btn-reset" (click)="resetFilterCondition()">Reset</button>
            <button class="filter-btn-apply" (click)="applyFilterCondition()">Apply Filter</button>
          </div>
        </div>
      }

      <!-- Tab 1: Formatted View with Line Numbers & Code Folding -->
      @if (inspectorTab() === 'formatted') {
        @if (activeFormat() === 'csv' && !tableData().isTabular) {
          <div class="csv-unavailable-banner">
            <app-icon name="shield-alert" class="icon-xs"></app-icon>
            <span><strong>CSV format unavailable:</strong> Exporting to CSV requires a JSON array of uniform objects.</span>
          </div>
        }
        @if (result() && !result()?.success) {
          <div class="non-blocking-error-banner">
            <app-icon name="alert-triangle" class="icon-xs text-amber-400"></app-icon>
            <span>Syntax Error at Line {{ result()?.errorLine || 1 }}, Col {{ result()?.errorColumn || 1 }} — Showing last valid render</span>
          </div>
        }
        @if (formattedOutputText().trim().length > 0 || effectiveDisplayOutput().trim().length > 0 || result()?.formattedJson || result()?.parsedData) {
          <div #scrollContainer class="inspector-view-container code-editor-container" (scroll)="scrollEvent.emit($event)">
            <div class="line-numbers-gutter" #gutterLayer>
              @for (line of formattedLines(); track line.num) {
                <div class="gutter-line-row">
                  <span class="line-num">{{ line.num }}</span>
                  @if (line.isFoldable) {
                    <button class="fold-btn" (click)="toggleFoldLine(line.num); $event.stopPropagation()">
                      <app-icon [name]="line.isFolded ? 'chevron-right' : 'chevron-down'" class="icon-xs"></app-icon>
                    </button>
                  }
                </div>
              }
            </div>
            <div class="editor-input-wrapper" (click)="onCodeClick($event)">
              <pre #highlightLayer class="code-editor-highlight code-output" aria-hidden="true" [innerHTML]="highlightedOutput()"></pre>
              <textarea
                #inspectorTextarea
                class="code-editor-textarea"
                [value]="formattedOutputText()"
                (input)="onInspectorTextInput($any($event.target).value)"
                (keydown)="onInspectorKeyDown($event)"
                (keyup)="onInspectorCursorMove($event)"
                (click)="onInspectorCursorMove($event)"
                (select)="onInspectorCursorMove($event)"
                (scroll)="onInspectorScrollSync($event)"
                (mousemove)="onInspectorMouseMove($event)"
                [placeholder]="'Formatted ' + activeFormat().toUpperCase() + ' output...'"
                spellcheck="false"
              ></textarea>
            </div>
          </div>

          <!-- Integrated Inline JSONPath & Hover Path Toolbar (Sticky at Bottom) -->
          <div class="inspector-jsonpath-embedded-bar">
            <div class="jsonpath-input-inline-wrap">
              <app-icon name="search-code" class="icon-xs jsonpath-inline-icon text-amber-400"></app-icon>
              <input
                type="text"
                class="jsonpath-inline-input"
                [value]="jsonPathExpr()"
                (input)="jsonPathExpr.set($any($event.target).value)"
                placeholder="Query with JSONPath (e.g. $.data.user, $..roles[*], $.preferences)..."
                spellcheck="false"
              />
              @if (jsonPathExpr()) {
                <button class="jsonpath-inline-clear-btn" (click)="jsonPathExpr.set('')" data-tooltip="Clear JSONPath query">
                  <app-icon name="x" class="icon-xs"></app-icon>
                </button>
              }
              @if (jsonPathExpr().trim()) {
                @if (jsonPathResult().error) {
                  <span class="jsonpath-status-badge error" [attr.data-tooltip]="jsonPathResult().error">
                    <app-icon name="alert-circle" class="icon-xs"></app-icon>
                    Invalid
                  </span>
                } @else {
                  <span class="jsonpath-status-badge success">
                    {{ jsonPathResult().results.length }} match{{ jsonPathResult().results.length !== 1 ? 'es' : '' }}
                  </span>
                }
              }
            </div>

            <!-- Live Active Typing Caret JSONPath Location Badge with Copy Button -->
            <div
              class="hovered-path-indicator cursor-pointer"
              (click)="copyNodePath(hoveredJsonPath())"
              [attr.data-tooltip]="'Click to copy path: ' + hoveredJsonPath()"
            >
              <app-icon name="map-pin" class="icon-xs text-brand-400"></app-icon>
              <code class="hovered-path-text">{{ hoveredJsonPath() }}</code>
              <button class="jsonpath-copy-icon-btn" (click)="copyNodePath(hoveredJsonPath()); $event.stopPropagation()" data-tooltip="Copy JSONPath">
                <app-icon name="copy" class="icon-xs"></app-icon>
              </button>
            </div>
          </div>
        } @else {
          <app-inspector-empty-state [activeFormat]="activeFormat()" tab="tree" (fileContentDropped)="fileContentDropped.emit($event)"></app-inspector-empty-state>
        }
      }

      <!-- Tab 2: Interactive Tree View with Search Highlight & Actions -->
      @if (inspectorTab() === 'tree') {
        @if (result()?.parsedData; as data) {
          <div #scrollContainer class="inspector-view-container tree-view-container" (scroll)="scrollEvent.emit($event)">
            <div class="tree-root">
              <ng-container *ngTemplateOutlet="treeNodeTpl; context: { key: 'root', val: data, path: '$' }"></ng-container>
            </div>
          </div>
        } @else {
          <app-inspector-empty-state [activeFormat]="activeFormat()" tab="tree" (fileContentDropped)="fileContentDropped.emit($event)"></app-inspector-empty-state>
        }
      }

      <!-- Tab 3: Array Table View -->
      @if (inspectorTab() === 'table') {
        @if (tableData() && tableData().isTabular) {
          <div class="inspector-view-container table-view-container" (scroll)="scrollEvent.emit($event)">
            <table class="json-table">
              <thead>
                <tr>
                  <th class="th-index">#</th>
                  @for (col of tableData().columns; track col) {
                    <th>{{ col }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of tableData().rows; track $index) {
                  <tr>
                    <td class="row-num">{{ $index + 1 }}</td>
                    @for (col of tableData().columns; track col) {
                      <td [ngClass]="getTableCellClass(row[col])">
                        {{ formatTableCellValue(row[col]) }}
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-inspector-empty-state [activeFormat]="activeFormat()" tab="table" (fileContentDropped)="fileContentDropped.emit($event)"></app-inspector-empty-state>
        }
      }

      <!-- Tab 4: Expanded JSON Metrics & Statistics Panel -->
      @if (inspectorTab() === 'stats') {
        @if (result()?.parsedData && stats(); as st) {
          <div class="inspector-view-container stats-container">
            <div class="stats-section-title">Size</div>
            <div class="stats-grid stats-grid-3">
              <div class="stat-card highlight">
                <div class="stat-value">{{ (st.byteSize / 1024).toFixed(1) }} KB</div>
                <div class="stat-label">Formatted Size</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ (st.minifiedSize / 1024).toFixed(1) }} KB</div>
                <div class="stat-label">Minified Size</div>
              </div>
              <div class="stat-card stat-card-warn">
                <div class="stat-value">{{ (st.whitespaceOverhead / 1024).toFixed(1) }} KB</div>
                <div class="stat-label">Whitespace Overhead</div>
              </div>
            </div>
            <div class="stats-section-title">Structure</div>
            <div class="stats-grid stats-grid-4">
              <div class="stat-card">
                <div class="stat-value">{{ st.lineCount }}</div>
                <div class="stat-label">Lines</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ st.keyCount }}</div>
                <div class="stat-label">Total Keys</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ st.maxDepth }}</div>
                <div class="stat-label">Max Depth</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ st.objectCount }}</div>
                <div class="stat-label">Objects</div>
              </div>
            </div>
            <div class="stats-section-title">Value Types</div>
            <div class="stats-grid stats-grid-5">
              <div class="stat-card stat-type-array">
                <div class="stat-value">{{ st.arrayCount }}</div>
                <div class="stat-label">Arrays</div>
              </div>
              <div class="stat-card stat-type-string">
                <div class="stat-value">{{ st.stringCount }}</div>
                <div class="stat-label">Strings</div>
              </div>
              <div class="stat-card stat-type-number">
                <div class="stat-value">{{ st.numberCount }}</div>
                <div class="stat-label">Numbers</div>
              </div>
              <div class="stat-card stat-type-bool">
                <div class="stat-value">{{ st.booleanCount }}</div>
                <div class="stat-label">Booleans</div>
              </div>
              <div class="stat-card stat-type-null">
                <div class="stat-value">{{ st.nullCount }}</div>
                <div class="stat-label">Nulls</div>
              </div>
            </div>
          </div>
        } @else {
          <app-inspector-empty-state [activeFormat]="activeFormat()" tab="stats" (fileContentDropped)="fileContentDropped.emit($event)"></app-inspector-empty-state>
        }
      }

      <!-- Tab 5: Code Generator -->
      @if (inspectorTab() === 'codegen') {
        @if (result()?.parsedData) {
          <div class="codegen-wrapper">
            <div class="codegen-sub-header">
              <span class="sub-label">Language:</span>
              <div class="header-lang-pill-bar">
                @for (opt of langOptions; track opt.id) {
                  <button
                    class="header-lang-btn"
                    [class.active]="selectedLang() === opt.id"
                    [style.--lang-accent]="opt.accentColor"
                    (click)="selectedLang.set(opt.id)"
                    [attr.data-tooltip]="opt.fullName"
                  >
                    <i [class]="opt.deviconClass" class="header-lang-devicon" [style.color]="selectedLang() === opt.id ? '#fff' : opt.accentColor"></i>
                    <span class="header-lang-name">{{ opt.name }}</span>
                  </button>
                }
              </div>
            </div>
            <div class="inspector-view-container codegen-container">
              <pre class="code-output"><code [innerHTML]="highlightedCodeGen()"></code></pre>
            </div>
          </div>
        } @else {
          <app-inspector-empty-state [activeFormat]="activeFormat()" tab="codegen" (fileContentDropped)="fileContentDropped.emit($event)"></app-inspector-empty-state>
        }
      }

      <!-- Tab 6: Interactive JSON Crack Node Graph Scratchpad Canvas -->
      @if (inspectorTab() === 'graph') {
        <div class="inspector-view-container graph-view-container" [class.is-graph-fullscreen]="isGraphFullscreen()">
          <!-- Canvas Top Sub-Header Bar with Active JSONPath Breadcrumb -->
          <div class="graph-canvas-toolbar">
            <div class="graph-toolbar-left">
              <span class="graph-canvas-title">
                <app-icon name="network" class="icon-xs text-emerald-400"></app-icon>
                JSON Node Graph
              </span>
              <span class="graph-breadcrumb-chip" data-tooltip="Active JSONPath Route">
                <app-icon name="search-code" class="icon-xs text-emerald-400"></app-icon>
                <code>{{ activeGraphBreadcrumb() }}</code>
              </span>
            </div>
            <div class="graph-toolbar-right">
              @if (processedGraphData().nodes.length) {
                <span class="graph-node-count-badge">
                  {{ visibleNodesCount() }} / {{ processedGraphData().nodes.length }} Nodes
                </span>
              }
            </div>
          </div>

          <!-- Fixed Floating Action Control Bar (Fixed in place, stays sticky) -->
          @if (result()?.parsedData) {
            <div class="graph-floating-controls" (mousedown)="$event.stopPropagation()">
              <button
                class="graph-float-btn"
                (click)="toggleGraphFullscreen()"
                [attr.data-tooltip]="isGraphFullscreen() ? 'Exit Fullscreen' : 'Fullscreen / Maximize View'"
              >
                <app-icon [name]="isGraphFullscreen() ? 'minimize-2' : 'maximize-2'" class="icon-xs"></app-icon>
              </button>
              <button
                class="graph-float-btn"
                (click)="centerFocusGraph()"
                data-tooltip="Center Focus & Reset Pan / Scale (100%)"
              >
                <app-icon name="target" class="icon-xs"></app-icon>
              </button>
              <button
                class="graph-float-btn"
                (click)="toggleExpandCollapseAllNodes()"
                [attr.data-tooltip]="isAllGraphNodesCollapsed() ? 'Expand All Nodes' : 'Collapse All Nodes'"
              >
                <app-icon name="chevrons-up-down" class="icon-xs"></app-icon>
              </button>
              <button
                class="graph-float-btn"
                (click)="graphZoomIn()"
                data-tooltip="Zoom In (+)"
              >
                <app-icon name="zoom-in" class="icon-xs"></app-icon>
              </button>
              <button
                class="graph-float-btn"
                (click)="graphZoomOut()"
                data-tooltip="Zoom Out (-)"
              >
                <app-icon name="zoom-out" class="icon-xs"></app-icon>
              </button>
            </div>
          }

          <!-- Interactive Viewport Canvas Area with Pan Dragging & Background Dots -->
          @if (result()?.parsedData) {
            <div
              class="graph-interactive-viewport"
              [class.is-panning]="isPanning()"
              (mousedown)="startGraphPan($event)"
              (mousemove)="onGraphPanMove($event)"
              (mouseup)="stopGraphPan()"
              (mouseleave)="stopGraphPan()"
            >
              <!-- Transformed Infinite Scratchpad Canvas -->
              <div
                class="graph-node-canvas"
                [style.transform]="'translate(' + graphPanX() + 'px, ' + graphPanY() + 'px) scale(' + graphZoomLevel() + ')'"
                [style.transform-origin]="'0 0'"
              >
                <!-- SVG Curves Layer -->
                <svg
                  class="graph-svg-overlay"
                  [attr.width]="graphCanvasDimensions().width"
                  [attr.height]="graphCanvasDimensions().height"
                >
                  <defs>
                    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="var(--jl-accent)" stop-opacity="0.85" />
                      <stop offset="100%" stop-color="var(--json-key)" stop-opacity="0.85" />
                    </linearGradient>
                  </defs>
                  @for (edge of visibleGraphEdges(); track edge.id) {
                    <path
                      [attr.d]="edge.pathD"
                      class="graph-edge-path"
                      stroke="url(#edgeGrad)"
                      stroke-width="2"
                      fill="none"
                    />
                  }
                </svg>

                <!-- Cards / Nodes Layer -->
                @for (node of visibleGraphNodes(); track node.id) {
                  <div
                    class="graph-node-card"
                    [class.is-node-dragging]="draggingNodeId() === node.id"
                    [class.is-node-selected]="activeGraphBreadcrumb() === node.jsonPath"
                    [style.left.px]="node.x"
                    [style.top.px]="node.y"
                    [style.width.px]="node.width"
                    (click)="activeGraphBreadcrumb.set(node.jsonPath)"
                  >
                    <!-- Card Header Bar (Drag Handle + Collapse Chevron) -->
                    <div
                      class="graph-card-header"
                      (mousedown)="startNodeDrag($event, node.id)"
                      [attr.data-tooltip]="'Drag to move node • JSONPath: ' + node.jsonPath"
                    >
                      <span class="graph-card-title">{{ node.title }}</span>
                      <div class="graph-card-header-actions">
                        <button
                          class="node-collapse-toggle-btn"
                          (click)="toggleNodeCollapse(node.id, $event)"
                          [attr.data-tooltip]="isNodeCollapsed(node.id) ? 'Expand Node' : 'Collapse Node'"
                        >
                          <app-icon [name]="isNodeCollapsed(node.id) ? 'chevron-right' : 'chevron-down'" class="icon-xs"></app-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Card Body Rows -->
                    @if (!isNodeCollapsed(node.id)) {
                      <div class="graph-card-body">
                        @for (row of node.rows; track row.key) {
                          <div
                            class="graph-card-row"
                            (mouseenter)="activeGraphBreadcrumb.set(row.jsonPath)"
                          >
                            <span class="graph-row-key">{{ row.key }}</span>
                            <span class="graph-row-colon">:</span>
                            @if (row.childNodeId) {
                              <button
                                class="graph-row-link-badge"
                                (click)="toggleRowChildCollapse(node.id, row.key, $event)"
                                [attr.data-tooltip]="'Toggle sub-tree for ' + row.key"
                              >
                                <span>{{ row.valueType === 'array' ? '[' + row.childCount + ']' : '{' + row.childCount + '}' }}</span>
                                <app-icon [name]="isRowChildCollapsed(node.id, row.key) ? 'chevron-right' : 'chevron-down'" class="icon-xs"></app-icon>
                              </button>
                            } @else {
                              <span class="graph-row-val" [ngClass]="'hl-' + row.valueType">
                                {{ formatGraphPrimitive(row.value) }}
                              </span>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <app-inspector-empty-state [activeFormat]="activeFormat()" tab="graph" (fileContentDropped)="fileContentDropped.emit($event)"></app-inspector-empty-state>
          }
        </div>
      }


    </div>


    <!-- Context Menu Overlay for Tree Node Actions -->
    @if (activeContextMenu(); as ctx) {
      <div class="context-menu-backdrop" (click)="closeContextMenu()">
        <div class="tree-context-menu" [style.left.px]="ctx.x" [style.top.px]="ctx.y" (click)="$event.stopPropagation()">
          <button (click)="copyNodeVal(ctx.val)">Copy Value</button>
          <button (click)="copyNodeJson(ctx.val)">Copy JSON</button>
          <button (click)="copyNodePath(ctx.path)">Copy JSONPath</button>
        </div>
      </div>
    }

    <!-- Recursive Tree Node Template -->
    <ng-template #treeNodeTpl let-key="key" let-val="val" let-path="path">
      <div class="tree-node" [class.search-matched]="isSearchMatched(key, val)">
        @if (isObjectOrArray(val)) {
          <div
            class="node-row node-parent"
            (click)="toggleNode(path)"
            (contextmenu)="openContextMenu($event, path, val)"
          >
            <app-icon name="chevron-right" class="tree-arrow-icon icon-xs" [class.rotated]="isExpanded(path)"></app-icon>
            <span class="node-key">{{ key }}</span>
            <span class="node-meta">
              {{ isArray(val) ? '[' + val.length + ']' : '{' + getObjKeys(val).length + '}' }}
            </span>
          </div>

          @if (isExpanded(path)) {
            <div class="node-children">
              @if (isArray(val)) {
                @for (item of val; track $index) {
                  <ng-container *ngTemplateOutlet="treeNodeTpl; context: { key: '[' + $index + ']', val: item, path: path + '[' + $index + ']' }"></ng-container>
                }
              } @else {
                @for (k of getObjKeys(val); track k) {
                  <ng-container *ngTemplateOutlet="treeNodeTpl; context: { key: k, val: val[k], path: path + '.' + k }"></ng-container>
                }
              }
            </div>
          }
        } @else {
          <div
            class="node-row node-leaf"
            (contextmenu)="openContextMenu($event, path, val)"
          >
            <span class="node-key">{{ key }}</span><span class="node-colon">:</span>
            <span class="node-val" [ngClass]="getTypeClass(val)">{{ formatVal(val) }}</span>
            <span class="type-badge" [ngClass]="getTypeBadgeClass(val)">{{ getTypeName(val) }}</span>
            <button class="node-action-btn" (click)="copyNodePath(path)" data-tooltip="Copy JSONPath">
              <app-icon name="copy" class="icon-xs"></app-icon>
            </button>
          </div>
        }
      </div>
    </ng-template>
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensInspectorComponent implements AfterViewChecked {
  @ViewChild('highlightLayer') highlightLayer?: ElementRef<HTMLPreElement>;
  @ViewChild('gutterLayer') gutterLayer?: ElementRef<HTMLDivElement>;

  ngAfterViewChecked() {
    this.syncLineHeights();
  }

  @HostListener('window:resize')
  onResize() {
    this.syncLineHeights();
  }

  syncLineHeights() {
    const highlightEl = this.highlightLayer?.nativeElement;
    const gutterEl = this.gutterLayer?.nativeElement;
    if (!highlightEl || !gutterEl) return;

    const codeLines = highlightEl.querySelectorAll<HTMLElement>('.line-marker');
    const gutterRows = gutterEl.querySelectorAll<HTMLElement>('.gutter-line-row');

    const count = Math.min(codeLines.length, gutterRows.length);
    for (let i = 0; i < count; i++) {
      const codeLine = codeLines[i];
      const gutterRow = gutterRows[i];
      if (codeLine && gutterRow) {
        const h = codeLine.getBoundingClientRect().height;
        if (h > 0) {
          gutterRow.style.height = `${h}px`;
        }
      }
    }
  }
  @ViewChild('inspectorTextarea') inspectorTextarea?: ElementRef<HTMLTextAreaElement>;

  inspectorTab = input<'formatted' | 'tree' | 'table' | 'stats' | 'codegen' | 'jsonpath' | 'graph'>('formatted');
  displayOutput = input<string>('');
  searchQuery = input<string>('');
  result = input<JsonLensResult | null>(null);
  stats = input<JsonStats | undefined>(undefined);
  copied = input<boolean>(false);

  fileContentDropped = output<string>();
  outputChange = output<string>();

  onInspectorTextInput(newVal: string) {
    this.outputChange.emit(newVal);
  }

  onInspectorKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = this.inspectorTextarea?.nativeElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      textarea.value = val.substring(0, start) + '  ' + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      this.outputChange.emit(textarea.value);
    }
  }

  onInspectorScrollSync(event: Event) {
    if (this.highlightLayer && this.inspectorTextarea) {
      const textarea = this.inspectorTextarea.nativeElement;
      const highlight = this.highlightLayer.nativeElement;
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
    this.scrollEvent.emit(event);
  }

  selectedLang = signal<string>('typescript');
  expandedNodes = signal<{ [path: string]: boolean }>({ '$': true });
  isFormattedExpanded = signal<boolean>(true);
  isAllTreeExpanded = signal<boolean>(true);
  activeContextMenu = signal<{ x: number; y: number; path: string; val: any } | null>(null);

  showFilterPopover = signal<boolean>(false);
  filterCondition = signal<{
    query: string;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'keyEquals' | 'gt' | 'lt' | 'regex';
    scope: 'all' | 'keys' | 'values';
    matchCase: boolean;
  }>({
    query: '',
    operator: 'contains',
    scope: 'all',
    matchCase: false
  });
  activeFilterCondition = signal<{
    query: string;
    operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'keyEquals' | 'gt' | 'lt' | 'regex';
    scope: 'all' | 'keys' | 'values';
    matchCase: boolean;
  } | null>(null);

  toggleFilter() {
    this.showFilterPopover.update(v => !v);
  }

  closeFilterPopover() {
    this.showFilterPopover.set(false);
  }

  updateFilterQuery(q: string) {
    this.filterCondition.update(c => ({ ...c, query: q }));
  }

  updateFilterOperator(op: any) {
    this.filterCondition.update(c => ({ ...c, operator: op }));
  }

  updateFilterScope(sc: any) {
    this.filterCondition.update(c => ({ ...c, scope: sc }));
  }

  toggleMatchCase() {
    this.filterCondition.update(c => ({ ...c, matchCase: !c.matchCase }));
  }

  applyFilterCondition() {
    const cond = { ...this.filterCondition() };
    this.activeFilterCondition.set(cond.query.trim() ? cond : null);
    this.searchQueryChange.emit(cond.query);
    this.closeFilterPopover();
  }

  resetFilterCondition() {
    this.filterCondition.set({
      query: '',
      operator: 'contains',
      scope: 'all',
      matchCase: false
    });
    this.activeFilterCondition.set(null);
    this.clearSearchClick.emit();
    this.closeFilterPopover();
  }

  readonly activeFilterMatchesCount = computed(() => {
    const cond = this.activeFilterCondition();
    const q = (cond ? cond.query : this.searchQuery()).trim().toLowerCase();
    const raw = this.displayOutput();
    if (!q || !raw) return 0;
    return raw.toLowerCase().split(q).length - 1;
  });

  toggleAllTreeNodes() {
    if (this.isAllTreeExpanded()) {
      this.collapseAllTreeNodes();
      this.isAllTreeExpanded.set(false);
    } else {
      this.expandAllTreeNodes();
      this.isAllTreeExpanded.set(true);
    }
  }

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  showExportMenu = signal<boolean>(false);

  toggleExportMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showExportMenu.update(v => !v);
  }

  exportTableCSV() {
    const td = this.tableData();
    if (!td.isTabular || !td.rows.length) return;
    const cols = td.columns;
    const headerRow = cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',');
    const bodyRows = td.rows.map((row: any) =>
      cols.map(c => {
        const val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csvContent = [headerRow, ...bodyRows].join('\n');
    this.downloadFile(csvContent, 'table-export.csv', 'text/csv');
  }

  exportTableHTML() {
    const td = this.tableData();
    if (!td.isTabular || !td.rows.length) return;
    const cols = td.columns;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Acklet Table Export</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0B0D10; color: #E8EAED; padding: 2rem; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #252B33; font-size: 14px; }
    th, td { padding: 8px 12px; border: 1px solid #252B33; text-align: left; }
    th { background: #171B21; color: #2FA084; font-weight: 600; }
    tr:nth-child(even) { background: #111419; }
  </style>
</head>
<body>
  <h2>Exported Data Table (${td.rows.length} rows)</h2>
  <table>
    <thead><tr><th>#</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>
      ${td.rows.map((r: any, idx: number) => `<tr><td>${idx + 1}</td>${cols.map(c => `<td>${r[c] !== undefined ? r[c] : ''}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table>
</body>
</html>`;
    this.downloadFile(html, 'table-export.html', 'text/html');
  }

  exportTableJSON() {
    const td = this.tableData();
    if (!td.isTabular) return;
    const jsonStr = JSON.stringify(td.rows, null, 2);
    this.downloadFile(jsonStr, 'table-export.json', 'application/json');
  }

  exportGraphSVG() {
    const { nodes } = this.processedGraphData();
    const visibleNodes = this.visibleGraphNodes();
    const visibleEdges = this.visibleGraphEdges();
    const dims = this.graphCanvasDimensions();

    if (visibleNodes.length === 0) return;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dims.width} ${dims.height}" width="${dims.width}" height="${dims.height}">
  <defs>
    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.9" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Canvas Background -->
  <rect width="100%" height="100%" fill="#0f172a" />

  <!-- Graph Connector Curves -->
  <g class="edges">
`;

    visibleEdges.forEach(edge => {
      svgContent += `    <path d="${edge.pathD}" stroke="url(#edgeGrad)" stroke-width="2.5" fill="none" />\n`;
    });

    svgContent += `  </g>\n\n  <!-- Graph Node Cards -->\n  <g class="nodes">\n`;

    visibleNodes.forEach(node => {
      const isCollapsed = this.isNodeCollapsed(node.id);
      const HEADER_HEIGHT = 34;
      const ROW_HEIGHT = 24;
      const cardHeight = isCollapsed ? HEADER_HEIGHT : HEADER_HEIGHT + (node.rows.length * ROW_HEIGHT) + 8;

      svgContent += `    <g transform="translate(${node.x}, ${node.y})" filter="url(#cardShadow)">
      <!-- Card Container Background -->
      <rect width="${node.width}" height="${cardHeight}" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
      
      <!-- Card Header -->
      <path d="M 0,8 A 8,8 0 0,1 8,0 L ${node.width - 8},0 A 8,8 0 0,1 ${node.width},8 L ${node.width},${HEADER_HEIGHT} L 0,${HEADER_HEIGHT} Z" fill="#0f172a" />
      <text x="12" y="22" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="bold">${this.escapeXml(node.title)}</text>
`;

      if (!isCollapsed) {
        node.rows.forEach((row, rIdx) => {
          const rowY = HEADER_HEIGHT + 6 + (rIdx * ROW_HEIGHT);
          const valStr = row.childNodeId
            ? (row.valueType === 'array' ? `[${row.childCount}]` : `{${row.childCount}}`)
            : this.formatGraphPrimitive(row.value);
          const valColor = row.childNodeId ? '#38bdf8' : (row.valueType === 'string' ? '#22c55e' : (row.valueType === 'number' ? '#f59e0b' : (row.valueType === 'boolean' ? '#a855f7' : '#94a3b8')));

          svgContent += `      <!-- Row ${rIdx + 1} -->
      <text x="12" y="${rowY + 14}" fill="#94a3b8" font-family="'JetBrains Mono', Consolas, Monaco, monospace" font-size="11" font-weight="600">${this.escapeXml(row.key)}:</text>
      <text x="${node.width - 12}" y="${rowY + 14}" fill="${valColor}" font-family="'JetBrains Mono', Consolas, Monaco, monospace" font-size="11" text-anchor="end">${this.escapeXml(valStr)}</text>
`;
        });
      }

      svgContent += `    </g>\n`;
    });

    svgContent += `  </g>\n</svg>`;

    this.downloadFile(svgContent, 'graph-diagram.svg', 'image/svg+xml');
  }

  private escapeXml(unsafe: string): string {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  exportGraphJSON() {
    const gData = this.processedGraphData();
    const jsonStr = JSON.stringify(gData, null, 2);
    this.downloadFile(jsonStr, 'graph-ast.json', 'application/json');
  }

  exportStatsMarkdown() {
    const st = this.stats();
    if (!st) return;
    const md = `# JSON Lens Payload Statistics Report

- **Formatted Size**: ${(st.byteSize / 1024).toFixed(2)} KB
- **Minified Size**: ${(st.minifiedSize / 1024).toFixed(2)} KB
- **Whitespace Overhead**: ${(st.whitespaceOverhead / 1024).toFixed(2)} KB
- **Total Lines**: ${st.lineCount}
- **Total Keys**: ${st.keyCount}
- **Maximum Depth**: ${st.maxDepth}
- **Total Objects**: ${st.objectCount}

## Value Breakdown
- **Arrays**: ${st.arrayCount}
- **Strings**: ${st.stringCount}
- **Numbers**: ${st.numberCount}
- **Booleans**: ${st.booleanCount}
- **Nulls**: ${st.nullCount}
`;
    this.downloadFile(md, 'json-stats-report.md', 'text/markdown');
  }

  exportStatsJSON() {
    const st = this.stats();
    if (!st) return;
    const jsonStr = JSON.stringify(st, null, 2);
    this.downloadFile(jsonStr, 'json-stats-metrics.json', 'application/json');
  }

  exportAs(targetFormat: 'json' | 'yaml' | 'xml' | 'csv' | 'md') {
    const res = this.result();
    if (!res || !res.parsedData) {
      if (targetFormat === 'json') this.downloadClick.emit();
      return;
    }

    const data = res.parsedData;
    if (targetFormat === 'json') {
      const content = JSON.stringify(data, null, 2);
      this.downloadFile(content, 'document.json', 'application/json');
    } else if (targetFormat === 'yaml') {
      const content = this.jsonLensService.convertTo(data, 'yaml');
      this.downloadFile(content, 'document.yaml', 'text/yaml');
    } else if (targetFormat === 'xml') {
      const content = this.jsonLensService.convertTo(data, 'xml');
      this.downloadFile(content, 'document.xml', 'application/xml');
    } else if (targetFormat === 'csv') {
      const content = this.jsonLensService.convertTo(data, 'csv');
      this.downloadFile(content, 'document.csv', 'text/csv');
    } else if (targetFormat === 'md') {
      const raw = this.displayOutput() || JSON.stringify(data, null, 2);
      const content = `\`\`\`json\n${raw}\n\`\`\``;
      this.downloadFile(content, 'document.md', 'text/markdown');
    }
  }

  exportCodeGenFile() {
    const code = this.generatedCode();
    if (!code) return;
    const ext = this.getFileExtForActiveLang();
    this.downloadFile(code, `generated-code${ext}`, 'text/plain');
  }

  exportCodeGenMarkdown() {
    const code = this.generatedCode();
    if (!code) return;
    const lang = this.selectedLang();
    const md = `\`\`\`${lang}\n${code}\n\`\`\``;
    this.downloadFile(md, `generated-code-${lang}.md`, 'text/markdown');
  }

  exportJsonPathResults() {
    const qr = this.jsonPathResult();
    if (!qr || !qr.results.length) return;
    const jsonStr = JSON.stringify(qr.results, null, 2);
    this.downloadFile(jsonStr, 'jsonpath-results.json', 'application/json');
  }

  exportFormattedMarkdown() {
    const raw = this.displayOutput();
    if (!raw) return;
    const md = `\`\`\`json\n${raw}\n\`\`\``;
    this.downloadFile(md, 'formatted-payload.md', 'text/markdown');
  }

  getDeviconForActiveLang(): string {
    const lang = this.selectedLang();
    const opt = this.langOptions.find(o => o.id === lang);
    return opt ? opt.deviconClass : 'devicon-code-plain';
  }

  getFileExtForActiveLang(): string {
    const lang = this.selectedLang();
    const map: { [key: string]: string } = {
      typescript: '.ts',
      python: '.py',
      go: '.go',
      rust: '.rs',
      kotlin: '.kt',
      swift: '.swift',
      cpp: '.cpp',
      csharp: '.cs',
      java: '.java',
      schema: '.schema.json',
      php: '.php',
      dart: '.dart'
    };
    return map[lang] || '.txt';
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  documentFormat = input<string>('json');
  inspectorFormatOverride = signal<string | null>(null);

  readonly effectiveFormat = computed(() => {
    const override = this.inspectorFormatOverride();
    if (override) return override;
    return this.documentFormat() || 'json';
  });

  activeFormat = computed(() => this.effectiveFormat());

  tabChange = output<'formatted' | 'tree' | 'table' | 'stats' | 'codegen' | 'jsonpath' | 'graph'>();
  formatConvert = output<'json' | 'yaml' | 'xml' | 'csv'>();
  copyClick = output<void>();
  downloadClick = output<void>();
  searchQueryChange = output<string>();
  clearSearchClick = output<void>();
  scrollEvent = output<Event>();
  toastTriggered = output<string>();

  showInspectorFormatMenu = signal<boolean>(false);

  toggleInspectorStringify() {
    if (this.effectiveFormat() === 'stringify') {
      this.inspectorFormatOverride.set(null);
    } else {
      this.inspectorFormatOverride.set('stringify');
    }
  }

  selectFormattedTab() {
    if (this.inspectorTab() !== 'formatted') {
      this.tabChange.emit('formatted');
    }
  }

  onFormatChange(format: string) {
    this.inspectorFormatOverride.set(format);
    if (format !== 'stringify') {
      this.formatConvert.emit(format as 'json' | 'yaml' | 'xml' | 'csv');
    }
    if (this.inspectorTab() !== 'formatted') {
      this.tabChange.emit('formatted');
    }
  }

  syncScrollPosition(percentage: number) {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = percentage * (el.scrollHeight - el.clientHeight);
    }
  }

  searchMatchesCount = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const raw = this.displayOutput();
    if (!q || !raw) return 0;
    const matches = raw.toLowerCase().split(q);
    return matches.length - 1;
  });

  tableData = computed(() => {
    const res = this.result();
    if (!res || !res.parsedData) return { isTabular: false, columns: [], rows: [] };
    const data = res.parsedData;
    if (Array.isArray(data) && data.length > 0) {
      if (typeof data[0] === 'object' && data[0] !== null) {
        const colSet = new Set<string>();
        data.forEach((item: any) => {
          if (typeof item === 'object' && item !== null) {
            Object.keys(item).forEach(k => colSet.add(k));
          }
        });
        return { isTabular: true, columns: Array.from(colSet), rows: data };
      } else {
        return { isTabular: true, columns: ['Value'], rows: data.map((v: any) => ({ Value: v })) };
      }
    } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const keys = Object.keys(data);
      const rows = keys.map(k => ({ Key: k, Value: data[k] }));
      return { isTabular: true, columns: ['Key', 'Value'], rows };
    }
    return { isTabular: false, columns: [], rows: [] };
  });

  formatTableCellValue(val: any): string {
    if (val === undefined || val === null) return '—';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  getTableCellClass(val: any): string {
    if (val === undefined || val === null) return 'cell-null';
    if (typeof val === 'number') return 'cell-number';
    if (typeof val === 'boolean') return 'cell-boolean';
    if (typeof val === 'object') return 'cell-object';
    return 'cell-string';
  }

  readonly langOptions = [
    { id: 'typescript', name: 'TypeScript', fullName: 'TypeScript Interface', accentColor: '#3178C6', deviconClass: 'devicon-typescript-plain' },
    { id: 'python', name: 'Python', fullName: 'Python Dataclass', accentColor: '#3776AB', deviconClass: 'devicon-python-plain' },
    { id: 'go', name: 'Go', fullName: 'Go Struct', accentColor: '#00ADD8', deviconClass: 'devicon-go-plain' },
    { id: 'rust', name: 'Rust', fullName: 'Rust Struct (Serde)', accentColor: '#DEA584', deviconClass: 'devicon-rust-plain' },
    { id: 'kotlin', name: 'Kotlin', fullName: 'Kotlin Data Class', accentColor: '#7F52FF', deviconClass: 'devicon-kotlin-plain' },
    { id: 'swift', name: 'Swift', fullName: 'Swift Codable Struct', accentColor: '#F05138', deviconClass: 'devicon-swift-plain' },
    { id: 'cpp', name: 'C++', fullName: 'C++ Struct', accentColor: '#F34B7D', deviconClass: 'devicon-cplusplus-plain' },
    { id: 'csharp', name: 'C#', fullName: 'C# Class', accentColor: '#28A745', deviconClass: 'devicon-csharp-plain' },
    { id: 'java', name: 'Java', fullName: 'Java Class', accentColor: '#E76F00', deviconClass: 'devicon-java-plain' },
    { id: 'schema', name: 'JSON Schema', fullName: 'JSON Schema Draft-07', accentColor: '#005CC5', deviconClass: 'devicon-json-plain' },
    { id: 'php', name: 'PHP', fullName: 'PHP Class', accentColor: '#4F5D95', deviconClass: 'devicon-php-plain' },
    { id: 'dart', name: 'Dart', fullName: 'Dart Class', accentColor: '#00B4AB', deviconClass: 'devicon-dart-plain' }
  ];

  generatedCode = computed(() => {
    const res = this.result();
    if (!res || !res.parsedData) return '// No valid JSON AST to generate code.';
    const lang = this.selectedLang();
    const data = res.parsedData;
    const isObj = typeof data === 'object' && data !== null;
    const keys = isObj ? Object.keys(data) : [];

    if (lang === 'typescript') {
      return `export interface RootObject {\n` +
        keys.map(k => `  ${k}: ${this.getTsType(data[k])};`).join('\n') +
        `\n}`;
    } else if (lang === 'python') {
      return `from dataclasses import dataclass\nfrom typing import List, Any, Optional\n\n@dataclass\nclass RootObject:\n` +
        (keys.length ? keys.map(k => `    ${k}: ${this.getPyType(data[k])}`).join('\n') : '    pass');
    } else if (lang === 'go') {
      return `type RootObject struct {\n` +
        keys.map(k => `\t${this.toPascalCase(k)} ${this.getGoType(data[k])} \`json:"${k}"\``).join('\n') +
        `\n}`;
    } else if (lang === 'rust') {
      return `use serde::{Serialize, Deserialize};\n\n#[derive(Debug, Serialize, Deserialize)]\npub struct RootObject {\n` +
        keys.map(k => `    pub ${k}: ${this.getRustType(data[k])},`).join('\n') +
        `\n}`;
    } else if (lang === 'kotlin') {
      return `import com.google.gson.annotations.SerializedName\n\ndata class RootObject(\n` +
        keys.map((k, i) => `    @SerializedName("${k}") val ${k}: ${this.getKotlinType(data[k])}${i < keys.length - 1 ? ',' : ''}`).join('\n') +
        `\n)`;
    } else if (lang === 'swift') {
      return `import Foundation\n\nstruct RootObject: Codable {\n` +
        keys.map(k => `    let ${k}: ${this.getSwiftType(data[k])}`).join('\n') +
        `\n}`;
    } else if (lang === 'cpp') {
      return `#include <string>\n#include <vector>\n\nstruct RootObject {\n` +
        keys.map(k => `    ${this.getCppType(data[k])} ${k};`).join('\n') +
        `\n};`;
    } else if (lang === 'java') {
      return `public class RootObject {\n` +
        keys.map(k => `    private ${this.getJavaType(data[k])} ${k};`).join('\n') +
        `\n}`;
    } else if (lang === 'csharp') {
      return `public class RootObject {\n` +
        keys.map(k => `    public ${this.getCsType(data[k])} ${this.toPascalCase(k)} { get; set; }`).join('\n') +
        `\n}`;
    } else if (lang === 'schema') {
      return JSON.stringify(this.toJsonSchema(data), null, 2);
    } else if (lang === 'php') {
      return `<?php\n\nclass RootObject {\n` +
        keys.map(k => `    public ${this.getPhpType(data[k])} $${k};`).join('\n') +
        `\n}`;
    } else if (lang === 'dart') {
      return `class RootObject {\n` +
        keys.map(k => `  final ${this.getDartType(data[k])} ${k};`).join('\n') +
        `\n  RootObject({\n` +
        keys.map(k => `    required this.${k},`).join('\n') +
        `\n  });\n}`;
    }
    return '';
  });

  private toPascalCase(str: string): string {
    if (!str) return 'Field';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private getTsType(val: any): string {
    if (val === null) return 'null';
    if (Array.isArray(val)) return val.length ? `${this.getTsType(val[0])}[]` : 'any[]';
    if (typeof val === 'object') return 'Record<string, any>';
    return typeof val;
  }

  private getPyType(val: any): string {
    if (val === null) return 'Optional[Any]';
    if (Array.isArray(val)) return val.length ? `List[${this.getPyType(val[0])}]` : 'List[Any]';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'str';
    return 'dict';
  }

  private getGoType(val: any): string {
    if (val === null) return 'interface{}';
    if (Array.isArray(val)) return val.length ? `[]${this.getGoType(val[0])}` : '[]interface{}';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float64';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'string';
    return 'map[string]interface{}';
  }

  private getRustType(val: any): string {
    if (val === null) return 'Option<serde_json::Value>';
    if (Array.isArray(val)) return val.length ? `Vec<${this.getRustType(val[0])}>` : 'Vec<serde_json::Value>';
    if (typeof val === 'number') return Number.isInteger(val) ? 'i64' : 'f64';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'String';
    return 'serde_json::Value';
  }

  private getKotlinType(val: any): string {
    if (val === null) return 'Any?';
    if (Array.isArray(val)) return val.length ? `List<${this.getKotlinType(val[0])}>` : 'List<Any>';
    if (typeof val === 'number') return Number.isInteger(val) ? 'Long' : 'Double';
    if (typeof val === 'boolean') return 'Boolean';
    if (typeof val === 'string') return 'String';
    return 'Map<String, Any>';
  }

  private getSwiftType(val: any): string {
    if (val === null) return 'Any?';
    if (Array.isArray(val)) return val.length ? `[${this.getSwiftType(val[0])}]` : '[Any]';
    if (typeof val === 'number') return Number.isInteger(val) ? 'Int' : 'Double';
    if (typeof val === 'boolean') return 'Bool';
    if (typeof val === 'string') return 'String';
    return '[String: Any]';
  }

  private getCppType(val: any): string {
    if (val === null) return 'std::string';
    if (Array.isArray(val)) return val.length ? `std::vector<${this.getCppType(val[0])}>` : 'std::vector<std::string>';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'double';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'std::string';
    return 'std::string';
  }

  private getJavaType(val: any): string {
    if (val === null) return 'Object';
    if (Array.isArray(val)) return val.length ? `List<${this.getJavaType(val[0])}>` : 'List<Object>';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'double';
    if (typeof val === 'boolean') return 'boolean';
    if (typeof val === 'string') return 'String';
    return 'Map<String, Object>';
  }

  private getCsType(val: any): string {
    if (val === null) return 'object';
    if (Array.isArray(val)) return val.length ? `List<${this.getCsType(val[0])}>` : 'List<object>';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'double';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'string';
    return 'Dictionary<string, object>';
  }

  private getPhpType(val: any): string {
    if (val === null) return 'mixed';
    if (Array.isArray(val)) return 'array';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'string';
    return 'array';
  }

  private getDartType(val: any): string {
    if (val === null) return 'dynamic';
    if (Array.isArray(val)) return val.length ? `List<${this.getDartType(val[0])}>` : 'List<dynamic>';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'double';
    if (typeof val === 'boolean') return 'bool';
    if (typeof val === 'string') return 'String';
    return 'Map<String, dynamic>';
  }

  private toJsonSchema(val: any): any {
    if (val === null) return { type: 'null' };
    if (Array.isArray(val)) {
      return {
        type: 'array',
        items: val.length ? this.toJsonSchema(val[0]) : {}
      };
    }
    if (typeof val === 'object') {
      const properties: any = {};
      Object.keys(val).forEach(k => {
        properties[k] = this.toJsonSchema(val[k]);
      });
      return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'RootObject',
        type: 'object',
        properties
      };
    }
    const t = typeof val;
    return { type: t === 'number' ? (Number.isInteger(val) ? 'integer' : 'number') : t };
  }

  isObjectOrArray(val: any): boolean {
    return val !== null && typeof val === 'object';
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  getObjKeys(val: any): string[] {
    return val ? Object.keys(val) : [];
  }

  isExpanded(path: string): boolean {
    return !!this.expandedNodes()[path];
  }

  toggleNode(path: string) {
    this.expandedNodes.update(map => ({ ...map, [path]: !map[path] }));
  }

  expandAllTreeNodes() {
    const res = this.result();
    if (!res || !res.parsedData) return;
    const map: { [path: string]: boolean } = {};
    const walk = (node: any, path: string) => {
      map[path] = true;
      if (Array.isArray(node)) {
        node.forEach((item, idx) => walk(item, `${path}[${idx}]`));
      } else if (node !== null && typeof node === 'object') {
        Object.keys(node).forEach(k => walk(node[k], `${path}.${k}`));
      }
    };
    walk(res.parsedData, '$');
    this.expandedNodes.set(map);
  }

  collapseAllTreeNodes() {
    this.expandedNodes.set({ '$': false });
  }

  toggleExpandAllFormatted() {
    this.isFormattedExpanded.update(v => !v);
  }

  isSearchMatched(key: string, val: any): boolean {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return false;
    if (key.toLowerCase().includes(q)) return true;
    if (val !== null && typeof val !== 'object' && String(val).toLowerCase().includes(q)) return true;
    return false;
  }

  openContextMenu(event: MouseEvent, path: string, val: any) {
    event.preventDefault();
    this.activeContextMenu.set({
      x: event.clientX,
      y: event.clientY,
      path,
      val
    });
  }

  closeContextMenu() {
    this.activeContextMenu.set(null);
  }

  copyNodeVal(val: any) {
    const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    navigator.clipboard.writeText(str).then(() => {
      this.toastTriggered.emit('✓ Copied node value to clipboard');
    }).catch(() => {});
    this.closeContextMenu();
  }

  copyNodeJson(val: any) {
    navigator.clipboard.writeText(JSON.stringify(val, null, 2)).then(() => {
      this.toastTriggered.emit('✓ Copied node JSON to clipboard');
    }).catch(() => {});
    this.closeContextMenu();
  }

  copyNodePath(path: string) {
    navigator.clipboard.writeText(path).then(() => {
      this.toastTriggered.emit(`✓ Copied JSONPath "${path}" to clipboard`);
    }).catch(() => {});
    this.closeContextMenu();
  }

  getTypeClass(val: any): string {
    if (val === null) return 'type-null';
    if (typeof val === 'string') return 'type-string';
    if (typeof val === 'number') return 'type-number';
    if (typeof val === 'boolean') return 'type-boolean';
    return '';
  }

  getTypeBadgeClass(val: any): string {
    if (val === null) return 'badge-null';
    if (typeof val === 'string') return 'badge-string';
    if (typeof val === 'number') return 'badge-number';
    if (typeof val === 'boolean') return 'badge-boolean';
    return '';
  }

  getTypeName(val: any): string {
    if (val === null) return 'null';
    if (typeof val === 'string') return 'str';
    if (typeof val === 'number') return Number.isInteger(val) ? 'int' : 'float';
    if (typeof val === 'boolean') return 'bool';
    return '';
  }

  formatVal(val: any): string {
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
  }

  foldedLineSet = signal<Set<number>>(new Set());
  lastValidText = signal<string>('');

  effectiveDisplayOutput = computed(() => {
    const raw = this.displayOutput();
    if (raw && raw.trim().length > 0) {
      return raw;
    }
    const res = this.result();
    if (res && res.formattedJson && res.formattedJson.trim().length > 0) {
      return res.formattedJson;
    }
    return '';
  });

  readonly foldedState = computed(() => {
    let raw = this.effectiveDisplayOutput();
    if (!raw) {
      const res = this.result();
      if (res?.parsedData) {
        try {
          raw = this.jsonLensService.convertTo(res.parsedData, this.activeFormat() as any);
        } catch {
          raw = JSON.stringify(res.parsedData, null, 2);
        }
      }
    }
    raw = raw || '';

    if (this.activeFormat() === 'stringify' && raw) {
      try {
        const parsed = JSON.parse(raw);
        raw = JSON.stringify(JSON.stringify(parsed), null, 2);
      } catch {
        raw = JSON.stringify(raw, null, 2);
      }
    }
    const foldedSet = this.foldedLineSet();
    if (!raw) return { visibleLines: [{ num: 1, content: '', isFoldable: false, isFolded: false }], text: '' };

    const splitLines = raw.split('\n');
    const total = splitLines.length;
    const closingLineMap = new Map<number, number>();
    const isFoldableMap = new Map<number, boolean>();

    for (let i = 0; i < total; i++) {
      const lineNum = i + 1;
      const content = splitLines[i];
      const trimmed = content.trim();

      const openCount = (content.match(/[\{\[]/g) || []).length;
      const closeCount = (content.match(/[\}\]]/g) || []).length;
      const netOpen = openCount - closeCount;

      if (netOpen > 0 && !trimmed.endsWith('{}') && !trimmed.endsWith('[]') && !trimmed.endsWith('{},') && !trimmed.endsWith('[],')) {
        isFoldableMap.set(lineNum, true);

        let depth = netOpen;
        let closeLine = -1;
        for (let j = i + 1; j < total; j++) {
          const nextContent = splitLines[j];
          const nextOpen = (nextContent.match(/[\{\[]/g) || []).length;
          const nextClose = (nextContent.match(/[\}\]]/g) || []).length;
          depth += nextOpen - nextClose;
          if (depth <= 0) {
            closeLine = j + 1;
            break;
          }
        }
        if (closeLine !== -1) {
          closingLineMap.set(lineNum, closeLine);
        }
      }
    }

    const visibleLines: { num: number; content: string; isFoldable: boolean; isFolded: boolean }[] = [];
    const textLines: string[] = [];
    let skipUntilLine = -1;

    for (let i = 0; i < total; i++) {
      const lineNum = i + 1;
      const content = splitLines[i];

      if (skipUntilLine !== -1) {
        if (lineNum <= skipUntilLine) {
          continue;
        } else {
          skipUntilLine = -1;
        }
      }

      const isFoldable = isFoldableMap.get(lineNum) || false;
      const isFolded = foldedSet.has(lineNum);

      if (isFolded && isFoldable) {
        const closeLine = closingLineMap.get(lineNum) || lineNum;
        const isArray = content.includes('[');
        const tag = isArray ? '[...]' : '{...}';

        const closingContent = splitLines[closeLine - 1] || '';
        const hasComma = closingContent.trim().endsWith(',');
        const fullTag = hasComma ? `${tag},` : tag;

        const prefix = content.replace(/[\{\[]\s*$/, '').trimEnd();
        const lineText = `${prefix} __FOLD_PILL_START_${lineNum}_${fullTag}__FOLD_PILL_END__`;

        visibleLines.push({ num: lineNum, content: lineText, isFoldable: true, isFolded: true });
        textLines.push(lineText);

        skipUntilLine = closeLine;
      } else {
        visibleLines.push({ num: lineNum, content, isFoldable, isFolded: false });
        textLines.push(content);
      }
    }

    return { visibleLines, text: textLines.join('\n') };
  });

  readonly formattedLines = computed(() => this.foldedState().visibleLines);
  readonly formattedOutputText = computed(() => this.foldedState().text);

  onCodeClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target) return;

    const pill = target.closest ? target.closest('.hl-fold-pill') : null;
    if (pill) {
      const lineStr = pill.getAttribute('data-line');
      if (lineStr) {
        this.toggleFoldLine(parseInt(lineStr, 10));
        return;
      }
    }
  }

  toggleFoldLine(lineNum: number) {
    const set = new Set(this.foldedLineSet());
    if (set.has(lineNum)) {
      set.delete(lineNum);
    } else {
      set.add(lineNum);
    }
    this.foldedLineSet.set(set);
  }

  searchScope = input<'both' | 'input' | 'inspector'>('both');
  jsonLensService = inject(DataLensService);

  // ── JSONPath ──────────────────────────────────────────────────────────────
  jsonPathExpr = signal<string>('');

  readonly jsonPathResult = computed(() => {
    const expr = this.jsonPathExpr().trim();
    const data = this.result()?.parsedData;
    if (!expr || !data) return { results: [], paths: [] };
    return this.jsonLensService.evaluateJsonPath(data, expr);
  });

  highlightJsonValue(val: any): string {
    const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    return this.jsonLensService.highlightSyntax(str, 'json');
  }

  // ── Graph ─────────────────────────────────────────────────────────────────
  chartBars(st: any): { label: string; count: number; pct: number; color: string }[] {
    const total = st.stringCount + st.numberCount + st.booleanCount + st.nullCount + st.arrayCount + st.objectCount || 1;
    const bars = [
      { label: 'Strings', count: st.stringCount, color: 'var(--json-string)' },
      { label: 'Numbers', count: st.numberCount, color: 'var(--json-number)' },
      { label: 'Booleans', count: st.booleanCount, color: 'var(--json-boolean)' },
      { label: 'Objects', count: st.objectCount, color: 'var(--json-key)' },
      { label: 'Arrays', count: st.arrayCount, color: 'var(--hl-bracket-1)' },
      { label: 'Nulls', count: st.nullCount, color: 'var(--json-null)' },
    ];
    return bars.map(b => ({ ...b, pct: (b.count / total) * 100 }));
  }

  ringDash(minifiedSize: number, byteSize: number): string {
    const circumference = 2 * Math.PI * 45; // r=45
    const pct = byteSize > 0 ? (minifiedSize / byteSize) : 0;
    const filled = circumference * pct;
    return `${filled.toFixed(2)} ${circumference.toFixed(2)}`;
  }



  // ── Interactive Scratchpad Node Graph Engine ────────────────────────────────
  graphPanX = signal<number>(0);
  graphPanY = signal<number>(0);
  graphZoomLevel = signal<number>(1.0);
  isPanning = signal<boolean>(false);
  panStartPos = { x: 0, y: 0 };
  panInitialOffset = { x: 0, y: 0 };

  isGraphFullscreen = signal<boolean>(false);
  activeGraphBreadcrumb = signal<string>('$.data');

  customNodePositions = signal<Map<string, { x: number; y: number }>>(new Map());
  draggingNodeId = signal<string | null>(null);
  dragNodeOffset = { x: 0, y: 0 };

  collapsedNodeIds = signal<Set<string>>(new Set());
  collapsedRowChildKeys = signal<Set<string>>(new Set());

  readonly processedGraphData = computed(() => {
    const data = this.result()?.parsedData;
    const rawGraph = this.jsonLensService.buildJsonGraph(data);
    const customPosMap = this.customNodePositions();

    const nodes = rawGraph.nodes.map(node => {
      if (customPosMap.has(node.id)) {
        const custom = customPosMap.get(node.id)!;
        return { ...node, x: custom.x, y: custom.y };
      }
      return node;
    });

    const edges = rawGraph.edges.map(edge => {
      const fromNode = nodes.find(n => n.id === edge.fromNodeId);
      const toNode = nodes.find(n => n.id === edge.toNodeId);
      if (fromNode && toNode) {
        const rowIndex = fromNode.rows.findIndex(r => r.key === edge.fromRowKey);
        const HEADER_HEIGHT = 34;
        const ROW_HEIGHT = 26;

        const x1 = fromNode.x + fromNode.width;
        const y1 = fromNode.y + HEADER_HEIGHT + (rowIndex >= 0 ? rowIndex * ROW_HEIGHT : 0) + (ROW_HEIGHT / 2);
        const x2 = toNode.x;
        const y2 = toNode.y + (HEADER_HEIGHT / 2);

        const c1X = x1 + Math.min((x2 - x1) / 2, 70);
        const c2X = x2 - Math.min((x2 - x1) / 2, 70);
        const pathD = `M ${x1} ${y1} C ${c1X} ${y1}, ${c2X} ${y2}, ${x2} ${y2}`;

        return { ...edge, x1, y1, x2, y2, pathD };
      }
      return edge;
    });

    return { nodes, edges };
  });

  // Calculate hierarchical node visibility
  readonly visibleGraphNodes = computed(() => {
    const { nodes } = this.processedGraphData();
    const collapsedNodes = this.collapsedNodeIds();
    const collapsedRows = this.collapsedRowChildKeys();

    const isAncestorCollapsed = (node: GraphNode): boolean => {
      if (!node.parentId) return false;
      if (collapsedNodes.has(node.parentId)) return true;

      const parentNode = nodes.find(n => n.id === node.parentId);
      if (!parentNode) return false;

      // Check if parent row leading to this child is collapsed
      const row = parentNode.rows.find(r => r.childNodeId === node.id);
      if (row && collapsedRows.has(`${parentNode.id}:${row.key}`)) return true;

      return isAncestorCollapsed(parentNode);
    };

    return nodes.filter(n => !isAncestorCollapsed(n));
  });

  readonly visibleNodesCount = computed(() => this.visibleGraphNodes().length);

  readonly visibleGraphEdges = computed(() => {
    const { edges } = this.processedGraphData();
    const visibleNodes = new Set(this.visibleGraphNodes().map(n => n.id));
    return edges.filter(e => visibleNodes.has(e.fromNodeId) && visibleNodes.has(e.toNodeId));
  });

  readonly graphCanvasDimensions = computed(() => {
    const { nodes } = this.processedGraphData();
    let maxW = 1200;
    let maxH = 800;
    nodes.forEach(n => {
      maxW = Math.max(maxW, n.x + n.width + 160);
      maxH = Math.max(maxH, n.y + n.height + 120);
    });
    return { width: maxW, height: maxH };
  });

  // Mouse Canvas Panning
  startGraphPan(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.graph-node-card') || (event.target as HTMLElement).closest('.graph-floating-controls')) {
      return;
    }
    this.isPanning.set(true);
    this.panStartPos = { x: event.clientX, y: event.clientY };
    this.panInitialOffset = { x: this.graphPanX(), y: this.graphPanY() };
  }

  onGraphPanMove(event: MouseEvent) {
    if (this.isPanning()) {
      const dx = event.clientX - this.panStartPos.x;
      const dy = event.clientY - this.panStartPos.y;
      this.graphPanX.set(this.panInitialOffset.x + dx);
      this.graphPanY.set(this.panInitialOffset.y + dy);
    } else if (this.draggingNodeId()) {
      const nodeId = this.draggingNodeId()!;
      const scale = this.graphZoomLevel();
      const dx = (event.clientX - this.dragNodeOffset.x) / scale;
      const dy = (event.clientY - this.dragNodeOffset.y) / scale;

      const currentMap = new Map(this.customNodePositions());
      const existing = currentMap.get(nodeId) || { x: 0, y: 0 };

      // Find initial calculated pos if not custom yet
      const rawNodes = this.jsonLensService.buildJsonGraph(this.result()?.parsedData).nodes;
      const raw = rawNodes.find(n => n.id === nodeId);
      const initX = existing.x || (raw ? raw.x : 0);
      const initY = existing.y || (raw ? raw.y : 0);

      currentMap.set(nodeId, { x: initX + dx, y: initY + dy });
      this.customNodePositions.set(currentMap);

      this.dragNodeOffset = { x: event.clientX, y: event.clientY };
    }
  }

  stopGraphPan() {
    this.isPanning.set(false);
    this.draggingNodeId.set(null);
  }

  // Node Dragging
  startNodeDrag(event: MouseEvent, nodeId: string) {
    event.stopPropagation();
    this.draggingNodeId.set(nodeId);
    this.dragNodeOffset = { x: event.clientX, y: event.clientY };
  }

  // Collapsing & Expansion
  isNodeCollapsed(nodeId: string): boolean {
    return this.collapsedNodeIds().has(nodeId);
  }

  toggleNodeCollapse(nodeId: string, event?: Event) {
    if (event) event.stopPropagation();
    const set = new Set(this.collapsedNodeIds());
    if (set.has(nodeId)) {
      set.delete(nodeId);
    } else {
      set.add(nodeId);
    }
    this.collapsedNodeIds.set(set);
  }

  isRowChildCollapsed(nodeId: string, rowKey: string): boolean {
    return this.collapsedRowChildKeys().has(`${nodeId}:${rowKey}`);
  }

  toggleRowChildCollapse(nodeId: string, rowKey: string, event?: Event) {
    if (event) event.stopPropagation();
    const set = new Set(this.collapsedRowChildKeys());
    const key = `${nodeId}:${rowKey}`;
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    this.collapsedRowChildKeys.set(set);
  }

  isAllGraphNodesCollapsed = computed(() => {
    return this.collapsedNodeIds().size > 0 || this.collapsedRowChildKeys().size > 0;
  });

  toggleExpandCollapseAllNodes() {
    if (this.isAllGraphNodesCollapsed()) {
      this.collapsedNodeIds.set(new Set());
      this.collapsedRowChildKeys.set(new Set());
    } else {
      const { nodes } = this.processedGraphData();
      const allNodeIds = new Set(nodes.slice(1).map(n => n.id));
      this.collapsedNodeIds.set(allNodeIds);
    }
  }

  toggleGraphFullscreen() {
    this.isGraphFullscreen.update(v => !v);
  }

  centerFocusGraph() {
    this.graphPanX.set(0);
    this.graphPanY.set(0);
    this.graphZoomLevel.set(1.0);
    this.customNodePositions.set(new Map());
  }

  graphZoomIn() {
    this.graphZoomLevel.update(z => Math.min(2.5, z + 0.15));
  }

  graphZoomOut() {
    this.graphZoomLevel.update(z => Math.max(0.4, z - 0.15));
  }

  graphResetZoom() {
    this.centerFocusGraph();
  }

  formatGraphPrimitive(val: any): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') {
      return val.length > 28 ? `"${val.slice(0, 25)}..."` : `"${val}"`;
    }
    return String(val);
  }

  hoveredJsonPath = signal<string>('$');

  onInspectorCursorMove(_event: Event) {
    const textarea = this.inspectorTextarea?.nativeElement;
    if (!textarea) return;

    const caretPos = textarea.selectionStart || 0;
    const textBeforeCaret = textarea.value.substring(0, caretPos);
    const lineNum = textBeforeCaret.split('\n').length;

    const visibleLines = this.formattedLines();
    if (lineNum >= 1 && lineNum <= visibleLines.length) {
      const lineItem = visibleLines[lineNum - 1];
      const actualLine = lineItem ? lineItem.num : lineNum;
      const path = this.calculateJsonPathForLine(actualLine);
      if (path) {
        this.hoveredJsonPath.set(path);
      }
    }
  }

  onInspectorMouseMove(event: MouseEvent) {
    const textarea = this.inspectorTextarea?.nativeElement;
    if (textarea) {
      const rect = textarea.getBoundingClientRect();
      const clickY = event.clientY - rect.top + textarea.scrollTop;
      const paddingTop = 12;
      const lineHeight = 20;

      const relativeY = clickY - paddingTop;
      if (relativeY >= 0) {
        const visibleLineIndex = Math.floor(relativeY / lineHeight);
        const visibleLines = this.formattedLines();
        if (visibleLineIndex >= 0 && visibleLineIndex < visibleLines.length) {
          const lineItem = visibleLines[visibleLineIndex];
          if (lineItem) {
            if (lineItem.isFolded || lineItem.isFoldable) {
              textarea.style.cursor = 'pointer';
              return;
            }
          }
        }
      }
      textarea.style.cursor = 'text';
      return;
    }

    const target = event.target as HTMLElement;
    if (!target) return;

    const lineMarker = target.closest ? target.closest('.line-marker') : null;
    if (!lineMarker) return;

    const lineNumStr = lineMarker.getAttribute('data-line');
    if (!lineNumStr) return;

    const lineNum = parseInt(lineNumStr, 10);
    const path = this.calculateJsonPathForLine(lineNum);
    if (path) {
      this.hoveredJsonPath.set(path);
    }
  }

  private calculateJsonPathForLine(lineNum: number): string {
    const raw = this.effectiveDisplayOutput();
    if (!raw) return '$';

    const lines = raw.split('\n');
    if (lineNum < 1 || lineNum > lines.length) return '$';

    const fmt = this.activeFormat();

    // ── XML Format XPath / Path Calculation ──────────────────────────────────
    if (fmt === 'xml') {
      const xmlStack: string[] = [];
      for (let i = 0; i < lineNum; i++) {
        const line = lines[i].trim();
        // Match closing tag </tag>
        const closeMatch = line.match(/^<\/([a-zA-Z0-9_-]+)>/);
        if (closeMatch) {
          if (xmlStack.length > 0 && xmlStack[xmlStack.length - 1] === closeMatch[1]) {
            xmlStack.pop();
          }
          continue;
        }

        // Match opening tag <tag attr="val"> or <tag> (ignoring self-closing <tag/>)
        const openMatch = line.match(/^<([a-zA-Z0-9_-]+)(?:\s+[^>]*?)?(?:\/?>)/);
        if (openMatch) {
          const tagName = openMatch[1];
          const isSelfClosing = line.endsWith('/>') || line.includes(`</${tagName}>`);
          if (!isSelfClosing) {
            xmlStack.push(tagName);
          } else if (i === lineNum - 1) {
            xmlStack.push(tagName);
          }
        }
      }
      return xmlStack.length > 0 ? `/${xmlStack.join('/')}` : '/';
    }

    // ── CSV Format (Row & Column Path) ──────────────────────────────────────
    if (fmt === 'csv') {
      if (lineNum === 1) return '$.header';
      const headerLine = lines[0] || '';
      const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const rowIndex = lineNum - 2;
      return `$[${rowIndex}]`;
    }

    // ── TOML Format ([section] + key = val) ─────────────────────────────────
    if (fmt === 'toml') {
      let currentSection = '';
      let targetKey = '';
      for (let i = 0; i < lineNum; i++) {
        const line = lines[i].trim();
        const sectionMatch = line.match(/^\[([a-zA-Z0-9_.]+)\]/);
        if (sectionMatch) {
          currentSection = sectionMatch[1];
        } else if (i === lineNum - 1) {
          const keyMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=/);
          if (keyMatch) {
            targetKey = keyMatch[1];
          }
        }
      }
      if (currentSection && targetKey) return `$.${currentSection}.${targetKey}`;
      if (currentSection) return `$.${currentSection}`;
      if (targetKey) return `$.${targetKey}`;
      return '$';
    }

    // ── JSON & YAML Format (Hierarchical Key Indentation Stack) ─────────────
    const pathStack: { key: string; indent: number; isArray: boolean }[] = [];
    const targetLineContent = lines[lineNum - 1];
    const targetIndent = (targetLineContent.match(/^\s*/) || [''])[0].length;

    for (let i = 0; i < lineNum; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

      const indent = (line.match(/^\s*/) || [''])[0].length;

      // Pop items that have greater or equal indent
      while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indent && indent <= targetIndent) {
        if (i === lineNum - 1) break;
        pathStack.pop();
      }

      // Check JSON key pattern: "key": or YAML key pattern: key:
      const jsonKeyMatch = trimmed.match(/^"([^"]+)"\s*:/);
      const yamlKeyMatch = trimmed.match(/^([a-zA-Z0-9_$-]+)\s*:/);
      const yamlArrayItemMatch = trimmed.match(/^-\s+([a-zA-Z0-9_$-]+)\s*:/);

      if (jsonKeyMatch) {
        const key = jsonKeyMatch[1];
        const isArray = trimmed.endsWith('[');
        pathStack.push({ key, indent, isArray });
      } else if (yamlArrayItemMatch) {
        const key = yamlArrayItemMatch[1];
        pathStack.push({ key, indent, isArray: false });
      } else if (yamlKeyMatch) {
        const key = yamlKeyMatch[1];
        pathStack.push({ key, indent, isArray: false });
      }
    }

    if (pathStack.length === 0) return '$';
    let path = '$';
    for (const seg of pathStack) {
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(seg.key)) {
        path += `.${seg.key}`;
      } else {
        path += `['${seg.key}']`;
      }
    }
    return path;
  }

  readonly highlightedOutput = computed(() => {
    const raw = this.formattedOutputText();
    let query = (this.searchScope() === 'both' || this.searchScope() === 'inspector') ? (this.searchQuery() || '') : '';
    
    // If JSONPath query is active and produced string/number results, highlight them
    const jpExpr = this.jsonPathExpr().trim();
    if (jpExpr && !query) {
      const jpRes = this.jsonPathResult();
      if (!jpRes.error && jpRes.results.length > 0) {
        // Pick string or primitive values from results to highlight
        const primitives = jpRes.results
          .filter(r => r !== null && typeof r !== 'object')
          .map(r => String(r))
          .filter(s => s.length > 0);
        if (primitives.length > 0) {
          query = primitives[0];
        }
      }
    }

    const res = this.result();
    const err = (res && !res.success && res.errorLine) ? { line: res.errorLine, column: res.errorColumn || 1, message: res.errorExplanation || res.error || 'Syntax error' } : null;
    const isFilter = !!this.activeFilterCondition();
    return this.jsonLensService.highlightSyntax(raw, this.activeFormat(), query, err, isFilter);
  });

  readonly highlightedCodeGen = computed(() => {
    const code = this.generatedCode();
    return this.jsonLensService.highlightSyntax(code, this.selectedLang());
  });
}
