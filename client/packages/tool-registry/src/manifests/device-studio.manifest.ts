// packages/tool-registry/src/manifests/device-studio.manifest.ts
import type { ToolRegistryItem } from '../models';
import { BLUE_ACCENT } from '../accent-presets';

export const DEVICE_STUDIO_MANIFEST: ToolRegistryItem = {
  id: 'devicestudio',
  name: 'Device Studio',
  slug: 'devicestudio',
  category: 'Diagnostics',
  categorySlug: 'diagnostics',
  shortDescription: 'Unified browser diagnostic suite: webcam, microphone, speaker, internet speed, public IP, and screen sharing.',
  about: 'Acklet Device Studio brings together six essential diagnostic tools into a cohesive, browser-side hardware and network testing workstation.\n\nTest and calibrate your webcam with live resolution and FPS detection; verify microphone sensitivity with a decibel meter, oscilloscope, and 5-second loopback playback; check speaker and headphone stereo channels, frequency sweeps, and noise profiles; measure real-time internet download, upload, ping, and jitter; inspect your public IP, ISP, and WebRTC leak safety; and test screen sharing surface capabilities—all processed 100% locally in your browser memory with zero tracking.',
  description: 'Test, calibrate, and diagnose your camera, microphone, audio output, internet speed, public IP, and screen sharing with zero backend tracking. Features 6 independent testing modules, meeting readiness audit, device health score, and diagnostic reports.',
  icon: 'activity',
  version: '1.0.0',
  status: 'live',
  badge: 'new',
  featured: true,
  order: 5,
  subdomain: 'devicestudio',
  executionMode: 'browser',
  layout: 'fullBleed',
  addedAt: '2026-11-12',
  updatedAt: '2026-11-12',
  accent: 'blue',
  accentHue: 217,
  supports: ['shield-check', 'zap', 'copy'],
  theme: {
    accent: BLUE_ACCENT,
    font: {
      family: 'Scoutie Sans',
      fontFamily: "'Scoutie Sans', system-ui, -apple-system, sans-serif",
      fallback: 'system-ui, -apple-system, sans-serif',
      source: 'google'
    },
    radius: '16px',
    density: 'default',
    surfaceStyle: 'solid'
  },
  facts: [
    { label: 'Execution', value: '100% Browser' },
    { label: 'Hardware Tests', value: 'Zero Uploads' },
    { label: 'Modules', value: '6 Independent' },
    { label: 'Privacy', value: 'Zero Data Stored' }
  ],
  highlights: [
    { label: 'Browser-Side', value: 'Native APIs', tooltip: 'Direct MediaDevices, Web Audio API, and getDisplayMedia testing.' },
    { label: '6 Modules', value: 'Unified Suite', tooltip: 'Test camera, mic, speakers, network speed, IP, and screen share in one place.' },
    { label: 'Meeting Ready', value: '1-Click Audit', tooltip: 'Verify complete hardware and network readiness for Zoom, Google Meet, and Teams.' }
  ],
  tabs: [
    { id: 'webcam', label: 'Webcam Test', icon: 'camera' },
    { id: 'microphone', label: 'Microphone Test', icon: 'mic' },
    { id: 'speaker', label: 'Speaker & Audio', icon: 'headphones' },
    { id: 'speed', label: 'Internet Speed', icon: 'speed' },
    { id: 'ip', label: 'Public IP Lookup', icon: 'globe' },
    { id: 'screen', label: 'Screen Sharing', icon: 'screen' }
  ],
  subItems: [
    { id: 'webcam', label: 'Webcam Test', path: '/webcam', icon: 'camera' },
    { id: 'microphone', label: 'Microphone Test', path: '/microphone', icon: 'mic' },
    { id: 'speaker', label: 'Speaker & Audio', path: '/speaker', icon: 'headphones' },
    { id: 'speed', label: 'Internet Speed', path: '/speed', icon: 'speed' },
    { id: 'ip', label: 'Public IP Lookup', path: '/ip', icon: 'globe' },
    { id: 'screen', label: 'Screen Sharing', path: '/screen', icon: 'screen' }
  ],
  features: [
    'Live webcam test with resolution detection (4K/1080p/720p/VGA), FPS meter, brightness analyzer, and snapshot capture',
    'Real-time microphone analyzer with decibel (dBFS) meter, audio oscilloscope, FFT frequency spectrum, and 5s loopback playback',
    'Speaker and headphone diagnostic suite with left/right stereo channel isolation, 20Hz-20kHz frequency sweeps, and noise generators',
    'Accurate browser-based internet speed test measuring download throughput, upload throughput, ping latency, and jitter',
    'Public IP and network intelligence checker displaying IPv4/IPv6, ISP, ASN, geo-location, local LAN leak check, and network details',
    'Screen sharing diagnostic verifying display surface selection, capture resolution, live frame rate, and system audio capture',
    '1-click Meeting Readiness test verifying complete audiovisual and network health for Zoom, Google Meet, and Microsoft Teams',
    '100% client-side privacy guarantee with zero video, audio, or recording data transmitted to external servers'
  ],
  howTo: [
    'Select a hardware or network module from the top navigation tabs or landing page cards.',
    'Grant browser permissions when prompted for Camera, Microphone, or Screen Sharing.',
    'Follow the live testing guidelines to check hardware responsiveness, volume levels, or network speeds.',
    'Run the Meeting Readiness Test before important video conferences for a comprehensive system check.'
  ],
  howItWorks: [
    'Webcam and microphone tests communicate directly with your operating system drivers via the W3C MediaDevices API.',
    'Audio diagnostics use the Web Audio API (OscillatorNode, AnalyserNode, StereoPannerNode) to synthesize precise audio frequencies locally.',
    'Internet speed tests stream chunked payloads over HTTPS to high-throughput endpoints to measure exact network throughput and latency.',
    'All camera video frames, microphone audio samples, and screen shares remain in volatile browser RAM and are immediately discarded.'
  ],
  faqs: [
    {
      id: 'faq-privacy',
      question: 'Are my camera video or microphone audio streams saved or sent to a server?',
      answer: 'No. Everything in Device Studio runs entirely inside your browser sandbox. No video frames, audio recordings, or screen captures are ever transmitted to any backend service or third party.'
    },
    {
      id: 'faq-permissions',
      question: 'Why does my browser ask for camera, microphone, or screen sharing permissions?',
      answer: 'Web browsers require explicit user permission before allowing web pages to access physical hardware or capture screen content. You can revoke these permissions at any time in your browser address bar settings.'
    },
    {
      id: 'faq-speed-accuracy',
      question: 'How accurate is the browser-based internet speed test?',
      answer: 'The speed test measures sustained throughput and Round-Trip Time (RTT) using standard HTTPS streaming against high-capacity global CDN endpoints, providing real-world bandwidth measurement without Flash or third-party plugins.'
    },
    {
      id: 'faq-loopback',
      question: 'What is the microphone loopback test?',
      answer: 'The loopback test records a 5-second sample of your voice and plays it back to you through your speakers or headphones. This lets you hear exactly how you sound to other participants in a conference call.'
    }
  ]
};

