// مرور امنیتی خودکار بات روی فایل‌های عوض‌شدهٔ همین PR (کار ۸ برد فرآیندها؛ گام ثابت روند انتشار بات، CLAUDE.md بند ۱۱).
// فقط خط‌های تازهٔ bot/*.gs و تابع‌هایی که آن خط‌ها در آن‌اند سنجیده می‌شوند. قاعده‌ها از مرور امنیتی ۱۸ مهر ۱۴۰۵ آمده‌اند:
//   خطا (مرج نه):
//   S1 · فایل درایو برای «هر کس با لینک» (Access.ANYONE…) بی نشانهٔ «sec:ok» با دلیل.
//   S2 · کال‌بک تازه (data.indexOf('xx:') === 0) که تابع گیرنده‌اش هیچ سنجش دسترسی ندارد و «sec:public» هم نخورده.
//   S3 · فرستادن به هوش مصنوعی (aiGen_، gemJson_، gemFetch_، vxGem_، aiTranscribe_ با priv) از تابعی که دادهٔ لید می‌خواند، بی aiPaid_.
//   S4 · رمز یا کلید در خط تازه (الگوی توکن بات، AIza، sk-ant، ghp_).
//   هشدار (در گزارش PR، مرج را نمی‌بندد ولی باید خوانده شود):
//   W1 · appendRow یا setValue(s) با متن کاربر بی tgCell_ (تزریق فرمول).
//   W2 · نام یا متن کاربر در پیام HTML بی tgEsc_.
//   W3 · پیشوند تازه در فهرست کال‌بک‌های مینی‌اپ (tgApiC_): گیرندهٔ آن باید نقش یا مالکیت را دوباره بسنجد.
// اجرا: BASE=<sha پایه> node .github/scripts/bot-sec-review.mjs   (بی BASE: origin/main)
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, appendFileSync } from 'node:fs';

