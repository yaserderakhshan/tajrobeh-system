// آزمون پل tj-ops از گیت‌هاب (site-bridge-test.yml). فقط خواندن: GET /tj-ops/v1/state، بی هیچ نوشتنی.
//   EXPECT=on  ← کلید روشن است: با claude-ops پاسخ ۲۰۰ و داده؛ بی رمز ۴۰۱؛ فراخوانی همین آزمون در لاگ پل ثبت شده باشد.
//   EXPECT=off ← کلید خاموش است: حتی با claude-ops پاسخ ۴۰۱ یا ۴۰۳ و هیچ داده‌ای.
// چیزی از متن کد، رمز یا IP دیگران چاپ نمی‌شود؛ فقط شمارش‌ها و اینکه IP رانر در لاگ همان است یا نه.
import { fail, loadEnv, log, summary, wpClient } from './site-lib.mjs';

loadEnv();
const EXPECT = process.env.EXPECT || 'on';
const wp = wpClient();
const errs = [], lines = [];
const say = (m) => { lines.push(m); log(m); };
let runnerIp = '';
try { runnerIp = (await (await fetch('https://api.ipify.org')).text()).trim(); } catch {}

const anon = await wp.get('/wp-json/tj-ops/v1/state', { authed: false, retries: 1 });
say(`- بی رمز: HTTP ${anon.status}`);
if (anon.status === 404) errs.push('مسیر tj-ops/v1/state نیست: پل نصب یا فعال نشده');
else if (anon.ok) errs.push('بی رمز پاسخ ۲۰۰ داد؛ باید رد شود');

const r = await wp.get('/wp-json/tj-ops/v1/state', { timeout: 90000, retries: 1 });
say(`- با claude-ops: HTTP ${r.status}`);
if (EXPECT === 'off') {
  if (r.ok) errs.push('کلید خاموش است ولی پل داده داد');
  else if (![401, 403].includes(r.status)) errs.push(`انتظار ۴۰۱ یا ۴۰۳، آمد ${r.status}`);
  else say('- کلید خاموش درست کار می‌کند: پل بسته است');
} else if (!r.ok) errs.push(`با claude-ops رد شد (${r.status} ${r.json?.code || ''}). کلید روشن است؟ کاربر manage_options دارد؟`);
else {
  const j = r.json;
  const act = j.snippets.filter((s) => s.active).length;
  const self = j.snippets.filter((s) => s.code.includes("register_rest_route('tj-ops/v1'"));
  say(`- وردپرس ${j.wp} · PHP ${j.php} · ${j.plugins.length} افزونه · ${j.snippets.length} اسنیپت (${act} فعال) · متای Yoast ${Object.keys(j.yoast).length} برگه`);
  say(`- اسنیپت خود پل: ${self.length === 1 ? `شناسهٔ ${self[0].id}، ${self[0].active ? 'فعال' : 'غیرفعال'}، نوع ${self[0].type}، محل ${self[0].location}` : `⚠️ ${self.length} مورد`}`);
  if (self.length !== 1) errs.push('اسنیپت پل باید دقیقاً یکی باشد');
  else {
    const want = process.env.BRIDGE_HASH || '90ae09073ca692a3';
    say(`- hash کد پل زنده: ${self[0].hash} ${self[0].hash === want ? '(= نسخهٔ c090fff روی main)' : `(⚠️ با ${want} یکی نیست)`}`);
    if (self[0].hash !== want) errs.push('کد پل زنده با نسخهٔ main یکی نیست');
  }
  say(`- صف لید: ${j.lead_queue?.n ?? '?'} ردیف`);
  const mine = (j.log || []).filter((l) => /GET \/tj-ops\/v1\/state/.test(l));
  say(`- لاگ پل: ${j.log.length} خط آخر؛ فراخوانی‌های state: ${mine.length}`);
  if (!mine.length) errs.push('فراخوانی این آزمون در لاگ پل ثبت نشده');
  // IP واقعی رانر در لاگ؟ (برای سقف تلاش ورود لازم است: اگر نه، همه پشت یک IP دیده می‌شوند)
  if (runnerIp) {
    const seen = mine.some((l) => l.includes(`ip=${runnerIp}`));
    const ip = (mine[mine.length - 1] || '').match(/ip=([0-9a-f.:]+)/i)?.[1] || '?';
    const kind = /^(10\.|127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|fc|fd)/i.test(ip) ? 'خصوصی یا لوکال' : 'عمومی';
    // IP زیرساخت (پراکسی یا CDN) است، نه کاربر؛ چاپش بی‌خطر است
    say(`- IP دیده‌شده در لاگ = IP عمومی رانر: ${seen ? 'بله (REMOTE_ADDR واقعی است)' : `نه؛ وردپرس ${ip} (${kind}) را می‌بیند، پس پراکسی جلوی PHP است`}`);
  }
}
const md = `## آزمون پل tj-ops (انتظار: کلید ${EXPECT === 'off' ? 'خاموش' : 'روشن'})\n\n${lines.join('\n')}\n\n${errs.length ? errs.map((e) => `- ⛔ ${e}`).join('\n') : '✅ قبول'}`;
summary(md);
errs.forEach((e) => fail(e));
process.exit(errs.length ? 1 : 0);
