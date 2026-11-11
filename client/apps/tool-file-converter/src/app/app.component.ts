// apps/tool-file-converter/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { FileConverterComponent as ImageConverterToolComponent } from '../file-converter.component';
import { FileConverterComponent as DocumentConverterToolComponent } from '../converter.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ToolLayoutComponent,
    ImageConverterToolComponent,
    DocumentConverterToolComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell [tool]="manifest" [config]="shellConfig">
      @if (isImageConverter) {
        <app-file-converter-tool #converterComp />
      } @else {
        <app-file-converter />
      }
    </ts-shell>
  `
})
export class AppComponent {
  get isImageConverter(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const queryTool = new URLSearchParams(window.location.search).get('tool')?.toLowerCase();
    return (
      hostname.startsWith('image-converter') ||
      hostname.startsWith('img-converter') ||
      pathname.includes('/image-converter') ||
      pathname.includes('/img-converter') ||
      queryTool === 'image-converter' ||
      queryTool === 'img-converter'
    );
  }

  get manifest(): ToolRegistryItem {
    return this.isImageConverter
      ? (TOOL_REGISTRY['image-converter'] || TOOL_REGISTRY['file-converter'])
      : (TOOL_REGISTRY['file-converter'] || TOOL_REGISTRY['converter']);
  }

  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  readonly converterComp = viewChild<ImageConverterToolComponent>('converterComp');
}

export const ImageConverterAppComponent = AppComponent;
export const FileConverterAppComponent = AppComponent;
