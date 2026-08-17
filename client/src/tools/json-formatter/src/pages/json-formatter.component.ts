// client/src/tools/json-formatter/src/pages/json-formatter.component.ts

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../app/shared/components/icon/icon';

@Component({
  selector: 'tool-json-formatter',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="json-formatter-container" style="--tool-color: #f97316;">
      <!-- Controls -->
      <div class="jf-control-bar">
        <div class="jf-controls-group">
          <label class="text-xs font-bold text-neutral-400 uppercase tracking-wider">Indentation</label>
          <select class="jf-select" [(ngModel)]="indentSize" (change)="processJson()">
            <option value="2">2 Spaces</option>
            <option value="4">4 Spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div class="jf-controls-group">
          <button class="btn btn-ghost text-xs" (click)="clearAll()">
            <app-icon name="x" class="size-3.5 mr-1" /> Clear
          </button>
          <button class="btn btn-ghost text-xs" (click)="loadSample()">
            <app-icon name="sparkles" class="size-3.5 mr-1" /> Load Sample
          </button>
          <button class="btn btn-secondary text-xs" (click)="minifyJson()">
            <app-icon name="align-left" class="size-3.5 mr-1" /> Minify
          </button>
          <button class="btn btn-primary text-xs" (click)="processJson()">
            <app-icon name="braces" class="size-3.5 mr-1" /> Format
          </button>
        </div>
      </div>

      <!-- Main Workspace -->
      <div class="jf-workspace">
        <!-- Input Panel -->
        <div class="jf-panel">
          <div class="jf-panel-header">
            <span class="jf-panel-title">Raw Input</span>
            <span class="text-xs text-neutral-500">{{ inputSize() }}</span>
          </div>
          <textarea
            class="jf-textarea"
            placeholder="Paste your raw JSON here..."
            [(ngModel)]="rawJson"
            (ngModelChange)="onInputChange()"
          ></textarea>
        </div>

        <!-- Output Panel -->
        <div class="jf-panel">
          <div class="jf-panel-header">
            <span class="jf-panel-title">Formatted Output</span>
            <button class="btn btn-ghost size-8 p-0 flex items-center justify-center" (click)="copyOutput()" [title]="copyTooltip()">
              <app-icon [name]="copied() ? 'check' : 'arrow-up-right'" class="size-4" />
            </button>
          </div>
          <textarea
            class="jf-textarea"
            readonly
            placeholder="Formatted output will appear here..."
            [value]="formattedOutput()"
          ></textarea>
        </div>
      </div>

      <!-- Status Bar -->
      @if (validationStatus()) {
        <div class="jf-status-bar" [class.status-valid]="validationStatus() === 'valid'" [class.status-invalid]="validationStatus() === 'invalid'">
          <app-icon [name]="validationStatus() === 'valid' ? 'shield-check' : 'shield-alert'" class="size-5" />
          <span>{{ validationMessage() }}</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['../styles/json-formatter.css']
})
export class JsonFormatterComponent {
  rawJson = '';
  indentSize = '2';
  
  readonly formattedOutput = signal('');
  readonly validationStatus = signal<'valid' | 'invalid' | null>(null);
  readonly validationMessage = signal('');
  readonly copied = signal(false);

  readonly inputSize = computed(() => {
    const bytes = this.rawJson.length;
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  });

  readonly copyTooltip = computed(() => this.copied() ? 'Copied!' : 'Copy to Clipboard');

  onInputChange(): void {
    if (!this.rawJson.trim()) {
      this.clearAll();
      return;
    }
    this.validateOnly();
  }

  validateOnly(): void {
    try {
      JSON.parse(this.rawJson);
      this.validationStatus.set('valid');
      this.validationMessage.set('JSON structure is valid.');
    } catch (e: any) {
      this.validationStatus.set('invalid');
      this.validationMessage.set(e.message || 'Invalid JSON syntax.');
    }
  }

  processJson(): void {
    if (!this.rawJson.trim()) return;

    try {
      const parsed = JSON.parse(this.rawJson);
      const space = this.indentSize === 'tab' ? '\t' : parseInt(this.indentSize, 10);
      const formatted = JSON.stringify(parsed, null, space);
      this.formattedOutput.set(formatted);
      this.validationStatus.set('valid');
      this.validationMessage.set('Formatted successfully!');
    } catch (e: any) {
      this.formattedOutput.set('');
      this.validationStatus.set('invalid');
      this.validationMessage.set(`Formatting failed: ${e.message}`);
    }
  }

  minifyJson(): void {
    if (!this.rawJson.trim()) return;

    try {
      const parsed = JSON.parse(this.rawJson);
      const minified = JSON.stringify(parsed);
      this.formattedOutput.set(minified);
      this.validationStatus.set('valid');
      this.validationMessage.set('Minified successfully!');
    } catch (e: any) {
      this.formattedOutput.set('');
      this.validationStatus.set('invalid');
      this.validationMessage.set(`Minification failed: ${e.message}`);
    }
  }

  copyOutput(): void {
    const out = this.formattedOutput();
    if (!out) return;

    navigator.clipboard.writeText(out).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  clearAll(): void {
    this.rawJson = '';
    this.formattedOutput.set('');
    this.validationStatus.set(null);
    this.validationMessage.set('');
    this.copied.set(false);
  }

  loadSample(): void {
    const sample = {
      name: "Acklet Sandbox Platform",
      version: "1.0.0",
      description: "A secure, offline-first developer utilities suite.",
      features: [
        "Interactive syntax formatting",
        "Local execution safety",
        "Clean, responsive visual design"
      ],
      author: {
        name: "Acklet Team",
        verified: true
      }
    };
    this.rawJson = JSON.stringify(sample, null, 2);
    this.processJson();
  }
}
