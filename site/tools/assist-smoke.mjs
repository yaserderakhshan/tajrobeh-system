// تست دود دستیار: پرسش‌های edge/assist/smoke-cases.mjs (با کلیدواژهٔ لازم و ممنوع) به ورکر لبهٔ tj-assist (همان مسیر ویجت سایت از ۱۶ مهر)، با زمان هر پرسش؛
// قبولی: پاسخ درست زیر ۳ ثانیه (با جمنای زیر ۵ ثانیه). یک پرسش پشتیبان هم از مسیر قدیم سرور (/wp-json/tj/v1/assist،
// اسنیپت 506148) فقط برای گزارش؛ قرمزش انتشار را نمی‌ایستاند. هیچ داده‌ای نوشته نمی‌شود جز ردیف گزارش بی متن خود دستیار.
// پاسخ‌ها کوتاه و با redact (نگهبان شماره و ایمیل site-lib) چاپ می‌شوند.
import { assistAsk, assistEdge, fail, loadEnv, log, summary, warn, wpClient } from './site-lib.mjs';
import { piiLine } from '../../.github/scripts/pii-scan.mjs';
import { CASES, wrong } from '../../edge/assist/smoke-cases.mjs';

loadEnv();
const wp = wpClient();
const UA = { 'Content-Type': 'application/json', 'User-Agent': 'tajrobeh-site-ops/1', Origin: wp.base, Referer: wp.base + '/' };
const sid = 'smoke-' + new Date().toISOString().slice(0, 16).replace(/\D/g, '');
let mag = 'مقاله‌های مجلهٔ تجربه';
try {
  const r = await fetch(`${wp.base}/wp-json/wp/v2/posts?per_page=1&_fields=title`, { headers: { 'User-Agent': UA['User-Agent'] } });
  const j = await r.json(); const t = String(j?.[0]?.title?.rendered || '').replace(/<[^>]+>|&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  if (t) mag = t;
} catch {}
/* پرسش‌ها و سنجش درستی مشترک با آزمون دود ورکر؛ پرسش مجله فقط گزارش است */
const QS = CASES.map((c) => [c.name, c.q, c]).concat([['مقالهٔ مجله', `دربارهٔ «${mag}» در مجله بیشتر بگو`, null]]);
const lines = [], errs = [];
const clip = (s) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); const c = t.length > 220 ? t.slice(0, 220) + '…' : t; return piiLine(c, 'smoke').length ? '[پاسخ شامل شماره یا ایمیل بود؛ چاپ نشد]' : c; };
const rows = [];
if (!assistEdge()) errs.push('نشانی ورکر دستیار پیدا نشد (اسنیپت 501145)');
for (const [dom, q, c] of QS) {
  const { status: st, j, ms, gem } = await assistAsk(q, sid);
  const links = (j?.buttons || []).filter((b) => b.url).map((b) => b.url.replace(wp.base, '') || '/');
  const miss = /پیدا نکردم/.test(j?.answer || '');
  rows.push(`| ${dom} | ${st} | ${ms} | ${gem ? 'بله' : 'نه'} | ${j?.source || '-'} |`);
  lines.push(`### ${dom}\n- پرسش: ${dom === 'مقالهٔ مجله' ? 'دربارهٔ تازه‌ترین مقالهٔ مجله' : q}\n- HTTP ${st} · ${ms} میلی‌ثانیه · ok=${j?.ok} · تحویل ${j?.handoff ? 'بله' : 'خیر'} · ${links.length ? 'لینک ' + links.join('، ') : 'لینک ندارد'}${miss ? ' · ⚠️ بی‌پاسخ' : ''}\n- پاسخ: ${clip(j?.answer) || '(خالی)'}`);
  log(`${dom}: HTTP ${st} ${ms}ms ok=${j?.ok} handoff=${!!j?.handoff} links=${links.length}${miss ? ' بی‌پاسخ' : ''}`);
  if (st !== 200 || !j?.ok || !j?.answer) errs.push(`${dom}: پاسخ درست نیامد (${st} ${j?.error || ''})`);
  else if (ms > (gem ? 5000 : 3000)) errs.push(`${dom}: ${ms} میلی‌ثانیه (بیش از ${gem ? 5000 : 3000})`);
  else if (c) { const w = wrong(c, j.answer); if (w) errs.push(w); }
}
/* پرسش پشتیبان از مسیر قدیم سرور (فقط گزارش) */
let back = 'پاسخ نیامد';
try {
  const t0 = Date.now(), r = await fetch(wp.base + '/wp-json/tj/v1/assist', { method: 'POST', headers: UA, body: JSON.stringify({ session_id: sid, text: QS[0][1] }), signal: AbortSignal.timeout(20000) });
  let j = null; try { j = JSON.parse(await r.text()); } catch {}
  back = `HTTP ${r.status} · ${Date.now() - t0} میلی‌ثانیه · ok=${j?.ok}`;
  if (r.status !== 200 || !j?.ok) warn('مسیر قدیم سرور دستیار (506148) پاسخ درست نداد؛ ویجت سایت از آن استفاده نمی‌کند');
} catch { warn('مسیر قدیم سرور دستیار (506148) در ۲۰ ثانیه پاسخ نداد'); }
lines.unshift('| پرسش | HTTP | میلی‌ثانیه | جمنای | منبع |\n|---|---|---|---|---|\n' + rows.join('\n') + `\n\nپشتیبان، مسیر قدیم سرور: ${back}`);
summary(`## تست دود دستیار (ورکر لبه)\n\nsession: \`${sid}\`\n\n${lines.join('\n\n')}\n\n${errs.length ? errs.map((e) => `- ⛔ ${e}`).join('\n') : '✅ قبول'}`);
console.log(lines.join('\n\n'));
errs.forEach(fail);
process.exit(errs.length ? 1 : 0);
