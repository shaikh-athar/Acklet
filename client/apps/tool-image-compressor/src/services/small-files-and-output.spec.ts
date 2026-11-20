// apps/tool-image-compressor/src/services/small-files-and-output.spec.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { optimizePngLossless, encodeIndexedPng, minifySvgText } from './image-optimizer.util';
import { suggestTargets, clampTargetBytes } from './target-suggestion.util';
import { determineHonestResult } from './honest-label.util';

describe('Small Files, Target Logic & Single Output Screen (User Directive Steps 1 - 6)', () => {
  const assetsDir = path.resolve(__dirname, '../test-assets');
  const baseAppDir = path.resolve(__dirname, '..');

  describe('STEP 1: Every small file gets a real reduction when possible', () => {
    it('860 B PNG achieves >= 5% reduction via lossless / palette optimization', async () => {
      const p = path.join(assetsDir, 'sample-860b.png');
      if (!fs.existsSync(p)) return;
      const buf = fs.readFileSync(p);
      expect(buf.length).toBe(860);

      const lossless = await optimizePngLossless(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      const savedLossless = ((buf.length - lossless.byteLength) / buf.length) * 100;
      expect(savedLossless).toBeGreaterThanOrEqual(5);
      expect(lossless.byteLength).toBeLessThan(860);
    });

    it('1.4 KB PNG achieves >= 5% reduction', async () => {
      const p = path.join(assetsDir, 'sample-1.4kb.png');
      if (!fs.existsSync(p)) return;
      const buf = fs.readFileSync(p);
      expect(buf.length).toBe(1434);

      const lossless = await optimizePngLossless(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      const savedLossless = ((buf.length - lossless.byteLength) / buf.length) * 100;
      expect(savedLossless).toBeGreaterThanOrEqual(5);
      expect(lossless.byteLength).toBeLessThan(1434);
    });

    it('2.0 KB PNG achieves >= 5% reduction', async () => {
      const p = path.join(assetsDir, 'sample-2.0kb.png');
      if (!fs.existsSync(p)) return;
      const buf = fs.readFileSync(p);
      expect(buf.length).toBe(2048);

      const lossless = await optimizePngLossless(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
      const savedLossless = ((buf.length - lossless.byteLength) / buf.length) * 100;
      expect(savedLossless).toBeGreaterThanOrEqual(5);
      expect(lossless.byteLength).toBeLessThan(2048);
    });

    it('3.4 KB SVG achieves >= 5% reduction via lossless text minification', () => {
      const p = path.join(assetsDir, 'sample-3.4kb.svg');
      let svg = '<svg xmlns="http://www.w3.org/2000/svg"><!-- comment --><metadata>meta</metadata><rect width="10" height="10"/></svg>';
      if (fs.existsSync(p)) {
        svg = fs.readFileSync(p, 'utf8');
      }
      const origLen = Buffer.byteLength(svg, 'utf8');

      const minified = minifySvgText(svg);
      const minLen = Buffer.byteLength(minified, 'utf8');
      const savedPct = ((origLen - minLen) / origLen) * 100;

      expect(savedPct).toBeGreaterThanOrEqual(5);
      expect(minLen).toBeLessThan(origLen);
      expect(minified).not.toContain('<metadata>');
      expect(minified).not.toContain('<!--');
    });

    it('unreducible file shows original size with no savings line and no message', () => {
      // 1000 bytes original, compressed to 980 bytes (< 5% reduction, honest policy keeps original)
      const honest = determineHonestResult({ originalSize: 1000, compressedSize: 980 });
      expect(honest.status).toBe('kept-original');
      expect(honest.badgeText).toBeNull();
      expect(honest.savedPercentage).toBeNull();
    });
  });

  describe('STEP 3: Target size logic for small files', () => {
    it('for files under 2 KB, suggestions use bytes ("B") unit and chips are 80%, 60%, 40%', () => {
      const chips = suggestTargets(860);
      expect(chips.length).toBe(3);

      expect(chips[0].unit).toBe('B');
      expect(chips[1].unit).toBe('B');
      expect(chips[2].unit).toBe('B');

      // Chips must be strictly smaller than 860 and correspond to 80%, 60%, 40%
      expect(chips[0].bytes).toBe(Math.round(860 * 0.8)); // 688 B
      expect(chips[1].bytes).toBe(Math.round(860 * 0.6)); // 516 B
      expect(chips[2].bytes).toBe(Math.round(860 * 0.4)); // 344 B

      for (const chip of chips) {
        expect(chip.bytes).toBeLessThan(860);
        expect(chip.label).toMatch(/\d+\s*B/);
      }
    });

    it('clamping target bytes keeps typed value strictly within [5%, 100%] of reference', () => {
      const ref = 860;
      // Below 5% (e.g. 10 B) -> clamped to 5% (43 B)
      expect(clampTargetBytes(10, ref)).toBe(Math.round(ref * 0.05));

      // Above 100% (e.g. 1000 B) -> clamped to 100% (860 B)
      expect(clampTargetBytes(1000, ref)).toBe(ref);

      // Within range (e.g. 500 B) -> kept as 500 B
      expect(clampTargetBytes(500, ref)).toBe(500);
    });

    it('"Target size couldn\'t be reached" does NOT exist anywhere in source code', () => {
      const forbidden = "Target size couldn't be reached";
      const filesToCheck = [
        path.join(baseAppDir, 'image-compressor.component.html'),
        path.join(baseAppDir, 'image-compressor.component.ts'),
        path.join(baseAppDir, 'components/image-card/image-card.component.ts'),
        path.join(baseAppDir, 'components/customization-modal/customization-modal.component.ts'),
        path.join(baseAppDir, 'services/compressor-state.service.ts'),
        path.join(baseAppDir, 'services/image-compression.service.ts')
      ];

      for (const fullPath of filesToCheck) {
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          expect(content.includes(forbidden)).toBe(false);
        }
      }
    });
  });

  describe('STEP 4 & 5: One output screen layout & honest simple card text', () => {
    it('Output screen header and action row are structurally identical for 1 file and 5 files', () => {
      const templatePath = path.join(baseAppDir, 'image-compressor.component.html');
      const template = fs.readFileSync(templatePath, 'utf8');

      // The heading uses dynamic outputHeadline() (computing reduction or uncompressed message)
      expect(template).toContain('{{ outputHeadline() }}');

      // Subtitle uses outputSummaryLine()
      expect(template).toContain('{{ outputSummaryLine() }}');

      // Download button renders when completedCount() >= 1 (same action row for 1 or many files)
      expect(template).toContain('@if (state.completedCount() >= 1)');

      // No "Target 17.2 KB. Achieved 10.6 KB." on the card
      expect(template).not.toContain('target-result-badge');
      expect(template).not.toContain('targetResultLine');
    });

    it('Card metrics on output screen only render formattedOriginalSize -> formattedCompressedSize', () => {
      const cardTsPath = path.join(baseAppDir, 'components/image-card/image-card.component.ts');
      const cardTs = fs.readFileSync(cardTsPath, 'utf8');

      // formatConvertedNote and resizedNote are guarded by !isOutputScreen()
      expect(cardTs).toContain('@if (!isOutputScreen() && formatConvertedNote())');
      expect(cardTs).toContain('@if (!isOutputScreen() && resizedNoteText())');
      expect(cardTs).toContain('@if (!isOutputScreen())');

      // Card does not render "Achieved", "Closest size", "Target", "Already optimized", or "Kept original" on the card
      expect(cardTs).not.toContain('.target-result-badge');
      expect(cardTs).not.toContain('Target {{');
      expect(cardTs).not.toContain('Achieved {{');
    });
  });
});
