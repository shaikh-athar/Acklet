// apps/tool-image-compressor/src/config/compressor.config.ts
import {
  DeveloperPresetConfig,
  ImageVariantConfig,
  OptimizationProfile,
  SmartPreset
} from '../models/compressor.models';

export interface SmartPresetDefinition {
  key: SmartPreset;
  label: string;
  quality: number;
  description: string;
  badge: string;
}

export interface CompressorLimitsConfig {
  maxFiles: number;
  maxFileSizeMB: number;
  maxFileSizeBytes: number;
  maxDecodedMegapixels: number;
  maxPixels: number;
  maxDimensionEdge: number;
  workerConcurrency: number;
}

export interface CompressorPresetsConfig {
  smart: Record<SmartPreset, SmartPresetDefinition>;
  smartList: SmartPresetDefinition[];
  developer: DeveloperPresetConfig[];
}

export interface CompressorVariantsConfig {
  widths: readonly [320, 640, 1280, 1920];
  defaultConfigs: ImageVariantConfig[];
}

export interface CompressorTargetSizeConfig {
  tolerancePercent: number;
  toleranceRatio: number;
  qualityFloor: number;
  maxPasses: number;
}

export interface SmartDefaultBand {
  minBytes: number;
  maxBytes: number;
  minReductionPercent: number;
  maxReductionPercent: number;
  description: string;
}

export interface SmartDefaultsConfig {
  bands: SmartDefaultBand[];
  qualityFloorSSIM: number;
}

export interface CloudSourceCredentials {
  apiKey?: string;
  clientId?: string;
  appKey?: string;
}

export interface CloudSourcesConfig {
  googleDrive?: CloudSourceCredentials;
  dropbox?: CloudSourceCredentials;
  oneDrive?: CloudSourceCredentials;
}

export interface CompressorConfig {
  engine?: 'v1' | 'v2';
  debug?: boolean;
  defaultResizeMode: string;
  minReductionPercent: number;
  defaultMinSavingPercent: number;
  smartDefaults: SmartDefaultsConfig;
  limits: CompressorLimitsConfig;
  presets: CompressorPresetsConfig;
  variants: CompressorVariantsConfig;
  targetSize: CompressorTargetSizeConfig;
  profiles: OptimizationProfile[];
  cloudSources?: CloudSourcesConfig;
}

const SMART_PRESETS: Record<SmartPreset, SmartPresetDefinition> = {
  'best-quality': {
    key: 'best-quality',
    label: 'Best Quality',
    quality: 90,
    description: 'Highest visual fidelity with modest size reduction.',
    badge: 'Q90'
  },
  'balanced': {
    key: 'balanced',
    label: 'Balanced',
    quality: 80,
    description: 'Default balance of visual quality and storage savings.',
    badge: 'Q80'
  },
  'smallest-size': {
    key: 'smallest-size',
    label: 'Smallest Size',
    quality: 60,
    description: 'Maximum practical size reduction without heavy distortion.',
    badge: 'Q60'
  }
};

