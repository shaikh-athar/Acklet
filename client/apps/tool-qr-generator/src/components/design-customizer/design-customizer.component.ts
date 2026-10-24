// client/apps/tool-qr-generator/src/components/design-customizer/design-customizer.component.ts
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  QrDotType,
  QrCornerSquareType,
  QrCornerDotType,
  DesignPreset,
  DESIGN_PRESETS,
  QrFrameStyle,
  QrFrameOptions,
  DEFAULT_FRAME_OPTIONS,
  QrArtShapeOptions,
  DEFAULT_ART_SHAPE_OPTIONS,
  QrOverallShape,
  QrShapeMode,
  QrStyleStrength
} from '../../models/qr-generator.models';
import { QR_FRAME_TEMPLATES, QrFrameDefinition } from '../../models/qr-frames.data';
import { QR_ART_SHAPES, getQrShapeById, QrShapeDefinition } from '../../utils/qr-shapes.data';
import { TsIconComponent, HlmBadge } from '@acklet/tool-shell';

export interface LogoPreset {
  id: string;
  name: string;
  icon: string;
  dataUrl: string | null;
}

const PRESET_LOGOS: LogoPreset[] = [
  {
    id: 'none',
    name: 'None',
    icon: 'x',
    dataUrl: null
  },
  {
    id: 'wifi',
    name: 'Wi-Fi',
    icon: 'wifi',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'
  },
  {
    id: 'phone',
    name: 'Phone',
    icon: 'phone',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
  },
  {
    id: 'mail',
    name: 'Email',
    icon: 'mail',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'
  },
  {
    id: 'link',
    name: 'Link',
    icon: 'link',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  },
  {
    id: 'star',
    name: 'Star',
    icon: 'star',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f59e0b" stroke="%23f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  },
  {
    id: 'heart',
    name: 'Heart',
    icon: 'heart',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ef4444" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
  },
  {
    id: 'check',
    name: 'Verified',
    icon: 'check',
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  }
];

