// client/apps/tool-file-converter/src/services/image-capability.registry.ts
import { Injectable } from '@angular/core';
import { FormatDescriptor } from '../models/converter.models';

export type CapabilityCategory =
  | 'common'
  | 'modern'
  | 'animated'
  | 'professional'
  | 'adobe'
  | 'vector'
  | 'corel'
  | 'icon'
  | 'raw'
  | 'gaming'
  | 'scientific'
  | 'legacy'
  | 'document'
  | 'cad';

export interface FormatCapability {
  format: string; // Canonical format identifier (lowercase)
  label: string; // Display label
  extension: string; // Default file extension
  mimeType: string;
  category: CapabilityCategory;
  canDecode: boolean; // Input decoding supported
  canEncode: boolean; // Output encoding supported
  transparency: boolean;
  lossless?: boolean;
  aliases?: string[];
  description: string;
  tested: boolean;
}

export interface FormatGroup {
  id?: string;
  name: string;
  category: CapabilityCategory;
  description?: string;
  formats: FormatCapability[];
}

export interface ConversionLossWarning {
  type: 'transparency' | 'dynamic-range' | 'layers' | 'vector' | 'animation' | 'raw-sensor';
  title: string;
  message: string;
}

export const ALL_CAPABILITIES: FormatCapability[] = [
  // ─── 1. Common Formats ───
  {
    format: 'jpg',
    label: 'JPG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    category: 'common',
    canDecode: true,
    canEncode: true,
    transparency: false,
    aliases: ['jpeg', 'jfif'],
    description: 'Universal photographic format for web and sharing',
    tested: true
  },
  {
    format: 'jpeg',
    label: 'JPEG',
    extension: 'jpeg',
    mimeType: 'image/jpeg',
    category: 'common',
    canDecode: true,
    canEncode: true,
    transparency: false,
    aliases: ['jpg', 'jfif'],
    description: 'Joint Photographic Experts Group format',
    tested: true
  },
  {
    format: 'jfif',
    label: 'JFIF',
    extension: 'jfif',
    mimeType: 'image/jpeg',
    category: 'common',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['jpg', 'jpeg'],
    description: 'JPEG File Interchange Format',
    tested: true
  },
  {
    format: 'png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    category: 'common',
    canDecode: true,
    canEncode: true,
    transparency: true,
    lossless: true,
    description: 'Lossless raster graphic with full alpha transparency',
    tested: true
  },
  {
    format: 'gif',
    label: 'GIF',
    extension: 'gif',
    mimeType: 'image/gif',
    category: 'common',
    canDecode: true,
    canEncode: true,
    transparency: true,
    description: '256-color palette Graphics Interchange Format',
    tested: true
  },
  {
    format: 'bmp',
    label: 'BMP',
    extension: 'bmp',
    mimeType: 'image/bmp',
    category: 'common',
    canDecode: true,
    canEncode: true,
    transparency: false,
    lossless: true,
    description: 'Standard uncompressed Windows Bitmap',
    tested: true
  },

  // ─── 2. Modern Formats ───
  {
    format: 'webp',
    label: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    category: 'modern',
    canDecode: true,
    canEncode: true,
    transparency: true,
    description: 'Modern web image with superior lossy & lossless compression',
    tested: true
  },
  {
    format: 'avif',
    label: 'AVIF',
    extension: 'avif',
    mimeType: 'image/avif',
    category: 'modern',
    canDecode: true,
    canEncode: true,
    transparency: true,
    description: 'Next-generation AV1 image with ultra-high compression',
    tested: true
  },
  {
    format: 'heic',
    label: 'HEIC',
    extension: 'heic',
    mimeType: 'image/heic',
    category: 'modern',
    canDecode: true,
    canEncode: false,
    transparency: true,
    aliases: ['heif'],
    description: 'High Efficiency Image Container (Apple iOS format)',
    tested: true
  },
  {
    format: 'heif',
    label: 'HEIF',
    extension: 'heif',
    mimeType: 'image/heif',
    category: 'modern',
    canDecode: true,
    canEncode: false,
    transparency: true,
    aliases: ['heic'],
    description: 'High Efficiency Image File format',
    tested: true
  },
  {
    format: 'jxl',
    label: 'JXL',
    extension: 'jxl',
    mimeType: 'image/jxl',
    category: 'modern',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'JPEG XL next-generation archival format',
    tested: true
  },
  {
    format: 'qoi',
    label: 'QOI',
    extension: 'qoi',
    mimeType: 'image/x-qoi',
    category: 'modern',
    canDecode: true,
    canEncode: true,
    transparency: true,
    lossless: true,
    description: 'Quite OK Image format - fast lossless 24/32-bit raster',
    tested: true
  },

  // ─── 3. Animated Formats ───
  {
    format: 'apng',
    label: 'APNG',
    extension: 'apng',
    mimeType: 'image/apng',
    category: 'animated',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Animated Portable Network Graphics with 24-bit color & alpha',
    tested: true
  },

  // ─── 4. Professional Raster Formats ───
  {
    format: 'tiff',
    label: 'TIFF',
    extension: 'tiff',
    mimeType: 'image/tiff',
    category: 'professional',
    canDecode: true,
    canEncode: true,
    transparency: true,
    lossless: true,
    aliases: ['tif'],
    description: 'Archival lossless Baseline TIFF 6.0',
    tested: true
  },
  {
    format: 'tif',
    label: 'TIF',
    extension: 'tif',
    mimeType: 'image/tiff',
    category: 'professional',
    canDecode: true,
    canEncode: true,
    transparency: true,
    lossless: true,
    aliases: ['tiff'],
    description: 'Tagged Image File format',
    tested: true
  },
  {
    format: 'tga',
    label: 'TGA',
    extension: 'tga',
    mimeType: 'image/x-tga',
    category: 'professional',
    canDecode: true,
    canEncode: true,
    transparency: true,
    lossless: true,
    description: 'Truevision Targa uncompressed raster with alpha',
    tested: true
  },
  {
    format: 'pcx',
    label: 'PCX',
    extension: 'pcx',
    mimeType: 'image/x-pcx',
    category: 'professional',
    canDecode: true,
    canEncode: true,
    transparency: false,
    description: 'ZSoft PC Paintbrush 24-bit TrueColor RLE raster',
    tested: true
  },
  {
    format: 'jp2',
    label: 'JP2',
    extension: 'jp2',
    mimeType: 'image/jp2',
    category: 'professional',
    canDecode: true,
    canEncode: false,
    transparency: true,
    aliases: ['j2k'],
    description: 'JPEG 2000 wavelet compressed image',
    tested: true
  },
  {
    format: 'j2k',
    label: 'J2K',
    extension: 'j2k',
    mimeType: 'image/jp2',
    category: 'professional',
    canDecode: true,
    canEncode: false,
    transparency: true,
    aliases: ['jp2'],
    description: 'JPEG 2000 raw codestream',
    tested: true
  },

  // ─── 5. Adobe Formats ───
  {
    format: 'psd',
    label: 'PSD',
    extension: 'psd',
    mimeType: 'image/vnd.adobe.photoshop',
    category: 'adobe',
    canDecode: true,
    canEncode: false,
    transparency: true,
    aliases: ['psb'],
    description: 'Adobe Photoshop composite artwork',
    tested: true
  },
  {
    format: 'psb',
    label: 'PSB',
    extension: 'psb',
    mimeType: 'image/vnd.adobe.photoshop',
    category: 'adobe',
    canDecode: true,
    canEncode: false,
    transparency: true,
    aliases: ['psd'],
    description: 'Adobe Photoshop Large Document Format',
    tested: true
  },
  {
    format: 'ai',
    label: 'AI',
    extension: 'ai',
    mimeType: 'application/pdf',
    category: 'adobe',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Adobe Illustrator vector artwork',
    tested: true
  },
  {
    format: 'eps',
    label: 'EPS',
    extension: 'eps',
    mimeType: 'application/postscript',
    category: 'adobe',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Encapsulated PostScript vector & composite artwork',
    tested: true
  },
  {
    format: 'ps',
    label: 'PS',
    extension: 'ps',
    mimeType: 'application/postscript',
    category: 'adobe',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Adobe PostScript document',
    tested: true
  },

  // ─── 6. Vector Graphics ───
  {
    format: 'svg',
    label: 'SVG',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    category: 'vector',
    canDecode: true,
    canEncode: true,
    transparency: true,
    lossless: true,
    description: 'Scalable Vector Graphics XML document',
    tested: true
  },
  {
    format: 'svgz',
    label: 'SVGZ',
    extension: 'svgz',
    mimeType: 'image/svg+xml-compressed',
    category: 'vector',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Gzip-compressed Scalable Vector Graphics',
    tested: true
  },

  // ─── CAD & Technical Graphics ───
  {
    format: 'wmf',
    label: 'WMF',
    extension: 'wmf',
    mimeType: 'image/x-wmf',
    category: 'cad',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Windows Metafile 16-bit vector/bitmap graphic',
    tested: true
  },
  {
    format: 'emf',
    label: 'EMF',
    extension: 'emf',
    mimeType: 'image/x-emf',
    category: 'cad',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Enhanced Metafile 32-bit vector/bitmap graphic',
    tested: true
  },
  {
    format: 'dxf',
    label: 'DXF',
    extension: 'dxf',
    mimeType: 'application/dxf',
    category: 'cad',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'AutoCAD Drawing Exchange Format CAD vector entity',
    tested: true
  },
  {
    format: 'dwg',
    label: 'DWG',
    extension: 'dwg',
    mimeType: 'image/vnd.dwg',
    category: 'cad',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'AutoCAD native binary CAD drawing',
    tested: true
  },
  {
    format: 'cgm',
    label: 'CGM',
    extension: 'cgm',
    mimeType: 'image/cgm',
    category: 'cad',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Computer Graphics Metafile (ISO 8632 2D vector/raster)',
    tested: true
  },

  // ─── 7. CorelDRAW Formats ───
  {
    format: 'cdr',
    label: 'CDR',
    extension: 'cdr',
    mimeType: 'application/vnd.corel-draw',
    category: 'corel',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'CorelDRAW vector artwork document (v3-2024)',
    tested: true
  },
  {
    format: 'cmx',
    label: 'CMX',
    extension: 'cmx',
    mimeType: 'image/x-cmx',
    category: 'corel',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Corel Presentation Exchange vector graphic',
    tested: true
  },
  {
    format: 'cpt',
    label: 'CPT',
    extension: 'cpt',
    mimeType: 'image/x-corelphotopaint',
    category: 'corel',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Corel Photo-Paint bitmap graphic',
    tested: true
  },

  // ─── 8. Icon Formats ───
  {
    format: 'ico',
    label: 'ICO',
    extension: 'ico',
    mimeType: 'image/x-icon',
    category: 'icon',
    canDecode: true,
    canEncode: true,
    transparency: true,
    description: 'Windows multi-resolution icon container',
    tested: true
  },
  {
    format: 'icns',
    label: 'ICNS',
    extension: 'icns',
    mimeType: 'image/x-icns',
    category: 'icon',
    canDecode: true,
    canEncode: true,
    transparency: true,
    description: 'Apple macOS icon family container',
    tested: true
  },
  {
    format: 'cur',
    label: 'CUR',
    extension: 'cur',
    mimeType: 'image/x-win-bitmap',
    category: 'icon',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Windows Cursor resource with hotspot coordinates',
    tested: true
  },

  // ─── 9. Camera RAW Formats ───
  {
    format: 'raw',
    label: 'RAW',
    extension: 'raw',
    mimeType: 'image/x-dcraw',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2', 'pef'],
    description: 'Digital Camera Sensor RAW image',
    tested: true
  },
  {
    format: 'dng',
    label: 'DNG',
    extension: 'dng',
    mimeType: 'image/x-adobe-dng',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['raw'],
    description: 'Adobe Digital Negative camera RAW',
    tested: true
  },
  {
    format: 'cr2',
    label: 'CR2',
    extension: 'cr2',
    mimeType: 'image/x-canon-cr2',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Canon EOS Digital Camera RAW (CR2)',
    tested: true
  },
  {
    format: 'cr3',
    label: 'CR3',
    extension: 'cr3',
    mimeType: 'image/x-canon-cr3',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Canon EOS Digital Camera RAW (CR3)',
    tested: true
  },
  {
    format: 'nef',
    label: 'NEF',
    extension: 'nef',
    mimeType: 'image/x-nikon-nef',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Nikon Electronic Format camera RAW',
    tested: true
  },
  {
    format: 'arw',
    label: 'ARW',
    extension: 'arw',
    mimeType: 'image/x-sony-arw',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Sony Alpha Camera RAW',
    tested: true
  },
  {
    format: 'raf',
    label: 'RAF',
    extension: 'raf',
    mimeType: 'image/x-fuji-raf',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Fujifilm Camera RAW',
    tested: true
  },
  {
    format: 'orf',
    label: 'ORF',
    extension: 'orf',
    mimeType: 'image/x-olympus-orf',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Olympus Camera RAW',
    tested: true
  },
  {
    format: 'rw2',
    label: 'RW2',
    extension: 'rw2',
    mimeType: 'image/x-panasonic-rw2',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Panasonic Lumix Camera RAW',
    tested: true
  },
  {
    format: 'pef',
    label: 'PEF',
    extension: 'pef',
    mimeType: 'image/x-pentax-pef',
    category: 'raw',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Pentax Electronic File camera RAW',
    tested: true
  },

  // ─── 10. Gaming & Textures ───
  {
    format: 'dds',
    label: 'DDS',
    extension: 'dds',
    mimeType: 'image/x-dds',
    category: 'gaming',
    canDecode: true,
    canEncode: true,
    transparency: true,
    description: 'DirectDraw Surface 32-bit BGRA texture',
    tested: true
  },
  {
    format: 'ktx',
    label: 'KTX',
    extension: 'ktx',
    mimeType: 'image/ktx',
    category: 'gaming',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Khronos Texture 1.0 OpenGL/Vulkan texture container',
    tested: true
  },
  {
    format: 'ktx2',
    label: 'KTX2',
    extension: 'ktx2',
    mimeType: 'image/ktx2',
    category: 'gaming',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Khronos Texture 2.0 universal GPU texture container',
    tested: true
  },
  {
    format: 'pvr',
    label: 'PVR',
    extension: 'pvr',
    mimeType: 'image/x-pvr',
    category: 'gaming',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'PowerVR texture container (PVR v2/v3)',
    tested: true
  },

  // ─── 11. Scientific & HDR Formats ───
  {
    format: 'hdr',
    label: 'HDR',
    extension: 'hdr',
    mimeType: 'image/vnd.radiance',
    category: 'scientific',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Radiance RGBE high dynamic range image',
    tested: true
  },
  {
    format: 'exr',
    label: 'EXR',
    extension: 'exr',
    mimeType: 'image/x-exr',
    category: 'scientific',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'ILM OpenEXR multi-channel half-float image',
    tested: true
  },
  {
    format: 'fits',
    label: 'FITS',
    extension: 'fits',
    mimeType: 'image/fits',
    category: 'scientific',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['fit'],
    description: 'Flexible Image Transport System astronomical data',
    tested: true
  },
  {
    format: 'fit',
    label: 'FIT',
    extension: 'fit',
    mimeType: 'image/fits',
    category: 'scientific',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['fits'],
    description: 'FITS astronomical dataset image file',
    tested: true
  },

  // ─── 12. Legacy & Specialized ───
  {
    format: 'ppm',
    label: 'PPM',
    extension: 'ppm',
    mimeType: 'image/x-portable-pixmap',
    category: 'legacy',
    canDecode: true,
    canEncode: true,
    transparency: false,
    aliases: ['pnm', 'pgm', 'pbm'],
    description: 'Netpbm binary P6 portable pixmap',
    tested: true
  },
  {
    format: 'pnm',
    label: 'PNM',
    extension: 'pnm',
    mimeType: 'image/x-portable-anymap',
    category: 'legacy',
    canDecode: true,
    canEncode: true,
    transparency: false,
    aliases: ['ppm', 'pgm', 'pbm'],
    description: 'Netpbm portable anymap generic container',
    tested: true
  },
  {
    format: 'pgm',
    label: 'PGM',
    extension: 'pgm',
    mimeType: 'image/x-portable-graymap',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['ppm'],
    description: 'Netpbm portable graymap monochrome image',
    tested: true
  },
  {
    format: 'pbm',
    label: 'PBM',
    extension: 'pbm',
    mimeType: 'image/x-portable-bitmap',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: false,
    aliases: ['ppm'],
    description: 'Netpbm 1-bit portable bitmap graphic',
    tested: true
  },
  {
    format: 'xbm',
    label: 'XBM',
    extension: 'xbm',
    mimeType: 'image/x-xbitmap',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'X11 ASCII C-code monochrome bitmap',
    tested: true
  },
  {
    format: 'xpm',
    label: 'XPM',
    extension: 'xpm',
    mimeType: 'image/x-xpixmap',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'X11 ASCII C-code color pixmap',
    tested: true
  },
  {
    format: 'xcf',
    label: 'XCF',
    extension: 'xcf',
    mimeType: 'image/x-xcf',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'GIMP original multi-layer document artwork',
    tested: true
  },
  {
    format: 'ora',
    label: 'ORA',
    extension: 'ora',
    mimeType: 'image/openraster',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'OpenRaster multi-layer graphics package',
    tested: true
  },
  {
    format: 'kra',
    label: 'KRA',
    extension: 'kra',
    mimeType: 'application/x-krita',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: true,
    description: 'Krita illustration project package',
    tested: true
  },
  {
    format: 'idml',
    label: 'IDML',
    extension: 'idml',
    mimeType: 'application/vnd.adobe.indesign-idml-package',
    category: 'adobe',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'Adobe InDesign Markup Language package',
    tested: true
  },
  {
    format: 'wpg',
    label: 'WPG',
    extension: 'wpg',
    mimeType: 'image/x-wpg',
    category: 'legacy',
    canDecode: true,
    canEncode: false,
    transparency: false,
    description: 'WordPerfect Graphics file',
    tested: true
  },

  // ─── 13. Document Output ───
  {
    format: 'pdf',
    label: 'PDF',
    extension: 'pdf',
    mimeType: 'application/pdf',
    category: 'document',
    canDecode: false,
    canEncode: true,
    transparency: false,
    description: 'Standard single-page PDF document wrapper for print & sharing',
    tested: true
  }
];

