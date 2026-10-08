// آزمون دود ورکر دستیار از runner گیت‌هاب (edge/assist/smoke-cases.mjs): هر ۵۰ پرسش پرتکرار با یک شکل دیگر، پرسش‌های بی‌ربط
// و پرسش‌های واژهٔ ممنوع؛ زیر ۹۵٪ درست یا هر پاسخ کندتر از ۳ ثانیه (با جمنای ۵) قرمز. با LEAD_SECRET درخواست امضا می‌شود تا سقف نرخ هر IP نخورد.
// node edge/assist/smoke.mjs <نشانی ورکر>
import { createHmac } from 'node:crypto';
import { runAll } from './smoke-cases.mjs';
const BASE = (process.argv[2] || process.env.ASSIST_EDGE_URL || '').replace(/\/+$/, '');
if (!BASE) { console.log('::error::نشانی ورکر داده نشد'); process.exit(1); }
const SECRET = process.env.LEAD_SECRET || '';
const health = await (await fetch(BASE + '/assist/health')).json().catch(() => ({}));
console.log(`دادهٔ ورکر: نسخهٔ ${health.v || '?'} · ${health.at || '?'} · پرسش‌های پرتکرار ${health.faq ?? '?'} (${health.faq_v || '-'}) · دانش ${health.kb ?? '?'} · نمایه ${health.idx ?? '?'} · کلید جمنای ${health.gemini ? 'هست' : 'نیست'} · ASSIST_REWRITE ${health.rewrite ? 'بله' : 'خیر'} · آخرین جمنای ${health.gem_last ? health.gem_last.why + ' ' + health.gem_last.ms + 'ms' : '-'} · رویدادهای تقویم ${health.events ?? '?'}`);
const slow = [];
const ask = async (text) => {
  const body = JSON.stringify({ action: 'assist.ask', channel: 'smoke', session_id: 'smoke-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text });
  const H = { 'content-type': 'application/json', Origin: 'https://tajrobeh.life' };
  if (SECRET) { const ts = String(Math.floor(Date.now() / 1000)); H['X-Tj-Ts'] = ts; H['X-Tj-Sig'] = createHmac('sha256', SECRET).update(ts + '.' + body).digest('hex'); }
  const t0 = Date.now(); let st = 0, j = null, stH = '';
  try { const r = await fetch(BASE + '/assist', { method: 'POST', headers: H, body }); st = r.status; stH = r.headers.get('server-timing') || ''; j = await r.json(); } catch (e) { j = { ok: false, error: String(e) }; }
  const ms = Date.now() - t0, gem = /gemini/.test(stH), why = (/gem;desc="([^"]*)"/.exec(stH) || [])[1] || '';
  if (ms > (gem ? 5000 : 3000)) slow.push(`«${text}»: ${ms} میلی‌ثانیه`);
  return { j, st, ms, why };
};
const R = await runAll(ask);
console.log(R.table);
const head = `درست: ${R.ok} از ${R.total} (${Math.round(R.rate * 1000) / 10}٪؛ مرز ۹۵٪)`;
console.log(head);
if (process.env.GITHUB_STEP_SUMMARY) { const { appendFileSync } = await import('node:fs'); appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## آزمون دود ورکر دستیار\n\n' + head + '\n\n' + R.table + '\n'); }
for (const b of R.bad) console.log((R.pass ? '::warning::' : '::error::') + b);
for (const s of slow) console.log('::error::کند: ' + s);
process.exit(R.pass && !slow.length ? 0 : 1);
