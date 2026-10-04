// اجرای تست‌های بات روی دیپلوی آزمایشی (CI staging)، پیش از آنکه نشانی اصلی نسخهٔ تازه را بگیرد
// (از .github/workflows/bot-deploy.yml صدا زده می‌شود).
// ۱) صبر تا /exec نسخهٔ تازه (CI_BUILD) را سرو کند ۲) شروع tgRun ۳) پیگیری تا پایان
// ۴) نوشتن نتیجه در لاگ و GITHUB_STEP_SUMMARY ۵) کد خروج ۱ اگر حتی یک مردود باشد،
//    یا مجموعه‌ای جا مانده باشد، یا مجموعه‌ای هیچ چیزی نسنجیده باشد (۰ قبول و ۰ مردود).
import { appendFileSync, readFileSync } from 'node:fs';

const EXEC = process.env.BOT_EXEC_URL;
const KEY = readFileSync(`${process.env.RUNNER_TEMP}/ci_key`, 'utf8').trim();   // کلید یک‌بارمصرف گام قبل
const BUILD = process.env.CI_BUILD;
const VERSION = process.env.BOT_VERSION || '?';
const LABEL = process.env.BOT_LABEL || '';
const TOTAL_MIN = Number(process.env.TEST_TIMEOUT_MIN || 55);
const STALL_MIN = 8;
const MAX_KICKS = 8;   // هر مجموعهٔ قطع‌شده یک بار دوباره و بار دوم مردود؛ هر کدام یک ادامه می‌خواهد

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now();

async function callOnce(op) {
  // POST به /exec با ۳۰۲ جواب می‌دهد و fetch آن را مثل GET دنبال می‌کند؛ همان رفتار مورد انتظار گوگل
  const res = await fetch(EXEC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ci: op, k: KEY }),
    redirect: 'follow',
  });
  const text = await res.text();
  let j;
  try { j = JSON.parse(text); } catch { return { ok: false, transient: true, error: `پاسخ JSON نبود (HTTP ${res.status}): ${text.slice(0, 120)}` }; }
  // v167: تا مدتی بعد از به‌روز شدن دیپلوی، گوگل بعضی درخواست‌ها را با نسخهٔ قبل (و ci_key.gs قبلی) جواب می‌دهد و آن نسخه کلید تازه را «key» رد می‌کند
  if (j && j.error === 'key') return { ...j, transient: true, error: 'key (پاسخ از نسخهٔ قبل)' };
  return j;
}

// گوگل گاهی به‌جای پاسخ اسکریپت 404 یا «ok» خالی برمی‌گرداند (در اجرای Version 168 و 169 دیده شد).
// این پاسخ‌ها گذرا هستند؛ تا ۵ بار با فاصلهٔ فزاینده دوباره می‌فرستیم. start و kick تکرارشان بی‌خطر است.
async function call(op) {
  let r;
  for (let i = 0; i < 5; i++) {
    r = await callOnce(op).catch((e) => ({ ok: false, transient: true, error: String(e) }));
    if (!r.transient) return r;
    console.log(`پاسخ گذرا برای ${op} (${i + 1}/5): ${r.error}`);
    await sleep(5000 * (i + 1));
  }
  return r;
}

function summary(md) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}
function output(k, v) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
}
function fail(msg) {
  console.log(`::error::${msg}`);
  summary(`\n**❌ ${msg}**`);
  output('tests', 'error');
  process.exit(1);
}

// ۱) صبر برای نسخهٔ تازه
{
  const t0 = now();
  let last = null, streak = 0;
  for (;;) {
    last = await call('ping').catch((e) => ({ ok: false, error: String(e) }));
    streak = (last.ok && last.build === BUILD) ? streak + 1 : 0;
    if (streak >= 3) break;   /* v167: سه پاسخ پشت هم از نسخهٔ تازه */
    if (streak) { await sleep(5000); continue; }
    if (now() - t0 > 5 * 60 * 1000) fail(`/exec بعد از ۵ دقیقه هنوز نسخهٔ تازه را سرو نمی‌کند: ${JSON.stringify(last).slice(0, 300)}`);
    await sleep(15000);
  }
  console.log(`/exec نسخهٔ تازه را سرو می‌کند (build ${BUILD}).`);
}

