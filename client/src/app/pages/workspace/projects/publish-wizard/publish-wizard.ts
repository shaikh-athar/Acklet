import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from '../../../../shared/components/icon/icon';
import { TOOLS_BASE_URL } from '../../../../core/config/api.config';

interface AnalysisStage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

interface DraftState {
  draftId: string;
  repositoryId: string;
  stepCompleted: number;
  status: string;
  // Repo context
  repoFullName: string;
  repoName: string;
  defaultBranch: string;
  htmlUrl: string;
  isPrivate: boolean;
  primaryLanguage: string;
  framework: string;
  repoDescription: string;
  statusMetadataFetched: boolean;
  statusTreeAnalyzed: boolean;
  statusAiAnalyzed: boolean;
  // Step 1
  toolName: string;
  slug: string;
  tagline: string;
  // Step 3
  description: string;
  problemStatement: string;
  targetAudience: string;
  useCases: string[];
  features: string[];
  businessDomain: string;
  aiConfidenceScore: number;
  // Step 4
  techStack: string[];
  capabilities: string[];
  // Step 5
  primaryCategorySlug: string;
  tags: string[];
  pricingType: string;
  license: string;
  isOpenSource: boolean;
  // Step 6
  githubUrl: string;
  websiteUrl: string;
  logoUrl: string;
  coverUrl: string;
  documentationUrl: string;
  discordUrl: string;
  // Published
  publishedToolSlug: string;
}

const API = 'http://localhost:8080/api/v1';

const STEPS = [
  { id: 1, label: 'Overview',      icon: 'git-branch' },
  { id: 2, label: 'Analysis',      icon: 'cpu' },
  { id: 3, label: 'AI Info',       icon: 'sparkles' },
  { id: 4, label: 'Tech Stack',    icon: 'layers' },
  { id: 5, label: 'Categories',    icon: 'tag' },
  { id: 6, label: 'Branding',      icon: 'image' },
  { id: 7, label: 'Preview',       icon: 'eye' },
];

