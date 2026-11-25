// client/apps/tool-docs/src/app/docs-app.component.ts

import { Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'docs-app-root'
  }
})
export class DocsAppComponent implements OnInit, OnDestroy {
  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-product', 'docs');
      // Ensure theme is set cleanly
      const savedTheme = localStorage.getItem('docs:theme') || localStorage.getItem('acklet:theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-product');
    }
  }
}
