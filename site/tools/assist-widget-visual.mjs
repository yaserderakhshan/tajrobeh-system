// آزمون دیداری اسنیپت شناور 501145 روی خود tajrobeh.life (Playwright، موبایل ۳۹۰ و دسکتاپ ۱۲۸۰): منوی اول و پنجرهٔ دستیار، هر دو.
// منوی اول با بلندترین متن ممکن؛ هر عنصر بریده (scrollWidth > clientWidth)، بیرون از کادر منو، بیش از یک خط، یا آیتم ناهم‌عرض قرمز است.
// ویجت زندهٔ صفحه برداشته و نسخهٔ همین شاخه (site/snippets/501145.html) جایش گذاشته می‌شود؛ بعد دستیار باز می‌شود، یک پرسش
// پرتکرار و یک پرسش نامعلوم پرسیده می‌شود، بعد ورکر بسته می‌شود (حالت «وصل نمی‌شوم») و از هر حالت اسکرین‌شات گرفته می‌شود. کنتراست هر متن دیده‌شدهٔ ویجت خودکار سنجیده
// می‌شود (رنگ متن روی نخستین زمینهٔ نیمه‌شفاف‌نشدهٔ نیاکان): زیر ۴٫۵ به ۱، یا «…» در جواب‌ها، یعنی قرمز.
//   OUT=docs/site/assist-widget node site/tools/assist-widget-visual.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = process.env.SITE_URL || 'https://tajrobeh.life/';
const OUT = process.env.OUT || 'docs/site/assist-widget';
const MIN = 4.5;
mkdirSync(OUT, { recursive: true });
const html = readFileSync('site/snippets/501145.html', 'utf8');
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
const js = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || '';
const markup = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script>[\s\S]*?<\/script>/, '');

