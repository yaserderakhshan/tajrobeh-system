// چک خودکار PR های /site (از .github/workflows/site-check.yml). به سایت وصل نمی‌شود.
// ورودی: BASE و HEAD (کامیت‌ها). فقط فایل‌ها و خط‌های تازهٔ همین PR سنجیده می‌شوند.
//   - نحو PHP اسنیپت‌ها (php -l)، درستی JSON، نحو ابزارها (node --check)
//   - خط تیرهٔ بلند و میانی در خط‌های تازهٔ متن (قاعدهٔ ۳ CLAUDE.md)؛ در PR همگام‌سازی با سایت فقط هشدار
//   - رمز و توکن در خط‌های تازه (قاعدهٔ ۶)
//   - اسنیپت تازه در snippets/index.json نوع و محل اجرای مجاز دارد
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fail, log, summary, warn } from './site-lib.mjs';
import { scanLine } from './secrets.mjs';

const BASE = process.env.BASE, HEAD = process.env.HEAD || 'HEAD';
const SYNC = /همگام‌سازی|site-sync/.test(process.env.PR_TITLE || '');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20 });
const files = git('diff', '--name-only', '--diff-filter=AM', '-z', BASE, HEAD, '--', 'site').split('\0').filter(Boolean);
const errs = [], warns = [];
const tmp = mkdtempSync(join(tmpdir(), 'sc-'));

for (const f of files) {
  const body = git('show', `${HEAD}:${f}`);
  if (f.endsWith('.php')) {
    const p = join(tmp, 'x.php');
    writeFileSync(p, (body.trimStart().startsWith('<?php') ? '' : '<?php\n') + body);
    try { execFileSync('php', ['-l', p], { stdio: 'pipe' }); } catch (e) { errs.push(`${f}: خطای نحوی PHP: ${String(e.stdout || e.stderr).split('\n').find((l) => /error/i.test(l)) || ''}`); }
  }
  if (f.endsWith('.json')) { try { JSON.parse(body); } catch (e) { errs.push(`${f}: JSON نامعتبر (${e.message})`); } }
  if (f.endsWith('.mjs')) { const p = join(tmp, 'x.mjs'); writeFileSync(p, body); try { execFileSync('node', ['--check', p], { stdio: 'pipe' }); } catch (e) { errs.push(`${f}: ${String(e.stderr).split('\n')[4] || 'خطای نحوی'}`); } }
  // خط‌های تازه
  const added = git('diff', '-U0', BASE, HEAD, '--', f).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  added.forEach((l) => {
    if (/[—–]/.test(l) && !f.startsWith('site/tools/')) (SYNC ? warns : errs).push(`${f}: خط تیرهٔ بلند یا میانی در خط تازه: «${l.slice(1).trim().slice(0, 80)}»`);
    if (!f.startsWith('site/tools/test/')) for (const k of scanLine(l.slice(1))) errs.push(`${f}: ${k}`);
    // wptexturize در محتوای برگه و قالب && را به &#038;&#038; می‌شکند (دام «د» در اسکیل وردپرس)
    if (/^site\/(pages|templates|template-parts)\//.test(f) && /&&/.test(l)) errs.push(`${f}: «&&» در محتوای برگه یا قالب؛ if تودرتو بنویس`);
  });
}
// اسنیپت تازه
if (files.includes('site/snippets/index.json')) {
  const idx = JSON.parse(git('show', `${HEAD}:site/snippets/index.json`));
  for (const s of idx.filter((x) => !Number.isInteger(x.id))) {
    if (!['php', 'html', 'css', 'js'].includes(s.type)) errs.push(`اسنیپت تازهٔ ${s.file}: نوع ${s.type} مجاز نیست`);
    if (!['everywhere', 'frontend_only', 'site_wide_header', 'site_wide_footer'].includes(s.loc)) errs.push(`اسنیپت تازهٔ ${s.file}: loc باید یکی از everywhere، frontend_only، site_wide_header، site_wide_footer باشد`);
  }
}
const md = `## چک خودکار /site\n\n${files.length} فایل · ${errs.length} خطا · ${warns.length} هشدار\n\n` + [...errs.map((e) => `- ⛔ ${e}`), ...warns.map((w) => `- ⚠️ ${w}`)].join('\n');
summary(md);
log(md);
warns.forEach((w) => warn(w));
if (errs.length) { errs.forEach((e) => fail(e)); process.exit(1); }
