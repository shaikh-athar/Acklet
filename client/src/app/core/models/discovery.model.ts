import { Tool } from './tool.model';

export interface DynamicHomepageSection {
  sectionKey: string;
  title: string;
  subtitle?: string;
  displayOrder: number;
  items: Tool[];
}

export interface DiscoveryRankingWeights {
  id?: string;
  relevanceWeight: number;
  popularityWeight: number;
  trendingWeight: number;
  qualityWeight: number;
}

export interface HomepageSectionConfig {
  id?: string;
  sectionKey: string;
  title: string;
  subtitle?: string;
  displayOrder: number;
  enabled: boolean;
  itemLimit: number;
}
