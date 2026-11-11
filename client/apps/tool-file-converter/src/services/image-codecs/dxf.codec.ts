// client/apps/tool-file-converter/src/services/image-codecs/dxf.codec.ts

export interface DxfEntity {
  type: string;
  layer?: string;
  color?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  vertices?: { x: number; y: number }[];
  closed?: boolean;
  text?: string;
  textHeight?: number;
}

export class DxfCodec {
  /**
   * Standard AutoCAD Color Index (ACI 1-9) to Hex color mapping.
   */
  static readonly ACI_COLORS: Record<number, string> = {
    1: '#EF4444', // Red
    2: '#EAB308', // Yellow
    3: '#22C55E', // Green
    4: '#06B6D4', // Cyan
    5: '#3B82F6', // Blue
    6: '#D946EF', // Magenta
    7: '#0F172A', // White / Black (Dark theme: white, light theme: dark slate)
    8: '#64748B', // Dark Gray
    9: '#94A3B8'  // Light Gray
  };

  /**
   * Verifies if text or binary bytes represent an AutoCAD DXF file.
   */
  static isDxf(input: string | Uint8Array | ArrayBuffer): boolean {
    let text = '';
    if (typeof input === 'string') {
      text = input.slice(0, 512);
    } else {
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
      text = new TextDecoder().decode(bytes.subarray(0, Math.min(bytes.length, 512)));
    }
    return /^\s*0\s*[\r\n]+\s*SECTION/i.test(text) || text.includes('ENTITIES') || text.includes('HEADER');
  }

  /**
   * Parses DXF group code stream and extracts vector entities.
   */
  static parseEntities(dxfText: string): {
    entities: DxfEntity[];
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } {
    const lines = dxfText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const entities: DxfEntity[] = [];

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const updateBounds = (x: number, y: number) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    };

    let inEntitiesSection = false;
    let currentEntity: DxfEntity | null = null;
    let currentCode = -1;

