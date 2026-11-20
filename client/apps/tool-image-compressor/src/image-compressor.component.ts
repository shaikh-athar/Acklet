// apps/tool-image-compressor/src/image-compressor.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  HostListener,
  viewChild,
  ElementRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
  effect,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TsIconComponent, FileTransferService } from '@acklet/tool-shell';
import { CompressorStateService } from './services/compressor-state.service';
import { UploadLandingComponent } from './components/upload-landing/upload-landing.component';
import { ImageCardComponent } from './components/image-card/image-card.component';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel.component';
import { CustomizationModalComponent } from './components/customization-modal/customization-modal.component';
import { PreviewModalComponent } from './components/preview-modal/preview-modal.component';
import { SOURCE_ICONS } from './config/source-icons.config';
import { MetadataModalComponent } from './components/metadata-modal/metadata-modal.component';
import { ReportModalComponent } from './components/report-modal/report-modal.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { FeedbackModalComponent } from './components/feedback-modal/feedback-modal.component';
import { resultStatus } from './services/result-status.util';
import { ProfileModalComponent } from './components/profile-modal/profile-modal.component';
import { DownloadReportModalComponent } from './components/download-report-modal/download-report-modal.component';
import { DropdownManagerService } from './services/dropdown-manager.service';
import {
  CompressionSettings,
  DeveloperPresetKey,
  IndividualCompressionOverrides
} from './models/compressor.models';
import { DEFAULT_COMPRESSION_SETTINGS } from './services/compressor-state.service';
import { COMPRESSOR_CONFIG } from './config/compressor.config';
import { copyBlobToClipboard } from './services/save-destination.util';
import { CompressorTelemetryService } from './services/compressor-telemetry.service';

export type CompressorScreen = 'home' | 'working' | 'output';

