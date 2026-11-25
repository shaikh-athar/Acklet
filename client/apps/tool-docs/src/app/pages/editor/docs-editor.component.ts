// client/apps/tool-docs/src/app/pages/editor/docs-editor.component.ts

import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
  HostListener,
  ViewChildren,
  QueryList,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, Observable, of } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DocService } from '../../services/doc.service';
import { DocsToastService } from '../../services/docs-toast.service';
import { ComponentCanDeactivate } from '../../guards/pending-changes.guard';
import { DocBlock, DocBlockType, MediaLayout, ChecklistItem, TableData, BlockTextFormat } from '../../models/doc.model';
import { DocBlockRendererComponent } from '../../components/doc-block-renderer/doc-block-renderer.component';
import { DocsTooltipComponent } from '../../components/docs-tooltip/docs-tooltip.component';

export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const AUTOSAVE_MAX_INTERVAL_MS = 5000;
export const AUTOSAVE_MIN_INDICATOR_MS = 300;
export const RETRY_BACKOFF_STEPS = [1000, 2000, 4000];

interface ActionPaletteItem {
  id: string;
  icon: string;
  label: string;
  desc: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-docs-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DocBlockRendererComponent, DocsTooltipComponent],
  template: `
    <div
      class="docs-app docs-editor"
      [class.docs-editor--preview]="mode() === 'preview'"
    >
      <!-- ── 56px Top Action Bar (Calm Canvas Topbar) ────────────────────────── -->
      <header class="docs-editor__topbar">
        <div class="docs-editor__topbar-inner">
          <!-- Left: Stories Back Link & Status Badge -->
          <div class="docs-editor__start">
            <a
              routerLink="/stories"
              (click)="onNavigateBack($event)"
              class="docs-editor__back-link"
              title="Return to Stories"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Stories</span>
            </a>
            <span class="docs-editor__divider">/</span>
            <span
              class="docs-badge"
              [class.docs-badge--published]="docStatus() === 'PUBLISHED'"
              [class.docs-badge--draft]="docStatus() !== 'PUBLISHED'"
            >
              {{ docStatus() === 'PUBLISHED' ? 'Published' : 'Draft' }}
            </span>
          </div>

          <!-- Center: Segmented Edit | Preview Toggle with 500ms sliding indicator -->
          <div class="docs-editor__center">
            <div class="docs-editor-mode-toggle" role="tablist" aria-label="Editor View Mode">
              <div
                class="docs-editor-mode-toggle__slider"
                [class.docs-editor-mode-toggle__slider--preview]="mode() === 'preview'"
              ></div>
              <button
                type="button"
                role="tab"
                class="docs-editor-mode-toggle__btn"
                [class.docs-editor-mode-toggle__btn--active]="mode() === 'edit'"
                [attr.aria-selected]="mode() === 'edit'"
                (click)="setMode('edit')"
              >
                Edit
              </button>
              <button
                type="button"
                role="tab"
                class="docs-editor-mode-toggle__btn"
                [class.docs-editor-mode-toggle__btn--active]="mode() === 'preview'"
                [attr.aria-selected]="mode() === 'preview'"
                (click)="setMode('preview')"
              >
                Preview
              </button>
            </div>
          </div>

          <!-- Right: Save Status, Publish Button & Menu -->
          <div class="docs-editor__actions">
            <!-- Save Status Indicator -->
            <div class="docs-editor__save-status" aria-live="polite">
              @if (saveState() === 'saving') {
                <span class="docs-editor__status-text docs-editor__status-text--saving">Saving…</span>
              } @else if (saveState() === 'error') {
                <button
                  type="button"
                  class="docs-editor__retry-btn"
                  (click)="triggerImmediateSave()"
                  title="Save failed. Click to retry"
                >
                  Save failed · Retry
                </button>
              } @else if (saveState() === 'offline') {
                <span class="docs-editor__status-text docs-editor__status-text--offline" title="Offline · Changes saved to device">
                  Offline · Saved to device
                </span>
              } @else if (saveState() === 'dirty') {
                <span class="docs-editor__status-text docs-editor__status-text--dirty" title="Unsaved changes">Unsaved</span>
              } @else {
                <span class="docs-editor__status-text docs-editor__status-text--saved">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="docs-editor__saved-check" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Saved
                </span>
              }
            </div>

            <!-- Publish Button -->
            <button
              type="button"
              class="docs-button docs-button--primary docs-button--sm docs-editor__publish-btn"
              (click)="goToPublish()"
            >
              Publish
            </button>

            <!-- Overflow Action Menu -->
            <div class="docs-editor__menu-wrapper">
              <button
                type="button"
                class="docs-icon-button docs-icon-button--sm docs-icon-button--subtle"
                (click)="toggleMenu($event)"
                aria-label="Story Options"
                title="Story Options"
              >
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" />
                </svg>
              </button>

              @if (isMenuOpen()) {
                <div class="docs-menu docs-editor__dropdown" (click)="$event.stopPropagation()">
                  <!-- Font Family Switcher -->
                  <div class="docs-menu__section-title">Font Family</div>
                  <button type="button" class="docs-menu__item" [class.docs-menu__item--active]="fontFamily() === 'serif'" (click)="setFontFamily('serif')">
                    <span style="font-family: serif; font-size: 15px; width: 16px;">S</span>
                    <span>Serif</span>
                    <span class="docs-menu__shortcut">(Charter)</span>
                  </button>
                  <button type="button" class="docs-menu__item" [class.docs-menu__item--active]="fontFamily() === 'sans'" (click)="setFontFamily('sans')">
                    <span style="font-family: sans-serif; font-size: 13px; font-weight: 600; width: 16px;">A</span>
                    <span>Sans</span>
                    <span class="docs-menu__shortcut">(Host Grotesk)</span>
                  </button>
                  <button type="button" class="docs-menu__item" [class.docs-menu__item--active]="fontFamily() === 'mono'" (click)="setFontFamily('mono')">
                    <span style="font-family: monospace; font-size: 13px; width: 16px;">M</span>
                    <span>Mono</span>
                    <span class="docs-menu__shortcut">(JetBrains)</span>
                  </button>
                  <div class="docs-menu__divider"></div>

                  <!-- Insert Menu Style -->
                  <div class="docs-menu__section-title">Insert Menu</div>
                  <button type="button" class="docs-menu__item" (click)="toggleInsertMenuStyle()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    <span>Insert Layout</span>
                    <span class="docs-menu__shortcut">({{ insertMenuStyle() === 'radial' ? 'Radial' : 'Standard' }})</span>
                  </button>
                  <div class="docs-menu__divider"></div>

                  <button type="button" class="docs-menu__item" (click)="openShortcutsModal()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>Shortcuts</span>
                    <span class="docs-menu__shortcut">(Ctrl+/)</span>
                  </button>
                  <button type="button" class="docs-menu__item" (click)="openActionPalette()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>Command Palette</span>
                    <span class="docs-menu__shortcut">(Ctrl+Shift+K)</span>
                  </button>
                  <div class="docs-menu__divider"></div>
                  <button type="button" class="docs-menu__item" (click)="duplicateStory()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Duplicate Story</span>
                  </button>
                  <div class="docs-menu__divider"></div>
                  <button type="button" class="docs-menu__item docs-menu__item--danger" (click)="promptDelete()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete Story</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </header>

      <!-- ── Hidden ARIA Live Region for Mode Switches ───────────────────── -->
      <div class="docs-sr-only" aria-live="polite" role="status">
        {{ ariaAnnouncement() }}
      </div>

      <!-- ── Floating 1.5s Neutral Toast Hint ("Editing") ────────────────── -->
      @if (showEditingHint()) {
        <div class="docs-editor__editing-hint">
          <span>Editing</span>
        </div>
      }

      <!-- ── Main Canvas Viewports (Cross-fade between Edit & Preview) ────── -->
      <div class="docs-editor__viewport" [attr.data-font-theme]="fontFamily()">
        <!-- ── Left Document Outline (Table of Contents) ──────────────── -->
        <aside class="docs-editor__outline" aria-label="Document Outline">
          <div class="docs-editor__outline-header">
            <span class="docs-editor__outline-title">Outline</span>
          </div>
          <nav class="docs-editor__outline-nav">
            @if (outlineHeadings().length === 0) {
              <p class="docs-editor__outline-empty">No headings yet</p>
            } @else {
              <ul class="docs-editor__outline-tree">
                @for (h of outlineHeadings(); track h.id) {
                  <li
                    class="docs-editor__outline-item"
                    [class.docs-editor__outline-item--h1]="h.type === 'heading1'"
                    [class.docs-editor__outline-item--h2]="h.type === 'heading2'"
                    [class.docs-editor__outline-item--h3]="h.type === 'heading3'"
                    [class.docs-editor__outline-item--active]="activeOutlineId() === h.id"
                  >
                    <button
                      type="button"
                      class="docs-editor__outline-btn"
                      (click)="scrollToBlock(h.id)"
                    >
                      {{ h.text }}
                    </button>
                  </li>
                }
              </ul>
            }
          </nav>
        </aside>

        <!-- ── PREVIEW MODE (Reader View) ────────────────────────────────── -->
        @if (mode() === 'preview') {
          <div class="docs-editor__preview-canvas" (click)="onPreviewCanvasClick($event)">
            <div class="docs-editor__canvas-inner" [attr.data-content-zoom]="zoomPercent()">
              <h1 class="docs-editor__preview-title">{{ title() || 'Untitled Story' }}</h1>
              <app-doc-block-renderer
                [blocks]="blocks()"
                [interactive]="true"
                (blockClick)="onPreviewBlockClick($event)"
              />
            </div>
          </div>
        }

        <!-- ── EDIT MODE (Writing Canvas) ────────────────────────────────── -->
        @if (mode() === 'edit') {
          <div class="docs-editor__canvas" (click)="onCanvasBackgroundClick($event)">
            <div class="docs-editor__canvas-inner" [attr.data-content-zoom]="zoomPercent()">
              <!-- Title Block -->
              <div class="docs-editor__title-container">
                <textarea
                  #titleTextarea
                  class="docs-editor__title-input"
                  rows="1"
                  maxlength="150"
                  [(ngModel)]="title"
                  (ngModelChange)="onTitleChange()"
                  (focus)="onTitleFocus()"
                  (keydown.enter)="onTitleEnter($event)"
                  (keydown)="onTitleKeyDown($event)"
                  placeholder="Title"
                  aria-label="Story Title"
                ></textarea>
                @if (title().length >= 120) {
                  <span class="docs-editor__char-counter">{{ title().length }}/150</span>
                }
              </div>

              <!-- Ordered Block Canvas -->
              <div class="docs-editor__blocks-list">
                @for (block of blocks(); track block.id; let idx = $index) {
                  <div
                    class="docs-editor-block"
                    [attr.data-block-id]="block.id"
                    [class.docs-editor-block--focused]="focusedBlockId() === block.id"
                    [class.docs-editor-block--selected]="isBlockSelected(block.id)"
                    [attr.tabindex]="isNonTextBlock(block.type) ? 0 : null"
                    (mouseenter)="hoveredBlockId.set(block.id)"
                    (mouseleave)="hoveredBlockId.set(null)"
                    (click)="onBlockClick($event, block)"
                    (focus)="onBlockFocus(block.id)"
                    (keydown)="onBlockContainerKeyDown($event, block, idx)"
                  >
                    <!-- Gutter Side Toolbar (0px text layout shift) -->
                    @if (hoveredBlockId() === block.id || focusedBlockId() === block.id || isBlockSelected(block.id)) {
                      <div
                        class="docs-editor-block__side-toolbar"
                        role="toolbar"
                        [attr.aria-label]="block.type + ' actions'"
                        (click)="$event.stopPropagation()"
                      >
                        <button
                          type="button"
                          class="docs-side-tool__btn"
                          [disabled]="idx === 0"
                          (click)="moveBlockUp(block.id)"
                          aria-label="Move up"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                          <docs-tooltip text="Move up" />
                        </button>
                        <button
                          type="button"
                          class="docs-side-tool__btn"
                          [disabled]="idx === blocks().length - 1"
                          (click)="moveBlockDown(block.id)"
                          aria-label="Move down"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                          <docs-tooltip text="Move down" />
                        </button>
                        <button
                          type="button"
                          class="docs-side-tool__btn"
                          (click)="duplicateBlock(block.id)"
                          aria-label="Duplicate"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                          <docs-tooltip text="Duplicate" />
                        </button>
                        <button
                          type="button"
                          class="docs-side-tool__btn docs-side-tool__btn--danger"
                          (click)="deleteBlockWithUndo(block.id)"
                          aria-label="Erase block"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                            <path d="M22 21H7" />
                            <path d="m5 11 9 9" />
                          </svg>
                          <docs-tooltip text="Erase block" />
                        </button>

                        @if (block.type === 'image') {
                          <span class="docs-side-tool__divider" aria-hidden="true"></span>
                          <label class="docs-side-tool__btn docs-side-tool__btn--file" tabindex="0" aria-label="Replace">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <docs-tooltip text="Replace" />
                            <input type="file" accept="image/*" (change)="onReplaceImageFile(block.id, $event)" hidden />
                          </label>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="openAltTextModal(block.id)"
                            aria-label="Alt text"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M12 16v-4" />
                              <path d="M12 8h.01" />
                            </svg>
                            <docs-tooltip text="Alt text" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="rotateImage(block.id)"
                            aria-label="Rotate"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 8" />
                              <polyline points="21 3 21 8 16 8" />
                            </svg>
                            <docs-tooltip text="Rotate" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="cycleBlockAlign(block.id)"
                            aria-label="Align"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="21" y1="6" x2="3" y2="6" /><line x1="17" y1="12" x2="7" y2="12" /><line x1="19" y1="18" x2="5" y2="18" />
                            </svg>
                            <docs-tooltip text="Align" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="cycleBlockLayout(block.id)"
                            aria-label="Width"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="14" x="3" y="5" rx="2" />
                            </svg>
                            <docs-tooltip text="Width" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="downloadMedia(block)"
                            aria-label="Download"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <docs-tooltip text="Download" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="openMediaOriginal(block)"
                            aria-label="Open original"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                            <docs-tooltip text="Open original" />
                          </button>
                        }

                        @if (block.type === 'video') {
                          <span class="docs-side-tool__divider" aria-hidden="true"></span>
                          <label class="docs-side-tool__btn docs-side-tool__btn--file" tabindex="0" aria-label="Replace">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <docs-tooltip text="Replace" />
                            <input type="file" accept="video/*" (change)="onReplaceVideoFile(block.id, $event)" hidden />
                          </label>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="openPosterModal(block.id)"
                            aria-label="Poster image"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                            </svg>
                            <docs-tooltip text="Poster image" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="cycleBlockAlign(block.id)"
                            aria-label="Align"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="21" y1="6" x2="3" y2="6" /><line x1="17" y1="12" x2="7" y2="12" /><line x1="19" y1="18" x2="5" y2="18" />
                            </svg>
                            <docs-tooltip text="Align" />
                          </button>
                          <button
                            type="button"
                            class="docs-side-tool__btn"
                            (click)="cycleBlockLayout(block.id)"
                            aria-label="Width"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="14" x="3" y="5" rx="2" />
                            </svg>
                            <docs-tooltip text="Width" />
                          </button>
                        }

                        @if (block.type === 'table') {
                          <span class="docs-side-tool__divider" aria-hidden="true"></span>
                          <button type="button" class="docs-side-tool__btn" (click)="insertTableRowBelow(block.id)" aria-label="Add row">
                            <span class="docs-side-tool__text">+R</span>
                            <docs-tooltip text="Add row below" />
                          </button>
                          <button type="button" class="docs-side-tool__btn" (click)="insertTableColumnRight(block.id)" aria-label="Add column">
                            <span class="docs-side-tool__text">+C</span>
                            <docs-tooltip text="Add column right" />
                          </button>
                          <button type="button" class="docs-side-tool__btn" (click)="deleteActiveTableRow(block.id)" aria-label="Delete row">
                            <span class="docs-side-tool__text">-R</span>
                            <docs-tooltip text="Delete row" />
                          </button>
                          <button type="button" class="docs-side-tool__btn" (click)="deleteActiveTableColumn(block.id)" aria-label="Delete column">
                            <span class="docs-side-tool__text">-C</span>
                            <docs-tooltip text="Delete column" />
                          </button>
                          <button type="button" class="docs-side-tool__btn" (click)="toggleTableHeader(block.id)" aria-label="Header row">
                            <span class="docs-side-tool__text">HDR</span>
                            <docs-tooltip text="Toggle header" />
                          </button>
                          <button type="button" class="docs-side-tool__btn" (click)="cycleTableCellAlignment(block.id)" aria-label="Align cells">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <line x1="21" y1="6" x2="3" y2="6" /><line x1="17" y1="12" x2="7" y2="12" /><line x1="19" y1="18" x2="5" y2="18" />
                            </svg>
                            <docs-tooltip text="Cycle alignment" />
                          </button>
                        }
                      </div>
                    }
                    <!-- ── BLOCK TYPE: HEADING 1 ───────────────────────── -->
                    @if (block.type === 'heading1') {
                      <input
                        type="text"
                        class="docs-editor__input docs-editor__input--h1"
                        maxlength="200"
                        [(ngModel)]="block.text"
                        (ngModelChange)="onBlockContentChange()"
                        (focus)="setFocusedBlock(block.id)"
                        (select)="onTextSelect($event, block.id)"
                        (mouseup)="onTextSelect($event, block.id)"
                        (keyup)="onTextSelect($event, block.id)"
                        (keydown)="onBlockKeyDown(block.id, idx, $event)"
                        placeholder="Heading 1"
                      />
                    }

                    <!-- ── BLOCK TYPE: HEADING 2 ───────────────────────── -->
                    @else if (block.type === 'heading2') {
                      <input
                        type="text"
                        class="docs-editor__input docs-editor__input--h2"
                        maxlength="200"
                        [(ngModel)]="block.text"
                        (ngModelChange)="onBlockContentChange()"
                        (focus)="setFocusedBlock(block.id)"
                        (select)="onTextSelect($event, block.id)"
                        (mouseup)="onTextSelect($event, block.id)"
                        (keyup)="onTextSelect($event, block.id)"
                        (keydown)="onBlockKeyDown(block.id, idx, $event)"
                        placeholder="Heading 2"
                      />
                    }

                    <!-- ── BLOCK TYPE: HEADING 3 ───────────────────────── -->
                    @else if (block.type === 'heading3') {
                      <input
                        type="text"
                        class="docs-editor__input docs-editor__input--h3"
                        maxlength="200"
                        [(ngModel)]="block.text"
                        (ngModelChange)="onBlockContentChange()"
                        (focus)="setFocusedBlock(block.id)"
                        (select)="onTextSelect($event, block.id)"
                        (mouseup)="onTextSelect($event, block.id)"
                        (keyup)="onTextSelect($event, block.id)"
                        (keydown)="onBlockKeyDown(block.id, idx, $event)"
                        placeholder="Heading 3"
                      />
                    }

                    <!-- ── BLOCK TYPE: PARAGRAPH ───────────────────────── -->
                    @else if (block.type === 'paragraph') {
                      <textarea
                        #blockTextarea
                        class="docs-editor__textarea docs-editor__textarea--paragraph"
                        rows="1"
                        [(ngModel)]="block.text"
                        (ngModelChange)="onParagraphChange(block.id, $event)"
                        (focus)="setFocusedBlock(block.id)"
                        (select)="onTextSelect($event, block.id)"
                        (mouseup)="onTextSelect($event, block.id)"
                        (keyup)="onTextSelect($event, block.id)"
                        (keydown)="onBlockKeyDown(block.id, idx, $event)"
                        [placeholder]="getParagraphPlaceholder(block, idx)"
                      ></textarea>

                      <!-- Separate Row for "+" on Empty Paragraph (directly below empty paragraph line, centered in column) -->
                      
                    }

                    <!-- ── BLOCK TYPE: QUOTE ───────────────────────────── -->
                    @else if (block.type === 'quote') {
                      <div class="docs-editor__quote-wrap">
                        <textarea
                          class="docs-editor__textarea docs-editor__textarea--quote"
                          rows="1"
                          [(ngModel)]="block.text"
                          (ngModelChange)="onBlockContentChange()"
                          (focus)="setFocusedBlock(block.id)"
                          (select)="onTextSelect($event, block.id)"
                          (mouseup)="onTextSelect($event, block.id)"
                          (keyup)="onTextSelect($event, block.id)"
                          (keydown)="onBlockKeyDown(block.id, idx, $event)"
                          placeholder="Type quote..."
                        ></textarea>
                      </div>
                    }

                    <!-- ── BLOCK TYPE: BULLET LIST ─────────────────────── -->
                    @else if (block.type === 'bullet_list') {
                      <div class="docs-editor__list-wrap">
                        @for (item of block.items || ['']; track $index; let lIdx = $index) {
                          <div
                            class="docs-editor__list-item-row"
                            [attr.data-level]="block.itemLevels?.[lIdx] || 0"
                          >
                            <span class="docs-editor__bullet">•</span>
                            <input
                              type="text"
                              class="docs-editor__list-input"
                              [ngModel]="item"
                              (ngModelChange)="updateListItem(block.id, lIdx, $event)"
                              (focus)="setFocusedBlock(block.id)"
                              (keydown)="onListKeyDown(block.id, lIdx, $event, 'bullet')"
                              placeholder="List item..."
                            />
                          </div>
                        }
                      </div>
                    }

                    <!-- ── BLOCK TYPE: NUMBERED LIST ───────────────────── -->
                    @else if (block.type === 'numbered_list') {
                      <div class="docs-editor__list-wrap">
                        @for (item of block.items || ['']; track $index; let lIdx = $index) {
                          <div
                            class="docs-editor__list-item-row"
                            [attr.data-level]="block.itemLevels?.[lIdx] || 0"
                          >
                            <span class="docs-editor__number">{{ lIdx + 1 }}.</span>
                            <input
                              type="text"
                              class="docs-editor__list-input"
                              [ngModel]="item"
                              (ngModelChange)="updateListItem(block.id, lIdx, $event)"
                              (focus)="setFocusedBlock(block.id)"
                              (keydown)="onListKeyDown(block.id, lIdx, $event, 'numbered')"
                              placeholder="List item..."
                            />
                          </div>
                        }
                      </div>
                    }

                    <!-- ── BLOCK TYPE: CODE ────────────────────────────── -->
                    @else if (block.type === 'code') {
                      <div class="docs-editor__code-box">
                        <div class="docs-editor__code-header">
                          <input
                            type="text"
                            class="docs-editor__code-lang-input"
                            [(ngModel)]="block.codeLanguage"
                            (ngModelChange)="onBlockContentChange()"
                            (focus)="setFocusedBlock(block.id)"
                            placeholder="language (e.g. typescript, python, css)"
                          />
                          <div class="docs-editor__code-actions">
                            <button
                              type="button"
                              class="docs-block__code-copy"
                              (click)="copyCode(block.text || '', block.id, $event)"
                              [title]="copiedBlockId() === block.id ? 'Copied to clipboard' : 'Copy code to clipboard'"
                              aria-label="Copy code"
                            >
                              @if (copiedBlockId() === block.id) {
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Copied!</span>
                              } @else {
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                <span>Copy</span>
                              }
                            </button>
                          </div>
                        </div>
                        <div class="docs-editor__code-body">
                          <div class="docs-editor__code-gutter" aria-hidden="true">
                            @for (_ of getCodeLineNumbers(block.text); track $index) {
                              <span class="docs-editor__code-line-num">{{ $index + 1 }}</span>
                            }
                          </div>
                          <textarea
                            class="docs-editor__textarea docs-editor__textarea--code"
                            rows="3"
                            [(ngModel)]="block.text"
                            (ngModelChange)="onBlockContentChange()"
                            (focus)="setFocusedBlock(block.id)"
                            (select)="onTextSelect($event, block.id)"
                            (mouseup)="onTextSelect($event, block.id)"
                            (keyup)="onTextSelect($event, block.id)"
                            (keydown)="onBlockKeyDown(block.id, idx, $event)"
                            placeholder="// Code goes here..."
                          ></textarea>
                        </div>
                      </div>
                    }

                    <!-- ── BLOCK TYPE: DIVIDER ─────────────────────────── -->
                    @else if (block.type === 'divider') {
                      <div
                        class="docs-editor__divider-line"
                        [class.docs-editor__divider-line--selected]="isBlockSelected(block.id)"
                        (click)="selectBlock(block.id, $event); focusBlockElement(block.id)"
                        role="separator"
                        aria-label="Divider"
                      >
                        <hr />
                      </div>
                    }

                    <!-- ── BLOCK TYPE: CALLOUT ─────────────────────────── -->
                    @else if (block.type === 'callout') {
                      <div class="docs-editor__callout-box" [attr.data-callout-type]="block.calloutType || 'info'">
                        <textarea
                          class="docs-editor__textarea docs-editor__textarea--callout"
                          rows="2"
                          [(ngModel)]="block.text"
                          (ngModelChange)="onBlockContentChange()"
                          (focus)="setFocusedBlock(block.id)"
                          (select)="onTextSelect($event, block.id)"
                          (mouseup)="onTextSelect($event, block.id)"
                          (keyup)="onTextSelect($event, block.id)"
                          (keydown)="onBlockKeyDown(block.id, idx, $event)"
                          placeholder="Informational callout note..."
                        ></textarea>
                      </div>
                    }

                    <!-- ── BLOCK TYPE: CHECKLIST ───────────────────────── -->
                    @else if (block.type === 'checklist') {
                      <div class="docs-editor__checklist-wrap">
                        @for (item of block.checklistItems || [{ id: '1', text: '', checked: false }]; track item.id || $index; let cIdx = $index) {
                          <div class="docs-editor__checklist-item-row" [class.docs-editor__checklist-item-row--checked]="item.checked">
                            <input
                              type="checkbox"
                              class="docs-editor__checklist-checkbox"
                              [(ngModel)]="item.checked"
                              (ngModelChange)="onBlockContentChange()"
                            />
                            <input
                              type="text"
                              class="docs-editor__checklist-input"
                              [(ngModel)]="item.text"
                              (ngModelChange)="onBlockContentChange()"
                              (focus)="setFocusedBlock(block.id)"
                              (keydown)="onChecklistKeyDown(block.id, cIdx, $event)"
                              placeholder="To-do item..."
                            />
                          </div>
                        }
                      </div>
                    }

                    <!-- ── BLOCK TYPE: TABLE ───────────────────────────── -->
                    @else if (block.type === 'table') {
                      <div class="docs-editor__table-box">
                        <div class="docs-editor__table-toolbar">
                          <button type="button" class="docs-editor__table-tool" (click)="insertTableRowBelow(block.id)">+ Row</button>
                          <button type="button" class="docs-editor__table-tool" (click)="insertTableColumnRight(block.id)">+ Col</button>
                          <button type="button" class="docs-editor__table-tool" (click)="toggleTableHeader(block.id)">Header</button>
                          <button type="button" class="docs-editor__table-tool" (click)="cycleTableCellAlignment(block.id)">Align</button>
                          <button type="button" class="docs-editor__table-tool docs-editor__table-tool--danger" (click)="deleteActiveTableRow(block.id)">- Row</button>
                          <button type="button" class="docs-editor__table-tool docs-editor__table-tool--danger" (click)="deleteActiveTableColumn(block.id)">- Col</button>
                        </div>
                        <div class="docs-editor__table-wrapper">
                          <table class="docs-editor__table">
                            <tbody>
                              @for (row of block.tableData?.rows || []; track $index; let rIdx = $index) {
                                <tr [class.docs-editor__table-header-row]="block.tableData?.headerRow && rIdx === 0">
                                  @for (cell of row; track $index; let cIdx = $index) {
                                    <td class="docs-editor__table-cell" [attr.data-align]="block.tableData?.alignments?.[cIdx] || 'left'">
                                      <input
                                        type="text"
                                        class="docs-editor__table-cell-input"
                                        [attr.data-align]="block.tableData?.alignments?.[cIdx] || 'left'"
                                        [(ngModel)]="block.tableData!.rows[rIdx][cIdx]"
                                        (ngModelChange)="onBlockContentChange()"
                                        (focus)="onTableCellFocus(block.id, rIdx, cIdx)"
                                        (keydown)="onTableCellKeyDown($event, block.id, rIdx, cIdx)"
                                        [placeholder]="block.tableData?.headerRow && rIdx === 0 ? 'Header' : 'Cell'"
                                      />
                                    </td>
                                  }
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </div>
                    }

                    <!-- ── BLOCK TYPE: TOGGLE ──────────────────────────── -->
                    @else if (block.type === 'toggle') {
                      <div class="docs-editor__toggle-box">
                        <div class="docs-editor__toggle-header">
                          <button type="button" class="docs-editor__toggle-btn" (click)="toggleCollapse(block.id)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.docs-editor__toggle-icon--open]="block.toggleOpen">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </button>
                          <input
                            type="text"
                            class="docs-editor__toggle-title-input"
                            [(ngModel)]="block.toggleTitle"
                            (ngModelChange)="onBlockContentChange()"
                            (focus)="setFocusedBlock(block.id)"
                            placeholder="Toggle header..."
                          />
                        </div>
                        @if (block.toggleOpen) {
                          <div class="docs-editor__toggle-body">
                            <textarea
                              class="docs-editor__textarea docs-editor__textarea--toggle"
                              rows="2"
                              [(ngModel)]="block.text"
                              (ngModelChange)="onBlockContentChange()"
                              (focus)="setFocusedBlock(block.id)"
                              (select)="onTextSelect($event, block.id)"
                              (mouseup)="onTextSelect($event, block.id)"
                              (keyup)="onTextSelect($event, block.id)"
                              placeholder="Collapsed content..."
                            ></textarea>
                          </div>
                        }
                      </div>
                    }

                    <!-- ── BLOCK TYPE: FILE ATTACHMENT ─────────────────── -->
                    @else if (block.type === 'file') {
                      <div class="docs-editor__file-card" (click)="setFocusedBlock(block.id)">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <div class="docs-editor__file-info">
                          <input
                            type="text"
                            class="docs-editor__file-name-input"
                            [(ngModel)]="block.fileName"
                            (ngModelChange)="onBlockContentChange()"
                            placeholder="File name"
                          />
                          @if (block.fileSize) {
                            <span class="docs-editor__file-size">{{ formatFileSize(block.fileSize) }}</span>
                          }
                        </div>
                        <label class="docs-button docs-button--secondary docs-button--xs">
                          Replace
                          <input type="file" (change)="onGenericFileSelected(block.id, $event)" hidden />
                        </label>
                      </div>
                    }

                    <!-- ── BLOCK TYPE: IMAGE ───────────────────────────── -->
                    @else if (block.type === 'image') {
                      <div
                        class="docs-editor__media-box"
                        [attr.data-layout]="block.layout || 'inset'"
                        [class.docs-editor__media-box--align-left]="block.align === 'left'"
                        [class.docs-editor__media-box--align-center]="!block.align || block.align === 'center'"
                        [class.docs-editor__media-box--align-right]="block.align === 'right'"
                        (click)="setFocusedBlock(block.id)"
                      >
                        @if (block.url) {
                          <div class="docs-editor__media-wrapper">
                            <img
                              [src]="block.url"
                              [alt]="block.alt || 'Story visual'"
                              class="docs-editor__media-img"
                              [class.docs-editor__media-img--rot-90]="block.rotation === 90"
                              [class.docs-editor__media-img--rot-180]="block.rotation === 180"
                              [class.docs-editor__media-img--rot-270]="block.rotation === 270"
                            />
                            <label class="docs-editor__media-replace-btn docs-button docs-button--secondary docs-button--xs">
                              Replace
                              <input type="file" accept="image/*" (change)="onReplaceImageFile(block.id, $event)" hidden />
                            </label>
                          </div>
                          <input
                            type="text"
                            class="docs-editor__caption-input"
                            [(ngModel)]="block.caption"
                            (ngModelChange)="onBlockContentChange()"
                            placeholder="Type caption for image (optional)"
                          />
                        } @else if (block.images && block.images.length > 0) {
                          <div class="docs-editor__media-grid" [attr.data-grid-count]="block.images.length">
                            @for (img of block.images; track $index) {
                              <img [src]="img.url" [alt]="img.alt || 'Grid visual'" />
                            }
                          </div>
                        } @else {
                          <div class="docs-editor__media-placeholder">
                            <label class="docs-button docs-button--secondary docs-button--sm">
                              Upload Image
                              <input type="file" accept="image/*" (change)="onImageFileSelected(block.id, $event)" hidden />
                            </label>
                          </div>
                        }
                      </div>
                    }

                    <!-- ── BLOCK TYPE: VIDEO ───────────────────────────── -->
                    @else if (block.type === 'video') {
                      <div
                        class="docs-editor__media-box"
                        [attr.data-layout]="block.layout || 'inset'"
                        [class.docs-editor__media-box--align-left]="block.align === 'left'"
                        [class.docs-editor__media-box--align-center]="!block.align || block.align === 'center'"
                        [class.docs-editor__media-box--align-right]="block.align === 'right'"
                        (click)="setFocusedBlock(block.id)"
                      >
                        @if (block.url) {
                          <div class="docs-editor__video-wrapper">
                            @if (block.embedType === 'upload') {
                              <video [src]="block.url" [poster]="block.posterUrl || null" controls class="docs-editor__video-elem"></video>
                            } @else {
                              <iframe
                                [src]="block.url"
                                frameborder="0"
                                allowfullscreen
                                class="docs-editor__video-iframe"
                              ></iframe>
                            }
                          </div>
                          <input
                            type="text"
                            class="docs-editor__caption-input"
                            [(ngModel)]="block.caption"
                            (ngModelChange)="onBlockContentChange()"
                            placeholder="Type caption for video (optional)"
                          />
                        } @else {
                          <div class="docs-editor__media-placeholder">
                            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="openEmbedInput(block.id)">
                              Embed Video
                            </button>
                            <label class="docs-button docs-button--secondary docs-button--sm">
                              Upload Video
                              <input type="file" accept="video/*" (change)="onVideoFileSelected(block.id, $event)" hidden />
                            </label>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Standalone "+" Row Strictly After Last Block (Never Inside or Between Blocks) -->
              @if (blocks()[blocks().length - 1]; as lastBlock) {
                @if (shouldShowPlusRow(lastBlock.id, blocks().length - 1)) {
                  <div class="docs-editor__plus-row">
                    <button
                      type="button"
                      class="docs-editor__plus-btn"
                      [class.docs-editor__plus-btn--visible]="isPlusVisible(lastBlock.id)"
                      [class.docs-editor__plus-btn--hidden]="activePlusBlockId() === lastBlock.id"
                      [class.docs-editor__plus-btn--active]="activePlusBlockId() === lastBlock.id"
                      (click)="togglePlusMenu(lastBlock.id, $event)"
                      (mouseenter)="onPlusMouseEnter(lastBlock.id)"
                      (mouseleave)="onPlusMouseLeave()"
                      (keydown)="onPlusKeyDown($event, lastBlock.id)"
                      aria-label="Insert block"
                      [attr.aria-expanded]="activePlusBlockId() === lastBlock.id"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    <!-- Frequent Operations Quick Bar Centered inside "+" Row -->
                    @if (activePlusBlockId() === lastBlock.id) {
                      <div
                        class="docs-editor__quick-toolbar"
                        [class.docs-editor__quick-toolbar--radial]="insertMenuStyle() === 'radial'"
                        [class.docs-editor__quick-toolbar--closing]="isPlusClosing()"
                        (keydown)="onQuickToolbarKeyDown($event, lastBlock.id)"
                        (click)="$event.stopPropagation()"
                        role="toolbar"
                        aria-label="Insert options"
                      >
                        <!-- 1. Close Button (First Item on the Left) -->
                        <button
                          type="button"
                          class="docs-quick-tool__btn docs-quick-tool__btn--close"
                          (click)="closePlusMenuAndFocusBtn(lastBlock.id)"
                          aria-label="Close insert menu"
                        >
                          <span class="docs-quick-tool__icon">✕</span>
                          <docs-tooltip text="Close menu" />
                        </button>

                        <span class="docs-dock__divider" aria-hidden="true"></span>

                        <!-- Category 1: TEXT -->
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'paragraph')"
                          aria-label="Text"
                        >
                          <span class="docs-quick-tool__icon docs-quick-tool__icon--label">TEXT</span>
                          <docs-tooltip text="Paragraph" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'heading1')"
                          aria-label="Heading 1"
                        >
                          <span class="docs-quick-tool__icon">H1</span>
                          <docs-tooltip text="Heading 1" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'heading2')"
                          aria-label="Heading 2"
                        >
                          <span class="docs-quick-tool__icon">H2</span>
                          <docs-tooltip text="Heading 2" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'quote')"
                          aria-label="Quote"
                        >
                          <span class="docs-quick-tool__icon">”</span>
                          <docs-tooltip text="Quote" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'bullet_list')"
                          aria-label="Bulleted list"
                        >
                          <span class="docs-quick-tool__icon">•</span>
                          <docs-tooltip text="Bulleted list" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'numbered_list')"
                          aria-label="Numbered list"
                        >
                          <span class="docs-quick-tool__icon">1.</span>
                          <docs-tooltip text="Numbered list" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'code')"
                          aria-label="Code block"
                        >
                          <span class="docs-quick-tool__icon">&lt;/&gt;</span>
                          <docs-tooltip text="Code block" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="convertBlockAndClose(lastBlock.id, 'divider')"
                          aria-label="Divider"
                        >
                          <span class="docs-quick-tool__icon">—</span>
                          <docs-tooltip text="Divider" />
                        </button>
                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="openTablePicker(lastBlock.id)"
                          aria-label="Table"
                        >
                          <span class="docs-quick-tool__icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="18" x="3" y="3" rx="2" />
                              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                            </svg>
                          </span>
                          <docs-tooltip text="Table" />
                        </button>

                        <span class="docs-dock__divider" aria-hidden="true"></span>

                        <!-- Media Options -->
                        <label
                          class="docs-quick-tool__btn docs-quick-tool__btn--upload"
                          tabindex="0"
                          (keydown.enter)="triggerPromptUpload($event)"
                          (keydown.space)="triggerPromptUpload($event)"
                          aria-label="Image"
                        >
                          <span class="docs-quick-tool__icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          </span>
                          <docs-tooltip text="Add image" />
                          <input type="file" accept="image/*" (change)="onPlusMediaSelected(lastBlock.id, 'image', $event)" hidden />
                        </label>

                        <label
                          class="docs-quick-tool__btn docs-quick-tool__btn--upload"
                          tabindex="0"
                          (keydown.enter)="triggerPromptUpload($event)"
                          (keydown.space)="triggerPromptUpload($event)"
                          aria-label="Video"
                        >
                          <span class="docs-quick-tool__icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polygon points="23 7 16 12 23 17 23 7" />
                              <rect width="14" height="14" x="1" y="5" rx="2" ry="2" />
                            </svg>
                          </span>
                          <docs-tooltip text="Upload video" />
                          <input type="file" accept="video/*" (change)="onPlusMediaSelected(lastBlock.id, 'video', $event)" hidden />
                        </label>

                        <button
                          type="button"
                          class="docs-quick-tool__btn"
                          (click)="openPlusEmbedInput(lastBlock.id)"
                          aria-label="Embed"
                        >
                          <span class="docs-quick-tool__icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10" />
                              <polygon points="10 8 16 12 10 16 10 8" />
                            </svg>
                          </span>
                          <docs-tooltip text="YouTube or Vimeo" />
                        </button>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }

        <!-- ── Right Inspector Sidebar (Selected Text or Element Controls) ── -->
        @if (mode() === 'edit' && activeRightSidebar()) {
          <aside
            class="docs-editor__right-sidebar"
            [class.docs-editor__right-sidebar--closing]="isSelectionToolbarClosing()"
            [class.docs-editor__right-sidebar--expanded]="showLinkPrompt()"
            (animationend)="onSelectionToolbarAnimationEnd($event)"
            (mousedown)="onRightSidebarMouseDown($event)"
            [attr.aria-label]="activeRightSidebar() === 'selection' ? 'Text Formatting' : 'Element Properties'"
          >
            <div class="docs-right-sidebar__header">
              <span class="docs-right-sidebar__title">
                {{ activeRightSidebar() === 'selection' ? 'Formatting' : (displayElementBlock()?.type || 'Element') }}
              </span>
              <button
                type="button"
                class="docs-right-sidebar__close"
                (click)="closeRightSidebar()"
                aria-label="Close formatting panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            @if (activeRightSidebar() === 'selection') {
              <div
                class="docs-selection-toolbar"
                [class.docs-selection-toolbar--closing]="isSelectionToolbarClosing()"
                role="toolbar"
                aria-label="Formatting"
              >
                <div class="docs-right-sidebar__section">
                  <span class="docs-right-sidebar__section-title">Style</span>
                  <div class="docs-right-sidebar__grid">
                    <button type="button" class="docs-selection-toolbar__btn" (click)="applyFormat('bold')" aria-label="Bold">
                      <span class="docs-selection-toolbar__glyph docs-selection-toolbar__glyph--bold">B</span>
                      <span class="docs-selection-toolbar__label">Bold</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="applyFormat('italic')" aria-label="Italic">
                      <span class="docs-selection-toolbar__glyph docs-selection-toolbar__glyph--italic">i</span>
                      <span class="docs-selection-toolbar__label">Italic</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="applyFormat('underline')" aria-label="Underline">
                      <span class="docs-selection-toolbar__glyph docs-selection-toolbar__glyph--underline">U</span>
                      <span class="docs-selection-toolbar__label">Underline</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="applyFormat('strikethrough')" aria-label="Strikethrough">
                      <span class="docs-selection-toolbar__glyph docs-selection-toolbar__glyph--strike">S</span>
                      <span class="docs-selection-toolbar__label">Strike</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="applyFormat('code')" aria-label="Inline code">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                      <span class="docs-selection-toolbar__label">Code</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="applyFormat('highlight')" aria-label="Highlight">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 11-6 6v3h3l6-6"/><path d="m22 2-5 5-4-4 5-5z"/></svg>
                      <span class="docs-selection-toolbar__label">Highlight</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="toggleLinkPrompt()" aria-label="Link">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      <span class="docs-selection-toolbar__label">Link</span>
                    </button>
                  </div>
                </div>

                @if (showLinkPrompt()) {
                  <div class="docs-right-sidebar__link-box">
                    <input
                      type="url"
                      class="docs-right-sidebar__link-input"
                      [(ngModel)]="linkUrl"
                      (keydown.enter)="applyLink()"
                      (keydown.escape)="showLinkPrompt.set(false)"
                      placeholder="https:// or mailto:"
                      aria-label="Link URL"
                    />
                    <div class="docs-right-sidebar__link-actions">
                      <button type="button" class="docs-button docs-button--ghost docs-button--xs" (click)="showLinkPrompt.set(false)">Cancel</button>
                      <button type="button" class="docs-button docs-button--primary docs-button--xs" (click)="applyLink()">Apply</button>
                    </div>
                  </div>
                }

                <div class="docs-right-sidebar__section">
                  <span class="docs-right-sidebar__section-title">Turn into</span>
                  <div class="docs-right-sidebar__grid">
                    <button type="button" class="docs-selection-toolbar__btn" (click)="convertSelectedBlock('heading1')" aria-label="Heading 1">
                      <span class="docs-selection-toolbar__glyph">H1</span>
                      <span class="docs-selection-toolbar__label">Heading 1</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="convertSelectedBlock('heading2')" aria-label="Heading 2">
                      <span class="docs-selection-toolbar__glyph">H2</span>
                      <span class="docs-selection-toolbar__label">Heading 2</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="convertSelectedBlock('heading3')" aria-label="Heading 3">
                      <span class="docs-selection-toolbar__glyph">H3</span>
                      <span class="docs-selection-toolbar__label">Heading 3</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="convertSelectedBlock('quote')" aria-label="Quote">
                      <span class="docs-selection-toolbar__glyph">”</span>
                      <span class="docs-selection-toolbar__label">Quote</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="convertSelectedBlock('bullet_list')" aria-label="Bullet list">
                      <span class="docs-selection-toolbar__glyph">•</span>
                      <span class="docs-selection-toolbar__label">Bulleted</span>
                    </button>

                    <button type="button" class="docs-selection-toolbar__btn" (click)="convertSelectedBlock('numbered_list')" aria-label="Numbered list">
                      <span class="docs-selection-toolbar__glyph">1.</span>
                      <span class="docs-selection-toolbar__label">Numbered</span>
                    </button>
                  </div>
                </div>
              </div>
            } @else if (displayElementBlock(); as selBlock) {
              <div
                class="docs-selection-toolbar"
                [class.docs-selection-toolbar--closing]="isSelectionToolbarClosing()"
                role="toolbar"
                [attr.aria-label]="selBlock.type + ' properties'"
              >
                @if (selBlock.type === 'image') {
                  <div class="docs-right-sidebar__section">
                    <span class="docs-right-sidebar__section-title">Image</span>
                    <div class="docs-right-sidebar__grid">
                      <label class="docs-selection-toolbar__btn" tabindex="0" aria-label="Replace">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="docs-selection-toolbar__label">Replace</span>
                        <input type="file" accept="image/*" (change)="onReplaceImageFile(selBlock.id, $event)" hidden />
                      </label>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="openAltTextModal(selBlock.id)" aria-label="Alt text">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        <span class="docs-selection-toolbar__label">Alt text</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="rotateImage(selBlock.id)" aria-label="Rotate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24L21 8"/><polyline points="21 3 21 8 16 8"/></svg>
                        <span class="docs-selection-toolbar__label">Rotate</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="cycleBlockAlign(selBlock.id)" aria-label="Align">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>
                        <span class="docs-selection-toolbar__label">Align</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="cycleBlockLayout(selBlock.id)" aria-label="Width">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="14" x="3" y="5" rx="2"/></svg>
                        <span class="docs-selection-toolbar__label">Width</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="downloadMedia(selBlock)" aria-label="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span class="docs-selection-toolbar__label">Download</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="openMediaOriginal(selBlock)" aria-label="Open original">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        <span class="docs-selection-toolbar__label">Open</span>
                      </button>
                    </div>
                  </div>
                } @else if (selBlock.type === 'video') {
                  <div class="docs-right-sidebar__section">
                    <span class="docs-right-sidebar__section-title">Video</span>
                    <div class="docs-right-sidebar__grid">
                      <label class="docs-selection-toolbar__btn" tabindex="0" aria-label="Replace">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="docs-selection-toolbar__label">Replace</span>
                        <input type="file" accept="video/*" (change)="onReplaceVideoFile(selBlock.id, $event)" hidden />
                      </label>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="openPosterModal(selBlock.id)" aria-label="Poster image">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/></svg>
                        <span class="docs-selection-toolbar__label">Poster</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="cycleBlockAlign(selBlock.id)" aria-label="Align">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>
                        <span class="docs-selection-toolbar__label">Align</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="cycleBlockLayout(selBlock.id)" aria-label="Width">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="14" x="3" y="5" rx="2"/></svg>
                        <span class="docs-selection-toolbar__label">Width</span>
                      </button>
                    </div>
                  </div>
                } @else if (selBlock.type === 'file') {
                  <div class="docs-right-sidebar__section">
                    <span class="docs-right-sidebar__section-title">File</span>
                    <div class="docs-right-sidebar__grid">
                      <label class="docs-selection-toolbar__btn" tabindex="0" aria-label="Replace">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <span class="docs-selection-toolbar__label">Replace</span>
                        <input type="file" (change)="onGenericFileSelected(selBlock.id, $event)" hidden />
                      </label>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="downloadMedia(selBlock)" aria-label="Download">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span class="docs-selection-toolbar__label">Download</span>
                      </button>
                    </div>
                  </div>
                } @else if (selBlock.type === 'embed') {
                  <div class="docs-right-sidebar__section">
                    <span class="docs-right-sidebar__section-title">Embed</span>
                    <div class="docs-right-sidebar__grid">
                      <button type="button" class="docs-selection-toolbar__btn" (click)="openEmbedInput(selBlock.id)" aria-label="Edit embed">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                        <span class="docs-selection-toolbar__label">Edit URL</span>
                      </button>
                    </div>
                  </div>
                } @else if (selBlock.type === 'table') {
                  <div class="docs-right-sidebar__section">
                    <span class="docs-right-sidebar__section-title">Table</span>
                    <div class="docs-right-sidebar__grid">
                      <button type="button" class="docs-selection-toolbar__btn" (click)="insertTableRowAbove(selBlock.id)" aria-label="Row above">
                        <span class="docs-selection-toolbar__glyph">+R</span>
                        <span class="docs-selection-toolbar__label">Row above</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="insertTableRowBelow(selBlock.id)" aria-label="Row below">
                        <span class="docs-selection-toolbar__glyph">+R</span>
                        <span class="docs-selection-toolbar__label">Row below</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="insertTableColumnLeft(selBlock.id)" aria-label="Column left">
                        <span class="docs-selection-toolbar__glyph">+C</span>
                        <span class="docs-selection-toolbar__label">Col left</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="insertTableColumnRight(selBlock.id)" aria-label="Column right">
                        <span class="docs-selection-toolbar__glyph">+C</span>
                        <span class="docs-selection-toolbar__label">Col right</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="deleteActiveTableRow(selBlock.id)" aria-label="Delete row">
                        <span class="docs-selection-toolbar__glyph">-R</span>
                        <span class="docs-selection-toolbar__label">Del row</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="deleteActiveTableColumn(selBlock.id)" aria-label="Delete column">
                        <span class="docs-selection-toolbar__glyph">-C</span>
                        <span class="docs-selection-toolbar__label">Del col</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="toggleTableHeader(selBlock.id)" aria-label="Header row">
                        <span class="docs-selection-toolbar__glyph">H</span>
                        <span class="docs-selection-toolbar__label">Header</span>
                      </button>
                      <button type="button" class="docs-selection-toolbar__btn" (click)="cycleTableCellAlignment(selBlock.id)" aria-label="Align cells">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>
                        <span class="docs-selection-toolbar__label">Align</span>
                      </button>
                    </div>
                  </div>
                }

                <div class="docs-right-sidebar__section">
                  <span class="docs-right-sidebar__section-title">Block</span>
                  <div class="docs-right-sidebar__grid">
                    <button type="button" class="docs-selection-toolbar__btn" (click)="moveBlockUp(selBlock.id)" aria-label="Move up">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
                      <span class="docs-selection-toolbar__label">Move up</span>
                    </button>
                    <button type="button" class="docs-selection-toolbar__btn" (click)="moveBlockDown(selBlock.id)" aria-label="Move down">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                      <span class="docs-selection-toolbar__label">Move down</span>
                    </button>
                    <button type="button" class="docs-selection-toolbar__btn" (click)="duplicateBlock(selBlock.id)" aria-label="Duplicate">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      <span class="docs-selection-toolbar__label">Duplicate</span>
                    </button>
                    <button type="button" class="docs-selection-toolbar__btn" (click)="deleteBlockWithUndo(selBlock.id)" aria-label="Erase block">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                      <span class="docs-selection-toolbar__label">Erase</span>
                    </button>
                  </div>
                </div>
              </div>
            }
          </aside>
        }

        <!-- ── Bottom-Right Content Zoom Controls ── -->
        <div
          class="docs-editor__zoom-bar"
          (mousedown)="$event.stopPropagation()"
          (click)="$event.stopPropagation()"
          role="group"
          aria-label="Content zoom controls"
        >
          <button
            type="button"
            class="docs-zoom-bar__btn"
            (click)="zoomOut()"
            [disabled]="zoomPercent() <= 50"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            class="docs-zoom-bar__reset"
            (click)="resetZoom()"
            aria-label="Reset zoom to actual size"
            title="Actual size (100%)"
          >
            {{ zoomPercent() }}%
          </button>
          <button
            type="button"
            class="docs-zoom-bar__btn"
            (click)="zoomIn()"
            [disabled]="zoomPercent() >= 200"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ── Category-Based Floating Bottom Dock & Prompts ── -->
      @if (mode() === 'edit') {
        <div class="docs-editor__bottom-dock-container" (mousedown)="$event.stopPropagation()">
          <!-- Category Prompt Popover Anchored Above Dock -->
          @if (activeCategoryPrompt()) {
            <div
              class="docs-category-prompt"
              [class.docs-category-prompt--closing]="isCategoryPromptClosing()"
              (keydown)="onCategoryPromptKeyDown($event)"
              role="dialog"
              [attr.aria-label]="activeCategoryPrompt() + ' options'"
            >
              <div class="docs-category-prompt__header">
                <span class="docs-category-prompt__title">{{ activeCategoryPrompt() }}</span>
                <button
                  type="button"
                  class="docs-category-prompt__close"
                  (click)="closeCategoryPrompt(true)"
                  aria-label="Close prompt"
                >
                  ✕
                </button>
              </div>

              <div class="docs-category-prompt__items" role="toolbar">
                <!-- 1. FORMAT PROMPT -->
                @if (activeCategoryPrompt() === 'format') {
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(applyBold)"
                    aria-label="Bold"
                  >
                    <span class="docs-category-prompt__icon"><strong>B</strong></span>
                    <span class="docs-category-prompt__label">Bold</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(applyItalic)"
                    aria-label="Italic"
                  >
                    <span class="docs-category-prompt__icon"><em>I</em></span>
                    <span class="docs-category-prompt__label">Italic</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(applyInlineCode)"
                    aria-label="Inline code"
                  >
                    <span class="docs-category-prompt__icon">&lt;/&gt;</span>
                    <span class="docs-category-prompt__label">Inline code</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(triggerLinkPrompt)"
                    aria-label="Link"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Link</span>
                  </button>
                }

                <!-- 2. BLOCK PROMPT -->
                @if (activeCategoryPrompt() === 'block') {
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="isCurrentBlockType('heading1')"
                    (click)="selectPromptItem(turnIntoHeading1)"
                    aria-label="Heading 1"
                  >
                    <span class="docs-category-prompt__icon"><strong>H1</strong></span>
                    <span class="docs-category-prompt__label">Heading 1</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="isCurrentBlockType('heading2')"
                    (click)="selectPromptItem(turnIntoHeading2)"
                    aria-label="Heading 2"
                  >
                    <span class="docs-category-prompt__icon"><strong>H2</strong></span>
                    <span class="docs-category-prompt__label">Heading 2</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="isCurrentBlockType('quote')"
                    (click)="selectPromptItem(turnIntoQuote)"
                    aria-label="Quote"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Quote</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="isCurrentBlockType('bullet_list')"
                    (click)="selectPromptItem(turnIntoBulletList)"
                    aria-label="Bulleted list"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Bulleted list</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="isCurrentBlockType('numbered_list')"
                    (click)="selectPromptItem(turnIntoNumberedList)"
                    aria-label="Numbered list"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
                        <path d="M4 6h1v4m-1 0h2m-1 8h2m-2 0c0-1 1-1 1-2s-1-1-1-2h1" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Numbered list</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="isCurrentBlockType('code')"
                    (click)="selectPromptItem(turnIntoCodeBlock)"
                    aria-label="Code block"
                  >
                    <span class="docs-category-prompt__icon">&lt;/&gt;</span>
                    <span class="docs-category-prompt__label">Code block</span>
                  </button>
                }

                <!-- 3. INSERT PROMPT -->
                @if (activeCategoryPrompt() === 'insert') {
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(insertDivider)"
                    aria-label="Divider"
                  >
                    <span class="docs-category-prompt__icon">—</span>
                    <span class="docs-category-prompt__label">Divider</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(triggerTableInsertPrompt)"
                    aria-label="Table"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Table</span>
                  </button>
                  <label
                    class="docs-category-prompt__item docs-category-prompt__item--upload"
                    tabindex="0"
                    (keydown.enter)="triggerPromptUpload($event)"
                    (keydown.space)="triggerPromptUpload($event)"
                    aria-label="Image"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Image</span>
                    <input type="file" accept="image/*" (change)="onPromptImageFile($event)" hidden />
                  </label>
                  <label
                    class="docs-category-prompt__item docs-category-prompt__item--upload"
                    tabindex="0"
                    (keydown.enter)="triggerPromptUpload($event)"
                    (keydown.space)="triggerPromptUpload($event)"
                    aria-label="Video"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect width="14" height="14" x="1" y="5" rx="2" ry="2" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Video</span>
                    <input type="file" accept="video/*" (change)="onPromptVideoFile($event)" hidden />
                  </label>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    (click)="selectPromptItem(triggerEmbedInput)"
                    aria-label="Embed"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Embed</span>
                  </button>
                }

                <!-- 4. LAYOUT PROMPT (Media block selected) -->
                @if (activeCategoryPrompt() === 'layout') {
                  @if (!hasActiveMediaBlock()) {
                    <div class="docs-category-prompt__hint">
                      <span>Select an image or video block to adjust layout</span>
                    </div>
                  }
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="getActiveMediaLayout() === 'inset'"
                    [disabled]="!hasActiveMediaBlock()"
                    (click)="selectPromptItem(setInsetMediaLayout)"
                    aria-label="Inset"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="14" height="14" x="5" y="5" rx="2" />
                        <path d="M2 5v14M22 5v14" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Inset</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="getActiveMediaLayout() === 'wide'"
                    [disabled]="!hasActiveMediaBlock()"
                    (click)="selectPromptItem(setWideMediaLayout)"
                    aria-label="Wide"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Wide</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="getActiveMediaLayout() === 'full'"
                    [disabled]="!hasActiveMediaBlock()"
                    (click)="selectPromptItem(setFullMediaLayout)"
                    aria-label="Full"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Full</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="getActiveMediaLayout() === 'two_up'"
                    [disabled]="!hasActiveMediaBlock()"
                    (click)="selectPromptItem(setTwoUpMediaLayout)"
                    aria-label="Two-up"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="8" height="14" x="3" y="5" rx="1" />
                        <rect width="8" height="14" x="13" y="5" rx="1" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Two-up</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="getActiveMediaLayout() === 'three_up'"
                    [disabled]="!hasActiveMediaBlock()"
                    (click)="selectPromptItem(setThreeUpMediaLayout)"
                    aria-label="Three-up"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="4.5" height="14" x="2.5" y="5" rx="1" />
                        <rect width="4.5" height="14" x="9.5" y="5" rx="1" />
                        <rect width="4.5" height="14" x="16.5" y="5" rx="1" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Three-up</span>
                  </button>
                  <button
                    type="button"
                    class="docs-category-prompt__item"
                    [class.docs-category-prompt__item--active]="getActiveMediaLayout() === 'gallery'"
                    [disabled]="!hasActiveMediaBlock()"
                    (click)="selectPromptItem(setGalleryMediaLayout)"
                    aria-label="Gallery"
                  >
                    <span class="docs-category-prompt__icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="7" height="7" x="3" y="3" rx="1" />
                        <rect width="7" height="7" x="14" y="3" rx="1" />
                        <rect width="7" height="7" x="3" y="14" rx="1" />
                        <rect width="7" height="7" x="14" y="14" rx="1" />
                      </svg>
                    </span>
                    <span class="docs-category-prompt__label">Gallery</span>
                  </button>
                }

                <!-- 5. CODE PROMPT (Inside a code block) -->
                @if (activeCategoryPrompt() === 'code') {
                  @if (!isCurrentBlockType('code')) {
                    <div class="docs-category-prompt__hint">
                      <span>Focus a code block to configure language or copy code</span>
                    </div>
                  }
                  <div class="docs-category-prompt__code-row">
                    <label class="docs-category-prompt__select-wrap">
                      <span class="docs-category-prompt__select-label">Language:</span>
                      <select
                        class="docs-category-prompt__select"
                        [ngModel]="getActiveCodeLanguage()"
                        (ngModelChange)="onCodeLanguageChange($event)"
                        [disabled]="!isCurrentBlockType('code')"
                        aria-label="Select programming language"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="html">HTML</option>
                        <option value="css">CSS</option>
                        <option value="bash">Bash</option>
                        <option value="json">JSON</option>
                        <option value="sql">SQL</option>
                        <option value="markdown">Markdown</option>
                      </select>
                    </label>

                    <button
                      type="button"
                      class="docs-category-prompt__item docs-category-prompt__item--code-copy"
                      [disabled]="!isCurrentBlockType('code')"
                      (click)="selectPromptItem(copyCodeBlock)"
                      aria-label="Copy Code"
                    >
                      <span class="docs-category-prompt__icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </span>
                      <span class="docs-category-prompt__label">Copy Code</span>
                    </button>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Bottom Center Dock with Category Buttons -->
          <div class="docs-editor__bottom-dock" role="toolbar" aria-label="Contextual editing controls">
            <div class="docs-dock__categories" role="tablist" aria-label="Formatting categories">
              <button
                type="button"
                class="docs-dock__category-tab"
                [class.docs-dock__category-tab--active]="activeCategoryPrompt() === 'format'"
                (click)="toggleCategoryPrompt('format')"
                role="tab"
                data-category="format"
                [attr.aria-selected]="activeCategoryPrompt() === 'format'"
                [attr.aria-expanded]="activeCategoryPrompt() === 'format'"
              >
                Format
              </button>
              <button
                type="button"
                class="docs-dock__category-tab"
                [class.docs-dock__category-tab--active]="activeCategoryPrompt() === 'block'"
                (click)="toggleCategoryPrompt('block')"
                role="tab"
                data-category="block"
                [attr.aria-selected]="activeCategoryPrompt() === 'block'"
                [attr.aria-expanded]="activeCategoryPrompt() === 'block'"
              >
                Block
              </button>
              <button
                type="button"
                class="docs-dock__category-tab"
                [class.docs-dock__category-tab--active]="activeCategoryPrompt() === 'insert'"
                (click)="toggleCategoryPrompt('insert')"
                role="tab"
                data-category="insert"
                [attr.aria-selected]="activeCategoryPrompt() === 'insert'"
                [attr.aria-expanded]="activeCategoryPrompt() === 'insert'"
              >
                Insert
              </button>
              <button
                type="button"
                class="docs-dock__category-tab"
                [class.docs-dock__category-tab--active]="activeCategoryPrompt() === 'layout'"
                (click)="toggleCategoryPrompt('layout')"
                role="tab"
                data-category="layout"
                [attr.aria-selected]="activeCategoryPrompt() === 'layout'"
                [attr.aria-expanded]="activeCategoryPrompt() === 'layout'"
              >
                Layout
              </button>
              <button
                type="button"
                class="docs-dock__category-tab"
                [class.docs-dock__category-tab--active]="activeCategoryPrompt() === 'code'"
                (click)="toggleCategoryPrompt('code')"
                role="tab"
                data-category="code"
                [attr.aria-selected]="activeCategoryPrompt() === 'code'"
                [attr.aria-expanded]="activeCategoryPrompt() === 'code'"
              >
                Code
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Fallback Link Prompt Popover (when right sidebar closed) ────── -->
      @if (showLinkPrompt() && !activeRightSidebar()) {
        <div class="docs-editor__link-popover" (mousedown)="$event.stopPropagation()">
          <input
            #linkInputElem
            type="url"
            class="docs-editor__link-input"
            [(ngModel)]="linkUrl"
            (keydown.enter)="applyLink()"
            (keydown.escape)="showLinkPrompt.set(false)"
            placeholder="Paste https:// or mailto: link..."
          />
          <button type="button" class="docs-button docs-button--primary docs-button--xs" (click)="applyLink()">Link</button>
          <button type="button" class="docs-button docs-button--ghost docs-button--xs" (click)="showLinkPrompt.set(false)">✕</button>
        </div>
      }

      <!-- ── Keyboard Shortcuts Modal Dialog ─────────────────────────────── -->
      @if (showShortcutsModal()) {
        <div class="docs-modal__backdrop" (click)="showShortcutsModal.set(false)"></div>
        <div class="docs-shortcuts-dialog docs-modal__box" role="dialog" aria-label="Keyboard Shortcuts">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Keyboard Shortcuts</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showShortcutsModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <input
              type="text"
              class="docs-shortcuts__search"
              placeholder="Search shortcuts..."
              [ngModel]="shortcutsSearchQuery()"
              (ngModelChange)="shortcutsSearchQuery.set($event)"
              autofocus
            />
            <div class="docs-shortcuts__list">
              @for (group of filteredShortcutGroups(); track group.category) {
                <div class="docs-shortcuts__group">
                  <h4 class="docs-shortcuts__group-title">{{ group.category }}</h4>
                  @for (sc of group.items; track sc.keys) {
                    <div class="docs-shortcuts__row">
                      <span class="docs-shortcuts__label">{{ sc.label }}</span>
                      <div class="docs-shortcuts__keycaps">
                        <kbd>{{ sc.keys }}</kbd>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── Action Command Palette Modal ─────────────────────────────────── -->
      @if (showActionPalette()) {
        <div class="docs-modal__backdrop" (click)="showActionPalette.set(false)"></div>
        <div class="docs-slash-menu docs-modal__box docs-action-palette" role="dialog" aria-label="Command Palette">
          <div class="docs-action-palette__header">
            <input
              type="text"
              class="docs-input docs-input--sm"
              placeholder="Type a command or search..."
              [ngModel]="actionPaletteQuery()"
              (ngModelChange)="actionPaletteQuery.set($event)"
              (keydown)="onActionPaletteKeyDown($event)"
              autofocus
            />
          </div>
          <div class="docs-action-palette__list">
            @for (cmd of filteredActionPaletteItems(); track cmd.id; let cIdx = $index) {
              <button
                type="button"
                class="docs-slash-menu__item"
                [class.docs-slash-menu__item--active]="actionPaletteIndex() === cIdx"
                (click)="cmd.action()"
                (mouseenter)="actionPaletteIndex.set(cIdx)"
              >
                <span class="docs-slash-menu__icon">
                  @switch (cmd.id) {
                    @case ('publish') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                    }
                    @case ('toggle-preview') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                    @case ('find-replace') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    }
                    @case ('insert-image') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    }
                    @case ('insert-video') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                    }
                    @case ('insert-code') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    }
                    @case ('keyboard-shortcuts') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10"/></svg>
                    }
                    @case ('duplicate') {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    }
                    @default {
                      <span>{{ cmd.icon }}</span>
                    }
                  }
                </span>
                <div class="docs-slash-menu__info">
                  <p class="docs-slash-menu__title">{{ cmd.label }}</p>
                  <p class="docs-slash-menu__desc">{{ cmd.desc }}</p>
                </div>
                @if (cmd.shortcut) {
                  <span class="docs-slash-menu__keycap">({{ cmd.shortcut }})</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- ── Find & Replace Dialog ────────────────────────────────────────── -->
      @if (showFindModal()) {
        <div class="docs-modal__backdrop" (click)="showFindModal.set(false)"></div>
        <div class="docs-modal__box docs-find-modal" role="dialog" aria-label="Find and Replace">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Find & Replace</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showFindModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <div class="docs-form-group">
              <input
                type="text"
                class="docs-input docs-input--sm"
                placeholder="Find in document..."
                [ngModel]="findQuery()"
                (ngModelChange)="findQuery.set($event)"
                (keydown.enter)="findNext()"
                autofocus
              />
            </div>
            <div class="docs-form-group" style="margin-top: 8px;">
              <input
                type="text"
                class="docs-input docs-input--sm"
                placeholder="Replace with..."
                [ngModel]="replaceQuery()"
                (ngModelChange)="replaceQuery.set($event)"
                (keydown.enter)="replaceAll()"
              />
            </div>
          </div>
          <footer class="docs-modal__actions">
            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="findNext()">Find Next</button>
            <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="replaceAll()">Replace All</button>
          </footer>
        </div>
      }

      <!-- ── Embed Video Prompt Modal ────────────────────────────────────── -->
      @if (showEmbedModal()) {
        <div class="docs-modal__backdrop" (click)="showEmbedModal.set(false)"></div>
        <div class="docs-modal__box">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Embed Video</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showEmbedModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <p class="docs-form-helper">Paste a YouTube or Vimeo URL to embed into your story.</p>
            <div class="docs-form-group">
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="embedUrl"
                (keydown.enter)="confirmEmbedVideo()"
                placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              />
            </div>
          </div>
          <footer class="docs-modal__actions">
            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="showEmbedModal.set(false)">Cancel</button>
            <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="confirmEmbedVideo()">Embed</button>
          </footer>
        </div>
      }

      <!-- ── Image Alt Text Modal ────────────────────────────────────────── -->
      @if (showAltTextModal()) {
        <div class="docs-modal__backdrop" (click)="showAltTextModal.set(false)"></div>
        <div class="docs-modal__box" role="dialog" aria-label="Edit Alt Text">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Image Alt Text</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showAltTextModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <p class="docs-form-helper">Describe the image for screen readers and search engines.</p>
            <div class="docs-form-group">
              <input
                type="text"
                class="docs-input"
                [(ngModel)]="altTextInput"
                (keydown.enter)="saveAltText()"
                placeholder="Descriptive image summary..."
                autofocus
              />
            </div>
          </div>
          <footer class="docs-modal__actions">
            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="showAltTextModal.set(false)">Cancel</button>
            <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="saveAltText()">Save</button>
          </footer>
        </div>
      }

      <!-- ── Video Poster Modal ──────────────────────────────────────────── -->
      @if (showPosterModal()) {
        <div class="docs-modal__backdrop" (click)="showPosterModal.set(false)"></div>
        <div class="docs-modal__box" role="dialog" aria-label="Set Poster Frame">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Video Poster Image</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showPosterModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <p class="docs-form-helper">Enter an image URL to display before the video plays.</p>
            <div class="docs-form-group">
              <input
                type="url"
                class="docs-input"
                [(ngModel)]="posterUrlInput"
                (keydown.enter)="savePosterUrl()"
                placeholder="https://example.com/poster.jpg"
                autofocus
              />
            </div>
          </div>
          <footer class="docs-modal__actions">
            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="showPosterModal.set(false)">Cancel</button>
            <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="savePosterUrl()">Save</button>
          </footer>
        </div>
      }

      <!-- ── Table Insert Size Picker Modal ──────────────────────────────── -->
      @if (showTablePickerModal()) {
        <div class="docs-modal__backdrop" (click)="showTablePickerModal.set(false)"></div>
        <div class="docs-modal__box" role="dialog" aria-label="Insert Table">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Insert Table</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showTablePickerModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <p class="docs-form-helper">Choose the initial number of rows and columns (up to 12 cols, 50 rows).</p>
            <div class="docs-modal__grid-row">
              <label class="docs-form-label docs-modal__grid-col">
                <span>Rows (1–50):</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  class="docs-input docs-input--sm"
                  [(ngModel)]="tablePickerRows"
                  (keydown.enter)="confirmTableInsert()"
                />
              </label>
              <label class="docs-form-label docs-modal__grid-col">
                <span>Columns (1–12):</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  class="docs-input docs-input--sm"
                  [(ngModel)]="tablePickerCols"
                  (keydown.enter)="confirmTableInsert()"
                />
              </label>
            </div>
          </div>
          <footer class="docs-modal__actions">
            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="showTablePickerModal.set(false)">Cancel</button>
            <button type="button" class="docs-button docs-button--primary docs-button--sm" (click)="confirmTableInsert()">Insert Table</button>
          </footer>
        </div>
      }

      <!-- ── Delete Story Confirmation Modal ─────────────────────────────── -->
      @if (showDeleteModal()) {
        <div class="docs-modal__backdrop" (click)="showDeleteModal.set(false)"></div>
        <div class="docs-modal__box">
          <header class="docs-modal__header">
            <h3 class="docs-modal__title">Delete Story?</h3>
            <button type="button" class="docs-icon-button docs-icon-button--xs" (click)="showDeleteModal.set(false)">✕</button>
          </header>
          <div class="docs-modal__body">
            <p>Are you sure you want to delete <strong>{{ title() || 'this story' }}</strong>? This action cannot be undone.</p>
          </div>
          <footer class="docs-modal__actions">
            <button type="button" class="docs-button docs-button--secondary docs-button--sm" (click)="showDeleteModal.set(false)">Cancel</button>
            <button type="button" class="docs-button docs-button--danger docs-button--sm" (click)="executeDelete()">Delete</button>
          </footer>
        </div>
      }

      <!-- ── Toast Notifications Container ──────────────────────────────── -->
      <div class="docs-toast-container" aria-live="polite">
        @for (t of toast.toasts(); track t.id) {
          <div
            class="docs-toast"
            [class.docs-toast--error]="t.type === 'error'"
            [class.docs-toast--info]="t.type === 'info'"
            role="status"
          >
            <span class="docs-toast__msg">{{ t.message }}</span>
            @if (t.action) {
              <button type="button" class="docs-toast__action" (click)="t.action.run()">{{ t.action.label }}</button>
            }
            <button type="button" class="docs-toast__close" (click)="toast.dismiss(t.id)" aria-label="Close notification">✕</button>
          </div>
        }
      </div>
    </div>
  `
})
export class DocsEditorComponent implements OnInit, OnDestroy, ComponentCanDeactivate {
  private readonly docService = inject(DocService);
  readonly toast = inject(DocsToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly mode = signal<'edit' | 'preview'>('edit');
  readonly docId = signal<string>('');
  readonly title = signal<string>('');
  readonly blocks = signal<DocBlock[]>([]);
  readonly version = signal<number>(1);
  readonly docStatus = signal<string>('DRAFT');
  readonly saveState = signal<'saved' | 'dirty' | 'saving' | 'error' | 'offline'>('saved');
  private autosaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private autosaveMaxIntervalTimer: ReturnType<typeof setTimeout> | null = null;
  private firstUnsavedChangeTimestamp: number | null = null;
  private isSaveInFlight = false;
  private hasPendingSaveWhileInFlight = false;
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private minIndicatorTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isMenuOpen = signal<boolean>(false);
  readonly showDeleteModal = signal<boolean>(false);
  readonly showEmbedModal = signal<boolean>(false);
  readonly embedUrl = signal<string>('');
  private embedTargetBlockId: string | null = null;
  private embedInsertAfter = false;

  readonly activePlusBlockId = signal<string | null>(null);
  readonly hoveredPlusBlockId = signal<string | null>(null);
  readonly showPlusTooltip = signal<boolean>(false);
  readonly isPlusClosing = signal<boolean>(false);
  private plusCloseTimer: ReturnType<typeof setTimeout> | null = null;
  readonly focusedBlockId = signal<string | null>(null);
  readonly hoveredBlockId = signal<string | null>(null);
  readonly selectedBlockId = signal<string | null>(null);
  readonly selectedBlockIds = signal<string[]>([]);
  readonly activeTableCell = signal<{ blockId: string; rowIdx: number; colIdx: number } | null>(null);
  readonly copiedBlockId = signal<string | null>(null);

  readonly showAltTextModal = signal<boolean>(false);
  readonly altTextInput = signal<string>('');
  private altTextTargetBlockId: string | null = null;

  readonly showPosterModal = signal<boolean>(false);
  readonly posterUrlInput = signal<string>('');
  private posterTargetBlockId: string | null = null;

  readonly showTablePickerModal = signal<boolean>(false);
  readonly tablePickerRows = signal<number>(3);
  readonly tablePickerCols = signal<number>(3);
  private tablePickerTargetBlockId: string | null = null;

  private clipboardBlocks: DocBlock[] = [];

  // Undo / Redo history snapshots (100 steps)
  private undoStack: Array<{ title: string; blocks: DocBlock[]; focusedBlockId: string | null }> = [];
  private redoStack: Array<{ title: string; blocks: DocBlock[]; focusedBlockId: string | null }> = [];
  private isPerformingUndoRedo = false;

  readonly fontFamily = signal<'serif' | 'sans' | 'mono'>((typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage.getItem('acklet_docs_font') as any : null) || 'serif');
  readonly insertMenuStyle = signal<'standard' | 'radial'>((typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' ? localStorage.getItem('acklet_docs_insert_style') as any : null) || 'standard');
  pendingUploadQueue: Array<{ file: File; type: 'image' | 'video'; blockId: string }> = [];
  isCreatingDraft = false;
  draftCreatedSubject?: Subject<string>;

  // Modal / overlay open state tracking
  readonly isModalOpen = computed(() =>
    this.showDeleteModal() ||
    this.showEmbedModal() ||
    this.showShortcutsModal() ||
    this.showActionPalette() ||
    (this.showLinkPrompt() && !this.activeRightSidebar()) ||
    this.showAltTextModal() ||
    this.showPosterModal() ||
    this.showTablePickerModal()
  );

  // Text selection & right inspector sidebar tracking
  readonly hasTextSelection = signal<boolean>(false);
  readonly showLinkPrompt = signal<boolean>(false);
  readonly linkUrl = signal<string>('');
  private selectedRange: { start: number; end: number; blockId: string } | null = null;
  readonly selectionToolbarPos = signal<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null);
  readonly isSelectionToolbarClosing = signal<boolean>(false);
  readonly activeSelectionToolbar = signal<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null);
  readonly activeRightSidebar = signal<'selection' | 'element' | null>(null);
  private readonly lastElementBlockSnapshot = signal<DocBlock | null>(null);
  readonly displayElementBlock = computed(() => {
    const id = this.selectedBlockId() || this.selectedBlockIds()[0];
    if (id) {
      const blk = this.blocks().find(b => b.id === id);
      if (blk && this.isNonTextBlock(blk.type)) return blk;
    }
    return this.lastElementBlockSnapshot();
  });
  private selectionToolbarCloseTimer: ReturnType<typeof setTimeout> | null = null;
  readonly showSelectionToolbar = computed(() => this.hasTextSelection() && !this.isSelectionToolbarClosing());

  // Content-only zoom (applies to writing/reading content, not popups or sidebars)
  readonly contentZoom = signal<number>(1);
  readonly zoomPercent = computed(() => Math.round(this.contentZoom() * 100));

  zoomIn(): void {
    this.contentZoom.update(z => Math.min(2, Math.round((z + 0.1) * 10) / 10));
  }

  zoomOut(): void {
    this.contentZoom.update(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10));
  }

