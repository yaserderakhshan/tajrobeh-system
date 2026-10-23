// آزمون رلهٔ پایدار: node --test 'edge/relay/test/*.test.mjs'  (دادهٔ ساختگی، بی شبکه)
import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, drain, forward, backoff, describeTelegram, tgChat, DAY_MS, BACKOFF_CAP_MS } from '../src/core.js';
import worker from '../src/index.js';
import { memSql, makeEnv, fakeBot, upd, tgReq, SECRET, BOT } from './helpers.mjs';

const T0 = 1_800_000_000_000;
const clock = (t = T0) => { const c = () => c.t; c.t = t; return c; };
const add = (s, u, now) => s.add(describeTelegram(JSON.stringify(u), u), now);
/* تحویل‌دهندهٔ ساختگی برای هسته: نتیجه از تابع، ثبت ترتیب */
const fwdWith = (fn) => { const seen = []; const f = async (h) => { const r = fn(h, seen.length); seen.push(JSON.parse(h.body).update_id); return r; }; f.seen = seen; return f; };
const OK = { ok: true, code: 200 };
const E500 = { ok: false, code: 500, err: 'http 500', unc: false };

test('فاصلهٔ تلاش دوباره نمایی است و سقف دارد', () => {
  assert.equal(backoff(1), 2000); assert.equal(backoff(2), 4000); assert.equal(backoff(5), 32000);
  assert.equal(backoff(30), BACKOFF_CAP_MS);
});

test('چت هر نوع آپدیت', () => {
  assert.equal(tgChat(upd(1, 501)), '501');
  assert.equal(tgChat({ update_id: 2, callback_query: { id: 'q', from: { id: 7 }, message: { chat: { id: 502 } } } }), '502');
  assert.equal(tgChat({ update_id: 3, channel_post: { chat: { id: -100 } } }), '-100');
  assert.equal(tgChat({ update_id: 4, inline_query: { from: { id: 9 } } }), 'u9');
});

test('اپس‌اسکریپت ۵xx: آپدیت می‌ماند، بعد از برگشت تحویل و «برگشته» شمرده می‌شود', async () => {
  const s = new Store(memSql()), c = clock();
  add(s, upd(10, 1), c.t);
  let down = true;
  const f = fwdWith(() => (down ? E500 : OK));
  let r = await drain(s, f, c);
  assert.equal(r.failed, 1); assert.equal(s.health(c.t).pending, 1);
  const h = s.head('tg:1'); assert.equal(h.tries, 1); assert.equal(h.next_at, c.t + backoff(1));
  assert.equal(s.breaker().fails, 1);
  c.t += 1000; r = await drain(s, f, c); assert.equal(r.failed + r.sent, 0, 'پیش از موعد تلاش نمی‌کند');
  down = false; c.t += 5000; r = await drain(s, f, c);
  assert.equal(r.sent, 1);
  const hl = s.health(c.t);
  assert.deepEqual([hl.pending, hl.recovered_24h, hl.failed_24h], [0, 1, 0]);
  assert.equal(s.breaker().fails, 0);
  assert.equal(s.nextWake(c.t), null);
});

test('مهلت تحویل: fetch آویزان قطع می‌شود و «نامطمئن» علامت می‌خورد؛ تلاش بعد rt و unc دارد', async () => {
  const b = fakeBot(['hang', 200]);
  const item = { body: '{"update_id":5}', tries: 0, unc: 0 };
  const t1 = Date.now();
  const r = await forward(BOT, SECRET, item, b.f, 50);
  assert.equal(r.ok, false); assert.equal(r.err, 'timeout'); assert.equal(r.unc, true);
  assert.ok(Date.now() - t1 < 2000);
  const r2 = await forward(BOT, SECRET, { ...item, tries: 1, unc: 1 }, b.f, 50);
  assert.equal(r2.ok, true);
  assert.equal(b.calls[1].url.searchParams.get('t'), SECRET);
  assert.equal(b.calls[1].url.searchParams.get('rt'), '1');
  assert.equal(b.calls[1].url.searchParams.get('unc'), '1');
  assert.equal(b.calls[0].url.searchParams.get('rt'), null);
  assert.equal(b.calls[1].body, item.body, 'بدنه همان است که تلگرام فرستاد');
});

