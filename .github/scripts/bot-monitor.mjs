// پس از انتشار بات (از .github/workflows/bot-deploy.yml):
//   node bot-monitor.mjs promote  ← صبر تا نشانی اصلی نسخهٔ تازه را سرو کند، بعد 'resume' (کارهای زمان‌دار از توقف بیرون می‌آیند)
//   node bot-monitor.mjs props    ← (v169.4) سکرت‌های وردپرس به Script Properties (بی چاپ مقدار)
//   node bot-monitor.mjs page-sync ← (v169.4) برگهٔ 503886 بعد از انتشار سبز
//   node bot-monitor.mjs once     ← (v166.20) اجرای یک‌بارهٔ ONCE_FN بعد از انتشار سبز (فقط اجرای دستی)
//   node bot-monitor.mjs watch    ← خلاصهٔ خطاهای ۲۴ ساعت گذشته، بعد پایش تب «خطاها» تا MONITOR_MIN دقیقه.
//                                    اگر خطایی آمد که در ۷ روز پیش از push نبود، کد خروج ۲ (گردش کار نسخهٔ قبل را برمی‌گرداند).
// پاسخ ci فقط نام تابع، تعداد و متن پوشانده‌شده دارد (ci.gs → ciErrs_)؛ هیچ اطلاعات مراجعی اینجا نمی‌آید.
import { appendFileSync, readFileSync } from 'node:fs';

const EXEC = process.env.BOT_EXEC_URL;
const KEY = readFileSync(`${process.env.RUNNER_TEMP}/ci_key`, 'utf8').trim();
const BUILD = process.env.CI_BUILD;
const T0 = Number(process.env.CI_T0 || 0);            // زمان push (میلی‌ثانیه)
const MONITOR_MIN = Number(process.env.MONITOR_MIN || 60);
const POLL_SEC = Number(process.env.POLL_SEC || 300);
const DAY = 86400000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = (md) => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); };
const output = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

async function call(body) {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(EXEC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, k: KEY }), redirect: 'follow' });
      const text = await res.text();
      try { return JSON.parse(text); } catch { console.log(`پاسخ گذرا (${i + 1}/5): HTTP ${res.status}`); }
    } catch (e) { console.log(`خطای شبکه (${i + 1}/5): ${e}`); }
    await sleep(5000 * (i + 1));
  }
  return { ok: false, error: 'پاسخی نیامد' };
}

// v167: «key» درست بعد از انتشار یعنی پاسخ از نسخهٔ قبلی آمده؛ تا ۶ بار با ۱۰ ثانیه فاصله دوباره
async function callFresh(body) {
  let r;
  for (let i = 0; i < 6; i++) {
    r = await call(body);
    if (r.error !== 'key') return r;
    console.log(`پاسخ «key» از نسخهٔ قبلی (${i + 1}/6)؛ ۱۰ ثانیهٔ دیگر`);
    await sleep(10000);
  }
  return r;
}

// کلید مقایسه: تابع + متن، با عددهای پوشانده (ci.gs خودش عددها را # کرده)
// v166.29.1: یک خط سلامت (ci.gs → ciHealth_)
const healthLine = (hl) => {
  const h = hl.hook || {}, st = hl.site || {};
  return `سلامت: وبهوک ${h.set ? 'ثبت' : 'نیست'}${h.viaRelay ? ' (رله)' : ''} · صف ${h.pending ?? '?'} · آخرین خطا ${h.lastErrMin ?? '-'} دقیقه پیش ${h.lastErr || ''}` +
    ` · رله ${hl.relay.state} (پینگ ${hl.relay.pingMin ?? '-'}د، پاسخ ${hl.relay.pongMin ?? '-'}د)` +
    ` · فهرست همکاران به سایت ${hl.push.thersMin ?? '-'}د${hl.push.thers404Min != null ? ' (۴۰۴ ' + hl.push.thers404Min + 'د)' : ''}` +
    ` · کش سایت ${st.src || st.http || st.error || '?'} سن ${st.age ?? '-'}ث (${st.n ?? '-'} نفر) · کمپین ${hl.push.campMin ?? '-'}د · رویدادها ${hl.evFlushMin ?? '-'}د`;
};

