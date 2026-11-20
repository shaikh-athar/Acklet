// apps/tool-image-compressor/src/components/preview-modal/preview-scale.util.ts

/**
 * Utility functions for linked scale, pixel zoom, sync pan, and dimensional labels
 * in the Acklet Preview Modal (Feature 2).
 */

export function computeIsPixelMode(zoomLevel: number, isFitMode: boolean): boolean {
  return !isFitMode && zoomLevel >= 4;
}

export function computeZoomIn(currentZoom: number): number {
  if (currentZoom < 1) return Math.round((currentZoom + 0.25) * 100) / 100;
  if (currentZoom < 3) return Math.round((currentZoom + 0.5) * 10) / 10;
  return Math.min(8, currentZoom + 2);
}

export function computeZoomOut(currentZoom: number): number {
  if (currentZoom > 3) return Math.max(3, currentZoom - 2);
  if (currentZoom > 1) return Math.max(1, Math.round((currentZoom - 0.5) * 10) / 10);
  return Math.max(0.5, Math.round((currentZoom - 0.25) * 100) / 100);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export function formatImageDimensions(width: number, height: number): string {
  if (width > 0 && height > 0) {
    return `${width} × ${height} px`;
  }
  return 'Vector / Dynamic';
}

export function computePaneTransform(
  isFitMode: boolean,
  panX: number,
  panY: number,
  zoomLevel: number
): string {
  if (isFitMode) return 'none';
  return `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}
