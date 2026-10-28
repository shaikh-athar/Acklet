import { bootstrapApplication } from '@angular/platform-browser';
import { isToolsHubHostname, extractToolSlugFromHostname } from '@acklet/shared';

// Clear any stale static-data cache so all data is fetched live from the server
['acklet:repos', 'acklet:tools', 'acklet:store', 'acklet:collections'].forEach(k => localStorage.removeItem(k));

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/+$/, '') : '';
const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const queryTool = urlParams?.get('tool')?.toLowerCase();
const isQrPath = pathname === '/qr' || pathname === '/qr-generator';
const isDataLensPath = pathname === '/datalens' || pathname === '/data-lens' || pathname === '/json-formatter';
const toolSlug = extractToolSlugFromHostname(hostname) || (queryTool && ['clipboard', 'qr', 'qr-generator', 'datalens', 'data-lens', 'json-formatter'].includes(queryTool) ? queryTool : null);

if (isToolsHubHostname(hostname) || queryTool === 'hub' || queryTool === 'tools') {
  // Bootstrap Tools Hub (apps/tools-hub)
  import('../apps/tools-hub/src/app/app.component')
    .then(({ AppComponent }) => bootstrapApplication(AppComponent))
    .catch((err) => console.error('[ToolsHub Bootstrap Error]', err));
} else if (toolSlug === 'clipboard') {
  // Bootstrap Online Clipboard tool (apps/tool-online-clipboard)
  Promise.all([
    import('../apps/tool-online-clipboard/src/app/app.component'),
    import('@angular/common/http')
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())]
      });
    })
    .catch((err) => console.error('[Tool Clipboard Bootstrap Error]', err));
} else if (toolSlug === 'qr' || toolSlug === 'qr-generator' || isQrPath) {
  // Bootstrap QR Generator tool (apps/tool-qr-generator)
  Promise.all([
    import('../apps/tool-qr-generator/src/app/app.component'),
    import('@angular/common/http')
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())]
      });
    })
    .catch((err) => console.error('[Tool QR Generator Bootstrap Error]', err));
} else if (toolSlug === 'datalens' || toolSlug === 'data-lens' || toolSlug === 'json-formatter' || isDataLensPath) {
  // Bootstrap DataLens tool (apps/tool-datalens)
  Promise.all([
    import('../apps/tool-datalens/src/app/app.component'),
    import('@angular/common/http')
  ])
    .then(([{ AppComponent }, { provideHttpClient, withFetch }]) => {
      return bootstrapApplication(AppComponent, {
        providers: [provideHttpClient(withFetch())]
      });
    })
    .catch((err) => console.error('[Tool DataLens Bootstrap Error]', err));
} else {
  // Bootstrap Acklet Portal (default)
  Promise.all([
    import('./app/app.config'),
    import('./app/app')
  ])
    .then(([{ appConfig }, { App }]) => {
      return bootstrapApplication(App, appConfig);
    })
    .catch((err) => console.error('[Portal Bootstrap Error]', err));
}

