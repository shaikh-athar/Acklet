/**
 * AirVault Safe Markdown & Rich Text Utility
 *
 * Exports:
 *  - renderMarkdownToSafeHtml   → Markdown  → safe HTML (line-by-line block parser)
 *  - renderPlainTextToSafeHtml  → Plain text → safe HTML (whitespace-preserving)
 *  - renderHtmlToSafeHtml       → Rich HTML  → sanitized HTML (XSS-stripped only)
 *  - sanitizeHtmlSnippet        → Low-level sanitizer (removes XSS vectors only)
 *  - escapeHtml                 → Raw HTML entity escaping
 *  - isHtmlContent              → Heuristic: does string look like HTML?
 *  - isStrictCodeMarkup         → Heuristic: is this raw source code / JSX?
 *  - looksLikeMarkdown          → Heuristic: does this look like Markdown?
 */

export interface RenderedMarkdownSegment {
  type: 'html' | 'text';
  content: string;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

/**
 * Escapes HTML special characters to prevent XSS and double-rendering.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Returns true if the string appears to be rich HTML.
 * IMPORTANT: We require the string to START with a tag character so that Markdown
 * containing angle brackets in code snippets (Array<string>, generics, JSX-like syntax)
 * is NOT mistakenly classified as HTML and sent through the sanitizer raw.
 */
export function isHtmlContent(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!/^<[a-zA-Z]/.test(trimmed)) return false;
  return /(<\/?(p|h[1-6]|ul|ol|li|pre|code|blockquote|strong|b|em|i|u|del|span|div|table|tr|td|th|br|hr|a)\b[^>]*>)/i.test(trimmed);
}

/**
 * Returns true if the string looks like a full-document code/markup artifact
 * (HTML document, SVG, XML, JSX) rather than rich-text Markdown or pasted content.
 */
export function isStrictCodeMarkup(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<\?xml\b/i.test(trimmed)) return true;
  if (/^<html\b/i.test(trimmed) || /^<svg\b/i.test(trimmed)) return true;
  if (/<(script|style|template|meta|link|head|body|canvas|iframe)\b/i.test(trimmed)) return true;
  if (/<[A-Z][a-zA-Z0-9]*\b[^>]*(\/?>|>[\s\S]*<\/[A-Z][a-zA-Z0-9]*>)/.test(trimmed)) return true;
  return false;
}

/**
 * High-confidence Markdown detection heuristics.
 * Returns true only when cumulative score of Markdown signals >= 2.5.
 */
