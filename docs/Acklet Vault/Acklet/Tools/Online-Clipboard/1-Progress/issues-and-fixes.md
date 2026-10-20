---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Issues, Root Causes & Fixes

This document records notable engineering issues, bugs, and edge cases discovered during the development and stabilization of Online Clipboard, along with root-cause analyses and preventive measures.

---

## Issue Log

### Issue #1: `ConcurrentHashMap` Recursive Update Exception in `ClipboardService`
- **Discovered**: During rapid multi-file concurrent upload stress testing.
- **Symptom**: HTTP 500 error on file chunk uploads (`IllegalStateException: Recursive update`).
- **Root Cause**: `shareStore.computeIfAbsent()` in `ClipboardService` invoked an internal helper method that performed another `computeIfAbsent` on the same `ConcurrentHashMap`, violating Java 8+ map locking semantics.
- **Fix**: Separated room auto-provisioning into a thread-safe explicit lookup and assignment block prior to item ingestion:
  ```java
  if (!shareStore.containsKey(clean)) {
      shareStore.put(clean, createInitialShare(clean));
  }
  ```
- **Prevention**: Enforce architectural guidelines prohibiting nested mutations within concurrent collection lambdas.

---

### Issue #2: Single-Click Lightbox Triggered Prematurely on Double-Click Selection
- **Discovered**: In the Files & Images tab while testing double-click selection/deselection.
- **Symptom**: Double-clicking a file card to select/deselect it caused the image lightbox to flicker open before the selection could register.
- **Root Cause**: The standard `(click)` event fired on the first click and immediately opened the preview modal before the `(dblclick)` event was dispatched by the browser.
- **Fix**: Implemented a 250ms debounced click handler in `ClipboardComponent`:
  ```typescript
  onItemClick(item: ClipboardItem, event: MouseEvent): void {
    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
      return; // Handled by dblclick
    }
    this.clickTimeout = setTimeout(() => {
      this.openPreview(item);
      this.clickTimeout = null;
    }, 250);
  }
  ```
- **Prevention**: Unit test multi-click interactions in `clipboard-features.spec.ts` (Suite 7).

---

### Issue #3: Jarring Browser Unload Dialogs on Tab Closure
- **Discovered**: When closing or reloading tabs with unsaved edits in the text canvas.
- **Symptom**: Native browser confirmation dialog ("Changes that you made may not be saved") disrupted user workflow.
- **Root Cause**: An aggressive `window:beforeunload` event handler set `event.returnValue` to prompt the user.
- **Fix**: Eliminated the modal and implemented `saveTextOnSuddenExit()` using `fetch(..., { keepalive: true })`:
  ```typescript
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Token': ownerToken },
    body: JSON.stringify({ text, expectedVersion }),
    keepalive: true
  }).catch(() => {});
  ```
  Text changes are silently streamed to the server even after the window terminates.
- **Prevention**: Always prefer silent background persistence over disruptive browser dialogs.

---

### Issue #4: Boundary Scroll Lock Trapping Page Scrolling to FAQ/About
- **Discovered**: Trackpad and touch swipe navigation attempting to scroll down from the clipboard into the About and FAQ documentation sections below the tool.
- **Symptom**: Scrolling ceased when reaching the bottom of the file list or text canvas.
- **Root Cause**: `overscroll-behavior-y: contain` on `.clipboard-content-scroller` prevented momentum scroll chaining from reaching the parent `.ts-main-scroll-container`.
- **Fix**: Updated CSS to `overscroll-behavior-y: auto;` on internal scrollers:
  ```css
  .clipboard-content-scroller {
    overscroll-behavior-y: auto;
  }
  ```
- **Prevention**: Audit scroll chaining across both desktop trackpads and mobile touch screens on full-bleed tools.

---

### Issue #5: Premature Text Truncation in Link Detector
- **Discovered**: When URLs in text ended with sentence punctuation (e.g. *"Visit https://angular.dev."*).
- **Symptom**: The trailing period was included in the URL candidate, resulting in a broken 404 hyperlink (`https://angular.dev.`).
- **Root Cause**: Naive regex character matching included trailing punctuation.
- **Fix**: Added trailing punctuation stripping regex:
  ```typescript
  url = url.replace(/[.,;:!?)]+$/, '');
  ```
- **Prevention**: Comprehensive unit tests covering URLs followed by periods, commas, questions, and closing parentheses.
