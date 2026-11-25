// client/apps/tool-docs/src/app/docs.routes.ts

import { Routes } from '@angular/router';
import { DocShellComponent } from './components/doc-layout/doc-shell.component';
import { DocsCommunityComponent } from './pages/community/docs-community.component';
import { DocsDashboardComponent } from './pages/dashboard/docs-dashboard.component';
import { DocsEditorComponent } from './pages/editor/docs-editor.component';
import { DocsWriteComponent } from './pages/write/docs-write.component';
import { DocsLibraryComponent } from './pages/library/docs-library.component';
import { DocsNotificationsComponent } from './pages/notifications/docs-notifications.component';
import { DocsProfileComponent } from './pages/profile/docs-profile.component';
import { DocsSettingsComponent } from './pages/settings/docs-settings.component';
import { DocsPublicViewComponent } from './pages/public-view/docs-public-view.component';
import { DocsPublishPageComponent } from './pages/publish/docs-publish.component';
import { DocsNotFoundComponent } from './pages/not-found/docs-not-found.component';
import { DocsOverviewComponent } from './pages/overview/docs-overview.component';
import { DocsToolsManagementComponent } from './pages/tools-management/docs-tools-management.component';
import { DocsToolEditorComponent } from './pages/tools-management/docs-tool-editor.component';
import { DocsCollectionsManagementComponent } from './pages/collections-management/docs-collections-management.component';
import { DocsCollectionEditorComponent } from './pages/collections-management/docs-collection-editor.component';
import { pendingChangesGuard } from './guards/pending-changes.guard';
import { docsAuthGuard } from './guards/docs-auth.guard';

/**
 * Canonical child routes rendered inside DocShellComponent.
 * Mounted at both root '' (for docs.localhost / docs.acklet.com) and 'docs' (for localhost:4200/docs).
 */
