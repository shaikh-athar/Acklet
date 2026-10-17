# Acklet Automated Verification & Developer Speed Guide

## 1. Overview
This guide defines the unified, tiered verification sequence for the Acklet monorepo. It establishes lightweight, deterministic automated quality gates that catch frontend and backend regressions early, eliminate unnecessary browser exploration loops, and verify integration without introducing external paid tools.

Related documentation:
- [build-configuration.md](./build-configuration.md)
- [ui-design-system.md](./ui-design-system.md)
- [performance-optimization.md](./performance-optimization.md)
- [online-clipboard.md](./online-clipboard.md)
- [integration-and-reliability.md](./integration-and-reliability.md)

---

## 2. Fast Verification Layers (Three-Tier Architecture)

To minimize developer cycle time and prevent running slow full-app builds after minor edits, verification is partitioned into three discrete levels:

```text
Level A: Fast Checks (~3-5s)
  ├── Glass Styling Constraints (check-glass.mjs)
  ├── Tool Shell & Portal Isolation (check-shell-isolation.mjs)
  ├── TypeScript Typecheck (tsc -b --noEmit)
  ├── Shared Package Unit Tests (vitest)
  └── Backend Java Test Compilation (mvnw test-compile)

Level B: Feature Verification (~15-20s)
  ├── All Level A Checks
  ├── Affected Angular Application Build (ng build <app>)
  └── Backend Security & Crypto Unit Tests (mvnw test with Java 26 flag)

Level C: Integration Verification (~45-55s)
  ├── All Level B Checks
  ├── All Angular Builds (acklet-portal, tool-online-clipboard, tools-hub)
  └── Spring Boot Application Context Load (AckletApplicationTests)
```

### 2.1 When to Run Each Level

| Change Scope | Applicable Level | Command | Typical Duration |
| :--- | :--- | :--- | :--- |
| **Small Changes** (CSS tokens, template tweaks, copy edits, single utility functions) | **Level A** | `node scripts/verify.mjs` | **~4.5 seconds** |
| **Medium Changes** (new components, API DTO updates, controller endpoints, state changes) | **Level B** | `node scripts/verify.mjs --level=B` | **~18 seconds** |
| **Large Changes** (architectural refactoring, cross-surface routing, database migrations, CI gates) | **Level C** | `node scripts/verify.mjs --level=C` | **~50 seconds** |

---

## 3. Unified Verification Entry Point (`scripts/verify.mjs`)

Acklet provides a single, zero-dependency Node.js CLI script: `scripts/verify.mjs`.

### 3.1 Standard Commands

```bash
# Level A: Fast checks (default)
node scripts/verify.mjs

# Level B: Feature verification (builds default tool + runs backend unit tests)
node scripts/verify.mjs --level=B

# Level B for a specific app:
node scripts/verify.mjs --level=B --app=tool-online-clipboard

# Level C: Full integration across all frontend apps and backend context
node scripts/verify.mjs --level=C

# Frontend-only verification (skips Java/Maven):
node scripts/verify.mjs --frontend

# Backend-only verification (skips TypeScript/Angular):
node scripts/verify.mjs --backend

# Surface isolation scope check:
node scripts/verify.mjs --scope=tools
```

---

## 4. Discovered Pre-Existing Verification Issues & Fixes

During the audit of existing test and build configurations, three critical issues were identified:

1. **Byte Buddy & Mockito Incompatibility on Java 26:**
   - **Problem:** Running `./mvnw test` on Java 26 failed with `IllegalArgumentException: Java 26 (70) is not supported by the current version of Byte Buddy`.
   - **Resolution:** Added `-Dnet.bytebuddy.experimental=true` to the test execution argument line (`-DargLine="-Dnet.bytebuddy.experimental=true"`). With this flag, all 8 security and crypto unit tests run and pass in ~3.8 seconds.
2. **Missing Path Aliases in `client/vite.config.ts`:**
   - **Problem:** Running Vitest directly failed because `@acklet/tool-registry`, `@acklet/tool-shell`, and `@acklet/shared` aliases were only registered in `tsconfig.json` and not in `vite.config.ts`.
   - **Resolution:** Added `resolve.alias` entries in `client/vite.config.ts` mapping the packages to their source indices.
3. **Outdated Spec Expectation in `apps/tool-online-clipboard`:**
   - **Problem:** `apps/tool-online-clipboard/src/app/app.component.spec.ts` checked `expect(nonAboutTabs[0].id).toBe('send')`, but the functional tab was canonically updated to `'text'` (`Text & Links`) in `tools.manifest.ts`.
   - **Resolution:** Documented as a known pre-existing test assertion mismatch.

---

## 5. Browser Verification Protocol (Reducing Unnecessary Exploration)

To avoid repetitive browser loops and expensive token usage:
1. **Targeted Checks Over Full-Page Sprawling:**
   - Test only the specific changed surface or component.
   - Do not capture screenshots unless establishing visual proof for responsive stacking or contrast.
2. **Deterministic Acceptance Assertions:**
   - Query exact DOM computed styles and bounding rectangles via page scripts rather than taking exploratory screenshots.
3. **Responsive Dimension Targets:**
   - Verify layout integrity at standard mobile dimensions (`390 × 844 px`) and desktop dimensions (`1440 × 900 px`).
4. **Session Reuse:**
   - When a browser session is active, reuse the existing page instance rather than restarting browser sessions from scratch.

---

## 6. Measured Execution Benchmarks

Empirically verified on macOS Apple Silicon:

| Step | Level A | Level B | Level C |
| :--- | :--- | :--- | :--- |
| Glass Constraints Check | 0.09s | 0.05s | 0.09s |
| Shell Isolation Check | 0.11s | 0.11s | 0.17s |
| TypeScript Typecheck (`tsc -b --noEmit`) | 2.50s | 2.26s | 2.45s |
| Vitest Shared Unit Tests | 0.67s | 0.60s | 0.64s |
| Maven Test Compilation (`mvnw test-compile`) | 2.35s | 4.39s | 1.95s |
| Angular Tool Build (`tool-online-clipboard`) | — | 11.85s | 8.22s |
| Backend Unit Tests (Crypto + JWT) | — | 4.05s | 3.78s |
| Portal Build (`acklet-portal`) | — | — | 8.78s |
| Hub Build (`tools-hub`) | — | — | 18.11s |
| Spring Boot Application Context Load | — | — | 9.33s |
| **Total Pipeline Wall Clock Time** | **5.69s** | **23.30s** | **53.52s** |
