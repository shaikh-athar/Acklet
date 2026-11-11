// packages/tool-registry/src/manifests/color-studio.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const COLOR_STUDIO_MANIFEST: ToolRegistryItem = {
  id: 'colorstudio',
  name: 'Color Studio',
  slug: 'colorstudio',
  category: 'Design',
  categorySlug: 'design',
  shortDescription: 'Unified color suite: advanced picker, image extractor, gradient builder, WCAG contrast checker, palette generator, and vision simulator.',
  about: 'Acklet Color Studio brings together six essential color tools into a cohesive, browser-side creative workstation.\n\nConvert formats in real time across HEX, RGB, HSL, HSV, and CMYK; sample dominant colors from images; compose smooth multi-stop CSS gradients; audit accessibility with WCAG 2.1 compliance; synthesize harmonious palettes; and simulate eight color vision deficiencies—all processed 100% locally in your browser memory.',
  description: 'Design, extract, test, and export accessible color systems with zero server uploads. Features an Advanced Picker, Image Extractor, CSS Gradient Generator, WCAG Contrast Checker, Harmonic Palette Generator, and Color Blindness Simulator.',
  icon: 'palette',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 4,
  subdomain: 'colorstudio',
  executionMode: 'browser',
  layout: 'fullBleed',
  addedAt: '2026-11-08',
  updatedAt: '2026-11-09',
  accent: 'blue',
  accentHue: 217,
  supports: ['shield-check', 'zap', 'copy'],
  theme: {
    accent: BLUE_ACCENT,
    font: {
      family: 'Scoutie Sans',
      fontFamily: "'Scoutie Sans', system-ui, -apple-system, sans-serif",
      fallback: 'system-ui, -apple-system, sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Processing', value: '100% Browser' },
    { label: 'Modules', value: '6 Integrated' },
    { label: 'WCAG Standard', value: '2.1 AA / AAA' },
    { label: 'Privacy', value: 'Zero Uploads' }
  ],
  highlights: [
    { label: 'Browser-Side', value: 'Zero Latency', tooltip: 'All conversions and image extractions execute entirely in your browser.' },
    { label: '6 Modules', value: 'Unified Suite', tooltip: 'Picker, Image Extractor, CSS Gradients, Contrast Checker, Palettes, and Vision Simulator share colors seamlessly.' },
    { label: 'WCAG 2.1', value: 'AA & AAA', tooltip: 'Live contrast ratio calculation with intelligent auto-fix recommendations.' }
  ],
  tabs: [
    { id: 'picker', label: 'Color Picker', icon: 'pipette' },
    { id: 'extractor', label: 'Image Extractor', icon: 'image' },
    { id: 'gradient', label: 'Gradient Generator', icon: 'layers' },
    { id: 'contrast', label: 'Contrast Checker', icon: 'check-circle' },
    { id: 'palette', label: 'Palette Generator', icon: 'palette' },
    { id: 'simulator', label: 'Vision Simulator', icon: 'eye' }
  ],
  subItems: [
    { id: 'picker', label: 'Color Picker', path: '/picker', icon: 'pipette' },
    { id: 'extractor', label: 'Image Extractor', path: '/extractor', icon: 'image' },
    { id: 'gradient', label: 'Gradient Generator', path: '/gradient', icon: 'layers' },
    { id: 'contrast', label: 'Contrast Checker', path: '/contrast', icon: 'check-circle' },
    { id: 'palette', label: 'Palette Generator', path: '/palette', icon: 'palette' },
    { id: 'simulator', label: 'Vision Simulator', path: '/simulator', icon: 'eye' }
  ],
  features: [
    'Advanced color picker with 2D spectrum canvas, hue and alpha sliders',
    'Real-time conversion across HEX, RGB, HSL, HSV, and CMYK formats',
    'Browser-side image color extraction via HTML5 canvas with interactive loupe',
    'Interactive CSS gradient generator with angle dial and draggable color stops',
    'WCAG 2.1 AA & AAA contrast checker with instant smart lightness adjustment',
    'Harmonic color palette generator (Analogous, Complementary, Triadic, Tetradic)',
    'Color blindness simulation for all 8 deficiencies using Brettel & Vienot matrices',
    '100% private, client-side memory execution with zero tracking'
  ],
  howTo: [
    'Select a module from the top navigation bar or segmented switch.',
    'Pick, extract, or generate colors using the interactive controls.',
    'Click any color swatch to copy its value in HEX, RGB, or HSL.',
    'Share colors across modules with one click to test contrast or generate gradients.'
  ],
  howItWorks: [
    'All color conversions utilize high-precision sRGB matrix transformations.',
    'Image extraction analyzes canvas pixel data using median-cut quantization in local memory.',
    'Contrast compliance implements the official W3C WCAG 2.1 relative luminance formula.',
    'Color blindness simulation applies peer-reviewed spectral transformation matrices.'
  ],
  faqs: [
    {
      id: 'faq-privacy',
      question: 'Are my uploaded images or colors sent to a server?',
      answer: 'No. Everything in Color Studio runs entirely on your device inside browser memory. Images are decoded locally onto an HTML5 canvas and never leave your computer.'
    },
    {
      id: 'faq-wcag',
      question: 'What contrast ratios are required for accessibility?',
      answer: 'WCAG 2.1 requires a minimum contrast ratio of 4.5:1 for regular text and 3:1 for large text (18pt or 14pt bold) to meet Level AA. Level AAA requires 7:1 for normal text and 4.5:1 for large text.'
    },
    {
      id: 'faq-sharing',
      question: 'Can I transfer colors between different modules?',
      answer: 'Yes. Every color swatch includes quick-action buttons to instantly send that color to the Contrast Checker, Gradient Builder, Palette Generator, or Color Picker.'
    }
  ],
  related: ['datalens', 'barcode', 'qr'],
  suggestedTools: ['datalens', 'barcode', 'qr'],
  seo: {
    title: 'Acklet Color Studio — Advanced Color Suite & Contrast Checker',
    description: 'Unified color tools: advanced picker, image color extractor, CSS gradient builder, WCAG contrast checker, palette generator, and vision simulator.',
    keywords: ['color studio', 'color picker', 'image color extractor', 'css gradient generator', 'contrast checker', 'wcag contrast', 'palette generator', 'color blindness simulator']
  }
};

