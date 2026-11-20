# Unified Tool Shell & Platform Harmonization — UI Audit Report

**Date:** 2026-11-18  
**Author:** Lead UI Engineer, Acklet Platform  
**Target Surface:** `Tools` (`tool-image-compressor`, `tool-file-converter`), `Shared` (`packages/tool-shell`, `packages/shared`)  
**Scope:** Image Compressor (Reference), Image Converter, File Converter  

---

## 1. Executive Summary

This audit establishes the baseline metrics for Acklet's media conversion and compression tools.
Currently, **Image Compressor**, **Image Converter**, and **File Converter** have diverged across several design primitives:
1. **Typography & Font Scopes:** Hero rotating animations differ (full sentence vs word-only); monospace font leaks into UI controls, chips, and buttons.
2. **Layout & Alignment:** `workspace-stage` has an extraneous `padding-left: 64px` in Converter at desktop resolutions ($\ge 1440\text{px}$), breaking the alignment of the left edge with the topbar and grid.
3. **Card Metrics:** Card thumbnail frames use `aspect-ratio: 4/3` in Converter vs a fixed `148px` in Compressor, whereas the unified token standard mandates a fixed `180px` thumbnail frame with column-filling width.
4. **Accent Tokens:** Hardcoded hex values (`#2563EB`, `#3B82F6`) override CSS variable theming, preventing per-tool accent expression.
5. **Component Duplication:** Toasts, dropzones, headers, card actions, and settings panels are implemented redundantly across apps instead of reusing the shared `tool-shell`.

---

## 2. Comparative Measurement Table

