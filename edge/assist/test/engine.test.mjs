// آزمون موتور و ورکر دستیار با دادهٔ ساختگی: node --test edge/assist/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare, ask, tap, boot, scrub, safeOut, applyCompose, isCrisis, nearTopics } from '../src/engine.js';
import worker from '../src/index.js';

const S = 'https://tajrobeh.life';
const DATA = {
  v: 'v-test', at: '2026-10-08 10:00', on: true, tools: true, rewrite: true, gem_daily: 100, min: 0.6, idx_min: 0.5,
  kb: [
    { r: 2, t: 'هزینه', s: ['هزینه جلسه چقدر است', 'قیمت جلسه'], a: 'پاسخ تأییدشدهٔ ساختگی دربارهٔ هزینه.', au: 'مراجع', d: 'تراپی و پذیرش' },
    { r: 3, t: 'معارفه', s: ['جلسه معارفه چیست'], a: 'معارفه رایگان است؛ پاسخ ساختگی.', au: '', d: 'تراپی و پذیرش' },
    { r: 4, t: 'همکاری', s: ['سهم درمانگر چقدر است'], a: 'درصد سهم درمانگر ساختگی', au: '', d: '' }
  ],
  topics: ['هزینه', 'معارفه'],
  idx: [
    ['c1', S + '/clinic/', 'کلینیک حضوری', 'کلینیک حضوری تجربه در تهران است و جلسه‌های حضوری با هماهنگی پذیرش برگزار می‌شود. متن ساختگی.', 'حضوری', 'مراجع', 'سایت'],
    ['s1', S + '/school/', 'مدرسهٔ تجربه', 'دوره‌های مدرسهٔ تجربه برای دانشجویان روان‌شناسی با سوپرویژن گروهی برگزار می‌شود. متن ساختگی.', 'مدرسه و دوره‌ها', 'دانشجو', 'سایت'],
    ['m1', S + '/joinus/', 'همکاری', 'درصد سهم درمانگر و زمان تسویه در قرارداد همکاری آمده است. متن ساختگی.', '', '', 'سایت'],
    ['g1', S + '/mag/anxiety/', 'اضطراب در روابط › مقدمه', 'اضطراب در روابط نزدیک یکی از تجربه‌های رایج است و این مقاله دربارهٔ آن است. متن ساختگی.', 'مجله', 'خوانندهٔ مجله', 'مجله'],
    ['x1', 'https://example.com/x', 'بیرونی', 'متن بیرونی که نباید پاسخ داده شود چون بیرون از سایت است. ساختگی.', '', '', 'سایت']
  ],
  events: [{ code: 'EV-T1', title: 'کارگاه نمونه', date: '۲۰ مهر', time: '۱۸:۰۰', iso: '2026-10-12' }],
  crisis: { words: ['خودکشی', 'به خودم آسیب', 'نمیخوام زنده باشم'], text: 'پیام ثابت ساختگی بحران ۱۲۳ ۱۱۵ ۱۴۸۰' },
  texts: { welcome: 'خوش‌آمد ساختگی', handed: 'تحویل ساختگی', bot: 'https://t.me/tajrobehlife_bot?start=pz-assist' }
};
const P = prepare(DATA);
const C = { channel: 'site', audience: 'مراجع', today: '2026-10-08' };