export interface PurposeCategory {
  id: string;
  name: string;
  description: string;
}

/**
 * The 10 Purpose Categories in strict mandated order:
 * 1. Raster & Web
 * 2. Animated Images
 * 3. Professional & Print
 * 4. Vector Graphics
 * 5. Icons
 * 6. Document
 * 7. Specialized & Legacy
 * 8. Scientific & HDR
 * 9. Design Formats
 * 10. CAD & Technical Graphics
 */
export const PURPOSE_CATEGORIES: PurposeCategory[] = [
  { id: 'raster-web', name: 'Raster & Web', description: 'Standard & modern web photographic raster images' },
  { id: 'animated', name: 'Animated Images', description: 'Multi-frame and animated graphics' },
  { id: 'professional-print', name: 'Professional & Print', description: 'Archival, publishing, raw photography, and high-fidelity print formats' },
  { id: 'vector', name: 'Vector Graphics', description: 'Scalable vector and illustration graphics' },
  { id: 'icons', name: 'Icons', description: 'Operating system icon and cursor containers' },
  { id: 'document', name: 'Document', description: 'Standard document formats' },
  { id: 'specialized-legacy', name: 'Specialized & Legacy', description: 'GPU textures, legacy pixmaps, and specialized formats' },
  { id: 'scientific-hdr', name: 'Scientific & HDR', description: 'High-dynamic-range and astronomical imagery' },
  { id: 'design', name: 'Design Formats', description: 'Multi-layer document artwork from Photoshop, Illustrator, Corel, GIMP, Krita, InDesign' },
  { id: 'cad-tech', name: 'CAD & Technical Graphics', description: 'Computer-aided design, technical blueprints, and vector metafile graphics' }
];

