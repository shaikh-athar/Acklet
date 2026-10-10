// apps/tool-online-clipboard/src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { ClipboardComponent } from '../clipboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, ClipboardComponent],
  template: `
    <lib-tool-layout [tool]="manifest">
      <app-clipboard-tool />
    </lib-tool-layout>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['clipboard'];
}
