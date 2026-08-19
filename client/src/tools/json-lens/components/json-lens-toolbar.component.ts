import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Wand2, ArrowLeftRight, CheckCheck, Copy, Download, RotateCcw, FileUp, History, MoreHorizontal, FileCode, RefreshCw } from 'lucide-angular';

@Component({
  selector: 'app-json-lens-toolbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <header class="app-shell-nav">
      <div class="brand-breadcrumb">
        <span class="brand-root">Acklet</span>
        <span class="breadcrumb-separator">/</span>
        <span class="tool-name">JSONLens</span>
      </div>

      <!-- Main Action Bar with Icon-First Pattern -->
      <div class="main-action-bar">
        <!-- Popular Action 1: Format (Icon + Text) -->
        <button class="action-btn btn-primary" (click)="formatClick.emit()" title="Format JSON Payload (Ctrl+F)">
          <lucide-icon [img]="CheckCheckIcon" class="icon-sm"></lucide-icon>
          Format
        </button>

        <!-- Popular Action 2: Minify (Icon + Text) -->
        <button class="action-btn btn-secondary" (click)="minifyClick.emit()" title="Minify JSON Payload">
          <lucide-icon [img]="ArrowLeftRightIcon" class="icon-sm"></lucide-icon>
          Minify
        </button>

        <!-- Popular Action 3: Auto-Fix (Icon-only if repairedJson exists) -->
        @if (hasRepairedJson()) {
          <button class="action-btn btn-fix icon-only-btn" (click)="fixClick.emit()" title="Smart Auto-Fix Syntax Error">
            <lucide-icon [img]="WandIcon" class="icon-sm"></lucide-icon>
            <span class="tooltip">Smart Fix Syntax</span>
          </button>
        }

        <span class="action-divider"></span>

        <!-- Popular Action 4: Copy (Icon-Only with Tooltip) -->
        <button class="action-btn btn-utility icon-only-btn" (click)="copyClick.emit()" [title]="copied() ? 'Copied to Clipboard!' : 'Copy Formatted Output'">
          <lucide-icon [img]="CopyIcon" class="icon-sm"></lucide-icon>
          <span class="tooltip">{{ copied() ? 'Copied!' : 'Copy' }}</span>
        </button>

        <!-- Popular Action 5: Download (Icon-Only with Tooltip) -->
        <button class="action-btn btn-utility icon-only-btn" (click)="downloadClick.emit()" title="Download Formatted JSON File">
          <lucide-icon [img]="DownloadIcon" class="icon-sm"></lucide-icon>
          <span class="tooltip">Download JSON</span>
        </button>

        <!-- Popular Action 6: Clear (Icon-Only with Tooltip) -->
        <button class="action-btn btn-utility icon-only-btn" (click)="clearClick.emit()" title="Clear Workspace">
          <lucide-icon [img]="ClearIcon" class="icon-sm"></lucide-icon>
          <span class="tooltip">Clear</span>
        </button>

        <span class="action-divider"></span>

        <!-- Convert Dropdown Action -->
        <div class="more-menu-wrapper">
          <button class="action-btn btn-utility" (click)="showConvertMenu.set(!showConvertMenu())" title="Convert JSON format">
            <lucide-icon [img]="ConvertIcon" class="icon-sm"></lucide-icon>
            Convert
          </button>
          @if (showConvertMenu()) {
            <div class="more-dropdown-menu">
              <button (click)="convertClick.emit('yaml'); showConvertMenu.set(false)">JSON → YAML</button>
              <button (click)="convertClick.emit('xml'); showConvertMenu.set(false)">JSON → XML</button>
              <button (click)="convertClick.emit('csv'); showConvertMenu.set(false)">JSON → CSV</button>
            </div>
          }
        </div>

        <!-- More Menu Dropdown -->
        <div class="more-menu-wrapper">
          <button class="icon-nav-btn icon-only-btn" (click)="toggleMore.emit()" title="More Options">
            <lucide-icon [img]="MoreIcon" class="icon-sm"></lucide-icon>
            <span class="tooltip">More Options</span>
          </button>
          @if (showMoreMenu()) {
            <div class="more-dropdown-menu">
              <button (click)="toggleWordWrap.emit()">{{ wordWrap() ? '✓ Word Wrap' : 'Word Wrap' }}</button>
              <button (click)="toggleSortKeys.emit()">{{ sortKeys() ? '✓ Sorted Keys' : 'Sort Keys' }}</button>
            </div>
          }
        </div>
      </div>

      <div class="header-right-actions">
        <!-- History Action (Icon-Only with Tooltip) -->
        <button class="icon-nav-btn icon-only-btn" (click)="historyClick.emit()" title="View Payload History">
          <lucide-icon [img]="HistoryIcon" class="icon-sm"></lucide-icon>
          <span class="tooltip">History</span>
        </button>

        <!-- Upload Action (Icon-Only with Tooltip) -->
        <label class="icon-nav-btn icon-only-btn" title="Upload JSON file">
          <lucide-icon [img]="UploadIcon" class="icon-sm"></lucide-icon>
          <span class="tooltip">Upload File</span>
          <input type="file" accept=".json,.txt" (change)="uploadChange.emit($event)" hidden />
        </label>
      </div>
    </header>
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensToolbarComponent {
  copied = input<boolean>(false);
  hasRepairedJson = input<boolean>(false);
  showMoreMenu = input<boolean>(false);
  wordWrap = input<boolean>(true);
  sortKeys = input<boolean>(false);

  showConvertMenu = signal<boolean>(false);

  formatClick = output<void>();
  minifyClick = output<void>();
  fixClick = output<void>();
  copyClick = output<void>();
  downloadClick = output<void>();
  clearClick = output<void>();
  convertClick = output<'yaml' | 'xml' | 'csv'>();
  toggleMore = output<void>();
  toggleWordWrap = output<void>();
  toggleSortKeys = output<void>();
  historyClick = output<void>();
  uploadChange = output<Event>();

  readonly CheckCheckIcon = CheckCheck;
  readonly ArrowLeftRightIcon = ArrowLeftRight;
  readonly WandIcon = Wand2;
  readonly CopyIcon = Copy;
  readonly DownloadIcon = Download;
  readonly ClearIcon = RotateCcw;
  readonly UploadIcon = FileUp;
  readonly HistoryIcon = History;
  readonly MoreIcon = MoreHorizontal;
  readonly ConvertIcon = RefreshCw;
}
