# Barcode Generator — Deployment & Routing Guide

This document describes the hosting architecture, subdomain routing, and build configuration for the Barcode Generator.

---

## 1. Hosting Architecture & Subdomains

The Barcode Generator runs as a standalone tool application within the Acklet monorepo architecture:

- **Local Subdomain**: `http://barcode.localhost:4200`
- **Local Fallback Paths**: `http://localhost:4200/barcode` or `http://localhost:4200/tools/barcode`
- **Production Subdomain**: `https://barcode.acklet.com`
- **Production Fallback Paths**: `https://acklet.com/barcode` or `https://acklet.com/tools/barcode`

---

## 2. Bootstrapping Strategy (`client/src/main.ts`)

When a user visits `barcode.localhost:4200` or `/barcode`, `client/src/main.ts` extracts the tool slug and dynamically imports the standalone application:

```typescript
const isBarcodePath = pathname === '/barcode' || pathname === '/barcode-generator';
const toolSlug = extractToolSlugFromHostname(hostname) || (queryTool && ['barcode', 'barcode-generator'].includes(queryTool) ? queryTool : null);

if (toolSlug === 'barcode' || toolSlug === 'barcode-generator' || isBarcodePath) {
  // Bootstrap Barcode Generator standalone tool (apps/tool-barcode-generator)
  Promise.all([
    import('../apps/tool-barcode-generator/src/app/app.component'),
    import('@angular/common/http')
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())]
      });
    })
    .catch((err) => console.error('[Tool Barcode Generator Bootstrap Error]', err));
}
```

---

## 3. Angular Build Configuration (`client/angular.json`)

The project is declared as a separate application project:

```json
"tool-barcode-generator": {
  "projectType": "application",
  "root": "apps/tool-barcode-generator",
  "sourceRoot": "apps/tool-barcode-generator/src",
  "prefix": "app",
  "architect": {
    "build": {
      "builder": "@angular/build:application",
      "options": {
        "browser": "apps/tool-barcode-generator/src/main.ts",
        "tsConfig": "tsconfig.app.json",
        "assets": [{ "glob": "**/*", "input": "public" }],
        "styles": ["apps/tool-barcode-generator/src/styles.css"],
        "allowedCommonJsDependencies": ["lottie-web"]
      }
    }
  }
}
```

---

## 4. Reverse Proxy & Caddy Configuration

In production, reverse proxy routing routes requests matching the `barcode` subdomain to the client application:

```caddy
barcode.acklet.com {
    reverse_proxy localhost:4200 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}
```