test('ریدایرکت ۳۰۲ اپس‌اسکریپت یعنی رسید؛ ۴۰۴ و خطای شبکه یعنی نرسید', async () => {
  for (const [st, ok] of [[302, true], [200, true], [404, false], [503, false], ['net', false]]) {
    const r = await forward(BOT, SECRET, { body: '{}', tries: 0 }, fakeBot([st]).f, 100);
    assert.equal(r.ok, ok, String(st));
  }
  assert.equal((await forward('', SECRET, { body: '{}' }, fakeBot([200]).f)).ok, false, 'بی نشانی بات، نگه داشته می‌شود');
});

test('update_id تکراری یک بار ذخیره و یک بار تحویل می‌شود، حتی بعد از تحویل', async () => {
  const s = new Store(memSql()), c = clock();
  assert.equal(add(s, upd(20, 1), c.t), true);
  assert.equal(add(s, upd(20, 1), c.t), false);
  const f = fwdWith(() => OK);
  await drain(s, f, c);
  assert.equal(add(s, upd(20, 1), c.t + 3600e3), false, 'تکرار بعد از تحویل هم کنار گذاشته می‌شود');
  await drain(s, f, c);
  assert.deepEqual(f.seen, [20]);
});

test('ترتیب در هر چت: پیام دوم پیش از اول نمی‌رود؛ چت دیگر معطل نمی‌ماند', async () => {
  const s = new Store(memSql()), c = clock();
  add(s, upd(32, 1), c.t); add(s, upd(30, 1), c.t); add(s, upd(31, 1), c.t); add(s, upd(40, 2), c.t);
  let fail30 = true;
  const f = fwdWith((h) => (JSON.parse(h.body).update_id === 30 && fail30 ? E500 : OK));
  await drain(s, f, c, 1);
  assert.ok(!f.seen.includes(31) && !f.seen.includes(32), 'پشت ۳۰ می‌مانند');
  c.t += backoff(1) + 1;
  await drain(s, f, c, 1);   // تلاش دوم ۳۰ هم شکست؛ ۳۱ و ۳۲ هنوز پشت آن
  assert.ok(!f.seen.includes(31) && !f.seen.includes(32));
  fail30 = false; c.t += BACKOFF_CAP_MS; await drain(s, f, c, 1);
  const chat1 = f.seen.filter((x) => x >= 30 && x < 40);
  const firstOk30 = chat1.lastIndexOf(30);
  assert.deepEqual(chat1.slice(firstOk30), [30, 31, 32]);
  assert.ok(f.seen.includes(40));
  assert.equal(s.health(c.t).pending, 0);
});

test('بیش از ۲۴ ساعت: «ناموفق» شمرده می‌شود، صف را نمی‌بندد و پیام بعدی همان چت می‌رود', async () => {
  const s = new Store(memSql()), c = clock();
  add(s, upd(50, 1), c.t);
  c.t += DAY_MS - 60e3; add(s, upd(51, 1), c.t);
  const f = fwdWith(() => E500);
  await drain(s, f, c);
  assert.equal(s.health(c.t).pending, 2);
  assert.ok(s.nextWake(c.t) <= T0 + DAY_MS + 1, 'آلارم برای انقضا هم بیدار می‌شود');
  c.t = T0 + DAY_MS + 1;
  const ok = fwdWith(() => OK);
  const r = await drain(s, ok, c);
  assert.equal(r.expired, 1);
  assert.deepEqual(ok.seen, [51]);
  const h = s.health(c.t);
  assert.deepEqual([h.pending, h.failed_24h, h.recovered_24h], [0, 1, 1]);
  assert.equal(s.health(c.t + DAY_MS + 1).failed_24h, 0, 'شمار ۲۴ ساعته کهنه می‌شود');
});

test('قطع‌کن سراسری: در قطعی، هر دور فقط یک تلاش؛ برگشت، همه را فوراً بیدار می‌کند', async () => {
  const s = new Store(memSql()), c = clock();
  for (let i = 0; i < 5; i++) add(s, upd(60 + i, 100 + i), c.t);
  let down = true;
  const f = fwdWith(() => (down ? E500 : OK));
  await drain(s, f, c, 1);
  assert.equal(f.seen.length, 1);
  c.t += 1000; await drain(s, f, c, 1); assert.equal(f.seen.length, 1, 'قطع‌کن هنوز باز است');
  down = false; c.t += BACKOFF_CAP_MS; await drain(s, f, c, 1);
  assert.equal(s.health(c.t).pending, 0);
});

test('توقف موقت: ذخیره ادامه دارد، تحویل نه', async () => {
  const s = new Store(memSql()), c = clock();
  s.setPaused(true); add(s, upd(70, 1), c.t);
  const f = fwdWith(() => OK);
  await drain(s, f, c); assert.equal(f.seen.length, 0);
  assert.equal(s.health(c.t).paused, true);
  s.setPaused(false); await drain(s, f, c); assert.deepEqual(f.seen, [70]);
});

