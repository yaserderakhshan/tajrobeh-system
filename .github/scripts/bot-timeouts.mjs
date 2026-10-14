// v170.70: زمان‌گذر آزمون‌ها برگشت خودکار نمی‌آورد؛ فقط مردودی واقعی.
// ۱) مجموعه‌ای که Apps Script وسطش دو بار قطع کرد (ciKick_) یا نتیجه‌اش نیامد «زمان‌گذر» است، نه مردود.
// ۲) bot-tests.mjs زمان‌گذرها را یک بار جدا دوباره اجرا می‌کند؛ اگر باز زمان‌گذر بودند، انتشار «عقب می‌افتد»:
//    نه انتشار اصلی، نه برگشت خودکار و PR معکوس. کد پروژه به bot-live برمی‌گردد و اجرای دوباره منتشرش می‌کند.
// ۳) ایست سناریویی داخل «اصلی» (bot/telegram.gs، TG_SCEN_STOP_MS) نمی‌گذارد اجرایی به سقف ۶ دقیقه برسد.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBot } from './gas-local.mjs';
import { seedFixtures } from './bot-fixtures.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BOT = join(HERE, '..', '..', 'bot');

const TIMEOUT_RX = /دو بار قطع شد|نتیجهٔ این مجموعه‌ها در تب «تست‌ها» نیامد/;
export const isTimeout = (x) => !!x && TIMEOUT_RX.test(String(x.text || ''));

/* مجموعه‌های قرمز ← {real: مردود واقعی، slow: فقط زمان‌گذر} */
export function classify(suites) {
  const bad = (suites || []).filter((x) => x.fail > 0);
  return { real: bad.filter((x) => !isTimeout(x)), slow: bad.filter(isTimeout) };
}

/* نام مجموعه ← نام تابع، از TG_SUITES و spliceهای همهٔ فایل‌های bot/. تکه‌های «اصلی» همه tgRunTests1 (ciMainParts_ همه را می‌سازد).
   «جامانده» نام تابع ندارد؛ اگر چیزی نامعلوم ماند null (یعنی دور کامل). */
export function suiteFns(names, dir = BOT) {
  const map = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.gs'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/\[\s*'((?:[^'\\]|\\.)+)'\s*,\s*'(\w+)'\s*\]/g)) if (/Tests?\d*$|Test\w*$/.test(m[2])) map[m[1]] = m[2];
  }
  const out = new Set();
  for (const n of names) {
    if (/^اصلی /.test(n)) { out.add('tgRunTests1'); continue; }
    if (!map[n]) return null;
    out.add(map[n]);
  }
  return [...out];
}

export function timeoutSelfTest() {
  const bad = [];
  const t = (name, ok, more = '') => { if (!ok) bad.push(name + (more ? ` (${String(more).slice(0, 160)})` : '')); };
  // ۱) دسته‌بندی
  const c = classify([
    { name: 'الف', pass: 3, fail: 0 },
    { name: 'اصلی ۲ از ۳', pass: 0, fail: 1, text: 'اجرای Apps Script وسط این مجموعه دو بار قطع شد (سقف ۶ دقیقه). مجموعه تمام نشد.' },
    { name: '۲ مجموعهٔ جامانده', pass: 0, fail: 2, text: 'نتیجهٔ این مجموعه در تب «تست‌ها» نیامد'.replace('مجموعه در', 'مجموعه‌ها در') },
    { name: 'ب', pass: 1, fail: 1, text: '❌ کارت لید بی نام' },
  ]);
  t('مردودی واقعی جدا می‌شود', c.real.length === 1 && c.real[0].name === 'ب', JSON.stringify(c.real));
  t('دو بار قطع‌شده و جامانده زمان‌گذرند', c.slow.length === 2, JSON.stringify(c.slow.map((x) => x.name)));
  t('فقط زمان‌گذر: مردود واقعی صفر', classify([{ name: 'x', fail: 1, text: 'دو بار قطع شد' }]).real.length === 0);
  const fns = suiteFns(['اصلی ۲ از ۳', 'پروفایل سایت']);
  t('نام مجموعه ← تابع؛ تکه‌های اصلی ← tgRunTests1', Array.isArray(fns) && fns.includes('tgRunTests1') && fns.length === 2, JSON.stringify(fns));
  t('نام ناشناخته ← دور کامل (null)', suiteFns(['مجموعه‌ای که نیست']) === null);

  // ۲) ایست سناریویی: هر اجرا دست‌کم یک سناریو، تکه از همان‌جا ادامه، نتیجهٔ نهایی همان اجرای یک‌جا
  const bot = loadBot(BOT);
  seedFixtures(bot);
  const r = bot.run(`(function(){
    var P = PropertiesService.getScriptProperties();
    P.setProperty('TG_TEST_PARTS', JSON.stringify({ n: 12, a: {} })); P.setProperty('TG_TEST_RUN', 'R'); P.setProperty('TG_TEST_AT', '7');
    var out = {};
    [1, 2].forEach(function (k) {
      TG_EXEC_T0 = null; var ref = tgRunPart_(k);
      TG_EXEC_T0 = Date.now() - 1e9; var n = 0, x = { partial: true };
      while (x.partial && n < 60) { x = tgRunPart_(k); n++; }
      out[k] = { ref: ref.pass + '/' + ref.fail, got: x.pass + '/' + x.fail, n: n, left: P.getProperty('TG_TEST_PROG') };
    });
    /* پیشرفت کهنه (مجموعهٔ دیگر) نادیده گرفته می‌شود */
    P.setProperty('TG_TEST_PROG', JSON.stringify({ run: 'R', at: '3', i: 0, done: {}, rp: 99, rf: 0, bad: [] }));
    TG_EXEC_T0 = null; var a = tgRunPart_(1);
    TG_EXEC_T0 = Date.now(); var b = tgRunPart_(1);
    out.stale = { a: a.pass + '/' + a.fail, b: b.pass + '/' + b.fail, partial: !!b.partial };
    TG_EXEC_T0 = null; P.deleteProperty('TG_TEST_PROG'); P.deleteProperty('TG_TEST_PARTS'); P.deleteProperty('TG_TEST_RUN'); P.deleteProperty('TG_TEST_AT');
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(r);
  for (const k of ['1', '2']) {
    t(`ایست سناریویی تکهٔ ${k}: چند اجرا، هر بار یک سناریو`, o[k].n > 1, JSON.stringify(o[k]));
    t(`ایست سناریویی تکهٔ ${k}: نتیجهٔ نهایی همان اجرای یک‌جا`, o[k].ref === o[k].got, JSON.stringify(o[k]));
    t(`ایست سناریویی تکهٔ ${k}: پیشرفت پاک شد`, o[k].left === null, JSON.stringify(o[k]));
  }
  t('پیشرفت کهنهٔ مجموعهٔ دیگر نادیده', o.stale.a === o.stale.b && !o.stale.partial, JSON.stringify(o.stale));
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('bot-timeouts.mjs')) {
  const b = timeoutSelfTest();
  console.log(b.length ? b.join('\n') : 'زمان‌گذر آزمون‌ها: همه درست.');
  process.exit(b.length ? 1 : 0);
}
