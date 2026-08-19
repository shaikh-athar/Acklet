import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-json-lens-seo-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="json-lens-seo-footer">
      <div class="seo-container">
        <div class="seo-column">
          <h2 class="seo-heading">JSON Formatter & Validator</h2>
          <p class="seo-paragraph">
            Format, validate, minify and inspect JSON directly in your browser. Engineered for developers working with API responses, configuration payloads, and complex data structures.
          </p>
        </div>

        <div class="seo-column">
          <h3 class="seo-heading">Why JSONLens?</h3>
          <ul class="seo-features-list">
            <li>⚡ Instant formatting & minification</li>
            <li>📍 Precise line & column validation errors</li>
            <li>🌲 Interactive recursive tree inspection</li>
            <li>📊 Detailed 12-metric JSON intelligence stats</li>
            <li>💻 TypeScript, Python, and Go code generation</li>
            <li>🔄 Seamless JSON to YAML, XML, and CSV conversion</li>
            <li>🔒 100% Client-side local processing guarantee</li>
            <li>🚀 Zero signup or account required</li>
          </ul>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensSeoFooterComponent {}
