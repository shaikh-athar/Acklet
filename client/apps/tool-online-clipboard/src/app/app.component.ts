import { Component, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { ClipboardComponent } from '../clipboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, ClipboardComponent],
  template: `
    <ts-shell 
      [tool]="manifest" 
      [config]="shellConfig"
      (filesDropped)="onFilesDropped($event)"
    >
      <app-clipboard-tool #clipboardComp />
    </ts-shell>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['clipboard'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  readonly clipboardComp = viewChild<ClipboardComponent>('clipboardComp');

  onFilesDropped(files: File[]): void {
    if (files.length > 0 && this.clipboardComp()) {
      this.clipboardComp()!.setTab('files');
      this.clipboardComp()!.processFilesUpload(files);
    }
  }
}