    for (let i = 0; i < lines.length - 1; i += 2) {
      const codeStr = lines[i].trim();
      const valStr = lines[i + 1]?.trim() ?? '';
      const code = parseInt(codeStr, 10);

      if (code === 0) {
        if (valStr === 'SECTION') {
          // Check section name in next group code 2
          continue;
        }
        if (valStr === 'ENDSEC') {
          if (currentEntity) {
            entities.push(currentEntity);
            currentEntity = null;
          }
          inEntitiesSection = false;
          continue;
        }
        if (valStr === 'EOF') {
          if (currentEntity) entities.push(currentEntity);
          break;
        }

        // Previous entity finished, push it
        if (currentEntity) {
          entities.push(currentEntity);
          currentEntity = null;
        }

        // New entity starts
        if (inEntitiesSection || valStr === 'LINE' || valStr === 'CIRCLE' || valStr === 'ARC' || valStr === 'LWPOLYLINE' || valStr === 'TEXT') {
          currentEntity = { type: valStr, color: '#3B82F6' };
        }
      } else if (code === 2 && valStr === 'ENTITIES') {
        inEntitiesSection = true;
      } else if (currentEntity) {
        if (code === 8) {
          currentEntity.layer = valStr;
        } else if (code === 62) {
          const aci = parseInt(valStr, 10);
          currentEntity.color = this.ACI_COLORS[aci] || '#3B82F6';
        } else if (currentEntity.type === 'LINE') {
          if (code === 10) currentEntity.x1 = parseFloat(valStr);
          else if (code === 20) currentEntity.y1 = parseFloat(valStr);
          else if (code === 11) currentEntity.x2 = parseFloat(valStr);
          else if (code === 21) {
            currentEntity.y2 = parseFloat(valStr);
            if (currentEntity.x1 !== undefined && currentEntity.y1 !== undefined && currentEntity.x2 !== undefined && currentEntity.y2 !== undefined) {
              updateBounds(currentEntity.x1, currentEntity.y1);
              updateBounds(currentEntity.x2, currentEntity.y2);
            }
          }
        } else if (currentEntity.type === 'CIRCLE') {
          if (code === 10) currentEntity.cx = parseFloat(valStr);
          else if (code === 20) currentEntity.cy = parseFloat(valStr);
          else if (code === 40) {
            currentEntity.radius = parseFloat(valStr);
            if (currentEntity.cx !== undefined && currentEntity.cy !== undefined && currentEntity.radius !== undefined) {
              updateBounds(currentEntity.cx - currentEntity.radius, currentEntity.cy - currentEntity.radius);
              updateBounds(currentEntity.cx + currentEntity.radius, currentEntity.cy + currentEntity.radius);
            }
          }
        } else if (currentEntity.type === 'ARC') {
          if (code === 10) currentEntity.cx = parseFloat(valStr);
          else if (code === 20) currentEntity.cy = parseFloat(valStr);
          else if (code === 40) currentEntity.radius = parseFloat(valStr);
          else if (code === 50) currentEntity.startAngle = parseFloat(valStr);
          else if (code === 51) {
            currentEntity.endAngle = parseFloat(valStr);
            if (currentEntity.cx !== undefined && currentEntity.cy !== undefined && currentEntity.radius !== undefined) {
              updateBounds(currentEntity.cx - currentEntity.radius, currentEntity.cy - currentEntity.radius);
              updateBounds(currentEntity.cx + currentEntity.radius, currentEntity.cy + currentEntity.radius);
            }
          }
        } else if (currentEntity.type === 'LWPOLYLINE') {
          if (!currentEntity.vertices) currentEntity.vertices = [];
          if (code === 70) currentEntity.closed = (parseInt(valStr, 10) & 1) === 1;
          else if (code === 10) {
            currentEntity.vertices.push({ x: parseFloat(valStr), y: 0 });
          } else if (code === 20 && currentEntity.vertices.length > 0) {
            const last = currentEntity.vertices[currentEntity.vertices.length - 1];
            last.y = parseFloat(valStr);
            updateBounds(last.x, last.y);
          }
        } else if (currentEntity.type === 'TEXT' || currentEntity.type === 'MTEXT') {
          if (code === 10) currentEntity.x1 = parseFloat(valStr);
          else if (code === 20) currentEntity.y1 = parseFloat(valStr);
          else if (code === 40) currentEntity.textHeight = parseFloat(valStr);
          else if (code === 1) {
            currentEntity.text = valStr;
            if (currentEntity.x1 !== undefined && currentEntity.y1 !== undefined) {
              updateBounds(currentEntity.x1, currentEntity.y1);
            }
          }
        }
      }
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX >= maxX) {
      minX = 0;
      maxX = 800;
    }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY >= maxY) {
      minY = 0;
      maxY = 600;
    }

    // Add 5% padding
    const rawW = maxX - minX || 800;
    const rawH = maxY - minY || 600;
    const padX = rawW * 0.05;
    const padY = rawH * 0.05;

    minX -= padX;
    maxX += padX;
    minY -= padY;
    maxY += padY;

    const width = Math.max(10, Math.round(maxX - minX));
    const height = Math.max(10, Math.round(maxY - minY));

    return { entities, minX, minY, maxX, maxY, width, height };
  }

  /**
   * Converts DXF drawing entities into authentic Scalable Vector Graphics (SVG).
   */
  static toSvg(input: string | ArrayBuffer): string {
    const text = typeof input === 'string' ? input : new TextDecoder().decode(input);
    const { entities, minX, minY, maxX, maxY, width, height } = this.parseEntities(text);

    // Map Cartesian (Y-up) to SVG screen coordinates (Y-down)
    const mapY = (y: number) => maxY - (y - minY);

    const svgLines: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
      `  <rect width="100%" height="100%" fill="#FFFFFF"/>`,
      `  <g id="dxf-entities" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">`
    ];

    for (const ent of entities) {
      const color = ent.color || '#2563EB';

      if (ent.type === 'LINE' && ent.x1 !== undefined && ent.y1 !== undefined && ent.x2 !== undefined && ent.y2 !== undefined) {
        const sx = ent.x1 - minX;
        const sy = mapY(ent.y1);
        const ex = ent.x2 - minX;
        const ey = mapY(ent.y2);
        svgLines.push(`    <line x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="${color}"/>`);
      } else if (ent.type === 'CIRCLE' && ent.cx !== undefined && ent.cy !== undefined && ent.radius !== undefined) {
        const cx = ent.cx - minX;
        const cy = mapY(ent.cy);
        svgLines.push(`    <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${ent.radius.toFixed(2)}" fill="none" stroke="${color}"/>`);
      } else if (ent.type === 'ARC' && ent.cx !== undefined && ent.cy !== undefined && ent.radius !== undefined && ent.startAngle !== undefined && ent.endAngle !== undefined) {
        const cx = ent.cx - minX;
        const cy = mapY(ent.cy);
        const r = ent.radius;
        const a1 = (ent.startAngle * Math.PI) / 180;
        const a2 = (ent.endAngle * Math.PI) / 180;
        // Flip Y angles for screen coords
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy - r * Math.sin(a1);
        const x2 = cx + r * Math.cos(a2);
        const y2 = cy - r * Math.sin(a2);
        const largeArc = Math.abs(ent.endAngle - ent.startAngle) > 180 ? 1 : 0;
        svgLines.push(`    <path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}" fill="none" stroke="${color}"/>`);
      } else if (ent.type === 'LWPOLYLINE' && ent.vertices && ent.vertices.length > 1) {
        const pts = ent.vertices.map(v => `${(v.x - minX).toFixed(2)},${mapY(v.y).toFixed(2)}`).join(' ');
        if (ent.closed) {
          svgLines.push(`    <polygon points="${pts}" fill="none" stroke="${color}"/>`);
        } else {
          svgLines.push(`    <polyline points="${pts}" fill="none" stroke="${color}"/>`);
        }
      } else if ((ent.type === 'TEXT' || ent.type === 'MTEXT') && ent.text && ent.x1 !== undefined && ent.y1 !== undefined) {
        const tx = ent.x1 - minX;
        const ty = mapY(ent.y1);
        const fontSize = Math.max(8, Math.round(ent.textHeight || 12));
        svgLines.push(`    <text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-family="monospace" font-size="${fontSize}" fill="${color}">${ent.text}</text>`);
      }
    }

    svgLines.push(`  </g>`);
    svgLines.push(`</svg>`);

    return svgLines.join('\n');
  }

  /**
   * Renders the DXF drawing onto a 2D canvas context.
   */
  static renderToCanvas(
    input: string | ArrayBuffer,
    targetWidth?: number,
    targetHeight?: number
  ): { width: number; height: number; svgText: string } {
    const svgText = this.toSvg(input);
    const { width, height } = this.parseEntities(typeof input === 'string' ? input : new TextDecoder().decode(input));
    return {
      width: targetWidth || width,
      height: targetHeight || height,
      svgText
    };
  }
}
