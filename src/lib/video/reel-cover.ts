import fs from 'fs';
import path from 'path';
import { ProcessedNews } from '@/types/news';
import { escapeHtml, renderHtmlToJpeg } from '@/lib/news/card-generator';
import { isGenericImageUrl } from '@/lib/news/news-images';
import { chooseReelStyle, ACCENTS } from './reel-infographic';

export async function generateReelCover(news: ProcessedNews): Promise<string> {
  const outputDir = path.join(process.cwd(), 'public', 'news-cards');
  fs.mkdirSync(outputDir, { recursive: true });
  const fileName = `news-${news.id}-${Date.now()}-cover.jpg`;
  const outputPath = path.join(outputDir, fileName);

  const serious = chooseReelStyle(news) === 'serio';
  const accent = ACCENTS[String(news.category)] || '#e11d48';
  const headline = escapeHtml((news.headline || 'GLOBAL BRIEFING').toUpperCase());
  const category = escapeHtml(String(news.category || 'GEOPOLITICS').toUpperCase());
  const size = headline.length > 82 ? 64 : headline.length > 58 ? 74 : headline.length > 38 ? 86 : 96;
  const photoUrl = news.rawImageUrl ? news.rawImageUrl.replace(/&amp;/g, '&') : '';
  const photo = /^https?:\/\//.test(photoUrl) && !isGenericImageUrl(photoUrl) ? escapeHtml(photoUrl) : '';
  const img = (cls: string) => (photo ? `<img class="${cls}" src="${photo}" referrerpolicy="no-referrer" onerror="this.remove()">` : '');

  const base = `
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:1080px;height:1920px;overflow:hidden;color:#f8f6f0;font-family:Inter,Montserrat,"Segoe UI",Arial,sans-serif;position:relative;background:#07090e}
    .brand-bar{position:absolute;top:270px;left:70px;right:70px;display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.14)}
    .logo-wrap{display:flex;align-items:center;gap:16px}
    .dot{width:15px;height:15px;border-radius:50%;background:#e11d48;box-shadow:0 0 14px #e11d48}
    .logo{font-family:"Playfair Display",Georgia,serif;font-size:52px;font-weight:900;letter-spacing:.01em;color:#f8f6f0}
    .logo b{color:#e11d48}
    .tag{display:inline-flex;align-items:center;gap:14px;background:var(--accent);color:#fff;font-size:26px;font-weight:900;letter-spacing:.16em;padding:12px 24px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
    h1{font-size:${size}px;line-height:1.05;font-weight:900;letter-spacing:-.015em;text-transform:uppercase;color:#f8f6f0;
       border-left:8px solid var(--accent);padding-left:26px;
       display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 6px 28px rgba(0,0,0,.65)}
    .bar{width:180px;height:10px;background:var(--accent);margin-top:34px;border-radius:5px}
    .foot{position:absolute;left:70px;right:70px;top:1615px;display:flex;justify-content:space-between;align-items:center;padding-top:20px;border-top:1px solid rgba(255,255,255,.14);font-size:25px;font-weight:800;letter-spacing:.12em;color:#94a3b8}
    .foot b{color:#e11d48}`;

  const html = serious
    ? `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Playfair+Display:wght@900&display=block">
    <style>:root{--accent:#e11d48}${base}
    .bg{position:absolute;inset:-80px;width:calc(100% + 160px);height:calc(100% + 160px);object-fit:cover;filter:blur(46px) saturate(1.1)}
    .dim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,9,14,.82) 0%,rgba(7,9,14,.62) 45%,rgba(7,9,14,.94) 100%)}
    .card{position:absolute;left:70px;right:70px;top:388px;height:660px;border-radius:24px;border:2px solid rgba(255,255,255,.14);overflow:hidden;background:linear-gradient(135deg,#162038,#0a0f1d);box-shadow:0 30px 80px rgba(0,0,0,.68)}
    .card img{width:100%;height:100%;object-fit:cover;object-position:center 30%;display:block}
    .txt{position:absolute;left:70px;right:70px;top:1105px}
    </style></head><body>${img('bg')}<div class="dim"></div>
    <div class="brand-bar"><div class="logo-wrap"><span class="dot"></span><div class="logo">BLINDSPOT<b>.</b></div></div><div class="tag">${category}</div></div>
    <div class="card">${img('')}</div>
    <div class="txt"><h1>${headline}</h1><div class="bar"></div></div>
    <div class="foot"><span>BLINDSPOT BRIEFING</span><b>FULL ANALYSIS · LINK IN BIO →</b></div></body></html>`
    : `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800;900&family=Playfair+Display:wght@900&display=block">
    <style>:root{--accent:${accent}}${base}
    body{background:radial-gradient(ellipse at 50% 28%,#15223e 0%,#0b1224 55%,#060911 100%)}
    body:before{content:"";position:absolute;inset:0;background-image:linear-gradient(to right,rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,.03) 1px,transparent 1px);background-size:72px 72px}
    .frame{position:absolute;left:85px;right:85px;top:395px;height:645px;border:10px solid #f8f6f0;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#162038,#0a0f1d);
      transform:rotate(-1.8deg);box-shadow:0 34px 80px rgba(0,0,0,.62)}
    .frame img{width:100%;height:100%;object-fit:cover;display:block}
    .txt{position:absolute;left:70px;right:70px;top:1105px}
    </style></head><body>
    <div class="brand-bar"><div class="logo-wrap"><span class="dot"></span><div class="logo">BLINDSPOT<b>.</b></div></div><div class="tag">${category}</div></div>
    <div class="frame">${img('')}</div>
    <div class="txt"><h1>${headline}</h1><div class="bar"></div></div>
    <div class="foot"><span>BLINDSPOT BRIEFING</span><b>FULL ANALYSIS · LINK IN BIO →</b></div></body></html>`;

  await renderHtmlToJpeg(html, outputPath, 1080, 1920);
  return `/news-cards/${fileName}`;
}