// v170.23.5: لاگ گردش کار این مخزن عمومی است؛ شناسهٔ شیت، درایو و تقویم (رشتهٔ بلند بی‌فاصله) در خروجی یک‌باره‌ها پوشانده می‌شود
export const maskIds = (s) => String(s ?? '').replace(/[A-Za-z0-9_-]{25,}/g, '<شناسه>').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<ایمیل>');
const keyOf = (r) => `${r.where}|${String(r.msg).replace(/#/g, '').replace(/\s+/g, ' ').trim()}`;

const mode = process.argv[2];

if (mode === 'promote') {
  // v167: تا چند ثانیه بعد از به‌روز شدن دیپلوی اصلی، گوگل بعضی درخواست‌ها را هنوز با نسخهٔ قبل (و ci_key.gs قبلی) جواب
  // می‌دهد و آن نسخه کلید تازه را «key» رد می‌کند. پس سه پاسخ پشت هم از نسخهٔ تازه لازم است، و پاسخ «key» گذراست.
  const t0 = Date.now();
  let streak = 0;
  for (;;) {
    const r = await call({ ci: 'ping' });
    streak = (r.ok && r.build === BUILD) ? streak + 1 : 0;
    if (streak >= 3) break;
    if (streak) { await sleep(5000); continue; }
    if (Date.now() - t0 > 5 * 60 * 1000) { console.log(`::error::نشانی اصلی بعد از ۵ دقیقه نسخهٔ تازه را سرو نمی‌کند: ${JSON.stringify(r).slice(0, 200)}`); process.exit(1); }
    await sleep(15000);
  }
  const r = await callFresh({ ci: 'resume' });
  if (!r.ok) { console.log(`::error::کارهای زمان‌دار از توقف بیرون نیامدند: ${r.error}`); process.exit(1); }
  console.log(`نشانی اصلی نسخهٔ تازه را سرو می‌کند؛ کارهای زمان‌دار ادامه پیدا کردند. کارهای عقب‌افتاده: ${(r.deferred || []).join('، ') || 'هیچ'}`);
  summary(`- کارهای زمان‌دار از توقف بیرون آمدند؛ کارهای عقب‌افتاده: ${(r.deferred || []).join('، ') || 'هیچ'}`);
  // v166.29.1: آزمون دود روی نشانی اصلی (خشک، بی لید واقعی): مسیر بات و فرم سایت. مردود = برگشت.
  const sm = await callFresh({ ci: 'smoke' });
  if (sm.error === 'op') console.log('::warning::آزمون دود در این نسخه نیست');
  else if (!sm.ok) { console.log(`::error::آزمون دود مردود: بات ${sm.bot ? 'سبز' : 'قرمز'} · فرم سایت ${sm.site ? 'سبز' : 'قرمز'} · نشت ${(sm.leak || []).join('، ') || 'هیچ'} ${sm.error || ''}`); summary('\n**❌ آزمون دود مسیر لید مردود**'); process.exit(1); }
  else { console.log('آزمون دود: ساخت لید از بات و فرم سایت سبز (خشک، بی لید واقعی).'); summary('- آزمون دود: لید از بات و فرم سایت سبز (خشک)'); }
  // سلامت: وبهوک، پینگ رله، تریگرها، فرستادن به سایت، کش سایت (بی دادهٔ شخصی)
  const hl = await callFresh({ ci: 'health' });
  if (hl.ok) {
    console.log(healthLine(hl));
    console.log('تریگرها: ' + Object.entries(hl.triggers || {}).map(([f, n]) => `${f}×${n}`).join(' '));
    // v169.1: سقف Apps Script ۲۰ تریگر است (یک‌بارهٔ دیپلوی و vxTick هم تریگر موقت می‌سازند)
    const tcount = hl.trigCount ?? Object.values(hl.triggers || {}).reduce((s, n) => s + n, 0);
    if (tcount >= 20) { console.log(`::error::شمار تریگرها ${tcount} است؛ سقف ۲۰ پر شده و تریگر تازه ساخته نمی‌شود.`); summary(`\n**❌ شمار تریگرها ${tcount} از ۲۰**`); }
    else if (tcount >= 18) { console.log(`::warning::شمار تریگرها ${tcount} از ۲۰ است.`); summary(`\n**⚠️ شمار تریگرها ${tcount} از ۲۰**`); }
    else console.log(`شمار تریگرها: ${tcount} از ۲۰`);
    // v170: زمان اجرای صف ارسال در خط جدا (شرط یاسر: دیده شود که از سهمیهٔ ۹۰ دقیقه نمی‌خورد)
    if (hl.dq && !hl.dq.error) { const t = hl.dq.today || {}, y = hl.dq.yesterday || {}; const line = `صف ارسال: امروز ${t.sec ?? '-'} ثانیه در ${t.n ?? 0} اجرا (${t.skip ?? 0} بار بی‌خواندن شیت) · دیروز ${y.sec ?? '-'} ثانیه در ${y.n ?? 0} اجرا · ردیف منتظر: ${hl.dq.pending ? 'دارد' : 'ندارد'}`; console.log(line); summary(`- ${line}`); }
    // v169.4: آخرین همگام‌سازی برگهٔ مینی‌اپ
    if (hl.page) { const pg = hl.page; console.log(pg.state ? `برگهٔ مینی‌اپ: ${pg.state}` : `${pg.ok ? '' : '::warning::'}برگهٔ مینی‌اپ: ${pg.msg || pg.error || '?'} (${pg.ver || '-'}، ${pg.min ?? '-'} دقیقه پیش)`); }
    summary(`- سلامت: صف وبهوک ${(hl.hook || {}).pending ?? '?'} · رله ${hl.relay.state} · فهرست همکاران ${hl.push.thersMin ?? '-'} دقیقه پیش`);
  }
  // زمان اجرای کارهای زمان‌دار در روزهای گذشته (سقف حساب شخصی: ۹۰ دقیقه در روز)
  const st = await call({ ci: 'stats' });
  if (st.ok && st.days && Object.keys(st.days).length) {
    const days = Object.keys(st.days).sort();
    summary('\n## زمان اجرای کارهای زمان‌دار (دقیقه در روز؛ سقف ۹۰)\n');
    summary('| روز | جمع | ' + 'بیشترین‌ها |\n|---|---|---|');
    for (const d of days) {
      const o = st.days[d], fns = Object.keys(o);
      const tot = fns.reduce((a, f) => a + o[f][1], 0) / 60000;
      const top = fns.sort((a, b) => o[b][1] - o[a][1]).slice(0, 5).map((f) => `${f} ${(o[f][1] / 60000).toFixed(1)} (${o[f][0]} بار، بیشینه ${(o[f][2] / 1000).toFixed(0)}ث)`).join(' · ');
      summary(`| ${d} | ${tot.toFixed(1)} | ${top} |`);
    }
    console.log('زمان اجرای کارهای زمان‌دار: ' + days.map((d) => d + ' ' + (Object.values(st.days[d]).reduce((a, x) => a + x[1], 0) / 60000).toFixed(1) + 'د').join(' · '));
    // v166.26: ریز هر تابع در لاگ هم (Summary از بیرون خوانده نمی‌شود): روز · تابع · بار · دقیقه · بیشینهٔ ثانیه
    for (const d of days.slice(-3)) {
      const o = st.days[d];
      console.log(`RS ${d} ` + Object.keys(o).sort((a, b) => o[b][1] - o[a][1]).map((f) => `${f}=${o[f][0]}x/${(o[f][1] / 60000).toFixed(1)}m/${(o[f][2] / 1000).toFixed(0)}s`).join(' '));
    }
  }
  process.exit(0);
}

