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

export interface CompressorConfig {
  limits: CompressorLimitsConfig;
  presets: CompressorPresetsConfig;
  variants: CompressorVariantsConfig;
  targetSize: CompressorTargetSizeConfig;
  profiles: OptimizationProfile[];
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
    maxPasses: 6
  },
  profiles: SYSTEM_PROFILES
};

