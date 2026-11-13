# Acklet Image Compressor — UI & Content Audit Findings & Resolution

This document tracks the UI & content simplification audit across all 7 application screen states (Empty, Uploading, Analyzing, Ready, Compressing, Done, Error) at both desktop (1280×900) and mobile (375×812) viewports.

Baseline ("before") and final ("after") screenshots are archived in:
- `docs/ui-audit/*.png` (Baseline screenshots before simplification)
- `docs/ui-audit/after/*.png` (Final screenshots after simplification)

---

## 1. Audit Rules & Principles Applied

1. **Keep**: Only what the user must read or interact with to take the immediate next step (file name, size savings, actionable error recovery, primary action button).
2. **Shorten**: Replaced multi-sentence paragraphs and verbose labels with concise, plain sentences (under 12 words, sentence case).
3. **Progressive Disclosure**:
   - Only Format, Quality slider, and 3 Smart Presets visible initially in Settings.
   - Target file size, dimensions resizing, chroma subsampling, lossless WebP, responsive variants, and developer presets moved into an **"Advanced options"** accordion.
   - Secondary actions, session profiles, feedback, and audit reports moved into a compact **"More"** dropdown.
   - Detailed image metrics (dimensions, quality score, format change, variants, metadata) moved into an expandable **"Details"** drawer on each card.
4. **Single Primary Action**: Exactly one filled primary button visible per screen state. All other actions rendered as outline, ghost, or secondary link buttons.
5. **No Technical Clutter / Jargon**: Removed or replaced technical jargon (SSIM, PSNR, chroma subsampling, bicubic, EXIF) in standard user flows.
6. **Mobile First**: Single column under 768px, sticky bottom sheet for the primary action button, zero horizontal scroll at 375px.

---

## 2. Complete Visible Controls & Content Audit Matrix

| Location | Original Content | Target User | Decision | Final Resolution & Implementation State |
|---|---|---|---|---|
| **Landing: Dropzone Title** | "Drop your images here, or browse" | User | Shorten | **Resolved**: Changed to `"Drop images here, or click to choose."` |
| **Landing: Dropzone Subtitle** | "Supports JPEG, PNG, WebP, AVIF, GIF, SVG, BMP, HEIC/HEIF • Up to 50 files • Max 50 MB per file" | User | Shorten | **Resolved**: Shortened to `"Up to 50 files, 50 MB each."` Format list moved to tooltip. |
| **Landing: Browse Button** | "Select Images from Device" | User | Shorten | **Resolved**: Renamed to `"Choose images"` (the only filled primary button on empty state). |
| **Landing: Privacy Note** | "100% Client-Side In-Browser Compression: Your images never leave your computer..." | User | Shorten | **Resolved**: Single reassuring helper line: `"Your images stay on your device."` |
| **Landing: Marketing Cards** | 4 multi-paragraph cards ("Smart Compression", "Batch Processing", "Zero Data Leaks", "Developer Presets") | Nobody (in-tool) | Remove | **Resolved**: Removed completely. Zero visual clutter before adding files. |
| **Flow Progress Indicator** | None (missing) | User | Add | **Resolved**: Added 3-step progress bar at top: `Add images` → `Choose settings` → `Download`. |
| **Header: Top Bar Title** | "Image Compressor" | User | Keep | **Resolved**: Clean header title with session counter pill. |
| **Header: Add Images Button** | "Add Images" | User | Keep (Secondary) | **Resolved**: Outline secondary button with `+` icon (`Choose more`). |
| **Header: Action Buttons** | "Profiles", "Feedback", "Report", "New Session" | Developer / Power User | Move to More | **Resolved**: Consolidated into single compact `"More"` dropdown menu. |
| **Header: Clear All Button** | "Remove All" | User | Keep (Secondary) | **Resolved**: Secondary ghost button; triggers plain confirmation modal: `"Remove X images? This can't be undone."` |
| **Toolbar: Bulk Actions** | "Compress Selected (X)", "Apply Global Settings", "Clear Completed", "Report" | Developer / User | Simplify | **Resolved**: Retained `"Compress selected"` and `"Remove selected"`. Moved report, profile, and completed cleanup to `"More"` menu. |
| **Filter Bar: Category Pills** | "All", "Photos", "Screenshots", "Graphics", "Logos", "Optimal" | Power User | Conditional | **Resolved**: Hidden for batches < 5 items; displayed as compact filter pills only when >= 5 items. |
| **Card: Primary Content** | Thumbnail, filename, 4 status badges, 5 action buttons | User | Simplify | **Resolved**: Card shows only: thumbnail, file name, original size → new size, savings %, and single primary button (`Compress` / `Download`). |
| **Card: Dimensions & Format** | "1920 × 1080", "PNG → WebP", "Optimal" badge | User | Move to Details | **Resolved**: Moved inside collapsible `"Details"` drawer. |
| **Card: Quality Score (SSIM)** | "SSIM 0.985 (excellent)", "PSNR 42.1 dB" | Developer | Plain Language | **Resolved**: Replaced with intuitive `"Quality: 99/100"` score inside Details drawer with tooltip explanation. |
| **Card: Progress Indicator** | Multi-phase status text ("Decoding image stream...", "Applying Lanczos3 resize...", "Encoding WebP chunks...") | Developer | Shorten | **Resolved**: Single clean progress bar with exact percentage (`45%`); internal decode/resize/encode labels hidden from user view. |
| **Card: Error Feedback** | Raw exception strings (`FILE_SIZE_LIMIT_EXCEEDED: 54200000 > 52428800`) | User | Plain Language | **Resolved**: One clear sentence explaining the issue and one actionable recovery: `"This file is too large (max 50 MB). Try a smaller file."` |
| **Settings: Basic Controls** | 24 visible inputs, toggles, submenus, and selects | User | Progressive Disclosure | **Resolved**: Only 3 controls visible by default: **Format** (Original / JPEG / PNG / WebP / AVIF), **Quality slider** ("Smaller file" to "Sharper image"), and **Smart presets** (Best Quality, Balanced, Smallest Size). |
| **Settings: Target File Size** | "Target File Size Optimizer (KB / MB) with tolerance" | Power User | Move to Advanced | **Resolved**: Moved to collapsed `"Advanced options"` accordion under `"Aim for a file size"`. |
| **Settings: Resize Dimensions** | Width, height, aspect ratio lock, resize mode | Power User | Move to Advanced | **Resolved**: Moved to collapsed `"Advanced options"` accordion under `"Resize dimensions"`. |
| **Settings: Metadata Privacy** | "Metadata Privacy Policy: Remove / Strip GPS / Preserve" | User | Shorten | **Resolved**: Replaced with single plain switch under Advanced: `"Remove location info"` (on/off). |
| **Settings: Advanced Codecs** | Chroma subsampling, effort level, clean transparent pixels, lossless WebP | Developer | Move to Advanced | **Resolved**: Moved to collapsed `"Advanced options"` accordion with plain labels (`"Color detail: Sharp edges 4:4:4"`, `"Clean transparent pixels"`). |
| **Settings: Variants & Presets** | Multi-variant generators & developer preset cards | Developer | Move to Advanced | **Resolved**: Moved under `"Advanced options"` accordion. |
| **Summary Bar: Primary Action** | 4 primary-colored buttons fighting for attention | User | Single Action | **Resolved**: Exactly ONE primary filled button: `"Compress all"` (when ready) or `"Download all (ZIP)"` (when done). All others are secondary outline/ghost. |
| **Summary Bar: Technical Stats**| "Average SSIM 0.982 • PSNR 42 dB • Zero-PII Telemetry Active" | Developer | Remove / Tooltip | **Resolved**: Removed telemetry and raw math from main bar; moved comprehensive statistics into Audit Report modal in `"More"` menu. |
| **Mobile: Summary Bar** | Horizontal row overflowing viewport | Mobile User | Mobile First | **Resolved**: Rendered as a sticky bottom sheet with full-width primary button and zero horizontal scrolling. |