if (mode === 'props') {
  // v169.4: سکرت‌های وردپرس به Script Properties (ci.gs → wpPageProps_). مقدارها هرگز چاپ نمی‌شوند؛ فقط نام کلیدهای ثبت‌شده.
  const props = { WP_BOT_USER: process.env.WP_BOT_USER || '', WP_BOT_APP_PASSWORD: process.env.WP_BOT_APP_PASSWORD || '' };
  // v170.4: رمزهای مشترک با سایت (CP_WP_SECRET، SITE_LEAD_SECRET)؛ فقط اگر در GitHub Secrets هست
  for (const k of ['CP_WP_SECRET', 'SITE_LEAD_SECRET', 'BOT_API_KEY', 'GH_DISPATCH_TOKEN']) if (process.env[k]) props[k] = process.env[k];   // v170.23.7: توکن دکمهٔ ادغام   // v170.16.1: کلید دوم درگاه
  if (process.env.SITE_SIG_ENFORCE === '0' || process.env.SITE_SIG_ENFORCE === '1') props.SITE_SIG_ENFORCE = process.env.SITE_SIG_ENFORCE;   // v170.9: متغیر GitHub، نه رمز
  if (!Object.values(props).some(Boolean)) { console.log('::warning::هیچ سکرتی برای ثبت نیست.'); process.exit(0); }
  const r = await call({ ci: 'props', props });
  if (r.error === 'op') { console.log('::warning::این نسخه ثبت سکرت وردپرس را ندارد'); process.exit(0); }
  console.log(r.ok ? `سکرت‌های وردپرس در Script Properties: ${(r.set || []).join('، ')}` : `::warning::سکرت‌های وردپرس کامل ثبت نشد: ${(r.set || []).join('، ') || 'هیچ'}`);
  if ((r.sec || []).length) console.log(`رمزهای مشترک با سایت در Script Properties: ${r.sec.join('، ')}`);
  if (r.flag) console.log(`کلید: ${r.flag}`);
  process.exit(0);
}

