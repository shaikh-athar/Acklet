---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# QR Generator — Service Architecture & Service Design

## 1. Services Inventory & Roles

| Service | File Path | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **`QRGeneratorService`** | `services/qr-generator.service.ts` | Provided in root | Wraps `qrcode.js` library, generates Data URLs, computes version and capacity metadata, and validates content length boundaries. |
| **`ColorValidatorService`** | `services/color-validator.service.ts` | Provided in root | Validates `#RRGGBB` hex syntax, converts hex to RGB, calculates WCAG contrast ratios, and evaluates low-contrast warnings. |

Both services are **stateless and pure-functional**, keeping state orchestration localized to `QRGeneratorComponent`.

---

## 2. Key Method Signatures & Implementation Logic

### 2.1 `QRGeneratorService`

#### `generateQR(options: QROptions): Promise<string>`
Takes user-configured options and returns a Promise resolving to a base64 Data URL (`data:image/png;base64,...`):
```typescript
async generateQR(options: QROptions): Promise<string> {
  if (!options.content || !options.content.trim()) {
    return '';
  }
  
  // Format content with type-specific prefix if applicable
  const formattedContent = this.formatContent(options.content, options.contentType);
  
  const qrOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: options.errorCorrection,
    width: options.size,
    margin: options.margin ?? 4,
    color: {
      dark: options.foregroundColor,
      light: options.backgroundColor
    }
  };

  return QRCode.toDataURL(formattedContent, qrOptions);
}
```

#### `getMetadata(content: string, ec: QRErrorCorrection): QRMetadata`
Estimates the minimum QR version required to encode the payload and calculates capacity:
```typescript
getMetadata(content: string, ec: QRErrorCorrection): QRMetadata {
  const length = content ? content.length : 0;
  const version = this.estimateVersion(length, ec);
  const maxCapacity = this.getMaxCapacity(version, ec);
  const capacityPercent = maxCapacity > 0 ? Math.min(100, Math.round((length / maxCapacity) * 100)) : 0;

  return {
    version,
    maxCapacity,
    usedCapacity: length,
    capacityPercent,
    contrastRatio: 21.0,
    hasLowContrast: false
  };
}
```

#### `isValidContent(content: string, ec: QRErrorCorrection): boolean`
Validates that content length does not exceed maximum allowable capacity for the highest QR version (version 40, ~2,953 alphanumeric characters).

---

### 2.2 `ColorValidatorService`

#### `isValidHex(color: string): boolean`
Verifies `#RRGGBB` format:
```typescript
isValidHex(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color.trim());
}
```

#### `hexToRgb(hex: string): { r: number; g: number; b: number } | null`
Converts a 6-character hex string into red, green, and blue integer components:
```typescript
hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!this.isValidHex(hex)) return null;
  const num = parseInt(hex.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}
```

#### `contrastRatio(fg: string, bg: string): number`
Calculates relative luminance ($L$) and computes the WCAG contrast ratio:
$$L = 0.2126 \cdot R' + 0.7152 \cdot G' + 0.0722 \cdot B'$$
$$\text{Ratio} = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$

- Spot check: `#000000` on `#FFFFFF` yields **`21:1`**.

#### `hasLowContrast(fg: string, bg: string): boolean`
Returns `true` if `contrastRatio(fg, bg) < 2.5`.

---

## 3. State Management Design

- **Component Scope**: Single source of truth in `QRGeneratorComponent`.
- **Options State**: `currentOptions: QROptions`.
- **Reactivity**: On content change, parent merges partial updates, triggers `ColorValidatorService.contrastRatio()`, calls `QRGeneratorService.generateQR()`, and updates the view via signals.