export interface DeduplicatedTargetFormat {
  format: string; // Canonical format identifier (e.g. 'jpg', 'png')
  label: string; // Merged display label (e.g. 'JPG / JPEG', 'TIFF / TIF')
  extensions: string; // Extensions (e.g. '.jpg, .jpeg')
  category: string; // Purpose category id
  description: string;
  transparency: boolean;
  lossless?: boolean;
}

/**
 * Single source of truth for deduplicated output target formats across the 9 purpose categories.
 * Each format appears only once (JPG/JPEG merged, TIFF/TIF merged, PPM/PNM merged, GIF in Animated only, etc.).
 */
export const DEDUPLICATED_TARGET_FORMATS: DeduplicatedTargetFormat[] = [
  // 1. Raster & Web
  {
    format: 'jpg',
    label: 'JPG / JPEG',
    extensions: '.jpg, .jpeg',
    category: 'raster-web',
    description: 'Universal photographic format for web and sharing',
    transparency: false
  },
  {
    format: 'png',
    label: 'PNG',
    extensions: '.png',
    category: 'raster-web',
    description: 'Lossless raster graphic with full alpha transparency',
    transparency: true,
    lossless: true
  },
  {
    format: 'webp',
    label: 'WebP',
    extensions: '.webp',
    category: 'raster-web',
    description: 'Modern web image with superior lossy & lossless compression',
    transparency: true
  },
  {
    format: 'avif',
    label: 'AVIF',
    extensions: '.avif',
    category: 'raster-web',
    description: 'Next-generation AV1 image with ultra-high compression',
    transparency: true
  },
  {
    format: 'bmp',
    label: 'BMP',
    extensions: '.bmp',
    category: 'raster-web',
    description: 'Standard uncompressed Windows Bitmap',
    transparency: false,
    lossless: true
  },
  {
    format: 'qoi',
    label: 'QOI',
    extensions: '.qoi',
    category: 'raster-web',
    description: 'Quite OK Image format — fast lossless 24/32-bit raster',
    transparency: true,
    lossless: true
  },

  // 2. Animated Images (GIF appears ONLY here per specification)
  {
    format: 'gif',
    label: 'GIF',
    extensions: '.gif',
    category: 'animated',
    description: 'Graphics Interchange Format (256-color palette)',
    transparency: true
  },

  // 3. Professional & Print
  {
    format: 'tiff',
    label: 'TIFF / TIF',
    extensions: '.tiff, .tif',
    category: 'professional-print',
    description: 'Archival lossless Baseline TIFF 6.0',
    transparency: true,
    lossless: true
  },
  {
    format: 'tga',
    label: 'TGA',
    extensions: '.tga',
    category: 'professional-print',
    description: 'Truevision Targa uncompressed raster with alpha',
    transparency: true,
    lossless: true
  },
  {
    format: 'pcx',
    label: 'PCX',
    extensions: '.pcx',
    category: 'professional-print',
    description: 'ZSoft PC Paintbrush 24-bit TrueColor RLE raster',
    transparency: false
  },

  // 4. Vector Graphics
  {
    format: 'svg',
    label: 'SVG',
    extensions: '.svg',
    category: 'vector',
    description: 'Scalable Vector Graphics (W3C standard)',
    transparency: true,
    lossless: true
  },

  // 5. Icons
  {
    format: 'ico',
    label: 'ICO',
    extensions: '.ico',
    category: 'icons',
    description: 'Windows multi-resolution icon container',
    transparency: true
  },
  {
    format: 'icns',
    label: 'ICNS',
    extensions: '.icns',
    category: 'icons',
    description: 'Apple macOS icon family container',
    transparency: true
  },

  // 6. Document
  {
    format: 'pdf',
    label: 'PDF',
    extensions: '.pdf',
    category: 'document',
    description: 'Standard single-page PDF document wrapper',
    transparency: false
  },

  // 7. Specialized & Legacy
  {
    format: 'dds',
    label: 'DDS',
    extensions: '.dds',
    category: 'specialized-legacy',
    description: 'DirectDraw Surface 32-bit BGRA texture',
    transparency: true
  },
  {
    format: 'ppm',
    label: 'PPM / PNM',
    extensions: '.ppm, .pnm',
    category: 'specialized-legacy',
    description: 'Netpbm binary P6 portable pixmap',
    transparency: false
  }
];

