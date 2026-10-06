/**
 * leadspeed.gs · v170.23.12 · پاسخ زیر ۱۰ دقیقه و فهرست اولویت روزانهٔ پذیرش (چارچوب leadflow: مرحلهٔ ۴ «تماس اول»)
 *
 * گسترش «نوبت پذیرش» (tgDutyRun_)، نه جایگزین آن: کشیک همان‌طور خبر و یادآوری می‌گیرد. این ماژول فقط دو کار اضافه می‌کند.
 * ۱) لید تازهٔ پذیرش (tgDutyClinic_) که ۱۰ دقیقه بعد از رسیدن هنوز تماس اول نگرفته و بسته نشده، بین ۹ تا ۲۱ تهران:
 *    chat دارد ← پیام «درخواستت رسید» با دکمهٔ «زمان مناسب تماس» (صبح، ظهر، عصر)؛ پاسخ در یادداشت لید.
 *    فقط شماره دارد ← کارت فوری برای کشیک همین ساعت (وگرنه مسئول پذیرش) و صندوق یکتا اگر هست.
 *    بیرون از ساعت کاری ← ساعت ۹ صبح. هر لید فقط یک بار (Property LS_SENT).
 * ۲) ساعت ۹:۳۰ هر روز فهرست حداکثر ۱۰ لید باز برای میز پذیرش، با امتیاز قاعده‌محور (تازگی، کامل بودن فرم، درخواست معارفه،
 *    کانال، بی‌پاسخ‌های قبلی، موعد اقدام بعدی)، یک خط «چرا» و دکمهٔ کارت لید موجود (ld:back). وزن‌ها در LEAD_SCORE_WEIGHTS.
 * سنجش: میانهٔ دقیقه از رسیدن لید تا تماس اول (از «نوبت پذیرش · پاسخ‌ها»)، و نرخ لید (مرحلهٔ ۲ به ۳: لید ÷ کلیک‌های تماس)،
 *   ۷ روز، با عدد پایهٔ لحظهٔ روشن شدن (LS_BASE). یک خط در گزارش شبانه.
 * همه پشت LEAD_SPEED_ENABLED = «بله».
 */
var LS_WAIT_MIN = 10;
var LS_TIMES = ['صبح', 'ظهر', 'عصر'];
var LS_MSG = 'سلام، درخواستت رسید و همکارم در پذیرش به‌زودی با تو تماس می‌گیرد. اگر عجله داری، همین‌جا بنویس.';
var LS_OPEN = ['جدید', 'در پیگیری', 'پاسخ نداد', 'ارجاع شد'];
var LS_W_DEF = { fresh: 3, complete: 2, intro: 2, channel: 1, noans: -1, due: 3 };
cfg_('LEAD_SPEED_ENABLED', '');    /* «بله» = روشن */
cfg_('LEAD_SCORE_WEIGHTS', '');    /* JSON {fresh, complete, intro, channel, noans, due}؛ خالی = پیش‌فرض */

function lsDry_() { return typeof TG_DRY !== 'undefined' && TG_DRY; }
function lsNow_() { return lsDry_() && TG_MEM['ls:now'] ? Number(TG_MEM['ls:now']) : Date.now(); }
function lsOn_() { return String(cfg_('LEAD_SPEED_ENABLED', '') || '').trim() === 'بله'; }
function lsHour_() { return Number(Utilities.formatDate(new Date(lsNow_()), TG_TZ, 'H')); }
function lsDay_(ms) { return Utilities.formatDate(new Date(ms || lsNow_()), TG_TZ, 'yyyy-MM-dd'); }
function lsProp_(k, v) {
  if (lsDry_()) { if (v !== undefined) TG_MEM['lsp:' + k] = v; return TG_MEM['lsp:' + k] || ''; }
  var P = PropertiesService.getScriptProperties(); if (v !== undefined) P.setProperty(k, String(v)); return P.getProperty(k) || '';
}
function lsJson_(k, dflt) { try { return JSON.parse(lsProp_(k) || '') || dflt; } catch (e) { return dflt; } }
function lsWeights_() {
  var w = cfg_('LEAD_SCORE_WEIGHTS', ''), o = {};
  if (typeof w === 'string' && w) { try { w = JSON.parse(w); } catch (e) { w = {}; } }
  Object.keys(LS_W_DEF).forEach(function (k) { o[k] = (w && typeof w[k] === 'number') ? w[k] : LS_W_DEF[k]; });
  return o;
}

