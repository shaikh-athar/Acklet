# Acklet Image Compressor — Workspace Actions, Output Actions & Repeated Customization

**Date:** November 2026  
**Status:** Shipped & Verified  
**Author:** Acklet Senior Image Processing & Frontend Engineering Team  
**Related Documents:**
- [image-compressor.md](image-compressor.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE3_CORRECTIONS_QUALITY_OPTIMIZATION.md](ACKLET_IMAGE_COMPRESSOR_PHASE3_CORRECTIONS_QUALITY_OPTIMIZATION.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md](ACKLET_IMAGE_COMPRESSOR_PHASE4_ACHIEVABLE_SIZE_INTELLIGENCE.md)
- [ACKLET_IMAGE_COMPRESSOR_PHASE3_INTELLIGENT_OPTIMIZATION.md](ACKLET_IMAGE_COMPRESSOR_PHASE3_INTELLIGENT_OPTIMIZATION.md)

---

## 1. Executive Summary

This engineering update reorganizes workspace and output action surfaces and implements full support for **Repeated Customization using the latest compressed image as the active source**:

1. **Removal of Workspace "More" Dropdown**: Eliminated the cluttered four-item More dropdown in the working screen (optimization profiles, audit report, send feedback, start over) along with its triggers, handlers, and menu state.
2. **Relocation of Optimization Profiles**: Moved the **Optimization Profiles** entry directly into the right-hand **Compression Settings** sidebar, placed as a clean, accessible text link directly beneath the Transforms section.
3. **Dedicated Output Screen "More" Dropdown**: Created a focused More dropdown on the output/results screen containing strictly:
   - **Audit Report** — Displays the session compression report (`app-report-modal`).
   - **Shareable Settings Link** — Copies the base64-encoded URL hash with user feedback and auto-closes the menu.
4. **Clean Workspace Actions**: Removed Send Feedback and Start Over from the workspace header. Workspace cleanup is handled by Clear All, while Start Over is preserved on the Output screen.
5. **Repeated Customization Workflow**: When an image is customized again following a completed compression pass (e.g. 1.0 MB $\rightarrow$ 300 KB), the new customization session, size discovery calculations, dimensions, preview, and subsequent compression pass operate directly on the 300 KB compressed output.
6. **Pristine Original Image Preservation**: The original uploaded file, dimensions, byte size, and format are preserved in immutable `originalUploaded*` fields on `ImageItem`, enabling instantaneous restoration via `resetToOriginal()`.

---

## 2. Technical Architecture & Implementation

### 2.1 Workspace and Output UI Changes

- **Workspace Header**:
  - Removed `.more-menu-wrapper`, `isMoreMenuOpen`, `toggleMoreMenu()`, and `closeMoreMenu()`.
  - Removed Send Feedback and Start Over buttons from the workspace header.
- **Settings Panel (`settings-panel.component.ts`)**:
  - Below Section 3 (Transforms), added Section 4 (Optimization Profiles):
    ```html
    <div class="profiles-link-row">
      <button
        type="button"
        class="profiles-text-link"
        (click)="openProfileManager.emit()"
        title="Open optimization profiles"
        aria-label="Optimization profiles"
      >
        <ts-icon name="bookmark" [size]="12" />
        <span>Optimization profiles</span>
      </button>
    </div>
    ```
- **Output Screen (`image-compressor.component.html`)**:
  - Replaced standalone copy settings button with `.output-more-wrapper` controlled by `dropdownManager.isOpen('output-more')`.
  - Outside click (`document:click`) and Escape (`document:keydown.escape`) close the dropdown via `DropdownManagerService.closeAll()`.
  - Options strictly: Audit Report and Shareable Settings Link.

### 2.2 Repeated Customization & Latest-Source Tracking

