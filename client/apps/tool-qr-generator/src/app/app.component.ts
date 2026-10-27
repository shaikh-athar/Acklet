// client/apps/tool-qr-generator/src/app/app.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { QRGeneratorComponent } from '../qr-generator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, QRGeneratorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell [tool]="manifest" [config]="shellConfig">
      <app-qr-generator />
    </ts-shell>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['qr'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };
}