/* ───── خواندن لیدها (یک بار کل برگه؛ همان شکل tgLeadRead_) ───── */
function lsLeads_(lastN) {
  if (lsDry_()) return TG_MEM['ls:leads'] || [];
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh ? sh.getLastRow() : 0;
  if (last < 2) return [];
  var from = lastN ? Math.max(2, last - lastN + 1) : 2, out = [];
  for (var r = from; r <= last; r++) { try { var l = tgLeadRead_(r); if (l && (l.name || l.phone)) out.push(l); } catch (e) {} }
  return out;
}

/* ───── ۱) پیام ۱۰ دقیقه ───── */
/** نامزدهای پیام ۱۰ دقیقه: یک خواندن بلوکی از آخرین n سطر، و خواندن کامل فقط برای نامزدها (سهمیهٔ تیک ۵ دقیقه‌ای) */
function lsFresh_(n, sent) {
  if (lsDry_()) return lsLeads_();
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh ? sh.getLastRow() : 0;
  if (last < 2) return [];
  var cc = tgLeadCodeCol_(), from = Math.max(2, last - n + 1), now = new Date(lsNow_());
  var v = sh.getRange(from, 1, last - from + 1, Math.max(cc, 13)).getValues(), out = [];
  for (var i = 0; i < v.length; i++) {
    var code = String(v[i][cc - 1] || '').trim();
    if (!code || sent[code] || String(v[i][10] || '').trim() || tgStClosed_(String(v[i][8] || '').trim())) continue;
    var age = tgDutyAge_(v[i][0], v[i][1], now);
    if (age < LS_WAIT_MIN || age > 24 * 60) continue;
    var l = tgLeadRead_(from + i); if (l) out.push(l);
  }
  return out;
}

function lsTick_() {
  if (!lsOn_()) return 0;
  lsBase_();
  var h = lsHour_(), n = 0;
  if (h >= 9 && h < 21) {
    var sent = lsJson_('LS_SENT', {}), changed = false;
    lsFresh_(80, sent).forEach(function (l) {
      if (!l.code || sent[l.code] || l.closed || l.touched) return;
      if (l.age < LS_WAIT_MIN || l.age > 24 * 60) return;
      if (typeof tgDutyClinic_ === 'function' && !tgDutyClinic_(l)) return;
      sent[l.code] = lsNow_(); changed = true; n++;
      if (l.chatId) {
        tgSend_(l.chatId, LS_MSG, { inline_keyboard: [[{ text: 'زمان مناسب تماس:', callback_data: 'ls:x' }], LS_TIMES.map(function (t, i) { return { text: t, callback_data: 'ls:t:' + l.code + ':' + i }; })] });
        try { tgLeadNote_(l.row, 'پیام «درخواستت رسید» بعد از ' + LS_WAIT_MIN + ' دقیقه رفت', 'بات'); } catch (e) {}
      } else lsUrgent_(l);
    });
    if (changed) { var keys = Object.keys(sent), lim = lsNow_() - 3 * 86400000; keys.forEach(function (k) { if (sent[k] < lim) delete sent[k]; }); lsProp_('LS_SENT', JSON.stringify(sent)); }
  }
  try { lsDailyMaybe_(); } catch (e2) { tgErr_('lsDailyMaybe_', e2); }
  return n;
}
/** لید بی chat: کارت فوری برای کشیک همین ساعت (وگرنه مسئول پذیرش) */
function lsUrgent_(l) {
  var who = null;
  try { var w = typeof tgDutyWho_ === 'function' ? tgDutyWho_(new Date(lsNow_())) : null; who = w && w.p ? w.p : null; } catch (e) {}
  if (!who) { try { who = typeof tgDutyBoss_ === 'function' ? tgDutyBoss_() : null; } catch (e2) {} }
  if (lsDry_() && TG_MEM['ls:duty']) who = TG_MEM['ls:duty'];
  var txt = '⚡ <b>لید ' + LS_WAIT_MIN + ' دقیقه منتظر، فقط شماره دارد</b>\nهمین حالا تماس بگیرید.\n\n' + tgLeadCardText_(l);
  if (who && who.chat) tgNotify_(String(who.chat).split(/[,،;\s]+/)[0], TG_NK.urgent, txt, { ref: l.code, markup: tgLeadKb_(l) });
  if (typeof inbAdd_ === 'function') { try { inbAdd_('lead', l.code, { text: 'لید ' + LS_WAIT_MIN + ' دقیقه منتظر تماس اول (فقط شماره)', q: 'پذیرش', type: 'تماس اول' }); } catch (e3) {} }
}
function lsCb_(chat, data) {
  var a = String(data).split(':');
  if (a[1] !== 't') return null;
  var code = a[2], t = LS_TIMES[Number(a[3])];
  if (!t) return null;
  var row = typeof tgLeadByCode_ === 'function' ? tgLeadByCode_(code) : 0;
  var l = row > 1 ? tgLeadRead_(row) : null;
  if (!l || String(l.chatId) !== String(chat)) return tgSend_(chat, 'ممنون.');
  tgLeadNote_(row, 'زمان مناسب تماس: ' + t, 'مراجع');
  return tgSend_(chat, '✅ ثبت شد: ' + t + '. همکارم در پذیرش همان موقع تماس می‌گیرد.');
}

