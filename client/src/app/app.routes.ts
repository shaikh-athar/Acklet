// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // --- Public Pages under main header/navbar layout ---
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then(m => m.MainLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent), title: 'Acklet — Solve digital problems, instantly' },
      
      // Tools Nested Route Tree
      { path: 'tools', redirectTo: 'tools/explore', pathMatch: 'full' },
      {
        path: 'tools',
        children: [
          { path: 'explore', loadComponent: () => import('./pages/tools/tools').then(m => m.ToolsComponent), title: 'Explore Solutions — Acklet' },
          { path: 'categories', loadComponent: () => import('./pages/categories/categories').then(m => m.CategoriesComponent), title: 'Categories — Acklet' },
          { path: 'trending', loadComponent: () => import('./pages/tools/trending/trending').then(m => m.ToolsTrendingComponent), title: 'Trending Solutions — Acklet' },
          { path: 'new', loadComponent: () => import('./pages/tools/new-releases/new-releases').then(m => m.ToolsNewReleasesComponent), title: 'New Releases — Acklet' },
          { path: 'search', loadComponent: () => import('./pages/tools/search-results/search-results').then(m => m.ToolsSearchResultsComponent), title: 'Search Results — Acklet' },
          { path: ':id', loadComponent: () => import('./pages/tool-detail/tool-detail').then(m => m.ToolDetailComponent) },
        ]
      },
      
      { path: 'categories', redirectTo: 'tools/categories', pathMatch: 'full' },
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

  // --- Standalone Auth Pages (No Navbar / No Main Footer) ---
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'signup', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'register', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/login', loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent), title: 'Log In — Acklet' },
  { path: 'auth/callback', loadComponent: () => import('./pages/auth/callback/callback').then(m => m.AuthCallbackComponent), title: 'Authenticating — Acklet' },
  { path: 'auth/onboarding', loadComponent: () => import('./pages/auth/onboarding/onboarding').then(m => m.OnboardingComponent), title: 'Personalize Your Workspace — Acklet' },

  // --- Authenticated Workspace Pages under sidebar layout shell ---
  {
    path: 'workspace',
    loadComponent: () => import('./layout/shell/shell').then(m => m.ShellLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/workspace/dashboard/dashboard').then(m => m.WorkspaceDashboardComponent), title: 'Dashboard — Acklet' },
      { path: 'favorites', loadComponent: () => import('./pages/workspace/favorites/favorites').then(m => m.WorkspaceFavoritesComponent), title: 'Favorites — Acklet' },
      { path: 'history', loadComponent: () => import('./pages/workspace/history/history').then(m => m.WorkspaceHistoryComponent), title: 'History — Acklet' },
      { path: 'collections', loadComponent: () => import('./pages/workspace/collections/collections').then(m => m.WorkspaceCollectionsComponent), title: 'Collections — Acklet' },
      { path: 'notifications', loadComponent: () => import('./pages/workspace/notifications/notifications').then(m => m.WorkspaceNotificationsComponent), title: 'Notifications — Acklet' },
      { path: 'settings', loadComponent: () => import('./pages/workspace/settings/settings').then(m => m.WorkspaceSettingsComponent), title: 'Settings — Acklet' },
      { path: 'profile', loadComponent: () => import('./pages/workspace/profile/profile').then(m => m.WorkspaceProfileComponent), title: 'Profile — Acklet' },
    ]
  },

  { path: '**', loadComponent: () => import('./pages/not-found/not-found').then(m => m.NotFoundComponent), title: '404 — Acklet' },
];
