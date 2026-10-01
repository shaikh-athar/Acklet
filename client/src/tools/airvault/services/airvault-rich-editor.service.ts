import { Injectable, NgZone } from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Markdown } from 'tiptap-markdown';
import { common, createLowlight } from 'lowlight';
import { Subject } from 'rxjs';

const lowlight = createLowlight(common);

@Injectable()
export class AirvaultRichEditorService {
  private _editor: Editor | null = null;
  private _contentSubject = new Subject<string>();
  private _selectionSubject = new Subject<{ empty: boolean; from: number; to: number }>();
  private _transactionSubject = new Subject<void>();

  /** Emits the HTML string on every editor content change */
  readonly content$ = this._contentSubject.asObservable();
  /** Emits on selection changes (focus, cursor move, text highlight) */
  readonly selection$ = this._selectionSubject.asObservable();
  /** Emits on every editor transaction (format toggles, cursor moves, active state updates) */
  readonly transaction$ = this._transactionSubject.asObservable();

  get editor(): Editor | null {
    return this._editor;
  }

  constructor(private ngZone: NgZone) {}

  /**
   * Initialize the Tiptap editor on the given DOM element.
   * Must be called in ngAfterViewInit after the element is in the DOM.
   */
  init(element: HTMLElement, placeholder = 'Drop files, folders, or start typing...'): Editor {
    // Destroy any previous instance before re-init (e.g. HMR)
    this.destroy();

    // Run Tiptap entirely outside Angular's zone — it fires many micro-updates
    // internally. We re-enter the zone only for content changes that affect signals.
    this.ngZone.runOutsideAngular(() => {
      this._editor = new Editor({
        element,
        extensions: [
          StarterKit.configure({
            // Disable default codeBlock in favor of CodeBlockLowlight
            codeBlock: false,
            // Disable default link mark in StarterKit to prevent duplicate extension warning
            link: false,
            horizontalRule: false,
            dropcursor: { width: 2, color: '#2196F3' },
          }),
          Underline,
          CodeBlockLowlight.configure({
            lowlight,
          }),
          Link.configure({
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
          }),
          Placeholder.configure({
            placeholder,
            showOnlyWhenEditable: true,
            showOnlyCurrent: false,
          }),
          Markdown.configure({
            html: true, // Preserve standard HTML elements (headings, codeblocks, lists, paragraphs) without escaping to entities
            tightLists: false, // Maintain natural list item spacing
            linkify: true, // Auto-detect bare URLs as links
            breaks: true, // Preserve exact line breaks (\n -> <br>) so pasted text spacing is maintained 1:1
            transformPastedText: false, // Do not auto-parse pasted text into markdown nodes (prevents double insertion/corruption)
            transformCopiedText: false, // Keep copied text as plain text
          }),
        ],
        editorProps: {
          attributes: {
            class: 'av-rich-editor-prose',
            'aria-multiline': 'true',
            spellcheck: 'true',
          },
        },
        onUpdate: ({ editor }) => {
          // Re-enter Angular zone so signal writes trigger change detection
          this.ngZone.run(() => {
            this._contentSubject.next(editor.getHTML());
            this._transactionSubject.next();
          });
        },
        onSelectionUpdate: ({ editor }) => {
          const { empty, from, to } = editor.state.selection;
          this.ngZone.run(() => {
            this._selectionSubject.next({ empty, from, to });
            this._transactionSubject.next();
          });
        },
        onTransaction: () => {
          this.ngZone.run(() => {
            this._transactionSubject.next();
          });
        },
      });
    });

    return this._editor!;
  }

  destroy(): void {
    if (this._editor) {
      this._editor.destroy();
      this._editor = null;
    }
  }

  // ── Content & Markdown Storage ─────────────────────────────────

  getHTML(): string {
    return this._editor?.getHTML() ?? '';
  }

  /** Serializes the document to clean Markdown */
  getMarkdown(): string {
    if (!this._editor) return '';
    try {
      const storage = (this._editor.storage as any)?.markdown;
      if (storage && typeof storage.getMarkdown === 'function') {
        return storage.getMarkdown();
      }
    } catch {
      // fallback
    }
    return this.getText();
  }

  /** Plain text — used for search, sync diff checks, byte-size calculations */
  getText(): string {
    return this._editor?.getText() ?? '';
  }

