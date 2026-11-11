// apps/tool-datalens/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { JsonLensComponent } from '../data-lens.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, JsonLensComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell 
      [tool]="manifest" 
      [config]="shellConfig"
      [activeTab]="activeTab()"
      (tabChange)="onTabChange($event)"
      (filesDropped)="onFilesDropped($event)"
    >
      <app-json-lens 
        #lensComp
        [externalActiveTab]="activeTab()"
        (activeTabChange)="onToolTabChange($event)"
      />
    </ts-shell>
  `
})
export class AppComponent {
  readonly manifest: ToolRegistryItem = TOOL_REGISTRY['datalens'];
  readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false
  };

  readonly activeTab = signal<string>('format');
  readonly lensComp = viewChild<JsonLensComponent>('lensComp');

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onToolTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onFilesDropped(files: File[]): void {
    if (files.length > 0 && this.lensComp()) {
      this.lensComp()!.handleFileObject(files[0]);
    }
  }
}
