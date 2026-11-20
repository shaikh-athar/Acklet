// apps/tool-file-converter/src/routes.ts
import { Routes } from '@angular/router';
import { FileConverterComponent } from './file-converter.component';

export const converterRoutes: Routes = [
  { path: '', component: FileConverterComponent, title: 'File Converter | Acklet' },
  { path: '**', redirectTo: '' }
];
