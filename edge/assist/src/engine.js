// موتور پاسخ دستیار تجربه در لبه (ورکر کلادفلر). بی وابستگی به محیط ورکر تا در node آزموده شود.
// همان منطق bot/assist.gs (v170.23.19): بحران اول، ابزارها، دانش تأییدشده، بعد نمایهٔ منتشرشدهٔ سایت.
// داده (data) همان خروجی اکشن درگاه as_dump بات است: {kb, topics, idx, events, crisis, texts, deny, money, min, idx_min, tools, rewrite, on, mode}.

export const SITE = 'https://tajrobeh.life';
export const PRIVACY = 'اطلاعات کاربر فقط در اختیار مسئول مربوطه در مرکز تجربه زندگی قرار می‌گیرد و بدون رضایت او منتشر یا با کسی به اشتراک گذاشته نمی‌شود.';
const HANDOFF_BTN = { id: 'h', text: 'با پذیرش حرف بزنم' };
const FALLBACK_TEXT = 'جواب دقیقی برای این پیدا نکردم. شاید یکی از این موضوع‌ها باشد، یا مستقیم با پذیرش حرف بزن.';
/* پیام ثابت بحران، اگر داده هنوز نرسیده باشد (همان T_CRISIS بات) */
const CRISIS_TEXT = 'تجربه خدمات بحران و اورژانس ندارد. اگر در خطر فوری هستید یا به آسیب زدن به خودتان فکر می‌کنید، همین حالا تماس بگیرید:\n\n' +
  '☎️ اورژانس اجتماعی: ۱۲۳\n☎️ اورژانس پزشکی: ۱۱۵\n☎️ صدای مشاور بهزیستی: ۱۴۸۰\n\nخارج از ایران: شمارهٔ اورژانس همان کشور.';
const CRISIS_WORDS = ['خودکشی', 'خودزنی', 'به خودم آسیب', 'رگ زدم', 'رگمو بزنم', 'رگم را بزنم', 'بکشم خودمو', 'خودمو بکشم', 'خودم را بکشم', 'خودم رو بکشم',
  'می خواهم بمیرم', 'میخواهم بمیرم', 'می خوام بمیرم', 'میخوام بمیرم', 'نمی خواهم زنده باشم', 'نمیخواهم زنده باشم', 'نمی خوام زنده باشم', 'نمیخوام زنده باشم',
  'نمی خوام زنده بمونم', 'نمیخوام زنده بمونم', 'زندگیمو تموم کنم', 'زندگیم را تمام کنم', 'به زندگیم پایان بدم', 'به زندگیم پایان بدهم', 'قرص زیادی خوردم',
  'suicide', 'kill myself', 'end my life', 'self harm'];

