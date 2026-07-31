import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Clear any stale static-data cache so all data is fetched live from the server
['acklet:repos', 'acklet:tools', 'acklet:store', 'acklet:collections'].forEach(k => localStorage.removeItem(k));


bootstrapApplication(App, appConfig).catch((err) => console.error(err));
