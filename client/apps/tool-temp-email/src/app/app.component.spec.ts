// apps/tool-temp-email/src/app/app.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';

describe('Temporary Email Tool Shell & Manifest Integrity', () => {
  const manifest: ToolRegistryItem = TOOL_REGISTRY['temp-email'];

  it('should have a registered temp-email tool manifest in TOOL_REGISTRY', () => {
    expect(manifest).toBeDefined();
    expect(manifest.id).toBe('temp-email');
    expect(manifest.slug).toBe('temp-email');
    expect(manifest.name).toBe('Temporary Email');
    expect(manifest.accent).toBe('blue');
    expect(manifest.icon).toBe('mail');
  });

  it('should have required metadata, descriptions, and FAQs defined', () => {
    expect(manifest.shortDescription).toBeTruthy();
    expect(manifest.description).toBeTruthy();
    expect(manifest.features).toBeDefined();
    expect(manifest.features!.length).toBeGreaterThan(0);
    expect(manifest.howTo).toBeDefined();
    expect(manifest.howTo!.length).toBeGreaterThan(0);
    expect(manifest.faqs).toBeDefined();
    expect(manifest.faqs!.length).toBeGreaterThan(0);
  });
});
