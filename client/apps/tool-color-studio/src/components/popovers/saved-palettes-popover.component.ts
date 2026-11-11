// apps/tool-color-studio/src/components/popovers/saved-palettes-popover.component.ts
import { Component, inject, signal, output, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ColorStudioStateService } from '../../services/color-studio-state.service';
import { SavedPalette } from '../../models/color.models';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-saved-palettes-popover',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="popover-backdrop" (click)="close.emit()"></div>
    <div class="popover-panel animate-scale-in" role="dialog" aria-label="Saved Palettes">
      <div class="popover-header">
        <div class="popover-title-row">
          <ts-icon name="palette" [size]="15" class="popover-icon" />
          <h4 class="popover-title">Saved Palettes</h4>
          <span class="count-badge">{{ state.savedPalettes().length }}</span>
        </div>
        <div class="header-actions">
          @if (state.savedPalettes().length > 0) {
            <button 
              type="button" 
              class="text-action-btn danger" 
              (click)="state.clearSavedPalettes()"
              title="Clear all saved palettes"
            >
              Clear All
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

      <div class="popover-body">
        @if (state.savedPalettes().length === 0) {
          <div class="empty-state">
            <ts-icon name="palette" [size]="28" class="empty-icon" />
            <p class="empty-text">No saved palettes yet.</p>
            <span class="empty-subtext">Extract colors from an image and click "Save Palette" to store palettes here.</span>
          </div>
        } @else {
          <div class="palettes-list">
            @for (pal of state.savedPalettes(); track pal.id) {
              <div class="palette-row">
                
                <div class="palette-info">
                  @if (editingPaletteId() === pal.id) {
                    <div class="inline-edit-box" (click)="$event.stopPropagation()">
                      <input 
                        type="text" 
                        class="inline-name-input" 
                        [(ngModel)]="editingPaletteName" 
                        (keydown.enter)="commitEdit(pal.id)"
                        (keydown.escape)="cancelEdit()"
                        maxlength="32"
                        autofocus
                      />
                      <button type="button" class="icon-tiny-btn confirm" (click)="commitEdit(pal.id)" title="Save name">
                        <ts-icon name="check" [size]="12" />
                      </button>
                      <button type="button" class="icon-tiny-btn" (click)="cancelEdit()" title="Cancel">
                        <ts-icon name="x" [size]="12" />
                      </button>
                    </div>
                  } @else {
                    <div class="name-line">
                      <span class="palette-name" [title]="pal.name">{{ pal.name }}</span>
                      <button 
                        type="button" 
                        class="icon-tiny-btn rename-btn" 
                        (click)="startEdit(pal, $event)" 
                        title="Rename palette"
                      >
                        <ts-icon name="pencil" [size]="11" />
                      </button>
                    </div>
                  }

                  <!-- Mini Swatches Bar -->
                  <div class="swatches-strip">
                    @for (hex of pal.colors; track hex) {
                      <div 
                        class="mini-swatch" 
                        [style.background-color]="hex" 
                        [title]="hex + ' (click to select)'"
                        (click)="state.setSelectedColor(hex)"
                      ></div>
                    }
                  </div>
                </div>

                <div class="palette-actions">
                  <button 
                    type="button" 
                    class="action-pill-btn" 
                    (click)="loadIntoShared(pal)"
                    title="Load into Shared Working Palette"
                  >
                    <ts-icon name="layers" [size]="12" />
                    <span>Load</span>
                  </button>
                  <button 
                    type="button" 
                    class="icon-tiny-btn danger" 
                    (click)="state.deleteSavedPalette(pal.id)"
                    title="Delete palette"
                  >
                    <ts-icon name="trash-2" [size]="12" />
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
      width: 360px;
      max-width: 90vw;
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
      transition: all 120ms ease;
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
      background: transparent;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .close-btn:hover {
      background: var(--bg-hover, #27272A);
      color: var(--text, #F4F4F5);
    }

    :host-context([data-theme="light"]) .close-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .popover-body {
      padding: 12px 14px;
      max-height: 380px;
      overflow-y: auto;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 28px 16px;
      text-align: center;
      gap: 6px;
    }

    .empty-icon {
      color: var(--text-muted, #71717A);
      opacity: 0.5;
      margin-bottom: 4px;
    }

    .empty-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      margin: 0;
    }

    :host-context([data-theme="light"]) .empty-text {
      color: #0F172A;
    }

    .empty-subtext {
      font-size: 12px;
      color: var(--text-muted, #A1A1AA);
      line-height: 1.4;
    }

    .palettes-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .palette-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: var(--bg-card, #27272A);
      border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
      transition: border-color 120ms ease;
    }

    :host-context([data-theme="light"]) .palette-row {
      background: #F8FAFC;
      border-color: #E2E8F0;
    }

    .palette-row:hover {
      border-color: var(--tool-accent, #2563EB);
    }

    .palette-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .name-line {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .palette-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text, #F4F4F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .palette-name {
      color: #0F172A;
    }

    .swatches-strip {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .mini-swatch {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: transform 120ms ease;
    }

    :host-context([data-theme="light"]) .mini-swatch {
      border-color: rgba(0, 0, 0, 0.12);
    }

    .mini-swatch:hover {
      transform: scale(1.2);
      z-index: 2;
    }

    .palette-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .action-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(37, 99, 235, 0.12);
      color: var(--tool-accent, #2563EB);
      border: 1px solid rgba(37, 99, 235, 0.25);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .action-pill-btn:hover {
      background: var(--tool-accent, #2563EB);
      color: #FFFFFF;
    }

    .icon-tiny-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--text-muted, #A1A1AA);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .icon-tiny-btn:hover {
      color: var(--text, #F4F4F5);
      background: rgba(255, 255, 255, 0.08);
    }

    :host-context([data-theme="light"]) .icon-tiny-btn:hover {
      color: #0F172A;
      background: rgba(0, 0, 0, 0.06);
    }

    .icon-tiny-btn.danger:hover {
      color: #EF4444;
      background: rgba(239, 68, 68, 0.12);
    }

    .icon-tiny-btn.confirm {
      color: #10B981;
    }

    .inline-edit-box {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .inline-name-input {
      flex: 1;
      height: 24px;
      background: var(--bg-input, #18181B);
      border: 1px solid var(--tool-accent, #2563EB);
      border-radius: 4px;
      padding: 0 6px;
      color: var(--text, #F4F4F5);
      font-size: 12px;
      outline: none;
    }

    :host-context([data-theme="light"]) .inline-name-input {
      background: #FFFFFF;
      color: #0F172A;
    }

    .animate-scale-in {
      animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    @media (max-width: 640px) {
      :host {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        margin-top: 0;
        z-index: 100;
      }

      .popover-backdrop {
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
      }

      .popover-panel {
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        max-height: 80vh;
        animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    }
  `]
})
export class SavedPalettesPopoverComponent {
  public state = inject(ColorStudioStateService);
  public close = output<void>();

  public editingPaletteId = signal<string | null>(null);
  public editingPaletteName = '';

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.close.emit();
  }

  public startEdit(pal: SavedPalette, event?: Event): void {
    event?.stopPropagation();
    this.editingPaletteId.set(pal.id);
    this.editingPaletteName = pal.name;
  }

  public commitEdit(id: string): void {
    if (this.editingPaletteName.trim()) {
      this.state.updateSavedPaletteName(id, this.editingPaletteName.trim());
    }
    this.editingPaletteId.set(null);
  }

  public cancelEdit(): void {
    this.editingPaletteId.set(null);
    this.editingPaletteName = '';
  }

  public loadIntoShared(pal: SavedPalette): void {
    this.state.setSharedPalette(pal.colors);
    this.state.showToast(`Loaded "${pal.name}" into Shared Palette`);
  }
}

