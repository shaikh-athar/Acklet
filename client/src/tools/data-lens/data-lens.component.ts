import { Component, ChangeDetectionStrategy, signal, computed, ViewChild, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataLensService, JsonLensOptions, JsonLensResult, DiffResult } from './services/data-lens.service';
import { DataLensHistoryService, HistoryGroup, HistoryItem } from './services/data-lens-history.service';
import { FormatRegistryService, FormatId, FormatDefinition, FormatCapabilities } from './services/format-registry.service';
import { FormatOperationsService, OperationDefinition } from './services/format-operations.service';

import { IconComponent } from '../../app/shared/components/icon/icon';
import { JsonLensToolbarComponent } from './components/data-lens-toolbar.component';
import { JsonLensErrorPanelComponent } from './components/data-lens-error-panel.component';
import { JsonLensEditorComponent } from './components/data-lens-editor.component';
import { JsonLensInspectorComponent } from './components/data-lens-inspector.component';
import { JsonLensPrivacyModalComponent } from './components/data-lens-privacy-modal.component';
import { JsonLensHistoryDrawerComponent } from './components/data-lens-history-drawer.component';
import { JsonLensCommandPaletteComponent } from './components/data-lens-command-palette.component';
import { JsonLensDragOverlayComponent } from './components/data-lens-drag-overlay.component';
import { JsonLensToastContainerComponent } from './components/data-lens-toast-container.component';
import { JsonLensShareModalComponent } from './components/data-lens-share-modal.component';
import { JsonLensSettingsDrawerComponent, JsonLensSettings } from './components/data-lens-settings-drawer.component';
import { JsonLensSeoFooterComponent } from './components/data-lens-seo-footer.component';
import { JsonLensDiffComponent } from './components/data-lens-diff.component';

import { FeedbackModalComponent } from '../../app/shared/components/feedback-modal/feedback-modal.component';

