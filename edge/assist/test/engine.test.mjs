// آزمون موتور و ورکر دستیار با دادهٔ ساختگی: node --test edge/assist/test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare, ask, tap, boot, scrub, isCrisis, nearTopics, siteEventsFrom } from '../src/engine.js';
import FAQ_DATA from '../../../content/assist/faq.json' with { type: 'json' };
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
    ['h1', S + '/help/insomnia/', 'بی‌خوابی', 'بی‌خوابی وقتی شب‌ها طول می‌کشد تا خوابتان ببرد و صبح خسته بیدار می‌شوید، با روان‌درمانی بهتر می‌شود. متن ساختگی.', 'تراپی و پذیرش', 'مراجع', 'سایت'],
    ['k1', S + '/therapy/child-therapy/', 'تراپی کودک', 'تراپی کودک در تجربه با بازی‌درمانی و گفت‌وگو با والدین انجام می‌شود. متن ساختگی.', 'تراپی و پذیرش', 'مراجع', 'سایت'],
    ['e1', S + '/ebis-playlist/', 'پلی‌لیستِ ابی', 'شروع تراپی بعد از نمایش پلی‌لیست ابی؛ فهرستی که با هم ادامه‌اش می‌دهیم. متن ساختگی کمپین.', '', '', 'سایت'],
    ['e2', S + '/ebis-playlist/night/', 'شب تجربه', 'هزینه جلسه و تراپی برای تماشاگران نمایش در شب تجربه. متن ساختگی کمپین.', '', '', 'سایت'],
    ['z1', S + '/ebis-playlist/talk/', 'گفت‌وگو', 'دربارهٔ خودکشی و امید در نمایش؛ کلینیک حضوری تجربه. متن ساختگی.', '', '', 'سایت'],
    ['x1', 'https://example.com/x', 'بیرونی', 'متن بیرونی که نباید پاسخ داده شود چون بیرون از سایت است. ساختگی.', '', '', 'سایت']
  ],
  events: [{ code: 'EV-T1', title: 'کارگاه نمونه', date: '۲۰ مهر', time: '۱۸:۰۰', iso: '2026-10-12' }],
  crisis: { words: ['خودکشی', 'به خودم آسیب', 'نمیخوام زنده باشم'], text: 'پیام ثابت ساختگی بحران ۱۲۳ ۱۱۵ ۱۴۸۰' },
  texts: { welcome: 'خوش‌آمد ساختگی', handed: 'تحویل ساختگی', bot: 'https://t.me/tajrobehlife_bot?start=pz-assist' }
};
const P = prepare(DATA, FAQ_DATA);
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
  const PK = prepare(DATA, { faq: [] });
  const r = ask(PK, 'هزینه جلسه چقدره؟', C);
  assert.equal(r.res.source, 'دانش'); assert.match(r.res.answer, /هزینه/); assert.ok(r.res.log_id); assert.ok(r.res.buttons.some((b) => b.id === 'y:' + r.res.log_id));
  assert.equal(r.log.src, 'دانش'); assert.equal(r.log.id, r.res.log_id);
});
test('ردیف مالی تأییدشده هم گفته نمی‌شود', () => {
  const r = ask(prepare(DATA, { faq: [] }), 'سهم درمانگر چقدر است', C);
  assert.equal(r.res.answer.indexOf('درصد'), -1);
});
test('متن سایت فقط از صفحه‌های help و مقاله، با «بیشتر بخوانید»؛ پرسش نامطمئن برای دسته‌بند جمنای علامت می‌خورد', () => {
  const r = ask(P, 'بی‌خوابی شب‌ها و صبح خسته', C);
  assert.equal(r.res.source, 'سایت'); assert.equal(r.res.source_url, S + '/help/insomnia/');
  assert.deepEqual(r.res.buttons[0], { url: S + '/help/insomnia/', text: 'بیشتر بخوانید' }); assert.ok(r.classify);
  assert.ok(!P.siteIx.items.some((x) => /child-therapy|clinic|school/.test(x.doc.url)), 'فقط help و مجله');
});
test('ابزار رویدادها از دادهٔ کش‌شده', () => {
  const r = ask(P, 'رویدادهای پیش رو', C);
  assert.equal(r.res.source, 'ابزار'); assert.match(r.res.answer, /کارگاه نمونه/); assert.match(r.res.buttons[0].url, /#ev=EV-T1$/);
});
/* ───── پرسش‌های پرتکرار (content/assist/faq.json) ───── */
const ABI = /(^|[\s«(])ابی([\s»)،.]|$)/;
test('چهار پرسش آزمون Cowork: همان id فایل و همان متن، بی کمپین و بحران', () => {
  const cases = [['هزینه جلسه چقدر است', 'price'], ['چطور تراپی را شروع کنم', 'start'], ['کلینیک حضوری تجربه کجاست', 'clinic'], ['مدرسه چه دوره‌هایی دارد', 'school_courses']];
  for (const [q, id] of cases) {
    const r = ask(P, q, C), f = FAQ_DATA.faq.find((x) => x.id === id);
    assert.equal(r.res.ref, id, q); assert.equal(r.res.answer, f.answer, 'متن عین فایل');
    assert.equal(r.res.buttons[0].url, f.links[0].url); assert.ok(!ABI.test(r.res.answer) && !/خودکشی/.test(r.res.answer));
  }
});
test('صفحه‌های کمپین کلاً بیرون؛ تکهٔ خودکشی هرگز', () => {
  for (const q of ['نمایش ابی', 'پلی‌لیست ابی شب تجربه', 'تماشاگران شب تجربه']) assert.doesNotMatch(ask(P, q, C).res.source_url, /ebis-playlist/, q);
  assert.ok(P.siteIx.items.every((x) => !/خودکشی/.test(x.doc.text) && !/ebis-playlist/.test(x.doc.url)));
  assert.equal(ask(P, 'به خودکشی فکر می‌کنم', C).res.answer, DATA.crisis.text);
});
test('مطمئن نبود: سه پرسش نزدیک از همین فایل و «با پذیرش حرف بزنم»؛ دکمه همان جواب فایل', () => {
  const r = ask(P, 'رنگ مورد علاقهٔ شما', C);
  assert.equal(r.res.ref, ''); assert.equal(r.res.buttons.filter((b) => /^f:/.test(b.id)).length, 3); assert.ok(r.res.buttons.some((b) => b.text === 'با پذیرش حرف بزنم'));
  assert.ok(r.classify && r.classify.q);
  const t = tap(P, 'f:clinic', 'کلینیک', C);
  assert.equal(t.res.answer, FAQ_DATA.faq.find((x) => x.id === 'clinic').answer); assert.equal(t.log.mode, 'منو'); assert.equal(t.res.ref, 'clinic');
});
test('رویدادها از تقویم صفحهٔ سایت: تاریخ شمسی، ویژهٔ اعضا وقتی برنامهٔ باز نیست', () => {
  const html = '<script type="application/json" id="evData">' + JSON.stringify({ months: [[1405, 7, '2026-09-23', 30]], events: [
    { i: 'old', d: '2026-09-30', t: '18:00', ttl: 'گذشته', a: 'free' }, { i: 'c1', d: '2026-10-14', t: '20:00', ttl: 'دورهٔ نمونه', a: 'members' }, { i: 'c2', d: '2026-10-21', t: '19:00', ttl: 'سوپرویژن نمونه', a: 'members' }] }) + '</script>';
  const L = siteEventsFrom(html, '2026-10-08', 60);
  assert.equal(L.length, 2); assert.equal(L[0].date, '۲۲ مهر'); assert.equal(L[0].time, '۲۰:۰۰'); assert.equal(L[0].members, true);
  const PE = prepare(Object.assign({}, DATA, { events: [], siteEvents: L }));
  const r = ask(PE, 'رویدادهای پیش رو', C);
  assert.match(r.res.answer, /ویژهٔ اعضای مدرسه/); assert.match(r.res.answer, /دورهٔ نمونه · ۲۲ مهر · ساعت ۲۰:۰۰/); assert.match(r.res.buttons[0].url, /#ev=c1$/);
  const PO = prepare(Object.assign({}, DATA, { siteEvents: L }));
  assert.match(ask(PO, 'رویدادهای پیش رو', C).res.answer, /^برنامه‌های پیش‌رو:\n• کارگاه نمونه/);
  const P0 = prepare(Object.assign({}, DATA, { events: [], siteEvents: [] }));
  const r0 = ask(P0, 'رویدادهای پیش رو', C);
  assert.doesNotMatch(r0.res.answer, /رویدادی نیست|تازه‌ای نیست/); assert.equal(r0.res.buttons[0].text, 'تقویم کامل مدرسه'); assert.equal(r0.res.buttons[0].url, S + '/school/events/');
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
  assert.equal(tap(P, 'y:A-abc12', '', C).res.answer, '', 'بازخورد پیام گفت‌وگو نمی‌سازد');
  const x = tap(P, 'x:A-abc12', 'هزینه چقدر', C); assert.equal(x.res.answer, ''); assert.equal(x.res.handoff, false);
  assert.ok(x.extra.some((e) => e.k === 'rate' && e.good === false) && x.extra.some((e) => e.k === 'un') && !x.extra.some((e) => e.k === 'handoff'));
  const h = tap(P, 'h', 'هزینه چقدر', C); assert.equal(h.res.handoff, true); assert.ok(h.extra.some((e) => e.k === 'handoff'));
});
test('شروع: جملهٔ کوتاه و چهار پرسش پرتکرار', () => {
  const b = boot(P); assert.equal(b.quick.length, 4);
  for (const q of b.quick) { const f = FAQ_DATA.faq.find((x) => x.id === q.id); assert.ok(f, q.id); assert.equal(q.text, f.question, 'متن دکمه دقیقاً question'); assert.equal(tap(P, 'f:' + q.id, q.text, C).res.ref, q.id, 'جواب مستقیم با id'); }
  assert.equal(b.faq.length, FAQ_DATA.faq.length); assert.ok(b.faq.every((x) => x.id && x.text)); assert.ok(b.privacy.length > 20); assert.equal(b.welcome, DATA.texts.welcome);
});
test('بی‌شناسه کردن پیش از جمنای', () => {
  const s = scrub('سلام من سارا هستم، دکتر Ahmadi گفت به ali@example.com یا ۰۹۱۲۱۲۳۴۵۶۷ پیام بدم');   // pii:ok ساختگی
  assert.ok(!/سارا|Ahmadi|example|\d{6,}/.test(s), s);
});
test('سرعت: هزار و صد تکه زیر ۵۰ میلی‌ثانیه', () => {
  const big = Object.assign({}, DATA, { idx: [] });
  for (let i = 0; i < 1100; i++) big.idx.push(['i' + i, S + '/p' + i + '/', 'برگهٔ ساختگی ' + i, 'متن ساختگی شماره ' + i + ' دربارهٔ جلسه، درمان، هزینه، دوره، رویداد و کلینیک برای آزمون سرعت جست‌وجو.', 'سایت', '', 'سایت']);
  const BP = prepare(big, FAQ_DATA), t0 = performance.now();
  for (let i = 0; i < 10; i++) ask(BP, 'دوره‌های کلینیک برای دانشجویان چیست', C);
  assert.ok((performance.now() - t0) / 10 < 50, 'ms=' + (performance.now() - t0) / 10);
  assert.equal(nearTopics(BP, 'هزینه').length, 3);
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
    assert.equal(r.status, 200); assert.equal(j.source, 'پرسش‌های پرتکرار'); assert.equal(j.ref, 'price'); assert.equal(r.headers.get('Access-Control-Allow-Origin'), S); assert.ok(Date.now() - t0 < 300);
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
    assert.equal(ok.status, 200); assert.equal((await ok.json()).ref, 'intro');
  } finally { globalThis.fetch = realFetch; }
});
test('ورکر: جمنای کند نمی‌گذارد پاسخ دیر شود (مهلت)', async () => {
  globalThis.fetch = async (u, o) => {
    if (String(u).indexOf('generativelanguage') > -1) return new Promise((res, rej) => { o.signal.addEventListener('abort', () => rej(new Error('abort'))); });
    return new Response('{"ok":true}');
  };
  try {
    const t0 = Date.now();
    const r = await worker.fetch(new Request('https://w.example.org/assist', { method: 'POST', headers: { Origin: S }, body: JSON.stringify({ session_id: 's-3', text: 'رنگ مورد علاقهٔ شما' }) }), env({ GEMINI_API_KEY: 'g' }), ctx());
    const j = await r.json(), ms = Date.now() - t0;
    assert.equal(j.ref, ''); assert.ok(ms < 2000, 'ms=' + ms);
  } finally { globalThis.fetch = realFetch; }
});
test('ورکر: جمنای فقط دسته‌بند (یک id یا none)، چرایش در server-timing، بی مقدار رمز', async () => {
  const Q = 'رنگ مورد علاقهٔ شما';
  const ask1 = async (e, gem, text) => {
    const seen = [];
    globalThis.fetch = async (u, o) => { if (String(u).indexOf('generativelanguage') > -1) { seen.push(JSON.parse(o.body)); return gem(); } return new Response('{"ok":true}'); };
    try {
      const c = ctx();
      const r = await worker.fetch(new Request('https://w.example.org/assist', { method: 'POST', headers: { Origin: S }, body: JSON.stringify({ session_id: 's-' + Math.random(), text: text || Q }) }), e, c);
      const out = { st: r.headers.get('server-timing'), j: await r.json(), seen }; await c.all(); return out;
    } finally { globalThis.fetch = realFetch; }
  };
  const said = (o) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] } }] }));
  let x = await ask1(env(), () => said({ id: 'clinic' }));
  assert.match(x.st, /gem;desc="nokey"/); assert.equal(x.seen.length, 0);
  x = await ask1(env({ GEMINI_API_KEY: 'g' }), () => new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT' } }), { status: 400 }));
  assert.match(x.st, /gem;desc="http400-INVALID_ARGUMENT"/); assert.equal(x.j.ref, '');
  /* ۵۰۳ مدل اول ← یک بار مدل دوم */
  const seenM = [];
  x = await ask1(env({ GEMINI_API_KEY: 'g' }), () => (seenM.push(1), seenM.length === 1 ? new Response('{"error":{"status":"UNAVAILABLE"}}', { status: 503 }) : said({ id: 'clinic' })), 'پرسش برای مدل دوم');
  assert.equal(seenM.length, 2); assert.match(x.st, /gem;desc="ok-clinic"/);
  /* id درست ← همان متن فایل؛ فهرست id و question به جمنای رفت، نه جواب‌ها */
  x = await ask1(env({ GEMINI_API_KEY: 'g' }), () => said({ id: 'clinic' }));
  assert.match(x.st, /gem;desc="ok-clinic"/); assert.match(x.st, /gemini/); assert.equal(x.j.ref, 'clinic');
  assert.equal(x.j.answer, FAQ_DATA.faq.find((f) => f.id === 'clinic').answer);
  const prompt = x.seen[0].contents[0].parts[0].text;
  assert.ok(prompt.indexOf('clinic: ') > -1 && prompt.indexOf(FAQ_DATA.faq[0].answer) < 0, 'جواب‌ها به جمنای نمی‌رود');
  /* id ساختگی یا none ← پاسخ پشتیبان */
  x = await ask1(env({ GEMINI_API_KEY: 'g' }), () => said({ id: 'ساختگی' }), 'پرسش دیگر نامرتبط');
  assert.match(x.st, /gem;desc="none"/); assert.equal(x.j.ref, '');
  /* پرسش مطمئن: جمنای صدا زده نمی‌شود */
  x = await ask1(env({ GEMINI_API_KEY: 'g' }), () => said({ id: 'clinic' }), 'هزینه جلسه چقدر است');
  assert.equal(x.seen.length, 0); assert.match(x.st, /gem;desc="na"/); assert.equal(x.j.ref, 'price');
  /* کش: همان پرسش دوباره، بی فراخوان */
  const e2 = env({ GEMINI_API_KEY: 'g' });
  await ask1(e2, () => said({ id: 'clinic' }), 'یک پرسش برای کش');
  x = await ask1(e2, () => said({ id: 'price' }), 'یک پرسش برای کش');
  assert.equal(x.seen.length, 0); assert.match(x.st, /gem;desc="cache-clinic"/);
  const h = await (await worker.fetch(new Request('https://w.example.org/assist/health'), env({ GEMINI_API_KEY: 'g' }), ctx())).json();
  assert.ok('gem_last' in h); assert.equal(h.faq, FAQ_DATA.faq.length); assert.equal(JSON.stringify(h).indexOf('"g"'), -1);
});
test('ورکر: مسیر دامنهٔ سایت (/api/assist) و گزارش جدای «وصل نشد»', async () => {
  const sent = []; globalThis.fetch = async (u, o) => { if (o && o.body) sent.push(JSON.parse(o.body)); return new Response('{"ok":true}'); };
  try {
    const c = ctx();
    const r = await worker.fetch(new Request('https://tajrobeh.life/api/assist', { method: 'POST', headers: { Origin: S }, body: JSON.stringify({ session_id: 's-api', text: 'هزینه جلسه چقدر است', miss: 2 }) }), env(), c);
    const j = await r.json(); await c.all();
    assert.equal(r.status, 200); assert.equal(j.ref, 'price');
    const logs = sent.filter((b) => b.action === 'as_log').flatMap((b) => b.entries);
    assert.ok(logs.some((e) => e.k === 'log' && e.res === 'وصل نشد ×2'), JSON.stringify(logs));
    assert.ok(logs.some((e) => e.k === 'log' && e.res === 'پاسخ'));
    const b = await worker.fetch(new Request('https://tajrobeh.life/api/assist/boot', { headers: { Origin: S } }), env(), ctx());
    assert.equal(b.status, 200); assert.equal((await b.json()).ok, true);
  } finally { globalThis.fetch = realFetch; }
});
test('ورکر: شروع و سلامت', async () => {
  const b = await (await worker.fetch(new Request('https://w.example.org/assist/boot', { headers: { Origin: S } }), env(), ctx())).json();
  assert.equal(b.quick.length, 4);
  const h = await (await worker.fetch(new Request('https://w.example.org/assist/health'), env(), ctx())).json();
  assert.equal(h.v, 'v-test'); assert.equal(h.kb, 2); assert.equal(h.gemini, false); assert.equal(h.rewrite, true);
  const hg = await (await worker.fetch(new Request('https://w.example.org/assist/health'), env({ GEMINI_API_KEY: 'g' }), ctx())).json();
  assert.equal(hg.gemini, true); assert.equal(JSON.stringify(hg).indexOf('"g"'), -1);
});
