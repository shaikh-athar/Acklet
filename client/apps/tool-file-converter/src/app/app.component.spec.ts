// apps/tool-file-converter/src/app/app.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';

describe('File Converter Tool Shell & Manifest Integrity', () => {
  const manifest: ToolRegistryItem = TOOL_REGISTRY['file-converter'];

  it('should have a registered file-converter tool manifest in TOOL_REGISTRY', () => {
    expect(manifest).toBeDefined();
    expect(manifest.id).toBe('file-converter');
    expect(manifest.slug).toBe('file-converter');
    expect(manifest.name).toBe('File Converter');
    expect(manifest.sidebarLabel).toBe('File Converter');
    expect(manifest.breadcrumbLabel).toBe('File Converter');
    expect(manifest.subdomain).toBe('file-converter');
    expect(manifest.accent).toBe('indigo');
  });

  it('should register file-converter and image-converter as independent manifests', () => {
    expect(TOOL_REGISTRY['file-converter']).toBe(manifest);
    expect(TOOL_REGISTRY['converter']).toBe(manifest);
    expect(TOOL_REGISTRY['image-converter']).toBeDefined();
    expect(TOOL_REGISTRY['image-converter'].name).toBe('Image Converter');
    expect(TOOL_REGISTRY['image-converter'].id).toBe('image-converter');
    expect(TOOL_REGISTRY['file-converter'].id).toBe('file-converter');
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
