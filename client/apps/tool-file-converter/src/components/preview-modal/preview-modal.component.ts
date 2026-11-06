// apps/tool-file-converter/src/components/preview-modal/preview-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ConversionJob } from '../../models/converter.models';

@Component({
  selector: 'app-preview-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="preview-backdrop"
      (click)="close.emit()"
      (keydown.escape)="close.emit()"
      tabindex="-1"
    >
      <div class="preview-dialog" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="dialog-header">
          <div class="dialog-title-cluster">
            <h3 class="dialog-title">Preview: {{ job().resultFileName || job().file.name }}</h3>
            <span class="dialog-format-tag font-mono">{{ (job().resultFileName || job().file.name).split('.').pop()?.toUpperCase() }}</span>
          </div>

          <div class="header-actions">
            @if (job().status === 'completed') {
              <button
                type="button"
                class="download-pill-btn btn-accent-chip"
                (click)="download.emit(job().id)"
              >
                <ts-icon name="download" [size]="14" />
                <span>Download</span>
              </button>
            }
            <button
              type="button"
              class="close-btn"
              (click)="close.emit()"
              title="Close preview (Esc)"
              aria-label="Close"
            >
              <ts-icon name="x" [size]="18" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="dialog-body">
          @if (isImage()) {
            <div class="image-preview-container">
              <img [src]="previewImageSource()" [alt]="job().file.name" class="full-preview-image" />
            </div>
          } @else if (textContent()) {
            <div class="text-preview-container font-mono">
              <pre>{{ textContent() }}</pre>
            </div>
          } @else {
            <div class="empty-preview">
              <ts-icon name="file" [size]="32" />
              <span>Preview not available for this format.</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .preview-dialog {
      width: 100%;
      max-width: 840px;
      max-height: 85vh;
      background: var(--ts-surface-raised, #141416);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: var(--ts-radius-card, 20px);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .preview-dialog,
    [data-theme="light"] .preview-dialog {
      background: #FFFFFF;
      border-color: #CBD5E1;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .dialog-header,
    [data-theme="light"] .dialog-header {
      border-bottom-color: #F1F5F9;
    }

    .dialog-title-cluster {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #FFFFFF);
      margin: 0;
    }

    :host-context([data-theme="light"]) .dialog-title,
    [data-theme="light"] .dialog-title {
      color: #0F172A;
    }

    .dialog-format-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 5px;
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--accent, #3B82F6);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .download-pill-btn {
      height: 32px;
      padding: 0 12px;
      border-radius: 8px;
      background: #10B981 !important;
      border: 1px solid #10B981 !important;
      color: #FFFFFF !important;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .download-pill-btn:hover {
      background: #059669 !important;
      border-color: #047857 !important;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-muted, #94A3B8);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text, #FFFFFF);
    }

    :host-context([data-theme="light"]) .close-btn:hover,
    [data-theme="light"] .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .dialog-body {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .dialog-body,
    [data-theme="light"] .dialog-body {
      background: #F8FAFC;
    }

    .image-preview-container {
      display: flex;
      align-items: center;
      justify-content: center;
      max-height: 65vh;
      width: 100%;
    }

    .full-preview-image {
      max-width: 100%;
      max-height: 65vh;
      border-radius: 10px;
      object-fit: contain;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }

    .text-preview-container {
      width: 100%;
      max-height: 60vh;
      overflow-y: auto;
      background: var(--ts-surface-inset, #0D0E11);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      padding: 16px;
      font-size: 12px;
      color: #E2E8F0;
      line-height: 1.6;
    }

    :host-context([data-theme="light"]) .text-preview-container,
    [data-theme="light"] .text-preview-container {
      background: #FFFFFF;
      border-color: #E2E8F0;
      color: #1E293B;
    }

    .text-preview-container pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .empty-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: var(--text-muted, #64748B);
      font-size: 13px;
    }
  `]
})
export class PreviewModalComponent implements OnInit {
  readonly job = input.required<ConversionJob>();
  readonly close = output<void>();
  readonly download = output<string>();

  readonly textContent = signal<string>('');

  async ngOnInit(): Promise<void> {
    const j = this.job();
    const cat = j.detectedFormat.category;
    if (cat === 'subtitle' || cat === 'contact' || j.detectedFormat.format === 'svg') {
      const targetBlob = j.resultBlob || j.file;
      try {
        const text = await targetBlob.text();
        this.textContent.set(text);
      } catch (_) {}
    }
  }

  isImage(): boolean {
    const j = this.job();
    const cat = j.detectedFormat.category;
    return (cat === 'image' || cat === 'graphics' || cat === 'modern-image') && j.detectedFormat.format !== 'svg';
  }

  previewImageSource(): string {
    const j = this.job();
    return j.resultUrl || j.previewUrl || '';
  }
}

