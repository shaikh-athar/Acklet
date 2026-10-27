// client/apps/tool-qr-generator/src/components/input-panel/input-panel.component.ts
import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContentType,
  CONTENT_TYPE_CONFIGS,
  WifiData,
  VCardData,
  SmsData,
  GeoData,
  WebsiteData,
  EmailData,
  PhoneData,
  EventData,
  SocialData,
  AppData,
  CryptoData,
  SocialPlatform,
  CryptoCoin,
  DynamicQrCode
} from '../../models/qr-generator.models';
import { TsIconComponent } from '@acklet/tool-shell';
import { QRGeneratorService } from '../../services/qr-generator.service';
import { QrDynamicService } from '../../services/qr-dynamic.service';
import { SmartLinkService } from '../../services/smart-link.service';
import {
  parseMapCoordinates,
  detectPotentialTextType,
  countUtf8Bytes,
  normalizeLineEndings,
  MAX_TEXT_CHARS,
  MAX_TEXT_BYTES,
  LARGE_TEXT_BYTES_THRESHOLD
} from '../../services/qr-payload-builders';
import { QrSelectComponent, QrSelectOption } from '../qr-select/qr-select.component';
import { PhoneInputComponent, PhoneInputValue } from '../phone-input/phone-input.component';
import { LocationInputComponent, LocationInputValue } from '../location-input/location-input.component';
import { SocialLinkInputComponent, SocialLinkInputValue, AddCenterIconEvent } from '../social-link-input/social-link-input.component';
import { normalizeIosAppInput, normalizeAndroidAppInput } from '../../utils/store-link-normalizer';

