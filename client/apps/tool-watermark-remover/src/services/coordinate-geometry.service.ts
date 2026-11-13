// apps/tool-watermark-remover/src/services/coordinate-geometry.service.ts
import { Injectable } from '@angular/core';
import { Point, RectSelection, ResizeHandle } from '../models/watermark.models';

export interface ViewportTransform {
  containerRect: { left: number; top: number; width: number; height: number };
  zoom: number;
  panX: number;
  panY: number;
  imgWidth: number;
  imgHeight: number;
}

@Injectable({
  providedIn: 'root'
})
export class CoordinateGeometryService {
  /**
   * Calculates the scale factor needed to fit an image inside a container with padding.
   */
  calculateFitZoom(
    containerWidth: number,
    containerHeight: number,
    imgWidth: number,
    imgHeight: number,
    padding = 32
  ): number {
    if (imgWidth <= 0 || imgHeight <= 0) return 1.0;
    const availW = Math.max(100, containerWidth - padding);
    const availH = Math.max(100, containerHeight - padding);
    const scale = Math.min(availW / imgWidth, availH / imgHeight);
    // Clamp fit zoom between 0.25 (25%) and 2.0 (200%), default max 1.0 for high-res images
    return Math.max(0.25, Math.min(1.0, Number(scale.toFixed(2))));
  }

  /**
   * Converts a screen client point (e.g. from PointerEvent) into native image coordinates.
   */
  screenToImage(
    screenX: number,
    screenY: number,
    transform: ViewportTransform
  ): Point {
    const { containerRect, zoom, panX, panY, imgWidth, imgHeight } = transform;
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    const startX = centerX + panX - (imgWidth * zoom) / 2;
    const startY = centerY + panY - (imgHeight * zoom) / 2;

    const imgX = (screenX - startX) / zoom;
    const imgY = (screenY - startY) / zoom;

    return {
      x: Math.round(imgX),
      y: Math.round(imgY)
    };
  }

  /**
   * Converts a native image pixel coordinate into screen client coordinates.
   */
  imageToScreen(
    imageX: number,
    imageY: number,
    transform: ViewportTransform
  ): Point {
    const { containerRect, zoom, panX, panY, imgWidth, imgHeight } = transform;
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    const startX = centerX + panX - (imgWidth * zoom) / 2;
    const startY = centerY + panY - (imgHeight * zoom) / 2;

    return {
      x: Math.round(startX + imageX * zoom),
      y: Math.round(startY + imageY * zoom)
    };
  }

  /**
   * Calculates new zoom and pan offsets so that zooming in/out keeps the image point
   * directly under the cursor stationary on the screen.
   */
  calculateCursorZoom(
    currentZoom: number,
    targetZoom: number,
    cursorScreenX: number,
    cursorScreenY: number,
    transform: Omit<ViewportTransform, 'zoom'>
  ): { zoom: number; panX: number; panY: number } {
    const clampedZoom = Math.max(0.25, Math.min(5.0, Number(targetZoom.toFixed(2))));
    if (clampedZoom === currentZoom) {
      return { zoom: currentZoom, panX: transform.panX, panY: transform.panY };
    }

    const { containerRect, panX, panY, imgWidth, imgHeight } = transform;
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    // Image point currently under cursor
    const startX1 = centerX + panX - (imgWidth * currentZoom) / 2;
    const startY1 = centerY + panY - (imgHeight * currentZoom) / 2;

    const imgPtX = (cursorScreenX - startX1) / currentZoom;
    const imgPtY = (cursorScreenY - startY1) / currentZoom;

    // We want cursorScreenX to equal startX2 + imgPtX * clampedZoom
    // where startX2 = centerX + newPanX - (imgWidth * clampedZoom) / 2
    // => newPanX = cursorScreenX - centerX + (imgWidth * clampedZoom) / 2 - imgPtX * clampedZoom
    const newPanX = Math.round(
      cursorScreenX - centerX + clampedZoom * (imgWidth / 2 - imgPtX)
    );
    const newPanY = Math.round(
      cursorScreenY - centerY + clampedZoom * (imgHeight / 2 - imgPtY)
    );

    return {
      zoom: clampedZoom,
      panX: newPanX,
      panY: newPanY
    };
  }

