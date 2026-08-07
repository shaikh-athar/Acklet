// src/app/app.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast';
import { DialogComponent } from './shared/components/dialog/dialog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, DialogComponent],
  template: `
    <router-outlet />
    <app-toast />
    <app-dialog />
  `,
  styles: [],
})
export class App {}

