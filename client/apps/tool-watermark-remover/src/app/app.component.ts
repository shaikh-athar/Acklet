// apps/tool-watermark-remover/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { WatermarkRemoverComponent } from '../watermark-remover.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, WatermarkRemoverComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell 
      [tool]="manifest" 
      [config]="shellConfig"
      [activeTab]="activeTab()"
      (tabChange)="onTabChange($event)"
      (filesDropped)="onFilesDropped($event)"
    >
      <app-watermark-remover #removerComp />
    </ts-shell>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['watermark-remover'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  readonly activeTab = signal<string>('editor');
  readonly removerComp = viewChild<WatermarkRemoverComponent>('removerComp');

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onFilesDropped(files: File[]): void {
    if (files.length > 0 && this.removerComp()) {
      this.removerComp()!.onFileDropped(files[0]);
    }
  }
}

