#!/usr/bin/env node
/**
 * scripts/verify.mjs
 * Unified Verification Entry Point for Acklet Monorepo
 * 
 * Usage:
 *   node scripts/verify.mjs                    # Runs Level A (Fast Checks)
 *   node scripts/verify.mjs --level=A          # Level A: Fast Checks (~4s)
 *   node scripts/verify.mjs --level=B          # Level B: Feature Verification (~14s)
 *   node scripts/verify.mjs --level=C          # Level C: Integration Verification (~30s)
 *   node scripts/verify.mjs --frontend         # Frontend-only verification
 *   node scripts/verify.mjs --backend          # Backend-only verification
 *   node scripts/verify.mjs --scope=tools      # Scope-specific verification
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const clientDir = path.join(repoRoot, 'client');
const serverDir = path.join(repoRoot, 'server', 'acklet');

// Parse CLI Arguments
const args = process.argv.slice(2);
let level = 'A';
let runFrontend = true;
let runBackend = true;
let targetScope = null;
let targetApp = 'tool-online-clipboard';

let explicitSurface = false;

for (const arg of args) {
  if (arg.startsWith('--level=')) {
    level = arg.split('=')[1].toUpperCase();
  } else if (arg === '-A' || arg === '--fast') {
    level = 'A';
  } else if (arg === '-B' || arg === '--feature') {
    level = 'B';
  } else if (arg === '-C' || arg === '--integration') {
    level = 'C';
  } else if (arg === '--frontend' || arg === '-f') {
    runBackend = false;
    explicitSurface = true;
  } else if (arg === '--backend' || arg === '-b') {
    runFrontend = false;
    explicitSurface = true;
  } else if (arg === '--all') {
    runFrontend = true;
    runBackend = true;
    explicitSurface = true;
  } else if (arg.startsWith('--scope=')) {
    targetScope = arg.split('=')[1];
  } else if (arg.startsWith('--app=')) {
    targetApp = arg.split('=')[1];
  }
}

// Smart Scope change detection (only when not explicitly configured and level != C)
if (!explicitSurface && level !== 'C') {
  try {
    const gitStatus = execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf-8' });
    const lines = gitStatus.split('\n').filter(Boolean);
    if (lines.length > 0) {
      const hasServerMod = lines.some(l => l.includes('server/'));
      const hasClientMod = lines.some(l => l.includes('client/') || l.includes('scripts/') || l.includes('package.json'));
      if (!hasServerMod && hasClientMod) {
        runBackend = false;
      } else if (!hasClientMod && hasServerMod) {
        runFrontend = false;
      }
    }
  } catch {
    // If git fails, default to running both
  }
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.bold}  Acklet Unified Verification Runner — Level ${level}${colors.reset}`);
console.log(`${colors.dim}  Frontend: ${runFrontend} | Backend: ${runBackend} | Target: ${repoRoot}${colors.reset}`);
if (!explicitSurface && (!runFrontend || !runBackend)) {
  console.log(`${colors.dim}  Smart Scope Active: auto-detected modified files in git status${colors.reset}`);
}
console.log(`${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}\n`);

const summary = [];
const startTime = Date.now();

function skipStep(name, reason) {
  console.log(`  ⚡ ${name}... ${colors.yellow}SKIPPED${colors.reset} ${colors.dim}(${reason})${colors.reset}`);
  summary.push({ name, status: 'SKIPPED', duration: '0.00', reason });
}

function runStep(name, cmd, cwd) {
  const stepStart = Date.now();
  process.stdout.write(`  ⏳ ${name}... `);
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
    console.log(`${colors.green}PASSED${colors.reset} ${colors.dim}(${duration}s)${colors.reset}`);
    summary.push({ name, status: 'PASSED', duration });
    return true;
  } catch (error) {
    const duration = ((Date.now() - stepStart) / 1000).toFixed(2);
    console.log(`${colors.red}FAILED${colors.reset} ${colors.dim}(${duration}s)${colors.reset}`);
    const stderr = (error.stderr || error.stdout || error.message || '').toString();
    console.error(`\n${colors.red}${stderr.trim().split('\n').map(l => '    ' + l).join('\n')}${colors.reset}\n`);
    summary.push({ name, status: 'FAILED', duration, error: stderr.slice(0, 300) });
    return false;
  }
}

let allPassed = true;

// ─────────────────────────────────────────────────────────────
// LEVEL A: FAST CHECKS (~3-5s)
// ─────────────────────────────────────────────────────────────
console.log(`${colors.bold}▶ [Level A] Static, Architecture & Type Checks${colors.reset}`);

// 1. Surface Isolation & Glass Rules (Always run if frontend is active)
if (runFrontend) {
  allPassed = runStep('Glass Styling Constraints', 'node scripts/check-glass.mjs', repoRoot) && allPassed;
  allPassed = runStep('Tool Shell & Portal Isolation', 'node scripts/check-shell-isolation.mjs', repoRoot) && allPassed;
  allPassed = runStep('TypeScript Compilation (tsc -b --noEmit)', 'npx tsc -b --noEmit', clientDir) && allPassed;
  allPassed = runStep('Shared Package Unit Tests (vitest)', 'npx vitest run packages/shared/src/subdomain.util.spec.ts', clientDir) && allPassed;
}

if (targetScope) {
  allPassed = runStep(`Surface Scope Check (${targetScope})`, `node scripts/check-surface-scope.mjs ${targetScope} HEAD`, repoRoot) && allPassed;
}

// 2. Backend Compilation Check
if (runBackend) {
  allPassed = runStep('Backend Java Test Compilation (mvnw test-compile)', './mvnw test-compile', serverDir) && allPassed;
} else {
  skipStep('Backend Java Test Compilation (mvnw test-compile)', 'No server/ files modified in working tree');
}

// ─────────────────────────────────────────────────────────────
// LEVEL B: FEATURE VERIFICATION (~12-15s)
// ─────────────────────────────────────────────────────────────
if (level === 'B' || level === 'C') {
  console.log(`\n${colors.bold}▶ [Level B] Feature Verification & Unit Testing${colors.reset}`);

  if (runFrontend) {
    allPassed = runStep(`Angular Application Build (${targetApp})`, `npx ng build ${targetApp}`, clientDir) && allPassed;
  }

  if (runBackend) {
    allPassed = runStep('Backend Security & Crypto Unit Tests', './mvnw test -Dtest=CryptoUtilsTest,JwtTokenProviderTest -DargLine="-Dnet.bytebuddy.experimental=true"', serverDir) && allPassed;
  }
}

// ─────────────────────────────────────────────────────────────
// LEVEL C: INTEGRATION VERIFICATION (~25-35s)
// ─────────────────────────────────────────────────────────────
if (level === 'C') {
  console.log(`\n${colors.bold}▶ [Level C] Integration & Application Context Verification${colors.reset}`);

  if (runFrontend) {
    allPassed = runStep('Angular Portal Build (acklet-portal)', 'npx ng build acklet-portal', clientDir) && allPassed;
    allPassed = runStep('Tools Hub Build (tools-hub)', 'npx ng build tools-hub', clientDir) && allPassed;
  }

  if (runBackend) {
    allPassed = runStep('Spring Boot Context Load (AckletApplicationTests)', './mvnw test -Dtest=AckletApplicationTests -DargLine="-Dnet.bytebuddy.experimental=true"', serverDir) && allPassed;
  }
}

// ─────────────────────────────────────────────────────────────
// VERIFICATION SUMMARY
// ─────────────────────────────────────────────────────────────
const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`\n${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.bold}  Verification Summary (${totalDuration}s total)${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}`);

for (const s of summary) {
  let icon = `${colors.green}✔`;
  if (s.status === 'FAILED') icon = `${colors.red}✖`;
  if (s.status === 'SKIPPED') icon = `${colors.yellow}⚡`;
  const extra = s.reason ? ` - ${s.reason}` : '';
  console.log(`  ${icon} ${s.name.padEnd(50)} ${s.status} (${s.duration}s)${colors.dim}${extra}${colors.reset}`);
}

console.log(`${colors.bold}${colors.cyan}════════════════════════════════════════════════════════════════${colors.reset}`);
if (allPassed) {
  console.log(`${colors.green}${colors.bold}✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}${colors.bold}❌ VERIFICATION FAILED. Review errors above.${colors.reset}\n`);
  process.exit(1);
}
