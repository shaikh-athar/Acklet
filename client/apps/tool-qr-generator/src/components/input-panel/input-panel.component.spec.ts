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

    it('defaults capacityUsedPercent to 0 and qrVersion to 1', () => {
      expect(component.capacityUsedPercent()).toBe(0);
      expect(component.qrVersion()).toBe(1);
    });

    it('identifies potential text types and provides dismissible switch nudge', () => {
      // Mock content input as a URL in text mode
      (component as any).selectedType = () => 'text';
      (component as any).content = () => 'https://acklet.com/studio';

      expect(component.textTypeNudge()).toEqual({
        type: 'url',
        targetLabel: 'Website Link',
        message: 'This text looks like a website link. Switch to Website Link for 1-tap browser opening?'
      });

      component.dismissTextNudge();
      expect(component.textTypeNudge()).toBeNull();
    });

    it('switches to target type and transfers content when nudge switch is applied', () => {
      (component as any).selectedType = () => 'text';
      (component as any).content = () => 'support@acklet.com';

      let switchedType: string | null = null;
      component.typeChange.subscribe(t => (switchedType = t));

      component.applyTextTypeSwitch('email');
      expect(component.emailData.to).toBe('support@acklet.com');
      expect(switchedType).toBe('email');
    });

    it('populates full RFC 5545 calendar event when applyEventPreset is called', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));

      component.applyEventPreset();

      expect(component.eventData.title).toBe('Acklet Product Launch');
      expect(component.eventData.startTime).toBe('10:00');
      expect(emittedPayload).toContain('BEGIN:VCALENDAR');
      expect(emittedPayload).toContain('SUMMARY:Acklet Product Launch');
    });

    it('updates phoneData and emits contentChange when valid phone is entered', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));

      component.onPhoneInputValueChange({
        e164: '+14155552671',
        digitsOnly: '14155552671',
        rawNumber: '(415) 555-2671',
        country: 'US',
        isValid: true
      });

      expect(component.phoneData.number).toBe('+14155552671');
      expect(emittedPayload).toBe('tel:+14155552671');
    });

    it('updates smsData and emits contentChange when valid sms phone is entered', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));
      component.smsData.message = 'Hello Acklet';

      component.onSmsPhoneInputValueChange({
        e164: '+14155552671',
        digitsOnly: '14155552671',
        rawNumber: '4155552671',
        country: 'US',
        isValid: true
      });

      expect(component.smsData.phone).toBe('+14155552671');
      expect(emittedPayload).toContain('SMSTO:+14155552671:Hello Acklet');
    });

    it('updates vcardData phone when vcard phone changes', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));
      component.vcardData.firstName = 'Sam';

      component.onVCardPhoneInputValueChange({
        e164: '+442071838750',
        digitsOnly: '442071838750',
        rawNumber: '020 7183 8750',
        country: 'GB',
        isValid: true
      });

      expect(component.vcardData.phone).toBe('+442071838750');
      expect(emittedPayload).toContain('TEL;TYPE=CELL:+442071838750');
    });

    it('updates geoData and emits payload when location input changes', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));

      component.onLocationInputValueChange({
        mode: 'coordinates',
        mapUrl: '',
        latitude: 37.7749,
        longitude: -122.4194,
        label: 'San Francisco',
        provider: 'geo',
        payload: 'geo:37.7749,-122.4194?q=San+Francisco',
        isValid: true
      });

      expect(component.geoData.latitude).toBe(37.7749);
      expect(component.geoData.longitude).toBe(-122.4194);
      expect(component.geoData.label).toBe('San Francisco');
      expect(emittedPayload).toBe('geo:37.7749,-122.4194?q=San+Francisco');
    });

    it('updates socialData and emits canonical URL when social input changes', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));

      component.onSocialInputValueChange({
        platform: 'linkedin',
        handleOrUrl: 'in/alex-mercer',
        canonicalUrl: 'https://linkedin.com/in/alex-mercer',
        isValid: true
      });

      expect(component.socialData.platform).toBe('linkedin');
      expect(component.socialData.handleOrUrl).toBe('in/alex-mercer');
      expect(emittedPayload).toBe('https://linkedin.com/in/alex-mercer');
    });

    it('emits addSocialCenterIcon output when user chooses to embed center icon', () => {
      let emittedEvent: { iconId: string; platformName: string } | null = null;
      component.addSocialCenterIcon.subscribe(e => (emittedEvent = e));

      component.onAddSocialCenterIcon({
        iconId: 'instagram',
        platformName: 'Instagram'
      });

      expect(emittedEvent).toEqual({
        iconId: 'instagram',
        platformName: 'Instagram'
      });
    });

    it('normalizes iOS app store input and flags non-store URLs', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));

      // 1. Bare numeric ID
      component.onIosAppInputChange('123456789');
      expect(component.appData.iosUrl).toBe('https://apps.apple.com/app/id123456789');
      expect(component.appIosError()).toBe('');

      // 2. Non-store domain
      component.onIosAppInputChange('https://google.com/maps');
      expect(component.appIosError()).toContain('not an Apple App Store link');
    });

    it('normalizes Android Play Store input and flags non-store URLs', () => {
      let emittedPayload: string | null = null;
      component.contentChange.subscribe(c => (emittedPayload = c));

      // 1. Bare package name
      component.onAndroidAppInputChange('com.example.acklet');
      expect(component.appData.androidUrl).toBe('https://play.google.com/store/apps/details?id=com.example.acklet');
      expect(component.appAndroidError()).toBe('');

      // 2. Non-store domain
      component.onAndroidAppInputChange('https://github.com/acklet');
      expect(component.appAndroidError()).toContain('not a Google Play Store link');
    });
  });
});

