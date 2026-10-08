// آزمون محلی همان مورد‌های آزمون دود روی موتور (بی جمنای): هر ۵۰ پرسش با یک شکل دیگر، بی‌ربط‌ها و واژه‌های ممنوع؛ زیر ۹۵٪ مردود.
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare, ask } from '../src/engine.js';
import { FAQ, runAll } from '../smoke-cases.mjs';
import { faNorm, faTokens } from '../src/faq.js';

const P = prepare({ on: true, tools: true, kb: [], idx: [], events: [], siteEvents: [], crisis: { words: ['خودکشی'], text: 'پیام ثابت بحران ۱۲۳ ۱۱۵ ۱۴۸۰' } }, FAQ);
test('یکسان‌سازی فارسی و حذف واژه‌های پرسشی', () => {
  assert.equal(faNorm('مي‌خواهم كلاس‌هاي ۱۲ تايي'), faNorm('میخواهم کلاسهای 12 تایی'));
  assert.equal(faNorm('دوره ها'), faNorm('دوره‌ها'));
  assert.equal(faNorm('مـــدرســه'), 'مدرسه');
  assert.deepEqual(faTokens('هزینه جلسه چقدره؟ لطفاً بگید'), faTokens('هزینهٔ جلسه'));
});
test('فایل پرسش‌های پرتکرار: هر جواب مستقل است (با «بله»، «نه» یا «هر دو» شروع نمی‌شود)، بی خط تیره و «…»، بی واتس‌اپ', () => {
  for (const f of FAQ.faq) {
    assert.doesNotMatch(f.answer.trim(), /^(بله|نه|هر دو)(?=[\s،.!؟:]|$)/, f.id);
    assert.doesNotMatch(f.answer, /[—–…]/, f.id);
    assert.doesNotMatch(f.answer, /واتس/, f.id);
    assert.ok(f.question && f.links && f.links.length, f.id);
  }
  assert.equal(new Set(FAQ.faq.map((f) => f.id)).size, FAQ.faq.length, 'id یکتا');
});
test('آزمون دود روی موتور: دست‌کم ۹۵٪ درست', async () => {
  const R = await runAll(async (q) => ({ j: ask(P, q, { today: '2026-10-08' }).res, st: 200 }));
  assert.ok(R.pass, `${R.ok}/${R.total}\n` + R.bad.join('\n'));
});