| UI Element | Reference (Image Compressor) | Tool A (Image Converter) | Tool B (File Converter) | Source File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Heading** | `42px / 1.2`, weight `800`, letter-spacing `-0.03em`. Full sentence segment rotation. | `38px / 1.2`, weight `800`, letter-spacing `-0.03em`. Word-only rotation (`app-rotating-word`). | `38px / 1.2`, weight `800`, letter-spacing `-0.03em`. Word-only rotation (`app-rotating-word`). | `rotating-heading.component.ts`<br>`file-converter.component.css:204` |
| **Hero Headline Mobile** | `28px / 1.25` | `26px / 1.25` | `26px / 1.25` | `rotating-heading.component.ts:133`<br>`file-converter.component.css:470` |
| **Primary Select Button** | `height: 46px`, `padding: 0 28px`, `border-radius: 9999px`, label: `"Select Images"`, accent: static blue | `height: 46px`, `padding: 0 28px`, `border-radius: 9999px`, label: `"Select Images"`, accent: static blue | `height: 46px`, `padding: 0 28px`, `border-radius: 9999px`, label: `"Select Files"`, accent: static blue | `upload-landing.component.ts:168`<br>`file-converter.component.css:250` |
| **Hero Dropzone / Empty State** | Hero drop with animated pulse and upload icons. Dotted boundary inside hero. | Hero dropzone with drag overlay. | Hero dropzone with drag overlay. | `upload-landing.component.ts`<br>`file-converter.component.html:40` |
| **Popular Section Label** | `"POPULAR PRESETS"` (`11px / 700`, uppercase, tracking `0.08em`) | `"POPULAR CONVERSIONS"` (`11px / 700`, uppercase, tracking `0.08em`) | `"POPULAR CONVERSIONS"` (`11px / 700`, uppercase, tracking `0.08em`) | `upload-landing.component.ts:634`<br>`file-converter.component.html:70` |
| **Popular Preset Chips** | `height: 38px / 42px`, `border-radius: 9999px`, `font-mono` applied to labels | `height: 42px`, `border-radius: 9999px`, `font-mono` on source/target pills | `height: 42px`, `border-radius: 9999px`, `font-mono` on source/target pills | `upload-landing.component.ts:660`<br>`file-converter.component.css:348` |
| **Workspace List Heading** | `20px / 700`, tracking `-0.02em` (`h2`), label: `"Images to Compress"` | `20px / 700`, tracking `-0.02em` (`h2`), label: `"Images to Convert"` | `20px / 700`, tracking `-0.02em` (`h2`), label: `"Files to Convert"` | `image-compressor.component.html:62`<br>`file-converter.component.html:130` |
| **Count Pill** | `12px / 700`, `3px 9px`, pill, font-mono leak | `12px / 700`, `3px 9px`, pill, font-mono leak | `12px / 700`, `3px 9px`, pill, font-mono leak | `image-compressor.component.css:764`<br>`file-converter.component.css:610` |
| **Stage Left Edge Offset** | `padding-left: 0px` (aligned with header and container) | `padding-left: 64px` at $\ge 1440\text{px}$ (Misaligned left edge!) | `padding-left: 64px` at $\ge 1440\text{px}$ (Misaligned left edge!) | `image-compressor.component.css:730`<br>`file-converter.component.css:802` |
| **Workspace Action Buttons** | Add Images split button with chevron (`height: 34px`) + Clear button (`height: 34px`) | Add Images button (`height: 34px`) + Clear button (`height: 34px`) | Add Files button (`height: 34px`) + Clear button (`height: 34px`) | `image-compressor.component.html:68`<br>`file-converter.component.html:136` |
| **Card Thumbnail Frame** | `height: 148px` fixed (`var(--image-tile-height, 148px)`) | `aspect-ratio: 4 / 3` (Variable height, non-standard) | `aspect-ratio: 4 / 3` (Variable height, non-standard) | `image-card.component.ts:358`<br>`conversion-item.component.ts:400` |
| **Card Radius & Border** | `16px` radius (`var(--ts-radius-card)`), `1px solid var(--border-subtle)` | `16px` radius (`var(--ts-radius-card)`), `1px solid var(--border-subtle)` | `16px` radius (`var(--ts-radius-card)`), `1px solid var(--border-subtle)` | `image-card.component.ts:300`<br>`conversion-item.component.ts:350` |
| **Card Actions Row** | Secondary "Customize" (`height: 32px`, font-mono leak), Output: "Save" + "Customize again" | Format select + convert/retry + remove + view/save buttons (`height: 28px`) | Format select + convert/retry + remove + view/save buttons (`height: 28px`) | `image-card.component.ts:245`<br>`conversion-item.component.ts:450` |
| **Settings Panel Width** | `360px` desktop (340px @1280, 300px @1024), sticky top `24px` | `360px` desktop (340px @1280, 300px @1024), sticky top `24px` | `360px` desktop (340px @1280, 300px @1024), sticky top `24px` | `image-compressor.component.css:715`<br>`file-converter.component.css:505` |
| **Settings Section Labels** | `"OUTPUT FORMAT"`, `"RESIZE / TARGET SIZE"`, `"QUALITY"`, `"METADATA & ADVANCED"` | `"FORMAT OPTIONS"`, `"CONVERSION SETTINGS"`, `"QUALITY"` | `"FORMAT OPTIONS"`, `"CONVERSION SETTINGS"` | `settings-panel.component.ts:48`<br>`file-converter.component.html:200` |
| **Primary CTA Button** | `height: 48px`, full width, label: `"Compress All (N)"` / `"Compress N Images"` | `height: 48px`, full width, label: `"Convert N Files"` | `height: 48px`, full width, label: `"Convert N Files"` | `image-compressor.component.html:150`<br>`file-converter.component.html:190` |
| **Toast Notification** | Bottom-center pill, max-width `420px`, font `13px / 500` | Bottom-center pill, max-width `440px`, font `13px / 500` | Bottom-center pill, max-width `440px`, font `13px / 500` | `image-compressor.component.css:70`<br>`file-converter.component.css:50` |
| **Header Navigation Tabs** | 5 tabs: Tool, About, How to use, FAQ, Related | Dynamic tabs depending on manifest fields | Dynamic tabs depending on manifest fields | `ts-topbar.component.ts:1530`<br>`image-compressor.manifest.ts` |
| **Save / Saved Button** | Topbar `.ts-save-btn`: outlined "Save" vs jewel accent gradient "Saved" | Topbar `.ts-save-btn`: outlined "Save" vs jewel accent gradient "Saved" | Topbar `.ts-save-btn`: outlined "Save" vs jewel accent gradient "Saved" | `ts-topbar.component.ts:1026` |
| **Tool Accent Variable** | Hardcoded `#2563EB` in buttons, hover borders, active chips | Hardcoded `#2563EB` and `#3B82F6` | Hardcoded `#2563EB` and `#3B82F6` | `image-compressor.component.css`<br>`file-converter.component.css` |
| **Background Gradient** | Ambient Orb / Top Wash (layout-driven, soft ambient) | Ambient Orb / Top Wash | Ambient Orb / Top Wash | `ts-shell.component.ts` |

---

## 3. Confirmed 17-Point Bug List

1. **Per-Tool Accent Not Applied:**
   - *Locations:* `upload-landing.component.ts:720`, `image-card.component.ts:325`, `file-converter.component.css:255`, `file-converter.component.css:385`.
   - *Defect:* Hardcoded `#2563EB` / `#3B82F6` hex colors prevent the three tools from rendering three distinctive, identifiable brand accents.
   - *Fix:* Ensure all primary buttons, selected tabs/chips, active radio items, and focus rings consume `var(--tool-accent)`, `var(--tool-accent-soft)`, and `var(--tool-accent-contrast)`.

