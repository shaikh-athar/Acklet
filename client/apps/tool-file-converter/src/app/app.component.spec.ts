// apps/tool-file-converter/src/app/app.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';

describe('Image Converter Tool Shell & Manifest Integrity', () => {
  const manifest: ToolRegistryItem = TOOL_REGISTRY['image-converter'];

  it('should have a registered image-converter tool manifest in TOOL_REGISTRY', () => {
    expect(manifest).toBeDefined();
    expect(manifest.id).toBe('image-converter');
    expect(manifest.slug).toBe('image-converter');
    expect(manifest.name).toBe('Image Converter');
    expect(manifest.accent).toBe('indigo');
    expect(manifest.icon).toBe('images');
  });

  it('should be registered under image-converter, converter, file-converter, and img-converter aliases', () => {
    expect(TOOL_REGISTRY['image-converter']).toBe(manifest);
    expect(TOOL_REGISTRY['converter']).toBe(manifest);
    expect(TOOL_REGISTRY['file-converter']).toBe(manifest);
    expect(TOOL_REGISTRY['img-converter']).toBe(manifest);
  });

  it('should have required metadata, descriptions, highlights, and FAQs defined', () => {
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
