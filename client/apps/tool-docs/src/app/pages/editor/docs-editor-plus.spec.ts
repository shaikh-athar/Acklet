// client/apps/tool-docs/src/app/pages/editor/docs-editor-plus.spec.ts

import '@angular/compiler';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DocsEditorComponent } from './docs-editor.component';
import { DocService } from '../../services/doc.service';
import { DocsToastService } from '../../services/docs-toast.service';
import { DocsTooltipComponent } from '../../components/docs-tooltip/docs-tooltip.component';
import { DocBlock } from '../../models/doc.model';

describe('DocsEditorComponent — Round Controls, Click-to-Open Menu, Close Button & Categories', () => {
  let component: DocsEditorComponent;
  let injector: Injector;

  beforeEach(() => {
    vi.useFakeTimers();

    const mockHttp = {
      get: vi.fn().mockReturnValue(of({ success: true, data: { id: 'doc-123', title: 'Test Story', version: 1, blocks: [] } })),
      post: vi.fn().mockReturnValue(of({ success: true, data: { id: 'doc-123', title: 'Test Story', version: 1, blocks: [] } })),
      put: vi.fn().mockReturnValue(of({ success: true, data: { id: 'doc-123', title: 'Test Story', version: 2, blocks: [] } })),
      delete: vi.fn().mockReturnValue(of({ success: true }))
    };

    const mockRoute = {
      snapshot: {
        paramMap: { get: vi.fn().mockReturnValue(null) },
        queryParamMap: { get: vi.fn().mockReturnValue(null) }
      },
      params: of({})
    };

    const mockRouter = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };

    const mockToast = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      showWithAction: vi.fn()
    };

    injector = Injector.create({
      providers: [
        { provide: HttpClient, useValue: mockHttp },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: DocsToastService, useValue: mockToast },
        DocService
      ]
    });

    runInInjectionContext(injector, () => {
      component = new DocsEditorComponent();
    });

    // Provide default initial paragraph block
    const initialBlock: DocBlock = {
      id: 'block-1',
      type: 'paragraph',
      text: ''
    };
    component.blocks.set([initialBlock]);
    component.focusedBlockId.set('block-1');
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Problem 4 / Fix 4: Click-to-Open Menu (Zero Hover-to-Open)', () => {
    it('hovering "+" does NOT open the menu (even after 150ms or 5000ms)', () => {
      component.onPlusMouseEnter('block-1');
      expect(component.activePlusBlockId()).toBeNull();

      vi.advanceTimersByTime(150);
      expect(component.activePlusBlockId()).toBeNull();

      vi.advanceTimersByTime(5000);
      expect(component.activePlusBlockId()).toBeNull();

      component.onPlusMouseLeave();
      expect(component.activePlusBlockId()).toBeNull();
    });

    it('clicking "+" opens menu immediately', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;
      component.togglePlusMenu('block-1', mockEvent);

      expect(component.activePlusBlockId()).toBe('block-1');
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('clicking "+" when open closes menu', () => {
      component.openPlusMenu('block-1');
      expect(component.activePlusBlockId()).toBe('block-1');

      const mockEvent = { stopPropagation: vi.fn() } as unknown as MouseEvent;
      component.togglePlusMenu('block-1', mockEvent);

      expect(component.isPlusClosing()).toBe(true);
      vi.advanceTimersByTime(500);
      expect(component.activePlusBlockId()).toBeNull();
    });

    it('Enter key on "+" button opens menu immediately', () => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const event = {
        key: 'Enter',
        preventDefault,
        stopPropagation
      } as unknown as KeyboardEvent;

      component.onPlusKeyDown(event, 'block-1');

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(component.activePlusBlockId()).toBe('block-1');
    });

    it('Space key on "+" button opens menu immediately', () => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const event = {
        key: ' ',
        preventDefault,
        stopPropagation
      } as unknown as KeyboardEvent;

      component.onPlusKeyDown(event, 'block-1');

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(component.activePlusBlockId()).toBe('block-1');
    });
  });

  describe('Problem 4 / Fix 4: All 4 Menu Closing Paths', () => {
    beforeEach(() => {
      component.openPlusMenu('block-1');
      expect(component.activePlusBlockId()).toBe('block-1');
    });

    it('Path 1: close button triggers close animation and closes menu returning focus', () => {
      component.closePlusMenuAndFocusBtn('block-1');
      expect(component.isPlusClosing()).toBe(true);
      vi.advanceTimersByTime(240);
      expect(component.activePlusBlockId()).toBeNull();
    });

    it('Path 2: Escape key closes menu and returns focus', () => {
      const mockToolbar = {
        querySelectorAll: vi.fn().mockReturnValue([])
      };
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const event = {
        key: 'Escape',
        currentTarget: mockToolbar,
        preventDefault,
        stopPropagation
      } as unknown as KeyboardEvent;

      component.onQuickToolbarKeyDown(event, 'block-1');

      expect(preventDefault).toHaveBeenCalled();
      expect(component.isPlusClosing()).toBe(true);
      vi.advanceTimersByTime(240);
      expect(component.activePlusBlockId()).toBeNull();
    });

    it('Path 3: outside click closes menu', () => {
      const mockEvent = {} as MouseEvent;
      component.onCanvasBackgroundClick(mockEvent);

      expect(component.activePlusBlockId()).toBeNull();
    });

    it('Path 4: item selection converts block and closes menu', () => {
      component.convertBlockAndClose('block-1', 'heading1');

      expect(component.activePlusBlockId()).toBeNull();
      const updatedBlock = component.blocks().find(b => b.id === 'block-1');
      expect(updatedBlock?.type).toBe('heading1');
    });
  });

  describe('Problem 3 / Fix 3: "+" Visibility and Placement Below Elements', () => {
    it('is visible in edit mode and remains available ("we do not have to hide it at any situation")', () => {
      component.focusedBlockId.set('block-1');
      expect(component.isPlusVisible('block-1')).toBe(true);

      // Does not hide when caret leaves
      component.focusedBlockId.set('block-other');
      expect(component.isPlusVisible('block-1')).toBe(true);

      // Does not hide when paragraph has text
      const block = component.blocks().find(b => b.id === 'block-1')!;
      block.text = 'Hello story';
      expect(component.isPlusVisible('block-1')).toBe(true);
    });

    it('shouldShowPlusRow is true ONLY on the last block and never between components', () => {
      // Single block in document: shows trailing plus row
      expect(component.shouldShowPlusRow('block-1', 0)).toBe(true);

      // Multiple blocks: only the last block shows trailing plus row
      component.blocks.set([
        { id: 'h2-1', type: 'heading2', text: 'Section Title' },
        { id: 'p-mid', type: 'paragraph', text: 'Middle paragraph text' },
        { id: 'p-trailing', type: 'paragraph', text: '' }
      ]);
      expect(component.shouldShowPlusRow('h2-1', 0)).toBe(false);
      expect(component.shouldShowPlusRow('p-mid', 1)).toBe(false);
      expect(component.shouldShowPlusRow('p-trailing', 2)).toBe(true);

      // Middle block never gets a plus row even if activePlusBlockId references it
      component.activePlusBlockId.set('p-mid');
      expect(component.shouldShowPlusRow('p-mid', 1)).toBe(false);
    });

    it('openPlusEmbedInput + confirmEmbedVideo inserts a new block after filled last block instead of overwriting it', () => {
      component.blocks.set([{ id: 'p1', type: 'paragraph', text: 'nothing' }]);
      component.openPlusEmbedInput('p1');
      component.embedUrl.set('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      component.confirmEmbedVideo();

      const blocks = component.blocks();
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].text).toBe('nothing');
      expect(blocks[1].type).toBe('video');
    });

    it('hides when modal is open', () => {
      component.showShortcutsModal.set(true);
      expect(component.isPlusVisible('block-1')).toBe(false);
    });

    it('convertBlockAndClose inserts a new block after when block has content or is non-paragraph', () => {
      component.blocks.set([{ id: 'h2-1', type: 'heading2', text: 'Existing Heading' }]);
      component.focusedBlockId.set('h2-1');

      component.convertBlockAndClose('h2-1', 'quote');

      const blocks = component.blocks();
      expect(blocks.length).toBe(2);
      expect(blocks[0].type).toBe('heading2');
      expect(blocks[1].type).toBe('quote');
      expect(component.focusedBlockId()).toBe(blocks[1].id);
    });
  });

  describe('ArrowUp / ArrowDown Text-First Component Navigation', () => {
    it('prioritizes internal text lines before moving to adjacent text or non-text components', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'Alpha\nBeta' },
        { id: 'h1', type: 'heading1', text: 'Heading' },
        { id: 'div1', type: 'divider' }
      ]);
      component.focusedBlockId.set('p1');

      // Caret on line 2 of p1: ArrowUp prioritizes moving up inside text (does not preventDefault)
      const upInsideText = {
        key: 'ArrowUp',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'TEXTAREA', value: 'Alpha\nBeta', selectionStart: 8, selectionEnd: 8 }
      } as unknown as KeyboardEvent;
      component.onBlockKeyDown('p1', 0, upInsideText);
      expect(upInsideText.preventDefault).not.toHaveBeenCalled();
      expect(component.focusedBlockId()).toBe('p1');

      // Caret on line 1 of p1: ArrowDown prioritizes moving down inside text
      const downInsideText = {
        key: 'ArrowDown',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'TEXTAREA', value: 'Alpha\nBeta', selectionStart: 2, selectionEnd: 2 }
      } as unknown as KeyboardEvent;
      component.onBlockKeyDown('p1', 0, downInsideText);
      expect(downInsideText.preventDefault).not.toHaveBeenCalled();
      expect(component.focusedBlockId()).toBe('p1');

      // Caret at very end of p1: ArrowDown moves to h1 text block
      const downAtEnd = {
        key: 'ArrowDown',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'TEXTAREA', value: 'Alpha\nBeta', selectionStart: 10, selectionEnd: 10 }
      } as unknown as KeyboardEvent;
      component.onBlockKeyDown('p1', 0, downAtEnd);
      expect(downAtEnd.preventDefault).toHaveBeenCalled();
      expect(component.focusedBlockId()).toBe('h1');

      // Single-line input on h1: ArrowDown moves onto divider component, ArrowUp moves back to p1
      const downFromH1 = {
        key: 'ArrowDown',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'INPUT', value: 'Heading', selectionStart: 3, selectionEnd: 3 }
      } as unknown as KeyboardEvent;
      component.onBlockKeyDown('h1', 1, downFromH1);
      expect(downFromH1.preventDefault).toHaveBeenCalled();
      expect(component.selectedBlockId()).toBe('div1');

      // ArrowUp at start of p1 (index 0) moves up to title (clears focusedBlockId)
      component.focusedBlockId.set('p1');
      const upFromTop = {
        key: 'ArrowUp',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'TEXTAREA', value: 'Alpha\nBeta', selectionStart: 0, selectionEnd: 0 }
      } as unknown as KeyboardEvent;
      component.onBlockKeyDown('p1', 0, upFromTop);
      expect(upFromTop.preventDefault).toHaveBeenCalled();
      expect(component.focusedBlockId()).toBeNull();

      // ArrowDown from end of title enters blocks[0]
      const downFromTitle = {
        key: 'ArrowDown',
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        preventDefault: vi.fn(),
        target: { tagName: 'TEXTAREA', value: 'Story', selectionStart: 5, selectionEnd: 5 }
      } as unknown as KeyboardEvent;
      component.onTitleKeyDown(downFromTitle);
      expect(downFromTitle.preventDefault).toHaveBeenCalled();
      expect(component.focusedBlockId()).toBe('p1');
    });
  });

  describe('Content-Only Zoom Controls', () => {
    it('supports zoomIn, zoomOut, and actual-size reset bounded cleanly between 50% and 200%', () => {
      expect(component.zoomPercent()).toBe(100);
      expect(component.contentZoom()).toBe(1);

      component.zoomIn();
      expect(component.zoomPercent()).toBe(110);

      for (let i = 0; i < 15; i++) component.zoomIn();
      expect(component.zoomPercent()).toBe(200);

      component.resetZoom();
      expect(component.zoomPercent()).toBe(100);
      expect(component.contentZoom()).toBe(1);

      for (let i = 0; i < 10; i++) component.zoomOut();
      expect(component.zoomPercent()).toBe(50);
    });
  });

  describe('Problem 5 / Fix 5: Contextual Bottom Dock Categories & Active Style', () => {
    it('reflects active block type in bottom dock', () => {
      const block = component.blocks().find(b => b.id === 'block-1')!;
      block.type = 'heading1';
      block.text = 'A Title';
      component.focusedBlockId.set('block-1');

      expect(component.activeContext()).toBe('block');
      expect(component.isCurrentBlockType('heading1')).toBe(true);
      expect(component.isCurrentBlockType('heading2')).toBe(false);
    });

    it('switches to format context on text selection', () => {
      component.hasTextSelection.set(true);
      expect(component.activeContext()).toBe('format');
      expect(component.selectedCategory()).toBe('format');
    });

    it('allows user to click and switch category tabs on demand', () => {
      component.selectCategory('code');
      expect(component.selectedCategory()).toBe('code');

      component.selectCategory('layout');
      expect(component.selectedCategory()).toBe('layout');

      component.selectCategory('format');
      expect(component.selectedCategory()).toBe('format');
    });
  });

  describe('Fix 1: Tooltips Render Label Text Only (Zero Shortcut Keycaps)', () => {
    it('DocsTooltipComponent has only text input and no shortcut input or element', () => {
      runInInjectionContext(injector, () => {
        const tooltip = new DocsTooltipComponent();
        expect((tooltip as any).shortcut).toBeUndefined();
        expect(tooltip.text).toBeDefined();
      });
    });
  });

  describe('Fix 2: Category Click Opens Dedicated Compact Category Prompt', () => {
    it('clicking category opens its prompt, and only that category is active', () => {
      component.toggleCategoryPrompt('format');
      expect(component.activeCategoryPrompt()).toBe('format');

      component.toggleCategoryPrompt('block');
      expect(component.activeCategoryPrompt()).toBe('block');

      component.toggleCategoryPrompt('insert');
      expect(component.activeCategoryPrompt()).toBe('insert');

      component.toggleCategoryPrompt('layout');
      expect(component.activeCategoryPrompt()).toBe('layout');

      component.toggleCategoryPrompt('code');
      expect(component.activeCategoryPrompt()).toBe('code');
    });

    it('clicking another category switches to that prompt immediately', () => {
      component.openCategoryPrompt('format');
      expect(component.activeCategoryPrompt()).toBe('format');

      component.toggleCategoryPrompt('block');
      expect(component.activeCategoryPrompt()).toBe('block');
    });

    it('clicking the active category closes the prompt immediately without delay', () => {
      component.openCategoryPrompt('format');
      expect(component.activeCategoryPrompt()).toBe('format');

      component.toggleCategoryPrompt('format');
      expect(component.activeCategoryPrompt()).toBeNull();
    });

    it('Escape key on category prompt closes prompt and returns focus immediately', () => {
      component.openCategoryPrompt('block');
      expect(component.activeCategoryPrompt()).toBe('block');

      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const mockContainer = {
        querySelectorAll: vi.fn().mockReturnValue([])
      };
      const event = {
        key: 'Escape',
        currentTarget: mockContainer,
        preventDefault,
        stopPropagation
      } as unknown as KeyboardEvent;

      component.onCategoryPromptKeyDown(event);

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(component.activeCategoryPrompt()).toBeNull();
    });

    it('selecting an item invokes the action, closes prompt immediately without delay', () => {
      component.openCategoryPrompt('block');
      expect(component.activeCategoryPrompt()).toBe('block');

      const actionSpy = vi.fn();
      component.selectPromptItem(actionSpy);

      expect(actionSpy).toHaveBeenCalledTimes(1);
      expect(component.activeCategoryPrompt()).toBeNull();
    });

    it('mutually exclusive: opening category prompt closes plus menu', () => {
      component.openPlusMenu('block-1');
      expect(component.activePlusBlockId()).toBe('block-1');

      component.openCategoryPrompt('format');
      expect(component.activePlusBlockId()).toBeNull();
      expect(component.activeCategoryPrompt()).toBe('format');
    });

    it('mutually exclusive: opening plus menu closes category prompt immediately', () => {
      component.openCategoryPrompt('format');
      expect(component.activeCategoryPrompt()).toBe('format');

      component.openPlusMenu('block-1');
      expect(component.activeCategoryPrompt()).toBeNull();
      expect(component.activePlusBlockId()).toBe('block-1');
    });

    it('detects active media block correctly for layout prompt', () => {
      const block = component.blocks().find(b => b.id === 'block-1')!;
      block.type = 'paragraph';
      expect(component.hasActiveMediaBlock()).toBe(false);

      block.type = 'image';
      expect(component.hasActiveMediaBlock()).toBe(true);

      block.type = 'video';
      expect(component.hasActiveMediaBlock()).toBe(true);
    });
  });

  describe('Phase 1 Rebuild: Save Status, Keyboard Deletion & Undo Engine, Focus Mode Purge', () => {
    it('sets saveState to "dirty" (NOT "saving") immediately when editing before debounce completes', () => {
      component.saveState.set('saved');
      component.triggerAutosave();
      expect(component.saveState()).toBe('dirty');
    });

    it('Focus Mode is completely removed from component state', () => {
      expect((component as any).isFocusMode).toBeUndefined();
      expect((component as any).toggleFocusMode).toBeUndefined();
    });

    it('Backspace on an empty block deletes the block and transfers focus to previous block', () => {
      component.blocks.set([
        { id: 'b-1', type: 'paragraph', text: 'First block' },
        { id: 'b-2', type: 'paragraph', text: '' }
      ]);
      component.focusedBlockId.set('b-2');

      const mockEvent = {
        key: 'Backspace',
        target: { selectionStart: 0, selectionEnd: 0 },
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('b-2', 1, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.blocks().length).toBe(1);
      expect(component.blocks()[0].id).toBe('b-1');
      expect(component.focusedBlockId()).toBe('b-1');
    });

    it('Backspace at start of non-empty block merges text into previous block', () => {
      component.blocks.set([
        { id: 'b-1', type: 'paragraph', text: 'Hello ' },
        { id: 'b-2', type: 'paragraph', text: 'World' }
      ]);
      component.focusedBlockId.set('b-2');

      const mockEvent = {
        key: 'Backspace',
        target: { selectionStart: 0, selectionEnd: 0 },
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('b-2', 1, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.blocks().length).toBe(1);
      expect(component.blocks()[0].text).toBe('Hello World');
      expect(component.focusedBlockId()).toBe('b-1');
    });

    it('Undo and Redo restore previous states accurately', () => {
      component.blocks.set([{ id: 'b-1', type: 'paragraph', text: 'Original' }]);
      component.pushHistorySnapshot();

      component.blocks.set([{ id: 'b-1', type: 'paragraph', text: 'Modified' }]);
      expect(component.blocks()[0].text).toBe('Modified');

      component.undo();
      expect(component.blocks()[0].text).toBe('Original');

      component.redo();
      expect(component.blocks()[0].text).toBe('Modified');
    });
  });

  describe('Part 2 & 3: Floating Selection Toolbar, Tables, Checklists, Toggles & Outline', () => {
    it('applies bold, italic, code formatting to selected text range', () => {
      component.blocks.set([{ id: 'b-1', type: 'paragraph', text: 'Hello wonderful world' }]);
      // Simulate selecting "wonderful" (index 6 to 15)
      const mockEvent = {
        target: { selectionStart: 6, selectionEnd: 15, getBoundingClientRect: () => ({ top: 100, bottom: 120, left: 200, width: 400 }) }
      } as unknown as Event;

      component.onTextSelect(mockEvent, 'b-1');
      expect(component.hasTextSelection()).toBe(true);
      expect(component.showSelectionToolbar()).toBe(true);

      component.applyFormat('bold');
      // Part 7: clean text without raw markers, formatted via block.formats
      expect(component.blocks()[0].text).toBe('Hello wonderful world');
      expect(component.blocks()[0].formats?.some(f => f.type === 'bold' && f.start === 6 && f.end === 15)).toBe(true);
      expect(component.hasTextSelection()).toBe(false);
      expect(component.showSelectionToolbar()).toBe(false);
    });

    it('table operations: add row/column and toggle header', () => {
      component.blocks.set([{
        id: 't-1',
        type: 'table',
        tableData: { rows: [['A', 'B'], ['C', 'D']], headerRow: false }
      }]);

      component.addTableRow('t-1');
      expect(component.blocks()[0].tableData?.rows.length).toBe(3);
      expect(component.blocks()[0].tableData?.rows[2]).toEqual(['', '']);

      component.addTableColumn('t-1');
      expect(component.blocks()[0].tableData?.rows[0].length).toBe(3);

      component.toggleTableHeader('t-1');
      expect(component.blocks()[0].tableData?.headerRow).toBe(true);

      component.deleteTableRow('t-1');
      expect(component.blocks()[0].tableData?.rows.length).toBe(2);

      component.deleteTableColumn('t-1');
      expect(component.blocks()[0].tableData?.rows[0].length).toBe(2);
    });

    it('checklist operations: enter adds item, backspace on empty removes item', () => {
      component.blocks.set([{
        id: 'c-1',
        type: 'checklist',
        checklistItems: [{ id: 'item-1', text: 'First task', checked: false }]
      }]);

      const enterEvent = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      component.onChecklistKeyDown('c-1', 0, enterEvent);
      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(component.blocks()[0].checklistItems?.length).toBe(2);

      const backspaceEvent = { key: 'Backspace', preventDefault: vi.fn() } as unknown as KeyboardEvent;
      component.onChecklistKeyDown('c-1', 1, backspaceEvent);
      expect(backspaceEvent.preventDefault).toHaveBeenCalled();
      expect(component.blocks()[0].checklistItems?.length).toBe(1);
    });

    it('toggle block toggles collapsed state', () => {
      component.blocks.set([{
        id: 'tog-1',
        type: 'toggle',
        toggleTitle: 'Section',
        toggleOpen: false,
        text: 'Hidden body'
      }]);

      component.toggleCollapse('tog-1');
      expect(component.blocks()[0].toggleOpen).toBe(true);

      component.toggleCollapse('tog-1');
      expect(component.blocks()[0].toggleOpen).toBe(false);
    });

    it('outline headings computed signal collects H1, H2, H3 hierarchy with correct depth', () => {
      component.blocks.set([
        { id: 'h-1', type: 'heading1', text: 'Overview' },
        { id: 'p-1', type: 'paragraph', text: 'Some text' },
        { id: 'h-2', type: 'heading2', text: 'Architecture' },
        { id: 'h-3', type: 'heading3', text: 'Database Details' }
      ]);

      const outline = component.outlineHeadings();
      expect(outline.length).toBe(3);
      expect(outline[0]).toEqual({ id: 'h-1', type: 'heading1', text: 'Overview', depth: 1 });
      expect(outline[1]).toEqual({ id: 'h-2', type: 'heading2', text: 'Architecture', depth: 2 });
      expect(outline[2]).toEqual({ id: 'h-3', type: 'heading3', text: 'Database Details', depth: 3 });
    });

    it('find and replace accurately updates matching block content', () => {
      component.blocks.set([
        { id: 'b-1', type: 'paragraph', text: 'The quick brown fox jumps over the lazy dog' }
      ]);

      component.findQuery.set('fox');
      component.replaceQuery.set('cat');
      component.replaceAll();

      expect(component.blocks()[0].text).toBe('The quick brown cat jumps over the lazy dog');
    });
  });

  describe('Phase 1 Additional Verification: Live Markdown, Emoji/Slash Purge & Upload Queue', () => {
    it('converts *nothing* live without literal asterisks', () => {
      component.blocks.set([{ id: 'b-md1', type: 'paragraph', text: 'This has *nothing*' }]);
      component.onParagraphChange('b-md1', 'This has *nothing*');

      const block = component.blocks()[0];
      expect(block.text).toBe('This has nothing');
      expect(block.formats).toBeDefined();
      expect(block.formats?.some(f => f.type === 'italic' && f.start === 9 && f.end === 16)).toBe(true);
    });

    it('converts **bold** live without literal asterisks', () => {
      component.blocks.set([{ id: 'b-md2', type: 'paragraph', text: 'Make **bold** text' }]);
      component.onParagraphChange('b-md2', 'Make **bold** text');

      const block = component.blocks()[0];
      expect(block.text).toBe('Make bold text');
      expect(block.formats?.some(f => f.type === 'bold' && f.start === 5 && f.end === 9)).toBe(true);
    });

    it('converts `code` live without backticks', () => {
      component.blocks.set([{ id: 'b-md3', type: 'paragraph', text: 'Inline `const x = 1` here' }]);
      component.onParagraphChange('b-md3', 'Inline `const x = 1` here');

      const block = component.blocks()[0];
      expect(block.text).toBe('Inline const x = 1 here');
      expect(block.formats?.some(f => f.type === 'code' && f.start === 7 && f.end === 18)).toBe(true);
    });

    it('converts # Heading live to heading1 without raw #', () => {
      component.blocks.set([{ id: 'b-md4', type: 'paragraph', text: '# Modern Architecture' }]);
      component.onParagraphChange('b-md4', '# Modern Architecture');

      const block = component.blocks()[0];
      expect(block.type).toBe('heading1');
      expect(block.text).toBe('Modern Architecture');
    });

    it('typing : or / never opens any popup or emoji modal', () => {
      component.blocks.set([{ id: 'b-clean', type: 'paragraph', text: '' }]);
      component.onParagraphChange('b-clean', ':smile');
      expect((component as any).showEmojiPicker).toBeUndefined();

      component.onParagraphChange('b-clean', '/heading');
      expect((component as any).showSlashMenu?.()).toBeFalsy();
    });

    it('queues upload until draft ID exists and triggers ensureDraftCreated', () => {
      component.docId.set('');
      const fakeFile = new File(['mock content'], 'test.png', { type: 'image/png' });
      const fakeEvent = {
        target: { files: [fakeFile], value: '' }
      } as unknown as Event;

      const uploadSpy = vi.spyOn((component as any).docService, 'uploadImage');
      component.onImageFileSelected('b-1', fakeEvent);

      expect(component.toast.info).toHaveBeenCalledWith('Saving your draft first…');
      expect(uploadSpy).toHaveBeenCalledWith('doc-123', fakeFile);
    });
  });

  describe('Part 2: Batched Autosave Engine', () => {
    it('debounces saving: typing marks dirty and waits 1500ms before firing save', () => {
      component.docId.set('doc-123');
      const saveSpy = vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(of({ id: 'doc-123', version: 2 }));

      component.onTitleChange();
      expect(component.saveState()).toBe('dirty');
      expect(saveSpy).not.toHaveBeenCalled();

      // Advancing 800ms does NOT fire save yet (1500ms debounce)
      vi.advanceTimersByTime(800);
      expect(saveSpy).not.toHaveBeenCalled();

      // User continues typing at 1000ms: resets debounce timer
      component.onTitleChange();
      vi.advanceTimersByTime(1000);
      expect(saveSpy).not.toHaveBeenCalled();

      // 1500ms after last keystroke: save fires!
      vi.advanceTimersByTime(500);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('forces save after 5000ms max interval during continuous typing', () => {
      component.docId.set('doc-123');
      const saveSpy = vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(of({ id: 'doc-123', version: 2 }));

      // Simulate rapid continuous typing every 400ms for 5200ms
      for (let i = 0; i < 13; i++) {
        component.onTitleChange();
        vi.advanceTimersByTime(400);
      }

      // Max interval of 5000ms reached: save must have fired despite continuous typing!
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('holds "Saving…" indicator for at least 300ms to prevent UI flicker', () => {
      component.docId.set('doc-123');
      vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(of({ id: 'doc-123', version: 2 }));

      component.triggerImmediateSave();
      expect(component.saveState()).toBe('saving');

      // Even if network responded immediately (0ms), indicator stays "saving" at 150ms
      vi.advanceTimersByTime(150);
      expect(component.saveState()).toBe('saving');

      // After 300ms total, transitions cleanly to "saved"
      vi.advanceTimersByTime(150);
      expect(component.saveState()).toBe('saved');
    });

    it('guarantees single in-flight request and queues subsequent save', () => {
      component.docId.set('doc-123');
      let completeResponse: any;
      const delayed$ = new (of({ id: 'doc-123', version: 2 }).constructor as any)((observer: any) => {
        completeResponse = () => {
          observer.next({ id: 'doc-123', version: 2 });
          observer.complete();
        };
      });

      const saveSpy = vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(delayed$);

      component.triggerImmediateSave();
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(component.saveState()).toBe('saving');

      // User types while save is in flight: should NOT fire overlapping request
      component.onTitleChange();
      vi.advanceTimersByTime(2000);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      // Now complete first request
      completeResponse();
      vi.advanceTimersByTime(300);

      // Second queued save fires immediately after first completes!
      expect(saveSpy).toHaveBeenCalledTimes(2);
    });

    it('retries on failure up to 3 times with exponential backoff (1s, 2s, 4s)', () => {
      component.docId.set('doc-123');
      const saveSpy = vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(throwError(() => new Error('500 Server Error')));

      component.triggerImmediateSave();
      expect(saveSpy).toHaveBeenCalledTimes(1);

      // Finish min indicator delay
      vi.advanceTimersByTime(300);

      // 1st retry after 1000ms
      vi.advanceTimersByTime(1000);
      expect(saveSpy).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(300);

      // 2nd retry after 2000ms
      vi.advanceTimersByTime(2000);
      expect(saveSpy).toHaveBeenCalledTimes(3);
      vi.advanceTimersByTime(300);

      // 3rd retry after 4000ms
      vi.advanceTimersByTime(4000);
      expect(saveSpy).toHaveBeenCalledTimes(4);
      vi.advanceTimersByTime(300);

      // Exhausted retries -> transition to error state
      expect(component.saveState()).toBe('error');
    });

    it('handles 409 Conflict without auto-retrying and alerts user', () => {
      component.docId.set('doc-123');
      const saveSpy = vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(throwError(() => ({ status: 409 })));

      component.triggerImmediateSave();
      expect(saveSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);
      expect(component.saveState()).toBe('error');
      expect(component.toast.error).toHaveBeenCalledWith('Conflict: This story was modified elsewhere. Please refresh.');

      // Does NOT auto-retry on 409
      vi.advanceTimersByTime(10000);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('flushes save on window blur and beforeunload', () => {
      component.docId.set('doc-123');
      const saveSpy = vi.spyOn((component as any).docService, 'saveBlocks').mockReturnValue(of({ id: 'doc-123', version: 2 }));

      component.onTitleChange();
      expect(component.saveState()).toBe('dirty');

      component.handleWindowBlur();
      expect(saveSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(300);
      expect(component.saveState()).toBe('saved');

      // Another edit
      component.onTitleChange();
      expect(component.saveState()).toBe('dirty');

      component.handleBeforeUnload();
      expect(saveSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Part 3: Story Placeholder Rules', () => {
    it('shows "Tell your story..." ONLY on the first block of an empty story', () => {
      const block1: DocBlock = { id: 'b1', type: 'paragraph', text: '' };
      component.blocks.set([block1]);

      expect(component.getParagraphPlaceholder(block1, 0)).toBe('Tell your story...');
    });

    it('hides placeholder when block has text', () => {
      const block1: DocBlock = { id: 'b1', type: 'paragraph', text: 'Hello world' };
      component.blocks.set([block1]);

      expect(component.getParagraphPlaceholder(block1, 0)).toBe('');
    });

    it('hides placeholder on subsequent paragraphs created after Enter', () => {
      const block1: DocBlock = { id: 'b1', type: 'paragraph', text: '' };
      const block2: DocBlock = { id: 'b2', type: 'paragraph', text: '' };
      component.blocks.set([block1, block2]);

      // Both blocks return empty string (blank line)
      expect(component.getParagraphPlaceholder(block1, 0)).toBe('');
      expect(component.getParagraphPlaceholder(block2, 1)).toBe('');
    });
  });

  describe('Part 4: Single Trailing Plus & Explicit Section Insertion', () => {
    it('does not auto-append trailing paragraphs when the last block is a heading or has text, keeping "+" on the trailing block', () => {
      component.blocks.set([
        { id: 'h2', type: 'heading2', text: 'My Heading' }
      ]);

      component.ensureTrailingParagraph();

      const list = component.blocks();
      expect(list.length).toBe(1);
      expect(list[0].type).toBe('heading2');
      expect(component.shouldShowPlusRow(list[0].id, 0)).toBe(true);

      // Adding another block happens explicitly via "+" menu action
      component.convertBlockAndClose('h2', 'paragraph');
      const updated = component.blocks();
      expect(updated.length).toBe(2);
      expect(updated[1].type).toBe('paragraph');
      expect(component.shouldShowPlusRow(updated[1].id, 1)).toBe(true);
      expect(component.shouldShowPlusRow(updated[0].id, 0)).toBe(false);
    });

    it('initializes one empty paragraph when document blocks are empty', () => {
      component.blocks.set([]);
      component.ensureTrailingParagraph();
      expect(component.blocks().length).toBe(1);
      expect(component.blocks()[0].type).toBe('paragraph');
    });
  });

  describe('Part 5: Enter Keeps Same Block & Flat Model', () => {
    it('pressing Enter inside a paragraph keeps a single block for native newline without section wrappers', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'First line' }
      ]);
      component.focusedBlockId.set('p1');

      const mockEvent = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { selectionStart: 10, selectionEnd: 10 }
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('p1', 0, mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      const list = component.blocks();
      expect(list.length).toBe(1);
      expect(list[0].type).toBe('paragraph');
      expect((list as any).sections).toBeUndefined();
    });
  });

  describe('Right Sidebar Selection-Scoped Visibility', () => {
    it('shows sidebar only while text or element is selected and hides immediately when selection clears', () => {
      vi.useFakeTimers();
      try {
        component.blocks.set([{ id: 'p1', type: 'paragraph', text: 'hello world' }]);

        const mockTarget = {
          selectionStart: 0,
          selectionEnd: 5,
          getBoundingClientRect: () => ({ top: 100, bottom: 120, left: 40, width: 200 })
        };

        component.onTextSelect({ target: mockTarget } as unknown as Event, 'p1');
        expect(component.activeRightSidebar()).toBe('selection');
        expect(component.isSelectionToolbarClosing()).toBe(false);

        // Collapsing input/textarea selection dismisses selection sidebar via selectionchange handler
        class MockTextarea {
          selectionStart = 2;
          selectionEnd = 2;
          classList = { contains: () => false };
        }
        vi.stubGlobal('HTMLInputElement', class MockInput {});
        vi.stubGlobal('HTMLTextAreaElement', MockTextarea);
        vi.stubGlobal('window', { innerWidth: 1280, innerHeight: 800, getSelection: () => ({ toString: () => '' }) });
        vi.stubGlobal('document', { activeElement: new MockTextarea() });
        (component as any).handleDocumentSelectionChange();
        expect(component.isSelectionToolbarClosing()).toBe(true);

        vi.advanceTimersByTime(500);
        expect(component.activeRightSidebar()).toBeNull();
        expect(component.isSelectionToolbarClosing()).toBe(false);

        // Collapsing window selection outside inputs also dismisses selection sidebar
        component.onTextSelect({ target: mockTarget } as unknown as Event, 'p1');
        expect(component.activeRightSidebar()).toBe('selection');
        vi.stubGlobal('document', { activeElement: {} });
        (component as any).handleDocumentSelectionChange();
        expect(component.isSelectionToolbarClosing()).toBe(true);

        vi.advanceTimersByTime(500);
        expect(component.activeRightSidebar()).toBeNull();
        expect(component.isSelectionToolbarClosing()).toBe(false);

        // Re-open, then verify clicking inside sidebar preserves it while clicking outside hides it
        component.onTextSelect({ target: mockTarget } as unknown as Event, 'p1');
        expect(component.activeRightSidebar()).toBe('selection');

        const sidebarTarget = { closest: (sel: string) => (sel === '.docs-editor__right-sidebar' ? {} : null) };
        component.onDocumentClick({ target: sidebarTarget } as unknown as MouseEvent);
        expect(component.isSelectionToolbarClosing()).toBe(false);
        expect(component.activeRightSidebar()).toBe('selection');

        const outsideTarget = { closest: () => null };
        component.onDocumentClick({ target: outsideTarget } as unknown as MouseEvent);
        expect(component.isSelectionToolbarClosing()).toBe(true);

        vi.advanceTimersByTime(500);
        expect(component.activeRightSidebar()).toBeNull();
      } finally {
        vi.unstubAllGlobals();
        vi.useRealTimers();
      }
    });
  });

  describe('Stage B1: Block Selection & Keyboard Navigation', () => {
    it('identifies non-text blocks correctly', () => {
      expect(component.isNonTextBlock('divider')).toBe(true);
      expect(component.isNonTextBlock('image')).toBe(true);
      expect(component.isNonTextBlock('video')).toBe(true);
      expect(component.isNonTextBlock('table')).toBe(true);
      expect(component.isNonTextBlock('file')).toBe(true);
      expect(component.isNonTextBlock('paragraph')).toBe(false);
      expect(component.isNonTextBlock('heading1')).toBe(false);
    });

    it('selects non-text block on selection call', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'Intro' },
        { id: 'img1', type: 'image', url: 'https://example.com/test.png' }
      ]);

      component.selectBlock('img1');
      expect(component.selectedBlockId()).toBe('img1');
      expect(component.isBlockSelected('img1')).toBe(true);
      expect(component.focusedBlockId()).toBeNull();
    });

    it('arrow down at end of text block navigates selection to adjacent non-text block', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'Hello' },
        { id: 'div1', type: 'divider' }
      ]);
      component.focusedBlockId.set('p1');

      const mockEvent = {
        key: 'ArrowDown',
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { value: 'Hello', selectionStart: 5, selectionEnd: 5 }
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('p1', 0, mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.selectedBlockId()).toBe('div1');
    });

    it('arrow up at start of text block navigates selection to adjacent non-text block', () => {
      component.blocks.set([
        { id: 'div1', type: 'divider' },
        { id: 'p1', type: 'paragraph', text: 'World' }
      ]);
      component.focusedBlockId.set('p1');

      const mockEvent = {
        key: 'ArrowUp',
        shiftKey: false,
        preventDefault: vi.fn(),
        target: { value: 'World', selectionStart: 0, selectionEnd: 0 }
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('p1', 1, mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.selectedBlockId()).toBe('div1');
    });

    it('escape key clears block selection and focuses nearest text block', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'Text block' },
        { id: 'div1', type: 'divider' }
      ]);
      component.selectBlock('div1');
      expect(component.selectedBlockId()).toBe('div1');

      const mockEvent = {
        key: 'Escape',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' }
      } as unknown as KeyboardEvent;

      component.onBlockContainerKeyDown(mockEvent, component.blocks()[1], 1);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.selectedBlockId()).toBeNull();
      expect(component.focusedBlockId()).toBe('p1');
    });

    it('backspace/delete removes selected block and maintains undo snapshot', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'First' },
        { id: 'div1', type: 'divider' },
        { id: 'p2', type: 'paragraph', text: 'Second' }
      ]);
      component.selectBlock('div1');

      const mockEvent = {
        key: 'Backspace',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' }
      } as unknown as KeyboardEvent;

      component.onBlockContainerKeyDown(mockEvent, component.blocks()[1], 1);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(component.blocks().length).toBe(2);
      expect(component.blocks().find(b => b.id === 'div1')).toBeUndefined();

      // Undo restores the deleted block
      component.undo();
      expect(component.blocks().length).toBe(3);
      expect(component.blocks().find(b => b.id === 'div1')).toBeDefined();
    });

    it('shift+arrow extends multi-block selection', () => {
      component.blocks.set([
        { id: 'b1', type: 'divider' },
        { id: 'b2', type: 'image', url: 'https://example.com/1.png' },
        { id: 'b3', type: 'table' }
      ]);
      component.selectBlock('b1');

      const mockEvent = {
        key: 'ArrowDown',
        shiftKey: true,
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' }
      } as unknown as KeyboardEvent;

      component.onBlockContainerKeyDown(mockEvent, component.blocks()[0], 0);
      expect(component.selectedBlockIds()).toEqual(['b1', 'b2']);
    });

    it('alt+shift+arrow moves block up and down', () => {
      component.blocks.set([
        { id: 'b1', type: 'paragraph', text: 'Block 1' },
        { id: 'b2', type: 'paragraph', text: 'Block 2' }
      ]);

      const mockEventDown = {
        altKey: true,
        shiftKey: true,
        key: 'ArrowDown',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' }
      } as unknown as KeyboardEvent;

      component.onBlockContainerKeyDown(mockEventDown, component.blocks()[0], 0);
      expect(mockEventDown.preventDefault).toHaveBeenCalled();
      expect(component.blocks()[0].id).toBe('b2');
      expect(component.blocks()[1].id).toBe('b1');

      const mockEventUp = {
        altKey: true,
        shiftKey: true,
        key: 'ArrowUp',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' }
      } as unknown as KeyboardEvent;

      component.onBlockContainerKeyDown(mockEventUp, component.blocks()[1], 1);
      expect(mockEventUp.preventDefault).toHaveBeenCalled();
      expect(component.blocks()[0].id).toBe('b1');
      expect(component.blocks()[1].id).toBe('b2');
    });

    it('whole-block clipboard (copy, cut, paste)', () => {
      component.blocks.set([
        { id: 'b1', type: 'quote', text: 'Important quote' },
        { id: 'b2', type: 'paragraph', text: 'After' }
      ]);
      component.selectBlock('b1');

      component.copySelectedBlocks();
      component.pasteClipboardBlocks();

      expect(component.blocks().length).toBe(3);
      expect(component.blocks()[1].text).toBe('Important quote');
      expect(component.blocks()[1].id).not.toBe('b1');

      component.selectBlock('b1');
      component.cutSelectedBlocks();
      expect(component.blocks().length).toBe(2);
      expect(component.blocks().find(b => b.id === 'b1')).toBeUndefined();
    });
  });

  describe('Stage B2: Side Toolbar Operations', () => {
    it('duplicateBlock duplicates block with fresh ID directly after target', () => {
      component.blocks.set([
        { id: 'img1', type: 'image', url: 'https://example.com/orig.png', layout: 'wide' }
      ]);

      component.duplicateBlock('img1');
      const list = component.blocks();
      expect(list.length).toBe(2);
      expect(list[0].id).toBe('img1');
      expect(list[1].id).not.toBe('img1');
      expect(list[1].url).toBe('https://example.com/orig.png');
      expect(list[1].layout).toBe('wide');
    });

    it('deleteBlockWithUndo removes block and shows action toast', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: 'One' },
        { id: 'p2', type: 'paragraph', text: 'Two' }
      ]);

      component.deleteBlockWithUndo('p1');
      expect(component.blocks().length).toBe(1);
      expect(component.blocks()[0].id).toBe('p2');
    });
  });

  describe('Stage B3: Image Operations', () => {
    it('rotateImage rotates 90 degrees per call', () => {
      component.blocks.set([
        { id: 'img1', type: 'image', url: 'https://example.com/test.png', rotation: 0 }
      ]);

      component.rotateImage('img1');
      expect(component.blocks()[0].rotation).toBe(90);

      component.rotateImage('img1');
      expect(component.blocks()[0].rotation).toBe(180);

      component.rotateImage('img1');
      expect(component.blocks()[0].rotation).toBe(270);

      component.rotateImage('img1');
      expect(component.blocks()[0].rotation).toBe(0);
    });

    it('cycleBlockAlign cycles alignment left -> right -> center', () => {
      component.blocks.set([
        { id: 'img1', type: 'image', url: 'https://example.com/test.png', align: 'center' }
      ]);

      component.cycleBlockAlign('img1');
      expect(component.blocks()[0].align).toBe('left');

      component.cycleBlockAlign('img1');
      expect(component.blocks()[0].align).toBe('right');

      component.cycleBlockAlign('img1');
      expect(component.blocks()[0].align).toBe('center');
    });

    it('cycleBlockLayout cycles width presets inset -> wide -> full', () => {
      component.blocks.set([
        { id: 'img1', type: 'image', url: 'https://example.com/test.png', layout: 'inset' }
      ]);

      component.cycleBlockLayout('img1');
      expect(component.blocks()[0].layout).toBe('wide');

      component.cycleBlockLayout('img1');
      expect(component.blocks()[0].layout).toBe('full');

      component.cycleBlockLayout('img1');
      expect(component.blocks()[0].layout).toBe('inset');
    });

    it('openAltTextModal and saveAltText update image alt attribute', () => {
      component.blocks.set([
        { id: 'img1', type: 'image', url: 'https://example.com/test.png', alt: '' }
      ]);

      component.openAltTextModal('img1');
      expect(component.showAltTextModal()).toBe(true);

      component.altTextInput.set('Architecture system diagram');
      component.saveAltText();

      expect(component.showAltTextModal()).toBe(false);
      expect(component.blocks()[0].alt).toBe('Architecture system diagram');
    });
  });

  describe('Stage B4: Video Operations', () => {
    it('openPosterModal and savePosterUrl update video posterUrl attribute', () => {
      component.blocks.set([
        { id: 'v1', type: 'video', url: 'https://example.com/video.mp4', posterUrl: '' }
      ]);

      component.openPosterModal('v1');
      expect(component.showPosterModal()).toBe(true);

      component.posterUrlInput.set('https://example.com/poster.jpg');
      component.savePosterUrl();

      expect(component.showPosterModal()).toBe(false);
      expect(component.blocks()[0].posterUrl).toBe('https://example.com/poster.jpg');
    });
  });

  describe('Stage B5: Table Enhancements', () => {
    it('openTablePicker and confirmTableInsert create table with custom dimensions', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: '' }
      ]);
      component.focusedBlockId.set('p1');

      component.openTablePicker('p1');
      expect(component.showTablePickerModal()).toBe(true);

      component.tablePickerRows.set(4);
      component.tablePickerCols.set(5);
      component.confirmTableInsert();

      expect(component.showTablePickerModal()).toBe(false);
      const tableBlock = component.blocks().find(b => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.tableData?.rows.length).toBe(4);
      expect(tableBlock?.tableData?.rows[0].length).toBe(5);
      expect(tableBlock?.tableData?.headerRow).toBe(true);
      expect(tableBlock?.tableData?.alignments?.length).toBe(5);
    });

    it('insertTableRowAbove and insertTableRowBelow insert rows at proper position', () => {
      component.blocks.set([
        {
          id: 't1',
          type: 'table',
          tableData: {
            headerRow: true,
            rows: [['A1', 'B1'], ['A2', 'B2']],
            alignments: ['left', 'left']
          }
        }
      ]);
      component.onTableCellFocus('t1', 1, 0);

      component.insertTableRowAbove('t1');
      expect(component.blocks()[0].tableData?.rows.length).toBe(3);
      expect(component.blocks()[0].tableData?.rows[1]).toEqual(['', '']);

      component.insertTableRowBelow('t1');
      expect(component.blocks()[0].tableData?.rows.length).toBe(4);
    });

    it('insertTableColumnLeft and insertTableColumnRight insert column and alignment', () => {
      component.blocks.set([
        {
          id: 't1',
          type: 'table',
          tableData: {
            headerRow: true,
            rows: [['A1', 'B1'], ['A2', 'B2']],
            alignments: ['left', 'center']
          }
        }
      ]);
      component.onTableCellFocus('t1', 0, 1);

      component.insertTableColumnRight('t1');
      const td = component.blocks()[0].tableData!;
      expect(td.rows[0].length).toBe(3);
      expect(td.alignments?.length).toBe(3);
    });

    it('deleteActiveTableRow and deleteActiveTableColumn delete focused row/col', () => {
      component.blocks.set([
        {
          id: 't1',
          type: 'table',
          tableData: {
            headerRow: true,
            rows: [['A1', 'B1'], ['A2', 'B2'], ['A3', 'B3']],
            alignments: ['left', 'center']
          }
        }
      ]);
      component.onTableCellFocus('t1', 1, 0);

      component.deleteActiveTableRow('t1');
      expect(component.blocks()[0].tableData?.rows.length).toBe(2);
      expect(component.blocks()[0].tableData?.rows[1]).toEqual(['A3', 'B3']);

      component.deleteActiveTableColumn('t1');
      expect(component.blocks()[0].tableData?.rows[0].length).toBe(1);
    });

    it('cycleTableCellAlignment cycles alignment between left -> center -> right', () => {
      component.blocks.set([
        {
          id: 't1',
          type: 'table',
          tableData: {
            headerRow: true,
            rows: [['A1', 'B1']],
            alignments: ['left', 'left']
          }
        }
      ]);
      component.onTableCellFocus('t1', 0, 1);

      component.cycleTableCellAlignment('t1');
      expect(component.blocks()[0].tableData?.alignments?.[1]).toBe('center');

      component.cycleTableCellAlignment('t1');
      expect(component.blocks()[0].tableData?.alignments?.[1]).toBe('right');

      component.cycleTableCellAlignment('t1');
      expect(component.blocks()[0].tableData?.alignments?.[1]).toBe('left');
    });
  });

  describe('Stage B6: Categories & "+" Quick Menu', () => {
    it('triggerTableInsertPrompt opens table size picker', () => {
      component.triggerTableInsertPrompt();
      expect(component.showTablePickerModal()).toBe(true);
    });
  });

  describe('Stage B7: Clipboard Image Paste', () => {
    it('onCanvasPaste ignores non-image pastes and intercepts image files', () => {
      const mockFile = new File(['mock'], 'pasted.png', { type: 'image/png' });
      const mockEvent = {
        clipboardData: {
          files: [mockFile]
        },
        preventDefault: vi.fn()
      } as unknown as ClipboardEvent;

      component.onCanvasPaste(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      const imgBlock = component.blocks().find(b => b.type === 'image');
      expect(imgBlock).toBeDefined();
    });
  });

  describe('Phase 1: Audit Bug Fixes', () => {
    it('1. Divider: is a selectable non-text block with keyboard Backspace removal and undo', () => {
      const divBlock: DocBlock = { id: 'd1', type: 'divider' };
      const pBlock: DocBlock = { id: 'p1', type: 'paragraph', text: 'Hello' };
      component.blocks.set([pBlock, divBlock]);

      expect(component.isNonTextBlock('divider')).toBe(true);

      component.selectBlock('d1');
      expect(component.isBlockSelected('d1')).toBe(true);

      // Backspace on selected divider removes it and pushes history
      const keyEvent = {
        key: 'Backspace',
        preventDefault: vi.fn(),
        target: { tagName: 'DIV' }
      } as unknown as KeyboardEvent;

      component.onBlockContainerKeyDown(keyEvent, divBlock, 1);
      expect(component.blocks().some(b => b.id === 'd1')).toBe(false);

      // Undo restores the divider
      component.undo();
      expect(component.blocks().some(b => b.id === 'd1')).toBe(true);
    });

    it('2. Table: deletes active cell row and column, not only the last row/col', () => {
      component.blocks.set([
        {
          id: 't1',
          type: 'table',
          tableData: {
            headerRow: true,
            rows: [
              ['R0C0', 'R0C1', 'R0C2'],
              ['R1C0', 'R1C1', 'R1C2'],
              ['R2C0', 'R2C1', 'R2C2']
            ],
            alignments: ['left', 'center', 'right']
          }
        }
      ]);

      // Focus middle cell (Row 1, Col 1)
      component.onTableCellFocus('t1', 1, 1);

      // Delete active row (Row 1 should be removed)
      component.deleteActiveTableRow('t1');
      const rowsAfterRowDel = component.blocks()[0].tableData?.rows || [];
      expect(rowsAfterRowDel.length).toBe(2);
      expect(rowsAfterRowDel[0][0]).toBe('R0C0');
      expect(rowsAfterRowDel[1][0]).toBe('R2C0');

      // Delete active column (Col 1 should be removed)
      component.deleteActiveTableColumn('t1');
      const rowsAfterColDel = component.blocks()[0].tableData?.rows || [];
      expect(rowsAfterColDel[0]).toEqual(['R0C0', 'R0C2']);
      expect(rowsAfterColDel[1]).toEqual(['R2C0', 'R2C2']);
      expect(component.blocks()[0].tableData?.alignments).toEqual(['left', 'right']);
    });

    it('3. Table insert: initializes tableData in convertBlock and convertBlockAndClose', () => {
      component.blocks.set([
        { id: 'p1', type: 'paragraph', text: '' }
      ]);

      component.convertBlock('p1', 'table');
      const converted = component.blocks()[0];
      expect(converted.type).toBe('table');
      expect(converted.tableData).toBeDefined();
      expect(converted.tableData?.headerRow).toBe(true);
      expect(converted.tableData?.rows.length).toBe(3);
      expect(converted.tableData?.rows[0].length).toBe(3);

      // Also via convertBlockAndClose
      component.blocks.set([
        { id: 'p2', type: 'paragraph', text: 'Some existing text' }
      ]);
      component.convertBlockAndClose('p2', 'table');
      const inserted = component.blocks().find(b => b.type === 'table');
      expect(inserted).toBeDefined();
      expect(inserted?.tableData).toBeDefined();
      expect(inserted?.tableData?.rows.length).toBe(3);
    });

    it('4. Image & file replace: preserves layout and alt text when replacing image', () => {
      component.blocks.set([
        {
          id: 'img1',
          type: 'image',
          url: 'https://example.com/old.png',
          alt: 'Old Alt Text',
          layout: 'wide',
          caption: 'My Caption'
        }
      ]);
      component.docId.set('doc-1');

      const mockFile = new File(['content'], 'new.png', { type: 'image/png' });
      const event = {
        target: {
          files: [mockFile]
        }
      } as unknown as Event;

      const uploadSpy = vi.spyOn((component as any).docService, 'uploadImage').mockReturnValue(of({
        id: 'u1',
        url: 'https://example.com/new.png',
        filename: 'new.png',
        originalFilename: 'new.png',
        mediaType: 'image/png',
        sizeBytes: 100
      }));

      component.onReplaceImageFile('img1', event);
      const updatedImg = component.blocks()[0];
      expect(updatedImg.url).toBe('https://example.com/new.png');
      expect(updatedImg.alt).toBe('Old Alt Text');
      expect(updatedImg.layout).toBe('wide');
      expect(updatedImg.caption).toBe('My Caption');
    });

    it('5. List indent: Tab indents and Shift+Tab outdents list items up to 6 levels', () => {
      component.blocks.set([
        {
          id: 'l1',
          type: 'bullet_list',
          items: ['Item 1', 'Item 2'],
          itemLevels: [0, 0]
        }
      ]);

      const tabEvent = {
        key: 'Tab',
        shiftKey: false,
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      // Tab indents item 1 from 0 to 1
      component.onListKeyDown('l1', 1, tabEvent, 'bullet');
      expect(tabEvent.preventDefault).toHaveBeenCalled();
      expect(component.blocks()[0].itemLevels?.[1]).toBe(1);

      // Repeat indents up to max 5 (6 levels total: 0..5)
      for (let i = 0; i < 10; i++) {
        component.onListKeyDown('l1', 1, tabEvent, 'bullet');
      }
      expect(component.blocks()[0].itemLevels?.[1]).toBe(5);

      // Shift+Tab outdents back
      const shiftTabEvent = {
        key: 'Tab',
        shiftKey: true,
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      component.onListKeyDown('l1', 1, shiftTabEvent, 'bullet');
      expect(component.blocks()[0].itemLevels?.[1]).toBe(4);

      // Enter on indented item preserves level on next item
      const enterEvent = {
        key: 'Enter',
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;
      component.blocks()[0].items = ['Item 1', 'Item 2 with text'];
      component.onListKeyDown('l1', 1, enterEvent, 'bullet');
      expect(component.blocks()[0].items?.length).toBe(3);
      expect(component.blocks()[0].itemLevels?.[2]).toBe(4);
    });

    it('6. Code block: getCodeLineNumbers and copyCode work in edit mode', async () => {
      const lineCount = component.getCodeLineNumbers('line 1\nline 2\nline 3');
      expect(lineCount.length).toBe(3);

      const emptyLineCount = component.getCodeLineNumbers('');
      expect(emptyLineCount.length).toBe(1);

      const mockEvent = {
        stopPropagation: vi.fn()
      } as unknown as MouseEvent;

      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextSpy
        }
      });

      component.copyCode('const x = 10;', 'code-block-1', mockEvent);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(writeTextSpy).toHaveBeenCalledWith('const x = 10;');
      await Promise.resolve();
      expect(component.copiedBlockId()).toBe('code-block-1');
    });

    it('7. Verify block deletion and undo restoration across block types', () => {
      // Test Backspace on empty paragraph deletes and undo restores it
      const p1: DocBlock = { id: 'p1', type: 'paragraph', text: 'First' };
      const p2: DocBlock = { id: 'p2', type: 'paragraph', text: '' };
      component.blocks.set([p1, p2]);

      const backspaceEvent = {
        key: 'Backspace',
        preventDefault: vi.fn(),
        target: { selectionStart: 0, selectionEnd: 0 }
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('p2', 1, backspaceEvent);
      expect(component.blocks().length).toBe(1);
      expect(component.blocks()[0].id).toBe('p1');

      // Undo restores p2
      component.undo();
      expect(component.blocks().length).toBe(2);
      expect(component.blocks()[1].id).toBe('p2');

      // Test deleteBlockWithUndo on code block
      const codeBlock: DocBlock = { id: 'c1', type: 'code', text: 'console.log(1)' };
      component.blocks.set([p1, codeBlock]);
      component.deleteBlockWithUndo('c1');
      expect(component.blocks().some(b => b.id === 'c1')).toBe(false);

      // Undo restores code block
      component.undo();
      expect(component.blocks().some(b => b.id === 'c1')).toBe(true);
      expect(component.blocks().find(b => b.id === 'c1')?.text).toBe('console.log(1)');
    });
  });

  describe('Editor Enhancements Parts 1-6 (Selection Toolbar, Block Controls, Active Highlight, Erase Icon, Keyboard Delete & Fast Ops)', () => {
    it('Part 1: Selection toolbar opens in right sidebar and slides out cleanly on close before unmounting', () => {
      // 1. Text selection triggers openSelectionToolbar -> right sidebar 'selection' mode
      component.openSelectionToolbar({ x: 100, y: 150, placement: 'top' });
      expect(component.showSelectionToolbar()).toBe(true);
      expect(component.activeRightSidebar()).toBe('selection');
      expect(component.isSelectionToolbarClosing()).toBe(false);
      expect(component.activeSelectionToolbar()).toEqual({ x: 100, y: 150, placement: 'top' });

      // 2. Dismiss triggers closing animation state while keeping right sidebar in DOM
      component.dismissSelectionToolbar();
      expect(component.isSelectionToolbarClosing()).toBe(true);
      expect(component.activeRightSidebar()).toBe('selection');
      expect(component.activeSelectionToolbar()).not.toBeNull();

      // 3. animationend completes exit and unmounts right sidebar from DOM
      component.onSelectionToolbarAnimationEnd({} as AnimationEvent);
      expect(component.isSelectionToolbarClosing()).toBe(false);
      expect(component.activeSelectionToolbar()).toBeNull();
      expect(component.activeRightSidebar()).toBeNull();
      expect(component.showSelectionToolbar()).toBe(false);
    });

    it('Right Sidebar: Selecting a non-text element opens element inspector and animates closed on dismiss or title focus', () => {
      const p1: DocBlock = { id: 'p1', type: 'paragraph', text: 'Body paragraph' };
      const img1: DocBlock = { id: 'img1', type: 'image', url: 'https://example.com/pic.png' };
      component.blocks.set([p1, img1]);

      // 1. Selecting image opens right sidebar in 'element' mode
      component.selectBlock('img1');
      expect(component.activeRightSidebar()).toBe('element');
      expect(component.displayElementBlock()?.id).toBe('img1');
      expect(component.isSelectionToolbarClosing()).toBe(false);

      // 2. Focusing a text block deselects element and starts slide-out close animation
      component.setFocusedBlock('p1');
      expect(component.selectedBlockId()).toBeNull();
      expect(component.isSelectionToolbarClosing()).toBe(true);
      expect(component.activeRightSidebar()).toBe('element');
      expect(component.displayElementBlock()?.id).toBe('img1');

      // 3. animationend removes right sidebar
      component.onSelectionToolbarAnimationEnd({} as AnimationEvent);
      expect(component.activeRightSidebar()).toBeNull();
      expect(component.isSelectionToolbarClosing()).toBe(false);

      // 4. Focusing title clears active block highlight and closes sidebar if open
      component.selectBlock('img1');
      expect(component.activeRightSidebar()).toBe('element');
      component.onTitleFocus();
      expect(component.focusedBlockId()).toBeNull();
      expect(component.selectedBlockId()).toBeNull();
      expect(component.isSelectionToolbarClosing()).toBe(true);
    });

    it('Part 2: Block controls stay visible when block is focused (working/active) or selected', () => {
      const p1: DocBlock = { id: 'b1', type: 'paragraph', text: 'Active block' };
      const p2: DocBlock = { id: 'b2', type: 'paragraph', text: 'Second block' };
      component.blocks.set([p1, p2]);

      // When cursor is in block 1
      component.focusedBlockId.set('b1');
      const isB1Visible = component.focusedBlockId() === 'b1' || component.hoveredBlockId() === 'b1' || component.isBlockSelected('b1');
      const isB2Visible = component.focusedBlockId() === 'b2' || component.hoveredBlockId() === 'b2' || component.isBlockSelected('b2');
      expect(isB1Visible).toBe(true);
      expect(isB2Visible).toBe(false);

      // When moving to block 2
      component.focusedBlockId.set('b2');
      expect(component.focusedBlockId() === 'b1' || component.hoveredBlockId() === 'b1' || component.isBlockSelected('b1')).toBe(false);
      expect(component.focusedBlockId() === 'b2' || component.hoveredBlockId() === 'b2' || component.isBlockSelected('b2')).toBe(true);
    });

    it('Part 5: Non-text block identification and keyboard deletion with nearest text focus', () => {
      // 1. Verify all required non-text types are recognized
      expect(component.isNonTextBlock('image')).toBe(true);
      expect(component.isNonTextBlock('video')).toBe(true);
      expect(component.isNonTextBlock('embed')).toBe(true);
      expect(component.isNonTextBlock('file')).toBe(true);
      expect(component.isNonTextBlock('divider')).toBe(true);
      expect(component.isNonTextBlock('table')).toBe(true);
      expect(component.isNonTextBlock('paragraph')).toBe(false);

      // 2. Test deleting an image block moves cursor to previous text block first
      const p1: DocBlock = { id: 'p1', type: 'paragraph', text: 'Before' };
      const img: DocBlock = { id: 'img1', type: 'image', url: 'https://example.com/test.png' };
      const p2: DocBlock = { id: 'p2', type: 'paragraph', text: 'After' };
      component.blocks.set([p1, img, p2]);

      // Select image block and press Delete via global shortcut
      component.selectBlock('img1');
      const deleteEvent = {
        key: 'Delete',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      component.handleGlobalShortcuts(deleteEvent);
      expect(component.blocks().length).toBe(2);
      expect(component.blocks().map(b => b.id)).toEqual(['p1', 'p2']);
      expect(component.focusedBlockId()).toBe('p1'); // previous text block focused first

      // 3. Undo restores the image block
      component.undo();
      expect(component.blocks().length).toBe(3);
      expect(component.blocks()[1].id).toBe('img1');

      // 4. Test deleting a divider at index 0 moves cursor to next text block
      const divBlock: DocBlock = { id: 'div1', type: 'divider' };
      component.blocks.set([divBlock, p2]);
      component.selectBlock('div1');
      component.handleGlobalShortcuts(deleteEvent);
      expect(component.blocks().length).toBe(1);
      expect(component.blocks()[0].id).toBe('p2');
      expect(component.focusedBlockId()).toBe('p2'); // next text block focused when no previous
    });

    it('Part 5 & 3: Backspace guard in text blocks preserves text editing and does not delete non-empty blocks', () => {
      const p1: DocBlock = { id: 'p1', type: 'paragraph', text: 'Hello' };
      component.blocks.set([p1]);

      // Backspace while text is present does NOT delete the block
      const backspaceWithText = {
        key: 'Backspace',
        preventDefault: vi.fn(),
        target: { selectionStart: 3, selectionEnd: 3, value: 'Hello' }
      } as unknown as KeyboardEvent;

      component.onBlockKeyDown('p1', 0, backspaceWithText);
      expect(component.blocks().length).toBe(1);
      expect(backspaceWithText.preventDefault).not.toHaveBeenCalled();
    });

    it('Part 6: Fast operations — Alt+ArrowUp/Down to move and Ctrl+Shift+D to duplicate', () => {
      const t1: DocBlock = {
        id: 't1',
        type: 'table',
        tableData: {
          rows: [['A', 'B'], ['1', '2']],
          headerRow: true
        }
      };
      const p1: DocBlock = { id: 'p1', type: 'paragraph', text: 'Text block' };
      component.blocks.set([t1, p1]);

      // 1. Move table down via Alt+ArrowDown
      component.focusedBlockId.set('t1');
      const altArrowDown = {
        key: 'ArrowDown',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      component.handleGlobalShortcuts(altArrowDown);
      expect(component.blocks()[0].id).toBe('p1');
      expect(component.blocks()[1].id).toBe('t1');

      // Undo restores original order
      component.undo();
      expect(component.blocks()[0].id).toBe('t1');
      expect(component.blocks()[1].id).toBe('p1');

      // 2. Duplicate table via Ctrl+Shift+D
      const ctrlShiftD = {
        key: 'd',
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: true,
        preventDefault: vi.fn()
      } as unknown as KeyboardEvent;

      component.handleGlobalShortcuts(ctrlShiftD);
      expect(component.blocks().length).toBe(3);
      expect(component.blocks()[1].type).toBe('table');
      expect(component.blocks()[1].tableData?.rows).toEqual([['A', 'B'], ['1', '2']]);
      expect(component.blocks()[1].id).not.toBe('t1'); // new unique ID

      // Undo restores 2 blocks
      component.undo();
      expect(component.blocks().length).toBe(2);
    });
  });
});
