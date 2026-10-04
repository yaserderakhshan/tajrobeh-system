// node --test site/tools/test/*.test.mjs  (در گردش کار secret-scan.yml هم اجرا می‌شود)
// همهٔ مقدارهای اینجا ساختگی‌اند.
import test from 'node:test';
import assert from 'node:assert/strict';
import { maskSecrets, unmaskFrom, scanLine, looksRandom } from '../secrets.mjs';

const FAKE = 'Zq8Lm2Np4Rt6Vx9Bc1Df3Gh5Jk7Ws0Ya';            // ساختگی، ۳۲ نویسه
const FAKE40 = 'k3J9xQ2mL7pR4tV8wY1zB6nC0dF5gH2sA9eU3iO7';  // ساختگی، ۴۰ نویسه

test('define با نام رمز خالی می‌شود و از نسخهٔ زنده برمی‌گردد', () => {
  const live = `if (!defined('TJ_CAMP_SECRET')) define('TJ_CAMP_SECRET', '${FAKE40}');`;
  const repo = maskSecrets(live);
  assert.equal(repo, "if (!defined('TJ_CAMP_SECRET')) define('TJ_CAMP_SECRET', '');");
  assert.equal(unmaskFrom(repo, live), live);
});

test('رمز تازه از متغیر محیطی SITE_SECRET_<نام>، نه از گیت', () => {
  const repo = "define('TJ_CAMP_SECRET_NEXT', '');";
  assert.equal(unmaskFrom(repo, '', { SITE_SECRET_TJ_CAMP_SECRET_NEXT: FAKE }), `define('TJ_CAMP_SECRET_NEXT', '${FAKE}');`);
  assert.equal(unmaskFrom(repo, '', {}), repo);
  assert.equal(unmaskFrom(repo, '', { SITE_SECRET_TJ_CAMP_SECRET_NEXT: FAKE + '\n' }), `define('TJ_CAMP_SECRET_NEXT', '${FAKE}');`, 'خط تازهٔ انتهایی حذف می‌شود');
});

test('کلید و مقدار با نام secret، token، api_key، password پوشانده و برگردانده می‌شود', () => {
  for (const live of [`$cfg = array('api_key' => 'abcd1234efgh');`, `const o = { token: "tok_12345678" };`, `$password = 'hunter2hunter2';`, `"client_secret": "s3cr3tvalue"`]) {
    const repo = maskSecrets(live);
    assert.notEqual(repo, live, live);
    assert.match(repo, /__MASKED_[0-9a-f]{8}__/);
    assert.equal(unmaskFrom(repo, live), live);
  }
});

test('رشتهٔ تصادفی بلند تنها پوشانده می‌شود', () => {
  const live = `$k = '${FAKE}';`;
  assert.match(maskSecrets(live), /__MASKED_/);
  assert.equal(unmaskFrom(maskSecrets(live), live), live);
  assert.equal(looksRandom(FAKE), true);
});

test('شناسه‌های عمومی و متن عادی دست نمی‌خورند', () => {
  const keep = [
    "return 'https://script.google.com/macros/s/AKfycbFAKEdeploymentIdForTests0000000000000000000000000000000000000/exec';",  // pii:ok ساختگی
    '<meta name="google-site-verification" content="6JdswsPsNzWquNaakZByj5KVVy8nOH-PVY1ob6EEGvs" />',
    '<img src="https://tajrobeh.life/wp-content/uploads/2026/09/x1.MojtabaAleseyedan.webp">',
    "gtag('config', 'G-149WHJVT4Y');",
    "'permission_callback' => function () { return current_user_can('manage_options'); },",
    'متن فارسی معمولی بدون رمز',
    '.tj2 .formbox .ff-btn-submit{background:var(--tj-red)!important}',
    'sha256 0c69a56282c26bd52a258627a81a7d1de452cb8c6d8d10b28bfffef05d94a8d8',
    "$token = wp_generate_password(40, false, false);",
  ];
  for (const k of keep) assert.equal(maskSecrets(k), k, k);
});

test('اسکن خط تازه: کلیدهای شناخته‌شده و رمزها گرفته می‌شوند', () => {
  assert.ok(scanLine(`TELEGRAM=123456789:${'A'.repeat(35)}`).length);
  assert.ok(scanLine(`key: tjk_${'a'.repeat(30)}`).length);
  assert.ok(scanLine('-----BEGIN RSA PRIVATE KEY-----').length);
  assert.ok(scanLine("WP_APP_PASSWORD=abcd 1234 efgh 5678 ijkl mnop").length);
  assert.ok(scanLine(`define('TJ_LEAD_SECRET', '${FAKE}');`).length);
  assert.equal(scanLine('this that with from have your').length, 0);
  assert.equal(scanLine("define('TJ_CAMP_SECRET', '');").length, 0);
  assert.equal(scanLine(`var SHEET = '${FAKE}';`, { generic: false }).length, 0);
});
