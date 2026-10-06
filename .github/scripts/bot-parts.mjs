// تقسیم مجموعهٔ «اصلی» آزمون بات بر اساس زمان واقعی هر سناریو (v170.22.1، ۱۴ مهر ۱۴۰۵).
// چرا: دیپلوی v170.22 دو بار در «اصلی ۱ از ۳» به سقف ۶ دقیقهٔ هر اجرای Apps Script خورد؛ تقسیم ثابت سه‌تایی با بزرگ شدن
// آزمون‌ها و کند شدن شیت دوباره به سقف می‌رسید.
//
// - زمان‌ها: .github/scripts/bot-test-times.json (پنج اجرای اخیر هر سناریو و هر مجموعه). bot-tests.mjs بعد از هر دور
//   روی Apps Script آن را به‌روز می‌کند و گردش کار دیپلوی با [skip ci] روی main می‌گذارد.
// - plan(): سناریوها با تخمین «بیشینهٔ پنج اجرای اخیر» به ترتیب نزولی در کم‌بارترین تکه می‌نشینند (LPT)؛ تعداد تکه‌ها
//   آن‌قدر بالا می‌رود که هر تکه با سربار ثابت زیر بودجه بماند. سناریوی تنهایی که از بودجه بیشتر است تکهٔ خودش را دارد.
// - check(): هشدار چک محلی (bot-precheck.mjs): هر تکه یا مجموعه‌ای که زمان ثبت‌شده‌اش از ۴ دقیقه گذشته.
// - هش عنوان سناریو همان tgTestHash_ در bot/telegram.gs است (ciTests برابری را می‌سنجد).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TIMES_FILE = join(HERE, 'bot-test-times.json');
export const LIMIT = 240;     // سقف هر تکه و هر مجموعه (ثانیه): ۴ دقیقه
export const BUDGET = 180;    // هدف چیدن: یک دقیقه جا برای نوسان شیت
export const MIN_PARTS = 3, MAX_PARTS = 12, KEEP = 5;
const MAIN_RX = /^اصلی /;

