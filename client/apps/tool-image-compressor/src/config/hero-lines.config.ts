// apps/tool-image-compressor/src/config/hero-lines.config.ts

export interface HeroLine {
  text: string;
  highlight?: string;
  tone?: 'accent' | 'plain';
}

/**
 * Short, motivating, first-impression lines for the landing hero.
 * Non-developers can edit lines, highlights, and tones directly here.
 */
export const HERO_LINES: HeroLine[] = [
  {
    text: 'Hi there, what do you want to shrink today?',
    highlight: 'shrink today?'
  },
  {
    text: 'Your images, lighter in seconds.',
    highlight: 'lighter in seconds.'
  },
  {
    text: 'Smaller files. Same sharp look.',
    highlight: 'Same sharp look.'
  },
  {
    text: 'Ready to speed up your website?',
    highlight: 'speed up your website?'
  },
  {
    text: 'Got photos that are too heavy?',
    highlight: 'too heavy?'
  },
  {
    text: 'Make it under 200 KB in one click.',
    highlight: 'under 200 KB'
  },
  {
    text: 'Faster pages start with smaller images.',
    highlight: 'smaller images.'
  },
  {
    text: 'Shrink it. Keep it sharp. Share it.',
    highlight: 'Keep it sharp.'
  }
];

