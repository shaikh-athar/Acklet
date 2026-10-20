---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Progress
---

# Issues & Fixes

Track all bugs found, root causes, and solutions.

---

## Bug #1: Color Picker Not Updating QR in Real-Time

**Found**: 2026-10-16, InputPanelComponent during testing

**Description**: 
User changes foreground color via color picker → QR image doesn't update immediately.

**Root Cause**: 
Event binding was `(ngModelChange)="..."` but color input doesn't reliably fire ngModelChange. Should use native `(change)` event instead.

**Fix Applied**:
Changed `(ngModelChange)="onColorChange()"` to `(change)="onColorChange()"` in ColorCustomizerComponent template.

**Testing**:
- Tested color change: now updates in < 100ms
- Tested on Chrome, Firefox, Safari (all work)
- Mobile: Works on iOS Safari + Chrome mobile

**Prevention**:
- Prefer native events `(change)` over Angular-specific `(ngModelChange)` for native inputs
- Test color/number/range inputs separately

---

## Bug #2: CSS Variables Not Loaded on First Page Load

**Found**: 2026-10-17, during styling pass

**Description**: 
Tool loads, but colors appear as defaults (black/white) instead of emerald accent. After hard refresh, accent appears.

**Root Cause**: 
Theme CSS variables not defined in global `styles.scss` before QRGeneratorComponent initializes. Component tries to use `var(--color-accent)` but variable doesn't exist yet.

**Fix Applied**:
Moved theme token definitions to `src/styles/theme-tokens.scss` and ensured it's imported before any component styles in `angular.json` styles array.

**Testing**:
- Fresh page load: accent now appears immediately
- Dark/light mode toggle: works correctly
- Inspector shows variables defined at `:root`

**Prevention**:
- Always define CSS variables in global styles BEFORE component imports
- Test page load (hard refresh) not just reload

---

## Bug #3: Download Button Disabled on Empty Content

**Found**: 2026-10-18, integration testing

**Description**: 
Download button shows disabled (grey) even when QR is visible on screen. User confused.

**Root Cause**: 
Service returns null if content empty; parent sets `isLoading = false` but `qrDataUrl` stays null → button binding `[disabled]="!qrDataUrl || isLoading"` evaluates to true.

**Intended Behavior**: 
Button should only be disabled if QR is actually generating. If QR is visible, button should be enabled.

**Fix Applied**:
Added check: `isLoading || !qrDataUrl ? disabled : enabled`  and ensured qrDataUrl is never null (defaults to empty string if no content).

**Testing**:
- Empty content → button disabled ✓
- Type content → button enabled ✓
- Download → file saved ✓

**Prevention**:
- Be explicit about null vs empty state
- Test happy path + empty state separately

---

[Add more bugs as you find them during development]

---

**Template**: 
- Bug title
- Found: [date, location]
- Description: [what happened]
- Root cause: [why]
- Fix: [what you did]
- Testing: [how you verified]
- Prevention: [how to avoid next time]
