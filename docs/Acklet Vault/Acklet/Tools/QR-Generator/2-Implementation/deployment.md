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

## 4. Reverse Proxy Integration (`Caddyfile` & `proxy.conf.json`)

```caddyfile
# QR Tool local routing
qr.localhost:3000 {
    handle {
        reverse_proxy localhost:4200
    }
}
```

In Angular dev mode, `client/proxy.conf.json` maps shortlink endpoints directly to Spring Boot:
```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false
  },
  "/q": {
    "target": "http://localhost:8080",
    "secure": false
  }
}
```

---

## 5. Hosted Shortlink Public Base URL Configuration

Shortlinks generated for long URLs and long text encode a public URL into the QR code matrix. By default, local environments default to `http://localhost:8080/q/{code}`, which is unreachable by external physical smartphones.

### 5.1 Configuration Precedence
1. **Spring Boot Environment Variable**:
   ```bash
   export QR_PUBLIC_BASE_URL="https://melvin-operose-disconsolately.ngrok-free.dev"
   ```
2. **Spring Boot `application.properties`**:
   ```properties
   app.qr.link.public-base-url=http://localhost:8080
   app.qr.link.max-text-chars=20000
   app.qr.link.max-url-chars=4000
   app.qr.link.default-ttl-months=12
   app.qr.link.create-rate-limit-per-minute=60
   ```
3. **Frontend Runtime Config (`window.__ACKLET_CONFIG__`)**:
   ```javascript
   window.__ACKLET_CONFIG__ = {
     qrPublicBaseUrl: "https://my-tunnel.ngrok-free.dev"
   };
   ```
4. **Frontend Automatic Tunnel / Origin Inference**:
   If the user loads the QR generator through an HTTPS tunnel (e.g. `ngrok-free.dev`), `SmartLinkService.computeEffectiveShortUrl` automatically adjusts the short URL host to match the active origin.

---

## 6. Real Phone Physical Scanning Setup

To scan generated QR codes using a physical smartphone camera during development:

### Option A: Public HTTPS Tunnel (Recommended)
1. Start an HTTPS tunnel pointing to your frontend or reverse proxy:
   ```bash
   ngrok http 4200
   ```
2. Set the public tunnel URL on the backend:
   ```bash
   export QR_PUBLIC_BASE_URL="https://your-subdomain.ngrok-free.dev"
   ```
3. Load the QR generator through the tunnel or localhost. Any generated hosted shortlink will contain `https://your-subdomain.ngrok-free.dev/q/{code}` and scan seamlessly on any iOS or Android phone.

### Option B: Local Area Network (LAN IP)
1. Find your machine's Wi-Fi / Ethernet IP:
   ```bash
   ipconfig getifaddr en0
   # e.g., 192.168.1.105
   ```
2. Launch Angular bound to `0.0.0.0` or allow LAN connections:
   ```bash
   npx ng serve --host 0.0.0.0 --port 4200
   ```
3. Set `QR_PUBLIC_BASE_URL`:
   ```bash
   export QR_PUBLIC_BASE_URL="http://192.168.1.105:4200"
   ```
4. Connect the phone to the same Wi-Fi network and scan.

> [!NOTE]
> If the QR code encodes `localhost` or a private IP (`127.0.0.1`, `192.168.*`, `10.*`), a subtle dev notice banner will appear beneath the QR preview warning that the QR is only scannable on the local machine/network.

---

## 7. Automated Smoke Testing (`scripts/smoke-test-qr-flow.sh`)

Acklet includes a zero-dependency Bash smoke test script verifying the entire hosted shortlink lifecycle:
```bash
./scripts/smoke-test-qr-flow.sh http://localhost:8080
# Or through the Angular dev proxy:
./scripts/smoke-test-qr-flow.sh http://localhost:4200
```

The script executes 19 assertions:
- Creation of long URL link (`POST /api/v1/qr-links`).
- HTTP 302 redirect verification with exact `Location`, `no-cache`, `no-referrer`, and `noindex`.
- Creation of long text link with UTF-8 Hindi and emojis (`नमस्ते दुनिया! ✨🚀\nLine 2`).
- HTTP 200 OK resolution serving escaped HTML viewer.
- Verification of controls: "Copy", "Share / Save to Notes", "Download .txt", and notes app hint.
- Security audit: XSS escaping (`<script>alert(1)</script>` rendered safe), Content-Security-Policy, Referrer-Policy, X-Robots-Tag.
- Edge cases: 410 Gone for expired/deleted codes, friendly 404 HTML page for unknown codes, and 400 rejection for disallowed schemes (`javascript:`).
