export interface ZipFileEntry {
  path: string;
  file: File | Blob;
}

export class ZipBuilder {
  private static readonly CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  static crc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc = ZipBuilder.CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private static toDosDateTime(date: Date): { time: number; date: number } {
    const d = date || new Date();
    const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
    const dt = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
    return { time, date: dt };
  }

  private static async deflateData(data: Uint8Array): Promise<{ compressed: Uint8Array; method: number }> {
    if (typeof CompressionStream !== 'undefined' && data.length > 32) {
      try {
        const cs = new CompressionStream('deflate-raw');
        const writer = cs.writable.getWriter();
        writer.write(data as any);
        writer.close();
        const reader = cs.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        if (totalLen < data.length) {
          const result = new Uint8Array(totalLen);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          return { compressed: result, method: 8 };
        }
      } catch {
        // Fallback to stored
      }
    }
    return { compressed: data, method: 0 };
  }

  /**
   * Creates a valid, standard PKWare ZIP file from an array of file entries.
   * Preserves relative paths, subdirectories, and UTF-8 filenames.
   */
  static async createZipFile(zipBaseName: string, entries: ZipFileEntry[]): Promise<File> {
    const encoder = new TextEncoder();
    const localHeadersAndData: Uint8Array[] = [];
    const centralDirectoryRecords: Uint8Array[] = [];
    let currentOffset = 0;

    const dosTime = ZipBuilder.toDosDateTime(new Date());

    for (const entry of entries) {
      // Normalize path to use forward slashes and remove leading/trailing slashes
      const cleanPath = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
      const pathBytes = encoder.encode(cleanPath);

      // Read file bytes
      const arrayBuffer = await entry.file.arrayBuffer();
      const uncompressedData = new Uint8Array(arrayBuffer);
      const crc = ZipBuilder.crc32(uncompressedData);
      const { compressed: data, method: compressionMethod } = await ZipBuilder.deflateData(uncompressedData);

      const localHeaderOffset = currentOffset;

      // 1. Local File Header (30 bytes + path length)
      const localHeader = new Uint8Array(30 + pathBytes.length);
      const lv = new DataView(localHeader.buffer);

      lv.setUint32(0, 0x04034b50, true); // Local header signature
      lv.setUint16(4, 20, true);         // Version needed: 2.0
      lv.setUint16(6, 0x0800, true);     // General purpose flag: bit 11 (UTF-8)
      lv.setUint16(8, compressionMethod, true);
      lv.setUint16(10, dosTime.time, true);
      lv.setUint16(12, dosTime.date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);             // Compressed size
      lv.setUint32(22, uncompressedData.length, true); // Uncompressed size
      lv.setUint16(26, pathBytes.length, true);
      lv.setUint16(28, 0, true);                       // Extra field length
      localHeader.set(pathBytes, 30);

      localHeadersAndData.push(localHeader);
      localHeadersAndData.push(data);

      currentOffset += localHeader.length + data.length;

      // 2. Central Directory Header (46 bytes + path length)
      const cdRecord = new Uint8Array(46 + pathBytes.length);
      const cv = new DataView(cdRecord.buffer);

      cv.setUint32(0, 0x02014b50, true); // Central directory header signature
      cv.setUint16(4, 20, true);         // Version made by: 2.0
      cv.setUint16(6, 20, true);         // Version needed: 2.0
      cv.setUint16(8, 0x0800, true);     // Flag: UTF-8
      cv.setUint16(10, compressionMethod, true);
      cv.setUint16(12, dosTime.time, true);
      cv.setUint16(14, dosTime.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);             // Compressed size
      cv.setUint32(24, uncompressedData.length, true); // Uncompressed size
      cv.setUint16(28, pathBytes.length, true);
      cv.setUint16(30, 0, true);                       // Extra field length
      cv.setUint16(32, 0, true);                       // Comment length
      cv.setUint16(34, 0, true);                       // Disk number start
      cv.setUint16(36, 0, true);                       // Internal file attributes
      cv.setUint32(38, 0x81A40000, true);              // External file attributes (standard file permissions)
      cv.setUint32(42, localHeaderOffset, true);       // Relative offset of local header
      cdRecord.set(pathBytes, 46);

      centralDirectoryRecords.push(cdRecord);
    }

    const cdOffset = currentOffset;
    let cdSize = 0;
    for (const cd of centralDirectoryRecords) {
      cdSize += cd.length;
    }

    // 3. End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);

    ev.setUint32(0, 0x06054b50, true); // EOCD signature
    ev.setUint16(4, 0, true);          // Disk number
    ev.setUint16(6, 0, true);          // Disk with CD
    ev.setUint16(8, entries.length, true);  // Entries on this disk
    ev.setUint16(10, entries.length, true); // Total entries
    ev.setUint32(12, cdSize, true);         // CD size
    ev.setUint32(16, cdOffset, true);       // CD offset
    ev.setUint16(20, 0, true);              // Comment length

    // Assemble all chunks into Blob
    const blobParts: any[] = [
      ...localHeadersAndData,
      ...centralDirectoryRecords,
      eocd
    ];

    const zipBlob = new Blob(blobParts, { type: 'application/zip' });
    const finalFilename = zipBaseName.toLowerCase().endsWith('.zip') ? zipBaseName : `${zipBaseName}.zip`;

    return new File([zipBlob], finalFilename, {
      type: 'application/zip',
      lastModified: Date.now()
    });
  }
}
