// apps/tool-urlshortener/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { shortenerErrorInterceptor } from './services/shortener-error.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch(), withInterceptors([shortenerErrorInterceptor]))
  ]
}).catch(err => console.error('[URL Shortener Bootstrap Error]', err));
