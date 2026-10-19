#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const surface = process.argv[2]?.toLowerCase();
const baseRef = process.argv[3] || 'main';

if (!surface) {
  console.error('Usage: npm run check:scope -- <surface> [baseRef]');
  console.error('Surfaces: tools | acklet | shared | meta');
  process.exit(1);
}

const SURFACE_GLOBS = {
  tools: [
    /^client\/apps\/tools-hub\//,
    /^client\/apps\/tool-[^/]+\//,
    /^client\/packages\/tool-shell\//
  ],
  acklet: [
    /^client\/src\//
  ],
  shared: [
    /^client\/packages\/shared\//,
    /^client\/packages\/tool-registry\//
  ],
  meta: [
    /^\.agents\//,
    /(^|\/)AGENTS\.md$/,
    /^scripts\//,
    /^docs\//,
    /^client\/package\.json$/,
    /^client\/package-lock\.json$/
  ]
};

const allowedGlobs = SURFACE_GLOBS[surface];
if (!allowedGlobs) {
  console.error(`Unknown surface: "${surface}". Allowed: tools, acklet, shared, meta`);
  process.exit(1);
}

let changedFiles = [];
try {
  const diffOutput = execSync(`git diff --name-only ${baseRef}`, { cwd: repoRoot, encoding: 'utf-8' });
  const untrackedOutput = execSync(`git ls-files --others --exclude-standard`, { cwd: repoRoot, encoding: 'utf-8' });
  
  changedFiles = [
    ...diffOutput.split('\n').filter(Boolean),
    ...untrackedOutput.split('\n').filter(Boolean)
  ];
} catch (err) {
  console.error('Error checking git status:', err.message);
  process.exit(1);
}

// Deduplicate
changedFiles = [...new Set(changedFiles)];

if (changedFiles.length === 0) {
  console.log(`[check:scope] No changed files detected against ${baseRef}. Scope check passed.`);
  process.exit(0);
}

const offendingFiles = changedFiles.filter(file => {
  return !allowedGlobs.some(pattern => pattern.test(file));
});

if (offendingFiles.length > 0) {
  console.error(`\n❌ [check:scope] Scope violation! Surface "${surface}" is not allowed to modify these paths:\n`);
  offendingFiles.forEach(f => console.error(`  - ${f}`));
  console.error(`\nAllowed patterns for "${surface}":`);
  allowedGlobs.forEach(g => console.error(`  ${g}`));
  process.exit(1);
}

console.log(`\n✅ [check:scope] All ${changedFiles.length} changed file(s) are strictly within "${surface}" scope.`);
process.exit(0);