@Component({
  selector: 'app-qr-design-customizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent, HlmBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-design-container">
      <!-- ========================================== -->
      <!-- 1. FRAMES SECTION                          -->
      <!-- ========================================== -->
      @if (activeSection() === 'all' || activeSection() === 'frame') {
        <div class="design-section">
          <label class="design-section-label">
            <span>Decorative Frames ({{ frameList.length }})</span>
            <span class="selection-indicator">{{ selectedFrameName() }}</span>
          </label>

          <!-- Visual Gallery of All 18 Vector Frames (Responsive Grid: 5-6 per row, no horizontal scrolling) -->
          <div class="frames-grid" role="region" aria-label="Decorative frame options">
            @for (opt of frameList; track opt.id) {
              <button
                type="button"
                class="frame-thumb-card"
                [class.active]="frame().style === opt.id"
                (click)="onFrameStyleSelect(opt.id)"
                [title]="opt.name + (opt.hasText ? ' (with caption)' : '')"
                [attr.aria-label]="opt.name + ' frame'"
              >
                <div class="frame-thumb-svg-wrap" [innerHTML]="opt.safeThumbnail"></div>
                @if (frame().style === opt.id) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>

          <!-- Controls for Active Frame (Text, Colors) -->
          @if (frame().style !== 'none') {
            <div class="frame-controls-card slide-fade-up">
              <!-- Frame CTA Text -->
              <div class="frame-input-group">
                <label class="sub-picker-label" for="frameCtaInput">CTA Text / Caption</label>
                <input
                  id="frameCtaInput"
                  type="text"
                  maxlength="28"
                  class="frame-text-input"
                  [value]="frame().text"
                  (input)="onFrameTextChange($any($event.target).value)"
                  placeholder="e.g. SCAN ME"
                />
              </div>

              <!-- Quick CTA Suggestions -->
              <div class="presets-row">
                <span class="preset-label">Quick CTAs:</span>
                @for (suggestion of ctaSuggestions; track suggestion) {
                  <button
                    type="button"
                    class="preset-chip"
                    [class.active]="frame().text === suggestion"
                    (click)="onFrameTextChange(suggestion)"
                    [title]="'Apply CTA text: ' + suggestion"
                    [attr.aria-label]="'Apply CTA text: ' + suggestion"
                  >
                    <span>{{ suggestion }}</span>
                  </button>
                }
              </div>

              <!-- Frame Color Customization -->
              <div class="corner-pickers-row">
                <div class="corner-picker-group">
                  <span class="sub-picker-label">Frame Color</span>
                  <div class="picker-input-wrapper">
                    <input
                      type="color"
                      class="native-color-input"
                      [value]="frame().color"
                      (input)="onFrameColorChange($any($event.target).value)"
                      aria-label="Frame color picker"
                    />
                    <input
                      type="text"
                      maxlength="7"
                      class="hex-text-input"
                      [value]="frame().color"
                      (input)="onFrameColorChange($any($event.target).value)"
                      aria-label="Frame color hex code"
                    />
                  </div>
                </div>

                <div class="corner-picker-group">
                  <span class="sub-picker-label">CTA Text Color</span>
                  <div class="picker-input-wrapper">
                    <input
                      type="color"
                      class="native-color-input"
                      [value]="frame().textColor"
                      (input)="onFrameTextColorChange($any($event.target).value)"
                      aria-label="Frame CTA text color picker"
                    />
                    <input
                      type="text"
                      maxlength="7"
                      class="hex-text-input"
                      [value]="frame().textColor"
                      (input)="onFrameTextColorChange($any($event.target).value)"
                      aria-label="Frame CTA text color hex code"
                    />
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================================== -->
      <!-- 2. SHAPES SECTION                          -->
      <!-- ========================================== -->
      @if (activeSection() === 'all' || activeSection() === 'shapes') {
        <!-- Overall Shape (Silhouette, Badge, Trim) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Overall Shape</span>
            <span class="selection-indicator">{{ currentShapeDef().name }}</span>
          </label>

          <!-- Horizontal Visual Shape Carousel Track -->
          <div class="visual-gallery-wrapper">
            <button
              type="button"
              class="gallery-scroll-arrow left"
              (click)="scrollGallery(shapeTrack, -180)"
              aria-label="Scroll shapes left"
              title="Previous shapes"
            >
              <ts-icon name="chevron-left" />
            </button>

            <div #shapeTrack class="visual-gallery-track custom-scrollbar" tabindex="0" role="region" aria-label="Overall shape options">
              @for (shp of shapeList; track shp.id) {
                <button
                  type="button"
                  class="shape-thumb-card"
                  [class.active]="artShape().shape === shp.id"
                  (click)="onSelectShape(shp.id)"
                  [title]="shp.name + ' — ' + shp.description"
                  [attr.aria-label]="shp.name + ' overall shape'"
                >
                  <div class="shape-thumb-svg-wrap" [innerHTML]="shp.safeThumbnail"></div>
                  <span class="shape-thumb-name">{{ shp.name }}</span>
                  @if (artShape().shape === shp.id) {
                    <div class="active-indicator-pip"></div>
                  }
                </button>
              }
            </div>

            <button
              type="button"
              class="gallery-scroll-arrow right"
              (click)="scrollGallery(shapeTrack, 180)"
              aria-label="Scroll shapes right"
              title="Next shapes"
            >
              <ts-icon name="chevron-right" />
            </button>
          </div>

          <!-- Controls for selected shape (Mode, Strength, Fade) -->
          @if (artShape().shape !== 'square') {
            <div class="shape-controls-card slide-fade-up">
              <!-- Mode Selection (Around | Badge | Trim corners) -->
              <div class="shape-mode-group">
                <span class="sub-picker-label">Shape Mode</span>
                <div class="segmented-control" role="radiogroup" aria-label="Shape Mode">
                  <button
                    type="button"
                    class="seg-btn"
                    [class.active]="artShape().mode === 'around'"
                    (click)="onSelectMode('around')"
                    title="Decorative silhouette field surrounding the QR code"
                  >
                    <span>Around</span>
                  </button>
                  <button
                    type="button"
                    class="seg-btn"
                    [class.active]="artShape().mode === 'badge'"
                    (click)="onSelectMode('badge')"
                    title="QR code set inside a solid shaped badge container"
                  >
                    <span>Badge</span>
                  </button>
                  @if (currentShapeDef().supportsTrim) {
                    <button
                      type="button"
                      class="seg-btn"
                      [class.active]="artShape().mode === 'trim'"
                      (click)="onSelectMode('trim')"
                      title="Soft-crop outer corners while staying scannable"
                    >
                      <span>Trim corners</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Style Strength Control: Safe | Balanced | Bold -->
              <div class="shape-strength-group">
                <div class="strength-header">
                  <span class="sub-picker-label">Style Strength</span>
                  <span class="strength-hint">
                    @switch (artShape().strength) {
                      @case ('safe') { Subtle art, easiest scanning }
                      @case ('balanced') { Recommended balance of style & scan speed }
                      @case ('bold') { Rich, dense silhouette design }
                    }
                  </span>
                </div>
                <div class="segmented-control" role="radiogroup" aria-label="Style Strength">
                  <button
                    type="button"
                    class="seg-btn"
                    [class.active]="artShape().strength === 'safe'"
                    (click)="onSelectStrength('safe')"
                  >
                    <span>Safe</span>
                  </button>
                  <button
                    type="button"
                    class="seg-btn"
                    [class.active]="artShape().strength === 'balanced'"
                    (click)="onSelectStrength('balanced')"
                  >
                    <span>Balanced</span>
                  </button>
                  <button
                    type="button"
                    class="seg-btn"
                    [class.active]="artShape().strength === 'bold'"
                    (click)="onSelectStrength('bold')"
                  >
                    <span>Bold</span>
                  </button>
                </div>
              </div>

              <!-- Subtle Edge Fade Toggle (Around mode only) -->
              @if (artShape().mode === 'around') {
                <div class="fade-edges-row">
                  <label class="toggle-checkbox-label">
                    <input
                      type="checkbox"
                      class="native-checkbox"
                      [checked]="artShape().fadeEdges"
                      (change)="onToggleFadeEdges()"
                    />
                    <span class="toggle-text">Fade toward shape edge</span>
                  </label>
                  <span class="fade-hint">Gently softens outer silhouette dots</span>
                </div>
              }
            </div>
          }
        </div>

        <hr class="design-divider" />

        <!-- Quick Design Presets -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Style Presets</span>
            <span class="selection-indicator">Quick Themes</span>
          </label>
          <div class="template-presets-grid">
            @for (preset of designPresets; track preset.id) {
              <button
                type="button"
                class="template-preset-btn"
                [title]="preset.description"
                [attr.aria-label]="preset.name + ' style preset: ' + preset.description"
                (click)="onSelectPreset(preset)"
              >
                <div class="template-color-preview">
                  <span class="preview-swatch-fg" [style.background-color]="preset.foregroundColor"></span>
                  <span class="preview-swatch-bg" [style.background-color]="preset.backgroundColor"></span>
                </div>
                <div class="template-text">
                  <span class="template-name">{{ preset.name }}</span>
                  <span class="template-sub">{{ preset.dotType }} · {{ preset.cornerSquareType }}</span>
                </div>
              </button>
            }
          </div>
        </div>

        <hr class="design-divider" />

        <!-- Row 1: Matrix Body Dots (Horizontal Visual Glyph Row, No Text Labels) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Body Dots</span>
            <span class="selection-indicator">{{ dotType() }}</span>
          </label>
          <div class="glyph-grid" role="region" aria-label="Body dot shapes">
            @for (opt of dotOptions; track opt.type) {
              <button
                type="button"
                class="glyph-chip-btn"
                [class.active]="dotType() === opt.type"
                (click)="dotTypeChange.emit(opt.type)"
                [title]="'Dot shape: ' + opt.label"
                [attr.aria-label]="'Select ' + opt.label + ' dot shape'"
              >
                <svg viewBox="0 0 24 24" width="28" height="28" class="chip-shape-svg" aria-hidden="true" focusable="false">
                  @switch (opt.type) {
                    @case ('square') {
                      <rect x="3" y="3" width="18" height="18" rx="0" fill="currentColor" />
                    }
                    @case ('dots') {
                      <circle cx="12" cy="12" r="9" fill="currentColor" />
                    }
                    @case ('rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" />
                    }
                    @case ('extra-rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="9" fill="currentColor" />
                    }
                    @case ('classy') {
                      <path d="M 3 12 A 9 9 0 0 1 12 3 L 21 3 L 21 12 A 9 9 0 0 1 12 21 L 3 21 Z" fill="currentColor" />
                    }
                    @case ('classy-rounded') {
                      <path d="M 5 3 L 19 3 A 2 2 0 0 1 21 5 L 21 12 A 9 9 0 0 1 12 21 L 5 21 A 2 2 0 0 1 3 19 L 3 12 A 9 9 0 0 1 12 3 Z" fill="currentColor" />
                    }
                    @case ('diamond') {
                      <polygon points="12,2 22,12 12,22 2,12" fill="currentColor" />
                    }
                    @case ('star') {
                      <polygon points="12,2 14.5,9.5 22,12 14.5,14.5 12,22 9.5,14.5 2,12 9.5,9.5" fill="currentColor" />
                    }
                    @case ('heart') {
                      <path d="M 12 21 C 4 15 2 9 7 4 C 10 2 12 5 12 5 C 12 5 14 2 17 4 C 22 9 20 15 12 21 Z" fill="currentColor" />
                    }
                    @case ('cross') {
                      <polygon points="9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9" fill="currentColor" />
                    }
                    @case ('scanline') {
                      <rect x="2" y="6" width="20" height="12" rx="3" fill="currentColor" />
                    }
                  }
                </svg>
                @if (dotType() === opt.type) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>
        </div>

        <!-- Row 2: Corner Outer Frame (Horizontal Visual Glyph Row, No Text Labels) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Corner Outer Frame</span>
            <span class="selection-indicator">{{ cornerSquareType() }}</span>
          </label>
          <div class="glyph-grid" role="region" aria-label="Corner frame shapes">
            @for (opt of cornerSquareOptions; track opt.type) {
              <button
                type="button"
                class="glyph-chip-btn"
                [class.active]="cornerSquareType() === opt.type"
                (click)="cornerSquareTypeChange.emit(opt.type)"
                [title]="'Corner outer frame: ' + opt.label"
                [attr.aria-label]="'Select ' + opt.label + ' corner locator frame'"
              >
                <svg viewBox="0 0 24 24" width="28" height="28" class="chip-shape-svg" aria-hidden="true" focusable="false">
                  @switch (opt.type) {
                    @case ('square') {
                      <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('extra-rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="6" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('dot') {
                      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('classy') {
                      <path d="M 3 12 A 9 9 0 0 1 12 3 L 21 3 L 21 12 A 9 9 0 0 1 12 21 L 3 21 Z" fill="none" stroke="currentColor" stroke-width="3" />
                    }
                    @case ('classy-rounded') {
                      <path d="M 5 3 L 19 3 A 2 2 0 0 1 21 5 L 21 12 A 9 9 0 0 1 12 21 L 5 21 A 2 2 0 0 1 3 19 L 3 12 A 9 9 0 0 1 12 3 Z" fill="none" stroke="currentColor" stroke-width="3" />
                    }
                    @case ('rounded') {
                      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="3.5" />
                    }
                    @case ('pinch') {
                      <path d="M 3 3 Q 12 7 21 3 Q 17 12 21 21 Q 12 17 3 21 Q 7 12 3 3 Z" fill="none" stroke="currentColor" stroke-width="2.5" />
                    }
                    @case ('shield') {
                      <path d="M 3 3 L 21 3 L 21 14 Q 12 22 12 22 Q 12 22 3 14 Z" fill="none" stroke="currentColor" stroke-width="2.5" />
                    }
                  }
                </svg>
                @if (cornerSquareType() === opt.type) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>
        </div>

        <!-- Row 3: Corner Inner Dot (Horizontal Visual Glyph Row, No Text Labels) -->
        <div class="design-section">
          <label class="design-section-label">
            <span>Corner Inner Dot</span>
            <span class="selection-indicator">{{ cornerDotType() }}</span>
          </label>
          <div class="glyph-grid" role="region" aria-label="Corner dot shapes">
            @for (opt of cornerDotOptions; track opt.type) {
              <button
                type="button"
                class="glyph-chip-btn"
                [class.active]="cornerDotType() === opt.type"
                (click)="cornerDotTypeChange.emit(opt.type)"
                [title]="'Corner inner dot: ' + opt.label"
                [attr.aria-label]="'Select ' + opt.label + ' corner inner dot'"
              >
                <svg viewBox="0 0 24 24" width="28" height="28" class="chip-shape-svg" aria-hidden="true" focusable="false">
                  @switch (opt.type) {
                    @case ('square') {
                      <rect x="4" y="4" width="16" height="16" rx="1" fill="currentColor" />
                    }
                    @case ('dot') {
                      <circle cx="12" cy="12" r="8" fill="currentColor" />
                    }
                    @case ('rounded') {
                      <rect x="4" y="4" width="16" height="16" rx="4" fill="currentColor" />
                    }
                    @case ('extra-rounded') {
                      <rect x="4" y="4" width="16" height="16" rx="8" fill="currentColor" />
                    }
                    @case ('classy') {
                      <path d="M 4 12 A 8 8 0 0 1 12 4 L 20 4 L 20 12 A 8 8 0 0 1 12 20 L 4 20 Z" fill="currentColor" />
                    }
                    @case ('classy-rounded') {
                      <path d="M 6 4 L 18 4 A 2 2 0 0 1 20 6 L 20 12 A 8 8 0 0 1 12 20 L 6 20 A 2 2 0 0 1 4 18 L 4 12 A 8 8 0 0 1 12 4 Z" fill="currentColor" />
                    }
                    @case ('diamond') {
                      <polygon points="12,3 21,12 12,21 3,12" fill="currentColor" />
                    }
                    @case ('star') {
                      <polygon points="12,3 14,9.5 21,12 14,14.5 12,21 10,14.5 3,12 10,9.5" fill="currentColor" />
                    }
                    @case ('heart') {
                      <path d="M 12 20 C 5 15 3 9 7 5 C 10 3 12 6 12 6 C 12 6 14 3 17 5 C 21 9 19 15 12 20 Z" fill="currentColor" />
                    }
                    @case ('cross') {
                      <polygon points="9,3 15,3 15,9 21,9 21,15 15,15 15,21 9,21 9,15 3,15 3,9 9,9" fill="currentColor" />
                    }
                  }
                </svg>
                @if (cornerDotType() === opt.type) {
                  <div class="active-indicator-pip"></div>
                }
              </button>
            }
          </div>
        </div>

        <hr class="design-divider" />

        <!-- Corner Color Customization -->
        <div class="design-section">
          <div class="corner-color-header">
            <label class="design-section-label">
              <span>Corner Accent Colors</span>
            </label>
            <label class="link-colors-toggle">
              <input
                type="checkbox"
                class="qr-checkbox"
                [checked]="linkCornerColors()"
                (change)="toggleLinkCornerColors($event)"
              />
              <span>Match foreground color</span>
            </label>
          </div>

          @if (!linkCornerColors()) {
            <div class="corner-pickers-row slide-fade-up">
              <div class="corner-picker-group">
                <span class="sub-picker-label">Corner Frame</span>
                <div class="picker-input-wrapper">
                  <input
                    type="color"
                    class="native-color-input"
                    [value]="cornerSquareColor() || foregroundColor()"
                    (input)="onCornerSquareColorInput($event)"
                    aria-label="Corner frame color picker"
                  />
                  <input
                    type="text"
                    maxlength="7"
                    class="hex-text-input"
                    [value]="cornerSquareColor() || foregroundColor()"
                    (input)="onCornerSquareHexInput($event)"
                    aria-label="Corner frame hex code"
                  />
                </div>
              </div>

              <div class="corner-picker-group">
                <span class="sub-picker-label">Corner Dot</span>
                <div class="picker-input-wrapper">
                  <input
                    type="color"
                    class="native-color-input"
                    [value]="cornerDotColor() || foregroundColor()"
                    (input)="onCornerDotColorInput($event)"
                    aria-label="Corner dot color picker"
                  />
                  <input
                    type="text"
                    maxlength="7"
                    class="hex-text-input"
                    [value]="cornerDotColor() || foregroundColor()"
                    (input)="onCornerDotHexInput($event)"
                    aria-label="Corner dot hex code"
                  />
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- ========================================== -->
      <!-- 3. LOGO SECTION                            -->
      <!-- ========================================== -->
      @if (activeSection() === 'all' || activeSection() === 'logo') {
        <div class="design-section logo-section">
          <div class="logo-header">
            <label class="design-section-label">
              <span>Center Logo & Branding</span>
            </label>
            @if (logo()) {
              <span hlmBadge variant="outline" class="logo-active-badge">Active</span>
            }
          </div>

          <!-- Expanded Logo Presets (WiFi, Phone, Mail, Link, Star, Heart, Verified, None) -->
          <div class="presets-row">
            <span class="preset-label">Presets:</span>
            @for (preset of logoPresets; track preset.id) {
              <button
                type="button"
                class="preset-chip"
                [class.active]="(preset.dataUrl === null && !logo()) || (logo() === preset.dataUrl)"
                (click)="applyLogoPreset(preset.dataUrl)"
                [title]="'Logo preset: ' + preset.name"
                [attr.aria-label]="'Select ' + preset.name + ' logo preset'"
              >
                <ts-icon [name]="preset.icon" class="preset-icon" />
                <span>{{ preset.name }}</span>
              </button>
            }
          </div>

          <!-- Upload Dropzone (if no logo or to change) -->
          <div
            class="logo-dropzone"
            [class.drag-over]="isDragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="isDragging.set(false)"
            (drop)="onFileDrop($event)"
            (click)="fileInput.click()"
            role="button"
            tabindex="0"
            (keydown.enter)="fileInput.click()"
            aria-label="Upload custom logo file"
          >
            <input
              #fileInput
              type="file"
              accept="image/png, image/jpeg, image/svg+xml"
              class="hidden-file-input"
              (change)="onFileSelected($event)"
            />
            <ts-icon name="upload-cloud" class="dropzone-icon" />
            <div class="dropzone-text">
              <span class="dropzone-primary">Click to upload or drag logo here</span>
              <span class="dropzone-hint">PNG, SVG, or JPEG (Max 2MB)</span>
            </div>
          </div>

          @if (uploadError()) {
            <p class="upload-error-msg" role="alert">
              <ts-icon name="alert-circle" class="error-icon" />
              <span>{{ uploadError() }}</span>
            </p>
          }

          <!-- Active Logo Controls -->
          @if (logo()) {
            <div class="active-logo-card slide-fade-up">
              <div class="logo-preview-row">
                <div class="thumbnail-wrapper">
                  <img [src]="logo()" alt="Logo preview thumbnail" class="logo-thumbnail" />
                </div>
                <div class="logo-info">
                  <span class="logo-status-title">Custom Logo Embedded</span>
                  <span class="logo-status-sub">Centered with automatic white safety buffer</span>
                </div>
                <button
                  type="button"
                  class="remove-logo-btn"
                  (click)="removeLogo()"
                  title="Remove embedded logo"
                  aria-label="Remove embedded logo"
                >
                  <ts-icon name="trash-2" class="remove-icon" />
                  <span>Remove</span>
                </button>
              </div>

              <!-- Size Slider -->
              <div class="logo-slider-group">
                <div class="slider-header">
                  <span class="slider-label">Logo Size</span>
                  <span class="slider-val">{{ (logoSize() * 100).toFixed(0) }}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.45"
                  step="0.01"
                  class="range-slider"
                  [value]="logoSize()"
                  (input)="onLogoSizeChange($event)"
                  aria-label="Logo size scale slider"
                />
              </div>

              <!-- Margin Slider -->
              <div class="logo-slider-group">
                <div class="slider-header">
                  <span class="slider-label">Safety Margin Buffer</span>
                  <span class="slider-val">{{ logoMargin() }}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="1"
                  class="range-slider"
                  [value]="logoMargin()"
                  (input)="onLogoMarginChange($event)"
                  aria-label="Logo margin buffer slider"
                />
              </div>
            </div>
          }
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
      min-height: 0;
      box-sizing: border-box;
    }

    .qr-design-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      flex: 1 1 auto;
      min-height: min-content;
    }

    .design-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      flex: 0 0 auto;
    }

    .design-section.logo-section {
      flex: 1 1 auto;
      min-height: 200px;
    }

    .design-section-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      letter-spacing: -0.01em;
    }

    .selection-indicator {
      font-size: 12px;
      font-family: var(--ts-font-mono, monospace);
      color: var(--tool-accent, #60a5fa);
      text-transform: capitalize;
    }

    .design-divider {
      border: none;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    /* Template Presets Grid */
    .template-presets-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      width: 100%;
    }

    .template-preset-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      min-height: 44px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      overflow: hidden;
      box-sizing: border-box;
      transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
    }

    .template-preset-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      transform: translateY(-1px);
    }

    .template-preset-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .template-color-preview {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    .preview-swatch-fg,
    .preview-swatch-bg {
      width: 50%;
      height: 100%;
    }

    .template-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .template-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .template-sub {
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      text-transform: capitalize;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Visual Gallery (Horizontal Scroll Track with Arrow Controls) */
    .visual-gallery-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      gap: 4px;
    }

    .gallery-scroll-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 38px;
      border-radius: 6px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
      cursor: pointer;
      flex-shrink: 0;
      transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
    }

    .gallery-scroll-arrow:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.12));
      color: var(--text, #ffffff);
      border-color: var(--border-strong, rgba(255, 255, 255, 0.2));
    }

    .gallery-scroll-arrow:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .visual-gallery-track {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding: 4px 2px;
      scroll-behavior: smooth;
      flex: 1 1 0%;
      min-width: 0;
      -webkit-overflow-scrolling: touch;
    }

    /* Decorative Frames Grid (5-6 per row, no horizontal scrolling) */
    .frames-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 768px) {
      .frames-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
      }
    }

    @media (max-width: 540px) {
      .frames-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
    }

    @media (max-width: 380px) {
      .frames-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }
    }

    /* Frame Visual Thumbnails (5-6 in one row, slightly bigger, tooltip on hover) */
    .frame-thumb-card {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 86px;
      padding: 6px;
      border-radius: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      position: relative;
      transition: all 150ms ease;
      box-sizing: border-box;
    }

    .frame-thumb-card:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      transform: translateY(-1px);
    }

    .frame-thumb-card.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.25);
    }

    .frame-thumb-card:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .frame-thumb-card .active-indicator-pip {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
    }

    .frame-thumb-svg-wrap {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .frame-thumb-svg-wrap svg {
      width: 100%;
      height: 100%;
      max-height: 70px;
      object-fit: contain;
    }

    /* Overall Shape Thumbnails & Controls */
    .shape-thumb-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      padding: 6px 4px 4px 4px;
      border-radius: 10px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      flex-shrink: 0;
      position: relative;
      transition: all 150ms ease;
      box-sizing: border-box;
      gap: 4px;
    }

    .shape-thumb-card:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      transform: translateY(-1px);
    }

    .shape-thumb-card.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.25);
    }

    .shape-thumb-card:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .shape-thumb-svg-wrap {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .shape-thumb-name {
      font-size: 10.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 64px;
    }

    .shape-controls-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
    }

    .shape-mode-group,
    .shape-strength-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .segmented-control {
      display: flex;
      align-items: center;
      background: var(--surface-1, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      padding: 2.5px;
      gap: 2.5px;
    }

    .seg-btn {
      flex: 1;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      transition: background 150ms ease, color 150ms ease;
    }

    .seg-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
    }

    .seg-btn.active {
      background: var(--tool-accent, #3b82f6);
      color: #ffffff;
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    }

    .strength-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    .strength-hint {
      font-size: 11px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    .fade-edges-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6px;
      border-top: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .toggle-checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 12px;
      color: var(--text, #ffffff);
    }

    .native-checkbox {
      width: 16px;
      height: 16px;
      accent-color: var(--tool-accent, #3b82f6);
      cursor: pointer;
    }

    .fade-hint {
      font-size: 11px;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    /* Real Shape Glyph Grid & Larger Responsive Chips */
    .glyph-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
      gap: 8px;
      width: 100%;
    }

    .glyph-chip-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      height: 56px;
      border-radius: 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1.5px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      position: relative;
      transition: all 150ms ease;
      box-sizing: border-box;
    }

    .glyph-chip-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--text, #ffffff);
      transform: translateY(-1px);
    }

    .glyph-chip-btn.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.25);
    }

    .glyph-chip-btn:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .chip-shape-svg {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      color: currentColor;
    }

    .active-indicator-pip {
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--tool-accent, #3b82f6);
      pointer-events: none;
    }

    /* Frame Controls Card */
    .frame-controls-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
      background: var(--surface-2, rgba(0, 0, 0, 0.2));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
    }

    .frame-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Dual-Theme Input Formatting: #FFFFFF in Light Mode, var(--surface-2) in Dark Mode */
    .frame-text-input {
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.15));
      background: #ffffff;
      color: var(--text, #111827);
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    :host-context([data-theme='dark']) .frame-text-input,
    :host-context(.dark) .frame-text-input {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border-color: var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
    }

    .frame-text-input:focus {
      border-color: var(--tool-accent, #3b82f6);
      box-shadow: 0 0 0 2px var(--tool-accent-soft, rgba(59, 130, 246, 0.2));
    }

    /* Corner Pickers Row */
    .corner-pickers-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .corner-picker-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .sub-picker-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.6)));
    }

    .picker-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #ffffff;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.15));
      border-radius: 8px;
      padding: 4px 8px;
      transition: border-color 150ms ease;
    }

    :host-context([data-theme='dark']) .picker-input-wrapper,
    :host-context(.dark) .picker-input-wrapper {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border-color: var(--border, rgba(255, 255, 255, 0.12));
    }

    .native-color-input {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 0;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .hex-text-input {
      width: 100%;
      border: none;
      background: transparent;
      color: var(--text, #111827);
      font-family: var(--ts-font-mono, monospace);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      outline: none;
    }

    :host-context([data-theme='dark']) .hex-text-input,
    :host-context(.dark) .hex-text-input {
      color: var(--text, #fcfcfc);
    }

    /* Presets Row */
    .presets-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .preset-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
      text-transform: uppercase;
    }

    .preset-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 9999px;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease;
    }

    .preset-chip:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--text, #ffffff);
    }

    .preset-chip.active {
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--tool-accent, #3b82f6);
      color: var(--tool-accent, #60a5fa);
      font-weight: 650;
    }

    .preset-chip:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .preset-icon {
      width: 12px;
      height: 12px;
    }

    /* Corner Color Toggle */
    .corner-color-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .link-colors-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.75)));
      cursor: pointer;
    }

    .qr-checkbox {
      accent-color: var(--tool-accent, #3b82f6);
      width: 14px;
      height: 14px;
      cursor: pointer;
    }

    /* Logo Section Styles */
    .logo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-active-badge {
      font-size: 11px;
      border-color: var(--tool-accent-border, rgba(59, 130, 246, 0.4));
      color: var(--tool-accent, #60a5fa);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
    }

    .logo-ec-callout {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.2));
    }

    .ec-callout-icon {
      width: 16px;
      height: 16px;
      color: var(--tool-accent, #60a5fa);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .ec-callout-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ec-callout-title {
      font-size: 12px;
      font-weight: 650;
      color: var(--tool-accent, #60a5fa);
    }

    .ec-callout-desc {
      font-size: 11px;
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.75)));
      line-height: 1.35;
    }

    /* Logo Dropzone */
    .logo-dropzone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 32px 20px;
      background: var(--surface-2, rgba(0, 0, 0, 0.2));
      border: 1.5px dashed var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 12px;
      cursor: pointer;
      transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
      flex: 1 1 auto;
      min-height: 200px;
      text-align: center;
    }

    .logo-dropzone:hover,
    .logo-dropzone.drag-over {
      border-color: var(--tool-accent, #3b82f6);
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.08));
    }

    .logo-dropzone:focus-visible {
      outline: 2px solid var(--tool-accent, #3b82f6);
      outline-offset: 1px;
    }

    .dropzone-icon {
      width: 40px;
      height: 40px;
      color: var(--tool-accent, var(--accent, #3b82f6));
      flex-shrink: 0;
      opacity: 0.85;
      transition: transform 150ms ease;
    }

    .logo-dropzone:hover .dropzone-icon {
      transform: scale(1.08);
      opacity: 1;
    }

    .dropzone-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: center;
    }

    .dropzone-primary {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .dropzone-hint {
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
    }

    .hidden-file-input {
      display: none;
    }

    .upload-error-msg {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #ef4444;
    }

    .error-icon {
      width: 14px;
      height: 14px;
    }

    /* Active Logo Card */
    .active-logo-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--surface-2, rgba(0, 0, 0, 0.25));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      padding: 12px;
    }

    .logo-preview-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .thumbnail-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: #ffffff;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .logo-thumbnail {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .logo-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1 1 0%;
      min-width: 0;
    }

    .logo-status-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .logo-status-sub {
      font-size: 11px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.5)));
    }

    .remove-logo-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .remove-logo-btn:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .remove-icon {
      width: 12px;
      height: 12px;
    }

    .logo-slider-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slider-label {
      font-size: 11.5px;
      color: var(--text-muted, var(--text-3, rgba(255, 255, 255, 0.6)));
    }

    .slider-val {
      font-size: 11px;
      font-weight: 600;
      font-family: var(--ts-font-mono, monospace);
      color: var(--tool-accent, #60a5fa);
    }

    .range-slider {
      width: 100%;
      accent-color: var(--tool-accent, #3b82f6);
      cursor: pointer;
      height: 4px;
    }

    /* Custom Scrollbar for visual gallery tracks */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: var(--border, rgba(255, 255, 255, 0.12)) transparent;
    }

    .custom-scrollbar::-webkit-scrollbar {
      height: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border, rgba(255, 255, 255, 0.15));
      border-radius: 4px;
    }

    @keyframes slideFadeUp {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .slide-fade-up {
      animation: slideFadeUp 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @media (prefers-reduced-motion: reduce) {
      .slide-fade-up,
      .frame-thumb-card,
      .glyph-chip-btn,
      .template-preset-btn,
      * {
        animation: none !important;
        transition-duration: 0.01ms !important;
        transform: none !important;
      }
    }
  `]
})
export class DesignCustomizerComponent {
  private readonly sanitizer = inject(DomSanitizer);

  // Mini vector QR placeholder used inside illustrated frame thumbnails
  private readonly MINI_QR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="3" width="2" height="2"/><rect x="13" y="3" width="2" height="2"/><rect x="10" y="7" width="2" height="2"/><rect x="10" y="11" width="2" height="2"/><rect x="14" y="11" width="2" height="2"/><rect x="10" y="15" width="2" height="2"/><rect x="14" y="15" width="2" height="2"/><rect x="18" y="15" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/><rect x="18" y="19" width="2" height="2"/></svg>`;

  private readonly SAFE_PREVIEW_QR_DATA_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6"><rect x="2" y="2" width="6" height="6" rx="1"/><rect x="16" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="3" width="2" height="2"/><rect x="13" y="3" width="2" height="2"/><rect x="10" y="7" width="2" height="2"/><rect x="10" y="11" width="2" height="2"/><rect x="14" y="11" width="2" height="2"/><rect x="10" y="15" width="2" height="2"/><rect x="14" y="15" width="2" height="2"/><rect x="18" y="15" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/><rect x="18" y="19" width="2" height="2"/></svg>');

  readonly activeSection = input<'all' | 'shapes' | 'logo' | 'frame'>('all');
  readonly artShape = input<QrArtShapeOptions>(DEFAULT_ART_SHAPE_OPTIONS);
  readonly dotType = input<QrDotType>('square');
  readonly cornerSquareType = input<QrCornerSquareType>('square');
  readonly cornerDotType = input<QrCornerDotType>('square');
  readonly foregroundColor = input<string>('#000000');
  readonly cornerSquareColor = input<string | null>(null);
  readonly cornerDotColor = input<string | null>(null);
  readonly logo = input<string | null>(null);
  readonly logoSize = input<number>(0.35);
  readonly logoMargin = input<number>(4);
  readonly frame = input<QrFrameOptions>(DEFAULT_FRAME_OPTIONS);

  readonly artShapeChange = output<QrArtShapeOptions>();
  readonly dotTypeChange = output<QrDotType>();
  readonly cornerSquareTypeChange = output<QrCornerSquareType>();
  readonly cornerDotTypeChange = output<QrCornerDotType>();
  readonly cornerSquareColorChange = output<string | null>();
  readonly cornerDotColorChange = output<string | null>();
  readonly logoChange = output<string | null>();
  readonly logoSizeChange = output<number>();
  readonly logoMarginChange = output<number>();
  readonly frameChange = output<QrFrameOptions>();
  readonly presetApply = output<DesignPreset>();

  readonly shapeList: Array<QrShapeDefinition & { safeThumbnail: SafeHtml }> = QR_ART_SHAPES.map(s => ({
    ...s,
    safeThumbnail: this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 32 32" width="28" height="28" class="shape-thumb-svg" aria-hidden="true">${s.previewSvg}</svg>`
    )
  }));

  readonly currentShapeDef = computed<QrShapeDefinition>(() =>
    getQrShapeById(this.artShape().shape)
  );

  readonly designPresets = DESIGN_PRESETS;
  readonly linkCornerColors = signal<boolean>(true);
  readonly isDragging = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);
  readonly logoPresets = PRESET_LOGOS;

  readonly frameList: Array<QrFrameDefinition & { safeThumbnail: SafeHtml }> = QR_FRAME_TEMPLATES.map(tpl => {
    const rawSvg = tpl.id === 'none'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%"><rect x="24" y="24" width="252" height="252" rx="16" fill="none" stroke="currentColor" stroke-dasharray="8,8" stroke-width="6"/><g transform="translate(50, 50) scale(8.3)">${this.MINI_QR}</g></svg>`
      : tpl.renderSvg({
          primaryColor: 'currentColor',
          textColor: 'currentColor',
          text: 'SCAN',
          qrDataUrl: this.SAFE_PREVIEW_QR_DATA_URL
        });

    return {
      ...tpl,
      safeThumbnail: this.sanitizer.bypassSecurityTrustHtml(rawSvg)
    };
  });

  readonly selectedFrameName = computed<string>(() => {
    const currentStyle = this.frame().style;
    const found = QR_FRAME_TEMPLATES.find(f => f.id === currentStyle);
    return found ? found.name : 'No Frame';
  });

  readonly dotOptions: { type: QrDotType; label: string }[] = [
    { type: 'square', label: 'Square' },
    { type: 'dots', label: 'Dots' },
    { type: 'rounded', label: 'Rounded' },
    { type: 'extra-rounded', label: 'Pills' },
    { type: 'classy', label: 'Leaf' },
    { type: 'classy-rounded', label: 'Soft Leaf' },
    { type: 'diamond', label: 'Diamond' },
    { type: 'star', label: 'Star' },
    { type: 'heart', label: 'Heart' },
    { type: 'cross', label: 'Cross' },
    { type: 'scanline', label: 'Scanline' }
  ];

  readonly cornerSquareOptions: { type: QrCornerSquareType; label: string }[] = [
    { type: 'square', label: 'Square' },
    { type: 'extra-rounded', label: 'Rounded' },
    { type: 'dot', label: 'Circle' },
    { type: 'classy', label: 'Leaf' },
    { type: 'classy-rounded', label: 'Soft Leaf' },
    { type: 'rounded', label: 'Smooth' },
    { type: 'pinch', label: 'Pinch' },
    { type: 'shield', label: 'Shield' }
  ];

  readonly cornerDotOptions: { type: QrCornerDotType; label: string }[] = [
    { type: 'square', label: 'Square' },
    { type: 'dot', label: 'Circle' },
    { type: 'rounded', label: 'Smooth' },
    { type: 'extra-rounded', label: 'Pill' },
    { type: 'classy', label: 'Leaf' },
    { type: 'classy-rounded', label: 'Soft Leaf' },
    { type: 'diamond', label: 'Diamond' },
    { type: 'star', label: 'Star' },
    { type: 'heart', label: 'Heart' },
    { type: 'cross', label: 'Cross' }
  ];

  readonly ctaSuggestions: string[] = [
    'SCAN ME',
    'VISIT WEBSITE',
    'VIEW MENU',
    'CONNECT WI-FI',
    'SAVE CONTACT',
    'GET OFFER'
  ];

  scrollGallery(track: HTMLElement, delta: number): void {
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }

  onFrameStyleSelect(style: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      style: style as QrFrameStyle
    });
  }

  onFrameTextChange(text: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      text
    });
  }

  onFrameColorChange(color: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      color
    });
  }

  onFrameTextColorChange(textColor: string): void {
    const current = this.frame();
    this.frameChange.emit({
      ...current,
      textColor
    });
  }

  onSelectPreset(preset: DesignPreset): void {
    this.presetApply.emit(preset);
  }

  toggleLinkCornerColors(event: Event): void {
    const isLinked = (event.target as HTMLInputElement).checked;
    this.linkCornerColors.set(isLinked);
    if (isLinked) {
      this.cornerSquareColorChange.emit(null);
      this.cornerDotColorChange.emit(null);
    }
  }

  onCornerSquareColorInput(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.cornerSquareColorChange.emit(color);
  }

  onCornerSquareHexInput(event: Event): void {
    const hex = (event.target as HTMLInputElement).value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.cornerSquareColorChange.emit(hex);
    }
  }

  onCornerDotColorInput(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.cornerDotColorChange.emit(color);
  }

  onCornerDotHexInput(event: Event): void {
    const hex = (event.target as HTMLInputElement).value.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.cornerDotColorChange.emit(hex);
    }
  }

  applyLogoPreset(dataUrl: string | null): void {
    this.uploadError.set(null);
    this.logoChange.emit(dataUrl);
  }

  removeLogo(): void {
    this.uploadError.set(null);
    this.logoChange.emit(null);
  }

  onLogoSizeChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.logoSizeChange.emit(val);
  }

  onLogoMarginChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.logoMarginChange.emit(val);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    this.uploadError.set(null);

    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      this.uploadError.set('Please upload a valid PNG, JPEG, or SVG image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.uploadError.set('Image size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.logoChange.emit(reader.result);
      }
    };
    reader.onerror = () => {
      this.uploadError.set('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }

  onSelectShape(shapeId: QrOverallShape): void {
    const def = getQrShapeById(shapeId);
    let nextMode = this.artShape().mode;
    if (nextMode === 'trim' && !def.supportsTrim) {
      nextMode = 'around';
    }
    this.artShapeChange.emit({
      ...this.artShape(),
      shape: shapeId,
      mode: nextMode
    });
  }

  onSelectMode(mode: QrShapeMode): void {
    this.artShapeChange.emit({
      ...this.artShape(),
      mode
    });
  }

  onSelectStrength(strength: QrStyleStrength): void {
    this.artShapeChange.emit({
      ...this.artShape(),
      strength
    });
  }

  onToggleFadeEdges(): void {
    this.artShapeChange.emit({
      ...this.artShape(),
      fadeEdges: !this.artShape().fadeEdges
    });
  }
}
