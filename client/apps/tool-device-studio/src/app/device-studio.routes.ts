// apps/tool-device-studio/src/app/device-studio.routes.ts
import { Routes } from '@angular/router';

export const DEVICE_STUDIO_MODULE_ROUTES: Routes = [
  {
    path: 'webcam',
    loadComponent: () =>
      import('../components/webcam/webcam-module.component').then(
        m => m.WebcamModuleComponent
      ),
    title: 'Webcam Test — Acklet Device Studio'
  },
  {
    path: 'microphone',
    loadComponent: () =>
      import('../components/microphone/microphone-module.component').then(
        m => m.MicrophoneModuleComponent
      ),
    title: 'Microphone Test — Acklet Device Studio'
  },
  {
    path: 'speaker',
    loadComponent: () =>
      import('../components/speaker/speaker-module.component').then(
        m => m.SpeakerModuleComponent
      ),
    title: 'Speaker & Headphone Test — Acklet Device Studio'
  },
  {
    path: 'speed',
    loadComponent: () =>
      import('../components/speed/speed-test-module.component').then(
        m => m.SpeedTestModuleComponent
      ),
    title: 'Internet Speed Test — Acklet Device Studio'
  },
  {
    path: 'ip',
    loadComponent: () =>
      import('../components/ip/ip-checker-module.component').then(
        m => m.IpCheckerModuleComponent
      ),
    title: 'Public IP Checker — Acklet Device Studio'
  },
  {
    path: 'screen',
    loadComponent: () =>
      import('../components/screen/screen-share-module.component').then(
        m => m.ScreenShareModuleComponent
      ),
    title: 'Screen Sharing Test — Acklet Device Studio'
  },
  {
    path: 'history',
    loadComponent: () =>
      import('../components/history/history-reports-module.component').then(
        m => m.HistoryReportsModuleComponent
      ),
    title: 'Diagnostic History & Reports — Acklet Device Studio'
  },
  // Shorthand aliases
  { path: 'reports', redirectTo: 'history', pathMatch: 'full' },
  { path: 'diagnostic-history', redirectTo: 'history', pathMatch: 'full' },
  { path: 'webcam-test', redirectTo: 'webcam', pathMatch: 'full' },
  { path: 'camera', redirectTo: 'webcam', pathMatch: 'full' },
  { path: 'mic-test', redirectTo: 'microphone', pathMatch: 'full' },
  { path: 'microphone-test', redirectTo: 'microphone', pathMatch: 'full' },
  { path: 'mic', redirectTo: 'microphone', pathMatch: 'full' },
  { path: 'speaker-test', redirectTo: 'speaker', pathMatch: 'full' },
  { path: 'audio-test', redirectTo: 'speaker', pathMatch: 'full' },
  { path: 'audio', redirectTo: 'speaker', pathMatch: 'full' },
  { path: 'speed-test', redirectTo: 'speed', pathMatch: 'full' },
  { path: 'ip-checker', redirectTo: 'ip', pathMatch: 'full' },
  { path: 'ip-lookup', redirectTo: 'ip', pathMatch: 'full' },
  { path: 'screen-test', redirectTo: 'screen', pathMatch: 'full' },
  { path: 'screenshare-test', redirectTo: 'screen', pathMatch: 'full' }
];

export const deviceStudioRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../components/landing/device-studio-landing.component').then(
        m => m.DeviceStudioLandingComponent
      ),
    title: 'Acklet Device Studio — Hardware & Network Diagnostics'
  },
  {
    path: 'landing',
    redirectTo: '',
    pathMatch: 'full'
  },
  ...DEVICE_STUDIO_MODULE_ROUTES,
  // Support /devicestudio and /device-studio prefixes
  {
    path: 'devicestudio',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../components/landing/device-studio-landing.component').then(
            m => m.DeviceStudioLandingComponent
          ),
        title: 'Acklet Device Studio — Hardware & Network Diagnostics'
      },
      ...DEVICE_STUDIO_MODULE_ROUTES
    ]
  },
  {
    path: 'device-studio',
    redirectTo: 'devicestudio'
  },
  {
    path: 'tools/devicestudio',
    redirectTo: 'devicestudio'
  },
  {
    path: 'tools/device-studio',
    redirectTo: 'devicestudio'
  },
  {
    path: '**',
    redirectTo: ''
  }
];

