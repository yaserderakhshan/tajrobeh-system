// E62.۴: سنجش خوراک زندهٔ مچ (br_ther) از بیرون، با همان امضای پل. فقط شمارها چاپ می‌شود، نه نام یا شناسه.
import { createHmac } from 'node:crypto';
const tok = process.env.TELEGRAM_TOKEN, dep = process.env.DEPLOYMENT_ID;
if (!tok || !dep) { console.log('::error::TELEGRAM_TOKEN یا DEPLOYMENT_ID نیست'); process.exit(1); }
const b64u = (b) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sec = b64u(createHmac('sha256', Buffer.from(tok, 'utf8')).update('tajrobeh-handoff-v1').digest());
console.log(`::add-mask::${sec}`);
const ts = Math.floor(Date.now() / 1000);
const sig = 'v1=' + createHmac('sha256', Buffer.from(sec, 'utf8')).update(`bot-match-feed.v1:${ts}:api=br_ther`).digest('hex');
const url = `https://script.google.com/macros/s/${dep}/exec?api=br_ther&ts=${ts}&sig=${encodeURIComponent(sig)}`;
let j = null, st = 0;
for (let i = 0; i < 3 && !j; i++) {
  try { const r = await fetch(url, { redirect: 'follow' }); st = r.status; j = JSON.parse(await r.text()); } catch (e) { await new Promise((s) => setTimeout(s, 4000)); }
}
if (!j) { console.log(`::error::پاسخ خوانده نشد (HTTP ${st})`); process.exit(1); }
const T = j.therapists || [];
const line = `ok=${j.ok} version=${j.version} at=${j.at} tz=${j.timezone} درمانگر=${T.length} با_هفتگی=${T.filter((t) => (t.weekly || []).length).length} قاعدهٔ_هفتگی=${T.reduce((a, t) => a + (t.weekly || []).length, 0)} با_معارفهٔ_آزاد=${T.filter((t) => (t.introSlots || []).length).length} معارفهٔ_آزاد=${T.reduce((a, t) => a + (t.introSlots || []).length, 0)} با_telegramId=${T.filter((t) => t.telegramId).length}${j.error ? ' خطا=' + j.error : ''}`;
console.log(line);
if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## خوراک مچ br_ther\n${line}\n`);
if (!j.ok) process.exit(1);
