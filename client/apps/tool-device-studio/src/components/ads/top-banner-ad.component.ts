// apps/tool-device-studio/src/components/ads/top-banner-ad.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceAdSlotComponent } from './ad-slot.component';

@Component({
  selector: 'app-device-top-banner-ad',
  standalone: true,
  imports: [CommonModule, DeviceAdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-device-ad-slot placement="top-banner" />`
})
export class DeviceTopBannerAdComponent {}

