import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

export function createIcoFromPngs(pngBuffers: { width: number; height: number; buffer: Buffer }[]): Buffer {
  const numImages = pngBuffers.length;
  const headerSize = 6 + 16 * numImages;
  let currentOffset = headerSize;
  const entryBuffers: Buffer[] = [];
  const imageBuffers: Buffer[] = [];

  for (const img of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(currentOffset, 12);

    entryBuffers.push(entry);
    imageBuffers.push(img.buffer);
    currentOffset += img.buffer.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  return Buffer.concat([header, ...entryBuffers, ...imageBuffers]);
}

export async function generateSiteIcons(): Promise<{
  ico: Buffer;
  appleTouch: Buffer;
  logo512: Buffer;
  avatar1080: Buffer;
  cover1640: Buffer;
  svg: string;
}> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#07090e"/><circle cx="32" cy="32" r="22" fill="none" stroke="rgba(248,246,240,0.16)" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="32" cy="32" r="15" fill="none" stroke="#f8f6f0" stroke-width="5"/><circle cx="32" cy="32" r="6.5" fill="#e11d48"/></svg>`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // 1. Favicon PNGs 48x48 and 96x96
    const faviconHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden">${svg}</body></html>`;

    const page48 = await browser.newPage({ viewport: { width: 48, height: 48 } });
    await page48.setContent(faviconHtml, { waitUntil: 'load' });
    const buf48 = await page48.screenshot({ type: 'png', omitBackground: true });
    await page48.close();

    const page96 = await browser.newPage({ viewport: { width: 96, height: 96 } });
    await page96.setContent(faviconHtml, { waitUntil: 'load' });
    const buf96 = await page96.screenshot({ type: 'png', omitBackground: true });
    await page96.close();

    const ico = createIcoFromPngs([
      { width: 48, height: 48, buffer: buf48 },
      { width: 96, height: 96, buffer: buf96 },
    ]);

    // 2. Apple Touch Icon 180x180
    const appleHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#07090e;overflow:hidden">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
        <defs>
          <radialGradient id="g" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#131c2e"/>
            <stop offset="100%" stop-color="#07090e"/>
          </radialGradient>
        </defs>
        <rect width="180" height="180" fill="url(#g)"/>
        <circle cx="90" cy="90" r="64" fill="none" stroke="rgba(248,246,240,0.16)" stroke-width="2" stroke-dasharray="6 6"/>
        <circle cx="90" cy="90" r="44" fill="none" stroke="#f8f6f0" stroke-width="14"/>
        <circle cx="90" cy="90" r="19" fill="#e11d48"/>
      </svg>
    </body></html>`;
    const page180 = await browser.newPage({ viewport: { width: 180, height: 180 } });
    await page180.setContent(appleHtml, { waitUntil: 'load' });
    const appleTouch = await page180.screenshot({ type: 'png' });
    await page180.close();

    // 3. Logo 512x512 "BLINDSPOT."
    const logoHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Playfair+Display:wght@900&display=block">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        width: 512px; height: 512px;
        background: radial-gradient(circle at 50% 35%, #131c31 0%, #07090e 75%);
        color: #f8f6f0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: "Playfair Display", Georgia, serif; text-align: center; overflow: hidden;
        position: relative;
      }
      .symbol { width: 156px; height: 156px; margin-bottom: 26px; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.55)); }
      .title { font-size: 56px; font-weight: 900; letter-spacing: 0.02em; line-height: 1; text-transform: uppercase; color: #f8f6f0; }
      .title b { color: #e11d48; font-weight: 900; }
      .sub { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase; color: #94a3b8; margin-top: 16px; }
    </style></head><body>
      <svg class="symbol" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="16" fill="#0d131f" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="23" fill="none" stroke="rgba(248,246,240,0.18)" stroke-width="1.2" stroke-dasharray="3 3"/>
        <circle cx="32" cy="32" r="15.5" fill="none" stroke="#f8f6f0" stroke-width="5"/>
        <circle cx="32" cy="32" r="6.8" fill="#e11d48"/>
      </svg>
      <div class="title">BLINDSPOT<b>.</b></div>
      <div class="sub">Global Intelligence</div>
    </body></html>`;
    const page512 = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await page512.setContent(logoHtml, { waitUntil: 'load' });
    await page512.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    const logo512 = await page512.screenshot({ type: 'png' });
    await page512.close();

    // 4. Social Profile Avatar 1080x1080 (optimized for circular crop on Instagram & Facebook)
    const avatarHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Playfair+Display:wght@900&display=block">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        width: 1080px; height: 1080px;
        background: radial-gradient(circle at 50% 38%, #162038 0%, #0b101d 55%, #06080d 100%);
        color: #f8f6f0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        text-align: center; overflow: hidden; position: relative;
      }
      .ring-outer {
        position: absolute; width: 920px; height: 920px; border-radius: 50%;
        border: 2px solid rgba(248,246,240,0.07);
      }
      .ring-dashed {
        position: absolute; width: 820px; height: 820px; border-radius: 50%;
        border: 2px dashed rgba(225,29,72,0.28);
      }
      .glow {
        position: absolute; width: 540px; height: 540px; border-radius: 50%;
        background: radial-gradient(circle, rgba(225,29,72,0.18) 0%, transparent 70%);
        top: 150px;
      }
      .emblem {
        width: 290px; height: 290px; margin-bottom: 36px; position: relative; z-index: 2;
        filter: drop-shadow(0 20px 44px rgba(0,0,0,0.65));
      }
      .wordmark {
        font-family: "Playfair Display", Georgia, serif;
        font-size: 118px; font-weight: 900; letter-spacing: -0.01em; line-height: 0.94;
        text-transform: uppercase; color: #f8f6f0; position: relative; z-index: 2;
        text-shadow: 0 8px 30px rgba(0,0,0,0.6);
      }
      .wordmark b { color: #e11d48; }
      .rule {
        width: 120px; height: 6px; background: #e11d48; border-radius: 3px;
        margin: 28px auto 22px; position: relative; z-index: 2;
      }
      .kicker {
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 24px; font-weight: 800; letter-spacing: 0.34em;
        text-transform: uppercase; color: #cbd5e1; position: relative; z-index: 2;
      }
    </style></head><body>
      <div class="ring-outer"></div>
      <div class="ring-dashed"></div>
      <div class="glow"></div>
      <svg class="emblem" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="#0b101b" stroke="rgba(248,246,240,0.16)" stroke-width="2"/>
        <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(248,246,240,0.22)" stroke-width="1.8" stroke-dasharray="5 5"/>
        <circle cx="60" cy="60" r="28" fill="none" stroke="#f8f6f0" stroke-width="9.5"/>
        <circle cx="60" cy="60" r="12.5" fill="#e11d48"/>
      </svg>
      <div class="wordmark">BLIND<br>SPOT<b>.</b></div>
      <div class="rule"></div>
      <div class="kicker">GLOBAL NEWS</div>
    </body></html>`;
    const page1080 = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
    await page1080.setContent(avatarHtml, { waitUntil: 'load' });
    await page1080.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    const avatar1080 = await page1080.screenshot({ type: 'jpeg', quality: 95 });
    await page1080.close();

    // 5. Facebook Cover Photo 1640x924 (safe zone centered for both desktop & mobile crops)
    const coverHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&family=Playfair+Display:wght@900&display=block">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        width: 1640px; height: 924px;
        background: radial-gradient(ellipse at 50% 45%, #152036 0%, #0a0f1c 58%, #06080f 100%);
        color: #f8f6f0;
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        position: relative; overflow: hidden; text-align: center;
      }
      .grid {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
        background-size: 82px 82px;
      }
      .radar1 {
        position: absolute; width: 1100px; height: 1100px; border-radius: 50%;
        border: 1.5px solid rgba(255,255,255,0.05);
      }
      .radar2 {
        position: absolute; width: 760px; height: 760px; border-radius: 50%;
        border: 1.5px dashed rgba(225,29,72,0.22);
      }
      .glow {
        position: absolute; width: 900px; height: 420px; border-radius: 50%;
        background: radial-gradient(circle, rgba(225,29,72,0.16) 0%, transparent 70%);
      }
      .top-bar {
        position: absolute; top: 0; left: 0; right: 0; height: 6px;
        background: linear-gradient(90deg, #07090e 0%, #e11d48 50%, #07090e 100%);
      }
      .content {
        position: relative; z-index: 2;
        display: flex; flex-direction: column; align-items: center;
        padding: 0 180px;
      }
      .badge-row {
        display: inline-flex; align-items: center; gap: 12px;
        background: rgba(225,29,72,0.14); border: 1px solid rgba(225,29,72,0.45);
        padding: 10px 24px; border-radius: 999px; margin-bottom: 28px;
      }
      .dot {
        width: 11px; height: 11px; border-radius: 50%; background: #e11d48;
        box-shadow: 0 0 12px #e11d48;
      }
      .badge-text {
        font-size: 16px; font-weight: 800; letter-spacing: 0.24em; color: #fda4af;
        text-transform: uppercase;
      }
      .brand-row {
        display: flex; align-items: center; gap: 28px; margin-bottom: 20px;
      }
      .icon { width: 108px; height: 108px; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.5)); }
      .title {
        font-family: "Playfair Display", Georgia, serif;
        font-size: 116px; font-weight: 900; letter-spacing: -0.015em; line-height: 1;
        color: #f8f6f0; text-transform: uppercase;
        text-shadow: 0 10px 34px rgba(0,0,0,0.65);
      }
      .title b { color: #e11d48; }
      .tagline {
        font-size: 27px; font-weight: 700; letter-spacing: 0.18em;
        text-transform: uppercase; color: #e2e8f0; margin-bottom: 34px;
      }
      .divider {
        width: 180px; height: 4px; background: #e11d48; border-radius: 2px; margin-bottom: 32px;
      }
      .desks {
        display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: center;
        font-size: 16px; font-weight: 800; letter-spacing: 0.18em; color: #94a3b8;
        text-transform: uppercase; margin-bottom: 38px;
      }
      .desks i { color: #e11d48; font-style: normal; }
      .domain {
        font-size: 18px; font-weight: 800; letter-spacing: 0.22em; color: #f8f6f0;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14);
        padding: 12px 30px; border-radius: 8px;
      }
    </style></head><body>
      <div class="top-bar"></div>
      <div class="grid"></div>
      <div class="radar1"></div>
      <div class="radar2"></div>
      <div class="glow"></div>
      <div class="content">
        <div class="badge-row"><span class="dot"></span><span class="badge-text">INDEPENDENT GLOBAL INTELLIGENCE</span></div>
        <div class="brand-row">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="16" fill="#0d131f" stroke="rgba(255,255,255,0.16)" stroke-width="1.5"/>
            <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(248,246,240,0.2)" stroke-width="1.3" stroke-dasharray="3 3"/>
            <circle cx="32" cy="32" r="15" fill="none" stroke="#f8f6f0" stroke-width="5"/>
            <circle cx="32" cy="32" r="6.8" fill="#e11d48"/>
          </svg>
          <div class="title">BLINDSPOT<b>.</b></div>
        </div>
        <div class="tagline">WHAT MAINSTREAM COVERAGE LEAVES OUT</div>
        <div class="divider"></div>
        <div class="desks">
          <span>GEOPOLITICS</span><i>·</i>
          <span>GLOBAL ECONOMY</span><i>·</i>
          <span>SECURITY &amp; DEFENSE</span><i>·</i>
          <span>TECHNOLOGY &amp; AI</span><i>·</i>
          <span>POWER &amp; SOCIETY</span>
        </div>
        <div class="domain">BLINDSPOTGLOBAL.PAGES.DEV</div>
      </div>
    </body></html>`;
    const pageCover = await browser.newPage({ viewport: { width: 1640, height: 924 } });
    await pageCover.setContent(coverHtml, { waitUntil: 'load' });
    await pageCover.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    const cover1640 = await pageCover.screenshot({ type: 'jpeg', quality: 95 });
    await pageCover.close();

    return { ico, appleTouch, logo512, avatar1080, cover1640, svg };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('[Icons] Generating favicon.ico, apple-touch-icon.png, logo-512.png, brand-avatar-1080.jpg, and brand-cover-1640x924.jpg...');
  const icons = await generateSiteIcons();

  const publicDir = path.join(process.cwd(), 'public');
  const siteDir = path.join(process.cwd(), 'site');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(siteDir, { recursive: true });

  for (const dir of [publicDir, siteDir]) {
    fs.writeFileSync(path.join(dir, 'favicon.ico'), icons.ico);
    fs.writeFileSync(path.join(dir, 'favicon.svg'), icons.svg);
    fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), icons.appleTouch);
    fs.writeFileSync(path.join(dir, 'logo-512.png'), icons.logo512);
  }
  fs.writeFileSync(path.join(publicDir, 'brand-avatar-1080.jpg'), icons.avatar1080);
  fs.writeFileSync(path.join(publicDir, 'brand-cover-1640x924.jpg'), icons.cover1640);

  console.log('[Icons] Generated successfully in public/ and site/:');
  console.log(' - favicon.ico:', icons.ico.length, 'bytes');
  console.log(' - apple-touch-icon.png:', icons.appleTouch.length, 'bytes');
  console.log(' - logo-512.png:', icons.logo512.length, 'bytes');
  console.log(' - brand-avatar-1080.jpg:', icons.avatar1080.length, 'bytes');
  console.log(' - brand-cover-1640x924.jpg:', icons.cover1640.length, 'bytes');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[Icons] Error generating icons:', err);
    process.exit(1);
  });
}
