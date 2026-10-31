// apps/tool-urlshortener/src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { UrlShortenerComponent } from '../components/url-shortener.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, UrlShortenerComponent],
  template: `
    <ts-shell [tool]="manifest" [config]="shellConfig">
      <app-url-shortener-tool />
    </ts-shell>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['urlshortener'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };
}