@Injectable({
  providedIn: 'root'
})
export class ImageCapabilityRegistry {
  private readonly capabilitiesByFormat = new Map<string, FormatCapability>();
  private readonly aliasMap = new Map<string, string>();

  constructor() {
    for (const cap of ALL_CAPABILITIES) {
      this.capabilitiesByFormat.set(cap.format, cap);
      if (cap.aliases) {
        for (const alias of cap.aliases) {
          this.aliasMap.set(alias.toLowerCase(), cap.format);
        }
      }
    }
  }

  /**
   * Resolves an alias (e.g. 'jpeg', 'tif', 'fit', 'jfif') to its canonical format identifier.
   */
  resolveCanonicalFormat(formatStr: string): string {
    const lower = formatStr.toLowerCase();
    if (this.capabilitiesByFormat.has(lower)) {
      return lower;
    }
    return this.aliasMap.get(lower) || lower;
  }

  /**
   * Returns true if the given input format is supported by the image conversion pipeline.
   */
  isInputSupported(format: string): boolean {
    const canonical = this.resolveCanonicalFormat(format);
    const cap = this.capabilitiesByFormat.get(canonical);
    return !!(cap && cap.canDecode);
  }

  /**
   * Returns true if the given output format has a functional, tested encoder ready.
   */
  isOutputSupported(format: string): boolean {
    const canonical = this.resolveCanonicalFormat(format);
    const cap = this.capabilitiesByFormat.get(canonical);
    return !!(cap && cap.canEncode && cap.tested);
  }

