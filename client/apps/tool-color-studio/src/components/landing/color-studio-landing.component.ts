// apps/tool-color-studio/src/components/landing/color-studio-landing.component.ts
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { ColorStudioTab } from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';

interface UtilityModuleCard {
  id: ColorStudioTab;
  route: string;
  title: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-color-studio-landing',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-page-container">
      
      <!-- Minimal Page Heading -->
      <header class="landing-header">
        <h1 class="landing-title">Color Studio</h1>
        <p class="landing-description">Everything you need to choose, create and test colors.</p>
      </header>

      <!-- Six Module Cards Grid -->
      <div class="modules-grid" role="list" aria-label="Color Studio Tools">
        @for (card of modules; track card.id) {
          <div 
            class="module-card"
            (click)="navigateToModule(card.id, card.route)"
            role="listitem"
            tabindex="0"
            (keydown.enter)="navigateToModule(card.id, card.route)"
          >
            <div class="card-icon-box">
              <ts-icon [name]="card.icon" [size]="20" />
            </div>

            <div class="card-content">
              <h2 class="card-title">{{ card.title }}</h2>
              <p class="card-desc">{{ card.description }}</p>
            </div>

            <div class="card-action">
              <span class="action-text">Open {{ card.title }}</span>
              <ts-icon name="arrow-right" [size]="14" class="action-icon" />
            </div>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .landing-page-container {
      width: 100%;
      box-sizing: border-box;
      padding-top: 8px;
    }

    /* Minimal Page Heading */
    .landing-header {
      margin-bottom: 32px;
      text-align: left;
    }

    .landing-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--text, var(--text-primary, #0F172A));
      letter-spacing: -0.02em;
      margin: 0 0 6px;
      line-height: 1.25;
    }

    .landing-description {
      font-size: 15px;
      color: var(--text-2, var(--text-secondary, #64748B));
      margin: 0;
      line-height: 1.5;
    }

    /* Six Module Cards Grid */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
    }

    @media (max-width: 1024px) {
      .modules-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .modules-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }
    }

    /* Module Card */
    .module-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 24px;
      background: var(--surface, var(--bg-1, #FFFFFF));
      border: 1px solid var(--border, var(--border-color, #E2E8F0));
      border-radius: 14px;
      cursor: pointer;
      transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
      box-sizing: border-box;
      outline: none;
    }

    .module-card:hover,
    .module-card:focus-visible {
      border-color: var(--tool-accent, #2563EB);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
    }

    [data-theme="dark"] .module-card:hover,
    [data-theme="dark"] .module-card:focus-visible {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    /* Card Icon */
    .card-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--surface-secondary, var(--bg-2, #F1F5F9));
      color: var(--tool-accent, #2563EB);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      transition: background 0.16s ease, color 0.16s ease;
    }

    .module-card:hover .card-icon-box {
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    /* Card Content */
    .card-content {
      flex: 1;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 17px;
      font-weight: 600;
      color: var(--text, var(--text-primary, #0F172A));
      margin: 0 0 6px;
      letter-spacing: -0.01em;
    }

    .card-desc {
      font-size: 13.5px;
      color: var(--text-2, var(--text-secondary, #64748B));
      margin: 0;
      line-height: 1.45;
    }

    /* Card Action Link */
    .card-action {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--tool-accent, #2563EB);
      margin-top: auto;
    }

    .action-icon {
      transition: transform 0.16s ease;
    }

    .module-card:hover .action-icon {
      transform: translateX(3px);
    }
  `]
})
export class ColorStudioLandingComponent {
  private router = inject(Router);
  private state = inject(ColorStudioStateService);

  public readonly modules: UtilityModuleCard[] = [
    {
      id: 'picker',
      route: 'color-picker',
      title: 'Color Picker',
      icon: 'pipette',
      description: 'Choose a color and adjust its brightness and transparency.'
    },
    {
      id: 'extractor',
      route: 'image-extractor',
      title: 'Image Extractor',
      icon: 'image',
      description: 'Upload an image to extract its main colors.'
    },
    {
      id: 'gradient',
      route: 'gradient-generator',
      title: 'Gradient Generator',
      icon: 'layers',
      description: 'Create linear, radial, and conic CSS gradients.'
    },
    {
      id: 'contrast',
      route: 'contrast-checker',
      title: 'Contrast Checker',
      icon: 'check-circle',
      description: 'Check color contrast and evaluate WCAG accessibility compliance.'
    },
    {
      id: 'palette',
      route: 'palette-generator',
      title: 'Palette Generator',
      icon: 'sliders',
      description: 'Generate color palettes using color wheel harmony rules.'
    },
    {
      id: 'simulator',
      route: 'vision-simulator',
      title: 'Vision Simulator',
      icon: 'eye',
      description: 'Simulate color vision deficiencies on images and palettes.'
    }
  ];

  public navigateToModule(id: ColorStudioTab, route: string): void {
    this.state.setActiveModule(id);
    let target = `/colorstudio/${route}`;
    if (this.router.url.includes('/tools/colorstudio') || this.router.url.includes('/tools/color-studio')) {
      target = `/tools/colorstudio/${route}`;
    }
    this.router.navigateByUrl(target).catch(() => {
      this.router.navigate([route]);
    });
  }
}
