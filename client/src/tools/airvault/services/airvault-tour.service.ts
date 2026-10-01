import { Injectable, signal, computed, inject, effect, untracked } from "@angular/core";
import { AirVaultUIStore } from "./airvault-ui.store";
import { AirVaultDeviceStore } from "./airvault-device.store";

/** Lighter secondary emphasis callout (small arrow + note near a different element) */
export interface SecondaryCallout {
  /** CSS / data-tour attribute selector for the secondary element */
  targetSelector: string;
  /** Short note shown next to the secondary element */
  message: string;
}

export interface TourStep {
  /** CSS selector (or data-tour attribute selector) for the primary spotlight target */
  targetSelector: string;
  /** Headline shown in the tooltip */
  title: string;
  /** Body copy – innerHTML, supports strong/kbd */
  description: string;
  /** Which side of the spotlight the tooltip appears on */
  placement?: "top" | "bottom" | "left" | "right";
  /** Optional Lucide icon name */
  icon?: string;
  /** If true the highlighted element stays interactive during this step */
  interactive?: boolean;
  /** Extra padding around the spotlight rect (px) */
  spotlightPadding?: number;
  /**
   * Optional secondary selector whose bounding rect is UNIONED with the primary
   * spotlight — used for step 1 to highlight sidebar + footer entry points together.
   */
  secondaryTargetSelector?: string;
  /**
   * Lighter secondary callout (arrow + note) near a different element.
   * Used for step 2: point at mode-switcher tabs with a sub-note.
   */
  secondaryCallout?: SecondaryCallout;
  /**
   * Strategy when the target element is not in the DOM:
   *   "center"             — show tooltip centred, no spotlight (default)
   *   "skip"               — skip this step silently
   *   "open-pairing-modal" — programmatically open pairing modal then wait
   */
  fallbackIfMissing?: "center" | "skip" | "open-pairing-modal";
  /**
   * Auto-advance trigger name:
   *   "pairing-modal-opened"  — UIStore.showPairingModal becomes true
   *   "device-paired"         — pairedDevices().length increases
   *   "device-toggled"        — user taps a paired-device icon
   *   "composer-has-content"  — composer receives text/file (set externally)
   */
  autoAdvanceOn?: "pairing-modal-opened" | "device-paired" | "device-toggled" | "composer-has-content";
}

// ── 6-step tour spec ─────────────────────────────────────────────────────────
const TOUR_STEPS: TourStep[] = [
  // Step 1 — Entry points (sidebar + footer, union spotlight)
  {
    targetSelector: "[data-tour='pair-device-btn']",
    secondaryTargetSelector: "[data-tour='footer-pair-btn']",
    title: "Pair a Device",
    description:
      "Ready to share across your devices? Tap the <strong>+</strong> icon in the sidebar <em>or</em> the <strong>+ Pair Device</strong> button at the bottom — both open the same pairing screen.",
    placement: "right",
    icon: "smartphone",
    spotlightPadding: 12,
    autoAdvanceOn: "pairing-modal-opened",
  },

  // Step 2 — My Device identity section (inside pairing modal)
  {
    targetSelector: "[data-tour='identity-section']",
    secondaryCallout: {
      targetSelector: "[data-tour='pair-mode-switcher']",
      message: "Prefer QR or a 6-digit PIN? Switch pairing modes at the top.",
    },
    title: "Your Device Identity",
    description:
      "This is <strong>your</strong> device username and 4-digit PIN. Tap the <strong>&#9998; pencil</strong> next to either to change them to something memorable — you will need these same credentials to log in from another device later.",
    placement: "bottom",
    icon: "fingerprint",
    spotlightPadding: 10,
    fallbackIfMissing: "open-pairing-modal",
  },

  // Step 3 — Remote pairing form (inside pairing modal)
  {
    targetSelector: "[data-tour='pair-remote-form']",
    title: "Connect to Another Device",
    description:
      "Enter the <strong>username</strong> and <strong>4-digit PIN</strong> of the device you want to connect, then tap <strong>Pair</strong>. Once linked, you can share anything between them instantly.",
    placement: "top",
    icon: "link",
    spotlightPadding: 12,
    fallbackIfMissing: "open-pairing-modal",
    autoAdvanceOn: "device-paired",
  },

  // Step 4 — First paired device icon in sidebar
  {
    targetSelector: "[data-tour='paired-device-icon']",
    title: "Your Connected Device",
    description:
      "Your paired device now shows up here. <strong>Tap its icon</strong> to temporarily stop sending to it without removing the pairing — tap again anytime to re-enable.",
    placement: "right",
    icon: "radio",
    spotlightPadding: 10,
    autoAdvanceOn: "device-toggled",
    fallbackIfMissing: "skip",
  },

  // Step 5 — Composer bar
  {
    targetSelector: "[data-tour='composer-bar']",
    title: "Send Anything",
    description:
      "Type, paste, or <strong>drop files, images, or links</strong> into this box. Whatever you add here gets sent to your connected device(s) instantly.",
    placement: "top",
    icon: "inbox",
    spotlightPadding: 10,
    autoAdvanceOn: "composer-has-content",
  },

  // Step 6 — Send button (final)
  {
    targetSelector: "[data-tour='send-btn']",
    title: "Tap to Send — End-to-End Encrypted",
    description:
      "When you are ready, hit the <strong>&#128640; Send</strong> button (or <kbd>Cmd+Enter</kbd>) to instantly deliver this to all connected devices — encrypted, no extra steps.",
    placement: "top",
    icon: "rocket",
    spotlightPadding: 8,
    fallbackIfMissing: "center",
  },
];