export function looksLikeMarkdown(str: string): boolean {
  if (!str || str.length < 4) return false;
  const trimmed = str.trim();
  if (isStrictCodeMarkup(trimmed)) return false;

  let score = 0;

  if (/```(?:[a-zA-Z0-9_-]*\n)?[\s\S]+?```/.test(trimmed)) score += 3;

  const headingMatches = trimmed.match(/^#{1,6}\s+[^\s#].*$/gm);
  if (headingMatches && headingMatches.length > 0) {
    score += headingMatches.length >= 2 ? 2 : 1.5;
  }

  if (/\*\*[^\s*][^*]*\*\*|__[^_\s][^_]*__/.test(trimmed)) score += 1.5;

  const bulletMatches = trimmed.match(/^[ \t]*[-*+]\s+[^\s].*$/gm);
  if (bulletMatches && bulletMatches.length >= 2) score += 1.5;
  else if (bulletMatches && bulletMatches.length === 1) score += 0.5;

  const orderedMatches = trimmed.match(/^[ \t]*\d+\.\s+[^\s].*$/gm);
  if (orderedMatches && orderedMatches.length >= 2) score += 1.5;
  else if (orderedMatches && orderedMatches.length === 1) score += 0.5;

  if (/\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)/.test(trimmed)) score += 1.5;
  if (/^[ \t]*>\s+[^\s].*$/m.test(trimmed)) score += 1;
  if (/\|[^\n]+\|\r?\n\|[ \t]*:?[-]+:?[ \t]*\|/.test(trimmed)) score += 3;
  if (/`[^`\n]+`/.test(trimmed)) score += 0.5;

  return score >= 2.5;
}

// ─── Inline Markdown formatter ────────────────────────────────────────────────

/**
 * Applies inline Markdown spans (bold, italic, strikethrough, inline-code, links)
 * to an already-HTML-escaped line of text.
 *
 * Input MUST be HTML-escaped (via escapeHtml) before calling this function.
 */
function applyInlineMarkdown(escapedLine: string): string {
  const codes: string[] = [];
  let s = escapedLine.replace(/`([^`]+)`/g, (_m, inner) => {
    const idx = codes.length;
    codes.push(`<code class="av-inline-code">${inner}</code>`);
    return `\x00IC${idx}\x00`;
  });

  // Bold+Italic
  s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/___([^_\n]+)___/g, '<strong><em>$1</em></strong>');
  // Bold
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  // Italic
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>');
  // Strikethrough
  s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  // Markdown Links [title](url) - stash into placeholder tokens first to prevent double-matching
  const links: string[] = [];
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, title, url) => {
    const idx = links.length;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="av-rich-link" style="color:#2196F3;text-decoration:underline;cursor:pointer;" onclick="event.stopPropagation()">${title}</a>`);
    return `\x00MDLINK${idx}\x00`;
  });

  // Autolink angle-bracket URLs: <https://example.com> or <ftp://...>
  s = s.replace(/&lt;((?:https?|ftp):\/\/[^\s&>]+)&gt;/gi, (_m, url) => {
    const idx = links.length;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="av-rich-link" style="color:#2196F3;text-decoration:underline;cursor:pointer;" onclick="event.stopPropagation()">${url}</a>`);
    return `\x00MDLINK${idx}\x00`;
  });

  // Autolink bare URLs (http://, https://, and www.) that aren't inside markdown links or code
  s = s.replace(/(?:(https?:\/\/[^\s<>&"']+)|(?:\b(www\.[^\s<>&"']+)))/gi, (match, p1, p2) => {
    const fullUrl = p1 || `https://${p2}`;
    return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="av-rich-link" style="color:#2196F3;text-decoration:underline;cursor:pointer;" onclick="event.stopPropagation()">${match}</a>`;
  });

  // Restore markdown links
  for (let i = 0; i < links.length; i++) {
    s = s.split(`\x00MDLINK${i}\x00`).join(links[i]);
  }

  // Restore inline codes
  for (let i = 0; i < codes.length; i++) {
    s = s.split(`\x00IC${i}\x00`).join(codes[i]);
  }
  return s;
}

// ─── Block-state Markdown renderer ───────────────────────────────────────────

/**
 * Renders a Markdown string into valid, safe HTML using a line-by-line block parser.
 *
 * KEY DESIGN RULE: Block elements (headings, lists, code fences, blockquotes) are
 * NEVER wrapped inside <p>. Each block is emitted as its own top-level HTML element.
 *
 * This is the root-cause fix for the previous rendering corruption:
 *   - Old: regex paragraph-wrap produced <p><h1>...</h1></p> (invalid HTML)
 *   - Browser "auto-corrected" by splitting into two elements → visual duplication
 *   - The split also caused literal &lt;/code&gt; entities to appear in Preview
 *
 * @param markdownOrHtml  Raw content string (Markdown, plain text, or HTML).
 * @param isSnippet       If true, output is truncated to ≤3 blocks for compact tile cards.
 * @param highlightQuery  Optional search keyword to highlight with <mark class="av-search-match">.
 * @param activeMatchIndex Optional 0-based index of current match to highlight with current-match class.
 */
export function renderMarkdownToSafeHtml(markdownOrHtml: string, isSnippet: boolean = false, highlightQuery?: string, activeMatchIndex?: number): string {
  if (!markdownOrHtml) return '';

  const text = markdownOrHtml.trim();

  // ── Branch A: Already-HTML content ──────────────────────────────────────────
  // Guard requires the string to START WITH a tag to avoid classifying Markdown
  // that happens to contain angle-bracket generics/JSX as HTML.
  if (isHtmlContent(text) && !isStrictCodeMarkup(text)) {
    const sanitized = sanitizeHtmlSnippet(text);
    let result = sanitized;
    if (isSnippet) {
      result = sanitized.replace(/<p>\s*<\/p>/gi, '').replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>');
    }
    if (highlightQuery) {
      result = highlightSafeHtml(result, highlightQuery, activeMatchIndex);
    }
    return result;
  }

  // ── Branch B: Markdown / plain text — line-by-line block parser ─────────────
  const lines = text.split('\n');
  const out: string[] = [];

  type BlockState = 'none' | 'paragraph' | 'ul' | 'ol' | 'blockquote' | 'fence';
  let state: BlockState = 'none';
  let paraLines: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' = 'ul';
  let bqLines: string[] = [];
  let fenceLines: string[] = [];
  let fenceLang = '';

  const flushParagraph = () => {
    if (paraLines.length === 0) return;
    const content = paraLines.map(l => applyInlineMarkdown(escapeHtml(l))).join('<br/>');
    out.push(`<p class="av-rich-p">${content}</p>`);
    paraLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const tag = listType === 'ul' ? 'ul' : 'ol';
    const cls = listType === 'ul' ? 'av-bullet-list' : 'av-ordered-list';
    const itemCls = listType === 'ul' ? 'av-list-item' : 'av-ordered-item';
    const items = listItems
      .map(t => `<li class="${itemCls}">${applyInlineMarkdown(escapeHtml(t))}</li>`)
      .join('');
    out.push(`<${tag} class="${cls}">${items}</${tag}>`);
    listItems = [];
  };

  const flushBlockquote = () => {
    if (bqLines.length === 0) return;
    const content = bqLines.map(l => applyInlineMarkdown(escapeHtml(l))).join('<br/>');
    out.push(`<blockquote class="av-blockquote">${content}</blockquote>`);
    bqLines = [];
  };

  const flushFence = () => {
    const escapedCode = escapeHtml(fenceLines.join('\n'));
    out.push(`<pre class="av-code-block"><code class="lang-${fenceLang || 'text'}">${escapedCode}</code></pre>`);
    fenceLines = [];
    fenceLang = '';
  };

  const flushCurrent = () => {
    if (state === 'paragraph') flushParagraph();
    else if (state === 'ul' || state === 'ol') flushList();
    else if (state === 'blockquote') flushBlockquote();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    // ── Inside a fenced code block ───────────────────────────────────────────
    if (state === 'fence') {
      if (/^(`{3,}|~{3,})\s*$/.test(raw.trim())) {
        flushFence();
        state = 'none';
      } else {
        fenceLines.push(raw);
      }
      continue;
    }

    // ── Opening fence ────────────────────────────────────────────────────────
    const fenceMatch = raw.trim().match(/^(`{3,}|~{3,})([a-zA-Z0-9_-]*)\s*$/);
    if (fenceMatch) {
      flushCurrent();
      state = 'fence';
      fenceLang = fenceMatch[2] || '';
      fenceLines = [];
      continue;
    }

    // ── ATX Headings ─────────────────────────────────────────────────────────
    const headingMatch = raw.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushCurrent();
      state = 'none';
      const level = headingMatch[1].length;
      const content = applyInlineMarkdown(escapeHtml(headingMatch[2].trimEnd()));
      out.push(`<h${level} class="av-heading-${level}">${content}</h${level}>`);
      continue;
    }

    // ── Markdown Tables (e.g. | col 1 | col 2 |) ─────────────────────────────
    if (raw.trim().startsWith('|') && raw.trim().endsWith('|')) {
      const tableRows: string[] = [raw];
      let peekIdx = i + 1;
      while (peekIdx < lines.length && lines[peekIdx].trim().startsWith('|') && lines[peekIdx].trim().endsWith('|')) {
        tableRows.push(lines[peekIdx]);
        peekIdx++;
      }
      if (tableRows.length >= 2 && /^[ \t]*\|[ \t]*:?[-]+:?[ \t]*\|/.test(tableRows[1])) {
        flushCurrent();
        state = 'none';
        
        // Parse header
        const headerCells = tableRows[0].split('|').slice(1, -1).map(c => c.trim());
        const thHtml = headerCells.map(c => `<th>${applyInlineMarkdown(escapeHtml(c))}</th>`).join('');
        
        // Parse body rows
        const bodyHtml: string[] = [];
        for (let r = 2; r < tableRows.length; r++) {
          const cells = tableRows[r].split('|').slice(1, -1).map(c => c.trim());
          const tdHtml = cells.map(c => `<td>${applyInlineMarkdown(escapeHtml(c))}</td>`).join('');
          bodyHtml.push(`<tr>${tdHtml}</tr>`);
        }
        out.push(`<table class="av-table"><thead><tr>${thHtml}</tr></thead><tbody>${bodyHtml.join('')}</tbody></table>`);
        
        // Fast-forward outer loop index to after the table
        i = peekIdx - 1;
        continue;
      }
    }

    // ── Blockquote ───────────────────────────────────────────────────────────
    const bqMatch = raw.match(/^>\s?(.*)/);
    if (bqMatch) {
      if (state !== 'blockquote') {
        flushCurrent();
        state = 'blockquote';
        bqLines = [];
      }
      bqLines.push(bqMatch[1]);
      continue;
    }

    // ── Unordered list item ──────────────────────────────────────────────────
    const ulMatch = raw.match(/^[ \t]*[-*+]\s+(.+)/);
    if (ulMatch) {
      if (state !== 'ul') {
        flushCurrent();
        state = 'ul';
        listType = 'ul';
        listItems = [];
      }
      listItems.push(ulMatch[1]);
      continue;
    }

    // ── Ordered list item ────────────────────────────────────────────────────
    const olMatch = raw.match(/^[ \t]*\d+\.\s+(.+)/);
    if (olMatch) {
      if (state !== 'ol') {
        flushCurrent();
        state = 'ol';
        listType = 'ol';
        listItems = [];
      }
      listItems.push(olMatch[1]);
      continue;
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (/^[-*_]{3,}\s*$/.test(raw.trim())) {
      flushCurrent();
      state = 'none';
      out.push('<hr class="av-hr"/>');
      continue;
    }

    // ── Blank line → flush current block ────────────────────────────────────
    if (raw.trim() === '') {
      flushCurrent();
      state = 'none';
      continue;
    }

    // ── Regular paragraph text ───────────────────────────────────────────────
    if (state !== 'paragraph') {
      flushCurrent();
      state = 'paragraph';
      paraLines = [];
    }
    paraLines.push(raw);
  }

  // Flush any remaining open block at end of input
  if (state === 'fence') {
    flushFence(); // unclosed fence — render what we captured
  } else {
    flushCurrent();
  }

  const rendered = (isSnippet && out.length > 3) ? out.slice(0, 3).join('') : out.join('');
  if (highlightQuery) {
    return highlightSafeHtml(rendered, highlightQuery, activeMatchIndex);
  }
  return rendered;
}

/**
 * Safely wraps matched search text inside rendered HTML with <mark class="av-search-match">
 * and active match with <mark class="av-search-match current-match">, ignoring HTML tags.
 */
export function highlightSafeHtml(html: string, query?: string, activeMatchIndex?: number): string {
  if (!html || !query || !query.trim()) return html;
  const q = query.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = q.length <= 2
    ? new RegExp(`(\\b${escaped}\\b)`, 'gi')
    : new RegExp(`(${escaped})`, 'gi');

  // Split HTML into HTML tags and text content
  const tokens = html.split(/(<[^>]+>)/g);
  let globalMatchIndex = 0;
  const activeIdx = typeof activeMatchIndex === 'number' ? activeMatchIndex : -1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('<') && token.endsWith('>')) {
      // Don't touch HTML tags
      continue;
    }
    if (!token) continue;

    const parts = token.split(pattern);
    if (parts.length > 1) {
      tokens[i] = parts.map(part => {
        if (part.toLowerCase() === q.toLowerCase()) {
          const isCurrent = globalMatchIndex === activeIdx;
          globalMatchIndex++;
          const currentClass = isCurrent ? ' current-match' : '';
          return `<mark class="av-search-match${currentClass}">${part}</mark>`;
        }
        return part;
      }).join('');
    }
  }

  return tokens.join('');
}

/**
 * Renders plain text with all characters HTML-escaped and whitespace/newlines
 * preserved using a <pre> block. Autolinks URLs (including angle-bracket URLs).
 * Use for TXT, logs, configs, and plain notes.
 */
export function renderPlainTextToSafeHtml(text: string, highlightQuery?: string, activeMatchIndex?: number): string {
  if (!text) return '';
  let escaped = escapeHtml(text);

  // Autolink angle-bracket URLs: <https://example.com>
  const links: string[] = [];
  escaped = escaped.replace(/&lt;((?:https?|ftp):\/\/[^\s&>]+)&gt;/gi, (_m, url) => {
    const idx = links.length;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="av-rich-link" style="color:#2196F3;text-decoration:underline;cursor:pointer;" onclick="event.stopPropagation()">${url}</a>`);
    return `\x00MDLINK${idx}\x00`;
  });

  // Autolink bare URLs (http://, https://, and www.)
  escaped = escaped.replace(/(?:(https?:\/\/[^\s<>&"']+)|(?:\b(www\.[^\s<>&"']+)))/gi, (match, p1, p2) => {
    const fullUrl = p1 || `https://${p2}`;
    const idx = links.length;
    links.push(`<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="av-rich-link" style="color:#2196F3;text-decoration:underline;cursor:pointer;" onclick="event.stopPropagation()">${match}</a>`);
    return `\x00MDLINK${idx}\x00`;
  });

  // Restore autolinked URL tokens
  for (let i = 0; i < links.length; i++) {
    escaped = escaped.split(`\x00MDLINK${i}\x00`).join(links[i]);
  }

  const highlighted = highlightQuery ? highlightSafeHtml(escaped, highlightQuery, activeMatchIndex) : escaped;
  return `<pre class="av-plain-text-pre">${highlighted}</pre>`;
}

/**
 * Sanitizes rich HTML and returns it ready for [innerHTML] binding.
 * Removes only XSS vectors; preserves all structural and formatting tags.
 */
export function renderHtmlToSafeHtml(html: string, isSnippet: boolean = false, highlightQuery?: string, activeMatchIndex?: number): string {
  if (!html) return '';
  let sanitized = sanitizeHtmlSnippet(html);
  if (isSnippet) {
    sanitized = sanitized.replace(/<p>\s*<\/p>/gi, '').replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>');
  }
  if (highlightQuery) {
    sanitized = highlightSafeHtml(sanitized, highlightQuery, activeMatchIndex);
  }
  return sanitized;
}

// ─── XSS Sanitizer ───────────────────────────────────────────────────────────

/**
 * Strips XSS attack vectors from an HTML string while preserving ALL legitimate
 * rich content (headings, paragraphs, lists, tables, code, links, images, etc.).
 *
 * Removed: <script>, <iframe>, <object>, <embed>, on* event attributes, javascript: URLs.
 */
export function sanitizeHtmlSnippet(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']\s*javascript:[^"']*["']/gi, 'src=""');
}

/**
 * Heuristic: returns true if the string appears to be a programming code snippet.
 */
export function looksLikeCode(text: string): boolean {
  if (!text || text.length < 5) return false;

  // Strict markup / JSX / SVG
  if (isStrictCodeMarkup(text)) return true;

  // Common language declarations / keywords
  if (/^(import|export|const|let|var|function|class|def|public|private|protected|interface|type|struct|fn|package|func|enum|namespace)\s+/m.test(text)) return true;

  // Database SQL statements
  if (/SELECT\s+.*\s+FROM\s+/i.test(text) || /INSERT\s+INTO\s+/i.test(text) || /CREATE\s+TABLE\s+/i.test(text)) return true;

  // Line ending with braces/semicolons and contains function calls or assignments
  if (/[{};]\s*$/m.test(text) && (text.includes('(') || text.includes('='))) return true;

  // Arrow functions, scope resolution, pointers
  if (text.includes('=>') || text.includes('::') || text.includes('->')) return true;

  // Significant code-style indentation (>2 lines indented with 2+ spaces or tabs having punctuation)
  const lines = text.split('\n');
  if (lines.length >= 3) {
    const indentedLines = lines.filter(l => /^[ \t]{2,}\S/.test(l));
    if (indentedLines.length >= 2 && /[;(){}[\]=]/.test(text)) {
      return true;
    }
  }

  return false;
}

export type DetectedClipboardType = 'text' | 'html' | 'markdown' | 'code';

export interface ClipboardDetectionResult {
  type: DetectedClipboardType;
  content: string;
  renderedPreview: HTMLElement;
}

/**
 * Reusable clipboard paste handler:
 * 1. Checks clipboardData.types for text/html (-> 'html').
 * 2. If plain text, runs heuristic/regex check for Markdown syntax (-> 'markdown').
 * 3. If it looks like code (indentation, brackets, semicolons, keywords) (-> 'code').
 * 4. Otherwise -> 'text'.
 *
 * Renders appropriate preview element matching the detected structure.
 */
export function detectAndRenderClipboardContent(event: ClipboardEvent): ClipboardDetectionResult {
  const clipboardData = event.clipboardData;
  const types = clipboardData?.types ? Array.from(clipboardData.types) : [];

  let type: DetectedClipboardType = 'text';
  let content = '';

  const hasHtml = types.includes('text/html');
  const rawHtml = hasHtml ? clipboardData?.getData('text/html') || '' : '';
  const rawText = clipboardData?.getData('text/plain') || '';

  if (hasHtml && rawHtml.trim() && isHtmlContent(rawHtml) && !isStrictCodeMarkup(rawHtml)) {
    type = 'html';
    content = rawHtml;
  } else if (rawText) {
    content = rawText;
    if (looksLikeMarkdown(rawText)) {
      type = 'markdown';
    } else if (looksLikeCode(rawText)) {
      type = 'code';
    } else {
      type = 'text';
    }
  }

  // Create DOM preview container
  const container = document.createElement('div');
  container.className = 'av-clipboard-preview-root';

  switch (type) {
    case 'html': {
      container.className += ' av-rich-document-preview';
      container.innerHTML = renderHtmlToSafeHtml(content, false);
      break;
    }
    case 'markdown': {
      container.className += ' av-rich-document-preview';
      container.innerHTML = renderMarkdownToSafeHtml(content, false);
      break;
    }
    case 'code': {
      container.className += ' av-code-preview';
      const pre = document.createElement('pre');
      pre.className = 'av-code-block';
      const code = document.createElement('code');
      code.textContent = content; // Kept verbatim, no parsing
      pre.appendChild(code);
      container.appendChild(pre);
      break;
    }
    case 'text':
    default: {
      container.className += ' av-plain-text-preview';
      container.textContent = content; // Insert as-is plain text
      break;
    }
  }

  return {
    type,
    content,
    renderedPreview: container
  };
}

/**
 * Converts Markdown or Rich HTML text to clean, readable plain text
 * matching what the user visually sees in the rendered preview.
 * Strips formatting markup (#, **, *, ~~, backticks, link URLs, HTML tags)
 * while preserving paragraph breaks, list structure, and code content.
 */
export function stripMarkdownToPlainText(text: string): string {
  if (!text) return '';
  let str = text;

  // 1. If HTML content, strip HTML tags cleanly while preserving linebreaks
  if (isHtmlContent(str) && !isStrictCodeMarkup(str)) {
    str = str
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '');
  }

  // 2. Fenced Code Blocks: preserve the code inside, remove the ``` fences
  str = str.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```/g, '$1');
  str = str.replace(/```([\s\S]*?)```/g, '$1');

  // 3. Headings: remove leading #, ##, ### etc.
  str = str.replace(/^#{1,6}\s+(.*)$/gm, '$1');

  // 4. Blockquotes: remove leading >
  str = str.replace(/^[ \t]*>[ \t]?(.*)$/gm, '$1');

  // 5. Bold & Italic & Strikethrough formatting markers
  str = str.replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1');
  str = str.replace(/___([^_\n]+)___/g, '$1');
  str = str.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  str = str.replace(/__([^_\n]+)__/g, '$1');
  str = str.replace(/\*([^*\n]+)\*/g, '$1');
  str = str.replace(/_([^_\n]+)_/g, '$1');
  str = str.replace(/~~([^~\n]+)~~/g, '$1');

  // 6. Inline code backticks
  str = str.replace(/`([^`\n]+)`/g, '$1');

  // 7. Markdown links: [Title](http://...) -> Title
  str = str.replace(/\[([^\]\n]+)\]\(https?:\/\/[^\s)]+\)/g, '$1');

  // 8. Markdown images: ![Alt](http://...) -> Alt
  str = str.replace(/!\[([^\]\n]*)\]\(https?:\/\/[^\s)]+\)/g, '$1');

  // 9. Horizontal rules
  str = str.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');

  // 10. Normalize multiple blank lines
  str = str.replace(/\n{3,}/g, '\n\n');

  return str.trim();
}

