// node --test site/tools/test/*.test.mjs  (در گردش کار secret-scan.yml هم اجرا می‌شود)
// آینهٔ سایت: نام همکار در برگهٔ منتشرشده فقط وقتی پذیرفته می‌شود که از پیش منتشر شده باشد.
// همهٔ نام‌ها، شماره‌ها و ایمیل‌های اینجا ساختگی‌اند؛ شماره و ایمیل تکه‌تکه ساخته می‌شوند تا خود فایل شبیه دادهٔ واقعی نباشد.
import test from 'node:test';
import assert from 'node:assert/strict';
import { piiKinds, namesIn, publishedNames, mirrorSelfTest } from '../site-mirror.mjs';
import { piiLine } from '../../../.github/scripts/pii-scan.mjs';

const A = 'نمونه‌الف', B = 'نمونه‌ب';
const NAMES = [A, B];
const PHONE = '0912' + '1234567';
const EMAIL = 'someone' + '@' + 'gmail.com';
const NAME_KIND = 'نام همکار (PII_NAMES)';
const never = () => { throw new Error('صفحهٔ عمومی نباید خوانده شود'); };

test('خودآزمایی site-mirror سبز است', () => {
  assert.deepEqual(mirrorSelfTest(), []);
});

test('بی استثنا، نام همکار در برگه رد می‌شود (رفتار قبلی برای اسنیپت و قالب)', () => {
  assert.deepEqual(piiKinds(`<p>جلسه با ${A}</p>`, NAMES), [NAME_KIND]);
  assert.deepEqual(piiKinds('<p>سلام</p>', NAMES), []);
});

test('نام پذیرفته‌شده دیگر رد نمی‌شود، ولی نام دیگر بله', () => {
  const html = `<p>${A}</p>\n<p>${B}</p>`;
  assert.deepEqual(piiKinds(html, NAMES, [A]), [NAME_KIND]);
  assert.deepEqual(piiKinds(html, NAMES, [A, B]), []);
});

test('شماره، ایمیل و شناسه حتی با نام پذیرفته‌شده رد می‌شوند', () => {
  assert.ok(piiKinds(`<p>${A}: ${PHONE}</p>`, NAMES, [A]).includes('شمارهٔ تلفن'));
  assert.ok(piiKinds(`<p>${A}: ${EMAIL}</p>`, NAMES, [A]).includes('ایمیل'));
  assert.ok(piiKinds(`var CH = '-100${'1234567890'}';`, NAMES, [A]).includes('chat_id'));
  assert.ok(piiKinds(`<a href="https://docs.google.com/d/1${'AbCdEfGhIjKlMnOpQrStUvWxYz012345'}/">x</a>`, NAMES, [A]).includes('شناسهٔ شیت یا درایو'));
});

test('نام‌های PII_NAMES محیط روی برگه دو بار شمرده نمی‌شوند (piiLine بی فهرست نام)', () => {
  const prev = process.env.PII_NAMES;
  try {
    assert.deepEqual(piiLine(`<p>${A}</p>`, '', []), []);
  } finally { if (prev === undefined) delete process.env.PII_NAMES; else process.env.PII_NAMES = prev; }
});

test('namesIn فقط کلمهٔ کامل را می‌شمارد و خط pii:ok را نه', () => {
  assert.deepEqual(namesIn(`<p>${A}ی</p>`, NAMES), []);
  assert.deepEqual(namesIn(`<p>${A}، و</p>`, NAMES), [A]);
  assert.deepEqual(namesIn(`<!-- ${B} pii:ok -->`, NAMES), []);
  assert.deepEqual(namesIn('', NAMES), []);
  assert.deepEqual(namesIn(null, NAMES), []);
});

test('برگه بی نام: صفحهٔ عمومی خوانده نمی‌شود', async () => {
  assert.deepEqual(await publishedNames('<p>سلام</p>', NAMES, null, never), []);
});

test('نام در نسخهٔ قبلی مخزن: پذیرفته، بی خواندن صفحهٔ عمومی', async () => {
  const prev = `<p>${A}</p>`, raw = `<p>${A}</p><p>بند تازه</p>`;
  assert.deepEqual(await publishedNames(raw, NAMES, prev, never), [A]);
});

test('نام تازه که روی صفحهٔ عمومی همین برگه هست: پذیرفته', async () => {
  const raw = `<!-- wp:paragraph --><p>${A}</p><!-- /wp:paragraph -->`;
  let calls = 0;
  const got = await publishedNames(raw, NAMES, null, async () => { calls++; return `<html><body><p>${A}</p></body></html>`; });
  assert.deepEqual(got, [A]);
  assert.equal(calls, 1);
});

test('نام تازه که روی صفحهٔ عمومی نیست (فقط در متن خام): رد', async () => {
  const raw = `<p>${A}</p><!-- ${B} -->`;
  const got = await publishedNames(raw, NAMES, null, async () => `<p>${A}</p>`);
  assert.deepEqual(got, [A]);
  assert.deepEqual(piiKinds(raw, NAMES, got), [NAME_KIND]);
});

test('صفحهٔ عمومی در دسترس نیست یا خطا داد: هیچ نام تازه‌ای پذیرفته نمی‌شود', async () => {
  const raw = `<p>${A}</p>`;
  assert.deepEqual(await publishedNames(raw, NAMES, null, async () => ''), []);
  assert.deepEqual(await publishedNames(raw, NAMES, null, async () => { throw new Error('شبکه'); }), []);
  assert.deepEqual(await publishedNames(raw, NAMES, `<p>${B}</p>`, async () => null), []);
});

test('ترکیب: یکی از نسخهٔ قبلی، یکی از صفحهٔ عمومی', async () => {
  const raw = `<p>${A}</p><p>${B}</p>`;
  const got = await publishedNames(raw, NAMES, `<p>${A}</p>`, async () => `<p>${B}</p>`);
  assert.deepEqual(got.sort(), [A, B].sort());
  assert.deepEqual(piiKinds(raw, NAMES, got), []);
});

test('برگه با نام منتشرشده ولی شمارهٔ تلفن: باز رد می‌شود', async () => {
  const raw = `<p>${A}</p>\n<p>${PHONE}</p>`;
  const got = await publishedNames(raw, NAMES, null, async () => raw);
  assert.deepEqual(got, [A]);
  assert.deepEqual(piiKinds(raw, NAMES, got), ['شمارهٔ تلفن']);
});