  /**
   * Returns all format capabilities registered in the application.
   */
  getAllCapabilities(): FormatCapability[] {
    return ALL_CAPABILITIES;
  }

  /**
   * Returns all verified output formats with functional encoders.
   */
  getAllOutputCapabilities(): FormatCapability[] {
    return ALL_CAPABILITIES.filter(c => c.canEncode && c.tested);
  }

  /**
   * Returns the 13 canonical format groups covering all inputs and outputs.
   */
  getAllGroups(): FormatGroup[] {
    const groupDefinitions: { category: CapabilityCategory; name: string; description: string }[] = [
      { category: 'common', name: 'Common', description: 'Mainstream web and raster image formats' },
      { category: 'modern', name: 'Modern', description: 'Next-generation high-efficiency image formats' },
      { category: 'animated', name: 'Animated', description: 'Multi-frame animated image formats' },
      { category: 'professional', name: 'Professional', description: 'High-fidelity photography and archival formats' },
      { category: 'adobe', name: 'Adobe', description: 'Photoshop, Illustrator, and PostScript formats' },
      { category: 'vector', name: 'Vector Graphics', description: 'Scalable vector and metafile graphics' },
      { category: 'corel', name: 'CorelDRAW', description: 'CorelDRAW vector artwork and Photo-Paint documents' },
      { category: 'icon', name: 'Icons', description: 'Windows and Apple desktop icon and cursor formats' },
      { category: 'raw', name: 'Camera RAW', description: 'Digital camera sensor RAW files' },
      { category: 'gaming', name: 'Gaming and Textures', description: 'DirectDraw, Khronos, and PowerVR GPU textures' },
      { category: 'scientific', name: 'Scientific and HDR', description: 'Astronomical FITS and high-dynamic-range images' },
      { category: 'legacy', name: 'Legacy and Specialized', description: 'Netpbm, X11, GIMP XCF, OpenRaster, and Unix formats' },
      { category: 'document', name: 'Document Output', description: 'Print-ready single page PDF documents' }
    ];

    return groupDefinitions.map(def => ({
      id: def.category,
      name: def.name,
      category: def.category,
      description: def.description,
      formats: ALL_CAPABILITIES.filter(c => c.category === def.category)
    }));
  }

