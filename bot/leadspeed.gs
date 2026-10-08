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

/* ═════════════ v170.23.21 · مسیر لیدهای خارج از ایران، بخش الف: مبنای ارجاع و دادهٔ لید ═════════════
   تصمیم یاسر (۱۵ مهر ۱۴۰۵). عدد پایه در توضیح PR است؛ داوری ۱۵ آبان.
   - «داخل یا خارج» از سه چیز: کشور (صریح) ← منطقهٔ زمانی مرورگر یا انتخاب ساعت در بات ← پیش‌شمارهٔ تلفن (abRegion_).
   - گارد سخت: درمانگری که وضعیت همکاری‌اش (ستون B «درمانگران»، تنها منبع) «فعال» نیست نه ارجاع می‌گیرد، نه کارت، نه وقتش دیده می‌شود.
   - لید خارج فقط از استخر «خارج از ایران»؛ ترتیب: مقیم همان کشور، وقت هفتگی در «زمان مناسب» مراجع، نرخ تبدیل خارج (abRank_).
   - مبنای ارجاع: پیشنهاد، معارفه، شروع و نرخ‌ها در پنجرهٔ ۶۰ روزه، جدا برای داخل و خارج؛ رده، نزدیک‌ترین وقت، ارجاع باز و
     پیشنهاد سیستم از دادهٔ واقعی (abStats_). اول پیش‌نمایش؛ بعد از «اوکی» Cowork هر روز یک بار در «درمانگران» نوشته می‌شود.
   - اصلاح دادهٔ لیدها (داخل یا خارج، نوع لید درخواست زوج، تاریخ‌های قاطی): پیش‌نمایش و «اوکی» Cowork. */
var AB_DAYS = 60;
var AB_ZONE_TZ = {
  de: /^Europe\/(Berlin|Vienna|Zurich|Amsterdam|Brussels|Luxembourg|Copenhagen|Stockholm|Oslo|Paris|Rome|Madrid|Prague|Budapest|Warsaw|Helsinki|Athens|Lisbon)/,
  uk: /^Europe\/(London|Dublin)/, na: /^America\//, ae: /^Asia\/(Dubai|Qatar|Muscat|Kuwait|Bahrain|Riyadh)/, tr: /^(Europe\/Istanbul|Asia\/Istanbul)/,
  au: /^(Australia|Pacific\/Auckland)/, af: /^Asia\/Kabul/, ir: /^(Asia\/Tehran|Iran)$/
};
var AB_ZONE_FA = [
  ['ir', /^\s*(🇮🇷\s*)?(ایران|iran|ir)\s*$/i],
  ['de', /آلمان|اتریش|سوئیس|هلند|بلژیک|دانمارک|سوئد|نروژ|فرانسه|ایتالیا|اسپانیا|فنلاند|اروپای مرکزی|germany|austria|switzerland|netherlands|sweden|europe/i],
  ['uk', /انگلیس|انگلستان|بریتانیا|ایرلند|united kingdom|england|britain|ireland|\buk\b/i],
  ['na', /آمریکا|امریکا|کانادا|usa|united states|canada|america/i],
  ['ae', /امارات|دبی|قطر|عمان|کویت|بحرین|عربستان|emirates|dubai|qatar/i],
  ['tr', /ترکیه|استانبول|turkey|türkiye|istanbul/i],
  ['au', /استرالیا|نیوزیلند|australia|new zealand/i],
  ['af', /افغانستان|afghanistan/i]
];
function abZoneOfTz_(tz) { var t = String(tz || '').trim(); for (var k in AB_ZONE_TZ) if (AB_ZONE_TZ[k].test(t)) return k; return t ? 'x' : ''; }
/** کشور (متن فارسی یا انگلیسی) یا برچسب TG_ZONES یا نام IANA ← کلید منطقه */
function abZoneOf_(s) {
  var t = String(s || '').trim(); if (!t) return '';
  if (/^[A-Za-z_]+\/[A-Za-z_\/-]+$/.test(t) || t === 'Iran') return abZoneOfTz_(t);
  for (var i = 0; i < AB_ZONE_FA.length; i++) if (AB_ZONE_FA[i][1].test(t)) return AB_ZONE_FA[i][0];
  return 'x';
}
/** «داخل ایران» | «خارج از ایران» | '' ؛ کشور صریح ← منطقهٔ زمانی ← شماره */
function abRegion_(phone, tz, country) {
  var c = abZoneOf_(country);
  if (c) return c === 'ir' ? 'داخل ایران' : 'خارج از ایران';
  var z = abZoneOfTz_(tz);
  if (z) return z === 'ir' ? 'داخل ایران' : 'خارج از ایران';
  return tgRegion_(phone);
}
/** منطقهٔ زمانی و «زمان مناسب» از یادداشت فرم‌های قدیمی (پل سایت هر دو را در یادداشت می‌گذاشت) */
function abTzFromNote_(memo) { var m = String(memo || '').match(/\b((?:Europe|America|Asia|Australia|Africa|Pacific|Atlantic)\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)\b/); return m ? m[1] : ''; }
function abBestFromNote_(memo) { var m = String(memo || '').match(/زمان مناسب(?: تماس)?:\s*([^·\n]+)/); return m ? m[1].trim() : ''; }
/** تاریخ قاطی (Date، ۹/۱۶/۲۰۲۶، ۱۴۰۵/۰۶/۳۱، ISO) ← yyyy-MM-dd یا '' */
function abIso_(x) {
  if (x === '' || x == null) return '';
  if (!(x instanceof Date)) {
    var s = tgLatinDigits_(String(x)).trim(), m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m && Number(m[3]) >= 1990) return m[3] + '-' + ('0' + m[1]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
  }
  return tgLeadIso_(x);
}
/* ───── گارد سخت: فقط «فعال» (ستون B «درمانگران» تنها منبع) ───── */
function abTherOk_(t) { return !!t && String(t.status || '').trim() === 'فعال'; }
function abTherOkName_(name) {
  if (lsDry_() && !TG_MEM['ab:ther']) return true;   /* آزمون‌های قدیمی بی فهرست درمانگر */
  if (lsDry_()) return TG_MEM['ab:ther'].some(function (t) { return tgNorm_(t.name) === tgNorm_(name) && abTherOk_(t); });
  try { var info = tgTherapistInfo_(); var t = info[String(name || '').trim()]; if (!t) { for (var k in info) if (tgNorm_(k) === tgNorm_(name)) { t = info[k]; break; } } return abTherOk_(t); } catch (e) { return false; }
}

/* ───── پنجرهٔ ساعت محلی مراجع («زمان مناسب») ───── */
/* تصمیم یاسر: صبح ۹ تا ۱۲، بعدازظهر ۱۳ تا ۱۷، شب ۱۸ تا ۲۱، «هر وقت» ۱۰ تا ۲۰. دکمه‌های قدیمی بات: «ظهر» = بعدازظهر، «عصر» = ۱۶ تا ۲۰ */
var AB_WIN = [[/صبح|morning/i, 9, 12], [/بعد ?از ?ظهر|ظهر|afternoon/i, 13, 17], [/عصر/, 16, 20], [/شب|evening|night/i, 18, 21], [/هر وقت|هر موقع|فرقی|any/i, 10, 20]];
/** [ساعت شروع، ساعت پایان] به وقت خود مراجع، یا null */
function abLocalWin_(best) {
  var s = String(best || ''); if (!s.trim()) return null;
  var lo = 24, hi = 0, hit = false;
  AB_WIN.forEach(function (w) { if (w[0].test(s)) { hit = true; lo = Math.min(lo, w[1]); hi = Math.max(hi, w[2]); } });
  if (!hit) { var n = s.match(/(\d{1,2})/); if (n) { var h = Number(tgLatinDigits_(n[1])); if (h >= 6 && h <= 23) return [h, Math.min(23, h + 3)]; } return null; }
  return [lo, hi];
}
/** ساعت محلی یک لحظه در منطقهٔ زمانی (با تغییر ساعت تابستانی خود منطقه) */
function abLocalHour_(ms, tz) { var d = new Date(ms); return Number(Utilities.formatDate(d, tz, 'H')) + Number(Utilities.formatDate(d, tz, 'm')) / 60; }
function abSlotInWin_(s, tz, best) {
  var w = abLocalWin_(best); if (!w || !tz) return false;
  var h = abLocalHour_(tgSlotUtc_(s).getTime(), tz); return h >= w[0] && h < w[1];
}

/* ───── ترتیب ارجاع لید خارج ───── */
/** نامزدها (با name) ← مرتب: مقیم همان کشور، وقت در پنجرهٔ مراجع، نرخ تبدیل خارج. ctx: {info, stats, slots} */
function abRank_(cands, lead, ctx) {
  var lz = abZoneOf_(lead.country) || abZoneOfTz_(lead.tz), tz = lead.tz || '';
  var sc = cands.map(function (c) {
    var t = (ctx.info || {})[c.name] || {}, st = (ctx.stats || {})[c.name] || {};
    var tz2 = abZoneOf_(t.tz) || abZoneOf_(t.city);
    var same = lz && lz !== 'x' && lz !== 'ir' && tz2 === lz ? 1 : 0;
    var win = (ctx.slots || []).some(function (s) { return tgNorm_(s.therapist) === tgNorm_(c.name) && abSlotInWin_(s, tz, lead.best); }) ? 1 : 0;
    var rate = st.sugAb ? st.introAb / st.sugAb : 0;
    return { c: c, same: same, win: win, rate: rate };
  });
  sc.sort(function (a, b) { return (b.same - a.same) || (b.win - a.win) || (b.rate - a.rate) || (a.c.name < b.c.name ? -1 : 1); });
  return sc.map(function (x) { x.c.why = [x.same ? 'مقیم همان کشور' : '', x.win ? 'وقت در زمان مناسب مراجع' : '', x.rate ? 'نرخ خارج ' + tgFa_(Math.round(100 * x.rate)) + '٪' : ''].filter(String).join('، '); return x.c; });
}

