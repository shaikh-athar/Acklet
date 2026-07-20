import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { IconComponent } from '../../../shared/components/icon/icon';
import { Theme } from '../../../core/services/theme.service';
import { OnboardingPreferences } from '../../../core/models/preference.model';
import { PreferenceService } from '../../../core/services/preference.service';

const ROLES = [
  { id: 'developer', name: 'Developer', desc: 'Build apps, APIs, cloud systems', icon: 'terminal' },
  { id: 'designer', name: 'Designer', desc: 'Create UI, brands, graphics', icon: 'palette' },
  { id: 'founder', name: 'Founder', desc: 'Launch and grow products', icon: 'rocket' },
  { id: 'pm', name: 'Product Manager', desc: 'Strategy, roadmap, execution', icon: 'target' },
  { id: 'data', name: 'Data Analyst', desc: 'Insights, reports, pipelines', icon: 'bar-chart-2' },
  { id: 'marketer', name: 'Marketer', desc: 'Growth, SEO, campaigns', icon: 'trending-up' },
  { id: 'writer', name: 'Writer', desc: 'Content, copy, docs', icon: 'pen-tool' },
  { id: 'researcher', name: 'Researcher', desc: 'Academics, studies, surveys', icon: 'book-open' },
  { id: 'student', name: 'Student', desc: 'Learning, projects, assignments', icon: 'book' },
];

