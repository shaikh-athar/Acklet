// client/apps/tool-qr-generator/src/utils/qr-brand-mask.util.ts
import { QrBrandFont, QrBrandPlacement } from '../models/qr-generator.models';

export interface BrandFontDefinition {
  id: QrBrandFont;
  name: string;
  category: string;
  weight: number | string;
  previewSample: string;
}

export const BRAND_FONTS: BrandFontDefinition[] = [
  {
    id: 'Outfit',
    name: 'Outfit',
    category: 'Geometric Sans',
    weight: 700,
    previewSample: 'MODERN'
  },
  {
    id: 'Inter',
    name: 'Inter',
    category: 'Clean Neo-Grotesque',
    weight: 700,
    previewSample: 'CLEAN'
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    category: 'High Impact Bold',
    weight: 800,
    previewSample: 'BOLD'
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    category: 'Editorial Serif',
    weight: 700,
    previewSample: 'LUXURY'
  },
  {
    id: 'Space Grotesk',
    name: 'Space Grotesk',
    category: 'Tech Monospace',
    weight: 700,
    previewSample: 'DIGITAL'
  },
  {
    id: 'Plus Jakarta Sans',
    name: 'Plus Jakarta Sans',
    category: 'Friendly Rounded',
    weight: 700,
    previewSample: 'FRIENDLY'
  },
  {
    id: 'Bebas Neue',
    name: 'Bebas Neue',
    category: 'Condensed Banner',
    weight: 400,
    previewSample: 'BANNER'
  },
  {
    id: 'Caveat',
    name: 'Caveat',
    category: 'Casual Signature',
    weight: 700,
    previewSample: 'Signature'
  }
];

let fontsLoaded = false;

/**
 * Lazily loads the Google Fonts stylesheet only when the Brand tab is visited.
 */
export function ensureBrandFontsLoaded(): void {
  if (fontsLoaded || typeof document === 'undefined') return;
  fontsLoaded = true;

  const fontFamilies = [
    'Outfit:wght@600;700;800',
    'Inter:wght@600;700',
    'Montserrat:wght@700;800',
    'Playfair+Display:ital,wght@0,600;0,700',
    'Space+Grotesk:wght@600;700',
    'Plus+Jakarta+Sans:wght@600;700',
    'Bebas+Neue',
    'Caveat:wght@600;700'
  ];

  const href = `https://fonts.googleapis.com/css2?${fontFamilies.map(f => `family=${f}`).join('&')}&display=swap`;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Validates uploaded brand image strictly client-side using magic bytes and file size limits (<= 2MB).
 */
export async function validateBrandImageFile(
  file: File
): Promise<{ isValid: boolean; error?: string; dataUrl?: string }> {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // 1. Max size: 2MB
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { isValid: false, error: 'File size exceeds 2MB maximum limit.' };
  }

  // 2. Read first 8 bytes for magic signature validation
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let isPng = false;
    let isJpg = false;
    let isSvg = false;

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      isPng = true;
    }

    // JPEG signature: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      isJpg = true;
    }

    // SVG: inspect text head
    if (!isPng && !isJpg) {
      const text = await file.slice(0, 500).text();
      const trimmed = text.trim();
      if (
        trimmed.startsWith('<svg') ||
        trimmed.startsWith('<?xml') ||
        /<svg[\s\S]*>/i.test(trimmed)
      ) {
        isSvg = true;
      }
    }

    if (!isPng && !isJpg && !isSvg) {
      return {
        isValid: false,
        error: 'Unsupported image format. Please upload a standard PNG, JPEG, or SVG file.'
      };
    }

    // 3. Read complete file as base64 Data URL
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve({ isValid: true, dataUrl: reader.result });
        } else {
          resolve({ isValid: false, error: 'Failed to process image data.' });
        }
      };
      reader.onerror = () => resolve({ isValid: false, error: 'Failed to read image file.' });
      reader.readAsDataURL(file);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'File validation error.';
    return { isValid: false, error: msg };
  }
}

/**
 * Generates an in-memory 2D boolean mask for Brand Text across the grid.
 */
export function generateTextMask(
  text: string,
  font: string,
  rows: number,
  cols: number,
  placement: QrBrandPlacement
): boolean[][] {
  const mask: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const trimmed = text.trim();
  if (!trimmed || typeof document === 'undefined') {
    return mask;
  }

  // Use an offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return mask;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, cols, rows);

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (placement === 'in-code') {
    // Sized to fit comfortably in the central quadrant of the QR code
    const fontSize = Math.max(7, Math.floor(rows / (trimmed.length > 7 ? 4.5 : 3.5)));
    ctx.font = `bold ${fontSize}px "${font}", sans-serif`;
    ctx.fillText(trimmed, cols / 2, rows / 2);
  } else if (placement === 'around-code') {
    // Drawn near top or bottom edge of the decorative field
    const fontSize = Math.max(6, Math.floor(rows / 6));
    ctx.font = `bold ${fontSize}px "${font}", sans-serif`;
    ctx.fillText(trimmed, cols / 2, rows * 0.18);
  }

  const imgData = ctx.getImageData(0, 0, cols, rows).data;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 4;
      // White text on black canvas
      if (imgData[idx] > 120) {
        mask[r][c] = true;
      }
    }
  }

  return mask;
}

/**
 * Samples an uploaded image into a 2D boolean mask scaled to the matrix dimensions.
 */
export async function generateImageMask(
  imageDataUrl: string,
  rows: number,
  cols: number
): Promise<boolean[][]> {
  const mask: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  if (!imageDataUrl || typeof document === 'undefined') {
    return mask;
  }

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = cols;
        canvas.height = rows;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(mask);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, cols, rows);
        ctx.drawImage(img, 0, 0, cols, rows);

        const imgData = ctx.getImageData(0, 0, cols, rows).data;
        let sumLum = 0;
        const total = rows * cols;

        for (let i = 0; i < imgData.length; i += 4) {
          const lum =
            0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
          sumLum += lum;
        }

        // Automatic Otsu-style adaptive threshold
        const avgLum = sumLum / total;
        const threshold = avgLum < 128 ? avgLum * 0.9 : 128;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = (r * cols + c) * 4;
            const lum =
              0.299 * imgData[idx] +
              0.587 * imgData[idx + 1] +
              0.114 * imgData[idx + 2];
            // Dark regions of image become active in mask
            if (lum < threshold) {
              mask[r][c] = true;
            }
          }
        }

        resolve(mask);
      } catch {
        resolve(mask);
      }
    };
    img.onerror = () => resolve(mask);
    img.src = imageDataUrl;
  });
}
