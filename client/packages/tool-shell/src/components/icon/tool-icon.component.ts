// packages/tool-shell/src/components/icon/tool-icon.component.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideDynamicIcon,
  LucideKey,
  LucideKeyRound,
  LucideBraces,
  LucideDatabase,
  LucideFile,
  LucideFileSearch,
  LucideWand,
  LucideWand2,
  LucideHeart,
  LucideHeartPulse,
  LucideBinary,
  LucideSearch,
  LucideSearchCode,
  LucideFingerprint,
  LucideLock,
  LucideLockKeyhole,
  LucideType,
  LucideGitCompare,
  LucideShield,
  LucideShieldCheck,
  LucideCode,
  LucideCode2,
  LucideTable,
  LucideTable2,
  LucideRuler,
  LucideFileCode,
  LucideClock,
  LucideClock4,
  LucidePalette,
  LucideScanText,
  LucideBrain,
  LucideBriefcase,
  LucideZap,
  LucideUsers,
  LucideStar,
  LucideArrowRight,
  LucideArrowRightLeft,
  LucideArrowUpRight,
  LucideChevronDown,
  LucideChevronRight,
  LucideMenu,
  LucideX,
  LucideMail,
  LucideMapPin,
  LucideSparkles,
  LucideAlignLeft,
  LucideArrowLeft,
  LucideSun,
  LucideMoon,
  LucideWrench,
  LucideCheck,
  LucideLayoutGrid,
  LucideInfo,
  LucideCompass,
  LucideMap,
  LucideMessageCircle,
  LucideSend,
  LucideExternalLink,
  LucideMessageSquare,
  LucideFileText,
  LucideSearchX,
  LucideEye,
  LucideEyeOff,
  LucideFolderGit2,
  LucideFolder,
  LucideFolderHeart,
  LucideLayers,
  LucideGitBranch,
  LucideBox,
  LucideLineChart,
  LucideStore,
  LucideBell,
  LucideSettings,
  LucideUploadCloud,
  LucideShieldAlert,
  LucideChevronsUpDown,
  LucidePlus,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideLayoutDashboard,
  LucideList,
  LucideCopy,
  LucideUpload,
  LucideDownload,
  LucideArchive,
  LucideFlag,
  LucideHistory,
  LucideSettings2,
  LucideQrCode,
  LucideCircleAlert,
  LucideImage,
  LucideImagePlus,
  LucideMaximize2,
  LucideTrash2,
  LucideCheckCircle,
  LucideLink,
  LucideFolderOpen
} from '@lucide/angular';

@Component({
  selector: 'lib-tool-icon',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    @if (lucideIconComponent()) {
      <svg
        [lucideIcon]="lucideIconComponent()"
        [class]="class()"
        [attr.stroke-width]="strokeWidth()"
      ></svg>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class ToolIconComponent {
  readonly name = input.required<string>();
  readonly class = input<string>('size-5');
  readonly strokeWidth = input<number>(2);

  private readonly iconMap: Record<string, any> = {
    copy: LucideCopy,
    upload: LucideUpload,
    download: LucideDownload,
    archive: LucideArchive,
    flag: LucideFlag,
    history: LucideHistory,
    'settings-2': LucideSettings2,
    settings: LucideSettings,
    'qr-code': LucideQrCode,
    'circle-alert': LucideCircleAlert,
    image: LucideImage,
    'image-plus': LucideImagePlus,
    'maximize-2': LucideMaximize2,
    'trash-2': LucideTrash2,
    'check-circle': LucideCheckCircle,
    link: LucideLink,
    'folder-open': LucideFolderOpen,
    'upload-cloud': LucideUploadCloud,
    key: LucideKey,
    file: LucideFile,
    'file-code': LucideFileCode,
    'file-text': LucideFileText,
    lock: LucideLock,
    check: LucideCheck,
    plus: LucidePlus,
    x: LucideX,
    eye: LucideEye,
    'eye-off': LucideEyeOff,
    folder: LucideFolder,
    clock: LucideClock,
    'shield-check': LucideShieldCheck,
    'chevron-down': LucideChevronDown,
    'chevron-right': LucideChevronRight
  };

  readonly lucideIconComponent = computed(() => {
    return this.iconMap[this.name().toLowerCase()] || LucideFile;
  });
}