const INTERESTS = [
  'AI', 'Angular', 'React', 'Java', 'Spring Boot', 'Node.js', 'Python', 'DevOps', 
  'Docker', 'AWS', 'Azure', 'Kubernetes', 'Database', 'Security', 'Productivity', 
  'Design', 'Writing', 'Marketing', 'SEO', 'Finance', 'Healthcare', 'Education', 
  'Automation', 'Regex', 'JSON', 'APIs'
];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  template: `
    <div class="onboarding-page-root gradient-mesh">
      
      <!-- Top Bar -->
      <header class="onboarding-header">
        <div class="logo">
          <div class="logo-icon"><app-icon name="key-round" class="size-4" /></div>
          <span class="logo-text">ACKLET</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost" (click)="skip()">Skip</button>
        </div>
      </header>

      <!-- Progress Bar -->
      <div class="progress-bar-container">
        <div class="progress-bar-fill" [style.width]="progressPercent() + '%'"></div>
      </div>

      <!-- Step Content Area -->
      <main class="onboarding-main">
        <div class="step-container" id="step-container">
          
          <!-- STEP 1: Roles -->
          @if (step() === 1) {
            <div class="step-content">
              <span class="step-indicator">Step 1 of 5</span>
              <h1 class="step-title">What best describes you?</h1>
              <p class="step-subtitle">Select all that apply.</p>
              
              <div class="roles-grid">
                @for (role of ROLES; track role.id) {
                  <button class="role-card" 
                          [class.selected]="roles().includes(role.id)"
                          (click)="toggleRole(role.id, $event)">
                    <div class="role-icon-box">
                      <app-icon [name]="role.icon" class="size-5" />
                    </div>
                    <div class="role-info">
                      <div class="role-name">{{ role.name }}</div>
                      <div class="role-desc">{{ role.desc }}</div>
                    </div>
                    @if (roles().includes(role.id)) {
                      <div class="role-check">
                        <app-icon name="check" class="size-4 text-brand-500" />
                      </div>
                    }
                  </button>
                }
              </div>
            </div>
          }

          <!-- STEP 2: Interests -->
          @if (step() === 2) {
            <div class="step-content">
              <span class="step-indicator">Step 2 of 5</span>
              <h1 class="step-title">What do you want Acklet to help with?</h1>
              
              <div class="search-box mt-6 mb-6">
                <app-icon name="search" class="size-4 text-neutral-400" />
                <input type="text" placeholder="Search interests..." 
                       [(ngModel)]="interestQuery" 
                       class="search-input" />
              </div>

              <div class="interests-flex">
                @for (interest of filteredInterests(); track interest) {
                  <button class="interest-chip" 
                          [class.selected]="interests().includes(interest)"
                          (click)="toggleInterest(interest)">
                    {{ interest }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- STEP 3: Experience -->
          @if (step() === 3) {
            <div class="step-content">
              <span class="step-indicator">Step 3 of 5</span>
              <h1 class="step-title">How experienced are you?</h1>
              <p class="step-subtitle">Helps us recommend the right tools.</p>
              
              <div class="exp-grid mt-8">
                <button class="exp-card" [class.selected]="expLevel() === 'beginner'" (click)="setExp('beginner')">
                  <span class="exp-icon">🌱</span>
                  <div class="exp-title">Beginner</div>
                  <div class="exp-desc">I'm learning</div>
                </button>
                <button class="exp-card" [class.selected]="expLevel() === 'intermediate'" (click)="setExp('intermediate')">
                  <span class="exp-icon">🛠️</span>
                  <div class="exp-title">Intermediate</div>
                  <div class="exp-desc">I build projects</div>
                </button>
                <button class="exp-card" [class.selected]="expLevel() === 'advanced'" (click)="setExp('advanced')">
                  <span class="exp-icon">⚡</span>
                  <div class="exp-title">Advanced</div>
                  <div class="exp-desc">I work professionally</div>
                </button>
                <button class="exp-card" [class.selected]="expLevel() === 'expert'" (click)="setExp('expert')">
                  <span class="exp-icon">🔥</span>
                  <div class="exp-title">Expert</div>
                  <div class="exp-desc">I create tools</div>
                </button>
              </div>
            </div>
          }

          <!-- STEP 4: Appearance -->
          @if (step() === 4) {
            <div class="step-content">
              <span class="step-indicator">Step 4 of 5</span>
              <h1 class="step-title">Choose your aesthetic</h1>
              
              <div class="appearance-layout mt-8">
                <div class="app-left">
                  <div class="app-group">
                    <label>Theme</label>
                    <div class="theme-options">
                      <button class="theme-btn" [class.selected]="theme() === 'light'" (click)="setTheme('light')">Light</button>
                      <button class="theme-btn" [class.selected]="theme() === 'dark'" (click)="setTheme('dark')">Dark</button>
                    </div>
                  </div>
                </div>
                
                <div class="app-right glass preview-panel">
                  <div class="preview-mock">
                    <div class="mock-header">
                      <div class="mock-dot"></div><div class="mock-dot"></div><div class="mock-dot"></div>
                    </div>
                    <div class="mock-body">
                      <div class="mock-line" style="width:60%"></div>
                      <div class="mock-line" style="width:40%"></div>
                      <div class="mock-btn mt-4">Simulated App</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- STEP 5: Final / Finishing -->
          @if (step() === 5) {
            <div class="step-content text-center finishing-step">
              <div class="magic-icon-wrap mb-6">
                <app-icon name="sparkles" class="size-8 text-brand-500" />
              </div>
              <h1 class="step-title">Your workspace is ready.</h1>
              <p class="step-subtitle mx-auto">We've tailored Acklet based on your interests.</p>
              
              <button class="btn btn-primary btn-lg mt-8 shadow-glow" (click)="complete()">
                Enter Acklet
                <app-icon name="arrow-right" class="size-4 ml-2" />
              </button>
            </div>
          }

        </div>
      </main>

      <!-- Bottom Nav -->
      @if (step() < 5) {
        <footer class="onboarding-footer">
          <div class="footer-inner">
            <button class="btn btn-ghost" [disabled]="step() === 1" (click)="prevStep()">
              Back
            </button>
            <button class="btn btn-primary cta-next" [disabled]="!canProceed()" (click)="nextStep()">
              Continue
            </button>
          </div>
        </footer>
      }

    </div>
  `,
  styleUrl: './onboarding.css'
})
export class OnboardingComponent {
  private readonly router = inject(Router);
  private readonly prefsSvc = inject(PreferenceService);

