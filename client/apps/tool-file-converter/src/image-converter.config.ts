// apps/tool-file-converter/src/image-converter.config.ts
import { ToolConfig } from '@acklet/tool-shell';

export const IMAGE_CONVERTER_TOOL_CONFIG: ToolConfig = {
  name: 'Image Converter',
  slug: 'image-converter',
  noun: {
    singular: 'image',
    plural: 'images'
  },
  ctaVerb: 'Convert',
  limit: 50,
  accent: {
    primary: '#0D9488',
    soft: 'rgba(13, 148, 136, 0.08)',
    contrast: '#FFFFFF'
  },
  bgPreset: 'radial-gradient(circle at 50% 0%, rgba(13, 148, 136, 0.05) 0%, transparent 70%)',
  headlines: [
    'Convert your images to modern WebP.',
    'Turn your photos into PDF instantly.',
    'Convert PNG to transparent WebP effortlessly.',
    'Universal image conversion inside your browser.'
  ],
  popular: [
    { label: 'PNG to WebP', source: 'PNG', target: 'WEBP' },
    { label: 'JPG to WebP', source: 'JPG', target: 'WEBP' },
    { label: 'HEIC to JPG', source: 'HEIC', target: 'JPG' },
    { label: 'PNG to JPG', source: 'PNG', target: 'JPG' },
    { label: 'WebP to PNG', source: 'WEBP', target: 'PNG' },
    { label: 'SVG to PNG', source: 'SVG', target: 'PNG' }
  ],
  formats: {
    acceptedInputs: 'image/*,.png,.jpg,.jpeg,.webp,.avif,.svg,.gif,.bmp,.ico,.heic',
    availableOutputs: [
      { value: 'webp', label: 'WEBP', badge: 'RECOMMENDED' },
      { value: 'jpg', label: 'JPG' },
      { value: 'png', label: 'PNG' },
      { value: 'avif', label: 'AVIF' },
      { value: 'pdf', label: 'PDF' }
    ]
  },
  settingsSections: ['TARGET', 'POPULAR', 'QUALITY', 'RESIZE', 'DELIVERY']
};
