// apps/tool-temp-email/src/services/temp-email-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { createToolLogger } from '@acklet/shared';
import { MailDomain, MailAccount, MessageSummary, MessageDetail } from '../models/temp-email.models';
import { ITempEmailProvider } from './temp-email-provider.interface';

const log = createToolLogger('TempEmailApi');

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1') {
      return '/mail-api';
    }
  }
  return 'https://api.mail.tm';
}

@Injectable({
  providedIn: 'root'
})
export class TempEmailApiService implements ITempEmailProvider {
  readonly providerId = 'mail.tm';
  readonly providerName = 'Mail.tm';
  private readonly http = inject(HttpClient);

  /**
   * Fetches active domains available for new accounts.
   */
  async getDomains(): Promise<MailDomain[]> {
    try {
      log.debug('Fetching available domains...');
      const response = await firstValueFrom(
        this.http.get<any>(`${getApiBase()}/domains?page=1`)
      );
      const members: any[] = Array.isArray(response)
        ? response
        : (response && response['hydra:member'] ? response['hydra:member'] : []);
      const active = members.filter(d => d && d.isActive);
      log.info(`Retrieved ${active.length} active domains`);
      return active;
    } catch (err) {
      log.error('Failed to retrieve domains:', err);
      throw this.handleError(err, 'Unable to retrieve available temporary domains. Please try again shortly.');
    }
  }

  /**
   * Registers a new account with address and password.
   */
  async createAccount(address: string, password: string): Promise<{ id: string; address: string; createdAt: string }> {
    try {
      log.info(`Creating account on Mail.tm: ${address}`);
      const body = { address, password };
      const response = await firstValueFrom(
        this.http.post<{ id: string; address: string; createdAt: string }>(`${getApiBase()}/accounts`, body, {
          headers: new HttpHeaders({ 'Content-Type': 'application/json' })
        })
      );
      log.info(`Account created successfully: ${response.address} (id=${response.id})`);
      return response;
    } catch (err) {
      log.error(`Account creation failed for ${address}:`, err);
      throw this.handleError(err, 'Failed to create email account');
    }
  }

  /**
   * Obtains a JWT bearer token for the account with automatic retry for replication delay.
   */
  async getToken(address: string, password: string, retries: number = 2): Promise<{ token: string; id: string }> {
    const body = { address, password };
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        log.debug(`Requesting JWT token for: ${address} (attempt ${attempt + 1})`);
        const response = await firstValueFrom(
          this.http.post<{ token: string; id: string }>(`${getApiBase()}/token`, body, {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' })
          })
        );
        log.info(`JWT token acquired successfully for ${address}`);
        return response;
      } catch (err: any) {
        const isLast = attempt === retries;
        if (!isLast && err instanceof HttpErrorResponse && (err.status === 401 || err.status === 404)) {
          log.warn(`Token request attempt ${attempt + 1} returned ${err.status}. Waiting 400ms before retry...`);
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
        log.error(`Authentication failed for ${address}:`, err);
        throw this.handleError(err, 'Failed to authenticate email account');
      }
    }
    throw new Error('Authentication failed after retries');
  }

  /**
   * Validates token and fetches account details.
   */
  async getMe(token: string): Promise<MailAccount> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const response = await firstValueFrom(
        this.http.get<any>(`${getApiBase()}/me`, { headers })
      );
      log.debug(`Validated account identity: ${response.address}`);
      return {
        id: response.id,
        address: response.address,
        token,
        createdAt: response.createdAt,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24hr default session
      };
    } catch (err) {
      log.warn('Account session token expired or invalid');
      throw this.handleError(err, 'Account session expired or invalid');
    }
  }

  /**
   * Lists incoming messages in the account inbox.
   */
  async getMessages(token: string, page: number = 1): Promise<{ messages: MessageSummary[]; totalItems: number }> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const response = await firstValueFrom(
        this.http.get<any>(
          `${getApiBase()}/messages?page=${page}`,
          { headers }
        )
      );
      const list: MessageSummary[] = Array.isArray(response)
        ? response
        : (response && response['hydra:member'] ? response['hydra:member'] : []);
      const total = response && typeof response['hydra:totalItems'] === 'number'
        ? response['hydra:totalItems']
        : list.length;
      log.debug(`Fetched ${list.length} messages (page=${page}, totalItems=${total})`);
      return {
        messages: list,
        totalItems: total
      };
    } catch (err) {
      throw this.handleError(err, 'Failed to check inbox messages');
    }
  }

  /**
   * Fetches full email contents, text, HTML, and attachments for a specific message.
   */
  async getMessage(token: string, messageId: string): Promise<MessageDetail> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const response = await firstValueFrom(
        this.http.get<MessageDetail>(`${getApiBase()}/messages/${messageId}`, { headers })
      );
      return response;
    } catch (err) {
      throw this.handleError(err, 'Failed to load email content');
    }
  }

  /**
   * Marks a message as seen/read.
   */
  async markAsSeen(token: string, messageId: string): Promise<void> {
    try {
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/merge-patch+json'
      });
      await firstValueFrom(
        this.http.patch(`${getApiBase()}/messages/${messageId}`, { seen: true }, { headers })
      );
    } catch (err) {
      // Non-fatal if marking seen fails
      console.warn('Could not mark message as seen:', err);
    }
  }

  /**
   * Fetches the binary blob of an attachment or raw message (.eml) using authenticated Bearer token.
   */
  async getAttachmentBlob(token: string, downloadUrl: string): Promise<Blob> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      const fullUrl = downloadUrl.startsWith('http')
        ? downloadUrl
        : `${getApiBase()}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
      return await firstValueFrom(
        this.http.get(fullUrl, { headers, responseType: 'blob' })
      );
    } catch (err) {
      throw this.handleError(err, 'Failed to fetch attachment file');
    }
  }

  /**
   * Deletes a specific message.
   */
  async deleteMessage(token: string, messageId: string): Promise<void> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      await firstValueFrom(
        this.http.delete(`${getApiBase()}/messages/${messageId}`, { headers })
      );
    } catch (err) {
      throw this.handleError(err, 'Failed to delete message');
    }
  }

  /**
   * Deletes the entire account on server.
   */
  async deleteAccount(token: string, accountId: string): Promise<void> {
    try {
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      await firstValueFrom(
        this.http.delete(`${getApiBase()}/accounts/${accountId}`, { headers })
      );
    } catch (err) {
      throw this.handleError(err, 'Failed to delete account on server');
    }
  }

  private handleError(err: any, fallbackMessage: string): Error {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429) {
        return new Error('Rate limit reached (max 30 requests/min). Pausing refresh for a moment.');
      }
      if (err.status === 401) {
        if (err.url && err.url.includes('/token')) {
          return new Error('Authentication failed: Invalid credentials or account pending.');
        }
        return new Error('Account session expired. Please generate a new temporary address.');
      }
      if (err.status === 404) {
        return new Error('Requested resource or message not found.');
      }
      if (err.status === 422) {
        const hydraDesc = err.error?.['hydra:description'];
        const violation = err.error?.violations?.[0]?.message;
        const detail = err.error?.detail;
        const msg = violation || hydraDesc || detail || err.error?.message;
        if (msg && msg.toLowerCase().includes('already used')) {
          return new Error('This email address is already in use. Please choose a different username.');
        }
        return new Error(msg || 'Invalid email address or domain.');
      }
      if (err.error?.message) {
        return new Error(err.error.message);
      }
    }
    return new Error(fallbackMessage);
  }
}

