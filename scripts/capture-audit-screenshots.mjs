// scripts/capture-audit-screenshots.mjs
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2] || 'docs/ui-audit';
fs.mkdirSync(outDir, { recursive: true });

// Ensure fixtures exist
const fixturesDir = '/tmp/audit-fixtures';
fs.mkdirSync(fixturesDir, { recursive: true });
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';
fs.writeFileSync(path.join(fixturesDir, 'photo-sample.png'), Buffer.from(pngBase64, 'base64'));
const jpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAKAAoBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
fs.writeFileSync(path.join(fixturesDir, 'camera-shot.jpg'), Buffer.from(jpegBase64, 'base64'));
const webpBase64 = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
fs.writeFileSync(path.join(fixturesDir, 'graphic.webp'), Buffer.from(webpBase64, 'base64'));
fs.writeFileSync(path.join(fixturesDir, 'corrupt-file.png'), Buffer.from('NOT_AN_IMAGE_CONTENT'));

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--user-data-dir=/tmp/chrome-audit-profile-' + Date.now()
]);

// Wait for Chrome to be ready
let ready = false;
for (let i = 0; i < 25; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    if (res.ok) {
      ready = true;
      break;
    }
  } catch {}
}

if (!ready) {
  chrome.kill();
  throw new Error('Chrome did not start in time');
}

async function runSession(viewName, width, height, isMobile) {
  const res = await fetch('http://127.0.0.1:9222/json/new?http://localhost:8085', { method: 'PUT' });
  const target = await res.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let idCounter = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    const id = ++idCounter;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: isMobile ? 2 : 1,
    mobile: isMobile
  });

  async function takeScreenshot(name) {
    await new Promise(r => setTimeout(r, 600));
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const filename = path.join(outDir, `${name}-${viewName}.png`);
    fs.writeFileSync(filename, Buffer.from(snap.data, 'base64'));
    console.log(`Saved ${filename} (${fs.statSync(filename).size} bytes)`);
  }

  // 1. Empty state
  await new Promise(r => setTimeout(r, 1200));
  await takeScreenshot('empty');

  // Helper to get file input node
  const doc = await send('DOM.getDocument');
  const fileInputNode = await send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'input[type=file]'
  });

  // 2. Uploading state (simulate uploading indicator)
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.isUploading) {
          comp.state.isUploading.set(true);
        }
      }
    `
  });
  await takeScreenshot('uploading');

  // Reset uploading
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.isUploading) {
          comp.state.isUploading.set(false);
        }
      }
    `
  });

  // Upload files for real
  if (fileInputNode.nodeId) {
    await send('DOM.setFileInputFiles', {
      files: [
        path.join(fixturesDir, 'photo-sample.png'),
        path.join(fixturesDir, 'camera-shot.jpg'),
        path.join(fixturesDir, 'graphic.webp')
      ],
      nodeId: fileInputNode.nodeId
    });
  }

  // 3. Analyzing state
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.items) {
          const current = comp.state.items();
          if (current.length > 0) {
            comp.state.items.update(items => items.map(it => ({ ...it, status: 'decoding', progressStage: 'Analyzing image characteristics...' })));
          }
        }
      }
    `
  });
  await takeScreenshot('analyzing');

  // 4. Ready state
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.items) {
          comp.state.items.update(items => items.map(it => ({ ...it, status: 'ready', progress: 0, progressStage: undefined })));
        }
      }
    `
  });
  await takeScreenshot('ready');

  // 5. Compressing state
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.items) {
          comp.state.items.update(items => items.map((it, idx) => ({ ...it, status: 'compressing', progress: 45 + idx * 20, progressStage: 'Compressing image...' })));
        }
      }
    `
  });
  await takeScreenshot('compressing');

  // Trigger real compression to reach Done state
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.compressAll) {
          comp.state.compressAll();
        }
      }
    `
  });
  // Wait for compression to finish
  await new Promise(r => setTimeout(r, 2000));
  // 6. Done state
  await takeScreenshot('done');

  // 7. Error state (upload corrupt file or set error item)
  await send('Runtime.evaluate', {
    expression: `
      const root = document.querySelector('app-image-compressor-tool');
      if (root && window.ng) {
        const comp = ng.getComponent(root);
        if (comp?.state?.items) {
          comp.state.items.update(items => [
            {
              id: 'err-1',
              file: new File(['bad'], 'corrupt-image.png', { type: 'image/png' }),
              originalName: 'corrupt-image.png',
              nameWithoutExt: 'corrupt-image',
              originalExtension: 'png',
              detectedFormat: 'png',
              mimeType: 'image/png',
              originalSize: 52428801,
              width: 0,
              height: 0,
              aspectRatio: 1,
              previewUrl: '',
              selected: false,
              status: 'invalid',
              capabilities: { fileAccepted: false, previewSupported: false, compressionSupported: false, description: 'File exceeds 50 MB limit.' }
            },
            ...items
          ]);
        }
      }
    `
  });
  await takeScreenshot('error');

  ws.close();
  await fetch(`http://127.0.0.1:9222/json/close/${target.id}`, { method: 'PUT' }).catch(() => {});
}

try {
  console.log('--- Capturing Desktop Screenshots ---');
  await runSession('desktop', 1280, 900, false);
  console.log('--- Capturing Mobile Screenshots ---');
  await runSession('mobile', 375, 812, true);
  console.log('All screenshots captured successfully in', outDir);
} finally {
  chrome.kill();
}

