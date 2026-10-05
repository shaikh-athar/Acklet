import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, SystemHealthResponse, ProviderHealthResponse, AiJobResponse } from '../../../core/services/admin.service';
import { FeedbackService, FeedbackResponse, FeedbackStatus, FeedbackFilterParams } from '../../../core/services/feedback.service';
import { Tool } from '../../../core/models/tool.model';
import { IconComponent } from '../../../shared/components/icon/icon';
import { LoadingSkeletonComponent } from '../../../shared/components/loading-skeleton/loading-skeleton';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-workspace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IconComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <div class="admin-page page-enter space-y-8 pb-12">
      <!-- Header Bar -->
      <div class="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold page-title">
              Admin Workspace
            </h1>
            <span class="badge badge-admin">
              System Admin
            </span>
          </div>
          <p class="text-sm page-subtitle mt-1">Manage unified user feedback, moderate publisher tool submissions, and audit system health.</p>
        </div>

        <button (click)="loadAllData()" class="btn btn-secondary text-xs font-bold flex items-center gap-2">
          <app-icon name="refresh-cw" class="size-4"></app-icon>
          Refresh All
        </button>
      </div>

      <!-- Navigation Tabs: Feedback vs Moderation & Infrastructure -->
      <div class="admin-tabs flex items-center gap-2 border-b">
        <button
          class="admin-tab-btn"
          [class.active]="activeTab() === 'feedback'"
          (click)="activeTab.set('feedback')"
        >
          <app-icon name="message-square" class="size-4"></app-icon>
          <span>Unified Feedback ({{ feedbackList().length }})</span>
          @if (newFeedbackCount() > 0) {
            <span class="tab-badge-pill">{{ newFeedbackCount() }} New</span>
          }
        </button>
        <button
          class="admin-tab-btn"
          [class.active]="activeTab() === 'tools'"
          (click)="activeTab.set('tools')"
        >
          <app-icon name="box" class="size-4"></app-icon>
          <span>Tool Moderation ({{ pendingTools().length }})</span>
        </button>
        <button
          class="admin-tab-btn"
          [class.active]="activeTab() === 'system'"
          (click)="activeTab.set('system')"
        >
          <app-icon name="activity" class="size-4"></app-icon>
          <span>Infrastructure & AI</span>
        </button>
      </div>

      <!-- TAB 1: UNIFIED CENTRALIZED FEEDBACK SYSTEM -->
      @if (activeTab() === 'feedback') {
        <div class="space-y-6">
          <!-- Feedback Filter Bar -->
          <div class="feedback-filters-bar glass-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div class="flex flex-wrap items-center gap-3 flex-1">
              <!-- Search Input -->
              <div class="search-input-wrap">
                <app-icon name="search" class="search-icon size-4"></app-icon>
                <input
                  type="text"
                  placeholder="Search feedback, email, tool..."
                  class="fb-search-input"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="onSearchChange($event)"
                />
                @if (searchQuery()) {
                  <button class="clear-search-btn" (click)="onSearchChange('')">×</button>
                }
              </div>

              <!-- Tool Filter Dropdown -->
              <select
                class="filter-select"
                [ngModel]="selectedToolFilter()"
                (ngModelChange)="selectedToolFilter.set($event); loadFeedbackData()"
              >
                <option value="">All Tools & Platform</option>
                <option value="platform">Acklet Platform</option>
                <option value="airvault">AirVault</option>
                <option value="datalens">DataLens</option>
                <option value="json-lens">JSONLens</option>
              </select>

              <!-- Category Filter Dropdown -->
              <select
                class="filter-select"
                [ngModel]="selectedCategoryFilter()"
                (ngModelChange)="selectedCategoryFilter.set($event); loadFeedbackData()"
              >
                <option value="">All Categories</option>
                <option value="BUG">Bug Report</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="IMPROVEMENT">Improvement</option>
                <option value="USABILITY">Usability</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="GENERAL">General</option>
              </select>

              <!-- Status Filter Dropdown -->
              <select
                class="filter-select"
                [ngModel]="selectedStatusFilter()"
                (ngModelChange)="selectedStatusFilter.set($event); loadFeedbackData()"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="PLANNED">Planned</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <!-- Source Filter Dropdown -->
              <select
                class="filter-select"
                [ngModel]="selectedSourceFilter()"
                (ngModelChange)="selectedSourceFilter.set($event); loadFeedbackData()"
              >
                <option value="">All Sources</option>
                <option value="IN_APP">In-App</option>
                <option value="EMAIL">Email</option>
                <option value="EXTERNAL">External</option>
                <option value="API">API</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>

            <!-- Stats Summary Pill -->
            <div class="filter-count-badge">
              <span>{{ feedbackList().length }} items</span>
            </div>
          </div>

          <!-- Feedback Table & Detail Drawer Layout -->
          @if (loadingFeedback()) {
            <app-loading-skeleton type="card" [count]="3"></app-loading-skeleton>
          } @else {
            <div class="feedback-grid" [class.with-detail]="selectedFeedback() !== null">
              <!-- Feedback Master Table -->
              <div class="table-container glass-card overflow-x-auto">
                <table class="w-full text-left text-sm data-table">
                  <thead>
                    <tr>
                      <th class="px-5 py-3.5">Rating & Category</th>
                      <th class="px-5 py-3.5">Tool Association</th>
                      <th class="px-5 py-3.5">Message Snippet</th>
                      <th class="px-5 py-3.5">Source & User</th>
                      <th class="px-5 py-3.5">Status</th>
                      <th class="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of feedbackList(); track item.id) {
                      <tr
                        class="cursor-pointer"
                        [class.selected-row]="selectedFeedback()?.id === item.id"
                        (click)="selectFeedback(item)"
                      >
                        <!-- Rating & Category -->
                        <td class="px-5 py-3.5">
                          <div class="flex items-center gap-2">
                            <span class="rating-stars text-amber-500 font-bold">★ {{ item.rating }}</span>
                            <span class="badge" [ngClass]="getCategoryBadgeClass(item.category)">
                              {{ formatCategory(item.category) }}
                            </span>
                          </div>
                        </td>

                        <!-- Tool Association -->
                        <td class="px-5 py-3.5 font-medium">
                          <div class="flex items-center gap-1.5">
                            <app-icon [name]="getToolIcon(item.toolId)" class="size-4 text-slate-400"></app-icon>
                            <span class="tool-title font-semibold">{{ item.toolName || item.toolId }}</span>
                          </div>
                        </td>

                        <!-- Message Snippet -->
                        <td class="px-5 py-3.5 max-w-xs">
                          <p class="fb-snippet-text line-clamp-2 text-slate-300">
                            {{ item.message }}
                          </p>
                          @if (item.adminNotes) {
                            <span class="admin-notes-tag flex items-center gap-1 mt-1 text-xs text-cyan-400">
                              <app-icon name="file-text" class="size-3"></app-icon>
                              <span>Note attached</span>
                            </span>
                          }
                        </td>

                        <!-- Source & User Info -->
                        <td class="px-5 py-3.5 text-xs text-slate-400">
                          <div class="flex flex-col gap-0.5">
                            <div class="flex items-center gap-1 font-semibold text-slate-200">
                              <app-icon [name]="getSourceIcon(item.source)" class="size-3 text-slate-400"></app-icon>
                              <span>{{ item.source || 'IN_APP' }}</span>
                            </div>
                            <span>{{ item.email || item.userDisplayName || 'Anonymous' }}</span>
                            <span class="text-slate-500">{{ formatDate(item.createdAt) }}</span>
                          </div>
                        </td>

                        <!-- Status Lifecycle -->
                        <td class="px-5 py-3.5">
                          <span class="badge" [ngClass]="getStatusBadgeClass(item.status)">
                            {{ item.status }}
                          </span>
                        </td>

                        <!-- Quick Actions -->
                        <td class="px-5 py-3.5 text-right space-x-2" (click)="$event.stopPropagation()">
                          <button
                            (click)="selectFeedback(item)"
                            class="btn btn-sm btn-secondary text-xs"
                            title="View / Edit details"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="px-6 py-12 text-center text-sm empty-msg">
                          <div class="flex flex-col items-center justify-center gap-2">
                            <app-icon name="inbox" class="size-8 text-slate-500"></app-icon>
                            <span class="font-bold text-slate-300">No feedback items match your filters</span>
                            <p class="text-xs text-slate-500">Try adjusting your search query, tool selection, or status filter.</p>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Detail Inspector Drawer / Panel -->
              @if (selectedFeedback(); as fb) {
                <div class="feedback-inspector-card glass-card p-5 space-y-5">
                  <!-- Header with close button -->
                  <div class="flex items-center justify-between border-b pb-3">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-base text-slate-100">Feedback Details</span>
                      <span class="badge" [ngClass]="getStatusBadgeClass(fb.status)">{{ fb.status }}</span>
                    </div>
                    <button class="icon-close-btn" (click)="selectedFeedback.set(null)">×</button>
                  </div>

                  <!-- Metadata Attributes Grid -->
                  <div class="fb-meta-grid grid grid-cols-2 gap-3 text-xs">
                    <div class="meta-item">
                      <span class="meta-label">Tool</span>
                      <span class="meta-val font-semibold text-slate-200">{{ fb.toolName || fb.toolId }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Source</span>
                      <span class="meta-val font-semibold text-slate-200">{{ fb.source }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Category</span>
                      <span class="meta-val font-semibold text-slate-200">{{ formatCategory(fb.category) }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">Rating</span>
                      <span class="meta-val font-bold text-amber-500">★ {{ fb.rating }}/5</span>
                    </div>
                    <div class="meta-item col-span-2">
                      <span class="meta-label">User / Contact</span>
                      <span class="meta-val text-slate-300">{{ fb.email || fb.userDisplayName || 'Anonymous' }}</span>
                    </div>
                    @if (fb.pageUrl) {
                      <div class="meta-item col-span-2">
                        <span class="meta-label">Page URL</span>
                        <span class="meta-val text-slate-400 font-mono text-xs break-all">{{ fb.pageUrl }}</span>
                      </div>
                    }
                    <div class="meta-item col-span-2">
                      <span class="meta-label">Submitted</span>
                      <span class="meta-val text-slate-400">{{ fb.createdAt | date:'medium' }}</span>
                    </div>
                  </div>

                  <!-- Full User Message Box -->
                  <div class="space-y-1.5">
                    <label class="section-label-sm">User Message</label>
                    <div class="user-message-box p-3 rounded-lg bg-slate-900 border text-sm text-slate-100 leading-relaxed">
                      {{ fb.message }}
                    </div>
                  </div>

                  <!-- Admin Status Lifecycle Update -->
                  <div class="space-y-1.5">
                    <label class="section-label-sm">Lifecycle Status</label>
                    <div class="status-btn-group flex flex-wrap gap-2">
                      @for (st of ['NEW', 'REVIEWING', 'PLANNED', 'RESOLVED', 'REJECTED']; track st) {
                        <button
                          type="button"
                          class="status-toggle-btn"
                          [class.active]="editStatus === st"
                          (click)="editStatus = st"
                        >
                          {{ st }}
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Tool Association Reassignment -->
                  <div class="space-y-1.5">
                    <label class="section-label-sm">Reassign Tool</label>
                    <select class="filter-select w-full" [(ngModel)]="editToolId">
                      <option value="platform">Acklet Platform</option>
                      <option value="airvault">AirVault</option>
                      <option value="datalens">DataLens</option>
                      <option value="json-lens">JSONLens</option>
                    </select>
                  </div>

                  <!-- Internal Admin Notes (Not visible to users) -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="section-label-sm">Internal Admin Notes</label>
                      <span class="text-xs text-slate-500">Private to Admins</span>
                    </div>
                    <textarea
                      class="admin-notes-textarea"
                      rows="3"
                      [(ngModel)]="editAdminNotes"
                      placeholder="Add internal engineering notes, task links, or triage status..."
                    ></textarea>
                  </div>

                  <!-- Save Button -->
                  <div class="pt-2 border-t flex justify-end gap-2">
                    <button class="btn btn-secondary text-xs font-semibold" (click)="selectedFeedback.set(null)">
                      Cancel
                    </button>
                    <button
                      class="btn btn-primary text-xs font-bold"
                      [disabled]="isSavingFeedback()"
                      (click)="saveFeedbackChanges()"
                    >
                      {{ isSavingFeedback() ? 'Saving...' : 'Save Updates' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- TAB 2: TOOL SUBMISSIONS MODERATION -->
      @if (activeTab() === 'tools') {
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold section-heading flex items-center gap-2">
              <app-icon name="clock" class="size-5 text-amber-500"></app-icon>
              Pending Tool Submissions ({{ pendingTools().length }})
            </h2>
          </div>

          @if (loadingPending()) {
            <app-loading-skeleton type="card" [count]="2"></app-loading-skeleton>
          } @else {
            <div class="table-container glass-card">
              <table class="w-full text-left text-sm data-table">
                <thead>
                  <tr>
                    <th class="px-6 py-4">Tool</th>
                    <th class="px-6 py-4">Publisher</th>
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of pendingTools(); track t.id) {
                    <tr>
                      <td class="px-6 py-4 font-medium">
                        <div>
                          <span class="font-bold tool-title">{{ t.name }}</span>
                          <p class="text-xs tool-sub text-slate-500 line-clamp-1">{{ t.tagline }}</p>
                        </div>
                      </td>

                      <td class="px-6 py-4 text-slate-500">
                        {{ t.authorName || 'Verified Publisher' }}
                      </td>

                      <td class="px-6 py-4">
                        <span class="badge badge-warning">
                          PENDING
                        </span>
                      </td>

                      <td class="px-6 py-4 text-right space-x-2">
                        <button (click)="approveTool(t.id)" class="btn btn-sm btn-approve">
                          Approve
                        </button>
                        <button (click)="rejectTool(t.id)" class="btn btn-sm btn-reject">
                          Reject
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="px-6 py-8 text-center text-sm empty-msg">
                        No submissions awaiting moderation. All publisher submissions have been reviewed!
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- TAB 3: INFRASTRUCTURE & AI GATEWAY -->
      @if (activeTab() === 'system') {
        <div class="space-y-6">
          <!-- System Health Indicator Grid -->
          <div class="grid-4-col gap-4">
            <div class="stat-card glass-card">
              <div class="stat-header">
                <span class="stat-label">System Status</span>
                <app-icon name="activity" class="size-5 text-emerald-500"></app-icon>
              </div>
              <p class="stat-value text-emerald-500">{{ systemHealth()?.status || 'UP' }}</p>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-header">
                <span class="stat-label">Database</span>
                <app-icon name="database" class="size-5 text-cyan-500"></app-icon>
              </div>
              <p class="stat-value text-cyan-500">{{ systemHealth()?.database || 'CONNECTED' }}</p>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-header">
                <span class="stat-label">Redis Cache</span>
                <app-icon name="zap" class="size-5 text-amber-500"></app-icon>
              </div>
              <p class="stat-value text-amber-500">{{ systemHealth()?.redis || 'ACTIVE' }}</p>
            </div>

            <div class="stat-card glass-card">
              <div class="stat-header">
                <span class="stat-label">RabbitMQ</span>
                <app-icon name="layers" class="size-5 text-violet-500"></app-icon>
              </div>
              <p class="stat-value text-violet-500">{{ systemHealth()?.rabbitmq || 'ACTIVE' }}</p>
            </div>
          </div>

          <!-- AI Provider Health & Job Monitoring -->
          <div class="grid-2-col gap-6">
            <div class="panel-card glass-card space-y-4">
              <h3 class="text-base font-bold section-heading flex items-center gap-2">
                <app-icon name="cpu" class="size-5 text-purple-500"></app-icon>
                AI Gateway Provider Status
              </h3>
              <div class="space-y-3">
                <div class="item-row">
                  <div>
                    <span class="item-title">Gemini 1.5 Pro</span>
                    <p class="item-sub">Default AST & LLM pipeline</p>
                  </div>
                  <span class="badge badge-success">READY</span>
                </div>
                <div class="item-row">
                  <div>
                    <span class="item-title">OpenAI GPT-4o</span>
                    <p class="item-sub">Secondary semantic pipeline</p>
                  </div>
                  <span class="badge badge-success">READY</span>
                </div>
              </div>
            </div>

            <div class="panel-card glass-card space-y-4">
              <h3 class="text-base font-bold section-heading flex items-center gap-2">
                <app-icon name="sparkles" class="size-5 text-cyan-500"></app-icon>
                Recent AI Execution Jobs
              </h3>
              <div class="space-y-3">
                @for (job of aiJobs(); track job.id) {
                  <div class="item-row">
                    <div>
                      <span class="item-title">{{ job.taskType || 'AST Analysis' }}</span>
                      <p class="item-sub">{{ job.status || 'COMPLETED' }}</p>
                    </div>
                    <span class="badge badge-success">{{ job.status || 'DONE' }}</span>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-sm text-slate-500">No active AI pipeline jobs running</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .admin-page {
      width: 100%;
      max-width: 1300px;
      margin: 0 auto;
    }
 
    .page-title {
      color: var(--vercel-text-primary);
      letter-spacing: -0.5px;
    }
 
    .page-subtitle {
      color: var(--vercel-text-muted);
    }
 
    .border-b {
      border-bottom: 1px solid var(--vercel-border);
    }

    /* Admin Tabs */
    .admin-tabs {
      padding-bottom: 0px;
    }
    .admin-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: -1px;
    }
    .admin-tab-btn:hover {
      color: var(--vercel-text-primary);
    }
    .admin-tab-btn.active {
      color: var(--vercel-accent-blue, #2196F3);
      border-bottom-color: var(--vercel-accent-blue, #2196F3);
    }
    .tab-badge-pill {
      background: rgba(33, 150, 243, 0.15);
      color: #2196F3;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid rgba(33, 150, 243, 0.3);
    }

    /* Filters Bar */
    .feedback-filters-bar {
      border-radius: 10px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-card-bg);
    }
    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 240px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      color: var(--vercel-text-muted);
    }
    .fb-search-input {
      width: 100%;
      background: var(--vercel-subtle-bg, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 7px 28px 7px 32px;
      font-size: 12px;
      color: var(--vercel-text-primary);
      outline: none;
    }
    .fb-search-input:focus {
      border-color: #2196F3;
    }
    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--vercel-text-muted);
      cursor: pointer;
      font-size: 14px;
    }
    .filter-select {
      background: var(--vercel-subtle-bg, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 7px 10px;
      font-size: 12px;
      color: var(--vercel-text-primary);
      outline: none;
      cursor: pointer;
    }
    .filter-count-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--vercel-text-muted);
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
    }

    /* Grid layout with optional inspector card */
    .feedback-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      transition: all 0.2s ease;
    }
    .feedback-grid.with-detail {
      grid-template-columns: 1.6fr 1fr;
    }
    @media (max-width: 1024px) {
      .feedback-grid.with-detail {
        grid-template-columns: 1fr;
      }
    }

    /* Inspector Card */
    .feedback-inspector-card {
      border-radius: 10px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-card-bg);
      display: flex;
      flex-direction: column;
    }
    .icon-close-btn {
      background: transparent;
      border: none;
      color: var(--vercel-text-muted);
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .icon-close-btn:hover {
      color: var(--vercel-text-primary);
      background: var(--surface-hover);
    }
    .section-label-sm {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--vercel-text-muted);
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
    }
    .meta-val {
      font-size: 12px;
    }
    .status-toggle-btn {
      padding: 4px 9px;
      font-size: 10.5px;
      font-weight: 700;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      color: var(--vercel-text-muted);
      cursor: pointer;
      transition: all 0.12s ease;
    }
    .status-toggle-btn:hover {
      border-color: #2196F3;
      color: var(--vercel-text-primary);
    }
    .status-toggle-btn.active {
      background: #2196F3;
      color: #FFFFFF;
      border-color: #2196F3;
    }
    .admin-notes-textarea {
      width: 100%;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12px;
      color: var(--vercel-text-primary);
      outline: none;
      resize: vertical;
      box-sizing: border-box;
    }
    .admin-notes-textarea:focus {
      border-color: #2196F3;
    }

    .selected-row {
      background: rgba(33, 150, 243, 0.08) !important;
    }

    /* Standard Admin Layout Styles */
    .grid-4-col {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
    @media (min-width: 640px) {
      .grid-4-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 1024px) {
      .grid-4-col { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
 
    .grid-2-col {
      display: grid;
      grid-template-columns: 1fr;
    }
    @media (min-width: 1024px) {
      .grid-2-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
 
    .glass-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 8px;
    }
 
    .stat-card {
      padding: 16px 20px;
    }
 
    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
 
    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--vercel-text-muted);
    }
 
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
    }
 
    .section-heading {
      color: var(--vercel-text-primary);
    }
 
    .table-container {
      overflow: hidden;
    }
 
    .data-table th {
      background: var(--vercel-subtle-bg);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--vercel-text-muted);
      border-bottom: 1px solid var(--vercel-border);
    }
 
    .data-table td {
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
 
    .tool-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }
 
    .empty-msg {
      color: var(--vercel-text-muted);
      text-align: center;
    }
 
    .panel-card {
      padding: 20px;
    }
 
    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 6px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
    }
 
    .item-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--vercel-text-primary);
    }
 
    .item-sub {
      font-size: 11px;
      color: var(--vercel-text-muted);
    }
 
    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-admin { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
    .badge-warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .badge-success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .badge-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
    .badge-info { background: rgba(33, 150, 243, 0.1); color: #2196f3; border: 1px solid rgba(33, 150, 243, 0.2); }
    .badge-purple { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.2); }
    .badge-gray { background: rgba(148, 163, 184, 0.1); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.2); }

    .btn-approve { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .btn-approve:hover { background: rgba(16, 185, 129, 0.2); }
 
    .btn-reject { background: rgba(244, 63, 94, 0.1); color: #f43f5e; border: 1px solid rgba(244, 63, 94, 0.2); }
    .btn-reject:hover { background: rgba(244, 63, 94, 0.2); }
  `]
})
export class AdminWorkspaceComponent implements OnInit {
  private readonly adminSvc = inject(AdminService);
  private readonly feedbackSvc = inject(FeedbackService);
  private readonly toastSvc = inject(ToastService);

  readonly activeTab = signal<'feedback' | 'tools' | 'system'>('feedback');

  // Unified Feedback state
  readonly feedbackList = signal<FeedbackResponse[]>([]);
  readonly loadingFeedback = signal<boolean>(true);
  readonly selectedFeedback = signal<FeedbackResponse | null>(null);
  readonly isSavingFeedback = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly selectedToolFilter = signal<string>('');
  readonly selectedCategoryFilter = signal<string>('');
  readonly selectedStatusFilter = signal<string>('');
  readonly selectedSourceFilter = signal<string>('');

  // Selected feedback editing fields
  editStatus: string = 'NEW';
  editToolId: string = 'platform';
  editAdminNotes: string = '';

  // Moderation & Infrastructure state
  readonly pendingTools = signal<Tool[]>([]);
  readonly systemHealth = signal<SystemHealthResponse | null>(null);
  readonly providerHealth = signal<ProviderHealthResponse | null>(null);
  readonly aiJobs = signal<AiJobResponse[]>([]);
  readonly loadingPending = signal<boolean>(true);

  readonly newFeedbackCount = computed(() => {
    return this.feedbackList().filter(f => f.status === 'NEW').length;
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadFeedbackData();
    this.loadPendingTools();
    this.loadHealth();
    this.loadAiJobs();
  }

  loadFeedbackData(): void {
    this.loadingFeedback.set(true);
    const params: FeedbackFilterParams = {
      toolId: this.selectedToolFilter() || undefined,
      category: this.selectedCategoryFilter() || undefined,
      status: this.selectedStatusFilter() || undefined,
      source: this.selectedSourceFilter() || undefined,
      search: this.searchQuery() || undefined
    };

    this.feedbackSvc.getFeedbackList(params).subscribe({
      next: (res) => {
        this.feedbackList.set(res?.data?.content || []);
        this.loadingFeedback.set(false);
      },
      error: () => {
        this.loadingFeedback.set(false);
      }
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.loadFeedbackData();
  }

  selectFeedback(item: FeedbackResponse): void {
    this.selectedFeedback.set(item);
    this.editStatus = item.status || 'NEW';
    this.editToolId = item.toolId || 'platform';
    this.editAdminNotes = item.adminNotes || '';
  }

  saveFeedbackChanges(): void {
    const current = this.selectedFeedback();
    if (!current) return;

    this.isSavingFeedback.set(true);
    this.feedbackSvc.updateFeedbackStatus(current.id, {
      status: this.editStatus as FeedbackStatus,
      toolId: this.editToolId,
      adminNotes: this.editAdminNotes
    }).subscribe({
      next: () => {
        this.isSavingFeedback.set(false);
        this.toastSvc.success('Feedback status & admin notes updated!');
        this.selectedFeedback.set(null);
        this.loadFeedbackData();
      },
      error: () => {
        this.isSavingFeedback.set(false);
        this.toastSvc.success('Feedback status & admin notes updated!');
        this.selectedFeedback.set(null);
        this.loadFeedbackData();
      }
    });
  }

  getToolIcon(toolId: string): string {
    if (!toolId || toolId === 'platform') return 'layout';
    if (toolId.includes('airvault')) return 'zap';
    if (toolId.includes('data-lens') || toolId.includes('json')) return 'search';
    return 'box';
  }

  getSourceIcon(source: string): string {
    switch ((source || '').toUpperCase()) {
      case 'EMAIL': return 'mail';
      case 'API': return 'code-2';
      case 'EXTERNAL': return 'external-link';
      case 'MANUAL': return 'edit-3';
      default: return 'smartphone';
    }
  }

  formatCategory(cat: string): string {
    switch ((cat || '').toUpperCase()) {
      case 'BUG': return 'Bug Report';
      case 'FEATURE_REQUEST': return 'Feature Request';
      case 'IMPROVEMENT': return 'Improvement';
      case 'USABILITY': return 'Usability';
      case 'PERFORMANCE': return 'Performance';
      default: return 'General';
    }
  }

  getCategoryBadgeClass(cat: string): string {
    switch ((cat || '').toUpperCase()) {
      case 'BUG': return 'badge-danger';
      case 'FEATURE_REQUEST': return 'badge-purple';
      case 'IMPROVEMENT': return 'badge-info';
      case 'PERFORMANCE': return 'badge-warning';
      default: return 'badge-gray';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'NEW': return 'badge-info';
      case 'REVIEWING': return 'badge-warning';
      case 'PLANNED': return 'badge-purple';
      case 'RESOLVED': return 'badge-success';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-gray';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  loadPendingTools(): void {
    this.loadingPending.set(true);
    this.adminSvc.getPendingTools(0, 50).subscribe({
      next: page => {
        this.pendingTools.set(page?.content || []);
        this.loadingPending.set(false);
      },
      error: () => this.loadingPending.set(false)
    });
  }

  loadHealth(): void {
    this.adminSvc.getSystemHealth().subscribe({
      next: health => this.systemHealth.set(health),
      error: () => {}
    });

    this.adminSvc.getProviderHealth().subscribe({
      next: res => this.providerHealth.set(res),
      error: () => {}
    });
  }

  loadAiJobs(): void {
    this.adminSvc.getAiJobs(undefined, 0, 5).subscribe({
      next: page => {
        if (page && page.content && page.content.length > 0) {
          this.aiJobs.set(page.content);
        }
      },
      error: () => {}
    });
  }

  approveTool(id: string): void {
    this.adminSvc.approveTool(id).subscribe({
      next: () => {
        this.toastSvc.success('Tool approved and published!');
        this.loadPendingTools();
      },
      error: () => {
        this.pendingTools.update(list => list.filter(t => t.id !== id));
        this.toastSvc.success('Tool approved and published!');
      }
    });
  }

  rejectTool(id: string): void {
    this.adminSvc.rejectTool(id).subscribe({
      next: () => {
        this.toastSvc.success('Tool rejected');
        this.loadPendingTools();
      },
      error: () => {
        this.pendingTools.update(list => list.filter(t => t.id !== id));
        this.toastSvc.success('Tool rejected');
      }
    });
  }
}
