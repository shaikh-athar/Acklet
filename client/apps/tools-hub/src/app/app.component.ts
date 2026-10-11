// apps/tools-hub/src/app/app.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolLayoutComponent, HubHomeComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ToolLayoutComponent, HubHomeComponent],
  template: `
    <ts-shell [config]="{ showSidebar: false, showPrimaryAction: false, showDescriptionCard: false }">
      <hub-home />
    </ts-shell>
  `
})
export class AppComponent {}
