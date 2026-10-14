// packages/tool-shell/src/components/icon/ts-icon-map.ts
import { Type } from '@angular/core';
import {
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
  LucideUploadCloud,
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
  LucideMinus,
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
  LucideHome,
  LucideBraces,
  LucideKeyRound,
  LucideFingerprint,
  LucideBinary,
  LucideGrid,
  LucideWrench,
  LucideClock,
  LucideMaximize2,
  LucideLogIn,
  LucideRefreshCw,
  LucideSave,
  LucideFilter,
  LucideLayoutGrid,
  LucideList,
  LucideSlidersHorizontal,
  LucideScanQrCode,
  LucideFolderUp,
  LucideCheckCheck,
  LucideTable,
  LucideVideo,
  LucideMusic,
  LucidePencil,
  LucidePresentation,
  LucideClipboardPaste,
  LucideSearchX
} from '@lucide/angular';

import {
  CopyIcon,
  ClipboardIcon,
  SearchIcon,
  SunIcon,
  CloudMoonIcon,
  XIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SendIcon,
  DownloadIcon,
  UploadIcon,
  HardDriveUploadIcon,
  FileCheckIcon,
  HistoryIcon,
  SettingsIcon,
  Trash2Icon,
  CheckIcon,
  CircleCheckIcon,
  ShieldCheckIcon,
  PlusIcon,
  MinusIcon,
  EyeOffIcon,
  ArchiveIcon,
  CircleAlertIcon,
  TerminalIcon,
  SparklesIcon,
  BookmarkIcon,
  StarIcon,
  KeyIcon,
  KeyRoundIcon,
  BinaryIcon
} from 'ng-animated-icons';

import copyLordiconJson from '../../assets/icons/lordicon/copy.json';

export interface IconDefinition {
  lordicon?: any;             // Local lordicon JSON asset or path
  animated?: Type<any>;       // ng-animated-icons component
  lucide: any;                // Lucide fallback component
  category?: string;
  notes?: string;
}

/**
 * Micro hover motion classes for Lucide static fallback icons:
 * send = translate 2px up-right, receive/download = translate 2px down,
 * history = rotate -20deg, settings = rotate 45deg, copy/file/clipboard = scale 1.06,
 * star = scale 1.12 + rotate 8deg, search = scale 1.06, arrow-open = translate 2px right,
 * theme toggle = rotate 15deg.
 */
export const LUCIDE_MOTION_MAP: Record<string, string> = {
  send: 'motion-translate-up-right',
  receive: 'motion-translate-down',
  download: 'motion-translate-down',
  history: 'motion-rotate-neg20',
  clock: 'motion-rotate-neg20',
  settings: 'motion-rotate-45',
  'settings-2': 'motion-rotate-45',
  copy: 'motion-scale-up',
  file: 'motion-scale-up',
  'file-text': 'motion-scale-up',
  'file-code': 'motion-scale-up',
  clipboard: 'motion-scale-up',
  star: 'motion-star-pop',
  search: 'motion-scale-up',
  'arrow-up-right': 'motion-translate-right',
  'arrow-right': 'motion-translate-right',
  sun: 'motion-rotate-15',
  moon: 'motion-rotate-15',
  zap: 'motion-scale-up'
};

/**
 * Single source of truth for semantic tool icon mappings.
 * Priority: Lordicon (>= 20px) > ng-animated-icons > Lucide (static with CSS motion)
 */
