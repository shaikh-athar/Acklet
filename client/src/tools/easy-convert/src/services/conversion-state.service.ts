import { Injectable, signal, computed } from '@angular/core';
import { FileItem, JobState } from '../pages/easy-convert.component';

@Injectable({
  providedIn: 'root'
})
export class ConversionStateService {
  // 1. FILE & QUEUE STATE
  readonly fileQueue = signal<FileItem[]>([]);

  // 2. UI & PREFERENCE STATE
  readonly stripMetadataGlobal = signal<boolean>(true);
  readonly activePreviewItem = signal<FileItem | null>(null);
  readonly isDraggingOver = signal<boolean>(false);

  // 3. COMPUTED DERIVED STATE
  readonly completedCount = computed(() => this.fileQueue().filter(f => f.status === 'completed').length);
  readonly failedCount = computed(() => this.fileQueue().filter(f => f.status === 'failed' || f.status === 'mismatch').length);
  readonly processingCount = computed(() => this.fileQueue().filter(f => f.status === 'processing').length);

  // ACTIONS
  setFiles(files: FileItem[]): void {
    this.fileQueue.set(files);
  }

  addFile(file: FileItem): void {
    this.fileQueue.update(list => [...list, file]);
  }

  removeFile(id: string): void {
    this.fileQueue.update(list => list.filter(f => f.id !== id));
  }

  clearQueue(): void {
    this.fileQueue.set([]);
  }

  updateFile(id: string, partial: Partial<FileItem>): void {
    this.fileQueue.update(list => list.map(f => f.id === id ? { ...f, ...partial } : f));
  }

  setPreviewItem(item: FileItem | null): void {
    this.activePreviewItem.set(item);
  }
}
