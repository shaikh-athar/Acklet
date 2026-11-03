// apps/tool-urlshortener/src/components/url-shortener.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  ElementRef,
  viewChild,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HlmButtonImports, HlmInputImports, HlmTooltipImports, TsIconComponent } from '@acklet/tool-shell';
import { ActionDropdownComponent, ActionMenuItem } from './action-dropdown/action-dropdown.component';
import { getToolsHubUrl } from '@acklet/shared';
import { ShortenerService, ShortenResult, ResolutionStatus } from '../services/shortener.service';
import { ShortenerSecurityService } from '../services/shortener-security.service';
import { ShortenerStorageService, ShortLinkRecord, LinkStatus, computeLinkStatus } from '../services/shortener-storage.service';
import {
  FilterCriteria,
  createDefaultFilterCriteria,
  matchesFilterCriteria,
  countActiveFilters,
  ActivityFilter,
  ExpiryFilter,
  ProtectionFilter,
  RuleFilter,
  CreatedRangePreset
} from '../services/shortener-filter.model';
import { SHORTENER_CONFIG, ExpiryPreset, ExpiryOption } from '../services/shortener.config';
import { environment } from '../environments/environment';

export type ToolPage = 'MAIN' | 'LINKS' | 'REDIRECT' | 'PREVIEW' | 'UNLOCK';
export type SortOption = 'newest' | 'oldest' | 'clicks' | 'expiry';
export type FilterStatus = 'ALL' | LinkStatus;

