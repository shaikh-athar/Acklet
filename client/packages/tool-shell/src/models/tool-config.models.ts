// packages/tool-shell/src/models/tool-config.models.ts

export interface ToolNounConfig {
  singular: string;
  plural: string;
}

export interface PopularChipConfig {
  label: string;
  source?: string;
  target?: string;
  flags?: string[];
  presetKey?: string;
}

export type SettingsSectionType =
  | 'TARGET'
  | 'POPULAR'
  | 'QUALITY'
  | 'RESIZE'
  | 'DPI'
  | 'LAYOUT FIDELITY'
  | 'OPTIONS'
  | 'TRANSFORMS'
  | 'DELIVERY';

export interface ToolFormatOption {
  value: string;
  label: string;
  badge?: 'ORIGINAL' | 'RECOMMENDED' | string;
  description?: string;
}

export interface ToolConfig {
  name: string;
  slug: string;
  noun: ToolNounConfig;
  ctaVerb: string;
  limit: number;
  accent: {
    primary: string;
    soft: string;
    contrast: string;
  };
  bgPreset: string;
  headlines: string[];
  popular: PopularChipConfig[];
  formats: {
    acceptedInputs: string;
    availableOutputs?: ToolFormatOption[];
  };
  settingsSections: SettingsSectionType[];
}
