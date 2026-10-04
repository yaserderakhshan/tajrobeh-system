// پوشاندن رمزها پیش از نوشتن در گیت، برگرداندن آن‌ها هنگام انتشار، و پیدا کردن رمز در خط‌های تازهٔ PR.
// قاعده‌ها (هر سه با تست در site/tools/test/secrets.test.mjs):
//  ۱) define('…SECRET|TOKEN|KEY|PASS…', 'مقدار')            ← مقدار خالی می‌شود: define('…', '')
//  ۲) کلید یا متغیری با نام secret/token/api_key/password/pass   ← مقدار ۸ نویسه به بالا: __MASKED_<هش ۸ رقمی>__
//     ('secret' => '…'، "api_key": "…"، $token = '…'، token: '…')
//  ۳) رشتهٔ تصادفی بلند (۳۲ نویسه به بالا، حرف بزرگ و کوچک و رقم، آنتروپی بالا) ← __MASKED_<هش>__
//     جز شناسه‌های عمومی شناخته‌شده (وب‌اپ Apps Script، شیت منتشرشده، GA و GTM، هش‌های hex).
// برگرداندن: مقدار خالی define از نسخهٔ زنده با همان نام، یا از متغیر محیطی SITE_SECRET_<نام> (برای رمز تازه)؛
// __MASKED_<هش>__ از رشته‌ای در نسخهٔ زنده که همان هش را دارد.
import { createHash } from 'node:crypto';

const DEF = /(define\(\s*'([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASS)[A-Z0-9_]*)'\s*,\s*')([^']*)('\s*\))/g;
const KV = /((?:\$|['"]|\b)(?:[A-Za-z0-9_]*(?:secret|token|api[_-]?key|password|passwd|app[_-]?pass)[A-Za-z0-9_]*)['"]?\s*(?:=>|=|:)\s*['"])([^'"\s]{8,})(['"])/gi;
const LONG = /(?<![\w./%-])[A-Za-z0-9_-]{32,}(?![\w./%-])/g; // فقط رشتهٔ تنها، نه بخشی از نشانی یا نام فایل
const PUBLIC_CTX = /google-site-verification|msvalidate|facebook-domain-verification/i;
const SAFE = /^(AKfycb|2PACX-|G-[A-Z0-9]|GTM-|UA-|AIza(?![0-9A-Za-z_-]{35}$))/;

const h8 = (v) => createHash('sha256').update(v).digest('hex').slice(0, 8);
const tag = (v) => `__MASKED_${h8(v)}__`;
function entropy(s) {
  const f = {};
  for (const c of s) f[c] = (f[c] || 0) + 1;
  return Object.values(f).reduce((e, n) => e - (n / s.length) * Math.log2(n / s.length), 0);
}
export function looksRandom(s) {
  if (s.length < 32 || SAFE.test(s) || /^[0-9a-f]+$/i.test(s) || /^__MASKED_/.test(s)) return false;
  if (!/[a-z]/.test(s) || !/[A-Z]/.test(s) || !/\d/.test(s)) return false;
  if (/^[A-Za-z]+(?:[-_][A-Za-z]+)+$/.test(s)) return false; // نام‌های کلاس و مسیرها
  return entropy(s) >= 4.2;
}

export function maskSecrets(code) {
  let s = String(code ?? '');
  s = s.replace(DEF, (m, a, name, v, b) => a + b);
  s = s.replace(KV, (m, a, v, b) => (/^__MASKED_|^\$|^\{\{/.test(v) ? m : a + tag(v) + b));
  s = s.split('\n').map((ln) => (PUBLIC_CTX.test(ln) ? ln : ln.replace(LONG, (v) => (looksRandom(v) ? tag(v) : v)))).join('\n');
  return s;
}

export function unmaskFrom(repoCode, liveCode, env = process.env) {
  const live = String(liveCode ?? '');
  const defs = {};
  for (const m of live.matchAll(DEF)) defs[m[2]] = m[3];
  const byHash = {};
  for (const m of live.matchAll(KV)) byHash[h8(m[2])] = m[2];
  for (const m of live.matchAll(LONG)) byHash[h8(m[0])] = m[0];
  let s = String(repoCode ?? '').replace(DEF, (m, a, name, v, b) => {
    if (v !== '') return m;
    const fromEnv = (env[`SITE_SECRET_${name}`] || '').trim(); // GitHub Secret ممکن است خط تازهٔ انتهایی داشته باشد
    return a + (fromEnv || defs[name] || '') + b;
  });
  s = s.replace(/__MASKED_([0-9a-f]{8})__/g, (m, k) => (byHash[k] !== undefined ? byHash[k] : m));
  return s;
}

// خط‌های تازهٔ یک diff: هر چیزی که maskSecrets عوضش کند، یا الگوهای کلیدهای شناخته‌شده
const KNOWN = [
  [/\b\d{8,10}:[A-Za-z0-9_-]{35}\b/, 'توکن بات تلگرام'],
  [/tjk_[A-Za-z0-9]{20,}/, 'کلید درگاه API بات'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'کلید خصوصی'],
  [/AKIA[0-9A-Z]{16}/, 'کلید AWS'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'کلید API گوگل'],
  [/\bghp_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{40,}/, 'توکن گیت‌هاب'],
  [/\bsk-[A-Za-z0-9_-]{20,}/, 'کلید API'],
];
export function scanLine(line, { generic = true } = {}) {
  const out = [];
  for (const [re, name] of KNOWN) if (re.test(line)) out.push(name);
  // Application Password وردپرس: شش گروه چهارتایی با فاصله و دست‌کم دو رقم (تا متن انگلیسی عادی گرفته نشود)
  for (const m of line.matchAll(/\b(?:[A-Za-z0-9]{4} ){5}[A-Za-z0-9]{4}\b/g)) if ((m[0].match(/\d/g) || []).length >= 2) out.push('شبیه Application Password');
  if (/^__MASKED_|__MASKED_[0-9a-f]{8}__/.test(line) && maskSecrets(line) === line) return out;
  if (generic && maskSecrets(line) !== line) out.push('رمز یا رشتهٔ تصادفی بلند');
  return [...new Set(out)];
}
