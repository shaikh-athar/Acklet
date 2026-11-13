// apps/tool-color-studio/src/services/export.service.ts
import { Injectable } from '@angular/core';
import { DetailedContrastResult } from '../models/color.models';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Copies text string to system clipboard with fallback.
   */
  public async copyToClipboard(text: string, label = 'Content'): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Downloads browser-side content as a named file with the specified MIME type.
   */
  public downloadFile(content: string, filename: string, mimeType: string): void {
    if (typeof document === 'undefined') return;
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    }
  }

  /**
   * Downloads binary content (such as Uint8Array for Adobe ASE) as a named file.
   */
  public downloadBinaryFile(data: Uint8Array, filename: string, mimeType: string): void {
    if (typeof document === 'undefined') return;
    try {
      const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Binary download failed', e);
    }
  }

  /**
   * Generates formatted JSON export for a contrast check result.
   */
  public generateContrastJson(result: DetailedContrastResult): string {
    const payload = {
      generator: 'Acklet Color Studio — Contrast Checker',
      timestamp: new Date().toISOString(),
      standard: 'WCAG 2.2',
      colors: {
        foreground: {
          hex: result.fgHex,
          relativeLuminance: Number(result.fgLuminance.toFixed(4))
        },
        background: {
          hex: result.bgHex,
          relativeLuminance: Number(result.bgLuminance.toFixed(4))
        }
      },
      evaluation: {
        contrastRatio: result.ratio,
        contrastRatioString: result.ratioString,
        rating: result.rating,
        ratingLabel: result.ratingLabel,
        overallGrade: result.grade,
        criteria: {
          normalTextAA: {
            requiredRatio: '4.5:1',
            status: result.aaNormal ? 'PASS' : 'FAIL',
            passed: result.aaNormal
          },
          largeTextAA: {
            requiredRatio: '3.0:1',
            status: result.aaLarge ? 'PASS' : 'FAIL',
            passed: result.aaLarge
          },
          normalTextAAA: {
            requiredRatio: '7.0:1',
            status: result.aaaNormal ? 'PASS' : 'FAIL',
            passed: result.aaaNormal
          },
          largeTextAAA: {
            requiredRatio: '4.5:1',
            status: result.aaaLarge ? 'PASS' : 'FAIL',
            passed: result.aaaLarge
          },
          uiComponentsAA: {
            requiredRatio: '3.0:1',
            status: result.uiComponent ? 'PASS' : 'FAIL',
            passed: result.uiComponent
          }
        }
      },
      suggestions: result.suggestions.map(s => ({
        type: s.type,
        label: s.label,
        targetRole: s.targetRole,
        hex: s.hex,
        contrastRatio: s.ratioString,
        grade: s.grade
      }))
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Generates CSS custom properties with WCAG accessibility annotations.
   */
  public generateContrastCss(
    fgHex: string,
    bgHex: string,
    ratio: number,
    grade: string,
    selector = ':root'
  ): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return [
      `/*`,
      ` * Acklet Color Studio — Accessible Color Palette`,
      ` * Generated: ${timestamp}`,
      ` * WCAG 2.2 Contrast Ratio: ${ratio.toFixed(2)}:1 (Level ${grade})`,
      ` */`,
      `${selector} {`,
      `  --color-text: ${fgHex.toUpperCase()};`,
      `  --color-bg: ${bgHex.toUpperCase()};`,
      `  --contrast-ratio: ${ratio.toFixed(2)};`,
      `  --wcag-grade: "${grade}";`,
      `}`,
      ``,
      `/* Sample Accessible Component Utility */`,
      `.accessible-surface {`,
      `  color: var(--color-text);`,
      `  background-color: var(--color-bg);`,
      `}`
    ].join('\n');
  }

  /**
   * Generates a comprehensive markdown accessibility evaluation report.
   */
  public generateContrastReport(result: DetailedContrastResult): string {
    const timestamp = new Date().toISOString();
    return [
      `# WCAG 2.2 Accessibility Evaluation Report`,
      `**Generated By**: Acklet Color Studio`,
      `**Date**: ${timestamp}`,
      ``,
      `## 1. Color Pair Summary`,
      `- **Foreground (Text)**: \`${result.fgHex.toUpperCase()}\` (Luminance: ${result.fgLuminance.toFixed(4)})`,
      `- **Background**: \`${result.bgHex.toUpperCase()}\` (Luminance: ${result.bgLuminance.toFixed(4)})`,
      `- **Contrast Ratio**: **${result.ratioString}**`,
      `- **Compliance Grade**: **Level ${result.grade}** (${result.ratingLabel})`,
      ``,
      `## 2. WCAG 2.2 Conformance Matrix`,
      `| Success Criterion | Required Ratio | Result | Status |`,
      `| :--- | :--- | :--- | :--- |`,
      `| Normal Text (Level AA) | $\\ge 4.5:1$ | ${result.ratioString} | **${result.aaNormal ? 'PASS' : 'FAIL'}** |`,
      `| Large Text (Level AA) | $\\ge 3.0:1$ | ${result.ratioString} | **${result.aaLarge ? 'PASS' : 'FAIL'}** |`,
      `| Normal Text (Level AAA) | $\\ge 7.0:1$ | ${result.ratioString} | **${result.aaaNormal ? 'PASS' : 'FAIL'}** |`,
      `| Large Text (Level AAA) | $\\ge 4.5:1$ | ${result.ratioString} | **${result.aaaLarge ? 'PASS' : 'FAIL'}** |`,
      `| UI Components & Graphics (Level AA) | $\\ge 3.0:1$ | ${result.ratioString} | **${result.uiComponent ? 'PASS' : 'FAIL'}** |`,
      ``,
      `## 3. Recommended Actions`,
      result.grade === 'AAA'
        ? `- This color pair achieves the highest level of contrast accessibility (Level AAA). It is safe for all users, including those with significant visual impairments.`
        : result.grade === 'AA'
          ? `- This color pair satisfies standard web accessibility requirements (Level AA). It is suitable for general production usage.`
          : `- **Action Required**: This color pair fails minimum WCAG AA contrast for body text. Consider applying one of the calculated suggestions below.`,
      ``,
      `## 4. Computed Accessible Suggestions`,
      result.suggestions.length > 0
        ? result.suggestions.map(s => `- **${s.label}**: \`${s.hex.toUpperCase()}\` (${s.ratioString}, Level ${s.grade})`).join('\n')
        : `- No color adjustments needed.`
    ].join('\n');
  }

  /**
   * Generates a printable HTML/PDF document in a popup window for instant printing/saving as PDF.
   */
  public generatePdfReport(result: DetailedContrastResult): void {
    if (typeof window === 'undefined') return;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>WCAG 2.2 Accessibility Report — ${result.fgHex} on ${result.bgHex}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0F172A; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; border-bottom: 2px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 20px; }
          .summary-card { display: flex; gap: 20px; align-items: center; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #CBD5E1; }
          .sample-preview { width: 140px; height: 80px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 1px solid #94A3B8; }
          .score-box { font-size: 32px; font-weight: 800; color: #0F172A; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
          .badge-pass { background: #DCFCE7; color: #166534; }
          .badge-fail { background: #FEE2E2; color: #991B1B; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
          th { background: #F8FAFC; font-weight: 600; color: #475569; }
          .footer { margin-top: 40px; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>WCAG 2.2 Color Accessibility Report</h1>
        <p><strong>Generated By:</strong> Acklet Color Studio &bull; <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        <div class="summary-card">
          <div class="sample-preview" style="background-color: ${result.bgHex}; color: ${result.fgHex};">
            Sample Text
          </div>
          <div>
            <div class="score-box">${result.ratioString}</div>
            <div><strong>Rating:</strong> ${result.ratingLabel} (Grade: Level ${result.grade})</div>
            <div style="font-size: 13px; color: #64748B; margin-top: 4px;">
              Foreground: <code>${result.fgHex.toUpperCase()}</code> &bull; Background: <code>${result.bgHex.toUpperCase()}</code>
            </div>
          </div>
        </div>

        <h2>WCAG 2.2 Conformance Table</h2>
        <table>
          <thead>
            <tr><th>Criterion</th><th>Requirement</th><th>Measured Ratio</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>Normal Text (AA)</td><td>&ge; 4.5:1</td><td>${result.ratioString}</td><td><span class="badge ${result.aaNormal ? 'badge-pass' : 'badge-fail'}">${result.aaNormal ? 'PASS' : 'FAIL'}</span></td></tr>
            <tr><td>Large Text (AA)</td><td>&ge; 3.0:1</td><td>${result.ratioString}</td><td><span class="badge ${result.aaLarge ? 'badge-pass' : 'badge-fail'}">${result.aaLarge ? 'PASS' : 'FAIL'}</span></td></tr>
            <tr><td>Normal Text (AAA)</td><td>&ge; 7.0:1</td><td>${result.ratioString}</td><td><span class="badge ${result.aaaNormal ? 'badge-pass' : 'badge-fail'}">${result.aaaNormal ? 'PASS' : 'FAIL'}</span></td></tr>
            <tr><td>Large Text (AAA)</td><td>&ge; 4.5:1</td><td>${result.ratioString}</td><td><span class="badge ${result.aaaLarge ? 'badge-pass' : 'badge-fail'}">${result.aaaLarge ? 'PASS' : 'FAIL'}</span></td></tr>
            <tr><td>UI Components (AA)</td><td>&ge; 3.0:1</td><td>${result.ratioString}</td><td><span class="badge ${result.uiComponent ? 'badge-pass' : 'badge-fail'}">${result.uiComponent ? 'PASS' : 'FAIL'}</span></td></tr>
          </tbody>
        </table>

        <div class="footer">
          Generated automatically by Acklet Color Studio. Follows W3C Web Content Accessibility Guidelines (WCAG) 2.2 standards.
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      // Fallback: download as printable HTML report
      this.downloadFile(html, 'contrast-accessibility-report.html', 'text/html');
    }
  }
}

