// node --test site/tools/test/*.test.mjs  (در گردش کار secret-scan.yml هم اجرا می‌شود)
// هش متای Yoast در site-deploy باید با هش پل tj-ops (wp_json_encode در PHP) یکی باشد، وگرنه نوشتن با 409 tj_ops_drift رد می‌شود.
// رشته‌های «PHP» اینجا خروجی واقعی json_encode در PHP روی همان مقدارهای ساختگی‌اند.
import test from 'node:test';
import assert from 'node:assert/strict';
import { phpJson, hash } from '../site-lib.mjs';

const V = { title: 'تراپی / آنلاین', desc: 'نیم‌فاصله 😀 "x"', canonical: '', noindex: '1' };
const PHP = '{"title":"\\u062a\\u0631\\u0627\\u067e\\u06cc \\/ \\u0622\\u0646\\u0644\\u0627\\u06cc\\u0646","desc":"\\u0646\\u06cc\\u0645\\u200c\\u0641\\u0627\\u0635\\u0644\\u0647 \\ud83d\\ude00 \\"x\\"","canonical":"","noindex":"1"}';

test('phpJson همان خروجی json_encode در PHP است (فارسی، نیم‌فاصله، ایموجی، «/»، گیومه)', () => {
  assert.equal(phpJson(V), PHP);
  assert.equal(hash(phpJson(V)), hash(PHP));
});

test('JSON.stringify با هش پل جور نیست (همان خطای 409)', () => {
  assert.notEqual(hash(JSON.stringify(V)), hash(PHP));
});

test('متای فقط لاتین بی «/» با هر دو روش یکی است', () => {
  const v = { title: 'Farsi Speaking Therapist', desc: 'Free intro', canonical: '', noindex: '' };
  assert.equal(phpJson(v), JSON.stringify(v));
});

test('canonical با نشانی: «/» در PHP گریز می‌خورد', () => {
  assert.equal(phpJson({ canonical: 'https://tajrobeh.life/x/' }), '{"canonical":"https:\\/\\/tajrobeh.life\\/x\\/"}');
});
