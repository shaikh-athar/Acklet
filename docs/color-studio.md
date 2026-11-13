# Acklet Color Studio — System Specification & Architecture

## 1. Overview & Tool Metadata

Acklet Color Studio is a unified, professional browser-side color engineering suite built for designers, developers, and accessibility auditors. It consolidates six independent yet interconnected color tooling modules within the Acklet design system.

- **Tool Slug**: `colorstudio` (canonical alias: `color-studio`)
- **Subdomain**: `colorstudio.acklet.com` (locally: `colorstudio.localhost:4200`)
- **Status**: Production Ready / Active (Phase 10 Complete — System Integration & End-to-End Testing)
- **Requires Backend**: `false` (100% Client-Side In-Memory Execution)
- **Primary Accent Color**: Blue (`#2563EB` light / `#3B82F6` dark, Hue: 217; unified with Acklet Image Converter)
- **Surface**: Tools Surface (`client/apps/tool-color-studio`)

### Privacy & Zero-Storage Guarantee
- **100% Client-Side Processing**: All color calculations, image quantization, gradient renderings, contrast evaluations, and color blindness simulations execute exclusively in the client's browser memory via the HTML5 Canvas API and JavaScript engine.
- **Zero Server Uploads**: No image files, palette data, hex codes, or telemetry are ever uploaded or transmitted to any backend service.
- **Ephemerality**: Image buffers and object URLs are revoked immediately upon sample changes or page reloads.

---

## 2. Core Architecture & Design System

Acklet Color Studio adheres strictly to the canonical Acklet Design System and the architectural patterns established across the monorepo:

### Technology Stack
- **Framework**: Angular 19+ (Standalone Components, Signals, `ChangeDetectionStrategy.OnPush`)
- **Routing**: Angular Router with lazy-loaded route modules and browser navigation synchronization
- **Design Tokens**: Canonical dual-theme CSS variables (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--tool-accent`)
- **Primitive Components**: Spartan UI Helm primitives (`HlmButton`, `HlmBadge`, `HlmInput`)
- **Icons**: Acklet Tool Shell icon system (`TsIconComponent` mapped via `TS_ICON_MAP`)
- **Build & Test Tools**: Angular CLI (`@angular/cli`), Tailwind CSS v4, Vitest

### Blue Accent System & Design Tokens
Color Studio is unified with the blue accent design language (matching Acklet Image Converter):
- **Manifest Accent**: `blue` (Hue: `217`)
- **Light Theme**:
  - Primary / Accent: `#2563EB` (Blue 600)
  - Hover / Active: `#1D4ED8` (Blue 700)
  - Soft Background: `rgba(37, 99, 235, 0.08)`
  - Subdued Border: `rgba(37, 99, 235, 0.2)`
- **Dark Theme**:
  - Primary / Accent: `#3B82F6` (Blue 500)
  - Hover / Active: `#60A5FA` (Blue 400)
  - Soft Background: `rgba(59, 130, 246, 0.12)`
  - Subdued Border: `rgba(59, 130, 246, 0.25)`
- **WCAG AA Conformance**: All interactive states achieve $\ge 4.5:1$ contrast against light (`#FFFFFF`, `#F8FAFC`) and dark (`#09090B`, `#18181B`) backgrounds. User-selected and sample artwork colors remain strictly preserved and unaffected.

### Micro-Interactions & Animation System
All interactive cards, chips, and operational elements implement purposeful, high-performance transitions powered by cubic bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)`):
- **Card-Level Click Navigation**: Clicking anywhere on a theme card in the Palette Generator opens the dedicated theme detail page (`openThemeDetails(theme)`). Secondary action buttons (`Save Theme`, `Export Theme`) call `event.stopPropagation()` to execute their operations without triggering parent navigation. Full keyboard accessibility (`Enter` and `Space`) is supported with `role="button"`.
- **Card Shortlisting & Saved State Pulse**: Shortlisting/saving a theme card or custom gradient triggers a synchronized `@keyframes saved-card-pulse` / `@keyframes saved-item-pulse` animation (scale expansion, luminous blue ring, and border pop).
- **Saved Library Dropdown Ping**: Saving a theme emits a reactive highlight ping (`savedLibraryHighlight`) on the toolbar's "Saved Themes" dropdown button with `@keyframes saved-lib-ping`.
- **Global Bookmark Ping Bridge**: In [`ColorStateService`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-state.service.ts), `triggerSavedPing()` animates the shared studio header's Saved Colors button (`@keyframes header-btn-ping`) whenever any color or palette is bookmarked across any module.
- **Micro-Press & Hover Elevate**: Applied across all modules:
  - Color Picker: `.compact-swatch-box`, `.strip-swatch`, `.combo-card`
  - Image Extractor: `.color-grid-card` with `@keyframes bookmark-pop`
  - Gradient Generator: `.saved-item-row` full click-to-apply with hover elevation and press feedback
  - Contrast Checker: `.suggestion-card` full click-to-apply
  - Vision Simulator: `.deficiency-chip` and `.anomalous-toggle-chip` with smooth spring transitions

---

## 3. Shared Color Conversion Engine (`ColorEngineService`)

Located in [`client/apps/tool-color-studio/src/services/color-engine.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-engine.service.ts):

### 1. Bidirectional Color Space Conversions
- **HEX ↔ RGB**:
  - Full support for shorthand 3-digit HEX (`#FFF`, `#F00`), shorthand 4-digit with alpha (`#RGBA`), standard 6-digit (`#FFFFFF`), and 8-digit with alpha (`#FFFFFFFF`).
  - Strict alpha normalization (clamped $0.0 - 1.0$).
- **RGB ↔ HSL**:
  - High-precision calculation converting $R, G, B \in [0, 255]$ into $H \in [0, 360^\circ]$, $S \in [0, 100\%]$, $L \in [0, 100\%]$.
- **RGB ↔ HSV**:
  - Fast conversion computing $V$ (value) and $S_v$ (saturation) alongside circular hue.
- **RGB ↔ CMYK**:
  - Accurate subtractive color model transformation computing Cyan, Magenta, Yellow, and Key (Black) percentages.
- **HSL ↔ HSV**:
  - Direct mathematical conversion without intermediate RGB loss.
- **HEX ↔ CMYK / HSL / HSV**:
  - Direct convenience methods (`hexToCmyk`, `cmykToHex`, `hexToHsl`, `hslToHex`, `hexToHsv`, `hsvToHex`).

### 2. Format Parsing & Input Validation
- `isValidHex(hex: string): boolean`: Validates `#` prefix optional, lengths 3, 4, 6, 8, valid hex range `[0-9a-fA-F]`.
- `isValidRgb(rgb: RgbColor): boolean`: Verifies channel bounds $[0, 255]$ and alpha $[0, 1]$.
- `isValidHsl(hsl: HslColor): boolean`: Verifies hue $[0, 360]$ and percentages $[0, 100]$.
- `isValidHsv(hsv: HsvColor): boolean`: Verifies hue $[0, 360]$ and percentages $[0, 100]$.
- `isValidCmyk(cmyk: CmykColor): boolean`: Verifies percentages $[0, 100]$.
- `isValidColor(input: string): boolean`: Multi-format validator detecting HEX, RGB/RGBA strings, and HSL/HSLA strings.
- `normalizeHex(hex: string): string`: Standardizes shorthand into uppercase 6-digit or 8-digit `#RRGGBB` or `#RRGGBBAA`.

### 3. Shared Color Utilities
- `lighten(color, percent)`: Increases HSL lightness by given percentage.
- `darken(color, percent)`: Decreases HSL lightness by given percentage.
- `getComplementary(color)`: Computes exact $180^\circ$ hue shift.
- `calculateLuminance(color)`: Calculates WCAG 2.1 relative luminance ($0.2126 R + 0.7152 G + 0.0722 B$).
- `calculateRgbDistance(color1, color2)`: Euclidean distance in 3D RGB color space ($\sqrt{\Delta R^2 + \Delta G^2 + \Delta B^2}$).
- `generateColorVariations(color, count)`: Generates stepped lightness/saturation variations.
- `getContrastCompliance(fg, bg)`: Relative luminance ratio and WCAG 2.1 compliance scorecards (AA/AAA).
- `autoFixContrast(fg, bg, grade)`: Iterative adjustment algorithm reaching $\ge 4.5:1$ (AA) or $\ge 7.0:1$ (AAA).
- `getAllHarmonies(hex)`: Generates 6 scheme matrices (Complementary, Analogous, Triadic, Tetradic, Monochromatic, Split-Complementary).
- `simulateColorBlindness(hex, type)`: Brettel & Viénot linear transformation matrices for 8 deficiency models.
- `extractColorsFromImageData(imageData)`: 100% browser-side HTML5 canvas quantization.

---

## 4. Shared Color State Management (`ColorStateService`)

