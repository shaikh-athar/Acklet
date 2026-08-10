const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const url = process.argv[2];
  const outputPath = process.argv[3];

  if (!url || !outputPath) {
    console.error('Usage: node capture.js <url> <outputPath>');
    process.exit(1);
  }

  // Ensure target directory exists
  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`Launching browser to capture: ${url}`);
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set user agent and bypass warning screens (like ngrok warning page if hit)
    await page.setUserAgent('AckletScreenshotBot/1.0');
    await page.setExtraHTTPHeaders({
      'ngrok-skip-browser-warning': 'true'
    });

    // Navigate to tool URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Wait 3 seconds for animations/renders/dynamic JS to settle
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Capture screenshot
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`Screenshot saved successfully: ${outputPath}`);
  } catch (error) {
    console.error('Failed to capture screenshot:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

capture();
