// apps/tool-image-compressor/src/routes.ts
import { Routes } from '@angular/router';
import { ImageCompressorComponent } from './image-compressor.component';

export const compressorRoutes: Routes = [
  { path: '', component: ImageCompressorComponent, title: 'Image Compressor | Acklet' },
  { path: '**', redirectTo: '' }
];