export const DOCS_CHILD_ROUTES: Routes = [
  // ── Group "Read" ─────────────────────────────────────────────────────────────
  {
    path: '',
    component: DocsCommunityComponent,
    title: 'Explore — Acklet Docs',
  },
  {
    path: 'following',
    component: DocsLibraryComponent,
    canActivate: [docsAuthGuard],
    title: 'Following — Acklet Docs',
  },
  {
    path: 'library/bookmarks',
    component: DocsLibraryComponent,
    canActivate: [docsAuthGuard],
    title: 'Bookmarks — Acklet Docs',
  },
  {
    path: 'library/history',
    component: DocsLibraryComponent,
    canActivate: [docsAuthGuard],
    title: 'Reading History — Acklet Docs',
  },
  {
    path: 'library/following',
    redirectTo: 'following',
    pathMatch: 'full',
  },
  {
    path: 'library',
    redirectTo: 'library/bookmarks',
    pathMatch: 'full',
  },

  // ── Group "Content Workspace" (Overview, Stories, Tools, Collections) ───────
  {
    path: 'overview',
    component: DocsOverviewComponent,
    canActivate: [docsAuthGuard],
    title: 'Content Overview — Acklet Docs',
  },
  {
    path: 'stories',
    component: DocsDashboardComponent,
    canActivate: [docsAuthGuard],
    title: 'Your Stories — Acklet Docs',
  },
  {
    path: 'drafts',
    component: DocsDashboardComponent,
    canActivate: [docsAuthGuard],
    title: 'Drafts — Acklet Docs',
  },
  {
    path: 'published',
    component: DocsDashboardComponent,
    canActivate: [docsAuthGuard],
    title: 'Published — Acklet Docs',
  },

  // Tools Management
  {
    path: 'tools-admin',
    component: DocsToolsManagementComponent,
    canActivate: [docsAuthGuard],
    title: 'Tools Management — Acklet Docs',
  },
  {
    path: 'tools-admin/new',
    component: DocsToolEditorComponent,
    canActivate: [docsAuthGuard],
    title: 'Add Tool — Acklet Docs',
  },
  {
    path: 'tools-admin/:slug',
    component: DocsToolEditorComponent,
    canActivate: [docsAuthGuard],
    title: 'Edit Tool — Acklet Docs',
  },

  // Collections Management
  {
    path: 'collections',
    component: DocsCollectionsManagementComponent,
    canActivate: [docsAuthGuard],
    title: 'Collections Management — Acklet Docs',
  },
  {
    path: 'collections/new',
    component: DocsCollectionEditorComponent,
    canActivate: [docsAuthGuard],
    title: 'New Collection — Acklet Docs',
  },
  {
    path: 'collections/:id',
    component: DocsCollectionEditorComponent,
    canActivate: [docsAuthGuard],
    title: 'Edit Collection — Acklet Docs',
  },
  {
    path: 'new',
    component: DocsEditorComponent,
    canActivate: [docsAuthGuard],
    canDeactivate: [pendingChangesGuard],
    title: 'New Story — Acklet Docs',
  },
  {
    path: 'write',
    redirectTo: 'new',
    pathMatch: 'full',
  },
  {
    path: 'new-story',
    redirectTo: 'new',
    pathMatch: 'full',
  },
  {
    path: 'write/:docId',
    component: DocsEditorComponent,
    canActivate: [docsAuthGuard],
    canDeactivate: [pendingChangesGuard],
    title: 'Editor — Acklet Docs',
  },
  {
    path: 'write/:docId/publish',
    component: DocsPublishPageComponent,
    canActivate: [docsAuthGuard],
    title: 'Publish Story — Acklet Docs',
  },
  {
    path: 'edit/:docId',
    redirectTo: 'write/:docId',
    pathMatch: 'full',
  },

  // Backward-compatible account aliases
  {
    path: 'account/documents',
    redirectTo: 'stories',
    pathMatch: 'full',
  },
  {
    path: 'account/drafts',
    redirectTo: 'drafts',
    pathMatch: 'full',
  },
  {
    path: 'account/published',
    redirectTo: 'published',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    redirectTo: 'stories',
    pathMatch: 'full',
  },

  // ── Account & Preferences ───────────────────────────────────────────────────
  {
    path: 'profile/:handle',
    component: DocsProfileComponent,
    title: 'Author Profile — Acklet Docs',
  },
  {
    path: 'profile',
    component: DocsProfileComponent,
    canActivate: [docsAuthGuard],
    title: 'Your Profile — Acklet Docs',
  },
  {
    path: 'profile/me',
    redirectTo: 'profile',
    pathMatch: 'full',
  },
  {
    path: 'settings',
    component: DocsSettingsComponent,
    canActivate: [docsAuthGuard],
    title: 'Settings — Acklet Docs',
  },
  {
    path: 'notifications',
    component: DocsNotificationsComponent,
    canActivate: [docsAuthGuard],
    title: 'Notifications — Acklet Docs',
  },
];

export const DOCS_ROUTES: Routes = [
  // ── Standalone Public Read-Only Article Reader ──────────────────────────────
  {
    path: 'p/:slug',
    component: DocsPublicViewComponent,
    title: 'Acklet Docs',
  },
  {
    path: 'docs/p/:slug',
    component: DocsPublicViewComponent,
    title: 'Acklet Docs',
  },
  {
    path: 'p/:toolSlug/:docSlug',
    component: DocsPublicViewComponent,
    title: 'Acklet Docs',
  },
  {
    path: 'docs/p/:toolSlug/:docSlug',
    component: DocsPublicViewComponent,
    title: 'Acklet Docs',
  },

  // ── Shell at Root (docs.localhost:4200 / docs.acklet.com) ──────────────────
  {
    path: '',
    component: DocShellComponent,
    children: DOCS_CHILD_ROUTES,
  },

  // ── Shell at /docs (localhost:4200/docs) ────────────────────────────────────
  {
    path: 'docs',
    component: DocShellComponent,
    children: DOCS_CHILD_ROUTES,
  },

  // ── 404 Wildcard Fallback ──────────────────────────────────────────────────
  {
    path: '**',
    component: DocsNotFoundComponent,
    title: 'Page Not Found — Acklet Docs',
  },
];
