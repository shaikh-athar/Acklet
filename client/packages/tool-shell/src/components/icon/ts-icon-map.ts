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
  LucideArrowUp,
  LucideArrowUpRight,
  LucideExternalLink,
  LucideInfo,
  LucideCircleHelp,
  LucideCommand,
  LucideSend,
  LucideDownload,
  LucideUpload,
  LucideUploadCloud,
  LucideDownloadCloud,
  LucidePause,
  LucidePlay,
  LucidePower,
  LucidePowerOff,
  LucideCopyPlus,
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
  LucideZapOff,
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
  LucideSearchX,
  LucideBold,
  LucideItalic,
  LucideUnderline,
  LucidePalette,
  LucideEllipsis,
  LucideEllipsisVertical,
  LucideHeading,
  LucideHeading1,
  LucideHeading2,
  LucideHeading3,
  LucideStrikethrough,
  LucideRemoveFormatting,
  LucideListOrdered,
  LucideQuote,
  LucideSquareTerminal,
  LucideImages,
  LucideTextWrap,
  LucideGlobe,
  LucideType,
  LucideMail,
  LucidePhone,
  LucideMessageSquare,
  LucideWifi,
  LucideMapPin,
  LucideCalendar,
  LucideUser,
  LucideShare2,
  LucideSmartphone,
  LucideWallet,
  LucideHeart,
  LucideFrame,
  LucideArrowLeftRight,
  LucideActivity,
  LucideAward,
  LucideBadge,
  LucideTarget,
  LucideGalleryVerticalEnd,
  LucideUnlink,
  LucideMapPinned,
  LucideLocateFixed,
  LucideLink2Off,
  LucideScanEye,
  LucideSquarePen,
  LucideArrowUpDown,
  LucideBarChart2,
  LucideChevronsUpDown,
  LucideColumns,
  LucideCornerUpLeft,
  LucideFileCode2,
  LucideFileInput,
  LucideFileJson,
  LucideFolderTree,
  LucideGitCompare,
  LucideMinimize2,
  LucideNetwork,
  LucideRepeat,
  LucideRotateCcw,
  LucideRotateCw,
  LucideRuler,
  LucideSearchCode,
  LucideShieldAlert,
  LucideWand2,
  LucideZoomIn,
  LucideZoomOut
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

