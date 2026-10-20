---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# QR Generator — Deployment, Hosting & Environment Configuration

## 1. Hosting Architecture & Subdomain Routing

In Phase 1, **QR Generator** is a 100% client-side Angular application that requires **no dedicated backend server** or database:

- **Local Development**: `http://qr.localhost:4200`
- **Production Edge**: `https://qr.acklet.com` (or `https://qr.acklet.<domain>`)

### 1.1 Hostname Dispatch
Modern web browsers resolve `*.localhost` to loopback address `127.0.0.1` automatically (RFC 6761). `client/src/main.ts` extracts the subdomain slug. When `toolSlug === 'qr'`, the runtime dynamically bootstraps the QR generator application component.

---

## 2. Build Process

### 2.1 Static Production Build
```bash
cd client
npm run build -- --configuration production
```
- **Output**: Static HTML, CSS, and JavaScript bundles.
- **SSR Requirement**: **None** (pure client-side rendering).
- **Bundle Target**: `< 150 KB` gzipped for the QR Generator module.

---

## 3. Environment Configuration

### 3.1 Constants & Defaults (`environment.ts`)
```typescript
export const QR_CONFIG = {
  defaultSize: 300,
  minSize: 100,
  maxSize: 2000,
  stepSize: 50,
  defaultEC: 'M',
  defaultFgColor: '#000000',
  defaultBgColor: '#FFFFFF',
  contrastWarningThreshold: 2.5,
  maxContentLength: 2953,
  debounceMs: 150
} as const;
```

---

## 4. Reverse Proxy Integration (`Caddyfile`)

```caddyfile
# QR Tool local routing
qr.localhost:3000 {
    handle {
        reverse_proxy localhost:4200
    }
}
```
