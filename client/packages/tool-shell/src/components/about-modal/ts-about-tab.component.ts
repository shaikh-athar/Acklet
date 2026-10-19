// packages/tool-shell/src/components/about-modal/ts-about-tab.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolRegistryItem } from '@acklet/tool-registry';
import { TsIconComponent } from '../icon/ts-icon.component';

@Component({
  selector: 'ts-about-tab',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div class="ts-about-container">
      <div class="ts-about-content">
        <!-- Overview -->
        <section class="ts-about-section">
          <h2 class="ts-about-heading">About {{ tool().name }}</h2>
          <p class="ts-about-text">{{ tool().description || tool().shortDescription }}</p>
        </section>

        <!-- Features -->
        @if (tool().features && tool().features!.length > 0) {
          <section class="ts-about-section">
            <h3 class="ts-about-subheading">Key Features</h3>
            <ul class="ts-feature-list">
              @for (feat of tool().features; track feat) {
                <li class="ts-feature-item">
                  <ts-icon name="check" [size]="14" class="ts-feature-check" />
                  <span>{{ feat }}</span>
                </li>
              }
            </ul>
          </section>
        }

        <!-- How It Works -->
        @if (tool().howItWorks && tool().howItWorks!.length > 0) {
          <section class="ts-about-section">
            <h3 class="ts-about-subheading">How It Works</h3>
            <ol class="ts-steps-list">
              @for (step of tool().howItWorks; track step; let idx = $index) {
                <li class="ts-step-item">
                  <span class="ts-step-number">{{ idx + 1 }}</span>
                  <span class="ts-step-text">{{ step }}</span>
                </li>
              }
            </ol>
          </section>
        }

        <!-- FAQs -->
        @if (tool().faqs && tool().faqs!.length > 0) {
          <section class="ts-about-section">
            <h3 class="ts-about-subheading">Frequently Asked Questions</h3>
            <div class="ts-faqs-grid">
              @for (faq of tool().faqs; track faq.question) {
                <div class="ts-faq-card">
                  <h4 class="ts-faq-q">{{ faq.question }}</h4>
                  <p class="ts-faq-a">{{ faq.answer }}</p>
                </div>
              }
            </div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .ts-about-container {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: var(--ts-space-6, 24px) var(--ts-space-4, 16px);
      display: flex;
      justify-content: center;
    }
    .ts-about-content {
      max-width: 680px;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-6, 24px);
      animation: tsFadeInUp var(--ts-dur-base) var(--ts-ease) both;
    }
    .ts-about-section {
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-2, 8px);
    }
    .ts-about-heading {
      font-size: var(--ts-text-lg, 20px);
      font-weight: 700;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
    }
    .ts-about-subheading {
      font-size: var(--ts-text-md, 16px);
      font-weight: 600;
      color: var(--ts-text);
      letter-spacing: var(--ts-tracking-tight);
      margin-bottom: 4px;
    }
    .ts-about-text {
      font-size: var(--ts-text-sm, 13px);
      color: var(--ts-text-muted);
      line-height: 1.65;
      white-space: pre-line;
    }
    .ts-feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .ts-feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: var(--ts-text-sm, 13px);
      color: var(--ts-text-muted);
    }
    .ts-feature-check {
      color: var(--ts-accent);
    }
    .ts-steps-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ts-step-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: var(--ts-text-sm, 13px);
      color: var(--ts-text-muted);
      line-height: 1.5;
    }
    .ts-step-number {
      width: 20px;
      height: 20px;
      border-radius: var(--ts-radius-full);
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--ts-text);
      flex-shrink: 0;
      margin-top: 1px;
    }
    .ts-faqs-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ts-faq-card {
      padding: 12px 16px;
      background: var(--ts-raised);
      border: 1px solid var(--ts-border);
      border-radius: var(--ts-radius-md, 12px);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ts-faq-q {
      font-size: var(--ts-text-sm, 13px);
      font-weight: 600;
      color: var(--ts-text);
    }
    .ts-faq-a {
      font-size: var(--ts-text-xs, 12px);
      color: var(--ts-text-muted);
      line-height: 1.55;
    }
  `]
})
export class TsAboutTabComponent {
  readonly tool = input.required<ToolRegistryItem>();
}