if (mode === 'page-sync') {
  // v169.4: برگهٔ 503886 (/app/) از site/pages/503886-app.html (ci.gs → wpPageSync_). شکستش انتشار بات را برنمی‌گرداند.
  const r = await call({ ci: 'pagesync', sha: process.env.PAGE_SHA || '' });
  if (r.error === 'op') { console.log('::warning::این نسخه همگام‌سازی برگه را ندارد'); process.exit(0); }
  const msg = `برگهٔ مینی‌اپ 503886: ${r.msg || r.error || '?'}`;
  console.log(r.ok ? `::notice::${msg}` : `::warning::${msg}`);
  summary(`- ${r.ok ? '' : '⚠️ '}${msg}`);
  process.exit(0);
}

if (mode === 'once') {
  // اجرای یک‌باره (ci.gs → ciOnce_). خروجی فقط شمارش است.
  const fn = process.env.ONCE_FN;
  const r = await call({ ci: 'once', fn });
  if (!r.ok) { console.log(`::error::اجرای یک‌بارهٔ ${fn} نشد: ${r.error}`); summary(`\n**❌ اجرای یک‌بارهٔ ${fn} نشد:** ${r.error}`); process.exit(1); }
  const msg = `${r.already ? 'قبلاً اجرا شده بود' : 'اجرا شد'} (${r.result.at}): ${maskIds(r.result.out)}`;
  console.log(`::notice::${fn}: ${msg}`);
  summary(`\n## اجرای یک‌باره\n\n- \`${fn}\`: ${msg}`);
  process.exit(0);
}

if (mode === 'once-auto') {
  // v166.22: کارهای یک‌بارهٔ CI_ONCE_AUTO بعد از هر انتشار سبز
  const r = await call({ ci: 'onceAuto' });
  if (!r.ok) { console.log(`::warning::کارهای یک‌باره اجرا نشدند: ${r.error}`); process.exit(0); }
  for (const x of r.runs) {
    const msg = `${x.fn}: ${x.ok ? (x.already ? 'قبلاً اجرا شده بود' : 'اجرا شد') : 'نشد'} · ${maskIds(x.out)}`;
    console.log(x.ok ? msg : `::warning::${msg}`);
    if (!x.already) summary(`- یک‌باره: ${msg}`);
  }
  process.exit(0);
}

if (mode !== 'watch') { console.log('mode: promote | watch | once | once-auto | props | page-sync'); process.exit(1); }

const first = await call({ ci: 'errs', since: T0 - 7 * DAY });
if (!first.ok) {
  console.log(`::warning::تب «خطاها» خوانده نشد (${first.error}). پایش خطا انجام نمی‌شود.`);
  summary(`\n**⚠️ تب «خطاها» خوانده نشد؛ پایش خطا انجام نشد.**`);
  output('monitor', 'unavailable');
  process.exit(0);
}
// v170.23.5: صندوق یکتای خطا یک ردیف برای هر اثر انگشت دارد؛ «first» اولین بار است (سطر قدیمی بی first: همان t)
const base = new Set(first.rows.filter((r) => (r.first ?? r.t) < T0).map(keyOf));

