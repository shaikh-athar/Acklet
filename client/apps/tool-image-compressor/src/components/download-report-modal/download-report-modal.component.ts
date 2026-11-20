// apps/tool-image-compressor/src/components/download-report-modal/download-report-modal.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
  inject,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { ImageItem } from '../../models/compressor.models';
import { calculateBeforeDownloadReport, BeforeDownloadReportData } from '../../services/download-report.util';
import { CompressorTelemetryService } from '../../services/compressor-telemetry.service';

@Component({
  selector: 'app-download-report-modal',
  standalone: true,
  imports: [CommonModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="modal-backdrop"
      [class.is-closing]="isClosing()"
      (click)="onBackClick()"
      role="dialog"
      aria-modal="true"
      aria-label="Download Summary Report"
    >
      <div
        class="report-dialog"
        [class.is-closing]="isClosing()"
        (click)="$event.stopPropagation()"
        tabindex="-1"
      >
        <!-- Header -->
        <header class="report-header">
          <div class="header-left">
            <div class="header-icon-wrap">
              <ts-icon name="check-circle" [size]="16" />
            </div>
            <h3 class="report-title">Ready to Download</h3>
          </div>
          <button
            type="button"
            class="report-close-btn"
            (click)="onBackClick()"
            aria-label="Back"
            title="Back (Escape)"
          >
            <ts-icon name="x" [size]="16" />
          </button>
        </header>

        <!-- Body with the exact four lines -->
        <div class="report-body">
          <div class="report-lines-group">
            <!-- Line 1: Total saved -->
            <div class="report-line line-saved font-mono">
              <ts-icon name="trending-down" [size]="15" class="line-icon text-accent" />
              <span class="line-text font-bold">{{ report().line1Saved }}</span>
            </div>

            <!-- Line 2: Files kept as original (only if count > 0) -->
            @if (report().line2Kept; as line2) {
              <div class="report-line line-kept font-mono">
                <ts-icon name="shield" [size]="15" class="line-icon text-muted" />
                <span class="line-text">{{ line2 }}</span>
              </div>
            }

            <!-- Line 3: Quality range -->
            <div class="report-line line-quality font-mono">
              <ts-icon name="award" [size]="15" class="line-icon text-accent" />
              <span class="line-text">{{ report().line3Quality }}</span>
            </div>

            <!-- Line 4: Resized files (only if count > 0) -->
            @if (report().line4Resized; as line4) {
              <div class="report-line line-resized font-mono">
                <ts-icon name="maximize-2" [size]="15" class="line-icon text-muted" />
                <span class="line-text">{{ line4 }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Footer Actions: Download and Back -->
        <footer class="report-footer">
          <button
            type="button"
            class="btn-back font-mono"
            (click)="onBackClick()"
          >
            Back
          </button>
          <button
            type="button"
            class="btn-download-primary font-mono"
            (click)="onDownloadClick()"
          >
            <ts-icon name="download" [size]="14" />
            <span>Download</span>
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 16px;
      overflow: hidden;
      box-sizing: border-box;
      animation: modalFadeIn 0.3s ease forwards;
    }

    .modal-backdrop.is-closing {
      animation: modalFadeOut 0.3s ease forwards;
      pointer-events: none;
    }

    .report-dialog {
      width: 100%;
      max-width: 460px;
      margin: auto;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: var(--bg-card, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      box-shadow:
        0 20px 40px -12px rgba(15, 23, 42, 0.25),
        0 8px 16px -4px rgba(15, 23, 42, 0.1);
      overflow: hidden;
      outline: none;
      box-sizing: border-box;
      animation: modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .report-dialog.is-closing {
      animation: modalSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    :host-context([data-theme="dark"]) .report-dialog,
    [data-theme="dark"] .report-dialog {
      background: #0F172A;
      border-color: rgba(51, 65, 85, 0.85);
      box-shadow:
        0 20px 40px -12px rgba(0, 0, 0, 0.7),
        0 8px 16px -4px rgba(0, 0, 0, 0.5);
    }

    .report-header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--border-subtle, #E2E8F0);
    }

    :host-context([data-theme="dark"]) .report-header,
    [data-theme="dark"] .report-header {
      border-bottom-color: rgba(51, 65, 85, 0.75);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-icon-wrap {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    :host-context([data-theme="dark"]) .header-icon-wrap,
    [data-theme="dark"] .header-icon-wrap {
      background: rgba(16, 185, 129, 0.2);
      color: #34D399;
    }

    .report-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary, #0F172A);
      margin: 0;
    }

    :host-context([data-theme="dark"]) .report-title,
    [data-theme="dark"] .report-title {
      color: #F8FAFC;
    }

    .report-close-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted, #64748B);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .report-close-btn:hover {
      background: var(--bg-hover, #F1F5F9);
      color: var(--text-primary, #0F172A);
    }

    :host-context([data-theme="dark"]) .report-close-btn:hover,
    [data-theme="dark"] .report-close-btn:hover {
      background: rgba(30, 41, 59, 0.8);
      color: #F8FAFC;
    }

    .report-body {
      padding: 16px 18px;
    }

    .report-lines-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .report-line {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.82rem;
      color: var(--text-primary, #0F172A);
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--bg-hover, #F8FAFC);
      border: 1px solid var(--border-subtle, #E2E8F0);
      line-height: 1.4;
    }

    :host-context([data-theme="dark"]) .report-line,
    [data-theme="dark"] .report-line {
      background: rgba(30, 41, 59, 0.45);
      border-color: rgba(51, 65, 85, 0.6);
      color: #F1F5F9;
    }

    .report-line.line-saved {
      background: rgba(37, 99, 235, 0.05);
      border-color: rgba(37, 99, 235, 0.2);
      color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .report-line.line-saved,
    [data-theme="dark"] .report-line.line-saved {
      background: rgba(37, 99, 235, 0.12);
      border-color: rgba(59, 130, 246, 0.35);
      color: #60A5FA;
    }

    .line-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }

    .line-icon.text-accent {
      color: var(--accent-primary, #2563EB);
    }

    :host-context([data-theme="dark"]) .line-icon.text-accent,
    [data-theme="dark"] .line-icon.text-accent {
      color: #60A5FA;
    }

    .line-icon.text-muted {
      color: var(--text-muted, #64748B);
    }

    .font-bold {
      font-weight: 700;
    }

    .report-footer {
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-hover, #F8FAFC);
    }

    :host-context([data-theme="dark"]) .report-footer,
    [data-theme="dark"] .report-footer {
      background: rgba(15, 23, 42, 0.85);
      border-top-color: rgba(51, 65, 85, 0.75);
    }

    .btn-back {
      padding: 7px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, #E2E8F0);
      background: var(--bg-card, #FFFFFF);
      color: var(--text-secondary, #475569);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    :host-context([data-theme="dark"]) .btn-back,
    [data-theme="dark"] .btn-back {
      background: #1E293B;
      border-color: rgba(51, 65, 85, 0.8);
      color: #94A3B8;
    }

    .btn-back:hover {
      background: var(--bg-hover, #F1F5F9);
      color: var(--text-primary, #0F172A);
    }

    .btn-download-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 16px;
      border-radius: 8px;
      border: none;
      background: var(--accent-primary, #2563EB);
      color: #FFFFFF;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
      transition: all 0.15s ease;
    }

    .btn-download-primary:hover {
      background: #1D4ED8;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(37, 99, 235, 0.4);
    }

    @media (max-width: 768px) {
      .report-footer {
        flex-direction: column-reverse;
      }
      .btn-back,
      .btn-download-primary {
        width: 100%;
        justify-content: center;
        text-align: center;
      }
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    @keyframes modalSlideDown {
      from { opacity: 1; transform: scale(1) translateY(0); }
      to { opacity: 0; transform: scale(0.96) translateY(8px); }
    }
  `]
})
export class DownloadReportModalComponent implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly telemetry = inject(CompressorTelemetryService, { optional: true });

  readonly items = input.required<ImageItem[]>();
  readonly downloadConfirmed = output<void>();
  readonly backRequested = output<void>();

  readonly isClosing = signal<boolean>(false);

  readonly report = computed<BeforeDownloadReportData>(() => {
    return calculateBeforeDownloadReport(this.items());
  });

  ngOnInit(): void {
    this.telemetry?.trackReportViewed();
    if (this.document?.body) {
      this.document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    if (this.document?.body) {
      this.document.body.style.overflow = '';
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onBackClick();
  }

  onBackClick(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.backRequested.emit();
    }, 300);
  }

  onDownloadClick(): void {
    if (this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.downloadConfirmed.emit();
    }, 300);
  }
}

