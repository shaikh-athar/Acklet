// apps/tool-barcode-generator/src/config/domain-lint.spec.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Domain Lint & Environment Resolution Suite (Section 8 & 11)', () => {
  const toolRoot = path.resolve(__dirname, '../..');
  const forbiddenProductionHosts = [
    'https://qr.acklet.com',
    'https://tools.acklet.com',
    'https://urlshortener.acklet.com',
    'https://barcode.acklet.com'
  ];

  function scanDir(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'dist'].includes(file)) {
          scanDir(fullPath, fileList);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.html')) {
        // Exclude test specs and environment declaration files
        if (!file.endsWith('.spec.ts') && !file.includes('environment')) {
          fileList.push(fullPath);
        }
      }
    }
    return fileList;
  }

  it('ensures no literal production tool hosts appear in tool-barcode-generator source files', () => {
    const srcDir = path.join(toolRoot, 'src');
    const sourceFiles = scanDir(srcDir);
    const violations: { file: string; host: string; line: number }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Allow JSDoc comment references
        if (line.trim().startsWith('*') || line.trim().startsWith('//')) {
          continue;
        }

        for (const host of forbiddenProductionHosts) {
          if (line.includes(host)) {
            violations.push({
              file: path.relative(toolRoot, filePath),
              host,
              line: i + 1
            });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

