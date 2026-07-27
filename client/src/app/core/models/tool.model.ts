// src/app/core/models/tool.model.ts

export interface Tool {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  shortDescription?: string;
  description?: string;
  tagline?: string;
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  pricingType?: string;
  isOpenSource?: boolean;
  status?: string;
  verificationStatus?: string;
  upvoteCount?: number;
  tags?: string[];
  features?: string[];
  usageSteps?: UsageStep[];
  screenshots?: Screenshot[];
  faqs?: FAQ[];
  relatedToolIds?: string[];
  rating?: number;
  reviewCount?: number;
  usageCount?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isPopular?: boolean;
  icon?: string;
  color?: string;
  gradient?: string;
  addedDate?: string;
  createdAt?: string;
  version?: string;
  url?: string;
  author?: string;
  authorName?: string;
  category?: string;
  githubRepo?: string;
}

export interface UsageStep {
  step: number;
  title: string;
  description: string;
}

export interface Screenshot {
  id: string;
  title: string;
  description: string;
}

export interface FAQ {
  question: string;
  answer: string;
}