/* ───── ۲) فهرست اولویت ۹:۳۰ ───── */
function lsScore_(l, w, today) {
  var why = [], s = 0, ageD = (l.age || 0) / 1440;
  var fresh = Math.max(0, 1 - ageD / 14); s += w.fresh * fresh; if (ageD < 1) why.push('تازه');
  var have = [l.name, l.phone, l.region, l.first].filter(function (x) { return String(x || '').trim(); }).length / 4;
  s += w.complete * have; if (have >= 1) why.push('فرم کامل');
  var intro = /معارفه/.test(String(l.first || '') + ' ' + String(l.next || '')) || l.status === 'ارجاع شد';
  if (intro) { s += w.intro; why.push('درخواست معارفه'); }
  var ch = /بات|تلگرام/.test(l.src + ' ' + l.channel) ? 1 : (/سایت|فرم/.test(l.src + ' ' + l.channel) ? 0.8 : 0.5);
  s += w.channel * ch;
  if (l.noans) { s += w.noans * l.noans; why.push(tgFa_(l.noans) + ' بار بی‌پاسخ'); }
  if (l.nextDate && l.nextDate <= today) { s += w.due * (l.nextDate < today ? 1.2 : 1); why.push(l.nextDate < today ? 'موعد گذشته' : 'موعد امروز'); }
  if (!l.touched) { s += 1; why.push('هنوز تماس اول نگرفته'); }
  return { l: l, score: Math.round(s * 100) / 100, why: why.join('، ') || 'در صف' };
}
function lsPriority_() {
  var w = lsWeights_(), today = lsDay_();
  return lsLeads_().filter(function (l) { return !l.closed && LS_OPEN.indexOf(l.status) > -1 && l.code && (typeof tgDutyClinic_ !== 'function' || tgDutyClinic_(l)); })
    .map(function (l) { return lsScore_(l, w, today); }).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
}
function lsDeskChats_() {
  if (lsDry_()) return TG_MEM['ls:desk'] || [];
  return (typeof tgDeskRows_ === 'function' ? tgDeskRows_() : []).map(function (d) { return String(d.chat || '').split(/[,،;\s]+/)[0]; }).filter(String);
}
function lsDailyMaybe_() {
  var now = new Date(lsNow_()), h = Number(Utilities.formatDate(now, TG_TZ, 'H')), mi = Number(Utilities.formatDate(now, TG_TZ, 'm'));
  if (h < 9 || (h === 9 && mi < 30) || h >= 21) return false;
  var day = lsDay_(); if (lsProp_('LS_LIST_DAY') === day) return false;
  lsProp_('LS_LIST_DAY', day);
  var L = lsPriority_(); if (!L.length) return false;
  var T = ['🎯 <b>اولویت امروز پذیرش</b> · ' + tgFa_(L.length) + ' لید', ''];
  L.forEach(function (x, i) { T.push(tgFa_(i + 1) + '. <b>' + tgEsc_(x.l.code) + '</b> · ' + tgEsc_(String(x.l.name || 'بی‌نام').split(/\s+/)[0]) + ' · ' + tgEsc_(x.l.status) + '\n   چرا: ' + tgEsc_(x.why)); });
  T.push('', 'هر دکمه کارت همان لید را با دکمه‌های همیشگی باز می‌کند.');
  var kb = L.map(function (x) { return [{ text: '📇 ' + x.l.code, callback_data: 'ld:back:' + x.l.code }]; });
  lsDeskChats_().forEach(function (c) { tgNotify_(c, TG_NK.task, T.join('\n'), { ref: 'LS-LIST', markup: { inline_keyboard: kb } }); });
  return true;
}