const BASE = process.env.BASE || 'origin/main';
const sh = (c) => execSync(c, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const ACCESS = /Can(Create|Send)?_\(|Can_\(|IsMine_?\(|MineOk_\(|Owner_\(|TG_OWNER_CHAT|tgWhoDesk_\(|tgWatchIds_\(|tgV1CanCreate_\(|tgEvCan_\(|tgPayCanCreate_\(|tgApiGuard_\(|tgPrOk_\(|tgInpDeskOk_\(|tgChatIn_\(|IsTeam_\(|IsBoss_\(|sec:public/;
const AI = /\b(aiGen_|gemJson_|gemFetch_|vxGem_)\(|aiTranscribe_\([^)]*priv:\s*true/;
const LEAD = /tgLeadRead_\(|tgLeadRows?_\(|TG_LEADS?_|\.first\b|شرح حال/;
const SECRET = /\d{8,10}:AA[0-9A-Za-z_-]{30,}|AIza[0-9A-Za-z_-]{30,}|sk-ant-[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{30,}/;

function changed() {
  let names = [];
  try { names = sh(`git diff --name-only --diff-filter=AM ${BASE}...HEAD -- 'bot/*.gs'`).split('\n').filter(Boolean); }
  catch (e) { names = sh(`git diff --name-only --diff-filter=AM ${BASE} -- 'bot/*.gs'`).split('\n').filter(Boolean); }
  const out = [];
  for (const f of names) {
    if (!existsSync(f)) continue;
    let diff = '';
    try { diff = sh(`git diff -U0 --no-color ${BASE}...HEAD -- '${f}'`); } catch (e) { diff = sh(`git diff -U0 --no-color ${BASE} -- '${f}'`); }
    const added = new Set();
    let n = 0;
    for (const ln of diff.split('\n')) {
      const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(ln);
      if (h) { n = Number(h[1]); continue; }
      if (ln.startsWith('+') && !ln.startsWith('+++')) { added.add(n); n++; }
      else if (!ln.startsWith('-')) n++;
    }
    out.push({ f, lines: readFileSync(f, 'utf8').split('\n'), added });
  }
  return out;
}
/* تابعی که خط i در آن است: از نزدیک‌ترین «function x(» بالای خط تا اولین «}» ستون اول */
function enclosing(lines, i) {
  let s = i; while (s >= 0 && !/^function\s+[\w$]+\s*\(/.test(lines[s])) s--;
  if (s < 0) return { name: '', body: '' };
  let e = s + 1; while (e < lines.length && !/^}/.test(lines[e])) e++;
  return { name: /^function\s+([\w$]+)/.exec(lines[s])[1], body: lines.slice(s, e + 1).join('\n') };
}
function fnBody(files, name) {
  for (const x of files) { const i = x.lines.findIndex((l) => l.startsWith('function ' + name + '(')); if (i > -1) return enclosing(x.lines, i).body; }
  for (const f of sh("ls bot/*.gs").split('\n').filter(Boolean)) {
    const L = readFileSync(f, 'utf8').split('\n'); const i = L.findIndex((l) => l.startsWith('function ' + name + '(')); if (i > -1) return enclosing(L, i).body;
  }
  return '';
}

const files = changed(), errors = [], warns = [];
const where = (x, i) => `${x.f}:${i + 1}`;
for (const x of files) {
  for (const n of x.added) {
    const i = n - 1, l = x.lines[i] || '';
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) continue;
    if (SECRET.test(l)) errors.push(`S4 ${where(x, i)} · رمز یا کلید در کد`);
    if (/Access\.ANYONE/.test(l) && !/sec:ok/.test(l)) errors.push(`S1 ${where(x, i)} · فایل درایو برای هر کس با لینک (اگر عمدی است «sec:ok <دلیل>» بنویس)`);
    const cb = /data\.indexOf\('([\w-]+:)'\)\s*===\s*0[^;]*?return\s+([\w$]+)\(/.exec(l);
    if (cb) { const b = fnBody(files, cb[2]); if (b && !ACCESS.test(b)) errors.push(`S2 ${where(x, i)} · کال‌بک «${cb[1]}» در ${cb[2]} هیچ سنجش دسترسی ندارد (اگر عمداً عمومی است «sec:public» در همان تابع)`); }
    if (AI.test(l)) { const fn = enclosing(x.lines, i); if (LEAD.test(fn.body) && !/aiPaid_\(/.test(fn.body)) errors.push(`S3 ${where(x, i)} · ${fn.name}: دادهٔ لید به هوش مصنوعی بی aiPaid_`); }
    if (/\.(appendRow|setValues?)\(/.test(l) && /\b(text|m\.text|caption|name|uname|st\.\w+)\b/.test(l) && !/tgCell_|tgCellRow_/.test(l)) warns.push(`W1 ${where(x, i)} · متن کاربر در شیت بی tgCell_`);
    if (/tg(Send|Notify)_\(/.test(l) && /'\s*\+\s*(name|uname|text|title)\s*\+\s*'/.test(l)) warns.push(`W2 ${where(x, i)} · متن کاربر در پیام HTML بی tgEsc_`);
    if (/tgApiC_\([^)]*\[[^\]]*'[\w-]+:'/.test(l)) warns.push(`W3 ${where(x, i)} · پیشوند کال‌بک مینی‌اپ: گیرنده‌اش نقش یا مالکیت را دوباره بسنجد`);
  }
}
const lines = [`مرور امنیتی بات · ${files.length} فایل عوض‌شده · خطا: ${errors.length} · هشدار: ${warns.length}`]
  .concat(errors.map((e) => '❌ ' + e), warns.map((w) => '⚠️ ' + w));
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### مرور امنیتی بات\n' + lines.map((l) => '- ' + l).join('\n') + '\n');
for (const w of warns) console.log('::warning::' + w);
if (errors.length) { console.log('::error::مرور امنیتی بات: ' + errors.length + ' خطا. مرج نه.'); process.exit(1); }