/* ---------- ورکر کامل با دیوریبل آبجکت درون‌حافظه ---------- */
async function withBot(plan, fn) {
  const real = globalThis.fetch, b = fakeBot(plan);
  globalThis.fetch = b.f;
  try { await fn(b); } finally { globalThis.fetch = real; }
}

test('رمز غلط یا بی رمز: ۴۰۳ و هیچ چیز ذخیره نمی‌شود', async () => {
  const E = makeEnv();
  await withBot([200], async (b) => {
    assert.equal((await worker.fetch(tgReq(upd(1, 1), { secret: 'wrong' }), E.env, E.ctx)).status, 403);
    assert.equal((await worker.fetch(tgReq(upd(2, 1), { secret: '' }), E.env, E.ctx)).status, 403);
    assert.equal((await worker.fetch(tgReq(upd(3, 1), { secret: '', query: '?t=wrong' }), E.env, E.ctx)).status, 403);
    await E.settle();
    assert.equal(E.obj.store.health(Date.now()).pending, 0); assert.equal(b.calls.length, 0);
    const h = await worker.fetch(new Request('https://relay.example.com/health', { headers: { 'x-telegram-bot-api-secret-token': 'wrong' } }), E.env, E.ctx);
    assert.equal(h.status, 403);
    const hq = await worker.fetch(new Request('https://relay.example.com/health?t=' + SECRET), E.env, E.ctx);
    assert.equal(hq.status, 403, 'سلامت فقط با سرآیند');
  });
  const N = makeEnv({ RELAY_TG_SECRET: '' });
  assert.equal((await worker.fetch(tgReq(upd(1, 1), { secret: '' }), N.env, N.ctx)).status, 503, 'بی رمز ورکر: ۵۰۳ تا تلگرام دوباره بفرستد');
});

test('مسیر کامل: ذخیره، ok فوری، تحویل با ?t=؛ رمز در ?t= (tgUseWebhook) و رمز قبلی در روز تعویض هم پذیرفته می‌شود', async () => {
  const E = makeEnv({ RELAY_TG_SECRET_PREV: 'old-secret-1111111111111' });
  await withBot([200], async (b) => {
    const r = await worker.fetch(tgReq(upd(100, 9)), E.env, E.ctx);
    assert.equal(r.status, 200);
    assert.equal(await (await worker.fetch(tgReq(upd(101, 9), { secret: '', query: '?t=' + SECRET }), E.env, E.ctx)).status, 200);
    assert.equal((await worker.fetch(tgReq(upd(102, 9), { secret: 'old-secret-1111111111111' }), E.env, E.ctx)).status, 200);
    await E.settle();
    assert.deepEqual(b.calls.map((c) => JSON.parse(c.body).update_id), [100, 101, 102]);
    assert.ok(b.calls.every((c) => c.url.origin + c.url.pathname === BOT && c.url.searchParams.get('t') === SECRET));
  });
});

test('ورکر: بات پایین، آپدیت‌ها می‌مانند و /health شمارها را درست می‌دهد', async () => {
  const E = makeEnv();
  let down = true;
  await withBot(() => (down ? 503 : 200), async (b) => {
    for (const id of [200, 201, 202]) assert.equal((await worker.fetch(tgReq(upd(id, 5)), E.env, E.ctx)).status, 200);
    assert.equal((await worker.fetch(tgReq(upd(201, 5)), E.env, E.ctx)).status, 200, 'تکراری هم ۲۰۰ می‌گیرد');
    await E.settle();
    const hdr = { 'x-telegram-bot-api-secret-token': SECRET };
    let h = await (await worker.fetch(new Request('https://relay.example.com/health', { headers: hdr }), E.env, E.ctx)).json();
    assert.equal(h.pending, 3); assert.equal(h.recovered_24h, 0); assert.equal(h.failed_24h, 0);
    assert.ok(h.oldest_age_s >= 0);
    assert.ok(E.ctxDo.storage.alarm > Date.now(), 'آلارم برای تلاش بعدی ست شده');
    assert.deepEqual(Object.keys(h).sort(), ['failed_24h', 'oldest_age_s', 'paused', 'pending', 'recovered_24h']);
    down = false;
    E.obj.store.setBreaker(0, 0); E.obj.store.wakeAll(Date.now());
    await E.obj.alarm();
    h = await (await worker.fetch(new Request('https://relay.example.com/health', { headers: hdr }), E.env, E.ctx)).json();
    assert.equal(h.pending, 0); assert.equal(h.recovered_24h, 3);
    const okIds = b.calls.filter((_, i) => i >= b.calls.length - 3).map((c) => JSON.parse(c.body).update_id);
    assert.deepEqual(okIds, [200, 201, 202]);
    assert.equal(E.ctxDo.storage.alarm, null, 'صف خالی، آلارم پاک');
  });
});

