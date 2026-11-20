// apps/tool-image-compressor/src/components/upload-landing/upload-landing.component.ts
import { Component, ChangeDetectionStrategy, output, ElementRef, viewChild, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '@acklet/tool-shell';
import { RotatingHeadingComponent } from '../rotating-heading/rotating-heading.component';
import { DeveloperPresetKey } from '../../models/compressor.models';
import { COMPRESSOR_CONFIG } from '../../config/compressor.config';
import { HERO_LINES } from '../../config/hero-lines.config';
import { CompressorTelemetryService } from '../../services/compressor-telemetry.service';
import { SOURCE_ICONS } from '../../config/source-icons.config';

export interface PopularPresetChip {
  key: DeveloperPresetKey;
  label: string;
}

@Component({
  selector: 'app-upload-landing',
  standalone: true,
  imports: [CommonModule, TsIconComponent, RotatingHeadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.touch-device]': 'isTouchDevice()'
  },
  template: `
    <div class="landing-hero-area">
      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg,.svgz,.heic,.heif,.jxl,.tiff,.tif,.psd,.psb,.eps,.ps,.ai,.cdr,.cmx,.ico,.icns,.cur,.dng,.cr2,.cr3,.nef,.arw,.raf,.orf,.rw2,.pef,.tga,.dds,.pcx,.qoi,.ppm,.pgm,.pbm,.hdr,.exr,.fits,.fit,.xcf,.ora,.kra"
        class="hidden-file-input"
        (change)="onFileSelected($event)"
        aria-hidden="true"
        tabindex="-1"
      />

      <!-- 1. Single Rotating Hero Headline -->
      <app-rotating-heading
        [lines]="heroLines"
        [interval]="5000"
        class="hero-rotating-heading"
      ></app-rotating-heading>

      <!-- 2. Primary Select Button & Source Menu Group -->
      <div class="hero-action-group">
        <div
          #interactiveArea
          class="select-interactive-area"
          (mouseenter)="onPointerEnter($event)"
          (mouseleave)="onPointerLeave()"
          (focusin)="onFocusIn()"
          (focusout)="onFocusOut($event)"
          (keydown.escape)="onEscape($event)"
        >
          <div class="select-row-container">
            <!-- Anchor wrapper for Select Images button and chevron dropdown -->
            <div class="select-btn-anchor-wrapper">
              <div class="hero-select-control-group">
                <button
                  #selectBtn
                  type="button"
                  class="hero-select-btn"
                  (click)="openFilePicker()"
                  aria-label="Select Images to compress"
                >
                  <ts-icon name="plus" [size]="16" class="btn-icon" />
                  <span class="btn-label-text">Select Images</span>
                </button>

                <button
                  type="button"
                  class="hero-select-chevron-btn"
                  (click)="toggleMenuFromChevron($event)"
                  (keydown.enter)="toggleMenuFromChevron($event)"
                  (keydown.space)="toggleMenuFromChevron($event); $event.preventDefault()"
                  aria-haspopup="menu"
                  [attr.aria-expanded]="isMenuOpen()"
                  aria-controls="home-source-vertical-menu"
                  aria-label="More upload options"
                  title="More sources"
                >
                  <ts-icon [name]="isMenuOpen() ? 'chevron-up' : 'chevron-down'" [size]="14" />
                </button>
              </div>

              <!-- Vertical Source Menu (4 options: This device, Google Drive, Dropbox, Clipboard) -->
              @if (isMenuOpen() || isMenuClosing()) {
                <div
                  #sourceMenu
                  id="home-source-vertical-menu"
                  class="source-vertical-menu"
                  [class.is-closing]="isMenuClosing()"
                  [class.reduced-motion]="isReducedMotion()"
                  role="menu"
                  aria-label="Image source options"
                  (click)="$event.stopPropagation()"
                  (keydown)="onMenuKeydown($event)"
                >
                  @for (src of availableSources; track src.id; let idx = $index) {
                    <div class="menu-item-row" [style.--item-index]="idx" role="none">
                      <button
                        type="button"
                        class="menu-item-btn"
                        role="menuitem"
                        [attr.aria-label]="src.ariaLabel"
                        [title]="src.isConfigured ? src.tooltip : 'Not set up yet'"
                        [class.is-unconfigured]="!src.isConfigured"
                        (click)="onSourceClick(src, $event)"
                      >
                        <span class="item-icon-circle">
                          @if (src.logo) {
                            <img [src]="src.logo" [alt]="" aria-hidden="true" class="item-brand-logo" />
                          } @else {
                            <ts-icon [name]="src.icon" [size]="16" />
                          }
                        </span>
                        <span class="item-label">{{ src.label }}</span>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        @if (pasteToastMessage()) {
          <div class="paste-toast" role="status" aria-live="polite">
            {{ pasteToastMessage() }}
          </div>
        }

        <p class="hero-subtitle">Works with PNG, JPG, WebP, AVIF, HEIC and other.</p>
      </div>

      <!-- 3. Popular Presets Crossfade Stage (Synchronized 3-Second Cycle matching Image Converter) -->
      <div
        class="popular-conversions-wrapper"
        (mouseenter)="onPopularMouseEnter()"
        (mouseleave)="onPopularMouseLeave()"
        (focusin)="onPopularFocusIn()"
        (focusout)="onPopularFocusOut()"
      >
        <span class="popular-section-label">POPULAR COMPRESSIONS</span>
        <div class="popular-crossfade-stage" role="region" aria-label="Popular image compressions">
          <!-- Previous Group (Fading & Drifting Out during transition) -->
          @if (previousGroupIndex() !== null && !isReducedMotion()) {
            <div class="popular-grid-group is-exiting" aria-hidden="true">
              @for (chip of popularGroups[previousGroupIndex()!]; track chip.key) {
                <button
                  type="button"
                  tabindex="-1"
                  class="popular-chip-btn"
                >
                  <span class="popular-chip-name">{{ chip.label }}</span>
                </button>
              }
            </div>
          }

          <!-- Current Active Group (Fading & Coming in) -->
          <div
            class="popular-grid-group"
            [class.is-entering]="previousGroupIndex() !== null && !isReducedMotion()"
          >
            @for (chip of popularGroups[currentGroupIndex()]; track chip.key) {
              <button
                type="button"
                class="popular-chip-btn"
                (click)="onSelectChip(chip.key)"
                [title]="'Apply ' + chip.label + ' preset and choose images'"
                [attr.aria-label]="chip.label + ' compression preset'"
              >
                <span class="popular-chip-name">{{ chip.label }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .landing-hero-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: calc(100vh - 180px);
      text-align: center;
      box-sizing: border-box;
      padding: 32px 16px 48px;
    }

    .hidden-file-input {
      display: none;
    }

    /* 1. Hero Headline */
    .hero-rotating-heading,
    app-rotating-heading {
      margin-bottom: 24px;
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
    }

    .hero-rotating-heading:focus,
    .hero-rotating-heading:focus-visible,
    app-rotating-heading:focus,
    app-rotating-heading:focus-visible {
      outline: none !important;
      border: none !important;
      box-shadow: none !important;
    }

    /* 2. Primary Select Button & Tagline */
    .hero-action-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      margin-bottom: 32px;
      position: relative;
    }

    .select-interactive-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      width: 100%;
      max-width: 480px;
    }

    .select-row-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      position: relative;
    }

    .select-btn-anchor-wrapper {
      position: relative;
      display: inline-flex;
    }

    /* Corner Plus Button (Desktop, hover devices) */
    .corner-plus-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      background: #FFFFFF;
      color: var(--color-primary-600, #2563EB);
      border: none !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      cursor: pointer;
      z-index: 25;
      animation: plus-fade-in 0.2s ease-out;
      transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      outline: none;
    }

    .corner-plus-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .corner-plus-btn:focus-visible {
      outline: 2px solid var(--accent, #2563EB);
      outline-offset: 2px;
    }

    .corner-plus-btn.is-active {
      background: var(--bg-canvas, #EFF6FF);
      color: var(--color-primary-700, #1D4ED8);
    }

    .corner-plus-btn.is-closing {
      animation: plus-fade-out 0.15s ease-out forwards;
    }

    /* Dark theme styling for corner plus button */
    :host-context([data-theme="dark"]) .corner-plus-btn,
    [data-theme="dark"] :host .corner-plus-btn,
    [data-theme="dark"] .corner-plus-btn {
      background: #1E293B;
      color: #60A5FA;
      border: none !important;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.5);
    }

    :host-context([data-theme="dark"]) .corner-plus-btn:hover,
    [data-theme="dark"] :host .corner-plus-btn:hover,
    [data-theme="dark"] .corner-plus-btn:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
    }

    :host-context([data-theme="dark"]) .corner-plus-btn.is-active,
    [data-theme="dark"] :host .corner-plus-btn.is-active,
    [data-theme="dark"] .corner-plus-btn.is-active {
      background: #334155;
      color: #93C5FD;
    }

    :host-context([data-theme="dark"]) .corner-plus-btn:focus-visible,
    [data-theme="dark"] :host .corner-plus-btn:focus-visible,
    [data-theme="dark"] .corner-plus-btn:focus-visible {
      outline: 2px solid #60A5FA;
      outline-offset: 2px;
    }

    @keyframes plus-fade-in {
      0% {
        opacity: 0;
        transform: scale(0.7);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes plus-fade-out {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0.7);
      }
    }

    /* Desktop 'Upload from' text button */
    .upload-from-text-btn {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #64748B);
      background: transparent;
      border: none;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
      padding: 6px 4px;
      transition: color 0.15s ease;
      display: inline-flex;
      align-items: center;
    }

    .upload-from-text-btn:hover {
      color: var(--color-primary-600, #2563EB);
    }

    :host-context([data-theme="dark"]) .upload-from-text-btn,
    [data-theme="dark"] :host .upload-from-text-btn,
    [data-theme="dark"] .upload-from-text-btn {
      color: #94A3B8;
    }

    :host-context([data-theme="dark"]) .upload-from-text-btn:hover,
    [data-theme="dark"] :host .upload-from-text-btn:hover,
    [data-theme="dark"] .upload-from-text-btn:hover {
      color: #60A5FA;
    }

    /* Mobile Chevron inside Select Images button */
    .mobile-source-toggle-chevron {
      display: none;
    }

    /* Vertical Source Menu */
    .source-vertical-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: -8px;
      min-width: 220px;
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-subtle, #E2E8F0);
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: dropdown-slide-in 0.15s ease-out;
    }

    .source-vertical-menu.is-closing {
      animation: dropdown-slide-out 0.15s ease-out forwards;
    }

    :host-context([data-theme="dark"]) .source-vertical-menu,
    [data-theme="dark"] :host .source-vertical-menu,
    [data-theme="dark"] .source-vertical-menu {
      background: var(--bg-surface-dark, #1E293B);
      border-color: var(--border-subtle-dark, #334155);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
    }

    @keyframes dropdown-slide-in {
      0% {
        opacity: 0;
        transform: translateY(-4px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes dropdown-slide-out {
      0% {
        opacity: 1;
        transform: translateY(0);
      }
      100% {
        opacity: 0;
        transform: translateY(-4px);
      }
    }

    .menu-item-row {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .menu-item-btn {
      min-height: 44px;
      height: 44px;
      width: 100%;
      display: flex;
      align-items: center;
      padding: 0 12px;
      border-radius: 8px;
      border: none !important;
      background: transparent;
      color: var(--text-primary, #0F172A);
      cursor: pointer;
      gap: 12px;
      text-align: left;
      transition: background 0.15s ease, color 0.15s ease;
      outline: none;
    }

    .menu-item-btn:hover:not(.is-unconfigured) {
      background: var(--bg-canvas, #F1F5F9);
    }

    .menu-item-btn:focus-visible {
      outline: 2px solid var(--accent, #2563EB) !important;
      outline-offset: -1px;
    }

    .menu-item-btn.is-unconfigured {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .menu-item-btn.is-unconfigured:hover {
      background: transparent;
    }

    :host-context([data-theme="dark"]) .menu-item-btn,
    [data-theme="dark"] :host .menu-item-btn,
    [data-theme="dark"] .menu-item-btn {
      color: #F8FAFC;
    }

    :host-context([data-theme="dark"]) .menu-item-btn:hover:not(.is-unconfigured) {
      background: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="dark"]) .menu-item-btn:focus-visible {
      outline: 2px solid #60A5FA !important;
      outline-offset: -1px;
    }

    :host-context([data-theme="dark"]) .menu-item-btn.is-unconfigured:hover {
      background: transparent;
    }

    .item-icon-circle {
      width: 32px;
      height: 32px;
      border-radius: 9999px;
      background: var(--bg-canvas, #F8FAFC);
      border: none !important;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary-600, #2563EB);
      flex-shrink: 0;
      transition: transform 0.15s ease;
    }

    .item-brand-logo {
      width: 18px;
      height: 18px;
      object-fit: contain;
      display: block;
    }

    .menu-item-btn:hover:not(.is-unconfigured) .item-icon-circle {
      transform: scale(1.08);
    }

    :host-context([data-theme="dark"]) .item-icon-circle,
    [data-theme="dark"] :host .item-icon-circle,
    [data-theme="dark"] .item-icon-circle {
      background: #0F172A;
      border: none !important;
      color: #60A5FA;
    }

    .item-label {
      font-size: 13px;
      font-weight: 500;
      flex: 1;
    }

    @media (max-width: 767px), (hover: none), (pointer: coarse) {
      .upload-from-text-btn,
      .corner-plus-btn,
      .corner-sources-badge-group,
      .source-fan-cluster {
        display: none !important;
      }

      .mobile-source-toggle-chevron {
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        border-radius: 9999px;
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        margin: 0;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: inherit;
        cursor: pointer;
        transition: background 0.15s ease;
        z-index: 5;
      }

      .mobile-source-toggle-chevron:hover,
      .mobile-source-toggle-chevron:active {
        background: rgba(255, 255, 255, 0.35);
      }

      .source-vertical-menu {
        left: 0 !important;
        right: 0 !important;
        transform: none !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        z-index: 100;
        box-sizing: border-box;
        animation: dropdown-slide-in 0.15s ease-out;
      }

      .source-vertical-menu.is-closing {
        animation: dropdown-slide-out 0.15s ease-out forwards;
      }

      .menu-item-btn {
        min-height: 44px;
      }
    }

    @keyframes dropdown-slide-in-mobile {
      0% {
        opacity: 0;
        transform: translate(-50%, -4px);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    }

    @keyframes dropdown-slide-out-mobile {
      0% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -4px);
      }
    }

    /* Explicit touch device support (tablets, iPads, touchscreen laptops) */
    :host(.touch-device) .corner-plus-btn,
    .touch-device .corner-plus-btn {
      display: none !important;
    }

    :host(.touch-device) .mobile-source-toggle-chevron,
    .touch-device .mobile-source-toggle-chevron {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      margin-left: 8px;
      margin-right: -14px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: inherit;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    :host(.touch-device) .mobile-source-toggle-chevron:hover,
    :host(.touch-device) .mobile-source-toggle-chevron:active,
    .touch-device .mobile-source-toggle-chevron:hover,
    .touch-device .mobile-source-toggle-chevron:active {
      background: rgba(255, 255, 255, 0.35);
    }

    :host(.touch-device) .source-vertical-menu,
    .touch-device .source-vertical-menu {
      left: 0 !important;
      right: 0 !important;
      transform: none !important;
      width: 100% !important;
      animation: dropdown-slide-in 0.15s ease-out;
    }

    :host(.touch-device) .source-vertical-menu.is-closing,
    .touch-device .source-vertical-menu.is-closing {
      animation: dropdown-slide-out-mobile 0.15s ease-out forwards;
    }

    :host(.touch-device) .menu-item-btn,
    .touch-device .menu-item-btn {
      min-height: 44px;
    }

    @media (prefers-reduced-motion: reduce) {
      .corner-plus-btn,
      .corner-plus-btn.is-closing,
      .source-vertical-menu,
      .source-vertical-menu.is-closing,
      .menu-item-row {
        animation: none !important;
        transition: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
      .source-vertical-menu {
        transform: none !important;
      }
      @media (max-width: 767px), (hover: none), (pointer: coarse) {
        .source-vertical-menu {
          transform: translateX(-50%) !important;
        }
      }
    }

    .corner-plus-btn.reduced-motion,
    .source-vertical-menu.reduced-motion {
      animation: none !important;
      transition: none !important;
      opacity: 1 !important;
    }

    .paste-toast {
      position: absolute;
      top: 52px;
      left: 50%;
      transform: translateX(-50%);
      background: #1E293B;
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 9999px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      z-index: 50;
      white-space: nowrap;
      animation: fadeIn 0.2s ease-out;
    }

    .hero-select-control-group {
      position: relative;
      display: inline-flex;
      align-items: stretch;
      height: var(--tool-cta-height, 48px);
      border-radius: var(--tool-radius-pill, 999px);
      background: var(--tool-accent, #2563EB);
      color: var(--tool-accent-contrast, #FFFFFF);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
      overflow: hidden;
    }

    .hero-select-control-group:hover {
      background: color-mix(in srgb, var(--tool-accent, #2563EB) 88%, #000000);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }

    .hero-select-control-group:focus-within,
    .hero-select-control-group:has(:focus-visible) {
      outline-offset: 2px;
    }

    :host-context([data-theme="dark"]) .hero-select-control-group:focus-within,
    [data-theme="dark"] .hero-select-control-group:focus-within,
    :host-context([data-theme="dark"]) .hero-select-control-group:has(:focus-visible),
    [data-theme="dark"] .hero-select-control-group:has(:focus-visible) {
      outline-offset: 2px;
    }

    .hero-select-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 100%;
      padding: 0 16px 0 24px;
      border-radius: inherit;
      background: transparent;
      color: inherit;
      font-family: var(--tool-font-family, inherit);
      font-size: 15px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-sizing: border-box;
      flex: 1;
      outline: none;
      white-space: nowrap;
    }

    .hero-select-btn:active {
      transform: translateY(0);
    }

    .hero-select-chevron-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      min-width: 44px;
      height: 100%;
      padding: 0;
      margin: 0;
      border: none;
      border-left: 1px solid rgba(255, 255, 255, 0.2);
      background: transparent;
      color: inherit;
      cursor: pointer;
      box-sizing: border-box;
      outline: none;
      transition: background-color 0.15s ease;
    }

    .hero-select-chevron-btn:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .hero-select-chevron-btn:active {
      background: rgba(255, 255, 255, 0.2);
    }

    .hero-select-chevron-btn:focus-visible {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-icon {
      flex-shrink: 0;
    }

    .hero-subtitle {
      font-size: 13.5px;
      color: #64748B;
      margin: 0;
      letter-spacing: -0.01em;
      max-width: 600px;
      line-height: 1.4;
    }

    :host-context([data-theme="dark"]) .hero-subtitle,
    [data-theme="dark"] :host .hero-subtitle,
    [data-theme="dark"] .hero-subtitle {
      color: #94A3B8;
    }

    .local-processing-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 500;
      color: #065F46;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      padding: 4px 12px;
      margin-top: 6px;
      line-height: 1.3;
      text-align: center;
    }

    :host-context([data-theme="dark"]) .local-processing-badge,
    [data-theme="dark"] :host .local-processing-badge,
    [data-theme="dark"] .local-processing-badge {
      color: #6EE7B7;
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(52, 211, 153, 0.3);
    }

    .badge-lock-icon {
      flex-shrink: 0;
      color: currentColor;
    }

    /* 3. Popular Presets Crossfade Stage */
    .popular-conversions-wrapper {
      width: 100%;
      max-width: 580px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .popular-section-label {
      font-size: var(--tool-type-label-size, 12px);
      line-height: var(--tool-type-label-lh, 16px);
      font-weight: var(--tool-type-label-weight, 600);
      text-transform: uppercase;
      letter-spacing: var(--tool-type-label-tracking, 0.06em);
      color: #64748B;
      user-select: none;
      margin-bottom: 12px;
    }

    :host-context([data-theme="dark"]) .popular-section-label,
    [data-theme="dark"] :host .popular-section-label,
    [data-theme="dark"] .popular-section-label {
      color: #A1A1AA;
    }

    .popular-crossfade-stage {
      position: relative;
      width: 100%;
      height: 114px; /* Reserved height for 3x2 grid with unclipped shadows and borders */
      overflow: visible;
    }

    .popular-grid-group {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      width: 100%;
      padding: 4px;
      box-sizing: border-box;
      will-change: transform, opacity, filter;
    }

    .popular-grid-group.is-entering {
      animation: popularSoftFadeIn 1000ms ease-in-out forwards;
    }

    .popular-grid-group.is-exiting {
      animation: popularSoftFadeOut 1000ms ease-in-out forwards;
      pointer-events: none;
    }

    @keyframes popularSoftFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
        filter: blur(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
    }

    @keyframes popularSoftFadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
        filter: blur(0);
      }
      to {
        opacity: 0;
        transform: translateY(-6px);
        filter: blur(4px);
      }
    }

    .popular-chip-btn {
      height: var(--tool-chip-height, 36px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      border-radius: var(--tool-radius-pill, 999px);
      background: var(--ts-surface-raised, #FFFFFF);
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text, #1E293B);
      font-family: var(--tool-font-family, inherit);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
      user-select: none;
      box-sizing: border-box;
      text-transform: none;
    }

    :host-context([data-theme="dark"]) .popular-chip-btn,
    [data-theme="dark"] :host .popular-chip-btn,
    [data-theme="dark"] .popular-chip-btn {
      background: var(--ts-surface-raised, #18181B);
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.12));
      color: #F8FAFC;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .popular-chip-btn:hover {
      border-color: var(--tool-accent, #2563EB);
      color: var(--tool-accent, #2563EB);
      background: var(--tool-accent-soft, rgba(37, 99, 235, 0.08));
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }

    :host-context([data-theme="dark"]) .popular-chip-btn:hover,
    [data-theme="dark"] :host .popular-chip-btn,
    [data-theme="dark"] .popular-chip-btn:hover {
      border-color: var(--accent, #3B82F6);
      color: var(--accent, #3B82F6);
      background: rgba(59, 130, 246, 0.12);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    }

    .popular-chip-btn:focus-visible {
      outline: 2px solid var(--accent, #2563EB);
      outline-offset: 2px;
    }

    :host-context([data-theme="dark"]) .popular-chip-btn:focus-visible,
    [data-theme="dark"] :host .popular-chip-btn,
    [data-theme="dark"] .popular-chip-btn:focus-visible {
      outline-color: var(--accent, #3B82F6);
    }

    .popular-chip-name {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: inherit;
      white-space: nowrap;
    }

    /* Standard Breakpoint Adaptations: xs (0-479px), sm (480-767px), md (768-1023px), lg (1024px+) */
    @media (max-width: 479px) {
      .landing-hero-area {
        padding: 16px 12px 24px;
        min-height: auto;
        justify-content: flex-start;
      }
      .hero-rotating-heading,
      app-rotating-heading {
        margin-bottom: 16px;
      }
      .hero-action-group {
        margin-bottom: 16px;
        gap: 8px;
        width: 100%;
      }
      .select-interactive-area {
        width: 100%;
        max-width: 480px;
      }
      .select-row-container {
        width: 100%;
        display: flex;
        justify-content: center;
      }
      .select-btn-anchor-wrapper {
        width: 100%;
        display: flex;
        position: relative;
      }
      .hero-select-control-group {
        width: 100%;
        max-width: 480px;
        box-sizing: border-box;
      }
      .hero-select-btn {
        flex: 1;
        width: auto;
        height: 48px;
        min-height: 48px;
        position: relative;
        padding: 0 8px 0 20px;
        justify-content: center;
        font-size: 15px;
        box-sizing: border-box;
      }
      .hero-select-chevron-btn {
        width: 44px;
        min-width: 44px;
        height: 48px;
        min-height: 48px;
        border-left: 1px solid rgba(255, 255, 255, 0.2);
      }
      .source-vertical-menu {
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        transform: none !important;
        box-sizing: border-box;
      }
      .popular-conversions-wrapper {
        margin-top: 16px;
      }
      .popular-crossfade-stage {
        height: 160px;
        min-height: 160px;
      }
      .popular-grid-group {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px;
        width: 100%;
      }
      .popular-chip-btn {
        min-height: 44px;
        height: auto;
        padding: 6px 12px;
      }
      .popular-chip-name {
        font-size: 12px;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.25;
      }
    }

    @media (min-width: 480px) and (max-width: 767px) {
      .landing-hero-area {
        padding: 24px 16px 36px;
      }
      .popular-crossfade-stage {
        height: 160px;
      }
      .popular-grid-group {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px;
      }
      .popular-chip-btn {
        min-height: 44px;
        height: auto;
        padding: 6px 12px;
      }
      .popular-chip-name {
        font-size: 12px;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }

    @media (min-width: 768px) {
      .hero-rotating-heading,
      app-rotating-heading {
        margin-bottom: 24px;
      }
      .hero-action-group {
        margin-bottom: 24px;
      }
      .popular-conversions-wrapper {
        margin-top: 24px;
      }
      .popular-grid-group {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 12px;
      }
    }
  `]
})
export class UploadLandingComponent implements OnInit, OnDestroy {
  private readonly telemetry = inject(CompressorTelemetryService);

