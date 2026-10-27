// @vitest-environment jsdom
// client/apps/tool-qr-generator/src/components/location-input/location-input.component.spec.ts
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { LocationInputComponent, LocationInputValue } from './location-input.component';

describe('LocationInputComponent', () => {
  let component: LocationInputComponent;

  beforeEach(() => {
    const rootInjector = {
      get: (_token: any, notFound?: any) => notFound
    } as any;
    const envInjector = createEnvironmentInjector([], rootInjector);
    runInInjectionContext(envInjector, () => {
      component = new LocationInputComponent();
    });
    component.ngOnInit();
  });

  it('initializes in link mode by default with empty values', () => {
    expect(component.activeMode()).toBe('link');
    expect(component.mapUrl()).toBe('');
    expect(component.validation().isValid).toBe(false);
  });

  it('switches modes between link and coordinates cleanly', () => {
    component.setMode('coordinates');
    expect(component.activeMode()).toBe('coordinates');

    component.setMode('link');
    expect(component.activeMode()).toBe('link');
  });

  it('encodes location link directly without requiring lat/long', () => {
    let lastEmitted: LocationInputValue | null = null;
    component.valueChange.subscribe(val => {
      lastEmitted = val;
    });

    component.onUrlChange('https://www.google.com/maps/@37.774929,-122.419416,15z');

    expect(component.validation().isValid).toBe(true);
    expect(component.validation().payload).toBe('https://www.google.com/maps/@37.774929,-122.419416,15z');
    expect(lastEmitted?.isValid).toBe(true);
    expect(lastEmitted?.payload).toBe('https://www.google.com/maps/@37.774929,-122.419416,15z');
  });

  it('extracts coordinates from Google Maps data parameter (!3d, !4d)', () => {
    component.onUrlChange('https://www.google.com/maps/place/Empire+State+Building/@40.7484405,-73.9878531,17z/data=!3m1!4b1!4m6!3m5!1s0x89c259a9b3117469:0xd134e199a405a163!8m2!3d40.7484405!4d-73.9856644');

    expect(component.detectedCoords()).toBeDefined();
    expect(component.detectedCoords()?.latitude).toBeCloseTo(40.7484405);
    expect(component.detectedCoords()?.longitude).toBeCloseTo(-73.9856644);
  });

  it('extracts coordinates from Apple Maps and OpenStreetMap URLs', () => {
    // Apple Maps
    component.onUrlChange('https://maps.apple.com/?ll=51.5074,-0.1278&q=London');
    expect(component.detectedCoords()).toEqual({
      latitude: 51.5074,
      longitude: -0.1278
    });

    // OpenStreetMap
    component.onUrlChange('https://www.openstreetmap.org/#map=16/48.8584/2.2945');
    expect(component.detectedCoords()).toEqual({
      latitude: 48.8584,
      longitude: 2.2945
    });
  });

  it('handles short links without network calls and preserves valid payload', () => {
    component.onUrlChange('https://maps.app.goo.gl/w5a4cZbC9e');

    expect(component.isShortLink()).toBe(true);
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().payload).toBe('https://maps.app.goo.gl/w5a4cZbC9e');
  });

  it('validates coordinates mode and rejects out-of-range latitude/longitude', () => {
    component.setMode('coordinates');

    component.onLatitudeChange(37.7749);
    component.onLongitudeChange(-122.4194);
    expect(component.validation().isValid).toBe(true);
    expect(component.validation().payload).toBe('geo:37.7749,-122.4194');

    // Invalid lat (> 90)
    component.onLatitudeChange(105);
    expect(component.validation().isValid).toBe(false);
    expect(component.validation().error).toContain('Latitude must be between -90 and 90');

    // Invalid lng (> 180)
    component.onLatitudeChange(45);
    component.onLongitudeChange(-195);
    expect(component.validation().isValid).toBe(false);
    expect(component.validation().error).toContain('Longitude must be between -180 and 180');
  });

  it('uses device geolocation to populate coordinates and switch mode', () => {
    const mockGetCurrentPosition = vi.fn().mockImplementation((success) => {
      success({
        coords: {
          latitude: 37.77492,
          longitude: -122.41942
        }
      });
    });

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: mockGetCurrentPosition
      }
    });

    component.useCurrentLocation();

    expect(mockGetCurrentPosition).toHaveBeenCalled();
    expect(component.activeMode()).toBe('coordinates');
    expect(component.latitude()).toBe(37.77492);
    expect(component.longitude()).toBe(-122.41942);
    expect(component.validation().isValid).toBe(true);
  });
});
