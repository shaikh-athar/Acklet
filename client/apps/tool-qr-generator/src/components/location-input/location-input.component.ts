// client/apps/tool-qr-generator/src/components/location-input/location-input.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { parseMapCoordinates, buildGeoPayload } from '../../services/qr-payload-builders';

export type LocationInputMode = 'link' | 'coordinates';

export interface LocationInputValue {
  mode: LocationInputMode;
  mapUrl: string;
  latitude: number | null;
  longitude: number | null;
  label: string;
  provider: 'geo' | 'google' | 'apple';
  payload: string;
  isValid: boolean;
  detectedCoords?: { latitude: number; longitude: number };
  error?: string;
}

@Component({
  selector: 'app-location-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="location-input-container">
      <!-- Mode Segmented Switch -->
      <div class="mode-toggle-group" role="tablist" aria-label="Location input mode">
        <button
          type="button"
          class="mode-toggle-btn"
          [class.active]="activeMode() === 'link'"
          (click)="setMode('link')"
          role="tab"
          [attr.aria-selected]="activeMode() === 'link'"
        >
          <ts-icon name="map" class="toggle-icon" />
          <span>Map Link</span>
        </button>
        <button
          type="button"
          class="mode-toggle-btn"
          [class.active]="activeMode() === 'coordinates'"
          (click)="setMode('coordinates')"
          role="tab"
          [attr.aria-selected]="activeMode() === 'coordinates'"
        >
          <ts-icon name="map-pin" class="toggle-icon" />
          <span>Coordinates</span>
        </button>
      </div>

      <!-- Option A: Map Link Mode -->
      @if (activeMode() === 'link') {
        <div class="link-mode-panel slide-fade-up">
          <div class="field-row">
            <div class="field-header">
              <label for="loc-map-url" class="field-label">Google Maps, Apple Maps, or OpenStreetMap link</label>
              <button
                type="button"
                class="quick-gps-btn"
                (click)="useCurrentLocation()"
                [disabled]="isLocating()"
                title="Detect your current GPS location"
              >
                <ts-icon name="navigation" class="gps-icon" [class.spinning]="isLocating()" />
                <span>{{ isLocating() ? 'Locating...' : 'Use my location' }}</span>
              </button>
            </div>

            <div class="input-with-icon">
              <ts-icon name="link-2" class="input-leading-icon" />
              <input
                id="loc-map-url"
                type="url"
                class="field-input with-leading-icon"
                placeholder="Paste link e.g. https://maps.google.com/?q=37.7749,-122.4194"
                [ngModel]="mapUrl()"
                (ngModelChange)="onUrlChange($event)"
              />
              @if (mapUrl()) {
                <button type="button" class="clear-field-btn" (click)="clearMapUrl()">
                  <ts-icon name="x" />
                </button>
              }
            </div>
          </div>

          <!-- Detected Feedback Badge -->
          @if (detectedCoords()) {
            <div class="detected-coords-pill">
              <ts-icon name="check-circle" class="pill-icon success" />
              <span>Location detected: <strong>{{ detectedCoords()!.latitude.toFixed(5) }}, {{ detectedCoords()!.longitude.toFixed(5) }}</strong></span>
            </div>
          } @else if (isShortLink()) {
            <div class="detected-coords-pill note">
              <ts-icon name="info" class="pill-icon info" />
              <span>Short link detected. Scans will open the map directly on phones.</span>
            </div>
          }

          <div class="field-row">
            <label for="loc-place-label" class="field-label optional">Place name or label (optional)</label>
            <input
              id="loc-place-label"
              type="text"
              class="field-input"
              placeholder="e.g. Acklet HQ, Conference Room A"
              [ngModel]="placeLabel()"
              (ngModelChange)="onLabelChange($event)"
            />
          </div>
        </div>
      }

      <!-- Option B: Coordinates Mode -->
      @if (activeMode() === 'coordinates') {
        <div class="coordinates-mode-panel slide-fade-up">
          <div class="panel-top-actions">
            <span class="section-hint">Enter exact GPS coordinates or auto-detect from your device:</span>
            <button
              type="button"
              class="quick-gps-btn highlight"
              (click)="useCurrentLocation()"
              [disabled]="isLocating()"
            >
              <ts-icon name="navigation" class="gps-icon" [class.spinning]="isLocating()" />
              <span>{{ isLocating() ? 'Detecting GPS...' : 'Use my location' }}</span>
            </button>
          </div>

          <div class="coords-grid">
            <div class="field-row">
              <label for="loc-lat" class="field-label">Latitude (-90 to 90) *</label>
              <input
                id="loc-lat"
                type="number"
                step="0.00001"
                class="field-input"
                placeholder="37.77492"
                [ngModel]="latitude()"
                (ngModelChange)="onLatitudeChange($event)"
              />
            </div>
            <div class="field-row">
              <label for="loc-lng" class="field-label">Longitude (-180 to 180) *</label>
              <input
                id="loc-lng"
                type="number"
                step="0.00001"
                class="field-input"
                placeholder="-122.41941"
                [ngModel]="longitude()"
                (ngModelChange)="onLongitudeChange($event)"
              />
            </div>
          </div>

          <div class="field-row">
            <label for="loc-coords-label" class="field-label optional">Place name or label (optional)</label>
            <input
              id="loc-coords-label"
              type="text"
              class="field-input"
              placeholder="e.g. San Francisco, CA"
              [ngModel]="placeLabel()"
              (ngModelChange)="onLabelChange($event)"
            />
          </div>
        </div>
      }

      <!-- Geolocation Error Notice -->
      @if (geoErrorNotice()) {
        <div class="geo-error-notice">
          <ts-icon name="alert-circle" class="error-icon" />
          <span>{{ geoErrorNotice() }}</span>
          <button type="button" class="dismiss-error-btn" (click)="geoErrorNotice.set('')">Dismiss</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .location-input-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Segmented Mode Switch */
    .mode-toggle-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 3px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 9px;
      gap: 2px;
    }

    .mode-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      border: none;
      border-radius: 7px;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .mode-toggle-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-hover, rgba(255, 255, 255, 0.06));
    }

    .mode-toggle-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: -1px;
    }

    .mode-toggle-btn.active {
      background: var(--surface-1, rgba(255, 255, 255, 0.12));
      color: var(--text, #ffffff);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    }

    .toggle-icon {
      width: 14px;
      height: 14px;
    }

    /* Panels */
    .link-mode-panel,
    .coordinates-mode-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .field-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
    }

    .field-label.optional {
      font-weight: 500;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .input-leading-icon {
      position: absolute;
      left: 11px;
      width: 15px;
      height: 15px;
      color: var(--text-3, rgba(255, 255, 255, 0.4));
      pointer-events: none;
    }

    .field-input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      color: var(--text, #ffffff);
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .field-input::placeholder {
      color: var(--text-3, rgba(255, 255, 255, 0.4));
    }

    .field-input.with-leading-icon {
      padding-left: 34px;
      padding-right: 32px;
    }

    .field-input:focus {
      border-color: var(--accent, #10b981);
      box-shadow: 0 0 0 2px var(--accent-glow, rgba(16, 185, 129, 0.2));
    }

    .field-input:focus-visible {
      outline: none;
      border-color: var(--accent, #10b981);
      box-shadow: 0 0 0 2px var(--accent-glow, rgba(16, 185, 129, 0.2));
    }

    .clear-field-btn {
      position: absolute;
      right: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      cursor: pointer;
    }

    .clear-field-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-hover, rgba(255, 255, 255, 0.08));
    }

    .clear-field-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: 1px;
    }

    .clear-field-btn ts-icon {
      width: 13px;
      height: 13px;
    }

    /* GPS Quick Button */
    .quick-gps-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: none;
      background: transparent;
      color: var(--accent, #10b981);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 6px;
      transition: background-color 120ms ease;
    }

    .quick-gps-btn:hover {
      background: var(--accent-soft, rgba(16, 185, 129, 0.1));
    }

    .quick-gps-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: 1px;
    }

    .quick-gps-btn.highlight {
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      padding: 4px 9px;
    }

    .gps-icon {
      width: 13px;
      height: 13px;
    }

    .gps-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* Feedback Pills */
    .detected-coords-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 10px;
      border-radius: 7px;
      background: var(--accent-soft, rgba(16, 185, 129, 0.1));
      border: 1px solid var(--accent-soft, rgba(16, 185, 129, 0.25));
      color: var(--accent, #10b981);
      font-size: 12px;
    }

    .detected-coords-pill.note {
      background: var(--info-soft, rgba(59, 130, 246, 0.08));
      border: 1px solid var(--border-subtle, rgba(59, 130, 246, 0.2));
      color: var(--info, #3b82f6);
    }

    .pill-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    /* Coordinates Grid */
    .panel-top-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .section-hint {
      font-size: 12px;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
    }

    .coords-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* Error Notice */
    .geo-error-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 7px;
      background: var(--danger-soft, rgba(239, 68, 68, 0.1));
      border: 1px solid var(--danger-soft, rgba(239, 68, 68, 0.25));
      color: var(--danger, #ef4444);
      font-size: 12px;
    }

    .error-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .dismiss-error-btn {
      margin-left: auto;
      border: none;
      background: transparent;
      color: inherit;
      font-size: 11px;
      text-decoration: underline;
      cursor: pointer;
    }

    .dismiss-error-btn:focus-visible {
      outline: 2px solid var(--danger, #ef4444);
      outline-offset: 1px;
    }

    .slide-fade-up {
      animation: slideFadeUp 160ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideFadeUp {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .mode-toggle-btn,
      .field-input,
      .quick-gps-btn,
      .slide-fade-up,
      .gps-icon.spinning {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class LocationInputComponent implements OnInit {
  readonly initialMode = input<LocationInputMode>('link');
  readonly initialUrl = input<string>('');
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);
  readonly initialLabel = input<string>('');

  readonly valueChange = output<LocationInputValue>();

  readonly activeMode = signal<LocationInputMode>('link');
  readonly mapUrl = signal<string>('');
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);
  readonly placeLabel = signal<string>('');
  readonly isLocating = signal<boolean>(false);
  readonly geoErrorNotice = signal<string>('');

  readonly detectedCoords = computed<{ latitude: number; longitude: number } | null>(() => {
    if (this.activeMode() !== 'link') return null;
    const url = this.mapUrl().trim();
    if (!url) return null;
    return parseMapCoordinates(url);
  });

  readonly isShortLink = computed<boolean>(() => {
    const url = this.mapUrl().trim().toLowerCase();
    return url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps');
  });

  readonly validation = computed<{ isValid: boolean; error?: string; payload: string }>(() => {
    const mode = this.activeMode();
    const label = this.placeLabel().trim();

    if (mode === 'link') {
      const url = this.mapUrl().trim();
      if (!url) {
        return { isValid: false, payload: '' };
      }

      // If coordinates detected from URL, create RFC 5870 Geo URI
      const coords = this.detectedCoords();
      if (coords) {
        const payload = buildGeoPayload({
          latitude: coords.latitude,
          longitude: coords.longitude,
          label: label || undefined,
          provider: 'geo'
        });
        return { isValid: true, payload };
      }

      // If short link or standard maps link without explicit coords, encode link directly
      if (/^https?:\/\//i.test(url) || url.startsWith('geo:')) {
        return { isValid: true, payload: url };
      }

      // If bare domain or path, prefix https://
      if (url.includes('.') && !url.includes(' ')) {
        return { isValid: true, payload: `https://${url}` };
      }

      return {
        isValid: false,
        error: 'Please enter a valid map link or switch to Coordinates mode.',
        payload: ''
      };
    } else {
      // Coordinates mode
      const lat = this.latitude();
      const lng = this.longitude();

      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
        return { isValid: false, payload: '' };
      }

      if (lat < -90 || lat > 90) {
        return {
          isValid: false,
          error: 'Latitude must be between -90 and 90.',
          payload: ''
        };
      }

      if (lng < -180 || lng > 180) {
        return {
          isValid: false,
          error: 'Longitude must be between -180 and 180.',
          payload: ''
        };
      }

      const payload = buildGeoPayload({
        latitude: lat,
        longitude: lng,
        label: label || undefined,
        provider: 'geo'
      });

      return { isValid: true, payload };
    }
  });

  ngOnInit(): void {
    if (this.initialMode()) {
      this.activeMode.set(this.initialMode());
    }
    if (this.initialUrl()) {
      this.mapUrl.set(this.initialUrl());
    }
    if (this.initialLat() !== null) {
      this.latitude.set(this.initialLat());
    }
    if (this.initialLng() !== null) {
      this.longitude.set(this.initialLng());
    }
    if (this.initialLabel()) {
      this.placeLabel.set(this.initialLabel());
    }
    this.emitChange();
  }

  setMode(mode: LocationInputMode): void {
    this.activeMode.set(mode);
    this.geoErrorNotice.set('');
    this.emitChange();
  }

  onUrlChange(val: string): void {
    this.mapUrl.set(val);
    this.emitChange();
  }

  clearMapUrl(): void {
    this.mapUrl.set('');
    this.emitChange();
  }

  onLatitudeChange(val: any): void {
    const num = val === '' || val === null ? null : parseFloat(val);
    this.latitude.set(num !== null && !isNaN(num) ? num : null);
    this.emitChange();
  }

  onLongitudeChange(val: any): void {
    const num = val === '' || val === null ? null : parseFloat(val);
    this.longitude.set(num !== null && !isNaN(num) ? num : null);
    this.emitChange();
  }

  onLabelChange(val: string): void {
    this.placeLabel.set(val);
    this.emitChange();
  }

  useCurrentLocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.geoErrorNotice.set('Geolocation is not supported by your browser.');
      return;
    }

    this.isLocating.set(true);
    this.geoErrorNotice.set('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating.set(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));

        // Set coordinates
        this.latitude.set(lat);
        this.longitude.set(lng);

        // If currently in link mode, switch to coordinates mode so user clearly sees their detected location
        this.activeMode.set('coordinates');
        this.emitChange();
      },
      (err) => {
        this.isLocating.set(false);
        let msg = 'Could not retrieve your location.';
        if (err.code === 1) { // PERMISSION_DENIED
          msg = 'Location permission was denied. You can enter coordinates manually.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          msg = 'Location information is currently unavailable.';
        } else if (err.code === 3) { // TIMEOUT
          msg = 'Location request timed out. Please try again.';
        }
        this.geoErrorNotice.set(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  private emitChange(): void {
    const v = this.validation();
    this.valueChange.emit({
      mode: this.activeMode(),
      mapUrl: this.mapUrl(),
      latitude: this.latitude(),
      longitude: this.longitude(),
      label: this.placeLabel(),
      provider: 'geo',
      payload: v.payload,
      isValid: v.isValid,
      detectedCoords: this.detectedCoords() ?? undefined,
      error: v.error
    });
  }
}