  /**
   * Returns verified output formats grouped by category for the UI format selector.
   */
  getOutputGroups(): FormatGroup[] {
    const outputs = this.getAllOutputCapabilities();
    const groupOrder: { category: CapabilityCategory; name: string }[] = [
      { category: 'common', name: 'Common Formats' },
      { category: 'modern', name: 'Modern Formats' },
      { category: 'professional', name: 'Professional Formats' },
      { category: 'icon', name: 'Icon Formats' },
      { category: 'gaming', name: 'Gaming & Textures' },
      { category: 'legacy', name: 'Specialized & Legacy' },
      { category: 'document', name: 'Document Output' }
    ];

    const result: FormatGroup[] = [];
    for (const group of groupOrder) {
      const items = outputs.filter(o => o.category === group.category);
      if (items.length > 0) {
        result.push({
          id: group.category,
          name: group.name,
          category: group.category,
          formats: items
        });
      }
    }
    return result;
  }

  /**
   * Returns the 9 mandated Purpose Categories in exact order.
   */
  getPurposeCategories(): PurposeCategory[] {
    return PURPOSE_CATEGORIES;
  }

  private readonly TARGET_RESTRICTIONS: Record<string, string[]> = {
    heic: ['jpg', 'png', 'webp', 'tiff'],
    heif: ['jpg', 'png', 'webp', 'tiff'],
    dng: ['jpg', 'png', 'tiff'],
    svg: ['png', 'jpg', 'webp', 'pdf'],
    apng: ['png', 'gif', 'webp'],
    jxl: ['jpg', 'png', 'webp', 'tiff'],
    psd: ['png', 'jpg', 'tiff', 'webp', 'pdf'],
    psb: ['png', 'jpg', 'tiff', 'pdf'],
    ai: ['svg', 'png', 'pdf', 'jpg'],
    eps: ['svg', 'png', 'pdf', 'jpg'],
    cdr: ['svg', 'png', 'pdf', 'jpg'],
    xcf: ['png', 'jpg', 'tiff', 'pdf'],
    ora: ['png', 'tiff', 'pdf'],
    kra: ['png', 'jpg', 'tiff', 'pdf'],
    idml: ['pdf', 'png', 'jpg'],
    dxf: ['svg', 'png', 'pdf'],
    dwg: ['svg', 'png', 'pdf'],
    wmf: ['svg', 'png', 'pdf'],
    emf: ['svg', 'png', 'pdf'],
    cgm: ['svg', 'png', 'pdf']
  };

