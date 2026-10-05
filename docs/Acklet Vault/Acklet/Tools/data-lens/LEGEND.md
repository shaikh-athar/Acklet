# DataLens — Visual Semantics & UI Action Legend

## 1. Action Types & Visual Semantics

| Action Category | Visual Style | Example Operations | Icon Requirement | Tooltip Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Action** | Filled Acklet Teal (`#2FA084`), white text, elevated | Format Payload, Apply Smart Repair | Icon + Label (`check`, `wand-2`) | Optional hover title |
| **Secondary Action** | Neutral surface (`--jl-surface-secondary`), subtle border | Minify, Diff, Convert | Icon + Label (`minimize-2`, `git-pull-request`) | Optional hover title |
| **Utility Action (Icon-Only)** | Transparent ghost, hover background & border | Copy, Download, Clear, History, Share | Icon-only (`copy`, `download`, `trash-2`) | **Mandatory Tooltip** (`Copy Output`, `Download`) |
| **Destructive Action** | Muted red surface / text | Clear All History, Reset Payload | Icon + Label (`trash-2`) | Confirmation or explicit label |
| **Contextual Toggle** | Segmented pill button, active mint highlight (`#6FCF97`) | Sort Keys, Word Wrap, Stringify | Icon or Text | State badge indicator |

---

## 2. Status & Validation Badges

| Indicator State | Visual Representation | Semantic Meaning |
| :--- | :--- | :--- |
| **✓ Valid Payload** | Mint badge (`#6FCF97` background/text tint), checkmark | Payload parsed cleanly without syntax errors |
| **× Invalid Payload** | Red badge (`#DC2626` / `#F85149` tint), crossmark | Syntax error detected; details in error diagnostic panel |
| **🔒 In-Browser Processed** | Pulsing emerald badge + lock icon | 100% local client-side processing guarantee |
| **⚡ Large Payload** | Amber pill badge (`#D97706` / `#D29922`) | Large file parsed asynchronously via macro-tasks |
| **⚠ Duplicate Key** | Amber warning banner with alert icon | Duplicate key found in object |
| **⚠ Lossy Conversion** | Orange notice banner | Flattened conversion to tabular format (e.g. JSON → CSV) |

---

## 3. AST Semantic Type Color Vocabulary

| Type Category | Light Theme Color | Dark Theme Color | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Object Key** | `#0969DA` (Royal Blue) | `#79C0FF` (Sky Blue) | Structural object / map key identifier |
| **String Value** | `#1A7F37` (Forest Green) | `#7EE787` (Mint Green) | Text / string scalar value |
| **Number Value** | `#CF222E` (Crimson Red) | `#FFA657` (Coral Orange) | Numeric integer / float value |
| **Boolean Value** | `#8250DF` (Purple) | `#D2A8FF` (Lavender Purple) | True / False boolean literal |
| **Null Value** | `#6E7781` (Muted Gray, Italic) | `#8B949E` (Muted Gray, Italic) | Empty / null reference |

---

## 4. Keyboard Shortcuts Quick Reference

- `Cmd/Ctrl + Enter`: Format active payload
- `Cmd/Ctrl + Shift + M`: Minify active payload
- `Cmd/Ctrl + K`: Open Command Palette
- `Cmd/Ctrl + F`: Focus live search in Inspector
- `Cmd/Ctrl + S`: Trigger instant download
- `Cmd/Ctrl + Shift + C`: Copy formatted output
- `Esc`: Dismiss active drawer, popover, or modal

---

## 5. Related Documentation

- Master Overview: [README.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/README.md)
- Feature Audit Matrix: [feature.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/feature.md)
- Complete Product Specification: [description.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/description.md)
- Multi-Format Workbench Guide: [multi-format.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/multi-format.md)
- Canonical UI Reference: [UI_REFERENCE.md](file:///Users/ayaz/Acklet/docs/Acklet%20Vault/Acklet/Tools/data-lens/UI_REFERENCE.md)
- Platform Tools Catalog: [Tools Hub](../README.md)
