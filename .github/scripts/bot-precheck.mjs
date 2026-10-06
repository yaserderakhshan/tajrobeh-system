// بررسی بات پیش از هر انتشار (در PR و پیش از clasp push در گردش کار دیپلوی). بی‌اتصال به گوگل و تلگرام.
// ۱) همهٔ فایل‌های bot به ترتیب filePushOrder در یک اسکوپ اجرا می‌شوند؛ خطای سطح بالا = مردود
//    (همان خطایی که در Apps Script بی‌صدا ثبت‌های TG_CAP و TG_SUITES را می‌انداخت)
// ۲) نام تابع تکراری در سطح بالا = مردود (در Apps Script آخرین تعریف بی‌صدا برنده می‌شود)
// ۳) همهٔ مجموعه‌های TG_SUITES با دادهٔ ساختگی (bot-fixtures.mjs) اجرا می‌شوند؛ هر مردود = مردود.
//    فقط مجموعه‌های LIVE_ONLY که به دادهٔ واقعی شیت نیاز دارند اینجا شمرده نمی‌شوند؛ آن‌ها بعد روی نسخهٔ آزمایشی اجرا می‌شوند.
process.env.TZ = 'Asia/Tehran';   // Apps Script تاریخ‌ها را در منطقهٔ زمانی اسکریپت می‌سازد

import { readFileSync, appendFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBot, pushOrder } from './gas-local.mjs';
import { seedFixtures } from './bot-fixtures.mjs';
import { runFlows } from './bot-flows.mjs';
import { mapIsFresh } from './bot-map.mjs';
import { newScopes, scopeSelfTest } from './bot-scopes.mjs';
import { pageGs, pageSha, PAGE } from './page-gs.mjs';
import { lockSelfTest } from './bot-lock.mjs';
import { versionSelfTest } from './bot-version.mjs';
import { check as featuresCheck, featuresSelfTest } from './features-check.mjs';
import { prevSelfTest } from './bot-prev-test.mjs';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BOT = join(ROOT, 'bot');

// به دادهٔ واقعی هاب مدرسه و تب افراد نیاز دارند (با دادهٔ ساختگی معنا ندارند)
const LIVE_ONLY = new Set(['tgSchoolTests', 'tgSchool2Tests', 'tgIdBridgeTests']);

const problems = [];
const summary = [];
const out = (s) => { console.log(s); summary.push(s); };

// ۰) هر فایل .gs باید در filePushOrder باشد
const order = pushOrder(BOT);
for (const f of readdirSync(BOT).filter((x) => x.endsWith('.gs'))) {
  if (!order.includes(f)) problems.push(`${f} در filePushOrder فایل bot/.clasp.json نیست`);
}

