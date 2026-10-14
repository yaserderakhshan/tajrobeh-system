// آزمون دیداری «کارهای بیشتر» بخش درمانگر در مینی‌اپ (برگهٔ ۵۰۳۸۸۶) با نسخهٔ همین شاخه، ۳۹۰ و ۱۲۸۰.
// برگه با نمای آزمایشی خودش (?preview) باز می‌شود؛ فقط در مرورگر آزمون نقش نمای آزمایشی «درمانگر» می‌شود تا کاشی بخش درمانگر بیاید.
// هیچ درخواستی به بات نمی‌رود (همهٔ درخواست‌های شبکه جز خود برگه بسته‌اند). بعد «⋯ کارهای بیشتر» باز می‌شود و سه چک مسدودکننده:
// بیرون‌زدگی (scrollWidth > clientWidth یا بیرون از کادر والد)، «…» یا text-overflow، و کنتراست کمتر از ۴٫۵. اسکرین‌شات هر دو اندازه در OUT.
//   OUT=docs/site/app-caps node site/tools/app-caps-visual.mjs
// اگر فونت برند در دسترس مرورگر آزمون نباشد، فالبک سیستم دیده می‌شود (فایل فونت در این مخزن نیست).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const req = createRequire(import.meta.url);
let pw;
try { pw = req('playwright'); } catch { pw = req(join(execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium } = pw;

const OUT = process.env.OUT || 'docs/site/app-caps';
const URL0 = 'https://tajrobeh.life/app/?preview';
const MIN = 4.5;
const WANT = process.env.WANT || '🩺 ارجاع به روان‌پزشک';
mkdirSync(OUT, { recursive: true });

const page0 = readFileSync('site/pages/503886-app.html', 'utf8');
/* فقط در مرورگر آزمون: نقش نمای آزمایشی */
const body = page0.replace("roles: ['مراجع'], role: 'مراجع', roleLabels: ['مراجع']", "roles: ['درمانگر'], role: 'درمانگر', roleLabels: ['درمانگر']");
if (body === page0) throw new Error('نقش نمای آزمایشی در برگه پیدا نشد');
const doc = '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<style>body{margin:0;background:#fefefe;font-family:\'Anjoman Max\',\'Vazirmatn\',system-ui,sans-serif}</style></head><body>' + body + '</body></html>';

function audit(MIN) {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 254, g: 254, b: 254, a: 1 }; };
  const box = document.getElementById('tjCapsBox');
  const out = { over: [], ell: [], low: [] };
  if (!box) return { err: 'tjCapsBox نیست' };
  for (const el of box.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') out.over.push(el.className + ' ' + el.textContent.trim().slice(0, 30));
    const p = el.parentElement ? el.parentElement.getBoundingClientRect() : null;
    if (p && (r.left < p.left - 1 || r.right > p.right + 1)) out.over.push('بیرون از والد: ' + el.textContent.trim().slice(0, 30));
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (own) {
      if (cs.textOverflow === 'ellipsis' || /…/.test(el.textContent)) out.ell.push(el.textContent.trim().slice(0, 30));
      const fg = parse(cs.color), bg = bgOf(el);
      if (fg) { const a = lum(fg), b = lum(bg), k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); if (k < MIN) out.low.push(el.textContent.trim().slice(0, 30) + ' ' + k.toFixed(2)); }
    }
  }
  out.labels = [...box.querySelectorAll('#tjCaps button')].map((b) => b.textContent.trim());
  return out;
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
let bad = 0;
for (const w of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2, locale: 'fa-IR' });
  const pg = await ctx.newPage();
  await pg.route('**/*', (r) => (r.request().url().startsWith(URL0) ? r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: doc }) : r.abort()));
  await pg.goto(URL0, { waitUntil: 'domcontentloaded' });
  await pg.waitForSelector('[data-s="ther"]', { state: 'attached', timeout: 15000 });
  await pg.$eval('[data-s="ther"]', (b) => b.click());   /* کاشی در فهرست تاشدهٔ خانه است */
  await pg.waitForSelector('#tjCapsHd', { timeout: 15000 });
  await pg.click('#tjCapsHd');
  await pg.waitForTimeout(400);
  const a = await pg.evaluate(audit, MIN);
  const has = (a.labels || []).includes(WANT);
  const okw = !a.err && has && !a.over.length && !a.ell.length && !a.low.length;
  if (!okw) bad++;
  await pg.locator('#tjCapsBox').screenshot({ path: join(OUT, `caps-${w}.png`) });
  await pg.screenshot({ path: join(OUT, `page-${w}.png`), fullPage: true });
  writeFileSync(join(OUT, `audit-${w}.json`), JSON.stringify(a, null, 1));
  console.log(`${w}: ${okw ? 'سبز' : 'قرمز'} · دکمهٔ «${WANT}»: ${has ? 'هست' : 'نیست'} · بیرون‌زدگی ${a.over ? a.over.length : '?'} · «…» ${a.ell ? a.ell.length : '?'} · کنتراست پایین ${a.low ? a.low.length : '?'} · ${(a.labels || []).length} دکمه`);
  await ctx.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
