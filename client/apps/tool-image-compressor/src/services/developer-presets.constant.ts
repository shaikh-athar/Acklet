// apps/tool-image-compressor/src/services/developer-presets.constant.ts
import { DeveloperPresetConfig, DeveloperPresetKey, ImageVariantConfig } from '../models/compressor.models';
import { COMPRESSOR_CONFIG } from '../config/compressor.config';

export const DEVELOPER_PRESETS: DeveloperPresetConfig[] = COMPRESSOR_CONFIG.presets.developer;

export const DEFAULT_VARIANTS: ImageVariantConfig[] = COMPRESSOR_CONFIG.variants.defaultConfigs;

export function getDeveloperPreset(key: DeveloperPresetKey): DeveloperPresetConfig | undefined {
  return DEVELOPER_PRESETS.find(p => p.key === key);
}