@Component({
  selector: 'app-url-shortener-tool',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    HlmButtonImports,
    HlmInputImports,
    HlmTooltipImports,
    TsIconComponent,
    ActionDropdownComponent
  ],
  templateUrl: './url-shortener.component.html',
  styleUrls: ['./url-shortener.component.css']
})
export class UrlShortenerComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly hostEl = inject(ElementRef);
  private readonly shortener = inject(ShortenerService);
  private readonly security = inject(ShortenerSecurityService);
  private readonly storage = inject(ShortenerStorageService);

  readonly hubUrl = getToolsHubUrl();
  readonly expiryOptions: ExpiryOption[] = SHORTENER_CONFIG.expiryOptions;
  readonly maxClicksOptions = SHORTENER_CONFIG.maxClicksOptions;
  readonly minPasswordLength = SHORTENER_CONFIG.minPasswordLength;

  // View Inputs
  readonly urlInputRef = viewChild<ElementRef<HTMLInputElement>>('urlInput');
  readonly unlockPasswordInputRef = viewChild<ElementRef<HTMLInputElement>>('unlockPasswordInput');

  // Navigation / Page State
  readonly activePage = signal<ToolPage>('MAIN');

  // Core Form State (Main Page)
  readonly longUrl = signal<string>('');
  readonly customAlias = signal<string>('');
  readonly selectedExpiry = signal<ExpiryPreset>(SHORTENER_CONFIG.defaultExpiry);
  readonly showOptions = signal<boolean>(false);
  readonly isExpiryOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isCopied = signal<boolean>(false);
  readonly lastResult = signal<ShortenResult | null>(null);
  readonly isResetting = signal<boolean>(false);

  // Advanced Options Form State (Main Page)
  readonly formPassword = signal<string>('');
  readonly showFormPassword = signal<boolean>(false);
  readonly formMaxClicks = signal<number | null>(null);
  readonly formIsOneTime = signal<boolean>(false);
  readonly formStartDate = signal<string>('');
  readonly formLabel = signal<string>('');

  // Alias Live Availability State
  readonly aliasChecking = signal<boolean>(false);
  readonly aliasAvailable = signal<boolean>(true);
  private aliasCheckDebounceTimer: any = null;

  // "My Links" List View State
  readonly myLinks = signal<ShortLinkRecord[]>([]);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<FilterStatus>('ALL');
  readonly sortOption = signal<SortOption>('newest');
  readonly isStatusDropdownOpen = signal<boolean>(false);
  readonly isSortDropdownOpen = signal<boolean>(false);
  readonly isFiltersPopoverOpen = signal<boolean>(false);

  // Filter Redesign State (Attribute-Based)
  readonly filterCriteria = signal<FilterCriteria>(createDefaultFilterCriteria());
  readonly tagFilterQuery = signal<string>('');
  readonly domainFilterQuery = signal<string>('');
  readonly customDateFrom = signal<string>('');
  readonly customDateTo = signal<string>('');

  // Bulk Selection State
  readonly selectedCodes = signal<Set<string>>(new Set<string>());
  readonly isBulkDeleteModalOpen = signal<boolean>(false);
  readonly isProcessingBulk = signal<boolean>(false);

  // UTM Builder Form State (Main Form & Edit Drawer)
  readonly formUtmSource = signal<string>('');
  readonly formUtmMedium = signal<string>('');
  readonly formUtmCampaign = signal<string>('');
  readonly formUtmTerm = signal<string>('');
  readonly formUtmContent = signal<string>('');
  readonly showUtmSection = signal<boolean>(false);

  readonly formFallbackUrl = signal<string>('');
  readonly formTags = signal<string>('');

  // Analytics Stats Drawer State
  readonly isStatsDrawerOpen = signal<boolean>(false);
  readonly statsCode = signal<string>('');
  readonly linkStats = signal<any>(null);
  readonly loadingStats = signal<boolean>(false);

  readonly activeAttributeFilterCount = computed<number>(() => {
    return countActiveFilters(this.filterCriteria());
  });

  // Dynamic Available Filter Options based on Owner Data
  readonly availableTags = computed<string[]>(() => {
    const set = new Set<string>();
    for (const link of this.myLinks()) {
      if (link.tags) {
        for (const t of link.tags) {
          if (t && t.trim()) set.add(t.trim().toLowerCase());
        }
      }
    }
    return Array.from(set).sort();
  });

  readonly availableDomains = computed<string[]>(() => {
    const set = new Set<string>();
    for (const link of this.myLinks()) {
      let d = link.domain;
      if (!d && link.targetUrl) {
        try { d = new URL(link.targetUrl).host; } catch (_) {}
      }
      if (d) set.add(d.toLowerCase());
    }
    return Array.from(set).sort();
  });

  readonly hasReportedLinks = computed<boolean>(() => {
    return this.myLinks().some(l => l.isReported || (l.reportCount != null && l.reportCount > 0) || (l as any).flagged);
  });

  // Action Menu Configurations
  readonly resultMoreItemsCompact: ActionMenuItem[] = [
    { id: 'qr', label: 'Make QR', icon: 'qr-code' },
    { id: 'preview', label: 'Preview', icon: 'eye' },
    { id: 'links', label: 'View my links', icon: 'history' }
  ];

  readonly resultMoreItemsExpanded: ActionMenuItem[] = [
    { id: 'preview', label: 'Preview', icon: 'eye' },
    { id: 'links', label: 'View my links', icon: 'history' }
  ];

  readonly pageMoreMenuItems: ActionMenuItem[] = [
    { id: 'export', label: 'Export CSV', icon: 'download' },
    { id: 'backup', label: 'Backup & restore', icon: 'archive' }
  ];

  onResultMoreAction(actionId: string): void {
    const res = this.lastResult();
    if (!res) return;
    if (actionId === 'qr' && res.shortUrl) {
      this.openQrGenerator(res.shortUrl);
    } else if (actionId === 'preview' && res.code) {
      this.enterPreviewForCode(res.code);
    } else if (actionId === 'links') {
      this.navigateTo('LINKS');
    }
  }

  getRowMenuItems(link: ShortLinkRecord, isCompact = false): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    if (isCompact) {
      items.push({ id: 'copy', label: 'Copy link', icon: 'copy' });
    }
    items.push(
      { id: 'qr', label: 'Make QR', icon: 'qr-code' },
      { id: 'preview', label: 'Preview', icon: 'eye' },
      { id: 'edit', label: 'Edit', icon: 'pencil' },
      { id: 'deactivate', label: link.isDeactivated ? 'Reactivate' : 'Deactivate', icon: link.isDeactivated ? 'play' : 'pause' },
      { id: 'delete', label: 'Delete', icon: 'trash', destructive: true }
    );
    return items;
  }

  onRowMoreAction(actionId: string, link: ShortLinkRecord): void {
    if (actionId === 'copy') {
      this.copyToClipboard(this.buildShortUrl(link.code));
    } else if (actionId === 'qr') {
      this.openQrGenerator(this.buildShortUrl(link.code));
    } else if (actionId === 'preview') {
      this.enterPreviewForCode(link.code);
    } else if (actionId === 'edit') {
      this.openEditDrawer(link);
    } else if (actionId === 'deactivate') {
      this.toggleDeactivation(link);
    } else if (actionId === 'delete') {
      this.deleteLink(link.code);
    }
  }

  onPageMoreAction(actionId: string): void {
    if (actionId === 'export') {
      this.exportCsv();
    } else if (actionId === 'backup') {
      this.isRecoveryModalOpen.set(true);
    }
  }

  onFieldFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Edit Drawer / Sheet State
  readonly isEditDrawerOpen = signal<boolean>(false);
  readonly editingRecord = signal<ShortLinkRecord | null>(null);
  readonly editTargetUrl = signal<string>('');
  readonly editLabel = signal<string>('');
  readonly editExpiry = signal<ExpiryPreset>(SHORTENER_CONFIG.defaultExpiry);
  readonly editIsExpiryOpen = signal<boolean>(false);
  readonly editMaxClicks = signal<number | null>(null);
  readonly editIsOneTime = signal<boolean>(false);
  readonly editStartDate = signal<string>('');
  readonly editPasswordAction = signal<'keep' | 'set' | 'remove'>('keep');
  readonly editNewPassword = signal<string>('');
  readonly editShowPassword = signal<boolean>(false);
  readonly isSavingEdit = signal<boolean>(false);

  // Password Unlock Page State
  readonly unlockCode = signal<string>('');
  readonly unlockPassword = signal<string>('');
  readonly showUnlockPassword = signal<boolean>(false);
  readonly unlockError = signal<string>('');
  readonly isUnlocking = signal<boolean>(false);
  private pendingPreviewAfterUnlock = false;

  // Redirect / Unavailable Status State
  readonly redirectStatus = signal<ResolutionStatus>('ACTIVE');
  readonly currentCode = signal<string>('');
  readonly destinationUrl = signal<string>('');

  // Safe Preview Mode State (+ suffix or Preview button)
  readonly activePreviewRecord = signal<ShortLinkRecord | null>(null);

  // Backup & Recovery Modal State
  readonly isRecoveryModalOpen = signal<boolean>(false);
  readonly recoveryStatusMessage = signal<string>('');

  // Report Link Modal State
  readonly isReportModalOpen = signal<boolean>(false);
  readonly reportingCode = signal<string>('');
  readonly reportReason = signal<string>('phishing');
  readonly reportComment = signal<string>('');

  // Toast State
  readonly toastMessage = signal<string>('');
  private toastTimer: any = null;

  // Popstate handler reference
  private popstateListener: (() => void) | null = null;

  // Computed Properties
  readonly urlValidation = computed(() => {
    return this.security.validateDestinationUrl(this.longUrl());
  });

  readonly editUrlValidation = computed(() => {
    return this.security.validateDestinationUrl(this.editTargetUrl());
  });

  readonly aliasValidation = computed(() => {
    return this.security.validateCustomAlias(this.customAlias());
  });

  readonly isFormValid = computed(() => {
    const rawUrl = this.longUrl().trim();
    if (!rawUrl) return false;
    const urlValid = this.urlValidation().isValid;
    const aliasValid = this.aliasValidation().isValid && this.aliasAvailable();
    const pw = this.formPassword().trim();
    const pwValid = !pw || pw.length >= SHORTENER_CONFIG.minPasswordLength;
    return urlValid && aliasValid && pwValid;
  });

  readonly isEditFormValid = computed(() => {
    const rawUrl = this.editTargetUrl().trim();
    if (!rawUrl) return false;
    if (!this.editUrlValidation().isValid) return false;
    if (this.editPasswordAction() === 'set') {
      const pw = this.editNewPassword().trim();
      if (!pw || pw.length < SHORTENER_CONFIG.minPasswordLength) return false;
    }
    return true;
  });

  readonly shortDomainPrefix = computed(() => {
    if (isPlatformBrowser(this.platformId)) {
      return window.location.host;
    }
    return environment.shortDomain;
  });

  readonly previewFinalTargetUrl = computed<string>(() => {
    const raw = this.longUrl().trim();
    if (!raw) return '';
    const src = this.formUtmSource().trim();
    const med = this.formUtmMedium().trim();
    const camp = this.formUtmCampaign().trim();
    const term = this.formUtmTerm().trim();
    const cont = this.formUtmContent().trim();
    if (!src && !med && !camp && !term && !cont) return raw;

    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (src && !url.searchParams.has('utm_source')) url.searchParams.set('utm_source', src);
      if (med && !url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', med);
      if (camp && !url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', camp);
      if (term && !url.searchParams.has('utm_term')) url.searchParams.set('utm_term', term);
      if (cont && !url.searchParams.has('utm_content')) url.searchParams.set('utm_content', cont);
      return url.toString();
    } catch {
      return raw;
    }
  });

  /**
   * Filtered & sorted links for the /links workspace
   */
  readonly filteredLinks = computed<ShortLinkRecord[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const sort = this.sortOption();
    const criteria = this.filterCriteria();
    let list = [...this.myLinks()];

    // 1. Text filter (url, code, or label)
    if (query) {
      list = list.filter(link => {
        const matchCode = link.code.toLowerCase().includes(query);
        const matchUrl = link.targetUrl.toLowerCase().includes(query);
        const matchLabel = link.label ? link.label.toLowerCase().includes(query) : false;
        return matchCode || matchUrl || matchLabel;
      });
    }

    // 2. Toolbar Status filter
    if (status !== 'ALL') {
      list = list.filter(link => computeLinkStatus(link) === status);
    }

    // 3. Part C Attribute-Based Criteria Filter
    list = list.filter(link => matchesFilterCriteria(link, criteria));

    // 4. Sort
    list.sort((a, b) => {
      if (sort === 'newest') return b.createdAt - a.createdAt;
      if (sort === 'oldest') return a.createdAt - b.createdAt;
      if (sort === 'clicks') return b.clicks - a.clicks;
      if (sort === 'expiry') {
        const aExp = a.expiresAt || Number.MAX_SAFE_INTEGER;
        const bExp = b.expiresAt || Number.MAX_SAFE_INTEGER;
        return aExp - bExp;
      }
      return 0;
    });

    return list;
  });

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Silent one-time migration of any legacy client-side links
    this.shortener.migrateLocalLinks().catch(() => {});

    // Load initial links from server
    await this.refreshMyLinks();

    // Setup HTML5 popstate routing listener
    this.popstateListener = () => {
      this.inspectRouteAndRedirect();
    };
    window.addEventListener('popstate', this.popstateListener);

    // Initial route check
    this.inspectRouteAndRedirect();
  }

  ngOnDestroy(): void {
    if (this.popstateListener && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('popstate', this.popstateListener);
    }
    clearTimeout(this.aliasCheckDebounceTimer);
    clearTimeout(this.toastTimer);
  }

  /**
   * Navigates between MAIN (/) and LINKS (/links) with HTML5 history update.
   */
  navigateTo(page: ToolPage): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (page === 'LINKS') {
      this.closeEditDrawer();
      window.history.pushState(null, '', '/links');
      this.activePage.set('LINKS');
      this.refreshMyLinks();
    } else if (page === 'MAIN') {
      this.closeEditDrawer();
      window.history.pushState(null, '', '/');
      this.activePage.set('MAIN');
    }
  }

  /**
   * Evaluates window.location.pathname and search parameters.
   */
  private async inspectRouteAndRedirect(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const params = new URLSearchParams(window.location.search);
    const queryCode = params.get('code') || params.get('c');
    const isExplicitPreview = params.get('preview') === 'true';

    // 1. My Links dedicated page
    if (pathname === 'links') {
      this.activePage.set('LINKS');
      await this.refreshMyLinks();
      return;
    }

    // 2. Short code candidate
    const targetCandidate = pathname || queryCode;
    if (!targetCandidate) {
      this.activePage.set('MAIN');
      return;
    }

    const isPlusPreview = targetCandidate.endsWith('+');
    const cleanCode = targetCandidate.replace(/\+$/, '').trim();

    if (!cleanCode || SHORTENER_CONFIG.aliasRules.reservedWords.has(cleanCode.toLowerCase())) {
      this.activePage.set('MAIN');
      return;
    }

    // Forward legacy client routes to server-side /s/{code} redirection engine
    if (isPlusPreview || isExplicitPreview) {
      window.location.replace('/s/' + encodeURIComponent(cleanCode) + '+');
    } else {
      window.location.replace('/s/' + encodeURIComponent(cleanCode));
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PASSWORD UNLOCK ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  async onUnlockSubmit(): Promise<void> {
    const code = this.unlockCode();
    if (code) {
      window.location.href = `/s/${encodeURIComponent(code)}`;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MAIN FORM ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  onUrlInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.longUrl.set(val);
  }

  onAliasInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value.trim();
    this.customAlias.set(val);

    clearTimeout(this.aliasCheckDebounceTimer);
    if (!val) {
      this.aliasAvailable.set(true);
      this.aliasChecking.set(false);
      return;
    }

    const check = this.security.validateCustomAlias(val);
    if (!check.isValid) {
      this.aliasAvailable.set(false);
      return;
    }

    this.aliasChecking.set(true);
    this.aliasCheckDebounceTimer = setTimeout(async () => {
      const isAvailable = await this.shortener.checkAliasAvailability(val);
      this.aliasAvailable.set(isAvailable);
      this.aliasChecking.set(false);
    }, 250);
  }

  selectExpiry(preset: ExpiryPreset): void {
    this.selectedExpiry.set(preset);
    this.isExpiryOpen.set(false);
  }

  getExpiryLabel(preset: ExpiryPreset): string {
    const found = this.expiryOptions.find(o => o.id === preset);
    return found ? found.label : '30 days (default)';
  }

  clearUrlInput(): void {
    this.longUrl.set('');
    this.urlInputRef()?.nativeElement.focus();
  }

  async pasteFromClipboard(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.longUrl.set(text.trim());
          this.showToast('Link pasted');
        }
      } catch {
        this.urlInputRef()?.nativeElement.focus();
      }
    }
  }

  onEnterKey(): void {
    if (this.isFormValid() && !this.isSubmitting()) {
      this.onShortenClick();
    }
  }

  async onShortenClick(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    try {
      const startDateMs = this.formStartDate() ? new Date(this.formStartDate()).getTime() : null;

      const res = await this.shortener.shortenUrl({
        url: this.longUrl(),
        customAlias: this.customAlias().trim() || undefined,
        expiryPreset: this.selectedExpiry(),
        password: this.formPassword().trim() || undefined,
        maxClicks: this.formMaxClicks(),
        isOneTime: this.formIsOneTime(),
        startDate: startDateMs,
        label: this.formLabel().trim() || undefined
      });

      if (res.success) {
        this.lastResult.set(res);
        // Clear password immediately from memory & component state after submission
        this.formPassword.set('');
        this.showToast('Link shortened');
        await this.refreshMyLinks();
      } else {
        this.showToast(res.error || "We couldn't complete that. Please try again in a few minutes.");
      }
    } catch (err: any) {
      this.showToast(err?.message || "We couldn't complete that. Please try again in a few minutes.");
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    if (this.isResetting()) return;
    this.isResetting.set(true);

    setTimeout(() => {
      this.lastResult.set(null);
      this.longUrl.set('');
      this.customAlias.set('');
      this.selectedExpiry.set(SHORTENER_CONFIG.defaultExpiry);
      this.formPassword.set('');
      this.formMaxClicks.set(null);
      this.formIsOneTime.set(false);
      this.formStartDate.set('');
      this.formLabel.set('');
      this.showOptions.set(false);
      this.isResetting.set(false);

      setTimeout(() => {
        this.urlInputRef()?.nativeElement.focus();
      }, 50);
    }, 240);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // PART C FILTER & BULK SELECTION ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  toggleActivityFilter(val: ActivityFilter): void {
    const curr = this.filterCriteria();
    const nextSet = new Set(curr.activity);
    if (nextSet.has(val)) nextSet.delete(val);
    else nextSet.add(val);
    this.filterCriteria.set({ ...curr, activity: nextSet });
  }

  toggleExpiryFilter(val: ExpiryFilter): void {
    const curr = this.filterCriteria();
    const nextSet = new Set(curr.expiry);
    if (nextSet.has(val)) nextSet.delete(val);
    else nextSet.add(val);
    this.filterCriteria.set({ ...curr, expiry: nextSet });
  }

  setProtectionFilter(val: ProtectionFilter): void {
    const curr = this.filterCriteria();
    this.filterCriteria.set({ ...curr, protection: val });
  }

  toggleRuleFilter(val: RuleFilter): void {
    const curr = this.filterCriteria();
    const nextSet = new Set(curr.rules);
    if (nextSet.has(val)) nextSet.delete(val);
    else nextSet.add(val);
    this.filterCriteria.set({ ...curr, rules: nextSet });
  }

  setCreatedPreset(val: CreatedRangePreset): void {
    const curr = this.filterCriteria();
    const nextVal = curr.createdPreset === val ? 'ANY_TIME' : val;
    this.filterCriteria.set({ ...curr, createdPreset: nextVal });
  }

  toggleTagFilter(tag: string): void {
    const curr = this.filterCriteria();
    const nextSet = new Set(curr.tags);
    const lower = tag.toLowerCase();
    if (nextSet.has(lower)) nextSet.delete(lower);
    else nextSet.add(lower);
    this.filterCriteria.set({ ...curr, tags: nextSet });
  }

  toggleDomainFilter(domain: string): void {
    const curr = this.filterCriteria();
    const nextSet = new Set(curr.domains);
    const lower = domain.toLowerCase();
    if (nextSet.has(lower)) nextSet.delete(lower);
    else nextSet.add(lower);
    this.filterCriteria.set({ ...curr, domains: nextSet });
  }

  toggleNeedsReviewFilter(): void {
    const curr = this.filterCriteria();
    this.filterCriteria.set({ ...curr, needsReview: !curr.needsReview });
  }

  clearAllAttributeFilters(): void {
    this.filterCriteria.set(createDefaultFilterCriteria());
    this.searchQuery.set('');
    this.statusFilter.set('ALL');
  }

  // Bulk Selection Handlers
  toggleSelectLink(code: string): void {
    const next = new Set(this.selectedCodes());
    if (next.has(code)) next.delete(code);
    else next.add(code);
    this.selectedCodes.set(next);
  }

  toggleSelectAll(): void {
    const currentSelected = this.selectedCodes();
    const currentFiltered = this.filteredLinks();
    if (currentSelected.size >= currentFiltered.length && currentFiltered.length > 0) {
      this.selectedCodes.set(new Set());
    } else {
      const allCodes = new Set(currentFiltered.map(l => l.code));
      this.selectedCodes.set(allCodes);
    }
  }

  async executeBulkDeactivate(): Promise<void> {
    const codes = Array.from(this.selectedCodes());
    if (codes.length === 0 || this.isProcessingBulk()) return;
    this.isProcessingBulk.set(true);
    try {
      const count = await this.shortener.bulkDeactivate(codes);
      this.selectedCodes.set(new Set());
      await this.refreshMyLinks();
      this.showToast(`${count} links deactivated`);
    } catch (err: any) {
      this.showToast(err?.message || "Your changes weren't saved. Please try again.");
    } finally {
      this.isProcessingBulk.set(false);
    }
  }

  async executeBulkReactivate(): Promise<void> {
    const codes = Array.from(this.selectedCodes());
    if (codes.length === 0 || this.isProcessingBulk()) return;
    this.isProcessingBulk.set(true);
    try {
      const count = await this.shortener.bulkReactivate(codes);
      this.selectedCodes.set(new Set());
      await this.refreshMyLinks();
      this.showToast(`${count} links reactivated`);
    } catch (err: any) {
      this.showToast(err?.message || "Your changes weren't saved. Please try again.");
    } finally {
      this.isProcessingBulk.set(false);
    }
  }

  async executeBulkDelete(): Promise<void> {
    const codes = Array.from(this.selectedCodes());
    if (codes.length === 0 || this.isProcessingBulk()) return;
    this.isProcessingBulk.set(true);
    try {
      const count = await this.shortener.bulkDelete(codes);
      this.selectedCodes.set(new Set());
      this.isBulkDeleteModalOpen.set(false);
      await this.refreshMyLinks();
      this.showToast(`${count} links deleted`);
    } catch (err: any) {
      this.showToast(err?.message || "We couldn't complete that. Please try again in a few minutes.");
    } finally {
      this.isProcessingBulk.set(false);
    }
  }

  async openStatsModal(code: string): Promise<void> {
    this.statsCode.set(code);
    this.loadingStats.set(true);
    this.isStatsDrawerOpen.set(true);
    try {
      const stats = await this.shortener.getLinkStats(code);
      this.linkStats.set(stats);
    } catch (err: any) {
      this.showToast(err?.message || "We couldn't complete that. Please try again in a few minutes.");
      this.linkStats.set(null);
    } finally {
      this.loadingStats.set(false);
    }
  }

  closeStatsModal(): void {
    this.isStatsDrawerOpen.set(false);
    this.linkStats.set(null);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MY LINKS ACTIONS (Edit, Deactivate/Reactivate, Duplicate, Delete)
  // ═════════════════════════════════════════════════════════════════════════

  openEditDrawer(link: ShortLinkRecord): void {
    this.editingRecord.set(link);
    this.editTargetUrl.set(link.targetUrl);
    this.editLabel.set(link.label || '');
    this.editMaxClicks.set(link.maxClicks ?? null);
    this.editIsOneTime.set(!!link.isOneTime);
    this.editStartDate.set(link.startDate ? new Date(link.startDate).toISOString().slice(0, 16) : '');
    this.editPasswordAction.set('keep');
    this.editNewPassword.set('');
    this.editShowPassword.set(false);

    // Load stats preview into drawer
    this.openStatsModal(link.code);

    // Map existing expiresAt to preset if matches, else default
    this.editExpiry.set(this.inferExpiryPreset(link.expiresAt));

    this.isEditDrawerOpen.set(true);
  }

  closeEditDrawer(): void {
    this.isEditDrawerOpen.set(false);
    this.editingRecord.set(null);
  }

  private inferExpiryPreset(expiresAt: number | null): ExpiryPreset {
    if (!expiresAt) return 'never';
    const remainingMs = expiresAt - Date.now();
    const days = remainingMs / (24 * 60 * 60 * 1000);
    if (days <= 8 && days >= 5) return '7_days';
    if (days <= 32 && days >= 25) return '30_days';
    if (days >= 300) return '1_year';
    return '30_days';
  }

  async saveEdit(): Promise<void> {
    const record = this.editingRecord();
    if (!record || !this.isEditFormValid() || this.isSavingEdit()) return;

    this.isSavingEdit.set(true);

    try {
      const updates: any = {
        targetUrl: this.editTargetUrl().trim(),
        label: this.editLabel().trim() || undefined,
        maxClicks: this.editMaxClicks(),
        isOneTime: this.editIsOneTime(),
        startDate: this.editStartDate() ? new Date(this.editStartDate()).getTime() : null
      };

      // Expiry calculation
      const expiryOpt = SHORTENER_CONFIG.expiryOptions.find(o => o.id === this.editExpiry());
      updates.expiresAt = expiryOpt && expiryOpt.durationMs ? Date.now() + expiryOpt.durationMs : null;

      // Password handling
      if (this.editPasswordAction() === 'remove') {
        (updates as any).password = '__REMOVE__';
      } else if (this.editPasswordAction() === 'set') {
        (updates as any).password = this.editNewPassword().trim();
      }

      await this.shortener.updateLink(record.code, updates);
      this.editNewPassword.set('');
      await this.refreshMyLinks();
      this.closeEditDrawer();
      this.showToast('Link updated');
    } catch (err: any) {
      this.showToast(err?.message || "Your changes weren't saved. Please try again.");
    } finally {
      this.isSavingEdit.set(false);
    }
  }

  async toggleDeactivation(link: ShortLinkRecord): Promise<void> {
    const nextState = !link.isDeactivated;
    try {
      if (nextState) {
        await this.shortener.deactivateLink(link.code);
      } else {
        await this.shortener.reactivateLink(link.code);
      }
      await this.refreshMyLinks();
      this.showToast(nextState ? 'Link deactivated' : 'Link reactivated');
    } catch (err: any) {
      this.showToast(err?.message || "Your changes weren't saved. Please try again.");
    }
  }

  async duplicateLink(code: string): Promise<void> {
    try {
      const res = await this.shortener.duplicateLink(code);
      if (res.success && res.code) {
        await this.refreshMyLinks();
        this.showToast(`Link duplicated as ${res.code}`);
      } else {
        this.showToast(res.error || "We couldn't complete that. Please try again in a few minutes.");
      }
    } catch (err: any) {
      this.showToast(err?.message || "We couldn't complete that. Please try again in a few minutes.");
    }
  }

  readonly linkPendingDelete = signal<string | null>(null);

  requestDeleteLink(code: string): void {
    this.linkPendingDelete.set(code);
  }

  cancelDelete(): void {
    this.linkPendingDelete.set(null);
  }

  async confirmDelete(): Promise<void> {
    const code = this.linkPendingDelete();
    if (!code) return;
    this.linkPendingDelete.set(null);

    try {
      await this.shortener.deleteLink(code);
      await this.refreshMyLinks();
      if (this.lastResult()?.code === code) {
        this.lastResult.set(null);
      }
      this.showToast('Link deleted');
    } catch (err: any) {
      this.showToast(err?.message || "We couldn't complete that. Please try again in a few minutes.");
    }
  }

  async deleteLink(code: string): Promise<void> {
    this.requestDeleteLink(code);
  }

  toggleFormPassword(inputEl?: HTMLInputElement): void {
    const next = !this.showFormPassword();
    if (inputEl) {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      this.showFormPassword.set(next);
      setTimeout(() => {
        inputEl.focus();
        if (start != null && end != null) {
          inputEl.setSelectionRange(start, end);
        }
      }, 0);
    } else {
      this.showFormPassword.set(next);
    }
  }

  toggleEditPassword(inputEl?: HTMLInputElement): void {
    const next = !this.editShowPassword();
    if (inputEl) {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      this.editShowPassword.set(next);
      setTimeout(() => {
        inputEl.focus();
        if (start != null && end != null) {
          inputEl.setSelectionRange(start, end);
        }
      }, 0);
    } else {
      this.editShowPassword.set(next);
    }
  }

  toggleUnlockPassword(inputEl?: HTMLInputElement): void {
    const next = !this.showUnlockPassword();
    if (inputEl) {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      this.showUnlockPassword.set(next);
      setTimeout(() => {
        inputEl.focus();
        if (start != null && end != null) {
          inputEl.setSelectionRange(start, end);
        }
      }, 0);
    } else {
      this.showUnlockPassword.set(next);
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // CSV & RECOVERY EXPORT / IMPORT
  // ═════════════════════════════════════════════════════════════════════════

  exportCsv(): void {
    const list = this.filteredLinks();
    if (list.length === 0) {
      this.showToast('No links to export');
      return;
    }
    const baseUrl = this.buildShortUrl('').replace(/\/$/, '');
    const csvContent = this.storage.exportToCsv(list, baseUrl);
    this.triggerDownload(csvContent, `acklet-links-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    this.showToast('CSV exported');
  }

  async exportRecoveryJson(): Promise<void> {
    const json = await this.storage.exportRecoveryFile(this.myLinks());
    this.triggerDownload(json, `acklet-recovery-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    this.showToast('Recovery file exported');
  }

  async onRecoveryFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await this.storage.importRecoveryFile(text);
      if (res.success) {
        // Undelete/restore any soft-deleted links on the backend for this owner
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed?.links) && parsed.links.length > 0) {
            const codes = parsed.links.map((l: any) => l.code).filter(Boolean);
            if (codes.length > 0) {
              await this.shortener.bulkRestore(codes);
            }
          }
        } catch (_) {}

        await this.refreshMyLinks();
        this.recoveryStatusMessage.set(`Restored ${res.importedCount} links`);
        this.showToast(`Restored ${res.importedCount} links`);
        setTimeout(() => this.isRecoveryModalOpen.set(false), 1200);
      } else {
        this.recoveryStatusMessage.set(res.error || "That file couldn't be read. Choose a backup file downloaded from this tool.");
      }
    } catch {
      this.recoveryStatusMessage.set("That file couldn't be read. Choose a backup file downloaded from this tool.");
    } finally {
      input.value = '';
    }
  }

  private triggerDownload(content: string, filename: string, mime: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // UTILITIES & FEEDBACK
  // ═════════════════════════════════════════════════════════════════════════

  async copyToClipboard(text: string): Promise<void> {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.isCopied.set(true);
      this.showToast('Link copied');
      setTimeout(() => this.isCopied.set(false), 1500);
    } catch {
      this.showToast("Couldn't copy. Select the link and copy it manually.");
    }
  }

  openQrGenerator(shortUrl: string): void {
    const handoffUrl = this.shortener.buildQrGeneratorHandoffUrl(shortUrl);
    if (typeof window !== 'undefined') {
      window.open(handoffUrl, '_blank', 'noopener,noreferrer');
    }
  }

  enterPreviewForCode(code: string): void {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', `/${code}+`);
      this.inspectRouteAndRedirect();
    }
  }

  exitPreviewMode(): void {
    this.activePreviewRecord.set(null);
    this.navigateTo('MAIN');
  }

  exitRedirectMode(): void {
    this.navigateTo('MAIN');
  }

  openReportModal(code: string): void {
    this.reportingCode.set(code);
    this.reportReason.set('phishing');
    this.reportComment.set('');
    this.isReportModalOpen.set(true);
  }

  closeReportModal(): void {
    this.isReportModalOpen.set(false);
  }

  async submitReport(): Promise<void> {
    const code = this.reportingCode();
    const reason = this.reportReason();
    const comment = this.reportComment();
    this.closeReportModal();

    try {
      if (code) {
        await this.shortener.reportLink(code, reason, comment);
      }
      this.showToast('Report received. Thank you.');
    } catch (err: any) {
      this.showToast(err?.message || 'Report received. Thank you.');
    }
  }

  onProceedFromPreview(code: string): void {
    window.location.href = `/s/${encodeURIComponent(code)}`;
  }

  buildShortUrl(code: string): string {
    return this.shortener.buildShortUrl(code);
  }

  getLinkStatus(record: ShortLinkRecord): LinkStatus {
    return computeLinkStatus(record);
  }

  getStatusBadgeClass(status: LinkStatus): string {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'SCHEDULED': return 'status-scheduled';
      case 'EXPIRED': return 'status-expired';
      case 'LIMIT_REACHED': return 'status-limit';
      case 'DEACTIVATED': return 'status-deactivated';
    }
  }

  getStatusLabel(status: LinkStatus | FilterStatus): string {
    if (status === 'ALL') return 'All';
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'SCHEDULED': return 'Scheduled';
      case 'EXPIRED': return 'Expired';
      case 'LIMIT_REACHED': return 'Limit reached';
      case 'DEACTIVATED': return 'Deactivated';
    }
  }

  formatDate(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatRelativeTime(timestamp: number | null | undefined): string {
    if (!timestamp) return '-';
    const now = Date.now();
    const diffMs = now - timestamp;
    if (diffMs < 0) return 'Just now';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1 minute ago';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minutes ago`;

    const diffHours = Math.floor(diffMin / 60);
    const nowDate = new Date(now);
    const itemDate = new Date(timestamp);
    const isToday = nowDate.getFullYear() === itemDate.getFullYear() &&
                    nowDate.getMonth() === itemDate.getMonth() &&
                    nowDate.getDate() === itemDate.getDate();

    if (isToday) {
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      return 'Today';
    }

    const yesterday = new Date(now);
    yesterday.setDate(nowDate.getDate() - 1);
    const isYesterday = yesterday.getFullYear() === itemDate.getFullYear() &&
                        yesterday.getMonth() === itemDate.getMonth() &&
                        yesterday.getDate() === itemDate.getDate();
    if (isYesterday) return 'Yesterday';

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths <= 1) return '1 month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;

    const diffYears = Math.floor(diffDays / 365);
    if (diffYears <= 1) return '1 year ago';
    return `${diffYears} years ago`;
  }

  formatDateTime(timestamp: number | null): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatExpiry(expiresAt: number | null): string {
    if (!expiresAt) return 'Never expires';
    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) return 'Expired';

    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  }

  getProtocolLabel(url: string): string {
    try {
      return new URL(url).protocol.toUpperCase().replace(':', '');
    } catch {
      return 'HTTPS';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    if (this.isExpiryOpen() && !this.hostEl.nativeElement.querySelector('.custom-dropdown')?.contains(target)) {
      this.isExpiryOpen.set(false);
    }
    if (this.isStatusDropdownOpen() && !this.hostEl.nativeElement.querySelector('.status-dropdown-wrap')?.contains(target)) {
      this.isStatusDropdownOpen.set(false);
    }
    if (this.isSortDropdownOpen() && !this.hostEl.nativeElement.querySelector('.sort-dropdown-wrap')?.contains(target)) {
      this.isSortDropdownOpen.set(false);
    }
    if (this.editIsExpiryOpen() && !this.hostEl.nativeElement.querySelector('.edit-expiry-dropdown')?.contains(target)) {
      this.editIsExpiryOpen.set(false);
    }
  }

  private async refreshMyLinks(): Promise<void> {
    try {
      const links = await this.shortener.getMyLinks();
      this.myLinks.set(links);
    } catch {
      this.myLinks.set(this.storage.getCachedMyLinks());
    }
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set('');
    }, SHORTENER_CONFIG.toastDurationMs);
  }
}
