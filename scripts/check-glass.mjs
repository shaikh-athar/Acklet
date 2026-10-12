#!/usr/bin/env node
// scripts/check-glass.mjs
// Guard: verifies glass token values and card rules are correct.
// Run: npm run check:glass
// Fails if:
//  - Any card fill alpha token (--ts-a1, --ts-a2, --ts-b1, --ts-b2) in any variant < 0.25
//  - --ts-edge has no outer ring with alpha >= 0.08
//  - Any of the three card rules lacks background, backdrop-filter, box-shadow or border-radius
//  - Any card rule contains background: transparent or none

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const tokensPath = resolve(root, 'client/packages/tool-shell/src/styles/tokens.css');
const shellPath  = resolve(root, 'client/packages/tool-shell/src/components/shell/ts-shell.component.ts');
const topbarPath = resolve(root, 'client/packages/tool-shell/src/components/topbar/ts-topbar.component.ts');
const sidebarPath = resolve(root, 'client/packages/tool-shell/src/components/sidebar/ts-sidebar.component.ts');

let errors = [];

// ── Read files ───────────────────────────────────────────────────────────────
const tokens = readFileSync(tokensPath, 'utf8');
const shell  = readFileSync(shellPath,  'utf8');
const topbar = readFileSync(topbarPath, 'utf8');
const sidebar = readFileSync(sidebarPath, 'utf8');

// ── CHECK 1: Fill alpha tokens >= 0.25 in all defined variants ───────────────
// Extract all --ts-a1, --ts-a2, --ts-b1, --ts-b2 assignments
const alphaTokenRe = /--(ts-a1|ts-a2|ts-b1|ts-b2)\s*:\s*([\d.]+)/g;
let m;
while ((m = alphaTokenRe.exec(tokens)) !== null) {
  const name  = m[1];
  const value = parseFloat(m[2]);
  if (value < 0.25) {
    errors.push(`FAIL: --${name} = ${value} (< 0.25) in tokens.css`);
  }
}

// ── CHECK 2: --ts-edge has outer ring with alpha >= 0.08 ─────────────────────
// Look for the edge definition
const edgeMatch = tokens.match(/--ts-edge\s*:\s*([^;]+);/s);
if (!edgeMatch) {
  errors.push('FAIL: --ts-edge not found in tokens.css');
} else {
  const edgeVal = edgeMatch[1];
  // First shadow part should be an outer ring like "0 0 0 1px rgba(...)"
  // Extract the first rgba alpha
  const firstRgba = edgeVal.match(/rgba\(\s*[\d.,\s]+?,\s*([\d.]+)\s*\)/);
  if (!firstRgba) {
    errors.push('FAIL: --ts-edge first shadow has no rgba() value');
  } else {
    const alpha = parseFloat(firstRgba[1]);
    if (alpha < 0.08) {
      errors.push(`FAIL: --ts-edge outer ring alpha = ${alpha} (< 0.08)`);
    }
  }
}

// ── CHECK 3 & 4: Card rules completeness ─────────────────────────────────────
function checkCard(content, cardClass, filePath) {
  // Find the card rule block
  const blockRe = new RegExp(`\\.${cardClass}\\s*\\{([^}]+)\\}`, 's');
  const block = content.match(blockRe);
  if (!block) {
    errors.push(`FAIL: .${cardClass} rule not found in ${filePath}`);
    return;
  }
  const rule = block[1];

  const required = ['background', 'backdrop-filter', 'box-shadow', 'border-radius'];
  for (const prop of required) {
    if (!rule.includes(prop)) {
      errors.push(`FAIL: .${cardClass} lacks '${prop}' in ${filePath}`);
    }
  }

  // Check for forbidden transparent/none background
  if (/background\s*:\s*(transparent|none)/i.test(rule)) {
    errors.push(`FAIL: .${cardClass} has background: transparent/none in ${filePath}`);
  }
}

checkCard(topbar,  'ts-topbar-card',       'ts-topbar.component.ts');
checkCard(sidebar, 'ts-sidebar-card',      'ts-sidebar.component.ts');
checkCard(shell,   'ts-main-content-card', 'ts-shell.component.ts');

// ── REPORT ────────────────────────────────────────────────────────────────────
if (errors.length > 0) {
  console.error('\n❌ check:glass FAILED:\n');
  for (const e of errors) console.error('  ' + e);
  console.error('');
  process.exit(1);
} else {
  console.log('✅ check:glass PASSED: all three glass cards are valid.');
}
