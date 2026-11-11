// client/apps/tool-file-converter/src/services/privacy-audit.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyAuditService } from './privacy-audit.service';

describe('PrivacyAuditService Unit Tests', () => {
  let service: PrivacyAuditService;

  beforeEach(() => {
    service = new PrivacyAuditService();
  });

  it('should initialize with 0 network requests and auditing disabled', () => {
    expect(service.networkRequestsCount()).toBe(0);
    expect(service.isAuditing()).toBe(false);
    expect(service.isPopoverOpen()).toBe(false);
  });

  it('should filter out in-memory blob: and data: URIs', () => {
    expect(service.shouldCountResource('blob:http://localhost:4200/1234-5678')).toBe(false);
    expect(service.shouldCountResource('blob:null/abcd-efgh')).toBe(false);
    expect(service.shouldCountResource('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==')).toBe(false);
    expect(service.shouldCountResource('about:blank')).toBe(false);
    expect(service.shouldCountResource('javascript:void(0)')).toBe(false);
  });

  it('should detect and count standard HTTP/HTTPS network resources', () => {
    expect(service.shouldCountResource('http://localhost:4200/api/upload')).toBe(true);
    expect(service.shouldCountResource('https://telemetry.example.com/log')).toBe(true);
    expect(service.shouldCountResource('/assets/logo.png', 'http://localhost:4200')).toBe(true);
  });

  it('should reset network request counter when startAudit is called', () => {
    service.networkRequestsCount.set(5);
    service.startAudit();
    expect(service.networkRequestsCount()).toBe(0);
    expect(service.isAuditing()).toBe(true);
  });

  it('should disarm auditing when stopAudit is called', () => {
    service.startAudit();
    expect(service.isAuditing()).toBe(true);
    service.stopAudit();
    expect(service.isAuditing()).toBe(false);
  });

  it('should toggle popover open state', () => {
    expect(service.isPopoverOpen()).toBe(false);
    service.togglePopover();
    expect(service.isPopoverOpen()).toBe(true);
    service.closePopover();
    expect(service.isPopoverOpen()).toBe(false);
  });

  it('should not claim offline capability if neither service worker nor cache storage is found', async () => {
    const isReady = await service.checkOfflineReadiness();
    expect(isReady).toBe(false);
    expect(service.isOfflineReady()).toBe(false);
  });
});

