// apps/tool-image-compressor/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { ImageCompressorComponent } from '../image-compressor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, ImageCompressorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell
      [tool]="manifest"
      [config]="shellConfig"
    >
      <app-image-compressor-tool #compressorComp />
    </ts-shell>
  `
})
export class AppComponent {
  private readonly titleService = inject(Title);
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['image-compressor'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  readonly compressorComp = viewChild<ImageCompressorComponent>('compressorComp');

  constructor() {
    this.titleService.setTitle('Image Compressor | Acklet');
  }
}

