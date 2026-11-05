// apps/tool-barcode-generator/src/services/render.service.ts
import { Injectable, inject } from '@angular/core';
import {
  BarcodeCatalogItem,
  BarcodeDesignOptions,
  BarcodeRenderResult,
  FormatPerOptions
} from '../models/barcode.models';
import { EncoderAdapter } from './encoder-adapter.service';
import { createToolLogger } from '@acklet/shared';

const log = createToolLogger('BarcodeRender');

export interface IRenderService {
  render(
    item: BarcodeCatalogItem,
    cleanValue: string,
    displayValue: string,
    design: BarcodeDesignOptions,
    options?: FormatPerOptions
  ): Promise<BarcodeRenderResult>;
}

@Injectable({
  providedIn: 'root'
})
export class RenderService implements IRenderService {
  private encoder: EncoderAdapter;

  constructor(encoder?: EncoderAdapter) {
    if (encoder) {
      this.encoder = encoder;
    } else {
      try {
        this.encoder = inject(EncoderAdapter);
      } catch {
        this.encoder = new EncoderAdapter();
      }
    }
  }

  async render(
    item: BarcodeCatalogItem,
    cleanValue: string,
    displayValue: string,
    design: BarcodeDesignOptions,
    options: FormatPerOptions = {}
  ): Promise<BarcodeRenderResult> {
    log.info(`Rendering barcode format='${item.id}', payload='${cleanValue.slice(0, 30)}${cleanValue.length > 30 ? '...' : ''}'`);
    const rawSvg = await this.encoder.encodeToSvg({
      item,
      value: cleanValue,
      design,
      options
    });

    if (!rawSvg || !rawSvg.trim() || !rawSvg.includes('<svg')) {
      log.error(`Empty SVG output generated for ${item.id}`);
      throw new Error(`Empty SVG output generated for ${item.id}`);
    }

    // 1. Accurately extract viewBox or dimensions from root <svg> tag ONLY
    const svgOpenMatch = rawSvg.match(/<svg([^>]*)>/);
    const svgAttrs = svgOpenMatch ? svgOpenMatch[1] : '';

    let parsedWidth = 240;
    let parsedHeight = 120;

    const vbMatch = svgAttrs.match(/viewBox="([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)"/);
    if (vbMatch) {
      parsedWidth = parseFloat(vbMatch[3]) || 240;
      parsedHeight = parseFloat(vbMatch[4]) || 120;
    } else {
      const widthMatch = svgAttrs.match(/\bwidth="([0-9.]+)(?:px)?"/);
      const heightMatch = svgAttrs.match(/\bheight="([0-9.]+)(?:px)?"/);
      if (widthMatch && heightMatch) {
        parsedWidth = parseFloat(widthMatch[1]) || 240;
        parsedHeight = parseFloat(heightMatch[1]) || 120;
      }
    }

    log.debug(`Barcode rendered successfully: ${item.id} -> ${parsedWidth}x${parsedHeight}px`);

    // Accessible title and desc for screen readers and WCAG 2.2 AA compliance
    const sanitizedTitle = this.escapeHtml(displayValue || cleanValue);
    const sanitizedDesc = this.escapeHtml(`${item.label} barcode encoding ${cleanValue}`);

    // Ensure root <svg> tag has explicit viewBox, width, height, and xmlns attributes
    const cleanAttrs = svgAttrs
      .replace(/\s*xmlns="[^"]*"/g, '')
      .replace(/\s*viewBox="[^"]*"/g, '')
      .replace(/\s*\bwidth="[^"]*"/g, '')
      .replace(/\s*\bheight="[^"]*"/g, '')
      .replace(/\s*shape-rendering="[^"]*"/g, '');

    const explicitAttrs = ` xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${parsedWidth} ${parsedHeight}" width="${parsedWidth}" height="${parsedHeight}" shape-rendering="crispEdges"${cleanAttrs}`;

    let processedSvg = rawSvg.replace(
      /<svg[^>]*>/,
      `<svg${explicitAttrs}>\n<title>${sanitizedTitle}</title>\n<desc>${sanitizedDesc}</desc>`
    );

    // Optional caption injection
    const rawCaption = design.captionText || (design as any).caption;
    if (rawCaption && rawCaption.trim()) {
      const sanitizedCaption = this.escapeHtml(rawCaption.trim().slice(0, 60));
      const fontSize = Number(design.fontSize) || 12;
      const fontFamily = design.fontFamily === 'ocr-b'
        ? 'OCR-B, monospace'
        : design.fontFamily === 'sans-serif'
        ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      const fontWeight = design.fontBold ? 'bold' : 'normal';
      const captionHeight = Math.max(22, fontSize + 10);
      const newHeight = parsedHeight + captionHeight;

      if (design.captionPosition === 'above') {
        const rootOpenMatch = processedSvg.match(/<svg([^>]*)>/);
        const currentAttrs = rootOpenMatch ? rootOpenMatch[1] : explicitAttrs;
        const updatedAttrs = currentAttrs
          .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${parsedWidth} ${newHeight}"`)
          .replace(/\bheight="[^"]*"/, `height="${newHeight}"`);
        const innerContent = processedSvg
          .replace(/<svg[^>]*>/, '')
          .replace(/<\/svg>/, '');

        processedSvg = `<svg${updatedAttrs}>\n<text x="${parsedWidth / 2}" y="${fontSize + 4}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${design.barColor || '#000000'}">${sanitizedCaption}</text>\n<g transform="translate(0, ${captionHeight})">\n${innerContent}\n</g>\n</svg>`;
      } else {
        const captionY = parsedHeight + fontSize + 4;
        processedSvg = processedSvg.replace(/<svg([^>]*)>/, (match, attrs) => {
          const updatedAttrs = attrs
            .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${parsedWidth} ${newHeight}"`)
            .replace(/\bheight="[^"]*"/, `height="${newHeight}"`);
          return `<svg${updatedAttrs}>`;
        });
        processedSvg = processedSvg.replace(
          /<\/svg>/,
          `<text x="${parsedWidth / 2}" y="${captionY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${design.barColor || '#000000'}">${sanitizedCaption}</text>\n</svg>`
        );
      }
      parsedHeight = newHeight;
    }

    // Frame / border option
    const hasFrame = design.frame === 'thin' || (design as any).borderStyle === 'thin' || (design as any).borderStyle === 'thick';
    if (hasFrame) {
      const strokeW = (design as any).borderStyle === 'thick' ? 3 : 1.5;
      const frameColor = design.barColor || '#000000';
      processedSvg = processedSvg.replace(
        /<\/svg>/,
        `<rect x="1" y="1" width="${parsedWidth - 2}" height="${parsedHeight - 2}" fill="none" stroke="${frameColor}" stroke-width="${strokeW}" />\n</svg>`
      );
    }

    let effectiveEncoded = cleanValue;
    if (options.addon && ['ean13', 'upca', 'ean8', 'isbn', 'issn'].includes(item.id)) {
      const cleanAddon = options.addon.trim();
      if (cleanAddon.length === 2 || cleanAddon.length === 5) {
        effectiveEncoded = `${cleanValue} ${cleanAddon}`;
      }
    }

    return {
      svg: processedSvg,
      rawSvg,
      width: parsedWidth,
      height: parsedHeight,
      encodedValue: effectiveEncoded,
      displayValue: displayValue || cleanValue
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const BarcodeRenderService = RenderService;
export type BarcodeRenderService = RenderService;