@Component({
  selector: 'app-json-lens',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    JsonLensToolbarComponent,
    JsonLensErrorPanelComponent,
    JsonLensEditorComponent,
    JsonLensInspectorComponent,
    JsonLensDiffComponent,
    JsonLensPrivacyModalComponent,
    JsonLensHistoryDrawerComponent,
    JsonLensCommandPaletteComponent,
    JsonLensDragOverlayComponent,
    JsonLensToastContainerComponent,
    JsonLensShareModalComponent,
    JsonLensSettingsDrawerComponent,
    JsonLensSeoFooterComponent,
    FeedbackModalComponent
  ],
  templateUrl: './data-lens.component.html',
  styleUrls: ['./data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensComponent implements OnInit {
  @ViewChild(JsonLensEditorComponent) editorComponent!: JsonLensEditorComponent;
  @ViewChild(JsonLensInspectorComponent) inspectorComponent!: JsonLensInspectorComponent;
  @ViewChild('inspectorComp') inspectorComp?: JsonLensInspectorComponent;
  @ViewChild('editorComp') editorComp?: JsonLensEditorComponent;
  @ViewChild(JsonLensToastContainerComponent) toastContainer?: JsonLensToastContainerComponent;
  @ViewChild(JsonLensPrivacyModalComponent) privacyModal!: JsonLensPrivacyModalComponent;

  rawInput = signal<string>('');
  formattedOutput = signal<string>('');
  originalFilename = signal<string>('formatted.json');

  indent = signal<number | string>(2);
  showIndentMenu = signal<boolean>(false);

  getIndentLabel(): string {
    const val = this.indent();
    if (val === '\t') return 'Tabs';
    if (typeof val === 'number') return `${val} ${val === 1 ? 'space' : 'spaces'}`;
    return '2 spaces';
  }

  selectIndent(val: number | string) {
    this.indent.set(val);
    this.showIndentMenu.set(false);
    this.processJson();
  }

  sortKeys = signal<boolean>(false);
  minify = signal<boolean>(false);
  wordWrap = signal<boolean>(true);
  lineNumbers = signal<boolean>(true);
  autoValidate = signal<boolean>(true);
  formatOnPaste = signal<boolean>(true);
  theme = signal<'dark' | 'light' | 'system'>('light');
  enableHistory = signal<boolean>(true);
  syncScroll = signal<boolean>(true);
  isFullscreen = signal<boolean>(false);
  fontSize = signal<number>(13);
  showFontSizeMenu = signal<boolean>(false);

  readonly fontSizes = [
    { size: 11, label: '11px (Compact)' },
    { size: 12, label: '12px (Small)' },
    { size: 13, label: '13px (Default)' },
    { size: 14, label: '14px (Medium)' },
    { size: 15, label: '15px (Large)' },
    { size: 16, label: '16px (Extra Large)' },
    { size: 18, label: '18px (Huge)' }
  ];

  getFontSizeLabel(): string {
    const curr = this.fontSize();
    const match = this.fontSizes.find(f => f.size === curr);
    return match ? `${curr}px` : `${curr}px`;
  }

  selectFontSize(size: number) {
    this.fontSize.set(size);
    this.showFontSizeMenu.set(false);
    try {
      localStorage.setItem('datalens-font-size', size.toString());
      localStorage.setItem('json-lens-font-size', size.toString());
    } catch {}
    this.triggerToast(`⚡ Font size set to ${size}px`);
  }

  getLineHeight(fontSize: number): number {
    return Math.round(fontSize * 1.54);
  }

  toggleFullscreen() {
    const next = !this.isFullscreen();
    this.isFullscreen.set(next);
    if (next) {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      this.triggerToast('⛶ Fullscreen mode active (Press Esc to exit)');
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      this.triggerToast('⛶ Exited fullscreen mode');
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isFullscreen()) {
      event.preventDefault();
      this.toggleFullscreen();
    } else if (event.key === 'F11') {
      event.preventDefault();
      this.toggleFullscreen();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    if (!document.fullscreenElement && this.isFullscreen()) {
      this.isFullscreen.set(false);
    }
  }

  private isSyncingScroll = false;

  onEditorScroll(event: Event) {
    if (!this.syncScroll() || this.isSyncingScroll) return;
    const target = event.target as HTMLElement;
    if (!target) return;
    this.isSyncingScroll = true;
    requestAnimationFrame(() => {
      const maxScroll = target.scrollHeight - target.clientHeight;
      const pct = maxScroll > 0 ? target.scrollTop / maxScroll : 0;
      if (this.inspectorComp) {
        this.inspectorComp.syncScrollPosition(pct);
      }
      requestAnimationFrame(() => {
        this.isSyncingScroll = false;
      });
    });
  }

  onInspectorScroll(event: Event) {
    if (!this.syncScroll() || this.isSyncingScroll) return;
    const target = event.target as HTMLElement;
    if (!target) return;
    this.isSyncingScroll = true;
    requestAnimationFrame(() => {
      const maxScroll = target.scrollHeight - target.clientHeight;
      const pct = maxScroll > 0 ? target.scrollTop / maxScroll : 0;
      if (this.editorComp) {
        this.editorComp.syncScrollPosition(pct);
      }
      requestAnimationFrame(() => {
        this.isSyncingScroll = false;
      });
    });
  }

  toggleTheme() {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }

  leftPanelWidth = signal<number>(50);
  isResizing = signal<boolean>(false);

  filterQuery = signal<string>('');
  searchScope = signal<'both' | 'input' | 'inspector'>('both');
  showSearchScopeMenu = signal<boolean>(false);
  activeSearchIndex = signal<number>(1);

  showSearchInput = signal<boolean>(false);
  isSearchClosing = signal<boolean>(false);
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

  toggleSearchInput() {
    if (this.showSearchInput()) {
      this.closeSearchInput();
    } else {
      this.showSearchInput.set(true);
    }
  }

  closeSearchInput() {
    if (this.isSearchClosing() || !this.showSearchInput()) return;
    this.isSearchClosing.set(true);
    setTimeout(() => {
      this.showSearchInput.set(false);
      this.filterQuery.set('');
      this.isSearchClosing.set(false);
    }, 200);
  }

  toggleFilterPopover() {
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
    this.filterQuery.set(cond.query);
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
    this.filterQuery.set('');
    this.closeFilterPopover();
  }

  onSearchInput(val: string) {
    this.filterQuery.set(val);
    this.activeSearchIndex.set(1);
    this.scrollToActiveMatch(1);
  }

  nextSearchMatch() {
    const total = this.totalSearchMatches();
    if (total === 0) return;
    const next = (this.activeSearchIndex() % total) + 1;
    this.activeSearchIndex.set(next);
    this.scrollToActiveMatch(next);
  }

  prevSearchMatch() {
    const total = this.totalSearchMatches();
    if (total === 0) return;
    const prev = this.activeSearchIndex() === 1 ? total : this.activeSearchIndex() - 1;
    this.activeSearchIndex.set(prev);
    this.scrollToActiveMatch(prev);
  }

  scrollToActiveMatch(index: number) {
    setTimeout(() => {
      const matches = document.querySelectorAll('mark.search-highlight-match');
      matches.forEach((el, idx) => {
        if (idx === index - 1) {
          el.classList.add('active-match');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          el.classList.remove('active-match');
        }
      });
    }, 40);
  }

  toggleSearchScopeMenu(event: MouseEvent) {
    event.stopPropagation();
    this.showSearchScopeMenu.set(!this.showSearchScopeMenu());
  }

  setSearchScope(scope: 'both' | 'input' | 'inspector') {
    this.searchScope.set(scope);
    this.showSearchScopeMenu.set(false);
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.showSearchScopeMenu()) {
      this.showSearchScopeMenu.set(false);
    }
  }

  readonly totalSearchMatches = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    if (!q) return 0;
    const scope = this.searchScope();
    let count = 0;

    if (scope === 'both' || scope === 'input') {
      const input = (this.rawInput() || '').toLowerCase();
      let pos = 0;
      while ((pos = input.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
    }

    if (scope === 'both' || scope === 'inspector') {
      const output = (this.displayOutput() || '').toLowerCase();
      let pos = 0;
      while ((pos = output.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
    }

    return count;
  });

  inspectorTab = signal<'formatted' | 'tree' | 'table' | 'stats' | 'codegen' | 'jsonpath' | 'graph'>('formatted');
  copied = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  showHistoryDrawer = signal<boolean>(false);
  showSettingsDrawer = signal<boolean>(false);
  showRepairModal = signal<boolean>(false);
  showShareModal = signal<boolean>(false);
  showMoreMenu = signal<boolean>(false);
  showCommandPalette = signal<boolean>(false);

  showFeedbackModal = signal<boolean>(false);

  // Undo / Redo history
  undoStack = signal<string[]>([]);
  redoStack = signal<string[]>([]);
  canUndo = computed(() => this.undoStack().length > 0);
  canRedo = computed(() => this.redoStack().length > 0);

  // Diff mode
  isDiffMode = signal<boolean>(false);
  diffLeft = signal<string>('');
  diffRight = signal<string>('');
  diffResult = computed<DiffResult | null>(() => {
    const l = this.diffLeft();
    const r = this.diffRight();
    if (!l.trim() || !r.trim()) return null;
    return this.jsonLensService.computeDiff(l, r);
  });

  historyGroups = signal<HistoryGroup[]>([]);
  result = signal<JsonLensResult | null>(null);

  private validationDebounceTimer: any = null;

  settings = computed<JsonLensSettings>(() => ({
    indent: this.indent(),
    wordWrap: this.wordWrap(),
    lineNumbers: this.lineNumbers(),
    autoValidate: this.autoValidate(),
    formatOnPaste: this.formatOnPaste(),
    theme: this.theme(),
    enableHistory: this.enableHistory()
  }));

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent) {
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;
    const isShift = event.shiftKey;
    const key = event.key.toLowerCase();

    // 1. Command Palette: Cmd/Ctrl + K
    if (isCmdOrCtrl && key === 'k') {
      event.preventDefault();
      this.toggleCommandPalette();
      return;
    }

    // 2. Format: Cmd/Ctrl + Enter
    if (isCmdOrCtrl && event.key === 'Enter') {
      event.preventDefault();
      this.processJson();
      return;
    }

    // 3. Minify: Cmd/Ctrl + Shift + M
    if (isCmdOrCtrl && isShift && key === 'm') {
      event.preventDefault();
      this.toggleMinify();
      return;
    }

    // 4. Save/Download: Cmd/Ctrl + S
    if (isCmdOrCtrl && !isShift && key === 's') {
      event.preventDefault();
      this.download();
      return;
    }

    // 5. Copy: Cmd/Ctrl + Shift + C
    if (isCmdOrCtrl && isShift && key === 'c') {
      event.preventDefault();
      this.copyToClipboard();
      return;
    }

    // 6. Diff / Compare Mode: Cmd/Ctrl + D
    if (isCmdOrCtrl && !isShift && key === 'd') {
      event.preventDefault();
      this.toggleDiffMode();
      return;
    }

    // 7. Live Search: Cmd/Ctrl + F
    if (isCmdOrCtrl && !isShift && key === 'f') {
      event.preventDefault();
      this.showSearchInput.set(true);
      return;
    }

    // 8. Filter Condition Popover: Cmd/Ctrl + Shift + F
    if (isCmdOrCtrl && isShift && key === 'f') {
      event.preventDefault();
      this.toggleFilterPopover();
      return;
    }

    // 9. History Drawer: Cmd/Ctrl + H
    if (isCmdOrCtrl && !isShift && key === 'h') {
      event.preventDefault();
      this.toggleHistory();
      return;
    }

    // 10. Theme Toggle: Cmd/Ctrl + Shift + T
    if (isCmdOrCtrl && isShift && key === 't') {
      event.preventDefault();
      this.toggleTheme();
      return;
    }

    // 11. Settings Drawer: Cmd/Ctrl + ,
    if (isCmdOrCtrl && event.key === ',') {
      event.preventDefault();
      this.toggleSettingsDrawer();
      return;
    }

    // 12. Validate Syntax & Schema: Cmd/Ctrl + Shift + V
    if (isCmdOrCtrl && isShift && key === 'v') {
      event.preventDefault();
      this.processJson();
      this.triggerToast('✓ Validating payload syntax & schema');
      return;
    }

    // 13. Smart Fix Errors: Cmd/Ctrl + Shift + X
    if (isCmdOrCtrl && isShift && key === 'x') {
      event.preventDefault();
      this.openRepairModal();
      return;
    }

    // 14. Auto-Detect Format: Cmd/Ctrl + Shift + A
    if (isCmdOrCtrl && isShift && key === 'a') {
      event.preventDefault();
      this.triggerAutoDetect();
      return;
    }

    // 15. Sort Keys Alphabetically: Cmd/Ctrl + Shift + S
    if (isCmdOrCtrl && isShift && key === 's') {
      event.preventDefault();
      this.toggleSortKeys();
      return;
    }

    // 16. Escape / Unescape String: Cmd/Ctrl + Shift + U
    if (isCmdOrCtrl && isShift && key === 'u') {
      event.preventDefault();
      this.toggleEscapeInput();
      return;
    }

    // 17. Stringify Payload: Cmd/Ctrl + Shift + Q
    if (isCmdOrCtrl && isShift && key === 'q') {
      event.preventDefault();
      this.stringifyInput();
      return;
    }

    // 18. Expand All Tree Nodes: Cmd/Ctrl + Shift + E
    if (isCmdOrCtrl && isShift && key === 'e') {
      event.preventDefault();
      this.inspectorComp?.expandAllTreeNodes();
      return;
    }

    // 19. Collapse All Tree Nodes: Cmd/Ctrl + Shift + W
    if (isCmdOrCtrl && isShift && key === 'w') {
      event.preventDefault();
      this.inspectorComp?.collapseAllTreeNodes();
      return;
    }

    // 20. Open / Import Local File: Cmd/Ctrl + O
    if (isCmdOrCtrl && !isShift && key === 'o') {
      event.preventDefault();
      this.editorComp?.triggerFileImport();
      return;
    }

    // 21. Share Payload Snapshot: Cmd/Ctrl + Shift + P
    if (isCmdOrCtrl && isShift && key === 'p') {
      event.preventDefault();
      this.toggleShareModal();
      return;
    }

    // 22. Clear Workspace: Cmd/Ctrl + Shift + Backspace
    if (isCmdOrCtrl && isShift && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
      this.clear();
      this.triggerToast('✓ Workspace cleared');
      return;
    }

    // 23. View Navigation Numbers (Cmd/Ctrl + 1..6)
    if (isCmdOrCtrl && !isShift) {
      if (key === '1') {
        event.preventDefault();
        this.isDiffMode.set(false);
        this.setInspectorTab('formatted');
        return;
      }
      if (key === '2') {
        event.preventDefault();
        this.isDiffMode.set(false);
        this.setInspectorTab('tree');
        return;
      }
      if (key === '3') {
        event.preventDefault();
        this.isDiffMode.set(false);
        this.setInspectorTab('table');
        return;
      }
      if (key === '4') {
        event.preventDefault();
        this.isDiffMode.set(false);
        this.setInspectorTab('graph');
        return;
      }
      if (key === '5') {
        event.preventDefault();
        this.isDiffMode.set(false);
        this.setInspectorTab('stats');
        return;
      }
      if (key === '6') {
        event.preventDefault();
        this.isDiffMode.set(false);
        this.setInspectorTab('codegen');
        return;
      }
    }

    // 24. Escape key dismissals
    if (event.key === 'Escape') {
      if (this.showCommandPalette()) {
        this.showCommandPalette.set(false);
      } else if (this.showRepairModal()) {
        this.showRepairModal.set(false);
      } else if (this.showShareModal()) {
        this.showShareModal.set(false);
      } else if (this.showSettingsDrawer()) {
        this.showSettingsDrawer.set(false);
      } else if (this.showHistoryDrawer()) {
        this.showHistoryDrawer.set(false);
      } else if (this.showFilterPopover()) {
        this.showFilterPopover.set(false);
      } else if (this.showSearchInput()) {
        this.closeSearchInput();
      } else if (this.privacyModal?.isOpen()) {
        this.privacyModal.closeModal();
      }
    }
  }

  isWorkspaceDragging = signal<boolean>(false);

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isWorkspaceDragging.set(true);
  }

  @HostListener('window:dragleave', ['$event'])
  onWindowDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.clientX === 0 && event.clientY === 0) {
      this.isWorkspaceDragging.set(false);
    }
  }

  @HostListener('window:dragend')
  @HostListener('window:mouseleave')
  onWindowDragEnd() {
    this.isWorkspaceDragging.set(false);
  }

  @HostListener('window:drop', ['$event'])
  onWindowDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isWorkspaceDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      this.handleFileObject(event.dataTransfer.files[0]);
    }
  }

  startResizing(event: MouseEvent) {
    event.preventDefault();
    this.isResizing.set(true);
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing()) return;
    const windowWidth = window.innerWidth;
    if (windowWidth === 0) return;
    const newWidthPercent = (event.clientX / windowWidth) * 100;
    const clamped = Math.max(35, Math.min(65, newWidthPercent));
    this.leftPanelWidth.set(clamped);
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.isResizing()) {
      this.isResizing.set(false);
    }
  }

  computedLineNumbers = computed(() => {
    const text = this.rawInput();
    if (!text || !this.lineNumbers()) return '1';
    const lines = text.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  });

  displayOutput = computed(() => {
    const formatted = this.formattedOutput();
    if (formatted && formatted.trim().length > 0) return formatted;
    const res = this.result();
    if (res && res.formattedJson && res.formattedJson.trim().length > 0) return res.formattedJson;
    return this.rawInput();
  });

  activeFormat = signal<FormatId>('json');
  allFormats = computed(() => this.formatRegistry.getAllFormats());
  currentFormatDef = computed(() => this.formatRegistry.getFormat(this.activeFormat()));
  capabilities = computed(() => this.currentFormatDef().capabilities);

  showFormatMenu = signal<boolean>(false);

  getActiveFormatLabel(): string {
    const fmt = this.allFormats().find(f => f.id === this.activeFormat());
    return fmt ? fmt.label : this.activeFormat().toUpperCase();
  }

  primaryOperations = computed(() => this.operationsService.getPrimaryOperations(this.activeFormat()));
  secondaryOperations = computed(() => this.operationsService.getSecondaryOperations(this.activeFormat()));
  showTransformMenu = signal<boolean>(false);

  constructor(
    private jsonLensService: DataLensService,
    private historyService: DataLensHistoryService,
    private formatRegistry: FormatRegistryService,
    private operationsService: FormatOperationsService
  ) {}

  executeTransformation(opId: string) {
    this.showTransformMenu.set(false);
    const res = this.result();
    const raw = this.rawInput();

    try {
      if (opId === 'expandAnchors') {
        this.rawInput.set(this.jsonLensService.expandYamlAnchors(raw));
        this.processJson();
        this.triggerToast('⚡ Expanded YAML &anchors and *aliases');
        return;
      } else if (opId === 'stripComments') {
        if (this.activeFormat() === 'yaml') {
          this.rawInput.set(this.jsonLensService.stripYamlComments(raw));
        } else if (this.activeFormat() === 'xml') {
          this.rawInput.set(this.jsonLensService.stripXmlComments(raw));
        } else {
          this.rawInput.set(this.jsonLensService.stripJsonComments(raw));
        }
        this.processJson();
        this.triggerToast('⚡ Stripped comment blocks from payload');
        return;
      } else if (opId === 'removePI') {
        this.rawInput.set(this.jsonLensService.removeXmlProcessingInstructions(raw));
        this.processJson();
        this.triggerToast('⚡ Removed XML processing instructions');
        return;
      } else if (opId === 'sortAttributes') {
        this.rawInput.set(this.jsonLensService.sortXmlAttributes(raw));
        this.processJson();
        this.triggerToast('⚡ Alphabetically sorted XML attributes');
        return;
      } else if (opId === 'normalizeQuotes') {
        this.rawInput.set(this.jsonLensService.normalizeXmlQuotes(raw));
        this.processJson();
        this.triggerToast('⚡ Normalized attribute quotes to double quotes');
        return;
      } else if (opId === 'normalizeTables') {
        this.rawInput.set(this.jsonLensService.normalizeTomlTables(raw));
        this.processJson();
        this.triggerToast('⚡ Normalized TOML table section headers');
        return;
      } else if (opId === 'normalizeInlineTables') {
        this.rawInput.set(this.jsonLensService.normalizeTomlInlineTables(raw));
        this.processJson();
        this.triggerToast('⚡ Normalized TOML inline table and array spacing');
        return;
      } else if (opId === 'trimWhitespace') {
        this.rawInput.set(this.jsonLensService.trimCsvWhitespace(raw));
        this.processJson();
        this.triggerToast('⚡ Trimmed CSV cell whitespace');
        return;
      } else if (opId === 'removeEmptyRows') {
        this.rawInput.set(this.jsonLensService.removeCsvEmptyRows(raw));
        this.processJson();
        this.triggerToast('⚡ Stripped empty CSV rows');
        return;
      } else if (opId === 'removeDuplicateRows') {
        this.rawInput.set(this.jsonLensService.removeCsvDuplicateRows(raw));
        this.processJson();
        this.triggerToast('⚡ Deduplicated identical CSV rows');
        return;
      } else if (opId === 'extractHeaders') {
        this.rawInput.set(this.jsonLensService.extractCurlHeaders(raw));
        this.setFormat('json');
        this.triggerToast('⚡ Extracted cURL HTTP Headers → JSON');
        return;
      } else if (opId === 'extractUrl') {
        this.rawInput.set(this.jsonLensService.extractCurlUrlParams(raw));
        this.setFormat('json');
        this.triggerToast('⚡ Extracted cURL URL & Query Params → JSON');
        return;
      } else if (opId === 'extractAuth') {
        this.rawInput.set(this.jsonLensService.extractCurlAuth(raw));
        this.setFormat('json');
        this.triggerToast('⚡ Extracted cURL Authentication Tokens');
        return;
      } else if (opId === 'securityScan') {
        this.rawInput.set(this.jsonLensService.scanCurlSecurity(raw));
        this.setFormat('json');
        this.triggerToast('⚡ Completed cURL Security Audit Scan');
        return;
      } else if (opId === 'tabsToSpaces') {
        this.rawInput.set(this.jsonLensService.convertTabsToSpaces(raw));
        this.processJson();
        this.triggerToast('⚡ Converted tabs to spaces');
        return;
      } else if (opId === 'normalizeBooleans') {
        this.rawInput.set(this.jsonLensService.normalizeYamlBooleans(raw));
        this.processJson();
        this.triggerToast('⚡ Normalized YAML booleans and nulls');
        return;
      } else if (opId === 'yamlToJson') {
        if (!res?.parsedData) throw new Error('Valid YAML payload required');
        this.rawInput.set(JSON.stringify(res.parsedData, null, 2));
        this.setFormat('json');
        this.triggerToast('⚡ Converted YAML → JSON');
        return;
      } else if (opId === 'yamlToXml') {
        if (!res?.parsedData) throw new Error('Valid YAML payload required');
        this.rawInput.set(this.jsonLensService.jsonToXml(res.parsedData));
        this.setFormat('xml');
        this.triggerToast('⚡ Converted YAML → XML');
        return;
      } else if (opId === 'yamlToToml') {
        if (!res?.parsedData) throw new Error('Valid YAML payload required');
        this.rawInput.set(this.jsonLensService.jsonToToml(res.parsedData));
        this.setFormat('toml');
        this.triggerToast('⚡ Converted YAML → TOML');
        return;
      } else if (opId === 'yamlToCsv') {
        if (!res?.parsedData) throw new Error('Valid YAML payload required');
        this.rawInput.set(this.jsonLensService.jsonToCsv(res.parsedData));
        this.setFormat('csv');
        this.triggerToast('⚡ Converted YAML → CSV');
        return;
      }

      if (!res || !res.parsedData) {
        this.triggerToast('⚠️ Valid payload required to perform transformation');
        return;
      }

      let transformed: any;
      if (opId === 'flatten') {
        transformed = this.jsonLensService.flattenObject(res.parsedData);
        this.triggerToast('⚡ Flattened nested JSON object');
      } else if (opId === 'unflatten') {
        transformed = this.jsonLensService.unflattenObject(res.parsedData);
        this.triggerToast('⚡ Unflattened dot-notation object');
      } else if (opId === 'removeNulls') {
        transformed = this.jsonLensService.removeNullValues(res.parsedData);
        this.triggerToast('⚡ Removed null properties');
      } else if (opId === 'removeEmpties') {
        if (this.activeFormat() === 'toml') {
          this.rawInput.set(this.jsonLensService.removeTomlEmptyValues(raw));
          this.processJson();
          this.triggerToast('⚡ Removed empty TOML key-values and tables');
          return;
        }
        transformed = this.jsonLensService.removeEmptyValues(res.parsedData);
        this.triggerToast('⚡ Removed empty strings, arrays, and objects');
      } else if (opId === 'toCamelCase') {
        transformed = this.jsonLensService.convertKeyCase(res.parsedData, 'camel');
        this.triggerToast('⚡ Converted object keys to camelCase');
      } else if (opId === 'toSnakeCase') {
        transformed = this.jsonLensService.convertKeyCase(res.parsedData, 'snake');
        this.triggerToast('⚡ Converted object keys to snake_case');
      } else if (opId === 'toKebabCase') {
        transformed = this.jsonLensService.convertKeyCase(res.parsedData, 'kebab');
        this.triggerToast('⚡ Converted object keys to kebab-case');
      } else if (opId === 'toPascalCase') {
        transformed = this.jsonLensService.convertKeyCase(res.parsedData, 'pascal');
        this.triggerToast('⚡ Converted object keys to PascalCase');
      }

      if (transformed !== undefined) {
        this.rawInput.set(JSON.stringify(transformed, null, 2));
        this.processJson();
      }
    } catch (e: any) {
      this.triggerToast(`❌ Transformation failed: ${e.message || String(e)}`);
    }
  }

  ngOnInit() {
    try {
      const savedSize = localStorage.getItem('datalens-font-size') || localStorage.getItem('json-lens-font-size');
      if (savedSize) {
        const parsed = parseInt(savedSize, 10);
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) {
          this.fontSize.set(parsed);
        }
      }
    } catch {}
    this.refreshHistory();
  }

  toggleCommandPalette() {
    this.showCommandPalette.update(v => !v);
  }

  toggleShareModal() {
    this.showShareModal.update(v => !v);
  }

  toggleSettingsDrawer() {
    this.showSettingsDrawer.update(v => !v);
  }

  updateSettings(partial: Partial<JsonLensSettings>) {
    if (partial.indent !== undefined) this.indent.set(partial.indent);
    if (partial.wordWrap !== undefined) this.wordWrap.set(partial.wordWrap);
    if (partial.lineNumbers !== undefined) this.lineNumbers.set(partial.lineNumbers);
    if (partial.autoValidate !== undefined) this.autoValidate.set(partial.autoValidate);
    if (partial.formatOnPaste !== undefined) this.formatOnPaste.set(partial.formatOnPaste);
    if (partial.theme !== undefined) this.theme.set(partial.theme);
    if (partial.enableHistory !== undefined) this.enableHistory.set(partial.enableHistory);

    this.processJson();
    this.triggerToast('✓ Settings updated');
  }

  async refreshHistory() {
    if (!this.enableHistory()) {
      this.historyGroups.set([]);
      return;
    }
    const groups = await this.historyService.getGroupedHistory();
    this.historyGroups.set(groups);
  }

  openPrivacyExplanation() {
    if (this.privacyModal) {
      this.privacyModal.openModal();
    }
  }

  autoDetectMode = signal<boolean>(true);

  runAutoDetection(val: string) {
    if (!val || !val.trim() || !this.autoDetectMode()) return;
    const detected = this.formatRegistry.detectFormat(val);
    if (detected !== this.activeFormat()) {
      this.activeFormat.set(detected);
      this.triggerToast(`✨ Auto-detected format: ${detected.toUpperCase()}`);
    }
  }

  triggerAutoDetect() {
    const raw = this.rawInput();
    if (!raw || !raw.trim()) {
      this.triggerToast('⚠️ Please paste or type a payload to auto-detect');
      return;
    }
    const detected = this.formatRegistry.detectFormat(raw);
    this.activeFormat.set(detected);
    this.processJson();
    this.triggerToast(`✨ Auto-detected format: ${detected.toUpperCase()}`);
  }

  onInspectorOutputChange(val: string) {
    this.pushUndoState(this.rawInput());
    this.rawInput.set(val);
    this.formattedOutput.set(val);
    if (!this.autoValidate()) return;

    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
    }
    this.validationDebounceTimer = setTimeout(() => {
      this.processJson();
    }, 300);
  }

  onInputChange(val: string) {
    this.pushUndoState(this.rawInput());
    this.rawInput.set(val);
    this.runAutoDetection(val);
    if (!this.autoValidate()) return;

    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
    }
    this.validationDebounceTimer = setTimeout(() => {
      this.processJson();
    }, 300);
  }

  onIndentChange(val: number | string) {
    this.indent.set(val);
    this.minify.set(false);
    this.processJson();
  }

  toggleSortKeys() {
    this.sortKeys.update(v => !v);
    this.processJson();
  }

  toggleMinify() {
    this.minify.update(v => !v);
    this.processJson();
    this.triggerToast('✓ JSON minified');
  }

  toggleWordWrap() {
    this.wordWrap.update(v => !v);
  }

  setInspectorTab(tab: 'formatted' | 'tree' | 'table' | 'stats' | 'codegen' | 'jsonpath' | 'graph') {
    this.inspectorTab.set(tab);
  }

  generateCodeFromPalette(lang: string) {
    this.isDiffMode.set(false);
    this.setInspectorTab('codegen');
    if (this.inspectorComp) {
      this.inspectorComp.selectedLang.set(lang);
    }
  }

  convertFormatFromPalette(target: string) {
    this.isDiffMode.set(false);
    if (target === 'json' || target === 'yaml' || target === 'xml' || target === 'csv') {
      this.convertPayload(target);
    } else if (target === 'toml') {
      this.setFormat('toml');
    }
  }

  pushUndoState(val: string) {
    if (!val) return;
    const currentStack = this.undoStack();
    if (currentStack.length === 0 || currentStack[currentStack.length - 1] !== val) {
      this.undoStack.set([...currentStack.slice(-50), val]);
      this.redoStack.set([]);
    }
  }

  undo() {
    const uStack = [...this.undoStack()];
    if (uStack.length === 0) return;
    const previous = uStack.pop()!;
    this.redoStack.set([...this.redoStack(), this.rawInput()]);
    this.undoStack.set(uStack);
    this.rawInput.set(previous);
    this.processJson();
    this.triggerToast('↶ Undo applied');
  }

  redo() {
    const rStack = [...this.redoStack()];
    if (rStack.length === 0) return;
    const next = rStack.pop()!;
    this.undoStack.set([...this.undoStack(), this.rawInput()]);
    this.redoStack.set(rStack);
    this.rawInput.set(next);
    this.processJson();
    this.triggerToast('↷ Redo applied');
  }

  openFeedbackModal() {
    this.isFeedbackModalOpen.set(true);
  }

  toggleDiffMode() {
    this.isDiffMode.update(v => !v);
    if (this.isDiffMode()) {
      this.diffLeft.set(this.rawInput());
      this.diffRight.set('');
    }
  }

  isEscaped = signal<boolean>(false);

  toggleEscapeInput() {
    const current = this.rawInput();
    if (!current) return;
    if (this.isEscaped()) {
      const unescaped = this.jsonLensService.unescapeJsonString(current);
      this.rawInput.set(unescaped);
      this.isEscaped.set(false);
      this.triggerToast('✓ JSON string unescaped');
    } else {
      const escaped = this.jsonLensService.escapeJsonString(current);
      this.rawInput.set(escaped);
      this.isEscaped.set(true);
      this.triggerToast('✓ JSON string escaped');
    }
    this.processJson();
  }

  stringifyInput() {
    const current = this.rawInput();
    if (!current) return;
    try {
      const parsed = JSON.parse(current);
      const stringified = JSON.stringify(JSON.stringify(parsed));
      this.rawInput.set(stringified);
      this.processJson();
      this.triggerToast('✓ JSON stringified');
    } catch {
      const stringified = JSON.stringify(current);
      this.rawInput.set(stringified);
      this.processJson();
      this.triggerToast('✓ Payload stringified');
    }
  }

  toggleHistory() {
    this.showHistoryDrawer.update(v => !v);
    if (this.showHistoryDrawer()) {
      this.refreshHistory();
    }
  }

  toggleMoreMenu() {
    this.showMoreMenu.update(v => !v);
  }


  async processJson() {
    const input = this.rawInput();
    if (!input || input.trim() === '') {
      this.formattedOutput.set('');
      this.result.set(null);
      return;
    }

    this.isProcessing.set(true);

    const options: JsonLensOptions = {
      indent: this.indent(),
      sortKeys: this.sortKeys(),
      minify: this.minify()
    };

    const res = await this.jsonLensService.format(input, options, this.activeFormat());
    this.result.set(res);
    this.isProcessing.set(false);

    if (res.success && res.formattedJson) {
      this.formattedOutput.set(res.formattedJson);
      if (res.extractedFromFormat) {
        this.triggerToast(`⚡ Extracted JSON from ${res.extractedFromFormat}`);
      }
      if (this.enableHistory()) {
        await this.historyService.savePayload(input, this.originalFilename());
        await this.refreshHistory();
      }
    }
  }

  setFormat(formatId: FormatId) {
    this.activeFormat.set(formatId);
    const def = this.formatRegistry.getFormat(formatId);
    this.triggerToast(`✓ Active format set to ${def.label}`);
    this.processJson();
  }

  convertPayload(target: 'json' | 'yaml' | 'xml' | 'csv') {
    const res = this.result();
    if (!res || !res.parsedData) return;

    if (target === 'json') {
      const output = JSON.stringify(res.parsedData, null, typeof this.indent() === 'number' ? this.indent() : 2);
      this.formattedOutput.set(output);
      this.inspectorTab.set('formatted');
      this.triggerToast(`✓ Reset format to JSON`);
      return;
    }

    const output = this.jsonLensService.convertTo(res.parsedData, target);
    this.formattedOutput.set(output);
    this.inspectorTab.set('formatted');
    this.triggerToast(`✓ Converted to ${target.toUpperCase()}`);
  }

  goToErrorLocation() {
    const res = this.result();
    if (!res || !res.errorLine || !this.editorComponent) return;

    const lines = this.rawInput().split('\n');
    const targetLine = res.errorLine - 1;

    let pos = 0;
    for (let i = 0; i < targetLine && i < lines.length; i++) {
      pos += lines[i].length + 1;
    }
    if (res.errorColumn) {
      pos += Math.min(res.errorColumn - 1, lines[targetLine]?.length || 0);
    }

    this.editorComponent.focusAndSelectPos(pos);
  }

  openRepairModal() {
    this.showRepairModal.set(true);
  }

  closeRepairModal() {
    this.showRepairModal.set(false);
  }

  applyFixes() {
    const res = this.result();
    if (res && res.repairedJson) {
      const count = res.repairIssues?.length || 1;
      this.rawInput.set(res.repairedJson);
      this.processJson();
      this.closeRepairModal();
      this.triggerToast(`✓ ${count} fixes applied`);
    }
  }

  loadSample(type: 'apiResponse' | 'nestedObject' | 'largeArray' | 'config') {
    let sampleData: any;

    switch (type) {
      case 'apiResponse':
        sampleData = {
          status: 200,
          success: true,
          message: 'User profile payload retrieved successfully',
          data: {
            user: {
              id: 42,
              name: 'Athar Taj',
              username: 'ayaz',
              roles: ['admin', 'developer'],
              preferences: {
                theme: 'dark',
                notifications: true,
                security: { twoFactor: true, lastLogin: '2026-08-19T12:00:00Z' }
              }
            }
          }
        };
        break;
      case 'nestedObject':
        sampleData = {
          organization: 'Acklet Inc.',
          department: {
            engineering: {
              teams: [
                { name: 'Core Platform', leads: ['Alex', 'Jordan'] },
                { name: 'Developer Tools', leads: ['Athar', 'Taylor'] }
              ]
            }
          }
        };
        break;
      case 'largeArray':
        sampleData = Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `User Record ${i + 1}`,
          age: 25 + i,
          active: i % 2 === 0
        }));
        break;
      case 'config':
        sampleData = {
          $schema: 'https://acklet.dev/schema.json',
          workspaceName: 'Acklet Primary Workspace',
          version: '1.0.0',
          settings: { autoValidate: true, debounceMs: 300, maxHistoryItems: 20 }
        };
        break;
    }

    this.originalFilename.set('sample.json');
    this.rawInput.set(JSON.stringify(sampleData));
    this.processJson();
  }

  clear() {
    this.rawInput.set('');
    this.formattedOutput.set('');
    this.originalFilename.set('formatted.json');
    this.result.set(null);
  }

  copyToClipboard() {
    let text = '';
    const currentTab = this.inspectorTab();
    const res = this.result();

    if (currentTab === 'codegen' && this.inspectorComp) {
      text = this.inspectorComp.generatedCode() || '';
    } else if (currentTab === 'jsonpath' && this.inspectorComp) {
      const qr = this.inspectorComp.jsonPathResult();
      text = qr && qr.results.length ? JSON.stringify(qr.results, null, 2) : '';
    } else if (currentTab === 'stats' && res?.stats) {
      text = JSON.stringify(res.stats, null, 2);
    } else {
      text = this.displayOutput() || this.formattedOutput() || this.rawInput();
    }

    if (!text || text.trim() === '') {
      this.triggerToast('⚠️ Nothing to copy yet — enter or format payload first');
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      this.triggerToast(`✓ Copied ${currentTab.toUpperCase()} output to clipboard`);
      setTimeout(() => this.copied.set(false), 2000);
    }).catch(() => {
      this.triggerToast('✓ Copied to clipboard');
    });
  }

  download() {
    const text = this.formattedOutput();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.originalFilename();
    a.click();
    URL.revokeObjectURL(url);
    this.triggerToast('✓ Download started');
  }

  onFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      this.handleFileObject(target.files[0]);
    }
  }

  handleFileObject(file: File) {
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    this.originalFilename.set(`${baseName}.formatted.json`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        this.rawInput.set(content);

        if (this.formatOnPaste()) {
          this.processJson();
        }

        this.triggerToast(`✓ Loaded ${file.name}`);
      }
    };
    reader.readAsText(file);
  }

  triggerToast(msg: string, type: 'success' | 'info' | 'warning' = 'success') {
    if (this.toastContainer) {
      this.toastContainer.showToast(msg, type);
    }
  }

  async restoreHistoryItem(item: HistoryItem) {
    this.rawInput.set(item.payload);
    if (item.filename) this.originalFilename.set(item.filename);
    await this.processJson();
    this.showHistoryDrawer.set(false);
    this.triggerToast(`✓ Restored payload`);
  }

  async deleteHistoryItem(id: string) {
    await this.historyService.deleteItem(id);
    await this.refreshHistory();
    this.triggerToast('✓ Item removed from history');
  }

  async togglePinHistoryItem(id: string) {
    await this.historyService.togglePinItem(id);
    await this.refreshHistory();
  }

  async clearAllHistory() {
    await this.historyService.clearAll();
    await this.refreshHistory();
  }

  handleFooterFeature(action: string) {
    if (['tree', 'table', 'stats', 'codegen', 'jsonpath', 'graph'].includes(action)) {
      this.setInspectorTab(action as any);
    } else if (action === 'format') {
      this.processJson();
    } else if (action === 'convert') {
      this.convertPayload('yaml');
    }
  }

  isFeedbackModalOpen = signal<boolean>(false);

  onInspectorFileDropped(content: string) {
    if (!content) return;
    this.rawInput.set(content);
    this.processJson();
    this.triggerToast('✓ JSON file loaded from dropzone');
  }
}
