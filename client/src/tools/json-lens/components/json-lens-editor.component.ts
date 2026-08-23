import { Component, ChangeDetectionStrategy, input, output, ElementRef, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonLensResult } from '../services/json-lens.service';
import { IconComponent } from '../../../app/shared/components/icon/icon';

@Component({
  selector: 'app-json-lens-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div
      class="panel input-panel"
      [class.drag-over]="isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <!-- Navbar Row 2: Sub-Header Control Bar -->
      <div class="panel-header">
        <div class="panel-header-left">
          <span class="panel-label">INPUT</span>
          <span class="panel-sublabel">JSON</span>
        </div>
        <div class="panel-header-right">
          <div class="status-indicator">
            @if (result(); as res) {
              @if (res.success) {
                <span class="status-valid-badge">✓ Valid JSON</span>
              } @else {
                <span class="status-invalid-badge">× Invalid JSON</span>
              }
            } @else {
              <span class="status-neutral-badge">Auto Validate ●</span>
            }
          </div>
          <button class="panel-btn" (click)="clearClick.emit()">Clear</button>
        </div>
      </div>

      <!-- Drag & Drop Active Overlay -->
      @if (isDragging()) {
        <div class="drag-drop-overlay">
          <app-icon name="file-code" class="icon-lg opacity-80"></app-icon>
          <div class="drag-overlay-title">Drop JSON File Here</div>
          <div class="drag-overlay-subtitle">Release to automatically parse & format payload</div>
        </div>
      }

      <!-- Monaco-Style Code Window -->
      <div class="code-editor-container">
        <pre class="line-numbers-gutter"><code>{{ lineNumbers() }}</code></pre>

        @if (!rawInput() || rawInput().trim() === '') {
          <div class="empty-state-container">
            <div class="empty-icon">
              <app-icon name="file-code" class="icon-lg"></app-icon>
            </div>
            <div class="empty-title">Drop JSON here, paste payload, or load a sample</div>
            
            <div class="empty-sample-pills">
              <button class="sample-pill" (click)="sampleClick.emit('apiResponse')">API Response</button>
              <button class="sample-pill" (click)="sampleClick.emit('nestedObject')">Nested Object</button>
              <button class="sample-pill" (click)="sampleClick.emit('largeArray')">Large Array</button>
              <button class="sample-pill" (click)="sampleClick.emit('config')">Configuration</button>
            </div>
          </div>
        }

        <textarea
          #editorTextarea
          class="code-editor-textarea"
          [class.wrap]="wordWrap()"
          [value]="rawInput()"
          (input)="inputChange.emit($any($event.target).value)"
          placeholder="Paste raw JSON here..."
          spellcheck="false"
        ></textarea>
      </div>
    </div>
  `,
  styleUrls: ['../json-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JsonLensEditorComponent {
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;

  rawInput = input<string>('');
  wordWrap = input<boolean>(true);
  result = input<JsonLensResult | null>(null);
  errorLine = input<number | null>(null);

  inputChange = output<string>();
  clearClick = output<void>();
  sampleClick = output<'apiResponse' | 'nestedObject' | 'largeArray' | 'config'>();
  fileDropped = output<File>();

  isDragging = signal<boolean>(false);

  readonly lineNumbers = computed(() => {
    const lines = this.rawInput().split('\n').length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('\n');
  });

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      this.fileDropped.emit(file);
    }
  }

  focusAndSelectPos(pos: number) {
    if (this.editorTextarea) {
      const textarea = this.editorTextarea.nativeElement;
      textarea.focus();
      textarea.setSelectionRange(pos, pos + 1);
    }
  }
}
