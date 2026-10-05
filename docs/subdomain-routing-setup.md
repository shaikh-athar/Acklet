# Acklet Subdomain Routing & Architecture Guide

## 1. Architecture Overview

Acklet routes tools through their own dedicated subdomains:
- **Production**: `https://<slug>.acklet.com` (or `https://<slug>.acklet.<domain>`)
- **Local Development**: `http://<slug>.localhost:4200`

---

## 2. Local Setup (Wildcard `*.localhost`)

Modern browsers (Chrome, Firefox, Safari, Edge) treat all subdomains matching `*.localhost` (e.g. `json-formatter.localhost`, `jwt-inspector.localhost`) as `127.0.0.1` loopback by default according to RFC 6761. No modification of `/etc/hosts` is required for standard modern browsers.

### Running Frontend Locally:
```bash
cd client
npm run dev
# Or: npx ng serve --host 0.0.0.0 --port 4200
```

### Accessing Tools Locally:
- Platform / Catalog: `http://localhost:4200`
- Tool on Subdomain: `http://<slug>.localhost:4200` (e.g. `http://json-formatter.localhost:4200`)

---

## 3. Production Setup (Wildcard DNS & Wildcard SSL)

### 3.1 Wildcard DNS Configuration
In your DNS provider (e.g., Cloudflare, Route53), configure wildcard CNAME/A records pointing to your frontend hosting edge:

```text
Type    Name     Target / Value
A       @        <INGRESS_OR_EDGE_IP>
CNAME   *        acklet.com (or your root domain)
```

### 3.2 Wildcard SSL Certificate
Obtain a wildcard TLS certificate covering both the root and all tool subdomains:
- Certificate Domains: `acklet.com`, `*.acklet.com`
- When using Cloudflare or AWS CloudFront/ACM, wildcard SSL is managed automatically for all `*.acklet.com` subdomains.

---

## 4. Subdomain Resolution & 404 Fallback
- `getToolSlugFromHostname()` resolves the `<slug>` segment from `window.location.hostname`.
- If the resolved slug is registered in `TOOL_REGISTRY`, `ToolDetailComponent` mounts `ToolShellComponent` and projects the tool's interface.
- If the slug is unknown, a clean 404 page is rendered immediately.

---

## 5. Security & Zero-Storage Guarantee
- All user inputs are processed client-side or ephemerally; no payloads are persisted or logged.
- Secret API keys are never exposed to the frontend; third-party requests proxy securely through `ToolApiConfig` in the Spring Boot backend.
- Rate limiting and CORS configurations are strictly restricted to Acklet origin patterns.
