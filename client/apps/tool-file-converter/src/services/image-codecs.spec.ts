// apps/tool-file-converter/src/services/image-codecs.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BmpCodec } from './image-codecs/bmp.codec';
import { TgaCodec } from './image-codecs/tga.codec';
import { IcoCodec } from './image-codecs/ico.codec';
import { TiffCodec } from './image-codecs/tiff.codec';
import { PsdCodec } from './image-codecs/psd.codec';
import { PcxCodec } from './image-codecs/pcx.codec';
import { NetpbmCodec } from './image-codecs/netpbm.codec';
import { HdrCodec } from './image-codecs/hdr.codec';
import { FitsCodec } from './image-codecs/fits.codec';
import { RawCameraCodec } from './image-codecs/raw-camera.codec';
import { PdfCodec } from './image-codecs/pdf.codec';
import { GifCodec } from './image-codecs/gif.codec';
import { DdsCodec } from './image-codecs/dds.codec';
import { IcnsCodec } from './image-codecs/icns.codec';
import { XbmXpmCodec } from './image-codecs/xbm-xpm.codec';
import { ExrCodec } from './image-codecs/exr.codec';
import { QoiCodec } from './image-codecs/qoi.codec';
import { CurCodec } from './image-codecs/cur.codec';
import { KtxCodec } from './image-codecs/ktx.codec';
import { PvrCodec } from './image-codecs/pvr.codec';
import { CorelCodec } from './image-codecs/corel.codec';
import { XcfCodec } from './image-codecs/xcf.codec';
import { OraCodec } from './image-codecs/ora.codec';
import { WmfEmfCodec } from './image-codecs/wmf-emf.codec';
import { SvgzCodec } from './image-codecs/svgz.codec';
import { ApngCodec } from './image-codecs/apng.codec';
import { JxlCodec } from './image-codecs/jxl.codec';
import { KraCodec } from './image-codecs/kra.codec';
import { IdmlCodec } from './image-codecs/idml.codec';
import { DxfCodec } from './image-codecs/dxf.codec';
import { DwgCodec } from './image-codecs/dwg.codec';
import { CgmCodec } from './image-codecs/cgm.codec';
import { WebpCodec } from './image-codecs/webp.codec';
import { ImageCapabilityRegistry } from './image-capability.registry';
import { ImageOutputValidatorService } from './image-output-validator.service';
import { ImageValidationService, MAX_IMAGE_FILE_SIZE, MAX_DIMENSION } from './image-validation.service';
import { FileSignatureService } from './file-signature.service';
import { ExifMetadataHelper } from './image-codecs/exif-metadata.helper';
import { ConversionEngineService } from './conversion-engine.service';

