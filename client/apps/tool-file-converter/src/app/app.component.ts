// apps/tool-file-converter/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { FileConverterComponent } from '../file-converter.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, FileConverterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell 
      [tool]="manifest" 
      [config]="shellConfig"
    >
      <app-file-converter-tool #converterComp />
    </ts-shell>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = this.resolveManifest();
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  readonly converterComp = viewChild<FileConverterComponent>('converterComp');

  private resolveManifest(): ToolRegistryItem {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (host.includes('image-converter') || path.startsWith('/tools/image-converter') || path === '/image-converter') {
        return TOOL_REGISTRY['image-converter'] || TOOL_REGISTRY['file-converter'];
      }
    }
    return TOOL_REGISTRY['file-converter'];
  }
}

