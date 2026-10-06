/* ══════════════════════════════════════════════════════════════════════
   v162.gs · ۶ مهر ۱۴۰۵
   ۱) رویدادهای مدرسه یکپارچه: تعریف از بات (ترانه، کاوه، ناظر) ← سطر هاب مدرسه با کد EV
      ← رویداد گوگل‌کلندر ← صفحهٔ سایت (API عمومی) ← خبر به کامیونیتی ← بازخورد متنی و صوتی حاضران
      با اجازهٔ انتشار و تأیید مدرسه ← نمایش روی صفحهٔ رویداد
   ۲) جذب تراپیست برای مسئول پذیرش: صف در منوی پذیرش، شماره و ایمیل و تلگرام روی کارت،
      رزومه در درایو با لینک، تب کاری «جذب تراپیست» با فهرست کشویی و بازگشت ویرایش به منبع، کار برای ژیلا
   ۳) تکرار وقت‌ها: هر هفته، یک هفته در میان، هر سه هفته، ماهی یک بار (وقت‌های هفتگی و ساعت‌های حضوری)
      و ثبت ساعت حضوری درمانگر مستقیم از بات پذیرش
   ۴) بررسی برنامهٔ حضوری بی‌وابستگی به کش (رفع «این بررسی قبلاً بسته شده است»)
   ۵) سرعت: دفتر پیام‌های خروجی در طول یک آپدیت بافر می‌شود و آخر کار یک‌جا نوشته می‌شود
   ══════════════════════════════════════════════════════════════════════ */

/* چتی که همین حالا پیامش پردازش می‌شود (در tgHandle پر می‌شود) */
var TG_CUR = '';

/* ─────────────────────────── ۵) سرعت: دفتر خروجی بافرشده ─────────────────────────── */
var TG_OUT_BUF = null;
function tgOutFlush_() {
  var buf = TG_OUT_BUF; TG_OUT_BUF = null;
  if (TG_DRY || !buf || !buf.length) return 0;
  try {
    var sh = tgOutSheet_(); if (!sh) return 0;
    var lock = null; try { lock = LockService.getScriptLock(); lock.tryLock(1500); } catch (eL) { lock = null; }
    try {
      var last = sh.getLastRow(), seq = 100000;
      if (last >= 2) { var m = String(sh.getRange(last, 1).getValue() || '').match(/M-(\d+)/); if (m) seq = Number(m[1]); }
      var rows = buf.map(function (r, i) { return ['M-' + (seq + i + 1)].concat(r); });
      sh.getRange(last + 1, 1, rows.length, rows[0].length).setValues(rows);
    } finally { try { if (lock) lock.releaseLock(); } catch (eR) {} }
    return buf.length;
  } catch (e) { return 0; }
}

/* ─────────────────────────── ۳) تکرار ─────────────────────────── */
var TG_RECUR = [
  { k: 'w1', fa: 'هر هفته', n: 1 },
  { k: 'w2', fa: 'یک هفته در میان', n: 2 },
  { k: 'w3', fa: 'هر سه هفته', n: 3 },
  { k: 'm1', fa: 'ماهی یک بار', n: 0 }
];
function tgRecurOf_(s) {
  var t = String(s == null ? '' : s).trim();
  if (!t) return TG_RECUR[0];
  for (var i = 0; i < TG_RECUR.length; i++) if (t === TG_RECUR[i].fa || t === TG_RECUR[i].k) return TG_RECUR[i];
  if (/در ?میان|دو ?هفته/.test(t)) return TG_RECUR[1];
  if (/سه ?هفته/.test(t)) return TG_RECUR[2];
  if (/ماه/.test(t)) return TG_RECUR[3];
  return TG_RECUR[0];
}
function tgRecurLabel_(s) { var r = tgRecurOf_(s); return r.n === 1 ? '' : r.fa; }
/* تاریخ yyyy-MM-dd از هر شکلی (Date، میلادی، شمسی) */
function tgIsoOf_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TG_TZ, 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim(); if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return tgOffParseDate_(s);
}
/* آیا قاعدهٔ تکرار در این تاریخ فعال است؟ fromIso لنگر است (اولین جلسه) */
function tgRecurOk_(recur, fromIso, iso) {
  var r = tgRecurOf_(recur);
  if (r.n === 1) return true;
  var from = tgIsoOf_(fromIso);
  if (from && iso < from) return false;
  if (r.n > 1) {
    if (!from) return true;
    var d = Math.round((Date.parse(iso + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
    return d >= 0 && (Math.round(d / 7) % r.n) === 0;
  }
  /* ماهی یک بار: اولین همین روز هفته در ماه شمسی */
  var j = tgJalali_(new Date(Date.parse(iso + 'T12:00:00Z')), 'UTC');
  return j.d <= 7;
}
/* نزدیک‌ترین تاریخ آن روز هفته از امروز (روز فارسی) */
function tgNextIsoOfDay_(dayFa) {
  var key = String(dayFa || '').replace(/[\s‌]+/g, '');
  var map = { 'شنبه': 6, 'یکشنبه': 0, 'دوشنبه': 1, 'سهشنبه': 2, 'چهارشنبه': 3, 'پنجشنبه': 4, 'جمعه': 5 };
  var want = map[key]; if (want === undefined) return Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
  var now = TG_DRY ? new Date(TG_MEM['now'] || Date.UTC(2026, 8, 28, 8, 0)) : new Date();
  for (var i = 0; i < 7; i++) {
    var d = new Date(now.getTime() + i * 86400000);
    var wd = Number(Utilities.formatDate(d, TG_TZ, 'u')) % 7; /* ۱=دوشنبه ... ۷=یکشنبه → ۰ */
    if (wd === want) return Utilities.formatDate(d, TG_TZ, 'yyyy-MM-dd');
  }
  return Utilities.formatDate(now, TG_TZ, 'yyyy-MM-dd');
}
function tgRecurKb_(prefix) {
  return { inline_keyboard: [
    [{ text: '🔁 یک هفته در میان', callback_data: prefix + 'w2' }, { text: '🔁 هر سه هفته', callback_data: prefix + 'w3' }],
    [{ text: '🗓 ماهی یک بار', callback_data: prefix + 'm1' }, { text: '✅ هر هفته', callback_data: prefix + 'w1' }]
  ] };
}

/* ستون‌های «تکرار» و «از تاریخ» در سطر هدر یک تب (اگر نبود ساخته می‌شود) */
function tgRecCols_(sh, headRow) {
  var lc = Math.max(sh.getLastColumn(), 1);
  var hd = sh.getRange(headRow, 1, 1, lc).getValues()[0].map(function (h) { return String(h).trim(); });
  var cR = hd.indexOf('تکرار') + 1, cF = hd.indexOf('از تاریخ') + 1;
  if (!cR) { if (sh.getMaxColumns() < lc + 1) sh.insertColumnsAfter(sh.getMaxColumns(), 1); lc++; sh.getRange(headRow, lc).setValue('تکرار').setFontWeight('bold'); cR = lc; }
  if (!cF) { if (sh.getMaxColumns() < lc + 1) sh.insertColumnsAfter(sh.getMaxColumns(), 1); lc++; sh.getRange(headRow, lc).setValue('از تاریخ').setFontWeight('bold'); cF = lc; }
  return { r: cR, f: cF };
}

/* بعد از ثبت وقت هفتگی: پیشنهاد تکرار دیگر */
function tgRecurOffer_(chat, name, day, times, kind) {
  tgSetVal_('slast', chat, JSON.stringify({ name: name, day: day, times: times, kind: kind || TG_KIND_MEET }));
  return tgSend_(chat, '🔁 این وقت‌ها هر هفته تکرار می‌شوند. اگر یک هفته در میان یا ماهی یک بار است، همین‌جا بزنید:', tgRecurKb_('rw:'));
}
function tgRecurApply_(chat, k) {
  var st = null; try { st = JSON.parse(tgGetVal_('slast', chat) || 'null'); } catch (e) {}
  var r = tgRecurOf_(k);
  if (!st) return tgSend_(chat, 'آخرین وقت ثبت‌شده پیدا نشد. از «🗓 وقت‌های من» دوباره ثبت کنید.');
  var who = tgWhoTherapist_(chat); if (!who || tgNorm_(who.name) !== tgNorm_(st.name)) return tgSend_(chat, 'این بخش برای خود درمانگر است.');
  var from = tgNextIsoOfDay_(st.day), n = 0;
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'recur', name: st.name, day: st.day, times: st.times, recur: r.fa, from: from }); n = st.times.length; }
  else {
    var sh = tgSS_().getSheetByName(TG_WEEKLY); var cc = tgRecCols_(sh, 3), cK = tgWeeklyKindCol_(sh);
    if (sh.getLastRow() >= 4) {
      var v = sh.getRange(4, 1, sh.getLastRow() - 3, Math.max(cK, 5)).getValues();
      for (var i = 0; i < v.length; i++) {
        if (String(v[i][0]).trim() !== st.name || String(v[i][1]).trim() !== st.day) continue;
        if (st.times.indexOf(tgHHMM_(v[i][2])) < 0) continue;
        if (((String(v[i][cK - 1] || '').trim()) || TG_KIND_MEET) !== st.kind) continue;
        sh.getRange(i + 4, cc.r).setValue(r.n === 1 ? '' : r.fa); sh.getRange(i + 4, cc.f).setValue(r.n === 1 ? '' : from); n++; tgWeeklyBust_();
      }
    }
  }
  tgDel_('slast', chat);
  return tgSend_(chat, n ? '✅ ثبت شد: ' + r.fa + (r.n === 1 ? '' : ' از ' + tgFa_(tgJDateFull_(new Date(Date.parse(from + 'T12:00:00Z')), TG_TZ))) + ' (' + tgFa_(n) + ' وقت).' : 'وقتی برای تغییر پیدا نشد.', tgTherMenu_());
}

