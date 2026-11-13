// apps/tool-device-studio/src/components/ads/side-rail-ad.component.ts
import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceAdSlotComponent } from './ad-slot.component';

@Component({
  selector: 'app-device-side-rail-ad',
  standalone: true,
  imports: [CommonModule, DeviceAdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-device-ad-slot [placement]="side() === 'left' ? 'side-rail-left' : 'side-rail-right'" />`
})
export class DeviceSideRailAdComponent {
  public readonly side = input<'left' | 'right'>('left');
}