  readonly config = COMPRESSOR_CONFIG;
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly filesSelected = output<FileList | File[]>();
  readonly examplePresetSelected = output<DeveloperPresetKey>();

  readonly heroLines = HERO_LINES;

  readonly selectBtn = viewChild<ElementRef<HTMLButtonElement>>('selectBtn');
  readonly cornerPlusBtn = viewChild<ElementRef<HTMLButtonElement>>('cornerPlusBtn');
  readonly sourceMenu = viewChild<ElementRef<HTMLDivElement>>('sourceMenu');
  readonly interactiveArea = viewChild<ElementRef<HTMLDivElement>>('interactiveArea');

  readonly sourceIcons = SOURCE_ICONS;

  isConfigured(id: 'drive' | 'dropbox' | string): boolean {
    if (id === 'drive') {
      return Boolean(COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey && COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId);
    }
    if (id === 'dropbox') {
      return Boolean(COMPRESSOR_CONFIG.cloudSources?.dropbox?.appKey);
    }
    if (id === 'clipboard') {
      return true;
    }
    return false;
  }

  openCloudPicker(id: 'drive' | 'dropbox' | string): void {
    console.log(`Open cloud picker: ${id}`);
  }

  readonly isPlusVisible = signal<boolean>(false);
  readonly isPlusClosing = signal<boolean>(false);
  readonly isMenuOpen = signal<boolean>(false);
  readonly isMenuClosing = signal<boolean>(false);
  readonly isTouchDevice = signal<boolean>(false);
  readonly pasteToastMessage = signal<string>('');
  private pasteToastTimer: any = null;
  private hidePlusTimer: any = null;
  private closeMenuTimer: any = null;

