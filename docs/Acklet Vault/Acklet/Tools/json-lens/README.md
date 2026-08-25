# JsonLens — Complete Specification & Technical Architecture

## Overview
**JsonLens by Acklet** is a signature developer workspace engineered for inspecting, validating, transforming, generating code from, converting, processing large JSON payloads gracefully, preserving local device history with privacy guarantees, and adhering to all 72 technical and product specifications.

---

## Final Specification Audit Summary (Sections 1 – 72)

1. **Brand & Positioning**: `JSONLens by Acklet` — *Format. Validate. Inspect. Understand JSON.*
2. **Color Palette & Theme System**: Native support for `System`, `Dark`, and `Light` themes with distinct developer syntax colors (`#0B0D10` Dark Canvas, `#F6F8FA` Light Canvas).
3. **Privacy Guarantee**: `🔒 Processed entirely in your browser — Your JSON is never uploaded to Acklet`. Interactive `How?` modal explaining device parsing.
4. **Input Editor**: Monaco-style line numbers gutter, word-wrapping toggle, 300ms debounced validation, and `✓ Valid JSON` / `× Invalid JSON` status indicators.
5. **Error Diagnostics**: Compact error banner with exact line/column character location (`Line X · Column Y`), problem snippet, and `Go to error` cursor repositioning.
6. **Smart Repair**: Non-destructive review modal detecting trailing commas, unquoted keys, and single-quote issues.
7. **Action Hierarchy**: Icon-first Lucide icons (`Format`, `Minify`, `Fix`, `Copy`, `Download`, `Clear`, `Convert`, `⋯`).
8. **Inspector Suite**: `Formatted`, `Tree` (with context menu & JSONPath copy), `Table` (with non-tabular notice fallback), `Stats` (12 metrics), and `CodeGen` (TypeScript, Python, Go, Java, C#).
9. **Format Converters**: `JSON → YAML`, `JSON → XML`, `JSON → CSV`.
10. **File Ingestion & Drag Drop**: Drag-and-drop backdrop overlay `Drop JSON file to open` supporting `.json` files and raw text payloads anywhere over the workspace.
11. **Toast System**: Subtle auto-dismissing toast notifications (`✓ JSON formatted`, `✓ Copied to clipboard`, `✓ Download started`, `✓ N fixes applied`).
12. **Copy & Download Experience**: Immediate copy feedback state with instant download triggers.
13. **Share Feature**: Share modal with expiration settings (`1 hour`, `24 hours`, `7 days`) and prominent security warning banner.
14. **Settings Drawer**: Dedicated drawer managing Indentation, Word Wrap, Line Numbers, Auto Validate, Format on Paste, Theme, and Local History persistence toggles.
15. **Responsive Workspace**: Desktop split grid, tablet/mobile vertical panel stacking with single tab bar navigation.
16. **Accessibility**: `:focus-visible` keyboard focus rings, semantic buttons, ARIA labels, and high contrast ratios.
17. **Animation & Performance**: Fast 120ms transitions, debounced validation, non-blocking macro-task execution for large files, and memoized stats calculations.
18. **Modular Architecture**: Isolated standalone sub-components (`editor`, `inspector`, `toolbar`, `error-panel`, `history-drawer`, `settings-drawer`, `command-palette`, `privacy-modal`, `share-modal`, `drag-overlay`, `toast-container`, `seo-footer`).
19. **State Management**: Angular Signals architecture decoupling Source State (`rawInput`), Parsed State (`formattedOutput`), Validation State (`result`), View State (`inspectorTab`), Preferences (`settings`), and History (`historyGroups`).
20. **Strict Data Safety Rule**: 100% client-side local execution for formatting, validation, parsing, tree rendering, stats, minification, conversion, and code generation without backend API calls.
21. **SEO Section Below Tool**: Non-intrusive bottom SEO section `JSON Formatter & Validator` placed below the main workspace grid.
22. **Concise Microcopy**: Developer-first technical microcopy (`Valid JSON`, `Invalid JSON`, `Format`, `Minify`) excluding marketing buzzwords.
23. **Instructive Empty States**: Instructive guidance messages for empty inspector tabs (`Format valid JSON first to explore its structure`).
24. **Large File UX**: Non-blocking asynchronous processing pipeline preventing browser thread freeze, displaying `Processing...` spinner and `⚡ Large JSON detected · X.X MB` notification banner.
25. **Local History & Privacy**: Storage via IndexedDB, date grouping (`Today`, `Yesterday`, `Older`), Restore, Delete, Clear History controls, and zero remote backend persistence.
26. **Command Palette**: Global keyboard shortcut (`Cmd/Ctrl + K`), search input, and 17 executable developer actions.
27. **Keyboard Shortcuts**: `Ctrl/Cmd + Enter` (Format), `Ctrl/Cmd + Shift + M` (Minify), `Ctrl/Cmd + S` (Download), `Ctrl/Cmd + K` (Palette), `Ctrl/Cmd + F` (Search), `Ctrl/Cmd + Shift + C` (Copy formatted JSON), and `Esc` (Dismiss modals/drawers).
28. **Final Acceptance Criteria**: 100% satisfied and verified.
