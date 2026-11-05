// apps/tool-temp-email/src/services/temp-email-provider.interface.ts
import { MailDomain, MailAccount, MessageSummary, MessageDetail } from '../models/temp-email.models';

/**
 * Pluggable Temporary Email Provider Interface.
 * Allows switching backend providers (Mail.tm, GuerrillaMail, 1secmail, or custom SMTP)
 * without touching UI components or state management.
 */
export interface ITempEmailProvider {
  /**
   * Unique identifier of the provider implementation.
   */
  readonly providerId: string;

  /**
   * User-facing display name of the provider.
   */
  readonly providerName: string;

  /**
   * Fetches active domains available for provisioning addresses.
   */
  getDomains(): Promise<MailDomain[]>;

  /**
   * Registers a new temporary email account.
   */
  createAccount(address: string, password?: string): Promise<{ id: string; address: string; createdAt: string }>;

  /**
   * Obtains an authentication token or session credential.
   */
  getToken(address: string, password?: string): Promise<{ token: string; id: string }>;

  /**
   * Fetches message headers/summaries for the active account.
   */
  getMessages(token: string, page?: number): Promise<{ messages: MessageSummary[]; totalItems: number }>;

  /**
   * Fetches full message content including MIME attachments and HTML body.
   */
  getMessage(token: string, messageId: string): Promise<MessageDetail>;

  /**
   * Deletes a specific message.
   */
  deleteMessage(token: string, messageId: string): Promise<void>;

  /**
   * Deletes an account and all its messages.
   */
  deleteAccount(token: string, accountId: string): Promise<void>;

  /**
   * Marks a message as read.
   */
  markAsSeen(token: string, messageId: string): Promise<void>;
}