export function thash(s) { let h = 5381; s = String(s); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

/* عنوان سناریوها به ترتیب، از بدنهٔ tgRunTests */
export function mainTitles(src) {
  const a = src.indexOf('function tgRunTests() {');
  if (a < 0) return [];
  const b = src.indexOf('\nfunction ', a + 10);
  const body = src.slice(a, b < 0 ? undefined : b);
  const out = [];
  for (const m of body.matchAll(/\brun\(\s*'((?:[^'\\]|\\.)*)'/g)) out.push(m[1].replace(/\\(.)/g, '$1'));
  return out;
}

export function loadTimes(file = TIMES_FILE) {
  try { const t = JSON.parse(readFileSync(file, 'utf8')); return { scen: t.scen || {}, suites: t.suites || {}, overhead: t.overhead || [], parts: t.parts || [], updated: t.updated || '' }; }
  catch { return { scen: {}, suites: {}, overhead: [], parts: [], updated: '' }; }
}
export function saveTimes(t, file = TIMES_FILE) {
  const order = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  writeFileSync(file, JSON.stringify({ updated: t.updated, scen: order(t.scen), suites: order(t.suites), overhead: t.overhead, parts: t.parts }, null, 1) + '\n');
}
const max = (a) => (a && a.length ? Math.max(...a) : 0);

/* تخمین هر سناریو: بیشینهٔ پنج اجرای اخیر. بی‌سابقه (سناریوی تازه): DEFAULT_SEC؛ بیشتر سناریوها زیر دو ثانیه‌اند
   (دور سبز ۱۴ مهر: کل «اصلی» ۱۸۱ ثانیه برای ۶۰ سناریو که ۹ تایش کند بود) و از دور بعد زمان واقعی‌اش جایش را می‌گیرد. */
export const DEFAULT_SEC = 3;
export function estimates(titles, times) {
  return titles.map((t) => ({ t, h: thash(t), s: max(times.scen[t]) || DEFAULT_SEC }));
}

export function plan(titles, times, { budget = BUDGET, min = MIN_PARTS, maxParts = MAX_PARTS } = {}) {
  const est = estimates(titles, times).sort((x, y) => y.s - x.s);
  const over = max(times.overhead) || 5;   /* بررسی‌های بیرون از run() که در هر تکه اجرا می‌شوند */
  const total = est.reduce((s, e) => s + e.s, 0);
  let n = Math.min(maxParts, Math.max(min, Math.ceil(total / Math.max(1, budget - over))));
  for (;;) {
    const load = Array(n).fill(over), a = {};
    for (const e of est) { let k = 0; for (let i = 1; i < n; i++) if (load[i] < load[k]) k = i; a[e.h] = k; load[k] += e.s; }
    const worst = Math.max(...load);
    /* سناریوی تنهایی که خودش از بودجه بیشتر است با تکهٔ بیشتر درست نمی‌شود؛ کافی است تنها باشد */
    const alone = load.every((l, i) => l <= budget || est.filter((e) => a[e.h] === i).length === 1);
    const count = load.map((_, i) => est.filter((e) => a[e.h] === i).length);
    if (alone || worst <= budget || n >= maxParts) return { n, a, load: load.map((x) => Math.round(x)), count };
    n++;
  }
}

/* نتیجهٔ یک دور روی Apps Script ← زمان‌ها (پنج اجرای اخیر) */
export function merge(times, status, titles, when = new Date().toISOString()) {
  const t = JSON.parse(JSON.stringify(times));
  const push = (o, k, v) => { o[k] = [...(o[k] || []), Math.round(v * 10) / 10].slice(-KEEP); };
  const byHash = new Map(titles.map((x) => [thash(x), x]));
  const st = status.stimes || {};
  for (const [h, secs] of Object.entries(st)) { const title = byHash.get(h); if (title && Number.isFinite(Number(secs))) push(t.scen, title, Number(secs)); }
  const parts = [];
  for (const x of status.suites || []) {
    if (MAIN_RX.test(x.name)) { parts.push({ name: x.name, secs: Number(x.secs) || 0, fail: Number(x.fail) || 0 }); continue; }
    if (x.fail && !x.pass) continue;   /* قطع‌شده یا بی‌نتیجه: زمانش واقعی نیست */
    push(t.suites, x.name, Number(x.secs) || 0);
  }
  if (parts.length) {
    t.parts = parts;
    /* سربار هر تکه = زمان تکه منهای جمع سناریوهایش (فقط تکه‌های کامل) */
    const sumOf = (i) => Object.entries(st).filter(([h]) => (status.plan && status.plan.a ? status.plan.a[h] === i : false)).reduce((s, [, v]) => s + Number(v), 0);
    if (status.plan && status.plan.a) parts.forEach((p, i) => { if (!p.fail) t.overhead = [...(t.overhead || []), Math.max(0, Math.round((p.secs - sumOf(i)) * 10) / 10)].slice(-KEEP); });
  }
  t.updated = when;
  return t;
}

/* چک محلی: هشدارها (نه خطا) */
export function check(times, titles) {
  const w = [];
  for (const p of times.parts || []) if (p.secs > LIMIT) w.push(`تکهٔ «${p.name}» در آخرین دور ${Math.round(p.secs)} ثانیه طول کشید (بیش از ۴ دقیقه)`);
  for (const [k, v] of Object.entries(times.suites || {})) if (max(v) > LIMIT) w.push(`مجموعهٔ «${k}» در پنج اجرای اخیر تا ${Math.round(max(v))} ثانیه طول کشیده (بیش از ۴ دقیقه)؛ باید شکسته شود`);
  if (titles && titles.length) {
    const p = plan(titles, times);
    p.load.forEach((l, i) => { if (l > LIMIT && p.count[i] > 1) w.push(`تکهٔ ${i + 1} از ${p.n} با زمان‌های ثبت‌شده حدود ${l} ثانیه است (بیش از ۴ دقیقه)`); });
    for (const t of titles) if (max(times.scen[t]) > LIMIT) w.push(`سناریوی «${t}» به‌تنهایی تا ${Math.round(max(times.scen[t]))} ثانیه طول کشیده؛ تقسیم آن را درست نمی‌کند، کندی خود سناریو را پیدا کن`);
  }
  return w;
}

export function partsSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  t('هش مثل tgTestHash_', thash('شمارهٔ +۹۸') === '1lyrw5p' && thash('') === '45h');
  t('عنوان‌ها از tgRunTests', JSON.stringify(mainTitles("function tgRunTests() {\n  run('الف', [], []);\n  run( 'ب\\'ج', [], []);\n}\nfunction x() { run('نه', [], []); }")) === JSON.stringify(['الف', "ب'ج"]));
  const titles = Array.from({ length: 30 }, (_, i) => 'س' + i);
  const times = { scen: Object.fromEntries(titles.map((x, i) => [x, [i < 2 ? 150 : 20]])), suites: {}, overhead: [10], parts: [] };
  const p = plan(titles, times);
  t('هر تکه زیر بودجه', p.load.every((l) => l <= BUDGET));
  t('دست‌کم سه تکه و همهٔ سناریوها جا دارند', p.n >= 3 && Object.keys(p.a).length === 30 && Object.values(p.a).every((k) => k >= 0 && k < p.n));
  t('بزرگ‌تر شدن آزمون‌ها ← تکهٔ بیشتر', plan(titles.concat(Array.from({ length: 30 }, (_, i) => 'ت' + i)), { ...times, scen: { ...times.scen, ...Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['ت' + i, [20]])) } }).n > p.n);
  const slow = plan(['کند', 'الف', 'ب'], { scen: { 'کند': [460], 'الف': [10], 'ب': [10] }, suites: {}, overhead: [5], parts: [] });
  t('سناریوی کندتر از بودجه تکهٔ تنهای خودش را دارد', Object.values(slow.a).filter((k) => k === slow.a[thash('کند')]).length === 1);
  const m = merge({ scen: {}, suites: {}, overhead: [], parts: [] }, { stimes: { [thash('الف')]: 12.3 }, suites: [{ name: 'اصلی ۱ از ۴', secs: 300, pass: 5 }, { name: 'نقش‌ها', secs: 20, pass: 3 }, { name: 'قطع‌شده', secs: 400, pass: 0, fail: 1 }] }, ['الف'], 'x');
  t('ادغام زمان‌ها', m.scen['الف'][0] === 12.3 && m.suites['نقش‌ها'][0] === 20 && !m.suites['قطع‌شده'] && m.parts[0].secs === 300);
  t('چک: تکهٔ بیش از ۴ دقیقه هشدار دارد', check(m, []).some((x) => x.includes('اصلی ۱ از ۴')));
  t('چک: پنج اجرای اخیر نگه داشته می‌شود', merge({ scen: { 'الف': [1, 2, 3, 4, 5] }, suites: {}, overhead: [], parts: [] }, { stimes: { [thash('الف')]: 6 } }, ['الف']).scen['الف'].join() === '2,3,4,5,6');
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('bot-parts.mjs')) {
  if (process.argv[2] === 'selftest') { const b = partsSelfTest(); console.log(b.length ? '❌ ' + b.join('، ') : '✅ تقسیم آزمون‌ها درست است'); process.exit(b.length ? 1 : 0); }
  const src = readFileSync(join(HERE, '../../bot/telegram.gs'), 'utf8'), titles = mainTitles(src), times = loadTimes();
  const p = plan(titles, times);
  console.log(`${titles.length} سناریو · ${p.n} تکه · بار تخمینی (ثانیه): ${p.load.join('، ')}`);
  for (const w of check(times, titles)) console.log('⚠️ ' + w);
  if (!existsSync(TIMES_FILE)) console.log('(فایل زمان‌ها هنوز نیست)');
}