  /**
   * Returns positions of the 8 resize handles for a bounding box in image coordinates.
   */
  getHandlePositions(rect: RectSelection): Record<ResizeHandle, Point> {
    const { x, y, width, height } = rect;
    const midX = x + width / 2;
    const midY = y + height / 2;

    return {
      nw: { x, y },
      n: { x: midX, y },
      ne: { x: x + width, y },
      e: { x: x + width, y: midY },
      se: { x: x + width, y: y + height },
      s: { x: midX, y: y + height },
      sw: { x, y: y + height },
      w: { x, y: midY }
    };
  }

  /**
   * Detects whether an image coordinate is within tolerance of any bounding box handle.
   */
  detectHandle(
    point: Point,
    rect: RectSelection,
    tolerance = 8
  ): ResizeHandle | null {
    const handles = this.getHandlePositions(rect);
    const handleOrder: ResizeHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'];

    for (const h of handleOrder) {
      const pos = handles[h];
      const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
      if (dist <= tolerance) {
        return h;
      }
    }
    return null;
  }

  /**
   * Resizes a rectangle based on the active handle and target image coordinate,
   * maintaining valid positive dimensions and clamping within image bounds.
   */
  resizeRect(
    original: RectSelection,
    handle: ResizeHandle,
    target: Point,
    imgWidth: number,
    imgHeight: number,
    minSize = 8
  ): RectSelection {
    let { x, y, width, height } = original;
    let right = x + width;
    let bottom = y + height;

    const clampedX = Math.max(0, Math.min(imgWidth, target.x));
    const clampedY = Math.max(0, Math.min(imgHeight, target.y));

    switch (handle) {
      case 'nw':
        x = Math.min(clampedX, right - minSize);
        y = Math.min(clampedY, bottom - minSize);
        width = right - x;
        height = bottom - y;
        break;
      case 'n':
        y = Math.min(clampedY, bottom - minSize);
        height = bottom - y;
        break;
      case 'ne':
        right = Math.max(clampedX, x + minSize);
        y = Math.min(clampedY, bottom - minSize);
        width = right - x;
        height = bottom - y;
        break;
      case 'e':
        right = Math.max(clampedX, x + minSize);
        width = right - x;
        break;
      case 'se':
        right = Math.max(clampedX, x + minSize);
        bottom = Math.max(clampedY, y + minSize);
        width = right - x;
        height = bottom - y;
        break;
      case 's':
        bottom = Math.max(clampedY, y + minSize);
        height = bottom - y;
        break;
      case 'sw':
        x = Math.min(clampedX, right - minSize);
        bottom = Math.max(clampedY, y + minSize);
        width = right - x;
        height = bottom - y;
        break;
      case 'w':
        x = Math.min(clampedX, right - minSize);
        width = right - x;
        break;
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Moves a rectangle by delta (dx, dy), clamping the entire box inside image bounds.
   */
  moveRect(
    original: RectSelection,
    dx: number,
    dy: number,
    imgWidth: number,
    imgHeight: number
  ): RectSelection {
    let newX = original.x + dx;
    let newY = original.y + dy;

    // Clamp inside image boundaries
    newX = Math.max(0, Math.min(imgWidth - original.width, newX));
    newY = Math.max(0, Math.min(imgHeight - original.height, newY));

    return {
      x: Math.round(newX),
      y: Math.round(newY),
      width: original.width,
      height: original.height
    };
  }

  /**
   * Checks if an image point is inside a rectangle.
   */
  isPointInRect(point: Point, rect: RectSelection): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }
}