  isEmpty(): boolean {
    return this._editor?.isEmpty ?? true;
  }

  /** Set editor content from an HTML or Markdown string */
  setContent(content: string): void {
    if (!this._editor) return;
    this._editor.commands.setContent(content, { emitUpdate: false });
  }

  /** Set editor content from an HTML string */
  setHTML(html: string): void {
    if (!this._editor) return;
    this._editor.commands.setContent(html, { emitUpdate: false });
  }

  /** Set editor content from a Markdown or plain-text string */
  setText(text: string): void {
    if (!this._editor) return;
    this._editor.commands.setContent(text, { emitUpdate: false });
  }

  clear(): void {
    this._editor?.commands.clearContent(true);
  }

  focus(position: 'start' | 'end' | 'all' = 'end'): void {
    if (!this._editor) return;
    this._editor.commands.focus(position);
    try {
      this._editor.view?.focus();
    } catch {}
  }

  /**
   * Focuses the editor on a new line. If editor is empty, focuses directly.
   * If editor already has text, inserts a newline or new paragraph and positions cursor on it.
   */
  focusOnNewLine(): void {
    if (!this._editor) return;
    this._editor.commands.focus('end');
    try {
      this._editor.view?.focus();
    } catch {}

    const text = this.getText();
    if (text.trim().length > 0 && !text.endsWith('\n')) {
      // Ensure cursor moves to a clean next line
      this._editor.chain().focus('end').createParagraphNear().run();
    }
  }

  // ── Format Commands ────────────────────────────────────────────

  toggleBold(): void {
    this._editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this._editor?.chain().focus().toggleItalic().run();
  }

  toggleUnderline(): void {
    this._editor?.chain().focus().toggleUnderline().run();
  }

  toggleStrike(): void {
    this._editor?.chain().focus().toggleStrike().run();
  }

  /** Toggle heading at the given level, or reset to paragraph (level 0). */
  toggleHeading(level: 0 | 1 | 2 | 3): void {
    if (!this._editor) return;
    if (level === 0) {
      this._editor.chain().focus().setParagraph().run();
    } else {
      this._editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  toggleBulletList(): void {
    this._editor?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this._editor?.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(): void {
    this._editor?.chain().focus().toggleBlockquote().run();
  }

  toggleCode(): void {
    this._editor?.chain().focus().toggleCode().run();
  }

  toggleCodeBlock(): void {
    this._editor?.chain().focus().toggleCodeBlock().run();
  }

  setLink(url: string): void {
    if (!this._editor) return;
    if (!url.trim()) { this.clearLink(); return; }
    this._editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }

  clearLink(): void {
    this._editor?.chain().focus().unsetLink().run();
  }

  // ── Active State Queries (for toolbar highlight) ───────────────

  isActive(type: string, attrs?: Record<string, unknown>): boolean {
    return this._editor?.isActive(type, attrs) ?? false;
  }

  isBoldActive(): boolean        { return this.isActive('bold'); }
  isItalicActive(): boolean      { return this.isActive('italic'); }
  isUnderlineActive(): boolean   { return this.isActive('underline'); }
  isStrikeActive(): boolean      { return this.isActive('strike'); }
  isCodeActive(): boolean        { return this.isActive('code'); }
  isCodeBlockActive(): boolean   { return this.isActive('codeBlock'); }
  isBlockquoteActive(): boolean  { return this.isActive('blockquote'); }
  isLinkActive(): boolean        { return this.isActive('link'); }

  isHeadingActive(level: 1 | 2 | 3): boolean {
    return this.isActive('heading', { level });
  }

  isBulletListActive(): boolean   { return this.isActive('bulletList'); }
  isOrderedListActive(): boolean  { return this.isActive('orderedList'); }
}

// ── Helpers ─────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Returns true if raw content is HTML (produced by Tiptap).
 * Used in history/preview to decide between [innerHTML] vs plain text binding.
 */
export function isHtmlContent(raw: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trimStart();
  return trimmed.startsWith('<p>') || trimmed.startsWith('<h') ||
         trimmed.startsWith('<ul') || trimmed.startsWith('<ol') ||
         trimmed.startsWith('<blockquote');
}
