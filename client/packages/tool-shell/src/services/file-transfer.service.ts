// packages/tool-shell/src/services/file-transfer.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FileTransferService {
  /** Pending files transferred across navigation or dropped globally */
  readonly pendingFiles = signal<File[]>([]);
  /** Global drag state active across the viewport */
  readonly isGlobalDragging = signal<boolean>(false);

  setPendingFiles(files: FileList | File[]): void {
    this.isGlobalDragging.set(false);
    const list = Array.from(files);
    if (list.length > 0) {
      this.pendingFiles.set(list);
    }
  }

  clearDragging(): void {
    this.isGlobalDragging.set(false);
  }

  consumePendingFiles(): File[] {
    this.isGlobalDragging.set(false);
    const current = this.pendingFiles();
    if (current.length > 0) {
      this.pendingFiles.set([]);
    }
    return current;
  }
}