@Component({
  selector: 'app-publish-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="pw-root">
      <!-- Left Sidebar Stepper -->
      <aside class="pw-sidebar">
        <div class="pw-sidebar-top">
          <a routerLink="/workspace/projects" class="pw-back-link">
            <app-icon name="arrow-left" class="pw-back-icon" />
            <span>Projects</span>
          </a>
          <div class="pw-sidebar-title">Publish Tool</div>
          <div class="pw-sidebar-subtitle">{{ draft()?.repoFullName || 'Loading…' }}</div>
        </div>

        <nav class="pw-steps">
          @for (step of steps; track step.id) {
            <button class="pw-step"
              [class.active]="currentStep() === step.id"
              [class.done]="(draft()?.stepCompleted ?? 0) >= step.id && currentStep() !== step.id"
              [class.locked]="step.id > (draft()?.stepCompleted ?? 0) + 1 && currentStep() !== step.id"
              (click)="goToStep(step.id)">
              <div class="pw-step-indicator">
                @if ((draft()?.stepCompleted ?? 0) >= step.id && currentStep() !== step.id) {
                  <app-icon name="check" class="pw-step-check" />
                } @else {
                  <span class="pw-step-num">{{ step.id }}</span>
                }
              </div>
              <span class="pw-step-label">{{ step.label }}</span>
            </button>
          }
        </nav>

        <div class="pw-sidebar-footer">
          @if (saved()) {
            <div class="pw-saved-badge">
              <app-icon name="check-circle" class="pw-saved-icon" />
              <span>Saved</span>
            </div>
          }
        </div>
      </aside>

      <!-- Main Content Panel -->
      <main class="pw-main">
        @if (loading()) {
          <div class="pw-loading">
            <div class="pw-spinner-lg"></div>
            <p>Preparing wizard…</p>
          </div>
        } @else if (published()) {
          <!-- ──────────────── SUCCESS ──────────────── -->
          <div class="pw-success">
            <div class="pw-success-icon-wrap">
              <app-icon name="check-circle" class="pw-success-icon" />
            </div>
            <h1 class="pw-success-title">Tool Published! 🎉</h1>
            <p class="pw-success-subtitle">
              Your tool is now live and discoverable on Acklet.
            </p>
            <div class="pw-success-actions">
              <a [href]="'/tools/' + (draft()?.publishedToolSlug ?? '')"
                 class="pw-btn pw-btn-primary">
                <app-icon name="external-link" class="pw-btn-icon" />
                View Tool
              </a>
              <a routerLink="/workspace/tools" class="pw-btn pw-btn-outline">
                My Tools
              </a>
            </div>
          </div>
        } @else {

          <!-- Step Header -->
          <div class="pw-content-header">
            <div class="pw-step-badge">Step {{ currentStep() }} of {{ steps.length }}</div>
            <h1 class="pw-content-title">{{ stepTitle() }}</h1>
            <p class="pw-content-subtitle">{{ stepSubtitle() }}</p>
          </div>

          <!-- ──────────────── STEP 1: OVERVIEW ──────────────── -->
          @if (currentStep() === 1 && draft()) {
            <div class="pw-card-grid">
              <!-- Repo card -->
              <div class="pw-card">
                <div class="pw-card-label">Repository</div>
                <div class="pw-repo-row">
                  <app-icon name="github" class="pw-repo-icon" />
                  <div>
                    <div class="pw-repo-name">{{ draft()!.repoFullName }}</div>
                    <div class="pw-repo-meta">
                      <span class="pw-pill">{{ draft()!.defaultBranch }}</span>
                      @if (draft()!.isPrivate) { <span class="pw-pill pw-pill-warning">Private</span> }
                      @else { <span class="pw-pill pw-pill-ok">Public</span> }
                      @if (draft()!.primaryLanguage) {
                        <span class="pw-pill">{{ draft()!.primaryLanguage }}</span>
                      }
                      @if (draft()!.framework && draft()!.framework !== 'Unknown') {
                        <span class="pw-pill">{{ draft()!.framework }}</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tool Name -->
              <div class="pw-card">
                <div class="pw-card-label">Tool Name <span class="pw-required">*</span></div>
                <input class="pw-input" [(ngModel)]="form.toolName"
                  placeholder="e.g. My Awesome Tool"
                  (ngModelChange)="onFieldChange()" />
                <div class="pw-field-hint">The public display name of your tool on Acklet.</div>
              </div>

              <!-- Slug -->
              <div class="pw-card">
                <div class="pw-card-label">URL Slug <span class="pw-required">*</span></div>
                <div class="pw-input-prefix-wrap">
                  <span class="pw-input-prefix">{{ toolsBaseUrl }}</span>
                  <input class="pw-input pw-input-slug" [(ngModel)]="form.slug"
                    placeholder="my-awesome-tool"
                    (ngModelChange)="onSlugChange()" />
                </div>
                @if (slugValidationMessage) {
                  <div [style.color]="slugIsValid ? '#10b981' : '#f87171'" style="font-size: 11px; margin-top: 6px; font-weight: 500;">
                    {{ slugValidationMessage }}
                  </div>
                }
              </div>

              <!-- Tagline -->
              <div class="pw-card">
                <div class="pw-card-label">One-line Description</div>
                <input class="pw-input" [(ngModel)]="form.tagline"
                  placeholder="What does this tool do in one sentence?"
                  (ngModelChange)="onFieldChange()" />
                <div class="pw-char-count">{{ (form.tagline || '').length }} / 300</div>
              </div>
            </div>
          }

          <!-- ──────────────── STEP 2: ANALYSIS ──────────────── -->
          @if (currentStep() === 2 && draft()) {
            <div class="pw-analysis-wrap">
              <div class="pw-analysis-head">
                <app-icon name="cpu" class="pw-analysis-hero-icon" />
                <div>
                  <div class="pw-analysis-hero-title">Repository Analysis</div>
                  <div class="pw-analysis-hero-sub">
                    We're extracting intelligence from your repository. This runs in the background — you can continue to the next step anytime.
                  </div>
                </div>
              </div>

              <div class="pw-analysis-stages">
                @for (stage of analysisStages(); track stage.id) {
                  <div class="pw-stage" [class]="'pw-stage-' + stage.status">
                    <div class="pw-stage-indicator">
                      @if (stage.status === 'done') {
                        <app-icon name="check" class="pw-stage-icon" />
                      } @else if (stage.status === 'running') {
                        <div class="pw-spinner-sm"></div>
                      } @else if (stage.status === 'failed') {
                        <app-icon name="x" class="pw-stage-icon" />
                      } @else {
                        <div class="pw-stage-dot"></div>
                      }
                    </div>
                    <div class="pw-stage-content">
                      <div class="pw-stage-label">{{ stage.label }}</div>
                      <div class="pw-stage-status-text">{{ stageStatusText(stage.status) }}</div>
                    </div>
                  </div>
                }
              </div>

              @if (draft()!.statusAiAnalyzed) {
                <div class="pw-analysis-ready">
                  <app-icon name="sparkles" class="pw-analysis-ready-icon" />
                  <span>AI analysis complete — your tool info has been pre-filled!</span>
                </div>
              }
            </div>
          }

          <!-- ──────────────── STEP 3: AI INFO ──────────────── -->
          @if (currentStep() === 3 && draft()) {
            <div class="pw-card-stack">
              @if (draft()!.aiConfidenceScore > 0) {
                <div class="pw-ai-badge">
                  <app-icon name="sparkles" class="pw-ai-badge-icon" />
                  <span>AI-generated · {{ (draft()!.aiConfidenceScore * 100).toFixed(0) }}% confidence — edit anything</span>
                </div>
              }

              <div class="pw-card">
                <div class="pw-card-label">Full Description & Embed Docs (Markdown, In-text Video embeds) <span class="pw-required">*</span></div>
                <textarea class="pw-textarea" rows="5" [(ngModel)]="form.description"
                  placeholder="Detailed description of what this tool does. Support markdown headers, lists, and HTML video iframe links to display directly on Acklet."
                  (ngModelChange)="onFieldChange()"></textarea>
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Problem Statement</div>
                <textarea class="pw-textarea" rows="3" [(ngModel)]="form.problemStatement"
                  placeholder="What problem does this tool solve?"
                  (ngModelChange)="onFieldChange()"></textarea>
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Target Audience</div>
                <input class="pw-input" [(ngModel)]="form.targetAudience"
                  placeholder="e.g. Backend developers working with Spring Boot"
                  (ngModelChange)="onFieldChange()" />
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Key Use Cases</div>
                <div class="pw-tag-list">
                  @for (uc of form.useCases; track $index) {
                    <div class="pw-tag-chip pw-tag-chip-editable">
                      <input class="pw-tag-chip-input" [(ngModel)]="form.useCases![$index]"
                        (ngModelChange)="onFieldChange()" />
                      <button class="pw-tag-chip-del" (click)="removeUseCase($index)">
                        <app-icon name="x" />
                      </button>
                    </div>
                  }
                  <button class="pw-add-chip-btn" (click)="addUseCase()">
                    <app-icon name="plus" /> Add use case
                  </button>
                </div>
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Key Features</div>
                <div class="pw-tag-list">
                  @for (f of form.features; track $index) {
                    <div class="pw-tag-chip pw-tag-chip-editable">
                      <input class="pw-tag-chip-input" [(ngModel)]="form.features![$index]"
                        (ngModelChange)="onFieldChange()" />
                      <button class="pw-tag-chip-del" (click)="removeFeature($index)">
                        <app-icon name="x" />
                      </button>
                    </div>
                  }
                  <button class="pw-add-chip-btn" (click)="addFeature()">
                    <app-icon name="plus" /> Add feature
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- ──────────────── STEP 4: TECH STACK ──────────────── -->
          @if (currentStep() === 4 && draft()) {
            <div class="pw-card-stack">
              <div class="pw-card">
                <div class="pw-card-label">Technology Stack</div>
                <div class="pw-card-hint">Detected technologies from your repository. Remove incorrect ones or add missing technologies.</div>
                <div class="pw-tech-grid">
                  @for (tech of form.techStack; track $index) {
                    <div class="pw-tech-chip">
                      <span class="pw-tech-dot"></span>
                      <span>{{ tech }}</span>
                      <button class="pw-tech-del" (click)="removeTech($index)">
                        <app-icon name="x" />
                      </button>
                    </div>
                  }
                </div>
                <div class="pw-add-tech-row">
                  <input class="pw-input pw-input-sm" [(ngModel)]="newTech"
                    placeholder="Add technology…"
                    (keydown.enter)="addTech()" />
                  <button class="pw-btn pw-btn-sm pw-btn-outline" (click)="addTech()">Add</button>
                </div>
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Capabilities</div>
                <div class="pw-card-hint">What this tool actually does — becomes searchable in Acklet.</div>
                <div class="pw-tech-grid">
                  @for (cap of form.capabilities; track $index) {
                    <div class="pw-tech-chip pw-cap-chip">
                      <app-icon name="zap" class="pw-cap-icon" />
                      <span>{{ cap }}</span>
                      <button class="pw-tech-del" (click)="removeCap($index)">
                        <app-icon name="x" />
                      </button>
                    </div>
                  }
                </div>
                <div class="pw-add-tech-row">
                  <input class="pw-input pw-input-sm" [(ngModel)]="newCap"
                    placeholder="Add capability…"
                    (keydown.enter)="addCap()" />
                  <button class="pw-btn pw-btn-sm pw-btn-outline" (click)="addCap()">Add</button>
                </div>
              </div>
            </div>
          }

          <!-- ──────────────── STEP 5: CATEGORIES ──────────────── -->
          @if (currentStep() === 5 && draft()) {
            <div class="pw-card-stack">


              <div class="pw-card">
                <div class="pw-card-label">Search Tags</div>
                <div class="pw-card-hint">Tags make your tool discoverable. AI-generated — edit freely.</div>
                <div class="pw-tag-list">
                  @for (tag of form.tags; track $index) {
                    <div class="pw-tag-pill">
                      <span>#{{ tag }}</span>
                      <button class="pw-tag-del" (click)="removeTag($index)">
                        <app-icon name="x" />
                      </button>
                    </div>
                  }
                  <div class="pw-tag-add-row">
                    <input class="pw-input pw-input-sm" [(ngModel)]="newTag"
                      placeholder="Add tag…"
                      (keydown.enter)="addTag()" />
                    <button class="pw-btn pw-btn-sm pw-btn-outline" (click)="addTag()">Add</button>
                  </div>
                </div>
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Open Source</div>
                <label class="pw-toggle-row">
                  <input type="checkbox" class="pw-toggle-input"
                    [(ngModel)]="form.isOpenSource"
                    (ngModelChange)="onFieldChange()" />
                  <div class="pw-toggle-track">
                    <div class="pw-toggle-thumb"></div>
                  </div>
                  <span>This repository is open source</span>
                </label>
              </div>
            </div>
          }

          <!-- ──────────────── STEP 6: BRANDING ──────────────── -->
          @if (currentStep() === 6 && draft()) {
            <div class="pw-card-stack">
              <div class="pw-card">
                <div class="pw-card-label">Logo Upload <span class="pw-required">*</span></div>
                <div class="logo-upload-zone" style="border: 2px dashed var(--vercel-border); border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; position: relative;" (click)="logoInput.click()">
                  <input type="file" #logoInput style="display: none;" (change)="onLogoFileSelected($event)" accept="image/png, image/jpeg" />
                  <app-icon name="image" style="width: 32px; height: 32px; color: var(--vercel-text-muted); margin-bottom: 8px;" />
                  <p style="font-size: 13px; margin: 0; color: var(--vercel-text-secondary);">Drag & drop or click to upload PNG/JPG logo (Max 2MB)</p>
                </div>
                
                @if (logoPreviewUrl) {
                  <div class="crop-focus-container" style="margin-top: 16px; border: 1px solid var(--vercel-border); border-radius: 8px; overflow: hidden; position: relative;">
                    <div style="font-size: 11px; font-weight: 600; padding: 6px 12px; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: space-between;">
                      <span>Logo Crop & Focal Position</span>
                      <span style="color: var(--vercel-text-muted);">Drag pointer to focus key logo elements</span>
                    </div>
                    <div class="crop-preview-box" style="height: 180px; position: relative; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                      <img [src]="logoPreviewUrl" [style.transform]="'scale(' + cropZoom + ') translate(' + cropX + 'px, ' + cropY + 'px)'" style="max-height: 100%; max-width: 100%; pointer-events: none;" alt="cropper preview" />
                      <div class="crop-focal-marker" style="position: absolute; width: 36px; height: 36px; border: 2px solid #6366f1; border-radius: 50%; cursor: move; box-shadow: 0 0 10px rgba(99,102,241,0.5);"></div>
                    </div>
                    <div class="crop-controls" style="padding: 10px; display: flex; gap: 12px; align-items: center;">
                      <label style="font-size: 12px; color: var(--vercel-text-muted);">Zoom:</label>
                      <input type="range" min="1" max="3" step="0.1" [(ngModel)]="cropZoom" style="flex: 1;" />
                    </div>
                  </div>
                }
              </div>

              <div class="pw-card">
                <div class="pw-card-label">Documentation URL</div>
                <input class="pw-input" [(ngModel)]="form.documentationUrl"
                  placeholder="https://docs.yourproject.com"
                  (ngModelChange)="onFieldChange()" />
              </div>
            </div>
          }

          <!-- ──────────────── STEP 7: PREVIEW ──────────────── -->
          @if (currentStep() === 7 && draft()) {
            <div class="pw-preview-root">
              <div class="pw-preview-notice">
                <app-icon name="eye" class="pw-preview-notice-icon" />
                <span>This is how your tool page will look to users on Acklet.</span>
              </div>

              <!-- Tool Page Preview -->
              <div class="pw-tool-preview-card">
                <div class="pw-tp-header">
                  @if (form.logoUrl) {
                    <img [src]="form.logoUrl" class="pw-tp-logo" alt="logo" />
                  } @else {
                    <div class="pw-tp-logo-placeholder">
                      {{ (form.toolName || '?')[0].toUpperCase() }}
                    </div>
                  }
                  <div class="pw-tp-identity">
                    <h2 class="pw-tp-name">{{ form.toolName || draft()!.repoName }}</h2>
                    <p class="pw-tp-tagline">{{ form.tagline }}</p>
                    <div class="pw-tp-meta-row">
                      <span class="pw-pill">{{ form.pricingType || 'FREE' }}</span>
                      @if (form.isOpenSource) { <span class="pw-pill pw-pill-ok">Open Source</span> }
                      @if (form.license) { <span class="pw-pill">{{ form.license }}</span> }
                    </div>
                  </div>
                  <div class="pw-tp-links">
                    @if (form.githubUrl) {
                      <a [href]="form.githubUrl" target="_blank" class="pw-tp-link-btn">
                        <app-icon name="github" /> GitHub
                      </a>
                    }
                    @if (form.websiteUrl) {
                      <a [href]="form.websiteUrl" target="_blank" class="pw-tp-link-btn">
                        <app-icon name="globe" /> Website
                      </a>
                    }
                  </div>
                </div>

                <div class="pw-tp-body">
                  <div class="pw-tp-section">
                    <div class="pw-tp-section-title">Description</div>
                    <p class="pw-tp-desc">{{ form.description || 'No description provided.' }}</p>
                  </div>

                  @if (form.techStack?.length) {
                    <div class="pw-tp-section">
                      <div class="pw-tp-section-title">Technology Stack</div>
                      <div class="pw-tech-grid">
                        @for (t of form.techStack; track t) {
                          <div class="pw-tech-chip"><span class="pw-tech-dot"></span>{{ t }}</div>
                        }
                      </div>
                    </div>
                  }

                  @if (form.capabilities?.length) {
                    <div class="pw-tp-section">
                      <div class="pw-tp-section-title">Capabilities</div>
                      <div class="pw-tech-grid">
                        @for (c of form.capabilities; track c) {
                          <div class="pw-tech-chip pw-cap-chip">
                            <app-icon name="zap" class="pw-cap-icon" />{{ c }}
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (form.tags?.length) {
                    <div class="pw-tp-section">
                      <div class="pw-tp-section-title">Tags</div>
                      <div class="pw-tag-list">
                        @for (tag of form.tags; track tag) {
                          <div class="pw-tag-pill">#{{ tag }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Publish CTA -->
              <div class="pw-publish-cta">
                <button class="pw-btn pw-btn-publish"
                  [disabled]="publishing() || !form.toolName || !form.slug"
                  (click)="publish()">
                  @if (publishing()) {
                    <div class="pw-spinner-sm light"></div>
                    <span>Publishing…</span>
                  } @else {
                    <app-icon name="rocket" class="pw-btn-icon" />
                    <span>Publish Tool to Acklet</span>
                  }
                </button>
                @if (!form.toolName || !form.slug) {
                  <div class="pw-publish-error">Please set a Tool Name and Slug before publishing.</div>
                }
                @if (publishError()) {
                  <div class="pw-publish-error">{{ publishError() }}</div>
                }
              </div>
            </div>
          }

          <!-- Step Navigation -->
          <div class="pw-nav">
            @if (currentStep() > 1) {
              <button class="pw-btn pw-btn-outline" (click)="prevStep()">
                <app-icon name="arrow-left" class="pw-btn-icon" /> Back
              </button>
            } @else {
              <div></div>
            }
            @if (currentStep() < steps.length) {
              <button class="pw-btn pw-btn-primary" (click)="nextStep()">
                Continue <app-icon name="arrow-right" class="pw-btn-icon" />
              </button>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .pw-root {
      display: flex;
      min-height: 100vh;
      background: var(--vercel-bg);
      font-family: var(--font-sans, 'Inter', sans-serif);
    }

    /* ── Sidebar ─────────────────────────────────────────────────────── */
    .pw-sidebar {
      width: 240px;
      min-height: 100vh;
      background: var(--vercel-card-bg);
      border-right: 1px solid var(--vercel-border);
      display: flex;
      flex-direction: column;
      padding: 24px 0;
      flex-shrink: 0;
      position: sticky;
      top: 0;
    }

    .pw-sidebar-top {
      padding: 0 20px 24px;
      border-bottom: 1px solid var(--vercel-border);
      margin-bottom: 16px;
    }

    .pw-back-link {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--vercel-text-muted);
      text-decoration: none;
      margin-bottom: 16px;
      transition: color 0.15s;
    }
    .pw-back-link:hover { color: var(--vercel-text-primary); }
    .pw-back-icon { width: 12px; height: 12px; }

    .pw-sidebar-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.01em;
    }
    .pw-sidebar-subtitle {
      font-size: 11px;
      color: var(--vercel-text-muted);
      font-family: var(--font-mono, monospace);
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pw-steps { display: flex; flex-direction: column; gap: 2px; padding: 0 12px; flex: 1; }

    .pw-step {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;
      width: 100%;
    }
    .pw-step:hover { background: var(--vercel-hover-bg); }
    .pw-step.active { background: var(--vercel-hover-bg); }
    .pw-step.locked { opacity: 0.45; cursor: default; }

    .pw-step-indicator {
      width: 24px; height: 24px;
      border-radius: 50%;
      border: 1.5px solid var(--vercel-border);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      color: var(--vercel-text-muted);
      background: var(--vercel-bg);
      transition: all 0.2s;
    }
    .pw-step.active .pw-step-indicator {
      border-color: #fff;
      background: #fff;
      color: #000;
    }
    .pw-step.done .pw-step-indicator {
      border-color: #10b981;
      background: #10b98120;
      color: #10b981;
    }
    .pw-step-check { width: 12px; height: 12px; }
    .pw-step-num { line-height: 1; }
    .pw-step-label { font-size: 13px; color: var(--vercel-text-secondary); font-weight: 500; }
    .pw-step.active .pw-step-label { color: var(--vercel-text-primary); font-weight: 600; }
    .pw-step.done .pw-step-label { color: var(--vercel-text-secondary); }

    .pw-sidebar-footer { padding: 16px 20px 0; margin-top: auto; }
    .pw-saved-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 20px;
      background: #10b98120; color: #10b981;
      font-size: 11px; font-weight: 500;
    }
    .pw-saved-icon { width: 12px; height: 12px; }

    /* ── Main ────────────────────────────────────────────────────────── */
    .pw-main {
      flex: 1;
      padding: 48px 56px;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .pw-loading {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      flex: 1; gap: 16px;
      color: var(--vercel-text-muted); font-size: 14px;
    }

    /* ── Content Header ──────────────────────────────────────────────── */
    .pw-content-header { margin-bottom: 8px; }
    .pw-step-badge {
      display: inline-block;
      font-size: 11px; font-weight: 600;
      color: var(--vercel-text-muted);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .pw-content-title {
      font-size: 24px; font-weight: 700;
      color: var(--vercel-text-primary);
      letter-spacing: -0.03em;
      margin: 0 0 8px;
    }
    .pw-content-subtitle {
      font-size: 14px; color: var(--vercel-text-muted);
      margin: 0;
    }

    /* ── Cards ───────────────────────────────────────────────────────── */
    .pw-card-grid { display: grid; gap: 16px; }
    .pw-card-stack { display: flex; flex-direction: column; gap: 16px; }

    .pw-card {
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 10px;
      padding: 20px;
    }
    .pw-card-label {
      font-size: 12px; font-weight: 600;
      color: var(--vercel-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    .pw-card-hint { font-size: 12px; color: var(--vercel-text-muted); margin-bottom: 12px; }

    /* ── Form elements ───────────────────────────────────────────────── */
    .pw-input, .pw-select, .pw-textarea {
      width: 100%;
      padding: 9px 12px;
      border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-input-bg, var(--vercel-subtle-bg));
      color: var(--vercel-text-primary);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .pw-input:focus, .pw-select:focus, .pw-textarea:focus {
      border-color: var(--vercel-text-muted);
    }
    .pw-textarea { resize: vertical; font-family: inherit; }
    .pw-input-sm { width: auto; flex: 1; min-width: 0; }
    .pw-input-prefix-wrap {
      display: flex; align-items: center;
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      overflow: hidden;
      background: var(--vercel-subtle-bg);
    }
    .pw-input-prefix {
      padding: 9px 10px;
      font-size: 12px;
      color: var(--vercel-text-muted);
      background: var(--vercel-subtle-bg);
      border-right: 1px solid var(--vercel-border);
      white-space: nowrap;
      font-family: var(--font-mono, monospace);
    }
    .pw-input-slug { border: none; border-radius: 0; background: transparent; }
    .pw-field-hint { font-size: 11px; color: var(--vercel-text-muted); margin-top: 6px; }
    .pw-char-count { font-size: 11px; color: var(--vercel-text-muted); text-align: right; margin-top: 4px; }
    .pw-required { color: #f87171; }
    .pw-optional { color: var(--vercel-text-muted); font-weight: 400; }

    /* ── Buttons ─────────────────────────────────────────────────────── */
    .pw-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border-radius: 6px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; outline: none;
      transition: all 0.15s; text-decoration: none;
    }
    .pw-btn-primary { background: #fff; color: #000; }
    .pw-btn-primary:hover { background: #e5e5e5; }
    .pw-btn-outline {
      background: transparent;
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-primary);
    }
    .pw-btn-outline:hover { background: var(--vercel-hover-bg); }
    .pw-btn-sm { padding: 6px 12px; font-size: 12px; }
    .pw-btn-icon { width: 14px; height: 14px; }
    .pw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .pw-btn-publish {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff;
      padding: 14px 32px;
      font-size: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 20px #6366f130;
    }
    .pw-btn-publish:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      box-shadow: 0 6px 28px #6366f150;
      transform: translateY(-1px);
    }

    /* ── Repo Row ────────────────────────────────────────────────────── */
    .pw-repo-row {
      display: flex; align-items: center; gap: 14px;
    }
    .pw-repo-icon { width: 24px; height: 24px; color: var(--vercel-text-secondary); }
    .pw-repo-name { font-size: 14px; font-weight: 600; color: var(--vercel-text-primary); font-family: var(--font-mono, monospace); }
    .pw-repo-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }

    /* ── Pills ───────────────────────────────────────────────────────── */
    .pw-pill {
      padding: 2px 8px; border-radius: 20px;
      font-size: 11px; font-weight: 500;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      color: var(--vercel-text-secondary);
    }
    .pw-pill-ok { background: #10b98120; border-color: #10b98140; color: #10b981; }
    .pw-pill-warning { background: #f5980020; border-color: #f5980040; color: #f59800; }

    /* ── Analysis ────────────────────────────────────────────────────── */
    .pw-analysis-wrap { display: flex; flex-direction: column; gap: 24px; }
    .pw-analysis-head {
      display: flex; align-items: flex-start; gap: 20px;
      padding: 24px;
      background: var(--vercel-card-bg);
      border: 1px solid var(--vercel-border);
      border-radius: 12px;
    }
    .pw-analysis-hero-icon { width: 40px; height: 40px; color: #6366f1; flex-shrink: 0; }
    .pw-analysis-hero-title { font-size: 16px; font-weight: 700; color: var(--vercel-text-primary); margin-bottom: 6px; }
    .pw-analysis-hero-sub { font-size: 13px; color: var(--vercel-text-muted); line-height: 1.6; }

    .pw-analysis-stages { display: flex; flex-direction: column; gap: 0; }

    .pw-stage {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 20px;
      border: 1px solid var(--vercel-border);
      margin-bottom: -1px;
      background: var(--vercel-card-bg);
      transition: background 0.2s;
    }
    .pw-stage:first-child { border-radius: 10px 10px 0 0; }
    .pw-stage:last-child { border-radius: 0 0 10px 10px; }
    .pw-stage-done { background: #10b98108; }
    .pw-stage-running { background: #6366f108; }
    .pw-stage-failed { background: #f8717108; }

    .pw-stage-indicator {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .pw-stage-icon { width: 16px; height: 16px; }
    .pw-stage-done .pw-stage-icon { color: #10b981; }
    .pw-stage-failed .pw-stage-icon { color: #f87171; }
    .pw-stage-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--vercel-border);
    }
    .pw-stage-content { flex: 1; }
    .pw-stage-label { font-size: 13px; font-weight: 500; color: var(--vercel-text-primary); }
    .pw-stage-status-text { font-size: 11px; color: var(--vercel-text-muted); margin-top: 2px; }
    .pw-stage-done .pw-stage-status-text { color: #10b981; }
    .pw-stage-running .pw-stage-status-text { color: #6366f1; }
    .pw-stage-failed .pw-stage-status-text { color: #f87171; }

    .pw-analysis-ready {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px;
      background: #10b98112;
      border: 1px solid #10b98130;
      border-radius: 8px;
      font-size: 13px;
      color: #10b981;
      font-weight: 500;
    }
    .pw-analysis-ready-icon { width: 18px; height: 18px; }

    /* ── AI badge ────────────────────────────────────────────────────── */
    .pw-ai-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 8px;
      background: #6366f112; border: 1px solid #6366f130;
      color: #818cf8; font-size: 12px; font-weight: 500;
    }
    .pw-ai-badge-icon { width: 14px; height: 14px; }

    /* ── Tag chips (editable) ─────────────────────────────────────────── */
    .pw-tag-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .pw-tag-chip-editable {
      display: flex; align-items: center;
      border: 1px solid var(--vercel-border);
      border-radius: 6px;
      overflow: hidden;
      background: var(--vercel-subtle-bg);
    }
    .pw-tag-chip-input {
      border: none; outline: none;
      background: transparent;
      padding: 6px 8px;
      font-size: 12px;
      color: var(--vercel-text-primary);
      min-width: 80px;
    }
    .pw-tag-chip-del {
      padding: 4px 6px; border: none; background: transparent;
      cursor: pointer; color: var(--vercel-text-muted);
      display: flex; align-items: center;
    }
    .pw-tag-chip-del app-icon { width: 10px; height: 10px; }
    .pw-add-chip-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 6px;
      border: 1px dashed var(--vercel-border);
      background: transparent; cursor: pointer;
      font-size: 12px; color: var(--vercel-text-muted);
      transition: all 0.15s;
    }
    .pw-add-chip-btn:hover { border-color: var(--vercel-text-muted); color: var(--vercel-text-secondary); }
    .pw-add-chip-btn app-icon { width: 12px; height: 12px; }

    /* ── Tech grid ───────────────────────────────────────────────────── */
    .pw-tech-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .pw-tech-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 20px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      font-size: 12px; color: var(--vercel-text-secondary);
    }
    .pw-cap-chip {
      border-color: #6366f140;
      background: #6366f110;
      color: #818cf8;
    }
    .pw-tech-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #6366f1; flex-shrink: 0;
    }
    .pw-cap-icon { width: 12px; height: 12px; }
    .pw-tech-del {
      border: none; background: transparent; cursor: pointer;
      padding: 0 0 0 4px; color: var(--vercel-text-muted);
      display: flex; align-items: center;
    }
    .pw-tech-del app-icon { width: 10px; height: 10px; }
    .pw-add-tech-row { display: flex; gap: 8px; align-items: center; }

    /* ── Pricing ─────────────────────────────────────────────────────── */
    .pw-pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .pw-pricing-card {
      padding: 14px 12px; border-radius: 8px;
      border: 1.5px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      cursor: pointer; text-align: center;
      transition: all 0.15s;
    }
    .pw-pricing-card:hover { border-color: var(--vercel-text-muted); }
    .pw-pricing-card.selected {
      border-color: #6366f1;
      background: #6366f112;
    }
    .pw-pricing-icon { width: 20px; height: 20px; margin: 0 auto 8px; display: block; color: #818cf8; }
    .pw-pricing-label { font-size: 12px; font-weight: 600; color: var(--vercel-text-primary); }
    .pw-pricing-desc { font-size: 10px; color: var(--vercel-text-muted); margin-top: 3px; }

    /* ── Tags ────────────────────────────────────────────────────────── */
    .pw-tag-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 20px;
      background: var(--vercel-subtle-bg);
      border: 1px solid var(--vercel-border);
      font-size: 12px; color: var(--vercel-text-secondary);
    }
    .pw-tag-del {
      border: none; background: transparent; cursor: pointer;
      padding: 0; color: var(--vercel-text-muted); display: flex;
    }
    .pw-tag-del app-icon { width: 10px; height: 10px; }
    .pw-tag-add-row { display: flex; gap: 8px; align-items: center; }

    /* ── Toggle ──────────────────────────────────────────────────────── */
    .pw-toggle-row { display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 13px; color: var(--vercel-text-secondary); }
    .pw-toggle-input { display: none; }
    .pw-toggle-track {
      width: 38px; height: 20px; border-radius: 10px;
      background: var(--vercel-border);
      position: relative; transition: background 0.2s;
    }
    .pw-toggle-input:checked ~ .pw-toggle-track { background: #10b981; }
    .pw-toggle-thumb {
      width: 16px; height: 16px; border-radius: 50%;
      background: #fff; position: absolute;
      top: 2px; left: 2px;
      transition: transform 0.2s;
    }
    .pw-toggle-input:checked ~ .pw-toggle-track .pw-toggle-thumb { transform: translateX(18px); }

    /* ── Branding ────────────────────────────────────────────────────── */
    .pw-logo-preview {
      margin-top: 12px; height: 48px; width: 48px;
      border-radius: 8px; object-fit: contain;
      border: 1px solid var(--vercel-border);
    }

    /* ── Preview ─────────────────────────────────────────────────────── */
    .pw-preview-root { display: flex; flex-direction: column; gap: 24px; }
    .pw-preview-notice {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px;
      background: #6366f112; border: 1px solid #6366f130;
      font-size: 13px; color: #818cf8;
    }
    .pw-preview-notice-icon { width: 16px; height: 16px; }

    .pw-tool-preview-card {
      border: 1px solid var(--vercel-border);
      border-radius: 12px;
      overflow: hidden;
      background: var(--vercel-card-bg);
    }
    .pw-tp-header {
      padding: 24px;
      border-bottom: 1px solid var(--vercel-border);
      display: flex; gap: 16px; align-items: flex-start;
    }
    .pw-tp-logo { width: 56px; height: 56px; border-radius: 10px; object-fit: contain; border: 1px solid var(--vercel-border); }
    .pw-tp-logo-placeholder {
      width: 56px; height: 56px; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; color: #fff;
      flex-shrink: 0;
    }
    .pw-tp-identity { flex: 1; min-width: 0; }
    .pw-tp-name { font-size: 20px; font-weight: 700; color: var(--vercel-text-primary); margin: 0 0 4px; }
    .pw-tp-tagline { font-size: 13px; color: var(--vercel-text-muted); margin: 0 0 10px; }
    .pw-tp-meta-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .pw-tp-links { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
    .pw-tp-link-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 6px;
      border: 1px solid var(--vercel-border);
      background: var(--vercel-subtle-bg);
      font-size: 12px; color: var(--vercel-text-secondary);
      text-decoration: none; transition: all 0.15s;
    }
    .pw-tp-link-btn:hover { border-color: var(--vercel-text-muted); }
    .pw-tp-link-btn app-icon { width: 13px; height: 13px; }
    .pw-tp-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .pw-tp-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vercel-text-muted); margin-bottom: 10px; }
    .pw-tp-desc { font-size: 13px; color: var(--vercel-text-secondary); line-height: 1.7; margin: 0; }

    .pw-publish-cta { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; }
    .pw-publish-error { font-size: 12px; color: #f87171; text-align: center; }

    /* ── Nav ─────────────────────────────────────────────────────────── */
    .pw-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: 24px;
      border-top: 1px solid var(--vercel-border);
      margin-top: 8px;
    }

    /* ── Spinners ────────────────────────────────────────────────────── */
    .pw-spinner-lg {
      width: 36px; height: 36px; border-radius: 50%;
      border: 3px solid var(--vercel-border);
      border-top-color: #6366f1;
      animation: spin 0.8s linear infinite;
    }
    .pw-spinner-sm {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(99,102,241,0.3);
      border-top-color: #6366f1;
      animation: spin 0.8s linear infinite;
    }
    .pw-spinner-sm.light {
      border-color: rgba(255,255,255,0.3);
      border-top-color: #fff;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Success ─────────────────────────────────────────────────────── */
    .pw-success {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; gap: 16px;
      padding: 48px;
    }
    .pw-success-icon-wrap {
      width: 72px; height: 72px; border-radius: 50%;
      background: #10b98120;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 8px;
    }
    .pw-success-icon { width: 36px; height: 36px; color: #10b981; }
    .pw-success-title { font-size: 28px; font-weight: 800; color: var(--vercel-text-primary); margin: 0; letter-spacing: -0.03em; }
    .pw-success-subtitle { font-size: 14px; color: var(--vercel-text-muted); margin: 0; }
    .pw-success-actions { display: flex; gap: 12px; }

    @media (max-width: 768px) {
      .pw-sidebar { width: 56px; }
      .pw-sidebar-top, .pw-step-label, .pw-sidebar-subtitle, .pw-sidebar-title { display: none; }
      .pw-main { padding: 24px 20px; }
      .pw-pricing-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class PublishWizardComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly toolsBaseUrl = TOOLS_BASE_URL.replace('http://', '').replace('https://', '') + '/';
  readonly steps = STEPS;
  readonly currentStep = signal(1);
  readonly draft = signal<DraftState | null>(null);
  readonly loading = signal(true);
  readonly saved = signal(false);
  readonly publishing = signal(false);
  readonly published = signal(false);
  readonly publishError = signal<string | null>(null);

  form: Partial<DraftState> = {};
  newTech = '';
  newCap = '';
  newTag = '';
  logoPreviewUrl: string | null = null;
  cropZoom = 1.0;
  cropX = 0;
  cropY = 0;

  onLogoFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreviewUrl = reader.result as string;
      this.form.logoUrl = this.logoPreviewUrl;
      this.onFieldChange();
    };
    reader.readAsDataURL(file);
  }

  slugValidationMessage: string | null = null;
  slugIsValid = false;
  private slugTimer: any = null;

  onSlugChange(): void {
    this.onFieldChange();
    clearTimeout(this.slugTimer);
    const slugVal = this.form.slug?.trim() || '';
    if (!slugVal) {
      this.slugValidationMessage = 'Slug cannot be empty';
      this.slugIsValid = false;
      return;
    }
    this.slugTimer = setTimeout(() => {
      this.http.get<any>(`${API}/tools/validate-slug?slug=${slugVal}`).subscribe({
        next: res => {
          if (res.data) {
            this.slugIsValid = res.data.valid;
            this.slugValidationMessage = res.data.reason;
          }
        },
        error: () => {
          this.slugValidationMessage = 'Failed to validate slug availability.';
          this.slugIsValid = false;
        }
      });
    }, 400);
  }

  private saveTimer: any = null;
  private eventSource: EventSource | null = null;



  readonly pricingOptions = [
    { value: 'FREE',       icon: 'gift',    label: 'Free',        desc: 'Always free' },
    { value: 'FREEMIUM',   icon: 'star',    label: 'Freemium',    desc: 'Free + paid tiers' },
    { value: 'PAID',       icon: 'credit-card', label: 'Paid',    desc: 'Paid access' },
    { value: 'OPEN_SOURCE',icon: 'code',    label: 'Open Source', desc: 'OSS licensed' },
  ];

  readonly analysisStages = computed<AnalysisStage[]>(() => {
    const d = this.draft();
    return [
      { id: 'metadata',   label: 'Repository Metadata',    status: d?.statusMetadataFetched ? 'done' : 'running' },
      { id: 'tree',       label: 'File Tree Analysis',      status: d?.statusTreeAnalyzed ? 'done' : (d?.statusMetadataFetched ? 'running' : 'pending') },
      { id: 'framework',  label: 'Framework Detection',     status: d?.statusTreeAnalyzed ? 'done' : 'pending' },
      { id: 'deps',       label: 'Dependency Detection',    status: d?.statusTreeAnalyzed ? 'done' : 'pending' },
      { id: 'ai',         label: 'AI Summary Generation',   status: d?.statusAiAnalyzed ? 'done' : (d?.statusTreeAnalyzed ? 'running' : 'pending') },
      { id: 'kg',         label: 'Knowledge Graph',         status: d?.statusAiAnalyzed ? 'done' : 'pending' },
      { id: 'embeddings', label: 'Search Embeddings',       status: d?.statusAiAnalyzed ? 'done' : 'pending' },
    ];
  });

  readonly stepTitle = computed(() => {
    const titles: Record<number, string> = {
      1: 'Repository Overview',
      2: 'Analysis Progress',
      3: 'AI Tool Information',
      4: 'Technology Stack & Capabilities',
      5: 'Categories, Tags & Pricing',
      6: 'Branding & Links',
      7: 'Preview & Publish',
    };
    return titles[this.currentStep()] ?? '';
  });

  readonly stepSubtitle = computed(() => {
    const subs: Record<number, string> = {
      1: 'Review your repository details and set the public tool name.',
      2: 'Live analysis stages — runs automatically in the background.',
      3: 'AI-generated details from your repository. Edit anything.',
      4: 'Detected technologies and capabilities. Add or remove as needed.',
      5: 'Set how your tool is categorized, priced, and tagged for search.',
      6: 'Optional branding assets and social links.',
      7: 'Final review before publishing your tool to Acklet.',
    };
    return subs[this.currentStep()] ?? '';
  });

  ngOnInit(): void {
    const repoId = this.route.snapshot.paramMap.get('repoId');
    if (!repoId) { this.router.navigate(['/workspace/projects']); return; }
    this.initDraft(repoId);
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
    clearTimeout(this.saveTimer);
  }

  private initDraft(repoId: string): void {
    this.http.post<any>(`${API}/publish/drafts?repositoryId=${repoId}`, {}).subscribe({
      next: res => {
        this.applyDraft(res.data);
        this.loading.set(false);
        this.subscribeToProgress(res.data.draftId);
      },
      error: () => this.loading.set(false)
    });
  }

  private applyDraft(data: DraftState): void {
    this.draft.set(data);
    this.form = { ...data };
    if (data.stepCompleted > 0) {
      this.currentStep.set(Math.min(data.stepCompleted + 1, this.steps.length));
    }
  }

  private subscribeToProgress(draftId: string): void {
    this.eventSource?.close();
    const token = localStorage.getItem('acklet_access_token') ?? '';
    // SSE with auth header isn't directly supported; use polling-fallback with short HTTP calls
    this.pollProgress(draftId);
  }

  private pollProgress(draftId: string): void {
    if (!draftId) return;
    this.http.get<any>(`${API}/publish/drafts/${draftId}`).subscribe({
      next: res => {
        const d = res.data;
        this.draft.update(prev => prev ? { ...prev,
          statusMetadataFetched: d.statusMetadataFetched,
          statusTreeAnalyzed: d.statusTreeAnalyzed,
          statusAiAnalyzed: d.statusAiAnalyzed
        } : prev);
        // Keep polling if not done
        if (!d.statusAiAnalyzed) {
          setTimeout(() => this.pollProgress(draftId), 5000);
        }
      }
    });
  }

  goToStep(n: number): void {
    const d = this.draft();
    if (!d) return;
    if (n <= (d.stepCompleted ?? 0) + 1) this.currentStep.set(n);
  }
  prevStep(): void { this.currentStep.update(s => Math.max(1, s - 1)); }
  nextStep(): void {
    this.saveStep();
    this.currentStep.update(s => Math.min(this.steps.length, s + 1));
  }

  onFieldChange(): void {
    clearTimeout(this.saveTimer);
    this.saved.set(false);
    this.saveTimer = setTimeout(() => this.saveStep(), 1200);
  }

  private saveStep(): void {
    const d = this.draft();
    if (!d) return;
    const step = this.currentStep();
    const patch: any = {
      stepCompleted: Math.max(d.stepCompleted, step),
      toolName: this.form.toolName,
      slug: this.form.slug,
      tagline: this.form.tagline,
      description: this.form.description,
      problemStatement: this.form.problemStatement,
      targetAudience: this.form.targetAudience,
      useCases: this.form.useCases,
      features: this.form.features,
      businessDomain: this.form.businessDomain,
      techStack: this.form.techStack,
      capabilities: this.form.capabilities,
      primaryCategorySlug: this.form.primaryCategorySlug,
      tags: this.form.tags,
      pricingType: this.form.pricingType,
      license: this.form.license,
      isOpenSource: this.form.isOpenSource,
      githubUrl: this.form.githubUrl,
      websiteUrl: this.form.websiteUrl,
      logoUrl: this.form.logoUrl,
      coverUrl: this.form.coverUrl,
      documentationUrl: this.form.documentationUrl,
      discordUrl: this.form.discordUrl,
    };
    this.http.patch<any>(`${API}/publish/drafts/${d.draftId}`, patch).subscribe({
      next: res => {
        this.draft.set(res.data);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      }
    });
  }

  publish(): void {
    const d = this.draft();
    if (!d) return;
    this.saveStep();
    this.publishing.set(true);
    this.publishError.set(null);
    setTimeout(() => {
      this.http.post<any>(`${API}/publish/drafts/${d.draftId}/publish`, {}).subscribe({
        next: res => {
          this.publishing.set(false);
          this.published.set(true);
          this.draft.update(prev => prev ? { ...prev, publishedToolSlug: res.data.slug, status: 'PUBLISHED' } : prev);
        },
        error: err => {
          this.publishing.set(false);
          this.publishError.set(err?.error?.message ?? 'Publish failed. Please try again.');
        }
      });
    }, 500);
  }

  // List helpers
  addUseCase()  { this.form.useCases = [...(this.form.useCases ?? []), '']; }
  removeUseCase(i: number) { this.form.useCases = this.form.useCases?.filter((_, idx) => idx !== i); this.onFieldChange(); }
  addFeature()  { this.form.features = [...(this.form.features ?? []), '']; }
  removeFeature(i: number) { this.form.features = this.form.features?.filter((_, idx) => idx !== i); this.onFieldChange(); }
  addTech()     { if (!this.newTech.trim()) return; this.form.techStack = [...(this.form.techStack ?? []), this.newTech.trim()]; this.newTech = ''; this.onFieldChange(); }
  removeTech(i: number) { this.form.techStack = this.form.techStack?.filter((_, idx) => idx !== i); this.onFieldChange(); }
  addCap()      { if (!this.newCap.trim()) return; this.form.capabilities = [...(this.form.capabilities ?? []), this.newCap.trim()]; this.newCap = ''; this.onFieldChange(); }
  removeCap(i: number) { this.form.capabilities = this.form.capabilities?.filter((_, idx) => idx !== i); this.onFieldChange(); }
  addTag()      { if (!this.newTag.trim()) return; this.form.tags = [...(this.form.tags ?? []), this.newTag.trim()]; this.newTag = ''; this.onFieldChange(); }
  removeTag(i: number) { this.form.tags = this.form.tags?.filter((_, idx) => idx !== i); this.onFieldChange(); }

  stageStatusText(s: string): string {
    const map: Record<string, string> = { pending: 'Pending', running: 'In progress…', done: 'Completed', failed: 'Failed' };
    return map[s] ?? s;
  }
}
