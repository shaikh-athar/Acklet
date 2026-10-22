// client/apps/tool-qr-generator/src/components/landing-viewer/landing-viewer.component.ts
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TsIconComponent } from '@acklet/tool-shell';
import { QrDynamicService } from '../../services/qr-dynamic.service';
import {
  QrPublicInfoDto,
  DynamicPdfContent,
  DynamicMenuContent,
  DynamicCouponContent,
  DynamicVCardContent,
  DynamicMultiUrlContent
} from '../../models/qr-generator.models';

@Component({
  selector: 'app-qr-landing-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="landing-container">
      <!-- Minimalist Header -->
      <header class="landing-header">
        <a routerLink="/tools/qr-generator" class="landing-brand">
          <span class="brand-badge">Acklet</span>
          <span class="brand-divider">/</span>
          <span class="brand-title">QR Hub</span>
        </a>
      </header>

      <main class="landing-main">
        <!-- 1. LOADING STATE -->
        @if (isLoading()) {
          <div class="status-card loading-card">
            <div class="spinner" aria-hidden="true"></div>
            <h2 class="status-title">Loading Destination...</h2>
            <p class="status-desc">Fetching hosted content for this QR code.</p>
          </div>
        }

        <!-- 2. ERROR STATE -->
        @else if (error()) {
          <div class="status-card error-card">
            <ts-icon name="alert-triangle" class="status-icon error-icon" />
            <h2 class="status-title">QR Code Not Found</h2>
            <p class="status-desc">{{ error() }}</p>
            <a routerLink="/tools/qr-generator" class="btn-primary">
              <ts-icon name="arrow-left" />
              <span>Go to QR Generator</span>
            </a>
          </div>
        }

        <!-- 3. PAUSED STATE -->
        @else if (isPaused()) {
          <div class="status-card warning-card">
            <ts-icon name="pause-circle" class="status-icon warn-icon" />
            <h2 class="status-title">This QR Code is Temporarily Paused</h2>
            <p class="status-desc">
              The owner of this link has temporarily paused traffic. Please check back later.
            </p>
          </div>
        }

        <!-- 4. EXPIRED STATE -->
        @else if (isExpired()) {
          <div class="status-card warning-card">
            <ts-icon name="clock" class="status-icon warn-icon" />
            <h2 class="status-title">This QR Code has Expired</h2>
            <p class="status-desc">
              The campaign or temporary link associated with this QR code has reached its expiration date.
            </p>
          </div>
        }

        <!-- 5. PASSWORD PROTECTION GATE -->
        @else if (isPasswordGateOpen()) {
          <div class="status-card auth-card">
            <ts-icon name="lock" class="status-icon auth-icon" />
            <h2 class="status-title">Protected Content</h2>
            <p class="status-desc">
              Please enter the passcode or PIN set by the creator to view this content.
            </p>

            <form class="auth-form" (ngSubmit)="submitPassword()">
              <div class="input-group">
                <input
                  type="password"
                  class="auth-input"
                  placeholder="Enter passcode..."
                  [value]="passwordInput()"
                  (input)="onPasswordInput($event)"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="!passwordInput().trim() || isVerifyingPassword()"
                >
                  <ts-icon name="unlock" />
                  <span>{{ isVerifyingPassword() ? 'Unlocking...' : 'Unlock' }}</span>
                </button>
              </div>

              @if (authError()) {
                <p class="auth-error-msg">{{ authError() }}</p>
              }
            </form>
          </div>
        }

        <!-- 6. UNLOCKED CONTENT PRESENTATION -->
        @else if (info(); as data) {
          <article class="content-wrapper" [attr.data-type]="data.type">
            <!-- TYPE A: PDF VIEWER -->
            @if (data.type === 'DYNAMIC_PDF') {
              <div class="viewer-card pdf-card">
                <div class="card-header-bar">
                  <div class="header-icon-box pdf-badge">
                    <ts-icon name="file-text" />
                  </div>
                  <div class="header-text-box">
                    <h1 class="content-title">{{ pdfContent().documentTitle || data.title }}</h1>
                    @if (pdfContent().description) {
                      <p class="content-subtitle">{{ pdfContent().description }}</p>
                    }
                  </div>
                </div>

                @if (primaryAsset(); as asset) {
                  <div class="asset-action-banner">
                    <div class="asset-meta">
                      <span class="asset-name">{{ asset.fileName }}</span>
                      <span class="asset-size">{{ formatBytes(asset.sizeBytes) }}</span>
                    </div>
                    <a
                      [href]="asset.downloadUrl"
                      class="btn-primary"
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ts-icon name="download" />
                      <span>Download PDF</span>
                    </a>
                  </div>

                  @if (sanitizedPdfUrl()) {
                    <div class="pdf-iframe-container">
                      <iframe
                        [src]="sanitizedPdfUrl()"
                        class="pdf-iframe"
                        title="Embedded PDF Document"
                      ></iframe>
                    </div>
                  }
                } @else {
                  <p class="no-asset-msg">No PDF file is currently attached to this QR code.</p>
                }
              </div>
            }

            <!-- TYPE B: RESTAURANT / CAFE DIGITAL MENU -->
            @else if (data.type === 'DYNAMIC_MENU') {
              <div class="viewer-card menu-card">
                <header class="menu-brand-header">
                  <ts-icon name="coffee" class="menu-icon" />
                  <h1 class="menu-restaurant-title">{{ menuContent().restaurantName || data.title }}</h1>
                  @if (menuContent().tagline) {
                    <p class="menu-tagline">{{ menuContent().tagline }}</p>
                  }
                </header>

                <!-- Dietary Legend -->
                <div class="dietary-legend">
                  <span class="legend-pill"><span class="dot vegan"></span>Vegan</span>
                  <span class="legend-pill"><span class="dot veg"></span>Vegetarian</span>
                  <span class="legend-pill"><span class="dot gf"></span>Gluten-Free</span>
                  <span class="legend-pill"><span class="dot spicy"></span>Spicy</span>
                </div>

                <!-- Menu Sections -->
                <div class="menu-sections-list">
                  @for (sec of menuContent().sections; track sec.category) {
                    <section class="menu-section">
                      <h2 class="section-title">{{ sec.category }}</h2>
                      <div class="items-grid">
                        @for (item of sec.items; track item.name) {
                          <div class="menu-item-card">
                            <div class="item-main-row">
                              <h3 class="item-name">{{ item.name }}</h3>
                              <span class="item-price">
                                {{ menuContent().currency || '$' }}{{ item.price }}
                              </span>
                            </div>
                            @if (item.description) {
                              <p class="item-desc">{{ item.description }}</p>
                            }
                            @if (item.dietary && item.dietary.length > 0) {
                              <div class="dietary-tags-row">
                                @for (d of item.dietary; track d) {
                                  <span class="tag-pill" [attr.data-tag]="d">{{ d }}</span>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </section>
                  }
                </div>
              </div>
            }

            <!-- TYPE C: DIGITAL COUPON / VOUCHER -->
            @else if (data.type === 'DYNAMIC_COUPON') {
              <div class="viewer-card coupon-card">
                <div class="coupon-cutout-top"></div>
                <div class="coupon-inner">
                  <span class="coupon-discount-badge">{{ couponContent().discountText || 'SPECIAL OFFER' }}</span>
                  <h1 class="coupon-title">{{ couponContent().title || data.title }}</h1>
                  
                  <div class="promo-code-box">
                    <span class="promo-label">Use Promo Code:</span>
                    <div class="code-copy-row">
                      <code class="promo-code">{{ couponContent().couponCode }}</code>
                      <button
                        type="button"
                        class="btn-copy-code"
                        (click)="copyText(couponContent().couponCode)"
                      >
                        <ts-icon [name]="copiedCode() ? 'check' : 'copy'" />
                        <span>{{ copiedCode() ? 'Copied!' : 'Copy' }}</span>
                      </button>
                    </div>
                  </div>

                  @if (couponContent().validUntil) {
                    <p class="validity-text">
                      <ts-icon name="calendar" class="val-icon" />
                      <span>Valid until: <strong>{{ couponContent().validUntil }}</strong></span>
                    </p>
                  }

                  @if (couponContent().ctaUrl) {
                    <a
                      [href]="couponContent().ctaUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="btn-primary btn-cta"
                    >
                      <span>{{ couponContent().ctaLabel || 'Redeem Now' }}</span>
                      <ts-icon name="external-link" />
                    </a>
                  }

                  @if (couponContent().terms) {
                    <div class="terms-box">
                      <h4 class="terms-title">Terms & Conditions</h4>
                      <p class="terms-text">{{ couponContent().terms }}</p>
                    </div>
                  }
                </div>
                <div class="coupon-cutout-bottom"></div>
              </div>
            }

            <!-- TYPE D: DIGITAL BUSINESS CARD (vCard) -->
            @else if (data.type === 'DYNAMIC_VCARD') {
              <div class="viewer-card vcard-card">
                <div class="vcard-avatar-box">
                  <div class="vcard-avatar">
                    <ts-icon name="user" class="avatar-icon" />
                  </div>
                </div>

                <div class="vcard-profile-header">
                  <h1 class="vcard-name">{{ vcardContent().fullName || data.title }}</h1>
                  @if (vcardContent().title || vcardContent().company) {
                    <p class="vcard-role">
                      {{ vcardContent().title }}
                      @if (vcardContent().title && vcardContent().company) { &bull; }
                      {{ vcardContent().company }}
                    </p>
                  }
                </div>

                <!-- 1-Click Save Contact to Phone -->
                <div class="vcard-save-action">
                  <button
                    type="button"
                    class="btn-primary btn-full-width"
                    (click)="downloadVcf()"
                  >
                    <ts-icon name="user-plus" />
                    <span>Save Contact to Phone</span>
                  </button>
                </div>

                <!-- Quick Action Grid -->
                <div class="vcard-contact-links">
                  @if (vcardContent().phone) {
                    <a [href]="'tel:' + vcardContent().phone" class="contact-link-row">
                      <div class="link-icon-box"><ts-icon name="phone" /></div>
                      <div class="link-info">
                        <span class="link-label">Phone</span>
                        <span class="link-value">{{ vcardContent().phone }}</span>
                      </div>
                    </a>
                  }

                  @if (vcardContent().email) {
                    <a [href]="'mailto:' + vcardContent().email" class="contact-link-row">
                      <div class="link-icon-box"><ts-icon name="mail" /></div>
                      <div class="link-info">
                        <span class="link-label">Email</span>
                        <span class="link-value">{{ vcardContent().email }}</span>
                      </div>
                    </a>
                  }

                  @if (vcardContent().website) {
                    <a [href]="vcardContent().website" target="_blank" rel="noopener noreferrer" class="contact-link-row">
                      <div class="link-icon-box"><ts-icon name="globe" /></div>
                      <div class="link-info">
                        <span class="link-label">Website</span>
                        <span class="link-value">{{ vcardContent().website }}</span>
                      </div>
                    </a>
                  }

                  @if (vcardContent().address) {
                    <div class="contact-link-row">
                      <div class="link-icon-box"><ts-icon name="map-pin" /></div>
                      <div class="link-info">
                        <span class="link-label">Address</span>
                        <span class="link-value">{{ vcardContent().address }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TYPE E: MULTI-URL LINK HUB -->
            @else if (data.type === 'DYNAMIC_MULTI_URL' || data.type === 'DYNAMIC_SOCIAL') {
              <div class="viewer-card multi-url-card">
                <div class="hub-header">
                  <div class="hub-avatar">
                    <ts-icon name="share-2" />
                  </div>
                  <h1 class="hub-title">{{ multiUrlContent().headerTitle || data.title }}</h1>
                  @if (multiUrlContent().bio) {
                    <p class="hub-bio">{{ multiUrlContent().bio }}</p>
                  }
                </div>

                <div class="hub-links-list">
                  @for (link of multiUrlContent().links; track link.url) {
                    <a
                      [href]="link.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hub-link-btn"
                    >
                      <ts-icon [name]="link.icon || 'external-link'" class="hub-btn-icon" />
                      <span class="hub-btn-text">{{ link.title }}</span>
                      <ts-icon name="arrow-right" class="hub-btn-arrow" />
                    </a>
                  }
                </div>
              </div>
            }

            <!-- TYPE F: DIRECT URL FALLBACK -->
            @else {
              <div class="viewer-card redirect-card">
                <ts-icon name="link-2" class="redirect-icon" />
                <h1 class="redirect-title">{{ data.title }}</h1>
                <p class="redirect-sub">Click below to proceed to the destination:</p>
                <a [href]="data.targetUrl" class="btn-primary btn-cta">
                  <span>Open Destination</span>
                  <ts-icon name="arrow-right" />
                </a>
              </div>
            }
          </article>
        }
      </main>

      <footer class="landing-footer">
        <p>Powered by <a routerLink="/" class="footer-link">Acklet</a> &bull; Privacy-First Online Tools</p>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background: var(--bg-surface-canvas, #09090b);
      color: var(--text-color-primary, #f4f4f5);
      font-family: var(--font-body, system-ui, -apple-system, sans-serif);
      --accent: #3b82f6;
      --accent-strong: #2563eb;
      --accent-soft: rgba(59, 130, 246, 0.12);
    }

    .landing-container {
      max-width: 680px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem 1rem;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .landing-header {
      padding-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .landing-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: inherit;
    }

    .brand-badge {
      font-weight: 700;
      font-size: 0.9375rem;
      letter-spacing: -0.02em;
      color: var(--accent, #3b82f6);
    }

    .brand-divider {
      color: var(--text-color-secondary, #71717a);
    }

    .brand-title {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      font-weight: 500;
    }

    .landing-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* Status Cards */
    .status-card {
      background: var(--bg-surface-elevated, #18181b);
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.12));
      border-radius: 12px;
      padding: 2.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    .status-icon {
      font-size: 2.5rem;
    }

    .error-icon { color: #ef4444; }
    .warn-icon { color: #eab308; }
    .auth-icon { color: var(--accent, #3b82f6); }

    .status-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }

    .status-desc {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      max-width: 400px;
      margin: 0;
      line-height: 1.5;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: var(--accent, #3b82f6);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Auth Gate Form */
    .auth-form {
      width: 100%;
      max-width: 360px;
      margin-top: 0.5rem;
    }

    .input-group {
      display: flex;
      gap: 0.5rem;
    }

    .auth-input {
      flex: 1;
      padding: 0.625rem 0.875rem;
      border-radius: 8px;
      background: var(--bg-surface-canvas, #09090b);
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.2));
      color: #fff;
      font-size: 0.875rem;
    }

    .auth-input:focus {
      outline: none;
      border-color: var(--accent, #3b82f6);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
    }

    .auth-error-msg {
      color: #ef4444;
      font-size: 0.8125rem;
      margin-top: 0.5rem;
    }

    /* Shared Content Card Styles */
    .viewer-card {
      background: var(--bg-surface-elevated, #18181b);
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.12));
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .card-header-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .pdf-badge {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .content-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    .content-subtitle {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0.25rem 0 0 0;
    }

    .asset-action-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.08));
      padding: 0.875rem 1.25rem;
      border-radius: 10px;
    }

    .asset-meta {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .asset-name {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .asset-size {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
    }

    .pdf-iframe-container {
      width: 100%;
      height: 520px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.1));
    }

    .pdf-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Menu Card Styles */
    .menu-brand-header {
      text-align: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.08));
    }

    .menu-icon {
      font-size: 2.25rem;
      color: var(--accent, #3b82f6);
      margin-bottom: 0.5rem;
    }

    .menu-restaurant-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .menu-tagline {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0.25rem 0 0 0;
    }

    .dietary-legend {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
    }

    .legend-pill {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot.vegan { background: #22c55e; }
    .dot.veg { background: #10b981; }
    .dot.gf { background: #eab308; }
    .dot.spicy { background: #ef4444; }

    .menu-sections-list {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--accent, #3b82f6);
      border-bottom: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.08));
      padding-bottom: 0.5rem;
      margin: 0 0 1rem 0;
    }

    .items-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .menu-item-card {
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.02));
      border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.06));
      border-radius: 8px;
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .item-main-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    .item-name {
      font-size: 0.9375rem;
      font-weight: 600;
      margin: 0;
    }

    .item-price {
      font-size: 0.9375rem;
      font-weight: 700;
      color: var(--accent, #3b82f6);
    }

    .item-desc {
      font-size: 0.8125rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0;
      line-height: 1.4;
    }

    .dietary-tags-row {
      display: flex;
      gap: 0.375rem;
      margin-top: 0.25rem;
    }

    .tag-pill {
      font-size: 0.6875rem;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-color-secondary, #d4d4d8);
    }

    /* Coupon Card Styles */
    .coupon-card {
      border: 2px dashed var(--accent, #3b82f6);
      text-align: center;
      position: relative;
    }

    .coupon-discount-badge {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--accent, #3b82f6);
      letter-spacing: -0.02em;
    }

    .coupon-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0.5rem 0 1.25rem 0;
    }

    .promo-code-box {
      background: var(--bg-surface-canvas, #09090b);
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.15));
      border-radius: 10px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .promo-label {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
      display: block;
      margin-bottom: 0.5rem;
    }

    .code-copy-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .promo-code {
      font-size: 1.5rem;
      font-family: var(--font-mono, monospace);
      font-weight: 700;
      color: #fde047;
      letter-spacing: 0.1em;
    }

    .btn-copy-code {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border-radius: 6px;
      background: var(--accent, #3b82f6);
      color: #fff;
      border: none;
      font-weight: 600;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .validity-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: 0.8125rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0 0 1rem 0;
    }

    .terms-box {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.08));
      text-align: left;
    }

    .terms-title {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0 0 0.25rem 0;
    }

    .terms-text {
      font-size: 0.75rem;
      color: var(--text-color-secondary, #71717a);
      margin: 0;
      line-height: 1.4;
    }

    /* vCard Styles */
    .vcard-avatar-box {
      display: flex;
      justify-content: center;
      margin-top: -3.5rem;
    }

    .vcard-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--accent, #3b82f6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      border: 4px solid var(--bg-surface-elevated, #18181b);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    .vcard-profile-header {
      text-align: center;
    }

    .vcard-name {
      font-size: 1.375rem;
      font-weight: 700;
      margin: 0;
    }

    .vcard-role {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0.25rem 0 0 0;
    }

    .btn-full-width {
      width: 100%;
      justify-content: center;
      padding: 0.75rem 1.25rem;
      font-size: 0.9375rem;
    }

    .vcard-contact-links {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .contact-link-row {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-color-subtle, rgba(255, 255, 255, 0.06));
      color: inherit;
      text-decoration: none;
      transition: background 0.15s;
    }

    .contact-link-row:hover {
      background: var(--bg-surface-hover, rgba(255, 255, 255, 0.08));
    }

    .link-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
    }

    .link-info {
      display: flex;
      flex-direction: column;
    }

    .link-label {
      font-size: 0.6875rem;
      color: var(--text-color-secondary, #a1a1aa);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .link-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Multi-URL Hub Styles */
    .hub-header {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .hub-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .hub-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    .hub-bio {
      font-size: 0.875rem;
      color: var(--text-color-secondary, #a1a1aa);
      margin: 0;
      max-width: 380px;
    }

    .hub-links-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .hub-link-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.25rem;
      border-radius: 12px;
      background: var(--bg-surface-subtle, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-color-default, rgba(255, 255, 255, 0.12));
      color: inherit;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9375rem;
      transition: all 0.15s ease;
    }

    .hub-link-btn:hover {
      background: var(--accent, #3b82f6);
      border-color: var(--accent, #3b82f6);
      color: #fff;
      transform: translateY(-2px);
    }

    .hub-btn-icon {
      font-size: 1.25rem;
    }

    .hub-btn-text {
      flex: 1;
    }

    .hub-btn-arrow {
      font-size: 1rem;
      opacity: 0.6;
    }

    /* Common Buttons */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border-radius: 8px;
      background: var(--accent, #3b82f6);
      color: #fff;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--accent-strong, #2563eb);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .landing-footer {
      text-align: center;
      padding-top: 2rem;
      font-size: 0.75rem;
      color: var(--text-color-secondary, #71717a);
    }

    .footer-link {
      color: var(--accent, #3b82f6);
      text-decoration: none;
    }

    .footer-link:hover {
      text-decoration: underline;
    }
  `]
})
export class QrLandingViewerComponent implements OnInit {
  private readonly route: ActivatedRoute;
  private readonly dynamicService: QrDynamicService;
  private readonly sanitizer: DomSanitizer;

  constructor(
    route?: ActivatedRoute,
    dynamicService?: QrDynamicService,
    sanitizer?: DomSanitizer
  ) {
    this.route = route ?? inject(ActivatedRoute);
    this.dynamicService = dynamicService ?? inject(QrDynamicService);
    this.sanitizer = sanitizer ?? inject(DomSanitizer);
  }

  readonly code = signal<string>('');
  readonly info = signal<QrPublicInfoDto | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly isPaused = signal<boolean>(false);
  readonly isExpired = signal<boolean>(false);
  readonly isPasswordGateOpen = signal<boolean>(false);
  readonly passwordInput = signal<string>('');
  readonly isVerifyingPassword = signal<boolean>(false);
  readonly authError = signal<string | null>(null);
  readonly copiedCode = signal<boolean>(false);

  // Parsed content signals
  readonly pdfContent = computed<DynamicPdfContent>(() => {
    return this.parseJsonSafe<DynamicPdfContent>(this.info()?.contentJson, {
      documentTitle: this.info()?.title || 'Document'
    });
  });

  readonly menuContent = computed<DynamicMenuContent>(() => {
    return this.parseJsonSafe<DynamicMenuContent>(this.info()?.contentJson, {
      restaurantName: this.info()?.title || 'Menu',
      sections: []
    });
  });

  readonly couponContent = computed<DynamicCouponContent>(() => {
    return this.parseJsonSafe<DynamicCouponContent>(this.info()?.contentJson, {
      title: this.info()?.title || 'Coupon',
      discountText: 'Special Deal',
      couponCode: 'OFFER2026'
    });
  });

  readonly vcardContent = computed<DynamicVCardContent>(() => {
    return this.parseJsonSafe<DynamicVCardContent>(this.info()?.contentJson, {
      fullName: this.info()?.title || 'Contact'
    });
  });

  readonly multiUrlContent = computed<DynamicMultiUrlContent>(() => {
    return this.parseJsonSafe<DynamicMultiUrlContent>(this.info()?.contentJson, {
      headerTitle: this.info()?.title || 'Links',
      links: []
    });
  });

  readonly primaryAsset = computed(() => {
    const assets = this.info()?.assets;
    return assets && assets.length > 0 ? assets[0] : null;
  });

  readonly sanitizedPdfUrl = computed<SafeResourceUrl | null>(() => {
    const asset = this.primaryAsset();
    if (!asset) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(asset.downloadUrl);
  });

  ngOnInit(): void {
    const codeParam = this.route.snapshot.paramMap.get('code');
    if (!codeParam) {
      this.error.set('Missing QR code identifier');
      this.isLoading.set(false);
      return;
    }

    this.code.set(codeParam);

    const queryParams = this.route.snapshot.queryParams;
    if (queryParams['paused'] === 'true') {
      this.isPaused.set(true);
      this.isLoading.set(false);
      return;
    }

    if (queryParams['expired'] === 'true') {
      this.isExpired.set(true);
      this.isLoading.set(false);
      return;
    }

    this.loadPublicMetadata(codeParam);
  }

  async loadPublicMetadata(code: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const data = await this.dynamicService.getPublicInfo(code);
      this.info.set(data);

      if (data.status === 'PAUSED') {
        this.isPaused.set(true);
      } else if (data.hasPassword && (!data.targetUrl && !data.contentJson)) {
        this.isPasswordGateOpen.set(true);
      }
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load QR code destination');
    } finally {
      this.isLoading.set(false);
    }
  }

  onPasswordInput(event: Event): void {
    this.passwordInput.set((event.target as HTMLInputElement).value);
  }

  async submitPassword(): Promise<void> {
    const pass = this.passwordInput().trim();
    if (!pass) return;

    this.isVerifyingPassword.set(true);
    this.authError.set(null);

    try {
      const unlocked = await this.dynamicService.verifyPassword(this.code(), pass);
      this.info.set(unlocked);
      this.isPasswordGateOpen.set(false);
    } catch (err: unknown) {
      this.authError.set('Incorrect passcode. Please try again.');
    } finally {
      this.isVerifyingPassword.set(false);
    }
  }

  downloadVcf(): void {
    const v = this.vcardContent();
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN;CHARSET=UTF-8:${v.fullName}`,
      `N;CHARSET=UTF-8:${v.fullName};;;;`
    ];

    if (v.company) lines.push(`ORG;CHARSET=UTF-8:${v.company}`);
    if (v.title) lines.push(`TITLE;CHARSET=UTF-8:${v.title}`);
    if (v.phone) lines.push(`TEL;TYPE=CELL,VOICE:${v.phone}`);
    if (v.email) lines.push(`EMAIL;TYPE=INTERNET,PREF:${v.email}`);
    if (v.website) lines.push(`URL:${v.website}`);
    if (v.address) lines.push(`ADR;TYPE=WORK;CHARSET=UTF-8:;;${v.address};;;;`);
    if (v.note) lines.push(`NOTE;CHARSET=UTF-8:${v.note}`);

    lines.push('END:VCARD');
    const vcfString = lines.join('\r\n');

    const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${v.fullName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  copyText(text: string): void {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      this.copiedCode.set(true);
      setTimeout(() => this.copiedCode.set(false), 2000);
    }
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private parseJsonSafe<T>(jsonStr: string | undefined | null, fallback: T): T {
    if (!jsonStr) return fallback;
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return fallback;
    }
  }
}
