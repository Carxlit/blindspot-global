import fs from 'fs';
import path from 'path';
import { chromium, Browser } from 'playwright';
import { ProcessedNews, NewsConfig } from '@/types/news';

let sharedBrowser: Browser | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return sharedBrowser;
}

const CATEGORY_ACCENTS: Record<string, string> = {
  'GEOPOLITICS': '#e11d48',
  'GLOBAL ECONOMY': '#10b981',
  'SECURITY & DEFENSE': '#f59e0b',
  'TECHNOLOGY & AI': '#38bdf8',
  'POWER & SOCIETY': '#a855f7',
};

/**
 * Generates a high-contrast 1200x630 editorial intelligence card (Open Graph / Facebook / X / Telegram).
 */
export async function generateNewsCardImage(
  news: ProcessedNews,
  _config?: Partial<NewsConfig>
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'public', 'news-cards');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `news-${news.id}-${Date.now()}.jpg`;
  const outputPath = path.join(outputDir, fileName);

  const rawCat = (news.category || 'GEOPOLITICS').toUpperCase();
  const categoryName = escapeHtml(rawCat);
  const accent = CATEGORY_ACCENTS[rawCat] || '#e11d48';
  const rawHeadline = escapeHtml(news.headline || 'GLOBAL BRIEFING');
  const subHeadline = escapeHtml(news.subHeadline || news.blindSpotAngle || '');
  const sourceName = escapeHtml((news.sourceName || 'INTERNATIONAL WIRES').toUpperCase());
  const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  const headlineSize = rawHeadline.length > 95 ? 32 : rawHeadline.length > 70 ? 35 : 38;

  const photoUrl = news.rawImageUrl ? news.rawImageUrl.replace(/&amp;/g, '&') : '';
  const photoHtml = photoUrl && /^https?:\/\//.test(photoUrl)
    ? `<div class="photo-placeholder" style="position:absolute;inset:0"></div><img src="${escapeHtml(photoUrl)}" class="photo-img" style="position:relative" referrerpolicy="no-referrer" onerror="this.remove()" />`
    : `<div class="photo-placeholder"></div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&family=Playfair+Display:wght@900&display=block">
  <style>
    :root { --accent: ${accent}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #07090e;
      color: #f8f6f0;
      display: flex;
      flex-direction: column;
    }
    .photo-container {
      width: 1200px;
      height: 365px;
      position: relative;
      overflow: hidden;
      background-color: #07090e;
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 25%;
      filter: contrast(1.06) saturate(1.08);
    }
    .photo-placeholder {
      width: 100%;
      height: 100%;
      background: radial-gradient(circle at 50% 35%, #162238 0%, #07090e 85%);
    }
    .photo-vignette {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(7, 9, 14, 0.65) 0%,
        rgba(7, 9, 14, 0.08) 32%,
        rgba(7, 9, 14, 0.25) 62%,
        rgba(7, 9, 14, 0.98) 100%
      );
    }
    .top-bar {
      position: absolute;
      top: 22px;
      left: 44px;
      right: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10;
    }
    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(7, 9, 14, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 8px 18px;
      border-radius: 8px;
      backdrop-filter: blur(8px);
    }
    .brand-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #e11d48;
      box-shadow: 0 0 10px #e11d48;
    }
    .brand-name {
      font-family: "Playfair Display", Georgia, serif;
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 0.02em;
      color: #f8f6f0;
    }
    .brand-name b { color: #e11d48; }
    .cat-pill {
      background: var(--accent);
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.16em;
      padding: 8px 16px;
      border-radius: 6px;
      text-transform: uppercase;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
    }
    .editorial-section {
      width: 1200px;
      height: 265px;
      background: linear-gradient(180deg, #07090e 0%, #0b101b 100%);
      border-top: 3px solid #e11d48;
      padding: 20px 44px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 20;
    }
    .headline-wrap {
      border-left: 5px solid var(--accent);
      padding-left: 18px;
    }
    .headline {
      color: #f8f6f0;
      font-size: ${headlineSize}px;
      font-weight: 900;
      line-height: 1.13;
      letter-spacing: -0.015em;
      text-transform: uppercase;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .subheadline {
      color: #cbd5e1;
      font-size: 18px;
      font-weight: 500;
      line-height: 1.38;
      padding-left: 23px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 11px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .footer-left { color: #cbd5e1; }
    .footer-right { color: #e11d48; }
  </style>
</head>
<body>
  <div class="photo-container">
    ${photoHtml}
    <div class="photo-vignette"></div>
    <div class="top-bar">
      <div class="brand-pill"><span class="brand-dot"></span><span class="brand-name">BLINDSPOT<b>.</b></span></div>
      <div class="cat-pill">${categoryName}</div>
    </div>
  </div>

  <div class="editorial-section">
    <div class="headline-wrap">
      <h1 class="headline">${rawHeadline}</h1>
    </div>
    <p class="subheadline">${subHeadline}</p>

    <div class="footer">
      <div class="footer-left">SOURCE: ${sourceName} &nbsp;·&nbsp; ${currentDate}</div>
      <div class="footer-right">BLINDSPOTGLOBAL.PAGES.DEV →</div>
    </div>
  </div>
</body>
</html>`;

  await renderHtmlToJpeg(html, outputPath, 1200, 630);
  return `/news-cards/${fileName}`;
}

