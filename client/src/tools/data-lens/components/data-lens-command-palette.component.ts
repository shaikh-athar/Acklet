import { Component, ChangeDetectionStrategy, input, output, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../app/shared/components/icon/icon';

export interface CommandItem {
  id: string;
  label: string;
  category: 'Actions' | 'View Modes' | 'Code Gen' | 'Transform' | 'Workspace';
  icon: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-json-lens-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    @if (isOpen()) {
      <div class="command-palette-overlay" (click)="closePalette.emit()">
        <div class="command-palette-modal" (click)="$event.stopPropagation()">
          <div class="palette-search-bar">
            <app-icon name="search" class="icon-sm search-icon"></app-icon>
            <input
              #searchInput
              type="text"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              (keydown)="onKeyDown($event)"
              placeholder="Type a command or search (Cmd/Ctrl + K)..."
              spellcheck="false"
            />
            <span class="shortcut-hint">Esc to close</span>
          </div>

          <div class="palette-results-list">
            @for (cmd of filteredCommands(); track cmd.id; let idx = $index) {
              <div
                class="command-item"
                [class.selected]="selectedIndex() === idx"
                (click)="executeCommand(cmd)"
                (mouseenter)="selectedIndex.set(idx)"
              >
                <app-icon [name]="cmd.icon" class="icon-sm cmd-icon"></app-icon>
                <div class="cmd-info">
                  <span class="cmd-label">{{ cmd.label }}</span>
                  <span class="cmd-category">{{ cmd.category }}</span>
                </div>
                @if (cmd.shortcut) {
                  <span class="cmd-shortcut-badge">{{ cmd.shortcut }}</span>
                }
              </div>
            } @empty {
              <div class="empty-palette">No matching commands found.</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensCommandPaletteComponent implements AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  isOpen = input<boolean>(false);
  searchQuery = signal<string>('');
  selectedIndex = signal<number>(0);

  closePalette = output<void>();

  // Outputs for commands
  formatClick = output<void>();
  minifyClick = output<void>();
  validateClick = output<void>();
  fixClick = output<void>();
  expandAllClick = output<void>();
  collapseAllClick = output<void>();
  copyClick = output<void>();
  downloadClick = output<void>();
  openFileClick = output<void>();
  switchEditorClick = output<void>();
  switchDiffClick = output<void>();
  toggleTreeClick = output<void>();
  toggleTableClick = output<void>();
  showStatsClick = output<void>();
  showGraphClick = output<void>();
  generateCodeClick = output<string>();
  convertFormatClick = output<string>();
  clearClick = output<void>();
  sortKeysClick = output<void>();
  escapeClick = output<void>();
  stringifyClick = output<void>();
  toggleThemeClick = output<void>();
  openSettingsClick = output<void>();
  toggleHistoryClick = output<void>();
  toggleFullscreenClick = output<void>();
  openShareClick = output<void>();
  openSearchClick = output<void>();
  openFilterClick = output<void>();
  autoDetectClick = output<void>();
  transformClick = output<string>();

  commandsList: CommandItem[] = [
    // --- Actions ---
    { id: 'format', label: 'Format Document', category: 'Actions', icon: 'file-code', shortcut: 'Cmd/Ctrl + Enter', action: () => this.formatClick.emit() },
    { id: 'minify', label: 'Minify Payload', category: 'Actions', icon: 'minimize-2', shortcut: 'Cmd/Ctrl + Shift + M', action: () => this.minifyClick.emit() },
    { id: 'validate', label: 'Validate Syntax & Schema', category: 'Actions', icon: 'check', shortcut: 'Cmd/Ctrl + Shift + V', action: () => this.validateClick.emit() },
    { id: 'fix', label: 'Smart Fix Syntax Errors', category: 'Actions', icon: 'wand-2', shortcut: 'Cmd/Ctrl + Shift + X', action: () => this.fixClick.emit() },
    { id: 'copy', label: 'Copy Output to Clipboard', category: 'Actions', icon: 'copy', shortcut: 'Cmd/Ctrl + Shift + C', action: () => this.copyClick.emit() },
    { id: 'download', label: 'Download Payload File', category: 'Actions', icon: 'download', shortcut: 'Cmd/Ctrl + S', action: () => this.downloadClick.emit() },
    { id: 'auto_detect', label: 'Auto-Detect Payload Format', category: 'Actions', icon: 'sparkles', shortcut: 'Cmd/Ctrl + Shift + A', action: () => this.autoDetectClick.emit() },

    // --- View Modes ---
    { id: 'view_editor', label: 'Switch to Format Mode', category: 'View Modes', icon: 'file-code', shortcut: 'Cmd/Ctrl + 1', action: () => this.switchEditorClick.emit() },
    { id: 'view_diff', label: 'Switch to Compare Mode', category: 'View Modes', icon: 'git-diff', shortcut: 'Cmd/Ctrl + D', action: () => this.switchDiffClick.emit() },
    { id: 'toggle_tree', label: 'Switch to Tree View', category: 'View Modes', icon: 'folder-tree', shortcut: 'Cmd/Ctrl + 2', action: () => this.toggleTreeClick.emit() },
    { id: 'toggle_table', label: 'Switch to Table View', category: 'View Modes', icon: 'table', shortcut: 'Cmd/Ctrl + 3', action: () => this.toggleTableClick.emit() },
    { id: 'show_graph', label: 'Switch to Graph Visualizer', category: 'View Modes', icon: 'network', shortcut: 'Cmd/Ctrl + 4', action: () => this.showGraphClick.emit() },
    { id: 'show_stats', label: 'Switch to Payload Statistics', category: 'View Modes', icon: 'bar-chart-2', shortcut: 'Cmd/Ctrl + 5', action: () => this.showStatsClick.emit() },
    { id: 'show_codegen', label: 'Switch to Code Generator', category: 'View Modes', icon: 'terminal', shortcut: 'Cmd/Ctrl + 6', action: () => this.generateCodeClick.emit('typescript') },
    { id: 'expand_tree', label: 'Expand All Tree Nodes', category: 'View Modes', icon: 'maximize-2', shortcut: 'Cmd/Ctrl + Shift + E', action: () => this.expandAllClick.emit() },
    { id: 'collapse_tree', label: 'Collapse All Tree Nodes', category: 'View Modes', icon: 'minimize-2', shortcut: 'Cmd/Ctrl + Shift + W', action: () => this.collapseAllClick.emit() },

    // --- Code Gen ---
    { id: 'gen_ts', label: 'Generate TypeScript Interfaces', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('typescript') },
    { id: 'gen_py', label: 'Generate Python Dataclass', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('python') },
    { id: 'gen_go', label: 'Generate Go Struct', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('go') },
    { id: 'gen_rust', label: 'Generate Rust Serde Struct', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('rust') },
    { id: 'gen_kotlin', label: 'Generate Kotlin Data Class', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('kotlin') },
    { id: 'gen_swift', label: 'Generate Swift Codable Struct', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('swift') },
    { id: 'gen_cpp', label: 'Generate C++ Struct', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('cpp') },
    { id: 'gen_csharp', label: 'Generate C# Class', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('csharp') },
    { id: 'gen_java', label: 'Generate Java Class Model', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('java') },
    { id: 'gen_schema', label: 'Generate JSON Schema Draft-07', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('schema') },
    { id: 'gen_php', label: 'Generate PHP Class', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('php') },
    { id: 'gen_dart', label: 'Generate Dart Class Model', category: 'Code Gen', icon: 'terminal', action: () => this.generateCodeClick.emit('dart') },

    // --- Transform ---
    { id: 'sort_keys', label: 'Sort Keys Alphabetically', category: 'Transform', icon: 'arrow-up-down', shortcut: 'Cmd/Ctrl + Shift + S', action: () => this.sortKeysClick.emit() },
    { id: 'toggle_escape', label: 'Escape / Unescape JSON String', category: 'Transform', icon: 'arrow-right-from-line', shortcut: 'Cmd/Ctrl + Shift + U', action: () => this.escapeClick.emit() },
    { id: 'stringify', label: 'Stringify JSON Payload', category: 'Transform', icon: 'repeat', shortcut: 'Cmd/Ctrl + Shift + Q', action: () => this.stringifyClick.emit() },
    { id: 'convert_json', label: 'Convert to JSON', category: 'Transform', icon: 'file-code', action: () => this.convertFormatClick.emit('json') },
    { id: 'convert_yaml', label: 'Convert to YAML', category: 'Transform', icon: 'file-code', action: () => this.convertFormatClick.emit('yaml') },
    { id: 'convert_xml', label: 'Convert to XML', category: 'Transform', icon: 'file-code', action: () => this.convertFormatClick.emit('xml') },
    { id: 'convert_toml', label: 'Convert to TOML', category: 'Transform', icon: 'file-code', action: () => this.convertFormatClick.emit('toml') },
    { id: 'convert_csv', label: 'Convert to CSV Table', category: 'Transform', icon: 'table', action: () => this.convertFormatClick.emit('csv') },
    { id: 'flatten', label: 'Flatten Nested Object', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('flatten') },
    { id: 'unflatten', label: 'Unflatten Dot-Notation Object', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('unflatten') },
    { id: 'remove_nulls', label: 'Strip Null Properties', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('removeNulls') },
    { id: 'remove_empties', label: 'Strip Empty Strings & Arrays', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('removeEmpties') },
    { id: 'to_camel', label: 'Convert Keys to camelCase', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('toCamelCase') },
    { id: 'to_snake', label: 'Convert Keys to snake_case', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('toSnakeCase') },
    { id: 'to_pascal', label: 'Convert Keys to PascalCase', category: 'Transform', icon: 'sliders', action: () => this.transformClick.emit('toPascalCase') },

    // --- Workspace ---
    { id: 'open_file', label: 'Import / Open Local File', category: 'Workspace', icon: 'upload', shortcut: 'Cmd/Ctrl + O', action: () => this.openFileClick.emit() },
    { id: 'search', label: 'Live Find / Search in Payload', category: 'Workspace', icon: 'search', shortcut: 'Cmd/Ctrl + F', action: () => this.openSearchClick.emit() },
    { id: 'filter', label: 'Apply Conditional Query Filter', category: 'Workspace', icon: 'filter', shortcut: 'Cmd/Ctrl + Shift + F', action: () => this.openFilterClick.emit() },
    { id: 'history', label: 'Open Local Version History', category: 'Workspace', icon: 'clock', shortcut: 'Cmd/Ctrl + H', action: () => this.toggleHistoryClick.emit() },
    { id: 'share', label: 'Share Payload Snapshot', category: 'Workspace', icon: 'share-2', shortcut: 'Cmd/Ctrl + Shift + P', action: () => this.openShareClick.emit() },
    { id: 'toggle_fullscreen', label: 'Expand Layout / Fullscreen', category: 'Workspace', icon: 'maximize-2', shortcut: 'F11', action: () => this.toggleFullscreenClick.emit() },
    { id: 'toggle_theme', label: 'Toggle Dark / Light Theme', category: 'Workspace', icon: 'sun', shortcut: 'Cmd/Ctrl + Shift + T', action: () => this.toggleThemeClick.emit() },
    { id: 'open_settings', label: 'Open Preferences & Settings', category: 'Workspace', icon: 'settings', shortcut: 'Cmd/Ctrl + ,', action: () => this.openSettingsClick.emit() },
    { id: 'clear', label: 'Clear Workspace Content', category: 'Workspace', icon: 'trash-2', shortcut: 'Cmd/Ctrl + Shift + Backspace', action: () => this.clearClick.emit() }
  ];

  filteredCommands = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.commandsList;
    return this.commandsList.filter(cmd =>
      cmd.label.toLowerCase().includes(query) || cmd.category.toLowerCase().includes(query)
    );
  });

  ngAfterViewInit() {
    if (this.searchInput) {
      setTimeout(() => this.searchInput.nativeElement.focus(), 50);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    const list = this.filteredCommands();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(i => (i + 1) % list.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(i => (i - 1 + list.length) % list.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = list[this.selectedIndex()];
      if (selected) {
        this.executeCommand(selected);
      }
    } else if (event.key === 'Escape') {
      this.closePalette.emit();
    }
  }

  executeCommand(cmd: CommandItem) {
    cmd.action();
    this.closePalette.emit();
  }
}

