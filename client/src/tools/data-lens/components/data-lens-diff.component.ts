import { Component, ChangeDetectionStrategy, input, output, signal, computed, HostListener, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { parse as parseYaml } from 'yaml';
import { IconComponent } from '../../../app/shared/components/icon/icon';
import { DataLensDiffService, DiffComputationResult, DiffLineItem, DiffFoldRegion, StructuralDiffNode, DiffOptions, DiffWordToken, LineDecorationSegment, DiffHunk } from '../services/data-lens-diff.service';
import { DataLensService } from '../services/data-lens.service';

export type DiffViewMode = 'split' | 'summaryTable';
export type ChangeFilterType = 'all' | 'added' | 'removed' | 'changed' | 'moved';

export interface DiffPaneDisplayLine {
  lineNum: number;
  text: string;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  tokens?: DiffWordToken[];
  segments: LineDecorationSegment[];
  marker: string;
  isFoldPlaceholder?: boolean;
  foldCount?: number;
  isCurrentActiveChange?: boolean;
  hunk?: DiffHunk;
  isHunkStart?: boolean;
  isFoldable?: boolean;
  isFolded?: boolean;
}

@Component({
  selector: 'app-json-lens-diff',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="git-diff-container" #diffContainerTab tabindex="0">
      <!-- Top Engine Toolbar Strip -->
      <div class="diff-engine-toolbar">
        <!-- Diff Mode Switcher -->
        <div class="diff-mode-switcher">
          <button
            class="diff-mode-btn"
            [class.active]="diffMode() === 'textual'"
            (click)="diffMode.set('textual')"
            data-tooltip="View raw line-by-line git-style differences"
          >
            <app-icon name="file-code" class="icon-xs"></app-icon>
            <span>Textual Diff</span>
          </button>
          <button
            class="diff-mode-btn"
            [class.active]="diffMode() === 'structural'"
            (click)="diffMode.set('structural')"
            data-tooltip="Compare JSON abstract syntax tree ignoring key order and spacing"
          >
            <app-icon name="network" class="icon-xs"></app-icon>
            <span>Structural AST Diff</span>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- View Mode Switcher (Split vs Summary Table) -->
        <div class="diff-mode-switcher">
          <button
            class="diff-mode-btn"
            [class.active]="viewMode() === 'split'"
            (click)="viewMode.set('split')"
            data-tooltip="Compare original and modified documents in dual side-by-side editable panes"
          >
            <app-icon name="columns" class="icon-xs"></app-icon>
            <span>Side-by-Side</span>
          </button>
          <button
            class="diff-mode-btn"
            [class.active]="viewMode() === 'summaryTable'"
            (click)="viewMode.set('summaryTable')"
            data-tooltip="View sortable table of all detected changes with CSV export"
          >
            <app-icon name="table" class="icon-xs"></app-icon>
            <span>Summary Table</span>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Specialized Diff Operations Dropdown Menu Trigger -->
        <div class="diff-ops-wrapper">
          <button
            class="diff-option-btn ops-trigger-btn"
            [class.active]="showOpsMenu()"
            (click)="showOpsMenu.set(!showOpsMenu())"
            data-tooltip="Configure comparison rules, display preferences, and sensitive masking"
          >
            <app-icon name="sliders" class="icon-xs"></app-icon>
            <span>Diff Operations</span>
            @if (activeOptionsCount() > 0) {
              <span class="ops-active-badge">{{ activeOptionsCount() }}</span>
            }
            <app-icon name="chevron-down" class="icon-xs"></app-icon>
          </button>

          @if (showOpsMenu()) {
            <div class="diff-ops-backdrop" (click)="showOpsMenu.set(false)"></div>
            <div class="diff-ops-dropdown">
              <div class="ops-menu-header">
                <div class="ops-header-title">
                  <app-icon name="sliders" class="icon-xs text-cyan-400"></app-icon>
                  <span>Diff & Comparison Options</span>
                </div>
                <!-- Presets selector -->
                <div class="ops-presets-bar">
                  <span class="ops-preset-label">Presets:</span>
                  <button class="ops-preset-btn" (click)="applyPreset('strict')">Strict</button>
                  <button class="ops-preset-btn" (click)="applyPreset('lenient')">Lenient API</button>
                </div>
              </div>

              <!-- Group 1: Comparison Logic -->
              <div class="ops-section">
                <div class="ops-section-title">1. Comparison Logic</div>
                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().ignoreKeyOrder" (ngModelChange)="updateOption('ignoreKeyOrder', $event)" />
                  <span>Ignore Key Order (&#123;a,b&#125; == &#123;b,a&#125;)</span>
                </label>

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().ignoreArrayOrder" (ngModelChange)="updateOption('ignoreArrayOrder', $event)" />
                  <span>Ignore Array Order</span>
                </label>

                <!-- Match Arrays by Key with Auto-Detect -->
                <div class="ops-input-row match-key-row">
                  <span class="ops-input-label">Array Key Identity:</span>
                  <div class="match-key-input-wrap">
                    <input
                      type="text"
                      class="ops-text-input match-key-input"
                      [ngModel]="options().arrayMatchKey"
                      (ngModelChange)="updateOption('arrayMatchKey', $event)"
                      placeholder="e.g. id, _id, email"
                    />
                    @if (suggestedArrayKey()) {
                      <button
                        class="ops-suggest-chip"
                        (click)="updateOption('arrayMatchKey', suggestedArrayKey())"
                        [attr.data-tooltip]="'Auto-detected primary identity key from payload: ' + suggestedArrayKey()"
                      >
                        Auto: {{ suggestedArrayKey() }}
                      </button>
                    }
                  </div>
                </div>

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().caseInsensitive" (ngModelChange)="updateOption('caseInsensitive', $event)" />
                  <span>Case-Insensitive String Comparison ("ABC" == "abc")</span>
                </label>

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().ignoreWhitespace" (ngModelChange)="updateOption('ignoreWhitespace', $event)" />
                  <span>Ignore Whitespace Differences</span>
                </label>

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().typeCoercion" (ngModelChange)="updateOption('typeCoercion', $event)" />
                  <span>Type Coercion ("5" == 5)</span>
                </label>

                <!-- Numeric Tolerance Epsilon (Enabled when Type Coercion is ON) -->
                @if (options().typeCoercion) {
                  <div class="ops-input-row tolerance-row">
                    <span class="ops-input-label">Numeric Tolerance (±ε):</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      class="ops-text-input tolerance-input"
                      [ngModel]="options().numericTolerance"
                      (ngModelChange)="updateOption('numericTolerance', +$event)"
                      placeholder="e.g. 0.01"
                    />
                  </div>
                }

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().detectMoves" (ngModelChange)="updateOption('detectMoves', $event)" />
                  <span>Detect Moved / Renamed Keys</span>
                </label>

                <!-- Exclude Paths Input -->
                <div class="ops-input-col">
                  <span class="ops-input-label">Exclude Paths (glob or comma-separated):</span>
                  <input
                    type="text"
                    class="ops-text-input exclude-paths-input"
                    [ngModel]="options().excludePaths"
                    (ngModelChange)="updateOption('excludePaths', $event)"
                    placeholder="e.g. **.timestamp, **.requestId, $.meta.*"
                  />
                </div>
              </div>

              <!-- Group 2: Display Preferences -->
              <div class="ops-section">
                <div class="ops-section-title">2. Display Preferences</div>
                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="displayOptions().wordTokenHighlighting" (ngModelChange)="updateDisplayOption('wordTokenHighlighting', $event)" />
                  <span>Word / Token Inline Highlighting</span>
                </label>

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="displayOptions().showIndentGuides" (ngModelChange)="updateDisplayOption('showIndentGuides', $event)" />
                  <span>Show Indentation Guides</span>
                </label>

                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="displayOptions().showWhitespace" (ngModelChange)="updateDisplayOption('showWhitespace', $event)" />
                  <span>Show Whitespace Characters</span>
                </label>

                <div class="ops-input-row">
                  <span class="ops-input-label">Tab Size:</span>
                  <select class="ops-select-input" [ngModel]="tabSize()" (ngModelChange)="tabSize.set($event)">
                    <option [value]="2">2 spaces</option>
                    <option [value]="4">4 spaces</option>
                    <option [value]="8">8 spaces</option>
                  </select>
                </div>
              </div>

              <!-- Group 3: Privacy & Security -->
              <div class="ops-section">
                <div class="ops-section-title">3. Privacy & Security</div>
                <label class="ops-checkbox-label">
                  <input type="checkbox" [ngModel]="options().maskSensitive" (ngModelChange)="updateOption('maskSensitive', $event)" />
                  <span>Mask Sensitive Fields (password, token → ••••••)</span>
                </label>

                @if (options().maskSensitive) {
                  <div class="ops-input-col">
                    <span class="ops-input-label">Custom Sensitive Field Patterns:</span>
                    <input
                      type="text"
                      class="ops-text-input"
                      [ngModel]="options().customSensitivePatterns"
                      (ngModelChange)="updateOption('customSensitivePatterns', $event)"
                      placeholder="e.g. ssn, creditCard, customSecret"
                    />
                  </div>
                }

                <div class="ops-privacy-toggle-row">
                  <button class="ops-mini-btn" (click)="toggleRevealSecrets()" [class.active]="showRevealedSecrets()">
                    <app-icon [name]="showRevealedSecrets() ? 'eye' : 'eye-off'" class="icon-xs"></app-icon>
                    <span>{{ showRevealedSecrets() ? 'Secrets Revealed' : 'Secrets Masked (' + maskedSecretsCount() + ')' }}</span>
                  </button>
                </div>
              </div>

              <!-- Group 4: Panel Actions Footer -->
              <div class="ops-footer">
                <button class="ops-reset-btn" (click)="resetOptionsToDefaults()">
                  <app-icon name="rotate-ccw" class="icon-xs"></app-icon>
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          }
        </div>

        @if (options().maskSensitive) {
          <button
            class="diff-option-btn privacy-eye-btn"
            [class.revealed]="showRevealedSecrets()"
            (click)="toggleRevealSecrets()"
            [attr.data-tooltip]="showRevealedSecrets() ? 'Click to mask sensitive fields (••••••)' : 'Click to temporarily reveal sensitive fields'"
          >
            <app-icon [name]="showRevealedSecrets() ? 'eye' : 'eye-off'" class="icon-xs text-amber-400"></app-icon>
            <span>{{ showRevealedSecrets() ? 'Revealed' : 'Masked (' + maskedSecretsCount() + ')' }}</span>
          </button>
        }

        <!-- Fold Unchanged Toggle -->
        <button
          class="diff-option-btn"
          [class.active]="foldUnchanged()"
          (click)="foldUnchanged.set(!foldUnchanged())"
          [attr.data-tooltip]="foldUnchanged() ? 'Collapse unchanged lines to focus on differences' : 'Show full document with all unchanged lines expanded'"
        >
          <app-icon [name]="foldUnchanged() ? 'fold-vertical' : 'unfold-vertical'" class="icon-xs"></app-icon>
          <span>{{ foldUnchanged() ? 'Fold Unchanged' : 'Show All' }}</span>
        </button>

        <!-- Change Navigation Controls -->
        @if (activeStats().totalChanges > 0) {
          <div class="diff-nav-group">
            <button
              class="diff-nav-btn"
              [disabled]="currentChangeIdx() <= 0"
              (click)="goToPrevChange()"
              data-tooltip="Jump to previous difference (Cmd/Ctrl + Up)"
            >
              <app-icon name="chevron-up" class="icon-xs"></app-icon>
            </button>
            <span class="diff-nav-badge">
              Change {{ currentChangeIdx() + 1 }} of {{ activeStats().totalChanges }}
            </span>
            <button
              class="diff-nav-btn"
              [disabled]="currentChangeIdx() >= activeStats().totalChanges - 1"
              (click)="goToNextChange()"
              data-tooltip="Jump to next difference (Cmd/Ctrl + Down)"
            >
              <app-icon name="chevron-down" class="icon-xs"></app-icon>
            </button>

            <div class="diff-nav-divider"></div>
          </div>
        }
      </div>

      <!-- Diff Stats Bar & Filter Pills -->
      <div class="diff-stats-bar">
        @if (activeStats().identical) {
          <span class="diff-stat-badge diff-stat-identical">✓ Identical — no differences found</span>
        } @else {
          <div class="diff-stat-counts">
            @if (activeStats().addedCount > 0) {
              <span class="diff-stat-badge diff-stat-added">+{{ activeStats().addedCount }} additions</span>
            }
            @if (activeStats().removedCount > 0) {
              <span class="diff-stat-badge diff-stat-removed">−{{ activeStats().removedCount }} deletions</span>
            }
            @if (activeStats().modifiedCount > 0) {
              <span class="diff-stat-badge diff-stat-modified">~ {{ activeStats().modifiedCount }} modified</span>
            }
            @if (activeStats().movedCount > 0) {
              <span class="diff-stat-badge diff-stat-moved">→ {{ activeStats().movedCount }} moved</span>
            }
          </div>
        }

        <!-- Change Filter Pills -->
        <div class="change-filter-pills">
          <button
            class="filter-pill"
            [class.active]="changeFilter() === 'all'"
            (click)="setFilter('all')"
            data-tooltip="Show all change types and lines"
          >
            All
          </button>
          <button
            class="filter-pill pill-added"
            [class.active]="changeFilter() === 'added'"
            (click)="setFilter('added')"
            data-tooltip="Filter view to show only added lines (+)"
          >
            Additions (+)
          </button>
          <button
            class="filter-pill pill-removed"
            [class.active]="changeFilter() === 'removed'"
            (click)="setFilter('removed')"
            data-tooltip="Filter view to show only deleted lines (−)"
          >
            Deletions (−)
          </button>
          <button
            class="filter-pill pill-changed"
            [class.active]="changeFilter() === 'changed'"
            (click)="setFilter('changed')"
            data-tooltip="Filter view to show only modified lines (~)"
          >
            Modified (~)
          </button>
          @if (activeStats().movedCount > 0) {
            <button
              class="filter-pill pill-moved"
              [class.active]="changeFilter() === 'moved'"
              (click)="setFilter('moved')"
              data-tooltip="Filter view to show only moved and renamed keys (→)"
            >
              Moved (→)
            </button>
          }
        </div>
      </div>

      <!-- Main Workspace Views -->
      @if (viewMode() === 'split') {
        @if (diffMode() === 'textual') {
          <!-- Unified Side-by-Side Editable Diff Editor Workspace -->
          <div class="diff-split-workspace">
            <div class="diff-editors-grid">
              <!-- Left Editor Pane: Original -->
              <div
                class="diff-editor-pane left-pane"
                [class.drag-active-neon]="isLeftDragging()"
                (dragover)="onLeftDragOver($event)"
                (dragleave)="onLeftDragLeave($event)"
                (drop)="onLeftDrop($event)"
              >
                <div class="diff-pane-header">
                  <div class="header-left">
                    <app-icon name="file-code" class="icon-xs text-brand-400"></app-icon>
                    <span>Original (Left)</span>
                    <span class="line-count-badge">{{ leftPaneLines().length }} lines</span>
                    @if (leftDetectedFormatLabel()) {
                      <div class="diff-format-detect-badge" [attr.data-tooltip]="'Detected format: ' + leftDetectedFormatLabel()">
                        <span class="detect-dot"></span>
                        <span class="detect-text">{{ leftDetectedFormatLabel() }}</span>
                      </div>
                    }
                  </div>
                  <div class="header-right">
                    <button class="panel-btn icon-only-btn" (click)="onCopyLeft()" data-tooltip="Copy Original text" [disabled]="!leftText()">
                      <app-icon name="copy" class="icon-xs"></app-icon>
                    </button>
                    <button class="panel-btn icon-only-btn" (click)="onExportLeft()" data-tooltip="Export Original file" [disabled]="!leftText()">
                      <app-icon name="download" class="icon-xs"></app-icon>
                    </button>
                    <button class="panel-btn icon-only-btn diff-clear-btn" (click)="onClearLeft()" data-tooltip="Clear Original input text" [disabled]="!leftText()">
                      <app-icon name="trash-2" class="icon-xs"></app-icon>
                    </button>
                  </div>
                </div>

                <div class="diff-code-editor">
                  <!-- Gutter with line numbers and +/- markers -->
                  <div class="diff-gutter-column" #leftGutter>
                    @for (line of visibleLeftLines(); track $index) {
                      @if (line.isFoldPlaceholder) {
                        <div class="diff-gutter-row gutter-fold" (click)="expandAllFolds()">⋯</div>
                      } @else {
                        <div
                          class="diff-gutter-row"
                          [class.gutter-removed]="line.type === 'removed'"
                          [class.gutter-modified]="line.type === 'modified'"
                          [class.is-active-change]="line.isCurrentActiveChange"
                        >
                          <span class="diff-gutter-num">{{ line.lineNum }}</span>
                          <span class="diff-gutter-sym">{{ line.marker }}</span>
                          @if (line.isFoldable) {
                            <button
                              type="button"
                              class="diff-fold-btn"
                              (click)="toggleLeftFoldLine(line.lineNum); $event.stopPropagation()"
                            >
                              <app-icon [name]="line.isFolded ? 'chevron-right' : 'chevron-down'" class="icon-xs"></app-icon>
                            </button>
                          }
                        </div>
                      }
                    }
                  </div>

                  <!-- Textarea with Live Diff Highlights underlay -->
                  <div class="diff-editor-wrapper">
                    @if (!leftText() || leftText().trim() === '') {
                      <div class="empty-watermark-container">
                        <div class="empty-watermark-icon-box">
                          <app-icon name="file-text" class="empty-watermark-icon"></app-icon>
                        </div>
                        <div class="empty-watermark-title">Original (Base JSON)</div>
                        <div class="empty-watermark-subtitle">Paste, type, or drop the baseline JSON document here</div>
                      </div>
                    }

                    <div class="diff-highlight-layer" #leftHighlight aria-hidden="true">
                      @if (visibleLeftLines().length === 0 && leftText().trim() !== '') {
                        <div class="diff-filtered-empty">
                          <app-icon name="check-circle" class="icon-sm text-emerald-500"></app-icon>
                          <span>No {{ changeFilterLabel() }} in original document</span>
                        </div>
                      } @else {
                        @for (line of visibleLeftLines(); track $index) {
                          @if (line.isFoldPlaceholder) {
                            <div class="diff-hl-line fold-strip" (click)="expandAllFolds()">
                              <span class="fold-text">⋯ {{ line.foldCount }} lines hidden (click to expand) ⋯</span>
                            </div>
                          } @else {
                            <div
                              class="diff-hl-line"
                              [class.line-removed]="line.type === 'removed'"
                              [class.line-modified]="line.type === 'modified'"
                              [class.is-active-change]="line.isCurrentActiveChange"
                            >
                              @for (seg of line.segments; track $index) {
                                @if (seg.isIndentGuide) {
                                  <span class="indent-guide">{{ seg.text }}</span>
                                } @else if (seg.type === 'removed') {
                                  <span class="diff-token-changed-left">{{ seg.text }}</span>
                                } @else {
                                  <span class="diff-token-unchanged">{{ seg.text }}</span>
                                }
                              }

                              @if (line.isFolded) {
                                <span class="diff-fold-pill" (click)="toggleLeftFoldLine(line.lineNum)">...</span>
                              }

                              @if (line.isHunkStart && line.hunk) {
                                <button
                                  type="button"
                                  class="diff-inline-hunk-btn inline-hunk-ltr"
                                  (click)="transferHunkLeftToRight(line.hunk)"
                                  [attr.data-tooltip]="line.hunk.type === 'modified' ? 'Apply change to Modified (→)' : 'Copy hunk to Modified (→)'"
                                >
                                  <app-icon name="arrow-right" class="icon-xs"></app-icon>
                                </button>
                              }
                            </div>
                          }
                        }
                      }
                    </div>

                    <textarea
                      #leftTextarea
                      class="diff-editor-textarea"
                      [value]="leftText()"
                      (input)="onLeftInput($any($event.target).value)"
                      (scroll)="onLeftScroll($event)"
                      (click)="onLeftTextareaClick($event)"
                      placeholder="Paste, type, or drop original JSON..."
                      spellcheck="false"
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- Right Editor Pane: Modified -->
              <div
                class="diff-editor-pane right-pane"
                [class.drag-active-neon]="isRightDragging()"
                (dragover)="onRightDragOver($event)"
                (dragleave)="onRightDragLeave($event)"
                (drop)="onRightDrop($event)"
              >
                <div class="diff-pane-header">
                  <div class="header-left">
                    <app-icon name="file-code-2" class="icon-xs text-emerald-400"></app-icon>
                    <span>Modified (Right)</span>
                    <span class="line-count-badge">{{ rightPaneLines().length }} lines</span>
                    @if (rightDetectedFormatLabel()) {
                      <div class="diff-format-detect-badge" [attr.data-tooltip]="'Detected format: ' + rightDetectedFormatLabel()">
                        <span class="detect-dot"></span>
                        <span class="detect-text">{{ rightDetectedFormatLabel() }}</span>
                      </div>
                    }
                  </div>
                  <div class="header-right">
                    <button class="panel-btn icon-only-btn" (click)="onCopyRight()" data-tooltip="Copy Modified text" [disabled]="!rightText()">
                      <app-icon name="copy" class="icon-xs"></app-icon>
                    </button>
                    <button class="panel-btn icon-only-btn" (click)="onExportRight()" data-tooltip="Export Modified file" [disabled]="!rightText()">
                      <app-icon name="download" class="icon-xs"></app-icon>
                    </button>
                    <button class="panel-btn icon-only-btn diff-clear-btn" (click)="onClearRight()" data-tooltip="Clear Modified input text" [disabled]="!rightText()">
                      <app-icon name="trash-2" class="icon-xs"></app-icon>
                    </button>
                  </div>
                </div>

                <div class="diff-code-editor">
                  <!-- Gutter with line numbers and +/- markers -->
                  <div class="diff-gutter-column" #rightGutter>
                    @for (line of visibleRightLines(); track $index) {
                      @if (line.isFoldPlaceholder) {
                        <div class="diff-gutter-row gutter-fold" (click)="expandAllFolds()">⋯</div>
                      } @else {
                        <div
                          class="diff-gutter-row"
                          [class.gutter-added]="line.type === 'added'"
                          [class.gutter-modified]="line.type === 'modified'"
                          [class.is-active-change]="line.isCurrentActiveChange"
                        >
                          <span class="diff-gutter-num">{{ line.lineNum }}</span>
                          <span class="diff-gutter-sym">{{ line.marker }}</span>
                          @if (line.isFoldable) {
                            <button
                              type="button"
                              class="diff-fold-btn"
                              (click)="toggleRightFoldLine(line.lineNum); $event.stopPropagation()"
                            >
                              <app-icon [name]="line.isFolded ? 'chevron-right' : 'chevron-down'" class="icon-xs"></app-icon>
                            </button>
                          }
                        </div>
                      }
                    }
                  </div>

                  <!-- Textarea with Live Diff Highlights underlay -->
                  <div class="diff-editor-wrapper">
                    @if (!rightText() || rightText().trim() === '') {
                      <div class="empty-watermark-container">
                        <div class="empty-watermark-icon-box">
                          <app-icon name="file-code" class="empty-watermark-icon"></app-icon>
                        </div>
                        <div class="empty-watermark-title">Modified (Comparison JSON)</div>
                        <div class="empty-watermark-subtitle">Paste, type, or drop the revised JSON document here</div>
                      </div>
                    }

                    <div class="diff-highlight-layer" #rightHighlight aria-hidden="true">
                      @if (visibleRightLines().length === 0 && rightText().trim() !== '') {
                        <div class="diff-filtered-empty">
                          <app-icon name="check-circle" class="icon-sm text-emerald-500"></app-icon>
                          <span>No {{ changeFilterLabel() }} in modified document</span>
                        </div>
                      } @else {
                        @for (line of visibleRightLines(); track $index) {
                          @if (line.isFoldPlaceholder) {
                            <div class="diff-hl-line fold-strip" (click)="expandAllFolds()">
                              <span class="fold-text">⋯ {{ line.foldCount }} lines hidden (click to expand) ⋯</span>
                            </div>
                          } @else {
                            <div
                              class="diff-hl-line"
                              [class.line-added]="line.type === 'added'"
                              [class.line-modified]="line.type === 'modified'"
                              [class.is-active-change]="line.isCurrentActiveChange"
                            >
                              @for (seg of line.segments; track $index) {
                                @if (seg.isIndentGuide) {
                                  <span class="indent-guide">{{ seg.text }}</span>
                                } @else if (seg.type === 'added') {
                                  <span class="diff-token-changed-right">{{ seg.text }}</span>
                                } @else {
                                  <span class="diff-token-unchanged">{{ seg.text }}</span>
                                }
                              }

                              @if (line.isFolded) {
                                <span class="diff-fold-pill" (click)="toggleRightFoldLine(line.lineNum)">...</span>
                              }

                              @if (line.isHunkStart && line.hunk) {
                                <button
                                  type="button"
                                  class="diff-inline-hunk-btn inline-hunk-rtl"
                                  (click)="transferHunkRightToLeft(line.hunk)"
                                  [attr.data-tooltip]="line.hunk.type === 'modified' ? 'Revert to Original (←)' : 'Revert addition (←)'"
                                >
                                  <app-icon name="arrow-left" class="icon-xs"></app-icon>
                                </button>
                              }
                            </div>
                          }
                        }
                      }
                    </div>

                    <textarea
                      #rightTextarea
                      class="diff-editor-textarea"
                      [value]="rightText()"
                      (input)="onRightInput($any($event.target).value)"
                      (scroll)="onRightScroll($event)"
                      (click)="onRightTextareaClick($event)"
                      placeholder="Paste, type, or drop modified JSON..."
                      spellcheck="false"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <!-- Structural AST View -->
          <div class="diff-split-canvas">
            @if (filteredStructuralNodes().length > 0) {
              <div class="structural-diff-list">
                @for (node of filteredStructuralNodes(); track node.path) {
                  <div class="structural-node" [ngClass]="'node-' + node.type">
                    <span class="node-icon">{{ node.type === 'added' ? '+' : node.type === 'removed' ? '−' : node.type === 'moved' ? '→' : '~' }}</span>
                    <span class="node-path">{{ node.path }}</span>
                    @if (node.type === 'moved') {
                      <span class="node-moved-from">(moved from {{ node.fromPath }})</span>
                    }
                    @if (node.type === 'removed' || node.type === 'changed') {
                      <span class="node-val old-val">{{ node.leftValue | json }}</span>
                    }
                    @if (node.type === 'changed') {
                      <span class="node-arrow">→</span>
                    }
                    @if (node.type === 'added' || node.type === 'changed' || node.type === 'moved') {
                      <span class="node-val new-val">{{ node.rightValue | json }}</span>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="empty-watermark-container">
                <div class="empty-watermark-icon-box">
                  <app-icon name="network" class="empty-watermark-icon"></app-icon>
                </div>
                <div class="empty-watermark-title">
                  {{ leftText() || rightText() ? 'Identical Structure' : 'No Structure to Compare' }}
                </div>
                <div class="empty-watermark-subtitle">
                  {{ leftText() || rightText() ? 'Both documents have identical keys and values under current comparison rules.' : 'Paste JSON, YAML, XML, or TOML on both sides to compute abstract syntax tree differences.' }}
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <!-- Change Summary Table View -->
        <div class="summary-table-workspace">
          <div class="summary-table-toolbar">
            <span class="summary-table-title">Change Summary Table ({{ filteredStructuralNodes().length }} entries)</span>
            <button class="diff-action-btn" (click)="exportSummaryCsv()" [disabled]="filteredStructuralNodes().length === 0" data-tooltip="Export change summary as CSV spreadsheet">
              <app-icon name="download" class="icon-xs"></app-icon>
              <span>Export CSV</span>
            </button>
          </div>

          <div class="summary-table-container">
            @if (filteredStructuralNodes().length > 0) {
              <table class="summary-table">
                <thead>
                  <tr>
                    <th>JSON Path</th>
                    <th>Change Type</th>
                    <th>Original Value</th>
                    <th>Modified Value</th>
                  </tr>
                </thead>
                <tbody>
                  @for (node of filteredStructuralNodes(); track node.path) {
                    <tr [ngClass]="'row-' + node.type">
                      <td class="cell-path">
                        <code>{{ node.path }}</code>
                        @if (node.type === 'moved') {
                          <span class="moved-badge">moved from {{ node.fromPath }}</span>
                        }
                      </td>
                      <td class="cell-type">
                        <span class="type-badge" [ngClass]="'badge-' + node.type">{{ node.type }}</span>
                      </td>
                      <td class="cell-val old-val-cell">{{ node.leftValue !== undefined ? (node.leftValue | json) : '-' }}</td>
                      <td class="cell-val new-val-cell">{{ node.rightValue !== undefined ? (node.rightValue | json) : '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <div class="empty-watermark-container">
                <div class="empty-watermark-icon-box">
                  <app-icon name="table" class="empty-watermark-icon"></app-icon>
                </div>
                <div class="empty-watermark-title">
                  {{ leftText() || rightText() ? 'No Differences Detected' : 'No Comparison Data' }}
                </div>
                <div class="empty-watermark-subtitle">
                  {{ leftText() || rightText() ? 'No field-level additions, deletions, or mutations found.' : 'Provide data in the comparison editors to generate a structured change summary table.' }}
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensDiffComponent {
  leftText = input<string>('');
  rightText = input<string>('');

  leftTextChange = output<string>();
  rightTextChange = output<string>();

  toastTriggered = output<string>();

  @ViewChild('leftTextarea') leftTextareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('rightTextarea') rightTextareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('leftHighlight') leftHighlightRef?: ElementRef<HTMLDivElement>;
  @ViewChild('rightHighlight') rightHighlightRef?: ElementRef<HTMLDivElement>;
  @ViewChild('leftGutter') leftGutterRef?: ElementRef<HTMLDivElement>;
  @ViewChild('rightGutter') rightGutterRef?: ElementRef<HTMLDivElement>;

  diffMode = signal<'textual' | 'structural'>('textual');
  viewMode = signal<DiffViewMode>('split');
  changeFilter = signal<ChangeFilterType>('all');
  foldUnchanged = signal<boolean>(false);
  showOpsMenu = signal<boolean>(false);

  currentChangeIdx = signal<number>(0);

  leftFoldedLineSet = signal<Set<number>>(new Set());
  rightFoldedLineSet = signal<Set<number>>(new Set());

  isLeftDragging = signal<boolean>(false);
  isRightDragging = signal<boolean>(false);

  tabSize = signal<number>(2);
  showRevealedSecrets = signal<boolean>(false);
  displayOptions = signal<{
    wordTokenHighlighting: boolean;
    showIndentGuides: boolean;
    showWhitespace: boolean;
  }>({
    wordTokenHighlighting: true,
    showIndentGuides: true,
    showWhitespace: false
  });

  readonly leftDetectedFormatLabel = computed<string>(() => {
    const text = (this.leftText() || '').trim();
    if (!text) return '';
    return this.detectConfidentFormat(text);
  });

  readonly rightDetectedFormatLabel = computed<string>(() => {
    const text = (this.rightText() || '').trim();
    if (!text) return '';
    return this.detectConfidentFormat(text);
  });

  /**
   * Confidence-gated format/content-type detector.
   * Returns display label (e.g. 'JSON', 'YAML', 'XML', 'TOML', 'CSV', 'Python', 'Java', 'TypeScript', 'SQL')
   * ONLY when confident. If ambiguous, unparseable, or plain unstructured text, returns empty string ''.
   */
  private detectConfidentFormat(text: string): string {
    if (!text || text.length === 0) return '';

    // 1. HIGH CONFIDENCE: JSON (Must parse cleanly)
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']')) ||
        (text.startsWith('"') && text.endsWith('"') && text.length > 2)) {
      try {
        JSON.parse(text);
        return 'JSON';
      } catch {
        // Not valid JSON
      }
    }

    // 2. HIGH CONFIDENCE: XML (Explicit <?xml declaration or well-formed single root element)
    if (/^<\?xml/i.test(text)) {
      return 'XML';
    }
    if (text.startsWith('<') && text.endsWith('>') && text.includes('</')) {
      const match = text.match(/^<([a-zA-Z0-9_\-:]+)(?:\s+[^>]*)?>[\s\S]*<\/\1>$/);
      if (match) {
        return 'XML';
      }
    }

    // 3. HIGH CONFIDENCE: cURL Command
    if (/^curl\s+('|"|https?:|-X|-H)/i.test(text)) {
      return 'cURL';
    }

    // 4. HIGH CONFIDENCE: YAML (Explicit document marker '---' or structured key-value pairs that parse via YAML library)
    if (text.startsWith('---') || text.startsWith('%YAML')) {
      try {
        const parsed = parseYaml(text);
        if (parsed && typeof parsed === 'object') return 'YAML';
      } catch {
        // Fall through
      }
    } else if (text.includes(':') && text.includes('\n') && !text.includes(';') && !text.includes('class ') && !text.includes('function ')) {
      // Check if it has genuine YAML key-value hierarchy and parses without being just a random sentence
      if (/^[a-zA-Z0-9_-]+\s*:\s*.+/m.test(text) && !/^[a-zA-Z0-9_]+\s*:\s*[a-zA-Z0-9_<>\[\]]+\s*[;=]/m.test(text)) {
        try {
          const parsed = parseYaml(text);
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            // Must have at least one key with colon structure not purely JSON
            return 'YAML';
          }
        } catch {
          // Fall through
        }
      }
    }

    // 5. HIGH CONFIDENCE: TOML ([section] header or typed key = value syntax)
    if (/^\s*\[[a-zA-Z0-9_.-]+\]\s*$/m.test(text) || (/^[a-zA-Z0-9_-]+\s*=\s*(".*"|'.*'|\d+|true|false|\[.*\])\s*$/m.test(text) && text.includes('\n'))) {
      return 'TOML';
    }

    // 6. HIGH CONFIDENCE: CSV (Consistent delimited columns across multiple lines)
    if (text.includes(',') && text.includes('\n')) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length >= 2) {
        const headerCols = lines[0].split(',').length;
        if (headerCols >= 2) {
          const allMatch = lines.slice(1, 10).every(l => l.split(',').length === headerCols);
          if (allMatch && !text.includes('{') && !text.includes(';') && !text.includes('def ') && !text.includes('public ')) {
            return 'CSV';
          }
        }
      }
    }

    // 7. CONSERVATIVE LANGUAGE SIGNATURES (Multiple independent corroborating signals required)
    // Python
    if ((text.includes('def ') || text.includes('class ')) && (text.includes('import ') || text.includes('from ') || text.includes('self.') || text.includes('__init__') || text.includes('print('))) {
      if (!text.includes('function ') && !text.includes('{') && !text.includes('public ')) {
        return 'Python';
      }
    }

    // Java
    if ((text.includes('public class ') || text.includes('private class ') || text.includes('public static void main')) && (text.includes('System.out.print') || text.includes('import java.') || text.includes('package '))) {
      return 'Java';
    }

    // TypeScript / JavaScript
    if ((text.includes('export interface ') || text.includes('export type ') || text.includes('const ') || text.includes('let ') || text.includes('import {')) &&
        (text.includes('function ') || text.includes('=>') || text.includes('return ') || text.includes('console.log'))) {
      if (text.includes(': string') || text.includes(': number') || text.includes(': boolean') || text.includes('interface ')) {
        return 'TypeScript';
      }
      return 'JavaScript';
    }

    // SQL
    if (/^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(text) && /\b(FROM|WHERE|JOIN|VALUES|SET|TABLE)\b/i.test(text)) {
      return 'SQL';
    }

    // No confident match -> Show nothing (rule: absence of label is correct)
    return '';
  }

  readonly suggestedArrayKey = computed<string>(() => {
    const raw = this.leftText() || this.rightText() || '';
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return this.findLikelyIdKey(parsed);
    } catch {
      return '';
    }
  });

  private findLikelyIdKey(obj: any): string {
    if (!obj || typeof obj !== 'object') return '';
    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
        const keys = Object.keys(obj[0]);
        const idKey = keys.find(k => /^(id|_id|uuid|key|email|name|code)$/i.test(k) || k.endsWith('Id') || k.endsWith('_id'));
        if (idKey) return idKey;
      }
      for (const item of obj) {
        const found = this.findLikelyIdKey(item);
        if (found) return found;
      }
    } else {
      for (const k of Object.keys(obj)) {
        if (Array.isArray(obj[k])) {
          const found = this.findLikelyIdKey(obj[k]);
          if (found) return found;
        }
      }
    }
    return '';
  }

  options = signal<DiffOptions>({
    ignoreKeyOrder: true,
    ignoreArrayOrder: false,
    arrayMatchKey: 'id',
    ignoreWhitespace: false,
    typeCoercion: false,
    caseInsensitive: false,
    excludePaths: '',
    maskSensitive: false,
    customSensitivePatterns: '',
    numericTolerance: 0,
    detectMoves: true
  });

  readonly activeOptionsCount = computed<number>(() => {
    const defaults = this.diffService.getDefaultOptions();
    const curr = this.options();
    let count = 0;
    if (curr.ignoreKeyOrder !== defaults.ignoreKeyOrder) count++;
    if (curr.ignoreArrayOrder !== defaults.ignoreArrayOrder) count++;
    if (curr.arrayMatchKey !== defaults.arrayMatchKey && curr.arrayMatchKey !== '') count++;
    if (curr.ignoreWhitespace !== defaults.ignoreWhitespace) count++;
    if (curr.typeCoercion !== defaults.typeCoercion) count++;
    if (curr.caseInsensitive !== defaults.caseInsensitive) count++;
    if (curr.excludePaths !== defaults.excludePaths && curr.excludePaths !== '') count++;
    if (curr.maskSensitive !== defaults.maskSensitive) count++;
    if (curr.customSensitivePatterns !== defaults.customSensitivePatterns && curr.customSensitivePatterns !== '') count++;
    if (curr.numericTolerance !== defaults.numericTolerance && curr.numericTolerance > 0) count++;
    if (curr.detectMoves !== defaults.detectMoves) count++;
    return count;
  });

  readonly maskedSecretsCount = computed<number>(() => {
    if (!this.options().maskSensitive) return 0;
    const l = this.diffService.countMaskedSecrets(this.leftText() || '', this.options().customSensitivePatterns);
    const r = this.diffService.countMaskedSecrets(this.rightText() || '', this.options().customSensitivePatterns);
    return l + r;
  });

  applyPreset(preset: 'strict' | 'lenient') {
    if (preset === 'strict') {
      this.options.set({
        ignoreKeyOrder: false,
        ignoreArrayOrder: false,
        arrayMatchKey: '',
        ignoreWhitespace: false,
        typeCoercion: false,
        caseInsensitive: false,
        excludePaths: '',
        maskSensitive: false,
        customSensitivePatterns: '',
        numericTolerance: 0,
        detectMoves: false
      });
      this.toastTriggered.emit('⚡ Applied "Strict" comparison preset');
    } else if (preset === 'lenient') {
      this.options.set({
        ignoreKeyOrder: true,
        ignoreArrayOrder: true,
        arrayMatchKey: this.suggestedArrayKey() || 'id',
        ignoreWhitespace: true,
        typeCoercion: true,
        caseInsensitive: true,
        excludePaths: '',
        maskSensitive: false,
        customSensitivePatterns: '',
        numericTolerance: 0.01,
        detectMoves: true
      });
      this.toastTriggered.emit('⚡ Applied "Lenient API" comparison preset');
    }
  }

  resetOptionsToDefaults() {
    this.options.set(this.diffService.getDefaultOptions());
    this.toastTriggered.emit('⚡ Reset diff options to shipped defaults');
  }

  private diffService = inject(DataLensDiffService);
  private dataLensService = inject(DataLensService);
  private isSyncingScroll = false;

  readonly effectiveLeftText = computed<string>(() => {
    const raw = this.leftText() || '';
    if (this.options().maskSensitive && !this.showRevealedSecrets()) {
      return this.diffService.maskSensitiveText(raw, this.options().customSensitivePatterns);
    }
    return raw;
  });

  readonly effectiveRightText = computed<string>(() => {
    const raw = this.rightText() || '';
    if (this.options().maskSensitive && !this.showRevealedSecrets()) {
      return this.diffService.maskSensitiveText(raw, this.options().customSensitivePatterns);
    }
    return raw;
  });

  readonly diffResult = computed<DiffComputationResult>(() => {
    return this.diffService.computeLineDiff(
      this.effectiveLeftText(),
      this.effectiveRightText(),
      this.foldUnchanged()
    );
  });

  readonly hunks = computed<DiffHunk[]>(() => {
    return this.diffResult().hunks || [];
  });

  private computeBlockFolds(raw: string) {
    if (!raw) return { isFoldableMap: new Map<number, boolean>(), closingLineMap: new Map<number, number>() };
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

    return { isFoldableMap, closingLineMap };
  }

  readonly leftPaneLines = computed<DiffPaneDisplayLine[]>(() => {
    const raw = this.effectiveLeftText();
    const lines = raw.split('\n');
    const diffLines = this.diffResult().lines;
    const diffMap = new Map<number, DiffLineItem>();

    diffLines.forEach(item => {
      if (item.leftLineNum !== undefined) {
        diffMap.set(item.leftLineNum, item);
      }
    });

    const hunkMap = new Map<number, DiffHunk>();
    const hunks = this.diffResult().hunks || [];
    hunks.forEach(h => {
      if (h.leftStartLine !== undefined && h.leftEndLine !== undefined) {
        for (let l = h.leftStartLine; l <= h.leftEndLine; l++) {
          hunkMap.set(l, h);
        }
      }
    });

    const { isFoldableMap } = this.computeBlockFolds(raw);
    const foldedSet = this.leftFoldedLineSet();

    return lines.map((lineText, idx) => {
      const lineNum = idx + 1;
      const item = diffMap.get(lineNum);
      const type = item?.type || 'unchanged';
      const marker = type === 'removed' ? '−' : type === 'modified' ? '~' : '';
      const tokens = type === 'modified' ? item?.leftTokens : undefined;
      const segments = this.diffService.sliceLineIntoSegments(
        lineText,
        type,
        tokens,
        this.tabSize(),
        this.displayOptions().wordTokenHighlighting
      );
      const isCurrentActiveChange = this.isLineInActiveChange(lineNum, 'left');
      const hunk = hunkMap.get(lineNum);
      const isHunkStart = hunk && hunk.leftStartLine === lineNum;
      const isFoldable = isFoldableMap.get(lineNum) || false;
      const isFolded = foldedSet.has(lineNum);

      return {
        lineNum,
        text: lineText,
        type,
        tokens,
        segments,
        marker,
        isCurrentActiveChange,
        hunk,
        isHunkStart,
        isFoldable,
        isFolded
      };
    });
  });

  readonly rightPaneLines = computed<DiffPaneDisplayLine[]>(() => {
    const raw = this.effectiveRightText();
    const lines = raw.split('\n');
    const diffLines = this.diffResult().lines;
    const diffMap = new Map<number, DiffLineItem>();

    diffLines.forEach(item => {
      if (item.rightLineNum !== undefined) {
        diffMap.set(item.rightLineNum, item);
      }
    });

    const hunkMap = new Map<number, DiffHunk>();
    const hunks = this.diffResult().hunks || [];
    hunks.forEach(h => {
      if (h.rightStartLine !== undefined && h.rightEndLine !== undefined) {
        for (let l = h.rightStartLine; l <= h.rightEndLine; l++) {
          hunkMap.set(l, h);
        }
      }
    });

    const { isFoldableMap } = this.computeBlockFolds(raw);
    const foldedSet = this.rightFoldedLineSet();

    return lines.map((lineText, idx) => {
      const lineNum = idx + 1;
      const item = diffMap.get(lineNum);
      const type = item?.type || 'unchanged';
      const marker = type === 'added' ? '+' : type === 'modified' ? '~' : '';
      const tokens = type === 'modified' ? item?.rightTokens : undefined;
      const segments = this.diffService.sliceLineIntoSegments(
        lineText,
        type,
        tokens,
        this.tabSize(),
        this.displayOptions().wordTokenHighlighting
      );
      const isCurrentActiveChange = this.isLineInActiveChange(lineNum, 'right');
      const hunk = hunkMap.get(lineNum);
      const isHunkStart = hunk && hunk.rightStartLine === lineNum;
      const isFoldable = isFoldableMap.get(lineNum) || false;
      const isFolded = foldedSet.has(lineNum);

      return {
        lineNum,
        text: lineText,
        type,
        tokens,
        segments,
        marker,
        isCurrentActiveChange,
        hunk,
        isHunkStart,
        isFoldable,
        isFolded
      };
    });
  });

  readonly visibleLeftLines = computed<DiffPaneDisplayLine[]>(() => {
    const all = this.leftPaneLines();
    const raw = this.effectiveLeftText();
    const { closingLineMap } = this.computeBlockFolds(raw);
    const foldedSet = this.leftFoldedLineSet();

    const filter = this.changeFilter();
    let lines = all;
    if (filter !== 'all') {
      const targetType = filter === 'added' ? 'added' : filter === 'removed' ? 'removed' : filter === 'changed' ? 'modified' : null;
      if (targetType) {
        lines = all.filter(l => l.type === targetType);
      }
    }

    if (foldedSet.size === 0) return lines;

    const visible: DiffPaneDisplayLine[] = [];
    let skipUntilLine = -1;

    for (const line of lines) {
      if (skipUntilLine !== -1) {
        if (line.lineNum <= skipUntilLine) {
          continue;
        } else {
          skipUntilLine = -1;
        }
      }

      if (line.isFolded && line.isFoldable) {
        const closeLine = closingLineMap.get(line.lineNum) || line.lineNum;
        visible.push(line);
        skipUntilLine = closeLine;
      } else {
        visible.push(line);
      }
    }

    return visible;
  });

  readonly visibleRightLines = computed<DiffPaneDisplayLine[]>(() => {
    const all = this.rightPaneLines();
    const raw = this.effectiveRightText();
    const { closingLineMap } = this.computeBlockFolds(raw);
    const foldedSet = this.rightFoldedLineSet();

    const filter = this.changeFilter();
    let lines = all;
    if (filter !== 'all') {
      const targetType = filter === 'added' ? 'added' : filter === 'removed' ? 'removed' : filter === 'changed' ? 'modified' : null;
      if (targetType) {
        lines = all.filter(l => l.type === targetType);
      }
    }

    if (foldedSet.size === 0) return lines;

    const visible: DiffPaneDisplayLine[] = [];
    let skipUntilLine = -1;

    for (const line of lines) {
      if (skipUntilLine !== -1) {
        if (line.lineNum <= skipUntilLine) {
          continue;
        } else {
          skipUntilLine = -1;
        }
      }

      if (line.isFolded && line.isFoldable) {
        const closeLine = closingLineMap.get(line.lineNum) || line.lineNum;
        visible.push(line);
        skipUntilLine = closeLine;
      } else {
        visible.push(line);
      }
    }

    return visible;
  });

  toggleLeftFoldLine(lineNum: number) {
    const leftSet = new Set(this.leftFoldedLineSet());
    const rightSet = new Set(this.rightFoldedLineSet());
    const isNowFolded = !leftSet.has(lineNum);

    if (isNowFolded) {
      leftSet.add(lineNum);
    } else {
      leftSet.delete(lineNum);
    }
    this.leftFoldedLineSet.set(leftSet);

    // Sync fold state with matching line on Right pane
    const diffLines = this.diffResult().lines;
    const match = diffLines.find(item => item.leftLineNum === lineNum);
    if (match && match.rightLineNum) {
      if (isNowFolded) {
        rightSet.add(match.rightLineNum);
      } else {
        rightSet.delete(match.rightLineNum);
      }
      this.rightFoldedLineSet.set(rightSet);
    }
  }

  toggleRightFoldLine(lineNum: number) {
    const leftSet = new Set(this.leftFoldedLineSet());
    const rightSet = new Set(this.rightFoldedLineSet());
    const isNowFolded = !rightSet.has(lineNum);

    if (isNowFolded) {
      rightSet.add(lineNum);
    } else {
      rightSet.delete(lineNum);
    }
    this.rightFoldedLineSet.set(rightSet);

    // Sync fold state with matching line on Left pane
    const diffLines = this.diffResult().lines;
    const match = diffLines.find(item => item.rightLineNum === lineNum);
    if (match && match.leftLineNum) {
      if (isNowFolded) {
        leftSet.add(match.leftLineNum);
      } else {
        leftSet.delete(match.leftLineNum);
      }
      this.leftFoldedLineSet.set(leftSet);
    }
  }

  private parseToStructuredData(text: string): any {
    const raw = (text || '').trim();
    if (!raw) return null;

    // 1. Try native JSON parse
    try {
      return JSON.parse(raw);
    } catch {}

    // 2. Try YAML parse
    try {
      const parsedYaml = parseYaml(raw);
      if (parsedYaml !== undefined && parsedYaml !== null && typeof parsedYaml === 'object') {
        return parsedYaml;
      }
    } catch {}

    // 3. Try XML parse
    try {
      if (raw.startsWith('<') && raw.includes('>')) {
        const parsedXml = this.dataLensService.xmlToJson(raw);
        if (parsedXml && typeof parsedXml === 'object' && Object.keys(parsedXml).length > 0) {
          return parsedXml;
        }
      }
    } catch {}

    // 4. Try TOML parse
    try {
      const tomlRes = this.dataLensService.parseToml(raw);
      if (tomlRes.success && tomlRes.data && Object.keys(tomlRes.data).length > 0) {
        return tomlRes.data;
      }
    } catch {}

    return null;
  }

  readonly structuralDiffNodes = computed<StructuralDiffNode[]>(() => {
    const leftObj = this.parseToStructuredData(this.effectiveLeftText());
    const rightObj = this.parseToStructuredData(this.effectiveRightText());

    if (!leftObj && !rightObj) return [];
    return this.diffService.computeStructuralDiff(leftObj, rightObj, this.options());
  });

  readonly filteredStructuralNodes = computed<StructuralDiffNode[]>(() => {
    const nodes = this.structuralDiffNodes().filter(n => n.type !== 'unchanged');
    const filter = this.changeFilter();
    if (filter === 'all') return nodes;
    return nodes.filter(n => n.type === filter);
  });

  readonly activeStats = computed(() => {
    if (this.diffMode() === 'structural') {
      const nodes = this.structuralDiffNodes().filter(n => n.type !== 'unchanged');
      const addedCount = nodes.filter(n => n.type === 'added').length;
      const removedCount = nodes.filter(n => n.type === 'removed').length;
      const modifiedCount = nodes.filter(n => n.type === 'changed').length;
      const movedCount = nodes.filter(n => n.type === 'moved').length;
      const totalChanges = addedCount + removedCount + modifiedCount + movedCount;
      return {
        addedCount,
        removedCount,
        modifiedCount,
        movedCount,
        totalChanges,
        identical: totalChanges === 0
      };
    }
    return {
      addedCount: this.diffResult().addedCount,
      removedCount: this.diffResult().removedCount,
      modifiedCount: this.diffResult().modifiedCount,
      movedCount: 0,
      totalChanges: this.diffResult().totalChanges,
      identical: this.diffResult().identical
    };
  });

  isLineInActiveChange(lineNum: number, side: 'left' | 'right'): boolean {
    const total = this.activeStats().totalChanges;
    if (total === 0) return false;
    const changeIdx = this.currentChangeIdx();
    const changeIndices = this.diffResult().changeIndices;
    const activeItemIdx = changeIndices[changeIdx];
    if (activeItemIdx === undefined) return false;

    const changeItem = this.diffResult().lines[activeItemIdx];
    if (!changeItem) return false;

    if (side === 'left') {
      return changeItem.leftLineNum === lineNum;
    } else {
      return changeItem.rightLineNum === lineNum;
    }
  }

  toggleRevealSecrets() {
    this.showRevealedSecrets.set(!this.showRevealedSecrets());
    if (this.showRevealedSecrets()) {
      this.toastTriggered.emit('👁 Sensitive fields revealed');
    } else {
      this.toastTriggered.emit('🔒 Sensitive fields masked (••••••)');
    }
  }

  updateDisplayOption(key: 'wordTokenHighlighting' | 'showIndentGuides' | 'showWhitespace', val: boolean) {
    this.displayOptions.update(opts => ({ ...opts, [key]: val }));
  }

  transferHunkLeftToRight(hunk: DiffHunk) {
    const leftLines = (this.leftText() || '').split('\n');
    const rightLines = (this.rightText() || '').split('\n');

    if (hunk.type === 'modified' && hunk.leftStartLine && hunk.leftEndLine && hunk.rightStartLine && hunk.rightEndLine) {
      const leftSlice = leftLines.slice(hunk.leftStartLine - 1, hunk.leftEndLine);
      rightLines.splice(hunk.rightStartLine - 1, hunk.rightEndLine - hunk.rightStartLine + 1, ...leftSlice);
    } else if (hunk.type === 'removed' && hunk.leftStartLine && hunk.leftEndLine) {
      const leftSlice = leftLines.slice(hunk.leftStartLine - 1, hunk.leftEndLine);
      const insertIdx = hunk.rightStartLine ? hunk.rightStartLine - 1 : hunk.leftStartLine - 1;
      rightLines.splice(insertIdx, 0, ...leftSlice);
    } else if (hunk.type === 'added' && hunk.rightStartLine && hunk.rightEndLine) {
      rightLines.splice(hunk.rightStartLine - 1, hunk.rightEndLine - hunk.rightStartLine + 1);
    }

    const newRight = rightLines.join('\n');
    this.rightTextChange.emit(newRight);
    this.toastTriggered.emit('⚡ Applied hunk from Original → Modified');
  }

  transferHunkRightToLeft(hunk: DiffHunk) {
    const leftLines = (this.leftText() || '').split('\n');
    const rightLines = (this.rightText() || '').split('\n');

    if (hunk.type === 'modified' && hunk.leftStartLine && hunk.leftEndLine && hunk.rightStartLine && hunk.rightEndLine) {
      const rightSlice = rightLines.slice(hunk.rightStartLine - 1, hunk.rightEndLine);
      leftLines.splice(hunk.leftStartLine - 1, hunk.leftEndLine - hunk.leftStartLine + 1, ...rightSlice);
    } else if (hunk.type === 'added' && hunk.rightStartLine && hunk.rightEndLine) {
      const rightSlice = rightLines.slice(hunk.rightStartLine - 1, hunk.rightEndLine);
      const insertIdx = hunk.leftStartLine ? hunk.leftStartLine - 1 : hunk.rightStartLine - 1;
      leftLines.splice(insertIdx, 0, ...rightSlice);
    } else if (hunk.type === 'removed' && hunk.leftStartLine && hunk.leftEndLine) {
      leftLines.splice(hunk.leftStartLine - 1, hunk.leftEndLine - hunk.leftStartLine + 1);
    }

    const newLeft = leftLines.join('\n');
    this.leftTextChange.emit(newLeft);
    this.toastTriggered.emit('⚡ Applied hunk from Modified → Original');
  }

  transferLeftToRight() {
    const total = this.activeStats().totalChanges;
    if (total === 0) return;
    const changeIdx = this.currentChangeIdx();
    const changeIndices = this.diffResult().changeIndices;
    const activeItemIdx = changeIndices[changeIdx];
    if (activeItemIdx === undefined) return;

    const changeItem = this.diffResult().lines[activeItemIdx];
    if (!changeItem) return;

    const leftLines = (this.leftText() || '').split('\n');
    const rightLines = (this.rightText() || '').split('\n');

    if (changeItem.type === 'modified' && changeItem.leftLineNum && changeItem.rightLineNum) {
      rightLines[changeItem.rightLineNum - 1] = leftLines[changeItem.leftLineNum - 1];
    } else if (changeItem.type === 'removed' && changeItem.leftLineNum) {
      const insertIdx = changeItem.rightLineNum ? changeItem.rightLineNum - 1 : changeItem.leftLineNum - 1;
      rightLines.splice(insertIdx, 0, leftLines[changeItem.leftLineNum - 1]);
    } else if (changeItem.type === 'added' && changeItem.rightLineNum) {
      rightLines.splice(changeItem.rightLineNum - 1, 1);
    }

    const newRight = rightLines.join('\n');
    this.rightTextChange.emit(newRight);
    this.toastTriggered.emit('⚡ Applied change from Original → Modified');
  }

  transferRightToLeft() {
    const total = this.activeStats().totalChanges;
    if (total === 0) return;
    const changeIdx = this.currentChangeIdx();
    const changeIndices = this.diffResult().changeIndices;
    const activeItemIdx = changeIndices[changeIdx];
    if (activeItemIdx === undefined) return;

    const changeItem = this.diffResult().lines[activeItemIdx];
    if (!changeItem) return;

    const leftLines = (this.leftText() || '').split('\n');
    const rightLines = (this.rightText() || '').split('\n');

    if (changeItem.type === 'modified' && changeItem.leftLineNum && changeItem.rightLineNum) {
      leftLines[changeItem.leftLineNum - 1] = rightLines[changeItem.rightLineNum - 1];
    } else if (changeItem.type === 'added' && changeItem.rightLineNum) {
      const insertIdx = changeItem.leftLineNum ? changeItem.leftLineNum - 1 : changeItem.rightLineNum - 1;
      leftLines.splice(insertIdx, 0, rightLines[changeItem.rightLineNum - 1]);
    } else if (changeItem.type === 'removed' && changeItem.leftLineNum) {
      leftLines.splice(changeItem.leftLineNum - 1, 1);
    }

    const newLeft = leftLines.join('\n');
    this.leftTextChange.emit(newLeft);
    this.toastTriggered.emit('⚡ Applied change from Modified → Original');
  }

  setDiffMode(mode: 'textual' | 'structural') {
    this.diffMode.set(mode);
    if (this.changeFilter() === 'moved' && (mode === 'textual' || this.activeStats().movedCount === 0)) {
      this.changeFilter.set('all');
    }
    this.currentChangeIdx.set(0);
  }

  setFilter(filter: ChangeFilterType) {
    this.changeFilter.set(filter);
    this.currentChangeIdx.set(0);
  }

  changeFilterLabel(): string {
    switch (this.changeFilter()) {
      case 'added': return 'additions';
      case 'removed': return 'deletions';
      case 'changed': return 'modifications';
      case 'moved': return 'moved keys';
      default: return 'changes';
    }
  }

  expandAllFolds() {
    this.foldUnchanged.set(false);
    this.leftFoldedLineSet.set(new Set());
    this.rightFoldedLineSet.set(new Set());
    this.changeFilter.set('all');
  }

  onLeftTextareaClick(event: MouseEvent) {
    const textarea = this.leftTextareaRef?.nativeElement;
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();
    const clickY = event.clientY - rect.top + textarea.scrollTop;
    const paddingTop = 8;
    const lineHeight = 20;

    const relativeY = clickY - paddingTop;
    if (relativeY >= 0) {
      const visibleLineIndex = Math.floor(relativeY / lineHeight);
      const visibleLines = this.visibleLeftLines();
      if (visibleLineIndex >= 0 && visibleLineIndex < visibleLines.length) {
        const lineItem = visibleLines[visibleLineIndex];
        if (lineItem && lineItem.isFolded) {
          this.toggleLeftFoldLine(lineItem.lineNum);
        }
      }
    }
  }

  onRightTextareaClick(event: MouseEvent) {
    const textarea = this.rightTextareaRef?.nativeElement;
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();
    const clickY = event.clientY - rect.top + textarea.scrollTop;
    const paddingTop = 8;
    const lineHeight = 20;

    const relativeY = clickY - paddingTop;
    if (relativeY >= 0) {
      const visibleLineIndex = Math.floor(relativeY / lineHeight);
      const visibleLines = this.visibleRightLines();
      if (visibleLineIndex >= 0 && visibleLineIndex < visibleLines.length) {
        const lineItem = visibleLines[visibleLineIndex];
        if (lineItem && lineItem.isFolded) {
          this.toggleRightFoldLine(lineItem.lineNum);
        }
      }
    }
  }

  onLeftInput(val: string) {
    this.leftTextChange.emit(val);
  }

  onRightInput(val: string) {
    this.rightTextChange.emit(val);
  }

  onCopyLeft() {
    const text = this.leftText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.toastTriggered.emit('⚡ Copied Original JSON to clipboard!');
  }

  onCopyRight() {
    const text = this.rightText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    this.toastTriggered.emit('⚡ Copied Modified JSON to clipboard!');
  }

  onExportLeft() {
    const text = this.leftText();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'original.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toastTriggered.emit('⚡ Exported original.json');
  }

  onExportRight() {
    const text = this.rightText();
    if (!text) return;
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modified.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toastTriggered.emit('⚡ Exported modified.json');
  }

  onClearLeft() {
    this.leftTextChange.emit('');
    this.toastTriggered.emit('⚡ Cleared Original input');
  }

  onClearRight() {
    this.rightTextChange.emit('');
    this.toastTriggered.emit('⚡ Cleared Modified input');
  }

  onLeftDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isLeftDragging.set(true);
  }

  onLeftDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isLeftDragging.set(false);
  }

  onLeftDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isLeftDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.readFile(e.dataTransfer.files[0], (content) => {
        this.leftTextChange.emit(content);
        this.toastTriggered.emit('✓ Original JSON imported from file drop');
      });
    }
  }

  onRightDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isRightDragging.set(true);
  }

  onRightDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isRightDragging.set(false);
  }

  onRightDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isRightDragging.set(false);
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.readFile(e.dataTransfer.files[0], (content) => {
        this.rightTextChange.emit(content);
        this.toastTriggered.emit('✓ Modified JSON imported from file drop');
      });
    }
  }

  private readFile(file: File, callback: (text: string) => void) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        callback(text);
      }
    };
    reader.readAsText(file);
  }

  onLeftScroll(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!target) return;

    if (this.leftHighlightRef) {
      this.leftHighlightRef.nativeElement.scrollTop = target.scrollTop;
      this.leftHighlightRef.nativeElement.scrollLeft = target.scrollLeft;
    }
    if (this.leftGutterRef) {
      this.leftGutterRef.nativeElement.scrollTop = target.scrollTop;
    }

    if (this.isSyncingScroll) return;
    this.isSyncingScroll = true;

    if (this.rightTextareaRef) {
      const rightEl = this.rightTextareaRef.nativeElement;
      rightEl.scrollTop = target.scrollTop;
      rightEl.scrollLeft = target.scrollLeft;
      if (this.rightHighlightRef) {
        this.rightHighlightRef.nativeElement.scrollTop = target.scrollTop;
        this.rightHighlightRef.nativeElement.scrollLeft = target.scrollLeft;
      }
      if (this.rightGutterRef) {
        this.rightGutterRef.nativeElement.scrollTop = target.scrollTop;
      }
    }

    requestAnimationFrame(() => {
      this.isSyncingScroll = false;
    });
  }

  onRightScroll(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (!target) return;

    if (this.rightHighlightRef) {
      this.rightHighlightRef.nativeElement.scrollTop = target.scrollTop;
      this.rightHighlightRef.nativeElement.scrollLeft = target.scrollLeft;
    }
    if (this.rightGutterRef) {
      this.rightGutterRef.nativeElement.scrollTop = target.scrollTop;
    }

    if (this.isSyncingScroll) return;
    this.isSyncingScroll = true;

    if (this.leftTextareaRef) {
      const leftEl = this.leftTextareaRef.nativeElement;
      leftEl.scrollTop = target.scrollTop;
      leftEl.scrollLeft = target.scrollLeft;
      if (this.leftHighlightRef) {
        this.leftHighlightRef.nativeElement.scrollTop = target.scrollTop;
        this.leftHighlightRef.nativeElement.scrollLeft = target.scrollLeft;
      }
      if (this.leftGutterRef) {
        this.leftGutterRef.nativeElement.scrollTop = target.scrollTop;
      }
    }

    requestAnimationFrame(() => {
      this.isSyncingScroll = false;
    });
  }

  updateOption<K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) {
    this.options.update(opts => ({ ...opts, [key]: value }));
  }

  goToNextChange() {
    const total = this.activeStats().totalChanges;
    if (total === 0) return;
    const next = Math.min(total - 1, this.currentChangeIdx() + 1);
    this.currentChangeIdx.set(next);
    this.scrollToCurrentChange();
  }

  goToPrevChange() {
    const total = this.activeStats().totalChanges;
    if (total === 0) return;
    const prev = Math.max(0, this.currentChangeIdx() - 1);
    this.currentChangeIdx.set(prev);
    this.scrollToCurrentChange();
  }

  private scrollToCurrentChange() {
    if (this.diffMode() === 'textual') {
      const changeIndices = this.diffResult().changeIndices;
      const activeDisplayIndex = changeIndices[this.currentChangeIdx()];
      if (activeDisplayIndex === undefined) return;

      const lines = this.diffResult().lines;
      const changeItem = lines[activeDisplayIndex];
      if (!changeItem) return;

      const lineNum = changeItem.rightLineNum || changeItem.leftLineNum || 1;
      const lineHeight = 20;
      const targetScroll = Math.max(0, (lineNum - 3) * lineHeight);

      if (this.leftTextareaRef) {
        this.leftTextareaRef.nativeElement.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
      if (this.rightTextareaRef) {
        this.rightTextareaRef.nativeElement.scrollTo({ top: targetScroll, behavior: 'smooth' });
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'ArrowDown') {
      event.preventDefault();
      this.goToNextChange();
    } else if ((event.metaKey || event.ctrlKey) && event.key === 'ArrowUp') {
      event.preventDefault();
      this.goToPrevChange();
    }
  }

  copyUnifiedPatch() {
    const patch = this.diffService.generateUnifiedPatch(this.effectiveLeftText(), this.effectiveRightText());
    navigator.clipboard.writeText(patch);
    this.toastTriggered.emit('⚡ Unified .patch copied to clipboard!');
  }

  exportSummaryCsv() {
    const csv = this.diffService.exportSummaryCsv(this.structuralDiffNodes());
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diff-summary.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toastTriggered.emit('⚡ Exported Change Summary CSV!');
  }
}
