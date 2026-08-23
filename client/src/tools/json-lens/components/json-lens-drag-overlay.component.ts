import { Component, ChangeDetectionStrategy, input, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-drag-overlay',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (isDragging()) {
      <div class="workspace-drag-overlay">
        <div class="drag-drop-card">
          <app-icon name="file-up" class="icon-lg drag-icon"></app-icon>
          <div class="drag-drop-title">Drop JSON file to open</div>
          <div class="drag-drop-subtitle">Release file or text payload anywhere in the workspace</div>
        </div>
      </div>
    }
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensDragOverlayComponent {
  isDragging = signal<boolean>(false);

  @HostListener('window:dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  @HostListener('window:dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.clientX === 0 && event.clientY === 0) {
      this.isDragging.set(false);
    }
  }

  @HostListener('window:drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }
}