test('پینگ سلامت بات (tj_ping) ذخیره نمی‌شود و مستقیم با ?t= به بات می‌رود؛ { ping: 1 } فقط ۲۰۰', async () => {
  const E = makeEnv();
  await withBot([200], async (b) => {
    const r = await worker.fetch(tgReq({ update_id: -1, tj_ping: 123 }), E.env, E.ctx);
    assert.equal(r.status, 200);
    await E.settle();
    assert.equal(b.calls.length, 1); assert.equal(JSON.parse(b.calls[0].body).tj_ping, 123);
    assert.equal(b.calls[0].url.searchParams.get('t'), SECRET);
    assert.equal(E.obj.store.health(Date.now()).pending, 0);
    const p = await worker.fetch(tgReq({ ping: 1 }, { secret: '', query: '?t=' + SECRET }), E.env, E.ctx);
    assert.equal(p.status, 200);
    assert.equal((await worker.fetch(tgReq('not json'), E.env, E.ctx)).status, 400);
  });
});

test('توقف و ادامه از راه /pause و /resume', async () => {
  const E = makeEnv();
  const hdr = { 'x-telegram-bot-api-secret-token': SECRET };
  await withBot([200], async (b) => {
    assert.equal((await worker.fetch(new Request('https://relay.example.com/pause', { method: 'POST', headers: hdr }), E.env, E.ctx)).status, 200);
    await worker.fetch(tgReq(upd(300, 3)), E.env, E.ctx);
    await worker.fetch(tgReq({ update_id: -1, tj_ping: 1 }), E.env, E.ctx);
    await E.settle();
    assert.equal(b.calls.length, 0, 'در توقف نه آپدیت می‌رود نه پینگ');
    await worker.fetch(new Request('https://relay.example.com/resume', { method: 'POST', headers: hdr }), E.env, E.ctx);
    await E.settle();
    assert.deepEqual(b.calls.map((c) => JSON.parse(c.body).update_id), [300]);
  });
});

test('واتس‌اپ: تأیید متا با توکن از تنظیمات، رویداد ذخیره و با ?t= تحویل؛ رویداد تکراری یک بار', async () => {
  const E = makeEnv();
  const ok = await worker.fetch(new Request('https://relay.example.com/wa-test?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=abc'), E.env, E.ctx);
  assert.equal(ok.status, 200); assert.equal(await ok.text(), 'abc');
  const bad = await worker.fetch(new Request('https://relay.example.com/wa-test?hub.mode=subscribe&hub.verify_token=x&hub.challenge=abc'), E.env, E.ctx);
  assert.equal(bad.status, 403);
  const ev = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [{ from: '10000000001', text: { body: 'ساختگی' } }] } }] }] });
  await withBot([200], async (b) => {
    const post = () => worker.fetch(new Request('https://relay.example.com/wa-test', { method: 'POST', body: ev }), E.env, E.ctx);
    assert.equal((await post()).status, 200);
    assert.equal((await post()).status, 200);
    await E.settle();
    assert.equal(b.calls.length, 1); assert.equal(b.calls[0].body, ev);
    assert.equal(b.calls[0].url.searchParams.get('t'), SECRET);
  });
  const off = makeEnv({ RELAY_WA_PATH: '' });
  const r = await worker.fetch(new Request('https://relay.example.com/wa-test?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=abc'), off.env, off.ctx);
  assert.equal(r.status, 405, 'بی RELAY_WA_PATH مسیر واتس‌اپ نیست');
});

test('واتس‌اپ با رمز اپ: امضای غلط رد می‌شود', async () => {
  const E = makeEnv({ RELAY_WA_APP_SECRET: 'app-secret-test' });
  const ev = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const r = await worker.fetch(new Request('https://relay.example.com/wa-test', { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=00' }, body: ev }), E.env, E.ctx);
  assert.equal(r.status, 403);
  const { hmacHex } = await import('../src/core.js');
  await withBot([200], async () => {
    const good = await worker.fetch(new Request('https://relay.example.com/wa-test', { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=' + await hmacHex('app-secret-test', ev) }, body: ev }), E.env, E.ctx);
    assert.equal(good.status, 200);
    await E.settle();
  });
});
