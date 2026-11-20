// apps/tool-image-compressor/src/services/dropdown-manager.service.ts
import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DropdownManagerService {
  /** Holds the ID of the currently open dropdown across the workspace. Null if none open. */
  private readonly _activeDropdownId = signal<string | null>(null);

  /** Public read-only signal of the currently open dropdown ID. */
  readonly activeDropdownId = this._activeDropdownId.asReadonly();

  /**
   * Returns true if the dropdown with the given ID is currently open.
   */
  isOpen(id: string): boolean {
    return this._activeDropdownId() === id;
  }

  /**
   * Returns a reactive computed signal indicating if this specific dropdown ID is open.
   */
  createIsOpenSignal(id: string) {
    return computed(() => this._activeDropdownId() === id);
  }

  /**
   * Opens the specified dropdown, immediately closing any previously open dropdown.
   */
  open(id: string): void {
    this._activeDropdownId.set(id);
  }

  /**
   * Closes the dropdown. If an ID is provided, closes only if that ID is currently active.
   * If no ID is provided, closes whatever dropdown is active.
   */
  close(id?: string): void {
    if (!id || this._activeDropdownId() === id) {
      this._activeDropdownId.set(null);
    }
  }

  /**
   * Toggles the dropdown: closes it if already open; opens it (and closes any other) if closed.
   */
  toggle(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.isOpen(id)) {
      this.close(id);
    } else {
      this.open(id);
    }
  }

  /**
   * Explicitly closes all dropdowns.
   */
  closeAll(): void {
    this._activeDropdownId.set(null);
  }
}