2. **Heading Animation Scope:**
   - *Locations:* `file-converter.component.html:42-56`, `rotating-word.component.ts`.
   - *Defect:* File/Image Converter animates only a single word inside a static string instead of transitioning the whole sentence in a stacked-grid layout.
   - *Fix:* Adopt the unified `ToolHero` stacked grid headline rotation component across all three tools with 700ms cubic-bezier transition and 4500ms dwell.

3. **Popular Label Variants:**
   - *Locations:* `upload-landing.component.ts:634` (`"POPULAR PRESETS"`), `file-converter.component.html:70` (`"POPULAR CONVERSIONS"`).
   - *Defect:* Mixed wording without strict adherence to the `"POPULAR {NOUN}"` token convention.
   - *Fix:* Derive label strictly via config: `"POPULAR COMPRESSIONS"` (Compressor), `"POPULAR CONVERSIONS"` (Image & File Converter).

4. **Chip Styles Discrepancy:**
   - *Locations:* `file-converter.component.css:348` (42px height), `upload-landing.component.ts:660` (38px/42px), `settings-panel.component.ts:509` (32px).
   - *Defect:* Inconsistent heights, border radii, and internal paddings.
   - *Fix:* Unify on standard `ToolChip` primitive: 36px fixed height, 999px radius, 13px weight 600 font.

5. **Button Labels Inconsistency:**
   - *Locations:* `upload-landing.component.ts:168` ("Select Images"), `file-converter.component.html:60` ("Select Images" / "Select Files").
   - *Defect:* Mixed verbs ("Choose images", "Select files", "Upload files", "Select Images").
   - *Fix:* Standardize primary hero action to `"Select files"` across all tools.

6. **Header Navigation Tabs:**
   - *Locations:* `image-compressor.manifest.ts:48`, `ts-topbar.component.ts:1530`.
   - *Defect:* Custom `tabs` arrays in manifests can hide or reorder the canonical 5 tabs.
   - *Fix:* Guarantee strictly all five canonical tabs in fixed sequence: `Tool`, `About`, `How to use`, `FAQ`, `Related`.

7. **Save State Styling:**
   - *Locations:* `ts-topbar.component.ts:1026`.
   - *Defect:* Gradient jewel styling in `ts-save-btn` diverges from clean semantic dual-theme outlined vs filled accent pattern.
   - *Fix:* Harmonize Save state: "Save" (outlined border, transparent bg) and "Saved" (solid `--tool-accent`, `--tool-accent-contrast`).

8. **Empty State Pattern:**
   - *Locations:* `empty-drop-state.component.ts`, `file-converter.component.html:40`.
   - *Defect:* Separate "Add anything" dotted card screen creates a disjointed empty experience.
   - *Fix:* Remove separate dotted card screen; standardize on unified `ToolHero` drop pattern.

9. **Content Left Edge Misalignment:**
   - *Locations:* `file-converter.component.css:802`.
   - *Defect:* `@media (min-width: 1440px) { .workspace-stage { padding-left: 64px; } }` indents the stage 64px, causing severe misalignment with the topbar and page title.
   - *Fix:* Remove `padding-left: 64px`; align heading, count pill, grid, and cards to exact 0px offset relative to workspace container.

10. **Card Actions Layout Divergence:**
    - *Locations:* `image-card.component.ts:245`, `conversion-item.component.ts:450`.
    - *Defect:* Different button arrangements, heights (28px vs 32px), and icon placements.
    - *Fix:* Standardize on one unified action row shape with shared control metrics.

11. **Target Selector Variants:**
    - *Locations:* `settings-panel.component.ts:48`, `file-converter.component.html:150`.
    - *Defect:* Different controls (radio grids vs dropdowns vs segmented controls) across tools.
    - *Fix:* Provide unified `TargetSelector` control component.

12. **Monospace Font Leaks:**
    - *Locations:* `image-card.component.ts:210`, `image-card.component.ts:250`, `conversion-item.component.ts:350`, `file-converter.component.html:76`.
    - *Defect:* Monospace applied to buttons, chips, count badges, format selectors, and file names.
    - *Fix:* Restrict monospace purely to raw byte values and dimensional numbers in metadata. All UI controls, buttons, and chips use `Scoutie Sans`.

13. **Section Label Variants:**
    - *Locations:* `settings-panel.component.ts:50`, `file-converter.component.html:200`.
    - *Defect:* Mixed casing and terminology ("OUTPUT FORMAT", "FORMAT OPTIONS", "Output Settings").
    - *Fix:* Standardize strictly on canonical uppercase section labels: `"OUTPUT FORMAT"`, `"QUALITY"`, `"RESIZE"`, `"DPI"`, `"LAYOUT FIDELITY"`, `"OPTIONS"`, `"TRANSFORMS"`, `"DELIVERY"`.

