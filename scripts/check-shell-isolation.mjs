// scripts/check-shell-isolation.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const clientDir = path.join(rootDir, 'client');
const portalSrcDir = path.join(clientDir, 'src');
const toolShellDir = path.join(clientDir, 'packages', 'tool-shell');
const toolAppsDir = path.join(clientDir, 'apps');

let hasErrors = false;

function scanDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        scanDir(fullPath, callback);
      }
    } else if (entry.isFile()) {
      callback(fullPath);
    }
  }
}

console.log('🔍 Checking Tool Shell and Portal Isolation...');

// Rule 1: No tool-shell or tool apps files may import from client/src
const toolDirs = [toolShellDir, toolAppsDir];
for (const tDir of toolDirs) {
  scanDir(tDir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.css') && !filePath.endsWith('.html')) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for imports pointing into portal src
    if (/from\s+['"][^'"]*src\/app/i.test(content) || /import\s+['"][^'"]*src\/app/i.test(content)) {
      console.error(`❌ Violation in ${filePath}: Illegal import from portal "src/app"`);
      hasErrors = true;
    }
    // Check for portal color tokens in tool files
    if (filePath.endsWith('.css') || filePath.endsWith('.ts')) {
      if (/--color-surface-/i.test(content) || /--color-brand-/i.test(content)) {
        console.error(`❌ Violation in ${filePath}: Found portal design token (--color-*) in tool/shell code`);
        hasErrors = true;
      }
    }
  });
}

// Rule 2: Portal styles (client/src) must not reference --ts- tokens
scanDir(portalSrcDir, (filePath) => {
  if (!filePath.endsWith('.css') && !filePath.endsWith('.ts')) return;
  // Ignore main.ts which legitimately orchestrates bootstrap
  if (filePath.endsWith('src/main.ts')) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  if (/--ts-/i.test(content)) {
    console.error(`❌ Violation in ${filePath}: Found tool-shell token (--ts-*) in portal code`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\n🚫 Isolation check failed! Review violations above.');
  process.exit(1);
} else {
  console.log('✅ Isolation check passed! Tool Shell and Portal are completely isolated.\n');
  process.exit(0);
}
