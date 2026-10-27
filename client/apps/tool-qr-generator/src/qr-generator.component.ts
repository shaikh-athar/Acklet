// client/apps/tool-qr-generator/src/qr-generator.component.ts
import {
  Component,
  signal,
  computed,
  inject,
  viewChild,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  effect,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, timer, BehaviorSubject } from 'rxjs';
import { debounce, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  ContentType,
  CONTENT_TYPE_CONFIGS,
  ErrorCorrectionLevel,
  ExportFormat,
  QROptions,
  QrDotType,
  QrCornerSquareType,
  QrCornerDotType,
  QRHistoryItem,
  DesignPreset,
  QrFrameOptions,
  DEFAULT_FRAME_OPTIONS,
  getDefaultCtaTextColor,
  QrGradientOptions,
  DEFAULT_GRADIENT_OPTIONS,
  QrArtShapeOptions,
  DEFAULT_ART_SHAPE_OPTIONS
} from './models/qr-generator.models';
import { QRGeneratorService } from './services/qr-generator.service';
import { QRHistoryService } from './services/qr-history.service';
import { QrDynamicService } from './services/qr-dynamic.service';
import { SmartLinkService } from './services/smart-link.service';
import { normalizeLineEndings } from './services/qr-payload-builders';
import { calculateAutoErrorCorrection } from './utils/qr-auto-ec.util';
import { InputPanelComponent } from './components/input-panel/input-panel.component';
import { ColorCustomizerComponent } from './components/color-customizer/color-customizer.component';
import { DesignCustomizerComponent } from './components/design-customizer/design-customizer.component';
import { getSocialPlatformSvgDataUrl } from './utils/social-platforms.data';
import { PreviewPanelComponent } from './components/preview-panel/preview-panel.component';
import { QrDynamicManagerComponent } from './components/dynamic-manager/dynamic-manager.component';
import { DynamicLinksComponent } from './components/dynamic-links/dynamic-links.component';
import { QrAssembleEffectComponent } from './components/qr-assemble-effect/qr-assemble-effect.component';
import { AdvancedModalComponent } from './components/advanced-modal/advanced-modal.component';
import { LiveSmartLink } from './services/smart-link.service';
import {
  TsIconComponent,
  ResponsiveService,
  BottomSheetComponent,
  StickyActionBarComponent,
  TsLongPressDirective,
  TsDoubleTapDirective,
  HapticService
} from '@acklet/tool-shell';
import { getToolsHubUrl } from '@acklet/shared';

