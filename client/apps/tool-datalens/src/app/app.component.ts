// apps/tool-datalens/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
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
    >
      <app-json-lens 
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

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  onToolTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }
}
