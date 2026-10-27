// client/apps/tool-qr-generator/src/utils/qr-svg-renderer.ts
import QRCode from 'qrcode';
import {
  QROptions,
  QrDotType,
  QrCornerSquareType,
  QrCornerDotType,
  QrGradientOptions
} from '../models/qr-generator.models';
import { getQrShapeById } from './qr-shapes.data';

/**
 * Calculates standard relative luminance (sRGB / Rec. 709).
 * Returns a value between 0.0 (pure black) and 1.0 (pure white).
 */
export function getRelativeLuminance(hexColor: string): number {
  const cleanHex = hexColor.replace('#', '').trim();
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  }

  const srgb = [r, g, b].map(val =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Validates WCAG contrast ratio between dark foreground and light background.
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Deterministic pseudo-random number generator for uniform decorative pattern scattering.
 */
function pseudoHash(x: number, y: number, seed: number = 42): number {
  let h = (x * 374761393 + y * 668265263 + seed * 961748927) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export interface RenderQrSvgResult {
  svgString: string;
  matrixSize: number;
  dataModulesCount: number;
  trimmedModulesCount: number;
  safeCropPercent: number;
  effectiveErrorCorrection: string;
}

/**
 * In-House Vector SVG Renderer for Acklet QR Art and standard QR styling.
 */
export function renderQrToSvg(content: string, options?: Partial<QROptions>): RenderQrSvgResult {
  if (!content || !content.trim()) {
    throw new Error('Cannot generate QR code: Payload is empty.');
  }

  const artShape = options?.artShape;
  const shapeDef = getQrShapeById(artShape?.shape);
  const mode = artShape?.mode || 'around';
  const strength = artShape?.strength || 'balanced';
  const fadeEdges = artShape?.fadeEdges ?? false;

  // If Trim mode is selected or a Logo is present, force Error Correction Level to 'H' for 30% recovery
  const isTrimMode = mode === 'trim' && shapeDef.supportsTrim;
  const hasLogo = Boolean(options?.logo);
  const errorCorrectionLevel = (isTrimMode || hasLogo) ? 'H' : options?.errorCorrection || 'M';

  // Generate ISO/IEC 18004 BitMatrix via standard qrcode engine
  const qrInstance = QRCode.create(content, {
    errorCorrectionLevel: errorCorrectionLevel as QRCode.QRCodeErrorCorrectionLevel
  });

  const matrix = qrInstance.modules;
  const N = matrix.size; // Symbol dimensions (e.g. 21, 25, 29, 33...)

  // Base module size in SVG user units
  const m = 10;
  const quietZoneModules = Math.max(0, options?.margin ?? 4);

  // Determine decorative field extension for "Around" mode
  let decMargin = 0;
  if (mode === 'around' && artShape?.shape && artShape.shape !== 'square') {
    // 7 to 12 modules surrounding field based on strength
    decMargin = strength === 'safe' ? 6 : strength === 'balanced' ? 8 : 10;
  }
  // Total grid dimensions
  const totalCols = N + (quietZoneModules + decMargin) * 2;
  const totalRows = totalCols;
  const totalWidth = totalCols * m;
  const totalHeight = totalRows * m;

  const coreStartX = (quietZoneModules + decMargin) * m;
  const coreStartY = (quietZoneModules + decMargin) * m;

  // Colors & Gradients
  const fgColor = options?.foregroundColor || '#000000';
  const bgColor = options?.backgroundColor || '#FFFFFF';
  const hasFgGrad = Boolean(options?.foregroundGradient?.enabled);
  const gradId = 'qr-fg-grad';
  const fgPaint = hasFgGrad ? `url(#${gradId})` : fgColor;
  const cornerSquareColor = options?.cornerSquareColor || fgPaint;
  const cornerDotColor = options?.cornerDotColor || fgPaint;

  const dotType = options?.dotType || 'square';
  const cornerSquareType = options?.cornerSquareType || 'square';
  const cornerDotType = options?.cornerDotType || 'square';

  // Soft-crop budget calculation (maximum 12% of data modules)
  let totalDataModules = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (matrix.get(r, c) && !matrix.isReserved(r, c)) {
        totalDataModules++;
      }
    }
  }

  const maxCropBudget = Math.floor(totalDataModules * 0.12);
  let trimmedModulesCount = 0;

  // Trim radius scale factor
  const trimScale = strength === 'safe' ? 1.08 : strength === 'balanced' ? 0.98 : 0.92;

  // Logo clearance setup
  let logoCleared: Array<[number, number, number, number]> = [];
  if (options?.logo) {
    const logoScale = Math.max(0.10, Math.min(0.40, options.logoSize ?? 0.24));
    const logoModuleW = Math.round(N * logoScale);
    const logoModuleH = logoModuleW;
    const logoStartC = Math.floor((N - logoModuleW) / 2);
    const logoStartR = Math.floor((N - logoModuleH) / 2);
    const maxSafePad = Math.max(0, Math.min(8, Math.floor((N - logoModuleW) / 2) - 1));
    const pad = Math.max(0, Math.min(maxSafePad, options.logoMargin ?? 1));
    logoCleared.push([
      logoStartR - pad,
      logoStartC - pad,
      logoModuleH + pad * 2,
      logoModuleW + pad * 2
    ]);
  }

  function isInsideLogoArea(r: number, c: number): boolean {
    for (const [sr, sc, h, w] of logoCleared) {
      if (r >= sr && r < sr + h && c >= sc && c < sc + w) {
        return true;
      }
    }
    return false;
  }

  // Defs: Gradients
  const defs: string[] = [];
  let fgFillAttr = `fill="${fgColor}"`;
  let bgFillAttr = `fill="${bgColor}"`;

  if (options?.foregroundGradient?.enabled) {
    const grad = options.foregroundGradient;
    const gradId = 'qr-fg-grad';
    defs.push(createGradientDef(gradId, grad, totalWidth, totalHeight));
    fgFillAttr = `fill="url(#${gradId})"`;
  }

  if (options?.backgroundGradient?.enabled) {
    const grad = options.backgroundGradient;
    const gradId = 'qr-bg-grad';
    defs.push(createGradientDef(gradId, grad, totalWidth, totalHeight));
    bgFillAttr = `fill="url(#${gradId})"`;
  }

  const svgElements: string[] = [];

  // 1. Background
  if (mode === 'badge' && shapeDef.id !== 'square') {
    // Badge Mode: render solid shaped container
    const badgePath = shapeDef.getSvgPath(totalWidth, totalHeight);
    svgElements.push(
      `<path d="${badgePath}" ${bgFillAttr} stroke="${fgColor}" stroke-width="3" stroke-opacity="0.15"/>`
    );
  } else {
    // Standard / Around Mode: clean background rectangle
    svgElements.push(
      `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" ${bgFillAttr}/>`
    );
  }

  // 2. Decorative Silhouette Field ("Around" Mode)
  if (mode === 'around' && artShape?.shape && artShape.shape !== 'square' && decMargin > 0) {
    const decElements: string[] = [];
    const densityThreshold = strength === 'safe' ? 0.45 : strength === 'balanced' ? 0.22 : 0.05;

    // Decorative modules use a light tint binarizing to background
    const decTint = artShape.brandTint || fgColor;
    const coreAreaStart = decMargin;
    const coreAreaEnd = decMargin + 2 * quietZoneModules + N;

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        // Exclude entire core QR + quiet zone
        if (
          r >= coreAreaStart &&
          r < coreAreaEnd &&
          c >= coreAreaStart &&
          c < coreAreaEnd
        ) {
          continue;
        }

        // Normalized shape coordinates in [-1, 1]
        const nx = (c - totalCols / 2) / (totalCols / 2);
        const ny = (r - totalRows / 2) / (totalRows / 2);

        if (shapeDef.isInside(nx, ny)) {
          // Density scattering
          const rand = pseudoHash(c, r);
          if (rand < densityThreshold) continue;

          // Anti-finder rule: avoid contiguous 1:1:3:1:1 lookalike clumps
          if (c % 7 === 3 && r % 7 === 3 && rand < 0.6) continue;

          let opacity = 0.28;
          if (fadeEdges) {
            const dist = shapeDef.normalizedDistance(nx, ny);
            const fadeFactor = Math.max(0.08, 1 - Math.pow(Math.min(1, dist), 1.6));
            opacity = Math.round(0.32 * fadeFactor * 100) / 100;
          }

          const fill = `fill="${decTint}" fill-opacity="${opacity}"`;

          const x = c * m;
          const y = r * m;
          decElements.push(renderDot(dotType, x, y, m, fill));
        }
      }
    }

    if (decElements.length > 0) {
      svgElements.push(`<g id="qr-art-silhouette">${decElements.join('')}</g>`);
    }
  }

  // 3. QR Core Data & Error Correction Modules
  const dataModules: string[] = [];

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // Finder pattern modules (7x7 in 3 corners) are handled by dedicated finder renderer
      if (isFinderArea(r, c, N)) {
        continue;
      }

      if (!matrix.get(r, c)) {
        continue; // Light module (background)
      }

      // Check logo clearance
      if (isInsideLogoArea(r, c)) {
        continue;
      }

      const isReserved = matrix.isReserved(r, c) === 1;

      // Soft-crop for Trim mode
      if (isTrimMode && !isReserved) {
        const nx = ((c - N / 2) / (N / 2)) * trimScale;
        const ny = ((r - N / 2) / (N / 2)) * trimScale;

        if (!shapeDef.isInside(nx, ny)) {
          if (trimmedModulesCount < maxCropBudget) {
            trimmedModulesCount++;
            continue; // Safely omit this module within error-correction allowance
          }
        }
      }

      const moduleFill = fgFillAttr;

      const x = coreStartX + c * m;
      const y = coreStartY + r * m;
      dataModules.push(renderDot(dotType, x, y, m, moduleFill));
    }
  }

  svgElements.push(`<g id="qr-core-modules">${dataModules.join('')}</g>`);

  // 4. Dedicated Finder Locators (Top-Left, Top-Right, Bottom-Left)
  const finderPositions: Array<[number, number]> = [
    [0, 0],
    [0, N - 7],
    [N - 7, 0]
  ];

  const finderElements: string[] = [];
  for (const [r, c] of finderPositions) {
    const x = coreStartX + c * m;
    const y = coreStartY + r * m;
    finderElements.push(
      renderFinderLocator(
        x,
        y,
        m,
        cornerSquareType,
        cornerDotType,
        cornerSquareColor,
        cornerDotColor
      )
    );
  }
  svgElements.push(`<g id="qr-finder-patterns">${finderElements.join('')}</g>`);

  // 5. Embedded Logo
  if (options?.logo) {
    const logoScale = Math.max(0.10, Math.min(0.40, options.logoSize ?? 0.24));
    const logoPx = Math.round(N * m * logoScale);
    const logoX = coreStartX + (N * m - logoPx) / 2;
    const logoY = coreStartY + (N * m - logoPx) / 2;
    const cornerR = Math.round(logoPx * 0.16);

    const isBgTransparent = options.logoBgTransparent ?? true;
    const bgElement = isBgTransparent
      ? ''
      : `<rect x="${logoX - 4}" y="${logoY - 4}" width="${logoPx + 8}" height="${logoPx + 8}" rx="${cornerR + 2}" ${bgFillAttr} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.12))"/>`;

    svgElements.push(
      `<g id="qr-embedded-logo">
        ${bgElement}
        <clipPath id="qr-logo-clip"><rect x="${logoX}" y="${logoY}" width="${logoPx}" height="${logoPx}" rx="${cornerR}"/></clipPath>
        <image href="${escapeXml(options.logo)}" xlink:href="${escapeXml(options.logo)}" x="${logoX}" y="${logoY}" width="${logoPx}" height="${logoPx}" preserveAspectRatio="xMidYMid meet" clip-path="url(#qr-logo-clip)"/>
      </g>`
    );
  }

  const defsBlock = defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '';
  const finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