```
[Uploaded File: 1.0 MB PNG]
        │
        ├──> originalUploadedFile (Preserved permanently)
        ├──> originalUploadedSize: 1,048,576 B
        │
  [Compression Pass 1] ──> Output: 300 KB PNG
        │
        ▼
[currentWorkingSource Updated]
  • file: new File([300 KB blob], 'photo.png')
  • size: 307,200 B
  • iteration: 1
        │
  [User clicks "Customize again"] ──> prepareForCustomization(id)
        │
        ├──> item.file = 300 KB File
        ├──> item.originalSize = 307,200 B (Displayed in modal header)
        ├──> AchievableSizeDiscovery runs on 300 KB source
        ├──> Slider target bounds scaled to 300 KB
        │
  [Compression Pass 2] ──> Output: 180 KB PNG
        │
        ▼
[currentWorkingSource Updated (iteration: 2)]
  • file: new File([180 KB blob], 'photo.png')
  • size: 184,320 B
        │
  [Optional User Action: "Keep original" / resetToOriginal()]
        │
        └──> Reverts item.file back to originalUploadedFile (1.0 MB)
```

### 2.3 Tile Metrics & Customize Modal Header Metrics Synchronization
- **Tile Metrics Display**:
  - In `image-card.component.ts`, when `cardStatus().reduced` is `false` (e.g. `No reduction` or kept at original size), the metric row now displays `formattedCompressedSize()` (e.g. `857 B`) rather than leaving a blank line.
  - When reduced, it displays `formattedOriginalSize() → formattedCompressedSize() (-savedPercent%)`.
  - On the working screen before compression, it displays `formattedOriginalSize()` (or `formattedOriginalSize() → est. formattedEstimatedSize()`).
- **Customize Modal Header Synchronization**:
  - In `customization-modal.component.ts`, `headerWidth`, `headerHeight`, `headerSize`, and `headerExtension` computed signals dynamically reflect the compressed output specifications (`item.result` or `item.currentWorkingSource`) instead of stale original upload values.
  - Line 111 and Line 116 now render `.{{ headerExtension() }}` and `{{ headerWidth() }} × {{ headerHeight() }} px • {{ formatBytes(headerSize()) }}`.
  - The preview mini-card pill and resolution reflect `headerExtension()` and `headerWidth() × headerHeight() px`.
  - `referenceBytes()` is bound to `headerSize()` so subsequent slider scaling and achievable profile validations evaluate directly against the compressed baseline.

### 2.4 Data Consistency Across Batch & Screens
- **Batch Isolation**: Every `ImageItem` maintains its own `currentWorkingSource` and `originalUploaded*` state independently. Customizing one image in a batch does not alter the source of any other item.
- **Screen Navigation**: Returning from Output Screen to Working Screen ("Back to Working") retains the latest working source without reverting.
- **Dynamic Target Adjustment**: In `customization-modal.component.ts`, if an image had previous custom target settings that are now greater than or equal to the new compressed size (e.g. 500 KB target on a 300 KB file), it automatically recalculates a fresh achievable default target (e.g. 240 KB).

---

## 3. Verification & Test Evidence

### 3.1 Dedicated Test Suite
`client/apps/tool-image-compressor/src/services/workspace-actions-repeated-customization.spec.ts`:
- **Test 1:** Optimization profiles state management without workspace more dropdown.
- **Test 2:** Output-more dropdown management with `DropdownManagerService` and outside-click closure.
- **Test 3:** Audit report corresponds to current session.
- **Test 4:** Repeated customization adopts 300 KB compressed output as source while preserving 1.0 MB original uploaded file.
- **Test 5:** Subsequent compression adopts 180 KB output as next source (iteration 2).
- **Test 6:** `resetToOriginal()` cleanly reverts all dimensions, format, file, and size back to pristine original uploaded file.
- **Test 7:** Batch isolation ensures independent source evolution across images.
- **Test 8:** Shows compressed size in tile when image is completed even with No reduction (`reduced: false`).
- **Test 9:** Updates size, resolution, and extension after compression in customize modal header.

### 3.2 Full Tool Suite
```
Test Files  51 passed (51/51)
Tests       461 passed (461/461)
Duration    15.05s
```

### 3.3 Security & Publishing
- 100% client-side WebAssembly execution; zero bytes sent over the network.
- Working tree remains strictly uncommitted.
