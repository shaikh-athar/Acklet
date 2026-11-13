// apps/tool-image-compressor/src/services/download-helper.util.ts
import JSZip from 'jszip';

export interface DownloadItem {
  filename: string;
  blob: Blob;
  folder?: string;
}

/**
 * Initiates a browser download for a single Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

/**
 * Packages multiple blobs into a ZIP file with filename collision handling, then downloads it.
 */
export async function downloadZip(
  items: DownloadItem[],
  zipFilename = 'acklet-compressed-images.zip'
): Promise<void> {
  const validItems = items.filter(it => it && it.blob && it.blob.size > 0);
  if (validItems.length === 0) {
    return;
  }

  const zip = new JSZip();
  const seenNames = new Map<string, number>();

  for (const item of validItems) {
    let name = (item.filename || 'compressed-image').replace(/[\\/:*?"<>|]/g, '_');

    if (seenNames.has(name)) {
      const count = seenNames.get(name)! + 1;
      seenNames.set(name, count);

      const dotIdx = name.lastIndexOf('.');
      if (dotIdx !== -1) {
        const base = name.substring(0, dotIdx);
        const ext = name.substring(dotIdx);
        name = `${base} (${count})${ext}`;
      } else {
        name = `${name} (${count})`;
      }
    } else {
      seenNames.set(name, 0);
    }

    const path = item.folder ? `${item.folder}/${name}` : name;
    zip.file(path, item.blob);
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  downloadBlob(zipBlob, zipFilename);
}