${defsBlock}
${svgElements.join('\n')}
</svg>`;

  return {
    svgString: finalSvg,
    matrixSize: N,
    dataModulesCount: totalDataModules,
    trimmedModulesCount,
    safeCropPercent:
      totalDataModules > 0
        ? Math.round((trimmedModulesCount / totalDataModules) * 1000) / 10
        : 0,
    effectiveErrorCorrection: errorCorrectionLevel
  };
}

/**
 * Returns true if the coordinate falls inside any of the three 7x7 finder patterns.
 */
function isFinderArea(r: number, c: number, N: number): boolean {
  // Top-Left
  if (r < 7 && c < 7) return true;
  // Top-Right
  if (r < 7 && c >= N - 7) return true;
  // Bottom-Left
  if (r >= N - 7 && c < 7) return true;
  return false;
}

/**
 * Renders an individual module dot according to chosen QrDotType.
 */
function renderDot(
  type: QrDotType,
  x: number,
  y: number,
  s: number,
  fillAttr: string
): string {
  const cx = x + s / 2;
  const cy = y + s / 2;

  switch (type) {
    case 'dots':
      return `<circle cx="${cx}" cy="${cy}" r="${s * 0.44}" ${fillAttr}/>`;

    case 'rounded':
      return `<rect x="${x + s * 0.08}" y="${y + s * 0.08}" width="${s * 0.84}" height="${s * 0.84}" rx="${s * 0.28}" ${fillAttr}/>`;

    case 'extra-rounded':
      return `<rect x="${x + s * 0.05}" y="${y + s * 0.05}" width="${s * 0.9}" height="${s * 0.9}" rx="${s * 0.45}" ${fillAttr}/>`;

    case 'classy':
      return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.4}" ${fillAttr}/>`;

    case 'classy-rounded':
      return `<rect x="${x + s * 0.06}" y="${y + s * 0.06}" width="${s * 0.88}" height="${s * 0.88}" rx="${s * 0.36}" ${fillAttr}/>`;

    case 'diamond': {
      const d = s * 0.48;
      return `<polygon points="${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}" ${fillAttr}/>`;
    }

    case 'star': {
      const R = s * 0.5;
      const r = s * 0.24;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : r;
        pts.push(`${cx + Math.cos(a) * rad},${cy + Math.sin(a) * rad}`);
      }
      return `<polygon points="${pts.join(' ')}" ${fillAttr}/>`;
    }

    case 'heart': {
      const h = s * 0.42;
      return `<path d="M ${cx} ${cy + h * 0.85} C ${cx - h * 1.3} ${cy + h * 0.1} ${cx - h * 1.3} ${cy - h * 0.9} ${cx} ${cy - h * 0.25} C ${cx + h * 1.3} ${cy - h * 0.9} ${cx + h * 1.3} ${cy + h * 0.1} ${cx} ${cy + h * 0.85} Z" ${fillAttr}/>`;
    }

    case 'cross': {
      const arm = s * 0.48;
      const t = s * 0.18;
      return `<polygon points="${cx - t},${cy - arm} ${cx + t},${cy - arm} ${cx + t},${cy - t} ${cx + arm},${cy - t} ${cx + arm},${cy + t} ${cx + t},${cy + t} ${cx + t},${cy + arm} ${cx - t},${cy + arm} ${cx - t},${cy + t} ${cx - arm},${cy + t} ${cx - arm},${cy - t} ${cx - t},${cy - t}" ${fillAttr}/>`;
    }

    case 'scanline':
      return `<rect x="${x + s * 0.04}" y="${cy - s * 0.26}" width="${s * 0.92}" height="${s * 0.52}" rx="${s * 0.14}" ${fillAttr}/>`;

    case 'square':
    default:
      return `<rect x="${x}" y="${y}" width="${s}" height="${s}" ${fillAttr}/>`;
  }
}

