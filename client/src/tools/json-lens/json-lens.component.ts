import { Component, ChangeDetectionStrategy, signal, computed, ViewChild, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonLensService, JsonLensOptions, JsonLensResult } from './services/json-lens.service';
import { JsonLensHistoryService, HistoryGroup, HistoryItem } from './services/json-lens-history.service';

import { JsonLensToolbarComponent } from './components/json-lens-toolbar.component';
import { JsonLensErrorPanelComponent } from './components/json-lens-error-panel.component';
import { JsonLensEditorComponent } from './components/json-lens-editor.component';
import { JsonLensInspectorComponent } from './components/json-lens-inspector.component';
import { JsonLensPrivacyModalComponent } from './components/json-lens-privacy-modal.component';
import { JsonLensHistoryDrawerComponent } from './components/json-lens-history-drawer.component';
import { JsonLensCommandPaletteComponent } from './components/json-lens-command-palette.component';
import { JsonLensDragOverlayComponent } from './components/json-lens-drag-overlay.component';
import { JsonLensToastContainerComponent } from './components/json-lens-toast-container.component';
import { JsonLensShareModalComponent } from './components/json-lens-share-modal.component';
import { JsonLensSettingsDrawerComponent, JsonLensSettings } from './components/json-lens-settings-drawer.component';
import { JsonLensSeoFooterComponent } from './components/json-lens-seo-footer.component';

@Component({
  selector: 'app-json-lens',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JsonLensToolbarComponent,
    JsonLensErrorPanelComponent,
    JsonLensEditorComponent,
    JsonLensInspectorComponent,
    JsonLensPrivacyModalComponent,
    JsonLensHistoryDrawerComponent,
    JsonLensCommandPaletteComponent,
    JsonLensDragOverlayComponent,
    JsonLensToastContainerComponent,
    JsonLensShareModalComponent,
    JsonLensSettingsDrawerComponent,
    JsonLensSeoFooterComponent
  ],
  templateUrl: './json-lens.component.html',
  styleUrls: ['./json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensComponent implements OnInit {
  @ViewChild(JsonLensEditorComponent) editorComponent!: JsonLensEditorComponent;
  @ViewChild(JsonLensInspectorComponent) inspectorComponent!: JsonLensInspectorComponent;
  @ViewChild(JsonLensPrivacyModalComponent) privacyModal!: JsonLensPrivacyModalComponent;
  @ViewChild(JsonLensToastContainerComponent) toastContainer!: JsonLensToastContainerComponent;

  rawInput = signal<string>('');
  formattedOutput = signal<string>('');
  originalFilename = signal<string>('formatted.json');
  
  indent = signal<number | string>(2);
  sortKeys = signal<boolean>(false);
  minify = signal<boolean>(false);
  wordWrap = signal<boolean>(true);
  lineNumbers = signal<boolean>(true);
  autoValidate = signal<boolean>(true);
  formatOnPaste = signal<boolean>(true);
  theme = signal<'dark' | 'light' | 'system'>('dark');
  enableHistory = signal<boolean>(true);

  filterQuery = signal<string>('');

  inspectorTab = signal<'formatted' | 'tree' | 'table' | 'stats' | 'codegen'>('formatted');
  copied = signal<boolean>(false);
  isProcessing = signal<boolean>(false);
  showHistoryDrawer = signal<boolean>(false);
  showSettingsDrawer = signal<boolean>(false);
  showRepairModal = signal<boolean>(false);
  showShareModal = signal<boolean>(false);
  showMoreMenu = signal<boolean>(false);
  showCommandPalette = signal<boolean>(false);

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

    if (isCmdOrCtrl && key === 'k') {
      event.preventDefault();
      this.toggleCommandPalette();
      return;
    }

    if (isCmdOrCtrl && event.key === 'Enter') {
      event.preventDefault();
      this.processJson();
      return;
    }

    if (isCmdOrCtrl && isShift && key === 'm') {
      event.preventDefault();
      this.toggleMinify();
      return;
    }

    if (isCmdOrCtrl && key === 's') {
      event.preventDefault();
      this.download();
      return;
    }

    if (isCmdOrCtrl && isShift && key === 'c') {
      event.preventDefault();
      this.copyToClipboard();
      return;
    }

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
      } else if (this.privacyModal?.isOpen()) {
        this.privacyModal.closeModal();
      }
    }
  }

  computedLineNumbers = computed(() => {
    const text = this.rawInput();
    if (!text || !this.lineNumbers()) return '1';
    const lines = text.split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  });

  displayOutput = computed(() => {
    const raw = this.formattedOutput();
    const query = this.filterQuery().trim().toLowerCase();
    if (!query || !raw) return raw;
    
    return raw.split('\n')
      .filter(line => line.toLowerCase().includes(query))
      .join('\n');
  });

  constructor(
    private jsonLensService: JsonLensService,
    private historyService: JsonLensHistoryService
  ) {
    this.loadSample('apiResponse');
  }

  ngOnInit() {
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

  onInputChange(val: string) {
    this.rawInput.set(val);
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

  setInspectorTab(tab: 'formatted' | 'tree' | 'table' | 'stats' | 'codegen') {
    this.inspectorTab.set(tab);
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

    const res = await this.jsonLensService.format(input, options);
    this.result.set(res);
    this.isProcessing.set(false);

    if (res.success && res.formattedJson) {
      this.formattedOutput.set(res.formattedJson);
      if (this.enableHistory()) {
        await this.historyService.savePayload(input, this.originalFilename());
        await this.refreshHistory();
      }
    }
  }

  convertPayload(target: 'yaml' | 'xml' | 'csv') {
    const res = this.result();
    if (!res || !res.parsedData) return;
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
    const text = this.displayOutput();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      this.triggerToast('✓ Copied to clipboard');
      setTimeout(() => this.copied.set(false), 2000);
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
  }

  async clearAllHistory() {
    await this.historyService.clearAll();
    await this.refreshHistory();
  }
}
