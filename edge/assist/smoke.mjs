// آزمون دود ورکر دستیار از runner گیت‌هاب: پنج پرسش واقعی با مبدأ سایت و زمان هر کدام.
// node edge/assist/smoke.mjs <نشانی ورکر>   (پاسخ کامل زیر ۳ ثانیه؛ با جمنای زیر ۵ ثانیه)
const BASE = (process.argv[2] || process.env.ASSIST_EDGE_URL || '').replace(/\/+$/, '');
if (!BASE) { console.log('::error::نشانی ورکر داده نشد'); process.exit(1); }
const Q = [
  ['هزینهٔ جلسه', 'هزینه جلسه چقدر است'],
  ['روانکاوی', 'روانکاوی هفته‌ای چند جلسه است؟'],
  ['شروع تراپی', 'چطور تراپی را در تجربه شروع کنم؟'],
  ['کلینیک حضوری', 'کلینیک حضوری تجربه کجاست و چطور وقت بگیرم؟'],
  ['رویدادها', 'رویدادهای پیش رو']
];
const H = { 'content-type': 'application/json', Origin: 'https://tajrobeh.life' };
const rows = [], bad = [];
const health = await (await fetch(BASE + '/assist/health')).json().catch(() => ({}));
console.log(`دادهٔ ورکر: نسخهٔ ${health.v || '?'} · ${health.at || '?'} · دانش ${health.kb ?? '?'} · نمایه ${health.idx ?? '?'} · کلید جمنای ${health.gemini ? 'هست' : 'نیست'} · ASSIST_REWRITE ${health.rewrite ? 'بله' : 'خیر'} · آخرین جمنای ${health.gem_last ? health.gem_last.why + ' ' + health.gem_last.ms + 'ms' : '-'}`);
for (const [name, text] of Q) {
  const t0 = Date.now();
  let j = {}, st = 0, gem = false, why = '-';
  try { const r = await fetch(BASE + '/assist', { method: 'POST', headers: H, body: JSON.stringify({ action: 'assist.ask', channel: 'smoke', session_id: 'smoke-' + Date.now().toString(36), text }) }); st = r.status; const stH = r.headers.get('server-timing') || ''; gem = /gemini/.test(stH); why = (/gem;desc="([^"]*)"/.exec(stH) || [])[1] || '-'; j = await r.json(); } catch (e) { j = { error: String(e) }; }
  const ms = Date.now() - t0, lim = gem ? 5000 : 3000;
  rows.push(`| ${name} | ${st} | ${ms} | ${gem ? 'بله' : 'نه · ' + why} | ${j.source || '-'} | ${String(j.answer || j.error || '').replace(/\n/g, ' ').slice(0, 90)} |`);
  if (st !== 200 || !j.ok || !j.answer) bad.push(`${name}: پاسخ نیامد (${st} ${j.error || ''})`);
  else if (ms > lim) bad.push(`${name}: ${ms} میلی‌ثانیه (بیش از ${lim})`);
}
const table = ['| پرسش | HTTP | میلی‌ثانیه | جمنای | منبع | پاسخ |', '|---|---|---|---|---|---|', ...rows].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) { const { appendFileSync } = await import('node:fs'); appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## آزمون دود ورکر دستیار\n\n' + table + '\n'); }
for (const b of bad) console.log('::error::' + b);
process.exit(bad.length ? 1 : 0);