/* حضوری: تکرارِ درخواست درمانگر (تا وقتی پذیرش تأیید نکرده روی درخواست، بعدش روی ردیف) */
function tgInpRecKey_(id) { return 'inprc' + id; }
function tgInpRecSet_(chat, who, id, k) {
  var r = tgRecurOf_(k);
  var t = tgInpTab_(TG_INP_REQ, TG_INP_QHEAD), rows = t.rows(), q = null;
  for (var i = 0; i < rows.length; i++) if (rows[i][0] === id) q = rows[i];
  if (!q || !tgInpIsMe_(q[2], who.name)) return tgSend_(chat, 'این درخواست پیدا نشد.');
  var from = tgNextIsoOfDay_(q[6]);
  var val = r.n === 1 ? '' : r.fa + '|' + from;
  if (TG_DRY) TG_MEM[tgInpRecKey_(id)] = val; else PropertiesService.getScriptProperties().setProperty(tgInpRecKey_(id), val);
  if (q[13] === 'تأیید شد') tgInpRecOnRow_(q, val);
  tgInpDeskSay_('🔁 ' + tgEsc_(who.name) + ' برای درخواست ' + tgEsc_(q[12]) + ' تکرار را «' + r.fa + '» گذاشت.');
  return tgSend_(chat, '✅ ثبت شد: ' + r.fa + '.' + (q[13] === 'تأیید شد' ? '' : ' با تأیید پذیرش در برنامه می‌نشیند.'));
}
function tgInpRecGet_(id) {
  if (TG_DRY) return TG_MEM[tgInpRecKey_(id)] || '';
  return PropertiesService.getScriptProperties().getProperty(tgInpRecKey_(id)) || '';
}
/* نوشتن تکرار روی ردیف «ساعت‌های حضوری» (پیدا کردن با کلید ردیف یا با درمانگر و روز و ساعت) */
function tgInpRecOnRow_(q, val, rowNo) {
  var p = String(val || '').split('|'), label = p[0] || '', from = p[1] || '';
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'inprec', id: q[0], recur: label, from: from }); return true; }
  var hs = tgSS_().getSheetByName(TG_INP_HOURS); if (!hs) return false;
  var cc = tgRecCols_(hs, 1), row = rowNo || 0;
  if (!row) {
    var n = hs.getLastRow() - 1, v = n > 0 ? hs.getRange(2, 1, n, 5).getDisplayValues() : [];
    for (var i = v.length - 1; i >= 0; i--) {
      if (v[i][0] === q[4] && tgInpIsMe_(v[i][1], q[2]) && tgInpDay_(v[i][2]) === q[6] && tgInpH_(v[i][3]) === tgInpH_(q[7])) { row = i + 2; break; }
    }
  }
  if (!row) return false;
  hs.getRange(row, cc.r).setValue(label); hs.getRange(row, cc.f).setValue(from);
  CacheService.getScriptCache().remove('inpdata');
  return true;
}

/* پذیرش: ثبت مستقیم ساعت حضوری برای یک درمانگر (با تکرار) */
function tgInpDeskOk_(chat) {
  var d = TG_DRY ? (TG_MEM['deskwho'] || null) : tgWhoDesk_(chat, '');
  if (d) return d;
  try { var ids = TG_DRY ? (TG_MEM['watchids'] || []) : tgWatchIds_(); for (var i = 0; i < ids.length; i++) if (String(ids[i]) === String(chat)) return { name: 'ناظر' }; } catch (e) {}
  return null;
}
function tgInpDeskStart_(chat) {
  if (!tgInpDeskOk_(chat)) return tgSend_(chat, 'این بخش برای پذیرش است.');
  var ps = tgInpPlaces_();
  if (!ps.length) return tgSend_(chat, 'مکان حضوری فعالی در هاب نیست.');
  return tgSend_(chat, '➕ <b>ثبت ساعت حضوری برای درمانگر</b>\nکدام مکان؟', { inline_keyboard: ps.map(function (p) { return [{ text: '📍 ' + tgInpPlaceName_(p.id), callback_data: 'ih:p:' + p.id }]; }).concat([[{ text: '↩️ انصراف', callback_data: 'ih:x' }]]) });
}
function tgOnInpDesk_(cq, rest) {
  var chat = cq.message.chat.id, a = String(rest || '').split(':');
  var desk = tgInpDeskOk_(chat); if (!desk) return tgSend_(chat, 'این بخش برای پذیرش است.');
  var st = null; try { st = JSON.parse(tgGetVal_('inpd', chat) || 'null'); } catch (e) {}
  if (a[0] === 'new') return tgInpDeskStart_(chat);
  if (a[0] === 'x') { tgDel_('inpd', chat); return tgSend_(chat, 'باشد.'); }
  if (a[0] === 'p') { tgSetVal_('inpd', chat, JSON.stringify({ pid: a[1], s: 'who' })); return tgSend_(chat, 'نام درمانگر را بنویسید.'); }
  if (!st) return tgInpDeskStart_(chat);
  if (a[0] === 't') { var c = (st.cands || [])[Number(a[1])]; if (!c) return tgInpDeskStart_(chat); st.who = c; st.s = 'day'; tgSetVal_('inpd', chat, JSON.stringify(st)); return tgInpDeskAskDay_(chat, st); }
  if (a[0] === 'd') { st.day = TG_INP_DAYS[Number(a[1])]; st.s = 'hrs'; tgSetVal_('inpd', chat, JSON.stringify(st)); return tgSend_(chat, tgEsc_(st.who) + ' · ' + st.day + '\nچه ساعتی؟ مثلاً بنویسید: ۱۴ تا ۱۸'); }
  if (a[0] === 'r') return tgInpDeskSave_(chat, desk, st, a[1]);
  return null;
}
function tgInpDeskAskDay_(chat, st) {
  var kb = [], r = [];
  TG_INP_DAYS.forEach(function (dy, i) { r.push({ text: dy, callback_data: 'ih:d:' + i }); if (r.length === 4) { kb.push(r); r = []; } });
  if (r.length) kb.push(r);
  return tgSend_(chat, tgEsc_(st.who) + ' در ' + tgEsc_(tgInpPlaceName_(st.pid)) + '\nکدام روز؟', { inline_keyboard: kb });
}
function tgInpDeskText_(chat, text) {
  var st = null; try { st = JSON.parse(tgGetVal_('inpd', chat) || 'null'); } catch (e) {}
  if (!st) return false;
  var s = String(text || '').trim();
  if (!s || s.indexOf('/') === 0 || s.indexOf('بازگشت') > -1 || tgIsBtnLike_(s)) { tgDel_('inpd', chat); return false; }
  if (st.s === 'who') {
    var hit = []; try { hit = tgTherFind_(s, false) || []; } catch (e) {}
    if (!hit.length) { tgSend_(chat, 'این نام در درمانگرهای تجربه پیدا نشد. دوباره بنویسید.'); return true; }
    if (hit.length > 1) {
      st.cands = hit.slice(0, 6).map(function (h) { return h.name; }); tgSetVal_('inpd', chat, JSON.stringify(st));
      tgSend_(chat, 'کدام؟', { inline_keyboard: st.cands.map(function (n, i) { return [{ text: n, callback_data: 'ih:t:' + i }]; }) });
      return true;
    }
    st.who = hit[0].name; st.s = 'day'; tgSetVal_('inpd', chat, JSON.stringify(st)); tgInpDeskAskDay_(chat, st); return true;
  }
  if (st.s === 'hrs') {
    var hr = tgInpParseHours_(s);
    if (!hr) { tgSend_(chat, 'ساعت را این‌طور بنویسید: ۱۴ تا ۱۸'); return true; }
    st.from = String(hr[0]); st.to = String(hr[1]); st.s = 'rec'; tgSetVal_('inpd', chat, JSON.stringify(st));
    tgSend_(chat, tgEsc_(st.who) + ' · ' + st.day + ' · ' + tgInpHs_(hr[0]) + ' تا ' + tgInpHs_(hr[1]) + '\nتکرارش چطور است؟', tgRecurKb_('ih:r:'));
    return true;
  }
  return false;
}
function tgInpDeskSave_(chat, desk, st, k) {
  if (!st || !st.who || !st.day || !st.from) return tgInpDeskStart_(chat);
  var r = tgRecurOf_(k), from = r.n === 1 ? '' : tgNextIsoOfDay_(st.day);
  var d = tgInpData_(), kids = false; try { kids = tgInpKidsOf_(st.who, st.pid, d); } catch (e) {}
  var room = ''; try { room = tgInpFreeRoom_(st.pid, st.day, Number(st.from), Number(st.to), kids, '', d); } catch (e2) {}
  var now = tgInpNow_(), rowNo = 0;
  var vals = [st.pid, st.who, st.day, st.from, st.to, room, 'دارد', 'ثبت پذیرش از بات (' + (desk.name || '') + ')', 'تأیید شد', now, ''];
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'inpadd', vals: vals, recur: r.fa, from: from }); }
  else {
    var hs = tgSS_().getSheetByName(TG_INP_HOURS); var cc = tgRecCols_(hs, 1);
    rowNo = hs.getLastRow() + 1; hs.getRange(rowNo, 1, 1, vals.length).setNumberFormat('@').setValues([vals]);
    if (r.n !== 1) { hs.getRange(rowNo, cc.r).setValue(r.fa); hs.getRange(rowNo, cc.f).setValue(from); }
    CacheService.getScriptCache().remove('inpdata');
    try { tgInpCapRefresh_(true); } catch (e3) {}
  }
  tgDel_('inpd', chat);
  var what = tgInpPlaceName_(st.pid, d) + '، ' + st.day + '، ' + tgInpHs_(Number(st.from)) + ' تا ' + tgInpHs_(Number(st.to)) + (r.n === 1 ? '' : '، ' + r.fa) + (room ? '، اتاق ' + tgFa_(room) : '');
  try {
    var th = null; (TG_DRY ? (TG_MEM['therrows'] || []) : tgTherapistRows_()).forEach(function (t) { if (!th && tgNorm_(t.name) === tgNorm_(st.who)) th = t; });
    if (th && th.chat) tgNotify_(String(th.chat).split(/[,،;\s]+/)[0], TG_NK.task, '🏢 پذیرش برای شما ساعت حضوری ثبت کرد:\n' + tgEsc_(what) + '\nاگر درست نیست از «' + TG_INP_BTN + '» بگویید.', { ref: 'حضوری' });
  } catch (e4) {}
  try { tgPev_({ id: st.who, actor: desk.name || 'پذیرش', channel: 'بات', what: 'ساعت حضوری', to: what }); } catch (e5) {}
  return tgSend_(chat, '✅ در «' + TG_INP_HOURS + '» نشست: ' + tgEsc_(what) + (room ? '' : '\nاتاق خالی پیدا نشد؛ ستون اتاق را در هاب پر کنید.'),
    { inline_keyboard: [[{ text: '➕ ساعت دیگر', callback_data: 'ih:new' }]] });
}

