// src/app/layout/main-layout/main-layout.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar';
import { FooterComponent } from '../../shared/components/footer/footer';
import { ToastComponent } from '../../shared/components/toast/toast';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent],
  template: `
    <div class="layout-root">
      <app-navbar />
      <main class="layout-main">
        <router-outlet />
      </main>
      <app-footer />
      <app-toast />
    </div>
  `,
  styles: [`
    .layout-root { display: flex; flex-direction: column; min-height: 100vh; }
    .layout-main { flex: 1; }
  `],
})
export class MainLayoutComponent { }