  /**
   * Returns the deduplicated list of target formats, optionally filtered against the source format.
   * Merges aliases into single options (e.g. JPG / JPEG, TIFF / TIF, PPM / PNM).
   */
  getDeduplicatedTargetFormats(sourceFormat?: string): DeduplicatedTargetFormat[] {
    const rawSrc = sourceFormat ? this.resolveCanonicalFormat(sourceFormat.toLowerCase().trim()) : null;
    const allowed = rawSrc && this.TARGET_RESTRICTIONS[rawSrc] ? this.TARGET_RESTRICTIONS[rawSrc] : null;

    return DEDUPLICATED_TARGET_FORMATS.filter(item => {
      if (!rawSrc) return true;
      if (item.format === rawSrc) return false;
      if (allowed && !allowed.includes(item.format)) return false;
      return true;
    });
  }

  /**
   * Returns the list of genuine, tested output format descriptors available for a given source format.
   * Deduplicates aliases (e.g. JPG/JPEG, TIFF/TIF, PPM/PNM are presented once with merged labels/extensions).
   */
  getCompatibleOutputs(sourceFormat: string): FormatDescriptor[] {
    const rawLower = sourceFormat.toLowerCase();
    const canonicalSrc = this.resolveCanonicalFormat(rawLower);

    if (!this.isInputSupported(canonicalSrc)) {
      return [];
    }

    const availableOutputs = this.getAllOutputCapabilities();
    const allowed = this.TARGET_RESTRICTIONS[canonicalSrc] || null;

    return availableOutputs
      .filter(out => {
        // Exclude converting to the exact same format or canonical equivalent
        if (out.format === rawLower) return false;
        if (out.format === canonicalSrc) return false;

        // Alias handling: prevent redundant self-conversions
        if (canonicalSrc === 'jpg' && (out.format === 'jpg' || out.format === 'jpeg')) return false;
        if (canonicalSrc === 'tiff' && (out.format === 'tiff' || out.format === 'tif')) return false;
        if (canonicalSrc === 'fits' && (out.format === 'fits' || out.format === 'fit')) return false;

        // Avoid duplicate alias entries in output target list (keep canonical format)
        if (out.format === 'jpeg') return false; // represented by 'jpg'
        if (out.format === 'tif') return false;  // represented by 'tiff'
        if (out.format === 'pnm') return false;  // represented by 'ppm'

        // Apply format-specific target restrictions when present
        if (allowed && !allowed.includes(out.format)) return false;

        return true;
      })
      .map(cap => {
        let label = cap.label;
        let ext = cap.extension;

        if (cap.format === 'jpg') {
          label = 'JPG / JPEG';
          ext = 'jpg, jpeg';
        } else if (cap.format === 'tiff') {
          label = 'TIFF / TIF';
          ext = 'tiff, tif';
        } else if (cap.format === 'ppm') {
          label = 'PPM / PNM';
          ext = 'ppm, pnm';
        }

        return {
          format: cap.format,
          label,
          extension: ext,
          mimeType: cap.mimeType,
          category: (cap.category === 'modern' ? 'modern-image' : 'image') as any,
          executionMode: 'browser',
          description: cap.description,
          lossless: cap.lossless
        };
      });
  }

