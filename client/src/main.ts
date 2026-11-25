import { bootstrapApplication } from '@angular/platform-browser';
import {
  isToolsHubHostname,
  isDocsHostname,
  extractToolSlugFromHostname,
  getDocsUrl,
} from '@acklet/shared';

// Clear any stale static-data cache so all data is fetched live from the server
['acklet:repos', 'acklet:tools', 'acklet:store', 'acklet:collections'].forEach((k) =>
  localStorage.removeItem(k),
);

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const pathname =
  typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/+$/, '') : '';
const urlParams =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const queryTool = urlParams?.get('tool')?.toLowerCase();
const isQrPath = pathname === '/qr' || pathname === '/qr-generator';
const isBarcodePath = pathname === '/barcode' || pathname === '/barcode-generator';
const isDataLensPath =
  pathname === '/datalens' || pathname === '/data-lens' || pathname === '/json-formatter';
const isShortenerPath = pathname === '/urlshortener' || pathname === '/short';
const isTempEmailPath =
  pathname === '/temp-email' ||
  pathname === '/temp-mail' ||
  pathname === '/mail' ||
  pathname.startsWith('/tools/temp-email') ||
  pathname.startsWith('/tools/temp-mail');
const isFileConverterPath =
  pathname === '/file-converter' ||
  pathname === '/converter' ||
  pathname.startsWith('/tools/file-converter') ||
  pathname.startsWith('/tools/converter') ||
  pathname.startsWith('/convert');
const isImageConverterPath =
  pathname === '/image-converter' ||
  pathname === '/img-converter' ||
  pathname.startsWith('/tools/image-converter') ||
  pathname.startsWith('/tools/img-converter');
const isImageCompressorPath =
  pathname === '/image-compressor' ||
  pathname === '/img-compressor' ||
  pathname === '/imagecompressor' ||
  pathname.startsWith('/tools/image-compressor') ||
  pathname.startsWith('/tools/img-compressor') ||
  pathname.startsWith('/tools/imagecompressor');
const COLOR_STUDIO_MODULE_PATHS = [
  '/color-picker',
  '/image-extractor',
  '/gradient-generator',
  '/contrast-checker',
  '/palette-generator',
  '/vision-simulator',
  '/picker',
  '/extractor',
  '/gradient',
  '/contrast',
  '/palette',
  '/simulator',
];
const isColorStudioPath =
  pathname === '/colorstudio' ||
  pathname === '/color-studio' ||
  pathname.startsWith('/colorstudio/') ||
  pathname.startsWith('/color-studio/') ||
  pathname.startsWith('/tools/colorstudio') ||
  pathname.startsWith('/tools/color-studio') ||
  COLOR_STUDIO_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
const DEVICE_STUDIO_MODULE_PATHS = [
  '/webcam',
  '/webcam-test',
  '/microphone',
  '/mic-test',
  '/microphone-test',
  '/speaker',
  '/speaker-test',
  '/audio-test',
  '/speed',
  '/speed-test',
  '/ip',
  '/ip-lookup',
  '/ip-checker',
  '/screen',
  '/screen-test',
  '/screenshare-test',
];
const isDeviceStudioPath =
  pathname === '/devicestudio' ||
  pathname === '/device-studio' ||
  pathname.startsWith('/devicestudio/') ||
  pathname.startsWith('/device-studio/') ||
  pathname.startsWith('/tools/devicestudio') ||
  pathname.startsWith('/tools/device-studio') ||
  DEVICE_STUDIO_MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
const isWatermarkPath =
  pathname === '/watermark-remover' ||
  pathname === '/watermark' ||
  pathname.startsWith('/tools/watermark-remover') ||
  pathname.startsWith('/tools/watermark');
const validQueryTools = [
  'clipboard',
  'qr',
  'qr-generator',
  'barcode',
  'barcode-generator',
  'datalens',
  'data-lens',
  'json-formatter',
  'urlshortener',
  'short',
  'temp-email',
  'temp-mail',
  'tempmail',
  'file-converter',
  'converter',
  'image-converter',
  'img-converter',
  'image-compressor',
  'img-compressor',
  'imagecompressor',
  'colorstudio',
  'color-studio',
  'devicestudio',
  'device-studio',
  'watermark-remover',
  'watermark',
];
const toolSlug =
  extractToolSlugFromHostname(hostname) ||
  (queryTool && validQueryTools.includes(queryTool) ? queryTool : null);

