// apps/tool-barcode-generator/src/services/export.service.ts
import { Injectable, inject } from '@angular/core';
import { BarcodeDesignOptions } from '../models/barcode.models';
import { BarcodeExportService } from './barcode-export.service';

export interface IExportService {
  getFilename(name: string, format: string, ext: 'png' | 'svg' | 'pdf'): string;
  downloadSvg(svgContent: string, name: string, format: string): void;
  downloadPng(svgContent: string, name: string, format: string, design: BarcodeDesignOptions): Promise<void>;
  downloadPdf(svgContent: string, name: string, format: string, design: BarcodeDesignOptions): Promise<void>;
  copyImageToClipboard(svgContent: string, design: BarcodeDesignOptions): Promise<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class ExportService implements IExportService {
  private baseExport = inject(BarcodeExportService);

  getFilename(name: string, format: string, ext: 'png' | 'svg' | 'pdf'): string {
    return this.baseExport.getFilename(name, format, ext);
  }

  downloadSvg(svgContent: string, name: string, format: string): void {
    this.baseExport.downloadSvg(svgContent, name, format);
  }

  downloadPng(svgContent: string, name: string, format: string, design: BarcodeDesignOptions): Promise<void> {
    return this.baseExport.downloadPng(svgContent, name, format, design);
  }

  downloadPdf(svgContent: string, name: string, format: string, design: BarcodeDesignOptions): Promise<void> {
    return this.baseExport.downloadPdf(svgContent, name, format, design);
  }

  copyImageToClipboard(svgContent: string, design: BarcodeDesignOptions): Promise<boolean> {
    return this.baseExport.copyImageToClipboard(svgContent, design);
  }
}
