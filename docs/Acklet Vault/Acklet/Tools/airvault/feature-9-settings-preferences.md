# Feature 9 — Settings and Preferences Specification

## 1. Executive Summary & Objective

**Feature 9 (Settings and Preferences)** empowers users to customize their AirVault experience across automation, security policies, storage retention, and keyboard shortcuts.

---

## 2. Preference Categories & Data Model

- **Service**: [`AirVaultPreferencesService`](file:///Users/ayaz/Acklet/client/src/tools/airvault/services/airvault-preferences.service.ts)
- **Persistence**: `localStorage.getItem('acklet_airvault_preferences')`

```typescript
export interface AirVaultPreferences {
  autoCaptureOnFocus: boolean;      // Auto inspect clipboard on window focus
  instantBeamOnPaste: boolean;      // Direct-beam without staging review
  defaultSyncTarget: string;        // 'broadcast' or specific device ID
  autoMaskSensitive: boolean;       // Auto-mask API keys, JWTs, and passwords
  toastNotifications: boolean;      // Ambient bottom feedback popups
  soundFx: boolean;                 // Audio cues on sync completion
  retentionTtlMs: number;           // 15m, 1h, 24h, 7d, or 0 (Never)
  syncTextDeletions: boolean;       // Sync author line/text deletions to all connected peer devices
}
```

---

## 3. Settings Drawer Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ Vault Settings & Preferences                            │
├─────────────────────────────────────────────────────────────┤
│  [ General ]      [ Retention ]       [ Shortcuts ]         │
├─────────────────────────────────────────────────────────────┤
│  • Auto-Capture on Focus:           [ ON / OFF ]            │
│  • Instant Beam on Paste:           [ ON / OFF ]            │
│  • Sync Author Text Deletions:      [ ON / OFF ]            │
│  • Auto-Mask Sensitive Tokens:      [ ON / OFF ]            │
│  • Ambient Toast Alerts:            [ ON / OFF ]            │
│                                                             │
│  • Storage Quota:                   2.4 MB / 1.0 GB         │
│  • Retention Policy:                [ 7 Days (Default) ]    │
│  • [ Purge All Vault History ]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Keyboard Shortcuts Reference Table

| Keybinding | Action | Scope |
| :--- | :--- | :--- |
| `⌘ + Enter` / `Ctrl + Enter` | Beam Staged Payload to Target | Staging Composer |
| `⌘ + V` / `Ctrl + V` | Capture from System Clipboard | Global Workspace |
| `⌘ + F` / `Ctrl + F` | Search Clipboard Vault Feed | Stream |
| `Esc` | Dismiss Open Drawers and Modals | Global |
