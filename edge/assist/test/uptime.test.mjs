// پایش بالا بودن سایت: تصمیم هشدار، برگشت، «از خارج نه از داخل آره»، و سنجش یک صفحه با fetch ساختگی.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upDecide, upCheckOne, UP_PAGES } from '../src/uptime.js';

const okR = UP_PAGES.map((p) => ({ key: p.key, code: 200, ms: 300, has: true, ok: true }));
const badR = [{ key: 'home', code: 0, ms: 15000, has: false, ok: false, err: 'timeout' }, ...okR.slice(1)];
const T = 1_800_000_000_000;

test('همه سالم: بی هشدار و بی نوشتن', () => {
  const d = upDecide(okR, null, 0, T);
  assert.equal(d.alert, null); assert.equal(d.changed, false);
});
test('یک خطا: هنوز هشدار نه، ولی شمار نوشته می‌شود', () => {
  const d = upDecide(badR, null, 0, T);
  assert.equal(d.alert, null); assert.equal(d.state.fails, 1); assert.equal(d.changed, true);
});
test('دو خطای پشت سر هم: هشدار «down» یک بار', () => {
  const d1 = upDecide(badR, null, 0, T), d2 = upDecide(badR, d1.state, 0, T + 300000);
  assert.equal(d2.alert.kind, 'down'); assert.equal(d2.alert.bad[0].key, 'home');
  const d3 = upDecide(badR, d2.state, 0, T + 600000);
  assert.equal(d3.alert, null, 'هشدار دوباره نمی‌رود'); assert.equal(d3.changed, false);
});
test('ضربان تازهٔ داخل ایران: هشدار «outside»', () => {
  const d1 = upDecide(badR, null, T - 60000, T), d2 = upDecide(badR, d1.state, T - 60000, T + 300000);
  assert.equal(d2.alert.kind, 'outside');
});
test('ضربان کهنه: همان «down»', () => {
  const d1 = upDecide(badR, null, T - 3600000, T), d2 = upDecide(badR, d1.state, T - 3600000, T + 300000);
  assert.equal(d2.alert.kind, 'down');
});
test('برگشت: یک پیام «up» با مدت قطعی', () => {
  const d1 = upDecide(badR, null, 0, T), d2 = upDecide(badR, d1.state, 0, T + 300000), d3 = upDecide(okR, d2.state, 0, T + 25 * 60000);
  assert.equal(d3.alert.kind, 'up'); assert.equal(d3.alert.mins, 25); assert.equal(d3.state.fails, 0);
});
test('یک خطای تنها و برگشت: پیام «up» نه', () => {
  const d1 = upDecide(badR, null, 0, T), d2 = upDecide(okR, d1.state, 0, T + 300000);
  assert.equal(d2.alert, null); assert.equal(d2.state.fails, 0);
});
test('سنجش صفحه: ۲۰۰ و عبارت ثابت', async () => {
  const f = async () => ({ status: 200, text: async () => '<div id="therapists"></div>' });
  const r = await upCheckOne(UP_PAGES[0], f);
  assert.equal(r.ok, true); assert.equal(r.code, 200);
});
test('سنجش صفحه: ۲۰۰ بی عبارت ثابت خطاست', async () => {
  const f = async () => ({ status: 200, text: async () => '<html>صفحهٔ نگهداری</html>' });
  const r = await upCheckOne(UP_PAGES[0], f);
  assert.equal(r.ok, false); assert.equal(r.has, false);
});
test('سنجش صفحه: خطای شبکه', async () => {
  const r = await upCheckOne(UP_PAGES[1], async () => { throw new Error('x'); });
  assert.equal(r.ok, false); assert.equal(r.err, 'net');
});
