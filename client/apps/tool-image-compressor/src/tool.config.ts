// apps/tool-image-compressor/src/tool.config.ts
import { ToolConfig } from '@acklet/tool-shell';

export const IMAGE_COMPRESSOR_TOOL_CONFIG: ToolConfig = {
  name: 'Image Compressor',
  slug: 'image-compressor',
  noun: {
    singular: 'image',
    plural: 'images'
  },
  ctaVerb: 'Compress',
  limit: 50,
  accent: {
    primary: '#2563EB',
    soft: 'rgba(37, 99, 235, 0.08)',
    contrast: '#FFFFFF'
  },
  bgPreset: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.05) 0%, transparent 70%)',
  headlines: [
    'Shrink it. Keep it sharp. Share it.',
    'Make it under 200 KB in one click.',
    'Compress photos with zero quality loss.',
    'Fast in-browser compression with total privacy.'
  ],
  popular: [
    { label: 'Under 200 KB', target: '200kb', presetKey: 'web-standard' },
    { label: 'Under 100 KB', target: '100kb', presetKey: 'email' },
    { label: 'WebP 80%', target: 'webp', presetKey: 'avatar' },
    { label: 'Smallest file', target: 'smallest', presetKey: 'thumbnail' }
  ],
  formats: {
    acceptedInputs: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg,.svgz,.heic,.heif,.jxl,.tiff,.tif',
    availableOutputs: [
      { value: 'original', label: 'ORIGINAL', badge: 'ORIGINAL' },
      { value: 'webp', label: 'WEBP', badge: 'Best' },
      { value: 'jpg', label: 'JPG' },
      { value: 'png', label: 'PNG' },
      { value: 'avif', label: 'AVIF' }
    ]
  },
  settingsSections: ['TARGET', 'QUALITY', 'RESIZE', 'OPTIONS']
};