const isDocsRedirect =
  !isDocsHostname(hostname) &&
  queryTool !== 'docs' &&
  (pathname === '/new' ||
    pathname === '/new-story' ||
    pathname === '/write' ||
    pathname.startsWith('/write/') ||
    pathname === '/docs' ||
    pathname.startsWith('/docs/') ||
    pathname === '/overview' ||
    pathname === '/stories' ||
    pathname === '/drafts' ||
    pathname === '/published' ||
    pathname === '/following' ||
    pathname === '/tools-admin' ||
    pathname.startsWith('/tools-admin/') ||
    pathname === '/collections' ||
    pathname.startsWith('/collections/') ||
    pathname === '/library' ||
    pathname.startsWith('/library/') ||
    pathname.startsWith('/p/'));

if (isDocsRedirect && typeof window !== 'undefined') {
  let target = window.location.pathname;
  if (target === '/write' || target === '/new-story') {
    target = '/new';
  } else if (target === '/docs' || target === '/docs/') {
    target = '';
  } else if (target.startsWith('/docs/')) {
    target = target.substring('/docs'.length);
  }
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  window.location.replace(getDocsUrl(target) + search + hash);
} else if (isDocsHostname(hostname) || queryTool === 'docs') {
  // Bootstrap Acklet Docs (apps/tool-docs)
  Promise.all([
    import('../apps/tool-docs/src/app/docs-app.component'),
    import('../apps/tool-docs/src/app/docs.routes'),
    import('../apps/tool-docs/src/app/interceptors/docs-auth.interceptor'),
    import('@angular/router'),
    import('@angular/common/http'),
  ])
    .then(
      ([
        { DocsAppComponent },
        { DOCS_ROUTES },
        { docsAuthInterceptor },
        { provideRouter, withComponentInputBinding },
        { provideHttpClient, withFetch, withInterceptors },
      ]) => {
        return bootstrapApplication(DocsAppComponent, {
          providers: [
            provideHttpClient(withFetch(), withInterceptors([docsAuthInterceptor])),
            provideRouter(DOCS_ROUTES, withComponentInputBinding()),
          ],
        });
      },
    )
    .catch((err) => {
      console.error('[Docs Bootstrap Error]', err);
      if (typeof window !== 'undefined') {
        const reloadKey = 'docs_bootstrap_retry';
        const lastRetry = sessionStorage.getItem(reloadKey);
        if (!lastRetry) {
          sessionStorage.setItem(reloadKey, '1');
          window.location.reload();
          return;
        }
        sessionStorage.removeItem(reloadKey);
        const root = document.querySelector('app-root');
        if (root) {
          root.innerHTML = `
            <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; text-align: center;">
              <div style="width: 40px; height: 40px; border-radius: 8px; background: #fff; color: #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; margin-bottom: 16px;">A</div>
              <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">Acklet Docs</h1>
              <p style="color: #888; font-size: 14px; max-width: 400px; margin: 0 0 20px 0; line-height: 1.5;">${err?.message || 'Unable to connect to application chunks. Please click reload to refresh.'}</p>
              <button onclick="window.location.reload()" style="background: #fff; color: #000; border: none; padding: 10px 20px; font-weight: 600; font-size: 13px; border-radius: 6px; cursor: pointer;">Reload Application</button>
            </div>
          `;
        }
      }
    });
} else if (isToolsHubHostname(hostname) || queryTool === 'hub' || queryTool === 'tools') {
  // Bootstrap Tools Hub (apps/tools-hub)
  import('../apps/tools-hub/src/app/app.component')
    .then(({ AppComponent }) => bootstrapApplication(AppComponent))
    .catch((err) => console.error('[ToolsHub Bootstrap Error]', err));
} else if (toolSlug === 'clipboard') {
  // Bootstrap Online Clipboard tool (apps/tool-online-clipboard)
  Promise.all([
    import('../apps/tool-online-clipboard/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool Clipboard Bootstrap Error]', err));
} else if (toolSlug === 'qr' || toolSlug === 'qr-generator' || isQrPath) {
  // Bootstrap QR Generator tool (apps/tool-qr-generator)
  Promise.all([
    import('../apps/tool-qr-generator/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool QR Generator Bootstrap Error]', err));
} else if (toolSlug === 'barcode' || toolSlug === 'barcode-generator' || isBarcodePath) {
  // Bootstrap Barcode Generator tool (apps/tool-barcode-generator)
  Promise.all([
    import('../apps/tool-barcode-generator/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool Barcode Generator Bootstrap Error]', err));
} else if (
  toolSlug === 'datalens' ||
  toolSlug === 'data-lens' ||
  toolSlug === 'json-formatter' ||
  isDataLensPath
) {
  // Bootstrap DataLens tool (apps/tool-datalens)
  Promise.all([
    import('../apps/tool-datalens/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool DataLens Bootstrap Error]', err));
} else if (toolSlug === 'urlshortener' || toolSlug === 'short' || isShortenerPath) {
  // Bootstrap URL Shortener tool (apps/tool-urlshortener)
  Promise.all([
    import('../apps/tool-urlshortener/src/app/app.component'),
    import('@angular/common/http'),
    import('../apps/tool-urlshortener/src/services/shortener-error.interceptor'),
  ])
    .then(
      ([
        { AppComponent },
        { provideHttpClient, withFetch, withInterceptors },
        { shortenerErrorInterceptor },
      ]) => {
        return bootstrapApplication(AppComponent, {
          providers: [
            provideHttpClient(withFetch(), withInterceptors([shortenerErrorInterceptor])),
          ],
        });
      },
    )
    .catch((err) => console.error('[Tool URL Shortener Bootstrap Error]', err));
} else if (
  toolSlug === 'temp-email' ||
  toolSlug === 'temp-mail' ||
  toolSlug === 'tempmail' ||
  isTempEmailPath
) {
  // Bootstrap Temporary Email tool (apps/tool-temp-email)
  Promise.all([
    import('../apps/tool-temp-email/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool Temp Email Bootstrap Error]', err));
} else if (toolSlug === 'file-converter' || toolSlug === 'converter' || isFileConverterPath) {
  // Bootstrap File Converter tool (apps/tool-file-converter)
  Promise.all([
    import('../apps/tool-file-converter/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool File Converter Bootstrap Error]', err));
} else if (toolSlug === 'image-converter' || toolSlug === 'img-converter' || isImageConverterPath) {
  // Bootstrap Image Converter tool (apps/tool-file-converter)
  Promise.all([
    import('../apps/tool-file-converter/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool Image Converter Bootstrap Error]', err));
} else if (
  toolSlug === 'image-compressor' ||
  toolSlug === 'img-compressor' ||
  toolSlug === 'imagecompressor' ||
  isImageCompressorPath
) {
  // Dedicated Image Compressor route/host mapping
  Promise.all([
    import('../apps/tool-image-compressor/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool Image Compressor Bootstrap Error]', err));
} else if (toolSlug === 'colorstudio' || toolSlug === 'color-studio' || isColorStudioPath) {
  // Bootstrap Color Studio tool (apps/tool-color-studio)
  Promise.all([
    import('../apps/tool-color-studio/src/app/app.component'),
    import('../apps/tool-color-studio/src/app/color-studio.routes'),
    import('@angular/router'),
    import('@angular/common/http'),
  ])
    .then(
      ([
        { AppComponent },
        { colorStudioRoutes },
        { provideRouter, withComponentInputBinding },
        { provideHttpClient, withFetch },
      ]) => {
        return bootstrapApplication(AppComponent, {
          providers: [
            provideHttpClient(withFetch()),
            provideRouter(colorStudioRoutes, withComponentInputBinding()),
          ],
        });
      },
    )
    .catch((err) => console.error('[Tool Color Studio Bootstrap Error]', err));
} else if (toolSlug === 'devicestudio' || toolSlug === 'device-studio' || isDeviceStudioPath) {
  // Bootstrap Device Studio tool (apps/tool-device-studio)
  Promise.all([
    import('../apps/tool-device-studio/src/app/app.component'),
    import('../apps/tool-device-studio/src/app/device-studio.routes'),
    import('@angular/router'),
    import('@angular/common/http'),
  ])
    .then(
      ([
        { AppComponent },
        { deviceStudioRoutes },
        { provideRouter, withComponentInputBinding },
        { provideHttpClient, withFetch },
      ]) => {
        return bootstrapApplication(AppComponent, {
          providers: [
            provideHttpClient(withFetch()),
            provideRouter(deviceStudioRoutes, withComponentInputBinding()),
          ],
        });
      },
    )
    .catch((err) => console.error('[Tool Device Studio Bootstrap Error]', err));
} else if (toolSlug === 'watermark-remover' || toolSlug === 'watermark' || isWatermarkPath) {
  // Bootstrap Watermark Remover tool (apps/tool-watermark-remover)
  Promise.all([
    import('../apps/tool-watermark-remover/src/app/app.component'),
    import('@angular/common/http'),
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())],
      });
    })
    .catch((err) => console.error('[Tool Watermark Remover Bootstrap Error]', err));
} else {
  // Bootstrap Acklet Portal (default)
  Promise.all([import('./app/app.config'), import('./app/app')])
    .then(([{ appConfig }, { App }]) => {
      return bootstrapApplication(App, appConfig);
    })
    .catch((err) => console.error('[Portal Bootstrap Error]', err));
}