/* داخل صفحه: سنجش کنتراست هر عنصر متن‌دار دیده‌شده در #tjFabRoot */
function audit(MIN) {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } }
    let bg = { r: 254, g: 254, b: 254, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg);
    return bg;
  };
  const root = document.getElementById('tjFabRoot'), bad = [], seen = [];
  const all = [root, ...root.querySelectorAll('*')];
  for (const el of all) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    const ph = el.tagName === 'INPUT' && !el.value ? el.placeholder : '';
    if (!own && !ph) continue;
    const r = el.getBoundingClientRect(), st = getComputedStyle(el);
    if (!r.width || !r.height || st.visibility === 'hidden' || st.display === 'none' || Number(st.opacity) === 0) continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) { hidden = true; break; } }
    if (hidden) continue;
    const fg = parse(ph ? getComputedStyle(el, '::placeholder').color : st.color); if (!fg) continue;
    const bg = bgOf(el), fgB = blend(fg, bg);
    const L1 = lum(fgB), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const item = { text: (own || ph).slice(0, 40), ratio: Math.round(ratio * 100) / 100, fg: st.color, bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})` };
    seen.push(item); if (ratio < MIN) bad.push(item);
  }
  const answers = [...root.querySelectorAll('.tj-fab-as-m.bot')].map((e) => e.textContent);
  /* متنی که CSS با «…» بریده (text-overflow: ellipsis و واقعاً بلندتر از جایش) */
  const cut = all.filter((el) => { const st = getComputedStyle(el); return st.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && el.getBoundingClientRect().width > 0; }).map((el) => '[بریده] ' + el.textContent.trim().slice(0, 50));
  return { bad, seen: seen.length, ellipsis: answers.filter((t) => /…|\.\.\./.test(t)).map((t) => t.slice(0, 60)).concat(cut) };
}

const fails = [];
const browser = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});   /* PW_EXE: مرورگر نصب‌شدهٔ محلی */
const report = [];
for (const [name, vp] of [['390', { width: 390, height: 844, isMobile: true, hasTouch: true }], ['1280', { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: 1, locale: 'fa-IR' });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  /* ویجت زنده بیرون، نسخهٔ این شاخه درون (همان HTML، CSS و اسکریپت اسنیپت) */
  await page.evaluate(({ css, markup, js }) => {
    document.querySelectorAll('#tjFabRoot').forEach((e) => e.remove());
    /* CSS نسخهٔ زندهٔ اسنیپت هم برداشته می‌شود، مثل وقتی اسنیپت روی سایت عوض شود */
    document.querySelectorAll('style').forEach((e) => { if (/tjFabRoot|tj-fab-/.test(e.textContent)) e.remove(); });
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const w = document.createElement('div'); w.innerHTML = markup; while (w.firstChild) document.body.appendChild(w.firstChild);
    (0, eval)(js);
  }, { css, markup, js });
  await page.click('#tjFabBtn');
  /* منوی اول: هر آیتم و هر متنش در کادر خودش و در کادر منو، آیتم‌ها هم‌عرض، کنتراست.
     بلندترین متن ممکن: ساعت پذیرش در حالت «بسته» (data-tj-label)، هر ساعتی که آزمون اجرا شود */
  await page.evaluate(() => document.querySelectorAll('#tjFabRoot [data-tj-hours]').forEach((e) => { const l = e.getAttribute('data-tj-label') || ''; if (l.length > e.textContent.length) { e.textContent = l; e.classList.remove('is-online'); e.classList.add('is-offline'); } }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `live-${name}-menu.png`) });
  const mm = await page.evaluate(() => {
    const menu = document.querySelector('#tjFabRoot .tj-fab-menu'), mr = menu.getBoundingClientRect(), bad = [];
    const items = [...menu.querySelectorAll('.tj-fab-item')].filter((e) => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0);
    for (const it of items) {
      const nm = (it.querySelector('.tj-fab-item-label') || it).textContent.trim();
      for (const e of [it, ...it.querySelectorAll('*')]) {
        if (e.tagName === 'svg' || e.closest('svg')) continue;
        const r = e.getBoundingClientRect(); if (!r.width) continue;
        if (e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0) bad.push(`«${nm}»: ${e.className || e.tagName} بریده (${e.scrollWidth} > ${e.clientWidth})`);
        if (r.left < mr.left - 0.5 || r.right > mr.right + 0.5) bad.push(`«${nm}»: ${e.className || e.tagName} بیرون از کادر منو`);
      }
      for (const t of it.querySelectorAll('.tj-fab-item-label, .tj-fab-item-status')) { const lh = parseFloat(getComputedStyle(t).lineHeight) || 20; if (t.getBoundingClientRect().height > lh * 1.6) bad.push(`«${nm}»: ${t.className} بیش از یک خط`); }
    }
    const ws = items.map((e) => Math.round(e.getBoundingClientRect().width));
    if (Math.max(...ws) - Math.min(...ws) > 1) bad.push('آیتم‌ها هم‌عرض نیستند: ' + ws.join('، '));
    return { bad, width: Math.round(mr.width), items: items.length };
  });
  report.push(`${name}px · منوی اول: عرض ${mm.width}، ${mm.items} آیتم، ${mm.bad.length} ایراد`);
  for (const b of mm.bad) fails.push(`${name}px منو: ${b}`);
  const am = await page.evaluate(audit, MIN);
  for (const b of am.bad) fails.push(`${name}px منو: «${b.text}» ${b.ratio}`);
  await page.click('#tjFabAsk');
  await page.waitForSelector('#tjFabRoot .tj-fab-as-q button', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, `live-${name}-start.png`) });
  const a1 = await page.evaluate(audit, MIN);
  /* دکمهٔ پرسش شروع: متن دکمه همان پرسش و جواب مستقیم (نه «پیدا نکردم») */
  const qText = await page.$eval('#tjFabRoot .tj-fab-as-q button', (b) => b.textContent.trim()).catch(() => '');
  if (qText) {
    await page.click('#tjFabRoot .tj-fab-as-q button');
    await page.waitForFunction(() => document.querySelectorAll('#tjFabRoot .tj-fab-as-m.bot').length >= 2 && !document.querySelector('#tjFabRoot .tj-fab-as-typing'), null, { timeout: 15000 }).catch(() => {});
    const last = await page.$$eval('#tjFabRoot .tj-fab-as-m.bot', (L) => L[L.length - 1].textContent);
    if (/پیدا نکردم|شاید یکی از این‌ها/.test(last)) fails.push(`${name}px: دکمهٔ «${qText}» جواب مستقیم نگرفت`);
    /* بازخورد 👍: پیام گفت‌وگو نمی‌سازد؛ «ثبت شد» کوچک */
    const n0 = await page.$$eval('#tjFabRoot .tj-fab-as-m', (L) => L.length);
    await page.click('#tjFabRoot .tj-fab-as-bs .is-rate.is-emoji').catch(() => fails.push(`${name}px: دکمهٔ 👍 نبود`));
    await page.waitForTimeout(900);
    const fb = await page.evaluate(() => ({ n: document.querySelectorAll('#tjFabRoot .tj-fab-as-m').length, ok: !!document.querySelector('#tjFabRoot .tj-fab-as-ok'), done: !!document.querySelector('#tjFabRoot .is-rate.is-done') }));
    if (fb.n !== n0 || !fb.ok || !fb.done) fails.push(`${name}px: بازخورد 👍 پیام ساخت یا «ثبت شد» نیامد`);
    /* «جوابم را نگرفتم»: بی پیام، با پیشنهاد «با پذیرش حرف بزنم» */
    await page.fill('#tjFabAsIn', 'جلسهٔ معارفه چیست؟'); await page.press('#tjFabAsIn', 'Enter');
    await page.waitForFunction((k) => document.querySelectorAll('#tjFabRoot .tj-fab-as-bs .is-rate:not([disabled])').length > 0 && !document.querySelector('#tjFabRoot .tj-fab-as-typing'), null, { timeout: 15000 }).catch(() => {});
    const n1 = await page.$$eval('#tjFabRoot .tj-fab-as-m', (L) => L.length);
    const xs = await page.$$('#tjFabRoot .tj-fab-as-bs .is-rate:not(.is-emoji):not([disabled])');
    if (xs.length) await xs[xs.length - 1].click(); else fails.push(`${name}px: «جوابم را نگرفتم» نبود`);
    await page.waitForTimeout(900);
    const fx = await page.evaluate(() => ({ n: document.querySelectorAll('#tjFabRoot .tj-fab-as-m').length, hand: [...document.querySelectorAll('#tjFabRoot .is-hand')].some((b) => /با پذیرش حرف بزنم/.test(b.textContent)) }));
    if (fx.n !== n1 || !fx.hand) fails.push(`${name}px: «جوابم را نگرفتم» پیام ساخت یا «با پذیرش حرف بزنم» نیامد`);
    await page.screenshot({ path: join(OUT, `live-${name}-feedback.png`) });
  }
  /* پرسش پرتکرار با تایپ (همان مسیر کاربر) */
  await page.fill('#tjFabAsIn', 'هزینه جلسه چقدر است');
  await page.press('#tjFabAsIn', 'Enter');
  await page.waitForFunction(() => document.querySelectorAll('#tjFabRoot .tj-fab-as-m.bot').length >= 1 && !document.querySelector('#tjFabRoot .tj-fab-as-typing'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `live-${name}-answer.png`) });
  const a2 = await page.evaluate(audit, MIN);
  /* پرسش نامعلوم: سه پرسش نزدیک و پذیرش */
  await page.fill('#tjFabAsIn', 'رنگ مورد علاقهٔ شما چیست');
  await page.press('#tjFabAsIn', 'Enter');
  await page.waitForTimeout(5500);
  await page.screenshot({ path: join(OUT, `live-${name}-fallback.png`) });
  const a3 = await page.evaluate(audit, MIN);
  /* ورکر در دسترس نیست (مثل فیلتر workers.dev در ایران): هر دو نشانی بسته؛ پیام «الان به دستیار وصل نمی‌شوم»،
     سه دکمهٔ پرسش و «با پذیرش حرف بزنم» باید بیاید، نه «شاید یکی از این‌ها…» */
  await page.route(/tajrobeh\.life\/wp-json\/tj\/v1\/assist|workers\.dev/, (r) => r.abort('failed'));
  await page.fill('#tjFabAsIn', 'ساعت کاری پذیرش');
  await page.press('#tjFabAsIn', 'Enter');
  await page.waitForTimeout(5000);
  const off = await page.evaluate(() => {
    const L = document.querySelectorAll('#tjFabRoot .tj-fab-as-m.bot'), q = document.querySelectorAll('#tjFabRoot .tj-fab-as-q');
    const qs = q.length ? q[q.length - 1].querySelectorAll('button').length : 0;
    const bs = document.querySelectorAll('#tjFabRoot .tj-fab-as-bs'), last = bs.length ? bs[bs.length - 1].textContent : '';
    let miss = ''; try { miss = sessionStorage.getItem('tjasmiss') || ''; } catch (e) {}
    return { msg: L.length ? L[L.length - 1].textContent : '', qs, hand: /با پذیرش حرف بزنم/.test(last), miss };
  });
  if (!/الان به دستیار وصل نمی‌شوم/.test(off.msg)) fails.push(`${name}px وصل‌نشدن: پیام «الان به دستیار وصل نمی‌شوم» نیامد («${off.msg}»)`);
  if (off.qs !== 3) fails.push(`${name}px وصل‌نشدن: ${off.qs} دکمهٔ پرسش به جای ۳`);
  if (!off.hand) fails.push(`${name}px وصل‌نشدن: «با پذیرش حرف بزنم» نیامد`);
  if (off.miss !== '1') fails.push(`${name}px وصل‌نشدن: شمار وصل‌نشدن ثبت نشد (${off.miss || 'خالی'})`);
  await page.screenshot({ path: join(OUT, `live-${name}-offline.png`) });
  const a4 = await page.evaluate(audit, MIN);
  await page.unroute(/tajrobeh\.life\/wp-json\/tj\/v1\/assist|workers\.dev/);
  for (const [k, a] of [['start', a1], ['answer', a2], ['fallback', a3], ['offline', a4]]) {
    report.push(`${name}px · ${k}: ${a.seen} متن سنجیده شد، ${a.bad.length} زیر ${MIN}${a.ellipsis.length ? ' · «…» در جواب' : ''}`);
    for (const b of a.bad) fails.push(`${name}px ${k}: «${b.text}» ${b.ratio} (${b.fg} روی ${b.bg})`);
    for (const e of a.ellipsis) fails.push(`${name}px ${k}: «…» در جواب «${e}»`);
  }
  await ctx.close();
}
await browser.close();
const out = ['## آزمون دیداری ویجت دستیار روی tajrobeh.life', '', ...report.map((r) => '- ' + r), '', fails.length ? fails.map((f) => '- ⛔ ' + f).join('\n') : '✅ کنتراست همه‌جا دست‌کم ۴٫۵ به ۱ و بی «…»'].join('\n');
writeFileSync(join(OUT, 'live-audit.md'), out + '\n');
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + '\n');
process.exit(fails.length ? 1 : 0);
