// apps/tools-hub/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch(err => {
  console.error('[ToolsHub Bootstrap Error]', err);
  const root = document.querySelector('app-root');
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#090d16;color:#f8fafc;font-family:sans-serif;text-align:center;padding:2rem;">
        <div style="max-width:480px;background:#111726;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:2rem;">
          <h2 style="font-size:1.5rem;margin-bottom:0.75rem;">Unable to load Tools Hub</h2>
          <p style="color:#94a3b8;font-size:0.9rem;margin-bottom:1.5rem;">An unexpected error occurred while initializing the application.</p>
          <a href="http://localhost:4200" style="display:inline-block;padding:0.6rem 1.25rem;background:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">Return to Acklet</a>
        </div>
      </div>
    `;
  }
});
