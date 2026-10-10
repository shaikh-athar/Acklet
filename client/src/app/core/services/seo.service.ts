import { Injectable, inject, DOCUMENT } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ToolManifest } from '../tool-registry';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setToolSeo(manifest: ToolManifest, currentUrl: string): void {
    const pageTitle = manifest.seo?.title || `${manifest.name} — Free Online Tool | Acklet`;
    const description = manifest.seo?.description || manifest.description || manifest.shortDescription;

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: currentUrl });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    if (manifest.seo?.keywords && manifest.seo.keywords.length > 0) {
      this.meta.updateTag({ name: 'keywords', content: manifest.seo.keywords.join(', ') });
    }

    this.updateCanonicalUrl(currentUrl);
    this.injectStructuredData(manifest, currentUrl);
  }

  setPageSeo(title: string, description: string, url?: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    if (url) {
      this.meta.updateTag({ property: 'og:url', content: url });
      this.updateCanonicalUrl(url);
    }
  }

  private updateCanonicalUrl(url: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private injectStructuredData(manifest: ToolManifest, url: string): void {
    const existingScript = this.document.getElementById('acklet-tool-jsonld');
    if (existingScript) existingScript.remove();

    const schemas: any[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': manifest.name,
        'description': manifest.shortDescription || manifest.description,
        'applicationCategory': manifest.category || 'UtilitiesApplication',
        'operatingSystem': 'Web, Windows, macOS, Linux, Android, iOS',
        'url': url,
        'offers': {
          '@type': 'Offer',
          'price': '0.00',
          'priceCurrency': 'USD'
        }
      }
    ];

    // Inject FAQ schema if faqs exist
    if (manifest.faqs && manifest.faqs.length > 0) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': manifest.faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      });
    }

    const script = this.document.createElement('script');
    script.id = 'acklet-tool-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemas);
    this.document.head.appendChild(script);
  }
}
