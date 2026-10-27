// client/apps/tool-qr-generator/src/components/phone-input/phone-input.component.ts
import {
  Component,
  input,
  output,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TsIconComponent } from '@acklet/tool-shell';
import {
  CountryCode,
  parsePhoneNumberFromString,
  AsYouType,
  isPossiblePhoneNumber
} from 'libphonenumber-js/min';
import {
  ALL_PHONE_COUNTRIES,
  POPULAR_COUNTRIES,
  PhoneCountry,
  detectDefaultCountry,
  saveLastPhoneCountry,
  getCountryByCode
} from '../../utils/phone-countries.data';

export interface PhoneInputValue {
  e164: string;
  digitsOnly: string;
  rawNumber: string;
  country: CountryCode;
  isValid: boolean;
  error?: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule, TsIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="phone-input-wrapper">
      @if (label()) {
        <label [for]="id()" class="phone-label">{{ label() }}</label>
      }

      <div
        class="phone-control-group"
        [class.focused]="isInputFocused()"
        [class.invalid]="hasError()"
      >
        <!-- Country Selector Trigger -->
        <div class="country-select-container">
          <button
            type="button"
            class="country-trigger-btn"
            [attr.aria-expanded]="isDropdownOpen()"
            (click)="toggleDropdown($event)"
            title="Select country code"
          >
            <span class="country-badge">{{ selectedCountry().code }}</span>
            <span class="country-dial-code">{{ selectedCountry().dialCode }}</span>
            <ts-icon name="chevron-down" class="dropdown-chevron" [class.rotated]="isDropdownOpen()" />
          </button>

          <!-- Searchable Country Dropdown Menu -->
          @if (isDropdownOpen()) {
            <div class="country-dropdown-menu slide-fade-up" (click)="$event.stopPropagation()">
              <div class="dropdown-search-box">
                <ts-icon name="search" class="search-icon" />
                <input
                  type="text"
                  class="search-input"
                  placeholder="Search country or dial code..."
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  (keydown)="onSearchKeydown($event)"
                  #searchInput
                />
                @if (searchQuery()) {
                  <button type="button" class="clear-search-btn" (click)="searchQuery.set('')">
                    <ts-icon name="x" />
                  </button>
                }
              </div>

              <div class="dropdown-list" role="listbox">
                @if (!searchQuery() && popularList().length > 0) {
                  <div class="list-section-header">Popular</div>
                  @for (country of popularList(); track country.code) {
                    <button
                      type="button"
                      class="country-item"
                      [class.selected]="country.code === selectedCountry().code"
                      role="option"
                      [attr.aria-selected]="country.code === selectedCountry().code"
                      (click)="selectCountry(country.code)"
                    >
                      <span class="item-badge">{{ country.code }}</span>
                      <span class="item-name">{{ country.name }}</span>
                      <span class="item-dial">{{ country.dialCode }}</span>
                    </button>
                  }
                  <div class="list-divider"></div>
                  <div class="list-section-header">All Countries</div>
                }

                @for (country of filteredCountries(); track country.code) {
                  <button
                    type="button"
                    class="country-item"
                    [class.selected]="country.code === selectedCountry().code"
                    role="option"
                    [attr.aria-selected]="country.code === selectedCountry().code"
                    (click)="selectCountry(country.code)"
                  >
                    <span class="item-badge">{{ country.code }}</span>
                    <span class="item-name">{{ country.name }}</span>
                    <span class="item-dial">{{ country.dialCode }}</span>
                  </button>
                } @empty {
                  <div class="empty-results">No countries matching "{{ searchQuery() }}"</div>
                }
              </div>
            </div>
          }
        </div>

        <!-- National Number Input -->
        <input
          [id]="id()"
          type="tel"
          class="phone-national-input"
          [placeholder]="placeholder() || selectedCountry().formatPlaceholder"
          [ngModel]="displayNumber()"
          (ngModelChange)="onNumberChange($event)"
          (paste)="onPaste($event)"
          (focus)="isInputFocused.set(true)"
          (blur)="onBlur()"
          autocomplete="tel-national"
        />
      </div>

