// تست دود دستیار سایت (ورکر لبهٔ tj-assist، همان مسیر ویجت): مورد‌های edge/assist/smoke-cases.mjs؛ هر ۵۰ پرسش پرتکرار با یک شکل دیگر
// باید همان id را برگرداند، پرسش‌های بی‌ربط none و واژهٔ ممنوع بی جواب کمپین. زیر ۹۵٪ درست، یا پاسخ کندتر از ۳ ثانیه (با جمنای ۵)، قرمز.
// با SITE_LEAD_SECRET درخواست‌ها امضا می‌شوند (سقف نرخ هر IP نمی‌خورد). فقط گزارش بی متن خود دستیار نوشته می‌شود.
import { assistAsk, assistEdge, fail, loadEnv, log, summary } from './site-lib.mjs';
import { runAll } from '../../edge/assist/smoke-cases.mjs';

loadEnv();
if (!assistEdge()) { fail('نشانی ورکر دستیار پیدا نشد (اسنیپت 501145)'); process.exit(1); }
const slow = [];
const R = await runAll(async (q) => {
  const sid = 'smoke-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const { status: st, j, ms, gem, why } = await assistAsk(q, sid);
  if (ms > (gem ? 5000 : 3000)) slow.push(`«${q}»: ${ms} میلی‌ثانیه`);
  return { st, j, ms, why };
});
const head = `درست: ${R.ok} از ${R.total} (${Math.round(R.rate * 1000) / 10}٪؛ مرز ۹۵٪)`;
log(head);
summary(`## تست دود دستیار (ورکر لبه)\n\n${head}\n\n${R.table}\n\n${R.bad.concat(slow.map((s) => 'کند: ' + s)).map((e) => `- ⛔ ${e}`).join('\n') || '✅ قبول'}`);
if (!R.pass) R.bad.forEach(fail);
slow.forEach((s) => fail('کند: ' + s));
process.exit(R.pass && !slow.length ? 0 : 1);
