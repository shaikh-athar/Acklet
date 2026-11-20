// client/apps/tool-file-converter/src/services/image-codecs/xbm-xpm.codec.ts

export interface DecodedAsciiImage {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA pixels
}

export class XbmXpmCodec {
  /**
   * Decodes an X11 Bitmap (.xbm) ASCII C-source file.
   */
  static decodeXbm(text: string): DecodedAsciiImage {
    const widthMatch = text.match(/#define\s+\w+_width\s+(\d+)/i);
    const heightMatch = text.match(/#define\s+\w+_height\s+(\d+)/i);

    if (!widthMatch || !heightMatch) {
      throw new Error('Invalid XBM file: missing width or height definition.');
    }

    const width = parseInt(widthMatch[1], 10);
    const height = parseInt(heightMatch[1], 10);
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid XBM dimensions: ${width}x${height}`);
    }

    // Extract hex bytes from array: 0x.., 0x..
    const arrayStart = text.indexOf('{');
    const arrayEnd = text.lastIndexOf('}');
    if (arrayStart === -1 || arrayEnd === -1) {
      throw new Error('Invalid XBM file: missing pixel byte array.');
    }

    const hexMatches = text.substring(arrayStart + 1, arrayEnd).match(/0x[0-9a-fA-F]+/g) || [];
    const bytes = hexMatches.map(h => parseInt(h, 16));

    const rgba = new Uint8ClampedArray(width * height * 4);
    const bytesPerRow = Math.ceil(width / 8);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIndex = y * bytesPerRow + Math.floor(x / 8);
        const bitIndex = x % 8;
        const b = bytes[byteIndex] || 0;
        const isBlack = (b >> bitIndex) & 0x01;

        const outIdx = (y * width + x) * 4;
        if (isBlack) {
          // Foreground Black
          rgba[outIdx] = 0;
          rgba[outIdx + 1] = 0;
          rgba[outIdx + 2] = 0;
          rgba[outIdx + 3] = 255;
        } else {
          // Transparent / White
          rgba[outIdx] = 255;
          rgba[outIdx + 1] = 255;
          rgba[outIdx + 2] = 255;
          rgba[outIdx + 3] = 0;
        }
      }
    }

    return { width, height, data: rgba };
  }

  /**
   * Decodes an X11 Pixmap (.xpm) ASCII C-source file.
   */
  static decodeXpm(text: string): DecodedAsciiImage {
    // Extract quoted strings: "..."
    const stringMatches = text.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
    if (!stringMatches || stringMatches.length < 2) {
      throw new Error('Invalid XPM file: missing format descriptor strings.');
    }

    const lines = stringMatches.map(s => s.slice(1, -1)); // strip outer quotes
    const headerParts = lines[0].trim().split(/\s+/).map(n => parseInt(n, 10));

    if (headerParts.length < 4) {
      throw new Error('Invalid XPM header: expected "<width> <height> <num_colors> <chars_per_pixel>".');
    }

    const [width, height, numColors, charsPerPixel] = headerParts;
    if (width <= 0 || height <= 0) {
      throw new Error(`Invalid XPM dimensions: ${width}x${height}`);
    }

    // Parse Color Map
    const colorMap = new Map<string, [number, number, number, number]>();
    let lineIdx = 1;

    for (let i = 0; i < numColors && lineIdx < lines.length; i++, lineIdx++) {
      const line = lines[lineIdx];
      const charKey = line.slice(0, charsPerPixel);
      const rest = line.slice(charsPerPixel).trim();

      let rgba: [number, number, number, number] = [0, 0, 0, 255];
      const cMatch = rest.match(/c\s+(#[0-9a-fA-F]+|None|[a-zA-Z]+)/i);

      if (cMatch) {
        const colorVal = cMatch[1];
        if (colorVal.toLowerCase() === 'none') {
          rgba = [0, 0, 0, 0]; // Transparent
        } else if (colorVal.startsWith('#')) {
          const hex = colorVal.slice(1);
          if (hex.length === 6) {
            rgba = [
              parseInt(hex.slice(0, 2), 16),
              parseInt(hex.slice(2, 4), 16),
              parseInt(hex.slice(4, 6), 16),
              255
            ];
          } else if (hex.length === 12) {
            // 16-bit per channel X11 format
            rgba = [
              parseInt(hex.slice(0, 2), 16),
              parseInt(hex.slice(4, 6), 16),
              parseInt(hex.slice(8, 10), 16),
              255
            ];
          }
        }
      }
      colorMap.set(charKey, rgba);
    }

    // Parse Pixel Rows
    const rgba = new Uint8ClampedArray(width * height * 4);
    let row = 0;

    while (row < height && lineIdx < lines.length) {
      const line = lines[lineIdx++];
      for (let col = 0; col < width; col++) {
        const charKey = line.slice(col * charsPerPixel, (col + 1) * charsPerPixel);
        const color = colorMap.get(charKey) || [0, 0, 0, 255];

        const outIdx = (row * width + col) * 4;
        rgba[outIdx] = color[0];
        rgba[outIdx + 1] = color[1];
        rgba[outIdx + 2] = color[2];
        rgba[outIdx + 3] = color[3];
      }
      row++;
    }

    return { width, height, data: rgba };
  }
}

