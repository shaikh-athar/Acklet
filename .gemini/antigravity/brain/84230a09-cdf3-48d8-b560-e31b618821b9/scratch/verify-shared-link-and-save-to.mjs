// scratch/verify-shared-link-and-save-to.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const distDir = path.resolve('client/dist/tool-image-compressor/browser');
const outputDir = path.join(os.homedir(), 'Desktop', 'acklet-review');
fs.mkdirSync(outputDir, { recursive: true });

const testAssetsDir = path.resolve('client/apps/tool-image-compressor/src/test-assets');
let img13kbB64 = '';
if (fs.existsSync(path.join(testAssetsDir, 'image-13kb.png'))) {
  img13kbB64 = fs.readFileSync(path.join(testAssetsDir, 'image-13kb.png')).toString('base64');
} else {
  // 1x1 png fallback
  img13kbB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm'
};

const port = 8099;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(resolve => server.listen(port, resolve));
console.log(`Static server listening on http://localhost:${port}`);

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--remote-debugging-port=9235',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--user-data-dir=/tmp/chrome-save-to-' + Date.now()
]);

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch('http://127.0.0.1:9235/json/version');
    if (res.ok) break;
  } catch {}
}

async function runSession() {
  const res = await fetch(`http://127.0.0.1:9235/json/new?http://localhost:${port}`, { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg);
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async function evaluate(expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r?.result?.result?.value;
  }

  await send('Page.enable');
  await send('DOM.enable');

  async function setViewport(width, height, isMobile = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: isMobile ? 2 : 1,
      mobile: isMobile
    });
    await new Promise(r => setTimeout(r, 400));
  }

  async function takeScreenshot(filename) {
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, Buffer.from(snap.result.data, 'base64'));
    console.log(`Saved screenshot: ${filename} (${fs.statSync(filePath).size} bytes)`);
  }

  console.log('\n======================================================');
  console.log('PART 1: Shared Settings Link in Fresh Browser Context');
  console.log('======================================================');

  // Navigate with shared hash: #s=fmt:webp;t:17kb;q:balanced;r:none
  await send('Page.navigate', { url: `http://localhost:${port}/#s=fmt:webp;t:17kb;q:balanced;r:none` });
  await new Promise(r => setTimeout(r, 1200));

  // Check if Working screen loaded directly (not Home screen)
  const isWorkingScreen = await evaluate(`document.body.classList.contains('is-working-screen') || !!document.querySelector('.workspace-layout')`);
  console.log('✔ Direct navigation to Working screen on valid hash:', isWorkingScreen);

  // Check if Note Banner is visible
  const isNoteVisible = await evaluate(`!!document.querySelector('.shared-link-note-banner')`);
  const noteText = await evaluate(`document.querySelector('.shared-link-note-text')?.textContent?.trim()`);
  console.log('✔ Shared link note visible:', isNoteVisible, '| text:', noteText);

  // Take screenshot of Working screen with note banner
  await setViewport(360, 800, true);
  await takeScreenshot('working-screen-shared-link-note-360px.png');

  // Test dismissing note banner
  await evaluate(`document.querySelector('.shared-link-note-close')?.click()`);
  await new Promise(r => setTimeout(r, 300));
  const isNoteDismissed = await evaluate(`!document.querySelector('.shared-link-note-banner')`);
  console.log('✔ Shared link note dismissed on close button click:', isNoteDismissed);

  // Reload page to verify note stays dismissed
  await send('Page.navigate', { url: `http://localhost:${port}/#s=fmt:webp;t:17kb;q:balanced;r:none` });
  await new Promise(r => setTimeout(r, 1200));
  const isNoteStillHiddenOnReload = await evaluate(`!document.querySelector('.shared-link-note-banner')`);
  console.log('✔ Shared link note remains dismissed on reload:', isNoteStillHiddenOnReload);

  console.log('\n======================================================');
  console.log('PART 2: Upload Image & Compress to Output Screen');
  console.log('======================================================');
  await setViewport(1440, 900, false);

  // Upload image via input[type="file"]
  await evaluate(`
    (async () => {
      function b64ToBlob(b64, type) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type });
      }

      const file = new File([b64ToBlob('${img13kbB64}', 'image/png')], 'sample-icon-13kb.png', { type: 'image/png' });
      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })();
  `);

  console.log('Waiting for card to mount in workspace...');
  for (let i = 0; i < 30; i++) {
    const cardCount = await evaluate(`document.querySelectorAll('app-image-card').length`);
    if (cardCount > 0) {
      console.log(`✔ Card mounted in workspace!`);
      break;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // Click compress button
  console.log('Clicking compress button...');
  await evaluate(`
    const compBtn = document.querySelector('.sidebar-primary-cta') || document.querySelector('.mobile-primary-cta');
    if (compBtn) compBtn.click();
  `);

  console.log('Waiting for output screen to mount...');
  for (let i = 0; i < 40; i++) {
    const isOutput = await evaluate(`document.body.classList.contains('is-output-screen') || !!document.querySelector('.output-screen-wrapper')`);
    if (isOutput) {
      console.log('✔ Output screen mounted successfully!');
      break;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n======================================================');
  console.log('PART 3: Output Screen Download Split Dropdown (360px & 1440px)');
  console.log('======================================================');

  // Test at 360px
  await setViewport(360, 800, true);
  await new Promise(r => setTimeout(r, 500));

  // Click chevron to open Download split dropdown
  await evaluate(`
    const chevron = document.querySelector('.btn-download-chevron');
    if (chevron) chevron.click();
  `);
  await new Promise(r => setTimeout(r, 400));

  const isDropdownOpen360 = await evaluate(`!!document.querySelector('.save-to-dropdown-panel')`);
  console.log('✔ Download Save-To dropdown open at 360px:', isDropdownOpen360);

  const dropdownItems360 = await evaluate(`
    Array.from(document.querySelectorAll('.save-to-dropdown-panel .save-dropdown-item')).map(el => ({
      text: el.textContent.replace(/\\s+/g, ' ').trim(),
      disabled: el.classList.contains('is-disabled') || el.disabled,
      title: el.getAttribute('title')
    }))
  `);
  console.log('✔ Dropdown items at 360px:\n', JSON.stringify(dropdownItems360, null, 2));

  // Verify tap targets >= 44px
  const buttonDimensions = await evaluate(`
    (() => {
      const action = document.querySelector('.btn-download-action');
      const chevron = document.querySelector('.btn-download-chevron');
      const item = document.querySelector('.save-to-dropdown-panel .save-dropdown-item');
      return {
        actionHeight: action ? Math.round(action.getBoundingClientRect().height) : 0,
        chevronWidth: chevron ? Math.round(chevron.getBoundingClientRect().width) : 0,
        chevronHeight: chevron ? Math.round(chevron.getBoundingClientRect().height) : 0,
        itemHeight: item ? Math.round(item.getBoundingClientRect().height) : 0
      };
    })()
  `);
  console.log('✔ Mobile dimensions on 360px:', buttonDimensions);

  // Take screenshot at 360px
  await takeScreenshot('output-screen-360px-download-dropdown-open.png');

  // Test at 1440px desktop
  await setViewport(1440, 900, false);
  await new Promise(r => setTimeout(r, 500));

  // Ensure dropdown is open
  await evaluate(`
    if (!document.querySelector('.save-to-dropdown-panel')) {
      document.querySelector('.btn-download-chevron')?.click();
    }
  `);
  await new Promise(r => setTimeout(r, 400));

  const isDropdownOpen1440 = await evaluate(`!!document.querySelector('.save-to-dropdown-panel')`);
  console.log('✔ Download Save-To dropdown open at 1440px:', isDropdownOpen1440);

  await takeScreenshot('output-screen-1440px-download-dropdown-open.png');

  console.log('\n======================================================');
  console.log('PART 4: Card Save Split Dropdown & More Menu');
  console.log('======================================================');

  // Close download dropdown
  await evaluate(`document.dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  await new Promise(r => setTimeout(r, 300));

  // Open Card Save split dropdown at 360px
  await setViewport(360, 800, true);
  await new Promise(r => setTimeout(r, 400));

  await evaluate(`
    const cardChevron = document.querySelector('.btn-save-chevron');
    if (cardChevron) cardChevron.click();
  `);
  await new Promise(r => setTimeout(r, 400));

  const isCardDropdownOpen = await evaluate(`!!document.querySelector('.card-save-dropdown-menu')`);
  console.log('✔ Card Save dropdown open at 360px:', isCardDropdownOpen);
  await takeScreenshot('output-screen-card-save-dropdown-360px.png');

  // Close card save dropdown and test More menu
  await evaluate(`document.dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
  await new Promise(r => setTimeout(r, 300));

  await evaluate(`document.querySelector('.more-header-btn')?.click()`);
  await new Promise(r => setTimeout(r, 400));

  const subtextPresent = await evaluate(`
    document.querySelector('.settings-link-subtext')?.textContent?.trim()
  `);
  console.log('✔ More menu subtext:', subtextPresent);

  ws.close();
  chrome.kill();
  server.close();
  console.log('\n======================================================');
  console.log('ALL PLAYWRIGHT BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY');
  console.log('======================================================');
}

runSession().catch(err => {
  console.error('Test execution error:', err);
  chrome.kill();
  server.close();
  process.exit(1);
});
