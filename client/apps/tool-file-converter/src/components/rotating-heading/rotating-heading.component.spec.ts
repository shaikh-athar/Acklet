// @vitest-environment jsdom
// apps/tool-file-converter/src/components/rotating-heading/rotating-heading.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { RotatingHeadingComponent } from './rotating-heading.component';
import { FILE_CONVERTER_HERO_LINES, IMAGE_CONVERTER_HERO_LINES } from '../../config/converter-hero-lines.config';

describe('RotatingHeadingComponent Unit Tests', () => {
  function createComponent(lines?: any[]): RotatingHeadingComponent {
    const rootInjector = {
      get: (_token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    return runInInjectionContext(envInjector, () => {
      const comp = new RotatingHeadingComponent();
      if (lines) {
        (comp as any).lines = () => lines;
      }
      return comp;
    });
  }

  it('should initialize with default lines and first index', () => {
    const comp = createComponent();
    expect(comp.linesList().length).toBeGreaterThan(0);
    expect(comp.currentIndex()).toBe(0);
    expect(comp.previousIndex()).toBeNull();
  });

  it('should compute segments correctly for highlighted lines', () => {
    const comp = createComponent([
      { text: 'Got photos that are too heavy?', highlight: 'too heavy?' }
    ]);
    const segments = comp.currentSegments();
    expect(segments.highlight).toBe('too heavy?');
    expect(segments.before.trim()).toBe('Got photos that are');
  });

  it('should compute longest line text for sizing without layout jump', () => {
    const comp = createComponent([
      { text: 'Short' },
      { text: 'This is the very longest headline in the list' }
    ]);
    expect(comp.longestLineText()).toBe('This is the very longest headline in the list');
  });

  it('should support FILE_CONVERTER_HERO_LINES', () => {
    const comp = createComponent(FILE_CONVERTER_HERO_LINES);
    expect(comp.linesList().length).toBe(FILE_CONVERTER_HERO_LINES.length);
    expect(comp.currentLine().text).toContain('convert today?');
  });

  it('should support IMAGE_CONVERTER_HERO_LINES', () => {
    const comp = createComponent(IMAGE_CONVERTER_HERO_LINES);
    expect(comp.linesList().length).toBe(IMAGE_CONVERTER_HERO_LINES.length);
    expect(comp.currentLine().text).toContain('convert today?');
  });
});

