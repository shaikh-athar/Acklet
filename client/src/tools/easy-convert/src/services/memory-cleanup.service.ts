export class MemoryCleanupService {
  private static activeUrls = new Set<string>();

  static registerUrl(url: string): string {
    this.activeUrls.add(url);
    return url;
  }

  static revokeUrl(url: string | undefined): void {
    if (url && this.activeUrls.has(url)) {
      URL.revokeObjectURL(url);
      this.activeUrls.delete(url);
    }
  }

  static revokeAll(): void {
    for (const url of this.activeUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeUrls.clear();
  }
}