/* ───── سنجش ───── */
function lsDutyRows_() {
  if (lsDry_()) return TG_MEM['ls:dutylog'] || [];
  var sh = tgSS_().getSheetByName(TG_DUTY_LOG); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, TG_DUTY_LOG_HEAD.length).getValues().map(function (v) {
    var a = v[2] instanceof Date ? v[2].getTime() : 0, t = v[4] instanceof Date ? v[4].getTime() : 0, m = v[6] === '' ? null : Number(v[6]);
    return { a: a, t: t, res: String(v[5] || ''), mins: m };
  });
}
/** میانهٔ دقیقه از رسیدن لید تا تماس اول، در days روز تا to */
function lsMedian_(days, to) {
  to = to || lsNow_(); var from = to - days * 86400000;
  var xs = lsDutyRows_().filter(function (r) { return r.res === 'تماس اول گرفته شد' && r.a >= from && r.a < to && r.t && r.mins != null; })
    .map(function (r) { return Math.round((r.t - r.a) / 60000) + r.mins; }).sort(function (a, b) { return a - b; });
  if (!xs.length) return null;
  var m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : Math.round((xs[m - 1] + xs[m]) / 2);
}
/** نرخ لید (۳÷۲): لیدهای پذیرش ÷ کلیک‌های تماس، در days روز */
function lsLeadRate_(days, to) {
  to = to || lsNow_(); var from = lsDay_(to - days * 86400000), end = lsDay_(to);
  var clicks = 0;
  if (lsDry_()) clicks = (TG_MEM['ls:clicks'] || []).filter(function (d) { return d >= from && d < end; }).length;
  else { try { var sh = tgSS_().getSheetByName('کلیک‌های تماس'); if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (v) { var d = v[0] instanceof Date ? lsDay_(v[0].getTime()) : String(v[0]).slice(0, 10); if (d >= from && d < end) clicks++; }); } catch (e) {} }
  var leads = lsLeads_().filter(function (l) { var d = lsDay_(lsNow_() - (l.age || 0) * 60000); return d >= from && d < end; }).length;
  return clicks ? Math.round(1000 * leads / clicks) / 10 : null;
}
/** عدد پایه یک بار، لحظهٔ اولین روشن شدن */
function lsBase_() {
  if (lsProp_('LS_BASE')) return lsJson_('LS_BASE', {});
  var b = { day: lsDay_(), med: lsMedian_(28), rate: lsLeadRate_(28) };
  lsProp_('LS_BASE', JSON.stringify(b));
  return b;
}
function lsNightLine_() {
  if (!lsOn_()) return '';
  var b = lsJson_('LS_BASE', {}), med = lsMedian_(7), rate = lsLeadRate_(7), sent = lsJson_('LS_SENT', {}), today = lsDay_();
  var n = Object.keys(sent).filter(function (k) { return lsDay_(sent[k]) === today; }).length;
  var f = function (x, unit) { return x == null ? 'بی داده' : tgFa_(x) + unit; };
  return '⚡ سرعت پاسخ (۷ روز): میانهٔ رسیدن تا تماس اول ' + f(med, ' دقیقه') + ' (پایه ' + f(b.med, ' دقیقه') + ')' +
    ' · نرخ لید ' + f(rate, '٪') + ' (پایه ' + f(b.rate, '٪') + ') · پیام ۱۰ دقیقه امروز: ' + tgFa_(n);
}
try { TG_NIGHT_LINES.push(lsNightLine_); } catch (eNl) {}

