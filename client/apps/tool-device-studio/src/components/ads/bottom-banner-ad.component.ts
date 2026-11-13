// apps/tool-device-studio/src/components/ads/bottom-banner-ad.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceAdSlotComponent } from './ad-slot.component';

@Component({
  selector: 'app-device-bottom-banner-ad',
  standalone: true,
  imports: [CommonModule, DeviceAdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-device-ad-slot placement="bottom-banner" />`
})
export class DeviceBottomBannerAdComponent {}

