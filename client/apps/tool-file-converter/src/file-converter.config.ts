// apps/tool-file-converter/src/file-converter.config.ts
import { ToolConfig } from '@acklet/tool-shell';

export const FILE_CONVERTER_TOOL_CONFIG: ToolConfig = {
  name: 'File Converter',
  slug: 'file-converter',
  noun: {
    singular: 'file',
    plural: 'files'
  },
  ctaVerb: 'Convert',
  limit: 50,
  accent: {
    primary: '#7C3AED',
    soft: 'rgba(124, 58, 237, 0.08)',
    contrast: '#FFFFFF'
  },
  bgPreset: 'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.05) 0%, transparent 70%)',
  headlines: [
    'Convert PDFs to editable documents easily.',
    'Turn contact cards into clean CSVs.',
    'Convert subtitle files with zero drift.',
    'Fast universal file conversion in browser.'
  ],
  popular: [
    { label: 'VCF to CSV', source: 'VCF', target: 'CSV' },
    { label: 'SRT to VTT', source: 'SRT', target: 'VTT' },
    { label: 'PNG to PDF', source: 'PNG', target: 'PDF' },
    { label: 'JPG to PDF', source: 'JPG', target: 'PDF' },
    { label: 'CSV to VCF', source: 'CSV', target: 'VCF' },
    { label: 'VTT to SRT', source: 'VTT', target: 'SRT' }
  ],
  formats: {
    acceptedInputs: '.png,.jpg,.jpeg,.webp,.avif,.svg,.gif,.bmp,.ico,.heic,.srt,.vtt,.vcf,.csv,.pdf',
    availableOutputs: [
      { value: 'webp', label: 'WEBP', badge: 'RECOMMENDED' },
      { value: 'jpg', label: 'JPG' },
      { value: 'png', label: 'PNG' },
      { value: 'csv', label: 'CSV' },
      { value: 'vtt', label: 'VTT' },
      { value: 'pdf', label: 'PDF' }
    ]
  },
  settingsSections: ['TARGET', 'POPULAR', 'QUALITY', 'OPTIONS', 'DELIVERY']
};
