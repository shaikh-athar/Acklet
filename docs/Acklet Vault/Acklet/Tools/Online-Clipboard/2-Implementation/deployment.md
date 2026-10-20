---
tool: Online Clipboard
phase: 1
last-updated: 2026-10-20
status: Complete
---

# Online Clipboard — Deployment, Routing & Infrastructure Guide

## 1. Subdomain Routing Architecture

Online Clipboard is engineered to run on its own isolated subdomain:
- **Local Development**: `http://clipboard.localhost:4200`
- **Production Edge**: `https://clipboard.acklet.com` (or `https://clipboard.acklet.<domain>`)

### 1.1 Hostname Resolution & Bootstrap
- Modern browsers treat `*.localhost` as `127.0.0.1` loopback out of the box (RFC 6761).
- `client/src/main.ts` extracts the tool slug from `window.location.hostname`. When `toolSlug === 'clipboard'`, it dynamically imports and bootstraps `apps/tool-online-clipboard/src/app/app.component.ts`.

---

## 2. Build Process & Angular Configuration

### 2.1 Build Command
```bash
cd client
npm run build -- --project=tool-online-clipboard
```

### 2.2 Angular Workspace Configuration (`angular.json`)
```json
"tool-online-clipboard": {
  "projectType": "application",
  "root": "apps/tool-online-clipboard",
  "sourceRoot": "apps/tool-online-clipboard/src",
  "prefix": "app",
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "browser": "apps/tool-online-clipboard/src/main.ts",
        "tsConfig": "tsconfig.app.json",
        "styles": ["apps/tool-online-clipboard/src/styles.css"],
        "allowedCommonJsDependencies": ["qrcode", "lottie-web", "dijkstrajs"]
      }
    }
  }
}
```

---

## 3. Caddy Reverse Proxy Configuration (`Caddyfile`)

```caddyfile
:3000 {
    # Forward all backend API requests to Spring Boot
    handle /api/* {
        reverse_proxy localhost:8080
    }

    # Forward all frontend requests to Angular dev server
    handle {
        reverse_proxy localhost:4200
    }
}
```

---

## 4. Spring Boot & Tomcat Infrastructure Configuration

### 4.1 Storage & Multipart Limits (`application.yaml`)
```yaml
spring:
  servlet:
    multipart:
      enabled: true
      max-file-size: 200MB
      max-request-size: 500MB

app:
  clipboard:
    storage-path: ${user.home}/.acklet/clipboard_storage
    max-file-size: 209715200       # 200 MB
    max-room-size: 524288000       # 500 MB
    chunk-size-bytes: 5242880      # 5 MB
    default-retention-days: 7
```

### 4.2 Automated Hourly Storage Purge Cron
- Configured via `@Scheduled(cron = "0 0 * * * *")` in `ClipboardPurgeService`.
- Automatically executes hard deletion of expired database records and orphan CAS blobs from disk.
