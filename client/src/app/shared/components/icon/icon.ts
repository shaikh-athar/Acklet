// client/src/app/shared/components/icon/icon.ts
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
  LucideEyeOff
} from '@lucide/angular';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon],
  template: `
    @if (isBrandIcon()) {
      <svg
        [class]="class()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        [attr.stroke-width]="strokeWidth()"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        @for (path of brandIconPaths(); track path) {
          @if (path.type === 'circle') {
            <circle [attr.cx]="path.cx" [attr.cy]="path.cy" [attr.r]="path.r"></circle>
          } @else if (path.type === 'rect') {
            <rect [attr.x]="path.x" [attr.y]="path.y" [attr.width]="path.width" [attr.height]="path.height"></rect>
          } @else {
            <path [attr.d]="path.d"></path>
          }
        }
      </svg>
    } @else if (lucideIconComponent()) {
      <svg
        [lucideIcon]="lucideIconComponent()"
        [class]="class()"
        [attr.stroke-width]="strokeWidth()"
      ></svg>
    }
  `,
  styles: [`
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
  `]
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly class = input<string>('size-5');
  readonly strokeWidth = input<number>(2);

  private readonly iconMap: Record<string, any> = {
    'key': LucideKey,
    'key-round': LucideKeyRound,
    'braces': LucideBraces,
    'database': LucideDatabase,
    'file': LucideFile,
    'file-search': LucideFileSearch,
    'wand': LucideWand,
    'wand-2': LucideWand2,
    'heart': LucideHeart,
    'heart-pulse': LucideHeartPulse,
    'binary': LucideBinary,
    'search': LucideSearch,
    'search-code': LucideSearchCode,
    'fingerprint': LucideFingerprint,
    'lock': LucideLock,
    'lock-keyhole': LucideLockKeyhole,
    'type': LucideType,
    'git-compare': LucideGitCompare,
    'shield': LucideShield,
    'shield-check': LucideShieldCheck,
    'code': LucideCode,
    'code-2': LucideCode2,
    'table': LucideTable,
    'table-2': LucideTable2,
    'ruler': LucideRuler,
    'file-code': LucideFileCode,
    'clock': LucideClock,
    'clock-4': LucideClock4,
    'palette': LucidePalette,
    'scan-text': LucideScanText,
    'brain': LucideBrain,
    'briefcase': LucideBriefcase,
    'zap': LucideZap,
    'users': LucideUsers,
    'star': LucideStar,
    'arrow-right': LucideArrowRight,
    'arrow-right-left': LucideArrowRightLeft,
    'arrow-up-right': LucideArrowUpRight,
    'chevron-down': LucideChevronDown,
    'chevron-right': LucideChevronRight,
    'menu': LucideMenu,
    'x': LucideX,
    'mail': LucideMail,
    'map-pin': LucideMapPin,
    'sparkles': LucideSparkles,
    'align-left': LucideAlignLeft,
    'arrow-left': LucideArrowLeft,
    'sun': LucideSun,
    'moon': LucideMoon,
    'wrench': LucideWrench,
    'check': LucideCheck,
    'layout-grid': LucideLayoutGrid,
    'info': LucideInfo,
    'compass': LucideCompass,
    'map': LucideMap,
    'message-circle': LucideMessageCircle,
    'send': LucideSend,
    'external-link': LucideExternalLink,
    'message-square': LucideMessageSquare,
    'file-text': LucideFileText,
    'search-x': LucideSearchX,
    'eye': LucideEye,
    'eye-off': LucideEyeOff
  };

  readonly lucideIconComponent = computed(() => {
    return this.iconMap[this.name().toLowerCase()] || null;
  });

  readonly isBrandIcon = computed(() => {
    const name = this.name().toLowerCase();
    return ['github', 'twitter', 'linkedin'].includes(name);
  });

  readonly brandIconPaths = computed(() => {
    const name = this.name().toLowerCase();
    if (name === 'github') {
      return [
        { d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4' },
        { d: 'M9 18c-4.51 2-5-2-7-2' }
      ];
    }
    if (name === 'twitter') {
      return [
        { d: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z' }
      ];
    }
    if (name === 'linkedin') {
      return [
        { type: 'rect', x: '2', y: '9', width: '4', height: '12' },
        { type: 'circle', cx: '4', cy: '4', r: '2' },
        { d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.2A5.11 5.11 0 0 1 16 8z' }
      ];
    }
    return [];
  });
}
