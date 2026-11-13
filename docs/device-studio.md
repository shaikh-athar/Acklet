# Acklet Device Studio — Complete System Specification & Architecture Reference

> **Authoritative Technical Documentation & Architecture Decision Log**
> *Last Updated: November 2026 | Surface: Tools (`client/apps/tool-device-studio`)*
> *Reference Document for Engineers, Designers, and AI Agents Resuming or Extending Device Studio.*

---

## Table of Contents

1. [Executive Summary & Tool Metadata](#1-executive-summary--tool-metadata)
2. [Core Architecture & Technology Stack](#2-core-architecture--technology-stack)
3. [Architecture Decision Records (ADRs) — The Definitive Decision Log](#3-architecture-decision-records-adrs--the-definitive-decision-log)
   - [ADR-001: Unified Acklet Blue Accent Palette](#adr-001-unified-acklet-blue-accent-palette)
   - [ADR-002: Dual-Theme Contrast & Adaptive Media Containers](#adr-002-dual-theme-contrast--adaptive-media-containers)
   - [ADR-003: Spartan UI & Custom Acklet Dropdown Primitives](#adr-003-spartan-ui--custom-acklet-dropdown-primitives)
   - [ADR-004: Three-Tier Information Priority Hierarchy](#adr-004-three-tier-information-priority-hierarchy)
   - [ADR-005: Two-Column Workspace Layout & Whitespace Elimination](#adr-005-two-column-workspace-layout--whitespace-elimination)
   - [ADR-006: Speaker Test — Step-by-Step Default & Inline Final Results](#adr-006-speaker-test--step-by-step-default--inline-final-results)
   - [ADR-007: Speaker Audio Engine — Bell Chime Asset & Synchronous Stop Pipeline](#adr-007-speaker-audio-engine--bell-chime-asset--synchronous-stop-pipeline)
   - [ADR-008: Speaker Single-Source Audio Output & Volume Control](#adr-008-speaker-single-source-audio-output--volume-control)
   - [ADR-009: Internet Speed Test — Ookla-Style "GO" Button & Zero-Overlap Horseshoe Gauge](#adr-009-internet-speed-test--ookla-style-go-button--zero-overlap-horseshoe-gauge)
   - [ADR-010: Microphone Test — 310px Geometry & Glitch-Free Canvas Lifecycle](#adr-010-microphone-test--310px-geometry--glitch-free-canvas-lifecycle)
   - [ADR-011: Public IP Lookup — Multi-Provider Fallback & Privacy Score Simplification](#adr-011-public-ip-lookup--multi-provider-fallback--privacy-score-simplification)
   - [ADR-012: Screen Sharing Test — Auto-Fitting Card & Zero-Manual-Fit Buttons](#adr-012-screen-sharing-test--auto-fitting-card--zero-manual-fit-buttons)
   - [ADR-013: Meeting Readiness — Single-Row Badges & Actionable Failure Guidance](#adr-013-meeting-readiness--single-row-badges--actionable-failure-guidance)
   - [ADR-014: System Information — Consolidated 1-Line Spec Bar](#adr-014-system-information--consolidated-1-line-spec-bar)
   - [ADR-015: 100% Client-Side Zero-Storage Privacy Guarantee](#adr-015-100-client-side-zero-storage-privacy-guarantee)
   - [ADR-016: Zero-Dependency Printable PDF Reporting](#adr-016-zero-dependency-printable-pdf-reporting)
4. [Module-by-Module Technical Deep Dive](#4-module-by-module-technical-deep-dive)
   - [4.1 Webcam Test](#41-webcam-test-webcam-webcam-test-camera)
   - [4.2 Microphone Test](#42-microphone-test-microphone-mic-test-mic)
   - [4.3 Speaker & Headphone Test](#43-speaker--headphone-test-speaker-audio-test-headphone)
   - [4.4 Internet Speed Test](#44-internet-speed-test-speed-speed-test)
   - [4.5 Public IP Checker](#45-public-ip-checker-ip-ip-lookup)
   - [4.6 Screen Sharing Test](#46-screen-sharing-test-screen-screen-test)
   - [4.7 Meeting Readiness Quick Check](#47-meeting-readiness-quick-check)
   - [4.8 Diagnostic History & Multi-Format Reports Dashboard](#48-diagnostic-history--multi-format-reports-dashboard-history-reports)
5. [State Management, Signals & Lifecycle Architecture](#5-state-management-signals--lifecycle-architecture)
6. [Comprehensive Codebase Map & File Inventory](#6-comprehensive-codebase-map--file-inventory)
7. [Troubleshooting, Gotchas & Debugging Playbook](#7-troubleshooting-gotchas--debugging-playbook)
8. [Future Roadmap & Open Decisions (Where to Pick Up)](#8-future-roadmap--open-decisions-where-to-pick-up)
9. [Verification Commands & Quality Gates](#9-verification-commands--quality-gates)

---

## 1. Executive Summary & Tool Metadata

Acklet Device Studio is a unified, browser-side diagnostic and hardware/network calibration suite built for remote professionals, software engineers, and conference attendees. It consolidates six independent testing modules under one cohesive, high-performance workspace within the Acklet monorepo ecosystem.

- **Tool Slug**: `devicestudio` (canonical aliases: `device-studio`, `tools/devicestudio`)
- **Subdomain Routing**: `devicestudio.acklet.com` (locally: `devicestudio.localhost:4200`)
- **Status**: Production Ready / Fully Refined
- **Requires Backend**: `false` (100% Client-Side In-Memory Execution)
- **Primary Accent Color**: Acklet Blue (`#2563EB` Light / `#3B82F6` Dark, Hue: 217)
- **Surface**: Tools Surface ([client/apps/tool-device-studio](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio))
- **Related Documentation**:
  - [ui-design-system.md](file:///Users/ayaz/Acklet-file-Converter/docs/ui-design-system.md)
  - [responsive-design-system.md](file:///Users/ayaz/Acklet-file-Converter/docs/responsive-design-system.md)
  - [standalone-tool-architecture.md](file:///Users/ayaz/Acklet-file-Converter/docs/standalone-tool-architecture.md)
  - [color-studio.md](file:///Users/ayaz/Acklet-file-Converter/docs/color-studio.md)
  - [verification-guide.md](file:///Users/ayaz/Acklet-file-Converter/docs/verification-guide.md)

---

## 2. Core Architecture & Technology Stack

Device Studio is engineered with modern web standards, strict surface boundary isolation, and reactive Angular 22 primitives:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Acklet Device Studio                            │
├────────────────────────────────────────────────────────────────────────┤
│  Routing Layer: Angular Router with Lazy-Loaded Standalone Components  │
│  [devicestudio.routes.ts]                                              │
├────────────────────────────────────────────────────────────────────────┤
│  State & Intelligence Layer: Signals-Driven Reactive Services          │
│  ├── DeviceStudioStateService (Health score, active tab, toasts)       │
│  ├── WebcamService (MediaStream, optical analysis, snapshot canvas)    │
│  ├── MicrophoneService (AudioContext, FFT Analyser, MediaRecorder)     │
│  ├── SpeakerService (AudioBufferSource, panning, frequency sweep)      │
│  ├── SpeedTestService (Cloudflare Anycast, chunk streaming)            │
│  ├── IpCheckerService (Multi-provider fallback, WebRTC STUN leak)      │
│  ├── ScreenShareService (getDisplayMedia, FPS tracking, canvas grab)   │
│  ├── SystemInfoService (OS, browser, screen resolution detection)      │
│  ├── DiagnosticHistoryService (localStorage persistence, comparison)   │
│  └── DiagnosticReportService (Zero-dependency printable PDF / JSON)    │
├────────────────────────────────────────────────────────────────────────┤
│  UI Primitives & Foundation:                                           │
│  ├── Spartan UI Helm Primitives (HlmButton, HlmBadge, HlmInput)        │
│  ├── Acklet Custom Dropdown Component (AckletDropdownComponent)        │
│  ├── Tool Shell Icon System (TsIconComponent via TS_ICON_MAP)          │
│  └── Dual-Theme CSS Variables (--bg-*, --text-*, --border-*, --accent-*)│
└────────────────────────────────────────────────────────────────────────┘
```

- **Framework**: Angular 22+ (Standalone Components, Signals, `ChangeDetectionStrategy.OnPush`)
- **Reactive Primitives**: Angular Signals (`signal()`, `computed()`) with zero RxJS subscription overhead in component templates.
- **Styling Architecture**: Tailwind CSS v4, custom CSS properties defined in [device-studio-tokens.css](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/styles/device-studio-tokens.css), dual-theme tokens (`client/packages/tool-shell/src/styles/tokens.css`).
- **Test Framework**: Vitest (5 test suites, 51 unit tests running in `apps/tool-device-studio`).

---

## 3. Architecture Decision Records (ADRs) — The Definitive Decision Log

This section records every critical architectural and UX decision made during the evolution of Device Studio, including the context, considered alternatives, chosen solution, rationale, and consequences.

---

### ADR-001: Unified Acklet Blue Accent Palette

- **Status**: Decided & Implemented
- **Context**: Earlier iterations utilized conflicting green/teal accents (`#0D9488`, `#059669`) in Device Studio while the rest of the Acklet monorepo standardized on canonical Blue.
- **Alternatives Considered**:
  1. *Module-Specific Accents*: Camera (Amber), Mic (Red), Speaker (Indigo), Speed (Cyan), IP (Emerald), Screen (Purple). *Rejected*: Caused visual dissonance, cluttered UI, and violated Acklet platform identity.
  2. *Green/Teal Accent*: *Rejected*: Inconsistent with the canonical tool shell token set.
  3. *Canonical Acklet Blue (Hue 217)*: Light Mode `#2563EB` (Blue 600), Dark Mode `#3B82F6` (Blue 500).
- **Decision Taken**: Standardize exclusively on Acklet Blue (`--tool-accent: #2563EB` light / `#3B82F6` dark) across all 6 modules, Meeting Readiness, and History.
- **Consequences**: Flawless visual consistency across the monorepo, predictable contrast ratios, zero layout-specific theme friction.

---

### ADR-002: Dual-Theme Contrast & Adaptive Media Containers

- **Status**: Decided & Implemented
- **Context**: In Light theme, camera and screen preview cards previously rendered an unstyled, harsh, pitch-black rectangle (`#000000`) before media initialization, creating severe visual imbalance.
- **Alternatives Considered**:
  1. *Static Dark Viewport in Both Themes*: *Rejected*: Disrupted the clean, white/slate aesthetic of Light theme.
  2. *Skeleton Shimmer Box*: *Rejected*: Looked like a perpetual loading state rather than an idle ready state.
  3. *Adaptive Media Stage*: Light mode displays an elegant, subtle dashed container (`#F8FAFC` background with `--ds-border` and a central icon badge). The viewport switches dynamically to true `#000000` only during active video streaming.
- **Decision Taken**: Adopt the Adaptive Media Stage pattern across Webcam, Microphone, and Screen Sharing.
- **Consequences**: Clean visual balance in Light theme; immediate clarity on camera/mic state; effortless WCAG AA contrast compliance ($\ge 4.5:1$).

---

### ADR-003: Spartan UI & Custom Acklet Dropdown Primitives

- **Status**: Decided & Implemented
- **Context**: Modules originally used native browser `<select>` elements, which rendered inconsistent OS dropdowns, lacked dark mode styling, and failed keyboard/touch accessibility standards.
- **Alternatives Considered**:
  1. *Native `<select>` with custom CSS*: *Rejected*: Native select popups on macOS and Windows cannot be styled, breaking dark theme.
  2. *Heavy External UI Library*: *Rejected*: Adding PrimeNG or Angular Material violated the monorepo's zero-unnecessary-dependencies policy.
  3. *Acklet Custom Dropdown (`AckletDropdownComponent`)*: Custom standalone primitive built on Spartan UI Helm patterns with signals, full keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Space`/`Escape`), outside click dismissal, and rich option metadata.
- **Decision Taken**: Implement and enforce `AckletDropdownComponent` across all device pickers and filter controls.
- **Consequences**: Consistent, theme-aware device selector UI across all browsers; support for dynamic device icons (`headphones` vs `volume-2`); flawless keyboard accessibility.

---

### ADR-004: Three-Tier Information Priority Hierarchy

- **Status**: Decided & Implemented
- **Context**: Early screens suffered from information overload, presenting raw WebRTC constraints, internal sample rates, and developer debug dumps on primary card faces.
- **Decision Taken**: Enforce a strict three-tier information hierarchy:
  - **Level 1 — Essential (Always Visible)**: Tool name, 1-line description, primary action, live interactive viewport, primary status badge.
  - **Level 2 — Useful (Visible When Relevant)**: Device picker, active volume/frequency sliders, progress telemetry, actionable warnings.
  - **Level 3 — Advanced (Collapsed by Default)**: Deep hardware capabilities, DSP flags, sample rates, WebRTC SDP telemetry, resolution ladders. Implemented via semantic `<details class="technical-details">`.
- **Consequences**: Initial card visual clutter reduced by $pprox 60\%$; non-technical users get an immediate, friendly experience while IT administrators still retain 100% of diagnostic telemetry.

---

### ADR-005: Two-Column Workspace Layout & Whitespace Elimination

- **Status**: Decided & Implemented
- **Context**: Excessive vertical scrolling and sprawling full-width single-column layouts resulted in awkward empty whitespace and disjointed controls.
- **Decision Taken**: Adopt a balanced two-column desktop workspace grid across all diagnostic modules:
  - **Left Column (Primary Stage, $pprox 60-65\%$)**: Main interactive testing area, live media canvas, primary start/stop controls.
  - **Right Column (Telemetry & Controls, $pprox 35-40\%$)**: Device selection, volume/gain controls, live status checklist, diagnostic score tag.
- **Consequences**: Eliminates vertical page jumping; keeps controls and telemetry visible side-by-side during active tests; responsive flex/grid gracefully stacks on tablet and mobile.

---

### ADR-006: Speaker Test — Step-by-Step Default & Inline Final Results

- **Status**: Decided & Implemented
- **Context**: The Speaker & Headphone Test initially opened into a free-form "Stereo & Sound Test" workbench with 6+ buttons, leaving users uncertain about what to click first. Furthermore, test results were scattered across disjointed cards.
- **Alternatives Considered**:
  1. *Navigate to a separate `/results` page*: *Rejected*: Heavyweight, breaks the single-tool workflow, and introduces unnecessary route state synchronization.
  2. *Workbench as Default*: *Rejected*: Most users simply want to know: "Are my headphones working and is stereo separated?"
  3. *Step-by-Step Guided Wizard as Default with Inline Final Results (Step 6)*:
     - Tab 1 (Default): **Step-by-Step Test** (Output Device $	o$ Left Channel $	o$ Right Channel $	o$ Stereo Output $	o$ Frequency Spectrum).
     - Tab 2 (Optional): **Stereo & Sound Test** (Free-form workbench for manual panning, presets, and noise generators).
     - **Step 6 — Final Results**: Renders directly inside the exact same card upon completing Step 5.
- **Decision Taken**: Adopt the Guided Wizard as default and display Final Results in-component (Step 6) without route navigation.
- **Consequences**: User confirmation dictates results (`Passed`, `Needs Attention`, `Not Completed`) rather than assuming speakers work just because playback started; includes **Save Report** (PDF) and **Start Again** actions.

---

### ADR-007: Speaker Audio Engine — Bell Chime Asset & Synchronous Stop Pipeline

- **Status**: Decided & Implemented
- **Context**: Synthesized sine wave beeps ($440	ext{ Hz}$) sounded harsh and artificial. Additionally, users reported that audio playback cut off abruptly after 35ms on rapid button presses due to an uncancelled `setTimeout(..., 35)` race condition in `SpeakerService.stop()`.
- **Alternatives Considered**:
  1. *Retain Pure Sine Oscillators*: *Rejected*: Poor user experience; doesn't feel like a modern, consumer-ready tool.
  2. *HTMLAudioElement Playback*: *Rejected*: Lacks precise stereo panning (`StereoPannerNode`) and Web Audio API routing control.
  3. *Decoded Web Audio Buffer with Bell Notification Sample (`mixkit-bell-notification-933.wav`)*:
     - Preloaded into volatile RAM on initialization (`preloadHeadphoneSound()`).
     - Decoded into an `AudioBuffer` played via `AudioBufferSourceNode` routed through `StereoPannerNode` and `GainNode`.
     - Output curve scaled to `(masterVolume / 100) * 0.85` for crystal clarity without digital clipping.
     - **Race Condition Fix**: Replaced the asynchronous 35ms delayed stop with synchronous node termination, immediate gain tapering, and active source reference tracking.
- **Decision Taken**: Adopt `mixkit-bell-notification-933.wav` with the synchronous Web Audio pipeline.
- **Consequences**: The full 3.36-second chime plays smoothly without cutoff; zero playback stutter; instant response on stop.

---

### ADR-008: Speaker Single-Source Audio Output & Volume Control

- **Status**: Decided & Implemented
- **Context**: The main testing card previously contained a duplicate `.connected-device-bar` with redundant device names, headings, and dropdowns, mirroring the right-hand "Audio Output & Volume" card.
- **Decision Taken**: Delete the duplicate bar from the workbench card. Designate the right-hand column as the **single source of truth** for device selection, active connection chips, master volume slider, mute toggle, and rescan actions.
- **Consequences**: Eliminated 100+ lines of duplicate DOM elements; zero state synchronization divergence between two selectors on the same page.

---

### ADR-009: Internet Speed Test — Ookla-Style "GO" Button & Zero-Overlap Horseshoe Gauge

- **Status**: Decided & Implemented
- **Context**: The initial speed test layout suffered from overlapping labels: the needle blade collided with the central `30.3 Mbps` digital readout, and the idle card lacked a clear, inviting call to action.
- **Alternatives Considered**:
  1. *Standard Circular Meter with Center Hub*: *Rejected*: The needle invariably pivots over the center where the digital readout lives, causing unavoidable visual overlap.
  2. *Linear Bar Visualizer*: *Rejected*: Lacks the intuitive, familiar feel of an automotive speedometer.
  3. *Ookla-Style Open Horseshoe ($260^\circ$) Dial with Elevated Pivot*:
     - **Idle State**: Prominent circular 168px "GO" action button with Acklet blue breath/pulse animation (`go-pulse`).
     - **Testing State**: Transitions smoothly to the $260^\circ$ open horseshoe SVG dial.
     - **Zero-Overlap Geometry**: Needle pivot is elevated to upper center `(120, 88)` with the blade sweeping exclusively across the upper arc ($-130^\circ$ to $+130^\circ$).
     - **Piecewise Perceptual Curve**: Square-root mapping for $0 - 100	ext{ Mbps}$ across the first $50\%$ of the arc; logarithmic mapping for $100 - 500+	ext{ Mbps}$ across the remaining $50\%$.
     - **Centered Mouth Readout**: Digital speed numbers and unit (`Mbps`/`MS`) are framed cleanly in the open bottom mouth of the horseshoe, completely unobstructed by the needle.
- **Decision Taken**: Implement the elevated-pivot horseshoe gauge with the circular "GO" button.
- **Consequences**: Flawless readability at all speeds; zero text overlap; instant user familiarity.

---

### ADR-010: Microphone Test — 310px Geometry & Glitch-Free Canvas Lifecycle

- **Status**: Decided & Implemented
- **Context**: The microphone test had two UI issues: 1) The mic icon container had unstable dimensions during state transitions, and 2) After stopping the test, a residual blue horizontal line remained frozen across the idle card canvas.
- **Decision Taken**:
  - **Fixed 310px Stage Geometry**: The idle/active container enforces `height: 310px; display: flex; align-items: center; justify-content: center;` with a strict 1:1 squircle icon badge (`56px × 56px`, `border-radius: 14px`, `flex-shrink: 0`).
  - **Glitch-Free Canvas Teardown**: In `MicrophoneModuleComponent.stopMicrophone()` and `ngOnDestroy()`, the animation loop (`cancelAnimationFrame`) is cancelled, the canvas 2D context is explicitly cleared via `ctx.clearRect(0, 0, width, height)`, and the `<canvas>` element is toggled to `display: none` during idle state.
- **Consequences**: Zero visual glitches upon stopping the test; rock-solid layout stability with zero Cumulative Layout Shift (CLS = 0).

---

### ADR-011: Public IP Lookup — Multi-Provider Fallback & Privacy Score Simplification

- **Status**: Decided & Implemented
- **Context**: The IP tool relied on a single external IP service, which could fail if rate-limited or blocked. Furthermore, the Privacy Score section was cluttered with verbose paragraphs and duplicate explanation cards.
- **Decision Taken**:
  - **Multi-Provider Fallback Chain**: `ipwho.is` (Primary Anycast) $	o$ `freeipapi.com` (Threat/proxy intel) $	o$ `api6.ipify.org` (IPv6 check) $	o$ `api4.ipify.org` (IPv4 check) $	o$ `api.ipify.org` (Fallback resolution).
  - **Dual-Stack Reachability**: Dedicated side-by-side cards for IPv4 and IPv6 with individual copy triggers.
  - **Privacy Score Simplification**: Clean $0 - 100$ score with 4 objective factor weights (WebRTC LAN Leak $+35$, Protocol Surface $+25$, ISP Intermediary $+20$, Geolocation Regional Masking $+20$), eliminating essay-style paragraphs.
- **Consequences**: High availability across global networks; instant understanding of IP privacy status without cognitive fatigue.

---

### ADR-012: Screen Sharing Test — Auto-Fitting Card & Zero-Manual-Fit Buttons

- **Status**: Decided & Implemented
- **Context**: The Screen Sharing preview originally included manual "Fit" and "Cover" toggle buttons, which frequently distorted the shared video aspect ratio or introduced awkward letterboxing.
- **Decision Taken**: Remove manual fit buttons. The preview video uses `object-fit: contain; width: 100%; height: 100%;` inside an auto-fitting full-width container, preserving exact pixel aspect ratios while maximizing available screen area. Includes full-screen inspection mode.
- **Consequences**: Simplified user controls; eliminated UI clutter; guaranteed aspect-ratio fidelity for reviewing small code fonts and slides.

---

### ADR-013: Meeting Readiness — Single-Row Badges & Actionable Failure Guidance

- **Status**: Decided & Implemented
- **Context**: The 1-click Meeting Readiness check previously wrapped status pills across multiple lines on smaller desktop screens (e.g., displaying `FAILE` on one line and `D` on the next). Additionally, failed checks offered no explanation of how to fix the issue.
- **Decision Taken**:
  - **Single-Row Badge Enforcement**: All status pills (`PASSED`, `FAILED`, `READY`, `WARNING`) enforce `white-space: nowrap !important; flex-shrink: 0 !important;` with responsive card typography truncation.
  - **Actionable Guidance Panel**: When checks fail (e.g., high network latency $>120	ext{ms}$, camera locked by another app), an interactive guidance card displays:
    1. *Identified Root Cause*: Explains the failure and its impact on live video calls.
    2. *Step-by-Step Improvement Actions*: Specific steps to resolve the issue (e.g., switch to 5GHz Wi-Fi / Ethernet, close torrent/cloud uploads, unblock permissions).
    3. *Direct Module Deep Links*: One-click triggers that navigate directly to the affected diagnostic module (`/devicestudio/speed`, `/devicestudio/webcam`, etc.).
- **Consequences**: Flawless visual presentation; users immediately understand why a test failed and how to resolve it.

---

### ADR-014: System Information — Consolidated 1-Line Spec Bar

- **Status**: Decided & Implemented
- **Context**: The landing page previously presented Browser, Operating System, and Display Screen inside three separate heavy cards, consuming disproportionate vertical space.
- **Decision Taken**: Consolidate system specifications into a single, compact, full-width 1-line footer bar (`system-spec-bar`) rendered cleanly at the bottom of the studio landing page.
- **Consequences**: Saves $pprox 180	ext{px}$ of vertical scroll; presents hardware context in an unobtrusive, professional format.

---

### ADR-015: 100% Client-Side Zero-Storage Privacy Guarantee

- **Status**: Decided & Implemented
- **Context**: Users testing webcams, microphones, and screens are rightfully concerned about surveillance and data harvesting.
- **Decision Taken**: Enforce a strict zero-server, zero-upload architecture:
  - Video streams and audio buffers are processed 100% in local browser volatile memory.
  - Zero frames, recordings, or telemetry are ever transmitted to Acklet servers.
  - All MediaStream tracks (`track.stop()`) and AudioContexts are closed immediately upon test termination or navigation.
  - History is stored purely in client-side `localStorage` (`acklet_ds_diagnostic_history_v1`) with an explicit opt-out toggle.
- **Consequences**: Uncompromised user trust; zero backend storage infrastructure overhead; fully compliant with GDPR and CCPA.

---

### ADR-016: Zero-Dependency Printable PDF Reporting

- **Status**: Decided & Implemented
- **Context**: Users need to export diagnostic reports for employer IT support, remote work audits, or ISP troubleshooting. Adding heavy client-side PDF libraries (e.g., `jspdf`, `pdfmake`) adds hundreds of kilobytes to bundle size.
- **Decision Taken**: Implement printable PDF export via dedicated `@media print` HTML templates opened in an isolated ephemeral print preview window using native `window.print()`.
- **Consequences**: Zero bundle size bloat; pixel-perfect vector print rendering; automatic "Save as PDF" capability across all modern operating systems.

---

## 4. Module-by-Module Technical Deep Dive

### 4.1 Webcam Test (`/webcam`, `/webcam-test`, `/camera`)

- **Primary Component**: [WebcamModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/webcam/webcam-module.component.ts)
- **Supporting Service**: [WebcamService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/webcam.service.ts)
- **Key Capabilities**:
  - Multi-camera enumeration via `navigator.mediaDevices.enumerateDevices()`.
  - Dynamic camera switching (`facingMode: 'user'` vs `'environment'`).
  - Real-time resolution detection ($W 	imes H$) with live FPS rendering tracker.
  - Optical exposure meter ($Y = 0.2126R + 0.7152G + 0.0722B$), heuristic sharpness, and color temperature ($	ext{K}$).
  - In-memory canvas snapshot capture with Lightbox Inspector, clipboard copy, and PNG download.
  - Granular error classification (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`).

### 4.2 Microphone Test (`/microphone`, `/mic-test`, `/mic`)

- **Primary Component**: [MicrophoneModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/microphone/microphone-module.component.ts)
- **Supporting Service**: [MicrophoneService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/microphone.service.ts)
- **Key Capabilities**:
  - Web Audio API pipeline (`AudioContext`, `MediaStreamAudioSourceNode`, `AnalyserNode`).
  - Dual-mode 60 FPS canvas visualizer: Oscilloscope (Waveform) and 56-band FFT Frequency Spectrum.
  - Fixed 310px stage height with explicit canvas clear on teardown, preventing frozen baseline glitches.
  - Live RMS volume, decaying peak-hold in dBFS ($-60$ to $0	ext{ dBFS}$), silence detection, and clipping counter.
  - Voice loopback recording via `MediaRecorder` (5s, 10s, 15s) with in-browser playback.

### 4.3 Speaker & Headphone Test (`/speaker`, `/audio-test`, `/headphone`)

- **Primary Component**: [SpeakerModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/speaker/speaker-module.component.ts)
- **Supporting Service**: [SpeakerService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/speaker.service.ts)
- **Key Capabilities**:
  - **Default Mode**: Step-by-Step Test wizard opens immediately.
  - **5 Guided Steps**: 1. Device Selection $	o$ 2. Left Channel $	o$ 3. Right Channel $	o$ 4. Stereo Output $	o$ 5. Frequency Sweep.
  - **Step 6 Final Results View**: Replaces testing UI in the same card, presenting overall status (`Passed`, `Needs Attention`, `Not Completed`), channel breakdown, Identified Issues card, Save Report (PDF), and Start Again.
  - **High-Fidelity Audio**: Preloaded `mixkit-bell-notification-933.wav` chime with synchronous stop logic eliminating cutoff bugs.
  - **Single Source of Truth**: Right-hand panel manages device selection, volume slider, mute, and live status.

### 4.4 Internet Speed Test (`/speed`, `/speed-test`)

- **Primary Component**: [SpeedTestModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/speed/speed-test-module.component.ts)
- **Supporting Service**: [SpeedTestService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/speed-test.service.ts)
- **Key Capabilities**:
  - **Circular "GO" Launch Button**: 168px circular button with blue breath animation during idle.
  - **Elevated-Pivot Horseshoe Gauge**: $260^\circ$ arc (`viewBox="0 0 240 160"`) with zero-overlap needle rotating strictly in upper arc ($-130^\circ$ to $+130^\circ$).
  - **Centered Digits**: Tabular speed numbers and units framed in open bottom mouth.
  - **Piecewise Scaling**: Square-root curve for $0-100	ext{ Mbps}$, logarithmic curve for $100-500+	ext{ Mbps}$.
  - **Anycast Streaming**: Progressive chunk streaming via Cloudflare edge nodes with zero server retention.

### 4.5 Public IP Checker (`/ip`, `/ip-lookup`)

- **Primary Component**: [IpCheckerModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/ip/ip-checker-module.component.ts)
- **Supporting Service**: [IpCheckerService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/ip-checker.service.ts)
- **Key Capabilities**:
  - Multi-provider fallback chain (`ipwho.is` $	o$ `freeipapi.com` $	o$ `api6.ipify.org` $	o$ `api4.ipify.org` $	o$ `api.ipify.org`).
  - Dual-stack IPv4 / IPv6 detection with individual copy buttons.
  - WebRTC local LAN leak audit via Google STUN (`stun:stun.l.google.com:19302`).
  - Simplified Explainable Privacy Score ($0-100$) with objective factor breakdown.

### 4.6 Screen Sharing Test (`/screen`, `/screen-test`)

- **Primary Component**: [ScreenShareModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/screen/screen-share-module.component.ts)
- **Supporting Service**: [ScreenShareService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/screen-share.service.ts)
- **Key Capabilities**:
  - Display capture via `navigator.mediaDevices.getDisplayMedia()`.
  - Surface categorization (`monitor`, `window`, `browser`).
  - Measured live FPS via `requestVideoFrameCallback()` / `requestAnimationFrame()`.
  - Auto-fitting responsive video container with `object-fit: contain` (zero manual fit buttons).
  - In-memory snapshot gallery and Lightbox Inspector.

### 4.7 Meeting Readiness Quick Check

- **Primary Component**: [MeetingReadinessComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/readiness/meeting-readiness.component.ts)
- **Key Capabilities**:
  - 1-click sequential audit across Camera, Microphone, Speaker, Network Latency, and Screen Sharing.
  - Single-row status badges (`PASSED`, `FAILED`, `READY`, `WARNING`) preventing word wrapping.
  - Actionable guidance panel with root cause identification, step-by-step fix, and deep links to tools.
  - Platform suitability verdicts for Zoom, Google Meet, Microsoft Teams, and Cisco Webex.

### 4.8 Diagnostic History & Multi-Format Reports Dashboard (`/history`, `/reports`)

- **Primary Component**: [HistoryReportsModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/history/history-reports-module.component.ts)
- **Supporting Services**: [DiagnosticHistoryService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/diagnostic-history.service.ts), [DiagnosticReportService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/diagnostic-report.service.ts)
- **Key Capabilities**:
  - Centralized `localStorage` logging (`acklet_ds_diagnostic_history_v1`) with user opt-in/opt-out.
  - Multi-session comparative audit with directional delta badges (improved vs regressed).
  - Multi-format exports: Printable HTML (`window.print()`), Markdown summary, Plain Text `.txt`, Structured JSON `.json`.
  - Privacy protections: Automatic public IP address masking (`27.56.xxx.xxx`) and location suppression.

---

## 5. State Management, Signals & Lifecycle Architecture

All module state is driven by Angular Signals, orchestrated through [DeviceStudioStateService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/device-studio-state.service.ts):

- **Health Score Computation**: Dynamic score ($0 - 100$) updated reactively as users test components:
  - Baseline browser API support: $+20$ pts
  - Webcam tested: $+15$ pts
  - Microphone tested: $+15$ pts
  - Speaker tested: $+15$ pts
  - Speed tested: $+15$ pts
  - IP checked: $+10$ pts
  - Screen share tested: $+10$ pts
- **Active Tab Tracking**: `activeTab = signal<DeviceStudioTab>('landing')` synced with router navigation.
- **Ephemeral Toast Feedback**: `showToast(msg, type)` with auto-dismiss timer.
- **Resource Cleanup Contract**: Every component implements `OnDestroy` to call `stop()` on its corresponding service, ensuring immediate media track release and hardware indicator LED shutoff.

---

## 6. Comprehensive Codebase Map & File Inventory

| Path | Purpose / Responsibility |
|:---|:---|
| `src/app/device-studio.routes.ts` | Lazy-loaded routes for all 6 modules, landing page, history, and URL aliases. |
| `src/models/device.models.ts` | Complete TypeScript type contracts, telemetry interfaces, and result models. |
| `src/styles/device-studio-tokens.css` | Canonical dual-theme CSS variables, utility classes, and keyframe animations. |
| `src/components/landing/device-studio-landing.component.ts` | Studio landing page, module grid, 1-line system spec bar, and header. |
| `src/components/webcam/webcam-module.component.ts` | Webcam testing workspace, live stream stage, snapshot gallery, lightbox. |
| `src/components/microphone/microphone-module.component.ts` | Microphone testing workspace, 60 FPS canvas visualizer, loopback recording. |
| `src/components/speaker/speaker-module.component.ts` | Speaker testing workspace, 5-step wizard, Step 6 results, single-source right panel. |
| `src/components/speed/speed-test-module.component.ts` | Speed test workspace, circular "GO" button, zero-overlap horseshoe dial. |
| `src/components/ip/ip-checker-module.component.ts` | Public IP lookup workspace, dual-stack cards, explainable privacy score. |
| `src/components/screen/screen-share-module.component.ts` | Screen share testing workspace, auto-fitting preview, snapshot inspector. |
| `src/components/readiness/meeting-readiness.component.ts` | 1-click meeting readiness check, single-row badges, actionable guidance card. |
| `src/components/history/history-reports-module.component.ts` | Diagnostic history dashboard, comparative delta audit, export modal. |
| `src/components/shared/acklet-dropdown.component.ts` | Custom Spartan UI dropdown primitive replacing native select tags. |
| `src/components/shared/module-header.component.ts` | Standardized header bar for individual diagnostic modules. |
| `src/components/shared/health-score-badge.component.ts` | Circular health score pill with real-time numeric score and status. |
| `src/services/device-studio-state.service.ts` | Core state coordinator, health score calculator, toast notification service. |
| `src/services/webcam.service.ts` | Camera hardware manager, MediaStream controller, optical analyzer. |
| `src/services/microphone.service.ts` | Web Audio API manager, AnalyserNode controller, MediaRecorder wrapper. |
| `src/services/speaker.service.ts` | Audio playback engine, bell chime loader, frequency sweep generator. |
| `src/services/speed-test.service.ts` | Cloudflare Anycast speed test engine, chunk streaming coordinator. |
| `src/services/ip-checker.service.ts` | Multi-provider IP intelligence engine, WebRTC STUN candidate auditor. |
| `src/services/screen-share.service.ts` | Display media capture controller, FPS measurement tracker. |
| `src/services/system-info.service.ts` | Client platform detector (OS, browser engine, display screen resolution). |
| `src/services/diagnostic-history.service.ts` | LocalStorage history storage, search, filter, and comparison engine. |
| `src/services/diagnostic-report.service.ts` | Printable HTML report generator, PDF print preview, JSON/Markdown export. |
| `src/assets/sounds/mixkit-bell-notification-933.wav` | Clean, 3.36s high-fidelity bell chime audio asset for speaker channel checks. |

---

## 7. Troubleshooting, Gotchas & Debugging Playbook

1. **Hardware In-Use / Locked Camera (`NotReadableError`)**:
   - *Cause*: Camera hardware is exclusively locked by Zoom, FaceTime, Microsoft Teams, or another browser tab.
   - *Fix*: The UI guides the user to close competing video applications. In macOS, verify camera indicator LED status.
2. **Audio Cutoff / Clipping in Headphone Check**:
   - *Cause*: Calling `stop()` with an uncancelled `setTimeout` causes newly triggered audio sources to stop prematurely after 35ms.
   - *Fix*: `SpeakerService.stop()` cancels any pending stop timeouts immediately and synchronous tracks active `AudioBufferSourceNode` references.
3. **Microphone Canvas Frozen Blue Baseline Glitch**:
   - *Cause*: Leaving the `<canvas>` element rendered with lingering pixel data after stopping the microphone.
   - *Fix*: Call `ctx.clearRect(0, 0, width, height)` and hide the canvas element during idle state.
4. **Speedometer Needle / Label Collision**:
   - *Cause*: Center-pivot needle sweeping across the bottom half of the circle where digital numbers sit.
   - *Fix*: The needle pivot is placed at `(120, 88)` with blade rotation restricted to the upper $-130^\circ$ to $+130^\circ$ arc. Numbers reside in the open bottom mouth.
5. **WebRTC STUN Local IP Masking**:
   - *Cause*: Modern browsers mask private LAN IPs with mDNS candidates (e.g. `*.local`) for privacy.
   - *Fix*: The IP audit correctly identifies mDNS candidates as `Protected: Zero Private IP Leaks` rather than misinterpreting them as an error.

---

## 8. Future Roadmap & Open Decisions (Where to Pick Up)

If you are continuing work on Device Studio in future iterations, use this matrix to understand what is locked in versus what is open for enhancement:

### Locked In (Do Not Change Without Architecture Review)
- Acklet Blue accent (`#2563EB` light / `#3B82F6` dark) — standard across all tools.
- Step-by-Step Test as default in Speaker module with inline final results.
- 100% Client-Side In-Memory privacy architecture (zero server media retention).
- Spartan UI / Acklet Custom Dropdown primitive (never reintroduce native `<select>`).
- 260° open horseshoe gauge with elevated pivot in Speed Test.
- Single-source right-hand column for device control and status in Speaker module.

### Open for Future Enhancements (Recommended Next Steps)
1. **Webcam Virtual Background / Blur Test**:
   - Add a client-side WebAssembly (e.g., MediaPipe Selfie Segmentation) toggle to preview how well the user's camera stream handles background blurring before entering Zoom or Google Meet calls.
2. **Microphone AI Noise Cancellation Preview**:
   - Integrate Web Audio API `AudioWorklet` to demonstrate real-time background noise suppression (e.g. typing sounds, dog barking).
3. **Multi-Server Speed Test Selection**:
   - Allow users to manually toggle between Cloudflare Anycast edge nodes and regional AWS/Fastly edge nodes for comparative routing audits.
4. **Export to Calendar / Pre-Meeting Reminder**:
   - Add a 1-click option to schedule a quick 30-second audio/video check 5 minutes before scheduled calendar meetings.

---

## 9. Verification Commands & Quality Gates

Run these commands to verify that Device Studio builds, type-checks, and passes all monorepo quality standards:

```bash
# 1. Trailing Whitespace & Diff Check
git diff --check

# 2. Tier A Fast Verification (Type check, shell isolation, glass rules, vitest)
node scripts/verify.mjs -A

# 3. Unit Tests (apps/tool-device-studio)
cd client && npx vitest run apps/tool-device-studio

# 4. Tier B Feature Verification & Angular Build
node scripts/verify.mjs -B

# 5. Surface Scope Check
node scripts/check-surface-scope.mjs tools HEAD
```
