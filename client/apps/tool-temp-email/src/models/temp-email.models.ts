// apps/tool-temp-email/src/models/temp-email.models.ts

export interface MailDomain {
  id: string;
  domain: string;
  isActive: boolean;
  isPrivate: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MailAccount {
  id: string;
  address: string;
  password?: string;
  token: string;
  createdAt: string;
  expiresAt: number; // timestamp in ms
  label?: string;
  unreadCount?: number;
}

export interface EmailAddressParticipant {
  address: string;
  name: string;
}

export interface MessageSummary {
  id: string;
  accountId?: string;
  msgid?: string;
  from: EmailAddressParticipant;
  to: EmailAddressParticipant[];
  subject: string;
  intro: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  hasLinks?: boolean;
  size: number;
  createdAt: string;
  updatedAt: string;
  extractedOtp?: OtpExtractionResult | null;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  size: number;
  downloadUrl: string;
}

export interface MessageDetail extends MessageSummary {
  text: string;
  html: string[];
  attachments: MessageAttachment[];
  downloadUrl?: string;
  retention: boolean;
  retentionDate: string;
}

export interface OtpExtractionResult {
  code: string;
  type: 'numeric' | 'alphanumeric';
  contextPhrase: string;
  confidence: number;
}

export interface VerificationLinkResult {
  url: string;
  label: string;
  host: string;
}

export type AutoRefreshInterval = 5 | 10 | 15 | 30 | 0;

export type InboxFilter = 'all' | 'unread' | 'otp' | 'links' | 'attachments';

export interface EmailScanResults {
  otp: OtpExtractionResult | null;
  verificationLinks: VerificationLinkResult[];
}

export type ProviderStatusType = 'healthy' | 'slow' | 'unavailable' | 'rate-limited';

export interface ProviderStatus {
  type: ProviderStatusType;
  message: string;
  retryInSeconds?: number;
}

export interface LinkPreviewData {
  url: string;
  displayHost: string;
  fullUrl: string;
  visibleText?: string;
  isSuspicious: boolean;
}

export interface NotificationSettings {
  soundEnabled: boolean;
  browserAlertsEnabled: boolean;
  permissionStatus: NotificationPermission | 'default';
}