const DEVELOPER_PRESETS: DeveloperPresetConfig[] = [
  {
    key: 'website',
    label: 'Website Images',
    category: 'Web Performance',
    description: 'Modern WebP compression, stripped EXIF, and max 1280px responsive viewport fit.',
    targetFormat: 'webp',
    quality: 80,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 1280,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • 1280px • Q80'
  },
  {
    key: 'blog',
    label: 'Blog & Articles',
    category: 'Content Publishing',
    description: '1200px width with location GPS stripped and high typographic fidelity for text-heavy layouts.',
    targetFormat: 'webp',
    quality: 82,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 1200,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'strip-gps',
    badge: 'WebP • 1200px • Q82'
  },
  {
    key: 'ecommerce',
    label: 'E-commerce Products',
    category: 'Retail & Catalog',
    description: '1000px bounding catalog dimensions with alpha transparency preserved and crisp Q85% fidelity.',
    targetFormat: 'webp',
    quality: 85,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 1000,
      height: 1000,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP/PNG • 1000px • Q85'
  },
  {
    key: 'social',
    label: 'Social Media',
    category: 'Social Feeds',
    description: 'Universal 1200x630 OpenGraph and social feed dimensions with sRGB color profile encoding.',
    targetFormat: 'jpeg',
    quality: 85,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 1200,
      height: 630,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'JPEG • 1200×630 • Q85'
  },
  {
    key: 'thumbnails',
    label: 'Thumbnails',
    category: 'UI & Lists',
    description: '320px compact preview thumbnails optimized for lazy loading, grid cards, and mobile feeds.',
    targetFormat: 'webp',
    quality: 75,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 320,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • 320px • Q75'
  },
  {
    key: 'retina',
    label: 'Retina / High-DPI',
    category: 'Displays',
    description: 'Exploits Retina visual density to deliver 2x sharpness (up to 2560px) at lower byte weight.',
    targetFormat: 'webp',
    quality: 75,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 2560,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • 2560px • Q75'
  },
  {
    key: 'webp-lossy',
    label: 'WebP Web',
    category: 'Modern Formats',
    description: 'High-efficiency modern WebP format with sharp compression for any web usage.',
    targetFormat: 'webp',
    quality: 80,
    resize: {
      enabled: false,
      mode: 'percentage',
      percentage: 100,
      maintainAspectRatio: true,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • Q80'
  },
  {
    key: 'avif-photo',
    label: 'AVIF Photo',
    category: 'Modern Formats',
    description: 'Next-generation AVIF codec delivering maximum file size savings with excellent fidelity.',
    targetFormat: 'avif',
    quality: 72,
    resize: {
      enabled: false,
      mode: 'percentage',
      percentage: 100,
      maintainAspectRatio: true,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'AVIF • Q72'
  },
  {
    key: 'jpeg-standard',
    label: 'JPEG Photo',
    category: 'Standard Formats',
    description: 'Universally compatible JPEG compression for photography, legacy browsers, and print.',
    targetFormat: 'jpeg',
    quality: 82,
    resize: {
      enabled: false,
      mode: 'percentage',
      percentage: 100,
      maintainAspectRatio: true,
      preventUpscale: true
    },
    metadataPolicy: 'strip-gps',
    badge: 'JPEG • Q82'
  },
  {
    key: 'png-lossless',
    label: 'PNG Graphic',
    category: 'Lossless & Alpha',
    description: 'Preserve transparent alpha channels and crisp line-art raster graphics.',
    targetFormat: 'png',
    quality: 90,
    resize: {
      enabled: false,
      mode: 'percentage',
      percentage: 100,
      maintainAspectRatio: true,
      preventUpscale: true
    },
    metadataPolicy: 'preserve',
    badge: 'PNG • Lossless'
  },
  {
    key: 'email',
    label: 'Email Size',
    category: 'Messaging',
    description: 'Compact dimensions and compression guaranteed to keep files featherweight for fast inbox delivery.',
    targetFormat: 'jpeg',
    quality: 78,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 800,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'JPEG • 800px • Q78'
  },
  {
    key: 'mobile',
    label: 'Mobile App',
    category: 'Mobile Assets',
    description: 'Dense responsive asset compression tailored for mobile app UI elements and screens.',
    targetFormat: 'webp',
    quality: 80,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 750,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • 750px • Q80'
  },
  {
    key: 'reduce-50',
    label: 'Reduce 50%',
    category: 'Target Savings',
    description: 'Balanced compression aiming to cut byte weight by half while preserving pristine sharpness.',
    targetFormat: 'original',
    quality: 75,
    resize: {
      enabled: false,
      mode: 'percentage',
      percentage: 100,
      maintainAspectRatio: true,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'Balanced • ~50% Savings'
  },
  {
    key: 'reduce-70',
    label: 'Reduce 70%',
    category: 'Target Savings',
    description: 'High-impact compression achieving deep byte weight reduction for bandwidth-constrained environments.',
    targetFormat: 'webp',
    quality: 65,
    resize: {
      enabled: true,
      mode: 'percentage',
      percentage: 85,
      maintainAspectRatio: true,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'Compact • ~70% Savings'
  },
  {
    key: 'under-100kb',
    label: 'Under 100 KB',
    category: 'Target Budgets',
    description: 'Strict lightweight budget for ultra-fast LCP scores and performance budgets.',
    targetFormat: 'webp',
    quality: 72,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 1200,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • <100 KB'
  },
  {
    key: 'hero',
    label: 'Hero Banner',
    category: 'Web Performance',
    description: 'Large 1920px widescreen hero banner with edge clarity and smooth gradients.',
    targetFormat: 'webp',
    quality: 84,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 1920,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'WebP • 1920px • Q84'
  },
  {
    key: 'portfolio',
    label: 'Photo Gallery',
    category: 'Photography',
    description: 'Maximum fidelity for fine art, creative portfolios, and high-dynamic-range photography.',
    targetFormat: 'jpeg',
    quality: 90,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 2048,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'preserve',
    badge: 'JPEG • 2048px • Q90'
  },
  {
    key: 'avatar',
    label: 'Discord / Avatar',
    category: 'Avatars & Profiles',
    description: 'Square 512×512 avatar and profile image optimization for chat, Discord, and user profiles.',
    targetFormat: 'png',
    quality: 85,
    resize: {
      enabled: true,
      mode: 'dimensions',
      width: 512,
      height: 512,
      maintainAspectRatio: true,
      percentage: 100,
      preventUpscale: true
    },
    metadataPolicy: 'remove',
    badge: 'PNG • 512×512'
  }
];

const DEFAULT_VARIANTS: ImageVariantConfig[] = [
  { id: 'thumb', name: 'Thumbnail', suffix: '-thumb', width: 320, enabled: true, maintainAspectRatio: true },
  { id: 'mobile', name: 'Mobile', suffix: '-mobile', width: 640, enabled: true, maintainAspectRatio: true },
  { id: 'desktop', name: 'Desktop', suffix: '-desktop', width: 1280, enabled: true, maintainAspectRatio: true },
  { id: 'large', name: 'Large Display', suffix: '-large', width: 1920, enabled: false, maintainAspectRatio: true }
];

const SYSTEM_PROFILES: OptimizationProfile[] = [
  {
    id: 'system-web-balanced',
    name: 'Web Balanced',
    description: 'Modern WebP output at 80% quality with metadata stripped for fast web delivery.',
    isCustom: false,
    settings: {
      mode: 'custom',
      preset: 'balanced',
      quality: 80,
      outputFormat: 'webp',
      targetFileSize: {
        enabled: true,
        targetBytes: 200 * 1024,
        targetValue: 200,
        targetUnit: 'KB',
        minQuality: 25
      },
      resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true },
      metadataPolicy: 'remove',
      advancedOptimization: {
        progressiveJpeg: true,
        losslessWebp: false,
        cleanTransparency: true,
        optimizePalette: true,
        compressionEffort: 4,
        chromaSubsampling: 'auto'
      }
    }
  },
  {
    id: 'system-ecommerce-hd',
    name: 'E-Commerce HD',
    description: 'High-definition product imagery (max 1200px width, 85% quality) retaining non-GPS metadata.',
    isCustom: false,
    settings: {
      mode: 'custom',
      preset: 'best-quality',
      quality: 85,
      outputFormat: 'webp',
      resize: { enabled: true, mode: 'dimensions', width: 1200, percentage: 100, maintainAspectRatio: true },
      metadataPolicy: 'strip-gps',
      advancedOptimization: {
        progressiveJpeg: true,
        losslessWebp: false,
        cleanTransparency: true,
        optimizePalette: false,
        compressionEffort: 5,
        chromaSubsampling: '4:4:4'
      }
    }
  },
  {
    id: 'system-ultra-compressed',
    name: 'Ultra Compressed',
    description: 'Aggressive compression targeting < 150KB for mobile speed and bandwidth conservation.',
    isCustom: false,
    settings: {
      mode: 'custom',
      preset: 'smallest-size',
      quality: 55,
      outputFormat: 'webp',
      targetFileSize: { enabled: true, targetBytes: 150 * 1024, targetValue: 150, targetUnit: 'KB', minQuality: 20 },
      resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true },
      metadataPolicy: 'remove',
      advancedOptimization: {
        progressiveJpeg: true,
        losslessWebp: false,
        cleanTransparency: true,
        optimizePalette: true,
        compressionEffort: 6,
        chromaSubsampling: '4:2:0'
      }
    }
  },
  {
    id: 'system-lossless-archival',
    name: 'Lossless Archival',
    description: '100% pixel-perfect preservation with metadata retained for photography masters.',
    isCustom: false,
    settings: {
      mode: 'custom',
      preset: 'best-quality',
      quality: 100,
      outputFormat: 'png',
      resize: { enabled: false, mode: 'dimensions', percentage: 100, maintainAspectRatio: true },
      metadataPolicy: 'preserve',
      advancedOptimization: {
        progressiveJpeg: false,
        losslessWebp: true,
        cleanTransparency: false,
        optimizePalette: false,
        compressionEffort: 6,
        chromaSubsampling: '4:4:4'
      }
    }
  },
  {
    id: 'system-social-opengraph',
    name: 'Social OpenGraph',
    description: '1200x630px JPEG format optimized for social preview cards and link sharing.',
    isCustom: false,
    settings: {
      mode: 'custom',
      preset: 'balanced',
      quality: 85,
      outputFormat: 'jpeg',
      resize: { enabled: true, mode: 'dimensions', width: 1200, height: 630, percentage: 100, maintainAspectRatio: true },
      metadataPolicy: 'remove',
      advancedOptimization: {
        progressiveJpeg: true,
        losslessWebp: false,
        cleanTransparency: true,
        optimizePalette: false,
        compressionEffort: 4,
        chromaSubsampling: '4:2:0'
      }
    }
  }
];

export const COMPRESSOR_CONFIG: CompressorConfig = {
  engine: 'v1',
  debug: false,
  defaultResizeMode: 'Original (no resize)',
  minReductionPercent: 5,
  defaultMinSavingPercent: 10,
  smartDefaults: {
    bands: [
      { minBytes: 0, maxBytes: 100 * 1024, minReductionPercent: 5, maxReductionPercent: 10, description: 'Under 100 KB' },
      { minBytes: 100 * 1024, maxBytes: 1024 * 1024, minReductionPercent: 10, maxReductionPercent: 30, description: '100 KB to 1 MB' },
      { minBytes: 1024 * 1024, maxBytes: 2 * 1024 * 1024, minReductionPercent: 30, maxReductionPercent: 40, description: '1 MB to 2 MB' },
      { minBytes: 2 * 1024 * 1024, maxBytes: Infinity, minReductionPercent: 40, maxReductionPercent: 50, description: 'Over 2 MB' }
    ],
    qualityFloorSSIM: 0.85
  },
  limits: {
    maxFiles: 50,
    maxFileSizeMB: 50,
    maxFileSizeBytes: 50 * 1024 * 1024,
    maxDecodedMegapixels: 100,
    maxPixels: 100_000_000,
    maxDimensionEdge: 16384,
    workerConcurrency: 2
  },
  presets: {
    smart: SMART_PRESETS,
    smartList: Object.values(SMART_PRESETS),
    developer: DEVELOPER_PRESETS
  },
  variants: {
    widths: [320, 640, 1280, 1920] as const,
    defaultConfigs: DEFAULT_VARIANTS
  },
  targetSize: {
    tolerancePercent: 5,
    toleranceRatio: 0.05,
    qualityFloor: 25,
    maxPasses: 16
  },
  profiles: SYSTEM_PROFILES,
  cloudSources: {
    googleDrive: {
      apiKey: '',
      clientId: ''
    },
    dropbox: {
      appKey: ''
    },
    oneDrive: {
      clientId: ''
    }
  }
};

export function getSmartDefaultBand(fileSizeBytes: number): SmartDefaultBand {
  const bands = COMPRESSOR_CONFIG.smartDefaults.bands;
  for (const band of bands) {
    if (fileSizeBytes < band.maxBytes) {
      return band;
    }
  }
  return bands[bands.length - 1];
}

