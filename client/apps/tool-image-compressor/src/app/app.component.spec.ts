// apps/tool-image-compressor/src/app/app.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';

describe('Image Compressor Tool Shell & Manifest Integrity', () => {
  const manifest: ToolRegistryItem = TOOL_REGISTRY['image-compressor'];

  it('should have a registered image-compressor tool manifest in TOOL_REGISTRY', () => {
    expect(manifest).toBeDefined();
    expect(manifest.id).toBe('image-compressor');
    expect(manifest.slug).toBe('image-compressor');
    expect(manifest.name).toBe('Image Compressor');
    expect(manifest.sidebarLabel).toBe('Image Compressor');
    expect(manifest.breadcrumbLabel).toBe('Image Compressor');
    expect(manifest.subdomain).toBe('imagecompressor');
    expect(manifest.category).toBe('Media');
    expect(manifest.accent).toBe('blue');
  });

  it('should register image-compressor aliases in TOOL_REGISTRY', () => {
    expect(TOOL_REGISTRY['image-compressor']).toBe(manifest);
    expect(TOOL_REGISTRY['imagecompressor']).toBe(manifest);
    expect(TOOL_REGISTRY['img-compressor']).toBe(manifest);
  });

  it('should maintain independent identity from Image Converter', () => {
    expect(TOOL_REGISTRY['image-converter']).toBeDefined();
    expect(TOOL_REGISTRY['image-converter'].name).toBe('Image Converter');
    expect(TOOL_REGISTRY['image-compressor'].name).toBe('Image Compressor');
    expect(TOOL_REGISTRY['image-converter'].id).not.toBe(TOOL_REGISTRY['image-compressor'].id);
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

