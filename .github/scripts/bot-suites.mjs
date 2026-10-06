// v170.16.2 (۱۴ مهر ۱۴۰۵، تصمیم یاسر): سهمیهٔ روزانهٔ اجرای Apps Script.
// آزمون کامل روی Apps Script فقط شب (اجرای زمان‌بندی‌شدهٔ bot-deploy.yml). در انتشارهای روز، آزمون کامل محلی
// (bot-precheck.mjs، همهٔ مجموعه‌ها با دادهٔ ساختگی) و روی Apps Script فقط مجموعه‌های مربوط به همین تغییر.
// پرداخت، تنخواه، نقش‌ها و دسترسی‌ها استثنا هستند و آزمون کامل می‌خواهند.
//
// «مربوط» یعنی: تابع‌ها و متغیرهای سطح بالایی که خط‌های تغییرکرده در آن‌هاست، به‌علاوهٔ تابع‌هایی که مستقیم آن‌ها را صدا
// می‌زنند (یک گام)؛ هر مجموعهٔ تستی که متنش یکی از این نام‌ها را دارد، یا خودش عوض شده، اجرا می‌شود. همگامی بات و مینی‌اپ
// و هستهٔ نسخهٔ ۲ همیشه هست.
//   node .github/scripts/bot-suites.mjs <base> [head]   ← فقط چاپ انتخاب
import { execFileSync } from 'node:child_process';

export const ALWAYS = ['tgParityTests', 'tgCoreTests'];
// تغییر این‌ها یعنی آزمون کامل
const FULL_FILES = /^bot\/(ci\.gs|\.clasp\.json|appsscript\.json|scopes\.approved\.json)$/;
const SENSITIVE_NAME = /(^|_)(tg)?(Pay|pay|Tnk|tnk|Tankhah|tankhah|Role|Perm|perm|Acl|acl|Fin[A-Z]|Petty|petty)|Is(Admin|Staff|Editor|Owner)|Access/;
const SENSITIVE_TEXT = /پرداخت|تنخواه|TG_ROLE|TG_PAY|TG_TNK/;   // «نقش» تنها نه: برچسب ستون هم هست؛ نقش‌ها از نام تابع

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 });

/* تابع‌ها و متغیرهای سطح بالا با بازهٔ خط (۱-پایه) */
export function topLevel(src) {
  const lines = src.split('\n'), out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(?:async\s+)?function\s+([\w$]+)\s*\(/.exec(lines[i]) || /^(?:var|let|const)\s+([\w$]+)\b/.exec(lines[i]);
    if (m) { if (out.length) out[out.length - 1].end = i; out.push({ name: m[1], start: i + 1, end: lines.length, fn: /function/.test(lines[i].slice(0, 20)) }); }
  }
  return out;
}
/* خط‌های تغییرکرده در نسخهٔ تازه از diff -U0 */
export function changedLines(diff) {
  const by = {};
  let file = null;
  for (const l of diff.split('\n')) {
    const f = /^\+\+\+ b\/(.+)$/.exec(l);
    if (f) { file = f[1]; by[file] = by[file] || []; continue; }
    if (/^\+\+\+ \/dev\/null/.test(l)) { file = null; continue; }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(l);
    if (h && file) { const s = +h[1], n = h[2] === undefined ? 1 : +h[2]; if (n === 0) by[file].push(s || 1); else for (let k = 0; k < n; k++) by[file].push(s + k); }
  }
  return by;
}
export function suiteNames(src) {
  const out = [], re = /\[\s*'[^'\n]*'\s*,\s*'([\w$]+)'\s*\]/g;
  let m; while ((m = re.exec(src))) out.push(m[1]);
  return out;
}
const mentions = (text, names) => names.some((n) => new RegExp(`(^|[^\\w$])${n.replace(/\$/g, '\\$')}([^\\w$]|$)`).test(text));

