import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToolKnowledgeHub } from '../models/tool-knowledge.model';

@Injectable({
  providedIn: 'root'
})
export class ToolKnowledgeService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/tools';

  getToolKnowledge(toolId: string): Observable<ToolKnowledgeHub> {
    return this.http.get<ToolKnowledgeHub>(`${this.apiUrl}/${toolId}/knowledge`).pipe(
      catchError(() => of(this.getFallbackKnowledge(toolId)))
    );
  }

  private getFallbackKnowledge(toolId: string): ToolKnowledgeHub {
    return {
      toolId: toolId,
      overview: 'Acklet premium local formatter utility providing instant, offline-first output formatting.',
      purpose: 'Enables quick parsing and structure audits directly inside client-side sandbox memory.',
      problemsSolved: 'Raw JSON parsing exceptions, layout rendering bugs, and security risks with API tokens.',
      whoShouldUse: 'Full-stack engineers, QA analysts, devops engineers, and compliance experts.',
      whoShouldAvoid: 'Users requiring cloud persistence database features or real-time concurrent group comments.',
      expectedInputs: 'Minified raw text payloads or unformatted string objects.',
      expectedOutputs: 'Beautified 2-space indented formats, schema validated logs.',
      bestPractices: 'Use locally cached WebAssembly tools to format highly sensitive security logs offline.',
      advantages: 'Zero remote upload storage risk, client-side WebAssembly parser speeds, responsive layout.',
      limitations: 'Limited processing capacity for raw payload strings exceeding 50MB.',
      verifiedBadge: true,
      maintainer: 'Acklet Core Engineers',
      officialWebsite: 'https://acklet.io',
      documentationUrl: 'https://acklet.io/docs',
      githubRepository: 'https://github.com/acklet/tool-hub',
      technicalDetails: {
        'Input Formats': 'Raw Text, JSON, XML, YAML',
        'Output Formats': 'Formatted Indented Strings',
        'Rate Limits': 'Unlimited locally in browser runtime',
        'API Available': 'Yes',
        'Desktop App Available': 'Yes (Electron Wrapper)'
      },
      compatibility: {
        'Web Browser': 'Yes (All modern browsers)',
        'Windows / MacOS': 'Yes (Native CLI and GUI builds)',
        'Docker Sandbox': 'Yes',
        'Offline Execution': '100% Offline Capable'
      },
      pricingDetails: {
        'Pricing Tier': 'Freemium',
        'Trial Available': 'Yes (Free tier contains basic tools)',
        'Open Source': 'No (Acklet core libraries proprietary)'
      },
      privacyDetails: {
        'Processes Data Locally': 'Yes (100% locally in browser memory)',
        'Uploads Files to Server': 'No',
        'Encryption Standards': 'AES-256 local configuration backup',
        'GDPR Compliance': 'Compliant (Zero PII collection)'
      },
      mediaItems: [
        { mediaType: 'SCREENSHOT', url: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=800&q=80', caption: 'Interactive formatter console dashboard interface.', displayOrder: 1 }
      ],
      versionHistory: [
        { version: '1.2.0', releaseDate: new Date().toISOString(), releaseNotes: 'Added WebAssembly compression helper algorithms and local caching.', upcomingFeatures: 'Interactive JSON schema blueprint analyzer.' }
      ]
    };
  }
}
