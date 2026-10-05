// client/src/app/pages/tool-detail/tool-detail.ts
import { Component, inject, OnInit, signal, Type } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TOOL_REGISTRY, TOOL_COMPONENTS, ToolManifest } from '../../core/tool-registry';
import { ToolShellComponent } from '../../layout/tool-shell/tool-shell.component';
import { NotFoundComponent } from '../not-found/not-found';
import { getToolSlugFromHostname } from '../../core/utils/subdomain.util';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ToolShellComponent, NotFoundComponent],
  template: `
    @if (manifest()) {
      <app-tool-shell [config]="manifest()!">
        @if (toolComponent()) {
          <ng-container *ngComponentOutlet="toolComponent()!" />
        } @else {
          <div class="tool-placeholder-canvas">
            <div class="canvas-message">
              <h3>{{ manifest()!.name }}</h3>
              <p>Tool interface initialized. Ready for implementation.</p>
            </div>
          </div>
        }
      </app-tool-shell>
    } @else if (notFound()) {
      <app-not-found />
    } @else {
      <div class="tool-loading-spinner">
        <div class="spinner"></div>
      </div>
    }
  `,
  styles: [`
    .tool-placeholder-canvas {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: 3rem;
      text-align: center;
    }
    .canvas-message h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-neutral-100, #f4f4f5);
      margin-bottom: 0.5rem;
    }
    .canvas-message p {
      font-size: 0.95rem;
      color: var(--color-neutral-400, #a1a1aa);
    }
    .tool-loading-spinner {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: #818cf8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ToolDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly manifest = signal<ToolManifest | null>(null);
  readonly toolComponent = signal<Type<any> | null>(null);
  readonly notFound = signal<boolean>(false);

  ngOnInit(): void {
    // 1. First check if accessed via subdomain (<slug>.acklet.com or <slug>.localhost)
    const hostnameSlug = getToolSlugFromHostname();

    this.route.paramMap.subscribe(params => {
      const routeSlug = params.get('id') || params.get('slug');
      const slug = hostnameSlug || routeSlug;

      if (!slug) {
        this.notFound.set(true);
        return;
      }

      this.loadTool(slug);
    });
  }

  private loadTool(slug: string): void {
    const item = TOOL_REGISTRY[slug];
    if (!item) {
      this.notFound.set(true);
      return;
    }

    this.manifest.set(item);

    // If dynamic component registered, load it
    const loader = TOOL_COMPONENTS[slug];
    if (loader) {
      loader().then(cmp => this.toolComponent.set(cmp)).catch(() => this.toolComponent.set(null));
    }
  }
}
