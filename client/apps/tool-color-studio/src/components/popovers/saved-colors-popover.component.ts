// apps/tool-color-studio/src/components/popovers/saved-colors-popover.component.ts
import { Component, inject, signal, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-saved-colors-popover',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="popover-backdrop" (click)="close.emit()"></div>
    <div class="popover-panel animate-scale-in" role="dialog" aria-label="Saved Colors">
      <div class="popover-header">
        <div class="popover-title-row">
          <ts-icon name="bookmark" [size]="15" class="popover-icon" />
          <h4 class="popover-title">Saved Colors</h4>
          <span class="count-badge">{{ state.savedColorItems().length }}</span>
        </div>
        <div class="header-actions">
          @if (state.savedColorItems().length > 0) {
            <button 
              type="button" 
              class="text-action-btn danger" 
              (click)="state.clearSavedColors()"
              title="Clear all saved colors"
            >
              Clear
            </button>
          }
          <button 
            type="button" 
            class="close-btn" 
            (click)="close.emit()" 
            aria-label="Close popover"
          >
            <ts-icon name="x" [size]="14" />
          </button>
        </div>
      </div>

      <!-- Quick Save Current Color -->
      <div class="quick-save-row">
        <div class="active-preview" [style.background-color]="state.activeColor()"></div>
        <input 
          type="text" 
          class="save-name-input" 
          [(ngModel)]="colorName" 
          placeholder="Name current color..." 
          maxlength="24"
          (keydown.enter)="saveCurrent()"
        />
        <button 
          type="button" 
          class="save-current-btn" 
          (click)="saveCurrent()"
          title="Save active color to bookmarks"
        >
          <ts-icon name="plus" [size]="14" />
          <span>Save</span>
        </button>
      </div>

      <div class="popover-body">
        @if (state.savedColorItems().length === 0) {
          <div class="empty-state">
            <ts-icon name="bookmark" [size]="24" class="empty-icon" />
            <p class="empty-text">No saved colors yet.</p>
            <span class="empty-subtext">Bookmark swatches above to quickly reuse them across modules.</span>
          </div>
        } @else {
          <div class="saved-list">
            @for (item of state.savedColorItems(); track item.id) {
              <div 
                class="saved-row"
                [class.active]="item.hex.toUpperCase() === state.activeColor().toUpperCase()"
              >
                <div 
                  class="saved-swatch"
                  [style.background-color]="item.hex"
                  (click)="selectColor(item.hex)"
                  [title]="'Select ' + item.name"
                  role="button"
                  tabindex="0"
                ></div>

                <div class="saved-info">
                  @if (editingItemId() === item.id) {
                    <div class="inline-edit-box" (click)="$event.stopPropagation()">
                      <input 
                        type="text" 
                        class="inline-name-input" 
                        [(ngModel)]="editingItemName" 
                        (keydown.enter)="commitEdit(item.id, $event)"
                        (keydown.escape)="cancelEdit($event)"
                        maxlength="24"
                      />
                      <button type="button" class="icon-tiny-btn confirm" (click)="commitEdit(item.id, $event)" title="Save name">
                        <ts-icon name="check" [size]="12" />
                      </button>
                      <button type="button" class="icon-tiny-btn" (click)="cancelEdit($event)" title="Cancel">
                        <ts-icon name="x" [size]="12" />
                      </button>
                    </div>
                  } @else {
                    <div class="name-with-edit">
                      <span class="saved-name" (click)="selectColor(item.hex)">{{ item.name }}</span>
                      <button 
                        type="button" 
                        class="rename-trigger-btn" 
                        (click)="startEdit(item, $event)"
                        title="Rename color"
                        aria-label="Rename color"
                      >
                        <ts-icon name="pencil" [size]="11" />
                      </button>
                    </div>
                    <span class="saved-hex" (click)="selectColor(item.hex)">{{ item.hex.toUpperCase() }}</span>
                  }
                </div>

                <div class="saved-actions">
                  <button 
                    type="button" 
                    class="icon-btn" 
                    (click)="copyHex(item.hex)"
                    title="Copy HEX"
                  >
                    <ts-icon name="copy" [size]="12" />
                  </button>
                  <button 
                    type="button" 
                    class="icon-btn danger" 
                    (click)="state.removeSavedColor(item.id)"
                    title="Delete bookmark"
                  >
                    <ts-icon name="trash" [size]="12" />
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      z-index: 50;
    }

    .popover-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
    }

    .popover-panel {
      position: relative;
      z-index: 50;
      width: 330px;
      background: var(--bg-surface, #18181B);
      border: 1px solid var(--border-default, #27272A);
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    }

    :host-context([data-theme="light"]) .popover-panel {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
    }

    .popover-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-default, #27272A);
    }

    :host-context([data-theme="light"]) .popover-header {
      border-bottom-color: #F1F5F9;
    }

    .popover-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .popover-icon {
      color: var(--tool-accent, #2563EB);
    }

    .popover-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .popover-title {
      color: #0F172A;
    }

    .count-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 9999px;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .text-action-btn {
      font-size: 11px;
      font-weight: 600;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted, #A1A1AA);
    }

    .text-action-btn.danger:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: none;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
    }

    .close-btn:hover {
      background: var(--bg-hover, rgba(255, 255, 255, 0.06));
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .quick-save-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--border-default, #27272A);
    }

    :host-context([data-theme="light"]) .quick-save-row {
      background: #F8FAFC;
      border-bottom-color: #F1F5F9;
    }

    .active-preview {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      flex-shrink: 0;
    }

    .save-name-input {
      flex: 1;
      height: 28px;
      padding: 0 8px;
      font-size: 12px;
      background: var(--bg-base, #09090B);
      border: 1px solid var(--border-default, #27272A);
      border-radius: 6px;
      color: var(--text, #F4F4F5);
      outline: none;
    }

    :host-context([data-theme="light"]) .save-name-input {
      background: #FFFFFF;
      border-color: #CBD5E1;
      color: #0F172A;
    }

    .save-name-input:focus {
      border-color: var(--tool-accent, #2563EB);
    }

    .save-current-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 600;
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .popover-body {
      padding: 8px 10px;
      max-height: 280px;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px 8px;
    }

    .empty-icon {
      color: var(--text-muted, #71717A);
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0 0 4px;
    }

    :host-context([data-theme="light"]) .empty-text {
      color: #0F172A;
    }

    .empty-subtext {
      font-size: 11px;
      color: var(--text-muted, #A1A1AA);
      line-height: 1.4;
    }

    .saved-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .saved-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px;
      border-radius: 8px;
      transition: background 0.12s ease;
    }

    .saved-row:hover {
      background: var(--bg-hover, rgba(255, 255, 255, 0.04));
    }

    :host-context([data-theme="light"]) .saved-row:hover {
      background: #F8FAFC;
    }

    .saved-row.active {
      background: rgba(37, 99, 235, 0.1);
    }

    .saved-swatch {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      cursor: pointer;
      flex-shrink: 0;
    }

    .saved-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      min-width: 0;
    }

    .saved-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .saved-name {
      color: #0F172A;
    }

    .saved-hex {
      font-size: 11px;
      font-family: monospace;
      color: var(--text-muted, #A1A1AA);
    }

    .saved-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: none;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
    }

    .icon-btn:hover {
      color: var(--text, #F4F4F5);
      background: rgba(255, 255, 255, 0.06);
    }

    :host-context([data-theme="light"]) .icon-btn:hover {
      color: #0F172A;
      background: #F1F5F9;
    }

    .icon-btn.danger:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .name-with-edit {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rename-trigger-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: none;
      background: transparent;
      color: var(--text-muted, #71717A);
      border-radius: 3px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 120ms ease;
    }

    .rename-trigger-btn:hover {
      opacity: 1;
      color: var(--tool-accent, #2563EB);
      background: rgba(37, 99, 235, 0.08);
    }

    .inline-edit-box {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .inline-name-input {
      flex: 1;
      padding: 2px 6px;
      font-size: 11px;
      background: var(--bg-1, #18181B);
      border: 1px solid var(--tool-accent, #2563EB);
      border-radius: 4px;
      color: var(--text, #F4F4F5);
      outline: none;
    }

    :host-context([data-theme="light"]) .inline-name-input {
      background: #FFFFFF;
      color: #0F172A;
    }

    .icon-tiny-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      cursor: pointer;
      color: var(--text-muted, #A1A1AA);
    }

    .icon-tiny-btn.confirm {
      color: #10B981;
    }

    .icon-tiny-btn:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    @media (max-width: 640px) {
      :host {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        margin: 0;
        z-index: 9999;
      }
      .popover-panel {
        width: 100% !important;
        max-height: 80vh;
        border-radius: 16px 16px 0 0;
        box-sizing: border-box;
      }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .animate-scale-in {
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class SavedColorsPopoverComponent {
  public state = inject(ColorStudioStateService);
  public close = output<void>();
  public colorName = '';
  public editingItemId = signal<string | null>(null);
  public editingItemName = '';

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.close.emit();
  }

  public startEdit(item: any, event?: Event): void {
    event?.stopPropagation();
    this.editingItemId.set(item.id);
    this.editingItemName = item.name;
  }

  public commitEdit(id: string, event?: Event): void {
    event?.stopPropagation();
    const trimmed = this.editingItemName.trim();
    if (trimmed) {
      this.state.updateSavedColorName(id, trimmed);
    }
    this.editingItemId.set(null);
  }

  public cancelEdit(event?: Event): void {
    event?.stopPropagation();
    this.editingItemId.set(null);
  }

  public saveCurrent(): void {
    const name = this.colorName.trim() || 'Custom Color';
    this.state.saveColor(this.state.activeColor(), name);
    this.colorName = '';
  }

  public selectColor(hex: string): void {
    this.state.setSelectedColor(hex);
    this.close.emit();
  }

  public copyHex(hex: string): void {
    this.state.copyToClipboard(hex.toUpperCase(), 'HEX');
  }
}

