import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ToolKnowledgeHub } from '../models/tool-knowledge.model';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  setTitle(pageTitle: string): void {
    this.title.setTitle(pageTitle);
  }

  setToolKnowledgeSeo(hub: ToolKnowledgeHub, toolName: string, categoryName: string): void {
    const pageTitle = `${toolName} - Features, Privacy, Technical Details & Resources | Acklet`;
    const description = hub.overview;
    const url = `https://acklet.io/tools/${hub.toolId}`;

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });

    this.injectStructuredData(hub, toolName, categoryName, url);
  }

  private injectStructuredData(hub: ToolKnowledgeHub, name: string, category: string, url: string): void {
    const existingScript = this.document.getElementById('jsonld-schema');
    if (existingScript) existingScript.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': name,
      'description': hub.overview,
      'applicationCategory': category,
      'operatingSystem': 'Web, Windows, macOS, Linux',
      'url': url,
      'offers': {
        '@type': 'Offer',
        'price': '0.00',
        'priceCurrency': 'USD'
      }
    };

    const script = this.document.createElement('script');
    script.id = 'jsonld-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }
}
