// apps/tool-image-compressor/src/services/save-destination.util.ts

/** Result of a clipboard copy operation */
export interface ClipboardCopyResult {
  success: boolean;
  message?: string;
}

/**
 * Safely copies a single image blob or ZIP blob to the system clipboard.
 * If clipboard writing is unsupported or rejected by the browser environment,
 * returns { success: false, message: "Your browser cannot copy this. Use Download." }.
 */
export async function copyBlobToClipboard(blob: Blob): Promise<ClipboardCopyResult> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    return {
      success: false,
      message: 'Your browser cannot copy this. Use Download.'
    };
  }

  // 1. Image Blob handling
  if (blob.type.startsWith('image/')) {
    try {
      // Standard ClipboardItem API
      if (typeof ClipboardItem !== 'undefined') {
        // Direct attempt with original image mime type if supported
        try {
          const item = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([item]);
          return { success: true };
        } catch {
          // Fallback: browsers like Chrome/Safari frequently only allow 'image/png' in ClipboardItem.
          // Convert to PNG in memory via Canvas.
          const pngBlob = await convertBlobToPng(blob);
          if (pngBlob) {
            const item = new ClipboardItem({ 'image/png': pngBlob });
            await navigator.clipboard.write([item]);
            return { success: true };
          }
        }
      }
      return {
        success: false,
        message: 'Your browser cannot copy this. Use Download.'
      };
    } catch {
      return {
        success: false,
        message: 'Your browser cannot copy this. Use Download.'
      };
    }
  }

  // 2. ZIP / Multiple files handling
  try {
    if (typeof ClipboardItem !== 'undefined') {
      const mime = blob.type || 'application/zip';
      const item = new ClipboardItem({ [mime]: blob });
      await navigator.clipboard.write([item]);
      return { success: true };
    }
    return {
      success: false,
      message: 'Your browser cannot copy this. Use Download.'
    };
  } catch {
    return {
      success: false,
      message: 'Your browser cannot copy this. Use Download.'
    };
  }
}

/**
 * In-memory conversion of any image blob to image/png for universal ClipboardItem compliance.
 */
async function convertBlobToPng(sourceBlob: Blob): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(sourceBlob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 100;
          canvas.height = img.naturalHeight || img.height || 100;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => resolve(b), 'image/png');
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