export const TS_ICON_MAP: Record<string, IconDefinition> = {
  // Navigation & General
  copy: {
    lordicon: copyLordiconJson,
    animated: CopyIcon,
    lucide: LucideCopy,
    notes: 'Used in clipboard snippets, code blocks, share code'
  },
  clipboard: {
    animated: ClipboardIcon,
    lucide: LucideClipboard,
    notes: 'Used in Online Clipboard tool identity'
  },
  search: {
    animated: SearchIcon,
    lucide: LucideSearch,
    notes: 'Used in header search and tools search'
  },
  sun: {
    animated: SunIcon,
    lucide: LucideSun,
    notes: 'Theme toggle light mode'
  },
  moon: {
    animated: CloudMoonIcon,
    lucide: LucideMoon,
    notes: 'Theme toggle dark mode'
  },
  menu: {
    lucide: LucideMenu,
    notes: 'Mobile menu toggle'
  },
  x: {
    animated: XIcon,
    lucide: LucideX,
    notes: 'Close drawer and modal button'
  },
  close: {
    animated: XIcon,
    lucide: LucideX,
    notes: 'Close alias'
  },
  'chevron-right': {
    animated: ChevronRightIcon,
    lucide: LucideChevronRight,
    notes: 'Navigation breadcrumbs, accordions'
  },
  'chevron-left': {
    animated: ChevronLeftIcon,
    lucide: LucideChevronLeft,
    notes: 'Pagination, navigation back'
  },
  'chevron-down': {
    animated: ChevronDownIcon,
    lucide: LucideChevronDown,
    notes: 'Dropdowns and FAQ accordion'
  },
  'chevron-up': {
    animated: ChevronUpIcon,
    lucide: LucideChevronUp,
    notes: 'Accordion collapses'
  },
  'panel-left-close': {
    animated: PanelLeftCloseIcon,
    lucide: LucidePanelLeftClose,
    notes: 'Sidebar collapse'
  },
  'panel-left-open': {
    animated: PanelLeftOpenIcon,
    lucide: LucidePanelLeftOpen,
    notes: 'Sidebar expand'
  },
  'panel-right-close': {
    animated: PanelRightCloseIcon,
    lucide: LucidePanelRightClose
  },
  'panel-right-open': {
    animated: PanelRightOpenIcon,
    lucide: LucidePanelRightOpen
  },
  'arrow-left': {
    animated: ArrowLeftIcon,
    lucide: LucideArrowLeft
  },
  'arrow-right': {
    animated: ArrowRightIcon,
    lucide: LucideArrowRight
  },
  'arrow-up-right': {
    lucide: LucideArrowUpRight
  },
  'external-link': {
    lucide: LucideExternalLink
  },
  info: {
    lucide: LucideInfo
  },
  home: {
    lucide: LucideHome
  },
  'help-circle': {
    lucide: LucideCircleHelp
  },
  command: {
    lucide: LucideCommand
  },
  plus: {
    animated: PlusIcon,
    lucide: LucidePlus
  },
  minus: {
    animated: MinusIcon,
    lucide: LucideMinus
  },
  eye: {
    lucide: LucideEye
  },
  'eye-off': {
    animated: EyeOffIcon,
    lucide: LucideEyeOff
  },
  link: {
    lucide: LucideLink
  },
  flag: {
    lucide: LucideFlag
  },
  archive: {
    animated: ArchiveIcon,
    lucide: LucideArchive
  },
  alert: {
    animated: CircleAlertIcon,
    lucide: LucideCircleAlert
  },
  'circle-alert': {
    animated: CircleAlertIcon,
    lucide: LucideCircleAlert
  },

  // Tools & Operations
  send: {
    animated: SendIcon,
    lucide: LucideSend
  },
  download: {
    animated: DownloadIcon,
    lucide: LucideDownload
  },
  upload: {
    animated: UploadIcon,
    lucide: LucideUpload
  },
  'upload-cloud': {
    animated: HardDriveUploadIcon,
    lucide: LucideUploadCloud
  },
  file: {
    lucide: LucideFile
  },
  'file-text': {
    lucide: LucideFileText
  },
  'file-code': {
    lucide: LucideFileCode
  },
  image: {
    lucide: LucideImage
  },
  'image-plus': {
    lucide: LucideImagePlus
  },
  folder: {
    lucide: LucideFolder
  },
  'folder-open': {
    lucide: LucideFolderOpen
  },
  clock: {
    animated: HistoryIcon,
    lucide: LucideClock
  },
  history: {
    animated: HistoryIcon,
    lucide: LucideHistory
  },
  settings: {
    animated: SettingsIcon,
    lucide: LucideSettings
  },
  'settings-2': {
    animated: SettingsIcon,
    lucide: LucideSettings2
  },
  trash: {
    animated: Trash2Icon,
    lucide: LucideTrash2
  },
  'trash-2': {
    animated: Trash2Icon,
    lucide: LucideTrash2
  },
  check: {
    animated: CheckIcon,
    lucide: LucideCheck
  },
  'check-circle': {
    animated: CircleCheckIcon,
    lucide: LucideCheckCircle
  },
  lock: {
    lucide: LucideLock
  },
  key: {
    animated: KeyIcon,
    lucide: LucideKey
  },
  'key-round': {
    animated: KeyRoundIcon,
    lucide: LucideKeyRound
  },
  shield: {
    lucide: LucideShield
  },
  'shield-check': {
    animated: ShieldCheckIcon,
    lucide: LucideShieldCheck
  },
  zap: {
    lucide: LucideZap
  },
  'qr-code': {
    lucide: LucideQrCode
  },

  // Category & Tool Domains
  layers: {
    lucide: LucideLayers
  },
  cpu: {
    lucide: LucideCpu
  },
  terminal: {
    animated: TerminalIcon,
    lucide: LucideTerminal
  },
  code: {
    lucide: LucideCode
  },
  database: {
    lucide: LucideDatabase
  },
  boxes: {
    lucide: LucideBoxes
  },
  sparkles: {
    animated: SparklesIcon,
    lucide: LucideSparkles
  },
  'hard-drive': {
    lucide: LucideHardDrive
  },
  sliders: {
    lucide: LucideSliders
  },
  compass: {
    lucide: LucideCompass
  },
  bookmark: {
    animated: BookmarkIcon,
    lucide: LucideBookmark
  },
  star: {
    animated: StarIcon,
    lucide: LucideStar
  },
  grid: {
    lucide: LucideGrid
  },
  braces: {
    lucide: LucideBraces
  },
  'curly-braces': {
    lucide: LucideBraces
  },
  fingerprint: {
    lucide: LucideFingerprint
  },
  binary: {
    animated: BinaryIcon,
    lucide: LucideBinary
  },
  wrench: {
    lucide: LucideWrench
  },
  'maximize-2': {
    lucide: LucideMaximize2
  },
  'log-in': {
    lucide: LucideLogIn
  },
  login: {
    lucide: LucideLogIn
  },
  'refresh-cw': {
    lucide: LucideRefreshCw
  },
  refresh: {
    lucide: LucideRefreshCw
  },
  save: {
    lucide: LucideSave
  },
  filter: {
    lucide: LucideFilter
  },
  'layout-grid': {
    lucide: LucideLayoutGrid
  },
  list: {
    lucide: LucideList
  },
  'sliders-horizontal': {
    lucide: LucideSlidersHorizontal
  },
  'scan-qr-code': {
    lucide: LucideScanQrCode
  },
  'folder-up': {
    lucide: LucideFolderUp
  },
  'check-check': {
    lucide: LucideCheckCheck
  },
  table: {
    lucide: LucideTable
  },
  video: {
    lucide: LucideVideo
  },
  music: {
    lucide: LucideMusic
  },
  pencil: {
    lucide: LucidePencil
  },
  presentation: {
    lucide: LucidePresentation
  },
  'clipboard-paste': {
    lucide: LucideClipboardPaste
  },
  'search-x': {
    lucide: LucideSearchX
  }
};
