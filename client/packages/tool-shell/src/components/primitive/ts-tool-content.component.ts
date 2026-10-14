// packages/tool-shell/src/components/primitive/ts-tool-content.component.ts
import { Component, input, computed, ElementRef, inject, OnInit, OnDestroy, effect, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ToolRegistryItem, getAllTools, ToolFaq } from '@acklet/tool-registry';
import { getToolUrl } from '@acklet/shared';
import { HlmBadgeImports } from '../../helm/badge';
import { HlmItemImports } from '../../helm/item';
import { TsIconComponent } from '../icon/ts-icon.component';
import { TsFaqComponent } from './ts-faq.component';
import { TsRevealDirective } from '../../directives/ts-reveal.directive';

@Component({
  selector: 'ts-tool-content',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HlmBadgeImports,
    HlmItemImports,
    TsIconComponent,
    TsFaqComponent,
    TsRevealDirective
  ],
  template: `
    @if (tool(); as currentTool) {
      <div class="ts-tool-content-root">

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 1. About Section                                      -->
        <!-- ══════════════════════════════════════════════════════ -->
        @if (aboutParagraphs().length > 0 || (currentTool.features && currentTool.features.length > 0)) {
          <div class="ts-section-divider" role="separator"></div>
          <section 
            id="about" 
            class="ts-content-section" 
            [attr.aria-label]="'About ' + currentTool.name"
          >
            <div class="ts-section-header" appReveal [revealDelay]="0">
              <h2 class="ts-section-title">About {{ currentTool.name }}</h2>
            </div>

            @if (aboutParagraphs().length > 0) {
              <div class="ts-about-text-body" appReveal [revealDelay]="60">
                @for (paragraph of aboutParagraphs(); track paragraph) {
                  <p class="ts-about-paragraph">{{ paragraph }}</p>
                }
              </div>
            }

            @if (currentTool.features && currentTool.features.length > 0) {
              <div class="ts-feature-chips-wrap" aria-label="Key features">
                @for (feature of currentTool.features; track feature; let fIdx = $index) {
                  <span 
                    hlmBadge 
                    appReveal 
                    [revealVariant]="'pop'"
                    [revealDelay]="fIdx * 45"
                    variant="secondary" 
                    class="ts-feature-chip"
                  >
                    <ts-icon name="check" [size]="12" class="ts-chip-icon" />
                    <span>{{ feature }}</span>
                  </span>
                }
              </div>
            }
          </section>
        }

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 2. How to use Section                                 -->
        <!-- ══════════════════════════════════════════════════════ -->
        @if (howToSteps().length > 0) {
          <div class="ts-section-divider" role="separator"></div>
          <section 
            id="how-to-use" 
            class="ts-content-section" 
            aria-label="How to use this tool"
          >
            <div class="ts-section-header" appReveal [revealDelay]="0">
              <h2 class="ts-section-title">How to use</h2>
              <span class="ts-section-subtitle">Follow these quick steps to get started immediately.</span>
            </div>

            <div class="ts-steps-list" role="list">
              @for (step of howToSteps(); track step; let idx = $index) {
                <div 
                  appReveal 
                  [revealVariant]="'slide-left'"
                  [revealDelay]="idx * 85"
                  class="ts-step-item-card" 
                  role="listitem"
                >
                  <div class="ts-step-media">
                    <div class="ts-step-number-tile" aria-hidden="true">
                      <span>{{ formatStepIndex(idx + 1) }}</span>
                    </div>
                  </div>
                  <div class="ts-step-content">
                    <p class="ts-step-text">{{ step }}</p>
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 3. FAQ Section                                        -->
        <!-- ══════════════════════════════════════════════════════ -->
        @if (currentTool.faqs && currentTool.faqs.length > 0) {
          <div class="ts-section-divider" role="separator"></div>
          <section 
            id="faq" 
            class="ts-content-section" 
            aria-label="Frequently Asked Questions"
          >
            <ts-faq 
              [faqs]="currentTool.faqs" 
              title="Frequently Asked Questions" 
              [multiple]="false"
            />
          </section>
        }

        <!-- ══════════════════════════════════════════════════════ -->
        <!-- 4. Related Tools Section                              -->
        <!-- ══════════════════════════════════════════════════════ -->
        @if (relatedTools().length > 0) {
          <div class="ts-section-divider" role="separator"></div>
          <section 
            id="related" 
            class="ts-content-section" 
            aria-label="Related tools"
          >
            <div class="ts-section-header" appReveal [revealDelay]="0">
              <h2 class="ts-section-title">Related tools</h2>
              <span class="ts-section-subtitle">Discover more utilities in the Acklet ecosystem.</span>
            </div>

            <div class="ts-related-grid" role="list">
              @for (relTool of relatedTools(); track relTool.slug; let idx = $index) {
                <a 
                  [href]="getToolSubdomainUrl(relTool.slug)" 
                  class="ts-related-link-wrapper"
                  role="listitem"
                  [attr.aria-label]="relTool.name"
                  appReveal
                  [revealVariant]="'fade-up'"
                  [revealDelay]="idx * 45"
                >
                  <hlm-item variant="outline" class="ts-related-item-card">
                    <hlm-item-media>
                      <ts-icon [name]="relTool.icon" [size]="24" class="ts-related-icon" />
                    </hlm-item-media>
                    <hlm-item-content>
                      <span class="ts-related-title">{{ relTool.name }}</span>
                      <p class="ts-related-desc">{{ relTool.shortDescription }}</p>
                    </hlm-item-content>
                    <hlm-item-actions>
                      <div class="ts-related-arrow-btn" aria-hidden="true">
                        <ts-icon name="arrow-up-right" [size]="16" />
                      </div>
                    </hlm-item-actions>
                  </hlm-item>
                </a>
              }
            </div>
          </section>
        }

      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .ts-tool-content-root {
      display: flex;
      flex-direction: column;
      gap: 32px;
      width: 100%;
      user-select: text;
    }

    /* ── Hairline Section Divider ────────────────────────────────── */
    .ts-section-divider {
      width: 100%;
      height: 1px;
      background: var(--border, rgba(0, 0, 0, 0.06));
      border: none;
      margin: 8px 0;
      flex-shrink: 0;
    }

    :host-context([data-theme="dark"]) .ts-section-divider {
      background: var(--border, #27272A);
    }

    /* ── Content Section Layout: uses ts-reveal system ─────────── */
    .ts-content-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      scroll-margin-top: 24px;
      border-radius: var(--ts-radius-inner, 16px);
      padding: 4px 8px;
      margin: -4px -8px;
    }

    .ts-section-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ts-section-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: var(--ts-type-section-title-size, 18px);
      line-height: var(--ts-type-section-title-lh, 26px);
      font-weight: var(--ts-type-section-title-weight, 650);
      letter-spacing: var(--ts-type-title-tracking, -0.01em);
      color: var(--text, #09090B);
      margin: 0;
    }

    .ts-section-subtitle {
      font-size: 13.5px;
      color: var(--text-2, #52525B);
      line-height: 1.5;
    }

    /* ── 1. About Section ────────────────────────────────────────── */
    .ts-about-text-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 76ch;
    }

    .ts-about-paragraph {
      font-size: 14.5px;
      color: var(--text-2, #52525B);
      line-height: 1.68;
      margin: 0;
    }

    .ts-feature-chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .ts-feature-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: var(--ts-radius-full, 9999px);
      font-size: 12.5px;
      font-weight: 600;
      background: var(--ts-surface-inset, #F6F7F7);
      border: 1px solid var(--ts-surface-inset-border, rgba(15, 23, 42, 0.05));
      color: var(--text, #09090B);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
      transition: opacity 0.5s ease,
                  transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1),
                  background-color 150ms ease,
                  border-color 150ms ease;
      transition-delay: var(--reveal-delay, 0ms);
    }

    :host-context([data-theme="dark"]) .ts-feature-chip {
      background: var(--ts-surface-inset, #27272A);
      border-color: var(--ts-surface-inset-border, #3F3F46);
      color: var(--text, #FCFCFC);
    }

    .ts-feature-chip:hover {
      border-color: var(--accent-border, rgba(45, 212, 191, 0.4));
      background: var(--accent-soft, rgba(45, 212, 191, 0.08));
    }

    .ts-chip-icon {
      color: var(--text-3, #6B7280);
      flex-shrink: 0;
    }

    /* ── 2. How to Use Section ───────────────────────────────────── */
    .ts-steps-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .ts-step-item-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--ts-surface-raised-border, rgba(15, 23, 42, 0.06));
      border-radius: var(--ts-radius-inner, 16px);
      box-shadow: var(--ts-surface-raised-shadow);
      padding: 14px 18px;
      transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                  background-color 150ms ease,
                  border-color 150ms ease,
                  box-shadow 200ms ease;
      transition-delay: var(--reveal-delay, 0ms);
    }

    :host-context([data-theme="dark"]) .ts-step-item-card {
      background: var(--ts-surface-raised, #18181B);
      border-color: var(--ts-surface-raised-border, #27272A);
    }

    .ts-step-media {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .ts-step-content {
      flex: 1;
      min-width: 0;
    }

    .ts-step-number-tile {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--ts-radius-control, 12px);
      background: var(--ts-surface-inset, #F6F7F7);
      border: 1px solid var(--ts-surface-inset-border, rgba(15, 23, 42, 0.05));
      color: var(--text, #09090B);
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 13px;
      font-weight: 800;
      flex-shrink: 0;
      transform: scale(0.8);
      opacity: 0.8;
      transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.4s ease,
                  background-color 150ms ease,
                  border-color 150ms ease,
                  color 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-step-number-tile {
      background: var(--ts-surface-inset, #27272A);
      border-color: var(--ts-surface-inset-border, #3F3F46);
      color: var(--text, #FCFCFC);
    }

    .ts-step-item-card.is-visible .ts-step-number-tile {
      transform: scale(1);
      opacity: 1;
      transition-delay: calc(var(--reveal-delay, 0ms) + 120ms);
    }

    .ts-step-item-card:hover {
      transform: translateY(-2px);
      border-color: var(--accent-border, rgba(45, 212, 191, 0.4));
      box-shadow: 0 10px 24px -4px rgba(0, 0, 0, 0.08);
      transition-delay: 0ms;
    }

    .ts-step-item-card:hover .ts-step-number-tile {
      background: var(--accent-soft, rgba(45, 212, 191, 0.12));
      border-color: var(--accent, #0F766E);
      color: var(--accent-strong, #0F766E);
      transform: scale(1.05);
      transition-delay: 0ms;
    }

    .ts-step-text {
      font-size: 14px;
      color: var(--text, #18181B);
      line-height: 1.55;
      margin: 0;
    }

    :host-context([data-theme="dark"]) .ts-step-text {
      color: var(--text, #FCFCFC);
    }

    /* ── 4. Related Tools Section ────────────────────────────────── */
    .ts-related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 12px;
      width: 100%;
    }

    .ts-related-link-wrapper {
      display: block;
      text-decoration: none;
      color: inherit;
      outline: none;
      border-radius: 16px;
      transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ts-related-link-wrapper:active {
      transform: scale(0.98);
    }

    .ts-related-link-wrapper:focus-visible {
      outline: 2px solid var(--ts-focus-ring, #18181B) !important;
      outline-offset: 2px;
    }

    .ts-related-item-card {
      background: var(--surface, #FFFFFF);
      border: 1px solid var(--border, rgba(0, 0, 0, 0.06));
      border-radius: 16px;
      padding: 14px 16px;
      cursor: pointer;
      transition: background-color 150ms ease,
                  border-color 150ms ease,
                  box-shadow 150ms ease;
    }

    :host-context([data-theme="dark"]) .ts-related-item-card {
      background: #141416;
      border-color: #27272A;
    }

    .ts-related-link-wrapper:hover .ts-related-item-card {
      background: var(--surface-hover, #F8F8FA);
      border-color: rgba(0, 0, 0, 0.12);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }

    :host-context([data-theme="dark"]) .ts-related-link-wrapper:hover .ts-related-item-card {
      background: #1C1C20;
      border-color: #3F3F46;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }

    .ts-related-title {
      font-family: var(--font-heading, "Nunito", sans-serif);
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text, #18181B);
      letter-spacing: -0.01em;
    }

    :host-context([data-theme="dark"]) .ts-related-title {
      color: var(--text, #FCFCFC);
    }

    .ts-related-desc {
      font-size: 12.5px;
      color: var(--text-muted, #71717A);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
    }

    :host-context([data-theme="dark"]) .ts-related-desc {
      color: var(--text-muted, #A1A1AA);
    }

    .ts-related-arrow-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--ts-radius-full, 9999px);
      background: transparent;
      color: var(--text-muted, #71717A);
      transition: transform 150ms ease, color 150ms ease;
    }

    .ts-related-link-wrapper:hover .ts-related-arrow-btn {
      color: var(--text, #18181B);
      transform: translate(2px, -2px);
    }

    :host-context([data-theme="dark"]) .ts-related-link-wrapper:hover .ts-related-arrow-btn {
      color: #FCFCFC;
    }

    /* ── Reduced Motion ─────────────────────────────────────────── */
    @media (prefers-reduced-motion: reduce) {
      .ts-content-section {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
      .ts-related-link-wrapper:active {
        transform: none !important;
      }
    }

    /* ── Container Queries for Main Content Card ───────────────── */
    @container main-card (max-width: 680px) {
      .ts-related-grid {
        grid-template-columns: 1fr;
      }
      .ts-section-title {
        font-size: 18px;
      }
      .ts-about-paragraph {
        font-size: 14px;
      }
    }

    @container main-card (max-width: 440px) {
      .ts-section-title {
        font-size: 17px;
      }
      .ts-step-item-card {
        padding: 12px 14px;
      }
      .ts-related-item-card {
        padding: 12px 14px;
      }
    }

    @media (max-width: 767px) {
      .ts-related-grid {
        grid-template-columns: 1fr;
      }
      .ts-section-title {
        font-size: 18px;
      }
    }
  `]
})
export class TsToolContentComponent implements OnInit, OnDestroy {
  readonly tool = input<ToolRegistryItem | null>(null);

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private observer: IntersectionObserver | null = null;
  private faqScriptEl: HTMLScriptElement | null = null;