---

## 3. Screen State Verification Summary

Verification screenshots were captured across both Desktop (1280×900) and Mobile (375×812) viewports:

| State | Desktop Screenshot | Mobile Screenshot | Primary Action on Screen | Jargon Present? |
|---|---|---|---|---|
| **1. Empty** | `docs/ui-audit/after/empty-desktop.png` | `docs/ui-audit/after/empty-mobile.png` | `"Choose images"` | None |
| **2. Uploading** | `docs/ui-audit/after/uploading-desktop.png` | `docs/ui-audit/after/uploading-mobile.png` | Progress indicator | None |
| **3. Analyzing** | `docs/ui-audit/after/analyzing-desktop.png` | `docs/ui-audit/after/analyzing-mobile.png` | Progress indicator | None |
| **4. Ready** | `docs/ui-audit/after/ready-desktop.png` | `docs/ui-audit/after/ready-mobile.png` | `"Compress all"` | None |
| **5. Compressing** | `docs/ui-audit/after/compressing-desktop.png` | `docs/ui-audit/after/compressing-mobile.png` | Percentage progress bar | None |
| **6. Done** | `docs/ui-audit/after/done-desktop.png` | `docs/ui-audit/after/done-mobile.png` | `"Download all (ZIP)"` | None |
| **7. Error** | `docs/ui-audit/after/error-desktop.png` | `docs/ui-audit/after/error-mobile.png` | `"Choose images"` / Recovery | None |

---

## 4. Key Improvements Summary

1. **What was removed**:
   - 4 verbose marketing feature cards on empty landing page.
   - Developer telemetry badges and internal worker debug labels.
   - Internal pipeline stage names (`decoding`, `applying Lanczos3`, `encoding chunks`) on progress bars.
   - Decorative gradient borders, heavy shadows, and decorative rings.

2. **What was moved to "Advanced options" (collapsed accordion)**:
   - Target file size optimizer input (`Aim for a file size`).
   - Image resize controls (`Resize dimensions`).
   - Location info stripper (`Remove location info`).
   - Advanced codec options (Color detail 4:4:4, Clean transparent pixels, Lossless WebP).
   - Responsive variant generator (320, 640, 1280, 1920px).
   - Developer optimization presets (Website, Blog, E-commerce, Social, Thumbnail, Retina).

3. **What was moved to "More" (dropdown menu)**:
   - Session Profiles manager.
   - Optimization audit report.
   - Clear completed files.
   - User feedback.
   - Start new session.

4. **What text changed**:
   - `"Drop your images here, or browse"` → `"Drop images here, or click to choose."`
   - `"Select Images from Device"` → `"Choose images"`
   - `"100% Client-Side In-Browser Compression: Your images never leave your computer..."` → `"Your images stay on your device."`
   - `"Supports JPEG, PNG, WebP... Max 50 MB"` → `"Up to 50 files, 50 MB each."`
   - `"SSIM 0.985 (excellent)"` → `"Quality: 99/100"` (inside Details drawer)
   - Quality slider: Added plain guides `"Smaller file"` and `"Sharper image"`.
   - Compression completion banner: `"Done. Saved X images, Y% smaller."`
   - Confirmation modals: `"Remove X images? This can't be undone."`
