/**
 * Word-based Undo/Redo Manager for AirVault Clipboard Editor.
 *
 * Requirements:
 * - Maintains an undo stack of discrete "edit operations".
 * - A typing run of contiguous characters within a single word is grouped into a single operation.
 * - Word boundaries (whitespace, punctuation, newline) close the current typing operation and start a new one.
 * - Non-typing actions (paste, cut, suggestion-accept, clear, delete-word) are atomic operations.
 * - Redo stack restores exact states without drift.
 */

import { LineBlameEntry } from './airvault-clipboard.service';

export interface EditOperation {
  text: string;
  blameMap?: LineBlameEntry[];
  type: 'type' | 'paste' | 'cut' | 'suggestion' | 'delete' | 'init';
  cursorPos?: number;
  timestamp: number;
}

export class WordUndoManager {
  private undoStack: EditOperation[] = [];
  private redoStack: EditOperation[] = [];
  private currentWordBuffer: string = '';
  private lastType: EditOperation['type'] = 'init';
  private maxStackSize: number = 100;

  constructor(initialText: string = '', initialBlame?: LineBlameEntry[]) {
    this.reset(initialText, initialBlame);
  }

  reset(initialText: string = '', initialBlame?: LineBlameEntry[]) {
    this.undoStack = [{
      text: initialText,
      blameMap: initialBlame ? [...initialBlame] : undefined,
      type: 'init',
      timestamp: Date.now()
    }];
    this.redoStack = [];
    this.currentWordBuffer = '';
    this.lastType = 'init';
  }

  getCurrentText(): string {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].text : '';
  }

  getCurrentBlameMap(): LineBlameEntry[] | undefined {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].blameMap : undefined;
  }

  /**
   * Handle text change from user typing. Groups letters into words using boundary detection.
   */
  recordTyping(newText: string, cursorPos?: number, blameMap?: LineBlameEntry[]) {
    if (newText.length > 150000) return; // Guard huge payloads

    const prevOp = this.undoStack[this.undoStack.length - 1];
    const prevText = prevOp ? prevOp.text : '';

    if (newText === prevText) return;

    // Detect character difference
    const isAppend = newText.length > prevText.length;
    const diffChar = isAppend ? newText.slice(prevText.length) : '';
    const isBoundary = /[\s\.,;:\!\?\(\)\[\]\{\}\"\'\/\\|\-_+=`~<>]/.test(diffChar);

    // If previous action was not typing, or we crossed a word boundary, seal the previous op and push new
    if (this.lastType !== 'type' || isBoundary || this.currentWordBuffer.length > 30) {
      this.undoStack.push({
        text: newText,
        blameMap: blameMap ? [...blameMap] : undefined,
        type: 'type',
        cursorPos,
        timestamp: Date.now()
      });
      this.currentWordBuffer = isBoundary ? '' : diffChar;
    } else {
      // Overwrite the current active typing operation with the updated word state
      this.undoStack[this.undoStack.length - 1] = {
        text: newText,
        blameMap: blameMap ? [...blameMap] : undefined,
        type: 'type',
        cursorPos,
        timestamp: Date.now()
      };
      this.currentWordBuffer += diffChar;
    }

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.lastType = 'type';
  }

  /**
   * Records an atomic non-typing operation (paste, cut, suggestion-accept, clear, etc.)
   */
  recordAtomicOperation(newText: string, type: 'paste' | 'cut' | 'suggestion' | 'delete', cursorPos?: number, blameMap?: LineBlameEntry[]) {
    if (newText.length > 150000) return;

    const prevOp = this.undoStack[this.undoStack.length - 1];
    if (prevOp && prevOp.text === newText) return;

    this.undoStack.push({
      text: newText,
      blameMap: blameMap ? [...blameMap] : undefined,
      type,
      cursorPos,
      timestamp: Date.now()
    });

    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.currentWordBuffer = '';
    this.lastType = type;
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): string | null {
    if (!this.canUndo()) return null;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const prev = this.undoStack[this.undoStack.length - 1];
    this.currentWordBuffer = '';
    this.lastType = 'init';
    return prev ? prev.text : '';
  }

  redo(): string | null {
    if (!this.canRedo()) return null;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.currentWordBuffer = '';
    this.lastType = next.type;
    return next.text;
  }
}