  /**
   * Computes contextual warnings about quality or feature trade-offs for a specific conversion.
   */
  getConversionWarnings(sourceFormat: string, targetFormat: string): ConversionLossWarning[] {
    const src = this.resolveCanonicalFormat(sourceFormat);
    const tgt = this.resolveCanonicalFormat(targetFormat);
    const warnings: ConversionLossWarning[] = [];

    const srcCap = this.capabilitiesByFormat.get(src);
    const tgtCap = this.capabilitiesByFormat.get(tgt);

    // 1. Transparency loss warning (converting an alpha-capable image to JPEG or standard BMP)
    if (srcCap?.transparency && tgtCap && !tgtCap.transparency) {
      warnings.push({
        type: 'transparency',
        title: 'Transparency Removal',
        message: `${tgtCap.label} does not support transparency. Transparent areas will be rendered on a clean white background.`
      });
    }

    // 2. High Dynamic Range / Scientific Tone-Mapping warning
    if (['hdr', 'exr', 'fits', 'fit'].includes(src)) {
      warnings.push({
        type: 'dynamic-range',
        title: 'SDR Tone Mapping',
        message: 'High dynamic range floating-point pixel data will be tone-mapped to 8-bit standard dynamic range (sRGB).'
      });
    }

    // 3. Layer Flattening warning (Photoshop, GIMP, OpenRaster)
    if (['psd', 'psb', 'xcf', 'ora'].includes(src)) {
      warnings.push({
        type: 'layers',
        title: 'Layer Flattening',
        message: 'Multi-layer document artwork will be flattened into a single full-resolution composite image.'
      });
    }

    // 4. Vector Rasterization warning
    if (['svg', 'svgz', 'eps', 'ai', 'wmf', 'emf', 'cdr', 'cmx', 'dxf'].includes(src)) {
      warnings.push({
        type: 'vector',
        title: 'Vector Rasterization',
        message: 'Vector artwork will be rendered into fixed raster pixels at original document dimensions.'
      });
    }

    // 5. Animation Flattening warning
    if ((src === 'gif' || src === 'apng') && tgt !== 'gif') {
      warnings.push({
        type: 'animation',
        title: 'Static Frame Capture',
        message: 'Animated image frames will be converted into a high-fidelity static image of the primary artwork frame.'
      });
    }

    // 6. Camera RAW Sensor Processing
    if (srcCap?.category === 'raw') {
      warnings.push({
        type: 'raw-sensor',
        title: 'Camera Calibration',
        message: 'Sensor RAW data will be rendered using camera-calibrated development settings and color science.'
      });
    }

    return warnings;
  }

  /**
   * Generates a Markdown capability table of all registered formats for audit and documentation.
   */
  generateCapabilityReport(): string {
    const lines: string[] = [
      '| Format | Category | Input (Decoder) | Output (Encoder) | Verified & Tested |',
      '| :--- | :--- | :--- | :--- | :--- |'
    ];

    for (const cap of ALL_CAPABILITIES) {
      const inStr = cap.canDecode ? 'Yes' : 'No';
      const outStr = cap.canEncode ? 'Yes' : 'No';
      const testStr = cap.tested ? 'Yes' : 'No';
      const catLabel = cap.category.charAt(0).toUpperCase() + cap.category.slice(1);
      lines.push(`| ${cap.label} | ${catLabel} | ${inStr} | ${outStr} | ${testStr} |`);
    }

    return lines.join('\n');
  }
}
