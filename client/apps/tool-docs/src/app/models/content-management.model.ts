// client/apps/tool-docs/src/app/models/content-management.model.ts

export type ToolStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';
export type ToolPricingType = 'FREE' | 'FREEMIUM' | 'PAID' | 'SUBSCRIPTION' | 'OPEN_SOURCE';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  category?: CategoryItem;
  categorySlug?: string;
  categoryName?: string;
  publisherId?: string;
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  pricingType: ToolPricingType;
  isOpenSource: boolean;
  status: ToolStatus;
  verificationStatus?: string;
  trustScore?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateToolPayload {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  categorySlug: string;
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  pricingType?: string;
  isOpenSource?: boolean;
}

export interface UpdateToolPayload {
  name?: string;
  tagline?: string;
  description?: string;
  categorySlug?: string;
  websiteUrl?: string;
  githubUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  pricingType?: string;
  isOpenSource?: boolean;
}

export type CollectionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CollectionItem {
  id: string;
  userId: string;
  name: string;
  slug: string;
  coverImage?: string;
  description?: string;
  introduction?: string;
  isPublic: boolean;
  status: CollectionStatus;
  publishedAt?: string;
  seoMetadata?: string;
  toolCount: number;
  createdAt: string;
  updatedAt: string;
  tools?: ToolItem[];
}

export interface CreateCollectionPayload {
  name: string;
  slug?: string;
  coverImage?: string;
  description?: string;
  introduction?: string;
  isPublic?: boolean;
  status?: string;
  seoMetadata?: string;
  toolIds?: string[];
}

export interface UpdateCollectionPayload {
  name?: string;
  slug?: string;
  coverImage?: string;
  description?: string;
  introduction?: string;
  isPublic?: boolean;
  status?: string;
  seoMetadata?: string;
  toolIds?: string[];
}
