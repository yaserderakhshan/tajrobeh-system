/**
 * prauto.gs · v170.56 · ۲۱ مهر ۱۴۰۵ · انتشار خودکار پروفایل با گارد خراب‌کاری (تصمیم یاسر)
 *
 * یاسر از چرخهٔ بازبینی پروفایل بیرون است: هیچ کارت، خبر یا دکمه‌ای دربارهٔ پروفایل به او نمی‌رود.
 *   ۱) درمانگر خودش پروفایل را به‌روز می‌کند (همان پرسش‌نامهٔ «🪪 صفحهٔ من در سایت»).
 *   ۲) هر پاسخ تازه (tgPrNeeds_) نیم ساعت بعد از آخرین پاسخ، در ساعت‌های سنگین (tgPrTick_ ← praTick_) از گارد می‌گذرد.
 *      فیلد سالم با همان مسیر همیشگی (tgPrPublish_ با opts.auto) روی سایت می‌رود، بی تأیید آدم.
 *   ۳) گارد قطعی و بی هوش مصنوعی است (praGuard_): جواب جابه‌جا، فیلدی که خالی شده، طول بیرون از اندازه، «یک جملهٔ معرفی»
 *      که فقط فهرست کلمه‌هاست، شماره یا ایمیل یا شناسهٔ شخصی در متن عمومی، عکسی که بی جایگزین برداشته شده.
 *   ۴) فیلد ردشده: نسخهٔ قبلی روی سایت و در هاب می‌ماند، بقیه منتشر می‌شود، و خود درمانگر یک پیام کوتاه با نام دقیق فیلد و
 *      دلیل و دکمه‌ای (pq:f:<کلید>) می‌گیرد که همان پرسش را دوباره باز می‌کند. کس دیگری کاری لازم ندارد.
 *   ۵) هر انتشار نسخهٔ قبلی همهٔ فیلدها را نگه می‌دارد (pub_snap، pub_prev) تا برگرداندن ممکن باشد.
 *   ۶) روزی یک بار ساعت ۱۰ تهران، فقط اگر چیزی عوض شده: یک خلاصه به مسئول پذیرش (stkBoss_)، هر درمانگر و هر فیلد عوض‌شده
 *      با قبل و بعد کوتاه‌شده، و برای هر درمانگر یک دکمهٔ «↩️ برگرداندن» (pra:rb) که فقط تغییر همان دوره را برمی‌گرداند و به
 *      درمانگر خبر می‌دهد. ستون «تغییر امروز» در تب «پروفایل سایت».
 *   ۷) غلط تایپی آشکار: اگر جمنای در دسترس باشد فقط علامت می‌خورد (ستون typo_note و خلاصهٔ پذیرش)، انتشار را نمی‌بندد.
 * دانشجو (نقش D) صفحهٔ عمومی ندارد: پایان پرسش‌نامه‌اش خودکار «بازبینی شد» است (tgPqFinish_).
 * حالت خشک: TG_MEM['pqrows'] پروفایل‌ها، TG_MEM['pra:now'] زمان، TG_MEM['stk:boss'] مسئول پذیرش، TG_MEM['dirres'] پاسخ سایت.
 */
var PRA_KEYS = ['photo', 'title', 'latin', 'approach', 'degree', 'license', 'since', 'city', 'mode', 'langs', 'ages', 'focus', 'groups', 'headline', 'method',
                'first', 'trainings', 'supervision', 'supervisor', 'personal', 'teach', 'supaccept', 'resume', 'articles', 'links', 'voice'];
/* متن عمومی که شماره، ایمیل و لینک نمی‌پذیرد (لینک فقط در links، articles و resume) */
var PRA_TEXT = ['title', 'latin', 'approach', 'degree', 'city', 'focus', 'groups', 'headline', 'method', 'first', 'trainings', 'supervisor', 'teach'];
var PRA_MAX = { title: 80, latin: 60, approach: 300, degree: 160, license: 40, city: 120, focus: 300, groups: 300, headline: 220, method: 2500,
                first: 1500, trainings: 1500, supervisor: 80, teach: 1500, articles: 3000, links: 500 };
var PRA_PUB = ['title', 'headline', 'method', 'first', 'trainings', 'teach', 'articles'];   /* ستون‌های pub_<کلید> (ویرایش تیم) */
var PRA_SETTLE_MS = 30 * 60 * 1000;
var PRA_PER_RUN = 4;
var PRA_SUM_H = 10;
var PRA_TYPO_CAP = 30;
var PRA_WHY = {
  link: 'لینک یا ایمیل دارد؛ لینک فقط در بخش «اینستاگرام، لینکدین یا سایت» می‌آید',
  phone: 'شماره یا شناسهٔ شخصی دارد؛ این‌ها روی سایت نمی‌آید',
  swapd: 'به نظر کد نظام است، نه مدرک و دانشگاه',
  swapl: 'به نظر مدرک است، نه کد نظام',
  empty: 'خالی شده بود',
  photo: 'عکس برداشته شده بود و عکس تازه‌ای نیامد',
  short: 'خیلی کوتاه است',
  long: 'از اندازهٔ این بخش بلندتر است',
  list: 'فقط فهرست کلمه‌هاست؛ اینجا یک جملهٔ کامل لازم است'
};

function praDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function praNow_() { return praDry_() && TG_MEM['pra:now'] ? Number(TG_MEM['pra:now']) : Date.now(); }
function praDay_(t) { return Utilities.formatDate(new Date(t), TG_TZ, 'yyyy-MM-dd'); }
function praProp_(k, v) {
  if (praDry_()) { if (v !== undefined) TG_MEM['prap:' + k] = v; return TG_MEM['prap:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function praJ_(s) { try { var o = JSON.parse(String(s || '')); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
function praS_(x) { return String(x == null ? '' : x).trim(); }
function praLabel_(k) { var q = tgPqQ_(k); return q ? q.l : k; }

/* ───── نسخه‌ها ───── */
/** نسخهٔ منتشرشدهٔ یک سطر: {at, raw: پاسخ خود عضو، pub: ویرایش تیم} */
function praSnapOf_(v, at) {
  var raw = {}, pub = {};
  PRA_KEYS.forEach(function (k) { raw[k] = praS_(v[k]); });
  PRA_PUB.forEach(function (k) { if (praS_(v['pub_' + k])) pub[k] = praS_(v['pub_' + k]); });
  return { at: at || praNow_(), raw: raw, pub: pub };
}
/** آنچه روی سایت دیده می‌شود: ویرایش تیم اگر بود، وگرنه پاسخ خودش */
function praShown_(snap, k) { return snap ? praS_((snap.pub || {})[k] || (snap.raw || {})[k]) : ''; }

/* ───── گارد خراب‌کاری ───── */
function praListy_(s) {
  var t = praS_(s).replace(/[.!؟?«»"]+/g, ' ').trim();
  if (t.split(/\s+/).filter(String).length < 4) return true;
  var segs = t.split(/\s*(?:[،,؛;\/|•\n+]|\s-\s)\s*/).filter(String);
  return segs.length >= 3 && segs.every(function (x) { return x.split(/\s+/).length <= 3; });
}
/** یک فیلد؛ '' یعنی سالم */
function praCheck_(k, val, old) {
  var s = praS_(val), q = tgPqQ_(k);
  if (!s) {
    if (!praS_(old)) return '';
    return k === 'photo' ? 'photo' : 'empty';
  }
  if (q && ['photo', 'voice', 'file'].indexOf(q.t) > -1) return '';
  if (PRA_TEXT.indexOf(k) > -1) { var b = tgOkBad_(s); if (b) return /شماره/.test(b) ? 'phone' : 'link'; }
  if (k === 'degree') {
    var dg = (tgLatinDigits_(s).match(/\d/g) || []).length, lt = (s.replace(/[0-9\u06F0-\u06F9\u0660-\u0669]/g, '').match(/[\u0621-\u06D3A-Za-z]/g) || []).length;
    if (/کد\s*نظام|نظام\s*(روان|مشاوره|پزشکی)|شمارهٔ?\s*نظام/.test(s) || (dg >= 4 && lt < 6)) return 'swapd';
  }
  if (k === 'license' && /کارشناسی|ارشد|لیسانس|دکتری|دکترای|دانشگاه|phd|master|bachelor/i.test(s)) return 'swapl';
  if (k === 'license' && /https?:|@/.test(s)) return 'link';
  if (q && q.min && s.length < q.min) return 'short';
  if (PRA_MAX[k] && s.length > PRA_MAX[k]) return 'long';
  if (k === 'headline' && praListy_(s)) return 'list';
  return '';
}
/** {changed: [کلید عوض‌شده], bad: {کلید: علت}}؛ بی نسخهٔ قبلی همهٔ فیلدهای پر «عوض‌شده» حساب می‌شوند */
function praGuard_(v, snap) {
  var changed = [], bad = {};
  PRA_KEYS.forEach(function (k) {
    var now = praS_(v[k]), old = snap ? praS_(snap.raw[k]) : '';
    if (snap ? now === old : !now) return;
    changed.push(k);
    var why = praCheck_(k, now, old);
    if (why) bad[k] = why;
  });
  return { changed: changed, bad: bad };
}

/* ───── انتشار خودکار یک نفر ───── */
function praMemberChat_(v) { return String(v.chat || '').split(/[,،;\s]+/)[0]; }
function praBadText_(bad, ok) {
  var ks = Object.keys(bad);
  var L = [ok ? '✅ تغییرهای پروفایل شما روی سایت نشست، جز این بخش:' : '🙏 ممنون از به‌روزرسانی. این بخش از پروفایل شما منتشر نشد:', ''];
  if (ks.length > 1) L[0] = ok ? '✅ تغییرهای پروفایل شما روی سایت نشست، جز این بخش‌ها:' : '🙏 ممنون از به‌روزرسانی. این بخش‌ها از پروفایل شما منتشر نشد:';
  ks.forEach(function (k) { L.push('• <b>' + tgEsc_(praLabel_(k)) + '</b>: ' + tgEsc_(PRA_WHY[bad[k]] || bad[k]) + '.'); });
  L.push('', 'نسخهٔ قبلی همین بخش روی سایت ماند. با دکمهٔ زیر همان پرسش دوباره باز می‌شود.');
  return L.join('\n');
}
function praBadKb_(bad) {
  return { inline_keyboard: Object.keys(bad).map(function (k) { return [{ text: '✏️ ' + praLabel_(k), callback_data: 'pq:f:' + k }]; }) };
}

/** r: {row, v}. خروجی: {state: 'pub'|'none'|'blocked'|'fail', ok, bad, changed} */
function praAutoOne_(r) {
  var v = r.v, now = praNow_(), id = String(v.id || '');
  if (/نمی‌رود/.test(String(v.status || ''))) { tgPqPut_(id, { rstamp: String(now) }); return { state: 'blocked', bad: {}, changed: [] }; }
  var snap = praJ_(v.pub_snap), g = praGuard_(v, snap), badK = Object.keys(g.bad);
  var acc = g.changed.filter(function (k) { return !g.bad[k]; });
  var put = {}, eff = Object.assign({}, v);
  /* فیلد ردشده در هاب هم به نسخهٔ قبلی برمی‌گردد تا هیچ مسیر دیگری (تلاش دوباره، آشتی شبانه) آن را منتشر نکند */
  badK.forEach(function (k) { var old = snap ? praS_(snap.raw[k]) : ''; put[k] = old; eff[k] = old; });
  /* پاسخ تازهٔ خود عضو جای ویرایش قدیمی تیم را می‌گیرد (فقط وقتی واقعاً عوض شده) */
  if (snap) acc.forEach(function (k) { if (PRA_PUB.indexOf(k) > -1 && praS_(v['pub_' + k])) { put['pub_' + k] = ''; eff['pub_' + k] = ''; } });
  var res = null, ok = true;
  if (acc.length || !snap) {
    res = tgPrPublish_('', { row: r.row, v: eff }, { quiet: 1, auto: 1, omit: badK, who: 'خودکار' }) || {};
    ok = res.ok !== false;
  }
  var nsnap = praSnapOf_(eff, now);
  put.pub_snap = JSON.stringify(nsnap);
  put.rstamp = String(now); put.notified = String(tgPrStamp_(v));
  if (!res) put.review = tgPqNow_() + ' · خودکار';
  put.guard_note = badK.map(function (k) { return praLabel_(k) + ': ' + (PRA_WHY[g.bad[k]] || g.bad[k]); }).join(' · ');
  /* نسخهٔ پیش از اولین تغییر این دوره (تا خلاصهٔ بعدی) برای برگرداندن و خلاصهٔ پذیرش */
  var prev = praJ_(v.pub_prev);
  if (acc.length || badK.length) {
    if (!prev || prev.sum || prev.rb) prev = { at: now, day: praDay_(now), snap: snap || null, rej: {}, ch: [] };
    acc.forEach(function (k) { if (prev.ch.indexOf(k) < 0) prev.ch.push(k); });
    badK.forEach(function (k) { prev.rej[k] = g.bad[k]; });
    put.pub_prev = JSON.stringify(prev);
    put.today_change = tgPqNow_() + ' · ' + (prev.ch.length ? prev.ch.map(praLabel_).join('، ') : 'بی تغییر منتشرشده') +
      (Object.keys(prev.rej).length ? ' · رد شد: ' + Object.keys(prev.rej).map(praLabel_).join('، ') : '');
  }
  try { var ty = praTypo_(acc.filter(function (k) { return PRA_TEXT.indexOf(k) > -1; }).map(function (k) { return { k: k, t: praS_(eff[k]) }; })); if (ty) put.typo_note = ty; } catch (eT) {}
  tgPqPut_(id, put);
  /* پیام به خود عضو: فقط وقتی چیزی رد شد، یا انتشار تغییر بی صفحهٔ تازه (پیام جشن صفحهٔ تازه را tgPrPublish_ خودش می‌فرستد) */
  var to = praMemberChat_(v);
  if (to) {
    try {
      if (badK.length) tgSend_(to, praBadText_(g.bad, acc.length > 0 && ok), praBadKb_(g.bad));
      else if (acc.length && ok && res && !res.first) tgSend_(to, '✅ تغییرهای پروفایل شما روی سایت نشست. هر وقت خواستید چیزی را عوض کنید، «' + TG_PQ_BTN + '» را بزنید.',
        { inline_keyboard: [[{ text: '🌐 دیدن در سایت', url: String((res && res.page) || v.page || TG_PQ_SITE) }]] });
    } catch (eM) { tgErr_('praAutoOne_ پیام', eM); }
  }
  return { state: res ? (ok ? 'pub' : 'fail') : 'none', ok: ok, bad: g.bad, changed: g.changed };
}

/** غلط تایپی آشکار با جمنای: فقط علامت، هرگز مانع انتشار نیست. متن عمومی پروفایل است، نه دادهٔ مراجع. */
function praTypo_(items) {
  if (!items.length || typeof aiJson_ !== 'function') return '';
  var key = 'PRA_TYPO:' + praDay_(praNow_()), n = Number(praProp_(key) || 0);
  if (n >= PRA_TYPO_CAP) return '';
  praProp_(key, n + 1);
  var o;
  try {
    o = aiJson_('در این متن‌های فارسی پروفایل درمانگر فقط غلط تایپی آشکار (حرف جاافتاده یا جابه‌جا) را پیدا کن. سبک، نگارش و نیم‌فاصله را نسنج. ' +
      'اگر غلطی نیست آرایه خالی بده.\n' + JSON.stringify(items), { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT',
        properties: { k: { type: 'STRING' }, word: { type: 'STRING' }, fix: { type: 'STRING' } }, required: ['k', 'word', 'fix'] } } }, required: ['items'] }, { temp: 0 });
  } catch (e) { try { console.log('praTypo_: ' + String(e.message || e).slice(0, 120)); } catch (x) {} return ''; }
  return (o && o.items || []).filter(function (x) { return x.word && x.fix && x.word !== x.fix; }).slice(0, 5)
    .map(function (x) { return praLabel_(x.k) + ': ' + String(x.word).slice(0, 30) + ' ← ' + String(x.fix).slice(0, 30); }).join(' · ');
}

/** از tgPrTick_ (ساعت‌های سنگین): صف پاسخ‌های تازه، نیم ساعت بعد از آخرین پاسخ، چند تا در هر اجرا */
function praTick_(max) {
  var now = praNow_(), done = 0, out = { pub: 0, none: 0, fail: 0, blocked: 0, bad: 0 };
  var q = tgPrQueue_().filter(function (r) { var st = tgPrStamp_(r.v); return !(st > 1 && now - st < PRA_SETTLE_MS); });
  for (var i = 0; i < q.length && done < (max || PRA_PER_RUN); i++) {
    try { var o = praAutoOne_(q[i]); out[o.state]++; if (Object.keys(o.bad).length) out.bad++; done++; }
    catch (e) { tgErr_('praAutoOne_', e); done++; }
  }
  out.left = Math.max(0, q.length - done);
  return out;
}

/* ───── خلاصهٔ روزانهٔ پذیرش ───── */
function praBoss_() { try { return typeof stkBoss_ === 'function' ? stkBoss_() : null; } catch (e) { return null; } }
function praSumRows_() {
  return tgPrAll_().filter(function (r) { var p = praJ_(r.v.pub_prev); return p && !p.sum && !p.rb && (p.ch.length || Object.keys(p.rej || {}).length); });
}
function praSumBlock_(r) {
  var v = r.v, p = praJ_(v.pub_prev), cur = praJ_(v.pub_snap), L = ['<b>' + tgEsc_(v.site_name || v.name) + '</b>'];
  p.ch.forEach(function (k) {
    if (k === 'photo' || k === 'voice' || k === 'resume') { L.push('• ' + tgEsc_(praLabel_(k)) + ': نسخهٔ تازه'); return; }
    var b = p.snap ? praShown_(p.snap, k) : '', a = praShown_(cur, k);
    L.push('• ' + tgEsc_(praLabel_(k)) + ': «' + tgEsc_(b ? tgPrCut_(b, 40) : (p.snap ? 'خالی' : 'نامعلوم')) + '» ← «' + tgEsc_(a ? tgPrCut_(a, 40) : 'خالی') + '»');
  });
  Object.keys(p.rej || {}).forEach(function (k) { L.push('• ⛔ ' + tgEsc_(praLabel_(k)) + ' منتشر نشد: ' + tgEsc_(PRA_WHY[p.rej[k]] || p.rej[k])); });
  if (praS_(v.typo_note)) L.push('• ✍️ غلط تایپی احتمالی: ' + tgEsc_(praS_(v.typo_note)));
  return L.join('\n');
}
/** ساعت ۱۰ تهران یا بعد، روزی یک بار، فقط اگر چیزی عوض شده */
function praDaily_(force) {
  var now = praNow_(), h = Number(Utilities.formatDate(new Date(now), TG_TZ, 'H')), day = praDay_(now);
  if (!force && (h < PRA_SUM_H || praProp_('PRA_SUM_DAY') === day)) return '';
  var rows = praSumRows_();
  praProp_('PRA_SUM_DAY', day);
  if (!rows.length) return '';
  var boss = praBoss_();
  if (!boss) { tgErr_('praDaily_', 'مسئول پذیرش با chat پیدا نشد؛ خلاصهٔ پروفایل‌ها نرفت'); return ''; }
  var head = '🪪 <b>تغییرهای پروفایل سایت</b> · ' + tgFa_(rows.length) + ' نفر\nهمه خودکار منتشر شده‌اند. اگر تغییری درست نیست، «↩️ برگرداندن» همان نفر را بزن.';
  var parts = [], cur = { text: head, kb: [] };
  rows.forEach(function (r) {
    var p = praJ_(r.v.pub_prev), b = praSumBlock_(r);
    if (cur.text.length + b.length > 3500) { parts.push(cur); cur = { text: '🪪 <b>تغییرهای پروفایل سایت</b> (ادامه)', kb: [] }; }
    cur.text += '\n\n' + b;
    if (p.snap && p.ch.length) cur.kb.push([{ text: '↩️ برگرداندن ' + tgPrCut_(r.v.site_name || r.v.name, 24), callback_data: 'pra:rb:' + r.row + ':' + tgPrH_(r.v.id) + ':' + Number(p.at).toString(36) }]);
  });
  parts.push(cur);
  TG_OUT_KIND = 'سیستم'; TG_OUT_REF = 'پروفایل سایت';
  parts.forEach(function (x) { tgSend_(boss.chat, x.text, x.kb.length ? { inline_keyboard: x.kb } : null); });
  rows.forEach(function (r) { var p = praJ_(r.v.pub_prev); p.sum = day; tgPqPut_(r.v.id, { pub_prev: JSON.stringify(p) }); });
  return head;
}

/* ───── برگرداندن ───── */
function praDeskOk_(chat) {
  try { if (praDry_()) return (TG_MEM['pra:desk'] || []).indexOf(String(chat)) > -1; return !!tgWhoDesk_(chat, ''); } catch (e) { return false; }
}
/* فقط تیم پذیرش (ردیف تب پذیرش) یا مالک */
function praCb_(chat, data) {
  if (String(chat) !== String(TG_OWNER_CHAT) && !praDeskOk_(chat)) return tgSend_(chat, 'این دکمه فقط برای تیم پذیرش است.');
  var a = String(data).split(':');
  if (a[1] === 'rb') return praRollback_(chat, Number(a[2]), a[3], a[4]);
  return null;
}
function praRollback_(chat, row, h, at36) {
  var r = tgPrRow_(row);
  var p = r ? praJ_(r.v.pub_prev) : null;
  if (!r || tgPrH_(r.v.id) !== h || !p || Number(p.at).toString(36) !== String(at36) || !p.snap) return tgSend_(chat, 'این دکمه کهنه شده؛ تغییر تازه‌تری آمده یا قبلاً برگشته است.');
  if (p.rb) return tgSend_(chat, 'این تغییر قبلاً برگشته است.');
  var v = r.v, put = {}, now = praNow_();
  p.ch.forEach(function (k) { put[k] = praS_(p.snap.raw[k]); if (PRA_PUB.indexOf(k) > -1) put['pub_' + k] = praS_((p.snap.pub || {})[k]); });
  tgPqPut_(v.id, put);
  var eff = Object.assign({}, v, put);
  var o = tgPrPublish_('', { row: r.row, v: eff }, { quiet: 1, auto: 1, who: 'برگرداندن' }) || {};
  p.rb = now;
  tgPqPut_(v.id, { pub_snap: JSON.stringify(praSnapOf_(eff, now)), pub_prev: JSON.stringify(p), rstamp: String(now),
                   today_change: tgPqNow_() + ' · برگشت به نسخهٔ قبل: ' + p.ch.map(praLabel_).join('، ') });
  var to = praMemberChat_(v);
  if (to) { try { tgSend_(to, '↩️ تغییر تازهٔ پروفایل شما (' + tgEsc_(p.ch.map(praLabel_).join('، ')) + ') به نسخهٔ قبلی برگشت. اگر سؤالی دارید به پذیرش پیام بدهید.'); } catch (e) {} }
  return tgSend_(chat, (o.ok !== false ? '↩️ برگشت و منتشر شد: ' : '↩️ در هاب برگشت؛ انتشار کامل نشد و به صف تلاش دوباره رفت: ') + tgEsc_(v.site_name || v.name) +
    '\n' + tgEsc_(p.ch.map(praLabel_).join('، ')) + (to ? '\nبه خود درمانگر هم خبر داده شد.' : ''));
}

/* ───── یک‌بارهٔ بعد از انتشار ───── */
/** ۱) نسخهٔ پایهٔ کسانی که روی سایت‌اند و پاسخ تازه ندارند. ۲) دانشجوهای «منتظر بازبینی» ← «بازبینی شد». ۳) صف فعلی با روند تازه.
    خروجی (لاگ عمومی دیپلوی) فقط شمار است. */
function tgV17052PrAuto() {
  var now = praNow_(), seed = 0, stu = 0;
  tgPrAll_().forEach(function (r) {
    var v = r.v, roles = String(v.roles || '');
    if (!/[TES]/.test(roles)) {
      if (/D/.test(roles) && String(v.status || '') === 'منتظر بازبینی') { tgPqPut_(v.id, { status: 'بازبینی شد', review: tgPqNow_() + ' · خودکار', rstamp: String(now) }); stu++; }
      return;
    }
    if (praS_(v.pub_snap) || tgPrNeeds_(v)) return;
    if (!praS_(v.review) && !praS_(v.page)) return;
    tgPqPut_(v.id, { pub_snap: JSON.stringify(praSnapOf_(v, now)) }); seed++;
  });
  var t = praTick_(4);
  return 'نسخهٔ پایه: ' + seed + ' · دانشجو تأیید خودکار: ' + stu + ' · صف: منتشر ' + t.pub + '، بی انتشار ' + t.none + '، ناموفق ' + t.fail + '، با فیلد ردشده ' + t.bad + ' · ماند برای ساعت‌های بعد: ' + t.left;
}

/* ───── آزمون ───── */
function praTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, ther: typeof TG_DRY_THER !== 'undefined' ? TG_DRY_THER : null };
  var T0 = Date.UTC(2026, 9, 13, 5, 0);   /* ۸:۳۰ تهران */
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { watch: ['700'], 'pra:now': T0, 'stk:boss': { name: 'پذیرش نمونه', chat: '7800' }, 'pra:desk': ['7800'] };
  var msgs = function (to) { return TG_OUTBOX.filter(function (x) { return x.kind === 'msg' && (!to || String(x.chat) === String(to)); }); };
  var said = function (to) { return msgs(to).map(function (x) { return x.text + ' ' + JSON.stringify(x.markup || ''); }).join('\n'); };
  var dirs = function (op) { return TG_OUTBOX.filter(function (x) { return x.kind === 'dir' && x.op === op; }); };
  try {
    /* گارد، فیلد به فیلد */
    ok('گارد: لینک در عنوان', praCheck_('title', 'https://meet.google.com/abc-defg-hij', '') === 'link');
    ok('گارد: ایمیل در روش درمان', praCheck_('method', 'برای هماهنگی به sample@example.com پیام بدهید و درباره‌ی روش کار بپرسید.', '') === 'link');
    ok('گارد: شماره در یک جملهٔ معرفی', praCheck_('headline', 'برای وقت با شمارهٔ ۰۹۱۲۰۰۰۰۰۰۰ تماس بگیرید لطفاً.', '') === 'phone');   // pii:ok ساختگی
    ok('گارد: لینک در «لینک‌ها» آزاد است', praCheck_('links', 'https://instagram.com/sample', '') === '');
    ok('گارد: کد نظام در جای مدرک', praCheck_('degree', '۱۲۳۴۵۶', '') === 'swapd' && praCheck_('degree', 'کد نظام ۱۲۳۴۵', '') === 'swapd');
    ok('گارد: مدرک سالم با سال', praCheck_('degree', 'کارشناسی ارشد روان‌شناسی بالینی، دانشگاه نمونه ۱۳۹۸', '') === '');
    ok('گارد: مدرک در جای کد نظام', praCheck_('license', 'کارشناسی ارشد دانشگاه نمونه', '') === 'swapl' && praCheck_('license', '۱۲۳۴۵', '') === '');
    ok('گارد: فیلدی که پر بود و خالی شد', praCheck_('method', '', 'متن قبلی') === 'empty' && praCheck_('method', '', '') === '');
    ok('گارد: عکس برداشته شد بی جایگزین', praCheck_('photo', '', 'tg:photo:F1') === 'photo' && praCheck_('photo', 'tg:photo:F2', 'tg:photo:F1') === '');
    ok('گارد: کوتاه و بلند', praCheck_('headline', 'کوتاه', '') === 'short' && praCheck_('title', new Array(90).join('الف '), '') === 'long');
    ok('گارد: یک جمله که فقط فهرست است', praCheck_('headline', 'اضطراب، افسردگی، رابطه و زوج، تروما', '') === 'list');
    ok('گارد: جملهٔ معرفی واقعی سالم', praCheck_('headline', 'کنار آدم‌هایی هستم که در رابطه‌ها بارها به همان نقطه برمی‌گردند.', '') === '');
    ok('گارد: سه کلمهٔ بی جمله هم فهرست است', praCheck_('headline', 'اضطراب و افسردگی', '') !== '');
    var gg = praGuard_({ title: 'روان‌شناس بالینی', method: '' }, { raw: { title: 'روان‌شناس', method: 'متن قبلی روش درمان که منتشر شده بود و طولانی است' } });
    ok('گارد: فقط فیلدهای عوض‌شده سنجیده می‌شوند', gg.changed.join(',') === 'title,method' && gg.bad.method === 'empty' && !gg.bad.title, JSON.stringify(gg));

    /* انتشار خودکار: فیلد سالم می‌رود، فیلد ردشده نسخهٔ قبلی می‌ماند، پیام دقیق به خود عضو */
    var oldM = 'در جلسه بیشتر گوش می‌دهم و کمک می‌کنم الگوهای تکراری دیده شوند و درمان آرام جلو برود.';
    var base = { id: 'ther:نمونه یک', name: 'نمونه یک', roles: 'T', chat: '901', photo: 'tg:photo:F1', city: 'تهران', approach: 'روابط ابژه', consent: 'بله',
                 title: 'روان‌شناس', headline: 'کنار آدم‌هایی هستم که در رابطه‌ها بارها به همان نقطه برمی‌گردند.', method: oldM, page: 'https://tajrobeh.life/team/sample-one/',
                 review: 'x', status: 'روی سایت', rstamp: String(T0 - 9e6), stamp: String(T0 - 1e7), page_photo: 'F1|' };
    base.pub_snap = JSON.stringify(praSnapOf_(base, T0 - 9e6));
    TG_MEM['pqrows'] = { 'ther:نمونه یک': Object.assign({}, base, { title: 'روان‌شناس بالینی · روانکاو', headline: 'اضطراب، افسردگی، تروما', method: '', stamp: String(T0 - 40 * 60000) }) };
    TG_MEM['dirres'] = { find: { ok: true, hits: [{ kind: 'p3', page: TG_PR_HOME, title: 'خانه', f: { name: 'نمونه یک', sp: 'روابط ابژه', city: 'تهران', photo: '/a.webp' } }] },
                         person: { ok: true, url: 'https://tajrobeh.life/team/sample-one/' },
                         publish: { ok: true, pages: [{ page: TG_PR_HOME, title: 'خانه', url: 'https://tajrobeh.life/', saved: true, changes: [{ kind: 'p3', done: ['sp'] }] }], errors: [] } };
    TG_OUTBOX = [];
    var t1 = praTick_();
    var V = TG_MEM['pqrows']['ther:نمونه یک'], per = dirs('person')[0];
    ok('صف: یک نفر بعد از نیم ساعت، خودکار منتشر شد', t1.pub === 1 && V.status === 'روی سایت' && /خودکار/.test(V.review), JSON.stringify(t1));
    ok('فیلد سالم (عنوان) به سایت رفت', per && per.data.person.title === 'روان‌شناس بالینی · روانکاو');
    ok('فیلد ردشده به سایت نرفت (نسخهٔ قبلی روی سایت ماند)', per && !('headline' in per.data.person) && !('method' in per.data.person), per && JSON.stringify(Object.keys(per.data.person)));
    ok('فیلد ردشده در هاب به نسخهٔ قبلی برگشت', V.headline === base.headline && V.method === oldM);
    var m1 = said('901');
    ok('پیام به خود عضو: نام دقیق فیلد، دلیل و دکمهٔ همان پرسش', /یک جملهٔ معرفی/.test(m1) && /فهرست کلمه/.test(m1) && /توضیح روش درمان/.test(m1) && /خالی شده/.test(m1) && m1.indexOf('pq:f:headline') > -1 && m1.indexOf('pq:f:method') > -1, m1.slice(0, 300));
    ok('به یاسر و ناظر هیچ پیامی نرفت', said('700') === '' && !msgs().some(function (x) { return String(x.chat) === String(TG_OWNER_CHAT); }));
    ok('ستون «تغییر امروز» و یادداشت گارد پر شد', /عنوان حرفه‌ای/.test(V.today_change) && /رد شد/.test(V.today_change) && /یک جملهٔ معرفی/.test(V.guard_note));
    ok('نسخهٔ قبلی نگه داشته شد', praJ_(V.pub_prev).snap.raw.title === 'روان‌شناس' && praJ_(V.pub_snap).raw.title === 'روان‌شناس بالینی · روانکاو');
    ok('بعد از انتشار از صف بیرون است', !tgPrNeeds_(V) && praTick_().pub === 0);
    ok('متن پیام عضو خط تیرهٔ وسط جمله ندارد', !/[—–]/.test(m1.replace(/<[^>]+>/g, '')));

    /* نیم ساعت نگذشته: صبر */
    TG_MEM['pra:now'] = T0 + 10 * 60000; V.title = 'روان‌شناس بالینی'; V.stamp = String(T0 + 5 * 60000);
    ok('کمتر از نیم ساعت از آخرین پاسخ: صبر', praTick_().pub === 0 && V.title === 'روان‌شناس بالینی' && tgPrNeeds_(V));
    V.title = 'روان‌شناس بالینی · روانکاو'; V.stamp = String(T0 - 1e7); TG_MEM['pra:now'] = T0;

    /* خلاصهٔ روزانه */
    ok('خلاصه پیش از ساعت ۱۰ نمی‌رود', praDaily_() === '');
    TG_MEM['pra:now'] = T0 + 2 * 3600000;   /* ۱۰:۳۰ */
    TG_OUTBOX = [];
    var sm = praDaily_(), sTxt = said('7800');
    ok('خلاصهٔ ۱۰ صبح فقط به مسئول پذیرش', !!sm && msgs().length === 1 && msgs('7800').length === 1, JSON.stringify({ sm: sm, n: msgs().length, rows: praSumRows_().length, boss: praBoss_(), e: TG_MEM['errs'] }).slice(0, 400));
    ok('خلاصه: نام، فیلد، قبل و بعد کوتاه', /نمونه یک/.test(sTxt) && /عنوان حرفه‌ای/.test(sTxt) && /«روان‌شناس» ← «روان‌شناس بالینی · روانکاو»/.test(sTxt), sTxt.slice(0, 400));
    ok('خلاصه: فیلد ردشده با دلیل', /⛔ یک جملهٔ معرفی منتشر نشد/.test(sTxt));
    ok('خلاصه: یک دکمهٔ برگرداندن برای هر درمانگر', (sTxt.match(/pra:rb:/g) || []).length === 1);
    ok('خلاصه: روزی یک بار', praDaily_() === '' && msgs().length === 1);
    ok('خلاصه: بی تغییر، چیزی نمی‌رود', (function () { TG_MEM['pra:now'] = T0 + 26 * 3600000; TG_OUTBOX = []; return praDaily_() === '' && msgs().length === 0; })());
    ok('متن خلاصه خط تیرهٔ وسط جمله ندارد', !/[—–]/.test(sTxt.replace(/<[^>]+>/g, '')));

    /* برگرداندن */
    var cbd = /pra:rb:[^"]+/.exec(sTxt)[0];
    TG_OUTBOX = [];
    praCb_('999', cbd);
    ok('برگرداندن: غیرپذیرش راه ندارد', V.title === 'روان‌شناس بالینی · روانکاو' && /فقط برای تیم پذیرش/.test(said('999')));
    TG_OUTBOX = [];
    praCb_('7800', cbd);
    ok('برگرداندن: فقط تغییر همان دوره برمی‌گردد و دوباره منتشر می‌شود', V.title === 'روان‌شناس' && V.headline === base.headline && dirs('person').length === 1 && dirs('person')[0].data.person.title === 'روان‌شناس');
    ok('برگرداندن: به خود درمانگر خبر داده شد', /به نسخهٔ قبلی برگشت/.test(said('901')) && /برگشت و منتشر شد/.test(said('7800')));
    ok('برگرداندن: دکمه دوباره کار نمی‌کند', (function () { TG_OUTBOX = []; praCb_('7800', cbd); return /قبلاً برگشته|کهنه/.test(said('7800')); })());
    ok('برگرداندن: بعد از آن از صف بیرون است', !tgPrNeeds_(V));

    /* بی نسخهٔ پایه (صف فعلی): فیلد ردشده فرستاده نمی‌شود، بقیه می‌رود؛ دکمهٔ برگرداندن ندارد */
    TG_MEM['pra:now'] = T0;
    TG_MEM['pqrows']['ther:نمونه دو'] = { id: 'ther:نمونه دو', name: 'نمونه دو', roles: 'T', chat: '902', photo: 'tg:photo:F2', approach: 'لکانی', title: 'https://meet.google.com/x', headline: 'کنار کسانی هستم که می‌خواهند خودشان را بهتر بشناسند.', stamp: String(T0 - 3e6), rstamp: '0' };
    TG_OUTBOX = [];
    praTick_();
    var V2 = TG_MEM['pqrows']['ther:نمونه دو'], p2 = dirs('person')[0];
    ok('صف فعلی: لینک در عنوان رد شد و به سایت نرفت، بقیه رفت', p2 && !('title' in p2.data.person) && /بشناسند/.test(p2.data.person.headline) && V2.title === '' && /عنوان حرفه‌ای/.test(said('902')));
    TG_MEM['pra:now'] = T0 + 2 * 3600000; TG_OUTBOX = [];
    praDaily_();
    ok('صف فعلی در خلاصه: قبل «نامعلوم» و بی دکمهٔ برگرداندن', /نامعلوم/.test(said('7800')) && said('7800').indexOf('pra:rb:' + tgPrRow_(Object.keys(TG_MEM['pqrows']).indexOf('ther:نمونه دو') + 3).row) < 0);

    /* تصمیم تیم «روی سایت نمی‌رود»: چیزی منتشر نمی‌شود */
    TG_MEM['pra:now'] = T0;
    TG_MEM['pqrows']['ther:نمونه سه'] = { id: 'ther:نمونه سه', name: 'نمونه سه', roles: 'T', chat: '903', title: 'روان‌شناس', status: 'روی سایت نمی‌رود (تصمیم تیم)', stamp: String(T0 - 3e6), rstamp: '0' };
    TG_OUTBOX = [];
    var t3 = praTick_();
    ok('«روی سایت نمی‌رود»: منتشر نمی‌شود و از صف بیرون می‌رود', t3.blocked === 1 && dirs('person').length === 0 && !tgPrNeeds_(TG_MEM['pqrows']['ther:نمونه سه']));

    /* دانشجو: بی بازبینی */
    TG_MEM['pqrows']['person:نمونه دانشجو'] = { id: 'person:نمونه دانشجو', name: 'نمونه دانشجو', roles: 'D', uni: 'دانشگاه نمونه', field: 'روان‌شناسی', status: 'منتظر بازبینی' };
    TG_OUTBOX = [];
    var o1 = tgV17052PrAuto();
    ok('یک‌باره: دانشجوی منتظر بازبینی خودکار تأیید شد', TG_MEM['pqrows']['person:نمونه دانشجو'].status === 'بازبینی شد' && /دانشجو تأیید خودکار: 1/.test(o1), o1);
    ok('یک‌باره: خروجی فقط شمار است، بی نام', !/نمونه/.test(o1));
    ok('یک‌باره: به یاسر چیزی نرفت', !msgs().some(function (x) { return String(x.chat) === String(TG_OWNER_CHAT) || String(x.chat) === '700'; }));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 400), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'praTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['انتشار خودکار پروفایل و گارد (v170.56)', 'praTests']); } catch (ePra) {}