  readonly availableSources = [
    {
      id: 'device',
      label: 'This device',
      ariaLabel: 'Upload from this device',
      tooltip: 'Choose files from this device',
      icon: 'monitor-smartphone',
      isConfigured: true
    },
    {
      id: 'drive',
      label: 'Google Drive',
      ariaLabel: 'Add from Google Drive',
      tooltip: 'Add from Google Drive',
      logo: SOURCE_ICONS.googleDrive,
      icon: 'hard-drive',
      get isConfigured(): boolean {
        return Boolean(COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey && COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId);
      }
    },
    {
      id: 'dropbox',
      label: 'Dropbox',
      ariaLabel: 'Add from Dropbox',
      tooltip: 'Add from Dropbox',
      logo: SOURCE_ICONS.dropbox,
      icon: 'folder-up',
      get isConfigured(): boolean {
        return Boolean(COMPRESSOR_CONFIG.cloudSources?.dropbox?.appKey);
      }
    },
    {
      id: 'onedrive',
      label: 'OneDrive',
      ariaLabel: 'Add from OneDrive',
      tooltip: 'OneDrive',
      logo: SOURCE_ICONS.oneDrive,
      icon: 'cloud',
      get isConfigured(): boolean {
        return Boolean(COMPRESSOR_CONFIG.cloudSources?.oneDrive?.clientId);
      }
    },
    {
      id: 'clipboard',
      label: 'Clipboard',
      ariaLabel: 'Paste from clipboard',
      tooltip: 'Paste from clipboard',
      icon: 'clipboard-paste',
      isConfigured: true
    }
  ];

