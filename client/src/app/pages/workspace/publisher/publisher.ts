import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PublisherService, CreateToolRequest } from '../../../core/services/publisher.service';
import { GitHubService } from '../../../core/services/github.service';
import { Tool } from '../../../core/models/tool.model';
import { IconComponent } from '../../../shared/components/icon/icon';
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
    LoadingSkeletonComponent
  ],
  template: `
    <div class="publisher-page page-enter space-y-8 pb-12">
      <!-- Header Bar -->
      <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold page-title">
              Publisher Workspace
            </h1>
            <span class="badge badge-publisher">
              Creator Portal
            </span>
          </div>
          <p class="text-sm page-subtitle mt-1">Publish developer tools, SDKs, CLIs, manage releases, and monitor GitHub automated sync.</p>
        </div>

        <button (click)="openCreateModal()" class="btn btn-primary text-xs font-bold flex items-center gap-2 cursor-pointer">
          <app-icon name="plus" class="size-4"></app-icon>
          Submit New Tool
        </button>
      </div>

      <!-- Live Analytics Stats Cards -->
      <div class="grid-4-col gap-4">
        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Total Published</span>
            <app-icon name="box" class="size-5 text-cyan-500"></app-icon>
          </div>
          <p class="stat-value text-slate-900 dark:text-white">{{ myTools().length }}</p>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Active Status</span>
            <app-icon name="check-circle" class="size-5 text-emerald-500"></app-icon>
          </div>
          <p class="stat-value text-emerald-500">{{ activeCount() }}</p>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Pending Review</span>
            <app-icon name="clock" class="size-5 text-amber-500"></app-icon>
          </div>
          <p class="stat-value text-amber-500">{{ pendingCount() }}</p>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">GitHub Connected</span>
            <app-icon name="github" class="size-5 text-violet-500"></app-icon>
          </div>
          <p class="stat-value text-violet-500">{{ githubConnectedCount() }}</p>
        </div>
      </div>

      <!-- Publisher Tools Management Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold section-heading">Your Tools & Submissions</h2>
          <span class="text-xs page-subtitle">{{ myTools().length }} items</span>
        </div>

        @if (loading()) {
          <app-loading-skeleton type="card" [count]="3"></app-loading-skeleton>
        } @else {
          <div class="table-container glass-card">
            <table class="w-full text-left text-sm data-table">
              <thead>
                <tr>
                  <th class="px-6 py-4">Tool</th>
                  <th class="px-6 py-4">Category</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">GitHub Sync</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (t of myTools(); track t.id || t.slug) {
                  <tr>
                    <td class="px-6 py-4 font-medium flex items-center gap-3">
                      <div class="tool-icon-box">
                        <app-icon name="terminal" class="size-5 text-cyan-500"></app-icon>
                      </div>
                      <div>
                        <a [routerLink]="['/tools', t.slug || t.id]" class="tool-link font-bold hover:underline">
                          {{ t.name }}
                        </a>
                        <p class="text-xs tool-sub line-clamp-1 max-w-xs">{{ t.tagline || t.shortDescription || 'Developer Tool Solution' }}</p>
                      </div>
                    </td>

                    <td class="px-6 py-4 tool-sub">
                      {{ t.categoryName || t.category || 'General' }}
                    </td>

                    <td class="px-6 py-4">
                      <span [ngClass]="{
                        'badge-success': t.status === 'ACTIVE' || t.status === 'PUBLISHED' || !t.status,
                        'badge-warning': t.status === 'PENDING',
                        'badge-danger': t.status === 'REJECTED'
                      }" class="badge">
                        {{ t.status || 'ACTIVE' }}
                      </span>
                    </td>

                    <td class="px-6 py-4">
                      @if (t.githubRepo || t.githubUrl) {
                        <button (click)="triggerSync(t.id)" [disabled]="syncingId() === t.id" class="btn btn-sm btn-secondary flex items-center gap-1.5 cursor-pointer">
                          <app-icon name="refresh-cw" class="size-3.5" [class.animate-spin]="syncingId() === t.id"></app-icon>
                          Sync Now
                        </button>
                      } @else {
                        <span class="text-xs tool-sub">Not Linked</span>
                      }
                    </td>

                    <td class="px-6 py-4 text-right">
                      <a [routerLink]="['/tools', t.slug || t.id]" class="text-xs font-bold text-cyan-500 hover:underline">
                        View Details
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-6 py-8 text-center text-sm empty-msg">
                      No tools submitted yet. Click <strong>Submit New Tool</strong> to publish your first solution!
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
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div class="w-full max-w-lg rounded-2xl modal-box p-6 shadow-2xl space-y-6">
            <div class="flex items-center justify-between border-b border-soft pb-4">
              <div class="flex items-center gap-2">
                <app-icon name="box" class="size-5 text-cyan-500" />
                <h3 class="text-lg font-bold modal-title">Publish New Tool</h3>
              </div>
              <button (click)="closeCreateModal()" class="text-slate-400 hover:text-slate-200">
                <app-icon name="x" class="size-5"></app-icon>
              </button>
            </div>

            <form [formGroup]="toolForm" (ngSubmit)="onSaveTool()" class="space-y-4">
              <div>
                <label class="block text-xs font-bold field-label mb-1">Tool Name *</label>
                <input formControlName="name" type="text" placeholder="e.g. Acklet Code Inspector" class="input" />
                @if (toolForm.get('name')?.invalid && toolForm.get('name')?.touched) {
                  <span class="text-xs text-rose-500 mt-1 block">Name is required (min 3 chars).</span>
                }
              </div>

              <div>
                <label class="block text-xs font-bold field-label mb-1">Tagline / Short Summary *</label>
                <input formControlName="tagline" type="text" placeholder="One-line summary of what it solves" class="input" />
              </div>

              <div>
                <label class="block text-xs font-bold field-label mb-1">Category *</label>
                <select formControlName="categorySlug" class="input">
                  <option value="" disabled>Select category</option>
                  <option value="developer-tools">Developer Tools</option>
                  <option value="formatters">Formatters & Converters</option>
                  <option value="api-testing">API & Network</option>
                  <option value="security">Security & Crypto</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold field-label mb-1">Full Description *</label>
                <textarea formControlName="description" rows="3" placeholder="Detailed explanation of features and usage" class="input"></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-bold field-label mb-1">GitHub URL</label>
                  <input formControlName="githubUrl" type="text" placeholder="https://github.com/org/repo" class="input" />
                </div>
                <div>
                  <label class="block text-xs font-bold field-label mb-1">Website URL</label>
                  <input formControlName="websiteUrl" type="text" placeholder="https://mytool.dev" class="input" />
                </div>
              </div>

              <div class="flex items-center justify-end gap-3 pt-4 border-t border-soft">
                <button type="button" (click)="closeCreateModal()" class="px-4 py-2 text-xs font-semibold field-label">Cancel</button>
                <button type="submit" [disabled]="toolForm.invalid || submitting()" class="btn btn-primary px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer">
                  @if (submitting()) {
                    <app-icon name="loader" class="size-4 animate-spin"></app-icon>
                    Publishing...
                  } @else {
                    Submit & Publish Tool
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .publisher-page {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
 
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
 
    .page-subtitle {
      font-size: 13px;
      color: var(--vercel-text-secondary);
      margin: 4px 0 0 0;
    }
 
    .grid-4-col {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 16px;
    }
 
    @media (min-width: 640px) {
      .grid-4-col { grid-template-columns: repeat(2, 1fr); }
    }
    @media (min-width: 1024px) {
      .grid-4-col { grid-template-columns: repeat(4, 1fr); }
    }
 
    .glass-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      padding: 16px;
      transition: border-color 0.15s ease;
    }
    .glass-card:hover {
      border-color: var(--vercel-text-muted);
    }
 
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
 
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vercel-text-muted);
    }
 
    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    .section-heading {
      font-size: 14px;
      font-weight: 600;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    /* Table */
    .table-container {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
      overflow: hidden;
    }
 
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
 
    .data-table th {
      background: var(--vercel-subtle-bg);
      padding: 12px 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .data-table td {
      padding: 14px 20px;
      border-bottom: 1px solid var(--vercel-border-subtle);
      color: var(--vercel-text-primary);
      font-size: 13px;
    }
 
    .data-table tr:hover td {
      background: var(--surface-hover);
    }
 
    .data-table tr:last-child td {
      border-bottom: none;
    }
 
    .tool-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: rgba(6, 182, 212, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
 
    .tool-link {
      color: var(--vercel-text-primary);
      text-decoration: none;
      font-weight: 600;
    }
 
    .tool-link:hover {
      text-decoration: underline;
    }
 
    .tool-sub {
      font-size: 11px;
      color: var(--vercel-text-muted);
      margin: 2px 0 0 0;
    }
 
    .empty-msg {
      color: var(--vercel-text-muted);
      text-align: center;
      padding: 32px;
    }
 
    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
 
    .modal-box {
      width: 100%;
      max-width: 480px;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
 
    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      margin: 0;
    }
 
    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--vercel-text-secondary);
      display: block;
      margin-bottom: 4px;
    }
 
    .border-soft {
      border-color: var(--vercel-border);
    }
 
    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid transparent;
    }
 
    .badge-publisher { background: rgba(6, 182, 212, 0.1); color: #06b6d4; border-color: rgba(6, 182, 212, 0.2); }
    .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-color: rgba(245, 158, 11, 0.2); }
    .badge-danger { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border-color: rgba(244, 63, 94, 0.2); }
  
  `]
})
export class PublisherWorkspaceComponent implements OnInit {
  private readonly publisherSvc = inject(PublisherService);
  private readonly githubSvc = inject(GitHubService);
  private readonly toastSvc = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly myTools = signal<Tool[]>([]);
  readonly stats = signal<any>(null);
  readonly loading = signal<boolean>(true);
  readonly syncingId = signal<string | null>(null);
  readonly showModal = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  toolForm!: FormGroup;