@Component({
  selector: 'app-qr-input-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TsIconComponent,
    QrSelectComponent,
    PhoneInputComponent,
    LocationInputComponent,
    SocialLinkInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="qr-input-panel-body">
      <!-- Input Field Area -->
      <div class="qr-field-container">
        <div class="qr-field-header-row">
          <span class="qr-active-type-label">{{ activeConfig().label }} Content</span>
        </div>

        <!-- 1. WEBSITE / URL -->
        @if (selectedType() === 'url') {
          <div class="qr-structured-form">
            <div class="qr-form-row">
              <label for="url-input" class="qr-sub-label">Website Link *</label>
              <div class="qr-single-input-wrapper">
                <ts-icon name="globe" class="input-leading-icon" />
                <input
                  id="url-input"
                  type="url"
                  class="qr-input"
                  placeholder="https://example.com"
                  [(ngModel)]="websiteData.url"
                  (ngModelChange)="onWebsiteChange()"
                  (blur)="onUrlBlur()"
                  aria-describedby="qr-input-helper qr-input-error"
                  inputmode="url"
                  enterkeyhint="done"
                  autocorrect="off"
                  autocapitalize="none"
                />
              </div>
            </div>

            <details class="more-options tracking-disclosure">
              <summary class="tracking-summary">
                <ts-icon name="plus" class="summary-plus-icon" />
                <span>Add tracking (UTM parameters)</span>
              </summary>
              <div class="options-content">
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="utm-source" class="qr-sub-label">Campaign Source (utm_source)</label>
                    <input
                      id="utm-source"
                      type="text"
                      class="qr-input"
                      placeholder="e.g. qr_stand, flyer"
                      [(ngModel)]="websiteData.utmSource"
                      (ngModelChange)="onWebsiteChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="utm-medium" class="qr-sub-label">Campaign Medium (utm_medium)</label>
                    <input
                      id="utm-medium"
                      type="text"
                      class="qr-input"
                      placeholder="e.g. offline, print"
                      [(ngModel)]="websiteData.utmMedium"
                      (ngModelChange)="onWebsiteChange()"
                    />
                  </div>
                </div>
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="utm-campaign" class="qr-sub-label">Campaign Name (utm_campaign)</label>
                    <input
                      id="utm-campaign"
                      type="text"
                      class="qr-input"
                      placeholder="e.g. spring_launch_2026"
                      [(ngModel)]="websiteData.utmCampaign"
                      (ngModelChange)="onWebsiteChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="utm-content" class="qr-sub-label">Campaign Content (utm_content)</label>
                    <input
                      id="utm-content"
                      type="text"
                      class="qr-input"
                      placeholder="e.g. front_desk_banner"
                      [(ngModel)]="websiteData.utmContent"
                      (ngModelChange)="onWebsiteChange()"
                    />
                  </div>
                </div>

                <!-- Dynamic Shortlink Box -->
                <div class="dynamic-qr-box">
                  <div class="dynamic-box-header">
                    <div class="dynamic-box-title">
                      <ts-icon name="graph-star" [size]="18" class="dyn-icon" />
                      <div>
                        <h4 class="dyn-heading">Convert to Hosted Dynamic QR</h4>
                        <p class="dyn-desc">Edit destination anytime without reprinting + privacy-friendly scan analytics.</p>
                      </div>
                    </div>
                  </div>

                  <div class="dynamic-fields-grid">
                    <div class="qr-form-row">
                      <label for="dyn-title" class="qr-sub-label">Campaign Title (optional)</label>
                      <input
                        id="dyn-title"
                        type="text"
                        class="qr-input"
                        placeholder="e.g. Summer Promo 2026"
                        [value]="dynamicTitle()"
                        (input)="onDynamicTitleChange($event)"
                      />
                    </div>
                    <div class="qr-form-row">
                      <label for="dyn-slug" class="qr-sub-label">Custom Slug (optional)</label>
                      <input
                        id="dyn-slug"
                        type="text"
                        class="qr-input"
                        placeholder="e.g. summer-promo"
                        [value]="dynamicSlug()"
                        (input)="onDynamicSlugChange($event)"
                      />
                    </div>
                  </div>

                  <div class="dynamic-fields-grid">
                    <div class="qr-form-row">
                      <label for="dyn-pass" class="qr-sub-label">PIN / Password Protection (optional)</label>
                      <input
                        id="dyn-pass"
                        type="password"
                        class="qr-input"
                        placeholder="Leave blank for public redirect"
                        [value]="dynamicPassword()"
                        (input)="onDynamicPasswordChange($event)"
                      />
                    </div>
                  </div>

                  <div class="dynamic-action-row">
                    <button
                      type="button"
                      class="btn-create-dynamic"
                      [disabled]="!websiteData.url.trim() || isCreatingDynamic()"
                      (click)="createDynamicLink()"
                    >
                      <ts-icon name="graph-star" />
                      <span>{{ isCreatingDynamic() ? 'Creating Shortlink...' : 'Create Dynamic QR Shortlink' }}</span>
                    </button>
                  </div>

                  @if (dynamicError()) {
                    <p class="dyn-error">{{ dynamicError() }}</p>
                  }

                  @if (lastCreatedDynamic(); as dyn) {
                    <div class="dynamic-success-card">
                      <div class="success-header">
                        <ts-icon name="check-circle" class="success-icon" />
                        <span class="success-title">Dynamic QR Generated!</span>
                      </div>
                      <p class="success-sub">The QR preview now encodes this shortlink:</p>
                      <div class="dyn-url-display">
                        <code class="short-url-code">{{ dyn.shortUrl }}</code>
                        <button
                          type="button"
                          class="copy-btn"
                          (click)="copyText(dyn.shortUrl)"
                        >
                          <ts-icon name="copy" />
                          <span>Copy</span>
                        </button>
                      </div>

                      <div class="manage-key-alert">
                        <div class="key-alert-header">
                          <ts-icon name="key" />
                          <strong>Private Manage Key:</strong>
                        </div>
                        <div class="key-box">
                          <code class="key-code">{{ dyn.manageKey }}</code>
                          <button
                            type="button"
                            class="copy-btn-sm"
                            (click)="copyText(dyn.manageKey || '')"
                          >
                            Copy Key
                          </button>
                        </div>
                        <p class="key-note">
                          Keep this secret key safe! It allows you to update the destination URL or pause the link anytime without an account. It is saved in your local management list.
                        </p>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </details>
          </div>
        }

        <!-- 2. PLAIN TEXT -->
        @if (selectedType() === 'text') {
          <div class="qr-structured-form">
            @if (textTypeNudge(); as nudge) {
              <div class="type-nudge-pill slide-fade-in">
                <ts-icon name="info" class="nudge-icon" />
                <span class="nudge-text">{{ nudge.message }}</span>
                <button type="button" class="nudge-switch-btn" (click)="applyTextTypeSwitch(nudge.type)">
                  Switch to {{ nudge.targetLabel }}
                </button>
                <button type="button" class="nudge-dismiss-btn" (click)="dismissTextNudge()" title="Dismiss suggestion">
                  <ts-icon name="x" />
                </button>
              </div>
            }

            <div class="qr-form-row">
              <div class="text-input-header">
                <label for="qr-text-input" class="qr-sub-label">Text Content *</label>
                <span
                  class="text-live-counter"
                  [class.counter-warning]="isByteCapHitFirst()"
                  [class.counter-danger]="isTextOverCharLimit()"
                  aria-live="polite"
                >
                  {{ textCharCountFormatted() }} / 5,000 characters
                  @if (isByteCapLimiting()) {
                    <span class="counter-note">(non-English uses more storage)</span>
                  }
                </span>
              </div>
              <textarea
                id="qr-text-input"
                class="qr-textarea"
                dir="auto"
                [class.has-error]="isTextOverCharLimit() || isByteCapHitFirst()"
                rows="5"
                [placeholder]="activeConfig().placeholder"
                [ngModel]="content()"
                (ngModelChange)="onContentInput($event)"
                maxlength="5000"
                aria-describedby="qr-input-helper qr-input-error qr-text-warning qr-text-error"
              ></textarea>

              <!-- Warning if byte cap is hit first (Hindi, emoji, non-English) -->
              @if (isByteCapHitFirst()) {
                <div id="qr-text-warning" class="text-warning-pill slide-fade-in" role="alert">
                  <ts-icon name="alert-triangle" class="status-pill-icon" />
                  <span>Non-English text uses more space (limit: 10,000 bytes)</span>
                </div>
              }

              <!-- Error if character limit is exceeded -->
              @if (isTextOverCharLimit()) {
                <div id="qr-text-error" class="text-error-pill slide-fade-in" role="alert">
                  <ts-icon name="alert-circle" class="status-pill-icon" />
                  <span>Maximum is 5,000 characters</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- 3. EMAIL -->
        @if (selectedType() === 'email') {
          <div class="qr-structured-form">
            <div class="qr-form-row">
              <label for="email-to" class="qr-sub-label">Recipient Email *</label>
              <div class="qr-single-input-wrapper">
                <ts-icon name="mail" class="input-leading-icon" />
                <input
                  id="email-to"
                  type="email"
                  class="qr-input"
                  placeholder="contact@company.com"
                  [(ngModel)]="emailData.to"
                  (ngModelChange)="onEmailChange()"
                  inputmode="email"
                  enterkeyhint="next"
                  autocorrect="off"
                  autocapitalize="none"
                />
              </div>
            </div>

            <details class="more-options">
              <summary>More options (Subject, Message & CC/BCC)</summary>
              <div class="options-content">
                <div class="qr-form-row">
                  <label for="email-subject" class="qr-sub-label">Subject Line</label>
                  <input
                    id="email-subject"
                    type="text"
                    class="qr-input"
                    placeholder="Inquiry from QR Scan"
                    [(ngModel)]="emailData.subject"
                    (ngModelChange)="onEmailChange()"
                  />
                </div>
                <div class="qr-form-row">
                  <label for="email-body" class="qr-sub-label">Message Body</label>
                  <textarea
                    id="email-body"
                    class="qr-textarea"
                    dir="auto"
                    rows="3"
                    placeholder="Hello, I'd like to get more information about..."
                    [(ngModel)]="emailData.body"
                    (ngModelChange)="onEmailChange()"
                  ></textarea>
                </div>
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="email-cc" class="qr-sub-label">CC Address</label>
                    <input
                      id="email-cc"
                      type="email"
                      class="qr-input"
                      placeholder="team@company.com"
                      [(ngModel)]="emailData.cc"
                      (ngModelChange)="onEmailChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="email-bcc" class="qr-sub-label">BCC Address</label>
                    <input
                      id="email-bcc"
                      type="email"
                      class="qr-input"
                      placeholder="archive@company.com"
                      [(ngModel)]="emailData.bcc"
                      (ngModelChange)="onEmailChange()"
                    />
                  </div>
                </div>
              </div>
            </details>

            <div class="attachment-protocol-note">
              <ts-icon name="info" class="note-icon" />
              <span>Standard QR codes cannot embed file attachments. To share documents, images, or PDFs, upload them to Google Drive or your website and use the <strong>Website Link</strong> option.</span>
            </div>
          </div>
        }

        <!-- 4. PHONE -->
        @if (selectedType() === 'phone') {
          <div class="qr-structured-form">
            <app-phone-input
              id="phone-num-input"
              label="Phone Number *"
              [initialValue]="phoneData.number || ''"
              (valueChange)="onPhoneInputValueChange($event)"
            />
          </div>
        }

        <!-- 5. SMS -->
        @if (selectedType() === 'sms') {
          <div class="qr-structured-form">
            <app-phone-input
              id="sms-phone-input"
              label="Recipient Phone Number *"
              [initialValue]="smsData.phone || ''"
              [requireMobile]="true"
              (valueChange)="onSmsPhoneInputValueChange($event)"
            />

            <details class="more-options">
              <summary>More options (Pre-filled Message & Format)</summary>
              <div class="options-content">
                <div class="qr-form-row">
                  <label for="sms-msg" class="qr-sub-label">Pre-filled Message</label>
                  <textarea
                    id="sms-msg"
                    class="qr-textarea"
                    dir="auto"
                    rows="3"
                    placeholder="Hello, I scanned your QR code..."
                    [(ngModel)]="smsData.message"
                    (ngModelChange)="onSmsChange()"
                  ></textarea>
                </div>
                <div class="qr-form-row">
                  <label for="sms-format" class="qr-sub-label">URI Scheme Format</label>
                  <app-qr-select
                    id="sms-format"
                    [options]="smsFormatOptions"
                    [value]="smsData.format"
                    (valueChange)="smsData.format = $event; onSmsChange()"
                  />
                </div>
              </div>
            </details>

            <div class="attachment-protocol-note">
              <ts-icon name="info" class="note-icon" />
              <span>QR text messages cannot attach files (MMS). To share a document or image, paste a link to the file in your message or use the <strong>Website Link</strong> option.</span>
            </div>
          </div>
        }

        <!-- 6. WI-FI -->
        @if (selectedType() === 'wifi') {
          <div class="qr-structured-form">
            <div class="qr-form-row">
              <label for="wifi-ssid" class="qr-sub-label">Network Name (SSID) *</label>
              <div class="qr-single-input-wrapper">
                <ts-icon name="wifi" class="input-leading-icon" />
                <input
                  id="wifi-ssid"
                  type="text"
                  class="qr-input"
                  placeholder="e.g. Office-WiFi-5G"
                  [(ngModel)]="wifiData.ssid"
                  (ngModelChange)="onWifiChange()"
                />
              </div>
            </div>

            <div class="qr-input-grid">
              <div class="qr-form-row">
                <label for="wifi-enc" class="qr-sub-label">Security Protocol</label>
                <app-qr-select
                  id="wifi-enc"
                  [options]="wifiEncryptionOptions"
                  [value]="wifiData.encryption"
                  (valueChange)="wifiData.encryption = $event; onWifiChange()"
                />
              </div>

              @if (wifiData.encryption !== 'nopass') {
                <div class="qr-form-row">
                  <label for="wifi-pass" class="qr-sub-label">Network Password *</label>
                  <div class="qr-single-input-wrapper">
                    <ts-icon name="lock" class="input-leading-icon" />
                    <input
                      id="wifi-pass"
                      [type]="showPassword() ? 'text' : 'password'"
                      class="qr-input"
                      placeholder="Security key"
                      [(ngModel)]="wifiData.password"
                      (ngModelChange)="onWifiChange()"
                    />
                    <button
                      type="button"
                      class="qr-input-action-btn"
                      (click)="showPassword.set(!showPassword())"
                      [title]="showPassword() ? 'Hide password' : 'Show password'"
                    >
                      <ts-icon [name]="showPassword() ? 'eye-off' : 'eye'" class="action-icon" />
                    </button>
                  </div>
                </div>
              }
            </div>

            <details class="more-options">
              <summary>More options (Hidden SSID & Enterprise EAP)</summary>
              <div class="options-content">
                <div class="qr-checkbox-row">
                  <label class="qr-checkbox-label">
                    <input
                      type="checkbox"
                      class="qr-checkbox"
                      [(ngModel)]="wifiData.hidden"
                      (ngModelChange)="onWifiChange()"
                    />
                    <span>Hidden Network (SSID is not broadcasted)</span>
                  </label>
                </div>
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="wifi-eap" class="qr-sub-label">EAP Method (Enterprise)</label>
                    <app-qr-select
                      id="wifi-eap"
                      [options]="wifiEapOptions"
                      [value]="wifiData.eapMethod"
                      (valueChange)="wifiData.eapMethod = $event; onWifiChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="wifi-identity" class="qr-sub-label">EAP Identity</label>
                    <input
                      id="wifi-identity"
                      type="text"
                      class="qr-input"
                      placeholder="username@corp"
                      [(ngModel)]="wifiData.identity"
                      (ngModelChange)="onWifiChange()"
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>
        }

        <!-- 7. LOCATION / GEO -->
        @if (selectedType() === 'geo') {
          <div class="qr-structured-form">
            <app-location-input
              [initialLat]="geoLatitudeNum"
              [initialLng]="geoLongitudeNum"
              [initialLabel]="geoData.label || ''"
              (valueChange)="onLocationInputValueChange($event)"
            />
          </div>
        }

        <!-- 8. EVENT (iCalendar RFC 5545) -->
        @if (selectedType() === 'event') {
          <div class="qr-structured-form">
            <div class="event-form-top-bar">
              <span class="form-section-tip">Creates an RFC 5545 calendar event that adds to Apple Calendar & Google Calendar in 1 tap.</span>
              <button type="button" class="fill-example-btn" (click)="applyEventPreset()">
                <ts-icon name="sparkles" />
                <span> Fill example</span>
              </button>
            </div>

            <div class="qr-form-row">
              <label for="event-title" class="qr-sub-label">Event Title *</label>
              <input
                id="event-title"
                type="text"
                class="qr-input"
                placeholder="Product Launch Keynote"
                [(ngModel)]="eventData.title"
                (ngModelChange)="onEventChange()"
              />
            </div>

            <div class="qr-input-grid">
              <div class="qr-form-row">
                <label for="event-sdate" class="qr-sub-label">Start Date *</label>
                <input
                  id="event-sdate"
                  type="date"
                  class="qr-input"
                  [(ngModel)]="eventData.startDate"
                  (ngModelChange)="onEventChange()"
                />
              </div>
              @if (!eventData.allDay) {
                <div class="qr-form-row">
                  <label for="event-stime" class="qr-sub-label">Start Time *</label>
                  <input
                    id="event-stime"
                    type="time"
                    class="qr-input"
                    [(ngModel)]="eventData.startTime"
                    (ngModelChange)="onEventChange()"
                  />
                </div>
              }
            </div>

            <div class="qr-checkbox-row">
              <label class="qr-checkbox-label">
                <input
                  type="checkbox"
                  class="qr-checkbox"
                  [(ngModel)]="eventData.allDay"
                  (ngModelChange)="onEventChange()"
                />
                <span>All-Day Event</span>
              </label>
            </div>

            <details class="more-options">
              <summary>More options (End Time, Location, Organizer & Recurrence)</summary>
              <div class="options-content">
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="event-edate" class="qr-sub-label">End Date</label>
                    <input
                      id="event-edate"
                      type="date"
                      class="qr-input"
                      [(ngModel)]="eventData.endDate"
                      (ngModelChange)="onEventChange()"
                    />
                  </div>
                  @if (!eventData.allDay) {
                    <div class="qr-form-row">
                      <label for="event-etime" class="qr-sub-label">End Time (defaults to +1 hr if empty)</label>
                      <input
                        id="event-etime"
                        type="time"
                        class="qr-input"
                        [(ngModel)]="eventData.endTime"
                        (ngModelChange)="onEventChange()"
                      />
                    </div>
                  }
                </div>

                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="event-loc" class="qr-sub-label">Location / Room</label>
                    <input
                      id="event-loc"
                      type="text"
                      class="qr-input"
                      placeholder="Moscone Center, SF"
                      [(ngModel)]="eventData.location"
                      (ngModelChange)="onEventChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="event-org" class="qr-sub-label">Organizer Email</label>
                    <input
                      id="event-org"
                      type="email"
                      class="qr-input"
                      placeholder="events@acklet.com"
                      [(ngModel)]="eventData.organizer"
                      (ngModelChange)="onEventChange()"
                    />
                  </div>
                </div>

                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="event-repeat" class="qr-sub-label">Recurrence (RRULE)</label>
                    <app-qr-select
                      id="event-repeat"
                      [options]="eventRepeatOptions"
                      [value]="eventData.repeat"
                      (valueChange)="eventData.repeat = $event; onEventChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="event-alarm" class="qr-sub-label">Reminder Notification</label>
                    <app-qr-select
                      id="event-alarm"
                      [options]="eventReminderOptions"
                      [value]="eventData.reminderMinutes"
                      (valueChange)="eventData.reminderMinutes = $event; onEventChange()"
                    />
                  </div>
                </div>

                <div class="qr-form-row">
                  <label for="event-desc" class="qr-sub-label">Description / Agenda</label>
                  <textarea
                    id="event-desc"
                    class="qr-textarea"
                    dir="auto"
                    rows="3"
                    placeholder="Keynote presentation, networking, and live demos."
                    [(ngModel)]="eventData.description"
                    (ngModelChange)="onEventChange()"
                  ></textarea>
                </div>
              </div>
            </details>
          </div>
        }

        <!-- 9. vCARD 3.0 / MECARD -->
        @if (selectedType() === 'vcard') {
          <div class="qr-structured-form">
            <div class="qr-input-grid">
              <div class="qr-form-row">
                <label for="vcard-fn" class="qr-sub-label">First Name *</label>
                <input
                  id="vcard-fn"
                  type="text"
                  class="qr-input"
                  placeholder="Alex"
                  [(ngModel)]="vcardData.firstName"
                  (ngModelChange)="onVCardChange()"
                />
              </div>
              <div class="qr-form-row">
                <label for="vcard-ln" class="qr-sub-label">Last Name</label>
                <input
                  id="vcard-ln"
                  type="text"
                  class="qr-input"
                  placeholder="Mercer"
                  [(ngModel)]="vcardData.lastName"
                  (ngModelChange)="onVCardChange()"
                />
              </div>
            </div>

            <div class="qr-input-grid">
              <div class="qr-form-row">
                <app-phone-input
                  id="vcard-phone-input"
                  label="Mobile Phone"
                  [initialValue]="vcardData.phone || ''"
                  (valueChange)="onVCardPhoneInputValueChange($event)"
                />
              </div>
              <div class="qr-form-row">
                <label for="vcard-email" class="qr-sub-label">Email Address</label>
                <input
                  id="vcard-email"
                  type="email"
                  class="qr-input"
                  placeholder="alex@example.com"
                  [(ngModel)]="vcardData.email"
                  (ngModelChange)="onVCardChange()"
                />
              </div>
            </div>

            <details class="more-options">
              <summary>More options (Company, Address & Format)</summary>
              <div class="options-content">
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="vcard-format" class="qr-sub-label">Format Standard</label>
                    <app-qr-select
                      id="vcard-format"
                      [options]="vcardFormatOptions"
                      [value]="vcardData.format"
                      (valueChange)="vcardData.format = $event; onVCardChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="vcard-org" class="qr-sub-label">Org. / Company</label>
                    <input
                      id="vcard-org"
                      type="text"
                      class="qr-input"
                      placeholder="Acklet Inc."
                      [(ngModel)]="vcardData.company"
                      (ngModelChange)="onVCardChange()"
                    />
                  </div>
                </div>

                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="vcard-title" class="qr-sub-label">Job Title</label>
                    <input
                      id="vcard-title"
                      type="text"
                      class="qr-input"
                      placeholder="Lead Architect"
                      [(ngModel)]="vcardData.title"
                      (ngModelChange)="onVCardChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="vcard-web" class="qr-sub-label">Website</label>
                    <input
                      id="vcard-web"
                      type="url"
                      class="qr-input"
                      placeholder="https://acklet.com"
                      [(ngModel)]="vcardData.website"
                      (ngModelChange)="onVCardChange()"
                    />
                  </div>
                </div>

                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="vcard-street" class="qr-sub-label">Street Address</label>
                    <input
                      id="vcard-street"
                      type="text"
                      class="qr-input"
                      placeholder="100 Market St"
                      [(ngModel)]="vcardData.street"
                      (ngModelChange)="onVCardChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="vcard-city" class="qr-sub-label">City, State / Region</label>
                    <input
                      id="vcard-city"
                      type="text"
                      class="qr-input"
                      placeholder="San Francisco, CA"
                      [(ngModel)]="vcardData.city"
                      (ngModelChange)="onVCardChange()"
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>
        }

        <!-- 10. SOCIAL PROFILE -->
        @if (selectedType() === 'social') {
          <div class="qr-structured-form">
            <app-social-link-input
              [initialPlatform]="socialData.platform"
              [initialValue]="socialData.handleOrUrl"
              [hasCenterIconActive]="hasCenterIconActive()"
              (valueChange)="onSocialInputValueChange($event)"
              (addCenterIcon)="onAddSocialCenterIcon($event)"
              (removeCenterIcon)="onRemoveSocialCenterIcon()"
            />
          </div>
        }

        <!-- 11. APP STORE -->
        @if (selectedType() === 'app') {
          <div class="qr-structured-form">
            <div class="qr-form-row">
              <label for="app-platform" class="qr-sub-label">Mobile Store</label>
              <app-qr-select
                id="app-platform"
                [options]="appPlatformOptions"
                [value]="appData.platform"
                (valueChange)="appData.platform = $event; onAppChange()"
              />
            </div>

            @if (appData.platform === 'both') {
              <div class="attachment-protocol-note">
                <ts-icon name="info" class="note-icon" />
                <span>Smart App Links that automatically redirect iPhone users to Apple App Store and Android users to Google Play require a hosted shortlink (coming in Stage 6). You can configure both stores below:</span>
              </div>
            }

            @if (appData.platform === 'ios' || appData.platform === 'both') {
              <div class="qr-form-row">
                <label for="app-ios" class="qr-sub-label">Apple App Store Link or ID *</label>
                <input
                  id="app-ios"
                  type="text"
                  class="qr-input"
                  [class.invalid-input]="appIosError()"
                  placeholder="e.g. apps.apple.com/... or numeric ID like 123456789"
                  [ngModel]="appData.iosUrl"
                  (ngModelChange)="onIosAppInputChange($event)"
                />
                @if (appIosError()) {
                  <span class="inline-input-error">{{ appIosError() }}</span>
                }
              </div>
            }

            @if (appData.platform === 'android' || appData.platform === 'both') {
              <div class="qr-form-row">
                <label for="app-android" class="qr-sub-label">Google Play Store Link or Package *</label>
                <input
                  id="app-android"
                  type="text"
                  class="qr-input"
                  [class.invalid-input]="appAndroidError()"
                  placeholder="e.g. play.google.com/... or com.example.app"
                  [ngModel]="appData.androidUrl"
                  (ngModelChange)="onAndroidAppInputChange($event)"
                />
                @if (appAndroidError()) {
                  <span class="inline-input-error">{{ appAndroidError() }}</span>
                }
              </div>
            }

            <details class="more-options">
              <summary>More options (Desktop Fallback Landing Page)</summary>
              <div class="options-content">
                <div class="qr-form-row">
                  <label for="app-fallback" class="qr-sub-label">Fallback URL (for desktop browsers)</label>
                  <input
                    id="app-fallback"
                    type="url"
                    class="qr-input"
                    placeholder="https://example.com/download"
                    [(ngModel)]="appData.fallbackUrl"
                    (ngModelChange)="onAppChange()"
                  />
                </div>
              </div>
            </details>
          </div>
        }

        <!-- 12. CRYPTO WALLET -->
        @if (selectedType() === 'crypto') {
          <div class="qr-structured-form">
            <div class="qr-input-grid">
              <div class="qr-form-row">
                <label for="crypto-coin" class="qr-sub-label">Cryptocurrency</label>
                <app-qr-select
                  id="crypto-coin"
                  [options]="cryptoCoinOptions"
                  [value]="cryptoData.coin"
                  (valueChange)="cryptoData.coin = $event; onCryptoChange()"
                />
              </div>

              <div class="qr-form-row">
                <label for="crypto-amount" class="qr-sub-label">Requested Amount (Optional)</label>
                <input
                  id="crypto-amount"
                  type="text"
                  class="qr-input"
                  placeholder="0.05"
                  [(ngModel)]="cryptoData.amount"
                  (ngModelChange)="onCryptoChange()"
                />
              </div>
            </div>

            <div class="qr-form-row">
              <label for="crypto-addr" class="qr-sub-label">Receiving Wallet Address *</label>
              <div class="qr-single-input-wrapper">
                <ts-icon name="wallet" class="input-leading-icon" />
                <input
                  id="crypto-addr"
                  type="text"
                  class="qr-input"
                  placeholder="e.g. 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                  [(ngModel)]="cryptoData.address"
                  (ngModelChange)="onCryptoChange()"
                />
              </div>
            </div>

            <details class="more-options">
              <summary>More options (Payment Label & Description)</summary>
              <div class="options-content">
                <div class="qr-input-grid">
                  <div class="qr-form-row">
                    <label for="crypto-label" class="qr-sub-label">Payment Label</label>
                    <input
                      id="crypto-label"
                      type="text"
                      class="qr-input"
                      placeholder="Acklet Invoice #1024"
                      [(ngModel)]="cryptoData.label"
                      (ngModelChange)="onCryptoChange()"
                    />
                  </div>
                  <div class="qr-form-row">
                    <label for="crypto-msg" class="qr-sub-label">Payment Message</label>
                    <input
                      id="crypto-msg"
                      type="text"
                      class="qr-input"
                      placeholder="Thank you for your business"
                      [(ngModel)]="cryptoData.message"
                      (ngModelChange)="onCryptoChange()"
                    />
                  </div>
                </div>
              </div>
            </details>
          </div>
        }

        <!-- Status line under input -->
        <div class="qr-field-footer">
          @if (activeConfig().helperText) {
            <p id="qr-input-helper" class="qr-field-helper">
              {{ activeConfig().helperText }}
            </p>
          }

          @if (!content().trim()) {
            <div class="status-line status-empty">
              <span class="status-dot empty-dot"></span>
              <span class="status-text">Enter details above to generate your live QR code</span>
            </div>
          } @else if (validationError(); as errorMsg) {
            <div class="status-line status-error" role="alert">
              <ts-icon name="alert-circle" class="status-icon error-icon" />
              <span class="status-text">{{ errorMsg }}</span>
              @if (selectedType() === 'url' && canFixUrl()) {
                <button
                  type="button"
                  class="status-fix-link"
                  (click)="fixUrlProtocol()"
                  title="Fix URL by prepending https://"
                  aria-label="Fix URL by prepending https://"
                >
                  Fix with https://
                </button>
              }
            </div>
          } @else {
            <div class="status-line status-ready">
              <span class="status-dot ready-dot"></span>
              <span class="status-text">Ready to download</span>
            </div>
          }
        </div>


        <!-- Pinned Consumer Guided Actions Footer (Desktop only) -->
        @if (!isMobileFlow()) {
          <div class="content-guided-footer">
            <button
              type="button"
              class="guided-next-btn"
              (click)="switchTab.emit('design')"
              title="Proceed to design & styling"
            >
              <span>Customize Design</span>
              <ts-icon name="arrow-right" class="guided-btn-icon" />
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .qr-input-panel-body {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .qr-field-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .qr-active-type-label {
      font-size: 13px;
      font-weight: 650;
      color: var(--text, #fcfcfc);
    }

    .qr-type-tab {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.5rem 0.5rem;
      border-radius: 7px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .qr-type-tab:hover {
      background: var(--surface, #1e2027);
      color: var(--text, #fcfcfc);
    }

    .qr-type-tab.active {
      background: var(--surface, #1e2027);
      color: var(--accent-strong, #60a5fa);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--accent-border, rgba(59, 130, 246, 0.3));
    }

    .tab-icon {
      width: 0.95rem;
      height: 0.95rem;
      flex-shrink: 0;
    }

    /* Presets Row */
    .qr-presets-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .presets-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-right: 0.25rem;
    }

    .qr-preset-chip {
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      font-size: 0.75rem;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .qr-preset-chip:hover {
      background: var(--accent-soft, rgba(59, 130, 246, 0.15));
      border-color: var(--accent-border, rgba(59, 130, 246, 0.3));
      color: var(--accent-strong, #60a5fa);
    }

    /* Form Fields */
    .qr-field-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .qr-field-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      font-weight: 550;
      color: var(--text, #fcfcfc);
      margin-bottom: 8px;
    }

    .qr-sub-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-2, rgba(255, 255, 255, 0.75));
    }

    .qr-char-counter {
      font-size: 0.75rem;
      font-family: var(--font-mono, monospace);
      color: var(--text-3, rgba(255, 255, 255, 0.45));
    }

    .qr-char-counter.warn {
      color: #f59e0b;
      font-weight: 600;
    }

    .qr-structured-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .qr-form-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .qr-input-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .qr-single-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .input-leading-icon {
      position: absolute;
      left: 0.875rem;
      width: 1rem;
      height: 1rem;
      color: var(--text-3, rgba(255, 255, 255, 0.45));
      pointer-events: none;
    }

    .qr-input-action-btn {
      position: absolute;
      right: 0.625rem;
      background: transparent;
      border: none;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 4px;
      transition: color 0.15s ease;
    }

    .qr-input-action-btn:hover {
      color: var(--text, #fcfcfc);
    }

    .action-icon {
      width: 1rem;
      height: 1rem;
    }

    .qr-textarea {
      width: 100%;
      background: var(--surface-2, #16233D);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 0.75rem 0.875rem;
      color: var(--text-primary, #fcfcfc);
      font-size: 0.875rem;
      font-family: inherit;
      line-height: 1.5;
      resize: vertical;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }

    .qr-input,
    .qr-select {
      width: 100%;
      height: 2.375rem;
      background: var(--surface-2, #16233D);
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 8px;
      padding: 0 0.875rem;
      color: var(--text-primary, #fcfcfc);
      font-size: 0.875rem;
      font-family: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;
    }

    :host-context([data-theme="light"]) .qr-textarea,
    :host-context([data-theme="light"]) .qr-input,
    :host-context([data-theme="light"]) .qr-select,
    [data-theme="light"] .qr-textarea,
    [data-theme="light"] .qr-input,
    [data-theme="light"] .qr-select {
      background: #FFFFFF !important;
      border: 1px solid var(--border-subtle, #E2E8F0);
      color: var(--text-primary, #09090B);
    }

    .qr-single-input-wrapper .qr-input {
      padding-left: 2.625rem;
    }

    .qr-textarea:focus,
    .qr-input:focus,
    .qr-select:focus {
      outline: none;
      border-color: var(--accent, #3b82f6);
      box-shadow: 0 0 0 3px var(--accent-2-glow, rgba(59, 130, 246, 0.25));
    }

    .qr-checkbox-row {
      display: flex;
      align-items: center;
      margin-top: 0.25rem;
    }

    .qr-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      cursor: pointer;
    }

    .qr-checkbox {
      accent-color: var(--accent, #3b82f6);
      width: 1rem;
      height: 1rem;
      cursor: pointer;
    }

    /* Collapsible More Options */
    details.more-options {
      margin-top: 16px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.02));
      transition: border-color 0.2s ease;
      position: relative;
    }

    details.more-options:not([open]) {
      overflow: hidden;
    }

    details.more-options[open] {
      overflow: visible;
      z-index: 25;
    }

    details.more-options[open]:has(.qr-select-container.is-open),
    details.more-options[open]:has(app-qr-select .is-open) {
      z-index: 100;
    }

    .qr-form-row:has(.is-open),
    .qr-form-row:has(app-qr-select .qr-select-container.is-open) {
      position: relative;
      z-index: 100;
    }

    details.more-options summary {
      padding: 10px 16px;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      list-style: none;
    }

    details.more-options summary::-webkit-details-marker {
      display: none;
    }

    details.more-options summary::before {
      content: '';
      display: inline-block;
      width: 0.35rem;
      height: 0.35rem;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(-45deg);
      transition: transform 0.2s ease;
    }

    details.more-options[open] summary::before {
      transform: rotate(45deg);
    }

    details.more-options .options-content {
      padding: 16px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow: visible;
    }

    /* Status Line Under Input */
    .qr-field-footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }

    .qr-field-helper {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .status-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      line-height: 1.4;
      padding: 4px 0;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .ready-dot {
      background: var(--tool-accent, var(--accent, #3b82f6));
      box-shadow: 0 0 6px var(--accent-border, rgba(59, 130, 246, 0.4));
    }

    .empty-dot {
      background: var(--text-3, rgba(255, 255, 255, 0.35));
    }

    .status-empty .status-text {
      color: var(--text-3, rgba(255, 255, 255, 0.55));
      font-weight: 450;
      font-style: italic;
    }

    .status-ready .status-text {
      color: var(--text-muted, var(--text-2, rgba(255, 255, 255, 0.75)));
      font-weight: 500;
    }

    /* Pinned Consumer Guided Actions Footer */
    .content-guided-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 14px;
      margin-bottom : 12px;
      padding-top: 14px;
      border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    }

    :host-context([data-theme="light"]) .content-guided-footer,
    [data-theme="light"] .content-guided-footer {
      border-top-color: var(--border, #E2E8F0);
    }

    .guided-next-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 15px;
      border-radius: var(--ts-radius-md, 8px);
      background: var(--tool-accent, var(--accent, #3b82f6)) !important;
      color: #FFFFFF !important;
      font-size: 13px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .guided-next-btn:hover {
      background: var(--tool-accent, var(--accent, #3b82f6)) !important;
      color: #FFFFFF !important;
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(59, 130, 246, 0.3);
    }

    .guided-next-btn:active {
      transform: translateY(0);
    }

    .guided-btn-icon {
      width: 13px;
      height: 13px;
      transition: transform 0.15s ease;
    }

    .guided-next-btn:hover .guided-btn-icon {
      transform: translateX(2px);
    }

    .guided-skip-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-2, rgba(255, 255, 255, 0.7));
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      border-radius: var(--ts-radius-md, 8px);
      transition: all 0.15s ease;
    }

    .guided-skip-btn:hover:not(:disabled) {
      color: var(--text, #FFFFFF);
      background: var(--surface-2, rgba(255, 255, 255, 0.06));
      border-color: var(--border, rgba(255, 255, 255, 0.12));
    }

    :host-context([data-theme="light"]) .guided-skip-btn,
    [data-theme="light"] .guided-skip-btn {
      color: var(--text-2, #52525B);
    }

    :host-context([data-theme="light"]) .guided-skip-btn:hover:not(:disabled),
    [data-theme="light"] .guided-skip-btn:hover:not(:disabled) {
      color: var(--text, #09090B);
      background: var(--surface-2, #F1F5F9);
      border-color: var(--border, #E2E8F0);
    }

    .guided-skip-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .skip-btn-icon {
      width: 12px;
      height: 12px;
    }

    .tracking-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: var(--tool-accent, var(--accent, #3b82f6));
      user-select: none;
      padding: 4px 0;
    }

    .summary-plus-icon {
      width: 13px;
      height: 13px;
    }

    /* Plain Text Type Nudge Pill */
    .type-nudge-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 8px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.25);
      font-size: 12px;
      color: var(--text-primary, #ffffff);
    }

    :host-context([data-theme="light"]) .type-nudge-pill {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #1e1b4b;
    }

    .nudge-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--accent-primary, #818cf8);
    }

    :host-context([data-theme="light"]) .nudge-icon {
      color: #4f46e5;
    }

    .nudge-text {
      flex: 1 1 0%;
      min-width: 0;
      line-height: 1.35;
    }

    .nudge-switch-btn {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border: none;
      border-radius: 5px;
      background: var(--accent-primary, #6366f1);
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
    }

    .nudge-dismiss-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: var(--text-tertiary, rgba(255, 255, 255, 0.5));
      cursor: pointer;
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .nudge-dismiss-btn {
      color: #64748b;
    }

    .nudge-dismiss-btn ts-icon {
      width: 12px;
      height: 12px;
    }

    /* Honest Attachment Protocol Note */
    .attachment-protocol-note {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 8px 10px;
      border-radius: 7px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      font-size: 11.5px;
      line-height: 1.4;
      color: var(--text-tertiary, rgba(255, 255, 255, 0.65));
    }

    :host-context([data-theme="light"]) .attachment-protocol-note {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #475569;
    }

    .attachment-protocol-note .note-icon {
      width: 13px;
      height: 13px;
      margin-top: 2px;
      flex-shrink: 0;
      opacity: 0.7;
    }

    /* Event Form Top Bar */
    .event-form-top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .form-section-tip {
      font-size: 11.5px;
      color: var(--text-tertiary, rgba(255, 255, 255, 0.6));
    }

    :host-context([data-theme="light"]) .form-section-tip {
      color: #64748b;
    }

    .fill-example-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
      border-radius: 6px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      color: var(--text-secondary, rgba(255, 255, 255, 0.85));
      font-size: 11.5px;
      font-weight: 500;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color 120ms ease;
    }

    :host-context([data-theme="light"]) .fill-example-btn {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: #1e293b;
    }

    .fill-example-btn:hover {
      background: var(--surface-3, rgba(255, 255, 255, 0.1));
    }

    .fill-example-btn ts-icon {
      width: 12px;
      height: 12px;
      color: #f59e0b;
    }

    .warning-dot {
      background: #f59e0b;
      box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
    }

    .dense-dot {
      background: #38bdf8;
      box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
    }

    .status-dense {
      color: var(--text-secondary, rgba(255, 255, 255, 0.75));
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .status-dense {
      color: #475569;
    }

    .status-warning {
      color: #f59e0b;
      font-weight: 500;
    }

    .status-error {
      color: #ef4444;
      font-weight: 500;
    }

    .status-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .status-action-link,
    .status-fix-link {
      background: transparent;
      border: none;
      padding: 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--tool-accent, var(--accent, #3b82f6));
      text-decoration: underline;
      cursor: pointer;
      margin-left: 4px;
      transition: color 0.15s ease;
    }

    .status-action-link:hover,
    .status-fix-link:hover {
      color: var(--accent-strong, #60a5fa);
    }

    /* Capacity Warning Badge (Only displayed when > 80%) */
    .qr-capacity-warning-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 9999px;
      padding: 2px 8px;
    }

    .warning-badge-icon {
      width: 11px;
      height: 11px;
    }

    .header-actions-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .header-dynamic-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.12);
      color: var(--accent-strong, #60a5fa);
      border: 1px solid rgba(59, 130, 246, 0.25);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .header-dynamic-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.4);
    }

    .dynamic-qr-box {
      margin-top: 16px;
      padding: 16px;
      border-radius: 8px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--accent-border, rgba(59, 130, 246, 0.3));
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .dynamic-box-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .dynamic-box-title {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .dyn-icon {
      width: 18px;
      height: 18px;
      color: var(--tool-accent, var(--accent, #3b82f6));
      margin-top: 0.125rem;
      flex-shrink: 0;
    }

    .dyn-heading {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text, #fff);
      margin: 0 0 0.125rem 0;
    }

    .dyn-desc {
      font-size: 0.75rem;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      margin: 0;
    }

    .dynamic-fields-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .dynamic-action-row {
      display: flex;
      justify-content: flex-start;
      margin-top: 8px;
    }

    .btn-create-dynamic {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      background: var(--accent, #3b82f6);
      color: #fff;
      font-size: 0.8125rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-create-dynamic:hover:not(:disabled) {
      background: var(--accent-strong, #2563eb);
    }

    .btn-create-dynamic:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dyn-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin: 0;
    }

    .dynamic-success-card {
      margin-top: 0.5rem;
      padding: 0.875rem;
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.25);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .success-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #22c55e;
      font-weight: 600;
      font-size: 0.8125rem;
    }

    .success-sub {
      font-size: 0.75rem;
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      margin: 0;
    }

    .dyn-url-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.25);
      padding: 0.375rem 0.625rem;
      border-radius: 6px;
    }

    .short-url-code {
      flex: 1;
      font-family: var(--font-mono, monospace);
      font-size: 0.8125rem;
      color: var(--accent-strong, #60a5fa);
    }

    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 4px;
      background: var(--accent, #3b82f6);
      color: #fff;
      border: none;
      cursor: pointer;
    }

    .manage-key-alert {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .key-alert-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: #eab308;
    }

    .key-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .key-code {
      flex: 1;
      font-family: var(--font-mono, monospace);
      font-size: 0.75rem;
      color: #fde047;
      word-break: break-all;
    }

    .copy-btn-sm {
      padding: 0.2rem 0.4rem;
      font-size: 0.6875rem;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }

    .key-note {
      font-size: 0.6875rem;
      color: var(--text-3, rgba(255, 255, 255, 0.6));
      margin: 0;
      line-height: 1.4;
    }

    @media (max-width: 768px) {
      .qr-type-tabs {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 520px) {
      .qr-type-tabs {
        grid-template-columns: repeat(2, 1fr);
      }
      .qr-input-grid,
      .dynamic-fields-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Plain Text Header & Live Counter */
    .text-input-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .text-input-header .qr-sub-label {
      margin-bottom: 0;
    }

    .text-live-counter {
      font-size: 0.72rem;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
      color: var(--text-muted, rgba(255, 255, 255, 0.55));
      transition: color 0.15s ease;
    }

    :host-context([data-theme="light"]) .text-live-counter {
      color: #64748b;
    }

    .text-live-counter.counter-warning {
      color: #f59e0b;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .text-live-counter.counter-warning {
      color: #b45309;
    }

    .text-live-counter.counter-danger {
      color: var(--destructive, #ef4444);
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .text-live-counter.counter-danger {
      color: #dc2626;
    }

    /* Warning & Error Feedback Pills */
    .text-warning-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 6px;
      color: #fbbf24;
      font-size: 0.75rem;
      font-weight: 550;
      margin-top: 6px;
    }

    :host-context([data-theme="light"]) .text-warning-pill {
      background: #fffbeb;
      border-color: #fde68a;
      color: #92400e;
    }

    .text-error-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #f87171;
      font-size: 0.75rem;
      font-weight: 550;
      margin-top: 6px;
    }

    :host-context([data-theme="light"]) .text-error-pill {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .status-pill-icon {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .text-scan-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 6px;
      color: var(--text-2, rgba(255, 255, 255, 0.75));
      font-size: 0.75rem;
      font-weight: 450;
      margin-top: 6px;
    }

    :host-context([data-theme="light"]) .text-scan-hint {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #334155;
    }

    .text-scan-hint .hint-icon {
      width: 14px;
      height: 14px;
      color: var(--tool-accent, #38bdf8);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .text-scan-hint .hint-icon {
      color: #0284c7;
    }

    /* Plain Text Mode Toggle */
    .text-mode-container {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .text-mode-segmented-control {
      display: flex;
      background: var(--surface-2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      padding: 3px;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .text-mode-segmented-control {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .text-mode-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 12px;
      font-size: 0.8125rem;
      font-weight: 550;
      color: var(--text-muted, rgba(255, 255, 255, 0.65));
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      min-height: 36px;
    }

    :host-context([data-theme="light"]) .text-mode-btn {
      color: #64748b;
    }

    .text-mode-btn:hover:not(:disabled) {
      color: var(--text-1, #ffffff);
      background: rgba(255, 255, 255, 0.06);
    }

    :host-context([data-theme="light"]) .text-mode-btn:hover:not(:disabled) {
      color: #0f172a;
      background: rgba(0, 0, 0, 0.04);
    }

    .text-mode-btn.active {
      background: var(--surface-1, #1e293b);
      color: var(--tool-accent, #38bdf8);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    :host-context([data-theme="light"]) .text-mode-btn.active {
      background: #ffffff;
      color: #0284c7;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .text-mode-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .mode-btn-icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }

    .text-mode-helper {
      margin: 0;
      font-size: 0.775rem;
      line-height: 1.5;
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
    }

    :host-context([data-theme="light"]) .text-mode-helper {
      color: #475467;
    }

    .text-clipboard-unavailable-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: #f87171;
      font-size: 0.75rem;
      font-weight: 550;
    }

    :host-context([data-theme="light"]) .text-clipboard-unavailable-pill {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .notes-link-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px 12px;
      background: var(--surface-2, rgba(255, 255, 255, 0.03));
      border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
    }

    :host-context([data-theme="light"]) .notes-link-options {
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .notes-expiry-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .notes-expiry-row .qr-sub-label {
      margin-bottom: 0;
      font-size: 0.775rem;
    }

    .expiry-segmented-control {
      display: inline-flex;
      background: var(--surface-1, rgba(255, 255, 255, 0.06));
      border-radius: 6px;
      padding: 2px;
      gap: 2px;
    }

    :host-context([data-theme="light"]) .expiry-segmented-control {
      background: #e2e8f0;
    }

    .expiry-pill {
      border: none;
      background: transparent;
      color: var(--text-muted, rgba(255, 255, 255, 0.65));
      font-size: 0.72rem;
      font-weight: 550;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    :host-context([data-theme="light"]) .expiry-pill {
      color: #475467;
    }

    .expiry-pill.active {
      background: var(--surface-2, #334155);
      color: #ffffff;
      font-weight: 600;
    }

    :host-context([data-theme="light"]) .expiry-pill.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }

    .notes-privacy-note {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.725rem;
      color: var(--text-muted, rgba(255, 255, 255, 0.6));
    }

    :host-context([data-theme="light"]) .notes-privacy-note {
      color: #64748b;
    }

    .privacy-icon {
      width: 12px;
      height: 12px;
      color: var(--tool-accent, #38bdf8);
      flex-shrink: 0;
    }

    :host-context([data-theme="light"]) .privacy-icon {
      color: #0284c7;
    }

    .notes-syncing-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.725rem;
      color: var(--tool-accent, #38bdf8);
      font-weight: 500;
    }

    :host-context([data-theme="light"]) .notes-syncing-indicator {
      color: #0284c7;
    }

    .spinner-tiny {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(56, 189, 248, 0.2);
      border-top-color: var(--tool-accent, #38bdf8);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    :host-context([data-theme="light"]) .spinner-tiny {
      border-color: rgba(2, 132, 199, 0.2);
      border-top-color: #0284c7;
    }

    .notes-created-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.725rem;
      color: #34d399;
      word-break: break-all;
    }

    :host-context([data-theme="light"]) .notes-created-pill {
      color: #059669;
    }

    .notes-created-pill code {
      font-family: var(--font-mono, monospace);
      font-size: 0.7rem;
      background: rgba(16, 185, 129, 0.1);
      padding: 1px 4px;
      border-radius: 4px;
    }

    .invalid-input,
    .qr-textarea.has-error {
      border-color: var(--destructive, #ef4444) !important;
    }

    .inline-input-error {
      font-size: 0.6875rem;
      color: var(--destructive, #ef4444);
      margin-top: 4px;
      display: block;
      font-weight: 500;
    }

    /* Mobile Zoom Prevention & Touch Comfort (iOS Safari font-size >= 16px) */
    @media (max-width: 1023px) {
      .qr-input,
      .qr-select,
      .qr-textarea {
        font-size: 16px !important;
        min-height: 44px;
      }
    }

  `]
})
export class InputPanelComponent {
  private qrService: QRGeneratorService;
  readonly dynamicService: QrDynamicService;
  readonly smartLinkService = inject(SmartLinkService);

  constructor(
    qrService?: QRGeneratorService,
    dynamicService?: QrDynamicService
  ) {
    this.qrService = qrService ?? inject(QRGeneratorService);
    this.dynamicService = dynamicService ?? inject(QrDynamicService);
  }

  readonly selectedType = input<ContentType>('url');
  readonly content = input<string>('');
  readonly validationError = input<string | null>(null);
  readonly isGenerating = input<boolean>(false);
  readonly qrVersion = input<number>(1);
  readonly capacityUsedPercent = input<number>(0);
  readonly isMobileFlow = input<boolean>(false);
  readonly hasCenterIconActive = input<boolean>(false);

  readonly typeChange = output<ContentType>();
  readonly contentChange = output<string>();
  readonly openDynamicManager = output<void>();
  readonly switchTab = output<'content' | 'design' | 'settings' | 'advanced' | string>();
  readonly addSocialCenterIcon = output<{ iconId: string; platformName: string }>();
  readonly removeSocialCenterIcon = output<void>();

  readonly appIosError = signal<string>('');
  readonly appAndroidError = signal<string>('');

  canFixUrl(): boolean {
    const url = (this.websiteData.url || '').trim();
    return !!url && !/^https?:\/\//i.test(url);
  }

  fixUrlProtocol(): void {
    const url = (this.websiteData.url || '').trim();
    if (url && !/^https?:\/\//i.test(url)) {
      this.websiteData.url = 'https://' + url;
      this.onWebsiteChange();
    }
  }

  readonly dynamicTitle = signal<string>('');
  readonly dynamicSlug = signal<string>('');
  readonly dynamicPassword = signal<string>('');
  readonly isCreatingDynamic = signal<boolean>(false);
  readonly dynamicError = signal<string | null>(null);
  readonly lastCreatedDynamic = signal<DynamicQrCode | null>(null);

  readonly dismissedTextNudge = signal<boolean>(false);

  // Plain Text computed metrics & limits
  readonly textCharCount = computed(() => {
    return this.content() ? normalizeLineEndings(this.content()).length : 0;
  });

  readonly textByteCount = computed(() => {
    return this.content() ? countUtf8Bytes(this.content()) : 0;
  });

  readonly textCharCountFormatted = computed(() => {
    return this.textCharCount().toLocaleString('en-US');
  });

  readonly isTextOverCharLimit = computed(() => {
    return this.selectedType() === 'text' && this.textCharCount() > MAX_TEXT_CHARS;
  });

  readonly isTextOverByteLimit = computed(() => {
    return this.selectedType() === 'text' && this.textByteCount() > MAX_TEXT_BYTES;
  });

  readonly isByteCapHitFirst = computed(() => {
    return this.selectedType() === 'text' && !this.isTextOverCharLimit() && this.isTextOverByteLimit();
  });

  readonly isByteCapLimiting = computed(() => {
    return (
      this.selectedType() === 'text' &&
      this.textCharCount() > 10 &&
      this.textByteCount() > this.textCharCount() * 1.5
    );
  });

  readonly isTextLargeHint = computed(() => {
    return (
      this.selectedType() === 'text' &&
      this.textByteCount() > LARGE_TEXT_BYTES_THRESHOLD &&
      !this.isTextOverByteLimit() &&
      !this.isTextOverCharLimit()
    );
  });

  readonly textTypeNudge = computed<{ type: 'url' | 'email' | 'phone'; targetLabel: string; message: string } | null>(() => {
    if (this.selectedType() !== 'text' || this.dismissedTextNudge()) {
      return null;
    }
    const detected = detectPotentialTextType(this.content());
    if (!detected) return null;

    if (detected === 'url') {
      return {
        type: 'url',
        targetLabel: 'Website Link',
        message: 'This text looks like a website link. Switch to Website Link for 1-tap browser opening?'
      };
    }
    if (detected === 'email') {
      return {
        type: 'email',
        targetLabel: 'Email',
        message: 'This text looks like an email address. Switch to Email for 1-tap compose?'
      };
    }
    if (detected === 'phone') {
      return {
        type: 'phone',
        targetLabel: 'Phone',
        message: 'This text looks like a phone number. Switch to Phone for 1-tap calling?'
      };
    }
    return null;
  });

  dismissTextNudge(): void {
    this.dismissedTextNudge.set(true);
  }

  applyTextTypeSwitch(type: 'url' | 'email' | 'phone'): void {
    const text = this.content().trim();
    if (type === 'url') {
      this.websiteData.url = text;
      this.onWebsiteChange();
      this.onTypeSelect('url');
    } else if (type === 'email') {
      this.emailData.to = text;
      this.onEmailChange();
      this.onTypeSelect('email');
    } else if (type === 'phone') {
      this.phoneData.number = text;
      this.onPhoneChange();
      this.onTypeSelect('phone');
    }
    this.dismissedTextNudge.set(false);
  }

  onDynamicTitleChange(event: Event): void {
    this.dynamicTitle.set((event.target as HTMLInputElement).value);
  }

  onDynamicSlugChange(event: Event): void {
    this.dynamicSlug.set((event.target as HTMLInputElement).value);
  }

  onDynamicPasswordChange(event: Event): void {
    this.dynamicPassword.set((event.target as HTMLInputElement).value);
  }

  async createDynamicLink(): Promise<void> {
    const url = this.websiteData.url.trim();
    if (!url) return;

    this.isCreatingDynamic.set(true);
    this.dynamicError.set(null);

    try {
      const created = await this.dynamicService.createDynamicQr({
        type: 'DYNAMIC_URL',
        title: this.dynamicTitle().trim() || undefined,
        targetUrl: url,
        password: this.dynamicPassword().trim() || undefined,
        customSlug: this.dynamicSlug().trim() || undefined
      });

      this.lastCreatedDynamic.set(created);
      this.websiteData.url = created.shortUrl;
      this.onWebsiteChange();

      this.smartLinkService.saveStoredLink({
        code: created.code,
        manageToken: created.manageKey || '',
        type: 'URL',
        shortUrl: created.shortUrl,
        createdAt: new Date().toISOString(),
        preview: url.slice(0, 60),
        payload: url,
        status: created.status || 'ACTIVE',
        explicit: true,
        title: this.dynamicTitle().trim() || undefined
      });
    } catch (err: unknown) {
      this.dynamicError.set(err instanceof Error ? err.message : 'Failed to create dynamic link');
    } finally {
      this.isCreatingDynamic.set(false);
    }
  }

  readonly contentTypes: ContentType[] = [
    'url',
    'text',
    'email',
    'phone',
    'sms',
    'wifi',
    'geo',
    'event',
    'vcard',
    'social',
    'app',
    'crypto'
  ];
  readonly typeConfigs = CONTENT_TYPE_CONFIGS;

  readonly activeConfig = computed(() => this.typeConfigs[this.selectedType()]);
  readonly contentLength = computed(() => this.content().length);

  readonly formattedPayload = computed(() => {
    return this.qrService.formatPayload(this.content(), this.selectedType());
  });

  // Dropdown Options
  readonly smsFormatOptions: QrSelectOption<string>[] = [
    { value: 'sms', label: 'sms: (RFC 5724 standard - Recommended)' },
    { value: 'SMSTO', label: 'SMSTO: (Legacy Android format)' }
  ];

  readonly wifiEncryptionOptions: QrSelectOption<string>[] = [
    { value: 'WPA', label: 'WPA / WPA2 / WPA3 (Recommended)' },
    { value: 'WEP', label: 'WEP (Legacy)' },
    { value: 'nopass', label: 'None (Open Network)' }
  ];

  readonly wifiEapOptions: QrSelectOption<string>[] = [
    { value: '', label: 'None (Personal)' },
    { value: 'PEAP', label: 'PEAP' },
    { value: 'TLS', label: 'TLS' },
    { value: 'TTLS', label: 'TTLS' },
    { value: 'PWD', label: 'PWD' }
  ];

  readonly geoProviderOptions: QrSelectOption<string>[] = [
    { value: 'geo', label: 'RFC 5870 Geo URI (geo:lat,lng - Universal)' },
    { value: 'google', label: 'Google Maps Web Link (https://google.com/maps?...)' },
    { value: 'apple', label: 'Apple Maps Web Link (https://maps.apple.com/...)' }
  ];

  readonly eventRepeatOptions: QrSelectOption<string>[] = [
    { value: 'none', label: 'One-time event' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

  readonly eventReminderOptions: QrSelectOption<number>[] = [
    { value: 0, label: 'No alarm' },
    { value: 15, label: '15 minutes before' },
    { value: 30, label: '30 minutes before' },
    { value: 60, label: '1 hour before' },
    { value: 1440, label: '1 day before' }
  ];

  readonly vcardFormatOptions: QrSelectOption<string>[] = [
    { value: 'vcard3', label: 'vCard 3.0 (Full featured, universal standard)' },
    { value: 'mecard', label: 'MECARD (Compact, NTT DoCoMo standard)' }
  ];

  readonly socialPlatformOptions: QrSelectOption<SocialPlatform>[] = [
    { value: 'instagram', label: 'Instagram', icon: 'instagram' },
    { value: 'x', label: 'X (formerly Twitter)', icon: 'x' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
    { value: 'youtube', label: 'YouTube', icon: 'youtube' },
    { value: 'facebook', label: 'Facebook', icon: 'facebook' },
    { value: 'tiktok', label: 'TikTok', icon: 'tiktok' },
    { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
    { value: 'telegram', label: 'Telegram', icon: 'telegram' },
    { value: 'github', label: 'GitHub', icon: 'github' },
    { value: 'threads', label: 'Threads', icon: 'threads' },
    { value: 'discord', label: 'Discord', icon: 'discord' },
    { value: 'pinterest', label: 'Pinterest', icon: 'pinterest' },
    { value: 'reddit', label: 'Reddit', icon: 'reddit' },
    { value: 'snapchat', label: 'Snapchat', icon: 'snapchat' },
    { value: 'spotify', label: 'Spotify', icon: 'spotify' },
    { value: 'medium', label: 'Medium', icon: 'medium' },
    { value: 'patreon', label: 'Patreon', icon: 'patreon' },
    { value: 'substack', label: 'Substack', icon: 'substack' },
    { value: 'behance', label: 'Behance', icon: 'behance' }
  ];

  readonly appPlatformOptions: QrSelectOption<string>[] = [
    { value: 'both', label: 'Both (Smart Dual iOS & Android Fallback)', icon: 'smartphone' },
    { value: 'ios', label: 'Apple App Store (iOS only)', icon: 'apple' },
    { value: 'android', label: 'Google Play Store (Android only)', icon: 'android' }
  ];

  readonly cryptoCoinOptions: QrSelectOption<CryptoCoin>[] = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)', icon: 'bitcoin' },
    { value: 'ethereum', label: 'Ethereum (ETH / ERC-20)', icon: 'ethereum' },
    { value: 'solana', label: 'Solana (SOL)', icon: 'solana' },
    { value: 'litecoin', label: 'Litecoin (LTC)', icon: 'litecoin' },
    { value: 'bitcoincash', label: 'Bitcoin Cash (BCH)', icon: 'bitcoincash' }
  ];

  // Structured form states (empty-first flow)
  websiteData: WebsiteData = {
    url: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: ''
  };

  emailData: EmailData = {
    to: '',
    subject: '',
    body: '',
    cc: '',
    bcc: ''
  };

  phoneData: PhoneData = {
    countryCode: '',
    number: ''
  };

  smsData: SmsData = {
    phone: '',
    message: '',
    format: 'sms'
  };

  wifiData: WifiData = {
    ssid: '',
    password: '',
    encryption: 'WPA',
    hidden: false,
    eapMethod: ''
  };

  geoData: GeoData = {
    latitude: 0,
    longitude: 0,
    label: '',
    provider: 'geo'
  };

  get geoLatitudeNum(): number | null {
    if (this.geoData.latitude === null || this.geoData.latitude === undefined || (typeof this.geoData.latitude === 'string' && !this.geoData.latitude)) {
      return null;
    }
    const n = Number(this.geoData.latitude);
    return isNaN(n) ? null : n;
  }

  get geoLongitudeNum(): number | null {
    if (this.geoData.longitude === null || this.geoData.longitude === undefined || (typeof this.geoData.longitude === 'string' && !this.geoData.longitude)) {
      return null;
    }
    const n = Number(this.geoData.longitude);
    return isNaN(n) ? null : n;
  }

  geoPasteInput = '';

  eventData: EventData = {
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    description: '',
    organizer: '',
    repeat: 'none',
    reminderMinutes: 15
  };

  vcardData: VCardData = {
    firstName: '',
    lastName: '',
    company: '',
    jobTitle: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    format: 'vcard3'
  };

  socialData: SocialData = {
    platform: 'instagram',
    handleOrUrl: ''
  };

  appData: AppData = {
    platform: 'both',
    iosUrl: '',
    androidUrl: '',
    fallbackUrl: ''
  };

  cryptoData: CryptoData = {
    coin: 'bitcoin',
    address: '',
    amount: '',
    label: ''
  };

  onUrlBlur(): void {
    let url = (this.websiteData.url || '').trim();
    if (url) {
      if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
        url = 'https://' + url;
        this.websiteData.url = url;
        this.onWebsiteChange();
      } else if (url !== this.websiteData.url) {
        this.websiteData.url = url;
        this.onWebsiteChange();
      }
    }
  }

  showPassword = signal(false);
  copiedPayload = signal(false);

  onTypeSelect(type: ContentType): void {
    this.typeChange.emit(type);

    switch (type) {
      case 'url':
        this.contentChange.emit(this.qrService.buildWebsitePayload(this.websiteData));
        break;
      case 'email':
        this.contentChange.emit(this.qrService.buildEmailPayload(this.emailData));
        break;
      case 'phone':
        this.contentChange.emit(this.qrService.buildPhonePayload(this.phoneData));
        break;
      case 'sms':
        this.contentChange.emit(this.qrService.buildSmsPayload(this.smsData));
        break;
      case 'wifi':
        this.contentChange.emit(this.qrService.buildWifiPayload(this.wifiData));
        break;
      case 'geo':
        this.contentChange.emit(this.qrService.buildGeoPayload(this.geoData));
        break;
      case 'event':
        this.contentChange.emit(this.qrService.buildEventPayload(this.eventData));
        break;
      case 'vcard':
        this.contentChange.emit(this.qrService.buildVCardPayload(this.vcardData));
        break;
      case 'social':
        this.contentChange.emit(this.qrService.buildSocialPayload(this.socialData));
        break;
      case 'app':
        this.contentChange.emit(this.qrService.buildAppPayload(this.appData));
        break;
      case 'crypto':
        this.contentChange.emit(this.qrService.buildCryptoPayload(this.cryptoData));
        break;
      case 'text':
      default:
        // Keep current or text
        break;
    }
  }

  onContentInput(val: string): void {
    let normalized = normalizeLineEndings(val);
    if (this.selectedType() === 'text') {
      if (normalized.length > MAX_TEXT_CHARS) {
        normalized = normalized.slice(0, MAX_TEXT_CHARS);
      }
      while (countUtf8Bytes(normalized) > MAX_TEXT_BYTES && normalized.length > 0) {
        normalized = normalized.slice(0, -1);
      }
    }
    this.contentChange.emit(normalized);
  }

  onWebsiteChange(): void {
    const payload = this.qrService.buildWebsitePayload(this.websiteData);
    this.contentChange.emit(payload);
  }

  onEmailChange(): void {
    const payload = this.qrService.buildEmailPayload(this.emailData);
    this.contentChange.emit(payload);
  }

  onPhoneChange(): void {
    const payload = this.qrService.buildPhonePayload(this.phoneData);
    this.contentChange.emit(payload);
  }

  onSmsChange(): void {
    const payload = this.qrService.buildSmsPayload(this.smsData);
    this.contentChange.emit(payload);
  }

  onWifiChange(): void {
    const payload = this.qrService.buildWifiPayload(this.wifiData);
    this.contentChange.emit(payload);
  }

  onGeoChange(): void {
    const payload = this.qrService.buildGeoPayload(this.geoData);
    this.contentChange.emit(payload);
  }

  onMapUrlPaste(url: string): void {
    const parsed = parseMapCoordinates(url);
    if (parsed) {
      this.geoData.latitude = parsed.latitude;
      this.geoData.longitude = parsed.longitude;
      this.onGeoChange();
    }
  }

  onEventChange(): void {
    const payload = this.qrService.buildEventPayload(this.eventData);
    this.contentChange.emit(payload);
  }

  onVCardChange(): void {
    const payload = this.qrService.buildVCardPayload(this.vcardData);
    this.contentChange.emit(payload);
  }

  onPhoneInputValueChange(val: PhoneInputValue): void {
    this.phoneData.number = val.e164 || val.digitsOnly || val.rawNumber;
    this.onPhoneChange();
  }

  onSmsPhoneInputValueChange(val: PhoneInputValue): void {
    this.smsData.phone = val.e164 || val.digitsOnly || val.rawNumber;
    this.onSmsChange();
  }

  onVCardPhoneInputValueChange(val: PhoneInputValue): void {
    this.vcardData.phone = val.e164 || val.digitsOnly;
    this.onVCardChange();
  }

  onLocationInputValueChange(val: LocationInputValue): void {
    this.geoData.latitude = val.latitude ?? 0;
    this.geoData.longitude = val.longitude ?? 0;
    this.geoData.label = val.label || '';
    if (val.payload) {
      this.contentChange.emit(val.payload);
    }
  }

  onSocialInputValueChange(val: SocialLinkInputValue): void {
    this.socialData.platform = val.platform as SocialPlatform;
    this.socialData.handleOrUrl = val.handleOrUrl;
    if (val.canonicalUrl) {
      this.contentChange.emit(val.canonicalUrl);
    }
  }

  onAddSocialCenterIcon(event: AddCenterIconEvent): void {
    this.addSocialCenterIcon.emit(event);
  }

  onRemoveSocialCenterIcon(): void {
    this.removeSocialCenterIcon.emit();
  }

  onIosAppInputChange(val: string): void {
    this.appData.iosUrl = val;
    const res = normalizeIosAppInput(val);
    if (res.isValid) {
      this.appData.iosUrl = res.canonicalUrl;
      this.appIosError.set('');
      this.onAppChange();
    } else if (val.trim()) {
      this.appIosError.set(res.error || '');
    } else {
      this.appIosError.set('');
    }
  }

  onAndroidAppInputChange(val: string): void {
    this.appData.androidUrl = val;
    const res = normalizeAndroidAppInput(val);
    if (res.isValid) {
      this.appData.androidUrl = res.canonicalUrl;
      this.appAndroidError.set('');
      this.onAppChange();
    } else if (val.trim()) {
      this.appAndroidError.set(res.error || '');
    } else {
      this.appAndroidError.set('');
    }
  }

  onSocialChange(): void {
    const payload = this.qrService.buildSocialPayload(this.socialData);
    this.contentChange.emit(payload);
  }

  onAppChange(): void {
    const payload = this.qrService.buildAppPayload(this.appData);
    this.contentChange.emit(payload);
  }

  onCryptoChange(): void {
    const payload = this.qrService.buildCryptoPayload(this.cryptoData);
    this.contentChange.emit(payload);
  }

  applyPreset(val: string, type: ContentType): void {
    this.typeChange.emit(type);
    this.contentChange.emit(val);
  }

  applyWifiPreset(): void {
    this.wifiData = {
      ssid: 'Acklet-Guest',
      password: 'Welcome2026',
      encryption: 'WPA',
      hidden: false
    };
    this.typeChange.emit('wifi');
    this.contentChange.emit(this.qrService.buildWifiPayload(this.wifiData));
  }

  applyVCardPreset(): void {
    this.vcardData = {
      firstName: 'Alex',
      lastName: 'Mercer',
      phone: '+14155552671',
      email: 'alex@acklet.com',
      company: 'Acklet Inc.',
      jobTitle: 'Lead Architect',
      website: 'https://acklet.com',
      street: '100 Market St',
      city: 'San Francisco',
      format: 'vcard3'
    };
    this.typeChange.emit('vcard');
    this.contentChange.emit(this.qrService.buildVCardPayload(this.vcardData));
  }

  applyEventPreset(): void {
    this.eventData = {
      title: 'Acklet Product Launch',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endDate: new Date().toISOString().split('T')[0],
      endTime: '11:30',
      allDay: false,
      location: 'San Francisco, CA',
      repeat: 'none',
      reminderMinutes: 15
    };
    this.typeChange.emit('event');
    this.contentChange.emit(this.qrService.buildEventPayload(this.eventData));
  }

  applyCryptoPreset(): void {
    this.cryptoData = {
      coin: 'bitcoin',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '0.05',
      label: 'Acklet Services'
    };
    this.typeChange.emit('crypto');
    this.contentChange.emit(this.qrService.buildCryptoPayload(this.cryptoData));
  }

  async copyPayload(): Promise<void> {
    const payload = this.formattedPayload();
    if (!payload || typeof navigator === 'undefined' || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(payload);
      this.copiedPayload.set(true);
      setTimeout(() => this.copiedPayload.set(false), 2000);
    } catch {}
  }

  copyText(text: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  getPayloadForType(type: ContentType = this.selectedType()): string {
    switch (type) {
      case 'url':
        return this.qrService.buildWebsitePayload(this.websiteData);
      case 'email':
        return this.qrService.buildEmailPayload(this.emailData);
      case 'phone':
        return this.qrService.buildPhonePayload(this.phoneData);
      case 'sms':
        return this.qrService.buildSmsPayload(this.smsData);
      case 'wifi':
        return this.qrService.buildWifiPayload(this.wifiData);
      case 'geo':
        return this.qrService.buildGeoPayload(this.geoData);
      case 'event':
        return this.qrService.buildEventPayload(this.eventData);
      case 'vcard':
        return this.qrService.buildVCardPayload(this.vcardData);
      case 'social':
        return this.qrService.buildSocialPayload(this.socialData);
      case 'app':
        return this.qrService.buildAppPayload(this.appData);
      case 'crypto':
        return this.qrService.buildCryptoPayload(this.cryptoData);
      case 'text':
      default:
        return this.content() || '';
    }
  }

  loadExampleForType(type: ContentType = this.selectedType()): string {
    switch (type) {
      case 'url':
        this.websiteData = { url: 'https://acklet.com', utmSource: 'qr_flyer', utmMedium: 'print', utmCampaign: 'launch' };
        break;
      case 'email':
        this.emailData = { to: 'hello@acklet.com', subject: 'Inquiry', body: 'Hello Acklet Team,\n\nI would like to learn more.' };
        break;
      case 'phone':
        this.phoneData = { countryCode: '+1', number: '4155552671' };
        break;
      case 'sms':
        this.smsData = { phone: '+14155552671', message: 'Hello from Acklet!' };
        break;
      case 'wifi':
        this.wifiData = { ssid: 'Acklet-HQ', encryption: 'WPA', password: 'security2026', hidden: false };
        break;
      case 'geo':
        this.geoData = { latitude: 37.7749, longitude: -122.4194, query: 'Acklet Headquarters' };
        break;
      case 'event':
        this.eventData = {
          title: 'Acklet Product Launch',
          startDate: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          endDate: new Date().toISOString().split('T')[0],
          endTime: '11:30',
          allDay: false,
          location: 'San Francisco, CA',
          repeat: 'none',
          reminderMinutes: 15
        };
        break;
      case 'vcard':
        this.vcardData = {
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acklet Inc.',
          jobTitle: 'Head of Product',
          phone: '+1 415-555-0199',
          email: 'john.doe@acklet.com',
          website: 'https://acklet.com'
        };
        break;
      case 'social':
        this.socialData = { platform: 'instagram', handleOrUrl: 'acklet' };
        break;
      case 'app':
        this.appData = { platform: 'ios', iosUrl: 'https://apps.apple.com/app/id123456789' };
        break;
      case 'crypto':
        this.cryptoData = { coin: 'bitcoin', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', amount: '0.05', label: 'Acklet' };
        break;
      case 'text':
      default:
        return 'Hello World from Acklet!';
    }
    return this.getPayloadForType(type);
  }

  restorePayload(type: ContentType, payload: string): void {
    if (!payload) return;
    if (type === 'url') {
      this.websiteData.url = payload;
    } else if (type === 'email') {
      const match = payload.match(/^mailto:([^?]+)(?:\?subject=([^&]*))?/i);
      if (match) {
        this.emailData.to = decodeURIComponent(match[1]);
        if (match[2]) this.emailData.subject = decodeURIComponent(match[2]);
      }
    } else if (type === 'phone') {
      this.phoneData.number = payload.replace(/^tel:/i, '');
    } else if (type === 'wifi') {
      const ssid = payload.match(/S:([^;]+)/i);
      const pass = payload.match(/P:([^;]+)/i);
      if (ssid) this.wifiData.ssid = ssid[1];
      if (pass) this.wifiData.password = pass[1];
    }
  }
}