/* ───── مبنای ارجاع از دادهٔ واقعی ───── */
/** leads: [{date, region, refs[], refDate, introTher, introDate, booked, started, status, closed}] ← {نام: آمار} */
function abStats_(leads, nowMs, days) {
  var from = Utilities.formatDate(new Date(nowMs - (days || AB_DAYS) * 86400000), TG_TZ, 'yyyy-MM-dd'), out = {};
  var S = function (n) { n = String(n || '').trim(); if (!n) return null; if (!out[n]) out[n] = { sug: 0, intro: 0, start: 0, sugIn: 0, introIn: 0, startIn: 0, sugAb: 0, introAb: 0, startAb: 0, open: 0, last: '' }; return out[n]; };
  leads.forEach(function (l) {
    var ab = /خارج/.test(l.region || ''), when = l.refDate || l.date, seen = {};
    (l.refs || []).forEach(function (n) {
      var s = S(n); if (!s || seen[tgNorm_(n)]) return; seen[tgNorm_(n)] = 1;
      if (!l.closed) s.open++;
      if (l.refDate && l.refDate > s.last) s.last = l.refDate;
      if (when && when >= from) { s.sug++; if (ab) s.sugAb++; else s.sugIn++; }
    });
    var t = S(l.introTher);
    if (t) {
      if (!l.closed && !seen[tgNorm_(l.introTher)]) t.open++;
      var met = l.booked || l.introDate || [TG_ST.BOOKED, TG_ST.HELD, TG_ST.START].indexOf(l.status) > -1;
      var w2 = l.introDate || when;
      if (met && w2 && w2 >= from) { t.intro++; if (ab) t.introAb++; else t.introIn++; }
      if ((l.started || l.status === TG_ST.START) && w2 && w2 >= from) { t.start++; if (ab) t.startAb++; else t.startIn++; }
    }
  });
  return out;
}
/** کف اطمینان ۸۰٪ (ویلسون، کران پایین) */
function abWilson_(k, n) { if (!n) return 0; var z = 1.2816, p = k / n, d = 1 + z * z / n; return Math.max(0, (p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d); }
/** ردهٔ ارجاع با مبنای کل مرکز */
function abTier_(s, base) {
  if (!s || s.sug < 3) return 'داده کم، نیاز به تست';
  if (abWilson_(s.intro, s.sug) >= base) return '۱ اول لیست';
  if (s.intro / s.sug >= base) return '۲ گزینهٔ خوب';
  return s.intro > 0 ? '۳ کم‌بازده' : '۴ تا الان صفر معارفه';
}
function abSuggest_(t, s, tier, near, base) {
  var st = String(t.status || '').trim();
  if (st !== 'فعال') return '⛔ ارجاع نده: وضعیت همکاری «' + (st || 'خالی') + '» است';
  if (!near) return '⏳ وقت معارفهٔ آزاد ندارد؛ اول از او وقت بگیر';
  if (s && s.open >= 6) return '🟠 بار زیاد: ' + tgFa_(s.open) + ' ارجاع باز؛ فقط با تناسب ویژه';
  var r = tier.charAt(0);
  if (r === '۱') return '⭐ اول لیست · نزدیک‌ترین وقت ' + tgFa_(near.slice(5));
  if (r === '۲') return '✅ گزینهٔ خوب · نزدیک‌ترین وقت ' + tgFa_(near.slice(5));
  if (r === '۳') return 'فقط با تناسب تخصصی · نرخ زیر مبنای مرکز (' + tgFa_(Math.round(100 * base)) + '٪)';
  if (r === '۴') return '⚠ هنوز معارفه نگرفته؛ اول لیست نگذار';
  return '🔬 داده کم: یک ارجاع برای سنجش' + (s && s.open ? ' · ' + tgFa_(s.open) + ' ارجاع باز' : '');
}
/** لیدها از «لیدها» به شکل abStats_ */
function abLeadRows_() {
  if (lsDry_()) return TG_MEM['ab:leads'] || [];
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh ? sh.getLastRow() : 0; if (last < 2) return [];
  var hm = tgLeadHeadMap_(sh), v = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : r[i]; };
  return v.map(function (r) {
    var st = tgStOf_(String(g(r, 'وضعیت') || '').trim()) || String(g(r, 'وضعیت') || '').trim();
    return { date: abIso_(r[0]), region: String(g(r, 'داخل یا خارج') || ''), refs: [g(r, 'درمانگر پیشنهادی ۱'), g(r, 'درمانگر پیشنهادی ۲'), g(r, 'درمانگر پیشنهادی ۳')].map(function (x) { return String(x || '').trim(); }).filter(String),
      refDate: abIso_(g(r, 'تاریخ ارجاع')), introTher: String(g(r, 'درمانگر معارفه') || '').trim(), introDate: abIso_(g(r, 'تاریخ معارفه')),
      booked: String(g(r, 'معارفه هماهنگ شد؟') || '').trim() === 'بله', started: /بله|شروع/.test(String(g(r, 'شروع درمان؟') || '')), status: st, closed: tgStClosed_(String(g(r, 'وضعیت') || '')) };
  }).filter(function (l) { return l.date || l.refs.length; });
}
/** نزدیک‌ترین وقت آزاد هر درمانگر (yyyy-MM-dd HH:mm تهران) */
function abNearest_(slots) {
  var out = {}, now = lsNow_();
  (slots || []).forEach(function (s) { if (tgSlotUtc_(s).getTime() <= now) return; var k = s.therapist, v = s.dateIso + ' ' + ('0' + s.hhmm).slice(-5); if (!out[k] || v < out[k]) out[k] = v; });
  return out;
}
var AB_TH_COLS = ['پیشنهاد داخل', 'معارفه داخل', 'شروع داخل', 'پیشنهاد خارج', 'معارفه خارج', 'شروع خارج', 'نرخ معارفه خارج', 'بازهٔ آمار'];
/** سطرهای «درمانگران» با همهٔ ستون‌های حساب‌شده؛ برای پیش‌نمایش و نوشتن */
function abThRows_() {
  var ther = lsDry_() ? (TG_MEM['ab:ther'] || []) : tgTherapistRows_();
  var slots = lsDry_() ? (TG_MEM['ab:slots'] || []) : (function () { try { return tgFreeSlots_(''); } catch (e) { return []; } })();
  var st = abStats_(abLeadRows_(), lsNow_(), AB_DAYS), near = abNearest_(slots);
  var tot = Object.keys(st).reduce(function (a, k) { a.s += st[k].sug; a.i += st[k].intro; return a; }, { s: 0, i: 0 });
  var base = tot.s ? tot.i / tot.s : 0.07;
  var span = Utilities.formatDate(new Date(lsNow_() - AB_DAYS * 86400000), TG_TZ, 'yyyy-MM-dd') + ' تا ' + lsDay_();
  return { base: base, tot: tot, span: span, rows: ther.map(function (t) {
    var s = st[t.name] || null, tier = abTier_(s, base), nr = abTherOk_(t) ? (near[t.name] || '') : '';
    var r = function (a, b) { return b ? Math.round(1000 * a / b) / 1000 : ''; };
    return { name: t.name, row: t.row, status: t.status, sug: s ? s.sug : 0, intro: s ? s.intro : 0, rate: s ? r(s.intro, s.sug) : '', floor: s ? Math.round(1000 * abWilson_(s.intro, s.sug)) / 1000 : '',
      tier: tier, near: nr, open: s ? s.open : 0, last: s && s.last ? s.last : '—', sys: abSuggest_(t, s, tier, nr, base), start: s ? s.start : 0, rate2: s ? r(s.start, s.intro) : '',
      split: s ? [s.sugIn, s.introIn, s.startIn, s.sugAb, s.introAb, s.startAb, r(s.introAb, s.sugAb), span] : [0, 0, 0, 0, 0, 0, '', span] };
  }) };
}
var AB_PV_TAB = 'مبنای ارجاع · پیش‌نمایش';
var AB_FX_TAB = 'اصلاح دادهٔ لیدها · پیش‌نمایش';
/** پیش‌نمایش مبنای ارجاع (بی نام مراجع؛ فقط درمانگر و عدد) */
function abStatsPreview_() {
  var R = abThRows_(), sum = 'مبنای مرکز ' + tgFa_(Math.round(1000 * R.base) / 10) + '٪ (' + tgFa_(R.tot.i) + ' معارفه از ' + tgFa_(R.tot.s) + ' پیشنهاد، ' + R.span + ')';
  if (lsDry_()) { TG_MEM['ab:pv'] = R; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(AB_PV_TAB) || ss.insertSheet(AB_PV_TAB);
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد تا هر روز در «درمانگران» نوشته شود', '', 'v170.23.21 · ' + sum]]).setFontWeight('bold');
  var head = ['درمانگر', 'وضعیت', 'پیشنهاد', 'معارفه', 'نرخ معارفه', 'کف ۸۰٪', 'ردهٔ ارجاع', 'نزدیک‌ترین وقت', 'ارجاع باز الان', 'آخرین ارجاع', 'پیشنهاد سیستم', 'شروع تراپی', 'نرخ معارفه به شروع'].concat(AB_TH_COLS);
  sh.getRange(2, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f5f5f8');
  var vals = R.rows.map(function (x) { return [x.name, x.status, x.sug, x.intro, x.rate, x.floor, x.tier, x.near, x.open, x.last, x.sys, x.start, x.rate2].concat(x.split); });
  if (vals.length) sh.getRange(3, 1, vals.length, head.length).setValues(vals);
  return sum;
}
/** نوشتن در «درمانگران»: ستون‌های I تا R (جز N)، «شروع تراپی»، «نرخ معارفه به شروع» و ستون‌های داخل و خارج در انتها */
function abStatsWrite_() {
  var R = abThRows_();
  if (lsDry_()) { TG_MEM['ab:written'] = R; return R.rows.length; }
  var sh = tgSS_().getSheetByName(TG_THER), lc = sh.getLastColumn(), hd = sh.getRange(3, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  AB_TH_COLS.forEach(function (h) { if (hd.indexOf(h) < 0) { sh.getRange(3, hd.length + 1).setValue(h).setFontWeight('bold').setBackground('#dfdfe2'); hd.push(h); } });
  var col = function (h) { return hd.indexOf(h) + 1; };
  if (hd[8] !== 'پیشنهاد (۶۰ روز)') sh.getRange(3, 9).setValue('پیشنهاد (۶۰ روز)');
  try { sh.getRange(2, 1).setValue('زرد = تو پر می‌کنی · خاکستری = خودکار، دست نزن · ستون‌های پیشنهاد، معارفه، نرخ، رده، نزدیک‌ترین وقت، ارجاع باز، پیشنهاد سیستم و شروع را بات هر روز از «لیدها» در پنجرهٔ ۶۰ روزه حساب می‌کند (' + R.span + '). مبنای کل مرکز: ' + tgFa_(Math.round(1000 * R.base) / 10) + '٪.'); } catch (e) {}
  var by = {}; R.rows.forEach(function (x) { by[x.row] = x; });
  var n = sh.getLastRow() - 3; if (n < 1) return 0;
  var blockA = [], cS = col('شروع تراپی'), cR2 = col('نرخ معارفه به شروع'), split = [], st2 = [];
  for (var i = 0; i < n; i++) {
    var x = by[i + 4];
    blockA.push(x ? [x.sug, x.intro, x.rate, x.floor, x.tier] : ['', '', '', '', '']);
    split.push(x ? x.split : AB_TH_COLS.map(function () { return ''; }));
    st2.push(x ? [x.near, x.open, x.last, x.sys] : ['', '', '', '']);
  }
  sh.getRange(4, 9, n, 5).setValues(blockA);                 /* I..M */
  sh.getRange(4, 15, n, 4).setNumberFormat('@').setValues(st2);   /* O..R (N فرمول خودش می‌ماند) */
  if (cS > 0) sh.getRange(4, cS, n, 1).setValues(blockA.map(function (_, i) { var x = by[i + 4]; return [x ? x.start : '']; }));
  if (cR2 > 0) sh.getRange(4, cR2, n, 1).setValues(blockA.map(function (_, i) { var x = by[i + 4]; return [x ? x.rate2 : '']; }));
  sh.getRange(4, col(AB_TH_COLS[0]), n, AB_TH_COLS.length).setValues(split);
  try { CacheService.getScriptCache().remove('trows'); } catch (e2) {}
  return n;
}

/* ───── اصلاح دادهٔ لیدها: داخل یا خارج، نوع لید درخواست زوج، تاریخ‌ها ───── */
var AB_DATE_COLS = ['آخرین تماس', 'تاریخ ارجاع', 'تاریخ معارفه'];
function abFixRows_() {
  var src = lsDry_() ? (TG_MEM['ab:raw'] || { head: [], rows: [] }) : (function () {
    var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow();
    return { head: sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), rows: last > 1 ? sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues() : [] };
  })();
  var hx = function (h) { return src.head.indexOf(h); }, out = [];
  var iPh = hx('شماره / شناسه'), iRg = hx('داخل یا خارج'), iMemo = hx('یادداشت'), iCt = hx('کشور محل زندگی'), iTp = hx('نوع لید'), iSrc = hx('منبع'), iTx = hx('متن اولیه'), iKind = hx('نوع درخواست'), iCode = hx('کد لید');
  src.rows.forEach(function (r, i) {
    var row = i + 2, code = iCode > -1 ? String(r[iCode] || '') : '';
    if (iRg > -1) {
      var memo = iMemo > -1 ? r[iMemo] : '', ph = String(iPh > -1 ? r[iPh] : '');
      var want = abRegion_(/^@/.test(ph) ? '' : ph, abTzFromNote_(memo), iCt > -1 ? r[iCt] : '');
      var cur = String(r[iRg] || '').trim();
      if (want && cur && want !== cur) out.push({ row: row, code: code, col: 'داخل یا خارج', from: cur, to: want, why: 'کشور، منطقهٔ زمانی یا پیش‌شماره' });
    }
    if (iTp > -1 && String(r[iTp] || '').trim() === LM_T.P) {
      var guess = lmGuessType_(iSrc > -1 ? r[iSrc] : '', iTx > -1 ? r[iTx] : ''), kind = iKind > -1 ? String(r[iKind] || '') : '';
      if (guess !== LM_T.P || /زوج/.test(kind)) out.push({ row: row, code: code, col: 'نوع لید', from: LM_T.P, to: LM_T.C, why: 'درخواست مراجع (زوج یا فردی)، نه پارتنر' });
    }
    AB_DATE_COLS.forEach(function (h) {
      var j = hx(h); if (j < 0) return;
      var v = r[j]; if (v === '' || v == null) return;
      var iso = abIso_(v), raw = v instanceof Date ? 'Date' : String(v).trim();
      if (iso && raw !== iso && !/^\d{4}-\d{2}-\d{2}( \d{1,2}:\d{2})?$/.test(raw)) out.push({ row: row, code: code, col: h, from: raw === 'Date' ? 'تاریخ خام' : raw, to: iso, why: 'یکدست ISO' });
    });
  });
  return out;
}
function abFixPreview_() {
  var rows = abFixRows_(), c = {}; rows.forEach(function (r) { c[r.col] = (c[r.col] || 0) + 1; });
  var sum = 'اصلاح لیدها: ' + rows.length + ' (' + Object.keys(c).map(function (k) { return k + ' ' + c[k]; }).join('، ') + ')';
  lsProp_('AB_FX_PREV', '1');
  if (lsDry_()) { TG_MEM['ab:fx'] = rows; return sum; }
  var ss = tgSS_(), sh = ss.getSheetByName(AB_FX_TAB) || ss.insertSheet(AB_FX_TAB);
  sh.clear(); sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, 3).setValues([['بررسی Cowork: بعد از بررسی، Cowork در B1 «اوکی» می‌نویسد', '', 'v170.23.21 · ' + sum]]).setFontWeight('bold');
  sh.getRange(2, 1, 1, 6).setValues([['کد لید', 'سطر', 'ستون', 'فعلی', 'درست', 'دلیل']]).setFontWeight('bold').setBackground('#f5f5f8');
  if (rows.length) sh.getRange(3, 1, rows.length, 6).setNumberFormat('@').setValues(rows.map(function (r) { return [r.code, String(r.row), r.col, r.from, r.to, r.why]; }));
  return sum;
}
function abOk_(tab, mem) {
  if (lsDry_()) return TG_MEM[mem] === 'اوکی';
  var sh = tgSS_().getSheetByName(tab); return !!sh && String(sh.getRange(1, 2).getValue() || '').trim() === 'اوکی';
}
function abFixApply_() {
  var n = 0, sh = lsDry_() ? null : tgSS_().getSheetByName(TG_LEADS);
  abFixRows_().forEach(function (r) {   /* دوباره از خود سطر حساب می‌شود؛ سطر جابه‌جاشده الگو نمی‌خورد */
    if (lsDry_()) { (TG_MEM['ab:applied'] = TG_MEM['ab:applied'] || []).push(r); n++; return; }
    var c = tgLeadCol_(r.col); if (!c) return;
    var cell = sh.getRange(r.row, c); if (AB_DATE_COLS.indexOf(r.col) > -1) cell.setNumberFormat('@'); cell.setValue(r.to); n++;
  });
  if (!lsDry_()) { try { tgSS_().getSheetByName(AB_FX_TAB).getRange(1, 2).setValue('اعمال شد ' + Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd HH:mm') + ' · ' + n); } catch (e) {} }
  return n;
}
/** قدم سبک واچ‌داگ، روزی یک بار از ۶ صبح: پیش‌نمایش‌ها، اعمال با «اوکی»، و نوشتن روزانهٔ مبنای ارجاع */
function abDailyMaybe_() {
  var h = lsHour_(), day = lsDay_(); if (h < 6) return 0;
  var did = 0;
  if (lsProp_('AB_FX_DONE') !== '1') {
    if (lsProp_('AB_FX_PREV') !== '1') { abFixPreview_(); did++; }
    else if (abOk_(AB_FX_TAB, 'ab:fxok')) { lsProp_('AB_FX_DONE', '1'); abFixApply_(); did++; }
  }
  try { if (abFunnelMaybe_()) did++; } catch (eFn) { tgErr_('abFunnelMaybe_', eFn); }   /* v170.23.23 */
  if (lsProp_('AB_ST_DAY') === day) return did;
  lsProp_('AB_ST_DAY', day);
  if (lsProp_('AB_ST_ON') === '1' || abOk_(AB_PV_TAB, 'ab:pvok')) { lsProp_('AB_ST_ON', '1'); abStatsWrite_(); }
  else abStatsPreview_();
  return did + 1;
}

/* ───── آزمون: مسیر لیدهای خارج، بخش الف (v170.23.21) ───── */
function abTests() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, lead: TG_DRY_LEAD, by: tgLeadByCode_, info: tgTherapistInfo_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'ls:now': new Date('2026-10-08T10:00:00+03:30').getTime() };
  try {
    /* الف۵: داخل یا خارج */
    ok('شمارهٔ +۹۸ بی کشور و منطقه: داخل', abRegion_('+989121112233', '', '') === 'داخل ایران');   // pii:ok ساختگی
    ok('کشور افغانستان با شمارهٔ محلی: خارج', abRegion_('0791112233', '', 'افغانستان') === 'خارج از ایران');   // pii:ok ساختگی
    ok('منطقهٔ زمانی برلین با شمارهٔ ایران: خارج', abRegion_('09121112233', 'Europe/Berlin', '') === 'خارج از ایران');   // pii:ok ساختگی
    ok('کشور ایران از منطقهٔ زمانی مهم‌تر است', abRegion_('', 'Europe/London', 'ایران') === 'داخل ایران');
    ok('chat_id شماره نیست (روی کد قبلی «خارج» بود)', tgRegion_('5367159854') === '' && tgRegion_('+491701112233') === 'خارج از ایران');   // pii:ok ساختگی
    ok('منطقه و زمان مناسب از یادداشت قدیمی', abTzFromNote_('زمان مناسب: هر وقت · Europe/Berlin') === 'Europe/Berlin' && abBestFromNote_('زمان مناسب: هر وقت · Europe/Berlin') === 'هر وقت');
    /* الف۶: تاریخ و نوع لید */
    ok('تاریخ‌های قاطی ISO می‌شوند', abIso_('9/16/2026') === '2026-09-16' && abIso_('1405/06/31') === '2026-09-22' && abIso_(new Date('2026-10-03T10:00:00Z')) === '2026-10-03' && abIso_('2026-10-01') === '2026-10-01');
    ok('درخواست زوج با «پارتنرم» مراجع است، نه پارتنر', lmGuessType_('سایت › پذیرش › تراپی فارسی', 'زوج‌درمانی با پارتنرم') === LM_T.C && lmGuessType_('سایت › پارتنر › فضا', 'اتاق می‌خواهم') === LM_T.P);
    /* ب۸: صف ارسال با chat_id عددی */
    ok('صف ارسال: چند chat_id عددی با کاما', JSON.stringify(soResolve_('368181539,5367159854, 1369595367')) === JSON.stringify(['368181539', '5367159854', '1369595367']));   // pii:ok ساختگی
    /* الف۳: گارد سخت */
    TG_MEM['ab:ther'] = [{ name: 'درمانگر الف', status: 'فعال', row: 4 }, { name: 'درمانگر ب', status: 'پایان همکاری', row: 5 }, { name: 'درمانگر ج', status: 'نامعلوم', row: 6 }];
    ok('فقط «فعال»', abTherOkName_('درمانگر الف') && !abTherOkName_('درمانگر ب') && !abTherOkName_('درمانگر ج') && !abTherOkName_('ناشناس'));
    TG_DRY_LEAD = { row: 9, code: 'L-9', name: 'مراجع نمونه' }; tgLeadByCode_ = function () { return 9; }; TG_OUTBOX = [];
    tgReferSend_('801', 'L-9', 'درمانگر ج', '', true);
    ok('ارجاع به غیرفعال حتی با «بفرست» انجام نمی‌شود', TG_OUTBOX.length === 1 && /⛔/.test(TG_OUTBOX[0].text), JSON.stringify(TG_OUTBOX));
    /* الف۴: استخر خارج سخت */
    TG_MEM['poolmap'] = {}; TG_MEM['poolmap'][tgNorm_('درمانگر الف')] = { ind: 2, abroad: true }; TG_MEM['poolmap'][tgNorm_('درمانگر د')] = { ind: 2 }; TG_MEM['poolmap'][tgNorm_('درمانگر ه')] = { ind: 2 };
    var sl = [{ therapist: 'درمانگر الف', dateIso: '2026-10-10', hhmm: '20:00' }, { therapist: 'درمانگر د', dateIso: '2026-10-10', hhmm: '10:00' }, { therapist: 'درمانگر ه', dateIso: '2026-10-11', hhmm: '10:00' }];
    var f = tgPoolFilter_(sl, null, { topic: 'anx', abroad: true });
    ok('لید خارج فقط از استخر خارج، حتی وقتی یک نفر می‌ماند (قبلاً همه)', f.length === 1 && f[0].therapist === 'درمانگر الف', JSON.stringify(f));
    /* پنجرهٔ مراجع و تغییر ساعت */
    ok('ساعت ۲۰ تهران در مهر برای برلین ۱۸:۳۰ است (تابستانی)، در «شب»', abSlotInWin_(sl[0], 'Europe/Berlin', 'شب'));
    ok('همان ساعت در دی برای برلین ۱۷:۳۰ است، بیرون از «شب»', !abSlotInWin_({ therapist: 'x', dateIso: '2026-12-26', hhmm: '20:00' }, 'Europe/Berlin', 'شب'));
    var R = abRank_([{ name: 'درمانگر الف' }, { name: 'درمانگر د' }, { name: 'درمانگر ه' }], { country: 'آلمان', tz: 'Europe/Berlin', best: 'شب' },
      { info: { 'درمانگر ه': { tz: '🇩🇪 آلمان و اروپای مرکزی' }, 'درمانگر الف': {}, 'درمانگر د': {} }, stats: { 'درمانگر د': { sugAb: 4, introAb: 2 } }, slots: sl });
    ok('ترتیب خارج: مقیم همان کشور، بعد وقت در زمان مناسب، بعد نرخ خارج', R.map(function (x) { return x.name; }).join('|') === 'درمانگر ه|درمانگر الف|درمانگر د', R.map(function (x) { return x.name; }).join('|'));
    /* الف۱: آمار ۶۰ روزه */
    var L = [{ date: '2026-09-20', region: 'خارج از ایران', refs: ['درمانگر الف', 'درمانگر د'], refDate: '2026-09-20', introTher: 'درمانگر الف', introDate: '2026-09-25', booked: true, started: true, status: TG_ST.START, closed: false },
             { date: '2026-09-21', region: 'داخل ایران', refs: ['درمانگر الف'], refDate: '2026-09-21', introTher: '', introDate: '', booked: false, started: false, status: TG_ST.REF, closed: false },
             { date: '2026-07-01', region: 'داخل ایران', refs: ['درمانگر الف'], refDate: '2026-07-01', introTher: 'درمانگر الف', introDate: '2026-07-03', booked: true, started: false, status: TG_ST.HELD, closed: true }];
    var st = abStats_(L, TG_MEM['ls:now'], 60), a = st['درمانگر الف'];
    ok('پیشنهاد، معارفه و شروع در ۶۰ روز، جدا داخل و خارج', a.sug === 2 && a.intro === 1 && a.start === 1 && a.sugAb === 1 && a.sugIn === 1 && a.introAb === 1 && a.startAb === 1, JSON.stringify(a));
    ok('ارجاع باز الان و آخرین ارجاع', a.open === 2 && a.last === '2026-09-21', JSON.stringify(a));
    ok('رده: داده کم زیر ۳ پیشنهاد؛ با داده، کف ۸۰٪ با مبنا', /داده کم/.test(abTier_(a, 0.07)) && abTier_({ sug: 10, intro: 5 }, 0.07).charAt(0) === '۱' && abTier_({ sug: 20, intro: 0 }, 0.07).charAt(0) === '۴');
    ok('پیشنهاد سیستم: غیرفعال و بی‌وقت', /⛔/.test(abSuggest_({ status: 'نامعلوم' }, a, '۱', '2026-10-10 20:00', 0.07)) && /وقت معارفهٔ آزاد ندارد/.test(abSuggest_({ status: 'فعال' }, a, '۱', '', 0.07)) && /⭐/.test(abSuggest_({ status: 'فعال' }, a, '۱ اول', '2026-10-10 20:00', 0.07)));
    /* الف۱ و ۲: پیش‌نمایش، «اوکی»، نوشتن */
    TG_MEM['ab:leads'] = L; TG_MEM['ab:slots'] = sl.concat([{ therapist: 'درمانگر ج', dateIso: '2026-10-09', hhmm: '10:00' }]);
    var R2 = abThRows_(), rj = R2.rows.filter(function (x) { return x.name === 'درمانگر ج'; })[0], ra = R2.rows.filter(function (x) { return x.name === 'درمانگر الف'; })[0];
    ok('نزدیک‌ترین وقت تاریخ واقعی است (نه ۱۸۹۹) و برای غیرفعال خالی', ra.near === '2026-10-10 20:00' && rj.near === '' && /⛔/.test(rj.sys), JSON.stringify([ra.near, rj.near]));
    ok('روز اول فقط پیش‌نمایش؛ بعد از «اوکی» نوشتن', abDailyMaybe_() >= 1 && !!TG_MEM['ab:pv'] && !TG_MEM['ab:written']);
    TG_MEM['ab:pvok'] = 'اوکی'; TG_MEM['lsp:AB_ST_DAY'] = '';
    abDailyMaybe_();
    ok('با «اوکی» در «درمانگران» نوشته شد', !!TG_MEM['ab:written'] && TG_MEM['lsp:AB_ST_ON'] === '1');
    /* الف۵ و ۶: اصلاح داده با پیش‌نمایش */
    TG_MEM['ab:raw'] = { head: ['تاریخ', 'شماره / شناسه', 'داخل یا خارج', 'یادداشت', 'کشور محل زندگی', 'نوع لید', 'منبع', 'متن اولیه', 'نوع درخواست', 'کد لید', 'آخرین تماس', 'تاریخ ارجاع'],
      rows: [['2026-10-01', "'+989121112233", 'خارج از ایران', 'chat_id: 1', '', LM_T.C, 'Telegram bot', '', '', 'L-1', '9/16/2026', '1405/06/31'],   // pii:ok ساختگی
             ['2026-10-02', "'0791112233", 'داخل ایران', '', 'افغانستان', LM_T.C, 'سایت', '', '', 'L-2', '2026-10-02', ''],   // pii:ok ساختگی
             ['2026-10-03', "'+491701112233", 'خارج از ایران', '', '', LM_T.P, 'سایت › پذیرش › تراپی فارسی', 'زوج‌درمانی', 'زوج‌درمانی', 'L-3', '', '']] };   // pii:ok ساختگی
    var fx = abFixRows_(), has = function (code, col, to) { return fx.some(function (r) { return r.code === code && r.col === col && r.to === to; }); };
    ok('اصلاح: +۹۸ داخل، افغانستان خارج، زوج مراجع، تاریخ ISO', has('L-1', 'داخل یا خارج', 'داخل ایران') && has('L-2', 'داخل یا خارج', 'خارج از ایران') && has('L-3', 'نوع لید', LM_T.C) &&
      has('L-1', 'آخرین تماس', '2026-09-16') && has('L-1', 'تاریخ ارجاع', '2026-09-22') && !fx.some(function (r) { return r.code === 'L-2' && r.col === 'آخرین تماس'; }), JSON.stringify(fx));
    ok('اصلاح فقط بعد از «اوکی»', !(TG_MEM['ab:applied'] || []).length);
    TG_MEM['ab:fxok'] = 'اوکی'; TG_MEM['lsp:AB_ST_DAY'] = lsDay_(); abDailyMaybe_();
    ok('با «اوکی» یک بار اعمال شد', (TG_MEM['ab:applied'] || []).length === fx.length && TG_MEM['lsp:AB_FX_DONE'] === '1');
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; TG_DRY_LEAD = keep.lead; tgLeadByCode_ = keep.by; tgTherapistInfo_ = keep.info; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'abTests'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['لیدهای خارج · مبنای ارجاع و داده (v170.23.21)', 'abTests']); } catch (eAb) {}

/* ═════════════ v170.23.22 · مسیر لیدهای خارج، بخش ب: راهبری پذیرش ═════════════
   - پنجرهٔ تماس (تهران): «زمان مناسب» به ساعت خود مراجع ∩ ۹:۳۰ تا ۲۲:۰۰ تهران؛ اگر اشتراکی نبود، اولین صبحِ او. با تغییر ساعت خود منطقه.
     روی کارت لید، اعلان SLA، دایجست، کارتابل و «📞 برنامهٔ تماس امروز». ستون «پنجرهٔ تماس (تهران)» در انتهای «لیدها» هر ساعت تازه می‌شود.
   - SLA لید خارج: یادآوری در شروع پنجره، نه لحظهٔ رسیدن؛ ۲ ساعت کاری داخل پنجره ← مسئول پذیرش؛ ۴ ساعت ← یاسر (مالک).
   - لید خارج از بات با chat: همان لحظه دو وقت معارفه از استخر خارج به ساعت خود مراجع، رزرو همان مسیر کارت لید، و «وقت دیگر».
   - چرخهٔ سه‌تماسه: بی‌پاسخ ۱ ← روز ۳ کانال دیگر؛ بی‌پاسخ ۲ ← روز ۷ پیام «در باز است»؛ بی‌پاسخ ۳ ← پیشنهاد بستن. «✉️ پیام دادم».
   - بعد از معارفه: ۲۴ ساعت بی نتیجه ← پرسش از درمانگر و کارت پذیرش؛ «رزرو شد» بی‌تاریخ یا گذشته هر روز در دایجست صبح. */
var AB_TEH_FROM = 570, AB_TEH_TO = 1320;   /* ۹:۳۰ تا ۲۲:۰۰ تهران، دقیقه از نیمه‌شب */
var AB_WIN_COL = 'پنجرهٔ تماس (تهران)';
var AB_PLAN_BTN = '📞 برنامهٔ تماس امروز';
/** اختلاف منطقهٔ زمانی با UTC در لحظهٔ ms (دقیقه)؛ از ساعت دیواری، تا با تغییر ساعت تابستانی خود منطقه درست باشد */
function abOffMin_(tz, ms) { var w = Utilities.formatDate(new Date(ms), tz, 'yyyy-MM-dd HH:mm'); return Math.round((new Date(w.replace(' ', 'T') + ':00Z').getTime() - Math.floor(ms / 60000) * 60000) / 60000); }
function abHm_(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return tgFa_(('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2)); }
/** پنجرهٔ تماس یک روز: {from, to} دقیقهٔ تهران و همان به ساعت مراجع؛ dayMs یک لحظه از همان روز */
function abWinTehran_(tz, best, dayMs) {
  tz = String(tz || '').trim() || TG_TZ;
  var w = abLocalWin_(best) || abLocalWin_('هر وقت'), shift;
  try { shift = abOffMin_(TG_TZ, dayMs) - abOffMin_(tz, dayMs); } catch (e) { tz = TG_TZ; shift = 0; }
  var cut = function (lo, hi) { var a = Math.max(lo * 60 + shift, AB_TEH_FROM), b = Math.min(hi * 60 + shift, AB_TEH_TO); return a < b ? { from: a, to: b } : null; };
  var r = cut(w[0], w[1]) || cut(9, 12);
  if (!r) r = { from: Math.max(0, 9 * 60 + shift), to: Math.min(1439, 12 * 60 + shift), edge: true };
  r.tz = tz; r.shift = shift; return r;
}
function abWinLabel_(tz, best, dayMs) {
  var r = abWinTehran_(tz, best, dayMs || lsNow_()), loc = r.tz !== TG_TZ;
  return abHm_(r.from) + ' تا ' + abHm_(r.to) + (loc ? ' (به وقت او ' + abHm_(r.from - r.shift) + ' تا ' + abHm_(r.to - r.shift) + ')' : '');
}
function abTehMinOf_(ms) { return Number(Utilities.formatDate(new Date(ms), TG_TZ, 'H')) * 60 + Number(Utilities.formatDate(new Date(ms), TG_TZ, 'm')); }
function abInWinNow_(tz, best, nowMs) { nowMs = nowMs || lsNow_(); var r = abWinTehran_(tz, best, nowMs), m = abTehMinOf_(nowMs); return m >= r.from && m < r.to; }
/** دقیقه‌های داخل پنجره از fromMs تا toMs (حداکثر ۱۴ روز) */
function abInWinMin_(fromMs, toMs, tz, best) {
  if (!fromMs || toMs <= fromMs) return 0;
  var sum = 0, start = Math.max(fromMs, toMs - 14 * 86400000);
  for (var d = 0; d <= 14; d++) {
    var dayMs = start + d * 86400000; if (dayMs > toMs + 86400000) break;
    var iso = Utilities.formatDate(new Date(dayMs), TG_TZ, 'yyyy-MM-dd'), base = new Date(iso + 'T00:00:00+03:30').getTime();
    var r = abWinTehran_(tz, best, base + 12 * 3600000), a = Math.max(base + r.from * 60000, start), b = Math.min(base + r.to * 60000, toMs);
    if (b > a) sum += (b - a) / 60000;
    if (base + 86400000 > toMs) break;
  }
  return Math.round(sum);
}
/** شروع نزدیک‌ترین پنجرهٔ امروز یا فردا (ms) */
function abWinStartMs_(tz, best, nowMs) {
  for (var d = 0; d < 3; d++) {
    var iso = Utilities.formatDate(new Date(nowMs + d * 86400000), TG_TZ, 'yyyy-MM-dd'), base = new Date(iso + 'T00:00:00+03:30').getTime();
    var r = abWinTehran_(tz, best, base + 12 * 3600000), s = base + r.from * 60000, e = base + r.to * 60000;
    if (e > nowMs) return Math.max(s, nowMs);
  }
  return nowMs;
}
/** منطقهٔ زمانی و زمان مناسب یک لید (ستون‌های تازه، وگرنه یادداشت قدیمی) */
function abLeadTz_(l) { return String(l.tz || '').trim() || abTzFromNote_(l.memo || l.note || ''); }
function abLeadBest_(l) { return String(l.best || '').trim() || abBestFromNote_(l.memo || l.note || ''); }

/* ───── SLA لید خارج ───── */
/** مرحلهٔ خواسته برای لید خارج بی‌تماس: ۰ هیچ، ۱ شروع پنجره (مسئول)، ۲ دو ساعت کاری (مسئول پذیرش)، ۳ چهار ساعت (یاسر) */
function abSlaStage_(l, nowMs) {
  var tz = abLeadTz_(l), best = abLeadBest_(l), arr = nowMs - (l.age || 0) * 60000;
  var wm = abInWinMin_(arr, nowMs, tz, best);
  if (wm >= 240) return 3;
  if (wm >= 120) return 2;
  return abInWinNow_(tz, best, nowMs) ? 1 : 0;
}

/* ───── پیشنهاد دو وقت به لید خارج از بات ───── */
var AB_OFFER_TXT = 'سلام، پیامتان به مرکز تجربه زندگی رسید. برای جلسهٔ معارفهٔ رایگان این وقت‌ها به ساعت شما آزاد است. یکی را انتخاب کنید تا همین‌جا رزرو شود. اگر هیچ‌کدام نشد، «وقت دیگر» را بزنید تا همکاران پذیرش خودشان هماهنگ کنند.';
/** دو وقت از استخر خارج، فقط درمانگر فعال، ترجیحاً در پنجرهٔ مراجع و از دو درمانگر */
function abTwoSlots_(lead, topic) {
  var all = lsDry_() ? (TG_MEM['ab:slots'] || []) : (function () { try { return tgFreeSlots_('خارج از ایران'); } catch (e) { return []; } })();
  var now = lsNow_(), info = lsDry_() ? null : tgTherapistInfo_();
  var ok = all.filter(function (s) {
    if (tgSlotUtc_(s).getTime() - now < (typeof TG_MIN_LEAD_MS !== 'undefined' ? TG_MIN_LEAD_MS : 3 * 3600000)) return false;
    return info ? abTherOk_(info[s.therapist]) : abTherOkName_(s.therapist);
  });
  ok = tgPoolFilter_(ok, null, { topic: topic || '', abroad: true }) || [];
  var tz = abLeadTz_(lead), best = abLeadBest_(lead);
  var inW = ok.filter(function (s) { return abSlotInWin_(s, tz, best); });
  var order = (inW.length ? inW : []).concat(ok.filter(function (s) { return inW.indexOf(s) < 0; })), pick = [], seen = {};
  order.forEach(function (s) { if (pick.length < 2 && !seen[s.therapist]) { seen[s.therapist] = 1; pick.push(s); } });
  order.forEach(function (s) { if (pick.length < 2 && pick.indexOf(s) < 0) pick.push(s); });
  return pick;
}
function abSlotLocal_(s, tz) {
  var utc = tgSlotUtc_(s), z = String(tz || '') || TG_TZ;
  return tgDay_(Utilities.formatDate(utc, z, 'EEE')) + ' ' + tgFa_(Utilities.formatDate(utc, z, 'HH:mm')) + (z !== TG_TZ ? ' به وقت شما' : ' به وقت تهران');
}
/** از tgOnPhone_ بعد از ساخت لید: فقط لید خارج با chat */
function abOfferTwo_(chat, row, lead) {
  if (!chat || !/خارج/.test(String(lead.region || ''))) return false;
  var two = abTwoSlots_(lead, lead.topic);
  if (!two.length) return false;
  tgSetVal_('abo', chat, JSON.stringify({ row: row, code: lead.code || '', s: two }));
  var kb = two.map(function (s, i) { return [{ text: '🗓 ' + abSlotLocal_(s, abLeadTz_(lead)), callback_data: 'abk:' + i }]; });
  kb.push([{ text: 'وقت دیگر', callback_data: 'abk:x' }]);
  tgSend_(chat, AB_OFFER_TXT, { inline_keyboard: kb });
  try { tgLeadNote_(row, 'دو وقت معارفه از استخر خارج پیشنهاد شد', 'بات'); } catch (e) {}
  return true;
}
/** کلیک مراجع روی وقت پیشنهادی یا «وقت دیگر» */
function abOfferCb_(chat, data, name) {
  var o = null; try { o = JSON.parse(tgGetVal_('abo', chat) || 'null'); } catch (e) {}
  if (!o) return tgSend_(chat, 'این پیشنهاد دیگر معتبر نیست. از منو «وقت معارفه» را بزنید.');
  var a = String(data).split(':')[1];
  if (a === 'x') {
    tgDel_('abo', chat);
    try { tgLeadNote_(o.row, 'مراجع «وقت دیگر» را زد؛ هماهنگی با پذیرش', 'مراجع'); tgLeadSet_(o.row, { 'اقدام بعدی': 'هماهنگی وقت معارفهٔ دیگر', 'تاریخ اقدام بعدی': lsDay_() }, 'بات', 'بات', 'وقت دیگر'); } catch (e2) {}
    try { if (typeof inbAdd_ === 'function') inbAdd_('lead', o.code || ('row:' + o.row), { chat: String(chat), text: 'مراجع خارج «وقت دیگر» خواست', q: 'پذیرش', type: 'هماهنگی معارفه' }); } catch (e3) {}
    return tgSend_(chat, 'ثبت شد. همکاران پذیرش برای هماهنگی وقت پیام می‌دهند.');
  }
  var s = (o.s || [])[Number(a)];
  if (!s) return tgSend_(chat, 'این وقت دیگر در دست نیست.');
  tgDel_('abo', chat);
  return abBook_(chat, o.row, s);
}
/** رزرو مستقیم همان مسیر کارت لید (tgLeadBook_)، با مالک «بات» */
function abBook_(chat, row, s) {
  if (lsDry_()) { (TG_MEM['ab:booked'] = TG_MEM['ab:booked'] || []).push({ row: row, s: s }); return true; }
  tgSetVal_('ldbs', chat, JSON.stringify([s]));
  return tgLeadBook_({ message: { chat: { id: chat } } }, 'بات', row, '', 0);
}

/* ───── چرخهٔ سه‌تماسه ───── */
/** بعد از n امین بی‌پاسخ: {next, days} یا null (پیشنهاد بستن) */
function abNoansNext_(n) {
  if (n <= 1) return { next: 'تماس از کانال دیگر (پیام واتس‌اپ یا تلگرام)', days: 2 };
  if (n === 2) return { next: 'پیام «در باز است»', days: 4 };
  return null;
}

/* ───── ستون پنجره، بعد از معارفه، دایجست ───── */
/** هر ساعت: ستون پنجرهٔ تماس برای لیدهای باز؛ معارفهٔ بی نتیجه ۲۴ ساعت بعد */
function abHourly_() {
  if (lsDry_()) return 0;
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh ? sh.getLastRow() : 0; if (last < 2) return 0;
  var hm = tgLeadHeadMap_(sh), wc = tgLeadCol_(AB_WIN_COL), from = Math.max(2, last - 400);
  var v = sh.getRange(from, 1, last - from + 1, sh.getLastColumn()).getValues(), n = 0;
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : String(r[i] || '').trim(); };
  v.forEach(function (r, i) {
    if (tgStClosed_(g(r, 'وضعیت')) || (!String(r[3] || '').trim() && !String(r[5] || '').trim())) return;
    var tz = g(r, 'منطقهٔ زمانی') || abTzFromNote_(g(r, 'یادداشت')), best = g(r, 'زمان مناسب') || abBestFromNote_(g(r, 'یادداشت'));
    var lbl = abWinLabel_(tz, best), cur = wc && r[wc - 1] != null ? String(r[wc - 1]) : '';
    if (wc && lbl !== cur) { sh.getRange(from + i, wc).setValue(lbl); n++; }
  });
  try { abAfterIntro_(); } catch (e) { tgErr_('abAfterIntro_', e); }
  return n;
}
/** «معارفه رزرو شد» بی‌تاریخ یا گذشته و بی نتیجه */
function abIntroGaps_(list, today, nowMs) {
  return list.filter(function (l) { return l.status === TG_ST.BOOKED; }).map(function (l) {
    var d = String(l.meetDate || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { l: l, why: 'رزرو شده ولی تاریخ معارفه ندارد' };
    var ms = new Date(d + 'T23:59:00+03:30').getTime();
    if (nowMs - ms >= 0) return { l: l, why: 'تاریخ معارفه گذشته (' + tgLeadJ_(d) + ')، نتیجه ثبت نشده' + (nowMs - ms >= 86400000 ? '' : ' (امروز)') };
    return null;
  }).filter(Boolean);
}
/** ۲۴ ساعت بعد از معارفهٔ بی نتیجه: یک بار پرسش از درمانگر و کارت پذیرش */
function abAfterIntro_() {
  var day = lsDay_(), now = lsNow_(), asked = lsJson_('AB_ASKED', {}), ch = false;
  abIntroGaps_(lsLeads_(400), day, now).forEach(function (x) {
    var l = x.l, d = String(l.meetDate || '').slice(0, 10); if (!l.code || asked[l.code]) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || now - new Date(d + 'T23:59:00+03:30').getTime() < 0) return;
    asked[l.code] = day; ch = true;
    var th = l.meetTher ? tgTherChatByName_(l.meetTher) : null;
    if (th) tgSend_(th, '🗓 <b>نتیجهٔ معارفه</b>\n\nمعارفهٔ ' + tgEsc_(l.code) + ' در ' + tgEsc_(tgLeadJ_(d)) + ' ثبت نتیجه ندارد. برگزار شد؟ ادامه می‌دهد؟\nلطفاً همین‌جا بنویسید یا به پذیرش خبر دهید.');
    lsDeskChats_().slice(0, 1).forEach(function (c) { tgNotify_(c, TG_NK.task, '🗓 <b>معارفهٔ بی نتیجه، ۲۴ ساعت گذشته</b>\n\n' + tgLeadCardText_(l), { ref: l.code, markup: tgLeadKb_(l) }); });
  });
  if (ch) { var keys = Object.keys(asked); keys.forEach(function (k) { if (asked[k] < Utilities.formatDate(new Date(now - 30 * 86400000), TG_TZ, 'yyyy-MM-dd')) delete asked[k]; }); lsProp_('AB_ASKED', JSON.stringify(asked)); }
}
/** بخش دایجست صبح: معارفه‌های رزروشدهٔ بی‌تاریخ یا گذشته */
function abDigestIntro_(leads) {
  var g = abIntroGaps_(leads || [], lsDay_(), lsNow_()); if (!g.length) return '';
  return '\n\n<b>🗓 معارفهٔ رزروشده بی‌تاریخ یا بی‌نتیجه</b>\n' + g.slice(0, 10).map(function (x) { return '• ' + tgEsc_(x.l.code || ('سطر ' + x.l.row)) + ' · ' + tgEsc_(x.why); }).join('\n');
}

/* ───── برنامهٔ تماس امروز ───── */
function abPlanRows_(leads, nowMs) {
  var today = Utilities.formatDate(new Date(nowMs), TG_TZ, 'yyyy-MM-dd');
  return (leads || []).filter(function (l) { return !l.closed && l.code && (!l.touched || !l.nextDate || l.nextDate <= today); }).map(function (l) {
    var tz = abLeadTz_(l), best = abLeadBest_(l), r = abWinTehran_(tz, best, nowMs), inNow = abInWinNow_(tz, best, nowMs);
    var due = !l.touched || (l.nextDate && l.nextDate <= today);
    return { l: l, from: r.from, to: r.to, inNow: inNow, late: inNow && due && (!l.touched || (l.nextDate && l.nextDate < today)), label: abWinLabel_(tz, best, nowMs) };
  }).sort(function (a, b) { return (b.late - a.late) || (b.inNow - a.inNow) || (a.from - b.from) || ((a.l.code < b.l.code) ? -1 : 1); });
}
function abPlanText_(rows) {
  if (!rows.length) return '📞 <b>برنامهٔ تماس امروز</b>\n\nامروز تماسی در صف نیست 🌿';
  return '📞 <b>برنامهٔ تماس امروز</b> · ' + tgFa_(rows.length) + ' لید (ساعت تهران)\n\n' + rows.slice(0, 30).map(function (x) {
    return (x.late ? '🔴 ' : (x.inNow ? '🟠 ' : '⚪️ ')) + abHm_(x.from) + ' تا ' + abHm_(x.to) + ' · <b>' + tgEsc_(x.l.code) + '</b> · ' + tgEsc_(String(x.l.name || 'بی‌نام').split(/\s+/)[0]) +
      (/خارج/.test(x.l.region || '') ? ' 🌍' : '') + (x.l.next ? ' · ' + tgEsc_(x.l.next) : (x.l.touched ? '' : ' · تماس اول'));
  }).join('\n') + '\n\n🔴 الان داخل پنجره و دیرشده · 🟠 الان داخل پنجره · ⚪️ بیرون از پنجره';
}
function abPlanSend_(chat) {
  var rows = abPlanRows_(lsDry_() ? (TG_MEM['ls:leads'] || []) : tgOpenLeads_().map(function (o) { try { var x = tgLeadRead_(o.row); if (x) { x.tz = o.tz; x.best = o.best; } return x || o; } catch (e) { return o; } }), lsNow_());
  var kb = rows.slice(0, 8).map(function (x) { return [{ text: '📇 ' + x.l.code, callback_data: 'ld:back:' + x.l.code }]; });
  return tgSend_(chat, abPlanText_(rows), kb.length ? { inline_keyboard: kb } : null);
}

/* ───── آزمون: مسیر لیدهای خارج، بخش ب (v170.23.22) ───── */
function abTests2() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM, box: TG_OUTBOX, note: tgLeadNote_, set: tgLeadSet_ };
  TG_DRY = true; TG_OUTBOX = []; TG_MEM = { 'ls:now': new Date('2026-10-08T12:00:00+03:30').getTime() };
  try {
    var oct = new Date('2026-10-08T12:00:00+03:30').getTime(), jan = new Date('2027-01-08T12:00:00+03:30').getTime();
    ok('پنجرهٔ برلین «شب» در مهر: ۱۹:۳۰ تا ۲۲:۰۰ تهران (۱۸ تا ۲۰:۳۰ او)', abWinLabel_('Europe/Berlin', 'شب', oct) === '۱۹:۳۰ تا ۲۲:۰۰ (به وقت او ۱۸:۰۰ تا ۲۰:۳۰)', abWinLabel_('Europe/Berlin', 'شب', oct));
    ok('همان در دی (ساعت زمستانی): ۲۰:۳۰ تا ۲۲:۰۰', abWinLabel_('Europe/Berlin', 'شب', jan).indexOf('۲۰:۳۰ تا ۲۲:۰۰') === 0, abWinLabel_('Europe/Berlin', 'شب', jan));
    ok('ونکوور «شب» بیرون از ۹:۳۰ تا ۲۲ است ← اولین صبحِ او', abWinLabel_('America/Vancouver', 'شب', oct).indexOf('۱۹:۳۰ تا ۲۲:۰۰') === 0, abWinLabel_('America/Vancouver', 'شب', oct));
    ok('بی منطقه و بی زمان مناسب: «هر وقت» به تهران، ۱۰ تا ۲۰', abWinLabel_('', '', oct) === '۱۰:۰۰ تا ۲۰:۰۰');
    var arr = new Date('2026-10-08T08:00:00+03:30').getTime();
    ok('دقیقه‌های داخل پنجره: ۸ تا ۱۲ تهران با پنجرهٔ ۱۰ تا ۲۰ ← ۱۲۰', abInWinMin_(arr, oct, '', '') === 120, abInWinMin_(arr, oct, '', ''));
    ok('SLA خارج: لید رسیده بیرون از پنجره هنوز یادآوری نمی‌گیرد', abSlaStage_({ age: 60, tz: 'Europe/Berlin', best: 'شب' }, oct) === 0);
    var eve = new Date('2026-10-08T20:00:00+03:30').getTime();
    ok('SLA خارج: شروع پنجره ← ۱، بعد از ۲ ساعت کاری ← ۲ (مسئول پذیرش)', abSlaStage_({ age: 30, tz: 'Europe/Berlin', best: 'شب' }, eve) === 1 &&
       abSlaStage_({ age: 24 * 60, tz: 'Europe/Berlin', best: 'شب' }, new Date('2026-10-08T21:45:00+03:30').getTime()) === 2);
    ok('SLA خارج: ۴ ساعت کاری در پنجره ← ۳ (یاسر)', abSlaStage_({ age: 2 * 24 * 60, tz: 'Europe/Berlin', best: 'شب' }, new Date('2026-10-08T21:45:00+03:30').getTime()) === 3);
    ok('سه‌تماسه: ۱ کانال دیگر +۲، ۲ «در باز است» +۴، ۳ پیشنهاد بستن', abNoansNext_(1).days === 2 && /در باز است/.test(abNoansNext_(2).next) && abNoansNext_(2).days === 4 && abNoansNext_(3) === null);
    /* پیشنهاد دو وقت */
    TG_MEM['ab:ther'] = [{ name: 'درمانگر الف', status: 'فعال' }, { name: 'درمانگر ب', status: 'فعال' }, { name: 'درمانگر ج', status: 'نامعلوم' }];
    TG_MEM['poolmap'] = {}; ['درمانگر الف', 'درمانگر ب', 'درمانگر ج'].forEach(function (n) { TG_MEM['poolmap'][tgNorm_(n)] = { ind: 2, abroad: true }; }); TG_MEM['poolmap'][tgNorm_('درمانگر د')] = { ind: 2 };
    TG_MEM['ab:slots'] = [{ therapist: 'درمانگر ج', dateIso: '2026-10-09', hhmm: '20:00' }, { therapist: 'درمانگر د', dateIso: '2026-10-09', hhmm: '20:30' },
      { therapist: 'درمانگر الف', dateIso: '2026-10-09', hhmm: '11:00' }, { therapist: 'درمانگر ب', dateIso: '2026-10-10', hhmm: '20:00' }, { therapist: 'درمانگر الف', dateIso: '2026-10-10', hhmm: '20:30' }];
    var two = abTwoSlots_({ tz: 'Europe/Berlin', best: 'شب' }, '');
    ok('دو وقت: فقط فعال و استخر خارج، اول داخل پنجره، از دو درمانگر', two.length === 2 && two[0].therapist === 'درمانگر ب' && two[1].therapist === 'درمانگر الف' && two[1].hhmm === '20:30', JSON.stringify(two));
    tgLeadNote_ = function () {}; tgLeadSet_ = function (r, ch) { TG_MEM['ab:set'] = ch; return 'L-7'; };
    TG_OUTBOX = [];
    ok('پیام پیشنهاد: متن تأییدشده، دو وقت به ساعت مراجع و «وقت دیگر»', abOfferTwo_('7001', 7, { region: 'خارج از ایران', tz: 'Europe/Berlin', best: 'شب', code: 'L-7' }) &&
       TG_OUTBOX[0].text === AB_OFFER_TXT && /به وقت شما/.test(JSON.stringify(TG_OUTBOX[0])) && /abk:x/.test(JSON.stringify(TG_OUTBOX[0])), JSON.stringify(TG_OUTBOX[0]).slice(0, 300));
    ok('لید داخل پیشنهاد نمی‌گیرد', !abOfferTwo_('7002', 8, { region: 'داخل ایران' }));
    abOfferCb_('7001', 'abk:0', 'مراجع');
    ok('انتخاب وقت ← رزرو همان مسیر کارت لید', (TG_MEM['ab:booked'] || []).length === 1 && TG_MEM['ab:booked'][0].s.therapist === 'درمانگر ب');
    abOfferTwo_('7001', 7, { region: 'خارج از ایران', tz: 'Europe/Berlin', best: 'شب', code: 'L-7' }); TG_OUTBOX = [];
    abOfferCb_('7001', 'abk:x', 'مراجع');
    ok('«وقت دیگر» ← اقدام بعدی برای پذیرش و پیام کوتاه', /هماهنگی وقت/.test((TG_MEM['ab:set'] || {})['اقدام بعدی'] || '') && /پذیرش/.test(TG_OUTBOX[0].text));
    /* برنامهٔ تماس و کارتابل */
    var L = [{ code: 'L-1', name: 'الف', region: 'خارج از ایران', tz: 'Europe/Berlin', best: 'صبح', touched: false, age: 600, closed: false },
             { code: 'L-2', name: 'ب', region: 'داخل ایران', tz: '', best: '', touched: true, nextDate: '2026-10-07', closed: false },
             { code: 'L-3', name: 'ج', region: 'خارج از ایران', tz: 'America/Vancouver', best: 'شب', touched: false, age: 60, closed: false }];
    var P = abPlanRows_(L, oct);
    ok('برنامهٔ تماس: اول دیرشده‌های داخل پنجره به ترتیب شروع پنجره، بعد بیرون از پنجره', P.map(function (x) { return x.l.code; }).join('|') === 'L-2|L-1|L-3' && P[0].late && P[1].late && !P[2].inNow, P.map(function (x) { return x.l.code + ':' + x.late + ':' + x.inNow; }).join(' '));
    ok('متن برنامه با ساعت تهران و راهنمای رنگ', /🔴 /.test(abPlanText_(P)) && /⚪️ /.test(abPlanText_(P)) && /ساعت تهران/.test(abPlanText_(P)));
    ok('دکمهٔ «📞 برنامهٔ تماس امروز» در منوی پذیرش', JSON.stringify(tgDeskMenu_()).indexOf(AB_PLAN_BTN) > -1);
    /* بعد از معارفه */
    var G = abIntroGaps_([{ code: 'L-11', status: TG_ST.BOOKED, meetDate: '' }, { code: 'L-12', status: TG_ST.BOOKED, meetDate: '2026-10-01' }, { code: 'L-13', status: TG_ST.BOOKED, meetDate: '2026-10-20' }, { code: 'L-14', status: TG_ST.HELD, meetDate: '' }], '2026-10-08', oct);
    ok('دایجست: رزرو بی‌تاریخ و گذشتهٔ بی‌نتیجه، نه آینده و نه برگزارشده', G.map(function (x) { return x.l.code; }).join('|') === 'L-11|L-12' && /معارفهٔ رزروشده/.test(abDigestIntro_([{ code: 'L-11', status: TG_ST.BOOKED, meetDate: '' }])));
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; TG_OUTBOX = keep.box; tgLeadNote_ = keep.note; tgLeadSet_ = keep.set; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'abTests2'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['لیدهای خارج · راهبری پذیرش (v170.23.22)', 'abTests2']); } catch (eAb2) {}

/* ═════════════ v170.23.23 · قیف خارج از ایران (اندازه‌گیری، د۲) ═════════════
   تب «قیف خارج از ایران» در هاب آمار، هفتگی (شنبه تا جمعه، تهران)، از «لیدها»، «رویدادهای لید» و «کلیک‌های تماس»، با همان هشت مرحلهٔ
   چارچوب لید. مرحلهٔ ۱ (رسیدن) از لوکر با دایمنشن is_abroad است و ۸ (ماندگاری) هنوز اندازه گرفته نمی‌شود؛ هر دو «—».
   هر شنبه (یا اگر تب نیست) از نو ساخته می‌شود؛ فقط شمارش، بی نام و شماره. */
var AB_FN_TAB = 'قیف خارج از ایران';
var AB_FN_HEAD = ['هفته (شنبه)', '۱ رسیدن', '۲ اقدام', '۳ لید', '۴ تماس اول', 'تماس اول تا ۲ ساعت', '۵ ارجاع', '۶ معارفه', '۷ شروع درمان', '۸ ماندگاری', 'بی‌پاسخ نهایی', 'نرخ تماس ۲ ساعته'];
/** شنبهٔ هفتهٔ یک تاریخ ISO */
function abWeekOf_(iso) { var d = new Date(iso + 'T12:00:00+03:30'), w = Number(Utilities.formatDate(d, TG_TZ, 'u')); var back = (w + 1) % 7; return Utilities.formatDate(new Date(d.getTime() - back * 86400000), TG_TZ, 'yyyy-MM-dd'); }
/** leads: [{code, date, time, region, refs, booked, introDate, started, status, closed, reason}]، firstMs: {کد: ms اولین تماس}، clicks: [iso] */
function abFunnelRows_(leads, firstMs, clicks, weeks, nowMs) {
  var start = abWeekOf_(Utilities.formatDate(new Date(nowMs - (weeks - 1) * 7 * 86400000), TG_TZ, 'yyyy-MM-dd')), W = {}, order = [];
  for (var i = 0; i < weeks; i++) { var k = abWeekOf_(Utilities.formatDate(new Date(new Date(start + 'T12:00:00+03:30').getTime() + i * 7 * 86400000), TG_TZ, 'yyyy-MM-dd')); if (!W[k]) { W[k] = { act: 0, lead: 0, first: 0, fast: 0, ref: 0, intro: 0, start: 0, noans: 0 }; order.push(k); } }
  (clicks || []).forEach(function (d) { var k = abWeekOf_(d); if (W[k]) W[k].act++; });
  leads.forEach(function (l) {
    if (!/خارج/.test(l.region || '') || !l.date) return;
    var k = abWeekOf_(l.date), w = W[k]; if (!w) return;
    w.lead++;
    var arr = new Date(l.date + 'T' + (/^\d{1,2}:\d{2}$/.test(l.time || '') ? ('0' + l.time).slice(-5) : '00:00') + ':00+03:30').getTime(), f = firstMs[l.code];
    if (f || l.touched) w.first++;
    if (f && f - arr <= 2 * 3600000) w.fast++;
    if ((l.refs || []).length || [TG_ST.REF, TG_ST.BOOKED, TG_ST.HELD, TG_ST.START].indexOf(l.status) > -1) w.ref++;
    if (l.booked || l.introDate || [TG_ST.BOOKED, TG_ST.HELD, TG_ST.START].indexOf(l.status) > -1) w.intro++;
    if (l.started || l.status === TG_ST.START) w.start++;
    if (l.closed && /پاسخ نداد/.test(l.reason || '')) w.noans++;
  });
  return order.map(function (k) { var w = W[k]; return [k, '—', w.act, w.lead, w.first, w.fast, w.ref, w.intro, w.start, '—', w.noans, w.lead ? Math.round(1000 * w.fast / w.lead) / 10 + '٪' : '']; });
}
function abFunnelBuild_() {
  if (lsDry_()) return TG_MEM['ab:fn'] = abFunnelRows_(TG_MEM['ab:fnleads'] || [], TG_MEM['ab:fnfirst'] || {}, TG_MEM['ab:fnclicks'] || [], 8, lsNow_());
  var sh = tgSS_().getSheetByName(TG_LEADS), last = sh.getLastRow(), hm = tgLeadHeadMap_(sh);
  var v = last > 1 ? sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues() : [];
  var g = function (r, h) { var i = hm[h]; return (i === undefined || i < 0 || i >= r.length) ? '' : r[i]; };
  var leads = v.map(function (r) {
    var st = tgStOf_(String(g(r, 'وضعیت') || '').trim()) || String(g(r, 'وضعیت') || '').trim();
    return { code: String(g(r, 'کد لید') || '').trim(), date: abIso_(r[0]), time: tgLatinDigits_(String(r[1] || '').trim()), region: String(r[6] || ''), touched: !!String(r[10] || '').trim(),
      refs: [g(r, 'درمانگر پیشنهادی ۱'), g(r, 'درمانگر پیشنهادی ۲'), g(r, 'درمانگر پیشنهادی ۳')].filter(function (x) { return String(x || '').trim(); }),
      booked: String(g(r, 'معارفه هماهنگ شد؟') || '').trim() === 'بله', introDate: abIso_(g(r, 'تاریخ معارفه')), started: /بله|شروع/.test(String(g(r, 'شروع درمان؟') || '')),
      status: st, closed: tgStClosed_(String(g(r, 'وضعیت') || '')), reason: String(g(r, 'دلیل بستن') || '') };
  });
  var first = {}, ev = tgSS_().getSheetByName(TG_LEAD_EV_TAB);
  if (ev && ev.getLastRow() > 1) ev.getRange(2, 1, ev.getLastRow() - 1, 8).getValues().forEach(function (e) {
    var code = String(e[1] || '').trim(), what = String(e[5] || ''), t = e[0] instanceof Date ? e[0].getTime() : 0;
    if (!code || !t || !/تماس|بی‌پاسخ|پیام نوشتاری|آخرین تماس/.test(what + ' ' + String(e[7] || ''))) return;
    if (!first[code] || t < first[code]) first[code] = t;
  });
  var clicks = [];
  try { var cs = tgSS_().getSheetByName('کلیک‌های تماس'); if (cs && cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, 7).getValues().forEach(function (c) { if (/persian-therapy|PT-|abroad/i.test(String(c[3]) + ' ' + String(c[4]) + ' ' + String(c[6]))) clicks.push(c[0] instanceof Date ? lsDay_(c[0].getTime()) : abIso_(c[0])); }); } catch (eC) {}
  var rows = abFunnelRows_(leads, first, clicks.filter(String), 12, lsNow_());
  var ss = tgStatSS_(), t = ss.getSheetByName(AB_FN_TAB) || ss.insertSheet(AB_FN_TAB);
  t.clear(); t.setRightToLeft(true);
  t.getRange(1, 1).setValue('🌍 قیف خارج از ایران · هفتگی · ساخت ' + lsDay_() + ' · ۱ رسیدن: لوکر با is_abroad · ۸ ماندگاری: هنوز اندازه گرفته نمی‌شود').setFontWeight('bold');
  t.getRange(2, 1, 1, AB_FN_HEAD.length).setValues([AB_FN_HEAD]).setFontWeight('bold').setBackground('#222222').setFontColor('#fefefe');
  if (rows.length) t.getRange(3, 1, rows.length, AB_FN_HEAD.length).setValues(rows);
  t.setFrozenRows(2);
  return rows;
}
/** از abDailyMaybe_: شنبه‌ها، یا اگر تب نیست */
function abFunnelMaybe_() {
  var day = lsDay_(); if (lsProp_('AB_FN_DAY') === day) return false;
  var sat = Utilities.formatDate(new Date(lsNow_()), TG_TZ, 'u') === '6';
  var missing = !lsDry_() && !tgStatSS_().getSheetByName(AB_FN_TAB);
  if (!sat && !missing) return false;
  lsProp_('AB_FN_DAY', day); abFunnelBuild_(); return true;
}

function abTests3() {
  var out = [], pass = 0, fail = 0, ok = function (n, c, d) { c ? pass++ : fail++; out.push((c ? '✅ ' : '❌ ') + n + (c || !d ? '' : ' · ' + d)); };
  var keep = { dry: TG_DRY, mem: TG_MEM };
  TG_DRY = true; TG_MEM = { 'ls:now': new Date('2026-10-10T10:00:00+03:30').getTime() };
  try {
    ok('شنبهٔ هفته', abWeekOf_('2026-10-08') === '2026-10-03' && abWeekOf_('2026-10-03') === '2026-10-03' && abWeekOf_('2026-10-09') === '2026-10-03');
    var t0 = new Date('2026-10-04T10:00:00+03:30').getTime();
    TG_MEM['ab:fnleads'] = [
      { code: 'L-1', date: '2026-10-04', time: '10:00', region: 'خارج از ایران', refs: ['x'], booked: true, introDate: '2026-10-06', started: true, status: TG_ST.START, closed: false, touched: true },
      { code: 'L-2', date: '2026-10-05', time: '9:00', region: 'خارج از ایران', refs: [], booked: false, introDate: '', started: false, status: TG_ST.CLOSED, closed: true, reason: 'پاسخ نداد (نهایی)', touched: true },
      { code: 'L-3', date: '2026-10-05', time: '9:00', region: 'داخل ایران', refs: ['x'], booked: true, introDate: '2026-10-06', started: true, status: TG_ST.START, closed: false, touched: true }];
    TG_MEM['ab:fnfirst'] = { 'L-1': t0 + 30 * 60000, 'L-2': new Date('2026-10-05T15:00:00+03:30').getTime() };
    TG_MEM['ab:fnclicks'] = ['2026-10-04', '2026-10-05', '2026-09-20'];
    var R = abFunnelBuild_(), w = R.filter(function (r) { return r[0] === '2026-10-03'; })[0];
    ok('هفته: اقدام ۲، لید خارج ۲ (داخل نه)، تماس اول ۲، تا ۲ ساعت ۱، ارجاع ۱، معارفه ۱، شروع ۱، بی‌پاسخ نهایی ۱', w && w[2] === 2 && w[3] === 2 && w[4] === 2 && w[5] === 1 && w[6] === 1 && w[7] === 1 && w[8] === 1 && w[10] === 1 && w[11] === '50٪', JSON.stringify(w));
    ok('رسیدن و ماندگاری «—» (لوکر و هنوز نه)', w[1] === '—' && w[9] === '—' && AB_FN_HEAD.length === 12);
    ok('فقط شنبه یا وقتی تب نیست', abFunnelMaybe_() === true && abFunnelMaybe_() === false);
  } catch (e) { ok('خطا: ' + e + ' ' + String(e.stack || '').slice(0, 300), false); }
  finally { TG_DRY = keep.dry; TG_MEM = keep.mem; }
  return { pass: pass, fail: fail, text: out.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n') };
}
try { if (TG_SUITES.every(function (s) { return s[1] !== 'abTests3'; })) TG_SUITES.splice(TG_SUITES.length - 1, 0, ['لیدهای خارج · قیف هفتگی (v170.23.23)', 'abTests3']); } catch (eAb3) {}
