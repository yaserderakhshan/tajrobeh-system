// بخش خودکار نقشهٔ بات (docs/bot/MAP.md) را از خود کد می‌سازد: فایل‌ها، کارهای زمان‌دار، تب‌ها، نقش‌ها،
// مجموعه‌های تست و درخواست‌های ci. بخش دستی فایل (شرح ماژول‌ها و مسیرها) دست نمی‌خورد.
//   node .github/scripts/bot-map.mjs          ← بخش خودکار را بازنویسی می‌کند
//   node .github/scripts/bot-map.mjs --check  ← فقط می‌سنجد (bot-precheck.mjs صدا می‌زند)؛ کهنه بود = کد خروج ۱
// هیچ شناسهٔ شیت، کانال، توکن یا اسمی اینجا نمی‌آید؛ فقط نام ثابت‌ها و نام تب‌ها.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBot, pushOrder } from './gas-local.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BOT = join(ROOT, 'bot');
const MAP = join(ROOT, 'docs', 'bot', 'MAP.md');
const START = '<!-- AUTO:START (node .github/scripts/bot-map.mjs) -->';
const END = '<!-- AUTO:END -->';

export function buildAuto() {
  const order = pushOrder(BOT);
  const src = Object.fromEntries(order.map((f) => [f, readFileSync(join(BOT, f), 'utf8')]));
  const bot = loadBot(BOT);
  const val = (name) => { try { return bot.run(`typeof ${name} === 'undefined' ? null : ${name}`); } catch { return null; } };
  const L = [];
  const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

  L.push(`نسخهٔ کد: \`${val('TG_CODE_VERSION') || '?'}\``, '');

  L.push('### فایل‌ها (به ترتیب اجرا)', '', '| فایل | خط | تابع |', '|---|---|---|');
  for (const f of order) {
    const s = src[f];
    L.push(`| \`${f}\` | ${fa(s.split('\n').length)} | ${fa((s.match(/^function\s+[\w$]+\s*\(/gm) || []).length)} |`);
  }

  L.push('', '### کارهای زمان‌دار', '', 'توقف در زمان دیپلوی: «رد» یعنی این نوبت اجرا نمی‌شود، «عقب» یعنی بعد از سبز شدن تست‌ها اجرا می‌شود.', '',
    '| تابع | فایل | زمان‌بندی | در زمان دیپلوی |', '|---|---|---|---|');
  const sched = {};
  for (const f of order) for (const m of src[f].matchAll(/newTrigger\('([\w$]+)'\)\.timeBased\(\)\.(\w+)\(([^)]*)\)/g)) {
    const arg = /[(|]/.test(m[3]) ? 'پویا' : m[3].replace(/ScriptApp\.WeekDay\./, '');
    (sched[m[1]] = sched[m[1]] || new Set()).add(`${m[2]}(${arg})`);
  }
  const jobs = [];
  for (const f of order) for (const m of src[f].matchAll(/ciPaused_\(e,\s*'([\w$]+)',\s*'(\w+)'\)/g)) jobs.push([m[1], f, m[2]]);
  jobs.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [fn, f, mode] of jobs) L.push(`| \`${fn}\` | \`${f}\` | ${[...(sched[fn] || [])].join('، ') || 'onEdit / دستی'} | ${mode === 'skip' ? 'رد' : 'عقب'} |`);
  for (const fn of Object.keys(sched).sort()) {
    if (jobs.some((j) => j[0] === fn)) continue;
    const f = order.find((x) => new RegExp('^function\\s+' + fn + '\\s*\\(', 'm').test(src[x])) || '?';
    L.push(`| \`${fn}\` | \`${f}\` | ${[...sched[fn]].join('، ')} | متوقف نمی‌شود |`);
  }

  L.push('', '### تب‌های شیت', '', 'هر ثابتی که با `getSheetByName` خوانده می‌شود. شیتی که تب در آن است از خود کد معلوم است.', '',
    '| ثابت | نام تب | فایل‌ها |', '|---|---|---|');
  const tabs = new Map();
  for (const f of order) for (const m of src[f].matchAll(/getSheetByName\(\s*([A-Z][A-Z0-9_]+)\s*\)/g)) {
    (tabs.get(m[1]) || tabs.set(m[1], new Set()).get(m[1])).add(f);
  }
  for (const k of [...tabs.keys()].sort()) {
    const v = val(k);
    L.push(`| \`${k}\` | ${typeof v === 'string' ? '«' + v + '»' : '؟'} | ${[...tabs.get(k)].map((x) => '`' + x + '`').join(' ')} |`);
  }

  const roles = val('TG_ROLES');
  L.push('', '### نقش‌ها (`TG_ROLES`)', '', Array.isArray(roles) ? roles.map((r) => '«' + r + '»').join('، ') : '؟');

  L.push('', '### مجموعه‌های تست (`TG_SUITES`)', '', '| نام | تابع |', '|---|---|');
  let suites = [];
  try { suites = bot.run('TG_SUITES.map(function (s) { return [s[0], s[1]]; })'); } catch { /* */ }
  for (const [n, fn] of suites) L.push(`| ${n} | \`${fn}\` |`);

  const ops = [...src['ci.gs'].matchAll(/op === '(\w+)'/g)].map((m) => m[1]);
  L.push('', '### درخواست‌های ci (فقط گردش کار دیپلوی، با کلید یک‌بارمصرف)', '', ops.map((o) => '`' + o + '`').join('، '));
  return L.join('\n');
}

export function mapIsFresh() {
  const md = readFileSync(MAP, 'utf8');
  const a = md.indexOf(START), b = md.indexOf(END);
  if (a < 0 || b < 0) return false;
  return md.slice(a + START.length, b).trim() === buildAuto().trim();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--check')) {
    if (!mapIsFresh()) { console.log('::error::نقشهٔ بات (docs/bot/MAP.md) با کد یکی نیست. اجرا کن: node .github/scripts/bot-map.mjs'); process.exit(1); }
    console.log('نقشهٔ بات با کد یکی است.');
  } else {
    const md = readFileSync(MAP, 'utf8');
    const a = md.indexOf(START), b = md.indexOf(END);
    if (a < 0 || b < 0) { console.log('نشانه‌های AUTO در docs/bot/MAP.md نیست'); process.exit(1); }
    writeFileSync(MAP, md.slice(0, a + START.length) + '\n' + buildAuto() + '\n' + md.slice(b));
    console.log('docs/bot/MAP.md به‌روز شد.');
  }
}