/**
 * Renders an exact 7x7 finder pattern (outer boundary + inner core dot).
 */
function renderFinderLocator(
  x: number,
  y: number,
  s: number,
  squareType: QrCornerSquareType,
  dotType: QrCornerDotType,
  outerColor: string,
  innerColor: string
): string {
  const outerSize = 7 * s;
  const innerDotSize = 3 * s;
  const innerX = x + 2 * s;
  const innerY = y + 2 * s;
  const cx = x + outerSize / 2;
  const cy = y + outerSize / 2;

  let outerElement: string;
  const strokeW = s;

  switch (squareType) {
    case 'dot':
      outerElement = `<circle cx="${cx}" cy="${cy}" r="${outerSize / 2 - strokeW / 2}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'extra-rounded':
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" rx="${outerSize * 0.38}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'classy':
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" rx="${outerSize * 0.24}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'classy-rounded':
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" rx="${outerSize * 0.28}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'pinch':
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" rx="${outerSize * 0.16}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'shield':
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" rx="${outerSize * 0.2}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'rounded':
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" rx="${s * 1.5}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;

    case 'square':
    default:
      outerElement = `<rect x="${x + strokeW / 2}" y="${y + strokeW / 2}" width="${outerSize - strokeW}" height="${outerSize - strokeW}" fill="none" stroke="${outerColor}" stroke-width="${strokeW}"/>`;
      break;
  }

  // Inner dot (3x3 modules)
  let innerElement: string;
  const innerCx = innerX + innerDotSize / 2;
  const innerCy = innerY + innerDotSize / 2;

  switch (dotType) {
    case 'dot':
      innerElement = `<circle cx="${innerCx}" cy="${innerCy}" r="${innerDotSize / 2}" fill="${innerColor}"/>`;
      break;

    case 'rounded':
      innerElement = `<rect x="${innerX}" y="${innerY}" width="${innerDotSize}" height="${innerDotSize}" rx="${s * 0.8}" fill="${innerColor}"/>`;
      break;

    case 'extra-rounded':
      innerElement = `<rect x="${innerX}" y="${innerY}" width="${innerDotSize}" height="${innerDotSize}" rx="${innerDotSize / 2}" fill="${innerColor}"/>`;
      break;

    case 'diamond': {
      const d = innerDotSize / 2;
      innerElement = `<polygon points="${innerCx},${innerCy - d} ${innerCx + d},${innerCy} ${innerCx},${innerCy + d} ${innerCx - d},${innerCy}" fill="${innerColor}"/>`;
      break;
    }

    case 'star': {
      const R = innerDotSize * 0.52;
      const r = innerDotSize * 0.26;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : r;
        pts.push(`${innerCx + Math.cos(a) * rad},${innerCy + Math.sin(a) * rad}`);
      }
      innerElement = `<polygon points="${pts.join(' ')}" fill="${innerColor}"/>`;
      break;
    }

    case 'heart': {
      const h = innerDotSize * 0.44;
      innerElement = `<path d="M ${innerCx} ${innerCy + h * 0.85} C ${innerCx - h * 1.3} ${innerCy + h * 0.1} ${innerCx - h * 1.3} ${innerCy - h * 0.9} ${innerCx} ${innerCy - h * 0.25} C ${innerCx + h * 1.3} ${innerCy - h * 0.9} ${innerCx + h * 1.3} ${innerCy + h * 0.1} ${innerCx} ${innerCy + h * 0.85} Z" fill="${innerColor}"/>`;
      break;
    }

    case 'cross': {
      const arm = innerDotSize / 2;
      const t = innerDotSize * 0.2;
      innerElement = `<polygon points="${innerCx - t},${innerCy - arm} ${innerCx + t},${innerCy - arm} ${innerCx + t},${innerCy - t} ${innerCx + arm},${innerCy - t} ${innerCx + arm},${innerCy + t} ${innerCx + t},${innerCy + t} ${innerCx + t},${innerCy + arm} ${innerCx - t},${innerCy + arm} ${innerCx - t},${innerCy + t} ${innerCx - arm},${innerCy + t} ${innerCx - arm},${innerCy - t} ${innerCx - t},${innerCy - t}" fill="${innerColor}"/>`;
      break;
    }

    case 'classy':
    case 'classy-rounded':
      innerElement = `<rect x="${innerX}" y="${innerY}" width="${innerDotSize}" height="${innerDotSize}" rx="${s * 0.9}" fill="${innerColor}"/>`;
      break;

    case 'square':
    default:
      innerElement = `<rect x="${innerX}" y="${innerY}" width="${innerDotSize}" height="${innerDotSize}" fill="${innerColor}"/>`;
      break;
  }

  return `<g class="finder-pattern">${outerElement}${innerElement}</g>`;
}

/**
 * Creates SVG gradient definitions for linear and radial gradients.
 */
function createGradientDef(
  id: string,
  options: QrGradientOptions,
  width: number,
  height: number
): string {
  const rad = ((options.rotation || 0) * Math.PI) / 180;
  const x1 = Math.round(50 - Math.cos(rad) * 50);
  const y1 = Math.round(50 - Math.sin(rad) * 50);
  const x2 = Math.round(50 + Math.cos(rad) * 50);
  const y2 = Math.round(50 + Math.sin(rad) * 50);

  if (options.type === 'radial') {
    return `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${options.color1}"/>
      <stop offset="100%" stop-color="${options.color2}"/>
    </radialGradient>`;
  }

  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
    <stop offset="0%" stop-color="${options.color1}"/>
    <stop offset="100%" stop-color="${options.color2}"/>
  </linearGradient>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