// خلاصهٔ ۲۴ ساعت پیش از انتشار
const day = first.rows.filter((r) => r.t >= T0 - DAY && r.t < T0);
const by = new Map();
for (const r of day) { const k = keyOf(r); const x = by.get(k) || { where: r.where, msg: r.msg, n: 0 }; x.n += r.n; by.set(k, x); }
const top = [...by.values()].sort((a, b) => b.n - a.n);
summary(`\n## خطاهای ۲۴ ساعت پیش از انتشار\n\n${top.reduce((s, x) => s + x.n, 0)} بار در ${top.length} نوع (از تب «خطاها»، متن پوشانده‌شده)\n`);
summary('| تعداد | تابع | خطا |\n|---|---|---|');
for (const x of top.slice(0, 40)) summary(`| ${x.n} | ${x.where} | ${String(x.msg).replace(/\|/g, '/')} |`);
console.log(`خطاهای ۲۴ ساعت پیش: ${top.length} نوع. پایه برای مقایسه: ${base.size} نوع در ۷ روز.`);

// پایش
/* هم‌خانوادهٔ tgTestTransient_ در bot/telegram.gs، به‌علاوهٔ سقف هم‌زمانی سرویس شیت (Too many simultaneous invocations) */
const TRANSIENT = /Too many simultaneous invocations|Service \w+ failed while accessing|Service invoked too many times|Address unavailable|Service unavailable|We're sorry, a server error occurred|Exception: (Timeout|Internal error)/i;
const TRANSIENT_MAX = 3;
const warned = new Set();
const end = Date.now() + MONITOR_MIN * 60 * 1000;
let misses = 0;
for (;;) {
  const r = await call({ ci: 'errs', since: T0 });
  if (!r.ok) { misses++; console.log(`خواندن خطاها نشد (${misses})`); }
  else {
    const fresh = r.rows.filter((x) => !base.has(keyOf(x)));
    const seen = new Set(); const uniq0 = fresh.filter((x) => { const k = keyOf(x); if (seen.has(k)) return false; seen.add(k); return true; });
    // خطای گذرای سرویس گوگل (مثل «Too many simultaneous invocations») عیب کد نیست؛ تا کمتر از TRANSIENT_MAX بار فقط هشدار است
    const times = new Map(); for (const x of fresh) times.set(keyOf(x), (times.get(keyOf(x)) || 0) + (x.n || 1));
    const uniq = uniq0.filter((x) => !(TRANSIENT.test(String(x.msg)) && times.get(keyOf(x)) < TRANSIENT_MAX));
    for (const x of uniq0) if (uniq.indexOf(x) < 0 && !warned.has(keyOf(x))) { warned.add(keyOf(x)); console.log(`::warning::خطای گذرای گوگل (برگشت نمی‌خورد مگر ${TRANSIENT_MAX} بار تکرار شود): ${x.where}: ${x.msg} (×${times.get(keyOf(x))})`); }
    console.log(`${new Date().toISOString()} · خطاهای بعد از انتشار: ${r.rows.length} سطر · تازه: ${uniq.length}${uniq0.length > uniq.length ? ` · گذرای گوگل: ${uniq0.length - uniq.length}` : ''}`);
    if (uniq.length) {
      console.log('::error::خطای تازه بعد از انتشار؛ نسخهٔ قبل برمی‌گردد.');
      summary(`\n## ❌ خطای تازه بعد از انتشار\n\n| تعداد | تابع | خطا |\n|---|---|---|`);
      for (const x of uniq) { console.log(`- ${x.where}: ${x.msg} (×${x.n})`); summary(`| ${x.n} | ${x.where} | ${String(x.msg).replace(/\|/g, '/')} |`); }
      output('monitor', 'new_errors');
      process.exit(2);
    }
  }
  if (Date.now() >= end) break;
  await sleep(POLL_SEC * 1000);
}
if (misses) console.log(`::warning::${misses} بار خواندن تب «خطاها» نشد.`);
summary(`\n✅ ${MONITOR_MIN} دقیقه پایش: خطای تازه‌ای نیامد.`);
// v166.29.1: سلامت دوباره در پایان پایش (کارهای زمان‌دار در این فاصله دست‌کم یک بار اجرا شده‌اند)
{ const hl = await call({ ci: 'health' }); if (hl.ok) { console.log('پایان پایش · ' + healthLine(hl)); summary(`- پایان پایش: فهرست همکاران ${hl.push.thersMin ?? '-'} دقیقه پیش · کش سایت ${(hl.site || {}).src || '?'} سن ${(hl.site || {}).age ?? '-'}ث`); } }
output('monitor', 'clean');
