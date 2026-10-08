// تست دود کمپین (بعد از هر انتشار، و برای عوض کردن رمز کمپین). هیچ داده‌ای روی سایت نوشته نمی‌شود:
//  - /camp-push با رمز تازه و فهرست خالی ← ۲۰۰ و saved=0 (رمز پذیرفته شد، چیزی ذخیره نشد)
//  - /thers-push با رمز تازه و فهرست خالی ← ۴۰۰ «empty» (رمز پذیرفته شد، فهرست قبلی دست نخورد)
//  - هر دو با رمز غلط یا بی رمز ← ۴۰۱ یا ۴۰۳
//  - /camp?code=EFT-1 ← داده با زمان آخرین ارسال بات (pushed)
//  - دستیار سایت: یک پرسش نمونه به ورکر لبهٔ tj-assist (همان مسیر ویجت 501145 از ۱۶ مهر) ← ۲۰۰، پاسخ، زیر ۵ ثانیه.
//    مسیر قدیم سرور (/wp-json/tj/v1/assist، اسنیپت 506148) دیگر در مسیر کاربر نیست و اینجا سنجیده نمی‌شود.
// رمز فقط از متغیر محیطی CP_WP_SECRET (GitHub Secret) و هرگز چاپ نمی‌شود.
import { assistAsk, assistEdge, fail, loadEnv, log, summary, wpClient } from './site-lib.mjs';

loadEnv();
const wp = wpClient();
const SEC = (process.env.CP_WP_SECRET || '').trim();
const WRONG = 'x'.repeat(48);
const lines = [], errs = [];
const say = (m) => { lines.push(m); log(m); };
async function push(path, body, secret) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'tajrobeh-site-ops/1' };
  if (secret) headers['x-tj-secret'] = secret;
  const r = await fetch(wp.base + path, { method: 'POST', headers, body: JSON.stringify(body) });
  let j = null; try { j = JSON.parse(await r.text()); } catch {}
  return { status: r.status, j };
}
for (const [path, body, okCode, okTest] of [
  ['/wp-json/tj/v1/camp-push', { camps: [] }, 200, (j) => j?.ok === true && j?.saved === 0],
  ['/wp-json/tj/v1/thers-push', { list: [] }, 400, (j) => j?.error === 'empty'],
]) {
  const bad = await push(path, body, WRONG), none = await push(path, body, '');
  say(`- ${path}: رمز غلط ${bad.status} · بی رمز ${none.status}`);
  if (![401, 403].includes(bad.status) || ![401, 403].includes(none.status)) errs.push(`${path} بی رمز درست پذیرفته شد`);
  if (SEC) {
    const good = await push(path, body, SEC);
    say(`- ${path}: رمز تازه ${good.status}`);
    if (good.status !== okCode || !okTest(good.j)) errs.push(`${path} رمز تازه را نپذیرفت (${good.status})`);
  } else say(`- ${path}: CP_WP_SECRET در گیت‌هاب نیست؛ رمز تازه سنجیده نشد`);
}
const c = await wp.get('/wp-json/tj/v1/camp?code=EFT-1', { authed: false });
const age = c.json?.pushed ? Math.round((Date.now() / 1000 - c.json.pushed) / 60) : null;
say(`- /camp?code=EFT-1: HTTP ${c.status}${age != null ? ` · آخرین ارسال بات ${age} دقیقه پیش` : ''}`);
if (c.status !== 200) errs.push('دادهٔ کمپین EFT-1 در دسترس نیست');
const sid = 'smoke-' + new Date().toISOString().slice(0, 10);
const as = await assistAsk('هزینه جلسه چقدر است', sid);
say(`- دستیار (ورکر لبه): HTTP ${as.status} · ok=${as.j?.ok} · ${as.ms} میلی‌ثانیه · پاسخ ${as.j?.answer ? as.j.answer.length + ' حرف' : 'ندارد'} · منبع ${as.j?.source || '-'}`);
if (!assistEdge()) errs.push('نشانی ورکر دستیار پیدا نشد (اسنیپت 501145)');
else if (as.status !== 200 || !as.j?.ok || !as.j?.answer) errs.push(`دستیار سایت پاسخ درست نداد (${as.status} ${as.j?.error || ''})`);
else if (as.ms > 5000) errs.push(`دستیار سایت کند است (${as.ms} میلی‌ثانیه)`);
summary(`## تست دود کمپین\n\n${lines.join('\n')}\n\n${errs.length ? errs.map((e) => `- ⛔ ${e}`).join('\n') : '✅ قبول'}`);
errs.forEach(fail);
process.exit(errs.length ? 1 : 0);