/* ─────────────────────────── ۴) بررسی حضوری: پیدا کردن بی‌کش ─────────────────────────── */
function tgInpChkFind_(chat) {
  if (TG_DRY) return TG_MEM['inpchkfind'] || null;
  try {
    var d = tgWhoDesk_(chat, ''); if (!d) return null;
    var sh = tgInpLogSheet_(); if (!sh || sh.getLastRow() < 2) return null;
    var n = sh.getLastRow() - 1, v = sh.getRange(2, 1, n, 4).getDisplayValues();
    for (var i = v.length - 1; i >= 0; i--) {
      if (String(v[i][2]).trim() !== String(d.name).trim()) continue;
      if (/تأیید شد|اصلاحات باید اعمال شود/.test(v[i][3])) return null;
      return { pid: String(v[i][1]).trim(), row: i + 2 };
    }
  } catch (e) {}
  return null;
}

/* ─────────────────────────── ۲) جذب تراپیست ─────────────────────────── */
var TG_AP_XHEAD = ['لینک رزومه', 'اقدام بعدی', 'تاریخ اقدام بعدی'];
(function () { try { for (var i = 0; i < TG_AP_XHEAD.length; i++) if (TG_SCH_APPLY_HEAD.indexOf(TG_AP_XHEAD[i]) < 0) TG_SCH_APPLY_HEAD.push(TG_AP_XHEAD[i]); } catch (e) {} })();
var TG_AP_FOLDER = 'اپلای تراپیست';
/* شماره‌ای که در شیت عدد شده و صفرش افتاده */
function tgApPhone_(x) { var s = String(x == null ? '' : x).trim(); return /^9\d{9}$/.test(s) ? '0' + s : s; }
function tgApCol_(name) { return TG_SCH_APPLY_HEAD.indexOf(name) + 1; }
function tgApTgLink_(r) {
  var u = String(r.user || '').replace(/^@/, '').trim();
  return u ? 'https://t.me/' + u : '';
}
/* رزومهٔ تلگرامی را در درایو می‌گذارد و لینکش را در ستون «لینک رزومه» می‌نویسد */
function tgApResumeToDrive_(id) {
  var r = tgApRow_(id); if (!r) return '';
  if (r.resumeUrl) return r.resumeUrl;
  var url = '';
  var f = tgApResumeId_(r.resume);
  if (!f) {
    var m = String(r.resume || '').match(/https?:\/\/\S+/);
    url = m ? m[0] : '';
  } else if (TG_DRY) {
    url = 'https://drive.google.com/file/d/dry/view';
  } else {
    var tf = tgTgFile_(f.id), ext = (tf.path.match(/\.[A-Za-z0-9]{2,5}$/) || [f.kind === 'photo' ? '.jpg' : ''])[0];
    var file = tgPqFolder_(TG_AP_FOLDER).createFile(tf.blob.setName(r.id + ' · ' + String(r.name || '').slice(0, 40) + ' · رزومه' + ext));
    /* v166.8: دیگر «هر کس لینک دارد» نیست؛ فایل دسترسی پوشهٔ «اپلای تراپیست» را می‌گیرد (پوشه باید با تیم پذیرش شریک باشد) */
    url = file.getUrl();
  }
  if (url) tgApSet_(r, tgApCol_('لینک رزومه'), url);
  return url;
}
/* v166.8، یک بار و فقط با اجازهٔ یاسر (از maint.gs): رزومه‌های قبلی را از «هر کس لینک دارد» بیرون می‌آورد.
   فقط فایل‌های داخل پوشهٔ «اپلای تراپیست»؛ ویرایشگرها و بینندگان صریح و دسترسی پوشه می‌مانند. */
function tgApResumePrivatize() {
  var it = tgPqFolder_(TG_AP_FOLDER).getFiles(), n = 0, err = 0;
  while (it.hasNext()) {
    var f = it.next();
    try { if (f.getSharingAccess() !== DriveApp.Access.PRIVATE) { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); n++; } } catch (e) { err++; }
  }
  return 'رزومه‌های خصوصی‌شده: ' + n + (err ? ' · خطا: ' + err : '');
}
/* یک بار: رزومهٔ همهٔ پرونده‌های بی‌لینک به درایو (با اجازهٔ یاسر اجرا شود) */
function tgApResumeBackfill() {
  var sh = tgSchApSheet_(); if (!sh || sh.getLastRow() < 2) return 'خالی';
  tgSchHeadFix_(TG_SCH_T_APPLY, TG_SCH_APPLY_HEAD);
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (x) { return String(x[0]).trim(); }).filter(String), n = 0, err = [];
  for (var i = 0; i < ids.length; i++) { try { if (tgApResumeToDrive_(ids[i])) n++; } catch (e) { err.push(ids[i] + ': ' + e); } }
  tgApMirror_();
  return 'رزومه با لینک: ' + n + ' از ' + ids.length + (err.length ? ' · خطا: ' + err.join(' | ') : '');
}
/* کار برای مسئول پذیرش (کارها) */
function tgApTaskLead_(r, title, dueDays) {
  try {
    var desk = TG_DRY ? (TG_MEM['desk'] || []) : tgDeskRows_();
    for (var i = 0; i < desk.length; i++) {
      if (!desk[i].chat || !tgApIsLead_(desk[i])) continue;
      tgTaskFor_({ title: title, body: tgEsc_(r.name || '') + (r.city ? ' · ' + tgEsc_(r.city) : '') + (r.phone ? '\n☎ ' + tgEsc_(r.phone) : ''), team: 'پذیرش',
        chat: String(desk[i].chat).split(/[,،;\s]+/)[0], dueDays: dueDays, link: r.id + ' جذب', by: 'بات',
        markup: { inline_keyboard: [[{ text: '🗂 کارت پرونده', callback_data: 'ap:card:' + r.id }]] } });
    }
  } catch (e) { tgErr_('tgApTaskLead_: ' + e); }
}
/* اقدام بعدی از کارت */
function tgApNextKb_(id) {
  return { inline_keyboard: [
    [{ text: 'فردا', callback_data: 'ap:nxd:' + id + ':1' }, { text: '۳ روز دیگر', callback_data: 'ap:nxd:' + id + ':3' }, { text: 'هفتهٔ بعد', callback_data: 'ap:nxd:' + id + ':7' }],
    [{ text: 'بدون موعد', callback_data: 'ap:nxd:' + id + ':0' }]] };
}
function tgApNextSet_(chat, r, days, me) {
  var n = Number(days) || 0;
  var iso = n ? Utilities.formatDate(new Date(Date.now() + n * 86400000), TG_TZ, 'yyyy-MM-dd') : '';
  tgApSet_(r, tgApCol_('اقدام بعدی'), n ? 'تماس دوباره' : '');
  tgApSet_(r, tgApCol_('تاریخ اقدام بعدی'), iso);
  if (n) tgApTaskLead_(r, 'پیگیری متقاضی ' + r.id, n);
  return tgSend_(chat, n ? '📌 اقدام بعدی: تماس دوباره، ' + tgFa_(tgJDateFull_(new Date(Date.now() + n * 86400000), TG_TZ)) + '. در «کارها» هم نشست.' : 'موعد برداشته شد.');
}

/* ─────────────────────────── ۱) رویدادها ─────────────────────────── */
var TG_EVN_BTN = '➕ رویداد تازه';
var TG_EV_HEAD3 = ['دسترسی', 'مدت (دقیقه)', 'شناسهٔ تقویم', 'ثبت‌کننده', 'اطلاع کامیونیتی', 'درخواست بازخورد', 'مکان'];
(function () { try { for (var i = 0; i < TG_EV_HEAD3.length; i++) if (TG_EV_HEAD2.indexOf(TG_EV_HEAD3[i]) < 0) TG_EV_HEAD2.push(TG_EV_HEAD3[i]); } catch (e) {} })();
var TG_EVN_KINDS = [['jc', 'ژورنال کلاب'], ['case', 'کیس‌خوانی'], ['sup', 'سوپرویژن گروهی'], ['web', 'وبینار'], ['panel', 'پنل و گفت‌وگو'], ['ws', 'کارگاه'], ['live', 'رویداد حضوری']];
var TG_EVN_ACCESS = [['free', 'رایگان و آزاد برای همه'], ['comm', 'با عضویت رایگان کامیونیتی'], ['reg', 'با ثبت‌نام'], ['members', 'مخصوص دانشجویان دوره']];
var TG_EVN_MINS = [60, 90, 120, 180];
var TG_EVF_TAB = 'بازخورد رویدادها';
var TG_EVF_HEAD = ['کد', 'زمان', 'کد رویداد', 'عنوان رویداد', 'نام', 'chat_id', 'نوع', 'متن', 'فایل', 'اجازهٔ انتشار', 'وضعیت', 'بررسی‌کننده'];
var TG_EVF_ST = { wait: 'منتظر اجازه', rev: 'در انتظار تأیید', pub: 'منتشر شود', no: 'منتشر نشود', team: 'فقط برای تیم' };
var TG_EVF_PERM = { n: 'با نام', a: 'بی‌نام', x: 'منتشر نشود' };
var TG_EV_SITE = 'https://tajrobeh.life/school/events/';