// ۱) نام تکراری
const seen = new Map();
for (const f of order) {
  const src = readFileSync(join(BOT, f), 'utf8');
  for (const m of src.matchAll(/^function\s+([\w$]+)\s*\(/gm)) {
    if (seen.has(m[1])) problems.push(`تابع ${m[1]} دو بار تعریف شده: ${seen.get(m[1])} و ${f}`);
    else seen.set(m[1], f);
  }
}

// ۲) بارگذاری
const bot = loadBot(BOT);
for (const e of bot.loadErrors) problems.push(`خطا هنگام بارگذاری ${e}`);

// ۳) مجموعه‌ها
seedFixtures(bot);
const suites = bot.run('TG_SUITES.map(function (s) { return [s[0], s[1]]; })');
let pass = 0, fail = 0;
const rows = [];
for (const [name, fn] of suites) {
  const t0 = Date.now();
  let r;
  try { r = bot.run(`tgTestCall_(${JSON.stringify(fn)})`); } catch (e) { r = { pass: 0, fail: 1, text: 'خطا: ' + (e && e.message) }; }
  try { bot.run('TG_DRY = false; TG_DRY_THER = null; TG_DRY_LEAD = null; TG_DRY_LEADROW = 0;'); } catch (e) { /* برخی از این متغیرها شاید نباشند */ }
  const ms = Date.now() - t0;
  const live = LIVE_ONLY.has(fn);
  rows.push({ name, fn, pass: r.pass, fail: r.fail, ms, live, text: r.text });
  if (live) continue;
  pass += r.pass; fail += r.fail;
  if (r.fail) problems.push(`مجموعهٔ «${name}» (${fn}): ${r.fail} مردود\n${String(r.text || '').slice(0, 1200)}`);
}
// v170.9.2: هر دکمه‌ای که در تست‌ها ساخته شد، دادهٔ ۱ تا ۶۴ بایتی دارد (وگرنه تلگرام کل پیام را با BUTTON_DATA_INVALID رد می‌کند)
{
  const bad = bot.run('TG_BTN_BAD.slice(0, 30)');
  const uniq = [...new Set(bad)];
  if (uniq.length) problems.push(`دادهٔ دکمهٔ نادرست (خالی یا بیش از ۶۴ بایت) در ${bad.length} پیام:\n${uniq.slice(0, 15).join('\n')}`);
}

// ۴) خود مسیر انتشار: توقف کارهای زمان‌دار، عقب‌انداختن کار روزانه و پوشاندن اطلاعات در خلاصهٔ خطاها (ci.gs)
{
  const now = Date.now();
  const p = loadBot(BOT, { extra: `var CI_BUILD = 'B1'; var CI_PAUSE_UNTIL = ${now + 600000}; var CI_KEY_HASH = ''; var CI_KEY_EXP = 0;` });
  const chk = (name, cond) => { if (!cond) problems.push(`مسیر انتشار: ${name}`); };
  chk('کار پرتکرار با تریگر در زمان توقف اجرا شد', p.run(`ciPaused_({ triggerUid: 'u' }, 'tgPayTick', 'skip')`) === true);
  chk('صدا زدن مستقیم نباید متوقف شود', p.run(`ciPaused_(undefined, 'tgPayTick', 'skip')`) === false);
  p.run(`tgDaily({ triggerUid: 'x' }); tgDaily({ triggerUid: 'x' }); tgDigestMorning({ triggerUid: 'y' });`);
  chk('کار روزانه فقط یک تریگر ciRunDeferred بسازد', p.triggers.length === 1 && p.triggers[0].fn === 'ciRunDeferred');
  chk('فهرست کارهای عقب‌افتاده', p.props.getProperty('CI_DEFERRED') === '["tgDaily","tgDigestMorning"]');
  const res = p.run('ciResume_()');
  chk('resume کارهای عقب‌افتاده را برگرداند', res.ok && res.deferred.length === 2);
  chk('بعد از resume توقفی نیست', p.run(`ciPaused_({ triggerUid: 'u' }, 'tgPayTick', 'skip')`) === false);
  p.run('ciRunDeferred()');
  chk('بعد از اجرای کارهای عقب‌افتاده تریگری نماند', p.triggers.length === 0 && p.props.getProperty('CI_DEFERRED') === null);
  const mk = p.run(`ciMask_('x 09121234567 a@b.co @user_12 https://t.me/c/1 ۱۲۳۴')`);
  chk('خلاصهٔ خطا شماره، ایمیل، یوزرنیم یا لینک را پوشاند', !/0912|a@b|user_12|t\.me|۱۲۳۴/.test(mk));
  p.run(`TG_DRY = false; tgRunStat_('tgPayTick', Date.now() - 1500); tgRunStat_('tgPayTick', Date.now() - 500);`);
  const stt = p.run('ciStats_()'); const dd = Object.keys(stt.days);
  chk('سنجش زمان اجرا جمع می‌شود', dd.length === 1 && stt.days[dd[0]].tgPayTick[0] === 2 && stt.days[dd[0]].tgPayTick[1] >= 2000);
  p.run('TG_DRY = true; tgRunStat_("x", 0); TG_DRY = false;');
  chk('سنجش زمان اجرا در حالت خشک چیزی نمی‌نویسد', !p.run('ciStats_()').days[dd[0]].x);
  // تریگر کهنهٔ دیپلوی برگشت‌خورده: CI_DEFER_TRIG هست ولی تریگرش نیست
  p.props.setProperty('CI_DEFER_TRIG', 'gone-123'); p.props.deleteProperty('CI_RESUMED');
  p.run(`tgDaily({ triggerUid: 'z' })`);
  chk('کار روزانه با CI_DEFER_TRIG کهنه باز هم تریگر می‌گیرد', p.triggers.some((t) => t.fn === 'ciRunDeferred'));
  // اجرای یک‌باره (v166.20): فقط فهرست مجاز، بار دوم اجرا نمی‌شود، خروجی بی ایمیل و لینک
  p.run(`var __once = 0; function __onceFn() { __once++; return 'شمار: 12 · a@b.co'; }`);
  chk('once: تابع بیرون از فهرست اجرا نمی‌شود', p.run(`ciOnce_('tgDaily', __onceFn).ok`) === false && p.run('__once') === 0);
  const o1 = p.run(`ciOnce_('tgApResumePrivatize', __onceFn)`), o2 = p.run(`ciOnce_('tgApResumePrivatize', __onceFn)`);
  chk('once: بار اول اجرا و ثبت می‌شود', o1.ok && !o1.already && /12/.test(o1.result.out) && !/a@b/.test(o1.result.out));
  chk('once: بار دوم اجرا نمی‌شود و همان نتیجه برمی‌گردد', o2.ok && o2.already && p.run('__once') === 1 && o2.result.out === o1.result.out);
  chk('once: قفل آزاد است', p.lockState.held === false);
  chk('once: هر کار خودکار در فهرست مجاز است', p.run('CI_ONCE_AUTO.every(function (f) { return CI_ONCE_ALLOW.indexOf(f) > -1 && typeof this[f] === "function"; }, this)') === true);
  // رمز در ثبت خطا (v166.22): آدرس تلگرام با رمز، کلید API در آدرس، هدر Bearer
  {
    const fake = '1234567' + '89:AA' + 'x'.repeat(33);
    const raw = `Address unavailable: https://api.telegram.org/bot${fake}/sendMessage?key=SECRET123&chat_id=5 · Bearer abcdefghijklmnopqrstuvwxyz`;
    const m = p.run(`tgSecretMask_(${JSON.stringify(raw)})`);
    chk('رمز در متن خطا پوشانده شد', m.indexOf(fake) < 0 && m.indexOf('SECRET123') < 0 && m.indexOf('abcdefghijklmnop') < 0 && /sendMessage/.test(m) && /chat_id=5/.test(m));
    const e = loadBot(BOT);
    e.run(`tgErr_('tgApi_', new Error(${JSON.stringify(raw)}))`);
    const sh = e.run('tgErrSheet_()');
    const row = sh ? sh.getRange(2, 1, 1, 7).getValues()[0].join(' ') : '';
    chk('tgErr_ رمز را در تب «خطاها» نمی‌نویسد', row && row.indexOf(fake) < 0 && row.indexOf('SECRET123') < 0, row.slice(0, 80));
    sh && sh.appendRow(['E-9', new Date(), 'x', '', raw, 1, 'تازه']);
    const r = e.run('tgErrScrub()');
    chk('tgErrScrub رمز سطرهای قبلی را پاک می‌کند', sh && sh.getRange(3, 5).getValue().indexOf(fake) < 0 && /سطرهای پاک‌شده: 1/.test(r), r);
  }
  // خطاهای تب «خطاها» (v166.23): تکرار شبکه، HTML نادرست، پاسخ زود دکمه، chat_id چندتایی یا ادغام‌شده
  {
    const t = loadBot(BOT);
    t.run(`PropertiesService.getScriptProperties().setProperty('TELEGRAM_TOKEN', 'T');
      var __calls = []; var __mode = '';
      function __resp(code, body) { return { getResponseCode: function () { return code; }, getContentText: function () { return body; } }; }
      UrlFetchApp.fetch = function (u, o) {
        var b = o && o.payload ? JSON.parse(o.payload) : {}; __calls.push({ u: String(u).replace(/bot[^/]+/, 'bot*'), b: b });
        if (__mode === 'net' && __calls.length < 3) throw new Error('Address unavailable: ' + u);
        if (__mode === 'parse' && b.parse_mode) return __resp(400, '{"ok":false,"description":"Bad Request: can\\'t parse entities"}');
        if (__mode === 'old') return __resp(400, '{"ok":false,"description":"Bad Request: query is too old and response timeout expired"}');
        return __resp(200, '{"ok":true}');
      };`);
    t.run(`__mode = 'net'; __calls = []; tgApi_('sendMessage', { chat_id: 5, text: 'x' })`);
    chk('شبکه: Address unavailable سه بار امتحان می‌شود', t.run('__calls.length') === 3);
    t.run(`TG_MEM = {}; __mode = 'parse'; __calls = []; tgApi_('sendMessage', { chat_id: 5, text: '<b>a &amp; b</b> <x', parse_mode: 'HTML' })`);
    chk('HTML نادرست: بی قالب دوباره فرستاده می‌شود', t.run('__calls.length') === 2 && t.run('__calls[1].b.parse_mode') === undefined && t.run('__calls[1].b.text') === 'a & b <x');
    const e0 = t.run(`(function () { var n = 0; var orig = tgErr_; tgErr_ = function () { n++; }; __mode = 'old'; tgApi_('answerCallbackQuery', { callback_query_id: '1' }); tgErr_ = orig; return n; })()`);
    chk('پاسخ دیر دکمه خطا ثبت نمی‌کند', e0 === 0);
    t.run(`__mode = ''; __calls = []; tgHandle({ update_id: 77, callback_query: { id: 'q1', from: { id: 9, first_name: 'x' }, message: { message_id: 1, chat: { id: 9, type: 'private' } }, data: 'zz:none' } })`);
    chk('دکمه: answerCallbackQuery اول و فقط یک بار', t.run(`__calls.filter(function (c) { return /answerCallbackQuery/.test(c.u); }).length`) === 1 && /answerCallbackQuery/.test(t.run('__calls[0].u')));
    chk('شناسه‌های چندتایی جدا و عدد ادغام‌شده کنار گذاشته می‌شود', JSON.stringify(t.run(`tgChatIds_('111111, 222222;-1001234567890')`)) === '["111111","222222","-1001234567890"]' && t.run('tgChatIds_(70000017000002400).length') === 0 && t.run('tgChatIds_(70000017)[0]') === '70000017');  // pii:ok ساختگی
    t.run(`__mode = ''; __calls = []; tgSend_('111111,222222', 'سلام')`);
    chk('پیام به خانهٔ دوشناسه‌ای به هر دو می‌رسد', t.run(`__calls.filter(function (c) { return /sendMessage/.test(c.u); }).map(function (c) { return String(c.b.chat_id); }).join(' ')`) === '111111 222222');
    t.run(`__calls = []; tgSend_(70000017000002400, 'سلام')`);
    chk('عدد ادغام‌شده فرستاده نمی‌شود', t.run(`__calls.filter(function (c) { return /sendMessage/.test(c.u); }).length`) === 0);
  }
  const q = loadBot(BOT);
  chk('بدون ci_key.gs هیچ توقفی نیست', q.run(`ciPaused_({ triggerUid: 'u' }, 'tgPayTick', 'skip')`) === false);
}

// ۵) آزمون‌های جریان روی شیت حافظه‌ای (مسیرهای واقعی، نه حالت خشک)
try { for (const p of runFlows(BOT)) problems.push(p); } catch (e) { problems.push('آزمون‌های جریان: ' + (e && e.stack || e)); }

// ۶.۵) مجوزهای گوگل (v169.2.2): هر مجوزی که کد لازم دارد باید در bot/scopes.approved.json باشد؛ مجوز تازه = توقف و خبر به یاسر.
//      اجرای خشک و تست روی دیپلوی آزمایشی مجوز تازه را نمی‌گیرد (v169.2 همین‌طور روی بات زنده شکست خورد).
try {
  for (const b of scopeSelfTest()) problems.push('خودآزمایی بررسی مجوز: ' + b);
  for (const n of newScopes()) problems.push(`مجوز تازهٔ گوگل لازم است: ${n.scope} (${n.files.join('، ')}). انتشار متوقف شد؛ به یاسر خبر بده. پیش از انتشار باید مجوز در ویرایشگر Apps Script تأیید و به bot/scopes.approved.json اضافه شود.`);
  const man = JSON.parse(readFileSync(join(BOT, 'appsscript.json'), 'utf8')), apr = JSON.parse(readFileSync(join(BOT, 'scopes.approved.json'), 'utf8'));
  for (const s of (man.oauthScopes || [])) if (!apr.approved.includes(s)) problems.push(`مجوز تازه در appsscript.json: ${s}`);
  for (const a of ((man.dependencies || {}).enabledAdvancedServices || [])) if (!(apr.advanced || []).includes(a.serviceId)) problems.push(`سرویس پیشرفتهٔ تازه در appsscript.json: ${a.serviceId} (مجوز تازه می‌خواهد)`);
} catch (e) { problems.push('بررسی مجوزها: ' + (e && e.message)); }

// ۶.۶) صفحهٔ مینی‌اپ (v170.5): متنی که در دیپلوی داخل app_page.gs می‌رود همان فایل مخزن است و wppage.gs همان هش گردش کار را می‌سازد
try {
  const html = readFileSync(join(ROOT, PAGE), 'utf8');
  const ctx = {}; vm.runInNewContext(pageGs(html), ctx);
  if (ctx.WP_PAGE_SRC !== html) problems.push('صفحهٔ مینی‌اپ: متن داخل app_page.gs با فایل مخزن یکی نیست');
  bot.g.WP_PAGE_SRC = html;
  const inProj = bot.run('wpPageSha_(wpPageNorm_(wpPageRepo_()))');
  delete bot.g.WP_PAGE_SRC;
  if (inProj !== pageSha(html)) problems.push(`صفحهٔ مینی‌اپ: هش متن داخل پروژه (${String(inProj).slice(0, 12)}) با هش مخزن (${pageSha(html).slice(0, 12)}) یکی نیست`);
  else out(`صفحهٔ مینی‌اپ: متن داخل پروژه = مخزن (${html.length} نویسه، هش ${pageSha(html).slice(0, 12)})\n`);
} catch (e) { problems.push('صفحهٔ مینی‌اپ: ' + (e && e.message)); }

// ۶.۷) قفل انتشار و رزرو شمارهٔ نسخه (v170.5): دو انتشار هم‌زمان آزاد نمی‌شوند؛ نسخهٔ رزرونشده یا رزرو شاخهٔ دیگر مردود است
try {
  for (const b of lockSelfTest()) problems.push('قفل انتشار: ' + b);
  for (const b of versionSelfTest()) problems.push('رزرو نسخه: ' + b);
  for (const b of featuresSelfTest()) problems.push('خودآزمایی قابلیت کامل: ' + b);
  { const fr = featuresCheck('.'); for (const b of fr.bad) problems.push('قابلیت کامل (docs/features.json): ' + b); fr.info.forEach((x) => console.log('قابلیت کامل · ' + x)); }
  for (const b of prevSelfTest()) problems.push('پشتوانهٔ برگشت: ' + b);
} catch (e) { problems.push('قفل انتشار و رزرو نسخه: ' + (e && e.message)); }

// ۶) نقشهٔ بات در docs با کد یکی باشد (فایل‌ها، تب‌ها، نقش‌ها، کارهای زمان‌دار، تست‌ها)
try { if (!mapIsFresh()) problems.push('نقشهٔ بات (docs/bot/MAP.md) با کد یکی نیست. اجرا کن: node .github/scripts/bot-map.mjs و بخش دستی را هم ببین.'); }
catch (e) { problems.push('نقشهٔ بات: ' + (e && e.message)); }

out(`## بررسی محلی بات پیش از انتشار\n`);
out(`${suites.length} مجموعه · ${pass} قبول · ${fail} مردود (بدون ${LIVE_ONLY.size} مجموعهٔ وابسته به دادهٔ واقعی) · درخواست شبکه: ${bot.fetches.length}\n`);
out('| مجموعه | قبول | مردود | ms |\n|---|---|---|---|');
for (const x of rows) out(`| ${x.live ? '⏭' : x.fail ? '❌' : '✅'} ${x.name} | ${x.pass} | ${x.fail} | ${x.ms} |`);
if (problems.length) {
  out('\n### ❌ مشکل‌ها\n');
  for (const p of problems) out('```\n' + p + '\n```');
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
if (problems.length) {
  console.log(`::error::بررسی محلی بات: ${problems.length} مشکل. انتشار انجام نمی‌شود.`);
  process.exit(1);
}
console.log(`::notice::بررسی محلی بات سبز: ${pass} قبول.`);
