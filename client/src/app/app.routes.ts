// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent), title: 'Acklet — Solve digital problems, instantly' },
      { path: 'tools', loadComponent: () => import('./pages/tools/tools').then(m => m.ToolsComponent), title: 'All Solutions — Acklet' },
      { path: 'tools/:id', loadComponent: () => import('./pages/tool-detail/tool-detail').then(m => m.ToolDetailComponent) },
      { path: 'categories', loadComponent: () => import('./pages/categories/categories').then(m => m.CategoriesComponent), title: 'Categories — Acklet' },
      { path: 'about', loadComponent: () => import('./pages/about/about').then(m => m.AboutComponent), title: 'About — Acklet' },
      { path: 'contact', loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent), title: 'Contact — Acklet' },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent), title: '404 — Acklet' },
];
