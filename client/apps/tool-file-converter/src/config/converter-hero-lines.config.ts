// apps/tool-file-converter/src/config/converter-hero-lines.config.ts

export interface HeroLine {
  text: string;
  highlight?: string;
  tone?: 'accent' | 'plain';
}

/**
 * Image Converter landing hero rotating headlines.
 * Engaging, rotating value-driven lines matching the user's specification.
 */
export const IMAGE_CONVERTER_HERO_LINES: HeroLine[] = [
  {
    text: 'Hi there, what do you want to convert today?',
    highlight: 'convert today?'
  },
  {
    text: 'Your images, converted in seconds.',
    highlight: 'in seconds.'
  },
  {
    text: 'Any format. Same crystal clarity.',
    highlight: 'crystal clarity.'
  },
  {
    text: 'Ready to switch your image format?',
    highlight: 'image format?'
  },
  {
    text: 'Convert PNG, JPG, WebP in one click.',
    highlight: 'in one click.'
  },
  {
    text: 'Faster pages start with modern formats.',
    highlight: 'modern formats.'
  },
  {
    text: 'Convert it. Keep it sharp. Share it.',
    highlight: 'Keep it sharp.'
  }
];

/**
 * File Converter landing hero rotating headlines.
 * Engaging, rotating value-driven lines matching the user's specification.
 */
export const FILE_CONVERTER_HERO_LINES: HeroLine[] = [
  {
    text: 'Hi there, what do you want to convert today?',
    highlight: 'convert today?'
  },
  {
    text: 'Your files, converted in seconds.',
    highlight: 'in seconds.'
  },
  {
    text: 'Convert PDFs to Word with clean layout.',
    highlight: 'Word'
  },
  {
    text: 'Convert Word to PDF in one click.',
    highlight: 'PDF'
  },
  {
    text: 'Convert Excel spreadsheets to clean CSV.',
    highlight: 'CSV'
  },
  {
    text: 'Convert PowerPoint slides to crisp PDF.',
    highlight: 'crisp PDF.'
  },
  {
    text: 'Any file. Any format. Zero data loss.',
    highlight: 'Zero data loss.'
  },
  {
    text: 'Faster work starts with the right format.',
    highlight: 'right format.'
  }
];