/* ───── آزمون ───── */
function lsTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, cfg: TG_CFG_ }, st = { clin: tgDutyClinic_, note: tgLeadNote_, card: tgLeadCardText_, kb: tgLeadKb_, by: tgLeadByCode_, rd: tgLeadRead_ };
  TG_DRY = true; TG_OUTBOX = []; TG_CFG_ = { LEAD_SPEED_ENABLED: 'بله' };
  TG_MEM = { 'ls:now': new Date('2026-10-07T10:00:00+03:30').getTime(), 'ls:desk': ['801'], 'ls:duty': { name: 'کشیک نمونه', chat: '802' }, notify: [] };
  try {
    tgDutyClinic_ = function (l) { return l.src !== 'مدرسه'; };
    var notes = []; tgLeadNote_ = function (r, t) { notes.push([r, t]); return 'x'; };
    tgLeadCardText_ = function (l) { return 'کارت ' + l.code; }; tgLeadKb_ = function (l) { return { inline_keyboard: [[{ text: 'x', callback_data: 'ld:call:' + l.code }]] }; };
    var L = function (o) { return Object.assign({ row: 2, code: 'L-1', name: 'مراجع نمونه', phone: '', src: 'بات', channel: 'بات', region: 'ایران', first: 'سلام', status: 'جدید', chatId: '', touched: false, closed: false, age: 15, noans: 0, next: '', nextDate: '' }, o); };
    TG_MEM['ls:leads'] = [L({ code: 'L-1', chatId: '501' }), L({ code: 'L-2', row: 3, phone: '0912' + '0000000', age: 12 }), L({ code: 'L-3', row: 4, chatId: '503', age: 5 }),   // pii:ok ساختگی
      L({ code: 'L-4', row: 5, chatId: '504', touched: true }), L({ code: 'L-5', row: 6, chatId: '505', src: 'مدرسه' }), L({ code: 'L-6', row: 7, chatId: '506', closed: true })];
    var n = lsTick_();
    ok('فقط لید پذیرش ۱۰ دقیقه‌ای بی تماس اول', n === 2, n);
    var m1 = TG_OUTBOX.filter(function (x) { return x.chat === '501'; })[0];
    ok('پیام «درخواستت رسید» با دکمهٔ زمان مناسب تماس', m1 && m1.text === LS_MSG && JSON.stringify(m1.markup || m1.kb || m1).indexOf('ls:t:L-1:2') > -1, JSON.stringify(m1).slice(0, 200));
    ok('لید فقط‌شماره ← کارت فوری برای کشیک', TG_MEM.notify.some(function (x) { return x.chat === '802' && x.kind === TG_NK.urgent; }));
    ok('یادداشت لید ثبت شد', notes.some(function (x) { return x[0] === 2 && /۱۰|10/.test(x[1]); }));
    TG_OUTBOX = []; TG_MEM.notify = [];
    ok('هر لید فقط یک بار', lsTick_() === 0 && TG_OUTBOX.length === 0);
    /* بیرون از ساعت کاری، ساعت ۹ */
    TG_MEM['lsp:LS_SENT'] = ''; TG_MEM['ls:now'] = new Date('2026-10-07T22:30:00+03:30').getTime();
    ok('بیرون از ساعت کاری پیامی نمی‌رود', lsTick_() === 0);
    TG_MEM['ls:now'] = new Date('2026-10-08T09:05:00+03:30').getTime();
    TG_MEM['ls:leads'].forEach(function (l) { l.age = 11 * 60; });
    ok('ساعت ۹ صبح لیدهای شب پیام می‌گیرند', lsTick_() === 3);
    /* دکمهٔ زمان مناسب */
    tgLeadByCode_ = function () { return 2; }; tgLeadRead_ = function () { return L({ code: 'L-1', chatId: '501' }); };
    notes.length = 0; lsCb_('501', 'ls:t:L-1:1');
    ok('زمان مناسب در یادداشت لید', notes.length === 1 && notes[0][1] === 'زمان مناسب تماس: ظهر');
    notes.length = 0; lsCb_('999', 'ls:t:L-1:1');
    ok('فقط خود مراجع', notes.length === 0);
    /* فهرست اولویت */
    TG_MEM['ls:now'] = new Date('2026-10-08T09:40:00+03:30').getTime(); TG_MEM.notify = []; TG_OUTBOX = [];
    TG_MEM['ls:leads'] = [L({ code: 'L-10', age: 60, first: 'می‌خواهم معارفه رزرو کنم', phone: '1', region: 'ایران' }), L({ code: 'L-11', age: 20000, noans: 3, status: 'پاسخ نداد', touched: true }),
      L({ code: 'L-12', age: 3000, nextDate: '2026-10-07', status: 'در پیگیری', touched: true }), L({ code: 'L-13', closed: true, status: 'بسته' })];
    ok('فهرست ۹:۳۰ یک بار برای میز پذیرش', lsDailyMaybe_() === true && lsDailyMaybe_() === false && TG_MEM.notify.filter(function (x) { return x.chat === '801'; }).length === 1);
    var msg = TG_MEM.notify[0].text;
    ok('ترتیب امتیاز، «چرا» و بی بسته‌ها', msg.indexOf('L-10') < msg.indexOf('L-12') && msg.indexOf('L-12') < msg.indexOf('L-11') && msg.indexOf('L-13') < 0 && /چرا: .*درخواست معارفه/.test(msg), msg);
    ok('دکمهٔ کارت لید موجود', JSON.stringify(TG_OUTBOX).indexOf('ld:back:L-10') > -1);
    TG_CFG_.LEAD_SCORE_WEIGHTS = '{"noans": 5}';
    ok('وزن‌ها از کلید', lsWeights_().noans === 5 && lsWeights_().fresh === 3);
    delete TG_CFG_.LEAD_SCORE_WEIGHTS;
    /* سنجش */
    var t0 = TG_MEM['ls:now'];
    TG_MEM['ls:dutylog'] = [{ a: t0 - 86400000, t: t0 - 86400000 + 5 * 60000, res: 'تماس اول گرفته شد', mins: 10 }, { a: t0 - 2 * 86400000, t: t0 - 2 * 86400000, res: 'تماس اول گرفته شد', mins: 30 }, { a: t0 - 3 * 86400000, t: 0, res: 'بی‌پاسخ ماند', mins: null }];
    ok('میانهٔ رسیدن تا تماس اول', lsMedian_(7) === 23, lsMedian_(7));
    TG_MEM['ls:clicks'] = ['2026-10-07', '2026-10-07', '2026-10-06', '2026-10-05'];
    TG_MEM['ls:leads'] = [L({ age: 1500 }), L({ age: 3000 })];
    ok('نرخ لید ۷ روز', lsLeadRate_(7) === 50, lsLeadRate_(7));
    TG_MEM['lsp:LS_BASE'] = '';
    var b = lsBase_();
    ok('عدد پایه یک بار ثبت می‌شود', b.med === 23 && lsBase_().day === b.day);
    ok('خط گزارش شبانه', /سرعت پاسخ .* میانهٔ رسیدن تا تماس اول ۲۳ دقیقه/.test(lsNightLine_()), lsNightLine_());
    TG_CFG_.LEAD_SPEED_ENABLED = '';
    ok('خاموش: هیچ کاری', lsTick_() === 0 && lsNightLine_() === '');
    ok('در خط‌های گزارش شبانه ثبت است', TG_NIGHT_LINES.indexOf(lsNightLine_) > -1);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally {
    tgDutyClinic_ = st.clin; tgLeadNote_ = st.note; tgLeadCardText_ = st.card; tgLeadKb_ = st.kb; tgLeadByCode_ = st.by; tgLeadRead_ = st.rd;
    TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_CFG_ = keep.cfg;
  }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'lsTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['پاسخ زیر ۱۰ دقیقه و اولویت روزانه (v170.23.12)', 'lsTests']); } catch (eLs) {}