      <!-- Validation & Guidance Notes -->
      @if (hasError()) {
        <div class="phone-feedback error slide-fade-up" role="alert">
          <ts-icon name="alert-circle" class="feedback-icon" />
          <span>{{ errorMessage() }}</span>
        </div>
      } @else if (mobileHint()) {
        <div class="phone-feedback hint slide-fade-up">
          <ts-icon name="info" class="feedback-icon" />
          <span>{{ mobileHint() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .phone-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }

    .phone-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-2, #b3b3b8);
    }

    .phone-control-group {
      display: flex;
      align-items: stretch;
      width: 100%;
      height: 40px;
      border-radius: 9px;
      background: var(--surface-2, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
      transition: border-color 180ms ease, box-shadow 180ms ease;
    }

    .phone-control-group.focused {
      border-color: var(--accent, #10b981);
      box-shadow: 0 0 0 2px var(--accent-glow, rgba(16, 185, 129, 0.2));
    }

    .phone-control-group.invalid {
      border-color: var(--danger, #ef4444);
      background: var(--danger-soft, rgba(239, 68, 68, 0.04));
    }

    /* Country Trigger */
    .country-select-container {
      position: relative;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .country-trigger-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      padding: 0 10px;
      border: none;
      background: transparent;
      border-right: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      color: var(--text, #fcfcfc);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background 150ms ease;
    }

    .country-trigger-btn:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.06));
    }

    .country-trigger-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: -2px;
    }

    .country-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 2px 5px;
      border-radius: 4px;
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
    }

    .country-dial-code {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text, #fcfcfc);
    }

    .dropdown-chevron {
      width: 13px;
      height: 13px;
      opacity: 0.7;
      transition: transform 180ms ease;
    }

    .dropdown-chevron.rotated {
      transform: rotate(180deg);
    }

    /* National Input */
    .phone-national-input {
      flex: 1 1 0%;
      min-width: 0;
      height: 100%;
      padding: 0 12px;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
    }

    .phone-national-input::placeholder {
      color: var(--text-3, rgba(255, 255, 255, 0.4));
    }

    /* Dropdown Menu */
    .country-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 290px;
      max-height: 320px;
      background: var(--surface-1, #141416);
      border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
      border-radius: 10px;
      box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
      z-index: 999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dropdown-search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      background: var(--surface-2, rgba(255, 255, 255, 0.02));
    }

    .search-icon {
      width: 14px;
      height: 14px;
      opacity: 0.6;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .search-input {
      flex: 1 1 0%;
      border: none;
      background: transparent;
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      outline: none;
    }

    .clear-search-btn {
      border: none;
      background: transparent;
      color: var(--text-3, inherit);
      cursor: pointer;
      opacity: 0.7;
      padding: 2px;
      display: flex;
    }

    .clear-search-btn:hover {
      opacity: 1;
      color: var(--text, #fcfcfc);
    }

    .clear-search-btn:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: 1px;
    }

    .dropdown-list {
      flex: 1 1 0%;
      overflow-y: auto;
      max-height: 260px;
      padding: 4px;
      scrollbar-width: thin;
    }

    .list-section-header {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 8px 4px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    .country-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      border: none;
      background: transparent;
      border-radius: 6px;
      color: var(--text, #fcfcfc);
      font-size: 12.5px;
      cursor: pointer;
      text-align: left;
      transition: background 120ms ease;
    }

    .country-item:hover {
      background: var(--surface-hover, rgba(255, 255, 255, 0.06));
    }

    .country-item:focus-visible {
      outline: 2px solid var(--accent, #10b981);
      outline-offset: -1px;
    }

    .country-item.selected {
      background: var(--accent-soft, rgba(16, 185, 129, 0.15));
      color: var(--accent, #10b981);
      font-weight: 600;
    }

    .item-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--surface-3, rgba(255, 255, 255, 0.08));
      color: var(--text-2, rgba(255, 255, 255, 0.8));
      min-width: 24px;
      text-align: center;
    }

    .item-name {
      flex: 1 1 0%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: inherit;
    }

    .item-dial {
      font-size: 11.5px;
      font-weight: 600;
      opacity: 0.85;
      color: var(--text-2, inherit);
    }

    .list-divider {
      height: 1px;
      background: var(--border-subtle, rgba(255, 255, 255, 0.08));
      margin: 4px 0;
    }

    .empty-results {
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: var(--text-3, rgba(255, 255, 255, 0.5));
    }

    /* Feedback Note */
    .phone-feedback {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      line-height: 1.35;
    }

    .phone-feedback.error {
      color: var(--danger, #ef4444);
    }

    .phone-feedback.hint {
      color: var(--text-3, rgba(255, 255, 255, 0.6));
    }

    .feedback-icon {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      .phone-control-group,
      .country-trigger-btn,
      .dropdown-chevron,
      .country-item {
        transition: none !important;
      }
    }
  `]
})
export class PhoneInputComponent implements OnInit {
  readonly id = input<string>('phone-input');
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly initialValue = input<string>('');
  readonly initialCountry = input<CountryCode | undefined>(undefined);
  readonly requireMobile = input<boolean>(false);

  readonly valueChange = output<PhoneInputValue>();

  readonly selectedCountry = signal<PhoneCountry>(getCountryByCode(detectDefaultCountry()));
  readonly displayNumber = signal<string>('');
  readonly isDropdownOpen = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly isInputFocused = signal<boolean>(false);
  readonly hasBeenTouched = signal<boolean>(false);

  private hostElement = inject(ElementRef);

  readonly popularList = computed(() => POPULAR_COUNTRIES);

  readonly filteredCountries = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return ALL_PHONE_COUNTRIES;
    return ALL_PHONE_COUNTRIES.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.dialCode.includes(query)
    );
  });

  readonly validation = computed<{ isValid: boolean; error?: string; e164: string; digitsOnly: string }>(() => {
    const raw = this.displayNumber().trim();
    const country = this.selectedCountry();

    if (!raw) {
      return { isValid: false, e164: '', digitsOnly: '' };
    }

    const fullStr = `${country.dialCode}${raw.replace(/\D/g, '')}`;
    const parsed = parsePhoneNumberFromString(raw, country.code);

    if (!parsed) {
      // Basic check
      const digits = raw.replace(/\D/g, '');
      const possible = isPossiblePhoneNumber(raw, country.code);
      if (!possible) {
        return {
          isValid: false,
          error: `This doesn't look like a valid number for ${country.name}.`,
          e164: fullStr,
          digitsOnly: fullStr.replace(/\D/g, '')
        };
      }
      return {
        isValid: true,
        e164: fullStr,
        digitsOnly: fullStr.replace(/\D/g, '')
      };
    }

