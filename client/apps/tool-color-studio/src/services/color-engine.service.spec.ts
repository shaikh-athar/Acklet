// apps/tool-color-studio/src/services/color-engine.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ColorEngineService } from './color-engine.service';

describe('ColorEngineService', () => {
  let service: ColorEngineService;

  beforeEach(() => {
    service = new ColorEngineService();
  });

  describe('1. Reference Color Conversions', () => {
    it('should convert Pure Red (#FF0000) accurately across all spaces', () => {
      const hex = '#FF0000';
      const rgb = service.hexToRgb(hex);
      expect(rgb).toEqual({ r: 255, g: 0, b: 0, a: 1 });

      const hsl = service.rgbToHsl(rgb);
      expect(hsl).toEqual({ h: 0, s: 100, l: 50, a: 1 });

      const hsv = service.rgbToHsv(rgb);
      expect(hsv).toEqual({ h: 0, s: 100, v: 100, a: 1 });

      const cmyk = service.rgbToCmyk(rgb);
      expect(cmyk).toEqual({ c: 0, m: 100, y: 100, k: 0 });

      expect(service.rgbToHex(rgb)).toBe('#FF0000');
      expect(service.hslToHex(hsl)).toBe('#FF0000');
      expect(service.hsvToHex(hsv)).toBe('#FF0000');
      expect(service.cmykToHex(cmyk)).toBe('#FF0000');
    });

    it('should convert Pure Green (#00FF00) accurately across all spaces', () => {
      const hex = '#00FF00';
      const rgb = service.hexToRgb(hex);
      expect(rgb).toEqual({ r: 0, g: 255, b: 0, a: 1 });

      const hsl = service.rgbToHsl(rgb);
      expect(hsl).toEqual({ h: 120, s: 100, l: 50, a: 1 });

      const hsv = service.rgbToHsv(rgb);
      expect(hsv).toEqual({ h: 120, s: 100, v: 100, a: 1 });

      const cmyk = service.rgbToCmyk(rgb);
      expect(cmyk).toEqual({ c: 100, m: 0, y: 100, k: 0 });

      expect(service.hslToHex(hsl)).toBe('#00FF00');
      expect(service.hsvToHex(hsv)).toBe('#00FF00');
      expect(service.cmykToHex(cmyk)).toBe('#00FF00');
    });

    it('should convert Pure Blue (#0000FF) accurately across all spaces', () => {
      const hex = '#0000FF';
      const rgb = service.hexToRgb(hex);
      expect(rgb).toEqual({ r: 0, g: 0, b: 255, a: 1 });

      const hsl = service.rgbToHsl(rgb);
      expect(hsl).toEqual({ h: 240, s: 100, l: 50, a: 1 });

      const hsv = service.rgbToHsv(rgb);
      expect(hsv).toEqual({ h: 240, s: 100, v: 100, a: 1 });

      const cmyk = service.rgbToCmyk(rgb);
      expect(cmyk).toEqual({ c: 100, m: 100, y: 0, k: 0 });

      expect(service.hslToHex(hsl)).toBe('#0000FF');
      expect(service.hsvToHex(hsv)).toBe('#0000FF');
      expect(service.cmykToHex(cmyk)).toBe('#0000FF');
    });

    it('should convert White (#FFFFFF) accurately across all spaces', () => {
      const rgb = service.hexToRgb('#FFFFFF');
      expect(rgb).toEqual({ r: 255, g: 255, b: 255, a: 1 });

      const hsl = service.rgbToHsl(rgb);
      expect(hsl.l).toBe(100);

      const hsv = service.rgbToHsv(rgb);
      expect(hsv.v).toBe(100);
      expect(hsv.s).toBe(0);

      const cmyk = service.rgbToCmyk(rgb);
      expect(cmyk).toEqual({ c: 0, m: 0, y: 0, k: 0 });
    });

    it('should convert Black (#000000) accurately across all spaces', () => {
      const rgb = service.hexToRgb('#000000');
      expect(rgb).toEqual({ r: 0, g: 0, b: 0, a: 1 });

      const hsl = service.rgbToHsl(rgb);
      expect(hsl.l).toBe(0);

      const hsv = service.rgbToHsv(rgb);
      expect(hsv.v).toBe(0);

      const cmyk = service.rgbToCmyk(rgb);
      expect(cmyk.k).toBe(100);
    });

    it('should convert Cyan, Magenta, and Yellow references', () => {
      // Cyan
      const cyanCmyk = service.rgbToCmyk({ r: 0, g: 255, b: 255 });
      expect(cyanCmyk).toEqual({ c: 100, m: 0, y: 0, k: 0 });

      // Magenta
      const magentaCmyk = service.rgbToCmyk({ r: 255, g: 0, b: 255 });
      expect(magentaCmyk).toEqual({ c: 0, m: 100, y: 0, k: 0 });

      // Yellow
      const yellowCmyk = service.rgbToCmyk({ r: 255, g: 255, b: 0 });
      expect(yellowCmyk).toEqual({ c: 0, m: 0, y: 100, k: 0 });
    });

    it('should convert directly between HSL and HSV', () => {
      const originalHsl = { h: 210, s: 80, l: 60 };
      const hsv = service.hslToHsv(originalHsl);
      const convertedBackHsl = service.hsvToHsl(hsv);

      expect(convertedBackHsl.h).toBe(originalHsl.h);
      expect(Math.abs(convertedBackHsl.s - originalHsl.s)).toBeLessThanOrEqual(1);
      expect(Math.abs(convertedBackHsl.l - originalHsl.l)).toBeLessThanOrEqual(1);
    });
  });

  describe('2. Hex Format Parsing & Alpha Handling', () => {
    it('should support shorthand 3-digit HEX (#FFF, #F00)', () => {
      expect(service.hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
      expect(service.hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(service.hexToRgb('0F0')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    });

    it('should support shorthand 4-digit HEX with alpha (#RGBA)', () => {
      const rgb = service.hexToRgb('#F008'); // Red with ~53% alpha (0x88 / 255 = 0.533)
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
      expect(rgb.a).toBeCloseTo(0.533, 2);
    });

    it('should support 8-digit HEX with alpha (#RRGGBBAA)', () => {
      const rgb = service.hexToRgb('#0000FF80'); // Blue with 50% alpha (128 / 255 = 0.502)
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(255);
      expect(rgb.a).toBeCloseTo(0.502, 2);
    });

    it('should output 8-digit HEX when includeAlpha is true or alpha < 1', () => {
      const hex = service.rgbToHex({ r: 255, g: 0, b: 0, a: 0.5 });
      expect(hex).toBe('#FF000080');

      const fullHex = service.rgbToHex({ r: 255, g: 255, b: 255, a: 1 }, true);
      expect(fullHex).toBe('#FFFFFFFF');
    });

    it('should normalize shorthand and standard HEX codes', () => {
      expect(service.normalizeHex('#abc')).toBe('#AABBCC');
      expect(service.normalizeHex('abc')).toBe('#AABBCC');
      expect(service.normalizeHex('#abcd')).toBe('#AABBCCDD');
      expect(service.normalizeHex('#123456')).toBe('#123456');
    });
  });

  describe('3. Boundary Values & Clamping', () => {
    it('should clamp out-of-range RGB values (< 0 and > 255)', () => {
      const rgb = service.fromRgb({ r: 300, g: -50, b: 128 });
      expect(rgb.rgb.r).toBe(255);
      expect(rgb.rgb.g).toBe(0);
      expect(rgb.rgb.b).toBe(128);
    });

    it('should clamp out-of-range Alpha values (< 0 and > 1)', () => {
      const rgbNegative = service.fromRgb({ r: 100, g: 100, b: 100, a: -0.5 });
      expect(rgbNegative.rgb.a).toBe(0);

      const rgbOver = service.fromRgb({ r: 100, g: 100, b: 100, a: 2.5 });
      expect(rgbNegative.rgb.a).toBe(0);
      expect(rgbOver.rgb.a).toBe(1);
    });
  });

  describe('4. Invalid Color Inputs & Fallback Handling', () => {
    it('should handle null, undefined, and empty string without throwing', () => {
      expect(service.hexToRgb('')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(service.hexToRgb(null as any)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(service.hexToRgb(undefined as any)).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    });

    it('should handle invalid hex characters and fall back safely in parseColor', () => {
      expect(service.hexToRgb('#ZZZZZZ')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
      expect(service.hexToRgb('hello-world')).toEqual({ r: 0, g: 0, b: 0, a: 1 });

      const parsedFallback = service.parseColor('invalid-color', '#E11D48');
      expect(parsedFallback.hex).toBe('#E11D48');
    });

    it('should validate hex strings accurately with isValidHex()', () => {
      expect(service.isValidHex('#FFF')).toBe(true);
      expect(service.isValidHex('FFF')).toBe(true);
      expect(service.isValidHex('#FFFFFF')).toBe(true);
      expect(service.isValidHex('#FFFFFFFF')).toBe(true);
      expect(service.isValidHex('#F008')).toBe(true);

      expect(service.isValidHex('')).toBe(false);
      expect(service.isValidHex('#FF')).toBe(false);
      expect(service.isValidHex('#FFFFF')).toBe(false);
      expect(service.isValidHex('#GGGGGG')).toBe(false);
      expect(service.isValidHex(null as any)).toBe(false);
    });

    it('should validate colors in any supported string format with isValidColor()', () => {
      expect(service.isValidColor('#FF0000')).toBe(true);
      expect(service.isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(service.isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      expect(service.isValidColor('hsl(120, 100%, 50%)')).toBe(true);
      expect(service.isValidColor('hsla(120, 100%, 50%, 0.8)')).toBe(true);

      expect(service.isValidColor('not-a-color')).toBe(false);
      expect(service.isValidColor('')).toBe(false);
    });
  });

  describe('5. Shared Color Utilities', () => {
    it('should lighten and darken colors correctly', () => {
      const base = '#808080'; // Middle gray (L=50%)
      const lightened = service.lighten(base, 20); // L should be ~70%
      const darkened = service.darken(base, 20); // L should be ~30%

      const lightHsl = service.hexToHsl(lightened);
      const darkHsl = service.hexToHsl(darkened);

      expect(lightHsl.l).toBe(70);
      expect(darkHsl.l).toBe(30);
    });

    it('should calculate the exact complementary color (180 deg hue shift)', () => {
      // Pure Red (H=0) -> Pure Cyan (H=180)
      const compRed = service.getComplementary('#FF0000');
      expect(compRed).toBe('#00FFFF');

      // Pure Green (H=120) -> Pure Magenta (H=300)
      const compGreen = service.getComplementary('#00FF00');
      expect(compGreen).toBe('#FF00FF');
    });

    it('should calculate Euclidean RGB distance accurately', () => {
      const black = '#000000';
      const white = '#FFFFFF';
      const dist = service.calculateRgbDistance(black, white);
      // sqrt(255^2 + 255^2 + 255^2) = 255 * sqrt(3) ~ 441.67
      expect(dist).toBeCloseTo(441.67, 1);

      const sameDist = service.calculateRgbDistance('#FF0000', '#FF0000');
      expect(sameDist).toBe(0);
    });

    it('should generate color variations around a base color', () => {
      const variations = service.generateColorVariations('#3B82F6', 5);
      expect(variations).toHaveLength(5);
      variations.forEach(hex => {
        expect(service.isValidHex(hex)).toBe(true);
      });
    });

    it('should calculate relative luminance per WCAG 2.1 specifications', () => {
      const whiteLum = service.calculateLuminance('#FFFFFF');
      const blackLum = service.calculateLuminance('#000000');
      expect(whiteLum).toBeCloseTo(1.0, 3);
      expect(blackLum).toBeCloseTo(0.0, 3);

      // Contrast ratio black on white = 21:1
      const comp = service.getContrastCompliance('#000000', '#FFFFFF');
      expect(comp.ratio).toBe(21);
      expect(comp.grade).toBe('AAA');
    });
  });

  describe('6. Harmonies, Color Blindness & Image Quantization', () => {
    it('should generate all 6 color harmony schemes', () => {
      const all = service.getAllHarmonies('#3B82F6');
      expect(all.complementary).toHaveLength(5);
      expect(all.analogous).toHaveLength(5);
      expect(all.triadic).toHaveLength(5);
      expect(all.tetradic).toHaveLength(5);
      expect(all.monochromatic).toHaveLength(5);
      expect(all['split-complementary']).toHaveLength(5);
    });

    it('should simulate Brettel & Vienot CVD deficiency models', () => {
      const red = '#FF0000';
      const protanopia = service.simulateColorBlindness(red, 'protanopia');
      const deuteranopia = service.simulateColorBlindness(red, 'deuteranopia');
      const tritanopia = service.simulateColorBlindness(red, 'tritanopia');
      const achromatopsia = service.simulateColorBlindness(red, 'achromatopsia');

      expect(service.isValidHex(protanopia)).toBe(true);
      expect(service.isValidHex(deuteranopia)).toBe(true);
      expect(service.isValidHex(tritanopia)).toBe(true);
      expect(service.isValidHex(achromatopsia)).toBe(true);
    });

    it('should extract dominant colors from raw canvas ImageData', () => {
      const width = 10;
      const height = 10;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 225; data[i + 1] = 29; data[i + 2] = 72; data[i + 3] = 255; // #E11D48
      }
      const mockImageData = { data, width, height } as ImageData;
      const extracted = service.extractColorsFromImageData(mockImageData, 3);

      expect(extracted.length).toBeGreaterThanOrEqual(1);
      expect(extracted[0].hex).toBe('#E11D48');
      expect(extracted[0].percentage).toBeGreaterThan(0);
    });
  });
});
