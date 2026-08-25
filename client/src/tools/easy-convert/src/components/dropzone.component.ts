import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-easy-convert-dropzone',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div 
      class="ec-dropzone" 
      [class.dropzone-active]="isDraggingOver()"
      (dragover)="onDragOver($event)" 
      (dragleave)="onDragLeave($event)"
      (drop)="onFileDrop($event)"
      (click)="triggerFileInput()"
      tabindex="0"
      aria-label="Upload files dropzone"
      (keydown.enter)="triggerFileInput()"
    >
      <input 
        #fileInput 
        type="file" 
        multiple 
        class="hidden" 
        (change)="onFileSelected($event)" 
      />

      <div class="ec-dropzone-content">
        <div class="ec-upload-icon-ring">
          <app-icon name="upload-cloud" class="size-10 text-ec-primary" />
        </div>

        <h2 class="ec-drop-title">
          {{ isDraggingOver() ? 'Drop files here to start converting' : 'Drop your file here to convert' }}
        </h2>
        <p class="ec-drop-subtitle">
          or <span class="ec-browse-link">browse from your device</span>
        </p>

        <div class="ec-formats-pills">
          <span class="fmt-badge">PDF</span>
          <span class="fmt-badge">DOCX</span>
          <span class="fmt-badge">XLSX</span>
          <span class="fmt-badge">PPTX</span>
          <span class="fmt-badge">JPG</span>
          <span class="fmt-badge">PNG</span>
          <span class="fmt-badge">WebP</span>
          <span class="fmt-badge">Markdown</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .ec-dropzone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 380px;
      padding: 3rem 2rem;
      background: color-mix(in srgb, var(--ec-primary, #2196F3) 3%, var(--color-surface-900, #121827));
      border: 2px dashed color-mix(in srgb, var(--ec-primary, #2196F3) 35%, var(--border-soft, rgba(255,255,255,0.1)));
      border-radius: var(--radius-2xl, 1.5rem);
      cursor: pointer;
      transition: border-color 0.2s ease, background 0.2s ease;
    }
    .dropzone-active {
      border-color: var(--ec-primary, #2196F3);
      background: color-mix(in srgb, var(--ec-primary, #2196F3) 8%, var(--color-surface-900, #121827));
    }
    .ec-dropzone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1.25rem;
      max-width: 600px;
    }
    .ec-upload-icon-ring {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--ec-primary, #2196F3) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--ec-primary, #2196F3) 30%, transparent);
    }
    .ec-drop-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-neutral-50, #f8fafc);
    }
    .ec-drop-subtitle {
      font-size: 0.95rem;
      color: var(--color-neutral-400, #94a3b8);
    }
    .ec-browse-link {
      color: var(--ec-primary, #2196F3);
      font-weight: 600;
      text-decoration: underline;
    }
    .ec-formats-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .fmt-badge {
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-soft, rgba(255,255,255,0.08));
      color: var(--color-neutral-300, #cbd5e1);
    }
  `]
})
export class DropzoneComponent {
  readonly filesSelected = output<File[]>();
  readonly isDraggingOver = signal(false);

  triggerFileInput(): void {
    const input = document.querySelector('.ec-dropzone input[type="file"]') as HTMLInputElement;
    if (input) input.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  async onFileDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    if (!event.dataTransfer) return;

    const items = event.dataTransfer.items;
    const files: File[] = [];

    if (items && items.length > 0) {
      const entryPromises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            entryPromises.push(this.traverseFileTree(entry, files));
          } else {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
      }
      await Promise.all(entryPromises);
    } else if (event.dataTransfer.files) {
      files.push(...Array.from(event.dataTransfer.files));
    }

    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
  }

  private async traverseFileTree(entry: any, files: File[]): Promise<void> {
    if (entry.isFile) {
      return new Promise<void>((resolve) => {
        entry.file((file: File) => {
          files.push(file);
          resolve();
        }, () => resolve());
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      return new Promise<void>((resolve) => {
        dirReader.readEntries(async (entries: any[]) => {
          const entryPromises = entries.map(child => this.traverseFileTree(child, files));
          await Promise.all(entryPromises);
          resolve();
        }, () => resolve());
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.filesSelected.emit(Array.from(input.files));
    }
  }
}