test('بحران اول، پیام ثابت، بی دکمه، بی تحویل؛ گزارش بی متن', () => {
  const r = ask(P, 'دیگه نمیخوام زنده باشم', C);
  assert.equal(r.res.answer, DATA.crisis.text); assert.equal(r.res.buttons.length, 0); assert.equal(r.res.handoff, false); assert.equal(r.res.source, '');
  assert.equal(r.compose, undefined); assert.equal(JSON.stringify(r.log).indexOf('زنده'), -1);
});
test('جمله‌های کلی بحران نیستند', () => {
  for (const s of ['نمی‌خواهم زندگی‌ام خراب شود', 'الهی بمیرم برات', 'قرص خوردم و خوابیدم']) assert.equal(isCrisis(s, DATA.crisis.words), false, s);
});
test('دانش تأییدشده با دکمه‌های رضایت', () => {
  const r = ask(P, 'هزینه جلسه چقدره؟', C);
  assert.equal(r.res.source, 'دانش'); assert.match(r.res.answer, /هزینه/); assert.ok(r.res.log_id); assert.ok(r.res.buttons.some((b) => b.id === 'y:' + r.res.log_id));
  assert.equal(r.log.src, 'دانش'); assert.equal(r.log.id, r.res.log_id);
});
test('ردیف مالی تأییدشده هم گفته نمی‌شود', () => {
  const r = ask(P, 'سهم درمانگر چقدر است', C);
  assert.equal(r.res.answer.indexOf('درصد'), -1);
});
test('متن منتشرشدهٔ سایت با «بیشتر بخوانید» و source_url', () => {
  const r = ask(P, 'کلینیک حضوری کجاست؟', C);
  assert.equal(r.res.source, 'سایت'); assert.equal(r.res.source_url, S + '/clinic/');
  assert.deepEqual(r.res.buttons[0], { url: S + '/clinic/', text: 'بیشتر بخوانید' }); assert.ok(r.compose);
});
test('ابزار رویدادها از دادهٔ کش‌شده', () => {
  const r = ask(P, 'رویدادهای پیش رو', C);
  assert.equal(r.res.source, 'ابزار'); assert.match(r.res.answer, /کارگاه نمونه/); assert.match(r.res.buttons[0].url, /#ev=EV-T1$/);
});
test('ابزار مجله از عنوان مقاله‌ها', () => {
  const r = ask(P, 'مقاله‌ای درباره اضطراب در روابط', C);
  assert.match(r.res.answer, /اضطراب در روابط/); assert.equal(r.res.buttons[0].url, S + '/mag/anxiety/');
});
test('وضعیت من فقط در تلگرام', () => {
  const r = ask(P, 'وضعیت درخواستم چی شد', C);
  assert.equal(r.res.buttons[0].text, 'ادامه در تلگرام');
});
test('بی‌پاسخ: سه موضوع نزدیک و «با پذیرش حرف بزنم»، متن پاک‌شده', () => {
  const r = ask(P, 'خانم نمونه‌پور گفت با ۰۹۱۲۱۲۳۴۵۶۷ هماهنگ کنم درباره پارکینگ', C);   // pii:ok ساختگی
  assert.equal(r.res.buttons.slice(-1)[0].id, 'h'); assert.ok(r.res.buttons.length >= 2);
  assert.equal(r.un.text.indexOf('نمونه‌پور'), -1); assert.ok(!/\d{6,}/.test(r.un.text));
});
test('دکمه‌ها: موضوع، پرسش، رضایت، تحویل', () => {
  assert.match(tap(P, 't:0', '', C).res.answer, /هزینه/);
  const q = tap(P, 'q:3', '', C); assert.equal(q.res.source, 'دانش'); assert.match(q.res.answer, /معارفه/);
  assert.deepEqual(tap(P, 'y:A-abc12', '', C).extra, [{ k: 'rate', id: 'A-abc12', good: true }]);
  const h = tap(P, 'x:A-abc12', 'هزینه چقدر', C); assert.equal(h.res.handoff, true); assert.ok(h.extra.some((e) => e.k === 'handoff') && h.extra.some((e) => e.k === 'un'));
});
test('شروع: جملهٔ کوتاه و چهار پرسش پرتکرار', () => {
  const b = boot(P); assert.equal(b.quick.length, 4); assert.ok(b.privacy.length > 20); assert.equal(b.welcome, DATA.texts.welcome);
});
test('بی‌شناسه کردن پیش از جمنای', () => {
  const s = scrub('سلام من سارا هستم، دکتر Ahmadi گفت به ali@example.com یا ۰۹۱۲۱۲۳۴۵۶۷ پیام بدم');   // pii:ok ساختگی
  assert.ok(!/سارا|Ahmadi|example|\d{6,}/.test(s), s);
});
test('گارد خروجی جمنای: عدد تازه، حرف از «متن‌ها» و خط تیرهٔ بلند رد می‌شوند', () => {
  const src = 'دوره‌های مدرسه برای دانشجویان با سوپرویژن گروهی است.';
  assert.equal(safeOut('دوره‌ها برای دانشجویان با سوپرویژن گروهی است.', src), true);
  assert.equal(safeOut('دوره‌ها ۱۲ جلسه است.', src), false);
  assert.equal(safeOut('دوره‌ها در متن‌ها به طور مستقیم توضیح داده نشده‌اند.', src), false);
  const c = { top: [{ url: S + '/school/', title: 'مدرسه', text: src }] };
  const base = { answer: src, buttons: [{ url: S + '/school/', text: 'بیشتر بخوانید' }, { id: 'y:A-1', text: '👍' }], source_url: S + '/school/' };
  assert.equal(applyCompose(base, c, { text: 'دوره‌ها ۱۲ جلسه است.', i: 0, none: false }).answer, src);
  assert.equal(applyCompose(base, c, { text: 'دوره‌ها برای دانشجویان با سوپرویژن گروهی است.', i: 0, none: false }).answer, 'دوره‌ها برای دانشجویان با سوپرویژن گروهی است.');
});
test('سرعت: هزار و صد تکه زیر ۵۰ میلی‌ثانیه', () => {
  const big = Object.assign({}, DATA, { idx: [] });
  for (let i = 0; i < 1100; i++) big.idx.push(['i' + i, S + '/p' + i + '/', 'برگهٔ ساختگی ' + i, 'متن ساختگی شماره ' + i + ' دربارهٔ جلسه، درمان، هزینه، دوره، رویداد و کلینیک برای آزمون سرعت جست‌وجو.', 'سایت', '', 'سایت']);
  const BP = prepare(big), t0 = performance.now();
  for (let i = 0; i < 10; i++) ask(BP, 'دوره‌های کلینیک برای دانشجویان چیست', C);
  assert.ok((performance.now() - t0) / 10 < 50, 'ms=' + (performance.now() - t0) / 10);
  assert.equal(nearTopics(BP, 'هزینه').length, 2);
});

/* ───── ورکر با KV و fetch ساختگی ───── */
const TEST_SECRET = globalThis.crypto.randomUUID();   /* رمز ساختگی همان لحظه، نه رشتهٔ ثابت در مخزن */
function env(extra) {
  const store = new Map([['dump', JSON.stringify({ at: Date.now(), data: DATA })]]);
  return Object.assign({ BOT_URL: 'https://bot.example.org/exec', BOT_KEY: 'k', LEAD_SECRET: TEST_SECRET,
    KV: { get: async (k, t) => { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); } } }, extra || {});
}
function ctx() { const w = []; return { waitUntil: (p) => w.push(p), all: () => Promise.all(w) }; }
const realFetch = globalThis.fetch;
test('ورکر: مبدأ سایت، پاسخ سریع، گزارش در پس‌زمینه، CORS', async () => {
  const sent = []; globalThis.fetch = async (u, o) => { sent.push(JSON.parse(o.body)); return new Response('{"ok":true,"data":{"n":1}}'); };
  try {
    const c = ctx(), t0 = Date.now();
    const r = await worker.fetch(new Request('https://w.example.org/assist', { method: 'POST', headers: { Origin: S, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'assist.ask', session_id: 's-1', text: 'هزینه جلسه چقدر است' }) }), env(), c);
    const j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.source, 'دانش'); assert.equal(r.headers.get('Access-Control-Allow-Origin'), S); assert.ok(Date.now() - t0 < 300);
    await c.all();
    assert.equal(sent[0].action, 'as_log'); assert.equal(sent[0].entries[0].id, j.log_id); assert.equal(JSON.stringify(sent).indexOf('هزینه جلسه چقدر'), -1);
  } finally { globalThis.fetch = realFetch; }
});
test('ورکر: مبدأ بیگانه بی امضا رد می‌شود، با امضای درست پذیرفته', async () => {
  globalThis.fetch = async () => new Response('{"ok":true}');
  try {
    const body = JSON.stringify({ action: 'assist.ask', channel: 'v2', session_id: 's-2', text: 'جلسه معارفه چیست' });
    const bad = await worker.fetch(new Request('https://w.example.org/assist', { method: 'POST', headers: { Origin: 'https://evil.example.org' }, body }), env(), ctx());
    assert.equal(bad.status, 403);
    const ts = String(Math.floor(Date.now() / 1000)), { createHmac } = await import('node:crypto');
    const sig = createHmac('sha256', TEST_SECRET).update(ts + '.' + body).digest('hex');
    const ok = await worker.fetch(new Request('https://w.example.org/assist', { method: 'POST', headers: { 'X-Tj-Ts': ts, 'X-Tj-Sig': sig }, body }), env(), ctx());
    assert.equal(ok.status, 200); assert.equal((await ok.json()).source, 'دانش');
  } finally { globalThis.fetch = realFetch; }
});
test('ورکر: جمنای کند نمی‌گذارد پاسخ دیر شود (مهلت)', async () => {
  globalThis.fetch = async (u, o) => {
    if (String(u).indexOf('generativelanguage') > -1) return new Promise((res, rej) => { o.signal.addEventListener('abort', () => rej(new Error('abort'))); });
    return new Response('{"ok":true}');
  };
  try {
    const t0 = Date.now();
    const r = await worker.fetch(new Request('https://w.example.org/assist', { method: 'POST', headers: { Origin: S }, body: JSON.stringify({ session_id: 's-3', text: 'کلینیک حضوری کجاست' }) }), env({ GEMINI_API_KEY: 'g' }), ctx());
    const j = await r.json(), ms = Date.now() - t0;
    assert.equal(j.source, 'سایت'); assert.ok(ms < 3200, 'ms=' + ms);
  } finally { globalThis.fetch = realFetch; }
});
test('ورکر: شروع و سلامت', async () => {
  const b = await (await worker.fetch(new Request('https://w.example.org/assist/boot', { headers: { Origin: S } }), env(), ctx())).json();
  assert.equal(b.quick.length, 4);
  const h = await (await worker.fetch(new Request('https://w.example.org/assist/health'), env(), ctx())).json();
  assert.equal(h.v, 'v-test'); assert.equal(h.kb, 2);
});
