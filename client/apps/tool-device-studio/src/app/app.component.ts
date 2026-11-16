// apps/tool-device-studio/src/app/app.component.ts
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToolLayoutComponent, ToolShellConfig } from '@acklet/tool-shell';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';
import { DeviceStudioStateService, routeToModule, resetDeviceStudioScroll } from '../services/device-studio-state.service';
import { DeviceStudioTab } from '../models/device.models';
import { DeviceStudioComponent } from '../components/device-studio.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, DeviceStudioComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ts-shell 
      [tool]="manifest" 
      [config]="shellConfig"
      [subTool]="currentSubTool()"
      [parentToolUrl]="'/devicestudio'"
      [activeTab]="activeTab()"
      (tabChange)="onTabChange($event)"
    >
      <app-device-studio 
        [externalActiveTab]="activeTab()"
        (activeTabChange)="onToolTabChange($event)"
      />
    </ts-shell>
  `
})
export class AppComponent implements OnInit {
  private router: Router | null = (() => {
    try {
      return inject(Router);
    } catch {
      return null;
    }
  })();

  private state: DeviceStudioStateService | null = (() => {
    try {
      return inject(DeviceStudioStateService);
    } catch {
      return null;
    }
  })();

  public readonly manifest: ToolRegistryItem = TOOL_REGISTRY['devicestudio'];
  public readonly shellConfig: ToolShellConfig = {
    layout: 'fullBleed',
    showDescriptionCard: false,
    showTopbar: true,
    showSidebar: true
  };

  private readonly localTab = signal<string>(
    typeof window !== 'undefined' && window.location?.pathname
      ? routeToModule(window.location.pathname)
      : 'landing'
  );
  public readonly activeTab = computed(() => this.state ? this.state.activeTab() : this.localTab());

  public readonly currentSubTool = computed<string | null>(() => {
    switch (this.activeTab()) {
      case 'webcam': return 'Webcam Test';
      case 'microphone': return 'Microphone Test';
      case 'speaker': return 'Speaker & Audio';
      case 'speed': return 'Internet Speed';
      case 'ip': return 'Public IP Lookup';
      case 'screen': return 'Screen Sharing';
      default: return null;
    }
  });

  public ngOnInit(): void {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      try {
        history.scrollRestoration = 'manual';
      } catch {
        // ignore
      }
    }
    resetDeviceStudioScroll();

    if (this.router) {
      this.router.events.pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      ).subscribe(() => {
        resetDeviceStudioScroll();
      });
    }
  }

  public onTabChange(tabId: string): void {
    this.localTab.set(tabId);
    if (this.state && this.isKnownTab(tabId)) {
      this.state.setActiveTab(tabId as DeviceStudioTab);
    }
    resetDeviceStudioScroll();
  }

  public onToolTabChange(tabId: string): void {
    this.localTab.set(tabId);
    if (this.state && this.isKnownTab(tabId)) {
      this.state.setActiveTab(tabId as DeviceStudioTab);
    }
    resetDeviceStudioScroll();
  }

  private isKnownTab(tab: string): boolean {
    return ['landing', 'webcam', 'microphone', 'speaker', 'speed', 'ip', 'screen'].includes(tab);
  }
}