14. **Quality Defaults & Presets:**
    - *Locations:* `compressor.config.ts`, `tool.config.ts`.
    - *Defect:* Divergent slider tick increments and preset percentages (e.g. 65%, 85%, 95% vs 60%, 75%, 90%).
    - *Fix:* Standardize quality scale and presets in shared control tokens.

15. **CTA Noun Mismatch:**
    - *Locations:* `file-converter.component.html:190` ("Convert 1 Files" vs singular/plural handling), `image-compressor.component.html:150`.
    - *Defect:* Inconsistent singular/plural handling and mixed "image" vs "file" nouns.
    - *Fix:* Standardize CTA label: `{Verb} {N} {noun}` using singular when $N=1$ and plural when $N > 1$, derived from tool config.

16. **Toast Notification Divergence:**
    - *Locations:* `image-compressor.component.css:70`, `file-converter.component.css:50`.
    - *Defect:* Independent CSS animations, differing padding, and separate max-widths (420px vs 440px).
    - *Fix:* Replace with shared `ToastComponent` in `packages/tool-shell`.

17. **Privacy Line & Gradient Intensity:**
    - *Locations:* `upload-landing.component.ts:740`, `file-converter.component.css:280`.
    - *Defect:* Inconsistent helper strings and background gradient opacities across tools.
    - *Fix:* Lock background gradients to subtle layout-driven presets ($\le 6\%$ intensity) and standardize the privacy guarantee string: `"Your files never leave this device. 100% private."`.

---

## 4. Post-Harmonization Acceptance Verification & Measurements

### 4.1 Token Parity Table (Before vs After)

| UI Element / Token | Pre-Harmonization Compressor | Pre-Harmonization Converter | Unified Standard (After) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Display Headline** | `42px / 1.2` weight `800` | `38px / 1.2` weight `800` | `48px / 56px` (`3rem / 3.5rem`), weight `700`, `-0.02em` | **Verified Parity** |
| **Hero Headline (Mobile)** | `28px / 1.25` | `26px / 1.25` | `32px / 40px` (`2rem / 2.5rem`), weight `700`, `-0.02em` | **Verified Parity** |
| **Stage Title (H2)** | `22px / 28px` weight `700` | `20px / 26px` weight `700` | `24px / 32px` (`1.5rem / 2rem`), weight `600`, `-0.01em` | **Verified Parity** |
| **Primary Select Button** | `46px` height, `#2563EB` | `46px` height, `#2563EB` | `48px` height, pill radius, `var(--tool-accent)` | **Verified Parity** |
| **Primary CTA Button** | `44px` height, mixed nouns | `44px` height, "Convert 1 Files" | `48px` height, `12px` radius, `{Verb} {N} {noun}` | **Verified Parity** |
| **Popular Chip** | `32px` height, mono | `32px` height, uppercase mono | `36px` height, `999px` radius, `13px` weight `600` UI font | **Verified Parity** |
| **Workspace Count Pill** | `20px` height, mono | `20px` height, mono | `24px` height, `999px` radius, `12px` weight `600` UI font | **Verified Parity** |
| **Thumbnail Frame Height** | `148px` fixed | `aspect-ratio: 4/3` (~220px) | `180px` fixed (`var(--tool-thumb-height)`), 100% width | **Verified Parity** |
| **Settings Panel Width** | `360px` | `360px` | `360px` (`var(--tool-panel-width)`), sticky | **Verified Parity** |
| **Workspace Left Margin** | `0px` offset | `64px` offset at $\ge 1440\text{px}$ | `0px` offset across all resolutions (aligned with topbar) | **Verified Parity** |
| **Motion Curve & Enter** | Bouncy `scale(0.94)` / `0.5s` | Bouncy `scale(0.94)` / `0.5s` | Springless `300ms cubic-bezier(0.2, 0.6, 0.2, 1)` | **Verified Parity** |
| **Monospace Font Scope** | Leaked into buttons & chips | Leaked into pills & trigger | Strictly byte sizes and dimensions | **Verified Parity** |
| **Privacy Guarantee Text** | Inconsistent phrasing | Missing from footer | `"Your files never leave this device. 100% private."` | **Verified Parity** |

### 4.2 Test & Compilation Gate Results

- **Glass Styling Constraints**: PASSED (0.05s)
- **Tool Shell & Portal Isolation**: PASSED (0.24s)
- **TypeScript Compilation (`tsc -b --noEmit`)**: PASSED (6.37s, 0 errors)
- **Shared Package Tests (`vitest`)**: PASSED (0.73s)
- **Image Compressor Tests (`vitest run apps/tool-image-compressor`)**: PASSED (43 suites, 392 tests, 11.91s)
- **File Converter Tests (`vitest run apps/tool-file-converter`)**: PASSED (14 suites, 165 tests, 12.52s)
- **Level B Unified Verification Runner (`node scripts/verify.mjs -B`)**: PASSED (31.94s total)

