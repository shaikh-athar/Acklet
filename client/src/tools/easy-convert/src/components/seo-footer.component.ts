import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-easy-convert-seo-footer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <footer class="ec-seo-section mt-12 border-t border-[var(--border-soft)] pt-8 pb-12 text-xs text-neutral-400">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h4 class="font-bold text-neutral-200 text-sm mb-2">About EasyConvert</h4>
          <p class="leading-relaxed">
            EasyConvert is Acklet's flagship document and image conversion engine. Process files locally in your browser whenever possible without privacy risks or mandatory signups.
          </p>
        </div>

        <div>
          <h4 class="font-bold text-neutral-200 text-sm mb-2">Supported Formats</h4>
          <p class="leading-relaxed">
            Supports PDF, Microsoft Word (DOCX), Excel (XLSX), PowerPoint (PPTX), PNG, JPG, WebP, Plain Text, and Markdown format transformations with binary header verification.
          </p>
        </div>

        <div>
          <h4 class="font-bold text-neutral-200 text-sm mb-2">Related Acklet Ecosystem</h4>
          <div class="flex flex-col gap-2 mt-2">
            <a href="/tools/json-lens" class="ec-eco-link">
              <app-icon name="code" class="size-3.5 mr-1.5 text-ec-primary" />
              <span>Inspecting data? <strong>Try JSONLens</strong></span>
            </a>
            <a href="/tools/mdx-studio" class="ec-eco-link">
              <app-icon name="file-text" class="size-3.5 mr-1.5 text-ec-primary" />
              <span>Editing docs? <strong>Try MDX Studio</strong></span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .ec-eco-link {
      display: flex;
      align-items: center;
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-md, 0.5rem);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-soft, rgba(255,255,255,0.08));
      color: var(--color-neutral-300, #cbd5e1);
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .ec-eco-link:hover {
      background: rgba(33, 150, 243, 0.08);
      border-color: rgba(33, 150, 243, 0.3);
      color: #ffffff;
    }
  `]
})
export class SeoFooterComponent {}
