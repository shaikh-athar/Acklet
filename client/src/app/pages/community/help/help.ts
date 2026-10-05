// client/src/app/pages/community/help/help.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface HelpTopic {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-community-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-root page-enter">
      <!-- Hero -->
      <section class="help-hero gradient-mesh">
        <div class="orb orb-brand" style="width:500px;height:500px;top:-10%;right:10%"></div>
        <div class="container-main hero-inner">
          <span class="badge badge-brand mb-3">Acklet Support</span>
          <h1 class="hero-title">Help & Support</h1>
          <p class="hero-subtitle">Find answers to common questions about offline storage, security, and integrations.</p>
        </div>
      </section>

      <!-- Content -->
      <section class="section">
        <div class="container-main content-layout">
          <!-- Search FAQs -->
          <div class="faq-pane">
            <h2 class="pane-title mb-6">Frequently Asked Questions</h2>
            
            <div class="faq-stack">
              @for (faq of faqs(); track faq.question) {
                <div class="faq-card">
                  <h3 class="faq-q">{{ faq.question }}</h3>
                  <p class="faq-a">{{ faq.answer }}</p>
                </div>
              }
            </div>

            <!-- Custom Form / Ticket -->
            <div class="ticket-box glass-strong p-6 mt-10">
              <h3 class="ticket-title">Still need help?</h3>
              <p class="ticket-desc mb-4">Send a support request and our dev team will get back to you within 24 hours.</p>
              
              <form (submit)="onSubmit($event)" class="ticket-form">
                <div class="form-group mb-3">
                  <input type="text" class="input" placeholder="Subject" required />
                </div>
                <div class="form-group mb-4">
                  <textarea class="input text-area" placeholder="Describe your problem..." required></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Send Request</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .help-root { min-height: 100vh; background: var(--color-surface-950); }
    .help-hero { padding: 8rem 0 4rem; position: relative; }
    .hero-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .hero-title { font-size: 3rem; font-weight: 700; color: var(--color-neutral-100); }
    .hero-subtitle { font-size: 1rem; color: var(--color-neutral-400); max-width: 500px; margin-top: 0.5rem; }

    .content-layout { max-width: 750px; margin: 0 auto; }
    .pane-title { font-size: 1.25rem; font-weight: 700; color: var(--color-neutral-100); }
    
    .faq-stack { display: flex; flex-direction: column; gap: 1rem; }
    .faq-card { padding: 1.5rem; border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .faq-q { font-size: 0.95rem; font-weight: 700; color: var(--color-neutral-100); }
    .faq-a { font-size: 0.825rem; color: var(--color-neutral-400); margin-top: 0.25rem; line-height: 1.55; }
    
    .ticket-box { border-radius: var(--radius-xl); border: 1px solid var(--border-soft); }
    .ticket-title { font-size: 1.1rem; font-weight: 700; color: var(--color-neutral-100); }
    .ticket-desc { font-size: 0.85rem; color: var(--color-neutral-400); }
    
    .text-area { min-height: 100px; resize: vertical; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mt-10 { margin-top: 2.5rem; }
  `],
})
export class CommunityHelpComponent {
  readonly faqs = signal<HelpTopic[]>([
    { question: 'Is my input data safe inside Acklet?', answer: 'Yes. Acklet operates offline. All encoding, formatting, hashing, and signature decodes take place in your local browser sandbox. No server transmission logs are created.' },
    { question: 'How do I synchronize my settings across multiple machines?', answer: 'By creating a free account, you can enable workspace synchronization. This syncs your favorites, collection folders, settings preferences, and execution history.' },
    { question: 'Does Acklet support offline execution?', answer: 'Yes. You can use the PWA or browser cache workspace offline. All standard developer utilities continue functioning with no internet connection.' }
  ]);

  onSubmit(e: Event): void {
    e.preventDefault();
    alert('Support ticket submitted successfully. Our team will contact you soon.');
    (e.target as HTMLFormElement).reset();
  }
}
