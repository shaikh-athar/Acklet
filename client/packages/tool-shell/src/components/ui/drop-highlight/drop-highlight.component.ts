// packages/tool-shell/src/components/ui/drop-highlight/drop-highlight.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  ElementRef,
  inject,
  HostListener,
  HostBinding
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyDropStateComponent } from '../empty-drop-state/empty-drop-state.component';
import { TsIconComponent } from '../../icon/ts-icon.component';

@Component({
  selector: 'shared-drop-highlight',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, EmptyDropStateComponent, TsIconComponent],
  template: `
    @if (hasNoItems()) {
      <!-- Empty Drop State (Rule 4: Items count is 0) -->
      <shared-empty-drop-state
        [leftIcon]="emptyLeftIcon()"
        [centerIcon]="emptyCenterIcon()"
        [rightIcon]="emptyRightIcon()"
        [heading]="emptyHeading()"
        [subtext]="emptySubtext()"
        [actionLabel]="emptyActionLabel()"
        (action)="emptyAction.emit()"
        (filesDropped)="onFilesDroppedInternal($event)"
      />
    } @else {
      <!-- Normal Content Screen (Rule 4: Items count is 1 or more) -->
      <ng-content></ng-content>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 auto;
      border-radius: inherit;
      border: 1px solid transparent;
      box-sizing: border-box;
      pointer-events: auto;
      transition: border-color var(--ts-dur-fast, 150ms) var(--ts-ease),
                  background-color var(--ts-dur-fast, 150ms) var(--ts-ease);
    }

    /* Active Drag State: 1px solid accent border + soft accent background */
    :host(.is-drag-active) {
      border: 1px solid var(--tool-accent, var(--accent, #2563EB)) !important;
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(37, 99, 235, 0.08))) !important;
    }

    :host-context([data-theme="dark"]).is-drag-active {
      border: 1px solid var(--tool-accent, var(--accent, #60A5FA)) !important;
      background-color: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.14))) !important;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none !important;
      }
    }
  `]
})
export class DropHighlightComponent {
  private readonly hostEl = inject(ElementRef<HTMLElement>);

  // Item Count Signal / Input: centralizes Rule 4 state check (supports number, array, null, undefined)
  readonly itemCount = input<number | any[] | null | undefined>(0);
  readonly disabled = input<boolean>(false);

  // Empty drop state inputs (delegated when itemCount === 0)
  readonly emptyIcon = input<string>('image');
  readonly emptyLeftIcon = input<string>('code');
  readonly emptyCenterIcon = input<string>('image');
  readonly emptyRightIcon = input<string>('file-text');

  readonly emptyHeading = input<string>('Add anything');
  readonly emptySubtext = input<string>('Drop files, folders or text to get started.');
  readonly emptyActionLabel = input<string | null | undefined>(null);

  readonly filesDropped = output<File[]>();
  readonly emptyAction = output<void>();
  readonly dragOverChange = output<boolean>();

  readonly isDragActive = signal<boolean>(false);

  @HostBinding('class.is-drag-active')
  get dragActiveClass(): boolean {
    return this.isDragActive();
  }

  readonly hasNoItems = computed<boolean>(() => {
    const val = this.itemCount();
    if (val === null || val === undefined) return true;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'number') return val <= 0;
    return false;
  });

  onFilesDroppedInternal(files: File[]): void {
    this.filesDropped.emit(files);
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(e: DragEvent): void {
    if (this.disabled() || !this.hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!this.isDragActive()) {
      this.isDragActive.set(true);
      this.dragOverChange.emit(true);
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent): void {
    if (this.disabled() || !this.hasFiles(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (!this.isDragActive()) {
      this.isDragActive.set(true);
      this.dragOverChange.emit(true);
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(e: DragEvent): void {
    if (this.disabled()) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = this.hostEl.nativeElement.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      this.isDragActive.set(false);
      this.dragOverChange.emit(false);
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent): void {
    if (this.disabled()) return;
    e.preventDefault();
    e.stopPropagation();
    this.isDragActive.set(false);
    this.dragOverChange.emit(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      this.filesDropped.emit(files);
    }
  }

  @HostListener('window:dragend')
  @HostListener('window:blur')
  onWindowDragReset(): void {
    if (this.isDragActive()) {
      this.isDragActive.set(false);
      this.dragOverChange.emit(false);
    }
  }

  @HostListener('window:drop')
  onWindowDropReset(): void {
    if (this.isDragActive()) {
      this.isDragActive.set(false);
      this.dragOverChange.emit(false);
    }
  }

  private hasFiles(e: DragEvent): boolean {
    if (!e.dataTransfer?.types) return false;
    return Array.from(e.dataTransfer.types).includes('Files');
  }
}


