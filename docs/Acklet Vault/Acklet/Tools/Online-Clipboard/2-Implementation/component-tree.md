---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Component Architecture & Component Tree

## 1. ASCII Component Tree

```text
AppComponent (apps/tool-online-clipboard/src/app/app.component.ts)
└── ts-shell (packages/tool-shell: Shell layout, theme provider, topbar)
    │
    └── ClipboardComponent (src/clipboard.component.ts) [standalone: true, OnPush]
        │
        ├── Top Strip
        │   ├── Room Code Badge (Inline rename input & state toggle)
        │   ├── Copy Link Action Button
        │   ├── QR Pairing Modal Trigger Button
        │   ├── Join Room Input & Submit Action Button
        │   ├── Live Sync Indicator Pill (SSE / BroadcastChannel state)
        │   └── Settings & History Drawer Action Triggers
        │
        ├── Segmented Pill Tab Bar
        │   ├── Tab Pill: Text & Links (Icon + Label)
        │   └── Tab Pill: Files & Images (Icon + Label + Dynamic Count Badge)
        │
        ├── Active Tab: Text & Links Canvas
        │   ├── WYSIWYG Editing Canvas (Interactive auto-detected bold links)
        │   ├── Viewport-Bounded Floating Formatting Popover (Selection-preserved)
        │   ├── Adaptive Bottom Action Bar
        │   │   ├── Desktop Cluster: [Copy] [Save] [Wrap] [Refresh] [Revisions] [Clear]
        │   │   ├── Mobile Cluster: Row 1 ([Copy 50%] [Save 50%]) + Row 2 (Icons)
        │   │   └── Status Caption Indicator (*"Saved just now"*, *"Unsaved changes"*)
        │   ├── Conflict Resolution Banner (Optimistic locking HTTP 409 recovery)
        │   └── Local Draft Recovery Banner (Interrupted session recovery)
        │
        ├── Active Tab: Files & Images Hub
        │   ├── Sticky Library Header (Pinned with ambient top feather fade overlay)
        │   │   ├── Desktop Row (>=640px): Category Chips, Search Pill, Filter, Sort, Grid/List, +Add
        │   │   └── Mobile 2-Line (<640px): Line 1 (Search + Add) / Line 2 (Chips + 3-Dots Menu)
        │   ├── In-Flight Upload Progress Cards (Live percent, progress bar, cancel button)
        │   ├── Full-Window Drag-and-Drop Overlay Target
        │   ├── File Presentation Views
        │   │   ├── Grid View: Thumbnail cards with selection elevation rings
        │   │   └── List View: Compact metadata rows with selection elevation rings
        │   └── Empty State & No-Match State Panels
        │
        ├── Modals & Drawers (Overlays)
        │   ├── QR Code Pairing Modal (qrLoader SVG/canvas)
        │   ├── Full-Screen Image Lightbox (Zoom & metadata preview)
        │   ├── Text Revisions Drawer (Past snapshots, line/char counts, restore button)
        │   ├── Room Settings Drawer (PIN, retention duration: 7/15/30 days, E2EE toggle)
        │   ├── Room History Drawer (Recent rooms list with granular delete)
        │   └── Floating Action Toast (Undo clear/delete, confirmations, error retry)
        │
        └── Below-Tool Documentation Sections (Smooth scroll targets)
            ├── About Section (ts-about-card)
            ├── How It Works Section (Step-by-step pairing guide)
            └── FAQ Section (ts-faq accordion)
```

---

## 2. Component Data Flow & State Management

```text
[ User Action / Keystroke ]
             │
             ▼
   [ ClipboardComponent ]
   • sharedText.set(newContent)
   • isDirty.set(true)
   • localStorage.setItem('acklet_clipboard_draft_' + code, newContent)
             │
             ├── [ Manual Save Button / Cmd+S ]
             │         │
             │         ▼
             │   [ ClipboardApiService.addTextItem(code, text, expectedVersion) ]
             │         │
             │         ├── (HTTP 200) ──► version++, isDirty = false, draft cleared
             │         │                  Notify BroadcastChannel + SSE
             │         │
             │         └── (HTTP 409) ──► conflictBannerVisible.set(true)
             │                            Prompt: Keep Mine | Accept Incoming | Compare
             │
             └── [ Window Unload / Sudden Exit ]
                       │
                       ▼
                 [ ClipboardApiService.saveTextOnSuddenExit() ]
                 • fetch(url, { keepalive: true, body: JSON.stringify(...) })
```

---

## 3. Signal Graph

| Signal | Type | Purpose |
| :--- | :--- | :--- |
| `activeTab` | `WritableSignal<MainTab>` | Active primary view: `'text'` vs `'files'`. |
| `shareCode` | `WritableSignal<string \| null>` | Active 5-digit room code. |
| `activeShare` | `WritableSignal<ClipboardShare \| null>` | Full server-synchronized room state. |
| `sharedText` | `WritableSignal<string>` | Active text buffer in the editor canvas. |
| `isDirty` | `WritableSignal<boolean>` | True when editor text diverges from server state. |
| `isSaving` | `WritableSignal<boolean>` | True when save HTTP request is in-flight. |
| `uploadingFiles` | `WritableSignal<UploadingFileState[]>` | List of active in-flight multi-file upload progress states. |
| `selectedItemIds` | `WritableSignal<Set<string>>` | Set of selected file item IDs for batch operations. |
| `fileSubFilter` | `WritableSignal<FileSubFilter>` | Active category filter: `'all'`, `'images'`, `'files'`. |
| `viewMode` | `WritableSignal<ViewMode>` | Active presentation mode: `'grid'` vs `'list'`. |
| `sortOption` | `WritableSignal<SortOption>` | Active sorting: `'newest'`, `'oldest'`, `'name'`, `'largest'`. |
| `isFilesScrolled`| `WritableSignal<boolean>` | Controls activation of ambient top feather fade overlay. |
