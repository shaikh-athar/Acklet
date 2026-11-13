// apps/tool-color-studio/src/components/ads/top-banner-ad.component.ts
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdSlotComponent } from './ad-slot.component';

@Component({
  selector: 'app-top-banner-ad',
  standalone: true,
  imports: [CommonModule, AdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ad-slot placement="top-banner" />
  `
})
export class TopBannerAdComponent {}

