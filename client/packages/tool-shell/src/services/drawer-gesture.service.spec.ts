// @vitest-environment jsdom
// client/packages/tool-shell/src/services/drawer-gesture.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DrawerGestureService,
  EDGE_ZONE_MIN,
  EDGE_ZONE_MAX,
  SNAP_OPEN_DISTANCE,
  SNAP_CLOSE_DISTANCE,
  SNAP_VELOCITY_THRESHOLD
} from './drawer-gesture.service';

describe('DrawerGestureService', () => {
  let service: DrawerGestureService;

  beforeEach(() => {
    service = new DrawerGestureService();
  });

  describe('Edge Zone & Target Filtering (iOS Back Swipe Protection)', () => {
    it('rejects gestures starting in iOS system back swipe zone (< 16px)', () => {
      expect(service.isWithinEdgeZone(0)).toBe(false);
      expect(service.isWithinEdgeZone(10)).toBe(false);
      expect(service.isWithinEdgeZone(15)).toBe(false);
    });

    it('accepts gestures within the designated edge zone (16px to 48px)', () => {
      expect(service.isWithinEdgeZone(EDGE_ZONE_MIN)).toBe(true);
      expect(service.isWithinEdgeZone(24)).toBe(true);
      expect(service.isWithinEdgeZone(EDGE_ZONE_MAX)).toBe(true);
    });

    it('rejects gestures starting past the edge zone (> 48px)', () => {
      expect(service.isWithinEdgeZone(49)).toBe(false);
      expect(service.isWithinEdgeZone(100)).toBe(false);
      expect(service.isWithinEdgeZone(250)).toBe(false);
    });

    it('ignores gestures starting on interactive or scrollable elements', () => {
      const inputEl = document.createElement('input');
      const buttonEl = document.createElement('button');
      const sliderEl = document.createElement('div');
      sliderEl.setAttribute('role', 'slider');
      const scrollerEl = document.createElement('div');
      scrollerEl.className = 'custom-scrollbar';
      const plainDiv = document.createElement('div');

      expect(service.isTargetExcluded(inputEl)).toBe(true);
      expect(service.isTargetExcluded(buttonEl)).toBe(true);
      expect(service.isTargetExcluded(sliderEl)).toBe(true);
      expect(service.isTargetExcluded(scrollerEl)).toBe(true);
      expect(service.isTargetExcluded(plainDiv)).toBe(false);
    });

    it('allows swiping to dismiss on buttons, links, and scrollbar surfaces, excluding only text inputs/sliders', () => {
      const inputEl = document.createElement('input');
      const submitBtn = document.createElement('input');
      submitBtn.type = 'submit';
      const buttonEl = document.createElement('button');
      const linkEl = document.createElement('a');
      const scrollerEl = document.createElement('div');
      scrollerEl.className = 'custom-scrollbar';
      const rangeEl = document.createElement('input');
      rangeEl.type = 'range';

      expect(service.isTargetExcludedForDismiss(inputEl)).toBe(true);
      expect(service.isTargetExcludedForDismiss(rangeEl)).toBe(true);
      expect(service.isTargetExcludedForDismiss(buttonEl)).toBe(false);
      expect(service.isTargetExcludedForDismiss(linkEl)).toBe(false);
      expect(service.isTargetExcludedForDismiss(scrollerEl)).toBe(false);
      expect(service.isTargetExcludedForDismiss(submitBtn)).toBe(false);
    });
  });

  describe('Swipe Right from Edge to Open', () => {
    it('starts drag and updates translation following the finger', () => {
      const container = document.createElement('div');
      const started = service.startSwipeRight(20, 100, container);
      expect(started).toBe(true);
      expect(service.isDragging()).toBe(true);

      // Move 50px right
      const offset = service.moveSwipe(70, 100, false);
      expect(offset).toBe(-320 + 50);
      expect(service.dragTranslateX()).toBe(-270);
    });

    it('snaps open when distance threshold (>= 80px) is crossed', () => {
      const container = document.createElement('div');
      service.startSwipeRight(20, 100, container);

      // Drag 90px to the right
      service.moveSwipe(110, 100, false);
      const action = service.endSwipe(false);

      expect(action).toBe('open');
      expect(service.isDragging()).toBe(false);
      expect(service.dragTranslateX()).toBeNull();
    });

    it('snaps open when flick velocity threshold (>= 0.4px/ms) is reached', () => {
      vi.useFakeTimers();
      const container = document.createElement('div');
      service.startSwipeRight(20, 100, container);

      // Move 40px in 50ms = 0.8px/ms
      vi.advanceTimersByTime(50);
      service.moveSwipe(60, 100, false);
      const action = service.endSwipe(false);

      expect(action).toBe('open');
      vi.useRealTimers();
    });

    it('resets closed when drag distance and velocity are below threshold', () => {
      vi.useFakeTimers();
      const container = document.createElement('div');
      service.startSwipeRight(20, 100, container);

      // Move only 30px slowly over 300ms = 0.1px/ms
      vi.advanceTimersByTime(300);
      service.moveSwipe(50, 100, false);
      const action = service.endSwipe(false);

      expect(action).toBe('reset');
      vi.useRealTimers();
    });

    it('cancels drag if vertical scrolling dominates over horizontal movement', () => {
      const container = document.createElement('div');
      service.startSwipeRight(20, 100, container);

      // Finger moved mostly down (dy = 40, dx = 10)
      const offset = service.moveSwipe(30, 140, false);
      expect(offset).toBeNull();
      expect(service.isDragging()).toBe(false);
    });
  });

  describe('Swipe Left on Drawer or Scrim to Close', () => {
    it('translates drawer left and snaps closed on distance (<= -45px)', () => {
      const panel = document.createElement('div');
      service.startSwipeLeft(280, 200, panel);
      expect(service.isDragging()).toBe(true);

      // Move 80px left
      service.moveSwipe(200, 200, true);
      expect(service.dragTranslateX()).toBe(-80);

      const action = service.endSwipe(true);
      expect(action).toBe('close');
      expect(service.isDragging()).toBe(false);
    });

    it('snaps closed on fast left flick velocity (<= -0.4px/ms)', () => {
      vi.useFakeTimers();
      const panel = document.createElement('div');
      service.startSwipeLeft(200, 200, panel);

      // Flick left 30px in 40ms = -0.75px/ms
      vi.advanceTimersByTime(40);
      service.moveSwipe(170, 200, true);
      const action = service.endSwipe(true);

      expect(action).toBe('close');
      vi.useRealTimers();
    });

    it('resets open when left drag does not meet close thresholds', () => {
      vi.useFakeTimers();
      const panel = document.createElement('div');
      service.startSwipeLeft(200, 200, panel);

      // Drag left only 20px slowly over 400ms = -0.05px/ms
      vi.advanceTimersByTime(400);
      service.moveSwipe(180, 200, true);
      const action = service.endSwipe(true);

      expect(action).toBe('reset');
      vi.useRealTimers();
    });
  });

  describe('Prefers Reduced Motion', () => {
    it('bypasses intermediate transform updates in reduced motion mode but evaluates snap actions', () => {
      service.setPrefersReducedMotion(true);
      const container = document.createElement('div');
      service.startSwipeRight(25, 100, container);

      // Drag translateX should stay null so no transform lag occurs
      service.moveSwipe(120, 100, false);
      expect(service.dragTranslateX()).toBeNull();

      const action = service.endSwipe(false);
      expect(action).toBe('open');
    });
  });
});
