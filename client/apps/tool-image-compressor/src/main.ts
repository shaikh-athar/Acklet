// apps/tool-image-compressor/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withFetch())
  ]
}).catch(err => console.error('[Tool Image Compressor Bootstrap Error]', err));

