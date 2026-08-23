import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonLensResult, JsonStats } from '../services/json-lens.service';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="panel output-panel">
      <!-- Navbar Row 2: Sub-Header Tab Bar -->
      <div class="panel-header">
        <div class="panel-header-left">
          <span class="panel-label">INSPECTOR</span>
          <div class="inspector-tabs">
            <button [class.active]="inspectorTab() === 'formatted'" (click)="tabChange.emit('formatted')">Formatted</button>
            <button [class.active]="inspectorTab() === 'tree'" (click)="tabChange.emit('tree')">Tree</button>
            <button [class.active]="inspectorTab() === 'table'" (click)="tabChange.emit('table')">Table</button>
            <button [class.active]="inspectorTab() === 'stats'" (click)="tabChange.emit('stats')">Stats</button>
            <button [class.active]="inspectorTab() === 'codegen'" (click)="tabChange.emit('codegen')">Code Gen</button>
          </div>
        </div>

        <div class="panel-header-right">
          @if (inspectorTab() === 'formatted') {
            <button class="panel-btn" (click)="toggleExpandAllFormatted()">
              {{ isFormattedExpanded() ? 'Collapse All' : 'Expand All' }}
            </button>
          }
          @if (inspectorTab() === 'tree') {
            <button class="panel-btn" (click)="expandAllTreeNodes()">Expand All</button>
            <button class="panel-btn" (click)="collapseAllTreeNodes()">Collapse All</button>
          }
          <button class="panel-btn" (click)="copyClick.emit()">{{ copied() ? 'Copied!' : 'Copy' }}</button>
          <button class="panel-btn" (click)="downloadClick.emit()">Download</button>
        </div>
      </div>

      <!-- Search Match Counter Indicator -->
      @if (searchQuery().trim()) {
        <div class="search-match-bar">
          <app-icon name="search" class="icon-xs"></app-icon>
          <span><strong>{{ searchMatchesCount() }} matches</strong> found for "{{ searchQuery() }}"</span>
        </div>
      }

      <!-- Duplicate Keys Warning Alert -->
      @if (result()?.duplicateKeys?.length) {
        <div class="duplicate-key-alert">
          <app-icon name="shield-alert" class="icon-xs"></app-icon>
          <span><strong>⚠ Duplicate Key Detected:</strong> "{{ result()?.duplicateKeys?.join(', ') }}" appears multiple times. One value may overwrite another depending on parser AST.</span>
        </div>
      }

      <!-- Tab 1: Formatted View -->
      @if (inspectorTab() === 'formatted') {
        <div class="inspector-view-container">
          <pre class="code-output"><code>{{ displayOutput() }}</code></pre>
        </div>
      }

      <!-- Tab 2: Interactive Tree View with Search Highlight & Actions -->
      @if (inspectorTab() === 'tree') {
        <div class="inspector-view-container tree-view-container">
          @if (result()?.parsedData; as data) {
            <div class="tree-root">
              <ng-container *ngTemplateOutlet="treeNodeTpl; context: { key: 'root', val: data, path: '$' }"></ng-container>
            </div>
          } @else {
            <div class="empty-tab-state">No valid JSON AST for Tree View.</div>
          }
        </div>
      }

      <!-- Tab 3: Array Table View -->
      @if (inspectorTab() === 'table') {
        <div class="inspector-view-container table-view-container">
          @if (tableData(); as table) {
            @if (table.isTabular) {
              <table class="json-table">
                <thead>
                  <tr>
                    <th>#</th>
                    @for (col of table.columns; track col) {
                      <th>{{ col }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of table.rows; track $index) {
                    <tr>
                      <td class="row-num">{{ $index + 1 }}</td>
                      @for (col of table.columns; track col) {
                        <td>{{ row[col] !== undefined ? row[col] : '—' }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="non-tabular-notice">
                <app-icon name="table" class="icon-lg opacity-40"></app-icon>
                <div class="notice-title">This JSON structure isn't naturally tabular.</div>
                <div class="notice-subtitle">Try Tree view or Formatted view instead.</div>
              </div>
            }
          }
        </div>
      }

      <!-- Tab 4: Detailed Stats Intelligence Dashboard (Section 24 complete) -->
      @if (inspectorTab() === 'stats') {
        @if (result()?.stats; as st) {
          <div class="stats-dashboard">
            <div class="stat-card">
              <div class="stat-value">{{ (st.byteSize / 1024).toFixed(1) }} KB</div>
              <div class="stat-label">Size</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.keyCount }}</div>
              <div class="stat-label">Keys</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.stringCount + st.numberCount + st.booleanCount + st.nullCount }}</div>
              <div class="stat-label">Values</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.maxDepth }}</div>
              <div class="stat-label">Depth</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.arrayCount }}</div>
              <div class="stat-label">Arrays</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.objectCount }}</div>
              <div class="stat-label">Objects</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.stringCount }}</div>
              <div class="stat-label">Strings</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.numberCount }}</div>
              <div class="stat-label">Numbers</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.booleanCount }}</div>
              <div class="stat-label">Booleans</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ st.nullCount }}</div>
              <div class="stat-label">Nulls</div>
            </div>
            <div class="stat-card highlight">
              <div class="stat-value">{{ (st.minifiedSize / 1024).toFixed(1) }} KB</div>
              <div class="stat-label">Minified Size</div>
            </div>
            <div class="stat-card highlight">
              <div class="stat-value">{{ (st.whitespaceOverhead / 1024).toFixed(1) }} KB</div>
              <div class="stat-label">Whitespace Overhead</div>
            </div>
          </div>
        } @else {
          <div class="empty-stats">No valid JSON payload analyzed yet.</div>
        }
      }

      <!-- Tab 5: Code Generator (TypeScript, Python, Go, Java, C#) -->
      @if (inspectorTab() === 'codegen') {
        <div class="inspector-view-container codegen-container">
          <div class="codegen-sub-header">
            <span class="sub-label">Target Language:</span>
            <div class="segmented-control">
              <button [class.active]="selectedLang() === 'typescript'" (click)="selectedLang.set('typescript')">TypeScript</button>
              <button [class.active]="selectedLang() === 'python'" (click)="selectedLang.set('python')">Python</button>
              <button [class.active]="selectedLang() === 'go'" (click)="selectedLang.set('go')">Go Struct</button>
              <button [class.active]="selectedLang() === 'java'" (click)="selectedLang.set('java')">Java POJO</button>
              <button [class.active]="selectedLang() === 'csharp'" (click)="selectedLang.set('csharp')">C# Class</button>
            </div>
          </div>
          <pre class="code-output"><code>{{ generatedCode() }}</code></pre>
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
            <span class="node-arrow">{{ isExpanded(path) ? '▼' : '▶' }}</span>
            <span class="node-key">{{ key }}</span>
            <span class="node-meta">
              {{ isArray(val) ? 'array · ' + val.length + ' items' : 'object · ' + getObjKeys(val).length + ' keys' }}
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
            <span class="node-tree-branch">├─</span>
            <span class="node-key">{{ key }}</span>
            <span class="node-val" [ngClass]="getTypeClass(val)">{{ formatVal(val) }}</span>
            <button class="node-action-btn" (click)="copyNodePath(path)" title="Copy JSONPath">
              <app-icon name="copy" class="icon-xs"></app-icon>
            </button>
          </div>
        }
      </div>
    </ng-template>
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensInspectorComponent {
  inspectorTab = input<'formatted' | 'tree' | 'table' | 'stats' | 'codegen'>('formatted');
  displayOutput = input<string>('');
  searchQuery = input<string>('');
  result = input<JsonLensResult | null>(null);
  stats = input<JsonStats | undefined>(undefined);
  copied = input<boolean>(false);

  selectedLang = signal<'typescript' | 'python' | 'go' | 'java' | 'csharp'>('typescript');
  expandedNodes = signal<{ [path: string]: boolean }>({ '$': true });
  isFormattedExpanded = signal<boolean>(true);
  activeContextMenu = signal<{ x: number; y: number; path: string; val: any } | null>(null);

  tabChange = output<'formatted' | 'tree' | 'table' | 'stats' | 'codegen'>();
  copyClick = output<void>();
  downloadClick = output<void>();

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
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const columns = Object.keys(data[0]);
      return { isTabular: true, columns, rows: data };
    }
    return { isTabular: false, columns: [], rows: [] };
  });

  generatedCode = computed(() => {
    const res = this.result();
    if (!res || !res.parsedData) return '// No valid JSON AST to generate code.';
    const lang = this.selectedLang();
    const data = res.parsedData;

    if (lang === 'typescript') {
      return `export interface RootObject {\n` +
        Object.keys(typeof data === 'object' && data !== null ? data : {}).map(k => `  ${k}: ${typeof data[k]};`).join('\n') +
        `\n}`;
    } else if (lang === 'python') {
      return `from dataclasses import dataclass\nfrom typing import Any\n\n@dataclass\nclass RootObject:\n` +
        Object.keys(typeof data === 'object' && data !== null ? data : {}).map(k => `    ${k}: Any`).join('\n');
    } else if (lang === 'go') {
      return `type RootObject struct {\n` +
        Object.keys(typeof data === 'object' && data !== null ? data : {}).map(k => `\t${k.charAt(0).toUpperCase() + k.slice(1)} interface{} \`json:"${k}"\``).join('\n') +
        `\n}`;
    } else if (lang === 'java') {
      return `public class RootObject {\n` +
        Object.keys(typeof data === 'object' && data !== null ? data : {}).map(k => `    private Object ${k};`).join('\n') +
        `\n}`;
    } else if (lang === 'csharp') {
      return `public class RootObject {\n` +
        Object.keys(typeof data === 'object' && data !== null ? data : {}).map(k => `    public object ${k.charAt(0).toUpperCase() + k.slice(1)} { get; set; }`).join('\n') +
        `\n}`;
    }
    return '';
  });

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
    navigator.clipboard.writeText(typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val));
    this.closeContextMenu();
  }

  copyNodeJson(val: any) {
    navigator.clipboard.writeText(JSON.stringify(val, null, 2));
    this.closeContextMenu();
  }

  copyNodePath(path: string) {
    navigator.clipboard.writeText(path);
    this.closeContextMenu();
  }

  getTypeClass(val: any): string {
    if (val === null) return 'type-null';
    if (typeof val === 'string') return 'type-string';
    if (typeof val === 'number') return 'type-number';
    if (typeof val === 'boolean') return 'type-boolean';
    return '';
  }

  formatVal(val: any): string {
    if (typeof val === 'string') return `"${val}"`;
    return String(val);
  }
}
