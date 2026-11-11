// packages/tool-shell/src/components/ui/empty-drop-state/empty-drop-state.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  inject,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent } from '../../icon/ts-icon.component';

@Component({
  selector: 'shared-empty-drop-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsIconComponent],
  template: `
    <div 
      class="empty-drop-state-container"
      [class.is-drag-over]="isDragOver()"
      role="region"
      aria-label="Drop zone"
      tabindex="0"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      (click)="onContainerClick($event)"
      (keydown.enter)="onContainerClick($event)"
      (keydown.space)="onContainerClick($event); $event.preventDefault()"
    >
      <!-- Single line icon in soft accent tile (Image 1 reference - clean empty state) -->
      <div class="empty-icon-tile" aria-hidden="true">
        <ts-icon [name]="icon()" [size]="28" class="empty-tile-icon" />
      </div>

      <h3 class="empty-drop-heading">{{ heading() }}</h3>
      <p class="empty-drop-subtext">{{ subtext() }}</p>

      @if (actionLabel()) {
        <button 
          type="button" 
          class="empty-drop-action-btn"
          (click)="onActionClick($event)"
          (keydown.enter)="onActionClick($event)"
          (keydown.space)="onActionClick($event)"
          [attr.aria-label]="actionLabel()"
        >
          <ts-icon name="plus" [size]="15" />
          <span>{{ actionLabel() }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 260px;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .empty-drop-state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 38px 28px;
      max-width: 460px;
      width: 100%;
      margin: 0 auto;
      border-radius: var(--ts-radius-card, 16px);
      border: 1.5px dotted var(--border, rgba(0, 0, 0, 0.18));
      background-color: transparent;
      cursor: pointer;
      outline: none;
      transition: border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
      box-sizing: border-box;
    }

    :host-context([data-theme="dark"]) .empty-drop-state-container {
      border-color: rgba(255, 255, 255, 0.20);
    }

    .empty-drop-state-container:focus-visible {
      border-color: var(--tool-accent, var(--accent, #2563EB)) !important;
      outline: 2px solid var(--tool-accent, var(--accent, #2563EB));
      outline-offset: 2px;
    }

    .empty-drop-state-container:hover,
    .empty-drop-state-container.is-drag-over {
      border-color: var(--tool-accent, var(--accent, #2563EB)) !important;
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(37, 99, 235, 0.05))) !important;
    }

    :host-context([data-theme="dark"]) .empty-drop-state-container:hover,
    :host-context([data-theme="dark"]) .empty-drop-state-container.is-drag-over {
      border-color: var(--tool-accent, var(--accent, #60A5FA)) !important;
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.10))) !important;
    }

    .empty-icon-tile {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(37, 99, 235, 0.08)));
      color: var(--tool-accent, var(--accent, #2563EB));
      border: 1px solid var(--tool-accent-border, var(--accent-border, rgba(37, 99, 235, 0.20)));
      margin-bottom: 16px;
      flex-shrink: 0;
      transition: transform var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    :host-context([data-theme="dark"]) .empty-icon-tile {
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.14)));
      color: var(--tool-accent, var(--accent, #60A5FA));
      border-color: var(--tool-accent-border, var(--accent-border, rgba(59, 130, 246, 0.25)));
    }

    .empty-tile-icon {
      color: inherit;
    }

    .empty-drop-heading {
      margin: 0 0 6px 0;
      font-family: var(--font-heading, "Scoutie Sans", -apple-system, sans-serif);
      font-size: 18px;
      font-weight: 600;
      color: var(--text, #18181B);
      line-height: 1.3;
    }

    :host-context([data-theme="dark"]) .empty-drop-heading {
      color: var(--text, #FCFCFC);
    }

    .empty-drop-subtext {
      margin: 0;
      font-family: var(--font-body, "Scoutie Sans", -apple-system, sans-serif);
      font-size: 14px;
      font-weight: 400;
      color: var(--text-2, var(--text-muted, #71717A));
      line-height: 1.5;
      max-width: 380px;
    }

    :host-context([data-theme="dark"]) .empty-drop-subtext {
      color: var(--text-2, var(--text-muted, #A1A1AA));
    }

    .empty-drop-action-btn {
      margin-top: 18px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 16px;
      border-radius: 10px;
      font-family: var(--font-body, "Scoutie Sans", -apple-system, sans-serif);
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(37, 99, 235, 0.08)));
      color: var(--tool-accent, var(--accent, #2563EB));
      border: 1px solid var(--tool-accent-border, var(--accent-border, rgba(37, 99, 235, 0.20)));
      transition: background-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  transform var(--ts-dur-press, 150ms) var(--ts-ease);
    }

    :host-context([data-theme="dark"]) .empty-drop-action-btn {
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.14)));
      color: var(--tool-accent, var(--accent, #60A5FA));
      border-color: var(--tool-accent-border, var(--accent-border, rgba(59, 130, 246, 0.25)));
    }

    .empty-drop-action-btn:hover {
      background-color: var(--tool-accent, var(--accent, #2563EB));
      color: var(--tool-accent-ink, #FFFFFF);
      border-color: var(--tool-accent, var(--accent, #2563EB));
    }

    :host-context([data-theme="dark"]) .empty-drop-action-btn:hover {
      background-color: var(--tool-accent, var(--accent, #3B82F6));
      color: var(--tool-accent-ink, #FFFFFF);
      border-color: var(--tool-accent, var(--accent, #3B82F6));
    }

    .empty-drop-action-btn:active {
      transform: scale(0.98);
    }

    .empty-drop-action-btn:focus-visible {
      outline: 2px solid var(--tool-accent, var(--accent, #2563EB)) !important;
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      .empty-drop-state-container,
      .empty-icon-tile,
      .empty-drop-action-btn {
        transition: none !important;
      }
    }
  `]
})
export class EmptyDropStateComponent {
  readonly icon = input<string>('upload-cloud');
  readonly leftIcon = input<string>('code');
  readonly centerIcon = input<string>('image');
  readonly rightIcon = input<string>('file-text');

  readonly heading = input<string>('Drop anything');
  readonly subtext = input<string>('Drop files, folders or text to get started.');
  readonly actionLabel = input<string | null | undefined>(null);

  readonly action = output<void>();
  readonly filesDropped = output<File[]>();

  readonly isDragOver = signal<boolean>(false);

  onActionClick(event?: Event): void {
    event?.stopPropagation();
    this.action.emit();
  }

  onContainerClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, select')) return;
    this.action.emit();
  }

  onDragOver(e: DragEvent): void {
    if (!this.hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    this.isDragOver.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      this.filesDropped.emit(Array.from(e.dataTransfer.files));
    }
  }

  @HostListener('window:dragend')
  @HostListener('window:blur')
  onWindowDragReset(): void {
    this.isDragOver.set(false);
  }

  private hasFiles(e: DragEvent): boolean {
    if (!e.dataTransfer?.types) return false;
    return Array.from(e.dataTransfer.types).includes('Files');
  }
}
