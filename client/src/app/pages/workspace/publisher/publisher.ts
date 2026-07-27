import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublisherService, CreateToolRequest } from '../../../core/services/publisher.service';
import { GitHubService } from '../../../core/services/github.service';
import { ToolsService } from '../../../core/services/tools.service';
import { Tool } from '../../../core/models/tool.model';
import { Category } from '../../../core/models/category.model';
import { IconComponent } from '../../../shared/components/icon/icon';
import { FallbackStateComponent } from '../../../shared/components/fallback-state/fallback-state';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-publisher-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    IconComponent,
    FallbackStateComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <div class="space-y-8 pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Publisher Workspace
            <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Verified Creator
            </span>
          </h1>
          <p class="text-sm text-slate-400 mt-1">Manage your published tools, monitor sync status, and track AI enrichment jobs.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2 transition-all">
          <app-icon name="plus" size="18"></app-icon>
          Submit New Tool
        </button>
      </div>

      <!-- Live Analytics Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">Total Tools</span>
            <app-icon name="box" size="20" class="text-cyan-400"></app-icon>
          </div>
          <p class="text-2xl font-bold text-white">{{ stats()?.totalTools || myTools().length }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">Active Status</span>
            <app-icon name="check-circle" size="20" class="text-emerald-400"></app-icon>
          </div>
          <p class="text-2xl font-bold text-white">{{ activeCount() }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">Pending Review</span>
            <app-icon name="clock" size="20" class="text-amber-400"></app-icon>
          </div>
          <p class="text-2xl font-bold text-white">{{ pendingCount() }}</p>
        </div>

        <div class="p-5 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md">
          <div class="flex items-center justify-between text-slate-400 mb-2">
            <span class="text-xs font-medium uppercase tracking-wider">GitHub Connected</span>
            <app-icon name="github" size="20" class="text-violet-400"></app-icon>
          </div>
          <p class="text-2xl font-bold text-white">{{ githubConnectedCount() }}</p>
        </div>
      </div>

      <!-- Tools Management Section -->
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-white">Your Tools & Submissions</h2>

        @if (loading()) {
          <app-loading-skeleton type="card" [count]="3"></app-loading-skeleton>
        } @else if (error()) {
          <app-fallback-state type="ERROR" [message]="error()!" [showRetry]="true" (onRetry)="loadPublisherData()"></app-fallback-state>
        } @else if (myTools().length === 0) {
          <app-fallback-state
            type="EMPTY"
            title="No Tools Submitted Yet"
            message="Publish your first developer tool, CLI, SDK, or SaaS product to reach thousands of developers."
            primaryActionText="Submit Your First Tool"
            (onRetry)="openCreateModal()">
          </app-fallback-state>
        } @else {
          <div class="overflow-x-auto rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md">
            <table class="w-full text-left text-sm text-slate-300">
              <thead class="bg-white/5 text-xs uppercase tracking-wider text-slate-400 border-b border-white/5">
                <tr>
                  <th class="px-6 py-4">Tool</th>
                  <th class="px-6 py-4">Category</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">GitHub Sync</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                @for (t of myTools(); track t.id) {
                  <tr class="hover:bg-white/[0.02] transition-colors">
                    <td class="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <app-icon name="terminal" size="18"></app-icon>
                      </div>
                      <div>
                        <a [routerLink]="['/tools', t.slug || t.id]" class="hover:text-cyan-400 font-semibold transition-colors">
                          {{ t.name }}
                        </a>
                        <p class="text-xs text-slate-400 line-clamp-1 max-w-xs">{{ t.tagline }}</p>
                      </div>
                    </td>

                    <td class="px-6 py-4 text-slate-400">
                      {{ t.categoryName || t.category || 'General' }}
                    </td>

                    <td class="px-6 py-4">
                      <span [ngClass]="{
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': t.status === 'ACTIVE' || t.status === 'PUBLISHED',
                        'bg-amber-500/10 text-amber-400 border-amber-500/20': t.status === 'PENDING',
                        'bg-rose-500/10 text-rose-400 border-rose-500/20': t.status === 'REJECTED',
                        'bg-slate-500/10 text-slate-400 border-slate-500/20': t.status === 'DRAFT'
                      }" class="px-2.5 py-1 text-xs font-semibold rounded-full border">
                        {{ t.status || 'DRAFT' }}
                      </span>
                    </td>

                    <td class="px-6 py-4">
                      @if (t.githubRepo || t.githubUrl) {
                        <button (click)="triggerSync(t.id)" [disabled]="syncingId() === t.id" class="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 border border-white/10 text-cyan-400 hover:bg-white/10 flex items-center gap-1.5 transition-all">
                          <app-icon name="refresh-cw" size="14" [class.animate-spin]="syncingId() === t.id"></app-icon>
                          Sync Now
                        </button>
                      } @else {
                        <span class="text-xs text-slate-500">Not Linked</span>
                      }
                    </td>

                    <td class="px-6 py-4 text-right">
                      @if (t.status === 'DRAFT') {
                        <button (click)="submitForReview(t.slug || t.id)" class="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:underline">
                          Submit Review
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- New Tool Modal Form -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div class="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-6">
            <div class="flex items-center justify-between border-b border-white/5 pb-4">
              <h3 class="text-lg font-bold text-white">Submit New Tool</h3>
              <button (click)="closeCreateModal()" class="text-slate-400 hover:text-white">
                <app-icon name="x" size="20"></app-icon>
              </button>
            </div>

            <form [formGroup]="toolForm" (ngSubmit)="onSaveTool()" class="space-y-4">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Tool Name *</label>
                <input formControlName="name" type="text" placeholder="e.g. Acklet Engine" class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                @if (toolForm.get('name')?.invalid && toolForm.get('name')?.touched) {
                  <span class="text-xs text-rose-400 mt-1 block">Name is required (min 3 chars).</span>
                }
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Tagline *</label>
                <input formControlName="tagline" type="text" placeholder="One-line summary of what it solves" class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Category *</label>
                <select formControlName="categorySlug" class="w-full px-4 py-2.5 text-sm rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-500">
                  <option value="" disabled>Select category</option>
                  @for (c of categories(); track c.slug) {
                    <option [value]="c.slug">{{ c.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Description *</label>
                <textarea formControlName="description" rows="3" placeholder="Detailed explanation of features and capabilities" class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">GitHub URL</label>
                  <input formControlName="githubUrl" type="text" placeholder="https://github.com/org/repo" class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Website URL</label>
                  <input formControlName="websiteUrl" type="text" placeholder="https://mytool.dev" class="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" (click)="closeCreateModal()" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button type="submit" [disabled]="toolForm.invalid || submitting()" class="btn btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center gap-2">
                  @if (submitting()) {
                    <app-icon name="loader" size="16" class="animate-spin"></app-icon>
                    Submitting...
                  } @else {
                    Submit Tool
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class PublisherWorkspaceComponent implements OnInit {
  private readonly publisherSvc = inject(PublisherService);
  private readonly githubSvc = inject(GitHubService);
  private readonly toolsSvc = inject(ToolsService);
  private readonly toastSvc = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly myTools = signal<Tool[]>([]);
  readonly stats = signal<any>(null);
  readonly categories = this.toolsSvc.categories;
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly syncingId = signal<string | null>(null);
  readonly showModal = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  toolForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadPublisherData();
  }

  private initForm(): void {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      tagline: ['', [Validators.required]],
      categorySlug: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      githubUrl: [''],
      websiteUrl: ['']
    });
  }

  loadPublisherData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.publisherSvc.getMyTools(0, 50).subscribe({
      next: page => {
        this.myTools.set(page?.content || []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.message || 'Failed to load publisher workspace data');
        this.loading.set(false);
      }
    });

    this.publisherSvc.getDashboard().subscribe({
      next: data => this.stats.set(data),
      error: () => {}
    });
  }

  activeCount(): number {
    return this.myTools().filter(t => t.status === 'ACTIVE' || t.status === 'PUBLISHED').length;
  }

  pendingCount(): number {
    return this.myTools().filter(t => t.status === 'PENDING').length;
  }

  githubConnectedCount(): number {
    return this.myTools().filter(t => !!(t.githubRepo || t.githubUrl)).length;
  }

  triggerSync(toolId: string): void {
    this.syncingId.set(toolId);
    this.githubSvc.triggerSync(toolId).subscribe({
      next: () => {
        this.syncingId.set(null);
        this.toastSvc.success('GitHub re-sync triggered successfully');
      },
      error: () => {
        this.syncingId.set(null);
        this.toastSvc.error('Failed to trigger GitHub re-sync');
      }
    });
  }

  submitForReview(slugOrId: string): void {
    this.publisherSvc.submitTool(slugOrId).subscribe({
      next: updated => {
        this.toastSvc.success('Tool submitted for review');
        this.loadPublisherData();
      },
      error: () => this.toastSvc.error('Failed to submit tool for review')
    });
  }

  openCreateModal(): void {
    this.showModal.set(true);
  }

  closeCreateModal(): void {
    this.showModal.set(false);
    this.toolForm.reset();
  }

  onSaveTool(): void {
    if (this.toolForm.invalid) return;

    this.submitting.set(true);
    const req: CreateToolRequest = this.toolForm.value;

    this.publisherSvc.createTool(req).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeCreateModal();
        this.toastSvc.success('Tool created and saved');
        this.loadPublisherData();
      },
      error: err => {
        this.submitting.set(false);
        this.toastSvc.error(err?.message || 'Failed to create tool');
      }
    });
  }
}
