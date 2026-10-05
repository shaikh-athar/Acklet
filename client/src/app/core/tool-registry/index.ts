// src/app/core/tool-registry/index.ts

import { Type } from '@angular/core';

export interface ToolManifest {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  shortDescription: string;
  icon: string;
  version?: string;
  status?: 'active' | 'beta' | 'deprecated';
  features?: string[];
  howItWorks?: string[];
  faqs?: { question: string; answer: string }[];
  suggestedTools?: string[]; // list of tool slugs
  seo?: {
    title: string;
    description: string;
    keywords?: string[];
  };
}

/**
 * Single Central Tool Registry
 * Currently EMPTY ("Tools coming soon").
 * As tools are built, add their manifests here.
 */
export const TOOL_REGISTRY: Record<string, ToolManifest> = {};

/**
 * Dynamic Component mapping for tool implementations
 */
export const TOOL_COMPONENTS: Record<string, () => Promise<Type<any>>> = {};
