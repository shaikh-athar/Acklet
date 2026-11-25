// client/apps/tool-docs/src/app/models/doc.model.ts

export type DocStatus = 'DRAFT' | 'PUBLISHED';

export type DocBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'bullet_list'
  | 'numbered_list'
  | 'checklist'
  | 'code'
  | 'divider'
  | 'callout'
  | 'toggle'
  | 'table'
  | 'file'
  | 'image'
  | 'video'
  | 'embed';

export type MediaLayout = 'inset' | 'wide' | 'full' | 'two_up' | 'three_up' | 'gallery';

export interface GalleryImageItem {
  url: string;
  alt: string;
  caption?: string;
}

export interface TableData {
  headerRow?: boolean;
  rows: string[][];
  alignments?: Array<'left' | 'center' | 'right'>;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  level?: number;
}

export interface BlockTextFormat {
  start: number;
  end: number;
  type: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'highlight' | 'link';
  url?: string;
}

export interface DocBlock {
  id: string;
  type: DocBlockType;
  text?: string;
  formats?: BlockTextFormat[];
  items?: string[];
  itemLevels?: number[];
  checklistItems?: ChecklistItem[];
  tableData?: TableData;
  codeLanguage?: string;
  codeWrap?: boolean;
  codeLineNumbers?: boolean;
  calloutType?: 'info' | 'warning' | 'tip' | 'danger';
  toggleTitle?: string;
  toggleOpen?: boolean;
  toggleBlocks?: DocBlock[];
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  url?: string;
  alt?: string;
  caption?: string;
  layout?: MediaLayout;
  rotation?: number;
  cropAspectRatio?: string;
  images?: GalleryImageItem[];
  embedType?: 'youtube' | 'vimeo' | 'upload';
  embedId?: string;
  align?: 'left' | 'center' | 'right';
  posterUrl?: string;
}

export interface SaveBlocksPayload {
  title?: string;
  blocks: DocBlock[];
  version?: number;
}

export interface MediaUploadResult {
  id: string;
  url: string;
  filename: string;
  originalFilename: string;
  mediaType: string;
  sizeBytes: number;
}

export interface DocTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
}

export interface DocSection {
  id: string;
  documentId: string;
  heading: string;
  body: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocDocument {
  id: string;
  toolId?: string;
  toolName?: string;
  title: string;
  slug?: string;
  summary?: string;
  status: DocStatus;
  ownerId: string;
  authorName?: string;
  sectionCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocDocumentDetail {
  id: string;
  toolId?: string;
  toolName?: string;
  title: string;
  slug?: string;
  summary?: string;
  status: DocStatus;
  ownerId: string;
  authorName?: string;
  sections: DocSection[];
  blocks?: DocBlock[];
  version?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentPayload {
  toolId?: string;
  title: string;
}

export interface UpdateDocumentPayload {
  title?: string;
  status?: DocStatus;
}

export interface PublishDocumentPayload {
  title: string;
  summary?: string;
}

export interface PublicSection {
  heading: string;
  body: string;
  position: number;
}

export interface PublicDocument {
  title: string;
  summary?: string;
  toolName?: string;
  toolSlug?: string;
  slug: string;
  publishedAt?: string;
  updatedAt?: string;
  sections: PublicSection[];
  blocks?: DocBlock[];
}

export interface CreateSectionPayload {
  heading?: string;
  body?: string;
  position?: number;
}

export interface UpdateSectionPayload {
  heading?: string;
  body?: string;
}

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface DocPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export type DocSort = 'last_modified' | 'title_asc' | 'published_at';
export type DocStatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED';

export interface DocumentQueryParams {
  toolId?: string;
  q?: string;
  status?: DocStatusFilter;
  sort?: DocSort;
  page?: number;
  size?: number;
}

export interface FollowStatus {
  authorId: string;
  isFollowing: boolean;
  followerCount: number;
}

export interface AuthorProfile {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  joinedAt: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  publishedStories: DocDocument[];
}

export interface BookmarkItem {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  summary?: string;
  authorName?: string;
  bookmarkedAt: string;
}

export interface ReadingHistoryItem {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  summary?: string;
  authorName?: string;
  lastReadAt: string;
}

export interface DocNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
