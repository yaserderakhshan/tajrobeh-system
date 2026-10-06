#!/usr/bin/env node
/**
 * نگهبان صندوق یکتا (v170.28، بند و۹): ورودی موازی تازه ممنوع.
 * هر ثابت تبی در bot/*.gs که اسم یا مقدارش ورودی‌مانند است (درخواست، تیکت، پیام، باگ، تماس، صندوق، بازخورد، شکایت، Inbox)
 * باید یا در INB_SRC (tab: 'NAME') ثبت شده باشد یا در INB_NOT_INBOUND با دلیل. وگرنه PR رد می‌شود.
 * کاربرد: node .github/scripts/inbox-guard.mjs [پوشهٔ بات]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function guard(dir) {
  const files = readdirSync(dir).filter((f) => f.endsWith('.gs'));
  const inbox = files.includes('inbox.gs') ? readFileSync(join(dir, 'inbox.gs'), 'utf8') : '';
  const allowed = new Set();
  for (const m of inbox.matchAll(/tab:\s*'([A-Z_][A-Z0-9_]*)'/g)) allowed.add(m[1]);
  const ni = /var INB_NOT_INBOUND = \{([\s\S]*?)\n\};/.exec(inbox);
  if (ni) for (const m of ni[1].matchAll(/\b([A-Z_][A-Z0-9_]*)\s*:/g)) allowed.add(m[1]);
  const WORD = /درخواست|تیکت|پیام|باگ|تماس|صندوق|بازخورد|شکایت|Inbox/i;
  const bad = [];
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf8');
    for (const m of src.matchAll(/^(?:var|const|let)\s+([A-Z][A-Z0-9_]*)\s*=\s*'([^']*)'/gm)) {
      const [, name, val] = m;
      if (!/(^TAB_|_TAB$|_RTAB$|_REQ$|_LOG$)/.test(name)) continue;
      if (!WORD.test(val) && !WORD.test(name)) continue;
      if (!allowed.has(name)) bad.push(`${f}: ${name} = '${val}'`);
    }
  }
  return bad;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const bad = guard(process.argv[2] || 'bot');
  if (bad.length) {
    console.log('::error::ورودی موازی تازه: این تب‌ها ورودی‌مانندند ولی در صندوق یکتا (INB_SRC) یا INB_NOT_INBOUND (با دلیل) ثبت نشده‌اند. شرح: bot/inbox.gs');
    bad.forEach((b) => console.log('  ' + b));
    process.exit(1);
  }
  console.log('صندوق یکتا: ورودی موازی تازه‌ای نیست.');
}