export async function renderHtmlToJpeg(html: string, outputPath: string, width: number, height: number) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
    } catch {
      // Slow remote image or font: render with whatever loaded
    }
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => undefined);
    await page.waitForTimeout(350);
    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 92 });
  } finally {
    await page.close();
  }
}

export { escapeHtml };

/**
 * Vertical 4:5 card (1080×1350) for Instagram feed posts.
 */
export async function generateInstagramCardImage(news: ProcessedNews): Promise<string> {
  const outputDir = path.join(process.cwd(), 'public', 'news-cards');
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `news-${news.id}-${Date.now()}-ig.jpg`;
  const outputPath = path.join(outputDir, fileName);

  const rawCat = (news.category || 'GEOPOLITICS').toUpperCase();
  const categoryName = escapeHtml(rawCat);
  const accent = CATEGORY_ACCENTS[rawCat] || '#e11d48';
  const headline = escapeHtml(news.headline || 'GLOBAL BRIEFING');
  const subHeadline = escapeHtml(news.subHeadline || news.blindSpotAngle || '');
  const sourceName = escapeHtml((news.sourceName || 'INTERNATIONAL WIRES').toUpperCase());
  const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  const headlineSize = headline.length > 95 ? 52 : headline.length > 65 ? 60 : 68;

  const photoUrl = news.rawImageUrl ? news.rawImageUrl.replace(/&amp;/g, '&') : '';
  const photoHtml = photoUrl && /^https?:\/\//.test(photoUrl)
    ? `<div class="ph" style="position:absolute;inset:0"></div><img src="${escapeHtml(photoUrl)}" class="photo" referrerpolicy="no-referrer" onerror="this.remove()" />`
    : `<div class="ph"></div>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&family=Playfair+Display:wght@900&display=block">
<style>
  :root { --accent: ${accent}; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 1080px; height: 1350px; overflow: hidden; background: #07090e; display: flex; flex-direction: column;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #f8f6f0; }
  .brand { height: 96px; display: flex; align-items: center; justify-content: space-between; padding: 0 56px;
    background: #07090e; border-bottom: 1px solid rgba(255,255,255,.1); }
  .logo-wrap { display: flex; align-items: center; gap: 14px; }
  .dot { width: 13px; height: 13px; border-radius: 50%; background: #e11d48; box-shadow: 0 0 12px #e11d48; }
  .logo { font-family: "Playfair Display", Georgia, serif; font-size: 42px; font-weight: 900; color: #f8f6f0; letter-spacing: .02em; }
  .logo b { color: #e11d48; }
  .date { color: #94a3b8; font-size: 21px; font-weight: 800; letter-spacing: .12em; }
  .photo-box { position: relative; height: 630px; overflow: hidden; background: #07090e; }
  .photo { position: relative; width: 100%; height: 100%; object-fit: cover; object-position: center 28%; filter: contrast(1.06) saturate(1.08); }
  .ph { width: 100%; height: 100%; background: radial-gradient(circle at center, #162238 0%, #07090e 100%); }
  .shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(7,9,14,.25) 0%, transparent 45%, rgba(7,9,14,.98) 100%); }
  .text { flex: 1; background: linear-gradient(180deg, #07090e 0%, #0b101b 100%); border-top: 5px solid #e11d48; padding: 34px 56px 36px; display: flex; flex-direction: column; gap: 22px; }
  .cat { display: inline-flex; align-items: center; gap: 14px; color: var(--accent); font-size: 23px; font-weight: 900; letter-spacing: .18em; }
  .cat i { width: 34px; height: 5px; background: var(--accent); border-radius: 3px; display: block; }
  h1 { color: #f8f6f0; font-size: ${headlineSize}px; font-weight: 900; line-height: 1.08; letter-spacing: -.015em; text-transform: uppercase;
    border-left: 6px solid var(--accent); padding-left: 22px;
    display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  p { color: #cbd5e1; font-size: 27px; font-weight: 500; line-height: 1.36; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,.12); color: #94a3b8; font-size: 20px; font-weight: 800; letter-spacing: .08em; }
  .foot span:last-child { color: #e11d48; }
</style></head><body>
  <div class="brand"><div class="logo-wrap"><span class="dot"></span><div class="logo">BLINDSPOT<b>.</b></div></div><div class="date">${currentDate}</div></div>
  <div class="photo-box">${photoHtml}<div class="shade"></div></div>
  <div class="text">
    <div class="cat"><i></i><span>${categoryName}</span></div>
    <h1>${headline}</h1>
    <p>${subHeadline}</p>
    <div class="foot"><span>SOURCE: ${sourceName}</span><span>FULL ANALYSIS · LINK IN BIO →</span></div>
  </div>
</body></html>`;

  await renderHtmlToJpeg(html, outputPath, 1080, 1350);
  return `/news-cards/${fileName}`;
}
