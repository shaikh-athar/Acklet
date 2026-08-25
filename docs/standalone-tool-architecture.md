# Acklet Standalone Tool Architecture & Sandbox Routing

This document details the routing and layout isolation architecture for Acklet tools.

## Architecture & Principles

Acklet separates tool engagement into two distinct visual & routing layers:

1. **Tool Detail / Marketing Page** (`/tools/:id`):
   - Located inside the main platform layout ([client/src/app/layout/main-layout/main-layout.ts](file:///Users/ayaz/Acklet/client/src/app/layout/main-layout/main-layout.ts))
   - Includes Acklet Header, Navigation Navbar, Hero section, Overview, Technical Specifications, Privacy Audit, Version Log, and Footer.
   - Contains the primary **Launch Sandbox** CTA button.

2. **Standalone Tool Sandbox / Application Dashboard** (`/tools/app/:id`):
   - Located OUTSIDE the platform layout ([client/src/app/app.routes.ts](file:///Users/ayaz/Acklet/client/src/app/app.routes.ts))
   - Renders 100% full-viewport pure tool UI ([client/src/app/pages/tools/standalone-tool-sandbox.ts](file:///Users/ayaz/Acklet/client/src/app/pages/tools/standalone-tool-sandbox.ts))
   - **Zero Platform Chrome**: No Acklet Header, no Acklet Footer, no Acklet Navigation Shell.
   - Dedicated solely to the tool's signature experience (e.g. JSON Formatter, JWT Decoder, etc.).

## Routing Configuration

Routes in [client/src/app/app.routes.ts](file:///Users/ayaz/Acklet/client/src/app/app.routes.ts) are registered with top priority:

```typescript
// --- Standalone Tool Applications (Pure Tool UI, No Platform Shell/Navbar/Footer) ---
{ path: 'tools/app/json-formatter', loadComponent: () => import('../tools/json-lens/json-lens.component').then(m => m.JsonLensComponent), title: 'JSON Formatter & Validator — Acklet' },
{ path: 'tools/app/:id', loadComponent: () => import('./pages/tools/standalone-tool-sandbox').then(m => m.StandaloneToolSandboxComponent) },
```

## Launching Sandbox Behavior

When a user clicks **Launch Sandbox** on the Tool Detail page ([client/src/app/pages/tool-detail/tool-detail.ts](file:///Users/ayaz/Acklet/client/src/app/pages/tool-detail/tool-detail.ts)):

```typescript
useTool(): void {
  const slug = this.tool()?.slug;
  if (!slug) return;
  window.open(`/tools/app/${slug}`, '_blank');
}
```

This opens `http://localhost:4200/tools/app/<slug>` in a new browser tab, launching the pure, standalone tool application without any Acklet platform header or footer.
