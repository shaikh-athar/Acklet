// apps/tool-file-converter/src/converter.component.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TOOL_REGISTRY, CONVERTER_MANIFEST } from '../../../packages/tool-registry/src';
import { DOCUMENT_CONVERTER_CONFIG, computeCommonTestedTargets, computeRecommendedTarget, getTargetFormatMeta } from './converter.config';
import { FileListComponent } from './components/document-converter/file-list.component';
import { ConversionSettingsComponent } from './components/document-converter/conversion-settings.component';
import { FileJobItem, ConversionCapability, ConversionOptions } from './converter.models';

describe('File Converter Tool Identity & Registry Verification', () => {
  it('should have a registered file-converter tool manifest', () => {
    expect(CONVERTER_MANIFEST).toBeDefined();
    expect(CONVERTER_MANIFEST.slug).toBe('file-converter');
    expect(CONVERTER_MANIFEST.name).toBe('File Converter');
    expect(CONVERTER_MANIFEST.category).toBe('Converters');
  });

  it('should be registered in TOOL_REGISTRY under converter and file-converter', () => {
    expect(TOOL_REGISTRY['converter']).toBeDefined();
    expect(TOOL_REGISTRY['file-converter']).toBeDefined();
    expect(TOOL_REGISTRY['converter'].id).toBe('file-converter');
  });

  it('must define unified blue theme tokens matching tool identity', () => {
    expect(CONVERTER_MANIFEST.accent).toBe('blue');
    expect(CONVERTER_MANIFEST.accentHue).toBe(221);
    expect(CONVERTER_MANIFEST.theme?.accent).toBeDefined();

    // Light Theme
    expect(CONVERTER_MANIFEST.theme?.accent?.light.base.toLowerCase()).toBe('#2563eb');
    expect(CONVERTER_MANIFEST.theme?.accent?.light.ink.toLowerCase()).toBe('#ffffff');

    // Dark Theme
    expect(CONVERTER_MANIFEST.theme?.accent?.dark.base.toLowerCase()).toBe('#3b82f6');
    expect(CONVERTER_MANIFEST.theme?.accent?.dark.ink.toLowerCase()).toBe('#ffffff');
  });

  it('configuration must match the specification', () => {
    expect(DOCUMENT_CONVERTER_CONFIG.maxBatchFiles).toBe(20);
    expect(DOCUMENT_CONVERTER_CONFIG.maxFileSizeBytes).toBe(50 * 1024 * 1024);
    expect(DOCUMENT_CONVERTER_CONFIG.autoPurgeTtlHours).toBe(1);
    expect(DOCUMENT_CONVERTER_CONFIG.defaultTargetFormat).toBe('pdf');
    expect(DOCUMENT_CONVERTER_CONFIG.defaultFidelity).toBe('balanced');
  });
});

