// src/app/shared/components/dialog/dialog.ts
import { Component, inject, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      *ngIf="dialogSvc.activeDialog() as dialog" 
      class="dialog-overlay"
      (click)="$event.target === overlay && dialog.type === 'alert' && onCancel(dialog)"
      #overlay
    >
      <div 
        class="dialog-card" 
        (click)="$event.stopPropagation()"
        role="dialog"
        [attr.aria-label]="dialog.title || 'Dialog'"
        aria-modal="true"
      >
        <div class="dialog-header">
          <h3 class="dialog-title">{{ dialog.title || 'Alert' }}</h3>
          <button 
            type="button" 
            class="dialog-close-btn" 
            (click)="onCancel(dialog)"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        
        <div class="dialog-body">
          <p class="dialog-message" [innerHTML]="getSafeHtml(dialog.message)"></p>
          
          <div *ngIf="dialog.type === 'prompt'" class="dialog-input-wrapper">
            <input
              #promptInput
              type="text"
              class="dialog-input"
              [placeholder]="dialog.placeholder || ''"
              [(ngModel)]="promptValue"
              (keydown.enter)="onConfirm(dialog)"
              (keydown.escape)="onCancel(dialog)"
            />
          </div>
        </div>
        
        <div class="dialog-footer">
          <button 
            *ngIf="dialog.type !== 'alert'" 
            type="button" 
            class="dialog-btn dialog-btn-secondary" 
            (click)="onCancel(dialog)"
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            class="dialog-btn dialog-btn-primary" 
            (click)="onConfirm(dialog)"
            [disabled]="dialog.type === 'prompt' && dialog.expectedValue && promptValue !== dialog.expectedValue"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .dialog-card {
      width: 100%;
      max-width: 440px;
      background: var(--vercel-card-bg, #ffffff);
      border: 1px solid var(--vercel-border, #e5e5e5);
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--vercel-border, #e5e5e5);
    }

    .dialog-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--vercel-text-primary, #171717);
      margin: 0;
      line-height: 1.4;
    }

    .dialog-close-btn {
      background: transparent;
      border: none;
      font-size: 14px;
      color: var(--vercel-text-muted, #888888);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .dialog-close-btn:hover {
      background: var(--vercel-subtle-bg, #fafafa);
      color: var(--vercel-text-primary, #171717);
    }

    .dialog-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dialog-message {
      font-size: 14px;
      color: var(--vercel-text-secondary, #666666);
      margin: 0;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      user-select: text;
      -webkit-user-select: text;
    }

    .dialog-input-wrapper {
      margin-top: 8px;
    }

    .dialog-input {
      width: 100%;
      padding: 10px 14px;
      background: var(--vercel-subtle-bg, #fafafa);
      border: 1px solid var(--vercel-border, #e5e5e5);
      border-radius: 6px;
      color: var(--vercel-text-primary, #171717);
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .dialog-input:focus {
      border-color: var(--vercel-accent-violet, #0070f3);
      box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.15);
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      background: var(--vercel-subtle-bg, #fafafa);
      border-top: 1px solid var(--vercel-border, #e5e5e5);
    }

    .dialog-btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s, opacity 0.15s;
    }

    .dialog-btn-primary {
      background: var(--vercel-text-primary, #171717);
      color: var(--vercel-bg, #ffffff);
      border: none;
    }

    .dialog-btn-primary:hover:not(:disabled) {
      opacity: 0.9;
    }

    .dialog-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dialog-btn-secondary {
      background: transparent;
      color: var(--vercel-text-secondary, #666666);
      border: 1px solid var(--vercel-border, #e5e5e5);
    }

    .dialog-btn-secondary:hover {
      background: rgba(0, 0, 0, 0.03);
    }

    html[data-theme="dark"] .dialog-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class DialogComponent {
  readonly dialogSvc = inject(DialogService);
  private readonly sanitizer = inject(DomSanitizer);
  
  promptValue = '';

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  @ViewChild('promptInput') set promptInput(input: ElementRef<HTMLInputElement> | undefined) {
    if (input) {
      setTimeout(() => input.nativeElement.focus(), 50);
    }
  }

  constructor() {
    effect(() => {
      const active = this.dialogSvc.activeDialog();
      if (active && active.type === 'prompt') {
        this.promptValue = active.defaultValue || '';
      } else {
        this.promptValue = '';
      }
    });
  }

  onConfirm(dialog: any): void {
    if (dialog.type === 'prompt') {
      dialog.resolve(this.promptValue);
    } else if (dialog.type === 'confirm') {
      dialog.resolve(true);
    } else {
      dialog.resolve();
    }
  }

  onCancel(dialog: any): void {
    if (dialog.type === 'prompt') {
      dialog.resolve(null);
    } else if (dialog.type === 'confirm') {
      dialog.resolve(false);
    } else {
      dialog.resolve();
    }
  }
}
