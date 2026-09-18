const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function getBrowserPath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome or Edge browser found');
}

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'assets', 'screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const PAGES = [
  { name: '01_landing_page.png', url: 'http://localhost:3000/' },
  { name: '02_mission_overview.png', url: 'http://localhost:3000/overview' },
  { name: '03_tactical_navigation_ecdis.png', url: 'http://localhost:3000/navigation' },
  { name: '04_sea_ice_intelligence.png', url: 'http://localhost:3000/sea-ice' },
  { name: '05_iceberg_radar_tracking.png', url: 'http://localhost:3000/icebergs' },
  { name: '06_route_optimization_pareto.png', url: 'http://localhost:3000/routes' },
  { name: '07_model_analytics_intelligence.png', url: 'http://localhost:3000/intelligence' },
  { name: '08_risk_analysis_polaris.png', url: 'http://localhost:3000/analysis' },
  { name: '09_alerts_tactical_control.png', url: 'http://localhost:3000/alerts' },
  { name: '10_imo_compliance_reports.png', url: 'http://localhost:3000/reports' }
];

async function captureAll() {
  const browserPath = getBrowserPath();
  console.log(`Launching browser: ${browserPath}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (const item of PAGES) {
    const destPath = path.join(OUTPUT_DIR, item.name);
    console.log(`Navigating to ${item.url}...`);
    try {
      await page.goto(item.url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch (e) {
      console.log(`Networkidle timeout on ${item.url}, proceeding anyway...`);
    }

    // Wait 3.5 seconds for Leaflet tiles, SVG vectors, animations, and telemetry to settle
    await new Promise(r => setTimeout(r, 3500));

    await page.screenshot({ path: destPath, fullPage: false });
    const stats = fs.statSync(destPath);
    console.log(`Saved screenshot: ${item.name} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  await browser.close();
  console.log('All screenshots captured successfully in:', OUTPUT_DIR);
}

captureAll().catch(err => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