  constructor() {
    // Dynamically inject/update FAQPage JSON-LD schema into head
    effect(() => {
      const t = this.tool();
      this.updateFaqSchema(t?.faqs);
    });
  }

  readonly aboutParagraphs = computed<string[]>(() => {
    const desc = this.tool()?.about || this.tool()?.description;
    if (!desc) return [];
    return desc.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
  });

  readonly howToSteps = computed<string[]>(() => {
    const t = this.tool();
    if (!t) return [];
    return (t.howTo && t.howTo.length > 0) ? t.howTo : (t.howItWorks || []);
  });

  readonly relatedTools = computed<ToolRegistryItem[]>(() => {
    const current = this.tool();
    if (!current) return [];

    const all = getAllTools().filter(t => t.slug !== current.slug);

    // Explicitly specified related list first
    if (current.related && current.related.length > 0) {
      const explicit = current.related
        .map(slug => all.find(t => t.slug === slug))
        .filter((t): t is ToolRegistryItem => !!t);
      if (explicit.length >= 3) return explicit.slice(0, 4);
    }

    // Same category first, then other categories
    const sameCat = all.filter(t => t.category.toLowerCase() === current.category.toLowerCase());
    const otherCat = all.filter(t => t.category.toLowerCase() !== current.category.toLowerCase());

    return [...sameCat, ...otherCat].slice(0, 4);
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.removeFaqSchema();
  }

  formatStepIndex(index: number): string {
    return index < 10 ? `0${index}` : `${index}`;
  }

  getToolSubdomainUrl(slug: string): string {
    return getToolUrl(slug);
  }

  private updateFaqSchema(faqs?: ToolFaq[]): void {
    if (typeof document === 'undefined') return;

    this.removeFaqSchema();

    if (!faqs || faqs.length === 0) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'acklet-faqpage-jsonld';
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
    this.faqScriptEl = script;
  }

  private removeFaqSchema(): void {
    if (this.faqScriptEl && this.faqScriptEl.parentNode) {
      this.faqScriptEl.parentNode.removeChild(this.faqScriptEl);
      this.faqScriptEl = null;
    } else if (typeof document !== 'undefined') {
      const existing = this.document.getElementById('acklet-faqpage-jsonld');
      existing?.parentNode?.removeChild(existing);
    }
  }
}
