// apps/tool-urlshortener/src/app/app.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';

describe('URL Shortener Tool Shell & Manifest Integrity', () => {
  const manifest: ToolRegistryItem = TOOL_REGISTRY['urlshortener'];

  it('should have a registered urlshortener tool manifest', () => {
    expect(manifest).toBeDefined();
    expect(manifest.slug).toBe('urlshortener');
    expect(manifest.name).toBe('URL Shortener');
    expect(manifest.category).toBe('Links/Web');
    expect(manifest.accent).toBe('amber');
    expect(manifest.icon).toBe('link');
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
