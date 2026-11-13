// apps/tool-color-studio/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { ColorStudioStateService } from '../services/color-studio-state.service';
import { routeToModule } from '../services/color-state.service';
import { ColorStudioTab } from '../models/color.models';
import { ColorStudioComponent } from '../components/color-studio.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, ColorStudioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell 
      [tool]="manifest" 
      [config]="shellConfig"
      [subTool]="currentSubTool()"
      [parentToolUrl]="'/colorstudio'"
      [activeTab]="activeTab()"
      (tabChange)="onTabChange($event)"
    >
      <app-color-studio 
        [externalActiveTab]="activeTab()"
        (activeTabChange)="onToolTabChange($event)"
      />
    </ts-shell>
  `
})
export class AppComponent {
  private state: ColorStudioStateService | null = (() => {
    try {
      return inject(ColorStudioStateService);
    } catch {
      return null;
    }
  })();

  public readonly manifest: ToolRegistryItem = TOOL_REGISTRY['colorstudio'];
  public readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false,
    showTopbar: true,
    showSidebar: true
  };

  private readonly localTab = signal<string>(
    typeof window !== 'undefined' && window.location?.pathname
      ? routeToModule(window.location.pathname)
      : 'picker'
  );
  public readonly activeTab = computed(() => this.state ? this.state.activeTab() : this.localTab());

  public readonly currentSubTool = computed<string | null>(() => {
    switch (this.activeTab()) {
      case 'picker': return 'Color Picker';
      case 'extractor': return 'Image Extractor';
      case 'gradient': return 'Gradient Generator';
      case 'contrast': return 'Contrast Checker';
      case 'palette': return 'Palette Generator';
      case 'simulator': return 'Vision Simulator';
      default: return null;
    }
  });

  public onTabChange(tabId: string): void {
    this.localTab.set(tabId);
    if (this.state && this.isKnownTab(tabId)) {
      this.state.setActiveTab(tabId as ColorStudioTab);
    }
  }

  public onToolTabChange(tabId: string): void {
    this.localTab.set(tabId);
    if (this.state && this.isKnownTab(tabId)) {
      this.state.setActiveTab(tabId as ColorStudioTab);
    }
  }

  private isKnownTab(tab: string): boolean {
    return ['landing', 'picker', 'extractor', 'gradient', 'contrast', 'palette', 'simulator'].includes(tab);
  }
}
