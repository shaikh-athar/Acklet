// apps/tool-color-studio/src/app/color-studio.routes.ts
import { Routes } from '@angular/router';

export const COLOR_STUDIO_MODULE_ROUTES: Routes = [
  {
    path: 'color-picker',
    loadComponent: () =>
      import('../components/picker/color-picker-module.component').then(
        m => m.ColorPickerModuleComponent
      ),
    title: 'Color Picker — Acklet Color Studio'
  },
  {
    path: 'image-extractor',
    loadComponent: () =>
      import('../components/extractor/image-extractor-module.component').then(
        m => m.ImageExtractorModuleComponent
      ),
    title: 'Image Extractor — Acklet Color Studio'
  },
  {
    path: 'gradient-generator',
    loadComponent: () =>
      import('../components/gradient/gradient-module.component').then(
        m => m.GradientModuleComponent
      ),
    title: 'Gradient Generator — Acklet Color Studio'
  },
  {
    path: 'contrast-checker',
    loadComponent: () =>
      import('../components/contrast/contrast-module.component').then(
        m => m.ContrastModuleComponent
      ),
    title: 'Contrast Checker — Acklet Color Studio'
  },
  {
    path: 'palette-generator',
    loadComponent: () =>
      import('../components/palette/palette-module.component').then(
        m => m.PaletteModuleComponent
      ),
    title: 'Palette Generator — Acklet Color Studio'
  },
  {
    path: 'vision-simulator',
    loadComponent: () =>
      import('../components/simulator/simulator-module.component').then(
        m => m.SimulatorModuleComponent
      ),
    title: 'Vision Simulator — Acklet Color Studio'
  },
  // Shorthand aliases
  { path: 'picker', redirectTo: 'color-picker', pathMatch: 'full' },
  { path: 'extractor', redirectTo: 'image-extractor', pathMatch: 'full' },
  { path: 'gradient', redirectTo: 'gradient-generator', pathMatch: 'full' },
  { path: 'contrast', redirectTo: 'contrast-checker', pathMatch: 'full' },
  { path: 'palette', redirectTo: 'palette-generator', pathMatch: 'full' },
  { path: 'simulator', redirectTo: 'vision-simulator', pathMatch: 'full' }
];

export const colorStudioRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../components/landing/color-studio-landing.component').then(
        m => m.ColorStudioLandingComponent
      ),
    title: 'Acklet Color Studio — Professional Color Tools'
  },
  {
    path: 'landing',
    redirectTo: '',
    pathMatch: 'full'
  },
  ...COLOR_STUDIO_MODULE_ROUTES,
  // Support /colorstudio and /color-studio prefixes
  {
    path: 'colorstudio',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../components/landing/color-studio-landing.component').then(
            m => m.ColorStudioLandingComponent
          ),
        title: 'Acklet Color Studio — Professional Color Tools'
      },
      ...COLOR_STUDIO_MODULE_ROUTES
    ]
  },
  {
    path: 'color-studio',
    redirectTo: 'colorstudio'
  },
  {
    path: 'tools/colorstudio',
    redirectTo: 'colorstudio'
  },
  {
    path: 'tools/color-studio',
    redirectTo: 'colorstudio'
  },
  // Fallback for invalid routes
  { path: '**', redirectTo: '' }
];