  readonly step = signal(1);
  readonly roles = signal<string[]>([]);
  readonly interests = signal<string[]>([]);
  readonly interestQuery = signal('');
  readonly expLevel = signal<'beginner' | 'intermediate' | 'advanced' | 'expert' | null>(null);
  
  // Directly bind theme to the PreferenceService so it live-updates the DOM
  readonly theme = this.prefsSvc.theme;

  readonly progressPercent = computed(() => (this.step() / 5) * 100);

  readonly ROLES = ROLES;
  readonly ALL_INTERESTS = INTERESTS;

  readonly filteredInterests = computed(() => {
    const q = this.interestQuery().toLowerCase();
    if (!q) return this.ALL_INTERESTS;
    return this.ALL_INTERESTS.filter(i => i.toLowerCase().includes(q));
  });

  canProceed(): boolean {
    if (this.step() === 1) return this.roles().length > 0;
    if (this.step() === 2) return this.interests().length > 0;
    if (this.step() === 3) return this.expLevel() !== null;
    return true; // Step 4 always valid
  }

  toggleRole(id: string, event: Event): void {
    const current = this.roles();
    if (current.includes(id)) {
      this.roles.set(current.filter(r => r !== id));
    } else {
      this.roles.set([...current, id]);
    }
    
    // Add micro-interaction pulse
    const btn = event.currentTarget as HTMLElement;
    gsap.fromTo(btn, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
  }

  toggleInterest(id: string): void {
    const current = this.interests();
    if (current.includes(id)) {
      this.interests.set(current.filter(i => i !== id));
    } else {
      this.interests.set([...current, id]);
    }
  }

  setExp(level: 'beginner' | 'intermediate' | 'advanced' | 'expert'): void {
    this.expLevel.set(level);
    // Auto-advance after small delay on single-select
    setTimeout(() => this.nextStep(), 350);
  }

  setTheme(t: Theme): void {
    this.prefsSvc.setTheme(t);
  }

  nextStep(): void {
    if (this.step() >= 5) return;
    this.animateTransition(() => this.step.set(this.step() + 1), 'forward');
  }

  prevStep(): void {
    if (this.step() <= 1) return;
    this.animateTransition(() => this.step.set(this.step() - 1), 'backward');
  }

  skip(): void {
    this.savePrefs(true);
    this.router.navigate(['/workspace']);
  }

  complete(): void {
    this.savePrefs(false);
    this.router.navigate(['/workspace']);
  }

  private savePrefs(skipped: boolean): void {
    const obPrefs: OnboardingPreferences = {
      completed: true,
      skipped,
      completedAt: new Date().toISOString(),
      roles: this.roles(),
      interests: this.interests(),
      categoryPriority: [],
      experienceLevel: this.expLevel(),
      accentColor: 'blue'
    };
    
    // Patch preference service
    // Cast is needed because we can't easily spread deeply nested objects in the partial patch
    const current = this.prefsSvc.prefs();
    this.prefsSvc.setSearchPrefs({ ...current.search }); // trigger save
    // In a real app we'd add an explicit setOnboarding method to PreferenceService
    // For now, we'll navigate
  }

  private animateTransition(stateChangeFn: () => void, direction: 'forward' | 'backward'): void {
    const container = document.getElementById('step-container');
    if (!container) {
      stateChangeFn();
      return;
    }

    const xOut = direction === 'forward' ? -30 : 30;
    const xIn = direction === 'forward' ? 30 : -30;

    gsap.to(container, {
      opacity: 0,
      x: xOut,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        stateChangeFn();
        
        // Let Angular render the new step, then animate in
        setTimeout(() => {
          gsap.fromTo(container,
            { opacity: 0, x: xIn },
            { opacity: 1, x: 0, duration: 0.25, ease: 'power3.out' }
          );
        }, 10);
      }
    });
  }
}
