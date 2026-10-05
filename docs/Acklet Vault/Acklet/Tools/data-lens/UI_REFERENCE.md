# DataLens — Canonical UI Reference & Design System Guidelines

## 1. Design Philosophy & Aesthetic Principles

**DataLens by Acklet** adheres to a high-density, professional developer IDE aesthetic (inspired by Linear, Vercel, and VS Code) prioritizing information clarity, speed, and contrast.

### Core UI Rules
1. **Platform Identity, Tool Individuality**: Acklet provides the global shell, navigation, and theme infrastructure. DataLens owns its signature high-density layout, split-pane grid, and multi-format inspector.
2. **Dual-Theme High Contrast**: 100% legibility in both Light (`data-theme="light"`) and Dark (`data-theme="dark"`) modes. Hardcoded color literals that fade or disappear are strictly prohibited.
3. **Restrained Visual Polish**: Avoid excessive gradients or distracting decorative animations. Use purposeful micro-interactions with snappy 120ms transitions.

---

## 2. Scoped Design Tokens & Color Palettes

### 2.1 CSS Custom Properties Mapping
```css
:root, [data-theme="dark"] {
  --jl-bg-dark: #0B0D10;
  --jl-surface-primary: #111419;
  --jl-surface-secondary: #171B21;
  --jl-border-dark: #252B33;
  --jl-text-main: #E8EAED;
  --jl-text-secondary: #8B949E;
  --jl-accent: #2FA084;
  --jl-accent-hover: #1F6F5F;
  --jl-accent-light: #6FCF97;
  --jl-success: #6FCF97;
  --jl-error: #F85149;
  --jl-warning: #D29922;
  --jl-info: #58A6FF;
}

[data-theme="light"] {
  --jl-bg-dark: #EEEEEE;
  --jl-surface-primary: #FFFFFF;
  --jl-surface-secondary: #F3F4F6;
  --jl-border-dark: #D1D5DB;
  --jl-text-main: #1F2937;
  --jl-text-secondary: #4B5563;
  --jl-accent: #2FA084;
  --jl-accent-hover: #1F6F5F;
  --jl-accent-light: #6FCF97;
  --jl-success: #1F6F5F;
  --jl-error: #DC2626;
  --jl-warning: #D97706;
  --jl-info: #0969DA;
}
```

---

## 3. Typography & Monospace Stacks

- **Editor & Code Output**: `'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Consolas, monospace`
- **UI Interface & Headers**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Font Sizes**: Dynamically configurable from `11px` (Compact) to `18px` (Huge) via settings and toolbar.

---

## 4. 3-Level Workspace Toolbar Hierarchy

1. **Level 1 — Global Platform Bar**: Breadcrumb (`Acklet / DataLens`), Theme Switcher, History Trigger, Share Modal, and Settings Drawer.
2. **Level 2 — Document & Transformation Bar**: Format selector, Indentation dropdown (1-4 sp / Tabs), Sort Keys, Minify, Escape/Unescape, Word Wrap, Clear, and Import.
3. **Level 3 — Contextual Inspector Sub-Bar**: View mode switcher (`Code`, `Tree`, `Table`, `Graph`, `Stats`, `CodeGen`), tree node expand/collapse triggers, search filtering, and context export menus (CSV, HTML, SVG, PNG).

---

## 5. Responsive Grid & Breakpoints

- **Desktop (`>= 1024px`)**: Side-by-side split grid with synchronized scroll capabilities.
- **Tablet (`768px – 1023px`)**: Vertical panel stacking with sticky control bars.
- **Mobile (`< 768px`)**: Simplified sequential tab flow (`Input Editor → Inspector`) with collapsible action drawers.

---

## 6. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/README.md)
- Feature Audit Matrix: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/feature.md)
- Complete Product Specification: [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/description.md)
- Multi-Format Workbench Guide: [multi-format.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/multi-format.md)
- Visual Semantics & Action Legend: [LEGEND.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/LEGEND.md)
- Platform Tools Catalog: [Tools Hub](../README.md)
