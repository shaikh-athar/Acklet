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
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';

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
  QrGradientOptions,
  DEFAULT_GRADIENT_OPTIONS,
  QrArtShapeOptions,
  DEFAULT_ART_SHAPE_OPTIONS,
  QrBrandOptions,
  DEFAULT_BRAND_OPTIONS
} from './models/qr-generator.models';
import { QRGeneratorService } from './services/qr-generator.service';
import { QRHistoryService } from './services/qr-history.service';
import { QrDynamicService } from './services/qr-dynamic.service';
import { calculateAutoErrorCorrection } from './utils/qr-auto-ec.util';
import { InputPanelComponent } from './components/input-panel/input-panel.component';
import { ColorCustomizerComponent } from './components/color-customizer/color-customizer.component';
import { DesignCustomizerComponent } from './components/design-customizer/design-customizer.component';
import { BrandCustomizerComponent } from './components/brand-customizer/brand-customizer.component';
import { getSocialPlatformSvgDataUrl } from './utils/social-platforms.data';
import { PreviewPanelComponent } from './components/preview-panel/preview-panel.component';
import { QrDynamicManagerComponent } from './components/dynamic-manager/dynamic-manager.component';
import { QrBatchGeneratorComponent } from './components/batch-generator/batch-generator.component';
import {
  TsIconComponent,
  ResponsiveService,
  BottomSheetComponent,
  StickyActionBarComponent,
  TsLongPressDirective,
  TsDoubleTapDirective,
  HapticService
} from '@acklet/tool-shell';

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
    BrandCustomizerComponent,
    PreviewPanelComponent,
    QrDynamicManagerComponent,
    QrBatchGeneratorComponent,
    TsIconComponent,
    BottomSheetComponent,
    StickyActionBarComponent,
    TsLongPressDirective,
    TsDoubleTapDirective
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-tool-container" data-accent="blue">
      @if (!isMobileFlow()) {
        <!-- 2-Column Responsive Workspace Grid (fits 100dvh without page scroll) -->
        <main class="qr-workspace-grid">
          <!-- Left Column: Studio Panel (~55%) -->
          <section class="qr-col qr-col-studio" aria-label="QR Code Studio & Settings">
            <div class="qr-studio-panel">
              <!-- Studio Header: Content Type Selector + 5 Quick Chips + Sample Button + Studio Tabs -->
              <header class="studio-header">
                <!-- Top Row: Content Type Selector (5 Dynamic Chips + More Dropdown) & Sample Button -->
                <div class="studio-type-bar">
                  <div class="type-picker-track">
                    <!-- 5 Visible Quick Chips -->
                    @for (type of visibleTypes(); track type) {
                      <button
                        type="button"
                        class="quick-chip"
                        [class.active]="selectedType() === type"
                        (click)="onTypeChange(type)"
                        [title]="typeConfigs[type]?.label || type"
                        [attr.aria-label]="'Select ' + (typeConfigs[type]?.label || type) + ' QR code'"
                      >
                        <ts-icon [name]="typeConfigs[type]?.icon || 'globe'" class="chip-icon" />
                        <span>{{ typeConfigs[type]?.label || type }}</span>
                      </button>
                    }

                    <!-- More... Custom Dropdown Button & Popup Trigger -->
                    <div class="more-dropdown-container">
                      <button
                        type="button"
                        class="quick-chip more-chip"
                        [class.active]="isMoreTypeActive()"
                        [attr.aria-expanded]="isMoreMenuOpen()"
                        aria-haspopup="menu"
                        (click)="toggleMoreMenu($event)"
                        title="More QR content types"
                        aria-label="More QR content types"
                      >
                        <ts-icon [name]="isMoreTypeActive() ? activeMoreConfig().icon : 'more-horizontal'" class="chip-icon" />
                        <span>More...</span>
                        <ts-icon name="chevron-down" class="chip-chevron" [class.rotated]="isMoreMenuOpen()" />
                      </button>
                    </div>
                  </div>

                  <!-- Examples / Preset Dropdown Button -->
                  <div class="examples-dropdown-container">
                    <button
                      type="button"
                      class="sample-btn"
                      (click)="isExamplesMenuOpen.set(!isExamplesMenuOpen())"
                      title="Choose a ready-made QR Art preset or sample"
                      aria-label="Choose a ready-made QR Art preset or sample"
                      aria-haspopup="true"
                      [attr.aria-expanded]="isExamplesMenuOpen()"
                    >
                      <ts-icon name="sparkles" class="sample-icon" />
                      <span>Examples</span>
                      <ts-icon name="chevron-down" class="chip-chevron" [class.rotated]="isExamplesMenuOpen()" />
                    </button>

                    @if (isExamplesMenuOpen()) {
                      <div class="examples-backdrop" (click)="isExamplesMenuOpen.set(false)"></div>
                      <div class="examples-menu slide-fade-up" role="menu">
                        <button type="button" class="example-item" (click)="applyPreset('circle-badge')">
                          <span class="preset-name">Circle Badge</span>
                          <span class="preset-desc">Modern circular container & rounded dots</span>
                        </button>
                        <button type="button" class="example-item" (click)="applyPreset('heart-art')">
                          <span class="preset-name">Heart Silhouette</span>
                          <span class="preset-desc">Decorative perimeter art with safe quiet zone</span>
                        </button>
                        <button type="button" class="example-item" (click)="applyPreset('brand-acklet')">
                          <span class="preset-name">Brand Name "Acklet"</span>
                          <span class="preset-desc">Vector brand banner with Outfit font</span>
                        </button>
                        <div class="example-divider"></div>
                        <button type="button" class="example-item" (click)="applyPreset('default')">
                          <span class="preset-name">Standard Sample</span>
                          <span class="preset-desc">Load clean example for selected type</span>
                        </button>
                      </div>
                    }
                  </div>
                </div>

                <!-- Fixed Overlay Dropdown Menu for More Types (Immune to scroll track clipping) -->
                @if (isMoreMenuOpen() && moreMenuPosition(); as pos) {
                  <div class="more-backdrop" (click)="closeMoreMenu()"></div>
                  <div
                    class="more-types-menu slide-fade-up"
                    role="menu"
                    [style.top.px]="pos.top"
                    [style.left.px]="pos.left"
                    tabindex="-1"
                    (keydown)="onMoreMenuKeyDown($event)"
                  >
                    <div class="menu-search-header">
                      <ts-icon name="search" class="menu-search-icon" />
                      <input
                        type="text"
                        class="menu-search-input"
                        placeholder="Filter content types..."
                        [value]="moreMenuSearch()"
                        (input)="onSearchInput($event)"
                        (keydown)="onSearchKeyDown($event)"
                      />
                      @if (moreMenuSearch()) {
                        <button type="button" class="clear-search-btn" (click)="moreMenuSearch.set('')" aria-label="Clear search filter">
                          <ts-icon name="x" />
                        </button>
                      }
                    </div>
                    <div class="menu-items-list" role="menu">
                      @for (item of filteredMoreTypes(); track item.type; let idx = $index) {
                        <button
                          type="button"
                          role="menuitem"
                          class="more-menu-item"
                          [class.focused]="focusedMenuIndex() === idx"
                          [class.selected]="selectedType() === item.type"
                          (click)="selectMoreType(item.type)"
                          (mouseenter)="focusedMenuIndex.set(idx)"
                          [title]="item.label + ' (' + item.desc + ')'"
                          [attr.aria-label]="'Select ' + item.label + ' QR: ' + item.desc"
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
                      @if (filteredMoreTypes().length === 0) {
                        <div class="menu-empty-state">No matching types found</div>
                      }
                    </div>
                  </div>
                }

                <!-- Studio Tabs: 1 Content | 2 Design -->
                <nav class="studio-tabs-nav" role="tablist" aria-label="Studio Configuration Tabs">
                  <button
                    type="button"
                    role="tab"
                    class="studio-tab-btn"
                    [class.active]="activeTab() === 'content'"
                    [attr.aria-selected]="activeTab() === 'content'"
                    (click)="activeTab.set('content')"
                    title="Step 1: Content input"
                    aria-label="Step 1 Content input"
                  >
                    <span class="step-badge">1</span>
                    <ts-icon name="file-text" class="tab-icon" />
                    <span>Content</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class="studio-tab-btn"
                    [class.active]="activeTab() === 'design'"
                    [attr.aria-selected]="activeTab() === 'design'"
                    (click)="activeTab.set('design')"
                    title="Step 2: Design & styling"
                    aria-label="Step 2 Design & styling"
                  >
                    <span class="step-badge">2</span>
                    <ts-icon name="palette" class="tab-icon" />
                    <span>Design</span>
                    @if (hasCustomDesign()) {
                      <span class="active-dot"></span>
                    }
                  </button>
                </nav>
              </header>

              <!-- Studio Body: Scrollable Tab Content -->
              <div class="studio-body custom-scrollbar">
                <div class="tab-pane slide-fade-up" [class.hidden]="activeTab() !== 'content'">
                  <app-qr-input-panel
                    [selectedType]="selectedType()"
                    [content]="content()"
                    [validationError]="validationError()"
                    [isGenerating]="isGenerating()"
                    [qrVersion]="metadata()?.version ?? 1"
                    [capacityUsedPercent]="metadata()?.usagePercent ?? 0"
                    (typeChange)="onTypeChange($event)"
                    (contentChange)="onContentChange($event)"
                    (openDynamicManager)="isDynamicManagerOpen.set(true)"
                    (switchTab)="onSwitchTab($event)"
                    (addSocialCenterIcon)="onAddSocialCenterIcon($event)"
                  />
                </div>

                @if (activeTab() === 'design') {
                  <div class="tab-pane slide-fade-up">
                    <!-- Design Sub-Navigation: Frame | Shape | Logo | Color -->
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
                      <button
                        type="button"
                        role="tab"
                        class="design-subtab-btn"
                        [class.active]="designSubTab() === 'brand'"
                        [attr.aria-selected]="designSubTab() === 'brand'"
                        (click)="designSubTab.set('brand')"
                      >
                        <ts-icon name="target" class="subtab-icon" />
                        <span>Brand</span>
                        @if (hasCustomBrand()) {
                          <span class="active-dot"></span>
                        }
                      </button>
                    </div>

                    <!-- Sub-Tab Content -->
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
                    } @else if (designSubTab() === 'brand') {
                      <div class="design-section-content slide-fade-up">
                        <app-qr-brand-customizer
                          [brand]="brand()"
                          [logo]="logo()"
                          (brandChange)="onBrandChange($event)"
                          (logoChange)="onLogoChange($event)"
                        />
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </section>

          <!-- Right Column: Live Preview & Action Bar (~45%) -->
          <section class="qr-col qr-col-preview" aria-label="QR Code Preview & Actions">
            <app-qr-preview-panel
              [qrDataUrl]="qrDataUrl()"
              [isGenerating]="isGenerating()"
              [error]="error()"
              [formattedPayload]="formattedPayload()"
              [content]="content()"
              [metadata]="metadata()"
              [size]="size()"
              [errorCorrection]="errorCorrection()"
              [historyItems]="historyItems()"
              [dynamicCount]="dynamicService.managedItems().length"
              (downloadClick)="onDownload($event)"
              (restoreItem)="onRestoreHistory($event)"
              (clearHistory)="onClearHistory()"
              (sizeChange)="onSizeChange($event)"
              (errorCorrectionChange)="onErrorCorrectionChange($event)"
              (openDynamicManager)="isDynamicManagerOpen.set(true)"
              (openBatchGenerator)="isBatchModalOpen.set(true)"
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
              <!-- Top Row: Content Type Selector (5 Dynamic Chips + More Dropdown) & Sample Button -->
              <div class="studio-type-bar">
                <div class="type-picker-track custom-scrollbar">
                  @for (type of visibleTypes(); track type) {
                    <button
                      type="button"
                      class="quick-chip"
                      [class.active]="selectedType() === type"
                      (click)="onTypeChange(type)"
                      [title]="typeConfigs[type]?.label || type"
                      [attr.aria-label]="'Select ' + (typeConfigs[type]?.label || type) + ' QR code'"
                    >
                      <ts-icon [name]="typeConfigs[type]?.icon || 'globe'" class="chip-icon" />
                      <span>{{ typeConfigs[type]?.label || type }}</span>
                    </button>
                  }

                  <!-- More... Custom Dropdown Button & Popup Trigger -->
                  <div class="more-dropdown-container">
                    <button
                      type="button"
                      class="quick-chip more-chip"
                      [class.active]="isMoreTypeActive()"
                      (click)="toggleMoreMenu($event)"
                      title="More QR content types"
                      aria-label="More QR content types"
                    >
                      <ts-icon [name]="isMoreTypeActive() ? activeMoreConfig().icon : 'more-horizontal'" class="chip-icon" />
                      <span>More...</span>
                      <ts-icon name="chevron-down" class="chip-chevron" [class.rotated]="isMoreMenuOpen()" />
                    </button>
                  </div>
                </div>

                <!-- Examples Chip -->
                <div class="examples-dropdown-container">
                  <button
                    type="button"
                    class="sample-btn"
                    (click)="isExamplesMenuOpen.set(!isExamplesMenuOpen())"
                    title="Choose an example"
                    aria-label="Choose an example"
                  >
                    <ts-icon name="sparkles" class="sample-icon" />
                    <span>Examples</span>
                  </button>
                </div>
              </div>

              <!-- More Types Bottom Sheet on Mobile -->
              <ts-bottom-sheet
                [isOpen]="isMoreMenuOpen()"
                title="More QR Content Types"
                (close)="closeMoreMenu()"
              >
                <div class="menu-search-header">
                  <ts-icon name="search" class="menu-search-icon" />
                  <input
                    type="text"
                    class="menu-search-input"
                    placeholder="Filter content types..."
                    [value]="moreMenuSearch()"
                    (input)="onSearchInput($event)"
                  />
                </div>
                <div class="menu-items-list" role="menu">
                  @for (item of filteredMoreTypes(); track item.type; let idx = $index) {
                    <button
                      type="button"
                      role="menuitem"
                      class="more-menu-item"
                      [class.selected]="selectedType() === item.type"
                      (click)="selectMoreType(item.type)"
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
                  @if (filteredMoreTypes().length === 0) {
                    <div class="menu-empty-state">No matching types found</div>
                  }
                </div>
              </ts-bottom-sheet>

              <!-- Examples Bottom Sheet on Mobile -->
              <ts-bottom-sheet
                [isOpen]="isExamplesMenuOpen()"
                title="QR Code Examples & Presets"
                (close)="isExamplesMenuOpen.set(false)"
              >
                <div class="examples-menu" role="menu">
                  <button type="button" class="example-item" (click)="applyPreset('circle-badge')">
                    <span class="preset-name">Circle Badge</span>
                    <span class="preset-desc">Modern circular container & rounded dots</span>
                  </button>
                  <button type="button" class="example-item" (click)="applyPreset('heart-art')">
                    <span class="preset-name">Heart Silhouette</span>
                    <span class="preset-desc">Decorative perimeter art</span>
                  </button>
                  <button type="button" class="example-item" (click)="applyPreset('brand-acklet')">
                    <span class="preset-name">Brand Name "Acklet"</span>
                    <span class="preset-desc">Vector brand banner</span>
                  </button>
                  <div class="example-divider"></div>
                  <button type="button" class="example-item" (click)="applyPreset('default')">
                    <span class="preset-name">Standard Sample</span>
                    <span class="preset-desc">Load clean example for selected type</span>
                  </button>
                </div>
              </ts-bottom-sheet>

              <!-- Input Form Panel -->
              <div class="mobile-input-card">
                <app-qr-input-panel
                  [selectedType]="selectedType()"
                  [content]="content()"
                  [validationError]="validationError()"
                  [isGenerating]="isGenerating()"
                  [qrVersion]="metadata()?.version ?? 1"
                  [capacityUsedPercent]="metadata()?.usagePercent ?? 0"
                  (typeChange)="onTypeChange($event)"
                  (contentChange)="onContentChange($event)"
                  (openDynamicManager)="isDynamicManagerOpen.set(true)"
                  (switchTab)="onSwitchTab($event)"
                  (addSocialCenterIcon)="onAddSocialCenterIcon($event)"
                />
              </div>

              <!-- Sticky Generate Action Bar -->
              <ts-sticky-action-bar ariaLabel="Generate QR code action bar">
                <button
                  type="button"
                  class="mobile-primary-btn mobile-generate-btn"
                  [disabled]="!content().trim() || !!validationError()"
                  (click)="goToResultState()"
                >
                  <ts-icon name="qr-code" [size]="18" />
                  <span>Generate QR Code</span>
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
                  <span class="summary-type-badge">{{ typeConfigs[selectedType()]?.label || selectedType() }}</span>
                  <span class="summary-text">{{ contentSummary() }}</span>
                </div>
                <button type="button" class="summary-edit-btn" (click)="goToInputState()" aria-label="Edit QR content">
                  <ts-icon name="edit-2" [size]="14" />
                  <span>Edit</span>
                </button>
              </div>

              <!-- Real Image QR Code Result with Reveal Animation -->
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
                    <img
                      [src]="qrDataUrl()"
                      alt="Generated QR Code"
                      class="mobile-qr-img qr-reveal-anim"
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
                </div>
              </ts-bottom-sheet>

              <!-- Secondary Row Actions: Customize Design | Full Screen -->
              <div class="mobile-secondary-actions">
                <button type="button" class="mobile-secondary-btn" (click)="goToDesignState()">
                  <ts-icon name="palette" [size]="16" />
                  <span>Customize Design</span>
                </button>
                <button type="button" class="mobile-secondary-btn" (click)="openFullScreen()">
                  <ts-icon name="maximize-2" [size]="16" />
                  <span>Full Screen</span>
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

              <!-- Design Sub-Navigation: Frame | Shape | Logo | Color | Brand -->
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
                <button
                  type="button"
                  role="tab"
                  class="design-subtab-btn"
                  [class.active]="designSubTab() === 'brand'"
                  [attr.aria-selected]="designSubTab() === 'brand'"
                  (click)="designSubTab.set('brand')"
                >
                  <ts-icon name="target" class="subtab-icon" />
                  <span>Brand</span>
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
                } @else if (designSubTab() === 'brand') {
                  <div class="design-section-content slide-fade-up">
                    <app-qr-brand-customizer
                      [brand]="brand()"
                      [logo]="logo()"
                      (brandChange)="onBrandChange($event)"
                      (logoChange)="onLogoChange($event)"
                    />
                  </div>
                }
              </div>
            </div>
          }
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

      <!-- Dynamic QR Manager Drawer -->
      @if (isDynamicManagerOpen()) {
        <app-qr-dynamic-manager (close)="isDynamicManagerOpen.set(false)" />
      }

      <!-- Batch QR Generator Modal -->
      @if (isBatchModalOpen()) {
        <app-qr-batch-generator (close)="isBatchModalOpen.set(false)" />
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
      box-sizing: border-box;
      color: var(--text, #fcfcfc);
      font-family: var(--font-body, system-ui, sans-serif);
    }

    .qr-tool-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-height: 0;
      max-height: 100%;
      overflow: hidden;
      box-sizing: border-box;
      padding: 10px 14px 12px 14px;
    }

    /* 2-Column Responsive Workspace Grid */
    .qr-workspace-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
      gap: 12px;
      flex: 1 1 0%;
      min-height: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }

    .qr-col {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      box-sizing: border-box;
    }

    .qr-col-studio {
      flex: 1 1 0%;
    }

    .qr-col-preview {
      flex: 1 1 0%;
    }

    /* Studio Card */
    .qr-studio-panel {
      display: flex;
      flex-direction: column;
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

    .studio-type-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
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
      position: fixed;
      width: 280px;
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
      margin-bottom: 16px;
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
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      min-height: min-content;
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
      animation: tabFadeIn 0.15s ease-out;
    }

    @keyframes tabFadeIn {
      from {
        opacity: 0;
        transform: translateY(3px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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

      .qr-workspace-grid {
        display: flex;
        flex-direction: column;
        height: auto;
        overflow: visible;
        gap: 12px;
      }

      .qr-col-preview {
        order: -1;
        flex: none;
      }

      .qr-studio-panel {
        height: auto;
        min-height: unset;
      }

      .studio-body {
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

    .mobile-input-view,
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
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 14px;
      padding: 12px;
      margin-top: 8px;
    }

    /* Sticky Bottom Action Bar */
    .mobile-sticky-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      margin-top: auto;
      padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
      background: var(--bg-canvas, #121214);
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 30;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
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
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      color: var(--text, #fcfcfc);
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.15s ease, border-color 0.15s ease;
    }

    .mobile-action-icon-btn:active {
      background: var(--bg-elevated, #282830);
    }

    /* State B: Summary Card */
    .mobile-summary-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      margin-bottom: 16px;
    }

    .summary-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1 1 0%;
    }

    .summary-type-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--bg-elevated, #282830);
      color: var(--tool-accent, var(--accent, #3b82f6));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
      flex-shrink: 0;
    }

    .summary-text {
      font-size: 0.85rem;
      color: var(--text-muted, #a1a1aa);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

    /* State B: Result Stage */
    .mobile-result-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 16px;
      margin-bottom: 16px;
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

    .qr-reveal-anim {
      animation: qrReveal 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes qrReveal {
      0% {
        opacity: 0;
        transform: scale(0.92);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
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
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      color: var(--text, #fcfcfc);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      touch-action: manipulation;
    }

    .mobile-secondary-btn:active {
      background: var(--bg-elevated, #282830);
    }

    /* State C: Design View */
    .mobile-design-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: var(--bg-surface, #1e1e24);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      margin-bottom: 12px;
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
      background: var(--bg-surface, #1e1e24);
      border: 2px solid #ffffff;
      color: var(--text, #fcfcfc);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      touch-action: manipulation;
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
      background: var(--bg-surface, #1e1e24);
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
      background: var(--bg-elevated, #282830);
    }

    :host-context([data-theme="light"]) .qr-action-sheet-item,
    [data-theme="light"] .qr-action-sheet-item {
      background: var(--bg-surface, #ffffff);
      border-color: var(--border, #e2e8f0);
      color: var(--text, #0f172a);
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

    /* Mobile Performance: Disable GPU-heavy blur on phone */
    @media (max-width: 640px) {
      .fullscreen-qr-backdrop {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        background: rgba(0, 0, 0, 0.92) !important;
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

  readonly isMobileFlow = computed(() => this.responsive.isPhone() || this.responsive.isTabletPortrait());
  readonly phoneState = signal<'input' | 'result' | 'design'>('input');
  readonly isFullScreenModalOpen = signal<boolean>(false);
  readonly isQrContextMenuOpen = signal<boolean>(false);
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
  readonly isBatchModalOpen = signal<boolean>(false);

  readonly inputPanel = viewChild(InputPanelComponent);

  // Active Studio Tab: 'content' | 'design'
  readonly activeTab = signal<'content' | 'design'>('content');
  readonly designSubTab = signal<'frame' | 'shapes' | 'logo' | 'colors' | 'brand'>('frame');
  readonly isMoreMenuOpen = signal<boolean>(false);
  readonly isExamplesMenuOpen = signal<boolean>(false);

  // 5 Visible Chips track
  readonly visibleTypes = signal<ContentType[]>(['url', 'text', 'wifi', 'vcard', 'email']);
  readonly typeConfigs = CONTENT_TYPE_CONFIGS;

  readonly moreTypeOptions = computed(() => {
    const visible = new Set(this.visibleTypes());
    return ALL_CONTENT_TYPES.filter(item => !visible.has(item.type));
  });

  readonly moreMenuSearch = signal<string>('');
  readonly focusedMenuIndex = signal<number>(0);
  readonly moreMenuPosition = signal<{ top: number; left: number } | null>(null);

  readonly filteredMoreTypes = computed(() => {
    const query = this.moreMenuSearch().trim().toLowerCase();
    const list = this.moreTypeOptions();
    if (!query) return list;
    return list.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.desc.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
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

  // Design Customization Settings
  readonly artShape = signal<QrArtShapeOptions>(DEFAULT_ART_SHAPE_OPTIONS);
  readonly brand = signal<QrBrandOptions>(DEFAULT_BRAND_OPTIONS);
  readonly dotType = signal<QrDotType>('square');
  readonly cornerSquareType = signal<QrCornerSquareType>('square');
  readonly cornerDotType = signal<QrCornerDotType>('square');
  readonly cornerSquareColor = signal<string | null>(null);
  readonly cornerDotColor = signal<string | null>(null);
  readonly logo = signal<string | null>(null);
  readonly logoSize = signal<number>(0.35);
  readonly logoMargin = signal<number>(4);
  readonly frame = signal<QrFrameOptions>(DEFAULT_FRAME_OPTIONS);

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

  readonly hasCustomBrand = computed(() => this.brand().enabled);

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
      this.hasCustomFrame() ||
      this.hasCustomBrand()
    );
  });

  // Computed live payload
  readonly formattedPayload = computed(() => {
    return this.qrService.formatPayload(this.content(), this.selectedType());
  });

  // Computed live metadata (version, capacity, used %, recovery)
  readonly metadata = computed(() => {
    return this.qrService.getMetadata(this.formattedPayload(), this.errorCorrection());
  });

  // Debouncing pipeline
  private readonly inputChange$ = new Subject<{ content: string; type: ContentType }>();
  private sub = new Subscription();

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

  toggleMoreMenu(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isMoreMenuOpen()) {
      this.closeMoreMenu();
    } else {
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const menuWidth = 280;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - menuWidth - 12);
      }
      this.moreMenuPosition.set({
        top: rect.bottom + 6,
        left
      });
      this.moreMenuSearch.set('');
      this.focusedMenuIndex.set(0);
      this.isMoreMenuOpen.set(true);
    }
  }

  closeMoreMenu(): void {
    this.isMoreMenuOpen.set(false);
    this.moreMenuPosition.set(null);
  }

  onMoreMenuKeyDown(event: KeyboardEvent): void {
    const list = this.filteredMoreTypes();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedMenuIndex.update(i => (i + 1) % Math.max(1, list.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusedMenuIndex.update(i => (i - 1 + list.length) % Math.max(1, list.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = list[this.focusedMenuIndex()];
      if (item) this.selectMoreType(item.type);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      this.closeMoreMenu();
    }
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.moreMenuSearch.set(val);
    this.focusedMenuIndex.set(0);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusedMenuIndex.set(0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const list = this.filteredMoreTypes();
      if (list.length > 0) {
        this.selectMoreType(list[this.focusedMenuIndex()].type);
      }
    } else if (event.key === 'Escape') {
      this.closeMoreMenu();
    }
  }

  selectMoreType(type: ContentType): void {
    // Replace 5th visible chip (index 4) with selected type
    this.visibleTypes.update(current => {
      const next = [...current];
      next[4] = type;
      return next;
    });
    this.closeMoreMenu();
    this.onTypeChange(type);
  }

  onSwitchTab(tab: string): void {
    if (tab === 'download') {
      if (typeof document !== 'undefined') {
        const previewCol = document.querySelector('.qr-col-preview');
        previewCol?.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (tab === 'design') {
      this.activeTab.set('design');
    } else if (tab === 'frame' || tab === 'shapes' || tab === 'logo' || tab === 'colors') {
      this.activeTab.set('design');
      this.designSubTab.set(tab as 'frame' | 'shapes' | 'logo' | 'colors');
    } else if (tab === 'content') {
      this.activeTab.set('content');
    }
  }

  ngOnInit(): void {
    // Setup adaptive debounced generator pipeline (~200ms on desktop, ~350ms on mobile/touch to preserve CPU and typing cadence)
    this.sub.add(
      this.inputChange$.pipe(
        debounce(() => timer(this.responsive.isPhone() || this.responsive.isTouch() ? 350 : 200))
      ).subscribe(({ content, type }) => {
        this.executeGeneration(content, type);
      })
    );

    // Initial render (empty-first flow: empty content produces null dataUrl and shows placeholder)
    this.executeGeneration(this.content(), this.selectedType());

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

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `qr-${this.selectedType()}-${Date.now()}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${CONTENT_TYPE_CONFIGS[this.selectedType()]?.label || 'QR'} Code`,
            text: this.content()
          });
          this.haptics.trigger('success');
          return;
        }
        await navigator.share({
          title: `${CONTENT_TYPE_CONFIGS[this.selectedType()]?.label || 'QR'} Code`,
          text: this.content(),
          url: window.location.href
        });
        this.haptics.trigger('success');
      } catch (err: any) {
        // User cancelled native share sheet or closed it without sharing
        if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          return;
        }
        await this.onDownload('png');
      }
    } else {
      await this.onDownload('png');
    }
  }

  async onMobileCopy(): Promise<void> {
    const dataUrl = this.qrDataUrl();
    if (!dataUrl) return;

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        this.haptics.trigger('success');
        this.isPayloadCopied.set(true);
        setTimeout(() => this.isPayloadCopied.set(false), 2000);
      } catch (_) {
        await this.copyRawPayload();
      }
    } else {
      await this.copyRawPayload();
    }
  }

  onTypeChange(type: ContentType): void {
    this.selectedType.set(type);
    const existing = this.inputPanel()?.getPayloadForType(type) || '';
    this.content.set(existing);
    this.executeGeneration(existing, type);
  }

  onTypeSelectChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as ContentType;
    this.onTypeChange(val);
  }

  loadSample(): void {
    const sample = this.inputPanel()?.loadExampleForType(this.selectedType()) ?? (CONTENT_TYPE_CONFIGS[this.selectedType()]?.example ?? '');
    if (sample) {
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

  applyPreset(presetId: 'circle-badge' | 'heart-art' | 'brand-acklet' | 'default'): void {
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
      this.brand.set(DEFAULT_BRAND_OPTIONS);
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
      this.brand.set(DEFAULT_BRAND_OPTIONS);
    } else if (presetId === 'brand-acklet') {
      this.selectedType.set('url');
      this.content.set('https://acklet.dev');
      this.brand.set({
        enabled: true,
        type: 'name',
        mode: 'name',
        text: 'Acklet',
        font: 'Outfit',
        color: '#0284c7',
        placement: 'banner'
      });
      this.foregroundColor.set('#0f172a');
      this.dotType.set('classy-rounded');
      this.cornerSquareType.set('extra-rounded');
      this.cornerDotType.set('dot');
      this.errorCorrection.set('H');
      this.artShape.set(DEFAULT_ART_SHAPE_OPTIONS);
    } else {
      this.loadSample();
      this.isExamplesMenuOpen.set(false);
      return;
    }

    this.isExamplesMenuOpen.set(false);
    this.executeGeneration(this.content(), this.selectedType());
  }

  onAutoFixScan(): void {
    // 1. Elevate Error Correction Level to 'H'
    this.errorCorrection.set('H');

    // 2. Scale shape strength to balanced/safe if set to bold
    const art = this.artShape();
    if (art.strength === 'bold') {
      this.artShape.set({ ...art, strength: 'balanced' });
    }

    // 3. Guarantee high contrast between foreground and background
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

    // 4. Reduce logo scale if oversize
    if (this.logo() && (this.logoSize() > 0.28)) {
      this.logoSize.set(0.24);
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
    this.errorCorrection.set(ec);
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

  onBrandChange(val: QrBrandOptions): void {
    this.brand.set(val);
    this.triggerRegeneration();
  }

  onRestoreHistory(item: QRHistoryItem): void {
    this.selectedType.set(item.type);
    this.content.set(item.content);
    this.inputPanel()?.restorePayload(item.type, item.content);

    if (item.options) {
      if (item.options.artShape) this.artShape.set(item.options.artShape);
      if (item.options.brand) this.brand.set(item.options.brand);
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

  async onDownload(format: ExportFormat = 'png'): Promise<void> {
    try {
      await this.qrService.download(format);
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
    } catch {}
  }

  private triggerRegeneration(): void {
    this.inputChange$.next({
      content: this.content(),
      type: this.selectedType()
    });
  }

  private async executeGeneration(rawContent: string, type: ContentType): Promise<void> {
    const trimmed = rawContent.trim();

    if (!trimmed) {
      this.qrDataUrl.set(null);
      this.validationError.set(null);
      this.error.set(null);
      this.isGenerating.set(false);
      return;
    }

    // Validate
    const validation = this.qrService.validateContent(trimmed, type);
    if (!validation.isValid) {
      this.validationError.set(validation.error ?? 'Invalid input format.');
      this.qrDataUrl.set(null);
      this.isGenerating.set(false);
      return;
    }

    this.validationError.set(null);
    this.error.set(null);
    this.isGenerating.set(true);

    // Deterministic auto error correction
    const autoEc = calculateAutoErrorCorrection({
      content: trimmed,
      type,
      hasLogo: !!this.logo(),
      hasCenterFrame: this.hasCustomFrame(),
      hasCustomShapes: this.hasCustomShapes()
    });
    this.errorCorrection.set(autoEc.level);

    try {
      const options: Partial<QROptions> = {
        type,
        size: this.size(),
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
        artShape: this.artShape(),
        brand: this.brand()
      };

      const result = await this.qrService.generate(trimmed, options);
      this.qrDataUrl.set(result);

      // Record to history
      this.historyService.addItem({
        type,
        content: trimmed,
        formattedPayload: this.formattedPayload(),
        dataUrl: result,
        options
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate QR code.';
      this.error.set(message);
      this.qrDataUrl.set(null);
    } finally {
      this.isGenerating.set(false);
    }
  }
}

