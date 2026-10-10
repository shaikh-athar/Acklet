// packages/tool-registry/src/models.ts

export type ToolStatus = 'live' | 'beta' | 'coming-soon' | 'maintenance' | 'hidden';
export type ToolBadgeType = 'new' | 'beta' | 'updated';
export type ToolLayoutMode = 'standard' | 'fullBleed';

export interface ToolFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ToolHighlight {
  label: string;
  value: string;
  tooltip?: string;
}

export interface ToolSeo {
  title: string;
  description: string;
  keywords?: string[];
}

export interface ToolManifestTab {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number;
  keepAlive?: boolean;
}

export interface ToolRegistryItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug?: string;
  shortDescription: string;
  description: string;
  icon: string;
  version?: string;
  status: ToolStatus;
  badge?: ToolBadgeType;
  subdomain?: string;
  addedAt?: string; // ISO Date YYYY-MM-DD
  updatedAt?: string; // ISO Date YYYY-MM-DD
  featured?: boolean;
  order?: number;
  layout?: ToolLayoutMode;
  accentHue?: number; // 0-360
  supports?: string[]; // icon names e.g. ['shield', 'zap', 'lock']
  highlights?: ToolHighlight[];
  related?: string[]; // slug references
  requires?: Array<'clipboard' | 'camera' | 'microphone' | 'notifications' | 'backend'>;
  tabs?: ToolManifestTab[];
  features?: string[];
  howItWorks?: string[];
  faqs?: ToolFaq[];
  suggestedTools?: string[];
  seo?: ToolSeo;
}
