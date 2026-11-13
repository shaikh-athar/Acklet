// apps/tool-image-compressor/src/components/metadata-modal/metadata-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';

@Component({
  selector: 'app-metadata-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (item(); as image) {
      <div
        class="modal-backdrop"
        (click)="close.emit()"
        role="dialog"
        aria-modal="true"
        aria-label="Metadata Inspection"
      >
        <div class="modal-dialog" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-titles">
              <div class="header-badge font-mono">
                <ts-icon name="shield" [size]="12" />
                <span>EXIF & PRIVACY INSPECTOR</span>
              </div>
              <h3 class="modal-title" [title]="image.originalName">{{ image.originalName }}</h3>
            </div>
            <button
              type="button"
              class="close-btn"
              (click)="close.emit()"
              aria-label="Close metadata modal"
            >
              <ts-icon name="x" [size]="18" />
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            @if (image.metadataReport; as meta) {
              <!-- GPS Privacy Alert if GPS detected -->
              @if (meta.hasGps) {
                <div class="gps-privacy-alert">
                  <ts-icon name="map-pin" [size]="16" class="alert-icon" />
                  <div class="alert-content">
                    <span class="alert-title">GPS Coordinates Detected</span>
                    <span class="alert-desc">
                      Latitude: <strong>{{ meta.latitude }}</strong>, Longitude: <strong>{{ meta.longitude }}</strong>
                      @if (meta.altitude) { • Altitude: <strong>{{ meta.altitude }}m</strong> }
                    </span>
                    <span class="alert-hint">
                      This photo contains location metadata that reveals exactly where it was taken.
                    </span>
                  </div>
                </div>
              }

              <!-- Detected Metadata Grid -->
              <div class="meta-section">
                <h4 class="section-heading">Camera & Technical Properties</h4>
                <div class="properties-grid font-mono">
                  <div class="prop-item">
                    <span class="prop-label">Camera Make:</span>
                    <span class="prop-val">{{ meta.make || 'Not recorded' }}</span>
                  </div>
                  <div class="prop-item">
                    <span class="prop-label">Camera Model:</span>
                    <span class="prop-val">{{ meta.model || 'Not recorded' }}</span>
                  </div>
                  <div class="prop-item">
                    <span class="prop-label">Timestamp:</span>
                    <span class="prop-val">{{ meta.dateTime || 'Not recorded' }}</span>
                  </div>
                  <div class="prop-item">
                    <span class="prop-label">Resolution / DPI:</span>
                    <span class="prop-val">{{ meta.dpi ? meta.dpi + ' DPI' : '96 DPI' }}</span>
                  </div>
                  <div class="prop-item">
                    <span class="prop-label">Color Space:</span>
                    <span class="prop-val">{{ meta.colorProfile || 'sRGB' }}</span>
                  </div>
                  <div class="prop-item">
                    <span class="prop-label">EXIF Orientation:</span>
                    <span class="prop-val">{{ meta.orientation || '1 (Normal)' }}</span>
                  </div>
                </div>
              </div>

              <!-- Metadata Policy Outcome -->
              <div class="meta-section policy-outcome-section">
                <h4 class="section-heading">
                  Active Policy: <span class="policy-name font-mono">{{ activePolicyLabel() }}</span>
                </h4>

                <div class="policy-pills-row">
                  <div class="policy-col">
                    <span class="sub-label">Fields Removed:</span>
                    @if (meta.fieldsRemoved && meta.fieldsRemoved.length > 0) {
                      <div class="tags-cluster">
                        @for (f of meta.fieldsRemoved; track f) {
                          <span class="field-pill removed-pill">
                            <ts-icon name="trash-2" [size]="11" />
                            <span>{{ f }}</span>
                          </span>
                        }
                      </div>
                    } @else {
                      <span class="empty-field-text font-mono">None</span>
                    }
                  </div>

                  <div class="policy-col">
                    <span class="sub-label">Fields Retained:</span>
                    @if (meta.fieldsRetained && meta.fieldsRetained.length > 0) {
                      <div class="tags-cluster">
                        @for (f of meta.fieldsRetained; track f) {
                          <span class="field-pill retained-pill">
                            <ts-icon name="check" [size]="11" />
                            <span>{{ f }}</span>
                          </span>
                        }
                      </div>
                    } @else {
                      <span class="empty-field-text font-mono">None (Stripped for privacy)</span>
                    }
                  </div>
                </div>
              </div>

            } @else {
              <div class="no-meta-state">
                <ts-icon name="shield-check" [size]="32" class="shield-icon" />
                <h4>No EXIF Metadata Detected</h4>
                <p>This image contains no camera tags, timestamps, or GPS location data.</p>
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              type="button"
              class="primary-modal-btn"
              (click)="close.emit()"
            >
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 180ms ease-out;
    }

    .modal-dialog {
      display: flex;
      flex-direction: column;
      max-width: 560px;
      width: 100%;
      background: var(--ts-surface-card, #1A1C23);
      border: 1px solid var(--border-default, #2E3342);
      border-radius: var(--ts-radius-card, 18px);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      color: var(--accent, #60A5FA);
      letter-spacing: 0.05em;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #F9FAFB);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: var(--text-2, #9CA3AF);
      cursor: pointer;
      transition: all var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .gps-privacy-alert {
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: var(--error, #EF4444);
    }

    .alert-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .alert-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11.5px;
      line-height: 1.4;
    }

    .alert-title {
      font-weight: 700;
      font-size: 12.5px;
    }

    .alert-hint {
      color: var(--text-2, #D1D5DB);
      margin-top: 2px;
      font-size: 11px;
    }

    .meta-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-heading {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-2, #D1D5DB);
      margin: 0;
    }

    .policy-name {
      color: var(--accent, #60A5FA);
    }

    .properties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px;
      border-radius: 10px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .prop-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .prop-label {
      font-size: 10px;
      color: var(--text-3, #9CA3AF);
    }

    .prop-val {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F9FAFB);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .policy-outcome-section {
      padding: 12px;
      border-radius: 10px;
      background: var(--ts-surface-base, #111318);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
    }

    .policy-pills-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 4px;
    }

    .policy-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sub-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-3, #9CA3AF);
    }

    .tags-cluster {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .field-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .removed-pill {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--error, #EF4444);
    }

    .retained-pill {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: var(--success, #34D399);
    }

    .empty-field-text {
      font-size: 11px;
      color: var(--text-3, #6B7280);
      font-style: italic;
    }

    .no-meta-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 16px;
      gap: 8px;
    }

    .shield-icon {
      color: var(--success, #10B981);
    }

    .no-meta-state h4 {
      margin: 0;
      font-size: 14px;
      color: var(--text, #F9FAFB);
    }

    .no-meta-state p {
      margin: 0;
      font-size: 12px;
      color: var(--text-3, #9CA3AF);
    }

    .modal-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      justify-content: flex-end;
    }

    .primary-modal-btn {
      height: 34px;
      padding: 0 16px;
      border-radius: 8px;
      background: var(--accent, #2563EB);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    .primary-modal-btn:hover {
      background: var(--accent-hover, #1D4ED8);
    }

    /* ── Light Theme Dual-Theme Overrides ── */
    :host-context([data-theme="light"]) .modal-backdrop,
    [data-theme="light"] .modal-backdrop {
      background: rgba(15, 23, 42, 0.45);
    }

    :host-context([data-theme="light"]) .modal-dialog,
    [data-theme="light"] .modal-dialog {
      background: #FFFFFF;
      border-color: rgba(15, 23, 42, 0.12);
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.15);
    }

    :host-context([data-theme="light"]) .modal-header,
    [data-theme="light"] .modal-header {
      border-bottom-color: #F1F5F9;
    }

    :host-context([data-theme="light"]) .modal-title,
    [data-theme="light"] .modal-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .metadata-section-card,
    [data-theme="light"] .metadata-section-card {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    :host-context([data-theme="light"]) .section-title,
    [data-theme="light"] .section-title {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .meta-field-row,
    [data-theme="light"] .meta-field-row {
      border-bottom-color: #F1F5F9;
    }

    :host-context([data-theme="light"]) .field-label,
    [data-theme="light"] .field-label {
      color: #64748B;
    }

    :host-context([data-theme="light"]) .field-val,
    [data-theme="light"] .field-val {
      color: #0F172A;
    }

    :host-context([data-theme="light"]) .modal-footer,
    [data-theme="light"] .modal-footer {
      border-top-color: #F1F5F9;
      background: #F8FAFC;
    }
  `]
})
export class MetadataModalComponent {
  readonly item = input.required<ImageItem | null>();
  readonly close = output<void>();

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  readonly activePolicyLabel = computed(() => {
    const item = this.item();
    const policy = item?.effectiveSettings?.metadataPolicy || 'remove';
    if (policy === 'preserve') return 'Preserve Camera EXIF';
    if (policy === 'strip-gps') return 'Strip GPS Location Only';
    return 'Strip All Metadata (Maximum Privacy)';
  });
}

