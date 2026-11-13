// apps/tool-watermark-remover/src/services/tiled-inpainting.service.ts
import { Injectable } from '@angular/core';
import { InpaintingProgress } from '../models/watermark.models';

export interface TileGridInfo {
  tileWidth: number;
  tileHeight: number;
  overlap: number;
  cols: number;
  rows: number;
  totalTiles: number;
  activeTiles: number;
}

export interface TileCoordinates {
  col: number;
  row: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  height: number;
  hasWatermark: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TiledInpaintingService {
  private activeCancellation = false;

  cancel(): void {
    this.activeCancellation = true;
  }

  /**
   * Plans the tiled grid structure and identifies which tiles intersect with watermark pixels.
   */
  planTiles(
    width: number,
    height: number,
    mask: Uint8Array,
    tileSize = 512,
    overlap = 64
  ): { grid: TileGridInfo; tiles: TileCoordinates[] } {
    const stride = Math.max(64, tileSize - overlap);
    const cols = Math.ceil((width - overlap) / stride) || 1;
    const rows = Math.ceil((height - overlap) / stride) || 1;

    const tiles: TileCoordinates[] = [];
    let activeTiles = 0;

    for (let r = 0; r < rows; r++) {
      const y0 = Math.max(0, r * stride);
      const y1 = Math.min(height, y0 + tileSize);
      const tileH = y1 - y0;

      for (let c = 0; c < cols; c++) {
        const x0 = Math.max(0, c * stride);
        const x1 = Math.min(width, x0 + tileSize);
        const tileW = x1 - x0;

        let hasWatermark = false;
        for (let y = y0; y < y1 && !hasWatermark; y++) {
          const rowOff = y * width;
          for (let x = x0; x < x1; x++) {
            if (mask[rowOff + x] === 1) {
              hasWatermark = true;
              break;
            }
          }
        }

        if (hasWatermark) {
          activeTiles++;
        }

        tiles.push({
          col: c,
          row: r,
          x0,
          y0,
          x1,
          y1,
          width: tileW,
          height: tileH,
          hasWatermark
        });
      }
    }

    const grid: TileGridInfo = {
      tileWidth: tileSize,
      tileHeight: tileSize,
      overlap,
      cols,
      rows,
      totalTiles: tiles.length,
      activeTiles
    };

    return { grid, tiles };
  }

  /**
   * Executes tiled inpainting across high-resolution image buffers with Hann window seam blending.
   */
  async processTiled(
    sourceData: Uint8ClampedArray,
    outputData: Uint8ClampedArray,
    mask: Uint8Array,
    width: number,
    height: number,
    tileProcessor: (
      tileSrc: ImageData,
      tileMask: ImageData,
      tileInfo: TileCoordinates
    ) => Promise<ImageData>,
    options: {
      tileSize?: number;
      overlap?: number;
      onProgress?: (progress: InpaintingProgress) => void;
    } = {}
  ): Promise<{ activeTilesProcessed: number }> {
    if (this.activeCancellation) {
      this.activeCancellation = false;
      throw new Error('Tiled inpainting was cancelled.');
    }
    const tileSize = options.tileSize ?? 512;
    const overlap = options.overlap ?? 64;
    const { onProgress } = options;

    const { grid, tiles } = this.planTiles(width, height, mask, tileSize, overlap);

    if (grid.activeTiles === 0) {
      return { activeTilesProcessed: 0 };
    }

    let processedCount = 0;

    for (let i = 0; i < tiles.length; i++) {
      if (this.activeCancellation) {
        throw new Error('Tiled inpainting was cancelled.');
      }

      const tile = tiles[i];
      if (!tile.hasWatermark) {
        continue; // Skip non-watermarked tiles
      }

      processedCount++;
      const currentPercent = Math.round(15 + (processedCount / grid.activeTiles) * 75);

      onProgress?.({
        progress: currentPercent,
        phase: 'inpainting',
        message: `Inpainting high-resolution tile ${processedCount} of ${grid.activeTiles}...`,
        currentTile: processedCount,
        totalTiles: grid.activeTiles
      });

      // 1. Extract sub-buffers for this tile
      const tileSrc = this.extractTileImageData(sourceData, width, tile.x0, tile.y0, tile.width, tile.height);
      const tileMask = this.extractTileMaskImageData(mask, width, tile.x0, tile.y0, tile.width, tile.height);

      // 2. Process tile through inpainter
      const tileResult = await tileProcessor(tileSrc, tileMask, tile);

      // 3. Blend tile back into global output using 2D cosine / Hann window weights
      this.blendTileIntoOutput(
        tileResult.data,
        outputData,
        width,
        height,
        tile,
        overlap
      );
    }

    return { activeTilesProcessed: processedCount };
  }

  private extractTileImageData(
    source: Uint8ClampedArray,
    srcWidth: number,
    x0: number,
    y0: number,
    tileWidth: number,
    tileHeight: number
  ): ImageData {
    const tileBytes = new Uint8ClampedArray(tileWidth * tileHeight * 4);
    for (let y = 0; y < tileHeight; y++) {
      const srcRow = (y0 + y) * srcWidth;
      const tileRow = y * tileWidth;
      for (let x = 0; x < tileWidth; x++) {
        const srcOff = (srcRow + (x0 + x)) * 4;
        const tileOff = (tileRow + x) * 4;
        tileBytes[tileOff] = source[srcOff];
        tileBytes[tileOff + 1] = source[srcOff + 1];
        tileBytes[tileOff + 2] = source[srcOff + 2];
        tileBytes[tileOff + 3] = source[srcOff + 3];
      }
    }
    return { data: tileBytes, width: tileWidth, height: tileHeight, colorSpace: 'srgb' } as ImageData;
  }

  private extractTileMaskImageData(
    mask: Uint8Array,
    srcWidth: number,
    x0: number,
    y0: number,
    tileWidth: number,
    tileHeight: number
  ): ImageData {
    const maskBytes = new Uint8ClampedArray(tileWidth * tileHeight * 4);
    for (let y = 0; y < tileHeight; y++) {
      const srcRow = (y0 + y) * srcWidth;
      const tileRow = y * tileWidth;
      for (let x = 0; x < tileWidth; x++) {
        const val = mask[srcRow + (x0 + x)];
        const tileOff = (tileRow + x) * 4;
        const alpha = val === 1 ? 255 : 0;
        maskBytes[tileOff] = alpha;
        maskBytes[tileOff + 1] = alpha;
        maskBytes[tileOff + 2] = alpha;
        maskBytes[tileOff + 3] = alpha;
      }
    }
    return { data: maskBytes, width: tileWidth, height: tileHeight, colorSpace: 'srgb' } as ImageData;
  }

  /**
   * Blends a processed tile into the full output buffer using 2D Hann / Cosine feathering
   * across tile overlap margins to completely prevent visible boundary seams.
   */
  private blendTileIntoOutput(
    tileData: Uint8ClampedArray,
    outputData: Uint8ClampedArray,
    totalWidth: number,
    totalHeight: number,
    tile: TileCoordinates,
    overlap: number
  ): void {
    const tw = tile.width;
    const th = tile.height;

    for (let ty = 0; ty < th; ty++) {
      const gy = tile.y0 + ty;
      if (gy >= totalHeight) break;

      // Vertical Hann window weight
      let wy = 1.0;
      if (tile.y0 > 0 && ty < overlap) {
        wy = 0.5 * (1.0 - Math.cos((Math.PI * ty) / overlap));
      } else if (tile.y1 < totalHeight && ty >= th - overlap) {
        const d = th - 1 - ty;
        wy = 0.5 * (1.0 - Math.cos((Math.PI * d) / overlap));
      }

      const outRow = gy * totalWidth;
      const tileRow = ty * tw;

      for (let tx = 0; tx < tw; tx++) {
        const gx = tile.x0 + tx;
        if (gx >= totalWidth) break;

        // Horizontal Hann window weight
        let wx = 1.0;
        if (tile.x0 > 0 && tx < overlap) {
          wx = 0.5 * (1.0 - Math.cos((Math.PI * tx) / overlap));
        } else if (tile.x1 < totalWidth && tx >= tw - overlap) {
          const d = tw - 1 - tx;
          wx = 0.5 * (1.0 - Math.cos((Math.PI * d) / overlap));
        }

        const weight = wx * wy;
        const outOff = (outRow + gx) * 4;
        const tileOff = (tileRow + tx) * 4;

        if (weight >= 0.99) {
          outputData[outOff] = tileData[tileOff];
          outputData[outOff + 1] = tileData[tileOff + 1];
          outputData[outOff + 2] = tileData[tileOff + 2];
          outputData[outOff + 3] = tileData[tileOff + 3];
        } else if (weight > 0.01) {
          const invW = 1.0 - weight;
          outputData[outOff] = Math.round(tileData[tileOff] * weight + outputData[outOff] * invW);
          outputData[outOff + 1] = Math.round(tileData[tileOff + 1] * weight + outputData[outOff + 1] * invW);
          outputData[outOff + 2] = Math.round(tileData[tileOff + 2] * weight + outputData[outOff + 2] * invW);
          outputData[outOff + 3] = Math.round(tileData[tileOff + 3] * weight + outputData[outOff + 3] * invW);
        }
      }
    }
  }
}