  readonly popularGroups: PopularPresetChip[][] = [
    // Group 1: Web Performance & Publishing (Classic 3x2 Grid)
    [
      { key: 'website', label: 'Website' },
      { key: 'blog', label: 'Blog post' },
      { key: 'ecommerce', label: 'Online store' },
      { key: 'social', label: 'Social post' },
      { key: 'thumbnails', label: 'Thumbnail' },
      { key: 'retina', label: 'Retina display' }
    ],
    // Group 2: Modern Formats & Device Targets
    [
      { key: 'webp-lossy', label: 'WebP Web' },
      { key: 'avif-photo', label: 'AVIF Photo' },
      { key: 'jpeg-standard', label: 'JPEG Photo' },
      { key: 'png-lossless', label: 'PNG Graphic' },
      { key: 'email', label: 'Email size' },
      { key: 'mobile', label: 'Mobile app' }
    ],
    // Group 3: Savings Goals & High-Impact Targets
    [
      { key: 'reduce-50', label: 'Reduce 50%' },
      { key: 'reduce-70', label: 'Reduce 70%' },
      { key: 'under-100kb', label: 'Under 100 KB' },
      { key: 'hero', label: 'Hero banner' },
      { key: 'portfolio', label: 'Photo gallery' },
      { key: 'avatar', label: 'Discord / Avatar' }
    ]
  ];

