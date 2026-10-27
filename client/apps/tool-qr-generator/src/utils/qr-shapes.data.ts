// client/apps/tool-qr-generator/src/utils/qr-shapes.data.ts
import { QrOverallShape } from '../models/qr-generator.models';

export interface QrShapeDefinition {
  id: QrOverallShape;
  name: string;
  description: string;
  supportsTrim: boolean;
  /** Returns true if normalized coordinate (x, y) in [-1, 1] is within the shape */
  isInside: (x: number, y: number) => boolean;
  /** Returns normalized distance to shape boundary (0 at center, ~1 at perimeter, >1 outside) */
  normalizedDistance: (x: number, y: number) => number;
  /** Returns SVG path definition string scaled to width and height */
  getSvgPath: (width: number, height: number) => string;
  /** Self-contained mini SVG markup for high-contrast UI preview */
  previewSvg: string;
}

// 5-Point Star Polygon Vertices
const STAR_POINTS: Array<[number, number]> = [];
for (let i = 0; i < 10; i++) {
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;
  const radius = i % 2 === 0 ? 1.0 : 0.52;
  STAR_POINTS.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
}

function isPointInPolygon(x: number, y: number, points: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export const QR_ART_SHAPES: QrShapeDefinition[] = [
  {
    id: 'square',
    name: 'Square',
    description: 'Classic standard square boundary with clean quiet zone.',
    supportsTrim: false,
    isInside: (x, y) => Math.abs(x) <= 1.0 && Math.abs(y) <= 1.0,
    normalizedDistance: (x, y) => Math.max(Math.abs(x), Math.abs(y)),
    getSvgPath: (w, h) => `M 0 0 H ${w} V ${h} H 0 Z`,
    previewSvg:
      '<rect x="4" y="4" width="24" height="24" rx="3" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'circle',
    name: 'Circle',
    description: 'Smooth radial circular boundary and rounded corners.',
    supportsTrim: true,
    isInside: (x, y) => x * x + y * y <= 1.02,
    normalizedDistance: (x, y) => Math.sqrt(x * x + y * y),
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 2;
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    },
    previewSvg:
      '<circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'rounded-square',
    name: 'Squircle',
    description: 'Superellipse squircle with gentle continuous curve.',
    supportsTrim: true,
    isInside: (x, y) => Math.pow(Math.abs(x), 3.6) + Math.pow(Math.abs(y), 3.6) <= 1.02,
    normalizedDistance: (x, y) =>
      Math.pow(Math.pow(Math.abs(x), 3.6) + Math.pow(Math.abs(y), 3.6), 1 / 3.6),
    getSvgPath: (w, h) => {
      const r = Math.min(w, h) * 0.28;
      return `M ${r} 2 H ${w - r} Q ${w - 2} 2 ${w - 2} ${r} V ${h - r} Q ${w - 2} ${h - 2} ${w - r} ${h - 2} H ${r} Q 2 ${h - 2} 2 ${h - r} V ${r} Q 2 2 ${r} 2 Z`;
    },
    previewSvg:
      '<rect x="4" y="4" width="24" height="24" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'heart',
    name: 'Heart',
    description: 'Organic romantic silhouette with balanced central chamber.',
    supportsTrim: true,
    isInside: (x, y) => {
      const nx = x * 1.15;
      const ny = -y * 1.15 + 0.25;
      const term1 = nx * nx + ny * ny - 1;
      return term1 * term1 * term1 - nx * nx * ny * ny * ny <= 0.05;
    },
    normalizedDistance: (x, y) => {
      const nx = x * 1.15;
      const ny = -y * 1.15 + 0.25;
      const term1 = nx * nx + ny * ny - 1;
      const val = term1 * term1 * term1 - nx * nx * ny * ny * ny;
      return val > 0 ? 1 + val : Math.sqrt(x * x + y * y);
    },
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const cy = h / 2 - 2;
      const s = Math.min(w, h) * 0.42;
      return `M ${cx} ${cy + s * 0.95} C ${cx - s * 1.35} ${cy + s * 0.15} ${cx - s * 1.35} ${cy - s * 0.95} ${cx} ${cy - s * 0.3} C ${cx + s * 1.35} ${cy - s * 0.95} ${cx + s * 1.35} ${cy + s * 0.15} ${cx} ${cy + s * 0.95} Z`;
    },
    previewSvg:
      '<path d="M 16 26 C 6 18 6 9 16 11 C 26 9 26 18 16 26 Z" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'star',
    name: 'Star',
    description: 'Dynamic five-pointed star with symmetrical geometric facets.',
    supportsTrim: true,
    isInside: (x, y) => isPointInPolygon(x, y, STAR_POINTS),
    normalizedDistance: (x, y) => Math.sqrt(x * x + y * y),
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(cx, cy) - 3;
      const points = STAR_POINTS.map(([px, py]) => `${cx + px * R},${cy + py * R}`).join(' ');
      return `M ${cx + STAR_POINTS[0][0] * R} ${cy + STAR_POINTS[0][1] * R} L ${points} Z`;
    },
    previewSvg:
      '<polygon points="16,3 19.8,11.5 29,12.5 22.2,18.5 24.2,27.5 16,22.8 7.8,27.5 9.8,18.5 3,12.5 12.2,11.5" fill="none" stroke="currentColor" stroke-width="2"/>'
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    description: 'Modern geometric hexagon with sharp symmetrical edges.',
    supportsTrim: true,
    isInside: (x, y) => {
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      return ax <= 1.0 && ax * 0.5 + ay * 0.866025 <= 1.0;
    },
    normalizedDistance: (x, y) => {
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      return Math.max(ax, ax * 0.5 + ay * 0.866025);
    },
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 3;
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
      }
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
    },
    previewSvg:
      '<polygon points="16,4 27,10 27,22 16,28 5,22 5,10" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Rotated diamond lozenge with dynamic corner emphasis.',
    supportsTrim: true,
    isInside: (x, y) => Math.abs(x) + Math.abs(y) <= 1.08,
    normalizedDistance: (x, y) => (Math.abs(x) + Math.abs(y)) / 1.08,
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const rx = w / 2 - 3;
      const ry = h / 2 - 3;
      return `M ${cx} ${cy - ry} L ${cx + rx} ${cy} L ${cx} ${cy + ry} L ${cx - rx} ${cy} Z`;
    },
    previewSvg:
      '<polygon points="16,3 28,16 16,29 4,16" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Stately crest silhouette with protective curved base.',
    supportsTrim: true,
    isInside: (x, y) => {
      if (y < -0.95 || y > 1.05) return false;
      if (y <= 0) return Math.abs(x) <= 0.95;
      const normY = y / 1.05;
      return Math.abs(x) <= 0.95 * (1 - normY * normY);
    },
    normalizedDistance: (x, y) => {
      if (y <= 0) return Math.max(Math.abs(x) / 0.95, -y / 0.95);
      const normY = y / 1.05;
      const maxW = 0.95 * Math.max(0.05, 1 - normY * normY);
      return Math.max(Math.abs(x) / maxW, normY);
    },
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const left = 4;
      const right = w - 4;
      const top = 4;
      const midY = h * 0.48;
      const bottomY = h - 4;
      return `M ${cx} ${top} L ${right} ${top} V ${midY} C ${right} ${h * 0.82} ${cx + 10} ${bottomY} ${cx} ${bottomY} C ${cx - 10} ${bottomY} ${left} ${h * 0.82} ${left} ${midY} V ${top} Z`;
    },
    previewSvg:
      '<path d="M 5,5 L 27,5 L 27,15 C 27,24 16,28 16,28 C 16,28 5,24 5,15 Z" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'drop',
    name: 'Drop',
    description: 'Graceful teardrop with pinpoint zenith and rounded base.',
    supportsTrim: true,
    isInside: (x, y) => {
      if (y < -1.05 || y > 1.05) return false;
      if (y >= 0.15) {
        const dy = y - 0.15;
        return x * x + dy * dy <= 0.85 * 0.85;
      }
      const taper = (y + 1.05) / 1.2;
      return Math.abs(x) <= Math.max(0, taper * 0.85);
    },
    normalizedDistance: (x, y) => {
      if (y >= 0.15) {
        return Math.sqrt(x * x + Math.pow(y - 0.15, 2)) / 0.85;
      }
      const taper = Math.max(0.01, (y + 1.05) / 1.2);
      return Math.max(Math.abs(x) / (taper * 0.85), -y / 1.05);
    },
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const topY = 4;
      const bottomY = h - 6;
      const r = w * 0.42;
      return `M ${cx} ${topY} C ${cx + r * 1.1} ${h * 0.45} ${cx + r} ${bottomY} ${cx} ${bottomY} C ${cx - r} ${bottomY} ${cx - r * 1.1} ${h * 0.45} ${cx} ${topY} Z`;
    },
    previewSvg:
      '<path d="M 16,4 C 24,14 26,24 16,28 C 6,24 8,14 16,4 Z" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'speech-bubble',
    name: 'Speech bubble',
    description: 'Friendly conversational dialogue container with callout tail.',
    supportsTrim: false,
    isInside: (x, y) => {
      if (x >= -0.92 && x <= 0.92 && y >= -0.92 && y <= 0.65) return true;
      // Speech pointer at bottom-left:
      if (x >= -0.75 && x <= -0.15 && y >= 0.65 && y <= 1.0) {
        const normY = (y - 0.65) / 0.35;
        return x >= -0.75 + normY * 0.35 && x <= -0.15 - normY * 0.2;
      }
      return false;
    },
    normalizedDistance: (x, y) => {
      if (y <= 0.65) return Math.max(Math.abs(x) / 0.92, Math.abs(y + 0.13) / 0.78);
      return Math.min(1.0, Math.sqrt(x * x + y * y));
    },
    getSvgPath: (w, h) => {
      const bodyH = h * 0.8;
      const r = 16;
      return `M ${r} 4 H ${w - r} Q ${w - 4} 4 ${w - 4} ${r} V ${bodyH - r} Q ${w - 4} ${bodyH} ${w - r} ${bodyH} H ${w * 0.45} L ${w * 0.25} ${h - 4} L ${w * 0.3} ${bodyH} H ${r} Q 4 ${bodyH} 4 ${bodyH - r} V ${r} Q 4 4 ${r} 4 Z`;
    },
    previewSvg:
      '<path d="M 5,6 H 27 Q 29,6 29,8 V 20 Q 29,22 27,22 H 14 L 8,27 L 9,22 H 5 Q 3,22 3,20 V 8 Q 3,6 5,6 Z" fill="none" stroke="currentColor" stroke-width="2"/>'
  },
  {
    id: 'badge',
    name: 'Badge',
    description: 'Festive 12-lobed scalloped rosette award seal.',
    supportsTrim: true,
    isInside: (x, y) => {
      const theta = Math.atan2(y, x);
      const r = 0.86 + 0.14 * Math.cos(12 * theta);
      return Math.sqrt(x * x + y * y) <= r * 1.02;
    },
    normalizedDistance: (x, y) => {
      const theta = Math.atan2(y, x);
      const r = 0.86 + 0.14 * Math.cos(12 * theta);
      return Math.sqrt(x * x + y * y) / r;
    },
    getSvgPath: (w, h) => {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(cx, cy) - 3;
      const pts: string[] = [];
      const steps = 48;
      for (let i = 0; i < steps; i++) {
        const theta = (i * 2 * Math.PI) / steps;
        const rFactor = 0.88 + 0.12 * Math.cos(12 * theta);
        const r = maxR * rFactor;
        pts.push(`${cx + Math.cos(theta) * r},${cy + Math.sin(theta) * r}`);
      }
      return `M ${pts[0]} L ${pts.slice(1).join(' L ')} Z`;
    },
    previewSvg:
      '<circle cx="16" cy="16" r="11" stroke-dasharray="3,2" fill="none" stroke="currentColor" stroke-width="2.5"/>'
  },
  {
    id: 'ticket',
    name: 'Ticket',
    description: 'Vintage admission stub with scalloped edge indentations.',
    supportsTrim: true,
    isInside: (x, y) => {
      if (Math.abs(x) > 0.95 || Math.abs(y) > 0.92) return false;
      // Cutouts on left & right sides at center:
      const leftDistSq = Math.pow(x + 0.95, 2) + y * y;
      const rightDistSq = Math.pow(x - 0.95, 2) + y * y;
      if (leftDistSq <= 0.22 * 0.22 || rightDistSq <= 0.22 * 0.22) return false;
      return true;
    },
    normalizedDistance: (x, y) => {
      return Math.max(Math.abs(x) / 0.95, Math.abs(y) / 0.92);
    },
    getSvgPath: (w, h) => {
      const r = 8;
      const notchR = h * 0.14;
      const cy = h / 2;
      return `M ${r} 4 H ${w - r} Q ${w - 4} 4 ${w - 4} ${r} V ${cy - notchR} A ${notchR} ${notchR} 0 0 0 ${w - 4} ${cy + notchR} V ${h - r} Q ${w - 4} ${h - 4} ${w - r} ${h - 4} H ${r} Q 4 ${h - 4} 4 ${h - r} V ${cy + notchR} A ${notchR} ${notchR} 0 0 0 4 ${cy - notchR} V ${r} Q 4 4 ${r} 4 Z`;
    },
    previewSvg:
      '<path d="M 6,5 H 26 V 12 A 4 4 0 0 0 26 20 V 27 H 6 V 20 A 4 4 0 0 0 6 12 V 5 Z" fill="none" stroke="currentColor" stroke-width="2"/>'
  }
];

export function getQrShapeById(id?: QrOverallShape): QrShapeDefinition {
  return QR_ART_SHAPES.find(s => s.id === id) || QR_ART_SHAPES[0];
}