    const isValid = parsed.isValid();
    if (!isValid) {
      return {
        isValid: false,
        error: `This doesn't look like a valid number for ${country.name}.`,
        e164: parsed.number || fullStr,
        digitsOnly: (parsed.number || fullStr).replace(/\D/g, '')
      };
    }

    const e164 = parsed.format('E.164');
    return {
      isValid: true,
      e164,
      digitsOnly: e164.replace(/\D/g, '')
    };
  });

  readonly hasError = computed(() => {
    return this.hasBeenTouched() && !!this.displayNumber().trim() && !this.validation().isValid;
  });

  readonly errorMessage = computed(() => {
    return this.validation().error || '';
  });

  readonly mobileHint = computed(() => {
    if (!this.requireMobile() || !this.validation().isValid) return '';
    return 'Tip: Ensure this is a mobile phone capable of receiving SMS texts.';
  });

  ngOnInit(): void {
    const initCountry = this.initialCountry();
    if (initCountry) {
      this.selectedCountry.set(getCountryByCode(initCountry));
    }
    const initVal = this.initialValue();
    if (initVal) {
      this.parseAndSetInitial(initVal);
    }
  }

  private parseAndSetInitial(value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('+')) {
      const parsed = parsePhoneNumberFromString(trimmed);
      if (parsed?.country) {
        this.selectedCountry.set(getCountryByCode(parsed.country));
        this.displayNumber.set(parsed.formatNational());
        this.emitChange();
        return;
      }
    }

    const asYouType = new AsYouType(this.selectedCountry().code);
    const formatted = asYouType.input(trimmed);
    this.displayNumber.set(formatted);
    this.emitChange();
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isDropdownOpen.update(v => !v);
    this.searchQuery.set('');
  }

  selectCountry(code: CountryCode): void {
    const country = getCountryByCode(code);
    this.selectedCountry.set(country);
    saveLastPhoneCountry(code);
    this.isDropdownOpen.set(false);
    this.searchQuery.set('');

    // Re-format current national number under new country rules
    const digits = this.displayNumber().replace(/\D/g, '');
    if (digits) {
      const ayt = new AsYouType(code);
      this.displayNumber.set(ayt.input(digits));
    }
    this.emitChange();
  }

  onNumberChange(val: string): void {
    const digits = val.replace(/\D/g, '');
    const ayt = new AsYouType(this.selectedCountry().code);
    const formatted = ayt.input(val);
    this.displayNumber.set(formatted);
    this.emitChange();
  }

  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') || '';
    if (!text) return;

    // Check if pasted number includes an international dial code
    if (text.trim().startsWith('+') || /^\d{11,15}$/.test(text.replace(/\D/g, ''))) {
      const parsed = parsePhoneNumberFromString(text.startsWith('+') ? text : `+${text}`);
      if (parsed?.country) {
        event.preventDefault();
        this.selectedCountry.set(getCountryByCode(parsed.country));
        saveLastPhoneCountry(parsed.country);
        this.displayNumber.set(parsed.formatNational());
        this.emitChange();
        return;
      }
    }
  }

  onBlur(): void {
    this.isInputFocused.set(false);
    this.hasBeenTouched.set(true);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isDropdownOpen.set(false);
    }
  }

  private emitChange(): void {
    const rawNumber = this.displayNumber().trim();
    const v = this.validation();
    this.valueChange.emit({
      e164: v.e164,
      digitsOnly: v.digitsOnly,
      rawNumber,
      country: this.selectedCountry().code,
      isValid: v.isValid
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.hostElement.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
    }
  }
}
