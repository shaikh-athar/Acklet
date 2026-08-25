export interface ZipFileEntry {
  name: string;
  blob: Blob;
}

export class ZipBuilderService {
  /**
   * Builds a valid uncompressed (Store method) ZIP archive from a list of Blob files in pure TypeScript.
   */
  static async createZip(entries: ZipFileEntry[]): Promise<Blob> {
    const fileParts: Uint8Array[] = [];
    const centralDirectoryParts: Uint8Array[] = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = new TextEncoder().encode(entry.name);
      const contentBytes = new Uint8Array(await entry.blob.arrayBuffer());
      const crc = this.calculateCrc32(contentBytes);
      const size = contentBytes.length;

      // Local file header (30 bytes + filename)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(localHeader.buffer);

      view.setUint32(0, 0x04034b50, true); // Local file header signature
      view.setUint16(4, 20, true);         // Version needed
      view.setUint16(6, 0, true);          // General purpose flag
      view.setUint16(8, 0, true);          // Compression method (0 = store)
      view.setUint16(10, 0, true);         // Modification time
      view.setUint16(12, 0, true);         // Modification date
      view.setUint32(14, crc, true);       // CRC-32
      view.setUint32(18, size, true);      // Compressed size
      view.setUint32(22, size, true);      // Uncompressed size
      view.setUint16(26, nameBytes.length, true); // Filename length
      view.setUint16(28, 0, true);         // Extra field length

      localHeader.set(nameBytes, 30);

      fileParts.push(localHeader);
      fileParts.push(contentBytes);

      // Central Directory Header (46 bytes + filename)
      const cdHeader = new Uint8Array(46 + nameBytes.length);
      const cdView = new DataView(cdHeader.buffer);

      cdView.setUint32(0, 0x02014b50, true); // Central directory signature
      cdView.setUint16(4, 20, true);         // Version made by
      cdView.setUint16(6, 20, true);         // Version needed
      cdView.setUint16(8, 0, true);          // Flag
      cdView.setUint16(10, 0, true);         // Compression method
      cdView.setUint16(12, 0, true);         // Mod time
      cdView.setUint16(14, 0, true);         // Mod date
      cdView.setUint32(16, crc, true);       // CRC-32
      cdView.setUint32(20, size, true);      // Compressed size
      cdView.setUint32(24, size, true);      // Uncompressed size
      cdView.setUint16(28, nameBytes.length, true); // Filename length
      cdView.setUint16(30, 0, true);         // Extra length
      cdView.setUint16(32, 0, true);         // Comment length
      cdView.setUint16(34, 0, true);         // Disk start
      cdView.setUint16(36, 0, true);         // Internal attributes
      cdView.setUint32(38, 0, true);         // External attributes
      cdView.setUint32(42, offset, true);    // Local header offset

      cdHeader.set(nameBytes, 46);
      centralDirectoryParts.push(cdHeader);

      offset += localHeader.length + size;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const part of centralDirectoryParts) {
      cdSize += part.length;
    }

    // End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);

    eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
    eocdView.setUint16(4, 0, true);          // Disk number
    eocdView.setUint16(6, 0, true);          // Disk with CD
    eocdView.setUint16(8, entries.length, true);  // Disk entries
    eocdView.setUint16(10, entries.length, true); // Total entries
    eocdView.setUint32(12, cdSize, true);    // CD size
    eocdView.setUint32(16, cdOffset, true);  // CD offset
    eocdView.setUint16(20, 0, true);         // Comment length

    const blobParts: BlobPart[] = [
      ...fileParts.map(p => p.buffer as ArrayBuffer),
      ...centralDirectoryParts.map(p => p.buffer as ArrayBuffer),
      eocd.buffer as ArrayBuffer
    ];
    return new Blob(blobParts, { type: 'application/zip' });
  }

  private static calculateCrc32(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