/* چه کسی رویداد تعریف می‌کند: ناظر، مسئول مدرسه، سردبیر (کاوه) */
function tgEvCan_(chat) {
  if (tgEvIsSchool_(chat)) return true;
  try { var ids = TG_DRY ? (TG_MEM['watchids'] || []) : tgWatchIds_(); for (var i = 0; i < ids.length; i++) if (String(ids[i]) === String(chat)) return true; } catch (e) {}
  try { var p = tgPersonByChat_(chat); if (p && p.roles && (p.roles.indexOf('سردبیر') > -1 || p.roles.indexOf('مدرسه') > -1)) return true; } catch (e2) {}
  return false;
}
function tgEvnGet_(chat) { try { return JSON.parse(tgGetVal_('evn', chat) || 'null'); } catch (e) { return null; } }
function tgEvnPut_(chat, st) { tgSetVal_('evn', chat, JSON.stringify(st)); }
function tgEvnCancelKb_() { return { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'evn:x' }]] }; }
function tgEvnSkipKb_(what) { return { inline_keyboard: [[{ text: '⏭ رد شدن', callback_data: 'evn:skip:' + what }], [{ text: '↩️ انصراف', callback_data: 'evn:x' }]] }; }

function tgEvnStart_(chat, name) {
  if (!tgEvCan_(chat)) return tgSend_(chat, 'تعریف رویداد با مسئول مدرسه و سردبیر است.');
  tgEvnPut_(chat, { s: 'title', by: name || '' });
  return tgSend_(chat, '➕ <b>رویداد تازهٔ مدرسه</b>\nبعد از ثبت، رویداد خودش در هاب مدرسه، تقویم گوگل و صفحهٔ رویدادهای سایت می‌نشیند.\n\n<b>۱ از ۸</b> · عنوان رویداد چیست؟', tgEvnCancelKb_());
}
function tgEvnAskKind_(chat) {
  var kb = [], r = [];
  TG_EVN_KINDS.forEach(function (k, i) { r.push({ text: k[1], callback_data: 'evn:k:' + i }); if (r.length === 2) { kb.push(r); r = []; } });
  if (r.length) kb.push(r);
  kb.push([{ text: '↩️ انصراف', callback_data: 'evn:x' }]);
  return tgSend_(chat, '<b>۲ از ۸</b> · نوع رویداد؟', { inline_keyboard: kb });
}
function tgEvnAskAccess_(chat) {
  return tgSend_(chat, '<b>۵ از ۸</b> · چطور می‌شود شرکت کرد؟', { inline_keyboard: TG_EVN_ACCESS.map(function (a, i) { return [{ text: a[1], callback_data: 'evn:a:' + i }]; }).concat([[{ text: '↩️ انصراف', callback_data: 'evn:x' }]]) });
}
function tgEvnAskMins_(chat) {
  return tgSend_(chat, '<b>۴ از ۸</b> · چقدر طول می‌کشد؟', { inline_keyboard: [TG_EVN_MINS.map(function (m) { return { text: tgFa_(m) + ' دقیقه', callback_data: 'evn:m:' + m }; })] });
}
function tgEvnParseTime_(s) {
  var t = tgLatinDigits_(String(s || '')).replace(/[٫.]/g, ':').trim();
  var m = t.match(/^(\d{1,2})(?::(\d{2}))?$/); if (!m) return '';
  var h = Number(m[1]), mi = Number(m[2] || 0); if (h > 23 || mi > 59) return '';
  return ('0' + h).slice(-2) + ':' + ('0' + mi).slice(-2);
}
function tgEvnText_(chat, name, text) {
  var st = tgEvnGet_(chat); var s = String(text || '').trim();
  if (s === TG_EVN_BTN || s === '/newevent') { tgEvnStart_(chat, name); return true; }
  if (!st) return false;
  if (!s || s.indexOf('/') === 0 || s.indexOf('بازگشت') > -1 || (tgIsBtnLike_(s) && st.s !== 'title' && st.s !== 'desc')) { tgDel_('evn', chat); return false; }
  if (st.s === 'title') { if (s.length < 4) { tgSend_(chat, 'عنوان کمی کامل‌تر؟'); return true; } st.title = s.slice(0, 120); st.s = 'kind'; tgEvnPut_(chat, st); tgEvnAskKind_(chat); return true; }
  if (st.s === 'date') {
    var iso = tgOffParseDate_(s);
    if (!iso) { tgSend_(chat, 'تاریخ را به شکل ۱۴۰۵/۰۷/۲۰ بنویسید.'); return true; }
    var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd');
    if (iso < today) { tgSend_(chat, 'این تاریخ گذشته است. تاریخ رویداد را بنویسید.'); return true; }
    st.date = iso; st.s = 'time'; tgEvnPut_(chat, st);
    tgSend_(chat, '<b>۳ از ۸</b> · ساعت شروع به وقت تهران؟ مثلاً ۱۸:۳۰', tgEvnCancelKb_()); return true;
  }
  if (st.s === 'time') { var hh = tgEvnParseTime_(s); if (!hh) { tgSend_(chat, 'ساعت را این‌طور بنویسید: ۱۸:۳۰'); return true; } st.time = hh; st.s = 'mins'; tgEvnPut_(chat, st); tgEvnAskMins_(chat); return true; }
  if (st.s === 'link') { st.link = /^https?:\/\//.test(s) ? s.slice(0, 300) : ''; st.place = st.link ? st.place : s.slice(0, 120); st.s = 'who'; tgEvnPut_(chat, st); tgSend_(chat, '<b>۷ از ۸</b> · ارائه‌دهنده یا میزبان کیست؟', tgEvnSkipKb_('who')); return true; }
  if (st.s === 'who') { st.who = s.slice(0, 80); st.s = 'desc'; tgEvnPut_(chat, st); tgSend_(chat, '<b>۸ از ۸</b> · در یکی دو جمله دربارهٔ رویداد بنویسید (روی صفحهٔ سایت می‌آید).', tgEvnSkipKb_('desc')); return true; }
  if (st.s === 'desc') { st.desc = s.slice(0, 500); st.s = 'ok'; tgEvnPut_(chat, st); tgEvnConfirm_(chat, st); return true; }
  return false;
}
function tgEvnAccessLabel_(k) { for (var i = 0; i < TG_EVN_ACCESS.length; i++) if (TG_EVN_ACCESS[i][0] === k) return TG_EVN_ACCESS[i][1]; return ''; }
function tgEvnWhen_(st) {
  var d = new Date(Date.parse(st.date + 'T12:00:00Z'));
  return tgDay_(Utilities.formatDate(d, 'UTC', 'EEE')) + ' ' + tgJDateFull_(d, 'UTC') + ' · ساعت ' + tgFa_(st.time) + ' به وقت تهران';
}
function tgEvnConfirm_(chat, st) {
  var t = '🗓 <b>' + tgEsc_(st.title) + '</b>\n' + tgEsc_(st.kindFa || '') + '\n' + tgEvnWhen_(st) + ' · ' + tgFa_(st.mins || 90) + ' دقیقه\n' +
    '🎟 ' + tgEvnAccessLabel_(st.access) + '\n' + (st.link ? '🔗 ' + tgEsc_(st.link) + '\n' : '') + (st.place ? '📍 ' + tgEsc_(st.place) + '\n' : '') +
    (st.who ? '🎤 ' + tgEsc_(st.who) + '\n' : '') + (st.desc ? '\n' + tgEsc_(st.desc) + '\n' : '') + '\nثبت شود؟';
  return tgSend_(chat, t, { inline_keyboard: [[{ text: '✅ ثبت و انتشار', callback_data: 'evn:ok' }], [{ text: '✏️ از اول', callback_data: 'evn:re' }, { text: '↩️ انصراف', callback_data: 'evn:x' }]] });
}
function tgEvNextCode_() {
  var L = tgEvAll_(), max = 2000;
  for (var i = 0; i < L.length; i++) { var m = String(L[i].code || '').match(/^EV-(\d+)$/); if (m && Number(m[1]) > max) max = Number(m[1]); }
  return 'EV-' + (max + 1);
}
function tgEvCalId_() { var p = TG_DRY ? '' : (PropertiesService.getScriptProperties().getProperty('TG_EV_CAL') || ''); return p || TG_CAL_PUBLIC[0]; }
/* ساخت رویداد: سطر هاب مدرسه، تقویم، پوشه */
function tgEvCreate_(chat, st) {
  var code = tgEvNextCode_(), H = tgEvHeadAll_(), row = [];
  for (var i = 0; i < H.length; i++) row.push('');
  function put(name, v) { var c = H.indexOf(name); if (c > -1) row[c] = v; }
  var start = new Date(st.date + 'T' + st.time + ':00+03:30'), end = new Date(start.getTime() + (Number(st.mins) || 90) * 60000);
  var slug = tgEvSlug_(st.title);
  put('کد', code); put('عنوان', st.title); put('تاریخ', start); put('ساعت', st.time); put('نوع', st.kindFa || ''); put('لینک', st.link || '');
  put('وضعیت', 'باز'); put('توضیح کوتاه', st.desc || ''); put('موضوع', st.kindFa || ''); put('ارائه‌دهنده', st.who || '');
  put('ثبت‌نام از بات', st.access === 'members' ? 'خیر' : 'بله'); put('اسلاگ', slug); put('مرحله', TG_EV_STAGE.ann);
  put('لینک صفحه', TG_EV_SITE + '#ev=' + code); put('دسترسی', tgEvnAccessLabel_(st.access)); put('مدت (دقیقه)', Number(st.mins) || 90);
  put('ثبت‌کننده', st.by || ''); put('مکان', st.place || (st.link ? 'آنلاین' : ''));
  var calId = '', calNote = '';
  if (TG_DRY) { TG_OUTBOX.push({ kind: 'evnew', code: code, row: row.slice() }); (TG_MEM['evall'] = TG_MEM['evall'] || []).push(tgEvRowObj_(H, row, (TG_MEM['evall'] || []).length + 2)); calId = 'dry-cal'; }
  else {
    try { tgEvHeadFix_(); } catch (eH) {}
    try {
      var cal = CalendarApp.getCalendarById(tgEvCalId_());
      if (cal) {
        var ce = cal.createEvent(st.title + (st.kindFa ? ' · ' + st.kindFa : ''), start, end,
          { description: (st.desc ? st.desc + '\n\n' : '') + (st.who ? 'ارائه: ' + st.who + '\n' : '') + tgEvnAccessLabel_(st.access) + '\n' + TG_EV_SITE + '#ev=' + code, location: st.place || st.link || '' });
        calId = ce.getId();
      } else calNote = 'تقویم پیدا نشد';
    } catch (eC) { calNote = String(eC).slice(0, 120); tgErr_('tgEvCreate_ calendar: ' + eC); }
    put('شناسهٔ تقویم', calId);
    var sh = tgEvSheetMain_(); sh.appendRow(row);
    try { tgEvFolder_(tgEvBy_(code)); } catch (eF) {}
    try { CacheService.getScriptCache().remove('evapi'); } catch (eX) {}
  }
  try { tgPev_({ id: code, actor: st.by || 'بات', channel: 'بات', what: 'رویداد تازه', to: st.title }); } catch (eP) {}
  return { code: code, cal: calId, calNote: calNote };
}
function tgEvRowObj_(H, row, rowNo) { var o = { row: rowNo }; for (var i = 0; i < H.length; i++) o[H[i]] = row[i]; o.code = o['کد']; o.title = o['عنوان']; return o; }
function tgEvnDone_(chat, st) {
  var res = tgEvCreate_(chat, st);
  tgDel_('evn', chat);
  var bot = tgBotName_(), code = res.code;
  var t = '✅ <b>رویداد ثبت شد</b> · <code>' + code + '</code>\n\n' +
    '• هاب مدرسه، تب «' + TG_EV_TAB + '»: نشست\n' +
    '• تقویم گوگل: ' + (res.cal ? 'نشست' : 'نشد (' + tgEsc_(res.calNote || '') + ')') + '\n' +
    '• صفحهٔ سایت: تا نیم ساعت دیگر روی تقویم می‌آید\n' + TG_EV_SITE + '#ev=' + code + '\n\n' +
    '🎟 لینک ثبت‌نام و یادآوری در بات:\nhttps://t.me/' + bot + '?start=ev-' + code + '\n' +
    '💬 لینک بازخورد برای حاضران (بعد از رویداد):\nhttps://t.me/' + bot + '?start=evf-' + code;
  var kb = [[{ text: '🔗 لینک ارائه‌دهنده', callback_data: 'ev:link:' + code }]];
  if (st.access === 'free' || st.access === 'comm') kb.unshift([{ text: '📣 خبر به اعضای کامیونیتی', callback_data: 'evn:bc:' + code }]);
  tgSend_(chat, t, { inline_keyboard: kb });
  try {
    var msg = '🗓 رویداد تازهٔ مدرسه ثبت شد: <b>' + tgEsc_(st.title) + '</b> · ' + code + '\n' + tgEvnWhen_(st) + (st.by ? '\nثبت: ' + tgEsc_(st.by) : '');
    var seen = {}; seen[String(chat)] = 1;
    tgSchoolOwners_().forEach(function (o) { var c = tgMagFirst_(o.chat); if (c && !seen[c]) { seen[c] = 1; tgNotify_(c, TG_NK.report, msg, { ref: code }); } });
    (TG_DRY ? (TG_MEM['watchids'] || []) : tgWatchIds_()).forEach(function (id) { if (!seen[String(id)]) { seen[String(id)] = 1; tgNotify_(String(id), TG_NK.report, msg, { ref: code }); } });
  } catch (e) {}
  return true;
}
function tgOnEvn_(cq, rest, name) {
  var chat = cq.message.chat.id, p = String(rest || '').split(':'), act = p[0];
  if (act === 'reg') { var ev0 = tgEvBy_(p[1]); if (!ev0) return tgSend_(chat, 'این رویداد پیدا نشد.'); if (!tgEvPick_(chat, ev0.title)) return tgSend_(chat, 'ثبت‌نام این رویداد بسته است.'); return null; }
  if (act === 'x') { tgDel_('evn', chat); return tgSend_(chat, 'باشد.'); }
  if (!tgEvCan_(chat)) return tgSend_(chat, 'تعریف رویداد با مسئول مدرسه و سردبیر است.');
  if (act === 'go' || act === 're') return tgEvnStart_(chat, name);
  if (act === 'bc') return tgEvBroadcast_(chat, p[1], Number(p[2] || 0));
  var st = tgEvnGet_(chat); if (!st) return tgEvnStart_(chat, name);
  if (act === 'k') { var k = TG_EVN_KINDS[Number(p[1])] || TG_EVN_KINDS[0]; st.kind = k[0]; st.kindFa = k[1]; st.s = 'date'; tgEvnPut_(chat, st); return tgSend_(chat, '<b>۳ از ۸</b> · چه تاریخی؟ به شکل ۱۴۰۵/۰۷/۲۰', tgEvnCancelKb_()); }
  if (act === 'm') { st.mins = Number(p[1]) || 90; st.s = 'access'; tgEvnPut_(chat, st); return tgEvnAskAccess_(chat); }
  if (act === 'a') {
    var a = TG_EVN_ACCESS[Number(p[1])] || TG_EVN_ACCESS[0]; st.access = a[0]; st.s = 'link'; tgEvnPut_(chat, st);
    return tgSend_(chat, '<b>۶ از ۸</b> · لینک ورود (گوگل‌میت یا زوم) یا نشانی محل را بنویسید. لینک فقط برای ثبت‌نام‌کننده‌ها فرستاده می‌شود.', tgEvnSkipKb_('link'));
  }
  if (act === 'skip') {
    if (p[1] === 'link') { st.s = 'who'; tgEvnPut_(chat, st); return tgSend_(chat, '<b>۷ از ۸</b> · ارائه‌دهنده یا میزبان کیست؟', tgEvnSkipKb_('who')); }
    if (p[1] === 'who') { st.s = 'desc'; tgEvnPut_(chat, st); return tgSend_(chat, '<b>۸ از ۸</b> · در یکی دو جمله دربارهٔ رویداد بنویسید (روی صفحهٔ سایت می‌آید).', tgEvnSkipKb_('desc')); }
    st.s = 'ok'; tgEvnPut_(chat, st); return tgEvnConfirm_(chat, st);
  }
  if (act === 'ok') { if (!st.title || !st.date || !st.time) return tgEvnStart_(chat, name); return tgEvnDone_(chat, st); }
  return null;
}

/* خبر به اعضای کامیونیتی (فقط رایگان یا با عضویت کامیونیتی؛ یک بار؛ سقف و سکوت شب از موتور پیام) */
var TG_EV_BC_MAX = 250;
function tgEvCommChats_() {
  if (TG_DRY) return TG_MEM['commchats'] || [];
  var v = tgSchRows_(TG_SCH_T_COMM, TG_SCH_COMM_HEAD, 11), out = [], seen = {};
  for (var i = 0; i < v.length; i++) {
    var c = String(v[i][3] || '').trim(); if (!c || seen[c]) continue;
    if (/غیرفعال|لغو/.test(String(v[i][9] || ''))) continue;
    seen[c] = 1; out.push(c);
  }
  return out;
}
function tgEvBroadcast_(chat, code, from) {
  var o = tgEvBy_(code); if (!o) return tgSend_(chat, 'این رویداد پیدا نشد.');
  var acc = String(o['دسترسی'] || '');
  if (acc && !/رایگان|کامیونیتی/.test(acc)) return tgSend_(chat, 'خبر عمومی فقط برای رویدادهای رایگان یا با عضویت کامیونیتی است.');
  var done = String(o['اطلاع کامیونیتی'] || '');
  if (done && !from) return tgSend_(chat, 'برای این رویداد قبلاً خبر رفته است (' + tgEsc_(done) + ').');
  var list = tgEvCommChats_(), start = Number(from) || 0, slice = list.slice(start, start + TG_EV_BC_MAX), sent = 0;
  var when = o['تاریخ'] instanceof Date ? tgJDateFull_(o['تاریخ'], TG_TZ) : String(o['تاریخ'] || '');
  var text = '🎟 <b>' + tgEsc_(o.title) + '</b>\n' + tgEsc_(when) + (o['ساعت'] ? ' · ساعت ' + tgFa_(o['ساعت']) : '') + '\n' + (acc ? tgEsc_(acc) + '\n' : '') +
    (o['ارائه‌دهنده'] ? '🎤 ' + tgEsc_(o['ارائه‌دهنده']) + '\n' : '') + (o['توضیح کوتاه'] ? '\n' + tgEsc_(o['توضیح کوتاه']) + '\n' : '') +
    '\nاین پیام را چون عضو کامیونیتی تجربه هستید می‌گیرید.';
  var kb = { inline_keyboard: [[{ text: '🎟 ثبت‌نام و یادآوری', callback_data: 'evn:reg:' + code }], [{ text: 'صفحهٔ رویداد', url: TG_EV_SITE + '#ev=' + code }]] };
  for (var i = 0; i < slice.length; i++) { var r = tgNotify_(slice[i], TG_NK.invite, text, { ref: code, markup: kb }); if (r === 'رفت' || r === 'صف') sent++; }
  var total = start + slice.length;
  tgEvSet_(o, { 'اطلاع کامیونیتی': Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd') + ' · ' + total + ' نفر' }, 'بات');
  var more = list.length > total;
  return tgSend_(chat, '📣 برای ' + tgFa_(sent) + ' عضو کامیونیتی رفت' + (more ? '؛ ' + tgFa_(list.length - total) + ' نفر مانده.' : '.'),
    more ? { inline_keyboard: [[{ text: '▶ ادامه', callback_data: 'evn:bc:' + code + ':' + total }]] } : null);
}

/* بازخورد حاضران: start=evf-<code> ← متن یا ویس ← اجازهٔ انتشار ← تأیید مدرسه ← صفحهٔ رویداد */
function tgEvfSheet_() { return TG_DRY ? null : tgSchSheet_(TG_EVF_TAB, TG_EVF_HEAD); }
function tgEvfRows_() {
  if (TG_DRY) return TG_MEM['evf'] || [];
  var sh = tgEvfSheet_(); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, TG_EVF_HEAD.length).getValues().map(function (r, i) { var o = { row: i + 2 }; TG_EVF_HEAD.forEach(function (h, k) { o[h] = r[k] instanceof Date ? r[k] : String(r[k] == null ? '' : r[k]).trim(); }); return o; });
}
function tgEvfBy_(id) { var L = tgEvfRows_(); for (var i = 0; i < L.length; i++) if (L[i]['کد'] === String(id)) return L[i]; return null; }
function tgEvfSet_(o, ch) {
  if (TG_DRY) { for (var k in ch) o[k] = ch[k]; return; }
  var sh = tgEvfSheet_(); for (var k2 in ch) { var c = TG_EVF_HEAD.indexOf(k2) + 1; if (c) sh.getRange(o.row, c).setValue(ch[k2]); o[k2] = ch[k2]; }
}
function tgEvfJoin_(chat, arg) {
  var m = String(arg || '').match(/^evf-([A-Za-z0-9\-]+)$/i); if (!m) return false;
  return tgEvfAsk_(chat, m[1]);
}
function tgEvfAsk_(chat, code) {
  var o = tgEvBy_(code); if (!o) { tgSend_(chat, 'این رویداد پیدا نشد.'); return true; }
  tgSetVal_('evf', chat, o.code);
  tgSend_(chat, '💬 <b>' + tgEsc_(o.title) + '</b>\nممنون که در این رویداد بودید. تجربه یا نظرتان را همین‌جا بنویسید یا یک ویس کوتاه بفرستید.\nبعدش می‌پرسیم اجازه می‌دهید روی صفحهٔ رویداد بیاید یا نه.', { inline_keyboard: [[{ text: '↩️ انصراف', callback_data: 'evf:x' }]] });
  return true;
}
function tgEvfInput_(chat, m, name) {
  var code = tgGetVal_('evf', chat); if (!code) return false;
  var text = String(m.text || m.caption || '').trim(), fid = '', kind = 'متن';
  if (m.voice) { fid = m.voice.file_id; kind = 'ویس'; } else if (m.audio) { fid = m.audio.file_id; kind = 'ویس'; }
  if (!text && !fid) return false;
  if (text && (text.indexOf('/') === 0 || text.indexOf('بازگشت') > -1)) { tgDel_('evf', chat); return false; }
  if (!fid && text.length < 5) { tgSend_(chat, 'کمی بیشتر بنویسید؛ یکی دو جمله کافی است.'); return true; }
  var o = tgEvBy_(code); tgDel_('evf', chat); if (!o) return true;
  var file = '';
  if (fid) {
    file = tgEvSaveFile_(o, fid, 'بازخورد ' + String(Date.now()).slice(-6));
    if (!TG_DRY) { try { var tf = tgTgFile_(fid); var tr = tgRmTranscribe_(tf.blob); if (tr && tr.text) text = tr.text; } catch (eT) {} }
  }
  var id = 'F-' + (TG_DRY ? (100 + tgEvfRows_().length + 1) : Date.now().toString(36).toUpperCase());
  var row = [id, TG_DRY ? '' : new Date(), o.code, o.title, name || '', String(chat), kind, text.slice(0, 1500), file, '', TG_EVF_ST.wait, ''];
  if (TG_DRY) { var obj = { row: (TG_MEM['evf'] || []).length + 2 }; TG_EVF_HEAD.forEach(function (h, k) { obj[h] = row[k]; }); (TG_MEM['evf'] = TG_MEM['evf'] || []).push(obj); }
  else tgEvfSheet_().appendRow(row);
  tgSend_(chat, '🙏 رسید. اجازه می‌دهید این ' + (kind === 'ویس' ? 'ویس' : 'متن') + ' روی صفحهٔ رویداد در سایت بیاید؟', { inline_keyboard: [
    [{ text: '✅ بله، با اسمم', callback_data: 'evf:p:' + id + ':n' }], [{ text: '✅ بله، بی‌نام', callback_data: 'evf:p:' + id + ':a' }], [{ text: '🔒 نه، فقط تیم مدرسه ببیند', callback_data: 'evf:p:' + id + ':x' }]] });
  return true;
}
function tgOnEvf_(cq, rest) {
  var chat = cq.message.chat.id, p = String(rest || '').split(':'), act = p[0];
  var uname = cq.from && cq.from.username ? '@' + cq.from.username : '';
  if (act === 'x') { tgDel_('evf', chat); return tgSend_(chat, 'باشد.'); }
  if (act === 'go') return tgEvfAsk_(chat, p[1]);
  var f = tgEvfBy_(p[1]); if (!f) return tgSend_(chat, 'این بازخورد پیدا نشد.');
  if (act === 'p') {
    if (String(f['chat_id']) !== String(chat)) return tgSend_(chat, 'این بازخورد مال شما نیست.');
    var perm = TG_EVF_PERM[p[2]] || TG_EVF_PERM.x, pub = p[2] !== 'x';
    tgEvfSet_(f, { 'اجازهٔ انتشار': perm, 'وضعیت': pub ? TG_EVF_ST.rev : TG_EVF_ST.team });
    tgSend_(chat, pub ? '✅ ممنون. بعد از نگاه تیم مدرسه روی صفحهٔ رویداد می‌آید.' : '✅ ممنون. فقط تیم مدرسه می‌بیند.');
    var msg = '💬 <b>بازخورد تازه</b> · ' + tgEsc_(f['عنوان رویداد']) + '\n' + tgEsc_(f['نوع']) + ' · ' + perm + (f['نام'] ? ' · ' + tgEsc_(f['نام']) : '') + '\n\n' + tgEsc_(String(f['متن'] || '').slice(0, 600)) + (f['فایل'] ? '\n🎧 ' + tgEsc_(f['فایل']) : '');
    var kb = pub ? { inline_keyboard: [[{ text: '✅ روی صفحه برود', callback_data: 'evf:ok:' + f['کد'] }, { text: '🙅 نرود', callback_data: 'evf:no:' + f['کد'] }]] } : null;
    tgSchoolOwners_().forEach(function (o) { var c = tgMagFirst_(o.chat); if (c) tgNotify_(c, TG_NK.task, msg, { ref: f['کد'], markup: kb }); });
    return null;
  }
  if (act === 'ok' || act === 'no') {
    if (!tgEvCan_(chat)) return tgSend_(chat, 'تأیید بازخورد با مسئول مدرسه است.');
    if (f['اجازهٔ انتشار'] === TG_EVF_PERM.x) return tgSend_(chat, 'نویسنده اجازهٔ انتشار نداده است.');
    var who = ''; try { var pp = tgPersonByChat_(chat); who = pp ? pp.name : (uname || String(chat)); } catch (e) { who = String(chat); }
    tgEvfSet_(f, { 'وضعیت': act === 'ok' ? TG_EVF_ST.pub : TG_EVF_ST.no, 'بررسی‌کننده': who });
    try { if (!TG_DRY) CacheService.getScriptCache().remove('evapi'); } catch (eX) {}
    return tgSend_(chat, act === 'ok' ? '✅ روی صفحهٔ رویداد می‌رود (تا نیم ساعت دیگر).' : 'باشد، منتشر نمی‌شود.');
  }
  return null;
}

/* بعد از برگزاری: پیام بازخورد به ثبت‌نام‌کننده‌ها و ارائه‌دهنده (هر رویداد یک بار؛ در tgWatchdog) */
function tgEvAfterTick_() {
  var today = Utilities.formatDate(new Date(), TG_TZ, 'yyyy-MM-dd'), sent = 0;
  var L = tgEvAll_().filter(function (o) { return o['تاریخ'] instanceof Date && Utilities.formatDate(o['تاریخ'], TG_TZ, 'yyyy-MM-dd') < today && !o['درخواست بازخورد'] && o['وضعیت'] !== 'پیش‌نویس' && o['وضعیت'] !== 'بسته' && !(typeof ebiIsNightEv_ === 'function' && ebiIsNightEv_(o)); });   /* v170.17: بی شب‌های کمپین */
  if (!L.length) return 0;
  var regs = [];
  if (!TG_DRY) { try { var sh = tgEvSheet_(); if (sh.getLastRow() > 1) regs = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues(); } catch (e) {} } else regs = TG_MEM['evregs'] || [];
  for (var i = 0; i < L.length && sent < 60; i++) {
    var o = L[i], seen = {}, n = 0;
    for (var k = 0; k < regs.length; k++) {
      if (String(regs[k][1]).trim() !== o.code && String(regs[k][2]).trim() !== o.title) continue;
      var c = String(regs[k][8] || '').trim(); if (!c || seen[c]) continue; seen[c] = 1;
      tgNotify_(c, TG_NK.remind, '🙏 ممنون که در «' + tgEsc_(o.title) + '» بودید. اگر دوست دارید، تجربه یا نظرتان را با ما در میان بگذارید (متن یا ویس). با اجازهٔ خودتان روی صفحهٔ رویداد می‌آید.',
        { ref: o.code, markup: { inline_keyboard: [[{ text: '💬 بازخورد می‌دهم', callback_data: 'evf:go:' + o.code }]] } });
      n++; sent++;
    }
    var pc = String(o['chat_id ارائه‌دهنده'] || '').trim();
    if (pc) try { tgNotify_(pc, TG_NK.task, '🎧 «' + tgEsc_(o.title) + '» برگزار شد. اگر فایل ضبط، ویس جمع‌بندی یا نکات هایلایت دارید، از دکمه‌های زیر بفرستید.', { ref: o.code, markup: tgEvPresenterKb_({ code: o.code, 'مرحله': TG_EV_STAGE.held }) }); } catch (eP) {}
    var ch = { 'درخواست بازخورد': today + ' · ' + n + ' نفر' };
    if (!o['مرحله'] || o['مرحله'] === TG_EV_STAGE.ann || o['مرحله'] === TG_EV_STAGE.pre) ch['مرحله'] = TG_EV_STAGE.held;
    tgEvSet_(o, ch, 'بات');
  }
  return sent;
}

/* API عمومی رویدادها برای سایت: همان tgApiEvents_ به‌علاوهٔ دسترسی، مدت، مکان، لینک بازخورد و بازخوردهای تأییدشده */
function tgApiEvents162_(p) {
  if (!TG_DRY) { try { var hit = CacheService.getScriptCache().get('evapi'); if (hit) return JSON.parse(hit); } catch (e0) {} }
  var base = tgApiEvents_(p); if (!base || !base.ok) return base;
  var by = {}; tgEvAll_().forEach(function (o) { by[o.code] = o; });
  var fb = {}; try { tgEvfRows_().forEach(function (f) { if (f['وضعیت'] !== TG_EVF_ST.pub) return; (fb[f['کد رویداد']] = fb[f['کد رویداد']] || []).push({ name: f['اجازهٔ انتشار'] === TG_EVF_PERM.n ? String(f['نام'] || '') : '', text: String(f['متن'] || '').slice(0, 700), voice: String(f['فایل'] || '').indexOf('http') === 0 ? f['فایل'] : '' }); }); } catch (e1) {}
  var bot = tgBotName_();
  base.events.forEach(function (e) {
    var o = by[e.code] || {};
    e.access = String(o['دسترسی'] || ''); e.mins = Number(o['مدت (دقیقه)'] || 0) || 0; e.place = String(o['مکان'] || '');
    e.feedbackLink = 'https://t.me/' + bot + '?start=evf-' + e.code; e.feedback = (fb[e.code] || []).slice(0, 12);
  });
  base.at = Date.now();
  if (!TG_DRY) { try { CacheService.getScriptCache().put('evapi', JSON.stringify(base), 900); } catch (e2) {} }
  return base;
}

/* ─────────────────────────── راه‌اندازی یک‌باره ─────────────────────────── */
function tgV162Setup() {
  var out = [];
  try { out.push(tgEvHeadFix_()); } catch (e1) { out.push('رویدادها: ' + e1); }
  try { tgEvfSheet_(); out.push('تب بازخورد رویدادها آماده'); } catch (e2) { out.push('بازخورد: ' + e2); }
  try { tgSchHeadFix_(TG_SCH_T_APPLY, TG_SCH_APPLY_HEAD); out.push('ستون‌های تازهٔ اپلای'); } catch (e3) { out.push('اپلای: ' + e3); }
  try { var w = tgSS_().getSheetByName(TG_WEEKLY); tgRecCols_(w, 3); out.push('وقت‌های هفتگی: ستون تکرار'); } catch (e4) { out.push('هفتگی: ' + e4); }
  try { var h = tgSS_().getSheetByName(TG_INP_HOURS); tgRecCols_(h, 1); out.push('ساعت‌های حضوری: ستون تکرار'); } catch (e5) { out.push('حضوری: ' + e5); }
  try { out.push('جذب تراپیست: ' + tgApMirror_() + ' پرونده'); } catch (e6) { out.push('آینه: ' + e6); }
  Logger.log(out.join('\n'));
  return out.join(' · ');
}

/* ─────────────────────────── ثبت در رجیستری مینی‌اپ و تست‌ها ─────────────────────────── */
try {
  TG_CAP.push(
    { key: 'ev_new', page: 'sch', label: 'تعریف رویداد تازهٔ مدرسه', roles: ['مدرسه'], bot: true, api: 'sch.evnew', app: true },
    { key: 'ev_act', page: 'sch', label: 'دکمه‌های رویداد و بازخورد', roles: ['مدرسه'], bot: true, api: 'sch.evact', app: true },
    { key: 'desk_apq', page: 'desk', label: 'صف جذب تراپیست برای مسئول پذیرش', roles: ['پذیرش'], bot: true, api: 'desk.apq', app: true },
    { key: 'desk_apact', page: 'desk', label: 'دکمه‌های کارت جذب تراپیست', roles: ['پذیرش'], bot: true, api: 'desk.apact', app: true },
    { key: 'desk_inpadd', page: 'desk', label: 'ثبت ساعت حضوری درمانگر از پذیرش', roles: ['پذیرش'], bot: true, api: 'desk.inpadd', app: true },
    { key: 'ev_feedback', page: 'site', label: 'بازخورد حاضران رویداد (لینک از صفحهٔ سایت)', roles: [], bot: true, appNa: true }
  );
} catch (eCap) {}
try { TG_SUITES.push(['نسخهٔ ۱۶۲', 'tgV162Tests']); } catch (eSu) {}

function tgV162Tests() {
  var pass = 0, fail = 0, text = [];
  function ok(label, cond) { if (cond) { pass++; text.push('✅ ' + label); } else { fail++; text.push('❌ ' + label); } }
  var keepDry = TG_DRY, keepTher = TG_DRY_THER; TG_DRY = true;
  TG_OUTBOX = []; TG_MEM = {}; TG_MEM['policy'] = {}; TG_MEM['capdry'] = {}; TG_MEM['quiet'] = false;
  function said(ch) { return TG_OUTBOX.filter(function (x) { return !ch || String(x.chat) === String(ch); }).map(function (x) { return String(x.text || '') + JSON.stringify(x.markup || x.kb || ''); }).join('\n'); }

  /* تکرار */
  ok('هر هفته همیشه', tgRecurOk_('هر هفته', '2026-10-03', '2026-10-10') && tgRecurOk_('', '', '2026-10-10'));
  ok('یک هفته در میان: هفتهٔ دوم نه، سوم آری', tgRecurOk_('یک هفته در میان', '2026-10-03', '2026-10-03') && !tgRecurOk_('یک هفته در میان', '2026-10-03', '2026-10-10') && tgRecurOk_('یک هفته در میان', '2026-10-03', '2026-10-17'));
  ok('پیش از لنگر فعال نیست', !tgRecurOk_('یک هفته در میان', '2026-10-17', '2026-10-03'));
  ok('هر سه هفته', tgRecurOk_('هر سه هفته', '2026-10-03', '2026-10-24') && !tgRecurOk_('هر سه هفته', '2026-10-03', '2026-10-17'));
  ok('ماهی یک بار: هفتهٔ اول ماه شمسی', tgRecurOk_('ماهی یک بار', '', '2026-09-24') && !tgRecurOk_('ماهی یک بار', '', '2026-10-10'));
  ok('برچسب تکرار', tgRecurLabel_('w2') === 'یک هفته در میان' && tgRecurLabel_('') === '' && tgRecurOf_('دو هفته یک بار').k === 'w2');
  ok('تاریخ شمسی به میلادی', tgIsoOf_('۱۴۰۵/۰۷/۱۰') === '2026-10-02' && tgIsoOf_('2026-10-02') === '2026-10-02');
  TG_DRY_THER = { name: 'درمانگر آزمون', row: 4, pool: 'هر دو', chat: '60', about: '', meet: 'm' };
  tgRecurOffer_('60', 'درمانگر آزمون', 'دوشنبه', ['18:00', '19:00'], TG_KIND_MEET);
  ok('پیشنهاد تکرار با چهار دکمه', said('60').indexOf('rw:w2') > -1 && said('60').indexOf('rw:m1') > -1);
  TG_OUTBOX = [];
  tgRecurApply_('60', 'w2');
  var rc = TG_OUTBOX.filter(function (x) { return x.kind === 'recur'; })[0];
  ok('تکرار روی دو وقت نشست', rc && rc.times.length === 2 && rc.recur === 'یک هفته در میان' && /^\d{4}-\d{2}-\d{2}$/.test(rc.from));
  TG_DRY_THER = keepTher;

  /* بررسی حضوری بی‌کش */
  TG_MEM['desk'] = [{ name: 'ژیلا', role: 'مسئول پذیرش', chat: '77' }];
  TG_OUTBOX = [];
  tgInpChkCb_('77', 'ok');
  ok('بی‌حالت و بی‌آرگومان: پیام بسته با راهنما', said('77').indexOf('قبلاً بسته') > -1 && said('77').indexOf('درخواست‌های حضوری') > -1);
  TG_OUTBOX = [];
  tgInpChkCb_('77', 'ok:gandhi:5');
  ok('با آرگومان دکمه، بی‌کش هم کار می‌کند', said('77').indexOf('قبلاً بسته') < 0);

  /* پذیرش: ثبت ساعت حضوری */
  TG_MEM['deskwho'] = { name: 'ژیلا', role: 'مسئول پذیرش', chat: '77' };
  TG_MEM['inp'] = { places: [{ id: 'gandhi', city: 'تهران', name: 'کلینیک', kind: '', area: 'ونک', status: 'فعال', ord: 1 }], hours: [], rooms: [] };
  TG_OUTBOX = [];
  tgSetVal_('inpd', '77', JSON.stringify({ pid: 'gandhi', s: 'hrs', who: 'درمانگر آزمون', day: 'دوشنبه' }));
  ok('ساعت خوانده شد و تکرار پرسیده شد', tgInpDeskText_('77', '۱۴ تا ۱۸') === true && said('77').indexOf('ih:r:w2') > -1);
  tgOnInpDesk_({ message: { chat: { id: '77' } } }, 'r:w2');
  var ia = TG_OUTBOX.filter(function (x) { return x.kind === 'inpadd'; })[0];
  ok('ردیف حضوری با تکرار یک هفته در میان', ia && ia.vals[1] === 'درمانگر آزمون' && ia.vals[2] === 'دوشنبه' && ia.recur === 'یک هفته در میان' && ia.from);

  /* جذب تراپیست */
  TG_MEM['approw'] = { id: 'A-009', name: 'زهرا', user: '@zahra_t', chat: '301', phone: '09120000000', email: 'z@x.com', city: 'تهران', approach: 'CBT', resume: 'tg:doc:AAA · cv.pdf', resumeUrl: '', stage: TG_AP_STAGES[0] };
  var card = tgApCard_(TG_MEM['approw']);
  ok('کارت شماره و ایمیل و تلگرام دارد', card.indexOf('09120000000') > -1 && card.indexOf('z@x.com') > -1 && card.indexOf('t.me/zahra_t') > -1);
  TG_OUTBOX = [];
  var url = tgApResumeToDrive_('A-009');
  ok('رزومه به درایو و لینکش در ستون', url.indexOf('drive.google.com') > -1 && TG_OUTBOX.some(function (x) { return x.kind === 'apset' && x.col === tgApCol_('لینک رزومه'); }));
  TG_MEM['tasks'] = []; TG_MEM['desk'] = [{ name: 'ژیلا', role: 'مسئول پذیرش', chat: '77' }, { name: 'شیدا', role: 'پذیرش', chat: '78' }];
  tgApTaskLead_(TG_MEM['approw'], 'تماس اول با متقاضی A-009', 1);
  ok('کار فقط برای مسئول پذیرش', TG_MEM['tasks'].length === 1 && TG_MEM['tasks'][0].chat === '77');
  ok('کیبورد کارت اقدام بعدی دارد', JSON.stringify(tgApKb_(TG_MEM['approw'])).indexOf('ap:nx:A-009') > -1);

  /* رویداد تازه */
  TG_MEM['watchids'] = ['1']; TG_MEM['people'] = [{ row: 2, id: 'P-1', name: 'کاوه', user: 'e', chat: '104', roles: ['سردبیر'], status: 'فعال' }];
  TG_MEM['person'] = TG_MEM['people'][0]; TG_MEM['evall'] = [];
  ok('سردبیر می‌تواند رویداد تعریف کند', tgEvCan_('104') === true);
  TG_MEM['person'] = null;
  ok('غریبه نمی‌تواند', tgEvCan_('999') === false);
  TG_MEM['person'] = TG_MEM['people'][0];
  TG_OUTBOX = [];
  var cq = { message: { chat: { id: '104' } }, from: { id: 104 } };
  tgEvnText_('104', 'کاوه', TG_EVN_BTN);
  tgEvnText_('104', 'کاوه', 'ژورنال کلاب «فروید و وینیکات»');
  tgOnEvn_(cq, 'k:0', 'کاوه');
  ok('تاریخ گذشته رد می‌شود', tgEvnText_('104', 'کاوه', '۱۳۹۹/۰۱/۰۱') === true && tgEvnGet_('104').s === 'date');
  tgEvnText_('104', 'کاوه', '۱۴۰۶/۰۱/۲۰');
  tgEvnText_('104', 'کاوه', '۱۸:۳۰');
  tgOnEvn_(cq, 'm:90', 'کاوه');
  tgOnEvn_(cq, 'a:0', 'کاوه');
  tgEvnText_('104', 'کاوه', 'https://meet.google.com/abc-defg-hij');
  tgEvnText_('104', 'کاوه', 'دکتر کیومرث نوین');
  tgEvnText_('104', 'کاوه', 'خوانش مقالهٔ وینیکات دربارهٔ ابژهٔ انتقالی.');
  ok('کارت تأیید پیش از ثبت', said('104').indexOf('evn:ok') > -1 && said('104').indexOf('رایگان') > -1);
  TG_OUTBOX = [];
  tgOnEvn_(cq, 'ok', 'کاوه');
  var ne = TG_OUTBOX.filter(function (x) { return x.kind === 'evnew'; })[0];
  var H = tgEvHeadAll_();
  ok('سطر رویداد با کد EV و ستون‌های تازه', ne && /^EV-\d+$/.test(ne.code) && ne.row[H.indexOf('دسترسی')] === 'رایگان و آزاد برای همه' && ne.row[H.indexOf('مدت (دقیقه)')] === 90 && ne.row[H.indexOf('ارائه‌دهنده')] === 'دکتر کیومرث نوین');
  ok('پیام ثبت با لینک بازخورد و دکمهٔ خبر کامیونیتی', said('104').indexOf('evf-' + ne.code) > -1 && said('104').indexOf('evn:bc:' + ne.code) > -1);
  ok('ناظر خبردار شد', TG_MEM['notify'].some(function (n) { return n.chat === '1' && n.text.indexOf(ne.code) > -1; }));

  /* خبر کامیونیتی */
  TG_MEM['commchats'] = ['501', '502', '501'];
  TG_MEM['notify'] = []; TG_OUTBOX = [];
  tgEvBroadcast_('104', ne.code, 0);
  ok('خبر به اعضای کامیونیتی (بی‌تکرار) با دکمهٔ ثبت‌نام', TG_MEM['notify'].filter(function (n) { return n.kind === TG_NK.invite; }).length === 3 && said().indexOf('evn:reg:' + ne.code) > -1);
  TG_OUTBOX = [];
  tgEvBroadcast_('104', ne.code, 0);
  ok('خبر دوباره نمی‌رود', said('104').indexOf('قبلاً خبر رفته') > -1);

  /* بازخورد */
  TG_OUTBOX = []; TG_MEM['evf'] = [];
  ok('لینک بازخورد', tgEvfJoin_('700', 'evf-' + ne.code) === true && tgGetVal_('evf', '700') === ne.code);
  ok('متن بازخورد ثبت و اجازه پرسیده شد', tgEvfInput_('700', { text: 'جلسهٔ خیلی خوبی بود، ممنون از ارائه.' }, 'سارا') === true && TG_MEM['evf'].length === 1 && said('700').indexOf('evf:p:') > -1);
  var fid = TG_MEM['evf'][0]['کد'];
  TG_MEM['person'] = null; TG_MEM['people'].push({ row: 3, id: 'P-2', name: 'ترانه', user: 'l', chat: '500', roles: ['مدرسه'], status: 'فعال' });
  TG_MEM['notify'] = [];
  tgOnEvf_({ message: { chat: { id: '700' } }, from: { id: 700 } }, 'p:' + fid + ':a');
  ok('اجازهٔ بی‌نام و خبر به مدرسه با دکمهٔ تأیید', TG_MEM['evf'][0]['اجازهٔ انتشار'] === 'بی‌نام' && TG_MEM['notify'].some(function (n) { return n.chat === '500' && n.text.indexOf('بازخورد تازه') > -1; }));
  TG_MEM['person'] = { row: 3, name: 'ترانه', roles: ['مدرسه'] };
  tgOnEvf_({ message: { chat: { id: '500' } }, from: { id: 500 } }, 'ok:' + fid);
  ok('تأیید مدرسه: منتشر شود', TG_MEM['evf'][0]['وضعیت'] === TG_EVF_ST.pub);
  var api = tgApiEvents162_({});
  var ev1 = (api.events || []).filter(function (e) { return e.code === ne.code; })[0];
  ok('API: بازخورد بی‌نام، دسترسی، مدت، لینک بازخورد، بی chat_id', ev1 && ev1.feedback.length === 1 && ev1.feedback[0].name === '' && ev1.access.indexOf('رایگان') > -1 && ev1.mins === 90 && ev1.feedbackLink.indexOf('evf-') > -1 && JSON.stringify(api).indexOf('"700"') < 0);

  /* بعد از رویداد */
  TG_MEM['evall'] = [{ row: 2, code: 'EV-2100', title: 'پنل گذشته', 'کد': 'EV-2100', 'عنوان': 'پنل گذشته', 'تاریخ': new Date(Date.now() - 3 * 86400000), 'وضعیت': 'باز', 'مرحله': 'اعلام', 'درخواست بازخورد': '' }];
  TG_MEM['evregs'] = [['', 'EV-2100', 'پنل گذشته', 'الف', '', '', '', 'بات', '801', 'ثبت شد'], ['', 'EV-2100', 'پنل گذشته', 'ب', '', '', '', 'بات', '801', 'ثبت شد']];
  TG_MEM['notify'] = [];
  var nAfter = tgEvAfterTick_();
  ok('بعد از رویداد: یک پیام بازخورد به هر ثبت‌نامی و مرحله «برگزار شد»', nAfter === 1 && TG_MEM['evall'][0]['مرحله'] === TG_EV_STAGE.held && TG_MEM['evall'][0]['درخواست بازخورد'].indexOf('۱') < 0);
  ok('دوباره نمی‌فرستد', tgEvAfterTick_() === 0);

  ok('متن‌های تازه بی‌خط‌تیره', [TG_EVN_BTN, TG_EV_HEAD3.join(' '), TG_EVF_HEAD.join(' '), TG_RECUR.map(function (r) { return r.fa; }).join(' '), TG_EVN_ACCESS.map(function (a) { return a[1]; }).join(' ')].join(' ').search(/[—–]/) < 0);

  TG_DRY = keepDry; TG_DRY_THER = keepTher; TG_MEM = {}; TG_OUTBOX = [];
  Logger.log('نتیجه: ' + pass + ' قبول · ' + fail + ' مردود\n' + text.filter(function (x) { return x.indexOf('❌') === 0; }).join('\n'));
  return { pass: pass, fail: fail, text: text.join('\n') };
}
