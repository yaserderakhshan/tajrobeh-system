// چک اطلاعات شخصی و شناسه‌های داخلی روی هر PR (گردش کار secret-scan.yml، کنار چک رمز).
// فقط خط‌های تازه: شمارهٔ تلفن، chat_id، ایمیل واقعی، شمارهٔ کارت و شبا، شناسهٔ شیت و درایو و تقویم، نشانی داخلی Apps Script.
// این‌ها جایشان Script Properties، GitHub Secrets یا تب تنظیمات هاب است، نه کد. مقدار پیداشده چاپ نمی‌شود؛ فقط فایل، خط و نوع.
// نمونهٔ ساختگی در تست: همان خط «pii:ok» داشته باشد (مثلاً در یادداشت)، یا عدد و دامنهٔ ساختگی بیاید (example.com، ۰۹۰۰…).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FA = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
const latin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA[d]);
export const RULES = [
  ['شمارهٔ تلفن', /(?<![\d])(?:\+98|0098|0)9(?!00)\d{9}(?![\d])/],
  ['chat_id', /(?:chat|owner|chat_id|CHAT)[^\n]{0,40}?(?<![\d.])-?(?:100)?\d{9,13}(?![\d.])/i],
  ['chat_id', /['"]-100\d{8,11}['"]/],
  ['ایمیل', /\b[A-Za-z0-9._%+-]+@(?!(?:example\.(?:com|org|net)|[a-z]\.(?:com|co)|example\.invalid|users\.noreply\.github\.com|anthropic\.com|tajrobeh\.life)\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['شمارهٔ کارت', /(?<![\d])(?:5022|6037|6219|6104|6274|6362|6280|6221|5041|6273|6063|6392|6396|5892|6276|6278|6273|6369|5859|6393|6395|9919|6037)[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}(?![\d])/],
  ['شبا', /\bIR\d{24}\b/],
  ['شناسهٔ شیت یا درایو', /(?<![A-Za-z0-9_-])1[A-Za-z0-9_-]{32,43}(?![A-Za-z0-9_-])/],
  ['شناسهٔ تقویم', /[0-9a-f]{20,}@group\.calendar\.google\.com/],
  ['نشانی Apps Script', /AKfycb[A-Za-z0-9_-]{30,}|script\.google\.com\/macros\/s\/(?!\$\{)[A-Za-z0-9_-]{20,}/],
];
// v170.23: فقط در کد (نه محتوای منتشرشدهٔ سایت): نشانی workers.dev که نام حساب شخص را دارد (<کار>.<حساب>.workers.dev)
export const CODE_RULES = [
  ['نشانی workers.dev با نام حساب', /\b[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\b/i],
];
const CODE_FILE = /^(bot|miniapp|\.github|data-scripts)\//;
// v170.23: نام همکاران. فهرست در مخزن نیست (مخزن عمومی است)؛ از GitHub Secret «PII_NAMES» (با ویرگول جدا). نام پیداشده چاپ نمی‌شود.
const NAMES = (process.env.PII_NAMES || '').split(/[,،\n]+/).map((x) => x.trim()).filter((x) => x.length >= 2);
const nameRx = (n) => new RegExp(`(?<![\\u0620-\\u064A\\u066E-\\u06D3\\u06FA-\\u06FF\\u200c\\w])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\u0620-\\u064A\\u066E-\\u06D3\\u06FA-\\u06FF\\u200c\\w])`);
const FAKE_LINE = /pii:ok/;
export function piiLine(line, file = '', names = NAMES) {
  if (FAKE_LINE.test(line)) return [];
  const l = latin(line), out = [];
  for (const [name, rx] of RULES) if (rx.test(l) && !out.includes(name)) out.push(name);
  if (!file || CODE_FILE.test(file)) {
    for (const [name, rx] of CODE_RULES) if (rx.test(l) && !out.includes(name)) out.push(name);
    if (names.some((n) => nameRx(n).test(line))) out.push('نام همکار (فهرست PII_NAMES)');
  }
  return out;
}
export function piiSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  t('شمارهٔ موبایل', piiLine("var p = '09121234567';").includes('شمارهٔ تلفن'));
  t('شمارهٔ فارسی', piiLine('تماس: ۰۹۱۲۱۲۳۴۵۶۷').includes('شمارهٔ تلفن'));
  t('شمارهٔ ساختگی ۰۹۰۰', piiLine("var p = '09001234567';").length === 0);
  t('chat_id', piiLine('var TG_OWNER_CHAT = 123456789;').includes('chat_id'));
  t('کانال', piiLine("var CH = '-1001234567890';").includes('chat_id'));
  t('ایمیل واقعی', piiLine("x = 'ali.r@gmail.com'").includes('ایمیل'));
  t('ایمیل ساختگی', piiLine("x = 'a@example.com'").length === 0);
  t('شیت', piiLine("var S = '1AbCdEfGhIjKlMnOpQrStUv" + "WxYz0123456789_-abcd';").includes('شناسهٔ شیت یا درایو'));
  t('کارت', piiLine('کارت: 6037-9911-2233-4455').includes('شمارهٔ کارت'));
  t('شبا', piiLine('IR120570000000000000000001').includes('شبا'));
  t('تقویم', piiLine("'0f61aa0f61aa0f61aa0f61aa@group.calendar.google.com'").includes('شناسهٔ تقویم'));
  t('اسکریپت', piiLine("u = 'https://script.google.com/macros/s/AKfycbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/exec'").includes('نشانی Apps Script'));
  t('pii:ok', piiLine("var p = '09121234567'; // pii:ok ساختگی").length === 0);
  t('متن عادی', piiLine('const TG_CODE_VERSION = "v170.5"; ok(\'۱۲ مهر ۱۴۰۵\')').length === 0);
  t('workers.dev با نام حساب در کد', piiLine("const base = 'https://relay.someone.workers.dev';", 'bot/x.gs').includes('نشانی workers.dev با نام حساب'));
  t('workers.dev در محتوای سایت مجاز', piiLine("var EDGE = 'https://edge.someone.workers.dev/x';", 'site/pages/1-x.html').length === 0);
  t('نام همکار از فهرست', piiLine("// به نمونه‌الف بگو", 'bot/x.gs', ['نمونه‌الف']).includes('نام همکار (فهرست PII_NAMES)'));
  t('نام فقط کلمهٔ کامل', piiLine("// نمونه‌الفبا", 'bot/x.gs', ['نمونه‌الف']).length === 0);
  t('نام پیش از ویرگول فارسی', piiLine("// نمونه‌الف، و", 'bot/x.gs', ['نمونه‌الف']).length === 1);
  return bad;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const BASE = process.env.BASE, HEAD = process.env.HEAD || 'HEAD';
  const diff = execFileSync('git', ['diff', '-U0', '--no-color', BASE, HEAD], { encoding: 'utf8', maxBuffer: 256 << 20 });
  const hits = [];
  let file = '', line = 0;
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (h) { line = Number(h[1]); continue; }
    if (!l.startsWith('+') || l.startsWith('+++')) continue;
    if (/\.(png|jpe?g|webp|gif|woff2?|ttf|otf|pdf|ico)$|\.lock$|package-lock\.json$|^\.github\/scripts\/pii-scan\.mjs$/.test(file)) { line++; continue; }
    const f = piiLine(l.slice(1), file);
    if (f.length) hits.push(`${file}:${line} ${f.join('، ')}`);
    line++;
  }
  if (hits.length) {
    for (const x of hits) console.log(`::error::اطلاعات شخصی یا شناسهٔ داخلی در کامیت: ${x}`);
    console.log(`\n${hits.length} مورد. این مقدار را به Script Properties، GitHub Secrets یا تب تنظیمات هاب ببر. اگر نمونهٔ ساختگی است، همان خط «pii:ok» داشته باشد.`);
    process.exit(1);
  }
  console.log('شماره، chat_id، ایمیل یا شناسهٔ داخلی تازه‌ای پیدا نشد.');
}
