// apps/tool-watermark-remover/src/components/export-modal/export-modal.component.ts
import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { ExportFormat, ExportOptions } from '../../models/watermark.models';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop animate-fade-in" (click)="close.emit()" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
      <div class="modal-card" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-group">
            <ts-icon name="download" [size]="20" class="header-icon" />
            <h3 id="export-modal-title" class="modal-title">Export Cleaned Image</h3>
          </div>
          <button type="button" class="btn-close" (click)="close.emit()" aria-label="Close dialog">
            <ts-icon name="x" [size]="18" />
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          
          <!-- Dimensions & Estimated Size Preview -->
          <div class="spec-row">
            <span class="spec-label">Resolution</span>
            <span class="spec-value">{{ imageWidth() }} × {{ imageHeight() }} px (100% original)</span>
          </div>

          <div class="spec-row">
            <span class="spec-label">Estimated File Size</span>
            <span class="spec-value">{{ formattedEstimatedSize() }}</span>
          </div>

          <!-- Transparency Notice (Phase 5) -->
          @if (hasAlpha()) {
            <div class="transparency-notice">
              <ts-icon name="info" [size]="14" />
              <span>Transparent alpha channel detected. PNG or WebP recommended to preserve transparency.</span>
            </div>
            @if (selectedFormat() === 'jpg') {
              <div class="warning-notice">
                <ts-icon name="alert-triangle" [size]="14" />
                <span>JPEG does not support alpha channels; transparent background will be exported as solid white.</span>
              </div>
            }
          }

          <!-- Format Selection -->
          <div class="form-group">
            <label class="form-label" for="format-select">Format</label>
            <div class="format-pills-row" id="format-select" role="radiogroup" aria-label="Export format">
              <button 
                type="button" 
                class="format-pill" 
                [class.active]="selectedFormat() === 'png'"
                (click)="selectedFormat.set('png')"
                role="radio"
                [attr.aria-checked]="selectedFormat() === 'png'"
              >
                <span class="format-name">PNG</span>
                <span class="format-sub">Lossless</span>
              </button>

              <button 
                type="button" 
                class="format-pill" 
                [class.active]="selectedFormat() === 'jpg'"
                (click)="selectedFormat.set('jpg')"
                role="radio"
                [attr.aria-checked]="selectedFormat() === 'jpg'"
              >
                <span class="format-name">JPG</span>
                <span class="format-sub">High Quality</span>
              </button>

              <button 
                type="button" 
                class="format-pill" 
                [class.active]="selectedFormat() === 'webp'"
                (click)="selectedFormat.set('webp')"
                role="radio"
                [attr.aria-checked]="selectedFormat() === 'webp'"
              >
                <span class="format-name">WebP</span>
                <span class="format-sub">Modern Web</span>
              </button>
            </div>
          </div>

          <!-- Quality Slider (for JPG and WebP) -->
          @if (selectedFormat() !== 'png') {
            <div class="form-group">
              <div class="slider-header">
                <label class="form-label" for="quality-slider">Quality</label>
                <span class="slider-value">{{ Math.round(quality() * 100) }}%</span>
              </div>
              <input 
                id="quality-slider"
                type="range" 
                min="0.7" 
                max="1.0" 
                step="0.02" 
                [value]="quality()" 
                (input)="onQualityChange($event)"
                class="modal-slider"
              />
            </div>
          }

          <!-- Metadata Preservation Checkbox (Phase 5) -->
          <div class="checkbox-container">
            <label class="checkbox-label" for="preserve-metadata-chk">
              <input 
                id="preserve-metadata-chk"
                type="checkbox" 
                [checked]="preserveMetadata()" 
                (change)="onMetadataToggle($event)"
                class="modal-checkbox"
              />
              <span>Preserve Camera & EXIF Metadata</span>
            </label>
            @if (exifDetected()) {
              <span class="exif-badge">EXIF Detected</span>
            }
          </div>

          <!-- Filename Input -->
          <div class="form-group">
            <label class="form-label" for="filename-input">Filename</label>
            <div class="input-with-ext">
              <input 
                id="filename-input" 
                type="text" 
                [value]="filename()" 
                (input)="onFilenameChange($event)"
                class="form-input" 
              />
              <span class="ext-badge">.{{ selectedFormat() }}</span>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="btn-cancel" (click)="close.emit()">
            Cancel
          </button>
          <button type="button" class="btn-download" (click)="onDownload()">
            <ts-icon name="download" [size]="16" />
            <span>Download Image</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: var(--ts-space-16, 16px);
      box-sizing: border-box;
    }

    .modal-card {
      width: 100%;
      max-width: 440px;
      border-radius: var(--ts-radius-card, 20px);
      background: var(--ts-surface-raised, var(--surface));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ts-space-16, 16px) var(--ts-space-20, 20px);
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    .modal-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon {
      color: var(--accent, #3B82F6);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text, #F3F4F6);
      margin: 0;
    }

    .btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: var(--text-2, #94A3B8);
      cursor: pointer;
    }

    .btn-close:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #F3F4F6);
    }

    .modal-body {
      padding: var(--ts-space-20, 20px);
      display: flex;
      flex-direction: column;
      gap: var(--ts-space-16, 16px);
    }

    .spec-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: var(--ts-radius-control, 10px);
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      font-size: 13px;
    }

    .spec-label {
      color: var(--text-2, #94A3B8);
    }

    .spec-value {
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      color: var(--text, #F3F4F6);
    }

    .transparency-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--ts-radius-control, 8px);
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60A5FA;
      font-size: 12px;
      line-height: 1.4;
    }

    .warning-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--ts-radius-control, 8px);
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid rgba(234, 179, 8, 0.3);
      color: #FACC15;
      font-size: 12px;
      line-height: 1.4;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--ts-radius-control, 8px);
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text, #F3F4F6);
      cursor: pointer;
    }

    .modal-checkbox {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      accent-color: var(--accent, #3B82F6);
      cursor: pointer;
    }

    .exif-badge {
      font-size: 10px;
      font-family: var(--ts-font-mono, monospace);
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34D399;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #94A3B8);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .format-pills-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .format-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 10px 8px;
      border-radius: var(--ts-radius-control, 10px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.04));
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) ease;
    }

    .format-pill:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
    }

    .format-pill.active {
      border-color: var(--accent, #3B82F6);
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
    }

    .format-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #F3F4F6);
    }

    .format-sub {
      font-size: 11px;
      color: var(--text-3, #64748B);
    }

    .slider-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .slider-value {
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      color: var(--accent, #3B82F6);
    }

    .modal-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--border, rgba(255, 255, 255, 0.15));
      outline: none;
      accent-color: var(--accent, #3B82F6);
      cursor: pointer;
    }

    .input-with-ext {
      display: flex;
      align-items: center;
      position: relative;
    }

    .form-input {
      width: 100%;
      height: 38px;
      padding: 0 60px 0 12px;
      border-radius: var(--ts-radius-control, 10px);
      background: var(--ts-surface-inset, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      color: var(--text, #F3F4F6);
      font-size: 13px;
      font-family: var(--ts-font-sans, inherit);
      outline: none;
      box-sizing: border-box;
    }

    .form-input:focus {
      border-color: var(--accent, #3B82F6);
    }

    .ext-badge {
      position: absolute;
      right: 12px;
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-3, #64748B);
      pointer-events: none;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: var(--ts-space-16, 16px) var(--ts-space-20, 20px);
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    }

    .btn-cancel {
      padding: 8px 16px;
      border-radius: var(--ts-radius-control, 10px);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
      background: transparent;
      color: var(--text-2, #94A3B8);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-cancel:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text, #F3F4F6);
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border-radius: var(--ts-radius-control, 10px);
      border: 1px solid var(--accent, #3B82F6);
      background: var(--accent, #3B82F6);
      color: var(--accent-ink, #FFFFFF);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px var(--accent-glow, rgba(59, 130, 246, 0.35));
    }

    .btn-download:hover {
      filter: brightness(1.1);
    }
  `]
})
export class ExportModalComponent {
  private readonly exportService = inject(ExportService);

  readonly imageWidth = input<number>(1000);
  readonly imageHeight = input<number>(1000);
  readonly defaultFilename = input<string>('cleaned-image');
  readonly hasAlpha = input<boolean>(false);
  readonly exifDetected = input<boolean>(false);

  readonly download = output<ExportOptions>();
  readonly close = output<void>();

  readonly Math = Math;

  readonly selectedFormat = signal<ExportFormat>('png');
  readonly quality = signal<number>(0.92);
  readonly filename = signal<string>('cleaned-image');
  readonly preserveMetadata = signal<boolean>(true);

  readonly estimatedSizeBytes = computed(() => {
    return this.exportService.estimateSize(
      this.imageWidth(),
      this.imageHeight(),
      this.selectedFormat(),
      this.quality(),
      this.hasAlpha()
    );
  });

  readonly formattedEstimatedSize = computed(() => {
    const bytes = this.estimatedSizeBytes();
    if (bytes >= 1048576) {
      return `~${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `~${Math.round(bytes / 1024)} KB`;
  });

  ngOnInit(): void {
    const raw = this.defaultFilename().replace(/\.[^/.]+$/, '');
    this.filename.set(`${raw}-cleaned`);
  }

  onQualityChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.quality.set(parseFloat(target.value));
  }

  onFilenameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filename.set(target.value);
  }

  onMetadataToggle(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.preserveMetadata.set(target.checked);
  }

  onDownload(): void {
    this.download.emit({
      format: this.selectedFormat(),
      quality: this.quality(),
      filename: `${this.filename().trim() || 'cleaned-image'}.${this.selectedFormat()}`,
      preserveMetadata: this.preserveMetadata(),
      estimatedSizeBytes: this.estimatedSizeBytes(),
      hasAlpha: this.hasAlpha()
    });
  }
}

