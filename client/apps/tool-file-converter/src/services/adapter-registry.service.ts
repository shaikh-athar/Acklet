// apps/tool-file-converter/src/services/adapter-registry.service.ts
import { Injectable, inject } from '@angular/core';
import { IConversionAdapter } from './adapter.interface';
import { ImageConversionAdapter } from './adapters/image-conversion.adapter';
import { SubtitleConversionAdapter } from './adapters/subtitle-conversion.adapter';
import { ContactConversionAdapter } from './adapters/contact-conversion.adapter';
import { FormatDescriptor } from '../models/converter.models';

function safeInject<T>(token: any): T | null {
  try {
    return inject(token, { optional: true });
  } catch (_) {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdapterRegistryService {
  private readonly adapters: IConversionAdapter[];

  constructor(
    imageAdapter?: ImageConversionAdapter,
    subtitleAdapter?: SubtitleConversionAdapter,
    contactAdapter?: ContactConversionAdapter
  ) {
    const img = imageAdapter || safeInject(ImageConversionAdapter) || new ImageConversionAdapter();
    const sub = subtitleAdapter || safeInject(SubtitleConversionAdapter) || new SubtitleConversionAdapter();
    const cnt = contactAdapter || safeInject(ContactConversionAdapter) || new ContactConversionAdapter();

    this.adapters = [img, sub, cnt];
  }

  /**
   * Registers a new custom adapter into the active pipeline.
   */
  registerAdapter(adapter: IConversionAdapter): void {
    if (!this.adapters.some(a => a.id === adapter.id)) {
      this.adapters.push(adapter);
    }
  }

  /**
   * Finds the appropriate adapter that can handle conversion between sourceFormat and targetFormat.
   */
  getAdapter(sourceFormat: string, targetFormat: string): IConversionAdapter | null {
    const src = sourceFormat.toLowerCase();
    const tgt = targetFormat.toLowerCase();
    for (const adapter of this.adapters) {
      if (adapter.canConvert(src, tgt)) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * Returns all active, tested output format descriptors for the specified source format.
   * Only returns formats that have a functional adapter ready.
   */
  getAvailableOutputs(sourceFormat: string): FormatDescriptor[] {
    const src = sourceFormat.toLowerCase();
    const outputs: FormatDescriptor[] = [];
    const seen = new Set<string>();

    for (const adapter of this.adapters) {
      const adapterOutputs = adapter.getSupportedOutputs(src);
      for (const out of adapterOutputs) {
        if (!seen.has(out.format)) {
          seen.add(out.format);
          outputs.push(out);
        }
      }
    }

    return outputs;
  }

  /**
   * Returns true if there is at least one active output format available for the source format.
   */
  isFormatSupported(sourceFormat: string): boolean {
    return this.getAvailableOutputs(sourceFormat).length > 0;
  }
}
