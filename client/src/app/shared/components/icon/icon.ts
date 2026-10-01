// client/src/app/shared/components/icon/icon.ts
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideDynamicIcon,
  LucideKey,
  LucideKeyRound,
  LucideBraces,
  LucideBrackets,
  LucideLink,
  LucideLayout,
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
  LucideHeading,
  LucideBaseline,
  LucideLetterText,
  LucideALargeSmall,
  LucideRocket,
  LucideFilterX,
  LucideCaseSensitive,
  LucideCaseLower,
  LucideCaseUpper,
  LucideVariable,
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
  LucideChevronUp,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCornerUpLeft,
  LucideMenu,
  LucideX,
  LucidePin,
  LucidePinOff,
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
  LucideFolderTree,
  LucideFolderHeart,
  LucideFolderArchive,
  LucideFolderUp,
  LucideFolderDown,
  LucideFileArchive,
  LucideArchive,
  LucideLayers,
  LucideGitBranch,
  LucideBox,
  LucideLineChart,
  LucideStore,
  LucideBell,
  LucideSettings,
  LucideUploadCloud,
  LucideCloudSync,
  LucideShieldAlert,
  LucideChevronsUpDown,
  LucidePlus,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideLayoutDashboard,
  LucideList,
  LucideCopy,
  LucideDownload,
  LucideTrash2,
  LucideRepeat,
  LucideGitFork,
  LucideBarChart2,
  LucideTerminal,
  LucidePencil,
  LucideMinimize2,
  LucideMaximize2,
  LucideCommand,
  LucideArrowUpDown,
  LucideShare2,
  LucideFileInput,
  LucideFilter,
  LucidePlay,
  LucideCheckCheck,
  LucideRotateCcw,
  LucideRotateCw,
  LucideUndo,
  LucideRedo,
  LucideNetwork,
  LucideDiff,
  LucideArrowRightFromLine,
  LucideArrowLeftFromLine,
  LucidePieChart,
  LucideTarget,
  LucideZoomIn,
  LucideZoomOut,
  LucideMinus,
  LucideLocate,
  LucideMove,
  LucideQuote,
  LucideSlidersHorizontal,
  LucideSettings2,
  LucideFoldVertical,
  LucideUnfoldVertical,
  LucideFileJson,
  LucideFileCode2,
  LucideFileDiff,
  LucideColumns2,
  LucideSmartphone,
  LucideLaptop,
  LucideMonitor,
  LucideTablet,
  LucideActivity,
  LucideHelpCircle,
  LucideInbox,
  LucideHistory,
  LucideRadio,
  LucidePanelLeft,
  LucideHardDrive,
  LucideUser,
  LucideUserCheck,
  LucideUserPlus,
  LucideArrowUp,
  LucideClipboard,
  LucideQrCode,
  LucideScan,
  LucideCamera,
  LucideScanQrCode,
  LucideLogOut,
  LucideUnplug,
  LucideEdit2,
  LucideEdit,
  LucideVolume2,
  LucideVolumeX,
  LucideVolume1,
  LucideVolume,
  LucidePause,
  LucideMusic,
  LucideWrapText,
  LucideImage,
  LucideFilm,
  LucideHighlighter,
  LucideTriangleAlert,
  LucideCircleAlert,
  LucideRefreshCw,
  LucidePhone,
  LucideNavigation,
  LucideIndianRupee,
  LucidePackage,
  LucideMoreHorizontal,
  LucideMoreVertical,
  LucideLoader2,
  LucideGitMerge,
  LucideLogIn,
  LucideTag,
  LucideTags,
  LucideFlame,
  LucideHourglass,
  LucideEraser,
  LucideSendHorizonal,
  LucideBold,
  LucideItalic,
  LucideUnderline,
  LucideWifi,
  LucideLoaderCircle,
  LucideBlend,
  LucideImageOff,
  LucideVideoOff,
  LucideSquare,
  LucideCheckSquare,
  LucideSquareCheck,
  LucideRefreshCwOff,
  LucideMonitorSmartphone,
  LucideShredder,
  LucideClockFading,
  LucideNotebookPen,
  LucideCable,
  LucideGlobe,
  LucideBinoculars,
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
            <rect
              [attr.x]="path.x"
              [attr.y]="path.y"
              [attr.width]="path.width"
              [attr.height]="path.height"
            ></rect>
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
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      :host.icon-xxs {
        width: 11px !important;
        height: 11px !important;
      }
      :host.icon-xs {
        width: 13px !important;
        height: 13px !important;
      }
      :host.icon-sm {
        width: 15px !important;
        height: 15px !important;
      }
      :host.icon-md {
        width: 18px !important;
        height: 18px !important;
      }
      :host.icon-lg {
        width: 22px !important;
        height: 22px !important;
      }
      :host.icon-xl {
        width: 26px !important;
        height: 26px !important;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        flex-shrink: 0;
      }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly class = input<string>('size-5');
  readonly strokeWidth = input<number>(1.75);

  private readonly iconMap: Record<string, any> = {
    key: LucideKey,
    'key-round': LucideKeyRound,
    braces: LucideBraces,
    brackets: LucideBrackets,
    link: LucideLink,
    layout: LucideLayout,
    database: LucideDatabase,
    file: LucideFile,
    'file-search': LucideFileSearch,
    wand: LucideWand,
    'wand-2': LucideWand2,
    heart: LucideHeart,
    'heart-pulse': LucideHeartPulse,
    binary: LucideBinary,
    search: LucideSearch,
    'search-code': LucideSearchCode,
    fingerprint: LucideFingerprint,
    lock: LucideLock,
    'lock-keyhole': LucideLockKeyhole,
    type: LucideType,
    'filter-x': LucideFilterX,
    'case-sensitive': LucideCaseSensitive,
    'case-lower': LucideCaseLower,
    'case-upper': LucideCaseUpper,
    variable: LucideVariable,
    'git-compare': LucideGitCompare,
    shield: LucideShield,
    'shield-check': LucideShieldCheck,
    code: LucideCode,
    'code-2': LucideCode2,
    table: LucideTable,
    'table-2': LucideTable2,
    ruler: LucideRuler,
    'file-code': LucideFileCode,
    clock: LucideClock,
    'clock-4': LucideClock4,
    palette: LucidePalette,
    'scan-text': LucideScanText,
    brain: LucideBrain,
    briefcase: LucideBriefcase,
    zap: LucideZap,
    users: LucideUsers,
    star: LucideStar,
    'arrow-right': LucideArrowRight,
    'arrow-right-left': LucideArrowRightLeft,
    'arrow-up-right': LucideArrowUpRight,
    'chevron-down': LucideChevronDown,
    'chevron-up': LucideChevronUp,
    'chevron-left': LucideChevronLeft,
    'chevron-right': LucideChevronRight,
    'corner-up-left': LucideCornerUpLeft,
    menu: LucideMenu,
    x: LucideX,
    mail: LucideMail,
    'map-pin': LucideMapPin,
    sparkles: LucideSparkles,
    'align-left': LucideAlignLeft,
    'arrow-left': LucideArrowLeft,
    sun: LucideSun,
    moon: LucideMoon,
    wrench: LucideWrench,
    check: LucideCheck,
    'check-circle': LucideCheckCheck,
    'circle-check': LucideCheckCheck,
    'layout-grid': LucideLayoutGrid,
    info: LucideInfo,
    compass: LucideCompass,
    map: LucideMap,
    'message-circle': LucideMessageCircle,
    send: LucideSend,
    'external-link': LucideExternalLink,
    'message-square': LucideMessageSquare,
    'file-text': LucideFileText,
    'search-x': LucideSearchX,
    eye: LucideEye,
    'eye-off': LucideEyeOff,
    'folder-git-2': LucideFolderGit2,
    folder: LucideFolder,
    'folder-tree': LucideFolderTree,
    'folder-heart': LucideFolderHeart,
    'folder-archive': LucideFolderArchive,
    'folder-up': LucideFolderUp,
    'folder-down': LucideFolderDown,
    'file-archive': LucideFileArchive,
    archive: LucideArchive,
    layers: LucideLayers,
    'git-branch': LucideGitBranch,
    box: LucideBox,
    'line-chart': LucideLineChart,
    store: LucideStore,
    bell: LucideBell,
    settings: LucideSettings,
    upload: LucideUploadCloud,
    'upload-cloud': LucideUploadCloud,
    'cloud-sync': LucideCloudSync,
    sync: LucideCloudSync,
    'wrap-text': LucideWrapText,
    'shield-alert': LucideShieldAlert,
    'chevrons-up-down': LucideChevronsUpDown,
    plus: LucidePlus,
    'panel-left-close': LucidePanelLeftClose,
    'panel-left-open': LucidePanelLeftOpen,
    'layout-dashboard': LucideLayoutDashboard,
    list: LucideList,
    copy: LucideCopy,
    download: LucideDownload,
    'trash-2': LucideTrash2,
    trash: LucideTrash2,
    close: LucideX,
    pin: LucidePin,
    'pin-off': LucidePinOff,
    repeat: LucideRepeat,
    'git-fork': LucideGitFork,
    'bar-chart-2': LucideBarChart2,
    pencil: LucidePencil,
    highlighter: LucideHighlighter,
    highlight: LucideHighlighter,
    terminal: LucideTerminal,
    'minimize-2': LucideMinimize2,
    'maximize-2': LucideMaximize2,
    maximize: LucideMaximize2,
    minimize: LucideMinimize2,
    fullscreen: LucideMaximize2,
    command: LucideCommand,
    'arrow-up-down': LucideArrowUpDown,
    'share-2': LucideShare2,
    'file-input': LucideFileInput,
    filter: LucideFilter,
    play: LucidePlay,
    'check-check': LucideCheckCheck,
    'rotate-ccw': LucideRotateCcw,
    'rotate-cw': LucideRotateCw,
    refresh: LucideRefreshCw,
    'refresh-cw': LucideRefreshCw,
    undo: LucideUndo,
    redo: LucideRedo,
    network: LucideNetwork,
    'git-diff': LucideDiff,
    'arrow-right-from-line': LucideArrowRightFromLine,
    'arrow-left-from-line': LucideArrowLeftFromLine,
    'pie-chart': LucidePieChart,
    target: LucideTarget,
    locate: LucideLocate,
    'zoom-in': LucideZoomIn,
    'zoom-out': LucideZoomOut,
    minus: LucideMinus,
    move: LucideMove,
    quote: LucideQuote,
    sliders: LucideSlidersHorizontal,
    'sliders-horizontal': LucideSlidersHorizontal,
    'settings-2': LucideSettings2,
    'fold-vertical': LucideFoldVertical,
    'unfold-vertical': LucideUnfoldVertical,
    'file-json': LucideFileJson,
    'file-code-2': LucideFileCode2,
    'file-diff': LucideFileDiff,
    columns: LucideColumns2,
    'columns-2': LucideColumns2,
    smartphone: LucideSmartphone,
    laptop: LucideLaptop,
    monitor: LucideMonitor,
    tablet: LucideTablet,
    activity: LucideActivity,
    'help-circle': LucideHelpCircle,
    help: LucideHelpCircle,
    inbox: LucideInbox,
    history: LucideHistory,
    radio: LucideRadio,
    'panel-left': LucidePanelLeft,
    'hard-drive': LucideHardDrive,
    user: LucideUser,
    'user-check': LucideUserCheck,
    'user-plus': LucideUserPlus,
    'arrow-up': LucideArrowUp,
    clipboard: LucideClipboard,
    'qr-code': LucideQrCode,
    qrcode: LucideQrCode,
    scan: LucideScan,
    camera: LucideCamera,
    'scan-qr-code': LucideScanQrCode,
    'log-in': LucideLogIn,
    login: LucideLogIn,
    'log-out': LucideLogOut,
    logout: LucideLogOut,
    'git-merge': LucideGitMerge,
    merge: LucideGitMerge,
    unplug: LucideUnplug,
    disconnect: LucideUnplug,
    'edit-2': LucideEdit2,
    edit: LucideEdit,
    'volume-2': LucideVolume2,
    'volume-x': LucideVolumeX,
    'volume-1': LucideVolume1,
    volume: LucideVolume,
    pause: LucidePause,
    music: LucideMusic,
    image: LucideImage,
    photo: LucideImage,
    picture: LucideImage,
    film: LucideFilm,
    video: LucideFilm,
    'video-off': LucideVideoOff,
    'alert-triangle': LucideTriangleAlert,
    'triangle-alert': LucideTriangleAlert,
    'alert-circle': LucideCircleAlert,
    'circle-alert': LucideCircleAlert,
    phone: LucidePhone,
    navigation: LucideNavigation,
    'indian-rupee': LucideIndianRupee,
    rupee: LucideIndianRupee,
    package: LucidePackage,
    'more-horizontal': LucideMoreHorizontal,
    'more-vertical': LucideMoreVertical,
    more: LucideMoreHorizontal,
    'loader-2': LucideLoader2,
    loader: LucideLoader2,
    'loader-circle': LucideLoaderCircle,
    loadercircle: LucideLoaderCircle,
    wifi: LucideWifi,
    'refresh-ccw': LucideRotateCcw,
    tag: LucideTag,
    tags: LucideTags,
    flame: LucideFlame,
    fire: LucideFlame,
    hourglass: LucideHourglass,
    eraser: LucideEraser,
    'send-horizontal': LucideSendHorizonal,
    bold: LucideBold,
    italic: LucideItalic,
    underline: LucideUnderline,
    heading: LucideHeading,
    baseline: LucideBaseline,
    'letter-text': LucideLetterText,
    'text-style': LucideType,
    'text-size': LucideALargeSmall,
    'a-large-small': LucideALargeSmall,
    rocket: LucideRocket,
    blend: LucideBlend,
    'image-off': LucideImageOff,
    square: LucideSquare,
    'check-square': LucideCheckSquare,
    'square-check': LucideSquareCheck,
    'refresh-cw-off': LucideRefreshCwOff,
    'monitor-smartphone': LucideMonitorSmartphone,
    'shredder': LucideShredder,
    'clock-fading': LucideClockFading,
    'notebook-pen' : LucideNotebookPen,
    'cable' : LucideCable,
    'globe' : LucideGlobe,
    'binoculars' : LucideBinoculars
  };

  readonly lucideIconComponent = computed(() => {
    return this.iconMap[this.name().toLowerCase()] || null;
  });

  readonly isBrandIcon = computed(() => {
    const name = this.name().toLowerCase();
    return ['github', 'twitter', 'linkedin', 'gitlab', 'bitbucket'].includes(name);
  });

  readonly brandIconPaths = computed(() => {
    const name = this.name().toLowerCase();
    if (name === 'github') {
      return [
        {
          d: 'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
        },
        { d: 'M9 18c-4.51 2-5-2-7-2' },
      ];
    }
    if (name === 'gitlab') {
      return [
        {
          d: 'm22 13.29-1.92-5.91a.54.54 0 0 0-.16-.26.55.55 0 0 0-.31-.1.57.57 0 0 0-.32.09.53.53 0 0 0-.17.26L17.2 13.3H6.8L4.88 7.37a.54.54 0 0 0-.16-.26.52.52 0 0 0-.32-.1.54.54 0 0 0-.31.1.55.55 0 0 0-.17.26L2 13.29a.75.75 0 0 0 .07.65l8.33 6.1a1.36 1.36 0 0 0 1.6 0l8.33-6.1a.75.75 0 0 0 .07-.65z',
        },
      ];
    }
    if (name === 'bitbucket') {
      return [
        {
          d: 'M21 2H3a1 1 0 0 0-1 1.07l1.91 17A1 1 0 0 0 4.9 21h14.2a1 1 0 0 0 1-.93l1.91-17A1 1 0 0 0 21 2zm-6.38 13.88H9.38L8.14 7.63h7.72z',
        },
      ];
    }
    if (name === 'twitter') {
      return [
        {
          d: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
        },
      ];
    }
    if (name === 'linkedin') {
      return [
        { type: 'rect', x: '2', y: '9', width: '4', height: '12' },
        { type: 'circle', cx: '4', cy: '4', r: '2' },
        {
          d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.2A5.11 5.11 0 0 1 16 8z',
        },
      ];
    }
    return [];
  });
}
