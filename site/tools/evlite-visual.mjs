// آزمون دیداری کشوی جزئیات رویداد سبک (J-07) روی خود tajrobeh.life/school/events/ (Playwright، ۳۹۰ و ۱۲۸۰).
// برگهٔ زنده گرفته می‌شود و فقط در مرورگر آزمون: تابع liveX و CSS «.evph» همین شاخه (site/pages/505409-events.html) جای نسخهٔ زنده
// می‌نشیند و یک رویداد milestone ساختگی با سه عکس (از رسانه‌های موجود سایت) و بلندترین نقل‌قول و نام اعتبار به evData اضافه می‌شود.
// بعد کشوی همان رویداد با #ev= باز می‌شود و سه چک مسدودکننده: بیرون‌زدگی (scrollWidth > clientWidth یا بیرون از کادر کشو)،
// «…» یا text-overflow، و کنتراست کمتر از ۴٫۵. اسکرین‌شات هر دو اندازه در OUT.
//   OUT=docs/site/evlite node site/tools/evlite-visual.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const URL0 = process.env.SITE_URL || 'https://tajrobeh.life/school/events/';
const OUT = process.env.OUT || 'docs/site/evlite';
const MIN = 4.5;
mkdirSync(OUT, { recursive: true });
const src = readFileSync('site/pages/505409-events.html', 'utf8');
const phLine = src.match(/function liveX\(e\)\{var h='';\n([^\n]*)\n/)[1].trim();   /* برگهٔ زنده ممکن است فشرده (بی خط تازه) باشد */
const cssAdd = src.match(/\n\.evph\{[^\n]*\n\.evph a\{[^\n]*\n\.evph img\{[^\n]*\n\.tj2 \[data-g=\"class\"\] \.tb\{[^}]*\}/)[0];   /* گالری و رنگ برچسب «کلاس‌ها» (۴٫۲۹ ← ۵٫۰۱) */
const ID = 'evl-visual-test-2026';

function patch(html) {
  const a = html.replace(/function liveX\(e\)\{var h='';\s*(if\(e\.ph\)\{if\(e\.ph\.length\)\{.*?h\+='<\/div>';\}\}\s*)?/, () => "function liveX(e){var h='';" + phLine + ' ');
  if (a === html) { writeFileSync(join(OUT, 'live-body.html'), html); throw new Error('liveX در برگهٔ زنده پیدا نشد (' + html.length + ' نویسه؛ live-body.html)'); }
  const i = a.indexOf('.fbk blockquote{'); if (i < 0) throw new Error('.fbk در برگهٔ زنده نیست');
  const j = a.indexOf('}', i) + 1;
  let b = a.slice(0, j) + cssAdd + a.slice(j);
  const m = b.match(/(<script type="application\/json" id="evData">)([\s\S]*?)(<\/script>)/);
  const D = JSON.parse(m[2]);
  const imgs = D.events.filter((e) => e.img).map((e) => '/wp-content/uploads/2026/09/' + e.img).slice(0, 3);
  D.events.push({ i: ID, d: '2026-10-08', t: '', ttl: 'جلسهٔ اول دورهٔ جامع درمان هیجان‌مدار و جشن کوچک شکوفه‌های حلقهٔ اول در کنار هم',
    k: 'milestone', c: 'EFT', a: 'members', ap: 'eft', p: [], pl: '', g: 'class', sh: 'جلسهٔ اول EFT و جشن شکوفه‌ها', ig: [],
    s: 'حلقهٔ اول دورهٔ جامع درمان هیجان‌مدار با تمرین جفت‌ها و گفت‌وگوی گرم حاضران شروع شد. در پایان جلسه، شکوفه‌های حلقه کنار هم جشن کوچکی گرفتند و از انتظارشان برای ماه‌های پیش رو گفتند.',
    fb: [{ name: 'نام بلند یک مشارکت‌کنندهٔ نمونه', text: 'به نظرم بهترین بخش جلسه تمرین جفت‌ها بود، چون برای اولین بار دیدم هیجان‌ها چطور در یک گفت‌وگوی ساده جابه‌جا می‌شوند و چقدر شنیده شدن آرام‌کننده است، حتی وقتی هنوز همدیگر را خوب نمی‌شناسیم.' }],
    ph: imgs.map((u, k) => ({ u, t: u, a: 'تصویر نمونهٔ ' + (k + 1) })) });
  b = b.replace(m[0], m[1] + JSON.stringify(D).replace(/<\//g, '<\\/') + m[3]);
  return b;
}

function audit(MIN) {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const bgOf = (el) => { const st = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { st.push(c); if (c.a >= 1) break; } }
    let bg = { r: 254, g: 254, b: 254, a: 1 }; for (let i = st.length - 1; i >= 0; i--) bg = blend(st[i], bg); return bg; };
  const pn = document.querySelector('#evDr .pn'); if (!pn) return { err: 'کشو باز نشد' };
  const box = pn.getBoundingClientRect(), bad = [], over = [], cut = [];
  const all = [pn, ...pn.querySelectorAll('*')];
  for (const el of all) {
    const r = el.getBoundingClientRect(), st = getComputedStyle(el);
    if (!r.width || !r.height || st.display === 'none' || st.visibility === 'hidden') continue;
    if (el.scrollWidth > el.clientWidth + 1 && st.overflowX !== 'auto' && st.overflowX !== 'scroll' && el.tagName !== 'svg' && el.closest('svg') === null) over.push(el.tagName + '.' + el.className + ' ' + el.scrollWidth + '>' + el.clientWidth);
    if (r.left < box.left - 1 || r.right > box.right + 1) over.push('بیرون از کشو: ' + el.tagName + '.' + el.className);
    if (st.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) cut.push(el.textContent.trim().slice(0, 40));
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own) continue;
    if (/…/.test(own)) cut.push(own.slice(0, 40));
    const fg = parse(st.color); if (!fg) continue;
    const bg = bgOf(el), L1 = lum(blend(fg, bg)), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < MIN) bad.push({ text: own.slice(0, 30), ratio: Math.round(ratio * 100) / 100 });
  }
  const ph = [...pn.querySelectorAll('.evph img')].map((i) => ({ w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height), ok: i.complete && i.naturalWidth > 0 }));
  const q = pn.querySelector('.fbk blockquote') ? 1 : 0;
  return { bad, over, cut, ph, q };
}

const fails = [], report = [];
const browser = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
for (const [name, vp] of [['390', { width: 390, height: 844, isMobile: true, hasTouch: true }], ['1280', { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1, locale: 'fa-IR' });
  const page = await ctx.newPage();
  await page.route((u) => u.pathname === '/school/events/', async (route) => {
    const res = await route.fetch(); const body = patch(await res.text());
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=UTF-8' } });
  });
  await page.goto(URL0 + '?tjv=' + Date.now() + '#ev=' + ID, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('#evDr.on .pn h2', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(audit, MIN);
  const shot = join(OUT, 'drawer-' + name + '.png');
  await page.locator('#evDr .pn').screenshot({ path: shot }).catch(async () => { await page.screenshot({ path: shot }); });
  await page.screenshot({ path: join(OUT, 'view-' + name + '.png') });
  report.push({ size: name, ...r });
  if (r.err) fails.push(name + ': ' + r.err);
  if (r.over && r.over.length) fails.push(name + ' بیرون‌زدگی: ' + r.over.join(' | '));
  if (r.cut && r.cut.length) fails.push(name + ' بریده: ' + r.cut.join(' | '));
  if (r.bad && r.bad.length) fails.push(name + ' کنتراست: ' + JSON.stringify(r.bad));
  if (!r.ph || r.ph.length !== 3 || r.ph.some((p) => !p.ok)) fails.push(name + ' عکس‌ها: ' + JSON.stringify(r.ph));
  if (!r.q) fails.push(name + ' نقل‌قول دیده نشد');
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
if (fails.length) { console.log('::error::' + fails.join('\n')); process.exit(1); }
console.log('آزمون دیداری کشوی رویداد سبک: سبز');
