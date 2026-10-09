// بازرسی کامل مخزن عمومی (کار ۸، ۱۸ مهر ۱۴۰۵): همهٔ فایل‌های فعلی و همهٔ خط‌های افزوده‌شده در کل تاریخچهٔ گیت، با همان قاعده‌های
// pii-scan.mjs، به‌علاوهٔ نام همکاران (GitHub Secret «PII_NAMES») در همهٔ فایل‌های غیر سایت (کد، مستند، CHANGELOG).
// هیچ مقدار و هیچ نامی چاپ نمی‌شود: فقط نوع، فایل، خط (درخت فعلی) یا کامیت (تاریخچه). اجرا: گردش کار «بازرسی اطلاعات شخصی».
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { piiLine } from './pii-scan.mjs';

const NAMES = (process.env.PII_NAMES || '').split(/[,،\n]+/).map((x) => x.trim()).filter((x) => x.length >= 2);
const BIN = /\.(png|jpe?g|webp|gif|woff2?|ttf|otf|pdf|ico|mp3|ogg)$|package-lock\.json$|^\.github\/scripts\/pii-(scan|audit)\.mjs$/;
const SITE = /^(site|content)\//;
const nameHit = (line, file) => !SITE.test(file) && NAMES.some((n) => line.includes(n));
const kinds = (line, file) => { const k = piiLine(line, file, []); if (nameHit(line, file)) k.push('نام همکار'); return k; };

const tree = [], hist = new Map();
for (const f of execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)) {
  if (BIN.test(f)) continue;
  let t; try { t = readFileSync(f, 'utf8'); } catch { continue; }
  if (t.includes('\0')) continue;
  t.split('\n').forEach((l, i) => { if (l.length < 4000) { const k = kinds(l, f); if (k.length) tree.push(`${f}:${i + 1} ${k.join('، ')}`); } });
}
const p = spawn('git', ['log', '--all', '-p', '--no-color', '-U0', '--format=@@C %h']);
let c = '', f = '';
for await (const l of createInterface({ input: p.stdout })) {
  if (l.startsWith('@@C ')) { c = l.slice(4); continue; }
  if (l.startsWith('+++ ')) { f = l.slice(6); continue; }
  if (!l.startsWith('+') || l.startsWith('+++') || BIN.test(f) || l.length > 4000) continue;
  for (const k of kinds(l.slice(1), f)) { const key = `${k} · ${f}`; const v = hist.get(key) || new Set(); v.add(c); hist.set(key, v); }
}
const out = ['## بازرسی اطلاعات شخصی (درخت فعلی و کل تاریخچه)', '', `نام‌های بررسی‌شده از PII_NAMES: ${NAMES.length}`, '',
  `### درخت فعلی: ${tree.length} خط`, ...tree.slice(0, 300).map((x) => '- ' + x), '',
  `### تاریخچه: ${hist.size} (نوع · فایل)`, ...[...hist].map(([k, v]) => `- ${k} · ${v.size} کامیت (${[...v].slice(0, 5).join(' ')})`)];
console.log(out.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join('\n') + '\n');
