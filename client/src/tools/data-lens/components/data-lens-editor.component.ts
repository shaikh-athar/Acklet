import { Component, ChangeDetectionStrategy, input, output, ElementRef, ViewChild, signal, computed, inject, HostListener, Input, AfterViewInit, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonLensResult, DataLensService } from '../services/data-lens.service';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div
      class="panel input-panel"
      [class.drag-active-neon]="isDragging() || isWorkspaceDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <!-- Dedicated Input Sub-Navbar Control Bar -->
      <div class="panel-header">
        <div class="panel-header-left">
          <app-icon name="file-input" class="icon-xs text-emerald-400"></app-icon>
          <span class="panel-label">INPUT</span>
          <span class="panel-sublabel">{{ activeFormat().toUpperCase() }}</span>
        </div>

        <div class="panel-header-center">
          <div class="status-indicator">
            @if (isProcessing()) {
              <span class="status-neutral-badge animate-pulse">Processing...</span>
            } @else if (result(); as res) {
              @if (res.extractedFromFormat) {
                <span class="status-extracted-badge" data-tooltip="JSON payload extracted 100% locally in browser from developer format">
                  <app-icon name="sparkles" class="icon-xs"></app-icon>
                  <span>Extracted from {{ res.extractedFromFormat }}</span>
                </span>
              } @else if (res.success) {
                <span class="status-valid-badge">✓ Valid {{ activeFormatLabel() }}</span>
              } @else {
                <span class="status-invalid-badge">× Invalid {{ activeFormatLabel() }}</span>
              }
            } @else {
              <span class="status-neutral-badge">Auto Validate ●</span>
            }
          </div>
        </div>

        <div class="panel-header-right">
          <button class="panel-btn icon-only-btn" (click)="undoClick.emit()" [disabled]="!canUndo()" data-tooltip="Undo (Cmd+Z)">
            <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
          </button>
          <button class="panel-btn icon-only-btn" (click)="redoClick.emit()" [disabled]="!canRedo()" data-tooltip="Redo (Cmd+Shift+Z)">
            <app-icon name="rotate-cw" class="icon-xs"></app-icon>
          </button>
          <label class="panel-btn cursor-pointer" data-tooltip="Import JSON or TXT file from computer">
            <app-icon name="upload" class="icon-xs"></app-icon>
            <span class="btn-text">Import</span>
            <input #fileInput type="file" accept=".json,.txt" (change)="onFileSelected($event)" hidden />
          </label>
          <button class="panel-btn" (click)="clearClick.emit()" data-tooltip="Clear Input">
            <app-icon name="trash-2" class="icon-xs"></app-icon>
            <span class="btn-text">Clear</span>
          </button>
        </div>
      </div>

      <!-- Active Filter Chip Banner -->
      @if (activeFilterCondition() && activeFilterCondition()!.query.trim()) {
        <div class="panel-active-filter-bar">
          <div class="active-filter-chip">
            <app-icon name="filter" class="icon-xs text-emerald-400"></app-icon>
            <span class="chip-operator">{{ activeFilterCondition()!.operator | uppercase }}</span>
            <span class="chip-query">"{{ activeFilterCondition()!.query }}"</span>
            <span class="chip-scope">({{ activeFilterCondition()!.scope }})</span>
            <span class="chip-matches">{{ localFilterMatchesCount() }} matches</span>
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
              <app-icon name="filter" class="icon-xs text-emerald-400"></app-icon>
              <span>Apply Input Filter Condition</span>
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

      <!-- Floating Pulsating Neon Drop Pill Banner -->
      @if (isDragging() || isWorkspaceDragging()) {
        <div class="input-panel-neon-banner">
          <app-icon name="upload-cloud" class="icon-xs text-emerald-400 animate-pulse"></app-icon>
          <span>Drop here</span>
        </div>
      }

      <!-- Monaco-Style Code Window with Line Numbers & VSCode Syntax Highlighting -->
      <div class="code-editor-container">
        <div class="line-numbers-gutter" #gutterLayer>
          @for (line of editorLines(); track line.num) {
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

        @if (!rawInput() || rawInput().trim() === '') {
          <div class="empty-watermark-container">
            <div class="empty-watermark-icon-box">
              <app-icon name="upload" class="empty-watermark-icon"></app-icon>
            </div>
            <div class="empty-watermark-title">Start with {{ activeFormatLabel() }}</div>
            <div class="empty-watermark-subtitle">Paste or import {{ activeFormatLabel() }} content to format, validate & inspect</div>
          </div>
        }

        <div class="editor-input-wrapper" (click)="onCodeClick($event)">
          <pre #highlightLayer class="code-editor-highlight" aria-hidden="true" [class.wrap]="wordWrap()" [innerHTML]="highlightedInput()"></pre>
          <textarea
            #editorTextarea
            class="code-editor-textarea"
            [class.wrap]="wordWrap()"
            [value]="displayInputText()"
            (input)="inputChange.emit($any($event.target).value)"
            (keydown)="onTextareaKeyDown($event)"
            (scroll)="onEditorScroll($event)"
            (mousemove)="onEditorMouseMove($event)"
            [placeholder]="'Paste raw ' + activeFormatLabel() + ' content here...'"
            spellcheck="false"
          ></textarea>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensEditorComponent implements AfterViewChecked {
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('highlightLayer') highlightLayer!: ElementRef<HTMLPreElement>;
  @ViewChild('gutterLayer') gutterLayer!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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

    const isWrap = this.wordWrap();
    const codeLines = highlightEl.querySelectorAll<HTMLElement>('.line-marker');
    const gutterRows = gutterEl.querySelectorAll<HTMLElement>('.gutter-line-row');

    const count = Math.min(codeLines.length, gutterRows.length);
    for (let i = 0; i < count; i++) {
      const codeLine = codeLines[i];
      const gutterRow = gutterRows[i];
      if (codeLine && gutterRow) {
        if (isWrap) {
          const h = codeLine.getBoundingClientRect().height;
          if (h > 0) {
            gutterRow.style.height = `${h}px`;
          }
        } else {
          gutterRow.style.height = '20px';
        }
      }
    }
  }

  jsonLensService = inject(DataLensService);

  rawInput = input<string>('');
  activeFormat = input<string>('json');

  readonly activeFormatLabel = computed(() => {
    const fmt = this.activeFormat();
    if (fmt === 'yaml') return 'YAML';
    if (fmt === 'xml') return 'XML';
    if (fmt === 'csv') return 'CSV';
    if (fmt === 'toml') return 'TOML';
    if (fmt === 'curl') return 'cURL command';
    return 'JSON or cURL';
  });

  isProcessing = input<boolean>(false);
  wordWrap = input<boolean>(true);
  result = input<JsonLensResult | null>(null);
  errorLine = input<number | null>(null);
  isWorkspaceDragging = input<boolean>(false);

  canUndo = input<boolean>(false);
  canRedo = input<boolean>(false);

  inputChange = output<string>();
  clearClick = output<void>();
  sampleClick = output<'apiResponse' | 'nestedObject' | 'largeArray' | 'config'>();
  fileDropped = output<File>();
  scrollEvent = output<Event>();
  dragEnded = output<void>();
  undoClick = output<void>();
  redoClick = output<void>();

  isDragging = signal<boolean>(false);
  foldedLineSet = signal<Set<number>>(new Set());

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
    this.closeFilterPopover();
  }

  readonly localFilterMatchesCount = computed(() => {
    const cond = this.activeFilterCondition();
    const q = (cond ? cond.query : '').trim().toLowerCase();
    const raw = this.rawInput();
    if (!q || !raw) return 0;
    return raw.toLowerCase().split(q).length - 1;
  });

  readonly foldedState = computed(() => {
    const raw = this.rawInput() || '';
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

  readonly editorLines = computed(() => this.foldedState().visibleLines);
  readonly displayInputText = computed(() => this.foldedState().text);

  onEditorMouseMove(event: MouseEvent) {
    const textarea = this.editorTextarea?.nativeElement;
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();
    const clickY = event.clientY - rect.top + textarea.scrollTop;
    const paddingTop = 12;
    const lineHeight = 20;

    const relativeY = clickY - paddingTop;
    if (relativeY >= 0) {
      const visibleLineIndex = Math.floor(relativeY / lineHeight);
      const visibleLines = this.editorLines();
      if (visibleLineIndex >= 0 && visibleLineIndex < visibleLines.length) {
        const lineItem = visibleLines[visibleLineIndex];
        if (lineItem && (lineItem.isFolded || lineItem.isFoldable)) {
          textarea.style.cursor = 'pointer';
          return;
        }
      }
    }
    textarea.style.cursor = 'text';
  }

  onCodeClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target) {
      const pill = target.closest ? target.closest('.hl-fold-pill') : null;
      if (pill) {
        const lineStr = pill.getAttribute('data-line');
        if (lineStr) {
          this.toggleFoldLine(parseInt(lineStr, 10));
          return;
        }
      }
    }

    const textarea = this.editorTextarea?.nativeElement;
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();
    const clickY = event.clientY - rect.top + textarea.scrollTop;
    const paddingTop = 12;
    const lineHeight = 20;

    const relativeY = clickY - paddingTop;
    if (relativeY >= 0) {
      const visibleLineIndex = Math.floor(relativeY / lineHeight);
      const visibleLines = this.editorLines();
      if (visibleLineIndex >= 0 && visibleLineIndex < visibleLines.length) {
        const lineItem = visibleLines[visibleLineIndex];
        if (lineItem && (lineItem.isFolded || lineItem.isFoldable)) {
          this.toggleFoldLine(lineItem.num);
        }
      }
    }
  }

  searchQuery = input<string>('');
  searchScope = input<'both' | 'input' | 'inspector'>('both');

  onTextareaKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = this.editorTextarea?.nativeElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const tabSpaces = '  ';

      textarea.value = val.substring(0, start) + tabSpaces + val.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + tabSpaces.length;
      this.inputChange.emit(textarea.value);
    }
  }

  readonly highlightedInput = computed(() => {
    const text = this.displayInputText();
    if (!text) return '';
    const query = (this.searchScope() === 'both' || this.searchScope() === 'input') ? this.searchQuery() : '';
    const res = this.result();
    const err = (res && !res.success && res.errorLine) ? { line: res.errorLine, column: res.errorColumn || 1, message: res.errorExplanation || res.error || 'Syntax error' } : null;
    const isFilter = !!this.activeFilterCondition();
    return this.jsonLensService.highlightSyntax(text, this.activeFormat(), query, err, isFilter);
  });

  onEditorScroll(event: Event) {
    const textarea = this.editorTextarea?.nativeElement;
    const highlight = this.highlightLayer?.nativeElement;
    const gutter = this.gutterLayer?.nativeElement;
    if (textarea) {
      if (highlight) {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
      }
      if (gutter) {
        gutter.scrollTop = textarea.scrollTop;
      }
    }
    this.scrollEvent.emit(event);
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

  syncScrollPosition(percentage: number) {
    if (this.editorTextarea) {
      const el = this.editorTextarea.nativeElement;
      el.scrollTop = percentage * (el.scrollHeight - el.clientHeight);
    }
  }

  @HostListener('window:dragend')
  @HostListener('window:mouseleave')
  onWindowDragEnd() {
    this.isDragging.set(false);
    this.dragEnded.emit();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    this.dragEnded.emit();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    this.dragEnded.emit();

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      this.fileDropped.emit(file);
    }
  }

  onFileSelected(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.files && inputEl.files[0]) {
      this.fileDropped.emit(inputEl.files[0]);
    }
  }

  focusAndSelectPos(pos: number) {
    if (this.editorTextarea) {
      const textarea = this.editorTextarea.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(pos, pos + 1);
    }
  }

  triggerFileImport() {
    this.fileInputRef?.nativeElement?.click();
  }
}
