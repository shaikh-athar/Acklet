// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, publisherGuard, adminGuard } from './core/auth/auth.guard';
import { ToolsRedirectComponent } from './pages/tools-redirect/tools-redirect';

export const routes: Routes = [
  // --- Standalone Tool Applications (Pure Tool UI with ts-shell, No Platform Shell) ---
  {
    path: 'qr',
    loadComponent: () => import('../../apps/tool-qr-generator/src/app/app.component').then(m => m.AppComponent),
    title: 'QR Code Generator — Acklet'
  },
  { path: 'qr-generator', redirectTo: 'qr', pathMatch: 'full' },
  {
    path: 'tools/qr-generator',
    loadComponent: () => import('../../apps/tool-qr-generator/src/app/app.component').then(m => m.AppComponent),
    title: 'QR Code Generator — Acklet'
  },
  {
    path: 'tools/qr-generator/view/:code',
    loadComponent: () => import('../../apps/tool-qr-generator/src/components/landing-viewer/landing-viewer.component').then(m => m.QrLandingViewerComponent),
    title: 'QR Destination — Acklet'
  },
  {
    path: 'tools/qr-generator/notes/:code',
    loadComponent: () => import('../../apps/tool-qr-generator/src/components/notes-viewer/notes-viewer.component').then(m => m.QrNotesViewerComponent),
    title: 'Shared Note — Acklet'
  },
  {
    path: 'notes/:code',
    loadComponent: () => import('../../apps/tool-qr-generator/src/components/notes-viewer/notes-viewer.component').then(m => m.QrNotesViewerComponent),
    title: 'Shared Note — Acklet'
  },
  { path: 'tools/qr', redirectTo: 'tools/qr-generator', pathMatch: 'full' },
  {
    path: 'tools/clipboard',
    loadComponent: () => import('../../apps/tool-online-clipboard/src/app/app.component').then(m => m.AppComponent),
    title: 'Online Clipboard — Acklet'
  },
  { path: 'tools/online-clipboard', redirectTo: 'tools/clipboard', pathMatch: 'full' },
  { path: 'tools/app/airvault', redirectTo: 'tools/clipboard', pathMatch: 'full' },
  {
    path: 'datalens',
    loadComponent: () => import('../../apps/tool-datalens/src/app/app.component').then(m => m.AppComponent),
    title: 'DataLens (JSON Formatter) — Acklet'
  },
  { path: 'data-lens', redirectTo: 'datalens', pathMatch: 'full' },
  { path: 'json-formatter', redirectTo: 'datalens', pathMatch: 'full' },
  {
    path: 'tools/datalens',
    loadComponent: () => import('../../apps/tool-datalens/src/app/app.component').then(m => m.AppComponent),
    title: 'DataLens (JSON Formatter) — Acklet'
  },
  { path: 'tools/data-lens', redirectTo: 'tools/datalens', pathMatch: 'full' },
  { path: 'tools/app/datalens', redirectTo: 'tools/datalens', pathMatch: 'full' },

  // --- Public Pages under main header/navbar layout ---
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent), title: 'Acklet — Solve digital problems, instantly' },
      
      // Tools → redirect every /tools/** path to the Tools Hub subdomain
      {
        path: 'tools',
        children: [
          { path: '**', component: ToolsRedirectComponent },
        ]
      },

      // /categories also goes to Tools Hub
      { path: 'categories', component: ToolsRedirectComponent },
      { path: 'about', loadComponent: () => import('./pages/about/about').then(m => m.AboutComponent), title: 'About — Acklet' },
      { path: 'contact', loadComponent: () => import('./pages/contact/contact').then(m => m.ContactComponent), title: 'Contact — Acklet' },
      
      // Community
      { path: 'community/discussions', loadComponent: () => import('./pages/community/discussions/discussions').then(m => m.CommunityDiscussionsComponent), title: 'Discussions — Acklet' },
      { path: 'community/discussions/:id', loadComponent: () => import('./pages/community/discussion-details/discussion-details').then(m => m.CommunityDiscussionDetailsComponent) },
      { path: 'community/showcase', loadComponent: () => import('./pages/community/showcase/showcase').then(m => m.CommunityShowcaseComponent), title: 'Showcase — Acklet' },
      { path: 'community/features', loadComponent: () => import('./pages/community/features/features').then(m => m.CommunityFeaturesComponent), title: 'Feature Requests — Acklet' },
      { path: 'community/help', loadComponent: () => import('./pages/community/help/help').then(m => m.CommunityHelpComponent), title: 'Help & Support — Acklet' },
      
      // Blog
      { path: 'blog', loadComponent: () => import('./pages/blog/articles/articles').then(m => m.BlogArticlesComponent), title: 'Blog — Acklet' },
      { path: 'blog/:slug', loadComponent: () => import('./pages/blog/article-details/article-details').then(m => m.BlogArticleDetailsComponent) },
    ],
  },

  // --- Standalone Tool Applications (Pure Tool UI, No Platform Shell/Navbar) ---
  // tools/json-formatter is now part of the Tools Hub — redirect there
  { path: 'tools/json-formatter', component: ToolsRedirectComponent },

  // --- Standalone Auth Pages (No Navbar / No Main Footer) ---
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'signup', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/login', loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent), title: 'Log In — Acklet' },
  { path: 'auth/callback', loadComponent: () => import('./pages/auth/callback/callback').then(m => m.AuthCallbackComponent), title: 'Authenticating — Acklet' },
  { path: 'auth/onboarding', loadComponent: () => import('./pages/auth/onboarding/onboarding').then(m => m.OnboardingComponent), title: 'Personalize Your Workspace — Acklet' },
  { path: 'auth/github/callback', loadComponent: () => import('./pages/auth/github-callback/github-callback').then(m => m.GitHubCallbackComponent), title: 'Connecting GitHub — Acklet' },

  // --- Authenticated Workspace Pages under sidebar layout shell ---
  {
    path: 'workspace',
    loadComponent: () => import('./layout/shell/shell').then(m => m.ShellLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/workspace/dashboard/dashboard').then(m => m.WorkspaceDashboardComponent), title: 'Overview — Acklet' },
      { path: 'projects', redirectTo: 'repositories', pathMatch: 'full' },
      { path: 'tools/import', loadComponent: () => import('./pages/workspace/projects/import/import').then(m => m.ProjectImportComponent), title: 'Import Repository — Acklet' },
      { path: 'projects/import', redirectTo: 'tools/import', pathMatch: 'full' },
      { path: 'projects/publish/:repoId', loadComponent: () => import('./pages/workspace/projects/publish-wizard/publish-wizard').then(m => m.PublishWizardComponent), title: 'Publish Tool — Acklet' },
      { path: 'projects/review/:toolId', loadComponent: () => import('./pages/workspace/projects/publish-preview/publish-preview').then(m => m.PublishPreviewComponent), title: 'Review & Publish — Acklet' },
      { path: 'repositories', loadComponent: () => import('./pages/workspace/repositories/repositories').then(m => m.WorkspaceRepositoriesComponent), title: 'Repositories — Acklet' },
      { path: 'tools', loadComponent: () => import('./pages/workspace/tools/tools').then(m => m.WorkspaceToolsComponent), title: 'Tools — Acklet' },
      { path: 'store', loadComponent: () => import('./pages/workspace/store/store').then(m => m.WorkspaceStoreComponent), title: 'Store — Acklet' },
      { path: 'tools/manage/:id', loadComponent: () => import('./pages/workspace/tools/tool-manage/tool-manage').then(m => m.ToolManageComponent), title: 'Manage Tool — Acklet' },
      { path: 'ai-jobs', loadComponent: () => import('./pages/workspace/ai-jobs/ai-jobs').then(m => m.AIJobsComponent), title: 'AI Jobs — Acklet' },
      { path: 'analytics', loadComponent: () => import('./pages/workspace/analytics/analytics').then(m => m.WorkspaceAnalyticsComponent), title: 'Analytics — Acklet' },
      { path: 'favorites', loadComponent: () => import('./pages/workspace/favorites/favorites').then(m => m.WorkspaceFavoritesComponent), title: 'Favorites — Acklet' },
      { path: 'history', loadComponent: () => import('./pages/workspace/history/history').then(m => m.WorkspaceHistoryComponent), title: 'History — Acklet' },
      { path: 'collections', loadComponent: () => import('./pages/workspace/collections/collections').then(m => m.WorkspaceCollectionsComponent), title: 'Collections — Acklet' },
      { path: 'notifications', loadComponent: () => import('./pages/workspace/notifications/notifications').then(m => m.WorkspaceNotificationsComponent), title: 'Notifications — Acklet' },
      { path: 'publisher', loadComponent: () => import('./pages/workspace/publisher/publisher').then(m => m.PublisherWorkspaceComponent), canActivate: [publisherGuard], title: 'Publisher Workspace — Acklet' },
      { path: 'admin', loadComponent: () => import('./pages/workspace/admin/admin').then(m => m.AdminWorkspaceComponent), canActivate: [adminGuard], title: 'Admin Workspace — Acklet' },
      { path: 'settings', loadComponent: () => import('./pages/workspace/settings/settings').then(m => m.WorkspaceSettingsComponent), title: 'Settings — Acklet' },
      { path: 'profile', loadComponent: () => import('./pages/workspace/profile/profile').then(m => m.WorkspaceProfileComponent), title: 'Profile — Acklet' },
    ]
  },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent), title: '404 — Acklet' },
];
