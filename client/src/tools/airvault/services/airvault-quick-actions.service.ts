import { Injectable, inject } from '@angular/core';
import { AirVaultClipboardService, ContentActionShortcut } from './airvault-clipboard.service';
import { AirVaultUIStore } from './airvault-ui.store';

@Injectable({
  providedIn: 'root'
})
export class AirVaultQuickActionsService {
  private clipboard = inject(AirVaultClipboardService);
  private uiStore = inject(AirVaultUIStore);

  /**
   * 1. URL: Open in new browser tab securely
   */
  openLink(url?: string): void {
    if (!url) return;
    const normalized = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('ftp://')
      ? url
      : `https://${url}`;
    window.open(normalized, '_blank', 'noopener,noreferrer');
    this.uiStore.triggerToast('Opened link in new tab');
  }

  /**
   * 2. URL: Web Share API fallback to clipboard
   */
  async shareUrl(url?: string, title?: string): Promise<void> {
    if (!url) return;
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || 'Shared via AirVault',
          url: normalized
        });
        this.uiStore.triggerToast('Link shared');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    await this.copyText(normalized, 'Link copied to clipboard');
  }

  /**
   * 3. Phone: Native tel: call protocol
   */
  callPhone(phone?: string): void {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    window.open(`tel:${cleanNumber}`, '_self');
    this.uiStore.triggerToast(`Calling ${cleanNumber}`);
  }

  /**
   * 4. Phone: Native sms: protocol
   */
  messagePhone(phone?: string): void {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    window.open(`sms:${cleanNumber}`, '_self');
    this.uiStore.triggerToast(`Composing message to ${cleanNumber}`);
  }

  /**
   * 5. Phone: Generate and download a standard vCard (.vcf)
   */
  addToContacts(phone?: string, name?: string, country?: string): void {
    if (!phone) return;
    const contactName = name || `Contact ${phone}`;
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contactName}`,
      `TEL;TYPE=CELL,VOICE:${phone}`,
      country ? `NOTE:Detected Region: ${country}` : '',
      'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contactName.replace(/[^a-zA-Z0-9_-]/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.uiStore.triggerToast('Downloaded vCard contact file');
  }

  /**
   * 6. Address: Open in Google Maps Search
   */
  openInMaps(address?: string): void {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank', 'noopener,noreferrer');
    this.uiStore.triggerToast('Opened address in Google Maps');
  }

  /**
   * 7. Address: Open Turn-by-Turn Directions in Maps
   */
  openDirections(address?: string): void {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank', 'noopener,noreferrer');
    this.uiStore.triggerToast('Opened directions in Google Maps');
  }


  /**
   * Generic Copy Helper reusing AirVaultClipboardService writeText logic
   */
  async copyText(text?: string, successMessage: string = 'Copied to clipboard'): Promise<boolean> {
    if (!text) return false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.uiStore.triggerToast(successMessage);
      return true;
    } catch (err) {
      console.warn('[AirVault Quick Actions] Copy failed:', err);
      this.uiStore.triggerToast('Failed to copy');
      return false;
    }
  }
}
