// client/apps/tool-qr-generator/src/components/dynamic-manager/dynamic-manager.component.ts
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  output,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import { QrDynamicService } from '../../services/qr-dynamic.service';
import {
  ManagedDynamicQrItem,
  QrScanAnalytics,
  DynamicQrCode,
  DynamicPdfContent,
  DynamicMenuContent,
  DynamicCouponContent,
  DynamicVCardContent,
  DynamicMultiUrlContent
} from '../../models/qr-generator.models';

@Component({
  selector: 'app-qr-dynamic-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dynamic-manager-overlay" (click)="onBackdropClick($event)">
      <aside class="dynamic-manager-drawer" role="dialog" aria-label="Dynamic QR Codes Manager">
        <header class="drawer-header">
          <div class="header-left">
            <ts-icon name="activity" class="drawer-icon" />
            <div>
              <h2 class="drawer-title">Dynamic QR Codes</h2>
              <p class="drawer-subtitle">Edit destination URLs anytime and inspect scan analytics</p>
            </div>
          </div>
          <div class="header-right-actions">
            <button
              type="button"
              class="btn-create-toggle"
              (click)="isCreateMode.set(!isCreateMode())"
            >
              <ts-icon [name]="isCreateMode() ? 'x' : 'plus'" />
              <span>{{ isCreateMode() ? 'Cancel' : 'New Dynamic QR' }}</span>
            </button>
            <button
              type="button"
              class="close-btn"
              (click)="close.emit()"
              aria-label="Close manager"
            >
              <ts-icon name="x" />
            </button>
          </div>
        </header>

        <!-- New Dynamic QR Creator Section -->
        @if (isCreateMode()) {
          <section class="creator-section">
            <h3 class="creator-title">Create Hosted Dynamic QR</h3>

            <!-- Type Tabs -->
            <div class="creator-type-tabs">
              <button
                type="button"
                class="type-tab-btn"
                [class.active]="selectedDynamicType() === 'DYNAMIC_URL'"
                (click)="selectedDynamicType.set('DYNAMIC_URL')"
              >
                <ts-icon name="globe" />
                <span>Website</span>
              </button>
              <button
                type="button"
                class="type-tab-btn"
                [class.active]="selectedDynamicType() === 'DYNAMIC_PDF'"
                (click)="selectedDynamicType.set('DYNAMIC_PDF')"
              >
                <ts-icon name="file-text" />
                <span>PDF Document</span>
              </button>
              <button
                type="button"
                class="type-tab-btn"
                [class.active]="selectedDynamicType() === 'DYNAMIC_MENU'"
                (click)="selectedDynamicType.set('DYNAMIC_MENU')"
              >
                <ts-icon name="coffee" />
                <span>Menu</span>
              </button>
              <button
                type="button"
                class="type-tab-btn"
                [class.active]="selectedDynamicType() === 'DYNAMIC_COUPON'"
                (click)="selectedDynamicType.set('DYNAMIC_COUPON')"
              >
                <ts-icon name="tag" />
                <span>Coupon</span>
              </button>
              <button
                type="button"
                class="type-tab-btn"
                [class.active]="selectedDynamicType() === 'DYNAMIC_VCARD'"
                (click)="selectedDynamicType.set('DYNAMIC_VCARD')"
              >
                <ts-icon name="user" />
                <span>vCard</span>
              </button>
              <button
                type="button"
                class="type-tab-btn"
                [class.active]="selectedDynamicType() === 'DYNAMIC_MULTI_URL'"
                (click)="selectedDynamicType.set('DYNAMIC_MULTI_URL')"
              >
                <ts-icon name="share-2" />
                <span>Multi-Links</span>
              </button>
            </div>

            <!-- Form Body -->
            <div class="creator-form-body">
              <div class="form-group">
                <label class="form-label">QR Title / Campaign Name *</label>
                <input
                  type="text"
                  class="form-input"
                  placeholder="e.g. Summer Promo 2026"
                  [value]="createTitle()"
                  (input)="createTitle.set($any($event.target).value)"
                />
              </div>

              <!-- TYPE SPECIFIC: 1. URL -->
              @if (selectedDynamicType() === 'DYNAMIC_URL') {
                <div class="form-group">
                  <label class="form-label">Target Destination URL *</label>
                  <input
                    type="url"
                    class="form-input"
                    placeholder="https://example.com/target"
                    [value]="createTargetUrl()"
                    (input)="createTargetUrl.set($any($event.target).value)"
                  />
                </div>
              }

              <!-- TYPE SPECIFIC: 2. PDF -->
              @if (selectedDynamicType() === 'DYNAMIC_PDF') {
                <div class="form-group">
                  <label class="form-label">Attach PDF File *</label>
                  <input
                    type="file"
                    class="form-file-input"
                    accept=".pdf,application/pdf"
                    (change)="onFileSelected($event)"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Document Description (optional)</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="e.g. Complete product brochure & specs"
                    [value]="pdfDesc()"
                    (input)="pdfDesc.set($any($event.target).value)"
                  />
                </div>
              }

              <!-- TYPE SPECIFIC: 3. MENU -->
              @if (selectedDynamicType() === 'DYNAMIC_MENU') {
                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Restaurant / Cafe Name *</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Artisan Bistro"
                      [value]="menuRestaurant()"
                      (input)="menuRestaurant.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Currency Symbol</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="$"
                      [value]="menuCurrency()"
                      (input)="menuCurrency.set($any($event.target).value)"
                    />
                  </div>
                </div>
                <div class="form-row-3">
                  <div class="form-group">
                    <label class="form-label">Category</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Mains"
                      [value]="menuCategory()"
                      (input)="menuCategory.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Sample Dish</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Truffle Pasta"
                      [value]="menuItemName()"
                      (input)="menuItemName.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Price</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="18.50"
                      [value]="menuItemPrice()"
                      (input)="menuItemPrice.set($any($event.target).value)"
                    />
                  </div>
                </div>
              }

              <!-- TYPE SPECIFIC: 4. COUPON -->
              @if (selectedDynamicType() === 'DYNAMIC_COUPON') {
                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Discount Badge *</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. 25% OFF"
                      [value]="couponDiscount()"
                      (input)="couponDiscount.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Promo Code *</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. SAVE25"
                      [value]="couponCode()"
                      (input)="couponCode.set($any($event.target).value)"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Redemption CTA URL (optional)</label>
                  <input
                    type="url"
                    class="form-input"
                    placeholder="https://example.com/checkout"
                    [value]="couponCtaUrl()"
                    (input)="couponCtaUrl.set($any($event.target).value)"
                  />
                </div>
              }

              <!-- TYPE SPECIFIC: 5. VCARD -->
              @if (selectedDynamicType() === 'DYNAMIC_VCARD') {
                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Full Name *</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Sarah Jenkins"
                      [value]="vcardFullName()"
                      (input)="vcardFullName.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone *</label>
                    <input
                      type="tel"
                      class="form-input"
                      placeholder="+1 (555) 234-5678"
                      [value]="vcardPhone()"
                      (input)="vcardPhone.set($any($event.target).value)"
                    />
                  </div>
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input
                      type="email"
                      class="form-input"
                      placeholder="sarah@example.com"
                      [value]="vcardEmail()"
                      (input)="vcardEmail.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Company</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="Acme Innovations"
                      [value]="vcardCompany()"
                      (input)="vcardCompany.set($any($event.target).value)"
                    />
                  </div>
                </div>
              }

              <!-- TYPE SPECIFIC: 6. MULTI-URL -->
              @if (selectedDynamicType() === 'DYNAMIC_MULTI_URL') {
                <div class="form-group">
                  <label class="form-label">Profile / Bio</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Designer, Creator & Engineer"
                    [value]="multiBio()"
                    (input)="multiBio.set($any($event.target).value)"
                  />
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                    <label class="form-label">Link 1 Title</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="My Portfolio"
                      [value]="link1Title()"
                      (input)="link1Title.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Link 1 URL</label>
                    <input
                      type="url"
                      class="form-input"
                      placeholder="https://mywork.com"
                      [value]="link1Url()"
                      (input)="link1Url.set($any($event.target).value)"
                    />
                  </div>
                </div>
              }

              <!-- Advanced Options -->
              <details class="advanced-details">
                <summary>Security & Custom Slug Options</summary>
                <div class="advanced-grid">
                  <div class="form-group">
                    <label class="form-label">Custom Slug (optional)</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. spring-sale"
                      [value]="createSlug()"
                      (input)="createSlug.set($any($event.target).value)"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">PIN / Passcode Protection (optional)</label>
                    <input
                      type="password"
                      class="form-input"
                      placeholder="Leave blank for open access"
                      [value]="createPassword()"
                      (input)="createPassword.set($any($event.target).value)"
                    />
                  </div>
                </div>
              </details>

              @if (createError()) {
                <p class="error-msg">{{ createError() }}</p>
              }

              <button
                type="button"
                class="btn-primary btn-submit-create"
                [disabled]="isSubmittingCreate()"
                (click)="submitCreateDynamic()"
              >
                <ts-icon [name]="isSubmittingCreate() ? 'loader' : 'check'" />
                <span>{{ isSubmittingCreate() ? 'Generating Hosted QR...' : 'Create Hosted QR' }}</span>
              </button>
            </div>
          </section>
        }

        <!-- Import Key Section -->
        <section class="import-section">
          <details class="import-details">
            <summary class="import-summary">
              <ts-icon name="key" class="summary-icon" />
              <span>Import Existing Dynamic QR with Manage Key</span>
            </summary>
            <div class="import-form">
              <input
                type="text"
                class="form-input"
                placeholder="Paste 32-character Manage Key..."
                [value]="importKeyInput()"
                (input)="onImportKeyChange($event)"
              />
              <button
                type="button"
                class="btn-primary"
                [disabled]="!importKeyInput().trim() || isImporting()"
                (click)="onImport()"
              >
                <ts-icon name="download" />
                <span>{{ isImporting() ? 'Importing...' : 'Import' }}</span>
              </button>
            </div>
            @if (importError()) {
              <p class="error-msg">{{ importError() }}</p>
            }
          </details>
        </section>

        <!-- Items List -->
        <div class="drawer-content">
          @if (items().length === 0) {
            <div class="empty-state">
              <ts-icon name="link-2" class="empty-icon" />
              <h3 class="empty-title">No Dynamic QRs Yet</h3>
              <p class="empty-desc">
                Create a dynamic QR code to change its destination anytime without re-printing and to view scan counts.
              </p>
            </div>
          } @else {
            <div class="items-list">
              @for (item of items(); track item.code) {
                <article class="qr-item-card" [class.paused]="item.status === 'PAUSED'">
                  <div class="item-header">
                    <div class="item-title-col">
                      <div class="item-badge-row">
                        <span class="status-pill" [class.active]="item.status === 'ACTIVE'">
                          {{ item.status }}
                        </span>
                        <span class="type-pill">{{ item.type }}</span>
                      </div>
                      <h3 class="item-title">{{ item.title }}</h3>
                    </div>
                    <div class="item-scans-badge">
                      <ts-icon name="eye" class="scans-icon" />
                      <span class="scans-count">{{ item.scanCount }} scans</span>
                    </div>
                  </div>

                  <!-- URLs Row -->
                  <div class="urls-box">
                    <div class="url-line">
                      <span class="url-label">Short link:</span>
                      <a [href]="item.shortUrl" target="_blank" rel="noopener noreferrer" class="url-val short">
                        {{ item.shortUrl }}
                      </a>
                      <button
                        type="button"
                        class="icon-action-btn"
                        (click)="copyText(item.shortUrl)"
                        title="Copy short link"
                      >
                        <ts-icon name="copy" />
                      </button>
                    </div>

                    @if (item.targetUrl) {
                      <div class="url-line">
                        <span class="url-label">Redirects to:</span>
                        <span class="url-val target" [title]="item.targetUrl">
                          {{ item.targetUrl }}
                        </span>
                      </div>
                    }
                  </div>

                  <!-- Edit Destination Inline -->
                  @if (editingCode() === item.code) {
                    <div class="edit-box">
                      <label class="edit-label">New Destination URL:</label>
                      <div class="edit-input-row">
                        <input
                          type="url"
                          class="form-input"
                          [value]="newTargetUrl()"
                          (input)="onNewTargetUrlChange($event)"
                          placeholder="https://example.com/new-destination"
                        />
                        <button
                          type="button"
                          class="btn-primary"
                          [disabled]="!newTargetUrl().trim() || isUpdating()"
                          (click)="saveTargetUrl(item)"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          class="btn-secondary"
                          (click)="cancelEditing()"
                        >
                          Cancel
                        </button>
                      </div>
                      @if (updateError()) {
                        <p class="error-msg">{{ updateError() }}</p>
                      }
                    </div>
                  }

                  <!-- Actions Row -->
                  <div class="item-actions">
                    <button
                      type="button"
                      class="action-btn"
                      (click)="startEditing(item)"
                    >
                      <ts-icon name="edit" />
                      <span>Edit Destination</span>
                    </button>

                    <button
                      type="button"
                      class="action-btn"
                      (click)="togglePause(item)"
                    >
                      <ts-icon [name]="item.status === 'PAUSED' ? 'play' : 'pause'" />
                      <span>{{ item.status === 'PAUSED' ? 'Resume' : 'Pause' }}</span>
                    </button>

                    <button
                      type="button"
                      class="action-btn"
                      (click)="inspectAnalytics(item)"
                    >
                      <ts-icon name="bar-chart-2" />
                      <span>Analytics</span>
                    </button>

                    <button
                      type="button"
                      class="action-btn danger"
                      (click)="removeItem(item)"
                      title="Remove from local list"
                    >
                      <ts-icon name="trash-2" />
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </div>

        <!-- Analytics Modal / Bottom Sheet -->
        @if (selectedAnalytics(); as analytics) {
          <div class="analytics-overlay" (click)="closeAnalytics()">
            <div class="analytics-card" (click)="$event.stopPropagation()">
              <div class="analytics-header">
                <div>
                  <h3 class="analytics-title">Scan Telemetry: {{ analytics.code }}</h3>
                  <p class="analytics-subtitle">Aggregated privacy-preserving metrics</p>
                </div>
                <button type="button" class="close-btn" (click)="closeAnalytics()">
                  <ts-icon name="x" />
                </button>
              </div>

              <div class="metric-summary-grid">
                <div class="metric-stat-card">
                  <span class="stat-number">{{ analytics.totalScans }}</span>
                  <span class="stat-label">Total Scans</span>
                </div>
                <div class="metric-stat-card">
                  <span class="stat-number">{{ analytics.uniqueVisitors }}</span>
                  <span class="stat-label">Unique Devices</span>
                </div>
              </div>

              <!-- Breakdown Sections -->
              <div class="breakdown-columns">
                <div class="breakdown-card">
                  <h4 class="breakdown-title">Device Types</h4>
                  <ul class="breakdown-list">
                    @for (m of analytics.byDevice; track m.key) {
                      <li class="breakdown-item">
                        <span class="m-key">{{ m.key }}</span>
                        <span class="m-val">{{ m.count }}</span>
                      </li>
                    }
                    @if (analytics.byDevice.length === 0) {
                      <li class="empty-li">No device data yet</li>
                    }
                  </ul>
                </div>

                <div class="breakdown-card">
                  <h4 class="breakdown-title">Operating System</h4>
                  <ul class="breakdown-list">
                    @for (m of analytics.byOs; track m.key) {
                      <li class="breakdown-item">
                        <span class="m-key">{{ m.key }}</span>
                        <span class="m-val">{{ m.count }}</span>
                      </li>
                    }
                    @if (analytics.byOs.length === 0) {
                      <li class="empty-li">No OS data yet</li>
                    }
                  </ul>
                </div>

                <div class="breakdown-card">
                  <h4 class="breakdown-title">Countries</h4>
                  <ul class="breakdown-list">
                    @for (m of analytics.byCountry; track m.key) {
                      <li class="breakdown-item">
                        <span class="m-key">{{ m.key }}</span>
                        <span class="m-val">{{ m.count }}</span>
                      </li>
                    }
                    @if (analytics.byCountry.length === 0) {
                      <li class="empty-li">No country data yet</li>
                    }
                  </ul>
                </div>
              </div>
            </div>
          </div>
        }
      </aside>
    </div>
  `,
  styles: [`
    .dynamic-manager-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
    }

    .dynamic-manager-drawer {
      width: 100%;
      max-width: 580px;
      height: 100%;
      background: var(--surface-1, #111A2E);
      color: var(--text, #f4f4f5);
      border-left: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.1));
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .drawer-icon {
      font-size: 1.5rem;
      color: var(--tool-accent, var(--accent, #3b82f6));
    }

    .drawer-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      color: var(--text, #fcfcfc);
    }

    .drawer-subtitle {
      font-size: 0.8125rem;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      margin: 0;
    }

    .header-right-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-create-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--tool-accent-border, var(--accent-border, rgba(59, 130, 246, 0.3)));
      background: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.1)));
      color: var(--accent-strong, #60a5fa);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-create-toggle:hover {
      background: var(--tool-accent, var(--accent, #3b82f6));
      color: var(--on-accent, #fff);
    }

    .creator-section {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
      background: var(--surface-2, #16233D);
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .creator-title {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      color: var(--text-color-primary, #fff);
    }

    .creator-type-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.375rem;
      margin-bottom: 1.25rem;
    }

    .type-tab-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.15));
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.03));
      color: var(--text-color-secondary, #a1a1aa);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .type-tab-btn:hover {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text-color-primary, #fff);
    }

    .type-tab-btn.active {
      border-color: var(--tool-accent, var(--accent, #3b82f6));
      background: var(--tool-accent-soft, var(--accent-soft, rgba(59, 130, 246, 0.15)));
      color: var(--accent-strong, #60a5fa);
      font-weight: 600;
    }

    .creator-form-body {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .form-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-color-secondary, #a1a1aa);
    }

    .form-row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem;
    }

    .form-row-3 {
      display: grid;
      grid-template-columns: 1.2fr 1.5fr 0.8fr;
      gap: 0.5rem;
    }

    .form-file-input {
      padding: 0.5rem;
      border: 1px dashed var(--border-color-default, rgba(255, 255, 255, 0.25));
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.02));
      cursor: pointer;
    }

    .advanced-details {
      margin-top: 0.25rem;
      border-top: 1px dashed var(--border-color-subtle, rgba(255, 255, 255, 0.1));
      padding-top: 0.625rem;
    }

    .advanced-details summary {
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-color-secondary, #a1a1aa);
      user-select: none;
    }

    .advanced-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.625rem;
      margin-top: 0.625rem;
    }

    .btn-submit-create {
      margin-top: 0.5rem;
      justify-content: center;
      width: 100%;
      padding: 0.625rem;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-color-secondary, #a1a1aa);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .close-btn:hover {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
      color: var(--text-color-primary, #fff);
    }

    .import-section {
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.08));
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.02));
    }

    .import-details summary {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--accent-primary, #3b82f6);
      user-select: none;
    }

    .import-form {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    .form-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.2));
      background: var(--bg-surface-elevated, #27272a);
      color: var(--text-color-primary, #fff);
      font-size: 0.8125rem;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--accent-primary, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }

    .btn-primary {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      background: var(--accent-primary, #3b82f6);
      color: #fff;
      border: none;
      font-weight: 500;
      font-size: 0.8125rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--accent-primary-hover, #2563eb);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      background: transparent;
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.2));
      color: var(--text-color-primary, #fff);
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 1.5rem;
      color: var(--text-color-secondary, #a1a1aa);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.4;
    }

    .empty-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-color-primary, #fff);
    }

    .empty-desc {
      font-size: 0.875rem;
      line-height: 1.5;
      max-width: 340px;
      margin: 0 auto;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .qr-item-card {
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.12));
      background: var(--bg-surface-elevated, #27272a);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: border-color 0.15s;
    }

    .qr-item-card.paused {
      opacity: 0.75;
      border-style: dashed;
    }

    .item-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .item-badge-row {
      display: flex;
      gap: 0.375rem;
      margin-bottom: 0.25rem;
    }

    .status-pill {
      font-size: 0.6875rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-pill.active {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }

    .type-pill {
      font-size: 0.6875rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.12);
      color: #60a5fa;
      font-weight: 500;
    }

    .item-title {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
    }

    .item-scans-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.06));
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-color-primary, #fff);
    }

    .urls-box {
      background: var(--bg-surface-subtle, rgba(0, 0, 0, 0.2));
      border-radius: 6px;
      padding: 0.625rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-size: 0.8125rem;
    }

    .url-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .url-label {
      color: var(--text-color-secondary, #a1a1aa);
      min-width: 80px;
      font-size: 0.75rem;
    }

    .url-val {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .url-val.short {
      color: var(--accent-primary, #3b82f6);
      text-decoration: underline;
    }

    .icon-action-btn {
      background: transparent;
      border: none;
      color: var(--text-color-secondary, #a1a1aa);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
    }

    .icon-action-btn:hover {
      color: #fff;
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.08));
    }

    .action-btn {
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.1));
      color: var(--text-color-primary, #fff);
      padding: 0.375rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      transition: background 0.15s;
    }

    .action-btn:hover {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.1));
    }

    .action-btn.danger {
      color: #ef4444;
      margin-left: auto;
    }

    .action-btn.danger:hover {
      background: rgba(239, 68, 68, 0.15);
    }

    .edit-box {
      padding: 0.75rem;
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.04));
      border-radius: 6px;
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.15));
    }

    .edit-label {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin-bottom: 0.375rem;
      display: block;
    }

    .edit-input-row {
      display: flex;
      gap: 0.5rem;
    }

    .error-msg {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.375rem;
    }

    .analytics-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      z-index: 1010;
    }

    .analytics-card {
      background: var(--bg-surface-default, #18181b);
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.2));
      border-radius: 12px;
      padding: 1.5rem;
      width: 100%;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.5);
    }

    .analytics-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .analytics-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .analytics-subtitle {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0;
    }

    .metric-summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .metric-stat-card {
      background: var(--bg-surface-elevated, #27272a);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-number {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--accent-primary, #3b82f6);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
    }

    .breakdown-columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.5rem;
    }

    .breakdown-card {
      background: var(--bg-surface-elevated, #27272a);
      border-radius: 6px;
      padding: 0.625rem;
    }

    .breakdown-title {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0 0 0.5rem 0;
    }

    .breakdown-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .breakdown-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }

    .m-key {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 80px;
    }

    .m-val {
      font-weight: 600;
      color: var(--text-color-primary, #fff);
    }

    .empty-li {
      font-size: 0.6875rem;
      color: var(--text-color-secondary, #71717a);
      font-style: italic;
    }
  `]
})
export class QrDynamicManagerComponent {
  private readonly dynamicService = inject(QrDynamicService);

  readonly close = output<void>();

  readonly items = this.dynamicService.managedItems;
  readonly isCreateMode = signal<boolean>(false);
  readonly selectedDynamicType = signal<string>('DYNAMIC_URL');
  readonly createTitle = signal<string>('');
  readonly createTargetUrl = signal<string>('');
  readonly pdfDesc = signal<string>('');
  readonly selectedFile = signal<File | null>(null);
  readonly menuRestaurant = signal<string>('');
  readonly menuCurrency = signal<string>('$');
  readonly menuCategory = signal<string>('');
  readonly menuItemName = signal<string>('');
  readonly menuItemPrice = signal<string>('');
  readonly couponDiscount = signal<string>('');
  readonly couponCode = signal<string>('');
  readonly couponCtaUrl = signal<string>('');
  readonly vcardFullName = signal<string>('');
  readonly vcardPhone = signal<string>('');
  readonly vcardEmail = signal<string>('');
  readonly vcardCompany = signal<string>('');
  readonly multiBio = signal<string>('');
  readonly link1Title = signal<string>('');
  readonly link1Url = signal<string>('');
  readonly createSlug = signal<string>('');
  readonly createPassword = signal<string>('');
  readonly isSubmittingCreate = signal<boolean>(false);
  readonly createError = signal<string | null>(null);

  readonly isUpdating = signal<boolean>(false);
  readonly isImporting = signal<boolean>(false);
  readonly editingCode = signal<string | null>(null);
  readonly newTargetUrl = signal<string>('');
  readonly updateError = signal<string | null>(null);
  readonly importKeyInput = signal<string>('');
  readonly importError = signal<string | null>(null);
  readonly selectedAnalytics = signal<QrScanAnalytics | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    } else {
      this.selectedFile.set(null);
    }
  }

  async submitCreateDynamic(): Promise<void> {
    const title = this.createTitle().trim();
    if (!title) {
      this.createError.set('Please provide a title or campaign name');
      return;
    }

    const type = this.selectedDynamicType();
    let contentJson: unknown = null;

    if (type === 'DYNAMIC_URL') {
      const url = this.createTargetUrl().trim();
      if (!url) {
        this.createError.set('Please provide a valid destination URL');
        return;
      }
    } else if (type === 'DYNAMIC_PDF') {
      const pdfContent: DynamicPdfContent = {
        documentTitle: title,
        fileName: this.selectedFile()?.name,
        fileSizeBytes: this.selectedFile()?.size,
        description: this.pdfDesc().trim() || undefined
      };
      contentJson = pdfContent;
    } else if (type === 'DYNAMIC_MENU') {
      const restaurant = this.menuRestaurant().trim();
      if (!restaurant) {
        this.createError.set('Please provide the restaurant or venue name');
        return;
      }
      const menuContent: DynamicMenuContent = {
        restaurantName: restaurant,
        currency: this.menuCurrency().trim() || '$',
        sections: [
          {
            category: this.menuCategory().trim() || 'Menu',
            items: [
              {
                name: this.menuItemName().trim() || 'Featured Dish',
                price: this.menuItemPrice().trim() || '0'
              }
            ]
          }
        ]
      };
      contentJson = menuContent;
    } else if (type === 'DYNAMIC_COUPON') {
      const discount = this.couponDiscount().trim();
      const code = this.couponCode().trim();
      if (!discount || !code) {
        this.createError.set('Please provide both a discount badge and promo code');
        return;
      }
      const couponContent: DynamicCouponContent = {
        title,
        discountText: discount,
        couponCode: code,
        ctaUrl: this.couponCtaUrl().trim() || undefined
      };
      contentJson = couponContent;
    } else if (type === 'DYNAMIC_VCARD') {
      const fullName = this.vcardFullName().trim();
      const phone = this.vcardPhone().trim();
      if (!fullName || !phone) {
        this.createError.set('Please provide at least a full name and phone number');
        return;
      }
      const vcardContent: DynamicVCardContent = {
        fullName,
        phone,
        email: this.vcardEmail().trim() || undefined,
        company: this.vcardCompany().trim() || undefined
      };
      contentJson = vcardContent;
    } else if (type === 'DYNAMIC_MULTI_URL') {
      const multiContent: DynamicMultiUrlContent = {
        headerTitle: title,
        bio: this.multiBio().trim() || undefined,
        links: this.link1Url().trim()
          ? [
              {
                title: this.link1Title().trim() || 'Website',
                url: this.link1Url().trim()
              }
            ]
          : []
      };
      contentJson = multiContent;
    }

    this.isSubmittingCreate.set(true);
    this.createError.set(null);

    try {
      const created = await this.dynamicService.createDynamicQr({
        title,
        type: type as any,
        targetUrl: type === 'DYNAMIC_URL' ? this.createTargetUrl().trim() : undefined,
        contentJson: contentJson ? JSON.stringify(contentJson) : undefined,
        customSlug: this.createSlug().trim() || undefined,
        password: this.createPassword().trim() || undefined
      });

      if (type === 'DYNAMIC_PDF' && this.selectedFile() && created.manageKey) {
        await this.dynamicService.uploadAsset(created.manageKey, this.selectedFile()!);
      }

      // Reset form
      this.createTitle.set('');
      this.createTargetUrl.set('');
      this.pdfDesc.set('');
      this.selectedFile.set(null);
      this.menuRestaurant.set('');
      this.menuItemName.set('');
      this.menuItemPrice.set('');
      this.couponDiscount.set('');
      this.couponCode.set('');
      this.couponCtaUrl.set('');
      this.vcardFullName.set('');
      this.vcardPhone.set('');
      this.vcardEmail.set('');
      this.vcardCompany.set('');
      this.multiBio.set('');
      this.link1Title.set('');
      this.link1Url.set('');
      this.createSlug.set('');
      this.createPassword.set('');
      this.isCreateMode.set(false);
    } catch (err: unknown) {
      this.createError.set(err instanceof Error ? err.message : 'Failed to create hosted dynamic QR code');
    } finally {
      this.isSubmittingCreate.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dynamic-manager-overlay')) {
      this.close.emit();
    }
  }

  onImportKeyChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importKeyInput.set(input.value);
  }

  async onImport(): Promise<void> {
    const key = this.importKeyInput().trim();
    if (!key) return;

    this.isImporting.set(true);
    this.importError.set(null);
    try {
      await this.dynamicService.importManageKey(key);
      this.importKeyInput.set('');
    } catch (err: unknown) {
      this.importError.set(err instanceof Error ? err.message : 'Invalid Manage Key');
    } finally {
      this.isImporting.set(false);
    }
  }

  startEditing(item: ManagedDynamicQrItem): void {
    this.editingCode.set(item.code);
    this.newTargetUrl.set(item.targetUrl || '');
    this.updateError.set(null);
  }

  cancelEditing(): void {
    this.editingCode.set(null);
    this.newTargetUrl.set('');
    this.updateError.set(null);
  }

  onNewTargetUrlChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newTargetUrl.set(input.value);
  }

  async saveTargetUrl(item: ManagedDynamicQrItem): Promise<void> {
    const url = this.newTargetUrl().trim();
    if (!url) return;

    this.isUpdating.set(true);
    this.updateError.set(null);
    try {
      await this.dynamicService.updateDynamicQr(item.manageKey, { targetUrl: url });
      this.editingCode.set(null);
    } catch (err: unknown) {
      this.updateError.set(err instanceof Error ? err.message : 'Failed to update destination');
    } finally {
      this.isUpdating.set(false);
    }
  }

  async togglePause(item: ManagedDynamicQrItem): Promise<void> {
    try {
      await this.dynamicService.toggleStatus(item.manageKey, item.status);
    } catch (err: unknown) {
      console.error('Failed to toggle status', err);
    }
  }

  async inspectAnalytics(item: ManagedDynamicQrItem): Promise<void> {
    try {
      const analytics = await this.dynamicService.loadAnalytics(item.manageKey);
      this.selectedAnalytics.set(analytics);
    } catch (err: unknown) {
      console.error('Failed to load analytics', err);
    }
  }

  closeAnalytics(): void {
    this.selectedAnalytics.set(null);
  }

  removeItem(item: ManagedDynamicQrItem): void {
    if (confirm(`Remove "${item.title}" from this device's management list? The QR code will remain active.`)) {
      this.dynamicService.removeManagedItem(item.manageKey);
    }
  }

  copyText(text: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  }
}