@Component({
  selector: 'app-image-compressor-tool',
  standalone: true,
  imports: [
    CommonModule,
    TsIconComponent,
    UploadLandingComponent,
    ImageCardComponent,
    SettingsPanelComponent,
    CustomizationModalComponent,
    PreviewModalComponent,
    MetadataModalComponent,
    ReportModalComponent,
    ConfirmModalComponent,
    FeedbackModalComponent,
    ProfileModalComponent,
    DownloadReportModalComponent
  ],
  host: {
    '[class.has-images]': 'state.hasImages()',
    '[class.is-home-screen]': "currentScreen() === 'home'",
    '[class.is-working-screen]': "currentScreen() === 'working'",
    '[class.is-output-screen]': "currentScreen() === 'output'",
    '[style.--tool-accent]': '"#2563EB"',
    '[style.--tool-accent-soft]': '"rgba(37, 99, 235, 0.08)"',
    '[style.--tool-accent-contrast]': '"#FFFFFF"'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-compressor.component.html',
  styleUrls: ['./image-compressor.component.css']
})
export class ImageCompressorComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly state = inject(CompressorStateService);
  readonly dropdownManager = inject(DropdownManagerService);
  private readonly fileTransfer = inject(FileTransferService);
  private readonly telemetry = inject(CompressorTelemetryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly elementRef = inject(ElementRef);

  readonly currentScreen = signal<CompressorScreen>('home');

  readonly workspaceFileInput = viewChild<ElementRef<HTMLInputElement>>('workspaceFileInput');
  readonly isDownloadSaveDropdownOpen = computed<boolean>(() => this.dropdownManager.isOpen('output-download-save-to'));
  readonly isMobileSettingsSheetOpen = signal<boolean>(false);
  readonly customizingItemId = signal<string | null>(null);
  readonly isHeaderScrolled = signal<boolean>(false);
  readonly isDownloadReportOpen = signal<boolean>(false);
  readonly isOutputCopiedToClipboard = signal<boolean>(false);
  readonly clipboardAlertMessage = signal<string>('');
  private copiedStateTimer: any = null;
  private scrollCleanups: (() => void)[] = [];

  readonly isGoogleDriveConfigured = Boolean(
    COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey && COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId
  );
  readonly isDropboxConfigured = Boolean(
    COMPRESSOR_CONFIG.cloudSources?.dropbox?.appKey
  );
  readonly isOneDriveConfigured = Boolean(
    COMPRESSOR_CONFIG.cloudSources?.oneDrive?.clientId
  );

  readonly customizingItem = computed(() => {
    const id = this.customizingItemId();
    return id ? this.state.images().find(img => img.id === id) || null : null;
  });

  readonly readyCount = computed<number>(() => {
    return this.state.pendingImages().length;
  });

  constructor() {
    effect(() => {
      const pending = this.fileTransfer.consumePendingFiles();
      if (pending && pending.length > 0) {
        this.onFilesSelected(pending);
      }
    }, { allowSignalWrites: true });

    // Screen transition handler: ensure smooth scroll to top when changing screens without visible focus rings
    effect(() => {
      const scr = this.currentScreen();
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      const saved = window.history.state?.ackletScreen as CompressorScreen | undefined;
      if (saved === 'output' && this.state.hasCompletedImages()) {
        this.currentScreen.set('output');
      } else if (saved === 'working' && this.state.hasImages()) {
        this.currentScreen.set('working');
      } else if (this.state.hasCompletedImages()) {
        this.currentScreen.set('output');
      } else if (this.state.hasImages()) {
        this.currentScreen.set('working');
      } else {
        this.currentScreen.set('home');
      }

      window.addEventListener('popstate', this.onPopState);
    }
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const onScroll = () => {
        const sc = document.querySelector('.ts-main-scroll-container');
        const st = sc ? sc.scrollTop : (typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop || 0) : 0);
        const scrolled = st > 12;
        if (this.isHeaderScrolled() !== scrolled) {
          this.ngZone.run(() => {
            this.isHeaderScrolled.set(scrolled);
            this.cdr.markForCheck();
          });
        }
      };

      const sc = document.querySelector('.ts-main-scroll-container');
      if (sc) {
        sc.addEventListener('scroll', onScroll, { passive: true });
        this.scrollCleanups.push(() => sc.removeEventListener('scroll', onScroll));
        onScroll();
      }

      if (typeof window !== 'undefined') {
        const winScroll = (e: Event) => {
          if (e.target === sc) return;
          onScroll();
        };
        window.addEventListener('scroll', winScroll, { passive: true });
        this.scrollCleanups.push(() => window.removeEventListener('scroll', winScroll));
      }
    });
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopState);
    }
    if (this.copiedStateTimer) {
      clearTimeout(this.copiedStateTimer);
      this.copiedStateTimer = null;
    }
    this.scrollCleanups.forEach(fn => fn());
    this.scrollCleanups = [];
    if (this.state.isCompressingAny()) {
      this.state.cancelAll();
    }
  }



  private readonly onPopState = (event: PopStateEvent): void => {
    const target = event.state?.ackletScreen as CompressorScreen | undefined;
    if (target) {
      this.currentScreen.set(target);
    } else {
      if (this.currentScreen() === 'output') {
        this.requestStartOver();
      } else if (this.currentScreen() === 'working') {
        this.setScreen('home');
      }
    }
  };

  setScreen(nextScreen: CompressorScreen): void {
    if (this.currentScreen() === nextScreen) return;
    this.currentScreen.set(nextScreen);
    if (typeof window !== 'undefined') {
      window.history.pushState({ ackletScreen: nextScreen }, '', window.location.href);
    }
  }

  goToWorkingScreen(): void {
    this.setScreen('working');
  }

  confirmAndExecuteDownload(): void {
    this.isDownloadReportOpen.set(false);
    this.state.downloadAllCompletedZip();
  }

  confirmStartOver(): void {
    this.state.confirmModalAction();
    this.setScreen('home');
  }

  requestStartOver(): void {
    this.state.resetToNewSession();
    this.setScreen('home');
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }

  readonly sourceIcons = SOURCE_ICONS;
  readonly activeAddSourceMenu = computed<'header' | 'tile' | null>(() => {
    if (this.dropdownManager.isOpen('header-add-source')) return 'header';
    if (this.dropdownManager.isOpen('tile-add-source')) return 'tile';
    return null;
  });

  // Computed for backward compatibility
  readonly isAddImagesSourceMenuOpen = computed(() => this.activeAddSourceMenu() === 'header');

  readonly workingSourceOptions = [
    {
      id: 'device',
      label: 'This device',
      ariaLabel: 'Upload from this device',
      tooltip: 'Choose files from this device',
      icon: 'monitor-smartphone',
      isConfigured: true
    },
    {
      id: 'drive',
      label: 'Google Drive',
      ariaLabel: 'Add from Google Drive',
      tooltip: 'Google Drive',
      logo: SOURCE_ICONS.googleDrive,
      icon: 'hard-drive',
      get isConfigured(): boolean {
        return Boolean(COMPRESSOR_CONFIG.cloudSources?.googleDrive?.apiKey && COMPRESSOR_CONFIG.cloudSources?.googleDrive?.clientId);
      }
    },
    {
      id: 'dropbox',
      label: 'Dropbox',
      ariaLabel: 'Add from Dropbox',
      tooltip: 'Dropbox',
      logo: SOURCE_ICONS.dropbox,
      icon: 'folder-up',
      get isConfigured(): boolean {
        return Boolean(COMPRESSOR_CONFIG.cloudSources?.dropbox?.appKey);
      }
    },
    {
      id: 'onedrive',
      label: 'OneDrive',
      ariaLabel: 'Add from OneDrive',
      tooltip: 'OneDrive',
      logo: SOURCE_ICONS.oneDrive,
      icon: 'cloud',
      get isConfigured(): boolean {
        return Boolean(COMPRESSOR_CONFIG.cloudSources?.oneDrive?.clientId);
      }
    },
    {
      id: 'clipboard',
      label: 'Clipboard',
      ariaLabel: 'Paste from clipboard',
      tooltip: 'Paste from clipboard',
      icon: 'clipboard-paste',
      isConfigured: true
    }
  ];

  // Alias for backward compatibility
  get availableSources() {
    return this.workingSourceOptions;
  }

  toggleAddSourceMenu(target: 'header' | 'tile', event: Event): void {
    event.stopPropagation();
    const id = target === 'header' ? 'header-add-source' : 'tile-add-source';
    this.dropdownManager.toggle(id);
  }

  toggleAddImagesSourceMenu(event: Event): void {
    this.toggleAddSourceMenu('header', event);
  }

  closeAddSourceMenu(): void {
    this.dropdownManager.close('header-add-source');
    this.dropdownManager.close('tile-add-source');
  }

  closeAddImagesSourceMenu(): void {
    this.closeAddSourceMenu();
  }

  async onWorkingSourceClick(src: { id: string; label: string; icon: string; logo?: string; isConfigured: boolean }, event?: Event): Promise<void> {
    if (!src.isConfigured) {
      if (event) {
        event.stopPropagation();
        event.preventDefault();
      }
      return;
    }
    this.closeAddSourceMenu();
    if (src.id === 'device' || src.id === 'local') {
      this.openWorkspaceFilePicker();
    } else if (src.id === 'clipboard') {
      await this.handleWorkingClipboardPaste();
    } else if (src.id === 'drive' || src.id === 'dropbox' || src.id === 'onedrive') {
      this.state.showToast('info', `Connecting to ${src.label}...`, 2500);
    }
  }

  async handleWorkingClipboardPaste(): Promise<void> {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
        this.state.showToast('warning', 'Clipboard access not supported', 3000);
        return;
      }
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
            files.push(new File([blob], `clipboard-${Date.now()}.${ext}`, { type }));
          }
        }
      }
      if (files.length > 0) {
        await this.state.addFiles(files);
      } else {
        this.state.showToast('info', 'No image found in clipboard', 3000);
      }
    } catch {
      this.state.showToast('info', 'No image found in clipboard', 3000);
    }
  }

  openWorkspaceFilePicker(): void {
    this.closeAddImagesSourceMenu();
    const input = this.workspaceFileInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  async onFilesSelected(files: FileList | File[]): Promise<void> {
    await this.state.addFiles(files);
    if (this.state.hasImages()) {
      this.setScreen('working');
    }
  }

  onExamplePresetSelected(presetKey: DeveloperPresetKey): void {
    if (presetKey) {
      this.state.applyDeveloperPreset(presetKey);
    }
  }

  async onCompressAll(): Promise<void> {
    await this.state.compressAll();
    this.setScreen('output');
  }

  async onCompressItem(id: string): Promise<void> {
    await this.state.compressItem(id);
    this.setScreen('output');
  }

  readonly reducedFilesStatus = computed(() => {
    const completed = this.state.completedImages();
    const pairs = completed.map(img => ({ img, status: resultStatus(img) }));
    const reduced = pairs.filter(p => p.status.reduced);
    const notReduced = pairs.filter(p => !p.status.reduced);

    let savedPercentage = 0;
    if (reduced.length > 0) {
      const origTotal = reduced.reduce((sum, p) => sum + p.img.originalSize, 0);
      const outTotal = reduced.reduce((sum, p) => sum + p.status.outputBytes, 0);
      if (origTotal > 0) {
        savedPercentage = Math.floor(((origTotal - outTotal) / origTotal) * 100);
      }
    }

    return {
      totalCount: completed.length,
      reducedCount: reduced.length,
      notReducedCount: notReduced.length,
      savedPercentage
    };
  });

  readonly outputGalleryImages = computed(() => {
    return this.state.images().filter(
      img => img.status === 'completed' || img.status === 'processing' || img.status === 'pending' || !!img.result
    );
  });

  readonly outputHeadline = computed<string>(() => {
    const isProcessing = this.state.images().some(img => img.status === 'processing' || img.status === 'pending');
    if (isProcessing) {
      return 'Optimizing your image...';
    }
    const { reducedCount, savedPercentage } = this.reducedFilesStatus();
    if (reducedCount > 0) {
      return `Your images are now ${savedPercentage}% smaller.`;
    }
    return 'Your images are ready.';
  });

  readonly outputSummaryLine = computed<string>(() => {
    return '';
  });

  openCustomizationModal(id: string): void {
    this.state.prepareForCustomization(id);
    this.customizingItemId.set(id);
  }

  closeCustomizationModal(): void {
    this.customizingItemId.set(null);
  }

  onCustomizationApply(id: string, overrides: Partial<IndividualCompressionOverrides>): void {
    this.state.updateIndividualSettings(id, overrides);
    this.closeCustomizationModal();
  }

  onCustomizationCompress(id: string, overrides: Partial<IndividualCompressionOverrides>): void {
    this.state.updateIndividualSettings(id, overrides);
    this.closeCustomizationModal();
    this.state.compressItem(id);
  }

  onResetCustomization(id: string): void {
    this.state.resetIndividualSettings(id);
    this.closeCustomizationModal();
  }



  toggleDownloadSaveDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.dropdownManager.toggle('output-download-save-to');
  }

  closeDownloadSaveDropdown(): void {
    this.dropdownManager.close('output-download-save-to');
  }

  onDownloadChevronKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isDownloadSaveDropdownOpen()) {
        this.toggleDownloadSaveDropdown();
      }
      setTimeout(() => {
        const panel = document.getElementById('output-download-save-menu');
        const firstItem = panel?.querySelector<HTMLButtonElement>('.save-dropdown-item:not(.is-disabled)');
        firstItem?.focus();
      }, 10);
    }
  }

  onDownloadDropdownKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDownloadSaveDropdown();
      const chevron = document.querySelector<HTMLButtonElement>('.btn-download-chevron');
      chevron?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const panel = document.getElementById('output-download-save-menu');
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLButtonElement>('.save-dropdown-item'));
      const activeIdx = items.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === 'ArrowDown') {
        const next = items[(activeIdx + 1) % items.length];
        next?.focus();
      } else {
        const prev = items[(activeIdx - 1 + items.length) % items.length];
        prev?.focus();
      }
    }
  }

  async onDownloadSaveItemClick(destination: 'device' | 'drive' | 'dropbox' | 'onedrive' | 'clipboard'): Promise<void> {
    if (destination === 'device') {
      this.closeDownloadSaveDropdown();
      this.downloadAllToDevice();
      return;
    }
    if (destination === 'drive') {
      if (!this.isGoogleDriveConfigured) {
        return; // Disabled: do nothing, dropdown stays open
      }
      this.closeDownloadSaveDropdown();
      this.state.showToast('info', 'Connecting to Google Drive...', 2500);
      return;
    }
    if (destination === 'dropbox') {
      if (!this.isDropboxConfigured) {
        return; // Disabled: do nothing, dropdown stays open
      }
      this.closeDownloadSaveDropdown();
      this.state.showToast('info', 'Connecting to Dropbox...', 2500);
      return;
    }
    if (destination === 'onedrive') {
      if (!this.isOneDriveConfigured) {
        return; // Disabled: do nothing, dropdown stays open
      }
      this.closeDownloadSaveDropdown();
      this.state.showToast('info', 'Connecting to OneDrive...', 2500);
      return;
    }
    if (destination === 'clipboard') {
      this.closeDownloadSaveDropdown();
      await this.copyOutputToClipboard();
      return;
    }
  }

  downloadAllToDevice(): void {
    if (this.state.completedCount() === 1) {
      const single = this.state.completedImages()[0];
      if (single) {
        this.state.downloadItemResult(single.id);
      }
    } else {
      this.state.downloadAllCompletedZip();
    }
  }

  async copyOutputToClipboard(): Promise<void> {
    const completed = this.state.completedImages();
    if (completed.length === 0) return;

    if (completed.length === 1) {
      const item = completed[0];
      const blob = item.result?.outputBlob;
      if (!blob) {
        this.showClipboardAlert('Your browser cannot copy this. Use Download.');
        return;
      }
      const res = await copyBlobToClipboard(blob);
      if (res.success) {
        this.isOutputCopiedToClipboard.set(true);
        this.state.showToast('success', 'Image copied to clipboard!', 2500);
        setTimeout(() => this.isOutputCopiedToClipboard.set(false), 2000);
      } else {
        this.showClipboardAlert(res.message || 'Your browser cannot copy this. Use Download.');
      }
    } else {
      const zipBlob = await this.state.generateZipBlobOfCompleted();
      if (!zipBlob) {
        this.showClipboardAlert('Your browser cannot copy this. Use Download.');
        return;
      }
      const res = await copyBlobToClipboard(zipBlob);
      if (res.success) {
        this.isOutputCopiedToClipboard.set(true);
        this.state.showToast('success', 'ZIP copied to clipboard!', 2500);
        setTimeout(() => this.isOutputCopiedToClipboard.set(false), 2000);
      } else {
        this.showClipboardAlert(res.message || 'Your browser cannot copy this. Use Download.');
      }
    }
  }

  private showClipboardAlert(msg: string): void {
    this.clipboardAlertMessage.set(msg);
    setTimeout(() => {
      this.clipboardAlertMessage.set('');
    }, 4000);
  }

  openMobileSettingsSheet(): void {
    this.isMobileSettingsSheetOpen.set(true);
  }

  closeMobileSettingsSheet(): void {
    this.isMobileSettingsSheetOpen.set(false);
  }

  onGlobalSettingsChanged(settings: Partial<CompressionSettings>): void {
    this.state.updateGlobalSettings(settings);
    this.state.showToast('info', 'Updated global compression settings', 1500);
  }

  onIndividualSettingsChanged(event: { id: string; settings: Partial<CompressionSettings> }): void {
    this.state.updateIndividualSettings(event.id, event.settings);
    this.state.showToast('info', 'Updated settings for image', 1500);
  }

  onResetIndividualSettings(id: string): void {
    this.state.resetIndividualSettings(id);
  }

  onCloseIndividualSettings(): void {
    this.state.closeItemSettings();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownManager.closeAll();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dropdownManager.closeAll();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.state.isCompressingAny()) {
      event.preventDefault();
      event.returnValue = 'Active image compressions are running. Are you sure you want to leave?';
    }
  }

  @HostListener('drop', ['$event'])
  onPageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.fileTransfer.consumePendingFiles();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.onFilesSelected(event.dataTransfer.files);
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}