  resetZoom(): void {
    this.contentZoom.set(1);
  }

  // Find & Replace
  readonly showFindModal = signal<boolean>(false);
  readonly findQuery = signal<string>('');
  readonly replaceQuery = signal<string>('');

  // Outline (Table of Contents)
  readonly outlineHeadings = computed(() => {
    const list = this.blocks();
    const result: Array<{ id: string; type: 'heading1' | 'heading2' | 'heading3'; text: string; depth: number }> = [];
    for (const b of list) {
      if (b.type === 'heading1' || b.type === 'heading2' || b.type === 'heading3') {
        const depth = b.type === 'heading1' ? 1 : b.type === 'heading2' ? 2 : 3;
        result.push({ id: b.id, type: b.type, text: b.text || 'Untitled', depth });
      }
    }
    return result;
  });
  readonly activeOutlineId = signal<string | null>(null);
  readonly showMobileOutline = signal<boolean>(false);

  // Single Contextual Dock computation (Only category matching current context; hidden on empty line)
  readonly activeContext = computed<'format' | 'block' | 'layout' | 'code' | null>(() => {
    if (this.mode() === 'preview') return null;
    if (this.hasTextSelection()) return 'format';

    const focusedId = this.focusedBlockId();
    if (!focusedId) return null;

    const block = this.blocks().find(b => b.id === focusedId);
    if (!block) return null;

    if (block.type === 'code') return 'code';
    if (block.type === 'image' || block.type === 'video') return 'layout';

    // Caret in paragraph, heading, quote, or list item with no selection -> Block category
    if (
      block.type === 'paragraph' ||
      block.type === 'heading1' ||
      block.type === 'heading2' ||
      block.type === 'quote' ||
      block.type === 'bullet_list' ||
      block.type === 'numbered_list'
    ) {
      return 'block';
    }

    return null;
  });

