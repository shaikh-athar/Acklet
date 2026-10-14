// apps/tool-online-clipboard/src/services/qr-loader.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QrLoaderService {
  private qrModulePromise: Promise<typeof import('qrcode')> | null = null;

  async generateDataUrl(text: string, size = 200): Promise<string> {
    if (!this.qrModulePromise) {
      this.qrModulePromise = import('qrcode');
    }
    const qrcode = await this.qrModulePromise;
    return qrcode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  }
}
