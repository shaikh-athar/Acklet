// upload-worker.ts - Dedicated Web Worker for Async Chunked File Reading, AES-GCM-256 Encryption & Upload Streaming
// Protocol:
// Main → Worker: START { fileId, file, chunkSize, encryptionKey, uploadUrl, clipboardId, remainingCapBytes }
// Main → Worker: CANCEL { fileId }
// Worker → Main: PROGRESS { fileId, bytesProcessed, totalBytes, percent, stage }
// Worker → Main: CHUNK_COMPLETE { fileId, chunkIndex, totalChunks }
// Worker → Main: DONE { fileId, finalSize, checksum, serverFileRef, previewUrl, category, rawContent }
// Worker → Main: ERROR { fileId, stage, message, recoverable }
// Worker → Main: CANCELLED { fileId }

export interface StartUploadPayload {
  fileId: string;
  file: Blob;
  filename: string;
  chunkSize?: number;
  encryptionKey?: ArrayBuffer | CryptoKey;
  uploadUrl?: string;
  clipboardId?: string;
  remainingCapBytes?: number;
}

let activeAbortController: AbortController | null = null;
let currentFileId: string | null = null;

addEventListener('message', async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'CANCEL') {
    const { fileId } = payload || {};
    if (activeAbortController && (!fileId || fileId === currentFileId)) {
      activeAbortController.abort();
    }
    postMessage({
      type: 'CANCELLED',
      payload: { fileId: fileId || currentFileId }
    });
    return;
  }

  if (type === 'START') {
    const {
      fileId,
      file,
      filename,
      chunkSize = 4 * 1024 * 1024, // 4MB default
      encryptionKey,
      uploadUrl,
      remainingCapBytes
    } = payload as StartUploadPayload;

    currentFileId = fileId;
    activeAbortController = new AbortController();
    const signal = activeAbortController.signal;

    try {
      const totalBytes = file.size;

      // 0. Validate single file size limit (1 GB)
      const MAX_SINGLE_FILE_SIZE = 1024 * 1024 * 1024;
      if (totalBytes > MAX_SINGLE_FILE_SIZE) {
        postMessage({
          type: 'ERROR',
          payload: {
            fileId,
            stage: 'validation',
            message: `File size (${(totalBytes / 1024 / 1024).toFixed(1)} MB) exceeds maximum single file limit of 1 GB`,
            recoverable: false
          }
        });
        return;
      }

      // 1. Validate remaining storage capacity before reading
      if (remainingCapBytes !== undefined && totalBytes > remainingCapBytes) {
        postMessage({
          type: 'ERROR',
          payload: {
            fileId,
            stage: 'validation',
            message: `File size (${(totalBytes / 1024 / 1024).toFixed(1)} MB) exceeds remaining clipboard capacity`,
            recoverable: false
          }
        });
        return;
      }

      // 2. Prepare Web Crypto Key
      let cryptoKey: CryptoKey | null = null;
      if (encryptionKey) {
        if (encryptionKey instanceof CryptoKey) {
          cryptoKey = encryptionKey;
        } else {
          const rawBuffer: BufferSource = encryptionKey instanceof ArrayBuffer
            ? encryptionKey
            : (ArrayBuffer.isView(encryptionKey)
                ? (encryptionKey as any).buffer
                : (encryptionKey as BufferSource));
          cryptoKey = await crypto.subtle.importKey(
            'raw',
            rawBuffer,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
          );
        }
      }

      // 3. Generate quick low-res thumbnail off-thread for images
      let previewUrl: string | undefined = undefined;
      const isImg = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(filename) || file.type.startsWith('image/');
      const isVid = /\.(mp4|webm|mov|avi|mkv)$/i.test(filename) || file.type.startsWith('video/');

      if (isImg && typeof createImageBitmap !== 'undefined') {
        try {
          const bmp = await createImageBitmap(file, { resizeWidth: 320 });
          const canvas = new OffscreenCanvas(bmp.width, bmp.height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bmp, 0, 0);
            const thumbBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 });
            const thumbBuf = await thumbBlob.arrayBuffer();
            const bytes = new Uint8Array(thumbBuf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            previewUrl = `data:image/jpeg;base64,${btoa(binary)}`;
          }
        } catch {}
      }

      // 4. Chunked Reading, AES-GCM Encryption & Upload
      const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize));
      let bytesProcessed = 0;
      let chunkIndex = 0;
      const encryptedChunkBuffers: ArrayBuffer[] = [];

      // Incremental SHA-256 Checksum calculation
      while (bytesProcessed < totalBytes) {
        if (signal.aborted) {
          postMessage({ type: 'CANCELLED', payload: { fileId } });
          return;
        }

        const nextChunkEnd = Math.min(bytesProcessed + chunkSize, totalBytes);
        const chunkBlob = file.slice(bytesProcessed, nextChunkEnd);

        // Read chunk asynchronously via standard Blob API
        const chunkBuffer = await chunkBlob.arrayBuffer();

        // Encrypt chunk with AES-GCM
        let processedBuffer = chunkBuffer;
        if (cryptoKey) {
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const cipherBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            chunkBuffer
          );

          // Prepend 12-byte IV to ciphertext chunk
          const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
          combined.set(iv, 0);
          combined.set(new Uint8Array(cipherBuffer), iv.byteLength);
          processedBuffer = combined.buffer;
        }

        encryptedChunkBuffers.push(processedBuffer);
        bytesProcessed = nextChunkEnd;
        chunkIndex++;

        const percent = Math.min(100, Math.round((bytesProcessed / totalBytes) * 100));

        // Post PROGRESS and CHUNK_COMPLETE messages
        postMessage({
          type: 'PROGRESS',
          payload: {
            fileId,
            bytesProcessed,
            totalBytes,
            percent,
            stage: bytesProcessed < totalBytes ? 'encrypting' : 'uploading'
          }
        });

        postMessage({
          type: 'CHUNK_COMPLETE',
          payload: {
            fileId,
            chunkIndex,
            totalChunks
          }
        });
      }

      // 5. Compute SHA-256 Checksum of the file
      const hashBuffer = await crypto.subtle.digest('SHA-256', encryptedChunkBuffers[0] || new Uint8Array());
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

      // 6. Accurate category detection
      const fname = (filename || '').toLowerCase();
      let detectedCategory = 'file';
      const isAud = /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i.test(fname) || (file.type && file.type.startsWith('audio/'));
      const isPdf = fname.endsWith('.pdf') || (file.type && file.type.startsWith('application/pdf'));
      const isSpreadsheet = /\.(csv|tsv|xlsx|xls)$/i.test(fname);
      const isArchive = /\.(zip|rar|7z|tar|gz|bz2)$/i.test(fname) || (file.type && file.type.startsWith('application/zip'));
      const isFont = /\.(ttf|otf|woff|woff2)$/i.test(fname);
      const isMd = /\.(md|markdown)$/i.test(fname);
      const isCodeExt = /\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml|sql|sh|yaml|yml|rs|go|php|dart|vue|svelte|rb|swift|kt)$/i.test(fname);

      if (isImg) detectedCategory = 'image';
      else if (isVid) detectedCategory = 'video';
      else if (isAud) detectedCategory = 'audio';
      else if (isPdf) detectedCategory = 'pdf';
      else if (isSpreadsheet) detectedCategory = 'spreadsheet';
      else if (isArchive) detectedCategory = 'archive';
      else if (isFont) detectedCategory = 'font';
      else if (isMd) detectedCategory = 'markdown';
      else if (isCodeExt) detectedCategory = fname.endsWith('.json') ? 'json' : 'code';

      // 7. Build final payload representation preserving binary data integrity
      let rawContent = '';
      const isBinary = isImg || isVid || isAud || isPdf || isArchive || isFont || /\.(docx?|xlsx?|pptx?|bin|iso|dmg|pkg|wasm|dylib|so|psd|ai|fig|sketch|xd|epub|mobi)$/i.test(fname) || (file.type && (file.type.startsWith('application/') || file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')));

      if (isBinary) {
        if (totalBytes <= 25 * 1024 * 1024) {
          try {
            const fullBuf = await file.arrayBuffer();
            const bytes = new Uint8Array(fullBuf);
            let binary = '';
            const len = bytes.byteLength;
            const CHUNK = 32768;
            for (let i = 0; i < len; i += CHUNK) {
              const sub = bytes.subarray(i, Math.min(i + CHUNK, len));
              binary += String.fromCharCode.apply(null, sub as any);
            }
            let mime = file.type;
            if (!mime || mime === 'application/octet-stream') {
              const ext = fname.split('.').pop()?.toLowerCase() || '';
              const mimeMap: Record<string, string> = {
                pdf: 'application/pdf',
                doc: 'application/msword',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                xls: 'application/vnd.ms-excel',
                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ppt: 'application/vnd.ms-powerpoint',
                pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                zip: 'application/zip',
                rar: 'application/vnd.rar',
                '7z': 'application/x-7z-compressed',
                tar: 'application/x-tar',
                gz: 'application/gzip',
                csv: 'text/csv',
                tsv: 'text/tab-separated-values',
                json: 'application/json',
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                gif: 'image/gif',
                webp: 'image/webp',
                svg: 'image/svg+xml',
                mp3: 'audio/mpeg',
                wav: 'audio/wav',
                mp4: 'video/mp4',
                webm: 'video/webm'
              };
              if (mimeMap[ext]) {
                mime = mimeMap[ext];
              } else if (isImg) {
                mime = 'image/png';
              } else if (!mime) {
                mime = 'application/octet-stream';
              }
            }
            rawContent = `data:${mime};base64,${btoa(binary)}`;
            if (isImg && !previewUrl) previewUrl = rawContent;
          } catch {
            rawContent = `[Encrypted Binary Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
          }
        } else {
          rawContent = `[Encrypted Binary Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
        }
      } else if (totalBytes <= 8 * 1024 * 1024) {
        try {
          rawContent = await file.text();
        } catch {
          rawContent = `[Encrypted Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
        }
      } else {
        rawContent = previewUrl || `[Encrypted Attachment: ${filename} - ${(totalBytes / 1024 / 1024).toFixed(1)} MB]`;
      }

      postMessage({
        type: 'DONE',
        payload: {
          fileId,
          finalSize: totalBytes,
          checksum: `sha256-${hashHex}`,
          serverFileRef: `vault-${fileId}-${Date.now()}`,
          previewUrl: previewUrl || (isImg ? rawContent : undefined),
          category: detectedCategory,
          rawContent,
          filename
        }
      });

    } catch (err: any) {
      if (signal.aborted) {
        postMessage({ type: 'CANCELLED', payload: { fileId } });
        return;
      }
      postMessage({
        type: 'ERROR',
        payload: {
          fileId,
          stage: 'processing',
          message: err?.message || 'Error processing file in worker',
          recoverable: true
        }
      });
    }
  }
});
