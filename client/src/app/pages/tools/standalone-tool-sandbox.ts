// src/app/pages/tools/standalone-tool-sandbox.ts
import { Component, inject, OnInit, signal, Type } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TOOL_COMPONENTS, TOOL_REGISTRY } from '../../core/tool-registry';
import { SeoService } from '../../core/services/seo.service';
import { IconComponent } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-standalone-tool-sandbox',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="standalone-sandbox-container">
      @if (loadError()) {
        <div class="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-8 text-center gap-4">
          <app-icon name="shield-alert" class="size-12 text-rose-500" />
          <h1 class="text-2xl font-bold">Tool Sandbox Not Available</h1>
          <p class="text-neutral-400 max-w-md">{{ loadError() }}</p>
          <a routerLink="/tools/explore" class="btn btn-primary mt-4">Explore Acklet Tools</a>
        </div>
      } @else if (dynamicComponent()) {
        <ng-container *ngComponentOutlet="dynamicComponent()" />
      } @else {
        <div class="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-neutral-400 gap-3">
          <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sm font-medium">Launching secure standalone sandbox environment...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .standalone-sandbox-container {
      width: 100vw;
      min-height: 100vh;
      background-color: var(--color-surface-950, #09090b);
      color: var(--color-neutral-100, #f4f4f5);
      margin: 0;
      padding: 0;
    }
  `]
})
export class StandaloneToolSandboxComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly seoSvc = inject(SeoService);

  readonly dynamicComponent = signal<Type<any> | null>(null);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const slug = params['id'];
      if (!slug) {
        this.loadError.set('No tool identifier specified.');
        return;
      }

      const normSlug = slug.toLowerCase().trim();
      const loader = TOOL_COMPONENTS[normSlug];

      if (!loader) {
        // Check fallback mappings
        if (normSlug === 'json-lens' || normSlug === 'json-formatter' || normSlug === 'json-validator') {
          TOOL_COMPONENTS['json-formatter']().then(comp => {
            this.dynamicComponent.set(comp);
            this.seoSvc.setTitle('JSON Formatter & Validator — Standalone Sandbox — Acklet');
          }).catch(err => {
            this.loadError.set('Failed to load JSON Formatter component: ' + err.message);
          });
          return;
        }

        this.loadError.set(`No standalone application component registered for '${slug}'.`);
        return;
      }

      const manifest = TOOL_REGISTRY[normSlug];
      if (manifest) {
        this.seoSvc.setTitle(`${manifest.name} — Standalone Sandbox — Acklet`);
      }

      loader()
        .then(comp => {
          this.dynamicComponent.set(comp);
        })
        .catch(err => {
          this.loadError.set(`Error loading sandbox application module: ${err.message}`);
        });
    });
  }
}