const STORAGE_KEY = "acklet_airvault_tour_done";

@Injectable({ providedIn: "root" })
export class AirVaultTourService {
  readonly uiStore = inject(AirVaultUIStore);
  private deviceStore = inject(AirVaultDeviceStore);

  /** Whether the tour overlay is currently active */
  readonly isActive = signal<boolean>(false);

  /** Current step index */
  readonly currentStepIndex = signal<number>(0);

  /** All configured steps */
  readonly steps = TOUR_STEPS;

  /** Total number of steps */
  readonly totalSteps = this.steps.length;

  readonly currentStep = computed<TourStep | null>(() => {
    const idx = this.currentStepIndex();
    return idx >= 0 && idx < this.steps.length ? this.steps[idx] : null;
  });

  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(
    () => this.currentStepIndex() === this.steps.length - 1
  );

  /** Snapshot of paired-device count for detecting new pairings */
  private _pairedCountSnapshot = 0;

  constructor() {
    // Auto-advance: pairing modal opened → step 0 → 1
    effect(() => {
      const active = this.isActive();
      const modalOpen = this.uiStore.showPairingModal();
      untracked(() => {
        if (!active) return;
        const step = this.steps[this.currentStepIndex()];
        if (step?.autoAdvanceOn === "pairing-modal-opened" && modalOpen) {
          setTimeout(() => this.next(), 350);
        }
      });
    });

    // Auto-advance: device paired → step 2 → 3
    effect(() => {
      const active = this.isActive();
      const count = this.deviceStore.pairedDevices().length;
      untracked(() => {
        if (!active) return;
        const step = this.steps[this.currentStepIndex()];
        if (
          step?.autoAdvanceOn === "device-paired" &&
          count > this._pairedCountSnapshot
        ) {
          this._pairedCountSnapshot = count;
          setTimeout(() => this.next(), 600);
        }
      });
    });

    // Auto-sync pairing modal visibility with current tour step
    effect(() => {
      const active = this.isActive();
      const stepIdx = this.currentStepIndex();
      untracked(() => {
        if (!active) {
          if (this.uiStore.showPairingModal()) {
            this.uiStore.showPairingModal.set(false);
          }
          return;
        }
        const step = this.steps[stepIdx];
        if (!step) return;

        // Steps 2 and 3 require the pairing modal to be open
        const isModalStep =
          step.targetSelector === "[data-tour='identity-section']" ||
          step.targetSelector === "[data-tour='pair-remote-form']";

        if (isModalStep) {
          if (!this.uiStore.showPairingModal()) {
            this.uiStore.showPairingModal.set(true);
          }
        } else {
          // All other steps (Step 1 entry, Step 4 device, Step 5 composer, Step 6 send) require the pairing modal to be closed
          if (this.uiStore.showPairingModal()) {
            this.uiStore.showPairingModal.set(false);
          }
        }
      });
    });
  }

  /** Returns true if this device has already completed or skipped the tour */
  hasTourBeenCompleted(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  /** Call this right after a brand-new guest profile is created */
  startTourForNewGuest() {
    if (this.hasTourBeenCompleted()) return;
    this._pairedCountSnapshot = this.deviceStore.pairedDevices().length;
    this.currentStepIndex.set(0);
    this.isActive.set(true);
  }

  /** Call when the user taps a paired-device icon — auto-advances step 3 */
  onDeviceToggled() {
    if (!this.isActive()) return;
    const step = this.steps[this.currentStepIndex()];
    if (step?.autoAdvanceOn === "device-toggled") {
      setTimeout(() => this.next(), 400);
    }
  }

  /** Call when the composer receives content — auto-advances step 4 */
  onComposerHasContent() {
    if (!this.isActive()) return;
    const step = this.steps[this.currentStepIndex()];
    if (step?.autoAdvanceOn === "composer-has-content") {
      setTimeout(() => this.next(), 300);
    }
  }

  /** Opens the pairing modal programmatically (fallback for modal-interior steps) */
  openPairingModalForTour() {
    this.uiStore.showPairingModal.set(true);
  }

  next() {
    const currentIdx = this.currentStepIndex();
    let nextIdx = currentIdx + 1;

    // When advancing past pairing modal steps (indices 1 & 2), close the pairing modal
    if (currentIdx === 1 || currentIdx === 2) {
      this.uiStore.showPairingModal.set(false);
    }

    // If next step is targeting paired device icon, but no paired devices exist, skip directly to composer bar
    if (
      nextIdx < this.steps.length &&
      this.steps[nextIdx].targetSelector === "[data-tour='paired-device-icon']" &&
      this.deviceStore.pairedDevices().length === 0
    ) {
      nextIdx++;
    }

    if (nextIdx >= this.steps.length) {
      this.complete();
    } else {
      this.currentStepIndex.set(nextIdx);
    }
  }

  skip() {
    this._persist();
    this.isActive.set(false);
    this.uiStore.showPairingModal.set(false);
  }

  complete() {
    this._persist();
    this.isActive.set(false);
    this.uiStore.showPairingModal.set(false);
  }

  private _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  }
}