  readonly currentGroupIndex = signal<number>(0);
  readonly previousGroupIndex = signal<number | null>(null);
  private popularTimer: any = null;
  private popularAnimTimer: any = null;
  private isPopularPaused = false;
  readonly isReducedMotion = signal<boolean>(false);

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      if (window.matchMedia) {
        this.isReducedMotion.set(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const touchQuery = window.matchMedia('(hover: none), (pointer: coarse), (any-pointer: coarse)');
        if (touchQuery.matches) {
          this.isTouchDevice.set(true);
        }
      }
      if ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)) {
        this.isTouchDevice.set(true);
      }
    }
    this.startPopularCycle();
  }

  private startPopularCycle(): void {
    this.stopPopularCycle();
    this.popularTimer = setInterval(() => {
      if (this.isPopularPaused) return;

      const prev = this.currentGroupIndex();
      const next = (prev + 1) % this.popularGroups.length;

      this.previousGroupIndex.set(prev);
      this.currentGroupIndex.set(next);

      if (this.popularAnimTimer) clearTimeout(this.popularAnimTimer);
      this.popularAnimTimer = setTimeout(() => {
        this.previousGroupIndex.set(null);
      }, 1000); // 1000ms duration matching ease-in-out crossfade
    }, 3000); // 3-second cycle matching Image Converter
  }

  private stopPopularCycle(): void {
    if (this.popularTimer) {
      clearInterval(this.popularTimer);
      this.popularTimer = null;
    }
    if (this.popularAnimTimer) {
      clearTimeout(this.popularAnimTimer);
      this.popularAnimTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopPopularCycle();
    if (this.pasteToastTimer) clearTimeout(this.pasteToastTimer);
    if (this.closeMenuTimer) clearTimeout(this.closeMenuTimer);
    this.clearHidePlusTimer();
  }

  onPointerEnter(event?: MouseEvent | PointerEvent): void {
    if (event && 'pointerType' in event && (event as PointerEvent).pointerType === 'touch') return;
    this.clearHidePlusTimer();
    this.isPlusClosing.set(false);
    this.isPlusVisible.set(true);
  }

  onPointerLeave(): void {
    if (this.isTouchDevice()) return;
    this.clearHidePlusTimer();
    this.hidePlusTimer = setTimeout(() => {
      if (!this.isMenuOpen()) {
        this.isPlusClosing.set(true);
        setTimeout(() => {
          this.isPlusVisible.set(false);
          this.isPlusClosing.set(false);
        }, 150);
      }
    }, 150);
  }

  onFocusIn(): void {
    if (this.isTouchDevice()) return;
    this.clearHidePlusTimer();
    this.isPlusClosing.set(false);
    this.isPlusVisible.set(true);
  }

  onFocusOut(event: FocusEvent): void {
    if (this.isTouchDevice()) return;
    const area = this.interactiveArea()?.nativeElement;
    if (area && event.relatedTarget && area.contains(event.relatedTarget as Node)) {
      return;
    }
    this.clearHidePlusTimer();
    this.hidePlusTimer = setTimeout(() => {
      if (!this.isMenuOpen()) {
        this.isPlusClosing.set(true);
        setTimeout(() => {
          this.isPlusVisible.set(false);
          this.isPlusClosing.set(false);
        }, 150);
      }
    }, 150);
  }

  toggleMenuFromPlus(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.isMenuOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  toggleMenuFromChevron(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.isMenuOpen()) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu(): void {
    if (this.closeMenuTimer) clearTimeout(this.closeMenuTimer);
    this.isMenuClosing.set(false);
    this.isMenuOpen.set(true);
    this.isPlusVisible.set(true); // Pinned state: stays open!
    this.telemetry.trackSourceRowOpened();
  }

  closeMenu(immediate = false): void {
    if (!this.isMenuOpen() && !this.isMenuClosing()) return;
    if (immediate || this.isReducedMotion()) {
      if (this.closeMenuTimer) clearTimeout(this.closeMenuTimer);
      this.isMenuClosing.set(false);
      this.isMenuOpen.set(false);
      return;
    }
    this.isMenuClosing.set(true);
    if (this.closeMenuTimer) clearTimeout(this.closeMenuTimer);
    this.closeMenuTimer = setTimeout(() => {
      this.isMenuOpen.set(false);
      this.isMenuClosing.set(false);
      this.closeMenuTimer = null;
    }, 150);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event?: MouseEvent): void {
    if (this.isMenuOpen()) {
      const target = event?.target as HTMLElement | null;
      const interactiveEl = this.interactiveArea()?.nativeElement;
      if (target && interactiveEl && interactiveEl.contains(target)) {
        return;
      }
      this.closeMenu(true);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event?: Event): void {
    if (!this.isMenuOpen()) return;
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.closeMenu(true);
    this.clearHidePlusTimer();
    this.isPlusClosing.set(false);

    // Escape returns focus to plus button on desktop, or select button on mobile
    const plusBtnEl = this.cornerPlusBtn()?.nativeElement;
    if (plusBtnEl && window.getComputedStyle(plusBtnEl).display !== 'none') {
      this.isPlusVisible.set(true);
      plusBtnEl.focus();
    } else {
      this.selectBtn()?.nativeElement.focus();
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onEscape(event);
      return;
    }
    const buttons = Array.from(
      (this.sourceMenu()?.nativeElement as HTMLElement)?.querySelectorAll<HTMLButtonElement>('.menu-item-btn') || []
    );
    if (buttons.length === 0) return;
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
      buttons[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
      buttons[prevIndex]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  }

  onPlusBtnKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isMenuOpen()) {
        this.openMenu();
      }
      setTimeout(() => {
        const firstBtn = (this.sourceMenu()?.nativeElement as HTMLElement)?.querySelector<HTMLButtonElement>('.menu-item-btn');
        firstBtn?.focus();
      }, 30);
    }
  }

  private clearHidePlusTimer(): void {
    if (this.hidePlusTimer) {
      clearTimeout(this.hidePlusTimer);
      this.hidePlusTimer = null;
    }
  }

  onSourceClick(src: { id: string; label: string; ariaLabel: string; tooltip: string; icon: string; logo?: string; isConfigured: boolean }, event?: Event): void {
    if (!src.isConfigured) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      return; // Missing key: icon shows tooltip "Not set up yet", does nothing, dropdown stays open
    }
    this.closeMenu(true);
    if (src.id === 'device') {
      this.openFilePicker();
    } else if (src.id === 'clipboard') {
      this.handleClipboardPaste();
    } else if (src.id === 'drive' || src.id === 'dropbox' || src.id === 'onedrive') {
      this.openCloudPicker(src.id);
    }
  }

  async handleClipboardPaste(): Promise<void> {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.read) {
        this.showPasteToast('Clipboard access not supported');
        return;
      }
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
            const f = new File([blob], `clipboard-${Date.now()}.${ext}`, { type });
            files.push(f);
          }
        }
      }
      if (files.length > 0) {
        this.filesSelected.emit(files);
      } else {
        this.showPasteToast('No image found in clipboard');
      }
    } catch {
      this.showPasteToast('No image found in clipboard');
    }
  }

  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      event.preventDefault();
      this.filesSelected.emit(imageFiles);
    }
  }

  private showPasteToast(msg: string): void {
    this.pasteToastMessage.set(msg);
    if (this.pasteToastTimer) clearTimeout(this.pasteToastTimer);
    this.pasteToastTimer = setTimeout(() => {
      this.pasteToastMessage.set('');
    }, 3000);
  }

  onPopularMouseEnter(): void { this.isPopularPaused = true; }
  onPopularMouseLeave(): void { this.isPopularPaused = false; }
  onPopularFocusIn(): void { this.isPopularPaused = true; }
  onPopularFocusOut(): void { this.isPopularPaused = false; }

  openFilePicker(): void {
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.filesSelected.emit(target.files);
    }
  }

  onSelectChip(presetKey: DeveloperPresetKey): void {
    this.examplePresetSelected.emit(presetKey);
    this.openFilePicker();
  }
}
