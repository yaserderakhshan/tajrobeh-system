// بات v170.16.3: setcfg اسنیپت عملیات کمپین ابی (site/snippets/ebi-ops.php) از گردش کار site-ebi-setcfg.
// ۱) فهرست راهبران از بات (اکشن ebi_mods درگاه، فقط با کلید دوم BOT_API_KEY). مقدارها پوشانده می‌شوند و هیچ‌جا نوشته نمی‌شوند.
// ۲) POST /wp-json/tj/v1/ebi-ops با do=setcfg: کلید دوم، نشانی وب‌اپ (BOT_API_URL) و راهبران.
// ۳) do=status و do=test (فرستادن آزمایشی، بی پیام واقعی). فقط ok، شمار و خطا چاپ می‌شود، نه پاسخ کامل.
import { loadEnv, wpClient, log, fail, summary, sleep } from './site-lib.mjs';

loadEnv();
const url = process.env.BOT_API_URL, key = process.env.BOT_API_KEY;
const bad = (m) => { fail(m); summary(`\n**❌ ${m}**`); process.exit(1); };
if (!url || !key) bad('BOT_API_URL یا BOT_API_KEY در Environment «production» نیست');

/* Apps Script گاهی 404 یا «ok» خالی برمی‌گرداند (گذرا)؛ تا ۵ بار با فاصلهٔ فزاینده */
let j;
for (let i = 0; i < 5; i++) {
  let st = 0;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', body: JSON.stringify({ api: 1, key, action: 'ebi_mods' }) });
    st = res.status;
    j = JSON.parse(await res.text());
    break;
  } catch (e) { j = { ok: false, error: `پاسخ بات خوانده نشد (HTTP ${st || 'شبکه'})` }; log(`پاسخ گذرا از بات (${i + 1}/5): HTTP ${st || 'شبکه'}`); }
  await sleep(5000 * (i + 1));
}
if (!j.ok) bad(`فهرست راهبران از بات نیامد: ${j.error || '?'} (key2_only یعنی کلید دوم هنوز در بات ننشسته؛ unknown_action یعنی نسخهٔ v170.16.3 منتشر نشده)`);
const mods = (j.data && j.data.mods || []).map(String);
for (const m of mods) console.log(`::add-mask::${m}`);
log(`راهبران از بات: ${mods.length}`);

const wp = wpClient();
if (!wp.hasAuth) bad('WP_USER یا WP_APP_PASSWORD نیست');
const s1 = await wp.post('/wp-json/tj/v1/ebi-ops', { do: 'setcfg', key, webapp: url, mods });
if (s1.status === 404) bad('مسیر /tj/v1/ebi-ops روی سایت نیست؛ اول اسنیپت ebi-ops با site-deploy نصب شود');
if (!s1.ok || !s1.json || !s1.json.ok) bad(`setcfg نشد: HTTP ${s1.status}`);
log(`setcfg: ${s1.json.mods} راهبر ثبت شد`);

/* از ۱۴ مهر: سرور سایت جواب Apps Script را نمی‌خواند؛ «رسید» (۳۰۲ به echo) یعنی درخواست به بات رسید و اجرا شد */
const how = (j) => (j && j.ok ? (j.received ? 'رسید' : 'ok') : 'خطا: ' + ((j && j.error) || '?'));
const s2 = await wp.post('/wp-json/tj/v1/ebi-ops', { do: 'status' });
const okStatus = !!(s2.json && s2.json.ok);
log(`status: ${how(s2.json)}`);
const s3 = await wp.post('/wp-json/tj/v1/ebi-ops', { do: 'test' });
const okTest = !!(s3.json && s3.json.ok);
log(`test (فرستادن آزمایشی به راهبر اول، بی پیام واقعی): ${how(s3.json)}`);
let rc = '';
if (process.env.RECHECK === 'true') {
  const s4 = await wp.post('/wp-json/tj/v1/ebi-ops', { do: 'recheck' });
  rc = s4.json && s4.json.ok ? `${s4.json.n} مورد دوباره به بات رفت` : `نشد (HTTP ${s4.status})`;
  log(`سنجش دوبارهٔ موردهای دستی‌مانده: ${rc}`);
}

summary(`## setcfg اسنیپت ابی\n\n- راهبران: ${mods.length}\n- setcfg: ✅\n- status: ${okStatus ? '✅' : '❌'}\n- test: ${okTest ? '✅' : '❌'}${rc ? `\n- سنجش دوباره: ${rc}` : ''}`);
if (!okStatus || !okTest) process.exit(1);