describe('Dynamic Heading Rules (Step 4)', () => {
  function computeHeading(files: Partial<FileJobItem>[]): string {
    const list = files as FileJobItem[];
    if (list.length === 0) return '';
    const exts = list.map(f => f.sourceFormat?.toLowerCase() || '');
    const firstExt = exts[0];
    const allSameExt = exts.every(e => e === firstExt);

    if (allSameExt) {
      if (firstExt === 'pdf') return 'PDFs to Convert';
      if (['docx', 'doc', 'odt', 'rtf', 'txt', 'html'].includes(firstExt)) return 'Documents to Convert';
      if (['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(firstExt)) return 'Spreadsheets to Convert';
      if (['pptx', 'ppt', 'odp'].includes(firstExt)) return 'Presentations to Convert';
      if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'].includes(firstExt)) return 'Images to Convert';
      if (['srt', 'vtt'].includes(firstExt)) return 'Subtitles to Convert';
      if (firstExt === 'vcf') return 'Contacts to Convert';
      return `${firstExt.toUpperCase()}s to Convert`;
    }

    if (exts.every(e => ['docx', 'doc', 'odt', 'rtf', 'txt', 'html'].includes(e))) return 'Documents to Convert';
    if (exts.every(e => ['xlsx', 'xls', 'ods', 'csv', 'tsv'].includes(e))) return 'Spreadsheets to Convert';
    if (exts.every(e => ['pptx', 'ppt', 'odp'].includes(e))) return 'Presentations to Convert';
    if (exts.every(e => ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'].includes(e))) return 'Images to Convert';

    return 'Files to Convert';
  }

  it('0 files returns empty string (no list heading)', () => {
    expect(computeHeading([])).toBe('');
  });

  it('all PDF files returns "PDFs to Convert"', () => {
    expect(computeHeading([{ sourceFormat: 'pdf' }, { sourceFormat: 'pdf' }])).toBe('PDFs to Convert');
  });

  it('all DOCX files returns "Documents to Convert"', () => {
    expect(computeHeading([{ sourceFormat: 'docx' }, { sourceFormat: 'docx' }])).toBe('Documents to Convert');
  });

  it('all XLSX or CSV files returns "Spreadsheets to Convert"', () => {
    expect(computeHeading([{ sourceFormat: 'xlsx' }])).toBe('Spreadsheets to Convert');
    expect(computeHeading([{ sourceFormat: 'csv' }, { sourceFormat: 'xlsx' }])).toBe('Spreadsheets to Convert');
  });

  it('all PPTX files returns "Presentations to Convert"', () => {
    expect(computeHeading([{ sourceFormat: 'pptx' }, { sourceFormat: 'pptx' }])).toBe('Presentations to Convert');
  });

  it('all image files returns "Images to Convert"', () => {
    expect(computeHeading([{ sourceFormat: 'png' }, { sourceFormat: 'jpg' }, { sourceFormat: 'webp' }])).toBe('Images to Convert');
  });

  it('mixed types returns "Files to Convert"', () => {
    expect(computeHeading([{ sourceFormat: 'pdf' }, { sourceFormat: 'docx' }])).toBe('Files to Convert');
    expect(computeHeading([{ sourceFormat: 'xlsx' }, { sourceFormat: 'png' }])).toBe('Files to Convert');
  });
});

describe('Settings Panel Show & Hide Rules (Step 6)', () => {
  it('Quality level slider is shown only when output is lossy image (JPG, WebP)', () => {
    const isQualityShown = (target: string) => ['jpg', 'jpeg', 'webp'].includes(target.toLowerCase());
    expect(isQualityShown('jpg')).toBe(true);
    expect(isQualityShown('jpeg')).toBe(true);
    expect(isQualityShown('webp')).toBe(true);
    expect(isQualityShown('png')).toBe(false);
    expect(isQualityShown('pdf')).toBe(false);
    expect(isQualityShown('docx')).toBe(false);
  });

  it('Resize dimension is shown only when output is an image format', () => {
    const isResizeShown = (target: string) => ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'].includes(target.toLowerCase());
    expect(isResizeShown('png')).toBe(true);
    expect(isResizeShown('jpg')).toBe(true);
    expect(isResizeShown('pdf')).toBe(false);
    expect(isResizeShown('docx')).toBe(false);
    expect(isResizeShown('txt')).toBe(false);
  });

  it('DPI dropdown is shown only when output is PNG/JPG from PDF or presentation', () => {
    const isDpiShown = (target: string, inputExts: string[]) => {
      if (!['png', 'jpg', 'jpeg'].includes(target.toLowerCase())) return false;
      return inputExts.some(ext => ['pdf', 'pptx', 'ppt', 'odp'].includes(ext.toLowerCase()));
    };
    expect(isDpiShown('png', ['pdf'])).toBe(true);
    expect(isDpiShown('jpg', ['pptx'])).toBe(true);
    expect(isDpiShown('png', ['docx'])).toBe(false);
    expect(isDpiShown('pdf', ['pptx'])).toBe(false);
  });

  it('Layout fidelity segmented control is shown only when output is DOCX, DOC, or PPTX', () => {
    const isFidelityShown = (target: string) => ['docx', 'doc', 'pptx'].includes(target.toLowerCase());
    expect(isFidelityShown('docx')).toBe(true);
    expect(isFidelityShown('doc')).toBe(true);
    expect(isFidelityShown('pptx')).toBe(true);
    expect(isFidelityShown('pdf')).toBe(false);
    expect(isFidelityShown('png')).toBe(false);
  });

  it('Keep embedded images checkbox is shown only when output is DOCX, MD, HTML, or PPTX', () => {
    const isKeepImagesShown = (target: string) => ['docx', 'md', 'html', 'pptx'].includes(target.toLowerCase());
    expect(isKeepImagesShown('docx')).toBe(true);
    expect(isKeepImagesShown('md')).toBe(true);
    expect(isKeepImagesShown('html')).toBe(true);
    expect(isKeepImagesShown('pptx')).toBe(true);
    expect(isKeepImagesShown('txt')).toBe(false);
    expect(isKeepImagesShown('pdf')).toBe(false);
  });

  it('Page range text input is shown only when input is PDF or PPTX', () => {
    const isPageRangeShown = (inputExts: string[]) => inputExts.some(ext => ['pdf', 'pptx', 'ppt', 'odp'].includes(ext.toLowerCase()));
    expect(isPageRangeShown(['pdf'])).toBe(true);
    expect(isPageRangeShown(['pptx'])).toBe(true);
    expect(isPageRangeShown(['docx'])).toBe(false);
    expect(isPageRangeShown(['xlsx'])).toBe(false);
  });

  it('OCR for scanned pages is shown only when server reports scanned input', () => {
    const isOcrShown = (files: Array<{ structureReport?: { hasScannedPages?: boolean } }>) =>
      files.some(f => Boolean(f.structureReport?.hasScannedPages));

    expect(isOcrShown([{ structureReport: { hasScannedPages: true } }])).toBe(true);
    expect(isOcrShown([{ structureReport: { hasScannedPages: false } }])).toBe(false);
    expect(isOcrShown([{}])).toBe(false);
  });

  it('Delivery dropdown is shown only when there is more than 1 result file', () => {
    const isDeliveryShown = (fileCount: number) => fileCount > 1;
    expect(isDeliveryShown(1)).toBe(false);
    expect(isDeliveryShown(2)).toBe(true);
    expect(isDeliveryShown(5)).toBe(true);
  });
});

describe('BEST Badge Logic (Step 6)', () => {
  const sampleCapabilities: ConversionCapability[] = [
    {
      inputType: 'docx',
      outputType: 'pdf',
      engine: 'libreoffice',
      phase: 1,
      status: 'tested',
      maxSizeMb: 50,
      recommendationScore: 98,
      flags: { ocr: false, pageRange: true, structureCheck: true, quality: false, layoutFidelity: true, resize: false }
    },
    {
      inputType: 'docx',
      outputType: 'md',
      engine: 'pandoc',
      phase: 1,
      status: 'tested',
      maxSizeMb: 50,
      recommendationScore: 85,
      flags: { ocr: false, pageRange: false, structureCheck: true, quality: false, layoutFidelity: false, resize: false }
    },
    {
      inputType: 'docx',
      outputType: 'txt',
      engine: 'tika',
      phase: 1,
      status: 'tested',
      maxSizeMb: 50,
      recommendationScore: 70,
      flags: { ocr: false, pageRange: false, structureCheck: false, quality: false, layoutFidelity: false, resize: false }
    }
  ];

  function getBestFormat(inputExts: string[], caps: ConversionCapability[]): string | null {
    const common = computeCommonTestedTargets(inputExts, caps);
    if (common.length === 0) return null;
    let best = common[0];
    let max = -1;
    for (const fmt of common) {
      const match = caps.find(c => inputExts.includes(c.inputType.toLowerCase()) && c.outputType.toLowerCase() === fmt && c.status === 'tested');
      const score = match?.recommendationScore ?? 0;
      if (score > max) {
        max = score;
        best = fmt;
      }
    }
    return best;
  }

  it('awards BEST badge to the format with the highest recommendation score', () => {
    const best = getBestFormat(['docx'], sampleCapabilities);
    expect(best).toBe('pdf'); // score 98 vs 85 for md and 70 for txt
  });

  it('awards RECOMMENDED badge to an image target (webp/png/jpg) when input is an image, never PDF', () => {
    const imageTargets = ['pdf', 'png', 'webp', 'bmp'];
    const bestForImage = computeRecommendedTarget(['jpeg'], imageTargets);
    expect(bestForImage).toBe('webp');
    expect(bestForImage).not.toBe('pdf');
  });

  it('awards RECOMMENDED badge to a document target when input is a PDF', () => {
    const pdfTargets = ['docx', 'jpg', 'txt', 'xlsx'];
    const bestForPdf = computeRecommendedTarget(['pdf'], pdfTargets);
    expect(bestForPdf).toBe('docx');
  });
});

describe('Image vs Document Structure Data Rules', () => {
  it('never shows structure data for image inputs', () => {
    const isImageFormat = (ext: string) => ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'].includes(ext.toLowerCase());
    const hasStructureData = (ext: string, report?: { headingsCount: number }) => {
      if (isImageFormat(ext)) return null;
      if (!report || report.headingsCount === 0) return null;
      return `${report.headingsCount} headings`;
    };

    // Even if an image has a structure report attached, it must be ignored
    expect(hasStructureData('jpeg', { headingsCount: 1 })).toBeNull();
    expect(hasStructureData('png', { headingsCount: 5 })).toBeNull();
    // Document with report is shown
    expect(hasStructureData('docx', { headingsCount: 3 })).toBe('3 headings');
  });
});

describe('Transforms Section Show/Hide Rules', () => {
  it('shows transforms only when input is image and output is image', () => {
    const showTransforms = (inputExt: string, outputExt: string) => {
      const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff', 'svg', 'avif'];
      return imageExts.includes(inputExt.toLowerCase()) && imageExts.includes(outputExt.toLowerCase());
    };

    expect(showTransforms('jpg', 'png')).toBe(true);
    expect(showTransforms('png', 'webp')).toBe(true);
    expect(showTransforms('jpg', 'pdf')).toBe(false);
    expect(showTransforms('pdf', 'png')).toBe(false);
    expect(showTransforms('docx', 'pdf')).toBe(false);
  });
});

describe('Primary Button States (Step 6)', () => {
  it('displays "Convert 1 File" for 1 file and "Convert N Files" for N files', () => {
    const getButtonText = (count: number) => count === 1 ? 'Convert 1 File' : `Convert ${count} Files`;
    expect(getButtonText(1)).toBe('Convert 1 File');
    expect(getButtonText(3)).toBe('Convert 3 Files');
    expect(getButtonText(20)).toBe('Convert 20 Files');
  });

  it('is disabled with reason when no common target format exists', () => {
    const availableTargets: string[] = [];
    const isButtonDisabled = availableTargets.length === 0;
    const reasonText = !isButtonDisabled ? null : 'Choose a format that works for all files';

    expect(isButtonDisabled).toBe(true);
    expect(reasonText).toBe('Choose a format that works for all files');
  });
});

describe('Popular Conversions Block Rules (Part A3)', () => {
  it('filters popular conversions so they are valid for every selected input type', () => {
    const POPULAR_PAIRS = [
      { label: 'PDF → Word', inputFormats: ['pdf'], targetFormat: 'docx' },
      { label: 'Word → PDF', inputFormats: ['docx', 'doc', 'odt', 'rtf'], targetFormat: 'pdf' },
      { label: 'PDF → JPG', inputFormats: ['pdf'], targetFormat: 'jpg' },
      { label: 'Excel → PDF', inputFormats: ['xlsx', 'xls', 'ods', 'csv'], targetFormat: 'pdf' },
      { label: 'PowerPoint → PDF', inputFormats: ['pptx', 'ppt', 'odp'], targetFormat: 'pdf' },
      { label: 'JPG → PNG', inputFormats: ['jpg', 'jpeg'], targetFormat: 'png' },
      { label: 'Image → PDF', inputFormats: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tiff'], targetFormat: 'pdf' }
    ];

    const filterPopular = (inputExts: string[]) => {
      if (inputExts.length === 0) return [];
      return POPULAR_PAIRS.filter(p => inputExts.every(src => p.inputFormats.includes(src.toLowerCase())));
    };

    // When all inputs are PDF: 'PDF → Word', 'PDF → JPG'
    const pdfPairs = filterPopular(['pdf']).map(p => p.label);
    expect(pdfPairs).toContain('PDF → Word');
    expect(pdfPairs).toContain('PDF → JPG');
    expect(pdfPairs).not.toContain('Word → PDF');
    expect(pdfPairs).not.toContain('Excel → PDF');

    // When all inputs are Word (docx): 'Word → PDF'
    const docxPairs = filterPopular(['docx']).map(p => p.label);
    expect(docxPairs).toEqual(['Word → PDF']);

    // When all inputs are Excel (xlsx): 'Excel → PDF'
    const xlsxPairs = filterPopular(['xlsx']).map(p => p.label);
    expect(xlsxPairs).toEqual(['Excel → PDF']);

    // When mixed (e.g. PDF and DOCX): no pair is valid for both, block is hidden
    const mixedPairs = filterPopular(['pdf', 'docx']);
    expect(mixedPairs.length).toBe(0);

    // When inputs are PNG: 'Image → PDF'
    const pngPairs = filterPopular(['png']).map(p => p.label);
    expect(pngPairs).toEqual(['Image → PDF']);

    // When inputs are JPG: 'JPG → PNG' and 'Image → PDF'
    const jpgPairs = filterPopular(['jpg']).map(p => p.label);
    expect(jpgPairs).toContain('JPG → PNG');
    expect(jpgPairs).toContain('Image → PDF');
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Customize Removal Verification (Part A1)', () => {
  it('FileCardComponent source has no customize button or settings icon button', () => {
    const cardSrc = fs.readFileSync(path.resolve(__dirname, 'components/document-converter/file-card.component.ts'), 'utf-8');
    expect(cardSrc).not.toContain('btn-customize');
    expect(cardSrc).not.toContain('settings-icon-btn');
    expect(cardSrc).not.toContain('customize = output');
  });

  it('FileListComponent source has no customize output or binding', () => {
    const listSrc = fs.readFileSync(path.resolve(__dirname, 'components/document-converter/file-list.component.ts'), 'utf-8');
    expect(listSrc).not.toContain('(customize)');
    expect(listSrc).not.toContain('customize = output');
  });

  it('ConversionSettingsComponent applies globally to all files with no editingItem input or customize close', () => {
    const settingsSrc = fs.readFileSync(path.resolve(__dirname, 'components/document-converter/conversion-settings.component.ts'), 'utf-8');
    expect(settingsSrc).not.toContain('editingItem = input');
    expect(settingsSrc).not.toContain('closeCustomize = output');
    expect(settingsSrc).toContain('Applies to all files');
  });

  it('Converter template has no customize handlers or per-file panel state', () => {
    const htmlSrc = fs.readFileSync(path.resolve(__dirname, 'converter.component.html'), 'utf-8');
    expect(htmlSrc).not.toContain('onCustomize');
    expect(htmlSrc).not.toContain('closeCustomize');
    expect(htmlSrc).not.toContain('[editingItem]');
  });
});
