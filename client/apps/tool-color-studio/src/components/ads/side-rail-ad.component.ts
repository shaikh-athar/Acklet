// apps/tool-color-studio/src/components/ads/side-rail-ad.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdSlotComponent } from './ad-slot.component';

@Component({
  selector: 'app-side-rail-ad',
  standalone: true,
  imports: [CommonModule, AdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ad-slot placement="side-rail" />
  `
})
export class SideRailAdComponent {}