export const LucideLayoutGridCircles = {
  name: 'layout-grid-circles',
  size: 24,
  node: [
    ['circle', { cx: '6', cy: '6', r: '3', key: 'lgc1' }],
    ['circle', { cx: '18', cy: '6', r: '3', key: 'lgc2' }],
    ['circle', { cx: '6', cy: '18', r: '3', key: 'lgc3' }],
    ['circle', { cx: '18', cy: '18', r: '3', key: 'lgc4' }],
  ],
};

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
  'arrow-up': 'motion-translate-up',
  'arrow-up-right': 'motion-translate-right',
  'arrow-right': 'motion-translate-right',
  sun: 'motion-rotate-15',
  moon: 'motion-rotate-15',
  zap: 'motion-scale-up',
  'zap-off': 'motion-scale-up',
  link: 'motion-rotate-15',
  urlshortener: 'motion-rotate-15',
  chain: 'motion-rotate-15'
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
  'arrow-up': {
    lucide: LucideArrowUp
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
    lucide: LucideLink,
    notes: 'URL Shortener tool identity and link indicators'
  },
  urlshortener: {
    lucide: LucideLink,
    notes: 'URL Shortener identity alias'
  },
  chain: {
    lucide: LucideLink,
    notes: 'Chain icon alias'
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
  'zap-off': {
    lucide: LucideZapOff
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
  'square-pen': {
    lucide: LucideSquarePen
  },
  'pen-square': {
    lucide: LucideSquarePen
  },
  edit: {
    lucide: LucideSquarePen
  },
  'edit-2': {
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
  },
  bold: {
    lucide: LucideBold
  },
  italic: {
    lucide: LucideItalic
  },
  underline: {
    lucide: LucideUnderline
  },
  palette: {
    lucide: LucidePalette
  },
  'more-horizontal': {
    lucide: LucideEllipsis
  },
  ellipsis: {
    lucide: LucideEllipsis
  },
  'ellipsis-vertical': {
    lucide: LucideEllipsisVertical
  },
  'more-vertical': {
    lucide: LucideEllipsisVertical
  },
  heading: {
    lucide: LucideHeading
  },
  'heading-1': {
    lucide: LucideHeading1
  },
  'heading-2': {
    lucide: LucideHeading2
  },
  'heading-3': {
    lucide: LucideHeading3
  },
  strikethrough: {
    lucide: LucideStrikethrough
  },
  'remove-formatting': {
    lucide: LucideRemoveFormatting
  },
  'clear-formatting': {
    lucide: LucideRemoveFormatting
  },
  'list-ordered': {
    lucide: LucideListOrdered
  },
  quote: {
    lucide: LucideQuote
  },
  'square-terminal': {
    lucide: LucideSquareTerminal
  },
  images: {
    lucide: LucideImages
  },
  'layout-grid-circles': {
    lucide: LucideLayoutGridCircles
  },
  'edit-3': {
    lucide: LucidePencil
  },
  'alert-circle': {
    animated: CircleAlertIcon,
    lucide: LucideCircleAlert
  },
  'alert-triangle': {
    animated: CircleAlertIcon,
    lucide: LucideCircleAlert
  },
  'text-wrap': {
    lucide: LucideTextWrap
  },
  'wrap-text': {
    lucide: LucideTextWrap
  },
  globe: {
    lucide: LucideGlobe
  },
  type: {
    lucide: LucideType
  },
  mail: {
    lucide: LucideMail
  },
  phone: {
    lucide: LucidePhone
  },
  'message-square': {
    lucide: LucideMessageSquare
  },
  wifi: {
    lucide: LucideWifi
  },
  'map-pin': {
    lucide: LucideMapPin
  },
  'map-pinned': {
    lucide: LucideMapPinned
  },
  'locate-fixed': {
    lucide: LucideLocateFixed
  },
  calendar: {
    lucide: LucideCalendar
  },
  user: {
    lucide: LucideUser
  },
  'share-2': {
    lucide: LucideShare2
  },
  smartphone: {
    lucide: LucideSmartphone
  },
  wallet: {
    lucide: LucideWallet
  },
  heart: {
    lucide: LucideHeart
  },
  frame: {
    lucide: LucideFrame
  },
  'arrow-left-right': {
    lucide: LucideArrowLeftRight
  },
  swap: {
    lucide: LucideArrowLeftRight
  },
  activity: {
    lucide: LucideActivity
  },
  award: {
    lucide: LucideAward
  },
  brand: {
    lucide: LucideAward
  },
  badge: {
    lucide: LucideBadge
  },
  target: {
    lucide: LucideTarget
  },
  'graph-star': {
    lucide: LucideStar
  },
  'gallery-vertical-end': {
    lucide: LucideGalleryVerticalEnd
  },
  'link-2-off': {
    lucide: LucideLink2Off
  },
  'scan-eye': {
    lucide: LucideScanEye
  },
  unlink: {
    lucide: LucideUnlink
  },
  'grid-circles': {
    lucide: LucideLayoutGridCircles
  },
  'arrow-up-down': {
    lucide: LucideArrowUpDown
  },
  'bar-chart-2': {
    lucide: LucideBarChart2
  },
  'chevrons-up-down': {
    lucide: LucideChevronsUpDown
  },
  columns: {
    lucide: LucideColumns
  },
  'corner-up-left': {
    lucide: LucideCornerUpLeft
  },
  'file-code-2': {
    lucide: LucideFileCode2
  },
  'file-input': {
    lucide: LucideFileInput
  },
  'file-json': {
    lucide: LucideFileJson
  },
  'folder-tree': {
    lucide: LucideFolderTree
  },
  'git-diff': {
    lucide: LucideGitCompare
  },
  'git-compare': {
    lucide: LucideGitCompare
  },
  'minimize-2': {
    lucide: LucideMinimize2
  },
  network: {
    lucide: LucideNetwork
  },
  repeat: {
    lucide: LucideRepeat
  },
  'rotate-ccw': {
    lucide: LucideRotateCcw
  },
  'rotate-cw': {
    lucide: LucideRotateCw
  },
  ruler: {
    lucide: LucideRuler
  },
  'search-code': {
    lucide: LucideSearchCode
  },
  'shield-alert': {
    lucide: LucideShieldAlert
  },
  wand: {
    lucide: LucideWand2
  },
  'wand-2': {
    lucide: LucideWand2
  },
  'zoom-in': {
    lucide: LucideZoomIn
  },
  'zoom-out': {
    lucide: LucideZoomOut
  },
  pause: {
    lucide: LucidePause
  },
  play: {
    lucide: LucidePlay
  },
  deactivate: {
    lucide: LucidePause
  },
  reactivate: {
    lucide: LucidePlay
  },
  power: {
    lucide: LucidePower
  },
  'power-off': {
    lucide: LucidePowerOff
  },
  'copy-plus': {
    lucide: LucideCopyPlus
  },
  duplicate: {
    lucide: LucideCopyPlus
  },
  'download-cloud': {
    lucide: LucideDownloadCloud
  },
  backup: {
    lucide: LucideArchive
  },
  restore: {
    lucide: LucideUploadCloud
  },
  delete: {
    lucide: LucideTrash2
  },
  qr: {
    lucide: LucideQrCode
  }
};
