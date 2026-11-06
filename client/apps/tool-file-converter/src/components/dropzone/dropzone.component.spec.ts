// @vitest-environment jsdom
// apps/tool-file-converter/src/components/dropzone/dropzone.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { DropzoneComponent } from './dropzone.component';

describe('DropzoneComponent Unit Tests', () => {
  function createComponent(): DropzoneComponent {
    const rootInjector = {
      get: (_token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    return runInInjectionContext(envInjector, () => new DropzoneComponent());
  }

  it('should initialize with isDragOver as false', () => {
    const component = createComponent();
    expect(component.isDragOver()).toBe(false);
  });

  it('should set isDragOver to true on dragover', () => {
    const component = createComponent();
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as DragEvent;

    component.onDragOver(event);
    expect(component.isDragOver()).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should set isDragOver to false on dragleave', () => {
    const component = createComponent();
    component.isDragOver.set(true);

    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    } as unknown as DragEvent;

    component.onDragLeave(event);
    expect(component.isDragOver()).toBe(false);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should emit filesDropped and reset isDragOver on drop with valid files', () => {
    const component = createComponent();
    component.isDragOver.set(true);

    let emitted: FileList | File[] | null = null;
    component.filesDropped.subscribe((val) => {
      emitted = val;
    });

    const mockFile = new File(['mock content'], 'sample.png', { type: 'image/png' });
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      dataTransfer: {
        files: [mockFile]
      }
    } as unknown as DragEvent;

    component.onDrop(event);
    expect(component.isDragOver()).toBe(false);
    expect(emitted).toEqual([mockFile]);
  });

  it('should emit filesDropped on file input change and reset input value', () => {
    const component = createComponent();
    let emitted: FileList | File[] | null = null;
    component.filesDropped.subscribe((val) => {
      emitted = val;
    });

    const mockFile = new File(['text'], 'sample.jpg', { type: 'image/jpeg' });
    const mockInput = {
      files: [mockFile],
      value: 'C:\\fakepath\\sample.jpg'
    };

    const event = {
      target: mockInput
    } as unknown as Event;

    component.onFileInputChange(event);
    expect(emitted).toEqual([mockFile]);
    expect(mockInput.value).toBe('');
  });
});
