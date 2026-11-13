// scripts/capture-hero-verified.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('client/dist/tool-image-compressor/browser');
const outDir = path.resolve('docs/hero-after');
const artifactDir = '/Users/ayaz/.gemini/antigravity/brain/84230a09-cdf3-48d8-b560-e31b618821b9';

fs.mkdirSync(outDir, { recursive: true });

// Minimal static server
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

await new Promise(resolve => server.listen(8089, resolve));
console.log('Static server listening on 8089');

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--remote-debugging-port=9223',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--user-data-dir=/tmp/chrome-hero-' + Date.now()
]);

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch('http://127.0.0.1:9223/json/version');
    if (res.ok) break;
  } catch {}
}

async function capture(width, height, isMobile, theme, filename) {
  const res = await fetch('http://127.0.0.1:9223/json/new?http://localhost:8089', { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const reqId = id++;
    pending.set(reqId, { resolve, reject });
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: isMobile
  });

  // Wait for Angular app to stabilize
  await new Promise(r => setTimeout(r, 1200));

  // Set theme
  await send('Runtime.evaluate', {
    expression: `
      document.documentElement.setAttribute('data-theme', '${theme}');
      document.body.setAttribute('data-theme', '${theme}');
      window.dispatchEvent(new Event('resize'));
    `
  });

  await new Promise(r => setTimeout(r, 600));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  const artPath = path.join(artifactDir, filename);
  fs.writeFileSync(artPath, Buffer.from(shot.data, 'base64'));
  console.log('Saved:', filename);

  ws.close();
  await fetch(`http://127.0.0.1:9223/json/close/${target.id}`, { method: 'PUT' }).catch(() => {});
}

try {
  await capture(1280, 800, false, 'light', 'hero-desktop-light.png');
  await capture(1280, 800, false, 'dark', 'hero-desktop-dark.png');
  await capture(375, 750, true, 'light', 'hero-mobile-light.png');
  await capture(375, 750, true, 'dark', 'hero-mobile-dark.png');
} finally {
  chrome.kill();
  server.close();
}