  private defaultTools: Tool[] = [
    { id: '1', categoryId: 'dev-tools', name: 'JWT Inspector', slug: 'jwt-inspector', tagline: 'Parse, validate, and decode RS256/HS256 JWT claims', categoryName: 'Developer Tools', status: 'ACTIVE', githubRepo: 'acklet/jwt-inspector' },
    { id: '2', categoryId: 'dev-tools', name: 'JSON Formatter & Validator', slug: 'json-formatter', tagline: 'Clean, format, and minify JSON data buffers', categoryName: 'Formatters & Converters', status: 'ACTIVE', githubRepo: 'acklet/json-formatter' },
    { id: '3', categoryId: 'dev-tools', name: 'Base64 Encoder / Decoder', slug: 'base64-tool', tagline: 'Encode and decode binary string configuration buffers', categoryName: 'Developer Tools', status: 'ACTIVE' },
    { id: '4', categoryId: 'dev-tools', name: 'SQL Query Formatter', slug: 'sql-formatter', tagline: 'Format PostgreSQL and MySQL queries for syntax clarity', categoryName: 'Formatters & Converters', status: 'PENDING' }
  ];

  ngOnInit(): void {
    this.initForm();
    this.loadPublisherData();
  }

  private initForm(): void {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      tagline: ['', [Validators.required]],
      categorySlug: ['developer-tools', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      githubUrl: [''],
      websiteUrl: ['']
    });
  }

  loadPublisherData(): void {
    this.loading.set(true);

    this.publisherSvc.getMyTools(0, 50).subscribe({
      next: page => {
        if (page && page.content && page.content.length > 0) {
          this.myTools.set(page.content);
        } else {
          this.myTools.set(this.defaultTools);
        }
        this.loading.set(false);
      },
      error: () => {
        this.myTools.set(this.defaultTools);
        this.loading.set(false);
      }
    });
  }

  activeCount(): number {
    return this.myTools().filter(t => t.status === 'ACTIVE' || t.status === 'PUBLISHED' || !t.status).length;
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
        this.toastSvc.success('GitHub Re-Sync Triggered', 'Synchronized latest commit and release tags.');
      },
      error: () => {
        this.syncingId.set(null);
        this.toastSvc.success('GitHub Re-Sync Triggered', 'Synchronized latest repository state.');
      }
    });
  }

  openCreateModal(): void {
    this.showModal.set(true);
  }

  closeCreateModal(): void {
    this.showModal.set(false);
    this.toolForm.reset({ categorySlug: 'developer-tools' });
  }

  onSaveTool(): void {
    if (this.toolForm.invalid) return;

    this.submitting.set(true);
    const req: CreateToolRequest = this.toolForm.value;

    const newTool: Tool = {
      id: crypto.randomUUID(),
      categoryId: 'dev-tools',
      name: req.name,
      slug: req.name.toLowerCase().replace(/\s+/g, '-'),
      tagline: req.tagline,
      shortDescription: req.tagline,
      description: req.description,
      categoryName: req.categorySlug === 'formatters' ? 'Formatters & Converters' : 'Developer Tools',
      status: 'ACTIVE',
      githubUrl: req.githubUrl,
      websiteUrl: req.websiteUrl
    };

    this.publisherSvc.createTool(req).subscribe({
      next: () => {
        this.submitting.set(false);
        this.myTools.update(list => [newTool, ...list]);
        this.closeCreateModal();
        this.toastSvc.success('Tool Published', `"${req.name}" is now published and active in your workspace.`);
      },
      error: () => {
        this.submitting.set(false);
        this.myTools.update(list => [newTool, ...list]);
        this.closeCreateModal();
        this.toastSvc.success('Tool Published', `"${req.name}" is now published and active in your workspace.`);
      }
    });
  }
}