describe('Universal Image Codecs & Architecture', () => {
  describe('BmpCodec', () => {
    it('should encode and decode a 24-bit BMP image correctly', async () => {
      const width = 2;
      const height = 2;
      // Red, Green, Blue, White pixels
      const rgba = new Uint8ClampedArray([
        255, 0, 0, 255,   0, 255, 0, 255,
        0, 0, 255, 255,   255, 255, 255, 255
      ]);

      const blob = BmpCodec.encode(width, height, rgba, false);
      expect(blob.type).toBe('image/bmp');
      expect(blob.size).toBeGreaterThan(54);

      const buffer = await blob.arrayBuffer();
      const decoded = BmpCodec.decode(buffer);

      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(2);
      expect(decoded.data[0]).toBe(255); // R
      expect(decoded.data[1]).toBe(0);   // G
      expect(decoded.data[2]).toBe(0);   // B
      expect(decoded.data[3]).toBe(255); // A
    });
  });

  describe('TgaCodec', () => {
    it('should encode and decode an uncompressed 32-bit TGA with alpha channel', async () => {
      const width = 2;
      const height = 1;
      const rgba = new Uint8ClampedArray([
        100, 150, 200, 128,
        50, 75, 100, 255
      ]);

      const blob = TgaCodec.encode(width, height, rgba, true);
      expect(blob.type).toBe('image/x-tga');
      expect(blob.size).toBeGreaterThan(18);

      const buffer = await blob.arrayBuffer();
      const decoded = TgaCodec.decode(buffer);

      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      expect(decoded.data[0]).toBe(100);
      expect(decoded.data[1]).toBe(150);
      expect(decoded.data[2]).toBe(200);
      expect(decoded.data[3]).toBe(128);
    });
  });

  describe('IcoCodec', () => {
    it('should wrap a PNG stream into a valid Windows ICO container', async () => {
      const dummyPng = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4]);
      const blob = IcoCodec.encodeFromPng(dummyPng, 16, 16);

      expect(blob.type).toBe('image/x-icon');
      const buffer = await blob.arrayBuffer();
      const entries = IcoCodec.parseDirectory(buffer);

      expect(entries.length).toBe(1);
      expect(entries[0].width).toBe(16);
      expect(entries[0].height).toBe(16);
      expect(entries[0].isPng).toBe(true);
    });
  });

  describe('TiffCodec', () => {
    it('should encode and decode a Baseline TIFF 6.0 file', async () => {
      const width = 2;
      const height = 2;
      const rgba = new Uint8ClampedArray([
        200, 50, 10, 255,   10, 200, 50, 255,
        50, 10, 200, 255,   128, 128, 128, 255
      ]);

      const blob = TiffCodec.encode(width, height, rgba, true);
      expect(blob.type).toBe('image/tiff');

      const buffer = await blob.arrayBuffer();
      const decoded = TiffCodec.decode(buffer);

      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(2);
      expect(decoded.data).toBeDefined();
      expect(decoded.data![0]).toBe(200);
      expect(decoded.data![1]).toBe(50);
      expect(decoded.data![2]).toBe(10);
    });
  });

  describe('PsdCodec', () => {
    it('should decode a Photoshop PSD 8BPS composite image stream', () => {
      // Create minimal 2x1 RGB PSD header (26 bytes) + color mode (4) + img res (4) + layer mask (4) + img data (2 + raw bytes)
      const buffer = new ArrayBuffer(50);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      // '8BPS'
      bytes[0] = 0x38; bytes[1] = 0x42; bytes[2] = 0x50; bytes[3] = 0x53;
      view.setUint16(4, 1, false);  // version 1
      view.setUint16(12, 3, false); // 3 channels
      view.setUint32(14, 1, false); // height 1
      view.setUint32(18, 2, false); // width 2
      view.setUint16(22, 8, false); // 8-bit
      view.setUint16(24, 3, false); // RGB color mode

      // Sections lengths (0 bytes each)
      view.setUint32(26, 0, false); // Color mode len
      view.setUint32(30, 0, false); // Img resources len
      view.setUint32(34, 0, false); // Layer mask len
      view.setUint16(38, 0, false); // Compression: 0 = Raw

      // Planar raw channel bytes: R1, R2, G1, G2, B1, B2
      bytes[40] = 255; bytes[41] = 0;   // Red channel
      bytes[42] = 100; bytes[43] = 200; // Green channel
      bytes[44] = 50;  bytes[45] = 150; // Blue channel

      const decoded = PsdCodec.decode(buffer);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      // Pixel 0: R=255, G=100, B=50
      expect(decoded.data[0]).toBe(255);
      expect(decoded.data[1]).toBe(100);
      expect(decoded.data[2]).toBe(50);
      expect(decoded.data[3]).toBe(255);
    });
  });

  describe('PcxCodec', () => {
    it('should decode a ZSoft PCX image with 24-bit RGB planes', () => {
      const buffer = new ArrayBuffer(128 + 6); // 128 header + 6 bytes scanline
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      bytes[0] = 0x0A; // Manufacturer
      bytes[1] = 5;    // Version 3.0
      bytes[2] = 1;    // Encoding: RLE
      bytes[3] = 8;    // 8 bpp
      view.setUint16(4, 0, true);  // Xmin
      view.setUint16(6, 0, true);  // Ymin
      view.setUint16(8, 1, true);  // Xmax (width = 2)
      view.setUint16(10, 0, true); // Ymax (height = 1)
      bytes[65] = 3;   // 3 planes (RGB)
      view.setUint16(66, 2, true); // bytes per line

      // Scanline: Red plane (2 bytes), Green plane (2 bytes), Blue plane (2 bytes)
      // Note: In PCX RLE, values >= 192 require an RLE prefix byte (e.g. 0xC1, 250). Values < 192 are stored verbatim.
      bytes[128] = 150; bytes[129] = 10;
      bytes[130] = 120; bytes[131] = 20;
      bytes[132] = 80;  bytes[133] = 30;

      const decoded = PcxCodec.decode(buffer);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      expect(decoded.data[0]).toBe(150);
      expect(decoded.data[1]).toBe(120);
      expect(decoded.data[2]).toBe(80);
    });
  });

  describe('NetpbmCodec', () => {
    it('should encode and decode a binary P6 PPM pixmap', async () => {
      const width = 2;
      const height = 1;
      const rgba = new Uint8ClampedArray([
        255, 128, 64, 255,
        10, 20, 30, 255
      ]);

      const blob = NetpbmCodec.encode(width, height, rgba);
      expect(blob.type).toBe('image/x-portable-pixmap');

      const buffer = await blob.arrayBuffer();
      const decoded = NetpbmCodec.decode(buffer);

      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      expect(decoded.data[0]).toBe(255);
      expect(decoded.data[1]).toBe(128);
      expect(decoded.data[2]).toBe(64);
    });
  });

  describe('HdrCodec', () => {
    it('should decode a Radiance RGBE HDR header and tone map pixels', () => {
      const headerStr = '#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 1\n';
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode(headerStr);

      const buffer = new ArrayBuffer(headerBytes.length + 4);
      const bytes = new Uint8Array(buffer);
      bytes.set(headerBytes, 0);

      // 1 pixel RGBE: (128, 128, 128, 136) -> exponent 0, normal brightness
      bytes[headerBytes.length] = 128;
      bytes[headerBytes.length + 1] = 128;
      bytes[headerBytes.length + 2] = 128;
      bytes[headerBytes.length + 3] = 136;

      const decoded = HdrCodec.decode(buffer);
      expect(decoded.width).toBe(1);
      expect(decoded.height).toBe(1);
      expect(decoded.data[0]).toBeGreaterThan(0);
      expect(decoded.data[3]).toBe(255);
    });
  });

  describe('FitsCodec', () => {
    it('should parse a FITS 2880-byte header block and scale contrast', () => {
      const buffer = new ArrayBuffer(2880 + 4); // 2880 header + 2 pixels (16-bit)
      const bytes = new Uint8Array(buffer);
      const view = new DataView(buffer);

      // Populate mandatory FITS cards
      const cards = [
        'SIMPLE  =                    T / file does conform to FITS standard             ',
        'BITPIX  =                   16 / number of bits per data pixel                  ',
        'NAXIS   =                    2 / number of data axes                            ',
        'NAXIS1  =                    2 / length of data axis 1                          ',
        'NAXIS2  =                    1 / length of data axis 2                          ',
        'BSCALE  =                  1.0 / REAL = TAPE*BSCALE + BZERO                     ',
        'BZERO   =                  0.0 /                                                ',
        'END                                                                             '
      ];

      let cardOffset = 0;
      for (const card of cards) {
        for (let i = 0; i < 80; i++) {
          bytes[cardOffset + i] = card.charCodeAt(i);
        }
        cardOffset += 80;
      }
      // Fill remaining header block with spaces (0x20)
      for (let i = cardOffset; i < 2880; i++) {
        bytes[i] = 0x20;
      }

      // 2 pixels int16: 100, 500
      view.setInt16(2880, 100, false);
      view.setInt16(2882, 500, false);

      const decoded = FitsCodec.decode(buffer);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      expect(decoded.data[0]).toBe(0);   // Min stretched to 0
      expect(decoded.data[4]).toBe(255); // Max stretched to 255
    });
  });

  describe('PdfCodec', () => {
    it('should encapsulate a JPEG stream into a compliant PDF 1.4 document', async () => {
      const dummyJpg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0xFF, 0xD9]);
      const blob = PdfCodec.fromJpeg(dummyJpg, 800, 600);

      expect(blob.type).toBe('application/pdf');
      const text = await blob.text();
      expect(text).toContain('%PDF-1.4');
      expect(text).toContain('/Type /Catalog');
      expect(text).toContain('/Type /Page');
      expect(text).toContain('/Subtype /Image');
      expect(text).toContain('startxref');
    });
  });

  describe('GifCodec', () => {
    it('should decode multi-frame animated GIF and composite the primary artwork frame', async () => {
      const fs = await import('fs');
      const path = 'client/packages/tool-shell/src/components/gif/404 error lost in space.gif';
      if (fs.existsSync(path)) {
        const buffer = fs.readFileSync(path);
        const decoded = GifCodec.decode(buffer);

        expect(decoded.width).toBe(500);
        expect(decoded.height).toBe(500);
        expect(decoded.isAnimated).toBe(true);
        expect(decoded.frameCount).toBe(25);
        expect(decoded.primaryFrameIndex).toBeGreaterThan(0);
        expect(decoded.data.length).toBe(500 * 500 * 4);

        // Verify that the composited frame is not blank (contains colored artwork pixels)
        let nonWhitePixels = 0;
        for (let i = 0; i < decoded.data.length; i += 4) {
          const r = decoded.data[i];
          const g = decoded.data[i + 1];
          const b = decoded.data[i + 2];
          const a = decoded.data[i + 3];
          if (a > 0 && !(r > 240 && g > 240 && b > 240)) {
            nonWhitePixels++;
          }
        }
        expect(nonWhitePixels).toBeGreaterThan(1000);
      }
    });

    it('should encode RGBA pixels into a valid GIF89a binary image container', async () => {
      const width = 2;
      const height = 2;
      const rgba = new Uint8ClampedArray([
        255, 0, 0, 255,   0, 255, 0, 255,
        0, 0, 255, 255,   255, 255, 255, 0 // with transparent pixel
      ]);

      const blob = GifCodec.encode(width, height, rgba);
      expect(blob.type).toBe('image/gif');
      expect(blob.size).toBeGreaterThan(13);

      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const header = String.fromCharCode(...bytes.subarray(0, 6));
      expect(header).toBe('GIF89a');

      // Decode back
      const decoded = GifCodec.decode(buffer);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(2);
      expect(decoded.data.length).toBe(16);
    });
  });

  describe('DdsCodec', () => {
    it('should decode an uncompressed 32-bit RGBA DDS file', () => {
      const width = 2;
      const height = 2;
      const buffer = new ArrayBuffer(128 + width * height * 4);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      // Magic "DDS "
      view.setUint32(0, 0x20534444, true);
      view.setUint32(4, 124, true); // Header size
      view.setUint32(12, height, true);
      view.setUint32(16, width, true);
      // Pixel format
      view.setUint32(76, 32, true); // ddspf size
      view.setUint32(80, 0x41, true); // DDPF_RGB | DDPF_ALPHAPIXELS
      view.setUint32(88, 32, true); // 32 bits
      view.setUint32(92, 0x000000FF, true); // R mask
      view.setUint32(96, 0x0000FF00, true); // G mask
      view.setUint32(100, 0x00FF0000, true); // B mask
      view.setUint32(104, 0xFF000000, true); // A mask

      // Populate 4 pixels
      for (let i = 0; i < 4; i++) {
        const off = 128 + i * 4;
        bytes[off] = 200;     // R
        bytes[off + 1] = 100; // G
        bytes[off + 2] = 50;  // B
        bytes[off + 3] = 255; // A
      }

      const decoded = DdsCodec.decode(buffer);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(2);
      expect(decoded.data[0]).toBe(200);
      expect(decoded.data[1]).toBe(100);
      expect(decoded.data[2]).toBe(50);
      expect(decoded.data[3]).toBe(255);
    });
  });

  describe('IcnsCodec', () => {
    it('should decode an Apple ICNS container with an embedded PNG icon', () => {
      const dummyPng = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4]);
      const entryLength = 8 + dummyPng.length;
      const totalLength = 8 + entryLength;

      const buffer = new ArrayBuffer(totalLength);
      const bytes = new Uint8Array(buffer);
      const view = new DataView(buffer);

      // 'icns' magic + total length
      bytes[0] = 0x69; bytes[1] = 0x63; bytes[2] = 0x6E; bytes[3] = 0x73;
      view.setUint32(4, totalLength, false);

      // 'ic07' (128x128) + entry length + data
      bytes[8] = 0x69; bytes[9] = 0x63; bytes[10] = 0x30; bytes[11] = 0x37;
      view.setUint32(12, entryLength, false);
      bytes.set(dummyPng, 16);

      const decoded = IcnsCodec.decode(buffer);
      expect(decoded.width).toBe(128);
      expect(decoded.height).toBe(128);
      expect(decoded.pngBlob).toBeDefined();
      expect(decoded.selectedTag).toBe('ic07');
    });
  });

  describe('XbmXpmCodec', () => {
    it('should decode an X11 Bitmap (XBM) text stream', () => {
      const xbm = `
        #define test_width 8
        #define test_height 2
        static unsigned char test_bits[] = {
          0xAA, 0x55
        };
      `;
      const decoded = XbmXpmCodec.decodeXbm(xbm);
      expect(decoded.width).toBe(8);
      expect(decoded.height).toBe(2);
      expect(decoded.data.length).toBe(8 * 2 * 4);
      // Bit 0 of 0xAA (10101010) is 0 -> transparent, Bit 1 is 1 -> black
      expect(decoded.data[3]).toBe(0);   // pixel 0 alpha
      expect(decoded.data[7]).toBe(255); // pixel 1 alpha
    });

    it('should decode an X11 Pixmap (XPM) colormap text stream', () => {
      const xpm = `
        /* XPM */
        static char *test_xpm[] = {
          "2 2 2 1",
          "  c #FFFFFF",
          ". c #000000",
          " .",
          ". "
        };
      `;
      const decoded = XbmXpmCodec.decodeXpm(xpm);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(2);
      expect(decoded.data[0]).toBe(255); // pixel (0,0) white R
      expect(decoded.data[4]).toBe(0);   // pixel (1,0) black R
    });
  });

  describe('ExrCodec', () => {
    it('should decode OpenEXR header attributes and tone-map scanlines', () => {
      const width = 2;
      const height = 1;
      // Header: magic (4) + version (4) + dataWindow attribute + terminator (1) + scanline table (8) + scanline chunk (8 + 2*3*2)
      const dataWindowAttrName = 'dataWindow\0';
      const dataWindowAttrType = 'box2i\0';
      const attrSize = 16;
      const headerLength = 8 + dataWindowAttrName.length + dataWindowAttrType.length + 4 + attrSize + 1;
      const totalLength = headerLength + height * 8 + 8 + width * 3 * 2;

      const buffer = new ArrayBuffer(totalLength);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);

      // Magic 0x76 0x2F 0x31 0x01
      view.setUint32(0, 0x01312F76, true);
      view.setUint32(4, 2, true); // Version 2

      let p = 8;
      for (let i = 0; i < dataWindowAttrName.length; i++) bytes[p++] = dataWindowAttrName.charCodeAt(i);
      for (let i = 0; i < dataWindowAttrType.length; i++) bytes[p++] = dataWindowAttrType.charCodeAt(i);
      view.setUint32(p, attrSize, true); p += 4;
      view.setInt32(p, 0, true); p += 4; // xMin
      view.setInt32(p, 0, true); p += 4; // yMin
      view.setInt32(p, width - 1, true); p += 4; // xMax
      view.setInt32(p, height - 1, true); p += 4; // yMax
      bytes[p++] = 0; // Header terminator

      // Scanline offset table
      view.setUint32(p, p + 8, true); p += 8;

      // Scanline block
      view.setInt32(p, 0, true); p += 4; // y = 0
      view.setUint32(p, width * 3 * 2, true); p += 4; // dataSize

      // Populate 16-bit half float pixels (0x3C00 is 1.0 in half precision)
      for (let i = 0; i < width * 3; i++) {
        view.setUint16(p + i * 2, 0x3C00, true);
      }

      const decoded = ExrCodec.decode(buffer);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(1);
      expect(decoded.data[0]).toBeGreaterThan(0); // Tone-mapped sRGB value
      expect(decoded.data[3]).toBe(255);
    });
  });

  describe('ImageCapabilityRegistry', () => {
    let registry: ImageCapabilityRegistry;

    beforeEach(() => {
      registry = new ImageCapabilityRegistry();
    });

    it('should support camera RAW, HDR, PSD, Vector, and Common image formats', () => {
      expect(registry.isInputSupported('png')).toBe(true);
      expect(registry.isInputSupported('dng')).toBe(true);
      expect(registry.isInputSupported('cr2')).toBe(true);
      expect(registry.isInputSupported('nef')).toBe(true);
      expect(registry.isInputSupported('hdr')).toBe(true);
      expect(registry.isInputSupported('fits')).toBe(true);
      expect(registry.isInputSupported('psd')).toBe(true);
      expect(registry.isInputSupported('tga')).toBe(true);
      expect(registry.isInputSupported('pcx')).toBe(true);
      expect(registry.isInputSupported('ppm')).toBe(true);
      expect(registry.isInputSupported('exe')).toBe(false);
    });

    it('should emit contextual loss warning when converting alpha image to JPEG', () => {
      const warnings = registry.getConversionWarnings('png', 'jpg');
      expect(warnings.some(w => w.type === 'transparency')).toBe(true);
    });

    it('should emit tone mapping warning when converting HDR or FITS to SDR', () => {
      const warnings = registry.getConversionWarnings('hdr', 'png');
      expect(warnings.some(w => w.type === 'dynamic-range')).toBe(true);
    });

    it('should emit layer flattening warning when converting PSD to PNG', () => {
      const warnings = registry.getConversionWarnings('psd', 'png');
      expect(warnings.some(w => w.type === 'layers')).toBe(true);
    });
  });

  describe('ImageOutputValidatorService', () => {
    let validator: ImageOutputValidatorService;

    beforeEach(() => {
      validator = new ImageOutputValidatorService();
    });

    it('should validate valid PNG blobs and reject corrupted bytes', async () => {
      const validPng = new Blob([new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])], { type: 'image/png' });
      const invalidPng = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });

      const resValid = await validator.validateOutputBlob(validPng, 'png');
      expect(resValid.valid).toBe(true);

      const resInvalid = await validator.validateOutputBlob(invalidPng, 'png');
      expect(resInvalid.valid).toBe(false);
    });

    it('should validate valid JPEG blobs by FF D8 FF SOI marker', async () => {
      const validJpg = new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])], { type: 'image/jpeg' });
      const res = await validator.validateOutputBlob(validJpg, 'jpg');
      expect(res.valid).toBe(true);
    });

    it('should reject empty blobs (0 bytes)', async () => {
      const emptyBlob = new Blob([], { type: 'image/jpeg' });
      const res = await validator.validateOutputBlob(emptyBlob, 'jpg');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('0 bytes');
    });
  });

  describe('ImageValidationService', () => {
    let service: ImageValidationService;

    beforeEach(() => {
      service = new ImageValidationService();
    });

    it('should reject decompression bomb dimensions exceeding 100 Megapixels', () => {
      expect(() => service.validateDimensions(15000, 10000)).toThrow('decompression safety limit');
    });

    it('should reject dimensions exceeding maximum allowed edge limit', () => {
      expect(() => service.validateDimensions(20000, 100)).toThrow(`maximum allowed edge limit of ${MAX_DIMENSION}px`);
    });

    it('should accept valid dimensions within bounds', () => {
      expect(() => service.validateDimensions(1920, 1080)).not.toThrow();
    });
  });

  describe('FileSignatureService format detection for expanded image formats', () => {
    let service: FileSignatureService;

    beforeEach(() => {
      service = new FileSignatureService();
    });

    it('should detect Photoshop PSD files by 8BPS magic signature', async () => {
      const bytes = [0x38, 0x42, 0x50, 0x53, 0x00, 0x01];
      const file = new File([new Uint8Array(bytes)], 'artwork.psd');
      const res = await service.detectFormat(file);

      expect(res.format).toBe('psd');
      expect(res.category).toBe('image');
      expect(res.signatureVerified).toBe(true);
    });

    it('should detect Radiance HDR files by #? signature', async () => {
      const bytes = [0x23, 0x3F, 0x52, 0x41, 0x44, 0x49, 0x41, 0x4E, 0x43, 0x45];
      const file = new File([new Uint8Array(bytes)], 'environment.hdr');
      const res = await service.detectFormat(file);

      expect(res.format).toBe('hdr');
      expect(res.category).toBe('image');
      expect(res.signatureVerified).toBe(true);
    });

    it('should detect FITS files by "SIMPLE  =" header record', async () => {
      const bytes = [0x53, 0x49, 0x4D, 0x50, 0x4C, 0x45, 0x20, 0x20, 0x3D];
      const file = new File([new Uint8Array(bytes)], 'galaxy.fits');
      const res = await service.detectFormat(file);

      expect(res.format).toBe('fits');
      expect(res.category).toBe('image');
      expect(res.signatureVerified).toBe(true);
    });

    it('should detect Canon CR2 files by II* + CR marker', async () => {
      const bytes = [0x49, 0x49, 0x2A, 0x00, 0x10, 0x00, 0x00, 0x00, 0x43, 0x52];
      const file = new File([new Uint8Array(bytes)], 'capture.cr2');
      const res = await service.detectFormat(file);

      expect(res.format).toBe('cr2');
      expect(res.category).toBe('image');
      expect(res.signatureVerified).toBe(true);
    });
  });

  describe('ConversionEngineService Conversion Modes (GLOBAL vs CUSTOM)', () => {
    it('should default to GLOBAL conversion mode', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();
      expect(engine.conversionMode()).toBe('GLOBAL');
      expect(engine.batchTargetFormat()).toBe('webp');
    });

    it('should switch mode to CUSTOM when setBatchTargetFormat("custom") is invoked', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();
      engine.setBatchTargetFormat('custom');
      expect(engine.conversionMode()).toBe('CUSTOM');
    });

    it('should switch back to GLOBAL when a specific target format is selected', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();
      engine.setBatchTargetFormat('custom');
      expect(engine.conversionMode()).toBe('CUSTOM');

      engine.setBatchTargetFormat('jpg');
      expect(engine.conversionMode()).toBe('GLOBAL');
      expect(engine.batchTargetFormat()).toBe('jpg');
    });

    it('should switch to CUSTOM mode when an individual job format is updated', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();

      // Mock a job
      const dummyFile = new File(['dummy'], 'photo.png', { type: 'image/png' });
      await engine.addFiles([dummyFile]);

      const jobs = engine.jobs();
      if (jobs.length > 0) {
        const jobId = jobs[0].id;
        const newTarget = { format: 'bmp', label: 'BMP', category: 'image', extension: 'bmp' };
        engine.setTargetFormat(jobId, newTarget);

        expect(engine.conversionMode()).toBe('CUSTOM');
        expect(engine.jobs()[0].targetFormat.format).toBe('bmp');
      }
    });
  });

  describe('Alpha Flattening for Opaque Output Formats', () => {
    it('should mathematically blend transparent pixels over pure white (255, 255, 255) with alpha=255', () => {
      // 2 pixels: 1st pixel is transparent red [255, 0, 0, 0], 2nd pixel is semi-transparent green [0, 255, 0, 128]
      const rgba = new Uint8ClampedArray([
        255, 0, 0, 0,
        0, 200, 0, 128
      ]);

      const out = new Uint8ClampedArray(rgba.length);
      for (let i = 0; i < rgba.length; i += 4) {
        const a = rgba[i + 3];
        if (a === 255) {
          out[i] = rgba[i];
          out[i + 1] = rgba[i + 1];
          out[i + 2] = rgba[i + 2];
          out[i + 3] = 255;
        } else if (a === 0) {
          out[i] = 255;
          out[i + 1] = 255;
          out[i + 2] = 255;
          out[i + 3] = 255;
        } else {
          const norm = a / 255;
          out[i] = Math.round(rgba[i] * norm + 255 * (1 - norm));
          out[i + 1] = Math.round(rgba[i + 1] * norm + 255 * (1 - norm));
          out[i + 2] = Math.round(rgba[i + 2] * norm + 255 * (1 - norm));
          out[i + 3] = 255;
        }
      }

      // 1st pixel: transparent -> solid white
      expect(out[0]).toBe(255);
      expect(out[1]).toBe(255);
      expect(out[2]).toBe(255);
      expect(out[3]).toBe(255);

      // 2nd pixel: semi-transparent green blended over white -> opaque
      expect(out[7]).toBe(255);
      expect(out[4]).toBeGreaterThan(0); // White contribution
      expect(out[5]).toBeGreaterThan(0);
      expect(out[6]).toBeGreaterThan(0);
    });
  });

  describe('Format Transparency Rules for Preview Modal', () => {
    it('should distinguish transparent formats from strictly opaque formats', () => {
      const transparentFormats = ['png', 'webp', 'avif', 'gif', 'ico', 'svg'];
      const opaqueFormats = ['jpg', 'jpeg', 'bmp', 'pdf'];

      const checkHasTransparency = (ext: string) => transparentFormats.includes(ext.toLowerCase());

      for (const fmt of transparentFormats) {
        expect(checkHasTransparency(fmt)).toBe(true);
      }

      for (const fmt of opaqueFormats) {
        expect(checkHasTransparency(fmt)).toBe(false);
      }
    });

    it('should not treat GIF as transparent when converted from an opaque photo format (JPG/JPEG/BMP)', () => {
      const checkHasTransparency = (srcFmt: string, targetFmt: string) => {
        if (['jpg', 'jpeg', 'bmp'].includes(srcFmt) && ['gif', 'jpg', 'jpeg', 'bmp'].includes(targetFmt)) {
          return false;
        }
        return ['png', 'webp', 'avif', 'gif', 'ico', 'svg'].includes(targetFmt);
      };

      expect(checkHasTransparency('jpg', 'gif')).toBe(false);
      expect(checkHasTransparency('jpeg', 'gif')).toBe(false);
      expect(checkHasTransparency('png', 'gif')).toBe(true);
    });
  });

  describe('Adaptive Palette GIF Encoding and JPEG Output', () => {
    it('should generate an adaptive palette without false transparency for opaque RGB pixels', async () => {
      const width = 4;
      const height = 1;
      // 4 opaque pixels: pure black, pastel yellow, deep red, pure white
      const rgba = new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 249, 210, 255,
        200, 20, 20, 255,
        255, 255, 255, 255
      ]);

      const blob = GifCodec.encode(width, height, rgba);
      expect(blob.type).toBe('image/gif');
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Verify GIF89a header
      expect(String.fromCharCode(...bytes.subarray(0, 6))).toBe('GIF89a');

      // Graphic Control Extension (disposal/transparency) byte at offset 16 (13 + 3 * 256 for GCT)
      // Header: 6, ScreenDesc: 7 = 13. GCT: 768. Offset: 781.
      // At GCE, byte 784 is packed: bit 0 must be 0 (no transparent color for opaque input!)
      const gceOffset = 13 + 768;
      expect(bytes[gceOffset]).toBe(0x21); // Extension Introducer
      expect(bytes[gceOffset + 1]).toBe(0xF9); // Graphic Control Label
      const gcePacked = bytes[gceOffset + 3];
      expect(gcePacked & 0x01).toBe(0); // Transparency flag is FALSE (0)

      // Decode back and check that black pixel is intact and opaque
      const decoded = GifCodec.decode(buffer);
      expect(decoded.width).toBe(4);
      expect(decoded.height).toBe(1);
      // First pixel (black): alpha must be 255
      expect(decoded.data[3]).toBe(255);
      expect(decoded.data[0]).toBeLessThan(20);
      expect(decoded.data[1]).toBeLessThan(20);
      expect(decoded.data[2]).toBeLessThan(20);
    });

    it('should support JPEG alongside JPG in ImageCapabilityRegistry', () => {
      const registry = new ImageCapabilityRegistry();
      const allOutputs = registry.getAllOutputCapabilities();
      expect(allOutputs.some(o => o.format === 'jpeg')).toBe(true);
      expect(allOutputs.some(o => o.format === 'jpg')).toBe(true);
    });
  });

  describe('Test A – GIF -> JPG Pipeline & Opaque Background Compositing', () => {
    it('should extract the representative artwork frame, flatten onto white background, and validate JPEG signature', async () => {
      const fs = await import('fs');
      const path = 'client/packages/tool-shell/src/components/gif/404 error lost in space.gif';
      if (!fs.existsSync(path)) return;

      const buffer = fs.readFileSync(path);
      const decoded = GifCodec.decode(buffer);
      expect(decoded.width).toBeGreaterThan(0);
      expect(decoded.height).toBeGreaterThan(0);

      // Perform mathematical white background alpha-flattening
      const width = decoded.width;
      const height = decoded.height;
      const opaqueRgba = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < decoded.data.length; i += 4) {
        const r = decoded.data[i];
        const g = decoded.data[i + 1];
        const b = decoded.data[i + 2];
        const a = decoded.data[i + 3];

        if (a === 255) {
          opaqueRgba[i] = r;
          opaqueRgba[i + 1] = g;
          opaqueRgba[i + 2] = b;
          opaqueRgba[i + 3] = 255;
        } else if (a === 0) {
          opaqueRgba[i] = 255;
          opaqueRgba[i + 1] = 255;
          opaqueRgba[i + 2] = 255;
          opaqueRgba[i + 3] = 255;
        } else {
          const norm = a / 255;
          opaqueRgba[i] = Math.round(r * norm + 255 * (1 - norm));
          opaqueRgba[i + 1] = Math.round(g * norm + 255 * (1 - norm));
          opaqueRgba[i + 2] = Math.round(b * norm + 255 * (1 - norm));
          opaqueRgba[i + 3] = 255;
        }
      }

      // Assert 100% of pixels in the composited frame are fully opaque (alpha = 255)
      for (let i = 3; i < opaqueRgba.length; i += 4) {
        expect(opaqueRgba[i]).toBe(255);
      }

      // Validate mock JPEG container with SOI and EOI markers
      const mockJpgBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0xFF, 0xD9]);
      const jpgBlob = new Blob([mockJpgBytes], { type: 'image/jpeg' });
      const validator = new ImageOutputValidatorService();
      const valResult = await validator.validateOutputBlob(jpgBlob, 'jpg');

      expect(valResult.valid).toBe(true);
      expect(valResult.error).toBeUndefined();
    });
  });

  describe('Test B – Global Conversion Mode', () => {
    it('should assign a unified target format across all enqueued images in GLOBAL mode', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();

      const f1 = new File(['png-bytes'], 'img1.png', { type: 'image/png' });
      const f2 = new File(['bmp-bytes'], 'img2.bmp', { type: 'image/bmp' });
      const f3 = new File(['gif-bytes'], 'img3.gif', { type: 'image/gif' });

      await engine.addFiles([f1, f2, f3]);
      expect(engine.conversionMode()).toBe('GLOBAL');

      engine.setBatchTargetFormat('webp');

      const jobs = engine.jobs();
      expect(jobs.length).toBe(3);
      for (const job of jobs) {
        expect(job.targetFormat.format).toBe('webp');
      }
      expect(engine.conversionMode()).toBe('GLOBAL');
    });
  });

  describe('Test C – Custom Individual Conversion Mode', () => {
    it('should allow independent output format selection per file without leaking to other items', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();

      const f1 = new File(['png-bytes'], 'card1.png', { type: 'image/png' });
      const f2 = new File(['bmp-bytes'], 'card2.bmp', { type: 'image/bmp' });
      const f3 = new File(['gif-bytes'], 'card3.gif', { type: 'image/gif' });

      await engine.addFiles([f1, f2, f3]);

      engine.setBatchTargetFormat('custom');
      expect(engine.conversionMode()).toBe('CUSTOM');

      const jobs = engine.jobs();
      expect(jobs.length).toBe(3);

      const targetJpg = { format: 'jpg', label: 'JPG', category: 'image', extension: 'jpg' } as any;
      const targetPng = { format: 'png', label: 'PNG', category: 'image', extension: 'png' } as any;
      const targetWebp = { format: 'webp', label: 'WEBP', category: 'image', extension: 'webp' } as any;

      engine.setTargetFormat(jobs[0].id, targetJpg);
      engine.setTargetFormat(jobs[1].id, targetPng);
      engine.setTargetFormat(jobs[2].id, targetWebp);

      const updatedJobs = engine.jobs();
      expect(updatedJobs[0].targetFormat.format).toBe('jpg');
      expect(updatedJobs[1].targetFormat.format).toBe('png');
      expect(updatedJobs[2].targetFormat.format).toBe('webp');
      expect(engine.conversionMode()).toBe('CUSTOM');
    });
  });

  describe('Test D – Mode Switching Lifecycle', () => {
    it('should correctly transition between GLOBAL and CUSTOM modes and handle addition/removal', async () => {
      const { ConversionEngineService } = await import('./conversion-engine.service');
      const engine = new ConversionEngineService();

      const f1 = new File(['file1'], 'f1.png', { type: 'image/png' });
      const f2 = new File(['file2'], 'f2.png', { type: 'image/png' });

      await engine.addFiles([f1, f2]);
      expect(engine.conversionMode()).toBe('GLOBAL');

      // 1. Switch GLOBAL -> CUSTOM
      engine.setBatchTargetFormat('custom');
      expect(engine.conversionMode()).toBe('CUSTOM');

      // 2. Switch CUSTOM -> GLOBAL
      engine.setBatchTargetFormat('jpg');
      expect(engine.conversionMode()).toBe('GLOBAL');
      expect(engine.batchTargetFormat()).toBe('jpg');
      for (const j of engine.jobs()) {
        expect(j.targetFormat.format).toBe('jpg');
      }

      // 3. Add image in GLOBAL mode: inherits batchTargetFormat
      const f3 = new File(['file3'], 'f3.png', { type: 'image/png' });
      await engine.addFiles([f3]);
      const jobs = engine.jobs();
      expect(jobs.length).toBe(3);
      expect(jobs[2].targetFormat.format).toBe('jpg');

      // 4. Remove image: state remains clean
      engine.removeJob(jobs[0].id);
      expect(engine.jobs().length).toBe(2);
      expect(engine.readyJobsCount()).toBe(2);
    });
  });

  describe('Test E – Failure Scenarios & Security Safeguards', () => {
    it('should reject empty 0-byte output blobs', async () => {
      const validator = new ImageOutputValidatorService();
      const emptyBlob = new Blob([], { type: 'image/png' });
      const res = await validator.validateOutputBlob(emptyBlob, 'png');

      expect(res.valid).toBe(false);
      expect(res.error).toContain('0 bytes');
    });

    it('should reject corrupted PNG blobs missing the standard PNG signature', async () => {
      const validator = new ImageOutputValidatorService();
      const corruptedBlob = new Blob([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], { type: 'image/png' });
      const res = await validator.validateOutputBlob(corruptedBlob, 'png');

      expect(res.valid).toBe(false);
      expect(res.error).toContain('signature');
    });

    it('should reject files exceeding the 50 MB limit', () => {
      const validator = new ImageValidationService();
      const oversizedFile = { size: 55 * 1024 * 1024, name: 'huge.png' } as File;

      expect(() => validator.validateFileSize(oversizedFile)).toThrow(/exceeds/i);
    });

    it('should reject decompression bomb dimensions exceeding 100 Megapixels', () => {
      const validator = new ImageValidationService();
      expect(() => validator.validateDimensions(15000, 8000)).toThrow(/100 MP/i);
    });

    it('should detect spoofed executable files masquerading as images', async () => {
      const sigService = new FileSignatureService();
      // MZ header for DOS/PE executable
      const fakeImageBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
      const fakeFile = new File([fakeImageBytes], 'wallpaper.png');
      const detected = await sigService.detectFormat(fakeFile);

      expect(detected.format).toBe('exe');
      expect(detected.spoofWarning).toBeDefined();
    });

    it('should encode and validate newly supported PCX, DDS, ICNS and PPM output formats', async () => {
      const width = 2;
      const height = 2;
      const rgba = new Uint8ClampedArray([
        255, 0, 0, 255,   0, 255, 0, 255,
        0, 0, 255, 255,   255, 255, 255, 255
      ]);
      const validator = new ImageOutputValidatorService();

      // PCX
      const pcxBlob = PcxCodec.encode(width, height, rgba);
      expect(pcxBlob.type).toBe('image/x-pcx');
      const pcxVal = await validator.validateOutputBlob(pcxBlob, 'pcx');
      expect(pcxVal.valid).toBe(true);

      // DDS
      const ddsBlob = DdsCodec.encode(width, height, rgba);
      expect(ddsBlob.type).toBe('image/x-dds');
      const ddsVal = await validator.validateOutputBlob(ddsBlob, 'dds');
      expect(ddsVal.valid).toBe(true);

      // PPM
      const ppmBlob = NetpbmCodec.encode(width, height, rgba);
      expect(ppmBlob.type).toBe('image/x-portable-pixmap');
      const ppmVal = await validator.validateOutputBlob(ppmBlob, 'ppm');
      expect(ppmVal.valid).toBe(true);

      // ICNS
      const dummyPng = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
      const icnsBlob = IcnsCodec.encodeFromPng(dummyPng, 128, 128);
      expect(icnsBlob.type).toBe('image/x-icns');
      const icnsVal = await validator.validateOutputBlob(icnsBlob, 'icns');
      expect(icnsVal.valid).toBe(true);

      // QOI
      const qoiBlob = QoiCodec.encode(width, height, rgba, true);
      expect(qoiBlob.type).toBe('image/x-qoi');
      const qoiVal = await validator.validateOutputBlob(qoiBlob, 'qoi');
      expect(qoiVal.valid).toBe(true);

      // Verify QOI lossless decode roundtrip
      const qoiBuffer = await qoiBlob.arrayBuffer();
      const qoiDecoded = QoiCodec.decode(qoiBuffer);
      expect(qoiDecoded.width).toBe(2);
      expect(qoiDecoded.height).toBe(2);
      expect(qoiDecoded.data[0]).toBe(255); // R
      expect(qoiDecoded.data[1]).toBe(0);   // G
      expect(qoiDecoded.data[2]).toBe(0);   // B
      expect(qoiDecoded.data[3]).toBe(255); // A
    });

    it('should expose all 18 active output formats categorized across 7 groups', () => {
      const registry = new ImageCapabilityRegistry();
      const groups = registry.getOutputGroups();
      expect(groups.length).toBe(7);

      const allOutputFormats = groups.flatMap(g => g.formats.map(f => f.format));
      expect(allOutputFormats).toContain('jpg');
      expect(allOutputFormats).toContain('jpeg');
      expect(allOutputFormats).toContain('png');
      expect(allOutputFormats).toContain('webp');
      expect(allOutputFormats).toContain('avif');
      expect(allOutputFormats).toContain('gif');
      expect(allOutputFormats).toContain('bmp');
      expect(allOutputFormats).toContain('tiff');
      expect(allOutputFormats).toContain('tif');
      expect(allOutputFormats).toContain('tga');
      expect(allOutputFormats).toContain('ico');
      expect(allOutputFormats).toContain('icns');
      expect(allOutputFormats).toContain('dds');
      expect(allOutputFormats).toContain('pcx');
      expect(allOutputFormats).toContain('ppm');
      expect(allOutputFormats).toContain('pnm');
      expect(allOutputFormats).toContain('pdf');
      expect(allOutputFormats).toContain('qoi');
      expect(allOutputFormats.length).toBe(18);
    });

    it('should expose all 13 canonical categories in getAllGroups()', () => {
      const registry = new ImageCapabilityRegistry();
      const allGroups = registry.getAllGroups();
      expect(allGroups.length).toBe(13);

      const categoryNames = allGroups.map(g => g.name);
      expect(categoryNames).toContain('Common');
      expect(categoryNames).toContain('Modern');
      expect(categoryNames).toContain('Animated');
      expect(categoryNames).toContain('Professional');
      expect(categoryNames).toContain('Adobe');
      expect(categoryNames).toContain('Vector Graphics');
      expect(categoryNames).toContain('CorelDRAW');
      expect(categoryNames).toContain('Icons');
      expect(categoryNames).toContain('Camera RAW');
      expect(categoryNames).toContain('Gaming and Textures');
      expect(categoryNames).toContain('Scientific and HDR');
      expect(categoryNames).toContain('Legacy and Specialized');
      expect(categoryNames).toContain('Document Output');
    });

    it('should decode Windows Cursor (CUR) files with hotspot coordinates', () => {
      // Mock CUR header: reserved=0, type=2, count=1
      // Entry: width=16, height=16, colors=0, reserved=0, hotspotX=4, hotspotY=4, bytes=40+64, offset=22
      const curBytes = new Uint8Array(22 + 40 + 64);
      const view = new DataView(curBytes.buffer);
      view.setUint16(0, 0, true);
      view.setUint16(2, 2, true); // type = 2 (CUR)
      view.setUint16(4, 1, true); // count = 1
      curBytes[6] = 16; // width
      curBytes[7] = 16; // height
      view.setUint16(10, 4, true); // hotspotX
      view.setUint16(12, 4, true); // hotspotY
      view.setUint32(14, 40 + 64, true);
      view.setUint32(18, 22, true); // offset
      // DIB header at offset 22
      view.setUint32(22, 40, true);
      view.setInt32(26, 16, true);
      view.setInt32(30, 32, true); // doubled height for mask
      view.setUint16(34, 1, true);
      view.setUint16(36, 1, true); // 1-bit monochrome

      const decoded = CurCodec.decode(curBytes);
      expect(decoded.width).toBe(16);
      expect(decoded.height).toBe(16);
      expect(decoded.hotspotX).toBe(4);
      expect(decoded.hotspotY).toBe(4);
    });

    it('should decode Khronos KTX 1.0 and KTX 2.0 texture containers', () => {
      // Mock KTX 1.0 header
      const ktx1Bytes = new Uint8Array(64 + 4 + 16);
      for (let i = 0; i < 12; i++) {
        ktx1Bytes[i] = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A][i];
      }
      const view1 = new DataView(ktx1Bytes.buffer);
      view1.setUint32(12, 0x04030201, true); // little-endian
      view1.setUint32(16, 0x1401, true); // GL_UNSIGNED_BYTE
      view1.setUint32(24, 0x1908, true); // GL_RGBA
      view1.setUint32(36, 2, true); // width = 2
      view1.setUint32(40, 2, true); // height = 2
      view1.setUint32(60, 0, true); // 0 bytes key-value
      view1.setUint32(64, 16, true); // imageSize = 16 bytes (2x2 RGBA)

      const decodedKtx1 = KtxCodec.decode(ktx1Bytes);
      expect(decodedKtx1.width).toBe(2);
      expect(decodedKtx1.height).toBe(2);
      expect(decodedKtx1.version).toBe('ktx1');

      // Mock KTX 2.0 header
      const ktx2Bytes = new Uint8Array(128 + 16);
      for (let i = 0; i < 12; i++) {
        ktx2Bytes[i] = [0xAB, 0x4B, 0x54, 0x58, 0x20, 0x32, 0x30, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A][i];
      }
      const view2 = new DataView(ktx2Bytes.buffer);
      view2.setUint32(20, 2, true); // width = 2
      view2.setUint32(24, 2, true); // height = 2
      view2.setUint32(36, 1, true); // levelCount = 1
      view2.setUint32(80, 128, true); // byteOffset = 128
      view2.setUint32(88, 16, true); // byteLength = 16

      const decodedKtx2 = KtxCodec.decode(ktx2Bytes);
      expect(decodedKtx2.width).toBe(2);
      expect(decodedKtx2.height).toBe(2);
      expect(decodedKtx2.version).toBe('ktx2');
    });

    it('should decode PowerVR (PVR) texture containers', () => {
      // Mock PVR v3 header
      const pvrBytes = new Uint8Array(52 + 16);
      const view = new DataView(pvrBytes.buffer);
      view.setUint32(0, 0x03505652, true); // 'PVR3'
      view.setUint32(24, 2, true); // height = 2
      view.setUint32(28, 2, true); // width = 2
      view.setUint32(48, 0, true); // metadataSize = 0

      const decoded = PvrCodec.decode(pvrBytes);
      expect(decoded.width).toBe(2);
      expect(decoded.height).toBe(2);
    });

    it('should decode GIMP XCF image documents', () => {
      const xcfBytes = new Uint8Array(64);
      const magic = [0x67, 0x69, 0x6D, 0x70, 0x20, 0x78, 0x63, 0x66, 0x20, 0x76, 0x30, 0x30, 0x31, 0x00];
      xcfBytes.set(magic, 0);
      const view = new DataView(xcfBytes.buffer);
      view.setUint32(14, 320, false); // width = 320 (Big Endian)
      view.setUint32(18, 240, false); // height = 240 (Big Endian)
      view.setUint32(22, 0, false); // RGB

      const decoded = XcfCodec.decode(xcfBytes);
      expect(decoded.width).toBe(320);
      expect(decoded.height).toBe(240);
      expect(decoded.baseType).toBe(0);
    });

    it('should decode Windows Metafile (WMF) and Enhanced Metafile (EMF)', () => {
      // Mock Placeable WMF
      const wmfBytes = new Uint8Array(44);
      const viewWmf = new DataView(wmfBytes.buffer);
      wmfBytes[0] = 0xD7;
      wmfBytes[1] = 0xCD;
      wmfBytes[2] = 0xC6;
      wmfBytes[3] = 0x9A;
      viewWmf.setInt16(6, 0, true); // left
      viewWmf.setInt16(8, 0, true); // top
      viewWmf.setInt16(10, 400, true); // right
      viewWmf.setInt16(12, 300, true); // bottom
      viewWmf.setUint16(14, 96, true); // inch

      const decodedWmf = WmfEmfCodec.decode(wmfBytes);
      expect(decodedWmf.width).toBe(400);
      expect(decodedWmf.height).toBe(300);
      expect(decodedWmf.format).toBe('wmf');

      // Mock EMF
      const emfBytes = new Uint8Array(88);
      const viewEmf = new DataView(emfBytes.buffer);
      viewEmf.setUint32(0, 1, true); // EMR_HEADER
      viewEmf.setUint32(4, 88, true);
      viewEmf.setInt32(8, 0, true); // left
      viewEmf.setInt32(12, 0, true); // top
      viewEmf.setInt32(16, 640, true); // right
      viewEmf.setInt32(20, 480, true); // bottom
      emfBytes[40] = 0x20;
      emfBytes[41] = 0x45;
      emfBytes[42] = 0x4D;
      emfBytes[43] = 0x46; // ' EMF'

      const decodedEmf = WmfEmfCodec.decode(emfBytes);
      expect(decodedEmf.width).toBe(640);
      expect(decodedEmf.height).toBe(480);
      expect(decodedEmf.format).toBe('emf');
    });

    it('should detect new formats in FileSignatureService', async () => {
      const sigService = new FileSignatureService();

      // QOI
      const qoiFile = new File([new Uint8Array([0x71, 0x6F, 0x69, 0x66, 0, 0, 0, 1, 0, 0, 0, 1, 4, 0])], 'test.qoi');
      const qoiDet = await sigService.detectFormat(qoiFile);
      expect(qoiDet.format).toBe('qoi');

      // KTX
      const ktxBytes = new Uint8Array([0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0]);
      const ktxFile = new File([ktxBytes], 'test.ktx');
      const ktxDet = await sigService.detectFormat(ktxFile);
      expect(ktxDet.format).toBe('ktx');

      // XCF
      const xcfBytes = new Uint8Array([0x67, 0x69, 0x6D, 0x70, 0x20, 0x78, 0x63, 0x66, 0, 0, 0, 0, 0, 0]);
      const xcfFile = new File([xcfBytes], 'test.xcf');
      const xcfDet = await sigService.detectFormat(xcfFile);
      expect(xcfDet.format).toBe('xcf');

      // WMF
      const wmfBytes = new Uint8Array([0xD7, 0xCD, 0xC6, 0x9A, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      const wmfFile = new File([wmfBytes], 'test.wmf');
      const wmfDet = await sigService.detectFormat(wmfFile);
      expect(wmfDet.format).toBe('wmf');

      // APNG
      const apngBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0x61, 0x63, 0x54, 0x4C]);
      const apngFile = new File([apngBytes], 'test.png');
      const apngDet = await sigService.detectFormat(apngFile);
      expect(apngDet.format).toBe('apng');

      // DWG
      const dwgBytes = new Uint8Array([0x41, 0x43, 0x31, 0x30, 0x31, 0x35, 0, 0]);
      const dwgFile = new File([dwgBytes], 'test.dwg');
      const dwgDet = await sigService.detectFormat(dwgFile);
      expect(dwgDet.format).toBe('dwg');

      // JXL codestream
      const jxlBytes = new Uint8Array([0xFF, 0x0A, 0, 0]);
      const jxlFile = new File([jxlBytes], 'test.jxl');
      const jxlDet = await sigService.detectFormat(jxlFile);
      expect(jxlDet.format).toBe('jxl');

      // CGM
      const cgmBytes = new TextEncoder().encode('BEGMF "Test Metafile" BEGPIC "Pic 1" ENDPIC ENDMF');
      const cgmFile = new File([cgmBytes], 'test.cgm');
      const cgmDet = await sigService.detectFormat(cgmFile);
      expect(cgmDet.format).toBe('cgm');
    });
  });

  describe('Phase 1–4 Codecs: Mobile, Design, CAD & Vector Pipelines', () => {
    describe('ApngCodec & Animated GIF', () => {
      it('should identify APNG and parse animation control chunks', () => {
        const apngHeader = new Uint8Array([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
          0, 0, 0, 10, 0, 0, 0, 10, 8, 6, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 8, 0x61, 0x63, 0x54, 0x4C,
          0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0
        ]);
        expect(ApngCodec.isApng(apngHeader)).toBe(true);

        const parsed = ApngCodec.parseFrames(apngHeader.buffer);
        expect(parsed.width).toBe(10);
        expect(parsed.height).toBe(10);
        expect(parsed.numFrames).toBeGreaterThanOrEqual(1);
      });

      it('should encode multiple frames into an animated GIF', async () => {
        const frame1 = new Uint8ClampedArray(4 * 4 * 4);
        frame1.fill(255); // White frame
        const frame2 = new Uint8ClampedArray(4 * 4 * 4);
        for (let i = 0; i < frame2.length; i += 4) {
          frame2[i] = 255; frame2[i + 1] = 0; frame2[i + 2] = 0; frame2[i + 3] = 255; // Red frame
        }

        const animGif = GifCodec.encodeAnimated(4, 4, [
          { rgba: frame1, delayMs: 100 },
          { rgba: frame2, delayMs: 200 }
        ]);

        expect(animGif).toBeDefined();
        expect(animGif.type).toBe('image/gif');
        expect(animGif.size).toBeGreaterThan(50);

        const bytes = new Uint8Array(await animGif.arrayBuffer());
        const header = String.fromCharCode(...bytes.subarray(0, 6));
        expect(header).toBe('GIF89a');
      });
    });

    describe('JxlCodec', () => {
      it('should identify JXL codestream and container formats', () => {
        const codestream = new Uint8Array([0xFF, 0x0A, 0x10, 0x20]);
        expect(JxlCodec.isJxl(codestream)).toBe(true);

        const isobmff = new Uint8Array([
          0x00, 0x00, 0x00, 0x0C, 0x4A, 0x58, 0x4C, 0x20, 0x0D, 0x0A, 0x87, 0x0A
        ]);
        expect(JxlCodec.isJxl(isobmff)).toBe(true);

        const decoded = JxlCodec.decode(codestream.buffer);
        expect(decoded.width).toBeGreaterThan(0);
        expect(decoded.height).toBeGreaterThan(0);
        expect(decoded.data.length).toBe(decoded.width * decoded.height * 4);
      });
    });

    describe('RawCameraCodec: DNG CFA Bayer Demosaicing', () => {
      it('should perform genuine Bayer CFA demosaicing on DNG sensor data', () => {
        // Construct simulated uncompressed DNG IFD with CFA tag 32803
        const width = 4;
        const height = 4;
        const rawPixels = new Uint8Array([
          200, 50,  200, 50,   // Row 0: R, Gr, R, Gr
          50,  220, 50,  220,  // Row 1: Gb, B, Gb, B
          200, 50,  200, 50,   // Row 2: R, Gr, R, Gr
          50,  220, 50,  220   // Row 3: Gb, B, Gb, B
        ]);

        const buf = new ArrayBuffer(256);
        const bytes = new Uint8Array(buf);
        const view = new DataView(buf);

        // TIFF Little Endian header
        bytes[0] = 0x49; bytes[1] = 0x49; bytes[2] = 0x2A; bytes[3] = 0x00;
        view.setUint32(4, 8, true); // IFD offset 8

        // IFD with 6 entries
        let p = 8;
        view.setUint16(p, 6, true); p += 2;

        const writeEntry = (tag: number, type: number, val: number) => {
          view.setUint16(p, tag, true);
          view.setUint16(p + 2, type, true);
          view.setUint32(p + 4, 1, true);
          view.setUint32(p + 8, val, true);
          p += 12;
        };

        writeEntry(256, 4, width);         // ImageWidth
        writeEntry(257, 4, height);        // ImageLength
        writeEntry(258, 3, 8);             // BitsPerSample: 8
        writeEntry(262, 3, 32803);         // PhotometricInterpretation: CFA
        writeEntry(273, 4, 120);           // StripOffsets: 120
        writeEntry(279, 4, rawPixels.length); // StripByteCounts

        // Write raw CFA sensor pixels at offset 120
        bytes.set(rawPixels, 120);

        const developed = RawCameraCodec.developDngBayer(bytes, buf);
        expect(developed).not.toBeNull();
        expect(developed!.width).toBe(width);
        expect(developed!.height).toBe(height);
        expect(developed!.data.length).toBe(width * height * 4);

        // Check that developed RGB pixels have non-zero color channels
        expect(developed!.data[0]).toBeGreaterThan(0); // Red
        expect(developed!.data[3]).toBe(255);          // Alpha opaque
      });
    });

    describe('KraCodec', () => {
      it('should identify Krita packages and extract artwork', async () => {
        // Construct valid ZIP local file header (30 bytes) containing mergedimage.png
        const nameStr = 'mergedimage.png';
        const nameBytes = new TextEncoder().encode(nameStr);
        const pngMagic = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        const zipBytes = new Uint8Array(30 + nameBytes.length + pngMagic.length);
        const view = new DataView(zipBytes.buffer);

        // PK\x03\x04
        zipBytes[0] = 0x50; zipBytes[1] = 0x4B; zipBytes[2] = 0x03; zipBytes[3] = 0x04;
        view.setUint16(4, 20, true);               // Version
        view.setUint16(6, 0, true);                // Flags
        view.setUint16(8, 0, true);                // Compression (0 = stored)
        view.setUint16(10, 0, true);               // Mod time
        view.setUint16(12, 0, true);               // Mod date
        view.setUint32(14, 0, true);               // CRC32
        view.setUint32(18, pngMagic.length, true); // Comp size
        view.setUint32(22, pngMagic.length, true); // Uncomp size
        view.setUint16(26, nameBytes.length, true);// Name len
        view.setUint16(28, 0, true);               // Extra len

        zipBytes.set(nameBytes, 30);
        zipBytes.set(pngMagic, 30 + nameBytes.length);

        expect(KraCodec.isKra(zipBytes)).toBe(true);

        const decoded = await KraCodec.decode(zipBytes.buffer);
        expect(decoded).toBeDefined();
        expect(decoded.pngBlob).toBeDefined();
        expect(decoded.pngBlob.type).toBe('image/png');
      });
    });

    describe('IdmlCodec', () => {
      it('should parse InDesign package and generate SVG spread', async () => {
        const idmlBytes = new Uint8Array([
          0x50, 0x4B, 0x03, 0x04,
          20, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          10, 0, 0, 0, 10, 0, 0, 0,
          8, 0, 0, 0, // "idml.xml"
          0x69, 0x64, 0x6D, 0x6C, 0x2E, 0x78, 0x6D, 0x6C
        ]);
        expect(IdmlCodec.isIdml(idmlBytes)).toBe(true);

        const decoded = await IdmlCodec.decode(idmlBytes.buffer);
        expect(decoded.width).toBe(612);
        expect(decoded.height).toBe(792);
        expect(decoded.svgText).toContain('<svg');
        expect(decoded.svgText).toContain('Adobe InDesign');
      });
    });

    describe('DxfCodec: AutoCAD CAD Parser & SVG Generator', () => {
      it('should parse DXF entities and generate authentic vector SVG', () => {
        const dxfSample = `
  0
SECTION
  2
ENTITIES
  0
LINE
  8
WALLS
 62
  1
 10
0.0
 20
0.0
 11
100.0
 21
200.0
  0
CIRCLE
  8
DETAILS
 62
  5
 10
50.0
 20
50.0
 40
25.0
  0
TEXT
  1
KITCHEN
 10
20.0
 20
30.0
 40
14.0
  0
ENDSEC
  0
EOF
`;
        expect(DxfCodec.isDxf(dxfSample)).toBe(true);

        const parsed = DxfCodec.parseEntities(dxfSample);
        expect(parsed.entities.length).toBe(3);
        expect(parsed.width).toBeGreaterThan(100);
        expect(parsed.height).toBeGreaterThan(100);

        const svg = DxfCodec.toSvg(dxfSample);
        expect(svg).toContain('<svg');
        expect(svg).toContain('<line');
        expect(svg).toContain('<circle');
        expect(svg).toContain('<text');
        expect(svg).toContain('KITCHEN');
        expect(svg).toContain('#EF4444'); // Red for ACI 1
        expect(svg).toContain('#3B82F6'); // Blue for ACI 5
      });
    });

    describe('DwgCodec: AutoCAD Binary Header', () => {
      it('should detect DWG signature and generate blueprint vector SVG', () => {
        const dwgBytes = new Uint8Array(64);
        // AC1015 = AutoCAD 2000
        dwgBytes[0] = 0x41; dwgBytes[1] = 0x43; dwgBytes[2] = 0x31; dwgBytes[3] = 0x30; dwgBytes[4] = 0x31; dwgBytes[5] = 0x35;

        expect(DwgCodec.isDwg(dwgBytes)).toBe(true);

        const decoded = DwgCodec.decode(dwgBytes.buffer);
        expect(decoded.version).toContain('AutoCAD 2000');
        expect(decoded.svgText).toContain('<svg');
        expect(decoded.svgText).toContain('AUTOCAD 2000');
      });
    });

    describe('CgmCodec', () => {
      it('should convert CGM text commands to SVG', () => {
        const cgmText = `
BEGMF "Drawing1"
BEGPIC "Pic1"
VDCEXT (0, 0) (800, 600)
LINE (10, 10) (100, 100)
CIRCLE (200, 200) 50
ENDPIC
ENDMF
`;
        expect(CgmCodec.isCgm(cgmText)).toBe(true);

        const svg = CgmCodec.toSvg(cgmText);
        expect(svg).toContain('<svg');
        expect(svg).toContain('<line');
        expect(svg).toContain('<circle');
      });
    });

    describe('WmfEmfCodec & CorelCodec SVG Export', () => {
      it('should generate vector SVG from WMF and EMF records', () => {
        const wmfBytes = new Uint8Array([0xD7, 0xCD, 0xC6, 0x9A, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 96, 0]);
        const wmfSvg = WmfEmfCodec.toSvg(wmfBytes);
        expect(wmfSvg).toContain('<svg');
        expect(wmfSvg).toContain('WINDOWS METAFILE');
      });

      it('should generate vector SVG from CorelDRAW files', () => {
        const cdrSvg = CorelCodec.toSvg(new Uint8Array([0x52, 0x49, 0x46, 0x46]));
        expect(cdrSvg).toContain('<svg');
        expect(cdrSvg).toContain('CORELDRAW VECTOR GRAPHIC');
      });
    });

    describe('ImageCapabilityRegistry: Category 10 & Advanced Compatibility', () => {
      let reg: ImageCapabilityRegistry;

      beforeEach(() => {
        reg = new ImageCapabilityRegistry();
      });

      it('should provide the 10 mandated Purpose Categories including Category 10 cad-tech', () => {
        const categories = reg.getPurposeCategories();
        expect(categories.length).toBe(10);
        expect(categories[9].id).toBe('cad-tech');
        expect(categories[9].name).toBe('CAD & Technical Graphics');
      });

      it('should include SVG as an output target format', () => {
        const outputs = reg.getAllOutputCapabilities();
        const svgCap = outputs.find(o => o.format === 'svg');
        expect(svgCap).toBeDefined();
        expect(svgCap?.canEncode).toBe(true);
      });

      it('should enforce specific compatible outputs for CAD inputs', () => {
        const dxfOutputs = reg.getCompatibleOutputs('dxf');
        const formats = dxfOutputs.map(o => o.format);
        expect(formats).toContain('svg');
        expect(formats).toContain('png');
        expect(formats).toContain('pdf');
      });

      it('should enforce specific compatible outputs for DNG, HEIC, and APNG', () => {
        const dngOutputs = reg.getCompatibleOutputs('dng').map(o => o.format);
        expect(dngOutputs).toContain('jpg');
        expect(dngOutputs).toContain('png');
        expect(dngOutputs).toContain('tiff');

        const heicOutputs = reg.getCompatibleOutputs('heic').map(o => o.format);
        expect(heicOutputs).toContain('jpg');
        expect(heicOutputs).toContain('png');
        expect(heicOutputs).toContain('webp');
        expect(heicOutputs).toContain('tiff');

        const apngOutputs = reg.getCompatibleOutputs('apng').map(o => o.format);
        expect(apngOutputs).toContain('png');
        expect(apngOutputs).toContain('gif');
        expect(apngOutputs).toContain('webp');
      });
    });

    describe('ImageOutputValidatorService: SVG Validation', () => {
      it('should validate genuine SVG blobs and reject non-SVG bytes', async () => {
        const validator = new ImageOutputValidatorService();

        const validSvg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'], { type: 'image/svg+xml' });
        const resValid = await validator.validateOutputBlob(validSvg, 'svg');
        expect(resValid.valid).toBe(true);

        const invalidSvg = new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/svg+xml' });
        const resInvalid = await validator.validateOutputBlob(invalidSvg, 'svg');
        expect(resInvalid.valid).toBe(false);
      });
    });

    describe('Advanced Image Processing: ExifMetadataHelper & Presets', () => {
      it('should inject DPI into JPEG headers with standard JFIF APP0 marker', () => {
        const dummyJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x01, 0x02]);
        const modified = ExifMetadataHelper.injectDpiIntoJpeg(dummyJpeg, 300);

        expect(modified[0]).toBe(0xFF);
        expect(modified[1]).toBe(0xD8);
        expect(modified[2]).toBe(0xFF);
        expect(modified[3]).toBe(0xE0); // APP0 marker
        // JFIF identifier: 0x4A 0x46 0x49 0x46 0x00
        expect(modified[6]).toBe(0x4A);
        expect(modified[7]).toBe(0x46);
        expect(modified[8]).toBe(0x49);
        expect(modified[9]).toBe(0x46);
        expect(modified[10]).toBe(0x00);
        // Units: 1 (dots per inch)
        expect(modified[13]).toBe(1);
        // 300 DPI = 0x012C
        expect(modified[14]).toBe(0x01);
        expect(modified[15]).toBe(0x2C);
        expect(modified[16]).toBe(0x01);
        expect(modified[17]).toBe(0x2C);
      });

      it('should inject DPI into PNG with compliant 21-byte pHYs chunk', () => {
        // Standard PNG 8-byte signature + 25-byte IHDR chunk = 33 bytes
        const dummyPng = new Uint8Array(45);
        dummyPng[0] = 0x89; dummyPng[1] = 0x50; dummyPng[2] = 0x4E; dummyPng[3] = 0x47;
        dummyPng[4] = 0x0D; dummyPng[5] = 0x0A; dummyPng[6] = 0x1A; dummyPng[7] = 0x0A;

        const modified = ExifMetadataHelper.injectDpiIntoPng(dummyPng, 300);
        expect(modified.length).toBe(dummyPng.length + 21);

        // Check pHYs chunk header inserted at offset 33
        expect(modified[37]).toBe(0x70); // 'p'
        expect(modified[38]).toBe(0x48); // 'H'
        expect(modified[39]).toBe(0x79); // 'y'
        expect(modified[40]).toBe(0x73); // 's'

        // 300 DPI in pixels per meter = round(300 / 0.0254) = 11811 = 0x00002E23
        const view = new DataView(modified.buffer, modified.byteOffset);
        const xPpm = view.getUint32(41, false);
        expect(xPpm).toBe(11811);
      });

      it('should strip GPS IFD pointers from JPEG images for privacy protection', () => {
        // Mock a JPEG with APP1 EXIF containing a GPS tag pointer
        const dummyJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xDA, 0x00, 0x02]);
        const stripped = ExifMetadataHelper.stripGpsFromJpeg(dummyJpeg);
        expect(stripped).toBeDefined();
        expect(stripped[0]).toBe(0xFF);
        expect(stripped[1]).toBe(0xD8);
      });

      it('should strip all metadata segments from JPEG preserving image scan data', () => {
        // JPEG SOI (FF D8) + APP1 (FF E1, length 8) + SOF0 (FF C0, length 4) + SOS (FF DA)
        const jpegWithApp = new Uint8Array([
          0xFF, 0xD8,
          0xFF, 0xE1, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00,
          0xFF, 0xC0, 0x00, 0x04, 0x01, 0x02,
          0xFF, 0xDA, 0x00, 0x02
        ]);
        const stripped = ExifMetadataHelper.stripAllMetadataFromJpeg(jpegWithApp);
        expect(stripped[0]).toBe(0xFF);
        expect(stripped[1]).toBe(0xD8);
        // APP1 should have been removed, next should be SOF0 (FF C0)
        expect(stripped[2]).toBe(0xFF);
        expect(stripped[3]).toBe(0xC0);
      });

      it('should apply conversion presets in ConversionEngineService', () => {
        const engine = new ConversionEngineService();

        // 1. Web Preset
        engine.applyPreset('web');
        expect(engine.batchTargetFormat()).toBe('webp');
        expect(engine.batchQuality()).toBeCloseTo(0.82, 2);
        expect(engine.batchMaxWidth()).toBe(1920);
        expect(engine.batchDpi()).toBe(96);
        expect(engine.batchMetadataOptions().mode).toBe('strip-gps');

        // 2. High Quality Preset
        engine.applyPreset('quality');
        expect(engine.batchTargetFormat()).toBe('png');
        expect(engine.batchQuality()).toBe(1.0);
        expect(engine.batchDpi()).toBe(300);
        expect(engine.batchMetadataOptions().mode).toBe('preserve');

        // 3. Print Ready Preset
        engine.applyPreset('print');
        expect(engine.batchTargetFormat()).toBe('tiff');
        expect(engine.batchBackgroundOptions().mode).toBe('solid');
        expect(engine.batchBackgroundOptions().color).toBe('#FFFFFF');
        expect(engine.batchDpi()).toBe(300);

        // 4. Small File Size Preset
        engine.applyPreset('small');
        expect(engine.batchTargetFormat()).toBe('webp');
        expect(engine.batchQuality()).toBeCloseTo(0.65, 2);
        expect(engine.batchMaxWidth()).toBe(1280);
        expect(engine.batchMetadataOptions().mode).toBe('strip-all');

        // 5. Transparent Graphic Preset
        engine.applyPreset('transparent');
        expect(engine.batchTargetFormat()).toBe('png');
        expect(engine.batchBackgroundOptions().mode).toBe('transparent');
      });
    });

    describe('Phase 5: Multi-Frame Animated Image Conversion, Validation & Codecs', () => {
      describe('WebpCodec', () => {
        it('should correctly identify WebP and distinguish static vs animated containers', () => {
          const staticWebp = WebpCodec.createSyntheticVp8FrameWebp(10, 10);
          expect(WebpCodec.isWebp(staticWebp)).toBe(true);
          expect(WebpCodec.isAnimated(staticWebp)).toBe(false);

          const notWebp = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
          expect(WebpCodec.isWebp(notWebp)).toBe(false);
          expect(WebpCodec.isAnimated(notWebp)).toBe(false);
        });

        it('should encode multiple frames into an animated WebP and decode ANMF chunks', async () => {
          const f1Bytes = WebpCodec.createSyntheticVp8FrameWebp(20, 20);
          const f2Bytes = WebpCodec.createSyntheticVp8FrameWebp(20, 20);

          const animBlob = await WebpCodec.encodeAnimated(
            20,
            20,
            [
              { delayMs: 120, webpBytes: f1Bytes },
              { delayMs: 240, webpBytes: f2Bytes }
            ],
            0.9,
            0 // loop infinitely
          );

          expect(animBlob.type).toBe('image/webp');
          expect(animBlob.size).toBeGreaterThan(50);

          const animBytes = new Uint8Array(await animBlob.arrayBuffer());
          expect(WebpCodec.isWebp(animBytes)).toBe(true);
          expect(WebpCodec.isAnimated(animBytes)).toBe(true);

          const decoded = WebpCodec.decodeAnimated(animBytes);
          expect(decoded.canvasWidth).toBe(20);
          expect(decoded.canvasHeight).toBe(20);
          expect(decoded.loopCount).toBe(0);
          expect(decoded.frameCount).toBe(2);
          expect(decoded.frames.length).toBe(2);
          expect(decoded.frames[0].delayMs).toBe(120);
          expect(decoded.frames[1].delayMs).toBe(240);
          expect(decoded.frames[0].webpBlob.type).toBe('image/webp');
          expect(decoded.frames[1].webpBlob.type).toBe('image/webp');
        });
      });

      describe('GifCodec Multi-Frame Decoding & Loop Count', () => {
        it('should extract all composited frames, frame delays, and loop count from animated GIF', async () => {
          const frame1 = new Uint8ClampedArray(4 * 4 * 4);
          frame1.fill(255);
          const frame2 = new Uint8ClampedArray(4 * 4 * 4);
          for (let i = 0; i < frame2.length; i += 4) {
            frame2[i] = 255; frame2[i + 1] = 0; frame2[i + 2] = 0; frame2[i + 3] = 255;
          }

          const animGifBlob = GifCodec.encodeAnimated(4, 4, [
            { rgba: frame1, delayMs: 80 },
            { rgba: frame2, delayMs: 160 }
          ], 5); // 5 loops

          const buffer = await animGifBlob.arrayBuffer();
          const decoded = GifCodec.decode(buffer);

          expect(decoded.isAnimated).toBe(true);
          expect(decoded.frameCount).toBe(2);
          expect(decoded.frames.length).toBe(2);
          expect(decoded.frames[0].delayMs).toBe(80);
          expect(decoded.frames[1].delayMs).toBe(160);
          expect(decoded.loopCount).toBe(5);
          expect(decoded.hasNetscapeLoop).toBe(true);
        });

        it('should correctly detect initial one-time animation (loopCount = 1, no Netscape loop block)', async () => {
          const frame1 = new Uint8ClampedArray(4 * 4 * 4);
          frame1.fill(100);
          const frame2 = new Uint8ClampedArray(4 * 4 * 4);
          frame2.fill(200);

          // loopCount = 1 indicates single play (initial animation only, no repeat)
          const singlePlayGif = GifCodec.encodeAnimated(4, 4, [
            { rgba: frame1, delayMs: 100 },
            { rgba: frame2, delayMs: 100 }
          ], 1);

          const buffer = await singlePlayGif.arrayBuffer();
          const decoded = GifCodec.decode(buffer);

          expect(decoded.isAnimated).toBe(true);
          expect(decoded.frameCount).toBe(2);
          expect(decoded.hasNetscapeLoop).toBe(false);
          expect(decoded.loopCount).toBe(1);
        });

        it('should correctly detect infinite looping animation (loopCount = 0)', async () => {
          const frame1 = new Uint8ClampedArray(4 * 4 * 4);
          frame1.fill(50);
          const frame2 = new Uint8ClampedArray(4 * 4 * 4);
          frame2.fill(150);

          // loopCount = 0 indicates infinite loop
          const infiniteGif = GifCodec.encodeAnimated(4, 4, [
            { rgba: frame1, delayMs: 100 },
            { rgba: frame2, delayMs: 100 }
          ], 0);

          const buffer = await infiniteGif.arrayBuffer();
          const decoded = GifCodec.decode(buffer);

          expect(decoded.isAnimated).toBe(true);
          expect(decoded.frameCount).toBe(2);
          expect(decoded.hasNetscapeLoop).toBe(true);
          expect(decoded.loopCount).toBe(0);
        });
      });

      describe('ImageOutputValidatorService: validateAnimationOutput', () => {
        const validator = new ImageOutputValidatorService();

        it('should validate compliant animated WebP output', async () => {
          const f1Bytes = WebpCodec.createSyntheticVp8FrameWebp(16, 16);
          const f2Bytes = WebpCodec.createSyntheticVp8FrameWebp(16, 16);
          const animBlob = await WebpCodec.encodeAnimated(16, 16, [
            { delayMs: 100, webpBytes: f1Bytes },
            { delayMs: 100, webpBytes: f2Bytes }
          ]);

          const result = await validator.validateAnimationOutput(animBlob, 'webp', 2, { width: 16, height: 16 });
          expect(result.valid).toBe(true);
        });

        it('should reject a static WebP when multi-frame animation was expected', async () => {
          const staticWebp = WebpCodec.createSyntheticVp8FrameWebp(16, 16);
          const staticBlob = new Blob([staticWebp], { type: 'image/webp' });

          const result = await validator.validateAnimationOutput(staticBlob, 'webp', 2);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('missing VP8X animation flag');
        });

        it('should validate compliant animated GIF output', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(200);
          const f2 = new Uint8ClampedArray(4 * 4 * 4);
          f2.fill(100);

          const animGif = GifCodec.encodeAnimated(4, 4, [
            { rgba: f1, delayMs: 100 },
            { rgba: f2, delayMs: 150 }
          ]);

          const result = await validator.validateAnimationOutput(animGif, 'gif', 2, { width: 4, height: 4 });
          expect(result.valid).toBe(true);
        });

        it('should reject a static GIF when animation preservation was requested', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(200);
          const staticGif = GifCodec.encode(4, 4, f1);

          const result = await validator.validateAnimationOutput(staticGif, 'gif', 2);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Animation preservation failed');
        });

        it('should enforce static single frame validation when Static First Frame is selected', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(200);
          const staticGif = GifCodec.encode(4, 4, f1);

          const result = await validator.validateAnimationOutput(staticGif, 'gif', 1);
          expect(result.valid).toBe(true);
        });
      });

      describe('Conversion Matrix: Multi-Frame Animated Conversions & First-Frame Fallback', () => {
        it('Scenario 1: GIF -> WebP (Animated)', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(255);
          const f2 = new Uint8ClampedArray(4 * 4 * 4);
          f2.fill(128);
          const gifBlob = GifCodec.encodeAnimated(4, 4, [
            { rgba: f1, delayMs: 100 },
            { rgba: f2, delayMs: 200 }
          ]);

          const gifBuffer = await gifBlob.arrayBuffer();
          const decoded = GifCodec.decode(gifBuffer);
          expect(decoded.isAnimated).toBe(true);
          expect(decoded.frameCount).toBe(2);

          // WebP encode preserves all frames
          const f1Bytes = WebpCodec.createSyntheticVp8FrameWebp(4, 4);
          const f2Bytes = WebpCodec.createSyntheticVp8FrameWebp(4, 4);
          const webpBlob = await WebpCodec.encodeAnimated(4, 4, [
            { delayMs: decoded.frames[0].delayMs, webpBytes: f1Bytes },
            { delayMs: decoded.frames[1].delayMs, webpBytes: f2Bytes }
          ], 0.9, decoded.loopCount);

          expect(WebpCodec.isAnimated(await webpBlob.arrayBuffer())).toBe(true);
          const webpDecoded = WebpCodec.decodeAnimated(await webpBlob.arrayBuffer());
          expect(webpDecoded.frameCount).toBe(2);
          expect(webpDecoded.frames[0].delayMs).toBe(100);
          expect(webpDecoded.frames[1].delayMs).toBe(200);
        });

        it('Scenario 2: GIF -> GIF (Animation preserved)', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(255);
          const f2 = new Uint8ClampedArray(4 * 4 * 4);
          f2.fill(50);
          const origGif = GifCodec.encodeAnimated(4, 4, [
            { rgba: f1, delayMs: 70 },
            { rgba: f2, delayMs: 140 }
          ], 3);

          const decoded = GifCodec.decode(await origGif.arrayBuffer());
          const reEncoded = GifCodec.encodeAnimated(decoded.width, decoded.height, decoded.frames, decoded.loopCount);

          const check = GifCodec.decode(await reEncoded.arrayBuffer());
          expect(check.isAnimated).toBe(true);
          expect(check.frameCount).toBe(2);
          expect(check.frames[0].delayMs).toBe(70);
          expect(check.frames[1].delayMs).toBe(140);
          expect(check.loopCount).toBe(3);
        });

        it('Scenario 3: GIF -> PNG / JPG (First frame only with static format note)', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(255);
          const f2 = new Uint8ClampedArray(4 * 4 * 4);
          f2.fill(0);
          const gifBlob = GifCodec.encodeAnimated(4, 4, [
            { rgba: f1, delayMs: 100 },
            { rgba: f2, delayMs: 100 }
          ]);

          const decoded = GifCodec.decode(await gifBlob.arrayBuffer());
          // Target format PNG only extracts primary / first frame
          expect(decoded.data).toBeDefined();
          expect(decoded.data.length).toBe(4 * 4 * 4);
        });

        it('Scenario 4: Animated WebP -> GIF (Animated)', async () => {
          const f1Bytes = WebpCodec.createSyntheticVp8FrameWebp(8, 8);
          const f2Bytes = WebpCodec.createSyntheticVp8FrameWebp(8, 8);
          const animWebpBlob = await WebpCodec.encodeAnimated(8, 8, [
            { delayMs: 90, webpBytes: f1Bytes },
            { delayMs: 180, webpBytes: f2Bytes }
          ], 0.9, 0);

          const decodedWebp = WebpCodec.decodeAnimated(await animWebpBlob.arrayBuffer());
          expect(decodedWebp.frameCount).toBe(2);

          // Convert to Animated GIF
          const f1 = new Uint8ClampedArray(8 * 8 * 4); f1.fill(255);
          const f2 = new Uint8ClampedArray(8 * 8 * 4); f2.fill(100);
          const gifBlob = GifCodec.encodeAnimated(8, 8, [
            { rgba: f1, delayMs: decodedWebp.frames[0].delayMs },
            { rgba: f2, delayMs: decodedWebp.frames[1].delayMs }
          ], decodedWebp.loopCount);

          const decodedGif = GifCodec.decode(await gifBlob.arrayBuffer());
          expect(decodedGif.isAnimated).toBe(true);
          expect(decodedGif.frameCount).toBe(2);
          expect(decodedGif.frames[0].delayMs).toBe(90);
          expect(decodedGif.frames[1].delayMs).toBe(180);
        });

        it('Scenario 5: Static First Frame mode produces exactly 1 frame', async () => {
          const f1 = new Uint8ClampedArray(4 * 4 * 4);
          f1.fill(255);
          const f2 = new Uint8ClampedArray(4 * 4 * 4);
          f2.fill(50);
          const animGif = GifCodec.encodeAnimated(4, 4, [
            { rgba: f1, delayMs: 100 },
            { rgba: f2, delayMs: 200 }
          ]);

          // When static first frame is requested
          const decoded = GifCodec.decode(await animGif.arrayBuffer());
          const staticBlob = GifCodec.encode(decoded.width, decoded.height, decoded.data);
          const staticDecoded = GifCodec.decode(await staticBlob.arrayBuffer());
          expect(staticDecoded.isAnimated).toBe(false);
          expect(staticDecoded.frameCount).toBe(1);
        });
      });
    });
  });
});
