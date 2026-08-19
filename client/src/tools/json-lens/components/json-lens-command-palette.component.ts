import { Component, ChangeDetectionStrategy, input, output, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Terminal, CheckCheck, ArrowLeftRight, Wand2, Copy, Download, FileUp, Layers, Table, BarChart2, Code2, RefreshCw, SunMoon, RotateCcw } from 'lucide-angular';

export interface CommandItem {
  id: string;
  label: string;
  category: 'Actions' | 'View Modes' | 'Code Gen' | 'Transform' | 'Workspace';
  icon: any;
  action: () => void;
}

@Component({
  selector: 'app-json-lens-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <div class="command-palette-overlay" (click)="closePalette.emit()">
        <div class="command-palette-modal" (click)="$event.stopPropagation()">
          <div class="palette-search-bar">
            <lucide-icon [img]="SearchIcon" class="icon-sm search-icon"></lucide-icon>
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
                <lucide-icon [img]="cmd.icon" class="icon-sm cmd-icon"></lucide-icon>
                <div class="cmd-info">
                  <span class="cmd-label">{{ cmd.label }}</span>
                  <span class="cmd-category">{{ cmd.category }}</span>
                </div>
              </div>
            } @empty {
              <div class="empty-palette">No matching commands found.</div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../json-lens.component.css'],
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
  toggleTreeClick = output<void>();
  toggleTableClick = output<void>();
  showStatsClick = output<void>();
  generateTsClick = output<void>();
  generatePythonClick = output<void>();
  generateGoClick = output<void>();
  convertYamlClick = output<void>();
  clearClick = output<void>();

  readonly SearchIcon = Search;

  commandsList: CommandItem[] = [
    { id: 'format', label: 'Format JSON', category: 'Actions', icon: CheckCheck, action: () => this.formatClick.emit() },
    { id: 'minify', label: 'Minify JSON', category: 'Actions', icon: ArrowLeftRight, action: () => this.minifyClick.emit() },
    { id: 'validate', label: 'Validate JSON', category: 'Actions', icon: Terminal, action: () => this.validateClick.emit() },
    { id: 'fix', label: 'Fix JSON Syntax', category: 'Actions', icon: Wand2, action: () => this.fixClick.emit() },
    { id: 'expand', label: 'Expand All Nodes', category: 'View Modes', icon: Layers, action: () => this.expandAllClick.emit() },
    { id: 'collapse', label: 'Collapse All Nodes', category: 'View Modes', icon: Layers, action: () => this.collapseAllClick.emit() },
    { id: 'copy', label: 'Copy JSON', category: 'Actions', icon: Copy, action: () => this.copyClick.emit() },
    { id: 'download', label: 'Download JSON', category: 'Actions', icon: Download, action: () => this.downloadClick.emit() },
    { id: 'open_file', label: 'Open File', category: 'Workspace', icon: FileUp, action: () => this.openFileClick.emit() },
    { id: 'toggle_tree', label: 'Toggle Tree View', category: 'View Modes', icon: Layers, action: () => this.toggleTreeClick.emit() },
    { id: 'toggle_table', label: 'Toggle Table View', category: 'View Modes', icon: Table, action: () => this.toggleTableClick.emit() },
    { id: 'show_stats', label: 'Show Statistics', category: 'View Modes', icon: BarChart2, action: () => this.showStatsClick.emit() },
    { id: 'gen_ts', label: 'Generate TypeScript', category: 'Code Gen', icon: Code2, action: () => this.generateTsClick.emit() },
    { id: 'gen_py', label: 'Generate Python', category: 'Code Gen', icon: Code2, action: () => this.generatePythonClick.emit() },
    { id: 'gen_go', label: 'Generate Go Struct', category: 'Code Gen', icon: Code2, action: () => this.generateGoClick.emit() },
    { id: 'convert_yaml', label: 'Convert to YAML', category: 'Transform', icon: RefreshCw, action: () => this.convertYamlClick.emit() },
    { id: 'clear', label: 'Clear Workspace', category: 'Workspace', icon: RotateCcw, action: () => this.clearClick.emit() }
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
