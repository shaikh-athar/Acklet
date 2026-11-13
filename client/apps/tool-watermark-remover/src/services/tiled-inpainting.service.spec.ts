// apps/tool-watermark-remover/src/services/tiled-inpainting.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TiledInpaintingService } from './tiled-inpainting.service';

describe('TiledInpaintingService', () => {
  let service: TiledInpaintingService;

  beforeEach(() => {
    service = new TiledInpaintingService();
  });

  it('should plan tile grid and identify only tiles containing watermark pixels', () => {
    const width = 1000;
    const height = 1000;
    const mask = new Uint8Array(width * height);

    // Place watermark only in tile 0 (top-left 50x50)
    for (let y = 10; y < 60; y++) {
      for (let x = 10; x < 60; x++) {
        mask[y * width + x] = 1;
      }
    }

    const { grid, tiles } = service.planTiles(width, height, mask, 512, 64);

    expect(grid.totalTiles).toBeGreaterThan(1);
    expect(grid.activeTiles).toBe(1); // Only 1 tile contains watermark pixels!
    expect(tiles[0].hasWatermark).toBe(true);
    expect(tiles[1].hasWatermark).toBe(false);
  });

  it('should process only active tiles and skip clean tiles during execution', async () => {
    const width = 600;
    const height = 600;
    const sourceData = new Uint8ClampedArray(width * height * 4);
    const outputData = new Uint8ClampedArray(width * height * 4);
    const mask = new Uint8Array(width * height);

    // Fill source with white
    for (let i = 0; i < sourceData.length; i += 4) {
      sourceData[i] = 255;
      sourceData[i + 1] = 255;
      sourceData[i + 2] = 255;
      sourceData[i + 3] = 255;

      outputData[i] = 255;
      outputData[i + 1] = 255;
      outputData[i + 2] = 255;
      outputData[i + 3] = 255;
    }

    // Watermark in top-left
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 50; x++) {
        mask[y * width + x] = 1;
      }
    }

    const mockTileProcessor = vi.fn(async (tileSrc: ImageData) => {
      // Return tile filled with red
      const redTile = new Uint8ClampedArray(tileSrc.width * tileSrc.height * 4);
      for (let i = 0; i < redTile.length; i += 4) {
        redTile[i] = 200;
        redTile[i + 1] = 50;
        redTile[i + 2] = 50;
        redTile[i + 3] = 255;
      }
      return { data: redTile, width: tileSrc.width, height: tileSrc.height } as ImageData;
    });

    const result = await service.processTiled(
      sourceData,
      outputData,
      mask,
      width,
      height,
      mockTileProcessor,
      { tileSize: 300, overlap: 50 }
    );

    // Active tiles processed must equal number of times mock processor was called
    expect(result.activeTilesProcessed).toBe(mockTileProcessor.mock.calls.length);
    expect(result.activeTilesProcessed).toBeGreaterThan(0);

    // Output at (10, 10) should have been modified
    expect(outputData[0]).toBe(200);
  });

  it('should abort when cancel is requested', async () => {
    const width = 1000;
    const height = 1000;
    const sourceData = new Uint8ClampedArray(width * height * 4);
    const outputData = new Uint8ClampedArray(width * height * 4);
    const mask = new Uint8Array(width * height);
    mask.fill(1); // All tiles active

    service.cancel();

    await expect(
      service.processTiled(
        sourceData,
        outputData,
        mask,
        width,
        height,
        async (t) => t,
        { tileSize: 300, overlap: 50 }
      )
    ).rejects.toThrow('Tiled inpainting was cancelled.');
  });
});

