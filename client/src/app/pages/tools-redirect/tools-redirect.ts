// client/src/app/pages/tools-redirect/tools-redirect.ts
import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getToolsHubUrl, isToolsHubHostname } from '@acklet/shared';

/**
 * Portal-only redirect shim.
 * Any hit to /tools or /tools/** does a full-page navigation to the Tools Hub.
 * The isToolsHubHostname guard prevents a redirect loop if this component ever
 * renders inside the Tools Hub itself.
 */
@Component({
  selector: 'app-tools-redirect',
  standalone: true,
  template: ``,
})
export class ToolsRedirectComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (isToolsHubHostname()) return; // already on tools subdomain — do nothing

    window.location.replace(getToolsHubUrl());
  }
}
