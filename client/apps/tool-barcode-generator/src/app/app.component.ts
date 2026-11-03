// apps/tool-barcode-generator/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { BarcodeGeneratorComponent } from '../components/barcode-generator.component';
import { FormatRegistryService } from '../services/format-registry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, BarcodeGeneratorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell [tool]="manifest" [config]="shellConfig">
      <app-barcode-generator />
    </ts-shell>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['barcode'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  private titleService = inject(Title);
  private metaService = inject(Meta);
  private formatRegistry = inject(FormatRegistryService);

  ngOnInit(): void {
    this.updateSeoMetadata();
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', this.onPopState);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopState);
    }
  }

  private onPopState = () => {
    this.updateSeoMetadata();
  };

  private updateSeoMetadata(): void {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];

    const item = slug ? this.formatRegistry.getFormat(slug) : null;
    if (item && item.enabled) {
      this.titleService.setTitle(`${item.label} Barcode Generator — Acklet`);
      this.metaService.updateTag({
        name: 'description',
        content: `${item.label} barcode generator. ${item.description}. Generate, customize, and export vector SVG, PNG, and PDF barcodes in browser memory.`
      });
      this.injectStructuredData(item);
    } else {
      this.titleService.setTitle('Barcode Generator — Acklet');
      this.metaService.updateTag({
        name: 'description',
        content: 'Generate standard 1D and 2D barcodes locally in your browser. Calculate check digits, customize dimensions and colors, and export PNG, SVG, or PDF.'
      });
    }
  }

  private injectStructuredData(item: any): void {
    if (typeof document === 'undefined') return;
    let scriptEl = document.getElementById('jsonld-faq') as HTMLScriptElement;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'jsonld-faq';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const faqs = item.usePageContent?.faqs || [];
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map((f: any) => ({
        '@type': 'Question',
        'name': f.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': f.answer
        }
      }))
    };

    scriptEl.textContent = JSON.stringify(schema);
  }
}
