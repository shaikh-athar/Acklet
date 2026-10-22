// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEnvironmentInjector, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { InputPanelComponent } from './input-panel.component';
import { QRGeneratorService } from '../../services/qr-generator.service';
import { QrDynamicService } from '../../services/qr-dynamic.service';

describe('InputPanelComponent', () => {
  let component: InputPanelComponent;
  let qrService: QRGeneratorService;
  let dynamicService: QrDynamicService;

  beforeEach(() => {
    qrService = new QRGeneratorService();
    dynamicService = new QrDynamicService({} as any);

    const rootInjector = {
      get: (token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);

    runInInjectionContext(envInjector, () => {
      component = new InputPanelComponent(qrService, dynamicService);
    });
  });

  describe('Bug 1 Fix: Synchronized Payload Retrieval on Type Switch', () => {
    it('returns valid URL payload when type is url', () => {
      component.websiteData = { url: 'https://custom.example.com' };
      const payload = component.getPayloadForType('url');
      expect(payload).toBe('https://custom.example.com');
    });

    it('returns formatted WIFI payload when switching to wifi', () => {
      component.wifiData = {
        ssid: 'OfficeNet',
        password: 'secretpassword',
        encryption: 'WPA',
        hidden: false
      };

      const payload = component.getPayloadForType('wifi');
      expect(payload).toBe('WIFI:S:OfficeNet;T:WPA;P:secretpassword;;');
    });

    it('returns formatted vCard payload when switching to vcard', () => {
      component.vcardData = {
        firstName: 'Ada',
        lastName: 'Lovelace',
        company: 'Analytical Engine',
        phone: '+14155550100',
        email: 'ada@example.com'
      };

      const payload = component.getPayloadForType('vcard');
      expect(payload).toContain('BEGIN:VCARD');
      expect(payload).toContain('FN:Ada Lovelace');
      expect(payload).toContain('TEL;TYPE=CELL:+14155550100');
      expect(payload).toContain('END:VCARD');
    });

    it('returns formatted mailto payload when switching to email', () => {
      component.emailData = {
        to: 'support@acklet.com',
        subject: 'Help',
        body: 'Need assistance'
      };

      const payload = component.getPayloadForType('email');
      expect(payload).toBe('mailto:support@acklet.com?subject=Help&body=Need%20assistance');
    });

    it('returns example payload when loading example for wifi', () => {
      const example = component.loadExampleForType('wifi');
      expect(example).toContain('WIFI:S:');
      expect(component.wifiData.ssid).toBe('Acklet-HQ');
      expect(component.wifiData.password).toBe('security2026');
    });

    it('restores raw wifi string into individual wifi form fields', () => {
      component.restorePayload('wifi', 'WIFI:S:MyCafe;T:WPA;P:coffee123;H:true;;');
      expect(component.wifiData.ssid).toBe('MyCafe');
      expect(component.wifiData.password).toBe('coffee123');
    });

    it('identifies URLs missing https:// protocol and fixes them', () => {
      component.websiteData = { url: 'mycompany.org/landing' };
      expect(component.canFixUrl()).toBe(true);

      component.fixUrlProtocol();
      expect(component.websiteData.url).toBe('https://mycompany.org/landing');
      expect(component.canFixUrl()).toBe(false);
    });

    it('defaults capacityUsedPercent to 0', () => {
      expect(component.capacityUsedPercent()).toBe(0);
    });
  });
});