/* ───── یکسان‌سازی ───── */
export function latin(s) { return String(s || '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
export function fa(n) { return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]); }
/* همان tgNorm_ بات (برای بحران) */
export function crisisNorm(s) {
  return latin(s).replace(/[يی]/g, 'ی').replace(/[كک]/g, 'ک').replace(/[​-‏﻿]/g, ' ')
    .replace(/[ً-ْـ]/g, '').replace(/[^؀-ۿ\w\s]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
}
export function isCrisis(text, words) {
  const t = crisisNorm(text), L = words && words.length ? words : CRISIS_WORDS;
  return L.some((w) => { const n = crisisNorm(w); return n && t.indexOf(n) > -1; });
}
/* همان asNorm_، asStem_ و asTokens_ بات */
const STOP = ('از به با در بر که این آن اون را رو و یا تا برای چه چی چرا چطور چطوری چگونه چجوری آیا من ما شما تو او اون‌ها هست است هستم هستید بود شد شود میشه میشود می‌شود ' +
  'کنم کنید کنیم کرد کردم کن کنه یک یه هم اگر ولی اما خیلی لطفا لطفاً سلام ممنون مرسی باید دارم دارید داره دارد بله نه کجا کی کدام کدوم چند همین همان چیزی ' +
  'خوب خوبه میخوام میخواهم خواهم خواستم بخوام بدونم دونم بگید بگین بگویید توی تو دیگه دیگر هر همه وقتی اینکه آنکه بی های ها ای ام ' +
  /* واژه‌های پرسشی گفتاری (لبه): «چقدره» و «چیه» نباید وزن واژهٔ ناشناخته بگیرند */
  'چقدر چقدره چنده چیه چیست چیس کجاست کجان کیه کیست هستش میشه چطوریه چجوریه').split(/\s+/);
export function norm(s) {
  s = latin(s).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ة/g, 'ه').replace(/[أإآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ی');
  s = s.replace(/[ً-ٰٟـ]/g, '').replace(/‌/g, '').toLowerCase();
  return s.replace(/[؟،؛٪«»٫٬]/g, ' ').replace(/[^؀-ۿa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const STOP_SET = new Set(STOP.map(norm));
export function stem(t) {
  if (t.length > 4 && /^(نمی|می)/.test(t)) t = t.replace(/^(نمی|می)/, '');
  for (const suf of ['هایی', 'های', 'ها', 'ترین', 'تر', 'یی', 'ای', 'ام', 'ات', 'اش', 'یم', 'ید', 'ند', 'ی']) if (t.length - suf.length >= 3 && t.endsWith(suf)) return t.slice(0, -suf.length);
  return t;
}
export function tokens(s) {
  const out = [], seen = new Set();
  for (const w of norm(s).split(' ')) { if (!w || STOP_SET.has(w) || w.length < 2) continue; const t = stem(w); if (!seen.has(t)) { seen.add(t); out.push(t); } }
  return out;
}

/* ───── جست‌وجو (همان asSearch_: وزن log(1 + N/df)، بهترین نمونهٔ هر ردیف) ───── */
export function buildIndex(items) {
  const docs = [];
  items.forEach((k, i) => {
    const tt = tokens(k.topic || ''), list = k.samples && k.samples.length ? k.samples : [''];
    for (const s of list) docs.push({ i, set: new Set(tt.concat(tokens(s))) });
  });
  const df = new Map();
  for (const d of docs) for (const t of d.set) df.set(t, (df.get(t) || 0) + 1);
  return { items, docs, df, N: docs.length };
}
export function search(text, ix) {
  const q = tokens(text); if (!q.length || !ix || !ix.N) return [];
  const w = (t) => Math.log(1 + ix.N / (ix.df.get(t) || 0.5));
  const tot = q.reduce((a, t) => a + w(t), 0), best = new Map();
  for (const d of ix.docs) {
    let hit = 0; for (const t of q) if (d.set.has(t)) hit += w(t);
    const sc = tot ? hit / tot : 0;
    if (sc > (best.get(d.i) || 0)) best.set(d.i, sc);
  }
  return [...best.entries()].map(([i, s]) => ({ k: ix.items[i], score: Math.round(s * 1000) / 1000 })).sort((a, b) => b.score - a.score);
}

/* ───── آماده‌سازی داده (یک بار برای هر نسخهٔ داده) ───── */
export function prepare(data) {
  data = data || {};
  const deny = safeRe(data.deny, /درصد|سهم درمانگر|کمیسیون|تسویه|قرارداد همکاری|شرایط قرارداد/);
  const money = safeRe(data.money, /درصد سهم|تسویه|کمیسیون|قرارداد/);
  const kb = (data.kb || []).filter((k) => k && k.a && !deny.test((k.t || '') + ' ' + k.a))
    .map((k) => ({ row: k.r, topic: String(k.t || 'عمومی'), samples: (k.s || []).map(String).filter(Boolean), answer: String(k.a), aud: String(k.au || ''), dom: String(k.d || '') }));
  const idx = (data.idx || []).map((r) => ({ id: r[0], url: String(r[1] || ''), title: String(r[2] || ''), text: String(r[3] || ''), dom: String(r[4] || ''), aud: String(r[5] || ''), src: String(r[6] || 'سایت') }))
    .filter((d) => d.url.indexOf(SITE + '/') === 0 && d.text.length >= 30 && !money.test(d.title + ' ' + d.text) && !deny.test(d.title + ' ' + d.text));
  const site = idx.filter((d) => d.src !== 'مجله'), mag = idx.filter((d) => d.src === 'مجله');
  const topics = (data.topics && data.topics.length ? data.topics : [...new Set(kb.map((k) => k.topic))]).slice(0, 12);
  return {
    raw: data, kb, topics, deny, money,
    kbIx: buildIndex(kb),
    siteIx: buildIndex(site.map((d) => ({ topic: d.title, samples: [d.text], doc: d }))),
    magIx: buildIndex(mag.map((d) => ({ topic: d.title.split(' › ')[0], samples: [], doc: d }))),
    events: (data.events || []),
    crisisWords: data.crisis && data.crisis.words && data.crisis.words.length ? data.crisis.words : CRISIS_WORDS,
    crisisText: data.crisis && data.crisis.text ? data.crisis.text : CRISIS_TEXT,
    texts: Object.assign({ welcome: 'سلام، من دستیار تجربه هستم. سؤالت را بپرس یا یکی از موضوع‌ها را انتخاب کن.', handed: 'پیامت به پذیرش رسید. همکارم در پذیرش همین‌جا جواب می‌دهد.', bot: 'https://t.me/tajrobehlife_bot?start=pz-assist' }, data.texts || {}),
    min: num(data.min, 0.6), idxMin: num(data.idx_min, 0.5), tools: data.tools !== false, rewrite: data.rewrite === true, on: data.on !== false, gemDaily: num(data.gem_daily, 100)
  };
}
function safeRe(src, d) { try { return src ? new RegExp(src) : d; } catch (e) { return d; } }
function num(v, d) { const n = Number(v); return n > 0 ? n : d; }

/* ───── پرسش‌های شروع (۳ تا ۴ دکمه، بی تایپ) ───── */
export const QUICK = [
  { text: 'هزینهٔ جلسه چقدر است؟', q: 'هزینه جلسه چقدر است' },
  { text: 'چطور درمان را شروع کنم؟', q: 'چطور تراپی را شروع کنم' },
  { text: 'جلسهٔ معارفه چیست؟', q: 'جلسه معارفه چیست' },
  { text: 'رویدادهای پیش رو', q: 'رویدادهای پیش رو' }
];
export function boot(P) {
  return { ok: true, welcome: P.texts.welcome, quick: QUICK.map((x) => ({ text: x.text, q: x.q })), topics: P.topics.slice(0, 6), privacy: PRIVACY, bot: P.texts.bot, on: P.on };
}

/* ───── پاسخ ───── */
const TOOL_EVENTS = /رویداد|کارگاه|وبینار|ایونت|دورهمی|برنامه(?:های)? پیش ?رو|جلسه(?:ی)? عمومی/;
const TOOL_MAG = /مجله|مقاله|مطلبی? (?:درباره|دربارهٔ|در مورد)|چیزی بخونم|چیزی بخوانم/;
const TOOL_STATUS = /وضعیت (?:درخواست|پرونده)م|وضعیتم|وضعیت من|درخواستم چی شد|درخواستم کجاست|کی (?:با من |باهام )?تماس میگیر|پیگیری درخواست/;
const MAG_DROP = /مجله|مقاله(?:ای)?|مطلبی?|نوشته|درباره|دربارهٔ|در مورد|چیزی|بخونم|بخوانم|دارید|هست|می ?خوام|میخواهم|برام|بفرست/g;

export function newLogId(now) { return 'A-' + Math.floor(now || Date.now()).toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0'); }
function out(o) { return Object.assign({ ok: true, answer: '', topic: '', handoff: false, buttons: [], log_id: '', source: '', source_url: '' }, o); }
function rateBtns(id) { return [{ id: 'x:' + id, text: 'جوابم را نگرفتم' }, { id: 'y:' + id, text: '👍' }, { id: 'n:' + id, text: '👎' }]; }
function topicBtns(P, list) { return list.slice(0, 3).map((t) => ({ id: 't:' + P.topics.indexOf(t), text: t })).filter((b) => !/:-1$/.test(b.id)); }
/* سه موضوع نزدیک از جست‌وجوی سبک، برای بی‌پاسخ (و برای بازگشت ۴ ثانیه‌ای ویجت) */
export function nearTopics(P, text) {
  const seen = new Set(), near = [];
  for (const r of search(text, P.kbIx)) { if (!seen.has(r.k.topic) && near.length < 3) { seen.add(r.k.topic); near.push(r.k.topic); } }
  for (const t of P.topics) { if (!seen.has(t) && near.length < 3) { seen.add(t); near.push(t); } }
  return near;
}
function audBoost(res, aud) {
  if (res.length < 2) return res;
  const mine = (k) => !k.aud || k.aud.indexOf(aud) > -1 || (aud === 'کاربر عمومی' && /مراجع|عمومی/.test(k.aud));
  for (const r of res) if (mine(r.k)) r.score = Math.min(1, r.score + 0.05);
  return res.sort((a, b) => b.score - a.score);
}
function excerpt(t) { return t.length > 360 ? t.slice(0, 360).replace(/\s+\S*$/, '') + '…' : t; }

/**
 * پرسش آزاد. خروجی {res, log, compose?}: res پاسخ قرارداد assist.ask، log مورد گزارش برای بات (بی متن پرسش، جز بی‌پاسخ پاک‌شده)،
 * compose (اختیاری) یعنی پاسخ از سایت است و می‌شود با جمنای کوتاه و روانش کرد؛ ورکر خودش با مهلت تصمیم می‌گیرد.
 */
export function ask(P, text, ctx) {
  ctx = ctx || {};
  text = String(text || '').trim().slice(0, 500);
  const ch = ctx.channel || 'site', aud = ctx.audience || 'کاربر عمومی', id = newLogId(ctx.now);
  if (!text) return { res: out({ answer: P.texts.welcome, buttons: topicBtns(P, P.topics).concat([HANDOFF_BTN]) }) };
  /* بحران همیشه اول، بی هیچ سرویس بیرونی؛ گزارش فقط شمار، بی متن */
  if (isCrisis(text, P.crisisWords)) return { res: out({ answer: P.crisisText, topic: 'بحران' }), log: { k: 'log', ch, id, topic: 'بحران', res: 'بحران', au: aud } };
  if (!P.on) return { res: out({ ok: false, error: 'off' }) };
  const n = norm(text);
  if (TOOL_STATUS.test(n) || TOOL_STATUS.test(text))
    return { res: out({ answer: 'برای دیدن وضعیت درخواستت، در بات تجربه ادامه بده.', topic: 'وضعیت من', buttons: [{ url: P.texts.bot, text: 'ادامه در تلگرام' }], source: 'ابزار', log_id: id }), log: { k: 'log', ch, id, topic: 'ابزار status', res: 'ابزار', src: 'ابزار', au: aud } };
  if (P.tools && (TOOL_EVENTS.test(n) || TOOL_EVENTS.test(text))) return toolEvents(P, ctx, id, ch, aud);
  if (P.tools && (TOOL_MAG.test(n) || TOOL_MAG.test(text))) return toolMag(P, text, id, ch, aud);
  /* دانش تأییدشده */
  const res = audBoost(search(text, P.kbIx), aud), top = res[0];
  if (top && top.score >= P.min) {
    return { res: out({ answer: top.k.answer, topic: top.k.topic, buttons: rateBtns(id), log_id: id, source: 'دانش' }), log: { k: 'log', ch, id, topic: top.k.topic, res: 'پاسخ', src: 'دانش', au: aud } };
  }
  /* متن منتشرشدهٔ سایت و رویدادهای پیش‌رو */
  const site = siteAnswer(P, text);
  if (site) {
    const d = site.top[0];
    return {
      res: out({ answer: excerpt(d.text), topic: d.dom || 'سایت', log_id: id, source: 'سایت', source_url: d.url, buttons: [{ url: d.url, text: 'بیشتر بخوانید' }].concat(rateBtns(id)) }),
      log: { k: 'log', ch, id, topic: d.dom || 'سایت', res: 'پاسخ', src: 'سایت', au: aud },
      compose: { q: scrub(text), top: site.top }
    };
  }
  return {
    res: out({ answer: FALLBACK_TEXT, buttons: topicBtns(P, nearTopics(P, text)).concat([HANDOFF_BTN]) }),
    log: { k: 'log', ch, id, topic: '', res: 'بی‌پاسخ', au: aud },
    un: { k: 'un', ch, text: scrub(text), kind: 'بی‌پاسخ', au: aud }
  };
}
function siteAnswer(P, text) {
  const evDocs = (P.events || []).map((e) => ({ topic: e.title, samples: [[e.title, e.date, e.time ? 'ساعت ' + e.time : ''].filter(Boolean).join(' · ')],
    doc: { url: SITE + '/school/events/#ev=' + encodeURIComponent(e.code), title: e.title, text: [e.title, e.date, e.time ? 'ساعت ' + e.time : ''].filter(Boolean).join(' · '), dom: 'رویدادها', src: 'رویداد' } }));
  const hits = search(text, P.siteIx).concat(evDocs.length ? search(text, buildIndex(evDocs)) : []).filter((r) => r.score >= P.idxMin).sort((a, b) => b.score - a.score).slice(0, 3);
  return hits.length ? { top: hits.map((r) => r.k.doc) } : null;
}
function toolEvents(P, ctx, id, ch, aud) {
  const today = ctx.today || new Date(Date.now() + 3.5 * 3600000).toISOString().slice(0, 10);
  const L = (P.events || []).filter((e) => e.iso && e.iso >= today).slice(0, 3);
  const log = { k: 'log', ch, id, topic: 'ابزار events', res: 'ابزار', src: 'ابزار', au: aud };
  if (!L.length) return { res: out({ answer: 'فعلاً رویداد تازه‌ای در برنامه نیست. صفحهٔ رویدادها را ببین.', topic: 'رویدادها', source: 'ابزار', log_id: id, buttons: [{ url: SITE + '/school/events/', text: 'صفحهٔ رویدادها' }] }), log };
  return { res: out({ answer: 'رویدادهای پیش‌رو:\n' + L.map((e) => '• ' + e.title + (e.date ? ' · ' + e.date : '') + (e.time ? ' · ساعت ' + e.time : '')).join('\n'), topic: 'رویدادها', source: 'ابزار', log_id: id,
    buttons: L.map((e) => ({ url: SITE + '/school/events/#ev=' + encodeURIComponent(e.code), text: String(e.title).slice(0, 40) })) }), log };
}
function toolMag(P, text, id, ch, aud) {
  const q = norm(scrub(text).replace(/\[(?:نام|عدد)\]/g, ' ')).replace(MAG_DROP, ' ').split(' ').filter((w) => w.length >= 2 && !STOP_SET.has(w)).join(' ');
  const L = q.length >= 2 ? search(q, P.magIx).filter((r) => r.score >= 0.34).slice(0, 3).map((r) => r.k.doc) : [];
  const log = { k: 'log', ch, id, topic: 'ابزار mag', res: 'ابزار', src: 'ابزار', au: aud };
  if (!L.length) return { res: out({ answer: 'مطلبی با این عنوان در مجله پیدا نکردم. فهرست مجله را ببین.', topic: 'مجله', source: 'ابزار', log_id: id, buttons: [{ url: SITE + '/mag/', text: 'مجلهٔ تجربه' }] }), log };
  return { res: out({ answer: 'از مجلهٔ تجربه:\n' + L.map((d) => '• ' + d.title.split(' › ')[0]).join('\n'), topic: 'مجله', source: 'ابزار', log_id: id,
    buttons: L.map((d) => ({ url: d.url, text: d.title.split(' › ')[0].slice(0, 40) })) }), log };
}

/** دکمه‌ها: t:<i> موضوع، q:<row> پرسش، y/n/x:<log> رضایت، h تحویل */
export function tap(P, idStr, lastText, ctx) {
  ctx = ctx || {};
  const ch = ctx.channel || 'site', aud = ctx.audience || 'کاربر عمومی';
  const [act, arg] = String(idStr || '').split(/:(.*)/s);
  if (act === 't') {
    const topic = P.topics[Number(arg)]; if (!topic) return ask(P, '', ctx);
    const rows = P.kb.filter((k) => k.topic === topic);
    return { res: out({ answer: '«' + topic + '»: کدام سؤال؟', topic, buttons: rows.slice(0, 8).map((k) => ({ id: 'q:' + k.row, text: (k.samples[0] || k.answer).slice(0, 60) })).concat([HANDOFF_BTN]) }) };
  }
  if (act === 'q') {
    const k = P.kb.find((x) => String(x.row) === String(arg)); if (!k) return ask(P, '', ctx);
    const id = newLogId(ctx.now);
    return { res: out({ answer: k.answer, topic: k.topic, buttons: rateBtns(id), log_id: id, source: 'دانش' }), log: { k: 'log', ch, id, topic: k.topic, mode: 'منو', res: 'پاسخ', src: 'دانش', au: aud } };
  }
  if (act === 'y' || act === 'n') return { res: out({ answer: 'ممنون از بازخوردت.' }), extra: [{ k: 'rate', id: String(arg || '').slice(0, 20), good: act === 'y' }] };
  if (act === 'x' || act === 'h') {
    const extra = [{ k: 'handoff', ch, sid: ctx.session || '', text: scrub(lastText || ''), why: act === 'x' ? 'جوابم را نگرفتم' : 'خواست با پذیرش حرف بزند' }];
    if (act === 'x') { extra.push({ k: 'rate', id: String(arg || '').slice(0, 20), good: false }); if (lastText) extra.push({ k: 'un', ch, text: scrub(lastText), kind: 'جوابم را نگرفتم', au: aud }); }
    return { res: out({ answer: P.texts.handed, handoff: true, buttons: [{ url: P.texts.bot, text: 'ادامه در تلگرام' }] }), log: { k: 'log', ch, id: newLogId(ctx.now), topic: '', res: 'تحویل', au: aud }, extra };
  }
  return ask(P, '', ctx);
}

/* ───── بی‌شناسه کردن (معادل لبهٔ asScrub_؛ فهرست نام‌های داخلی فقط در بات است و بات دوباره پاک می‌کند) ───── */
const TITLES = ['سرکار خانم', 'جناب آقای', 'خانم', 'آقای', 'آقا', 'دکتر', 'استاد', 'مهندس', 'جناب', 'سرکار', 'دکتری'];
export function scrub(text) {
  let s = latin(String(text || ''));
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[ایمیل]').replace(/https?:\/\/\S+/g, '[لینک]').replace(/@[A-Za-z0-9_]{3,}/g, '[آیدی]');
  s = s.replace(/\+?\d[\d\s-]{6,}\d/g, '[عدد]').replace(/\d{4,}/g, '[عدد]');
  const t = TITLES.map((x) => x.replace(/\s+/g, '\\s+')).join('|');
  s = s.replace(new RegExp('(^|[\\s«"(،,.])(' + t + ')\\s+[^\\s«»"(),،.!؟?:؛]+', 'g'), '$1$2 [نام]');
  s = s.replace(/(^|[^A-Za-z])[A-Z][a-z]+(?:[-'][A-Za-z]+)*/g, '$1[نام]');
  s = s.replace(/(?:اسمم|نامم|من)\s+([^\s،.!؟?]{2,})\s+(?:هستم|ام)/g, (m, w) => m.replace(w, '[نام]'));
  return s.slice(0, 400);
}

/* ───── گارد خروجی جمنای (همان asFacts_ و asRwSafe_) ───── */
export function facts(t) {
  const s = latin(String(t || '')), outL = [];
  for (const x of (s.match(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|@[A-Za-z0-9_]{3,}|[A-Za-z0-9-]+\.[A-Za-z]{2,}(?:\/[^\s،.]*)?|\d+(?:[.,٫٬]\d+)*/g) || [])) outL.push(x.replace(/[.,،؛:)]+$/, ''));
  for (const x of (s.match(/[A-Z][a-z]+/g) || [])) outL.push(x);
  const re = new RegExp('(?:' + TITLES.join('|') + ')\\s+([^\\s«»"(),،.!؟?:؛]+)', 'g'); let m;
  while ((m = re.exec(s))) outL.push(m[1]);
  return outL;
}
const META = /متن(?:‌|\s)?(?:های)?\s*(?:بالا|داده‌شده|ارائه‌شده)|در متن‌ها|بر اساس متن|طبق متن|به طور مستقیم (?:توضیح|اشاره)/;
export function safeOut(o, src) {
  o = String(o || '').trim();
  if (!o || o.length > Math.max(400, String(src).length * 2) || META.test(o) || /[—–]/.test(o)) return false;
  const base = latin(String(src));
  return facts(o).every((f) => base.indexOf(f) > -1);
}
export function composePrompt(c) {
  return 'به پرسش زیر فقط از روی این متن‌های منتشرشدهٔ سایت مرکز تجربه زندگی، کوتاه (حداکثر سه جمله)، گرم و فارسی جواب بده؛ مستقیم با خواننده حرف بزن. ' +
    'هیچ عدد، نشانی، لینک، نام یا اطلاعاتی که در متن‌ها نیست اضافه نکن. از «متن» یا «منبع» حرف نزن. مشاورهٔ بالینی، تشخیص یا دارو نده. خط تیرهٔ بلند ننویس. ' +
    'اگر متن‌ها جواب نمی‌دهند none = true. i شمارهٔ متنی است که بیشتر از آن استفاده کردی.\n\nپرسش: ' + c.q + '\n\n' +
    c.top.map((d, i) => i + ') ' + d.title + '\n' + d.text).join('\n\n');
}
export const COMPOSE_SCHEMA = { type: 'OBJECT', properties: { text: { type: 'STRING' }, i: { type: 'INTEGER' }, none: { type: 'BOOLEAN' } }, required: ['text', 'i', 'none'] };
/** خروجی جمنای را روی پاسخ سایت می‌نشاند اگر از گارد بگذرد؛ وگرنه همان متن منبع */
export function applyCompose(res, c, g) {
  if (!g || g.none) return res;
  const t = String(g.text || '').replace(/[—–]/g, '،').trim(), src = c.top.map((d) => d.title + ' ' + d.text).join(' ');
  if (!safeOut(t, src)) return res;
  const pick = c.top[g.i >= 0 && g.i < c.top.length ? g.i : 0];
  return Object.assign({}, res, { answer: t, source_url: pick.url, buttons: [{ url: pick.url, text: 'بیشتر بخوانید' }].concat(res.buttons.filter((b) => b.id)) });
}
