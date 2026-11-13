# Acklet Device Studio — System Specification & Architecture

## 1. Overview & Tool Metadata

Acklet Device Studio is a unified, browser-side diagnostic and hardware/network calibration suite built for remote professionals, developers, and conference attendees. It consolidates six independent testing modules under one cohesive, high-performance workspace within the Acklet design system.

- **Tool Slug**: `devicestudio` (canonical alias: `device-studio`)
- **Subdomain**: `devicestudio.acklet.com` (locally: `devicestudio.localhost:4200`)
- **Status**: Production Ready / Active
- **Requires Backend**: `false` (100% Client-Side In-Memory Execution)
- **Primary Accent Color**: Blue (`#2563EB` light / `#3B82F6` dark, Hue: 217)
- **Surface**: Tools Surface ([client/apps/tool-device-studio](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio))
- **Related Documentation**:
  - [ui-design-system.md](file:///Users/ayaz/Acklet-file-Converter/docs/ui-design-system.md)
  - [responsive-design-system.md](file:///Users/ayaz/Acklet-file-Converter/docs/responsive-design-system.md)
  - [standalone-tool-architecture.md](file:///Users/ayaz/Acklet-file-Converter/docs/standalone-tool-architecture.md)
  - [color-studio.md](file:///Users/ayaz/Acklet-file-Converter/docs/color-studio.md)
  - [verification-guide.md](file:///Users/ayaz/Acklet-file-Converter/docs/verification-guide.md)

### Privacy & Zero-Storage Guarantee
- **100% Client-Side Memory Processing**: All webcam frames, microphone audio streams, audio oscillator tones, and display screen shares are processed exclusively in volatile browser RAM.
- **Zero Server Uploads**: No video recordings, audio snippets, or screen capture data are ever transmitted or saved to any server or database.
- **Immediate Ephemerality**: All MediaStream tracks (`stream.getTracks().forEach(t => t.stop())`), audio contexts, and object URLs are revoked immediately upon stopping tests or navigating away.

---

## 2. Core Architecture & Design System

Acklet Device Studio adheres strictly to the canonical Acklet Design System and monorepo architectural rules:

### Technology Stack
- **Framework**: Angular 22+ (Standalone Components, Signals, `ChangeDetectionStrategy.OnPush`)
- **Routing**: Angular Router with lazy-loaded route modules and browser navigation synchronization
- **Design Tokens**: Canonical dual-theme CSS variables (`--bg-*`, `--text-*`, `--border-*`, `--accent-*`, `--tool-accent`)
- **Primitive Components**: Spartan UI Helm primitives (`HlmButton`, `HlmBadge`, `HlmInput`)
- **Icons**: Acklet Tool Shell icon system (`TsIconComponent` mapped via `TS_ICON_MAP`)
- **Build & Test Tools**: Angular CLI (`@angular/cli`), Tailwind CSS v4, Vitest

### Canonical Blue Accent System & Design Tokens
Device Studio adheres to Acklet's unified Blue accent color palette, standard across all Acklet tools:
- **Manifest Accent**: `blue` (Hue: `217`)
- **Light Theme**:
  - Primary / Accent: `#2563EB` (Blue 600)
  - Hover / Active: `#1D4ED8` (Blue 700)
  - Soft Background: `rgba(37, 99, 235, 0.08)`
  - Subdued Border: `rgba(37, 99, 235, 0.20)`
- **Dark Theme**:
  - Primary / Accent: `#3B82F6` (Blue 500)
  - Hover / Active: `#60A5FA` (Blue 400)
  - Soft Background: `rgba(59, 130, 246, 0.12)`
  - Subdued Border: `rgba(59, 130, 246, 0.25)`
- **WCAG AA Conformance**: All interactive states achieve $\ge 4.5:1$ contrast against light (`#FFFFFF`, `#F8FAFC`) and dark (`#09090B`, `#18181B`) backgrounds.
- **Dual-Theme Adaptive Preview Containers**:
  - Camera, Microphone, and Screen Share preview cards eliminate the unstyled pitch-black void in Light mode. When idle or waiting for permissions, viewports render clean `#F8FAFC` subtle dashed containers with friendly user prompts and explicit permission recovery states (`Camera Permission Blocked`, `Microphone Permission Blocked`, `Screen Sharing Permission Needed`). Containers switch to true black only during active hardware media streaming.
- **Precision Speedometer Needle**:
  - The Internet Speed Test speedometer gauge uses a nested origin translation `<g transform="translate(100, 110)">` with origin `(0, 0)` rotation, preventing viewBox scaling drift and ensuring the needle aligns flawlessly across all screen resolutions and browser zoom levels.

### Information Architecture & Progressive Disclosure
Following Acklet's global interface refinement standards, Device Studio strictly adheres to the principle: **"Show users what they need, when they need it. Hide everything else."**

- **Semantic Progressive Disclosure (`<details class="technical-details">` & `<summary>`)**:
  - Accessible, zero-dependency, keyboard-navigable disclosure widgets fold deep hardware telemetry, driver DSP constraints, resolution ladders, and troubleshooting guidance out of the primary viewport.
  - Reduces initial card and column clutter by $\approx 60\%$ while retaining $100\%$ of underlying diagnostic precision for IT support and power users.
  - Styled with dual-theme design tokens (`--ds-card-bg`, `--border`, `--tool-accent`) ensuring seamless high contrast in both Light and Dark themes.
- **Minimalist Card Standardization**:
  - Module cards on the landing page feature strictly: Icon + Title + 1-sentence description + Action affordance ("Open [Tool] &rarr;").
  - Redundant decorative taglines, multi-tier spec pill badges, and duplicate technical labels are removed from primary card faces.
- **Human-Friendly Status Language**:
  - Complex hardware state codes are mapped to clear, everyday status indicators: `Working`, `Good`, `Needs attention`, `Offline`, and `Not tested`.
  - Semantic status pills: Emerald (`Working`/`Good`), Amber (`Needs attention`), Rose (`Offline`), and Slate (`Not tested`).
- **Acklet Custom Dropdown Component (`AckletDropdownComponent`)**:
  - Replaces all native browser `<select>` elements across all six modules and the History & Reports dashboard.
  - Implements keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Space`, `Escape`), auto-focus scrolling, outside-click dismissal (`document:click`), and active selection indicators with teal checkmarks.
  - Supports rich option metadata (icons, badges, secondary descriptions) with dual-theme design tokens (`--bg-1`, `--border`, `--tool-accent`).
  - Implemented in [acklet-dropdown.component.ts](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/shared/acklet-dropdown.component.ts).

---

## 3. The Six Independent Diagnostic Modules

Device Studio consists of six independent, dedicated testing workspaces:

### 1. Webcam Test (`/webcam`, `/webcam-test`, `/camera`)
- **Camera Device Selection & Switching**: Enumerate all physical `videoinput` devices via `navigator.mediaDevices.enumerateDevices()`. Supports dynamic switching between front and rear cameras where available (`facingMode`: 'user' vs 'environment').
- **Live Stream Viewport**: Real-time video preview with horizontal mirror toggle, fullscreen mode, and hardware interruption detection (`track.onended`, `track.onmute`, `track.onunmute`).
- **Real-Time Stream HUD**:
  - Live negotiated resolution tag (e.g. `1080p Full HD`).
  - Actual measured FPS readout via `requestAnimationFrame` frame tracking.
  - Lighting & exposure status badge.
  - Composite quality grade badge.
- **Camera Diagnostics (Actual Track Telemetry)**:
  - Active device label and device ID.
  - Negotiated stream dimensions ($W \times H$) and exact aspect ratio.
  - Measured live render frame rate (FPS).
  - Track capabilities inspection (`track.getCapabilities()`): zoom min/max/step, focus mode, exposure mode, white balance mode, and torch/flash.
- **Advanced Camera Intelligence (Optical Analysis)**:
  - *Lighting & Exposure Meter*: Average ITU-R BT.709 perceived luminance ($Y = 0.2126R + 0.7152G + 0.0722B$), classifying exposure into Underexposed ($<28\%$), Optimal/Balanced ($28-76\%$), or Overexposed ($>76\%$).
  - *Image Sharpness & Clarity (Heuristic)*: Standard deviation of pixel luminance variance representing edge definition and texture contrast ($0 - 100\%$, Soft / Moderate / Sharp).
  - *Color Temperature*: Red-to-Blue chromatic ratio classifying lighting into Warm ($\sim 3800\text{K}$), Neutral ($\sim 5500\text{K}$ daylight), or Cool ($\sim 7200\text{K}$).
  - *Composite Quality Score & Grade*: Heuristic rating ($0 - 100$) and grade (`A+`, `A`, `B`, `C`, `D`) with meeting readiness assessment.
  - *Clear Labeling*: Explicitly distinguishes measured hardware parameters from heuristic assessments.
- **Resolution Comparison Ladder**:
  - Compares the camera's active resolution against standard industry tiers: 4K UHD ($3840 \times 2160$), 2K QHD ($2560 \times 1440$), 1080p FHD ($1920 \times 1080$), 720p HD ($1280 \times 720$), and 480p SD ($640 \times 480$).
  - Highlights active tier and displays verified platform support (Zoom, Google Meet, Microsoft Teams, OBS Studio).
- **Snapshot Capture & Lightbox Inspector**:
  - HTML Canvas frame capture respecting mirror orientation.
  - Gallery thumbnail grid with quick download and delete.
  - Full-screen Lightbox Inspector modal with 1-click **Copy to Clipboard** via `navigator.clipboard.write([new ClipboardItem(...)])`, **Download PNG**, Retake, and Delete.
- **Robust Error & Permission Handling**:
  - Differentiates `NotAllowedError` (permission denied), `NotFoundError` (no hardware), `NotReadableError` (locked by Zoom/Teams/FaceTime), `OverconstrainedError` (unsupported resolution), and insecure origin.
  - Contextual step-by-step guidance for Chrome, Safari, Edge, Firefox, and macOS/Windows Privacy settings.
- **Zero-Storage Privacy Guarantee**:
  - All frame processing occurs purely in local browser memory. Zero video or snapshot data is ever sent to any remote server. Tracks are completely closed on test stop or navigation.

### 2. Microphone Test (`/microphone`, `/mic-test`, `/mic`)
- **Microphone Device Selection & Switching**: Enumerates all physical `audioinput` devices using `navigator.mediaDevices.enumerateDevices()`. Dynamically switches active input devices without page refresh, and listens for hardware connection changes via `navigator.mediaDevices.ondevicechange`.
- **Live Audio Capture & Web Audio API Architecture**:
  - Employs dedicated browser `AudioContext`, `MediaStreamAudioSourceNode`, and `AnalyserNode` (`fftSize = 2048`, `smoothingTimeConstant = 0.8`).
  - Dual-mode high-performance canvas visualizer:
    - *Oscilloscope (Time Domain)*: Continuous 60 FPS waveform rendering with subtle background grid and glow.
    - *Frequency Spectrum (FFT)*: 56-band multi-frequency bar analyzer with blue-to-emerald gradient and high-frequency peak highlighting.
    - *Glitch-Free Ephemeral Lifecycle*: Canvas visualizer is explicitly cleared via `ctx.clearRect()` and toggled to `display: none` when the microphone is stopped or destroyed, preventing frozen baseline artifacts during idle states.
    - *Distortion-Proof Visualizer Geometry*: Container uses `310px` height with strict `flex-shrink: 0` 1:1 squircle icon dimensions (`56px × 56px`), ensuring consistent geometry and balanced spacing across Light and Dark themes.
- **Volume & Dynamic Range Telemetry**:
  - *Live Input Volume Meter*: Real-time RMS amplitude calculation ($0 - 100\%$) with logarithmic loudness scaling.
  - *Peak Level & Decaying Peak-Hold*: Exact digital ceiling measurement in dBFS ($-60\text{ dBFS}$ to $0\text{ dBFS}$) with visual peak hold notch.
  - *Silence Detection*: Continuous detection flagging input below $2\%$ / $-50\text{ dBFS}$ for $>1.5\text{s}$ with visual status alert.
  - *Clipping Detection*: Real-time warning and counter when peak reaches $\ge -0.5\text{ dBFS}$ to protect against digital distortion.
  - *Speech Dynamics History*: Mini rolling history buffer (last 32 samples) visualizing live speech level dynamics.
- **Voice Recording & Playback Check**:
  - Records local voice sample using `MediaRecorder` with automatic MIME type detection (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/ogg`).
  - Configurable recording duration (5s, 10s, 15s) with live elapsed countdown timer and pulsing recording badge.
  - In-browser playback with play, pause, progress status, retake, and download (`.webm`, `.mp4`).
  - 100% Client-Side In-Memory: Audio sample is retained in volatile memory and never transmitted to any external server.
- **Advanced Audio Intelligence (Acoustic Analysis)**:
  - *Voice Clarity Analyzer (Heuristic)*: Analyzes spectral balance in the human speech formant range ($300\text{ Hz} - 3400\text{ Hz}$) vs low rumble ($<120\text{ Hz}$) and high hiss ($>8000\text{ Hz}$), rating clarity as Clear, Moderate, or Muffled.
  - *Ambient Noise Floor Estimator*: Measures background room acoustics during silent pauses (Silent $<-52\text{ dBFS}$, Quiet $-52\text{ to }-42\text{ dBFS}$, Moderate, High Noise).
  - *Composite Audio Quality Score & Grade*: Generates an overall letter grade (`A+`, `A`, `B`, `C`, `D`) and conference platform recommendation (Zoom, Google Meet, Microsoft Teams, Discord).
- **Driver Hardware & DSP Constraints Telemetry**:
  - Sample rate (e.g. $48,000\text{ Hz}$ or $44,100\text{ Hz}$).
  - Channel count (1 Mono / 2 Stereo).
  - Status of Acoustic Echo Cancellation (AEC), Background Noise Suppression (BNS), and Auto Gain Control (AGC).
- **Mute Toggle & Lifecycle Control**:
  - Independent software mute control via `track.enabled`.
  - Full stream and AudioContext cleanup (`track.stop()`, `audioContext.close()`, disconnected audio nodes) on navigation or stop.

### 3. Speaker & Headphone Test (`/speaker`, `/audio-test`, `/headphone`, `/speakers`)
- **Audio Output Device Detection & Routing**:
  - Enumerate physical `audiooutput` devices via `navigator.mediaDevices.enumerateDevices()`.
  - Supports output routing via `AudioContext.setSinkId()` or `HTMLMediaElement.setSinkId()` where browser support permits, with graceful fallback to system default routing.
  - Automatically updates on device connection changes via `navigator.mediaDevices.ondevicechange`.
- **Stereo Channel Isolation & Balance Stage**:
  - *Left Speaker Channel*: Pure sine tone ($440\text{ Hz}$ A4) hard-panned strictly to Left (`pan = -1.0`).
  - *Right Speaker Channel*: Pure sine tone ($880\text{ Hz}$ A5) hard-panned strictly to Right (`pan = 1.0`).
  - *Stereo Harmony*: Two-tone musical chime ($440\text{ Hz} + 554.37\text{ Hz}$ C#5 major third) balanced across both ears (`pan = 0.0`).
  - *Auto Alternating Channel Test*: Cycles sound between Left and Right channels every 1.0s to verify headphone ear orientation hands-free.
  - *Interactive Panning Balance Slider*: Smooth adjustable balance control ($-1.0$ Full Left to $+1.0$ Full Right) to test equal hearing volume between ears.
  - *Acoustic Cone Visualizer*: Animated speaker diaphragms with radiating acoustic wave rings that pulse with active sound.
- **Frequency Testing & Continuous Sweep**:
  - *Continuous Logarithmic Sweep ($20\text{ Hz} - 20,000\text{ Hz}$)*: 12-second exponential frequency ramp across the complete audible spectrum with real-time Hz readout and progress tracking.
  - *Discrete Frequency Presets*:
    - Sub-Bass ($60\text{ Hz}$) — Subwoofer and deep low-end driver resonance.
    - Mid-Bass ($120\text{ Hz}$, $250\text{ Hz}$) — Lower vocal warmth and punch.
    - Vocal Mid ($1,000\text{ Hz}$) — Human speech intelligibility anchor.
    - Presence & Treble ($4,000\text{ Hz}$, $8,000\text{ Hz}$) — Sibilance, clarity, and crispness.
    - High Air ($15,000\text{ Hz}$) — High-frequency hearing cutoff and tweeter response.
- **Acoustic Noise Calibration Generators**:
  - *Pink Noise*: Balanced power per octave for flat acoustic calibration.
  - *White Noise*: Equal energy per frequency for driver rattle and hiss checks.
  - *Brown Noise*: Deep low-frequency rumble for subwoofer resonance and room dampening.
- **Guided 5-Step Test Wizard & User Confirmation**:
  - Step-by-step guided workflow (Output Device $\to$ Left Ear $\to$ Right Ear $\to$ Stereo Chime $\to$ Frequency Spectrum).
  - Interactive user confirmation checklist (Heard Left, Heard Right, Balanced Stereo, Frequency Coverage).
  - Diagnostic verdict generation with overall stereo separation score ($0 - 100\%$) and conference readiness verdict.
- **Hearing Protection & Safe Gain Envelope**:
  - Conservative default volume ($60\%$, effective gain factor $\le 0.30$) with logarithmic tapering.
  - Gain ramping (`linearRampToValueAtTime`) on start, frequency switches, and stops to eliminate hardware popping artifacts.
  - Estimated output latency and sample rate telemetry.

### 4. Internet Speed Test (`/speed`, `/speed-test`)
- **Speed Test Engine Architecture**:
  - Independent, zero-backend testing powered by [SpeedTestService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/speed-test.service.ts).
  - Utilizes high-performance Anycast edge nodes via Cloudflare Speed Test endpoints (`https://speed.cloudflare.com/__down` and `/__up`) with global low-latency routing, CORS headers enabled, aggressive cache busting, and immediate ephemeral in-memory payload discard (zero remote storage).
  - Clean lifecycle cancellation supported via browser `AbortController` and `performance.now()` precision timing.
- **Latency & Jitter Measurement Pipeline**:
  - Sequential 8-probe ping burst with natural jitter intervals.
  - Measures Round-Trip Time (RTT) per probe, recording Average Ping, Minimum Ping, and Maximum Ping in milliseconds (ms).
  - Real-time Jitter formula: $\text{Jitter} = \frac{1}{N-1} \sum_{i=1}^{N-1} |\text{RTT}_{i+1} - \text{RTT}_i|$.
  - Jitter stability classification: Ultra-stable ($\le 5\text{ms}$), Low variation ($\le 15\text{ms}$), Moderate variation ($\le 30\text{ms}$), High variance ($> 30\text{ms}$).
- **Progressive Download Throughput Measurement**:
  - Multi-tier progressive chunk streaming: 1MB warm-up payload $\to$ 5MB medium payload $\to$ 15MB large payload.
  - Streaming chunk consumption using `ReadableStream` reader (`resp.body.getReader()`) with continuous byte accumulation.
  - Real-time throughput calculations: $\text{Mbps} = \frac{\text{Bytes} \times 8}{\text{Elapsed Seconds} \times 1,000,000}$.
  - Real-time gauge updates and progress interpolation ($25\% \to 65\%$).
- **Progressive Upload Throughput Measurement**:
  - Transmits chunked random binary payloads ($1.5\text{ MB}$ each) via HTTP POST to zero-storage test endpoints.
  - Multi-round upload bursts calculating real outbound throughput and updating live progress ($65\% \to 100\%$).
- **Speedometer HUD & Visual Telemetry (Ookla-Style Horseshoe Layout)**:
  - Responsive $260^{\circ}$ open horseshoe SVG dial (`viewBox="0 0 240 160"`) with calibrated internal tick labels ($0$, $10$, $50$, $100$, $250$, $500+\text{ Mbps}$) and dynamic progress arc.
  - Zero-overlap needle architecture: needle pivots at upper center `(120, 88)` with blade rotating exclusively across the upper arc sweep from $-130^{\circ}$ to $+130^{\circ}$, completely clear of the central digital readout below it.
  - Piecewise perceptual scaling curve: maps $0 - 100\text{ Mbps}$ smoothly across the first $50\%$ of the arc (via square-root scaling) with $100\text{ Mbps}$ at the exact top center ($0^{\circ}$), and $100 - 500+\text{ Mbps}$ across the second $50\%$ (via logarithmic scaling).
  - Centered digital readout: tabular speed figures (`live-speed-num`) with `Mbps` / `MS` unit indicator framed cleanly in the open bottom center mouth of the arc, with descriptive test phase status situated below the gauge.
  - Spacebar keyboard accessibility shortcut (`<kbd>Space</kbd>`) for quick Start / Cancel.
- **Scorecard Telemetry (4 Primary Metric Boxes)**:
  - *Download Throughput*: Megabits per second (Mbps) with active streaming indicator.
  - *Upload Throughput*: Megabits per second (Mbps) with active chunking indicator.
  - *Ping Latency*: Average round-trip time in ms with min/max range telemetry.
  - *Jitter*: Latency variation in ms with connection stability description.
- **Network Readiness Assessment & Use-Case Suitability**:
  - Overall Connection Health Score ($0 - 100$) combining weighted download ($45\%$), upload ($25\%$), latency ($20\%$), and jitter ($10\%$).
  - Connection Quality Tiers: Gigabit ($\ge 450\text{ Mbps}$), Ultra ($\ge 100\text{ Mbps}$), Fast ($\ge 45\text{ Mbps}$), Good ($\ge 20\text{ Mbps}$), Moderate ($\ge 8\text{ Mbps}$), or Slow ($< 8\text{ Mbps}$).
  - 4 Objective Application Suitability Checkpoints:
    - *HD Video Conferencing*: Evaluates 1080p group calls, screen sharing, and audio jitter for Zoom, Google Meet, and Microsoft Teams.
    - *Real-Time Online Gaming*: Checks sub-40ms latency and minimal jitter for competitive multiplayer and cloud gaming.
    - *4K Ultra HD Streaming*: Verifies $\ge 25\text{ Mbps}$ throughput for 4K HDR and Dolby Vision buffer-free playback.
    - *Web Browsing & Cloud Sync*: Assesses snappy website loading and background cloud asset synchronization.
- **Browser Connection Telemetry & Diagnostic Info**:
  - Extracts client network hints via `navigator.connection` (`effectiveType`, `downlink`, `rtt`), clearly labeled as *Browser API indicative*.
  - Edge server location and zero-storage privacy compliance guarantee.
- **Test History & Comparison**:
  - Local history persisted via browser `localStorage` (`acklet_speedtest_history`) recording previous runs with timestamp, download, upload, ping, jitter, and rating pill.
  - One-click Clear History management.

### 5. Public IP Checker (`/ip`, `/ip-lookup`)
- **Multi-Provider Dual-Stack Architecture**:
  - Independent, zero-backend network intelligence powered by [IpCheckerService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/ip-checker.service.ts).
  - Resilient multi-provider fallback engine:
    - Primary: `ipwho.is` Anycast CDN for comprehensive geolocation, country flag, ASN routing, and regional timezone.
    - Secondary: `freeipapi.com` for threat intelligence, proxy flags, and coordinate cross-verification.
    - Dedicated IPv4: `api4.ipify.org` ensuring pure IPv4 A record reachability check.
    - Dedicated IPv6: `api6.ipify.org` checking pure IPv6 AAAA record reachability.
    - Fallback: `api.ipify.org` for guaranteed IP address resolution.
- **Dual-Stack Reachability & Protocol Detection**:
  - Distinguishes between `Dual-Stack` (both IPv4 and IPv6 active), `IPv4 Only`, and `IPv6 Only` network environments.
  - Dedicated side-by-side protocol cards displaying active IPv4 and IPv6 addresses with individual copy buttons.
  - Graceful handling of standard home broadband networks where IPv6 is omitted without error flags.
- **Routing Organization & Network Identity**:
  - Autonomous System Number (ASN e.g. `AS24560`) and Autonomous System Organization (`asnOrg`).
  - Internet Service Provider (ISP) and upstream network operator.
  - Heuristic Proxy / VPN / Datacenter detection identifying hosting ASNs (AWS, Cloudflare, DigitalOcean, Hetzner, etc.) vs residential broadband, accompanied by clear accuracy disclaimers.
- **Geographic Point-of-Presence (PoP)**:
  - Country with ISO alpha-2 code and official Unicode flag emoji.
  - Region / State, City, Postal Code, and coordinates (Latitude / Longitude).
  - One-click Google Maps pin inspection.
  - Local wall-clock time and regional timezone (`Intl.DateTimeFormat`).
  - Prominent architectural disclaimer: *Geolocation indicates your ISP's regional point-of-presence (PoP) or routing facility, never an exact physical residential street address.*
- **WebRTC Local LAN Leak Audit**:
  - Technically valid browser WebRTC candidate check using `RTCPeerConnection` with Google STUN (`stun:stun.l.google.com:19302`).
  - Audits whether private LAN IPs ($192.168.x.x$, $10.x.x.x$, $172.16-31.x.x$) are leaked or safely masked by browser mDNS candidate randomization (`.local`).
  - Visual status banner: *Protected: Zero Private IP Leaks* vs *Notice: Local LAN IP Exposed*.
- **Explainable IP Privacy Score & Exposure Analysis**:
  - Compact, high-signal privacy score card ($0 - 100$) focusing on objective factor weighting without paragraph clutter:
    - *WebRTC Local LAN Masking*: $+35$ pts for mDNS candidate protection.
    - *Protocol Surface Footprint*: $+25$ pts for single-protocol footprint; $+15$ pts for dual-stack.
    - *ISP Intermediary Masking*: $+20$ pts for datacenter/VPN relay; $+10$ pts for residential ISP.
    - *Geolocation Regional Masking*: $+20$ pts for PoP-level routing shielding residential street address.
  - Qualitative ratings: `EXCELLENT` ($\ge 80$), `GOOD` ($\ge 65$), `MODERATE` ($\ge 45$), or `EXPOSED` ($< 45$).
- **Diagnostic Export & Multi-Format Reports**:
  - One-click clipboard copy for Public IP address.
  - Formatted ASCII / Markdown summary report copy.
  - Full structured JSON diagnostic payload copy.
  - Direct file download for `.txt` text report and `.json` structured dump.
  - Zero-storage privacy guarantee: 100% in-memory client execution with zero IP logging or profiling on Acklet servers.

### 6. Screen Sharing Test (`/screen`, `/screen-test`)
- **Screen Capture & Permissions Architecture**:
  - Independent, zero-backend display capture powered by [ScreenShareService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/screen-share.service.ts).
  - Explicit user interaction invokes `navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 60, max: 60 } }, audio: true })`.
  - Secure context validation (`window.isSecureContext`) ensuring compliant HTTPS/localhost execution.
  - Granular error classification: handles `NotAllowedError` (user cancelled browser dialog), `NotFoundError` (no display source), and `NotSupportedError` (mobile or platform limitation).
- **Surface Category Telemetry**:
  - Identifies display surface type via `track.getSettings().displaySurface`:
    - *Entire Screen (`monitor`)*: Complete desktop capture; ideal for multi-monitor setups and full operating system demonstrations.
    - *Application Window (`window`)*: Isolates a designated app window (VS Code, PowerPoint, Figma), concealing private notifications and unrelated apps.
    - *Browser Tab (`browser`)*: Optimizes text clarity and enables synchronized tab audio broadcast for web slides, video playback, and web apps.
- **Live Frame Rate (FPS) & Stream Telemetry**:
  - *Measured Live FPS*: Continuous frame-by-frame measurement using `requestVideoFrameCallback()` (or fallback `requestAnimationFrame()`) calculating actual rendered frame delivery rates over a 1.0s sliding window.
  - *Browser Target FPS*: Reads hardware/browser reported ceiling from `track.getSettings().frameRate`.
  - *Resolution & Aspect Ratio*: Reads active dimensions (`video.videoWidth` $\times$ `video.videoHeight`) with intelligent aspect ratio reduction ($16:9$, $16:10$, $4:3$, $21:9$).
  - *Dynamic Window Resize Detection*: Monitors `video.onresize` events, updating diagnostics instantaneously if the user resizes the captured application window.
- **Stream Lifecycle & Interruption Detection**:
  - Detects native browser "Stop sharing" floating bar termination via `track.onended` and performs automatic graceful cleanup.
  - Detects stream suspension / mute via `track.onmute` and `track.onunmute` (e.g. when shared window is minimized or OS display sleeps), displaying a prominent amber warning banner.
  - Comprehensive track cleanup (`track.stop()`) on component destroy or route navigation preventing residual browser capture icons.
- **Advanced Screen Quality Analyzer**:
  - Quality Tiers: 4K Ultra HD ($\ge 2160\text{p}$), 1440p Quad HD ($\ge 1440\text{p}$), 1080p Full HD ($\ge 1080\text{p}$), 720p HD ($\ge 720\text{p}$), or Standard Definition.
  - Text Readability / Sharpness: Evaluates whether code syntax and small typography will be legible to remote meeting participants (`exceptional`, `crisp`, `acceptable`, `soft`).
  - Frame Rate Stability: Assesses frame delivery consistency (`smooth-60`, `stable-30`, `variable`, `low`).
  - Audio Capture Status: Verifies whether an accompanying audio track was captured from the system or tab.
- **Post-Session Diagnostic Summary**:
  - Automatically generates an archival summary upon stopping share: Session duration, max resolution achieved, average measured FPS, surface type used, and overall quality verdict (`EXCELLENT`, `GOOD`, `FAIR`).
- **Interactive Viewport Controls & Frame Snapshot Gallery**:
  - *Full Card Initial View*: Full-width, centered idle card without asymmetric black-box artifacts.
  - *Automatic Responsive Fit*: Captured screen video automatically fills the entire card with aspect-ratio preserving `object-fit: contain` (manual fit/fill buttons removed for streamlined UX).
  - *Fullscreen Mode*: Fullscreen preview via `requestFullscreen` to inspect fine pixel sharpness and code legibility.
  - *Instantaneous Snapshot Capture*: In-memory `<canvas>` frame grab encoded as PNG (`dataUrl`).
  - *Local Snapshot Gallery*: Thumbnails of up to 8 snapshots with 1-click clipboard copy (`navigator.clipboard.write([new ClipboardItem(...)])`), file download (`.png`), deletion, and modal lightbox zoom.
- **OS Permissions & Platform Guidance**:
  - macOS: Actionable instructions for *System Settings $\to$ Privacy & Security $\to$ Screen & System Audio Recording*.
  - Windows / Linux: Guidance on hardware acceleration and Wayland PipeWire portal.
  - Mobile: Clear notification explaining mobile browser API restrictions.
  - Zero-Storage Guarantee: All captured frames remain strictly inside local browser volatile memory. Zero video or audio is ever transmitted to Acklet servers.

---

### 4. Diagnostic History & Multi-Format Reports Dashboard (`/history`, `/reports`, `/diagnostic-history`)

Device Studio includes a centralized, privacy-first diagnostic data and reporting suite managed via [DiagnosticHistoryService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/diagnostic-history.service.ts), [DiagnosticReportService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/diagnostic-report.service.ts), and [HistoryReportsModuleComponent](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/history/history-reports-module.component.ts):

- **Centralized History Logging**:
  - Persists completed test results across all six diagnostic modules plus Device Health and Meeting Readiness.
  - Zero-storage privacy default: history recording is fully user-controllable with an explicit opt-in/opt-out switch (`acklet_ds_enable_history`).
  - Stored strictly in browser `localStorage` (`acklet_ds_diagnostic_history_v1`) without any remote sync or server telemetry.
  - Zero media persistence: snapshots, audio buffers, and video streams are never persisted to history.
- **Filtering, Sorting & Search**:
  - Filter by module: All, Webcam, Microphone, Speaker, Speed Test, Public IP, Screen Share, Health Score, Meeting Readiness.
  - Filter by status: All, Passing, Warning, Critical.
  - Real-time text search across test title, device names, IP addresses, and detailed metrics.
  - Sorting: Date (Newest first, Oldest first), Score / Value (Highest first), and Status.
  - Record management: 1-click modal details viewer, individual record deletion, and single-click clear entire history.
- **Performance Comparison Engine**:
  - Multi-session comparative audit enabling users to select two historical runs of the same diagnostic module.
  - Automatic directional delta calculation:
    - *Higher is better*: Download throughput, Upload throughput, Resolution, Frame Rate, Health Score (positive delta = `improved`).
    - *Lower is better*: Round-trip ping latency, Jitter (negative delta = `improved`).
  - Percentage change badges with semantic color coding (Emerald for improved, Rose for regressed, Slate for unchanged).
  - Clear narrative comparison summary explaining session-over-session hardware or ISP connection shifts.
- **Multi-Format Report Generator**:
  - Five tailored diagnostic report templates:
    1. *Full Diagnostic Audit*: Complete system snapshot covering all hardware, network, and browser telemetry.
    2. *Network & Connectivity*: Focused on public IP, ISP routing, WebRTC leak risk, and speed throughput.
    3. *Audio Hardware*: Specialized for microphone input levels, frequency response, and speaker channel balance.
    4. *Camera & Video*: Concentrated on optical exposure, lighting, frame rate, and sensor capabilities.
    5. *Meeting Readiness*: Audit for Zoom, Google Meet, Teams, and Webex compatibility.
  - Granular module inclusion toggles allowing users to cherry-pick sections.
  - **Privacy & Redaction Safeguards**:
    - *IP Address Masking*: Automatically obfuscates sensitive public IPv4 (`27.56.xxx.xxx`) and IPv6 (`2001:db8:xxxx:...`) addresses to protect user privacy before sharing with IT support.
    - *Location Suppression*: Strips city, region, coordinates, and postal code from exported reports.
  - **Zero-Dependency PDF & Multi-Channel Export**:
    - *Print / Save as PDF*: Renders dedicated high-fidelity printable HTML with embedded `@media print` rules, vector brand headers, and hardware tables via native `window.print()`.
    - *Markdown Summary*: Formatted markdown table copied to clipboard in 1 click for Jira, Slack, or GitHub issues.
    - *Plain Text (`.txt`)*: Clean ASCII diagnostic report download.
    - *Structured JSON (`.json`)*: Full machine-readable dump for automated IT parsing.
    - *Web Share API*: Native sharing modal via `navigator.share` on supported platforms.

---

## 5. Unique Integrated Intelligence

### Device Health Score
A dynamic, reactive score ($0 - 100$) computed in [DeviceStudioStateService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/device-studio-state.service.ts):
- Modern browser API support baseline: $+20$ points
- Webcam verified: $+15$ points
- Microphone verified: $+15$ points
- Speaker verified: $+15$ points
- Network speed & ping verified: $+15$ points
- Public IP checked: $+10$ points
- Screen share verified: $+10$ points

### Meeting Readiness Test
A 1-click automated audit running across Camera, Microphone, Speaker, Network Latency, and Screen Sharing support sequentially, producing a comprehensive readiness verdict for:
- Zoom
- Google Meet
- Microsoft Teams
- Cisco Webex

### Downloadable Diagnostic Reports
Powered by [DiagnosticReportService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/services/diagnostic-report.service.ts):
- **Plain Text Report**: Formatted ASCII / Markdown summary ready to share with IT support or system administrators.
- **Raw JSON Report**: Machine-readable diagnostic dump with full hardware inventory, browser capabilities, and network metrics.

---

## 6. Ad Integration & Layout Gutters

Device Studio adheres to the platform's non-intrusive advertising architecture:
- Left and right gutters are preserved on ultra-wide viewports ($>1280\text{px}$) for future ad scripts without layout shift (Cumulative Layout Shift = 0).
- Empty ad boxes are never rendered when ads are disabled (`showPlaceholders: false`).
- Managed via [AdConfigService](file:///Users/ayaz/Acklet-file-Converter/client/apps/tool-device-studio/src/components/ads/ad-config.service.ts).

---

## 7. Verification & Test Commands

To verify Device Studio across all quality gates:

```bash
# Tier A Fast Verification (Type check, shell isolation, glass rules, vitest)
node scripts/verify.mjs -A

# Run Device Studio Unit Tests
cd client && npx vitest run apps/tool-device-studio

# Check Surface Boundaries
node scripts/check-surface-scope.mjs tools HEAD

# Full Application Build
cd client && npx ng build
```