Located in [`client/apps/tool-color-studio/src/services/color-state.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-state.service.ts) (extended by `ColorStudioStateService` for backwards compatibility):

### Signals & Reactive State
- **Currently Selected / Active Color** (`selectedColor`, alias `activeColor`):
  - Primary working color across all studio modules.
  - Linear undo & redo stacks with `undo()` and `redo()`.
  - `randomizeActiveColor()` instant discovery trigger.
- **Recently Used Colors** (`recentlyUsedColors`, alias `colorHistory`):
  - Automatically captures color modifications (deduplicated, capped at 16).
  - Persisted to LocalStorage under `acklet.colorstudio.history`.
- **Saved / Bookmarked Colors** (`savedColors`):
  - Allows users to bookmark favorite swatches with `saveColor()`, `removeSavedColor()`, and `toggleSavedColor()`.
  - Persisted to LocalStorage under `acklet.colorstudio.saved`.
- **Shared Working Palette** (`sharedColorPalettes`, alias `sharedWorkingPalette`):
  - Session palette holding 5 to 10 swatches shared between Picker, Extractor, Gradient, Contrast, Palette, and Simulator.
  - Persisted to LocalStorage under `acklet.colorstudio.palette`.
- **Active Navigation Module** (`activeModule`, alias `activeTab`):
  - Tracks currently active module (`picker`, `extractor`, `gradient`, `contrast`, `palette`, `simulator`).
  - Preserves selected colors and working palettes across tab switches without state resets.

### Reusable Clipboard Functionality
- `copyFormat(hex, format)`:
  - Supports: `'hex'`, `'rgb'`, `'hsl'`, `'hsv'`, `'cmyk'`, `'css'` (e.g. `background-color: #E11D48;`).
  - Dispatches visual feedback through transient studio toast notifications (`state.showToast()`).
- `copyAllFormats(hex)`:
  - Generates comprehensive spec sheet containing all 6 representations.

---

## 5. Reusable Color Swatch Component (`ColorSwatchComponent`)

Located in [`client/apps/tool-color-studio/src/components/shared/color-swatch.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/shared/color-swatch.component.ts):

### Features & Capabilities
- **Color Preview**: Renders background color over subtle checkerboard pattern for alpha transparency visualization.
- **HEX Display**: Formatted monospace uppercase hex code.
- **Copy Action**: 1-click copy with clipboard integration and toast confirmation.
- **Select Action**: Click or Enter/Space keyboard navigation emits `colorSelect` and activates the color in `ColorStateService`.
- **Active/Selected State**: High-contrast indicator ring and border styling.
- **Detailed Tooltip**: Displays formatted specifications (`HEX • RGB • HSL`) or custom label.
- **Bookmark Toggle**: 1-click bookmark/star button to add/remove from saved colors.
- **Context Actions Dropdown**: Direct dispatch to Picker, Contrast Text/BG, Gradient Stop, Palette, or Vision Simulator.
- **Responsive Sizing**:
  - `'sm'`: 32px mini swatch for toolbars, recent history strips, and palette rows.
  - `'md'`: Standard studio card with preview, hex row, and label.
  - `'lg'`: 96px showcase card with full metrics.
  - `'compact'`: Horizontal bar layout for dense listings.

---

## 6. Color Picker Module (`ColorPickerModuleComponent`)

Located in [`client/apps/tool-color-studio/src/components/picker/color-picker-module.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/picker/color-picker-module.component.ts):

### Workspace Ergonomics & Layout Architecture

The Color Picker module uses a streamlined, two-column workspace designed to maximize usable area for color selection while eliminating redundant controls and unnecessary vertical scrolling:
- **Consolidated Action Toolbar**: Positioned alongside the Color Picker header in a single consistent row:
  - `Sample`: Eyedropper API pixel sampling (conditionally rendered when supported).
  - `Random`: Generates random vibrant colors via `state.randomizeActiveColor()`.
  - `Undo` & `Redo`: Stack navigation with disabled state indicators.
  - `History`: Popover displaying recent colors, swatches, hex values, individual removal, and clear all.
  - `Saved Colors`: Popover with bookmarks, count badge, quick-save input, and inline name editing.
  - `Working Palette`: Popover previewing the 10-color studio working palette with cross-module dispatch.
  - `Harmonies`: Popover presenting complementary, analogous, and triadic color schemes.
- **Left Column (Visual Color Canvas & Combinations)**:
  - **2D Saturation-Brightness Canvas**: Smooth handle dragging, pure hue background, black/white gradients, and keyboard navigation (`Arrow` keys + `Shift`).
  - **Hue & Alpha Sliders**: $0^\circ - 360^\circ$ spectrum and $0\% - 100\%$ opacity tracks with numeric inputs.
  - **Compact Before / After Bar**: Inline comparison showing `Initial [swatch] #HEX -> Current [swatch] #HEX (alpha%)` with 1-click `Revert` button.
  - **Readability & Color Combinations**: 4 live accessibility tiles testing Dark on Color, Light on Color, Accent on Dark, and Accent on Light with WCAG scores.
- **Right Column (All Formats & Variations)**:
  - **All Formats Master Card**: Consolidates both format channel editing and quick-copy rows into a single authoritative card.
  - **Copy All Button**: Primary action in the card header copying all formats simultaneously.
  - **Format Channel Editor**: Segmented tab control (`HEX`, `RGB`, `HSL`, `HSV`, `CMYK`) with live two-way channel inputs and auto-reset on blur.
  - **Quick Copy Formats**: Dedicated rows for HEX, RGB, HSL, HSV, and CMYK with 1-click clipboard copy buttons.
  - **Tints & Shades Card**: 11-step stepped variations (5 tints, base, 5 shades) positioned in the right column beneath All Formats, balancing column heights.
- **Eliminated Duplicate Components**:
  - Removed secondary top-left module dropdown and redundant top-right icon buttons (the canonical Acklet topbar handles all navigation).
  - Removed duplicate format channel inputs under the 2D canvas.
  - Removed permanent right-hand cards for Saved Colors and History in favor of focused, non-disruptive popovers.
  - Removed permanent cross-module dispatch grid.
- **Popover UX & Mobile Bottom Sheets**:
  - Popovers close on outside click, Escape key, or close button.
  - Responsive breakpoint ($\le 640\text{px}$) transforms popovers into mobile bottom sheets with backdrop overlays.

---

## 7. Image Color Extractor Module (`ImageExtractorModuleComponent`)

Located in [`client/apps/tool-color-studio/src/components/extractor/image-extractor-module.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/extractor/image-extractor-module.component.ts):

### Features & Capabilities

1. **Initial Upload View & In-Memory Pipeline**:
   - Initial clean dropzone state displaying an upload card with file picker, drag-and-drop targets, and supported format guidelines (PNG, JPG, JPEG, WebP up to 25 MB).
   - Full-workspace drag & drop overlay allowing images to be dropped anywhere on the window.
   - Dedicated `@ViewChild` setter architecture synchronizing Angular DOM rendering with canvas initialization, ensuring uploaded images immediately draw to the canvas and extract dominant colors without requiring manual re-extraction.
   - Instant file metadata strip detailing filename, natural dimensions ($W \times H$ px), byte size, and format.
   - 100% browser-side processing; user imagery is never transmitted across the network.
   - Strict memory lifecycle releasing `URL.createObjectURL` references upon replacement, clearing, or component destruction.

2. **Dominant Color Extraction & Palette Sizing**:
   - High-performance canvas quantization clustering RGB pixels into frequency buckets while filtering transparent pixels ($A < 128$).
   - Multi-pass Euclidean distance deduplication ensuring extracted swatches represent distinct, visually prominent tones.
   - Configurable palette size selector supporting **5, 8, 10, 12, and 16** colors with high-contrast dual-theme styling (exceeding WCAG AA contrast ratio $\ge 4.5:1$).
   - Automatic downsampling for high-resolution images (clamped to max $1200 \times 1200$ analysis viewport) ensuring instantaneous extraction without UI thread locking.
   - Prominence calculation computing the exact visual percentage of each extracted tone.

3. **Interactive Pixel Color Picker, Pan & Zoom**:
   - Canvas viewport supporting mouse-wheel zoom ($25\% - 500\%$), zoom buttons, reset zoom, and fit-to-screen scaling.
   - Smooth panning when zoomed via click-and-drag.
   - Hover magnifier loupe displaying real-time magnified swatch, HEX code, and pixel coordinate readouts.
   - Responsive coordinate mapping translating rendered viewport bounding boxes to underlying canvas resolution ($x\%$, $y\%$), guaranteeing coordinate precision regardless of CSS scaling or container resizing.
   - Pinned reticle marker highlighting the active sampled position over the canvas.
   - **Sampled Pixel Color Section Position**: Located prominently in the right sidebar column directly **above** the `Extracted Palette` section, offering immediate access to 1-click Select Color, Bookmark, Copy HEX/RGB, and quick dismissal.
   - **Standard 5-Second Popup Auto-Dismiss**: Upload error notifications, file format alerts, and studio toast messages automatically dismiss after 5 seconds (5000ms).

4. **Palette Management, High-Contrast Actions & Persistence**:
   - High-contrast Save Palette action with solid blue enabled state (`#2563EB`, hover `#1D4ED8`) and clean, distinct disabled styling (`#F1F5F9` in light theme, `#27272A` in dark theme) that never turns white-on-white or washes out.
   - Inline palette naming and persistence to browser LocalStorage under `acklet.colorstudio.saved_palettes`.
   - Contextual popover for Saved Palettes displaying mini-swatch strips, load into Shared Palette action, and deletion.
   - Contextual popover for Shared Working Palette.
   - Consolidated Copy dropdown for all HEX or RGB values.

5. **Multi-Format Export**:
   - **JSON Export**: Downloads formatted `palette.json` including color metadata, RGB channels, and prominence percentages.
   - **CSS Variables Export**: Downloads `palette.css` with standard `:root { --color-1: ... }` definitions.
   - **PNG Download**: Dynamically generates an offscreen $800 \times 240$ px swatch banner with labels and exports a clean PNG graphic.
   - **Quick Copy**: 1-click clipboard actions for all comma-separated HEX codes or line-separated RGB values.

6. **Cross-Module Studio Dispatch**:
   - **Send to Palette Generator**: Populates the 5 active palette slots for harmonization and locking.
   - **Build CSS Gradient**: Takes top extracted tones and initializes linear/radial gradient stops.
   - **Add to Shared Palette**: Dispatches up to 10 extracted tones to the studio-wide working palette bar.

---

## 8. CSS Gradient Generator Module (`GradientModuleComponent` & `GradientService`)

Located in [`client/apps/tool-color-studio/src/components/gradient/gradient-module.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/gradient/gradient-module.component.ts) and [`client/apps/tool-color-studio/src/services/gradient.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/gradient.service.ts):

### 1. Multi-Type Gradient Architectures
- **Linear Gradients**:
  - Full angle control ($0^\circ - 360^\circ$) with normalization.
  - Direction presets: To Top ($0^\circ$), To Top Right ($45^\circ$), To Right ($90^\circ$), To Bottom Right ($135^\circ$), To Bottom ($180^\circ$), To Bottom Left ($225^\circ$), To Left ($270^\circ$), To Top Left ($315^\circ$).
  - Produces standard `linear-gradient(${angle}deg, ${stops})`.
- **Radial Gradients**:
  - Shape selection: `circle` or `ellipse`.
  - Extent modes: `farthest-corner`, `closest-side`, `closest-corner`, `farthest-side`.
  - 9-point anchor matrix (Center, Top, Top Right, Right, Bottom Right, Bottom, Bottom Left, Left, Top Left) alongside custom X/Y coordinate sliders ($0\% - 100\%$).
  - Produces standard `radial-gradient(${shape} ${extent} at ${posX}% ${posY}%, ${stops})`.
- **Conic Gradients**:
  - Starting angle rotation ($0^\circ - 360^\circ$) with normalization.
  - Center point positioning ($0\% - 100\%$).
  - Produces standard `conic-gradient(from ${angle}deg at ${posX}% ${posY}%, ${stops})`.
- **Seamless Type Switching**: Users can switch between Linear, Radial, and Conic gradients without resetting existing color stops.

### 2. Unified Card Layout & Dynamic Color Stop Rail
- **Single Unified Viewport Card**:
  - The left column contains ONE unified card container (`.viewport-card`). There is no detached `.stops-card` or visual border break.
  - Houses the live gradient preview canvas, interactive gradient rail, and the integrated Color Stops management section (`.stops-management-section`) separated by a subtle dual-theme divider border.
  - The redundant "Quick Add Stop" bar has been removed to maximize vertical workspace density.
- **Interactive Gradient Rail Track with Real-Time Dragging**:
  - Real-time gradient visualization along a clickable and draggable rail track.
  - Dragging rail stop markers (`mousedown`/`touchstart`) smoothly updates stop positions in real-time.
  - Dragging and manual slider/numeric inputs enforce strict adjacent stop bounding ($Stop_{idx-1} \le pos \le Stop_{idx+1}$), guaranteeing that stops remain in ascending order without crossing or scrambling.
  - Clicking anywhere on the rail automatically calculates click offset percentage and creates an interpolated stop at that position.
  - Active stop marker highlighting with hover scale and high-contrast focus rings.
- **Stop Management**:
  - Add, edit, reorder, lock, and remove stops.
  - Enforced minimum of 2 stops to prevent invalid gradient states.
  - Hex color normalization and real-time color input synchronization.
  - Position percentage sliders and numeric inputs bounded strictly between adjacent stops.
  - Lock toggle to pin stop positions during distribution operations.
- **Stop Utilities**:
  - `reverseStops()`: Inverts stop colors and positions.
  - `distributeStopsEqually()`: Spaces all unlocked stops evenly between $0\%$ and $100\%$.
  - `resetToDefaults()`: Resets gradient to clean default configuration.

### 3. Live Viewport with Transparency Checkerboard
- Large live canvas viewport updating instantly upon color or position adjustments.
- Multi-backdrop options:
  - **Checkerboard**: High-contrast tile pattern exposing alpha channel transparency.
  - **Dark**: `#09090B` slate backdrop.
  - **Light**: `#FFFFFF` white backdrop.
- Live metadata pill displaying gradient type and parameters (e.g., `LINEAR 135°`, `RADIAL circle at 50% 50%`, `CONIC from 0° at 50% 50%`).

### 4. Presets & LocalStorage Saved Gradients
- **Full-Width Landscape Inspiration Gallery**: Relocated from the narrow right-hand rail to a full-width landscape gallery situated beneath the primary two-column stage, eliminating vertical height imbalances and negative whitespace in the workspace.
- **Built-in Presets Catalog**: 41 curated production-ready gradients across linear, radial, and conic types:
  - **Popular**: Sunset, Ocean Blue, Purple Dream, Peach Glow, Midnight, Rose Gold.
  - **Nature**: Aurora, Forest, Ocean, Sunset Sky, Emerald, Desert Sand.
  - **Modern**: Neon Glow, Deep Space, Cyberpunk, Electric Violet, Hyper Light, Synthwave.
  - **Warm**: Citrus Burst, Autumn, Fire & Ice, Solar Flare.
  - **Cool**: Arctic Ice, Glacier, Deep Sea, Lavender Mist.
  - **Dark**: Obsidian, Dark Velvet, Twilight.
  - Dedicated **Radial** and **Conic** focal-point gradient presets.
- **Header & Category Filtering**:
  - Sparkles icon badge, live preset counter pill, and explanatory subtitle.
  - Single-row horizontal filter pills: All, Popular, Nature, Modern, Warm, Cool, Dark, Radial, Conic with dual-theme contrast.
- **Landscape Preset Cards**:
  - Generous 84px tall gradient preview swatch with hover-overlay `Apply Gradient` action.
  - Preset name and color-coded type badge (`linear` in blue, `radial` in teal, `conic` in amber).
  - Stop color dots previewing each individual color stop, alongside total stop count.
  - Full keyboard accessibility (`Enter`/`Space` to apply, focus rings) and smooth elevation transitions.
- **Custom Saved Gradients**:
  - Displayed in the right parameters column alongside CSS Code & Export.
  - Save current configuration with custom names.
  - Inline renaming with instant keyboard commit.
  - Delete saved gradient.
  - Persisted to LocalStorage under `acklet.colorstudio.saved_gradients`.

### 5. Multi-Format Export Suite
- **Copy CSS**: 1-click clipboard action copying standard CSS declaration (`background: ...;`) or full CSS rule block with solid fallback (`background-color: ...; background-image: ...;`).
- **Download `.css` File**: Standalone stylesheet containing `.gradient-background` and `.gradient-fill` utility classes.
- **Export `.json` File**: Structured configuration containing gradient type, parameters, sorted stops array, and CSS strings.
- **Download `.png` Image**: Renders the active gradient to an offscreen $1200 \times 800$ px HTML5 Canvas and triggers high-resolution PNG download.

### 6. Cross-Module Synchronizations
- **Send Stop to Color Picker**: Direct link to refine any gradient stop in the 2D visual spectrum picker.
- **Bookmark Stop**: Saves stop color into bookmarked colors.
- **Send Stops to Shared Palette**: Exports all gradient stop colors to the studio-wide Shared Color Bar.
- **Populate from Shared Palette**: Replaces gradient stops with colors from the active shared palette, evenly distributed from $0\%$ to $100\%$.

### 7. Intelligent Gradient Repair & Auto Improve (`GradientAnalysisService` & `GradientRepairService`)
Located in [`client/apps/tool-color-studio/src/services/gradient-analysis.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/gradient-analysis.service.ts), [`client/apps/tool-color-studio/src/services/gradient-repair.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/gradient-repair.service.ts), and [`client/apps/tool-color-studio/src/components/gradient/gradient-repair.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/gradient/gradient-repair.component.ts):

- **Zero-Backend Browser Processing**: All analysis and repair algorithms execute deterministically in the client's browser memory using CIELAB color mathematics, geometry algorithms, and Angular Signals without external API calls or AI latency.
- **Multi-Dimensional Analysis Engine (`GradientAnalysisService`)**:
  - **Stop Position Validation**: Validates ascending order, $[0\%, 100\%]$ boundary coverage, crowded pinch points ($< 3\%$ apart), and explicitly recognizes intentional hard cut color transitions ($pos_A = pos_B$) as informational rather than errors.
  - **Color Validation & Redundancy**: Validates hex syntax, flags redundant identical adjacent colors, and warns on imperceptible near-duplicates ($\Delta E < 3.0$).
  - **Color Harmony Detection**: Computes circular hue distances (with wrap-around handling across $0^\circ / 360^\circ$) to identify Monochromatic, Analogous, Complementary, and Triadic patterns.
  - **Transition Smoothness ($\Delta E$)**: Calculates perceptual color distance between adjacent stops in CIELAB space via `ColorBlindnessService`, identifying harsh color jumps ($\Delta E > 60$) that cause banding.
  - **Configuration Validation**: Checks for unnormalized linear angles and out-of-bounds radial/conic focal coordinates.
- **5 Deterministic Repair Strategies (`GradientRepairService`)**:
  - **Balanced (Recommended)**: Normalizes stop boundaries ($0\%$ start, $100\%$ end), balances intermediate stop spacing, preserves locked stops, preserves intentional hard cuts ($pos_A = pos_B$), and corrects invalid colors.
  - **Smooth Transitions**: Spaces stops proportionally according to perceptual CIELAB $\Delta E$ distances, smoothing harsh transitions and eliminating banding hot spots.
  - **Color Harmony**: Anchors on the primary or locked stop and tunes discordant stop hues into an analogous progression with aesthetic saturation and lightness balancing.
  - **Contrast Optimized**: Enhances perceptual lightness steps ($\Delta L^* \ge 12$) across consecutive stops for enhanced visual depth and text legibility.
  - **Custom Repair**: Allows granular selection of specific repair dimensions via toggle checkboxes (`stopPositions`, `colorTransitions`, `colorHarmony`, `balanceBrightnessSaturation`, `gradientAngle`, `cssConfig`).
- **Side-by-Side Comparison Modal (`GradientRepairComponent`)**:
  - Displays original vs repaired preview canvases with stop swatches and percentage badges.
  - Strategy selector tabs with single-sentence functional descriptions.
  - 4 Health & Metric score cards (`Stop Positions`, `Color Transitions`, `Color Harmony`, `CSS Validity`).
  - Automated improvements list with actionable change diagnostics.
  - User controls: `Apply Repair`, `Try Another Strategy`, `Keep Original`, `Reset`.
- **Integrated Undo/Redo System**:
  - Applying repair pushes state onto `gradientUndoStack` in `ColorStateService`.
  - Dedicated `Undo` and `Redo` action buttons in the main toolbar allow 1-click reverting and reapplying.
  - Full synchronization across live preview, interactive rail, stop rows, CSS code output, and presets.

---

## 9. Color Contrast Checker Module (`ContrastModuleComponent` & `ContrastService`)

Located in [`client/apps/tool-color-studio/src/components/contrast/contrast-module.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/contrast/contrast-module.component.ts), [`client/apps/tool-color-studio/src/services/contrast.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/contrast.service.ts), and [`client/apps/tool-color-studio/src/services/export.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/export.service.ts):

### 1. Color Selection & Format Synchronization
- **Unified Control Panel (`.contrast-unified-card`)**:
  - Replaced fragmented multi-card containers with a unified panel grouping Color Selection, Contrast Ratio Scorecard, and WCAG Criteria, structured with clean 1px dividers and balanced 16–20px spacing.
- **Foreground (Text) and Background Controls**:
  - Native browser color picker, uppercase HEX input with blur validation.
  - Multi-channel input modes: **HEX**, **RGB** ($R, G, B \in [0, 255]$), and **HSL** ($H \in [0, 360], S \in [0, 100], L \in [0, 100]$) with responsive padding preventing 3-digit number truncation.
  - Relative luminance tags ($L$) displayed in real-time in a clean single-line header.
  - Quick test swatches imported from user's saved bookmarks and studio shared palette.
  - One-click foreground/background color swap (`swapColors()`).

### 2. Mathematically Accurate WCAG Relative Luminance & Contrast Calculation
- **Relative Luminance ($L$)**:
  - Implemented strictly per WCAG 2.2 specifications via sRGB transfer function:
    $$c \le 0.04045 \implies C = c / 12.92 \quad \text{else} \quad C = ((c + 0.055) / 1.055)^{2.4}$$
    $$L = 0.2126 R + 0.7152 G + 0.0722 B$$
- **Contrast Ratio**:
  - Ratio calculated as $(L_{\text{lighter}} + 0.05) / (L_{\text{darker}} + 0.05)$, strictly bounded from $1.00:1$ to $21.00:1$.
  - Alpha compositing: When either foreground or background contains transparency ($\alpha < 1.0$), foreground is composited over the effective background before calculating contrast, ensuring mathematically sound accessibility results.

### 3. WCAG 2.2 Accessibility Evaluation Matrix
- **Streamlined 1-Line Criteria Rows**: Stripped redundant boilerplate paragraph descriptions, presenting criteria in compact, high-legibility 1-line rows (`Normal Text (AA) | ≥ 4.5:1 | PASS/FAIL`).
- **Normal Text**:
  - Level AA: $\ge 4.5:1$ (Required for text $< 18\text{pt}$ or $< 14\text{pt}$ bold).
  - Level AAA: $\ge 7.0:1$ (Enhanced contrast).
- **Large Text**:
  - Level AA: $\ge 3.0:1$ (Headings $\ge 18\text{pt}$ or $\ge 14\text{pt}$ bold).
  - Level AAA: $\ge 4.5:1$ (Enhanced large text).
- **UI Components & Graphical Objects**:
  - Level AA: $\ge 3.0:1$ (Active buttons, form input borders, icons, and focus rings).
- **Criterion Isolation**: Strict separation guaranteeing a pass on large text ($3.0:1$) is never reported as passing normal body text.
- **Rating Labels**: Objective WCAG status separated from human-readable rating labels: "Excellent contrast" ($\ge 7.0$), "Good contrast" ($\ge 4.5$), "Needs improvement" ($3.0 - 4.49$), and "Insufficient contrast" ($< 3.0$).

### 4. Accessible Color Suggestion Engine
- Calculates and verifies actual contrast ratios rather than using arbitrary lighten/darken heuristics.
- Targets configurable for **WCAG AA ($4.5:1$)** or **WCAG AAA ($7.0:1$)**.
- Generates:
  - Darker foreground alternatives (stepped HSL lightness decrease).
  - Lighter foreground alternatives (stepped HSL lightness increase).
  - Darker/lighter background alternatives.
- One-click application of any suggestion directly into the active workspace.

### 5. Gradient Multi-Point Contrast Analyzer & Warning
- Evaluates active foreground text contrast against every stop in the active studio gradient.
- Computes minimum, maximum, and average contrast ratios.
- Automatically generates a compact alert or pass banner:
  *"Low Contrast on Some Stops: Text contrast drops to X:1 on parts of this gradient."*
- Interactive stops table displaying stop position, HEX, ratio, and pass/fail status.

### 6. Realistic Accessibility Preview Surface
- Displays clean, realistic UI mockups using user-selected foreground and background colors:
  - Large Heading ($24\text{px}$ bold: *"Clear Information Hierarchy"*)
  - Body Text (*"Good contrast ensures text is comfortable to read for all users across different screens and lighting conditions."*)
  - Primary Solid Button (inverted FG/BG)
  - Secondary Outline Button
  - Form Input Mock with boundary border
  - Interactive Elements Card with graphical border
- Context frame toggle (Dark Frame vs Light Frame).

### 7. Multi-Format Export & Sharing Dropdown (`ExportService`)
- Integrated into the top action button collection as an **Export & Share** dropdown menu:
  - 1-click **Copy Contrast Ratio** (e.g. `4.73:1`).
  - **Copy Foreground / Background HEX**.
  - **JSON Report**: Downloads `contrast-report.json` with metadata, criteria status, and suggestions.
  - **CSS Tokens**: Downloads `contrast-tokens.css` with semantic variables (`--color-text`, `--color-bg`, `--contrast-ratio`).
  - **Markdown Report**: Downloads `contrast-accessibility-report.md`.
  - **Print / PDF Report**: Formatted printable accessibility evaluation document with print-preview trigger.
- Streamlined layout removes redundant bottom card space in favor of a clean, responsive dropdown with keyboard Escape dismissal and backdrop click-outside detection.

### 8. Side-by-Side Lower Layout Architecture
- Beneath the Realistic Accessibility Preview surface, the lower section presents two coordinated tools side-by-side in a balanced row:
  - **Left Card (`sugg-half-card`)**: Accessible Color Suggestions with Level AA/AAA targets and high-contrast hoverable `.apply-sugg-btn` buttons (`#1D4ED8` hover with `#FFFFFF` text).
  - **Right Card (`grad-half-card`)**: Studio Gradient Background Multi-Point Contrast Warning and Stop Matrix.
- Responsive breakpoint ($\le 960\text{px}$) shifts the side-by-side row into a single column for seamless mobile usability.

---

## 10. Color Palette & UI Theme Generator Module (`PaletteModuleComponent`, `ThemeGenerationService`, `ThemeExportService`)

Located in:
- Main Component: [`client/apps/tool-color-studio/src/components/palette/palette-module.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/palette/palette-module.component.ts)
- Theme Card: [`client/apps/tool-color-studio/src/components/palette/theme-card.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/palette/theme-card.component.ts)
- Theme Details: [`client/apps/tool-color-studio/src/components/palette/theme-details.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/palette/theme-details.component.ts)
- Theme Generation Engine: [`client/apps/tool-color-studio/src/services/theme-generation.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/theme-generation.service.ts)
- Theme Export Service: [`client/apps/tool-color-studio/src/services/theme-export.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/theme-export.service.ts)
- Legacy Engine: [`client/apps/tool-color-studio/src/services/palette.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/palette.service.ts)
- Models: [`client/apps/tool-color-studio/src/models/theme.models.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/models/theme.models.ts) & [`client/apps/tool-color-studio/src/models/color.models.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/models/color.models.ts)

### 1. Architectural Evolution: From Basic Swatches to Application-Ready Theme Systems
The Acklet Palette Generator has evolved from generating isolated 5-color swatches into a production-ready **Color Theme Generator**. Rather than leaving developers with arbitrary color strips, the module deterministically synthesizes complete design systems mapped directly to semantic UI roles.

### 2. Complete 23-Token Semantic Color System
Every theme generated synthesizes 23 mathematically and perceptually related tokens with strict WCAG AA contrast validation:
1. **Core & Brand Tokens**:
   - `Primary` (`--color-primary`): Primary brand action, buttons, key interactive elements.
   - `Primary Hover` (`--color-primary-hover`): Calibrated hover state (lightness offset).
   - `Primary Active` (`--color-primary-active`): Pressed / active interaction state.
   - `Secondary` (`--color-secondary`): Supporting actions and secondary tags.
   - `Secondary Hover` (`--color-secondary-hover`): Secondary hover state.
   - `Accent` (`--color-accent`): Highlights, callouts, and key data visualization points.
2. **Background & Surface Tokens**:
   - `Background` (`--color-background`): Main application canvas background.
   - `Background Secondary` (`--color-background-secondary`): Page gutters, sidebar backing, recessed areas.
   - `Surface` (`--color-surface`): Cards, panels, content boxes, and tables.
   - `Surface Elevated` (`--color-surface-elevated`): Modals, popovers, dropdown menus, and tooltips.
   - `Surface Muted` (`--color-surface-muted`): Table headers, recessed cards, code blocks.
3. **Typography Tokens**:
   - `Text Primary` (`--color-text-primary`): Headings, primary body copy (WCAG AAA/AA $\ge 10:1$).
   - `Text Secondary` (`--color-text-secondary`): Subheadings, labels, captions (WCAG AA $\ge 4.5:1$).
   - `Text Muted` (`--color-text-muted`): Placeholder text, disabled copy, helper hints.
   - `Text Inverse` (`--color-text-inverse`): Text on dark or primary filled backgrounds.
4. **Border Tokens**:
   - `Border` (`--color-border`): Card outlines, inputs, dividers.
   - `Border Subtle` (`--color-border-subtle`): Soft table separators.
   - `Border Strong` (`--color-border-strong`): Prominent outer bounds and selected container frames.
   - `Focus Ring` (`--color-focus-ring`): Accessible keyboard focus indicators.
5. **Status & Feedback Tokens**:
   - `Success` (`--color-success`): Positive metrics, operational status, success toasts.
   - `Warning` (`--color-warning`): Cautionary notices, pending actions.
   - `Error` (`--color-error`): Critical alerts, destructive operations.
   - `Information` (`--color-information`): Tips, informational badges.

### 3. Theme Generation Controls
- **Base Brand Color**: Visual color picker + manual HEX code input with quick randomizer.
- **Theme Style (12 Curated Styles)**: `Minimal`, `Modern`, `Corporate`, `Elegant`, `Creative`, `Vibrant`, `Brutalist`, `Glass`, `Editorial`, `Luxury`, `Dark Cinematic`, `Natural`.
- **Color Mood (8 Moods)**: `Calm`, `Warm`, `Cool`, `Bold`, `Muted`, `Pastel`, `Vibrant`, `Neutral`.
- **Application Type (9 Types)**: `SaaS Dashboard`, `FinTech`, `Developer Tool`, `E-commerce`, `Portfolio`, `Productivity`, `Admin Panel`, `Landing Page`, `Mobile Application`.
- **Theme Mode**: Segmented toggle for `Light`, `Dark`, or `Both` (generating paired light/dark variants).
- **Variations Selector**: Generate 2, 4, 6, or 8 theme variations on each trigger with 100% duplicate prevention.
- **Deduplication Engine**: Uses normalized semantic fingerprints (`hash(primary + accent + bg + mode)`) and dynamic color descriptor naming (`getColorDescriptor(hex)`) to guarantee all generated themes are unique.

### 4. Curated Discovery Gallery & Micro-UI Theme Cards
- **10 Curated Theme Categories**: Filter by `Minimal & Clean`, `Professional`, `Dark & Cinematic`, `Natural & Organic`, `Modern SaaS`, `FinTech`, `Creative & Colorful`, `Luxury & Elegant`, `High Contrast`, `Warm & Neutral`.
- **20+ Curated Seed Themes**: Loaded on discovery covering all 10 application categories with light and dark pairs.
- **Continuous Theme Expansion ("Show more...")**:
  - Centered below the themes grid, a dedicated, clean **Show more...** trigger button with the radial rays **loader** icon (`ts-icon name="loader"`) without underline (`text-decoration: none !important;`) allows users to generate and append more application themes indefinitely.
  - **8 Themes Per Click**: Appends 8 newly synthesized themes on each click instead of 4, providing rapid discovery of application themes.
  - **Context-Aware Dynamic Generation**:
    - **Category-Filtered Results**: When viewing a specific category (e.g. `FinTech`, `Minimal & Clean`), clicking "Show more..." generates 8 new themes specifically curated for that category and app type.
    - **User Preference Results**: When generated via custom preferences (`baseColor`, `style`, `mood`, `appType`, `mode`), clicking "Show more..." synthesizes further distinct harmonic variations without resetting or repeating.
    - **Curated Explore Results**: When browsing in `All`, clicking "Show more..." expands the gallery across multiple design styles.
  - **Full Deduplication**: Powered by fingerprint hashing (`hash(primary + accent + bg + mode)`) to ensure zero duplicate themes are appended.
  - **Dual-Theme High Contrast**: Fully styled with Spartan-first pill borders and theme tokens in both light and dark themes.
- **Refined Quick Filter Bar**: Horizontal scrollable container with generous 14px horizontal pill padding, hidden scrollbar, consistent 8px gaps, and active indicator in Acklet Blue (`#2563EB`).
- **Real-Time Search**: Search themes dynamically by name, style, category, or application type.
- **Realistic Micro-UI Cards (`ThemeCardComponent`)**:
  - Theme title, category badge, non-wrapping `LIGHT` / `DARK` pill indicator, and direct card **Export action button**.
  - **Distinct Saved Theme State**: Cards that are saved in the user's library stand out immediately with an unmistakable blue accent border and outer glow ring (`.theme-card.saved-card`), an inline `[ 🔖 Saved ]` pill badge in the card header, and a filled solid blue bookmark button.
  - 6 Key semantic swatches in a compact horizontal strip.
  - **Realistic Miniature UI Preview**: Actual micro-dashboard layout containing full-height sidebar, topbar with search pill and user avatar, metric card with sparkline chart, and primary action button using the theme's live CSS tokens.
  - Card footer with `View Theme`, `Save Theme` (bookmark toggle), and `Export Theme` actions.
  - Full interaction states: Default, hover, active, focus-visible (`outline: 2px solid #2563EB`), and disabled.

### 5. Dedicated Theme Details Page (`ThemeDetailsComponent`)
- **Full Semantic Token Breakdown**:
  - Tokens grouped into Brand, Background, Surface, Typography, Borders, and Status.
  - Swatch preview, token name, CSS variable name, HEX value with 1-click copy, RGB values.
  - WCAG Contrast Ratio badge with `AAA`, `AA`, or `Fail` rating calculated against the background surface.
  - **Token Customizer**: Inline color picker, HEX input, RGB input, and reset to generated defaults. Changing primary automatically retunes hovers, active states, and contrast ratios in real time.
  - **Color Locking**: Individual tokens can be locked so regeneration and variations preserve them.
- **Interactive Live Application Preview**:
  - Live SaaS Dashboard rendering Header, Sidebar, Metric Cards, Sparkline Analytics, and Data Table.
  - Mode toggle: Instant switch between `Light Preview` and `Dark Preview`.
  - Viewport toggle: Switch between full `Desktop Preview` and realistic `Mobile Preview` frame.
- **Theme Variations Generator**:
  - Explores subtle hue shifts ($\pm 18^\circ, \pm 35^\circ$), harmonic saturation changes, and contrast profiles while preserving core theme identity and locked tokens.
  - 4 side-by-side variation cards with preview boxes and 1-click adoption.

### 6. Production Multi-Format Export Suite (`ThemeExportService`)
- **Direct Card Export**: Individual themes can be exported directly from their card or from the dedicated details page across 6 production formats:
  - **CSS Custom Properties**: `:root` or `[data-theme="dark"]` variables block annotated with role descriptions.
  - **SCSS Variables**: `$color-primary`, `$color-surface`, etc.
  - **Tailwind CSS Config**: `theme.extend.colors` structure ready for `tailwind.config.js`.
  - **JSON Tokens**: Structured JSON object with token keys, categories, hex, rgb, and contrast ratios.
  - **W3C Design Tokens JSON**: Open standard design token format (`$value`, `$type: "color"`, `$description`, `extensions`).
  - **PNG Palette Preview Card**: High-resolution $1200 \times 630$ px graphic rendered via HTML5 canvas with color composition swatches, contrast ratios, and metadata.
- 1-click **Copy Code** and direct file download (`.css`, `.json`, `.scss`, `.js`, `.png`).

### 7. Saved Library & Backward Compatibility
- **Saved Themes Storage**: LocalStorage persistence (`acklet.colorstudio.saved_themes`). Compact dropdown from workspace header showing saved themes with mini swatches, structured non-wrapping `LIGHT` / `DARK` badges with high contrast, and delete actions.
- **Legacy Compatibility**: Full preservation of legacy methods (`generateNewPalette`, `saveCurrentPalette`, `loadSavedPalette`, `reversePalette`, etc.) ensuring 100% test pass rate across all existing unit test suites.

---

## 11. Color Blindness Simulator Module (`SimulatorModuleComponent` & `ColorBlindnessService`)

Located in:
- Component: [`client/apps/tool-color-studio/src/components/simulator/simulator-module.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/simulator/simulator-module.component.ts)
- Engine: [`client/apps/tool-color-studio/src/services/color-blindness.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-blindness.service.ts)

### 1. Viewport-Aware Architecture & Clean Upload-First Empty State
- **Single-Viewport Layout**: The desktop simulator interface is strictly designed to fit into a single desktop viewport (`calc(100vh - 85px)`) without unnecessary vertical scrolling, keeping the preview canvas as the dominant workspace.
- **Clean Upload-First State**: Preloaded stock sample images have been completely removed. The simulator initializes with a clean, centered drag-and-drop upload zone:
  - Clear guidance: *"Upload an image to get started"* and *"Choose an image to see how its colors appear under different types of color vision."*
  - Supported formats: PNG, JPG, JPEG, and WebP up to 25 MB.
  - 5-second auto-dismissing notifications for any upload validation errors (e.g., oversized or unsupported formats).
- **Zero Server Uploads**: 100% private in-browser client-side canvas processing; object URLs are revoked immediately upon image replacement or removal.

### 2. Scientifically Grounded CVD Simulation Engine & Condition Selection
The simulator applies established color transformation models formulated by Brettel, Viénot & Mollon (1997) and Machado et al. (2009):
- **Gamma Linearization**: Non-linear sRGB values are linearized prior to matrix calculation ($C_{linear} = (C \le 0.04045) ? C / 12.92 : ((C + 0.055) / 1.055)^{2.4}$) utilizing a precomputed 256-entry `Float32Array` lookup table (LUT) for sub-15ms processing on megapixel canvases.
- **$3 \times 3$ Transformation Matrices**: Applied strictly in linear optical space to project colors onto dichromat copunctal lines.
- **Normal Vision Identity Matrix**: Standard trichromacy baseline represented by an exact $3 \times 3$ identity matrix (`[1, 0, 0, 0, 1, 0, 0, 0, 1]`) ensuring zero-distortion baseline rendering.
- **Gamma Re-encoding**: Linear RGB results are converted back to sRGB with bounds clamping $[0, 255]$ ($C_{srgb} = (C \le 0.0031308) ? C \times 12.92 : 1.055 \times C^{1/2.4} - 0.055$).
- **Alpha Preservation**: Transparent and semi-transparent alpha channels are strictly preserved.
- **Primary Conditions & Collapsible Anomalous Shifts**:
  - **5 Primary Conditions**: Normal Vision (Standard Trichromacy), Protanopia (Red-blind, L-cone absent), Deuteranopia (Green-blind, M-cone absent), Tritanopia (Blue-blind, S-cone absent), and Achromatopsia (Complete color blindness, Monochromacy via Rec. 709 photometric relative luminance $0.2126 R + 0.7152 G + 0.0722 B$).
  - **Collapsible Anomalous Shifts**: Compact toggle revealing anomalous trichromacies: Protanomaly (red-weak), Deuteranomaly (green-weak), Tritanomaly (blue-weak), and Achromatomaly (partial desaturation).
  - Instantaneous, seamless simulation re-rendering on condition selection with high-contrast active blue indicator styling (`#2563EB`).

### 3. Image Comparison Workspace & Navigation
- **Neutral Checkerboard Backdrop**: Subtle transparency checkerboard canvas backdrop without distracting high-contrast solid backgrounds, keeping true image colors front and center.
- **Three Comparison Modes**:
  - **Split View**: Interactive vertical divider with draggable handle, percentage indicator, and a bottom HUD slider (`Normal X% — Simulated Y%`) allowing continuous side-by-side comparison.
  - **Side-by-Side View**: Dual synchronized canvas panels showing Original and Simulated renderings simultaneously with synchronized zoom and pan.
  - **Simulated Only View**: Unobstructed view of the simulated rendering featuring an intuitive **"Hold to View Original"** peek button (`mousedown`/`touchstart`) for instantaneous flicker-free comparison.
- **Continuous Zoom & Drag-to-Pan**:
  - Continuous zoom range from 25% to 500% with Zoom In (`+`), Zoom Out (`-`), Fit to Screen (`fit`), Reset Zoom (`100%`), and real-time zoom percentage readout.
  - Smooth mouse-wheel zooming and drag-to-pan navigation when zoomed (`zoomLevel > 1`). Both canvases remain strictly synchronized in position and scale.

### 4. Color Inspection Loupe & Image Accessibility Analysis
- **Live Pixel Color Inspector**:
  - **Enabled by Default**: Automatically active upon image upload so users can immediately hover across the image to sample and compare original vs simulated colors without requiring manual activation.
  - Displays original pixel HEX and RGB vs simulated pixel HEX and RGB in real-time.
  - Computes and displays the perceptual color distance $\Delta E$ (CIE76): $\Delta E = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$.
- **Image Accessibility Analysis Callout**:
  - Periodically samples representative colors across the uploaded image.
  - Computes pairwise $\Delta E$ under the active deficiency to detect indistinguishable color pairs ($\Delta E < 11$).
  - Highlights severe confusion risks ($\Delta E < 6$) with clear, human-readable recommendations (e.g. increase luminance contrast or adjust hues).

### 5. Single-Line Compact Toolbar & Multi-Format Export Suite
- **Single-Line Responsive Toolbar**:
  - `Replace Image` action button with hidden native file input.
  - Image metadata pill displaying file name, dimensions (`W × H px`), and formatted file size (`KB/MB`).
  - Segmented comparison mode toggle (`Split View`, `Side-by-Side`, `Simulated Only`).
  - Zoom controls and Inspector toggle.
  - Export dropdown and Remove Image (Clear) action.
- **Robust Export Popover Architecture**:
  - **Stacking Context & Visibility**: `.compact-toolbar` uses `position: relative; z-index: 50; overflow: visible;` ensuring dropdown menus sit firmly in front of the canvas viewport without clipping.
  - **Click-Outside Dismissal**: Transparent full-screen backdrop (`.export-backdrop`) with `position: fixed; inset: 0; z-index: 999;` automatically closes the menu on external clicks or selections.
  - **Micro-Interaction**: Soft popover slide-in animation (`popover-slide-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)`).
- **Comprehensive Export Suite**:
  - **Simulated Image**: High-resolution PNG or JPEG export of the transformed image.
  - **Split Comparison Snapshot**: Offscreen composite image rendering the exact current split divider ratio.
  - **Side-by-Side Comparison**: Combined side-by-side snapshot of Original and Simulated canvases.
  - **Original Image**: Export of the loaded source image.

### 6. Color Palette Simulation & Perceptual Confusion Detection (Palette Audit Tab)
- **Multi-Source Import**: 1-click import from active studio color, shared working palette, or extracted image colors.
- **Dual Swatch Cards**: Side-by-side display of original vs transformed HEX and RGB values.
- **Interactive Action Controls**: 1-click **Copy** (`copy` icon) for transformed HEX values and **Select** (`crosshair` icon) to activate the simulated color in the studio workspace.
- **CIELAB $\Delta E$ Perceptual Audit**:
  - Calculates CIE76 color difference between all pairwise combinations in the palette.
  - Flags **Indistinguishable Color Collapses** where colors separated in normal vision ($\Delta E_{orig} \ge 12$) collapse under simulated vision ($\Delta E_{sim} < 11$).
  - Identifies `'severe'` and `'moderate'` confusion risks with explanatory badges.

---

## 12. Cross-Module Integration & Multi-Format Architecture (Phase 10)

The shared color engine and reactive state layer power all six modules with seamless state synchronization, persistent storage, and universal export pipelines:

### 1. Unified State & Storage Model
- **Reactive Signals Store**: `ColorStudioStateService` acts as a centralized Angular Signals store, preserving all sub-states (`selectedColor`, `savedColors`, `colorHistory`, `sharedWorkingPalette`, `savedPalettes`, `savedGradients`, `activeModule`) across module navigation.
- **LocalStorage Synchronization**:
  - `acklet.colorstudio.selected`: Active workspace color with auto-restore on reload.
  - `acklet.colorstudio.saved`: Array of user-bookmarked swatches with custom names and timestamps.
  - `acklet.colorstudio.history`: Rolling 20-entry FIFO history stack with duplicate deduplication.
  - `acklet.colorstudio.palette`: Studio-wide Shared Working Palette (2 to 10 swatches).
  - `acklet.colorstudio.saved_palettes`: User-saved multi-color schemes with custom tags and names.
  - `acklet.colorstudio.saved_gradients`: Custom linear, radial, and conic gradient configurations.
- **Fault-Tolerant Deserialization**: Corrupted or malformed localStorage records are automatically caught and reset to safe defaults without runtime crashes.

### 2. Cross-Module Workflows
1. **Workflow A: Color Picker → Palette Generator → Gradient Generator → Contrast Checker**:
   - Brand color chosen in the 2D visual spectrum picker is dispatched to the Palette Generator to generate harmonic variations (e.g., Analogous 5-swatch scheme).
   - Harmonic swatches populate the CSS Gradient Builder stops.
   - Stop endpoint swatches are passed to the Contrast Checker to verify WCAG compliance across the gradient surface.
2. **Workflow B: Image Extractor → Palette Generator → Color Blindness Simulator**:
   - Dominant colors extracted via median-cut quantization from user photos are added to the Shared Color Bar.
   - Extracted palette is dispatched in 1 click into the Color Blindness Simulator to audit contrast collapses and CIELAB $\Delta E$ confusion pairs under Protanopia, Deuteranopia, Tritanopia, and Achromatopsia.
3. **Workflow C: Contrast Checker Auto-Fix → Color Picker → Shared Working Palette**:
   - Low-contrast text/background pairs (e.g. failing WCAG AA) trigger the intelligent contrast auto-fixer (`autoFixContrast`), which computes the closest compliant lightness alternative.
   - The optimized accessible color is dispatched to the Color Picker for inspection and saved to the studio Shared Color Bar.
4. **Workflow D: Simulator → Color Picker → Gradient Builder**:
   - Transformed color vision deficiency swatches can be sent directly to the Color Picker for fine-tuning or inserted as stops into active gradients.

### 3. Multi-Format Export Architecture Matrix
| Format / Spec | Generator Method | MIME Type | Target Environments |
| :--- | :--- | :--- | :--- |
| **CSS Variables** | `paletteService.generateCss()` / `exportService.generateContrastCss()` | `text/css` | Web development, Design Tokens, Root CSS |
| **Tailwind CSS** | `paletteService.generateTailwind()` | `application/javascript` | `tailwind.config.js` theme extensions |
| **JSON Specifications** | `paletteService.generateJson()` / `gradientService.generateJson()` / `exportService.generateContrastJson()` / `cvdService.generatePaletteSimulationJson()` | `application/json` | REST APIs, design system sync, CI/CD pipelines |
| **GIMP / Inkscape (GPL)** | `paletteService.generateGpl()` | `text/plain` | Open-source design tools (GIMP, Inkscape, Krita) |
| **Adobe Swatch Exchange (ASE)** | `paletteService.generateAse()` | `application/octet-stream` | Adobe Photoshop, Illustrator, InDesign (Binary 1.0) |
| **High-Res Canvas (PNG/JPEG/WebP)** | `paletteService.renderToCanvas()` / `gradientService.renderToCanvas()` / `cvdService.exportSimulatedImage()` | `image/png`, `image/jpeg`, `image/webp` | Social previews, asset downloads, client deliverables |
| **Printable Documentation** | `exportService.generateContrastReport()` / `cvdService.generateReportMarkdown()` | `text/markdown`, `application/pdf` | Accessibility compliance documentation, client handoffs |

---

## 13. UI Simplification, Centered Layout & Global Design Standards

### 1. Global Content Design Standard & Elimination of AI Filler
To ensure Color Studio and future Acklet tools remain minimal, high-utility, and professional:
- **Zero Marketing Fluff**: Stripped all decorative AI filler, exaggerated claims ("Zero Server Latency", "100% In-Browser Privacy" badge spam), repetitive bullet checklists, and oversized hero sections.
- **Concise Functional Copy**:
  - Landing title: `Color Studio` — Subtitle: `"Everything you need to choose, create and test colors."`
  - Color Picker: `"Choose and convert colors across HEX, RGB, HSL, HSV and CMYK."`
  - Image Extractor: `"Extract dominant colors and inspect pixels directly from any image."`
  - Gradient Generator: `"Design linear, radial, and conic CSS gradients with multiple color stops."`
  - Contrast Checker: `"Check readability between foreground and background colors."`
  - Palette Generator: `"Generate harmonic color palettes using color wheel rules."`
  - Vision Simulator: `"Simulate color vision deficiencies across images and palettes."`
- **Six Concise Module Cards**: Pure functional cards with icon, title, 1-line description, and `Open <Module> →`.

### 2. Standardized Centralized Content Layout & 3-Tier Responsive System
Edge-to-edge stretching across ultra-wide monitors has been eliminated in favor of a centered layout with comfortable whitespace, backed by a strict 3-tier breakpoint architecture:

- **Standardized Container**:
  ```css
  .centralized-workspace-container {
    width: min(100% - 48px, 1280px);
    margin-inline: auto;
    padding: 24px 0 48px;
    box-sizing: border-box;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 1023px) {
    .centralized-workspace-container {
      width: min(100% - 32px, 100%);
      padding: 16px 0 32px;
    }
  }

  @media (max-width: 639px) {
    .centralized-workspace-container {
      width: min(100% - 20px, 100%);
      padding: 12px 0 24px;
    }
  }
  ```

#### Responsive Breakpoint Architecture
1. **Laptop & Desktop ($\ge 1024\text{px}$)**:
   - Full side-by-side 2-column grids for all workspace stages (preview on left/top, detailed controls on right/bottom).
   - Global Acklet topbar with full breadcrumb (`⚡ Acklet / Color Studio / [Tool Name]`), centered navigation pills, and labeled actions (`Share`, `Save`, `Theme`).
2. **Tablet ($640–1023\text{px}$)**:
   - Workspaces transition to natural vertical flow; stage visual components stack above control panels.
   - Shell topbar flex layout prevents overlaps: brand icon only (wordmark hidden), breadcrumb links capped with ellipsis, centered section tabs horizontally scrollable with invisible scrollbars, icon-only Share and Save buttons.
   - Grid cards (e.g. palettes, combinations, inspiration presets) reflow into clean 2-column grids.
   - Touch targets expand to $\ge 44 \times 44\text{px}$ for all primary buttons, sliders, and controls.
3. **Mobile ($< 640\text{px}$)**:
   - Single-column flow with zero horizontal page scroll (`scrollWidth <= innerWidth`). Wide data tables, swatch strips, and code blocks scroll inside dedicated touch-scrolling containers.
   - Shell topbar shows only the active sub-tool chip; parent links and separators are collapsed. Share, Save, Theme, and Menu buttons provide $44\text{px}$ hit targets.
   - Action button rows reflow into horizontally scrollable carousels with CSS scroll snapping.
   - Modals and drop-downs dynamically scale using `width: min(..., calc(100vw - 24px))` preventing viewport spill.
   - Color Picker saturation spectrum retains a touch-optimized $4:3$ aspect ratio (`min-height: 200px`) with touch dragging.
   - Live application previews collapse sidebar/navigation chrome on mobile viewports to provide full width to metric cards and deployment tables.

- **Advertisement Architecture**: Clean alignment without permanent empty ad containers or disruptive empty side columns. Ready for modular future ad slots without altering tool centering.

### 3. Native Platform Header Integration (`ts-topbar`)
Rather than rolling custom topbars that duplicate platform controls:
- **Platform Chrome Enabled**: `showTopbar: true` on `ToolShellConfig`.
- **Breadcrumb Hierarchy**:
  - Landing Page: `⚡ Acklet / Color Studio`
  - Sub-Tool Workspaces: `⚡ Acklet / Color Studio / [ Subtool Chip ]` (with working link back to `/colorstudio`).
- **Contextual Actions in Platform Topbar**:
  - `Share`: Copies current URL with sub-tool title context (e.g. "Acklet - Color Studio: Color Picker").
  - `Save / Favorite`: Bookmarks either the parent studio or the specific sub-tool independently in local storage.
  - `Theme Toggle`: Triggers `ToolThemeService.toggleTheme()` across the entire app.
- **Sub-Tool Module Toolbar (`ColorStudioHeaderComponent`)**:
  - Rendered only on sub-tool pages (`@if (!isLanding())`).
  - Left: Compact module switcher pill `[ ⚗️ Active Module ▾ ]`.
  - Right: Active color swatch `#E11D48` and the four contextual popover anchors (Recent, Saved, Working Palette, Harmonies).

### 4. Root Cause Theme System Resolution
- **Issue**: Components referenced `var(--bg-1, #18181B)` and `var(--bg-2, #27272A)` which were missing from `tokens.css`, causing the browser engine to fall back to dark hex constants even in light mode.
- **Fix**: Centralized theme tokens in `client/packages/tool-shell/src/styles/tokens.css` under both `:root` / `[data-theme="light"]` and `[data-theme="dark"]`:
  - **Light**: `--app-background: #F8FAFC`, `--surface: #FFFFFF`, `--surface-secondary: #F1F5F9`, `--text-primary: #0F172A`, `--text-secondary: #64748B`, `--border-color: #E2E8F0`, with `--bg-base`, `--bg-1`, `--bg-2`, `--border`, `--text` aliases.
  - **Dark**: `--app-background: #09090B`, `--surface: #141416`, `--surface-secondary: #1E293B`, `--text-primary: #F4F4F5`, `--text-secondary: #A1A1AA`, `--border-color: #27272A`, with corresponding dark aliases.
- **Outcome**: Immediate, flawless contrast ($\ge 4.5:1$ WCAG AA) in both Light and Dark themes.

### 5. Contextual Workspace Popovers
Workspaces remain clean and uncluttered by moving secondary tools into lightweight floating popovers:
1. **Recent Color History** (`Clock` icon): Quick preview grid of recent colors with 1-click restoration and clear action.
2. **Saved Colors** (`Bookmark` icon): Saved bookmarked swatches with inline renaming, copy, and deletion.
3. **Shared Working Palette** (`Layers` icon): 10-swatch working palette with quick dispatch.
4. **Color Harmonies** (`Sparkles` icon): Live mathematical harmonies (Complementary, Analogous, Triadic) computed on-the-fly.

---

## 14. Testing & Verification

### Unit & Integration Test Suites
Located in:
- [`client/apps/tool-color-studio/src/app/color-studio.routes.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/app/color-studio.routes.spec.ts) (7 tests — Routing & Redirection)
- [`client/apps/tool-color-studio/src/services/color-studio-integration.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-studio-integration.spec.ts) (21 tests — Phase 10 System Integration)
- [`client/apps/tool-color-studio/src/components/simulator/simulator-module.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/simulator/simulator-module.component.spec.ts) (34 tests — Vision Simulator Module & CVD Suite)
- [`client/apps/tool-color-studio/src/services/color-blindness.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-blindness.service.spec.ts) (19 tests)
- [`client/apps/tool-color-studio/src/components/palette/palette-module.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/palette/palette-module.component.spec.ts) (47 tests — Palette & Application Theme Suite)
- [`client/apps/tool-color-studio/src/services/palette.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/palette.service.spec.ts) (31 tests)
- [`client/apps/tool-color-studio/src/components/contrast/contrast-module.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/contrast/contrast-module.component.spec.ts) (23 tests)
- [`client/apps/tool-color-studio/src/services/contrast.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/contrast.service.spec.ts) (18 tests)
- [`client/apps/tool-color-studio/src/components/gradient/gradient-module.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/gradient/gradient-module.component.spec.ts) (33 tests)
- [`client/apps/tool-color-studio/src/services/gradient.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/gradient.service.spec.ts) (26 tests)
- [`client/apps/tool-color-studio/src/components/extractor/image-extractor-module.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/extractor/image-extractor-module.component.spec.ts) (23 tests)
- [`client/apps/tool-color-studio/src/components/picker/color-picker-module.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/components/picker/color-picker-module.component.spec.ts) (22 tests)
- [`client/apps/tool-color-studio/src/services/color-engine.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-engine.service.spec.ts) (26 tests)
- [`client/apps/tool-color-studio/src/services/color-state.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-state.service.spec.ts) (21 tests)
- [`client/apps/tool-color-studio/src/services/color-studio-state.service.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-studio-state.service.spec.ts) (8 tests)
- [`client/apps/tool-color-studio/src/app/app.component.spec.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/app/app.component.spec.ts) (3 tests)

**Total: 21 test files passed, 424 tests passed (100%)**.

### Verification Commands
```bash
# Level A: Static checks, glass constraints, isolation & TypeScript compilation
node scripts/verify.mjs -A

# Level B: Feature verification & application builds
node scripts/verify.mjs -B

# Unit Tests: Vitest suite (21 test files, 414 unit & integration tests)
cd client && npx vitest run apps/tool-color-studio

# Production Angular Build
cd client && npx ng build --watch=false
```

---

## 15. Related Documents
- [standalone-tool-architecture.md](./standalone-tool-architecture.md) — Architecture of isolated tool sandboxes and platform chrome decoupling.
- [subdomain-routing-setup.md](./subdomain-routing-setup.md) — Subdomain DNS, wildcard localhost mapping, and routing dispatch.
- [ui-design-system.md](./ui-design-system.md) — Spartan UI primitives, dual-theme semantic tokens, and high-contrast rules.
- [responsive-design-system.md](./responsive-design-system.md) — Breakpoints, touch targets, and mobile view transitions.
- [performance-optimization.md](./performance-optimization.md) — Client-side rendering efficiency and canvas performance.
- [verification-guide.md](./verification-guide.md) — Tiered verification and validation standards.

---

## 16. Responsive Layout Architecture & Mobile Rebuild (360px, 390px, 768px, 1024px)

### Breakpoints & Container Constraints
- **Mobile (`< 640px`)**: Container width `calc(100% - 32px)` (16px gutters). No horizontal page scroll. Wide contents (swatches, presets) scroll inside dedicated scrollers with fade masks. Touch targets $\ge 44 \times 44\text{px}$.
- **Tablet (`640px – 1023px`)**: Single-column vertical stack with full control width. Center tabs pill horizontally scrollable inside `clamp(160px, 30vw, 240px)`.
- **Desktop / Laptop (`\ge 1024px`)**: Side-by-side two-column master studio layouts completely preserved without modification.

### Action Button Layout (Zero Word Break)
- On `< 640px`, `.workspace-actions` uses a structured grid layout (`repeat(4, minmax(0, 1fr))` or `repeat(3, minmax(0, 1fr))`) with icon positioned above label (`flex-direction: column; align-items: center; justify-content: center; min-height: 52px;`).
- Buttons enforce `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` so button labels never break character-by-character on narrow screens. Badges and count pills are docked top-right (`position: absolute; top: 4px; right: 4px;`).

### Color Picker Mobile Reordering (Zero DOM Mutation)
Using CSS `display: contents;` on `.picker-main-column` and `.picker-side-column` under `@media (max-width: 639px)`, the 4 cards are flattened into direct flex children of `.picker-workspace-grid` and reordered cleanly:
1. `order: 1` — **Color Area & Sliders** (2D Canvas + Hue/Alpha range sliders + Before/After comparison bar)
2. `order: 2` — **All Formats Panel** (5-tab channel editor + 5 quick copy rows)
3. `order: 3` — **Tints & Shades Strip** (Stepped lightness/darkness variations)
4. `order: 4` — **Color Readability & Combinations** (Accessibility preview cards)

### Gradient Generator Refinements
- **Interactive Rail**: 12px inset (`margin: 0 12px; width: calc(100% - 24px);`) preventing 0% and 100% stop marker clipping.
- **Stop Rows**: 2-row structured grid on mobile (`display: grid; grid-template-columns: 24px 1fr auto; grid-template-areas: "badge color actions" "pos pos pos"; gap: 10px; padding: 10px 12px;`):
  - Row 1: `[Badge]` (24px), `[Swatch & Hex Input]` (1fr), and `[Actions: Lock, Bookmark, Delete]` (auto).
  - Row 2: `[Position Slider]` (`flex: 1; min-width: 0;`) and `[Percentage Box]` (`flex-shrink: 0; width: 58px;`) spanning the full row without colliding with the lock button.
- **CSS Code Block**: `white-space: pre-wrap; word-break: break-all;` preventing horizontal overflow.
- **Export Grid**: Copy CSS button spans full width (`grid-column: 1 / -1;`), with `.CSS`, `JSON`, and `PNG` in 3 equal columns below.
- **Inspiration Presets**: Horizontal carousel with scroll-snap and `flex: 0 0 78%;` peek effect.

### Image Extractor Optimizations
- **Fit-Width Scaling**: On mobile, `fitToScreen()` scales image to available viewport width (`fitScale = availW / canvas.width`) with adaptive viewport height (`max-height: 60vh; height: auto;`), eliminating the 25–40% tiny box problem.
- **Structured Action Rows**: In both empty and image-loaded states, `.workspace-actions` uses a 2-column grid (`display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; width: 100%;`). `Saved Palettes` and `Working Palette` span 50% / 50% across the full width.
- **Single-Row Save Palette Input**: `.inline-save-palette` uses `display: flex; flex-direction: row; align-items: center; gap: 8px; width: 100%;` with input `flex: 1; min-width: 0;` and button `flex-shrink: 0;` labeled `+ Save`.
- **Touch Gesture Listeners**: Touch panning and pinch-to-zoom supported via `(touchstart)`, `(touchmove)`, and `(touchend)` on `#viewportRef`.
- **Size Selector**: 5 equal grid columns on mobile.

### Contrast Checker Mobile Layout & Scorecard Optimization
- **Compact Color Inputs**: Foreground and Background input cards stack with an overlapping central swap pill (`margin: -8px auto; z-index: 5;`), saving 45px of vertical space while keeping inputs clean and comfortable.
- **Zero Cutting on Swatches & Criteria**: Removed artificial `mask-image: linear-gradient(...)` rules from `.swatches-strip` and `.criterion-filter-pills` that previously clipped the rightmost swatch and filter tabs. Added `data-no-swipe` and clean horizontal overflow.
- **Scorecard Hero Fit (`score-hero-card`)**: Refactored to a compact row layout on mobile with ratio number on the left and Level AAA/AA badge pill on the right, ensuring the score and grade are fully visible together above the fold with zero truncation.
- **Touch Target & Spacing Standard**: 44px minimum action buttons, 12px card padding, and semantic token colors across light and dark modes.

---

## 17. Color Studio Global Sidebar & Vision Simulator Mobile Rebuild

### 1. Global Tool Shell Sidebar Integration & Parity
- **Enabled Across All Devices**: In [`client/apps/tool-color-studio/src/app/app.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/app/app.component.ts), `shellConfig.showSidebar` is set to `true`, embedding the canonical Acklet Tool Shell sidebar, search, category tree, favorites, and recent tools into Color Studio with exact behavioral parity to reference tools (Online Clipboard, QR Generator, Barcode Generator, File Converter).
- **Exact Interaction Model Matching Reference Tools**:
  - **Desktop ($\ge 1024\text{px}$)**: Left-edge hover hotzone (`.ts-sidebar-hotzone`, 14px hit target) opens the peek sidebar after 100ms hover intent. Moving the cursor away triggers a 240ms grace delay before closing. Clicking outside the sidebar or pressing `Escape` closes the peek view. `⌘B` / `Ctrl+B` toggles the sidebar state.
  - **Mobile ($< 1024\text{px}$)**: Swiping right starting within the left edge zone (16px–48px) triggers the mobile drawer sheet via `DrawerGestureService`. Swiping left anywhere on the drawer panel or tapping the backdrop closes it.
  - **Clean Topbar**: No manual sidebar toggle button exists in the topbar or sidebar header, matching all reference tools. The 9-dots button (`.ts-tools-grid-btn`) displays on mobile ($< 640\text{px}$) to provide access to the tool navigation drawer.
- **Gesture Isolation & Exclusion Filter**:
  - In [`client/packages/tool-shell/src/services/drawer-gesture.service.ts`](file:///Users/ayaz/Acklet-file-Converter/client/packages/tool-shell/src/services/drawer-gesture.service.ts), `isTargetExcluded()` explicitly filters touch events originating on Color Studio interactive surfaces: `canvas, .spectrum-area, .spectrum-handle, .gradient-rail-track, .stop-marker, .interactive-gradient-rail, .viewport-canvas-container, .rendered-canvas, .split-hud-bar, .split-handle, .presets-carousel, .swatches-strip, .theme-mode-segmented, .quick-swatch-circle, .swatch-card, .stop-slider`.
  - Color picking, dragging gradient stops, panning images, and moving split view handles never accidentally trigger the sidebar drawer.
- **Active Tool & Sub-Tool Highlighting**:
  - In [`client/packages/tool-shell/src/components/sidebar/ts-tool-list.component.ts`](file:///Users/ayaz/Acklet-file-Converter/client/packages/tool-shell/src/components/sidebar/ts-tool-list.component.ts), `isCurrentSubPath()` checks both exact match and sub-path termination, properly highlighting the active Color Studio module (Color Picker, Image Extractor, Gradient Generator, Contrast Checker, Palette Generator, Vision Simulator).
  - Clicking any tool or sub-item calls `onToolSelect()`, cleanly navigating and dismissing the mobile drawer.
  - Opening a Color Studio page by URL or direct link never auto-opens the sidebar.

### 2. Palette Generator Theme Mode & Saved Library
- **Theme Mode 3-Segment Control**: Updated `.controls-grid` with `min-width: 180px` for `.mode-toggle-field`. Refined `.segmented-control` to 36px height with equal 1/3 buttons (`Light`, `Dark`, `Both`) and high-contrast active pill indicator.
- **Saved Library Badge Wrapping Fix**: Added `white-space: nowrap !important; word-break: keep-all !important; flex-shrink: 0 !important; min-width: 44px; text-align: center;` to `.saved-item-mode` in the Saved Library dropdown, preventing vertical character wrapping.

### 3. Vision Simulator Mobile Layout Rebuild (Parts 1–9)
- **Part 1 (Vertical-Text Bug Elimination)**: Added `min-width: 0; width: 100%; word-break: normal; overflow-wrap: break-word;` across `.accessibility-insights-bar`, `.insights-summary`, `.insights-text`, `.conflict-alert-card`, `.conflict-content`, `.conflict-title`, and `.conflict-desc`.
- **Part 2 (Mobile Deficiency Selector)**: On `< 640px`, replaced 10 stacked chips with `.mobile-deficiency-wrap`: a full-width trigger button and bottom sheet drawer grouping Standard & Dichromacy and Anomalous Trichromacy. Hidden duplicated header `.category-pill`.
- **Part 3 (Shortened Copy)**: On `< 640px`, subtitle shortened to single line ("Simulate color vision deficiencies across images and palettes.") and empty dropzone condensed.
- **Part 4 (4-Row Toolbar & Isolated Mode Scroller)**:
  - Row A: `[Replace Image]` (min-height 44px) + `[File Meta Pill]` (with text truncation).
  - Row B: 3-segment comparison control (`[Split View] [Side-by-Side] [Simulated Only]`). The container (`.segmented-modes`) is explicitly isolated as its own horizontal scroller (`overflow-x: auto !important; overflow-y: hidden; scrollbar-width: none; justify-content: flex-start; scroll-snap-type: x proximity; data-no-swipe`), while buttons use `flex: 1 0 auto; min-width: max-content; height: 44px; white-space: nowrap;` so that on narrow mobile viewports (e.g., 360px) only this single row scrolls without clipping labels or shifting the left edge.
  - Row C: Zoom bar (`[−] [Percent] [+] [Fit] [Reset]`) with $\ge 44\text{px}$ touch targets. Parent `.tb-group-center` enforces `overflow-x: visible !important`, guaranteeing zoom controls never scroll horizontally or shift off-screen.
  - Row D: `[Inspector Toggle]` + `[Export Menu]` + `[Delete Button]`.
- **Part 5 (Split View Handle & Touch Drag)**:
  - In [`ColorBlindnessService`](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-color-studio/src/services/color-blindness.service.ts), increased center divider handle radius to 22px (44px touch target) with bold indicators.
  - Added `event.cancelable && event.preventDefault()` in `onWindowTouchMove` during active slider dragging to eliminate scrolling jitter.
- **Part 6 (Color Inspector Docked Sheet)**:
  - On mobile, `.inspector-loupe-tooltip` renders as a fixed docked card at the bottom of the viewport (`bottom: 12px; left: 12px; right: 12px;`) with a dedicated close button, original/simulated color swatches, HEX/RGB labels, and $\Delta E$ badge.
- **Part 7 (Palette Audit Mobile Layout & Action Button Grid)**:
  - Header actions: Stacks `.palette-btn` buttons cleanly on mobile `< 640px` to eliminate text collision and horizontal overflow:
    - Row 1: `+ Add Active (#HEX)` spans 100% width (`grid-column: 1 / -1; min-height: 44px;`) with room for full hex codes without text overlap.
    - Row 2: `Reset to Shared Palette` spans 100% width (`grid-column: 1 / -1; min-height: 44px;`).
    - Row 3: `Export JSON` and `Export Report (.md)` sit side-by-side in equal 50% columns (`min-height: 44px;`).
    - All button labels enforce `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` and icons have `flex-shrink: 0`.
  - Swatch cards: `.swatches-audit-grid` stacks cards in a single column (`grid-template-columns: 1fr; width: 100%; gap: 12px;`).
  - `.swatch-card-actions` renders `[Copy]` and `[Select]` at 50% width each with 44px min-height.
  - Bottom palette dispatch buttons: `.palette-dispatch-btn` elements stack at 100% width with `min-height: 48px; white-space: normal; text-align: center; line-height: 1.35; padding: 0.625rem 0.85rem;`, and icons enforce `flex-shrink: 0`, completely preventing flex-center negative left-margin clipping where icons were previously cut in half.
  - Card padding on mobile is set to `padding: 14px 12px 3.5rem;` to ensure the floating scroll-to-top button never covers the bottom dispatch actions.
- **Part 8 (Hold to View Original HUD High-Contrast Pill)**:
  - In Simulated view, the floating `.peek-btn` HUD pill ("Hold to View Original" / "Showing Original") over the canvas is protected against global and Light Theme button hover/active resets with solid dark slate (`background: #0F172A !important; color: #FFFFFF !important; border: 1.5px solid rgba(255, 255, 255, 0.35) !important;`).
  - Added explicit `:host-context([data-theme="light"])` selectors for `.peek-btn`, `.peek-btn:hover` (`#1E293B !important`), and `.peek-btn.active` (`#2563EB !important`), preventing white-on-white text washing.
  - Template markup incorporates inline `style="color: #FFFFFF !important;"` on the button, icon, and text span as a resilient safeguard.
  - On active hold / peek: transitions to vivid royal blue (`#2563EB !important; border-color: #93C5FD !important; color: #FFFFFF !important;`) with a 3px blue glow ring, guaranteeing high contrast (WCAG AA > 4.5:1) in both Light and Dark themes.
  - Added `(touchcancel)="stopPeekingOriginal()"` and `(touchstart)="$event.stopPropagation()"` to isolate peek gestures from canvas interactions.
- **Part 9 (Spacing & Touch Targets)**:
  - 16px screen gutters, 12px card gaps, and $\ge 44 \times 44\text{px}$ touch targets throughout. No horizontal page scroll.

---

## 18. Contrast Checker & Color Picker Responsive Layout Architecture

### 1. Unified Breakpoint Standard
- **Phone**: Viewport width $< 640\text{px}$ (tested at 360px and 390px). All cards stack full-width in intentional reading order.
- **Tablet**: Viewport width $640\text{px} - 1023\text{px}$ (tested at 768px portrait and 1032px iPad Pro 13 portrait). Dual-column layout activates when both columns fit at $\ge 360\text{px}$; otherwise Section 1 (Color Selection) and Section 2 (Contrast Ratio) sit side-by-side above full-width WCAG criteria and suggestions.
- **Desktop**: Viewport width $\ge 1024\text{px}$ (tested at 1280px and 1440px). Reference two-column layout with Left Column (Controls, Scores, WCAG Matrix, Suggestions) and Right Column (Contextual Accessibility Preview, Gradient Contrast).

### 2. Contrast Checker Architecture (`ContrastModuleComponent`)
- **Header Actions**:
  - **Desktop / Tablet ($\ge 640\text{px}$)**: Single row of three action buttons with `.label-full` ("Swap Colors", "Copy Ratio", "Export & Share") and chevron dropdown indicator.
  - **Phone ($< 640\text{px}$)**: Single row 3-equal-column grid (`repeat(3, minmax(0, 1fr))`) with icon above label (`.label-short`: "Swap", "Copy ratio", "Export"). Chevron hidden; full text readable without hidden label or truncation. Min-height $48\text{px}$ satisfying touch standards.
- **Color Selection Card**:
  - **Format Tabs**: Segmented full-width 3-column control (`HEX`, `RGB`, `HSL`) with $36\text{px}$ min-height.
  - **Foreground & Background Inputs**: Stacked vertically on phone. Left: 36px color swatch; Center: `#` and hex text input filling remaining width; Right: native palette trigger.
  - **Centered Swap Button**: Centered between the Foreground and Background cards with dedicated $44\text{px}$ clearance (`.swap-divider`, `width: 100%; height: 44px; margin: 0;`), completely eliminating awkward floating border overlap.
- **Quick Swatches Grid & Overflow (`+N`)**:
  - Replaced horizontal scroll strip with a structured 4-column $\times$ 2-row grid (`.swatches-grid-container`).
  - First 7 swatches display dot button and `BG` mini-pill. If more than 8 swatches exist, the 8th position displays a high-contrast `+N` overflow button (`+{{ remainingSwatchesCount() }}`).
  - Tapping `+N` sets `showAllSwatches.set(true)` to reveal the full palette with a "Show Less" toggle button. Zero horizontal scrolling.
- **Scorecard Hero Card (`.score-hero-card`)**:
  - **Line 1**: Monospace ratio number (34px), copy ghost button, and rating badge.
  - **Line 2**: Level badge (`Level AAA` / `Level AA`) spanning 100% width with centered text and $40\text{px}$ min-height.
  - **Line 3**: Explanatory description text spanning 100% width with $1.35$ line height. Zero text clipping or truncation.
- **WCAG 2.2 Conformance Matrix**:
  - Filter tabs (`All`, `AA`, `AAA`, `Normal`, `Large`, `UI`) with $38\text{px}$ touch targets.
  - Each criterion row renders name and threshold badge on the left, and PASS/FAIL badge on the right, filling container width.
- **Realistic Accessibility Preview (`preview-card-wrapper`)**:
  - Rendered as full-width card below criteria on phone (`order: 2`).
  - Dark Frame / Light Frame toggle spans full width (`grid-template-columns: 1fr 1fr; min-height: 36px;`).
  - Headings scale to 20px, body text to 14px, interactive outline and primary buttons stack at 100% width, eliminating overflow.
- **Color Suggestions Card (`.sugg-card`)**:
  - Re-anchored to Left Column below unified card on Desktop, giving it full column width instead of cramped side-by-side squishing.
  - Target AA and Target AAA filter tabs form 2 equal full-width segments (`min-height: 38px`).
  - **Phone ($< 640\text{px}$)**: Swatch (40px) and name/hex on row 1 (name clamped to 2 lines via `-webkit-line-clamp: 2`); `Apply Text` / `Apply Background` button full width on its own line below row (`min-height: 44px`).
  - **Tablet & Desktop ($\ge 640\text{px}$)**: Swatch (40px), name and hex (2 lines max), and fixed $120\text{px}$ Apply button on the right. No character-per-line vertical breaking.
- **Gradient Background Multi-Point Contrast (`.grad-card`)**:
  - Full-width card in Right Column below Realistic Preview.
  - Stops table (`.grad-stops-table`) structured with `.stop-left-group` (swatch, stop %, hex) and `.stop-right-group` (ratio, PASS/FAIL badge). Allows clean responsive wrap without horizontal clipping.

### 3. Color Picker Architecture (`ColorPickerModuleComponent`)
- **Reference Layout**: Dual-column layout matching iPad Pro 13 portrait ($1032\text{px}$) applied from $768\text{px}$ and up:
  - **Left Column**: Visual 2D Canvas & Sliders (`.picker-visual-card`), Readability & Color Combinations (`.combinations-card`).
  - **Right Column**: All Formats master card (`.formats-master-card`), Tints & Shades (`.tints-shades-card`).
- **Phone Stacked Order ($< 768\text{px}$)**:
  - 1. Visual 2D Canvas & Sliders (`order: 1`)
  - 2. All Formats Card (`order: 2`)
  - 3. Tints & Shades Card (`order: 3`)
  - 4. Readability & Color Combinations (`order: 4`)
- **Mobile Toolbar (4 Columns $\times$ 2 Rows)**:
  - Buttons use icon above label with min-height $52\text{px}$.
  - Multi-line breaks introduced via `.mobile-break` and `.mobile-break-space`:
    - "Saved Colors" $\rightarrow$ "Saved<br>Colors"
    - "Working Palette" $\rightarrow$ "Working<br>Palette"
  - Labels display fully without `text-overflow: ellipsis` truncation or character-by-character breaking.
  - Counter pill and dot indicators positioned cleanly in the top-right corner.
- **2D Canvas Spectrum**:
  - Responsive aspect-ratio ($4/3$) on mobile/tablet with $200\text{px}-360\text{px}$ bounds.
  - Hue and Alpha slider rows adapt to 3-column grid (`44px 1fr 64px`) on mobile with 44px min-height touch targets.