  // User explicitly selected category prompt in the bottom dock
  readonly activeCategoryPrompt = signal<'format' | 'block' | 'insert' | 'layout' | 'code' | null>(null);
  readonly isCategoryPromptClosing = signal<boolean>(false);
  private categoryPromptCloseTimer: ReturnType<typeof setTimeout> | null = null;
  readonly userSelectedCategory = signal<'format' | 'block' | 'insert' | 'layout' | 'code' | null>(null);

  readonly selectedCategory = computed<'format' | 'block' | 'insert' | 'layout' | 'code'>(() => {
    const prompt = this.activeCategoryPrompt();
    if (prompt) return prompt;
    const userChoice = this.userSelectedCategory();
    if (userChoice) return userChoice;
    const ctx = this.activeContext();
    return ctx ?? 'block';
  });

  selectCategory(cat: 'format' | 'block' | 'insert' | 'layout' | 'code'): void {
    this.toggleCategoryPrompt(cat);
  }

  toggleCategoryPrompt(category: 'format' | 'block' | 'insert' | 'layout' | 'code'): void {
    if (this.activeCategoryPrompt() === category) {
      this.closeCategoryPrompt(true);
    } else {
      this.openCategoryPrompt(category);
    }
  }

  openCategoryPrompt(category: 'format' | 'block' | 'insert' | 'layout' | 'code'): void {
    this.closePlusMenuImmediately();
    this.clearCategoryPromptCloseTimer();
    this.isCategoryPromptClosing.set(false);
    this.userSelectedCategory.set(category);
    this.activeCategoryPrompt.set(category);

    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const promptElem = document.querySelector('.docs-category-prompt');
        if (promptElem) {
          const activeItem = promptElem.querySelector<HTMLElement>('.docs-category-prompt__item--active');
          if (activeItem) {
            activeItem.focus();
          } else {
            const firstFocusable = promptElem.querySelector<HTMLElement>('button, select, label[tabindex="0"]');
            firstFocusable?.focus();
          }
        }
      }, 40);
    }
  }

  closeCategoryPrompt(returnFocus: boolean = true): void {
    const currentCat = this.activeCategoryPrompt();
    if (!currentCat) return;

    this.clearCategoryPromptCloseTimer();
    this.isCategoryPromptClosing.set(false);
    this.activeCategoryPrompt.set(null);
    if (returnFocus && typeof document !== 'undefined') {
      const tab = document.querySelector<HTMLButtonElement>(
        `.docs-dock__category-tab[data-category="${currentCat}"]`
      );
      tab?.focus();
    }
  }

  closeCategoryPromptImmediately(): void {
    this.clearCategoryPromptCloseTimer();
    this.isCategoryPromptClosing.set(false);
    this.activeCategoryPrompt.set(null);
  }

  private clearCategoryPromptCloseTimer(): void {
    if (this.categoryPromptCloseTimer) {
      clearTimeout(this.categoryPromptCloseTimer);
      this.categoryPromptCloseTimer = null;
    }
  }

  selectPromptItem(action: () => void): void {
    action();
    this.closeCategoryPrompt(true);
  }

  onCategoryPromptKeyDown(event: KeyboardEvent): void {
    const container = event.currentTarget as HTMLElement;
    if (!container) return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>('.docs-category-prompt__item, select, .docs-category-prompt__close')
    );
    const currentIndex = typeof document !== 'undefined' ? focusable.indexOf(document.activeElement as HTMLElement) : -1;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeCategoryPrompt(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIdx = (currentIndex + 1) % focusable.length;
      focusable[nextIdx]?.focus();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIdx = (currentIndex - 1 + focusable.length) % focusable.length;
      focusable[prevIdx]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusable[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      focusable[focusable.length - 1]?.focus();
    }
  }

  // Bound Action Handlers for Prompts
  readonly applyBold = () => this.applyFormat('bold');
  readonly applyItalic = () => this.applyFormat('italic');
  readonly applyInlineCode = () => this.applyFormat('code');
  readonly triggerLinkPrompt = () => this.toggleLinkPrompt();

  readonly turnIntoHeading1 = () => this.turnActiveBlockInto('heading1');
  readonly turnIntoHeading2 = () => this.turnActiveBlockInto('heading2');
  readonly turnIntoQuote = () => this.turnActiveBlockInto('quote');
  readonly turnIntoBulletList = () => this.turnActiveBlockInto('bullet_list');
  readonly turnIntoNumberedList = () => this.turnActiveBlockInto('numbered_list');
  readonly turnIntoCodeBlock = () => this.turnActiveBlockInto('code');

  readonly insertDivider = () => this.insertDividerBlock();
  readonly triggerEmbedInput = () => this.openEmbedModalFromDock();

  readonly setInsetMediaLayout = () => this.setActiveMediaLayout('inset');
  readonly setWideMediaLayout = () => this.setActiveMediaLayout('wide');
  readonly setFullMediaLayout = () => this.setActiveMediaLayout('full');
  readonly setTwoUpMediaLayout = () => this.setActiveMediaLayout('two_up');
  readonly setThreeUpMediaLayout = () => this.setActiveMediaLayout('three_up');
  readonly setGalleryMediaLayout = () => this.setActiveMediaLayout('gallery');

  readonly copyCodeBlock = () => this.copyActiveCodeBlock();

  hasActiveMediaBlock(): boolean {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return false;
    const block = this.blocks().find(b => b.id === focusedId);
    return block?.type === 'image' || block?.type === 'video';
  }

  insertDividerBlock(): void {
    this.insertBlockAtCursor('divider');
  }

  onCodeLanguageChange(lang: string): void {
    this.setActiveCodeLanguage(lang);
  }

  onPromptImageFile(event: Event): void {
    const focusedId = this.focusedBlockId();
    if (focusedId) {
      this.onImageFileSelected(focusedId, event);
    } else {
      const newBlock: DocBlock = {
        id: this.uid(),
        type: 'image',
        url: '',
        caption: '',
        alt: '',
        layout: 'inset'
      };
      this.blocks.update(list => [...list, newBlock]);
      this.focusedBlockId.set(newBlock.id);
      this.onImageFileSelected(newBlock.id, event);
    }
    this.closeCategoryPrompt(true);
  }

  onPromptVideoFile(event: Event): void {
    const focusedId = this.focusedBlockId();
    if (focusedId) {
      this.onVideoFileSelected(focusedId, event);
    } else {
      const newBlock: DocBlock = {
        id: this.uid(),
        type: 'video',
        url: '',
        caption: '',
        layout: 'inset'
      };
      this.blocks.update(list => [...list, newBlock]);
      this.focusedBlockId.set(newBlock.id);
      this.onVideoFileSelected(newBlock.id, event);
    }
    this.closeCategoryPrompt(true);
  }

  triggerPromptUpload(event: Event): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const input = target.querySelector<HTMLInputElement>('input[type="file"]');
    input?.click();
  }

  triggerUploadFromKeyboard(event: Event): void {
    this.triggerPromptUpload(event);
  }

  isCurrentBlockType(type: DocBlockType): boolean {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return false;
    const block = this.blocks().find(b => b.id === focusedId);
    return block?.type === type;
  }

  // Shortcuts Dialog state
  readonly showShortcutsModal = signal<boolean>(false);
  readonly shortcutsSearchQuery = signal<string>('');

  readonly shortcutGroups = [
    {
      category: 'Text Formatting',
      items: [
        { label: 'Bold', keys: 'Ctrl+B' },
        { label: 'Italic', keys: 'Ctrl+I' },
        { label: 'Inline Code', keys: 'Ctrl+E' },
        { label: 'Insert Link', keys: 'Ctrl+K' }
      ]
    },
    {
      category: 'Block Conversion',
      items: [
        { label: 'Heading 1', keys: 'Ctrl+Alt+1' },
        { label: 'Heading 2', keys: 'Ctrl+Alt+2' },
        { label: 'Paragraph', keys: 'Ctrl+Alt+0' },
        { label: 'Quote', keys: 'Ctrl+Shift+Q' },
        { label: 'Bulleted List', keys: 'Ctrl+Shift+8' },
        { label: 'Numbered List', keys: 'Ctrl+Shift+7' },
        { label: 'Code Block', keys: 'Ctrl+Shift+C' }
      ]
    },
    {
      category: 'Navigation & Editor',
      items: [
        { label: 'Toggle Edit / Preview', keys: 'Ctrl+Shift+P' },
        { label: 'Undo', keys: 'Ctrl+Z' },
        { label: 'Redo', keys: 'Ctrl+Y' },
        { label: 'Command Palette', keys: 'Ctrl+Shift+K' },
        { label: 'Save Draft', keys: 'Ctrl+S' },
        { label: 'Slash Commands', keys: '/' },
        { label: 'Emoji Picker', keys: ':' },
        { label: 'Close Popup / Cancel', keys: 'Esc' }
      ]
    }
  ];

  readonly filteredShortcutGroups = computed(() => {
    const q = this.shortcutsSearchQuery().toLowerCase().trim();
    if (!q) return this.shortcutGroups;
    return this.shortcutGroups
      .map(group => ({
        ...group,
        items: group.items.filter(i =>
          i.label.toLowerCase().includes(q) ||
          i.keys.toLowerCase().includes(q)
        )
      }))
      .filter(group => group.items.length > 0);
  });

  // Action Palette state
  readonly showActionPalette = signal<boolean>(false);
  readonly actionPaletteQuery = signal<string>('');
  readonly actionPaletteIndex = signal<number>(0);

  readonly actionPaletteItems: ActionPaletteItem[] = [
    {
      id: 'publish',
      icon: 'publish',
      label: 'Publish Story',
      desc: 'Configure URL slug, topics and publish to Acklet',
      action: () => { this.showActionPalette.set(false); this.goToPublish(); }
    },
    {
      id: 'toggle-preview',
      icon: 'eye',
      label: 'Toggle Preview',
      desc: 'Switch between Edit canvas and Preview reader view',
      shortcut: 'Ctrl+Shift+P',
      action: () => { this.showActionPalette.set(false); this.setMode(this.mode() === 'edit' ? 'preview' : 'edit'); }
    },
    {
      id: 'find-replace',
      icon: 'search',
      label: 'Find and Replace',
      desc: 'Search document text and replace matches',
      shortcut: 'Ctrl+F',
      action: () => { this.showActionPalette.set(false); this.openFindModal(); }
    },
    {
      id: 'insert-image',
      icon: 'image',
      label: 'Insert Image',
      desc: 'Upload an image from your computer',
      shortcut: 'Ctrl+Alt+I',
      action: () => { this.showActionPalette.set(false); this.triggerImageUpload(); }
    },
    {
      id: 'insert-video',
      icon: 'video',
      label: 'Embed Video',
      desc: 'Embed a video from YouTube or Vimeo',
      shortcut: 'Ctrl+Alt+V',
      action: () => { this.showActionPalette.set(false); this.triggerVideoInsert(); }
    },
    {
      id: 'insert-code',
      icon: 'code',
      label: 'Insert Code Block',
      desc: 'Add a code snippet with syntax highlighting',
      shortcut: 'Ctrl+Shift+C',
      action: () => { this.showActionPalette.set(false); this.insertBlockAtCursor('code'); }
    },
    {
      id: 'keyboard-shortcuts',
      icon: 'keyboard',
      label: 'Keyboard Shortcuts',
      desc: 'View all keyboard shortcuts and navigation commands',
      shortcut: 'Ctrl+/',
      action: () => { this.showActionPalette.set(false); this.openShortcutsModal(); }
    },
    {
      id: 'duplicate',
      icon: 'copy',
      label: 'Duplicate Story',
      desc: 'Create an exact clone of this story draft',
      action: () => { this.showActionPalette.set(false); this.duplicateStory(); }
    }
  ];

  readonly filteredActionPaletteItems = computed(() => {
    const q = this.actionPaletteQuery().toLowerCase().trim();
    if (!q) return this.actionPaletteItems;
    return this.actionPaletteItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q)
    );
  });

  // Seamless preview switch hint & accessibility
  readonly showEditingHint = signal<boolean>(false);
  readonly ariaAnnouncement = signal<string>('');
  private hintTimeout: any;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('docId') || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.docId.set(id);
      this.loadDocument(id);
    } else {
      // Immediate draft canvas for /new
      this.title.set('');
      const initialP = this.createEmptyParagraph();
      this.blocks.set([initialP]);
      this.focusedBlockId.set(initialP.id);
      this.saveState.set('saved');
      // Draft creation is deferred until first keystroke in Title or body
    }

    // Mobile keyboard offset visualViewport listener
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleResize = () => {
        const offset = Math.max(24, (window.innerHeight - (window.visualViewport?.height || window.innerHeight)) + 16);
        document.documentElement.style.setProperty('--mobile-keyboard-offset', `${offset}px`);
      };
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }

    // Global document selection listener for Format context
    if (typeof document !== 'undefined') {
      document.addEventListener('selectionchange', this.handleDocumentSelectionChange);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Online / Offline synchronization listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  ngOnDestroy(): void {
    if (this.saveState() === 'dirty') {
      this.flushAutosave();
    }
    this.clearAutosaveDebounceTimer();
    this.clearAutosaveMaxIntervalTimer();
    this.clearRetryTimer();
    this.clearMinIndicatorTimer();
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
    }
    this.clearPlusCloseTimer();
    this.clearCategoryPromptCloseTimer();
    if (typeof document !== 'undefined') {
      document.removeEventListener('selectionchange', this.handleDocumentSelectionChange);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden' && this.saveState() === 'dirty') {
      this.flushAutosave();
    }
  };

  private handleOnline = (): void => {
    if (this.saveState() === 'offline' || this.hasOfflineBackup(this.docId())) {
      this.syncOfflineChanges();
    }
  };

  private handleOffline = (): void => {
    if (this.saveState() === 'dirty') {
      this.saveOffline();
    }
  };

  @HostListener('window:blur')
  handleWindowBlur(): void {
    if (this.saveState() === 'dirty') {
      this.flushAutosave();
    }
  }

  @HostListener('window:beforeunload')
  handleBeforeUnload(): void {
    if (this.saveState() === 'dirty') {
      this.flushAutosave();
    }
  }

  private handleDocumentSelectionChange = (): void => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const activeEl = document.activeElement;
    const isInput = typeof HTMLInputElement !== 'undefined' && activeEl instanceof HTMLInputElement;
    const isTextarea = typeof HTMLTextAreaElement !== 'undefined' && activeEl instanceof HTMLTextAreaElement;
    if (isInput || isTextarea) {
      if (activeEl.classList?.contains('docs-right-sidebar__link-input')) {
        return;
      }
      const hasInputSel = (activeEl.selectionStart ?? 0) !== (activeEl.selectionEnd ?? 0);
      this.hasTextSelection.set(hasInputSel);
      if (!hasInputSel && !this.showLinkPrompt() && this.activeRightSidebar() === 'selection') {
        this.dismissSelectionToolbar();
      }
      return;
    }
    const sel = window.getSelection();
    const hasSelection = !!sel && sel.toString().trim().length > 0;
    this.hasTextSelection.set(hasSelection);
    if (!hasSelection && !this.showLinkPrompt() && this.activeRightSidebar() === 'selection') {
      this.dismissSelectionToolbar();
    }
  };

  canDeactivate(): boolean {
    if (this.saveState() === 'dirty') {
      this.flushAutosave();
    }
    return this.saveState() !== 'saving';
  }

  ensureDraftCreated(): Observable<string> {
    if (this.docId()) {
      return of(this.docId());
    }
    if (this.isCreatingDraft && this.draftCreatedSubject) {
      return this.draftCreatedSubject.asObservable();
    }
    this.isCreatingDraft = true;
    const subject = new Subject<string>();
    this.draftCreatedSubject = subject;

    this.docService.createDocument({ title: this.title() || 'Untitled story' }).subscribe({
      next: (doc) => {
        const id = doc?.id || this.uid();
        this.docId.set(id);
        this.version.set(doc?.version || 1);
        this.isCreatingDraft = false;
        this.draftCreatedSubject = undefined;

        // Smoothly update URL to /write/<id> without page reload
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState(null, '', `/write/${id}`);
        }

        subject.next(id);
        subject.complete();

        // Process queued uploads
        this.processPendingUploads(id);

        if (this.hasPendingSaveWhileInFlight) {
          this.hasPendingSaveWhileInFlight = false;
          this.performSave();
        }
      },
      error: (err) => {
        console.error('[DocsEditor] Failed to create draft doc', err);
        this.isCreatingDraft = false;
        this.saveState.set('error');
        this.draftCreatedSubject = undefined;
        subject.error(err);
      }
    });

    return subject.asObservable();
  }

  private processPendingUploads(docId: string): void {
    if (this.pendingUploadQueue.length === 0) return;
    const queue = [...this.pendingUploadQueue];
    this.pendingUploadQueue = [];
    for (const item of queue) {
      if (item.type === 'image') {
        this.executeImageUpload(item.blockId, item.file, docId);
      } else {
        this.executeVideoUpload(item.blockId, item.file, docId);
      }
    }
  }

  setFontFamily(font: 'serif' | 'sans' | 'mono'): void {
    this.fontFamily.set(font);
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('acklet_docs_font', font);
    }
  }

  toggleInsertMenuStyle(): void {
    const next = this.insertMenuStyle() === 'standard' ? 'radial' : 'standard';
    this.insertMenuStyle.set(next);
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('acklet_docs_insert_style', next);
    }
  }

  private loadDocument(id: string): void {
    this.docService.getDocument(id).subscribe({
      next: (doc) => {
        this.title.set(doc.title || '');
        this.docStatus.set(doc.status || 'DRAFT');
        this.version.set(doc.version || 1);

        if (doc.blocks && doc.blocks.length > 0) {
          this.blocks.set(doc.blocks);
        } else if (doc.sections && doc.sections.length > 0) {
          const converted: DocBlock[] = [];
          for (const s of doc.sections) {
            if (s.heading && s.heading.trim()) {
              converted.push({ id: this.uid(), type: 'heading1', text: s.heading });
            }
            if (s.body && s.body.trim()) {
              converted.push({ id: this.uid(), type: 'paragraph', text: s.body });
            }
          }
          this.blocks.set(converted.length ? converted : [this.createEmptyParagraph()]);
        } else {
          this.blocks.set([this.createEmptyParagraph()]);
        }
        this.ensureTrailingParagraph();
        this.saveState.set('saved');
      },
      error: () => {
        this.toast.error('Failed to load story');
      }
    });
  }

  setMode(newMode: 'edit' | 'preview'): void {
    if (this.mode() === newMode) return;
    this.mode.set(newMode);
    this.closePlusMenuImmediately();
    this.showLinkPrompt.set(false);

    if (newMode === 'edit') {
      this.ariaAnnouncement.set('Switched to edit mode');
      this.triggerEditingHint();
    } else {
      this.ariaAnnouncement.set('Switched to preview mode');
    }
  }

  onPreviewCanvasClick(event: MouseEvent): void {
    this.setMode('edit');
  }

  onPreviewBlockClick(event: { blockId: string; offset?: number }): void {
    this.setMode('edit');
    this.focusedBlockId.set(event.blockId);
  }

  private triggerEditingHint(): void {
    this.showEditingHint.set(true);
    if (this.hintTimeout) clearTimeout(this.hintTimeout);
    this.hintTimeout = setTimeout(() => {
      this.showEditingHint.set(false);
    }, 1500);
  }

  onTitleChange(): void {
    this.triggerAutosave();
  }

  onTitleEnter(event: Event): void {
    event.preventDefault();
    if (this.blocks().length === 0) {
      this.blocks.set([this.createEmptyParagraph()]);
    }
    const firstId = this.blocks()[0].id;
    this.focusedBlockId.set(firstId);
    this.focusFirstInputInBlock(firstId);
  }

  onTitleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLTextAreaElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'down') && this.blocks().length > 0) {
        event.preventDefault();
        this.moveFocusToAdjacentBlock(-1, 1);
      }
    }
  }

  onBlockContentChange(): void {
    this.ensureTrailingParagraph();
    this.triggerAutosave();
  }

  onTitleFocus(): void {
    this.focusedBlockId.set(null);
    if (this.selectedBlockId() || this.selectedBlockIds().length > 0 || this.activeRightSidebar()) {
      this.closeRightSidebar();
    }
  }

  setFocusedBlock(blockId: string): void {
    this.focusedBlockId.set(blockId);
    const blk = this.blocks().find(b => b.id === blockId);
    if (blk && !this.isNonTextBlock(blk.type)) {
      if (this.selectedBlockId() || this.selectedBlockIds().length > 0) {
        const curSel = this.selectedElementBlockSnapshot();
        if (curSel) {
          this.lastElementBlockSnapshot.set(curSel);
        }
        this.selectedBlockId.set(null);
        this.selectedBlockIds.set([]);
        if (!this.hasTextSelection() && this.activeRightSidebar() === 'element') {
          this.triggerRightSidebarClose(false);
        }
      } else if (this.selectedRange && this.selectedRange.blockId !== blockId) {
        this.dismissSelectionToolbar();
      }
    }
  }

  private selectedElementBlockSnapshot(): DocBlock | null {
    const id = this.selectedBlockId() || this.selectedBlockIds()[0];
    if (!id) return null;
    const blk = this.blocks().find(b => b.id === id);
    return blk && this.isNonTextBlock(blk.type) ? blk : null;
  }

  private isTouchOrMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      window.innerWidth < 768
    );
  }

  isBlockEmpty(block: DocBlock): boolean {
    if (!block) return true;
    if (block.type === 'paragraph' || block.type === 'heading1' || block.type === 'heading2' || block.type === 'heading3' || block.type === 'quote' || block.type === 'code') {
      return !block.text || !block.text.trim();
    }
    if (block.type === 'bullet_list' || block.type === 'numbered_list') {
      return (!block.text || !block.text.trim()) && (!block.items || block.items.length === 0 || (block.items.length === 1 && !block.items[0]?.trim()));
    }
    return false;
  }

  getParagraphPlaceholder(block: DocBlock, idx: number): string {
    if (idx !== 0) return '';
    const all = this.blocks();
    if (all.length !== 1) return '';
    if (block.text && block.text.trim().length > 0) return '';
    return 'Tell your story...';
  }

  ensureTrailingParagraph(): void {
    if (this.blocks().length === 0) {
      const initialP = this.createEmptyParagraph();
      this.blocks.set([initialP]);
    }
  }

  shouldShowPlusRow(blockId: string, idx: number): boolean {
    if (this.mode() !== 'edit') return false;
    const list = this.blocks();
    return list.length > 0 && idx === list.length - 1 && list[idx]?.id === blockId;
  }

  isPlusVisible(blockId: string): boolean {
    if (this.mode() !== 'edit') return false;
    if (this.isModalOpen()) return false;
    return true;
  }

  private clearPlusCloseTimer(): void {
    if (this.plusCloseTimer) {
      clearTimeout(this.plusCloseTimer);
      this.plusCloseTimer = null;
    }
  }

  onPlusMouseEnter(blockId: string): void {
    this.hoveredPlusBlockId.set(blockId);
  }

  onPlusMouseLeave(): void {
    this.hoveredPlusBlockId.set(null);
  }

  onQuickToolbarMouseEnter(): void {
    // Hover does not open or delay close
  }

  onQuickToolbarMouseLeave(): void {
    // Hover does not open or delay close
  }

  openPlusMenu(blockId: string): void {
    this.clearPlusCloseTimer();
    this.isPlusClosing.set(false);
    this.activePlusBlockId.set(blockId);
    this.closeCategoryPromptImmediately();
  }

  closePlusMenu(focusBtnId?: string): void {
    if (!this.activePlusBlockId()) return;

    if (focusBtnId) {
      this.focusedBlockId.set(focusBtnId);
    }
    this.isPlusClosing.set(true);
    this.clearPlusCloseTimer();
    this.plusCloseTimer = setTimeout(() => {
      this.activePlusBlockId.set(null);
      this.isPlusClosing.set(false);
      if (focusBtnId && typeof document !== 'undefined') {
        setTimeout(() => {
          const plusBtn = document.querySelector<HTMLButtonElement>(
            `.docs-editor-block[data-block-id="${focusBtnId}"] .docs-editor__plus-btn`
          );
          plusBtn?.focus();
        }, 30);
      }
    }, 240);
  }

  closePlusMenuImmediately(): void {
    this.clearPlusCloseTimer();
    this.isPlusClosing.set(false);
    this.activePlusBlockId.set(null);
  }

  closePlusMenuAndFocusBtn(blockId: string): void {
    this.closePlusMenu(blockId);
  }

  convertBlockAndClose(blockId: string, type: DocBlockType): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (block && block.type === 'paragraph' && (!block.text || !block.text.trim()) && type !== 'paragraph') {
      this.convertBlock(blockId, type);
      this.focusedBlockId.set(blockId);
    } else {
      const idx = this.blocks().findIndex(b => b.id === blockId);
      const newBlock: DocBlock = {
        id: this.uid(),
        type: type,
        text: '',
        items: type === 'bullet_list' || type === 'numbered_list' ? [''] : undefined,
        codeLanguage: type === 'code' ? 'typescript' : undefined,
        calloutType: type === 'callout' ? 'info' : undefined,
        tableData: type === 'table' ? {
          headerRow: true,
          rows: [['', '', ''], ['', '', ''], ['', '', '']],
          alignments: ['left', 'left', 'left']
        } : undefined
      };
      if (idx >= 0) {
        this.insertBlockAfter(idx, newBlock);
      } else {
        this.blocks.update(list => [...list, newBlock]);
      }
      this.focusedBlockId.set(newBlock.id);
    }
    this.closePlusMenuImmediately();
    this.triggerAutosave();
  }

  onCanvasBackgroundClick(event: MouseEvent): void {
    this.closePlusMenuImmediately();
    this.closeCategoryPrompt(false);
    this.isMenuOpen.set(false);
    const target = event.target as HTMLElement | null;
    const inBlockOrSidebar = target?.closest?.('.docs-editor-block') || target?.closest?.('.docs-editor__right-sidebar');
    if (!inBlockOrSidebar && this.activeRightSidebar()) {
      this.closeRightSidebar();
    } else {
      this.showLinkPrompt.set(false);
    }
  }

  togglePlusMenu(blockId: string, event?: Event): void {
    if (event) event.stopPropagation();

    if (this.activePlusBlockId() === blockId) {
      this.closePlusMenu();
    } else {
      this.openPlusMenu(blockId);
    }
  }

  onPlusKeyDown(event: KeyboardEvent, blockId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.openPlusMenu(blockId);
      setTimeout(() => {
        const toolbar = document.querySelector(
          `.docs-editor-block[data-block-id="${blockId}"] .docs-editor__quick-toolbar`
        );
        if (toolbar) {
          const firstBtn = toolbar.querySelector<HTMLElement>('button, label[tabindex="0"]');
          firstBtn?.focus();
        }
      }, 50);
    }
  }

  onQuickToolbarKeyDown(event: KeyboardEvent, blockId: string): void {
    const toolbar = event.currentTarget as HTMLElement;
    const focusable = toolbar && toolbar.querySelectorAll ? Array.from(
      toolbar.querySelectorAll<HTMLElement>('button, label[tabindex="0"]')
    ) : [];
    const currentIndex = typeof document !== 'undefined' ? focusable.indexOf(document.activeElement as HTMLElement) : -1;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closePlusMenuAndFocusBtn(blockId);
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIdx = (currentIndex + 1) % focusable.length;
      focusable[nextIdx]?.focus();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIdx = (currentIndex - 1 + focusable.length) % focusable.length;
      focusable[prevIdx]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusable[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      focusable[focusable.length - 1]?.focus();
    }
  }

  triggerFileInput(event: Event): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    const input = target.querySelector<HTMLInputElement>('input[type="file"]');
    input?.click();
  }

  onParagraphChange(blockId: string, text: string): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (!block) return;

    // 1. Block prefix markdown conversions
    if (text.startsWith('# ')) {
      block.type = 'heading1';
      block.text = text.slice(2);
      this.onBlockContentChange();
      return;
    }
    if (text.startsWith('## ')) {
      block.type = 'heading2';
      block.text = text.slice(3);
      this.onBlockContentChange();
      return;
    }
    if (text.startsWith('### ')) {
      block.type = 'heading3';
      block.text = text.slice(4);
      this.onBlockContentChange();
      return;
    }
    if (text.startsWith('> ')) {
      block.type = 'quote';
      block.text = text.slice(2);
      this.onBlockContentChange();
      return;
    }
    if (text.startsWith('- ') || text.startsWith('* ')) {
      block.type = 'bullet_list';
      block.text = '';
      block.items = [text.slice(2)];
      this.onBlockContentChange();
      return;
    }
    if (/^1\.\s/.test(text)) {
      block.type = 'numbered_list';
      block.text = '';
      block.items = [text.replace(/^1\.\s/, '')];
      this.onBlockContentChange();
      return;
    }
    if (text.startsWith('```')) {
      block.type = 'code';
      block.text = text.replace(/^```\w*\s*/, '');
      this.onBlockContentChange();
      return;
    }

    // 2. Inline Markdown conversions without literal markers
    const boldMatch = text.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      const start = boldMatch.index;
      const inner = boldMatch[1];
      const end = start + inner.length;
      block.text = text.slice(0, start) + inner + text.slice(start + boldMatch[0].length);
      block.formats = block.formats || [];
      block.formats.push({ start, end, type: 'bold' });
      this.onBlockContentChange();
      return;
    }

    const italicMatch = text.match(/\*([^*]+)\*/);
    if (italicMatch && italicMatch.index !== undefined && !text.includes('**')) {
      const start = italicMatch.index;
      const inner = italicMatch[1];
      const end = start + inner.length;
      block.text = text.slice(0, start) + inner + text.slice(start + italicMatch[0].length);
      block.formats = block.formats || [];
      block.formats.push({ start, end, type: 'italic' });
      this.onBlockContentChange();
      return;
    }

    const codeMatch = text.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      const start = codeMatch.index;
      const inner = codeMatch[1];
      const end = start + inner.length;
      block.text = text.slice(0, start) + inner + text.slice(start + codeMatch[0].length);
      block.formats = block.formats || [];
      block.formats.push({ start, end, type: 'code' });
      this.onBlockContentChange();
      return;
    }

    this.onBlockContentChange();
  }

  convertBlock(blockId: string, newType: DocBlockType): void {
    this.blocks.update(list =>
      list.map(b => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          type: newType,
          items: newType === 'bullet_list' || newType === 'numbered_list' ? (b.items || ['']) : undefined,
          calloutType: newType === 'callout' ? 'info' : undefined,
          codeLanguage: newType === 'code' ? 'typescript' : undefined,
          tableData: newType === 'table' ? (b.tableData || {
            headerRow: true,
            rows: [['', '', ''], ['', '', ''], ['', '', '']],
            alignments: ['left', 'left', 'left']
          }) : undefined
        };
      })
    );
    this.closePlusMenuImmediately();
    this.triggerAutosave();
  }

  convertActiveBlock(newType: DocBlockType): void {
    const id = this.focusedBlockId() || (this.blocks()[0]?.id);
    if (id) {
      this.convertBlock(id, newType);
      this.focusedBlockId.set(id);
    }
  }

  turnActiveBlockInto(newType: DocBlockType): void {
    this.convertActiveBlock(newType);
  }

  createEmptyParagraph(): DocBlock {
    return {
      id: this.uid(),
      type: 'paragraph',
      text: ''
    };
  }

  onBlockKeyDown(blockId: string, index: number, event: KeyboardEvent): void {
    const block = this.blocks()[index];
    if (!block) return;

    // Markdown shortcut check on space key
    if (event.key === ' ' && block.type === 'paragraph' && block.text) {
      const trimmed = block.text.trim();
      if (trimmed === '#') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'heading1');
        return;
      } else if (trimmed === '##') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'heading2');
        return;
      } else if (trimmed === '>') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'quote');
        return;
      } else if (trimmed === '-' || trimmed === '*') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'bullet_list');
        return;
      } else if (trimmed === '1.') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'numbered_list');
        return;
      } else if (trimmed === '```') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'code');
        return;
      } else if (trimmed === '---') {
        event.preventDefault();
        block.text = '';
        this.convertBlock(blockId, 'divider');
        this.insertBlockAfter(index, this.createEmptyParagraph());
        return;
      }
    }

    // Backspace handling
    if (event.key === 'Backspace') {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      const isEmpty = this.isBlockEmpty(block);
      const isCaretAtStart = target ? (target.selectionStart === 0 && target.selectionEnd === 0) : false;

      // 1. Backspace on empty block: delete block and focus previous
      if (isEmpty && isCaretAtStart) {
        event.preventDefault();
        if (this.blocks().length > 1) {
          this.pushHistorySnapshot();
          const prevBlock = this.blocks()[index - 1];
          this.blocks.update(list => list.filter(b => b.id !== blockId));
          if (prevBlock) {
            if (!this.isNonTextBlock(prevBlock.type)) {
              this.focusedBlockId.set(prevBlock.id);
              setTimeout(() => {
                this.setCaretPosition(prevBlock.id, (prevBlock.text || '').length);
              }, 0);
            } else {
              this.selectBlock(prevBlock.id);
              this.focusBlockElement(prevBlock.id);
            }
          }
          this.triggerAutosave();
        }
        return;
      }

      // 2. Backspace at start of non-empty block: merge into previous block
      if (isCaretAtStart && index > 0) {
        event.preventDefault();
        const prevBlock = this.blocks()[index - 1];
        if (prevBlock && !this.isNonTextBlock(prevBlock.type)) {
          const currentTextLen = (block.text || '').length;
          if (currentTextLen > 200) {
            this.pushHistorySnapshot();
            this.toast.showWithAction('Block merged', { label: 'Undo', run: () => this.undo() }, 6000, 'info');
          }

          const joinPoint = (prevBlock.text || '').length;
          prevBlock.text = (prevBlock.text || '') + (block.text || '');
          this.blocks.update(list => list.filter(b => b.id !== blockId));
          this.focusedBlockId.set(prevBlock.id);
          setTimeout(() => {
            this.setCaretPosition(prevBlock.id, joinPoint);
          }, 0);
          this.triggerAutosave();
          return;
        } else if (prevBlock && this.isNonTextBlock(prevBlock.type)) {
          this.selectBlock(prevBlock.id);
          this.focusBlockElement(prevBlock.id);
          return;
        }
      }
    }

    // Delete key handling at end of block: pull next block up (standard merge)
    if (event.key === 'Delete') {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      const textLen = (block.text || '').length;
      const isCaretAtEnd = target ? (target.selectionStart === textLen && target.selectionEnd === textLen) : false;

      if (isCaretAtEnd && index < this.blocks().length - 1) {
        const nextBlock = this.blocks()[index + 1];
        if (nextBlock && !this.isNonTextBlock(nextBlock.type)) {
          event.preventDefault();
          const nextTextLen = (nextBlock.text || '').length;
          if (nextTextLen > 200) {
            this.pushHistorySnapshot();
            this.toast.showWithAction('Block merged', { label: 'Undo', run: () => this.undo() }, 6000, 'info');
          }
          block.text = (block.text || '') + (nextBlock.text || '');
          this.blocks.update(list => list.filter(b => b.id !== nextBlock.id));
          setTimeout(() => {
            this.setCaretPosition(block.id, textLen);
          }, 0);
          this.triggerAutosave();
          return;
        }
      }
    }

    // Arrow down: first priority for text inside block, then move to below component
    if (event.key === 'ArrowDown' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'down') && index < this.blocks().length - 1) {
        event.preventDefault();
        this.moveFocusToAdjacentBlock(index, 1);
        return;
      }
    }

    // Arrow up: first priority for text inside block, then move to above component
    if (event.key === 'ArrowUp' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'up')) {
        event.preventDefault();
        this.moveFocusToAdjacentBlock(index, -1);
        return;
      }
    }
  }

  private isCaretAtVerticalBoundary(
    target: HTMLInputElement | HTMLTextAreaElement | null,
    direction: 'up' | 'down'
  ): boolean {
    if (!target) return false;
    const val = target.value ?? '';
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? start;
    if (start !== end) return false;
    if (val.length === 0) return true;

    const tag = (target.tagName || '').toLowerCase();
    if (tag === 'input') return true;

    if (direction === 'up') {
      if (start === 0) return true;
      if (val.slice(0, start).includes('\n')) return false;
    } else {
      if (end === val.length) return true;
      if (val.slice(end).includes('\n')) return false;
    }

    if (typeof window === 'undefined' || !target.scrollHeight) {
      return direction === 'up' ? start === 0 : end === val.length;
    }
    const lineHeight = parseFloat(window.getComputedStyle(target).lineHeight || '24') || 24;
    const isWrappedMultiLine = target.scrollHeight > lineHeight * 1.6;
    if (isWrappedMultiLine) {
      return direction === 'up' ? start === 0 : end === val.length;
    }
    return true;
  }

  private focusTitleAtEnd(): void {
    this.focusedBlockId.set(null);
    this.selectedBlockId.set(null);
    this.selectedBlockIds.set([]);
    if (this.activeRightSidebar() === 'element') {
      this.triggerRightSidebarClose(false);
    }
    if (typeof document === 'undefined') return;
    const titleEl = document.querySelector('.docs-editor__title-input') as HTMLTextAreaElement | null;
    if (titleEl) {
      titleEl.focus();
      const len = titleEl.value.length;
      try { titleEl.setSelectionRange(len, len); } catch { /* ignore */ }
    }
  }

  private focusEditableBlockEdge(blockId: string, edge: 'start' | 'end'): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      const els = document.querySelectorAll(
        `[data-block-id="${blockId}"] input:not([type="checkbox"]):not([type="file"]):not([type="hidden"]), [data-block-id="${blockId}"] textarea`
      );
      if (els.length === 0) return;
      const target = (edge === 'end' ? els[els.length - 1] : els[0]) as HTMLInputElement | HTMLTextAreaElement;
      target.focus();
      const pos = edge === 'end' ? (target.value?.length ?? 0) : 0;
      try { target.setSelectionRange(pos, pos); } catch { /* ignore */ }
    }, 10);
  }

  private focusIndexedInputInBlock(blockId: string, selector: string, idx: number, edge: 'start' | 'end'): void {
    if (typeof document === 'undefined') return;
    setTimeout(() => {
      const inputs = document.querySelectorAll(`[data-block-id="${blockId}"] ${selector}`);
      const target = inputs[idx] as HTMLInputElement | HTMLTextAreaElement | undefined;
      if (!target) return;
      target.focus();
      const pos = edge === 'end' ? (target.value?.length ?? 0) : 0;
      try { target.setSelectionRange(pos, pos); } catch { /* ignore */ }
    }, 10);
  }

  private moveFocusFromBlock(blockId: string, direction: -1 | 1): void {
    const idx = this.blocks().findIndex(b => b.id === blockId);
    if (idx >= 0) {
      this.moveFocusToAdjacentBlock(idx, direction);
    }
  }

  private moveFocusToAdjacentBlock(fromIndex: number, direction: -1 | 1): void {
    const list = this.blocks();
    const targetIdx = fromIndex + direction;
    if (targetIdx < 0) {
      if (direction === -1) {
        this.focusTitleAtEnd();
      }
      return;
    }
    if (targetIdx >= list.length) return;

    const next = list[targetIdx];
    if (this.isNonTextBlock(next.type)) {
      this.selectBlock(next.id);
      this.focusBlockElement(next.id);
      return;
    }

    if (this.selectedBlockId() || this.selectedBlockIds().length > 0) {
      const curSel = this.selectedElementBlockSnapshot();
      if (curSel) {
        this.lastElementBlockSnapshot.set(curSel);
      }
      this.selectedBlockId.set(null);
      this.selectedBlockIds.set([]);
    }
    if (!this.hasTextSelection() && this.activeRightSidebar() === 'element') {
      this.triggerRightSidebarClose(false);
    }
    this.focusedBlockId.set(next.id);
    this.focusEditableBlockEdge(next.id, direction === -1 ? 'end' : 'start');
  }

  onListKeyDown(blockId: string, itemIdx: number, event: KeyboardEvent, listType: 'bullet' | 'numbered'): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (!block || !block.items) return;

    if (event.key === 'ArrowUp' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLInputElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'up')) {
        event.preventDefault();
        if (itemIdx > 0) {
          this.focusIndexedInputInBlock(blockId, '.docs-editor__list-input', itemIdx - 1, 'end');
        } else {
          this.moveFocusFromBlock(blockId, -1);
        }
        return;
      }
    }

    if (event.key === 'ArrowDown' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLInputElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'down')) {
        event.preventDefault();
        if (itemIdx < block.items.length - 1) {
          this.focusIndexedInputInBlock(blockId, '.docs-editor__list-input', itemIdx + 1, 'start');
        } else {
          this.moveFocusFromBlock(blockId, 1);
        }
        return;
      }
    }

    // Tab indents, Shift+Tab outdents list item (up to 6 levels: 0 to 5)
    if (event.key === 'Tab') {
      event.preventDefault();
      const currentLevel = block.itemLevels?.[itemIdx] ?? 0;
      const newLevel = event.shiftKey ? Math.max(0, currentLevel - 1) : Math.min(5, currentLevel + 1);
      if (!block.itemLevels) {
        block.itemLevels = new Array(block.items.length).fill(0);
      }
      block.itemLevels[itemIdx] = newLevel;
      this.triggerAutosave();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const currentVal = block.items[itemIdx] || '';
      if (currentVal.trim() === '') {
        block.items.splice(itemIdx, 1);
        if (block.itemLevels) {
          block.itemLevels.splice(itemIdx, 1);
        }
        if (block.items.length === 0) {
          this.convertBlock(blockId, 'paragraph');
        } else {
          const blockIdx = this.blocks().findIndex(b => b.id === blockId);
          const newP = this.createEmptyParagraph();
          this.insertBlockAfter(blockIdx, newP);
          this.focusedBlockId.set(newP.id);
        }
      } else {
        const currentLevel = block.itemLevels?.[itemIdx] ?? 0;
        block.items.splice(itemIdx + 1, 0, '');
        if (!block.itemLevels) {
          block.itemLevels = new Array(block.items.length - 1).fill(0);
        }
        block.itemLevels.splice(itemIdx + 1, 0, currentLevel);
      }
      this.triggerAutosave();
    } else if (event.key === 'Backspace' && (!block.items[itemIdx] || block.items[itemIdx].length === 0)) {
      if (block.items.length > 1) {
        event.preventDefault();
        block.items.splice(itemIdx, 1);
        if (block.itemLevels) {
          block.itemLevels.splice(itemIdx, 1);
        }
        this.triggerAutosave();
      } else {
        event.preventDefault();
        this.convertBlock(blockId, 'paragraph');
      }
    }
  }

  updateListItem(blockId: string, itemIdx: number, value: string): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (block && block.items) {
      block.items[itemIdx] = value;
      this.triggerAutosave();
    }
  }

  insertBlockAfter(index: number, newBlock: DocBlock): void {
    this.blocks.update(list => {
      const copy = [...list];
      copy.splice(index + 1, 0, newBlock);
      return copy;
    });
  }

  moveBlock(index: number, direction: -1 | 1): void {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= this.blocks().length) return;
    this.blocks.update(list => {
      const copy = [...list];
      const item = copy.splice(index, 1)[0];
      copy.splice(targetIdx, 0, item);
      return copy;
    });
    this.triggerAutosave();
  }

  cycleLayout(blockId: string): void {
    const layouts: MediaLayout[] = ['inset', 'wide', 'full'];
    this.blocks.update(list =>
      list.map(b => {
        if (b.id !== blockId) return b;
        const current = b.layout || 'inset';
        const nextIdx = (layouts.indexOf(current) + 1) % layouts.length;
        return { ...b, layout: layouts[nextIdx] };
      })
    );
    this.triggerAutosave();
  }

  getActiveMediaLayout(): MediaLayout {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return 'inset';
    const block = this.blocks().find(b => b.id === focusedId);
    return block?.layout || 'inset';
  }

  setActiveMediaLayout(layout: MediaLayout): void {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return;
    this.blocks.update(list =>
      list.map(b => b.id === focusedId ? { ...b, layout } : b)
    );
    this.triggerAutosave();
  }

  cycleActiveMediaLayout(): void {
    const focusedId = this.focusedBlockId();
    if (focusedId) {
      this.cycleLayout(focusedId);
    }
  }

  getActiveCodeLanguage(): string {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return 'typescript';
    const block = this.blocks().find(b => b.id === focusedId);
    return block?.codeLanguage || 'typescript';
  }

  setActiveCodeLanguage(lang: string): void {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return;
    this.blocks.update(list =>
      list.map(b => b.id === focusedId ? { ...b, codeLanguage: lang } : b)
    );
    this.triggerAutosave();
  }

  copyActiveCodeBlock(): void {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return;
    const block = this.blocks().find(b => b.id === focusedId);
    if (block && block.text) {
      navigator.clipboard.writeText(block.text).then(() => {
        this.toast.success('Code copied to clipboard');
      });
    }
  }

  copyCode(code: string, blockId: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copiedBlockId.set(blockId);
      this.toast.success('Code copied to clipboard');
      setTimeout(() => {
        if (this.copiedBlockId() === blockId) {
          this.copiedBlockId.set(null);
        }
      }, 2000);
    });
  }

  getCodeLineNumbers(text?: string): number[] {
    const lineCount = (text || '').split('\n').length;
    return new Array(Math.max(1, lineCount)).fill(0);
  }

  pushHistorySnapshot(): void {
    if (this.isPerformingUndoRedo) return;
    const snapshot = {
      title: this.title(),
      blocks: JSON.parse(JSON.stringify(this.blocks())),
      focusedBlockId: this.focusedBlockId()
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 100) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    const current = {
      title: this.title(),
      blocks: JSON.parse(JSON.stringify(this.blocks())),
      focusedBlockId: this.focusedBlockId()
    };
    this.redoStack.push(current);
    const previous = this.undoStack.pop()!;
    this.isPerformingUndoRedo = true;
    this.title.set(previous.title);
    this.blocks.set(previous.blocks);
    if (previous.focusedBlockId) {
      this.focusedBlockId.set(previous.focusedBlockId);
    }
    this.isPerformingUndoRedo = false;
    this.triggerAutosave();
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const current = {
      title: this.title(),
      blocks: JSON.parse(JSON.stringify(this.blocks())),
      focusedBlockId: this.focusedBlockId()
    };
    this.undoStack.push(current);
    const next = this.redoStack.pop()!;
    this.isPerformingUndoRedo = true;
    this.title.set(next.title);
    this.blocks.set(next.blocks);
    if (next.focusedBlockId) {
      this.focusedBlockId.set(next.focusedBlockId);
    }
    this.isPerformingUndoRedo = false;
    this.triggerAutosave();
  }

  setCaretPosition(blockId: string, offset: number): void {
    if (typeof document === 'undefined') return;
    const blockElem = document.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElem) return;
    const input = blockElem.querySelector('.docs-editor__input, .docs-editor__textarea, input, textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    if (input) {
      input.focus();
      try {
        input.setSelectionRange(offset, offset);
      } catch {
        // ignore
      }
    }
  }

  deleteBlock(blockId: string): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (!block) return;
    const hasMedia = block.type === 'image' || block.type === 'video' || block.type === 'file';
    const hasLongText = (block.text || '').length > 200;
    if (hasMedia || hasLongText) {
      this.pushHistorySnapshot();
      this.toast.showWithAction('Block deleted', { label: 'Undo', run: () => this.undo() }, 6000, 'info');
    }
    this.blocks.update(list => list.filter(b => b.id !== blockId));
    if (this.blocks().length === 0) {
      this.blocks.set([this.createEmptyParagraph()]);
    }
    this.triggerAutosave();
  }

  // Media Uploads
  onImageFileSelected(blockId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Image file must be under 10 MB');
      return;
    }

    if (!this.docId()) {
      this.toast.info('Saving your draft first…');
      this.pendingUploadQueue.push({ file, type: 'image', blockId });
      this.ensureDraftCreated().subscribe();
      return;
    }

    this.executeImageUpload(blockId, file, this.docId());
  }

  executeImageUpload(blockId: string, file: File, docId: string): void {
    this.closePlusMenuImmediately();
    this.docService.uploadImage(docId, file).subscribe({
      next: (res) => {
        this.blocks.update(list =>
          list.map(b => {
            if (b.id !== blockId) return b;
            return {
              ...b,
              type: 'image',
              url: res.url,
              alt: '',
              caption: '',
              layout: 'inset'
            };
          })
        );
        this.triggerAutosave();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to upload image');
      }
    });
  }

  onDockImageSelected(event: Event): void {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return;
    this.onImageFileSelected(focusedId, event);
  }

  onVideoFileSelected(blockId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    if (file.size > 100 * 1024 * 1024) {
      this.toast.error('Video file must be under 100 MB');
      return;
    }

    if (!this.docId()) {
      this.toast.info('Saving your draft first…');
      this.pendingUploadQueue.push({ file, type: 'video', blockId });
      this.ensureDraftCreated().subscribe();
      return;
    }

    this.executeVideoUpload(blockId, file, this.docId());
  }

  executeVideoUpload(blockId: string, file: File, docId: string): void {
    this.closePlusMenuImmediately();
    this.docService.uploadVideo(docId, file).subscribe({
      next: (res) => {
        this.blocks.update(list =>
          list.map(b => {
            if (b.id !== blockId) return b;
            return {
              ...b,
              type: 'video',
              url: res.url,
              caption: '',
              layout: 'inset',
              embedType: 'upload'
            };
          })
        );
        this.triggerAutosave();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to upload video');
      }
    });
  }

  onDockVideoSelected(event: Event): void {
    const focusedId = this.focusedBlockId();
    if (!focusedId) return;
    this.onVideoFileSelected(focusedId, event);
  }

  triggerImageUpload(): void {
    const newBlock: DocBlock = {
      id: this.uid(),
      type: 'image',
      url: '',
      caption: '',
      alt: '',
      layout: 'inset'
    };
    this.blocks.update(list => [...list, newBlock]);
    this.focusedBlockId.set(newBlock.id);
  }

  triggerVideoInsert(): void {
    const newBlock: DocBlock = {
      id: this.uid(),
      type: 'video',
      url: '',
      caption: '',
      layout: 'inset'
    };
    this.blocks.update(list => [...list, newBlock]);
    this.focusedBlockId.set(newBlock.id);
    this.openEmbedInput(newBlock.id);
  }

  onPlusMediaSelected(anchorBlockId: string, mediaType: 'image' | 'video', event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const list = this.blocks();
    const anchorIdx = list.findIndex(b => b.id === anchorBlockId);
    const anchor = anchorIdx >= 0 ? list[anchorIdx] : undefined;

    let targetId = anchorBlockId;
    if (!anchor || anchor.type !== 'paragraph' || (anchor.text && anchor.text.trim().length > 0)) {
      const newBlock: DocBlock = {
        id: this.uid(),
        type: mediaType,
        url: '',
        caption: '',
        layout: 'inset'
      };
      if (anchorIdx >= 0) {
        this.insertBlockAfter(anchorIdx, newBlock);
      } else {
        this.blocks.update(b => [...b, newBlock]);
      }
      targetId = newBlock.id;
      this.focusedBlockId.set(targetId);
    }

    if (mediaType === 'image') {
      this.onImageFileSelected(targetId, event);
    } else {
      this.onVideoFileSelected(targetId, event);
    }
  }

  openPlusEmbedInput(anchorBlockId: string): void {
    const anchor = this.blocks().find(b => b.id === anchorBlockId);
    const replaceEmptyParagraph = !!(anchor && anchor.type === 'paragraph' && (!anchor.text || !anchor.text.trim()));
    this.openEmbedInput(anchorBlockId, !replaceEmptyParagraph);
  }

  openEmbedInput(blockId: string, insertAfter = false): void {
    this.embedTargetBlockId = blockId;
    this.embedInsertAfter = insertAfter;
    this.embedUrl.set('');
    this.closePlusMenuImmediately();
    this.showEmbedModal.set(true);
  }

  confirmEmbedVideo(): void {
    const url = this.embedUrl().trim();
    if (!url) return;

    let embedType: 'youtube' | 'vimeo' = 'youtube';
    if (url.includes('vimeo.com')) {
      embedType = 'vimeo';
    } else if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      this.toast.error('Only YouTube and Vimeo video URLs are supported');
      return;
    }

    if (this.embedTargetBlockId) {
      if (this.embedInsertAfter) {
        const list = this.blocks();
        const idx = list.findIndex(b => b.id === this.embedTargetBlockId);
        const newBlock: DocBlock = {
          id: this.uid(),
          type: 'video',
          url: url,
          embedType: embedType,
          layout: 'inset',
          caption: ''
        };
        if (idx >= 0) {
          this.insertBlockAfter(idx, newBlock);
        } else {
          this.blocks.update(b => [...b, newBlock]);
        }
        this.focusedBlockId.set(newBlock.id);
      } else {
        this.blocks.update(list =>
          list.map(b => {
            if (b.id !== this.embedTargetBlockId) return b;
            return {
              ...b,
              type: 'video',
              url: url,
              embedType: embedType,
              layout: 'inset',
              caption: ''
            };
          })
        );
      }
      this.triggerAutosave();
    }
    this.embedInsertAfter = false;
    this.showEmbedModal.set(false);
  }

  openEmbedModalFromDock(): void {
    const newBlock: DocBlock = {
      id: this.uid(),
      type: 'video',
      url: '',
      caption: '',
      layout: 'inset'
    };
    this.blocks.update(list => [...list, newBlock]);
    this.embedTargetBlockId = newBlock.id;
    this.embedUrl.set('');
    this.showEmbedModal.set(true);
  }

  // Shortcuts & Action Palette modal triggers
  openShortcutsModal(): void {
    this.isMenuOpen.set(false);
    this.shortcutsSearchQuery.set('');
    this.showShortcutsModal.set(true);
  }

  openActionPalette(): void {
    this.isMenuOpen.set(false);
    this.actionPaletteQuery.set('');
    this.actionPaletteIndex.set(0);
    this.showActionPalette.set(true);
  }

  onActionPaletteKeyDown(event: KeyboardEvent): void {
    const items = this.filteredActionPaletteItems();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.actionPaletteIndex.update(i => (i + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.actionPaletteIndex.update(i => (i - 1 + items.length) % items.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = items[this.actionPaletteIndex()];
      if (item) item.action();
    } else if (event.key === 'Escape') {
      this.showActionPalette.set(false);
    }
  }

  insertBlockAtCursor(type: DocBlockType): void {
    let newBlock: DocBlock = {
      id: this.uid(),
      type: type,
      text: '',
      items: type === 'bullet_list' || type === 'numbered_list' ? [''] : undefined,
      codeLanguage: type === 'code' ? 'typescript' : undefined,
      calloutType: type === 'callout' ? 'info' : undefined,
      tableData: type === 'table' ? {
        headerRow: true,
        rows: [['', '', ''], ['', '', ''], ['', '', '']],
        alignments: ['left', 'left', 'left']
      } : undefined
    };

    const currentBlocks = this.blocks();
    const focusedId = this.focusedBlockId();
    const targetIdx = focusedId ? currentBlocks.findIndex(b => b.id === focusedId) : -1;

    if (targetIdx >= 0) {
      const current = currentBlocks[targetIdx];
      if (current.type === 'paragraph' && (!current.text || !current.text.trim())) {
        this.blocks.update(list => {
          const copy = [...list];
          copy[targetIdx] = newBlock;
          return copy;
        });
      } else {
        this.blocks.update(list => {
          const copy = [...list];
          copy.splice(targetIdx + 1, 0, newBlock);
          return copy;
        });
      }
    } else {
      this.blocks.update(list => [...list, newBlock]);
    }

    this.focusedBlockId.set(newBlock.id);
    this.triggerAutosave();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (this.activeCategoryPrompt()) {
      const dockContainer = document.querySelector('.docs-editor__bottom-dock-container');
      if (dockContainer && !dockContainer.contains(target)) {
        this.closeCategoryPrompt(false);
      }
    }

    const blockEl = target.closest?.('.docs-editor-block');
    const sideToolbar = target.closest?.('.docs-editor-block__side-toolbar');
    const rightSidebar = target.closest?.('.docs-editor__right-sidebar');
    const modal = target.closest?.('.docs-modal__box');
    const isOutsideEditorSelection = !blockEl && !sideToolbar && !rightSidebar && !modal;

    if (isOutsideEditorSelection && (this.selectedBlockId() || this.selectedBlockIds().length > 0)) {
      const curSel = this.selectedElementBlockSnapshot();
      if (curSel) {
        this.lastElementBlockSnapshot.set(curSel);
      }
      this.selectedBlockId.set(null);
      this.selectedBlockIds.set([]);
      if (!this.hasTextSelection() && this.activeRightSidebar() === 'element') {
        this.triggerRightSidebarClose(false);
      }
    }

    if (isOutsideEditorSelection && this.activeRightSidebar() === 'selection') {
      this.dismissSelectionToolbar();
    }
  }

  // Comprehensive keyboard shortcut handler
  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    const isCtrl = event.ctrlKey || event.metaKey;

    // Safety: NEVER intercept core browser shortcuts
    if (isCtrl && ['t', 'w', 'r', 'l'].includes(event.key.toLowerCase())) {
      return;
    }
    if (isCtrl && event.shiftKey && event.key.toLowerCase() === 'i') {
      return;
    }

    // Escape closes any open modal / popup
    if (event.key === 'Escape') {
      if (this.activeCategoryPrompt()) { this.closeCategoryPrompt(true); return; }
      if (this.showShortcutsModal()) { this.showShortcutsModal.set(false); return; }
      if (this.showActionPalette()) { this.showActionPalette.set(false); return; }
      if (this.showEmbedModal()) { this.showEmbedModal.set(false); return; }
      if (this.showDeleteModal()) { this.showDeleteModal.set(false); return; }
      if (this.showLinkPrompt()) { this.showLinkPrompt.set(false); return; }
      if (this.showAltTextModal()) { this.showAltTextModal.set(false); return; }
      if (this.showPosterModal()) { this.showPosterModal.set(false); return; }
      if (this.showTablePickerModal()) { this.showTablePickerModal.set(false); return; }
      if (this.activePlusBlockId()) { this.closePlusMenuImmediately(); return; }
      if (this.isMenuOpen()) { this.isMenuOpen.set(false); return; }
      if (this.selectedBlockId() || this.selectedBlockIds().length > 0) {
        const selId = this.selectedBlockId() || this.selectedBlockIds()[0];
        const idx = this.blocks().findIndex(b => b.id === selId);
        const curSel = this.selectedElementBlockSnapshot();
        if (curSel) {
          this.lastElementBlockSnapshot.set(curSel);
        }
        this.selectedBlockId.set(null);
        this.selectedBlockIds.set([]);
        this.triggerRightSidebarClose(false);
        this.focusNearestTextBlock(idx >= 0 ? idx : 0);
        return;
      }
      if (this.activeRightSidebar() || this.activeSelectionToolbar()) {
        this.dismissSelectionToolbar();
        return;
      }
      return;
    }

    // Delete / Backspace when a non-text block is selected
    if ((event.key === 'Delete' || event.key === 'Backspace') && !this.isFocusedInInput()) {
      if (this.selectedBlockId() || this.selectedBlockIds().length > 0) {
        event.preventDefault();
        this.deleteSelectedBlocks();
        return;
      }
    }

    // Fast operations: Alt+ArrowUp / Alt+ArrowDown move active or selected block
    if (event.altKey && !isCtrl && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      const activeId = this.selectedBlockId() || this.selectedBlockIds()[0] || this.focusedBlockId();
      if (activeId) {
        event.preventDefault();
        if (event.key === 'ArrowUp') {
          this.moveBlockUp(activeId);
        } else {
          this.moveBlockDown(activeId);
        }
        return;
      }
    }

    // Fast operations: Duplicate block via Ctrl+Shift+D / Cmd+Shift+D
    if (isCtrl && event.shiftKey && event.key.toLowerCase() === 'd') {
      const activeId = this.selectedBlockId() || this.selectedBlockIds()[0] || this.focusedBlockId();
      if (activeId) {
        event.preventDefault();
        this.duplicateBlock(activeId);
        return;
      }
    }

    // Ctrl+S: Save Draft
    if (isCtrl && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.triggerImmediateSave();
      return;
    }

    // Ctrl+F: Find & Replace
    if (isCtrl && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      this.openFindModal();
      return;
    }

    // Ctrl+Shift+P: Toggle Edit / Preview
    if (isCtrl && event.shiftKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.setMode(this.mode() === 'edit' ? 'preview' : 'edit');
      return;
    }

    // Undo: Ctrl+Z / Cmd+Z
    if (isCtrl && !event.altKey && event.key.toLowerCase() === 'z') {
      if (event.shiftKey) {
        event.preventDefault();
        this.redo();
      } else {
        event.preventDefault();
        this.undo();
      }
      return;
    }

    // Redo: Ctrl+Y / Cmd+Y
    if (isCtrl && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
      return;
    }

    // Ctrl+Shift+K: Command Palette
    if (isCtrl && event.shiftKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openActionPalette();
      return;
    }

    // Ctrl+/ or ?: Keyboard Shortcuts
    if ((isCtrl && event.key === '/') || (event.key === '?' && !this.isFocusedInInput())) {
      event.preventDefault();
      this.openShortcutsModal();
      return;
    }

    // Format shortcuts: Ctrl+B, Ctrl+I, Ctrl+E, Ctrl+K
    if (isCtrl && !event.shiftKey && !event.altKey) {
      const k = event.key.toLowerCase();
      if (k === 'b') {
        event.preventDefault();
        this.applyFormat('bold');
        return;
      } else if (k === 'i') {
        event.preventDefault();
        this.applyFormat('italic');
        return;
      } else if (k === 'e') {
        event.preventDefault();
        this.applyFormat('code');
        return;
      } else if (k === 'k') {
        event.preventDefault();
        this.toggleLinkPrompt();
        return;
      }
    }

    // Block conversion shortcuts: Ctrl+Alt+1..3, Ctrl+Alt+0
    if (isCtrl && event.altKey) {
      if (event.key === '1') {
        event.preventDefault();
        this.convertActiveBlock('heading1');
        return;
      } else if (event.key === '2') {
        event.preventDefault();
        this.convertActiveBlock('heading2');
        return;
      } else if (event.key === '3') {
        event.preventDefault();
        this.convertActiveBlock('heading3');
        return;
      } else if (event.key === '0') {
        event.preventDefault();
        this.convertActiveBlock('paragraph');
        return;
      } else if (event.key.toLowerCase() === 'i') {
        event.preventDefault();
        this.triggerImageUpload();
        return;
      } else if (event.key.toLowerCase() === 'v') {
        event.preventDefault();
        this.triggerVideoInsert();
        return;
      }
    }

    // List & Quote block shortcuts: Ctrl+Shift+7, Ctrl+Shift+8, Ctrl+Shift+Q, Ctrl+Shift+C
    if (isCtrl && event.shiftKey) {
      if (event.key === '7' || event.key === '&') {
        event.preventDefault();
        this.convertActiveBlock('numbered_list');
        return;
      } else if (event.key === '8' || event.key === '*') {
        event.preventDefault();
        this.convertActiveBlock('bullet_list');
        return;
      } else if (event.key.toLowerCase() === 'q') {
        event.preventDefault();
        this.convertActiveBlock('quote');
        return;
      } else if (event.key.toLowerCase() === 'c') {
        event.preventDefault();
        this.convertActiveBlock('code');
        return;
      }
    }
  }

  private isFocusedInInput(): boolean {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  }

  triggerAutosave(): void {
    if (this.saveState() !== 'saving') {
      this.saveState.set('dirty');
    }

    const now = Date.now();
    if (this.firstUnsavedChangeTimestamp === null) {
      this.firstUnsavedChangeTimestamp = now;
      this.clearAutosaveMaxIntervalTimer();
      this.autosaveMaxIntervalTimer = setTimeout(() => {
        this.flushAutosave();
      }, AUTOSAVE_MAX_INTERVAL_MS);
    } else if (now - this.firstUnsavedChangeTimestamp >= AUTOSAVE_MAX_INTERVAL_MS) {
      this.flushAutosave();
      return;
    }

    this.clearAutosaveDebounceTimer();
    this.autosaveDebounceTimer = setTimeout(() => {
      this.flushAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  triggerImmediateSave(): void {
    this.flushAutosave();
  }

  private flushAutosave(): void {
    this.clearAutosaveDebounceTimer();
    this.clearAutosaveMaxIntervalTimer();
    this.firstUnsavedChangeTimestamp = null;
    this.performSave();
  }

  private clearAutosaveDebounceTimer(): void {
    if (this.autosaveDebounceTimer) {
      clearTimeout(this.autosaveDebounceTimer);
      this.autosaveDebounceTimer = null;
    }
  }

  private clearAutosaveMaxIntervalTimer(): void {
    if (this.autosaveMaxIntervalTimer) {
      clearTimeout(this.autosaveMaxIntervalTimer);
      this.autosaveMaxIntervalTimer = null;
    }
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private clearMinIndicatorTimer(): void {
    if (this.minIndicatorTimer) {
      clearTimeout(this.minIndicatorTimer);
      this.minIndicatorTimer = null;
    }
  }

  private performSave(): void {
    // If offline: save to local storage and show offline state
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.saveOffline();
      return;
    }

    // If a save is already in-flight, mark pending and do not fire overlapping request
    if (this.isSaveInFlight) {
      this.hasPendingSaveWhileInFlight = true;
      return;
    }

    // If draft docId has not yet been created, ensure draft created first
    if (!this.docId()) {
      if (this.isCreatingDraft) {
        this.hasPendingSaveWhileInFlight = true;
        return;
      }
      this.isSaveInFlight = true;
      this.saveState.set('saving');
      const saveStartTime = Date.now();

      this.ensureDraftCreated().subscribe({
        next: (id) => {
          this.executeSaveBlocks(id, saveStartTime);
        },
        error: (err) => {
          this.handleSaveError(err, saveStartTime);
        }
      });
      return;
    }

    this.isSaveInFlight = true;
    this.saveState.set('saving');
    const saveStartTime = Date.now();
    this.executeSaveBlocks(this.docId(), saveStartTime);
  }

  private executeSaveBlocks(docId: string, saveStartTime: number): void {
    this.docService.saveBlocks(docId, {
      title: this.title(),
      blocks: this.blocks(),
      version: this.version()
    }).subscribe({
      next: (updated) => {
        this.retryAttempt = 0;
        this.clearRetryTimer();
        this.clearOfflineBackup(docId);
        if (updated.version) {
          this.version.set(updated.version);
        } else {
          this.version.update(v => v + 1);
        }

        // Guarantee minimum display duration (300ms) for "Saving…" indicator
        const elapsed = Date.now() - saveStartTime;
        const delay = Math.max(0, AUTOSAVE_MIN_INDICATOR_MS - elapsed);

        this.clearMinIndicatorTimer();
        this.minIndicatorTimer = setTimeout(() => {
          this.isSaveInFlight = false;
          if (this.hasPendingSaveWhileInFlight) {
            this.hasPendingSaveWhileInFlight = false;
            this.performSave();
          } else {
            this.saveState.set('saved');
          }
        }, delay);
      },
      error: (err) => {
        this.handleSaveError(err, saveStartTime);
      }
    });
  }

  private handleSaveError(err: any, saveStartTime: number): void {
    const elapsed = Date.now() - saveStartTime;
    const delay = Math.max(0, AUTOSAVE_MIN_INDICATOR_MS - elapsed);

    this.clearMinIndicatorTimer();
    this.minIndicatorTimer = setTimeout(() => {
      this.isSaveInFlight = false;

      // 409 Conflict check: do not retry automatically!
      if (err?.status === 409) {
        this.hasPendingSaveWhileInFlight = false;
        this.saveState.set('error');
        this.toast.error('Conflict: This story was modified elsewhere. Please refresh.');
        return;
      }

      // Retry up to 3 times with exponential backoff [1s, 2s, 4s]
      if (this.retryAttempt < RETRY_BACKOFF_STEPS.length) {
        const backoffMs = RETRY_BACKOFF_STEPS[this.retryAttempt];
        this.retryAttempt++;
        this.clearRetryTimer();
        this.retryTimer = setTimeout(() => {
          this.performSave();
        }, backoffMs);
      } else {
        this.hasPendingSaveWhileInFlight = false;
        this.retryAttempt = 0;
        this.saveState.set('error');
      }
    }, delay);
  }

  private getOfflineKey(docId?: string): string {
    return `acklet_docs_offline_${docId || 'draft'}`;
  }

  private hasOfflineBackup(docId?: string): boolean {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return false;
    return !!localStorage.getItem(this.getOfflineKey(docId));
  }

  private saveOffline(): void {
    if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return;
    try {
      const payload = JSON.stringify({
        title: this.title(),
        blocks: this.blocks(),
        version: this.version(),
        savedAt: Date.now()
      });
      localStorage.setItem(this.getOfflineKey(this.docId()), payload);
      this.saveState.set('offline');
    } catch {
      // ignore
    }
  }

  private clearOfflineBackup(docId?: string): void {
    if (typeof localStorage === 'undefined' || typeof localStorage.removeItem !== 'function') return;
    try {
      localStorage.removeItem(this.getOfflineKey(docId));
    } catch {
      // ignore
    }
  }

  private syncOfflineChanges(): void {
    this.triggerImmediateSave();
  }

  goToPublish(): void {
    this.router.navigate(['/write', this.docId(), 'publish']);
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  duplicateStory(): void {
    this.isMenuOpen.set(false);
    this.docService.duplicateDocument(this.docId()).subscribe({
      next: (copy) => {
        this.toast.success('Story duplicated successfully');
        this.router.navigate(['/write', copy.id]);
      },
      error: () => {
        this.toast.error('Failed to duplicate story');
      }
    });
  }

  promptDelete(): void {
    this.isMenuOpen.set(false);
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    this.docService.deleteDocument(this.docId()).subscribe({
      next: () => {
        this.toast.success('Story deleted');
        this.router.navigate(['/stories']);
      },
      error: () => {
        this.toast.error('Failed to delete story');
      }
    });
  }

  onNavigateBack(event: MouseEvent): void {
    // Return to stories
  }

  // ── Text Selection & Right Inspector Sidebar ────────────
  openSelectionToolbar(pos: { x: number; y: number; placement: 'top' | 'bottom' }): void {
    if (this.selectionToolbarCloseTimer) {
      clearTimeout(this.selectionToolbarCloseTimer);
      this.selectionToolbarCloseTimer = null;
    }
    this.hasTextSelection.set(true);
    this.isSelectionToolbarClosing.set(false);
    this.selectionToolbarPos.set(pos);
    this.activeSelectionToolbar.set(pos);
    this.activeRightSidebar.set('selection');
  }

  private triggerRightSidebarClose(immediate = false): void {
    if (immediate) {
      if (this.selectionToolbarCloseTimer) {
        clearTimeout(this.selectionToolbarCloseTimer);
        this.selectionToolbarCloseTimer = null;
      }
      this.isSelectionToolbarClosing.set(false);
      this.activeSelectionToolbar.set(null);
      this.activeRightSidebar.set(null);
      this.lastElementBlockSnapshot.set(null);
      return;
    }

    if ((this.activeSelectionToolbar() || this.activeRightSidebar()) && !this.isSelectionToolbarClosing()) {
      this.isSelectionToolbarClosing.set(true);
      if (this.selectionToolbarCloseTimer) {
        clearTimeout(this.selectionToolbarCloseTimer);
      }
      this.selectionToolbarCloseTimer = setTimeout(() => {
        this.activeSelectionToolbar.set(null);
        this.activeRightSidebar.set(null);
        this.lastElementBlockSnapshot.set(null);
        this.isSelectionToolbarClosing.set(false);
        this.selectionToolbarCloseTimer = null;
      }, 500);
    }
  }

  dismissSelectionToolbar(immediate = false): void {
    this.hasTextSelection.set(false);
    this.selectionToolbarPos.set(null);
    this.selectedRange = null;
    this.showLinkPrompt.set(false);

    if (this.activeRightSidebar() === 'element' && (this.selectedBlockId() || this.selectedBlockIds().length > 0)) {
      this.activeSelectionToolbar.set(null);
      return;
    }

    if (this.activeSelectionToolbar() || this.activeRightSidebar()) {
      this.triggerRightSidebarClose(immediate);
    }
  }

  closeRightSidebar(immediate = false): void {
    this.hasTextSelection.set(false);
    this.selectionToolbarPos.set(null);
    this.selectedRange = null;
    this.showLinkPrompt.set(false);

    const curSel = this.selectedElementBlockSnapshot();
    if (curSel) {
      this.lastElementBlockSnapshot.set(curSel);
    }
    this.selectedBlockId.set(null);
    this.selectedBlockIds.set([]);
    this.triggerRightSidebarClose(immediate);
  }

  onRightSidebarMouseDown(event: MouseEvent): void {
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
      event.preventDefault();
    }
  }

  onSelectionToolbarAnimationEnd(event?: AnimationEvent): void {
    if (event?.target && event?.currentTarget && event.target !== event.currentTarget) {
      return;
    }
    if (this.isSelectionToolbarClosing()) {
      if (this.selectionToolbarCloseTimer) {
        clearTimeout(this.selectionToolbarCloseTimer);
        this.selectionToolbarCloseTimer = null;
      }
      this.activeSelectionToolbar.set(null);
      this.activeRightSidebar.set(null);
      this.lastElementBlockSnapshot.set(null);
      this.isSelectionToolbarClosing.set(false);
    }
  }

  onTextSelect(event: Event, blockId: string): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target) return;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (start !== end) {
      this.selectedRange = { start, end, blockId };
      this.hasTextSelection.set(true);

      const rect = target.getBoundingClientRect();
      const toolbarWidth = 380;
      const toolbarHeight = 40;
      const placement: 'top' | 'bottom' = rect.top < 64 ? 'bottom' : 'top';
      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
      const y = placement === 'top'
        ? Math.max(16, rect.top - toolbarHeight - 8)
        : Math.min(winHeight - toolbarHeight - 16, rect.bottom + 8);
      const x = Math.max(16, Math.min(winWidth - toolbarWidth - 16, rect.left + (rect.width / 2) - (toolbarWidth / 2)));
      this.openSelectionToolbar({ x, y, placement });
    } else {
      this.dismissSelectionToolbar();
    }
  }

  applyFormat(fmt: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'highlight'): void {
    if (!this.selectedRange) return;
    const { start, end, blockId } = this.selectedRange;
    const block = this.blocks().find(b => b.id === blockId);
    if (!block || !block.text) return;

    this.pushHistorySnapshot();
    block.formats = block.formats || [];
    block.formats.push({ start, end, type: fmt });

    this.onBlockContentChange();
    this.dismissSelectionToolbar();
  }

  convertSelectedBlock(type: DocBlockType): void {
    const blockId = this.selectedRange?.blockId || this.focusedBlockId();
    if (!blockId) return;
    this.convertBlock(blockId, type);
    this.dismissSelectionToolbar();
  }

  toggleLinkPrompt(): void {
    this.showLinkPrompt.set(!this.showLinkPrompt());
  }

  applyLink(): void {
    const url = this.linkUrl().trim();
    if (!url.startsWith('https://') && !url.startsWith('mailto:')) {
      this.toast.error('Links must use https:// or mailto: protocol');
      return;
    }
    if (!this.selectedRange) {
      this.showLinkPrompt.set(false);
      return;
    }

    const block = this.blocks().find(b => b.id === this.selectedRange!.blockId);
    if (!block || !block.text) {
      this.showLinkPrompt.set(false);
      return;
    }

    this.pushHistorySnapshot();
    const { start, end } = this.selectedRange;
    const selected = block.text.substring(start, end) || url;
    const linkMarkdown = `[${selected}](${url})`;

    block.text = block.text.substring(0, start) + linkMarkdown + block.text.substring(end);
    this.linkUrl.set('');
    this.showLinkPrompt.set(false);
    this.dismissSelectionToolbar();
    this.triggerAutosave();
  }

  confirmLink(): void {
    this.applyLink();
  }

  // ── Table Block Operations ──────────────────────────────
  onTableCellFocus(blockId: string, rIdx: number, cIdx: number): void {
    this.setFocusedBlock(blockId);
    this.activeTableCell.set({ blockId, rowIdx: rIdx, colIdx: cIdx });
  }

  insertTableRowAbove(blockId: string): void {
    this.pushHistorySnapshot();
    const active = this.activeTableCell();
    const targetRow = (active && active.blockId === blockId) ? active.rowIdx : 0;
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData || { rows: [['', '']], headerRow: true };
      const colCount = tableData.rows[0]?.length || 2;
      const newRow = new Array(colCount).fill('');
      const rows = [...tableData.rows];
      rows.splice(targetRow, 0, newRow);
      return {
        ...b,
        tableData: {
          ...tableData,
          rows
        }
      };
    }));
    this.onBlockContentChange();
  }

  insertTableRowBelow(blockId: string): void {
    this.pushHistorySnapshot();
    const active = this.activeTableCell();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData || { rows: [['', '']], headerRow: true };
      const colCount = tableData.rows[0]?.length || 2;
      const targetRow = (active && active.blockId === blockId) ? active.rowIdx + 1 : tableData.rows.length;
      const newRow = new Array(colCount).fill('');
      const rows = [...tableData.rows];
      rows.splice(targetRow, 0, newRow);
      return {
        ...b,
        tableData: {
          ...tableData,
          rows
        }
      };
    }));
    this.onBlockContentChange();
  }

  addTableRow(blockId: string): void {
    this.insertTableRowBelow(blockId);
  }

  insertTableColumnLeft(blockId: string): void {
    this.pushHistorySnapshot();
    const active = this.activeTableCell();
    const targetCol = (active && active.blockId === blockId) ? active.colIdx : 0;
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData || { rows: [['', '']], headerRow: true };
      const rows = tableData.rows.map(row => {
        const copy = [...row];
        copy.splice(targetCol, 0, '');
        return copy;
      });
      const alignments = tableData.alignments ? [...tableData.alignments] : new Array(tableData.rows[0]?.length || 2).fill('left');
      alignments.splice(targetCol, 0, 'left');
      return {
        ...b,
        tableData: {
          ...tableData,
          rows,
          alignments
        }
      };
    }));
    this.onBlockContentChange();
  }

  insertTableColumnRight(blockId: string): void {
    this.pushHistorySnapshot();
    const active = this.activeTableCell();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData || { rows: [['', '']], headerRow: true };
      const targetCol = (active && active.blockId === blockId) ? active.colIdx + 1 : (tableData.rows[0]?.length || 1);
      const rows = tableData.rows.map(row => {
        const copy = [...row];
        copy.splice(targetCol, 0, '');
        return copy;
      });
      const alignments = tableData.alignments ? [...tableData.alignments] : new Array(tableData.rows[0]?.length || 2).fill('left');
      alignments.splice(targetCol, 0, 'left');
      return {
        ...b,
        tableData: {
          ...tableData,
          rows,
          alignments
        }
      };
    }));
    this.onBlockContentChange();
  }

  addTableColumn(blockId: string): void {
    this.insertTableColumnRight(blockId);
  }

  deleteActiveTableRow(blockId: string): void {
    this.pushHistorySnapshot();
    const active = this.activeTableCell();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData;
      if (!tableData || tableData.rows.length <= 1) return b;
      const targetRow = (active && active.blockId === blockId && active.rowIdx < tableData.rows.length) ? active.rowIdx : tableData.rows.length - 1;
      const rows = tableData.rows.filter((_, idx) => idx !== targetRow);
      return {
        ...b,
        tableData: {
          ...tableData,
          rows
        }
      };
    }));
    this.onBlockContentChange();
  }

  deleteTableRow(blockId: string): void {
    this.deleteActiveTableRow(blockId);
  }

  deleteActiveTableColumn(blockId: string): void {
    this.pushHistorySnapshot();
    const active = this.activeTableCell();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData;
      if (!tableData || (tableData.rows[0]?.length || 0) <= 1) return b;
      const targetCol = (active && active.blockId === blockId && active.colIdx < (tableData.rows[0]?.length || 0)) ? active.colIdx : (tableData.rows[0].length - 1);
      const rows = tableData.rows.map(row => row.filter((_, idx) => idx !== targetCol));
      const alignments = tableData.alignments ? tableData.alignments.filter((_, idx) => idx !== targetCol) : undefined;
      return {
        ...b,
        tableData: {
          ...tableData,
          rows,
          alignments
        }
      };
    }));
    this.onBlockContentChange();
  }

  deleteTableColumn(blockId: string): void {
    this.deleteActiveTableColumn(blockId);
  }

  toggleTableHeader(blockId: string): void {
    this.pushHistorySnapshot();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      const tableData = b.tableData || { rows: [['', '']], headerRow: false };
      return {
        ...b,
        tableData: {
          ...tableData,
          headerRow: !tableData.headerRow
        }
      };
    }));
    this.onBlockContentChange();
  }

  cycleTableCellAlignment(blockId: string): void {
    this.pushHistorySnapshot();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId || !b.tableData) return b;
      const td = b.tableData;
      const colCount = td.rows[0]?.length || 2;
      const alignments = td.alignments ? [...td.alignments] : new Array(colCount).fill('left');
      const activeCol = this.activeTableCell()?.blockId === blockId ? (this.activeTableCell()?.colIdx ?? 0) : 0;
      const currentAlign = alignments[activeCol] || 'left';
      const nextAlign = currentAlign === 'left' ? 'center' : (currentAlign === 'center' ? 'right' : 'left');
      alignments[activeCol] = nextAlign;
      return {
        ...b,
        tableData: {
          ...td,
          alignments
        }
      };
    }));
    this.onBlockContentChange();
  }

  onTableCellKeyDown(event: KeyboardEvent, blockId: string, rIdx: number, cIdx: number): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const block = this.blocks().find(b => b.id === blockId);
      if (!block || !block.tableData) return;
      const rows = block.tableData.rows;
      const isShift = event.shiftKey;

      let nextR = rIdx;
      let nextC = isShift ? cIdx - 1 : cIdx + 1;

      if (!isShift && nextC >= rows[rIdx].length) {
        nextC = 0;
        nextR++;
      } else if (isShift && nextC < 0) {
        nextR--;
        if (nextR >= 0) {
          nextC = rows[nextR].length - 1;
        }
      }

      if (nextR >= 0 && nextR < rows.length) {
        setTimeout(() => {
          const cells = document.querySelectorAll(`[data-block-id="${blockId}"] .docs-editor__table-cell-input`);
          const targetIndex = nextR * rows[0].length + nextC;
          (cells[targetIndex] as HTMLElement)?.focus();
        }, 10);
      } else if (!isShift && nextR >= rows.length) {
        this.addTableRow(blockId);
        setTimeout(() => {
          const cells = document.querySelectorAll(`[data-block-id="${blockId}"] .docs-editor__table-cell-input`);
          const targetIndex = nextR * rows[0].length + 0;
          (cells[targetIndex] as HTMLElement)?.focus();
        }, 30);
      }
    }
  }

  // ── Checklist Block Operations ──────────────────────────
  onChecklistKeyDown(blockId: string, cIdx: number, event: KeyboardEvent): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (!block || !block.checklistItems) return;

    if (event.key === 'ArrowUp' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLInputElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'up')) {
        event.preventDefault();
        if (cIdx > 0) {
          this.focusIndexedInputInBlock(blockId, '.docs-editor__checklist-input', cIdx - 1, 'end');
        } else {
          this.moveFocusFromBlock(blockId, -1);
        }
        return;
      }
    }

    if (event.key === 'ArrowDown' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const target = event.target as HTMLInputElement | null;
      if (this.isCaretAtVerticalBoundary(target, 'down')) {
        event.preventDefault();
        if (cIdx < block.checklistItems.length - 1) {
          this.focusIndexedInputInBlock(blockId, '.docs-editor__checklist-input', cIdx + 1, 'start');
        } else {
          this.moveFocusFromBlock(blockId, 1);
        }
        return;
      }
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.pushHistorySnapshot();
      const newItem: ChecklistItem = { id: this.uid(), text: '', checked: false };
      block.checklistItems.splice(cIdx + 1, 0, newItem);
      this.onBlockContentChange();
      setTimeout(() => {
        const inputs = document.querySelectorAll(`[data-block-id="${blockId}"] .docs-editor__checklist-input`);
        (inputs[cIdx + 1] as HTMLElement)?.focus();
      }, 10);
    } else if (event.key === 'Backspace' && (!block.checklistItems[cIdx].text || block.checklistItems[cIdx].text.length === 0)) {
      if (block.checklistItems.length > 1) {
        event.preventDefault();
        this.pushHistorySnapshot();
        block.checklistItems.splice(cIdx, 1);
        this.onBlockContentChange();
        const prevIdx = Math.max(0, cIdx - 1);
        setTimeout(() => {
          const inputs = document.querySelectorAll(`[data-block-id="${blockId}"] .docs-editor__checklist-input`);
          (inputs[prevIdx] as HTMLElement)?.focus();
        }, 10);
      }
    }
  }

  // ── Toggle Block Operations ─────────────────────────────
  toggleCollapse(blockId: string): void {
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, toggleOpen: !b.toggleOpen };
    }));
  }

  // ── Generic File Attachment ─────────────────────────────
  formatFileSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onGenericFileSelected(blockId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.pushHistorySnapshot();
    this.blocks.update(blocks => blocks.map(b => {
      if (b.id !== blockId) return b;
      return {
        ...b,
        fileName: file.name,
        fileSize: file.size,
        url: URL.createObjectURL(file)
      };
    }));
    this.onBlockContentChange();
  }

  // ── Outline Navigation ──────────────────────────────────
  scrollToBlock(blockId: string): void {
    this.activeOutlineId.set(blockId);
    if (typeof document !== 'undefined') {
      const elem = document.querySelector(`[data-block-id="${blockId}"]`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // ── Find and Replace ────────────────────────────────────
  openFindModal(): void {
    this.showFindModal.set(true);
  }

  closeFindModal(): void {
    this.showFindModal.set(false);
  }

  findNext(): void {
    const q = this.findQuery().trim().toLowerCase();
    if (!q) return;
    const match = this.blocks().find(b => b.text && b.text.toLowerCase().includes(q));
    if (match) {
      this.scrollToBlock(match.id);
      this.setFocusedBlock(match.id);
    }
  }

  replaceAll(): void {
    const findStr = this.findQuery();
    const replaceStr = this.replaceQuery();
    if (!findStr) return;
    this.pushHistorySnapshot();
    let replacedCount = 0;
    this.blocks.update(blocks => blocks.map(b => {
      if (b.text && b.text.includes(findStr)) {
        replacedCount++;
        return { ...b, text: b.text.split(findStr).join(replaceStr) };
      }
      return b;
    }));
    if (replacedCount > 0) {
      this.onBlockContentChange();
      this.toast.success(`Replaced ${replacedCount} occurrence(s)`);
    } else {
      this.toast.info('No occurrences found');
    }
  }

  // ── Block Selection & Multi-Block Keyboard Handling ──────
  isNonTextBlock(type: DocBlockType): boolean {
    return type === 'divider' || type === 'image' || type === 'video' || type === 'table' || type === 'file' || type === 'embed';
  }

  isBlockSelected(blockId: string): boolean {
    return this.selectedBlockId() === blockId || this.selectedBlockIds().includes(blockId);
  }

  selectBlock(blockId: string, event?: MouseEvent): void {
    if (event?.shiftKey) {
      const current = this.selectedBlockIds();
      if (!current.includes(blockId)) {
        this.selectedBlockIds.set([...current, blockId]);
      }
    } else {
      this.selectedBlockId.set(blockId);
      this.selectedBlockIds.set([blockId]);
      this.focusedBlockId.set(null);
    }

    const blk = this.blocks().find(b => b.id === blockId);
    if (blk && this.isNonTextBlock(blk.type)) {
      if (this.selectionToolbarCloseTimer) {
        clearTimeout(this.selectionToolbarCloseTimer);
        this.selectionToolbarCloseTimer = null;
      }
      this.hasTextSelection.set(false);
      this.selectionToolbarPos.set(null);
      this.activeSelectionToolbar.set(null);
      this.lastElementBlockSnapshot.set(blk);
      this.isSelectionToolbarClosing.set(false);
      this.activeRightSidebar.set('element');
    }
  }

  onBlockClick(event: MouseEvent, block: DocBlock): void {
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isInteractive = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'button' || targetTag === 'a' || targetTag === 'label';
    if (this.isNonTextBlock(block.type) && !isInteractive) {
      this.selectBlock(block.id, event);
    }
  }

  onBlockFocus(blockId: string): void {
    const block = this.blocks().find(b => b.id === blockId);
    if (block && this.isNonTextBlock(block.type) && !this.isBlockSelected(blockId)) {
      this.selectBlock(blockId);
    }
  }

  onBlockContainerKeyDown(event: KeyboardEvent, block: DocBlock, index: number): void {
    const targetTag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    const isInputOrTextarea = targetTag === 'input' || targetTag === 'textarea';

    // Alt+ArrowUp / Down to move blocks
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      if (event.key === 'ArrowUp') {
        this.moveBlockUp(block.id);
      } else {
        this.moveBlockDown(block.id);
      }
      return;
    }

    if (isInputOrTextarea && !this.isBlockSelected(block.id)) {
      return;
    }

    // Whole-block clipboard: Ctrl/Cmd + C
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && !isInputOrTextarea) {
      event.preventDefault();
      this.copySelectedBlocks();
      return;
    }

    // Whole-block clipboard: Ctrl/Cmd + X
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'x' && !isInputOrTextarea) {
      event.preventDefault();
      this.cutSelectedBlocks();
      return;
    }

    // Whole-block clipboard: Ctrl/Cmd + V
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && !isInputOrTextarea) {
      event.preventDefault();
      this.pasteClipboardBlocks();
      return;
    }

    // Navigation: ArrowDown
    if (event.key === 'ArrowDown' && !isInputOrTextarea) {
      event.preventDefault();
      if (event.shiftKey) {
        const currentIds = this.selectedBlockIds();
        if (index < this.blocks().length - 1) {
          const nextId = this.blocks()[index + 1].id;
          if (!currentIds.includes(nextId)) {
            this.selectedBlockIds.set([...currentIds, nextId]);
          }
        }
        return;
      }

      if (index < this.blocks().length - 1) {
        this.moveFocusToAdjacentBlock(index, 1);
      }
      return;
    }

    // Navigation: ArrowUp
    if (event.key === 'ArrowUp' && !isInputOrTextarea) {
      event.preventDefault();
      if (event.shiftKey) {
        const currentIds = this.selectedBlockIds();
        if (index > 0) {
          const prevId = this.blocks()[index - 1].id;
          if (!currentIds.includes(prevId)) {
            this.selectedBlockIds.set([prevId, ...currentIds]);
          }
        }
        return;
      }

      this.moveFocusToAdjacentBlock(index, -1);
      return;
    }

    // Escape: deselect and return caret to nearest text block
    if (event.key === 'Escape') {
      event.preventDefault();
      const curSel = this.selectedElementBlockSnapshot();
      if (curSel) {
        this.lastElementBlockSnapshot.set(curSel);
      }
      this.selectedBlockId.set(null);
      this.selectedBlockIds.set([]);
      this.triggerRightSidebarClose(false);
      this.focusNearestTextBlock(index);
      return;
    }

    // Enter triggers primary operation
    if (event.key === 'Enter' && !isInputOrTextarea) {
      event.preventDefault();
      this.triggerBlockPrimaryOperation(block);
      return;
    }

    // Backspace / Delete removes selected block(s) with undo support
    if ((event.key === 'Backspace' || event.key === 'Delete') && !isInputOrTextarea) {
      event.preventDefault();
      this.deleteSelectedBlocks();
      return;
    }
  }

  triggerBlockPrimaryOperation(block: DocBlock): void {
    if (block.type === 'image') {
      if (!block.url) {
        const fileInput = document.querySelector(`[data-block-id="${block.id}"] input[type="file"]`) as HTMLInputElement | null;
        fileInput?.click();
      } else {
        this.openAltTextModal(block.id);
      }
    } else if (block.type === 'video') {
      if (!block.url) {
        this.openEmbedInput(block.id);
      } else {
        this.openPosterModal(block.id);
      }
    } else if (block.type === 'table') {
      const firstCell = document.querySelector(`[data-block-id="${block.id}"] .docs-editor__table-cell-input`) as HTMLElement | null;
      firstCell?.focus();
    } else if (block.type === 'divider') {
      const idx = this.blocks().findIndex(b => b.id === block.id);
      const newP = this.createEmptyParagraph();
      this.insertBlockAfter(idx, newP);
      this.selectedBlockId.set(null);
      this.selectedBlockIds.set([]);
      this.focusedBlockId.set(newP.id);
    } else if (block.type === 'file') {
      const fileInput = document.querySelector(`[data-block-id="${block.id}"] input[type="file"]`) as HTMLInputElement | null;
      fileInput?.click();
    }
  }

  focusNearestTextBlock(index: number): void {
    const list = this.blocks();
    if (list.length === 0) return;
    // Search backward (previous block first)
    for (let i = index - 1; i >= 0; i--) {
      if (i < list.length && !this.isNonTextBlock(list[i].type)) {
        this.focusedBlockId.set(list[i].id);
        this.focusFirstInputInBlock(list[i].id);
        return;
      }
    }
    // Search forward (next block second)
    for (let i = index; i < list.length; i++) {
      if (!this.isNonTextBlock(list[i].type)) {
        this.focusedBlockId.set(list[i].id);
        this.focusFirstInputInBlock(list[i].id);
        return;
      }
    }
    const newP = this.createEmptyParagraph();
    this.blocks.update(b => [...b, newP]);
    this.focusedBlockId.set(newP.id);
    this.focusFirstInputInBlock(newP.id);
  }

  focusFirstInputInBlock(blockId: string): void {
    setTimeout(() => {
      const el = document.querySelector(
        `[data-block-id="${blockId}"] input:not([type="checkbox"]):not([type="file"]):not([type="hidden"]), [data-block-id="${blockId}"] textarea`
      ) as HTMLElement | null;
      el?.focus();
    }, 10);
  }

  focusLastInputInBlock(blockId: string): void {
    setTimeout(() => {
      const elements = document.querySelectorAll(
        `[data-block-id="${blockId}"] input:not([type="checkbox"]):not([type="file"]):not([type="hidden"]), [data-block-id="${blockId}"] textarea`
      );
      const el = elements[elements.length - 1] as HTMLElement | null;
      el?.focus();
    }, 10);
  }

  focusBlockElement(blockId: string): void {
    setTimeout(() => {
      const el = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement | null;
      el?.focus();
    }, 10);
  }

  deleteSelectedBlocks(): void {
    const idsToDelete = this.selectedBlockIds().length > 0
      ? this.selectedBlockIds()
      : (this.selectedBlockId() ? [this.selectedBlockId()!] : []);

    if (idsToDelete.length === 0) return;
    this.pushHistorySnapshot();
    const firstIdx = this.blocks().findIndex(b => idsToDelete.includes(b.id));
    const curSel = this.selectedElementBlockSnapshot();
    if (curSel) {
      this.lastElementBlockSnapshot.set(curSel);
    }

    if (this.blocks().length <= idsToDelete.length) {
      const p = this.createEmptyParagraph();
      this.blocks.set([p]);
      this.selectedBlockId.set(null);
      this.selectedBlockIds.set([]);
      this.focusedBlockId.set(p.id);
      this.triggerRightSidebarClose(false);
      this.focusFirstInputInBlock(p.id);
      this.triggerAutosave();
      return;
    }

    this.blocks.update(list => list.filter(b => !idsToDelete.includes(b.id)));
    this.selectedBlockId.set(null);
    this.selectedBlockIds.set([]);
    this.triggerRightSidebarClose(false);
    this.focusNearestTextBlock(firstIdx);
    this.triggerAutosave();
    this.toast.showWithAction('Block deleted', { label: 'Undo', run: () => this.undo() }, 6000, 'info');
  }

  deleteBlockWithUndo(blockId: string): void {
    this.pushHistorySnapshot();
    const idx = this.blocks().findIndex(b => b.id === blockId);
    const targetBlock = idx >= 0 ? this.blocks()[idx] : null;
    if (targetBlock && this.isNonTextBlock(targetBlock.type) && (this.selectedBlockId() === blockId || this.activeRightSidebar() === 'element')) {
      this.lastElementBlockSnapshot.set(targetBlock);
    }
    if (this.blocks().length <= 1) {
      const p = this.createEmptyParagraph();
      this.blocks.set([p]);
      this.focusedBlockId.set(p.id);
      this.focusFirstInputInBlock(p.id);
    } else {
      this.blocks.update(list => list.filter(b => b.id !== blockId));
      this.focusNearestTextBlock(idx >= 0 ? idx : 0);
    }
    this.selectedBlockId.set(null);
    this.selectedBlockIds.set([]);
    if (this.activeRightSidebar() === 'element') {
      this.triggerRightSidebarClose(false);
    }
    this.triggerAutosave();
    this.toast.showWithAction('Block deleted', { label: 'Undo', run: () => this.undo() }, 6000, 'info');
  }

  moveBlockUp(blockId: string): void {
    const list = this.blocks();
    const idx = list.findIndex(b => b.id === blockId);
    if (idx <= 0) return;
    this.pushHistorySnapshot();
    const copy = [...list];
    const temp = copy[idx];
    copy[idx] = copy[idx - 1];
    copy[idx - 1] = temp;
    this.blocks.set(copy);
    this.triggerAutosave();
    this.focusBlockElement(blockId);
  }

  moveBlockDown(blockId: string): void {
    const list = this.blocks();
    const idx = list.findIndex(b => b.id === blockId);
    if (idx < 0 || idx >= list.length - 1) return;
    this.pushHistorySnapshot();
    const copy = [...list];
    const temp = copy[idx];
    copy[idx] = copy[idx + 1];
    copy[idx + 1] = temp;
    this.blocks.set(copy);
    this.triggerAutosave();
    this.focusBlockElement(blockId);
  }

  duplicateBlock(blockId: string): void {
    const list = this.blocks();
    const idx = list.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    this.pushHistorySnapshot();
    const original = list[idx];
    const clone: DocBlock = JSON.parse(JSON.stringify(original));
    clone.id = this.uid();
    const copy = [...list];
    copy.splice(idx + 1, 0, clone);
    this.blocks.set(copy);
    this.triggerAutosave();
    this.selectBlock(clone.id);
    this.focusBlockElement(clone.id);
    this.toast.info('Block duplicated');
  }

  copySelectedBlocks(): void {
    const ids = this.selectedBlockIds().length > 0 ? this.selectedBlockIds() : (this.selectedBlockId() ? [this.selectedBlockId()!] : []);
    if (ids.length === 0) return;
    const selected = this.blocks().filter(b => ids.includes(b.id));
    this.clipboardBlocks = selected.map(b => JSON.parse(JSON.stringify(b)));
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      const textRepr = selected.map(b => b.text || b.caption || b.type).join('\n');
      navigator.clipboard.writeText(textRepr).catch(() => {});
    }
    this.toast.info(ids.length > 1 ? `${ids.length} blocks copied` : 'Block copied');
  }

  cutSelectedBlocks(): void {
    this.copySelectedBlocks();
    this.deleteSelectedBlocks();
  }

  pasteClipboardBlocks(): void {
    if (this.clipboardBlocks.length === 0) return;
    this.pushHistorySnapshot();
    const targetId = this.selectedBlockId() || this.focusedBlockId();
    const list = this.blocks();
    const targetIdx = targetId ? list.findIndex(b => b.id === targetId) : list.length - 1;

    const newBlocks = this.clipboardBlocks.map(b => {
      const clone: DocBlock = JSON.parse(JSON.stringify(b));
      clone.id = this.uid();
      return clone;
    });

    const copy = [...list];
    copy.splice(targetIdx + 1, 0, ...newBlocks);
    this.blocks.set(copy);
    this.triggerAutosave();
    if (newBlocks.length === 1) {
      this.selectBlock(newBlocks[0].id);
      this.focusBlockElement(newBlocks[0].id);
    }
    this.toast.info(`${newBlocks.length} block(s) pasted`);
  }

  // ── Image Block Specific Operations ──────────────────────
  onReplaceImageFile(blockId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Image file must be under 10 MB');
      return;
    }
    if (!this.docId()) {
      this.toast.info('Saving your draft first…');
      this.pendingUploadQueue.push({ file, type: 'image', blockId });
      this.ensureDraftCreated().subscribe();
      return;
    }
    this.docService.uploadImage(this.docId(), file).subscribe({
      next: (res) => {
        this.pushHistorySnapshot();
        this.blocks.update(list => list.map(b => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            url: res.url
          };
        }));
        this.triggerAutosave();
        this.toast.success('Image replaced');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to replace image');
      }
    });
  }

  openAltTextModal(blockId: string): void {
    const block = this.blocks().find(b => b.id === blockId);
    this.altTextTargetBlockId = blockId;
    this.altTextInput.set(block?.alt || '');
    this.showAltTextModal.set(true);
  }

  saveAltText(): void {
    if (this.altTextTargetBlockId) {
      const targetId = this.altTextTargetBlockId;
      const newAlt = this.altTextInput().trim();
      this.pushHistorySnapshot();
      this.blocks.update(list => list.map(b => {
        if (b.id !== targetId) return b;
        return { ...b, alt: newAlt };
      }));
      this.triggerAutosave();
      this.toast.success('Alt text updated');
    }
    this.showAltTextModal.set(false);
    this.altTextTargetBlockId = null;
  }

  rotateImage(blockId: string): void {
    this.pushHistorySnapshot();
    this.blocks.update(list => list.map(b => {
      if (b.id !== blockId) return b;
      const current = b.rotation || 0;
      const next = ((current + 90) % 360);
      return { ...b, rotation: next };
    }));
    this.triggerAutosave();
  }

  cycleBlockAlign(blockId: string): void {
    this.pushHistorySnapshot();
    this.blocks.update(list => list.map(b => {
      if (b.id !== blockId) return b;
      const current = b.align || 'center';
      const next = current === 'center' ? 'left' : (current === 'left' ? 'right' : 'center');
      return { ...b, align: next };
    }));
    this.triggerAutosave();
  }

  cycleBlockLayout(blockId: string): void {
    this.pushHistorySnapshot();
    this.blocks.update(list => list.map(b => {
      if (b.id !== blockId) return b;
      const current = b.layout || 'inset';
      const next: MediaLayout = current === 'inset' ? 'wide' : (current === 'wide' ? 'full' : 'inset');
      return { ...b, layout: next };
    }));
    this.triggerAutosave();
  }

  downloadMedia(block: DocBlock): void {
    if (!block.url) return;
    const a = document.createElement('a');
    a.href = block.url;
    a.download = block.fileName || `${block.type}-${block.id.slice(0, 6)}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  openMediaOriginal(block: DocBlock): void {
    if (block.url) {
      window.open(block.url, '_blank', 'noopener,noreferrer');
    }
  }

  // ── Video Block Specific Operations ──────────────────────
  onReplaceVideoFile(blockId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 100 * 1024 * 1024) {
      this.toast.error('Video file must be under 100 MB');
      return;
    }
    if (!this.docId()) {
      this.toast.info('Saving your draft first…');
      this.pendingUploadQueue.push({ file, type: 'video', blockId });
      this.ensureDraftCreated().subscribe();
      return;
    }
    this.docService.uploadVideo(this.docId(), file).subscribe({
      next: (res) => {
        this.pushHistorySnapshot();
        this.blocks.update(list => list.map(b => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            url: res.url,
            embedType: 'upload'
          };
        }));
        this.triggerAutosave();
        this.toast.success('Video replaced');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to replace video');
      }
    });
  }

  openPosterModal(blockId: string): void {
    const block = this.blocks().find(b => b.id === blockId);
    this.posterTargetBlockId = blockId;
    this.posterUrlInput.set(block?.posterUrl || '');
    this.showPosterModal.set(true);
  }

  savePosterUrl(): void {
    if (this.posterTargetBlockId) {
      const targetId = this.posterTargetBlockId;
      const url = this.posterUrlInput().trim();
      this.pushHistorySnapshot();
      this.blocks.update(list => list.map(b => {
        if (b.id !== targetId) return b;
        return { ...b, posterUrl: url };
      }));
      this.triggerAutosave();
      this.toast.success('Poster image updated');
    }
    this.showPosterModal.set(false);
    this.posterTargetBlockId = null;
  }

  // ── Table Size Picker Modal Operations ───────────────────
  openTablePicker(targetBlockId?: string): void {
    this.closePlusMenuImmediately();
    this.tablePickerTargetBlockId = targetBlockId || null;
    this.tablePickerRows.set(3);
    this.tablePickerCols.set(3);
    this.showTablePickerModal.set(true);
  }

  confirmTableInsert(): void {
    const rows = Math.max(1, Math.min(50, this.tablePickerRows() || 3));
    const cols = Math.max(1, Math.min(12, this.tablePickerCols() || 3));
    this.showTablePickerModal.set(false);

    const newTableBlock: DocBlock = {
      id: this.uid(),
      type: 'table',
      tableData: {
        headerRow: true,
        rows: Array.from({ length: rows }, () => new Array(cols).fill('')),
        alignments: new Array(cols).fill('left')
      }
    };

    const targetId = this.tablePickerTargetBlockId || this.focusedBlockId();
    const currentBlocks = this.blocks();
    const targetIdx = targetId ? currentBlocks.findIndex(b => b.id === targetId) : -1;

    this.pushHistorySnapshot();
    if (targetIdx >= 0) {
      const current = currentBlocks[targetIdx];
      if (current.type === 'paragraph' && (!current.text || !current.text.trim())) {
        this.blocks.update(list => {
          const copy = [...list];
          copy[targetIdx] = newTableBlock;
          return copy;
        });
      } else {
        this.blocks.update(list => {
          const copy = [...list];
          copy.splice(targetIdx + 1, 0, newTableBlock);
          return copy;
        });
      }
    } else {
      this.blocks.update(list => [...list, newTableBlock]);
    }

    this.ensureTrailingParagraph();
    this.focusedBlockId.set(newTableBlock.id);
    this.triggerAutosave();

    setTimeout(() => {
      const firstCell = document.querySelector(`[data-block-id="${newTableBlock.id}"] .docs-editor__table-cell-input`) as HTMLElement | null;
      firstCell?.focus();
    }, 20);
  }

  triggerTableInsertPrompt = (): void => {
    this.openTablePicker(this.focusedBlockId() || undefined);
  };

  // ── Clipboard Image Paste ─────────────────────────────────
  @HostListener('paste', ['$event'])
  onCanvasPaste(event: ClipboardEvent): void {
    if (!event.clipboardData || !event.clipboardData.files || event.clipboardData.files.length === 0) {
      return;
    }
    const files = Array.from(event.clipboardData.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    event.preventDefault();
    for (const file of imageFiles) {
      if (file.size > 10 * 1024 * 1024) {
        this.toast.error('Pasted image must be under 10 MB');
        continue;
      }

      const newImgBlock: DocBlock = {
        id: this.uid(),
        type: 'image',
        url: '',
        layout: 'inset'
      };

      const focusedId = this.focusedBlockId();
      const currentBlocks = this.blocks();
      const targetIdx = focusedId ? currentBlocks.findIndex(b => b.id === focusedId) : -1;

      this.pushHistorySnapshot();
      if (targetIdx >= 0) {
        const current = currentBlocks[targetIdx];
        if (current.type === 'paragraph' && (!current.text || !current.text.trim())) {
          this.blocks.update(list => {
            const copy = [...list];
            copy[targetIdx] = newImgBlock;
            return copy;
          });
        } else {
          this.blocks.update(list => {
            const copy = [...list];
            copy.splice(targetIdx + 1, 0, newImgBlock);
            return copy;
          });
        }
      } else {
        this.blocks.update(list => [...list, newImgBlock]);
      }

      this.ensureTrailingParagraph();

      if (!this.docId()) {
        this.toast.info('Saving your draft first…');
        this.pendingUploadQueue.push({ file, type: 'image', blockId: newImgBlock.id });
        this.ensureDraftCreated().subscribe();
      } else {
        this.executeImageUpload(newImgBlock.id, file, this.docId());
      }
    }
  }

  private uid(): string {
    return 'b_' + Math.random().toString(36).substr(2, 9);
  }
}
