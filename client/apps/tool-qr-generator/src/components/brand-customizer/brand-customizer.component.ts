// client/apps/tool-qr-generator/src/components/brand-customizer/brand-customizer.component.ts
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  QrBrandOptions,
  DEFAULT_BRAND_OPTIONS,
  QrBrandFont,
  QrBrandPlacement
} from '../../models/qr-generator.models';
import {
  BRAND_FONTS,
  ensureBrandFontsLoaded,
  validateBrandImageFile
} from '../../utils/qr-brand-mask.util';

@Component({
  selector: 'app-qr-brand-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="brand-customizer-container">
      <!-- Mode Toggle: Brand Name | Brand Image -->
      <div class="mode-toggle-segmented" role="radiogroup" aria-label="Brand Art Mode">
        <button
          type="button"
          class="mode-btn"
          [class.active]="activeMode() === 'name'"
          (click)="onSwitchMode('name')"
        >
          <ts-icon name="type" class="btn-icon" />
          <span>Brand Name</span>
        </button>
        <button
          type="button"
          class="mode-btn"
          [class.active]="activeMode() === 'image'"
          (click)="onSwitchMode('image')"
        >
          <ts-icon name="image" class="btn-icon" />
          <span>Brand Image</span>
        </button>
      </div>

      <!-- ============================================== -->
      <!-- 1. BRAND NAME VIEW                             -->
      <!-- ============================================== -->
      @if (activeMode() === 'name') {
        <div class="brand-panel-card slide-fade-up">
          <!-- Text Input Group -->
          <div class="input-field-group">
            <div class="field-header">
              <label for="brandTextInput" class="field-label">Your Brand Name</label>
              <span class="char-count" [class.warning]="(brand().text?.length || 0) > 8">
                {{ brand().text?.length || 0 }}/12
              </span>
            </div>
            <div class="text-input-wrap">
              <input
                id="brandTextInput"
                type="text"
                maxlength="12"
                class="brand-text-input"
                [value]="brand().text || ''"
                (input)="onTextInput($any($event.target).value)"
                placeholder="e.g. ACKLET"
                aria-describedby="brandTextHint"
              />
              @if (brand().text) {
                <button
                  type="button"
                  class="clear-input-btn"
                  (click)="onClearText()"
                  title="Clear text"
                  aria-label="Clear brand name"
                >
                  <ts-icon name="x" />
                </button>
              }
            </div>
            <p id="brandTextHint" class="friendly-hint">
              @if ((brand().text?.length || 0) > 8) {
                <span class="crowded-warn">Longer names look best with "Banner" placement for crisp scanning.</span>
              } @else {
                <span>Short names (3–8 characters) fit beautifully inside the code.</span>
              }
            </p>
          </div>

          <!-- Placement Choice -->
          <div class="placement-group">
            <span class="field-label">Placement</span>
            <div class="placement-segmented" role="radiogroup" aria-label="Brand Name Placement">
              <button
                type="button"
                class="placement-btn"
                [class.active]="brand().placement === 'in-code'"
                (click)="onPlacementChange('in-code')"
                title="Letters appear through contrast tones inside the real QR code"
              >
                <div class="placement-title">In the code</div>
                <div class="placement-sub">Subtle tone map</div>
              </button>
              <button
                type="button"
                class="placement-btn"
                [class.active]="brand().placement === 'around-code'"
                (click)="onPlacementChange('around-code')"
                title="Letters are formed in the surrounding decorative field"
              >
                <div class="placement-title">Around the code</div>
                <div class="placement-sub">Silhouette field</div>
              </button>
              <button
                type="button"
                class="placement-btn"
                [class.active]="brand().placement === 'banner'"
                (click)="onPlacementChange('banner')"
                title="Clean vector typography band below the code"
              >
                <div class="placement-title">Banner</div>
                <div class="placement-sub">Clean label</div>
              </button>
            </div>
          </div>

          <!-- Font Lettering Style Gallery -->
          <div class="font-gallery-group">
            <div class="field-header">
              <span class="field-label">Lettering Style</span>
              <span class="font-indicator">{{ selectedFontName() }}</span>
            </div>
            <div class="font-cards-grid">
              @for (fontDef of fonts; track fontDef.id) {
                <button
                  type="button"
                  class="font-card-btn"
                  [class.active]="(brand().font || 'Outfit') === fontDef.id"
                  (click)="onFontSelect(fontDef.id)"
                  [title]="fontDef.name + ' (' + fontDef.category + ')'"
                  [attr.aria-label]="fontDef.name + ' font style'"
                >
                  <span
                    class="font-sample-text"
                    [style.font-family]="&apos;&quot;&apos; + fontDef.name + &apos;&quot;, sans-serif&apos;"
                    [style.font-weight]="fontDef.weight"
                  >
                    {{ displayTextSample() }}
                  </span>
                  <span class="font-card-name">{{ fontDef.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Color Customization -->
          <div class="color-picker-group">
            <div class="field-header">
              <span class="field-label">Artwork Accent Color</span>
              <span class="color-hex">{{ brand().color || '#0284c7' }}</span>
            </div>
            <div class="color-palette-row">
              @for (color of colorPresets; track color) {
                <button
                  type="button"
                  class="color-circle-btn"
                  [class.active]="(brand().color || '#0284c7').toLowerCase() === color.toLowerCase()"
                  [style.background-color]="color"
                  (click)="onColorSelect(color)"
                  [title]="'Select ' + color"
                  [attr.aria-label]="'Select color ' + color"
                ></button>
              }
              <div class="custom-color-wrap">
                <input
                  type="color"
                  class="native-color-well"
                  [value]="brand().color || '#0284c7'"
                  (input)="onColorSelect($any($event.target).value)"
                  aria-label="Custom brand color"
                />
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ============================================== -->
      <!-- 2. BRAND IMAGE VIEW                            -->
      <!-- ============================================== -->
      @if (activeMode() === 'image') {
        <div class="brand-panel-card image-mode-card slide-fade-up">
          @if (!brand().imageData) {
            <!-- Upload Dropzone -->
            <div
              class="brand-upload-zone"
              [class.dragging]="isDragging()"
              (dragover)="onDragOver($event)"
              (dragleave)="isDragging.set(false)"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
              tabindex="0"
              role="button"
              aria-label="Upload brand image or logo (PNG, JPG, SVG up to 2MB)"
            >
              <input
                #fileInput
                type="file"
                class="hidden-file-input"
                accept="image/png,image/jpeg,image/svg+xml"
                (change)="onFileSelected($event)"
              />
              <div class="upload-icon-circle">
                <ts-icon name="upload-cloud" class="upload-icon" />
              </div>
              <div class="upload-text-block">
                <span class="upload-main-text">Upload brand logo or emblem</span>
                <span class="upload-sub-text">PNG, JPG, or SVG (Max 2MB, runs client-side)</span>
              </div>
            </div>
          } @else {
            <!-- Uploaded Image Preview & Controls -->
            <div class="uploaded-image-card">
              <div class="preview-img-row">
                <div class="img-thumb-container">
                  <img [src]="brand().imageData" alt="Brand art thumbnail" class="brand-thumb-img" />
                </div>
                <div class="img-meta-block">
                  <span class="img-title">Brand Artwork Loaded</span>
                  <span class="img-sub">Client-side verified vector/raster mask</span>
                </div>
                <button
                  type="button"
                  class="remove-art-btn"
                  (click)="onRemoveImage()"
                  title="Remove artwork"
                  aria-label="Remove brand artwork"
                >
                  <ts-icon name="trash-2" />
                  <span>Remove</span>
                </button>
              </div>

              <!-- Placement for Brand Image -->
              <div class="placement-group">
                <span class="field-label">Image Placement</span>
                <div class="placement-segmented" role="radiogroup" aria-label="Brand Image Placement">
                  <button
                    type="button"
                    class="placement-btn"
                    [class.active]="brand().placement === 'in-code'"
                    (click)="onPlacementChange('in-code')"
                    title="Silhouetted through tone-mapped data modules"
                  >
                    <div class="placement-title">In the code</div>
                    <div class="placement-sub">Tone-mapped</div>
                  </button>
                  <button
                    type="button"
                    class="placement-btn"
                    [class.active]="brand().placement === 'around-code'"
                    (click)="onPlacementChange('around-code')"
                    title="Embossed in the outer silhouette field"
                  >
                    <div class="placement-title">Around the code</div>
                    <div class="placement-sub">Decorative field</div>
                  </button>
                  <button
                    type="button"
                    class="placement-btn"
                    [class.active]="brand().placement === 'banner'"
                    (click)="onPlacementChange('banner')"
                    title="Set as center logo"
                  >
                    <div class="placement-title">Center Logo</div>
                    <div class="placement-sub">Focal center</div>
                  </button>
                </div>
              </div>
            </div>
          }

          @if (errorMessage()) {
            <div class="error-banner slide-fade-up" role="alert">
              <ts-icon name="alert-circle" />
              <span>{{ errorMessage() }}</span>
            </div>
          }
        </div>
      }

      <!-- Reset Art Footer Button -->
      @if (brand().enabled) {
        <div class="reset-footer-row">
          <button
            type="button"
            class="reset-art-btn"
            (click)="onResetArt()"
            title="Clear all brand artwork and restore standard styling"
          >
            <ts-icon name="rotate-ccw" />
            <span>Reset brand art</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      flex: 1 1 auto;
      gap: 12px;
      box-sizing: border-box;
    }

    .brand-customizer-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      flex: 1 1 auto;
    }

    /* Segmented Mode Toggle (Brand Name vs Brand Image) */
    .mode-toggle-segmented {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      background: var(--surface-1, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 3px;
    }

    .mode-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .mode-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
    }

    .mode-btn.active {
      background: var(--surface-2, #262934);
      color: var(--tool-accent, #60a5fa);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.35));
    }

    .btn-icon {
      width: 15px;
      height: 15px;
    }

    /* Main Card */
    .brand-panel-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 14px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
    }

    /* Field Group */
    .input-field-group,
    .placement-group,
    .font-gallery-group,
    .color-picker-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .char-count {
      font-size: 11px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
      font-family: var(--ts-font-mono, monospace);
    }

    .char-count.warning {
      color: #f59e0b;
      font-weight: 600;
    }

    .text-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .brand-text-input {
      width: 100%;
      height: 38px;
      padding: 0 32px 0 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      background: var(--surface-1, rgba(0, 0, 0, 0.25));
      color: var(--text, #ffffff);
      font-size: 13px;
      font-weight: 500;
      box-sizing: border-box;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .brand-text-input:focus {
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 0 2px var(--tool-accent-soft, rgba(59, 130, 246, 0.2));
    }

    .clear-input-btn {
      position: absolute;
      right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
      cursor: pointer;
    }

    .clear-input-btn:hover {
      color: var(--text, #ffffff);
      background: rgba(255, 255, 255, 0.1);
    }

    .friendly-hint {
      margin: 0;
      font-size: 11.5px;
      color: var(--text-muted, rgba(255, 255, 255, 0.55));
      line-height: 1.4;
    }

    .crowded-warn {
      color: #fbbf24;
    }

    /* Placement Segmented Controls */
    .placement-segmented {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4px;
      background: var(--surface-1, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 3px;
    }

    .placement-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 4px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      text-align: center;
      transition: all 150ms ease;
      gap: 2px;
    }

    .placement-btn:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
    }

    .placement-btn.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .placement-title {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text, #ffffff);
    }

    .placement-btn.active .placement-title {
      color: var(--tool-accent, #60a5fa);
    }

    .placement-sub {
      font-size: 10px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    /* Font Gallery Cards Grid */
    .font-indicator {
      font-size: 11px;
      color: var(--tool-accent, #60a5fa);
      font-weight: 600;
    }

    .font-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    @media (max-width: 640px) {
      .font-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .font-card-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 58px;
      padding: 4px;
      border-radius: 8px;
      border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--surface-1, rgba(0, 0, 0, 0.2));
      cursor: pointer;
      transition: all 150ms ease;
      gap: 3px;
    }

    .font-card-btn:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      transform: translateY(-1px);
    }

    .font-card-btn.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
    }

    .font-sample-text {
      font-size: 15px;
      color: var(--text, #ffffff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90%;
    }

    .font-card-btn.active .font-sample-text {
      color: var(--tool-accent, #60a5fa);
    }

    .font-card-name {
      font-size: 9.5px;
      font-weight: 500;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 90%;
    }

    /* Color Palette */
    .color-hex {
      font-size: 11px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
    }

    .color-palette-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .color-circle-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .color-circle-btn:hover {
      transform: scale(1.12);
    }

    .color-circle-btn.active {
      border-color: #ffffff;
      box-shadow: 0 0 0 2px var(--tool-accent, #3b82f6);
    }

    .custom-color-wrap {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.2));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .native-color-well {
      width: 36px;
      height: 36px;
      border: none;
      cursor: pointer;
      background: transparent;
      transform: scale(1.4);
    }

    .image-mode-card {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: 380px;
    }

    /* Image Upload Zone */
    .brand-upload-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1 1 auto;
      min-height: 340px;
      padding: 36px 20px;
      border: 2px dashed var(--border-subtle, rgba(255, 255, 255, 0.15));
      border-radius: 12px;
      background: var(--surface-1, rgba(0, 0, 0, 0.15));
      cursor: pointer;
      transition: all 150ms ease;
      gap: 14px;
      box-sizing: border-box;
    }

    :host-context([data-theme='light']) .brand-upload-zone,
    :host-context(.light) .brand-upload-zone {
      background: var(--surface-2, rgba(0, 0, 0, 0.02));
      border-color: var(--border, rgba(0, 0, 0, 0.18));
    }

    .brand-upload-zone:hover,
    .brand-upload-zone.dragging {
      border-color: var(--tool-accent, #3b82f6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
    }

    .hidden-file-input {
      display: none;
    }

    .upload-icon-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      color: var(--tool-accent, #60a5fa);
    }

    :host-context([data-theme='light']) .upload-icon-circle,
    :host-context(.light) .upload-icon-circle {
      background: var(--surface-3, rgba(59, 130, 246, 0.08));
    }

    .upload-icon {
      width: 30px;
      height: 30px;
    }

    .upload-text-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;
    }

    .upload-main-text {
      font-size: 15px;
      font-weight: 600;
      color: var(--text, #ffffff);
    }

    :host-context([data-theme='light']) .upload-main-text,
    :host-context(.light) .upload-main-text {
      color: var(--text, #111827);
    }

    .upload-sub-text {
      font-size: 12px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    .uploaded-image-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .preview-img-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      background: var(--surface-1, rgba(0, 0, 0, 0.25));
      border-radius: 8px;
    }

    .img-thumb-container {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      background: #ffffff;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .brand-thumb-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .img-meta-block {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .img-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #ffffff);
    }

    .img-sub {
      font-size: 11px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    .remove-art-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .remove-art-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      font-size: 11.5px;
    }

    .reset-footer-row {
      display: flex;
      justify-content: flex-end;
    }

    .reset-art-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      background: transparent;
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
      font-size: 11.5px;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .reset-art-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      border-color: var(--border-strong, rgba(255, 255, 255, 0.2));
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up,
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class BrandCustomizerComponent implements OnInit {
  readonly brand = input<QrBrandOptions>(DEFAULT_BRAND_OPTIONS);
  readonly brandChange = output<QrBrandOptions>();
  readonly logo = input<string | null>(null);
  readonly logoChange = output<string | null>();

  readonly activeMode = signal<'name' | 'image'>('name');
  readonly isDragging = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly fonts = BRAND_FONTS;

  readonly colorPresets: string[] = [
    '#0284c7', // Sky Blue
    '#2563eb', // Royal Blue
    '#7c3aed', // Violet
    '#db2777', // Rose
    '#dc2626', // Red
    '#d97706', // Amber
    '#059669', // Emerald
    '#0f172a'  // Midnight
  ];

  readonly displayTextSample = computed(() => {
    const text = this.brand().text?.trim();
    return text ? text.substring(0, 10) : 'BRAND';
  });

  readonly selectedFontName = computed(() => {
    const current = this.brand().font || 'Outfit';
    const found = BRAND_FONTS.find(f => f.id === current);
    return found ? found.name : 'Outfit';
  });

  ngOnInit(): void {
    // Lazily load Google Fonts only when the Brand tab opens
    ensureBrandFontsLoaded();
  }

  onSwitchMode(mode: 'name' | 'image'): void {
    this.activeMode.set(mode);
    this.errorMessage.set(null);
  }

  onTextInput(text: string): void {
    const trimmed = text.substring(0, 12);
    const enabled = trimmed.trim().length > 0;
    this.brandChange.emit({
      ...this.brand(),
      enabled,
      type: 'name',
      text: trimmed
    });
  }

  onClearText(): void {
    this.brandChange.emit({
      ...this.brand(),
      enabled: false,
      text: ''
    });
  }

  onPlacementChange(placement: QrBrandPlacement): void {
    this.brandChange.emit({
      ...this.brand(),
      placement
    });
  }

  onFontSelect(font: QrBrandFont): void {
    this.brandChange.emit({
      ...this.brand(),
      font
    });
  }

  onColorSelect(color: string): void {
    this.brandChange.emit({
      ...this.brand(),
      color
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  async onFileDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      await this.processImageFile(event.dataTransfer.files[0]);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.processImageFile(input.files[0]);
    }
  }

  async processImageFile(file: File): Promise<void> {
    this.errorMessage.set(null);
    const result = await validateBrandImageFile(file);
    if (!result.isValid || !result.dataUrl) {
      this.errorMessage.set(result.error || 'Failed to validate image file.');
      return;
    }

    // Set brand image data URL and enable
    this.brandChange.emit({
      ...this.brand(),
      enabled: true,
      type: 'image',
      imageData: result.dataUrl
    });

    // Also update center logo for seamless compatibility if placement is logo
    if (this.brand().placement === 'banner') {
      this.logoChange.emit(result.dataUrl);
    }
  }

  onRemoveImage(): void {
    this.brandChange.emit({
      ...this.brand(),
      enabled: false,
      imageData: undefined
    });
  }

  onResetArt(): void {
    this.brandChange.emit(DEFAULT_BRAND_OPTIONS);
  }
}
