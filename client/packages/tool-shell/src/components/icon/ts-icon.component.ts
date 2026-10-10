// packages/tool-shell/src/components/icon/ts-icon.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideDynamicIcon,
  LucideCopy,
  LucideClipboard,
  LucideSearch,
  LucideSun,
  LucideMoon,
  LucideMenu,
  LucideX,
  LucideChevronRight,
  LucideChevronLeft,
  LucideChevronDown,
  LucideChevronUp,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucidePanelRightClose,
  LucidePanelRightOpen,
  LucideArrowLeft,
  LucideArrowRight,
  LucideArrowUpRight,
  LucideExternalLink,
  LucideInfo,
  LucideCircleHelp,
  LucideCommand,
  LucideSend,
  LucideDownload,
  LucideUpload,
  LucideFile,
  LucideFileText,
  LucideFileCode,
  LucideImage,
  LucideImagePlus,
  LucideFolder,
  LucideFolderOpen,
  LucideHistory,
  LucideSettings,
  LucideSettings2,
  LucideTrash2,
  LucideCheck,
  LucideCheckCircle,
  LucideLock,
  LucideKey,
  LucideShield,
  LucideShieldCheck,
  LucideZap,
  LucideQrCode,
  LucidePlus,
  LucideEye,
  LucideEyeOff,
  LucideLink,
  LucideFlag,
  LucideArchive,
  LucideCircleAlert,
  LucideLayers,
  LucideCpu,
  LucideTerminal,
  LucideCode,
  LucideDatabase,
  LucideBoxes,
  LucideSparkles,
  LucideHardDrive,
  LucideSliders,
  LucideCompass,
  LucideBookmark,
  LucideStar,
  LucideHome
} from '@lucide/angular';

@Component({
  selector: 'ts-icon',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    <span 
      class="ts-icon-wrapper" 
      [style.width.px]="size()" 
      [style.height.px]="size()"
      [attr.aria-hidden]="true"
    >
      @if (lucideIconComponent()) {
        <svg
          [lucideIcon]="lucideIconComponent()"
          [style.width.px]="size()"
          [style.height.px]="size()"
          [attr.stroke-width]="1.75"
          class="ts-icon-svg"
        ></svg>
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      line-height: 0;
    }
    .ts-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ts-icon-svg {
      display: block;
      color: currentColor;
    }
  `]
})
export class TsIconComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(16);

  private readonly iconMap: Record<string, any> = {
    // Navigation & General
    copy: LucideCopy,
    clipboard: LucideClipboard,
    search: LucideSearch,
    sun: LucideSun,
    moon: LucideMoon,
    menu: LucideMenu,
    x: LucideX,
    close: LucideX,
    'chevron-right': LucideChevronRight,
    'chevron-left': LucideChevronLeft,
    'chevron-down': LucideChevronDown,
    'chevron-up': LucideChevronUp,
    'panel-left-close': LucidePanelLeftClose,
    'panel-left-open': LucidePanelLeftOpen,
    'panel-right-close': LucidePanelRightClose,
    'panel-right-open': LucidePanelRightOpen,
    'arrow-left': LucideArrowLeft,
    'arrow-right': LucideArrowRight,
    'arrow-up-right': LucideArrowUpRight,
    'external-link': LucideExternalLink,
    info: LucideInfo,
    home: LucideHome,
    'help-circle': LucideCircleHelp,
    command: LucideCommand,
    plus: LucidePlus,
    plus_circle: LucidePlus,
    'check-circle': LucideCheckCircle,
    eye: LucideEye,
    'eye-off': LucideEyeOff,
    link: LucideLink,
    flag: LucideFlag,
    archive: LucideArchive,
    'circle-alert': LucideCircleAlert,
    
    // Tools & Operations
    send: LucideSend,
    download: LucideDownload,
    upload: LucideUpload,
    'upload-cloud': LucideUpload,
    file: LucideFile,
    'file-text': LucideFileText,
    'file-code': LucideFileCode,
    image: LucideImage,
    'image-plus': LucideImagePlus,
    folder: LucideFolder,
    'folder-open': LucideFolderOpen,
    clock: LucideHistory,
    history: LucideHistory,
    settings: LucideSettings,
    'settings-2': LucideSettings2,
    trash: LucideTrash2,
    'trash-2': LucideTrash2,
    check: LucideCheck,
    lock: LucideLock,
    key: LucideKey,
    shield: LucideShield,
    'shield-check': LucideShieldCheck,
    zap: LucideZap,
    'qr-code': LucideQrCode,
    
    // Developer & Tool Categories
    layers: LucideLayers,
    cpu: LucideCpu,
    terminal: LucideTerminal,
    code: LucideCode,
    database: LucideDatabase,
    boxes: LucideBoxes,
    sparkles: LucideSparkles,
    'hard-drive': LucideHardDrive,
    sliders: LucideSliders,
    compass: LucideCompass,
    bookmark: LucideBookmark,
    star: LucideStar
  };

  readonly lucideIconComponent = computed(() => {
    const raw = this.name().toLowerCase().trim();
    return this.iconMap[raw] || LucideFile;
  });
}
