// apps/tool-urlshortener/src/components/action-dropdown/action-dropdown.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ElementRef,
  HostListener,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  viewChild
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TsIconComponent, HlmButtonImports } from '@acklet/tool-shell';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-action-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TsIconComponent, HlmButtonImports],
  templateUrl: './action-dropdown.component.html',
  styleUrls: ['./action-dropdown.component.css']
})
export class ActionDropdownComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);

  @Input() items: ActionMenuItem[] = [];
  @Input() triggerLabel?: string;
  @Input() triggerIcon: string = 'more-vertical';
  @Input() triggerVariant: 'default' | 'outline' | 'secondary' | 'ghost' = 'outline';
  @Input() triggerClass: string = '';
  @Input() triggerAriaLabel: string = 'More actions';
  @Input() badge?: number | string | null = null;
  @Input() align: 'left' | 'right' = 'right';
  @Input() sheetTitle?: string;
  @Input() customContent = false;

  @Output() readonly itemSelect = new EventEmitter<string>();
  @Output() readonly opened = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly isOpen = signal<boolean>(false);
  readonly flipUp = signal<boolean>(false);
  readonly activeIndex = signal<number>(-1);

  private previousFocusEl: HTMLElement | null = null;

  constructor() {}

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isOpen()) return;
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.isOpen()) {
      this.checkFlipDirection();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.isOpen()) {
      this.checkFlipDirection();
    }
  }

  toggleOpen(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.previousFocusEl = document.activeElement as HTMLElement;

    this.checkFlipDirection();

    this.isOpen.set(true);
    this.activeIndex.set(0);
    this.opened.emit();

    setTimeout(() => {
      this.focusActiveItem();
    }, 50);
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.closed.emit();

    if (this.previousFocusEl && isPlatformBrowser(this.platformId)) {
      try {
        this.previousFocusEl.focus();
      } catch {
        // no-op if unmounted
      }
    }
  }

  private checkFlipDirection(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const triggerBtn = this.el.nativeElement.querySelector('.action-trigger-btn');
    if (!triggerBtn) return;

    const rect = triggerBtn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estHeight = Math.min((this.items.length || 3) * 44 + 24, 260);
    const shouldFlip = spaceBelow < estHeight && rect.top > estHeight;

    this.flipUp.set(shouldFlip);
  }

  onItemClick(item: ActionMenuItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (item.disabled) return;
    this.itemSelect.emit(item.id);
    this.close();
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }

    if (this.customContent) return;

    const count = this.items.length;
    if (count === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update(idx => (idx + 1) % count);
      this.focusActiveItem();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update(idx => (idx - 1 + count) % count);
      this.focusActiveItem();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.activeIndex.set(0);
      this.focusActiveItem();
    } else if (event.key === 'End') {
      event.preventDefault();
      this.activeIndex.set(count - 1);
      this.focusActiveItem();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const currentIdx = this.activeIndex();
      if (currentIdx >= 0 && currentIdx < count) {
        this.onItemClick(this.items[currentIdx], event);
      }
    }
  }

  private focusActiveItem(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const items = this.el.nativeElement.querySelectorAll('.action-menu-item');
    const idx = this.activeIndex();
    if (items && items[idx]) {
      items[idx].focus();
    }
  }
}
