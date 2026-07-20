export interface MediaItem {
  mediaType: string;
  url: string;
  caption?: string;
  displayOrder: number;
}

export interface VersionLog {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
  upcomingFeatures?: string;
}

export interface ToolKnowledgeHub {
  toolId: string;
  overview: string;
  purpose: string;
  problemsSolved: string;
  whoShouldUse: string;
  whoShouldAvoid: string;
  expectedInputs: string;
  expectedOutputs: string;
  bestPractices: string;
  advantages: string;
  limitations: string;
  verifiedBadge: boolean;
  maintainer: string;
  officialWebsite?: string;
  documentationUrl?: string;
  githubRepository?: string;
  technicalDetails?: Record<string, any>;
  compatibility?: Record<string, any>;
  pricingDetails?: Record<string, any>;
  privacyDetails?: Record<string, any>;
  resources?: Record<string, any>;
  seoMetadata?: Record<string, any>;
  mediaItems: MediaItem[];
  versionHistory: VersionLog[];
}
