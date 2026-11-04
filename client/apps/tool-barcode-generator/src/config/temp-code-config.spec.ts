// apps/tool-barcode-generator/src/config/temp-code-config.spec.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Config Audit: No Hardcoded Production Hosts', () => {
  const rootSrcDir = path.resolve(__dirname, '..');

  function scanDirectory(dir: string): string[] {
    let files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(scanDirectory(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.html')) && !entry.name.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('asserts no source file outside environment files contains literal production domain', () => {
    const allFiles = scanDirectory(rootSrcDir);
    const prodHostRegex = /https?:\/\/barcode\.acklet\.com/g;

    const violatingFiles: string[] = [];
    for (const file of allFiles) {
      if (file.includes('environment.prod.ts')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (prodHostRegex.test(content)) {
        violatingFiles.push(path.relative(rootSrcDir, file));
      }
    }

    expect(violatingFiles, `Found hardcoded production host in: ${violatingFiles.join(', ')}`).toEqual([]);
  });
});