const ALL_CONTENT_TYPES: Array<{ type: ContentType; label: string; icon: string; desc: string }> = [
  { type: 'url', label: 'URL', icon: 'globe', desc: 'Website link or dynamic shortlink' },
  { type: 'text', label: 'Text', icon: 'type', desc: 'Plain readable text or memo' },
  { type: 'wifi', label: 'Wi-Fi', icon: 'wifi', desc: 'Network SSID & credentials' },
  { type: 'vcard', label: 'vCard', icon: 'user', desc: 'Contact business card' },
  { type: 'email', label: 'Email', icon: 'mail', desc: 'Pre-filled email draft' },
  { type: 'phone', label: 'Phone Call', icon: 'phone', desc: 'Direct dial on mobile devices' },
  { type: 'sms', label: 'SMS Message', icon: 'message-square', desc: 'Pre-filled text message' },
  { type: 'geo', label: 'Location', icon: 'map-pin', desc: 'Coordinates on Apple / Google Maps' },
  { type: 'event', label: 'Calendar Event', icon: 'calendar', desc: 'Import into Apple / Google Calendar' },
  { type: 'social', label: 'Social Profile', icon: 'share-2', desc: 'Instagram, X, LinkedIn, etc.' },
  { type: 'app', label: 'App Store', icon: 'smartphone', desc: 'Direct download link' },
  { type: 'crypto', label: 'Crypto Wallet', icon: 'wallet', desc: 'Bitcoin, Ethereum, Solana payment' }
];

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [
    CommonModule,
    InputPanelComponent,
    ColorCustomizerComponent,
    DesignCustomizerComponent,
    PreviewPanelComponent,
    QrDynamicManagerComponent,
    DynamicLinksComponent,
    QrAssembleEffectComponent,
    TsIconComponent,
    BottomSheetComponent,
    StickyActionBarComponent,
    AdvancedModalComponent,
    TsLongPressDirective,
    TsDoubleTapDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-page-shell" data-accent="blue">
      <!-- Left Ad Gutter (>= 1280px) -->
      <aside class="ad-gutter ad-gutter-left" aria-label="Advertisement slot left">
        <div class="ad-slot-placeholder" data-ad-slot="skyscraper-left"></div>
      </aside>

      <!-- Centered Tool Container (max width: 1160px) -->
      <div class="qr-tool-container">
        @if (!isMobileFlow()) {
          <!-- SCREEN 1: Primary Viewport (Content Input + Live QR Preview Only) -->
          <main id="screen1Hero" class="qr-screen-primary" aria-label="Content input and live QR preview">
          <!-- Column 1: Left Configuration Workspace (Content & Customize Layouts) -->
          <section class="qr-col qr-col-input" aria-label="QR Code Configuration">
            <!-- Workspace Mode Tabs: Content | Customize -->
            <div class="workspace-mode-nav" role="tablist" aria-label="Tool configuration sections">
              <button
                type="button"
                role="tab"
                class="workspace-mode-btn"
                [class.active]="activeTab() === 'content'"
                [attr.aria-selected]="activeTab() === 'content'"
                (click)="onSwitchTab('content')"
              >
                <ts-icon name="type" class="mode-btn-icon" />
                <span>Content</span>
              </button>
              <button
                type="button"
                role="tab"
                class="workspace-mode-btn"
                [class.active]="activeTab() === 'design'"
                [attr.aria-selected]="activeTab() === 'design'"
                (click)="onSwitchTab('design')"
              >
                <ts-icon name="palette" class="mode-btn-icon" />
                <span>Customize</span>
                @if (hasCustomDesign()) {
                  <span class="customized-indicator-dot"></span>
                }
              </button>
              <button
                type="button"
                role="tab"
                class="workspace-mode-btn"
                [class.active]="activeTab() === 'dynamic'"
                [attr.aria-selected]="activeTab() === 'dynamic'"
                (click)="onSwitchTab('dynamic')"
              >
                <ts-icon name="graph-star" class="mode-btn-icon" />
                <span>Dynamic Links</span>
                @if (smartLinkService.storedLinks().length > 0) {
                  <span class="nav-count-badge">{{ smartLinkService.storedLinks().length }}</span>
                }
              </button>
            </div>

            <!-- TAB 1: Content Input Card -->
            @if (activeTab() === 'content') {
              <div class="qr-studio-panel qr-input-card slide-fade-up">
                <!-- Content Header: QR Name Input Bar + Content Type Selector -->
                <header class="studio-header">
                  <!-- QR Name Input Bar (Assignable & Renamable) -->
                  <div class="qr-name-bar">
                    <span class="qr-name-badge">
                      <ts-icon name="square-pen" [size]="13" class="qr-name-badge-icon" />
                      <span>QR Name</span>
                    </span>
                    <input
                      type="text"
                      id="qrNameInput"
                      class="qr-name-input"
                      placeholder="Name this QR code (e.g. My Website, Office Wi-Fi)..."
                      [value]="qrName()"
                      (input)="onQrNameInput($event)"
                      aria-label="Name of the QR code"
                      maxlength="60"
                    />
                    @if (qrName()) {
                      <button
                        type="button"
                        class="qr-name-clear-btn"
                        (click)="clearQrName()"
                        title="Clear QR name"
                        aria-label="Clear QR name"
                      >
                        <ts-icon name="x" [size]="13" />
                      </button>
                    }
                  </div>

                  <div class="studio-type-bar">
                    <!-- Centered Content Type Selector Trigger matching input width -->
                    <div class="content-type-dropdown-container">
                      <button
                        type="button"
                        id="contentTypeTrigger"
                        class="content-type-dropdown-trigger"
                        [class.open]="isTypeMenuOpen()"
                        [attr.aria-expanded]="isTypeMenuOpen()"
                        aria-haspopup="listbox"
                        (click)="toggleTypeDropdown($event)"
                        title="Select QR code content type"
                        aria-label="Select QR code content type"
                      >
                        <div class="type-trigger-left">
                          <div class="type-trigger-icon-badge">
                            <ts-icon [name]="typeConfigs[selectedType()]?.icon || 'globe'" class="type-trigger-icon" />
                          </div>
                          <div class="type-trigger-text">
                            <span class="type-trigger-label">{{ typeConfigs[selectedType()]?.label || selectedType() }}</span>
                            <span class="type-trigger-desc">{{ getSelectedTypeDesc() }}</span>
                          </div>
                        </div>
                        <div class="type-trigger-right">
                          <span class="type-trigger-badge">Type</span>
                          <ts-icon name="chevron-down" class="type-trigger-chevron" [class.rotated]="isTypeMenuOpen()" />
                        </div>
                      </button>

                      <!-- Anchored Dropdown Menu for Content Types (with instant search & icons) -->
                      @if (isTypeMenuOpen()) {
                        <div class="more-backdrop" (click)="closeTypeDropdown()"></div>
                        <div
                          class="content-type-menu more-types-menu slide-fade-up"
                          role="listbox"
                          tabindex="-1"
                          (keydown)="onTypeMenuKeyDown($event)"
                        >
                          <div class="menu-search-header">
                            <ts-icon name="search" class="menu-search-icon" />
                            <input
                              type="text"
                              class="menu-search-input"
                              placeholder="Search QR content types (e.g. WiFi, URL, SMS)..."
                              [value]="typeMenuSearch()"
                              (input)="onSearchInput($event)"
                              (keydown)="onSearchKeyDown($event)"
                              autofocus
                            />
                            @if (typeMenuSearch()) {
                              <button type="button" class="clear-search-btn" (click)="typeMenuSearch.set('')" aria-label="Clear search filter">
                                <ts-icon name="x" />
                              </button>
                            }
                          </div>
                          <div class="menu-items-list custom-scrollbar" role="listbox">
                            @for (item of filteredContentTypes(); track item.type; let idx = $index) {
                              <button
                                type="button"
                                role="option"
                                class="type-menu-item more-menu-item"
                                [class.focused]="focusedMenuIndex() === idx"
                                [class.selected]="selectedType() === item.type"
                                [attr.aria-selected]="selectedType() === item.type"
                                (click)="selectType(item.type)"
                                (mouseenter)="focusedMenuIndex.set(idx)"
                                [title]="item.label + ' (' + item.desc + ')'"
                                [attr.aria-label]="'Select ' + item.label + ' QR: ' + item.desc"
                              >
                                <div class="item-icon-wrapper" [class.active]="selectedType() === item.type">
                                  <ts-icon [name]="item.icon" class="item-icon" />
                                </div>
                                <div class="item-details">
                                  <span class="item-title">{{ item.label }}</span>
                                  <span class="item-desc">{{ item.desc }}</span>
                                </div>
                                @if (selectedType() === item.type) {
                                  <ts-icon name="check" class="item-check-icon" />
                                }
                              </button>
                            }
                            @if (filteredContentTypes().length === 0) {
                              <div class="menu-empty-state">No matching content types found</div>
                            }
                          </div>
                        </div>
                      }
                    </div>

                  </div>
                </header>

                <!-- Input Body: Always Active -->
                <div class="studio-body custom-scrollbar">
                  <div class="tab-pane">
                    <app-qr-input-panel
                      [selectedType]="selectedType()"
                      [content]="content()"
                      [validationError]="validationError()"
                      [isGenerating]="isGenerating()"
                      [qrVersion]="metadata()?.version ?? 1"
                      [capacityUsedPercent]="metadata()?.usagePercent ?? 0"
                      [hasCenterIconActive]="!!logo()"
                      (typeChange)="onTypeChange($event)"
                      (contentChange)="onContentChange($event)"
                      (openDynamicManager)="isDynamicManagerOpen.set(true)"
                      (switchTab)="onSwitchTab($event)"
                      (addSocialCenterIcon)="onAddSocialCenterIcon($event)"
                      (removeSocialCenterIcon)="onRemoveSocialCenterIcon()"
                    />
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: Customize Design Card (Exact same size, width, height as Content card) -->
            @if (activeTab() === 'design') {
              <div id="screen2Design" class="qr-studio-panel customize-panel-card qr-screen-design design-workspace-layout slide-fade-up">
                <!-- Customization Header with Design Sub-Navigation -->
                <header class="customize-header">
                  <div class="design-subnav" role="tablist" aria-label="Design Sections">
                    <button
                      type="button"
                      role="tab"
                      class="design-subtab-btn"
                      [class.active]="designSubTab() === 'frame'"
                      [attr.aria-selected]="designSubTab() === 'frame'"
                      (click)="designSubTab.set('frame')"
                    >
                      <ts-icon name="frame" class="subtab-icon" />
                      <span>Frame</span>
                      @if (hasCustomFrame()) {
                        <span class="active-dot"></span>
                      }
                    </button>
                    <button
                      type="button"
                      role="tab"
                      class="design-subtab-btn"
                      [class.active]="designSubTab() === 'shapes'"
                      [attr.aria-selected]="designSubTab() === 'shapes'"
                      (click)="designSubTab.set('shapes')"
                    >
                      <ts-icon name="grid" class="subtab-icon" />
                      <span>Shape</span>
                      @if (hasCustomShapes()) {
                        <span class="active-dot"></span>
                      }
                    </button>
                    <button
                      type="button"
                      role="tab"
                      class="design-subtab-btn"
                      [class.active]="designSubTab() === 'logo'"
                      [attr.aria-selected]="designSubTab() === 'logo'"
                      (click)="designSubTab.set('logo')"
                    >
                      <ts-icon name="image" class="subtab-icon" />
                      <span>Logo</span>
                      @if (hasCustomLogo()) {
                        <span class="active-dot"></span>
                      }
                    </button>
                    <button
                      type="button"
                      role="tab"
                      class="design-subtab-btn"
                      [class.active]="designSubTab() === 'colors'"
                      [attr.aria-selected]="designSubTab() === 'colors'"
                      (click)="designSubTab.set('colors')"
                    >
                      <ts-icon name="palette" class="subtab-icon" />
                      <span>Color</span>
                      @if (hasCustomColors()) {
                        <span class="active-dot"></span>
                      }
                    </button>
                  </div>
                </header>

                <!-- Customizer Body: Scrollable -->
                <div class="customize-body custom-scrollbar">
                  @if (designSubTab() === 'frame') {
                    <div class="design-section-content slide-fade-up">
                      <app-qr-design-customizer
                        activeSection="frame"
                        [dotType]="dotType()"
                        [cornerSquareType]="cornerSquareType()"
                        [cornerDotType]="cornerDotType()"
                        [foregroundColor]="foregroundColor()"
                        [cornerSquareColor]="cornerSquareColor()"
                        [cornerDotColor]="cornerDotColor()"
                        [logo]="logo()"
                        [logoSize]="logoSize()"
                        [logoMargin]="logoMargin()"
                        [frame]="frame()"
                        (frameChange)="onFrameChange($event)"
                      />
                    </div>
                  } @else if (designSubTab() === 'shapes') {
                    <div class="design-section-content slide-fade-up">
                      <app-qr-design-customizer
                        activeSection="shapes"
                        [artShape]="artShape()"
                        [dotType]="dotType()"
                        [cornerSquareType]="cornerSquareType()"
                        [cornerDotType]="cornerDotType()"
                        [foregroundColor]="foregroundColor()"
                        [cornerSquareColor]="cornerSquareColor()"
                        [cornerDotColor]="cornerDotColor()"
                        [logo]="logo()"
                        [logoSize]="logoSize()"
                        [logoMargin]="logoMargin()"
                        [frame]="frame()"
                        (artShapeChange)="onArtShapeChange($event)"
                        (dotTypeChange)="onDotTypeChange($event)"
                        (cornerSquareTypeChange)="onCornerSquareTypeChange($event)"
                        (cornerDotTypeChange)="onCornerDotTypeChange($event)"
                        (cornerSquareColorChange)="onCornerSquareColorChange($event)"
                        (cornerDotColorChange)="onCornerDotColorChange($event)"
                        (presetApply)="onApplyPreset($event)"
                      />
                    </div>
                  } @else if (designSubTab() === 'logo') {
                    <div class="design-section-content slide-fade-up">
                      <app-qr-design-customizer
                        activeSection="logo"
                        [dotType]="dotType()"
                        [cornerSquareType]="cornerSquareType()"
                        [cornerDotType]="cornerDotType()"
                        [foregroundColor]="foregroundColor()"
                        [cornerSquareColor]="cornerSquareColor()"
                        [cornerDotColor]="cornerDotColor()"
                        [logo]="logo()"
                        [logoSize]="logoSize()"
                        [logoMargin]="logoMargin()"
                        [frame]="frame()"
                        (logoChange)="onLogoChange($event)"
                        (logoSizeChange)="onLogoSizeChange($event)"
                        (logoMarginChange)="onLogoMarginChange($event)"
                      />
                    </div>
                  } @else if (designSubTab() === 'colors') {
                    <div class="design-section-content slide-fade-up">
                      <app-color-customizer
                        [foregroundColor]="foregroundColor()"
                        [backgroundColor]="backgroundColor()"
                        [foregroundGradient]="foregroundGradient()"
                        [backgroundGradient]="backgroundGradient()"
                        (foregroundColorChange)="onForegroundColorChange($event)"
                        (backgroundColorChange)="onBackgroundColorChange($event)"
                        (foregroundGradientChange)="onForegroundGradientChange($event)"
                        (backgroundGradientChange)="onBackgroundGradientChange($event)"
                      />
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 3: Dynamic Links Management Studio -->
            @if (activeTab() === 'dynamic') {
              <div class="qr-studio-panel qr-dynamic-panel-card slide-fade-up">
                <app-dynamic-links
                  (openInGenerator)="onOpenDynamicLinkInGenerator($event)"
                  (previewQr)="onPreviewDynamicLink($event)"
                  (downloadQr)="onDownloadDynamicQr($event)"
                  (backToContent)="onSwitchTab('content')"
                />
              </div>
            }
          </section>

          <!-- Column 2: Center Hero QR Preview & Actions (Always Fixed on Right Side) -->
          <section class="qr-col qr-col-preview qr-col-hero" aria-label="QR Code Hero Preview & Actions">
            <app-qr-preview-panel
              [qrName]="qrName()"
              [qrDataUrl]="qrDataUrl()"
              [shouldAnimateQR]="shouldAnimateQR()"
              [isGenerating]="isGenerating()"
              [error]="error()"
              [formattedPayload]="formattedPayload()"
              [encodedPayload]="activeEncodedPayload()"
              [content]="content()"
              [metadata]="metadata()"
              [size]="size()"
              [errorCorrection]="errorCorrection()"
              [margin]="margin()"
              [isAutoEc]="isAutoEc()"
              [autoEcReason]="autoEcReason()"
              [historyItems]="historyItems()"
              [dynamicCount]="dynamicService.managedItems().length"
              [isSmartLink]="smartLinkService.isSmartLink()"
              [isCreatingHostedLink]="isCreatingHostedLink()"
              [fallbackNotice]="fallbackNotice()"
              [isDevAddressWarning]="isDevAddressWarning()"
              (retryClick)="retryHostedLink()"
              (downloadClick)="onDownload($event)"
              (restoreItem)="onRestoreHistory($event)"
              (clearHistory)="onClearHistory()"
              (sizeChange)="onSizeChange($event)"
              (errorCorrectionChange)="onErrorCorrectionChange($event)"
              (marginChange)="onMarginChange($event)"
              (isAutoEcChange)="onIsAutoEcChange($event)"
              (resetDefaults)="onResetAdvancedDefaults()"
              (openDynamicLinks)="onSwitchTab('dynamic')"
              (openDynamicManager)="isDynamicManagerOpen.set(true)"
              (loadSampleClick)="loadSample()"
              (autoFixClick)="onAutoFixScan()"
            />
          </section>
        </main>

      } @else {
        <!-- ======================================================== -->
        <!-- GENERATE-FIRST MOBILE FLOW (States A, B, C)               -->
        <!-- ======================================================== -->
        <div class="mobile-flow-container">

          <!-- ============================================== -->
          <!-- STATE A: INPUT VIEW                           -->
          <!-- ============================================== -->
          @if (phoneState() === 'input') {
            <div class="mobile-input-view slide-fade-up">
              <!-- Mobile QR Name Input Bar -->
              <div class="qr-name-bar qr-name-bar-mobile">
                <span class="qr-name-badge">
                  <ts-icon name="square-pen" [size]="13" class="qr-name-badge-icon" />
                  <span>QR Name</span>
                </span>
                <input
                  type="text"
                  id="mobileQrNameInput"
                  class="qr-name-input"
                  placeholder="Name this QR code (e.g. My Website, Office Wi-Fi)..."
                  [value]="qrName()"
                  (input)="onQrNameInput($event)"
                  aria-label="Name of the QR code"
                  maxlength="60"
                />
                @if (qrName()) {
                  <button
                    type="button"
                    class="qr-name-clear-btn"
                    (click)="clearQrName()"
                    title="Clear QR name"
                    aria-label="Clear QR name"
                  >
                    <ts-icon name="x" [size]="13" />
                  </button>
                }
              </div>

              <!-- Top Row: Content Type Selector Dropdown -->
              <div class="studio-type-bar studio-type-bar-mobile">
                <div class="content-type-dropdown-container">
                  <button
                    type="button"
                    id="contentTypeTriggerMobile"
                    class="content-type-dropdown-trigger"
                    [class.open]="isTypeMenuOpen()"
                    [attr.aria-expanded]="isTypeMenuOpen()"
                    aria-haspopup="listbox"
                    (click)="toggleTypeDropdown($event)"
                    title="Select QR code content type"
                    aria-label="Select QR code content type"
                  >
                    <div class="type-trigger-left">
                      <div class="type-trigger-icon-badge">
                        <ts-icon [name]="typeConfigs[selectedType()]?.icon || 'globe'" class="type-trigger-icon" />
                      </div>
                      <div class="type-trigger-text">
                        <span class="type-trigger-label">{{ typeConfigs[selectedType()]?.label || selectedType() }}</span>
                        <span class="type-trigger-desc">{{ getSelectedTypeDesc() }}</span>
                      </div>
                    </div>
                    <div class="type-trigger-right">
                      <span class="type-trigger-badge">Type</span>
                      <ts-icon name="chevron-down" class="type-trigger-chevron" [class.rotated]="isTypeMenuOpen()" />
                    </div>
                  </button>

                  <!-- Anchored Dropdown Menu for Content Types (with instant search & icons) -->
                  @if (isTypeMenuOpen()) {
                    <div class="more-backdrop" (click)="closeTypeDropdown()"></div>
                    <div
                      class="content-type-menu more-types-menu slide-fade-up"
                      role="listbox"
                      tabindex="-1"
                      (keydown)="onTypeMenuKeyDown($event)"
                    >
                      <div class="menu-search-header">
                        <ts-icon name="search" class="menu-search-icon" />
                        <input
                          type="text"
                          class="menu-search-input"
                          placeholder="Search QR content types (e.g. WiFi, URL, SMS)..."
                          [value]="typeMenuSearch()"
                          (input)="onSearchInput($event)"
                          (keydown)="onSearchKeyDown($event)"
                          autofocus
                        />
                        @if (typeMenuSearch()) {
                          <button type="button" class="clear-search-btn" (click)="typeMenuSearch.set('')" aria-label="Clear search filter">
                            <ts-icon name="x" />
                          </button>
                        }
                      </div>
                      <div class="menu-items-list custom-scrollbar" role="listbox">
                        @for (item of filteredContentTypes(); track item.type; let idx = $index) {
                          <button
                            type="button"
                            role="option"
                            class="type-menu-item more-menu-item"
                            [class.focused]="focusedMenuIndex() === idx"
                            [class.selected]="selectedType() === item.type"
                            [attr.aria-selected]="selectedType() === item.type"
                            (click)="selectType(item.type)"
                          >
                            <div class="item-icon-wrapper">
                              <ts-icon [name]="item.icon" class="item-icon" />
                            </div>
                            <div class="item-details">
                              <span class="item-title">{{ item.label }}</span>
                              <span class="item-desc">{{ item.desc }}</span>
                            </div>
                            @if (selectedType() === item.type) {
                              <ts-icon name="check" class="item-check-icon" />
                            }
                          </button>
                        }
                        @if (filteredContentTypes().length === 0) {
                          <div class="menu-empty-state">No matching types found</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>


              <!-- Input Form Panel -->
              <div class="mobile-input-card">
                <app-qr-input-panel
                  [selectedType]="selectedType()"
                  [content]="content()"
                  [validationError]="validationError()"
                  [isGenerating]="isGenerating()"
                  [qrVersion]="metadata()?.version ?? 1"
                  [capacityUsedPercent]="metadata()?.usagePercent ?? 0"
                  [isMobileFlow]="true"
                  [hasCenterIconActive]="!!logo()"
                  (typeChange)="onTypeChange($event)"
                  (contentChange)="onContentChange($event)"
                  (openDynamicManager)="isDynamicManagerOpen.set(true)"
                  (switchTab)="onSwitchTab($event)"
                  (addSocialCenterIcon)="onAddSocialCenterIcon($event)"
                  (removeSocialCenterIcon)="onRemoveSocialCenterIcon()"
                />
              </div>

              <!-- Sticky Generate Action Bar with Quick Access Links -->
              <ts-sticky-action-bar ariaLabel="Generate QR code action bar">
                <button
                  type="button"
                  class="mobile-action-icon-btn mobile-quick-btn"
                  (click)="isMobileHistoryOpen.set(true)"
                  aria-label="Recent QR Codes History"
                  title="Recent QR History"
                >
                  <ts-icon name="history" [size]="18" />
                </button>
                <button
                  type="button"
                  class="mobile-action-icon-btn mobile-quick-btn"
                  (click)="isMobileSettingsOpen.set(true)"
                  aria-label="QR Code Settings"
                  title="Advanced QR Settings"
                >
                  <ts-icon name="settings" [size]="18" />
                </button>
                <button
                  type="button"
                  class="mobile-primary-btn mobile-generate-btn"
                  [disabled]="!content().trim() || !!validationError()"
                  (click)="goToResultState()"
                >
                  <ts-icon name="qr-code" [size]="18" />
                  <span class="mobile-generate-label-full">Generate QR Code</span>
                  <span class="mobile-generate-label-short">Generate</span>
                </button>
              </ts-sticky-action-bar>
            </div>
          }

          <!-- ============================================== -->
          <!-- STATE B: RESULT VIEW                           -->
          <!-- ============================================== -->
          @if (phoneState() === 'result') {
            <div class="mobile-result-view slide-fade-up">
              <!-- Summary Card with Edit button -->
              <div class="mobile-summary-card">
                <div class="summary-meta">
                  <div class="summary-name-row">
                    <span class="summary-qr-name">{{ qrName() || 'Untitled QR' }}</span>
                    <span class="summary-type-badge">{{ typeConfigs[selectedType()]?.label || selectedType() }}</span>
                  </div>
                  <span class="summary-text">{{ contentSummary() }}</span>
                </div>
                <button type="button" class="summary-edit-btn" (click)="goToInputState()" aria-label="Edit QR content">
                  <ts-icon name="edit" [size]="14" />
                  <span>Edit</span>
                </button>
              </div>

              <!-- Real Image QR Code Result with Assemble Animation -->
              <div class="mobile-result-stage">
                @if (qrDataUrl()) {
                  <div
                    class="mobile-qr-wrapper"
                    (click)="openFullScreen()"
                    tsLongPress
                    (longPress)="openQrContextMenu()"
                    tsDoubleTap
                    (doubleTap)="openFullScreen()"
                    (contextmenu)="onQrContextMenu($event)"
                  >
                    <app-qr-assemble-effect
                      [qrDataUrl]="qrDataUrl()"
                      [isGenerating]="isGenerating()"
                      [shouldAnimate]="shouldAnimateQR()"
                      imageClass="mobile-qr-img"
                    />
                  </div>
                  <p class="mobile-stage-hint">Tap for full screen • Long-press for options</p>
                } @else {
                  <div class="mobile-loading-placeholder">
                    <span>Generating QR code...</span>
                  </div>
                }
              </div>

              <!-- Mobile QR Quick Action Sheet -->
              <ts-bottom-sheet
                [isOpen]="isQrContextMenuOpen()"
                title="QR Code Options"
                (close)="isQrContextMenuOpen.set(false)"
              >
                <div class="qr-action-sheet-list">
                  <button type="button" class="qr-action-sheet-item" (click)="onDownload('png'); isQrContextMenuOpen.set(false)">
                    <ts-icon name="download" [size]="18" />
                    <div class="action-sheet-text">
                      <span class="action-sheet-title">Save to Photos / Files</span>
                      <span class="action-sheet-sub">High-resolution PNG</span>
                    </div>
                  </button>
                  <button type="button" class="qr-action-sheet-item" (click)="onMobileShare(); isQrContextMenuOpen.set(false)">
                    <ts-icon name="share-2" [size]="18" />
                    <div class="action-sheet-text">
                      <span class="action-sheet-title">Share via Apps...</span>
                      <span class="action-sheet-sub">AirDrop, WhatsApp, Messages</span>
                    </div>
                  </button>
                  <button type="button" class="qr-action-sheet-item" (click)="onMobileCopy(); isQrContextMenuOpen.set(false)">
                    <ts-icon name="copy" [size]="18" />
                    <div class="action-sheet-text">
                      <span class="action-sheet-title">Copy QR Image</span>
                      <span class="action-sheet-sub">Copy image to clipboard</span>
                    </div>
                  </button>
                  <button type="button" class="qr-action-sheet-item" (click)="openFullScreen(); isQrContextMenuOpen.set(false)">
                    <ts-icon name="maximize-2" [size]="18" />
                    <div class="action-sheet-text">
                      <span class="action-sheet-title">Full Screen View</span>
                      <span class="action-sheet-sub">Optimal brightness for scanning</span>
                    </div>
                  </button>
                  <button type="button" class="qr-action-sheet-item" (click)="isMobileSettingsOpen.set(true); isQrContextMenuOpen.set(false)">
                    <ts-icon name="settings" [size]="18" />
                    <div class="action-sheet-text">
                      <span class="action-sheet-title">Technical Settings</span>
                      <span class="action-sheet-sub">Error correction, size, margin, metadata</span>
                    </div>
                  </button>
                  <button type="button" class="qr-action-sheet-item" (click)="isMobileHistoryOpen.set(true); isQrContextMenuOpen.set(false)">
                    <ts-icon name="history" [size]="18" />
                    <div class="action-sheet-text">
                      <span class="action-sheet-title">Recent History ({{ historyItems().length }})</span>
                      <span class="action-sheet-sub">View and restore previous QR codes</span>
                    </div>
                  </button>
                </div>
              </ts-bottom-sheet>

              <!-- Secondary Row Actions: Customize Design | Settings | History | Full Screen -->
              <div class="mobile-secondary-actions">
                <button type="button" class="mobile-secondary-btn" (click)="goToDesignState()">
                  <ts-icon name="palette" [size]="15" />
                  <span>Customize</span>
                </button>
                <button type="button" class="mobile-secondary-btn" (click)="isMobileSettingsOpen.set(true)">
                  <ts-icon name="settings" [size]="15" />
                  <span>Settings</span>
                </button>
                <button type="button" class="mobile-secondary-btn" (click)="isMobileHistoryOpen.set(true)">
                  <ts-icon name="history" [size]="15" />
                  <span>History</span>
                  @if (historyItems().length > 0) {
                    <span class="mobile-btn-pill">{{ historyItems().length }}</span>
                  }
                </button>
                <button type="button" class="mobile-secondary-btn" (click)="openFullScreen()">
                  <ts-icon name="maximize-2" [size]="15" />
                  <span>Expand</span>
                </button>
              </div>

              <!-- Sticky Primary Actions Bar: Download, Share, Copy -->
              <ts-sticky-action-bar ariaLabel="QR Code primary actions">
                <button type="button" class="mobile-primary-btn" (click)="onDownload('png')">
                  <ts-icon name="download" [size]="18" />
                  <span>Download</span>
                </button>
                <button type="button" class="mobile-action-icon-btn" (click)="onMobileShare()" aria-label="Share QR code">
                  <ts-icon name="share-2" [size]="18" />
                </button>
                <button type="button" class="mobile-action-icon-btn" (click)="onMobileCopy()" aria-label="Copy QR image">
                  <ts-icon [name]="isPayloadCopied() ? 'check' : 'copy'" [size]="18" />
                </button>
              </ts-sticky-action-bar>

              <!-- Go to home redirect link in bottom space: returns to QR Generator studio input page -->
              <div class="mobile-home-redirect-wrap">
                <button
                  type="button"
                  class="mobile-home-redirect-link"
                  (click)="goToInputState()"
                  title="Go to QR Generator home"
                  aria-label="Go to QR Generator home"
                >
                  <ts-icon name="arrow-left" [size]="15" />
                  <span>Go to home</span>
                </button>
              </div>
            </div>
          }

          <!-- ============================================== -->
          <!-- STATE C: DESIGN VIEW                           -->
          <!-- ============================================== -->
          @if (phoneState() === 'design') {
            <div class="mobile-design-view slide-fade-up">
              <!-- Live Preview Header with Done Button -->
              <div class="mobile-design-header">
                <div class="live-mini-preview">
                  @if (qrDataUrl()) {
                    <img [src]="qrDataUrl()" alt="Live QR preview" class="live-mini-img" />
                  }
                  <span class="live-badge">Live Preview</span>
                </div>
                <button type="button" class="design-done-btn" (click)="goToResultState()">
                  <span>Done</span>
                </button>
              </div>

              <!-- Design Sub-Navigation: Frame | Shape | Logo | Color -->
              <div class="design-subnav custom-scrollbar" role="tablist" aria-label="Design Sections">
                <button
                  type="button"
                  role="tab"
                  class="design-subtab-btn"
                  [class.active]="designSubTab() === 'frame'"
                  [attr.aria-selected]="designSubTab() === 'frame'"
                  (click)="designSubTab.set('frame')"
                >
                  <ts-icon name="frame" class="subtab-icon" />
                  <span>Frame</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  class="design-subtab-btn"
                  [class.active]="designSubTab() === 'shapes'"
                  [attr.aria-selected]="designSubTab() === 'shapes'"
                  (click)="designSubTab.set('shapes')"
                >
                  <ts-icon name="grid" class="subtab-icon" />
                  <span>Shape</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  class="design-subtab-btn"
                  [class.active]="designSubTab() === 'logo'"
                  [attr.aria-selected]="designSubTab() === 'logo'"
                  (click)="designSubTab.set('logo')"
                >
                  <ts-icon name="image" class="subtab-icon" />
                  <span>Logo</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  class="design-subtab-btn"
                  [class.active]="designSubTab() === 'colors'"
                  [attr.aria-selected]="designSubTab() === 'colors'"
                  (click)="designSubTab.set('colors')"
                >
                  <ts-icon name="palette" class="subtab-icon" />
                  <span>Color</span>
                </button>
              </div>

              <!-- Sub-Tab Content -->
              <div class="mobile-design-body">
                @if (designSubTab() === 'frame') {
                  <div class="design-section-content slide-fade-up">
                    <app-qr-design-customizer
                      activeSection="frame"
                      [dotType]="dotType()"
                      [cornerSquareType]="cornerSquareType()"
                      [cornerDotType]="cornerDotType()"
                      [foregroundColor]="foregroundColor()"
                      [cornerSquareColor]="cornerSquareColor()"
                      [cornerDotColor]="cornerDotColor()"
                      [logo]="logo()"
                      [logoSize]="logoSize()"
                      [logoMargin]="logoMargin()"
                      [frame]="frame()"
                      (frameChange)="onFrameChange($event)"
                    />
                  </div>
                } @else if (designSubTab() === 'shapes') {
                  <div class="design-section-content slide-fade-up">
                    <app-qr-design-customizer
                      activeSection="shapes"
                      [artShape]="artShape()"
                      [dotType]="dotType()"
                      [cornerSquareType]="cornerSquareType()"
                      [cornerDotType]="cornerDotType()"
                      [foregroundColor]="foregroundColor()"
                      [cornerSquareColor]="cornerSquareColor()"
                      [cornerDotColor]="cornerDotColor()"
                      [logo]="logo()"
                      [logoSize]="logoSize()"
                      [logoMargin]="logoMargin()"
                      [frame]="frame()"
                      (artShapeChange)="onArtShapeChange($event)"
                      (dotTypeChange)="onDotTypeChange($event)"
                      (cornerSquareTypeChange)="onCornerSquareTypeChange($event)"
                      (cornerDotTypeChange)="onCornerDotTypeChange($event)"
                      (cornerSquareColorChange)="onCornerSquareColorChange($event)"
                      (cornerDotColorChange)="onCornerDotColorChange($event)"
                      (presetApply)="onApplyPreset($event)"
                    />
                  </div>
                } @else if (designSubTab() === 'logo') {
                  <div class="design-section-content slide-fade-up">
                    <app-qr-design-customizer
                      activeSection="logo"
                      [dotType]="dotType()"
                      [cornerSquareType]="cornerSquareType()"
                      [cornerDotType]="cornerDotType()"
                      [foregroundColor]="foregroundColor()"
                      [cornerSquareColor]="cornerSquareColor()"
                      [cornerDotColor]="cornerDotColor()"
                      [logo]="logo()"
                      [logoSize]="logoSize()"
                      [logoMargin]="logoMargin()"
                      [frame]="frame()"
                      (logoChange)="onLogoChange($event)"
                      (logoSizeChange)="onLogoSizeChange($event)"
                      (logoMarginChange)="onLogoMarginChange($event)"
                    />
                  </div>
                } @else if (designSubTab() === 'colors') {
                  <div class="design-section-content slide-fade-up">
                    <app-color-customizer
                      [foregroundColor]="foregroundColor()"
                      [backgroundColor]="backgroundColor()"
                      [foregroundGradient]="foregroundGradient()"
                      [backgroundGradient]="backgroundGradient()"
                      (foregroundColorChange)="onForegroundColorChange($event)"
                      (backgroundColorChange)="onBackgroundColorChange($event)"
                      (foregroundGradientChange)="onForegroundGradientChange($event)"
                      (backgroundGradientChange)="onBackgroundGradientChange($event)"
                    />
                  </div>
                }
              </div>
            </div>
          }

          <!-- ============================================== -->
          <!-- STATE D: DYNAMIC LINKS VIEW                     -->
          <!-- ============================================== -->
          @if (phoneState() === 'dynamic') {
            <div class="mobile-dynamic-view slide-fade-up">
              <app-dynamic-links
                (openInGenerator)="onOpenDynamicLinkInGenerator($event)"
                (previewQr)="onPreviewDynamicLink($event)"
                (downloadQr)="onDownloadDynamicQr($event)"
                (backToContent)="onSwitchTab('content')"
              />
            </div>
          }

          <!-- Mobile Recent History Bottom Sheet -->
          <ts-bottom-sheet
            [isOpen]="isMobileHistoryOpen()"
            title="Recent QR Codes"
            (close)="isMobileHistoryOpen.set(false)"
          >
            <div class="mobile-history-sheet">
              @if (historyItems().length > 0) {
                <div class="mobile-history-header-actions">
                  <span class="mobile-history-count">{{ historyItems().length }} saved code{{ historyItems().length === 1 ? '' : 's' }}</span>
                  <button type="button" class="mobile-history-clear-btn" (click)="onClearHistory()">
                    Clear all
                  </button>
                </div>
                <div class="mobile-history-list">
                  @for (item of historyItems(); track item.id) {
                    <button type="button" class="mobile-history-item" (click)="onRestoreMobileHistory(item)">
                      <div class="mobile-history-thumb">
                        <img [src]="item.dataUrl" [alt]="item.name || 'QR Code'" />
                      </div>
                      <div class="mobile-history-info">
                        <div class="mobile-history-top">
                          <span class="mobile-history-name">{{ item.name || 'Untitled QR' }}</span>
                          <span class="mobile-history-badge">{{ item.type }}</span>
                        </div>
                        <span class="mobile-history-content">{{ item.content }}</span>
                      </div>
                      <ts-icon name="chevron-right" [size]="16" class="mobile-history-arrow" />
                    </button>
                  }
                </div>
              } @else {
                <div class="mobile-history-empty">
                  <div class="mobile-history-empty-icon">
                    <ts-icon name="history" [size]="28" />
                  </div>
                  <p class="mobile-history-empty-title">No recent QR codes</p>
                  <span class="mobile-history-empty-sub">Generated QR codes will appear here automatically for fast retrieval.</span>
                </div>
              }
            </div>
          </ts-bottom-sheet>

          <!-- Mobile Technical Settings Modal -->
          <app-qr-advanced-modal
            [isOpen]="isMobileSettingsOpen()"
            [errorCorrection]="errorCorrection()"
            [isAutoEc]="isAutoEc()"
            [autoEcReason]="autoEcReason()"
            [size]="size()"
            [margin]="margin()"
            [isSmartLink]="smartLinkService.isSmartLink()"
            [metadata]="metadata()"
            [formattedPayload]="content()"
            (close)="isMobileSettingsOpen.set(false)"
            (errorCorrectionChange)="onErrorCorrectionChange($event)"
            (isAutoEcChange)="onIsAutoEcChange($event)"
            (sizeChange)="onSizeChange($event)"
            (marginChange)="onMarginChange($event)"
            (resetDefaults)="onResetAdvancedDefaults()"
            (openDynamicLinks)="onSwitchTab('dynamic')"
          />
        </div>
      }

      <!-- Full-Screen QR Modal -->
      @if (isFullScreenModalOpen() && qrDataUrl()) {
        <div class="fullscreen-qr-backdrop" (click)="closeFullScreen()" role="dialog" aria-modal="true" aria-label="Full screen QR code">
          <div class="fullscreen-qr-card" (click)="$event.stopPropagation()">
            <button type="button" class="fullscreen-close-btn" (click)="closeFullScreen()" aria-label="Close full screen view">
              <ts-icon name="x" [size]="20" />
            </button>
            <img [src]="qrDataUrl()" alt="Full Screen QR Code Preview" class="fullscreen-qr-img" />
            <p class="fullscreen-hint">Increase screen brightness for optimal scanning</p>
          </div>
        </div>
      }

      </div>

      <!-- Right Ad Gutter (>= 1280px) -->
      <aside class="ad-gutter ad-gutter-right" aria-label="Advertisement slot right">
        <div class="ad-slot-placeholder" data-ad-slot="skyscraper-right"></div>
      </aside>

      <!-- Dynamic QR Manager Drawer -->
      @if (isDynamicManagerOpen()) {
        <app-qr-dynamic-manager (close)="isDynamicManagerOpen.set(false)" />
      }

    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      width: 100%;
      height: 100%;
      min-height: 0;
      color: var(--text, #fcfcfc);
      font-family: var(--font-body, system-ui, sans-serif);
      overflow-x: hidden;
      overflow-y: auto;
    }

    /* Page Shell: Centers tool container and hosts ad placeholders */
    .qr-page-shell {
      display: flex;
      justify-content: center;
      align-items: stretch;
      width: 100%;
      min-height: 100%;
      position: relative;
      box-sizing: border-box;
      margin: 0;
    }

    /* Ad Gutters: Hidden so tool occupies full 100vw width */
    .ad-gutter {
      display: none !important;
      flex-shrink: 0;
      box-sizing: border-box;
      padding: 0;
      width: 0;
      height: 0;
      overflow: hidden;
      pointer-events: none;
    }

    /* Ad slot placeholder retains selectors for QA and future slot injection */
    .ad-slot-placeholder {
      display: none !important;
      width: 0;
      height: 0;
    }

    @media (min-width: 1280px) {
      .ad-gutter {
        display: none !important;
      }
    }

    @media (min-width: 1600px) {
      .ad-gutter {
        display: none !important;
      }
    }

    @media (max-width: 1279px) {
      .ad-gutter {
        display: none !important;
      }
    }

    /* Tool Container: Centered with balanced gutters on left and right (matching Online Clipboard standard) */
    .qr-tool-container {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      width: 100%;
      max-width: 1320px;
      margin: 0 auto;
      min-height: 100%;
      height: auto;
      box-sizing: border-box;
      padding: 18px 24px 24px 24px;
      position: relative;
      min-width: 0;
      gap: 20px;
    }

    @media (max-width: 1023px) {
      :host {
        height: 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
      .qr-page-shell {
        height: 100%;
        min-height: 100%;
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
      }
      .qr-tool-container {
        height: 100%;
        min-height: 100%;
        flex: 1 1 0%;
        padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px)) 12px;
        gap: 0;
        display: flex;
        flex-direction: column;
      }
      .mobile-flow-container {
        height: 100%;
        min-height: 100%;
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
      }
      .mobile-input-view {
        height: 100%;
        min-height: 100%;
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 8px;
        padding-bottom: 0;
        overflow: hidden;
      }
      .mobile-input-card {
        flex: 1 1 0%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        margin: 0;
        overflow-y: auto;
      }
      .mobile-input-card ::ng-deep .qr-textarea {
        min-height: 140px;
      }
      .mobile-result-view {
        height: 100%;
        min-height: 100%;
        flex: 1 1 0%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding-bottom: 0;
      }
      .mobile-result-stage {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: auto 0;
        min-height: 280px;
      }
      .mobile-qr-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }

    /* Screen 1: Primary Viewport (Content Input + Live QR Preview Only - 100vh) */
    .qr-screen-primary {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      height: calc(100vh - 132px);
      height: calc(100dvh - 132px);
      min-height: calc(100vh - 132px);
      min-height: calc(100dvh - 132px);
      max-height: calc(100vh - 132px);
      max-height: calc(100dvh - 132px);
      box-sizing: border-box;
    }

    @media (max-height: 700px) {
      .qr-screen-primary {
        min-height: 580px;
        height: auto;
        max-height: none;
      }
    }

    @media (max-width: 1023px) {
      .qr-screen-primary {
        flex-direction: column;
        min-height: auto;
        height: auto;
        max-height: none;
      }
    }

    .qr-col {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
      box-sizing: border-box;
    }

    .qr-col-input {
      flex: 1 1 0%;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .qr-col-preview {
      flex: 0 0 clamp(380px, 32vw, 500px);
      width: clamp(380px, 32vw, 500px);
      min-width: 360px;
    }

    .qr-col-hero {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
    }

    .workspace-mode-nav {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px;
      border-radius: 10px;
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      margin-bottom: 8px;
      align-self: flex-start;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .workspace-mode-nav,
    [data-theme="light"] .workspace-mode-nav {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .workspace-mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 7px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .workspace-mode-btn:hover {
      color: var(--text, #ffffff);
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .workspace-mode-btn:hover,
    [data-theme="light"] .workspace-mode-btn:hover {
      color: #0F172A;
      background: #E2E8F0;
    }

    .workspace-mode-btn.active {
      color: #0F172A;
      background: #FFFFFF;
      border-color: rgba(0, 0, 0, 0.08);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    :host-context([data-theme="dark"]) .workspace-mode-btn.active {
      color: #FFFFFF;
      background: var(--surface-1, #1E293B);
      border-color: var(--tool-accent, #38BDF8);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    .mode-btn-icon {
      width: 14px;
      height: 14px;
    }

    .customized-indicator-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10B981;
    }

    .nav-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      height: 16px;
      min-width: 16px;
      border-radius: 8px;
      font-size: 10.5px;
      font-weight: 700;
      background: color-mix(in srgb, var(--tool-accent, #38bdf8) 25%, transparent);
      color: var(--tool-accent, #0284c7);
    }

    :host-context([data-theme="dark"]) .nav-count-badge {
      color: var(--tool-accent, #38bdf8);
    }

    .qr-input-card,
    .customize-panel-card,
    .qr-dynamic-panel-card {
      flex: 1 1 0%;
      min-height: 0;
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      border-radius: 16px;
      background: var(--surface, #ffffff);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      overflow: hidden;
      box-sizing: border-box;
    }

    .qr-screen-design {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
    }

    .qr-col-customize {
      min-width: 0;
    }

    /* Fallback/compatibility */
    .qr-workspace-grid {
      display: flex;
      flex-direction: row;
      gap: 16px;
      width: 100%;
    }

    /* Studio Card */
    .qr-studio-panel {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      width: 100%;
      background: var(--surface-1, #111A2E);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      border-radius: var(--ts-radius-card, 20px);
      overflow: hidden;
      box-sizing: border-box;
    }

    /* Studio Header */
    .studio-header {
      flex-shrink: 0;
      padding: 10px 14px 8px 14px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      flex-direction: column;
      gap: 9px;
      background: var(--surface-base, #0B1120);
    }

    /* QR Name Bar */
    .qr-name-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 38px;
      padding: 0 10px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      transition: all 0.15s ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .qr-name-bar,
    [data-theme="light"] .qr-name-bar {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .qr-name-bar:focus-within {
      border-color: var(--color-primary, #3B82F6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
    }

    .qr-name-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted, #94A3B8);
      white-space: nowrap;
      user-select: none;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .qr-name-badge,
    [data-theme="light"] .qr-name-badge {
      color: #64748B;
    }

    .qr-name-badge-icon {
      color: var(--color-primary, #3B82F6);
    }

    .qr-name-input {
      flex: 1 1 0%;
      min-width: 0;
      height: 100%;
      background: transparent;
      border: none;
      outline: none;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary, #F8FAFC);
      font-family: inherit;
    }

    :host-context([data-theme="light"]) .qr-name-input,
    [data-theme="light"] .qr-name-input {
      color: #0F172A;
    }

    .qr-name-input::placeholder {
      color: var(--text-muted, #64748B);
      font-weight: 400;
      font-size: 12px;
    }

    :host-context([data-theme="light"]) .qr-name-input::placeholder,
    [data-theme="light"] .qr-name-input::placeholder {
      color: #94A3B8;
    }

    .qr-name-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: transparent;
      border: none;
      color: var(--text-muted, #94A3B8);
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
      flex-shrink: 0;
    }

    .qr-name-clear-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary, #F8FAFC);
    }

    :host-context([data-theme="light"]) .qr-name-clear-btn:hover,
    [data-theme="light"] .qr-name-clear-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    /* Mobile QR Name Bar */
    .qr-name-bar-mobile {
      height: 42px;
      margin-bottom: 10px;
      border-radius: 10px;
      padding: 0 12px;
    }

    .qr-name-bar-mobile .qr-name-input {
      font-size: 14px;
    }

    /* Mobile Summary Name Row */
    .summary-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-width: 0;
      margin-bottom: 2px;
    }

    .summary-qr-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary, #F8FAFC);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      flex-shrink: 1;
    }

    :host-context([data-theme="light"]) .summary-qr-name,
    [data-theme="light"] .summary-qr-name {
      color: #0F172A;
    }

    .studio-type-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }

    /* Centered Content Type Selector Trigger matching input width */
    .content-type-dropdown-container {
      flex: 1 1 0%;
      min-width: 0;
      position: relative;
    }

    .content-type-dropdown-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 42px;
      padding: 5px 12px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;
      outline: none;
    }

    :host-context([data-theme="light"]) .content-type-dropdown-trigger,
    [data-theme="light"] .content-type-dropdown-trigger {
      background: #FFFFFF;
      border-color: #E2E8F0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .content-type-dropdown-trigger:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    :host-context([data-theme="light"]) .content-type-dropdown-trigger:hover,
    [data-theme="light"] .content-type-dropdown-trigger:hover {
      background: #F8FAFC;
      border-color: #CBD5E1;
    }

    .content-type-dropdown-trigger.open,
    .content-type-dropdown-trigger:focus-visible {
      border-color: var(--accent, #3b82f6);
      box-shadow: 0 0 0 2px var(--accent-soft, rgba(59, 130, 246, 0.25));
    }

    .type-trigger-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .type-trigger-icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
      color: var(--accent-strong, #60a5fa);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .type-trigger-icon-badge,
    [data-theme="light"] .type-trigger-icon-badge {
      background: #EFF6FF;
      color: #2563EB;
    }

    .type-trigger-icon {
      width: 14px;
      height: 14px;
    }

    .type-trigger-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-width: 0;
      overflow: hidden;
      line-height: 1.25;
    }

    .type-trigger-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .type-trigger-label,
    [data-theme="light"] .type-trigger-label {
      color: #0f172a;
    }

    .type-trigger-desc {
      font-size: 11px;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
    }

    :host-context([data-theme="light"]) .type-trigger-desc,
    [data-theme="light"] .type-trigger-desc {
      color: #64748b;
    }

    .type-trigger-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      margin-left: 8px;
    }

    .type-trigger-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.7));
    }

    :host-context([data-theme="light"]) .type-trigger-badge,
    [data-theme="light"] .type-trigger-badge {
      background: #F1F5F9;
      color: #475569;
    }

    .type-trigger-chevron {
      width: 13px;
      height: 13px;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      transition: transform 0.18s ease;
    }

    .type-trigger-chevron.rotated {
      transform: rotate(180deg);
    }

    .content-type-menu {
      max-height: 420px;
    }

    /* Type Picker Track */
    .type-picker-track {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      flex: 1 1 0%;
      min-width: 0;
    }

    .type-picker-track::-webkit-scrollbar {
      display: none;
    }

    .quick-chip {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 5px 9px;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .quick-chip:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    .quick-chip.active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--accent-strong, #60a5fa);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.5));
      font-weight: 600;
    }

    .chip-icon {
      width: 12.5px;
      height: 12.5px;
    }

    /* More Dropdown Container */
    .more-dropdown-container {
      position: relative;
      display: inline-flex;
      flex-shrink: 0;
    }

    .more-chip {
      padding-right: 7px;
    }

    .chip-chevron {
      width: 11px;
      height: 11px;
      margin-left: 2px;
      transition: transform 0.15s ease;
      opacity: 0.7;
    }

    .chip-chevron.rotated {
      transform: rotate(180deg);
    }

    .more-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9998;
      background: transparent;
    }

    .more-types-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 100%;
      min-width: 320px;
      max-width: 480px;
      max-height: 400px;
      overflow-y: auto;
      background: var(--surface-1, #111A2E);
      border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.16));
      border-radius: 10px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      box-sizing: border-box;
      transform-origin: top left;
      animation: dropdownOpen 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    :host-context([data-theme="light"]) .more-types-menu,
    [data-theme="light"] .more-types-menu {
      background: #FFFFFF;
      border-color: var(--border-subtle, #E2E8F0);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    }

    .menu-search-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      margin-bottom: 4px;
    }

    :host-context([data-theme="light"]) .menu-search-header,
    [data-theme="light"] .menu-search-header {
      border-bottom-color: #E2E8F0;
    }

    .menu-search-icon {
      width: 14px;
      height: 14px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .menu-search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text, #FFFFFF);
      font-size: 12px;
      font-family: inherit;
    }

    :host-context([data-theme="light"]) .menu-search-input,
    [data-theme="light"] .menu-search-input {
      color: #09090B;
    }

    .clear-search-btn {
      background: transparent;
      border: none;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
    }

    .clear-search-btn ts-icon {
      width: 12px;
      height: 12px;
    }

    .step-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--surface-3, rgba(255, 255, 255, 0.12));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      font-size: 10px;
      font-weight: 700;
      margin-right: 4px;
    }

    .studio-tab-btn.active .step-badge {
      background: var(--tool-accent, var(--accent, #3b82f6));
      color: #FFFFFF;
    }

    .menu-empty-state {
      padding: 14px 8px;
      text-align: center;
      font-size: 11.5px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .menu-items-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .more-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 6px 8px;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text, #fcfcfc);
      cursor: pointer;
      text-align: left;
      transition: all 0.12s ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .more-menu-item,
    [data-theme="light"] .more-menu-item {
      color: #09090B;
    }

    .more-menu-item:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      border-color: var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .more-menu-item:hover,
    [data-theme="light"] .more-menu-item:hover {
      background: #F1F5F9;
      border-color: #E2E8F0;
    }

    .more-menu-item.selected {
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
      color: var(--accent-strong, #60a5fa);
    }

    :host-context([data-theme="light"]) .more-menu-item.selected,
    [data-theme="light"] .more-menu-item.selected {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.3);
      color: #2563EB;
    }

    .item-icon-wrapper {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .item-icon-wrapper,
    [data-theme="light"] .item-icon-wrapper {
      background: #F1F5F9;
      color: #475569;
    }

    .more-menu-item.selected .item-icon-wrapper {
      background: var(--accent, #3b82f6);
      color: #ffffff;
    }

    .item-icon {
      width: 13px;
      height: 13px;
    }

    .item-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1 1 0%;
    }

    .item-title {
      font-size: 12px;
      font-weight: 600;
      color: inherit;
      line-height: 1.25;
    }

    .item-desc {
      font-size: 10.5px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .item-desc,
    [data-theme="light"] .item-desc {
      color: #64748B;
    }

    .more-menu-item.selected .item-desc {
      color: var(--accent-strong, #60a5fa);
      opacity: 0.85;
    }

    :host-context([data-theme="light"]) .more-menu-item.selected .item-desc {
      color: #2563EB;
    }

    .item-check-icon {
      width: 14px;
      height: 14px;
      color: var(--accent-strong, #60a5fa);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .item-check-icon,
    [data-theme="light"] .item-check-icon {
      color: #2563EB;
    }

    /* Sample Button */
    .sample-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 9px;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .sample-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    .sample-btn:active {
      background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.5));
      color: var(--accent-strong, #60a5fa);
    }

    .sample-icon {
      width: 12px;
      height: 12px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    /* Examples Preset Dropdown */
    .examples-dropdown-container {
      position: relative;
      display: inline-block;
      flex-shrink: 0;
    }

    .examples-backdrop {
      position: fixed;
      inset: 0;
      z-index: 998;
    }

    .examples-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 250px;
      padding: 6px;
      border-radius: 10px;
      background: var(--bg-surface, var(--surface-1, #1e2027));
      border: 1px solid var(--border-default, rgba(255, 255, 255, 0.12));
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transform-origin: top right;
      animation: dropdownOpen 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .example-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 8px 10px;
      border-radius: 6px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: background 150ms ease;
    }

    .example-item:hover {
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
    }

    .preset-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary, #ffffff);
    }

    :host-context([data-theme="light"]) .preset-name {
      color: #0f172a;
    }

    .preset-desc {
      font-size: 10.5px;
      color: var(--text-secondary, rgba(255, 255, 255, 0.6));
    }

    :host-context([data-theme="light"]) .preset-desc {
      color: #64748b;
    }

    .example-divider {
      height: 1px;
      background: var(--border-subtle, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    /* Studio Tabs Navigation */
    .studio-tabs-nav {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      padding: 3px;
      border-radius: 9px;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .studio-tab-btn {
      flex: 1 1 0%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 7px;
      font-size: 11.5px;
      font-weight: 600;
      background: transparent;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      white-space: nowrap;
    }

    .studio-tab-btn:hover {
      color: var(--text, #fcfcfc);
      background: rgba(255, 255, 255, 0.04);
    }

    .studio-tab-btn.active {
      background: var(--surface-1, #111A2E);
      color: var(--text, #fcfcfc);
      border-color: var(--border, rgba(255, 255, 255, 0.12));
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }

    .tab-icon {
      width: 13px;
      height: 13px;
      opacity: 0.8;
    }

    .studio-tab-btn.active .tab-icon {
      color: var(--tool-accent, var(--accent, #3b82f6));
      opacity: 1;
    }

    .active-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 0 6px var(--tool-accent, #3b82f6);
      position: absolute;
      top: 5px;
      right: 6px;
    }

    /* Design Sub-Navigation */
    .design-subnav {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
      margin-bottom: 0;
      width: 100%;
    }

    .design-subtab-btn {
      flex: 1 1 0%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 550;
      background: transparent;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      position: relative;
      white-space: nowrap;
    }

    .design-subtab-btn:hover {
      color: var(--text, #fcfcfc);
      background: rgba(255, 255, 255, 0.04);
    }

    .design-subtab-btn.active {
      background: var(--surface-1, #111A2E);
      color: var(--accent-strong, #60a5fa);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.3));
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .design-subtab-btn.active,
    [data-theme="light"] .design-subtab-btn.active {
      background: #FFFFFF;
      border-color: var(--accent-border, rgba(59, 130, 246, 0.4));
      color: var(--accent, #2563EB);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .subtab-icon {
      width: 12px;
      height: 12px;
      opacity: 0.85;
    }

    .design-subtab-btn.active .subtab-icon {
      color: var(--tool-accent, var(--accent, #3b82f6));
      opacity: 1;
    }

    .design-section-content {
      width: 100%;
      flex: 1 0 auto;
      display: flex;
      flex-direction: column;
      min-height: min-content;
      height: auto;
    }

    /* Customization Header (Pinned Segmented Tab Bar) */
    .customize-header {
      flex-shrink: 0;
      padding: 10px 18px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      flex-direction: column;
      background: var(--surface-base, #0B1120);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    :host-context([data-theme="light"]) .customize-header,
    [data-theme="light"] .customize-header {
      background: #F8FAFC;
      border-bottom-color: #E2E8F0;
    }

    .title-left {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-2, rgba(255, 255, 255, 0.75));
    }

    :host-context([data-theme="light"]) .title-left,
    [data-theme="light"] .title-left {
      color: #475569;
    }

    .title-left .header-icon {
      width: 13px;
      height: 13px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .customized-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--tool-accent-soft, rgba(59, 130, 246, 0.12));
      color: var(--tool-accent, #60a5fa);
      border: 1px solid var(--tool-accent-border, rgba(59, 130, 246, 0.25));
    }

    :host-context([data-theme="light"]) .customized-indicator-pill,
    [data-theme="light"] .customized-indicator-pill {
      background: #EFF6FF;
      color: #2563EB;
      border-color: #BFDBFE;
    }

    .active-dot-static {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 0 6px var(--tool-accent, #3b82f6);
    }

    .customize-header .design-subnav {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      align-self: center;
      margin-bottom: 0;
    }

    @media (max-width: 680px) {
      .customize-header .design-subnav {
        max-width: 100%;
      }
    }

    /* Customize Body - Single Scroll Region with 32px bottom clearance */
    .customize-body {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px 20px 32px 20px;
      scroll-padding-bottom: 32px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    @media (max-width: 680px) {
      .customize-body {
        padding: 12px 14px 28px 14px;
        scroll-padding-bottom: 28px;
      }
    }

    /* Studio Body */
    .studio-body {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 14px 16px 14px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .tab-pane {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      flex: 1 1 auto;
      min-height: 100%;
    }

    .tab-pane.hidden {
      display: none !important;
    }

    .advanced-tab-pane {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .advanced-divider {
      height: 1px;
      background: var(--border, rgba(255, 255, 255, 0.08));
      margin: 2px 0;
    }

    /* Thin Custom Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border, rgba(255, 255, 255, 0.14));
      border-radius: 999px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--tool-accent, var(--accent, #3b82f6));
    }

    /* Smooth Tab Fade Transition */
    .slide-fade-up {
      animation: tabFadeIn 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes tabFadeIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes dropdownOpen {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Technical Details Collapsible Disclosure */
    .technical-details-disclosure {
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: var(--ts-radius-md, 10px);
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      overflow: hidden;
      transition: border-color 0.15s ease;
    }

    .technical-details-disclosure:hover {
      border-color: var(--border-accent, rgba(59, 130, 246, 0.3));
    }

    .technical-details-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
      list-style: none;
      background: transparent;
      transition: background 0.15s ease;
    }

    .technical-details-summary::-webkit-details-marker {
      display: none;
    }

    .technical-details-summary:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.06));
    }

    .summary-left {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .summary-icon {
      width: 14px;
      height: 14px;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .summary-title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .summary-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .summary-pill {
      font-size: 10.5px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 9999px;
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    }

    .summary-chevron {
      width: 13px;
      height: 13px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      transition: transform 0.2s ease;
    }

    .technical-details-disclosure[open] .summary-chevron {
      transform: rotate(180deg);
    }

    .technical-details-content {
      padding: 10px 12px 14px 12px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .technical-raw-payload {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .payload-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .payload-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .payload-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      font-size: 11px;
      border-radius: 5px;
      background: var(--surface-3, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .payload-copy-btn:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      border-color: var(--accent-border, rgba(59, 130, 246, 0.3));
    }

    .payload-code-block {
      margin: 0;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--surface-1, rgba(0, 0, 0, 0.3));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      font-family: var(--font-mono, JetBrains Mono, monospace);
      font-size: 11px;
      line-height: 1.45;
      color: var(--text-2, rgba(255, 255, 255, 0.85));
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 120px;
      overflow-y: auto;
    }

    .quick-chip:focus-visible,
    .sample-btn:focus-visible,
    .studio-tab-btn:focus-visible,
    .more-chip:focus-visible,
    .more-menu-item:focus-visible,
    .design-subtab-btn:focus-visible {
      outline: 2px solid var(--tool-accent, var(--accent, #3b82f6));
      outline-offset: 2px;
    }

    /* Responsive Mobile & Tablet Layout (< 1024px) */
    @media (max-width: 1023px) {
      :host {
        height: auto;
        overflow-y: auto;
      }

      .qr-tool-container {
        height: auto;
        overflow-y: auto;
        padding: 8px;
      }

      .qr-screen-primary,
      .qr-workspace-grid {
        display: flex;
        flex-direction: column;
        height: auto;
        max-height: none;
        overflow: visible;
        gap: 12px;
      }

      .qr-col-preview {
        order: -1;
        flex: none;
        width: 100%;
        min-width: 0;
      }

      .qr-studio-panel {
        height: auto;
        min-height: unset;
      }

      .studio-body,
      .customize-body {
        max-height: none;
      }

      .type-picker-track {
        overflow-x: auto;
        padding-bottom: 2px;
      }
    }

    /* ======================================================== */
    /* Mobile Flow (Generate-First: State A, B, C)               */
    /* ======================================================== */
    .mobile-flow-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      position: relative;
    }

    .mobile-input-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      overflow: hidden;
      padding-bottom: 0;
      gap: 8px;
    }

    .mobile-result-view,
    .mobile-design-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex: 1 1 0%;
      overflow-y: auto;
      padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      -webkit-overflow-scrolling: touch;
    }

    .mobile-input-card {
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 12px;
      margin-top: 0;
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .mobile-generate-btn {
      white-space: nowrap !important;
    }

    .mobile-generate-label-short {
      display: none;
    }

    @media (max-width: 374px) {
      .mobile-generate-label-full {
        display: none !important;
      }
      .mobile-generate-label-short {
        display: inline !important;
      }
    }

    .mobile-input-card .content-guided-footer {
      display: none !important;
    }

    :host-context([data-theme="light"]) .mobile-input-card,
    [data-theme="light"] .mobile-input-card {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }

    /* Sticky Bottom Action Bar */
    .mobile-sticky-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      margin-top: auto;
      padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
      background: var(--bg-canvas, var(--surface-1, #111a2e));
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 30;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
    }

    :host-context([data-theme="light"]) .mobile-sticky-bar,
    [data-theme="light"] .mobile-sticky-bar {
      background: var(--bg-surface, #ffffff);
      border-top-color: var(--border, rgba(15, 23, 42, 0.08));
      box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
    }

    .mobile-action-cluster {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mobile-primary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex: 1 1 0%;
      min-height: 48px;
      padding: 0 20px;
      border-radius: 12px;
      background: var(--tool-accent, var(--accent, #3b82f6));
      color: #ffffff;
      font-weight: 600;
      font-size: 0.95rem;
      border: none;
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.15s ease, transform 0.1s ease;
    }

    .mobile-primary-btn:active:not(:disabled) {
      transform: scale(0.98);
    }

    .mobile-primary-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .mobile-action-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .mobile-action-icon-btn:active {
      background: var(--bg-elevated, var(--surface-2, #16233d));
    }

    :host-context([data-theme="light"]) .mobile-action-icon-btn,
    [data-theme="light"] .mobile-action-icon-btn {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.12));
      color: var(--text, #09090b);
    }

    :host-context([data-theme="light"]) .mobile-action-icon-btn:active,
    [data-theme="light"] .mobile-action-icon-btn:active {
      background: var(--bg-elevated, #f1f5f9);
    }

    /* State B: Summary Card */
    .mobile-summary-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      margin-bottom: 14px;
    }

    :host-context([data-theme="light"]) .mobile-summary-card,
    [data-theme="light"] .mobile-summary-card {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .summary-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      gap: 3px;
      min-width: 0;
      flex: 1 1 0%;
      overflow: hidden;
    }

    .summary-type-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--bg-elevated, var(--surface-2, #16233d));
      color: var(--tool-accent, var(--accent, #3b82f6));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      flex-shrink: 0;
      white-space: nowrap;
    }

    :host-context([data-theme="light"]) .summary-type-badge,
    [data-theme="light"] .summary-type-badge {
      background: var(--bg-elevated, #f1f5f9);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
      color: var(--tool-accent, var(--accent, #2563eb));
    }

    .summary-text {
      font-size: 0.82rem;
      color: var(--text-muted, #a1a1aa);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
      min-width: 0;
    }

    :host-context([data-theme="light"]) .summary-text,
    [data-theme="light"] .summary-text {
      color: var(--text-muted, #52525b);
    }

    .summary-edit-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--tool-accent, var(--accent, #3b82f6));
      background: transparent;
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      cursor: pointer;
      touch-action: manipulation;
      flex-shrink: 0;
    }

    .summary-edit-btn:active {
      background: rgba(59, 130, 246, 0.1);
    }

    :host-context([data-theme="light"]) .summary-edit-btn,
    [data-theme="light"] .summary-edit-btn {
      color: var(--tool-accent, var(--accent, #2563eb));
      border-color: var(--border, rgba(15, 23, 42, 0.12));
    }

    /* State B: Result Stage */
    .mobile-result-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 16px;
      margin-bottom: 16px;
    }

    :host-context([data-theme="light"]) .mobile-result-stage,
    [data-theme="light"] .mobile-result-stage {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }

    .mobile-qr-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      touch-action: manipulation;
    }

    .mobile-qr-img {
      display: block;
      width: min(240px, 60vw);
      height: min(240px, 60vw);
      object-fit: contain;
      image-rendering: pixelated;
    }

    .mobile-stage-hint {
      margin: 14px 0 0 0;
      font-size: 0.75rem;
      color: var(--text-muted, #71717a);
      text-align: center;
    }

    .mobile-loading-placeholder {
      padding: 48px 24px;
      color: var(--text-muted, #a1a1aa);
      font-size: 0.88rem;
    }

    /* State B: Secondary actions */
    .mobile-secondary-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .mobile-secondary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      min-height: 44px;
      padding: 0 14px;
      border-radius: 10px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
    }

    .mobile-secondary-btn:active {
      background: var(--bg-elevated, var(--surface-2, #16233d));
    }

    :host-context([data-theme="light"]) .mobile-secondary-btn,
    [data-theme="light"] .mobile-secondary-btn {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.12));
      color: var(--text, #09090b);
    }

    :host-context([data-theme="light"]) .mobile-secondary-btn:active,
    [data-theme="light"] .mobile-secondary-btn:active {
      background: var(--bg-elevated, #f1f5f9);
    }

    .mobile-btn-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9999px;
      background: var(--accent, #3b82f6);
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 600;
      line-height: 1;
    }

    /* Mobile Home Redirect Link (in bottom space of result view) */
    .mobile-home-redirect-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 12px 16px 20px 16px;
      margin-top: 6px;
    }

    .mobile-home-redirect-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 18px;
      border-radius: 9999px;
      background: var(--surface-hover, rgba(15, 23, 42, 0.05));
      border: 1px solid var(--border, rgba(15, 23, 42, 0.08));
      color: var(--text-2, #52525B);
      font-size: 13.5px;
      font-weight: 600;
      font-family: inherit;
      text-decoration: none;
      cursor: pointer;
      outline: none;
      transition: all 150ms ease;
    }

    .mobile-home-redirect-link:hover {
      background: var(--surface-active, rgba(15, 23, 42, 0.08));
      color: var(--text, #09090B);
      transform: translateY(-1px);
    }

    :host-context([data-theme="light"]) .mobile-home-redirect-link,
    [data-theme="light"] .mobile-home-redirect-link {
      background: rgba(15, 23, 42, 0.04);
      border-color: rgba(15, 23, 42, 0.08);
      color: #52525B;
    }

    :host-context([data-theme="light"]) .mobile-home-redirect-link:hover,
    [data-theme="light"] .mobile-home-redirect-link:hover {
      background: rgba(15, 23, 42, 0.08);
      color: #09090B;
    }

    :host-context([data-theme="dark"]) .mobile-home-redirect-link,
    [data-theme="dark"] .mobile-home-redirect-link {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
      color: #A1A1AA;
    }

    :host-context([data-theme="dark"]) .mobile-home-redirect-link:hover,
    [data-theme="dark"] .mobile-home-redirect-link:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
    }

    /* Mobile History Sheet styles */
    .mobile-history-sheet {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 60vh;
      overflow-y: auto;
      padding: 4px 0 16px;
    }

    .mobile-history-header-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4px 8px;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    .mobile-history-count {
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
      font-weight: 500;
    }

    .mobile-history-clear-btn {
      background: transparent;
      border: none;
      color: var(--destructive, #ef4444);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .mobile-history-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-history-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      text-align: left;
      cursor: pointer;
      transition: background-color 0.15s ease;
      width: 100%;
    }

    .mobile-history-item:active {
      background: var(--bg-elevated, var(--surface-2, #16233d));
    }

    :host-context([data-theme="light"]) .mobile-history-item,
    [data-theme="light"] .mobile-history-item {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
    }

    :host-context([data-theme="light"]) .mobile-history-item:active,
    [data-theme="light"] .mobile-history-item:active {
      background: var(--bg-elevated, #f1f5f9);
    }

    .mobile-history-thumb {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border-radius: 8px;
      background: #ffffff;
      padding: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
    }

    .mobile-history-thumb img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .mobile-history-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .mobile-history-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mobile-history-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    :host-context([data-theme="light"]) .mobile-history-name,
    [data-theme="light"] .mobile-history-name {
      color: var(--text, #09090b);
    }

    .mobile-history-badge {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--bg-elevated, rgba(255, 255, 255, 0.08));
      color: var(--text-muted, #94a3b8);
      font-weight: 600;
      flex-shrink: 0;
    }

    .mobile-history-content {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mobile-history-arrow {
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .mobile-history-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 16px;
      gap: 8px;
    }

    .mobile-history-empty-icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--bg-surface, rgba(255, 255, 255, 0.05));
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 4px;
    }

    .mobile-history-empty-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text, #fcfcfc);
      margin: 0;
    }

    :host-context([data-theme="light"]) .mobile-history-empty-title,
    [data-theme="light"] .mobile-history-empty-title {
      color: var(--text, #09090b);
    }

    .mobile-history-empty-sub {
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
      max-width: 260px;
      line-height: 1.4;
    }

    /* State C: Design View */
    .mobile-design-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      margin-bottom: 12px;
    }

    :host-context([data-theme="light"]) .mobile-design-header,
    [data-theme="light"] .mobile-design-header {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    .mobile-design-body {
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 12px;
      margin-top: 10px;
    }

    :host-context([data-theme="light"]) .mobile-design-body,
    [data-theme="light"] .mobile-design-body {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, rgba(15, 23, 42, 0.08));
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }

    .live-mini-preview {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .live-mini-img {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      background: #ffffff;
      padding: 2px;
      object-fit: contain;
    }

    .live-badge {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .design-done-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 7px 16px;
      min-height: 38px;
      border-radius: 8px;
      background: var(--tool-accent, var(--accent, #3b82f6));
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      touch-action: manipulation;
    }

    .design-done-btn:active {
      opacity: 0.9;
    }

    /* Full-Screen QR Modal */
    .fullscreen-qr-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      animation: fadeIn 0.2s ease forwards;
    }

    .fullscreen-qr-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #ffffff;
      padding: 24px;
      border-radius: 20px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      max-width: 90vw;
      max-height: 90vh;
    }

    .fullscreen-close-btn {
      position: absolute;
      top: -16px;
      right: -16px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 2px solid #ffffff;
      color: var(--text, #fcfcfc);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      touch-action: manipulation;
    }

    :host-context([data-theme="light"]) .fullscreen-close-btn,
    [data-theme="light"] .fullscreen-close-btn {
      background: var(--bg-surface, #ffffff);
      border: 2px solid var(--border, #e2e8f0);
      color: var(--text, #09090b);
    }

    .fullscreen-qr-img {
      width: min(320px, 70vw);
      height: min(320px, 70vw);
      object-fit: contain;
      image-rendering: pixelated;
    }

    .fullscreen-hint {
      margin: 14px 0 0 0;
      font-size: 0.78rem;
      color: #52525b;
      font-weight: 500;
      text-align: center;
    }

    /* Mobile QR Quick Action Sheet Items */
    .qr-action-sheet-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .qr-action-sheet-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      min-height: 52px;
      border-radius: 12px;
      background: var(--bg-surface, var(--surface-1, #111a2e));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.15s ease;
      text-align: left;
      width: 100%;
      box-sizing: border-box;
    }

    .qr-action-sheet-item:active {
      background: var(--bg-elevated, var(--surface-2, #16233d));
    }

    :host-context([data-theme="light"]) .qr-action-sheet-item,
    [data-theme="light"] .qr-action-sheet-item {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, #e2e8f0);
      color: var(--text, #0f172a);
    }

    :host-context([data-theme="light"]) .qr-action-sheet-item:active,
    [data-theme="light"] .qr-action-sheet-item:active {
      background: var(--bg-elevated, #f1f5f9);
    }

    .action-sheet-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .action-sheet-title {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    :host-context([data-theme="light"]) .action-sheet-title,
    [data-theme="light"] .action-sheet-title {
      color: var(--text, #0f172a);
    }

    .action-sheet-sub {
      font-size: 0.75rem;
      color: var(--text-muted, #a1a1aa);
    }

    /* Mobile text and layout sizing standards */
    @media (max-width: 767px) {
      .qr-name-input,
      .menu-search-input,
      input,
      textarea,
      select {
        font-size: 16px !important;
      }

      h1, h2, h3, h4, .modal-title, .section-title {
        text-wrap: balance;
      }
    }

    /* Respect reduced-motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .qr-reveal-anim,
      .slide-fade-up {
        animation: none !important;
        transition: none !important;
      }
      .mobile-secondary-btn,
      .design-done-btn,
      .fullscreen-close-btn,
      .qr-action-sheet-item {
        transition: none !important;
      }
    }
  `]
})
export class QRGeneratorComponent implements OnInit, OnDestroy {
  private readonly qrService = inject(QRGeneratorService);
  private readonly historyService = inject(QRHistoryService);
  readonly dynamicService = inject(QrDynamicService);
  readonly responsive = inject(ResponsiveService);
  private readonly haptics = inject(HapticService);
  readonly smartLinkService = inject(SmartLinkService);
  readonly hubUrl = getToolsHubUrl();

  readonly isMobileFlow = computed(() => this.responsive.isPhone() || this.responsive.isTabletPortrait());
  readonly phoneState = signal<'input' | 'result' | 'design' | 'dynamic'>('input');
  readonly isFullScreenModalOpen = signal<boolean>(false);
  readonly isQrContextMenuOpen = signal<boolean>(false);
  readonly isMobileHistoryOpen = signal<boolean>(false);
  readonly isMobileSettingsOpen = signal<boolean>(false);
  private popstateListener: ((e: PopStateEvent) => void) | null = null;

  readonly contentSummary = computed(() => {
    const raw = this.content().trim();
    if (!raw) return 'No content entered';
    const type = this.selectedType();
    const label = CONTENT_TYPE_CONFIGS[type]?.label || type;
    if (raw.length > 36) {
      return `${label}: ${raw.substring(0, 33)}...`;
    }
    return `${label}: ${raw}`;
  });

  readonly isDynamicManagerOpen = signal<boolean>(false);
  readonly isCreatingHostedLink = signal<boolean>(false);
  readonly fallbackNotice = signal<string | null>(null);
  readonly isDevAddressWarning = computed<boolean>(() => {
    return this.smartLinkService.isSmartLink() && this.smartLinkService.isShortUrlLocalOrPrivate();
  });

  readonly inputPanel = viewChild(InputPanelComponent);

  // QR Name (Assignable & Renamable by User)
  readonly qrName = signal<string>('My QR Code');

  onQrNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.qrName.set(input?.value ?? '');
  }

  clearQrName(): void {
    this.qrName.set('');
  }

  // Active Studio Tab: 'content' | 'design' | 'dynamic'
  readonly activeTab = signal<'content' | 'design' | 'dynamic'>('content');
  readonly designSubTab = signal<'frame' | 'shapes' | 'logo' | 'colors'>('frame');

  // Content Type Dropdown State
  readonly isTypeMenuOpen = signal<boolean>(false);
  readonly typeMenuSearch = signal<string>('');
  readonly focusedMenuIndex = signal<number>(0);
  readonly typeMenuPosition = signal<{ top: number; left: number; width?: number } | null>(null);

  // 5 Visible Chips track for mobile flow
  readonly visibleTypes = signal<ContentType[]>(['url', 'text', 'wifi', 'vcard', 'email']);
  readonly typeConfigs = CONTENT_TYPE_CONFIGS;

  readonly allContentTypes = ALL_CONTENT_TYPES;

  readonly filteredContentTypes = computed(() => {
    const query = this.typeMenuSearch().trim().toLowerCase();
    if (!query) return ALL_CONTENT_TYPES;
    return ALL_CONTENT_TYPES.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  });

  // Backward compatibility aliases
  readonly isMoreMenuOpen = this.isTypeMenuOpen;
  readonly moreMenuSearch = this.typeMenuSearch;
  readonly moreMenuPosition = this.typeMenuPosition;
  readonly filteredMoreTypes = this.filteredContentTypes;

  readonly moreTypeOptions = computed(() => {
    const visible = new Set(this.visibleTypes());
    return ALL_CONTENT_TYPES.filter(item => !visible.has(item.type));
  });

  readonly isMoreTypeActive = computed(() => {
    const visible = new Set(this.visibleTypes());
    return !visible.has(this.selectedType());
  });

  readonly activeMoreConfig = computed(() => {
    const t = this.selectedType();
    return ALL_CONTENT_TYPES.find(o => o.type === t) ?? {
      type: 'phone' as ContentType,
      label: 'More',
      icon: 'more-horizontal',
      desc: ''
    };
  });

  // Core User State (Empty-first flow)
  readonly selectedType = signal<ContentType>('url');
  readonly content = signal<string>('');

  // Generation & Status State
  readonly isGenerating = signal<boolean>(false);
  readonly qrDataUrl = signal<string | null>(null);
  readonly shouldAnimateQR = signal<boolean>(false);
  readonly shouldAnimateQR$ = new BehaviorSubject<boolean>(false);
  private animTimer: ReturnType<typeof setTimeout> | null = null;
  readonly error = signal<string | null>(null);
  readonly validationError = signal<string | null>(null);
  readonly isPayloadCopied = signal<boolean>(false);

  // Customization & error correction settings (2048px default print quality)
  readonly size = signal<number>(2048);
  readonly foregroundColor = signal<string>('#000000');
  readonly backgroundColor = signal<string>('#FFFFFF');
  readonly foregroundGradient = signal<QrGradientOptions>(DEFAULT_GRADIENT_OPTIONS);
  readonly backgroundGradient = signal<QrGradientOptions>(DEFAULT_GRADIENT_OPTIONS);
  readonly errorCorrection = signal<ErrorCorrectionLevel>('M');
  readonly margin = signal<number>(4);
  readonly isAutoEc = signal<boolean>(true);
  readonly autoEcReason = signal<string>('Standard automatic error correction');

  // Design Customization Settings
  readonly artShape = signal<QrArtShapeOptions>(DEFAULT_ART_SHAPE_OPTIONS);
  readonly dotType = signal<QrDotType>('square');
  readonly cornerSquareType = signal<QrCornerSquareType>('square');
  readonly cornerDotType = signal<QrCornerDotType>('square');
  readonly cornerSquareColor = signal<string | null>(null);
  readonly cornerDotColor = signal<string | null>(null);
  readonly logo = signal<string | null>(null);
  readonly logoSize = signal<number>(0.24);
  readonly logoMargin = signal<number>(1);
  readonly frame = signal<QrFrameOptions>({
    ...DEFAULT_FRAME_OPTIONS,
    textColor: getDefaultCtaTextColor()
  });
  private userExplicitlySetCtaTextColor = false;
  private themeObserver: MutationObserver | null = null;
  private regenTimer: ReturnType<typeof setTimeout> | null = null;

  // History signal exposing stored items
  readonly historyItems = this.historyService.items;

  // Active Type Icon
  readonly activeTypeIcon = computed(() => {
    const cfg = CONTENT_TYPE_CONFIGS[this.selectedType()];
    return cfg ? cfg.icon : 'globe';
  });

  // Customization active indicators
  readonly hasCustomShapes = computed(() => {
    return (
      this.artShape().shape !== 'square' ||
      this.dotType() !== 'square' ||
      this.cornerSquareType() !== 'square' ||
      this.cornerDotType() !== 'square' ||
      !!this.cornerSquareColor() ||
      !!this.cornerDotColor()
    );
  });

  readonly hasCustomLogo = computed(() => !!this.logo());

  readonly hasCustomFrame = computed(() => this.frame().style !== 'none');

  readonly hasCustomColors = computed(() => {
    return (
      this.foregroundColor() !== '#000000' ||
      this.backgroundColor() !== '#FFFFFF' ||
      this.foregroundGradient().enabled ||
      this.backgroundGradient().enabled
    );
  });

  readonly hasCustomDesign = computed(() => {
    return (
      this.hasCustomColors() ||
      this.hasCustomShapes() ||
      this.hasCustomLogo() ||
      this.hasCustomFrame()
    );
  });

  // Computed live payload
  readonly formattedPayload = computed(() => {
    return this.qrService.formatPayload(this.content(), this.selectedType());
  });

  // Computed live active payload encoded into the QR matrix
  // When hosted link is active and shortUrl is assigned, QR encodes the shortUrl. Otherwise formattedPayload.
  readonly activeEncodedPayload = computed(() => {
    if (this.smartLinkService.isSmartLink() && this.smartLinkService.shortUrl()) {
      return this.smartLinkService.shortUrl()!;
    }
    return this.formattedPayload();
  });

  // Computed live metadata (version, capacity, used %, recovery)
  readonly metadata = computed(() => {
    return this.qrService.getMetadata(this.formattedPayload(), this.errorCorrection());
  });

  // Debouncing pipeline
  private readonly inputChange$ = new Subject<{ content: string; type: ContentType }>();
  private sub = new Subscription();
  private lastEncodedContent: string | null = null;
  private lastGeneratedKey: string | null = null;
  private currentRenderToken = 0;
  private hasGeneratedFirstQr = false;
  private isFullRevealNeeded = false;

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (this.qrDataUrl() && !this.isGenerating()) {
        this.onDownload('png');
      }
    }
    if (event.key === 'Escape' && this.isMoreMenuOpen()) {
      this.closeMoreMenu();
    }
  }

  getSelectedTypeDesc(): string {
    const t = this.selectedType();
    return ALL_CONTENT_TYPES.find(o => o.type === t)?.desc || 'Select content type';
  }

  toggleTypeDropdown(event?: MouseEvent): void {
    event?.stopPropagation?.();
    if (this.isTypeMenuOpen()) {
      this.closeTypeDropdown();
    } else {
      const cur = event?.currentTarget as any;
      const target = (typeof cur?.closest === 'function' ? cur.closest('.content-type-dropdown-trigger') : cur) || cur;
      const rect = typeof target?.getBoundingClientRect === 'function'
        ? target.getBoundingClientRect()
        : { bottom: 0, left: 0, width: 320, height: 40 };
      const width = Math.max(320, rect.width || 320);
      let left = rect.left || 0;
      if (typeof window !== 'undefined' && left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      this.typeMenuPosition.set({
        top: (rect.bottom || 0) + 6,
        left,
        width
      });
      this.typeMenuSearch.set('');
      this.focusedMenuIndex.set(0);
      this.isTypeMenuOpen.set(true);
    }
  }

  closeTypeDropdown(): void {
    this.isTypeMenuOpen.set(false);
    this.typeMenuPosition.set(null);
  }

  selectType(type: ContentType): void {
    this.visibleTypes.update(current => {
      if (current.includes(type)) return current;
      const next = [...current];
      next[4] = type;
      return next;
    });
    this.closeTypeDropdown();
    this.onTypeChange(type);
  }

  onTypeMenuKeyDown(event: KeyboardEvent): void {
    const list = this.filteredContentTypes();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedMenuIndex.update(i => (i + 1) % Math.max(1, list.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedMenuIndex.update(i => (i - 1 + list.length) % Math.max(1, list.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = list[this.focusedMenuIndex()];
      if (item) this.selectType(item.type);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.closeTypeDropdown();
    }
  }

  toggleMoreMenu(event: MouseEvent): void {
    this.toggleTypeDropdown(event);
  }

  closeMoreMenu(): void {
    this.closeTypeDropdown();
  }

  onMoreMenuKeyDown(event: KeyboardEvent): void {
    this.onTypeMenuKeyDown(event);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.typeMenuSearch.set(val);
    this.focusedMenuIndex.set(0);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedMenuIndex.set(0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const list = this.filteredContentTypes();
      if (list.length > 0) {
        this.selectType(list[this.focusedMenuIndex()].type);
      }
    } else if (event.key === 'Escape') {
      this.closeTypeDropdown();
    }
  }

  selectMoreType(type: ContentType): void {
    this.selectType(type);
  }

  onSwitchTab(tab: string): void {
    if (tab === 'download') {
      if (typeof document !== 'undefined') {
        const previewCol = document.querySelector('.qr-col-preview');
        previewCol?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (tab === 'design') {
      this.activeTab.set('design');
      if (typeof document !== 'undefined') {
        const designSection = document.getElementById('screen2Design') || document.querySelector('.qr-screen-design, .qr-col-customize');
        designSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (tab === 'frame' || tab === 'shapes' || tab === 'logo' || tab === 'colors') {
      this.activeTab.set('design');
      this.designSubTab.set(tab as 'frame' | 'shapes' | 'logo' | 'colors');
      if (typeof document !== 'undefined') {
        const designSection = document.getElementById('screen2Design') || document.querySelector('.qr-screen-design, .qr-col-customize');
        designSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (tab === 'content') {
      this.activeTab.set('content');
      this.phoneState.set('input');
      if (typeof document !== 'undefined') {
        const inputCol = document.getElementById('screen1Hero') || document.querySelector('.qr-col-input');
        inputCol?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (tab === 'dynamic') {
      this.activeTab.set('dynamic');
      this.phoneState.set('dynamic');
      if (typeof document !== 'undefined') {
        const inputCol = document.getElementById('screen1Hero') || document.querySelector('.qr-col-input');
        inputCol?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  onOpenDynamicLinkInGenerator(event: {
    code: string;
    type: string;
    payload?: string;
    shortUrl: string;
  }): void {
    const typeLower = (event.type || 'URL').toLowerCase();
    const matchedType = ALL_CONTENT_TYPES.find(t => t.type === typeLower)?.type || 'url';
    this.selectedType.set(matchedType);
    if (event.payload) {
      this.content.set(event.payload);
    }
    this.smartLinkService.loadLinkIntoStudio(event.code, undefined, event.shortUrl);
    this.activeTab.set('content');
    this.phoneState.set('input');
    this.triggerRegeneration();
  }

  onPreviewDynamicLink(shortUrl: string): void {
    this.smartLinkService.shortUrl.set(shortUrl);
    this.smartLinkService.mode.set('dynamic');
    if (this.isMobileFlow()) {
      this.phoneState.set('result');
    }
    this.triggerRegeneration();
  }

  onDownloadDynamicQr(link: LiveSmartLink): void {
    this.onPreviewDynamicLink(link.shortUrl);
    this.smartLinkService.markDownloaded(link.code);
    this.onDownload('png');
  }

  ngOnInit(): void {
    // Restore persistent advanced settings if available
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('acklet_qr_advanced_settings');
        if (raw) {
          const state = JSON.parse(raw);
          if (typeof state.isAutoEc === 'boolean') this.isAutoEc.set(state.isAutoEc);
          if (state.manualEc) this.errorCorrection.set(state.manualEc);
          if (typeof state.size === 'number') this.size.set(state.size);
          if (typeof state.margin === 'number') this.margin.set(state.margin);
        }
      }
    } catch { }

    // Setup adaptive debounced generator pipeline (~200ms on desktop, ~350ms on mobile/touch to preserve CPU and typing cadence)
    // Combined with distinctUntilChanged to prevent duplicate generation
    this.sub.add(
      this.inputChange$.pipe(
        debounce(() => timer(this.responsive.isPhone() || this.responsive.isTouch() ? 350 : 200)),
        distinctUntilChanged((prev, curr) => prev.content === curr.content && prev.type === curr.type)
      ).subscribe(({ content, type }) => {
        this.executeGeneration(content, type);
      })
    );

    // Initial render (empty-first flow: empty content produces null dataUrl and shows placeholder)
    this.executeGeneration(this.content(), this.selectedType());

    // Setup theme observation for CTA Text Color default (black in light mode, white in dark mode)
    if (typeof document !== 'undefined') {
      const updateThemeCtaColor = () => {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const targetColor = theme === 'dark' ? '#ffffff' : '#000000';
        const oppositeColor = theme === 'dark' ? '#000000' : '#ffffff';
        const currentFrame = this.frame();
        if (!this.userExplicitlySetCtaTextColor || currentFrame.textColor === oppositeColor) {
          if (currentFrame.textColor !== targetColor) {
            this.frame.set({
              ...currentFrame,
              textColor: targetColor
            });
            this.triggerRegeneration();
          }
        }
      };

      updateThemeCtaColor();

      if (typeof MutationObserver !== 'undefined') {
        this.themeObserver = new MutationObserver(() => {
          updateThemeCtaColor();
        });
        this.themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme']
        });
      }

      const handleTabSwitch = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail === 'dynamic') {
          this.onSwitchTab('dynamic');
        } else if (detail === 'tool') {
          if (this.phoneState() === 'dynamic') {
            this.onSwitchTab('content');
          }
        }
      };
      window.addEventListener('acklet:switch-tab', handleTabSwitch);
      this.sub.add({
        unsubscribe: () => window.removeEventListener('acklet:switch-tab', handleTabSwitch)
      });
    }

    // Reactively regenerate QR code when dynamic short URL is returned from backend
    this.sub.add(
      this.smartLinkService.onShortUrlReady$.subscribe((shortUrl) => {
        if (this.smartLinkService.isSmartLink()) {
          this.isCreatingHostedLink.set(false);
          this.fallbackNotice.set(null);
          if (this.lastEncodedContent !== shortUrl) {
            this.executeGeneration(this.content(), this.selectedType(), true);
          }
        }
      })
    );

    this.sub.add(
      this.smartLinkService.onSyncError$.subscribe(errMessage => {
        this.isCreatingHostedLink.set(false);
        this.isGenerating.set(false);
        const currentContent = this.content().trim();
        if (currentContent.length <= 1500 && currentContent.length > 0) {
          this.fallbackNotice.set('Hosted link unavailable. Generated offline static QR code.');
          this.renderStaticFallbackQR(currentContent, this.selectedType());
        } else {
          this.qrDataUrl.set(null);
          this.fallbackNotice.set(null);
          this.error.set(
            errMessage || 'Unable to create hosted link. Server is unreachable. Please verify your connection.'
          );
        }
      })
    );

    // Browser Back button integration for mobile states
    if (typeof window !== 'undefined') {
      const onPopState = () => {
        if (this.isFullScreenModalOpen()) {
          this.isFullScreenModalOpen.set(false);
          return;
        }
        if (this.phoneState() === 'design') {
          this.phoneState.set('result');
          return;
        }
        if (this.phoneState() === 'result') {
          this.phoneState.set('input');
          return;
        }
      };
      window.addEventListener('popstate', onPopState);
      this.popstateListener = onPopState;
    }
  }

  ngOnDestroy(): void {
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }
    if (this.regenTimer) {
      clearTimeout(this.regenTimer);
      this.regenTimer = null;
    }
    if (this.animTimer) {
      clearTimeout(this.animTimer);
      this.animTimer = null;
    }
    if (this.popstateListener && typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.popstateListener);
    }
    this.sub.unsubscribe();
  }

  goToResultState(): void {
    if (!this.content().trim() || this.validationError()) {
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState({ qrScreenState: 'result' }, '');
    }
    this.phoneState.set('result');
  }

  goToDesignState(): void {
    if (typeof window !== 'undefined') {
      window.history.pushState({ qrScreenState: 'design' }, '');
    }
    this.phoneState.set('design');
  }

  goToInputState(): void {
    this.phoneState.set('input');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openFullScreen(): void {
    this.haptics.trigger('light');
    if (typeof window !== 'undefined') {
      window.history.pushState({ qrScreenState: 'fullscreen' }, '');
    }
    this.isFullScreenModalOpen.set(true);
  }

  closeFullScreen(): void {
    this.isFullScreenModalOpen.set(false);
  }

  openQrContextMenu(): void {
    this.haptics.trigger('medium');
    this.isQrContextMenuOpen.set(true);
  }

  onQrContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.openQrContextMenu();
  }

  async onMobileShare(): Promise<void> {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl) return;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const blob = await this.qrService.svgToPngBlob(dataUrl, 2);
        const file = new File([blob], `qr-${this.selectedType()}-${Date.now()}.png`, { type: 'image/png' });

        const canShareFiles = typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
        if (canShareFiles) {
          await navigator.share({
            files: [file]
          });
          this.haptics.trigger('success');
          return;
        }
      } catch (err: any) {
        if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          return;
        }
        console.warn('[QRGenerator] Native share error, falling back to PNG download:', err);
      }
    }

    // Fallback: download PNG image with proper color, frame, and QR
    await this.onDownload('png');
  }

  async onMobileCopy(): Promise<void> {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const blob = await this.qrService.svgToPngBlob(dataUrl, 2);
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        this.haptics.trigger('success');
        this.isPayloadCopied.set(true);
        setTimeout(() => this.isPayloadCopied.set(false), 2000);
        return;
      } catch (err) {
        console.warn('[QRGenerator] Failed to copy PNG image to clipboard:', err);
      }
    }

    // If browser doesn't support writing image blob to clipboard, trigger PNG download instead of copying raw code
    await this.onDownload('png');
  }

  onTypeChange(type: ContentType): void {
    this.selectedType.set(type);
    this.isFullRevealNeeded = true;
    const existing = this.inputPanel()?.getPayloadForType(type) || '';
    this.content.set(existing);
    this.inputChange$.next({ content: existing, type });
  }

  onTypeSelectChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as ContentType;
    this.onTypeChange(val);
  }

  loadSample(): void {
    const sample = this.inputPanel()?.loadExampleForType(this.selectedType()) ?? (CONTENT_TYPE_CONFIGS[this.selectedType()]?.example ?? '');
    if (sample) {
      this.isFullRevealNeeded = true;
      this.content.set(sample);
      this.executeGeneration(sample, this.selectedType());
    }
  }

  onAddSocialCenterIcon(event: { iconId: string; platformName: string }): void {
    const dataUrl = getSocialPlatformSvgDataUrl(event.iconId);
    if (dataUrl) {
      this.logo.set(dataUrl);
      this.logoSize.set(0.24);
      this.logoMargin.set(2);
      const currentEc = this.errorCorrection();
      if (currentEc === 'L' || currentEc === 'M') {
        this.errorCorrection.set('Q');
      }
      this.triggerRegeneration();
    }
  }

  onRemoveSocialCenterIcon(): void {
    this.logo.set(null);
    this.triggerRegeneration();
  }

  applyPreset(presetId: 'circle-badge' | 'heart-art' | 'default'): void {
    this.isFullRevealNeeded = true;
    if (presetId === 'circle-badge') {
      this.selectedType.set('url');
      this.content.set('https://acklet.dev');
      this.artShape.set({
        shape: 'circle',
        mode: 'badge',
        strength: 'safe',
        fadeEdges: true
      });
      this.dotType.set('rounded');
      this.cornerSquareType.set('extra-rounded');
      this.cornerDotType.set('dot');
      this.errorCorrection.set('Q');
    } else if (presetId === 'heart-art') {
      this.selectedType.set('url');
      this.content.set('https://acklet.dev/love');
      this.artShape.set({
        shape: 'heart',
        mode: 'around',
        strength: 'safe',
        fadeEdges: true,
        brandTint: '#e11d48'
      });
      this.dotType.set('heart');
      this.cornerSquareType.set('extra-rounded');
      this.cornerDotType.set('heart');
      this.foregroundColor.set('#e11d48');
      this.errorCorrection.set('H');
    } else {
      this.loadSample();
      return;
    }

    this.executeGeneration(this.content(), this.selectedType());
  }

  onAutoFixScan(): void {
    // 1. Optimize Error Correction Level based on payload size
    // Lower EC produces larger modules that smartphone cameras can resolve instantly
    this.isAutoEc.set(false);
    const len = (this.content() || '').length;
    if (len > 500) {
      this.errorCorrection.set('L');
    } else {
      this.errorCorrection.set('M');
    }

    // 2. Reset artistic shape options to standard squares
    this.artShape.set(DEFAULT_ART_SHAPE_OPTIONS);

    // 3. Reset module and finder shapes to high-scannability standard squares
    this.dotType.set('square');
    this.cornerSquareType.set('square');
    this.cornerDotType.set('square');

    // 4. Guarantee maximum 21:1 high contrast between foreground and background
    this.foregroundColor.set('#000000');
    this.backgroundColor.set('#FFFFFF');
    this.cornerSquareColor.set(null);
    this.cornerDotColor.set(null);

    // Disable gradients if they reduce contrast
    if (this.foregroundGradient().enabled) {
      this.foregroundGradient.set({ ...this.foregroundGradient(), enabled: false });
    }
    if (this.backgroundGradient().enabled) {
      this.backgroundGradient.set({ ...this.backgroundGradient(), enabled: false });
    }

    // 5. Ensure adequate quiet zone (margin) for finder detection
    if (this.margin() < 2) {
      this.margin.set(2);
    }

    // 6. Reduce logo scale if oversize
    if (this.logo() && (this.logoSize() > 0.20)) {
      this.logoSize.set(0.18);
    }

    // 7. Ensure resolution is at least 320px for crisp decoding
    if (this.size() < 320) {
      this.size.set(320);
    }

    this.triggerRegeneration();
  }

  onContentChange(newContent: string): void {
    this.content.set(newContent);
    this.inputChange$.next({ content: newContent, type: this.selectedType() });
  }

  onForegroundColorChange(color: string): void {
    this.foregroundColor.set(color);
    this.triggerRegeneration();
  }

  onBackgroundColorChange(color: string): void {
    this.backgroundColor.set(color);
    this.triggerRegeneration();
  }

  onForegroundGradientChange(grad: QrGradientOptions): void {
    this.foregroundGradient.set(grad);
    this.triggerRegeneration();
  }

  onBackgroundGradientChange(grad: QrGradientOptions): void {
    this.backgroundGradient.set(grad);
    this.triggerRegeneration();
  }

  onSizeChange(size: number): void {
    this.size.set(size);
    this.triggerRegeneration();
  }

  onErrorCorrectionChange(ec: ErrorCorrectionLevel): void {
    this.isAutoEc.set(false);
    this.errorCorrection.set(ec);
    this.triggerRegeneration();
  }

  onMarginChange(margin: number): void {
    this.margin.set(margin);
    this.triggerRegeneration();
  }

  onIsAutoEcChange(isAuto: boolean): void {
    this.isAutoEc.set(isAuto);
    this.triggerRegeneration();
  }

  onResetAdvancedDefaults(): void {
    this.isAutoEc.set(true);
    this.margin.set(4);
    this.size.set(2048);
    this.triggerRegeneration();
  }

  onDotTypeChange(val: QrDotType): void {
    this.dotType.set(val);
    this.triggerRegeneration();
  }

  onCornerSquareTypeChange(val: QrCornerSquareType): void {
    this.cornerSquareType.set(val);
    this.triggerRegeneration();
  }

  onCornerDotTypeChange(val: QrCornerDotType): void {
    this.cornerDotType.set(val);
    this.triggerRegeneration();
  }

  onCornerSquareColorChange(val: string | null): void {
    this.cornerSquareColor.set(val);
    this.triggerRegeneration();
  }

  onCornerDotColorChange(val: string | null): void {
    this.cornerDotColor.set(val);
    this.triggerRegeneration();
  }

  onLogoChange(val: string | null): void {
    this.logo.set(val);
    if (val) {
      this.errorCorrection.set('H');
    }
    this.triggerRegeneration();
  }

  onLogoSizeChange(val: number): void {
    this.logoSize.set(val);
    this.triggerRegeneration();
  }

  onLogoMarginChange(val: number): void {
    this.logoMargin.set(val);
    this.triggerRegeneration();
  }

  onFrameChange(val: QrFrameOptions): void {
    if (val.textColor !== this.frame().textColor) {
      this.userExplicitlySetCtaTextColor = true;
    }
    this.frame.set(val);
    this.triggerRegeneration();
  }

  onApplyPreset(preset: DesignPreset): void {
    this.dotType.set(preset.dotType);
    this.cornerSquareType.set(preset.cornerSquareType);
    this.cornerDotType.set(preset.cornerDotType);
    this.foregroundColor.set(preset.foregroundColor);
    this.backgroundColor.set(preset.backgroundColor);
    this.foregroundGradient.set(DEFAULT_GRADIENT_OPTIONS);
    this.backgroundGradient.set(DEFAULT_GRADIENT_OPTIONS);
    this.cornerSquareColor.set(preset.cornerSquareColor ?? null);
    this.cornerDotColor.set(preset.cornerDotColor ?? null);
    this.triggerRegeneration();
  }

  onArtShapeChange(val: QrArtShapeOptions): void {
    this.artShape.set(val);
    this.triggerRegeneration();
  }

  onRestoreHistory(item: QRHistoryItem): void {
    this.isFullRevealNeeded = true;
    if (item.name) {
      this.qrName.set(item.name);
    }
    this.selectedType.set(item.type);
    this.content.set(item.content);
    this.inputPanel()?.restorePayload(item.type, item.content);

    if (item.options) {
      if (item.options.artShape) this.artShape.set(item.options.artShape);
      if (item.options.size) this.size.set(item.options.size);
      if (item.options.foregroundColor) this.foregroundColor.set(item.options.foregroundColor);
      if (item.options.backgroundColor) this.backgroundColor.set(item.options.backgroundColor);
      if (item.options.foregroundGradient) this.foregroundGradient.set(item.options.foregroundGradient);
      if (item.options.backgroundGradient) this.backgroundGradient.set(item.options.backgroundGradient);
      if (item.options.errorCorrection) this.errorCorrection.set(item.options.errorCorrection);
      if (item.options.dotType) this.dotType.set(item.options.dotType);
      if (item.options.cornerSquareType) this.cornerSquareType.set(item.options.cornerSquareType);
      if (item.options.cornerDotType) this.cornerDotType.set(item.options.cornerDotType);
      this.cornerSquareColor.set(item.options.cornerSquareColor ?? null);
      this.cornerDotColor.set(item.options.cornerDotColor ?? null);
      this.logo.set(item.options.logo ?? null);
      if (item.options.logoSize) this.logoSize.set(item.options.logoSize);
      if (item.options.logoMargin !== undefined) this.logoMargin.set(item.options.logoMargin);
      if (item.options.frame) this.frame.set(item.options.frame);
    }

    this.triggerRegeneration();
  }

  onClearHistory(): void {
    this.historyService.clearHistory();
  }

  onRestoreMobileHistory(item: QRHistoryItem): void {
    this.onRestoreHistory(item);
    this.isMobileHistoryOpen.set(false);
    this.goToResultState();
  }

  async onDownload(format: ExportFormat = 'png'): Promise<void> {
    try {
      const rawName = this.qrName().trim();
      const sanitizedName = rawName
        ? rawName.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
        : undefined;
      await this.qrService.download(format, sanitizedName);
      if (this.smartLinkService.isSmartLink()) {
        this.smartLinkService.markDownloaded();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed.';
      this.error.set(msg);
    }
  }

  async copyRawPayload(): Promise<void> {
    const payload = this.formattedPayload();
    if (!payload || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(payload);
      this.isPayloadCopied.set(true);
      setTimeout(() => this.isPayloadCopied.set(false), 2000);
    } catch { }
  }

  private triggerRegeneration(): void {
    if (this.regenTimer) {
      clearTimeout(this.regenTimer);
    }
    this.regenTimer = setTimeout(() => {
      this.executeGeneration(this.content(), this.selectedType(), true);
    }, 50);
  }

  private async executeGeneration(rawContent: string, type: ContentType, skipSync: boolean = false): Promise<void> {
    const trimmed = rawContent.trim();
    console.log(`[QR-DIAGNOSTIC] [${new Date().toISOString()}] generateQR() called: content="${trimmed.slice(0, 30)}..."`);

    if (!trimmed) {
      this.qrDataUrl.set(null);
      this.validationError.set(null);
      this.error.set(null);
      this.isGenerating.set(false);
      this.isCreatingHostedLink.set(false);
      this.shouldAnimateQR.set(false);
      this.shouldAnimateQR$.next(false);
      this.smartLinkService.resetActiveSession();
      this.hasGeneratedFirstQr = false;
      return;
    }

    // Validate
    const activePlatform = type === 'social' ? this.inputPanel()?.socialData?.platform : undefined;
    const validation = this.qrService.validateContent(trimmed, type, activePlatform);
    if (!validation.isValid) {
      this.validationError.set(validation.error ?? 'Invalid input format.');
      // Keep existing QR on screen during later edits; only clear if no QR has ever been rendered
      if (!this.hasGeneratedFirstQr) {
        this.qrDataUrl.set(null);
      }
      this.isGenerating.set(false);
      this.isCreatingHostedLink.set(false);
      this.shouldAnimateQR.set(false);
      this.shouldAnimateQR$.next(false);
      return;
    }

    this.validationError.set(null);
    this.error.set(null);
    this.isGenerating.set(true);

    let contentToEncode = type === 'text' ? normalizeLineEndings(rawContent) : trimmed;
    let encodeType: ContentType = type;

    // Render token to cancel stale renders
    const renderToken = ++this.currentRenderToken;

    // Hosted / Smart Link flow: only after debounce and when valid
    const mode = this.smartLinkService.decideMode(type, contentToEncode, this.smartLinkService.mode());
    this.smartLinkService.mode.set(mode);
    const isDynamic = mode === 'dynamic';

    if (isDynamic) {
      const currentShortUrl = this.smartLinkService.shortUrl();
      const isAlreadySynced = this.smartLinkService.activeCode() &&
        this.lastEncodedContent === (currentShortUrl || contentToEncode);

      if (currentShortUrl && (skipSync || isAlreadySynced)) {
        this.isCreatingHostedLink.set(false);
        contentToEncode = currentShortUrl;
        encodeType = 'url';
      } else {
        this.isCreatingHostedLink.set(true);
        if (!skipSync) {
          this.smartLinkService.syncPayload(type, contentToEncode);
        }
        if (!currentShortUrl) {
          if (!this.hasGeneratedFirstQr) {
            this.qrDataUrl.set(null);
          }
          this.isGenerating.set(false);
          if (this.smartLinkService.error()) {
            this.isCreatingHostedLink.set(false);
            this.error.set(this.smartLinkService.error());
          }
          return;
        } else {
          contentToEncode = currentShortUrl;
          encodeType = 'url';
        }
      }
    } else {
      this.isCreatingHostedLink.set(false);
      this.fallbackNotice.set(null);
    }

    // Deterministic auto error correction
    const autoEc = calculateAutoErrorCorrection({
      content: contentToEncode,
      type: encodeType,
      hasLogo: !!this.logo(),
      hasCenterFrame: this.hasCustomFrame(),
      hasCustomShapes: this.hasCustomShapes(),
      isDynamic
    });
    this.autoEcReason.set(autoEc.reason || 'Standard automatic error correction');
    if (this.isAutoEc()) {
      this.errorCorrection.set(autoEc.level);
    }

    const options: Partial<QROptions> = {
      type: encodeType,
      size: this.size(),
      margin: this.margin(),
      foregroundColor: this.foregroundColor(),
      backgroundColor: this.backgroundColor(),
      foregroundGradient: this.foregroundGradient(),
      backgroundGradient: this.backgroundGradient(),
      errorCorrection: this.errorCorrection(),
      dotType: this.dotType(),
      cornerSquareType: this.cornerSquareType(),
      cornerDotType: this.cornerDotType(),
      cornerSquareColor: this.cornerSquareColor() || undefined,
      cornerDotColor: this.cornerDotColor() || undefined,
      logo: this.logo() || undefined,
      logoSize: this.logoSize(),
      logoMargin: this.logoMargin(),
      frame: this.frame(),
      artShape: this.artShape()
    };

    // Deduplication check: prevent redundant execution or duplicate animation if identical output is already rendered
    const genKey = `${encodeType}::${contentToEncode}::${options.size}::${options.margin}::${options.foregroundColor}::${options.backgroundColor}::${options.errorCorrection}::${options.dotType}::${options.cornerSquareType}::${options.cornerDotType}::${options.cornerSquareColor}::${options.cornerDotColor}::${options.logo}::${options.logoSize}::${options.logoMargin}::${JSON.stringify(options.frame)}::${JSON.stringify(options.foregroundGradient)}::${JSON.stringify(options.backgroundGradient)}::${JSON.stringify(options.artShape)}`;

    if (this.lastGeneratedKey === genKey && this.qrDataUrl() && !this.isFullRevealNeeded) {
      this.isGenerating.set(false);
      this.isCreatingHostedLink.set(false);
      return;
    }

    try {
      // 1. Generate QR code off-screen
      const result = await this.qrService.generate(contentToEncode, options);

      // Cancel if a newer generation was triggered
      if (renderToken !== this.currentRenderToken) {
        return;
      }

      this.lastGeneratedKey = genKey;
      this.lastEncodedContent = contentToEncode;

      // Determine if full reveal animation should run:
      // ONLY on first successful generation (empty -> first QR), or type switch, or example load
      const isFirstGen = !this.hasGeneratedFirstQr;
      const shouldRunFullReveal = isFirstGen || this.isFullRevealNeeded;
      this.isFullRevealNeeded = false;
      this.hasGeneratedFirstQr = true;

      if (shouldRunFullReveal) {
        console.log('Animation START');
        console.log(`[QR-DIAGNOSTIC] [${new Date().toISOString()}] QR animation started (shouldAnimateQR = true)`);
        this.shouldAnimateQR.set(true);
        this.shouldAnimateQR$.next(true);
      } else {
        this.shouldAnimateQR.set(false);
        this.shouldAnimateQR$.next(false);
      }

      // 3. Update qrDataUrl (triggers atomic swap / crossfade)
      console.log('State updated');
      this.qrDataUrl.set(result);
      console.log(`[QR-DIAGNOSTIC] [${new Date().toISOString()}] QR state updated (qrDataUrl set, length=${result.length})`);

      if (shouldRunFullReveal) {
        if (this.animTimer) clearTimeout(this.animTimer);
        this.animTimer = setTimeout(() => {
          this.shouldAnimateQR.set(false);
          this.shouldAnimateQR$.next(false);
          console.log('Animation END');
          console.log(`[QR-DIAGNOSTIC] [${new Date().toISOString()}] QR animation completed (shouldAnimateQR = false)`);
        }, 500);
      }

      // Record to history
      this.historyService.addItem({
        name: this.qrName().trim() || undefined,
        type,
        content: trimmed,
        formattedPayload: (encodeType === 'url' && type === 'text') ? contentToEncode : this.formattedPayload(),
        dataUrl: result,
        options
      });
    } catch (err: unknown) {
      if (renderToken !== this.currentRenderToken) return;
      const message = err instanceof Error ? err.message : 'Failed to generate QR code.';
      this.error.set(message);
      if (!this.hasGeneratedFirstQr) {
        this.qrDataUrl.set(null);
      }
    } finally {
      if (renderToken === this.currentRenderToken) {
        this.isGenerating.set(false);
        this.isCreatingHostedLink.set(false);
      }
    }
  }

  retryHostedLink(): void {
    this.error.set(null);
    this.fallbackNotice.set(null);
    this.isCreatingHostedLink.set(true);
    this.smartLinkService.syncPayload(this.selectedType(), this.content());
  }

  private async renderStaticFallbackQR(rawContent: string, type: ContentType): Promise<void> {
    const trimmed = rawContent.trim();
    if (!trimmed) return;
    this.isGenerating.set(true);
    const contentToEncode = type === 'text' ? normalizeLineEndings(rawContent) : trimmed;
    try {
      const options: Partial<QROptions> = {
        type,
        size: this.size(),
        margin: this.margin(),
        foregroundColor: this.foregroundColor(),
        backgroundColor: this.backgroundColor(),
        errorCorrection: this.errorCorrection()
      };
      const result = await this.qrService.generate(contentToEncode, options);
      this.qrDataUrl.set(result);
      this.historyService.addItem({
        name: this.qrName().trim() || undefined,
        type,
        content: trimmed,
        formattedPayload: contentToEncode,
        dataUrl: result,
        options
      });
    } catch {
      this.qrDataUrl.set(null);
      this.error.set('Failed to generate static QR code.');
    } finally {
      this.isGenerating.set(false);
    }
  }
}