/* files: {path: text} نسخهٔ تازه؛ changed: خروجی changedLines؛ diffText: متن diff برای حساسیت */
export function pick(files, changed, diffText) {
  const paths = Object.keys(changed);
  if (paths.some((p) => FULL_FILES.test(p))) return { full: true, why: 'تغییر در ' + paths.filter((p) => FULL_FILES.test(p)).join('، ') };
  const gs = paths.filter((p) => /^bot\/.*\.gs$/.test(p));
  const all = {}, units = [];
  for (const [p, t] of Object.entries(files)) { if (!/\.gs$/.test(p)) continue; const tl = topLevel(t), ls = t.split('\n'); tl.forEach((u) => { u.file = p; u.text = ls.slice(u.start - 1, u.end).join('\n'); units.push(u); all[u.name] = u; }); }
  const touched = new Set();
  for (const p of gs) {
    const tl = units.filter((u) => u.file === p);
    for (const n of changed[p]) { const u = tl.find((x) => n >= x.start && n <= x.end); if (u) touched.add(u.name); }
  }
  const tn = [...touched];
  if (tn.some((n) => SENSITIVE_NAME.test(n))) return { full: true, why: 'پرداخت، تنخواه، نقش یا دسترسی: ' + tn.filter((n) => SENSITIVE_NAME.test(n)).slice(0, 6).join('، ') };
  const added = (diffText || '').split('\n').filter((l) => /^[+-][^+-]/.test(l)).join('\n');
  if (SENSITIVE_TEXT.test(added)) return { full: true, why: 'خط‌های تغییرکرده پرداخت، تنخواه، نقش یا دسترسی دارند' };
  /* یک گام صداکننده */
  const names = new Set(tn);
  if (tn.length) for (const u of units) if (u.fn && !names.has(u.name) && mentions(u.text, tn)) names.add(u.name);
  const suites = [...new Set(Object.entries(files).flatMap(([p, t]) => /\.gs$/.test(p) ? suiteNames(t) : []))].filter((s) => all[s]);
  const nl = [...names];
  const only = suites.filter((s) => ALWAYS.includes(s) || names.has(s) || (nl.length && mentions(all[s].text, nl)));
  return { full: false, only, total: suites.length, touched: tn };
}

export function scope(base, head = 'HEAD') {
  const diff = git(['diff', '-U0', '--no-color', base, head, '--', 'bot/']);
  const changed = changedLines(diff);
  for (const p of git(['diff', '--name-only', base, head, '--', 'bot/']).split('\n').filter(Boolean)) changed[p] = changed[p] || [];
  const files = {};
  for (const f of git(['ls-tree', '--name-only', head, 'bot/']).split('\n')) if (/\.gs$/.test(f)) files[f] = git(['show', `${head}:${f}`]);
  return pick(files, changed, diff);
}

export function suitesSelfTest() {
  const bad = [], t = (n, c) => { if (!c) bad.push(n); };
  const files = {
    'bot/a.gs': "var TG_SUITES = [\n  ['الف', 'aTests'],\n  ['ب', 'bTests'],\n  ['همگامی', 'tgParityTests']\n];\nfunction aCore_(x) {\n  return x + 1;\n}\nfunction aUse_() {\n  return aCore_(2);\n}\nfunction aTests() {\n  return aUse_();\n}\nfunction tgParityTests() { return 1; }\n",
    'bot/b.gs': "function bThing_() {\n  return 3;\n}\nfunction bTests() {\n  return bThing_();\n}\nfunction tgPayFix_() {\n  return 0;\n}\n",
  };
  const r1 = pick(files, { 'bot/a.gs': [7] }, '+  return x + 2;');
  t('تغییر یک تابع: تست صداکنندهٔ یک گام انتخاب می‌شود، تست بی‌ربط نه', !r1.full && r1.only.includes('aTests') && !r1.only.includes('bTests') && r1.only.includes('tgParityTests'));
  const r2 = pick(files, { 'bot/b.gs': [2] }, '+  return 4;');
  t('تغییر در فایل دیگر فقط تست همان', !r2.full && r2.only.includes('bTests') && !r2.only.includes('aTests'));
  t('تابع پرداخت ← آزمون کامل', pick(files, { 'bot/b.gs': [8] }, '+  return 1;').full === true);
  t('متن تنخواه در خط تغییرکرده ← آزمون کامل', pick(files, { 'bot/b.gs': [2] }, "+  return 'تنخواه';").full === true);
  t('ci.gs یا مانیفست ← آزمون کامل', pick(files, { 'bot/ci.gs': [1] }, '').full === true && pick(files, { 'bot/appsscript.json': [1] }, '').full === true);
  const ch = changedLines('+++ b/bot/a.gs\n@@ -3,0 +4,2 @@\n+x\n+y\n@@ -9 +11 @@\n-z\n+w\n@@ -20,2 +21,0 @@\n-q\n-r\n');
  t('خط‌های تغییرکرده از diff', JSON.stringify(ch['bot/a.gs']) === '[4,5,11,21]');
  return bad;
}

if (process.argv[1] && process.argv[1].endsWith('bot-suites.mjs')) {
  if (process.argv[2] === 'selftest') { const b = suitesSelfTest(); console.log(b.length ? '❌ ' + b.join('، ') : '✅ انتخاب مجموعه‌ها درست است'); process.exit(b.length ? 1 : 0); }
  const r = scope(process.argv[2] || 'origin/main', process.argv[3] || 'HEAD');
  console.log(r.full ? `آزمون کامل: ${r.why}` : `مجموعه‌های مربوط: ${r.only.length} از ${r.total}\n${r.only.join(' ')}\nتابع‌های تغییرکرده: ${r.touched.join(' ')}`);
}