// ۲) شروع
// v169.2.2: مجوزهای گوگل روی همین نسخهٔ آزمایشی. اگر کد مجوزی بخواهد که مالک تأیید نکرده، انتشار همین‌جا متوقف می‌شود
// (تست‌های خشک این را نمی‌بینند؛ v169.2 همین‌طور روی بات زنده شکست خورد).
{
  // v170.5: متن صفحهٔ مینی‌اپ داخل پروژه باید با فایل گیت یکی باشد (پیش از انتشار اصلی)
  if (process.env.PAGE_SHA) {
    const pg = await call('pagesha');
    if (pg.error === 'op') console.log('::warning::این نسخه سنجش صفحه را ندارد');
    else if (!pg.ok || pg.sha !== process.env.PAGE_SHA) fail(`متن صفحهٔ مینی‌اپ در پروژه با گیت یکی نیست (${pg.sha ? pg.sha.slice(0, 12) : 'خالی'} در برابر ${process.env.PAGE_SHA.slice(0, 12)})`);
    else { console.log(`صفحهٔ مینی‌اپ در پروژه همان گیت است (${pg.len} نویسه).`); summary(`- صفحهٔ مینی‌اپ در پروژه = گیت ✅`); }
  }
  // v170.9: تنظیمات خصوصی (Script Property TG_CFG) باید کامل باشد؛ مقدارها در کد نیستند
  {
    const cf = await call('cfgcheck');
    if (cf.error === 'op') console.log('::warning::این نسخه سنجش تنظیمات را ندارد');
    else if (!cf.ok || (cf.missing || []).length) fail(`تنظیمات خصوصی کامل نیست؛ این کلیدها در Script Property «TG_CFG» خالی‌اند: ${(cf.missing || ['?']).join('، ')}`);
    else if (cf.hook === false) fail('رمز وبهوک (TG_HOOK_SECRET) در Script Properties نیست؛ از v170.9 بی آن هیچ پیام تلگرامی پذیرفته نمی‌شود. انتشار متوقف شد.');
    else if (cf.token === false) fail('TELEGRAM_TOKEN در Script Properties نیست. انتشار متوقف شد.');
    else console.log('تنظیمات خصوصی کامل است؛ رمز وبهوک و توکن هست.');
  }
  const au = await call('auth');
  if (au && au.status === 'REQUIRED') fail('کد این نسخه مجوز تازهٔ گوگل می‌خواهد که تأیید نشده است. انتشار متوقف شد؛ به یاسر خبر بده.');
  console.log(`مجوزهای گوگل: ${au && au.status ? au.status : 'نامعلوم'}`);
}
const st = await call('start');
if (!st.ok) fail(`شروع تست‌ها نشد: ${st.error}`);
console.log(`تست‌ها شروع شد: ${st.suites} مجموعه.`);

// ۳) پیگیری
const t0 = now();
let s = null, lastCount = -1, lastMove = now(), kicks = 0;
for (;;) {
  await sleep(30000);
  s = await call('status').catch((e) => ({ ok: false, error: String(e) }));
  if (!s.ok) { console.log(`وضعیت خوانده نشد: ${s.error}`); continue; }
  if (s.done) break;
  const count = s.count || 0;
  const cur = s.current ? ` · در حال اجرا: ${s.current.name} (${s.current.secs}ث)${s.current.sub ? ' › ' + s.current.sub : ''}` : '';
  console.log(`دور ${s.run || '(هنوز شروع نشده)'}: ${count} از ${s.total} مجموعه · ${s.pass || 0} قبول · ${s.fail || 0} مردود${cur}`);
  if (count !== lastCount) { lastCount = count; lastMove = now(); }
  if (now() - lastMove > STALL_MIN * 60 * 1000) {
    if (kicks >= MAX_KICKS) fail(`زنجیرهٔ تست ${STALL_MIN} دقیقه پیش نرفت و ${MAX_KICKS} بار ادامه دادن هم فایده نداشت`);
    kicks++;
    const k = await call(s.run ? 'kick' : 'start');
    if (!k.ok) kicks--;   // خطای گذرای شبکه ادامه حساب نمی‌شود
    console.log(`زنجیره پیش نمی‌رفت؛ ادامهٔ دوباره (${kicks}): ${JSON.stringify(k)}`);
    lastMove = now();
  }
  if (now() - t0 > TOTAL_MIN * 60 * 1000) fail(`تست‌ها بعد از ${TOTAL_MIN} دقیقه تمام نشد (${count} از ${s.total})`);
}

// ۴) نتیجه
// v166.8: مجموعهٔ بی‌نتیجه (۰ و ۰) و مجموعهٔ جامانده هم مردودند
for (const x of s.suites) if (!x.pass && !x.fail) { x.fail = 1; x.text = x.text || 'این مجموعه هیچ چیزی نسنجید (۰ قبول و ۰ مردود)'; s.fail++; }
if (s.count < s.total) { s.suites.push({ name: `${s.total - s.count} مجموعهٔ جامانده`, pass: 0, fail: s.total - s.count, secs: 0, text: 'نتیجهٔ این مجموعه‌ها در تب «تست‌ها» نیامد' }); s.fail += s.total - s.count; }
const bad = s.suites.filter((x) => x.fail > 0);
const head = `بات ${LABEL} · Version ${VERSION} · دور ${s.run}: ${s.count} مجموعه · ${s.pass} قبول · ${s.fail} مردود`;
console.log(head);
for (const x of s.suites) console.log(`${x.fail ? '❌' : '✅'} ${x.name}: ${x.pass} قبول · ${x.fail} مردود · ${x.secs}ث`);
for (const x of bad) console.log(`\n--- ${x.name} ---\n${x.text}`);

summary(`## نتیجهٔ تست‌ها\n\n${head}\n`);
summary('| مجموعه | قبول | مردود | ثانیه |\n|---|---|---|---|');
for (const x of s.suites) summary(`| ${x.fail ? '❌' : '✅'} ${x.name} | ${x.pass} | ${x.fail} | ${x.secs} |`);
for (const x of bad) summary(`\n<details><summary>${x.name}</summary>\n\n\`\`\`\n${x.text}\n\`\`\`\n</details>`);

output('pass', s.pass);
output('fail', s.fail);
if (s.fail > 0) {
  output('tests', 'fail');
  console.log(`::error::${s.fail} تست مردود: ${bad.map((x) => `${x.name} (${x.fail})`).join('، ')}`);
  process.exit(1);
}
output('tests', 'pass');
console.log(`::notice::همهٔ ${s.pass} تست قبول شد.`);
