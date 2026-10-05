import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Clear any stale static-data cache so all data is fetched live from the server
['acklet:repos', 'acklet:tools', 'acklet:store', 'acklet:collections'].forEach(k => localStorage.removeItem(k));

if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        console.error(`[FREEZE-WATCH] ${entry.duration.toFixed(0)}ms long task`, {
          startTime: entry.startTime,
          duration: entry.duration,
          attribution: entry.attribution?.map((a: any) => ({
            name: a.name,
            entryType: a.entryType,
            startTime: a.startTime,
            duration: a.duration,
            containerType: a.containerType,
            containerSrc: a.containerSrc,
            containerId: a.containerId,
            containerName: a.containerName
          }))
        });
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // Fallback if longtask observation is unsupported in the current browser engine
  }
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
